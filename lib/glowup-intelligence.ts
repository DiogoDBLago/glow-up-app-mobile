// GlowUp Intelligence Layer
// Central layer that reads REAL data from relational tables (no jsonb fallback,
// no fake data) and consolidates it into a personalized user context used to
// drive every recommendation surface in the app.
//
// All reads run as the signed-in user via the browser supabase client and are
// scoped by auth.uid() at the RLS layer — users can only see their own data.

import { supabase } from "@/supabase/client";
import {
  getCurrentCyclePhase,
  type CyclePhase,
  type PersonalGoal,
  type PersonalizationProfile,
} from "./personalization";
import { levelFromXp, type LevelInfo } from "./progress-data";

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export type ConsistencyBand = "none" | "low" | "medium" | "high";

export interface ConsistencyMetric {
  daysHit: number;          // days with at least one event in the window
  windowDays: number;       // size of the rolling window (default 14)
  ratio: number;            // daysHit / windowDays
  band: ConsistencyBand;
  streak: number;           // current consecutive days
}

export interface WeightTrend {
  currentKg: number | null;
  previousKg: number | null;   // earliest in last 60 days
  deltaKg: number | null;      // currentKg - previousKg
  direction: "up" | "down" | "flat" | "unknown";
  measurementsCount: number;
  lastMeasurementDate: string | null;
}

export interface PregnancyContext {
  isPregnant: boolean;
  week: number | null;
  dueDate: string | null;
  currentWeightKg: number | null;
}

export interface FastingContext {
  /** today's row status: planned | active | completed | null when no row exists yet */
  todayStatus: "planned" | "active" | "completed" | null;
  todayTargetMinutes: number | null;
  todayStartedAt: string | null;
  todayEndedAt: string | null;
  /** 0..100 progress vs today's target; 0 when not started */
  currentProgressPercent: number;
  /** number of "completed" fasting days in the last 30 days */
  completedDaysLast30: number;
  /** current consecutive-day streak of completed fasts ending today/yesterday */
  currentStreak: number;
  /** best streak observed in the last 90 days */
  bestStreak: number;
  /** average completed-fast duration in minutes over the last 30 days */
  averageDurationLast30: number | null;
  /** ISO date of most recent completed fast */
  lastCompletedAt: string | null;
  /** most used target minutes in the last 30 days */
  mostUsedTargetMinutes: number | null;
}

export interface SmartAlert {
  id: string;
  tone: "info" | "warning" | "success";
  title: string;
  body: string;
  cta?: { label: string; to: string };
}

export interface RecommendationCard {
  id: string;
  kind: "focus" | "workout" | "nutrition" | "cycle" | "progress" | "hydration" | "checkin" | "pregnancy";
  title: string;
  body: string;
  cta: { label: string; to: string };
  emoji?: string;
}

export interface GlowUpUserContext {
  hasData: boolean;
  goal: PersonalGoal | null;
  goalLabel: string;
  firstName: string | null;
  // Body
  currentWeightKg: number | null;
  weightTrend: WeightTrend;
  recentMeasurementsCount: number;
  // Progress
  level: LevelInfo;
  totalXp: number;
  xpLast7: number;
  // Cycle
  cycle: {
    phase: CyclePhase | null;
    phaseLabel: string;
    cycleDay: number | null;
    cycleLength: number | null;
    recentSymptoms: string[];
    recentMood: string | null;
  };
  // Pregnancy
  pregnancy: PregnancyContext;
  // Fasting
  fasting: FastingContext;
  // Consistency (rolling 14 days unless noted)
  workouts: ConsistencyMetric;
  nutrition: ConsistencyMetric;
  hydration: ConsistencyMetric;
  checkins: ConsistencyMetric;
  // Strengths & weaknesses derived from consistency
  strengths: string[];
  weaknesses: string[];
  // Last check-in (used for live recomputation of smart alerts)
  lastCheckinDate: string | null;
  // Today
  dailyRecommendation: string;
  smartAlert: SmartAlert | null;
  nextBestAction: RecommendationCard;
  personalizedCards: RecommendationCard[];
}

// ───────────────────────────────────────────────────────────────────────────
// Date helpers (America/Sao_Paulo)
// ───────────────────────────────────────────────────────────────────────────

const tzToday = (d: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

const isoMinusDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return dt.toISOString().slice(0, 10);
};

function bandFor(ratio: number): ConsistencyBand {
  if (ratio <= 0) return "none";
  if (ratio < 0.34) return "low";
  if (ratio < 0.67) return "medium";
  return "high";
}

function streakFromDates(datesAsc: string[]): number {
  if (datesAsc.length === 0) return 0;
  const set = new Set(datesAsc);
  const today = tzToday();
  let cursor = set.has(today) ? today : set.has(isoMinusDays(today, 1)) ? isoMinusDays(today, 1) : null;
  let n = 0;
  while (cursor && set.has(cursor)) {
    n += 1;
    cursor = isoMinusDays(cursor, 1);
  }
  return n;
}

function consistencyFromDates(dates: string[], windowDays = 14): ConsistencyMetric {
  const today = tzToday();
  const cutoff = isoMinusDays(today, windowDays - 1);
  const inWindow = new Set(dates.filter((d) => d >= cutoff && d <= today));
  const daysHit = inWindow.size;
  const ratio = daysHit / windowDays;
  return {
    daysHit,
    windowDays,
    ratio,
    band: bandFor(ratio),
    streak: streakFromDates([...new Set(dates)].sort()),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Fasting helpers
// ───────────────────────────────────────────────────────────────────────────

interface FastingRow {
  fasting_date: string;
  started_at: string | null;
  ended_at: string | null;
  target_minutes: number;
  status: string;
}

/** A row counts as "completed" when status='completed' OR ended_at exists and
 *  duration >= 80% of target. */
function isFastCompleted(row: FastingRow): boolean {
  if (row.status === "completed") return true;
  if (!row.started_at || !row.ended_at) return false;
  const durMin = (Date.parse(row.ended_at) - Date.parse(row.started_at)) / 60_000;
  return durMin >= row.target_minutes * 0.8;
}

function computeFastingContext(rows: FastingRow[], today: string): FastingContext {
  const since30 = isoMinusDays(today, 29);
  const last30 = rows.filter((r) => r.fasting_date >= since30 && r.fasting_date <= today);
  const completedLast30 = last30.filter(isFastCompleted);

  // current row for today
  const todayRow = rows.find((r) => r.fasting_date === today) ?? null;
  const todayStatus = (todayRow?.status as FastingContext["todayStatus"]) ?? null;
  const todayTargetMinutes = todayRow?.target_minutes ?? null;
  const todayStartedAt = todayRow?.started_at ?? null;
  const todayEndedAt = todayRow?.ended_at ?? null;

  let currentProgressPercent = 0;
  if (todayStartedAt && todayTargetMinutes) {
    const endMs = todayEndedAt ? Date.parse(todayEndedAt) : Date.now();
    const elapsedMin = (endMs - Date.parse(todayStartedAt)) / 60_000;
    currentProgressPercent = Math.max(0, Math.min(100, (elapsedMin / todayTargetMinutes) * 100));
  }

  // streaks based on completed dates
  const completedDates = new Set(rows.filter(isFastCompleted).map((r) => r.fasting_date));
  let currentStreak = 0;
  let cursor = completedDates.has(today)
    ? today
    : completedDates.has(isoMinusDays(today, 1))
      ? isoMinusDays(today, 1)
      : null;
  while (cursor && completedDates.has(cursor)) {
    currentStreak += 1;
    cursor = isoMinusDays(cursor, 1);
  }

  let bestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...completedDates].sort()) {
    if (prev && isoMinusDays(d, 1) === prev) run += 1;
    else run = 1;
    if (run > bestStreak) bestStreak = run;
    prev = d;
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  // averages and most used target
  let totalMin = 0;
  let count = 0;
  for (const r of completedLast30) {
    if (r.started_at && r.ended_at) {
      totalMin += (Date.parse(r.ended_at) - Date.parse(r.started_at)) / 60_000;
      count += 1;
    }
  }
  const averageDurationLast30 = count > 0 ? Math.round(totalMin / count) : null;

  const targetCounts = new Map<number, number>();
  for (const r of last30) {
    targetCounts.set(r.target_minutes, (targetCounts.get(r.target_minutes) ?? 0) + 1);
  }
  let mostUsedTargetMinutes: number | null = null;
  let mostUsedCount = 0;
  for (const [t, c] of targetCounts.entries()) {
    if (c > mostUsedCount) { mostUsedCount = c; mostUsedTargetMinutes = t; }
  }

  const lastCompleted = rows.find(isFastCompleted) ?? null;

  return {
    todayStatus,
    todayTargetMinutes,
    todayStartedAt,
    todayEndedAt,
    currentProgressPercent: Math.round(currentProgressPercent),
    completedDaysLast30: completedLast30.length,
    currentStreak,
    bestStreak,
    averageDurationLast30,
    lastCompletedAt: lastCompleted?.ended_at ?? lastCompleted?.fasting_date ?? null,
    mostUsedTargetMinutes,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Core fetch — single user, single round-trip
// ───────────────────────────────────────────────────────────────────────────

export async function getGlowUpUserContext(): Promise<GlowUpUserContext | null> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) return null;

  const today = tzToday();
  const since30 = isoMinusDays(today, 30);
  const since60 = isoMinusDays(today, 60);

  const [
    persRes,
    profileRes,
    workoutsRes,
    mealsRes,
    hydrationRes,
    checkinsRes,
    cycleLogsRes,
    xpRes,
    measurementsRes,
    pregnancyRes,
    fastingRes,
  ] = await Promise.all([
    supabase.from("user_personalization_profile").select("*").eq("user_id", uid).maybeSingle(),
    supabase.from("profiles").select("name").eq("id", uid).maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("session_date")
      .eq("user_id", uid)
      .gte("session_date", since30),
    supabase
      .from("meal_logs")
      .select("log_date")
      .eq("user_id", uid)
      .gte("log_date", since30),
    supabase
      .from("hydration_logs")
      .select("log_date, ml")
      .eq("user_id", uid)
      .gte("log_date", since30),
    supabase
      .from("cycle_daily_logs")
      .select("date, symptoms, mood")
      .eq("user_id", uid)
      .gte("date", since30)
      .order("date", { ascending: false }),
    supabase
      .from("cycle_daily_logs")
      .select("date, mood, symptoms, menstrual_flow")
      .eq("user_id", uid)
      .gte("date", since30)
      .order("date", { ascending: false }),
    supabase.from("xp_events").select("amount, event_date").eq("user_id", uid).gte("event_date", since30),
    supabase
      .from("body_measurements")
      .select("measurement_date, weight_kg")
      .eq("user_id", uid)
      .gte("measurement_date", since60)
      .order("measurement_date", { ascending: false }),
    supabase.from("pregnancy_profiles").select("*").eq("user_id", uid).maybeSingle(),
    supabase
      .from("fasting_sessions")
      .select("fasting_date, started_at, ended_at, target_minutes, status")
      .eq("user_id", uid)
      .gte("fasting_date", isoMinusDays(today, 89))
      .order("fasting_date", { ascending: false }),
  ]);

  const pers = (persRes.data ?? null) as PersonalizationProfile | null;
  const firstName = profileRes.data?.name?.split(" ")[0] ?? null;

  // Consistency metrics
  const workouts = consistencyFromDates((workoutsRes.data ?? []).map((r: any) => r.session_date));
  const nutrition = consistencyFromDates((mealsRes.data ?? []).map((r: any) => r.log_date));
  const checkins = consistencyFromDates((checkinsRes.data ?? []).map((r: any) => r.date));

  // Hydration: aggregate ml per day, count a day as "hit" when >= 1500 ml
  const hydroByDay = new Map<string, number>();
  (hydrationRes.data ?? []).forEach((r: any) => {
    hydroByDay.set(r.log_date, (hydroByDay.get(r.log_date) ?? 0) + (r.ml ?? 0));
  });
  const hydrationGoalMl = pers?.daily_water_target_ml ?? 2000;
  const hydroHitDates = [...hydroByDay.entries()]
    .filter(([, ml]) => ml >= Math.max(1500, hydrationGoalMl * 0.75))
    .map(([d]) => d);
  const hydration = consistencyFromDates(hydroHitDates);
  const hydrationToday = hydroByDay.get(today) ?? 0;

  // XP totals
  const xpRows = xpRes.data ?? [];
  const totalXp = xpRows.reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  const xpLast7 = xpRows
    .filter((r: any) => r.event_date >= isoMinusDays(today, 6))
    .reduce((s: number, r: any) => s + (r.amount ?? 0), 0);
  // Note: totalXp is for the last 30 days. For lifetime we would need the user_data.xp,
  // but consistency window for level is intentionally local — level shows recent traction.
  const level = levelFromXp(totalXp);

  // Weight trend
  const measurements = (measurementsRes.data ?? []).filter((m: any) => m.weight_kg != null);
  const currentWeightKg = measurements[0]?.weight_kg ?? pers?.weight_kg ?? null;
  const previousWeightKg = measurements.length > 1 ? measurements[measurements.length - 1].weight_kg : null;
  const deltaKg =
    currentWeightKg != null && previousWeightKg != null
      ? Number((currentWeightKg - previousWeightKg).toFixed(2))
      : null;
  const direction: WeightTrend["direction"] =
    deltaKg == null ? "unknown" : Math.abs(deltaKg) < 0.3 ? "flat" : deltaKg > 0 ? "up" : "down";
  const weightTrend: WeightTrend = {
    currentKg: currentWeightKg,
    previousKg: previousWeightKg,
    deltaKg,
    direction,
    measurementsCount: measurements.length,
    lastMeasurementDate: measurements[0]?.measurement_date ?? null,
  };

  // Cycle context
  const cyclePhaseInfo = pers ? getCurrentCyclePhase(pers as PersonalizationProfile) : null;
  const lastCycleLog = cycleLogsRes.data?.[0] ?? null;
  const recentSymptoms = Array.from(
    new Set((cycleLogsRes.data ?? []).flatMap((l: any) => l.symptoms ?? [])),
  ).slice(0, 4);
  const recentMood = (cycleLogsRes.data ?? []).find((l: any) => l.mood)?.mood ?? null;

  // Pregnancy
  const pregRow = pregnancyRes.data;
  const pregnancy: PregnancyContext = {
    isPregnant: Boolean(pregRow?.is_pregnant),
    week: pregRow?.pregnancy_week ?? null,
    dueDate: pregRow?.estimated_due_date ?? null,
    currentWeightKg: pregRow?.current_weight_kg ?? null,
  };

  // Fasting
  const fasting = computeFastingContext((fastingRes.data ?? []) as FastingRow[], today);

  // Goal
  const goal = (pers?.goal as PersonalGoal | undefined) ?? null;
  const goalLabel = goalToLabel(goal);

  // Strengths & weaknesses
  const dims: Array<[string, ConsistencyMetric]> = [
    ["Treinos", workouts],
    ["Nutrição", nutrition],
    ["Hidratação", hydration],
    ["Check-ins", checkins],
  ];
  const strengths = dims.filter(([, m]) => m.band === "high").map(([n]) => n);
  const weaknesses = dims.filter(([, m]) => m.band === "none" || m.band === "low").map(([n]) => n);

  // Smart alert + next best action + cards
  const ctx = {
    goal,
    goalLabel,
    firstName,
    currentWeightKg,
    weightTrend,
    recentMeasurementsCount: measurements.length,
    level,
    totalXp,
    xpLast7,
    cycle: {
      phase: cyclePhaseInfo?.phase ?? null,
      phaseLabel: cyclePhaseInfo ? PHASE_LABEL_PT[cyclePhaseInfo.phase] : "—",
      cycleDay: cyclePhaseInfo?.cycleDay ?? null,
      cycleLength: cyclePhaseInfo?.cycleLength ?? null,
      recentSymptoms,
      recentMood,
    },
    pregnancy,
    fasting,
    workouts,
    nutrition,
    hydration,
    checkins,
    strengths,
    weaknesses,
    lastCheckinDate: lastCycleLog?.date ?? null,
  };

  const smartAlert = buildSmartAlert(ctx, { hydrationToday, hydrationGoalMl, lastCheckinDate: lastCycleLog?.date ?? null });
  const dailyRecommendation = buildDailyRecommendation(ctx);
  const nextBestAction = buildNextBestAction(ctx, { hydrationToday, hydrationGoalMl });
  const personalizedCards = buildPersonalizedCards(ctx);

  const hasData =
    workouts.daysHit + nutrition.daysHit + hydration.daysHit + checkins.daysHit > 0 ||
    measurements.length > 0 ||
    pregnancy.isPregnant;

  return {
    hasData,
    ...ctx,
    dailyRecommendation,
    smartAlert,
    nextBestAction,
    personalizedCards,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Recommendation builders
// ───────────────────────────────────────────────────────────────────────────

const PHASE_LABEL_PT: Record<CyclePhase, string> = {
  menstrual: "Menstrual",
  follicular: "Folicular",
  ovulation: "Ovulatória",
  luteal: "Lútea",
};

function goalToLabel(g: PersonalGoal | null): string {
  switch (g) {
    case "lose": return "Emagrecer";
    case "gain_muscle": return "Ganhar massa";
    case "maintain": return "Manter peso";
    case "hormonal_health": return "Saúde hormonal";
    case "energy": return "Mais energia";
    case "reduce_pms": return "Reduzir TPM";
    default: return "Bem-estar";
  }
}

type Ctx = Omit<GlowUpUserContext, "hasData" | "dailyRecommendation" | "smartAlert" | "nextBestAction" | "personalizedCards">;

export function getCycleAwareTrainingAdvice(ctx: Pick<Ctx, "cycle" | "pregnancy" | "goal">): string {
  if (ctx.pregnancy.isPregnant) {
    return "Priorize movimentos suaves: caminhada, mobilidade e respiração. Evite alta intensidade.";
  }
  switch (ctx.cycle.phase) {
    case "menstrual":
      return "Fase de pausa sagrada — mobilidade, alongamento e caminhada leve fazem mais por você hoje.";
    case "follicular":
      return "Energia em alta — bom dia para progredir cargas e treino de força.";
    case "ovulation":
      return "Pico de potência — capriche no treino mais intenso da semana.";
    case "luteal":
      return "Energia descendo — mantenha consistência com treinos moderados e foco em técnica.";
    default:
      return ctx.goal === "gain_muscle"
        ? "Treine força com progressão semanal e foco em proteína."
        : "Mantenha consistência: 3–4 treinos por semana já transformam.";
  }
}

export function getNutritionAdjustmentAdvice(ctx: Pick<Ctx, "goal" | "cycle" | "pregnancy" | "nutrition">): string {
  if (ctx.pregnancy.isPregnant) {
    return "Foque em proteína, ferro, folato e hidratação. Pequenas refeições, alta densidade nutricional.";
  }
  if (ctx.cycle.phase === "luteal") {
    return "Fase lútea pede mais carboidrato complexo e magnésio. Evite ultraprocessados para domar os desejos.";
  }
  if (ctx.cycle.phase === "menstrual") {
    return "Reforce ferro (folhas escuras, carne magra) e líquidos mornos.";
  }
  switch (ctx.goal) {
    case "lose":
      return "Déficit leve, proteína em todas as refeições e fibras para saciedade.";
    case "gain_muscle":
      return "Pequeno superávit calórico, 1.6–2.0g de proteína por kg e treino com progressão.";
    case "energy":
      return "Café da manhã com proteína + carbo complexo evita queda de energia à tarde.";
    default:
      return "Refeições coloridas, proteína em cada uma e bastante água ao longo do dia.";
  }
}

export function getProgressInsight(ctx: Pick<Ctx, "weightTrend" | "level" | "strengths" | "weaknesses">): string {
  const { weightTrend: w } = ctx;
  if (ctx.level.currentXp === 0 && w.measurementsCount === 0) {
    return "Registre seu primeiro treino, refeição ou medida para começar a ver sua evolução.";
  }
  if (w.deltaKg != null && Math.abs(w.deltaKg) >= 0.3) {
    const verb = w.direction === "down" ? "perdeu" : w.direction === "up" ? "ganhou" : "manteve";
    return `Você ${verb} ${Math.abs(w.deltaKg).toFixed(1)} kg nos últimos registros. Continue acompanhando para ver a tendência real.`;
  }
  if (ctx.strengths.length > 0) {
    return `Você está consistente em ${ctx.strengths.join(" e ")}. Esse é o seu superpoder atual — continue assim.`;
  }
  return "Mais alguns dias de registro e a GlowUp consegue desenhar sua tendência.";
}

export function getDailyPersonalizedRecommendation(ctx: Ctx): string {
  if (ctx.pregnancy.isPregnant) {
    const wk = ctx.pregnancy.week ? `Semana ${ctx.pregnancy.week}: ` : "";
    return `${wk}escute seu corpo, mantenha hidratação e movimento leve. Anote como está se sentindo no check-in.`;
  }
  if (ctx.cycle.phase === "menstrual") return "Hoje é dia de carinho — descanse, hidrate-se e prefira movimento leve.";
  if (ctx.cycle.phase === "follicular") return "Energia subindo: aproveite para puxar um treino de força e planejar a semana.";
  if (ctx.cycle.phase === "ovulation") return "Você está no auge da disposição — capriche no treino e na proteína de hoje.";
  if (ctx.cycle.phase === "luteal") return "Domine os desejos com carbo complexo, magnésio e treino moderado.";
  return buildDailyRecommendation(ctx);
}

function buildDailyRecommendation(ctx: Ctx): string {
  if (ctx.pregnancy.isPregnant) {
    return "Hoje, priorize hidratação, refeições leves e um momento de pausa só seu.";
  }
  if (ctx.cycle.phase) return getCycleAwareTrainingAdvice(ctx);
  switch (ctx.goal) {
    case "lose":
      return "Foco: proteína em todas as refeições, hidratação e movimento — pequenos passos somam.";
    case "gain_muscle":
      return "Foco: treino com progressão, proteína suficiente e descanso de qualidade.";
    case "energy":
      return "Foco: sono, hidratação e respiração consciente para sustentar sua energia.";
    default:
      return "Foco: consistência. Uma escolha boa de cada vez já te aproxima do seu glow.";
  }
}

export function getNextBestAction(ctx: Ctx, extras?: { hydrationToday: number; hydrationGoalMl: number }): RecommendationCard {
  return buildNextBestAction(ctx, extras ?? { hydrationToday: 0, hydrationGoalMl: 2000 });
}

/**
 * Live recomputation of the next-best-action card using current hydration values.
 * Safe to call on every render — pure function with no side effects.
 */
export function recomputeNextBestActionLive(
  intel: GlowUpUserContext,
  hydrationToday: number,
  hydrationGoalMl: number,
): RecommendationCard {
  return buildNextBestAction(intel as unknown as Ctx, { hydrationToday, hydrationGoalMl });
}

/**
 * Live recomputation of the smart alert using current hydration values.
 * Returns null when no alert applies (e.g., when hydration goal is reached).
 */
export function recomputeSmartAlertLive(
  intel: GlowUpUserContext,
  hydrationToday: number,
  hydrationGoalMl: number,
): SmartAlert | null {
  return buildSmartAlert(intel as unknown as Ctx, {
    hydrationToday,
    hydrationGoalMl,
    lastCheckinDate: intel.lastCheckinDate,
  });
}

function buildNextBestAction(ctx: Ctx, x: { hydrationToday: number; hydrationGoalMl: number }): RecommendationCard {
  if (ctx.pregnancy.isPregnant) {
    return {
      id: "preg-checkin",
      kind: "pregnancy",
      title: "Como você está hoje?",
      body: "Registre humor, sintomas e hidratação para acompanhar sua semana.",
      cta: { label: "Abrir gestação", to: "/app/pregnancy" },
      emoji: "🤰",
    };
  }
  if (ctx.checkins.streak === 0 && ctx.checkins.daysHit === 0) {
    return {
      id: "first-checkin",
      kind: "checkin",
      title: "Faça seu check-in de hoje",
      body: "1 minuto registrando como você está já personaliza tudo.",
      cta: { label: "Check-in agora", to: "/app/checkin" },
      emoji: "💗",
    };
  }
  if (x.hydrationToday < x.hydrationGoalMl * 0.5) {
    return {
      id: "hydrate",
      kind: "hydration",
      title: "Bora hidratar",
      body: `Você ainda está em ${(x.hydrationToday / 1000).toFixed(1)}L de ${(x.hydrationGoalMl / 1000).toFixed(1)}L hoje.`,
      cta: { label: "Registrar água", to: "/app/hydration" },
      emoji: "💧",
    };
  }
  if (ctx.workouts.band === "none" || ctx.workouts.band === "low") {
    return {
      id: "workout",
      kind: "workout",
      title: "Mexa-se hoje",
      body: ctx.cycle.phase === "menstrual" ? "Mobilidade ou caminhada leve já contam." : "Um treino curto rende mais que zero.",
      cta: { label: "Ver treinos", to: "/app/workouts" },
      emoji: "💪",
    };
  }
  if (ctx.nutrition.band === "none" || ctx.nutrition.band === "low") {
    return {
      id: "meal",
      kind: "nutrition",
      title: "Registre uma refeição",
      body: "Acompanhar nutrição é o que mais acelera resultados visíveis.",
      cta: { label: "Abrir nutrição", to: "/app/diet" },
      emoji: "🥗",
    };
  }
  if (ctx.recentMeasurementsCount === 0) {
    return {
      id: "first-measurement",
      kind: "progress",
      title: "Registre seu ponto de partida",
      body: "Peso e medidas iniciais ajudam a GlowUp a mostrar sua tendência real.",
      cta: { label: "Adicionar medidas", to: "/app/progress" },
      emoji: "📏",
    };
  }
  return {
    id: "progress",
    kind: "progress",
    title: "Veja sua evolução",
    body: "Você está consistente. Hora de comemorar os números reais.",
    cta: { label: "Abrir Minha Evolução", to: "/app/progress" },
    emoji: "✨",
  };
}

function buildSmartAlert(
  ctx: Ctx,
  x: { hydrationToday: number; hydrationGoalMl: number; lastCheckinDate: string | null },
): SmartAlert | null {
  const today = tzToday();
  if (ctx.pregnancy.isPregnant && ctx.pregnancy.week != null) {
    return {
      id: "pregnancy-followup",
      tone: "info",
      title: `Você está na semana ${ctx.pregnancy.week}`,
      body: "Lembre-se das consultas e mantenha o pré-natal em dia.",
      cta: { label: "Ver gestação", to: "/app/pregnancy" },
    };
  }
  if (x.lastCheckinDate && x.lastCheckinDate < isoMinusDays(today, 3)) {
    return {
      id: "checkin-gap",
      tone: "warning",
      title: "Faz alguns dias sem check-in",
      body: "Anotar como você se sente ajuda a GlowUp a se adaptar ao seu momento.",
      cta: { label: "Fazer check-in", to: "/app/checkin" },
    };
  }
  if (x.hydrationToday < x.hydrationGoalMl * 0.4) {
    return {
      id: "low-hydration",
      tone: "warning",
      title: "Hidratação baixa hoje",
      body: "Que tal um copo agora? Seu corpo (e sua pele) agradecem.",
      cta: { label: "Beber água", to: "/app/hydration" },
    };
  }
  if (ctx.checkins.streak >= 7 || ctx.workouts.streak >= 7) {
    return {
      id: "streak-high",
      tone: "success",
      title: `Sequência forte: ${Math.max(ctx.checkins.streak, ctx.workouts.streak)} dias`,
      body: "Consistência é o que constrói transformação. Continue!",
    };
  }
  if (ctx.cycle.phase === "luteal" && ctx.cycle.recentSymptoms.length > 0) {
    return {
      id: "luteal-care",
      tone: "info",
      title: "Fase lútea ativa",
      body: "Carbo complexo, magnésio e mais hidratação ajudam a domar os sintomas.",
    };
  }
  return null;
}

function buildPersonalizedCards(ctx: Ctx): RecommendationCard[] {
  const cards: RecommendationCard[] = [];

  // Cycle / pregnancy first
  if (ctx.pregnancy.isPregnant) {
    cards.push({
      id: "preg",
      kind: "pregnancy",
      title: ctx.pregnancy.week ? `Gestação · Semana ${ctx.pregnancy.week}` : "Gestação ativa",
      body: "Acompanhe humor, sintomas, peso e consultas em um só lugar.",
      cta: { label: "Abrir gestação", to: "/app/pregnancy" },
      emoji: "🤰",
    });
  } else if (ctx.cycle.phase) {
    cards.push({
      id: "cycle",
      kind: "cycle",
      title: `Fase ${ctx.cycle.phaseLabel}`,
      body: getCycleAwareTrainingAdvice(ctx),
      cta: { label: "Ver meu ciclo", to: "/app/cycle" },
      emoji: ctx.cycle.phase === "menstrual" ? "🌙" : ctx.cycle.phase === "ovulation" ? "✨" : ctx.cycle.phase === "follicular" ? "🌱" : "🍂",
    });
  }

  // Workout
  cards.push({
    id: "workout",
    kind: "workout",
    title: "Treino recomendado",
    body: getCycleAwareTrainingAdvice(ctx),
    cta: { label: "Ver treinos", to: "/app/workouts" },
    emoji: "💪",
  });

  // Nutrition
  cards.push({
    id: "nutrition",
    kind: "nutrition",
    title: "Nutrição do dia",
    body: getNutritionAdjustmentAdvice(ctx),
    cta: { label: "Montar refeição", to: "/app/diet" },
    emoji: "🥗",
  });

  // Progress
  cards.push({
    id: "progress",
    kind: "progress",
    title: "Sua evolução",
    body: getProgressInsight(ctx),
    cta: { label: "Abrir Minha Evolução", to: "/app/progress" },
    emoji: "📈",
  });

  return cards;
}

// Convenience: produce the same card list (used by Home)
export function getPersonalizedHomeCards(ctx: GlowUpUserContext): RecommendationCard[] {
  return ctx.personalizedCards;
}

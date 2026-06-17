import { supabase } from "@/supabase/client";

export type MissionCadence = "daily" | "weekly" | "monthly";

export type MissionCategory =
  | "hydration" | "nutrition" | "workout" | "wellbeing"
  | "cycle" | "progress" | "plan" | "general";

export interface MissionDef {
  id: string;
  mission_key: string;
  title: string;
  description: string | null;
  xp_amount: number;
  category: MissionCategory;
  icon: string | null;
  sort_order: number;
}

export interface MissionWithProgress extends MissionDef {
  completed: boolean;
  xp_awarded: number;
  /** 0..1 progress for partially-trackable missions */
  progress: number;
  hint?: string;
}

export interface MissionStreakSummary {
  current_streak: number;
  best_streak: number;
  completions_today: number;
  total_missions_today: number;
  xp_today: number;
  xp_possible_today: number;
}

const TZ = "America/Sao_Paulo";

export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(d: string, days: number): string {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Fetch the active mission catalog. */
export async function getMissionCatalog(): Promise<MissionDef[]> {
  const { data, error } = await supabase
    .from("daily_missions")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MissionDef[];
}

interface ProgressContext {
  hydrationMl: number;
  hydrationGoalMl: number;
  mealsToday: number;
  workoutToday: boolean;
  moodCheckinToday: boolean;
  symptomsToday: boolean;
  measurementToday: boolean;
  photoToday: boolean;
  fastStarted: boolean;
  fastCompleted: boolean;
  fastHitGoal: boolean;
  completedKeys: Set<string>;
}

async function buildProgressContext(userId: string, day: string): Promise<ProgressContext> {
  const [
    hydration, meals, workouts, mood, cycle, measure, photo, completions, fasting,
  ] = await Promise.all([
    supabase.from("hydration_logs").select("ml").eq("user_id", userId).eq("log_date", day),
    supabase.from("meal_logs").select("id").eq("user_id", userId).eq("log_date", day),
    supabase.from("workout_sessions").select("id").eq("user_id", userId).eq("session_date", day).limit(1),
    supabase.from("cycle_daily_logs").select("mood,symptoms").eq("user_id", userId).eq("date", day).maybeSingle(),
    supabase.from("cycle_daily_logs").select("symptoms").eq("user_id", userId).eq("date", day).maybeSingle(),
    supabase.from("body_measurements").select("id").eq("user_id", userId).eq("measurement_date", day).limit(1),
    supabase.from("progress_photos").select("id").eq("user_id", userId).eq("photo_date", day).limit(1),
    supabase.from("user_mission_completions").select("mission_key").eq("user_id", userId).eq("completed_date", day),
    supabase
      .from("fasting_sessions")
      .select("started_at, ended_at, target_minutes, status")
      .eq("user_id", userId)
      .eq("fasting_date", day)
      .maybeSingle(),
  ]);

  const hydrationMl = (hydration.data ?? []).reduce((s, r: any) => s + (r.ml ?? 0), 0);
  // Goal — read from personalization profile if present.
  const { data: perso } = await supabase
    .from("user_personalization_profile")
    .select("daily_water_target_ml,weight_kg")
    .eq("user_id", userId)
    .maybeSingle();
  const hydrationGoalMl =
    perso?.daily_water_target_ml ?? Math.round((perso?.weight_kg ?? 60) * 35);

  const fastRow = fasting.data;
  const fastStarted = !!fastRow?.started_at;
  const fastCompleted = !!fastRow?.ended_at || fastRow?.status === "completed";
  let fastHitGoal = false;
  if (fastRow?.started_at && fastRow?.ended_at && fastRow.target_minutes) {
    const dur = (Date.parse(fastRow.ended_at) - Date.parse(fastRow.started_at)) / 60_000;
    fastHitGoal = dur >= fastRow.target_minutes * 0.8;
  } else if (fastRow?.status === "completed" && fastRow?.target_minutes && fastRow.started_at) {
    const dur = (Date.now() - Date.parse(fastRow.started_at)) / 60_000;
    fastHitGoal = dur >= fastRow.target_minutes * 0.8;
  }

  return {
    hydrationMl,
    hydrationGoalMl,
    mealsToday: meals.data?.length ?? 0,
    workoutToday: (workouts.data?.length ?? 0) > 0,
    moodCheckinToday: !!mood.data?.mood,
    symptomsToday: (cycle.data?.symptoms ?? []).length > 0,
    measurementToday: (measure.data?.length ?? 0) > 0,
    photoToday: (photo.data?.length ?? 0) > 0,
    fastStarted,
    fastCompleted,
    fastHitGoal,
    completedKeys: new Set((completions.data ?? []).map((c: any) => c.mission_key)),
  };
}

function evaluateMission(def: MissionDef, ctx: ProgressContext): { progress: number; auto: boolean; hint?: string } {
  switch (def.mission_key) {
    case "hydration_goal": {
      const p = ctx.hydrationGoalMl > 0 ? Math.min(1, ctx.hydrationMl / ctx.hydrationGoalMl) : 0;
      return { progress: p, auto: p >= 1, hint: `${(ctx.hydrationMl / 1000).toFixed(2).replace(".", ",")}L / ${(ctx.hydrationGoalMl / 1000).toFixed(1)}L` };
    }
    case "log_meal":
      return { progress: ctx.mealsToday > 0 ? 1 : 0, auto: ctx.mealsToday > 0, hint: `${ctx.mealsToday} refeições` };
    case "log_3_meals":
      return { progress: Math.min(1, ctx.mealsToday / 3), auto: ctx.mealsToday >= 3, hint: `${ctx.mealsToday}/3` };
    case "complete_workout":
      return { progress: ctx.workoutToday ? 1 : 0, auto: ctx.workoutToday };
    case "mood_checkin":
      return { progress: ctx.moodCheckinToday ? 1 : 0, auto: ctx.moodCheckinToday };
    case "log_symptoms":
      return { progress: ctx.symptomsToday ? 1 : 0, auto: ctx.symptomsToday };
    case "log_measurement":
      return { progress: ctx.measurementToday ? 1 : 0, auto: ctx.measurementToday };
    case "progress_photo":
      return { progress: ctx.photoToday ? 1 : 0, auto: ctx.photoToday };
    case "complete_today_plan": {
      // Counts as done when 4+ tracked items happened today.
      const counted = [
        ctx.hydrationMl >= ctx.hydrationGoalMl,
        ctx.mealsToday >= 1,
        ctx.workoutToday,
        ctx.moodCheckinToday,
      ].filter(Boolean).length;
      return { progress: Math.min(1, counted / 4), auto: counted >= 4, hint: `${counted}/4 pilares` };
    }
    case "start_fast":
      return { progress: ctx.fastStarted ? 1 : 0, auto: ctx.fastStarted };
    case "complete_fast":
      return { progress: ctx.fastCompleted ? 1 : 0, auto: ctx.fastCompleted };
    case "hit_fasting_goal":
      return { progress: ctx.fastHitGoal ? 1 : 0, auto: ctx.fastHitGoal };
    default:
      return { progress: 0, auto: false };
  }
}

/** Get today's missions for the signed-in user with computed progress + completion state. */
export async function getDailyMissions(day = todayKey()): Promise<MissionWithProgress[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const [catalog, ctx] = await Promise.all([
    getMissionCatalog(),
    buildProgressContext(await getUserId() as string, day),
  ]);
  // Auto-complete missions whose underlying action already happened (idempotent insert).
  for (const m of catalog) {
    const evalRes = evaluateMission(m, ctx);
    if (evalRes.auto && !ctx.completedKeys.has(m.mission_key)) {
      await completeMission(m.mission_key, day);
      ctx.completedKeys.add(m.mission_key);
    }
  }
  return catalog.map((m) => {
    const e = evaluateMission(m, ctx);
    return {
      ...m,
      completed: ctx.completedKeys.has(m.mission_key) || e.auto,
      xp_awarded: ctx.completedKeys.has(m.mission_key) ? m.xp_amount : 0,
      progress: e.progress,
      hint: e.hint,
    };
  });
}

export async function getMissionProgress(day = todayKey()) {
  const list = await getDailyMissions(day);
  const total = list.length;
  const done = list.filter((m) => m.completed).length;
  const xp = list.reduce((s, m) => s + m.xp_awarded, 0);
  const possible = list.reduce((s, m) => s + m.xp_amount, 0);
  return { total, done, xp, possible, ratio: total > 0 ? done / total : 0 };
}

export async function getTotalXp(): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;
  const { data } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId);
  return (data ?? []).reduce((sum: number, row: any) => sum + (row.amount ?? 0), 0);
}

export async function reconcileTotalXpWithLegacy(legacyXp: number): Promise<number> {
  const userId = await getUserId();
  if (!userId) return Math.max(0, legacyXp);
  const current = await getTotalXp();
  const safeLegacy = Math.max(0, legacyXp);
  if (safeLegacy <= current) return current;
  const { data: existing } = await supabase
    .from("xp_events")
    .select("id")
    .eq("user_id", userId)
    .filter("metadata->>legacy_id", "eq", "xp-balance-v1")
    .maybeSingle();
  if (!existing) {
    await supabase.from("xp_events").insert({
      user_id: userId,
      event_date: todayKey(),
      source: "legacy_balance",
      amount: safeLegacy - current,
      description: "Saldo XP sincronizado",
      metadata: { legacy_id: "xp-balance-v1" },
    });
  }
  return getTotalXp();
}

/** Idempotent completion: inserts a row (unique constraint prevents dupes), then writes an xp_event. */
export async function completeMission(missionKey: string, day = todayKey()): Promise<{ awarded: number; alreadyDone: boolean; totalXp: number | null }> {
  const userId = await getUserId();
  if (!userId) return { awarded: 0, alreadyDone: false, totalXp: null };

  const { data: mission } = await supabase
    .from("daily_missions")
    .select("xp_amount")
    .eq("mission_key", missionKey)
    .eq("is_active", true)
    .maybeSingle();
  if (!mission) return { awarded: 0, alreadyDone: false, totalXp: null };

  // Try insert; if it already exists, treat as no-op.
  const { error: insErr } = await supabase
    .from("user_mission_completions")
    .insert({ user_id: userId, mission_key: missionKey, completed_date: day, xp_awarded: mission.xp_amount });

  if (insErr) {
    if ((insErr as any).code === "23505") return { awarded: 0, alreadyDone: true, totalXp: await getTotalXp() };
    throw insErr;
  }

  await awardMissionXP(missionKey, mission.xp_amount, day);
  await maybeUnlockAchievements(userId, day);
  return { awarded: mission.xp_amount, alreadyDone: false, totalXp: await getTotalXp() };
}

export async function awardMissionXP(missionKey: string, amount: number, day = todayKey()): Promise<void> {
  const userId = await getUserId();
  if (!userId || amount <= 0) return;
  const isFasting = missionKey === "start_fast" || missionKey === "complete_fast" || missionKey === "hit_fasting_goal";
  await supabase.from("xp_events").insert({
    user_id: userId,
    amount,
    source: isFasting ? "fasting_mission" : "mission",
    description: `Missão: ${missionKey}`,
    event_date: day,
    metadata: { mission_key: missionKey },
  });
}

export async function getMissionStreakSummary(): Promise<MissionStreakSummary> {
  const userId = await getUserId();
  const today = todayKey();
  const empty: MissionStreakSummary = {
    current_streak: 0, best_streak: 0,
    completions_today: 0, total_missions_today: 0,
    xp_today: 0, xp_possible_today: 0,
  };
  if (!userId) return empty;

  const since = shiftDate(today, -90);
  const [{ data: rows }, progress] = await Promise.all([
    supabase
      .from("user_mission_completions")
      .select("completed_date")
      .eq("user_id", userId)
      .gte("completed_date", since)
      .order("completed_date", { ascending: false }),
    getMissionProgress(today),
  ]);

  const days = new Set((rows ?? []).map((r: any) => r.completed_date as string));

  // current streak
  let current = 0;
  let cursor = today;
  while (days.has(cursor)) {
    current++;
    cursor = shiftDate(cursor, -1);
  }

  // best streak in window
  const sorted = Array.from(days).sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of sorted) {
    if (prev && shiftDate(prev, 1) === d) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }

  return {
    current_streak: current,
    best_streak: Math.max(best, current),
    completions_today: progress.done,
    total_missions_today: progress.total,
    xp_today: progress.xp,
    xp_possible_today: progress.possible,
  };
}

/** Best-effort unlock of mission/related achievements. Idempotent via unique (user, achievement). */
async function maybeUnlockAchievements(userId: string, day: string): Promise<void> {
  const [missionRes, summary, mealsRes, workoutsRes, checkinsRes] = await Promise.all([
    supabase.from("user_mission_completions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getMissionStreakSummary(),
    supabase.from("meal_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("cycle_daily_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const unlocks: string[] = [];
  if ((missionRes.count ?? 0) >= 1) unlocks.push("first_mission");
  if (summary.current_streak >= 3) unlocks.push("mission_streak_3");
  if (summary.current_streak >= 7) unlocks.push("mission_streak_7");
  if ((mealsRes.count ?? 0) >= 10) unlocks.push("meal_10");
  if ((workoutsRes.count ?? 0) >= 10) unlocks.push("workout_10");
  if ((checkinsRes.count ?? 0) >= 10) unlocks.push("checkin_7");

  if (unlocks.length === 0) return;

  const { data: ach } = await supabase
    .from("achievements")
    .select("id,code,xp_reward")
    .in("code", unlocks);

  if (!ach?.length) return;

  const { data: already } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .in("achievement_id", ach.map((a) => a.id));
  const have = new Set((already ?? []).map((u: any) => u.achievement_id));

  for (const a of ach) {
    if (have.has(a.id)) continue;
    const { error } = await supabase
      .from("user_achievements")
      .insert({ user_id: userId, achievement_id: a.id, metadata: { source: "missions", day } });
    if (!error && (a.xp_reward ?? 0) > 0) {
      await supabase.from("xp_events").insert({
        user_id: userId,
        amount: a.xp_reward,
        source: "achievement",
        description: `Conquista: ${a.code}`,
        event_date: day,
        metadata: { achievement_code: a.code },
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CADENCE ENGINE — Weekly + Monthly missions
//
// Weekly and monthly missions are defined in code (no DB catalog row needed)
// and reuse the `user_mission_completions` table for idempotent completion:
// `completed_date` is set to the PERIOD START date (Monday for weekly, first
// day of month for monthly), so the unique (user, mission_key, completed_date)
// constraint guarantees one completion + one XP event per period.
//
// Mission progress is derived ONLY from real logs in the period window —
// hydration_logs, meal_logs, workout_sessions, fasting_sessions,
// body_measurements, progress_photos, cycle_daily_logs.
// ─────────────────────────────────────────────────────────────────────────────

/** ISO Monday-anchored week start (YYYY-MM-DD) for the given local-day key. */
export function weekStartKey(day: string = todayKey()): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: 0=Sun,1=Mon..6=Sat. Shift so Monday=0.
  const dow = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

/** First day of the month (YYYY-MM-01) for the given local-day key. */
export function monthStartKey(day: string = todayKey()): string {
  return day.slice(0, 7) + "-01";
}

/** End-of-period (inclusive) for a weekly window starting on `weekStart`. */
export function weekEndKey(weekStart: string): string {
  return shiftDate(weekStart, 6);
}

/** End-of-period (inclusive) for a monthly window starting on `monthStart`. */
export function monthEndKey(monthStart: string): string {
  const [y, m] = monthStart.split("-").map(Number);
  // last day = day-before first-of-next-month
  const next = new Date(Date.UTC(y, m, 1));
  next.setUTCDate(next.getUTCDate() - 1);
  return next.toISOString().slice(0, 10);
}

export interface PeriodMissionDef {
  mission_key: string;          // unique across cadences
  title: string;
  description: string;
  xp_amount: number;
  category: MissionCategory;
  icon: string;
  cadence: MissionCadence;
  /** Target count to reach 100% progress. */
  target: number;
  /** Which underlying log/metric drives progress. */
  metric:
    | "workouts"
    | "hydration_days"
    | "meal_days"
    | "fasting_days"
    | "measurements"
    | "photos"
    | "mood_days"
    | "symptom_days"
    | "consistency_streak";
}

/** Weekly mission catalog (code-defined). */
export const WEEKLY_MISSIONS: PeriodMissionDef[] = [
  { mission_key: "w_workouts_3",      title: "Treine 3 vezes na semana",       description: "Conclua 3 sessões de treino esta semana.",        xp_amount: 80,  category: "workout",   icon: "dumbbell", cadence: "weekly", target: 3, metric: "workouts" },
  { mission_key: "w_workouts_5",      title: "5 dias com treino",              description: "Mexa-se em 5 dias diferentes esta semana.",       xp_amount: 120, category: "workout",   icon: "activity", cadence: "weekly", target: 5, metric: "workouts" },
  { mission_key: "w_hydration_5",     title: "Meta de água em 5 dias",         description: "Bata a meta de hidratação em 5 dias.",            xp_amount: 90,  category: "hydration", icon: "droplets", cadence: "weekly", target: 5, metric: "hydration_days" },
  { mission_key: "w_meals_5",         title: "Refeições registradas em 5 dias",description: "Registre pelo menos 1 refeição em 5 dias.",       xp_amount: 80,  category: "nutrition", icon: "utensils", cadence: "weekly", target: 5, metric: "meal_days" },
  { mission_key: "w_fasting_5",       title: "Jejum atingido em 5 dias",       description: "Complete sua meta de jejum em 5 dias.",           xp_amount: 90,  category: "wellbeing", icon: "sparkles", cadence: "weekly", target: 5, metric: "fasting_days" },
  { mission_key: "w_measurement_1",   title: "Registre suas medidas",          description: "Salve pelo menos 1 medida corporal esta semana.", xp_amount: 60,  category: "progress",  icon: "ruler",    cadence: "weekly", target: 1, metric: "measurements" },
  { mission_key: "w_photo_1",         title: "Adicione uma foto de evolução",  description: "Tire 1 foto de progresso esta semana.",           xp_amount: 60,  category: "progress",  icon: "camera",   cadence: "weekly", target: 1, metric: "photos" },
];

/** Monthly mission catalog (code-defined). */
export const MONTHLY_MISSIONS: PeriodMissionDef[] = [
  { mission_key: "m_workouts_20",     title: "20 treinos no mês",              description: "Conclua 20 sessões de treino este mês.",          xp_amount: 300, category: "workout",   icon: "trophy",   cadence: "monthly", target: 20, metric: "workouts" },
  { mission_key: "m_hydration_20",    title: "Meta de água em 20 dias",        description: "Bata a meta de hidratação em 20 dias.",           xp_amount: 250, category: "hydration", icon: "droplets", cadence: "monthly", target: 20, metric: "hydration_days" },
  { mission_key: "m_meals_20",        title: "Nutrição registrada em 20 dias", description: "Registre refeições em 20 dias do mês.",           xp_amount: 250, category: "nutrition", icon: "salad",    cadence: "monthly", target: 20, metric: "meal_days" },
  { mission_key: "m_streak_30",       title: "Consistência de 30 dias",        description: "Mantenha uma sequência diária de 30 dias.",       xp_amount: 500, category: "general",   icon: "flame",    cadence: "monthly", target: 30, metric: "consistency_streak" },
  { mission_key: "m_photo_evolution", title: "Marco de evolução",              description: "Adicione uma foto de progresso e 1 medida.",      xp_amount: 200, category: "progress",  icon: "star",     cadence: "monthly", target: 2, metric: "photos" }, // photo+measurement composite handled inline
];

export interface PeriodMissionWithProgress extends PeriodMissionDef {
  completed: boolean;
  xp_awarded: number;
  /** 0..1 */
  progress: number;
  current: number;
  hint?: string;
  /** Period window the mission tracks. */
  period_start: string;
  period_end: string;
}

interface PeriodContext {
  workoutDays: number;
  hydrationDaysHit: number;
  mealDays: number;
  fastingDaysHit: number;
  measurements: number;
  photos: number;
  moodDays: number;
  symptomDays: number;
  consistencyStreak: number; // current daily-mission streak (already computed elsewhere)
  completedKeys: Set<string>;
}

async function buildPeriodContext(userId: string, start: string, end: string): Promise<PeriodContext> {
  // Read goal once (for hydration_days computation).
  const persoP = supabase
    .from("user_personalization_profile")
    .select("daily_water_target_ml,weight_kg")
    .eq("user_id", userId)
    .maybeSingle();

  const [
    hydration, meals, workouts, mood, cycle, measure, photo, completions, fasting, streakSummary, perso,
  ] = await Promise.all([
    supabase.from("hydration_logs").select("log_date, ml").eq("user_id", userId).gte("log_date", start).lte("log_date", end),
    supabase.from("meal_logs").select("log_date").eq("user_id", userId).gte("log_date", start).lte("log_date", end),
    supabase.from("workout_sessions").select("session_date").eq("user_id", userId).gte("session_date", start).lte("session_date", end),
    supabase.from("cycle_daily_logs").select("date, mood").eq("user_id", userId).gte("date", start).lte("date", end),
    supabase.from("cycle_daily_logs").select("date, symptoms").eq("user_id", userId).gte("date", start).lte("date", end),
    supabase.from("body_measurements").select("id").eq("user_id", userId).gte("measurement_date", start).lte("measurement_date", end),
    supabase.from("progress_photos").select("id").eq("user_id", userId).gte("photo_date", start).lte("photo_date", end),
    supabase.from("user_mission_completions").select("mission_key, completed_date").eq("user_id", userId).gte("completed_date", start).lte("completed_date", end),
    supabase.from("fasting_sessions").select("fasting_date, started_at, ended_at, target_minutes, status").eq("user_id", userId).gte("fasting_date", start).lte("fasting_date", end),
    getMissionStreakSummary().catch(() => ({ current_streak: 0 } as MissionStreakSummary)),
    persoP,
  ]);

  const goalMl = perso.data?.daily_water_target_ml ?? Math.round((perso.data?.weight_kg ?? 60) * 35);

  const hydrationByDay = new Map<string, number>();
  for (const r of hydration.data ?? []) {
    hydrationByDay.set((r as any).log_date, (hydrationByDay.get((r as any).log_date) ?? 0) + ((r as any).ml ?? 0));
  }
  const hydrationDaysHit = Array.from(hydrationByDay.values()).filter((ml) => ml >= goalMl).length;

  const fastingDaysHit = (fasting.data ?? []).filter((f: any) => {
    if (!f.started_at || !f.target_minutes) return false;
    if (f.ended_at) {
      const dur = (Date.parse(f.ended_at) - Date.parse(f.started_at)) / 60_000;
      return dur >= f.target_minutes * 0.8;
    }
    return f.status === "completed";
  }).length;

  return {
    workoutDays: new Set((workouts.data ?? []).map((r: any) => r.session_date)).size,
    hydrationDaysHit,
    mealDays: new Set((meals.data ?? []).map((r: any) => r.log_date)).size,
    fastingDaysHit,
    measurements: measure.data?.length ?? 0,
    photos: photo.data?.length ?? 0,
    moodDays: (mood.data ?? []).filter((r: any) => r.mood).length,
    symptomDays: (cycle.data ?? []).filter((r: any) => (r.symptoms ?? []).length > 0).length,
    consistencyStreak: streakSummary.current_streak,
    completedKeys: new Set((completions.data ?? []).map((c: any) => c.mission_key)),
  };
}

/** Pure evaluator — derives `current` from real-log context. Exported for tests. */
export function evaluatePeriodMission(def: PeriodMissionDef, ctx: PeriodContext): { current: number; progress: number; auto: boolean; hint: string } {
  let current = 0;
  switch (def.metric) {
    case "workouts":            current = ctx.workoutDays; break;
    case "hydration_days":      current = ctx.hydrationDaysHit; break;
    case "meal_days":           current = ctx.mealDays; break;
    case "fasting_days":        current = ctx.fastingDaysHit; break;
    case "measurements":        current = ctx.measurements; break;
    case "photos":
      // Special composite for monthly evolution milestone: photos + measurements
      if (def.mission_key === "m_photo_evolution") {
        current = (ctx.photos > 0 ? 1 : 0) + (ctx.measurements > 0 ? 1 : 0);
      } else {
        current = ctx.photos;
      }
      break;
    case "mood_days":           current = ctx.moodDays; break;
    case "symptom_days":        current = ctx.symptomDays; break;
    case "consistency_streak":  current = ctx.consistencyStreak; break;
  }
  const progress = def.target > 0 ? Math.min(1, current / def.target) : 0;
  return {
    current,
    progress,
    auto: current >= def.target,
    hint: `${Math.min(current, def.target)}/${def.target}`,
  };
}

async function completePeriodMission(def: PeriodMissionDef, periodStart: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  // Idempotent insert keyed by (user, mission_key, completed_date=periodStart).
  const { error: insErr } = await supabase
    .from("user_mission_completions")
    .insert({ user_id: userId, mission_key: def.mission_key, completed_date: periodStart, xp_awarded: def.xp_amount });
  if (insErr) {
    if ((insErr as any).code === "23505") return; // already completed this period
    return; // soft-fail; never block UI
  }
  await supabase.from("xp_events").insert({
    user_id: userId,
    amount: def.xp_amount,
    source: def.cadence === "weekly" ? "weekly_mission" : "monthly_mission",
    description: `Missão ${def.cadence === "weekly" ? "semanal" : "mensal"}: ${def.mission_key}`,
    event_date: periodStart,
    metadata: { mission_key: def.mission_key, cadence: def.cadence, period_start: periodStart },
  });
}

async function getPeriodMissions(
  catalog: PeriodMissionDef[],
  start: string,
  end: string,
): Promise<PeriodMissionWithProgress[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const ctx = await buildPeriodContext(userId, start, end);
  // Auto-complete any whose threshold is reached.
  for (const def of catalog) {
    const e = evaluatePeriodMission(def, ctx);
    if (e.auto && !ctx.completedKeys.has(def.mission_key)) {
      await completePeriodMission(def, start);
      ctx.completedKeys.add(def.mission_key);
    }
  }
  return catalog.map((def) => {
    const e = evaluatePeriodMission(def, ctx);
    const completed = ctx.completedKeys.has(def.mission_key) || e.auto;
    return {
      ...def,
      completed,
      xp_awarded: completed ? def.xp_amount : 0,
      progress: e.progress,
      current: e.current,
      hint: e.hint,
      period_start: start,
      period_end: end,
    };
  });
}

export async function getWeeklyMissions(day: string = todayKey()): Promise<PeriodMissionWithProgress[]> {
  const start = weekStartKey(day);
  return getPeriodMissions(WEEKLY_MISSIONS, start, weekEndKey(start));
}

export async function getMonthlyMissions(day: string = todayKey()): Promise<PeriodMissionWithProgress[]> {
  const start = monthStartKey(day);
  return getPeriodMissions(MONTHLY_MISSIONS, start, monthEndKey(start));
}

export interface AllActiveMissions {
  daily: MissionWithProgress[];
  weekly: PeriodMissionWithProgress[];
  monthly: PeriodMissionWithProgress[];
}

export async function getAllActiveMissions(day: string = todayKey()): Promise<AllActiveMissions> {
  const [daily, weekly, monthly] = await Promise.all([
    getDailyMissions(day),
    getWeeklyMissions(day),
    getMonthlyMissions(day),
  ]);
  return { daily, weekly, monthly };
}

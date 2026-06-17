// =============================================================================
// Today Intelligence Engine — central daily prioritization & main-focus
// decision layer for GlowUp.
//
// Pure module. No React, no Supabase, no side effects.
//
// Inputs (all optional — engine degrades gracefully):
//   - cycle:        phase + symptoms + severity (from cycle-engine)
//   - workout:      readiness, completion, rest day (from workout-adaptive-engine)
//   - nutrition:    readiness, hunger, craving, meal count (from nutrition-adaptive-engine)
//   - hydration:    ml / goal
//   - fasting:      progress %, status
//   - missions:     daily missions + near-complete signals
//   - checkins:     mood/sleep/energy presence today
//   - pregnancy:    flag
//
// Output: TodayIntelligenceContext { mainFocus, ranking, recommendation, scores }
//
// IMPORTANT: this engine NEVER recomputes hormonal/workout/nutrition logic —
// it composes the outputs of the existing engines. It always emits a single
// main focus, every score is clamped to 0..100, and missing data falls back
// to neutral (50) so the engine cannot throw on partial input.
// =============================================================================

export const TODAY_INTELLIGENCE_ENGINE_VERSION = "1.0.0";

export type TodayFocus =
  | "recovery"
  | "workout"
  | "nutrition"
  | "hydration"
  | "cycle_care"
  | "fasting"
  | "consistency";

export interface TodayIntelligenceInput {
  cycle?: {
    phase?: "menstrual" | "follicular" | "ovulation" | "luteal" | null;
    symptomCount?: number; // 0..n
    severeSymptoms?: boolean;
  };
  workout?: {
    isRestDay?: boolean;
    completedToday?: boolean;
    readinessScore?: number | null; // 0..100
    recoveryScore?: number | null;  // 0..100
  };
  nutrition?: {
    mealsToday?: number;
    targetMeals?: number;
    readinessScore?: number | null; // 0..100
    hungerScore?: number | null;    // 0..100
    cravingScore?: number | null;   // 0..100
  };
  hydration?: {
    currentMl?: number;
    goalMl?: number;
    /** Hour 0..23 used to gauge urgency (e.g. 20% at 20h is critical) */
    hour?: number;
  };
  fasting?: {
    active?: boolean;
    progressPct?: number | null; // 0..100
    completed?: boolean;
  };
  missions?: {
    total: number;
    completed: number;
    /** Missions with progress >= 0.5 but not yet completed */
    nearCompleteCount?: number;
  };
  checkins?: {
    doneToday?: boolean;
    sleepHours?: number | null;
  };
  pregnancy?: { isPregnant?: boolean };
}

export interface TodayPriorityScores {
  workout: number;
  nutrition: number;
  hydration: number;
  recovery: number;
  fasting: number;
  cycle: number;
  missions: number;
}

export interface TodayPriorityRank {
  focus: TodayFocus;
  score: number;
  reason: string;
}

export interface TodayRecommendedAction {
  label: string;
  to: string;
  emoji: string;
}

export interface TodayIntelligenceContext {
  engineVersion: string;
  mainFocus: TodayFocus;
  scores: TodayPriorityScores;
  ranking: TodayPriorityRank[];
  recommendation: {
    title: string;
    supportiveCopy: string;
    reasoning: string[];
    action: TodayRecommendedAction;
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const clamp = (n: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, Math.round(n)));

const num = (v: number | null | undefined, fallback: number): number =>
  typeof v === "number" && !Number.isNaN(v) ? v : fallback;

// ---------------------------------------------------------------------------
// Individual priority calculators
// ---------------------------------------------------------------------------

export function calculateWorkoutPriority(input: TodayIntelligenceInput): number {
  const w = input.workout ?? {};
  if (w.completedToday) return 5;
  if (w.isRestDay) return 25;
  const readiness = num(w.readinessScore, 60);
  // High readiness = high priority to train; low readiness suppresses it.
  return clamp(35 + (readiness - 50) * 0.9);
}

export function calculateNutritionPriority(input: TodayIntelligenceInput): number {
  const n = input.nutrition ?? {};
  const target = num(n.targetMeals, 4);
  const meals = num(n.mealsToday, 0);
  const adherence = target > 0 ? Math.min(1, meals / target) : 1;
  let base = 40 + (1 - adherence) * 40; // 40..80
  const craving = num(n.cravingScore, 0);
  const hunger = num(n.hungerScore, 0);
  base += craving * 0.15;
  base += hunger * 0.1;
  return clamp(base);
}

export function calculateHydrationPriority(input: TodayIntelligenceInput): number {
  const h = input.hydration ?? {};
  const goal = num(h.goalMl, 2000);
  const current = num(h.currentMl, 0);
  if (goal <= 0) return 0;
  const pct = current / goal; // 0..1+
  if (pct >= 1) return 5;
  const hour = num(h.hour, new Date().getHours());
  // Expected progress so far in the day (linear between 7h and 22h).
  const expected = Math.max(0, Math.min(1, (hour - 7) / 15));
  const deficit = Math.max(0, expected - pct); // 0..1
  // Base 35 + deficit weight (up to +60). Critical when very behind in evening.
  return clamp(35 + deficit * 90);
}

export function calculateRecoveryPriority(input: TodayIntelligenceInput): number {
  const w = input.workout ?? {};
  const c = input.cycle ?? {};
  const ck = input.checkins ?? {};
  const readiness = num(w.readinessScore, 60);
  const recovery = num(w.recoveryScore, 60);
  let score = 30;
  if (readiness < 40) score += (40 - readiness) * 1.4;
  if (recovery < 40) score += (40 - recovery) * 1.2;
  if (c.severeSymptoms) score += 25;
  if (c.phase === "menstrual") score += 10;
  const sleep = num(ck.sleepHours, 7);
  if (sleep > 0 && sleep < 6) score += 15;
  return clamp(score);
}

export function calculateFastingPriority(input: TodayIntelligenceInput): number {
  const f = input.fasting ?? {};
  if (input.pregnancy?.isPregnant) return 0;
  if (f.completed) return 5;
  if (!f.active) return 15;
  const pct = num(f.progressPct, 0);
  // Mid-fast (40-80%) gets the highest support priority.
  if (pct >= 80) return 30;
  if (pct >= 40) return 55;
  return 40;
}

export function calculateCyclePriority(input: TodayIntelligenceInput): number {
  const c = input.cycle ?? {};
  if (input.pregnancy?.isPregnant) return 35;
  if (!c.phase) return 20;
  let score = 25;
  if (c.phase === "menstrual") score += 25;
  if (c.phase === "luteal") score += 15;
  if (c.severeSymptoms) score += 25;
  score += Math.min(15, (c.symptomCount ?? 0) * 5);
  return clamp(score);
}

export function calculateMissionPriority(input: TodayIntelligenceInput): number {
  const m = input.missions;
  if (!m || m.total <= 0) return 10;
  const remaining = Math.max(0, m.total - m.completed);
  if (remaining === 0) return 5;
  const base = 25 + (remaining / m.total) * 30;
  const near = m.nearCompleteCount ?? 0;
  return clamp(base + Math.min(30, near * 15));
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function calculateOverallPriority(input: TodayIntelligenceInput): TodayPriorityScores {
  return {
    workout: calculateWorkoutPriority(input),
    nutrition: calculateNutritionPriority(input),
    hydration: calculateHydrationPriority(input),
    recovery: calculateRecoveryPriority(input),
    fasting: calculateFastingPriority(input),
    cycle: calculateCyclePriority(input),
    missions: calculateMissionPriority(input),
  };
}

const FOCUS_ORDER: TodayFocus[] = [
  "recovery", "hydration", "workout", "nutrition", "cycle_care", "fasting", "consistency",
];

function focusFromKey(key: keyof TodayPriorityScores): TodayFocus {
  switch (key) {
    case "workout": return "workout";
    case "nutrition": return "nutrition";
    case "hydration": return "hydration";
    case "recovery": return "recovery";
    case "fasting": return "fasting";
    case "cycle": return "cycle_care";
    case "missions": return "consistency";
  }
}

export function determineMainFocus(
  scores: TodayPriorityScores,
  input: TodayIntelligenceInput = {},
): TodayFocus {
  // Hard rules first (safety / urgency).
  const h = input.hydration ?? {};
  const goal = num(h.goalMl, 2000);
  const cur = num(h.currentMl, 0);
  const hour = num(h.hour, new Date().getHours());
  if (goal > 0 && cur / goal < 0.3 && hour >= 17) return "hydration";
  if (scores.recovery >= 70) return "recovery";

  // Otherwise rank by score with a stable tiebreaker.
  const entries = (Object.keys(scores) as (keyof TodayPriorityScores)[])
    .map((k) => ({ key: k, score: scores[k], focus: focusFromKey(k) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return FOCUS_ORDER.indexOf(a.focus) - FOCUS_ORDER.indexOf(b.focus);
    });
  return entries[0]?.focus ?? "consistency";
}

export function generateTodayPlan(input: TodayIntelligenceInput): {
  ranking: TodayPriorityRank[];
  scores: TodayPriorityScores;
  mainFocus: TodayFocus;
} {
  const scores = calculateOverallPriority(input);
  const mainFocus = determineMainFocus(scores, input);
  const reasons: Record<keyof TodayPriorityScores, string> = {
    workout: input.workout?.completedToday ? "Treino concluído" : input.workout?.isRestDay ? "Dia de descanso" : "Pronto para mover",
    nutrition: `${input.nutrition?.mealsToday ?? 0}/${input.nutrition?.targetMeals ?? 4} refeições`,
    hydration: `${Math.round(((input.hydration?.currentMl ?? 0) / Math.max(1, input.hydration?.goalMl ?? 2000)) * 100)}% da meta`,
    recovery: input.cycle?.severeSymptoms ? "Sintomas intensos" : "Recuperação ativa",
    fasting: input.fasting?.completed ? "Meta atingida" : input.fasting?.active ? "Jejum em andamento" : "Sem jejum hoje",
    cycle: input.cycle?.phase ? `Fase ${input.cycle.phase}` : "Sem dados de ciclo",
    missions: `${input.missions?.completed ?? 0}/${input.missions?.total ?? 0} missões`,
  };
  const ranking: TodayPriorityRank[] = (Object.keys(scores) as (keyof TodayPriorityScores)[])
    .map((k) => ({ focus: focusFromKey(k), score: scores[k], reason: reasons[k] }))
    .sort((a, b) => b.score - a.score);
  return { ranking, scores, mainFocus };
}

// ---------------------------------------------------------------------------
// Recommendation copy
// ---------------------------------------------------------------------------

const FOCUS_COPY: Record<TodayFocus, {
  title: string; copy: string; action: TodayRecommendedAction;
}> = {
  recovery: {
    title: "Dia de Recuperação",
    copy: "Seu corpo pede pausa hoje. Foque em hidratação, refeições nutritivas e movimento leve.",
    action: { label: "Abrir Check-in", to: "/app/checkin", emoji: "🌙" },
  },
  workout: {
    title: "Momentum de Treino",
    copy: "Sua prontidão está alta — aproveite para mover o corpo com intenção.",
    action: { label: "Abrir Treino", to: "/app/workouts", emoji: "💪" },
  },
  nutrition: {
    title: "Suporte Nutricional",
    copy: "Foque em refeições completas e equilibradas para sustentar seu dia.",
    action: { label: "Abrir Nutrição", to: "/app/diet", emoji: "🥗" },
  },
  hydration: {
    title: "Hidratação em Primeiro Lugar",
    copy: "Você está atrás da meta de água. Beba agora para recuperar o ritmo.",
    action: { label: "Beber água", to: "/app/hydration", emoji: "💧" },
  },
  cycle_care: {
    title: "Cuidado com o Ciclo",
    copy: "Sintonize-se com sua fase atual e registre como está se sentindo.",
    action: { label: "Abrir Ciclo", to: "/app/cycle", emoji: "🌸" },
  },
  fasting: {
    title: "Mantenha o Jejum",
    copy: "Você está dentro da janela — hidrate-se e respire fundo.",
    action: { label: "Ver Jejum", to: "/app/fasting", emoji: "⏱️" },
  },
  consistency: {
    title: "Consistência do Dia",
    copy: "Pequenas vitórias diárias constroem grandes resultados. Conclua suas missões.",
    action: { label: "Ver Missões", to: "/app/missions", emoji: "✨" },
  },
};

export function generateTodayRecommendation(
  focus: TodayFocus,
  input: TodayIntelligenceInput,
): TodayIntelligenceContext["recommendation"] {
  const tpl = FOCUS_COPY[focus];
  const reasoning: string[] = [];
  if (focus === "recovery") {
    if ((input.workout?.readinessScore ?? 100) < 40) reasoning.push("Prontidão baixa");
    if (input.cycle?.severeSymptoms) reasoning.push("Sintomas intensos");
    if ((input.checkins?.sleepHours ?? 8) < 6) reasoning.push("Sono insuficiente");
  }
  if (focus === "hydration") reasoning.push("Meta de água longe da estimativa para o horário");
  if (focus === "workout") reasoning.push("Prontidão alta + treino pendente");
  if (focus === "nutrition") reasoning.push("Refeições abaixo da meta ou desejos elevados");
  if (focus === "cycle_care" && input.cycle?.phase) reasoning.push(`Fase ${input.cycle.phase}`);
  if (focus === "fasting") reasoning.push("Jejum em andamento");
  if (focus === "consistency") reasoning.push("Missões próximas de concluir");
  if (reasoning.length === 0) reasoning.push("Equilíbrio geral do dia");
  return { title: tpl.title, supportiveCopy: tpl.copy, reasoning, action: tpl.action };
}

export function buildTodayIntelligenceContext(
  input: TodayIntelligenceInput,
): TodayIntelligenceContext {
  const { ranking, scores, mainFocus } = generateTodayPlan(input);
  const recommendation = generateTodayRecommendation(mainFocus, input);
  return {
    engineVersion: TODAY_INTELLIGENCE_ENGINE_VERSION,
    mainFocus,
    scores,
    ranking,
    recommendation,
  };
}

export function explainTodayDecision(ctx: TodayIntelligenceContext): string {
  const top = ctx.ranking[0];
  return `Foco: ${ctx.mainFocus} (score ${top?.score ?? 0}) — ${ctx.recommendation.reasoning.join(" · ")}`;
}

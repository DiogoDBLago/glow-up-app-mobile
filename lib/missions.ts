import type { Profile, Mission, WeeklyPlanDay } from "./store";
import { workoutsByPlace } from "./data/workouts";
import { buildCycleSnapshot, phaseForDay, todayKey, type CycleSnapshot } from "./cycle-engine";
import type { CyclePhase } from "./personalization";

export function hydrationGoalFor(profile: Profile): number {
  const kg = profile.weightKg ?? 60;
  return Math.round(kg * 35); // ml
}

export function generateMissions(profile: Profile): Mission[] {
  const goalMl = hydrationGoalFor(profile);
  const list: Mission[] = [
    { id: "m-water", title: `Beber ${(goalMl / 1000).toFixed(1).replace(".", ",")}L de água`, xp: 30, done: false, category: "water" },
    { id: "m-mood", title: "Registrar seu humor", xp: 10, done: false, category: "mood" },
    { id: "m-workout", title: "Concluir o treino do dia", xp: 60, done: false, category: "workout" },
  ];
  if (profile.goal === "lose" || profile.goal === "bloat") {
    list.push({ id: "m-nosoda", title: "Evitar refrigerante hoje", xp: 25, done: false, category: "food" });
  }
  if (profile.goal === "gain") {
    list.push({ id: "m-protein", title: "Comer 1 refeição rica em proteína", xp: 25, done: false, category: "food" });
  }
  if (profile.sleepQuality === "low") {
    list.push({ id: "m-sleep", title: "Dormir antes das 23h", xp: 40, done: false, category: "sleep" });
  }
  return list;
}

export function generateWeeklyPlan(profile: Profile): WeeklyPlanDay[] {
  const place = profile.place ?? "both";
  const pool = workoutsByPlace(place);
  const days = profile.daysPerWeek ?? 3;

  const pickByMuscles = (...muscles: string[]): string => {
    for (const m of muscles) {
      const w = pool.find(w => w.muscles.includes(m));
      if (w) return w.id;
    }
    return pool[0]?.id ?? "rest";
  };

  // Templates by days/week (Mon..Sun → 0..6)
  let template: string[];
  if (days <= 3) {
    template = [
      pickByMuscles("glutes", "legs"),
      "rest",
      pickByMuscles("chest", "back", "shoulders", "abs"),
      "rest",
      pickByMuscles("fullbody", "cardio", "hiit"),
      "rest",
      "rest",
    ];
  } else if (days === 4) {
    template = [
      pickByMuscles("glutes"),
      pickByMuscles("back", "chest", "shoulders"),
      "rest",
      pickByMuscles("legs", "quads", "hamstrings"),
      "rest",
      pickByMuscles("fullbody", "cardio", "hiit"),
      "rest",
    ];
  } else if (days === 5) {
    template = [
      pickByMuscles("glutes"),
      pickByMuscles("back", "chest", "shoulders"),
      pickByMuscles("cardio", "hiit", "abs"),
      pickByMuscles("legs", "quads"),
      pickByMuscles("fullbody"),
      "rest",
      pickByMuscles("mobility", "stretch"),
    ];
  } else {
    // 6+
    template = [
      pickByMuscles("glutes"),
      pickByMuscles("back"),
      pickByMuscles("legs"),
      pickByMuscles("chest", "shoulders"),
      pickByMuscles("hiit", "cardio"),
      pickByMuscles("biceps", "triceps", "arms"),
      pickByMuscles("mobility", "stretch"),
    ];
  }

  return template.map((type, day) => ({ day, type, done: false }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle helpers — THIN ADAPTERS over `src/lib/cycle-engine.ts`.
// No phase math lives here anymore. All cycle reasoning (cycleDay, phase,
// ovulation day, fertile window, next period) is delegated to the single
// engine source so missions.ts, intelligence.ts and use-cycle-reminders.ts
// stay in lock-step with the Cycle Page / Home / Today Plan / Debug.
// ─────────────────────────────────────────────────────────────────────────────

function readCycleInputs(profile: any | null | undefined) {
  if (!profile) return null;
  const track = profile.trackCycle ?? profile.menstruates;
  const lastDate = profile.lastPeriodDate ?? profile.last_period_date;
  if (!track || !lastDate) return null;
  return {
    last_period_date: lastDate as string,
    cycle_length: (profile.cycleLength ?? profile.cycle_length) as number | null | undefined,
    period_length: (profile.periodLength ?? profile.period_length) as number | null | undefined,
  };
}

function snapshotFor(profile: any | null | undefined): CycleSnapshot | null {
  const inp = readCycleInputs(profile);
  if (!inp) return null;
  return buildCycleSnapshot(inp, todayKey());
}

const PT_LABEL: Record<CyclePhase, string> = {
  menstrual: "Menstrual",
  follicular: "Folicular",
  ovulation: "Ovulatória",
  luteal: "Lútea",
};

const PHASE_SUGGESTION: Record<CyclePhase, string> = {
  menstrual: "Suavidade. Caminhada, alongamento, chá quente.",
  follicular: "Energia em alta — invista em treinos de força.",
  ovulation: "Pico de performance. Vá com tudo no treino!",
  luteal: "Reduza intensidade. Foque em técnica e descanso.",
};

export function cyclePhase(profile: any): { phase: string; day: number; suggestion: string } | null {
  const snap = snapshotFor(profile);
  if (!snap) return null;
  return {
    phase: PT_LABEL[snap.phase],
    day: snap.cycleDay,
    suggestion: PHASE_SUGGESTION[snap.phase],
  };
}

export type CyclePhaseKey = "menstrual" | "follicular" | "ovulatory" | "luteal";

const KEY_FROM_PHASE: Record<CyclePhase, CyclePhaseKey> = {
  menstrual: "menstrual",
  follicular: "follicular",
  ovulation: "ovulatory",
  luteal: "luteal",
};

export interface CycleInsight {
  phase: string;
  phaseKey: CyclePhaseKey;
  day: number;
  cycleLength: number;
  daysToNextPeriod: number;
  daysToOvulation: number;
  daysToPms: number;
  inPms: boolean;
  emotional: string;
  workoutTip: string;
  nutritionTip: string;
  emoji: string;
  gradient: string;
  color: string;
}

const PHASE_META: Record<CyclePhaseKey, { phase: string; emoji: string; gradient: string; color: string; emotional: string; workout: string; nutrition: string }> = {
  menstrual: {
    phase: "Menstrual", emoji: "", gradient: "from-rose-200/70 to-rose-100/40", color: "#e8748f",
    emotional: "Seu corpo está pedindo descanso e gentileza. Vá no seu ritmo hoje.",
    workout: "Caminhada leve, mobilidade, yoga ou alongamento.",
    nutrition: "Ferro, refeições quentes, sopas, chás e bastante água.",
  },
  follicular: {
    phase: "Folicular", emoji: "", gradient: "from-pink-200/70 to-lilac/50", color: "#f0a6c7",
    emotional: "Sua energia está em alta — ótimo dia para se desafiar.",
    workout: "Treinos de força, glúteos, progressão de carga.",
    nutrition: "Proteínas, refeições coloridas, frutas e cereais integrais.",
  },
  ovulatory: {
    phase: "Ovulatória", emoji: "", gradient: "from-amber-200/60 to-rose-200/60", color: "#f5b461",
    emotional: "Pico de performance e disposição. Brilhe hoje.",
    workout: "HIIT, full body, treinos intensos com foco em performance.",
    nutrition: "Hidratação reforçada, proteína magra, antioxidantes (frutas vermelhas).",
  },
  luteal: {
    phase: "Lútea", emoji: "", gradient: "from-lilac/60 to-blush/60", color: "#b58fd1",
    emotional: "Energia moderada. Acolha sua sensibilidade e desacelere quando precisar.",
    workout: "Força moderada, cardio leve, técnica e alongamento.",
    nutrition: "Magnésio, banana, aveia, chocolate 70%, chás calmantes.",
  },
};

export function cycleInsight(profile: any | null): CycleInsight | null {
  const snap = snapshotFor(profile);
  if (!snap) return null;

  const phaseKey = KEY_FROM_PHASE[snap.phase];
  const m = PHASE_META[phaseKey];

  // PMS window heuristic — derived from engine values, never recomputes phase.
  const pmsStart = Math.max(snap.ovulationDay + 2, snap.cycleLength - 5);
  const daysToPms = pmsStart - snap.cycleDay;
  const inPms = snap.cycleDay >= pmsStart && snap.cycleDay <= snap.cycleLength;

  return {
    phase: m.phase,
    phaseKey,
    day: snap.cycleDay,
    cycleLength: snap.cycleLength,
    daysToNextPeriod: snap.daysToNextPeriod,
    daysToOvulation: snap.daysToOvulation,
    daysToPms,
    inPms,
    emotional: m.emotional,
    workoutTip: m.workout,
    nutritionTip: m.nutrition,
    emoji: m.emoji,
    gradient: m.gradient,
    color: m.color,
  };
}

/** Thin adapter — delegates to engine's `phaseForDay`. */
export function phaseForCycleDay(day: number, cycleLength: number, periodLength: number): CyclePhaseKey {
  return KEY_FROM_PHASE[phaseForDay(day, periodLength, cycleLength)];
}

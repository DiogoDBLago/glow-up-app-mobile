import type { PlanDay, PlanExercise, UserPlan, WGoal, WorkoutSessionV2 } from "./store";
import type { Place } from "./store";
import { getLibraryExercise } from "./data/exercise-library";

export const GOAL_LABELS: Record<WGoal, string> = {
  lose: "Emagrecer",
  muscle: "Ganhar músculo",
  tone: "Tonificar",
  strength: "Força",
  fitness: "Bem-estar",
};

export const PLACE_LABELS: Record<Place, string> = {
  home: "Casa",
  gym: "Academia",
  both: "Casa & Academia",
};

// Mon=0 .. Sun=6
export const WEEKDAY_LABELS: string[] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const WEEKDAY_SHORT: string[] = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Smart weekday preset given a target count
export function defaultWeekdaysFor(count: number): number[] {
  const presets: Record<number, number[]> = {
    1: [2], // Wed
    2: [0, 3], // Mon, Thu
    3: [0, 2, 4], // Mon, Wed, Fri
    4: [0, 1, 3, 4], // Mon, Tue, Thu, Fri
    5: [0, 1, 2, 3, 4], // Mon–Fri
    6: [0, 1, 2, 3, 4, 5], // Mon–Sat
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return presets[Math.max(1, Math.min(7, count))] ?? [0, 2, 4];
}

export function makeEmptyPlan(opts: { place: Place; goal: WGoal; weekdays?: number[]; daysPerWeek?: number }): UserPlan {
  const weekdays = (opts.weekdays && opts.weekdays.length > 0)
    ? [...opts.weekdays].sort((a, b) => a - b)
    : defaultWeekdaysFor(opts.daysPerWeek ?? 3);
  const days: PlanDay[] = weekdays.map((wd, i) => ({
    id: `day-${wd}-${i}-${Date.now().toString(36)}`,
    name: WEEKDAY_LABELS[wd] ?? `Dia ${i + 1}`,
    weekday: wd,
    exercises: [],
  }));
  return {
    id: `plan-${Date.now().toString(36)}`,
    place: opts.place,
    goal: opts.goal,
    daysPerWeek: weekdays.length,
    weekdays,
    days,
    createdAt: Date.now(),
  };
}

// Start of current week (Mon 00:00 local)
export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const dayIdx = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayIdx);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isDayCompletedThisWeek(
  dayId: string,
  sessions: WorkoutSessionV2[],
): boolean {
  const monday = startOfWeek().getTime();
  return sessions.some(s => s.dayId === dayId && s.endedAt && s.startedAt >= monday);
}

export function newPlanExercise(libraryId: string): PlanExercise {
  const src = getLibraryExercise(libraryId);
  return {
    id: `pe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    exerciseId: libraryId,
    sets: src?.defaultSets ?? 3,
    reps: src?.defaultReps ?? "10-12",
    restSec: src?.defaultRestSec ?? 60,
  };
}

export function estimateDayDurationMin(day: PlanDay): number {
  if (day.exercises.length === 0) return 0;
  let secs = 0;
  for (const pe of day.exercises) {
    // ~40s per set + rest
    secs += pe.sets * (40 + pe.restSec);
  }
  return Math.max(5, Math.round(secs / 60));
}

export function estimateDayKcal(day: PlanDay): number {
  if (day.exercises.length === 0) return 0;
  const min = estimateDayDurationMin(day);
  // weighted average kcalPerMin across exercises
  let weightedKcal = 0;
  let weight = 0;
  for (const pe of day.exercises) {
    const lib = getLibraryExercise(pe.exerciseId);
    // For API exercises (lib === undefined) use a rough per-bodyPart heuristic
    const apiKcal = pe.external?.bodyPart === "cardio" ? 9
      : pe.external?.bodyPart === "upper legs" ? 8
      : pe.external ? 6 : 7;
    const k = lib?.kcalPerMin ?? apiKcal;
    weightedKcal += k * pe.sets;
    weight += pe.sets;
  }
  const avg = weight > 0 ? weightedKcal / weight : 7;
  return Math.round(avg * min);
}

export function sessionVolume(s: WorkoutSessionV2): number {
  let v = 0;
  for (const entry of s.entries) for (const set of entry.sets) {
    if (set.done) v += set.reps * (set.weightKg || 0);
  }
  return v;
}

export function todayDayId(plan: UserPlan | null): string | null {
  if (!plan || plan.days.length === 0) return null;
  const dayIdx = (new Date().getDay() + 6) % 7;
  const match = plan.days.find(d => d.weekday === dayIdx);
  if (match) return match.id;
  return plan.days[dayIdx % plan.days.length].id;
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

import { useEffect, useMemo, useState } from "react";
import { useStore, type V2SessionEntry, type V2SessionSet, type WorkoutVariant, type WorkoutSessionMeta, type UserPlan, type PlanDay } from "@/lib/store";
import { getLibraryExercise } from "@/lib/data/exercise-library";
import { sessionVolume, uid } from "@/lib/workouts-v2";
import { exerciseGifUrl } from "@/lib/exercise-fallback";

interface UseWorkoutSessionArgs {
  plan: UserPlan | null;
  baseDay: PlanDay | null;
  day: PlanDay | null;
  dayId: string;
  resolvedVariant: WorkoutVariant;
  adaptiveCtx: any;
  adaptation: any;
}

export function useWorkoutSession({
  plan,
  baseDay,
  day,
  dayId,
  resolvedVariant,
  adaptiveCtx,
  adaptation,
}: UseWorkoutSessionArgs) {
  const { dispatch } = useStore();

  const [startedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [idx, setIdx] = useState(0);
  const [entries, setEntries] = useState<V2SessionEntry[]>(() =>
    day?.exercises.map((pe) => ({
      planExerciseId: pe.id,
      exerciseId: pe.exerciseId,
      sets: Array.from({ length: pe.sets }, (): V2SessionSet => ({
        reps: parseInt(pe.reps) || 10,
        weightKg: pe.weightKg || 0,
        done: false,
      })),
    })) ?? []
  );
  const [restLeft, setRestLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (restLeft <= 0 || paused) return;
    const id = setTimeout(() => setRestLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [restLeft, paused]);

  const planEx = day?.exercises[idx];
  const lib = planEx ? getLibraryExercise(planEx.exerciseId) : undefined;
  const displayImage = planEx?.external ? exerciseGifUrl(planEx.external) : (lib?.image ?? "");
  const entry = entries[idx];

  const totalSets = entries.reduce((s, e) => s + e.sets.length, 0);
  const doneSets = entries.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  const progress = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const elapsedMin = Math.max(1, Math.round((now - startedAt) / 60000));

  const runningKcal = useMemo(() => {
    let kc = 0;
    for (const e of entries) {
      const l = getLibraryExercise(e.exerciseId);
      const sDone = e.sets.filter((x) => x.done).length;
      kc += (l?.kcalPerMin ?? 7) * sDone * 0.7;
    }
    return Math.round(kc);
  }, [entries, now]);

  function updateSet(setIdx: number, patch: Partial<V2SessionSet>) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i !== idx
          ? e
          : {
              ...e,
              sets: e.sets.map((s, j) => (j === setIdx ? { ...s, ...patch } : s)),
            }
      )
    );
  }

  function completeSet(setIdx: number) {
    updateSet(setIdx, { done: true });
    setRestLeft(planEx?.restSec || 60);
    setPaused(false);
  }

  function nextExercise() {
    if (day && idx < day.exercises.length - 1) {
      setIdx(idx + 1);
      setRestLeft(0);
    } else {
      finish();
    }
  }

  function finish() {
    if (!plan || !baseDay) return;
    const endedAt = Date.now();
    const durationMin = Math.max(1, Math.round((endedAt - startedAt) / 60000));

    const meta: WorkoutSessionMeta = {
      workoutVariant: resolvedVariant,
      originalDayId: baseDay.id,
      adaptedDayId: adaptation?.adaptedWorkout ? adaptation.adaptedWorkout.id : undefined,
      readinessScore: adaptiveCtx?.readinessScore,
      recoveryScore: adaptiveCtx?.recoveryScore,
      adaptationReasons:
        resolvedVariant === "adapted" && adaptation?.reasons
          ? adaptation.reasons.map((r: any) => r.label)
          : undefined,
      engineVersion: adaptiveCtx?.engineVersion,
    };

    const session = {
      id: uid("ws"),
      planId: plan.id,
      dayId: baseDay.id,
      dayName: baseDay.name,
      startedAt,
      endedAt,
      entries,
      durationMin,
      kcal: runningKcal,
      volumeKg: 0,
      meta,
    };

    session.volumeKg = sessionVolume(session);
    dispatch({ type: "WV2_ADD_SESSION", session });
    setFinished(true);
  }

  const allSetsDone = entry?.sets.every((s) => s.done) ?? false;

  return {
    state: {
      idx,
      entries,
      entry,
      restLeft,
      paused,
      finished,
      planEx,
      lib,
      displayImage,
      totalSets,
      doneSets,
      progress,
      elapsedMin,
      runningKcal,
      allSetsDone,
    },
    actions: {
      setIdx,
      setRestLeft,
      setPaused,
      updateSet,
      completeSet,
      nextExercise,
      finish,
    },
  };
}

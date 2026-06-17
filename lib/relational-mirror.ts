// Dual-write mirror: legacy jsonb in user_data.state stays the source of truth
// for the current UI, while every meaningful event is also written to the new
// relational tables (workout_sessions, meal_logs, hydration_logs, xp_events,
// user_achievements). Fire-and-forget — failures are logged, never thrown.
//
// Idempotency: ongoing writes use natural keys (hydration via unique
// user_id+log_date upsert) or a legacy_id stamped in metadata. The backfill
// reads existing legacy_ids per user and skips anything already mirrored.

import { supabase } from "@/supabase/client";
import { Storage } from "./platform";
import type {
  AppState,
  WorkoutSessionV2,
  WorkoutLog,
  MealLog,
  XpEvent,
} from "./store";

const todayBR = () => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const isoDate = (ms: number) => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
};

// ============================================================
// ONGOING MIRROR — called after every reducer pass
// ============================================================

export async function mirrorWorkoutSessionV2(
  uid: string,
  s: WorkoutSessionV2,
) {
  const completed = s.endedAt ?? s.startedAt;
  const exercisesCompleted = s.entries.filter((e) =>
    e.sets.some((set) => set.done),
  ).length;
  const { error } = await supabase.from("workout_sessions").insert({
    user_id: uid,
    workout_id: s.dayId,
    plan_id: s.planId,
    plan_day_id: s.dayId,
    session_date: isoDate(completed),
    duration_min: s.durationMin,
    completed_at: new Date(completed).toISOString(),
    exercises_completed: exercisesCompleted,
    total_exercises: s.entries.length,
    calories_estimated: Math.round(s.kcal ?? 0),
    source: "app",
    metadata: { legacy_id: s.id, day_name: s.dayName, volume_kg: s.volumeKg },
  });
  if (error) console.error("[mirror] workout_sessions insert failed", error);
}

export async function mirrorWorkoutLog(uid: string, w: WorkoutLog) {
  const { error } = await supabase.from("workout_sessions").insert({
    user_id: uid,
    workout_id: w.workoutId,
    session_date: w.date,
    duration_min: w.durationMin,
    completed_at: new Date(`${w.date}T12:00:00Z`).toISOString(),
    source: "legacy",
    metadata: { legacy_id: w.id },
  });
  if (error) console.error("[mirror] workout_sessions(legacy) insert failed", error);
}

export async function mirrorMealLog(uid: string, m: MealLog) {
  await supabase
    .from("meal_logs")
    .delete()
    .eq("user_id", uid)
    .filter("metadata->>legacy_id", "eq", m.id);
  const { error } = await supabase.from("meal_logs").insert({
    user_id: uid,
    log_date: m.date,
    meal_type: m.mealType ?? "other",
    name: m.name,
    kcal: Math.round(m.kcal ?? 0),
    protein_g: m.protein ?? 0,
    carbs_g: m.carbs ?? 0,
    fat_g: m.fats ?? 0,
    food_ids: m.foodIds ?? [],
    source: "app",
    metadata: { legacy_id: m.id },
  });
  if (error) console.error("[mirror] meal_logs insert failed", error);
}

export async function updateMirroredMealLog(uid: string, m: MealLog) {
  const { error } = await supabase
    .from("meal_logs")
    .update({
      log_date: m.date,
      meal_type: m.mealType ?? "other",
      name: m.name,
      kcal: Math.round(m.kcal ?? 0),
      protein_g: m.protein ?? 0,
      carbs_g: m.carbs ?? 0,
      fat_g: m.fats ?? 0,
      food_ids: m.foodIds ?? [],
      source: "app",
    })
    .eq("user_id", uid)
    .filter("metadata->>legacy_id", "eq", m.id);
  if (error) console.error("[mirror] meal_logs update failed", error);
}

export async function deleteMirroredMealLog(uid: string, legacyId: string) {
  const { error } = await supabase
    .from("meal_logs")
    .delete()
    .eq("user_id", uid)
    .filter("metadata->>legacy_id", "eq", legacyId);
  if (error) console.error("[mirror] meal_logs delete failed", error);
}

export async function mirrorHydration(uid: string, dateKey: string, ml: number) {
  const { error } = await supabase.from("hydration_logs").upsert(
    { user_id: uid, log_date: dateKey, ml, source: "app" },
    { onConflict: "user_id,log_date" },
  );
  if (error) console.error("[mirror] hydration_logs upsert failed", error);
}

export async function mirrorXpEvent(
  uid: string,
  amount: number,
  source: string,
  description?: string,
  legacyId?: string,
) {
  if (amount === 0) return;
  const { error } = await supabase.from("xp_events").insert({
    user_id: uid,
    event_date: todayBR(),
    source,
    amount,
    description: description ?? null,
    metadata: legacyId ? { legacy_id: legacyId } : {},
  });
  if (error) console.error("[mirror] xp_events insert failed", error);
}

export async function mirrorAchievementUnlock(uid: string, code: string) {
  const { data: ach, error: achErr } = await supabase
    .from("achievements")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (achErr || !ach) {
    if (achErr) console.error("[mirror] achievement lookup failed", achErr);
    return;
  }
  const { error } = await supabase.from("user_achievements").upsert(
    { user_id: uid, achievement_id: ach.id, metadata: { source: "claimed" } },
    { onConflict: "user_id,achievement_id" },
  );
  if (error) console.error("[mirror] user_achievements upsert failed", error);
}

// ============================================================
// Diff-based mirror — runs after each state change
// ============================================================
export async function mirrorStateDiff(
  uid: string,
  prev: AppState,
  next: AppState,
) {
  try {
    // workouts v2
    if (next.workoutSessionsV2.length > prev.workoutSessionsV2.length) {
      const added = next.workoutSessionsV2.filter(
        (s) => !prev.workoutSessionsV2.some((p) => p.id === s.id),
      );
      for (const s of added) await mirrorWorkoutSessionV2(uid, s);
    }
    // legacy workout logs
    if (next.workoutLogs.length > prev.workoutLogs.length) {
      const added = next.workoutLogs.filter(
        (w) => !prev.workoutLogs.some((p) => p.id === w.id),
      );
      for (const w of added) await mirrorWorkoutLog(uid, w);
    }
    // meals
    if (next.mealLogs.length > prev.mealLogs.length) {
      const added = next.mealLogs.filter(
        (m) => !prev.mealLogs.some((p) => p.id === m.id),
      );
      for (const m of added) await mirrorMealLog(uid, m);
    }
    if (next.mealLogs.length <= prev.mealLogs.length) {
      const removed = prev.mealLogs.filter(
        (m) => !next.mealLogs.some((n) => n.id === m.id),
      );
      for (const m of removed) await deleteMirroredMealLog(uid, m.id);
    }
    const changedMeals = next.mealLogs.filter((m) => {
      const old = prev.mealLogs.find((p) => p.id === m.id);
      return old && JSON.stringify(old) !== JSON.stringify(m);
    });
    for (const m of changedMeals) await updateMirroredMealLog(uid, m);
    // hydration is persisted synchronously by useHydrationActions so Home,
    // Hydration, reports, and debug read one idempotent user_id+log_date row.
    // xp ledger
    if (next.xpLedger.length > prev.xpLedger.length) {
      const added = next.xpLedger.filter(
        (e) => !prev.xpLedger.some((p) => p.id === e.id),
      );
      for (const e of added)
        await mirrorXpEvent(uid, e.amount, e.source, undefined, e.id);
    }
    // achievement claims
    if (next.claimedRewards.length > prev.claimedRewards.length) {
      const added = next.claimedRewards.filter(
        (c) => !prev.claimedRewards.includes(c),
      );
      for (const code of added) await mirrorAchievementUnlock(uid, code);
    }
  } catch (e) {
    console.error("[mirror] diff error", e);
  }
}

// ============================================================
// ONE-TIME BACKFILL — idempotent
// ============================================================
const BACKFILL_FLAG = "glowup_backfill_v1_done";

export async function runBackfillOnce(uid: string, state: AppState) {
  const flagKey = `${BACKFILL_FLAG}:${uid}`;
  try {
    const done = await Storage.getItem(flagKey);
    if (done) return;
  } catch {
    /* ignore */
  }

  try {
    // ---- workout_sessions (v2 + legacy)
    const { data: existingWs } = await supabase
      .from("workout_sessions")
      .select("metadata")
      .eq("user_id", uid);
    const wsLegacyIds = new Set(
      (existingWs ?? [])
        .map((r: any) => r.metadata?.legacy_id)
        .filter(Boolean),
    );

    const v2Rows = state.workoutSessionsV2
      .filter((s) => !wsLegacyIds.has(s.id))
      .map((s) => {
        const completed = s.endedAt ?? s.startedAt;
        const exercisesCompleted = s.entries.filter((e) =>
          e.sets.some((set) => set.done),
        ).length;
        return {
          user_id: uid,
          workout_id: s.dayId,
          plan_id: s.planId,
          plan_day_id: s.dayId,
          session_date: isoDate(completed),
          duration_min: s.durationMin,
          completed_at: new Date(completed).toISOString(),
          exercises_completed: exercisesCompleted,
          total_exercises: s.entries.length,
          calories_estimated: Math.round(s.kcal ?? 0),
          source: "backfill",
          metadata: {
            legacy_id: s.id,
            day_name: s.dayName,
            volume_kg: s.volumeKg,
          },
        };
      });

    const legacyRows = state.workoutLogs
      .filter((w) => !wsLegacyIds.has(w.id))
      .map((w) => ({
        user_id: uid,
        workout_id: w.workoutId,
        session_date: w.date,
        duration_min: w.durationMin,
        completed_at: new Date(`${w.date}T12:00:00Z`).toISOString(),
        source: "backfill",
        metadata: { legacy_id: w.id },
      }));

    if (v2Rows.length || legacyRows.length) {
      const { error } = await supabase
        .from("workout_sessions")
        .insert([...v2Rows, ...legacyRows]);
      if (error) console.error("[backfill] workout_sessions", error);
    }

    // ---- meal_logs
    const { data: existingMeals } = await supabase
      .from("meal_logs")
      .select("metadata")
      .eq("user_id", uid);
    const mealLegacyIds = new Set(
      (existingMeals ?? [])
        .map((r: any) => r.metadata?.legacy_id)
        .filter(Boolean),
    );
    const mealRows = state.mealLogs
      .filter((m) => !mealLegacyIds.has(m.id))
      .map((m) => ({
        user_id: uid,
        log_date: m.date,
        meal_type: m.mealType ?? "other",
        name: m.name,
        kcal: Math.round(m.kcal ?? 0),
        protein_g: m.protein ?? 0,
        carbs_g: m.carbs ?? 0,
        fat_g: m.fats ?? 0,
        food_ids: m.foodIds ?? [],
        source: "backfill",
        metadata: { legacy_id: m.id },
      }));
    if (mealRows.length) {
      const { error } = await supabase.from("meal_logs").insert(mealRows);
      if (error) console.error("[backfill] meal_logs", error);
    }

    // ---- hydration_logs (upsert by user_id+log_date)
    const hydroRows = Object.entries(state.hydration ?? {})
      .filter(([, ml]) => (ml ?? 0) > 0)
      .map(([log_date, ml]) => ({
        user_id: uid,
        log_date,
        ml: ml as number,
        source: "backfill",
      }));
    if (hydroRows.length) {
      const { error } = await supabase
        .from("hydration_logs")
        .upsert(hydroRows, { onConflict: "user_id,log_date" });
      if (error) console.error("[backfill] hydration_logs", error);
    }

    // ---- xp_events
    const { data: existingXp } = await supabase
      .from("xp_events")
      .select("metadata")
      .eq("user_id", uid);
    const xpLegacyIds = new Set(
      (existingXp ?? [])
        .map((r: any) => r.metadata?.legacy_id)
        .filter(Boolean),
    );
    const xpRows = (state.xpLedger ?? [])
      .filter((e: XpEvent) => !xpLegacyIds.has(e.id))
      .map((e) => ({
        user_id: uid,
        event_date: e.date,
        source: e.source || "legacy",
        amount: e.amount,
        metadata: { legacy_id: e.id, backfilled: true },
      }));
    if (xpRows.length) {
      const { error } = await supabase.from("xp_events").insert(xpRows);
      if (error) console.error("[backfill] xp_events", error);
    }

    // ---- user_achievements
    if ((state.claimedRewards ?? []).length) {
      const { data: achs } = await supabase
        .from("achievements")
        .select("id, code")
        .in("code", state.claimedRewards);
      if (achs?.length) {
        const rows = achs.map((a: any) => ({
          user_id: uid,
          achievement_id: a.id,
          metadata: { source: "backfill" },
        }));
        const { error } = await supabase
          .from("user_achievements")
          .upsert(rows, { onConflict: "user_id,achievement_id" });
        if (error) console.error("[backfill] user_achievements", error);
      }
    }

    try {
      await Storage.setItem(flagKey, "1");
    } catch {
      /* ignore */
    }
    console.info("[backfill] complete for", uid);
  } catch (e) {
    console.error("[backfill] fatal", e);
  }
}

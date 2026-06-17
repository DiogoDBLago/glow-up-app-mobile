// Data layer for Minha Evolução — reads from relational tables as primary,
// computes derived metrics (streaks, GlowUp score, level) deterministically.

import { supabase } from "@/supabase/client";

export interface ProgressSummary {
  weightChangeKg: number | null;
  weightStartKg: number | null;
  weightCurrentKg: number | null;
  workoutCount: number;
  checkinCount: number;
  mealCount: number;
  hydrationDaysHit: number;
  totalXp: number;
  glowupScore: number;
  scoreReady: boolean;
  // Fasting pillar
  fastingCompletedDaysLast30: number;
  fastingBestStreak: number;
  fastingAverageDurationMin: number | null;
  fastingMostUsedTargetMinutes: number | null;
}

export interface StreakInfo {
  current: number;
  best: number;
}

export interface Streaks {
  workout: StreakInfo;
  checkin: StreakInfo;
  hydration: StreakInfo;
  nutrition: StreakInfo;
}

export interface AchievementRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  category: string;
  xp_reward: number;
  unlocked_at: string | null;
}

export interface WeeklyPoint {
  weekStart: string; // YYYY-MM-DD (Monday)
  workouts: number;
  checkins: number;
  meals: number;
  hydrationDaysHit: number;
  xp: number;
  photos: number;
  weightUpdates: number;
}

export interface MeasurementRow {
  id: string;
  measurement_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  arm_cm: number | null;
  chest_cm: number | null;
  calf_cm: number | null;
  neck_cm: number | null;
  notes: string | null;
}

export interface PhotoRow {
  id: string;
  photo_type: "front" | "side" | "back";
  photo_url: string;
  photo_path: string | null;
  photo_date: string;
}

// ============================================================
// Helpers
// ============================================================
const tzDate = (d: Date = new Date()) => {
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

const dayBefore = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
};

const startOfWeek = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = (dt.getUTCDay() + 6) % 7; // Monday=0
  dt.setUTCDate(dt.getUTCDate() - day);
  return dt.toISOString().slice(0, 10);
};

function computeStreak(datesAsc: string[]): StreakInfo {
  if (datesAsc.length === 0) return { current: 0, best: 0 };
  const set = new Set(datesAsc);
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of datesAsc) {
    if (prev && dayBefore(d) === prev) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = d;
  }
  // Current streak = consecutive days ending today or yesterday
  const today = tzDate();
  let cursor = set.has(today) ? today : set.has(dayBefore(today)) ? dayBefore(today) : null;
  let current = 0;
  while (cursor && set.has(cursor)) {
    current += 1;
    cursor = dayBefore(cursor);
  }
  return { current, best };
}

// ============================================================
// LEVELS
// ============================================================
const LEVEL_THRESHOLDS = [0, 200, 600, 1500, 3500];
const LEVEL_NAMES = [
  "Iniciante",
  "Consistente",
  "Determinada",
  "Transformação",
  "GlowUp Elite",
];

export interface LevelInfo {
  level: number;
  name: string;
  currentXp: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  progressPct: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  const currentLevelXp = LEVEL_THRESHOLDS[level - 1];
  const nextLevelXp =
    level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;
  const progressPct = nextLevelXp
    ? Math.min(100, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
    : 100;
  return {
    level,
    name: LEVEL_NAMES[level - 1],
    currentXp: xp,
    currentLevelXp,
    nextLevelXp,
    progressPct,
  };
}

// ============================================================
// MAIN FETCH — single round-trip group of queries
// ============================================================
export async function fetchProgressData(uid: string) {
  const sinceIso = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 90);
    return d.toISOString().slice(0, 10);
  })();

  const [
    workoutsRes,
    checkinsRes,
    mealsRes,
    hydrationRes,
    xpRes,
    measurementsRes,
    photosRes,
    persRes,
    achievementsRes,
    unlocksRes,
    fastingResRaw,
  ] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("session_date, duration_min, calories_estimated, completed_at")
      .eq("user_id", uid)
      .order("session_date", { ascending: true }),
    supabase
      .from("cycle_daily_logs")
      .select("date")
      .eq("user_id", uid)
      .order("date", { ascending: true }),
    supabase
      .from("meal_logs")
      .select("log_date, kcal, protein_g")
      .eq("user_id", uid)
      .order("log_date", { ascending: true }),
    supabase
      .from("hydration_logs")
      .select("log_date, ml")
      .eq("user_id", uid)
      .order("log_date", { ascending: true }),
    supabase
      .from("xp_events")
      .select("event_date, amount, source")
      .eq("user_id", uid)
      .order("event_date", { ascending: true }),
    supabase
      .from("body_measurements" as any)
      .select("*")
      .eq("user_id", uid)
      .order("measurement_date", { ascending: true }),
    supabase
      .from("progress_photos" as any)
      .select("*")
      .eq("user_id", uid)
      .order("photo_date", { ascending: false }),
    supabase
      .from("user_personalization_profile")
      .select("daily_water_target_ml, daily_calorie_target, weight_kg")
      .eq("user_id", uid)
      .maybeSingle(),
    supabase
      .from("achievements")
      .select("id, code, title, description, icon, category, xp_reward")
      .eq("is_active", true)
      .order("category"),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", uid),
    supabase
      .from("fasting_sessions")
      .select("fasting_date, started_at, ended_at, target_minutes, status")
      .eq("user_id", uid)
      .order("fasting_date", { ascending: false }),
  ]);

  const workouts = (workoutsRes.data ?? []) as any[];
  const checkins = (checkinsRes.data ?? []) as any[];
  const meals = (mealsRes.data ?? []) as any[];
  const hydration = (hydrationRes.data ?? []) as any[];
  const xpEvents = (xpRes.data ?? []) as any[];
  const measurements = ((measurementsRes.data ?? []) as unknown) as MeasurementRow[];
  const photos = ((photosRes.data ?? []) as unknown) as PhotoRow[];
  const pers = persRes.data as any;
  const catalog = (achievementsRes.data ?? []) as any[];
  const unlocks = (unlocksRes.data ?? []) as any[];
  const fastingRows = (fastingResRaw.data ?? []) as Array<{
    fasting_date: string; started_at: string | null; ended_at: string | null;
    target_minutes: number; status: string;
  }>;

  // ---- Weight series (from measurements; fallback to personalization)
  const weightSeries = measurements
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.measurement_date, kg: Number(m.weight_kg) }));
  const weightStart = weightSeries[0]?.kg ?? pers?.weight_kg ?? null;
  const weightCurrent =
    weightSeries[weightSeries.length - 1]?.kg ?? pers?.weight_kg ?? null;
  const weightChange =
    weightStart != null && weightCurrent != null
      ? Number((weightCurrent - weightStart).toFixed(1))
      : null;

  // ---- Hydration days hit (where ml >= target, default 2000)
  const waterTarget = pers?.daily_water_target_ml ?? 2000;
  const hydrationDaysHitArr = hydration.filter((h) => h.ml >= waterTarget * 0.9);
  const hydrationDaysHit = hydrationDaysHitArr.length;

  // ---- Total XP
  const totalXp = xpEvents.reduce((s, e) => s + (e.amount ?? 0), 0);

  // ---- Streaks
  const workoutDates = Array.from(new Set(workouts.map((w) => w.session_date))).sort();
  const checkinDates = Array.from(new Set(checkins.map((c) => c.date))).sort();
  const hydrationDates = hydrationDaysHitArr.map((h) => h.log_date).sort();
  const nutritionDates = Array.from(new Set(meals.map((m) => m.log_date))).sort();

  const streaks: Streaks = {
    workout: computeStreak(workoutDates),
    checkin: computeStreak(checkinDates),
    hydration: computeStreak(hydrationDates),
    nutrition: computeStreak(nutritionDates),
  };

  // ---- Fasting metrics (last 30 days)
  const isFastDone = (r: typeof fastingRows[number]) => {
    if (r.status === "completed") return true;
    if (!r.started_at || !r.ended_at) return false;
    const dur = (Date.parse(r.ended_at) - Date.parse(r.started_at)) / 60_000;
    return dur >= r.target_minutes * 0.8;
  };
  const fastingDoneDates = fastingRows.filter(isFastDone).map((r) => r.fasting_date).sort();

  // ---- GlowUp Score (0-100), 6 pillars now (workouts, check-ins, meals, hydration, progress tracking, fasting)
  const last30 = (() => {
    const arr: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      arr.push(tzDate(d));
    }
    return new Set(arr);
  })();

  const within30 = (dates: string[]) => dates.filter((d) => last30.has(d)).length;
  const workoutDays30 = within30(workoutDates);
  const checkinDays30 = within30(checkinDates);
  const mealDays30 = within30(nutritionDates);
  const hydrationDays30 = within30(hydrationDates);
  const progressDays30 = within30(
    measurements.map((m) => m.measurement_date).concat(photos.map((p) => p.photo_date)),
  );
  const fastingDays30 = within30(fastingDoneDates);

  // Score readiness: need at least ~7 days of any activity in last 30
  const totalActivityDays =
    workoutDays30 + checkinDays30 + mealDays30 + hydrationDays30 + progressDays30 + fastingDays30;
  const scoreReady = totalActivityDays >= 7;

  // 6 pillars × ~16.67pts each (clamped to 100)
  const P = 100 / 6;
  const score = scoreReady
    ? Math.min(100, Math.round(
        Math.min(P, (workoutDays30 / 17) * P) +
          Math.min(P, (checkinDays30 / 25) * P) +
          Math.min(P, (mealDays30 / 25) * P) +
          Math.min(P, (hydrationDays30 / 25) * P) +
          Math.min(P, (progressDays30 / 4) * P) +
          Math.min(P, (fastingDays30 / 15) * P),
      ))
    : 0;

  // ---- Fasting summary stats
  const fastingBestStreakInfo = computeStreak(fastingDoneDates);
  const fastingCompletedRows = fastingRows.filter(isFastDone);
  const last30Set = last30;
  const fastingLast30Rows = fastingCompletedRows.filter((r) => last30Set.has(r.fasting_date));
  let fastingAvgMin: number | null = null;
  if (fastingLast30Rows.length > 0) {
    const totalMin = fastingLast30Rows.reduce((s, r) => {
      if (r.started_at && r.ended_at) {
        return s + (Date.parse(r.ended_at) - Date.parse(r.started_at)) / 60_000;
      }
      return s;
    }, 0);
    fastingAvgMin = Math.round(totalMin / fastingLast30Rows.length);
  }
  const targetCounts = new Map<number, number>();
  for (const r of fastingRows.filter((rr) => last30Set.has(rr.fasting_date))) {
    targetCounts.set(r.target_minutes, (targetCounts.get(r.target_minutes) ?? 0) + 1);
  }
  let fastingMostUsedTarget: number | null = null;
  let mu = 0;
  for (const [t, c] of targetCounts.entries()) {
    if (c > mu) { mu = c; fastingMostUsedTarget = t; }
  }

  const summary: ProgressSummary = {
    weightChangeKg: weightChange,
    weightStartKg: weightStart,
    weightCurrentKg: weightCurrent,
    workoutCount: workouts.length,
    checkinCount: checkins.length,
    mealCount: meals.length,
    hydrationDaysHit,
    totalXp,
    glowupScore: score,
    scoreReady,
    fastingCompletedDaysLast30: fastingDays30,
    fastingBestStreak: fastingBestStreakInfo.best,
    fastingAverageDurationMin: fastingAvgMin,
    fastingMostUsedTargetMinutes: fastingMostUsedTarget,
  };

  // ---- Weekly timeline (last 12 weeks)
  const weekly = new Map<string, WeeklyPoint>();
  const ensureWeek = (iso: string): WeeklyPoint => {
    const wk = startOfWeek(iso);
    if (!weekly.has(wk)) {
      weekly.set(wk, {
        weekStart: wk,
        workouts: 0,
        checkins: 0,
        meals: 0,
        hydrationDaysHit: 0,
        xp: 0,
        photos: 0,
        weightUpdates: 0,
      });
    }
    return weekly.get(wk)!;
  };
  workouts.forEach((w) => ensureWeek(w.session_date).workouts++);
  checkins.forEach((c) => ensureWeek(c.date).checkins++);
  meals.forEach((m) => ensureWeek(m.log_date).meals++);
  hydrationDaysHitArr.forEach((h) => ensureWeek(h.log_date).hydrationDaysHit++);
  xpEvents.forEach((e) => (ensureWeek(e.event_date).xp += e.amount ?? 0));
  photos.forEach((p) => ensureWeek(p.photo_date).photos++);
  measurements.forEach((m) => ensureWeek(m.measurement_date).weightUpdates++);
  const weeklyTimeline = Array.from(weekly.values())
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
    .slice(0, 12);

  // ---- Achievements merged
  const unlockMap = new Map(unlocks.map((u) => [u.achievement_id, u.unlocked_at]));
  const achievements: AchievementRow[] = catalog.map((a) => ({
    id: a.id,
    code: a.code,
    title: a.title,
    description: a.description,
    icon: a.icon,
    category: a.category,
    xp_reward: a.xp_reward,
    unlocked_at: unlockMap.get(a.id) ?? null,
  }));

  // ---- Charts: weight + waist trend (last 12 entries)
  const weightTrend = weightSeries.slice(-12);
  const waistTrend = measurements
    .filter((m) => m.waist_cm != null)
    .map((m) => ({ date: m.measurement_date, cm: Number(m.waist_cm) }))
    .slice(-12);

  return {
    summary,
    level: levelFromXp(totalXp),
    streaks,
    weeklyTimeline,
    achievements,
    measurements,
    photos,
    weightTrend,
    waistTrend,
    sinceIso,
  };
}

// ============================================================
// MUTATIONS
// ============================================================
export async function uploadProgressPhoto(
  uid: string,
  fileUri: string,
  photoType: "front" | "side" | "back",
  photoDate: string = tzDate(),
) {
  const extMatch = fileUri.match(/\.(\w+)(?:\?.*)?$/);
  const ext = (extMatch?.[1] || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext) ? ext : "jpg";
  const path = `${uid}/${photoType}-${Date.now()}.${safeExt}`;

  const blob = await (await fetch(fileUri)).blob();
  const { error: upErr } = await supabase.storage
    .from("progress-photos")
    .upload(path, blob, { upsert: false, contentType: blob.type || "image/jpeg" });
  if (upErr) throw upErr;

  const { data: signed } = await supabase.storage
    .from("progress-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  const photoUrl = signed?.signedUrl ?? "";

  const { error: insErr } = await supabase
    .from("progress_photos" as any)
    .insert({
      user_id: uid,
      photo_type: photoType,
      photo_url: photoUrl,
      photo_path: path,
      photo_date: photoDate,
    });
  if (insErr) throw insErr;
}

export async function deleteProgressPhoto(
  id: string,
  path: string | null,
) {
  if (path) {
    await supabase.storage.from("progress-photos").remove([path]);
  }
  await supabase.from("progress_photos" as any).delete().eq("id", id);
}

export async function refreshSignedUrls(photos: PhotoRow[]): Promise<PhotoRow[]> {
  const paths = photos.map((p) => p.photo_path).filter((p): p is string => !!p);
  if (paths.length === 0) return photos;
  const { data } = await supabase.storage
    .from("progress-photos")
    .createSignedUrls(paths, 60 * 60);
  const map = new Map((data ?? []).map((s) => [s.path, s.signedUrl]));
  return photos.map((p) =>
    p.photo_path && map.get(p.photo_path)
      ? { ...p, photo_url: map.get(p.photo_path)! }
      : p,
  );
}

export async function saveMeasurement(
  uid: string,
  data: Partial<MeasurementRow> & { measurement_date: string },
) {
  const payload: any = { user_id: uid, ...data };
  delete payload.id;
  const { error } = await supabase.from("body_measurements" as any).insert(payload);
  if (error) throw error;
}

export async function deleteMeasurement(id: string) {
  await supabase.from("body_measurements" as any).delete().eq("id", id);
}

import type { AppState } from "./store";
import type { PersonalizationProfile } from "./personalization";
import { calculateNutritionPlan, type NutritionPlan } from "./nutrition";

export function todayKeyBR(d: Date = new Date()): string {
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
}

export function getDailyDerived(state: AppState, profile?: PersonalizationProfile | null, date = todayKeyBR()) {
  // Live plan (phase-aware). Falls back to snapshot fields if profile incomplete.
  const plan: NutritionPlan | null = calculateNutritionPlan(profile, { todayStr: date });
  const waterGoalMl =
    plan?.waterTarget ?? profile?.daily_water_target_ml ?? state.hydrationGoalMl ?? 2000;
  const waterMl = state.hydration[date] ?? 0;
  const meals = state.mealLogs.filter((l) => l.date === date);
  const nutritionTotals = meals.reduce((acc, l) => {
    acc.kcal += l.kcal ?? 0;
    acc.protein += l.protein ?? 0;
    acc.carbs += l.carbs ?? 0;
    acc.fats += l.fats ?? 0;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fats: 0 });
  const targetKcal = plan?.dailyCalories ?? profile?.daily_calorie_target ?? 1600;
  const targetProtein = plan?.protein ?? profile?.protein_target_g ?? 120;
  const targetCarbs = plan?.carbs ?? profile?.carb_target_g ?? 190;
  const targetFats = plan?.fats ?? profile?.fat_target_g ?? 55;
  const workoutDone =
    state.workoutLogs.some((w) => w.date === date) ||
    state.workoutSessionsV2.some((s) => !!s.endedAt && todayKeyBR(new Date(s.endedAt)) === date);
  const checkedIn =
    state.moodLogs.some((m) => m.date === date) ||
    state.energyLogs.some((e) => e.date === date) ||
    state.sleepLogs.some((s) => s.date === date) ||
    state.cycleLogs.some((c) => c.date === date && (!!c.mood || !!c.note || (c.symptoms?.length ?? 0) > 0));
  const symptomsLogged = state.cycleLogs.some((c) => c.date === date && (c.symptoms?.length ?? 0) > 0);
  const measurementLogged = state.measurementLogs.some((m) => m.date === date) || state.weightLogs.some((w) => w.date === date);
  const photoLogged = state.progressPhotos.some((p) => p.date === date);
  const pillarsDone = [waterMl >= waterGoalMl, meals.length > 0, workoutDone, checkedIn].filter(Boolean).length;

  return {
    date,
    hydration: {
      currentMl: waterMl,
      goalMl: waterGoalMl,
      progressPct: waterGoalMl > 0 ? Math.min(100, (waterMl / waterGoalMl) * 100) : 0,
      remainingMl: Math.max(0, waterGoalMl - waterMl),
      complete: waterMl >= waterGoalMl,
    },
    nutrition: {
      meals,
      mealCount: meals.length,
      totals: nutritionTotals,
      targets: { kcal: targetKcal, protein: targetProtein, carbs: targetCarbs, fats: targetFats },
      caloriesRemaining: Math.max(0, targetKcal - nutritionTotals.kcal),
      caloriesProgressPct: targetKcal > 0 ? Math.min(100, (nutritionTotals.kcal / targetKcal) * 100) : 0,
      plan, // full audit-ready plan (null when profile incomplete)
    },
    workout: { complete: workoutDone },
    checkin: { complete: checkedIn, symptomsLogged },
    progress: { measurementLogged, photoLogged },
    todayPlan: {
      pillarsDone,
      pillarsTotal: 4,
      completionPct: Math.round((pillarsDone / 4) * 100),
    },
  };
}
import {
  PersonalizationProfile,
  PersonalGoal,
  getCurrentCyclePhase,
  CyclePhase,
} from "./personalization";

/**
 * Glow Up Personalized Nutrition Engine
 * ------------------------------------
 * Single source of truth for kcal / macros / water.
 * Phase-aware, target-weight-aware, training-frequency-aware.
 *
 * Formula: Mifflin-St Jeor (women) → BMR
 *   BMR = 10·weightKg + 6.25·heightCm − 5·age − 161
 * TDEE = BMR × activityMultiplier
 * Final = TDEE + goalDelta, then × phaseFactor, +phase macro offsets.
 * Hydration = 35 ml/kg + phase bonus + training bonus.
 */

export interface NutritionPlanInputs {
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: string;
  activityMultiplier: number;
  goal: PersonalGoal;
  desiredWeightKg: number | null;
  workoutDaysPerWeek: number | null;
  cyclePhase: CyclePhase | null;
  cycleDay: number | null;
  pmsSymptomCount: number;
  proteinPerKg: number;
  fatPerKg: number;
}

export interface NutritionPlan {
  inputs: NutritionPlanInputs;
  formula: string;
  bmr: number;
  maintenance: number;          // TDEE
  goalAdjustmentKcal: number;   // delta vs maintenance (signed)
  baseCalories: number;         // after goal, before phase
  baseProtein: number;
  baseCarbs: number;
  baseFats: number;
  phaseFactor: number;          // 1.00 / 1.03 / 1.05 …
  phaseKcalAdjustment: number;  // delta applied on top of base
  phaseCarbsAddG: number;
  phaseFatsAddG: number;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fats: number;
  waterTarget: number;
  notes: string[];
  generatedAt: string;
  // Snapshot-friendly compatibility fields (kept for legacy callers)
  activityMultiplier: number;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

const DEFAULT_AGE = 28;

function parseAge(ageRange?: string | null): number {
  if (!ageRange) return DEFAULT_AGE;
  const m = String(ageRange).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : DEFAULT_AGE;
}

/** Goal → kcal delta vs maintenance + protein/fat g·kg defaults. */
function goalParams(
  goal: PersonalGoal,
  weightKg: number,
  maintenance: number,
  desiredWeightKg: number | null,
): { deltaKcal: number; proteinPerKg: number; fatPerKg: number; effectiveGoal: PersonalGoal; note?: string } {
  // If user set a target weight that essentially matches current → maintenance
  if (desiredWeightKg && Math.abs(desiredWeightKg - weightKg) < 1) {
    return { deltaKcal: 0, proteinPerKg: 1.8, fatPerKg: 0.8, effectiveGoal: "maintain", note: "Peso atual ≈ peso desejado → manutenção" };
  }

  switch (goal) {
    case "lose":
      // Safe pace: −500 kcal/day, never below maintenance × 0.80
      return {
        deltaKcal: -Math.min(500, Math.round(maintenance * 0.2)),
        proteinPerKg: 2.0,
        fatPerKg: 0.8,
        effectiveGoal: goal,
      };
    case "gain_muscle":
      // Surplus +250 kcal (range 200-300)
      return { deltaKcal: 250, proteinPerKg: 2.2, fatPerKg: 0.9, effectiveGoal: goal };
    case "energy":
      // Mild surplus for performance
      return { deltaKcal: 100, proteinPerKg: 1.8, fatPerKg: 0.9, effectiveGoal: goal };
    case "reduce_pms":
      // Slight surplus / better fats to support hormones
      return { deltaKcal: 50, proteinPerKg: 1.6, fatPerKg: 1.0, effectiveGoal: goal };
    case "hormonal_health":
      return { deltaKcal: 0, proteinPerKg: 1.8, fatPerKg: 1.0, effectiveGoal: goal };
    case "maintain":
    default:
      return { deltaKcal: 0, proteinPerKg: 1.6, fatPerKg: 0.8, effectiveGoal: "maintain" };
  }
}

/** Phase factor + macro offsets. Conservative model. */
function phaseAdjustment(
  phase: CyclePhase | null,
  pmsSymptomCount: number,
): { factor: number; carbsAddG: number; fatsAddG: number; note: string } {
  if (!phase) return { factor: 1.0, carbsAddG: 0, fatsAddG: 0, note: "Sem dados de ciclo — sem ajuste hormonal" };
  switch (phase) {
    case "menstrual": {
      // +0% baseline, +3% if user reports menstrual symptoms
      const factor = pmsSymptomCount > 0 ? 1.03 : 1.0;
      return {
        factor,
        carbsAddG: 0,
        fatsAddG: 0,
        note: factor > 1
          ? "Fase menstrual com sintomas → +3% kcal, reforço de ferro/magnésio"
          : "Fase menstrual → manter calorias, reforço de ferro/magnésio",
      };
    }
    case "follicular":
      return { factor: 1.0, carbsAddG: 0, fatsAddG: 0, note: "Folicular → foco em performance e aderência" };
    case "ovulation":
      return { factor: 1.0, carbsAddG: 0, fatsAddG: 0, note: "Ovulatória → reforço de proteína e hidratação" };
    case "luteal":
      return { factor: 1.05, carbsAddG: 10, fatsAddG: 5, note: "Lútea → +5% kcal, +10g carbo, +5g gordura boa" };
  }
}

/**
 * Diet preference adjustments — applied AFTER goal but BEFORE phase.
 * Modifies protein/fat per kg and macro distribution. Conservative model.
 */
function dietPreferenceAdjustment(
  dietPreference: string | null | undefined,
  proteinPerKg: number,
  fatPerKg: number,
): { proteinPerKg: number; fatPerKg: number; carbPctOverride: number | null; note: string | null } {
  switch ((dietPreference ?? "").toLowerCase()) {
    case "vegan":
      // Plant protein has lower bioavailability → +15% protein target
      return {
        proteinPerKg: +(proteinPerKg * 1.15).toFixed(2),
        fatPerKg,
        carbPctOverride: null,
        note: "Dieta vegana → proteína +15% (menor biodisponibilidade), priorize leguminosas + grãos",
      };
    case "vegetarian":
      // Slight protein bump (ovolactovegetarian)
      return {
        proteinPerKg: +(proteinPerKg * 1.08).toFixed(2),
        fatPerKg,
        carbPctOverride: null,
        note: "Dieta vegetariana → proteína +8%, combine ovos, laticínios e leguminosas",
      };
    case "lowcarb":
      // Cap carbs at ~25% of kcal, raise fat to ~1.0 g/kg
      return {
        proteinPerKg,
        fatPerKg: Math.max(fatPerKg, 1.0),
        carbPctOverride: 0.25,
        note: "Low carb → carboidratos limitados a ~25% das calorias, mais gorduras boas",
      };
    case "mediterranean":
      return {
        proteinPerKg,
        fatPerKg: Math.max(fatPerKg, 0.95),
        carbPctOverride: null,
        note: "Mediterrânea → azeite, peixes, oleaginosas; gorduras +",
      };
    case "omnivore":
    case "":
    case null:
    case undefined:
      return { proteinPerKg, fatPerKg, carbPctOverride: null, note: null };
    default:
      return { proteinPerKg, fatPerKg, carbPctOverride: null, note: null };
  }
}

/** Restriction-aware textual cues (recommendations layer). */
function restrictionNotes(restrictions: string[] | null | undefined): string[] {
  if (!restrictions?.length) return [];
  const out: string[] = [];
  const set = new Set(restrictions.map((r) => r.toLowerCase()));
  if (set.has("lactose") || set.has("sem lactose")) out.push("Sem lactose → reforce cálcio com folhas verdes, tofu, bebidas vegetais fortificadas");
  if (set.has("gluten") || set.has("sem glúten")) out.push("Sem glúten → priorize arroz, quinoa, batata-doce e aveia certificada");
  if (set.has("nuts")) out.push("Sem oleaginosas → use sementes (girassol, abóbora) e abacate como gorduras boas");
  if (set.has("seafood")) out.push("Sem frutos do mar → garanta ômega-3 via linhaça, chia ou suplemento");
  if (set.has("egg")) out.push("Sem ovo → reforce proteína com tofu, leguminosas, iogurte");
  return out;
}

export function calculateNutritionPlan(
  profile: PersonalizationProfile | null | undefined,
  opts: { todayStr?: string } = {},
): NutritionPlan | null {
  if (!profile) return null;
  const { weight_kg, height_cm, goal } = profile;
  if (!weight_kg || !height_cm || !goal) return null;

  const age = parseAge(profile.age_range);
  const activityLevel = profile.activity_level || "sedentary";
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;

  // 1. BMR — Mifflin-St Jeor (women)
  const bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;

  // 2. TDEE
  const maintenance = Math.round(bmr * activityMultiplier);

  // 3. Goal-adjusted base
  const desiredWeightKg = profile.desired_weight_kg ?? null;
  const goalP = goalParams(goal as PersonalGoal, weight_kg, maintenance, desiredWeightKg);
  let baseCalories = maintenance + goalP.deltaKcal;
  if (baseCalories < 1200) baseCalories = 1200; // safety floor
  baseCalories = Math.round(baseCalories);

  // Protein/fat boost if training frequently
  const workoutDays = profile.workout_days_per_week ?? null;
  const trainingBoost = (workoutDays && workoutDays >= 4) ? 0.2 : 0;
  let proteinPerKg = goalP.proteinPerKg + trainingBoost;
  let fatPerKg = goalP.fatPerKg;

  // 3b. Diet preference layer
  const dietAdj = dietPreferenceAdjustment(profile.diet_preference, proteinPerKg, fatPerKg);
  proteinPerKg = dietAdj.proteinPerKg;
  fatPerKg = dietAdj.fatPerKg;

  // 4. Base macros
  const baseProtein = Math.round(weight_kg * proteinPerKg);
  let baseFats = Math.max(50, Math.round(weight_kg * fatPerKg));
  let baseCarbs: number;
  if (dietAdj.carbPctOverride !== null) {
    // Low carb: carbs capped at N% of kcal, remaining kcal go to fat
    baseCarbs = Math.max(0, Math.round((baseCalories * dietAdj.carbPctOverride) / 4));
    const kcalFromCarbs = baseCarbs * 4;
    const kcalFromProtein = baseProtein * 4;
    const kcalForFat = Math.max(0, baseCalories - kcalFromCarbs - kcalFromProtein);
    baseFats = Math.max(baseFats, Math.round(kcalForFat / 9));
  } else {
    baseCarbs = Math.max(0, Math.round((baseCalories - baseProtein * 4 - baseFats * 9) / 4));
  }

  // 5. Phase adjustment
  const cycle = getCurrentCyclePhase(profile, opts.todayStr);
  const pmsSymptomCount = (profile.menstrual_symptoms?.length ?? 0) + (profile.pms_symptoms?.length ?? 0);
  const phaseAdj = phaseAdjustment(cycle?.phase ?? null, pmsSymptomCount);
  const phaseKcalAdjustment = Math.round(baseCalories * (phaseAdj.factor - 1));

  const dailyCalories = baseCalories + phaseKcalAdjustment;
  const protein = baseProtein; // protein not adjusted by phase
  const carbs = baseCarbs + phaseAdj.carbsAddG;
  const fats = baseFats + phaseAdj.fatsAddG;

  // 6. Hydration
  let waterTarget = Math.round(weight_kg * 35);
  if (cycle?.phase === "luteal") waterTarget += 500;
  if (workoutDays && workoutDays >= 5) waterTarget += 500;

  const notes: string[] = [];
  if (goalP.note) notes.push(goalP.note);
  notes.push(phaseAdj.note);
  if (trainingBoost > 0) notes.push(`Treino ${workoutDays}×/semana → proteína +${trainingBoost} g/kg`);
  if (dietAdj.note) notes.push(dietAdj.note);
  // Restrictions: combine dietary_restrictions + food_restrictions
  const allRestrictions = [
    ...(profile.dietary_restrictions ?? []),
    ...(profile.food_restrictions ?? []),
  ];
  notes.push(...restrictionNotes(allRestrictions));
  if (profile.food_avoids?.length) {
    notes.push(`Evita: ${profile.food_avoids.join(", ")}`);
  }

  return {
    inputs: {
      weightKg: weight_kg,
      heightCm: height_cm,
      age,
      activityLevel,
      activityMultiplier,
      goal: goalP.effectiveGoal,
      desiredWeightKg,
      workoutDaysPerWeek: workoutDays,
      cyclePhase: cycle?.phase ?? null,
      cycleDay: cycle?.cycleDay ?? null,
      pmsSymptomCount,
      proteinPerKg,
      fatPerKg,
    },
    formula: "Mifflin-St Jeor (women)",
    bmr: Math.round(bmr),
    maintenance,
    goalAdjustmentKcal: goalP.deltaKcal,
    baseCalories,
    baseProtein,
    baseCarbs,
    baseFats,
    phaseFactor: phaseAdj.factor,
    phaseKcalAdjustment,
    phaseCarbsAddG: phaseAdj.carbsAddG,
    phaseFatsAddG: phaseAdj.fatsAddG,
    dailyCalories,
    protein,
    carbs,
    fats,
    waterTarget,
    notes,
    generatedAt: new Date().toISOString(),
    activityMultiplier,
  };
}


/**
 * Snapshot fields to persist to user_personalization_profile.
 * Persists BASE values (pre-phase) so the saved targets stay stable
 * even as the user moves through her cycle; getDailyDerived layers
 * the phase adjustment on top each render.
 */
export function buildNutritionSnapshot(plan: NutritionPlan, profile: PersonalizationProfile) {
  return {
    daily_calorie_target: plan.baseCalories,
    protein_target_g: plan.baseProtein,
    carb_target_g: plan.baseCarbs,
    fat_target_g: plan.baseFats,
    maintenance_calories: plan.maintenance,
    bmr: plan.bmr,
    activity_multiplier: plan.activityMultiplier,
    daily_water_target_ml: plan.waterTarget,
    last_nutrition_calculation_at: plan.generatedAt,
    calculation_weight_kg: profile.weight_kg ?? null,
    calculation_height_cm: profile.height_cm ?? null,
    calculation_age: plan.inputs.age,
    calculation_goal: plan.inputs.goal,
    calculation_activity_level: plan.inputs.activityLevel,
  };
}

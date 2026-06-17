// Pure personalization logic — safe for client + server.
// Computes the user's current cycle phase and returns recommendations
// tailored by goal × phase × symptoms.

export type PersonalGoal =
  | "lose"
  | "gain_muscle"
  | "maintain"
  | "hormonal_health"
  | "energy"
  | "reduce_pms";

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

export interface PersonalizationProfile {
  goal?: PersonalGoal | null;
  age_range?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  workout_experience?: string | null;
  workout_place?: string | null;
  workout_minutes?: number | null;
  intensity_preference?: string | null;
  menstruates?: boolean | null;
  birth_control?: string | null;
  last_period_date?: string | null;
  cycle_length?: number | null;
  period_length?: number | null;
  cycle_regularity?: string | null;
  pms_symptoms?: string[] | null;
  ovulation_symptoms?: string[] | null;
  menstrual_symptoms?: string[] | null;
  pcos?: boolean | null;
  endometriosis?: boolean | null;
  adenomyosis?: boolean | null;
  fibroids?: boolean | null;
  trying_to_conceive?: boolean | null;
  recent_pregnancy?: boolean | null;
  food_likes?: string[] | null;
  food_avoids?: string[] | null;
  dietary_restrictions?: string[] | null;
  food_restrictions?: string[] | null;
  diet_preference?: string | null;
  meals_per_day?: number | null;
  desired_weight_kg?: number | null;
  motivation_reason?: string | null;
  workout_days_per_week?: number | null;
  // Nutrition fields
  daily_calorie_target?: number | null;
  protein_target_g?: number | null;
  carb_target_g?: number | null;
  fat_target_g?: number | null;
  maintenance_calories?: number | null;
  bmr?: number | null;
  activity_multiplier?: number | null;
  daily_water_target_ml?: number | null;
  water_consumed_ml?: number | null;
  nutrition_score?: number | null;
  energy_level?: number | null;
  hunger_level?: number | null;
  mood_score?: number | null;
}

export const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: "Menstrual",
  follicular: "Folicular",
  ovulation: "Ovulação",
  luteal: "Lútea",
};

export const PHASE_EMOJI: Record<CyclePhase, string> = {
  menstrual: "",
  follicular: "",
  ovulation: "",
  luteal: "",
};

// NOTE: All cycle math (cycle day, phase, fertile window, ovulation, next
// period) is owned by `cycle-engine.ts` — the single source of truth.
// `getCurrentCyclePhase` is now a thin adapter so legacy consumers keep
// working without duplicating the math. New code should import
// `buildCycleSnapshot` from `./cycle-engine` directly.
import { buildCycleSnapshot, todayKey } from "./cycle-engine";

/** Thin adapter over `buildCycleSnapshot` — kept for backward compatibility. */
export function getCurrentCyclePhase(
  profile: PersonalizationProfile,
  todayStr: string = todayKey(),
): { phase: CyclePhase; cycleDay: number; cycleLength: number; periodLength: number } | null {
  if (!profile.last_period_date) return null;
  const snap = buildCycleSnapshot(
    {
      last_period_date: profile.last_period_date,
      cycle_length: profile.cycle_length ?? null,
      period_length: profile.period_length ?? null,
    },
    todayStr,
  );
  return {
    phase: snap.phase,
    cycleDay: snap.cycleDay,
    cycleLength: snap.cycleLength,
    periodLength: snap.periodLength,
  };
}

export interface PersonalizedRecommendations {
  phase: CyclePhase | null;
  phaseLabel: string;
  goal: PersonalGoal;
  goalLabel: string;
  homeMessage: string;
  workoutFocus: string;
  workoutIntensity: "leve" | "moderada" | "alta";
  nutritionFocus: string;
  hormoneAlert: string;
  selfCareTip: string;
  fastingAdvice: string;
}

const GOAL_LABEL: Record<PersonalGoal, string> = {
  lose: "Emagrecer",
  gain_muscle: "Ganhar massa",
  maintain: "Manter peso",
  hormonal_health: "Saúde hormonal",
  energy: "Mais energia",
  reduce_pms: "Reduzir TPM",
};

/** Recommendation matrix (goal × phase). */
export function getPersonalizedRecommendations(
  profile: PersonalizationProfile | null,
  todayStr: string = todayKey(),
): PersonalizedRecommendations {
  const goal: PersonalGoal = (profile?.goal as PersonalGoal) || "hormonal_health";
  const cycle = profile ? getCurrentCyclePhase(profile, todayStr) : null;
  const phase = cycle?.phase ?? null;

  // Defaults
  let homeMessage = "Pequenos rituais hoje constroem grandes transformações";
  let workoutFocus = "Movimento consistente e prazeroso";
  let workoutIntensity: "leve" | "moderada" | "alta" = "moderada";
  let nutritionFocus = "Refeições equilibradas e bem distribuídas no dia";
  let hormoneAlert = "Acompanhe como você se sente hoje";
  let selfCareTip = "Tome água e respire fundo 3 vezes";
  let fastingAdvice = "Mantenha sua janela usual com gentileza";

  // Phase-based defaults
  if (phase === "menstrual") {
    workoutIntensity = "leve";
    workoutFocus = "Alongamento, yoga ou caminhada leve";
    nutritionFocus = "Ferro (folhas escuras, feijão), magnésio e hidratação";
    hormoneAlert = "Fase menstrual — acolha seu corpo, evite cobrança";
    selfCareTip = "Bolsa térmica, chá quente e descanso valem ouro hoje";
    fastingAdvice = "Suavize o jejum hoje — coma quando sentir fome";
    homeMessage = "Hoje é dia de acolher Vá no seu ritmo, sem pressa";
  } else if (phase === "follicular") {
    workoutIntensity = "moderada";
    workoutFocus = "Aumente progressão — força e cardio respondem bem";
    nutritionFocus = "Proteína magra, vegetais coloridos, carbo complexo";
    hormoneAlert = "Energia em alta — bom momento para criar rotina";
    selfCareTip = "Organize a semana, faça algo novo, sorria mais";
    fastingAdvice = "Boa fase para sustentar 14–16h se faz parte da rotina";
    homeMessage = "Energia retomando ótimo dia para começar algo novo";
  } else if (phase === "ovulation") {
    workoutIntensity = "alta";
    workoutFocus = "Glúteos, pernas, força — performance no auge";
    nutritionFocus = "Anti-inflamatórios (azeite, peixes), antioxidantes, água";
    hormoneAlert = "Pico de energia e libido aproveite";
    selfCareTip = "Conecte com quem te faz bem — você está irradiando";
    fastingAdvice = "Janela longa funciona bem — escute a fome real";
    homeMessage = "Você está brilhando é o seu pico do mês";
  } else if (phase === "luteal") {
    workoutIntensity = "moderada";
    workoutFocus = "Força com menos volume; pilates e mobilidade";
    nutritionFocus = "Magnésio, fibras, triptofano (banana, aveia) e menos açúcar";
    hormoneAlert = "Fase lútea — TPM pode aparecer, normal sentir mais fome";
    selfCareTip = "Sono cedo, telas longe à noite, banho quente";
    fastingAdvice = "Encurte o jejum se sentir compulsão — não force";
    homeMessage = "Fase de autocuidado ouça seu corpo com gentileza";
  }

  // Goal overrides / layered messaging
  if (goal === "lose") {
    homeMessage =
      phase === "menstrual"
        ? "Foco em hidratação e refeições leves hoje"
        : phase === "ovulation"
        ? "Pico ideal para queimar — capriche no treino"
        : "Foco em queima, energia e controle de fome hoje";
    nutritionFocus =
      phase === "luteal"
        ? "Controle de compulsão: proteína + fibras a cada refeição"
        : "Déficit leve com saciedade: proteína, fibras e água";
    workoutFocus =
      phase === "menstrual" ? "Caminhada longa, mobilidade" :
      phase === "luteal" ? "Cardio leve + força funcional" :
      "Cardio + força (HIIT em fases de energia alta)";
  } else if (goal === "gain_muscle") {
    homeMessage =
      phase === "menstrual"
        ? "Hoje é base — proteína em cada refeição"
        : "Foco em glúteos, força e construção muscular hoje";
    nutritionFocus = "Proteína (1.6–2 g/kg), carbo pré-treino, refeições completas";
    workoutFocus =
      phase === "menstrual" ? "Treino leve mantendo padrão, sem PR" :
      phase === "ovulation" || phase === "follicular" ? "Hipertrofia pesada — busque progressão" :
      "Hipertrofia moderada, mais volume e menos carga";
  } else if (goal === "reduce_pms") {
    nutritionFocus = "Magnésio, ômega-3, cálcio, menos cafeína e ultraprocessados";
    selfCareTip = "Sono regular, sol pela manhã, respiração 4-7-8";
  } else if (goal === "hormonal_health") {
    nutritionFocus = "Comida real, gorduras boas, fibras e proteína variada";
  } else if (goal === "energy") {
    nutritionFocus = "Café da manhã com proteína, sol pela manhã, hidratação";
  }

  // Diagnostic overrides
  if (profile?.pcos) {
    nutritionFocus = "Foco SOP: baixo índice glicêmico, proteína em todas refeições";
    hormoneAlert = "Perfil SOP — priorize sono, força e controle glicêmico";
  }
  if (profile?.endometriosis && phase === "menstrual") {
    workoutFocus = "Movimento muito leve, calor local, evite alta intensidade";
    selfCareTip = "Bolsa térmica + chá de gengibre podem reduzir cólicas";
  }

  return {
    phase,
    phaseLabel: phase ? PHASE_LABEL[phase] : "—",
    goal,
    goalLabel: GOAL_LABEL[goal],
    homeMessage,
    workoutFocus,
    workoutIntensity,
    nutritionFocus,
    hormoneAlert,
    selfCareTip,
    fastingAdvice,
  };
}

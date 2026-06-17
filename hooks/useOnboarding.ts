import { useState, useMemo, useEffect } from "react";
import { useStore, type Profile } from "@/lib/store";
import { useApiClient } from "@/lib/api-client";
import { setCachedPersonalization } from "./use-personalization";
import { generateMissions, generateWeeklyPlan, hydrationGoalFor } from "@/lib/missions";
import { calculateNutritionPlan, buildNutritionSnapshot } from "@/lib/nutrition";
import { supabase } from "@/supabase/client";
import { useAppNavigation } from "./useAppNavigation";

export type StepKey =
  | "name" | "goal" | "ageRange" | "heightCm" | "weightKg"
  | "desiredWeightKg" | "dailyWaterMl"
  | "level" | "place" | "minutesPerSession" | "workoutDaysPerWeek"
  | "activityLevel" | "dietPreference" | "foodRestrictions"
  | "diagnoses" | "cycleAnswer" | "birthControl" | "lastPeriodDate"
  | "periodLength" | "cycleLength" | "cycleRegularity" | "pmsSymptoms"
  | "ovulationSymptoms" | "menstrualSymptoms" | "tryingToConceive"
  | "recentPregnancy" | "pregnancyStatus" | "pregnancyWeek" | "estimatedDueDate"
  | "sleepQuality" | "stressLevel" | "dailyRoutine" | "mainDifficulty" | "motivationReason" | "age";

export type StepDefinition = {
  section: string;
  key: StepKey;
  title: string;
  type: "text" | "number" | "choice" | "multi" | "date";
  options?: { v: string; label: string }[];
  placeholder?: string;
  suffix?: string;
};

// EXPORTING THE EXACT STEPS FROM WEB
export const ONBOARDING_STEPS: StepDefinition[] = [
  { section: "Básico", key: "name", title: "Como quer ser chamada?", type: "text", placeholder: "Seu nome ou apelido" },
  { section: "Básico", key: "ageRange", title: "Qual a sua faixa etária?", type: "choice", options: [
    { v: "under_20", label: "Menos de 20 anos" },
    { v: "20_29", label: "20 a 29 anos" },
    { v: "30_39", label: "30 a 39 anos" },
    { v: "40_49", label: "40 a 49 anos" },
    { v: "50_plus", label: "50 anos ou mais" },
  ]},
  { section: "Corpo", key: "heightCm", title: "Qual a sua altura?", type: "number", suffix: "cm" },
  { section: "Corpo", key: "weightKg", title: "Qual o seu peso atual?", type: "number", suffix: "kg" },
  { section: "Corpo", key: "desiredWeightKg", title: "Qual o seu peso ideal/meta?", type: "number", suffix: "kg" },
  { section: "Objetivo", key: "goal", title: "Qual o seu principal objetivo?", type: "choice", options: [
    { v: "lose", label: "Perder gordura" },
    { v: "gain", label: "Ganhar massa magra" },
    { v: "maintain", label: "Manter peso e tonificar" },
    { v: "health", label: "Saúde hormonal e bem-estar" },
    { v: "bloat", label: "Reduzir inchaço e TPM" },
    { v: "routine", label: "Ter mais energia no dia a dia" },
  ]},
  { section: "Treino", key: "level", title: "Qual seu nível de experiência com treinos?", type: "choice", options: [
    { v: "beginner", label: "Iniciante" },
    { v: "intermediate", label: "Intermediária" },
    { v: "advanced", label: "Avançada" },
  ]},
  { section: "Treino", key: "place", title: "Onde você prefere treinar?", type: "choice", options: [
    { v: "home", label: "Em casa" },
    { v: "gym", label: "Na academia" },
    { v: "both", label: "Ambos (Híbrido)" },
  ]},
  { section: "Treino", key: "workoutDaysPerWeek", title: "Quantos dias por semana você quer treinar?", type: "number", suffix: "dias" },
  { section: "Treino", key: "minutesPerSession", title: "Quanto tempo tem para treinar por dia?", type: "number", suffix: "minutos" },
  { section: "Estilo de Vida", key: "activityLevel", title: "Fora os treinos, como é o seu dia?", type: "choice", options: [
    { v: "sedentary", label: "Sedentária (fico muito sentada)" },
    { v: "light", label: "Leve (caminho um pouco)" },
    { v: "moderate", label: "Moderado (movimento constante)" },
    { v: "active", label: "Ativa (trabalho físico)" },
  ]},
  { section: "Alimentação", key: "dietPreference", title: "Tem alguma preferência alimentar?", type: "choice", options: [
    { v: "none", label: "Sem preferência (como de tudo)" },
    { v: "vegetarian", label: "Vegetariana" },
    { v: "vegan", label: "Vegana" },
    { v: "lowcarb", label: "Low Carb" },
  ]},
  { section: "Alimentação", key: "foodRestrictions", title: "Alguma restrição alimentar?", type: "multi", options: [
    { v: "lactose", label: "Intolerância à Lactose" },
    { v: "gluten", label: "Sensibilidade ao Glúten" },
    { v: "nuts", label: "Alergia a Castanhas" },
    { v: "seafood", label: "Alergia a Frutos do Mar" },
  ]},
  { section: "Alimentação", key: "dailyWaterMl", title: "Quantos ml de água você costuma beber por dia?", type: "number", suffix: "ml" },
  { section: "Saúde", key: "diagnoses", title: "Você tem algum destes diagnósticos?", type: "multi", options: [
    { v: "pcos", label: "SOP (Síndrome do Ovário Policístico)" },
    { v: "endometriosis", label: "Endometriose" },
    { v: "adenomyosis", label: "Adenomiose" },
    { v: "fibroids", label: "Miomas" },
  ]},
  { section: "Ciclo", key: "cycleAnswer", title: "Você menstrua?", type: "choice", options: [
    { v: "yes", label: "Sim, menstruo" },
    { v: "no", label: "Não" },
    { v: "irregular", label: "Sim, mas é muito irregular" },
  ]},
  { section: "Ciclo", key: "birthControl", title: "Usa algum método contraceptivo?", type: "choice", options: [
    { v: "none", label: "Nenhum" },
    { v: "pill", label: "Pílula Anticoncepcional" },
    { v: "iud_copper", label: "DIU de Cobre/Prata" },
    { v: "iud_hormonal", label: "DIU Hormonal (Mirena/Kyleena)" },
    { v: "implant", label: "Implante" },
    { v: "injection", label: "Injeção" },
    { v: "ring", label: "Anel Vaginal" },
  ]},
  { section: "Ciclo", key: "lastPeriodDate", title: "Quando foi o primeiro dia da sua última menstruação?", type: "date" },
  { section: "Ciclo", key: "periodLength", title: "Quantos dias dura sua menstruação (em média)?", type: "number", suffix: "dias" },
  { section: "Ciclo", key: "cycleLength", title: "Qual o tamanho do seu ciclo (em média)?", type: "number", suffix: "dias" },
  { section: "Ciclo", key: "cycleRegularity", title: "Seu ciclo é regular?", type: "choice", options: [
    { v: "regular", label: "Sim, regular" },
    { v: "somewhat_irregular", label: "Varia de 2 a 4 dias" },
    { v: "irregular", label: "Totalmente irregular" },
  ]},
  { section: "Sintomas", key: "pmsSymptoms", title: "Quais sintomas você costuma ter na TPM?", type: "multi", options: [
    { v: "cramps", label: "Cólicas" },
    { v: "bloating", label: "Inchaço" },
    { v: "mood_swings", label: "Oscilações de Humor" },
    { v: "fatigue", label: "Cansaço excessivo" },
    { v: "cravings", label: "Desejo por doces" },
    { v: "acne", label: "Acne" },
    { v: "headache", label: "Dor de cabeça" },
    { v: "breast_tenderness", label: "Sensibilidade nas mamas" },
  ]},
  { section: "Sintomas", key: "ovulationSymptoms", title: "Quais sintomas você nota na ovulação?", type: "multi", options: [
    { v: "pain", label: "Dor de meio de ciclo (Mittelschmerz)" },
    { v: "bloating", label: "Inchaço" },
    { v: "energy_surge", label: "Pico de energia" },
    { v: "increased_libido", label: "Aumento da libido" },
  ]},
  { section: "Sintomas", key: "menstrualSymptoms", title: "E durante a menstruação?", type: "multi", options: [
    { v: "heavy_cramps", label: "Cólicas fortes" },
    { v: "heavy_flow", label: "Fluxo intenso" },
    { v: "fatigue", label: "Cansaço profundo" },
    { v: "digestive_issues", label: "Alterações intestinais" },
  ]},
  { section: "Maternidade", key: "tryingToConceive", title: "Você está tentando engravidar?", type: "choice", options: [
    { v: "yes", label: "Sim" },
    { v: "no", label: "Não" },
  ]},
  { section: "Maternidade", key: "recentPregnancy", title: "Você teve uma gravidez recentemente?", type: "choice", options: [
    { v: "yes", label: "Sim (pós-parto)" },
    { v: "no", label: "Não" },
  ]},
  { section: "Gravidez", key: "pregnancyStatus", title: "Em que momento da gravidez você está?", type: "choice", options: [
    { v: "first_trimester", label: "1º Trimestre (1-13 semanas)" },
    { v: "second_trimester", label: "2º Trimestre (14-27 semanas)" },
    { v: "third_trimester", label: "3º Trimestre (28-40+ semanas)" },
  ]},
  { section: "Gravidez", key: "pregnancyWeek", title: "De quantas semanas você está?", type: "number", suffix: "semanas" },
  { section: "Gravidez", key: "estimatedDueDate", title: "Qual a Data Provável do Parto (DPP)?", type: "date" },
  { section: "Desafios", key: "mainDifficulty", title: "Qual sua maior dificuldade hoje?", type: "choice", options: [
    { v: "consistency", label: "Manter a constância" },
    { v: "time", label: "Falta de tempo" },
    { v: "motivation", label: "Falta de motivação" },
    { v: "knowledge", label: "Não sei por onde começar" },
    { v: "diet", label: "Seguir a dieta" },
    { v: "pms", label: "A TPM destrói meu progresso" },
  ]},
  { section: "Bem-estar", key: "sleepQuality", title: "Como é a qualidade do seu sono?", type: "choice", options: [
    { v: "good", label: "Durmo bem e acordo descansada" },
    { v: "average", label: "Razoável, acordo algumas vezes" },
    { v: "poor", label: "Péssima, acordo cansada" },
    { v: "insomnia", label: "Tenho insônia frequente" },
  ]},
  { section: "Bem-estar", key: "stressLevel", title: "Seu nível de estresse atual:", type: "choice", options: [
    { v: "low", label: "Baixo" }, { v: "moderate", label: "Moderado" }, { v: "high", label: "Alto" }, { v: "very_high", label: "Muito alto" },
  ]},
  { section: "Bem-estar", key: "dailyRoutine", title: "Como é sua rotina diária?", type: "choice", options: [
    { v: "sedentary", label: "Sedentária" },
    { v: "office", label: "Trabalho de escritório" },
    { v: "active", label: "Bastante ativa" },
    { v: "mom", label: "Cuido de filhos pequenos" },
    { v: "student", label: "Estudante" },
  ]},
  { section: "Bem-estar", key: "motivationReason", title: "O que mais te motiva agora?", type: "choice", options: [
    { v: "selflove", label: "Me sentir bem comigo" },
    { v: "health", label: "Cuidar da saúde" },
    { v: "energy", label: "Ter mais energia" },
    { v: "confidence", label: "Recuperar a autoestima" },
    { v: "event", label: "Um evento próximo" },
    { v: "longevity", label: "Viver mais e melhor" },
  ]},
];

const CYCLE_KEYS: StepKey[] = [
  "birthControl", "lastPeriodDate", "periodLength", "cycleLength",
  "cycleRegularity", "pmsSymptoms", "ovulationSymptoms", "menstrualSymptoms",
];

const PREGNANCY_KEYS: StepKey[] = ["pregnancyStatus", "pregnancyWeek", "estimatedDueDate"];

export type AnswerMap = Partial<Record<StepKey, any>>;

export function useOnboarding() {
  const { state, dispatch } = useStore();
  const api = useApiClient();
  const nav = useAppNavigation();

  const [i, setI] = useState(0);
  const [data, setData] = useState<AnswerMap>(() => ({
    name: state.profile?.name,
  }));
  const [value, setValue] = useState<any>("");

  // Skip cycle/pregnancy sections based on user answers
  const visibleSteps = useMemo(() => {
    let list = ONBOARDING_STEPS;
    if (data.cycleAnswer && data.cycleAnswer !== "yes") {
      list = list.filter((s) => !CYCLE_KEYS.includes(s.key));
    }
    const showPregnancy =
      data.tryingToConceive === "yes" ||
      data.recentPregnancy === "yes" ||
      data.goal === "health";
    if (!showPregnancy) {
      list = list.filter((s) => !PREGNANCY_KEYS.includes(s.key));
    }
    return list;
  }, [data.cycleAnswer, data.tryingToConceive, data.recentPregnancy, data.goal]);

  useEffect(() => {
    const step = visibleSteps[i];
    if (!step) return;
    const v = data[step.key];
    if (step.type === "multi") setValue(Array.isArray(v) ? v : []);
    else setValue(v ?? "");
  }, [i, visibleSteps]);

  const step = visibleSteps[i];
  const progress = ((i + 1) / visibleSteps.length) * 100;

  const persistPersonalization = async (answers: AnswerMap) => {
    const goalMap: Record<string, string> = {
      lose: "lose", gain: "gain_muscle", maintain: "maintain", health: "hormonal_health",
      bloat: "reduce_pms", routine: "energy",
    };
    const diagnoses: string[] = Array.isArray(answers.diagnoses) ? answers.diagnoses : [];
    const payload: any = {
      goal: answers.goal ? goalMap[answers.goal as string] : null,
      age_range: (answers.ageRange as string) ?? null,
      height_cm: answers.heightCm ? Number(answers.heightCm) : null,
      weight_kg: answers.weightKg ? Number(answers.weightKg) : null,
      workout_place: (answers.place as string) ?? null,
      workout_experience: (answers.level as string) ?? null,
      workout_minutes: answers.minutesPerSession ? Number(answers.minutesPerSession) : null,
      activity_level: (answers.activityLevel as string) ?? null,
      menstruates: answers.cycleAnswer ? answers.cycleAnswer === "yes" : null,
      birth_control: (answers.birthControl as string) ?? null,
      last_period_date: (answers.lastPeriodDate as string) || null,
      cycle_length: answers.cycleLength ? Number(answers.cycleLength) || null : null,
      period_length: answers.periodLength ? Number(answers.periodLength) || null : null,
      cycle_regularity: (answers.cycleRegularity as string) ?? null,
      pms_symptoms: Array.isArray(answers.pmsSymptoms) ? answers.pmsSymptoms : [],
      ovulation_symptoms: Array.isArray(answers.ovulationSymptoms) ? answers.ovulationSymptoms : [],
      menstrual_symptoms: Array.isArray(answers.menstrualSymptoms) ? answers.menstrualSymptoms : [],
      pcos: diagnoses.includes("pcos"),
      endometriosis: diagnoses.includes("endometriosis"),
      adenomyosis: diagnoses.includes("adenomyosis"),
      fibroids: diagnoses.includes("fibroids"),
      trying_to_conceive: answers.tryingToConceive === "yes",
      recent_pregnancy: answers.recentPregnancy === "yes",
      main_goal: (answers.goal as string) ?? null,
      fitness_level: (answers.level as string) ?? null,
      workout_location: (answers.place as string) ?? null,
      workout_days_per_week: answers.workoutDaysPerWeek ? Number(answers.workoutDaysPerWeek) : null,
      diet_preference: (answers.dietPreference as string) ?? null,
      food_restrictions: Array.isArray(answers.foodRestrictions) ? answers.foodRestrictions : [],
      cycle_regular: answers.cycleRegularity ? answers.cycleRegularity === "regular" : null,
      average_cycle_length: answers.cycleLength ? Number(answers.cycleLength) || null : null,
      average_period_length: answers.periodLength ? Number(answers.periodLength) || null : null,
      pregnancy_status: (answers.pregnancyStatus as string) ?? null,
      pregnancy_week: answers.pregnancyWeek ? Number(answers.pregnancyWeek) : null,
      estimated_due_date: (answers.estimatedDueDate as string) || null,
      sleep_quality: (answers.sleepQuality as string) ?? null,
      stress_level: (answers.stressLevel as string) ?? null,
      daily_routine: (answers.dailyRoutine as string) ?? null,
      main_difficulty: (answers.mainDifficulty as string) ?? null,
      motivation_reason: (answers.motivationReason as string) ?? null,
      desired_weight_kg: answers.desiredWeightKg ? Number(answers.desiredWeightKg) : null,
      daily_water_intake_ml: answers.dailyWaterMl ? Number(answers.dailyWaterMl) : null,
    };

    const nutrition = calculateNutritionPlan(payload as any);
    if (nutrition) {
      Object.assign(payload, buildNutritionSnapshot(nutrition, payload as any));
    }

    try {
      const saved = await api.saveProfile({ data: payload });
      setCachedPersonalization((saved as any) ?? null);
    } catch (err) {
      console.error("[onboarding] failed to save personalization", err);
    }
  };

  const next = () => {
    let v: any = value;
    if (step.type === "number") v = Number(value) || undefined;
    if (step.type === "date" && !v) v = undefined;
    if (step.type === "multi" && Array.isArray(v) && v.length === 0) v = undefined;
    const updated: AnswerMap = { ...data, [step.key]: v };
    if (step.key === "cycleAnswer") (updated as any).trackCycle = v === "yes";
    setData(updated);

    if (i === visibleSteps.length - 1) {
      const full: Profile = {
        name: (updated.name as string) || state.profile?.name || "Você",
        email: state.profile?.email || "",
        age: typeof updated.age === "number" ? updated.age : undefined,
        heightCm: updated.heightCm as number | undefined,
        weightKg: updated.weightKg as number | undefined,
        goal: updated.goal as any,
        place: updated.place as any,
        level: updated.level as any,
        minutesPerSession: updated.minutesPerSession as number | undefined,
        cycleAnswer: updated.cycleAnswer as any,
        trackCycle: updated.cycleAnswer === "yes",
        lastPeriodDate: updated.lastPeriodDate as string | undefined,
        periodLength: typeof updated.periodLength === "number" && updated.periodLength > 0 ? updated.periodLength : undefined,
        cycleLength: typeof updated.cycleLength === "number" && updated.cycleLength > 0 ? updated.cycleLength : undefined,
        pmsSymptoms: updated.pmsSymptoms as string[] | undefined,
      };
      const goalMl = hydrationGoalFor(full);
      const missions = generateMissions(full);
      const plan = generateWeeklyPlan(full);
      dispatch({ type: "COMPLETE_ONBOARDING", profile: full, hydrationGoalMl: goalMl, missions, weeklyPlan: plan });
      void persistPersonalization(updated);

      void (async () => {
        try {
          const { data: auth } = await supabase.auth.getUser();
          const uid = auth?.user?.id;
          if (!uid) return;
          await Promise.all([
            supabase.from("user_onboarding_status").upsert(
              { user_id: uid, completed: true, completed_at: new Date().toISOString(), current_step: visibleSteps.length },
              { onConflict: "user_id" },
            ),
            supabase.from("user_tours").upsert(
              { user_id: uid, completed: false, skipped: false, completed_at: null },
              { onConflict: "user_id", ignoreDuplicates: true },
            ),
          ]);
        } catch (err) {
          console.error("[onboarding] failed to mark status", err);
        }
      })();
      nav.goToHome();
      return;
    }
    setI(i + 1);
  };

  const prev = () => {
    if (i > 0) setI(i - 1);
  };

  const toggleMulti = (v: string) => {
    const arr = Array.isArray(value) ? value : [];
    setValue(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const selectChoice = (v: string) => {
    setValue(v);
  };

  return {
    state: {
      i,
      step,
      progress,
      value,
      visibleSteps,
      isHydrated: state.bootHydrated,
      totalSteps: visibleSteps.length
    },
    actions: {
      setValue,
      next,
      prev,
      toggleMulti,
      selectChoice
    }
  };
}

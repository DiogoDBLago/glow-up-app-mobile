import { supabase } from "@/supabase/client";
import { getGlowUpUserContext, type GlowUpUserContext } from "@/lib/glowup-intelligence";
import { getDailyMissions, todayKey } from "@/lib/missions-engine";

export type ReminderCategory =
  | "hydration" | "workout" | "meal" | "cycle"
  | "missions" | "progress" | "pregnancy" | "general";

export type ReminderPriority = "low" | "normal" | "high";
export type ReminderStatus = "pending" | "seen" | "dismissed";

export interface SmartReminder {
  reminder_key: string;
  title: string;
  message: string;
  category: ReminderCategory;
  priority: ReminderPriority;
  status: ReminderStatus;
  cta_label?: string;
  cta_to?: string;
  icon?: string;
}

export interface ReminderPreferences {
  hydration_enabled: boolean;
  workout_enabled: boolean;
  meal_enabled: boolean;
  cycle_enabled: boolean;
  missions_enabled: boolean;
  progress_enabled: boolean;
  pregnancy_enabled: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
}

const DEFAULT_PREFS: ReminderPreferences = {
  hydration_enabled: true,
  workout_enabled: true,
  meal_enabled: true,
  cycle_enabled: true,
  missions_enabled: true,
  progress_enabled: true,
  pregnancy_enabled: true,
  quiet_hours_start: 22,
  quiet_hours_end: 7,
};

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getReminderPreferences(): Promise<ReminderPreferences> {
  const userId = await uid();
  if (!userId) return DEFAULT_PREFS;
  const { data } = await supabase
    .from("user_reminder_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return DEFAULT_PREFS;
  return {
    hydration_enabled: data.hydration_enabled,
    workout_enabled: data.workout_enabled,
    meal_enabled: data.meal_enabled,
    cycle_enabled: data.cycle_enabled,
    missions_enabled: data.missions_enabled,
    progress_enabled: data.progress_enabled,
    pregnancy_enabled: data.pregnancy_enabled,
    quiet_hours_start: data.quiet_hours_start,
    quiet_hours_end: data.quiet_hours_end,
  };
}

export async function saveReminderPreferences(prefs: Partial<ReminderPreferences>): Promise<void> {
  const userId = await uid();
  if (!userId) return;
  await supabase
    .from("user_reminder_preferences")
    .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });
}

// ──────────────────────────────────────────────────────────────────────
// Rule helpers
// ──────────────────────────────────────────────────────────────────────

export function getHydrationReminder(intel: GlowUpUserContext, hydrationMl: number, goalMl: number): SmartReminder | null {
  if (!goalMl) return null;
  const ratio = hydrationMl / goalMl;
  if (ratio >= 1) return null;
  const phaseBoost = intel.cycle.phase === "luteal" || intel.cycle.phase === "menstrual";
  const priority: ReminderPriority = ratio < 0.3 ? "high" : phaseBoost ? "normal" : "low";
  return {
    reminder_key: "hydration_low",
    title: ratio < 0.3 ? "Sua hidratação está baixa hoje" : "Lembrete de hidratação",
    message: phaseBoost
      ? "Nesta fase do ciclo seu corpo retém mais líquido — beber água ajuda a reduzir o inchaço."
      : `Você bebeu ${(hydrationMl / 1000).toFixed(2).replace(".", ",")}L de ${(goalMl / 1000).toFixed(1)}L. Que tal um copo agora?`,
    category: "hydration",
    priority,
    status: "pending",
    cta_label: "Registrar água",
    cta_to: "/app/hydration",
    icon: "droplets",
  };
}

export function getMealReminder(mealsToday: number, hour: number): SmartReminder | null {
  if (mealsToday >= 3) return null;
  if (mealsToday === 0 && hour >= 11) {
    return {
      reminder_key: "meal_none",
      title: "Você ainda não registrou nenhuma refeição",
      message: "Anotar o que você come ajuda o GlowUp a entender seu padrão e te orientar melhor.",
      category: "meal",
      priority: "normal",
      status: "pending",
      cta_label: "Registrar refeição",
      cta_to: "/app/diet",
      icon: "apple",
    };
  }
  if (mealsToday < 3 && hour >= 18) {
    return {
      reminder_key: "meal_incomplete",
      title: "Registre suas refeições do dia",
      message: `Você tem ${mealsToday} refeições anotadas. Completar o diário melhora suas recomendações.`,
      category: "meal",
      priority: "low",
      status: "pending",
      cta_label: "Continuar",
      cta_to: "/app/diet",
      icon: "apple",
    };
  }
  return null;
}

export function getWorkoutReminder(intel: GlowUpUserContext, workoutToday: boolean): SmartReminder | null {
  if (workoutToday) return null;
  if (intel.pregnancy.isPregnant) {
    return {
      reminder_key: "workout_pregnancy",
      title: "Que tal um movimento leve hoje?",
      message: "Uma caminhada curta ou alongamento suave faz bem para você e o bebê.",
      category: "workout",
      priority: "low",
      status: "pending",
      cta_label: "Ver opções",
      cta_to: "/app/workouts",
      icon: "dumbbell",
    };
  }
  if (intel.cycle.phase === "menstrual") {
    return {
      reminder_key: "workout_recovery",
      title: "Hoje é dia de recuperação ativa",
      message: "Alongamento, respiração ou mobilidade contam tanto quanto treino forte.",
      category: "workout",
      priority: "low",
      status: "pending",
      cta_label: "Ver sugestões",
      cta_to: "/app/workouts",
      icon: "dumbbell",
    };
  }
  const priority: ReminderPriority = intel.workouts.band === "low" || intel.workouts.band === "none" ? "normal" : "low";
  return {
    reminder_key: "workout_pending",
    title: "Seu treino ainda está esperando",
    message: intel.workouts.band === "high"
      ? "Você está em ótimo ritmo — mantenha o momentum hoje."
      : "Mesmo 20 minutos hoje somam muito na sua evolução.",
    category: "workout",
    priority,
    status: "pending",
    cta_label: "Treinar agora",
    cta_to: "/app/workouts",
    icon: "dumbbell",
  };
}

export function getCycleCheckInReminder(intel: GlowUpUserContext, checkedInToday: boolean): SmartReminder | null {
  if (checkedInToday) return null;
  if (intel.pregnancy.isPregnant) return null;
  const phase = intel.cycle.phase;
  if (phase === "luteal") {
    return {
      reminder_key: "cycle_luteal",
      title: "Fase lútea — escute seu corpo",
      message: "Vontades por doce e inchaço são comuns. Hidrate-se, prefira proteína e magnésio.",
      category: "cycle",
      priority: "normal",
      status: "pending",
      cta_label: "Fazer check-in",
      cta_to: "/app/cycle/checkin",
      icon: "heart",
    };
  }
  if (phase === "menstrual") {
    return {
      reminder_key: "cycle_menstrual",
      title: "Fase menstrual — cuide de você",
      message: "Calor, descanso, ferro e movimentos suaves vão ajudar.",
      category: "cycle",
      priority: "normal",
      status: "pending",
      cta_label: "Registrar como está",
      cta_to: "/app/cycle/checkin",
      icon: "heart",
    };
  }
  return {
    reminder_key: "cycle_checkin",
    title: "Como você está hoje?",
    message: "1 minuto de check-in nos ajuda a personalizar o resto do seu dia.",
    category: "cycle",
    priority: "low",
    status: "pending",
    cta_label: "Fazer check-in",
    cta_to: "/app/cycle/checkin",
    icon: "heart",
  };
}

export function getMissionReminder(
  missionsDone: number, missionsTotal: number, xpRemaining: number, streak: number,
): SmartReminder | null {
  if (missionsTotal === 0) return null;
  if (missionsDone >= missionsTotal) return null;
  if (streak >= 2 && missionsDone === 0) {
    return {
      reminder_key: "mission_streak_risk",
      title: `Sua sequência de ${streak} dias está em risco`,
      message: "Complete pelo menos 1 missão hoje para manter o ritmo.",
      category: "missions",
      priority: "high",
      status: "pending",
      cta_label: "Ver missões",
      cta_to: "/app/missions",
      icon: "flame",
    };
  }
  return {
    reminder_key: "missions_pending",
    title: `${missionsTotal - missionsDone} missões esperando você`,
    message: `Ainda há ${xpRemaining} XP para conquistar hoje.`,
    category: "missions",
    priority: "normal",
    status: "pending",
    cta_label: "Ver missões",
    cta_to: "/app/missions",
    icon: "sparkles",
  };
}

export function getProgressReminder(intel: GlowUpUserContext, daysSinceLastMeasurement: number | null): SmartReminder | null {
  if (intel.pregnancy.isPregnant) return null;
  if (daysSinceLastMeasurement === null || daysSinceLastMeasurement >= 14) {
    return {
      reminder_key: "progress_measurements",
      title: "Hora de uma nova medida",
      message: "Uma medida a cada 2 semanas mostra sua evolução real — vai além do peso.",
      category: "progress",
      priority: "low",
      status: "pending",
      cta_label: "Registrar",
      cta_to: "/app/progress/measurements",
      icon: "ruler",
    };
  }
  return null;
}

export function getPregnancyReminder(intel: GlowUpUserContext): SmartReminder | null {
  if (!intel.pregnancy.isPregnant) return null;
  const week = intel.pregnancy.week;
  const trimester = week ? (week <= 13 ? 1 : week <= 27 ? 2 : 3) : null;
  return {
    reminder_key: "pregnancy_care",
    title: trimester ? `Você está no ${trimester}º trimestre` : "Cuidado pré-natal",
    message: "Mantenha sua hidratação, suplementação e acompanhamento médico em dia.",
    category: "pregnancy",
    priority: "normal",
    status: "pending",
    cta_label: "Ver minha gestação",
    cta_to: "/app/pregnancy",
    icon: "heart",
  };
}

export function getFastingReminder(intel: GlowUpUserContext): SmartReminder | null {
  const f = intel.fasting;
  // Pregnancy safety guidance: never encourage fasting.
  if (intel.pregnancy.isPregnant) {
    if (!f.todayStartedAt && !f.todayEndedAt) return null;
    return {
      reminder_key: "fasting_pregnancy_safety",
      title: "Gestação — cuide do jejum com seu médico",
      message: "Durante a gestação, jejum prolongado não é recomendado. Converse com seu obstetra antes de continuar.",
      category: "pregnancy",
      priority: "high",
      status: "pending",
      cta_label: "Ver gestação",
      cta_to: "/app/pregnancy",
      icon: "heart",
    };
  }

  const phaseSoft = intel.cycle.phase === "luteal" || intel.cycle.phase === "menstrual";
  const usuallyFasts = f.completedDaysLast30 >= 3 || f.currentStreak >= 1;

  // Active fasting — long-fast care warning
  if (f.todayStartedAt && !f.todayEndedAt && f.todayTargetMinutes) {
    if (f.currentProgressPercent >= 110) {
      return {
        reminder_key: "fasting_too_long",
        title: "Cuidado com o jejum prolongado",
        message: "Você passou da sua meta. Beba água, escute seu corpo e considere encerrar com calma.",
        category: "general",
        priority: "high",
        status: "pending",
        cta_label: "Ver meu jejum",
        cta_to: "/app/fasting",
        icon: "flame",
      };
    }
    if (f.currentProgressPercent >= 85) {
      return {
        reminder_key: "fasting_near_goal",
        title: phaseSoft ? "Quase lá — vá no seu tempo 💗" : "Você está quase batendo sua meta",
        message: phaseSoft
          ? "Sua fase pede mais cuidado. Hidrate-se e encerre o jejum com leveza quando sentir."
          : "Mantenha-se hidratada e prepare uma refeição leve para encerrar bem.",
        category: "general",
        priority: "normal",
        status: "pending",
        cta_label: "Ver meu jejum",
        cta_to: "/app/fasting",
        icon: "flame",
      };
    }
    return null;
  }

  // Not started today but usually fasts → encourage a start
  if (!f.todayStartedAt && usuallyFasts) {
    return {
      reminder_key: "fasting_start_today",
      title: phaseSoft ? "Hora do seu jejum — vá com gentileza" : "Pronta para iniciar seu jejum?",
      message: phaseSoft
        ? "Sua fase atual pede ritmo mais leve. Comece quando sentir, no seu tempo."
        : "Você costuma jejuar — toque para começar quando quiser.",
      category: "general",
      priority: "low",
      status: "pending",
      cta_label: "Iniciar meu jejum",
      cta_to: "/app/fasting",
      icon: "flame",
    };
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────
// Main: getSmartReminders
// ──────────────────────────────────────────────────────────────────────

export interface SmartRemindersResult {
  reminders: SmartReminder[];
  preferences: ReminderPreferences;
  generatedAt: string;
}

export async function getSmartReminders(): Promise<SmartRemindersResult> {
  const userId = await uid();
  const today = todayKey();
  const empty: SmartRemindersResult = { reminders: [], preferences: DEFAULT_PREFS, generatedAt: today };
  if (!userId) return empty;

  const [intel, prefs, hydrationRes, mealsRes, workoutRes, cycleRes, missions, lastMeasureRes, dismissedRes] = await Promise.all([
    getGlowUpUserContext(),
    getReminderPreferences(),
    supabase.from("hydration_logs").select("ml").eq("user_id", userId).eq("log_date", today),
    supabase.from("meal_logs").select("id").eq("user_id", userId).eq("log_date", today),
    supabase.from("workout_sessions").select("id").eq("user_id", userId).eq("session_date", today).limit(1),
    supabase.from("cycle_daily_logs").select("mood").eq("user_id", userId).eq("date", today).maybeSingle(),
    getDailyMissions(today).catch(() => []),
    supabase
      .from("body_measurements")
      .select("measurement_date")
      .eq("user_id", userId)
      .order("measurement_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_reminders")
      .select("reminder_key,status,seen_at,dismissed_at")
      .eq("user_id", userId)
      .eq("reminder_date", today),
  ]);

  if (!intel) return { ...empty, preferences: prefs };

  const hydrationMl = (hydrationRes.data ?? []).reduce((s, r: any) => s + (r.ml ?? 0), 0);
  const goalMl = 2000; // sensible fallback; intel/personalization already updates from profile
  const mealsToday = mealsRes.data?.length ?? 0;
  const workoutToday = (workoutRes.data?.length ?? 0) > 0;
  const checkedInToday = !!cycleRes.data?.mood;
  const missionsDone = missions.filter((m) => m.completed).length;
  const missionsTotal = missions.length;
  const xpRemaining = missions.filter((m) => !m.completed).reduce((s, m) => s + m.xp_amount, 0);

  const lastMeasureDate = lastMeasureRes.data?.measurement_date as string | undefined;
  const daysSince = lastMeasureDate
    ? Math.floor((Date.parse(today) - Date.parse(lastMeasureDate)) / 86_400_000)
    : null;

  const hour = new Date().getHours();

  const dismissedMap = new Map<string, { status: ReminderStatus }>();
  for (const r of dismissedRes.data ?? []) {
    dismissedMap.set(r.reminder_key, { status: r.status as ReminderStatus });
  }

  const raw: (SmartReminder | null)[] = [
    prefs.hydration_enabled ? getHydrationReminder(intel, hydrationMl, goalMl) : null,
    prefs.meal_enabled ? getMealReminder(mealsToday, hour) : null,
    prefs.workout_enabled ? getWorkoutReminder(intel, workoutToday) : null,
    prefs.cycle_enabled ? getCycleCheckInReminder(intel, checkedInToday) : null,
    prefs.missions_enabled ? getMissionReminder(missionsDone, missionsTotal, xpRemaining, intel.checkins.streak) : null,
    prefs.progress_enabled ? getProgressReminder(intel, daysSince) : null,
    prefs.pregnancy_enabled ? getPregnancyReminder(intel) : null,
    getFastingReminder(intel),
  ];

  const reminders = raw
    .filter((r): r is SmartReminder => r !== null)
    .map((r) => {
      const existing = dismissedMap.get(r.reminder_key);
      return existing ? { ...r, status: existing.status } : r;
    })
    .filter((r) => r.status !== "dismissed")
    .sort((a, b) => {
      const order = { high: 0, normal: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

  return { reminders, preferences: prefs, generatedAt: today };
}

// ──────────────────────────────────────────────────────────────────────
// Persistence helpers (idempotent per user/key/day)
// ──────────────────────────────────────────────────────────────────────

async function upsertReminderRow(
  reminder: Pick<SmartReminder, "reminder_key" | "title" | "message" | "category" | "priority">,
  status: ReminderStatus,
  timestampField: "seen_at" | "dismissed_at",
): Promise<void> {
  const userId = await uid();
  if (!userId) return;
  const today = todayKey();
  const nowIso = new Date().toISOString();
  const row = {
    user_id: userId,
    reminder_key: reminder.reminder_key,
    reminder_date: today,
    title: reminder.title,
    message: reminder.message,
    category: reminder.category,
    priority: reminder.priority,
    status,
    seen_at: timestampField === "seen_at" ? nowIso : null,
    dismissed_at: timestampField === "dismissed_at" ? nowIso : null,
  };
  await supabase
    .from("user_reminders")
    .upsert(row, { onConflict: "user_id,reminder_key,reminder_date" });
}

export async function markReminderAsSeen(reminder: SmartReminder): Promise<void> {
  if (reminder.status === "dismissed") return;
  await upsertReminderRow(reminder, "seen", "seen_at");
}

export async function dismissReminder(reminder: SmartReminder): Promise<void> {
  await upsertReminderRow(reminder, "dismissed", "dismissed_at");
}

export async function getReminderHistory(limit = 30) {
  const userId = await uid();
  if (!userId) return [];
  const { data } = await supabase
    .from("user_reminders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

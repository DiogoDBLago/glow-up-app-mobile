import { createContext, useContext, useEffect, useReducer, useCallback, useRef, type ReactNode } from "react";
import { AppState as RNAppState } from "react-native";
import { generateMissions } from "./missions";
import { supabase } from "@/supabase/client";
import { mirrorStateDiff, runBackfillOnce } from "./relational-mirror";
import { deriveStateSyncDomains, emitGlobalSync } from "./sync";
import { getDailyMissions, getTotalXp, reconcileTotalXpWithLegacy } from "./missions-engine";
import { AUTH_REQUIRED, DEMO_USER_ID, DEMO_USER_NAME, DEMO_STORAGE_KEY, isDemoUserId } from "./auth-config";
import { Storage } from "./platform";

export type Goal = "lose" | "gain" | "maintain" | "health" | "bloat" | "routine";
export type Place = "home" | "gym" | "both";
export type Level = "beginner" | "intermediate" | "advanced";
export type DietPref = "normal" | "lowcarb" | "highprotein" | "vegetarian" | "homefood";
export type Mood = "happy" | "tired" | "bloated" | "anxious" | "motivated" | "emotional" | "lowenergy" | "sensitive" | "irritated" | "energetic" | "discouraged";

export interface Profile {
  name: string;
  email: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  timelineWeeks?: number;
  bodyFocus?: string;
  goal?: Goal;
  place?: Place;
  level?: Level;
  daysPerWeek?: number;
  minutesPerSession?: number;
  dietPref?: DietPref;
  trackCycle?: boolean;
  cycleAnswer?: "yes" | "no" | "later";
  lastPeriodDate?: string;
  cycleLength?: number;
  periodLength?: number;
  pmsSymptoms?: string[];
  cycleReminders?: string[];
  sleepQuality?: "low" | "ok" | "great";
  energyLevel?: "low" | "ok" | "great";
  mainDifficulty?: string;
}

export interface CycleDayLog {
  date: string;
  symptoms?: string[];
  mood?: Mood;
  moods?: Mood[];
  energy?: "low" | "ok" | "great";
  note?: string;
  periodStart?: boolean;
  periodEnd?: boolean;
}

export interface Mission { id: string; title: string; xp: number; done: boolean; category: string }
export interface WorkoutLog { id: string; workoutId: string; date: string; durationMin: number }
export interface MoodLog { date: string; mood: Mood; note?: string }
export interface WeightLog { date: string; kg: number }
export interface PhotoLog { id: string; date: string; type: "front" | "side" | "back"; dataUrl: string }
export interface MealLog {
  id: string; date: string; name: string; mealType?: string; foodIds?: string[];
  kcal?: number; protein?: number; carbs?: number; fats?: number; fromMealId?: string;
}
export interface CustomWorkout {
  id: string; name: string; place: Place; muscle: string;
  exercises: { name: string; sets: number; reps: string; restSec: number }[];
}
export interface WeeklyPlanDay { day: number; type: string; done: boolean }
export interface NotifPrefs {
  water: boolean; workout: boolean; motivation: boolean; cycle: boolean;
  permission: NotificationPermission | "unset";
}

// New tracker types
export interface BbtLog { date: string; tempC: number }
export interface MucusLog { date: string; type: "dry" | "sticky" | "creamy" | "watery" | "eggwhite" }
export interface SymptomLog { date: string; symptom: string; intensity: 1 | 2 | 3 }
export interface EnergyLog { date: string; level: 1 | 2 | 3 | 4 | 5 }
export interface SleepLog { date: string; bedtime: string; waketime: string; hours: number; quality: 1 | 2 | 3 | 4 | 5 }
export interface MeasurementLog { date: string; bust?: number; waist?: number; hips?: number; thigh?: number; arm?: number }
export interface XpEvent { id: string; date: string; amount: number; source: string }

// Structured workout tracker (legacy)
export interface WTExercise { id: string; name: string; sets: number; reps: string; restSec?: number; notes?: string }
export interface WorkoutTemplate { id: string; name: string; description?: string; exercises: WTExercise[] }
export interface WSSet { reps: number; weightKg: number; done: boolean }
export interface WSEntry { exerciseId: string; sets: WSSet[] }
export interface WorkoutSession {
  id: string; templateId: string; date: string; startedAt: number; finishedAt?: number;
  entries: WSEntry[]; notes?: string;
}

// === Workouts V2 — user-built plan ===
export type WGoal = "lose" | "muscle" | "tone" | "strength" | "fitness";
export interface ExternalExerciseRef {
  source: "exercisedb" | string;
  externalExerciseId: string;
  name: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  gifUrl?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  createdAt?: string;
}
export interface PlanExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: string;
  weightKg?: number;
  restSec: number;
  notes?: string;
  /** Set when this entry comes from an external API (e.g. ExerciseDB). */
  external?: ExternalExerciseRef;
}
export interface PlanDay { id: string; name: string; weekday?: number; exercises: PlanExercise[] }
export interface UserPlan {
  id: string;
  place: Place;
  goal: WGoal;
  level?: Level;
  daysPerWeek: number;
  weekdays?: number[]; // 0=Mon..6=Sun (optional for legacy plans)
  days: PlanDay[];
  createdAt: number;
}
export interface V2SessionSet { reps: number; weightKg: number; done: boolean }
export interface V2SessionEntry { planExerciseId: string; exerciseId: string; sets: V2SessionSet[] }
export type WorkoutVariant = "adapted" | "original";
export interface WorkoutSessionMeta {
  workoutVariant?: WorkoutVariant;
  originalDayId?: string;
  adaptedDayId?: string;
  readinessScore?: number;
  recoveryScore?: number;
  adaptationReasons?: string[];
  engineVersion?: string;
}
export interface WorkoutSessionV2 {
  id: string; planId: string; dayId: string; dayName: string;
  startedAt: number; endedAt?: number;
  entries: V2SessionEntry[];
  durationMin: number;
  kcal: number;
  volumeKg: number;
  meta?: WorkoutSessionMeta;
}

export interface AppState {
  bootHydrated: boolean;
  authed: boolean;
  userId: string | null;
  profile: Profile | null;
  onboardingComplete: boolean;
  xp: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  hydration: Record<string, number>;
  hydrationGoalMl: number;
  missions: Mission[];
  missionsDate: string | null;
  moodLogs: MoodLog[];
  workoutLogs: WorkoutLog[];
  weightLogs: WeightLog[];
  progressPhotos: PhotoLog[];
  mealLogs: MealLog[];
  customWorkouts: CustomWorkout[];
  weeklyPlan: WeeklyPlanDay[];
  notif: NotifPrefs;
  tipsAddedToday: string[];
  cycleLogs: CycleDayLog[];
  bbtLogs: BbtLog[];
  mucusLogs: MucusLog[];
  symptomLogs: SymptomLog[];
  energyLogs: EnergyLog[];
  sleepLogs: SleepLog[];
  measurementLogs: MeasurementLog[];
  xpLedger: XpEvent[];
  freezeTokens: number;
  claimedRewards: string[];
  workoutTemplates: WorkoutTemplate[];
  workoutSessions: WorkoutSession[];
  userPlan: UserPlan | null;
  workoutSessionsV2: WorkoutSessionV2[];
  toast: { id: number; message: string } | null;
}

// YYYY-MM-DD in Brazil time
const today = () => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const yesterdayOf = (dateStr: string): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
};

function bumpStreak(state: AppState): { streak: number; longestStreak: number; lastActiveDate: string } {
  const t = today();
  if (state.lastActiveDate === t) return { streak: state.streak, longestStreak: state.longestStreak, lastActiveDate: t };
  const next = state.lastActiveDate === yesterdayOf(t) ? state.streak + 1 : 1;
  return { streak: next, longestStreak: Math.max(state.longestStreak ?? 0, next), lastActiveDate: t };
}

function makeXpEvent(amount: number, source: string): XpEvent {
  return { id: `xp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: today(), amount, source };
}

const initial: AppState = {
  bootHydrated: false,
  authed: false,
  userId: null,
  profile: null,
  onboardingComplete: false,
  xp: 0, streak: 0, longestStreak: 0, lastActiveDate: null,
  hydration: {}, hydrationGoalMl: 0,
  missions: [], missionsDate: null,
  moodLogs: [], workoutLogs: [], weightLogs: [], progressPhotos: [], mealLogs: [],
  customWorkouts: [], weeklyPlan: [],
  notif: { water: false, workout: false, motivation: false, cycle: false, permission: "unset" },
  tipsAddedToday: [],
  cycleLogs: [],
  bbtLogs: [], mucusLogs: [], symptomLogs: [], energyLogs: [], sleepLogs: [], measurementLogs: [],
  xpLedger: [], freezeTokens: 1, claimedRewards: [],
  workoutTemplates: [], workoutSessions: [],
  userPlan: null, workoutSessionsV2: [],
  toast: null,
};

type Action =
  | { type: "BOOT_NO_AUTH" }
  | { type: "HYDRATE_FROM_DB"; userId: string; payload: Partial<AppState>; profile: Profile }
  | { type: "AUTH_LOGOUT" }
  | { type: "UPDATE_PROFILE"; patch: Partial<Profile> }
  | { type: "COMPLETE_ONBOARDING"; profile: Profile; hydrationGoalMl: number; missions: Mission[]; weeklyPlan: WeeklyPlanDay[] }
  | { type: "ADD_WATER"; ml: number }
  | { type: "RESET_WATER" }
  | { type: "TOGGLE_MISSION"; id: string }
  | { type: "REGEN_MISSIONS"; missions: Mission[] }
  | { type: "LOG_MOOD"; mood: Mood }
  | { type: "LOG_WORKOUT"; log: WorkoutLog }
  | { type: "LOG_WEIGHT"; log: WeightLog }
  | { type: "ADD_PHOTO"; photo: PhotoLog }
  | { type: "DELETE_PHOTO"; id: string }
  | { type: "ADD_MEAL"; meal: MealLog }
  | { type: "DELETE_MEAL"; id: string }
  | { type: "UPDATE_MEAL"; meal: MealLog }
  | { type: "ADD_CUSTOM_WORKOUT"; workout: CustomWorkout }
  | { type: "DELETE_CUSTOM_WORKOUT"; id: string }
  | { type: "MARK_PLAN_DAY"; day: number; done: boolean }
  | { type: "REGEN_PLAN"; plan: WeeklyPlanDay[] }
  | { type: "SWAP_PLAN_DAY"; day: number; workoutType: string }
  | { type: "SET_NOTIF"; patch: Partial<NotifPrefs> }
  | { type: "ADD_TIP_MISSION"; mission: Mission }
  | { type: "TOAST"; message: string }
  | { type: "CLEAR_TOAST" }
  | { type: "ADD_XP"; xp: number }
  | { type: "SET_XP_TOTAL"; xp: number }
  | { type: "UPSERT_CYCLE_DAY"; log: CycleDayLog }
  | { type: "MERGE_STATE"; patch: Partial<AppState> }
  | { type: "ADD_XP_EVENT"; amount: number; source: string }
  | { type: "DAILY_ROLLOVER"; date: string; missions: Mission[]; resetWeekly: boolean }
  | { type: "WV2_SET_PLAN"; plan: UserPlan }
  | { type: "WV2_DELETE_PLAN" }
  | { type: "WV2_UPDATE_DAY"; dayId: string; day: PlanDay }
  | { type: "WV2_ADD_SESSION"; session: WorkoutSessionV2 };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "BOOT_NO_AUTH":
      return { ...initial, bootHydrated: true };
    case "HYDRATE_FROM_DB":
      return {
        ...initial,
        ...action.payload,
        profile: action.profile,
        userId: action.userId,
        authed: true,
        bootHydrated: true,
        toast: null,
      };
    case "AUTH_LOGOUT":
      return { ...initial, bootHydrated: true };
    case "UPDATE_PROFILE":
      return { ...state, profile: { ...(state.profile as Profile), ...action.patch } };
    case "COMPLETE_ONBOARDING":
      return {
        ...state,
        profile: { ...(state.profile as Profile), ...action.profile },
        onboardingComplete: true,
        hydrationGoalMl: action.hydrationGoalMl,
        missions: action.missions,
        missionsDate: today(),
        weeklyPlan: action.weeklyPlan,
      };
    case "ADD_WATER": {
      const d = today();
      const cur = state.hydration[d] ?? 0;
      const next = Math.min(cur + action.ml, (state.hydrationGoalMl || 9999) * 2);
      return { ...state, hydration: { ...state.hydration, [d]: next } };
    }
    case "RESET_WATER":
      return { ...state, hydration: { ...state.hydration, [today()]: 0 } };
    case "TOGGLE_MISSION": {
      let xpDelta = 0;
      let became = false;
      const missions = state.missions.map(m => {
        if (m.id !== action.id) return m;
        xpDelta = m.done ? -m.xp : m.xp;
        if (!m.done) became = true;
        return { ...m, done: !m.done };
      });
      const s = became ? bumpStreak(state) : { streak: state.streak, lastActiveDate: state.lastActiveDate ?? today() };
      const xpLedger = xpDelta > 0 ? [makeXpEvent(xpDelta, "mission_completed"), ...state.xpLedger].slice(0, 200) : state.xpLedger;
      return { ...state, missions, xp: Math.max(0, state.xp + xpDelta), xpLedger, ...s };
    }
    case "REGEN_MISSIONS":
      return { ...state, missions: action.missions, missionsDate: today() };
    case "LOG_MOOD": {
      const s = bumpStreak(state);
      return { ...state, moodLogs: [...state.moodLogs.filter(l => l.date !== today()), { date: today(), mood: action.mood }], ...s };
    }
    case "LOG_WORKOUT": {
      const s = bumpStreak(state);
      const missions = state.missions.map(m =>
        m.id === "m-workout" || m.category === "workout" ? { ...m, done: true } : m
      );
      return { ...state, workoutLogs: [action.log, ...state.workoutLogs], missions, xp: state.xp + 25, xpLedger: [makeXpEvent(25, "workout_completed"), ...state.xpLedger].slice(0, 200), ...s };
    }
    case "LOG_WEIGHT":
      return { ...state, weightLogs: [...state.weightLogs.filter(l => l.date !== action.log.date), action.log] };
    case "ADD_PHOTO":
      return { ...state, progressPhotos: [action.photo, ...state.progressPhotos], xp: state.xp + 20, xpLedger: [makeXpEvent(20, "progress_photo"), ...state.xpLedger].slice(0, 200) };
    case "DELETE_PHOTO":
      return { ...state, progressPhotos: state.progressPhotos.filter(p => p.id !== action.id) };
    case "ADD_MEAL": {
      const t = today();
      const before = state.mealLogs.filter(l => l.date === t).length;
      const isFirstToday = before === 0;
      const willHave4 = before + 1 >= 4 && before < 4;
      let xpDelta = 0;
      if (isFirstToday) xpDelta += 10;
      if (willHave4) xpDelta += 20;
      const missions = state.missions.map(m =>
        m.category === "food" || m.category === "nutrition" || m.id === "m-meal" || m.id === "m-protein" ? { ...m, done: true } : m
      );
      const s = isFirstToday ? bumpStreak(state) : { streak: state.streak, lastActiveDate: state.lastActiveDate ?? t };
      const xpLedger = xpDelta > 0 ? [makeXpEvent(xpDelta, "meal_logged"), ...state.xpLedger].slice(0, 200) : state.xpLedger;
      return { ...state, mealLogs: [action.meal, ...state.mealLogs], missions, xp: state.xp + xpDelta, xpLedger, ...s };
    }
    case "DELETE_MEAL":
      return { ...state, mealLogs: state.mealLogs.filter(l => l.id !== action.id) };
    case "UPDATE_MEAL":
      return { ...state, mealLogs: state.mealLogs.map(l => l.id === action.meal.id ? action.meal : l) };
    case "ADD_CUSTOM_WORKOUT":
      return { ...state, customWorkouts: [action.workout, ...state.customWorkouts] };
    case "DELETE_CUSTOM_WORKOUT":
      return { ...state, customWorkouts: state.customWorkouts.filter(w => w.id !== action.id) };
    case "MARK_PLAN_DAY":
      return { ...state, weeklyPlan: state.weeklyPlan.map(d => d.day === action.day ? { ...d, done: action.done } : d) };
    case "SWAP_PLAN_DAY":
      return { ...state, weeklyPlan: state.weeklyPlan.map(d => d.day === action.day ? { ...d, type: action.workoutType, done: false } : d) };
    case "REGEN_PLAN":
      return { ...state, weeklyPlan: action.plan };
    case "SET_NOTIF":
      return { ...state, notif: { ...state.notif, ...action.patch } };
    case "ADD_TIP_MISSION":
      if (state.tipsAddedToday.includes(action.mission.id)) return state;
      return { ...state, missions: [...state.missions, action.mission], tipsAddedToday: [...state.tipsAddedToday, action.mission.id] };
    case "TOAST":
      return { ...state, toast: { id: Date.now(), message: action.message } };
    case "CLEAR_TOAST":
      return { ...state, toast: null };
    case "ADD_XP":
      return { ...state, xp: state.xp + action.xp, xpLedger: action.xp > 0 ? [makeXpEvent(action.xp, "manual"), ...state.xpLedger].slice(0, 200) : state.xpLedger };
    case "SET_XP_TOTAL":
      return state.xp === Math.max(0, action.xp) ? state : { ...state, xp: Math.max(0, action.xp) };
    case "UPSERT_CYCLE_DAY": {
      const others = state.cycleLogs.filter(l => l.date !== action.log.date);
      const merged = { ...(state.cycleLogs.find(l => l.date === action.log.date) ?? {}), ...action.log };
      return { ...state, cycleLogs: [...others, merged] };
    }
    case "MERGE_STATE":
      return { ...state, ...action.patch };
    case "ADD_XP_EVENT": {
      const ev: XpEvent = { id: `xp-${Date.now()}`, date: today(), amount: action.amount, source: action.source };
      return { ...state, xp: Math.max(0, state.xp + action.amount), xpLedger: [ev, ...state.xpLedger].slice(0, 200) };
    }
    case "DAILY_ROLLOVER": {
      const yest = yesterdayOf(action.date);
      const streak = state.lastActiveDate === yest || state.lastActiveDate === action.date ? state.streak : 0;
      const weeklyPlan = action.resetWeekly
        ? state.weeklyPlan.map(d => ({ ...d, done: false }))
        : state.weeklyPlan;
      return {
        ...state,
        missions: action.missions,
        missionsDate: action.date,
        tipsAddedToday: [],
        streak,
        weeklyPlan,
      };
    }
    case "WV2_SET_PLAN":
      return { ...state, userPlan: action.plan };
    case "WV2_DELETE_PLAN":
      return { ...state, userPlan: null };
    case "WV2_UPDATE_DAY": {
      if (!state.userPlan) return state;
      return {
        ...state,
        userPlan: {
          ...state.userPlan,
          days: state.userPlan.days.map(d => d.id === action.dayId ? action.day : d),
        },
      };
    }
    case "WV2_ADD_SESSION": {
      // Dedupe: ignore if a session with the same id already exists (prevents duplicate XP)
      if (state.workoutSessionsV2.some(s => s.id === action.session.id)) return state;
      const s = bumpStreak(state);
      const missions = state.missions.map(m =>
        m.id === "m-workout" || m.category === "workout" ? { ...m, done: true } : m
      );
      return {
        ...state,
        workoutSessionsV2: [action.session, ...state.workoutSessionsV2].slice(0, 200),
        missions,
        xp: state.xp + 25,
        xpLedger: [makeXpEvent(25, "workout_completed"), ...state.xpLedger].slice(0, 200),
        ...s,
      };
    }
    default:
      return state;
  }
}

// Fields persisted to user_data.state (everything user-meaningful, excluding ephemeral)
const PERSISTED_KEYS: (keyof AppState)[] = [
  "profile", "onboardingComplete", "xp", "streak", "longestStreak", "lastActiveDate",
  "hydration", "hydrationGoalMl", "missions", "missionsDate",
  "moodLogs", "workoutLogs", "weightLogs", "progressPhotos", "mealLogs",
  "customWorkouts", "weeklyPlan", "notif", "tipsAddedToday", "cycleLogs",
  "bbtLogs", "mucusLogs", "symptomLogs", "energyLogs", "sleepLogs", "measurementLogs",
  "xpLedger", "freezeTokens", "claimedRewards",
  "workoutTemplates", "workoutSessions",
  "userPlan", "workoutSessionsV2",
];

function extractPersisted(state: AppState): Partial<AppState> {
  const out: any = {};
  for (const k of PERSISTED_KEYS) out[k] = (state as any)[k];
  return out;
}

type Ctx = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  waterToday: number;
  toast: (msg: string) => void;
  signOut: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const lastSavedRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStateRef = useRef<AppState>(initial);
  const backfilledRef = useRef<string | null>(null);
  const missionSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bootstrap: listen to auth state, hydrate from DB
  useEffect(() => {
    let mounted = true;

    const loadUserData = async (userId: string, email: string) => {
      try {
        const [{ data: ud }, { data: prof }, { data: hydrationToday }] = await Promise.all([
          supabase.from("user_data").select("state").eq("user_id", userId).maybeSingle(),
          supabase.from("profiles").select("name, email").eq("id", userId).maybeSingle(),
          supabase.from("hydration_logs").select("log_date, ml").eq("user_id", userId).eq("log_date", today()).maybeSingle(),
        ]);
        if (!mounted) return;
        const stored = (ud?.state ?? {}) as Partial<AppState>;
        const hydratedStored: Partial<AppState> = hydrationToday
          ? {
              ...stored,
              hydration: {
                ...(stored.hydration ?? {}),
                [hydrationToday.log_date]: hydrationToday.ml,
              },
            }
          : stored;
        const profile: Profile = {
          name: hydratedStored.profile?.name || prof?.name || email.split("@")[0],
          email: prof?.email || email,
          ...(hydratedStored.profile ?? {}),
        };
        dispatch({ type: "HYDRATE_FROM_DB", userId, payload: hydratedStored, profile });
        lastSavedRef.current = JSON.stringify(extractPersisted({ ...initial, ...hydratedStored, profile } as AppState));
      } catch (e) {
        console.error("[store] load failed", e);
        if (mounted) dispatch({ type: "BOOT_NO_AUTH" });
      }
    };

    const bootDemo = async () => {
      if (!mounted) return;
      let stored: Partial<AppState> = {};
      try {
        const raw = await Storage.getItem(DEMO_STORAGE_KEY);
        if (raw) stored = JSON.parse(raw) as Partial<AppState>;
      } catch (e) {
        console.warn("[store] demo state parse failed", e);
      }
      const profile: Profile = {
        name: stored.profile?.name || DEMO_USER_NAME,
        email: stored.profile?.email || "",
        ...(stored.profile ?? {}),
      };
      dispatch({ type: "HYDRATE_FROM_DB", userId: DEMO_USER_ID, payload: stored, profile });
      lastSavedRef.current = JSON.stringify(extractPersisted({ ...initial, ...stored, profile } as AppState));
    };

    // Auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // defer to avoid deadlock with supabase client
        setTimeout(() => loadUserData(session.user.id, session.user.email || ""), 0);
      } else if (event === "SIGNED_OUT") {
        lastSavedRef.current = "";
        if (AUTH_REQUIRED) {
          dispatch({ type: "AUTH_LOGOUT" });
        } else {
          void bootDemo();
        }
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user.id, session.user.email || "");
      } else if (AUTH_REQUIRED) {
        dispatch({ type: "BOOT_NO_AUTH" });
      } else {
        void bootDemo();
      }
    }).catch(() => {
      if (AUTH_REQUIRED) dispatch({ type: "BOOT_NO_AUTH" });
      else void bootDemo();
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Debounced sync to user_data (skipped for demo/local users)
  useEffect(() => {
    if (!state.bootHydrated || !state.authed || !state.userId) return;
    const persisted = extractPersisted(state);
    const serialized = JSON.stringify(persisted);
    if (serialized === lastSavedRef.current) return;

    // Demo / local mode: persist to AsyncStorage only, no Supabase writes.
    if (isDemoUserId(state.userId)) {
      lastSavedRef.current = serialized;
      void Storage.setItem(DEMO_STORAGE_KEY, serialized);
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const uid = state.userId!;
      lastSavedRef.current = serialized;
      const { error } = await supabase
        .from("user_data")
        .upsert({
          user_id: uid,
          state: persisted as any,
          xp: state.xp,
          streak: state.streak,
          last_active_date: state.lastActiveDate,
          missions_date: state.missionsDate,
        }, { onConflict: "user_id" });
      if (error) console.error("[store] sync failed", error);

      // Also keep profiles.name in sync if it changed
      if (state.profile?.name) {
        await supabase.from("profiles").update({ name: state.profile.name }).eq("id", uid);
      }
    }, 800);
  }, [state]);

  // Dual-write mirror to relational tables (fire-and-forget) + one-time backfill
  useEffect(() => {
    if (!state.bootHydrated || !state.authed || !state.userId) {
      prevStateRef.current = state;
      return;
    }
    const uid = state.userId;
    // Demo / local mode: skip relational mirror & backfill (no auth.uid()).
    if (isDemoUserId(uid)) {
      const prev = prevStateRef.current;
      const domains = deriveStateSyncDomains(prev, state);
      if (domains.length) emitGlobalSync({ source: "store:optimistic", domains });
      prevStateRef.current = state;
      return;
    }
    // One-time backfill on first hydrated tick for this user
    const prev = prevStateRef.current;
    if (backfilledRef.current !== uid) {
      backfilledRef.current = uid;
      runBackfillOnce(uid, state);
    } else {
      const domains = deriveStateSyncDomains(prev, state);
      if (domains.length) {
        emitGlobalSync({ source: "store:optimistic", domains });
        if (domains.some((d) => ["hydration", "nutrition", "workouts", "fasting", "cycle", "checkins", "progress", "bodyMeasurements", "progressPhotos"].includes(d))) {
          if (missionSyncTimerRef.current) clearTimeout(missionSyncTimerRef.current);
          missionSyncTimerRef.current = setTimeout(() => {
            void getDailyMissions()
              .then(() => getTotalXp())
              .then((xp) => dispatch({ type: "SET_XP_TOTAL", xp }))
              .catch((err) => console.error("[store] mission/xp reconcile failed", err));
          }, 400);
        }
      }
      // Diff-based mirror for subsequent state changes
      void mirrorStateDiff(uid, prev, state).then(() => {
        if (domains.length) emitGlobalSync({ source: "store:persisted", domains });
      });
    }
    prevStateRef.current = state;
  }, [state]);

  // Auto-clear toast
  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 2500);
    return () => clearTimeout(t);
  }, [state.toast]);

  // Daily rollover (Brazil timezone)
  useEffect(() => {
    if (!state.bootHydrated || !state.onboardingComplete || !state.profile) return;
    const check = () => {
      const t = today();
      if (state.missionsDate === t) return;
      const isMonday = new Date(`${t}T12:00:00Z`).getUTCDay() === 1;
      dispatch({
        type: "DAILY_ROLLOVER",
        date: t,
        missions: generateMissions(state.profile!),
        resetWeekly: isMonday,
      });
    };
    check();
    const id = setInterval(check, 60_000);
    const subscription = RNAppState.addEventListener("change", (nextState) => {
      if (nextState === "active") check();
    });
    return () => {
      clearInterval(id);
      subscription.remove();
    };
  }, [state.bootHydrated, state.onboardingComplete, state.profile, state.missionsDate]);

  // XP relational reconciliation: keeps levels, achievements and reports aligned
  // when XP was awarded by mission/achievement flows outside the legacy store.
  useEffect(() => {
    if (!state.bootHydrated || !state.authed || !state.userId) return;
    if (isDemoUserId(state.userId)) return;
    let cancelled = false;
    void reconcileTotalXpWithLegacy(state.xp).then((xp) => {
      if (!cancelled && xp !== state.xp) dispatch({ type: "SET_XP_TOTAL", xp });
    }).catch((err) => console.error("[store] xp reconcile failed", err));
    return () => { cancelled = true; };
  }, [state.bootHydrated, state.authed, state.userId]);

  const toast = useCallback((message: string) => dispatch({ type: "TOAST", message }), []);
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will dispatch AUTH_LOGOUT or rebuild demo mode based on AUTH_REQUIRED.
  }, []);
  const waterToday = state.hydration[today()] ?? 0;

  return (
    <StoreContext.Provider value={{ state, dispatch, waterToday, toast, signOut }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export const dateKey = today;

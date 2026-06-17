import type { AppState } from "./store";
import { invalidateCache } from "./session-cache";

export type SyncDomain =
  | "hydration"
  | "fasting"
  | "workouts"
  | "nutrition"
  | "cycle"
  | "checkins"
  | "todayPlan"
  | "missions"
  | "xp"
  | "achievements"
  | "reports"
  | "progress"
  | "bodyMeasurements"
  | "progressPhotos"
  | "smartReminders"
  | "alerts"
  | "homeCards"
  | "bottomNavigation"
  | "weeklySummaries"
  | "dailySummaries"
  | "profile";

export interface GlobalSyncEventDetail {
  source: string;
  domains: SyncDomain[];
  at: number;
}

let globalSyncRevision = 0;

const CORE_DEPENDENTS: SyncDomain[] = [
  "todayPlan",
  "missions",
  "reports",
  "smartReminders",
  "alerts",
  "homeCards",
  "bottomNavigation",
  "weeklySummaries",
  "dailySummaries",
];

export function getGlobalSyncRevision() {
  return globalSyncRevision;
}

export function expandSyncDomains(domains: SyncDomain[]): SyncDomain[] {
  const set = new Set<SyncDomain>(domains);
  for (const domain of domains) {
    if (["hydration", "fasting", "workouts", "nutrition", "cycle", "checkins", "progress", "bodyMeasurements", "progressPhotos"].includes(domain)) {
      CORE_DEPENDENTS.forEach((d) => set.add(d));
    }
    if (["missions", "xp", "achievements"].includes(domain)) {
      ["xp", "achievements", "reports", "homeCards", "todayPlan", "weeklySummaries", "dailySummaries"].forEach((d) => set.add(d as SyncDomain));
    }
    if (domain === "profile") {
      CORE_DEPENDENTS.forEach((d) => set.add(d));
      ["hydration", "workouts", "nutrition", "cycle", "progress", "bodyMeasurements"].forEach((d) => set.add(d as SyncDomain));
    }
  }
  return [...set];
}

export function invalidateGlobalCaches(domains: SyncDomain[]) {
  const set = new Set(domains);
  invalidateCache(/^today:/);
  invalidateCache(/^home:/);

  if (set.has("missions") || set.has("xp") || set.has("achievements") || set.has("todayPlan")) {
    invalidateCache("app:missions");
  }
  if (set.has("progress") || set.has("reports") || set.has("bodyMeasurements") || set.has("progressPhotos") || set.has("xp")) {
    invalidateCache(/^progress:hub:/);
    invalidateCache("app:insights");
  }
  if (set.has("fasting")) invalidateCache(/^fasting:today:/);
  if (set.has("cycle") || set.has("checkins") || set.has("profile")) invalidateCache(/^cycle:/);
  if (set.has("smartReminders") || set.has("alerts") || set.has("todayPlan")) invalidateCache("app:notifications");
}

// In-memory pub/sub replacing the web's window.dispatchEvent/CustomEvent,
// which don't exist on React Native. Same external API (emitGlobalSync /
// subscribeGlobalSync) so call sites elsewhere in the app don't need to change.
type GlobalSyncListener = (detail: GlobalSyncEventDetail) => void;
const listeners = new Set<GlobalSyncListener>();

export function emitGlobalSync(input: { source: string; domains: SyncDomain[] }) {
  const domains = expandSyncDomains(input.domains);
  if (domains.length === 0) return;
  globalSyncRevision += 1;
  invalidateGlobalCaches(domains);
  const detail: GlobalSyncEventDetail = { source: input.source, domains, at: Date.now() };
  listeners.forEach((listener) => listener(detail));
}

export function subscribeGlobalSync(listener: GlobalSyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function deriveStateSyncDomains(prev: AppState, next: AppState): SyncDomain[] {
  const domains = new Set<SyncDomain>();
  if (prev.profile !== next.profile || prev.hydrationGoalMl !== next.hydrationGoalMl) domains.add("profile");
  if (prev.hydration !== next.hydration || prev.hydrationGoalMl !== next.hydrationGoalMl) domains.add("hydration");
  if (prev.mealLogs !== next.mealLogs) domains.add("nutrition");
  if (prev.workoutLogs !== next.workoutLogs || prev.workoutSessionsV2 !== next.workoutSessionsV2 || prev.userPlan !== next.userPlan || prev.weeklyPlan !== next.weeklyPlan) domains.add("workouts");
  if (prev.moodLogs !== next.moodLogs || prev.energyLogs !== next.energyLogs || prev.sleepLogs !== next.sleepLogs) domains.add("checkins");
  if (prev.cycleLogs !== next.cycleLogs || prev.symptomLogs !== next.symptomLogs || prev.bbtLogs !== next.bbtLogs || prev.mucusLogs !== next.mucusLogs) domains.add("cycle");
  if (prev.weightLogs !== next.weightLogs || prev.measurementLogs !== next.measurementLogs) {
    domains.add("progress");
    domains.add("bodyMeasurements");
  }
  if (prev.progressPhotos !== next.progressPhotos) {
    domains.add("progress");
    domains.add("progressPhotos");
  }
  if (prev.missions !== next.missions || prev.missionsDate !== next.missionsDate) domains.add("missions");
  if (prev.xp !== next.xp || prev.xpLedger !== next.xpLedger) domains.add("xp");
  if (prev.claimedRewards !== next.claimedRewards) domains.add("achievements");
  return [...domains];
}

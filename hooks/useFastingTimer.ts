import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabase/client";
import { getCachedData, setCachedData, invalidateCache, CACHE_TTL } from "@/lib/session-cache";
import { emitGlobalSync, subscribeGlobalSync } from "@/lib/sync";
import { invalidateGlowUpIntelligence } from "./use-glowup-intelligence";
import { Storage } from "@/lib/platform";

export type FastingSessionHistoryItem = {
  startedAt: number;
  endedAt: number;
  durationMs: number;
  goalHours: number;
};

type FastingCached = {
  rowId: string | null;
  goalMin: number;
  startedAt: number | null;
};

type FastingPatch = {
  target_minutes?: number;
  started_at?: string | null;
  ended_at?: string | null;
  status?: string;
};

const DEFAULT_GOAL_MIN = 16 * 60;
const SESSIONS_KEY = "glowup:fasting:sessions";

const fastingCacheKey = (uid: string) => `fasting:today:${uid}`;

function todayISO() {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const d = new Date();
    const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return tz.toISOString().slice(0, 10);
  }
}

async function loadSessions(): Promise<FastingSessionHistoryItem[]> {
  try {
    const raw = await Storage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function formatTimer(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function formatFastingGoal(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export function useFastingTimer() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [goalMin, setGoalMin] = useState<number>(DEFAULT_GOAL_MIN);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sessions, setSessions] = useState<FastingSessionHistoryItem[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadSessions().then(setSessions);
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const loadToday = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }

    setUserId(auth.user.id);
    const cached = getCachedData<FastingCached>(fastingCacheKey(auth.user.id));
    if (cached) {
      setRowId(cached.rowId);
      if (cached.goalMin) setGoalMin(cached.goalMin);
      setStartedAt(cached.startedAt ?? null);
    }

    const { data } = await supabase
      .from("fasting_sessions")
      .select("id, target_minutes, started_at, ended_at")
      .eq("user_id", auth.user.id)
      .eq("fasting_date", todayISO())
      .maybeSingle();

    const next: FastingCached = {
      rowId: data?.id ?? null,
      goalMin: data?.target_minutes ?? DEFAULT_GOAL_MIN,
      startedAt: data?.started_at && !data?.ended_at ? new Date(data.started_at).getTime() : null,
    };

    setCachedData(fastingCacheKey(auth.user.id), next, CACHE_TTL.fasting);
    setRowId(next.rowId);
    setGoalMin(next.goalMin);
    setStartedAt(next.startedAt);
    setLoading(false);
  }, []);

  useEffect(() => { void loadToday(); }, [loadToday]);

  useEffect(() => subscribeGlobalSync((detail) => {
    if (detail.source.startsWith("fasting:")) return;
    if (detail.source.startsWith("home:fast")) return;
    if (detail.domains.includes("fasting")) void loadToday();
  }), [loadToday]);

  const persistRow = useCallback(async (patch: FastingPatch) => {
    if (!userId) return null;
    const payload = { target_minutes: goalMin, status: "planned", ...patch };

    if (rowId) {
      await supabase.from("fasting_sessions").update(payload).eq("id", rowId);
      return rowId;
    }

    const { data } = await supabase
      .from("fasting_sessions")
      .upsert(
        { user_id: userId, fasting_date: todayISO(), ...payload },
        { onConflict: "user_id,fasting_date" },
      )
      .select("id")
      .single();

    if (data?.id) setRowId(data.id);
    return data?.id ?? null;
  }, [goalMin, rowId, userId]);

  const start = useCallback(async () => {
    if (!userId || busy || startedAt) return;
    setBusy(true);
    const t = Date.now();
    setStartedAt(t);
    setNow(t);

    try {
      await persistRow({ started_at: new Date(t).toISOString(), ended_at: null, status: "active" });
      invalidateCache(fastingCacheKey(userId));
      emitGlobalSync({ source: "fasting:toggle", domains: ["fasting", "missions"] });
      invalidateGlowUpIntelligence();
    } finally {
      setBusy(false);
    }
  }, [busy, persistRow, startedAt, userId]);

  const stop = useCallback(async () => {
    if (!userId || busy || !startedAt) return;
    setBusy(true);
    const endedAt = Date.now();
    const session: FastingSessionHistoryItem = {
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      goalHours: goalMin / 60,
    };
    const next = [session, ...sessions];
    setSessions(next);
    void Storage.setItem(SESSIONS_KEY, JSON.stringify(next));
    setStartedAt(null);

    try {
      await persistRow({ ended_at: new Date(endedAt).toISOString(), status: "completed" });
      invalidateCache(fastingCacheKey(userId));
      emitGlobalSync({ source: "fasting:toggle", domains: ["fasting", "missions"] });
      invalidateGlowUpIntelligence();
    } finally {
      setBusy(false);
    }
  }, [busy, goalMin, persistRow, sessions, startedAt, userId]);

  const toggle = useCallback(async () => {
    if (startedAt) await stop();
    else await start();
  }, [start, startedAt, stop]);

  const applyGoal = useCallback(async (newMin: number) => {
    if (!userId) return;
    setGoalMin(newMin);
    await persistRow({ target_minutes: newMin });
    invalidateCache(fastingCacheKey(userId));
    emitGlobalSync({ source: "fasting:goal", domains: ["fasting"] });
    invalidateGlowUpIntelligence();
  }, [persistRow, userId]);

  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
  const goalMs = goalMin * 60_000;

  return useMemo(() => ({
    loading,
    busy,
    userId,
    rowId,
    goalMin,
    goalHours: Math.floor(goalMin / 60),
    goalLabel: formatFastingGoal(goalMin),
    startedAt,
    active: !!startedAt,
    elapsedMs,
    formatted: formatTimer(elapsedMs),
    progressPct: startedAt ? Math.min(100, (elapsedMs / goalMs) * 100) : 0,
    expectedFinish: startedAt ? startedAt + goalMs : null,
    sessions,
    start,
    stop,
    toggle,
    applyGoal,
    reload: loadToday,
  }), [applyGoal, busy, elapsedMs, goalMin, goalMs, loadToday, loading, rowId, sessions, start, startedAt, stop, toggle, userId]);
}

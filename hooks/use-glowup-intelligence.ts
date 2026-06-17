import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { getGlowUpUserContext, type GlowUpUserContext } from "@/lib/glowup-intelligence";
import { subscribeGlobalSync } from "@/lib/sync";

let cache: GlowUpUserContext | null | undefined = undefined;
let inflight: Promise<GlowUpUserContext | null> | null = null;
const listeners = new Set<(c: GlowUpUserContext | null) => void>();

export function invalidateGlowUpIntelligence() {
  cache = undefined;
  inflight = null;
}

export function useGlowUpIntelligence() {
  const { state } = useStore();
  const [ctx, setCtx] = useState<GlowUpUserContext | null>(cache ?? null);
  const [loaded, setLoaded] = useState(cache !== undefined);

  useEffect(() => {
    const sub = (c: GlowUpUserContext | null) => setCtx(c);
    listeners.add(sub);
    return () => { listeners.delete(sub); };
  }, []);

  useEffect(() => {
    return subscribeGlobalSync((detail) => {
      if (!detail.domains.some((d) => ["hydration", "fasting", "workouts", "nutrition", "cycle", "checkins", "progress", "bodyMeasurements", "progressPhotos", "missions", "xp", "achievements", "alerts", "todayPlan", "homeCards", "weeklySummaries", "dailySummaries", "profile"].includes(d))) return;
      invalidateGlowUpIntelligence();
      setLoaded(false);
      getGlowUpUserContext().then((fresh) => {
        cache = fresh;
        listeners.forEach((l) => l(fresh));
        setLoaded(true);
      }).catch(() => {
        cache = null;
        listeners.forEach((l) => l(null));
        setLoaded(true);
      });
    });
  }, []);

  useEffect(() => {
    if (!state.authed) { setLoaded(true); return; }
    if (cache !== undefined) { setLoaded(true); return; }
    let cancelled = false;
    if (!inflight) inflight = getGlowUpUserContext().catch(() => null);
    inflight.then((c) => {
      if (cancelled) return;
      cache = c;
      inflight = null;
      listeners.forEach((l) => l(c));
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [state.authed]);

  return { context: ctx, loaded };
}

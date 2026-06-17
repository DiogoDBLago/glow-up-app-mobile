import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/supabase/client";
import { invalidateGlowUpIntelligence } from "./use-glowup-intelligence";
import { dateKey, useStore } from "@/lib/store";
import { emitGlobalSync } from "@/lib/sync";

type PersistHydrationInput = {
  userId: string;
  logDate: string;
  ml: number;
};

async function persistHydrationTotal({ userId, logDate, ml }: PersistHydrationInput) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("hydration_logs").upsert(
    {
      user_id: userId,
      log_date: logDate,
      ml,
      source: "app",
      updated_at: now,
    },
    { onConflict: "user_id,log_date" },
  );

  if (error) throw error;
}

export function useHydrationActions() {
  const { state, dispatch, waterToday, toast } = useStore();
  const optimisticWaterRef = useRef(waterToday);

  useEffect(() => {
    optimisticWaterRef.current = waterToday;
  }, [waterToday]);

  const addWater = useCallback(async (ml: number, label = `${ml}ml`) => {
    const today = dateKey();
    const userId = state.userId;
    const cap = (state.hydrationGoalMl || 9999) * 2;
    const visibleCurrent = state.hydration[today] ?? waterToday;
    const nextMl = Math.min(Math.max(optimisticWaterRef.current, visibleCurrent) + ml, cap);

    optimisticWaterRef.current = nextMl;
    dispatch({ type: "ADD_WATER", ml });
    emitGlobalSync({ source: "hydration:optimistic", domains: ["hydration"] });
    invalidateGlowUpIntelligence();
    toast(`+${label} registrados 💧`);

    if (!userId) return;

    try {
      await persistHydrationTotal({ userId, logDate: today, ml: nextMl });
      emitGlobalSync({ source: "hydration:persisted", domains: ["hydration"] });
      invalidateGlowUpIntelligence();
    } catch (error) {
      console.error("[hydration] hydration_logs upsert failed", error);
      toast("Não foi possível sincronizar a hidratação agora.");
    }
  }, [dispatch, state.hydration, state.hydrationGoalMl, state.userId, toast, waterToday]);

  const resetWater = useCallback(async () => {
    const today = dateKey();
    const userId = state.userId;

    optimisticWaterRef.current = 0;
    dispatch({ type: "RESET_WATER" });
    emitGlobalSync({ source: "hydration:reset:optimistic", domains: ["hydration"] });
    invalidateGlowUpIntelligence();
    toast("Zerado");

    if (!userId) return;

    try {
      await persistHydrationTotal({ userId, logDate: today, ml: 0 });
      emitGlobalSync({ source: "hydration:reset:persisted", domains: ["hydration"] });
      invalidateGlowUpIntelligence();
    } catch (error) {
      console.error("[hydration] hydration_logs reset failed", error);
      toast("Não foi possível sincronizar a hidratação agora.");
    }
  }, [dispatch, state.userId, toast]);

  return { addWater, resetWater };
}

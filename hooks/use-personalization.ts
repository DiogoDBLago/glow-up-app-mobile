import { useEffect, useMemo, useState } from 'react';
import { useApiClient } from '@/lib/api-client';
import {
  getPersonalizedRecommendations,
  type PersonalizationProfile,
  type PersonalizedRecommendations,
} from '@/lib/personalization';
import { useStore } from '@/lib/store';
import { subscribeGlobalSync } from '@/lib/sync';

let cache: PersonalizationProfile | null | undefined = undefined;
const listeners = new Set<(p: PersonalizationProfile | null) => void>();

export function setCachedPersonalization(p: PersonalizationProfile | null) {
  cache = p;
  listeners.forEach((l) => l(p));
}

/**
 * Hook returning the user's personalization profile + computed recommendations.
 * Falls back to the legacy onboarding profile (state.profile) so existing users
 * still get personalized content before they re-take the expanded quiz.
 */
export function usePersonalization() {
  const { state } = useStore();
  const { fetchProfile } = useApiClient();
  const [profile, setProfile] = useState<PersonalizationProfile | null>(cache ?? null);
  const [loaded, setLoaded] = useState(cache !== undefined);

  useEffect(() => {
    const sub = (p: PersonalizationProfile | null) => setProfile(p);
    listeners.add(sub);
    return () => {
      listeners.delete(sub);
    };
  }, []);

  useEffect(() => {
    if (!state.authed || cache !== undefined) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchProfile();
        if (cancelled) return;
        setCachedPersonalization((data as PersonalizationProfile | null) ?? null);
      } catch (err) {
        console.warn('[usePersonalization] fetch failed', err);
        setCachedPersonalization(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.authed, fetchProfile]);

  useEffect(
    () =>
      subscribeGlobalSync((detail) => {
        if (
          !state.authed ||
          !detail.domains.some((d) =>
            ['profile', 'hydration', 'nutrition', 'workouts', 'cycle', 'bodyMeasurements'].includes(d),
          )
        )
          return;
        cache = undefined;
        void fetchProfile()
          .then((data) => {
            setCachedPersonalization((data as PersonalizationProfile | null) ?? null);
          })
          .catch(() => {
            setCachedPersonalization(null);
          });
      }),
    [state.authed, fetchProfile],
  );

  // Merge with legacy profile so the matrix has something to work with.
  const merged: PersonalizationProfile | null = useMemo(() => {
    const legacy = state.profile;
    if (!profile && !legacy) return null;
    const goalMap: Record<string, string> = {
      lose: 'lose',
      gain: 'gain_muscle',
      maintain: 'maintain',
      health: 'hormonal_health',
      bloat: 'reduce_pms',
      routine: 'energy',
    };

    return {
      ...(legacy
        ? {
            goal: legacy.goal ? (goalMap[legacy.goal] as PersonalizationProfile['goal']) : null,
            height_cm: legacy.heightCm ?? null,
            weight_kg: legacy.weightKg ?? null,
            workout_place: legacy.place ?? null,
            workout_experience: legacy.level ?? null,
            workout_minutes: legacy.minutesPerSession ?? null,
            last_period_date: legacy.lastPeriodDate ?? null,
            cycle_length: legacy.cycleLength ?? null,
            period_length: legacy.periodLength ?? null,
            pms_symptoms: legacy.pmsSymptoms ?? null,
          }
        : {}),
      ...(profile ?? {}),
    };
  }, [profile, state.profile]);

  const recommendations: PersonalizedRecommendations = useMemo(
    () => getPersonalizedRecommendations(merged),
    [merged],
  );

  return { profile: merged, loaded, recommendations };
}

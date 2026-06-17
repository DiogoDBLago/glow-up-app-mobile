import { useRouter } from 'expo-router';

/**
 * Universal Navigation Hook (React Native / expo-router).
 *
 * Every screen should navigate through this hook instead of calling
 * `useRouter` directly, so the routing implementation stays swappable
 * in one place.
 */
export function useAppNavigation() {
  const router = useRouter();

  return {
    // Auth & Onboarding
    goToLogin: () => router.replace('/(auth)/login'),
    goToRegister: () => router.push('/(auth)/register'),
    goToOnboarding: () => router.replace('/(auth)/onboarding'),

    // App Main Tabs
    goToHome: () => router.replace('/(app)'),
    goToWorkouts: () => router.push('/(app)/treinos'),
    goToDiet: () => router.push('/(app)/diet'),
    goToCycle: () => router.push('/(app)/cycle'),
    goToProgress: () => router.push('/(app)/progress'),
    goToProfile: () => router.push('/(app)/profile' as never),

    // Workout Flows
    goToWorkoutSession: (dayId: string, variant?: 'original' | 'adapted') =>
      router.push({
        pathname: '/(app)/workouts/session/[dayId]' as never,
        params: { dayId, ...(variant ? { variant } : {}) },
      }),
    goToWorkoutPlan: () => router.push('/(app)/workouts/plan' as never),
    goToWorkoutHistory: () => router.push('/(app)/workouts/history' as never),

    // Diet Flows
    goToDietMeal: (mealId: string) =>
      router.push({ pathname: '/(app)/diet/meal/[id]' as never, params: { id: mealId } }),
    goToDietBuilder: () => router.push('/(app)/diet/build' as never),

    // Utilities
    goBack: () => router.back(),
  };
}

/**
 * Minimal subset of the web's exercise-fallback.ts — just the helper that
 * useWorkoutSession/session screens need to resolve a GIF URL for exercises
 * sourced from the ExerciseDB API (`PlanExercise.external`).
 *
 * The full ExerciseDB integration (search, normalization, ApiExercisePickerModal)
 * is deferred to Fase 4B — exercises added via the local EXERCISE_LIBRARY never
 * set `external`, so this function is effectively a no-op for now.
 */
export function exerciseGifUrl(exercise: {
  gifUrl?: string | null;
  id?: string | number | null;
  externalExerciseId?: string | number | null;
}): string {
  const direct = exercise.gifUrl?.trim();
  if (direct) return direct;
  return '';
}

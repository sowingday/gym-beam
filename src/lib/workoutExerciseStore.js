function toFiniteInteger(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toFiniteNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeWorkoutExercise(exercise, index = 0) {
  if (!exercise || typeof exercise !== 'object') return exercise;
  return {
    ...exercise,
    exercise_index: exercise.exercise_index != null ? toFiniteInteger(exercise.exercise_index, null) : null,
    exercise_id: exercise.exercise_id != null ? String(exercise.exercise_id) : exercise.exercise_index != null ? String(exercise.exercise_index) : null,
    name: exercise.name || '',
    category: exercise.category || '',
    duration: exercise.duration != null ? toFiniteInteger(exercise.duration, 90) : 90,
    use_sets: Boolean(exercise.use_sets),
    sets: exercise.sets != null ? Math.max(1, toFiniteInteger(exercise.sets, 3)) : 3,
    reps: exercise.reps != null ? Math.max(1, toFiniteInteger(exercise.reps, 10)) : 10,
    weight_kg: exercise.weight_kg != null ? toFiniteNumber(exercise.weight_kg, null) : null,
    animation_type: exercise.animation_type || '',
    sort_order: index,
  };
}

export function normalizeWorkoutExercises(exercises) {
  return (Array.isArray(exercises) ? exercises : []).map((exercise, index) => normalizeWorkoutExercise(exercise, index));
}

export function reindexWorkoutExercises(exercises) {
  return normalizeWorkoutExercises(exercises).map((exercise, index) => ({
    ...exercise,
    sort_order: index,
  }));
}

export function toSupabaseWorkoutExerciseRows(workoutId, exercises) {
  return reindexWorkoutExercises(exercises).map((exercise, index) => ({
    workout_id: workoutId,
    exercise_index: exercise.exercise_index,
    exercise_id: exercise.exercise_id,
    name: exercise.name,
    category: exercise.category || null,
    duration: exercise.duration ?? null,
    use_sets: Boolean(exercise.use_sets),
    sets: exercise.use_sets ? (exercise.sets ?? 3) : null,
    reps: exercise.use_sets ? (exercise.reps ?? 10) : (exercise.reps ?? null),
    weight_kg: exercise.weight_kg ?? null,
    animation_type: exercise.animation_type || null,
    sort_order: index,
  }));
}

export function fromSupabaseWorkoutExerciseRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((row, index) => normalizeWorkoutExercise({
      exercise_index: row.exercise_index,
      exercise_id: row.exercise_id,
      name: row.name,
      category: row.category || '',
      duration: row.duration ?? 90,
      use_sets: row.use_sets,
      sets: row.sets,
      reps: row.reps,
      weight_kg: row.weight_kg,
      animation_type: row.animation_type || '',
      sort_order: row.sort_order ?? index,
    }, index));
}

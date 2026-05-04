import { DEFAULT_EXERCISES, getPrimaryCategory } from './exerciseData';
import { createWorkout, listWorkouts } from './workoutDataService';

const MORNING_ROUTINE_EXERCISES = [
  "Clamshell",
  "Glute Bridge",
  "Seated Band Hold",
  "Side Walks",
  "Fire Hydrant",
  "Standing Hip Abduction",
  "Dead Bug",
  "Pallof Press",
];

function toEntityFormat(ex) {
  return {
    name: ex.name,
    category: getPrimaryCategory(ex),
    description: ex.shortDescription,
    muscles: ex.muscles ? ex.muscles.join(', ') : '',
    tips: ex.notes || '',
    animation_type: ex.animationKey || '',
    exercise_index: ex.index,
    video_url: '',
  };
}

export async function seedExercisesIfNeeded() {
  try {
    const workouts = await listWorkouts();
    if (workouts.length > 0) return;

    const allExercises = DEFAULT_EXERCISES.map((exercise) => toEntityFormat(exercise));
    const defaultExercises = MORNING_ROUTINE_EXERCISES
      .map((name) => {
        const exercise = allExercises.find((item) => item.name === name);
        if (!exercise) return null;
        return {
          exercise_id: exercise.id || String(exercise.exercise_index),
          name: exercise.name,
          category: exercise.category,
          duration: 90,
          animation_type: exercise.animation_type,
          exercise_index: exercise.exercise_index,
        };
      })
      .filter(Boolean);

    await createWorkout({
      name: "Morning Routine",
      weekday: "",
      exercises: defaultExercises,
      sort_order: 0,
      workout_number: 1,
    });
  } catch (_) {}
}

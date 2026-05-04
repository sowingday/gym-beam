/**
 * normalize.js - robuste Normalisierungsfunktionen fuer Daten aus localStorage und APIs.
 * Verhindert typische Typfehler bei Arrays und Strings.
 */

/** Stellt sicher, dass ein Wert ein Array ist. Strings werden per Komma gesplittet. */
export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Sicheres Split: funktioniert auch wenn value bereits ein Array ist.
 * Gibt immer ein Array von Strings zurueck.
 */
export function splitToArray(value, sep = ',') {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed.split(sep).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Stellt sicher, dass ein Wert ein String ist. Arrays werden mit Komma gejoint. */
export function safeString(value, sep = ', ') {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(sep);
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Gibt die stabile, eindeutige ID einer Uebung zurueck.
 * Bevorzugt index/exercise_index als Number und faellt nur dann auf id zurueck.
 */
export function getExerciseKey(exercise) {
  if (!exercise) return null;
  if (exercise.index != null) return Number(exercise.index);
  if (exercise.exercise_index != null) return Number(exercise.exercise_index);
  if (exercise.id && exercise.id !== 'undefined') return exercise.id;
  return null;
}

/** Normalisiert ein Workout-Objekt so dass exercises und weekdays immer Arrays sind. */
export function normalizeWorkout(w) {
  if (!w || typeof w !== 'object') return w;
  return {
    ...w,
    exercises: toArray(w.exercises),
    weekdays: toArray(w.weekdays),
  };
}

/**
 * Normalisiert ein Exercise-Objekt fuer einheitliche Verwendung in der App.
 * - categories/muscles/musclesLatin -> immer Array
 * - exercise_index wird aus index gesetzt falls nicht vorhanden
 */
export function normalizeExercise(e) {
  if (!e || typeof e !== 'object') return e;
  const exercise_index = e.exercise_index != null
    ? Number(e.exercise_index)
    : e.index != null
      ? Number(e.index)
      : null;
  return {
    ...e,
    exercise_index,
    categories: toArray(e.categories),
    muscles: toArray(e.muscles),
    musclesLatin: toArray(e.musclesLatin),
  };
}

/** Normalisiert ein Array von Workouts. */
export function normalizeWorkouts(arr) {
  return toArray(arr).map(normalizeWorkout);
}

/** Normalisiert ein Array von Exercises. */
export function normalizeExercises(arr) {
  return toArray(arr).map(normalizeExercise);
}

/** Normalisiert ein WorkoutTemplate-Objekt. */
export function normalizeTemplate(t) {
  if (!t || typeof t !== 'object') return t;
  return {
    ...t,
    exercises: toArray(t.exercises).map((ex) => {
      if (!ex || typeof ex !== 'object') return ex;
      const exercise_index = ex.exercise_index != null
        ? Number(ex.exercise_index)
        : ex.index != null
          ? Number(ex.index)
          : null;
      return { ...ex, exercise_index };
    }),
  };
}

/** Normalisiert ein Array von WorkoutTemplates. */
export function normalizeTemplates(arr) {
  return toArray(arr).map(normalizeTemplate);
}

/** Stellt sicher dass beliebige API-Listen immer Arrays sind. */
export function safeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

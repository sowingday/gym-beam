/**
 * lib/workoutHistory.js
 *
 * Lokale Trainingshistorie — gespeichert unter "wb_workout_history".
 * Jeder abgeschlossene Trainingsdurchlauf wird als Session-Objekt gespeichert.
 *
 * Schema einer Session:
 * {
 *   id: "session_<timestamp>_<random>",
 *   workout_id: string,
 *   workout_name: string,
 *   workout_color: string,
 *   completed_at: ISO string,
 *   duration_seconds: number,
 *   exercise_count: number,
 *   exercises: [{ exercise_index, name, weight_kg, reps, duration, sets }]
 * }
 *
 * Für spätere Supabase-Sync: ersetze load/save durch API-Calls in dieser Datei.
 */

const KEY = 'wb_workout_history';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function save(sessions) {
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

function generateId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/**
 * Speichert einen abgeschlossenen Trainingsdurchlauf.
 * @param {object} session - Trainingsdaten
 * @returns {object} gespeicherte Session mit id
 */
export function saveWorkoutSession(session) {
  const sessions = load();
  const entry = {
    ...session,
    id: session.id || generateId(),
    completed_at: session.completed_at || new Date().toISOString(),
  };
  sessions.push(entry);
  save(sessions);
  return entry;
}

/**
 * Gibt alle gespeicherten Sessions zurück (neueste zuerst).
 */
export function getAllSessions() {
  return load().sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
}

/**
 * Gibt Sessions als Achievement-kompatible Objekte zurück,
 * damit Achievements.jsx ohne Änderung die lokalen Daten nutzen kann.
 * Format: { date, exercise_count, training_duration, workout_id, workout_color }
 */
export function getSessionsAsAchievements() {
  return load().map(s => ({
    id: s.id,
    date: s.completed_at ? s.completed_at.split('T')[0] : new Date().toISOString().split('T')[0],
    exercise_count: s.exercise_count || 0,
    training_duration: s.duration_seconds || 0,
    workout_id: s.workout_id || '',
    workout_color: s.workout_color || '#212121',
  }));
}

/**
 * Gibt ExerciseLog-kompatible Objekte zurück für die Fortschritts-Charts.
 * Format: { date, exercise_name, weight_kg, duration, reps, workout_id }
 */
export function getSessionsAsExerciseLogs() {
  const logs = [];
  load().forEach(s => {
    const date = s.completed_at ? s.completed_at.split('T')[0] : new Date().toISOString().split('T')[0];
    (s.exercises || []).forEach(ex => {
      if (ex.name) {
        logs.push({
          date,
          exercise_name: ex.name,
          weight_kg: ex.weight_kg ?? null,
          duration: ex.duration ?? null,
          reps: ex.reps ?? null,
          workout_id: s.workout_id || '',
        });
      }
    });
  });
  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Löscht alle gespeicherten Sessions.
 */
export function clearHistory() {
  save([]);
}
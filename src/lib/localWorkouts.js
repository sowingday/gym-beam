/**
 * localWorkouts.js
 *
 * localStorage-basierter Workout-Speicher als Fallback wenn kein Remote-Backend verfuegbar ist.
 * Workouts werden unter dem Key "cw_local_workouts" gespeichert.
 */

import { normalizeWorkouts } from './normalize';

const KEY = 'wb_local_workouts';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return normalizeWorkouts(raw);
  } catch (_) {
    return [];
  }
}

function save(workouts) {
  localStorage.setItem(KEY, JSON.stringify(workouts));
}

function generateId() {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export const localWorkouts = {
  list() {
    return load().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  },

  mergeWithRemote(remoteWorkouts) {
    const remote = normalizeWorkouts(remoteWorkouts);
    const local = load();
    const localById = new Map(local.map((workout) => [workout.id, workout]));
    const merged = remote.map((workout) => {
      const localOverride = localById.get(workout.id);
      return localOverride ? { ...workout, ...localOverride } : workout;
    });
    const remoteIds = new Set(remote.map((workout) => workout.id));
    const localOnly = local.filter((workout) => !remoteIds.has(workout.id));
    return [...merged, ...localOnly].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  },

  create(data) {
    const workouts = load();
    const newWorkout = { ...data, id: generateId(), created_date: new Date().toISOString() };
    workouts.push(newWorkout);
    save(workouts);
    return newWorkout;
  },

  upsert(workout) {
    const workouts = load();
    const index = workouts.findIndex((entry) => entry.id === workout.id);
    if (index === -1) {
      workouts.push(workout);
      save(workouts);
      return workout;
    }
    workouts[index] = { ...workouts[index], ...workout };
    save(workouts);
    return workouts[index];
  },

  update(id, data) {
    const workouts = load();
    const index = workouts.findIndex((workout) => workout.id === id);
    if (index === -1) {
      const shadowWorkout = { id, ...data, updated_date: new Date().toISOString() };
      workouts.push(shadowWorkout);
      save(workouts);
      return shadowWorkout;
    }
    workouts[index] = { ...workouts[index], ...data };
    save(workouts);
    return workouts[index];
  },

  delete(id) {
    save(load().filter(w => w.id !== id));
  },

  get(id) {
    return load().find(w => w.id === id) || null;
  },
};

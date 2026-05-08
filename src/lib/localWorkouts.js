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
    return load().filter((workout) => !workout?._deleted).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  },

  mergeWithRemote(remoteWorkouts) {
    const remote = normalizeWorkouts(remoteWorkouts);
    const local = load();
    const localById = new Map(local.map((workout) => [workout.id, workout]));
    const remoteIds = new Set(remote.map((workout) => workout.id));
    const merged = remote.map((workout) => {
      const localOverride = localById.get(workout.id);
      if (localOverride?._deleted) return null;
      if (localOverride?._pendingRemoteSync) {
        return { ...workout, ...localOverride };
      }
      return workout;
    });
    const retainedLocal = local.filter((workout) => !remoteIds.has(workout.id) || workout._pendingRemoteSync);
    if (retainedLocal.length !== local.length) {
      save(retainedLocal);
    }
    const localOnly = retainedLocal.filter((workout) => !remoteIds.has(workout.id));
    return [...merged.filter(Boolean), ...localOnly.filter((workout) => !workout?._deleted)]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
      const shadowWorkout = { id, ...data, updated_date: new Date().toISOString(), _pendingRemoteSync: !String(id).startsWith('local_') };
      workouts.push(shadowWorkout);
      save(workouts);
      return shadowWorkout;
    }
    workouts[index] = {
      ...workouts[index],
      ...data,
      _pendingRemoteSync: workouts[index]._pendingRemoteSync || !String(id).startsWith('local_'),
    };
    save(workouts);
    return workouts[index];
  },

  delete(id, options = {}) {
    const workouts = load();
    const index = workouts.findIndex((workout) => workout.id === id);
    if (options.pendingRemoteSync && index === -1) {
      workouts.push({ id, _deleted: true, _pendingRemoteSync: true, updated_date: new Date().toISOString() });
      save(workouts);
      return true;
    }
    if (options.pendingRemoteSync && index >= 0 && !String(id).startsWith('local_')) {
      workouts[index] = {
        ...workouts[index],
        _deleted: true,
        _pendingRemoteSync: true,
        updated_date: new Date().toISOString(),
      };
      save(workouts);
      return true;
    }
    save(workouts.filter((workout) => workout.id !== id));
    return true;
  },

  clearRemoteShadow(id) {
    if (!id || String(id).startsWith('local_')) return;
    save(load().filter((workout) => workout.id !== id));
  },

  replaceId(oldId, nextWorkout) {
    const workouts = load();
    const remaining = workouts.filter((workout) => workout.id !== oldId && workout.id !== nextWorkout?.id);
    if (nextWorkout) {
      remaining.push(nextWorkout);
    }
    save(remaining);
    return nextWorkout || null;
  },

  get(id) {
    const workout = load().find((entry) => entry.id === id) || null;
    return workout?._deleted ? null : workout;
  },
};

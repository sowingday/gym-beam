import { normalizeTemplates, normalizeWorkouts } from './normalize';
import { LOCAL_TEMPLATES } from './localTemplates';
import { localWorkouts } from './localWorkouts';
import { enqueueSyncOperation, processSyncQueue, resolveWorkoutId } from './offlineSync';
import { fromSupabaseWorkoutExerciseRows, normalizeWorkoutExercises, reindexWorkoutExercises, toSupabaseWorkoutExerciseRows } from './workoutExerciseStore';
import { ensureCurrentSupabaseProfile } from './userService';
import { hasSupabaseConfig, supabase } from './supabaseClient';
import { getSessionById, getSessionsAsAchievements, getSessionsAsExerciseLogs, updateSession } from './workoutHistory';

const LOCAL_BODY_WEIGHTS_KEY = 'wb_local_body_weights';

function parseJsonValue(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
}

function toSupabaseWorkoutRow(userId, data) {
  const normalizedExercises = reindexWorkoutExercises(data.exercises);
  return {
    user_id: userId,
    name: data.name,
    color: data.color || null,
    weekday: data.weekday || null,
    weekdays: Array.isArray(data.weekdays) ? data.weekdays : [],
    exercises: normalizedExercises,
    sort_order: data.sort_order ?? 0,
    workout_number: data.workout_number ?? null,
  };
}

function fromSupabaseWorkoutRow(row) {
  if (!row) return null;
  return {
    ...row,
    weekdays: parseJsonValue(row.weekdays, []),
    exercises: normalizeWorkoutExercises(parseJsonValue(row.exercises, [])),
  };
}

function fromSupabaseTemplateRow(row) {
  if (!row) return null;
  return {
    ...row,
    category: row.category || '',
    tags: row.tags || '',
    exercises: normalizeWorkoutExercises(parseJsonValue(row.exercises, [])),
  };
}

function fromSupabaseAchievementRow(row) {
  if (!row) return null;
  return {
    ...row,
    workout_color: row.workout_color || '#212121',
  };
}

function fromSupabaseExerciseLogRow(row) {
  if (!row) return null;
  const payload = parseJsonValue(row.payload, {});
  return {
    id: row.id,
    date: row.date,
    workout_id: row.workout_id || '',
    exercise_name: payload.exercise_name || payload.name || '',
    weight_kg: payload.weight_kg ?? null,
    duration: payload.duration ?? null,
    reps: payload.reps ?? null,
    exercise_index: payload.exercise_index ?? null,
  };
}

function fromSupabaseBodyWeightRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    weight_kg: row.weight,
    pending: false,
  };
}

function loadLocalBodyWeights() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_BODY_WEIGHTS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function saveLocalBodyWeights(entries) {
  localStorage.setItem(LOCAL_BODY_WEIGHTS_KEY, JSON.stringify(entries));
}

function upsertLocalBodyWeight(date, weightKg, pending) {
  const entries = loadLocalBodyWeights();
  const nextEntry = {
    date,
    weight_kg: weightKg,
    pending,
    updated_at: new Date().toISOString(),
  };
  const index = entries.findIndex((entry) => entry.date === date);
  if (index === -1) {
    entries.push(nextEntry);
  } else {
    entries[index] = { ...entries[index], ...nextEntry };
  }
  entries.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  saveLocalBodyWeights(entries);
  return nextEntry;
}

function mergeBodyWeights(remoteEntries, localEntries) {
  const mergedByDate = new Map((Array.isArray(remoteEntries) ? remoteEntries : []).map((entry) => [entry.date, entry]));
  (Array.isArray(localEntries) ? localEntries : []).forEach((entry) => {
    if (!entry?.date) return;
    if (entry.pending || !mergedByDate.has(entry.date)) {
      mergedByDate.set(entry.date, entry);
    }
  });
  return Array.from(mergedByDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

async function getSupabaseUserId() {
  const user = await ensureCurrentSupabaseProfile();
  return user?.id || null;
}

async function fetchWorkoutExercisesByWorkoutIds(workoutIds) {
  if (!Array.isArray(workoutIds) || workoutIds.length === 0 || !supabase) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('workout_exercises')
    .select('*')
    .in('workout_id', workoutIds)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const grouped = new Map();
  (Array.isArray(data) ? data : []).forEach((row) => {
    const current = grouped.get(row.workout_id) || [];
    current.push(row);
    grouped.set(row.workout_id, current);
  });
  return grouped;
}

async function replaceSupabaseWorkoutExercises(workoutId, exercises) {
  if (!supabase || !workoutId) return [];

  const normalizedExercises = normalizeWorkoutExercises(exercises);
  const reindexedExercises = reindexWorkoutExercises(normalizedExercises);
  const { error: deleteError } = await supabase.from('workout_exercises').delete().eq('workout_id', workoutId);
  if (deleteError) throw deleteError;

  if (reindexedExercises.length === 0) return reindexedExercises;

  const rows = toSupabaseWorkoutExerciseRows(workoutId, reindexedExercises);
  const { data, error } = await supabase.from('workout_exercises').insert(rows).select('*');
  if (error) throw error;
  return fromSupabaseWorkoutExerciseRows(data).map((exercise, index) => ({
    ...exercise,
    client_key: reindexedExercises[index]?.client_key || exercise.client_key,
  }));
}

async function migrateLegacyWorkoutExercises(workouts, exerciseRowsByWorkoutId) {
  if (!Array.isArray(workouts) || workouts.length === 0 || !supabase) return;

  for (const workout of workouts) {
    const hasNormalizedRows = (exerciseRowsByWorkoutId.get(workout.id) || []).length > 0;
    const legacyExercises = normalizeWorkoutExercises(workout.exercises);
    if (hasNormalizedRows || legacyExercises.length === 0) continue;

    try {
      await replaceSupabaseWorkoutExercises(workout.id, legacyExercises);
      exerciseRowsByWorkoutId.set(workout.id, toSupabaseWorkoutExerciseRows(workout.id, legacyExercises));
    } catch (error) {
      console.error('[workoutDataService] Failed to migrate legacy workout exercises.', workout.id, error);
    }
  }
}

function mergeWorkoutWithExercises(workout, exerciseRowsByWorkoutId) {
  const exerciseRows = exerciseRowsByWorkoutId.get(workout.id) || [];
  const fallbackExercises = normalizeWorkoutExercises(workout.exercises);
  const fallbackExercisesBySortOrder = new Map(fallbackExercises.map((exercise, index) => [exercise.sort_order ?? index, exercise]));
  const normalizedExercises = exerciseRows.length > 0
    ? fromSupabaseWorkoutExerciseRows(exerciseRows).map((exercise, index) => {
      const fallbackExercise = fallbackExercisesBySortOrder.get(exercise.sort_order ?? index);
      if (!fallbackExercise?.client_key) return exercise;
      return {
        ...exercise,
        client_key: fallbackExercise.client_key,
      };
    })
    : fallbackExercises;
  return {
    ...workout,
    exercises: normalizedExercises,
  };
}

export async function listWorkouts() {
  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const remoteWorkouts = normalizeWorkouts((Array.isArray(data) ? data : []).map(fromSupabaseWorkoutRow));
      const exerciseRowsByWorkoutId = await fetchWorkoutExercisesByWorkoutIds(remoteWorkouts.map((workout) => workout.id));
      await migrateLegacyWorkoutExercises(remoteWorkouts, exerciseRowsByWorkoutId);
      const hydratedWorkouts = remoteWorkouts.map((workout) => mergeWorkoutWithExercises(workout, exerciseRowsByWorkoutId));
      return localWorkouts.mergeWithRemote(hydratedWorkouts);
    }
  } catch (_) {}

  return localWorkouts.list();
}

export async function getWorkoutById(id) {
  const mappedId = resolveWorkoutId(id);
  if (mappedId && mappedId !== id && String(id).startsWith('local_')) {
    id = mappedId;
  }
  if (id?.startsWith('local_')) return localWorkouts.get(id) || null;

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      const remoteWorkoutBase = fromSupabaseWorkoutRow(data);
      if (!remoteWorkoutBase) return localWorkouts.get(id) || null;
      const exerciseRowsByWorkoutId = await fetchWorkoutExercisesByWorkoutIds([id]);
      await migrateLegacyWorkoutExercises([remoteWorkoutBase], exerciseRowsByWorkoutId);
      const remoteWorkout = mergeWorkoutWithExercises(remoteWorkoutBase, exerciseRowsByWorkoutId);
      const localWorkout = localWorkouts.get(id);
      if (localWorkout?._pendingRemoteSync) {
        return { ...remoteWorkout, ...localWorkout };
      }
      localWorkouts.clearRemoteShadow(id);
      return remoteWorkout;
    }
  } catch (_) {}

  return localWorkouts.get(id) || null;
}

export async function createWorkout(data) {
  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const row = toSupabaseWorkoutRow(userId, data);
      const { data: created, error } = await supabase.from('workouts').insert(row).select().single();
      if (error) throw error;
      const remoteWorkout = fromSupabaseWorkoutRow(created);
      const syncedExercises = await replaceSupabaseWorkoutExercises(remoteWorkout.id, data.exercises || []);
      return { ...remoteWorkout, exercises: syncedExercises };
    }
  } catch (_) {}

  const localWorkout = localWorkouts.create({ ...data, _pendingRemoteSync: true });
  enqueueSyncOperation('workout_create', {
    localId: localWorkout.id,
    data: {
      name: localWorkout.name,
      color: localWorkout.color,
      weekday: localWorkout.weekday,
      weekdays: localWorkout.weekdays,
      exercises: localWorkout.exercises,
      sort_order: localWorkout.sort_order,
      workout_number: localWorkout.workout_number,
    },
  });
  processSyncQueue().catch(() => {});
  return localWorkout;
}

export async function updateWorkout(id, data) {
  const mappedId = resolveWorkoutId(id);
  if (String(id).startsWith('local_') && mappedId === id) {
    const updatedLocalWorkout = localWorkouts.update(id, { ...data, _pendingRemoteSync: true });
    enqueueSyncOperation('workout_update', { workoutId: id, data });
    processSyncQueue().catch(() => {});
    return updatedLocalWorkout;
  }
  if (mappedId && mappedId !== id) {
    id = mappedId;
  }

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const nextExercises = data.exercises === undefined ? undefined : reindexWorkoutExercises(data.exercises);
      const patch = {
        name: data.name,
        color: data.color,
        weekday: data.weekday,
        weekdays: Array.isArray(data.weekdays) ? data.weekdays : data.weekdays === undefined ? undefined : [],
        exercises: nextExercises,
        sort_order: data.sort_order,
        workout_number: data.workout_number,
      };
      Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);
      const { data: updated, error } = await supabase
        .from('workouts')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      localWorkouts.clearRemoteShadow(id);
      const remoteWorkout = fromSupabaseWorkoutRow(updated);
      const syncedExercises = data.exercises === undefined
        ? remoteWorkout.exercises
        : await replaceSupabaseWorkoutExercises(id, data.exercises);
      return { ...remoteWorkout, exercises: syncedExercises };
    }
  } catch (_) {}

  const pendingWorkout = localWorkouts.update(id, { ...data, _pendingRemoteSync: true });
  enqueueSyncOperation('workout_update', { workoutId: id, data });
  processSyncQueue().catch(() => {});
  return pendingWorkout;
}

export async function deleteWorkout(id) {
  const mappedId = resolveWorkoutId(id);
  if (String(id).startsWith('local_') && mappedId === id) {
    localWorkouts.delete(id);
    enqueueSyncOperation('workout_delete', { workoutId: id });
    return true;
  }
  if (mappedId && mappedId !== id) {
    id = mappedId;
  }

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { error } = await supabase.from('workouts').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      localWorkouts.clearRemoteShadow(id);
      return true;
    }
  } catch (_) {}

  localWorkouts.delete(id, { pendingRemoteSync: true });
  enqueueSyncOperation('workout_delete', { workoutId: id });
  processSyncQueue().catch(() => {});
  return true;
}

export async function listWorkoutTemplates() {
  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const items = normalizeTemplates((Array.isArray(data) ? data : []).map(fromSupabaseTemplateRow));
      if (items.length > 0) return items;
    }
  } catch (_) {}

  return normalizeTemplates(LOCAL_TEMPLATES);
}

export async function getWorkoutTemplateById(id) {
  const local = LOCAL_TEMPLATES.find((template) => template.id === id);
  if (local) return local;

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return fromSupabaseTemplateRow(data);
    }
  } catch (_) {}

  return null;
}

export async function listAchievements() {
  const localAchievements = getSessionsAsAchievements().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (localAchievements.length > 0) return localAchievements;

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (Array.isArray(data) ? data : []).map(fromSupabaseAchievementRow).filter(Boolean);
    }
  } catch (_) {}

  return [];
}

export async function listAchievementsForUser(userId) {
  try {
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (Array.isArray(data) ? data : []).map(fromSupabaseAchievementRow).filter(Boolean);
    }
  } catch (_) {}

  return [];
}

export async function getLatestAchievement() {
  const achievements = await listAchievements();
  return Array.isArray(achievements) && achievements.length > 0 ? achievements[0] : null;
}

export async function listBodyWeights() {
  const localBodyWeights = loadLocalBodyWeights();
  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('body_weights')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;
      const remoteBodyWeights = (Array.isArray(data) ? data : []).map(fromSupabaseBodyWeightRow).filter(Boolean);
      return mergeBodyWeights(remoteBodyWeights, localBodyWeights.filter((entry) => entry.pending));
    }
  } catch (_) {}

  return localBodyWeights;
}

export async function upsertBodyWeightForDate(date, weightKg) {
  const normalizedWeight = Number(weightKg);
  if (!date || !Number.isFinite(normalizedWeight)) {
    return false;
  }

  upsertLocalBodyWeight(date, normalizedWeight, true);

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data: existing, error: existingError } = await supabase
        .from('body_weights')
        .select('id')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing?.id) {
        const { error } = await supabase.from('body_weights').update({ weight: normalizedWeight }).eq('id', existing.id);
        if (error) throw error;
        upsertLocalBodyWeight(date, normalizedWeight, false);
        return true;
      }

      const { error } = await supabase.from('body_weights').insert({ user_id: userId, date, weight: normalizedWeight });
      if (error) throw error;
      upsertLocalBodyWeight(date, normalizedWeight, false);
      return true;
    }
  } catch (error) {
    console.error('[workoutDataService] Failed to sync body weight entry.', error);
  }

  enqueueSyncOperation('body_weight_upsert', { date, weightKg: normalizedWeight });
  processSyncQueue().catch(() => {});
  return false;
}

export async function listExerciseLogs() {
  const localLogs = getSessionsAsExerciseLogs();
  if (localLogs.length > 0) return localLogs;

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;
      return (Array.isArray(data) ? data : []).map(fromSupabaseExerciseLogRow).filter(Boolean);
    }
  } catch (_) {}

  return [];
}

export async function recordCompletedWorkout({ workoutId, workoutColor, exerciseCount, duration, exercises, sessionId = null }) {
  const session = sessionId ? getSessionById(sessionId) : null;
  const date = session?.completed_at ? session.completed_at.split('T')[0] : new Date().toISOString().split('T')[0];
  const resolvedWorkoutId = resolveWorkoutId(workoutId);
  const normalizedWorkoutId = resolvedWorkoutId && !String(resolvedWorkoutId).startsWith('local_') ? resolvedWorkoutId : null;

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { error: achievementError } = await supabase.from('achievements').upsert({
        user_id: userId,
        date,
        exercise_count: exerciseCount,
        training_duration: duration,
        workout_id: normalizedWorkoutId,
        workout_color: workoutColor || '#212121',
        client_session_id: sessionId,
      }, { onConflict: 'user_id,client_session_id' });

      if (achievementError) throw achievementError;

      for (let index = 0; index < exercises.length; index += 1) {
        const exercise = exercises[index];
        const payload = {
          exercise_name: exercise.exercise_name,
          weight_kg: exercise.weight_kg ?? null,
          reps: exercise.reps ?? null,
          duration: exercise.duration ?? null,
          exercise_index: exercise.exercise_index ?? index,
        };

        const { error } = await supabase.from('exercise_logs').upsert({
          user_id: userId,
          workout_id: normalizedWorkoutId,
          date,
          client_log_id: sessionId ? `${sessionId}:${index}` : null,
          payload,
        }, { onConflict: 'user_id,client_log_id' });

        if (error) throw error;
      }
      if (sessionId) {
        updateSession(sessionId, {
          sync_status: 'synced',
          synced_at: new Date().toISOString(),
        });
      }
      return true;
    }
  } catch (error) {
    console.error('[workoutDataService] Failed to record completed workout remotely.', error);
  }

  if (sessionId) {
    enqueueSyncOperation('workout_session_record', {
      sessionId,
      workoutId,
    });
    processSyncQueue().catch(() => {});
  }
  return false;
}

import { getSupabaseAuthUser } from './authClient';
import { localWorkouts } from './localWorkouts';
import { queryClientInstance } from './query-client';
import { hasSupabaseConfig, supabase } from './supabaseClient';
import { fromSupabaseWorkoutExerciseRows, normalizeWorkoutExercises, reindexWorkoutExercises, toSupabaseWorkoutExerciseRows } from './workoutExerciseStore';
import { getSessionById, updateSession } from './workoutHistory';

const QUEUE_KEY = 'wb_sync_queue';
const WORKOUT_ID_MAP_KEY = 'wb_workout_id_map';

let processingPromise = null;

function loadQueue() {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function loadWorkoutIdMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(WORKOUT_ID_MAP_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (_) {
    return {};
  }
}

function saveWorkoutIdMap(map) {
  localStorage.setItem(WORKOUT_ID_MAP_KEY, JSON.stringify(map));
}

function setWorkoutIdMapping(localId, remoteId) {
  if (!localId || !remoteId || localId === remoteId) return;
  const map = loadWorkoutIdMap();
  map[localId] = remoteId;
  saveWorkoutIdMap(map);
}

function removeWorkoutIdMapping(id) {
  const map = loadWorkoutIdMap();
  let changed = false;
  Object.keys(map).forEach((key) => {
    if (key === id || map[key] === id) {
      delete map[key];
      changed = true;
    }
  });
  if (changed) saveWorkoutIdMap(map);
}

export function resolveWorkoutId(id) {
  if (!id) return id;
  const map = loadWorkoutIdMap();
  return map[id] || id;
}

function replaceQueuedWorkoutReferences(queue, oldId, newId) {
  return queue.map((operation) => {
    if (operation.payload?.workoutId === oldId) {
      return {
        ...operation,
        payload: { ...operation.payload, workoutId: newId },
      };
    }
    if (operation.type === 'workout_create' && operation.payload?.localId === oldId) {
      return {
        ...operation,
        payload: { ...operation.payload, localId: newId },
      };
    }
    if (operation.type === 'workout_session_record' && operation.payload?.workoutId === oldId) {
      return {
        ...operation,
        payload: { ...operation.payload, workoutId: newId },
      };
    }
    return operation;
  });
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
    weekdays: Array.isArray(row.weekdays) ? row.weekdays : row.weekdays ? JSON.parse(row.weekdays) : [],
    exercises: normalizeWorkoutExercises(Array.isArray(row.exercises) ? row.exercises : row.exercises ? JSON.parse(row.exercises) : []),
  };
}

async function replaceSupabaseWorkoutExercises(workoutId, exercises) {
  const normalizedExercises = reindexWorkoutExercises(exercises);
  const { error: deleteError } = await supabase.from('workout_exercises').delete().eq('workout_id', workoutId);
  if (deleteError) throw deleteError;

  if (normalizedExercises.length === 0) return normalizedExercises;

  const rows = toSupabaseWorkoutExerciseRows(workoutId, normalizedExercises);
  const { data, error } = await supabase.from('workout_exercises').insert(rows).select('*');
  if (error) throw error;
  return fromSupabaseWorkoutExerciseRows(data).map((exercise, index) => ({
    ...exercise,
    client_key: normalizedExercises[index]?.client_key || exercise.client_key,
  }));
}

function mapProfileFieldsToSupabase(fields) {
  const row = {};

  if (fields.profile_name !== undefined) {
    row.display_name = fields.profile_name || null;
    row.username = fields.profile_name || null;
  }
  if (fields.displayName !== undefined && row.display_name === undefined) {
    row.display_name = fields.displayName || null;
  }
  if (fields.username !== undefined) row.username = fields.username || null;
  if (fields.profile_gender !== undefined) row.profile_gender = fields.profile_gender || null;
  if (fields.profile_age !== undefined) row.profile_age = fields.profile_age ?? null;
  if (fields.profile_height !== undefined) row.profile_height = fields.profile_height ?? null;
  if (fields.profile_weight !== undefined) row.profile_weight = fields.profile_weight ?? null;
  if (fields.profile_picture !== undefined) row.profile_picture = fields.profile_picture || null;

  return row;
}

function invalidateSyncedQueries() {
  queryClientInstance.invalidateQueries({ queryKey: ['workouts'] });
  queryClientInstance.invalidateQueries({ queryKey: ['achievements'] });
  queryClientInstance.invalidateQueries({ queryKey: ['bodyweights'] });
  queryClientInstance.invalidateQueries({ queryKey: ['exerciselogs'] });
}

function buildOperation(type, payload) {
  return {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
}

export function enqueueSyncOperation(type, payload) {
  const queue = loadQueue();

  if (type === 'profile_upsert') {
    const existing = queue.find((entry) => entry.type === 'profile_upsert');
    if (existing) {
      existing.payload = { ...existing.payload, ...payload };
      saveQueue(queue);
      return existing;
    }
  }

  if (type === 'body_weight_upsert') {
    const existing = queue.find((entry) => entry.type === 'body_weight_upsert' && entry.payload?.date === payload.date);
    if (existing) {
      existing.payload = { ...existing.payload, ...payload };
      saveQueue(queue);
      return existing;
    }
  }

  if (type === 'workout_create') {
    const existing = queue.find((entry) => entry.type === 'workout_create' && entry.payload?.localId === payload.localId);
    if (existing) {
      existing.payload = { ...existing.payload, data: { ...existing.payload.data, ...payload.data } };
      saveQueue(queue);
      return existing;
    }
  }

  if (type === 'workout_update') {
    const createEntry = queue.find((entry) => entry.type === 'workout_create' && entry.payload?.localId === payload.workoutId);
    if (createEntry) {
      createEntry.payload = {
        ...createEntry.payload,
        data: { ...createEntry.payload.data, ...payload.data },
      };
      saveQueue(queue);
      return createEntry;
    }
    const existing = queue.find((entry) => entry.type === 'workout_update' && entry.payload?.workoutId === payload.workoutId);
    if (existing) {
      existing.payload = { ...existing.payload, data: { ...existing.payload.data, ...payload.data } };
      saveQueue(queue);
      return existing;
    }
  }

  if (type === 'workout_delete') {
    const filtered = queue.filter((entry) => {
      if ((entry.type === 'workout_create' || entry.type === 'workout_update') && entry.payload?.localId === payload.workoutId) return false;
      if ((entry.type === 'workout_create' || entry.type === 'workout_update') && entry.payload?.workoutId === payload.workoutId) return false;
      return true;
    });
    if (String(payload.workoutId).startsWith('local_') && resolveWorkoutId(payload.workoutId) === payload.workoutId) {
      saveQueue(filtered);
      return null;
    }
    const existing = filtered.find((entry) => entry.type === 'workout_delete' && entry.payload?.workoutId === payload.workoutId);
    if (existing) {
      saveQueue(filtered);
      return existing;
    }
    const op = buildOperation(type, payload);
    filtered.push(op);
    saveQueue(filtered);
    return op;
  }

  if (type === 'workout_session_record') {
    const existing = queue.find((entry) => entry.type === 'workout_session_record' && entry.payload?.sessionId === payload.sessionId);
    if (existing) return existing;
  }

  const op = buildOperation(type, payload);
  queue.push(op);
  saveQueue(queue);
  return op;
}

async function processProfileUpsert(authUser, payload) {
  const row = {
    id: authUser.id,
    ...mapProfileFieldsToSupabase(payload),
  };
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) throw error;

  const metadata = {};
  if (row.display_name !== undefined) {
    metadata.profile_name = row.display_name;
    metadata.display_name = row.display_name;
  }
  if (row.profile_picture !== undefined) {
    metadata.avatar_url = row.profile_picture;
  }
  if (Object.keys(metadata).length > 0) {
    await supabase.auth.updateUser({ data: metadata });
  }
}

async function processWorkoutCreate(userId, queue, operation) {
  const { localId, data } = operation.payload;
  const mappedId = resolveWorkoutId(localId);
  if (mappedId && mappedId !== localId) {
    const patch = {
      name: data.name,
      color: data.color,
      weekday: data.weekday,
      weekdays: Array.isArray(data.weekdays) ? data.weekdays : [],
      exercises: Array.isArray(data.exercises) ? data.exercises : [],
      sort_order: data.sort_order,
      workout_number: data.workout_number,
    };
    const { error } = await supabase.from('workouts').update(patch).eq('id', mappedId).eq('user_id', userId);
    if (error) throw error;
    await replaceSupabaseWorkoutExercises(mappedId, data.exercises || []);
    return queue;
  }

  const { data: created, error } = await supabase
    .from('workouts')
    .insert(toSupabaseWorkoutRow(userId, data))
    .select('*')
    .single();

  if (error) throw error;

  const remoteWorkout = fromSupabaseWorkoutRow(created);
  const syncedExercises = await replaceSupabaseWorkoutExercises(remoteWorkout.id, data.exercises || []);
  setWorkoutIdMapping(localId, remoteWorkout.id);
  localWorkouts.replaceId(localId, { ...remoteWorkout, exercises: syncedExercises });
  return replaceQueuedWorkoutReferences(queue, localId, remoteWorkout.id);
}

async function processWorkoutUpdate(userId, payload) {
  const workoutId = resolveWorkoutId(payload.workoutId);
  if (!workoutId || String(workoutId).startsWith('local_')) {
    throw new Error(`Workout ${payload.workoutId} is not ready for remote sync yet.`);
  }

  const patch = {
    name: payload.data.name,
    color: payload.data.color,
    weekday: payload.data.weekday,
    weekdays: Array.isArray(payload.data.weekdays) ? payload.data.weekdays : payload.data.weekdays === undefined ? undefined : [],
    exercises: payload.data.exercises === undefined ? undefined : reindexWorkoutExercises(payload.data.exercises),
    sort_order: payload.data.sort_order,
    workout_number: payload.data.workout_number,
  };
  Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);

  const { data: updated, error } = await supabase
    .from('workouts')
    .update(patch)
    .eq('id', workoutId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  if (payload.data.exercises !== undefined) {
    await replaceSupabaseWorkoutExercises(workoutId, payload.data.exercises);
  }
  localWorkouts.clearRemoteShadow(payload.workoutId);
  if (payload.workoutId !== workoutId) {
    const nextExercises = payload.data.exercises === undefined
      ? fromSupabaseWorkoutRow(updated).exercises
      : reindexWorkoutExercises(payload.data.exercises);
    localWorkouts.replaceId(payload.workoutId, { ...fromSupabaseWorkoutRow(updated), exercises: nextExercises });
  }
}

async function processWorkoutDelete(userId, payload) {
  const workoutId = resolveWorkoutId(payload.workoutId);
  if (!workoutId || String(workoutId).startsWith('local_')) {
    localWorkouts.delete(payload.workoutId);
    return;
  }
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId).eq('user_id', userId);
  if (error) throw error;
  localWorkouts.delete(payload.workoutId);
  localWorkouts.delete(workoutId);
  removeWorkoutIdMapping(payload.workoutId);
}

async function processBodyWeightUpsert(userId, payload) {
  const { data: existing, error: existingError } = await supabase
    .from('body_weights')
    .select('id')
    .eq('user_id', userId)
    .eq('date', payload.date)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabase.from('body_weights').update({ weight: payload.weightKg }).eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('body_weights').insert({
    user_id: userId,
    date: payload.date,
    weight: payload.weightKg,
  });
  if (error) throw error;
}

function normalizeWorkoutIdForSession(workoutId) {
  const resolved = resolveWorkoutId(workoutId);
  if (!resolved || String(resolved).startsWith('local_')) return null;
  return resolved;
}

async function processWorkoutSessionRecord(userId, payload) {
  const session = payload.sessionId ? getSessionById(payload.sessionId) : payload.session;
  if (!session) return;

  const date = session.completed_at ? session.completed_at.split('T')[0] : new Date().toISOString().split('T')[0];
  const workoutId = normalizeWorkoutIdForSession(payload.workoutId || session.workout_id);

  const { error: achievementError } = await supabase.from('achievements').upsert({
    user_id: userId,
    date,
    exercise_count: session.exercise_count || 0,
    training_duration: session.duration_seconds || 0,
    workout_id: workoutId,
    workout_color: session.workout_color || '#212121',
    client_session_id: session.id || payload.sessionId || null,
  }, { onConflict: 'user_id,client_session_id' });
  if (achievementError) throw achievementError;

  for (let index = 0; index < (session.exercises || []).length; index += 1) {
    const exercise = session.exercises[index];
    const { error } = await supabase.from('exercise_logs').upsert({
      user_id: userId,
      workout_id: workoutId,
      date,
      client_log_id: `${session.id || payload.sessionId}:${index}`,
      payload: {
        exercise_name: exercise.name,
        weight_kg: exercise.weight_kg ?? null,
        reps: exercise.reps ?? null,
        duration: exercise.duration ?? null,
        exercise_index: exercise.exercise_index ?? index,
      },
    }, { onConflict: 'user_id,client_log_id' });
    if (error) throw error;
  }

  if (session.id) {
    updateSession(session.id, {
      sync_status: 'synced',
      synced_at: new Date().toISOString(),
    });
  }
}

async function processOperation(authUser, queue, operation) {
  switch (operation.type) {
    case 'profile_upsert':
      await processProfileUpsert(authUser, operation.payload);
      return queue;
    case 'workout_create':
      return processWorkoutCreate(authUser.id, queue, operation);
    case 'workout_update':
      await processWorkoutUpdate(authUser.id, operation.payload);
      return queue;
    case 'workout_delete':
      await processWorkoutDelete(authUser.id, operation.payload);
      return queue;
    case 'body_weight_upsert':
      await processBodyWeightUpsert(authUser.id, operation.payload);
      return queue;
    case 'workout_session_record':
      await processWorkoutSessionRecord(authUser.id, operation.payload);
      return queue;
    default:
      return queue;
  }
}

export async function processSyncQueue() {
  if (processingPromise) return processingPromise;

  processingPromise = (async () => {
    if (!navigator.onLine || !hasSupabaseConfig || !supabase) {
      return { processed: 0, remaining: loadQueue().length };
    }

    const authUser = await getSupabaseAuthUser();
    if (!authUser) {
      return { processed: 0, remaining: loadQueue().length };
    }

    let queue = loadQueue();
    let processed = 0;

    while (queue.length > 0) {
      const operation = queue[0];
      try {
        queue = await processOperation(authUser, queue, operation);
        queue = queue.filter((entry) => entry.id !== operation.id);
        saveQueue(queue);
        processed += 1;
      } catch (error) {
        console.error('[offlineSync] Failed to process queue entry.', operation.type, error);
        break;
      }
    }

    invalidateSyncedQueries();
    return { processed, remaining: queue.length };
  })();

  try {
    return await processingPromise;
  } finally {
    processingPromise = null;
  }
}

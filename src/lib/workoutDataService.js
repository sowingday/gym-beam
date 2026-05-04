import { normalizeTemplates, normalizeWorkouts } from './normalize';
import { LOCAL_TEMPLATES } from './localTemplates';
import { localWorkouts } from './localWorkouts';
import { getSupabaseAuthUser } from './authClient';
import { hasSupabaseConfig, supabase } from './supabaseClient';
import { getSessionsAsAchievements, getSessionsAsExerciseLogs } from './workoutHistory';

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
  return {
    user_id: userId,
    name: data.name,
    color: data.color || null,
    weekday: data.weekday || null,
    weekdays: Array.isArray(data.weekdays) ? data.weekdays : [],
    exercises: Array.isArray(data.exercises) ? data.exercises : [],
    sort_order: data.sort_order ?? 0,
    workout_number: data.workout_number ?? null,
  };
}

function fromSupabaseWorkoutRow(row) {
  if (!row) return null;
  return {
    ...row,
    weekdays: parseJsonValue(row.weekdays, []),
    exercises: parseJsonValue(row.exercises, []),
  };
}

function fromSupabaseTemplateRow(row) {
  if (!row) return null;
  return {
    ...row,
    category: row.category || '',
    tags: row.tags || '',
    exercises: parseJsonValue(row.exercises, []),
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
  };
}

async function getSupabaseUserId() {
  const user = await getSupabaseAuthUser();
  return user?.id || null;
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
      return localWorkouts.mergeWithRemote(normalizeWorkouts((Array.isArray(data) ? data : []).map(fromSupabaseWorkoutRow)));
    }
  } catch (_) {}

  return localWorkouts.list();
}

export async function getWorkoutById(id) {
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
      const remoteWorkout = fromSupabaseWorkoutRow(data);
      const localWorkout = localWorkouts.get(id);
      if (!remoteWorkout) return localWorkout || null;
      return localWorkout ? { ...remoteWorkout, ...localWorkout } : remoteWorkout;
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
      return fromSupabaseWorkoutRow(created);
    }
  } catch (_) {}

  return localWorkouts.create(data);
}

export async function updateWorkout(id, data) {
  if (id?.startsWith('local_')) return localWorkouts.update(id, data);

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const patch = {
        name: data.name,
        color: data.color,
        weekday: data.weekday,
        weekdays: Array.isArray(data.weekdays) ? data.weekdays : data.weekdays === undefined ? undefined : [],
        exercises: Array.isArray(data.exercises) ? data.exercises : data.exercises === undefined ? undefined : [],
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
      return fromSupabaseWorkoutRow(updated);
    }
  } catch (_) {}

  return localWorkouts.update(id, data);
}

export async function deleteWorkout(id) {
  if (id?.startsWith('local_')) return localWorkouts.delete(id);

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { error } = await supabase.from('workouts').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      return true;
    }
  } catch (_) {}

  return localWorkouts.delete(id);
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
  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('body_weights')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;
      return (Array.isArray(data) ? data : []).map(fromSupabaseBodyWeightRow).filter(Boolean);
    }
  } catch (_) {}

  return [];
}

export async function upsertBodyWeightForDate(date, weightKg) {
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
        const { error } = await supabase.from('body_weights').update({ weight: weightKg }).eq('id', existing.id);
        if (error) throw error;
        return true;
      }

      const { error } = await supabase.from('body_weights').insert({ user_id: userId, date, weight: weightKg });
      if (error) throw error;
      return true;
    }
  } catch (_) {}

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

export async function recordCompletedWorkout({ workoutId, workoutColor, exerciseCount, duration, exercises }) {
  const date = new Date().toISOString().split('T')[0];

  try {
    const userId = await getSupabaseUserId();
    if (userId && hasSupabaseConfig && supabase) {
      const { error: achievementError } = await supabase.from('achievements').insert({
        user_id: userId,
        date,
        exercise_count: exerciseCount,
        training_duration: duration,
        workout_id: workoutId,
        workout_color: workoutColor || '#212121',
      });

      if (achievementError) throw achievementError;

      for (const exercise of exercises) {
        const payload = {
          exercise_name: exercise.exercise_name,
          weight_kg: exercise.weight_kg ?? null,
          reps: exercise.reps ?? null,
          duration: exercise.duration ?? null,
          exercise_index: exercise.exercise_index ?? null,
        };

        const { error } = await supabase.from('exercise_logs').insert({
          user_id: userId,
          workout_id: workoutId,
          date,
          payload,
        });

        if (error) throw error;
      }
      return true;
    }
  } catch (_) {}

  return false;
}

import { ensureCurrentSupabaseProfile } from './userService';
import { hasSupabaseConfig, supabase } from './supabaseClient';

export function isSocialAvailable() {
  return Boolean(hasSupabaseConfig && supabase && navigator.onLine);
}

function normalizeFollowRecord(record) {
  if (!record) return null;
  return {
    ...record,
    follower_id: record.follower_id || '',
    following_id: record.following_id || '',
    follower_name: record.follower_name || '',
    following_name: record.following_name || '',
    follower_email: record.follower_email || '',
    following_email: record.following_email || '',
    created_date: record.created_date || record.created_at || null,
  };
}

function normalizeWorkoutShare(record) {
  if (!record) return null;
  return {
    ...record,
    workout_data: typeof record.workout_data === 'string' ? record.workout_data : JSON.stringify(record.workout_data || {}),
    created_date: record.created_date || record.created_at || null,
  };
}

export async function fetchFollows() {
  if (!isSocialAvailable()) return [];
  try {
    const supabaseUser = await ensureCurrentSupabaseProfile();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .or(`follower_id.eq.${supabaseUser.id},following_id.eq.${supabaseUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (Array.isArray(data) ? data : []).map(normalizeFollowRecord).filter(Boolean);
    }
  } catch (_) {}

  return [];
}

export async function followUser({ followerId, followerName, followerEmail, followingId, followingName, followingEmail }) {
  if (!isSocialAvailable()) return false;
  try {
    const supabaseUser = await ensureCurrentSupabaseProfile();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const payload = {
        follower_id: followerId,
        following_id: followingId || '',
        follower_name: followerName || '',
        following_name: followingName || '',
        follower_email: followerEmail || '',
        following_email: followingEmail || '',
      };

      const { error } = await supabase.from('follows').insert(payload);
      if (error) throw error;
      return true;
    }
  } catch (_) {}

  return false;
}

export async function unfollowUser(followId) {
  if (!isSocialAvailable()) return false;
  try {
    const supabaseUser = await ensureCurrentSupabaseProfile();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { error } = await supabase.from('follows').delete().eq('id', followId);
      if (error) throw error;
      return true;
    }
  } catch (_) {}

  return false;
}

export function deriveFriends(allFollows, me) {
  const follows = Array.isArray(allFollows) ? allFollows : [];
  if (!follows.length || !me?.id) return [];

  const iFollow = new Set(
    follows
      .filter((f) => f.follower_id === me.id)
      .map((f) => f.following_id)
      .filter(Boolean),
  );

  return follows
    .filter((f) => f.following_id === me.id)
    .filter((f) => iFollow.has(f.follower_id))
    .map((f) => ({
      id: f.follower_id,
      name: f.follower_name,
      email: f.follower_email,
    }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function fetchInboxMessages(userId) {
  if (!isSocialAvailable()) return [];
  try {
    const supabaseUser = await ensureCurrentSupabaseProfile();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('workout_shares')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (Array.isArray(data) ? data : []).map(normalizeWorkoutShare).filter(Boolean);
    }
  } catch (_) {}

  return [];
}

export async function sendWorkoutShare({ senderId, senderName, recipientId, recipientName, workout }) {
  if (!isSocialAvailable()) return false;
  const payload = {
    sender_id: senderId,
    sender_name: senderName,
    recipient_id: recipientId,
    recipient_name: recipientName,
    workout_name: workout.name,
    workout_data: {
      name: workout.name,
      color: workout.color,
      exercises: workout.exercises,
    },
    read: false,
  };

  try {
    const supabaseUser = await ensureCurrentSupabaseProfile();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { error } = await supabase.from('workout_shares').insert(payload);
      if (error) throw error;
      return true;
    }
  } catch (_) {}

  return false;
}

export async function sendInboxShare({ senderId, senderName, recipientId, recipientName, title, payload }) {
  if (!isSocialAvailable()) return false;
  const record = {
    sender_id: senderId,
    sender_name: senderName,
    recipient_id: recipientId,
    recipient_name: recipientName,
    workout_name: title,
    workout_data: payload,
    read: false,
  };

  try {
    const supabaseUser = await ensureCurrentSupabaseProfile();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { error } = await supabase.from('workout_shares').insert(record);
      if (error) throw error;
      return true;
    }
  } catch (_) {}

  return false;
}

export async function markMessageRead(messageId) {
  if (!isSocialAvailable()) return false;
  try {
    const supabaseUser = await ensureCurrentSupabaseProfile();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { error } = await supabase.from('workout_shares').update({ read: true }).eq('id', messageId);
      if (error) throw error;
      return true;
    }
  } catch (_) {}

  return false;
}

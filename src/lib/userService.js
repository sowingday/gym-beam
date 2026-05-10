/**
 * userService.js
 *
 * Central profile/user logic with local fallback.
 * Priority order:
 * 1. Supabase auth + profiles/storage
 * 2. localStorage guest profile
 */

import { getCurrentAuthUser, getSupabaseAuthUser } from './authClient';
import { enqueueSyncOperation, processSyncQueue } from './offlineSync';
import { profileNameExists } from './profileDirectory';
import { hasSupabaseConfig, supabase } from './supabaseClient';

const LOCAL_USER_KEY = 'wb_local_user';
const MAX_AVATAR_BYTES = 800 * 1024;
const SUPABASE_AVATAR_BUCKET = 'avatars';

function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateGuestName() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `User-${n}`;
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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
  if (fields.username !== undefined) {
    row.username = fields.username || null;
  }
  if (fields.profile_gender !== undefined) {
    row.profile_gender = fields.profile_gender || null;
  }
  if (fields.profile_age !== undefined) {
    row.profile_age = toNumberOrNull(fields.profile_age);
  }
  if (fields.profile_height !== undefined) {
    row.profile_height = toNumberOrNull(fields.profile_height);
  }
  if (fields.profile_weight !== undefined) {
    row.profile_weight = toNumberOrNull(fields.profile_weight);
  }
  if (fields.profile_picture !== undefined) {
    row.profile_picture = fields.profile_picture || null;
  }

  return row;
}

function mapSupabaseProfileToAppUser(authUser, profile, local) {
  const displayName = profile?.display_name
    || authUser?.profile_name
    || authUser?.full_name
    || local.displayName;

  return {
    ...local,
    ...authUser,
    profile_name: profile?.display_name || authUser?.profile_name || local.profile_name || local.displayName,
    displayName,
    username: profile?.username || local.username || null,
    profile_gender: profile?.profile_gender ?? local.profile_gender ?? null,
    profile_age: profile?.profile_age ?? local.profile_age ?? null,
    profile_height: profile?.profile_height ?? local.profile_height ?? null,
    profile_weight: profile?.profile_weight ?? local.profile_weight ?? null,
    profile_picture: profile?.profile_picture || authUser?.profile_picture || local.profile_picture || null,
    created_at: authUser?.created_at || local.created_at || null,
    _isOnline: true,
    _authSource: 'supabase',
  };
}

async function fetchSupabaseProfile(userId) {
  if (!hasSupabaseConfig || !supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureSupabaseProfile(authUser, local) {
  if (!hasSupabaseConfig || !supabase || !authUser?.id) return null;

  const existing = await fetchSupabaseProfile(authUser.id);
  if (existing) return existing;

  const seedRow = {
    id: authUser.id,
    username: local.username || authUser.profile_name || null,
    display_name: authUser.profile_name || local.displayName || null,
    profile_gender: local.profile_gender || null,
    profile_age: local.profile_age ?? null,
    profile_height: local.profile_height ?? null,
    profile_weight: local.profile_weight ?? null,
    profile_picture: authUser.profile_picture || local.profile_picture || null,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(seedRow, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function ensureCurrentSupabaseProfile() {
  if (!hasSupabaseConfig || !supabase) return null;

  const authUser = await getSupabaseAuthUser();
  if (!authUser) return null;

  const local = getLocalUser();
  const profile = await ensureSupabaseProfile(authUser, local);
  const merged = mapSupabaseProfileToAppUser(authUser, profile, local);

  saveLocalProfile({
    displayName: merged.displayName,
    profile_name: merged.profile_name,
    username: merged.username,
    profile_gender: merged.profile_gender,
    profile_age: merged.profile_age,
    profile_height: merged.profile_height,
    profile_weight: merged.profile_weight,
    profile_picture: merged.profile_picture,
  });

  return merged;
}

async function upsertSupabaseProfile(authUser, fields, local) {
  if (!hasSupabaseConfig || !supabase || !authUser?.id) return null;

  const row = {
    id: authUser.id,
    ...mapProfileFieldsToSupabase(fields),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;

  const metadata = {};
  if (row.display_name !== undefined) metadata.profile_name = row.display_name;
  if (row.display_name !== undefined) metadata.display_name = row.display_name;
  if (row.profile_picture !== undefined) metadata.avatar_url = row.profile_picture;

  if (Object.keys(metadata).length > 0) {
    await supabase.auth.updateUser({ data: metadata });
  }

  const merged = mapSupabaseProfileToAppUser(authUser, data, local);
  saveLocalProfile({
    displayName: merged.displayName,
    profile_name: merged.profile_name,
    username: merged.username,
    profile_gender: merged.profile_gender,
    profile_age: merged.profile_age,
    profile_height: merged.profile_height,
    profile_weight: merged.profile_weight,
    profile_picture: merged.profile_picture,
  });

  return merged;
}

async function uploadSupabaseAvatar(authUser, file) {
  if (!hasSupabaseConfig || !supabase || !authUser?.id) return null;

  const extension = file.name?.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const path = `${authUser.id}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(SUPABASE_AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl || null;
  if (!publicUrl) {
    throw new Error('Supabase avatar upload succeeded but no public URL was returned.');
  }

  await upsertSupabaseProfile(authUser, { profile_picture: publicUrl }, getLocalUser());
  return publicUrl;
}

export function getLocalUser() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      if (!u.localUserId) {
        u.localUserId = generateLocalId();
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(u));
      }
      return u;
    }
  } catch (_) {}

  const newUser = {
    localUserId: generateLocalId(),
    displayName: generateGuestName(),
    created_at: new Date().toISOString(),
    username: null,
    profile_gender: null,
    profile_age: null,
    profile_height: null,
    profile_weight: null,
    profile_picture: null,
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
  return newUser;
}

export function saveLocalProfile(fields) {
  const current = getLocalUser();
  const updated = { ...current, ...fields };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
  return updated;
}

export async function saveLocalAvatar(file) {
  if (!file || !file.type.startsWith('image/')) {
    return { ok: false, reason: 'Keine gültige Bilddatei.' };
  }
  if (file.size > MAX_AVATAR_BYTES) {
      return { ok: false, reason: 'Bild zu groß für lokale Speicherung (max. ~600 KB). Bitte ein kleineres Bild wählen.' };
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      try {
        saveLocalProfile({ profile_picture: dataUrl });
        resolve({ ok: true, dataUrl });
      } catch (_) {
        resolve({ ok: false, reason: 'Lokaler Speicher voll. Bitte ein kleineres Bild wählen.' });
      }
    };
    reader.onerror = () => resolve({ ok: false, reason: 'Fehler beim Lesen der Datei.' });
    reader.readAsDataURL(file);
  });
}

export async function checkProfileNameAvailable(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return false;

  try {
    const supabaseUser = await getSupabaseAuthUser();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .maybeSingle();

      if (error) throw error;
      return !data || data.id === supabaseUser.id;
    }
  } catch (_) {}

  try {
    const currentUser = await getCurrentAuthUser();
    const exists = await profileNameExists(trimmed, currentUser?.id || null);
    return !exists;
  } catch (_) {
    return null;
  }
}

export async function getCurrentUser() {
  const local = getLocalUser();

  try {
    const merged = await ensureCurrentSupabaseProfile();
    if (merged) return merged;
  } catch (error) {
    console.error('[userService] Failed to load or create Supabase profile.', error);
  }

  return { ...local, displayName: local.displayName, _isOnline: false, _authSource: 'local' };
}

export async function saveProfile(_legacyArg, fields) {
  const local = saveLocalProfile(fields);

  try {
    const supabaseUser = await getSupabaseAuthUser();
    if (supabaseUser) {
      await ensureSupabaseProfile(supabaseUser, local);
      await upsertSupabaseProfile(supabaseUser, fields, local);
      await processSyncQueue().catch(() => {});
      return { ok: true, source: 'supabase' };
    }
  } catch (error) {
    console.error('[userService] Failed to save profile to Supabase.', error);
  }

  enqueueSyncOperation('profile_upsert', fields);
  processSyncQueue().catch(() => {});
  return { ok: true, source: 'local' };
}

export async function uploadAvatar(_legacyArg, file) {
  if (!file || !file.type.startsWith('image/')) {
    return { ok: false, reason: 'Keine gültige Bilddatei.' };
  }

  try {
    const supabaseUser = await getSupabaseAuthUser();
    if (supabaseUser) {
      await ensureSupabaseProfile(supabaseUser, getLocalUser());
      const publicUrl = await uploadSupabaseAvatar(supabaseUser, file);
      saveLocalProfile({ profile_picture: publicUrl });
      return { ok: true, url: publicUrl, source: 'supabase' };
    }
  } catch (error) {
    console.error('[userService] Failed to upload avatar to Supabase.', error);
  }

  const result = await saveLocalAvatar(file);
  if (result.ok) {
    return { ok: true, url: result.dataUrl, source: 'local' };
  }
  return { ok: false, reason: result.reason };
}

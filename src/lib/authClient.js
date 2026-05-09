import { hasSupabaseConfig, supabase } from './supabaseClient';

function pickSupabaseDisplayName(user) {
  const metadata = user?.user_metadata || {};
  return metadata.profile_name
    || metadata.display_name
    || metadata.full_name
    || (typeof user?.email === 'string' ? user.email.split('@')[0] : '')
    || null;
}

export function normalizeSupabaseUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || null,
    profile_name: pickSupabaseDisplayName(user),
    full_name: user.user_metadata?.full_name || null,
    profile_picture: user.user_metadata?.avatar_url || null,
    auth_source: 'supabase',
    rawUser: user,
  };
}

export async function getSupabaseAuthUser() {
  if (!hasSupabaseConfig || !supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return normalizeSupabaseUser(data.user);
}

export async function getSupabaseSessionUser() {
  if (!hasSupabaseConfig || !supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user) return null;
  return normalizeSupabaseUser(data.session.user);
}

export async function getCurrentAuthUser() {
  const sessionUser = await getSupabaseSessionUser();
  if (sessionUser) return sessionUser;
  return getSupabaseAuthUser();
}

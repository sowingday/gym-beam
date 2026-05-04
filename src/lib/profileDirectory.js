import { getSupabaseAuthUser } from './authClient';
import { hasSupabaseConfig, supabase } from './supabaseClient';

function normalizeProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    profile_name: profile.profile_name || profile.display_name || profile.username || '',
    username: profile.username || profile.profile_name || profile.display_name || '',
    display_name: profile.display_name || profile.profile_name || '',
    email: profile.email || '',
    profile_picture: profile.profile_picture || null,
  };
}

export async function listDirectoryProfiles(currentUser = null) {
  try {
    const supabaseUser = await getSupabaseAuthUser();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture')
        .order('display_name', { ascending: true });

      if (error) throw error;
      return (Array.isArray(data) ? data : [])
        .map(normalizeProfile)
        .filter((profile) => profile?.profile_name)
        .filter((profile) => profile.id !== currentUser?.id);
    }
  } catch (_) {}

  return [];
}

export async function getDirectoryProfileByUsername(username) {
  try {
    const supabaseUser = await getSupabaseAuthUser();
    if (supabaseUser && hasSupabaseConfig && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture')
        .or(`username.eq.${username},display_name.eq.${username}`)
        .maybeSingle();

      if (error) throw error;
      return normalizeProfile(data);
    }
  } catch (_) {}

  return null;
}

export async function profileNameExists(name, currentUserId = null) {
  const profile = await getDirectoryProfileByUsername(name);
  if (!profile) return false;
  if (currentUserId && profile.id === currentUserId) return false;
  return true;
}

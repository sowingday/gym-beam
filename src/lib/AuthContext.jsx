import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getSupabaseAuthUser } from './authClient';
import { processSyncQueue } from './offlineSync';
import { hasSupabaseConfig, supabase } from './supabaseClient';

const AuthContext = createContext();

function isRecoveryUrl() {
  if (typeof window === 'undefined') return false;

  const query = new URLSearchParams(window.location.search);
  if (query.get('type') === 'recovery') return true;

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  return hashParams.get('type') === 'recovery';
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authSource, setAuthSource] = useState(null);
  const [authFlowMode, setAuthFlowMode] = useState(() => (isRecoveryUrl() ? 'password-recovery' : null));

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await getSupabaseAuthUser();
      if (currentUser) {
        const { ensureCurrentSupabaseProfile } = await import('./userService');
        await ensureCurrentSupabaseProfile();
        await processSyncQueue();
      }
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setAuthSource(currentUser ? 'supabase' : null);
      setAuthError(null);
      setAuthChecked(true);
      return currentUser;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthSource(null);
      setAuthError({
        type: 'auth_required',
        message: error?.message || 'Authentication required',
      });
      setAuthChecked(true);
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) {
      setAuthError({
        type: 'missing_supabase_config',
        message: 'Supabase is not configured.',
      });
      setIsAuthenticated(false);
      setAuthChecked(true);
      setIsLoadingAuth(false);
      return;
    }

    await checkUserAuth();
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) return undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || isRecoveryUrl()) {
        setAuthFlowMode('password-recovery');
      }

      if (!session?.user) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthSource(null);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        return;
      }

      const normalizedUser = await getSupabaseAuthUser();
      if (normalizedUser) {
        const { ensureCurrentSupabaseProfile } = await import('./userService');
        await ensureCurrentSupabaseProfile();
        await processSyncQueue();
      }
      setUser(normalizedUser);
      setIsAuthenticated(Boolean(normalizedUser));
      setAuthSource(normalizedUser ? 'supabase' : null);
      setAuthError(null);
      setAuthChecked(true);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      processSyncQueue().catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const signInWithPassword = async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthFlowMode(null);
    await checkUserAuth();
  };

  const signUpWithPassword = async (email, password, displayName = '') => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          profile_name: displayName || email.split('@')[0],
        },
      },
    });
    if (error) throw error;
  };

  const requestPasswordReset = async (email) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const updatePassword = async (password) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setAuthFlowMode(null);
    window.history.replaceState({}, document.title, window.location.pathname);
    await checkUserAuth();
  };

  const exitPasswordRecovery = () => {
    setAuthFlowMode(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const logout = async (shouldRedirect = true) => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsAuthenticated(false);
    setAuthSource(null);
    setAuthChecked(true);
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {};

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authChecked,
      authSource,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      checkUserAuth,
      signInWithPassword,
      signUpWithPassword,
      requestPasswordReset,
      updatePassword,
      authFlowMode,
      exitPasswordRecovery,
    }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

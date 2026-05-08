import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getSupabaseAuthUser } from './authClient';
import { hasSupabaseConfig, supabase } from './supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authSource, setAuthSource] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await getSupabaseAuthUser();
      if (currentUser) {
        const { ensureCurrentSupabaseProfile } = await import('./userService');
        await ensureCurrentSupabaseProfile();
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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

  const signInWithPassword = async (email, password) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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

import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import WorkoutPlan from './pages/WorkoutPlan.jsx';
import WorkoutDetail from './pages/WorkoutDetail';
import ExerciseSelection from './pages/ExerciseSelection';
import ExerciseDetails from './pages/ExerciseDetails';
import ExerciseDatabase from './pages/ExerciseDatabase';
import Training from './pages/Training';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';
import Achievements from './pages/Achievements';
import WorkoutCalendar from './pages/WorkoutCalendar';
import FindFriends from './pages/FindFriends';
import FriendProfile from './pages/FriendProfile';
import WorkoutDatabase from './pages/WorkoutDatabase';
import WorkoutTemplatePage from './pages/WorkoutTemplatePage.jsx';
import SharedWorkout from './pages/SharedWorkout';
import AICoach from './pages/AICoach';
import UsernameSetupDialog from './components/UsernameSetupDialog';
import AuthScreen from './components/AuthScreen';
import { LanguageProvider } from './lib/i18n';
import { getCurrentAuthUser } from './lib/authClient';

const AndroidBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return undefined;

    let listenerHandle = null;
    let disposed = false;

    CapacitorApp.addListener('backButton', () => {
      if (location.pathname !== '/') {
        navigate(-1);
        return;
      }
      CapacitorApp.exitApp();
    }).then((handle) => {
      if (disposed) {
        handle.remove();
        return;
      }
      listenerHandle = handle;
    });

    return () => {
      disposed = true;
      listenerHandle?.remove();
    };
  }, [location.pathname, navigate]);

  return null;
};

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, user, authFlowMode, authDebug } = useAuth();
  const [checkingUsername, setCheckingUsername] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [startupDebugVisible, setStartupDebugVisible] = useState(false);

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;
    if (authError) {
      console.info('[App] Username check skipped because authError is set.');
      setCheckingUsername(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        console.error('[App] Username check timed out. Continuing without blocking the app.');
        setCheckingUsername(false);
      }
    }, 5000);

    import('./lib/userService')
      .then(({ getLocalUser }) => {
        if (cancelled) return;
        const local = getLocalUser();
        console.info('[App] Local username candidate:', local.displayName || '(leer)');
        if (local.displayName && local.displayName.trim().length >= 4) {
          window.clearTimeout(timeoutId);
          setCheckingUsername(false);
          return;
        }

        getCurrentAuthUser().then((currentUser) => {
          if (cancelled) return;
          const name = currentUser?.profile_name || currentUser?.displayName;
          console.info('[App] Auth username candidate:', name || '(leer)');
          if (!name || name.trim().length < 4) {
            setNeedsUsername(true);
          }
          window.clearTimeout(timeoutId);
          setCheckingUsername(false);
        }).catch(() => {
          if (cancelled) return;
          window.clearTimeout(timeoutId);
          setNeedsUsername(true);
          setCheckingUsername(false);
        });
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setCheckingUsername(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [authError, isLoadingAuth, isLoadingPublicSettings, user]);

  useEffect(() => {
    const shouldShow = isLoadingPublicSettings || isLoadingAuth || checkingUsername;
    if (!shouldShow) {
      setStartupDebugVisible(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStartupDebugVisible(true);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [checkingUsername, isLoadingAuth, isLoadingPublicSettings]);

  if (isLoadingPublicSettings || isLoadingAuth || checkingUsername) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          {startupDebugVisible ? (
            <div className="max-w-sm rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
              <p className="text-sm font-semibold text-foreground">App startet noch...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {authDebug?.message || 'Initialisierung läuft.'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Auth lädt: {String(isLoadingAuth)} · Username-Check: {String(checkingUsername)}
              </p>
              <p className="text-xs text-muted-foreground">
                Stage: {authDebug?.stage || 'unbekannt'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (authFlowMode === 'password-recovery') {
    return <AuthScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <>
      {needsUsername ? <UsernameSetupDialog onDone={() => setNeedsUsername(false)} /> : null}
      <Routes>
        <Route path="/" element={<WorkoutPlan />} />
        <Route path="/workout/:id" element={<WorkoutDetail />} />
        <Route path="/select-exercise/:workoutId" element={<ExerciseSelection />} />
        <Route path="/exercise/:id" element={<ExerciseDetails />} />
        <Route path="/exercises" element={<ExerciseDatabase />} />
        <Route path="/training/:id" element={<Training />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/calendar" element={<WorkoutCalendar />} />
        <Route path="/find-friends" element={<FindFriends />} />
        <Route path="/friend/:username" element={<FriendProfile />} />
        <Route path="/workout-database" element={<WorkoutDatabase />} />
        <Route path="/workout-template/:id" element={<WorkoutTemplatePage />} />
        <Route path="/shared-workout" element={<SharedWorkout />} />
        <Route path="/ai-coach" element={<AICoach />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AndroidBackHandler />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="bottom-center" />
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

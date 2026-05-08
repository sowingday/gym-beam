import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, user } = useAuth();
  const [checkingUsername, setCheckingUsername] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;
    if (authError) {
      setCheckingUsername(false);
      return;
    }

    import('./lib/userService')
      .then(({ getLocalUser }) => {
        const local = getLocalUser();
        if (local.displayName && local.displayName.trim().length >= 4) {
          setCheckingUsername(false);
          return;
        }

        getCurrentAuthUser().then((currentUser) => {
          const name = currentUser?.profile_name || currentUser?.displayName;
          if (!name || name.trim().length < 4) {
            setNeedsUsername(true);
          }
          setCheckingUsername(false);
        }).catch(() => {
          setNeedsUsername(true);
          setCheckingUsername(false);
        });
      })
      .catch(() => {
        setCheckingUsername(false);
      });
  }, [authError, isLoadingAuth, isLoadingPublicSettings, user]);

  if (isLoadingPublicSettings || isLoadingAuth || checkingUsername) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
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

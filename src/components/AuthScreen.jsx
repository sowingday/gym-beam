import React, { useState } from 'react';
import { Dumbbell, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';

export default function AuthScreen() {
  const { signInWithPassword, signUpWithPassword, isLoadingAuth } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await signInWithPassword(email.trim(), password);
      } else {
        await signUpWithPassword(email.trim(), password, displayName.trim());
        setSuccess('Account erstellt. Du kannst Dich jetzt anmelden.');
        setMode('login');
      }
    } catch (submitError) {
      setError(submitError?.message || 'Anmeldung fehlgeschlagen.');
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-[0_18px_60px_rgba(0,0,0,0.18)] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-wide text-foreground">Workout Base</h1>
            <p className="text-sm text-muted-foreground font-body">Supabase Login</p>
          </div>
        </div>

        <div className="flex rounded-xl overflow-hidden border border-border mb-5">
          <button
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 text-sm font-body font-semibold transition-colors ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
          >
            Anmelden
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 text-sm font-body font-semibold transition-colors ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
          >
            Registrieren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' ? (
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Anzeigename"
              autoComplete="nickname"
            />
          ) : null}
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-Mail"
            type="email"
            autoComplete="email"
          />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Passwort"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error ? <p className="text-sm text-destructive font-body">{error}</p> : null}
          {success ? <p className="text-sm text-green-600 font-body">{success}</p> : null}

          <Button type="submit" disabled={submitting || isLoadingAuth} className="w-full h-11 font-body gap-2">
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {submitting ? 'Bitte warten...' : mode === 'login' ? 'Einloggen' : 'Account erstellen'}
          </Button>
        </form>
      </div>
    </div>
  );
}

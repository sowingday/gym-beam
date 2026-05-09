import React, { useEffect, useMemo, useState } from 'react';
import { Dumbbell, KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';

function buildSuggestedName(email) {
  const localPart = String(email || '').split('@')[0].trim();
  return localPart.length >= 4 ? localPart.slice(0, 40) : '';
}

function GermanFlagIcon() {
  return (
    <svg viewBox="0 0 24 16" className="h-4 w-5 rounded-[2px] shadow-sm" aria-hidden="true">
      <rect width="24" height="16" fill="#000000" />
      <rect y="5.333" width="24" height="5.333" fill="#dd0000" />
      <rect y="10.666" width="24" height="5.334" fill="#ffce00" />
    </svg>
  );
}

function UkFlagIcon() {
  return (
    <svg viewBox="0 0 24 16" className="h-4 w-5 rounded-[2px] shadow-sm" aria-hidden="true">
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="4" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" strokeWidth="2" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="6" />
      <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="3.5" />
    </svg>
  );
}

const COPY = {
  de: {
    login: 'Anmelden',
    signup: 'Registrieren',
    email: 'E-Mail',
    password: 'Passwort',
    username: 'Benutzername',
    usernameHint: 'Optional, kann auch später noch geändert werden.',
    emailHint: '(nicht öffentlich sichtbar)',
    signupIntro: 'Du bleibst auf diesem Gerät automatisch eingeloggt. Die Registrierung dient nur dem Speichern und Tracken Deiner eigenen Trainingsdaten sowie dem Verbinden und Austauschen mit anderen Benutzern.',
    wait: 'Bitte warten...',
    signInAction: 'Einloggen',
    signUpAction: 'Account erstellen',
    signUpSuccess: 'Account erstellt. Du kannst Dich jetzt anmelden.',
    signInFailed: 'Anmeldung fehlgeschlagen.',
    usernameTooShort: 'Wenn Du einen Benutzernamen eingibst, muss er mindestens 4 Zeichen haben.',
    forgotPassword: 'Passwort vergessen?',
    forgotIntro: 'Wir schicken Dir einen Link per E-Mail, damit Du ein neues Passwort setzen kannst.',
    sendResetLink: 'Reset-Link senden',
    backToLogin: 'Zurück zum Login',
    resetLinkSent: 'Wenn die E-Mail-Adresse existiert, wurde ein Reset-Link verschickt.',
    newPassword: 'Neues Passwort',
    confirmPassword: 'Neues Passwort wiederholen',
    saveNewPassword: 'Neues Passwort speichern',
    recoveryIntro: 'Bitte vergib jetzt ein neues Passwort für Deinen Account.',
    passwordMismatch: 'Die beiden Passwörter stimmen nicht überein.',
    passwordTooShort: 'Das neue Passwort muss mindestens 6 Zeichen haben.',
    passwordUpdated: 'Dein Passwort wurde aktualisiert. Du wirst jetzt wieder normal angemeldet weitergeleitet.',
  },
  en: {
    login: 'Sign in',
    signup: 'Sign up',
    email: 'Email',
    password: 'Password',
    username: 'Username',
    usernameHint: 'Optional, can still be changed later.',
    emailHint: '(not publicly visible)',
    signupIntro: 'You will stay signed in automatically on this device. Registration is only used to save and track your own training data and to connect and exchange with other users.',
    wait: 'Please wait...',
    signInAction: 'Sign in',
    signUpAction: 'Create account',
    signUpSuccess: 'Account created. You can sign in now.',
    signInFailed: 'Sign-in failed.',
    usernameTooShort: 'If you enter a username, it must be at least 4 characters long.',
    forgotPassword: 'Forgot password?',
    forgotIntro: 'We will send you an email link so you can set a new password.',
    sendResetLink: 'Send reset link',
    backToLogin: 'Back to sign in',
    resetLinkSent: 'If the email address exists, a reset link has been sent.',
    newPassword: 'New password',
    confirmPassword: 'Repeat new password',
    saveNewPassword: 'Save new password',
    recoveryIntro: 'Please set a new password for your account now.',
    passwordMismatch: 'The two passwords do not match.',
    passwordTooShort: 'The new password must be at least 6 characters long.',
    passwordUpdated: 'Your password has been updated. You will now continue signed in.',
  },
};

export default function AuthScreen() {
  const {
    signInWithPassword,
    signUpWithPassword,
    requestPasswordReset,
    updatePassword,
    exitPasswordRecovery,
    authFlowMode,
    isLoadingAuth,
  } = useAuth();
  const { language, setLanguage } = useI18n();
  const copy = useMemo(() => COPY[language] || COPY.de, [language]);

  const [mode, setMode] = useState('login');
  const [screenMode, setScreenMode] = useState(authFlowMode === 'password-recovery' ? 'reset' : 'auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== 'signup') return;
    if (displayNameTouched) return;

    const suggestedName = buildSuggestedName(email);
    setDisplayName(suggestedName);
  }, [displayNameTouched, email, mode]);

  useEffect(() => {
    setScreenMode(authFlowMode === 'password-recovery' ? 'reset' : 'auth');
  }, [authFlowMode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (screenMode === 'forgot') {
        await requestPasswordReset(email.trim());
        setSuccess(copy.resetLinkSent);
        return;
      }

      if (screenMode === 'reset') {
        if (password.length < 6) {
          throw new Error(copy.passwordTooShort);
        }
        if (password !== confirmPassword) {
          throw new Error(copy.passwordMismatch);
        }
        await updatePassword(password);
        setSuccess(copy.passwordUpdated);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      if (mode === 'login') {
        await signInWithPassword(email.trim(), password);
      } else {
        const trimmedName = displayName.trim();
        if (trimmedName.length > 0 && trimmedName.length < 4) {
          throw new Error(copy.usernameTooShort);
        }
        await signUpWithPassword(email.trim(), password, trimmedName);
        setSuccess(copy.signUpSuccess);
        setMode('login');
        setPassword('');
      }
    } catch (submitError) {
      setError(submitError?.message || copy.signInFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-[0_18px_60px_rgba(0,0,0,0.18)] p-6 md:p-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-display text-3xl tracking-wide text-foreground">Gym-Beam</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage('de')}
              className={`flex items-center justify-center rounded-full border px-2.5 py-1 text-sm transition-colors ${language === 'de' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60'}`}
              aria-label="Deutsch"
              title="Deutsch"
            >
              <GermanFlagIcon />
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`flex items-center justify-center rounded-full border px-2.5 py-1 text-sm transition-colors ${language === 'en' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60'}`}
              aria-label="English"
              title="English"
            >
              <UkFlagIcon />
            </button>
          </div>
        </div>

        {screenMode === 'auth' ? (
          <div className="mb-5 flex overflow-hidden rounded-xl border border-border">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2.5 text-sm font-body font-semibold transition-colors ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
            >
              {copy.login}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
                setSuccess('');
                setDisplayNameTouched(false);
                setDisplayName(buildSuggestedName(email));
              }}
              className={`flex-1 py-2.5 text-sm font-body font-semibold transition-colors ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
            >
              {copy.signup}
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          {screenMode === 'auth' && mode === 'signup' ? (
            <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm font-body leading-6 text-muted-foreground">
              {copy.signupIntro}
            </p>
          ) : null}

          {screenMode === 'forgot' ? (
            <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm font-body leading-6 text-muted-foreground">
              {copy.forgotIntro}
            </p>
          ) : null}

          {screenMode === 'reset' ? (
            <p className="rounded-2xl bg-muted/50 px-4 py-3 text-sm font-body leading-6 text-muted-foreground">
              {copy.recoveryIntro}
            </p>
          ) : null}

          {screenMode === 'auth' && mode === 'signup' ? (
            <div className="space-y-1">
              <Input
                key="signup-display-name"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setDisplayNameTouched(true);
                }}
                placeholder={copy.username}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                name="gymbeam-display-name"
              />
              <p className="pl-3 text-xs text-muted-foreground font-body">
                {copy.usernameHint}
              </p>
            </div>
          ) : null}

          {screenMode !== 'reset' ? (
            <div className="space-y-1">
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={copy.email}
                type="email"
                autoComplete="email"
              />
              {screenMode === 'auth' && mode === 'signup' ? (
                <p className="pl-3 text-xs text-muted-foreground font-body">
                  {copy.emailHint}
                </p>
              ) : null}
            </div>
          ) : null}

          {screenMode !== 'forgot' ? (
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={screenMode === 'reset' ? copy.newPassword : copy.password}
              type="password"
              autoComplete={screenMode === 'auth' && mode === 'login' ? 'current-password' : 'new-password'}
            />
          ) : null}

          {screenMode === 'reset' ? (
            <Input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={copy.confirmPassword}
              type="password"
              autoComplete="new-password"
            />
          ) : null}

          {screenMode === 'auth' && mode === 'login' ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setScreenMode('forgot');
                  setError('');
                  setSuccess('');
                  setPassword('');
                }}
                className="pr-1 text-sm font-body text-primary hover:underline"
              >
                {copy.forgotPassword}
              </button>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive font-body">{error}</p> : null}
          {success ? <p className="text-sm text-green-600 font-body">{success}</p> : null}

          <Button type="submit" disabled={submitting || isLoadingAuth} className="h-11 w-full gap-2 font-body">
            {screenMode === 'forgot' ? <Mail className="h-4 w-4" /> : null}
            {screenMode === 'reset' ? <KeyRound className="h-4 w-4" /> : null}
            {screenMode === 'auth' && mode === 'login' ? <LogIn className="h-4 w-4" /> : null}
            {screenMode === 'auth' && mode === 'signup' ? <UserPlus className="h-4 w-4" /> : null}
            {submitting
              ? copy.wait
              : screenMode === 'forgot'
                ? copy.sendResetLink
                : screenMode === 'reset'
                  ? copy.saveNewPassword
                  : mode === 'login'
                    ? copy.signInAction
                    : copy.signUpAction}
          </Button>

          {screenMode === 'forgot' ? (
            <button
              type="button"
              onClick={() => {
                setScreenMode('auth');
                setMode('login');
                setError('');
                setSuccess('');
              }}
              className="w-full text-sm font-body text-muted-foreground transition-colors hover:text-foreground"
            >
              {copy.backToLogin}
            </button>
          ) : null}

          {screenMode === 'reset' ? (
            <button
              type="button"
              onClick={() => {
                exitPasswordRecovery();
                setScreenMode('auth');
                setMode('login');
                setPassword('');
                setConfirmPassword('');
                setError('');
                setSuccess('');
              }}
              className="w-full text-sm font-body text-muted-foreground transition-colors hover:text-foreground"
            >
              {copy.backToLogin}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react';
import { checkProfileNameAvailable, saveLocalProfile, getLocalUser, saveProfile } from '../lib/userService';
import { useI18n } from '../lib/i18n';

export default function UsernameSetupDialog({ onDone }) {
  const { language } = useI18n();
  const localUser = getLocalUser();
  const [value, setValue] = useState(localUser.displayName || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const name = value.trim();
    if (name.length < 4) {
      setError(language === 'en' ? 'The name must be at least 4 characters long.' : 'Der Name muss mindestens 4 Zeichen lang sein.');
      return;
    }
    setSaving(true);
    setError('');
    saveLocalProfile({ displayName: name, profile_name: name });

    try {
      const available = await checkProfileNameAvailable(name);
      if (available === false) {
        setError(language === 'en' ? 'This username is already taken. Please choose another one.' : 'Dieser Benutzername ist bereits vergeben. Bitte waehle einen anderen.');
        setSaving(false);
        return;
      }
      await saveProfile(null, { profile_name: name, displayName: name });
    } catch (_) {}

    onDone(name);
    setSaving(false);
  };

  const handleSkip = () => {
    const name = localUser.displayName;
    saveLocalProfile({ profile_name: name });
    onDone(name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 max-w-full">
        <div className="flex items-center gap-3 mb-5">
          <User className="w-7 h-7 text-primary" />
          <h2 className="font-display text-2xl tracking-wide text-foreground">{language === 'en' ? 'Welcome!' : 'Willkommen!'}</h2>
        </div>
        <p className="text-sm text-muted-foreground font-body mb-5 leading-relaxed">
          {language === 'en'
            ? 'Enter your display name. You can change it anytime in the profile settings.'
            : 'Gib deinen Anzeigenamen ein. Du kannst ihn jederzeit in den Profileinstellungen aendern.'}
        </p>
        <Input autoFocus value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }} placeholder={language === 'en' ? 'Your name' : 'Dein Name'} className="mb-2 font-body" maxLength={40} />
        {error ? <p className="text-xs text-destructive font-body mb-3">{error}</p> : <div className="mb-3" />}
        <Button onClick={handleSave} disabled={saving} className="w-full font-body mb-2">
          {saving ? (language === 'en' ? 'Saving...' : 'Speichern...') : (language === 'en' ? 'Continue' : 'Weiter')}
        </Button>
        <button onClick={handleSkip} className="w-full text-xs text-muted-foreground font-body py-1 hover:text-foreground transition-colors">
          {language === 'en' ? 'Skip' : 'Ueberspringen'}
        </button>
      </div>
    </div>
  );
}

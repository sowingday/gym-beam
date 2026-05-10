import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, UserPlus, X, ChevronDown } from 'lucide-react';
import CategorySelect from '../components/CategorySelect';
import InboxMessages from '../components/InboxMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import BottomNav from '../components/BottomNav';
import { fetchFollows, followUser, unfollowUser } from '../lib/socialService';
import {
  checkProfileNameAvailable,
  getCurrentUser,
  saveProfile,
  uploadAvatar,
  saveLocalProfile,
} from '../lib/userService';
import { useI18n } from '../lib/i18n';
import { getLatestAchievement, upsertBodyWeightForDate } from '../lib/workoutDataService';

const Field = memo(({ label, required, hint, children }) => (
  <div>
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body mb-1.5 block">
      {label} {required ? <span className="text-destructive">*</span> : null}
    </label>
    {children}
    {hint ? <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed"><span className="text-destructive mr-1">*</span>{hint}</p> : null}
  </div>
));

function parseOptionalNumber(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const { language, dateLocale } = useI18n();
  const copy = language === 'en'
    ? {
      nameRequired: 'Name is required.',
      nameMin: 'At least 4 characters required.',
      nameTaken: 'This username is already taken.',
      savedLocal: 'Saved locally.',
      saved: 'Profile saved!',
      nameSaved: 'Username saved!',
      nameSavedLocal: 'Name saved locally.',
      pictureSaved: 'Profile picture saved!',
      pictureSavedLocal: 'Profile picture saved locally.',
      pictureError: 'Upload failed.',
      guest: 'Guest',
      clickToChange: 'Click to change',
      profileSettings: 'Profile settings',
      gender: 'Gender',
      optional: 'optional',
      male: 'Male',
      female: 'Female',
      diverse: 'Diverse',
      age: 'Age (years)',
      height: 'Height (cm)',
      weight: 'Weight (kg)',
      weightHint: 'Every change is stored in your statistics with its date.',
      save: 'Save',
      saving: 'Saving...',
      following: 'Following',
      followers: 'Followers',
      noContacts: 'No contacts yet.',
      addContact: 'Add contact',
      unfollow: 'Unfollow',
      follow: 'Follow',
      noFollowers: 'No followers yet.',
      offlineInfo: 'Friends and followers are available once you are online.',
      displayNamePlaceholder: 'Display name (min. 4 characters)',
      clickAvatar: 'Change profile picture',
      signedInSince: 'Signed in since',
      lastTraining: 'Last training',
      never: 'No training yet',
    }
    : {
      nameRequired: 'Name ist ein Pflichtfeld.',
      nameMin: 'Mindestens 4 Zeichen erforderlich.',
      nameTaken: 'Dieser Benutzername ist bereits vergeben.',
      savedLocal: 'Lokal gespeichert.',
      saved: 'Profil gespeichert!',
      nameSaved: 'Benutzername gespeichert!',
      nameSavedLocal: 'Name lokal gespeichert.',
      pictureSaved: 'Profilbild gespeichert!',
      pictureSavedLocal: 'Profilbild lokal gespeichert.',
      pictureError: 'Fehler beim Hochladen.',
      guest: 'Gast',
      clickToChange: 'Klicken zum Ändern',
      profileSettings: 'Profil-Einstellungen',
      gender: 'Geschlecht',
      optional: 'optional',
      male: 'Männlich',
      female: 'Weiblich',
      diverse: 'Divers',
      age: 'Alter (Jahre)',
      height: 'Größe (cm)',
      weight: 'Gewicht (kg)',
      weightHint: 'Jede Änderung wird zusammen mit dem Datum in Deiner Statistik gespeichert.',
      save: 'Speichern',
      saving: 'Speichern...',
      following: 'Folge ich',
      followers: 'Folgt mir',
      noContacts: 'Noch keine Kontakte.',
      addContact: 'Kontakt hinzufügen',
      unfollow: 'Entfolgen',
      follow: 'Folgen',
      noFollowers: 'Noch keine Follower.',
      offlineInfo: 'Freunde und Follower sind verfügbar, sobald du online bist.',
      displayNamePlaceholder: 'Anzeigename (min. 4 Zeichen)',
      clickAvatar: 'Profilbild ändern',
    };

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('following');
  const [follows, setFollows] = useState(null);
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [profileGender, setProfileGender] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileHeight, setProfileHeight] = useState('');
  const [profileWeight, setProfileWeight] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [lastTrainingDate, setLastTrainingDate] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setMe(user);
      setNameValue(user.displayName || user.profile_name || '');
      setProfileGender(user.profile_gender || '');
      setProfileAge(user.profile_age != null ? String(user.profile_age) : '');
      setProfileHeight(user.profile_height != null ? String(user.profile_height) : '');
      setProfileWeight(user.profile_weight != null ? String(user.profile_weight) : '');
      const latestAchievement = await getLatestAchievement().catch(() => null);
      setLastTrainingDate(latestAchievement?.date || null);

      if (user._isOnline) {
        fetchFollows()
          .then((result) => {
            setFollows(Array.isArray(result) ? result : []);
            setOnlineAvailable(true);
          })
          .catch((error) => {
            console.error('[UserProfile] Failed to load follows.', error);
            setFollows([]);
            setOnlineAvailable(false);
          });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const safeFollows = Array.isArray(follows) ? follows : [];
  const myFollowing = safeFollows.filter((follow) => follow.follower_id === me?.id).sort((a, b) => (a.following_name || '').localeCompare(b.following_name || ''));
  const myFollowers = safeFollows.filter((follow) => follow.following_id === me?.id).sort((a, b) => (a.follower_name || '').localeCompare(b.follower_name || ''));
  const followingNames = myFollowing.map((follow) => follow.following_name);

  const handleFollowToggle = async (targetName, targetEmail) => {
    const existing = safeFollows.find((follow) => follow.follower_id === me.id && follow.following_name === targetName);
    if (existing) await unfollowUser(existing.id);
    else {
      await followUser({
        followerId: me.id,
        followerName: me.profile_name || me.displayName,
        followerEmail: me.email,
        followingId: '',
        followingName: targetName,
        followingEmail: targetEmail,
      });
    }
    const updated = await fetchFollows();
    setFollows(Array.isArray(updated) ? updated : []);
  };

  const handleSaveName = async () => {
    const name = nameValue.trim();
    if (!name) {
      setNameError(copy.nameRequired);
      return;
    }
    if (name.length < 4) {
      setNameError(copy.nameMin);
      return;
    }

    if (name === (me?.profile_name || me?.displayName || '').trim()) {
      setEditingName(false);
      setNameError('');
      return;
    }

    setSavingName(true);
    try {
      if (me?._isOnline && name !== me?.profile_name) {
        const available = await checkProfileNameAvailable(name);
        if (available === false) {
          setNameError(copy.nameTaken);
          return;
        }
      }
      const result = await saveProfile(null, { profile_name: name, displayName: name });
      setMe((prev) => ({ ...prev, displayName: name, profile_name: name }));
      setEditingName(false);
      setNameError('');
      toast.success(result.source === 'local' ? copy.nameSavedLocal : copy.nameSaved);
    } catch (error) {
      console.error('[UserProfile] Failed to save display name.', error);
      saveLocalProfile({ displayName: name, profile_name: name });
      setMe((prev) => ({ ...prev, displayName: name, profile_name: name }));
      setEditingName(false);
      setNameError('');
      toast.success(copy.nameSavedLocal);
    } finally {
      setSavingName(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields = {
        profile_gender: profileGender || null,
        profile_age: parseOptionalNumber(profileAge),
        profile_height: parseOptionalNumber(profileHeight),
        profile_weight: parseOptionalNumber(profileWeight),
      };

      if (me?._isOnline && fields.profile_weight !== null && fields.profile_weight !== (me?.profile_weight ?? null)) {
        try {
          const today = new Date().toISOString().split('T')[0];
          await upsertBodyWeightForDate(today, fields.profile_weight);
        } catch (_) {}
      }

      const result = await saveProfile(null, fields);
      setMe((prev) => ({ ...prev, ...fields }));
      toast.success(result.source === 'local' ? copy.savedLocal : copy.saved);
    } catch (error) {
      console.error('[UserProfile] Failed to save profile.', error);
      toast.error('Profil konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const handlePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    const result = await uploadAvatar(null, file);
    if (result.ok) {
      setMe((prev) => ({ ...prev, profile_picture: result.url }));
      toast.success(result.source === 'local' ? copy.pictureSavedLocal : copy.pictureSaved);
    } else {
      toast.error(result.reason || copy.pictureError);
    }
    setUploadingPic(false);
    event.target.value = '';
  };

  const displayName = me?.displayName || me?.profile_name || '';
  const signedInSinceLabel = language === 'en' ? 'Signed in since' : 'Angemeldet seit';
  const lastTrainingLabel = language === 'en' ? 'Last training' : 'Letztes Training';
  const neverLabel = copy.never || (language === 'en' ? 'No training yet' : 'Noch kein Training');
  const signedInSince = me?.created_at ? format(new Date(me.created_at), 'dd. MMMM yyyy', { locale: dateLocale }) : '-';
  const lastTraining = lastTrainingDate ? format(new Date(lastTrainingDate), 'dd. MMMM yyyy', { locale: dateLocale }) : neverLabel;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative shrink-0 self-end">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => !uploadingPic && fileRef.current?.click()} title={copy.clickAvatar}>
              {uploadingPic ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : me?.profile_picture ? <img src={me.profile_picture} alt="Profile" className="w-full h-full object-cover" /> : <span className="font-display text-2xl text-primary">{displayName?.[0]?.toUpperCase() || '?'}</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePictureChange} />
          </div>

          <div className="flex-1 min-w-0 self-end">
            {editingName ? (
              <div className="space-y-1">
                <div className="flex gap-2 items-center">
                  <Input autoFocus value={nameValue} onChange={(e) => { setNameValue(e.target.value); setNameError(''); }} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditingName(false); setNameValue(displayName); setNameError(''); } }} className="font-body h-9 text-base" maxLength={40} placeholder={copy.displayNamePlaceholder} />
                  <Button size="sm" onClick={handleSaveName} disabled={savingName} className="shrink-0">{savingName ? '...' : <Save className="w-4 h-4" />}</Button>
                  <button onClick={() => { setEditingName(false); setNameValue(displayName); setNameError(''); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                {nameError ? <p className="text-xs text-destructive font-body">{nameError}</p> : null}
              </div>
            ) : (
              <div>
                <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground truncate cursor-pointer hover:text-primary transition-colors" onClick={() => setEditingName(true)} title={copy.clickToChange}>
                  {displayName || copy.guest}
                </h1>
                <div className="mt-1 space-y-0.5 text-sm font-body text-muted-foreground">
                  <p>{signedInSinceLabel}: {signedInSince}</p>
                  <p>{lastTrainingLabel}: {lastTraining}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_6px_20px_0_rgba(0,0,0,0.18)] mb-6">
          <button className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold font-body text-foreground" onClick={() => setProfileOpen((open) => !open)}>
            <span>{copy.profileSettings}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileOpen ? (
            <div className="px-5 pb-5 space-y-5 border-t border-border">
              <div className="pt-4">
                <Field label={copy.gender}>
                  <CategorySelect value={profileGender} onChange={setProfileGender} placeholder={`-- ${copy.optional} --`} options={[{ value: '', label: `-- ${copy.optional} --` }, { value: 'maennlich', label: copy.male }, { value: 'weiblich', label: copy.female }, { value: 'divers', label: copy.diverse }]} />
                </Field>
              </div>
              <Field label={copy.age}><Input type="text" inputMode="numeric" pattern="[0-9]*" value={profileAge} onChange={(e) => setProfileAge(e.target.value.replace(/[^0-9]/g, ''))} placeholder={copy.optional} className="font-body" /></Field>
              <Field label={copy.height}><Input type="text" inputMode="numeric" pattern="[0-9]*" value={profileHeight} onChange={(e) => setProfileHeight(e.target.value.replace(/[^0-9]/g, ''))} placeholder={copy.optional} className="font-body" /></Field>
              <Field label={copy.weight} required hint={copy.weightHint}><Input type="text" inputMode="decimal" value={profileWeight} onChange={(e) => setProfileWeight(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={copy.optional} className="font-body" /></Field>
              <Button onClick={handleSave} disabled={saving} className="w-full font-body gap-2 shadow-[0_4px_12px_0_rgba(0,0,0,0.18)]"><Save className="w-4 h-4" />{saving ? copy.saving : copy.save}</Button>
            </div>
          ) : null}
        </div>

        {onlineAvailable ? <InboxMessages /> : null}

        {onlineAvailable ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_6px_20px_0_rgba(0,0,0,0.18)]">
            <div className="flex border-b border-border">
              <button onClick={() => setActiveTab('following')} className={`flex-1 py-3 text-sm font-body font-semibold transition-colors ${activeTab === 'following' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground'}`}>{copy.following} ({myFollowing.length})</button>
              <button onClick={() => setActiveTab('followers')} className={`flex-1 py-3 text-sm font-body font-semibold transition-colors ${activeTab === 'followers' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground'}`}>{copy.followers} ({myFollowers.length})</button>
            </div>

            {activeTab === 'following' ? (
              <div>
                {myFollowing.length === 0 ? <p className="text-sm text-muted-foreground font-body text-center py-6">{copy.noContacts}</p> : myFollowing.map((follow, index) => (
                  <div key={follow.id} className={`flex items-center px-4 py-3 gap-3 ${index < myFollowing.length - 1 ? 'border-b border-border/50' : ''}`}>
                    <button className="flex-1 text-left font-body text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={() => navigate(`/friend/${follow.following_name}`)}>{follow.following_name}</button>
                    <Button variant="secondary" size="sm" className="font-body text-xs h-7" onClick={() => handleFollowToggle(follow.following_name, follow.following_email)}>{copy.unfollow}</Button>
                  </div>
                ))}
                <div className="p-3">
                  <Button variant="ghost" className="w-full justify-start text-primary/70 hover:text-primary hover:bg-primary/5 font-body text-sm gap-2" onClick={() => navigate('/find-friends')}><UserPlus className="w-4 h-4" />{copy.addContact}</Button>
                </div>
              </div>
            ) : (
              <div>
                {myFollowers.length === 0 ? <p className="text-sm text-muted-foreground font-body text-center py-6">{copy.noFollowers}</p> : myFollowers.map((follow, index) => (
                  <div key={follow.id} className={`flex items-center px-4 py-3 gap-3 ${index < myFollowers.length - 1 ? 'border-b border-border/50' : ''}`}>
                    <button className="flex-1 text-left font-body text-sm font-semibold text-foreground hover:text-primary transition-colors" onClick={() => navigate(`/friend/${follow.follower_name}`)}>{follow.follower_name}</button>
                    <Button variant={followingNames.includes(follow.follower_name) ? 'secondary' : 'default'} size="sm" className="font-body text-xs h-7" onClick={() => handleFollowToggle(follow.follower_name, follow.follower_email)}>{followingNames.includes(follow.follower_name) ? copy.unfollow : copy.follow}</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {!onlineAvailable ? <div className="rounded-xl border border-border bg-card/50 px-5 py-4 text-sm text-muted-foreground font-body text-center">{copy.offlineInfo}</div> : null}
      </div>
      <BottomNav />
    </div>
  );
}

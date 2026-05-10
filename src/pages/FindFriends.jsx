import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Share2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import SelectFriend from './SelectFriend';
import { useI18n } from '../lib/i18n';
import { getCurrentAuthUser } from '../lib/authClient';
import { shareText } from '../lib/shareService';
import { fetchFollows, followUser, isSocialAvailable, unfollowUser } from '../lib/socialService';

export default function FindFriends() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [me, setMe] = useState(null);
  const [selectMode, setSelectMode] = useState(null);
  const shareBaseUrl = 'https://app.gym-beam.de';
  const socialAvailable = isSocialAvailable();

  useEffect(() => {
    getCurrentAuthUser().then(setMe).catch(() => {});
  }, []);

  const { data: followsRaw = [] } = useQuery({
    queryKey: ['follows'],
    queryFn: fetchFollows,
    enabled: !!me,
  });

  const follows = Array.isArray(followsRaw) ? followsRaw : [];
  const myFollowingIds = new Set(follows.filter((follow) => follow.follower_id === me?.id).map((follow) => follow.following_id));
  const friendsOfFriends = follows
    .filter((follow) => myFollowingIds.has(follow.follower_id) && follow.following_id !== me?.id)
    .filter((follow) => !myFollowingIds.has(follow.following_id))
    .map((follow) => ({ id: follow.following_id, name: follow.following_name, shownByName: follow.follower_name, email: follow.following_email }));

  const seen = new Set();
  const uniqueFoF = friendsOfFriends.filter((person) => {
    if (seen.has(person.id || person.name)) return false;
    seen.add(person.id || person.name);
    return true;
  });

  const handleShare = async () => {
    const text = language === 'en'
      ? `Follow my training on Gym-Beam!\n${shareBaseUrl}`
      : `Folge meinem Training bei Gym-Beam!\n${shareBaseUrl}`;
    await shareText(text, language === 'en' ? 'Link' : 'Link');
  };

  const handleFollowToggle = async (targetName, targetEmail) => {
    if (!me || !socialAvailable) return;
    const target = uniqueFoF.find((person) => person.name === targetName && person.email === targetEmail);
    const existing = follows.find((follow) => follow.follower_id === me.id && follow.following_id === target?.id);
    if (existing) await unfollowUser(existing.id);
    else {
      await followUser({
        followerId: me.id,
        followerName: me.profile_name,
        followerEmail: me.email,
        followingId: target?.id || '',
        followingName: targetName,
        followingEmail: targetEmail,
      });
    }
  };

  const isFollowing = (personId) => myFollowingIds.has(personId);
  const followsMe = (personId) => follows.some((follow) => follow.follower_id === personId && follow.following_id === me?.id);

  if (selectMode) {
    return <SelectFriend mode={selectMode} me={me} follows={follows} onBack={() => setSelectMode(null)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-body">{t('common.back')}</span>
        </button>

        <h1 className="font-display text-4xl tracking-wide text-foreground mb-6">{language === 'en' ? 'Find your friends' : 'Finde Deine Freunde'}</h1>

        {!socialAvailable ? (
          <div className="mb-6 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground font-body">
            {language === 'en'
              ? 'Friend search and follow actions are only available online.'
              : 'Freundesuche und Follow-Aktionen sind nur online verfuegbar.'}
          </div>
        ) : null}

        <div className="space-y-3 mb-8">
          <Button variant="outline" className="w-full justify-start gap-3 h-12 font-body text-base" onClick={() => setSelectMode('all')} disabled={!socialAvailable}>
            <Search className="w-5 h-5" />
            {language === 'en' ? 'Search usernames' : 'Benutzernamen suchen'}
          </Button>

          <Button variant="outline" className="w-full justify-start gap-3 h-12 font-body text-base" onClick={() => setSelectMode('contacts')} disabled={!socialAvailable}>
            <Search className="w-5 h-5" />
            {language === 'en' ? 'Find in contacts' : 'In Kontakten finden'}
          </Button>

          <Button variant="outline" className="w-full justify-start gap-3 h-12 font-body text-base" onClick={handleShare}>
            <Share2 className="w-5 h-5" />
            {language === 'en' ? 'Share link' : 'Link teilen'}
          </Button>
        </div>

        {uniqueFoF.length > 0 ? (
          <div>
            <h2 className="font-body text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {language === 'en' ? 'People you may know' : 'Diese Personen koenntest Du kennen'}
            </h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {uniqueFoF.map((person, index) => (
                <div key={person.id || person.name} className={`flex items-center px-4 py-3 gap-3 ${index < uniqueFoF.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-sm text-foreground">{person.name}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      {language === 'en' ? `Followed by ${person.shownByName}` : `Von ${person.shownByName} gefolgt`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {followsMe(person.id) ? <span className="text-xs text-accent font-body">{language === 'en' ? 'follows you' : 'folgt Dir'}</span> : null}
                    <Button variant={isFollowing(person.id) ? 'secondary' : 'default'} size="sm" className="font-body text-xs h-7" onClick={() => handleFollowToggle(person.name, person.email)} disabled={!socialAvailable}>
                      {isFollowing(person.id) ? (language === 'en' ? 'Unfollow' : 'Entfolgen') : (language === 'en' ? 'Follow' : 'Folgen')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

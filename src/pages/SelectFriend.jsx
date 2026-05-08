import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../lib/i18n';
import { followUser, isSocialAvailable, unfollowUser } from '../lib/socialService';
import { listDirectoryProfiles } from '../lib/profileDirectory';

export default function SelectFriend({ mode, me, follows, onBack }) {
  const queryClient = useQueryClient();
  const { t, language } = useI18n();
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const socialAvailable = isSocialAvailable();

  useEffect(() => {
    listDirectoryProfiles(me).then((users) => {
      setAllUsers(users);
    }).catch(() => {});
  }, [me]);

  const safeFollows = Array.isArray(follows) ? follows : [];
  const myFollowingIds = new Set(safeFollows.filter((follow) => follow.follower_id === me?.id).map((follow) => follow.following_id));
  const followsMe = (userId) => safeFollows.some((follow) => follow.follower_id === userId && follow.following_id === me?.id);
  const displayUsers = allUsers
    .filter((user) => user.profile_name)
    .filter((user) => !search || user.profile_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.profile_name.localeCompare(b.profile_name));
  const isFollowing = (userId) => myFollowingIds.has(userId);

  const handleToggle = async (user) => {
    if (!socialAvailable) return;
    const existing = safeFollows.find((follow) => follow.follower_id === me.id && follow.following_id === user.id);
    if (existing) await unfollowUser(existing.id);
    else {
      await followUser({
        followerId: me.id,
        followerName: me.profile_name,
        followerEmail: me.email,
        followingId: user.id,
        followingName: user.profile_name,
        followingEmail: user.email,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['follows'] });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-body">{t('common.back')}</span>
        </button>

        <h1 className="font-display text-3xl tracking-wide text-foreground mb-5">
          {mode === 'contacts'
            ? (language === 'en' ? 'Find in contacts' : 'In Kontakten finden')
            : (language === 'en' ? 'Search users' : 'Benutzer suchen')}
        </h1>

        {!socialAvailable ? (
          <p className="text-xs text-muted-foreground font-body mb-4 p-3 rounded-lg bg-muted/40 border border-border">
            {language === 'en'
              ? 'Following and unfollowing only work online.'
              : 'Folgen und Entfolgen funktionieren nur online.'}
          </p>
        ) : null}

        {mode === 'contacts' ? (
          <p className="text-xs text-muted-foreground font-body mb-4 p-3 rounded-lg bg-muted/40 border border-border">
            {language === 'en'
              ? 'Note: contact access will be implemented in a later version. All users are shown here for now.'
            : 'Hinweis: Kontaktzugriff wird in einer späteren Version implementiert. Alle Benutzer werden angezeigt.'}
          </p>
        ) : null}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder={language === 'en' ? 'Search username...' : 'Benutzername suchen...'} className="pl-9 font-body" disabled={!socialAvailable} />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {displayUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body text-center py-8">{language === 'en' ? 'No users found.' : 'Keine Benutzer gefunden.'}</p>
          ) : (
            displayUsers.map((user, index) => (
                <div key={user.id} className={`flex items-center px-4 py-3 gap-3 ${index < displayUsers.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-sm text-foreground">{user.profile_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                  {followsMe(user.id) ? (
                    <span className="text-xs text-accent font-body flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {language === 'en' ? 'follows you' : 'folgt Dir'}
                    </span>
                  ) : null}
                  <Button variant={isFollowing(user.id) ? 'secondary' : 'default'} size="sm" className="font-body text-xs h-7" onClick={() => handleToggle(user)} disabled={!socialAvailable}>
                    {isFollowing(user.id) ? (language === 'en' ? 'Unfollow' : 'Entfolgen') : (language === 'en' ? 'Follow' : 'Folgen')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Share2, Search, Check, ExternalLink, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deriveFriends, fetchFollows, sendInboxShare } from '../lib/socialService';
import { shareText } from '../lib/shareService';
import { useI18n } from '../lib/i18n';
import { getCurrentAuthUser } from '../lib/authClient';

export default function ShareAchievementsDialog({ period, initialTab = 'extern', buildShareText, onClose }) {
  const { language } = useI18n();
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(null);
  const [sent, setSent] = useState(null);
  const [tab, setTab] = useState(initialTab);

  const labels = {
    de: { week: 'Diese Woche', month: 'Diesen Monat', year: 'Dieses Jahr', all: 'Alles' },
    en: { week: 'This week', month: 'This month', year: 'This year', all: 'All time' },
  }[language];

  const { data: me } = useQuery({
    queryKey: ['me-share'],
    queryFn: () => getCurrentAuthUser(),
  });

  const { data: allFollows = [] } = useQuery({
    queryKey: ['follows-for-share'],
    queryFn: fetchFollows,
  });

  const friends = deriveFriends(allFollows, me);
  const filtered = friends.filter((friend) => !query.trim() || friend.name?.toLowerCase().includes(query.trim().toLowerCase()));

  const handleShareExternal = async () => {
    const text = buildShareText(period);
    await shareText(text, language === 'en' ? 'Achievements' : 'Erfolge');
    onClose();
  };

  const handleShareToFriend = async (friend) => {
    if (!me) return;
    setSending(friend.id);
    try {
      const text = buildShareText(period);
      const ok = await sendInboxShare({
        senderId: me.id,
        senderName: me.profile_name || me.full_name,
        recipientId: friend.id,
        recipientName: friend.name,
        title: `${language === 'en' ? 'Achievements' : 'Erfolge'} - ${labels[period] || period}`,
        payload: { type: 'achievements', period, text },
      });
      if (!ok) throw new Error('share failed');
      setSent(friend.id);
      toast.success(language === 'en' ? `Shared with ${friend.name}!` : `Erfolge mit ${friend.name} geteilt!`);
    } catch {
      toast.error(language === 'en' ? 'Sharing failed.' : 'Teilen fehlgeschlagen.');
    }
    setSending(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground font-body">{language === 'en' ? 'Share achievements' : 'Erfolge teilen'}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <p className="text-xs text-muted-foreground font-body mb-3">
          {language === 'en' ? 'Period' : 'Zeitraum'}: <span className="font-semibold text-foreground">{labels[period] || period}</span>
        </p>

        <div className="flex rounded-lg overflow-hidden border border-border mb-4">
          <button
            onClick={() => setTab('extern')}
            className={`flex-1 py-1.5 text-xs font-body flex items-center justify-center gap-1 transition-colors ${tab === 'extern' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
          >
            <ExternalLink className="w-3 h-3" /> {language === 'en' ? 'External' : 'Extern'}
          </button>
          <button
            onClick={() => setTab('freunde')}
            className={`flex-1 py-1.5 text-xs font-body flex items-center justify-center gap-1 transition-colors ${tab === 'freunde' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`}
          >
            <Users className="w-3 h-3" /> {language === 'en' ? `Friends (${friends.length})` : `Freunde (${friends.length})`}
          </button>
        </div>

        {tab === 'extern' ? (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground font-body mb-4">
              {language === 'en'
                ? 'Share your achievements with a messenger app or copy the link.'
                : 'Teile Deine Erfolge ueber eine Messenger-App oder kopiere den Link.'}
            </p>
            <Button onClick={handleShareExternal} className="w-full gap-2 shadow-[0_4px_12px_0_rgba(0,0,0,0.18)]">
              <ExternalLink className="w-4 h-4" />
              {language === 'en' ? 'Share via messenger' : 'Ueber Messenger teilen'}
            </Button>
          </div>
        ) : (
          <>
            {friends.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 font-body">
                {language === 'en'
                  ? 'No mutual contacts yet. When someone follows you and you follow back, they appear here.'
                  : 'Noch keine gegenseitigen Kontakte. Wenn jemand Dir folgt und Du zurueckfolgst, erscheint er hier.'}
              </p>
            ) : (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder={language === 'en' ? 'Search friend...' : 'Freund suchen...'}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-8 h-8 text-sm font-body"
                  />
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {filtered.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <span className="text-sm font-body text-foreground truncate">{friend.name}</span>
                      <button
                        onClick={() => handleShareToFriend(friend)}
                        disabled={sending === friend.id || sent === friend.id}
                        className={`ml-2 shrink-0 px-3 py-1 rounded-full text-xs font-semibold font-body transition-colors ${sent === friend.id ? 'bg-primary/10 text-primary' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                      >
                        {sent === friend.id ? <Check className="w-3 h-3 inline" /> : (language === 'en' ? 'Send' : 'Senden')}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

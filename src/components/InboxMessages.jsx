import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Dumbbell, ChevronDown } from 'lucide-react';
import { fetchInboxMessages, markMessageRead } from '../lib/socialService';
import { format, parseISO } from 'date-fns';
import { useI18n } from '../lib/i18n';
import { getCurrentAuthUser } from '../lib/authClient';

export default function InboxMessages() {
  const navigate = useNavigate();
  const { language, dateLocale } = useI18n();
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentAuthUser().then((user) => {
      fetchInboxMessages(user.id).then((items) => {
        const list = Array.isArray(items) ? items : [];
        setMessages(list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, []);

  const unreadCount = messages.filter((item) => !item.read).length;

  const handleOpenMessage = async (message) => {
    if (!message.read) {
      await markMessageRead(message.id);
      setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, read: true } : item)));
    }

    try {
      const workoutData = JSON.parse(message.workout_data);
      sessionStorage.setItem('wb_shared_workout', JSON.stringify({
        ...workoutData,
        _shareId: message.id,
        _senderName: message.sender_name,
      }));
      navigate('/shared-workout');
    } catch (_) {}
  };

  if (loading || messages.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_6px_20px_0_rgba(0,0,0,0.18)] mb-6">
      <button className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold font-body text-foreground" onClick={() => setOpen((value) => !value)}>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <span>{language === 'en' ? 'Messages' : 'Nachrichten'}</span>
          {unreadCount > 0 ? <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unreadCount}</span> : null}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="border-t border-border divide-y divide-border/50">
          {messages.map((message) => (
            <button
              key={message.id}
              onClick={() => handleOpenMessage(message)}
              className={`w-full text-left px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors ${!message.read ? 'bg-primary/5' : ''}`}
            >
              <Dumbbell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-body ${!message.read ? 'font-semibold text-foreground' : 'text-foreground'} truncate`}>
                  {language === 'en' ? `${message.sender_name} shared:` : `${message.sender_name} teilt:`} <span className="text-primary">"{message.workout_name}"</span>
                </p>
                <p className="text-[11px] text-muted-foreground font-body mt-0.5">
                  {message.created_date ? format(parseISO(message.created_date), 'dd. MMM yyyy', { locale: dateLocale }) : ''}
                  {' · '}
                  {language === 'en' ? 'Tap to open' : 'Antippen zum Oeffnen'}
                </p>
              </div>
              {!message.read ? <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

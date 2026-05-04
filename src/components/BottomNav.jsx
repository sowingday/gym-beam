import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings2, User, Trophy, ClipboardList, PersonStanding } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const navItems = [
    { icon: ClipboardList, label: t('nav.workouts'), path: '/' },
    { icon: PersonStanding, label: t('nav.exercises'), path: '/exercises' },
    { icon: Trophy, label: t('nav.achievements'), path: '/achievements' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
    { icon: Settings2, label: t('nav.settings'), path: '/settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex gap-0 px-0 py-1.5 pointer-events-auto w-full">
        {navItems.map(({ icon: Icon, path }) => {
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{ minHeight: 44, flex: 1 }}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-primary hover:bg-secondary/70'}`}
            >
              <Icon className={`${path === '/exercises' ? 'w-6 h-6' : 'w-5 h-5'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

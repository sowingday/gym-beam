import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, PersonStanding, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import DurDisplay from '../components/DurDisplay';
import { startOfWeek, startOfMonth, startOfYear, parseISO, isEqual, isAfter } from 'date-fns';
import { useI18n } from '../lib/i18n';
import { getDirectoryProfileByUsername } from '../lib/profileDirectory';
import { listAchievementsForUser } from '../lib/workoutDataService';

function computeStats(achievements) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const init = () => ({ exercises: 0, duration: 0 });
  const result = { week: init(), month: init(), year: init(), total: init() };

  achievements.forEach((achievement) => {
    const date = parseISO(achievement.date);
    const count = achievement.exercise_count || 0;
    const duration = achievement.training_duration || 0;
    result.total.exercises += count;
    result.total.duration += duration;
    if (isAfter(date, yearStart) || isEqual(date, yearStart)) {
      result.year.exercises += count;
      result.year.duration += duration;
    }
    if (isAfter(date, monthStart) || isEqual(date, monthStart)) {
      result.month.exercises += count;
      result.month.duration += duration;
    }
    if (isAfter(date, weekStart) || isEqual(date, weekStart)) {
      result.week.exercises += count;
      result.week.duration += duration;
    }
  });

  return result;
}

export default function FriendProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t, language } = useI18n();

  const { data: users = [] } = useQuery({
    queryKey: ['user-by-name', username],
    queryFn: async () => {
      const profile = await getDirectoryProfileByUsername(username);
      return profile ? [profile] : [];
    },
  });

  const friendUser = users[0];

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['achievements-friend', friendUser?.id],
    queryFn: () => listAchievementsForUser(friendUser?.id),
    enabled: !!friendUser,
  });

  const stats = computeStats(achievements);
  const rows = [
    { label: language === 'en' ? 'This week' : 'Diese Woche', ...stats.week },
    { label: language === 'en' ? 'This month' : 'Diesen Monat', ...stats.month },
    { label: language === 'en' ? 'This year' : 'Dieses Jahr', ...stats.year },
    { label: language === 'en' ? 'All time' : 'Insgesamt', ...stats.total },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-body">{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-7 h-7 text-primary" />
          <h1 className="font-display text-4xl tracking-wide text-foreground">{username}</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            {rows.map((row, index) => (
              <div key={index} className={`flex items-center px-5 py-4 gap-4 ${index < rows.length - 1 ? 'border-b border-border/50' : ''}`}>
                <span className="text-sm font-body text-foreground w-32 shrink-0">{row.label}</span>
                <span className="flex items-center gap-1.5 text-muted-foreground w-24 shrink-0">
                  <PersonStanding className="w-4 h-4 shrink-0" />
                  <span className="font-display text-2xl text-primary">{row.exercises}</span>
                </span>
                <span className="flex flex-1 items-center justify-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <DurDisplay seconds={row.duration} className="text-xl text-accent font-semibold" />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

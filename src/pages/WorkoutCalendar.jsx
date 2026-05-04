import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useQuery } from '@tanstack/react-query';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isSameMonth, isBefore, startOfDay, addMonths,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { useI18n } from '../lib/i18n';
import { getCurrentAuthUser } from '../lib/authClient';
import { listAchievements, listWorkouts } from '../lib/workoutDataService';

function HinweisBlock() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="mt-6">
      <button className="text-xs font-semibold text-muted-foreground font-body hover:underline" onClick={() => setOpen((prev) => !prev)}>
        {t('calendar.note')}
      </button>
      {open ? <p className="text-xs text-muted-foreground font-body leading-relaxed mt-2">{t('calendar.deletedInfo')}</p> : null}
    </div>
  );
}

const DOT_LIMIT = 5;

function getWorkoutWeekdays(workout) {
  const days = Array.isArray(workout.weekdays) ? workout.weekdays : [];
  return days.length ? days : (workout.weekday ? [workout.weekday] : []);
}

function getWorkoutColor(workout) {
  return workout.color || '#212121';
}

export default function WorkoutCalendar() {
  const navigate = useNavigate();
  const { t, dateLocale, messages } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const today = startOfDay(new Date());
  const weekdayKeys = messages.calendar.weekdayKeys;
  const weekdayHeaders = messages.calendar.weekdayHeaders;

  useEffect(() => {
    getCurrentAuthUser().catch(() => {});
  }, []);

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: listAchievements,
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['workouts'],
    queryFn: listWorkouts,
  });

  const workoutColorMap = {};
  workouts.forEach((workout) => {
    workoutColorMap[workout.id] = workout.color || '#212121';
  });

  const workoutIds = new Set(workouts.map((workout) => workout.id));
  const achievementsByDate = {};

  achievements.forEach((achievement) => {
    if (!achievement.workout_id || !workoutIds.has(achievement.workout_id)) return;
    const color = workoutColorMap[achievement.workout_id] || achievement.workout_color;
    if (!color) return;
    if (!achievementsByDate[achievement.date]) achievementsByDate[achievement.date] = [];
    achievementsByDate[achievement.date].push({ color, workout_id: achievement.workout_id });
  });

  const nextMonthEnd = endOfMonth(addMonths(today, 1));

  function getDotsForDay(day) {
    if (isBefore(day, today)) {
      return achievementsByDate[format(day, 'yyyy-MM-dd')] || [];
    }

    if (isBefore(nextMonthEnd, day)) return [];

    const dayKey = weekdayKeys[getDay(day)];
    return workouts
      .filter((workout) => {
        const weekdays = getWorkoutWeekdays(workout);
        return weekdays.length > 0 && weekdays.includes(dayKey === 'Sun' ? 'So' : dayKey === 'Mon' ? 'Mo' : dayKey === 'Tue' ? 'Di' : dayKey === 'Wed' ? 'Mi' : dayKey === 'Thu' ? 'Do' : dayKey === 'Fri' ? 'Fr' : 'Sa');
      })
      .map((workout) => ({ color: getWorkoutColor(workout), workout_id: workout.id, workout_name: workout.name }));
  }

  const monthStart = startOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) });
  const startPad = (getDay(monthStart) + 6) % 7;
  const paddedDays = [...Array(startPad).fill(null), ...days];
  const selectedDots = selectedDay ? getDotsForDay(selectedDay) : [];
  const isSelectedToday = selectedDay && isSameDay(selectedDay, today);

  const legendItems = workouts
    .filter((workout) => (Array.isArray(workout.exercises) ? workout.exercises : []).length > 0 && getWorkoutWeekdays(workout).length > 0)
    .map((workout) => ({ name: workout.name, color: getWorkoutColor(workout) }));

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors py-2 pr-3 -ml-1 rounded-lg active:bg-muted/40">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-base font-body font-medium">{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-7 h-7 text-primary" />
          <h1 className="font-display text-4xl tracking-wide text-foreground">{t('calendar.title')}</h1>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-display text-2xl tracking-wide capitalize">{format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {weekdayHeaders.map((weekday) => (
              <div key={weekday} className="text-center text-xs font-semibold text-muted-foreground py-2.5 font-body">{weekday}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {paddedDays.map((day, index) => {
              if (!day) return <div key={`pad-${index}`} className="aspect-square" />;

              const isToday = isSameDay(day, today);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const inMonth = isSameMonth(day, currentMonth);
              const dots = getDotsForDay(day);
              const hasDots = dots.length > 0;
              const overflow = dots.length > DOT_LIMIT;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => {
                    if (!hasDots && !isToday) return;
                    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day));
                  }}
                  className={[
                    'aspect-square flex flex-col items-center justify-center text-sm font-body transition-colors relative',
                    hasDots || isToday ? 'cursor-pointer hover:bg-muted/20' : 'cursor-default',
                    isToday ? 'ring-2 ring-blue-500 ring-inset rounded' : '',
                    isSelected ? 'bg-muted/30' : '',
                    !inMonth ? 'opacity-30' : '',
                  ].join(' ')}
                >
                  <span className="text-sm leading-none mb-1">{format(day, 'd')}</span>
                  {hasDots && !overflow ? (
                    <div className="flex flex-wrap justify-center gap-px">
                      {dots.map((dot, dotIndex) => <div key={dotIndex} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot.color }} />)}
                    </div>
                  ) : null}
                  {hasDots && overflow ? <div className="w-4/5 h-1.5 rounded-full bg-blue-900" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        {selectedDay && (selectedDots.length > 0 || isSelectedToday) ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
            <div className="bg-card border border-border rounded-xl shadow-2xl p-4 w-64 max-w-full" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-muted-foreground mb-3 font-body capitalize">
                {format(selectedDay, 'EEEE, dd. MMMM', { locale: dateLocale })}
              </p>

              {selectedDots.length > 0 ? (
                <div className="space-y-2 mb-3">
                  <p className="text-xs text-muted-foreground font-body">{isBefore(selectedDay, today) ? t('calendar.completed') : t('calendar.planned')}</p>
                  {selectedDots.map((dot, index) => {
                    const workout = workouts.find((item) => item.id === dot.workout_id);
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm font-body">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dot.color }} />
                        <span className="flex-1">{dot.workout_name || workout?.name || 'Workout'}</span>
                        {isSelectedToday && workout && (Array.isArray(workout.exercises) ? workout.exercises : []).length > 0 ? (
                          <button onClick={() => navigate(`/training/${workout.id}`)} className="p-1 rounded hover:bg-primary/10 text-primary transition-colors">
                            <Play className="w-4 h-4" fill="currentColor" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {isSelectedToday && selectedDots.length === 0 ? <p className="text-sm text-muted-foreground font-body">{t('calendar.noneToday')}</p> : null}

              <button onClick={() => setSelectedDay(null)} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground font-body py-1">
                {t('common.close')}
              </button>
            </div>
          </div>
        ) : null}

        {legendItems.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-body">{t('calendar.workouts')}</p>
            <div className="space-y-1.5">
              {legendItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-body text-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <HinweisBlock />
      </div>
      <BottomNav />
    </div>
  );
}

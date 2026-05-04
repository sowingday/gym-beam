import React from 'react';
import { PersonStanding, X } from 'lucide-react';
import { getBreakDuration } from '../lib/settings';
import { useI18n } from '../lib/i18n';

const BREAK = getBreakDuration();

function getTotals(workout) {
  const exercises = workout.exercises || [];
  if (!exercises.length) return { secs: 0, sets: 0, allSets: false };
  const durationExercises = exercises.filter((exercise) => !exercise.use_sets);
  const secs = durationExercises.reduce((sum, exercise) => sum + (exercise.duration || 90), 0) + Math.max(0, exercises.length - 1) * BREAK;
  const sets = exercises.reduce((sum, exercise) => (exercise.use_sets ? sum + (exercise.sets || 3) : sum), 0);
  return { secs, sets, allSets: durationExercises.length === 0 && exercises.length > 0 };
}

export default function AddExistingWorkoutSheet({ open, onClose, onSelect, workouts, dayLabel, currentDay }) {
  const { language } = useI18n();
  if (!open) return null;

  const available = workouts.filter((workout) => {
    if (!workout.name || !workout.name.trim()) return false;
    if (!currentDay) return true;
    const days = Array.isArray(workout.weekdays) && workout.weekdays.length ? workout.weekdays : workout.weekday ? [workout.weekday] : [];
    return !days.includes(currentDay);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground font-body">
            {language === 'en' ? `Add workout to ${dayLabel}` : `Workout zu ${dayLabel} hinzufuegen`}
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {available.length === 0 ? <p className="px-4 py-6 text-center text-sm text-muted-foreground font-body">{language === 'en' ? 'All workouts are already assigned.' : 'Alle Workouts sind bereits zugeordnet.'}</p> : null}
          {available.map((workout) => {
            const count = (workout.exercises || []).length;
            const { secs, sets, allSets } = getTotals(workout);
            return (
              <button key={workout.id} onClick={() => onSelect(workout)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 text-left hover:bg-secondary/70 transition-colors last:border-b-0">
                <div className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10" style={{ backgroundColor: workout.color || '#212121' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground font-body truncate">{workout.name}</div>
                </div>
                <div className="shrink-0 flex items-center text-xs leading-tight">
                  <div className="text-[hsl(var(--primary))] mx-1 pr-1.5 w-10 flex items-center justify-end">
                    <PersonStanding style={{ width: 14, height: 14, display: 'block', flexShrink: 0 }} />
                    <span className="ml-1">{count}</span>
                  </div>
                  <div className="text-[hsl(var(--muted-foreground))] flex items-center">
                    <span className="flex items-center justify-center" style={{ width: 14, height: 14, flexShrink: 0 }}>
                      {allSets
                        ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                        : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                    </span>
                    <span className="ml-1">
                      {allSets
                        ? <span className="tabular-nums">{sets} S</span>
                        : <div className="flex flex-col tabular-nums leading-none"><span>{Math.floor(secs / 60)}<span className="opacity-60 text-[9px]">m</span></span><span>{String(secs % 60).padStart(2, '0')}<span className="opacity-60 text-[9px]">s</span></span></div>}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

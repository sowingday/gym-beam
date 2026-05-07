import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import StickFigureAnimation from '../components/StickFigureAnimation';
import { useI18n } from '../lib/i18n';
import { createWorkout, listWorkouts } from '../lib/workoutDataService';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAY_LABELS = {
  de: { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag', Sa: 'Samstag', So: 'Sonntag' },
  en: { Mo: 'Monday', Di: 'Tuesday', Mi: 'Wednesday', Do: 'Thursday', Fr: 'Friday', Sa: 'Saturday', So: 'Sunday' },
};

export default function SharedWorkout() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [workout, setWorkout] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const data = sessionStorage.getItem('wb_shared_workout');
      if (data) setWorkout(JSON.parse(data));
      else navigate('/profile');
    } catch (_) {
      navigate('/profile');
    }
  }, [navigate]);

  const toggleDay = (day) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]));
  };

  const handleAccept = async () => {
    if (selectedDays.length === 0) {
      toast.error(language === 'en' ? 'Please select at least one weekday.' : 'Bitte mindestens einen Wochentag auswählen.');
      return;
    }
    setSaving(true);
    try {
      const existingWorkouts = await listWorkouts();
      const maxNum = existingWorkouts.reduce((max, item) => Math.max(max, item.workout_number || 0), 0);
      const newWorkout = await createWorkout({
        name: workout.name,
        color: workout.color || '#212121',
        exercises: workout.exercises || [],
        weekdays: selectedDays,
        sort_order: existingWorkouts.length,
        workout_number: maxNum + 1,
      });
      sessionStorage.removeItem('wb_shared_workout');
      toast.success(language === 'en' ? `"${workout.name}" was added to your plan!` : `"${workout.name}" wurde in Deinen Plan übernommen!`);
      setDone(true);
      setTimeout(() => navigate(`/workout/${newWorkout.id}`), 800);
    } catch {
      toast.error(language === 'en' ? 'Error while importing.' : 'Fehler beim Übernehmen.');
    }
    setSaving(false);
  };

  if (!workout) return null;

  const exercises = workout.exercises || [];
  const senderName = workout._senderName;
  const weekdayLabels = WEEKDAY_LABELS[language];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/profile')} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-body">{t('common.back')}</span>
        </button>

        {senderName ? (
          <p className="text-sm text-muted-foreground font-body mb-2">
            {language === 'en' ? 'Shared by' : 'Von'} <span className="font-semibold text-foreground">{senderName}</span>{language === 'en' ? ':' : ' geteilt:'}
          </p>
        ) : null}

        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground mb-6">{workout.name}</h1>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_6px_20px_0_rgba(0,0,0,0.18)] mb-6">
          {exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body text-center py-6">{language === 'en' ? 'No exercises.' : 'Keine Übungen.'}</p>
          ) : (
            exercises.map((exercise, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <StickFigureAnimation animationType={exercise.animation_type} size={40} color="hsl(230, 70%, 50%)" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{exercise.name}</p>
                  <p className="text-xs text-muted-foreground font-body">
                    {exercise.use_sets
                      ? `${exercise.sets || 3} x ${exercise.reps || 10} ${language === 'en' ? 'reps' : 'Wdh.'}`
                      : `${Math.floor((exercise.duration || 90) / 60)}m ${String((exercise.duration || 90) % 60).padStart(2, '0')}s`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[0_6px_20px_0_rgba(0,0,0,0.18)] mb-6">
          <p className="text-sm font-semibold font-body text-foreground mb-3">
            {language === 'en' ? 'Which days do you want to train?' : 'An welchen Tagen möchtest Du trainieren?'}
          </p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-full text-sm font-body transition-colors border ${selectedDays.includes(day) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:border-primary/50'}`}
              >
                {weekdayLabels[day]}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleAccept} disabled={saving || done} className="w-full h-12 text-base font-body gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_4px_12px_0_rgba(0,0,0,0.18)]">
          {done ? <Check className="w-5 h-5" /> : saving ? <Dumbbell className="w-5 h-5 animate-pulse" /> : <Plus className="w-5 h-5" />}
          {done
            ? (language === 'en' ? 'Imported!' : 'Übernommen!')
            : saving
              ? (language === 'en' ? 'Importing...' : 'Wird übernommen...')
              : (language === 'en' ? 'Add to my plan' : 'In meinen Plan übernehmen')}
        </Button>
      </div>
    </div>
  );
}

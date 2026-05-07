import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, PlusCircle, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import StickFigureAnimation from '../components/StickFigureAnimation';
import DurDisplay from '../components/DurDisplay';
import { toast } from 'sonner';
import { getBreakDuration } from '../lib/settings';
import { localWorkouts } from '../lib/localWorkouts';
import { useI18n } from '../lib/i18n';
import { createWorkout, getWorkoutTemplateById, listWorkouts } from '../lib/workoutDataService';

const WEEKDAYS = [
  { key: 'Mo', label: 'Mo' },
  { key: 'Di', label: 'Di' },
  { key: 'Mi', label: 'Mi' },
  { key: 'Do', label: 'Do' },
  { key: 'Fr', label: 'Fr' },
  { key: 'Sa', label: 'Sa' },
  { key: 'So', label: 'So' },
];

export default function WorkoutTemplatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useI18n();
  const copy = language === 'en'
    ? {
      notFound: 'Workout template not found.',
      backToDb: 'Back to database',
      addToPlan: 'Add to plan',
      adding: 'Adding...',
      startWorkout: 'Start workout!',
      exercises: 'exercises',
      sets: 'sets',
      chooseDays: 'Choose weekdays',
      selectedDays: 'selected',
      addToDays: 'Add to',
      chooseDaysFirst: 'Select days...',
      addWithoutDay: 'Add without weekday',
      added: 'added to the plan!',
      addError: 'Error while adding.',
    }
    : {
      notFound: 'Workout-Template nicht gefunden.',
      backToDb: 'Zurück zur Datenbank',
      addToPlan: 'In den Plan übernehmen',
      adding: 'Wird hinzugefügt...',
      startWorkout: 'Workout starten!',
      exercises: 'Übungen',
      sets: 'Sätze',
      chooseDays: 'Wochentage wählen',
      selectedDays: 'ausgewählt',
      addToDays: 'Zu',
      chooseDaysFirst: 'Tage auswählen...',
      addWithoutDay: 'Ohne Wochentag hinzufügen',
      added: 'zum Plan hinzugefügt!',
      addError: 'Fehler beim Hinzufügen.',
    };
  const breakDuration = getBreakDuration();
  const [adding, setAdding] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);

  const urlParams = new URLSearchParams(window.location.search);
  const addToDay = urlParams.get('addToDay');

  const { data: tmpl, isLoading } = useQuery({
    queryKey: ['workout-template', id],
    queryFn: async () => getWorkoutTemplateById(id),
  });

  const { data: myWorkouts = [] } = useQuery({
    queryKey: ['workouts'],
    queryFn: listWorkouts,
  });

  const createMutation = useMutation({
    mutationFn: createWorkout,
    onSuccess: (newWorkout) => {
      if (newWorkout?.id) localWorkouts.upsert(newWorkout);
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const exercises = tmpl?.exercises || [];
  const durationExercises = exercises.filter((exercise) => !exercise.use_sets);
  const totalSecs = durationExercises.reduce((sum, exercise) => sum + (exercise.duration || 90), 0) + Math.max(0, exercises.length - 1) * breakDuration;
  const totalSets = exercises.reduce((sum, exercise) => (exercise.use_sets ? sum + (exercise.sets || 3) : sum), 0);

  const safeMyWorkouts = Array.isArray(myWorkouts) ? myWorkouts : [];
  const matchingWorkout = safeMyWorkouts.find((workout) => workout.name === tmpl?.name);

  const doAddToPlan = async (days) => {
    if (!tmpl) return;
    setAdding(true);
    try {
      await createMutation.mutateAsync({
        name: tmpl.name,
        weekdays: days || [],
        color: '#212121',
        exercises: tmpl.exercises || [],
        sort_order: safeMyWorkouts.length,
        workout_number: safeMyWorkouts.length + 1,
      });
      toast.success(`"${tmpl.name}" ${copy.added}`);
      navigate('/');
    } catch {
      toast.error(copy.addError);
    }
    setAdding(false);
  };

  const handleAddToPlanClick = () => {
    if (addToDay) doAddToPlan([addToDay]);
    else {
      setSelectedDays([]);
      setShowDayPicker(true);
    }
  };

  const toggleDay = (key) => {
    setSelectedDays((prev) => (prev.includes(key) ? prev.filter((day) => day !== key) : [...prev, key]));
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!tmpl) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 px-4 text-center">
        <p className="text-muted-foreground font-body">{copy.notFound}</p>
        <Button onClick={() => navigate('/workout-database')} variant="outline">{copy.backToDb}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors py-2 pr-3 -ml-1 rounded-lg active:bg-muted/40">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base font-body font-medium">{t('common.back')}</span>
        </button>

        <div className="mb-1"><span className="text-xs font-body text-primary font-semibold uppercase tracking-wider">{tmpl.category}</span></div>
        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground mb-2">{tmpl.name}</h1>

        {tmpl.description ? <p className="text-sm font-body text-muted-foreground mb-4 leading-relaxed">{tmpl.description}</p> : null}
        {tmpl.tags ? (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {tmpl.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => <span key={tag} className="text-xs font-body bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">{tag}</span>)}
          </div>
        ) : null}

        <Button onClick={handleAddToPlanClick} disabled={adding} variant="outline" className="w-full h-12 mb-3 text-base font-body gap-2 border-primary/20 hover:bg-primary hover:text-primary-foreground transition-colors">
          <PlusCircle className="w-5 h-5" />
          {adding ? copy.adding : copy.addToPlan}
        </Button>

        {matchingWorkout && exercises.length > 0 ? (
          <Button onClick={() => navigate(`/training/${matchingWorkout.id}?autostart=1`)} className="w-full h-14 text-lg font-body font-semibold gap-3 mb-6 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20">
            <Play className="w-6 h-6" fill="currentColor" />
            {copy.startWorkout}
          </Button>
        ) : null}

        {exercises.length > 0 ? (
          <div className="flex items-center justify-center gap-2 flex-wrap mb-3 font-body text-muted-foreground">
            <span className="text-base font-semibold text-foreground">{exercises.length} {copy.exercises}</span>
            {totalSecs > 0 ? <><span className="text-base font-bold">·</span><DurDisplay seconds={totalSecs} /></> : null}
            {totalSets > 0 ? <><span className="text-base font-bold">·</span><span className="text-yellow-700 text-base font-semibold tabular-nums">{totalSets} {copy.sets}</span></> : null}
          </div>
        ) : null}

        {exercises.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
            {exercises.map((exercise, index) => (
              <div key={index} onClick={() => navigate(`/exercise/${exercise.exercise_index || exercise.exercise_id || exercise.id}`)} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors ${index < exercises.length - 1 ? 'border-b border-border/50' : ''}`}>
                <div className="shrink-0 w-14 h-14 flex items-center justify-center overflow-hidden rounded-lg">
                  <StickFigureAnimation animationType={exercise.animation_type} exerciseIndex={exercise.exercise_index} size={56} color="hsl(230, 70%, 50%)" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground font-body truncate">{exercise.name}</div>
                  <div className="text-xs text-muted-foreground font-body mt-0.5">
                    {exercise.use_sets
                      ? <span className="text-yellow-700 text-xs font-semibold tabular-nums">{exercise.sets || 3}x{exercise.reps || 10} S</span>
                      : <span className="text-accent text-xs font-semibold tabular-nums">{Math.floor((exercise.duration || 90) / 60)}m {String((exercise.duration || 90) % 60).padStart(2, '0')}s</span>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-body hidden sm:inline shrink-0">{exercise.category}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {showDayPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowDayPicker(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground font-body">{copy.chooseDays}</p>
              <button onClick={() => setShowDayPicker(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {WEEKDAYS.map(({ key, label }) => (
                <button key={key} onClick={() => toggleDay(key)} className={`py-2 rounded-lg text-sm font-body font-semibold transition-colors border ${selectedDays.includes(key) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-muted/50'}`}>{label}</button>
              ))}
            </div>
            {selectedDays.length > 0 ? <p className="text-xs text-muted-foreground font-body text-center mb-3">{selectedDays.length} {copy.selectedDays}</p> : null}
            <div className="flex flex-col gap-2">
              <Button onClick={() => { setShowDayPicker(false); doAddToPlan(selectedDays); }} disabled={adding || selectedDays.length === 0} className="w-full font-body">
                {selectedDays.length > 0 ? `${copy.addToDays} ${selectedDays.join(', ')} ${language === 'en' ? 'add' : 'hinzufügen'}` : copy.chooseDaysFirst}
              </Button>
              <Button variant="ghost" onClick={() => { setShowDayPicker(false); doAddToPlan([]); }} disabled={adding} className="w-full font-body text-muted-foreground text-sm">
                {copy.addWithoutDay}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

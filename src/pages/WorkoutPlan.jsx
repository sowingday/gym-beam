import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BottomNav from '../components/BottomNav';
import WeekDayColumn from '../components/WeekDayColumn';
import AddExistingWorkoutSheet from '../components/AddExistingWorkoutSheet';
import { seedExercisesIfNeeded } from '../lib/seedExercises';
import { getBreakDuration, getShowGreeting, getPlanZoom } from '../lib/settings';
import { localWorkouts } from '../lib/localWorkouts';
import { normalizeWorkouts } from '../lib/normalize';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';
import { useI18n } from '../lib/i18n';
import { getCurrentAuthUser } from '../lib/authClient';
import { createWorkout, deleteWorkout, getLatestAchievement, listWorkouts, updateWorkout } from '../lib/workoutDataService';

const JS_DAY_MAP = { 0: 'So', 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa' };
const todayKey = JS_DAY_MAP[new Date().getDay()];
const DEFAULT_COLOR = '#212121';
const BREAK = getBreakDuration();

function getWorkoutDays(workout) {
  const days = Array.isArray(workout.weekdays) ? workout.weekdays : [];
  if (days.length) return days;
  return workout.weekday ? [workout.weekday] : [];
}

function getExCount(workout) {
  return (workout.exercises || []).length;
}

function getTotals(workout) {
  const exercises = workout.exercises || [];
  if (!exercises.length) return { secs: 0, sets: 0, allSets: false };
  const durationExercises = exercises.filter((exercise) => !exercise.use_sets);
  const secs = durationExercises.reduce((sum, exercise) => sum + (exercise.duration || 90), 0) + Math.max(0, exercises.length - 1) * BREAK;
  const sets = exercises.reduce((sum, exercise) => (exercise.use_sets ? sum + (exercise.sets || 3) : sum), 0);
  return { secs, sets, allSets: durationExercises.length === 0 && exercises.length > 0 };
}

export default function WorkoutPlan() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, dateLocale, messages, language } = useI18n();
  const weekdays = messages.workoutPlan.weekdays;
  const planZoom = getPlanZoom();
  const [seeding, setSeeding] = useState(true);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [dayOrders, setDayOrders] = useState({});
  const [existingSheet, setExistingSheet] = useState(null);

  useEffect(() => {
    seedExercisesIfNeeded().catch(() => {}).then(async () => {
      setSeeding(false);
      if (!getShowGreeting()) return;
      if (window.__wb_greeted__) return;
      window.__wb_greeted__ = true;

      try {
        const latestAchievement = await getLatestAchievement();
        if (!latestAchievement?.date) return;

        const lastDate = latestAchievement.date;
        const today = new Date().toISOString().split('T')[0];
        if (lastDate === today) return;

        const user = await getCurrentAuthUser();
        const name = user.profile_name || user.full_name || 'Max Muscle';
        const last = new Date(lastDate);
        const diff = differenceInDays(new Date(today), last);
        let when;
        if (diff === 1) when = t('workoutPlan.yesterday');
        else if (diff === 2) when = t('workoutPlan.dayBeforeYesterday');
        else when = t('workoutPlan.onDate', { date: format(last, 'EEEE, dd. MMMM', { locale: dateLocale }) });

        toast(t('workoutPlan.greeting', { name, when }), { duration: 6000 });
      } catch (_) {}
    });
  }, [dateLocale, t]);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      try {
        return normalizeWorkouts(await listWorkouts());
      } catch (_) {
        return localWorkouts.list();
      }
    },
    enabled: !seeding,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return updateWorkout(id, data);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['workouts'] });
      const previousWorkouts = queryClient.getQueryData(['workouts']);
      const currentWorkout = previousWorkouts?.find((workout) => workout.id === id);
      if (currentWorkout?.id?.startsWith('local_')) {
        localWorkouts.upsert({ ...currentWorkout, ...data, id });
      }
      queryClient.setQueryData(['workouts'], (current = []) => current.map((workout) => (workout.id === id ? { ...workout, ...data } : workout)));
      return { previousWorkouts };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousWorkouts) {
        queryClient.setQueryData(['workouts'], context.previousWorkouts);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workouts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workouts'] }),
  });

  const createMutation = useMutation({
    mutationFn: createWorkout,
    onSuccess: (newWorkout) => {
      if (newWorkout?.id?.startsWith('local_')) {
        localWorkouts.upsert(newWorkout);
      }
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      if (newWorkout?.id) navigate(`/workout/${newWorkout.id}`);
      else toast.error(t('workoutPlan.createFailed'));
    },
    onError: (error) => {
      toast.error(`${t('workoutPlan.createError')}: ${error?.message || t('workoutPlan.unknownError')}`);
    },
  });

  const getWorkoutsForDay = (dayKey) => {
    const list = workouts.filter((workout) => getWorkoutDays(workout).includes(dayKey));
    const order = dayOrders[dayKey];
    if (!order) return list;
    return [...list].sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  };

  const handleDragEnd = (dayKey, result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const list = getWorkoutsForDay(dayKey);
    const items = Array.from(list);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setDayOrders((prev) => ({ ...prev, [dayKey]: items.map((workout) => workout.id) }));
  };

  const handleRemoveFromDay = (workoutId, dayKey) => {
    const workout = workouts.find((item) => item.id === workoutId);
    if (!workout) return;
    const newDays = getWorkoutDays(workout).filter((day) => day !== dayKey);
    updateMutation.mutate({ id: workoutId, data: { weekdays: newDays } });
  };

  const handleDeleteWorkout = (workoutId) => {
    deleteMutation.mutate(workoutId);
  };

  const openRename = (workout) => {
    setRenameValue(workout.name);
    setRenameTarget(workout);
  };

  const saveRename = () => {
    if (renameTarget && renameValue.trim()) {
      updateMutation.mutate({ id: renameTarget.id, data: { name: renameValue.trim() } });
    }
    setRenameTarget(null);
  };

  const handleAddNew = (dayKey) => {
    const maxNum = workouts.reduce((max, workout) => Math.max(max, workout.workout_number || 0), 0);
    createMutation.mutate({
      name: `Workout ${maxNum + 1}`,
      weekdays: [dayKey],
      color: DEFAULT_COLOR,
      exercises: [],
      sort_order: workouts.length,
      workout_number: maxNum + 1,
    });
  };

  const handleAddExisting = (dayKey, dayLabel) => {
    setExistingSheet({ day: dayKey, dayLabel });
  };

  const handleSelectExisting = (workout) => {
    if (!existingSheet) return;
    const currentDays = getWorkoutDays(workout);
    if (currentDays.includes(existingSheet.day)) {
      toast(language === 'en'
        ? `"${workout.name}" is already assigned to ${existingSheet.dayLabel}.`
      : `"${workout.name}" ist bereits für ${existingSheet.dayLabel} eingetragen.`);
      setExistingSheet(null);
      return;
    }

    const newDays = [...currentDays, existingSheet.day];
    if (workout.id.startsWith('local_')) {
      localWorkouts.update(workout.id, { weekdays: newDays });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    } else {
      updateMutation.mutate({ id: workout.id, data: { weekdays: newDays } });
    }
    setExistingSheet(null);
  };

  const handleAddFromBase = (dayKey) => {
    navigate(`/workout-database?addToDay=${dayKey}`);
  };

  const handleColorChange = (workoutId, color) => {
    updateMutation.mutate({ id: workoutId, data: { color } });
  };

  if (seeding || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Dumbbell className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground font-body">{t('common.loadingExerciseDb')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      <div className="text-[hsl(var(--primary))] mx-auto px-4 py-8 max-w-7xl">
        <h1 className="font-display text-5xl md:text-6xl tracking-wide text-primary text-center mb-8 drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
          Workout Plan
        </h1>

        <div className="grid grid-cols-1 mb-8 border border-border shadow-[0_6px_20px_0_rgba(0,0,0,0.22)] divide-y divide-border" style={{ '--plan-zoom': planZoom, fontSize: `${planZoom}rem` }}>
          {weekdays.map(({ key, label }) => (
            <WeekDayColumn
              key={key}
              day={key}
              dayLabel={label}
              isToday={key === todayKey}
              workouts={getWorkoutsForDay(key)}
              allWorkouts={workouts}
              onDragEnd={handleDragEnd}
              onRemoveFromDay={handleRemoveFromDay}
              onDeleteWorkout={handleDeleteWorkout}
              onRename={openRename}
              onAddNew={handleAddNew}
              onAddExisting={(day) => handleAddExisting(day, label)}
              onAddFromBase={handleAddFromBase}
              onColorChange={handleColorChange}
              getExCount={getExCount}
              getTotals={getTotals}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Link to="/calendar" className="block">
            <Button variant="outline" className="w-full h-12 text-base font-body gap-2 border-border hover:bg-secondary/70 transition-colors shadow-[0_4px_12px_0_rgba(0,0,0,0.18)] active:shadow-none active:translate-y-0.5">
              <Calendar className="w-5 h-5" />
              {t('workoutPlan.monthCalendar')}
            </Button>
          </Link>
          <Link to="/workout-database" className="block">
            <Button variant="outline" className="w-full h-12 text-base font-body gap-2 border-border hover:bg-secondary/70 transition-colors shadow-[0_4px_12px_0_rgba(0,0,0,0.18)] active:shadow-none active:translate-y-0.5">
              <Dumbbell className="w-5 h-5" />
              {t('workoutPlan.database')}
            </Button>
          </Link>
          <Link to="/ai-coach" className="block">
            <Button variant="outline" className="w-full h-12 text-base font-body gap-2 border-border hover:bg-secondary/70 transition-colors shadow-[0_4px_12px_0_rgba(0,0,0,0.18)] active:shadow-none active:translate-y-0.5">
              <Sparkles className="w-5 h-5" />
              {t('workoutPlan.aiCoach')}
            </Button>
          </Link>
        </div>
      </div>

      <BottomNav />

      <AddExistingWorkoutSheet
        open={!!existingSheet}
        onClose={() => setExistingSheet(null)}
        onSelect={handleSelectExisting}
        workouts={workouts}
        dayLabel={existingSheet?.dayLabel || ''}
        currentDay={existingSheet?.day || null}
      />

      {renameTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setRenameTarget(null)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-5 w-72 max-w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-foreground mb-3">{t('workoutPlan.renameWorkout')}</p>
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename();
                if (e.key === 'Escape') setRenameTarget(null);
              }}
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setRenameTarget(null)}>{t('workoutPlan.cancel')}</Button>
              <Button size="sm" onClick={saveRename}>{t('workoutPlan.save')}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

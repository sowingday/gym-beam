import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckSquare, Square, CheckCircle2, PersonStanding } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExerciseFilterTable from '../components/ExerciseFilterTable';
import { getLocalExercises } from '../lib/localExercises';
import { getFavoriteIds, toggleFavorite } from '../lib/favorites';
import { getExerciseKey } from '../lib/normalize';
import { useI18n } from '../lib/i18n';
import { getWorkoutById, updateWorkout } from '../lib/workoutDataService';

export default function ExerciseSelection() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useI18n();

  const urlParams = new URLSearchParams(window.location.search);
  const replaceIndex = urlParams.get('replace');

  const [favoriteIds, setFavoriteIds] = useState(() => getFavoriteIds());
  const [multiMode, setMultiMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());

  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises', language],
    queryFn: async () => getLocalExercises(language),
    retry: false,
  });

  const { data: workout } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: async () => getWorkoutById(workoutId),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => updateWorkout(workoutId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const handleToggleFavorite = (indexOrExercise, event) => {
    if (event) event.stopPropagation();
    toggleFavorite(indexOrExercise);
    setFavoriteIds(getFavoriteIds());
  };

  const handleToggleCheck = (exercise, event) => {
    if (event) event.stopPropagation();
    const key = getExerciseKey(exercise);
    if (key === null) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRowClick = (exercise) => {
    const key = getExerciseKey(exercise);
    if (multiMode) {
      handleToggleCheck(exercise);
      return;
    }
    navigate(`/exercise/${key}?fromWorkout=${workoutId}${replaceIndex !== null ? `&replace=${replaceIndex}` : ''}`);
  };

  const handleAddChecked = () => {
    const toAdd = exercises.filter((exercise) => checkedIds.has(getExerciseKey(exercise)));
    if (!toAdd.length) return;
    const currentExercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
    const newEntries = toAdd.map((exercise) => {
      const idx = getExerciseKey(exercise);
      return {
        exercise_index: idx != null ? Number(idx) : null,
        exercise_id: idx != null ? String(idx) : null,
        name: exercise.name,
        category: Array.isArray(exercise.categories) ? exercise.categories[0] : (exercise.category || ''),
        duration: 90,
        animation_type: exercise.animation_type,
      };
    });

    updateMutation.mutate(
      { exercises: [...currentExercises, ...newEntries] },
      { onSuccess: () => navigate(`/workout/${workoutId}`) },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => navigate(`/workout/${workoutId}`)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-body">{t('common.back')}</span>
          </button>
          <p className="text-sm text-destructive font-body">Die Übungsdatenbank konnte lokal nicht geladen werden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(`/workout/${workoutId}`)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-body">{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-2 mb-6">
          <PersonStanding className="w-7 h-7 text-foreground shrink-0" />
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground">{t('exercises.selectTitle')}</h1>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              setMultiMode((prev) => !prev);
              setCheckedIds(new Set());
            }}
            className={`inline-flex items-center gap-1.5 text-sm font-body px-3 py-1.5 rounded-lg border transition-colors ${multiMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            {multiMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {t('exercises.multiSelect')}
          </button>
          {multiMode && checkedIds.size > 0 ? <span className="text-xs text-muted-foreground font-body">{t('exercises.selectedCount', { count: checkedIds.size })}</span> : null}
        </div>

        <ExerciseFilterTable
          exercises={exercises}
          onSelect={handleRowClick}
          selectedId={null}
          onToggleFavorite={handleToggleFavorite}
          favoriteIds={favoriteIds}
          multiMode={multiMode}
          checkedIds={checkedIds}
          onToggleCheck={handleToggleCheck}
        />
      </div>

      {multiMode && checkedIds.size > 0 ? (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-4">
          <Button onClick={handleAddChecked} className="h-14 px-8 text-base font-body font-semibold gap-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-xl shadow-accent/30">
            <CheckCircle2 className="w-5 h-5" />
            {t('exercises.applyCount', { count: checkedIds.size })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

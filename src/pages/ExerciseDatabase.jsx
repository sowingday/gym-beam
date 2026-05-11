import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PersonStanding } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import ExerciseFilterTable from '../components/ExerciseFilterTable';
import { filterExercisesForProfileGender, getLocalExercises } from '../lib/localExercises';
import { getFavoriteIds, toggleFavorite } from '../lib/favorites';
import { useI18n } from '../lib/i18n';
import { getCurrentUser } from '../lib/userService';

export default function ExerciseDatabase() {
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const [, forceUpdate] = useState(0);

  const { data: exercises = [], isLoading, error } = useQuery({
    queryKey: ['exercises', language],
    queryFn: async () => getLocalExercises(language),
    retry: false,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  const visibleExercises = React.useMemo(
    () => filterExercisesForProfileGender(exercises, currentUser?.profile_gender || ''),
    [currentUser?.profile_gender, exercises],
  );

  const handleSelect = (exercise) => {
    const key = exercise.exercise_index ?? exercise.index ?? exercise.id;
    navigate(`/exercise/${key}`);
  };

  const handleToggleFavorite = useCallback((exerciseId, event) => {
    event.stopPropagation();
    toggleFavorite(exerciseId);
    forceUpdate((value) => value + 1);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground font-body mb-2">{t('common.loadingExerciseDb')}</p>
            <p className="text-sm text-destructive font-body">Die Übungsdatenbank konnte lokal nicht geladen werden.</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <PersonStanding className="w-[2.5rem] h-[2.5rem] text-primary shrink-0" />
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
            {t('exercises.titleAll')}
          </h1>
        </div>

        {visibleExercises.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-body mb-2">{t('exercises.empty')}</p>
            <p className="text-sm text-muted-foreground font-body">{t('exercises.uploadHint')}</p>
          </div>
        ) : (
          <ExerciseFilterTable
            exercises={visibleExercises}
            onSelect={handleSelect}
            onToggleFavorite={handleToggleFavorite}
            favoriteIds={getFavoriteIds()}
          />
        )}
      </div>
      <BottomNav />
    </div>
  );
}

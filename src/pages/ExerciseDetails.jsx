import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Star, PlusCircle } from 'lucide-react';
import { isFavorite, toggleFavorite } from '../lib/favorites';
import { splitToArray, safeString } from '../lib/normalize';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StickFigureAnimation from '../components/StickFigureAnimation';
import MuscleCard from '../components/MuscleCard';
import { getLocalExercises } from '../lib/localExercises';
import { toast } from 'sonner';
import { useI18n } from '../lib/i18n';
import { resolveMusclesEn } from '../lib/muscleData';
import { getWorkoutById, updateWorkout } from '../lib/workoutDataService';
import { reindexWorkoutExercises } from '../lib/workoutExerciseStore';

export default function ExerciseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useI18n();
  const [, forceUpdate] = React.useState(0);
  const [adding, setAdding] = React.useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const fromWorkout = urlParams.get('fromWorkout');
  const replaceIndex = urlParams.get('replace');

  const { data: workout } = useQuery({
    queryKey: ['workout', fromWorkout],
    queryFn: async () => {
      if (!fromWorkout) return null;
      return getWorkoutById(fromWorkout);
    },
    enabled: !!fromWorkout,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => updateWorkout(fromWorkout, data),
    onSuccess: (updatedWorkout) => {
      if (updatedWorkout) {
        queryClient.setQueryData(['workout', fromWorkout], updatedWorkout);
      }
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercise', id, language],
    queryFn: async () => {
      const local = await getLocalExercises(language);
      const found = local.find((item) => String(item.exercise_index ?? item.index) === String(id));
      if (found) return found;
      return null;
    },
  });

  const handleAddToWorkout = () => {
    if (!exercise || !fromWorkout) return;
    setAdding(true);

    const exIndex = exercise.exercise_index ?? exercise.index ?? null;
    const categories = splitToArray(exercise.categories);
    const newEntry = {
      exercise_index: exIndex != null ? Number(exIndex) : null,
      exercise_id: exIndex != null ? String(exIndex) : null,
      name: exercise.name,
      category: categories[0] || exercise.category || '',
      duration: 90,
      animation_type: exercise.animation_type || exercise.animationKey || '',
    };

    const currentExercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
    const updatedExercises = replaceIndex !== null
      ? currentExercises.map((entry, index) => (index === parseInt(replaceIndex, 10) ? newEntry : entry))
      : [...currentExercises, newEntry];

    updateMutation.mutate(
      { exercises: reindexWorkoutExercises(updatedExercises) },
      {
        onSuccess: () => {
          toast.success(t('exercises.added', { name: exercise.name }));
          navigate(`/workout/${fromWorkout}`);
        },
        onError: () => {
          toast.error(language === 'en' ? 'Exercise could not be added.' : 'Übung konnte nicht hinzugefügt werden.');
        },
        onSettled: () => setAdding(false),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground font-body text-center">{t('exercises.notFound')}</p>
        <button onClick={() => navigate(-1)} className="text-primary font-body text-sm underline">{t('common.back')}</button>
      </div>
    );
  }

  const exIndex = exercise.exercise_index ?? exercise.index ?? null;
  const categories = splitToArray(exercise.categories);
  const displayCategory = categories[0] || exercise.category || '';
  const description = safeString(exercise.shortDescription || exercise.description || '');
  const notes = safeString(exercise.notes || exercise.tips || '');
  const muscles = splitToArray(exercise.muscles);
  const musclesLatin = splitToArray(exercise.musclesLatin);
  const animIndex = exIndex != null ? Number(exIndex) : null;
  const animType = exercise.animation_type || exercise.animationKey || '';
  const muscleCards = muscles.length > 0
    ? resolveMusclesEn(muscles).map((item) => ({
      key: item.key,
      name: item.key,
      latinName: item.latin,
      region: item.region,
    }))
    : [];
  const muscleEntries = muscleCards.length > 0
    ? muscleCards.map((item) => ({
      ...item,
      label: item.name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    }))
    : muscles.map((muscle, index) => ({
      key: `${muscle}-${index}`,
      label: muscle,
      latinName: musclesLatin[index] || '',
      region: 'core',
    }));

  const InfoCard = ({ title, children }) => (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 font-body">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors py-2 pr-3 -ml-1 rounded-lg active:bg-muted/40">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base font-body font-medium">{t('common.back')}</span>
        </button>

        <div className="flex items-start gap-3 mb-2">
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground flex-1">{exercise.name}</h1>
          <button
            onClick={() => {
              toggleFavorite(exercise);
              forceUpdate((value) => value + 1);
            }}
            className="shrink-0 mt-2 p-1 rounded transition-colors hover:scale-110"
            title={t('exercises.favorite')}
          >
            <Star className={`w-6 h-6 ${isFavorite(exercise) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.length > 0
            ? categories.map((category, index) => <Badge key={index} variant="secondary" className="text-sm font-body">{category}</Badge>)
            : displayCategory
              ? <Badge variant="secondary" className="text-sm font-body">{displayCategory}</Badge>
              : null}
        </div>

        {fromWorkout ? (
          <div className="mb-6">
            <Button onClick={handleAddToWorkout} disabled={adding} className="w-full h-11 font-body gap-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
              <PlusCircle className="w-5 h-5" />
              {adding ? t('exercises.adding') : t('exercises.addToWorkout')}
            </Button>
          </div>
        ) : null}

        <div className="flex justify-center mb-6 p-6 bg-card rounded-2xl border border-border shadow-sm">
          <StickFigureAnimation animationType={animType} exerciseIndex={animIndex} size={220} color="hsl(230, 70%, 50%)" />
        </div>

        <div className="space-y-4">
          {description ? (
            <InfoCard title={t('exercises.description')}>
              <p className="text-foreground font-body leading-relaxed">{description}</p>
            </InfoCard>
          ) : null}

          {muscleEntries.length > 0 ? (
            <InfoCard title={`${t('exercises.muscles')} / ${t('exercises.musclesLatin')}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                {muscleEntries.map((muscle) => (
                  <MuscleCard key={muscle.key} name={muscle.label} latinName={muscle.latinName} region={muscle.region} />
                ))}
              </div>
            </InfoCard>
          ) : null}

          {notes ? (
            <InfoCard title={t('exercises.notes')}>
              <p className="text-foreground font-body leading-relaxed">{notes}</p>
            </InfoCard>
          ) : null}

          {exercise.video_url ? (
            <InfoCard title={t('exercises.video')}>
              <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-body">
                <ExternalLink className="w-4 h-4" />
                {t('exercises.watchVideo')}
              </a>
            </InfoCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

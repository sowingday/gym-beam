import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, ArrowLeft, Play, Check, X, Dumbbell, Clock, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ConfirmDialog from '../components/ConfirmDialog';
import StickFigureAnimation from '../components/StickFigureAnimation';
import DurDisplay from '../components/DurDisplay';
import { toast } from 'sonner';
import { getBreakDuration } from '../lib/settings';
import { localWorkouts } from '../lib/localWorkouts';
import { useI18n } from '../lib/i18n';
import { getWorkoutById, updateWorkout } from '../lib/workoutDataService';
import { reindexWorkoutExercises } from '../lib/workoutExerciseStore';

function computeTotals(exercises, breakDuration) {
  const durationExercises = exercises.filter((exercise) => !exercise.use_sets);
  const totalSecs = durationExercises.reduce((sum, exercise) => sum + (exercise.duration || 90), 0) + Math.max(0, exercises.length - 1) * breakDuration;
  const totalSets = exercises.reduce((sum, exercise) => (exercise.use_sets ? sum + (exercise.sets || 3) : sum), 0);
  return { totalSecs, totalSets, allSets: durationExercises.length === 0 && exercises.length > 0 };
}

function getDraggableItemStyle(style, isDropAnimating) {
  if (!style) return undefined;
  const transform = style.transform ? `${style.transform} translateZ(0)` : 'translateZ(0)';
  if (isDropAnimating) {
    return {
      ...style,
      transform,
      transitionDuration: '0.001s',
      transitionTimingFunction: 'linear',
      opacity: 1,
      willChange: 'auto',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      transformStyle: 'preserve-3d',
      contain: 'paint',
    };
  }
  return {
    ...style,
    transform,
    willChange: 'transform',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transformStyle: 'preserve-3d',
    contain: 'paint',
  };
}

function patchSecondaryItemStyle(style, disableTransition) {
  if (!style || !disableTransition) return style;
  return {
    ...style,
    transition: 'none',
    transitionDuration: '0.001s',
  };
}

function areExercisesEquivalent(currentExercises = [], nextExercises = []) {
  if (currentExercises.length !== nextExercises.length) return false;
  return currentExercises.every((exercise, index) => {
    const nextExercise = nextExercises[index];
    if (!nextExercise) return false;
    return exercise.client_key === nextExercise.client_key
      && exercise.exercise_id === nextExercise.exercise_id
      && exercise.exercise_index === nextExercise.exercise_index
      && exercise.name === nextExercise.name
      && exercise.category === nextExercise.category
      && exercise.duration === nextExercise.duration
      && exercise.use_sets === nextExercise.use_sets
      && exercise.sets === nextExercise.sets
      && exercise.reps === nextExercise.reps
      && exercise.weight_kg === nextExercise.weight_kg
      && exercise.animation_type === nextExercise.animation_type
      && exercise.sort_order === nextExercise.sort_order;
  });
}

function getExerciseKey(exercise, fallbackIndex = 0) {
  return exercise?.client_key || `${exercise?.exercise_id || exercise?.exercise_index || 'exercise'}-${fallbackIndex}`;
}

const WorkoutExerciseRow = React.memo(function WorkoutExerciseRow({
  exercise,
  exerciseKey,
  dragHandleProps,
  snapshot,
  copy,
  disableTransition,
  isEditOpen,
  isWeightOpen,
  editMode,
  editMin,
  editSec,
  editSets,
  editReps,
  editWeight,
  onNavigate,
  onOpenExerciseEdit,
  onCloseExerciseEdit,
  onSetEditMode,
  onSetEditMin,
  onSetEditSec,
  onSetEditSets,
  onSetEditReps,
  onSaveExercise,
  onOpenWeightEdit,
  onCloseWeightEdit,
  onSetEditWeight,
  onSaveWeight,
  onDelete,
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-2 border-b border-border/50 [transform:translateZ(0)] [backface-visibility:hidden] [contain:paint] sm:gap-2 sm:px-3 ${snapshot.isDropAnimating ? '' : 'transition-colors'} ${snapshot.isDragging ? 'bg-primary/5 shadow-lg' : 'hover:bg-muted/30'}`}
      onClick={() => onNavigate(exercise)}
      style={disableTransition ? { transition: 'none' } : undefined}
    >
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground shrink-0 -m-1 rounded-xl p-3 sm:p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-5 h-5 sm:w-4 sm:h-4" />
      </div>

      <div className="shrink-0 w-24 h-24 flex items-center justify-center overflow-hidden rounded-lg">
        <StickFigureAnimation animationType={exercise.animation_type} exerciseIndex={exercise.exercise_index} size={96} color="hsl(230, 70%, 50%)" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-foreground truncate hover:text-primary transition-colors">{exercise.name}</div>
        <div className="flex items-center mt-0.5" onClick={(e) => e.stopPropagation()}>
          <Popover open={isEditOpen} onOpenChange={(open) => { if (!open) onCloseExerciseEdit(); }}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 text-primary/70 hover:text-primary min-w-[72px]" onClick={(e) => onOpenExerciseEdit(exerciseKey, exercise, e)}>
                {exercise.use_sets
                  ? <><ListOrdered className="w-3 h-3 shrink-0" /><span className="text-yellow-700 text-xs font-semibold">{exercise.sets || 3}x{exercise.reps || 10}</span></>
                  : <><Clock className="w-3 h-3 shrink-0" /><span className="text-xs font-semibold text-accent tabular-nums">{Math.floor((exercise.duration || 90) / 60) > 0 ? `${Math.floor((exercise.duration || 90) / 60)}m ` : ''}{String((exercise.duration || 90) % 60).padStart(2, '0')}s</span></>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex rounded-lg overflow-hidden border border-border mb-3">
                <button className={`flex-1 py-1.5 text-xs font-body flex items-center justify-center gap-1 transition-colors ${editMode === 'dur' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`} onClick={() => onSetEditMode('dur')}>
                  <Clock className="w-3 h-3" /> {copy.durationMode}
                </button>
                <button className={`flex-1 py-1.5 text-xs font-body flex items-center justify-center gap-1 transition-colors ${editMode === 'sets' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`} onClick={() => onSetEditMode('sets')}>
                  <ListOrdered className="w-3 h-3" /> {copy.setMode}
                </button>
              </div>

              {editMode === 'dur' ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2">{copy.durationHelp}</p>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Input type="number" min={0} max={99} value={editMin} onChange={(e) => onSetEditMin(e.target.value)} className="h-8 text-sm w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') onSaveExercise(exerciseKey); }} />
                    <span className="text-sm text-muted-foreground">{copy.minutes}</span>
                    <Input type="number" min={0} max={59} value={editSec} onChange={(e) => onSetEditSec(e.target.value)} className="h-8 text-sm w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') onSaveExercise(exerciseKey); }} />
                    <span className="text-sm text-muted-foreground">{copy.seconds}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">{copy.setHelp}</p>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Input type="number" min={1} max={99} value={editSets} onChange={(e) => onSetEditSets(e.target.value)} className="h-8 text-sm w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') onSaveExercise(exerciseKey); }} />
                    <span className="text-sm text-muted-foreground">x</span>
                    <Input type="number" min={1} max={999} value={editReps} onChange={(e) => onSetEditReps(e.target.value)} className="h-8 text-sm w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') onSaveExercise(exerciseKey); }} />
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 flex-1" onClick={onCloseExerciseEdit}>{copy.cancel}</Button>
                <Button size="sm" className="h-8 flex-1" onClick={() => onSaveExercise(exerciseKey)}>{copy.ok}</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={isWeightOpen} onOpenChange={(open) => { if (!open) onCloseWeightEdit(); }}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-primary ml-3" onClick={(e) => onOpenWeightEdit(exerciseKey, exercise, e)}>
                <Dumbbell className="w-3 h-3 shrink-0" />
                {exercise.weight_kg != null ? <span className="text-yellow-700 text-xs font-semibold">{exercise.weight_kg} kg</span> : <span className="text-[10px] text-muted-foreground/50">-</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs text-muted-foreground mb-2">{copy.weightHelp}</p>
              <Input type="number" min={1} max={999} value={editWeight} placeholder="kg" onChange={(e) => onSetEditWeight(e.target.value)} className="h-8 text-sm mb-2 text-center" onKeyDown={(e) => { if (e.key === 'Enter') onSaveWeight(exerciseKey); }} autoFocus />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 flex-1" onClick={onCloseWeightEdit}>{copy.cancel}</Button>
                <Button size="sm" className="h-8 flex-1" onClick={() => onSaveWeight(exerciseKey)}>{copy.ok}</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 hidden sm:inline">{exercise.category}</span>

      <button onClick={(e) => { e.stopPropagation(); onDelete(exerciseKey); }} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.exercise === nextProps.exercise
  && prevProps.snapshot.isDragging === nextProps.snapshot.isDragging
  && prevProps.snapshot.isDropAnimating === nextProps.snapshot.isDropAnimating
  && prevProps.disableTransition === nextProps.disableTransition
  && prevProps.isEditOpen === nextProps.isEditOpen
  && prevProps.isWeightOpen === nextProps.isWeightOpen
  && (!nextProps.isEditOpen || (
    prevProps.editMode === nextProps.editMode
    && prevProps.editMin === nextProps.editMin
    && prevProps.editSec === nextProps.editSec
    && prevProps.editSets === nextProps.editSets
    && prevProps.editReps === nextProps.editReps
  ))
  && (!nextProps.isWeightOpen || prevProps.editWeight === nextProps.editWeight)
));

export default function WorkoutDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useI18n();
  const copy = language === 'en'
    ? {
      notFound: 'Workout not found.',
      backToPlan: 'Back to plan',
      back: 'Back',
      renameHint: 'Click to rename',
      exercises: 'exercises',
      sets: 'sets',
      start: 'Start workout!',
      addExercise: 'Add exercise',
      noExercises: 'Please add exercises first!',
      durationMode: 'Duration',
      setMode: 'Sets',
      durationHelp: 'Duration (min. 10s, max. 99m)',
      setHelp: 'Sets x reps',
      weightHelp: 'Weight in kg (1-999, empty = none)',
      ok: 'Ok',
      cancel: 'Cancel',
      minutes: 'm',
      seconds: 's',
    }
    : {
      notFound: 'Workout nicht gefunden.',
      backToPlan: 'Zurück zum Plan',
      back: t('common.back'),
      renameHint: 'Klicken zum Umbenennen',
      exercises: 'Übungen',
      sets: 'Sätze',
      start: 'Workout starten!',
      addExercise: 'Übung hinzufügen',
      noExercises: 'Bitte erst Übungen hinzufügen!',
      durationMode: 'Dauer',
      setMode: 'Sätze',
      durationHelp: 'Dauer (min. 10s, max. 99m)',
      setHelp: 'Sätze x Wiederholungen',
      weightHelp: 'Gewicht in kg (1-999, leer = keins)',
      ok: 'Ok',
      cancel: 'Abbrechen',
      minutes: 'm',
      seconds: 's',
    };

  const [deleteExerciseKey, setDeleteExerciseKey] = useState(null);
  const [editExerciseKey, setEditExerciseKey] = useState(null);
  const [editMode, setEditMode] = useState('dur');
  const [editMin, setEditMin] = useState(0);
  const [editSec, setEditSec] = useState(0);
  const [editSets, setEditSets] = useState(3);
  const [editReps, setEditReps] = useState(10);
  const [editWeightExerciseKey, setEditWeightExerciseKey] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [isReorderSettling, setIsReorderSettling] = useState(false);

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workout', id],
    queryFn: async () => {
      return getWorkoutById(id);
    },
  });

  useEffect(() => {
    if (workout?.id?.startsWith('local_')) {
      localWorkouts.upsert(workout);
    }
  }, [workout]);

  const updateMutation = useMutation({
    mutationFn: async (data) => updateWorkout(id, data),
    onMutate: (data) => {
      void queryClient.cancelQueries({ queryKey: ['workout', id] });
      const currentWorkout = queryClient.getQueryData(['workout', id]);
      if (currentWorkout?.id?.startsWith('local_')) {
        localWorkouts.upsert({ ...currentWorkout, ...data, id });
      }
      queryClient.setQueryData(['workout', id], (current) => (current ? { ...current, ...data } : current));
      return { previousWorkout: currentWorkout };
    },
    onError: (_error, _data, context) => {
      if (context?.previousWorkout) {
        queryClient.setQueryData(['workout', id], context.previousWorkout);
      }
    },
    onSuccess: (updatedWorkout) => {
      if (updatedWorkout) {
        queryClient.setQueryData(['workout', id], (current) => {
          if (!current) return updatedWorkout;
          if (areExercisesEquivalent(current.exercises || [], updatedWorkout.exercises || [])) {
            return {
              ...updatedWorkout,
              exercises: current.exercises,
            };
          }
          return updatedWorkout;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const exercises = workout?.exercises || [];
  const getExerciseIndexByKey = (exerciseKey) => exercises.findIndex((exercise, index) => getExerciseKey(exercise, index) === exerciseKey);
  const breakDuration = getBreakDuration();
  const { totalSecs, totalSets } = computeTotals(exercises, breakDuration);

  const handleDragEnd = (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    setIsReorderSettling(true);
    const items = Array.from(exercises);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    updateMutation.mutate({ exercises: items });
  };

  useEffect(() => {
    if (!isReorderSettling) return undefined;
    const timeoutId = window.setTimeout(() => {
      setIsReorderSettling(false);
    }, 80);
    return () => window.clearTimeout(timeoutId);
  }, [isReorderSettling]);

  const handleDeleteExercise = () => {
    if (!deleteExerciseKey) return;
    const deleteIndex = getExerciseIndexByKey(deleteExerciseKey);
    if (deleteIndex === -1) return;
    updateMutation.mutate({ exercises: reindexWorkoutExercises(exercises.filter((_, index) => index !== deleteIndex)) });
    setDeleteExerciseKey(null);
  };

  const openExerciseEdit = (exerciseKey, exercise, event) => {
    event.stopPropagation();
    if (exercise.use_sets) {
      setEditMode('sets');
      setEditSets(exercise.sets || 3);
      setEditReps(exercise.reps || 10);
    } else {
      const duration = exercise.duration || 90;
      setEditMode('dur');
      setEditMin(Math.floor(duration / 60));
      setEditSec(duration % 60);
    }
    setEditExerciseKey(exerciseKey);
  };

  const handleExerciseSave = (exerciseKey) => {
    const index = getExerciseIndexByKey(exerciseKey);
    if (index === -1) return;
    const updated = [...exercises];
    if (editMode === 'dur') {
      const total = (parseInt(editMin, 10) || 0) * 60 + (parseInt(editSec, 10) || 0);
      if (total < 10) return;
      updated[index] = { ...updated[index], use_sets: false, duration: total };
    } else {
      updated[index] = {
        ...updated[index],
        use_sets: true,
        sets: Math.max(1, parseInt(editSets, 10) || 1),
        reps: Math.max(1, parseInt(editReps, 10) || 1),
      };
    }
    updateMutation.mutate({ exercises: reindexWorkoutExercises(updated) });
    setEditExerciseKey(null);
  };

  const openWeightEdit = (exerciseKey, exercise, event) => {
    event.stopPropagation();
    setEditWeight(exercise.weight_kg != null ? String(exercise.weight_kg) : '');
    setEditWeightExerciseKey(exerciseKey);
  };

  const handleWeightSave = (exerciseKey) => {
    const index = getExerciseIndexByKey(exerciseKey);
    if (index === -1) return;
    const updated = [...exercises];
    const value = parseFloat(editWeight);
    updated[index] = { ...updated[index], weight_kg: !editWeight || Number.isNaN(value) ? null : Math.min(999, Math.max(1, value)) };
    updateMutation.mutate({ exercises: reindexWorkoutExercises(updated) });
    setEditWeightExerciseKey(null);
  };

  const handleExerciseNavigate = (exercise) => {
    navigate(`/exercise/${exercise.exercise_index || exercise.exercise_id}`);
  };

  const handleStartWorkout = () => {
    if (exercises.length === 0) {
      toast(copy.noExercises);
      return;
    }
    navigate(`/training/${id}?autostart=1`);
  };

  const startNameEdit = () => {
    setNameValue(workout.name);
    setEditingName(true);
  };

  const saveNameEdit = () => {
    if (nameValue.trim()) updateMutation.mutate({ name: nameValue.trim() });
    setEditingName(false);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!workout) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 px-4 text-center">
        <p className="text-muted-foreground font-body">{copy.notFound}</p>
        <Button onClick={() => navigate('/')} variant="outline">{copy.backToPlan}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors py-2 pr-3 -ml-1 rounded-lg active:bg-muted/40">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base font-body font-medium">{copy.back}</span>
        </Link>

        {editingName ? (
          <div className="flex items-center gap-2 mb-4">
            <Input autoFocus value={nameValue} onChange={(e) => setNameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveNameEdit(); if (e.key === 'Escape') setEditingName(false); }} className="font-display text-2xl h-12" />
            <button onClick={saveNameEdit} className="text-accent hover:text-accent/80 p-1"><Check className="w-5 h-5" /></button>
            <button onClick={() => setEditingName(false)} className="text-muted-foreground/50 hover:text-muted-foreground p-1"><X className="w-5 h-5" /></button>
          </div>
        ) : (
          <div className="mb-4">
            <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground cursor-pointer hover:text-primary transition-colors" onClick={!workout.is_template ? startNameEdit : undefined} title={!workout.is_template ? copy.renameHint : undefined}>
              {workout.name}
            </h1>
          </div>
        )}

        {exercises.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap mb-4 font-body">
            <span className="text-base font-semibold text-foreground">{exercises.length} {copy.exercises}</span>
            {totalSecs > 0 ? <><span className="text-muted-foreground font-bold">·</span><span className="text-accent text-lg font-semibold tabular-nums"><DurDisplay seconds={totalSecs} /></span></> : null}
            {totalSets > 0 ? <><span className="text-muted-foreground font-bold">·</span><span className="text-yellow-700 text-lg font-semibold tabular-nums">{totalSets} {copy.sets}</span></> : null}
          </div>
        ) : null}

        <Button onClick={handleStartWorkout} className="w-full h-14 text-lg font-body font-semibold gap-3 mb-8 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20">
          <Play className="w-6 h-6" fill="currentColor" />
          {copy.start}
        </Button>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="exercises">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {exercises.map((exercise, index) => (
                    <Draggable key={getExerciseKey(exercise, index)} draggableId={getExerciseKey(exercise, index)} index={index}>
                      {(dragProvided, snapshot) => {
                        const disableOuterTransition = isReorderSettling && !snapshot.isDragging && !snapshot.isDropAnimating;
                        return (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          style={patchSecondaryItemStyle(getDraggableItemStyle(dragProvided.draggableProps.style, snapshot.isDropAnimating), disableOuterTransition)}
                        >
                          <WorkoutExerciseRow
                            exercise={exercise}
                            exerciseKey={getExerciseKey(exercise, index)}
                            dragHandleProps={dragProvided.dragHandleProps}
                            snapshot={snapshot}
                            copy={copy}
                            disableTransition={isReorderSettling && !snapshot.isDragging}
                            isEditOpen={editExerciseKey === getExerciseKey(exercise, index)}
                            isWeightOpen={editWeightExerciseKey === getExerciseKey(exercise, index)}
                            editMode={editMode}
                            editMin={editMin}
                            editSec={editSec}
                            editSets={editSets}
                            editReps={editReps}
                            editWeight={editWeight}
                            onNavigate={handleExerciseNavigate}
                            onOpenExerciseEdit={openExerciseEdit}
                            onCloseExerciseEdit={() => setEditExerciseKey(null)}
                            onSetEditMode={setEditMode}
                            onSetEditMin={setEditMin}
                            onSetEditSec={setEditSec}
                            onSetEditSets={setEditSets}
                            onSetEditReps={setEditReps}
                            onSaveExercise={handleExerciseSave}
                            onOpenWeightEdit={openWeightEdit}
                            onCloseWeightEdit={() => setEditWeightExerciseKey(null)}
                            onSetEditWeight={setEditWeight}
                            onSaveWeight={handleWeightSave}
                            onDelete={setDeleteExerciseKey}
                          />
                        </div>
                        );
                      }}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="px-3 py-3">
            <Button onClick={() => navigate(`/select-exercise/${id}`)} variant="ghost" className="w-full justify-start text-primary/70 hover:text-primary hover:bg-primary/5 font-body text-sm gap-2">
              <span className="text-lg leading-none">+</span>
              {copy.addExercise}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog open={deleteExerciseKey !== null} onConfirm={handleDeleteExercise} onCancel={() => setDeleteExerciseKey(null)} />
    </div>
  );
}

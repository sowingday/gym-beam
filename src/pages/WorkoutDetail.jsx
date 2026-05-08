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

function computeTotals(exercises, breakDuration) {
  const durationExercises = exercises.filter((exercise) => !exercise.use_sets);
  const totalSecs = durationExercises.reduce((sum, exercise) => sum + (exercise.duration || 90), 0) + Math.max(0, exercises.length - 1) * breakDuration;
  const totalSets = exercises.reduce((sum, exercise) => (exercise.use_sets ? sum + (exercise.sets || 3) : sum), 0);
  return { totalSecs, totalSets, allSets: durationExercises.length === 0 && exercises.length > 0 };
}

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
      minutes: 'm',
      seconds: 's',
    };

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [editMode, setEditMode] = useState('dur');
  const [editMin, setEditMin] = useState(0);
  const [editSec, setEditSec] = useState(0);
  const [editSets, setEditSets] = useState(3);
  const [editReps, setEditReps] = useState(10);
  const [editWeightIdx, setEditWeightIdx] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

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
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['workout', id] });
      if (workout?.id?.startsWith('local_')) {
        localWorkouts.upsert({ ...workout, ...data, id });
      }
      queryClient.setQueryData(['workout', id], (current) => (current ? { ...current, ...data } : current));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout', id] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });

  const exercises = workout?.exercises || [];
  const breakDuration = getBreakDuration();
  const { totalSecs, totalSets } = computeTotals(exercises, breakDuration);

  const handleDragEnd = (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const items = Array.from(exercises);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    queryClient.setQueryData(['workout', id], { ...workout, exercises: items });
    updateMutation.mutate({ exercises: items });
  };

  const handleDeleteExercise = () => {
    if (deleteIndex === null) return;
    updateMutation.mutate({ exercises: exercises.filter((_, index) => index !== deleteIndex) });
    setDeleteIndex(null);
  };

  const openExerciseEdit = (index, exercise, event) => {
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
    setEditIndex(index);
  };

  const handleExerciseSave = (index) => {
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
    updateMutation.mutate({ exercises: updated });
    setEditIndex(null);
  };

  const openWeightEdit = (index, exercise, event) => {
    event.stopPropagation();
    setEditWeight(exercise.weight_kg != null ? String(exercise.weight_kg) : '');
    setEditWeightIdx(index);
  };

  const handleWeightSave = (index) => {
    const updated = [...exercises];
    const value = parseFloat(editWeight);
    updated[index] = { ...updated[index], weight_kg: !editWeight || Number.isNaN(value) ? null : Math.min(999, Math.max(1, value)) };
    updateMutation.mutate({ exercises: updated });
    setEditWeightIdx(null);
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
                    <Draggable key={`${exercise.exercise_id}-${index}`} draggableId={`ex-${index}`} index={index}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`flex items-center gap-2 px-3 py-2 border-b border-border/50 transition-colors ${snapshot.isDragging ? 'bg-primary/5 shadow-lg' : 'hover:bg-muted/30'}`}
                          onClick={() => navigate(`/exercise/${exercise.exercise_index || exercise.exercise_id}`)}
                        >
                          <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground shrink-0" onClick={(e) => e.stopPropagation()}>
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="shrink-0 w-24 h-24 flex items-center justify-center overflow-hidden rounded-lg">
                            <StickFigureAnimation animationType={exercise.animation_type} exerciseIndex={exercise.exercise_index} size={96} color="hsl(230, 70%, 50%)" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-foreground truncate hover:text-primary transition-colors">{exercise.name}</div>
                            <div className="flex items-center mt-0.5" onClick={(e) => e.stopPropagation()}>
                              <Popover open={editIndex === index} onOpenChange={(open) => { if (!open) setEditIndex(null); }}>
                                <PopoverTrigger asChild>
                                  <button className="flex items-center gap-1 text-primary/70 hover:text-primary min-w-[72px]" onClick={(e) => openExerciseEdit(index, exercise, e)}>
                                    {exercise.use_sets
                                      ? <><ListOrdered className="w-3 h-3 shrink-0" /><span className="text-yellow-700 text-xs font-semibold">{exercise.sets || 3}x{exercise.reps || 10}</span></>
                                      : <><Clock className="w-3 h-3 shrink-0" /><span className="text-xs font-semibold text-accent tabular-nums">{Math.floor((exercise.duration || 90) / 60) > 0 ? `${Math.floor((exercise.duration || 90) / 60)}m ` : ''}{String((exercise.duration || 90) % 60).padStart(2, '0')}s</span></>}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex rounded-lg overflow-hidden border border-border mb-3">
                                    <button className={`flex-1 py-1.5 text-xs font-body flex items-center justify-center gap-1 transition-colors ${editMode === 'dur' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`} onClick={() => setEditMode('dur')}>
                                      <Clock className="w-3 h-3" /> {copy.durationMode}
                                    </button>
                                    <button className={`flex-1 py-1.5 text-xs font-body flex items-center justify-center gap-1 transition-colors ${editMode === 'sets' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'}`} onClick={() => setEditMode('sets')}>
                                      <ListOrdered className="w-3 h-3" /> {copy.setMode}
                                    </button>
                                  </div>

                                  {editMode === 'dur' ? (
                                    <>
                                      <p className="text-xs text-muted-foreground mb-2">{copy.durationHelp}</p>
                                      <div className="flex items-center gap-1.5 mb-3">
                                        <Input type="number" min={0} max={99} value={editMin} onChange={(e) => setEditMin(e.target.value)} className="h-8 text-sm w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') handleExerciseSave(index); }} />
                                        <span className="text-sm text-muted-foreground">{copy.minutes}</span>
                                        <Input type="number" min={0} max={59} value={editSec} onChange={(e) => setEditSec(e.target.value)} className="h-8 text-sm w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') handleExerciseSave(index); }} />
                                        <span className="text-sm text-muted-foreground">{copy.seconds}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-xs text-muted-foreground mb-2">{copy.setHelp}</p>
                                      <div className="flex items-center gap-1.5 mb-3">
                                        <Input type="number" min={1} max={99} value={editSets} onChange={(e) => setEditSets(e.target.value)} className="h-8 text-sm w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') handleExerciseSave(index); }} />
                                        <span className="text-sm text-muted-foreground">x</span>
                                        <Input type="number" min={1} max={999} value={editReps} onChange={(e) => setEditReps(e.target.value)} className="h-8 text-sm w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') handleExerciseSave(index); }} />
                                      </div>
                                    </>
                                  )}
                                  <Button size="sm" className="w-full h-8" onClick={() => handleExerciseSave(index)}>{copy.ok}</Button>
                                </PopoverContent>
                              </Popover>

                              <Popover open={editWeightIdx === index} onOpenChange={(open) => { if (!open) setEditWeightIdx(null); }}>
                                <PopoverTrigger asChild>
                                  <button className="flex items-center gap-1 text-muted-foreground hover:text-primary ml-3" onClick={(e) => openWeightEdit(index, exercise, e)}>
                                    <Dumbbell className="w-3 h-3 shrink-0" />
                                    {exercise.weight_kg != null ? <span className="text-yellow-700 text-xs font-semibold">{exercise.weight_kg} kg</span> : <span className="text-[10px] text-muted-foreground/50">-</span>}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-3" onClick={(e) => e.stopPropagation()}>
                                  <p className="text-xs text-muted-foreground mb-2">{copy.weightHelp}</p>
                                  <Input type="number" min={1} max={999} value={editWeight} placeholder="kg" onChange={(e) => setEditWeight(e.target.value)} className="h-8 text-sm mb-2 text-center" onKeyDown={(e) => { if (e.key === 'Enter') handleWeightSave(index); }} autoFocus />
                                  <Button size="sm" className="w-full h-8" onClick={() => handleWeightSave(index)}>{copy.ok}</Button>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 hidden sm:inline">{exercise.category}</span>

                          <button onClick={(e) => { e.stopPropagation(); setDeleteIndex(index); }} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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

      <ConfirmDialog open={deleteIndex !== null} onConfirm={handleDeleteExercise} onCancel={() => setDeleteIndex(null)} />
    </div>
  );
}

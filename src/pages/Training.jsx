import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, X, SkipForward, RotateCcw, Volume2, VolumeX, CheckCircle2, Clock, Dumbbell, ListOrdered, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StickFigureAnimation from '../components/StickFigureAnimation';
import DurDisplay from '../components/DurDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getBreakDuration, getMusicStyle, getMusicMode,
  getTotalDir, getExerciseDir,
  getShowTotalDur, getShowExerciseDur, getBreakBeep, getCountdownStart, getCountdownBeforeEnd,
} from '../lib/settings';
import { startMusic, stopMusic, setMuted as setMusicMuted, prepareMusic } from '../lib/musicPlayer';
import { localWorkouts } from '../lib/localWorkouts';
import { saveWorkoutSession } from '../lib/workoutHistory';
import { useI18n } from '../lib/i18n';
import { getWorkoutById, recordCompletedWorkout, updateWorkout } from '../lib/workoutDataService';

function playBeep(freq = 440, dur = 0.12, vol = 0.25) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    osc.onended = () => ctx.close();
  } catch (_) {}
}

function mmss(secs) {
  const s = Math.max(0, secs);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function Training() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useI18n();
  const copy = language === 'en'
    ? {
      totalSets: 'total sets',
      break: 'Break',
      skipBreak: 'Skip break',
      exercise: 'Exercise',
      weight: 'Weight',
      reps: 'Reps',
      save: 'Save',
      cancel: 'Cancel',
      finish: 'Geschafft!',
      wellDone: 'Sehr gut!',
      completed: 'completed successfully!',
      pause: 'Pause',
      resume: 'Resume',
      start: 'Start',
      next: 'Next',
      setWord: 'sets',
    }
    : {
      totalSets: 'Sätze gesamt',
      break: 'Pause',
      skipBreak: 'Pause überspringen',
      exercise: 'Übung',
      weight: 'Gewicht',
      reps: 'Wdh.',
      save: 'Speichern',
      cancel: 'Abbrechen',
      finish: 'FINISH!',
      wellDone: 'WELL DONE!',
      completed: 'erfolgreich abgeschlossen!',
      pause: 'Pause',
      resume: 'Weiter',
      start: 'Start',
      next: 'Weiter',
      setWord: 'Sätze',
    };

  const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';

  const BREAK_DURATION = useRef(getBreakDuration()).current;
  const MUSIC_STYLE = useRef(getMusicStyle()).current;
  const MUSIC_MODE = useRef(getMusicMode()).current;
  const TOTAL_DIR = useRef(getTotalDir()).current;
  const EXERCISE_DIR = useRef(getExerciseDir()).current;
  const SHOW_TOTAL_DUR = useRef(getShowTotalDur()).current;
  const SHOW_EX_DUR = useRef(getShowExerciseDur()).current;
  const BREAK_BEEP = useRef(getBreakBeep()).current;
  const COUNTDOWN_START = useRef(Number(getCountdownStart())).current;
  const COUNTDOWN_BEFORE_END = useRef(Number(getCountdownBeforeEnd())).current;

  const { data: workout } = useQuery({
    queryKey: ['workout', id],
    queryFn: async () => getWorkoutById(id),
  });

  const exercisesRef = useRef([]);
  const [exercisesState, setExercisesState] = useState([]);

  useEffect(() => {
    if (workout?.exercises) {
      exercisesRef.current = workout.exercises;
      setExercisesState(workout.exercises);
    }
  }, [workout]);

  const exercises = exercisesState;
  const totalDuration = exercises.reduce((sum, exercise) => (exercise.use_sets ? sum : sum + (exercise.duration || 90)), 0)
    + Math.max(0, exercises.length - 1) * BREAK_DURATION;
  const totalSetsAll = exercises.reduce((sum, exercise) => (exercise.use_sets ? sum + (exercise.sets || 3) : sum), 0);
  const allSetsMode = exercises.length > 0 && exercises.every((exercise) => exercise.use_sets);

  const [countdown, setCountdown] = useState(autostart && COUNTDOWN_START > 0 ? COUNTDOWN_START : null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exerciseTimer, setExerciseTimer] = useState(0);
  const [breakTimer, setBreakTimer] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [editIdx, setEditIdx] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  const completedCountRef = useRef(0);
  const completedDurationRef = useRef(0);
  const completedExercisesRef = useRef([]);
  const skippedRef = useRef(new Set());
  const intervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    const acquire = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (_) {}
      }
    };
    acquire();
    return () => { if (wakeLockRef.current) wakeLockRef.current.release(); };
  }, []);

  const beginTraining = useCallback(() => {
    setHasStarted(true);
    setIsPlaying(true);
    setExerciseTimer(0);
    setCurrentSet(1);
    if (MUSIC_STYLE !== 'none') startMusic(MUSIC_STYLE, MUSIC_MODE === 'loop');
  }, [MUSIC_MODE, MUSIC_STYLE]);

  const runCountdown = useCallback((startVal) => {
    if (startVal <= 0) {
      beginTraining();
      return;
    }
    setCountdown(startVal);
    if (BREAK_BEEP) playBeep(440, 0.1);
    let remaining = startVal - 1;
    const interval = setInterval(() => {
      if (remaining > 0) {
        setCountdown(remaining);
        if (BREAK_BEEP) playBeep(440, 0.1);
        remaining -= 1;
      } else {
        clearInterval(interval);
        setCountdown('go');
        if (BREAK_BEEP) playBeep(880, 0.3);
        setTimeout(() => {
          setCountdown(null);
          beginTraining();
        }, 1000);
      }
    }, 1000);
  }, [BREAK_BEEP, beginTraining]);

  useEffect(() => {
    if (!autostart) return;
    runCountdown(COUNTDOWN_START);
  }, [COUNTDOWN_START, autostart, runCountdown]);

  const finishWorkout = useCallback(async () => {
    setIsFinished(true);
    setIsPlaying(false);
    stopMusic();
    const count = completedCountRef.current;
    const duration = TOTAL_DIR === 'up' ? elapsedTotal : completedDurationRef.current;

    const savedSession = saveWorkoutSession({
      workout_id: id,
      workout_name: workout?.name || '',
      workout_color: workout?.color || '#212121',
      duration_seconds: TOTAL_DIR === 'up' ? elapsedTotal : completedDurationRef.current,
      exercise_count: count,
      exercises: completedExercisesRef.current.map((exercise) => ({
        exercise_index: exercise.exercise_index ?? null,
        name: exercise.exercise_name,
        weight_kg: exercise.weight_kg ?? null,
        reps: exercise.reps ?? null,
        duration: exercise.duration ?? null,
      })),
    });

    if (count > 0 || duration > 0) {
      await recordCompletedWorkout({
        workoutId: id,
        workoutColor: workout?.color || '#212121',
        exerciseCount: count,
        duration,
        exercises: completedExercisesRef.current,
        sessionId: savedSession.id,
      });
    }
  }, [TOTAL_DIR, elapsedTotal, id, workout]);

  const advanceToNext = useCallback((idx) => {
    if (idx < exercisesRef.current.length - 1) {
      if (BREAK_DURATION > 0) {
        setIsBreak(true);
        setBreakTimer(BREAK_DURATION);
      } else {
        setCurrentIndex(idx + 1);
        setExerciseTimer(0);
        setCurrentSet(1);
      }
    } else {
      finishWorkout();
    }
  }, [BREAK_DURATION, finishWorkout]);

  const tick = useCallback(() => {
    setElapsedTotal((prev) => prev + 1);
    if (isBreak) {
      setBreakTimer((prev) => {
        const next = prev - 1;
        if (BREAK_BEEP && next > 0 && next <= 3) playBeep(660, 0.08, 0.2);
        if (next <= 0) {
          setIsBreak(false);
          setExerciseTimer(0);
          setCurrentSet(1);
          setCurrentIndex((value) => value + 1);
          return 0;
        }
        return next;
      });
    } else {
      const exercise = exercisesRef.current[currentIndex];
      if (exercise?.use_sets) return;
      setExerciseTimer((prev) => {
        const target = exercise?.duration || 90;
        const next = prev + 1;
        const remaining = target - next;
        const exerciseEndCountdown = Math.max(0, Math.min(COUNTDOWN_BEFORE_END, target - 5));
        if (exerciseEndCountdown > 0 && remaining > 0 && remaining <= exerciseEndCountdown) playBeep(660, 0.08, 0.2);
        if (next >= target) {
          if (!skippedRef.current.has(currentIndex)) {
            completedCountRef.current += 1;
            completedDurationRef.current += target;
            completedExercisesRef.current.push({
              exercise_name: exercise.name,
              duration: target,
              weight_kg: exercise.weight_kg ?? null,
              reps: exercise.reps ?? null,
            });
          }
          advanceToNext(currentIndex);
          return next;
        }
        return next;
      });
    }
  }, [BREAK_BEEP, advanceToNext, currentIndex, isBreak]);

  useEffect(() => {
    if (isPlaying && !isFinished) intervalRef.current = setInterval(tick, 1000);
    else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [isFinished, isPlaying, tick]);

  useEffect(() => { setCurrentSet(1); }, [currentIndex]);

  const startCountdown = async () => {
    if (MUSIC_STYLE !== 'none') await prepareMusic(MUSIC_STYLE, MUSIC_MODE === 'loop');
    runCountdown(COUNTDOWN_START);
  };

  const handlePlayPause = () => {
    if (!hasStarted && countdown === null) startCountdown();
    else if (hasStarted) setIsPlaying((prev) => !prev);
  };

  const handleSkip = () => {
    if (isBreak) {
      setIsBreak(false);
      setExerciseTimer(0);
      setCurrentSet(1);
      setCurrentIndex((value) => value + 1);
    } else {
      skippedRef.current.add(currentIndex);
      advanceToNext(currentIndex);
    }
  };

  const handleRepeat = () => {
    const exercise = exercises[currentIndex];
    if (exercise?.use_sets) setCurrentSet(1);
    else {
      const elapsed = exerciseTimer;
      setElapsedTotal((prev) => Math.max(0, prev - elapsed));
      setExerciseTimer(0);
    }
  };

  const handleSetCheck = () => {
    const exercise = exercisesRef.current[currentIndex];
    const totalSets = exercise?.sets || 3;
    if (currentSet >= totalSets) {
      if (!skippedRef.current.has(currentIndex)) {
        completedCountRef.current += 1;
        completedExercisesRef.current.push({
          exercise_name: exercise.name,
          duration: null,
          weight_kg: exercise.weight_kg ?? null,
          reps: exercise.reps ?? null,
        });
      }
      advanceToNext(currentIndex);
    } else {
      setCurrentSet((value) => value + 1);
    }
  };

  const handleAbort = () => {
    stopMusic();
    setIsPlaying(false);
    navigate('/');
  };

  const handleFinish = () => navigate('/');
  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    setMusicMuted(next);
  };

  const openEdit = (idx) => {
    const exercise = exercisesRef.current[idx];
    setEditWeight(exercise?.weight_kg != null ? String(exercise.weight_kg) : '');
    setEditReps(exercise?.use_sets && exercise?.reps != null ? String(exercise.reps) : '');
    setEditIdx(idx);
  };

  const saveEdit = async () => {
    const weightValue = parseFloat(editWeight);
    const repsValue = parseInt(editReps, 10);
    const newWeight = editWeight && !Number.isNaN(weightValue) ? Math.min(999, Math.max(1, weightValue)) : null;
    const newReps = editReps && !Number.isNaN(repsValue) ? Math.min(999, Math.max(1, repsValue)) : null;
    const updatedExercises = exercisesRef.current.map((exercise, index) => (
      index === editIdx ? { ...exercise, weight_kg: newWeight, reps: exercise.use_sets ? newReps : exercise.reps } : exercise
    ));

    exercisesRef.current = updatedExercises;
    setExercisesState([...updatedExercises]);

    try {
      await updateWorkout(id, { exercises: updatedExercises });
    } catch (_) {
      localWorkouts.update(id, { exercises: updatedExercises });
    }
    queryClient.setQueryData(['workout', id], (current) => (current ? { ...current, exercises: updatedExercises } : current));
    queryClient.invalidateQueries({ queryKey: ['workout', id] });
    setEditIdx(null);
  };

  const isPaused = hasStarted && !isPlaying && !isFinished;
  const currentExercise = exercises[currentIndex];
  const exDuration = currentExercise?.duration || 90;
  const isSetMode = !!currentExercise?.use_sets;
  const totalDisplayed = TOTAL_DIR === 'up' ? elapsedTotal : Math.max(0, totalDuration - elapsedTotal);
  const exerciseDisplayed = EXERCISE_DIR === 'down' ? Math.max(0, exDuration - exerciseTimer) : exerciseTimer;
  const completedTotal = exercises.length;
  const completedCount = completedCountRef.current;

  if (!workout) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {isPaused ? <div className="fixed inset-0 bg-black/40 z-20 pointer-events-none" /> : null}

      <AnimatePresence>
        {isPaused ? (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-auto">
            <Button onClick={handleAbort} variant="destructive" size="icon" className="shadow-lg"><X className="w-4 h-4" /></Button>
            <Button onClick={handleMuteToggle} variant="secondary" size="icon" className="shadow-lg">{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="shrink-0 px-4 pt-6 pb-2 max-w-2xl mx-auto w-full text-center">
        <h1 className="font-display text-3xl md:text-4xl tracking-wide text-foreground mb-3">{workout.name}</h1>
        <div className="flex flex-col items-center gap-0.5">
          {SHOW_TOTAL_DUR && !allSetsMode ? (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="w-3.5 h-3.5" />
              <DurDisplay seconds={totalDuration} className="text-xs" />
            </div>
          ) : null}
          {SHOW_TOTAL_DUR && allSetsMode ? (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <ListOrdered className="w-3.5 h-3.5" />
              <span>{totalSetsAll} {copy.totalSets}</span>
            </div>
          ) : null}
          {hasStarted ? <span className="font-display text-2xl text-primary">{mmss(totalDisplayed)}</span> : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 max-w-2xl mx-auto w-full">
        {countdown !== null ? (
          <div className="flex flex-col items-center justify-center h-64">
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`font-display tracking-wider ${countdown === 'go' ? 'text-6xl text-accent' : 'text-[120px] text-primary leading-none'}`}
              >
                {countdown === 'go' ? 'GO!' : countdown}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}

        {hasStarted && !isFinished && countdown === null ? (
          <div className="flex flex-col items-center justify-center py-4">
            <AnimatePresence mode="wait">
              {isBreak ? (
                <motion.div key="break" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center">
                  <p className="text-muted-foreground font-body text-lg mb-4">{copy.break}</p>
                  <span className="font-display text-[120px] md:text-[160px] leading-none text-primary">{breakTimer}</span>
                  <div className="mt-4">
                    <Button variant="secondary" size="lg" onClick={handleSkip} className="h-14 px-6 gap-3 text-base rounded-2xl shadow-md"><SkipForward className="w-5 h-5" />{copy.skipBreak}</Button>
                  </div>
                </motion.div>
              ) : currentExercise ? (
                <motion.div key={`ex-${currentIndex}`} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="text-center w-full">
                  <p className="text-xs text-muted-foreground font-body mb-1 uppercase tracking-wider">{copy.exercise} {currentIndex + 1} / {exercises.length}</p>
                  <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">{currentExercise.name}</h2>
                  <div className="flex flex-col items-center mb-4 w-full">
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden w-full flex items-center justify-center" style={{ padding: '4px' }}>
                      <StickFigureAnimation animationType={currentExercise.animation_type} exerciseIndex={currentExercise.exercise_index} size={320} color="hsl(230, 70%, 50%)" />
                    </div>

                    {(currentExercise.weight_kg != null || (currentExercise.use_sets && currentExercise.reps != null)) ? (
                      editIdx === currentIndex ? (
                        <div className="mt-3 flex flex-col items-center gap-2">
                          {currentExercise.weight_kg != null ? (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-muted-foreground font-body w-12 text-right">{copy.weight}</label>
                              <input type="number" min={1} max={999} value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="w-20 h-8 text-center text-sm rounded-md border border-input bg-background font-body focus:outline-none focus:ring-1 focus:ring-ring" />
                              <span className="text-sm text-muted-foreground">kg</span>
                            </div>
                          ) : null}
                          {currentExercise.use_sets && currentExercise.reps != null ? (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-muted-foreground font-body w-12 text-right">{copy.reps}</label>
                              <input type="number" min={1} max={999} value={editReps} onChange={(e) => setEditReps(e.target.value)} className="w-20 h-8 text-center text-sm rounded-md border border-input bg-background font-body focus:outline-none focus:ring-1 focus:ring-ring" />
                              <span className="text-sm text-muted-foreground">x</span>
                            </div>
                          ) : null}
                          <div className="flex gap-2 mt-1">
                            <button onClick={saveEdit} className="text-accent hover:text-accent/80 text-xs font-semibold font-body px-3 py-1.5 rounded bg-accent/10">{copy.save}</button>
                            <button onClick={() => setEditIdx(null)} className="text-muted-foreground text-xs font-body px-3 py-1.5 rounded hover:bg-muted/40">{copy.cancel}</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => openEdit(currentIndex)} className="flex items-center gap-2 mt-3 text-sm text-muted-foreground font-body hover:text-primary transition-colors">
                          {currentExercise.weight_kg != null ? <span className="flex items-center gap-1"><Dumbbell className="w-4 h-4" /><span>{currentExercise.weight_kg} kg</span></span> : null}
                          {currentExercise.use_sets && currentExercise.reps != null ? <span className="flex items-center gap-1"><ListOrdered className="w-4 h-4" /><span>{currentExercise.reps} x</span></span> : null}
                        </button>
                      )
                    ) : null}
                  </div>

                  {SHOW_EX_DUR && !isSetMode ? (
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <DurDisplay seconds={exDuration} className="text-xs" />
                    </div>
                  ) : null}

                  <div className="flex items-center justify-center gap-3 sm:gap-4">
                    <Button variant="secondary" size="icon" onClick={handleRepeat} className="w-14 h-14 rounded-2xl shadow-md text-muted-foreground hover:text-primary"><RotateCcw className="w-6 h-6" /></Button>
                    {isSetMode ? (
                      <>
                        <span className="font-display text-5xl text-accent">{currentSet}/{currentExercise.sets || 3}</span>
                        <Button variant="default" size="icon" onClick={handleSetCheck} className="w-16 h-16 rounded-2xl shadow-lg bg-green-500 hover:bg-green-600 text-white"><Check className="w-8 h-8" /></Button>
                      </>
                    ) : (
                      <span className="font-display text-5xl text-accent">{mmss(exerciseDisplayed)}</span>
                    )}
                    <Button variant="secondary" size="icon" onClick={handleSkip} className="w-14 h-14 rounded-2xl shadow-md text-muted-foreground hover:text-primary"><SkipForward className="w-6 h-6" /></Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {isFinished ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.6 }} className="font-display text-6xl md:text-8xl text-accent tracking-wider mb-4">{copy.finish}</motion.div>
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 0.6, delay: 0.7 }} className="font-display text-4xl md:text-5xl text-primary tracking-wider mb-6">{copy.wellDone}</motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="text-base font-body text-muted-foreground mb-8">
              {completedCount} / {completedTotal} {language === 'en' ? copy.completed : `Übungen ${copy.completed}`}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
              <Button onClick={handleFinish} size="lg" className="gap-3 h-18 min-h-[4.5rem] px-10 text-xl font-display tracking-wider rounded-2xl shadow-xl bg-green-500 hover:bg-green-600 text-white shadow-green-500/30"><CheckCircle2 className="w-10 h-10" />OK</Button>
            </motion.div>
          </div>
        ) : null}
      </div>

      {!isFinished && countdown === null ? (
        <div className="shrink-0 px-4 pb-6 pt-4 max-w-2xl mx-auto w-full relative z-30">
          <Button onClick={handlePlayPause} className="w-full h-16 text-lg font-body font-semibold gap-3 rounded-2xl shadow-lg" variant={isPlaying ? 'secondary' : 'default'}>
            {isPlaying
              ? <><Pause className="w-6 h-6" fill="currentColor" />{copy.pause}</>
              : <><Play className="w-6 h-6" fill="currentColor" />{hasStarted ? copy.resume : copy.start}</>}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

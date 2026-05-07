import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, PersonStanding, Clock, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
import CategorySelect from '../components/CategorySelect';
import BottomNav from '../components/BottomNav';
import { useQuery } from '@tanstack/react-query';
import DurDisplay from '../components/DurDisplay';
import ShareAchievementsDialog from '../components/ShareAchievementsDialog';
import { startOfWeek, startOfMonth, startOfYear, parseISO, isEqual, isAfter, format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useI18n } from '../lib/i18n';
import { getCurrentAuthUser } from '../lib/authClient';
import { listAchievements, listBodyWeights, listExerciseLogs } from '../lib/workoutDataService';

function computeStats(achievements) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);
  const init = () => ({ exercises: 0, duration: 0 });
  const result = { week: init(), month: init(), year: init(), total: init() };

  achievements.forEach((achievement) => {
    const date = parseISO(achievement.date);
    const count = achievement.exercise_count || 0;
    const duration = achievement.training_duration || 0;
    result.total.exercises += count;
    result.total.duration += duration;
    if (isAfter(date, yearStart) || isEqual(date, yearStart)) {
      result.year.exercises += count;
      result.year.duration += duration;
    }
    if (isAfter(date, monthStart) || isEqual(date, monthStart)) {
      result.month.exercises += count;
      result.month.duration += duration;
    }
    if (isAfter(date, weekStart) || isEqual(date, weekStart)) {
      result.week.exercises += count;
      result.week.duration += duration;
    }
  });

  return result;
}

export default function Achievements() {
  const navigate = useNavigate();
  const { language } = useI18n();
  const shareBaseUrl = window.location.origin;
  const labels = language === 'en'
    ? {
      title: 'Your achievements',
      week: 'This week',
      month: 'This month',
      year: 'This year',
      total: 'All time',
      share: 'Share achievements',
      choosePeriod: 'Choose period',
      bodyWeight: 'Body weight',
      exerciseProgress: 'Exercise progress',
      selectExercise: '-- Select exercise --',
      noExerciseData: 'No data for this exercise yet.',
      weightKg: 'Weight (kg)',
      durationMin: 'Duration (min)',
    }
    : {
      title: 'Deine Erfolge',
      week: 'Diese Woche',
      month: 'Diesen Monat',
      year: 'Dieses Jahr',
      total: 'Insgesamt',
      share: 'Erfolge teilen',
    choosePeriod: 'Zeitraum wählen',
      bodyWeight: 'Koerpergewicht',
    exerciseProgress: 'Übungsfortschritt',
    selectExercise: '-- Übung auswählen --',
    noExerciseData: 'Noch keine Daten für diese Übung.',
      weightKg: 'Gewicht (kg)',
      durationMin: 'Dauer (min)',
    };

  const [me, setMe] = useState(null);
  const [bodyWeightOpen, setBodyWeightOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [shareStep, setShareStep] = useState(null);
  const [shareDialogPeriod, setShareDialogPeriod] = useState(null);

  useEffect(() => {
    getCurrentAuthUser().then(setMe).catch(() => {});
  }, []);

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: listAchievements,
  });

  const { data: bodyWeights = [] } = useQuery({
    queryKey: ['bodyweights'],
    queryFn: listBodyWeights,
  });

  const { data: exerciseLogs = [] } = useQuery({
    queryKey: ['exerciselogs'],
    queryFn: listExerciseLogs,
  });

  const stats = computeStats(achievements);
  const rows = [
    { label: labels.week, ...stats.week },
    { label: labels.month, ...stats.month },
    { label: labels.year, ...stats.year },
    { label: labels.total, ...stats.total },
  ];

  const buildShareText = (period) => {
    const name = me?.profile_name || me?.full_name || (language === 'en' ? 'I' : 'Ich');
    if (period?.startsWith('exercise_')) {
      const exerciseName = period.replace('exercise_', '');
      return language === 'en'
        ? `${name} is tracking progress for ${exerciseName}!\n${shareBaseUrl}`
        : `${name} trackt Fortschritt bei ${exerciseName}!\n${shareBaseUrl}`;
    }
    if (period === 'all') {
      const totalWorkouts = achievements.length;
      const totalMins = Math.round(achievements.reduce((sum, achievement) => sum + (achievement.training_duration || 0), 0) / 60);
      return language === 'en'
        ? `${name} has trained hard - ${totalWorkouts} workouts and ${totalMins} minutes total. What about you?\n${shareBaseUrl}`
        : `${name} hat hart trainiert - ${totalWorkouts} mal und ${totalMins} Minuten insgesamt. Was ist mit Dir?\n${shareBaseUrl}`;
    }

    let periodStats;
    let periodLabel;
    if (period === 'week') {
      periodStats = stats.week;
      periodLabel = labels.week.toLowerCase();
    } else if (period === 'month') {
      periodStats = stats.month;
      periodLabel = labels.month.toLowerCase();
    } else {
      periodStats = stats.year;
      periodLabel = labels.year.toLowerCase();
    }
    const mins = Math.round(periodStats.duration / 60);
    const periodStart = period === 'week' ? startOfWeek(new Date(), { weekStartsOn: 1 }) : period === 'month' ? startOfMonth(new Date()) : startOfYear(new Date());
    const periodAchievements = achievements.filter((achievement) => isAfter(parseISO(achievement.date), periodStart) || isEqual(parseISO(achievement.date), periodStart));
    return language === 'en'
      ? `${name} has trained hard - ${periodAchievements.length} times ${periodLabel} and ${mins} minutes. What about you?\n${shareBaseUrl}`
      : `${name} hat hart trainiert - ${periodAchievements.length} mal ${periodLabel} und ${mins} Minuten. Was ist mit Dir?\n${shareBaseUrl}`;
  };

  const bwChartData = bodyWeights.map((bodyWeight) => ({
    date: bodyWeight.date,
    label: format(parseISO(bodyWeight.date), 'dd.MM.'),
    weight: bodyWeight.weight_kg,
  }));

  const exerciseNames = [...new Set(exerciseLogs.map((log) => log.exercise_name))].sort();
  const selectedLogs = exerciseLogs.filter((log) => log.exercise_name === selectedExercise);
  const hasWeight = selectedLogs.some((log) => log.weight_kg != null);
  const hasDuration = selectedLogs.some((log) => log.duration != null);
  const exChartData = selectedLogs.map((log) => ({
    label: format(parseISO(log.date), 'dd.MM.'),
    weight: log.weight_kg ?? undefined,
    duration: log.duration != null ? Math.round((log.duration / 60) * 10) / 10 : undefined,
  }));

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-primary" />
            <h1 className="font-display text-4xl tracking-wide text-foreground drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]">{labels.title}</h1>
          </div>
          <div className="relative">
            <button onClick={() => setShareStep((value) => (value ? null : 'period'))} className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg p-2" title={labels.share}>
              <Share2 className="w-4 h-4" />
            </button>
            {shareStep ? (
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl w-52 overflow-hidden">
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-body">{labels.choosePeriod}</p>
                {[['week', labels.week], ['month', labels.month], ['year', labels.year], ['all', labels.total]].map(([key, label]) => (
                  <button key={key} onClick={() => { setShareDialogPeriod({ period: key, tab: 'extern' }); setShareStep(null); }} className="w-full text-left px-4 py-2 text-sm font-body hover:bg-muted/50 transition-colors">
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_8px_40px_0_rgba(0,0,0,0.18)] mb-6">
            {rows.map((row, index) => (
              <div key={index} className="bg-transparent pt-4 pr-6 pb-4 pl-5 flex items-center gap-4 border-b border-border/50">
                <span className="text-foreground px-2 font-body text-base font-medium text-left w-32 shrink-0">{row.label}</span>
                <span className="text-muted-foreground flex items-center gap-1.5 w-16 shrink-0"><PersonStanding className="w-4 h-4 shrink-0" /><span className="font-display text-2xl text-primary">{row.exercises}</span></span>
                <span className="flex flex-1 items-center justify-center gap-1.5 text-muted-foreground"><Clock className="w-4 h-4 shrink-0" /><DurDisplay seconds={row.duration} className="text-xl text-accent font-semibold" /></span>
              </div>
            ))}
          </div>
        )}

        {shareDialogPeriod ? <ShareAchievementsDialog period={shareDialogPeriod.period} initialTab={shareDialogPeriod.tab} buildShareText={buildShareText} onClose={() => setShareDialogPeriod(null)} /> : null}

        {bwChartData.length > 1 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_8px_40px_0_rgba(0,0,0,0.18)] mb-6">
            <button className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold font-body text-foreground" onClick={() => setBodyWeightOpen((open) => !open)}>
              <span>{labels.bodyWeight}</span>
              {bodyWeightOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {bodyWeightOpen ? (
              <div className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={bwChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'var(--font-body)' }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-body)' }} unit=" kg" />
                    <Tooltip formatter={(value) => `${value} kg`} />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </div>
        ) : null}

        {exerciseNames.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-visible shadow-[0_8px_40px_0_rgba(0,0,0,0.18)] mb-6">
            <div className="px-5 py-4 border-b border-border/50 overflow-visible">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold font-body text-foreground">{labels.exerciseProgress}</p>
                {selectedExercise ? (
                  <div className="relative">
                    <button onClick={() => setShareStep((value) => (value === 'exercise' ? null : 'exercise'))} className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors border border-border rounded-lg p-1.5" title={labels.share}>
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {shareStep === 'exercise' ? (
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl w-44 overflow-hidden">
                        <button onClick={() => { setShareDialogPeriod({ period: `exercise_${selectedExercise}`, tab: 'extern' }); setShareStep(null); }} className="w-full text-left px-4 py-2 text-sm font-body hover:bg-muted/50 transition-colors">
                          {labels.share}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <CategorySelect value={selectedExercise} onChange={setSelectedExercise} placeholder={labels.selectExercise} options={[{ value: '', label: labels.selectExercise }, ...exerciseNames.map((name) => ({ value: name, label: name }))]} />
            </div>
            {selectedExercise && exChartData.length > 0 ? (
              <div className="px-4 pb-4 pt-3">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={exChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'var(--font-body)' }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-body)' }} />
                    <Tooltip />
                    {hasWeight ? <Line type="monotone" dataKey="weight" name={labels.weightKg} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} /> : null}
                    {hasDuration ? <Line type="monotone" dataKey="duration" name={labels.durationMin} stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} /> : null}
                    {(hasWeight || hasDuration) ? <Legend /> : null}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
            {selectedExercise && exChartData.length === 0 ? <p className="text-sm text-muted-foreground font-body px-5 py-4">{labels.noExerciseData}</p> : null}
          </div>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}

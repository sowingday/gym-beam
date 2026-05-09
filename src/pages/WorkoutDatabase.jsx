import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PersonStanding } from 'lucide-react';
import { getBreakDuration } from '../lib/settings';
import BottomNav from '../components/BottomNav';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import CategorySelect from '../components/CategorySelect';
import { useI18n } from '../lib/i18n';
import { listWorkoutTemplates, listWorkouts } from '../lib/workoutDataService';

function getCategories(language) {
  return language === 'en'
    ? ['All workouts', 'Own workouts', 'Full body', 'Upper body', 'Lower body', 'Push', 'Pull', 'Core', 'Cardio', 'Stretching', 'Yoga', 'Warm-up', 'Cooldown', 'Focus']
    : ['Alle Workouts', 'Eigene Workouts', 'Ganzkörper', 'Oberkörper', 'Unterkörper', 'Push', 'Pull', 'Core', 'Cardio', 'Stretching', 'Yoga', 'Warm-up', 'Cooldown', 'Fokus'];
}

function getTemplateTotals(template, breakDuration) {
  const exercises = template.exercises || [];
  if (!exercises.length) return { secs: 0, sets: 0, allSets: false };
  const durationExercises = exercises.filter((exercise) => !exercise.use_sets);
  const secs = durationExercises.reduce((sum, exercise) => sum + (exercise.duration || 90), 0) + Math.max(0, exercises.length - 1) * breakDuration;
  const sets = exercises.reduce((sum, exercise) => (exercise.use_sets ? sum + (exercise.sets || 3) : sum), 0);
  return { secs, sets, allSets: durationExercises.length === 0 && exercises.length > 0 };
}

export default function WorkoutDatabase() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const breakDuration = getBreakDuration();
  const urlParams = new URLSearchParams(window.location.search);
  const addToDay = urlParams.get('addToDay');
  const categories = getCategories(language);
  const [category, setCategory] = useState(categories[0]);
  const [nameFilter, setNameFilter] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['workout-templates'],
    queryFn: listWorkoutTemplates,
  });

  const { data: ownWorkouts = [], isLoading: workoutsLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: listWorkouts,
  });
  const ownCategory = categories[1];
  const allCategory = categories[0];

  const filtered = useMemo(() => {
    const templateItems = templates
      .filter((template) => {
        if (!template || !template.name || !template.name.trim()) return false;
        if (category !== allCategory && category !== ownCategory && template.category !== category) return false;
        if (nameFilter.trim() && !template.name.toLowerCase().includes(nameFilter.trim().toLowerCase())) return false;
        if (keywordFilter.trim()) {
          const keyword = keywordFilter.trim().toLowerCase();
          const inTags = (template.tags || '').toLowerCase().includes(keyword);
          const inDesc = (template.description || '').toLowerCase().includes(keyword);
          if (!inTags && !inDesc) return false;
        }
        return true;
      })
      .map((template) => ({ ...template, _source: 'template' }));

    const ownItems = ownWorkouts
      .filter((workout) => workout.name && workout.name.trim())
      .filter((workout) => {
        const query = nameFilter.trim().toLowerCase();
        return !query || workout.name.toLowerCase().includes(query);
      })
      .map((workout) => ({ ...workout, _source: 'own', category: ownCategory }));

    if (category === ownCategory) {
      return ownItems;
    }

    if (category === allCategory) {
      return [...ownItems, ...templateItems];
    }

    return templateItems;
  }, [allCategory, category, keywordFilter, nameFilter, ownCategory, ownWorkouts, templates]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors py-2 pr-3 -ml-1 rounded-lg active:bg-muted/40">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-base font-body font-medium">{t('common.back')}</span>
        </button>

        <h1 className="font-display text-4xl md:text-5xl tracking-wide text-foreground mb-5 drop-shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
          {language === 'en' ? 'Workout database' : 'Workout Datenbank'}
        </h1>

        <div className="mb-3">
          <CategorySelect value={category} onChange={setCategory} options={categories.map((item) => ({ value: item, label: item }))} />
        </div>

        <Input placeholder={language === 'en' ? 'Workout name' : 'Workout Name'} value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="mb-2 font-body shadow-[0_2px_8px_0_rgba(0,0,0,0.12)]" />
        <Input placeholder={language === 'en' ? 'Keyword (tags, description)' : 'Stichwort (Tags, Beschreibung)'} value={keywordFilter} onChange={(e) => setKeywordFilter(e.target.value)} className="mb-5 font-body shadow-[0_2px_8px_0_rgba(0,0,0,0.12)]" />

        {templatesLoading || workoutsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground font-body mb-2">{language === 'en' ? 'No workouts available yet.' : 'Noch keine Workouts vorhanden.'}</p>
            {templates.length === 0 ? <p className="text-xs text-muted-foreground font-body">{language === 'en' ? 'Create your first workout in the workout plan.' : 'Erstelle dein erstes Workout im Trainingsplan.'}</p> : null}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_8px_40px_0_rgba(0,0,0,0.18)]">
            {filtered.map((template, index) => {
              const count = (template.exercises || []).length;
              const { secs, sets, allSets } = getTemplateTotals(template, breakDuration);
              const bgColor = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    if (template._source === 'own') navigate(`/workout/${template.id}`);
                    else navigate(`/workout-template/${template.id}${addToDay ? `?addToDay=${addToDay}` : ''}`);
                  }}
                  className={`px-4 py-1 text-left w-full flex items-center gap-3 hover:bg-primary/5 transition-colors border-b border-border/50 last:border-b-0 ${bgColor}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base text-foreground font-body truncate">{template.name}</div>
                    <div className="text-[hsl(var(--primary))] mt-0.5 font-body text-xs">{template.category}</div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground" style={{ minWidth: 60 }}>
                    <div className="flex items-center gap-1">
                      <PersonStanding className="w-3.5 h-3.5 shrink-0" />
                      <span className="tabular-nums">{count}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="flex items-center justify-center shrink-0" style={{ width: 14, height: 14 }}>
                        {allSets
                          ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                          : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                      </span>
                      <span className="tabular-nums">
                        {allSets ? <>{sets} S</> : <>{Math.floor(secs / 60)}m {String(secs % 60).padStart(2, '0')}s</>}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

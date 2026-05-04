import React, { useState, useMemo } from 'react';
import { Search, ArrowUp, ArrowDown, Languages, Star, CheckSquare, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MUSCLE_DATA } from '../lib/muscleData';
import CategorySelect from './CategorySelect';
import { getExerciseKey } from '../lib/normalize';
import { useI18n } from '../lib/i18n';

const FAVORITES_KEY = '__favorites__';

const getCategories = (exercise) => {
  if (Array.isArray(exercise.categories) && exercise.categories.length) return exercise.categories;
  if (typeof exercise.categories === 'string' && exercise.categories.trim()) return exercise.categories.split(',').map((value) => value.trim()).filter(Boolean);
  return exercise.category ? [exercise.category] : [];
};

const getMuscleNames = (exercise) => {
  if (Array.isArray(exercise.muscles)) return exercise.muscles.map(String).filter(Boolean);
  if (typeof exercise.muscles === 'string' && exercise.muscles.trim()) return exercise.muscles.split(',').map((value) => value.trim()).filter(Boolean);
  return [];
};

const getMuscleLatinNames = (exercise) => getMuscleNames(exercise).map((name) => MUSCLE_DATA[name]?.latin || name);

let savedState = { name: '', category: '', muscle: '', sortDir: 'asc', muscleLang: 'de' };

export default function ExerciseFilterTable({ exercises, onSelect, selectedId, onToggleFavorite, favoriteIds, multiMode, checkedIds, onToggleCheck }) {
  const { t } = useI18n();
  const [nameFilter, setNameFilter] = useState(savedState.name);
  const [categoryFilter, setCategoryFilter] = useState(savedState.category);
  const [muscleFilter, setMuscleFilter] = useState(savedState.muscle);
  const [sortDir, setSortDir] = useState(savedState.sortDir);
  const [muscleLang, setMuscleLang] = useState(savedState.muscleLang);

  const setName = (value) => {
    savedState.name = value;
    setNameFilter(value);
  };

  const setCategory = (value) => {
    savedState.category = value;
    setCategoryFilter(value);
  };

  const setMuscle = (value) => {
    savedState.muscle = value;
    setMuscleFilter(value);
  };

  const toggleSort = () => {
    setSortDir((prev) => {
      const next = prev === 'asc' ? 'desc' : 'asc';
      savedState.sortDir = next;
      return next;
    });
  };

  const toggleMuscleLanguage = () => {
    setMuscleLang((prev) => {
      const next = prev === 'de' ? 'latin' : 'de';
      savedState.muscleLang = next;
      return next;
    });
  };

  const allCategories = useMemo(() => {
    const categories = new Set();
    exercises.forEach((exercise) => getCategories(exercise).forEach((category) => categories.add(category)));
    return ['', FAVORITES_KEY, ...Array.from(categories).sort()];
  }, [exercises]);

  const filtered = useMemo(() => {
    let items = [...exercises];
    if (categoryFilter === FAVORITES_KEY) {
      items = items.filter((exercise) => {
        const key = getExerciseKey(exercise);
        return key !== null && favoriteIds?.has(key);
      });
    } else if (categoryFilter) {
      items = items.filter((exercise) => getCategories(exercise).includes(categoryFilter));
    }

    if (nameFilter) items = items.filter((exercise) => exercise.name.toLowerCase().includes(nameFilter.toLowerCase()));
    if (muscleFilter) {
      const query = muscleFilter.toLowerCase();
      items = items.filter((exercise) => {
        const german = getMuscleNames(exercise).join(', ').toLowerCase();
        const latin = getMuscleLatinNames(exercise).join(', ').toLowerCase();
        return german.includes(query) || latin.includes(query);
      });
    }

    items.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [categoryFilter, exercises, favoriteIds, muscleFilter, nameFilter, sortDir]);

  const categoryOptions = allCategories.map((category) => ({
    value: category,
    label: category === FAVORITES_KEY ? `* ${t('exercises.filters.favorites')}` : (category || t('exercises.filters.allCategories')),
  }));

  return (
    <div>
      <div className="lg:hidden space-y-2 mb-3">
        <CategorySelect value={categoryFilter} onChange={setCategory} options={categoryOptions} />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('exercises.filters.exercise')} value={nameFilter} onChange={(e) => setName(e.target.value)} className="pl-8 shadow-[0_2px_8px_0_rgba(0,0,0,0.12)]" />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('exercises.filters.muscle')} value={muscleFilter} onChange={(e) => setMuscle(e.target.value)} className="pl-8 shadow-[0_2px_8px_0_rgba(0,0,0,0.12)]" />
          </div>
          <Button variant="outline" size="icon" title={muscleLang === 'de' ? t('exercises.filters.latin') : t('exercises.filters.german')} onClick={toggleMuscleLanguage} className="shadow-[0_2px_8px_0_rgba(0,0,0,0.12)]">
            <Languages className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-primary text-primary-foreground shadow-[0_4px_12px_0_rgba(0,0,0,0.18)]">
              <th className="px-3 py-2 text-left">
                <div className="hidden lg:flex items-center gap-1">
                  <div className="relative flex-1 min-w-[80px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                    <Input placeholder={t('exercises.filters.name')} value={nameFilter} onChange={(e) => setName(e.target.value)} className="pl-7 h-8 text-xs text-white placeholder:text-white/50 bg-white/10 border-white/20 focus-visible:ring-white/40 shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-white hover:bg-white/20 shadow-[0_2px_6px_0_rgba(0,0,0,0.2)]" onClick={toggleSort}>
                    {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="flex lg:hidden items-center gap-1">
                  <span className="text-xs font-semibold text-white flex-1">{t('exercises.filters.name')}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-white hover:bg-white/20" onClick={toggleSort}>
                    {sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  </Button>
                </div>
              </th>
              <th className="px-3 py-2 text-left w-[26%]">
                <div className="hidden lg:block">
                  <CategorySelect value={categoryFilter} onChange={setCategory} options={categoryOptions} dark />
                </div>
                <span className="lg:hidden text-xs font-semibold text-white">{t('exercises.filters.category')}</span>
              </th>
              <th className="px-3 py-2 text-left w-[30%]">
                <div className="hidden lg:flex items-center gap-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                    <Input placeholder={t('exercises.filters.muscle')} value={muscleFilter} onChange={(e) => setMuscle(e.target.value)} className="pl-7 h-8 text-xs text-white placeholder:text-white/50 bg-white/10 border-white/20 focus-visible:ring-white/40 shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-white hover:bg-white/20 shadow-[0_2px_6px_0_rgba(0,0,0,0.2)]" title={muscleLang === 'de' ? t('exercises.filters.latin') : t('exercises.filters.german')} onClick={toggleMuscleLanguage}>
                    <Languages className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <span className="lg:hidden text-xs font-semibold text-white">{t('exercises.filters.muscles')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((exercise, index) => {
              const categories = getCategories(exercise);
              const muscles = muscleLang === 'de' ? getMuscleNames(exercise) : getMuscleLatinNames(exercise);
              const exerciseKey = getExerciseKey(exercise);
              const isChecked = exerciseKey !== null && checkedIds?.has(exerciseKey);
              const rowBackground = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
              const isFavorite = exerciseKey !== null && favoriteIds?.has(exerciseKey);

              return (
                <tr key={exerciseKey ?? index} onClick={() => onSelect(exercise)} className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-primary/5 ${rowBackground} ${isChecked ? 'bg-primary/10' : selectedId === exerciseKey ? 'bg-muted' : ''}`}>
                  <td className="px-2 py-2.5 text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                      {multiMode && onToggleCheck ? (
                        <button onClick={(e) => { e.stopPropagation(); onToggleCheck(exercise, e); }} className="shrink-0 p-0.5 rounded transition-colors hover:scale-110" title={t('exercises.filters.select')}>
                          {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground/40" />}
                        </button>
                      ) : null}
                      {onToggleFavorite ? (
                        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(exercise, e); }} className="shrink-0 p-0.5 rounded transition-colors hover:scale-110" title={t('exercises.favorite')}>
                          <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'}`} />
                        </button>
                      ) : null}
                      <span>{exercise.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground align-top">
                    {categories.map((category, categoryIndex) => <div key={categoryIndex}>{category}</div>)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground align-top">
                    {muscles.length > 0 ? muscles.map((muscle, muscleIndex) => <div key={muscleIndex}>{muscle}</div>) : <span className="opacity-30">-</span>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-sm">{t('exercises.filters.noneFound')}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

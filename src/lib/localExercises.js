/**
 * localExercises.js
 *
 * Provides the exercise list in a format compatible with the app exercise schema.
 * Used as an offline fallback when remote exercise data is not available.
 */

import { getPrimaryCategory } from './exerciseData';
import { normalizeExercises } from './normalize';
import { getAppLanguage } from './settings';

const EN_FIELD_MAP = {
  name: 'nameEn',
  categories: 'categoriesEn',
  muscles: 'musclesEn',
  shortDescription: 'shortDescriptionEn',
  notes: 'notesEn',
};

export function i18nGet(val, lang = 'de') {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val[lang] || val.de || Object.values(val)[0] || '';
  return String(val);
}

export function i18nArray(arr, lang = 'de') {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => i18nGet(item, lang)).filter(Boolean);
}

function toArrayValue(value, lang = 'de') {
  if (Array.isArray(value)) return value.map((item) => i18nGet(item, lang)).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  if (value && typeof value === 'object') {
    const localized = i18nGet(value, lang);
    return localized ? [localized] : [];
  }
  return [];
}

function getFieldValue(exercise, field, lang = 'de') {
  if (!exercise || typeof exercise !== 'object') return undefined;

  const localizedObject = exercise.i18n?.[field];
  if (localizedObject && typeof localizedObject === 'object') {
    const localized = localizedObject[lang] ?? localizedObject.de ?? localizedObject.en;
    if (localized !== undefined && localized !== null && localized !== '') return localized;
  }

  if (lang === 'en') {
    const englishField = EN_FIELD_MAP[field];
    if (englishField && exercise[englishField] !== undefined && exercise[englishField] !== null && exercise[englishField] !== '') {
      return exercise[englishField];
    }
  }

  return exercise[field];
}

function getLocalizedScalar(exercise, field, lang = 'de', fallbackExercise = null) {
  const primary = getFieldValue(exercise, field, lang);
  if (primary !== undefined && primary !== null && primary !== '') return i18nGet(primary, lang);

  const fallback = getFieldValue(fallbackExercise, field, lang);
  if (fallback !== undefined && fallback !== null && fallback !== '') return i18nGet(fallback, lang);

  return '';
}

function getLocalizedArray(exercise, field, lang = 'de', fallbackExercise = null) {
  const primary = toArrayValue(getFieldValue(exercise, field, lang), lang);
  if (primary.length > 0) return primary;

  const fallback = toArrayValue(getFieldValue(fallbackExercise, field, lang), lang);
  if (fallback.length > 0) return fallback;

  return [];
}

function getExerciseLookupKey(exercise) {
  if (!exercise || typeof exercise !== 'object') return null;
  if (exercise.exercise_index != null) return String(exercise.exercise_index);
  if (exercise.index != null) return String(exercise.index);
  if (exercise.id != null) return String(exercise.id);
  return null;
}

function getExerciseNameKey(exercise) {
  if (!exercise || typeof exercise !== 'object') return null;
  const name = typeof exercise.name === 'string' ? exercise.name.trim().toLowerCase() : '';
  return name || null;
}

export function localizeExerciseRecord(ex, lang = 'de', fallbackExercise = null) {
  const categories = getLocalizedArray(ex, 'categories', lang, fallbackExercise);
  const muscles = getLocalizedArray(ex, 'muscles', lang, fallbackExercise);
  const musclesLatin = getLocalizedArray(ex, 'musclesLatin', lang, fallbackExercise);
  const exerciseIndex = ex.exercise_index ?? ex.index ?? fallbackExercise?.exercise_index ?? fallbackExercise?.index ?? null;
  const description = getLocalizedScalar(ex, 'shortDescription', lang, fallbackExercise)
    || getLocalizedScalar(ex, 'description', lang, fallbackExercise);
  const notes = getLocalizedScalar(ex, 'notes', lang, fallbackExercise)
    || getLocalizedScalar(ex, 'tips', lang, fallbackExercise);
  const category = categories[0]
    || getLocalizedScalar(ex, 'category', lang, fallbackExercise)
    || getPrimaryCategory(fallbackExercise || ex);

  return {
    ...ex,
    id: ex.id != null ? String(ex.id) : (exerciseIndex != null ? String(exerciseIndex) : ''),
    index: ex.index ?? fallbackExercise?.index ?? exerciseIndex,
    exercise_index: exerciseIndex,
    name: getLocalizedScalar(ex, 'name', lang, fallbackExercise),
    category,
    categories,
    description,
    muscles: muscles.join(', '),
    musclesLatin,
    tips: notes,
    animation_type: ex.animation_type || ex.animationKey || fallbackExercise?.animation_type || fallbackExercise?.animationKey || '',
    video_url: ex.video_url || fallbackExercise?.video_url || '',
    shortDescription: description,
    notes,
  };
}

export function localizeExercises(exercises, lang = 'de', fallbackExercises = []) {
  const fallbackByKey = new Map();
  const fallbackByName = new Map();

  fallbackExercises.forEach((exercise) => {
    const key = getExerciseLookupKey(exercise);
    if (key) fallbackByKey.set(key, exercise);
    const nameKey = getExerciseNameKey(exercise);
    if (nameKey) fallbackByName.set(nameKey, exercise);
  });

  return normalizeExercises(
    (Array.isArray(exercises) ? exercises : []).map((exercise) => {
      const key = getExerciseLookupKey(exercise);
      const fallbackExercise = (key ? fallbackByKey.get(key) : null)
        || fallbackByName.get(getExerciseNameKey(exercise))
        || null;
      return localizeExerciseRecord(exercise, lang, fallbackExercise);
    }),
  );
}

const cacheByLanguage = new Map();
const pendingByLanguage = new Map();

async function fetchExercisesJson(timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('/assets/data/exercises.json', {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Exercise data request failed with status ${res.status}.`);
    }
    return await res.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getLocalExercises(language = getAppLanguage()) {
  if (cacheByLanguage.has(language)) {
    return cacheByLanguage.get(language);
  }

  if (pendingByLanguage.has(language)) {
    return pendingByLanguage.get(language);
  }

  const pending = (async () => {
    try {
      const data = await fetchExercisesJson();
      if (Array.isArray(data) && data.length > 0) {
        const normalized = localizeExercises(data, language);
        cacheByLanguage.set(language, normalized);
        return normalized;
      }
    } catch (_) {
      // File not present or request timed out - no fallback
    }

    cacheByLanguage.set(language, []);
    return [];
  })();

  pendingByLanguage.set(language, pending);

  try {
    return await pending;
  } finally {
    pendingByLanguage.delete(language);
  }
}

export function getLocalExercisesSync() {
  return cacheByLanguage.get(getAppLanguage()) || [];
}

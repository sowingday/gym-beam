import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { de, enUS } from 'date-fns/locale';
import { getAppLanguage, setSetting } from './settings';

const MESSAGES = {
  de: {
    nav: {
      workouts: 'Workouts',
      exercises: 'Übungen',
      achievements: 'Erfolge',
      profile: 'Profil',
      settings: 'Einstellungen',
    },
    common: {
      back: 'Zurück',
      close: 'Schließen',
      yes: 'Ja',
      no: 'Nein',
      language: 'Sprache',
      german: 'Deutsch',
      english: 'Englisch',
      seconds: 'Sekunden',
      preview: 'Vorschau',
      loadingExerciseDb: 'Lade Übungsdatenbank...',
    },
    settings: {
      title: 'Voreinstellungen',
      misc: 'Sonstiges',
      languageLabel: 'App-Sprache',
      languageHint: 'Stellt die bereits übersetzten Bereiche auf Englisch um.',
      showGreeting: 'Begrüßungsmeldung beim App-Start anzeigen',
      planZoom: 'Workout-Plan Größe',
      small: 'klein',
      medium: 'mittel',
      large: 'groß',
    },
    calendar: {
      title: 'Trainingskalender',
      note: 'Hinweis',
      deletedInfo: 'Gelöschte Workouts sind nicht mehr in der Historie sichtbar. Nur die damit verbundenen Erfolge bleiben erhalten. Nach Änderungen an Name oder Übungen bleibt ein Workout im Kalender und in der Historie sichtbar.',
      completed: 'Absolvierte Workouts:',
      planned: 'Geplante Workouts:',
      noneToday: 'Keine Workouts für heute geplant.',
      workouts: 'Workouts',
      weekdayHeaders: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
      weekdayKeys: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    },
    workoutPlan: {
      monthCalendar: 'Monatskalender',
      database: 'Workout Datenbank',
      aiCoach: 'KI-Coach',
      renameWorkout: 'Workout umbenennen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      createFailed: 'Workout konnte nicht erstellt werden.',
      createError: 'Fehler beim Erstellen',
      unknownError: 'Unbekannter Fehler',
      greeting: 'Hey {name}! Schön Dich wiederzusehen! Dein letztes Workout war {when}',
      yesterday: 'erst gestern!',
      dayBeforeYesterday: 'vorgestern.',
      onDate: 'am {date}.',
      weekdays: [
        { key: 'Mo', label: 'Montag' },
        { key: 'Di', label: 'Dienstag' },
        { key: 'Mi', label: 'Mittwoch' },
        { key: 'Do', label: 'Donnerstag' },
        { key: 'Fr', label: 'Freitag' },
        { key: 'Sa', label: 'Samstag' },
        { key: 'So', label: 'Sonntag' },
      ],
    },
    exercises: {
      titleAll: 'Alle Übungen',
      empty: 'Noch keine Übungen vorhanden.',
      uploadHint: 'Lege eine Datei unter /assets/data/exercises.json ab.',
      selectTitle: 'Übung(en) auswählen',
      multiSelect: 'Mehrfachauswahl',
      selectedCount: '{count} ausgewählt',
      applyCount_one: '{count} Übung übernehmen',
      applyCount_other: '{count} Übungen übernehmen',
      notFound: 'Übung nicht gefunden.',
      addToWorkout: 'Zum Workout hinzufügen',
      adding: 'Wird hinzugefügt...',
      added: '"{name}" hinzugefügt!',
      description: 'Beschreibung',
      muscles: 'Muskeln',
      musclesLatin: 'Muskeln (lat.)',
      notes: 'Hinweise',
      video: 'Video',
      watchVideo: 'Video ansehen',
      favorite: 'Favorit',
      filters: {
        allCategories: 'Alle Kategorien',
        favorites: 'Favoriten',
        exercise: 'Übung',
        name: 'Name',
        category: 'Kategorie',
        muscle: 'Muskel',
        muscles: 'Muskeln',
        select: 'Auswählen',
        noneFound: 'Keine Übungen gefunden.',
        latin: 'Auf Latein',
        german: 'Auf Deutsch',
      },
    },
  },
  en: {
    nav: {
      workouts: 'Workouts',
      exercises: 'Exercises',
      achievements: 'Achievements',
      profile: 'Profile',
      settings: 'Settings',
    },
    common: {
      back: 'Back',
      close: 'Close',
      yes: 'Yes',
      no: 'No',
      language: 'Language',
      german: 'German',
      english: 'English',
      seconds: 'seconds',
      preview: 'Preview',
      loadingExerciseDb: 'Loading exercise database...',
    },
    settings: {
      title: 'Preferences',
      misc: 'Miscellaneous',
      languageLabel: 'App language',
      languageHint: 'Switches already translated areas to English.',
      showGreeting: 'Show greeting when the app starts',
      planZoom: 'Workout plan size',
      small: 'small',
      medium: 'medium',
      large: 'large',
    },
    calendar: {
      title: 'Training calendar',
      note: 'Note',
      deletedInfo: 'Deleted workouts are no longer visible in history. Only the related achievements remain. After changing the name or exercises, a workout still remains visible in the calendar and history.',
      completed: 'Completed workouts:',
      planned: 'Planned workouts:',
      noneToday: 'No workouts planned for today.',
      workouts: 'Workouts',
      weekdayHeaders: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      weekdayKeys: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
    workoutPlan: {
      monthCalendar: 'Monthly calendar',
      database: 'Workout database',
      aiCoach: 'AI coach',
      renameWorkout: 'Rename workout',
      cancel: 'Cancel',
      save: 'Save',
      createFailed: 'Workout could not be created.',
      createError: 'Error while creating workout',
      unknownError: 'Unknown error',
      greeting: 'Hey {name}! Nice to see you again! Your last workout was {when}',
      yesterday: 'just yesterday!',
      dayBeforeYesterday: 'the day before yesterday.',
      onDate: 'on {date}.',
      weekdays: [
        { key: 'Mo', label: 'Monday' },
        { key: 'Di', label: 'Tuesday' },
        { key: 'Mi', label: 'Wednesday' },
        { key: 'Do', label: 'Thursday' },
        { key: 'Fr', label: 'Friday' },
        { key: 'Sa', label: 'Saturday' },
        { key: 'So', label: 'Sunday' },
      ],
    },
    exercises: {
      titleAll: 'All exercises',
      empty: 'No exercises available yet.',
      uploadHint: 'Place a file at /assets/data/exercises.json.',
      selectTitle: 'Select exercise(s)',
      multiSelect: 'Multi-select',
      selectedCount: '{count} selected',
      applyCount_one: 'Apply {count} exercise',
      applyCount_other: 'Apply {count} exercises',
      notFound: 'Exercise not found.',
      addToWorkout: 'Add to workout',
      adding: 'Adding...',
      added: '"{name}" added!',
      description: 'Description',
      muscles: 'Muscles',
      musclesLatin: 'Muscles (lat.)',
      notes: 'Notes',
      video: 'Video',
      watchVideo: 'Watch video',
      favorite: 'Favorite',
      filters: {
        allCategories: 'All categories',
        favorites: 'Favorites',
        exercise: 'Exercise',
        name: 'Name',
        category: 'Category',
        muscle: 'Muscle',
        muscles: 'Muscles',
        select: 'Select',
        noneFound: 'No exercises found.',
        latin: 'Show Latin',
        german: 'Show German',
      },
    },
  },
};

const I18nContext = createContext(null);

function resolveMessage(language, key) {
  return key.split('.').reduce((acc, part) => acc?.[part], MESSAGES[language]);
}

function interpolate(template, vars = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ''));
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getAppLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
    setSetting('app_language', language);
  }, [language]);

  const value = useMemo(() => {
    const t = (key, vars = {}) => {
      const count = typeof vars.count === 'number' ? vars.count : Number(vars.count);
      if (!Number.isNaN(count)) {
        const pluralKey = `${key}_${count === 1 ? 'one' : 'other'}`;
        const pluralMessage = resolveMessage(language, pluralKey);
        if (pluralMessage) {
          return interpolate(pluralMessage, vars);
        }
      }

      const message = resolveMessage(language, key);
      return message == null ? key : interpolate(message, vars);
    };

    return {
      language,
      setLanguage: (nextLanguage) => setLanguageState(nextLanguage === 'en' ? 'en' : 'de'),
      t,
      dateLocale: language === 'en' ? enUS : de,
      messages: MESSAGES[language],
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return context;
}

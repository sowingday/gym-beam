import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { de, enUS } from 'date-fns/locale';
import { getAppLanguage, setSetting } from './settings';

const MESSAGES = {
  de: {
    nav: {
      workouts: 'Workouts',
      exercises: 'Uebungen',
      achievements: 'Erfolge',
      profile: 'Profil',
      settings: 'Einstellungen',
    },
    common: {
      back: 'Zurueck',
      close: 'Schliessen',
      yes: 'Ja',
      no: 'Nein',
      language: 'Sprache',
      german: 'Deutsch',
      english: 'Englisch',
      seconds: 'Sekunden',
      preview: 'Vorschau',
      loadingExerciseDb: 'Lade Uebungsdatenbank...',
    },
    settings: {
      title: 'Voreinstellungen',
      misc: 'Sonstiges',
      languageLabel: 'App-Sprache',
      languageHint: 'Stellt die bereits uebersetzten Bereiche auf Englisch um.',
      showGreeting: 'Begruessungsmeldung beim App-Start anzeigen',
      planZoom: 'Workout-Plan: Groesse',
      small: 'klein',
      medium: 'mittel',
      large: 'gross',
    },
    calendar: {
      title: 'Trainingskalender',
      note: 'Hinweis',
      deletedInfo: 'Geloeschte Workouts sind nicht mehr in der Historie sichtbar. Nur die damit verbundenen Erfolge bleiben erhalten. Nach Aenderungen an Name oder Uebungen bleibt ein Workout im Kalender und in der Historie sichtbar.',
      completed: 'Absolvierte Workouts:',
      planned: 'Geplante Workouts:',
      noneToday: 'Keine Workouts fuer heute geplant.',
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
      greeting: 'Hey {name}! Schoen Dich wiederzusehen! Dein letztes Workout war {when}',
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
      titleAll: 'Alle Uebungen',
      empty: 'Noch keine Uebungen vorhanden.',
      uploadHint: 'Lege eine Datei unter /assets/data/exercises.json ab.',
      selectTitle: 'Uebung(en) auswaehlen',
      multiSelect: 'Mehrfachauswahl',
      selectedCount: '{count} ausgewaehlt',
      applyCount_one: '{count} Uebung uebernehmen',
      applyCount_other: '{count} Uebungen uebernehmen',
      notFound: 'Uebung nicht gefunden.',
      addToWorkout: 'Zum Workout hinzufuegen',
      adding: 'Wird hinzugefuegt...',
      added: '"{name}" hinzugefuegt!',
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
        exercise: 'Uebung',
        name: 'Name',
        category: 'Kategorie',
        muscle: 'Muskel',
        muscles: 'Muskeln',
        select: 'Auswaehlen',
        noneFound: 'Keine Uebungen gefunden.',
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
      planZoom: 'Workout plan: size',
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

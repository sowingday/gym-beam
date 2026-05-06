# Gym-Beam

Gym-Beam ist eine React- und Capacitor-App fuer Trainingsplanung, Workout-Tracking und Social-Sharing mit Supabase als Backend.

## Voraussetzungen

- Node.js 20+
- npm
- ein Supabase-Projekt mit den SQL-Skripten aus `supabase/`

## Lokale Einrichtung

1. Abhaengigkeiten installieren:
   `npm install`
2. `.env` oder `.env.local` anlegen:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

3. Entwicklungsserver starten:
   `npm run dev`

## Wichtige Skripte

- `npm run build` erstellt den Web-Build
- `npm run lint` prueft das Projekt mit ESLint
- `npm run android:sync` baut die Web-App und synchronisiert Android

## Supabase

- Grundsetup: `docs/SUPABASE_SETUP.md`
- Cutover-/Repo-Wechsel: `docs/SUPABASE_CUTOVER.md`
- SQL-Skripte: `supabase/`

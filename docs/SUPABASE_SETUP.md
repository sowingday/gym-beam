# Supabase Setup

Dieses Projekt ist bereits an Supabase angebunden.

## Vorhandene Bausteine

- Frontend-Client: `src/lib/supabaseClient.js`
- Auth-Flow: `src/lib/AuthContext.jsx` und `src/lib/authClient.js`
- Profil-/Avatar-Logik: `src/lib/userService.js`
- Social-Logik: `src/lib/socialService.js`
- Workout-/Log-Daten: `src/lib/workoutDataService.js`
- SQL-Skripte: `supabase/`

## Bereits benoetigte Supabase-Ressourcen

- Tabellen aus `supabase/schema.sql`
- Storage-Policies aus `supabase/storage-policies.sql`
- Achievement-Schema aus `supabase/achievements.sql`
- Storage-Bucket `avatars`

## Lokale Env-Variablen

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

## Optional spaeter

Wenn du spaeter echte repo-basierte Supabase-Migrationen pflegen willst:

```powershell
supabase login
supabase init
supabase link --project-ref aoecmjpbdlqbaiwbonxa
```

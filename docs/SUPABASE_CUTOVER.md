# Supabase Cutover

Der Base44-Cutover ist abgeschlossen. Die App laeuft jetzt mit Supabase und lokalen Fallbacks, aber ohne Base44-Code oder Base44-Abhaengigkeiten im Projekt.

## Aktueller Status

- Supabase Auth ist im Frontend aktiv
- Profile laufen ueber `profiles`
- Avatare laufen ueber den Storage-Bucket `avatars`
- Social-Daten laufen ueber `follows` und `workout_shares`
- Workouts, Templates, Bodyweights, Exercise-Logs und Achievements laufen ueber Supabase
- `npm run lint` ist sauber
- `npm run build` ist sauber
- `npm run android:sync` ist sauber

## Jetzt ist der Repo-Kopierpunkt

Die passende Stelle fuer den Repo-Wechsel ist jetzt erreicht.

Lokale Kopie erzeugen:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-supabase-repo-copy.ps1
```

Standard-Ziel:

`C:\Data\Workout Base\workout-base`

## GitHub-Schritte

1. Neues leeres GitHub-Repo `workout-base` anlegen.
2. Den neuen lokalen Ordner `C:\Data\Workout Base\workout-base` oeffnen.
3. Dort ausfuehren:

```powershell
git init
git add .
git commit -m "Initial Supabase version"
git branch -M main
git remote add origin https://github.com/<your-user>/workout-base.git
git push -u origin main
```

## Danach

- Nur noch im neuen Repo `workout-base` weiterarbeiten
- Das alte `workout-base-b44` als historischen Migrationsstand behalten

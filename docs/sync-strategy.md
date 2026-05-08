# Sync Strategy

## Ziel

Die App soll fuer persoenliche Daten offline-first funktionieren und spaeter konfliktarm nach Supabase synchronisieren.

## Kurzfristig umgesetzt

Diese Bereiche nutzen bereits lokale Speicherung plus spaeteren Sync:

- Profil
- Workouts
- Workout-Aenderungen inklusive Uebungen, Reihenfolge, Tage, Farben und Namen
- Koerpergewicht
- Trainingssessions
- Achievements
- Exercise-Logs

Social-Funktionen bleiben bewusst online-only:

- Freunde/Follower
- Inbox-Shares
- Workout-Sharing an Freunde

## Aktuelle Konfliktregeln

### Profil
- Feldbasierte Speicherung
- Praktisch aktuell: letzter erfolgreicher Schreibstand gewinnt

### Workouts
- Solange die Uebungsliste noch als JSON in `workouts.exercises` liegt, wird ein Workout technisch als groesserer Block behandelt.
- Praktisch aktuell: letzter erfolgreicher Schreibstand gewinnt
- Offline erstellte Workouts bekommen lokale IDs und spaeter ein Mapping auf die echte Supabase-ID.

### Koerpergewicht
- Ein Tageswert pro Datum
- Letzte Aenderung des Tages gewinnt

### Trainingssessions
- Jede Session traegt eine stabile lokale Session-ID.
- Sync nach Supabase nutzt `client_session_id`.
- Exercise-Logs nutzen `client_log_id`.
- Derselbe Trainingsabschluss wird dadurch bei Wiederholungsversuchen nicht doppelt gespeichert.

## Warum Workout-JSON mittelfristig problematisch ist

Aktuell liegt die gesamte Uebungsliste eines Workouts in einem JSON-Feld.

Beispiel:
- Geraet A fuegt offline `Plank` hinzu
- Geraet B aendert gleichzeitig online die Wiederholungen von `Liegestuetze`

Dann konkurrieren zwei komplette Listen miteinander, obwohl fachlich nur zwei kleine Teil-Aenderungen passiert sind.

## Mittelfristiger Zielzustand

Die Workout-Uebungen sollen in eine eigene Tabelle ausgelagert werden, z. B. `workout_exercises`.

Beispielhafte Felder:

- `id`
- `workout_id`
- `exercise_index`
- `position`
- `duration`
- `sets`
- `reps`
- `weight_kg`
- `updated_at`
- `updated_by_device`

Vorteile:

- Aenderungen koennen pro Uebung statt pro gesamter Liste synchronisiert werden
- Konflikte zwischen zwei Geraeten werden viel kleiner
- Einfache Aenderungen wie `neue Uebung hinzugefuegt` und `Wiederholungen geaendert` koennen zusammengefuehrt werden

## Empfohlene naechste Umsetzung

1. Neue Tabelle `workout_exercises` in Supabase anlegen.
2. Vorhandene JSON-Uebungslisten migrieren.
3. App-Lese- und Schreibpfade fuer Workouts auf die neue Tabelle umstellen.
4. Erst danach die alte JSON-Speicherung in `workouts.exercises` schrittweise abbauen.

## Nicht-Ziele im aktuellen Stand

- Keine Offline-Queue fuer Social-Daten
- Keine komplexe Merge-UI fuer Nutzerkonflikte
- Kein Multi-Device-CRDT-System

Das waere fuer diese App derzeit unverhaeltnismaessig komplex.

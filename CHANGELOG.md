# Changelog

Dieses Projekt nutzt ein einfaches, manuell gepflegtes Changelog.

## Unreleased

### Added
- `CHANGELOG.md` als uebersichtliche Produkt-Historie eingefuehrt.
- `docs/sync-strategy.md` fuer die Sync- und Konfliktstrategie angelegt.
- Neues Datenmodell `workout_exercises` fuer Workout-Uebungen eingefuehrt.

### Changed
- Workout-Uebungslisten werden jetzt bevorzugt ueber die neue Tabelle `workout_exercises` gelesen und geschrieben.
- Bestehende JSON-Uebungslisten aus `workouts.exercises` werden bei Bedarf serverseitig in das neue Modell uebernommen.

## 2026-05-08

### Added
- Offline-Sync-Queue fuer persoenliche Nutzerdaten eingefuehrt.
- Idempotente Sync-Keys fuer Trainingshistorie vorbereitet.
- Sichtbare Offline-Sperren fuer Social-/Freunde-/Teilen-Funktionen eingefuehrt.

### Changed
- Trainingsabschluesse, Workout-Aenderungen, Profilaenderungen und Gewichtsverlauf werden jetzt offline-first behandelt und spaeter synchronisiert.
- React-Router-Future-Flags aktiviert, damit die bekannten Dev-Warnungen verschwinden.

### Fixed
- Uebungen wurden nach dem Hinzufuegen zu einem Workout teilweise nicht dauerhaft gespeichert.
- Veraltete lokale Workout-Schattenstaende konnten den frischen Supabase-Stand ueberschreiben.
- Profilspeichern und einzelne Ladepfade konnten in haengenden Zustanden bleiben.

## 2026-05-07

### Added
- Web-Deploy fuer Bitpalast ueber GitHub Actions eingerichtet.
- Getrennter Fast-/Full-Deploy fuer Webhosting eingefuehrt.

### Changed
- Bitpalast-Deploys auf manuellen Start umgestellt.
- FTPS-Deploy robuster gemacht.

### Fixed
- Registrierungsmaske textlich ueberarbeitet.
- Benutzername im Signup ist jetzt optional und konsistent mit Mindestlaenge 4 Zeichen.
- Browser-Autofill-/Eingabeproblem beim Benutzername-Feld korrigiert.

## 2026-05-06

### Changed
- Projekt von `workout-base` nach `gym-beam` umbenannt.
- IDE-/Dokumentations-/Skript-Referenzen auf den neuen Projektnamen bereinigt.

## 2026-05-05

### Fixed
- Umlaute und sichtbare UI-Texte in der App bereinigt.

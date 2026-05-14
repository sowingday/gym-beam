# Exercise Audit Tool

Eigenständiges Audit-Tool für die Übungs-Masterdaten.

## Zweck

- Excel-Masterdatei laden und bearbeiten
- Lottie-Animationen direkt per Index prüfen
- Dubletten und verdächtige Namen filtern
- Namen und Beschreibungen schnell im Excel-Master korrigieren
- `exercises.json` direkt aus der Excel-Datei neu exportieren

## Start

1. Python mit `PySide6` und `openpyxl` installieren
2. Optional:

```powershell
pip install -r requirements_exercise_audit_tool.txt
```

3. Starten:

```powershell
start_exercise_audit_tool.bat
```

## Pfade

Standardpfade liegen in `exercise_audit_tool.defaults.json`.

Lokale Anpassungen werden in `exercise_audit_tool.local.json` gespeichert. Diese Datei wird beim ersten Speichern automatisch erzeugt.

## Aktueller Funktionsumfang

- Excel laden über konfigurierbare Pfade
- kleine Schnellvorschau oben und große Lottie-Vorschau im Hauptbereich
- Vorschau-Hintergrund umschaltbar über `Einstellungen`
- Pfad- und KI-Einstellungen im Menü statt im Hauptlayout
- Filter:
  - alle Übungen
  - nur Dublettenamen
  - nur verdächtige Namen
  - nur JSON-Abweichungen
  - nur Kategorie-Konflikte
- Vergleich `Excel-Master vs aktuelle App-JSON`
- Heuristik für problematische `ohne Gerät`-Kategorien
- Editieren und direktes Zurückschreiben in die Excel-Masterdatei
- Kategorien und Muskeln per Ein-Klick-Auswahl zuweisen oder entfernen
- neue Kategorien und Muskeln weiterhin manuell ergänzbar
- lokaler `KI-Vorschlag` für `Name` / `NameEn` auf Basis von Originalname, aktuellem Namen und typischen Slug-Mustern
- optionaler OpenAI-kompatibler KI-Provider für bessere Vorschläge
- Batch-Aktionen für Mehrfachauswahl
- Export von `exercises.json` plus Export-Report
- Menüpunkt `Hilfe -> Anleitung` mit Schritt-für-Schritt-Erklärung

## Hinweise

- Der `KI-Vorschlag` ist aktuell lokal heuristisch und bewusst konservativ. Er ersetzt keine manuelle Prüfung.
- Das Tool arbeitet pfadbasiert und ist nicht an seinen eigenen Speicherort gebunden, solange die Pfade korrekt gesetzt sind.
- `Status` bedeutet:
  - `OK`: Excel und App-JSON stimmen überein, keine Auffälligkeit
  - `Duplikatname`: derselbe deutsche Name kommt mehrfach vor
  - `Verdächtiger Name`: automatisch wirkender oder sprachlich auffälliger Name
  - `JSON abweichend`: Excel und App-JSON unterscheiden sich
  - `Kategorie prüfen`: `ohne Gerät` passt vermutlich nicht zur Quelle oder zum Namen
  - `Animation fehlt`: zum Index wurde keine Lottie-Datei gefunden

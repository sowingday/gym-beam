# Bitpalast Web Deploy

Das Repo kann die Web-App automatisch nach Bitpalast deployen, sobald `main` nach GitHub gepusht wird.

## Was der Workflow macht

- installiert Abhaengigkeiten mit `npm ci`
- baut die App mit `npm run build`
- laedt den Inhalt von `dist/` per `FTPS` nach Bitpalast hoch

## Voraussetzung bei Bitpalast

- FTPS/FTP-Zugang ist verfuegbar
- Benutzername ist das Hauptkonto, z. B. `srv-thombenjamin01`
- Zielordner fuer die Subdomain ist angelegt, z. B. `/app.gym-beam.de`

## GitHub-Secrets anlegen

In GitHub unter `Settings > Secrets and variables > Actions` diese Repository-Secrets anlegen:

- `BITPALAST_FTP_HOST`
  Wert: `136.243.124.154`

- `BITPALAST_FTP_PORT`
  Wert: `21`, falls Bitpalast keinen anderen FTPS-Port vorgibt.

- `BITPALAST_FTP_USER`
  Wert: `srv-thombenjamin01`

- `BITPALAST_FTP_PASSWORD`
  Wert: dein aktuelles FTPS-Passwort

- `BITPALAST_DEPLOY_PATH`
  Wert: `/app.gym-beam.de`

- `VITE_SUPABASE_URL`
  Wert: deine produktive Supabase-URL, z. B. `https://aoecmjpbdlqbaiwbonxa.supabase.co`

- `VITE_SUPABASE_ANON_KEY`
  Wert: dein produktiver Supabase-Anonymous-Key

Wichtig: Vite liest diese Werte beim Build. Wenn sie in GitHub nicht als Secrets gesetzt sind, wird die Web-App zwar gebaut und deployed, aber Login/Registrierung enden dann mit `Supabase is not configured.`.

## Workflow starten

Automatisch:

- jeder Push auf `main`

Manuell:

- in GitHub unter `Actions > Deploy Web App > Run workflow`

## Typische Fehler

- `530 Login incorrect`
  Benutzername oder Passwort stimmen nicht.

- `No such file or directory`
  `BITPALAST_DEPLOY_PATH` ist falsch. Fuer deine Subdomain ist sehr wahrscheinlich `/app.gym-beam.de` korrekt.

- TLS-/Zertifikatsfehler
  Dann pruefen, ob Bitpalast fuer deinen Zugang wirklich `FTPS` auf dem gewaehlten Port erwartet.

# Bitpalast Web Deploy

Das Repo hat jetzt zwei Deploy-Workflows fuer Bitpalast.

## Workflows

- `Deploy Web App (Fast)`
  Laeuft automatisch bei jedem Push auf `main` und kann auch manuell gestartet werden.
  Gedacht fuer normale Code-, UI- und Konfigurationsaenderungen.
  Schwere Ordner wie `assets/music` und `assets/animations` werden dabei nicht neu synchronisiert.

- `Deploy Web App (Full Assets)`
  Laeuft nur manuell.
  Gedacht fuer Aenderungen an Musik, Animationen oder wenn der Webspace komplett abgeglichen werden soll.

Beide Workflows:

- installieren Abhaengigkeiten mit `npm ci`
- bauen die App mit `npm run build`
- laden per `FTPS` nach Bitpalast hoch
- schreiben `index.html` immer erst ganz am Ende

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

- in GitHub unter `Actions > Deploy Web App (Fast) > Run workflow`
- oder `Actions > Deploy Web App (Full Assets) > Run workflow`

Empfehlung:

- im Alltag `Deploy Web App (Fast)`
- nur bei geaenderten Musik-/Animationsdateien `Deploy Web App (Full Assets)`

## Typische Fehler

- `530 Login incorrect`
  Benutzername oder Passwort stimmen nicht.

- `No such file or directory`
  `BITPALAST_DEPLOY_PATH` ist falsch. Fuer deine Subdomain ist sehr wahrscheinlich `/app.gym-beam.de` korrekt.

- TLS-/Zertifikatsfehler
  Dann pruefen, ob Bitpalast fuer deinen Zugang wirklich `FTPS` auf dem gewaehlten Port erwartet.

- `Timeout (control socket)`
  Bitpalast trennt gelegentlich die FTPS-Control-Verbindung. Die Workflows nutzen deshalb `lftp` mit hoeheren Timeouts, Reconnects und drei kompletten Wiederholungsversuchen. `index.html` wird weiterhin erst ganz zum Schluss geschrieben.

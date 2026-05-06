# Bitpalast Web Deploy

Das Repo kann die Web-App automatisch nach Bitpalast deployen, sobald `main` nach GitHub gepusht wird.

## Was der Workflow macht

- installiert Abhaengigkeiten mit `npm ci`
- baut die App mit `npm run build`
- synchronisiert den Inhalt von `dist/` per SSH/`rsync` nach Bitpalast
- loescht auf dem Webspace Dateien, die lokal nicht mehr im Build enthalten sind (`--delete`)

## Voraussetzung bei Bitpalast

- SSH/SFTP-Zugang ist verfuegbar
- Benutzername ist das Hauptkonto, z. B. `srv-thombenjamin01`
- Zielordner fuer die Subdomain ist angelegt, z. B. `/app.gym-beam.de`

## GitHub-Secrets anlegen

In GitHub unter `Settings > Secrets and variables > Actions` diese Repository-Secrets anlegen:

- `BITPALAST_HOST`
  Wert: der SSH-Host von Bitpalast. Nimm am besten den Hostnamen aus `Webhosting-Zugang` bei Bitpalast.

- `BITPALAST_PORT`
  Wert: `22`, falls Bitpalast keinen anderen SSH-Port vorgibt.

- `BITPALAST_USER`
  Wert: `srv-thombenjamin01`

- `BITPALAST_DEPLOY_PATH`
  Wert: `/app.gym-beam.de`

- `BITPALAST_SSH_KEY`
  Wert: privater SSH-Schluessel fuer den Deploy-Zugang

## SSH-Schluessel einrichten

Lokal ein neues Schluesselpaar erstellen:

```powershell
ssh-keygen -t ed25519 -C "github-actions-deploy" -f $env:USERPROFILE\.ssh\gym-beam-bitpalast
```

Dann:

1. Den Inhalt von `gym-beam-bitpalast.pub` bei Bitpalast im SSH-Zugang hinterlegen.
2. Den Inhalt von `gym-beam-bitpalast` als Secret `BITPALAST_SSH_KEY` in GitHub speichern.

Den privaten Schluessel inklusive der Zeilen

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

vollstaendig in GitHub einfuegen.

## Workflow starten

Automatisch:

- jeder Push auf `main`

Manuell:

- in GitHub unter `Actions > Deploy Web App > Run workflow`

## Typische Fehler

- `Host key verification failed`
  `BITPALAST_HOST` ist falsch oder der SSH-Dienst ist auf einem anderen Host/Port erreichbar.

- `Permission denied (publickey)`
  Public Key ist bei Bitpalast nicht korrekt hinterlegt oder `BITPALAST_SSH_KEY` passt nicht dazu.

- `No such file or directory`
  `BITPALAST_DEPLOY_PATH` ist falsch. Fuer deine Subdomain ist sehr wahrscheinlich `/app.gym-beam.de` korrekt.

# Einrichtung "Kader bearbeiten" (einmalig, ca. 10 Minuten)

Das Lesen funktioniert ohne Einrichtung (Passwort im Browser). Nur das **Speichern** braucht ein kleines Google-Skript.

1. **GitHub-Token**: github.com → Settings → Developer settings → Fine-grained tokens → Generate. Nur Repository `Hoebelje/fussball`, Berechtigung *Contents: Read and write*. Token kopieren.
2. **Skript**: script.google.com → Neues Projekt → Inhalt von `Code.gs` einfügen.
3. Zahnrad *Projekteinstellungen* → *Skripteigenschaften* → hinzufügen:
   - `KADER_PASSWORT` = das aktuelle Passwort
   - `GITHUB_TOKEN` = Token aus Schritt 1
4. *Bereitstellen → Neue Bereitstellung → Web-App*: Ausführen als **Ich**, Zugriff **Jeder**. Die URL (endet auf `/exec`) kopieren.
5. In `kader-u17-2026/config.json` eintragen: `{"api": "DIE-URL"}`

Passwort ändern: auf der Bearbeiten-Seite unter „Passwort ändern“. Das aktualisiert Skript und Verschlüsselung gleichzeitig.

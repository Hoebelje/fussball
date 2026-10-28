# Bearbeiten-Modus einrichten (einmalig, ca. 10 Minuten)

Damit der Button **Bearbeiten** oben rechts auf dem Spielplan funktioniert, braucht es zwei Dinge:

1. einen **GitHub-Schlüssel**, mit dem Änderungen gespeichert werden dürfen
2. ein **Google Apps Script**, das das Passwort prüft und mit dem Schlüssel speichert

Der Schlüssel liegt nur im Apps Script und ist nie im Browser oder auf der Seite sichtbar.

---

## Schritt 1: GitHub-Schlüssel erstellen

1. https://github.com/settings/personal-access-tokens/new öffnen
2. **Token name:** `Spielplan U17 speichern`
3. **Expiration:** möglichst lange Laufzeit wählen. Das Ablaufdatum notieren, danach muss ein neuer Schlüssel erstellt werden (siehe unten).
4. **Repository access:** *Only select repositories* → `Hoebelje/fussball` auswählen
5. **Permissions → Repository permissions → Contents:** *Read and write*
   (alle anderen Rechte bleiben auf „No access“)
6. Unten auf **Generate token** klicken und den angezeigten Schlüssel (beginnt mit `github_pat_…`) kopieren.
   Er wird nur einmal angezeigt.

## Schritt 2: Apps Script anlegen

1. https://script.google.com öffnen → **Neues Projekt**
2. Oben links auf „Unbenanntes Projekt“ klicken und es `Spielplan U17 speichern` nennen
3. Den gesamten Inhalt im Editor löschen und den Inhalt der Datei
   [`Code.gs`](https://github.com/Hoebelje/fussball/blob/main/spielplan-u17/apps-script/Code.gs) einfügen
   (dort oben rechts auf „Copy raw file“ klicken). Mit dem Disketten-Symbol speichern.

## Schritt 3: Passwort und Schlüssel hinterlegen

1. Links auf das Zahnrad **Projekteinstellungen** klicken
2. Ganz unten bei **Skripteigenschaften** auf **Skripteigenschaft hinzufügen**:
   - Eigenschaft `EDIT_PASSWORT` – Wert: das gemeinsame Bearbeitungs-Passwort für dich und die Trainer
   - Eigenschaft `GITHUB_TOKEN` – Wert: der Schlüssel aus Schritt 1
3. **Skripteigenschaften speichern**

## Schritt 4: Verbindung testen

1. Links auf **Editor** (`< >`) wechseln
2. Oben in der Auswahl die Funktion `testVerbindung` wählen und auf **Ausführen** klicken
3. Google fragt nach Berechtigungen → **Berechtigungen überprüfen** → dein Konto wählen.
   Erscheint „Google hat diese App nicht überprüft“: **Erweitert** → **Zu Spielplan U17 speichern wechseln** → **Zulassen**.
   (Das ist normal bei eigenen Skripten.)
4. Unten im Ausführungsprotokoll sollte stehen: `OK – 15 Spiele gelesen.`

## Schritt 5: Als Web-App bereitstellen

1. Oben rechts **Bereitstellen** → **Neue Bereitstellung**
2. Beim Zahnrad neben „Typ auswählen“ **Web-App** wählen
3. **Ausführen als:** *Ich*  ·  **Zugriff:** *Jeder*
4. **Bereitstellen** klicken und die **Web-App-URL** kopieren (endet auf `/exec`)

## Schritt 6: URL eintragen

In [`spielplan-u17/spiele.json`](https://github.com/Hoebelje/fussball/edit/main/spielplan-u17/spiele.json) die URL einsetzen:

```json
  "bearbeiten_api": "https://script.google.com/macros/s/…/exec",
```

Speichern (Commit changes). Nach 1–2 Minuten erscheint oben rechts auf dem Spielplan der Button **Bearbeiten**.

## Schritt 7: Täglichen Abgleich mit fussball.de einschalten

Das Script holt jede Nacht gegen 4 Uhr den Spielplan von fussball.de und aktualisiert die offiziellen Spiele
(verlegte Termine, neue Anstoßzeiten, abgesetzte Spiele). Selbst eingetragene Termine wie Turniere bleiben erhalten.

1. Im Editor oben die Funktion **`testFussballDe`** auswählen → **Ausführen**.
   Im Protokoll erscheint die Liste der Spiele, die fussball.de liefert. Es wird noch nichts gespeichert.
2. Funktion **`abgleichFussballDe`** auswählen → **Ausführen**.
   Google fragt einmal nach zusätzlichen Berechtigungen (E-Mail senden, zeitgesteuert ausführen) → zulassen.
   Im Protokoll steht danach „Abgleich: Spielplan aktualisiert …“.
3. Funktion **`abgleichEinrichten`** auswählen → **Ausführen**.
   Damit läuft der Abgleich ab jetzt jede Nacht automatisch. Kontrolle: links auf den Wecker **Trigger** klicken,
   dort steht `abgleichFussballDe` – „Tagestimer“.

Wenn der Abgleich einmal nicht funktioniert (z. B. weil fussball.de seine Seite umbaut), bekommst du eine E-Mail.
Die Seite zeigt dann weiter den letzten Stand.

**Offizielle Spiele** (alle, die auf fussball.de stehen) werden beim Abgleich immer auf den fussball.de-Stand gesetzt.
Änderungen an ihnen im Bearbeiten-Modus halten also nur bis zur nächsten Nacht. Eigene Termine an einem Tag,
an dem fussball.de ein offizielles Spiel führt, werden durch das offizielle Spiel ersetzt.

---

## Später

**Passwort ändern:** Apps Script → Projekteinstellungen → Skripteigenschaften → `EDIT_PASSWORT` ändern → speichern.
Gilt sofort. Wer das alte Passwort gespeichert hat, wird beim nächsten Speichern nach dem neuen gefragt.

**GitHub-Schlüssel abgelaufen** (Speichern meldet „GitHub-Lesen: 401“): Schritt 1 wiederholen und den neuen Schlüssel bei `GITHUB_TOKEN` eintragen.

**Neue Version von Code.gs einspielen:** Code im Editor ersetzen und speichern → **Bereitstellen** → **Bereitstellungen verwalten** → Stift → Version: **Neue Version** → **Bereitstellen**. Die URL bleibt gleich.

**Abgleich abschalten:** Apps Script → Trigger (Wecker-Symbol) → beim Eintrag `abgleichFussballDe` über das Menü ⋮ löschen.

**Neue Saison:** In `spiele.json` `von` und `bis` auf die neue Saison setzen. Die Mannschafts-ID auf fussball.de bleibt in der Regel gleich.
Falls nicht, kann sie in `spiele.json` als `"fussballde_team_id": "…"` eingetragen werden (steht in der Adresse der Mannschaftsseite nach `team-id/`).

**Bearbeiten-Button wieder ausblenden:** in `spiele.json` `"bearbeiten_api": ""` setzen.

**Zu viele falsche Passwörter:** Nach 10 Fehlversuchen ist das Speichern für alle 15 Minuten gesperrt.

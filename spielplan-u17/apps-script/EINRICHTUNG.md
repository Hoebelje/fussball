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

---

## Später

**Passwort ändern:** Apps Script → Projekteinstellungen → Skripteigenschaften → `EDIT_PASSWORT` ändern → speichern.
Gilt sofort. Wer das alte Passwort gespeichert hat, wird beim nächsten Speichern nach dem neuen gefragt.

**GitHub-Schlüssel abgelaufen** (Speichern meldet „GitHub-Lesen: 401“): Schritt 1 wiederholen und den neuen Schlüssel bei `GITHUB_TOKEN` eintragen.

**Neue Version von Code.gs einspielen:** Code im Editor ersetzen und speichern → **Bereitstellen** → **Bereitstellungen verwalten** → Stift → Version: **Neue Version** → **Bereitstellen**. Die URL bleibt gleich.

**Bearbeiten-Button wieder ausblenden:** in `spiele.json` `"bearbeiten_api": ""` setzen.

**Zu viele falsche Passwörter:** Nach 10 Fehlversuchen ist das Speichern für alle 15 Minuten gesperrt.

# U17-Kader 2026

Adresse: https://hoebelje.github.io/fussball/kader-u17-2026/

## Kader bearbeiten

Alle Spielerinnen stehen in **`kader.json`**. Die Seite selbst (`index.html`) musst du nicht anfassen.

Kader jetzt über die Seite `bearbeiten.html` bearbeiten (Passwort nötig, Einrichtung: `apps-script/EINRICHTUNG.md`). Die Daten liegen verschlüsselt in `kader.enc.json`.

### Eine Spielerin sieht so aus

```json
{"name": "Vorname Nachname", "geburtsdatum": "2011-06-08", "nr_heim": 10, "nr_ausw": 10},
```

- `geburtsdatum` immer als JJJJ-MM-TT schreiben. Angezeigt wird TT.MM.JJ.
- Die laufende Nummer vor dem Namen zählt die Seite automatisch.
- Zwischen zwei Einträgen steht ein Komma, nach dem letzten nicht.
- `stand`: Datum, das unter der Tabelle als „Stand“ erscheint.

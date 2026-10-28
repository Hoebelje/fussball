# Spielplan U17 (B-Juniorinnen)

Die Seite zeigt alle Wochenenden der Saison. Wochenenden ohne Spiel erscheinen automatisch als „spielfrei“.

Adresse: https://hoebelje.github.io/fussball/spielplan-u17/

## Termine direkt auf der Seite bearbeiten

Oben rechts auf dem Spielplan gibt es den Button **Bearbeiten** (nach einmaliger Einrichtung, siehe
[`apps-script/EINRICHTUNG.md`](apps-script/EINRICHTUNG.md)). Nach Eingabe des Bearbeitungs-Passworts:

- Termin antippen → ändern oder löschen
- „spielfrei“-Wochenende antippen → dort ein Spiel eintragen
- **+ Spiel hinzufügen** → Spiel an beliebigem Datum anlegen

## Termine in der Datei bearbeiten

Alle Termine stehen in **`spiele.json`**. Die Seite selbst (`index.html`) musst du nicht anfassen.

1. Auf GitHub `spielplan-u17/spiele.json` öffnen und auf den Stift (Edit) klicken.
2. Ändern, ergänzen oder löschen.
3. Unten auf **Commit changes** klicken. Nach 1–2 Minuten ist die Seite aktualisiert.

### Ein Spiel sieht so aus

```json
{ "datum": "2027-03-06", "zeit": "12:00", "heim": "SV Agrippina-Germania Köln", "gast": "SV GW Welldorf-Güsten", "wettbewerb": "Bezirksliga" },
```

- `datum` immer als JJJJ-MM-TT schreiben.
- Steht „Agrippina“ bei `heim`, wird das Spiel grün als Heimspiel markiert. Angezeigt wird nur der Gegner.
- Optional: `"ort": "Sportplatz XY"` für einen abweichenden Spielort.
- Zwischen zwei Spielen steht ein Komma, nach dem letzten Spiel nicht.

### Weitere Felder oben in der Datei

- `von` / `bis`: Zeitraum, für den Wochenenden angezeigt werden (z. B. Saisonende).
- `stand`: Datum, das unter der Liste als „Stand“ angezeigt wird.
- `team`, `verein`, `heimspielort`: Texte für Überschrift und Hinweis.
- `bearbeiten_api`: Web-App-URL des Apps Scripts. Leer lassen, um den Bearbeiten-Button auszublenden.

Wenn nach einer Änderung „Die Termine konnten nicht geladen werden“ erscheint, fehlt meist ein Komma oder eine Anführungszeichen. Prüfen kannst du die Datei z. B. auf https://jsonlint.com.

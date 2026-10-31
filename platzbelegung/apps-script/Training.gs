/**
 * Trainingsplan November 2026 in die Platz-Kalender eintragen.
 *
 * So geht's: In Apps Script oben bei "Dateien" auf "+" -> "Skript" klicken, Namen "Training" vergeben,
 * diesen Code einfügen, speichern. (Die Kalender-IDs stammen aus Code.gs.)
 * 1. Funktion "trainingNovemberTest" auswählen -> Ausführen -> Protokoll prüfen (es wird NICHTS eingetragen).
 * 2. Passt alles: "trainingNovemberEintragen" ausführen. Bereits vorhandene Termine werden nicht doppelt angelegt.
 * Rückgängig: "trainingNovemberLoeschen" löscht nur die damit angelegten Termine.
 */
const TRAINING_TAG = 'trainingsplan-2026-11';

// Datum, Kalender, Team, von, bis, Ort (Platzanteil)
const TRAINING_NOV = [
  ["2026-11-03", "Platz", "U13 (W)", "16:00", "17:30", "1/4 Platz"],
  ["2026-11-03", "Platz", "U15 (W)", "16:00", "17:30", "1/4 Platz"],
  ["2026-11-03", "Box 1", "U17 (W)", "17:00", "18:30", ""],
  ["2026-11-03", "Box 2", "U17 (W)", "17:00", "18:30", ""],
  ["2026-11-03", "Platz", "U19 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-03", "Platz", "U19 (M)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-10", "Platz", "U13 (W)", "16:00", "17:30", "1/4 Platz"],
  ["2026-11-10", "Platz", "U15 (W)", "16:00", "17:30", "1/4 Platz"],
  ["2026-11-10", "Box 1", "U19 (W)", "17:00", "18:30", ""],
  ["2026-11-10", "Box 2", "U19 (W)", "17:00", "18:30", ""],
  ["2026-11-10", "Platz", "U17 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-10", "Platz", "U19 (M)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-17", "Platz", "U13 (W)", "16:00", "17:30", "1/4 Platz"],
  ["2026-11-17", "Platz", "U15 (W)", "16:00", "17:30", "1/4 Platz"],
  ["2026-11-17", "Box 1", "U19 (M)", "17:00", "18:30", ""],
  ["2026-11-17", "Box 2", "U19 (M)", "17:00", "18:30", ""],
  ["2026-11-17", "Platz", "U17 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-17", "Platz", "U19 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-24", "Platz", "U13 (W)", "16:00", "17:30", "1/4 Platz"],
  ["2026-11-24", "Platz", "U15 (W)", "16:00", "17:30", "1/4 Platz"],
  ["2026-11-24", "Box 1", "U17 (W)", "17:00", "18:30", ""],
  ["2026-11-24", "Box 2", "U17 (W)", "17:00", "18:30", ""],
  ["2026-11-24", "Platz", "U19 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-24", "Platz", "U19 (M)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-05", "Box 1", "U13 (W)", "17:00", "18:30", ""],
  ["2026-11-05", "Box 2", "U15 (W)", "17:00", "18:30", ""],
  ["2026-11-05", "Platz", "U17 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-05", "Platz", "Frauen", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-05", "Platz", "U19 (W)", "17:30", "19:00", "1/2 Platz"],
  ["2026-11-05", "Weiden", "U19 (M)", "17:30", "19:00", ""],
  ["2026-11-12", "Box 1", "U13 (W)", "17:00", "18:30", ""],
  ["2026-11-12", "Box 2", "Frauen", "17:00", "18:30", ""],
  ["2026-11-12", "Platz", "U15 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-12", "Platz", "U19 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-12", "Platz", "U19 (M)", "17:30", "19:00", "1/2 Platz"],
  ["2026-11-12", "Weiden", "U17 (W)", "17:30", "19:00", ""],
  ["2026-11-19", "Box 1", "U13 (W)", "17:00", "18:30", ""],
  ["2026-11-19", "Platz", "U15 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-19", "Platz", "U19 (M)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-19", "Platz", "U17 (W)", "17:30", "19:00", "1/2 Platz"],
  ["2026-11-19", "Weiden", "U19 (W)", "17:30", "19:00", ""],
  ["2026-11-19", "Weiden", "Frauen", "17:30", "19:00", ""],
  ["2026-11-26", "Box 1", "U13 (W)", "17:00", "18:30", ""],
  ["2026-11-26", "Box 2", "U19 (W)", "17:00", "18:30", ""],
  ["2026-11-26", "Platz", "U17 (W)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-26", "Platz", "U19 (M)", "17:30", "19:00", "1/4 Platz"],
  ["2026-11-26", "Platz", "Frauen", "17:30", "19:00", "1/2 Platz"],
  ["2026-11-26", "Weiden", "U15 (W)", "17:30", "19:00", ""]
];

function trainingKalender_(name) {
  const c = CALENDARS.filter(function (x) { return x.name === name; })[0];
  return CalendarApp.getCalendarById(c.id);
}

function trainingZeit_(datum, uhr) {
  return Utilities.parseDate(datum + ' ' + uhr, 'Europe/Berlin', 'yyyy-MM-dd HH:mm');
}

function trainingNovemberTest() {
  trainingNovember_(false);
}

function trainingNovemberEintragen() {
  trainingNovember_(true);
}

function trainingNovember_(schreiben) {
  let neu = 0, uebersprungen = 0;
  TRAINING_NOV.forEach(function (t) {
    const titel = t[2] + ' Training', start = trainingZeit_(t[0], t[3]), ende = trainingZeit_(t[0], t[4]);
    const kal = trainingKalender_(t[1]);
    const da = kal.getEvents(start, ende).some(function (e) {
      return e.getTitle() === titel && e.getStartTime().getTime() === start.getTime();
    });
    Logger.log((da ? 'vorhanden  ' : 'NEU        ') + t[0] + ' ' + t[3] + '-' + t[4] + '  ' + t[1] + '  ' + titel + (t[5] ? '  [' + t[5] + ']' : ''));
    if (da) { uebersprungen++; return; }
    if (schreiben) {
      const e = kal.createEvent(titel, start, ende, { location: t[5] });
      e.setTag(TRAINING_TAG, '1');
    }
    neu++;
  });
  Logger.log((schreiben ? 'Eingetragen: ' : 'Würde eintragen: ') + neu + ', schon vorhanden: ' + uebersprungen);
}

function trainingNovemberLoeschen() {
  let n = 0;
  const von = new Date(2026, 9, 31), bis = new Date(2026, 11, 2);
  ['Platz', 'Box 1', 'Box 2', 'Weiden'].forEach(function (name) {
    trainingKalender_(name).getEvents(von, bis).forEach(function (e) {
      if (e.getTag(TRAINING_TAG)) { e.deleteEvent(); n++; }
    });
  });
  Logger.log('Gelöscht: ' + n);
}

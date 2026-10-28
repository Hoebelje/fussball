/**
 * Platzbelegung – liefert die Termine aus Google Kalender an die Webseite
 * und trägt Heimspiele von fussball.de automatisch in den Platz-Kalender ein.
 *
 * Einrichtung Spiele-Abgleich (einmalig):
 * 1. Code komplett ersetzen, speichern.
 * 2. Oben Funktion "testSpiele" auswählen → Ausführen → unten im Protokoll prüfen,
 *    welche Spiele gefunden werden (es wird NICHTS eingetragen).
 * 3. Passt alles: Funktion "abgleichEinrichten" auswählen → Ausführen.
 *    Danach läuft der Abgleich jede Nacht gegen 3 Uhr. Einmal sofort: "spieleAbgleichen".
 * 4. Bereitstellen → Bereitstellungen verwalten → Stift → Neue Version → Bereitstellen.
 */

// Reihenfolge und Namen müssen zu den Spalten in index.html passen.
const CALENDARS = [
  { name: "Platz",  id: "0d54e7afed5c0b27c6e1b179a4063df53aaabfcfdaca4a4d37ea0ff5fc2950c9@group.calendar.google.com" },
  { name: "Box 1",  id: "89494459fc899f968b9929d1d246787c85c08dc9a576a8ed01b677621f8257b3@group.calendar.google.com" },
  { name: "Box 2",  id: "28e70e09246c0f2eb2ce570f00800201f0b2730c6346089ce5834a7f198b95e8@group.calendar.google.com" },
  { name: "Weiden", id: "6493e5e8c7cfaae15d328d9722c9c6919984126d605931bb7670b7a2e9be3b9d@group.calendar.google.com" }
];

const CACHE_MINUTES = 5;

/* ================== EINSTELLUNGEN SPIELE-ABGLEICH ================== */

// Vereine auf fussball.de (die ID steht im Link der Vereinsseite hinter /id/)
const VEREINE = [
  { id: "00ES8GN91400001IVV0AG08LVUPGND5I", name: /agrippina/i, kuerzel: "" },       // Titel z. B. "U17 (W) Heimspiel – Gegner"
  { id: "00ES8GN91400001VVV0AG08LVUPGND5I", name: /ideal|casa de espa/i, kuerzel: "IDEAL" } // Titel z. B. "IDEAL Herren Heimspiel – Gegner"
];

// Nur Heimspiele auf dieser Spielstätte werden eingetragen (Teil des Namens genügt).
// Leer lassen = alle Heimspiele. Den genauen Namen zeigt "testSpiele" im Protokoll.
const SPIELSTAETTE = "";

const PLATZ_KALENDER = "Platz";
const TAGE_VORAUS = 60;          // so weit in die Zukunft wird abgeglichen
const VORLAUF_MIN = 60;          // Platz ist so viele Minuten vor Anpfiff belegt

// Mannschaftsart auf fussball.de -> Teamkürzel (für SV Agrippina), Spieldauer in Minuten, Platzanteil
// Reihenfolge wichtig: das erste passende Muster gilt.
const MANNSCHAFTEN = [
  { muster: /A-Juniorinnen/i,      team: "U19 (W)", dauer: 105, ort: "" },
  { muster: /B-Juniorinnen/i,      team: "U17 (W)", dauer: 100, ort: "" },
  { muster: /C-Juniorinnen/i,      team: "U15 (W)", dauer: 90,  ort: "" },
  { muster: /D-Juniorinnen/i,      team: "U13 (W)", dauer: 75,  ort: "1/2 Platz" },
  { muster: /A-Junioren/i,         team: "U19 (M)", dauer: 105, ort: "" },
  { muster: /Frauen/i,             team: "Frauen",  dauer: 105, ort: "" },
  { muster: /Herren.*(II|2)\b/i,   team: "Herren 2", dauer: 105, ort: "" },
  { muster: /Herren/i,             team: "Herren 1", dauer: 105, ort: "" },
  { muster: /[DE]-Junior/i,        team: "",        dauer: 75,  ort: "1/2 Platz" },
  { muster: /[FG]-Junior|Bambini/i, team: "",       dauer: 60,  ort: "1/4 Platz" },
  { muster: /.*/,                  team: "",        dauer: 105, ort: "" }
];

/* ================================================================= */

function doGet(e) {
  const p = (e && e.parameter) || {};
  const from = p.from ? new Date(p.from) : new Date();
  const to = p.to ? new Date(p.to) : new Date(from.getTime() + 7 * 864e5);

  if (isNaN(from) || isNaN(to) || to <= from || to - from > 62 * 864e5) {
    return json({ error: "Ungültiger Zeitraum" });
  }

  const cacheKey = "w2_" + from.getTime() + "_" + to.getTime();
  const cache = CacheService.getScriptCache();
  const hit = cache.get(cacheKey);
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);

  const events = [];
  CALENDARS.forEach(function (c) {
    if (!c.id) return;
    const cal = CalendarApp.getCalendarById(c.id);
    if (!cal) return;
    cal.getEvents(from, to).forEach(function (ev) {
      events.push({
        cal: c.name,
        title: ev.getTitle(),
        loc: ev.getLocation() || "",
        desc: ev.getDescription() || "",
        start: ev.getStartTime().toISOString(),
        end: ev.getEndTime().toISOString(),
        allDay: ev.isAllDayEvent(),
        series: ev.isRecurringEvent()
      });
    });
  });

  const out = JSON.stringify({ events: events });
  try { cache.put(cacheKey, out, CACHE_MINUTES * 60); } catch (err) {}
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ================== SPIELE-ABGLEICH ================== */

/** Zum Testen: zeigt im Protokoll, was eingetragen würde. Schreibt nichts. */
function testSpiele() {
  VEREINE.forEach(function (v) {
    const alle = vereinsSpiele(v);
    Logger.log('==== ' + v.id + ': ' + alle.length + ' Spiele gefunden');
    alle.forEach(function (s) {
      Logger.log((s.heimspiel ? 'HEIM ' : 'ausw ') + s.datum + ' ' + (s.zeit || '--:--') + ' | ' + s.mannschaft
        + ' | ' + s.heim + ' – ' + s.gast + ' | ' + (s.ort || 'Ort ?') + (s.abgesetzt ? ' | ABGESETZT' : ''));
    });
  });
  const plan = geplanteEintraege();
  Logger.log('==== Würde ' + plan.length + ' Heimspiele in den Kalender "' + PLATZ_KALENDER + '" eintragen:');
  plan.forEach(function (p) {
    Logger.log(fmt(p.start) + '–' + Utilities.formatDate(p.ende, 'Europe/Berlin', 'HH:mm') + '  ' + p.titel + (p.ort ? '  [' + p.ort + ']' : ''));
  });
}

/** Zum Fehlersuchen: zeigt den Anfang der Rohdaten von fussball.de. */
function testRohdaten() {
  const html = abrufen(VEREINE[0].id, heute(), plusTage(TAGE_VORAUS), 0);
  Logger.log(html.length + ' Zeichen');
  Logger.log(html.slice(0, 6000));
}

/** Richtet den nächtlichen Abgleich ein (einmal ausführen). */
function abgleichEinrichten() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'spieleAbgleichen'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('spieleAbgleichen').timeBased().everyDays(1).atHour(3).inTimezone('Europe/Berlin').create();
  Logger.log('Nächtlicher Abgleich eingerichtet (ca. 3 Uhr).');
}

/** Gleicht die Heimspiele mit dem Platz-Kalender ab. Läuft jede Nacht. */
function spieleAbgleichen() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const kal = CalendarApp.getCalendarById(CALENDARS.filter(function (c) { return c.name === PLATZ_KALENDER; })[0].id);
    const von = new Date(); von.setHours(0, 0, 0, 0);
    const bis = new Date(von.getTime() + (TAGE_VORAUS + 1) * 864e5);

    // Bisher vom Abgleich angelegte Termine (erkennbar am Tag "fbde")
    const vorhanden = {};
    kal.getEvents(von, bis).forEach(function (ev) {
      const nr = ev.getTag('fbde');
      if (nr) vorhanden[nr] = ev;
    });

    const plan = geplanteEintraege();
    if (plan.length === 0 && Object.keys(vorhanden).length > 0) {
      throw new Error('Auf fussball.de wurden keine Heimspiele gefunden, im Kalender stehen aber welche. '
        + 'Möglicherweise hat fussball.de die Seite umgebaut. Der Kalender wurde nicht verändert.');
    }

    let neu = 0, geaendert = 0, geloescht = 0;
    plan.forEach(function (p) {
      const ev = vorhanden[p.nr];
      delete vorhanden[p.nr];
      if (!ev) {
        const e = kal.createEvent(p.titel, p.start, p.ende, { location: p.ort, description: p.beschreibung });
        e.setTag('fbde', p.nr);
        neu++;
        return;
      }
      let anders = false;
      if (ev.getTitle() !== p.titel) { ev.setTitle(p.titel); anders = true; }
      if (ev.getStartTime().getTime() !== p.start.getTime() || ev.getEndTime().getTime() !== p.ende.getTime()) {
        ev.setTime(p.start, p.ende); anders = true;
      }
      if ((ev.getLocation() || '') !== p.ort) { ev.setLocation(p.ort); anders = true; }
      if ((ev.getDescription() || '') !== p.beschreibung) { ev.setDescription(p.beschreibung); anders = true; }
      if (anders) geaendert++;
    });

    // Nicht mehr vorhandene oder abgesetzte Spiele: Platz wieder freigeben
    Object.keys(vorhanden).forEach(function (nr) { vorhanden[nr].deleteEvent(); geloescht++; });

    Logger.log('Abgleich: ' + neu + ' neu, ' + geaendert + ' geändert, ' + geloescht + ' gelöscht (' + plan.length + ' Heimspiele).');
  } catch (err) {
    const text = 'Beim nächtlichen Abgleich der Platzbelegung mit fussball.de ist ein Fehler aufgetreten:\n\n'
      + (err && err.message ? err.message : err)
      + '\n\nDer Platz-Kalender wurde nicht verändert.';
    Logger.log(text);
    try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Platzbelegung: Abgleich mit fussball.de fehlgeschlagen', text); } catch (e) {}
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/** Alle Heimspiele beider Vereine als fertige Kalendereinträge. */
function geplanteEintraege() {
  const plan = [];
  VEREINE.forEach(function (v) {
    vereinsSpiele(v).forEach(function (s) {
      if (!s.heimspiel || s.abgesetzt || !s.zeit) return;
      if (SPIELSTAETTE && (s.ort || '').toLowerCase().indexOf(SPIELSTAETTE.toLowerCase()) < 0) return;
      const m = MANNSCHAFTEN.filter(function (x) { return x.muster.test(s.mannschaft + ' ' + s.heim); })[0];
      const anpfiff = Utilities.parseDate(s.datum + ' ' + s.zeit, 'Europe/Berlin', 'yyyy-MM-dd HH:mm');
      const start = new Date(anpfiff.getTime() - VORLAUF_MIN * 60000);
      const ende = new Date(anpfiff.getTime() + m.dauer * 60000);
      const team = v.kuerzel ? v.kuerzel + ' ' + s.mannschaft : (m.team || s.mannschaft);
      plan.push({
        nr: s.nr,
        titel: team + ' Heimspiel – ' + s.gast,
        start: start,
        ende: ende,
        ort: m.ort,
        beschreibung: 'Anpfiff ' + s.zeit + ' Uhr · ' + (s.wettbewerb || 'Spiel') + '\n'
          + s.heim + ' – ' + s.gast + '\nAutomatisch von fussball.de übernommen'
      });
    });
  });
  return plan;
}

/** Lädt den Vereinsspielplan eines Vereins (alle Seiten) und zerlegt ihn. */
function vereinsSpiele(v) {
  const von = heute(), bis = plusTage(TAGE_VORAUS);
  let alle = [], offset = 0;
  for (let seite = 0; seite < 10; seite++) {
    const teil = spielplanParsen(abrufen(v.id, von, bis, offset), v);
    alle = alle.concat(teil.spiele);
    if (teil.zeilen < 100) break;
    offset += 100;
  }
  const gesehen = {};
  return alle.filter(function (s) { if (gesehen[s.nr]) return false; gesehen[s.nr] = true; return true; });
}

function abrufen(vereinId, von, bis, offset) {
  const url = 'https://www.fussball.de/ajax.club.matchplan/-/id/' + vereinId
    + '/mode/PAGE/show-filter/false/max/100/datum-von/' + von + '/datum-bis/' + bis
    + '/show-venues/checked/offset/' + offset;
  const r = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (Platzbelegung SV Agrippina-Germania Koeln)' }
  });
  if (r.getResponseCode() !== 200) throw new Error('fussball.de antwortet mit Status ' + r.getResponseCode() + '.');
  return r.getContentText('UTF-8');
}

/** Zerlegt das HTML des Vereinsspielplans Zeile für Zeile. Ohne DOM, damit es in Apps Script läuft. */
function spielplanParsen(html, verein) {
  const entities = function (s) {
    return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(+n); })
      .replace(/​/g, '');
  };
  const text = function (s) { return entities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); };
  const ohneEV = function (n) { return n.replace(/\s+e\.\s?V\.?$/i, '').trim(); };

  const zeilen = html.split(/<tr\b/i).slice(1);
  const spiele = [];
  let datum = '', zeit = '', mannschaft = '', wettbewerb = '', zuletzt = null, anzahl = 0;

  zeilen.forEach(function (z) {
    const klasse = (z.match(/^[^>]*class="([^"]*)"/) || [])[1] || '';
    const t = text('<x' + z);

    // Datum (dd.mm.yyyy oder dd.mm.yy) und Uhrzeit, wo immer sie stehen
    const d4 = t.match(/(\d{2})\.(\d{2})\.(\d{4})/), d2 = t.match(/(\d{2})\.(\d{2})\.(\d{2})\b/);
    if (d4) datum = d4[3] + '-' + d4[2] + '-' + d4[1];
    else if (d2) datum = '20' + d2[3] + '-' + d2[2] + '-' + d2[1];

    if (/row-competition|row-headline/.test(klasse) || /column-team|column-date/.test(z)) {
      const zm = t.match(/(\d{1,2}):(\d{2})/);
      if (zm) zeit = ('0' + zm[1]).slice(-2) + ':' + zm[2];
      const team = (z.match(/class="column-team"[^>]*>([\s\S]*?)<\/td>/) || [])[1];
      if (team) mannschaft = text(team);
      const teile = t.split('|').map(function (x) { return x.trim(); });
      const tds = [];
      z.replace(/<td[^>]*>([\s\S]*?)<\/td>/g, function (m, inner) { tds.push(text(inner)); return m; });
      if (tds.length) wettbewerb = tds[tds.length - 1];
      if (!team && teile.length > 1) { mannschaft = mannschaft || teile[1]; wettbewerb = teile[teile.length - 1]; }
      return;
    }

    if (/row-venue/.test(klasse)) {
      if (zuletzt) zuletzt.ort = t;
      return;
    }

    const namen = [];
    z.replace(/<div class="club-name">([\s\S]*?)<\/div>/g, function (m, n) { namen.push(text(n)); return m; });
    if (namen.length < 2 || !datum) return;
    anzahl++;

    const link = (z.match(/href="[^"]*\/spiel\/[^"]*\/-\/spiel\/([A-Z0-9]+)/i) || z.match(/\/spiel\/([A-Z0-9]{20,})/i) || [])[1];
    const score = text((z.match(/<td class="column-score">([\s\S]*?)<\/td>/) || [])[1] || '');
    const spiel = {
      datum: datum,
      zeit: zeit,
      mannschaft: mannschaft || '',
      wettbewerb: wettbewerb || '',
      heim: ohneEV(namen[0]),
      gast: ohneEV(namen[1]),
      heimspiel: verein.name.test(namen[0]),
      abgesetzt: /Absetzung|Ausfall|Annul|abgesetzt/i.test(score),
      ort: ''
    };
    spiel.nr = link || (verein.id.slice(-6) + '-' + datum + '-' + zeit + '-' + spiel.heim + '-' + spiel.gast).replace(/\s+/g, '');
    spiele.push(spiel);
    zuletzt = spiel;
  });
  return { spiele: spiele, zeilen: anzahl };
}

function heute() { return Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd'); }
function plusTage(n) { return Utilities.formatDate(new Date(Date.now() + n * 864e5), 'Europe/Berlin', 'yyyy-MM-dd'); }
function fmt(d) { return Utilities.formatDate(d, 'Europe/Berlin', 'EEE dd.MM. HH:mm'); }

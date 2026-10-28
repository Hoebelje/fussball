/**
 * Speicher-Dienst für den Spielplan U17.
 *
 * Nimmt Änderungen von der Spielplan-Seite entgegen, prüft das Bearbeitungs-Passwort
 * und schreibt die Datei spielplan-u17/spiele.json im GitHub-Repo Hoebelje/fussball.
 *
 * Benötigte Skripteigenschaften (Projekteinstellungen → Skripteigenschaften):
 *   EDIT_PASSWORT  – gemeinsames Passwort für alle, die Termine bearbeiten dürfen
 *   GITHUB_TOKEN   – Fine-grained Token, nur für Repo Hoebelje/fussball, Recht "Contents: Read and write"
 *
 * Außerdem gleicht abgleichFussballDe() einmal täglich die offiziellen Spiele mit fussball.de ab
 * (einmalig abgleichEinrichten() ausführen, um den täglichen Lauf anzulegen).
 *
 * Dieser Code enthält keine Geheimnisse und darf öffentlich im Repo liegen.
 */

const REPO = 'Hoebelje/fussball';
const PFAD = 'spielplan-u17/spiele.json';
const BRANCH = 'main';
const MAX_FEHLVERSUCHE = 10;      // danach Sperre ...
const SPERRE_SEKUNDEN = 15 * 60;  // ... für 15 Minuten

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return antwort({ ok: false, fehler: 'Ungültige Anfrage.' });
  }

  const props = PropertiesService.getScriptProperties();
  const cache = CacheService.getScriptCache();

  // Passwort prüfen, Fehlversuche bremsen
  const fehlversuche = Number(cache.get('fehlversuche') || 0);
  if (fehlversuche >= MAX_FEHLVERSUCHE) {
    return antwort({ ok: false, fehler: 'Zu viele falsche Passwörter. Bitte in 15 Minuten erneut versuchen.' });
  }
  const passwort = props.getProperty('EDIT_PASSWORT');
  if (!passwort || typeof req.passwort !== 'string' || req.passwort !== passwort) {
    cache.put('fehlversuche', String(fehlversuche + 1), SPERRE_SEKUNDEN);
    Utilities.sleep(1500);
    return antwort({ ok: false, passwortFalsch: true, fehler: 'Das Passwort ist falsch.' });
  }

  if (req.aktion === 'pruefen') return antwort({ ok: true });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const datei = lesen(props);
    const daten = JSON.parse(datei.inhalt);
    const spiele = Array.isArray(daten.spiele) ? daten.spiele : [];
    const gleich = (a, b) => a && b && a.datum === b.datum && a.heim === b.heim && a.gast === b.gast;
    let nachricht;

    if (req.aktion === 'neu') {
      const s = pruefen(req.spiel);
      spiele.push(s);
      nachricht = `Spielplan U17: Spiel am ${s.datum} hinzugefügt`;
    } else if (req.aktion === 'aendern' || req.aktion === 'loeschen') {
      const i = spiele.findIndex(s => gleich(s, req.alt));
      if (i < 0) {
        return antwort({ ok: false, fehler: 'Dieser Termin wurde inzwischen von jemand anderem geändert. Bitte die Seite neu laden.', daten: daten });
      }
      if (req.aktion === 'aendern') {
        const neu = pruefen(req.spiel);
        // offizielles Spiel bleibt als solches markiert, inkl. Abgleich-Infos
        ['spielnr', 'fbde', 'vorher', 'geaendert', 'status'].forEach(k => {
          if (spiele[i][k] !== undefined) neu[k] = spiele[i][k];
        });
        spiele[i] = neu;
        nachricht = `Spielplan U17: Spiel am ${spiele[i].datum} geändert`;
      } else {
        nachricht = `Spielplan U17: Spiel am ${spiele[i].datum} gelöscht`;
        spiele.splice(i, 1);
      }
    } else {
      return antwort({ ok: false, fehler: 'Unbekannte Aktion.' });
    }

    spiele.sort((a, b) => (a.datum + (a.zeit || '')).localeCompare(b.datum + (b.zeit || '')));
    daten.spiele = spiele;
    daten.stand = Utilities.formatDate(new Date(), 'Europe/Berlin', 'dd.MM.yyyy');

    schreiben(props, formatieren(daten), datei.sha, nachricht + ' (über Bearbeiten-Modus)');
    return antwort({ ok: true, daten: daten });
  } catch (err) {
    return antwort({ ok: false, fehler: 'Speichern fehlgeschlagen: ' + (err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/** Prüft und bereinigt ein Spiel aus dem Formular. */
function pruefen(s) {
  if (!s || typeof s !== 'object') throw new Error('Keine Spieldaten.');
  const text = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
  const spiel = {
    datum: text(s.datum, 10),
    zeit: text(s.zeit, 5),
    heim: text(s.heim, 80),
    gast: text(s.gast, 80),
    wettbewerb: text(s.wettbewerb, 60)
  };
  const ort = text(s.ort, 80);
  if (ort) spiel.ort = ort;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spiel.datum)) throw new Error('Datum fehlt oder ist ungültig.');
  if (spiel.zeit && !/^\d{2}:\d{2}$/.test(spiel.zeit)) throw new Error('Anstoßzeit ist ungültig.');
  if (!spiel.heim || !spiel.gast) throw new Error('Gegner fehlt.');
  return spiel;
}

function lesen(props) {
  const r = UrlFetchApp.fetch(`https://api.github.com/repos/${REPO}/contents/${PFAD}?ref=${BRANCH}`, {
    headers: kopfzeilen(props),
    muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200) throw new Error('GitHub-Lesen: ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 200));
  const j = JSON.parse(r.getContentText());
  const inhalt = Utilities.newBlob(Utilities.base64Decode(j.content.replace(/\n/g, ''))).getDataAsString('UTF-8');
  return { inhalt: inhalt, sha: j.sha };
}

function schreiben(props, inhalt, sha, nachricht) {
  const r = UrlFetchApp.fetch(`https://api.github.com/repos/${REPO}/contents/${PFAD}`, {
    method: 'put',
    contentType: 'application/json',
    headers: kopfzeilen(props),
    payload: JSON.stringify({
      message: nachricht,
      content: Utilities.base64Encode(inhalt, Utilities.Charset.UTF_8),
      sha: sha,
      branch: BRANCH
    }),
    muteHttpExceptions: true
  });
  if (r.getResponseCode() !== 200 && r.getResponseCode() !== 201) {
    throw new Error('GitHub-Schreiben: ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 200));
  }
}

function kopfzeilen(props) {
  const token = props.getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN fehlt in den Skripteigenschaften.');
  return {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

/** Schreibt die Datei im gewohnten Format: ein Spiel pro Zeile. */
function formatieren(d) {
  const zeile = o => '{ ' + Object.keys(o).map(k => JSON.stringify(k) + ': ' + JSON.stringify(o[k])).join(', ') + ' }';
  const kopf = Object.keys(d).filter(k => k !== 'spiele').map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(d[k]));
  const spiele = d.spiele.map(s => '    ' + zeile(s));
  return '{\n' + kopf.join(',\n') + ',\n  "spiele": [\n' + spiele.join(',\n') + '\n  ]\n}\n';
}

function antwort(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Zum Testen im Editor: prüft, ob der GitHub-Token die Datei lesen kann. */
function testVerbindung() {
  const datei = lesen(PropertiesService.getScriptProperties());
  Logger.log('OK – ' + JSON.parse(datei.inhalt).spiele.length + ' Spiele gelesen.');
}


/* =====================================================================
 * Täglicher Abgleich mit fussball.de
 * ===================================================================== */

const FUSSBALLDE_TEAM_ID = '02EOFMCS6G000000VS5489B2VSAS84KM'; // B-Juniorinnen auf fussball.de (bleibt über Saisons gleich)

/** Einmal im Editor ausführen: legt den täglichen Abgleich (ca. 4 Uhr nachts) an. */
function abgleichEinrichten() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'abgleichFussballDe')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('abgleichFussballDe').timeBased().everyDays(1).atHour(4).inTimezone('Europe/Berlin').create();
  Logger.log('Täglicher Abgleich mit fussball.de ist eingerichtet.');
}

/**
 * Holt den Mannschaftsspielplan von fussball.de und aktualisiert damit die offiziellen Spiele
 * (Einträge mit "spielnr"). Änderungen an Datum, Anstoßzeit oder Heimrecht werden in "vorher"
 * festgehalten, abgesetzte oder von fussball.de verschwundene Spiele bekommen "status": "abgesetzt".
 * Selbst eingetragene Termine ohne "spielnr" werden nie verändert oder entfernt.
 */
function abgleichFussballDe() {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const datei = lesen(props);
    const daten = JSON.parse(datei.inhalt);
    const teamId = daten.fussballde_team_id || FUSSBALLDE_TEAM_ID;
    const offiziell = fussballDeSpiele(teamId, daten.von, daten.bis, daten.verein);

    const alteOffizielle = (daten.spiele || []).filter(s => s.spielnr).length;
    if (offiziell.length === 0 && alteOffizielle > 0) {
      throw new Error('Auf fussball.de wurden keine Spiele gefunden. Möglicherweise hat fussball.de die Seite umgebaut. Der Spielplan wurde nicht verändert.');
    }

    const heute = Utilities.formatDate(new Date(), 'Europe/Berlin', 'yyyy-MM-dd');
    const neueSpiele = zusammenfuehren(daten.spiele || [], offiziell, heute);
    const eigene = neueSpiele.filter(s => !s.spielnr);

    const vorher = formatieren(Object.assign({}, daten, { stand: '' }));
    daten.spiele = neueSpiele;
    const nachher = formatieren(Object.assign({}, daten, { stand: '' }));
    props.setProperty('LETZTER_ABGLEICH', new Date().toISOString());

    if (vorher === nachher) {
      Logger.log('Abgleich: keine Änderungen (' + offiziell.length + ' offizielle Spiele).');
      return;
    }
    daten.stand = Utilities.formatDate(new Date(), 'Europe/Berlin', 'dd.MM.yyyy');
    schreiben(props, formatieren(daten), datei.sha, 'Spielplan U17: Abgleich mit fussball.de');
    Logger.log('Abgleich: Spielplan aktualisiert (' + offiziell.length + ' offizielle, ' + eigene.length + ' eigene Spiele).');
  } catch (err) {
    const text = 'Beim täglichen Abgleich des Spielplans U17 mit fussball.de ist ein Fehler aufgetreten:\n\n'
      + (err && err.message ? err.message : err)
      + '\n\nDie Seite zeigt weiterhin den letzten Stand. Termine können solange über den Bearbeiten-Modus gepflegt werden.';
    Logger.log(text);
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Spielplan U17: Abgleich mit fussball.de fehlgeschlagen', text);
    } catch (mailErr) {
      Logger.log('E-Mail konnte nicht gesendet werden: ' + mailErr);
    }
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Führt den bisherigen Spielplan mit den frisch gelesenen fussball.de-Spielen zusammen.
 *  - alte:     bisherige Einträge aus spiele.json
 *  - frisch:   Ergebnis von spielplanParsen (inkl. abgesetzter Spiele mit abgesetzt: true)
 *  - heute:    'yyyy-MM-dd', wird als Änderungsdatum eingetragen
 * Pro offiziellem Spiel wird in "fbde" der letzte fussball.de-Stand gemerkt. Verglichen wird immer
 * mit diesem Stand, damit Änderungen im Bearbeiten-Modus nicht als fussball.de-Änderung zählen.
 */
function zusammenfuehren(alte, frisch, heute) {
  const istHeim = s => /agrippina/i.test(s.heim || '');
  const bisher = {};
  alte.filter(s => s.spielnr).forEach(s => { bisher[s.spielnr] = s; });

  const offiziell = frisch.map(f => {
    const a = bisher[f.spielnr];
    delete bisher[f.spielnr];
    const neu = { datum: f.datum, zeit: f.zeit, heim: f.heim, gast: f.gast, wettbewerb: f.wettbewerb, spielnr: f.spielnr };
    if (a && a.ort) neu.ort = a.ort;

    if (a) {
      const alt = a.fbde || { datum: a.datum, zeit: a.zeit || '', heim: istHeim(a) }; // letzter fussball.de-Stand
      const vorher = Object.assign({}, a.vorher || {});
      const vergleich = [
        ['datum', alt.datum, f.datum],
        ['zeit', alt.zeit || '', f.zeit || ''],
        ['heimrecht', alt.heim ? 'heim' : 'auswaerts', istHeim(f) ? 'heim' : 'auswaerts']
      ];
      vergleich.forEach(([feld, war, ist]) => {
        if (war !== ist && !(feld in vorher)) vorher[feld] = war;   // ursprünglichen Wert festhalten
        if (feld in vorher && vorher[feld] === ist) delete vorher[feld]; // wieder wie ursprünglich
      });
      if (Object.keys(vorher).length) {
        neu.vorher = vorher;
        const gleichWieVorher = JSON.stringify(vorher) === JSON.stringify(a.vorher || {});
        const fbdeGeaendert = alt.datum !== f.datum || (alt.zeit || '') !== (f.zeit || '') || !!alt.heim !== istHeim(f);
        neu.geaendert = (gleichWieVorher && !fbdeGeaendert && a.geaendert) ? a.geaendert : heute;
      }
    }
    if (f.abgesetzt) neu.status = 'abgesetzt';
    neu.fbde = { datum: f.datum, zeit: f.zeit || '', heim: istHeim(f) };
    return neu;
  });

  // Offizielle Spiele, die es auf fussball.de nicht mehr gibt, bleiben als "abgesetzt" stehen
  const verschwunden = Object.keys(bisher).map(nr => Object.assign({}, bisher[nr], { status: 'abgesetzt' }));

  // Eigene Termine (ohne spielnr) bleiben immer erhalten
  const eigene = alte.filter(s => !s.spielnr);

  return eigene.concat(offiziell, verschwunden)
    .sort((a, b) => (a.datum + (a.zeit || '')).localeCompare(b.datum + (b.zeit || '')));
}

/** Lädt den Spielplan einer Mannschaft von fussball.de und wandelt ihn in Spiel-Einträge um. */
function fussballDeSpiele(teamId, von, bis, verein) {
  const url = 'https://www.fussball.de/ajax.team.matchplan/-/mode/PAGE/team-id/' + teamId
    + '/max/200/offset/0/datum-von/' + von + '/datum-bis/' + bis;
  const r = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (Spielplan SV Agrippina-Germania Koeln)' }
  });
  if (r.getResponseCode() !== 200) throw new Error('fussball.de antwortet mit Status ' + r.getResponseCode() + '.');
  return spielplanParsen(r.getContentText('UTF-8'), verein);
}

/** Zerlegt das HTML des fussball.de-Mannschaftsspielplans. Ohne DOM, damit es in Apps Script läuft. */
function spielplanParsen(html, verein) {
  const entities = s => s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/\u200b/g, '');
  const ohneTags = s => entities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  const wettbewerbName = w => /freundschaft/i.test(w) ? 'Freundschaftsspiel' : w;
  const vereinName = n => /agrippina/i.test(n) ? (verein || n) : n.replace(/\s+e\.\s?V\.?$/i, '').trim();

  const spiele = [];
  const bloecke = html.split(/<tr class="row-headline[^"]*">/).slice(1);
  for (const block of bloecke) {
    const kopf = (block.match(/<td[^>]*>([\s\S]*?)<\/td>/) || [])[1];
    if (!kopf) continue;
    const kopfText = ohneTags(kopf);           // "Samstag, 07.11.2026 - 15:30 Uhr | Bezirksliga"
    const d = kopfText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!d) continue;
    const zeit = (kopfText.match(/(\d{1,2}):(\d{2})\s*Uhr/) || []);
    const wettbewerb = (kopfText.split('|')[1] || '').trim();

    const namen = [];
    block.replace(/<div class="club-name">([\s\S]*?)<\/div>/g, (m, n) => { namen.push(ohneTags(n)); return m; });
    if (namen.length < 2) continue;            // z. B. spielfrei

    const nr = (block.match(/\b[A-Z]{2,3}\s*\|\s*(\d{5,})/) || [])[1];
    const score = ohneTags((block.match(/<td class="column-score">([\s\S]*?)<\/td>/) || [])[1] || '');
    const abgesetzt = /Absetzung|Ausfall|Annul/i.test(score);

    const spiel = {
      datum: d[3] + '-' + d[2] + '-' + d[1],
      zeit: zeit.length ? ('0' + zeit[1]).slice(-2) + ':' + zeit[2] : '',
      heim: vereinName(namen[0]),
      gast: vereinName(namen[1]),
      wettbewerb: wettbewerbName(wettbewerb)
    };
    if (!/agrippina/i.test(spiel.heim + spiel.gast)) continue;
    spiel.spielnr = nr || ('fbde-' + spiel.datum);
    if (abgesetzt) spiel.abgesetzt = true;
    spiele.push(spiel);
  }
  return spiele;
}

/** Zum Testen im Editor: zeigt, was der Abgleich von fussball.de lesen würde, ohne etwas zu speichern. */
function testFussballDe() {
  const daten = JSON.parse(lesen(PropertiesService.getScriptProperties()).inhalt);
  const spiele = fussballDeSpiele(daten.fussballde_team_id || FUSSBALLDE_TEAM_ID, daten.von, daten.bis, daten.verein);
  Logger.log(spiele.length + ' Spiele auf fussball.de gefunden:');
  spiele.forEach(s => Logger.log(s.datum + ' ' + s.zeit + '  ' + s.heim + ' – ' + s.gast + '  (' + s.wettbewerb + ')' + (s.abgesetzt ? '  ABGESETZT' : '')));
}

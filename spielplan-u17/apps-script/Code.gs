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
        spiele[i] = pruefen(req.spiel);
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

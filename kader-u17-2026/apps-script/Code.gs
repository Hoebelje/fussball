/**
 * Speichert den verschlüsselten Kader (kader.enc.json) im GitHub-Repo.
 * Das Skript sieht nie die Klardaten: die Verschlüsselung passiert im Browser.
 * Script-Eigenschaften (Projekteinstellungen): KADER_PASSWORT, GITHUB_TOKEN
 */
var REPO = 'Hoebelje/fussball';
var PFAD = 'kader-u17-2026/kader.enc.json';
var BRANCH = 'main';
var MAX_FEHLVERSUCHE = 10;
var SPERRE_SEKUNDEN = 900;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var cache = CacheService.getScriptCache();
    if (Number(cache.get('fehler') || 0) >= MAX_FEHLVERSUCHE) return antwort_({ok: false, fehler: 'Zu viele Fehlversuche. Bitte 15 Minuten warten.'});
    var p = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    if (!p.passwort || p.passwort !== props.getProperty('KADER_PASSWORT')) {
      cache.put('fehler', String(Number(cache.get('fehler') || 0) + 1), SPERRE_SEKUNDEN);
      return antwort_({ok: false, fehler: 'Falsches Passwort.'});
    }
    var d = p.daten;
    if (!d || d.v !== 1 || !d.salt || !d.iv || !d.ct) return antwort_({ok: false, fehler: 'Ungültige Daten.'});
    var neu = p.neues_passwort;
    if (neu && String(neu).length < 8) return antwort_({ok: false, fehler: 'Neues Passwort zu kurz.'});
    schreiben_(JSON.stringify(d), props.getProperty('GITHUB_TOKEN'));
    if (neu) props.setProperty('KADER_PASSWORT', String(neu));
    cache.remove('fehler');
    return antwort_({ok: true});
  } catch (err) {
    return antwort_({ok: false, fehler: String(err.message || err)});
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function schreiben_(inhalt, token) {
  var url = 'https://api.github.com/repos/' + REPO + '/contents/' + PFAD;
  var kopf = {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  var alt = UrlFetchApp.fetch(url + '?ref=' + BRANCH, {headers: kopf, muteHttpExceptions: true});
  var sha = alt.getResponseCode() === 200 ? JSON.parse(alt.getContentText()).sha : undefined;
  var r = UrlFetchApp.fetch(url, {
    method: 'put', headers: kopf, contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({message: 'Kader aktualisiert (Bearbeiten-Seite)', content: Utilities.base64Encode(inhalt, Utilities.Charset.UTF_8), branch: BRANCH, sha: sha})
  });
  if (r.getResponseCode() >= 300) throw new Error('GitHub: ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 200));
}

function antwort_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ===================== LernHub – Abgleich zwischen Geräten (manuell) =====================
// Abgleich-Datei: Ein Gerät speichert seinen Stand, das andere öffnet ihn und führt zusammen; danach dort
// gleich wieder eine Datei erstellen und zurückschicken, dann haben beide alles. Logik: sync-merge.js.
// Handy-App ↔ Laptop im WLAN: syncWithLaptop() macht beide Richtungen auf einmal.
(() => {
'use strict';
const LH = window.LH, { esc } = LH, M = window.LHMerge;
const S = () => LH.S;

let DEVICE = null;
async function deviceId() {
  if (DEVICE) return DEVICE;
  if (LH.IS_DESKTOP) DEVICE = (await LH.API.store.info()).deviceId;
  if (!DEVICE) { try { DEVICE = localStorage.getItem('lh_device'); } catch {} }
  if (!DEVICE) { DEVICE = LH.uid('dev'); try { localStorage.setItem('lh_device', DEVICE); } catch {} }
  return DEVICE;
}
const deviceLabel = () => LH.IS_DESKTOP ? 'Laptop' : 'Handy';
const myName = () => LH.userName() ? `${LH.userName()} (${deviceLabel()})` : deviceLabel();
const summary = (before, after) => {
  const d = (after.studySec || 0) - (before.studySec || 0), x = (after.xp || 0) - (before.xp || 0);
  return [d >= 60 && `+${Math.round(d / 60)} min Lernzeit`, x > 0 && `+${x} XP`].filter(Boolean).join(' · ') || 'Alles auf dem gleichen Stand';
};
function take(next) { LH.adopt(next, true); LH.save(true); }

async function saveFile(name, data, title) {
  const text = JSON.stringify(data);
  if (LH.API?.files?.saveText) return LH.API.files.saveText({ name, text, title });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return name;
}
const stamp = () => new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', '-');

async function exportFile() {
  const me = await deviceId();
  S().savedAt = Date.now();
  const file = M.makeExport(S(), me, LH.uid('e'), myName());
  LH.save(true);
  const p = await saveFile(`LernHub-Abgleich ${myName()} ${stamp()}.json`, file, 'Abgleich-Datei speichern');
  if (p) LH.toast('SYNC', 'Abgleich-Datei gespeichert', 'Auf dem anderen Gerät öffnen: Optionen → Abgleich → Datei öffnen');
}

async function importFile(file) {
  const me = await deviceId(), before = M.snapshot(S());
  let next;
  try {
    if (file.size > 30e6) throw new Error('Datei ist zu groß');
    let f; try { f = JSON.parse(await file.text()); } catch { throw new Error('Das ist keine LernHub-Abgleich-Datei'); }
    next = M.importExport(S(), me, f);
  } catch (e) { return LH.toast('SYNC', 'Abgleich nicht möglich', e.message); }
  take(next);
  LH.toast('SYNC', 'Zusammengeführt', summary(before, next));
  if (await LH.confirmModal({ title: 'Auch das andere Gerät aktualisieren?', detail: 'Dieses Gerät hat jetzt alles. Speichere eine Abgleich-Datei und öffne sie auf dem anderen Gerät, dann haben beide denselben Stand.', ok: 'Datei für das andere Gerät speichern' })) exportFile();
}

// Handy-App ↔ Laptop im selben WLAN (Laptop: Optionen → „Im WLAN fürs Handy freigeben“)
async function syncWithLaptop(url) {
  const u = new URL(url), key = u.searchParams.get('k'), api = `${u.origin}/api/state`;
  const me = await deviceId(), before = M.snapshot(S());
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(api, { headers: { 'x-lh-key': key } });
    if (r.status === 401) throw new Error('Schlüssel falsch – QR-Code neu scannen');
    if (!r.ok) throw new Error(`Laptop antwortet nicht (${r.status})`);
    const peer = r.headers.get('x-lh-device') || 'laptop', remote = await r.json();
    const merged = M.syncMerge(M.baseFor(S(), peer, null), S(), remote);
    merged.savedAt = Date.now();
    const id = LH.uid('w'), snap = M.snapshot(merged), now = new Date().toISOString();
    const forLaptop = { ...snap, rev: remote.rev, syncBases: { ...(remote.syncBases || {}), ['in:' + me]: { id, snap } }, syncPeers: { ...(remote.syncPeers || {}), [me]: { name: myName(), at: now } } };
    const put = await fetch(api, { method: 'PUT', headers: { 'x-lh-key': key, 'content-type': 'application/json' }, body: JSON.stringify(forLaptop) });
    if (put.status === 409) continue; // Laptop hat gerade gespeichert → nochmal
    if (!put.ok) throw new Error(`Speichern am Laptop fehlgeschlagen (${put.status})`);
    take({ ...merged, rev: S().rev, syncBases: { ...(S().syncBases || {}), ['in:' + peer]: { id, snap } }, syncPeers: { ...(S().syncPeers || {}), [peer]: { name: 'Laptop', at: now } } });
    return summary(before, merged);
  }
  throw new Error('Laptop ändert gerade ständig Daten – gleich nochmal probieren');
}

// Bereich in den Optionen
function box() {
  const list = Object.values(S().syncPeers || {}).sort((a, b) => b.at.localeCompare(a.at));
  return `<p class="muted" style="font-size:13px;margin-bottom:10px">Bringt Laptop und Handy auf denselben Stand: Lernzeit, XP, Münzen und alle Zähler werden zusammengezählt, neue Fächer, Karten, Tests, HÜs und Noten von beiden Seiten übernommen, Gelöschtes bleibt gelöscht.</p>
    ${list.length ? `<p class="muted" style="font-size:12.5px;margin-bottom:10px">Zuletzt abgeglichen: ${list.slice(0, 3).map(p => `${esc(p.name)} (${new Date(p.at).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' })})`).join(' · ')}</p>` : ''}
    <div class="row"><button class="btn sm primary" data-sync="export">Abgleich-Datei erstellen</button><button class="btn sm" data-sync="import">Datei öffnen</button><input type="file" id="sync-in" accept=".json,application/json" hidden></div>
    <p class="muted" style="font-size:12.5px;margin-top:8px">So geht’s: Datei erstellen → per WhatsApp, Teams, AirDrop oder USB aufs andere Gerät → dort „Datei öffnen“ → dort gleich wieder eine Datei erstellen und hier öffnen.</p>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sync]'); if (!b) return;
  if (b.dataset.sync === 'export') exportFile();
  if (b.dataset.sync === 'import') document.getElementById('sync-in')?.click();
});
document.addEventListener('change', e => {
  if (e.target.id !== 'sync-in') return;
  const f = e.target.files[0]; e.target.value = '';
  if (f) { e.target.closest('.modal-bg')?.close?.(); importFile(f); }
});

LH.abgleich = { box, exportFile, importFile, syncWithLaptop, deviceId };
})();

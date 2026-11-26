// ===================== LernHub – Handy-Unterbau =====================
// Am Laptop stellt Electron window.lernhub bereit (Speichern, KI, Dateien, WebUntis). Läuft LernHub ohne
// Laptop – als Web-App oder Android-App –, liefert diese Datei dieselbe Schnittstelle direkt im Handy:
// Daten in IndexedDB, KI direkt bei Google/Anthropic, Lernzettel-Dateien im Handy, PDFs über pdf.js.
(() => {
'use strict';
if (window.lernhub) return; // Electron oder Handy-über-WLAN (bridge.js) ist schon da

// ---------- IndexedDB ----------
let dbp = null;
const db = () => dbp ||= new Promise((res, rej) => {
  const r = indexedDB.open('lernhub', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('files'); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = async (store, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(store, mode), q = fn(t.objectStore(store)); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
const get = (store, k) => tx(store, 'readonly', s => s.get(k));
const put = (store, k, v) => tx(store, 'readwrite', s => s.put(v, k));

// ---------- KI ----------
const KEY = 'lh_aikey';
const readKey = () => { try { return localStorage.getItem(KEY) || null; } catch { return null; } };
const AI = window.LHAI.createAI({ getKey: readKey, platform: 'mobile' });
const wrap = async fn => { try { return await fn(); } catch (e) { return { ok: false, error: e.message === 'no-key' ? 'Kein API-Key – Optionen → JARVIS' : String(e.message || e) }; } };

// ---------- Dateien lesen ----------
const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Konnte ' + src + ' nicht laden')); document.head.append(s); });

// pdf.js: Text auslesen und Seiten anzeigen (Handy-Browser haben keinen eingebauten PDF-Viewer in der Seite)
let pdfjs = null;
async function pdfLib() {
  if (pdfjs) return pdfjs;
  pdfjs = await import(new URL('vendor/pdfjs/pdf.min.mjs', location.href).href);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', location.href).href;
  return pdfjs;
}
async function pdfText(buf) {
  const lib = await pdfLib(), doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise, out = [];
  for (let p = 1; p <= Math.min(doc.numPages, 200); p++) {
    const items = (await (await doc.getPage(p)).getTextContent()).items;
    let line = '';
    for (const it of items) { line += it.str; if (it.hasEOL) { out.push(line); line = ''; } }
    if (line) out.push(line);
  }
  return out.join('\n');
}
// Seiten als Bilder untereinander, erst wenn sie ins Bild scrollen
async function pdfRender(box, buf) {
  const lib = await pdfLib(), doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  box.innerHTML = '';
  const io = new IntersectionObserver(es => es.forEach(async e => {
    if (!e.isIntersecting || e.target.dataset.done) return;
    e.target.dataset.done = 1; io.unobserve(e.target);
    const page = await doc.getPage(+e.target.dataset.p), w = box.clientWidth || 360, v0 = page.getViewport({ scale: 1 });
    const scale = w / v0.width * Math.min(2, devicePixelRatio || 1), vp = page.getViewport({ scale });
    const c = e.target; c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  }), { rootMargin: '600px' });
  for (let p = 1; p <= doc.numPages; p++) {
    const v = (await doc.getPage(p)).getViewport({ scale: 1 }), c = document.createElement('canvas');
    c.className = 'pdf-page'; c.dataset.p = p; c.style.aspectRatio = `${v.width} / ${v.height}`;
    box.append(c); io.observe(c);
  }
}
window.LHPdf = { render: pdfRender, text: pdfText };

async function extract(blob, fileName) {
  const ext = (fileName.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase(), name = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  if (['txt', 'md', 'csv'].includes(ext)) return { name, kind: 'text', text: await blob.text() };
  if (['html', 'htm'].includes(ext)) return { name, kind: 'text', text: new DOMParser().parseFromString(await blob.text(), 'text/html').body.innerText };
  if (ext === 'docx') { if (!window.mammoth) await loadScript('vendor/mammoth.browser.min.js'); return { name, kind: 'text', text: (await window.mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() })).value }; }
  const buf = await blob.arrayBuffer();
  if (ext === 'pdf') { let text = ''; try { text = await pdfText(buf); } catch {} return { name, kind: 'pdf', text, base64: b64(buf), mime: MIME.pdf, data: buf }; }
  if (MIME[ext]) return { name, kind: 'image', base64: b64(buf), mime: MIME[ext], data: buf };
  throw new Error(`Dateityp .${ext} wird nicht unterstützt`);
}
async function topicsFor(doc, subjectName) {
  if (readKey()) {
    try { return { mode: 'ai', topics: await AI.generateCards(doc, subjectName) }; }
    catch (e) { if (doc.kind === 'image') throw e; return { mode: 'offline', warning: e.message, topics: [window.LH.heuristic(doc.name, doc.text || '')] }; }
  }
  if (doc.kind === 'image') throw new Error('Fotos brauchen einen API-Key (Optionen → JARVIS)');
  return { mode: 'offline', topics: [window.LH.heuristic(doc.name, doc.text || '')] };
}
// WebUntis nur in der Android-App: dort laufen Anfragen über natives HTTP (im Browser blockt CORS)
const NATIVE = !!window.Capacitor?.isNativePlatform?.();
const UKEY = 'lh_untis';
const ucreds = () => { try { return JSON.parse(localStorage.getItem(UKEY) || 'null'); } catch { return null; } };
const untis = NATIVE && window.LHUntis ? {
  info: async () => { const c = ucreds(); return c && { server: c.server, school: c.school, user: c.user, mode: c.secret ? 'secret' : 'password' }; },
  async connect({ address, user, password, secret }) {
    const U = window.LHUntis, a = U.parseAddress(address);
    if (a?.server && !a.school) a.school = await U.schoolOf(a.server);
    if (!a?.server || !a.school) return { error: 'Adresse nicht erkannt – kopier die Adresse der WebUntis-Login-Seite aus dem Browser' };
    const c = { server: a.server, school: a.school, user: String(user || a.user || '').trim(), ...(a.secret || secret ? { secret: a.secret || String(secret).trim() } : { password: String(password || '') }) };
    try { const r = await U.fetchExams(c); localStorage.setItem(UKEY, JSON.stringify(c)); return { ok: true, ...r }; } catch (e) { return { error: String(e.message || e) }; }
  },
  disconnect: async () => { localStorage.removeItem(UKEY); return true; },
  async fetch() { const c = ucreds(); if (!c) return { error: 'Nicht verbunden' }; try { return { ok: true, ...(await window.LHUntis.fetchExams(c)) }; } catch (e) { return { error: String(e.message || e) }; } }
} : undefined;

// Android-App: Datei über das Teilen-Menü weitergeben (WebView kann weder herunterladen noch navigator.share mit Dateien)
async function nativeShare(name, text) {
  const { Filesystem, Share } = window.Capacitor.Plugins;
  const safe = name.replace(/[\\/:*?"<>|]/g, '-');
  const { uri } = await Filesystem.writeFile({ path: safe, data: text, directory: 'CACHE', encoding: 'utf8' });
  try { await Share.share({ title: safe, files: [uri] }); } catch (e) { if (/cancel/i.test(e.message || '')) return null; throw e; }
  return safe;
}

const fileOf = async stored => { const id = String(stored || '').replace(/^idb:/, ''); return id && get('files', id); };

window.lernhub = {
  isMobile: true,
  isNative: NATIVE,
  untis,
  store: {
    async load() {
      let s = await get('kv', 'state').catch(() => null);
      if (!s) { try { s = JSON.parse(localStorage.getItem('lernhub2') || 'null'); } catch {} } // alte Vorschau-Daten übernehmen
      return s;
    },
    async save(data) { const rev = (data.rev || 0) + 1; await put('kv', 'state', { ...data, rev }); return { ok: true, rev }; },
    info: async () => ({ version: window.LH_VERSION || '', dataDir: 'Auf diesem Handy (im Browser-Speicher der App)' }),
    set: async () => true
  },
  jarvis: {
    hasKey: async () => !!readKey(),
    setKey: async k => { try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY); } catch {} return true; },
    chat: p => wrap(() => AI.chat(p, (n, i) => window.LH.jarvis.appTool(n, i))),
    run: async () => ({ ok: false, error: 'Das geht nur am Laptop' }),
    onPTT() {}, onEvent() {}
  },
  ai: {
    grade: p => wrap(() => AI.grade(p)),
    async exam(p) {
      if (p.action === 'grade') return wrap(() => AI.gradeExam(p));
      return wrap(async () => {
        const parts = [];
        for (const t of (p.topics || []).slice(0, 30)) {
          const f = await fileOf(t.stored).catch(() => null);
          let text = ''; if (f) { try { text = (await extract(f.blob, f.name)).text || ''; } catch {} }
          parts.push(`## ${t.name}\n${(t.summary || []).join('\n')}\n${(t.cards || []).map(c => `${c.q} → ${c.a}`).join('\n')}\n${text.slice(0, 12000)}`);
        }
        const material = parts.join('\n\n').slice(0, 60000);
        if (p.action === 'formulas') return AI.extractFormulas({ subjectName: p.subjectName, material });
        if (p.action === 'feynman') return AI.checkExplain({ subjectName: p.subjectName, topicName: p.topics?.[0]?.name || '', material, answer: p.answer });
        return AI.makeExam({ subjectName: p.subjectName, material, n: p.n });
      });
    }
  },
  files: {
    // Dateien aus dem Datei-Dialog: im Handy speichern, lesen, Karten bauen
    async importFiles({ files, subjectName }) {
      const out = [];
      for (const file of files) {
        try {
          if (file.size > 40e6) throw new Error('Datei ist größer als 40 MB');
          const id = 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
          await put('files', id, { name: file.name, type: file.type, blob: file });
          const doc = await extract(file, file.name);
          out.push({ file: file.name, stored: 'idb:' + id, ...(await topicsFor(doc, subjectName)) });
        } catch (e) { out.push({ file: file.name, error: String(e.message || e) }); }
      }
      return out;
    },
    async importText({ text, name, subjectName }) {
      try { return { file: name, ...(await topicsFor({ name, kind: 'text', text }, subjectName)) }; }
      catch (e) { return { file: name, error: String(e.message || e) }; }
    },
    // HTML-Lernzettel im Original: App → Datei ins Handy schreiben und über den App-Server laden;
    // Web-App → der Service Worker liefert /zettel/<id> aus IndexedDB (siehe tools/build-web.js)
    async viewUrl(stored) {
      const id = String(stored || '').replace(/^idb:/, ''), f = await fileOf(stored).catch(() => null);
      if (!f || !/\.html?$/i.test(f.name)) return null;
      if (NATIVE) {
        const { Filesystem } = window.Capacitor.Plugins;
        const { uri } = await Filesystem.writeFile({ path: `zettel/${id}.html`, data: await f.blob.text(), directory: 'DATA', encoding: 'utf8', recursive: true });
        return window.Capacitor.convertFileSrc(uri);
      }
      return navigator.serviceWorker?.controller ? `zettel/${encodeURIComponent(id)}` : null;
    },
    // Vokabellisten am Handy: Dateien aus dem Datei-Dialog oder eingefügter Text
    async importVocab({ files, text, name }) {
      const one = async doc => {
        let aiError;
        if (readKey()) { try { const r = await AI.extractVocab(doc); if (r.words.length) return { mode: 'ai', ...r }; } catch (e) { if (doc.kind === 'image') throw e; aiError = String(e.message || e); } }
        else if (doc.kind === 'image') throw new Error('Fotos brauchen einen API-Key (Optionen → JARVIS)');
        return { mode: 'offline', aiError, lang: '', words: window.LHAI.parseVocabText(doc.text) };
      };
      if (text != null) { try { return [{ file: name, ...(await one({ name, kind: 'text', text })) }]; } catch (e) { return [{ file: name, error: String(e.message || e) }]; } }
      const out = [];
      for (const file of files || []) {
        try {
          const id = 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
          await put('files', id, { name: file.name, type: file.type, blob: file });
          out.push({ file: file.name, stored: 'idb:' + id, ...(await one(await extract(file, file.name))) });
        } catch (e) { out.push({ file: file.name, error: String(e.message || e) }); }
      }
      return out;
    },
    async regenerate({ stored, subjectName }) {
      const f = await fileOf(stored).catch(() => null); if (!f) return { error: 'Die Datei liegt nicht auf diesem Gerät' };
      try { return { file: f.name, stored, ...(await topicsFor(await extract(f.blob, f.name), subjectName)) }; } catch (e) { return { error: String(e.message || e) }; }
    },
    async read(stored) {
      const f = await fileOf(stored).catch(() => null);
      if (!f) return { error: 'Die Datei liegt nicht auf diesem Gerät (beim Abgleich werden nur Karten übertragen)' };
      try { return await extract(f.blob, f.name); } catch (e) { return { error: String(e.message || e) }; }
    },
    async open(stored) {
      const f = await fileOf(stored).catch(() => null); if (!f) return 'Datei nicht gefunden';
      const url = URL.createObjectURL(f.blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000);
      return '';
    },
    // Teilen-Menü des Handys (WhatsApp, Teams, AirDrop …), sonst Download
    async saveText({ name, text }) {
      if (NATIVE) return nativeShare(name, text);
      const file = new File([text], name, { type: /.ics$/i.test(name) ? 'text/calendar' : 'application/json' });
      if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return name; } catch (e) { if (e.name === 'AbortError') return null; } }
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      return name;
    }
  }
};
})();

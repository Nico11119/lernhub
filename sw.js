// Offline-Speicher der LernHub-Web-App (automatisch erzeugt von tools/build-web.js)
const CACHE = "lernhub-2.5.2-55d20710";
const FILES = ["./","abgleich.js","ai-core.js","app.js","bridge.js","extras.js","fonts/bricolage-grotesque-latin-ext-wght-normal.woff2","fonts/bricolage-grotesque-latin-wght-normal.woff2","fonts/jetbrains-mono-latin-wght-normal.woff2","games.js","games2.js","icon.png","jarvis.js","manifest.webmanifest","mobile-api.js","modes.js","qrcode.js","school.js","starter.js","styles.css","sync-merge.js","timetable.js","untis-core.js","vendor/mammoth.browser.min.js","vendor/pdfjs/pdf.min.mjs","vendor/pdfjs/pdf.worker.min.mjs","vocab.js"];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// HTML-Lernzettel aus dem Handy-Speicher (IndexedDB) mit eigener CSP ausliefern – die App zeigt ihn im sandbox-iframe
function zettel(id) {
  return new Promise((res, rej) => { const r = indexedDB.open('lernhub', 1); r.onsuccess = () => { const q = r.result.transaction('files').objectStore('files').get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }; r.onerror = () => rej(r.error); })
    .then(f => f ? new Response(f.blob, { headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'" } }) : new Response('Nicht gefunden', { status: 404 }));
}
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // KI, Wetter usw. immer übers Netz
  const z = u.pathname.match(/\/zettel\/([^/]+)$/);
  if (z) return e.respondWith(zettel(decodeURIComponent(z[1])));
  // Seite selbst: erst Netz (für Updates), offline aus dem Speicher; alles andere: erst Speicher
  if (e.request.mode === 'navigate') e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./', c)); return r; }).catch(() => caches.match('./')));
  else e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});

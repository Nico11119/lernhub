// Offline-Speicher der LernHub-Web-App (automatisch erzeugt von tools/build-web.js)
const CACHE = "lernhub-2.4.0-232698f4";
const FILES = ["./","abgleich.js","ai-core.js","app.js","bridge.js","extras.js","fonts/bricolage-grotesque-latin-ext-wght-normal.woff2","fonts/bricolage-grotesque-latin-wght-normal.woff2","fonts/jetbrains-mono-latin-wght-normal.woff2","games.js","games2.js","icon.png","jarvis.js","manifest.webmanifest","mobile-api.js","modes.js","qrcode.js","school.js","starter.js","styles.css","sync-merge.js","untis-core.js","vendor/mammoth.browser.min.js","vendor/pdfjs/pdf.min.mjs","vendor/pdfjs/pdf.worker.min.mjs"];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // KI, Wetter usw. immer übers Netz
  // Seite selbst: erst Netz (für Updates), offline aus dem Speicher; alles andere: erst Speicher
  if (e.request.mode === 'navigate') e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./', c)); return r; }).catch(() => caches.match('./')));
  else e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});

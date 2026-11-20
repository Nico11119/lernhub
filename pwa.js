// Web-App: Offline-Speicher anmelden, Daten vor dem Aufräumen des Browsers schützen
window.LH_VERSION = "2.4.0";
// In der Android-App liegen die Dateien schon im Handy – dort kein Offline-Speicher (würde Updates der App verdecken)
if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.() && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  let reloaded = false;
  navigator.serviceWorker.register('sw.js').then(reg => reg.addEventListener('updatefound', () => {
    const w = reg.installing; if (!navigator.serviceWorker.controller) return; // erste Installation
    w?.addEventListener('statechange', () => { if (w.state === 'activated' && !reloaded) window.LH?.toast('NEU', 'LernHub wurde aktualisiert', 'Beim nächsten Öffnen ist die neue Version da'); });
  })).catch(() => {});
}
navigator.storage?.persist?.().catch(() => {});

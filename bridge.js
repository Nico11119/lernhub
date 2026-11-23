// Verbindung fürs Handy: Wird LernHub über den WLAN-Server des Laptops geöffnet,
// liest und speichert die Oberfläche über diese Schnittstelle statt lokal.
(() => {
  if (window.lernhub) return;
  if (!/^https?:$/.test(location.protocol) || location.port !== '4747') return;
  const u = new URL(location.href);
  let k = u.searchParams.get('k');
  try { if (k) { localStorage.setItem('lh_key', k); history.replaceState(null, '', location.pathname); } else k = localStorage.getItem('lh_key'); } catch {}
  if (!k) return;
  const api = (method, body) => fetch('/api/state', { method, headers: { 'x-lh-key': k, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  window.lernhub = {
    isRemote: true,
    store: {
      load: async () => { const r = await api('GET'); if (!r.ok) throw new Error('Keine Verbindung zum Laptop'); return r.json(); },
      save: async data => (await api('PUT', data)).json()
    }
  };
  // Änderungen vom Laptop regelmäßig holen
  setInterval(async () => {
    if (document.visibilityState !== 'visible' || !window.LH?.S) return;
    try { const d = await (await api('GET')).json(); if (d && (d.rev || 0) > (window.LH.S.rev || 0)) window.LH.adopt(d, true); } catch {}
  }, 8000);
})();

// Mini-Widget: liest nur die gespeicherten Daten (kein eigener Zustand), aktualisiert sich bei jeder Speicherung und jede Minute
'use strict';
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = n => `${Math.floor(n / 100)}:${pad(n % 100)}`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let S = null;

function lessonLine() {
  const ls = (S.timetable?.lessons || []).filter(l => l.c !== 'cancelled');
  const now = new Date(), k = dkey(now), t = now.getHours() * 100 + now.getMinutes();
  const cur = ls.find(l => l.d === k && l.s <= t && l.e > t);
  if (cur) { $('l1').textContent = 'Jetzt'; return `<b>${esc(cur.su)}</b> ${esc(cur.ro || '')} <span class="mono">bis ${hm(cur.e)}</span>`; }
  const next = ls.filter(l => l.d > k || (l.d === k && l.s > t)).sort((a, b) => a.d.localeCompare(b.d) || a.s - b.s)[0];
  $('l1').textContent = 'Nächste';
  if (!next) return S.timetable ? 'Keine Stunden eingetragen' : 'WebUntis nicht verbunden';
  const day = next.d === k ? '' : next.d === dkey(new Date(now.getTime() + 864e5)) ? 'morgen ' : new Date(next.d).toLocaleDateString('de-AT', { weekday: 'short' }) + ' ';
  return `<b>${esc(next.su)}</b> ${esc(next.ro || '')} <span class="mono">${day}${hm(next.s)}</span>`;
}
function testLine() {
  const k = dkey(), subj = id => (S.subjects || []).find(s => s.id === id);
  const t = (S.tests || []).filter(x => x.date >= k && subj(x.subjectId)).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!t) return 'Kein Test geplant';
  const d = Math.round((new Date(t.date) - new Date(k)) / 864e5);
  return `<b class="${d <= 2 ? 'bad' : ''}">${d === 0 ? 'heute' : d === 1 ? 'morgen' : `in ${d} T`}</b> ${esc(subj(t.subjectId).name)}`;
}
function draw() {
  if (!S) return;
  const th = S.settings?.theme; document.documentElement.dataset.theme = th === 'light' || th === 'dark' ? th : '';
  $('lesson').innerHTML = lessonLine();
  $('test').innerHTML = testLine();
  const m = S.history?.[dkey()] || 0, goal = Math.max(5, Math.round((S.settings?.weekGoal || 150) / 7));
  $('mins').textContent = `${m} von ${goal} min gelernt`;
  $('bar').style.width = Math.min(100, m / goal * 100) + '%';
  $('clock').textContent = new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}
async function load() { try { S = await window.widget.load(); } catch {} draw(); }
$('x').onclick = () => window.widget.close();
$('open').onclick = () => window.widget.open();
window.widget.onRefresh(load);
load();
setInterval(draw, 30000);

// ===================== LernHub – Stundenplan (aus WebUntis) =====================
// S.timetable = { fetched, grid: [{n, s, e}], lessons: [{d, s, e, su, sl, ro, rl, te, c, t}] }  (s/e = 745 → 7:45)
(() => {
'use strict';
const LH = window.LH, { $, esc } = LH;
const S = () => LH.S;
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const hm = n => `${Math.floor(n / 100)}:${String(n % 100).padStart(2, '0')}`;
const tt = () => S().timetable;
const lessonsOn = k => (tt()?.lessons || []).filter(l => l.d === k);
const period = l => tt()?.grid?.find(g => g.s === l.s)?.n || '';
// LernHub-Fach zur Stunde (Farbe, Tests)
const subjOf = l => S().subjects.find(s => s.untis && s.untis === l.su) || S().subjects.find(s => LH.norm(s.name) === LH.norm(l.sl) || LH.norm(s.name) === LH.norm(l.su));
const testOn = (l, k) => { const s = subjOf(l); return s && S().tests.find(t => t.date === k && t.subjectId === s.id); };
const monday = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
// Wochenende → schon die nächste Woche zeigen
const thisWeek = () => { const d = new Date(); return monday([0, 6].includes(d.getDay()) ? LH.addDays(d, 2) : d); };

// „Morgen entfällt die 1.–2. Stunde (AM). 5. Stunde: Chemie statt geplant.“
function changesText(k) {
  const ls = lessonsOn(k).filter(l => l.c), out = [];
  const groups = [];
  // aufeinanderfolgende Stunden zusammenfassen (Doppelstunde: „1.–2. Stunde“), auch über eine Pause hinweg
  for (const l of ls) { const g = groups.at(-1); if (g && g.c === l.c && g.su === l.su && +g.p2 + 1 === +period(l)) { g.end = l.e; g.p2 = period(l); } else groups.push({ c: l.c, su: l.su, sl: l.sl, start: l.s, end: l.e, p1: period(l), p2: period(l), t: l.t }); }
  for (const g of groups) {
    const p = g.p1 && g.p2 && g.p1 !== g.p2 ? `${g.p1}.–${g.p2}. Stunde` : g.p1 ? `${g.p1}. Stunde` : hm(g.start);
    out.push(g.c === 'cancelled' ? `${p} ${g.sl || g.su} entfällt` : `${p}: ${g.sl || g.su} geändert${g.t ? ` (${g.t})` : ''}`);
  }
  return out;
}

function cell(l, k) {
  const s = subjOf(l), test = testOn(l, k);
  return `<div class="tt-l ${l.c}" style="--accent:${s?.color || 'var(--ink-3)'}" title="${esc(l.sl || l.su)}${l.rl ? ' · ' + esc(l.rl) : ''}${l.te ? ' · ' + esc(l.te) : ''}${l.t ? ' · ' + esc(l.t) : ''}">
    <b>${esc(l.su)}</b><small>${esc(l.ro || '')}</small>${l.c === 'cancelled' ? '<em>Entfall</em>' : l.c === 'irregular' ? '<em>Änderung</em>' : ''}${test ? `<em class="tt-test">${esc(test.title)}</em>` : ''}</div>`;
}

LH.VIEWS.timetable = {
  html({ week } = {}) {
    const t = tt();
    if (!t?.lessons?.length) return `<div class="eyebrow">Stundenplan</div><h1 class="h1">Stundenplan</h1>
      <div class="panel empty"><b>Noch kein Stundenplan</b>${LH.API?.untis ? 'Verbinde WebUntis unter Optionen → WebUntis, dann erscheint hier deine Woche.' : 'Der Stundenplan kommt von WebUntis am Laptop oder in der Android-App. Hier erscheint er nach dem Abgleich (Optionen → Abgleich).'}</div>`;
    const mon = week ? LH.parseKey(week) : thisWeek(), days = DAYS.map((n, i) => ({ n, k: LH.dkey(LH.addDays(mon, i)) }));
    const today = LH.dkey(), weekLs = t.lessons.filter(l => days.some(d => d.k === l.d));
    const first = LH.dkey(monday(LH.parseKey(t.lessons[0].d))), last = t.lessons.at(-1).d;
    const prev = LH.dkey(LH.addDays(mon, -7)), next = LH.dkey(LH.addDays(mon, 7));
    // nur die Stunden zeigen, die in der Woche vorkommen (von der ersten bis zur letzten)
    const used = t.grid.filter(g => weekLs.some(l => l.s === g.s));
    const rows = used.length ? t.grid.filter(g => g.s >= used[0].s && g.s <= used.at(-1).s) : [];
    const range = `${LH.parseKey(days[0].k).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })} – ${LH.parseKey(days[4].k).toLocaleDateString('de-AT', { day: 'numeric', month: 'short' })}`;
    const nav = `<div class="row tt-nav"><button class="btn sm ghost" data-tt="${prev}" ${prev < first ? 'disabled' : ''} aria-label="Woche davor">←</button><b>${range}</b><button class="btn sm ghost" data-tt="${next}" ${next > last ? 'disabled' : ''} aria-label="Woche danach">→</button>${LH.dkey(mon) !== LH.dkey(thisWeek()) ? '<button class="btn sm" data-tt="">Diese Woche</button>' : ''}</div>`;
    const changes = days.filter(d => d.k >= today).map(d => ({ d, c: changesText(d.k) })).filter(x => x.c.length);
    return `<div class="page-head"><div><div class="eyebrow">Stundenplan</div><h1 class="h1">Deine Woche</h1></div>${nav}</div>
      ${changes.length ? `<div class="panel pad tt-changes"><b>Änderungen</b>${changes.map(x => `<div><span class="mono">${x.d.n}</span> ${esc(x.c.join(' · '))}</div>`).join('')}</div>` : ''}
      ${weekLs.length ? `<div class="tt-grid" style="--rows:${rows.length}">
        <div class="tt-h"></div>${days.map(d => `<div class="tt-h ${d.k === today ? 'today' : ''}">${d.n} <span class="muted">${LH.parseKey(d.k).getDate()}.</span></div>`).join('')}
        ${rows.map(g => `<div class="tt-p"><b>${esc(g.n)}</b><small>${hm(g.s)}</small></div>${days.map(d => `<div class="tt-c ${d.k === today ? 'today' : ''}">${lessonsOn(d.k).filter(l => l.s === g.s).map(l => cell(l, d.k)).join('')}</div>`).join('')}`).join('')}
      </div>
      <div class="tt-days">${days.map(d => { const ls = lessonsOn(d.k); return `<div class="panel tt-day ${d.k === today ? 'today' : ''}"><b>${LH.parseKey(d.k).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'numeric' })}</b>${ls.length ? ls.map(l => `<div class="tt-row"><span class="mono muted">${esc(period(l))}</span>${cell(l, d.k)}<span class="mono muted">${hm(l.s)}</span></div>`).join('') : '<p class="muted">Kein Unterricht</p>'}</div>`; }).join('')}</div>`
      : '<div class="panel empty"><b>Kein Unterricht in dieser Woche</b>Ferien oder schulfrei.</div>'}
      <p class="muted" style="font-size:12.5px;margin-top:12px">Aus WebUntis, zuletzt geholt ${new Date(t.fetched).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' })}. Wird beim Start und alle 3 Stunden aktualisiert.</p>`;
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tt]'); if (!b) return;
  LH.go('timetable', b.dataset.tt ? { week: b.dataset.tt } : {});
});

// Startseite: heute (nach 15 Uhr: morgen) auf einen Blick
function homeCard() {
  const t = tt(); if (!t?.lessons?.length) return '';
  const now = new Date(), late = now.getHours() >= 15;
  let k = LH.dkey(late ? LH.addDays(now, 1) : now), label = late ? 'Morgen' : 'Heute';
  for (let i = 0; i < 4 && !lessonsOn(k).length; i++) { k = LH.dkey(LH.addDays(LH.parseKey(k), 1)); label = LH.fmtDay(k); }
  const ls = lessonsOn(k); if (!ls.length) return '';
  const nowHm = now.getHours() * 100 + now.getMinutes(), isToday = k === LH.dkey();
  const nextL = isToday ? ls.find(l => l.e > nowHm && l.c !== 'cancelled') : null, ch = changesText(k);
  return `<div class="panel pad tt-home"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>Stundenplan · ${esc(label)}</b><button class="btn sm ghost" data-go="timetable">Woche</button></div>
    ${nextL ? `<p style="margin-bottom:8px">${nextL.s <= nowHm ? 'Jetzt' : 'Als Nächstes'}: <b>${esc(nextL.sl || nextL.su)}</b> um ${hm(nextL.s)}${nextL.ro ? ` in ${esc(nextL.ro)}` : ''}</p>` : ''}
    ${ch.length ? `<p class="tt-alert">${esc(ch.join(' · '))}</p>` : ''}
    <div class="tt-strip">${ls.map(l => `<span class="tt-chip ${l.c} ${nextL === l ? 'now' : ''}" style="--accent:${subjOf(l)?.color || 'var(--ink-3)'}" title="${esc(l.sl)} ${hm(l.s)}–${hm(l.e)}"><small>${esc(period(l))}</small>${esc(l.su)}</span>`).join('')}</div></div>`;
}

// Abends Bescheid sagen, wenn morgen etwas entfällt oder sich ändert (einmal pro Tag)
function eveningNotice() {
  const now = new Date(); if (now.getHours() < 15 || !tt()) return;
  const today = LH.dkey(); if (S().settings.ttNotified === today) return;
  const k = LH.dkey(LH.addDays(now, 1)), ch = changesText(k);
  if (!ch.length) return;
  S().settings.ttNotified = today; LH.save();
  const msg = `Kurzer Hinweis für morgen: ${ch.join('. ')}.`;
  if (LH.jarvis?.reply) { LH.jarvis.open(true, true); LH.jarvis.reply(msg); } else LH.toast('PLAN', 'Morgen anders', ch.join(' · '));
}
LH.on('booted', () => setTimeout(eveningNotice, 6000));
setInterval(eveningNotice, 10 * 60e3);

LH.timetable = { homeCard, changesText, lessonsOn, eveningNotice };
})();

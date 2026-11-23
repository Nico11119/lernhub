// ===================== LernHub – Schule: Hausübungen & Noten =====================
(() => {
'use strict';
const LH = window.LH;
const { $, esc, uid } = LH;
const S = () => LH.S;
const TYPES = [['Schularbeit', 1], ['Test', 1], ['Mitarbeit', 0.25], ['HÜ', 0.2], ['Referat', 1], ['Projekt', 1]];
// Gewicht immer aus der Notenart, damit auch schon eingetragene Noten die aktuellen Gewichte bekommen
const wOf = g => TYPES.find(t => t[0] === g.type)?.[1] ?? g.weight;
const GRADES = [['1', 1], ['1-', 1.25], ['2+', 1.75], ['2', 2], ['2-', 2.25], ['3+', 2.75], ['3', 3], ['3-', 3.25], ['4+', 3.75], ['4', 4], ['4-', 4.25], ['5', 5]];

const openHw = () => S().homework.filter(h => !h.done).sort((a, b) => a.due.localeCompare(b.due));
const daysTo = k => Math.round((LH.parseKey(k) - LH.parseKey(LH.dkey())) / 864e5);
const dueText = k => { const d = daysTo(k); return d < 0 ? `${-d} T überfällig` : d === 0 ? 'heute fällig' : d === 1 ? 'morgen fällig' : `in ${d} Tagen`; };
const subjName = id => LH.subj(id)?.name || 'Allgemein';
const subjColor = id => LH.subj(id)?.color || 'var(--ink-3)';
function avg(list) {
  const w = list.reduce((a, g) => a + wOf(g), 0);
  return w ? list.reduce((a, g) => a + g.value * wOf(g), 0) / w : null;
}
const fmtAvg = v => v == null ? '–' : v.toFixed(2).replace('.', ',');
// Was reicht bei der nächsten Schularbeit für die nächstbessere Note?
function needed(list) {
  const a = avg(list), r = rnd(a); if (r <= 1) return '';
  const sw = wOf({ type: 'Schularbeit' }), w = list.reduce((s, g) => s + wOf(g), 0) + sw, sum = list.reduce((s, g) => s + g.value * wOf(g), 0);
  const ok = GRADES.filter(([, v]) => (sum + sw * v) / w < r - .5);
  return ok.length ? `Für einen ${r - 1}er reicht bei der nächsten Schularbeit ein ${ok[ok.length - 1][0]}.` : `Ein ${r - 1}er geht mit einer Schularbeit allein nicht mehr.`;
}
const rnd = a => Math.min(5, Math.floor(a + .5));
// SYT im Zeugnis: SYTB, SYTG und SYTE zählen je ein Drittel, ein Fünfer in einem Teil macht alles negativ.
// Teil = WebUntis-Kürzel oder Fachname (SYTB2, die Übung, zählt zu SYTB).
const SYT = [['B', 'Betriebssysteme'], ['G', 'Grundlagen der Informatik'], ['E', 'Elektrotechnik']];
function sytBlock() {
  const parts = SYT.map(([k, label]) => {
    const ids = S().subjects.filter(s => new RegExp(`^SYT${k}`, 'i').test(s.untis || s.name)).map(s => s.id);
    const a = avg(S().grades.filter(g => ids.includes(g.sid)));
    return { k, label, a, note: a == null ? null : rnd(a), has: ids.length };
  });
  if (!parts.some(p => p.has)) return '';
  const got = parts.filter(p => p.note != null);
  const neg = got.some(p => p.note === 5);
  const total = got.length ? (neg ? 5 : rnd(got.reduce((s, p) => s + p.note, 0) / got.length)) : null;
  return `<div class="panel gsub">
    <div class="row" style="justify-content:space-between"><b>SYT · Zeugnisnote</b><span class="mono gavg" style="${neg ? 'color:var(--bad)' : ''}">${total ?? '–'}</span></div>
    <div class="grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">${parts.map(p => `<div style="text-align:center"><small class="muted" style="display:block;font-size:11.5px" title="${esc(p.label)}">SYT${p.k}</small><b class="mono" style="font-size:20px;${p.note === 5 ? 'color:var(--bad)' : ''}">${p.note ?? '–'}</b><small class="muted" style="display:block;font-size:11px">${fmtAvg(p.a)}</small></div>`).join('')}</div>
    <small class="muted" style="display:block;margin-top:8px;font-size:12.5px">${!got.length ? 'Noch keine Noten in SYTB, SYTG oder SYTE.' : neg ? `Negativ, weil ${got.filter(p => p.note === 5).map(p => 'SYT' + p.k).join(' und ')} auf 5 steht – ein negativer Teil macht die ganze SYT-Note negativ.` : `Jeder Teil zählt ein Drittel${got.length < 3 ? ` (bisher ${got.length} von 3 Teilen benotet)` : ''}.`}</small></div>`;
}
// Notenwarnung: Fächer auf 4 oder 5, die schlechtesten zuerst
function atRisk() {
  return S().subjects.map(s => { const list = S().grades.filter(g => g.sid === s.id), a = avg(list); return a != null && rnd(a) >= 4 ? { s, a, note: rnd(a), tip: needed(list) } : null; })
    .filter(Boolean).sort((x, y) => y.a - x.a);
}
// Für JARVIS: Notenstand in einer Zeile
function gradeSummary() {
  const per = S().subjects.map(s => ({ s, a: avg(S().grades.filter(g => g.sid === s.id)) })).filter(x => x.a != null);
  return per.length ? 'Noten: ' + per.map(x => `${x.s.name} ${fmtAvg(x.a)} (${noteOf(x.a)})`).join(', ') + (atRisk().length ? `. Gefährdet: ${atRisk().map(x => x.s.name).join(', ')}` : '') : '';
}
const noteOf = v => v == null ? '' : v < 1.5 ? 'Sehr gut' : v < 2.5 ? 'Gut' : v < 3.5 ? 'Befriedigend' : v < 4.5 ? 'Genügend' : 'Nicht genügend';

function addHomework(title, sid, due) {
  const h = { id: uid('h'), title: title.trim(), sid: sid || null, due, done: false, created: LH.dkey() };
  S().homework.push(h); LH.save();
  return h;
}

LH.VIEWS.school = {
  html() {
    const hw = openHw(), done = S().homework.filter(h => h.done).slice(-6).reverse();
    const subs = S().subjects;
    const per = subs.map(s => ({ s, list: S().grades.filter(g => g.sid === s.id) })).filter(x => x.list.length);
    const all = per.map(x => avg(x.list)).filter(v => v != null);
    const overall = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
    const sel = `<select class="input" name="sid"><option value="">Allgemein</option>${subs.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>`;
    return `<div class="eyebrow">Schule</div><h1 class="h1">Hausübungen & Noten</h1>
      <p class="lede">${hw.length ? `${hw.length} offene HÜ${hw.length > 1 ? 's' : ''}${hw[0] ? `, die nächste ${dueText(hw[0].due)}` : ''}.` : 'Keine offenen Hausübungen.'}${overall ? ` Dein Schnitt: ${fmtAvg(overall)}.` : ''}</p>
      <div class="school">
        <div>
          <h2 class="h2" style="margin-top:22px">Hausübungen <span class="mono">${hw.length}</span></h2>
          <form class="panel form hw-form" id="hw-form">
            <div class="field"><label>Was?</label><input class="input" name="title" placeholder="z. B. Arbeitsblatt Funktionen S. 42" maxlength="90" required></div>
            <div class="row" style="flex-wrap:nowrap"><div class="field" style="flex:1"><label>Fach</label>${sel}</div><div class="field" style="flex:1"><label>Bis</label><input class="input" type="date" name="due" value="${LH.dkey(LH.addDays(new Date(), 2))}" required></div></div>
            <button class="btn primary">Eintragen</button>
          </form>
          <div class="hw-list">${hw.map(h => { const d = daysTo(h.due);
            return `<div class="panel hw ${d < 0 ? 'late' : d <= 1 ? 'soon' : ''}" data-hid="${h.id}" style="--accent:${subjColor(h.sid)}">
              <button class="check" data-hw="done" aria-label="Erledigt"></button>
              <div class="t"><b>${esc(h.title)}</b><small>${esc(subjName(h.sid))} · ${LH.fmtDay(h.due)} · <span class="due">${dueText(h.due)}</span></small></div>
              <button class="icon-btn danger" data-hw="del" aria-label="Löschen">${LH.ICON.trash}</button></div>`; }).join('') || '<div class="panel empty" style="padding:26px"><b>Alles erledigt</b>Neue HÜs oben eintragen oder JARVIS sagen: „HÜ Mathe bis Freitag“.</div>'}
          ${done.length ? `<div class="muted" style="font-size:13px;font-weight:600;margin:16px 0 6px">Zuletzt erledigt</div>${done.map(h => `<div class="hw-done" data-hid="${h.id}"><button class="check on" data-hw="undo" aria-label="Wieder öffnen"></button><span>${esc(h.title)}</span><span class="muted">${esc(subjName(h.sid))}</span></div>`).join('')}` : ''}
          </div>
        </div>
        <div>
          <h2 class="h2" style="margin-top:22px">Noten <span class="mono">${S().grades.length}</span></h2>
          <form class="panel form" id="gr-form">
            <div class="row" style="flex-wrap:nowrap"><div class="field" style="flex:1.4"><label>Fach</label>${sel.replace('<option value="">Allgemein</option>', '')}</div>
            <div class="field" style="flex:1"><label>Art</label><select class="input" name="type">${TYPES.map(([t]) => `<option>${t}</option>`).join('')}</select></div></div>
            <div class="field"><label>Note</label><div class="grade-pick">${GRADES.map(([l, v]) => `<button type="button" class="gp" data-v="${v}" data-l="${l}">${l}</button>`).join('')}</div></div>
            <button class="btn primary" disabled id="gr-add">Note eintragen</button>
          </form>
          ${per.length ? `<div class="panel overall"><div><small class="eyebrow">Gesamtschnitt</small><b class="mono">${fmtAvg(overall)}</b></div><span class="muted">${noteOf(overall)}</span></div>
            ${sytBlock()}
            ${per.map(({ s, list }) => { const a = avg(list); return `<div class="panel gsub" style="--accent:${s.color}">
              <div class="row" style="justify-content:space-between"><b>${esc(s.name)}</b><span class="mono gavg">${fmtAvg(a)}</span></div>
              <div class="gchips">${list.map(g => `<span class="gchip" title="${esc(g.type)} · ${LH.fmtDay(g.date)}">${esc(g.label)}<i>${esc(g.type[0])}</i><button data-gr="del" data-id="${g.id}" aria-label="Note löschen">×</button></span>`).join('')}</div>
              ${LH.meter((5 - a) / 4 * 100, 20, { cls: 'thin' })}${needed(list) ? `<small class="muted" style="display:block;margin-top:8px;font-size:12.5px">${needed(list)}</small>` : ''}</div>`; }).join('')}`
          : '<div class="panel empty" style="padding:26px"><b>Noch keine Noten</b>Trag Schularbeiten, Tests und Mitarbeit ein. Schularbeiten und Tests zählen voll, Mitarbeit ¼, HÜs etwas weniger.</div>'}
        </div>
      </div>`;
  },
  mount() {
    $('#hw-form').onsubmit = e => {
      e.preventDefault(); const f = e.target;
      addHomework(f.title.value, f.sid.value, f.due.value);
      LH.toast('HÜ', 'Hausübung eingetragen', `${f.title.value.trim()} · ${LH.fmtDay(f.due.value)}`);
      LH.rerender();
    };
    let pick = null;
    document.querySelectorAll('.gp').forEach(b => b.onclick = () => { pick = b; document.querySelectorAll('.gp').forEach(x => x.classList.toggle('sel', x === b)); $('#gr-add').disabled = false; });
    $('#gr-form').onsubmit = e => {
      e.preventDefault(); if (!pick) return;
      const f = e.target, type = f.type.value, w = TYPES.find(t => t[0] === type)[1];
      S().grades.push({ id: uid('g'), sid: f.sid.value, type, value: +pick.dataset.v, label: pick.dataset.l, weight: w, date: LH.dkey() });
      LH.save(); LH.toast('NOTE', `${pick.dataset.l} eingetragen`, `${subjName(f.sid.value)} · ${type}`);
      if (+pick.dataset.v <= 1.25) LH.confetti(90);
      LH.rerender();
    };
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-hw]');
  if (b) {
    const id = b.closest('[data-hid]').dataset.hid, h = S().homework.find(x => x.id === id); if (!h) return;
    if (b.dataset.hw === 'done') { h.done = true; h.doneAt = LH.dkey(); LH.addCoins(3); LH.emit('homework', h); b.classList.add('on'); b.closest('.hw, .task')?.classList.add('leaving'); LH.save(); setTimeout(LH.rerender, 380); }
    if (b.dataset.hw === 'undo') { h.done = false; LH.save(); LH.rerender(); }
    if (b.dataset.hw === 'del') { S().homework = S().homework.filter(x => x.id !== id); LH.save(); LH.rerender(); }
  }
  const g = e.target.closest('[data-gr="del"]');
  if (g) { S().grades = S().grades.filter(x => x.id !== g.dataset.id); LH.save(); LH.rerender(); }
});

// Startseite: fällige HÜs
function homeBlock() {
  const hw = openHw().filter(h => daysTo(h.due) <= 3).slice(0, 4);
  if (!hw.length) return '';
  return `<div class="panel pad hw-home"><div class="row" style="justify-content:space-between;margin-bottom:6px"><b>Hausübungen</b><button class="btn sm ghost" data-go="school">Alle</button></div>
    ${hw.map(h => `<div class="task" data-hid="${h.id}" style="--accent:${subjColor(h.sid)}"><span class="sw"></span><div class="t"><b>${esc(h.title)}</b><small>${esc(subjName(h.sid))} · <span style="color:${daysTo(h.due) < 0 ? 'var(--bad)' : daysTo(h.due) <= 1 ? 'var(--peak)' : 'inherit'}">${dueText(h.due)}</span></small></div><button class="btn sm" data-hw="done">Erledigt</button></div>`).join('')}</div>`;
}
// ---------- WebUntis: Tests automatisch eintragen ----------
const UAPI = LH.API?.untis;
// Fach finden: gemerktes Kürzel, gleicher Name oder Langname enthält den Fachnamen („Angewandte Mathematik“ ↔ „Mathe“)
function untisSubject(e, created) {
  const st = S(), n = LH.norm, code = n(e.subject), long = n(e.subjectLong);
  let s = st.subjects.find(x => x.untis && x.untis === e.subject)
    || st.subjects.find(x => n(x.name) && [code, long].includes(n(x.name)))
    || (long.length >= 4 && st.subjects.find(x => { const m = n(x.name); return m.length >= 4 && (long.includes(m) || m.includes(long)); }));
  if (!s) {
    s = { id: uid('s'), name: e.subjectLong || e.subject || 'Schule', desc: 'Aus WebUntis', color: LH.COLORS[st.subjects.length % LH.COLORS.length], topics: [] };
    st.subjects.push(s); if (created) created.count++;
  }
  if (e.subject) s.untis = e.subject;
  return s;
}
function applyUntis({ exams = [], subjects = [], timetable = null }) {
  const st = S(), today = LH.dkey(), hidden = st.settings.untisHidden || [], ids = new Set(exams.map(e => e.id));
  if (timetable?.lessons) st.timetable = timetable; // für den Stundenplan-Tab (wird beim Abgleich mit dem Handy mitgenommen)
  const n = { added: 0, changed: 0, removed: 0, count: 0 };
  // Alle Fächer aus dem Stundenplan übernehmen
  const dropped = e => hidden.includes('fach:' + e.subject); // selbst gelöschte Fächer
  for (const su of subjects) if (!dropped(su)) untisSubject(su, n);
  // In WebUntis abgesagte Tests verschwinden auch hier (nur künftige, nur automatisch eingetragene)
  st.tests = st.tests.filter(t => { const gone = t.untisId && t.date >= today && !ids.has(t.untisId); if (gone) n.removed++; return !gone; });
  for (const e of exams) {
    if (e.date < today || hidden.includes(e.id) || dropped(e)) continue;
    const t = st.tests.find(x => x.untisId === e.id);
    const sid = untisSubject(e, n).id;
    if (t) { if (t.date !== e.date) { t.date = e.date; n.changed++; } t.subjectId = sid; t.title = e.title; continue; }
    // Selbst eingetragener Test am selben Tag im selben Fach: verknüpfen statt doppelt eintragen
    const own = st.tests.find(x => !x.untisId && x.subjectId === sid && x.date === e.date);
    if (own) { own.untisId = e.id; continue; }
    st.tests.push({ id: uid('x'), subjectId: sid, date: e.date, title: e.title, untisId: e.id });
    st.stats.testsAdded++; n.added++;
  }
  st.settings.untisLast = new Date().toISOString();
  LH.checkBadges(); LH.save();
  if (['plan', 'home', 'timetable'].includes(LH.current()?.name)) LH.rerender();
  return n;
}
let syncing = false;
async function syncUntis(manual) {
  if (!UAPI || syncing) return null;
  syncing = true;
  try {
    const r = await UAPI.fetch();
    if (r.error) { if (manual) LH.toast('UNTIS', 'WebUntis-Abgleich fehlgeschlagen', r.error); return r; }
    const n = applyUntis(r);
    if (n.added || n.changed || n.removed || n.count || manual) {
      const head = n.added ? `${n.added} ${n.added === 1 ? 'neuer Test' : 'neue Tests'} aus WebUntis` : 'WebUntis abgeglichen';
      const sub = [n.count && `${n.count} ${n.count === 1 ? 'Fach' : 'Fächer'} übernommen`, n.changed && `${n.changed} verschoben`, n.removed && `${n.removed} entfernt`].filter(Boolean).join(' · ');
      LH.toast('UNTIS', head, sub || (n.added ? 'Lernplan ist erstellt' : 'Nichts Neues'));
    }
    return { ...r, ...n };
  } finally { syncing = false; }
}
if (UAPI) { LH.on('ready', () => setTimeout(syncUntis, 4000)); setInterval(syncUntis, 3 * 3600e3); }

LH.school = { atRisk, gradeSummary, openHw, addHomework, dueText, daysTo, homeBlock, subjName, applyUntis, syncUntis };
})();

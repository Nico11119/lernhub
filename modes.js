// ===================== LernHub – Lernmodi, Prüfung, Fehlerheft =====================
(() => {
'use strict';
const LH = window.LH;
const { $, $$, esc, norm, shuffle, pad } = LH;
const S = () => LH.S;

// ---------- Antworten prüfen ----------
function lev(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const ratio = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);
function similar(input, answer) {
  const a = norm(input), b = norm(answer);
  if (!a) return false;
  if (a === b || ratio(a, b) >= .82) return true;
  const toks = b.split(' ').filter(w => w.length > 1 || /\d/.test(w)), mine = a.split(' ');
  const hit = toks.filter(w => mine.some(x => x === w || (w.length > 3 && ratio(x, w) >= .75))).length;
  return toks.length >= 2 && hit / toks.length >= .6;
}
async function check(input, card) {
  if (similar(input, card.a)) return { ok: true };
  if (LH.CAN_AI && norm(input).length >= 2 && await LH.API.jarvis.hasKey()) {
    const r = await LH.API.ai.grade({ q: card.q, a: card.a, given: input }).catch(() => null);
    if (r && typeof r.ok === 'boolean') return { ok: r.ok, feedback: r.feedback, ai: true };
  }
  return { ok: false };
}
const numEq = (input, ans) => { const v = parseFloat(String(input).replace(',', '.').replace(/[−–]/g, '-').replace(/\s/g, '')); return !isNaN(v) && Math.abs(v - parseFloat(ans)) < 1e-6; };

// ---------- Mathe-Generator ----------
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const nz = (a, b) => { let v = 0; while (!v) v = R(a, b); return v; };
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '?': 'ˀ' };
const sup = v => String(v).split('').map(c => SUP[c] || c).join('');
const sg = d => d < 0 ? `− ${-d}` : `+ ${d}`;
const MATH = [
  () => { const b = R(2, 5), m = R(2, 6), n = R(2, 6); return { q: `${b}${sup(m)} · ${b}${sup(n)} = ${b}^?`, a: m + n, hint: 'Gleiche Basis: Exponenten addieren.' }; },
  () => { const m = R(5, 9), n = R(1, 4); return { q: `x${sup(m)} : x${sup(n)} = x^?`, a: m - n, hint: 'Gleiche Basis: Exponenten subtrahieren.' }; },
  () => { const m = R(2, 4), n = R(2, 4); return { q: `(a${sup(m)})${sup(n)} = a^?`, a: m * n, hint: 'Potenz einer Potenz: Exponenten multiplizieren.' }; },
  () => { const b = R(2, 5), e = b === 2 ? R(3, 8) : R(2, 3); return { q: `${b}${sup(e)} = ?`, a: b ** e }; },
  () => { const b = R(2, 5), n = R(1, 3); return { q: `${b}${sup(-n)} = 1 / ?`, a: b ** n, hint: 'a⁻ⁿ = 1 / aⁿ' }; },
  () => { const n = R(2, 15); return { q: `√${n * n} = ?`, a: n }; },
  () => { const n = R(2, 6); return { q: `∛${n ** 3} = ?`, a: n }; },
  () => { const n = R(2, 7), m = [2, 3, 5, 6, 7][R(0, 4)]; return { q: `√${n * n * m} = ? · √${m}`, a: n, hint: `${n * n * m} = ${n * n} · ${m}` }; },
  () => { const k = nz(-5, 5), d = R(-9, 9), x = R(-5, 5); return { q: `f(x) = ${k}x ${sg(d)}\nf(${x}) = ?`, a: k * x + d, hint: 'x einsetzen und ausrechnen.' }; },
  () => { const k = nz(-4, 4), r = R(-6, 6); return { q: `Nullstelle von f(x) = ${k}x ${sg(-k * r)}`, a: r, hint: 'f(x) = 0 setzen und nach x lösen.' }; },
  () => { const k = nz(-4, 4), x1 = R(-5, 3), dx = R(1, 4), y1 = R(-5, 5); return { q: `Steigung k durch P(${x1}|${y1}) und Q(${x1 + dx}|${y1 + k * dx})`, a: k, hint: 'k = Δy / Δx' }; },
  () => { const k = nz(-3, 3), d = R(-6, 6); return { q: `f(x) = ${k}x ${sg(d)}\ny-Achsenabschnitt d = ?`, a: d, hint: 'd ist der Wert bei x = 0.' }; }
];
const isMath = sid => /mathe|math|\bam\b|angewandte/i.test(LH.subj(sid)?.name || '');

// ---------- Lückentext ----------
const STOP = new Set('aber alle auch dass dann denn eine einem einen einer eines fuer haben hat oder sich sind sowie ueber unter wird werden wurde wurden wenn weil wird zwischen durch nach beim nicht noch nur mehr sehr auch'.split(' '));
function clozeOf(text) {
  const words = text.match(/[A-Za-zÄÖÜäöüß0-9][A-Za-zÄÖÜäöüß0-9\-]*/g) || [];
  const cand = words.filter(w => w.length >= 4 && !STOP.has(norm(w)) || /^\d{2,}$/.test(w))
    .map(w => ({ w, s: w.length + (/^[A-ZÄÖÜ]/.test(w) ? 3 : 0) + (/\d/.test(w) ? 4 : 0) }))
    .sort((a, b) => b.s - a.s).slice(0, 3);
  if (!cand.length) return null;
  const w = cand[Math.floor(Math.random() * cand.length)].w;
  const i = text.indexOf(w);
  return { before: text.slice(0, i), after: text.slice(i + w.length), a: w };
}
function clozeItems(sid, tids, n) {
  const s = LH.subj(sid), out = [];
  for (const t of s?.topics || []) {
    if (tids?.length && !tids.includes(t.id)) continue;
    for (const line of t.summary || []) { const c = clozeOf(line); if (c) out.push({ kind: 'cloze', ...c, tid: t.id, sid }); }
    for (const c of t.cards) if (c.a.split(' ').length >= 3) { const z = clozeOf(c.a); if (z) out.push({ kind: 'cloze', ...z, tid: t.id, sid, ctx: c.q }); }
  }
  return shuffle(out).slice(0, n);
}

// ---------- Fehlerheft ----------
const mistakes = sid => LH.cardsOf(sid).filter(c => { const st = LH.cs(c.id); return st.w > 0 && st.box <= 2; });
// Wiederholung mit wachsendem Abstand: Fach 1 → nach 1 Tag, Fach 5 → nach 16 Tagen
const GAP = [0, 1, 2, 4, 8, 16];
const daysSince = ms => Math.round((LH.parseKey(LH.dkey()) - LH.parseKey(LH.dkey(new Date(ms)))) / 864e5);
const due = sid => LH.cardsOf(sid).filter(c => { const st = LH.cs(c.id); return st.last && daysSince(st.last) >= GAP[st.box]; });
function badge() {
  const n = mistakes().length, b = $('#nav-mistakes .k');
  if (b) b.textContent = n || '';
}
['answer', 'booted', 'adopt'].forEach(ev => LH.on(ev, badge));

// ---------- Drill (alle neuen Modi) ----------
let D = null, timer = 0;
const LABEL = { type: 'Eintippen', cloze: 'Lückentext', match: 'Zuordnen', math: 'Rechnen', mixed: 'Gemischt', exam: 'Prüfung', mistakes: 'Fehlerheft', due: 'Wiederholung' };
const HOME = { mistakes: 'mistakes', due: 'today' };
function start(mode, sid, tids = [], opts = {}) {
  let pool = mode === 'mistakes' ? mistakes(sid) : mode === 'due' ? due(sid) : LH.cardsOf(sid, tids);
  let items = [];
  const mcOk = c => LH.cardsOf(c.sid).length >= 4 || LH.cardsOf().length >= 4;
  if (mode === 'type') items = LH.pickCards(pool, 10).map(card => ({ kind: 'type', card }));
  if (mode === 'cloze') { items = clozeItems(sid, tids, 10); if (items.length < 3) { items = LH.pickCards(pool, 10).map(card => ({ kind: 'type', card })); LH.toast('INFO', 'Wenig Text für Lücken', 'Ich frage stattdessen per Eintippen ab'); } }
  if (mode === 'match') { const cs = LH.pickCards(pool, 16); for (let i = 0; i + 3 <= cs.length; i += 4) items.push({ kind: 'match', cards: cs.slice(i, i + 4) }); }
  if (mode === 'math') items = Array.from({ length: 10 }, () => ({ kind: 'math', ...MATH[R(0, MATH.length - 1)]() }));
  if (mode === 'mixed' || mode === 'mistakes' || mode === 'due') {
    items = LH.pickCards(pool, mode === 'mixed' ? 12 : 20).map(card => ({ kind: Math.random() < .5 && mcOk(card) ? 'mc' : 'type', card }));
    if (mode === 'mixed') { const cl = clozeItems(sid, tids, 3); items = shuffle([...items, ...cl]); }
  }
  if (mode === 'exam') {
    const n = Math.min(opts.n || 20, pool.length);
    items = LH.pickCards(shuffle(pool), n).map((card, i) => ({ kind: i % 5 < 3 && mcOk(card) ? 'mc' : 'type', card }));
  }
  if (!items.length) return LH.toast('LEER', 'Nichts zu üben', mode === 'mistakes' ? 'Keine offenen Fehler – stark!' : mode === 'due' ? 'Heute ist nichts fällig' : 'Zu wenige Karten für diesen Modus');
  D = { mode, sid, tids, items, i: 0, right: 0, wrong: 0, xp: 0, t0: Date.now(), answers: [], limit: mode === 'exam' ? items.length * 45 : 0 };
  LH.go('drill');
}
LH.VIEWS.drill = {
  html() {
    const s = D.sid && LH.subj(D.sid);
    return `<div class="session" style="--accent:${s?.color || 'var(--signal)'}">
      <div class="sess-top">
        <button class="icon-btn" data-dr="exit" aria-label="Beenden">${LH.ICON.x}</button>
        <span class="chip">${LABEL[D.mode]}${s ? ' · ' + esc(s.name) : ''}</span>
        <div class="meter" id="dr-m" style="--n:${Math.min(D.items.length, 30)};--h:6px"></div>
        <span class="count" id="dr-c"></span>${D.limit ? '<span class="chip mono" id="dr-t">--:--</span>' : ''}
      </div><div id="dr-body"></div></div>`;
  },
  mount() {
    render();
    clearInterval(timer);
    if (D.limit) timer = setInterval(() => {
      if (LH.current().name !== 'drill' || !D || D.done) return clearInterval(timer);
      const left = D.limit - Math.floor((Date.now() - D.t0) / 1000);
      const t = $('#dr-t'); if (t) { t.textContent = LH.mmss(Math.max(0, left)); t.style.color = left < 60 ? 'var(--bad)' : ''; }
      if (left <= 0) { while (D.i < D.items.length) { D.answers.push({ item: D.items[D.i], given: '', ok: false }); D.i++; } finish(); }
    }, 500);
  }
};
const cur = () => D.items[D.i];
function progress() {
  LH.setMeter($('#dr-m'), D.i / D.items.length * 100);
  $('#dr-c').textContent = `${Math.min(D.i + 1, D.items.length)}/${D.items.length}`;
}
function topicName(card) { return LH.topicOf(card.sid, card.tid)?.name || ''; }
function render() {
  const body = $('#dr-body'); if (!body) return;
  progress();
  if (D.i >= D.items.length) return finish();
  const it = cur(); D.answered = false;
  if (it.kind === 'mc') {
    const c = it.card;
    const near = shuffle(LH.cardsOf(c.sid, [c.tid]).filter(x => x.a !== c.a).map(x => x.a));
    const far = shuffle(LH.cardsOf(c.sid).filter(x => x.a !== c.a).map(x => x.a));
    const other = shuffle(LH.cardsOf().filter(x => x.a !== c.a).map(x => x.a));
    it.opts = shuffle([c.a, ...[...new Set([...near, ...far, ...other])].slice(0, 3)]);
    body.innerHTML = `<div class="panel quiz-q screws"><span class="chip">${esc(topicName(c))}</span><div class="q">${esc(c.q)}</div></div>
      <div class="opts" id="opts">${it.opts.map((o, i) => `<button class="opt" style="--i:${i}" data-dr="mc" data-i="${i}"><span class="kbd">${i + 1}</span>${esc(o)}</button>`).join('')}</div><div class="next-row" id="dr-next"></div>`;
  } else if (it.kind === 'type' || it.kind === 'math') {
    const q = it.kind === 'math' ? it.q : it.card.q;
    body.innerHTML = `<div class="panel quiz-q screws">${it.card ? `<span class="chip">${esc(topicName(it.card))}</span>` : '<span class="chip">Mathe</span>'}<div class="q" style="white-space:pre-line">${esc(q)}</div></div>
      <form class="type-in" id="dr-form"><input class="input big" id="dr-in" autocomplete="off" placeholder="${it.kind === 'math' ? 'Zahl eingeben' : 'Deine Antwort'}" ${it.kind === 'math' ? 'inputmode="decimal"' : ''}><button class="btn primary lg">Prüfen<span class="kbd">Enter</span></button></form>
      <div class="feedback" id="dr-fb"></div><div class="next-row" id="dr-next"></div>`;
  } else if (it.kind === 'cloze') {
    body.innerHTML = `<div class="panel quiz-q screws cloze"><span class="chip">${esc(LH.topicOf(it.sid, it.tid)?.name || '')}</span>${it.ctx ? `<p class="muted" style="margin-top:10px">${esc(it.ctx)}</p>` : ''}
      <form id="dr-form" class="q cloze-q">${esc(it.before)}<input class="cloze-in" id="dr-in" autocomplete="off" size="${Math.max(6, it.a.length)}" aria-label="Lücke">${esc(it.after)}</form></div>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn primary" data-dr="cloze-check">Prüfen<span class="kbd">Enter</span></button></div>
      <div class="feedback" id="dr-fb"></div><div class="next-row" id="dr-next"></div>`;
  } else if (it.kind === 'match') {
    it.done = new Set(); it.bad = new Set(); it.sel = null; it.right = shuffle(it.cards.map(c => c.id));
    body.innerHTML = `<p class="lede" style="text-align:center;margin:0 auto 16px">Klick links eine Frage und rechts die passende Antwort.</p>
      <div class="match"><div class="mcol">${it.cards.map((c, i) => `<button class="mitem" data-dr="ml" data-id="${c.id}" style="--i:${i}">${esc(c.q)}</button>`).join('')}</div>
      <div class="mcol">${it.right.map((id, i) => `<button class="mitem" data-dr="mr" data-id="${id}" style="--i:${i + 4}">${esc(it.cards.find(c => c.id === id).a)}</button>`).join('')}</div></div>`;
  }
  setTimeout(() => $('#dr-in')?.focus(), 80);
}
function award(ok, el) {
  // für Aufgaben ohne Karte (Mathe, Lückentext)
  if (ok) { LH.S.stats.correct++; LH.addCoins(1); } else LH.S.stats.wrong++;
  LH.addXP(ok ? 8 : 2, el, ok);
  LH.emit('answer', { ok, mode: D.mode });
  LH.save();
  return ok ? 8 : 2;
}
function nextBtn(extra = '') {
  $('#dr-next').innerHTML = `${extra}<button class="btn primary" data-dr="next">${D.i + 1 >= D.items.length ? 'Auswertung' : 'Weiter'}<span class="kbd">Enter</span></button>`;
}
function record(ok, given, el) {
  const it = cur();
  D.answers.push({ item: it, given, ok });
  if (D.mode === 'exam') { ok ? D.right++ : D.wrong++; D.i++; return render(); }
  ok ? D.right++ : D.wrong++;
  D.xp += it.card ? LH.grade(it.card, ok, 'quiz', el) : award(ok, el);
}
async function submitText() {
  if (D.answered) return;
  const it = cur(), inp = $('#dr-in'), val = inp.value.trim();
  if (!val) return inp.focus();
  D.answered = true; inp.disabled = true;
  let res;
  if (it.kind === 'math') res = { ok: numEq(val, it.a) };
  else if (it.kind === 'cloze') res = { ok: similar(val, it.a) };
  else { if (D.mode !== 'exam') $('#dr-fb').innerHTML = '<div class="busy"><span class="spinner"></span>Prüfe …</div>'; res = await check(val, it.card); }
  if (D.mode === 'exam') return record(res.ok, val);
  record(res.ok, val, inp);
  const ans = it.kind === 'math' ? it.a : it.kind === 'cloze' ? it.a : it.card.a;
  inp.classList.add(res.ok ? 'ok' : 'bad');
  $('#dr-fb').innerHTML = res.ok
    ? `<div class="fb ok"><b>Richtig.</b>${res.ai ? ` <span class="muted">${esc(res.feedback || 'JARVIS hat es als richtig gewertet.')}</span>` : norm(val) !== norm(String(ans)) ? ` <span class="muted">Genau: ${esc(ans)}</span>` : ''}</div>`
    : `<div class="fb bad"><b>Richtig wäre:</b> ${esc(ans)}${res.feedback ? `<br><span class="muted">${esc(res.feedback)}</span>` : ''}${it.hint ? `<br><span class="muted">Tipp: ${esc(it.hint)}</span>` : ''}</div>`;
  nextBtn((!res.ok && it.card ? `<button class="btn ghost" data-dr="override">Doch richtig</button><button class="btn ghost" data-dr="why">Warum?</button>` : ''));
  if (res.ok) { const at = D.i; setTimeout(() => { if (D && D.i === at && LH.current().name === 'drill') { D.i++; render(); } }, 1100); }
}
function pickMC(i) {
  if (D.answered) return; D.answered = true;
  const it = cur(), ok = it.opts[i] === it.card.a, opts = $$('#opts .opt');
  $('#opts').classList.add('locked');
  if (D.mode === 'exam') { opts[i].classList.add('picked'); return setTimeout(() => record(ok, it.opts[i]), 180); }
  opts.forEach((o, j) => o.classList.add(it.opts[j] === it.card.a ? 'right' : j === i ? 'wrong' : 'dim'));
  record(ok, it.opts[i], opts[i]);
  nextBtn(ok ? '' : '<button class="btn ghost" data-dr="why">Warum?</button>');
  if (ok) { const at = D.i; setTimeout(() => { if (D && D.i === at && LH.current().name === 'drill') { D.i++; render(); } }, 1000); }
}
function matchClick(side, id, el) {
  const it = cur();
  if (it.done.has(id)) return;
  if (side === 'l') { $$('.mitem[data-dr="ml"]').forEach(b => b.classList.toggle('sel', b === el)); it.sel = id; return; }
  if (!it.sel) return;
  const L = $(`.mitem[data-dr="ml"][data-id="${it.sel}"]`);
  if (id === it.sel) {
    it.done.add(id); L.classList.remove('sel'); L.classList.add('ok'); el.classList.add('ok');
    const card = it.cards.find(c => c.id === id);
    const ok = !it.bad.has(id); ok ? D.right++ : D.wrong++;
    D.xp += LH.grade(card, ok, 'quiz', el);
    D.answers.push({ item: { kind: 'type', card }, given: '', ok });
    it.sel = null;
    if (it.done.size === it.cards.length) setTimeout(() => { D.i++; render(); }, 650);
  } else {
    it.bad.add(it.sel);
    el.classList.add('bad'); L.classList.add('bad');
    setTimeout(() => { el.classList.remove('bad'); L.classList.remove('bad'); }, 450);
  }
}
const NOTE = pct => pct >= 87.5 ? 1 : pct >= 75 ? 2 : pct >= 62.5 ? 3 : pct >= 50 ? 4 : 5;
const NOTE_T = ['', 'Sehr gut', 'Gut', 'Befriedigend', 'Genügend', 'Nicht genügend'];
function finish() {
  if (D.done) return; D.done = true; clearInterval(timer);
  const body = $('#dr-body'); progress(); LH.setMeter($('#dr-m'), 100);
  const n = D.answers.length || 1, pct = Math.round(D.answers.filter(a => a.ok).length / n * 1000) / 10;
  if (D.mode === 'exam') {
    D.answers.forEach(a => { if (a.item.card) D.xp += LH.grade(a.item.card, a.ok, 'quiz'); });
    const note = NOTE(pct), secs = Math.round((Date.now() - D.t0) / 1000);
    S().exams.push({ sid: D.sid, date: LH.dkey(), pct, note });
    S().stats.sessions++;
    LH.emit('exam', { note, pct }); LH.emit('session', { acc: pct, n, wrong: D.answers.filter(a => !a.ok).length, mode: 'exam' });
    LH.checkBadges(); LH.save();
    const wrong = D.answers.filter(a => !a.ok);
    body.innerHTML = `<div class="panel result screws">
      <div class="eyebrow">Prüfungssimulation · ${LH.mmss(secs)} min</div>
      <div class="note-big note-${note}">${note}</div><p class="lede" style="margin:4px auto 0">${NOTE_T[note]} · ${pct} %</p>
      <div style="max-width:320px;margin:18px auto 0">${LH.meter(pct, 24, { h: 10 })}</div>
      <p class="muted" style="font-size:12.5px;margin-top:12px">Schlüssel: 1 ab 87,5 % · 2 ab 75 % · 3 ab 62,5 % · 4 ab 50 %</p>
      <div class="row" style="justify-content:center;margin-top:20px"><button class="btn" data-dr="again">Neue Prüfung</button><button class="btn primary" data-action="open-subject" data-sid="${D.sid}">Zum Fach</button></div></div>
      ${wrong.length ? `<h2 class="h2">Durchsicht <span class="mono">${wrong.length} falsch</span></h2><div class="review">${wrong.map(a => `<div class="panel rv"><b>${esc(a.item.card.q)}</b><div class="row" style="gap:18px;margin-top:6px"><span class="muted">Du: ${esc(a.given || '—')}</span><span style="color:var(--ok)">Richtig: ${esc(a.item.card.a)}</span><span style="flex:1"></span><button class="btn sm ghost" data-action="explain" data-cid="${a.item.card.id}">Warum?</button></div></div>`).join('')}</div>` : ''}`;
    LH.lightMeters(body);
    if (note <= 2) LH.confetti(note === 1 ? 220 : 120);
    return;
  }
  S().stats.sessions++;
  if (!D.wrong && n >= 5) S().stats.perfect++;
  LH.emit('session', { acc: pct, n, wrong: D.wrong, mode: D.mode });
  LH.checkBadges(); LH.save();
  body.innerHTML = `<div class="panel result screws">
    <div class="eyebrow">${LABEL[D.mode]} · Auswertung</div>
    <div class="big" style="margin-top:16px">${Math.round(pct)}<span>%</span></div>
    <div style="max-width:320px;margin:20px auto 0">${LH.meter(pct, 24, { h: 10 })}</div>
    <div class="kv"><div><b style="color:var(--ok)">${D.right}</b><span>richtig</span></div><div><b style="color:var(--bad)">${D.wrong}</b><span>falsch</span></div><div><b>+${D.xp}</b><span>XP</span></div></div>
    <div class="row" style="justify-content:center"><button class="btn" data-dr="again">Nochmal</button>${HOME[D.mode] ? `<button class="btn primary" data-go="${HOME[D.mode]}">Zurück</button>` : D.sid ? `<button class="btn primary" data-action="open-subject" data-sid="${D.sid}">Zum Fach</button>` : ''}</div></div>`;
  LH.lightMeters(body);
  if (pct >= 70) LH.confetti(pct >= 90 ? 170 : 90);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-dr]'); if (!b || !D) return;
  const a = b.dataset.dr;
  if (a === 'exit') { clearInterval(timer); D.done = true; return D.sid ? LH.go('subject', { sid: D.sid }) : LH.go(HOME[D.mode] || 'home'); }
  if (a === 'mc') pickMC(+b.dataset.i);
  if (a === 'cloze-check') submitText();
  if (a === 'next') { D.i++; render(); }
  if (a === 'why') explain(cur().card.id);
  if (a === 'override') { const last = D.answers[D.answers.length - 1]; if (last && !last.ok) { last.ok = true; D.wrong--; D.right++; LH.grade(last.item.card, true, 'quiz', b); LH.toast('OK', 'Als richtig gewertet', ''); b.remove(); } }
  if (a === 'again') start(D.mode, D.sid, D.tids);
  if (a === 'ml') matchClick('l', b.dataset.id, b);
  if (a === 'mr') matchClick('r', b.dataset.id, b);
});
document.addEventListener('submit', e => { if (e.target.id === 'dr-form') { e.preventDefault(); submitText(); } });
document.addEventListener('keydown', e => {
  if (LH.current().name !== 'drill' || !D || D.done || $('.modal-bg')) return;
  const it = cur(); if (!it) return;
  // erst weiter, wenn die Prüfung fertig ist (sonst landet eine KI-Bewertung bei der nächsten Frage)
  if (e.key === 'Enter' && D.answered && $('#dr-next [data-dr="next"]') && !e.target.matches('textarea')) { e.preventDefault(); D.i++; return render(); }
  if (e.key === 'Enter' && it.kind === 'cloze' && !D.answered) { e.preventDefault(); return submitText(); }
  if (it.kind === 'mc' && /^[1-4]$/.test(e.key) && !e.target.matches('input')) pickMC(+e.key - 1);
});

// ---------- Modus-Auswahl ----------
function picker(sid, tids = []) {
  const n = LH.cardsOf(sid, tids).length, s = LH.subj(sid);
  const hasSum = (s.topics || []).some(t => (!tids.length || tids.includes(t.id)) && t.summary?.length);
  const tiles = [
    ['flash', 'Karteikarten', 'Umdrehen, selbst einschätzen', 'KRT', n >= 1],
    ['quiz', 'Quiz', '4 Antworten, eine stimmt', 'MC', n >= 2],
    ['type', 'Eintippen', 'Antwort selbst schreiben', 'ABC', n >= 1],
    ['cloze', 'Lückentext', hasSum ? 'Fehlende Wörter ergänzen' : 'Braucht Kernaussagen im Zettel', '_ _', n >= 1],
    ['match', 'Zuordnen', 'Fragen und Antworten verbinden', '⇄', n >= 3],
    ['mixed', 'Gemischt', 'Alle Fragetypen durcheinander', 'MIX', n >= 2],
    ...(isMath(sid) ? [['math', 'Rechnen', 'Immer neue Zahlen: Potenzen, Wurzeln, Funktionen', 'x²', true]] : []),
    ['exam', 'Prüfung', `${Math.min(20, n)} Fragen · ${Math.round(Math.min(20, n) * 45 / 60)} Min · Note 1–5`, 'NOTE', n >= 5],
    ...(LH.CAN_AI ? [['aiexam', 'KI-Schularbeit', LH.jarvis?.hasKey ? 'Neue Aufgaben aus deinen Lernzetteln, Korrektur mit Feedback' : 'Braucht einen API-Key (Optionen → JARVIS)', 'KI', !!LH.jarvis?.hasKey && s.topics.some(t => !tids.length || tids.includes(t.id))]] : [])
  ];
  LH.openModal(`<h3>Lernmodus wählen</h3><p class="lede">${esc(s.name)}${tids.length ? ' · ' + esc(LH.topicOf(sid, tids[0])?.name || '') : ''} · ${n} Karten</p>
    <div class="mode-grid">${tiles.map(([m, t, d, c, ok], i) => `<button class="panel mode-tile link" data-pick="${m}" style="--i:${i}" ${ok ? '' : 'disabled'}><span class="code">${c}</span><b>${t}</b><small>${esc(d)}</small></button>`).join('')}</div>`,
    (bg, close) => bg.addEventListener('click', e => {
      const m = e.target.closest('[data-pick]')?.dataset.pick; if (!m) return;
      close();
      if (m === 'flash' || m === 'quiz') LH.startSession(m, sid, tids);
      else if (m === 'aiexam') aiExam(sid, tids);
      else start(m, sid, tids);
    }));
}

// ---------- Erklären ----------
async function explain(cid) {
  const c = LH.cardsOf().find(x => x.id === cid); if (!c) return;
  const t = LH.topicOf(c.sid, c.tid), s = LH.subj(c.sid);
  if (LH.CAN_AI && await LH.API.jarvis.hasKey()) {
    LH.jarvis.open(true);
    return LH.jarvis.send(`Erklär mir kurz und verständlich, warum die Antwort auf „${c.q}“ „${c.a}“ ist. Fach ${s.name}, Thema ${t.name}. Gib ein Beispiel oder eine Eselsbrücke.`);
  }
  const rel = t.cards.filter(x => x.id !== c.id).slice(0, 4);
  LH.openModal(`<div class="eyebrow">${esc(s.name)} · ${esc(t.name)}</div><h3 style="margin-top:6px">${esc(c.q)}</h3>
    <p style="margin:10px 0 0;font-size:18px;color:var(--signal);font-weight:600">${esc(c.a)}</p>
    ${t.summary?.length ? `<hr><div class="sec-t">Aus deinem Lernzettel</div><ul class="summary">${t.summary.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${rel.length ? `<hr><div class="sec-t">Hängt zusammen mit</div><div class="qa">${rel.map(x => `<div class="qa-row" style="grid-template-columns:1fr 1fr"><span class="q">${esc(x.q)}</span><span class="a">${esc(x.a)}</span></div>`).join('')}</div>` : ''}
    <p class="muted" style="font-size:12.5px;margin-top:16px">${LH.CAN_AI ? 'Mit API-Key erklärt dir JARVIS das ausführlich mit Beispiel.' : 'In der App mit API-Key erklärt JARVIS das ausführlich.'}</p>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-x>Verstanden</button></div>`, (bg, close) => bg.querySelector('[data-x]').onclick = close);
}

// ---------- Fehlerheft-Ansicht ----------
LH.VIEWS.mistakes = {
  html() {
    const all = mistakes();
    const by = LH.S.subjects.map(s => ({ s, list: all.filter(c => c.sid === s.id) })).filter(x => x.list.length);
    return `<div class="page-head"><div><div class="eyebrow">Fehlerheft</div><h1 class="h1">${all.length ? `${all.length} offene Fehler` : 'Alles sauber.'}</h1>
      <p class="lede">Hier landet jede Karte, die du falsch hattest, bis du sie wieder sicher kannst.</p></div>
      <button class="btn primary" data-mk="practice" ${all.length ? '' : 'disabled'}>Fehler üben</button></div>
      ${by.length ? by.map(({ s, list }) => `<h2 class="h2" style="--accent:${s.color}"><span class="eyebrow"><span class="dot"></span></span>${esc(s.name)} <span class="mono">${list.length}</span></h2>
        <div class="qa mk-list" style="--accent:${s.color}">${list.map(c => `<div class="qa-row mk" data-cid="${c.id}"><span class="q">${esc(c.q)}</span><span class="a">${esc(c.a)}</span><span class="row" style="gap:4px;flex-wrap:nowrap"><span class="mono muted" style="font-size:11px;margin-right:6px">${LH.cs(c.id).w}× falsch</span><button class="btn sm ghost" data-action="explain" data-cid="${c.id}">Warum?</button><button class="btn sm ghost" data-mk="done" data-cid="${c.id}">Sitzt</button></span></div>`).join('')}</div>`).join('')
      : '<div class="panel empty"><b>Keine offenen Fehler</b>Falsch beantwortete Karten tauchen hier automatisch auf.</div>'}`;
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-mk]'); if (!b) return;
  if (b.dataset.mk === 'practice') start('mistakes', null);
  if (b.dataset.mk === 'done') {
    const st = LH.cs(b.dataset.cid); st.box = 3; LH.S.cardStats[b.dataset.cid] = st; LH.save(); badge();
    const row = b.closest('.mk'); row.style.transition = 'opacity .25s, transform .25s'; row.style.opacity = 0; row.style.transform = 'translateX(12px)';
    setTimeout(() => LH.rerender(), 260);
  }
});

// ---------- KI-Probeschularbeit: neue Aufgaben aus den Lernzetteln, Korrektur mit Teilpunkten ----------
let X = null;
async function aiExam(sid, tids = []) {
  const s = LH.subj(sid); if (!s) return;
  const topics = s.topics.filter(t => !tids.length || tids.includes(t.id));
  if (!topics.length) return LH.toast('LEER', 'Keine Lernzettel', 'Lade zuerst einen Lernzettel hoch');
  X = { sid, tids, phase: 'make', tasks: [], answers: [], t0: 0, seq: (X?.seq || 0) + 1 };
  const seq = X.seq;
  LH.go('aiexam');
  const r = await LH.API.ai.exam({ action: 'make', subjectName: s.name, n: 7, topics: topics.map(t => ({ name: t.name, summary: t.summary, cards: t.cards.map(c => ({ q: c.q, a: c.a })), stored: t.file?.stored })) }).catch(e => ({ error: e.message }));
  if (!X || X.seq !== seq) return; // inzwischen neu gestartet
  if (r.error) { X.phase = 'error'; X.error = r.error; }
  else { X.phase = 'write'; X.tasks = r.tasks; X.answers = r.tasks.map(() => ''); X.t0 = Date.now(); }
  if (LH.current().name === 'aiexam') LH.rerender();
}
const pts = list => list.reduce((a, t) => a + t.points, 0);
LH.VIEWS.aiexam = {
  html() {
    const s = X && LH.subj(X.sid);
    if (!X || !s) return '<div class="panel empty"><b>Keine Schularbeit</b></div>';
    const head = `<div style="--accent:${s.color}"><button class="back" data-action="open-subject" data-sid="${s.id}">← ${esc(s.name)}</button>
      <div class="eyebrow" style="margin-top:8px"><span class="dot"></span>KI-Probeschularbeit${X.tasks.length ? ` · ${X.tasks.length} Aufgaben · ${pts(X.tasks)} Punkte` : ''}</div><h1 class="h1">${esc(s.name)}</h1>`;
    if (X.phase === 'make' || X.phase === 'grading') return `${head}<div class="panel pad row" style="gap:12px;margin-top:20px"><span class="spinner"></span><span>${X.phase === 'make' ? 'JARVIS liest deine Lernzettel und schreibt die Aufgaben … (kann mit dem Gratis-Key 1–2 Minuten dauern)' : 'JARVIS korrigiert …'}</span></div></div>`;
    if (X.phase === 'error') return `${head}<div class="panel pad" style="margin-top:20px"><b>Das hat nicht geklappt.</b><p class="muted" style="margin-top:6px">${esc(X.error)}</p><button class="btn primary" style="margin-top:14px" data-ax="retry">Nochmal versuchen</button></div></div>`;
    if (X.phase === 'write') return `${head}<p class="lede">Schreib deine Antworten wie bei einer echten Schularbeit, auch Rechenwege. Teilpunkte gibt es für halb Richtiges.</p>
      <form id="ax-form">${X.tasks.map((t, i) => `<div class="panel pad ax-task"><div class="row" style="justify-content:space-between;gap:12px"><b>Aufgabe ${i + 1}</b><span class="mono muted">${t.points} P</span></div>
        <p class="ax-q">${LH.md(t.q)}</p><textarea class="input ax-a" data-i="${i}" placeholder="Deine Antwort" aria-label="Antwort zu Aufgabe ${i + 1}">${esc(X.answers[i])}</textarea></div>`).join('')}
      <div class="row" style="justify-content:flex-end;margin-top:16px"><span class="muted mono" id="ax-t" style="margin-right:auto"></span><button class="btn primary lg">Abgeben</button></div></form></div>`;
    const got = X.res.results.reduce((a, r) => a + r.points, 0), max = pts(X.tasks);
    return `${head}<div class="panel result screws" style="margin-top:20px">
      <div class="eyebrow">Ergebnis · ${String(got).replace('.', ',')} von ${max} Punkten · ${LH.mmss(X.secs)} min</div>
      <div class="note-big note-${X.note}">${X.note}</div><p class="lede" style="margin:4px auto 0">${NOTE_T[X.note]} · ${String(X.pct).replace('.', ',')} %</p>
      ${X.res.summary ? `<p style="max-width:60ch;margin:14px auto 0">${esc(X.res.summary)}</p>` : ''}
      <div class="row" style="justify-content:center;margin-top:20px"><button class="btn" data-ax="new">Neue Schularbeit</button><button class="btn primary" data-action="open-subject" data-sid="${s.id}">Zum Fach</button></div></div>
      <h2 class="h2">Korrektur</h2>${X.tasks.map((t, i) => { const r = X.res.results[i]; return `<div class="panel pad ax-task">
        <div class="row" style="justify-content:space-between;gap:12px"><b>Aufgabe ${i + 1}</b><span class="mono" style="color:${r.points >= t.points ? 'var(--ok)' : r.points ? 'var(--peak)' : 'var(--bad)'}">${String(r.points).replace('.', ',')} / ${t.points} P</span></div>
        <p class="ax-q">${LH.md(t.q)}</p><p class="muted ax-given">Du: ${esc(X.answers[i] || '—')}</p>
        ${r.feedback ? `<p style="margin-top:8px">${esc(r.feedback)}</p>` : ''}
        <details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:13px">Musterlösung</summary><p class="ax-q" style="margin-top:6px">${LH.md(t.solution)}</p></details></div>`; }).join('')}</div>`;
  },
  mount() {
    $$('.ax-a').forEach(a => a.oninput = () => { X.answers[+a.dataset.i] = a.value; });
    const f = $('#ax-form'); if (!f) return;
    clearInterval(timer);
    timer = setInterval(() => { const t = $('#ax-t'); if (!t || X.phase !== 'write') return clearInterval(timer); t.textContent = LH.mmss((Date.now() - X.t0) / 1000); }, 1000);
    f.onsubmit = async e => {
      e.preventDefault();
      const empty = X.answers.filter(a => !a.trim()).length;
      if (empty && !await LH.confirmModal({ title: 'Abgeben?', detail: `${empty} ${empty === 1 ? 'Aufgabe ist' : 'Aufgaben sind'} noch leer.`, ok: 'Trotzdem abgeben' })) return;
      const seq = X.seq, s = LH.subj(X.sid);
      X.secs = Math.round((Date.now() - X.t0) / 1000); X.phase = 'grading'; clearInterval(timer); LH.rerender();
      const r = await LH.API.ai.exam({ action: 'grade', subjectName: s.name, tasks: X.tasks, answers: X.answers }).catch(e => ({ error: e.message }));
      if (!X || X.seq !== seq) return;
      if (r.error) { X.phase = 'write'; LH.toast('KI', 'Korrektur fehlgeschlagen', r.error); return LH.current().name === 'aiexam' && LH.rerender(); }
      X.res = r; X.phase = 'done';
      X.pct = Math.round(r.results.reduce((a, x) => a + x.points, 0) / pts(X.tasks) * 1000) / 10; X.note = NOTE(X.pct);
      S().exams.push({ sid: X.sid, date: LH.dkey(), pct: X.pct, note: X.note, ai: true });
      S().stats.sessions++; LH.addXP(Math.round(X.pct / 2) + 10); LH.emit('exam', { note: X.note, pct: X.pct });
      LH.checkBadges(); LH.save();
      if (LH.current().name === 'aiexam') { LH.rerender(); if (X.note <= 2) LH.confetti(X.note === 1 ? 220 : 120); }
    };
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ax]'); if (!b || !X) return;
  if (b.dataset.ax === 'retry' || b.dataset.ax === 'new') aiExam(X.sid, X.tids);
});

LH.modes = { picker, aiExam, start, explain, mistakes, due, similar, MATH, sid: () => (D && !D.done && cur()?.card?.sid) || D?.sid };
})();

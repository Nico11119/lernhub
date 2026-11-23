// ===================== LernHub 2 – Kern & Ansichten =====================
(() => {
'use strict';

const userName = () => (S?.settings.name || '').trim();
const hello = g => userName() ? `${g}, ${userName()}.` : `${g}.`;
const learnSec = () => (S?.settings.learnMin || 25) * 60;   // so lange lernen …
const breakSec = () => (S?.settings.breakMin || 5) * 60;     // … für so viel Pause
const BREAK_PRICE = 15;                                       // oder Pause für Münzen
const SESSION_SIZE = 10;
// Heftumschlag-Farben: kräftig genug für Papier und Nachtheft
const COLORS = ['#e8590c', '#3b5bdb', '#2f9e44', '#e0a100', '#d6336c', '#0c8599', '#7048e8', '#868e96'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const API = window.lernhub || null;
const IS_DESKTOP = !!API?.isDesktop;
const IS_MOBILE = !!API?.isMobile;          // Handy-App ohne Laptop (mobile-api.js)
const CAN_AI = !!API?.jarvis?.chat;           // KI: Laptop und Handy-App
const CAN_FILES = !!API?.files?.read;         // Lernzettel-Dateien lesen
const HAS_STORE = !!API?.store;
const IS_REMOTE = !!API?.isRemote;
const bus = {};
const emit = (ev, d) => (bus[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } });
if (IS_DESKTOP) document.documentElement.classList.add('is-desktop');
if (IS_MOBILE) document.documentElement.classList.add('is-mobile');

// ---------- Hilfen ----------
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtDay = k => k === dkey() ? 'Heute' : k === dkey(addDays(new Date(), 1)) ? 'Morgen' : parseKey(k).toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' });
const fmtLong = k => parseKey(k).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' });
const mmss = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Kleines Markdown für KI-Antworten: **fett**, `code`, Listenpunkte, # Überschriften
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`\n]+)`/g, '<code>$1</code>')
  .replace(/^[ \t]*[-*] /gm, '• ').replace(/^#{1,4} (.+)$/gm, '<b>$1</b>');
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9/.\-@ ]/g, ' ').replace(/\s+/g, ' ').trim();
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uid = p => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const ICON = {
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/></svg>',
  chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  x: '<svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>'
};

// ---------- Zustand ----------
const DEFAULT = () => ({
  v: 2, subjects: [], cardStats: {}, xp: 0, coins: 0,
  streak: { count: 0, last: null, best: 0 },
  stats: { correct: 0, wrong: 0, sessions: 0, perfect: 0, jarvis: 0, voice: 0, night: 0, testsAdded: 0, uploads: 0, games: 0 },
  studySec: 0, subjMin: {}, learnTick: 0, breakBank: 5 * 60, history: {}, tests: [], planDone: {}, badges: [],
  scores: { runner: 0, g2048: 0, snake: 0, riff: 0, blocks: 0 },
  homework: [], grades: [], exams: [], rev: 0, lastBriefing: null,
  goals: { day: null, list: [], week: null, weekDone: false },
  shop: { owned: ['theme:orange', 'skin:square', 'ring:bars'], theme: 'orange', skin: 'square', ring: 'bars' },
  runner: { levels: {}, custom: [] },
  settings: { reduceMotion: false, theme: 'system', voiceOut: true, voiceName: '', stt: 'base', jarvisOpen: null, learnMin: 25, breakMin: 5, weekGoal: 150, briefing: true, city: '', focusApps: 'Discord, Steam', focusPlaylist: '', focusMin: 25, untisHidden: [], untisLast: '', name: '' }
});
let S;
function seedSubjects() {
  return (window.STARTER_SUBJECTS || []).map(s => ({
    id: uid('s'), name: s.name, color: s.color, desc: s.desc || '',
    topics: s.topics.map(t => ({ id: uid('t'), name: t.name, file: null, summary: [], cards: t.cards.map(([q, a]) => ({ id: uid('c'), q, a })) }))
  }));
}
async function load() {
  let data = null;
  if (HAS_STORE) { try { data = await API.store.load(); } catch {} }
  if (!data && !HAS_STORE) { try { data = JSON.parse(localStorage.getItem('lernhub2') || 'null'); } catch {} }
  S = merge(data);
  if (!data) S.subjects = seedSubjects();
}
function merge(data) {
  const x = Object.assign(DEFAULT(), data || {});
  for (const k of ['stats', 'settings', 'scores', 'streak', 'shop', 'goals', 'runner']) x[k] = Object.assign(DEFAULT()[k], (data || {})[k] || {});
  return x;
}
// Daten kamen von außen (Handy) – übernehmen, ohne eine laufende Runde zu stören
function adopt(data, quiet) {
  if (!data) return;
  S = merge(data); LH.S = S;
  hud(); applyMotion(); emit('adopt');
  if (!['session', 'drill', 'game'].includes(current.name)) rerender();
  if (!quiet) toast('SYNC', 'Daten aktualisiert', 'Änderungen vom anderen Gerät übernommen');
}
let saveT, saving = false, dirty = false;
function save(now) {
  clearTimeout(saveT);
  const run = () => {
    S.savedAt = Date.now(); // für den Abgleich: welche Seite zuletzt geändert hat
    if (!HAS_STORE) { try { localStorage.setItem('lernhub2', JSON.stringify(S)); } catch {} return; }
    // Nur ein Speichervorgang gleichzeitig: sonst kollidiert der zweite mit der eigenen Versionsnummer und verwirft die neuesten Änderungen
    if (saving) { dirty = true; return; }
    saving = true;
    API.store.save(S).then(r => {
      if (r && r.conflict) adopt(r.data);
      else if (r && r.rev) S.rev = r.rev;
    }).catch(() => {}).finally(() => { saving = false; if (dirty) { dirty = false; run(); } });
  };
  now ? run() : (saveT = setTimeout(run, 400));
}
addEventListener('beforeunload', () => save(true));
const reduced = () => !!S?.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
// Animationen und Hell/Dunkel ("system" folgt Windows)
const applyMotion = () => {
  const r = document.documentElement, t = S.settings.theme;
  r.classList.toggle('reduce', !!S.settings.reduceMotion);
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
  emit('theme');
};
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => S?.settings.theme === 'dark' || (S?.settings.theme !== 'light' && darkMQ.matches);
darkMQ.addEventListener('change', () => emit('theme'));

// ---------- Inhalte ----------
const subj = id => S.subjects.find(s => s.id === id);
function cardsOf(sid, tids) {
  const out = [];
  for (const s of S.subjects) {
    if (sid && s.id !== sid) continue;
    for (const t of s.topics) {
      if (tids && tids.length && !tids.includes(t.id)) continue;
      for (const c of t.cards) out.push({ id: c.id, q: c.q, a: c.a, wrong: c.wrong, sid: s.id, tid: t.id });
    }
  }
  return out;
}
// abgelegte Lernzettel (s.archive) bleiben lesbar, zählen aber nicht mehr beim Lernen (cardsOf geht nur über s.topics)
const topicOf = (sid, tid) => { const s = subj(sid); return s?.topics.find(t => t.id === tid) || s?.archive?.flatMap(a => a.topics).find(t => t.id === tid); };
const cs = id => S.cardStats[id] || { box: 1, r: 0, w: 0, last: null };
const progress = cards => cards.length ? Math.round(cards.reduce((a, c) => a + (cs(c.id).box - 1) / 4, 0) / cards.length * 100) : 0;
const findSubject = name => { const q = norm(name); return S.subjects.find(s => norm(s.name) === q) || S.subjects.find(s => norm(s.name).includes(q) || q.includes(norm(s.name))); };

// ---------- Gamification ----------
const levelOf = xp => Math.floor(Math.sqrt(xp / 50)) + 1;
const xpFor = l => 50 * (l - 1) ** 2;
const streakNow = () => (S.streak.last === dkey() || S.streak.last === dkey(addDays(new Date(), -1))) ? S.streak.count : 0;

function pickCards(pool, n) {
  const arr = pool.map(c => { const st = cs(c.id); return { c, w: (6 - st.box) ** 2 + (st.last ? 0 : 3) }; });
  const out = [];
  while (out.length < n && arr.length) {
    let r = Math.random() * arr.reduce((a, x) => a + x.w, 0), i = 0;
    for (; i < arr.length - 1; i++) { r -= arr[i].w; if (r <= 0) break; }
    out.push(arr[i].c); arr.splice(i, 1);
  }
  return out;
}
function markDay() {
  if (new Date().getHours() >= 22) S.stats.night++;
  const t = dkey();
  if (S.streak.last === t) return;
  S.streak.count = S.streak.last === dkey(addDays(new Date(), -1)) ? S.streak.count + 1 : 1;
  S.streak.last = t;
  S.streak.best = Math.max(S.streak.best || 0, S.streak.count);
  bump('#hud-streak');
}
function grade(card, ok, mode, el) {
  const c = cs(card.id);
  if (ok) { c.box = Math.min(5, c.box + 1); c.r++; S.stats.correct++; addCoins(1); }
  else { c.box = 1; c.w++; S.stats.wrong++; }
  c.last = Date.now();
  S.cardStats[card.id] = c;
  markDay();
  const gain = ok ? (mode === 'quiz' ? 10 : 6) : 2;
  addXP(gain, el, ok);
  emit('answer', { ok, card, mode });
  checkBadges(); save();
  return gain;
}
function addXP(n, el, good = true) {
  const before = levelOf(S.xp);
  S.xp += n;
  if (el) xpPop(`+${n} XP`, el, good);
  hud();
  if (levelOf(S.xp) > before) levelUp(levelOf(S.xp));
}
function addCoins(n) { S.coins += n; bump('#hud-coins'); hud(); }
function bump(sel) { const el = $(sel); if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

const BADGES = [
  { id: 'first', code: '1ST', name: 'Erster Schritt', desc: 'Erste Frage beantwortet', ok: s => s.stats.correct + s.stats.wrong >= 1 },
  { id: 'c50', code: '50', name: 'Wissensdurst', desc: '50 richtige Antworten', ok: s => s.stats.correct >= 50 },
  { id: 'c200', code: '200', name: 'Dauerfeuer', desc: '200 richtige Antworten', ok: s => s.stats.correct >= 200 },
  { id: 'perfect', code: '100%', name: 'Makellos', desc: 'Runde ohne Fehler, mind. 5 Fragen', ok: s => s.stats.perfect >= 1 },
  { id: 's3', code: '3T', name: 'Am Ball', desc: '3 Tage in Folge gelernt', ok: s => s.streak.count >= 3 },
  { id: 's7', code: '7T', name: 'Unaufhaltsam', desc: '7 Tage in Folge gelernt', ok: s => s.streak.count >= 7 },
  { id: 'l5', code: 'LV5', name: 'Level 5', desc: '800 XP gesammelt', ok: s => levelOf(s.xp) >= 5 },
  { id: 'l10', code: 'LV10', name: 'Level 10', desc: '4050 XP gesammelt', ok: s => levelOf(s.xp) >= 10 },
  { id: 'master', code: '80%', name: 'Fachmeister', desc: 'Ein Fach zu 80 % sicher', ok: () => S.subjects.some(x => { const c = cardsOf(x.id); return c.length >= 5 && progress(c) >= 80; }) },
  { id: 'hour', code: '60M', name: 'Marathon', desc: '60 Minuten gelernt', ok: s => s.studySec >= 3600 },
  { id: 'upload', code: 'DOC', name: 'Eigenes Material', desc: 'Ersten Lernzettel hochgeladen', ok: s => s.stats.uploads >= 1 },
  { id: 'plan', code: 'PLAN', name: 'Stratege', desc: 'Einen Test eingetragen', ok: s => s.stats.testsAdded >= 1 },
  { id: 'game', code: 'GG', name: 'Pausen-Profi', desc: 'Runner: 30 Hindernisse', ok: s => s.scores.runner >= 30 },
  { id: 'night', code: '22H', name: 'Nachteule', desc: 'Nach 22 Uhr gelernt', ok: s => s.stats.night >= 1 },
  { id: 'jarvis', code: 'J.', name: 'Hallo JARVIS', desc: 'Mit JARVIS gesprochen', ok: s => s.stats.jarvis >= 1 },
  { id: 'voice', code: 'MIC', name: 'Auf Zuruf', desc: 'Ersten Sprachbefehl gegeben', ok: s => s.stats.voice >= 1 },
  { id: 'exam1', code: 'NOTE1', name: 'Sehr gut', desc: 'Prüfungssimulation mit Note 1', ok: s => (s.exams || []).some(e => e.note === 1) },
  { id: 'focus', code: 'FOK', name: 'Tunnelblick', desc: 'Einen Fokusblock durchgezogen', ok: s => (s.stats.focus || 0) >= 1 },
  { id: 'goals', code: '3/3', name: 'Tagesziel', desc: 'Alle drei Tages-Challenges geschafft', ok: s => (s.stats.goalDays || 0) >= 1 },
  { id: 'level', code: 'LVL', name: 'Levelbezwinger', desc: 'Ein Runner-Level geschafft', ok: s => Object.values(s.runner?.levels || {}).some(v => v >= 100) },
  // geheim: erst nach dem Finden sichtbar (eggs.js setzt S.eggs.*)
  ...[['konami', '↑↑↓↓', 'Cheat-Code', 'Die alte Tastenkombination'], ['logo', 'LOGO', 'Neugierig', 'Das Logo genauer untersucht'], ['leet', '1337', 'Elite', 'Um 13:37 Uhr in LernHub'],
    ['early', '5H', 'Frühaufsteher', 'Vor 6 Uhr morgens gelernt'], ['combo', 'x25', 'Im Flow', '25 richtige Antworten am Stück'], ['roll', '360°', 'Fassrolle', 'LernHub einmal umgedreht'],
    ['shake', 'WACK', 'Wachgerüttelt', 'Das Handy geschüttelt'], ['miser', '$$$', 'Dagobert', 'Die Münzen gezählt']]
    .map(([id, code, name, desc]) => ({ id: 'egg-' + id, code, name, desc, secret: true, ok: s => !!(s.eggs || {})[id] }))
];
function checkBadges() {
  for (const b of BADGES) if (!S.badges.includes(b.id) && b.ok(S)) {
    S.badges.push(b.id);
    setTimeout(() => { toast(b.code, 'Abzeichen freigeschaltet', b.name); confetti(60); }, 350);
  }
}

// ---------- Meter, HUD ----------
function meter(pct, n = 20, opts = {}) {
  const on = Math.round(pct / 100 * n);
  return `<div class="meter ${opts.cls || ''}" style="--n:${n};${opts.color ? `--accent:${opts.color};` : ''}${opts.h ? `--h:${opts.h}px` : ''}" data-on="${on}">${Array.from({ length: n }, (_, k) => `<i style="--k:${k}"></i>`).join('')}</div>`;
}
function lightMeters(root = document) {
  $$('.meter[data-on]', root).forEach(m => {
    const on = +m.dataset.on, items = [...m.children];
    items.forEach((i, k) => { i.classList.toggle('on', k < on); i.classList.toggle('peak', k < on && k >= items.length - 2); });
  });
}
function setMeter(el, pct) {
  if (!el) return;
  const n = +getComputedStyle(el).getPropertyValue('--n') || 20;
  if (el.children.length !== n) el.innerHTML = Array.from({ length: n }, (_, k) => `<i style="--k:${k}"></i>`).join('');
  el.dataset.on = Math.round(Math.max(0, Math.min(100, pct)) / 100 * n);
  lightMeters(el.parentElement);
}
function hud() {
  const l = levelOf(S.xp), a = xpFor(l), b = xpFor(l + 1), pct = (S.xp - a) / (b - a) * 100;
  $('#hud-lvl').textContent = l;
  $('#hud-xp').textContent = `${S.xp - a} / ${b - a} XP`;
  setMeter($('#hud-meter'), pct);
  $('#hud-streak').textContent = `${streakNow()} T`;
  $('#hud-coins').textContent = S.coins;
  hudBreak();
}
function hudBreak() {
  $('#hud-break').textContent = mmss(S.breakBank);
  $('#hud-next').textContent = mmss(Math.max(0, learnSec() - S.learnTick));
  const nb = $('#nav-break');
  if (S.breakBank >= 60 && !nb.querySelector('.badge-dot')) nb.insertAdjacentHTML('beforeend', '<span class="badge-dot"></span>');
  if (S.breakBank < 60) nb.querySelector('.badge-dot')?.remove();
}

// ---------- Effekte ----------
function xpPop(txt, el, good) {
  const r = el.getBoundingClientRect(), f = document.createElement('div');
  f.className = 'xp-pop'; f.textContent = txt; if (!good) f.style.color = 'var(--ink-3)';
  f.style.left = (r.left + r.width / 2 - 28) + 'px'; f.style.top = (r.top + 6) + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 1100);
}
function toast(code, title, sub) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="code">${esc(code)}</span><div><b>${esc(title)}</b><small>${esc(sub || '')}</small></div>`;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 4200);
}
function levelUp(l) {
  const o = document.createElement('div');
  o.className = 'lvlup';
  o.innerHTML = `<div><small>LEVEL UP</small><b>${pad(l)}</b>${meter(0, 24, { h: 10 })}</div>`;
  document.body.appendChild(o);
  const m = o.querySelector('.meter');
  setTimeout(() => { m.dataset.on = 24; lightMeters(o); }, 250);
  setTimeout(() => o.remove(), 2700);
  confetti(160);
}
const cvs = $('#confetti'), cctx = cvs.getContext('2d');
let parts = [], craf = 0;
function confetti(n = 120) {
  if (reduced()) return;
  cvs.width = innerWidth; cvs.height = innerHeight;
  const cols = [getComputedStyle(document.documentElement).getPropertyValue('--signal').trim() || '#2f4fe0', '#ffd43b', '#2f9e44', '#e8590c', '#d6336c'];
  for (let i = 0; i < n; i++) parts.push({ x: innerWidth / 2 + (Math.random() - .5) * 240, y: innerHeight * .42, vx: (Math.random() - .5) * 15, vy: -Math.random() * 14 - 4, w: Math.random() * 7 + 3, rot: Math.random() * 6, vr: (Math.random() - .5) * .35, c: cols[i % cols.length], life: 1 });
  if (!craf) craf = requestAnimationFrame(cloop);
}
function cloop() {
  cctx.clearRect(0, 0, cvs.width, cvs.height);
  for (const p of parts) {
    p.vy += .36; p.vx *= .986; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .007;
    cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot); cctx.globalAlpha = Math.max(0, p.life); cctx.fillStyle = p.c; cctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); cctx.restore();
  }
  parts = parts.filter(p => p.life > 0 && p.y < cvs.height + 30);
  craf = parts.length ? requestAnimationFrame(cloop) : (cctx.clearRect(0, 0, cvs.width, cvs.height), 0);
}
function countUp(root) {
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count, dur = reduced() ? 0 : 900, t0 = performance.now();
    const step = t => { const k = dur ? Math.min(1, (t - t0) / dur) : 1; el.textContent = Math.round(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

// ---------- Modals ----------
function openModal(html, onMount) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="panel modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(bg);
  bg.close = close;
  onMount?.(bg, close);
  setTimeout(() => bg.querySelector('input, textarea, [autofocus]')?.focus(), 60);
  return bg;
}
function confirmModal({ title, detail, ok = 'Bestätigen', danger = false, code = false }) {
  return new Promise(resolve => {
    let done = false;
    const m = openModal(`<h3>${esc(title)}</h3>${detail ? (code ? `<pre style="margin-top:14px">${esc(detail)}</pre>` : `<p class="lede">${esc(detail)}</p>`) : ''}
      <div class="row" style="justify-content:flex-end;margin-top:20px"><button class="btn ghost" data-r="0">Abbrechen</button><button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(ok)}</button></div>`,
      (bg, close) => bg.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { done = true; resolve(b.dataset.r === '1'); close(); } }));
    const obs = new MutationObserver(() => { if (!document.body.contains(m)) { obs.disconnect(); if (!done) resolve(false); } });
    obs.observe(document.body, { childList: true });
  });
}
function promptModal({ title, label, value = '', ok = 'Speichern' }) {
  return new Promise(resolve => {
    openModal(`<h3>${esc(title)}</h3><form id="pm" style="margin-top:16px"><div class="field"><label>${esc(label)}</label><input class="input" name="v" value="${esc(value)}" maxlength="80"></div>
      <div class="row" style="justify-content:flex-end;margin-top:18px"><button type="button" class="btn ghost" data-x>Abbrechen</button><button class="btn primary">${esc(ok)}</button></div></form>`,
      (bg, close) => {
        bg.querySelector('[data-x]').onclick = () => { resolve(null); close(); };
        bg.querySelector('#pm').onsubmit = e => { e.preventDefault(); resolve(e.target.v.value.trim() || null); close(); };
      });
  });
}

// ---------- Lernplan ----------
const upcoming = () => S.tests.filter(t => t.date >= dkey() && subj(t.subjectId)).sort((a, b) => a.date.localeCompare(b.date));
const PLAN_DAYS = 6;
function buildPlan(test) {
  const s = subj(test.subjectId); if (!s) return [];
  const days = [];
  // Nur die letzte Woche vor dem Test planen, nicht jeden Tag bis zu einem Test in Monaten
  for (let d = new Date(Math.max(parseKey(dkey()), addDays(parseKey(test.date), -PLAN_DAYS))); dkey(d) < test.date; d = addDays(d, 1)) days.push(dkey(d));
  if (!days.length) return [];
  const all = s.topics.map(t => t.id);
  const final = { date: days[days.length - 1], topics: all, label: days.length === 1 ? 'Crash-Wiederholung: alles' : 'Generalprobe: Quiz über alles', final: true };
  if (days.length === 1 || !s.topics.length) return days.length === 1 ? [final] : [...days.slice(0, -1).map(date => ({ date, topics: all, label: 'Gemischte Wiederholung' })), final];
  const slots = days.slice(0, -1).map(date => ({ date, topics: [] }));
  s.topics.forEach((t, i) => slots[i % slots.length].topics.push(t.id));
  const weak = [...s.topics].sort((a, b) => progress(cardsOf(s.id, [a.id])) - progress(cardsOf(s.id, [b.id])));
  let j = 0;
  slots.forEach(x => { if (!x.topics.length) { x.topics.push(weak[j++ % weak.length].id); x.repeat = true; } });
  slots.forEach(x => x.label = (x.repeat ? 'Wiederholen: ' : '') + x.topics.map(id => topicOf(s.id, id)?.name).join(' + '));
  return [...slots, final];
}
// Fächer mit 4 oder 5 kommen beim Lernen zuerst dran
const riskIds = () => (LH.school?.atRisk() || []).map(x => x.s.id);
function todayTasks() {
  const risk = riskIds();
  return upcoming().sort((a, b) => risk.includes(b.subjectId) - risk.includes(a.subjectId)).map(t => { const p = buildPlan(t).find(x => x.date === dkey()); return p && { test: t, p, done: !!S.planDone[`${t.id}|${p.date}`] }; }).filter(Boolean);
}
function weakestTopic(sid) {
  const list = S.subjects.filter(s => !sid || s.id === sid).flatMap(s => s.topics.filter(t => t.cards.length).map(t => ({ s, t, p: progress(cardsOf(s.id, [t.id])) })));
  const risk = sid ? [] : riskIds();
  return list.sort((a, b) => (risk.includes(b.s.id) - risk.includes(a.s.id)) || a.p - b.p)[0] || null;
}
function contextString() {
  return [
    `Level ${levelOf(S.xp)}, ${S.xp} XP, Streak ${streakNow()} Tage, ${S.coins} Münzen, Pausenzeit ${mmss(S.breakBank)}.`,
    'Tests: ' + (upcoming().map(t => `${t.title} (${subj(t.subjectId).name}) am ${t.date}`).join('; ') || 'keine eingetragen'),
    'Fächer: ' + (S.subjects.map(s => `${s.name} ${progress(cardsOf(s.id))}% [${s.topics.map(t => t.name).join(', ')}]`).join(' | ') || 'keine'),
    (w => w ? `Schwächstes Thema: ${w.t.name} (${w.s.name}, ${w.p}%)` : '')(weakestTopic()),
    LH.school?.gradeSummary() || ''
  ].filter(Boolean).join('\n');
}

// ---------- Router ----------
let current = { name: 'home', args: {} };
const NAV_OF = { today: 'home', read: 'subjects', aiexam: 'subjects', vocab: 'subjects', subject: 'subjects', session: 'subjects', drill: 'subjects', game: 'break', levels: 'break', editor: 'break' };
const VIEWS = {};
function moveInd() {
  const a = $('.nav-btn.active'), ind = $('#nav-ind');
  if (!a) { ind.style.opacity = 0; return; }
  ind.style.opacity = 1; ind.style.transform = `translateY(${a.offsetTop}px)`;
}
function go(name, args = {}) {
  const view = $('#view');
  if (current.name === 'game' && name !== 'game') LH.games?.stop();
  const render = () => {
    current = { name, args };
    document.body.dataset.view = name; // am Handy: Leiste während einer Lernrunde ausblenden
    view.innerHTML = `<div class="wrap">${VIEWS[name].html(args)}</div>`;
    view.scrollTop = 0;
    $$('.nav-btn[data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === (NAV_OF[name] || name)));
    moveInd();
    view.classList.remove('leave');
    const wrap = view.firstElementChild;
    [...wrap.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 12)));
    if (!reduced()) { wrap.classList.add('view-enter'); setTimeout(() => wrap.classList.remove('view-enter'), 1200); }
    requestAnimationFrame(() => requestAnimationFrame(() => lightMeters(view)));
    countUp(view);
    updateCountdowns();
    VIEWS[name].mount?.(args);
  };
  if (reduced() || !view.innerHTML) return render();
  view.classList.add('leave');
  setTimeout(render, 150);
}
const rerender = () => { const y = $('#view').scrollTop; const n = current; current = { name: '' }; VIEWS[n.name] && (() => { const v = $('#view'); v.innerHTML = `<div class="wrap">${VIEWS[n.name].html(n.args)}</div>`; current = n; lightMeters(v); countUp(v); updateCountdowns(); VIEWS[n.name].mount?.(n.args); v.scrollTop = y; })(); };

function countdown(k, small) {
  return `<div class="cd ${small ? 'small' : ''}" data-cd="${k}">${['Tage', 'Std', 'Min', 'Sek'].map((l, i) => `${i ? '<span class="colon">:</span>' : ''}<div class="u"><b>00</b><span>${l}</span></div>`).join('')}</div>`;
}
function updateCountdowns() {
  $$('[data-cd]').forEach(el => {
    const t = parseKey(el.dataset.cd); t.setHours(8, 0, 0, 0);
    const d = Math.max(0, (t - Date.now()) / 1000);
    const v = [Math.floor(d / 86400), Math.floor(d % 86400 / 3600), Math.floor(d % 3600 / 60), Math.floor(d % 60)];
    el.querySelectorAll('.u b').forEach((b, i) => { const s = pad(v[i]); if (b.textContent !== s) b.innerHTML = reduced() ? s : `<span class="digit-roll">${s}</span>`; });
  });
}

// ---------- Start ----------
VIEWS.home = {
  html() {
    const h = new Date().getHours();
    const greet = h < 11 ? 'Guten Morgen' : h < 18 ? 'Servus' : 'Guten Abend';
    const next = upcoming()[0], ns = next && subj(next.subjectId);
    const tasks = todayTasks(), weak = weakestTopic(next?.subjectId);
    const soon = upcoming().filter(t => t.date <= dkey(addDays(new Date(), 7)));
    const hw = LH.school.openHw().filter(x => LH.school.daysTo(x.due) <= 1);
    const mk = LH.modes?.mistakes().length || 0, due = LH.modes?.due().length || 0;
    const mins = S.history[dkey()] || 0, goal = Math.max(5, Math.round(S.settings.weekGoal / 7));
    const open = tasks.filter(t => !t.done).length + hw.length + (due ? 1 : 0);
    const week = Array.from({ length: 7 }, (_, i) => { const d = addDays(new Date(), i - 6); return { l: d.toLocaleDateString('de-AT', { weekday: 'short' }).slice(0, 2), m: S.history[dkey(d)] || 0 }; });
    const maxM = Math.max(30, ...week.map(w => w.m));
    const lede = (next ? `${esc(next.title)} ist ${fmtDay(next.date) === 'Heute' ? 'heute' : fmtDay(next.date) === 'Morgen' ? 'morgen' : 'am ' + fmtDay(next.date)}.` : 'Kein Test eingetragen.')
      + ` ${open ? `Heute noch ${open} ${open === 1 ? 'Sache' : 'Sachen'} offen,` : 'Für heute ist alles erledigt,'} ${mins} von ${goal} Minuten gelernt.`;
    const risk = LH.school.atRisk(), missing = missingNotes();
    return `
      <div class="eyebrow">${fmtLong(dkey())}</div>
      <h1 class="h1">${esc(hello(greet))}</h1>
      <p class="lede">${lede}</p>
      ${missing.length ? `<div class="panel pad risk warn-notes" style="margin-top:22px"><b>Lernzettel fehlen</b>${missing.slice(0, 3).map(t => `<div class="task" style="--accent:${subj(t.subjectId).color}"><span class="sw"></span><div class="t"><b>${esc(t.title)} · ${fmtDay(t.date)}</b><small>Für ${esc(subj(t.subjectId).name)} gibt es noch keine Karten – ohne Lernzettel kann LernHub nichts planen.</small></div><button class="btn sm primary" data-action="open-subject" data-sid="${t.subjectId}">Hochladen</button></div>`).join('')}${missing.length > 3 ? `<p class="muted" style="font-size:13px;margin-top:8px">… und ${missing.length - 3} weitere</p>` : ''}</div>` : ''}
      ${risk.length ? `<div class="panel pad risk" style="margin-top:16px"><b>Notenwarnung</b>${risk.map(x => { const w = weakestTopic(x.s.id);
        return `<div class="task" style="--accent:${x.s.color}"><span class="sw"></span><div class="t"><b>${esc(x.s.name)} steht auf ${x.note === 5 ? '5' : '4'} <span class="mono muted">(${x.a.toFixed(2).replace('.', ',')})</span></b><small>${esc(x.tip || 'Jetzt dranbleiben.')}${x.s.untis && /^SYT/i.test(x.s.untis) ? ' Ein negativer SYT-Teil macht die ganze SYT-Note negativ.' : ''}</small></div>${w ? `<button class="btn sm primary" data-action="start" data-mode="flash" data-sid="${x.s.id}" data-tids="${w.t.id}">Lernen</button>` : `<button class="btn sm" data-action="open-subject" data-sid="${x.s.id}">Lernzettel</button>`}</div>`; }).join('')}</div>` : ''}
      ${LH.timetable?.homeCard() || ''}
      <div class="grid-2" style="margin-top:16px">
        ${next ? `<div class="panel next-test screws" style="--accent:${ns.color}">
          <div class="eyebrow" style="margin-top:6px"><span class="dot"></span>Countdown · ${esc(ns.name)}</div>
          <h3>${esc(next.title)}</h3>
          ${countdown(next.date)}
          <div class="row" style="margin-top:24px"><button class="btn primary" data-action="start" data-mode="quiz" data-sid="${ns.id}">Quiz starten</button><button class="btn ghost" data-go="plan">Lernplan ansehen</button></div>
        </div>` : `<div class="panel next-test screws">
          <div class="eyebrow" style="margin-top:6px">Countdown</div><h3>Noch kein Test geplant</h3>
          <p class="muted" style="margin-bottom:22px">Datum und Fach reichen. Den Rest plant LernHub.</p>
          <button class="btn primary" data-go="plan">Test eintragen</button></div>`}
        <div class="panel pad">
          <div class="row" style="justify-content:space-between;margin-bottom:6px"><b>Heute lernen</b>${tasks.length ? `<span class="mono muted" style="font-size:11px">${tasks.filter(t => t.done).length}/${tasks.length} erledigt</span>` : ''}</div>
          <div class="tasks">
            ${tasks.map(planTask).join('')}
            ${!tasks.length && weak ? weakTask(weak) : ''}
            ${due ? `<div class="task" style="--accent:var(--signal)"><span class="sw"></span><div class="t"><b>Wiederholen</b><small>${due} ${due === 1 ? 'Karte ist' : 'Karten sind'} heute fällig</small></div><button class="btn sm primary" data-action="due">Los</button></div>` : ''}
            ${mk ? `<div class="task" style="--accent:var(--bad)"><span class="sw"></span><div class="t"><b>Fehlerheft</b><small>${mk} ${mk === 1 ? 'Karte wartet' : 'Karten warten'}</small></div><button class="btn sm" data-go="mistakes">Üben</button></div>` : ''}
            ${!tasks.length && !weak ? `<div class="task"><span class="sw"></span><div class="t"><b>Lernzettel hochladen</b><small>Lege ein Fach an und lade deinen ersten Zettel hoch</small></div><button class="btn sm" data-go="subjects">Fächer</button></div>` : ''}
          </div>
          <div style="margin-top:14px">${meter(Math.min(100, Math.round(mins / goal * 100)), 20)}</div>
          <button class="btn ghost sm" style="margin-top:12px" data-action="jarvis-ask" data-q="Was soll ich heute lernen?">JARVIS fragen</button>
        </div>
      </div>
      ${soon.length > 1 ? `<div class="panel pad" style="margin-top:16px"><b>Tests in den nächsten 7 Tagen</b><div class="tasks" style="margin-top:6px">${soon.map(t => `<div class="task" style="--accent:${subj(t.subjectId).color}"><span class="sw"></span><div class="t"><b>${esc(t.title)}</b><small>${esc(subj(t.subjectId).name)} · ${fmtDay(t.date)}</small></div><button class="btn sm" data-action="start" data-mode="quiz" data-sid="${t.subjectId}">Quiz</button></div>`).join('')}</div></div>` : ''}
      ${LH.homeExtras ? LH.homeExtras() : ''}
      <h2 class="h2">Fächer <span class="mono">${S.subjects.length}</span></h2>
      <div class="cards">${S.subjects.map(subjCard).join('')}${addCard()}</div>
      <h2 class="h2">Diese Woche <span class="mono">Minuten</span></h2>
      <div class="panel week"><div class="cols">${week.map((w, c) => { const n = 12, on = Math.round(w.m / maxM * n); return `<div class="col ${c === 6 ? 'today' : ''}"><em>${w.m}</em><div class="stack">${Array.from({ length: n }, (_, k) => `<i class="${k < on ? 'on' : ''}" style="--k:${k};--c:${c}"></i>`).join('')}</div><span>${w.l}</span></div>`; }).join('')}</div></div>`;
  }
};
// Test-Check: Tests in den nächsten 7 Tagen, für deren Fach es noch keine Karten gibt
const missingNotes = () => upcoming().filter(t => t.date <= dkey(addDays(new Date(), 7)) && !cardsOf(t.subjectId).length);
const planTask = ({ test, p, done }) => `<div class="task ${done ? 'done' : ''}" style="--accent:${subj(test.subjectId).color}"><span class="sw"></span><div class="t"><b>${esc(p.label)}</b><small>${esc(test.title)} · ${esc(subj(test.subjectId).name)}</small></div>${done ? '<span style="color:var(--ok);font-size:13px;font-weight:650">Erledigt ✓</span>' : `<button class="btn sm" data-action="plan-start" data-test="${test.id}">Los</button>`}</div>`;
const weakTask = w => `<div class="task" style="--accent:${w.s.color}"><span class="sw"></span><div class="t"><b>${esc(w.t.name)}</b><small>${esc(w.s.name)} · ${w.p} % sicher</small></div><button class="btn sm" data-action="start" data-mode="flash" data-sid="${w.s.id}" data-tids="${w.t.id}">Los</button></div>`;
// „Heute“ ist jetzt Teil der Startseite (alte Links/JARVIS führen dorthin)
VIEWS.today = { html: () => VIEWS.home.html() };

function subjCard(s) {
  const cards = cardsOf(s.id), p = progress(cards);
  return `<div class="panel subj link" style="--accent:${s.color}" data-action="open-subject" data-sid="${s.id}" tabindex="0" role="button">
    <span class="bar"></span>
    <div><h3>${esc(s.name)}</h3><p>${esc(s.desc || `${s.topics.length} Lernzettel`)}</p></div>
    <div class="foot"><div class="nums"><span><b>${s.topics.length}</b> Zettel · <b>${cards.length}</b> Karten</span><b>${p} %</b></div>${meter(p, 20)}</div>
  </div>`;
}
const addCard = () => `<button class="panel subj add link" data-action="new-subject"><span class="plus">+</span><b>Neues Fach</b><small class="muted">z. B. Englisch, NWT, AM</small></button>`;

// ---------- Fächer ----------
VIEWS.subjects = {
  html: () => `
    <div class="page-head"><div><div class="eyebrow">Fächer</div><h1 class="h1">Was steht an?</h1><p class="lede">Leg für jedes Fach deine Lernzettel ab. Aus jedem Zettel werden Karteikarten und Quizfragen.</p></div>
    <div class="row"><button class="btn" data-action="import-cards">Karten importieren</button><button class="btn primary" data-action="new-subject">${ICON.plus}Neues Fach</button></div></div>
    <input type="file" id="import-in" accept=".json,application/json" hidden>
    <div class="cards" style="margin-top:26px">${S.subjects.map(subjCard).join('')}${addCard()}</div>`
};

function subjectModal(s) {
  const edit = !!s;
  s = s || { name: '', desc: '', color: COLORS.find(c => !S.subjects.some(x => x.color === c)) || COLORS[0] };
  openModal(`<h3>${edit ? 'Fach bearbeiten' : 'Neues Fach'}</h3><p class="lede">${edit ? 'Name, Beschreibung und Farbe ändern.' : 'Danach lädst du die Lernzettel hoch.'}</p>
    <form id="sf" style="display:flex;flex-direction:column;gap:14px">
      <div class="field"><label>Name</label><input class="input" name="name" value="${esc(s.name)}" placeholder="z. B. Englisch" maxlength="30" required></div>
      <div class="field"><label>Kurzbeschreibung</label><input class="input" name="desc" value="${esc(s.desc)}" placeholder="z. B. Unit 3–5, Past Perfect" maxlength="60"></div>
      <div class="field"><label>Farbe</label><div class="swatches">${COLORS.map(c => `<button type="button" class="swatch ${c === s.color ? 'sel' : ''}" style="--c:${c}" data-c="${c}" aria-label="Farbe ${c}"></button>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-end;margin-top:6px"><button type="button" class="btn ghost" data-x>Abbrechen</button><button class="btn primary">${edit ? 'Speichern' : 'Fach anlegen'}</button></div>
    </form>`, (bg, close) => {
    let color = s.color;
    bg.querySelector('[data-x]').onclick = close;
    bg.querySelectorAll('.swatch').forEach(b => b.onclick = () => { color = b.dataset.c; bg.querySelectorAll('.swatch').forEach(x => x.classList.toggle('sel', x === b)); });
    bg.querySelector('#sf').onsubmit = e => {
      e.preventDefault();
      const name = e.target.name.value.trim(); if (!name) return;
      if (edit) Object.assign(s, { name, desc: e.target.desc.value.trim(), color });
      else { const n = { id: uid('s'), name, desc: e.target.desc.value.trim(), color, topics: [] }; S.subjects.push(n); s = n; }
      save(); close(); go('subject', { sid: s.id });
    };
  });
}

VIEWS.subject = {
  html({ sid }) {
    const s = subj(sid);
    if (!s) return '<div class="panel empty"><b>Fach nicht gefunden</b></div>';
    const cards = cardsOf(s.id), p = progress(cards);
    return `<div style="--accent:${s.color}">
      <button class="back" data-go="subjects">← Alle Fächer</button>
      <div class="page-head">
        <div><div class="eyebrow"><span class="dot"></span>${s.topics.length} Lernzettel · ${cards.length} Karten</div><h1 class="h1">${esc(s.name)}</h1><p class="lede">${esc(s.desc || '')}</p></div>
        <div class="row">
          <button class="icon-btn" data-action="edit-subject" data-sid="${s.id}" aria-label="Fach bearbeiten">${ICON.edit}</button>
          <button class="icon-btn danger" data-action="del-subject" data-sid="${s.id}" aria-label="Fach löschen">${ICON.trash}</button>
          <button class="btn" data-action="share-subject" data-sid="${s.id}" ${cards.length ? '' : 'disabled'}>Teilen</button>
          <button class="btn" data-action="start" data-mode="flash" data-sid="${s.id}" ${cards.length ? '' : 'disabled'}>Karteikarten</button>
          <button class="btn" data-action="start" data-mode="quiz" data-sid="${s.id}" ${cards.length >= 2 ? '' : 'disabled'}>Quiz</button>
          <button class="btn primary" data-action="modes" data-sid="${s.id}">Alle Lernmodi</button>
        </div>
      </div>
      <div class="row" style="margin-top:22px;gap:16px"><span class="mono" style="font-size:28px;font-weight:600">${p}<span class="muted" style="font-size:14px"> %</span></span><div style="flex:1">${meter(p, 40, { h: 10 })}</div></div>
      <div class="drop" id="drop">
        <span class="ic">${ICON.up}</span>
        <div class="t"><b class="d-only">Lernzettel hierher ziehen</b><b class="m-only">Lernzettel hinzufügen</b><small>PDF, Word, HTML, Text oder Foto. Mit API-Key schreibt JARVIS die Fragen, sonst erkennt LernHub „Begriff: Erklärung“-Zeilen.</small><div class="busy" id="busy" hidden><span class="spinner"></span><span id="busy-t"></span></div></div>
        <div class="row"><button class="btn" data-action="paste" data-sid="${s.id}">${ICON.text}Text einfügen</button><button class="btn primary" data-action="upload" data-sid="${s.id}">Datei wählen</button></div>
        <input type="file" id="file-in" multiple accept=".txt,.md,.html,.htm,.csv,.pdf,.docx,.png,.jpg,.jpeg,.webp" hidden>
      </div>
      ${LH.vocab?.section(s) || ''}
      <div class="row" style="justify-content:space-between;align-items:center"><h2 class="h2">Lernzettel <span class="mono">${s.topics.length}</span></h2>${s.topics.length ? `<button class="btn sm ghost" data-action="archive-topics" data-sid="${s.id}">Test abschließen</button>` : ''}</div>
      ${archiveHint(s)}
      ${s.topics.length ? s.topics.map((t, i) => topicHtml(s, t, i)).join('') : `<div class="panel empty"><b>Noch keine Lernzettel${s.archive?.length ? ' für den nächsten Test' : ''}</b>Lade oben deinen ersten Zettel hoch.</div>`}
      ${archiveHtml(s)}
    </div>`;
  },
  mount({ sid }) {
    const drop = $('#drop'); if (!drop) return;
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => handleFiles(sid, [...e.dataTransfer.files]));
    $('#file-in').addEventListener('change', e => handleFiles(sid, [...e.target.files]));
  }
};
// ---------- Lernzettel lesen (zählt als Lernzeit) ----------
let readUrl = null;
VIEWS.read = {
  html({ sid, tid }) {
    const s = subj(sid), t = topicOf(sid, tid);
    if (!t) return '<p class="muted">Lernzettel nicht gefunden.</p>';
    return `<div class="row" style="justify-content:space-between;align-items:flex-end;gap:12px">
        <div><div class="eyebrow">${esc(s.name)} · Lesen zählt als Lernzeit</div><h1 class="h1" style="margin-bottom:0">${esc(t.name)}</h1></div>
        <div class="row"><button class="btn sm ghost" data-action="open-subject" data-sid="${sid}">Zurück</button><button class="btn sm ghost" data-action="open-file" data-path="${esc(t.file?.stored || '')}">Extern öffnen</button>${t.cards.length ? `<button class="btn sm primary" data-action="start" data-mode="flash" data-sid="${sid}" data-tids="${tid}">Karten lernen</button>` : ''}</div>
      </div>
      <div class="reader-wrap" style="margin-top:20px"><div id="reader" class="reader"><div class="panel pad muted">Lädt …</div></div><aside class="reader-marks panel pad" id="marks"></aside></div>`;
  },
  async mount({ sid, tid }) {
    const t = topicOf(sid, tid), box = $('#reader'); if (!t?.file || !box) return;
    const r = await API.files.read(t.file.stored);
    if (current.name !== 'read' || !box.isConnected) return;
    if (readUrl) { URL.revokeObjectURL(readUrl); readUrl = null; }
    if (r.error) { box.innerHTML = `<div class="panel pad">${esc(r.error)}</div>`; return; }
    if (r.base64) readUrl = URL.createObjectURL(new Blob([Uint8Array.from(atob(r.base64), c => c.charCodeAt(0))], { type: r.mime }));
    // HTML-Lernzettel: Original-Ansicht wie im Browser (eigene Formatierung, Tabs, Quiz)
    const html = /\.html?$/i.test(t.file.name || '') && API.files.viewUrl ? await API.files.viewUrl(t.file.stored).catch(() => null) : null;
    if (current.name !== 'read' || !box.isConnected) return;
    READ = { t, sid, r, html, mode: r.kind === 'text' && !html ? 'text' : 'orig' };
    drawReader();
  }
};
// Markieren: im Text Stellen auswählen → gelb markiert, gespeichert am Lernzettel, auf Wunsch als Karteikarte
let READ = null;
function markedText(text, marks) {
  const spans = [];
  for (const m of marks) { const i = text.indexOf(m.text); if (i >= 0 && !spans.some(s => i < s.e && i + m.text.length > s.i)) spans.push({ i, e: i + m.text.length, id: m.id }); }
  spans.sort((a, b) => a.i - b.i);
  let out = '', at = 0;
  for (const s of spans) { out += esc(text.slice(at, s.i)) + `<mark data-mid="${s.id}">${esc(text.slice(s.i, s.e))}</mark>`; at = s.e; }
  return out + esc(text.slice(at));
}
function drawReader() {
  const { t, r, mode } = READ, box = $('#reader'), marks = (t.marks ||= []);
  if (!box) return;
  const canText = !!(r.text || '').trim(), tabs = (r.kind !== 'text' || READ.html) && canText
    ? `<div class="seg" role="group" aria-label="Ansicht" style="margin-bottom:12px"><button type="button" data-rd="orig" class="${mode === 'orig' ? 'on' : ''}" aria-pressed="${mode === 'orig'}">${READ.html ? 'Original' : r.kind === 'pdf' ? 'PDF' : 'Bild'}</button><button type="button" data-rd="text" class="${mode === 'text' ? 'on' : ''}" aria-pressed="${mode === 'text'}">Text zum Markieren</button></div>` : '';
  box.innerHTML = tabs + (mode === 'text'
    ? `<div class="panel pad reader-text" id="rd-text">${canText ? markedText(r.text, marks) : 'Kein Text gefunden.'}</div>`
    // sandbox ohne allow-same-origin: der Lernzettel darf eigene Skripte ausführen, aber nicht auf LernHub zugreifen
    : READ.html ? `<iframe class="reader-pdf reader-html" src="${esc(READ.html)}" sandbox="allow-scripts allow-popups allow-forms allow-modals" title="${esc(t.name)}"></iframe>`
    : r.kind === 'pdf' ? (IS_MOBILE ? '<div class="reader-pdfjs" id="rd-pdf"><div class="panel pad muted">PDF wird geladen …</div></div>' : `<iframe class="reader-pdf" src="${readUrl}" title="${esc(t.name)}"></iframe>`) : `<img class="reader-img" src="${readUrl}" alt="${esc(t.name)}">`);
  // Handy-Browser zeigen PDFs nicht in der Seite an: Seiten mit pdf.js zeichnen
  if (IS_MOBILE && mode !== 'text' && r.kind === 'pdf') window.LHPdf.render($('#rd-pdf'), r.data).catch(e => { const b = $('#rd-pdf'); if (b) b.innerHTML = `<div class="panel pad">${esc(e.message)}</div>`; });
  $('#marks').innerHTML = `<b>Markierungen <span class="mono muted">${marks.length}</span></b>
    ${marks.length ? marks.map(m => `<div class="mark-item" data-mid="${m.id}"><p>${esc(m.text)}</p><div class="row" style="gap:6px"><button class="btn sm" data-rd="card">${m.card ? 'Karte ✓' : 'Als Karte'}</button><button class="btn sm ghost" data-rd="explain">Erklären</button><button class="icon-btn danger" data-rd="unmark" aria-label="Markierung löschen">${ICON.trash}</button></div></div>`).join('')
    : `<p class="muted" style="font-size:13px;margin-top:8px">${mode === 'text' ? 'Text mit der Maus auswählen, dann „Markieren“ klicken.' : canText ? 'Zum Markieren oben auf „Text zum Markieren“ wechseln.' : 'Diese Datei hat keinen auslesbaren Text.'}</p>`}`;
}
function selInReader() {
  const sel = getSelection(), box = $('#rd-text');
  if (!sel || sel.isCollapsed || !box || !box.contains(sel.anchorNode) || !box.contains(sel.focusNode)) return null;
  // Range statt Selection: liefert den Text exakt wie im Lernzettel (mit Zeilenumbrüchen), damit er später wiedergefunden wird
  const range = sel.getRangeAt(0), text = range.toString().trim();
  return text.length >= 2 && text.length <= 600 ? { text, rect: range.getBoundingClientRect() } : null;
}
function cardFromMark(m) {
  const t = READ.t, parts = m.text.split(/\s*(?:→|->|=>|:|\s–\s|\s-\s)\s*/);
  const [q, a] = parts.length >= 2 ? [parts[0], parts.slice(1).join(': ')] : ['', m.text];
  openModal(`<h3>Karte aus Markierung</h3><form id="mc" style="display:flex;flex-direction:column;gap:12px;margin-top:14px">
    <div class="field"><label>Frage</label><input class="input" name="q" value="${esc(q)}" placeholder="Was soll gefragt werden?" required></div>
    <div class="field"><label>Antwort</label><textarea class="input" name="a" required>${esc(a)}</textarea></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>Abbrechen</button><button class="btn primary">Karte anlegen</button></div></form>`, (bg, close) => {
    bg.querySelector('[data-x]').onclick = close;
    bg.querySelector('#mc').onsubmit = e => {
      e.preventDefault(); const q = e.target.q.value.trim(), a = e.target.a.value.trim(); if (!q || !a) return;
      t.cards.push({ id: uid('c'), q, a }); m.card = true; save(); close(); drawReader();
      toast('KARTE', 'Karte angelegt', q);
    };
    setTimeout(() => bg.querySelector(q ? 'textarea' : 'input')?.focus(), 80);
  });
}
function markPop() {
  $('#mark-pop')?.remove();
  if (current.name !== 'read' || !READ) return;
  const s = selInReader(); if (!s) return;
  // am Handy unter dem Text, damit das Auswahlmenü des Systems nicht verdeckt wird
  const top = Math.min(innerHeight - 60, s.rect.bottom + (IS_MOBILE ? 44 : 8));
  document.body.insertAdjacentHTML('beforeend', `<div class="mark-pop" id="mark-pop" style="left:${Math.max(8, Math.min(innerWidth - 300, s.rect.left + s.rect.width / 2 - 140))}px;top:${top}px"><button class="btn sm primary" data-rd="mark">Markieren</button><button class="btn sm" data-rd="mark-card">Als Karte</button><button class="btn sm" data-rd="explain">Erklären</button></div>`);
}
document.addEventListener('mouseup', () => setTimeout(markPop, 0));
// Touch: die Auswahl wird mit den Ziehpunkten verändert, ohne mouseup
let selT = 0;
if (IS_MOBILE) document.addEventListener('selectionchange', () => { clearTimeout(selT); selT = setTimeout(markPop, 450); });
document.addEventListener('mousedown', e => { if (!e.target.closest('#mark-pop')) $('#mark-pop')?.remove(); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rd]'); if (!b || !READ) return;
  const a = b.dataset.rd, t = READ.t, id = b.closest('[data-mid]')?.dataset.mid, m = t.marks.find(x => x.id === id);
  if (a === 'orig' || a === 'text') { READ.mode = a; return drawReader(); }
  if (a === 'mark' || a === 'mark-card') {
    const s = selInReader(); $('#mark-pop')?.remove(); if (!s) return;
    const nm = { id: uid('m'), text: s.text };
    t.marks.push(nm); save(); getSelection().removeAllRanges(); drawReader();
    if (a === 'mark-card') cardFromMark(nm);
  }
  if (a === 'explain') {
    // aus der Seitenliste (m) oder aus der aktuellen Auswahl
    const text = m ? m.text : selInReader()?.text; $('#mark-pop')?.remove(); if (!text) return;
    if (!LH.jarvis?.hasKey) return toast('KI', 'Erklären braucht einen API-Key', 'Optionen → JARVIS: kostenloser Google-Key');
    const src = READ.r.text || '', i = src.indexOf(text), ctx = i >= 0 ? src.slice(Math.max(0, i - 1500), i + text.length + 1500) : '';
    const short = text.replace(/\s+/g, ' ').slice(0, 220) + (text.length > 220 ? ' …' : '');
    LH.jarvis.open(true);
    LH.jarvis.send(`Erklär mir diese Stelle aus „${t.name}“ (${subj(READ.sid).name}): „${short}“`,
      `Vollständige Stelle:\n${text}${ctx ? `\n\nZusammenhang im Lernzettel:\n${ctx}` : ''}\n\nErklär verständlich mit Beispiel oder Eselsbrücke.`);
  }
  if (a === 'card' && m) cardFromMark(m);
  if (a === 'unmark' && m) { t.marks = t.marks.filter(x => x !== m); save(); drawReader(); }
});

function topicHtml(s, t, i) {
  const p = progress(cardsOf(s.id, [t.id]));
  return `<div class="panel topic" data-tid="${t.id}">
    <div class="topic-head" data-action="toggle-topic">
      <span class="n">${pad(i + 1)}</span>
      <div class="nm"><b>${esc(t.name)}</b><small>${t.cards.length} Karten${t.file ? ' · ' + esc(t.file.name) : ''}</small></div>
      <div class="m">${meter(p, 14, { cls: 'thin' })}</div>
      <span class="mono muted" style="font-size:12px;width:40px;text-align:right">${p}%</span>
      ${t.file && CAN_FILES ? `<button class="btn sm ghost" data-action="read" data-sid="${s.id}" data-tid="${t.id}">Lesen</button>` : ''}
      <span class="chev">${ICON.chev}</span>
    </div>
    <div class="topic-body"><div><div class="topic-inner">
      <div class="row">
        <button class="btn sm" data-action="start" data-mode="flash" data-sid="${s.id}" data-tids="${t.id}" ${t.cards.length ? '' : 'disabled'}>Karten</button>
        <button class="btn sm" data-action="start" data-mode="quiz" data-sid="${s.id}" data-tids="${t.id}" ${t.cards.length >= 2 ? '' : 'disabled'}>Quiz</button>
        <button class="btn sm ghost" data-action="modes" data-sid="${s.id}" data-tids="${t.id}">Mehr Modi</button>
        ${t.file && API?.files?.regenerate ? `<button class="btn sm ghost" data-action="regen" data-sid="${s.id}" data-tid="${t.id}">Mit KI neu erstellen</button>` : ''}
        <span style="flex:1"></span>
        <button class="icon-btn" data-action="rename-topic" data-sid="${s.id}" data-tid="${t.id}" aria-label="Umbenennen">${ICON.edit}</button>
        <button class="icon-btn danger" data-action="del-topic" data-sid="${s.id}" data-tid="${t.id}" aria-label="Lernzettel löschen">${ICON.trash}</button>
      </div>
      ${t.summary?.length ? `<ul class="summary">${t.summary.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="qa">
        ${t.cards.map(c => `<div class="qa-row" data-cid="${c.id}"><span class="q">${esc(c.q)}</span><span class="a">${esc(c.a)}</span><span class="acts"><button class="icon-btn" data-action="edit-card" aria-label="Karte bearbeiten">${ICON.edit}</button><button class="icon-btn danger" data-action="del-card" aria-label="Karte löschen">${ICON.trash}</button></span></div>`).join('')}
        <form class="qa-row add-card" data-sid="${s.id}" data-tid="${t.id}"><input name="q" placeholder="Neue Frage" aria-label="Frage"><input name="a" placeholder="Antwort" aria-label="Antwort"><span><button class="btn sm">Hinzufügen</button></span></form>
      </div>
    </div></div></div>
  </div>`;
}

// ---------- Test abschließen: Lernzettel in einen Ordner ablegen ----------
const lastTest = s => S.tests.filter(x => x.subjectId === s.id && x.date < dkey()).sort((a, b) => b.date.localeCompare(a.date))[0];
function archiveHint(s) {
  const t = lastTest(s);
  if (!t || !s.topics.length || s.archiveSkip === t.id || (s.archive || []).some(a => a.date >= t.date) || t.date < dkey(addDays(new Date(), -30))) return '';
  return `<div class="panel pad row arch-hint"><div style="flex:1;min-width:200px"><b>${esc(t.title || 'Test')} (${fmtDay(t.date)}) ist vorbei.</b><small>Leg die Lernzettel dafür ab, dann kommt beim nächsten Test nur der neue Stoff dran.</small></div>
    <button class="btn sm ghost" data-action="skip-archive" data-sid="${s.id}" data-tid="${t.id}">Nicht jetzt</button><button class="btn sm primary" data-action="archive-topics" data-sid="${s.id}">Ablegen</button></div>`;
}
function archiveHtml(s) {
  if (!s.archive?.length) return '';
  return `<h2 class="h2" style="margin-top:28px">Abgelegte Tests <span class="mono">${s.archive.length}</span></h2>` + s.archive.map(a => `<details class="panel arch">
    <summary><div class="nm"><b>${esc(a.name)}</b><small>${a.topics.length} Lernzettel · ${a.topics.reduce((n, t) => n + t.cards.length, 0)} Karten · abgelegt ${fmtDay(a.date)}</small></div><span class="chev">${ICON.chev}</span></summary>
    <div class="arch-body">${a.topics.map(t => `<div class="arch-row"><span>${esc(t.name)}</span>${t.file && CAN_FILES ? `<button class="btn sm ghost" data-action="read" data-sid="${s.id}" data-tid="${t.id}">Lesen</button>` : ''}</div>`).join('')}
      <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn sm" data-action="restore-archive" data-sid="${s.id}" data-aid="${a.id}">Wieder zum Lernen holen</button></div></div>
  </details>`).join('');
}
function archiveModal(s, name) {
  return new Promise(resolve => {
    openModal(`<h3>Test abschließen</h3><p class="lede">Die gewählten Lernzettel kommen in einen eigenen Ordner. Beim Lernen, im Lernplan und in der Statistik zählt dann nur noch der neue Stoff. Dein Lernstand bleibt gespeichert.</p>
      <form id="am" style="margin-top:16px"><div class="field"><label>Name des Ordners</label><input class="input" name="v" value="${esc(name)}" maxlength="80"></div>
      <div class="arch-pick">${s.topics.map(t => `<label><input type="checkbox" name="t" value="${t.id}" checked><span>${esc(t.name)}</span><small class="muted">${t.cards.length} Karten</small></label>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;margin-top:18px"><button type="button" class="btn ghost" data-x>Abbrechen</button><button class="btn primary">Ablegen</button></div></form>`,
      (bg, close) => {
        bg.querySelector('[data-x]').onclick = () => { resolve(null); close(); };
        bg.querySelector('#am').onsubmit = e => { e.preventDefault(); resolve({ name: e.target.v.value.trim() || name, ids: [...e.target.querySelectorAll('[name=t]:checked')].map(x => x.value) }); close(); };
      });
  });
}

// Lernzettel importieren
function addTopics(sid, results) {
  const s = subj(sid); let n = 0, ai = false;
  for (const r of results) {
    if (r.error) { toast('FEHLER', r.file, r.error); continue; }
    for (const t of r.topics || []) {
      const cards = (t.cards || []).filter(c => c.q && c.a).map(c => ({ id: uid('c'), q: String(c.q).trim(), a: String(c.a).trim(), ...wrongOf(c) }));
      s.topics.push({ id: uid('t'), name: t.name || r.file, file: r.stored ? { name: r.file, stored: r.stored } : null, summary: (t.summary || []).slice(0, 14), cards });
      n += cards.length;
    }
    if (r.mode === 'ai') ai = true;
    if (r.warning) toast('KI', 'KI nicht erreichbar', 'Einfache Erkennung verwendet');
    S.stats.uploads++;
  }
  checkBadges(); save();
  if (results.some(r => !r.error)) toast(ai ? 'KI' : 'TXT', `${n} Karten erstellt`, ai ? 'Fragen von JARVIS geschrieben' : n ? 'Aus „Begriff: Erklärung“-Zeilen erkannt' : 'Keine Zeilen erkannt – mit API-Key klappt es besser');
  rerender();
}
function setBusy(text) { const b = $('#busy'); if (!b) return; b.hidden = !text; $('#busy-t').textContent = text || ''; }
async function handleFiles(sid, files) {
  if (!files.length) return;
  const s = subj(sid);
  if (IS_DESKTOP) {
    const paths = files.map(f => API.files.pathOf(f)).filter(Boolean);
    return importPaths(sid, paths);
  }
  if (API?.files?.importFiles) {
    const key = await API.jarvis.hasKey();
    setBusy(`${files.length} Datei(en) werden gelesen${key ? ', JARVIS schreibt die Fragen …' : ' …'}`);
    const res = await API.files.importFiles({ files, subjectName: s.name });
    setBusy(''); return addTopics(sid, res);
  }
  setBusy(`Lese ${files.length} Datei(en) …`);
  const results = [];
  for (const f of files) {
    if (!/\.(txt|md|html?|csv)$/i.test(f.name)) { results.push({ file: f.name, error: 'In der Vorschau gehen nur Textdateien – PDF, Word und Fotos in der Desktop-App' }); continue; }
    let text = await f.text();
    if (/\.html?$/i.test(f.name)) text = new DOMParser().parseFromString(text, 'text/html').body.innerText;
    results.push({ file: f.name, mode: 'offline', topics: [heuristic(f.name.replace(/\.[^.]+$/, ''), text)] });
  }
  setBusy(''); addTopics(s.id, results);
}
async function importPaths(sid, paths) {
  if (!paths.length) return;
  const s = subj(sid);
  const key = await API.jarvis.hasKey();
  setBusy(`${paths.length} Datei(en) werden gelesen${key ? ', JARVIS schreibt die Fragen …' : ' …'}`);
  const res = await API.files.import({ paths, subjectId: s.id, subjectName: s.name });
  setBusy(''); addTopics(sid, res);
}
// Falsche Antwortmöglichkeiten der KI (passen zur Frage) – sonst Antworten anderer Karten, zuerst aus demselben Thema
const wrongOf = c => { const w = Array.isArray(c.wrong) ? c.wrong.map(x => String(x).trim()).filter(x => x && norm(x) !== norm(c.a)).slice(0, 3) : []; return w.length ? { wrong: w } : {}; };
function quizWrong(c, others) {
  const own = wrongOf(c).wrong || [];
  return [...new Set([...own, ...others.filter(x => norm(x) !== norm(c.a))])].slice(0, 3);
}
// Vorschau-Fallback (gleiche Regeln wie im Hauptprozess)
function heuristic(name, text) {
  const SEP = /\s*(?:→|->|=>|:|\s–\s|\s-\s|=)\s*/, cards = [], summary = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s*/, '').trim();
    if (line.length < 3 || /^#/.test(raw.trim())) continue;
    const m = line.split(SEP);
    if (m.length >= 2 && m[0].length >= 2 && m[0].length <= 90 && m.slice(1).join(': ').length <= 160) { cards.push({ q: m[0].trim(), a: m.slice(1).join(': ').trim() }); continue; }
    if (line.length <= 200 && summary.length < 12) summary.push(line);
  }
  return { name, summary, cards: cards.slice(0, 60) };
}

// ---------- Karten teilen ----------
// Datei für Klassenkollegen: Lernzettel-Namen, Kernaussagen und Karten – ohne Lernstand und ohne Originaldateien
function shareSubject(sid) {
  const s = subj(sid); if (!s) return;
  const data = { format: 'lernhub-karten', v: 1, from: userName(), subject: { name: s.name, desc: s.desc || '', color: s.color },
    topics: s.topics.filter(t => t.cards.length || t.summary?.length).map(t => ({ name: t.name, summary: t.summary || [], cards: t.cards.map(c => ({ q: c.q, a: c.a, ...wrongOf(c) })) })) };
  const text = JSON.stringify(data, null, 1), name = `${s.name} – Karten.json`;
  if (API?.files?.saveText) return API.files.saveText({ name, text, title: 'Karten teilen' }).then(p => p && toast('TEILEN', 'Datei gespeichert', 'Schick sie per WhatsApp, Teams oder USB weiter'));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// Fremde Datei: nur bekannte Felder übernehmen, Längen begrenzen
function importCards(data) {
  const str = (v, n) => String(v ?? '').trim().slice(0, n);
  if (!data || data.format !== 'lernhub-karten' || !Array.isArray(data.topics)) throw new Error('Das ist keine LernHub-Kartendatei');
  const topics = data.topics.slice(0, 100).map(t => ({
    name: str(t?.name, 80) || 'Importiert',
    summary: (Array.isArray(t?.summary) ? t.summary : []).slice(0, 30).map(x => str(x, 300)).filter(Boolean),
    cards: (Array.isArray(t?.cards) ? t.cards : []).slice(0, 500).map(c => ({ q: str(c?.q, 300), a: str(c?.a, 600), ...wrongOf({ a: c?.a, wrong: Array.isArray(c?.wrong) ? c.wrong.map(x => str(x, 300)) : [] }) })).filter(c => c.q && c.a)
  })).filter(t => t.cards.length || t.summary.length);
  if (!topics.length) throw new Error('Die Datei enthält keine Karten');
  const name = str(data.subject?.name, 30) || 'Importiert';
  let s = S.subjects.find(x => norm(x.name) === norm(name));
  if (!s) { s = { id: uid('s'), name, desc: str(data.subject?.desc, 60), color: COLORS.includes(data.subject?.color) ? data.subject.color : COLORS[S.subjects.length % COLORS.length], topics: [] }; S.subjects.push(s); }
  const from = str(data.from, 30);
  for (const t of topics) {
    const taken = s.topics.some(x => norm(x.name) === norm(t.name));
    s.topics.push({ id: uid('t'), name: taken ? `${t.name} (von ${from || 'Import'})` : t.name, file: null, summary: t.summary, cards: t.cards.map(c => ({ id: uid('c'), ...c })) });
  }
  save();
  return { s, topics: topics.length, cards: topics.reduce((a, t) => a + t.cards.length, 0) };
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'import-in') return;
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    if (f.size > 5e6) throw new Error('Datei ist zu groß');
    const r = importCards(JSON.parse(await f.text()));
    toast('IMPORT', `${r.cards} Karten übernommen`, `${r.topics} Lernzettel in ${r.s.name}`); go('subject', { sid: r.s.id });
  } catch (err) { toast('IMPORT', 'Import fehlgeschlagen', err instanceof SyntaxError ? 'Die Datei ist beschädigt' : err.message); }
});

// ---------- Lern-Session ----------
let SES = null;
function startSession(mode, sid, tids = [], planKey = null, size = SESSION_SIZE) {
  const pool = cardsOf(sid, tids);
  if (!pool.length) return toast('LEER', 'Keine Karten', 'Lade zuerst einen Lernzettel hoch');
  if (mode === 'quiz' && cardsOf(sid).length < 2) mode = 'flash';
  SES = { mode, sid, tids, planKey, list: pickCards(pool, Math.min(size, pool.length)), i: 0, right: 0, wrong: 0, xp: 0, answered: false, opts: [] };
  go('session');
}
VIEWS.session = {
  html() {
    const s = subj(SES.sid);
    return `<div class="session" style="--accent:${s.color}">
      <div class="sess-top">
        <button class="icon-btn" data-action="sess-exit" aria-label="Runde beenden">${ICON.x}</button>
        <span class="chip">${SES.mode === 'quiz' ? 'Quiz' : 'Karteikarten'} · ${esc(s.name)}</span>
        <div class="meter" id="sess-m" style="--n:${SES.list.length};--h:6px"></div>
        <span class="count" id="sess-c"></span>
      </div>
      <div id="sess-body"></div></div>`;
  },
  mount: () => renderCard()
};
function renderCard() {
  const body = $('#sess-body'); if (!body) return;
  setMeter($('#sess-m'), SES.i / SES.list.length * 100);
  $('#sess-c').textContent = `${Math.min(SES.i + 1, SES.list.length)}/${SES.list.length}`;
  if (SES.i >= SES.list.length) return renderResult(body);
  const c = SES.list[SES.i], tn = topicOf(c.sid, c.tid)?.name || '';
  SES.answered = false;
  if (SES.mode === 'flash') {
    body.innerHTML = `<div class="flip" id="flip" data-action="flip" tabindex="0" role="button" aria-label="Karte umdrehen">
      <div class="flip-inner">
        <div class="face"><span class="lbl">Frage</span><span class="tp chip">${esc(tn)}</span><div class="q">${esc(c.q)}</div><div class="hint"><span class="d-only">Klicken oder <span class="kbd">Leertaste</span></span><span class="m-only">Tippen zum Umdrehen · dann wischen →</span></div></div>
        <div class="face back"><span class="lbl">Antwort</span><span class="tp chip">${esc(tn)}</span><div class="a">${esc(c.a)}</div><div class="hint">${esc(c.q)}</div></div>
      </div></div>
      <div class="flip-acts" id="flip-acts"><button class="btn bad lg" data-action="know" data-ok="0">Nicht gewusst <span class="kbd">1</span></button><button class="btn good lg" data-action="know" data-ok="1">Gewusst <span class="kbd">2</span></button></div>`;
  } else {
    const near = shuffle(cardsOf(c.sid, [c.tid]).filter(x => x.a !== c.a).map(x => x.a));
    const far = shuffle(cardsOf(c.sid).filter(x => x.a !== c.a).map(x => x.a));
    const other = shuffle(cardsOf().filter(x => x.a !== c.a).map(x => x.a));
    SES.opts = shuffle([c.a, ...quizWrong(c, [...near, ...far, ...other])]);
    body.innerHTML = `<div class="panel quiz-q screws"><span class="chip">${esc(tn)}</span><div class="q">${esc(c.q)}</div></div>
      <div class="opts" id="opts">${SES.opts.map((o, i) => `<button class="opt" style="--i:${i}" data-action="quiz-opt" data-i="${i}"><span class="kbd">${i + 1}</span>${esc(o)}</button>`).join('')}</div>
      <div class="next-row" id="next-row"></div>`;
  }
}
function answerFlash(ok, el) {
  if (SES.answered) return; SES.answered = true;
  SES.xp += grade(SES.list[SES.i], ok, 'flash', el); ok ? SES.right++ : SES.wrong++; SES.i++;
  const f = $('#flip');
  if (!f || reduced()) return renderCard();
  f.classList.add(ok ? 'out-r' : 'out-l'); setTimeout(renderCard, 300);
}
function answerQuiz(i) {
  if (SES.answered) return; SES.answered = true;
  const c = SES.list[SES.i], ok = SES.opts[i] === c.a, opts = $$('#opts .opt');
  $('#opts').classList.add('locked');
  opts.forEach((o, j) => o.classList.add(SES.opts[j] === c.a ? 'right' : j === i ? 'wrong' : 'dim'));
  SES.xp += grade(c, ok, 'quiz', opts[i]); ok ? SES.right++ : SES.wrong++;
  $('#next-row').innerHTML = `${ok ? '' : `<button class="btn ghost" data-action="explain" data-cid="${c.id}">Warum?</button>`}<button class="btn primary" data-action="next">${SES.i + 1 >= SES.list.length ? 'Auswertung' : 'Weiter'}<span class="kbd">Enter</span></button>`;
  if (ok) { const at = SES.i; setTimeout(() => { if (current.name === 'session' && SES.i === at && SES.answered) nextQ(); }, 1000); }
}
function nextQ() { SES.i++; renderCard(); }
function renderResult(body) {
  const n = SES.list.length, acc = Math.round(SES.right / n * 100);
  S.stats.sessions++;
  if (!SES.wrong && n >= 5) S.stats.perfect++;
  if (SES.planKey) S.planDone[SES.planKey] = true;
  emit('session', { acc, n, wrong: SES.wrong, mode: SES.mode });
  checkBadges(); save();
  const msg = acc >= 90 ? 'Sitzt. Das kannst du.' : acc >= 70 ? 'Starke Runde.' : acc >= 40 ? 'Solide. Die falschen kommen bald wieder.' : 'Wiederholung macht den Meister.';
  body.innerHTML = `<div class="panel result screws">
    <div class="eyebrow">Auswertung</div>
    <div class="big" style="margin-top:16px"><span data-count="${acc}" style="font-size:inherit;color:inherit">0</span><span>%</span></div>
    <p class="lede" style="margin:10px auto 0">${msg}</p>
    <div style="max-width:320px;margin:20px auto 0">${meter(acc, 24, { h: 10 })}</div>
    <div class="kv"><div><b style="color:var(--ok)">${SES.right}</b><span>richtig</span></div><div><b style="color:var(--bad)">${SES.wrong}</b><span>falsch</span></div><div><b>+${SES.xp}</b><span>XP</span></div></div>
    <div class="row" style="justify-content:center"><button class="btn" data-action="again">Nochmal</button><button class="btn primary" data-action="open-subject" data-sid="${SES.sid}">Zum Fach</button></div></div>`;
  setMeter($('#sess-m'), 100);
  requestAnimationFrame(() => lightMeters(body)); countUp(body);
  if (acc >= 70) confetti(acc >= 90 ? 170 : 90);
}

// ---------- Plan ----------
VIEWS.plan = {
  html() {
    const up = upcoming(), past = S.tests.filter(t => t.date < dkey() || !subj(t.subjectId));
    return `<div class="eyebrow">Plan</div><h1 class="h1">Tests & Lernplan</h1>
      <p class="lede">Trag Tests selbst ein${API?.untis ? ' oder lass sie aus WebUntis holen (Optionen → WebUntis)' : ''}. LernHub verteilt die Lernzettel auf die Tage davor und setzt am Vortag eine Generalprobe.</p>
      <div class="plan">
        <form class="panel form" id="tf">
          <b>Test eintragen</b>
          ${S.subjects.length ? `<div class="field"><label>Fach</label><select class="input" name="sid">${S.subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Bezeichnung</label><input class="input" name="title" placeholder="z. B. 2. Schularbeit" maxlength="40"></div>
          <div class="field"><label>Datum</label><input class="input" type="date" name="date" min="${dkey(addDays(new Date(), 1))}" value="${dkey(addDays(new Date(), 7))}" required></div>
          <button class="btn primary">Plan erstellen</button>` : '<p class="muted">Leg zuerst ein Fach an.</p><button type="button" class="btn primary" data-action="new-subject">Neues Fach</button>'}
        </form>
        <div>
          ${up.length ? up.map(testCard).join('') : '<div class="panel empty"><b>Keine Tests geplant</b>Neue Tests erscheinen hier mit Countdown und Tagesplan.</div>'}
          ${past.length ? `<h2 class="h2">Vorbei <span class="mono">${past.length}</span></h2>${past.map(t => `<div class="panel" style="padding:12px 16px;margin-bottom:8px"><div class="row" style="justify-content:space-between"><span><b>${esc(t.title)}</b> <span class="muted">· ${fmtLong(t.date)}</span></span><button class="icon-btn danger" data-action="del-test" data-id="${t.id}" aria-label="Test löschen">${ICON.trash}</button></div></div>`).join('')}` : ''}
        </div>
      </div>`;
  },
  mount() {
    $('#tf')?.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target), sid = f.get('sid'), date = f.get('date');
      if (!sid || !date) return;
      addTest(sid, (f.get('title') || '').trim(), date);
      go('plan');
    });
  }
};
function addTest(sid, title, date) {
  const s = subj(sid); if (!s) return null;
  const t = { id: uid('x'), subjectId: sid, date, title: title || `${s.name} Test` };
  S.tests.push(t); S.stats.testsAdded++; checkBadges(); save();
  toast('PLAN', 'Lernplan erstellt', `${t.title} · ${fmtLong(date)}`);
  return t;
}
function testCard(t) {
  const s = subj(t.subjectId), plan = buildPlan(t);
  return `<div class="panel test screws" style="--accent:${s.color}">
    <div class="test-head"><div><div class="eyebrow"><span class="dot"></span>${esc(s.name)} · ${fmtLong(t.date)}</div><h3 style="margin-top:6px">${esc(t.title)}</h3></div>
    <button class="icon-btn danger" data-action="del-test" data-id="${t.id}" aria-label="Test löschen">${ICON.trash}</button></div>
    <div style="margin-top:16px">${countdown(t.date, true)}</div>
    <div class="tl">
      ${plan.map(p => { const k = `${t.id}|${p.date}`, done = !!S.planDone[k], today = p.date === dkey();
        return `<div class="tl-item ${today ? 'today' : ''} ${done ? 'done' : ''} ${p.final ? 'final' : ''}"><span class="d">${fmtDay(p.date)}</span><span class="pt"></span><span class="w">${esc(p.label)}</span>${done ? '<span style="color:var(--ok);font-size:13px;font-weight:700">✓</span>' : today ? `<button class="btn sm primary" data-action="plan-start" data-test="${t.id}">Starten</button>` : '<span></span>'}</div>`; }).join('')}
      <div class="tl-item final"><span class="d">${fmtDay(t.date)}</span><span class="pt" style="border-color:var(--accent)"></span><span class="w"><b>Testtag</b></span><span></span></div>
    </div></div>`;
}

// ---------- Erfolge ----------
VIEWS.achievements = {
  html() {
    const l = levelOf(S.xp), a = xpFor(l), b = xpFor(l + 1), total = S.stats.correct + S.stats.wrong;
    return `<div class="eyebrow">Erfolge</div><h1 class="h1">${S.badges.length} von ${BADGES.length} Abzeichen</h1>
      <div class="panel lvl-hero screws" style="margin-top:24px">
        <div class="lvl-num"><small>Level</small>${pad(l)}</div>
        <div style="flex:1;min-width:240px"><div class="row" style="justify-content:space-between"><span class="mono">${S.xp} XP</span><span class="mono muted">noch ${b - S.xp} bis Level ${l + 1}</span></div>
        <div style="margin-top:10px">${meter((S.xp - a) / (b - a) * 100, 40, { h: 12 })}</div></div>
      </div>
      <div class="grid-4" style="margin-top:14px">
        <div class="panel stat"><small>Lernzeit</small><b><em data-count="${Math.floor(S.studySec / 60)}" style="font-style:normal">0</em><span>min</span></b></div>
        <div class="panel stat"><small>Beantwortet</small><b data-count="${total}">0</b></div>
        <div class="panel stat"><small>Runden</small><b data-count="${S.stats.sessions}">0</b></div>
        <div class="panel stat"><small>Bester Streak</small><b><em data-count="${S.streak.best || 0}" style="font-style:normal">0</em><span>T</span></b></div>
      </div>
      ${statsHtml()}
      <h2 class="h2">Abzeichen</h2>
      <div class="badges">${BADGES.map(x => { const got = S.badges.includes(x.id), hide = x.secret && !got; return `<div class="panel badge ${got ? '' : 'locked'}"><span class="code">${hide ? '???' : esc(x.code)}</span><div><b>${hide ? 'Geheimes Abzeichen' : esc(x.name)}</b><small>${hide ? 'Irgendwo versteckt …' : esc(x.desc)}</small></div></div>`; }).join('')}</div>`;
  }
};

// Statistik: Lernzeit und Trefferquote pro Fach, letzte 4 Wochen
function statsHtml() {
  const rows = S.subjects.map(s => {
    let r = 0, w = 0; for (const c of cardsOf(s.id)) { const st = cs(c.id); r += st.r; w += st.w; }
    return { s, min: S.subjMin[s.id] || 0, acc: r + w ? Math.round(r / (r + w) * 100) : null, n: r + w };
  }).filter(x => x.min || x.n).sort((a, b) => b.min - a.min || b.n - a.n);
  const weeks = Array.from({ length: 4 }, (_, i) => { let m = 0; for (let d = 0; d < 7; d++) m += S.history[dkey(addDays(new Date(), -(i * 7 + d)))] || 0; return m; });
  const maxMin = Math.max(1, ...rows.map(x => x.min));
  return `<h2 class="h2">Statistik <span class="mono">pro Fach</span></h2>
    <div class="panel pad">
      <div class="row" style="gap:22px;margin-bottom:14px">${['Diese Woche', 'Letzte Woche', 'Vor 2 Wochen', 'Vor 3 Wochen'].map((l, i) => `<div><small class="muted" style="display:block;font-size:12px">${l}</small><b class="mono">${weeks[i]}</b><span class="muted"> min</span></div>`).join('')}</div>
      ${rows.length ? rows.map(x => `<div class="row" style="--accent:${x.s.color};gap:14px;padding:8px 0;border-top:1px solid var(--line)">
        <b style="width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(x.s.name)}">${esc(x.s.name)}</b>
        <div style="flex:1;min-width:120px">${meter(x.min / maxMin * 100, 24, { cls: 'thin', color: x.s.color })}</div>
        <span class="mono" style="width:70px;text-align:right">${x.min} min</span>
        <span class="mono muted" style="width:110px;text-align:right">${x.acc == null ? '–' : `${x.acc} % richtig`}</span></div>`).join('')
      : '<p class="muted">Sobald du lernst, siehst du hier, wie viel Zeit in welches Fach geht und wie oft du richtig liegst.</p>'}
      <p class="muted" style="font-size:12.5px;margin-top:10px">Zeit pro Fach wird ab diesem Update gezählt: Karten, Quiz, Lernmodi und Lesen.</p>
    </div>`;
}

// ---------- Einstellungen ----------
async function openSettings() {
  const info = IS_DESKTOP || IS_MOBILE ? await API.store.info() : null;
  const hasKey = CAN_AI ? await API.jarvis.hasKey() : false;
  const ut = API?.untis ? await API.untis.info() : null;
  const voices = (window.speechSynthesis?.getVoices() || []).filter(v => /^de/i.test(v.lang));
  const st = S.settings;
  const sw = (key, on, label, sub) => `<div class="switch"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><button class="tog ${on ? 'on' : ''}" data-set="${key}" aria-pressed="${on}" aria-label="${label}"></button></div>`;
  const num = (key, label, opts) => `<div class="field"><label>${label}</label><select class="input" data-num="${key}">${opts.map(o => `<option value="${o}" ${+st[key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
  const txt = (key, label, ph) => `<div class="field"><label>${label}</label><input class="input" data-txt="${key}" value="${esc(st[key] || '')}" placeholder="${esc(ph)}"></div>`;
  openModal(`<h3>Optionen</h3><p class="lede">LernHub ${IS_DESKTOP ? 'Desktop' : IS_MOBILE ? 'Handy-App' : IS_REMOTE ? 'Handy' : 'Vorschau'}${info?.version ? ' · v' + esc(info.version) : ''}</p>
    <div class="sec-t">Deine Daten</div>
    ${IS_DESKTOP ? `<div class="path">${esc(info.dataDir)}</div><p class="muted" style="font-size:13px;margin-bottom:10px">Fortschritt, Lernzettel, Notizen und tägliche Backups liegen hier, getrennt vom Programm. Updates und Neuinstallationen löschen nichts.</p>
      <div class="row"><button class="btn sm" data-x="open-dir">Ordner öffnen</button><button class="btn sm ghost" data-x="move-dir">Anderen Ordner wählen</button></div>`
      : IS_MOBILE ? '<p class="muted" style="font-size:13px">Alles bleibt auf diesem Handy. Mit dem Laptop abgleichen: weiter unten unter „Abgleich“.</p>'
      : IS_REMOTE ? '<p class="muted" style="font-size:13px">Verbunden mit LernHub auf deinem Laptop. Alles wird dort gespeichert.</p>'
      : '<p class="muted" style="font-size:13px">In der Vorschau bleiben Daten nur in diesem Browser.</p>'}
    ${IS_DESKTOP ? `<hr><div class="sec-t">Handy verbinden</div>
      ${sw('sync', info.sync?.on, 'Im WLAN fürs Handy freigeben', 'Dein Handy öffnet LernHub im Browser. Funktioniert, solange beide im selben WLAN sind und LernHub hier läuft.')}
      <div id="sync-box">${info.sync?.on ? syncBox(info.sync) : ''}</div>` : ''}
    ${API?.untis ? `<hr><div class="sec-t">WebUntis</div>${untisBox(ut)}` : ''}
    ${!IS_REMOTE && LH.abgleich ? `<hr><div class="sec-t">Abgleich mit Handy oder anderem Gerät</div>${LH.abgleich.box()}` : ''}
    <hr><div class="sec-t">Du</div>${txt('name', 'Dein Name', 'z. B. Lena')}
    <hr><div class="sec-t">Lernen & Pausen</div>
    <div class="grid-2" style="grid-template-columns:1fr 1fr;gap:12px">${num('learnMin', 'Lernzeit für Pause (Min)', [15, 20, 25, 30, 40, 45, 50, 60])}${num('breakMin', 'Pausenzeit (Min)', [3, 5, 10, 15])}${num('weekGoal', 'Wochenziel (Min)', [60, 90, 120, 150, 200, 250, 300, 400])}${num('focusMin', 'Fokusblock (Min)', [15, 20, 25, 30, 45, 50, 60, 90])}</div>
    <hr><div class="sec-t">Fokusmodus</div>
    ${txt('focusApps', 'Diese Apps schließen', 'z. B. Discord, Steam')}
    <div style="height:10px"></div>${txt('focusPlaylist', 'Spotify-Playlist (Link teilen → kopieren)', 'https://open.spotify.com/playlist/…')}
    <hr><div class="sec-t">Morgenbriefing</div>
    ${sw('briefing', st.briefing, 'JARVIS begrüßt dich beim ersten Start am Tag', 'Termine, HÜs, Plan, Streak und Wetter')}
    <div style="height:8px"></div>${txt('city', 'Ort fürs Wetter', 'z. B. Krems an der Donau')}
    <hr><div class="sec-t">JARVIS</div>
    ${CAN_AI ? `<p class="muted" style="font-size:13px;margin-bottom:10px">API-Key: ${hasKey ? '<span style="color:var(--ok)">hinterlegt</span>' : 'keiner – JARVIS arbeitet offline mit festen Befehlen'}. Kostenlos geht es mit einem Google-Key (Gemini): auf <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> mit deinem Google-Konto „Create API key“ klicken und hier einfügen. Ein Anthropic-Key (sk-ant-…) funktioniert auch. ${IS_DESKTOP ? 'Der Key wird verschlüsselt gespeichert und bleibt im Hauptprozess.' : 'Der Key bleibt auf diesem Handy und geht nur an Google bzw. Anthropic.'}</p>
      <div class="row"><input class="input" id="key-in" type="password" placeholder="Google-Key oder sk-ant-…" style="flex:1;min-width:200px"><button class="btn sm primary" data-x="save-key">Speichern</button>${hasKey ? '<button class="btn sm danger" data-x="del-key">Entfernen</button>' : ''}</div>` : ''}
    ${sw('voiceOut', st.voiceOut, 'Antworten vorlesen')}
    <div class="field" style="margin-top:8px"><label>Stimme</label><select class="input" id="voice-sel"><option value="">Automatisch (Deutsch)</option>${voices.map(v => `<option ${v.name === st.voiceName ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
    <div class="field" style="margin-top:12px"><label>Spracherkennung (lokal)</label><select class="input" id="stt-sel"><option value="base" ${st.stt === 'base' ? 'selected' : ''}>Schnell · Whisper Base (~150 MB)</option><option value="small" ${st.stt === 'small' ? 'selected' : ''}>Genauer · Whisper Small (~500 MB, langsamer)</option></select></div>
    <hr><div class="sec-t">App</div>
    ${IS_DESKTOP ? sw('tray', info.tray, 'Im Hintergrund weiterlaufen', 'Schließen legt LernHub in den Infobereich, JARVIS bleibt per Tastenkürzel erreichbar') + sw('autostart', info.autostart, 'Mit Windows starten') : ''}
    <div class="switch"><span>Erscheinungsbild<small>„System“ folgt dem hellen oder dunklen Modus von Windows</small></span><div class="seg" role="group" aria-label="Erscheinungsbild">${[['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([v, l]) => `<button type="button" data-theme-v="${v}" class="${(st.theme || 'system') === v ? 'on' : ''}" aria-pressed="${(st.theme || 'system') === v}">${l}</button>`).join('')}</div></div>
    ${sw('reduceMotion', st.reduceMotion, 'Animationen reduzieren')}
    ${IS_DESKTOP ? `<div class="row" style="margin-top:10px"><span class="muted" style="font-size:13px;flex:1" id="upd-t">${info.packaged ? 'Updates kommen automatisch über GitHub.' : 'Updates gibt es in der installierten Version.'}</span><button class="btn sm" data-x="check-update" ${info.packaged ? '' : 'disabled'}>Nach Updates suchen</button></div>` : ''}
    <hr><div class="row"><button class="btn sm danger" data-x="reset">Fortschritt zurücksetzen</button><span style="flex:1"></span><button class="btn sm" data-x="close">Fertig</button></div>`,
    (bg, close) => {
      bg.addEventListener('click', async e => {
        const tv = e.target.closest('[data-theme-v]');
        if (tv) {
          S.settings.theme = tv.dataset.themeV; save(); applyMotion();
          bg.querySelectorAll('[data-theme-v]').forEach(b => { b.classList.toggle('on', b === tv); b.setAttribute('aria-pressed', b === tv); });
          return;
        }
        const t = e.target.closest('[data-set]');
        if (t) {
          const k = t.dataset.set, on = !t.classList.contains('on');
          t.classList.toggle('on', on); t.setAttribute('aria-pressed', on);
          if (k === 'sync') {
            const r = await API.sync.set(on);
            if (r?.error) { t.classList.remove('on'); t.setAttribute('aria-pressed', false); toast('WLAN', 'Freigabe fehlgeschlagen', r.error); }
            bg.querySelector('#sync-box').innerHTML = r?.on ? syncBox(r) : ''; return;
          }
          if (k in S.settings) { S.settings[k] = on; save(); applyMotion(); }
          else API.store.set(k, on);
          return;
        }
        const x = e.target.closest('[data-x]')?.dataset.x;
        if (x === 'close') close();
        if (x === 'open-dir') API.store.openDir();
        if (x === 'move-dir') { const d = await API.store.chooseDir(); if (d) { toast('DIR', 'Datenordner geändert', d); close(); } }
        if (x === 'save-key') { const v = $('#key-in').value.trim(); if (!v) return; await API.jarvis.setKey(v); LH.jarvis?.refreshKey(); toast('KEY', 'API-Key gespeichert', 'JARVIS ist online'); close(); }
        if (x === 'del-key') { await API.jarvis.setKey(''); LH.jarvis?.refreshKey(); toast('KEY', 'API-Key entfernt', 'JARVIS arbeitet offline'); close(); }
        if (x === 'untis-on') {
          const m = $('#u-msg'), b = e.target.closest('button'); m.textContent = 'Verbinde mit WebUntis …'; b.disabled = true;
          const r = await API.untis.connect({ address: $('#u-addr').value, user: $('#u-user').value, password: $('#u-pw').value, secret: $('#u-key').value });
          b.disabled = false;
          if (r?.error) { m.textContent = r.error; return; }
          const n = LH.school.applyUntis(r);
          toast('UNTIS', 'WebUntis verbunden', `${n.count} ${n.count === 1 ? 'Fach' : 'Fächer'} übernommen · ${n.added} ${n.added === 1 ? 'Test' : 'Tests'} eingetragen`); close();
        }
        if (x === 'untis-sync') { close(); LH.school.syncUntis(true); }
        if (x === 'untis-off') { await API.untis.disconnect(); toast('UNTIS', 'WebUntis getrennt', 'Eingetragene Tests bleiben'); close(); }
        if (x === 'check-update') { $('#upd-t').textContent = 'Suche …'; const r = await API.update.check(); $('#upd-t').textContent = r?.message || 'Fertig'; }
        if (x === 'reset' && await confirmModal({ title: 'Fortschritt zurücksetzen?', detail: 'XP, Level, Streak, Münzen, Abzeichen und Lernstand werden gelöscht. Fächer, Lernzettel, Tests, HÜs und Noten bleiben.', ok: 'Zurücksetzen', danger: true })) {
          const keep = { subjects: S.subjects, tests: S.tests, settings: S.settings, homework: S.homework, grades: S.grades, rev: S.rev, runner: { levels: {}, custom: S.runner.custom } };
          S = Object.assign(DEFAULT(), keep); LH.S = S; save(true); hud(); close(); go('home');
        }
      });
      bg.querySelectorAll('[data-num]').forEach(el => el.onchange = () => { S.settings[el.dataset.num] = +el.value; save(); hud(); emit('settings'); });
      bg.querySelectorAll('[data-txt]').forEach(el => el.onchange = () => { S.settings[el.dataset.txt] = el.value.trim(); save(); emit('settings'); });
      bg.querySelector('#voice-sel').onchange = e => { S.settings.voiceName = e.target.value; save(); LH.jarvis?.say('So klinge ich.'); };
      bg.querySelector('#stt-sel').onchange = e => { S.settings.stt = e.target.value; save(); LH.jarvis?.resetStt(); };
    });
}
// Erster Start: Name abfragen (für Begrüßung, JARVIS und geteilte Karten)
function welcome() {
  return new Promise(resolve => openModal(`<div class="eyebrow">Willkommen</div><h3 style="margin-top:6px">Schön, dass du da bist.</h3>
    <p class="lede">LernHub plant deine Tests, macht aus Lernzetteln Karteikarten und JARVIS hilft dir beim Lernen. Wie heißt du?</p>
    <form id="wf" style="display:flex;flex-direction:column;gap:14px;margin-top:6px"><div class="field"><label>Dein Vorname</label><input class="input" name="n" maxlength="30" placeholder="z. B. Lena" required autocomplete="given-name"></div>
    <p class="muted" style="font-size:13px">${CAN_AI ? `Tipp: In den Optionen kannst du danach ${API?.untis ? 'WebUntis verbinden und ' : ''}einen kostenlosen Google-Key für JARVIS eintragen.` : 'Ändern kannst du das jederzeit in den Optionen.'}</p>
    <div class="row" style="justify-content:flex-end"><button class="btn primary">Los geht’s</button></div></form>`, (bg, close) => {
    bg.querySelector('#wf').onsubmit = e => { e.preventDefault(); const n = e.target.n.value.trim(); if (!n) return; S.settings.name = n; save(); close(); };
    // Schließen ohne Namen geht auch – dann ohne Namen begrüßen
    new MutationObserver((_, o) => { if (!bg.isConnected) { o.disconnect(); rerender(); resolve(); } }).observe(document.body, { childList: true });
  }));
}
function untisBox(u) {
  if (u) return `<p class="muted" style="font-size:13px;margin-bottom:10px">Verbunden als <b>${esc(u.user)}</b> · ${esc(u.school)}. Neue Tests und Schularbeiten trägt LernHub beim Start und alle 3 Stunden selbst ein${S.settings.untisLast ? `, zuletzt ${new Date(S.settings.untisLast).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' })}` : ''}.</p>
    <div class="row"><button class="btn sm primary" data-x="untis-sync">Jetzt abgleichen</button><button class="btn sm danger" data-x="untis-off">Trennen</button></div>`;
  return `<p class="muted" style="font-size:13px;margin-bottom:10px">LernHub holt deine Tests und Schularbeiten aus WebUntis und trägt sie mit Lernplan ein. Die Zugangsdaten bleiben verschlüsselt auf diesem Laptop.</p>
    <div class="field"><label>Adresse der WebUntis-Login-Seite (aus dem Browser kopieren)</label><input class="input" id="u-addr" placeholder="https://….webuntis.com/WebUntis/?school=…"></div>
    <div class="grid-2" style="grid-template-columns:1fr 1fr;gap:12px;margin-top:10px"><div class="field"><label>Benutzername</label><input class="input" id="u-user" autocomplete="off"></div><div class="field"><label>Passwort</label><input class="input" id="u-pw" type="password" autocomplete="off"></div></div>
    <details style="margin-top:10px"><summary class="muted" style="font-size:13px;cursor:pointer">Deine Schule meldet sich mit Microsoft an?</summary>
      <p class="muted" style="font-size:13px;margin:8px 0">Dann gibt es kein Untis-Passwort. Öffne WebUntis im Browser → dein Profil → <b>Freigaben</b> → bei „Zugriff über Untis Mobile“ auf <b>Anzeigen</b>. Trag den Benutzernamen oben ein und den <b>Schlüssel</b> hier statt des Passworts.</p>
      <input class="input" id="u-key" type="password" placeholder="Schlüssel" autocomplete="off"></details>
    <div class="row" style="margin-top:10px"><button class="btn sm primary" data-x="untis-on">Verbinden</button><span class="muted" style="font-size:13px" id="u-msg" role="status"></span></div>`;
}
function syncBox(s) {
  let qr = '';
  try { const q = window.qrcode(0, 'M'); q.addData(s.url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch {}
  return `<div class="sync-card"><div class="qr">${qr}</div><div><p class="muted" style="font-size:13px">Mit der Handy-Kamera scannen oder im Handy-Browser öffnen:</p><div class="path" style="margin:8px 0">${esc(s.url)}</div><p class="muted" style="font-size:12.5px">Tipp: Im Browser-Menü „Zum Startbildschirm hinzufügen“, dann sieht es aus wie eine App. Wenn Windows nach der Firewall fragt: „Private Netzwerke“ erlauben.</p></div></div>`;
}

// ---------- Klicks ----------
const ACTIONS = {
  'open-subject': d => go('subject', { sid: d.sid }),
  'new-subject': () => subjectModal(),
  // Handy: Bereiche, die nicht in die untere Leiste passen
  more: () => openModal(`<h3>Mehr</h3><div class="more-list">${[['school', 'Schule', 'Hausübungen und Noten'], ['mistakes', 'Fehlerheft', 'Falsch beantwortete Karten'], ['achievements', 'Erfolge', 'Level, Abzeichen, Statistik'], ['shop', 'Shop', 'Farben und Figuren'], ['break', 'Pause', 'Spiele mit verdienter Pausenzeit']].map(([v, t, d]) => `<button class="more-item" data-go="${v}"><b>${t}</b><small>${d}</small></button>`).join('')}<button class="more-item" data-more="settings"><b>Optionen</b><small>Name, Abgleich, JARVIS-Key, Design</small></button></div>`, (bg, close) => bg.addEventListener('click', e => { if (e.target.closest('[data-go]')) close(); if (e.target.closest('[data-more]')) { close(); openSettings(); } })),
  'share-subject': d => shareSubject(d.sid),
  'import-cards': () => $('#import-in')?.click(),
  'edit-subject': d => subjectModal(subj(d.sid)),
  'del-subject': async d => {
    const s = subj(d.sid);
    if (!await confirmModal({ title: `${s.name} löschen?`, detail: `${s.topics.length} Lernzettel und ihr Lernstand werden entfernt. Die Originaldateien bleiben im Datenordner.`, ok: 'Löschen', danger: true })) return;
    if (s.untis) S.settings.untisHidden = [...(S.settings.untisHidden || []), 'fach:' + s.untis]; // kommt sonst beim nächsten WebUntis-Abgleich wieder
    S.subjects = S.subjects.filter(x => x.id !== s.id); S.tests = S.tests.filter(t => t.subjectId !== s.id); save(); go('subjects');
  },
  upload: async d => {
    if (!IS_DESKTOP) return $('#file-in').click();
    importPaths(d.sid, await API.files.pick());
  },
  paste: d => openModal(`<h3>Text einfügen</h3><p class="lede">Kopier deinen Lernzettel hier hinein. Mit API-Key schreibt JARVIS die Fragen.</p>
    <form id="pf" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label>Titel</label><input class="input" name="name" placeholder="z. B. Unit 4 Vokabeln" required></div>
    <div class="field"><label>Inhalt</label><textarea class="input" name="text" placeholder="Begriff: Erklärung&#10;…" required></textarea></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-c>Abbrechen</button><button class="btn primary">Karten erstellen</button></div></form>`,
    (bg, close) => {
      bg.querySelector('[data-c]').onclick = close;
      bg.querySelector('#pf').onsubmit = async e => {
        e.preventDefault();
        const name = e.target.name.value.trim(), text = e.target.text.value;
        const s = subj(d.sid); close();
        if (!API?.files?.importText) return addTopics(s.id, [{ file: name, mode: 'offline', topics: [heuristic(name, text)] }]);
        setBusy('Text wird verarbeitet …');
        const r = await API.files.importText({ text, name, subjectName: s.name });
        setBusy(''); addTopics(s.id, [r]);
      };
    }),
  read: d => go('read', { sid: d.sid, tid: d.tid }),
  'toggle-topic': (d, el) => el.closest('.topic').classList.toggle('open'),
  'open-file': async d => { const err = await API.files.open(d.path); if (err) toast('DATEI', 'Konnte nicht öffnen', err); },
  // Alle Themen aus derselben Datei durch neue KI-Karten ersetzen (Markierungen bleiben)
  regen: async d => {
    const s = subj(d.sid), t = topicOf(d.sid, d.tid); if (!s || !t?.file) return;
    if (!await API.jarvis.hasKey()) return toast('KI', 'Braucht einen API-Key', 'Optionen → JARVIS: kostenloser Google-Key');
    const same = s.topics.filter(x => x.file?.stored === t.file.stored);
    if (!await confirmModal({ title: 'Karten neu erstellen?', detail: `JARVIS liest „${t.file.name}“ nochmal und schreibt Themen, Kernaussagen und Karten neu. Die ${same.reduce((a, x) => a + x.cards.length, 0)} bisherigen Karten und ihr Lernstand werden ersetzt.`, ok: 'Neu erstellen' })) return;
    toast('KI', 'JARVIS liest den Lernzettel …', 'Das kann bis zu einer Minute dauern');
    const r = await API.files.regenerate({ stored: t.file.stored, subjectName: s.name });
    if (r.error || r.mode !== 'ai') return toast('KI', 'Neu erstellen hat nicht geklappt', r.error || r.warning || 'KI nicht erreichbar – bisherige Karten bleiben');
    const marks = same.flatMap(x => x.marks || []), at = s.topics.indexOf(same[0]);
    const fresh = r.topics.map((x, i) => ({ id: uid('t'), name: x.name || t.name, file: { ...t.file }, summary: (x.summary || []).slice(0, 14), cards: (x.cards || []).filter(c => c.q && c.a).map(c => ({ id: uid('c'), q: String(c.q).trim(), a: String(c.a).trim(), ...wrongOf(c) })), ...(i === 0 && marks.length ? { marks } : {}) }));
    s.topics = s.topics.filter(x => !same.includes(x)); s.topics.splice(Math.max(0, at), 0, ...fresh);
    save(); rerender();
    toast('KI', `${fresh.reduce((a, x) => a + x.cards.length, 0)} neue Karten`, `${fresh.length} Themen aus „${t.file.name}“`);
  },
  'archive-topics': async d => {
    const s = subj(d.sid), t = lastTest(s);
    const r = await archiveModal(s, t ? `${t.title || 'Test'} ${fmtDay(t.date)}` : `Test ${fmtDay(dkey())}`);
    const moved = r ? s.topics.filter(x => r.ids.includes(x.id)) : [];
    if (!moved.length) return;
    s.archive = [{ id: uid('a'), name: r.name, date: dkey(), topics: moved }, ...(s.archive || [])];
    s.topics = s.topics.filter(x => !moved.includes(x)); save(); rerender();
    toast('ABLAGE', `${moved.length} Lernzettel abgelegt`, `In „${r.name}“. Jetzt kannst du den Stoff für den nächsten Test hochladen.`);
  },
  'restore-archive': d => {
    const s = subj(d.sid), a = s.archive?.find(x => x.id === d.aid); if (!a) return;
    s.topics.push(...a.topics); s.archive = s.archive.filter(x => x !== a); save(); rerender();
    toast('ABLAGE', `„${a.name}“ zurückgeholt`, `${a.topics.length} Lernzettel zählen wieder beim Lernen`);
  },
  'skip-archive': d => { subj(d.sid).archiveSkip = d.tid; save(); rerender(); },
  'rename-topic': async d => { const t = topicOf(d.sid, d.tid); const n = await promptModal({ title: 'Lernzettel umbenennen', label: 'Name', value: t.name }); if (n) { t.name = n; save(); rerender(); } },
  'del-topic': async d => {
    const s = subj(d.sid), t = topicOf(d.sid, d.tid);
    if (!await confirmModal({ title: `„${t.name}“ löschen?`, detail: `${t.cards.length} Karten werden entfernt.`, ok: 'Löschen', danger: true })) return;
    s.topics = s.topics.filter(x => x.id !== t.id); save(); rerender();
  },
  'edit-card': (d, el) => {
    const row = el.closest('.qa-row'), tp = row.closest('.topic'), sid = current.args.sid, t = topicOf(sid, tp.dataset.tid), c = t.cards.find(x => x.id === row.dataset.cid);
    row.outerHTML = `<form class="qa-row edit-card" data-cid="${c.id}" data-tid="${t.id}"><input name="q" value="${esc(c.q)}" aria-label="Frage"><input name="a" value="${esc(c.a)}" aria-label="Antwort"><span><button class="btn sm primary">OK</button></span></form>`;
    tp.querySelector(`form[data-cid="${c.id}"] input`).focus();
  },
  'del-card': (d, el) => {
    const row = el.closest('.qa-row'), t = topicOf(current.args.sid, row.closest('.topic').dataset.tid);
    t.cards = t.cards.filter(x => x.id !== row.dataset.cid); save();
    row.style.transition = 'opacity .2s'; row.style.opacity = 0; setTimeout(() => row.remove(), 200);
  },
  start: d => startSession(d.mode, d.sid, d.tids ? d.tids.split(',') : []),
  modes: d => LH.modes?.picker(d.sid, d.tids ? d.tids.split(',') : []),
  explain: d => LH.modes?.explain(d.cid),
  due: () => LH.modes?.start('due', null),
  'plan-start': d => {
    const t = S.tests.find(x => x.id === d.test); const p = t && buildPlan(t).find(x => x.date === dkey()); if (!p) return;
    startSession(p.final ? 'quiz' : 'flash', t.subjectId, p.final ? [] : p.topics, `${t.id}|${p.date}`, p.final ? 15 : SESSION_SIZE);
  },
  flip: () => { const f = $('#flip'); if (!f) return; f.classList.toggle('flipped'); $('#flip-acts').classList.add('show'); },
  know: (d, el) => answerFlash(d.ok === '1', el),
  'quiz-opt': d => answerQuiz(+d.i),
  next: () => nextQ(),
  'sess-exit': () => go('subject', { sid: SES.sid }),
  again: () => startSession(SES.mode, SES.sid, SES.tids),
  'del-test': async d => {
    if (!await confirmModal({ title: 'Test löschen?', ok: 'Löschen', danger: true })) return;
    const t = S.tests.find(x => x.id === d.id);
    if (t?.untisId) S.settings.untisHidden = [...(S.settings.untisHidden || []), t.untisId]; // nicht wieder aus WebUntis eintragen
    S.tests = S.tests.filter(x => x.id !== d.id); save(); go('plan');
  },
  'jarvis-ask': d => { LH.jarvis?.open(true); setTimeout(() => LH.jarvis?.send(d.q), 350); }
};
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) return go(g.dataset.go);
  const a = e.target.closest('[data-action]');
  if (a && ACTIONS[a.dataset.action] && !a.disabled) ACTIONS[a.dataset.action](a.dataset, a);
});
document.addEventListener('submit', e => {
  const f = e.target;
  if (f.classList.contains('add-card') || f.classList.contains('edit-card')) {
    e.preventDefault();
    const q = f.q.value.trim(), a = f.a.value.trim(); if (!q || !a) return;
    const sid = current.args.sid, t = topicOf(sid, f.dataset.tid || f.closest('.topic').dataset.tid);
    if (f.classList.contains('add-card')) t.cards.push({ id: uid('c'), q, a });
    else { const c = t.cards.find(c => c.id === f.dataset.cid); if (norm(c.a) !== norm(a)) delete c.wrong; Object.assign(c, { q, a }); } // neue Antwort: alte falsche Optionen passen nicht mehr
    save();
    const open = f.closest('.topic').dataset.tid; rerender();
    $(`.topic[data-tid="${open}"]`)?.classList.add('open');
    $(`.topic[data-tid="${open}"] .add-card input`)?.focus();
  }
});
document.addEventListener('keydown', e => {
  if (e.target.matches('input, select, textarea') || $('.modal-bg')) return;
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-action="open-subject"]')) { e.preventDefault(); return ACTIONS['open-subject'](e.target.dataset); }
  if (current.name === 'session' && SES && SES.i < SES.list.length) {
    if (SES.mode === 'flash') {
      if (e.key === ' ') { e.preventDefault(); ACTIONS.flip(); }
      if ($('#flip')?.classList.contains('flipped') && (e.key === '1' || e.key === '2')) answerFlash(e.key === '2', $(`[data-ok="${e.key === '2' ? 1 : 0}"]`));
    } else if (/^[1-4]$/.test(e.key) && !SES.answered && SES.opts[+e.key - 1]) answerQuiz(+e.key - 1);
    else if (e.key === 'Enter' && SES.answered) nextQ();
  }
});
// Karteikarten am Handy: umgedrehte Karte nach rechts wischen = gewusst, nach links = nicht gewusst
let touch0 = null;
document.addEventListener('touchstart', e => { if (e.target.closest('#flip')) touch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
document.addEventListener('touchend', e => {
  const t = touch0; touch0 = null; const f = $('#flip');
  if (!t || !f?.classList.contains('flipped')) return;
  const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); answerFlash(dx > 0, $(`[data-ok="${dx > 0 ? 1 : 0}"]`)); }
});
$('#open-settings').addEventListener('click', openSettings);
$('#open-settings-m')?.addEventListener('click', openSettings);
addEventListener('resize', moveInd);

// ---------- Uhr: Lernzeit, Pausen ----------
let lastAct = Date.now();
['pointerdown', 'keydown', 'pointermove', 'wheel'].forEach(ev => addEventListener(ev, () => lastAct = Date.now(), { passive: true }));
setInterval(() => {
  const visible = document.visibilityState === 'visible', idle = Date.now() - lastAct;
  const inLearn = (['session', 'drill', 'aiexam', 'vocab'].includes(current.name) && visible && idle < 120000)
    || (current.name === 'read' && visible && document.hasFocus() && idle < 600000);
  if (inLearn || (LH.focus?.active() && current.name !== 'game')) {
    S.studySec++; S.learnTick++;
    if (S.learnTick >= learnSec()) { S.learnTick = 0; S.breakBank += breakSec(); toast(`+${S.settings.breakMin}M`, 'Pause verdient', `${S.settings.learnMin} Minuten gelernt – ${S.settings.breakMin} Minuten Spielzeit gutgeschrieben`); confetti(70); }
    // markDay: auch Lesen und Fokus halten die Streak
    if (S.studySec % 60 === 0) {
      const sid = current.name === 'read' ? current.args.sid : current.name === 'session' ? SES?.list[SES.i]?.sid || SES?.sid : current.name === 'drill' ? LH.modes?.sid() : null;
      if (sid) S.subjMin[sid] = (S.subjMin[sid] || 0) + 1;
      addCoins(1); S.history[dkey()] = (S.history[dkey()] || 0) + 1; markDay(); hud(); emit('minute'); checkBadges(); }
    if (S.studySec % 15 === 0) save();
  }
  updateCountdowns(); hudBreak();
}, 1000);

// ---------- Fenster ----------
if (IS_DESKTOP) {
  $('#tb-min').onclick = () => API.win.minimize();
  $('#tb-max').onclick = () => API.win.maximize();
  $('#tb-close').onclick = () => { save(true); API.win.close(); };
}

// ---------- Öffentliche Schnittstelle für Spiele & JARVIS ----------
const LH = window.LH = {
  get S() { return S; }, set S(v) { S = v; },
  API, IS_DESKTOP, IS_MOBILE, CAN_AI, CAN_FILES, heuristic, $, $$, esc, md, norm, pad, mmss, dkey, fmtDay, shuffle, uid, ICON,
  IS_REMOTE, HAS_STORE, hello, userName, learnSec, breakSec, emit, on: (ev, fn) => (bus[ev] ||= []).push(fn), rerender, adopt, cs, promptModal, ACTIONS, openSettings, applyMotion, isDark, addDays, parseKey, fmtLong, countdown, updateCountdowns, countUp, xpPop,
  go, VIEWS, save, toast, confetti, meter, lightMeters, setMeter, addXP, addCoins, hud, hudBreak, checkBadges, reduced,
  cardsOf, subj, topicOf, progress, findSubject, levelOf, streakNow, upcoming, todayTasks, weakestTopic, buildPlan, contextString,
  pickCards, grade, startSession, quizWrong, wrongOf, addTest, openModal, COLORS, confirmModal, current: () => current, BREAK_PRICE
};

(async () => {
  if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  await load();
  applyMotion(); hud();
  if (IS_DESKTOP) API.onRequest(async (type, p) => {
    if (type === 'confirm') return confirmModal({ title: p.title, detail: p.detail, ok: 'Ausführen', code: true });
    if (type === 'appTool') return LH.jarvis?.appTool(p.name, p.input) ?? { ok: false };
    return { ok: false };
  });
  if (IS_DESKTOP) API.store.onChanged?.(async () => adopt(await API.store.load()));
  emit('ready');
  go('home');
  if (!userName()) await welcome();
  LH.jarvis?.boot();
  emit('booted');
})();
})();

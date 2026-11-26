// ===================== LernHub – Puls-Levels & Editor, Riff, Blöcke =====================
(() => {
'use strict';
const LH = window.LH;
const { $, esc } = LH;
const S = () => LH.S;
const U = LH.games.util;
const C = U.C;

// ============================================================
//  PULS – Level-Bausteine (Zeilen von oben nach unten, letzte Zeile = Boden)
//  .  leer   ^  Stachel   B  Block (man kann darauf landen)
// ============================================================
const CH = {
  s1: ['^'], s2: ['^^'], s3: ['^^^'],
  b1: ['B'], b2: ['BB'], b3: ['BBB'],
  pillar: ['B', 'B'],
  step: ['..BB', 'BBBB'],
  stair: ['....BB', '..BBBB', 'BBBBBB'],
  down: ['BB....', 'BBBB..', 'BBBBBB'],
  plat: ['BBBBBB', '^^^^^^'],
  plat2: ['.BBBB.BBBB', '^^^^^^^^^^'],
  hops: ['B...B...B'],
  spikeTop: ['..^..', 'BBBBB'],
  climb: ['......BB', '...BB...', 'BB......']
};
const LEVELS = [
  { name: 'Erste Schritte', seq: 'g6 s1 g7 s1 g6 b1 g7 s2 g7 b2 g6 s1 g4 s1 g7 b1 g6 s2 g7 s3 g7 b1 g4 s1 g9' },
  { name: 'Treppenhaus', seq: 'g6 step g6 s2 g6 stair g6 s1 g5 step g6 s3 g7 b2 g4 b2 g6 stair g5 s2 g9' },
  { name: 'Brücken', seq: 'g6 plat g6 s2 g6 plat g5 hops g6 s3 g6 plat2 g6 pillar g6 s2 g9' },
  { name: 'Säulenhalle', seq: 'g6 pillar g6 pillar g6 spikeTop g6 s3 g5 pillar g6 stair g6 plat g6 pillar g4 s2 g9' },
  { name: 'Kletterwand', seq: 'g6 climb g6 s2 g5 step g4 down g6 s3 g6 climb g6 plat2 g6 hops g5 s3 g9' },
  { name: 'Endgegner', seq: 'g6 s3 g5 pillar g5 plat g5 s2 g4 s2 g5 stair g5 down g5 plat2 g5 spikeTop g5 climb g5 pillar g4 s3 g5 hops g4 s3 g9' }
];
function build(seq) {
  const parts = seq.split(' ').map(t => t[0] === 'g' ? Array(+t.slice(1)).fill('.').join('') : CH[t]).map(p => typeof p === 'string' ? [p] : p);
  const H = Math.max(...parts.map(p => p.length));
  const rows = Array.from({ length: H }, () => '');
  for (const p of parts) {
    const w = Math.max(...p.map(r => r.length)), pad = H - p.length;
    for (let r = 0; r < H; r++) rows[r] += (r < pad ? '' : p[r - pad]).padEnd(w, '.');
  }
  return rows;
}
const levelRows = key => key === 'endless' ? null : String(key).startsWith('c_') ? S().runner.custom.find(c => c.id === key)?.rows : build(LEVELS[+key].seq);
const levelName = key => key === 'endless' ? 'Puls · Endlos' : String(key).startsWith('c_') ? (S().runner.custom.find(c => c.id === key)?.name || 'Eigenes Level') : `Puls · ${LEVELS[+key]?.name}`;
function parse(rows, x0, Ucell, GY) {
  const H = rows.length, objs = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    const level = H - 1 - r, x = x0 + c * Ucell, top = GY - (level + 1) * Ucell;
    if (ch === 'B') objs.push({ t: 'b', x, y: top, w: Ucell, h: Ucell });
    if (ch === '^') objs.push({ t: 's', x, y: top, w: Ucell, h: Ucell });
  }));
  return objs;
}

// ---------- Runner-Physik (rein, damit Levels automatisch geprüft werden können) ----------
const PHYS = { GY: 330, Uc: 40, P: 30, PX: 160, JV: 830, G: 2500 };
function physStep(g, dt, held) {
  const { GY, P, PX, JV, G } = PHYS;
  const prevBottom = g.y + P;
  if (held && g.onG) { g.vy = -JV; g.onG = false; }
  g.vy += G * dt; g.y += g.vy * dt; g.cam += g.speed * dt;
  const px = g.cam + PX;
  let support = false;
  if (g.y + P >= GY) { g.y = GY - P; g.vy = 0; support = true; }
  for (const o of g.objs) {
    if (o.x > px + P + 40 || o.x + o.w < px - 40) continue;
    const ox1 = px + 3, ox2 = px + P - 3;
    if (o.t === 'b') {
      if (ox2 > o.x && ox1 < o.x + o.w) {
        if (g.vy >= 0 && prevBottom <= o.y + 6 && g.y + P >= o.y) { g.y = o.y - P; g.vy = 0; support = true; }
        else if (g.y + P > o.y + 6 && g.y < o.y + o.h - 2) return 'die';
      }
    } else if (ox2 > o.x + 11 && ox1 < o.x + o.w - 11 && g.y + P > o.y + 16 && g.y < o.y + o.h) return 'die';
    if (!o.passed && o.x + o.w < px) { o.passed = true; if (o.chunk && !g.objs.some(q => q !== o && q.chunk === o.chunk && !q.passed)) { g.score++; g.flash = 1; } }
  }
  if (!support) { const feet = g.y + P; support = g.objs.some(o => o.t === 'b' && Math.abs(feet - o.y) < 1.5 && px + P - 3 > o.x && px + 3 < o.x + o.w); }
  if (support && !g.onG) g.rot = Math.round(g.rot / (Math.PI / 2)) * (Math.PI / 2);
  g.onG = support;
  if (!support) g.rot += 6.4 * dt;
  return null;
}

// ---------- Runner-Spiel ----------
function runner(st, id, { level = 'endless' } = {}) {
  const W = 960, H = 400, GY = 330, Uc = 40, P = 30, PX = 160, JV = 830, G = 2500;
  const { x } = U.makeCanvas(st, W, H);
  const endless = level === 'endless', rows = levelRows(level);
  const len = rows ? rows[0].length * Uc + 600 : Infinity;
  const skin = S().shop.skin, sig = LH.themeColor();
  let g, raf = 0, last = 0, held = false;
  const api = { paused: false, over: false };
  const reset = () => {
    g = { y: GY - P, vy: 0, rot: 0, onG: true, cam: 0, speed: endless ? 430 : 440, objs: rows ? parse(rows, 900, Uc, GY) : [], genX: 900, score: 0, parts: [], over: false, won: false, started: false, flash: 0, att: (g?.att || 0) + 1 };
    if (endless) gen();
  };
  function gen() {
    const names = Object.keys(CH);
    while (g.genX < g.cam + 2400) {
      const k = names[Math.floor(Math.random() * names.length)];
      const r = build(`${k} g${5 + Math.floor(Math.random() * 3)}`);
      const o = parse(r, g.genX, Uc, GY); o.forEach(b => b.chunk = g.genX);
      g.objs.push(...o); g.genX += r[0].length * Uc;
    }
  }
  reset();
  const jumpKey = e => [' ', 'ArrowUp', 'w', 'W'].includes(e.key) && !e.target.matches('input,textarea');
  const down = e => { if (!jumpKey(e)) return; e.preventDefault(); if (g.over || g.won) return api.restart(); if (!g.started) { g.started = true; U.clearOverlay(); } held = true; };
  const up = e => { if (jumpKey(e)) held = false; };
  addEventListener('keydown', down); addEventListener('keyup', up);
  const cv = st.querySelector('canvas');
  cv.addEventListener('pointerdown', () => { if (g.over || g.won) return api.restart(); if (!g.started) { g.started = true; U.clearOverlay(); } held = true; });
  addEventListener('pointerup', () => held = false);
  U.overlay(`<h3>${esc(levelName(level))}</h3><p>Leertaste oder Klick zum Springen. Gedrückt halten springt automatisch weiter.</p><button class="btn primary" data-g="restart">Start</button>`);
  const pct = () => endless ? 0 : Math.min(100, Math.floor(g.cam / (len - 600) * 100));
  function die() {
    g.over = true; api.over = true;
    for (let i = 0; i < 30; i++) g.parts.push({ x: PX + P / 2, y: g.y + P / 2, vx: (Math.random() - .5) * 620, vy: (Math.random() - .8) * 620, l: 1, s: Math.random() * 8 + 3 });
    let txt;
    if (endless) { const best = U.record(id, g.score); $('#g-best').textContent = S().scores[id]; txt = `<h3>${g.score} Hindernisse</h3><p>${best ? 'Neuer Rekord.' : `Rekord: ${S().scores[id]}`}</p>`; }
    else { const p = pct(), prev = S().runner.levels[level] || 0; if (p > prev) { S().runner.levels[level] = p; LH.save(); } txt = `<h3>${p} %</h3><p>Versuch ${g.att} · Bestwert ${Math.max(p, prev)} %</p>`; }
    setTimeout(() => U.overlay(`${txt}<button class="btn primary" data-g="restart">Nochmal <span class="kbd">Leer</span></button>`), 450);
  }
  function win() {
    g.won = true; api.over = true;
    S().runner.levels[level] = 100; LH.addCoins(10); LH.checkBadges(); LH.save(); LH.confetti(200);
    U.overlay(`<h3>Level geschafft</h3><p>Nach ${g.att} Versuch${g.att > 1 ? 'en' : ''} · +10 Münzen</p><div class="row" style="justify-content:center"><button class="btn" data-g="restart">Nochmal</button><button class="btn primary" data-go="levels">Levelauswahl</button></div>`);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.025, (now - (last || now)) / 1000); last = now;
    if (!api.paused && g.started && !g.over && !g.won) {
      if (endless) { g.speed = Math.min(800, g.speed + 6 * dt); gen(); }
      // feste Teilschritte, damit die Physik bei jeder Bildrate gleich ist
      let rest = dt;
      while (rest > 0) { const h = Math.min(1 / 120, rest); rest -= h; if (physStep(g, h, held) === 'die') return die(); }
      const px = g.cam + PX;
      if (endless) g.objs = g.objs.filter(o => o.x > g.cam - 200);
      if (!endless && g.cam >= len - 600) return win();
      if (g.onG && Math.random() < .5) g.parts.push({ x: px, y: g.y + P - 2, vx: -g.speed * .35, vy: -Math.random() * 60, l: .55, s: 3, rel: true });
    }
    for (const p of g.parts) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt * 1.4; }
    g.parts = g.parts.filter(p => p.l > 0);
    g.flash = Math.max(0, g.flash - dt * 3);
    // zeichnen
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { const bx = ((i * 90 - g.cam * .12) % 1260 + 1260) % 1260 - 90, bh = 40 + ((i * 53) % 7) * 18; x.fillStyle = '#141312'; x.fillRect(bx, GY - bh, 46, bh); }
    x.strokeStyle = g.flash > 0 ? sig : C.line2; x.lineWidth = 2; x.beginPath(); x.moveTo(0, GY); x.lineTo(W, GY); x.stroke();
    for (let i = 0; i < 24; i++) { const tx = ((i * 48 - g.cam) % 1152 + 1152) % 1152 - 48; x.fillStyle = C.line; x.fillRect(tx, GY + 12, 22, 2); }
    for (const o of g.objs) {
      const sx = o.x - g.cam; if (sx > W || sx + o.w < -10) continue;
      if (o.t === 's') U.spike(x, sx + 4, o.y + o.h, o.w - 8, C.ink);
      else { x.fillStyle = C.panel; x.fillRect(sx, o.y, o.w, o.h); x.strokeStyle = C.ink2; x.lineWidth = 2; x.strokeRect(sx + 1, o.y + 1, o.w - 2, o.h - 2); }
    }
    if (!endless) { const fx = len - 600 + PX - g.cam; if (fx < W) { for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? C.ink : sig; x.fillRect(fx, GY - 40 * (i + 1), 8, 40); } } }
    for (const p of g.parts) { x.globalAlpha = Math.max(0, p.l); x.fillStyle = sig; x.fillRect(p.rel ? p.x - g.cam : p.x, p.y, p.s, p.s); }
    x.globalAlpha = 1;
    if (!g.over) LH.drawSkin(x, skin, PX + P / 2, g.y + P / 2, P, g.rot, sig);
    if (!endless) { x.fillStyle = C.line; x.fillRect(W / 2 - 160, 16, 320, 6); x.fillStyle = sig; x.fillRect(W / 2 - 160, 16, 320 * pct() / 100, 6); }
    const sc = $('#g-score'); if (sc) sc.textContent = endless ? g.score : `${pct()} %`;
  }
  raf = requestAnimationFrame(frame);
  return Object.assign(api, {
    pause(p) { api.paused = p; },
    restart() { reset(); api.over = false; g.started = true; held = false; U.clearOverlay(); },
    destroy() { cancelAnimationFrame(raf); removeEventListener('keydown', down); removeEventListener('keyup', up); }
  });
}

// ---------- Levelauswahl ----------
LH.VIEWS.levels = {
  html() {
    const lv = S().runner.levels, cus = S().runner.custom;
    const card = (key, name, sub) => { const p = lv[key] || 0;
      return `<div class="panel lvl-card ${p >= 100 ? 'done' : ''}"><div class="row" style="justify-content:space-between"><b>${esc(name)}</b><span class="mono ${p >= 100 ? '' : 'muted'}">${p >= 100 ? '✓' : p + ' %'}</span></div><small class="muted">${sub}</small>
      ${LH.meter(p, 20, { cls: 'thin', color: p >= 100 ? 'var(--ok)' : undefined })}
      <div class="row"><button class="btn sm primary" data-lv="play" data-key="${key}">Spielen</button>${String(key).startsWith('c_') ? `<button class="btn sm ghost" data-lv="edit" data-key="${key}">Bearbeiten</button><button class="icon-btn danger" data-lv="del" data-key="${key}" aria-label="Level löschen">${LH.ICON.trash}</button>` : ''}</div></div>`; };
    return `<button class="back" data-go="break">← Pause</button>
      <div class="page-head"><div><div class="eyebrow">Puls</div><h1 class="h1">Levels</h1><p class="lede">Schaff alle sechs, bau eigene oder lauf endlos. Pausenzeit übrig: ${LH.mmss(S().breakBank)}.</p></div>
      <div class="row"><button class="btn" data-lv="play" data-key="endless">Endlos · Rekord ${S().scores.runner || 0}</button><button class="btn primary" data-lv="new">Level bauen</button></div></div>
      <div class="lvl-grid">${LEVELS.map((l, i) => card(i, `${i + 1}. ${l.name}`, ['Leicht', 'Leicht', 'Mittel', 'Mittel', 'Schwer', 'Sehr schwer'][i])).join('')}</div>
      ${cus.length ? `<h2 class="h2">Deine Levels <span class="mono">${cus.length}</span></h2><div class="lvl-grid">${cus.map(c => card(c.id, c.name, `${c.rows[0].length} Felder`)).join('')}</div>` : ''}`;
  }
};
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-lv]'); if (!b) return;
  const a = b.dataset.lv, key = b.dataset.key;
  if (a === 'play') { if (S().breakBank <= 0) return LH.toast('0:00', 'Keine Pausenzeit', 'Erst lernen oder Zeit kaufen'); S().stats.games++; LH.go('game', { id: 'runner', level: key === 'endless' ? 'endless' : isNaN(+key) ? key : +key }); }
  if (a === 'new') LH.go('editor', {});
  if (a === 'edit') LH.go('editor', { key });
  if (a === 'del' && await LH.confirmModal({ title: 'Level löschen?', ok: 'Löschen', danger: true })) { S().runner.custom = S().runner.custom.filter(c => c.id !== key); delete S().runner.levels[key]; LH.save(); LH.rerender(); }
});

// ---------- Level-Editor ----------
let E = null;
LH.VIEWS.editor = {
  html({ key }) {
    const ex = key && S().runner.custom.find(c => c.id === key);
    E = { key: ex?.id || null, name: ex?.name || 'Mein Level', grid: (ex?.rows || Array(6).fill('.'.repeat(80))).map(r => [...r]), tool: '^' };
    while (E.grid.length < 6) E.grid.unshift([...'.'.repeat(E.grid[0].length)]);
    return `<button class="back" data-go="levels">← Levels</button>
      <div class="page-head"><div><div class="eyebrow">Level-Editor</div><h1 class="h1">Bau dein Level</h1><p class="lede">Klick ins Raster zum Setzen, nochmal zum Löschen. Unterste Reihe ist der Boden.</p></div>
      <div class="row"><input class="input" id="ed-name" value="${esc(E.name)}" style="width:200px" aria-label="Levelname"><button class="btn primary" data-ed="save">Speichern & testen</button></div></div>
      <div class="row" style="margin-top:18px"><span class="muted" style="font-size:13px">Werkzeug:</span>
        <button class="chip ed-tool sel" data-ed="tool" data-t="^">▲ Stachel</button><button class="chip ed-tool" data-ed="tool" data-t="B">■ Block</button><button class="chip ed-tool" data-ed="tool" data-t=".">Radierer</button>
        <span style="flex:1"></span><button class="btn sm ghost" data-ed="len" data-d="-20">−20 Felder</button><button class="btn sm ghost" data-ed="len" data-d="20">+20 Felder</button></div>
      <div class="ed-wrap"><canvas id="ed"></canvas></div>`;
  },
  mount() { drawEd(); $('#ed').addEventListener('pointerdown', edClick); }
};
const EC = 26;
function drawEd() {
  const c = $('#ed'); if (!c) return;
  const cols = E.grid[0].length, rows = E.grid.length;
  c.width = cols * EC; c.height = rows * EC; c.style.width = cols * EC + 'px';
  const x = c.getContext('2d'), sig = LH.themeColor();
  x.fillStyle = C.bg; x.fillRect(0, 0, c.width, c.height);
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    x.strokeStyle = k % 10 === 0 ? C.line2 : '#1d1c19'; x.strokeRect(k * EC + .5, r * EC + .5, EC, EC);
    const ch = E.grid[r][k];
    if (ch === 'B') { x.fillStyle = C.panel; x.fillRect(k * EC + 1, r * EC + 1, EC - 2, EC - 2); x.strokeStyle = C.ink2; x.strokeRect(k * EC + 2, r * EC + 2, EC - 4, EC - 4); }
    if (ch === '^') U.spike(x, k * EC + 3, (r + 1) * EC - 1, EC - 6, sig);
  }
  x.fillStyle = C.line2; x.fillRect(0, rows * EC - 2, c.width, 2);
  x.fillStyle = C.ink3; x.font = '10px "JB Mono", monospace';
  for (let k = 0; k < cols; k += 10) x.fillText(k, k * EC + 3, 10);
}
function edClick(e) {
  const c = $('#ed'), r = c.getBoundingClientRect();
  const k = Math.floor((e.clientX - r.left) / EC), row = Math.floor((e.clientY - r.top) / EC);
  if (row < 0 || row >= E.grid.length || k < 0 || k >= E.grid[0].length) return;
  E.grid[row][k] = E.grid[row][k] === E.tool ? '.' : E.tool;
  drawEd();
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ed]'); if (!b || !E) return;
  if (b.dataset.ed === 'tool') { E.tool = b.dataset.t; document.querySelectorAll('.ed-tool').forEach(x => x.classList.toggle('sel', x === b)); }
  if (b.dataset.ed === 'len') { const d = +b.dataset.d; E.grid = E.grid.map(r => d > 0 ? [...r, ...'.'.repeat(d)] : r.slice(0, Math.max(30, r.length + d))); drawEd(); }
  if (b.dataset.ed === 'save') {
    const rows = E.grid.map(r => r.join('')).filter((r, i, a) => i === a.length - 1 || /[^.]/.test(r) || a.slice(0, i).some(x => /[^.]/.test(x)));
    const name = $('#ed-name').value.trim() || 'Mein Level';
    if (!/[B^]/.test(rows.join(''))) return LH.toast('LEER', 'Level ist leer', 'Setz ein paar Stacheln oder Blöcke');
    if (E.key) Object.assign(S().runner.custom.find(c => c.id === E.key), { name, rows });
    else { E.key = LH.uid('c'); S().runner.custom.push({ id: E.key, name, rows }); }
    LH.save(); LH.toast('LVL', 'Level gespeichert', name);
    if (S().breakBank > 0) LH.go('game', { id: 'runner', level: E.key }); else LH.go('levels');
  }
});

// ============================================================
//  RIFF – Rhythmus mit gezupfter Gitarre (Karplus-Strong)
// ============================================================
function riff(st, id) {
  const W = 960, H = 480, LANES = 4, KEYS = ['d', 'f', 'j', 'k'], HITY = 400, SPEED = 380;
  const { x } = U.makeCanvas(st, W, H);
  const sig = LH.themeColor();
  let ac = null, raf = 0, g = null;
  const api = { paused: false, over: false };
  const NOTES = [[82.4, 123.5, 164.8], [98, 146.8, 196], [110, 164.8, 220], [146.8, 220, 293.7]]; // Em, G, A, D
  function pluck(freq, t, vol = .35, dur = 1.2) {
    const sr = ac.sampleRate, len = Math.floor(sr * dur), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const N = Math.round(sr / freq), ring = new Float32Array(N).map(() => Math.random() * 2 - 1);
    for (let i = 0; i < len; i++) { const j = i % N; const v = ring[j]; d[i] = v; ring[j] = .996 * .5 * (v + ring[(j + 1) % N]); }
    const src = ac.createBufferSource(); src.buffer = buf;
    const gn = ac.createGain(); gn.gain.value = vol;
    const sh = ac.createWaveShaper(); const curve = new Float32Array(256).map((_, i) => Math.tanh((i / 128 - 1) * 2.4)); sh.curve = curve;
    src.connect(sh).connect(gn).connect(ac.destination); src.start(t);
  }
  function drum(kind, t) {
    const o = ac.createOscillator(), gn = ac.createGain();
    if (kind === 'k') { o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); gn.gain.setValueAtTime(.6, t); gn.gain.exponentialRampToValueAtTime(.001, t + .18); o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + .2); }
    else { const b = ac.createBuffer(1, 2205, 44100), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; gn.gain.value = kind === 's' ? .35 : .12; s.connect(f).connect(gn).connect(ac.destination); s.start(t); }
  }
  function song(diff) {
    const bpm = [96, 116, 136][diff], beat = 60 / bpm, notes = [], bars = 24;
    const dens = [.35, .55, .8][diff];
    let seed = Date.now() % 9973;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const riffs = Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => rnd() < dens ? Math.floor(rnd() * LANES) : -1));
    for (let b = 0; b < bars; b++) {
      const rf = riffs[[0, 0, 1, 1, 2, 2, 3, 1][b % 8]];
      rf.forEach((l, i) => { if (l >= 0) notes.push({ t: 2 + (b * 8 + i) * beat / 2, lane: l, chord: b % 4 }); });
      if (diff === 2 && b % 4 === 3) notes.push({ t: 2 + (b * 8 + 7) * beat / 2, lane: (b + 1) % LANES, chord: b % 4 });
    }
    return { notes, beat, end: 2 + bars * 4 * beat + 1.5 };
  }
  function start(diff) {
    ac = ac || new AudioContext(); if (ac.state === 'suspended') ac.resume();
    const s = song(diff);
    g = { ...s, diff, t0: ac.currentTime, score: 0, combo: 0, best: 0, hits: 0, miss: 0, fx: [], lane: [0, 0, 0, 0], judge: null, sched: 0, pausedAt: 0 };
    api.over = false; U.clearOverlay();
  }
  const now = () => g ? (api.paused ? g.pausedAt : ac.currentTime - g.t0) : 0;
  function hit(l) {
    if (!g || api.over || api.paused) return;
    g.lane[l] = 1;
    const t = now();
    const n = g.notes.find(n => !n.done && n.lane === l && Math.abs(n.t - t) < .14);
    if (!n) { g.combo = 0; g.judge = { txt: 'Daneben', c: C.ink3, a: 1 }; return; }
    n.done = true; const err = Math.abs(n.t - t);
    const perfect = err < .06;
    g.combo++; g.best = Math.max(g.best, g.combo); g.hits++;
    g.score += (perfect ? 100 : 60) * (1 + Math.floor(g.combo / 10));
    g.judge = { txt: perfect ? 'Perfekt' : 'Gut', c: perfect ? sig : C.ok, a: 1 };
    pluck(NOTES[n.chord][l % 3] * (l === 3 ? 2 : 1), ac.currentTime, .3);
    for (let i = 0; i < 10; i++) g.fx.push({ x: laneX(l) + lw / 2, y: HITY, vx: (Math.random() - .5) * 300, vy: -Math.random() * 300, l: 1 });
  }
  const lw = 110, ox = (W - LANES * lw) / 2, laneX = l => ox + l * lw;
  const onKey = e => { if (e.target.matches('input,textarea') || e.repeat) return; const l = KEYS.indexOf(e.key.toLowerCase()); if (l >= 0) { e.preventDefault(); hit(l); } };
  addEventListener('keydown', onKey);
  st.querySelector('canvas').addEventListener('pointerdown', e => { const r = e.target.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, l = Math.floor((px - ox) / lw); if (l >= 0 && l < LANES) hit(l); });
  U.overlay(`<h3>Riff</h3><p>Triff die Noten, wenn sie die Linie berühren: D F J K oder antippen.</p><div class="row" style="justify-content:center"><button class="btn" data-rf="0">Leicht</button><button class="btn primary" data-rf="1">Mittel</button><button class="btn" data-rf="2">Schwer</button></div>`);
  const onPick = e => { const b = e.target.closest('[data-rf]'); if (b) start(+b.dataset.rf); };
  st.addEventListener('click', onPick);
  function finish() {
    api.over = true;
    const acc = Math.round(g.hits / Math.max(1, g.notes.length) * 100);
    const best = U.record(id, g.score); $('#g-best').textContent = S().scores[id];
    U.overlay(`<h3>${g.score} Punkte</h3><p>${acc} % getroffen · beste Kombo ${g.best}${best ? ' · neuer Rekord' : ''}</p><div class="row" style="justify-content:center"><button class="btn" data-rf="0">Leicht</button><button class="btn primary" data-rf="1">Mittel</button><button class="btn" data-rf="2">Schwer</button></div>`);
    if (acc >= 90) LH.confetti(150);
  }
  let last = 0;
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    for (let l = 0; l < LANES; l++) {
      x.fillStyle = '#151412'; x.fillRect(laneX(l) + 4, 0, lw - 8, H);
      if (g) { g.lane[l] = Math.max(0, g.lane[l] - dt * 5); if (g.lane[l]) { x.globalAlpha = g.lane[l] * .25; x.fillStyle = sig; x.fillRect(laneX(l) + 4, 0, lw - 8, H); x.globalAlpha = 1; } }
      x.fillStyle = C.ink3; x.font = '600 16px "JB Mono", monospace'; x.textAlign = 'center'; x.fillText(KEYS[l].toUpperCase(), laneX(l) + lw / 2, H - 22);
    }
    x.fillStyle = C.ink2; x.fillRect(ox, HITY - 2, LANES * lw, 4);
    if (g && !api.over) {
      const t = now();
      if (!api.paused) {
        while (g.sched < t + .2) { const bt = g.sched; if (bt >= 2) { const bi = Math.round((bt - 2) / g.beat); drum(bi % 2 ? 's' : 'k', g.t0 + bt); drum('h', g.t0 + bt + g.beat / 2); } g.sched += g.beat; }
        for (const n of g.notes) if (!n.done && !n.missed && t - n.t > .14) { n.missed = true; g.combo = 0; g.miss++; g.judge = { txt: 'Verpasst', c: C.bad || '#ff5a4f', a: 1 }; }
        if (t > g.end) finish();
      }
      for (const n of g.notes) {
        if (n.done || n.missed) continue;
        const y = HITY - (n.t - t) * SPEED; if (y < -30 || y > H) continue;
        x.fillStyle = n.lane % 2 ? C.ink : sig; x.fillRect(laneX(n.lane) + 12, y - 9, lw - 24, 18);
      }
      for (const p of g.fx) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.l -= dt * 2; x.globalAlpha = Math.max(0, p.l); x.fillStyle = sig; x.fillRect(p.x, p.y, 4, 4); }
      x.globalAlpha = 1; g.fx = g.fx.filter(p => p.l > 0);
      if (g.judge) { g.judge.a -= dt * 1.5; x.globalAlpha = Math.max(0, g.judge.a); x.fillStyle = g.judge.c; x.font = '700 28px "Bricolage", sans-serif'; x.textAlign = 'center'; x.fillText(g.judge.txt, W / 2, 200); x.globalAlpha = 1; }
      x.textAlign = 'right'; x.fillStyle = C.ink; x.font = '600 15px "JB Mono", monospace'; x.fillText(`KOMBO ${g.combo}`, W - 24, 34);
      x.fillStyle = C.line; x.fillRect(24, H - 8, W - 48, 3); x.fillStyle = sig; x.fillRect(24, H - 8, (W - 48) * Math.min(1, t / g.end), 3);
      const sc = $('#g-score'); if (sc) sc.textContent = g.score;
    }
  }
  raf = requestAnimationFrame(frame);
  return Object.assign(api, {
    pause(p) { if (!g) return (api.paused = p); if (p && !api.paused) { g.pausedAt = now(); ac.suspend(); } if (!p && api.paused) { ac.resume(); } api.paused = p; },
    restart() { start(g?.diff ?? 1); },
    destroy() { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); try { ac?.close(); } catch {} }
  });
}

// ============================================================
//  BLÖCKE – Tetris-artig
// ============================================================
function blocks(st, id) {
  const COLS = 10, ROWS = 20, S_ = 26, W = 560, H = ROWS * S_ + 20, OX = 20, OY = 10;
  const { x } = U.makeCanvas(st, W, H);
  st.style.maxWidth = '640px'; st.style.margin = '18px auto 0';
  const sig = LH.themeColor();
  const SH = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] };
  const COL = { I: sig, O: '#ffc24b', T: '#efe9dd', S: '#8fd16a', Z: '#ff5a4f', J: '#6c9cff', L: '#b4ac9e' };
  let g, raf = 0, last = 0, bag = [];
  const api = { paused: false, over: false };
  const nextType = () => { if (!bag.length) bag = Object.keys(SH).sort(() => Math.random() - .5); return bag.pop(); };
  const spawn = t => ({ t, cells: SH[t].map(c => [...c]), x: 3, y: 0 });
  const reset = () => { g = { grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), cur: spawn(nextType()), next: nextType(), score: 0, lines: 0, level: 1, acc: 0, clearing: null, started: false, over: false }; };
  reset();
  const fits = (cells, px, py) => cells.every(([cx, cy]) => { const X = px + cx, Y = py + cy; return X >= 0 && X < COLS && Y < ROWS && (Y < 0 || !g.grid[Y][X]); });
  function rotate() {
    const p = g.cur; if (p.t === 'O') return;
    const size = p.t === 'I' ? 4 : 3;
    const rot = p.cells.map(([cx, cy]) => [size - 1 - cy, cx]);
    for (const k of [0, -1, 1, -2, 2]) if (fits(rot, p.x + k, p.y)) { p.cells = rot; p.x += k; return; }
  }
  function lock() {
    for (const [cx, cy] of g.cur.cells) { const Y = g.cur.y + cy; if (Y < 0) return gameOver(); g.grid[Y][g.cur.x + cx] = g.cur.t; }
    const full = g.grid.map((r, i) => r.every(Boolean) ? i : -1).filter(i => i >= 0);
    if (full.length) { g.clearing = { rows: full, t: .25 }; g.score += [0, 100, 300, 500, 800][full.length] * g.level; g.lines += full.length; g.level = 1 + Math.floor(g.lines / 10); if (full.length === 4) LH.confetti(80); }
    g.cur = spawn(g.next); g.next = nextType();
    if (!fits(g.cur.cells, g.cur.x, g.cur.y)) gameOver();
  }
  function gameOver() {
    g.over = true; api.over = true;
    const best = U.record(id, g.score); $('#g-best').textContent = S().scores[id];
    setTimeout(() => U.overlay(`<h3>${g.score} Punkte</h3><p>${g.lines} Reihen · Level ${g.level}${best ? ' · neuer Rekord' : ''}</p><button class="btn primary" data-g="restart">Nochmal</button>`), 300);
  }
  const move = dx => { if (fits(g.cur.cells, g.cur.x + dx, g.cur.y)) g.cur.x += dx; };
  const drop = () => { if (fits(g.cur.cells, g.cur.x, g.cur.y + 1)) { g.cur.y++; return true; } lock(); return false; };
  const onKey = e => {
    if (e.target.matches('input,textarea') || g.over || api.paused) return;
    const k = e.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'a', 'd', 's', 'w'].includes(k)) return;
    e.preventDefault();
    if (!g.started) { g.started = true; U.clearOverlay(); }
    if (g.clearing) return;
    if (k === 'ArrowLeft' || k === 'a') move(-1);
    if (k === 'ArrowRight' || k === 'd') move(1);
    if (k === 'ArrowDown' || k === 's') { if (drop()) g.score += 1; }
    if (k === 'ArrowUp' || k === 'w') rotate();
    if (k === ' ') { let n = 0; while (drop()) n++; g.score += n * 2; }
  };
  addEventListener('keydown', onKey);
  let tp = null;
  const cv = st.querySelector('canvas');
  cv.addEventListener('pointerdown', e => { tp = { x: e.clientX, y: e.clientY, t: Date.now() }; if (!g.started) { g.started = true; U.clearOverlay(); } });
  cv.addEventListener('pointerup', e => { if (!tp || g.over) return; const dx = e.clientX - tp.x, dy = e.clientY - tp.y; if (Math.abs(dx) < 15 && Math.abs(dy) < 15) rotate(); else if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx) * Math.max(1, Math.round(Math.abs(dx) / 30))); else if (dy > 40) { while (drop()); } tp = null; });
  U.overlay('<h3>Blöcke</h3><p>← → bewegen, ↑ drehen, ↓ schneller, Leertaste fallen lassen.</p><button class="btn primary" data-g="restart">Start</button>');
  const cell = (cx, cy, col, a = 1) => { x.globalAlpha = a; x.fillStyle = col; x.fillRect(OX + cx * S_ + 1, OY + cy * S_ + 1, S_ - 2, S_ - 2); x.globalAlpha = a * .25; x.fillStyle = '#000'; x.fillRect(OX + cx * S_ + 1, OY + cy * S_ + S_ - 6, S_ - 2, 5); x.globalAlpha = 1; };
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
    if (!api.paused && g.started && !g.over) {
      if (g.clearing) { g.clearing.t -= dt; if (g.clearing.t <= 0) { const rs = g.clearing.rows; g.grid = g.grid.filter((_, i) => !rs.includes(i)); while (g.grid.length < ROWS) g.grid.unshift(Array(COLS).fill(null)); g.clearing = null; } }
      else { g.acc += dt; const step = Math.max(.06, .8 * Math.pow(.85, g.level - 1)); while (g.acc >= step) { g.acc -= step; drop(); } }
    }
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    x.fillStyle = C.panel; x.fillRect(OX, OY, COLS * S_, ROWS * S_);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = g.grid[r][c];
      if (v) cell(c, r, g.clearing?.rows.includes(r) ? '#fff' : COL[v], g.clearing?.rows.includes(r) ? .5 + g.clearing.t * 2 : 1);
      else { x.fillStyle = '#1d1c19'; x.fillRect(OX + c * S_ + S_ / 2 - 1, OY + r * S_ + S_ / 2 - 1, 2, 2); }
    }
    if (!g.over && !g.clearing) {
      let gy = g.cur.y; while (fits(g.cur.cells, g.cur.x, gy + 1)) gy++;
      g.cur.cells.forEach(([cx, cy]) => { if (gy + cy >= 0) { x.strokeStyle = COL[g.cur.t]; x.globalAlpha = .4; x.strokeRect(OX + (g.cur.x + cx) * S_ + 2, OY + (gy + cy) * S_ + 2, S_ - 4, S_ - 4); x.globalAlpha = 1; } });
      g.cur.cells.forEach(([cx, cy]) => { if (g.cur.y + cy >= 0) cell(g.cur.x + cx, g.cur.y + cy, COL[g.cur.t]); });
    }
    const sx = OX + COLS * S_ + 30;
    x.fillStyle = C.ink3; x.font = '500 11px "JB Mono", monospace'; x.textAlign = 'left';
    x.fillText('NÄCHSTER', sx, 30); SH[g.next].forEach(([cx, cy]) => { x.fillStyle = COL[g.next]; x.fillRect(sx + cx * 22, 44 + cy * 22, 20, 20); });
    [['PUNKTE', g.score], ['REIHEN', g.lines], ['LEVEL', g.level]].forEach(([l, v], i) => { x.fillStyle = C.ink3; x.font = '500 11px "JB Mono", monospace'; x.fillText(l, sx, 140 + i * 64); x.fillStyle = C.ink; x.font = '600 26px "JB Mono", monospace'; x.fillText(v, sx, 170 + i * 64); });
    const sc = $('#g-score'); if (sc) sc.textContent = '';
  }
  raf = requestAnimationFrame(frame);
  return Object.assign(api, {
    pause(p) { api.paused = p; },
    restart() { reset(); api.over = false; g.started = true; U.clearOverlay(); },
    destroy() { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); }
  });
}

LH.games2 = { runner, riff, blocks, levelName, LEVELS, build, parse, physStep, PHYS, CH };
})();

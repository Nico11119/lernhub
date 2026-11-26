// ===================== LernHub 2 – Pause & Spiele =====================
(() => {
'use strict';
const LH = window.LH;
const { $, esc, mmss } = LH;
const C = { bg: '#0d0c0b', panel: '#1a1917', line: '#2e2b27', line2: '#3d3934', ink: '#efe9dd', ink2: '#b4ac9e', ink3: '#7f786c', sig: '#ff6b2c', peak: '#ffc24b', ok: '#8fd16a' };

const GAMES = {
  runner: { name: 'Puls', desc: 'Springen im Takt: sechs Levels, Endlos-Modus und eigener Level-Editor.', unit: 'Hindernisse' },
  riff: { name: 'Riff', desc: 'Rhythmus-Spiel mit Gitarrensound. Triff die Noten mit D, F, J, K.', unit: 'Punkte' },
  blocks: { name: 'Blöcke', desc: 'Fallende Steine, volle Reihen verschwinden. Pfeiltasten, Leertaste fällt.', unit: 'Punkte' },
  g2048: { name: '2048', desc: 'Schieb gleiche Zahlen zusammen, bis die 2048 steht. Pfeiltasten oder wischen.', unit: 'Punkte' },
  snake: { name: 'Snake', desc: 'Klassiker. Frisst du, wirst du länger und schneller. Pfeiltasten oder WASD.', unit: 'Punkte' }
};

// ---------- Pausenkonto ----------
let tick = 0, active = null, previewRaf = 0;
function startClock() {
  clearInterval(tick);
  tick = setInterval(() => {
    if (!active || active.paused || active.over || document.visibilityState !== 'visible') return;
    LH.S.breakBank = Math.max(0, LH.S.breakBank - 1);
    LH.hudBreak();
    const t = $('#g-time'); if (t) t.textContent = mmss(LH.S.breakBank);
    if (LH.S.breakBank <= 0) { active.pause(true); outOfTime(); }
    if (LH.S.breakBank % 15 === 0) LH.save();
  }, 1000);
}
function stop() { clearInterval(tick); cancelAnimationFrame(previewRaf); active?.destroy(); active = null; LH.save(); }
function buyTime() {
  if (LH.S.coins < LH.BREAK_PRICE) return LH.toast('🪙', 'Zu wenig Münzen', `Du brauchst ${LH.BREAK_PRICE}`);
  LH.S.coins -= LH.BREAK_PRICE; LH.S.breakBank += LH.breakSec(); LH.hud(); LH.save();
  LH.toast(`+${LH.S.settings.breakMin}M`, `${LH.S.settings.breakMin} Minuten gekauft`, `−${LH.BREAK_PRICE} Münzen`);
}
function overlay(html) {
  const st = $('#stage'); if (!st) return;
  st.querySelector('.overlay')?.remove();
  st.insertAdjacentHTML('beforeend', `<div class="overlay"><div>${html}</div></div>`);
}
const clearOverlay = () => $('#stage .overlay')?.remove();
function outOfTime() {
  overlay(`<h3>Pausenzeit aufgebraucht</h3><p>${LH.S.settings.learnMin} Minuten lernen gibt ${LH.S.settings.breakMin} neue Minuten.</p>
    <div class="row" style="justify-content:center"><button class="btn" data-g="buy">+${LH.S.settings.breakMin} Min · ${LH.BREAK_PRICE} Münzen</button><button class="btn primary" data-go="subjects">Weiterlernen</button></div>`);
}
function record(game, score) {
  const best = LH.S.scores[game] || 0;
  if (score > best) { LH.S.scores[game] = score; LH.toast('TOP', 'Neuer Rekord', `${GAMES[game].name}: ${score}`); }
  LH.checkBadges(); LH.save();
  return score > best;
}

// ---------- Ansichten ----------
LH.VIEWS.break = {
  html: () => `
    <div class="eyebrow">Pause</div><h1 class="h1">Kurz abschalten.</h1>
    <p class="lede">Hier wird nicht gelernt. Pro ${LH.S.settings.learnMin} Minuten Lernen bekommst du ${LH.S.settings.breakMin} Minuten Spielzeit, oder du kaufst sie mit Münzen.</p>
    <div class="panel break-bar screws">
      <div><div class="eyebrow">Pausenzeit</div><div class="time" style="margin-top:8px">${mmss(LH.S.breakBank)}</div></div>
      <div style="flex:1;min-width:200px"><div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">Nächste ${LH.S.settings.breakMin} Minuten in</span><span class="mono">${mmss(Math.max(0, LH.learnSec() - LH.S.learnTick))}</span></div>
      <div style="margin-top:8px">${LH.meter(LH.S.learnTick / LH.learnSec() * 100, 25, { color: 'var(--ok)' })}</div></div>
      <button class="btn" data-g="buy" ${LH.S.coins >= LH.BREAK_PRICE ? '' : 'disabled'}>+${LH.S.settings.breakMin} Min · ${LH.BREAK_PRICE} Münzen</button>
    </div>
    <div class="games">${Object.entries(GAMES).map(([id, g]) => `
      <div class="panel game-card link" data-g="play" data-id="${id}" role="button" tabindex="0">
        <canvas class="art" data-preview="${id}" width="480" height="300"></canvas>
        <div class="info"><h3>${g.name}</h3><p>${g.desc}</p>
        <div class="row"><span class="mono muted" style="font-size:12px">${id === 'runner' ? `${Object.values(LH.S.runner.levels).filter(v => v >= 100).length} Levels geschafft` : `Rekord ${LH.S.scores[id] || 0}`}</span><button class="btn sm primary" data-g="play" data-id="${id}" ${LH.S.breakBank > 0 || id === 'runner' ? '' : 'disabled'}>${id === 'runner' ? 'Levels' : 'Spielen'}</button></div></div>
      </div>`).join('')}</div>`,
  mount() { runPreviews(); }
};
LH.VIEWS.game = {
  html: ({ id, level }) => `
    <div class="page-head"><div><button class="back" data-go="${id === 'runner' ? 'levels' : 'break'}">← ${id === 'runner' ? 'Levels' : 'Pause'}</button><h1 class="h1" style="margin-top:0">${id === 'runner' && LH.games2 ? esc(LH.games2.levelName(level)) : GAMES[id].name}</h1></div>
    <div class="row"><div class="readout"><small>Rekord</small><b id="g-best">${LH.S.scores[id] || 0}</b></div><div class="readout"><small>Zeit übrig</small><b id="g-time">${mmss(LH.S.breakBank)}</b></div></div></div>
    <div class="stage" id="stage"></div>`,
  mount(args) {
    const { id } = args, st = $('#stage');
    C.sig = LH.themeColor ? LH.themeColor() : C.sig;
    const make = { runner: (a, b) => LH.games2.runner(a, b, args), riff: (a, b) => LH.games2.riff(a, b), blocks: (a, b) => LH.games2.blocks(a, b), blitz: (a, b) => LH.games3.blitz(a, b), snake, g2048 }[id];
    active = make(st, id);
    startClock();
    if (LH.S.breakBank <= 0) { active.pause(true); outOfTime(); }
  }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-g]'); if (!b || b.disabled) return;
  e.stopPropagation();
  const g = b.dataset.g;
  if (g === 'buy') { buyTime(); if (LH.current().name === 'game') { clearOverlay(); active?.pause(false); $('#g-time').textContent = mmss(LH.S.breakBank); } else LH.go('break'); }
  if (g === 'play') { if (b.dataset.id === 'runner') return LH.go('levels'); if (LH.S.breakBank <= 0) return outOfTimeToast(); LH.S.stats.games++; LH.go('game', { id: b.dataset.id }); }
  if (g === 'restart') { clearOverlay(); active?.restart(); }
}, true);
const outOfTimeToast = () => LH.toast('0:00', 'Keine Pausenzeit', 'Lern 25 Minuten oder kauf 5 Minuten');

// ---------- Vorschauen ----------
function runPreviews() {
  cancelAnimationFrame(previewRaf);
  const cs = [...document.querySelectorAll('[data-preview]')];
  const t0 = performance.now();
  const loop = now => {
    if (LH.current().name !== 'break') return;
    const t = (now - t0) / 1000;
    for (const c of cs) {
      const x = c.getContext('2d'), W = c.width, H = c.height;
      x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
      if (c.dataset.preview === 'runner') {
        const gy = 220; x.strokeStyle = C.line2; x.lineWidth = 2; x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke();
        for (let i = 0; i < 12; i++) { const px = ((i * 60 - t * 160) % 720 + 720) % 720 - 60; x.fillStyle = C.line; x.fillRect(px, gy + 8, 24, 2); }
        for (let i = 0; i < 3; i++) { const sx = ((i * 260 + 300 - t * 160) % 780 + 780) % 780 - 60; spike(x, sx, gy, 26, C.ink2); }
        const ph = (t * 1.6) % 1, jy = Math.sin(Math.min(1, ph * 1.4) * Math.PI) * 70;
        x.save(); x.translate(130, gy - 14 - jy); x.rotate(Math.min(1, ph * 1.4) * Math.PI / 2); x.fillStyle = C.sig; x.fillRect(-14, -14, 28, 28); x.restore();
      } else if (c.dataset.preview === 'riff') {
        const lanes = 4, lw = W / 6, ox = (W - lanes * lw) / 2;
        for (let l = 0; l < lanes; l++) { x.fillStyle = '#151412'; x.fillRect(ox + l * lw + 4, 0, lw - 8, H); }
        x.fillStyle = C.line2; x.fillRect(ox, 240, lanes * lw, 3);
        for (let i = 0; i < 10; i++) { const l = (i * 7) % 4, y = ((t * 140 + i * 70) % 360) - 60; x.fillStyle = l % 2 ? C.ink2 : C.sig; x.fillRect(ox + l * lw + 10, y, lw - 20, 14); }
      } else if (c.dataset.preview === 'blocks') {
        const s = 22, cols = 10, ox = (W - cols * s) / 2;
        const shape = [[0, 12], [1, 12], [2, 12], [3, 12], [5, 12], [6, 12], [7, 12], [8, 12], [9, 12], [0, 11], [1, 11], [4, 11], [5, 11], [8, 11], [9, 11], [0, 10], [9, 10]];
        x.fillStyle = C.panel; x.fillRect(ox, 0, cols * s, H);
        shape.forEach(([cx, cy]) => { x.fillStyle = C.ink3; x.fillRect(ox + cx * s + 1, cy * s - 1, s - 2, s - 2); });
        const fy = (t * 60) % 240; [[4, 0], [4, 1], [3, 1], [5, 1]].forEach(([cx, cy]) => { x.fillStyle = C.sig; x.fillRect(ox + cx * s + 1, fy + cy * s, s - 2, s - 2); });
      } else if (c.dataset.preview === 'blitz') {
        x.font = '700 30px "JB Mono", monospace'; x.textAlign = 'center';
        ['7 × 8', '144 ÷ 12', '38 + 47', '91 − 29', '6 × 13'].forEach((q, i) => { const y = ((t * 50 + i * 75) % 375) - 30; x.fillStyle = i === 2 ? C.sig : C.ink3; x.globalAlpha = Math.max(0, 1 - Math.abs(y - 150) / 190); x.fillText(q, 150 + (i % 2) * 180, y); });
        x.globalAlpha = 1; x.textAlign = 'start';
      } else if (c.dataset.preview === 'snake') {
        const n = 14, s = 18;
        for (let i = 0; i < n; i++) {
          const k = t * 6 - i * .9, px = 240 + Math.cos(k * .25) * 150, py = 150 + Math.sin(k * .5) * 70;
          x.fillStyle = i === 0 ? C.sig : C.ink2; x.globalAlpha = 1 - i / (n + 4); x.fillRect(px - s / 2, py - s / 2, s - 2, s - 2);
        }
        x.globalAlpha = 1; const pulse = 1 + Math.sin(t * 6) * .15; x.fillStyle = C.peak; x.fillRect(380 - 8 * pulse, 70 - 8 * pulse, 16 * pulse, 16 * pulse);
      } else {
        const vals = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048], s = 58, gap = 8, ox = (W - (4 * s + 3 * gap)) / 2, oy = (H - (4 * s + 3 * gap)) / 2;
        for (let i = 0; i < 16; i++) {
          const gx = i % 4, gyy = Math.floor(i / 4), v = vals[(i * 7 + Math.floor(t * 1.5)) % 13] || 0;
          x.fillStyle = v ? tileColor(v).bg : C.panel; x.fillRect(ox + gx * (s + gap), oy + gyy * (s + gap), s, s);
          if (v) { x.fillStyle = tileColor(v).fg; x.font = `700 ${v > 512 ? 16 : 20}px "JB Mono", monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(v, ox + gx * (s + gap) + s / 2, oy + gyy * (s + gap) + s / 2 + 1); }
        }
      }
    }
    if (!LH.reduced()) previewRaf = requestAnimationFrame(loop);
  };
  previewRaf = requestAnimationFrame(loop);
}
function spike(x, sx, gy, h, col) { x.fillStyle = col; x.beginPath(); x.moveTo(sx, gy); x.lineTo(sx + h / 2, gy - h); x.lineTo(sx + h, gy); x.closePath(); x.fill(); }
function tileColor(v) {
  const t = { 2: ['#2a2824', C.ink2], 4: ['#36332e', C.ink], 8: ['#5a3b26', C.ink], 16: ['#7a4425', C.ink], 32: ['#a54d22', C.ink], 64: ['#d65a22', '#1c0d04'], 128: ['#ff6b2c', '#1c0d04'], 256: ['#ff8a55', '#1c0d04'], 512: ['#ffa64b', '#1c0d04'], 1024: ['#ffc24b', '#1c0d04'], 2048: ['#efe9dd', '#1c0d04'] }[v] || ['#8fd16a', '#0d1a06'];
  return { bg: t[0], fg: t[1] };
}

// ---------- Canvas-Hilfe ----------
function makeCanvas(st, W, H) {
  const c = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = W * dpr; c.height = H * dpr; c.style.aspectRatio = `${W}/${H}`;
  st.appendChild(c);
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  st.insertAdjacentHTML('beforeend', '<div class="stage-hud"><span id="g-score">0</span><span id="g-info"></span></div>');
  return { c, x };
}

// ---------- Snake ----------
function snake(st, id) {
  const COLS = 28, ROWS = 16, S = 30, W = COLS * S, H = ROWS * S;
  const { c, x } = makeCanvas(st, W, H);
  let g, raf = 0, acc = 0, last = 0;
  const api = { paused: false, over: false };
  const reset = () => { g = { body: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }], dir: { x: 1, y: 0 }, queue: [], food: null, score: 0, step: .12, started: false, over: false, t: 0, burst: [] }; place(); };
  const place = () => { do { g.food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; } while (g.body.some(b => b.x === g.food.x && b.y === g.food.y)); };
  reset();
  const DIRS = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
  const onKey = e => {
    if (e.target.matches('input,textarea')) return;
    if (e.key === ' ' && g.over) { e.preventDefault(); return api.restart(); }
    const d = DIRS[e.key]; if (!d) return;
    e.preventDefault();
    if (!g.started) { g.started = true; clearOverlay(); }
    const lastDir = g.queue[g.queue.length - 1] || g.dir;
    if (d[0] === -lastDir.x && d[1] === -lastDir.y) return;
    if (g.queue.length < 3) g.queue.push({ x: d[0], y: d[1] });
  };
  addEventListener('keydown', onKey);
  let touch = null;
  c.addEventListener('pointerdown', e => { touch = { x: e.clientX, y: e.clientY }; });
  c.addEventListener('pointerup', e => {
    if (!touch) return; const dx = e.clientX - touch.x, dy = e.clientY - touch.y; touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    onKey({ key: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'), preventDefault() {}, target: c });
  });
  overlay('<h3>Snake</h3><p>Pfeiltaste drücken zum Starten.</p>');
  function step() {
    if (g.queue.length) g.dir = g.queue.shift();
    const h = { x: g.body[0].x + g.dir.x, y: g.body[0].y + g.dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || g.body.some(b => b.x === h.x && b.y === h.y)) {
      g.over = true; api.over = true;
      const best = record(id, g.score); $('#g-best').textContent = LH.S.scores[id];
      setTimeout(() => overlay(`<h3>${g.score} Punkte</h3><p>${best ? 'Neuer Rekord.' : `Rekord: ${LH.S.scores[id]}`}</p><button class="btn primary" data-g="restart">Nochmal <span class="kbd">Leer</span></button>`), 400);
      return;
    }
    g.body.unshift(h);
    if (h.x === g.food.x && h.y === g.food.y) {
      g.score++; g.step = Math.max(.055, g.step * .97);
      for (let i = 0; i < 10; i++) g.burst.push({ x: h.x * S + S / 2, y: h.y * S + S / 2, vx: (Math.random() - .5) * 260, vy: (Math.random() - .5) * 260, l: 1 });
      place();
    } else g.body.pop();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; g.t += dt;
    if (!api.paused && g.started && !g.over) { acc += dt; while (acc >= g.step) { acc -= g.step; step(); if (g.over) break; } }
    for (const p of g.burst) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt * 2; }
    g.burst = g.burst.filter(p => p.l > 0);
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    x.fillStyle = '#161513';
    for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) if ((i + j) % 2) x.fillRect(i * S, j * S, S, S);
    const pu = 1 + Math.sin(g.t * 7) * .12;
    x.fillStyle = C.peak; x.fillRect(g.food.x * S + S / 2 - 8 * pu, g.food.y * S + S / 2 - 8 * pu, 16 * pu, 16 * pu);
    g.body.forEach((b, i) => { x.fillStyle = i === 0 ? C.sig : g.over ? C.ink3 : C.ink2; x.globalAlpha = i === 0 ? 1 : Math.max(.35, 1 - i / (g.body.length + 6)); x.fillRect(b.x * S + 2, b.y * S + 2, S - 4, S - 4); });
    x.globalAlpha = 1;
    for (const p of g.burst) { x.globalAlpha = p.l; x.fillStyle = C.peak; x.fillRect(p.x, p.y, 4, 4); }
    x.globalAlpha = 1;
    const sc = $('#g-score'); if (sc) sc.textContent = g.score;
  }
  raf = requestAnimationFrame(frame);
  return Object.assign(api, {
    pause(p) { api.paused = p; },
    restart() { reset(); api.over = false; g.started = true; clearOverlay(); },
    destroy() { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); }
  });
}

// ---------- 2048 ----------
function g2048(st, id) {
  st.style.background = 'transparent'; st.style.border = '0';
  st.innerHTML = '<div class="stage-hud" style="position:static;margin-bottom:6px"><span>Punkte <b id="g-score">0</b></span><span class="muted">Pfeiltasten · wischen</span></div><div class="g2048" id="board"></div>';
  const board = $('#board');
  const pos = (x, y) => `left:calc(10px + ${x} * ((100% - 50px) / 4 + 10px));top:calc(10px + ${y} * ((100% - 50px) / 4 + 10px))`;
  board.innerHTML = Array.from({ length: 16 }, (_, i) => `<div class="cell" style="${pos(i % 4, Math.floor(i / 4))}"></div>`).join('');
  let tiles, score, nid, over;
  const api = { paused: false, over: false };
  const reset = () => { tiles = []; score = 0; nid = 0; over = false; api.over = false; board.querySelectorAll('.tile').forEach(t => t.remove()); add(); add(); render(); };
  function add() {
    const free = []; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (!tiles.some(t => t.x === x && t.y === y && !t.gone)) free.push({ x, y });
    if (!free.length) return;
    const f = free[Math.floor(Math.random() * free.length)];
    tiles.push({ id: ++nid, x: f.x, y: f.y, v: Math.random() < .9 ? 2 : 4, isNew: true });
  }
  function render() {
    for (const t of tiles) {
      let el = board.querySelector(`[data-t="${t.id}"]`);
      if (!el) { el = document.createElement('div'); el.className = 'tile'; el.dataset.t = t.id; el.innerHTML = '<span></span>'; board.appendChild(el); }
      const col = tileColor(t.v);
      el.style.cssText = `${pos(t.x, t.y)};background:${col.bg};color:${col.fg};transition:left .12s,top .12s;${t.v >= 1024 ? 'font-size:22px' : t.v >= 128 ? 'font-size:26px' : ''}`;
      el.classList.toggle('new', !!t.isNew); el.classList.toggle('merged', !!t.merged);
      el.firstChild.textContent = t.v;
      if (t.gone) { el.style.zIndex = 1; setTimeout(() => el.remove(), 130); }
    }
    tiles = tiles.filter(t => !t.gone);
    tiles.forEach(t => { t.isNew = false; t.merged = false; });
    $('#g-score').textContent = score;
  }
  function move(dx, dy) {
    if (api.paused || over) return;
    let moved = false;
    const order = [0, 1, 2, 3];
    const xs = dx > 0 ? [...order].reverse() : order, ys = dy > 0 ? [...order].reverse() : order;
    const at = (x, y) => tiles.find(t => t.x === x && t.y === y && !t.gone);
    const mergedNow = new Set();
    for (const y of ys) for (const x of xs) {
      const t = at(x, y); if (!t) continue;
      let nx = x, ny = y;
      while (true) {
        const tx = nx + dx, ty = ny + dy;
        if (tx < 0 || ty < 0 || tx > 3 || ty > 3) break;
        const o = at(tx, ty);
        if (!o) { nx = tx; ny = ty; continue; }
        if (o.v === t.v && !mergedNow.has(o.id) && !mergedNow.has(t.id)) {
          t.gone = true; t.x = tx; t.y = ty; o.v *= 2; o.merged = true; mergedNow.add(o.id); score += o.v; moved = true;
          if (o.v === 2048) LH.toast('2048', 'Geschafft!', 'Weiter geht’s');
        }
        break;
      }
      if (!t.gone && (nx !== x || ny !== y)) { t.x = nx; t.y = ny; moved = true; }
    }
    if (!moved) return;
    render(); add(); setTimeout(render, 10);
    if (!canMove()) {
      over = true; api.over = true;
      const best = record(id, score); $('#g-best').textContent = LH.S.scores[id];
      setTimeout(() => { board.insertAdjacentHTML('beforeend', `<div class="overlay" style="border-radius:14px;z-index:5"><div><h3>${score} Punkte</h3><p>${best ? 'Neuer Rekord.' : `Rekord: ${LH.S.scores[id]}`}</p><button class="btn primary" data-g="restart">Nochmal</button></div></div>`); }, 300);
    }
  }
  function canMove() {
    if (tiles.length < 16) return true;
    return tiles.some(t => tiles.some(o => o.v === t.v && Math.abs(o.x - t.x) + Math.abs(o.y - t.y) === 1));
  }
  const KEYS = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1] };
  const onKey = e => { if (e.target.matches('input,textarea')) return; const k = KEYS[e.key]; if (k) { e.preventDefault(); move(...k); } };
  addEventListener('keydown', onKey);
  let tp = null;
  board.addEventListener('pointerdown', e => { tp = { x: e.clientX, y: e.clientY }; });
  board.addEventListener('pointerup', e => { if (!tp) return; const dx = e.clientX - tp.x, dy = e.clientY - tp.y; tp = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; Math.abs(dx) > Math.abs(dy) ? move(Math.sign(dx), 0) : move(0, Math.sign(dy)); });
  reset();
  return Object.assign(api, {
    pause(p) { api.paused = p; },
    restart() { board.querySelector('.overlay')?.remove(); reset(); },
    destroy() { removeEventListener('keydown', onKey); }
  });
}

LH.games = { stop, util: { makeCanvas, overlay, clearOverlay, record, spike, C, tileColor, GAMES, startClock, setActive: a => { active = a; } } };
})();

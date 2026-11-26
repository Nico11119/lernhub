// ===================== LernHub – Pausenspiel „Blitzrechnen“ =====================
// 60 Sekunden Kopfrechnen. Richtig getippt = sofort weiter (kein Enter nötig), falsch + Enter = 2 Sekunden Abzug.
(() => {
'use strict';
const LH = window.LH, U = LH.games.util, { $ } = LH;
U.GAMES.blitz = { name: 'Blitzrechnen', desc: '60 Sekunden Kopfrechnen. Je länger die Serie, desto mehr Punkte – und desto schwerer.', unit: 'Punkte' };

const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function task(level) {
  const op = ['+', '−', '×', '÷'][R(0, Math.min(3, 1 + Math.floor(level / 3)))], hi = 10 + level * 6;
  if (op === '+') { const a = R(2, hi), b = R(2, hi); return { q: `${a} + ${b}`, a: a + b }; }
  if (op === '−') { const a = R(5, hi + 10), b = R(1, a); return { q: `${a} − ${b}`, a: a - b }; }
  if (op === '×') { const a = R(2, 6 + level), b = R(2, 9 + Math.floor(level / 2)); return { q: `${a} × ${b}`, a: a * b }; }
  const b = R(2, 9 + Math.floor(level / 3)), a = b * R(2, 9 + Math.floor(level / 2)); return { q: `${a} ÷ ${b}`, a: a / b };
}

function blitz(st, id) {
  st.innerHTML = `<div class="bz"><div class="bz-hud"><span>Zeit <b id="bz-t">60</b></span><span>Serie <b id="bz-c">0</b></span><span>Punkte <b id="bz-s">0</b></span></div>
    <div class="bz-q" id="bz-q">Bereit?</div><input class="bz-in" id="bz-in" inputmode="numeric" autocomplete="off" aria-label="Ergebnis" disabled>
    <div class="bz-bar"><i id="bz-bar"></i></div></div>`;
  const api = { paused: false, over: false };
  let g, timer = 0;
  const inp = $('#bz-in');
  function next() { g.cur = task(Math.floor(g.streak / 4) + Math.floor(g.n / 8)); $('#bz-q').textContent = g.cur.q; inp.value = ''; inp.classList.remove('bad'); }
  function hud() { $('#bz-t').textContent = Math.ceil(g.left); $('#bz-c').textContent = g.streak; $('#bz-s').textContent = g.score; $('#bz-bar').style.width = Math.max(0, g.left / 60 * 100) + '%'; }
  function end() {
    api.over = true; clearInterval(timer); inp.disabled = true;
    const best = U.record(id, g.score); const b = $('#g-best'); if (b) b.textContent = LH.S.scores[id];
    LH.addCoins(Math.floor(g.score / 10));
    U.overlay(`<h3>${g.score} Punkte</h3><p>${g.n} Aufgaben richtig${g.maxStreak >= 5 ? `, beste Serie ${g.maxStreak}` : ''}. ${best ? 'Neuer Rekord!' : `Rekord: ${LH.S.scores[id]}`}</p><button class="btn primary" data-g="restart">Nochmal</button>`);
  }
  function start() {
    g = { left: 60, score: 0, streak: 0, maxStreak: 0, n: 0, cur: null, last: performance.now() };
    api.over = false; U.clearOverlay(); inp.disabled = false; inp.focus(); next(); hud();
    clearInterval(timer);
    timer = setInterval(() => {
      const now = performance.now(), dt = (now - g.last) / 1000; g.last = now;
      if (api.paused) return;
      g.left -= dt; hud(); if (g.left <= 0) end();
    }, 100);
  }
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/[^\d-]/g, '');
    if (api.over || api.paused || +inp.value !== g.cur.a || inp.value === '') return;
    g.n++; g.streak++; g.maxStreak = Math.max(g.maxStreak, g.streak); g.score += 1 + Math.floor(g.streak / 5);
    if (g.streak % 10 === 0) { g.left = Math.min(60, g.left + 3); LH.toast(`x${g.streak}`, 'Serie!', '+3 Sekunden'); }
    next(); hud();
  });
  inp.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || api.over || !inp.value) return;
    e.preventDefault(); g.streak = 0; g.left -= 2; inp.classList.add('bad'); $('#bz-q').textContent = `${g.cur.q} = ${g.cur.a}`; setTimeout(() => !api.over && next(), 700); hud();
  });
  U.overlay(`<h3>Blitzrechnen</h3><p>Tipp das Ergebnis – richtig geht sofort weiter. Falsch + Enter kostet 2 Sekunden. Alle 10 in Serie: +3 Sekunden.</p><button class="btn primary" data-g="restart">Start</button>`);
  g = { left: 60, score: 0, streak: 0, n: 0 };
  Object.assign(api, {
    pause(p) { api.paused = p; if (!p) { g.last = performance.now(); inp.focus(); } },
    restart: start,
    destroy() { clearInterval(timer); }
  });
  return api;
}
LH.games3 = { blitz };
})();

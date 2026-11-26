// ===================== LernHub – Kleinigkeiten zum Entdecken =====================
// Bewusst nirgends in der Oberfläche erklärt. Gefundenes landet in S.eggs und schaltet ein geheimes Abzeichen frei.
(function () {
'use strict';
const LH = window.LH;
const found = (id, code, title, sub) => {
  const s = LH.S; s.eggs ||= {};
  const first = !s.eggs[id];
  s.eggs[id] = 1;
  LH.toast(code, title, sub);
  if (first) { LH.checkBadges(); LH.save(); }
  return first;
};
const typing = e => e.target.closest?.('input, textarea, select, [contenteditable="true"]');
const spin = (el, cls, ms) => { if (LH.reduced() || !el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };

// Tastenfolgen (nur außerhalb von Eingabefeldern)
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let keys = [], word = '';
document.addEventListener('keydown', e => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys = [...keys, k].slice(-KONAMI.length);
  if (keys.join() === KONAMI.join()) {
    keys = [];
    if (found('konami', '↑↑↓↓', '30 Leben freigeschaltet', 'Na gut, stattdessen 30 Münzen.')) LH.addCoins(30);
    LH.confetti(220);
  }
  if (k.length !== 1) return;
  word = (word + k).slice(-12);
  if (word.endsWith('barrelroll') || word.endsWith('fassrolle')) { word = ''; spin(document.querySelector('.shell') || document.body, 'egg-roll', 1300); found('roll', '360°', 'Wuuusch', 'Alles wieder richtig herum.'); }
  if (word.endsWith('jarvis')) { word = ''; LH.toast('J.', 'Sie haben gerufen?', 'Strg + Umschalt + Leertaste reicht übrigens auch.'); }
  if (word.endsWith('42')) { word = ''; LH.toast('42', 'Die Antwort auf alles', 'Die Frage dazu steht leider auf keinem Lernzettel.'); }
});

// Logo mehrmals schnell anklicken
let logoN = 0, logoT = 0;
document.addEventListener('click', e => {
  const logo = e.target.closest('.brand');
  if (logo) {
    const now = Date.now(); logoN = now - logoT < 600 ? logoN + 1 : 1; logoT = now;
    if (logoN === 7) { logoN = 0; spin(logo, 'egg-rainbow', 6000); found('logo', 'LOGO', 'Du hast mich gefunden', 'Mehr ist hier nicht … oder doch?'); }
  }
  const coins = e.target.closest('#hud-coins, .readout:has(#hud-coins)');
  if (coins) {
    const now = Date.now(); coins._n = now - (coins._t || 0) < 600 ? (coins._n || 0) + 1 : 1; coins._t = now;
    if (coins._n === 10) { coins._n = 0; if (found('miser', '$$$', 'Zählen macht nicht reicher', 'Aber eine Münze gibt es fürs Nachzählen.')) LH.addCoins(1); }
  }
});

// Viele richtige Antworten am Stück
let combo = 0;
LH.on('answer', ({ ok }) => {
  combo = ok ? combo + 1 : 0;
  if (combo === 10) LH.toast('x10', 'Zehn am Stück!', 'Nicht aufhören.');
  if (combo === 25) { found('combo', 'x25', 'Im Flow', '25 richtig hintereinander.'); LH.confetti(140); }
  if (combo === 50) LH.toast('x50', 'Okay, jetzt wird es unheimlich', '50 ohne Fehler.');
});

// Uhrzeit und Datum
const hm = () => { const d = new Date(); return d.getHours() * 100 + d.getMinutes(); };
LH.on('minute', () => { if (hm() < 600 && hm() >= 300) found('early', '5H', 'Der frühe Vogel', 'Lernen, bevor die Sonne aufgeht.'); });
function clock() {
  if (hm() === 1337 && LH.S.eggs?.leetDay !== LH.dkey()) { LH.S.eggs ||= {}; LH.S.eggs.leetDay = LH.dkey(); found('leet', '1337', '13:37', 'Elite-Uhrzeit erwischt.'); }
}
setInterval(clock, 20000);

function season() {
  const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  if (m === 12 && day >= 24 && day <= 26) snow();
  else if (m === 1 && day === 1) setTimeout(() => { LH.confetti(260); LH.toast('NEU', 'Frohes neues Jahr!', 'Neues Jahr, neue Lernzettel.'); }, 1500);
  else if (m === 3 && day === 14) setTimeout(() => LH.toast('π', 'Happy Pi Day', '3,14159 26535 89793 …'), 2500);
  else if (d.getDay() === 5 && day === 13) setTimeout(() => LH.toast('13', 'Freitag, der 13.', 'Heute lieber zweimal wiederholen.'), 2500);
  else if (m === 10 && day === 31) document.documentElement.classList.add('egg-spooky');
}
function snow() {
  if (LH.reduced()) return;
  const c = document.createElement('canvas'); c.className = 'egg-snow'; document.body.appendChild(c);
  const x = c.getContext('2d'), flakes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + 1, v: Math.random() * .6 + .3 }));
  const tick = () => {
    c.width = innerWidth; c.height = innerHeight; x.fillStyle = 'rgba(255,255,255,.75)';
    for (const f of flakes) { f.y += f.v / innerHeight * 2; f.x += Math.sin(f.y * 20) / innerWidth * .6; if (f.y > 1) { f.y = 0; f.x = Math.random(); } x.beginPath(); x.arc(f.x * c.width, f.y * c.height, f.r, 0, 7); x.fill(); }
    if (!document.hidden) requestAnimationFrame(tick); else setTimeout(() => requestAnimationFrame(tick), 1000);
  };
  tick();
}

// Handy schütteln
const TIPS = ['Erklär es laut, als wärst du der Lehrer.', 'Fünf Minuten sind besser als keine.', 'Erst die Karten, die du falsch hattest.', 'Wasser trinken. Ernsthaft.', 'Handy weg, Timer an.', 'Schwierigstes Thema zuerst, solang der Kopf frisch ist.'];
let lastShake = 0;
addEventListener('devicemotion', e => {
  const a = e.accelerationIncludingGravity; if (!a) return;
  if (Math.hypot(a.x || 0, a.y || 0, a.z || 0) < 28 || Date.now() - lastShake < 4000) return;
  lastShake = Date.now();
  found('shake', 'WACK', 'Wachgerüttelt', TIPS[Math.floor(Math.random() * TIPS.length)]);
});

LH.on('booted', () => { season(); clock(); });
})();

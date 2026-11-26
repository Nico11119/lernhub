// ===================== LernHub – Boss-Kampf =====================
// Der nächste Test des Fachs ist der Endgegner. Richtig = Schaden (schnell = kritisch), falsch = ein Herz weg.
// Jede Antwort zählt wie im Quiz für den Lernstand (LH.grade).
(() => {
'use strict';
const LH = window.LH, { $, esc } = LH;
const S = () => LH.S;
const HEARTS = 3, DMG = 10, CRIT_MS = 4000;
const TAUNTS = ['Ist das alles?', 'Ich bin der Stoff, den du nicht gelernt hast!', 'Hehehe …', 'Das kommt sicher zur Schularbeit!', 'Nicht schlecht … für einen Anfänger.'];
const OUCH = ['Argh!', 'Das tat weh!', 'Woher weißt du das?!', 'Unmöglich!', 'Nein!'];
let B = null;

function start(sid) {
  const s = LH.subj(sid), pool = LH.cardsOf(sid);
  if (pool.length < 4) return LH.toast('BOSS', 'Zu wenig Karten', 'Mindestens 4 Karten im Fach');
  const test = LH.upcoming().find(t => t.subjectId === sid);
  const cards = LH.shuffle(pool.slice()), all = pool.map(c => c.a), hp = Math.min(cards.length, 15) * DMG;
  B = { sid, name: test ? test.title : `Der ${s.name}-Golem`, sub: test ? `${s.name} · ${LH.fmtDay(test.date)}` : s.name, color: s.color,
    cards, all, i: 0, hp, max: hp, hearts: HEARTS, t0: 0, done: null, answered: false, crits: 0, hits: 0, say: 'Wer wagt es, mich herauszufordern?' };
  LH.go('boss', { sid });
}
function q() {
  const c = B.cards[B.i % B.cards.length];
  if (!c._o) c._o = LH.shuffle([c.a, ...LH.quizWrong(c, LH.shuffle(B.all.slice()))].slice(0, 4));
  return c;
}
const monster = (mood) => `<svg class="boss-svg ${mood}" viewBox="0 0 200 180" aria-hidden="true">
  <defs><radialGradient id="bg1" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <path class="b-body" d="M30 150 Q10 60 60 35 Q100 5 140 35 Q190 60 170 150 Q150 165 140 150 Q125 168 110 150 Q100 165 90 150 Q75 168 60 150 Q48 165 30 150Z" fill="var(--boss)"/>
  <path d="M30 150 Q10 60 60 35 Q100 5 140 35 Q190 60 170 150Z" fill="url(#bg1)"/>
  <path d="M55 40 L45 12 L72 32Z M145 40 L155 12 L128 32Z" fill="var(--boss)"/>
  <g class="b-eyes"><ellipse cx="75" cy="80" rx="15" ry="${mood === 'hurt' ? 3 : 17}" fill="#fff"/><ellipse cx="125" cy="80" rx="15" ry="${mood === 'hurt' ? 3 : 17}" fill="#fff"/>
  ${mood === 'hurt' ? '' : '<circle class="b-pupil" cx="78" cy="84" r="7" fill="#111"/><circle class="b-pupil" cx="128" cy="84" r="7" fill="#111"/>'}
  <path d="M58 ${mood === 'angry' ? 58 : 62} L92 ${mood === 'angry' ? 70 : 64} M142 ${mood === 'angry' ? 58 : 62} L108 ${mood === 'angry' ? 70 : 64}" stroke="#111" stroke-width="6" stroke-linecap="round"/></g>
  ${mood === 'dead' ? '<path d="M65 75l20 20M85 75l-20 20M115 75l20 20M135 75l-20 20" stroke="#111" stroke-width="6" stroke-linecap="round"/>' : ''}
  <path d="${mood === 'happy' ? 'M70 118 Q100 145 130 118' : mood === 'dead' ? 'M75 125 Q100 112 125 125' : 'M70 120 Q100 112 130 120'}" stroke="#111" stroke-width="6" fill="${mood === 'happy' ? '#111' : 'none'}" stroke-linecap="round"/>
  ${mood === 'happy' ? '<path d="M82 122 l6 9 l6 -8 M106 122 l6 9 l6 -8" fill="#fff"/>' : ''}
</svg>`;

LH.VIEWS.boss = {
  html({ sid }) {
    if (!B || B.sid !== sid) { start(sid); if (!B) return ''; }
    const pct = Math.max(0, B.hp / B.max * 100), head = `<button class="back" data-action="open-subject" data-sid="${sid}">← ${esc(LH.subj(sid)?.name || '')}</button>`;
    const arena = mood => `<div class="boss-arena" style="--boss:${B.color}"><div class="boss-name"><b>${esc(B.name)}</b><small>${esc(B.sub)}</small></div>
      <div class="boss-hp"><i style="width:${pct}%"></i><span class="mono">${Math.max(0, B.hp)} / ${B.max}</span></div>
      <div class="boss-stage" id="boss-stage">${monster(mood)}<div class="boss-say" id="boss-say">${esc(B.say)}</div></div>
      <div class="boss-hearts" aria-label="${B.hearts} Herzen">${Array.from({ length: HEARTS }, (_, k) => `<span class="${k < B.hearts ? 'on' : ''}">♥</span>`).join('')}</div></div>`;
    if (B.done) {
      const won = B.done === 'won';
      return `${head}${arena(won ? 'dead' : 'happy')}<div class="panel result screws" style="margin-top:16px"><div class="eyebrow">${won ? 'Boss besiegt' : 'Niederlage'}</div>
        <div class="big" style="margin-top:10px">${won ? '🏆' : '💀'}</div><p class="lede" style="margin:8px auto 0">${won ? `${B.hits} Treffer, davon ${B.crits} kritisch. +25 Münzen.` : `Der Boss hatte noch ${B.hp} HP. Die falschen Karten liegen jetzt im Fehlerheft.`}</p>
        <div class="row" style="justify-content:center;margin-top:16px"><button class="btn primary" data-boss="again" data-sid="${sid}">${won ? 'Nochmal kämpfen' : 'Revanche'}</button><button class="btn ghost" data-action="open-subject" data-sid="${sid}">Zum Fach</button></div></div>`;
    }
    if (!B.t0) return `${head}${arena('angry')}<div style="text-align:center;margin-top:16px"><p class="muted">Richtige Antwort = ${DMG} Schaden, unter ${CRIT_MS / 1000} Sekunden doppelt. Drei Fehler und du bist raus.</p><button class="btn primary lg" data-boss="fight" style="margin-top:10px">Kampf beginnen</button></div>`;
    const c = q();
    return `${head}${arena('angry')}<div class="session" style="margin-top:14px"><div class="panel quiz-q"><div class="q">${esc(c.q)}</div></div>
      <div class="opts">${c._o.map((o, k) => `<button class="opt" data-boss="pick" data-k="${k}"><span class="kbd">${k + 1}</span>${esc(o)}</button>`).join('')}</div></div>`;
  },
  mount() { if (B && !B.done && B.t0) B.qt = performance.now(); }
};
function pop(text, cls) {
  const st = $('#boss-stage'); if (!st) return;
  const p = document.createElement('div'); p.className = 'boss-pop ' + cls; p.textContent = text; p.style.left = (35 + Math.random() * 30) + '%';
  st.appendChild(p); setTimeout(() => p.remove(), 1000);
}
function pick(k, btn) {
  if (B.answered || B.done) return; B.answered = true;
  const c = q(), ok = c._o[k] === c.a, fast = performance.now() - B.qt < CRIT_MS;
  document.querySelectorAll('.opt').forEach(b => { const o = c._o[+b.dataset.k]; b.classList.add(o === c.a ? 'right' : +b.dataset.k === k ? 'wrong' : 'dim'); });
  LH.grade(c, ok, 'quiz', btn);
  const stage = $('#boss-stage'), say = $('#boss-say');
  if (ok) {
    const dmg = fast ? DMG * 2 : DMG; B.hp -= dmg; B.hits++; if (fast) B.crits++;
    pop(fast ? `KRITISCH −${dmg}` : `−${dmg}`, fast ? 'crit' : 'hit');
    stage?.classList.remove('shake'); void stage?.offsetWidth; stage?.classList.add('shake');
    B.say = OUCH[Math.floor(Math.random() * OUCH.length)];
    const pct = Math.max(0, B.hp / B.max * 100), bar = document.querySelector('.boss-hp i'); if (bar) bar.style.width = pct + '%';
    const n = document.querySelector('.boss-hp span'); if (n) n.textContent = `${Math.max(0, B.hp)} / ${B.max}`;
  } else {
    B.hearts--; B.say = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
    document.querySelector('.boss-arena')?.classList.add('hurt'); setTimeout(() => document.querySelector('.boss-arena')?.classList.remove('hurt'), 500);
    const h = document.querySelectorAll('.boss-hearts span.on'); h[h.length - 1]?.classList.remove('on');
  }
  if (say) say.textContent = B.say;
  setTimeout(() => {
    B.i++; B.answered = false;
    if (B.hp <= 0) { B.done = 'won'; B.say = 'Neiiin … ich komme wieder … zur Schularbeit …'; LH.addCoins(25); LH.addXP(40, btn, true); LH.confetti(220); S().stats.bossWins = (S().stats.bossWins || 0) + 1; LH.checkBadges(); }
    else if (B.hearts <= 0) { B.done = 'lost'; B.say = 'HAHAHA! Komm wieder, wenn du gelernt hast!'; }
    LH.save(); LH.rerender();
  }, ok ? 650 : 1300);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-boss]'); if (!b) return;
  const a = b.dataset.boss;
  if (a === 'start' || a === 'again') { B = null; start(b.dataset.sid); }
  if (a === 'fight') { B.t0 = Date.now(); B.say = 'Dann zeig, was du kannst!'; LH.rerender(); }
  if (a === 'pick') pick(+b.dataset.k, b);
});
document.addEventListener('keydown', e => {
  if (LH.current().name !== 'boss' || !B?.t0 || B.done || $('.modal-bg')) return;
  if (/^[1-4]$/.test(e.key) && q()._o[+e.key - 1]) pick(+e.key - 1, document.querySelectorAll('.opt')[+e.key - 1]);
});
LH.boss = { start };
})();

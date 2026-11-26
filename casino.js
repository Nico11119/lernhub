// ===================== LernHub – Spielhalle (nur mit erlernten Münzen, kein echtes Geld) =====================
// Spielautomat, Rubbellos, Doppelt oder nichts, Lern-Wette. Höchstens 25 Spiele pro Tag.
(() => {
'use strict';
const LH = window.LH, { $, esc, dkey } = LH;
const S = () => LH.S;
const DAILY = 25;
const C = () => { const st = S(); if (st.casino?.day !== dkey()) st.casino = { bet: st.casino?.bet, day: dkey(), plays: 0 }; return st.casino; };
const left = () => DAILY - C().plays;
function pay(cost) {
  if (left() <= 0) { LH.toast('🎰', 'Spielhalle hat zu', 'Morgen geht es weiter – jetzt wird gelernt!'); return false; }
  if (S().coins < cost) { LH.toast('🪙', 'Zu wenig Münzen', `Du brauchst ${cost}. Münzen gibt es fürs Lernen.`); return false; }
  LH.addCoins(-cost); C().plays++; S().stats.casino = (S().stats.casino || 0) + 1; LH.save(); return true;
}
function win(n, el, big) {
  if (n <= 0) return;
  LH.addCoins(n); C().won = (C().won || 0) + n; LH.save();
  if (el) LH.xpPop?.(`+${n} 🪙`, el, true);
  if (big) LH.confetti(big === 'jackpot' ? 320 : 140);
}
const counter = () => { const el = $('#cas-left'); if (el) el.textContent = Math.max(0, left()); const c = $('#cas-coins'); if (c) c.textContent = S().coins; };

// ---------- Spielautomat (5 Münzen) ----------
const SYM = [['📚', 30, 15], ['🧠', 25, 20], ['⭐', 20, 30], ['🍀', 13, 50], ['💎', 8, 100], ['7️⃣', 4, 300]];
const PAIR = 6, SLOT_COST = 5;
const roll = () => { let r = Math.random() * 100; for (const s of SYM) { if (r < s[1]) return s[0]; r -= s[1]; } return SYM[0][0]; };
let spinning = false;
function spin(btn) {
  if (spinning || !pay(SLOT_COST)) return; spinning = true; counter();
  const res = [roll(), roll(), roll()], reels = [...document.querySelectorAll('.reel')];
  $('#slot-msg').textContent = '';
  document.querySelector('.slot')?.classList.remove('won', 'jackpot');
  reels.forEach((r, i) => {
    r.classList.add('spin');
    const iv = setInterval(() => { r.textContent = SYM[Math.floor(Math.random() * SYM.length)][0]; }, 70);
    setTimeout(() => { clearInterval(iv); r.textContent = res[i]; r.classList.remove('spin'); r.classList.add('stop'); setTimeout(() => r.classList.remove('stop'), 300); if (i === 2) done(); }, LH.reduced() ? 150 + i * 50 : 800 + i * 450);
  });
  function done() {
    spinning = false;
    const [a, b, c] = res, msg = $('#slot-msg'), slot = document.querySelector('.slot');
    if (a === b && b === c) {
      const n = SYM.find(s => s[0] === a)[2], jp = a === '7️⃣';
      win(n, btn, jp ? 'jackpot' : 'big'); slot?.classList.add(jp ? 'jackpot' : 'won');
      msg.innerHTML = jp ? `<b>JACKPOT!!! +${n} 🪙</b>` : `<b>Drei gleiche! +${n} 🪙</b>`;
      if (jp) { S().stats.jackpot = (S().stats.jackpot || 0) + 1; (S().eggs ||= {}).jackpot = 1; LH.checkBadges(); }
    } else if (a === b || b === c || a === c) { win(PAIR, btn); slot?.classList.add('won'); msg.innerHTML = `Zwei gleiche: +${PAIR} 🪙`; }
    else msg.textContent = 'Leider nichts. Nochmal?';
    counter(); LH.save();
  }
}

// ---------- Rubbellos (10 Münzen) ----------
const SCRATCH = [['💎', 3, 50], ['⭐', 8, 25], ['🍀', 15, 15], ['📚', 20, 10]]; // [Symbol, Chance %, Gewinn]
function newTicket() {
  if (!pay(10)) return; counter();
  let r = Math.random() * 100, prize = null;
  for (const s of SCRATCH) { if (r < s[1]) { prize = s; break; } r -= s[1]; }
  const pool = ['💎', '⭐', '🍀', '📚', '🧠', '🎲'];
  let cells;
  if (prize) cells = LH.shuffle([prize[0], prize[0], prize[0], ...LH.shuffle(pool.filter(p => p !== prize[0])).slice(0, 3)]);
  else { // kein Gewinn: jedes Symbol höchstens zweimal
    const bag = LH.shuffle(pool.flatMap(p => [p, p])); cells = bag.slice(0, 6);
  }
  const box = $('#ticket');
  box.innerHTML = `<div class="tk-grid">${cells.map(c => `<span>${c}</span>`).join('')}</div><canvas class="tk-cover" width="360" height="240"></canvas>`;
  box.classList.remove('done');
  const cv = box.querySelector('canvas'), x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 360, 240); g.addColorStop(0, '#b8b8c0'); g.addColorStop(.5, '#e6e6ee'); g.addColorStop(1, '#9a9aa4');
  x.fillStyle = g; x.fillRect(0, 0, 360, 240);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.font = '700 22px Bricolage, system-ui'; x.textAlign = 'center'; x.fillText('HIER RUBBELN', 180, 112); x.font = '500 14px system-ui'; x.fillText('3 gleiche gewinnen', 180, 140);
  x.globalCompositeOperation = 'destination-out';
  let down = false, finished = false;
  const at = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * 360, (e.clientY - b.top) / b.height * 240]; };
  const scratch = e => { if (!down || finished) return; const [px, py] = at(e); x.beginPath(); x.arc(px, py, 22, 0, Math.PI * 2); x.fill(); check(); };
  let checks = 0;
  const check = () => {
    if (++checks % 6) return;
    const d = x.getImageData(0, 0, 360, 240).data; let clear = 0;
    for (let i = 3; i < d.length; i += 32) if (d[i] === 0) clear++;
    if (clear / (d.length / 32) > .55) reveal();
  };
  const reveal = () => {
    if (finished) return; finished = true; cv.style.opacity = 0; box.classList.add('done');
    const msg = $('#tk-msg');
    if (prize) { win(prize[2], box, prize[0] === '💎' ? 'big' : null); msg.innerHTML = `<b>Dreimal ${prize[0]}: +${prize[2]} 🪙</b>`; }
    else msg.textContent = 'Kein Gewinn. Morgen ist auch ein Tag.';
    counter();
  };
  cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); scratch(e); });
  cv.addEventListener('pointermove', scratch);
  cv.addEventListener('pointerup', () => { down = false; });
  $('#tk-msg').textContent = 'Rubbel mit Maus oder Finger.';
  $('#tk-all').hidden = false; $('#tk-all').onclick = reveal;
}

// ---------- Doppelt oder nichts ----------
let pot = 0;
function flip(side, btn) {
  const coin = $('#coin'); if (!coin || coin.classList.contains('flipping')) return;
  if (!pot) {
    const stake = Math.max(1, Math.min(100, Math.floor(+$('#dn-stake').value || 0)));
    if (!pay(stake)) return; pot = stake;
  }
  counter();
  const res = Math.random() < .5 ? 'kopf' : 'zahl', ok = res === side;
  coin.className = 'coin flipping ' + res;
  setTimeout(() => {
    coin.className = 'coin ' + res;
    const msg = $('#dn-msg'), act = $('#dn-act');
    if (ok) {
      pot *= 2;
      msg.innerHTML = `<b>${res === 'kopf' ? 'Kopf' : 'Zahl'}! Im Topf: ${pot} 🪙</b>`;
      act.innerHTML = `<button class="btn primary" data-cas="take">${pot} 🪙 mitnehmen</button><span class="muted">oder nochmal verdoppeln:</span>`;
      if (pot >= 800) { take(btn); msg.innerHTML = '<b>Maximum erreicht – automatisch ausgezahlt!</b>'; }
    } else { msg.textContent = `${res === 'kopf' ? 'Kopf' : 'Zahl'} – leider weg.`; pot = 0; act.innerHTML = ''; }
    $('#dn-stake').disabled = !!pot;
  }, LH.reduced() ? 100 : 1300);
}
function take(btn) { if (!pot) return; win(pot, btn, pot >= 100 ? 'big' : null); pot = 0; $('#dn-act').innerHTML = ''; $('#dn-stake').disabled = false; counter(); }

// ---------- Lern-Wette ----------
function bet() {
  const stake = Math.max(5, Math.min(50, Math.floor(+$('#bet-stake').value || 0)));
  if (C().bet) return LH.toast('WETTE', 'Läuft schon', 'Erst die nächste Lernrunde spielen');
  if (!pay(stake)) return;
  C().bet = { stake }; LH.save(); LH.rerender();
  LH.toast('WETTE', `${stake} 🪙 gesetzt`, 'Schaff in deiner nächsten Runde mindestens 80 %!');
}
LH.on('session', ({ acc, n }) => {
  const c = S().casino; if (!c?.bet || n < 5) return;
  const { stake } = c.bet; delete c.bet;
  if (acc >= 80) { win(stake * 2, null, 'big'); LH.toast('WETTE', `Gewonnen! +${stake * 2} 🪙`, `${acc} % geschafft`); }
  else LH.toast('WETTE', 'Wette verloren', `${acc} % – knapp daneben ist auch daneben`);
  LH.save();
});

// ---------- Ansicht ----------
LH.VIEWS.casino = {
  html() {
    const c = C();
    return `<button class="back" data-go="break">← Pause</button>
      <div class="eyebrow" style="margin-top:6px">Spielhalle</div><h1 class="h1">Spielhalle 🎰</h1>
      <p class="lede">Nur mit Münzen, die du dir erlernt hast – kein echtes Geld. Du hast <b id="cas-coins">${S().coins}</b> 🪙 und noch <b id="cas-left">${Math.max(0, left())}</b> Spiele für heute.</p>
      <div class="grid-2 cas-grid" style="margin-top:20px">
        <div class="panel pad"><b>Spielautomat</b><small class="muted cas-sub">5 🪙 pro Dreh · zwei gleiche ${PAIR} · drei gleiche bis 300</small>
          <div class="slot"><span class="reel">📚</span><span class="reel">🍀</span><span class="reel">7️⃣</span></div>
          <div class="cas-msg" id="slot-msg"></div><button class="btn primary lg" data-cas="spin" style="width:100%">Drehen · 5 🪙</button>
          <details class="cas-pay"><summary>Gewinntabelle</summary>${SYM.map(s => `<span>${s[0]}${s[0]}${s[0]} = ${s[2]}</span>`).join('')}<span>2 gleiche = ${PAIR}</span></details></div>
        <div class="panel pad"><b>Rubbellos</b><small class="muted cas-sub">10 🪙 · drei gleiche Symbole gewinnen, 💎💎💎 = 50</small>
          <div class="ticket" id="ticket"><div class="tk-empty">🎟️</div></div>
          <div class="cas-msg" id="tk-msg"></div><div class="row"><button class="btn primary" data-cas="ticket" style="flex:1">Neues Los · 10 🪙</button><button class="btn ghost" id="tk-all" hidden>Alles aufdecken</button></div></div>
        <div class="panel pad"><b>Doppelt oder nichts</b><small class="muted cas-sub">Münzwurf. Gewinn mitnehmen oder nochmal verdoppeln.</small>
          <div class="coin-wrap"><div class="coin" id="coin"><span class="f kopf">🦉</span><span class="f zahl">1</span></div></div>
          <div class="cas-msg" id="dn-msg"></div>
          <div class="row" style="flex-wrap:wrap"><label class="muted" style="font-size:13px">Einsatz <input class="input mono" id="dn-stake" type="number" min="1" max="100" value="10" style="width:80px;display:inline-block;margin-left:6px"></label></div>
          <div class="row" id="dn-act" style="margin-top:8px;flex-wrap:wrap"></div>
          <div class="row" style="margin-top:8px"><button class="btn" data-cas="kopf" style="flex:1">🦉 Kopf</button><button class="btn" data-cas="zahl" style="flex:1">1 Zahl</button></div></div>
        <div class="panel pad"><b>Lern-Wette</b><small class="muted cas-sub">Wette auf dich selbst: nächste Lernrunde (ab 5 Fragen) mit mindestens 80 % = doppelter Einsatz.</small>
          ${c.bet ? `<div class="bet-on"><span>🎯</span><div><b>${c.bet.stake} 🪙 gesetzt</b><small>Jetzt eine Runde Karteikarten oder Quiz spielen.</small></div></div><button class="btn primary" data-go="subjects" style="width:100%;margin-top:10px">Zu den Fächern</button>`
            : `<div class="row" style="margin-top:14px"><label class="muted" style="font-size:13px">Einsatz <input class="input mono" id="bet-stake" type="number" min="5" max="50" value="20" style="width:80px;display:inline-block;margin-left:6px"></label><button class="btn primary" data-cas="bet" style="flex:1">Wette abschließen</button></div>`}
          ${c.won ? `<p class="muted" style="font-size:12.5px;margin-top:12px">Heute gewonnen: ${c.won} 🪙</p>` : ''}</div>
      </div>`;
  },
  mount() { if (pot) { win(pot); pot = 0; counter(); } } // offener Topf beim Neuzeichnen wird ausgezahlt, nicht verloren
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cas]'); if (!b) return;
  const a = b.dataset.cas;
  if (a === 'spin') spin(b);
  if (a === 'ticket') newTicket();
  if (a === 'kopf' || a === 'zahl') flip(a, b);
  if (a === 'take') take(b);
  if (a === 'bet') bet();
});
document.addEventListener('keydown', e => { if (LH.current().name === 'casino' && e.key === ' ' && !e.target.matches('input, textarea, button') && !$('.modal-bg')) { e.preventDefault(); spin(document.querySelector('[data-cas="spin"]')); } });
LH.casino = { DAILY };
})();

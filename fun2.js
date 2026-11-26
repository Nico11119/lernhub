// ===================== LernHub – Lern-Haustier, Glücksrad, Profilkarte =====================
(() => {
'use strict';
const LH = window.LH, { $, esc, dkey } = LH;
const S = () => LH.S;

// ---------- Lern-Haustier ----------
// S.pet = { born: 'YYYY-MM-DD', name, color }. Wächst mit den Lernminuten seit dem Schlüpfen, Laune hängt am letzten Lerntag.
const STAGES = [[0, 'Ei'], [5, 'Knirps'], [120, 'Racker'], [480, 'Rebell'], [1200, 'Legende']];
const PET_COLORS = ['#ff8a3d', '#4dabf7', '#69db7c', '#da77f2', '#ffd43b', '#ff6b6b', '#38d9a9'];
const LINES = {
  happy: ['Heute schon gelernt – du bist der Beste!', 'Mehr Karten! Mehr!', 'Ich werde immer größer!', 'Hihi, das kitzelt.'],
  ok: ['Lernen wir heute auch was?', 'Mir ist ein bisschen langweilig …', 'Fünf Minuten? Bitte?'],
  sad: ['Du warst lange weg …', 'Ich vermisse die Karteikarten.', '*schnief*'],
  sleep: ['Zzz …', '*schnarch*', 'Zzz … Formeln … zzz']
};
function petMinutes(p) { return Object.entries(S().history || {}).reduce((a, [k, m]) => k >= p.born ? a + m : a, 0); }
function stageOf(min) { let i = 0; STAGES.forEach(([m], k) => { if (min >= m) i = k; }); return i; }
function mood() {
  const h = S().history || {};
  for (let i = 0; i < 6; i++) if ((h[dkey(LH.addDays(new Date(), -i))] || 0) > 0) return i === 0 ? 'happy' : i === 1 ? 'ok' : i <= 3 ? 'sad' : 'sleep';
  return 'sleep';
}
function petSvg(stage, md, color, size = 120) {
  if (stage === 0) return `<svg class="pet-svg egg" viewBox="0 0 100 110" width="${size}" height="${size}" aria-hidden="true">
    <ellipse cx="50" cy="60" rx="34" ry="44" fill="#fdf6e3" stroke="#d8cfb8" stroke-width="3"/><circle cx="38" cy="45" r="6" fill="${color}"/><circle cx="62" cy="68" r="8" fill="${color}"/><circle cx="44" cy="82" r="4" fill="${color}"/></svg>`;
  const s = [0, .75, .88, 1, 1.08][stage], eyesY = 46, closed = md === 'sleep', sad = md === 'sad';
  return `<svg class="pet-svg ${md}" viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true"><g transform="translate(60 70) scale(${s}) translate(-60 -70)">
    ${stage >= 3 ? `<path d="M38 28 L30 6 L50 22Z M82 28 L90 6 L70 22Z" fill="${color}"/>` : ''}
    ${stage >= 2 ? `<ellipse cx="24" cy="52" rx="10" ry="16" fill="${color}" transform="rotate(-25 24 52)"/><ellipse cx="96" cy="52" rx="10" ry="16" fill="${color}" transform="rotate(25 96 52)"/>` : ''}
    <path d="M20 90 Q14 40 60 26 Q106 40 100 90 Q98 108 60 108 Q22 108 20 90Z" fill="${color}"/>
    <ellipse cx="60" cy="80" rx="24" ry="20" fill="#fff" opacity=".25"/>
    ${closed ? `<path d="M40 ${eyesY} q6 5 12 0 M68 ${eyesY} q6 5 12 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : `<g class="pet-eyes"><circle cx="46" cy="${eyesY}" r="8" fill="#fff"/><circle cx="74" cy="${eyesY}" r="8" fill="#fff"/><circle cx="47" cy="${eyesY + 1}" r="4.5" fill="#222"/><circle cx="75" cy="${eyesY + 1}" r="4.5" fill="#222"/><circle cx="48.5" cy="${eyesY - 1}" r="1.6" fill="#fff"/><circle cx="76.5" cy="${eyesY - 1}" r="1.6" fill="#fff"/></g>`}
    ${sad ? '<path d="M38 36 l12 4 M82 36 l-12 4" stroke="#222" stroke-width="3" stroke-linecap="round"/>' : ''}
    <path d="${md === 'happy' ? 'M50 62 Q60 74 70 62' : sad ? 'M50 68 Q60 60 70 68' : 'M52 65 Q60 68 68 65'}" stroke="#222" stroke-width="3.5" fill="${md === 'happy' ? '#e64980' : 'none'}" stroke-linecap="round"/>
    <circle cx="36" cy="60" r="5" fill="#ff8fab" opacity=".55"/><circle cx="84" cy="60" r="5" fill="#ff8fab" opacity=".55"/>
    ${stage >= 4 ? '<path d="M42 22 l6 -12 l6 9 l6 -12 l6 12 l6 -9 l6 12z" fill="#ffd43b" stroke="#e8a400" stroke-width="2"/>' : ''}
  </g>${closed ? '<text x="92" y="24" font-size="16" fill="var(--ink-3)" class="pet-z">z</text>' : ''}</svg>`;
}
function petCard() {
  const st = S(), today = dkey();
  if (!st.pet) { st.pet = { born: today, name: '', color: PET_COLORS[Math.floor(Math.random() * PET_COLORS.length)] }; LH.save(); }
  const p = st.pet, min = petMinutes(p), sIdx = stageOf(min), next = STAGES[sIdx + 1], md = sIdx === 0 ? 'ok' : mood();
  if (sIdx > (p.stage || 0)) {
    const hatched = (p.stage || 0) === 0; p.stage = sIdx; LH.save();
    setTimeout(() => { LH.confetti(140); LH.toast('🐣', hatched ? 'Dein Ei ist geschlüpft!' : `${p.name || 'Dein Haustier'} ist jetzt ein ${STAGES[sIdx][1]}!`, hatched ? 'Gib ihm einen Namen' : 'Weiter so'); if (hatched && !p.name) nameIt(); }, 600);
  }
  const prog = next ? (min - STAGES[sIdx][0]) / (next[0] - STAGES[sIdx][0]) * 100 : 100;
  const txt = sIdx === 0 ? `Lern ${Math.max(1, 5 - min)} ${5 - min === 1 ? 'Minute' : 'Minuten'}, dann schlüpft es.` : { happy: 'Glücklich – du hast heute gelernt.', ok: 'Wartet darauf, dass du heute lernst.', sad: 'Traurig. Du warst ein paar Tage weg.', sleep: 'Schläft tief. Lern etwas, um es zu wecken.' }[md];
  return `<div class="panel pad pet" style="margin-top:16px"><button class="pet-box" data-pet="poke" aria-label="Haustier streicheln">${petSvg(sIdx, md, p.color)}<span class="pet-bubble" id="pet-bubble" hidden></span></button>
    <div style="flex:1;min-width:0"><div class="eyebrow">${sIdx === 0 ? 'Ein Ei ist aufgetaucht' : esc(STAGES[sIdx][1])}</div><b class="pet-name">${esc(p.name || (sIdx === 0 ? 'Was da wohl drin ist?' : 'Namenlos'))}</b>${sIdx > 0 && !p.name ? ' <button class="btn sm ghost" data-pet="name">Namen geben</button>' : ''}
    <p class="muted" style="font-size:13px;margin:4px 0 8px">${txt}</p>${LH.meter(prog, 24, { h: 8 })}<small class="muted" style="font-size:12px">${next ? `Noch ${next[0] - min} Lernminuten bis ${next[1]}` : 'Höchste Stufe erreicht!'}</small></div></div>`;
}
async function nameIt() {
  const n = await LH.promptModal({ title: 'Wie soll es heißen?', label: 'Name', value: '', ok: 'Taufen' });
  if (n) { S().pet.name = n.slice(0, 20); LH.save(); LH.rerender(); }
}
function poke(btn) {
  const p = S().pet, sIdx = stageOf(petMinutes(p)), md = sIdx === 0 ? 'ok' : mood();
  const b = $('#pet-bubble'), lines = sIdx === 0 ? ['*wackel*', '*knack?*', '…'] : LINES[md];
  if (b) { b.textContent = lines[Math.floor(Math.random() * lines.length)]; b.hidden = false; clearTimeout(poke.t); poke.t = setTimeout(() => { b.hidden = true; }, 2200); }
  const svg = btn.querySelector('.pet-svg'); svg?.classList.remove('boing'); void svg?.getBoundingClientRect(); svg?.classList.add('boing');
  const h = document.createElement('span'); h.className = 'pet-heart'; h.textContent = md === 'sleep' ? 'z' : '♥'; btn.appendChild(h); setTimeout(() => h.remove(), 900);
}

// ---------- Glücksrad (einmal am Tag, nach 5 Lernminuten) ----------
const SEG = [
  { t: '5 Münzen', w: 20, f: () => LH.addCoins(5) }, { t: '25 XP', w: 18, f: b => LH.addXP(25, b, true) }, { t: '+5 Min Pause', w: 14, f: () => { S().breakBank += 300; LH.hudBreak(); } },
  { t: '15 Münzen', w: 14, f: () => LH.addCoins(15) }, { t: '50 XP', w: 12, f: b => LH.addXP(50, b, true) }, { t: '+10 Min Pause', w: 9, f: () => { S().breakBank += 600; LH.hudBreak(); } },
  { t: '30 Münzen', w: 9, f: () => LH.addCoins(30) }, { t: 'JACKPOT 100', w: 4, f: () => { LH.addCoins(100); LH.confetti(260); } }
];
function wheelCard() {
  const st = S(), today = dkey(), done = st.spinDay === today, mins = st.history[today] || 0;
  return `<div class="panel pad wheel-card" style="margin-top:16px"><span class="wheel-ic">🎡</span><div style="flex:1"><b>Glücksrad</b><small>${done ? 'Heute schon gedreht – morgen wieder.' : mins >= 5 ? 'Bereit! Einmal drehen pro Tag.' : `Noch ${5 - mins} Lernminuten, dann darfst du drehen.`}</small></div>
    <button class="btn sm ${!done && mins >= 5 ? 'primary' : ''}" data-pet="wheel" ${done || mins < 5 ? 'disabled' : ''}>Drehen</button></div>`;
}
function wheel() {
  const st = S(), today = dkey();
  if (st.spinDay === today || (st.history[today] || 0) < 5) return;
  LH.openModal(`<h3 style="text-align:center">Glücksrad</h3><div class="wheel-wrap"><canvas id="wheel" width="560" height="560"></canvas><div class="wheel-pin"></div></div>
    <p class="lede" id="wheel-res" style="text-align:center;min-height:28px"></p><div class="row" style="justify-content:center;margin-top:8px"><button class="btn primary lg" id="wheel-go">Drehen!</button></div>`, (bg, close) => {
    const c = bg.querySelector('#wheel'), x = c.getContext('2d'), n = SEG.length, R = 270, cs = getComputedStyle(document.documentElement);
    const cols = [cs.getPropertyValue('--signal').trim() || '#2f4fe0', '#ffd43b', '#69db7c', '#ff8a3d', '#4dabf7', '#da77f2', '#38d9a9', '#ff6b6b'];
    let rot = 0;
    const draw = () => {
      x.clearRect(0, 0, 560, 560); x.save(); x.translate(280, 280); x.rotate(rot);
      SEG.forEach((s, i) => {
        const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
        x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, a0, a1); x.closePath(); x.fillStyle = cols[i % cols.length]; x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.stroke();
        x.save(); x.rotate((a0 + a1) / 2); x.fillStyle = '#111'; x.font = '700 22px Bricolage, system-ui'; x.textAlign = 'right'; x.fillText(s.t, R - 18, 8); x.restore();
      });
      x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill(); x.restore();
    };
    draw();
    bg.querySelector('#wheel-go').onclick = e => {
      const btn = e.target; btn.disabled = true;
      if (S().spinDay === dkey()) return;
      const total = SEG.reduce((a, s) => a + s.w, 0); let r = Math.random() * total, k = 0;
      while (r >= SEG[k].w) { r -= SEG[k].w; k++; }
      S().spinDay = dkey(); LH.save(); // vor der Animation, damit Schließen nicht zum zweiten Dreh führt
      // Zeiger oben (−90°): Segment k soll dort landen
      const target = -Math.PI / 2 - (k + .5) / n * Math.PI * 2 + (Math.random() - .5) * (Math.PI * 2 / n) * .6;
      const from = rot; let to = target; while (to > from - Math.PI * 2 * (LH.reduced() ? 1 : 6)) to -= Math.PI * 2;
      const dur = LH.reduced() ? 300 : 4200, t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - p, 4);
        rot = from + (to - from) * ease; draw();
        if (p < 1) return requestAnimationFrame(step);
        SEG[k].f(btn); LH.save(); LH.hud();
        const res = bg.querySelector('#wheel-res'); if (res) res.innerHTML = `<b>${esc(SEG[k].t)}</b> gewonnen!`;
        btn.textContent = 'Super'; btn.disabled = false; btn.onclick = () => { close(); LH.rerender(); };
      };
      requestAnimationFrame(step);
    };
  });
}

// ---------- Profilkarte (PNG zum Teilen) ----------
async function profileCard() {
  const st = S(), W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), sig = getComputedStyle(document.documentElement).getPropertyValue('--signal').trim() || '#2f4fe0';
  await document.fonts?.ready;
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#11131a'); g.addColorStop(1, '#1d2030'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * .8, 140, 10, W * .8, 140, 620); glow.addColorStop(0, sig + 'aa'); glow.addColorStop(1, sig + '00'); x.fillStyle = glow; x.fillRect(0, 0, W, H);
  const F = (w, s) => `${w} ${s}px Bricolage, system-ui, sans-serif`;
  x.fillStyle = '#fff'; x.font = F(700, 44); x.fillText('LernHub', 80, 120);
  x.fillStyle = 'rgba(255,255,255,.55)'; x.font = F(500, 30); x.fillText(new Date().toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' }), 80, 165);
  x.fillStyle = '#fff'; x.font = F(800, 100); x.fillText(LH.userName() || 'Lernprofi', 80, 330);
  const lvl = LH.levelOf(st.xp); x.fillStyle = sig; x.beginPath(); x.roundRect(80, 370, 300, 76, 38); x.fill(); x.fillStyle = '#fff'; x.font = F(700, 40); x.fillText(`Level ${lvl}`, 120, 422);
  x.fillStyle = 'rgba(255,255,255,.6)'; x.font = F(500, 34); x.fillText(`${st.xp.toLocaleString('de-AT')} XP`, 410, 422);
  const mins = Object.values(st.history || {}).reduce((a, m) => a + m, 0), ans = st.stats.correct + st.stats.wrong;
  const stats = [[`${Math.round(mins / 6) / 10}`.replace('.', ','), 'Stunden gelernt'], [`${st.streak.best || 0}`, 'Tage beste Serie'], [ans.toLocaleString('de-AT'), 'Fragen beantwortet'], [`${st.badges.length}`, 'Abzeichen']];
  stats.forEach(([v, l], i) => {
    const bx = 80 + (i % 2) * 470, by = 520 + Math.floor(i / 2) * 230;
    x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.roundRect(bx, by, 450, 200, 28); x.fill();
    x.fillStyle = '#fff'; x.font = F(800, 84); x.fillText(v, bx + 36, by + 110); x.fillStyle = 'rgba(255,255,255,.6)'; x.font = F(500, 30); x.fillText(l, bx + 36, by + 160);
  });
  const fav = Object.entries(st.subjMin || {}).map(([id, m]) => ({ s: LH.subj(id), m })).filter(z => z.s).sort((a, b) => b.m - a.m)[0];
  if (fav) { x.fillStyle = 'rgba(255,255,255,.6)'; x.font = F(500, 30); x.fillText('Lieblingsfach', 80, 1060); x.fillStyle = fav.s.color; x.font = F(800, 56); x.fillText(fav.s.name, 80, 1125); }
  if (st.pet) { // Haustier als SVG-Bild einzeichnen
    const p = st.pet, svg = petSvg(stageOf(petMinutes(p)), stageOf(petMinutes(p)) ? mood() : 'ok', p.color, 300).replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"').replace(/var\(--ink-3\)/g, '#999');
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await new Promise(r => { img.onload = r; img.onerror = r; });
    try { x.drawImage(img, W - 380, H - 420, 300, 300); } catch {}
    if (p.name) { x.fillStyle = 'rgba(255,255,255,.7)'; x.font = F(600, 30); x.textAlign = 'center'; x.fillText(p.name, W - 230, H - 90); x.textAlign = 'start'; }
  }
  x.fillStyle = 'rgba(255,255,255,.35)'; x.font = F(500, 26); x.fillText('nico11119.github.io/lernhub', 80, H - 70);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')), name = 'LernHub-Profil.png';
  const file = new File([blob], name, { type: 'image/png' });
  if (LH.IS_MOBILE && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Mein LernHub' }); return; } catch {} }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  LH.toast('PROFIL', 'Profilkarte gespeichert', 'Als Bild in Downloads – zum Teilen in WhatsApp, Insta & Co.');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-pet]'); if (!b || b.disabled) return;
  const a = b.dataset.pet;
  if (a === 'poke') poke(b);
  if (a === 'name') nameIt();
  if (a === 'wheel') wheel();
  if (a === 'profile') profileCard();
});
LH.on('minute', () => { if (LH.current().name === 'home' && [5, 120, 480, 1200].includes(petMinutes(S().pet || { born: '9' })) ) LH.rerender(); });

LH.fun2 = { petCard, wheelCard, profileCard, petSvg };
})();

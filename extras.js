// ===================== LernHub – Ziele, Shop, Fokus, Briefing =====================
(() => {
'use strict';
const LH = window.LH;
const { $, esc } = LH;
const S = () => LH.S;

// =============== Ziele ===============
const POOL = [
  { id: 'c15', text: '15 Karten richtig', ev: 'answer', test: d => d.ok, target: 15, reward: 10 },
  { id: 'c30', text: '30 Karten richtig', ev: 'answer', test: d => d.ok, target: 30, reward: 18 },
  { id: 'm10', text: '10 Minuten lernen', ev: 'minute', target: 10, reward: 8 },
  { id: 'm25', text: '25 Minuten lernen', ev: 'minute', target: 25, reward: 15 },
  { id: 'perf', text: 'Eine Runde ohne Fehler', ev: 'session', test: d => d.wrong === 0 && d.n >= 5, target: 1, reward: 12 },
  { id: 'type', text: 'Eine Runde Eintippen oder Lückentext', ev: 'session', test: d => ['type', 'cloze'].includes(d.mode), target: 1, reward: 8 },
  { id: 'match', text: 'Eine Runde Zuordnen', ev: 'session', test: d => d.mode === 'match', target: 1, reward: 8 },
  { id: 'exam', text: 'Eine Prüfungssimulation', ev: 'exam', target: 1, reward: 15 },
  { id: 'mist', text: '5 Fehler wieder richtig', ev: 'answer', test: d => d.ok && d.card && LH.cs(d.card.id).w > 0, target: 5, reward: 10 },
  { id: 'hw', text: 'Eine Hausübung abhaken', ev: 'homework', target: 1, reward: 8, when: () => LH.school?.openHw().length },
  { id: 'focus', text: 'Einen Fokusblock schaffen', ev: 'focus', target: 1, reward: 12 }
];
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function ensureDay() {
  const g = S().goals, today = LH.dkey();
  if (g.day === today && g.list?.length) return;
  const pool = POOL.filter(p => !p.when || p.when());
  let h = hash(today); const pick = [];
  while (pick.length < 3 && pool.length) { h = (h * 1103515245 + 12345) >>> 0; const p = pool.splice(h % pool.length, 1)[0]; if (!pick.some(x => x.ev === p.ev && x.ev === 'minute')) pick.push(p); }
  g.day = today; g.list = pick.map(p => ({ id: p.id, p: 0, done: false }));
  LH.save();
}
function weekKey() { const d = new Date(); const m = (d.getDay() + 6) % 7; return LH.dkey(LH.addDays(d, -m)); }
function weekMinutes() { const d = new Date(); const m = (d.getDay() + 6) % 7; let s = 0; for (let i = 0; i <= m; i++) s += S().history[LH.dkey(LH.addDays(d, -i))] || 0; return s; }
function bumpGoals(ev, data) {
  ensureDay();
  let changed = false;
  for (const g of S().goals.list) {
    const p = POOL.find(x => x.id === g.id); if (!p || g.done || p.ev !== ev || (p.test && !p.test(data || {}))) continue;
    g.p++; changed = true;
    if (g.p >= p.target) {
      g.done = true; LH.addCoins(p.reward);
      setTimeout(() => { LH.toast(`+${p.reward}`, 'Challenge geschafft', p.text); LH.confetti(60); }, 300);
      if (S().goals.list.every(x => x.done)) { S().stats.goalDays = (S().stats.goalDays || 0) + 1; LH.addCoins(15); setTimeout(() => LH.toast('3/3', 'Alle Tagesziele!', '+15 Bonus-Münzen'), 900); LH.checkBadges(); }
    }
  }
  const wk = weekKey();
  if (S().goals.week !== wk) { S().goals.week = wk; S().goals.weekDone = false; }
  if (!S().goals.weekDone && weekMinutes() >= S().settings.weekGoal) { S().goals.weekDone = true; LH.addCoins(40); setTimeout(() => { LH.toast('+40', 'Wochenziel erreicht', `${S().settings.weekGoal} Minuten diese Woche`); LH.confetti(140); }, 500); changed = true; }
  if (changed) { LH.save(); if (LH.current().name === 'home') refreshGoals(); }
}
['answer', 'minute', 'session', 'exam', 'homework', 'focus'].forEach(ev => LH.on(ev, d => bumpGoals(ev, d)));
function goalsHtml() {
  ensureDay();
  return S().goals.list.map(g => { const p = POOL.find(x => x.id === g.id); if (!p) return '';
    return `<div class="goal ${g.done ? 'done' : ''}"><span class="gk">${g.done ? '✓' : ''}</span><div class="t"><b>${esc(p.text)}</b>${LH.meter(Math.min(100, g.p / p.target * 100), 16, { cls: 'thin', color: g.done ? 'var(--ok)' : undefined })}</div><span class="mono gr">${g.done ? 'OK' : `${g.p}/${p.target}`}<small>+${p.reward}</small></span></div>`; }).join('');
}
function refreshGoals() { const el = $('#goals'); if (el) { el.innerHTML = goalsHtml(); LH.lightMeters(el); } }

// =============== Startseite ===============
LH.homeExtras = () => {
  const wm = weekMinutes(), wg = S().settings.weekGoal;
  return `<div class="grid-2 home-x" style="margin-top:16px">
    <div class="panel pad"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>Tages-Challenges</b><span class="muted" style="font-size:12.5px">neu um Mitternacht</span></div><div id="goals">${goalsHtml()}</div></div>
    <div class="panel pad focus-card">
      <div class="row" style="justify-content:space-between"><b>Wochenziel</b><span class="mono">${wm}<span class="muted"> / ${wg} min</span></span></div>
      <div style="margin:10px 0 18px">${LH.meter(Math.min(100, wm / wg * 100), 28, { h: 10, color: S().goals.weekDone ? 'var(--ok)' : undefined })}</div>
      <div class="row"><button class="btn primary" data-fx="focus">${F.active ? 'Fokus läuft' : `Fokus · ${S().settings.focusMin} Min`}</button><button class="btn ghost" data-fx="briefing">Briefing</button></div>
      <small class="muted" style="display:block;margin-top:10px;font-size:12.5px">Fokus schließt ${esc(S().settings.focusApps || 'nichts')}${S().settings.focusPlaylist ? ', startet deine Playlist' : ''} und zählt die Zeit als Lernzeit.</small>
    </div></div>${LH.school?.homeBlock() ? `<div style="margin-top:16px">${LH.school.homeBlock()}</div>` : ''}`;
};

// =============== Shop ===============
const ITEMS = [
  // Tintenfarben (IDs bleiben, damit Gekauftes erhalten bleibt)
  { id: 'theme:orange', name: 'Füllerblau', price: 0, color: '#2f4fe0' },
  { id: 'theme:blonde', name: 'Bleistift', price: 60, color: '#495057' },
  { id: 'theme:green', name: 'Tannengrün', price: 50, color: '#1f7a4d' },
  { id: 'theme:cyan', name: 'Petrol', price: 50, color: '#0b7285' },
  { id: 'theme:red', name: 'Karmin', price: 60, color: '#c2255c' },
  { id: 'theme:yellow', name: 'Bernstein', price: 60, color: '#b35c00' },
  { id: 'theme:blue', name: 'Violett', price: 70, color: '#6741d9' },
  { id: 'theme:pink', name: 'Signalorange', price: 80, color: '#e8590c' },
  { id: 'skin:square', name: 'Würfel', price: 0 },
  { id: 'skin:circle', name: 'Kugel', price: 30 },
  { id: 'skin:diamond', name: 'Raute', price: 40 },
  { id: 'skin:pick', name: 'Plektrum', price: 50 },
  { id: 'skin:amp', name: 'Amp', price: 70 },
  { id: 'ring:bars', name: 'Balken', price: 0 },
  { id: 'ring:dots', name: 'Punkte', price: 40 },
  { id: 'ring:wave', name: 'Welle', price: 50 },
  { id: 'ring:segments', name: 'Segmente', price: 40 }
];
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(Math.min(255, v + (255 - v) * f))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
function applyTheme() {
  const t = ITEMS.find(i => i.id === 'theme:' + S().shop.theme) || ITEMS[0], dark = LH.isDark();
  // im Nachtheft heller, damit die Tinte auf dunklem Grund lesbar bleibt
  const base = dark ? shade(t.color, .38) : t.color;
  document.documentElement.style.setProperty('--signal', base);
  document.documentElement.style.setProperty('--signal-2', shade(base, dark ? .15 : .14));
}
LH.on('ready', applyTheme); LH.on('adopt', applyTheme); LH.on('theme', () => S() && applyTheme());
// Farbe für Zeichnungen auf der dunklen Tafel (Spiele, Shop-Vorschau)
LH.themeColor = () => shade((ITEMS.find(i => i.id === 'theme:' + S().shop.theme) || ITEMS[0]).color, .35);

// Runner-Figuren (auch für das Spiel)
LH.drawSkin = (x, skin, cx, cy, s, rot, color) => {
  x.save(); x.translate(cx, cy); x.rotate(rot || 0); x.fillStyle = color;
  const h = s / 2;
  if (skin === 'circle') { x.beginPath(); x.arc(0, 0, h, 0, 7); x.fill(); x.fillStyle = '#0d0c0b'; x.beginPath(); x.arc(h * .3, -h * .2, h * .22, 0, 7); x.fill(); }
  else if (skin === 'diamond') { x.beginPath(); x.moveTo(0, -h); x.lineTo(h, 0); x.lineTo(0, h); x.lineTo(-h, 0); x.closePath(); x.fill(); x.fillStyle = '#0d0c0b'; x.fillRect(-h * .25, -h * .25, h * .5, h * .5); }
  else if (skin === 'pick') { x.beginPath(); x.moveTo(-h, -h * .8); x.quadraticCurveTo(0, -h * 1.3, h, -h * .8); x.quadraticCurveTo(h * .9, h * .2, 0, h); x.quadraticCurveTo(-h * .9, h * .2, -h, -h * .8); x.fill(); }
  else if (skin === 'amp') { x.fillRect(-h, -h, s, s); x.fillStyle = '#0d0c0b'; x.fillRect(-h + 3, -h + 7, s - 6, s - 10); x.fillStyle = color; for (let i = -1; i <= 1; i++) x.fillRect(i * h * .55 - 1, -h + 2, 2, 3); x.globalAlpha = .5; x.fillRect(-h + 6, -h + 10, s - 12, 1); x.fillRect(-h + 6, -h + 15, s - 12, 1); x.fillRect(-h + 6, -h + 20, s - 12, 1); }
  else { x.fillRect(-h, -h, s, s); x.fillStyle = '#0d0c0b'; x.fillRect(-h * .4, -h * .4, h * .8, h * .8); }
  x.restore();
};
function ringPreview(c, style, color) {
  const x = c.getContext('2d'), W = c.width, H = c.height, cx = W / 2, cy = H / 2, N = 48, r0 = 28;
  x.clearRect(0, 0, W, H);
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, v = .3 + .6 * Math.abs(Math.sin(i * .5)), len = 4 + v * 22;
    x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 2.4; x.lineCap = 'round';
    if (style === 'dots') { x.beginPath(); x.arc(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len), 2.2, 0, 7); x.fill(); }
    else if (style === 'segments') { x.globalAlpha = v; x.beginPath(); x.arc(cx, cy, r0 + 10, a, a + Math.PI * 2 / N * .7); x.lineWidth = 12; x.stroke(); x.globalAlpha = 1; }
    else if (style !== 'wave') { x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); x.stroke(); }
  }
  if (style === 'wave') { x.beginPath(); for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, r = r0 + 12 + Math.sin(a * 6) * 8; i ? x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.strokeStyle = color; x.lineWidth = 2.4; x.stroke(); }
}
LH.VIEWS.shop = {
  html() {
    const own = id => S().shop.owned.includes(id);
    const eq = it => { const [k, v] = it.id.split(':'); return S().shop[k] === v; };
    const card = it => `<div class="panel shop-item ${eq(it) ? 'eq' : ''}" data-item="${it.id}">
      ${it.id.startsWith('theme') ? `<div class="sw-big" style="--c:${it.color}"><span></span><i></i></div>` : `<canvas class="pv" width="160" height="110" data-pv="${it.id}"></canvas>`}
      <div class="row" style="justify-content:space-between;margin-top:12px"><b>${esc(it.name)}</b><span class="mono ${own(it.id) ? 'muted' : ''}">${own(it.id) ? (eq(it) ? 'Aktiv' : 'Gekauft') : it.price + ' 🪙'}</span></div>
      <button class="btn sm ${own(it.id) ? '' : 'primary'}" data-buy="${it.id}" ${eq(it) ? 'disabled' : !own(it.id) && S().coins < it.price ? 'disabled' : ''}>${eq(it) ? 'Ausgerüstet' : own(it.id) ? 'Ausrüsten' : 'Kaufen'}</button></div>`;
    return `<div class="page-head"><div><div class="eyebrow">Shop</div><h1 class="h1">Münzen ausgeben</h1><p class="lede">Für richtige Antworten, Lernminuten, Challenges und erledigte HÜs gibt es Münzen.</p></div>
      <div class="readout" style="align-items:flex-end"><small>Dein Guthaben</small><b style="font-size:30px">${S().coins} 🪙</b></div></div>
      <h2 class="h2">Farbe der App</h2><div class="shop-grid">${ITEMS.filter(i => i.id.startsWith('theme')).map(card).join('')}</div>
      <h2 class="h2">Figur im Runner</h2><div class="shop-grid">${ITEMS.filter(i => i.id.startsWith('skin')).map(card).join('')}</div>
      <h2 class="h2">JARVIS-Ring</h2><div class="shop-grid">${ITEMS.filter(i => i.id.startsWith('ring')).map(card).join('')}</div>`;
  },
  mount() {
    const col = LH.themeColor();
    document.querySelectorAll('[data-pv]').forEach(c => {
      const [k, v] = c.dataset.pv.split(':');
      if (k === 'skin') { const x = c.getContext('2d'); x.fillStyle = '#0d0c0b'; x.fillRect(0, 0, 160, 110); x.strokeStyle = '#3d3934'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 86); x.lineTo(160, 86); x.stroke(); LH.drawSkin(x, v, 80, 66, 34, 0, col); }
      else ringPreview(c, v, col);
    });
  }
};
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-buy]'); if (!b) return;
  const it = ITEMS.find(i => i.id === b.dataset.buy), [k, v] = it.id.split(':');
  if (!S().shop.owned.includes(it.id)) {
    if (S().coins < it.price) return;
    if (!await LH.confirmModal({ title: `${it.name} kaufen?`, detail: `Kostet ${it.price} Münzen. Du hast ${S().coins}.`, ok: 'Kaufen' })) return;
    S().coins -= it.price; S().shop.owned.push(it.id); LH.confetti(80); LH.toast('SHOP', `${it.name} gekauft`, `−${it.price} Münzen`);
  }
  S().shop[k] = v; applyTheme(); LH.hud(); LH.save(); LH.rerender();
});

// =============== Fokusmodus ===============
const F = { active: false, end: 0, total: 0, t: 0 };
function pill() {
  let p = $('#focus-pill');
  if (!F.active) { p?.remove(); return; }
  if (!p) { $('.topbar').insertAdjacentHTML('beforeend', '<div class="focus-pill" id="focus-pill"><span class="led"></span><span class="mono" id="fp-t"></span><button class="icon-btn" data-fx="stop" aria-label="Fokus beenden">■</button></div>'); p = $('#focus-pill'); }
  const left = Math.max(0, Math.round((F.end - Date.now()) / 1000));
  $('#fp-t').textContent = `FOKUS ${LH.mmss(left)}`;
  p.style.setProperty('--p', (1 - left / F.total) * 100 + '%');
}
async function startFocus() {
  if (F.active) return LH.toast('FOK', 'Fokus läuft schon', LH.mmss(Math.round((F.end - Date.now()) / 1000)) + ' übrig');
  const min = S().settings.focusMin || 25;
  F.active = true; F.total = min * 60; F.end = Date.now() + F.total * 1000;
  pill(); clearInterval(F.t); F.t = setInterval(tick, 1000);
  const closed = [];
  if (LH.IS_DESKTOP) {
    for (const name of (S().settings.focusApps || '').split(',').map(x => x.trim()).filter(Boolean)) {
      const r = await LH.API.jarvis.run('close_app', { name }).catch(() => null);
      if (r?.ok && r.closed) closed.push(name);
    }
    if (S().settings.focusPlaylist) await LH.API.jarvis.run('open_url', { url: S().settings.focusPlaylist }).catch(() => {});
  }
  const msg = `Fokusmodus an: ${min} Minuten.${closed.length ? ` Ich habe ${closed.join(' und ')} geschlossen.` : ''}${S().settings.focusPlaylist && LH.IS_DESKTOP ? ' Deine Playlist startet.' : ''} Viel Erfolg.`;
  LH.jarvis?.reply ? (LH.jarvis.open(true, true), LH.jarvis.reply(msg)) : LH.toast('FOK', 'Fokus an', msg);
  if (LH.current().name === 'home') LH.rerender();
}
function tick() {
  if (!F.active) return clearInterval(F.t);
  pill();
  if (Date.now() >= F.end) {
    F.active = false; clearInterval(F.t); pill();
    S().stats.focus = (S().stats.focus || 0) + 1; LH.addCoins(5);
    LH.emit('focus'); LH.checkBadges(); LH.save();
    LH.confetti(150);
    const m = `Fokusblock geschafft. Plus 5 Münzen. Zeit für eine Pause – du hast ${LH.mmss(S().breakBank)} Spielzeit.`;
    LH.jarvis?.reply ? (LH.jarvis.open(true, true), LH.jarvis.reply(m)) : LH.toast('FOK', 'Fokus geschafft', m);
    if (LH.current().name === 'home') LH.rerender();
  }
}
function stopFocus() { if (!F.active) return; F.active = false; clearInterval(F.t); pill(); LH.toast('FOK', 'Fokus beendet', 'Abgebrochen – zählt nicht für die Challenge'); if (LH.current().name === 'home') LH.rerender(); }
LH.focus = { active: () => F.active, start: startFocus, stop: stopFocus };

// =============== Morgenbriefing ===============
const WMO = c => c === 0 ? 'klar' : c <= 2 ? 'leicht bewölkt' : c === 3 ? 'bedeckt' : c <= 48 ? 'neblig' : c <= 57 ? 'Nieselregen' : c <= 67 ? 'Regen' : c <= 77 ? 'Schnee' : c <= 82 ? 'Regenschauer' : c <= 86 ? 'Schneeschauer' : 'Gewitter';
async function weather() {
  const city = S().settings.city; if (!city) return '';
  try {
    let g = S().settings.cityGeo;
    if (!g || g.q !== city) {
      const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de`)).json();
      const p = r.results?.[0]; if (!p) return '';
      g = S().settings.cityGeo = { q: city, name: p.name, lat: p.latitude, lon: p.longitude }; LH.save();
    }
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`)).json();
    const t = Math.round(w.current.temperature_2m), mx = Math.round(w.daily.temperature_2m_max[0]), mn = Math.round(w.daily.temperature_2m_min[0]), pp = w.daily.precipitation_probability_max[0];
    return `In ${g.name} hat es ${t} Grad, ${WMO(w.current.weather_code)}, heute ${mn} bis ${mx} Grad${pp >= 30 ? `, Regenwahrscheinlichkeit ${pp} Prozent` : ''}.`;
  } catch { return ''; }
}
async function briefing() {
  const d = new Date(), h = d.getHours(), parts = [];
  parts.push(`${LH.hello(h < 11 ? 'Guten Morgen' : h < 18 ? 'Servus' : 'Guten Abend')} Heute ist ${d.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}.`);
  const w = await weather(); if (w) parts.push(w);
  const tests = LH.upcoming().filter(t => (LH.parseKey(t.date) - LH.parseKey(LH.dkey())) / 864e5 <= 7);
  const when = k => { const f = LH.fmtDay(k); return f === 'Heute' ? 'heute' : f === 'Morgen' ? 'morgen' : 'am ' + LH.parseKey(k).toLocaleDateString('de-AT', { weekday: 'long' }); };
  if (tests.length) parts.push(tests.map(t => `${t.title} ist ${when(t.date)}`).join(', ') + '.');
  const ch = LH.timetable?.changesText(LH.dkey()) || [];
  if (ch.length) parts.push(`Stundenplan heute: ${ch.join(', ')}.`);
  const miss = tests.filter(t => !LH.cardsOf(t.subjectId).length);
  if (miss.length) parts.push(`Für ${miss.map(t => t.title).join(' und ')} fehlt noch ein Lernzettel – lad ihn hoch, dann plane ich die Wiederholung.`);
  const plan = LH.todayTasks().filter(x => !x.done);
  if (plan.length) parts.push(`Laut Lernplan heute: ${plan.map(x => x.p.label).join(' und ')}.`);
  const hw = LH.school?.openHw().filter(x => LH.school.daysTo(x.due) <= 1) || [];
  if (hw.length) parts.push(`Hausübungen: ${hw.map(x => `${x.title} (${LH.school.dueText(x.due)})`).join(', ')}.`);
  const mk = LH.modes?.mistakes().length || 0;
  if (mk) parts.push(`Im Fehlerheft warten ${mk} Karten.`);
  const risk = LH.school?.atRisk() || [];
  if (risk.length) parts.push(`Achtung bei den Noten: ${risk.map(x => `${x.s.name} steht auf ${x.note}`).join(', ')}. ${risk[0].tip || ''}`.trim());
  const du = LH.modes?.due().length || 0;
  if (du) parts.push(`${du} Karten sind heute zum Wiederholen fällig.`);
  if (LH.streakNow() > 0 && S().streak.last !== LH.dkey()) parts.push(`Deine Streak steht bei ${LH.streakNow()} Tagen – lern heute ein bisschen, damit sie hält.`);
  ensureDay();
  parts.push(`Tages-Challenges: ${S().goals.list.map(g => POOL.find(p => p.id === g.id)?.text).filter(Boolean).join(', ')}.`);
  return parts.join('\n');
}
async function runBriefing() {
  S().lastBriefing = LH.dkey(); LH.save();
  const text = await briefing();
  LH.jarvis.open(true, true); LH.jarvis.reply(text);
}
LH.on('booted', () => {
  ensureDay(); bumpGoals('noop');
  if (S().settings.briefing && S().lastBriefing !== LH.dkey() && !LH.IS_REMOTE && innerWidth >= 760) setTimeout(runBriefing, 1800);
});
LH.briefing = { run: runBriefing, text: briefing };

document.addEventListener('click', e => {
  const b = e.target.closest('[data-fx]'); if (!b) return;
  if (b.dataset.fx === 'focus') startFocus();
  if (b.dataset.fx === 'stop') stopFocus();
  if (b.dataset.fx === 'briefing') runBriefing();
});
})();

// Update-Hinweis (installierte Version)
(() => {
  const LH = window.LH;
  LH.on('booted', () => LH.API?.update?.onReady(i => LH.openModal(`<h3>Update bereit</h3><p class="lede">LernHub ${LH.esc(i.version)} ist geladen. Es wird beim nächsten Schließen installiert – oder jetzt gleich. Deine Daten bleiben erhalten.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-l>Später</button><button class="btn primary" data-n>Jetzt neu starten</button></div>`,
    (bg, close) => { bg.querySelector('[data-l]').onclick = close; bg.querySelector('[data-n]').onclick = () => LH.API.update.install(); })));
})();

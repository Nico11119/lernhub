// ===================== LernHub – Ferien, Heatmap, Rückblick, Werkzeuge =====================
(() => {
'use strict';
const LH = window.LH, { $, esc, dkey, addDays, parseKey, fmtDay } = LH;
const S = () => LH.S;
const day = (y, m, d) => dkey(new Date(y, m - 1, d));
const fmtD = k => parseKey(k).toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' });

// ---------- Ferien ----------
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
// Schuljahr ab September y – gesetzliche Regeln für Niederösterreich (ohne schulautonome Tage)
function rules(y) {
  const E = easter(y + 1), e = n => dkey(addDays(E, n));
  const feb = new Date(y + 1, 1, 1); while (feb.getDay() !== 1) feb.setDate(feb.getDate() + 1);
  const sum = new Date(y + 1, 5, 28); while (sum.getDay() !== 6) sum.setDate(sum.getDate() + 1);
  const sep = new Date(y + 1, 8, 1); while (sep.getDay() !== 1) sep.setDate(sep.getDate() + 1);
  return [
    { name: 'Nationalfeiertag', from: day(y, 10, 26), to: day(y, 10, 26) },
    { name: 'Herbstferien', from: day(y, 10, 27), to: day(y, 10, 31) },
    { name: 'Allerheiligen / Allerseelen', from: day(y, 11, 1), to: day(y, 11, 2) },
    { name: 'Hl. Leopold', from: day(y, 11, 15), to: day(y, 11, 15) },
    { name: 'Mariä Empfängnis', from: day(y, 12, 8), to: day(y, 12, 8) },
    { name: 'Weihnachtsferien', from: day(y, 12, 24), to: day(y + 1, 1, 6) },
    { name: 'Semesterferien', from: dkey(feb), to: dkey(addDays(feb, 6)) },
    { name: 'Osterferien', from: e(-8), to: e(1) },
    { name: 'Staatsfeiertag', from: day(y + 1, 5, 1), to: day(y + 1, 5, 1) },
    { name: 'Christi Himmelfahrt', from: e(39), to: e(39) },
    { name: 'Pfingstferien', from: e(48), to: e(50) },
    { name: 'Fronleichnam', from: e(60), to: e(60) },
    { name: 'Sommerferien', from: dkey(sum), to: dkey(addDays(sep, -1)) }
  ];
}
function holidays() {
  const now = new Date(), y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1, today = dkey();
  const own = (S().holidays || []).filter(h => h.from && h.to);
  // WebUntis kennt die echten Tage der Schule; danach (z. B. im Sommer) die Regeln weiterverwenden
  const list = own.some(h => h.to >= today) ? [...own, ...rules(y + 1).filter(r => r.from > own.reduce((m, h) => h.to > m ? h.to : m, ''))] : [...rules(y), ...rules(y + 1)];
  return { list: list.sort((a, b) => a.from.localeCompare(b.from)), fromUntis: own.some(h => h.to >= today) };
}
const isFree = (k, list) => list.some(h => k >= h.from && k <= h.to);
function schoolDaysUntil(k, list) {
  let n = 0;
  for (let d = new Date(); dkey(d) < k; d = addDays(d, 1)) { const wd = d.getDay(); if (wd && wd < 6 && !isFree(dkey(d), list)) n++; }
  return n;
}
const daysTo = k => Math.round((parseKey(k) - parseKey(dkey())) / 864e5);
function holidayCard() {
  const { list } = holidays(), today = dkey();
  const now = list.find(h => today >= h.from && today <= h.to);
  const big = list.find(h => h.from > today && (parseKey(h.to) - parseKey(h.from)) / 864e5 >= 2); // nächste richtige Ferien
  const next = list.find(h => h.from > today);
  if (!next && !now) return '';
  const line = now ? `<b>${esc(now.name)}</b> · frei bis ${fmtD(now.to)}`
    : `<b>${esc(big?.name || next.name)}</b> in ${daysTo((big || next).from)} Tagen · noch <b>${schoolDaysUntil((big || next).from, list)}</b> Schultage`;
  const extra = !now && big && next && next !== big ? `<small>Davor frei: ${esc(next.name)} (${fmtD(next.from)})</small>` : '';
  return `<div class="panel pad holi" style="margin-top:16px"><span class="holi-ic">☀</span><div style="flex:1;min-width:0"><div>${line}</div>${extra}</div><button class="btn sm ghost" data-fun="holidays">Alle freien Tage</button></div>`;
}
function holidayModal() {
  const { list, fromUntis } = holidays(), today = dkey(), y0 = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const year = list.filter(h => h.to >= `${y0}-09-01` && h.from <= `${y0 + 1}-09-15`);
  LH.openModal(`<h3>Schulfreie Tage ${y0}/${String(y0 + 1).slice(2)}</h3><p class="muted" style="font-size:13px">${fromUntis ? 'Aus WebUntis – mit den schulautonomen Tagen deiner Schule.' : 'Gesetzliche Regeln für Niederösterreich. Schulautonome Tage kommen dazu, sobald WebUntis verbunden ist.'}</p>
    <div class="holi-list">${year.map(h => `<div class="holi-row ${h.to < today ? 'past' : ''}"><span>${esc(h.name)}</span><span class="mono">${h.from === h.to ? fmtD(h.from) : `${fmtD(h.from)} – ${fmtD(h.to)}`}</span></div>`).join('')}</div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" data-x>OK</button></div>`, (bg, close) => bg.querySelector('[data-x]').onclick = close);
}

// ---------- Heatmap (Lernminuten pro Tag im Schuljahr) ----------
function heatmap() {
  const now = new Date(), y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const start = new Date(y, 8, 1); while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
  const h = S().history || {}, cols = [];
  let learned = 0, total = 0;
  for (let d = new Date(start); d <= now; d = addDays(d, 7)) {
    cols.push(Array.from({ length: 7 }, (_, i) => { const x = addDays(d, i), k = dkey(x), m = h[k] || 0; if (x > now) return '<i class="hm-f"></i>'; if (m) { learned++; total += m; }
      return `<i class="hm-${m === 0 ? 0 : m <= 10 ? 1 : m <= 25 ? 2 : m <= 45 ? 3 : 4}" title="${fmtD(k)}: ${m} min"></i>`; }).join(''));
  }
  return `<h2 class="h2">Dein Schuljahr <span class="mono">${learned} Tage</span></h2>
    <div class="panel pad"><div class="hm-wrap"><div class="hm-days"><span>Mo</span><span></span><span>Mi</span><span></span><span>Fr</span><span></span><span>So</span></div><div class="hm" id="hm">${cols.map(c => `<div>${c}</div>`).join('')}</div></div>
    <div class="row" style="justify-content:space-between;margin-top:10px;font-size:12.5px"><span class="muted">${Math.round(total / 60)} Stunden seit September</span><span class="row hm-legend" style="gap:4px"><span class="muted">weniger</span><i class="hm-0"></i><i class="hm-1"></i><i class="hm-2"></i><i class="hm-3"></i><i class="hm-4"></i><span class="muted">mehr</span></span></div></div>`;
}

// ---------- LernHub Wrapped ----------
let W = null;
function wrappedSlides() {
  const s = S(), now = new Date(), y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1, from = `${y}-09-01`;
  const days = Object.entries(s.history || {}).filter(([k, m]) => k >= from && m > 0);
  const mins = days.reduce((a, [, m]) => a + m, 0);
  const wd = [0, 0, 0, 0, 0, 0, 0]; days.forEach(([k, m]) => wd[parseKey(k).getDay()] += m);
  const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'], topWd = wd.indexOf(Math.max(...wd));
  const best = days.sort((a, b) => b[1] - a[1])[0];
  const fav = Object.entries(s.subjMin || {}).map(([id, m]) => ({ s: LH.subj(id), m })).filter(x => x.s).sort((a, b) => b.m - a.m)[0];
  const ans = s.stats.correct + s.stats.wrong, q = ans ? Math.round(s.stats.correct / ans * 100) : 0;
  return [
    { k: 'intro', big: 'Dein Schuljahr', sub: `${y}/${String(y + 1).slice(2)} in LernHub. Tippen zum Weiterblättern.` },
    { k: 'time', pre: 'Du hast gelernt', big: `${Math.round(mins / 60 * 10) / 10} h`, sub: mins ? `an ${days.length} Tagen. Das sind ${Math.max(1, Math.round(mins / 45))} Schulstunden.` : 'Noch nichts – aber das Jahr ist noch lang.' },
    fav && { k: 'fav', pre: 'Dein Lieblingsfach', big: esc(fav.s.name), sub: `${fav.m} Minuten nur dafür.`, color: fav.s.color },
    { k: 'ans', pre: 'Fragen beantwortet', big: ans.toLocaleString('de-AT'), sub: ans ? `${q} % davon richtig.${q >= 80 ? ' Stark.' : ''}` : 'Zeit für das erste Quiz.' },
    { k: 'streak', pre: 'Längste Serie', big: `${s.streak.best || 0} ${(s.streak.best || 0) === 1 ? 'Tag' : 'Tage'}`, sub: (s.streak.best || 0) >= 7 ? 'Am Stück gelernt. Respekt.' : 'Da geht noch mehr.' },
    mins && { k: 'wd', pre: 'Dein Lerntag', big: WD[topWd], sub: best ? `Bester Tag: ${fmtD(best[0])} mit ${best[1]} Minuten.` : '' },
    { k: 'end', pre: `Level ${LH.levelOf ? LH.levelOf(s.xp) : ''}`, big: `${s.xp.toLocaleString('de-AT')} XP`, sub: `${s.badges.length} Abzeichen gesammelt. Weiter so!`, share: true }
  ].filter(Boolean);
}
LH.VIEWS.wrapped = {
  html() {
    W = { i: 0, slides: wrappedSlides() };
    return `<div class="wr" id="wr" tabindex="0"><div class="wr-bars">${W.slides.map(() => '<i><b></b></i>').join('')}</div><div class="wr-slide" id="wr-s"></div>
      <button class="icon-btn wr-x" data-fun="wr-close" aria-label="Schließen">${LH.ICON.x}</button></div>`;
  },
  mount() { wrShow(0); $('#wr')?.focus(); }
};
let wrT = 0;
function wrShow(i) {
  if (!W || !$('#wr-s')) return;
  if (i >= W.slides.length) return LH.go('achievements');
  W.i = Math.max(0, i); const x = W.slides[W.i];
  $('#wr-s').innerHTML = `<div class="wr-c wr-${x.k}" style="${x.color ? `--accent:${x.color}` : ''}">${x.pre ? `<small>${x.pre}</small>` : ''}<b>${x.big}</b><p>${esc(x.sub || '')}</p>${x.share ? '<button class="btn primary" data-fun="wr-share">Als Text kopieren</button>' : ''}</div>`;
  document.querySelectorAll('.wr-bars i').forEach((b, k) => b.className = k < W.i ? 'done' : k === W.i ? 'on' : '');
  clearTimeout(wrT); if (!x.share) wrT = setTimeout(() => LH.current().name === 'wrapped' && wrShow(W.i + 1), 5500);
}
document.addEventListener('click', e => {
  if (LH.current().name !== 'wrapped' || e.target.closest('[data-fun]')) return;
  if (e.target.closest('#wr')) wrShow(W.i + (e.clientX < innerWidth / 3 ? -1 : 1));
});
document.addEventListener('keydown', e => {
  if (LH.current().name !== 'wrapped') return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); wrShow(W.i + 1); }
  if (e.key === 'ArrowLeft') wrShow(W.i - 1);
  if (e.key === 'Escape') LH.go('achievements');
});

// ---------- Werkzeuge: Rechner + Umrechner ----------
const CONV = {
  'Länge': { mm: 1e-3, cm: 1e-2, m: 1, km: 1e3, Zoll: 0.0254, Fuß: 0.3048, Meile: 1609.344 },
  'Zeit': { ms: 1e-3, s: 1, min: 60, h: 3600, Tag: 86400, Woche: 604800 },
  'Geschwindigkeit': { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, Knoten: 0.514444 },
  'Masse': { mg: 1e-6, g: 1e-3, kg: 1, t: 1000, Pfund: 0.45359237 },
  'Energie': { J: 1, kJ: 1e3, Wh: 3600, kWh: 3.6e6, cal: 4.184, kcal: 4184, eV: 1.602176634e-19 },
  'Leistung': { W: 1, kW: 1e3, MW: 1e6, PS: 735.49875 },
  'Daten': { bit: 0.125, Byte: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824 },
  'Temperatur': { '°C': 'C', '°F': 'F', K: 'K' }
};
const toK = (v, u) => u === 'C' ? v + 273.15 : u === 'F' ? (v - 32) * 5 / 9 + 273.15 : v;
const fromK = (v, u) => u === 'C' ? v - 273.15 : u === 'F' ? (v - 273.15) * 9 / 5 + 32 : v;
const PRE = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
const num = v => { if (v === 0) return '0'; const a = Math.abs(v); return (a >= 1e12 || a < 1e-6 ? v.toExponential(6).replace(/\.?0+e/, 'e') : String(+v.toPrecision(10))).replace('.', ','); };
const eng = v => { const a = Math.abs(v); if (!a || (a >= 1 && a < 1000)) return ''; const p = PRE.find(([f]) => a >= f) || PRE[PRE.length - 1]; return `= ${num(+(v / p[0]).toPrecision(6))} ${p[1]}…`; };
let ans = 0, hist = [];
try { hist = JSON.parse(localStorage.getItem('lh_calc') || '[]'); ans = hist[0]?.v || 0; } catch {}
const deg = () => S().settings.calcRad ? false : true;

LH.VIEWS.tools = {
  html() {
    const cat = S().settings.convCat || 'Länge', units = Object.keys(CONV[cat]);
    return `<div class="eyebrow">Werkzeuge</div><h1 class="h1">Werkzeuge</h1>
      <div class="grid-2" style="margin-top:22px;align-items:start">
        <div class="panel pad"><div class="row" style="justify-content:space-between"><b>Rechner</b><div class="seg" role="group" aria-label="Winkel"><button type="button" data-fun="deg" class="${deg() ? 'on' : ''}">DEG</button><button type="button" data-fun="rad" class="${deg() ? '' : 'on'}">RAD</button></div></div>
          <form id="calc-f" class="type-in" style="margin-top:12px"><input class="input mono" id="calc-in" placeholder="z. B. 5 mA · 2,2 kΩ" autocomplete="off" spellcheck="false"><button class="btn primary">=</button></form>
          <div class="calc-out" id="calc-out"><span class="muted">Einheiten-Vorsilben gehen direkt: mA, kΩ, µF, ms, MHz. „ans“ ist das letzte Ergebnis.</span></div>
          <div class="calc-hist" id="calc-hist">${histHtml()}</div></div>
        <div class="panel pad"><b>Umrechner</b>
          <div class="field" style="margin-top:12px"><select class="input" id="conv-cat">${Object.keys(CONV).map(c => `<option ${c === cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="conv-row"><input class="input mono" id="conv-v" value="1" inputmode="decimal"><select class="input" id="conv-a">${units.map((u, i) => `<option ${i === 0 ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
          <div class="conv-row"><output class="input mono" id="conv-r"></output><select class="input" id="conv-b">${units.map((u, i) => `<option ${i === Math.min(1, units.length - 1) ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
          <button class="btn sm ghost" data-fun="swap" style="margin-top:8px">⇅ Tauschen</button></div>
      </div>
      ${LH.more?.soundsPanel() || ''}
      <h2 class="h2">Mehr</h2>
      <div class="more-list tools-list">
        <button class="more-item" data-fun="holidays"><b>Ferien & freie Tage</b><small>Countdown und alle schulfreien Tage</small></button>
        <button class="more-item" data-go="wrapped"><b>Dein Rückblick</b><small>Das Schuljahr in LernHub als Story</small></button>
        <button class="more-item" data-mx="search"><b>Alles durchsuchen</b><small>Karten, Lernzettel, Formeln, Vokabeln, Notizen · Strg+K</small></button>
        <button class="more-item" data-mx="ics"><b>Kalender-Export</b><small>Tests und HÜs als .ics für Google Kalender oder Handy</small></button>
        <button class="more-item" data-fun="duel"><b>Lern-Duell</b><small>Mitschüler herausfordern oder Duell-Link öffnen</small></button>
        ${LH.IS_DESKTOP && LH.API?.widget ? '<button class="more-item" data-fun="widget"><b>Mini-Widget</b><small>Kleines Fenster immer im Vordergrund: nächste Stunde, Test, Lernzeit</small></button>' : ''}
      </div>`;
  },
  mount() { conv(); $('#calc-in')?.focus(); }
};
function histHtml() { return hist.slice(0, 8).map(h => `<button class="calc-h" data-fun="hist" data-e="${esc(h.e)}"><span>${esc(h.e)}</span><b class="mono">${num(h.v)}</b></button>`).join(''); }
function runCalc() {
  const inp = $('#calc-in'), e = inp.value.trim(); if (!e) return;
  try {
    const v = window.LHFormula.calc(e, { deg: deg(), ans });
    ans = v; hist = [{ e, v }, ...hist.filter(h => h.e !== e)].slice(0, 20);
    try { localStorage.setItem('lh_calc', JSON.stringify(hist)); } catch {}
    $('#calc-out').innerHTML = `<b class="mono calc-v">${num(v)}</b> <span class="muted mono">${eng(v)}</span>`;
    $('#calc-hist').innerHTML = histHtml(); inp.select();
  } catch (err) { $('#calc-out').innerHTML = `<span style="color:var(--bad)">${esc(err.message)}</span>`; }
}
function conv() {
  const cat = $('#conv-cat')?.value; if (!cat) return;
  const T = CONV[cat], a = $('#conv-a').value, b = $('#conv-b').value, v = parseFloat(String($('#conv-v').value).replace(',', '.'));
  if (!isFinite(v)) { $('#conv-r').textContent = '–'; return; }
  const r = cat === 'Temperatur' ? fromK(toK(v, T[a]), T[b]) : v * T[a] / T[b];
  $('#conv-r').textContent = num(r);
}
document.addEventListener('submit', e => { if (e.target.id === 'calc-f') { e.preventDefault(); runCalc(); } });
document.addEventListener('input', e => { if (['conv-v'].includes(e.target.id)) conv(); });
document.addEventListener('change', e => {
  if (e.target.id === 'conv-cat') { S().settings.convCat = e.target.value; LH.save(); LH.rerender(); }
  if (['conv-a', 'conv-b'].includes(e.target.id)) conv();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fun]'); if (!b) return;
  const a = b.dataset.fun;
  if (a === 'holidays') holidayModal();
  if (a === 'deg' || a === 'rad') { S().settings.calcRad = a === 'rad'; LH.save(); document.querySelectorAll('[data-fun="deg"],[data-fun="rad"]').forEach(x => x.classList.toggle('on', x === b)); }
  if (a === 'hist') { const i = $('#calc-in'); i.value = b.dataset.e; i.focus(); }
  if (a === 'swap') { const x = $('#conv-a'), y = $('#conv-b'), t = x.value; x.value = y.value; y.value = t; conv(); }
  if (a === 'wr-close') LH.go('achievements');
  if (a === 'wr-share') {
    const txt = W.slides.filter(x => x.big && x.k !== 'intro').map(x => `${x.pre ? x.pre + ': ' : ''}${String(x.big).replace(/<[^>]+>/g, '')}`).join('\n');
    navigator.clipboard?.writeText(`Mein Schuljahr in LernHub\n${txt}`).then(() => LH.toast('KOPIERT', 'Rückblick kopiert', 'Zum Einfügen in WhatsApp & Co.'), () => {});
  }
  if (a === 'widget') LH.API.widget.toggle();
  if (a === 'duel') LH.duel?.open();
});

LH.fun = { holidayCard, heatmap, holidays, rules, easter };
})();

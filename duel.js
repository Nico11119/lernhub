// ===================== LernHub – Lern-Duell per Link =====================
// Alles steckt im Link (#duell=…): 10 Fragen + die bisherigen Ergebnisse. Kein Server, der Teil nach # wird nie übertragen.
(() => {
'use strict';
const LH = window.LH, { $, esc } = LH;
const S = () => LH.S;
const WEB = 'https://nico11119.github.io/lernhub/';

// ---------- Kodieren: JSON → deflate → base64url ----------
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function encode(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  return window.CompressionStream ? 'z' + b64(await pipe(raw, new CompressionStream('deflate-raw'))) : 'j' + b64(raw);
}
async function decode(code) {
  code = String(code || '').trim().replace(/^.*#duell=/, '');
  let d;
  try { const raw = unb64(code.slice(1)), bytes = code[0] === 'z' ? await pipe(raw, new DecompressionStream('deflate-raw')) : raw; d = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('Das ist kein gültiger Duell-Link – bitte den ganzen Link einfügen'); }
  if (d?.v !== 1 || !Array.isArray(d.q) || !d.q.length || d.q.length > 20) throw new Error('Das ist kein gültiger Duell-Link');
  d.q = d.q.map(x => ({ q: String(x.q).slice(0, 400), o: (x.o || []).slice(0, 4).map(o => String(o).slice(0, 200)), a: Math.max(0, Math.min(3, x.a | 0)) }));
  d.r = (Array.isArray(d.r) ? d.r : []).slice(0, 8).map(r => ({ n: String(r.n || 'Jemand').slice(0, 30), c: r.c | 0, t: r.t | 0 }));
  d.s = String(d.s || 'Duell').slice(0, 40);
  return d;
}
const link = code => `${WEB}#duell=${code}`;

// ---------- Duell anlegen ----------
function make(sid) {
  const s = LH.subj(sid), cards = LH.shuffle(LH.cardsOf(sid).slice()).slice(0, 10), all = LH.cardsOf(sid).map(c => c.a);
  const q = cards.map(c => {
    const opts = LH.shuffle([c.a, ...LH.quizWrong(c, LH.shuffle(all.slice()))].slice(0, 4));
    return { q: c.q, o: opts, a: opts.indexOf(c.a) };
  }).filter(x => x.o.length >= 2);
  return { v: 1, s: s.name, q, r: [] };
}
function open() {
  const subs = S().subjects.filter(s => LH.cardsOf(s.id).length >= 4);
  LH.openModal(`<h3>Lern-Duell</h3><p class="lede">Du spielst 10 Fragen, dann schickst du den Link an einen Mitschüler. Er spielt dieselben Fragen – wer mehr richtig hat (bei Gleichstand: wer schneller war), gewinnt.</p>
    ${subs.length ? `<div class="field" style="margin-top:14px"><label>Fach</label><select class="input" id="du-s">${subs.map(s => `<option value="${s.id}">${esc(s.name)} · ${LH.cardsOf(s.id).length} Karten</option>`).join('')}</select></div>
    <button class="btn primary" id="du-new" style="margin-top:10px">Duell starten</button>` : '<p class="muted" style="margin-top:12px">Du brauchst ein Fach mit mindestens 4 Karten.</p>'}
    <hr style="margin:18px 0"><div class="field"><label>Link oder Code von einem Mitschüler</label><textarea class="input mono" id="du-code" rows="3" placeholder="https://nico11119.github.io/lernhub/#duell=…"></textarea></div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-x>Abbrechen</button><button class="btn" id="du-open">Öffnen</button></div>`, (bg, close) => {
    bg.querySelector('[data-x]').onclick = close;
    bg.querySelector('#du-new')?.addEventListener('click', () => { const d = make(bg.querySelector('#du-s').value); close(); start(d); });
    bg.querySelector('#du-open').onclick = async () => {
      try { const d = await decode(bg.querySelector('#du-code').value); close(); start(d); }
      catch (e) { LH.toast('DUELL', 'Link geht nicht', e.message || 'Bitte den ganzen Link einfügen'); }
    };
  });
}

// ---------- Spielen ----------
let D = null;
const me = () => LH.userName() || 'Ich';
const played = d => d.r.some(r => r.n === me());
function start(d) { D = { d, i: 0, c: 0, t0: 0, done: played(d), pick: null }; LH.go('duel'); }
const fmtT = ms => `${Math.round(ms / 100) / 10} s`.replace('.', ',');
const rank = r => r.slice().sort((a, b) => b.c - a.c || a.t - b.t);

LH.VIEWS.duel = {
  html() {
    if (!D) return '<div class="panel empty"><b>Kein Duell offen</b><button class="btn primary" data-du="new" style="margin-top:12px">Duell starten</button></div>';
    const { d } = D, n = d.q.length;
    const head = `<button class="back" data-go="tools">← Werkzeuge</button><div class="eyebrow" style="margin-top:6px"><span class="dot"></span>Lern-Duell · ${esc(d.s)} · ${n} Fragen</div>`;
    if (D.done) {
      const list = rank(d.r), win = list[0];
      return `${head}<h1 class="h1">${list.length > 1 ? (win.n === me() ? 'Gewonnen!' : `${esc(win.n)} gewinnt`) : 'Deine Runde'}</h1>
        <div class="panel pad du-board">${list.map((r, k) => `<div class="du-r ${r.n === me() ? 'me' : ''}"><span class="mono">${k + 1}.</span><b>${esc(r.n)}</b><span class="mono">${r.c}/${n}</span><span class="mono muted">${fmtT(r.t)}</span></div>`).join('')}</div>
        <div class="row" style="margin-top:16px;flex-wrap:wrap"><button class="btn primary" data-du="share">${list.length > 1 ? 'Ergebnis zurückschicken' : 'Mitschüler herausfordern'}</button><button class="btn ghost" data-du="copy">Link kopieren</button><button class="btn ghost" data-du="new">Neues Duell</button></div>
        <p class="muted" style="font-size:12.5px;margin-top:10px">Der Link enthält die Fragen und alle Ergebnisse. Wer ihn öffnet, spielt dieselben Fragen im Browser oder in LernHub.</p>`;
    }
    if (!D.t0) {
      const others = rank(d.r);
      return `${head}<h1 class="h1">${others.length ? `${esc(others[0].n)} fordert dich heraus` : 'Bereit?'}</h1>
        <div class="panel pad" style="max-width:560px">${others.length ? `<p class="lede">${esc(others[0].n)} hat <b>${others[0].c} von ${n}</b> in ${fmtT(others[0].t)} geschafft.</p>` : `<p class="lede">${n} Fragen aus ${esc(d.s)}. Die Zeit läuft ab der ersten Frage.</p>`}
        <button class="btn primary lg" data-du="go" style="margin-top:14px">Los geht's</button></div>`;
    }
    const x = d.q[D.i];
    return `${head}<div class="session" style="margin-top:14px"><div class="sess-top"><span class="chip mono" id="du-t">0 s</span><div class="meter" id="du-m" style="--n:30;--h:6px"></div><span class="count mono">${D.i + 1}/${n}</span></div>
      <div class="panel quiz-q screws"><div class="q">${esc(x.q)}</div></div>
      <div class="opts">${x.o.map((o, k) => `<button class="opt" data-du="pick" data-k="${k}"><span class="kbd">${k + 1}</span>${esc(o)}</button>`).join('')}</div></div>`;
  },
  mount() {
    LH.setMeter($('#du-m'), D ? D.i / D.d.q.length * 100 : 0);
    clearInterval(D?.tick); if (D?.t0 && !D.done) D.tick = setInterval(() => { const t = $('#du-t'); if (!t) return clearInterval(D.tick); t.textContent = `${Math.floor((Date.now() - D.t0) / 1000)} s`; }, 250);
  }
};
function pick(k, btn) {
  if (D.pick != null) return; D.pick = k;
  const x = D.d.q[D.i], ok = k === x.a;
  if (ok) { D.c++; S().stats.correct++; } else S().stats.wrong++;
  LH.emit('answer', { ok, mode: 'duel' });
  document.querySelectorAll('.opt').forEach((b, j) => b.classList.add(j === x.a ? 'right' : j === k ? 'wrong' : 'dim'));
  setTimeout(() => {
    D.pick = null; D.i++;
    if (D.i >= D.d.q.length) {
      const t = Date.now() - D.t0; clearInterval(D.tick);
      D.d.r = [...D.d.r.filter(r => r.n !== me()), { n: me(), c: D.c, t }]; D.done = true;
      LH.addXP(5 + D.c * 2, btn, true); LH.addCoins(D.c);
      const best = rank(D.d.r)[0]; if (D.d.r.length > 1 && best.n === me()) LH.confetti(160);
      LH.save();
    }
    LH.rerender();
  }, ok ? 450 : 1100);
}
async function share(copyOnly) {
  const url = link(await encode(D.d));
  if (!copyOnly && navigator.share && LH.IS_MOBILE) { try { await navigator.share({ title: 'LernHub-Duell', text: `Duell in ${D.d.s} – schaffst du mehr?`, url }); return; } catch {} }
  try { await navigator.clipboard.writeText(url); LH.toast('DUELL', 'Link kopiert', 'In WhatsApp, Teams oder Discord einfügen'); }
  catch { LH.openModal(`<h3>Duell-Link</h3><textarea class="input mono" rows="5" readonly>${esc(url)}</textarea><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" data-x>OK</button></div>`, (bg, close) => bg.querySelector('[data-x]').onclick = close); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-du]'); if (!b) return;
  const a = b.dataset.du;
  if (a === 'new') open();
  if (a === 'go') { D.t0 = Date.now(); LH.rerender(); }
  if (a === 'pick') pick(+b.dataset.k, b);
  if (a === 'share') share(false);
  if (a === 'copy') share(true);
});
document.addEventListener('keydown', e => {
  if (LH.current().name !== 'duel' || !D?.t0 || D.done || $('.modal-bg')) return;
  const k = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
  if (k != null && k < D.d.q[D.i].o.length) pick(k, document.querySelectorAll('.opt')[k]);
});
// Web-App: Duell-Link direkt geöffnet
async function fromHash() {
  if (!location.hash.startsWith('#duell=')) return;
  try { const d = await decode(location.hash); history.replaceState(null, '', location.pathname); start(d); }
  catch (err) { LH.toast('DUELL', 'Link geht nicht', err.message); }
}
LH.on('booted', fromHash);
addEventListener('hashchange', fromHash);

LH.duel = { open, encode, decode };
})();

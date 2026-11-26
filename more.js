// ===================== LernHub – Schnellsuche, Frage des Tages, Sounds, Notizen, Lernblatt, Kalender =====================
(() => {
'use strict';
const LH = window.LH, { $, esc, norm, dkey } = LH;
const S = () => LH.S;

// ---------- Schnellsuche (Strg+K) ----------
const PAGES = [['home', 'Start'], ['timetable', 'Stundenplan'], ['subjects', 'Fächer'], ['plan', 'Plan'], ['school', 'Schule & Noten'], ['mistakes', 'Fehlerheft'], ['achievements', 'Erfolge'], ['shop', 'Shop'], ['break', 'Pause & Spiele'], ['tools', 'Werkzeuge · Rechner'], ['wrapped', 'Dein Rückblick']];
const ACTS = [['duel', 'Lern-Duell starten'], ['ics', 'Termine in den Kalender exportieren'], ['snd:rain', 'Sound: Regen'], ['snd:brown', 'Sound: Rauschen'], ['snd:waves', 'Sound: Wellen'], ['snd:off', 'Sound aus'], ['settings', 'Optionen']];
function index() {
  const out = [];
  PAGES.forEach(([v, n]) => out.push({ t: 'Seite', n, go: () => LH.go(v) }));
  ACTS.forEach(([a, n]) => out.push({ t: 'Aktion', n, go: () => act(a) }));
  for (const s of S().subjects) {
    out.push({ t: 'Fach', n: s.name, c: s.color, go: () => LH.go('subject', { sid: s.id }) });
    for (const t of s.topics) {
      out.push({ t: 'Lernzettel', n: t.name, sub: s.name, c: s.color, x: (t.summary || []).join(' '), go: () => openTopic(s.id, t.id) });
      for (const c of t.cards) out.push({ t: 'Karte', n: c.q, sub: c.a, c: s.color, go: () => openTopic(s.id, t.id) });
    }
    for (const f of s.formulas || []) out.push({ t: 'Formel', n: f.name || window.LHFormula?.pretty(f.f), sub: window.LHFormula?.pretty(f.f) || f.f, c: s.color, go: () => LH.go('subject', { sid: s.id }) });
    for (const l of s.vocab || []) for (const w of l.words) out.push({ t: 'Vokabel', n: w.a, sub: w.b, c: s.color, go: () => LH.go('vocab', { sid: s.id, lid: l.id, mode: 'read' }) });
    if (s.notes) s.notes.split(/\n+/).filter(Boolean).forEach(line => out.push({ t: 'Notiz', n: line, sub: s.name, c: s.color, go: () => LH.go('subject', { sid: s.id }) }));
  }
  for (const x of S().tests) out.push({ t: 'Test', n: x.title, sub: `${LH.subj(x.subjectId)?.name || ''} · ${LH.fmtDay(x.date)}`, go: () => LH.go('plan') });
  return out;
}
function openTopic(sid, tid) {
  LH.go('subject', { sid });
  let n = 0; const tryOpen = () => { const el = document.querySelector(`.topic[data-tid="${tid}"]`); if (el) { el.classList.add('open'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } else if (n++ < 30) setTimeout(tryOpen, 50); };
  setTimeout(tryOpen, 50);
}
function search(q, all) {
  const n = norm(q); if (!n) return all.filter(x => x.t === 'Seite' || x.t === 'Aktion').slice(0, 14);
  const words = n.split(/\s+/);
  return all.map(x => {
    const hay = norm(`${x.n} ${x.sub || ''} ${x.x || ''}`), name = norm(x.n);
    if (!words.every(w => hay.includes(w))) return null;
    return { x, score: (name.startsWith(n) ? 0 : name.includes(n) ? 1 : 2) + ({ Seite: 0, Aktion: 0, Fach: 0, Lernzettel: .3, Formel: .4, Test: .4, Karte: .6, Vokabel: .6, Notiz: .7 }[x.t] || 1) };
  }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, 30).map(r => r.x);
}
function palette() {
  if ($('.modal-bg .pal')) return;
  document.querySelectorAll('.modal-bg').forEach(m => m.close?.()); // z. B. das „Mehr“-Menü am Handy
  const all = index();
  let res = [], sel = 0;
  LH.openModal(`<div class="pal"><input class="input pal-in" id="pal-in" placeholder="Suchen: Karten, Lernzettel, Formeln, Vokabeln, Seiten …" autocomplete="off" spellcheck="false"><div class="pal-res" id="pal-res" role="listbox"></div><small class="muted pal-hint">↑ ↓ auswählen · Enter öffnen · Esc schließen</small></div>`, (bg, close) => {
    bg.querySelector('.modal').classList.add('pal-modal');
    const inp = bg.querySelector('#pal-in'), box = bg.querySelector('#pal-res');
    const draw = () => {
      res = search(inp.value, all); sel = Math.min(sel, Math.max(0, res.length - 1));
      box.innerHTML = res.map((x, i) => `<button class="pal-i ${i === sel ? 'on' : ''}" data-i="${i}" role="option" style="--accent:${x.c || 'var(--signal)'}"><span class="pal-t">${x.t}</span><span class="pal-n">${esc(x.n)}</span>${x.sub ? `<small>${esc(String(x.sub).slice(0, 80))}</small>` : ''}</button>`).join('') || '<p class="muted" style="padding:12px">Nichts gefunden.</p>';
      box.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
    };
    const pick = i => { const x = res[i]; if (!x) return; close(); x.go(); };
    inp.addEventListener('input', () => { sel = 0; draw(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(res.length - 1, sel + 1); draw(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
      if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
    });
    box.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); });
    draw();
  });
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); }
});

// ---------- Frage des Tages ----------
function dailyCard() {
  const all = LH.cardsOf(); if (!all.length) return '';
  const d = S().daily?.day === dkey() ? S().daily : null;
  let card = d && all.find(c => c.id === d.cid);
  if (!card) {
    const pool = LH.modes?.due().length ? LH.modes.due() : all.slice().sort((a, b) => LH.cs(a.id).box - LH.cs(b.id).box).slice(0, 40);
    const seed = [...dkey()].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7);
    card = pool[Math.abs(seed) % pool.length];
    S().daily = { day: dkey(), cid: card.id, done: false };
  }
  const s = LH.subj(card.sid), dd = S().daily;
  return `<div class="panel pad daily" style="margin-top:16px;--accent:${s?.color || 'var(--signal)'}" id="daily">
    <div class="eyebrow"><span class="dot"></span>Frage des Tages · ${esc(s?.name || '')}</div>
    <div class="daily-q">${esc(card.q)}</div>
    ${dd.done ? `<div class="daily-a">${esc(card.a)}</div><small class="muted">${dd.ok ? '✓ Gewusst.' : 'Morgen klappt es.'} Die nächste Frage gibt es morgen.</small>`
      : `<div class="daily-a" id="daily-a" hidden>${esc(card.a)}</div><div class="row" id="daily-btns" style="margin-top:10px"><button class="btn sm" data-mx="daily-show">Antwort zeigen</button></div>`}
  </div>`;
}

// ---------- Konzentrations-Sounds (im Browser erzeugt, nichts wird geladen) ----------
let A = null;
const SOUNDS = { rain: 'Regen', brown: 'Rauschen', waves: 'Wellen' };
function noise(ctx, kind) {
  const len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'rain') { b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .18; } // rosa
    else { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } // braun
  }
  return b;
}
function sound(kind) {
  stopSound(true);
  if (!kind || !SOUNDS[kind]) return;
  const ctx = new AudioContext(), src = ctx.createBufferSource(), out = ctx.createGain(), vol = S().settings.soundVol ?? .5;
  src.buffer = noise(ctx, kind); src.loop = true;
  let node = src;
  const f = (type, freq) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = freq; node.connect(x); node = x; };
  if (kind === 'rain') { f('highpass', 350); f('lowpass', 7000); }
  else f('lowpass', kind === 'waves' ? 700 : 1100);
  if (kind === 'waves') { // langsames An- und Abschwellen wie Brandung
    const g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
    g.gain.value = .55; lfo.frequency.value = .09; depth.gain.value = .45; lfo.connect(depth).connect(g.gain); lfo.start();
    node.connect(g); node = g;
  }
  node.connect(out).connect(ctx.destination);
  out.gain.setValueAtTime(0, ctx.currentTime); out.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.5);
  src.start();
  A = { ctx, out, kind };
  chip();
}
function stopSound(quick) {
  if (!A) return; const a = A; A = null;
  try { a.out.gain.cancelScheduledValues(a.ctx.currentTime); a.out.gain.linearRampToValueAtTime(0, a.ctx.currentTime + (quick ? .05 : .6)); } catch {}
  setTimeout(() => a.ctx.close(), quick ? 80 : 700);
  chip();
}
function chip() {
  $('#snd-chip')?.remove();
  if (!A) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="snd-chip" id="snd-chip"><span>♪ ${SOUNDS[A.kind]}</span><input type="range" min="0" max="1" step="0.05" value="${S().settings.soundVol ?? .5}" id="snd-vol" aria-label="Lautstärke"><button class="icon-btn" data-mx="snd-off" aria-label="Sound aus">${LH.ICON.x}</button></div>`);
}
document.addEventListener('input', e => {
  if (e.target.id === 'snd-vol' && A) { const v = +e.target.value; S().settings.soundVol = v; A.out.gain.setTargetAtTime(v, A.ctx.currentTime, .1); clearTimeout(chip.t); chip.t = setTimeout(LH.save, 800); }
});
function soundsPanel() {
  return `<div class="panel pad" style="margin-top:14px"><b>Konzentrations-Sounds</b><p class="muted" style="font-size:13px;margin:4px 0 10px">Werden direkt erzeugt, kein Download. Laufen weiter, bis du sie ausschaltest.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap">${Object.entries(SOUNDS).map(([k, n]) => `<button class="btn sm ${A?.kind === k ? 'primary' : ''}" data-mx="snd:${k}">${n}</button>`).join('')}<button class="btn sm ghost" data-mx="snd:off">Aus</button></div></div>`;
}

// ---------- Notizen pro Fach ----------
function notesSection(s) {
  return `<h2 class="h2">Notizen</h2><div class="panel pad"><textarea class="input notes-in" data-sid="${s.id}" rows="4" placeholder="Was der Lehrer gesagt hat, Seitenzahlen, Merksätze, Abgabetermine …">${esc(s.notes || '')}</textarea>
    <div class="row" style="justify-content:space-between;margin-top:6px"><small class="muted" id="notes-st">Speichert automatisch</small><span class="row" style="gap:6px">${LH.CAN_AI ? `<button class="btn sm ghost" data-mx2="notes-cards" data-sid="${s.id}">Karten daraus machen</button>` : ''}<button class="btn sm ghost" data-mx="print" data-sid="${s.id}">Lernblatt drucken</button></span></div></div>`;
}
let noteT = 0;
document.addEventListener('input', e => {
  if (!e.target.matches('.notes-in')) return;
  const s = LH.subj(e.target.dataset.sid); if (!s) return;
  s.notes = e.target.value.slice(0, 20000);
  const st = $('#notes-st'); if (st) st.textContent = 'Wird gespeichert …';
  clearTimeout(noteT); noteT = setTimeout(() => { LH.save(); const x = $('#notes-st'); if (x) x.textContent = 'Gespeichert'; }, 700);
});

// ---------- Lernblatt drucken ----------
function printSheet(sid) {
  const s = LH.subj(sid); if (!s) return;
  if (window.Capacitor?.isNativePlatform?.()) return LH.toast('DRUCKEN', 'Geht in der Handy-App nicht', 'Am Laptop oder in der Web-App im Browser drucken');
  const P = window.LHFormula?.pretty || (x => x);
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(s.name)} – Lernblatt</title><style>
    @page { size: A4; margin: 14mm; } body { font: 10.5pt/1.4 system-ui, "Segoe UI", sans-serif; color: #111; }
    h1 { font-size: 20pt; margin: 0; border-bottom: 3px solid ${s.color}; padding-bottom: 4px; } .sub { color: #666; margin: 4px 0 14px; }
    h2 { font-size: 12.5pt; margin: 16px 0 6px; color: ${s.color}; break-after: avoid; } ul { margin: 0 0 6px 18px; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; } td { border-bottom: 1px solid #ddd; padding: 3px 6px 3px 0; vertical-align: top; } td:first-child { width: 48%; font-weight: 600; }
    .f td:last-child { font-family: Consolas, monospace; } .notes { white-space: pre-wrap; border-left: 3px solid #ccc; padding-left: 8px; }
    tr { break-inside: avoid; }</style></head><body>
    <h1>${esc(s.name)}</h1><div class="sub">Lernblatt · ${new Date().toLocaleDateString('de-AT')} · ${LH.cardsOf(s.id).length} Karten</div>
    ${(s.formulas || []).length ? `<h2>Formeln</h2><table class="f">${s.formulas.map(f => `<tr><td>${esc(f.name || '')}</td><td>${esc(P(f.f))}${f.note ? `<br><span style="font-family:system-ui;color:#666">${esc(f.note)}</span>` : ''}</td></tr>`).join('')}</table>` : ''}
    ${s.topics.map(t => `<h2>${esc(t.name)}</h2>${(t.summary || []).length ? `<ul>${t.summary.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${t.cards.length ? `<table>${t.cards.map(c => `<tr><td>${esc(c.q)}</td><td>${esc(c.a)}</td></tr>`).join('')}</table>` : ''}`).join('')}
    ${(s.vocab || []).map(l => `<h2>Vokabeln · ${esc(l.name)}</h2><table>${l.words.map(w => `<tr><td>${esc(w.a)}</td><td>${esc(w.b)}</td></tr>`).join('')}</table>`).join('')}
    ${s.notes ? `<h2>Notizen</h2><div class="notes">${esc(s.notes)}</div>` : ''}
    </body></html>`;
  document.getElementById('print-frame')?.remove();
  const f = document.createElement('iframe'); f.id = 'print-frame'; f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  f.srcdoc = html; document.body.appendChild(f);
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { LH.toast('DRUCKEN', 'Drucken ging nicht', ''); } };
}

// ---------- Kalender-Export ----------
const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
const icsDate = k => k.replace(/-/g, '');
function exportIcs() {
  const ev = [];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const add = (id, k, title) => { const end = dkey(LH.addDays(LH.parseKey(k), 1)); ev.push(['BEGIN:VEVENT', `UID:${id}@lernhub`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${icsDate(k)}`, `DTEND;VALUE=DATE:${icsDate(end)}`, `SUMMARY:${icsEsc(title)}`, 'END:VEVENT'].join('\r\n')); };
  for (const t of S().tests) if (t.date >= dkey()) add(t.id, t.date, `📝 ${t.title} (${LH.subj(t.subjectId)?.name || ''})`);
  for (const h of S().homework || []) if (!h.done && h.due >= dkey()) add(h.id, h.due, `HÜ: ${h.title}`);
  if (!ev.length) return LH.toast('KALENDER', 'Keine kommenden Termine', 'Trag zuerst Tests oder HÜs ein');
  const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LernHub//DE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:LernHub', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
  const name = 'LernHub-Termine.ics';
  if (LH.API?.files?.saveText) return LH.API.files.saveText({ name, text, title: 'Termine exportieren' }).then(p => p && LH.toast('KALENDER', `${ev.length} Termine exportiert`, 'Datei in Google Kalender, Outlook oder am Handy öffnen'));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

// ---------- Klicks ----------
function act(a) {
  if (a === 'duel') LH.duel?.open();
  if (a === 'ics') exportIcs();
  if (a === 'settings') LH.openSettings();
  if (a.startsWith('snd:')) a === 'snd:off' ? stopSound() : sound(a.slice(4));
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-mx]'); if (!b) return;
  const a = b.dataset.mx;
  if (a === 'search') palette();
  if (a === 'print') printSheet(b.dataset.sid);
  if (a === 'snd-off') stopSound();
  if (a === 'daily-show') { $('#daily-a').hidden = false; $('#daily-btns').innerHTML = '<button class="btn sm ghost" data-mx="daily-no">Nicht gewusst</button><button class="btn sm primary" data-mx="daily-ok">Gewusst</button>'; }
  if (a === 'daily-ok' || a === 'daily-no') {
    const ok = a === 'daily-ok', card = LH.cardsOf().find(c => c.id === S().daily?.cid); if (!card || S().daily.done) return;
    S().daily.done = true; S().daily.ok = ok;
    LH.grade(card, ok, 'daily', b); if (ok) LH.addXP(10, b, true);
    const box = $('#daily'); if (box) box.outerHTML = dailyCard();
  }
  if (['ics', 'duel', 'settings'].includes(a) || a.startsWith('snd:')) { act(a); if (a.startsWith('snd:') && LH.current().name === 'tools') LH.rerender(); }
});

LH.more = { palette, dailyCard, notesSection, printSheet, exportIcs, soundsPanel, sound, stopSound };
})();

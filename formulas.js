// ===================== LernHub – Formellerner =====================
// subject.formulas = [{ id, name, f, note }]. Geprüft wird mit formula-core.js (rechnet nach, Umstellen zählt als richtig).
(() => {
'use strict';
const LH = window.LH, { $, esc } = LH, FX = window.LHFormula;
const S = () => LH.S;
const listOf = sid => LH.subj(sid)?.formulas || [];
const show = f => esc(FX.pretty(f));

// ---------- Bereich im Fach ----------
function section(s) {
  if (LH.vocab?.isLang(s) && !(s.formulas || []).length) return '';
  const list = s.formulas || [];
  return `<h2 class="h2">Formeln <span class="mono">${list.length}</span></h2>
    <div class="panel pad fx-box">
      ${list.map(f => `<div class="fx-row"><div class="t"><b>${esc(f.name || 'Formel')}</b><code>${show(f.f)}</code>${f.note ? `<small>${esc(f.note)}</small>` : ''}</div>
        <div class="row" style="gap:4px"><button class="icon-btn" data-fx="edit" data-sid="${s.id}" data-id="${f.id}" aria-label="Formel bearbeiten">${LH.ICON.edit}</button><button class="icon-btn danger" data-fx="del" data-sid="${s.id}" data-id="${f.id}" aria-label="Formel löschen">${LH.ICON.trash}</button></div></div>`).join('')
      || '<p class="muted">Trag die Formeln ein, die du für den Test brauchst. LernHub fragt sie dann ab und rechnet nach, ob deine Antwort stimmt – auch wenn du sie umgestellt hast.</p>'}
      <div class="row" style="margin-top:12px"><button class="btn sm" data-fx="add" data-sid="${s.id}">+ Formel</button><button class="btn sm ghost" data-fx="paste" data-sid="${s.id}">${LH.ICON.text}Liste einfügen</button>${LH.CAN_AI && s.topics.length ? `<button class="btn sm ghost" data-fx="ai" data-sid="${s.id}" title="JARVIS sucht die Formeln aus deinen Lernzetteln heraus">Aus Lernzetteln holen</button>` : ''}${list.length ? `<button class="btn sm primary" data-fx="quiz" data-sid="${s.id}">Formeln üben</button>` : ''}</div>
    </div>`;
}
function formModal(s, f) {
  LH.openModal(`<h3>${f ? 'Formel bearbeiten' : 'Neue Formel'}</h3>
    <form id="fxf" style="display:flex;flex-direction:column;gap:14px;margin-top:14px">
      <div class="field"><label>Name</label><input class="input" name="name" value="${esc(f?.name || '')}" placeholder="z. B. Ohmsches Gesetz" maxlength="60"></div>
      <div class="field"><label>Formel</label><input class="input mono" name="f" value="${esc(f?.f || '')}" placeholder="U = R · I" autocomplete="off" spellcheck="false" required><small class="muted" id="fxf-p" style="min-height:18px"></small></div>
      <div class="field"><label>Was bedeuten die Größen? (optional)</label><input class="input" name="note" value="${esc(f?.note || '')}" placeholder="U Spannung, R Widerstand, I Strom" maxlength="140"></div>
      <p class="muted" style="font-size:12.5px;margin:0">Mal mit · oder * oder Leerzeichen (R I), hoch mit ^ oder ², Wurzel mit √ oder sqrt(), Indizes mit _ (R_ges, U_0).</p>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-x>Abbrechen</button><button class="btn primary">Speichern</button></div>
    </form>`, (bg, close) => {
    const inp = bg.querySelector('[name=f]'), p = bg.querySelector('#fxf-p');
    const prev = () => { try { const r = FX.parse(inp.value); p.textContent = r.lhs ? FX.pretty(inp.value) : 'Es fehlt das „=“'; p.style.color = r.lhs ? '' : 'var(--bad)'; } catch (e) { p.textContent = inp.value.trim() ? e.message : ''; p.style.color = 'var(--bad)'; } };
    inp.oninput = prev; prev();
    bg.querySelector('[data-x]').onclick = close;
    bg.querySelector('#fxf').onsubmit = e => {
      e.preventDefault(); const t = e.target;
      try { if (!FX.parse(t.f.value).lhs) return inp.focus(); } catch { return inp.focus(); }
      const data = { name: t.name.value.trim(), f: t.f.value.trim(), note: t.note.value.trim() };
      if (f) Object.assign(f, data); else (s.formulas ||= []).push({ id: LH.uid('fx'), ...data });
      LH.save(); close(); LH.rerender();
    };
  });
}
// „Ohmsches Gesetz: U = R·I“ oder nur „U = R·I“, eine pro Zeile
function pasteModal(s) {
  LH.openModal(`<h3>Formeln einfügen</h3><p class="lede">Eine Formel pro Zeile, Name davor mit Doppelpunkt (optional).</p>
    <form id="fxp" style="margin-top:14px"><textarea class="input mono" name="t" rows="8" placeholder="Ohmsches Gesetz: U = R · I&#10;Leistung: P = U · I&#10;A = π · r²"></textarea>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button type="button" class="btn ghost" data-x>Abbrechen</button><button class="btn primary">Übernehmen</button></div></form>`, (bg, close) => {
    bg.querySelector('[data-x]').onclick = close;
    bg.querySelector('#fxp').onsubmit = e => {
      e.preventDefault(); let n = 0; const bad = [];
      for (const line of e.target.t.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
        const m = /^([^=:]{2,60}):\s*(.+=.+)$/.exec(line), name = m ? m[1].trim() : '', f = (m ? m[2] : line).trim();
        try { if (!FX.parse(f).lhs) throw 0; (s.formulas ||= []).push({ id: LH.uid('fx'), name, f, note: '' }); n++; } catch { bad.push(line); }
      }
      LH.save(); close(); LH.rerender();
      LH.toast('FORMELN', `${n} ${n === 1 ? 'Formel' : 'Formeln'} übernommen`, bad.length ? `Nicht verstanden: ${bad.slice(0, 2).join(' | ')}` : s.name);
    };
  });
}

// ---------- Üben ----------
let Q = null;
function start(sid) {
  const tasks = [];
  for (const f of listOf(sid)) {
    tasks.push({ f, kind: 'write' });
    const p = (() => { try { return FX.parse(f.f); } catch { return null; } })(); if (!p) continue;
    const other = p.vars.filter(v => v !== p.lhsVar); // umstellen nach einer Größe, die nicht schon links steht
    if (other.length && p.vars.length >= 2) tasks.push({ f, kind: 'solve', target: other[Math.floor(Math.random() * other.length)] });
  }
  Q = { sid, queue: LH.shuffle(tasks), i: 0, total: tasks.length, first: 0, missed: [], retried: new Set(), answered: false };
  LH.go('formulas', { sid });
}
LH.VIEWS.formulas = {
  html({ sid }) {
    const s = LH.subj(sid);
    if (!s) return '<div class="panel empty"><b>Fach nicht gefunden</b></div>';
    if (!Q || Q.sid !== sid) start(sid);
    const head = `<div style="--accent:${s.color}"><button class="back" data-action="open-subject" data-sid="${s.id}">← ${esc(s.name)}</button>
      <div class="eyebrow" style="margin-top:6px"><span class="dot"></span>Formeln · ${listOf(sid).length}</div><h1 class="h1">Formeln üben</h1>`;
    if (!Q.total) return `${head}<div class="panel empty"><b>Noch keine Formeln</b></div></div>`;
    if (Q.i >= Q.queue.length) {
      const pct = Math.round(Q.first / Q.total * 100);
      return `${head}<div class="panel result screws" style="margin-top:20px"><div class="eyebrow">Runde fertig</div>
        <div class="big" style="margin-top:12px">${pct}<span>%</span></div><p class="lede" style="margin:8px auto 0">${Q.first} von ${Q.total} beim ersten Versuch richtig.</p>
        <div class="row" style="justify-content:center;margin-top:18px"><button class="btn" data-fx="again" data-sid="${sid}">Nochmal</button><button class="btn primary" data-action="open-subject" data-sid="${sid}">Zum Fach</button></div></div>
        ${Q.missed.length ? `<h2 class="h2">Diese nochmal ansehen</h2><div class="panel pad fx-box">${[...new Set(Q.missed)].map(f => `<div class="fx-row"><div class="t"><b>${esc(f.name || 'Formel')}</b><code>${show(f.f)}</code></div></div>`).join('')}</div>` : ''}</div>`;
    }
    const it = Q.queue[Q.i];
    const ask = it.kind === 'write'
      ? `<span class="chip">Formel aufschreiben</span><div class="q">${esc(it.f.name || 'Wie lautet die Formel?')}</div>${it.f.note ? `<p class="muted" style="margin-top:8px">${esc(it.f.note)}</p>` : ''}`
      : `<span class="chip">Umstellen</span><div class="q"><code class="fx-big">${show(it.f.f)}</code></div><p class="lede" style="margin-top:10px">Stell nach <b>${esc(it.target)}</b> um.</p>`;
    return `${head}<div class="session" style="margin-top:14px"><div class="sess-top"><span class="chip">${it.kind === 'write' ? 'Aufschreiben' : 'Umstellen'}</span><div class="meter" id="fx-m" style="--n:30;--h:6px"></div><span class="count mono">${Q.i + 1}/${Q.queue.length}</span></div>
      <div class="panel quiz-q screws">${ask}</div>
      <form class="type-in" id="fx-form"><input class="input big mono" id="fx-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${it.kind === 'solve' ? esc(it.target) + ' = …' : 'z. B. U = R · I'}"><button class="btn primary lg">Prüfen</button></form>
      <div class="muted fx-live" id="fx-live"></div>
      <div id="fx-fb"></div><div class="row" id="fx-next" style="justify-content:flex-end;margin-top:10px"></div></div></div>`;
  },
  mount() {
    LH.setMeter($('#fx-m'), Q ? Q.i / Math.max(1, Q.queue.length) * 100 : 0);
    const inp = $('#fx-in'); if (!inp) return;
    inp.focus();
    inp.oninput = () => { $('#fx-live').textContent = inp.value.trim() ? FX.pretty(inp.value) : ''; };
  }
};
function check() {
  if (!Q || Q.answered) return;
  const it = Q.queue[Q.i], inp = $('#fx-in'), val = inp.value.trim(); if (!val) return inp.focus();
  const r = FX.check(it.f.f, val, it.kind === 'solve' ? it.target : null);
  if (!r.ok && /Stell nach|Unbekanntes Zeichen|Klammer|falschen Stelle|zu früh/.test(r.msg || '')) { $('#fx-fb').innerHTML = `<div class="fb bad">${esc(r.msg)}</div>`; return; } // Formfehler: nochmal tippen lassen
  Q.answered = true; inp.disabled = true;
  const ok = r.ok, firstTry = !Q.retried.has(it);
  if (ok) { if (firstTry) Q.first++; S().stats.correct++; LH.addCoins(1); LH.addXP(4, inp, true); }
  else { S().stats.wrong++; LH.addXP(1, inp, false); Q.pushed = firstTry; if (firstTry) { Q.retried.add(it); Q.missed.push(it.f); Q.queue.push(it); } }
  LH.emit('answer', { ok, mode: 'formula' }); LH.save();
  inp.classList.add(ok ? 'ok' : 'bad');
  const sol = it.kind === 'solve' ? `${show(it.f.f)} <span class="muted">→ nach ${esc(it.target)} umstellen</span>` : show(it.f.f);
  $('#fx-fb').innerHTML = ok ? `<div class="fb ok"><b>Richtig.</b> <span class="muted">${show(it.f.f)}</span></div>` : `<div class="fb bad"><b>${esc(r.msg || 'Stimmt nicht')}.</b> Richtig wäre: <code>${sol}</code></div>`;
  $('#fx-next').innerHTML = `${ok ? '' : '<button class="btn ghost" data-fx="override">Doch richtig</button>'}<button class="btn primary" data-fx="next">Weiter</button>`;
  if (ok) { const at = Q.i; setTimeout(() => { if (Q && Q.i === at && LH.current().name === 'formulas') next(); }, 1100); }
}
function next() { Q.i++; Q.answered = false; LH.rerender(); }

document.addEventListener('submit', e => { if (e.target.id === 'fx-form') { e.preventDefault(); check(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && Q?.answered && LH.current().name === 'formulas' && !$('.modal-bg')) { e.preventDefault(); next(); } });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fx]'); if (!b) return;
  const { fx: a, sid, id } = b.dataset, s = sid && LH.subj(sid);
  if (a === 'add') formModal(s);
  if (a === 'edit') formModal(s, listOf(sid).find(f => f.id === id));
  if (a === 'paste') pasteModal(s);
  if (a === 'del') {
    const f = listOf(sid).find(x => x.id === id);
    if (f && await LH.confirmModal({ title: `„${f.name || FX.pretty(f.f)}“ löschen?`, ok: 'Löschen', danger: true })) { s.formulas = s.formulas.filter(x => x !== f); LH.save(); LH.rerender(); }
  }
  if (a === 'ai') {
    if (!LH.jarvis?.hasKey) return LH.toast('KI', 'Braucht einen API-Key', 'Optionen → JARVIS');
    b.disabled = true; const label = b.textContent; b.textContent = 'JARVIS sucht …';
    const r = await LH.API.ai.exam({ action: 'formulas', subjectName: s.name, topics: s.topics.map(t => ({ name: t.name, summary: t.summary, cards: t.cards.map(c => ({ q: c.q, a: c.a })), stored: t.file?.stored })) }).catch(err => ({ error: err.message }));
    b.disabled = false; b.textContent = label;
    if (r.error) return LH.toast('KI', 'Formeln holen fehlgeschlagen', r.error);
    const have = new Set((s.formulas || []).map(f => FX.pretty(f.f).replace(/s/g, '')));
    let n = 0;
    for (const f of r.formulas || []) {
      try { if (!FX.parse(f.f).lhs) continue; } catch { continue; } // nur, was der Prüfer auch nachrechnen kann
      const key = FX.pretty(f.f).replace(/s/g, ''); if (have.has(key)) continue;
      if ((s.formulas || []).some(x => FX.check(x.f, f.f).ok)) continue; // nur umgestellt (f = 1/T ≡ T = 1/f) → schon da
      have.add(key); (s.formulas ||= []).push({ id: LH.uid('fx'), name: f.name, f: f.f, note: f.note }); n++;
    }
    LH.save(); LH.rerender();
    LH.toast('FORMELN', n ? `${n} ${n === 1 ? 'Formel' : 'Formeln'} gefunden` : 'Keine neuen Formeln', n ? 'Kurz durchschauen, ob alles stimmt' : 'In den Lernzetteln stand nichts Neues');
  }
  if (a === 'quiz' || a === 'again') { Q = null; start(sid); }
  if (a === 'next') next();
  if (a === 'override') { const it = Q.queue[Q.i]; if (Q.pushed) { Q.queue.pop(); Q.missed.pop(); Q.retried.delete(it); Q.first++; } S().stats.wrong--; S().stats.correct++; LH.save(); next(); }
});

LH.formulas = { section };
})();

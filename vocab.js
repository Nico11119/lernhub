// ===================== LernHub – Vokabeltrainer (Sprachfächer) =====================
// subject.vocab = [{ id, name, lang, file?, words: [{ id, a: Fremdsprache, b: Deutsch }] }]
(() => {
'use strict';
const LH = window.LH, { $, esc } = LH;
const S = () => LH.S;
const LANG = /englisch|english|engl|franz|spanisch|italienisch|latein|russisch/i;
const isLang = s => LANG.test(s.name) || /^(E|ENG|F|FR|SP|L|LAT|ITA)$/i.test(s.untis || '') || (s.vocab || []).length > 0;
const langOf = (s, l) => l?.lang || (/franz/i.test(s.name) ? 'Französisch' : /span/i.test(s.name) ? 'Spanisch' : /ital/i.test(s.name) ? 'Italienisch' : /latein/i.test(s.name) ? 'Latein' : 'Englisch');
const listOf = (sid, lid) => LH.subj(sid)?.vocab?.find(l => l.id === lid);

// ---------- Bereich im Fach ----------
function section(s) {
  if (!isLang(s)) return '';
  const lists = s.vocab || [];
  return `<h2 class="h2">Vokabeln <span class="mono">${lists.reduce((a, l) => a + l.words.length, 0)}</span></h2>
    <div class="panel pad vocab-box">
      ${lists.map(l => `<div class="task vocab-list" style="--accent:${s.color}"><span class="sw"></span><div class="t"><b>${esc(l.name)}</b><small>${l.words.length} Vokabeln · ${esc(langOf(s, l))} ↔ Deutsch${l.offline ? ' · <span style="color:var(--bad)">ohne KI erkannt, bitte prüfen</span>' : ''}</small></div>
        <div class="row" style="gap:6px">${LH.IS_DESKTOP && l.file?.stored ? `<button class="btn sm ghost" data-vb="redo" data-sid="${s.id}" data-lid="${l.id}" title="Liste nochmal mit KI aus der Datei lesen">Neu erkennen</button>` : ''}<button class="btn sm" data-vb="read" data-sid="${s.id}" data-lid="${l.id}">Durchlesen</button><button class="btn sm primary" data-vb="quiz" data-sid="${s.id}" data-lid="${l.id}">Abfragen</button><button class="icon-btn danger" data-vb="del" data-sid="${s.id}" data-lid="${l.id}" aria-label="Vokabelliste löschen">${LH.ICON.trash}</button></div></div>`).join('')
      || '<p class="muted">Lade deine Vokabelliste hoch (PDF, Word, Foto oder Text). JARVIS liest die Wortpaare heraus.</p>'}
      <div class="row" style="margin-top:12px"><button class="btn sm" data-vb="paste" data-sid="${s.id}">${LH.ICON.text}Text einfügen</button><button class="btn sm primary" data-vb="upload" data-sid="${s.id}">Vokabel-Datei hinzufügen</button>${lists.length > 1 ? `<button class="btn sm ghost" data-vb="quiz" data-sid="${s.id}" data-lid="*">Alle abfragen</button>` : ''}</div>
      <input type="file" id="vocab-in" data-sid="${s.id}" accept=".pdf,.docx,.txt,.md,.csv,.html,.htm,.png,.jpg,.jpeg,.webp" hidden>
      <div class="busy" id="vocab-busy" hidden><span class="spinner"></span><span>JARVIS liest die Vokabeln …</span></div>
    </div>`;
}
function addLists(sid, results, replace) {
  const s = LH.subj(sid); let n = 0;
  for (const r of results) {
    if (r.error) { LH.toast('FEHLER', r.file, r.error); continue; }
    if (!r.words?.length) { LH.toast('VOKABELN', r.file, 'Keine Vokabeln erkannt – mit API-Key klappt es besser'); continue; }
    const words = r.words.map(w => ({ id: LH.uid('w'), a: w.a, b: w.b })), offline = r.mode !== 'ai';
    const old = replace && (s.vocab || []).find(l => l.id === replace);
    if (old) Object.assign(old, { lang: r.lang || old.lang, words, offline });
    else (s.vocab ||= []).push({ id: LH.uid('v'), name: String(r.file || 'Vokabeln').replace(/\.[^.]+$/, ''), lang: r.lang || '', file: r.stored ? { name: r.file, stored: r.stored } : null, words, offline });
    n += r.words.length;
    if (r.aiError) LH.toast('VOKABELN', 'KI nicht erreichbar – ohne KI erkannt', `${r.aiError} Bei zweispaltigen Listen stimmen die Paare dann oft nicht. Später „Neu erkennen“ drücken.`);
    else if (offline && LH.API?.jarvis?.chat) LH.toast('VOKABELN', 'Ohne KI erkannt', 'Bitte kurz durchlesen, ob alles stimmt');
  }
  LH.save(); LH.rerender();
  if (n) LH.toast('VOKABELN', `${n} Vokabeln übernommen`, s.name);
}
async function importFiles(sid, files) {
  const box = $('#vocab-busy'); if (box) box.hidden = false;
  const s = LH.subj(sid), API = LH.API;
  let res = [];
  if (LH.IS_DESKTOP) res = await API.files.importVocab({ paths: files, subjectId: sid });
  else if (API?.files?.importVocab) res = await API.files.importVocab({ files });
  else res = await Promise.all(files.map(async f => /\.(txt|md|csv)$/i.test(f.name) ? { file: f.name, words: window.LHAI.parseVocabText(await f.text()) } : { file: f.name, error: 'In der Vorschau gehen nur Textdateien' }));
  if (box) box.hidden = true;
  addLists(s.id, res);
}

// ---------- Durchlesen ----------
let V = null; // laufende Abfrage
LH.VIEWS.vocab = {
  html({ sid, lid, mode }) {
    const s = LH.subj(sid), lists = lid === '*' ? (s?.vocab || []) : [listOf(sid, lid)].filter(Boolean);
    if (!s || !lists.length) return '<div class="panel empty"><b>Vokabelliste nicht gefunden</b></div>';
    const lang = langOf(s, lists[0]), title = lid === '*' ? 'Alle Vokabeln' : lists[0].name;
    const head = `<div style="--accent:${s.color}"><button class="back" data-action="open-subject" data-sid="${s.id}">← ${esc(s.name)}</button>
      <div class="eyebrow" style="margin-top:6px"><span class="dot"></span>Vokabeln · ${lists.reduce((a, l) => a + l.words.length, 0)} Wörter</div><h1 class="h1">${esc(title)}</h1>`;
    if (mode === 'read') {
      const words = lists.flatMap(l => l.words);
      return `${head}<div class="row vocab-tools"><input class="input" id="vb-search" placeholder="Suchen …" autocomplete="off" style="flex:1;min-width:160px">
        <div class="seg" role="group" aria-label="Verdecken"><button type="button" data-vb="hide" data-h="" class="on">Alles zeigen</button><button type="button" data-vb="hide" data-h="a">${esc(lang)} verdecken</button><button type="button" data-vb="hide" data-h="b">Deutsch verdecken</button></div>
        <button class="btn sm primary" data-vb="quiz" data-sid="${sid}" data-lid="${lid}">Abfragen</button></div>
        <div class="vocab-table" id="vb-table">${words.map(w => `<div class="vocab-row" data-q="${esc(LH.norm(w.a + ' ' + w.b))}"><span class="va">${esc(w.a)}</span><span class="vb">${esc(w.b)}</span></div>`).join('')}</div>
        <p class="muted" style="font-size:12.5px;margin-top:10px">Verdeckte Seite antippen zum Aufdecken.</p></div>`;
    }
    // Abfrage: zuerst Richtung wählen
    if (!V || V.key !== `${sid}|${lid}`) return `${head}<div class="panel pad" style="margin-top:20px;max-width:560px"><b>Welche Richtung?</b>
      <div class="vocab-dirs">${[['b2a', `Deutsch → ${lang}`], ['a2b', `${lang} → Deutsch`], ['mix', 'Zufällig gemischt']].map(([v, t]) => `<button class="panel mode-tile link" data-vb="go" data-dir="${v}" data-sid="${sid}" data-lid="${lid}"><b>${esc(t)}</b></button>`).join('')}</div>
      <p class="muted" style="font-size:13px;margin-top:10px">Alle ${lists.reduce((a, l) => a + l.words.length, 0)} Vokabeln kommen in zufälliger Reihenfolge dran. Falsche kommen am Ende der Runde nochmal.</p></div></div>`;
    if (V.i >= V.queue.length) {
      const pct = Math.round(V.first / V.total * 100);
      return `${head}<div class="panel result screws" style="margin-top:20px"><div class="eyebrow">Runde fertig</div>
        <div class="big" style="margin-top:12px">${pct}<span>%</span></div><p class="lede" style="margin:8px auto 0">${V.first} von ${V.total} beim ersten Versuch gewusst.</p>
        <div class="row" style="justify-content:center;margin-top:18px"><button class="btn" data-vb="again">Nochmal</button><button class="btn primary" data-action="open-subject" data-sid="${sid}">Zum Fach</button></div></div>
        ${V.missed.length ? `<h2 class="h2">Diese üben <span class="mono">${V.missed.length}</span></h2><div class="vocab-table">${V.missed.map(w => `<div class="vocab-row"><span class="va">${esc(w.a)}</span><span class="vb">${esc(w.b)}</span></div>`).join('')}</div>` : ''}</div>`;
    }
    const it = V.queue[V.i], ask = it.dir === 'a2b' ? it.w.a : it.w.b, target = it.dir === 'a2b' ? 'Deutsch' : lang;
    return `${head}<div class="session" style="margin-top:14px"><div class="sess-top"><span class="chip">${esc(it.dir === 'a2b' ? `${lang} → Deutsch` : `Deutsch → ${lang}`)}</span><div class="meter" id="vb-m" style="--n:30;--h:6px"></div><span class="count">${V.i + 1}/${V.queue.length}</span></div>
      <div class="panel quiz-q screws"><span class="chip">Auf ${esc(target)}</span><div class="q">${esc(ask)}</div></div>
      <form class="type-in" id="vb-form"><input class="input big" id="vb-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Übersetzung"><button class="btn primary lg">Prüfen</button></form>
      <div class="feedback" id="vb-fb"></div><div class="next-row" id="vb-next"></div></div></div>`;
  },
  mount({ mode }) {
    if (mode === 'read') { $('#vb-search')?.addEventListener('input', e => { const q = LH.norm(e.target.value); document.querySelectorAll('#vb-table .vocab-row').forEach(r => r.hidden = !!q && !r.dataset.q.includes(q)); }); return; }
    if (V && V.i < V.queue.length) { LH.setMeter($('#vb-m'), V.i / V.queue.length * 100); setTimeout(() => $('#vb-in')?.focus(), 60); }
  }
};

// ---------- Abfragen ----------
// „erreichen, schaffen“ / „to achieve“: jede Bedeutung zählt, „to“, Artikel und Klammern sind egal
const variants = s => String(s).split(/[,;/]| oder | or /).map(x => LH.norm(x.replace(/\([^)]*\)/g, '').replace(/^\s*(to|der|die|das|ein|eine|the|a|an|sich)\s+/i, ''))).filter(Boolean);
const correct = (given, expected) => { const g = variants(given)[0] || LH.norm(given); return variants(expected).some(v => v === g || LH.modes.similar(g, v)); };
function start(sid, lid, dir) {
  const s = LH.subj(sid), lists = lid === '*' ? (s.vocab || []) : [listOf(sid, lid)].filter(Boolean);
  const words = LH.shuffle(lists.flatMap(l => l.words).slice());
  V = { key: `${sid}|${lid}`, sid, lid, dir, queue: words.map(w => ({ w, dir: dir === 'mix' ? (Math.random() < .5 ? 'a2b' : 'b2a') : dir })), i: 0, total: words.length, first: 0, missed: [], retried: new Set(), answered: false };
  LH.go('vocab', { sid, lid, mode: 'quiz' });
}
function check() {
  if (!V || V.answered) return;
  const it = V.queue[V.i], inp = $('#vb-in'), val = inp.value.trim(); if (!val) return inp.focus();
  V.answered = true; inp.disabled = true;
  const exp = it.dir === 'a2b' ? it.w.b : it.w.a, ok = correct(val, exp);
  result(ok, val, exp);
}
function result(ok, val, exp) {
  const it = V.queue[V.i], firstTry = !V.retried.has(it.w.id);
  if (ok) { if (firstTry) V.first++; LH.S.stats.correct++; LH.addCoins(1); LH.addXP(3, $('#vb-in'), true); }
  else { LH.S.stats.wrong++; LH.addXP(1, $('#vb-in'), false); V.pushed = !V.retried.has(it.w.id); if (V.pushed) { V.retried.add(it.w.id); V.missed.push(it.w); V.queue.push({ ...it }); } }
  LH.emit('answer', { ok, mode: 'vocab' }); LH.save();
  $('#vb-in').classList.add(ok ? 'ok' : 'bad');
  $('#vb-fb').innerHTML = ok ? `<div class="fb ok"><b>Richtig.</b> ${LH.norm(val) !== LH.norm(exp) ? `<span class="muted">${esc(exp)}</span>` : ''}</div>` : `<div class="fb bad"><b>Richtig wäre:</b> ${esc(exp)}</div>`;
  $('#vb-next').innerHTML = `${ok ? '' : '<button class="btn ghost" data-vb="override">Doch richtig</button>'}<button class="btn primary" data-vb="next">Weiter</button>`;
  if (ok) { const at = V.i; setTimeout(() => { if (V && V.i === at && LH.current().name === 'vocab') next(); }, 900); }
}
function next() { V.i++; V.answered = false; LH.rerender(); }

document.addEventListener('submit', e => { if (e.target.id === 'vb-form') { e.preventDefault(); check(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && V?.answered && LH.current().name === 'vocab' && !$('.modal-bg')) { e.preventDefault(); next(); } });
document.addEventListener('change', e => { if (e.target.id === 'vocab-in' && e.target.files.length) { const f = [...e.target.files]; e.target.value = ''; importFiles(e.target.dataset.sid, f); } });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-vb]'), cell = e.target.closest('#vb-table .va, #vb-table .vb');
  if (cell && !b) { cell.classList.toggle('show'); return; }
  if (!b) return;
  const { vb: a, sid, lid } = b.dataset;
  if (a === 'read') LH.go('vocab', { sid, lid, mode: 'read' });
  if (a === 'quiz') { V = null; LH.go('vocab', { sid, lid, mode: 'quiz' }); }
  if (a === 'go') start(sid, lid, b.dataset.dir);
  if (a === 'again') start(V.sid, V.lid, V.dir);
  if (a === 'next') next();
  if (a === 'override') { const it = V.queue[V.i]; if (V.pushed) { V.missed = V.missed.filter(w => w !== it.w); V.queue.pop(); V.retried.delete(it.w.id); } LH.S.stats.wrong--; result(true, '', it.dir === 'a2b' ? it.w.b : it.w.a); }
  if (a === 'hide') { document.querySelectorAll('[data-vb="hide"]').forEach(x => x.classList.toggle('on', x === b)); const t = $('#vb-table'); t.classList.toggle('hide-a', b.dataset.h === 'a'); t.classList.toggle('hide-b', b.dataset.h === 'b'); t.querySelectorAll('.show').forEach(x => x.classList.remove('show')); }
  if (a === 'redo') {
    const l = listOf(sid, lid); if (!l?.file?.stored) return;
    const box = $('#vocab-busy'); if (box) box.hidden = false;
    b.disabled = true;
    const res = await LH.API.files.importVocab({ paths: [l.file.stored], subjectId: sid }).catch(err => [{ file: l.name, error: String(err.message || err) }]);
    if (box) box.hidden = true;
    if (res[0] && !res[0].error && res[0].mode !== 'ai') { b.disabled = false; return LH.toast('VOKABELN', 'KI gerade nicht erreichbar', `${res[0].aiError || ''} Die Liste bleibt, wie sie war. Später nochmal probieren.`); }
    return addLists(sid, res, l.id);
  }
  if (a === 'del') {
    const s = LH.subj(sid), l = listOf(sid, lid);
    if (await LH.confirmModal({ title: `„${l.name}“ löschen?`, detail: `${l.words.length} Vokabeln werden entfernt.`, ok: 'Löschen', danger: true })) { s.vocab = s.vocab.filter(x => x !== l); LH.save(); LH.rerender(); }
  }
  if (a === 'upload') {
    if (LH.IS_DESKTOP) { const paths = await LH.API.files.pick(); if (paths?.length) importFiles(sid, paths); }
    else $('#vocab-in')?.click();
  }
  if (a === 'paste') LH.openModal(`<h3>Vokabeln einfügen</h3><p class="lede">Eine Vokabel pro Zeile, z. B. „to achieve – erreichen“. Mit API-Key geht auch jedes andere Format.</p>
    <form id="vbp" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label>Name</label><input class="input" name="name" placeholder="z. B. Unit 4" required></div>
    <div class="field"><label>Vokabeln</label><textarea class="input" name="text" style="min-height:180px" required></textarea></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-c>Abbrechen</button><button class="btn primary">Übernehmen</button></div></form>`, (bg, close) => {
    bg.querySelector('[data-c]').onclick = close;
    bg.querySelector('#vbp').onsubmit = async ev => {
      ev.preventDefault(); const name = ev.target.name.value.trim(), text = ev.target.text.value; close();
      const res = LH.API?.files?.importVocab ? await LH.API.files.importVocab({ text, name }) : [{ file: name, words: window.LHAI.parseVocabText(text) }];
      addLists(sid, res.map(r => ({ ...r, file: name })));
    };
  });
});

LH.vocab = { section, isLang };
})();

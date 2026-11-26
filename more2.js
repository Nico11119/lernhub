// ===================== LernHub – Erklär's mir, Karten aus Notizen, Erinnerung, Taskleiste, Wiederholungs-Vorschau =====================
(() => {
'use strict';
const LH = window.LH, { $, esc, dkey } = LH;
const S = () => LH.S;

// ---------- Erklär's mir (Feynman-Methode) ----------
function feynman(sid, tid) {
  const s = LH.subj(sid), t = LH.topicOf(sid, tid); if (!s || !t) return;
  if (!LH.jarvis?.hasKey) return LH.toast('KI', 'Braucht einen API-Key', 'Optionen → JARVIS');
  LH.openModal(`<h3>Erklär's mir: ${esc(t.name)}</h3><p class="lede">Erklär das Thema in eigenen Worten, so als würdest du es einem Mitschüler beibringen. JARVIS vergleicht mit deinem Lernzettel.</p>
    <form id="fy" style="margin-top:12px"><textarea class="input" name="a" rows="8" placeholder="Also, bei ${esc(t.name)} geht es darum, dass …" required></textarea>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn ghost" data-x>Abbrechen</button><button class="btn primary">Prüfen lassen</button></div></form>
    <div id="fy-res"></div>`, (bg, close) => {
    bg.querySelector('.modal').style.maxWidth = '640px';
    bg.querySelector('[data-x]').onclick = close;
    bg.querySelector('#fy').onsubmit = async e => {
      e.preventDefault();
      const answer = e.target.a.value.trim(); if (answer.length < 20) return LH.toast('ERKLÄREN', 'Ein bisschen mehr bitte', 'Mindestens ein, zwei Sätze');
      const btn = e.target.querySelector('.btn.primary'); btn.disabled = true; btn.textContent = 'JARVIS liest …';
      const r = await LH.API.ai.exam({ action: 'feynman', subjectName: s.name, answer, topics: [{ name: t.name, summary: t.summary, cards: t.cards.map(c => ({ q: c.q, a: c.a })), stored: t.file?.stored }] }).catch(err => ({ error: err.message }));
      btn.disabled = false; btn.textContent = 'Nochmal prüfen';
      const box = bg.querySelector('#fy-res'); if (!box) return;
      if (r.error) { box.innerHTML = `<div class="fb bad" style="margin-top:12px">${esc(r.error)}</div>`; return; }
      const list = (title, xs, cls) => xs.length ? `<div class="fy-l ${cls}"><b>${title}</b><ul>${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
      box.innerHTML = `<div class="fy-res"><div class="row" style="gap:14px;align-items:center"><span class="mono fy-score">${r.score}<small>%</small></span><div style="flex:1">${LH.meter(r.score, 30, { h: 8 })}</div></div>
        ${list('Gut erklärt', r.good, 'ok')}${list('Fehlt noch', r.missing, 'miss')}${list('Stimmt so nicht', r.wrong, 'bad')}${r.tip ? `<p class="muted" style="margin-top:10px">💡 ${esc(r.tip)}</p>` : ''}</div>`;
      LH.lightMeters(box);
      LH.addXP(Math.round(5 + r.score / 5), btn, r.score >= 50); LH.save();
      if (r.score >= 90) LH.confetti(120);
    };
  });
}

// ---------- Karten aus Notizen ----------
async function notesToCards(sid, btn) {
  const s = LH.subj(sid), text = (s?.notes || '').trim();
  if (text.length < 30) return LH.toast('NOTIZEN', 'Zu wenig Text', 'Schreib zuerst ein paar Sätze in die Notizen');
  if (!LH.API?.files?.importText) return LH.addTopics(sid, [{ file: 'Notizen', mode: 'offline', topics: [LH.heuristic('Notizen', text)] }]);
  btn.disabled = true; btn.textContent = 'JARVIS schreibt Karten …';
  const r = await LH.API.files.importText({ text, name: `Notizen ${new Date().toLocaleDateString('de-AT')}`, subjectName: s.name }).catch(e => ({ error: e.message }));
  btn.disabled = false; btn.textContent = 'Karten daraus machen';
  LH.addTopics(sid, [r]);
}

// ---------- Erinnerung um 19 Uhr (nur Laptop, App läuft im Hintergrund) ----------
function remind() {
  const st = S(); if (!LH.IS_DESKTOP || !st?.settings.remind || !('Notification' in window)) return;
  const now = new Date(), today = dkey();
  if (now.getHours() < 19 || st.remindDay === today || (st.history[today] || 0) > 0) return;
  const streak = LH.streakNow ? LH.streakNow() : st.streak.count;
  st.remindDay = today; LH.save();
  const n = new Notification('LernHub', {
    body: streak > 0 ? `Deine Serie von ${streak} ${streak === 1 ? 'Tag' : 'Tagen'} reißt heute. Fünf Minuten reichen!` : 'Heute noch nichts gelernt – fünf Minuten Karteikarten?',
    silent: false
  });
  n.onclick = () => { LH.API.win.show?.(); LH.go('home'); };
}
setInterval(remind, 5 * 60e3);
LH.on('booted', () => setTimeout(remind, 20000));

// ---------- Tagesziel als Balken im Taskleisten-Symbol ----------
function taskbar() {
  if (!LH.API?.win?.progress) return;
  const st = S(), goal = Math.max(5, Math.round(st.settings.weekGoal / 7)), m = st.history[dkey()] || 0;
  LH.API.win.progress(m / goal);
}
LH.on('minute', taskbar);
LH.on('booted', taskbar);

// ---------- Wiederholungs-Vorschau (nächste 7 Tage) ----------
const GAP = [0, 1, 2, 4, 8, 16]; // wie modes.js: Abstand in Tagen je Box
function forecast() {
  const days = Array.from({ length: 7 }, (_, i) => ({ k: dkey(LH.addDays(new Date(), i)), n: 0 }));
  const today = LH.parseKey(dkey());
  for (const c of LH.cardsOf()) {
    const st = LH.cs(c.id); if (!st.last) continue;
    const dueAt = LH.addDays(LH.parseKey(dkey(new Date(st.last))), GAP[st.box] || 1);
    const i = Math.max(0, Math.round((dueAt - today) / 864e5)); if (i < 7) days[i].n++;
  }
  const max = Math.max(5, ...days.map(d => d.n)), total = days.reduce((a, d) => a + d.n, 0);
  if (!total) return '';
  return `<div class="panel pad fc" style="margin:18px 0 6px"><div class="row" style="justify-content:space-between"><b>Wiederholungen</b><span class="muted" style="font-size:12.5px">${total} Karten in den nächsten 7 Tagen</span></div>
    <div class="fc-bars">${days.map((d, i) => `<div class="fc-d" title="${LH.fmtDay(d.k)}: ${d.n} Karten"><span class="mono">${d.n || ''}</span><i style="height:${Math.round(d.n / max * 100)}%"></i><small>${i === 0 ? 'Heute' : LH.parseKey(d.k).toLocaleDateString('de-AT', { weekday: 'short' }).slice(0, 2)}</small></div>`).join('')}</div>
    ${days[0].n ? `<button class="btn sm primary" data-action="due" style="margin-top:10px">Heute fällige wiederholen</button>` : ''}</div>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-mx2]'); if (!b) return;
  const a = b.dataset.mx2;
  if (a === 'feynman') feynman(b.dataset.sid, b.dataset.tid);
  if (a === 'notes-cards') notesToCards(b.dataset.sid, b);
});

LH.more2 = { feynman, forecast, remind, taskbar };
})();

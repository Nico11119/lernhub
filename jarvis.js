// ===================== LernHub 2 – JARVIS =====================
(() => {
'use strict';
const LH = window.LH;
const { $, esc, md, norm, API, IS_DESKTOP } = LH;
const S = () => LH.S;
const el = $('#jarvis');

const J = { hist: [], pending: null, hasKey: false, busy: false, state: 'idle', lastFiles: [], env: 0, level: 0 };
const TOOL_LABEL = { open_app: 'App geöffnet', list_apps: 'Apps gesucht', open_url: 'Website', web_search: 'Websuche', open_folder: 'Ordner', search_files: 'Dateisuche', open_file: 'Datei geöffnet', media: 'Musik', set_volume: 'Lautstärke', system_info: 'Systeminfo', set_timer: 'Timer', add_note: 'Notiz', read_notes: 'Notizen', clipboard: 'Zwischenablage', lock_pc: 'PC gesperrt', power: 'Energie', run_powershell: 'PowerShell', app_navigate: 'Ansicht', app_start_quiz: 'Quiz', app_add_test: 'Test eingetragen' };

// ---------- Panel ----------
let vizKick = () => {};
function open(on = !el.classList.contains('open'), quiet = false) {
  el.classList.toggle('open', on); vizKick();
  S().settings.jarvisOpen = on; LH.save();
  if (on && !J.hist.length && !quiet) greet();
}
function setState(s, label) {
  J.state = s; el.dataset.state = s; vizKick();
  $('#j-state-t').textContent = label || { idle: 'Bereit', listening: 'Hört zu', thinking: 'Denkt nach', speaking: 'Spricht' }[s];
  $('#rail-j').classList.toggle('on', s !== 'idle');
  $('#rail-j-t').textContent = s === 'idle' ? 'Strg+Umschalt+Leertaste' : $('#j-state-t').textContent;
}
function sugs() {
  const list = J.pending ? ['stopp'] : ['Was soll ich heute lernen?', 'Frag mich ab', IS_DESKTOP ? 'Öffne Spotify' : 'Mein Status', 'Wie spät ist es?'];
  $('#j-sugs').innerHTML = list.map(s => `<button class="chip" data-sug="${esc(s)}">${esc(s)}</button>`).join('');
}
function log(role, text, actions) {
  const m = document.createElement('div');
  m.className = 'm ' + (role === 'user' ? 'me' : 'bot');
  const time = new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  m.innerHTML = `<small>${role === 'user' ? 'Du' : 'JARVIS'} · ${time}</small><p></p>${actions?.length ? `<div class="acts">${actions.map(a => `<span class="chip ${a.ok ? 'ok' : 'no'}">${esc(TOOL_LABEL[a.tool] || a.tool)}</span>`).join('')}</div>` : ''}`;
  $('#j-log').appendChild(m);
  const p = m.querySelector('p');
  $('#j-log').scrollTop = 1e9;
  return p;
}
async function reply(text, actions, opts = {}) {
  const p = log('bot', text, actions);
  J.hist.push({ role: 'assistant', content: text });
  say(text);
  if (LH.reduced()) p.innerHTML = md(text);
  else {
    for (let i = 0; i <= text.length; i += 3) { p.innerHTML = esc(text.slice(0, i)) + '<span class="caret"></span>'; $('#j-log').scrollTop = 1e9; await new Promise(r => setTimeout(r, 12)); }
    p.innerHTML = md(text);
  }
  sugs();
}
function greet() {
  const h = new Date().getHours(), next = LH.upcoming()[0];
  const g = h < 11 ? 'Guten Morgen' : h < 18 ? 'Servus' : 'Guten Abend';
  const t = `${LH.hello(g)}${next ? ` ${next.title} ist ${LH.fmtDay(next.date).toLowerCase() === 'heute' ? 'heute' : LH.fmtDay(next.date) === 'Morgen' ? 'morgen' : 'am ' + LH.fmtDay(next.date)}.` : ''} Sag oder schreib mir, was du brauchst.`;
  const p = log('bot', t); p.innerHTML = md(t); J.hist.push({ role: 'assistant', content: t }); sugs();
}

// ---------- Sprachausgabe ----------
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  return vs.find(v => v.name === S().settings.voiceName) || vs.find(v => /^de/i.test(v.lang) && /stefan|conrad|killian|male/i.test(v.name)) || vs.find(v => /^de/i.test(v.lang));
}
function say(text) {
  if (!S().settings.voiceOut || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const clean = text.replace(/\*\*|`|^#+ /gm, '').replace(/^[•\-]\s*/gm, '').replace(/\n+/g, '. ').slice(0, 700);
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'de-DE'; u.rate = 1.04; u.pitch = .95;
  const v = pickVoice(); if (v) u.voice = v;
  u.onstart = () => setState('speaking');
  u.onboundary = () => { J.env = 1; };
  u.onend = u.onerror = () => { if (J.state === 'speaking') setState('idle'); };
  speechSynthesis.speak(u);
}

// ---------- Spracherkennung (lokal, Whisper) ----------
const STT = { worker: null, ready: null, model: null, seq: 0, wait: new Map() };
const modelId = () => S().settings.stt === 'small' ? 'onnx-community/whisper-small' : 'onnx-community/whisper-base';
function resetStt() { clearTimeout(STT.idle); STT.worker?.terminate(); STT.worker = null; STT.ready = null; }
function ensureStt() {
  if (STT.ready && STT.model === modelId()) return STT.ready;
  resetStt();
  STT.model = modelId();
  const files = {};
  STT.ready = new Promise((resolve, reject) => {
    let w;
    try { w = new Worker('stt-worker.js', { type: 'module' }); } catch (e) { return reject(e); }
    STT.worker = w;
    w.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        const p = data.p;
        if (p.status === 'progress' && p.total) {
          files[p.file] = [p.loaded, p.total];
          const [l, t] = Object.values(files).reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
          $('#j-dl').classList.add('show');
          $('#j-dl-t').textContent = `Spracherkennung wird geladen · ${(l / 2 ** 20).toFixed(0)} / ${(t / 2 ** 20).toFixed(0)} MB (nur einmal)`;
          LH.setMeter($('#j-dl-m'), l / t * 100);
        }
      }
      if (data.type === 'ready') { $('#j-dl').classList.remove('show'); resolve(data.device); }
      if (data.type === 'error') { $('#j-dl').classList.remove('show'); STT.ready = null; reject(new Error(data.error)); }
      if (data.type === 'result') { const cb = STT.wait.get(data.id); STT.wait.delete(data.id); cb?.(data); }
    };
    w.onerror = e => { STT.ready = null; reject(new Error(e.message || 'Worker-Fehler')); };
    w.postMessage({ type: 'load', model: STT.model });
  });
  return STT.ready;
}
function transcribe(audio) {
  return new Promise((resolve, reject) => {
    const id = ++STT.seq;
    clearTimeout(STT.idle); STT.idle = setTimeout(resetStt, 5 * 60e3); // Modell (Hunderte MB) nicht ewig im Speicher halten
    STT.wait.set(id, d => d.error ? reject(new Error(d.error)) : resolve(d.text));
    STT.worker.postMessage({ type: 'run', id, audio }, [audio.buffer]);
  });
}
const HALLU = /untertitel|zdf|amara|swr|vielen dank f(u|ü)rs zuschauen|copyright|^\W*$/i;

// Handy: Spracherkennung des Systems (Chrome/Safari) statt Whisper – kein 150-MB-Download
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let sr = null;
function listenNative() {
  if (sr) { sr.stop(); return; }
  speechSynthesis?.cancel();
  if (!el.classList.contains('open')) open(true);
  sr = new SR(); sr.lang = 'de-AT'; sr.interimResults = false; sr.maxAlternatives = 1;
  setState('listening'); $('#j-hint').textContent = 'Sprich jetzt · Tippen zum Beenden';
  let heard = '';
  sr.onresult = e => { heard = e.results[0]?.[0]?.transcript || ''; };
  sr.onerror = e => { if (e.error === 'not-allowed') LH.toast('MIC', 'Mikrofon blockiert', 'Erlaube den Mikrofonzugriff für LernHub'); };
  sr.onend = () => {
    sr = null; $('#j-hint').textContent = 'Tippen zum Sprechen'; setState('idle');
    if (heard.trim()) { S().stats.voice++; LH.checkBadges(); send(heard); } else LH.toast('MIC', 'Nichts gehört', 'Nochmal versuchen');
  };
  try { sr.start(); } catch { sr = null; setState('idle'); }
}

// Android-App: Spracherkennung über das Plugin (die WebView selbst kann es nicht)
const CSR = window.Capacitor?.Plugins?.SpeechRecognition;
let csrBusy = false;
async function listenCapacitor() {
  if (csrBusy) { CSR.stop().catch(() => {}); return; }
  speechSynthesis?.cancel();
  if (!el.classList.contains('open')) open(true);
  try {
    if (!(await CSR.available()).available) return LH.toast('MIC', 'Keine Spracherkennung', 'Auf diesem Handy ist keine Spracherkennung installiert');
    const p = await CSR.requestPermissions();
    if (p.speechRecognition !== 'granted') return LH.toast('MIC', 'Mikrofon blockiert', 'Erlaube LernHub den Mikrofonzugriff in den Handy-Einstellungen');
    csrBusy = true; setState('listening'); $('#j-hint').textContent = 'Sprich jetzt';
    const r = await CSR.start({ language: 'de-AT', maxResults: 1, partialResults: false, popup: false });
    const heard = r?.matches?.[0] || '';
    if (heard.trim()) { S().stats.voice++; LH.checkBadges(); send(heard); } else LH.toast('MIC', 'Nichts gehört', 'Nochmal versuchen');
  } catch (e) { LH.toast('MIC', 'Spracherkennung fehlgeschlagen', String(e.message || e).slice(0, 90)); }
  finally { csrBusy = false; $('#j-hint').textContent = 'Tippen zum Sprechen'; if (J.state === 'listening') setState('idle'); }
}

let rec = null;
async function listen() {
  if (!S().settings.mic) return LH.toast('MIC', 'Spracheingabe ist aus', 'Einschalten unter Optionen → JARVIS → Spracheingabe');
  if (!IS_DESKTOP && CSR) return listenCapacitor();
  if (!IS_DESKTOP && SR) return listenNative();
  if (LH.IS_MOBILE) return LH.toast('MIC', 'Spracheingabe geht hier nicht', 'Dieser Browser kann keine Sprache erkennen – nimm Chrome oder Safari, oder schreib JARVIS');
  if (rec) return stopRec();
  if (J.busy) return;
  if (!navigator.mediaDevices?.getUserMedia) return LH.toast('MIC', 'Kein Mikrofon', 'Diese Umgebung erlaubt keinen Mikrofonzugriff');
  speechSynthesis?.cancel();
  if (!el.classList.contains('open')) open(true);
  const loading = ensureStt().catch(e => { LH.toast('MIC', 'Spracherkennung lädt nicht', String(e.message || e).slice(0, 90)); return e; });
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch { return LH.toast('MIC', 'Mikrofon blockiert', 'Erlaube den Zugriff in den Windows-Datenschutzeinstellungen'); }
  const ctx = new AudioContext(), src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser();
  an.fftSize = 512; src.connect(an);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  src.connect(proc); proc.connect(ctx.destination);
  rec = { stream, ctx, an, proc, chunks: [], start: performance.now(), voice: false, lastVoice: 0, loading };
  setState('listening');
  $('#j-hint').textContent = 'Sprich jetzt · Klick zum Beenden';
  proc.onaudioprocess = e => {
    if (!rec) return;
    const d = e.inputBuffer.getChannelData(0);
    rec.chunks.push(new Float32Array(d));
    let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    const rms = Math.sqrt(s / d.length), now = performance.now();
    if (rms > .018) { rec.voice = true; rec.lastVoice = now; }
    if ((rec.voice && now - rec.lastVoice > 1300) || (!rec.voice && now - rec.start > 7000) || now - rec.start > 20000) stopRec();
  };
}
async function stopRec() {
  const r = rec; if (!r) return; rec = null;
  r.proc.disconnect(); r.stream.getTracks().forEach(t => t.stop());
  const rate = r.ctx.sampleRate; r.ctx.close();
  $('#j-hint').textContent = 'Klicken oder Strg+Umschalt+Leertaste';
  if (!r.voice) { setState('idle'); return LH.toast('MIC', 'Nichts gehört', 'Sprich etwas lauter oder näher ans Mikro'); }
  const len = r.chunks.reduce((a, c) => a + c.length, 0), all = new Float32Array(len);
  let o = 0; for (const c of r.chunks) { all.set(c, o); o += c.length; }
  const ratio = rate / 16000, out = new Float32Array(Math.floor(len / ratio));
  for (let i = 0; i < out.length; i++) { const p = i * ratio, k = Math.floor(p), f = p - k; out[i] = all[k] * (1 - f) + (all[k + 1] || 0) * f; }
  setState('thinking', 'Verstehe …');
  const ld = await r.loading;
  if (ld instanceof Error) { setState('idle'); return LH.toast('MIC', 'Spracherkennung nicht verfügbar', ld.message.slice(0, 90)); }
  try {
    const text = await transcribe(out);
    if (!text || HALLU.test(text)) { setState('idle'); return LH.toast('MIC', 'Nicht verstanden', 'Versuch es nochmal'); }
    S().stats.voice++; LH.checkBadges();
    send(text);
  } catch (e) { setState('idle'); LH.toast('MIC', 'Fehler bei der Erkennung', String(e.message).slice(0, 90)); }
}

// ---------- Visualisierung ----------
// Läuft nur, solange das Panel offen ist oder JARVIS etwas tut; im Ruhezustand nur ~15 Bilder/s
(function viz() {
  const c = $('#j-canvas'), x = c.getContext('2d'), N = 72, freq = new Uint8Array(256);
  let t = 0, vals = new Float32Array(N), running = false, skip = 0, colors = null, colorsAt = 0;
  vizKick = () => { if (!running && !document.hidden) { running = true; requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', vizKick);
  function frame() {
    if (document.hidden || (!el.classList.contains('open') && J.state === 'idle')) { running = false; return; }
    requestAnimationFrame(frame);
    if (J.state === 'idle' && ++skip % 4) return;
    const dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    t += LH.reduced() ? 0 : .016;
    J.env *= .9;
    if (rec) rec.an.getByteFrequencyData(freq);
    for (let i = 0; i < N; i++) {
      let target;
      const sym = Math.abs((i / N) * 2 - 1);
      if (J.state === 'listening' && rec) target = freq[Math.floor((1 - sym) * 90) + 2] / 255;
      else if (J.state === 'speaking') target = .25 + .55 * Math.abs(Math.sin(t * 9 + i * .7)) * (.4 + J.env * .6) * (1 - sym * .5);
      else if (J.state === 'thinking') { const a = ((t * 1.6) % 1) * N; const d = Math.min(Math.abs(i - a), N - Math.abs(i - a)); target = Math.max(.06, .7 - d * .08); }
      else target = .06 + .04 * Math.sin(t * 1.4 + i * .35);
      vals[i] += (target - vals[i]) * .25;
    }
    const cx = W / 2, cy = H / 2 - 6, r0 = 54;
    if (!colors || performance.now() - colorsAt > 2000) { const cssv = getComputedStyle(document.documentElement), V = n => cssv.getPropertyValue(n).trim(); colors = { line: V('--line'), quiet: V('--line-2'), red: V('--bad'), sig: V('--signal') }; colorsAt = performance.now(); }
    const { line, quiet, red, sig } = colors;
    x.strokeStyle = line; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, r0 - 6, 0, Math.PI * 2); x.stroke();
    const style = S()?.shop?.ring || 'bars';
    const colOf = hot => J.state === 'listening' ? (hot ? red : quiet) : J.state === 'idle' ? quiet : (hot ? sig : quiet);
    if (style === 'wave') {
      x.beginPath();
      for (let i = 0; i <= N; i++) { const k = i % N, a = k / N * Math.PI * 2 - Math.PI / 2, r = r0 + 10 + vals[k] * 40; i ? x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      x.closePath(); x.strokeStyle = colOf(true); x.lineWidth = 2.4; x.stroke();
    } else for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2 - Math.PI / 2, len = 4 + vals[i] * 46, hot = vals[i] > .3;
      x.strokeStyle = x.fillStyle = colOf(hot); x.lineWidth = 2.4; x.lineCap = 'round';
      if (style === 'dots') { x.beginPath(); x.arc(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len), 2.4, 0, 7); x.fill(); }
      else if (style === 'segments') { x.globalAlpha = .25 + vals[i] * .9; x.lineCap = 'butt'; x.lineWidth = 14; x.beginPath(); x.arc(cx, cy, r0 + 14, a, a + Math.PI * 2 / N * .7); x.stroke(); x.globalAlpha = 1; }
      else { x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); x.stroke(); }
    }
  }
  frame();
})();

// ---------- Gehirn ----------
const pc = async (name, input) => IS_DESKTOP ? API.jarvis.run(name, input) : { ok: false, error: 'Nur in der Desktop-App' };
const nf = n => ({ eins: 1, zwei: 2, drei: 3, vier: 4, funf: 5, fuenf: 5, zehn: 10, zwanzig: 20, dreissig: 30, vierzig: 40, funfzig: 50, fuenfzig: 50, hundert: 100 }[n] ?? parseInt(n, 10));

function askQuestion() {
  const next = LH.upcoming()[0];
  const pool = LH.cardsOf(next?.subjectId);
  if (!pool.length) { J.pending = null; return 'Ich habe noch keine Karten. Lade zuerst einen Lernzettel hoch.'; }
  const c = LH.pickCards(pool, 1)[0];
  J.pending = c;
  return `${LH.subj(c.sid).name}, ${LH.topicOf(c.sid, c.tid).name}:\n**${c.q}**`;
}

// Lokale Befehle. Gibt {text, actions} zurück oder null.
async function local(raw, { allowPc = true, fastOnly = false } = {}) {
  const t = norm(raw);
  const act = (tool, r) => [{ tool, ok: r?.ok !== false }];
  // Abfrage läuft
  if (J.pending) {
    if (/^(stop|stopp|abbrechen|ende|genug|aufhoren)/.test(t)) { J.pending = null; return { text: 'Abfrage beendet. Gute Arbeit.' }; }
    const c = J.pending, ans = norm(c.a), toks = ans.split(' ').filter(w => w.length > 1 || /\d/.test(w));
    const hit = toks.filter(w => t.includes(w)).length;
    const ok = !!t && (t === ans || (ans.includes(t) && t.length >= Math.min(3, ans.length)) || hit / Math.max(1, toks.length) >= .5);
    LH.grade(c, ok, 'quiz', $('#j-log'));
    return { text: (ok ? `Richtig: ${c.a}.` : `Nicht ganz. Richtig ist: **${c.a}**.`) + '\n\n' + askQuestion() };
  }
  // PC: schnelle Befehle
  if (allowPc) {
    let m;
    if (/\blauter\b/.test(t)) { const r = await pc('media', { action: 'volume_up', steps: 5 }); return { text: r.ok ? 'Lauter.' : r.error, actions: act('media', r) }; }
    if (/\bleiser\b/.test(t)) { const r = await pc('media', { action: 'volume_down', steps: 5 }); return { text: r.ok ? 'Leiser.' : r.error, actions: act('media', r) }; }
    if ((m = t.match(/lautstarke (?:auf )?(\w+)/))) { const r = await pc('set_volume', { level: nf(m[1]) }); return { text: r.ok ? `Lautstärke auf ${r.level} %.` : r.error, actions: act('set_volume', r) }; }
    if (/\b(stumm|mute|ton aus|ton an)\b/.test(t)) { const r = await pc('media', { action: 'mute' }); return { text: r.ok ? 'Erledigt.' : r.error, actions: act('media', r) }; }
    // "nächster Test" darf kein Lied überspringen: Lied/Song/Titel muss dabeistehen
    if (/\bnae?chste[nrs]? (lied|song|titel)\b|^(skip|nae?chstes)$/.test(t)) { const r = await pc('media', { action: 'next' }); return { text: r.ok ? 'Nächster Titel.' : r.error, actions: act('media', r) }; }
    if (/(vorheriges?|letztes?) (lied|song|titel)/.test(t)) { const r = await pc('media', { action: 'previous' }); return { text: r.ok ? 'Zurück.' : r.error, actions: act('media', r) }; }
    if (/^(pause|play|weiter|abspielen)$|musik (an|aus|pausieren|stoppen|weiter|starten)|(stopp?|pausiere) (die )?musik/.test(t)) { const r = await pc('media', { action: 'play_pause' }); return { text: r.ok ? 'Okay.' : r.error, actions: act('media', r) }; }
    if (/(wie spat|uhrzeit|wie viel uhr|welcher tag|datum)/.test(t)) {
      const d = new Date(); return { text: `Es ist ${d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })} Uhr, ${d.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}.` };
    }
    if (/(akku|batterie|arbeitsspeicher|\bram\b|\bcpu\b|systemstatus)/.test(t)) { const r = await pc('system_info', {}); return { text: r.ok ? `Akku ${r.battery}, CPU ${r.cpu}, RAM ${r.ram}.` : r.error, actions: act('system_info', r) }; }
    if ((m = t.match(/(?:timer|erinnere mich|wecker)\D*(\d+|\w+)\s*(sekunden|sek|minuten|min|stunden|std)?(?:.*?\b(?:an|dass|fur|zum|wegen)\b\s*(.+))?/)) && !isNaN(nf(m[1]))) {
      const n = nf(m[1]), unit = m[2] || 'minuten', min = /^s/.test(unit) ? n / 60 : /^st/.test(unit) ? n * 60 : n;
      const r = await pc('set_timer', { minutes: min, label: m[3] ? m[3].trim() : `Timer: ${n} ${unit}` });
      return { text: r.ok ? `Timer läuft: ${n} ${unit}.` : r.error, actions: act('set_timer', r) };
    }
    if ((m = raw.match(/^(?:notiz|merk dir|schreib auf|notiere)[:,]?\s+(.+)/i))) { const r = await pc('add_note', { text: m[1] }); return { text: r.ok ? 'Notiert.' : r.error, actions: act('add_note', r) }; }
    if (/(zeig|lies|was steht).*(notizen)/.test(t)) { const r = await pc('read_notes', {}); return { text: r.ok ? (r.notes ? 'Deine letzten Notizen:\n' + r.notes.trim().split('\n').slice(-6).join('\n') : 'Noch keine Notizen.') : r.error, actions: act('read_notes', r) }; }
    if (/\b(sperr|sperre|sperren)\b/.test(t) && /(pc|computer|laptop|bildschirm)/.test(t)) { const r = await pc('lock_pc', {}); return { text: r.ok ? 'Gesperrt.' : r.error, actions: act('lock_pc', r) }; }
    if (!fastOnly) {
    if (/(herunterfahren|fahr .*(herunter|runter)|ausschalten)/.test(t)) { const r = await pc('power', { action: 'shutdown' }); return { text: r.ok ? 'Fahre in 10 Sekunden herunter.' : 'Abgebrochen.', actions: act('power', r) }; }
    if (/(neu starten|neustart)/.test(t)) { const r = await pc('power', { action: 'restart' }); return { text: r.ok ? 'Starte in 10 Sekunden neu.' : 'Abgebrochen.', actions: act('power', r) }; }
    if (/(energiespar|schlafmodus)/.test(t)) { const r = await pc('power', { action: 'sleep' }); return { text: r.ok ? 'Gute Nacht.' : 'Abgebrochen.', actions: act('power', r) }; }
    if ((m = t.match(/(?:such|find)\w*\s+(?:die |nach |meine? )?(?:datei|ordner|dokument)\w*\s+(.+)/))) {
      const r = await pc('search_files', { query: m[1].replace(/^(namens|mit dem namen)\s+/, '') });
      J.lastFiles = r.results || [];
      return { text: r.ok ? (J.lastFiles.length ? 'Gefunden:\n' + J.lastFiles.slice(0, 6).map((f, i) => `${i + 1}. ${f.name}`).join('\n') + '\n\nSag „öffne Nummer 1“.' : 'Nichts gefunden.') : r.error, actions: act('search_files', r) };
    }
    if ((m = t.match(/^(?:offne|oeffne|offen|starte?|mach)\s+(?:die |den |das )?(?:nummer\s+)?(\d+)\b/)) && J.lastFiles.length) {
      const f = J.lastFiles[+m[1] - 1]; if (!f) return { text: 'Diese Nummer gibt es nicht.' };
      const r = await pc('open_file', { path: f.path }); return { text: r.ok ? `${f.name} ist offen.` : r.error, actions: act('open_file', r) };
    }
    if ((m = t.match(/(?:such|google)\w*\s+(?:auf youtube\s+)?(?:nach\s+)?(.+?)(\s+auf youtube)?$/))) {
      const yt = /youtube/.test(t), q = m[1].replace(/auf youtube/, '').trim();
      const r = await pc('web_search', { query: q, site: yt ? 'youtube' : 'google' }); return { text: r.ok ? `Suche nach „${q}“${yt ? ' auf YouTube' : ''}.` : r.error, actions: act('web_search', r) };
    }
    if ((m = t.match(/^(?:offne|oeffne|starte?|mach|zeig)\s+(?:mir\s+)?(?:den |die |das |meinen? )?(.+?)(?:\s+(?:auf|an|bitte))?$/))) {
      const target = m[1].replace(/\s+ordner$/, '').trim();
      if (/^(downloads?|dokumente|desktop|schreibtisch|bilder|musik|videos)$/.test(target)) { const r = await pc('open_folder', { folder: target }); return { text: r.ok ? 'Ordner ist offen.' : r.error, actions: act('open_folder', r) }; }
      if (/\.[a-z]{2,}$/.test(target) && !/\s/.test(target)) { const r = await pc('open_url', { url: target }); return { text: r.ok ? 'Seite ist offen.' : r.error, actions: act('open_url', r) }; }
      if (/^(lernplan|plan)$/.test(target)) { LH.go('plan'); return { text: 'Hier ist dein Plan.' }; }
      if (/^(facher|faecher)$/.test(target)) { LH.go('subjects'); return { text: 'Deine Fächer.' }; }
      if (/^(pause|spiele?)$/.test(target)) { LH.go('break'); return { text: 'Pausenraum.' }; }
      const r = await pc('open_app', { name: target });
      return { text: r.ok ? `${r.opened} startet.` : r.error, actions: act('open_app', r) };
    }
    }
  }
  // Mit KI: alles außer schnellen PC-Befehlen und der Abfrage beantwortet die KI (sie hat Werkzeuge für HÜs, Fokus, Briefing …)
  if (fastOnly && !/(frag mich|abfrag|teste mich|quiz mich|pruf mich)/.test(t)) return null;
  // Tagesablauf
  if (/(briefing|tagesuberblick|was steht heute an|was ist heute los)/.test(t) || /^guten morgen/.test(t)) return { text: await LH.briefing.text() };
  if (/(fokus|lernmodus|konzentrationsmodus)/.test(t)) {
    if (/(aus|stopp?|beend)/.test(t)) { LH.focus.stop(); return { text: 'Fokus beendet.' }; }
    LH.focus.start(); return { text: '' };
  }
  if (/(was hab ich auf|hausubungen|welche hu|offene hu|meine hu)/.test(t)) {
    const hw = LH.school.openHw();
    return { text: hw.length ? `Offen:\n${hw.slice(0, 6).map(h => `• ${h.title} (${LH.school.subjName(h.sid)}, ${LH.school.dueText(h.due)})`).join('\n')}` : 'Keine offenen Hausübungen.' };
  }
  if ((m => m)(t.match(/^(?:hu|hausubung|hausaufgabe)\s+(.+)/))) {
    const r = parseHw(raw);
    if (r) { LH.school.addHomework(r.title, r.sid, r.due); if (LH.current().name === 'school') LH.rerender(); return { text: `Eingetragen: ${r.title}${r.sid ? ` (${LH.subj(r.sid).name})` : ''}, bis ${LH.fmtDay(r.due)}.` }; }
  }
  if (/fehlerheft/.test(t)) { LH.go('mistakes'); return { text: `Im Fehlerheft sind ${LH.modes.mistakes().length} Karten.` }; }
  // Lernen
  if (/(status|level|wie steh|fortschritt)/.test(t)) {
    const w = LH.weakestTopic(), S_ = S();
    return { text: `Level ${LH.levelOf(S_.xp)} mit ${S_.xp} XP, Streak ${LH.streakNow()} Tage, ${S_.coins} Münzen, ${LH.mmss(S_.breakBank)} Pausenzeit.${w ? ` Am schwächsten: ${w.t.name} in ${w.s.name} (${w.p} %).` : ''}` };
  }
  if (/(frag mich|abfrag|teste mich|quiz mich|pruf mich)/.test(t)) return { text: 'Los geht’s.\n\n' + askQuestion() };
  if (/(was soll ich|lernen heute|heute lernen|womit soll|empfiehl)/.test(t)) {
    const tasks = LH.todayTasks().filter(x => !x.done);
    if (tasks.length) return { text: `Laut Plan: ${tasks[0].p.label} für ${tasks[0].test.title}. Soll ich starten? Sag „Quiz ${LH.subj(tasks[0].test.subjectId).name}“.` };
    const w = LH.weakestTopic(LH.upcoming()[0]?.subjectId);
    return { text: w ? `Nimm dir ${w.t.name} in ${w.s.name} vor. Da stehst du bei ${w.p} %.` : 'Lade zuerst einen Lernzettel hoch, dann kann ich planen.' };
  }
  if ((m => m && (() => { const s = LH.findSubject(m[2]); if (s) { LH.startSession(/karte/.test(m[1]) ? 'flash' : 'quiz', s.id); return true; } })())(t.match(/^(quiz|karten|karteikarten|lerne?)\s+(.+)/))) return { text: 'Viel Erfolg.' };
  if (/(pause|spielzeit)/.test(t)) return { text: `Du hast ${LH.mmss(S().breakBank)} Pausenzeit. Die nächsten ${S().settings.breakMin} Minuten gibt es in ${LH.mmss(Math.max(0, LH.learnSec() - S().learnTick))} Lernzeit.` };
  if (/^(hallo|hi|hey|servus|moin|grus)/.test(t)) return { text: 'Servus. Was brauchst du?' };
  if (/(danke|merci)/.test(t)) return { text: 'Jederzeit.' };
  return null;
}
const WD = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
function parseHw(raw) {
  let t = raw.replace(/^\s*(hü|hu|hausübung|hausaufgabe)\s*/i, '');
  const n = norm(t); let due = null, d = new Date(), m;
  if (/ubermorgen/.test(n)) due = LH.addDays(d, 2);
  else if (/\bmorgen\b/.test(n)) due = LH.addDays(d, 1);
  else if (/\bheute\b/.test(n)) due = d;
  else if ((m = n.match(/in (\d+) tag/))) due = LH.addDays(d, +m[1]);
  else if ((m = n.match(/(\d{1,2})\.(\d{1,2})\.?/))) { due = new Date(d.getFullYear(), +m[2] - 1, +m[1]); if (due < d) due.setFullYear(due.getFullYear() + 1); }
  else { const i = WD.findIndex(w => n.includes(w)); if (i >= 0) { let k = (i - d.getDay() + 7) % 7 || 7; due = LH.addDays(d, k); } }
  due = due || LH.addDays(d, 2);
  const sub = LH.S.subjects.find(s => n.split(' ').includes(norm(s.name)));
  const DROP = new Set(['bis', 'fur', 'fuer', 'am', 'zum', 'ubermorgen', 'morgen', 'heute', ...WD]);
  const title = t.replace(/in \d+ tagen?/i, '').split(/\s+/).filter(w => { const k = norm(w).replace(/[^a-z0-9.]/g, ''); return k && !DROP.has(k) && !/^\d{1,2}\.\d{1,2}\.?$/.test(k) && !(sub && k === norm(sub.name)); }).join(' ').replace(/^[\s:,-]+|[\s:,-]+$/g, '');
  return { title: title || 'Hausübung', sid: sub?.id || null, due: LH.dkey(due) };
}
function searchCards(raw) {
  const STOP = new Set(['was', 'ist', 'eine', 'einer', 'der', 'die', 'das', 'den', 'dem', 'und', 'oder', 'mir', 'bitte', 'erklare', 'erklaer', 'erklaere', 'bedeutet', 'wie', 'funktioniert', 'kannst', 'du', 'mal', 'ein', 'zu', 'von', 'mit', 'sind', 'heisst', 'gibt', 'es', 'man']);
  const q = norm(raw).split(' ').filter(w => !STOP.has(w) && (w.length > 2 || /\d/.test(w)));
  if (!q.length) return null;
  const has = (ws, k) => ws.some(w => w === k || (k.length > 2 && !/^\d+$/.test(k) && w.startsWith(k)));
  const hits = LH.cardsOf().map(c => { const ws = norm(`${c.q} ${c.a} ${LH.topicOf(c.sid, c.tid).name}`).split(' '); return { c, s: q.reduce((a, k) => a + (has(ws, k) ? 1 : 0), 0) }; }).filter(x => x.s).sort((a, b) => b.s - a.s).slice(0, 3);
  return hits.length ? 'Aus deinen Lernzetteln:\n' + hits.map(h => `• ${h.c.q} → **${h.c.a}**`).join('\n') : null;
}

// extra: zusätzlicher Kontext nur für die KI (z. B. der Ausschnitt aus dem Lernzettel), wird nicht angezeigt
async function send(text, extra = '') {
  text = String(text || '').trim(); if (!text || J.busy) return;
  J.busy = true;
  if (!el.classList.contains('open')) open(true);
  log('user', text).textContent = text;
  J.hist.push({ role: 'user', content: extra ? `${text}\n\n${extra}` : text });
  S().stats.jarvis++; LH.checkBadges(); LH.save();
  setState('thinking');
  let res = null;
  try {
    // Mit API-Key: einfache Befehle sofort lokal, alles andere über Claude (mit PC-Werkzeugen)
    // Wissensfragen („Was ist eine CPU?“, „Datum der Revolution“) nie als PC-Befehl deuten
    const n = norm(text), question = !J.pending && (/\b(erklar\w*|erklaer\w*|warum|wieso|weshalb|unterschied|definier\w*|bedeutet)\b|was (ist|sind|war|waren) (ein|eine|der|die|das)\b|wie funktionier/.test(n) || (J.hasKey && n.split(' ').length > 10));
    if (!question) res = await local(text, { allowPc: IS_DESKTOP, fastOnly: J.hasKey });
    if (!res && J.hasKey) {
      const msgs = J.hist.slice(-14);
      while (msgs.length && msgs[0].role !== 'user') msgs.shift();
      const r = await API.jarvis.chat({ messages: msgs, context: LH.contextString(), name: LH.userName() });
      res = r.ok ? { text: r.text || 'Erledigt.', actions: r.actions } : { text: `Ich erreiche die API gerade nicht (${r.error}).` + (searchCards(text) ? '\n\n' + searchCards(text) : '') };
    }
    if (!res) res = { text: searchCards(text) || (IS_DESKTOP ? 'Das kann ich ohne API-Key noch nicht. Probier „öffne Spotify“, „lauter“, „such nach …“, „frag mich ab“ oder hinterlege einen Key in den Optionen.' : (LH.CAN_AI ? 'Dafür brauche ich einen API-Key: kostenlos auf aistudio.google.com/apikey, dann in den Optionen bei JARVIS einfügen. Ohne Key gehen „Frag mich ab“ und „Mein Status“.' : 'Das kann ich hier nicht. Probier „Frag mich ab“ oder „Mein Status“.')) };
  } catch (e) { res = { text: 'Da ist etwas schiefgelaufen: ' + e.message }; }
  setState('idle');
  J.busy = false;
  if (res.text) await reply(res.text, res.actions);
}

// Werkzeuge, die Claude in der App nutzt
async function appTool(name, input) {
  if (name === 'app_add_homework') { const s = input.subject ? LH.findSubject(input.subject) : null; const h = LH.school.addHomework(input.title, s?.id, input.due); if (LH.current().name === 'school' || LH.current().name === 'home') LH.rerender(); return { ok: true, id: h.id }; }
  if (name === 'app_list_homework') return { ok: true, homework: LH.school.openHw().map(h => ({ title: h.title, subject: LH.school.subjName(h.sid), due: h.due })) };
  if (name === 'app_focus') { input.on === false ? LH.focus.stop() : LH.focus.start(); return { ok: true }; }
  if (name === 'app_briefing') return { ok: true, briefing: await LH.briefing.text() };
  if (name === 'app_navigate') { LH.go(input.view); return { ok: true }; }
  if (name === 'app_start_quiz') { const s = LH.findSubject(input.subject || ''); if (!s) return { ok: false, error: 'Fach nicht gefunden' }; LH.startSession(input.mode === 'flash' ? 'flash' : 'quiz', s.id); return { ok: true, subject: s.name }; }
  if (name === 'app_read_lernzettel') {
    const s = LH.findSubject(input.subject || ''); if (!s) return { ok: false, error: 'Fach nicht gefunden', subjects: LH.S.subjects.map(x => x.name) };
    const q = norm(input.topic || ''), list = s.topics.filter(t => !q || norm(t.name).includes(q) || q.includes(norm(t.name)));
    const out = [];
    for (const t of (list.length ? list : s.topics).slice(0, 6)) {
      const r = t.file && LH.CAN_FILES ? await API.files.read(t.file.stored).catch(() => ({})) : {};
      out.push({ lernzettel: t.name, kernaussagen: t.summary, karten: t.cards.slice(0, 40).map(c => `${c.q} → ${c.a}`), text: (r.text || '').slice(0, 8000) });
    }
    return { ok: true, fach: s.name, lernzettel: out.length ? out : 'Keine Lernzettel in diesem Fach' };
  }
  if (name === 'app_add_test') { const s = LH.findSubject(input.subject || ''); if (!s) return { ok: false, error: 'Fach nicht gefunden', subjects: LH.S.subjects.map(x => x.name) }; const t = LH.addTest(s.id, input.title || '', input.date); if (LH.current().name === 'plan' || LH.current().name === 'home') LH.go(LH.current().name); return { ok: !!t }; }
  return { ok: false, error: 'unbekannt' };
}

// ---------- Verdrahtung ----------
$('#rail-j').addEventListener('click', () => open());
$('#jarvis-m')?.addEventListener('click', () => open());
$('#j-close').addEventListener('click', () => open(false));
$('#j-mic').addEventListener('click', listen);
$('#j-form').addEventListener('submit', e => { e.preventDefault(); const i = $('#j-in'); const v = i.value; i.value = ''; send(v); });
$('#j-sugs').addEventListener('click', e => { const b = e.target.closest('[data-sug]'); if (b) send(b.dataset.sug); });
if (IS_DESKTOP) {
  API.jarvis.onPTT(() => listen());
  API.jarvis.onEvent(ev => { if (ev.kind === 'timer') { open(true); reply(`⏰ ${ev.text}`); } });
}

LH.jarvis = {
  open, send, say, appTool, resetStt, reply,
  get hasKey() { return J.hasKey; },
  async refreshKey() { J.hasKey = LH.CAN_AI ? await API.jarvis.hasKey() : false; },
  async boot() {
    await this.refreshKey();
    if (!IS_DESKTOP) $('#j-hint').textContent = 'Tippen zum Sprechen'; // kein Tastenkürzel am Handy
    setState('idle');
    const want = S().settings.jarvisOpen ?? innerWidth >= 1280;
    const briefingDue = S().settings.briefing && S().lastBriefing !== LH.dkey() && !LH.IS_REMOTE && innerWidth >= 760;
    if (want) setTimeout(() => open(true, briefingDue), LH.reduced() ? 0 : 500);
    sugs();
  }
};
})();

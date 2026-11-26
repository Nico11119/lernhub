// ===================== LernHub – KI-Kern (Laptop und Handy gemeinsam) =====================
// Claude oder Google Gemini. Am Laptop läuft das im Hauptprozess (src/ai.js), am Handy direkt in der App.
// createAI({ getKey, getModel, platform, extraTools, runExtra }) liefert generateCards, grade, makeExam, gradeExam, chat.
(function (root) {
'use strict';

// Anthropic-Keys beginnen immer mit "sk-ant-"; jeder andere Key gilt als Google-Key (AI Studio, kostenlos).
const isGoogle = key => !!key && !/^sk-ant-/.test(key);
const GEMINI = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];
const textOf = r => (r.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
const jsonOf = t => JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));

// ---------- Gemini: übersetzt das Claude-Format hin und zurück ----------
function toGemini({ system, tools, messages }) {
  const names = {};
  const part = b => {
    if (b._g) return b._g; // Originalteil von Gemini (inkl. thoughtSignature) unverändert zurückgeben
    if (b.type === 'text') return { text: b.text };
    if (b.type === 'image' || b.type === 'document') return { inlineData: { mimeType: b.source.media_type, data: b.source.data } };
    if (b.type === 'tool_use') return { functionCall: { name: b.name, args: b.input || {} } };
    if (b.type === 'tool_result') return { functionResponse: { name: names[b.tool_use_id] || 'tool', response: { content: b.content } } };
    return { text: '' };
  };
  const contents = messages.map(m => {
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content || [];
    blocks.forEach(b => { if (b.type === 'tool_use') names[b.id] = b.name; });
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: blocks.map(part) };
  });
  const req = { contents };
  if (system) req.systemInstruction = { parts: [{ text: system }] };
  if (tools?.length) req.tools = [{ functionDeclarations: tools.map(t => ({ name: t.name, description: t.description, ...(Object.keys(t.input_schema?.properties || {}).length ? { parameters: t.input_schema } : {}) })) }];
  return req;
}
function fromGemini(json) {
  const parts = json.candidates?.[0]?.content?.parts || [];
  const content = [];
  parts.forEach((p, i) => {
    if (p.functionCall) content.push({ type: 'tool_use', id: `g${Date.now()}_${i}`, name: p.functionCall.name, input: p.functionCall.args || {}, _g: p });
    else if (p.text != null && !p.thought) content.push({ type: 'text', text: p.text, _g: p });
  });
  return { content, stop_reason: content.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn' };
}

const APP_TOOLS = [
  { name: 'app_navigate', description: 'Wechselt in LernHub die Ansicht (timetable = Stundenplan, school = HÜs und Noten, mistakes = Fehlerheft).', input_schema: { type: 'object', properties: { view: { type: 'string', enum: ['home', 'timetable', 'subjects', 'plan', 'school', 'mistakes', 'achievements', 'shop', 'break'] } }, required: ['view'] } },
  { name: 'app_add_homework', description: 'Trägt eine Hausübung ein.', input_schema: { type: 'object', properties: { title: { type: 'string' }, subject: { type: 'string' }, due: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['title', 'due'] } },
  { name: 'app_list_homework', description: 'Listet offene Hausübungen.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'app_focus', description: 'Startet oder beendet den Fokusmodus (Timer, zählt als Lernzeit).', input_schema: { type: 'object', properties: { on: { type: 'boolean' } }, required: [] } },
  { name: 'app_briefing', description: 'Liefert den Tagesüberblick (Wetter, Tests, HÜs, Plan).', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'app_start_quiz', description: 'Startet in LernHub ein Quiz oder Karteikarten zu einem Fach.', input_schema: { type: 'object', properties: { subject: { type: 'string' }, mode: { type: 'string', enum: ['quiz', 'flash'] } }, required: ['subject'] } },
  { name: 'app_read_lernzettel', description: 'Liest die Lernzettel zu einem Fach (Text der Datei, Kernaussagen, Karteikarten). Nutze das, wenn nach dem Inhalt der Unterlagen gefragt wird oder du dich an den eigenen Stoff halten sollst.', input_schema: { type: 'object', properties: { subject: { type: 'string' }, topic: { type: 'string', description: 'Name des Lernzettels, optional' } }, required: ['subject'] } },
  { name: 'app_add_test', description: 'Trägt einen Test/eine Schularbeit in den Lernplan ein.', input_schema: { type: 'object', properties: { subject: { type: 'string' }, title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['subject', 'date'] } }
];

function createAI({ getKey, getModel = () => null, platform = 'desktop', extraTools = () => [], runExtra = null }) {
  const browser = platform !== 'desktop';
  const model = () => {
    const m = getModel();
    if (isGoogle(getKey())) return /^gemini/.test(m || '') ? m : 'gemini-flash-latest';
    return m && !/^gemini/.test(m) ? m : 'claude-sonnet-5-5';
  };
  let geminiOk = null;

  // json: true → Gemini liefert garantiert reines JSON (lange Kartenlisten brachen sonst manchmal ab)
  async function call({ json: wantJson, ...body }) {
    const key = getKey();
    if (!key) throw new Error('no-key');
    if (isGoogle(key)) return callGemini(key, body, wantJson);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', ...(browser ? { 'anthropic-dangerous-direct-browser-access': 'true' } : {}) },
      body: JSON.stringify({ model: model(), ...body }),
      signal: AbortSignal.timeout(180000)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || `API-Fehler ${res.status}`);
    return json;
  }
  // Gratis-Modelle von Google sind oft überlastet (503) oder antworten gar nicht: der Reihe nach probieren,
  // mit Zeitlimit, und das zuletzt funktionierende Modell zuerst nehmen.
  async function callGemini(key, body, wantJson) {
    const pick = model(), list = [...new Set([geminiOk, pick !== 'gemini-flash-latest' && pick, ...GEMINI].filter(Boolean))];
    const req = JSON.stringify({ ...toGemini(body), ...(wantJson ? { generationConfig: { responseMimeType: 'application/json' } } : {}) }), start = Date.now();
    const big = (body.max_tokens || 0) > 2000, limit = big ? 120000 : 40000;
    let last = '';
    for (const m of list) {
      if (Date.now() - start > (big ? 240000 : 90000)) break;
      let res, json;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: req, signal: AbortSignal.timeout(limit) });
        json = await res.json().catch(() => ({}));
      } catch (e) { last = e.name === 'TimeoutError' ? 'Google antwortet nicht' : 'Keine Verbindung zu Google'; continue; }
      if (res.ok) { geminiOk = m; return fromGemini(json); }
      if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error(json?.error?.message || `API-Fehler ${res.status}`); // Key/Anfrage falsch: anderes Modell hilft nicht
      last = res.status === 429 ? 'Gratis-Limit von Google erreicht' : res.status === 503 ? 'Google ist gerade überlastet' : json?.error?.message || `API-Fehler ${res.status}`;
      if (geminiOk === m) geminiOk = null;
    }
    throw new Error(`${last || 'Google antwortet nicht'} – in ein paar Minuten nochmal probieren.`);
  }

  // Lernzettel → Themen, Kernaussagen, Karten
  async function generateCards(doc, subjectName) {
    const content = [];
    if (doc.kind === 'pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: doc.base64 } });
    else if (doc.kind === 'image') content.push({ type: 'image', source: { type: 'base64', media_type: doc.mime, data: doc.base64 } });
    else content.push({ type: 'text', text: `Lernzettel „${doc.name}“:\n\n${String(doc.text || '').slice(0, 120000)}` });
    content.push({ type: 'text', text: `Erstelle aus diesem Lernzettel für das Fach „${subjectName}“ Lernmaterial für einen Schüler (Österreich, HTL).\n` +
      'Antworte NUR mit JSON in genau dieser Form:\n{"topics":[{"name":"Thema","summary":["Kernaussage 1","…"],"cards":[{"q":"Frage","a":"richtige Antwort","wrong":["falsch 1","falsch 2","falsch 3"]}]}]}\n' +
      'Regeln:\n' +
      '- 1–8 Themen nach dem Aufbau des Zettels (Kapitel/Wochen), mit klarem Themennamen.\n' +
      '- Übungsteile (z. B. „Übung“, „Quiz“, „Aufgaben“, „Teste dich“, „Befehle schreiben“, Lückentexte, Probe-Fragen), egal ob am Schluss oder zwischendrin, gehören NICHT in die Kernaussagen. Nutze sie nur als Vorbild dafür, was abgefragt wird.\n' +
      '- Pro Thema 4–10 Kernaussagen: vollständige, verständliche Sätze mit dem wichtigsten Stoff.\n' +
      '- Pro Thema 8–20 Karten, die den ganzen Stoff abdecken (Begriffe, Befehle, Abläufe, Unterschiede). Jede Frage muss für sich allein verständlich und eindeutig beantwortbar sein, keine Fragen zu Überschriften, Datum oder Aufbau des Zettels.\n' +
      '- Antwort: kurz (höchstens 12 Wörter), genau das, was gefragt ist.\n' +
      '- "wrong": 3 falsche, aber plausible Antworten zur selben Frage (gleiche Art und Länge wie die richtige, z. B. andere Befehle/Begriffe aus demselben Thema), eindeutig falsch.\n' +
      '- Nur Inhalte aus dem Zettel, nichts erfinden. Deutsch (Fachbegriffe und Befehle wie im Zettel).' });
    const r = await call({ max_tokens: 16000, json: true, messages: [{ role: 'user', content }] });
    return (jsonOf(textOf(r)).topics || []).filter(x => x && x.name && Array.isArray(x.cards));
  }
  // Vokabelliste (PDF, Foto, Text) → Wortpaare
  async function extractVocab(doc) {
    const content = [];
    if (doc.kind === 'pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: doc.base64 } });
    else if (doc.kind === 'image') content.push({ type: 'image', source: { type: 'base64', media_type: doc.mime, data: doc.base64 } });
    else content.push({ type: 'text', text: `Vokabelliste „${doc.name}“:\n\n${String(doc.text || '').slice(0, 120000)}` });
    content.push({ type: 'text', text: 'Das ist eine Vokabelliste für die Schule. Übernimm ALLE Vokabeln genau so, wie sie dastehen, in der Reihenfolge der Liste – nichts weglassen, nichts erfinden, keine Überschriften oder Seitenzahlen. ' +
      'a = fremdsprachiges Wort/Ausdruck (z. B. Englisch, inkl. „to“ bei Verben), b = deutsche Bedeutung (mehrere Bedeutungen mit Komma). Beispielsätze weglassen. ' +
      'Antworte NUR mit JSON: {"lang":"Englisch","words":[{"a":"to achieve","b":"erreichen, schaffen"}]}' });
    // Überlastung (Google/Anthropic) ist meist nach ein paar Sekunden vorbei – sonst landet man bei der viel schlechteren Offline-Erkennung
    let r;
    for (let i = 0; ; i++) {
      try { r = await call({ max_tokens: 16000, json: true, messages: [{ role: 'user', content }] }); break; }
      catch (e) { if (i >= 2 || !/überlastet|overload|429|503|rate|quota|zu viele/i.test(String(e.message))) throw e; await new Promise(res => setTimeout(res, [4000, 10000][i])); }
    }
    const j = jsonOf(textOf(r));
    return { lang: String(j.lang || ''), words: (j.words || []).filter(w => w && w.a && w.b).map(w => ({ a: String(w.a).trim(), b: String(w.b).trim() })) };
  }
  // Freie Antwort bewerten
  async function grade({ q, a, given }) {
    const r = await call({ max_tokens: 200, json: true, messages: [{ role: 'user', content: `Frage: ${q}\nMusterlösung: ${a}\nAntwort des Schülers: ${given}\n\nIst die Antwort inhaltlich richtig (Tippfehler und andere Formulierungen sind okay)? Antworte NUR mit JSON: {"ok": true|false, "feedback": "ein kurzer Satz auf Deutsch"}` }] });
    return jsonOf(textOf(r));
  }
  // KI-Probeschularbeit
  async function makeExam({ subjectName, material, n = 7 }) {
    const r = await call({ max_tokens: 6000, json: true, messages: [{ role: 'user', content:
      `Unterlagen für das Fach „${subjectName}“ (HTL, Österreich):\n\n${material}\n\n` +
      `Schreib daraus eine Probeschularbeit mit ${n} Aufgaben, wie ein Lehrer sie stellen würde. Mische: Wissensfragen, Verständnisfragen („Erkläre …“, „Vergleiche …“) und – wo der Stoff es hergibt – Anwendungs- oder Rechenaufgaben mit neuen Zahlen. ` +
      'Nicht einfach die Karteikarten abschreiben. Nur Stoff aus den Unterlagen. Sprich den Schüler mit „du“ an. Punkte je nach Umfang 2–6. ' +
      'Antworte NUR mit JSON: {"tasks":[{"q":"Aufgabentext","points":4,"solution":"Musterlösung bzw. Lösungsweg, knapp"}]}' }] });
    const tasks = (jsonOf(textOf(r)).tasks || []).filter(t => t && t.q && t.solution)
      .map(t => ({ q: String(t.q), solution: String(t.solution), points: Math.max(1, Math.min(10, Math.round(+t.points) || 3)) }));
    if (!tasks.length) throw new Error('Die KI hat keine Aufgaben geliefert');
    return { tasks };
  }
  // Formeln aus den Lernzetteln für den Formellerner (Schreibweise passend zu formula-core.js)
  async function extractFormulas({ subjectName, material }) {
    const r = await call({ max_tokens: 6000, json: true, messages: [{ role: 'user', content:
      `Unterlagen für das Fach „${subjectName}“ (HTL, Österreich):

${material}

` +
      'Suche ALLE Formeln/Gleichungen heraus, die man für einen Test auswendig können muss (keine Zahlenbeispiele, keine Rechnungen mit eingesetzten Werten, nichts erfinden). ' +
      'Schreibweise: genau ein „=“, Größen mit einem Buchstaben plus optional Index mit Unterstrich (U, R_ges, U_0, ΔT), Mal mit *, Bruch mit / und Klammern, Hochzahl mit ^, Wurzel mit sqrt(...), π als pi. Keine Einheiten in der Formel. ' +
      'name = kurzer deutscher Name, note = was die Größen bedeuten (kurz). ' +
      'Antworte NUR mit JSON: {"formulas":[{"name":"Ohmsches Gesetz","f":"U = R*I","note":"U Spannung, R Widerstand, I Strom"}]}' }] });
    return { formulas: (jsonOf(textOf(r)).formulas || []).filter(x => x && x.f).map(x => ({ name: String(x.name || '').trim(), f: String(x.f).trim(), note: String(x.note || '').trim() })) };
  }
  async function gradeExam({ subjectName, tasks, answers }) {
    const list = tasks.map((t, i) => `Aufgabe ${i + 1} (${t.points} P): ${t.q}\nMusterlösung: ${t.solution}\nAntwort des Schülers: ${String(answers[i] || '').trim() || '(leer)'}`).join('\n\n');
    const r = await call({ max_tokens: 3000, json: true, messages: [{ role: 'user', content:
      `Korrigiere diese Probeschularbeit im Fach „${subjectName}“ fair wie ein HTL-Lehrer. Teilpunkte sind erlaubt, andere richtige Lösungswege und Formulierungen zählen voll, leere Antworten 0 Punkte.\n\n${list}\n\n` +
      'Antworte NUR mit JSON: {"results":[{"points":3,"feedback":"1–2 Sätze: was passt, was fehlt"}],"summary":"2 Sätze Gesamtfeedback mit Tipp, was du wiederholen solltest"}' }] });
    const j = jsonOf(textOf(r));
    const results = tasks.map((t, i) => { const x = j.results?.[i] || {}; return { points: Math.max(0, Math.min(t.points, Math.round((+x.points || 0) * 2) / 2)), feedback: String(x.feedback || '') }; });
    return { results, summary: String(j.summary || '') };
  }

  // JARVIS mit Werkzeugen. askApp führt app_*-Werkzeuge in der Oberfläche aus.
  async function chat({ messages, context, name }, askApp) {
    const who = String(name || '').trim().slice(0, 40) || 'der Nutzer';
    const where = browser ? 'der LernHub-App auf dem Handy' : 'der Desktop-App LernHub auf dem eigenen Windows-Laptop';
    const system =
      `Du bist JARVIS, der persönliche Assistent von ${who} in ${where} (Schüler:in). Sprich ${who === 'der Nutzer' ? 'die Person' : who} mit „du“ an. ` +
      'Du bist eine vollwertige KI: Beantworte jede Frage – Allgemeinwissen, Schulstoff (HTL: Mathe, SYT, Programmieren, Elektrotechnik, Sprachen …), Hausübungshilfe, Code, Texte, Alltag. ' +
      'Erkläre wie ein guter Nachhilfelehrer: verständlich, mit Beispiel, bei Rechnungen mit Lösungsweg. Wenn es um den eigenen Stoff geht, lies mit app_read_lernzettel nach. ' +
      'Sprich Deutsch und natürlich. Smalltalk und Befehle: 1–3 Sätze. Erklärungen und Fragen: so ausführlich wie nötig, mit kurzen Absätzen oder „- “-Listen und **fett** für Wichtiges (keine Tabellen, keine Überschriften mit #). ' +
      'Wenn du etwas nicht sicher weißt oder es aktuelle Infos bräuchte, sag das ehrlich statt zu raten. Ein Hauch trockener Butler-Humor ist erlaubt. ' +
      (browser ? 'Den Computer kannst du von hier aus nicht steuern. ' :
        'Du steuerst auch den PC über Werkzeuge. Nutze Werkzeuge direkt, wenn die Absicht klar ist. Für run_powershell und power wird automatisch um Bestätigung gebeten – erkläre im purpose-Feld ehrlich, was passiert. ' +
        `Führe nie etwas aus, das Dateien löscht, Sicherheitseinstellungen ändert oder Daten ins Internet schickt, ohne dass ${who} genau das verlangt hat. `) +
      `\n\nJetzt: ${new Date().toLocaleString('de-AT')}\nLernstand:\n${context || ''}`;
    const tools = [...extraTools(), ...APP_TOOLS];
    const msgs = messages.map(m => ({ role: m.role, content: m.content }));
    const actions = [];
    for (let step = 0; step < 6; step++) {
      const r = await call({ max_tokens: 2500, system, tools, messages: msgs });
      msgs.push({ role: 'assistant', content: r.content });
      const uses = (r.content || []).filter(b => b.type === 'tool_use');
      if (r.stop_reason !== 'tool_use' || !uses.length) return { ok: true, text: textOf(r), actions };
      const results = [];
      for (const u of uses) {
        const out = u.name.startsWith('app_') || !runExtra ? await askApp(u.name, u.input) : await runExtra(u.name, u.input);
        actions.push({ tool: u.name, input: u.input, ok: out?.ok !== false });
        results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out).slice(0, 6000) });
      }
      msgs.push({ role: 'user', content: results });
    }
    return { ok: true, text: 'Erledigt.', actions };
  }

  return { call, model, generateCards, extractVocab, grade, makeExam, gradeExam, extractFormulas, chat };
}

// Ohne KI: Zeilen wie „word – Wort“, „word<TAB>Wort“, „word = Wort“, „word;Wort“ oder mit 2+ Leerzeichen dazwischen
function parseVocabText(text) {
  const words = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim(); if (line.length < 3) continue;
    const m = line.split(/\t+|\s+[–—-]\s+|\s*=\s*|\s*;\s*|\s{2,}/).map(x => x.trim()).filter(Boolean);
    if (m.length >= 2 && m[0].length <= 80 && m[1].length <= 120) words.push({ a: m[0], b: m.slice(1).join(', ') });
  }
  return words;
}
const api = { createAI, isGoogle, parseVocabText };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LHAI = api;
})(typeof window !== 'undefined' ? window : globalThis);

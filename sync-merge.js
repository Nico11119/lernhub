// ===================== LernHub – Abgleich zweier Geräte (3-Wege-Zusammenführung) =====================
// base = gemeinsamer Stand beim letzten Abgleich, a = dieses Gerät, b = das andere Gerät.
// Zähler (Lernzeit, XP, Münzen, …) werden als Zuwachs seit dem letzten Abgleich addiert:
// base 100 min, Laptop 105, Handy 110 → 115. Listen mit IDs werden vereint, Gelöschtes bleibt gelöscht,
// sonst gewinnt die Seite, die etwas geändert hat (beide geändert: die zuletzt gespeicherte).
(function (root) {
'use strict';

const ADD = ['xp', 'coins', 'studySec', 'breakBank', 'learnTick', 'stats.*', 'history.*', 'subjMin.*'];
const MAX = ['scores.*', 'streak.best', 'runner.levels.*', 'settings.untisLast', 'lastBriefing', 'savedAt',
  'goals.list.*.p', 'goals.list.*.done', 'goals.weekDone', 'subjects.*.topics.*.marks.*.card'];
const UNION = ['badges', 'shop.owned', 'settings.untisHidden'];
// gehört zum Gerät, wird nie übernommen
const LOCAL = ['rev', 'syncBases', 'syncPeers','settings.jarvisOpen', 'settings.voiceName', 'settings.stt', 'settings.theme',
  'settings.reduceMotion', 'settings.focusApps', 'settings.focusPlaylist'];

const match = (rules, path) => rules.some(r => { const p = r.split('.'); return p.length === path.length && p.every((s, i) => s === '*' || s === path[i]); });
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const idList = v => Array.isArray(v) && v.length > 0 && v.every(x => isObj(x) && x.id != null);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));

function merge(path, base, a, b, aNewer) {
  if (match(LOCAL, path)) return clone(a);
  if (a === undefined && b === undefined) return undefined;
  if (match(ADD, path)) return Math.max(0, (+a || 0) + (+b || 0) - (+base || 0));
  if (match(MAX, path)) {
    if (typeof a === 'boolean' || typeof b === 'boolean') return !!a || !!b;
    if (a == null) return clone(b); if (b == null) return clone(a);
    return a >= b ? a : b;
  }
  if (match(UNION, path)) return [...new Set([...(a || []), ...(b || [])])];
  const p = path.join('.');
  if (p === 'streak') return mergeStreak(a, b);
  if (p === 'goals') return mergeGoals(base, a, b, aNewer, path);
  if (p === 'exams') return unionBy([...(a || []), ...(b || [])], JSON.stringify);
  if (path.length === 2 && path[0] === 'cardStats') return mergeCard(base, a, b);
  // Liste mit IDs (Fächer, Lernzettel, Karten, Tests, HÜs, Noten, …)
  if ((idList(a) || idList(b) || idList(base)) && [a, b, base].every(x => x == null || Array.isArray(x))) return mergeIds(path, base || [], a || [], b || [], aNewer);
  // Objekt: Schlüssel einzeln zusammenführen
  if ((isObj(a) || a == null) && (isObj(b) || b == null) && (isObj(a) || isObj(b))) {
    const out = {}, B = isObj(base) ? base : {};
    for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
      const inA = a && k in a, inB = b && k in b;
      if (k in B && (!inA || !inB) && !match(ADD, [...path, k])) { // auf einer Seite gelöscht
        const other = inA ? a[k] : b[k];
        if (same(other, B[k])) continue;                              // andere Seite unverändert → gelöscht lassen
      }
      const v = merge([...path, k], B[k], a ? a[k] : undefined, b ? b[k] : undefined, aNewer);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  // Einzelwert: wer geändert hat, gewinnt; beide geändert → zuletzt gespeichert
  if (same(a, base)) return clone(b === undefined ? a : b);
  if (same(b, base) || b === undefined) return clone(a);
  return clone(aNewer ? a : b);
}
function mergeIds(path, base, a, b, aNewer) {
  const ia = new Map(a.map(x => [x.id, x])), ib = new Map(b.map(x => [x.id, x])), ibase = new Map(base.map(x => [x.id, x]));
  const order = [...a.map(x => x.id), ...b.map(x => x.id).filter(id => !ia.has(id))];
  const out = [];
  for (const id of order) {
    const x = ia.get(id), y = ib.get(id), z = ibase.get(id);
    if (z && (!x || !y)) {                       // war schon da und fehlt jetzt auf einer Seite → gelöscht
      const rest = x || y;
      if (same(rest, z)) continue;               // nur gelöscht, wenn die andere Seite es nicht geändert hat
    }
    if (!x || !y) { out.push(clone(x || y)); continue; }
    out.push(merge([...path, '*'], z, x, y, aNewer));
  }
  return out;
}
function mergeCard(base, a, b) {
  if (!a || !b) return clone(a || b);
  const B = base || { r: 0, w: 0 };
  const later = (b.last || 0) > (a.last || 0) ? b : a;
  return { box: later.box, r: Math.max(0, a.r + b.r - (B.r || 0)), w: Math.max(0, a.w + b.w - (B.w || 0)), last: Math.max(a.last || 0, b.last || 0) || null };
}
function mergeStreak(a, b) {
  if (!a || !b) return clone(a || b);
  const later = (b.last || '') > (a.last || '') ? b : (a.last || '') > (b.last || '') ? a : (b.count > a.count ? b : a);
  return { count: later.count, last: later.last, best: Math.max(a.best || 0, b.best || 0, later.count || 0) };
}
function mergeGoals(base, a, b, aNewer, path) {
  if (!a || !b) return clone(a || b);
  if (a.day !== b.day) {                        // anderer Tag: die neueren Tagesziele zählen
    const newer = (a.day || '') > (b.day || '') ? a : b, g = clone(newer);
    g.week = (a.week || '') > (b.week || '') ? a.week : b.week;
    g.weekDone = g.week === a.week && g.week === b.week ? !!(a.weekDone || b.weekDone) : (g.week === a.week ? a.weekDone : b.weekDone);
    return g;
  }
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = merge([...path, k], base?.[k], a[k], b[k], aNewer);
  return out;
}
const unionBy = (list, key) => { const seen = new Set(); return list.filter(x => { const k = key(x); return !seen.has(k) && seen.add(k); }).map(clone); };

// Noch nie abgeglichen: gleichnamige Fächer, Lernzettel und Karten (z. B. die Startfächer) zusammenlegen,
// indem die IDs von b auf die von a umgeschrieben werden – sonst wäre alles doppelt.
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
function alignIds(a, b) {
  const map = {};
  for (const sb of b.subjects || []) {
    const sa = (a.subjects || []).find(x => norm(x.name) === norm(sb.name)); if (!sa) continue;
    map[sb.id] = sa.id;
    for (const tb of sb.topics || []) {
      const ta = (sa.topics || []).find(x => norm(x.name) === norm(tb.name)); if (!ta) continue;
      map[tb.id] = ta.id;
      for (const cb of tb.cards || []) { const ca = (ta.cards || []).find(x => norm(x.q) === norm(cb.q)); if (ca) map[cb.id] = ca.id; }
    }
  }
  let json = JSON.stringify(b);
  for (const [from, to] of Object.entries(map)) if (from !== to) json = json.split(JSON.stringify(from)).join(JSON.stringify(to));
  return JSON.parse(json);
}
// Ein Gerät, auf dem noch nichts gelernt wurde, übernimmt beim ersten Abgleich einfach den anderen Stand.
const fresh = s => !(s.xp || s.studySec || (s.stats?.correct || 0) + (s.stats?.wrong || 0) || s.homework?.length || s.grades?.length || s.exams?.length);

// Ergebnis ohne gerätebezogene Teile – das ist der neue gemeinsame Stand („base“)
function snapshot(s) { const c = clone(s); delete c.syncBases; delete c.syncPeers; delete c.rev; return c; }

function syncMerge(base, a, b) {
  const aNewer = (a.savedAt || 0) >= (b.savedAt || 0);
  if (!base) {
    if (fresh(a) && !fresh(b)) { const out = clone(b); for (const k of LOCAL) setPath(out, k, getPath(a, k)); return out; }
    if (!fresh(a) || !fresh(b)) b = alignIds(a, b);
  }
  return merge([], base ? snapshot(base) : null, a, b, aNewer);
}
const getPath = (o, p) => p.split('.').reduce((x, k) => x?.[k], o);
function setPath(o, p, v) { const ks = p.split('.'), last = ks.pop(), t = ks.reduce((x, k) => (x[k] ||= {}), o); if (v === undefined) delete t[last]; else t[last] = clone(v); }

// ---------- Abgleich-Dateien ----------
// syncBases: 'out:<id>' = eigener exportierter Stand, 'in:<Gerät>' = zuletzt übernommener Stand des anderen Geräts.
// Jede Datei sagt in „got“, welche Datei des Empfängers schon eingeflossen ist. Gemeinsame Basis ist der neueste
// Stand, den nachweislich beide enthalten – so wird beim Zusammenzählen nichts doppelt gezählt.
function makeExport(state, me, id, name) {
  const b = state.syncBases = { ...(state.syncBases || {}) };
  Object.keys(b).filter(k => k.startsWith('out:')).sort((x, y) => (b[x].snap.savedAt || 0) - (b[y].snap.savedAt || 0)).slice(0, -2).forEach(k => delete b[k]);
  const snap = snapshot(state);
  b['out:' + id] = { id, snap };
  const got = Object.fromEntries(Object.keys(b).filter(k => k.startsWith('in:')).map(k => [k.slice(3), b[k].id]));
  return { format: 'lernhub-abgleich', v: 1, from: me, name, id, got, state: snap };
}
function baseFor(state, peer, got) {
  const b = state.syncBases || {}, cands = [b['in:' + peer], got && b['out:' + got]].filter(Boolean);
  return cands.sort((x, y) => (y.snap.savedAt || 0) - (x.snap.savedAt || 0))[0]?.snap || null;
}
// Gibt den neuen Stand zurück (oder wirft mit verständlicher Meldung)
function importExport(state, me, f) {
  if (f?.format !== 'lernhub-abgleich' || !f.state || typeof f.state !== 'object' || !Array.isArray(f.state.subjects) || !f.from || !f.id) throw new Error('Das ist keine LernHub-Abgleich-Datei');
  if (f.from === me) throw new Error('Diese Datei kommt von diesem Gerät – öffne sie auf dem anderen');
  if (state.syncBases?.['in:' + f.from]?.id === f.id) throw new Error('Diese Datei wurde hier schon eingelesen');
  const merged = syncMerge(baseFor(state, f.from, f.got?.[me]), state, f.state);
  merged.rev = state.rev;
  merged.syncBases = { ...(state.syncBases || {}), ['in:' + f.from]: { id: f.id, snap: snapshot(f.state) } };
  merged.syncPeers = { ...(state.syncPeers || {}), [f.from]: { name: String(f.name || 'Gerät').slice(0, 40), at: new Date().toISOString() } };
  return merged;
}

const api = { syncMerge, snapshot, makeExport, importExport, baseFor };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LHMerge = api;
})(typeof window !== 'undefined' ? window : globalThis);

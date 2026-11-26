// ===================== LernHub – Formelprüfer (Rechenkern) =====================
// Prüft nicht den Text, sondern rechnet: Zufallswerte für alle Größen einsetzen und schauen,
// ob die eingegebene Gleichung dieselbe ist (auch umgestellt: U = R·I ≡ I = U/R ≡ R = U : I).
(function (root) {
'use strict';
const FUN = { sqrt: Math.sqrt, wurzel: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, ln: Math.log, log: Math.log10, lg: Math.log10, exp: Math.exp, abs: Math.abs };
const R = Math.PI / 180;
const FUN_DEG = { ...FUN, sin: x => Math.sin(x * R), cos: x => Math.cos(x * R), tan: x => Math.tan(x * R), asin: x => Math.asin(x) / R, acos: x => Math.acos(x) / R, atan: x => Math.atan(x) / R };
const CONST = { pi: Math.PI, 'π': Math.PI };
const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = { '²': '^2', '³': '^3', '¹': '^1', '⁴': '^4', '⁻¹': '^(-1)', '⁻²': '^(-2)' };

function normalize(s) {
  return String(s || '')
    .replace(/⁻[¹²]|[²³¹⁴]/g, m => SUP[m])
    .replace(/[₀-₉]/g, c => SUB.indexOf(c))
    .replace(/[·×⋅∙]/g, '*').replace(/[÷:]/g, '/').replace(/[−–—]/g, '-')
    .replace(/(\d),(\d)/g, '$1.$2').replace(/√/g, ' sqrt ').replace(/\\cdot|\\times/g, '*')
    .replace(/[{}]/g, m => m === '{' ? '(' : ')').trim();
}
const isL = c => /\p{L}/u.test(c);
// Bezeichner: Buchstabenfolge mit optionalem Index (R1, U_0, R_ges). Unbekannte Folgen werden in bekannte Größen zerlegt (RI → R·I).
function tokenize(src, known) {
  const s = normalize(src), out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^\d+(?:\.\d+)?(?:e[-+]?\d+)?/i.exec(s.slice(i));
    if (num) { out.push({ t: 'n', v: +num[0] }); i += num[0].length; continue; }
    if (isL(c)) {
      let j = i; while (j < s.length && (isL(s[j]) || /[\d_']/.test(s[j]))) j++;
      out.push(...splitIdent(s.slice(i, j), known)); i = j; continue;
    }
    if ('+-*/^()='.includes(c)) { out.push({ t: c }); i++; continue; }
    throw new Error(`Unbekanntes Zeichen „${c}“`);
  }
  return out;
}
function splitIdent(w, known) {
  const lw = w.toLowerCase();
  if (FUN[lw]) return [{ t: 'f', v: lw }];
  if (CONST[lw] && !known?.has(w)) return [{ t: 'c', v: lw }];
  if (!known || known.has(w)) return [{ t: 'i', v: w }];
  // längste bekannte Größe / Funktion vorne abschneiden
  const names = [...known, ...Object.keys(FUN), ...Object.keys(CONST)].sort((a, b) => b.length - a.length);
  const res = []; let rest = w;
  while (rest) {
    const n = names.find(x => rest.startsWith(x) || (FUN[x] && rest.toLowerCase().startsWith(x)));
    if (!n) return [{ t: 'i', v: w }]; // nicht zerlegbar → als eigene (unbekannte) Größe
    res.push(...splitIdent(rest.slice(0, n.length), known)); rest = rest.slice(n.length);
  }
  return res;
}
// Rekursiver Abstieg → Funktion env => Zahl
function parseExpr(tokens, funs = FUN) {
  let p = 0;
  const peek = () => tokens[p], eat = t => (tokens[p]?.t === t ? tokens[p++] : null);
  const startsAtom = tk => tk && ['n', 'i', 'c', 'f', '('].includes(tk.t);
  function expr() { let a = term(); for (;;) { if (eat('+')) { const x = a, y = term(); a = e => x(e) + y(e); } else if (eat('-')) { const x = a, y = term(); a = e => x(e) - y(e); } else return a; } }
  function term() {
    let a = unary();
    for (;;) {
      if (eat('*')) { const x = a, y = unary(); a = e => x(e) * y(e); }
      else if (eat('/')) { const x = a, y = unary(); a = e => x(e) / y(e); }
      else if (startsAtom(peek())) { const x = a, y = power(); a = e => x(e) * y(e); } // 2πr, R I
      else return a;
    }
  }
  function unary() { if (eat('-')) { const x = unary(); return e => -x(e); } eat('+'); return power(); }
  function power() { const b = atom(); if (eat('^')) { const x = unary(); return e => Math.pow(b(e), x(e)); } return b; }
  function atom() {
    const tk = tokens[p++];
    if (!tk) throw new Error('Formel hört zu früh auf');
    if (tk.t === 'n') return () => tk.v;
    if (tk.t === 'c') return () => CONST[tk.v];
    if (tk.t === 'i') return e => e[tk.v];
    if (tk.t === 'f') { const f = funs[tk.v], x = power(); return e => f(x(e)); }
    if (tk.t === '(') { const x = expr(); if (!eat(')')) throw new Error('Klammer fehlt'); return x; }
    throw new Error(`„${tk.t}“ an der falschen Stelle`);
  }
  const f = expr();
  if (p < tokens.length) throw new Error(`„${tokens[p].t === 'i' ? tokens[p].v : tokens[p].t}“ an der falschen Stelle`);
  return f;
}
function parse(src, known) {
  const tk = tokenize(src, known), eq = tk.filter(t => t.t === '=').length;
  if (eq > 1) throw new Error('Nur ein „=“ erlaubt');
  const at = tk.findIndex(t => t.t === '='), L = eq ? tk.slice(0, at) : null, R = eq ? tk.slice(at + 1) : tk;
  if (eq && (!L.length || !R.length)) throw new Error('Links oder rechts vom „=“ fehlt etwas');
  const vars = [...new Set(tk.filter(t => t.t === 'i').map(t => t.v))];
  return { lhs: L && parseExpr(L), rhs: parseExpr(R), vars, lhsVar: L && L.length === 1 && L[0].t === 'i' ? L[0].v : null, rhsVars: new Set(R.filter(t => t.t === 'i').map(t => t.v)) };
}
// Größen der gespeicherten Formel (für Umstell-Aufgaben)
function varsOf(src) { try { return parse(src).vars; } catch { return []; } }

// v so bestimmen, dass die gespeicherte Formel stimmt (Sekantenverfahren, meist sofort exakt)
function solve(F, env, v) {
  const f = x => { const e = { ...env, [v]: x }; return F.lhs(e) - F.rhs(e); };
  let a = 1, b = 2, fa = f(a), fb = f(b);
  for (let k = 0; k < 80 && isFinite(fb) && isFinite(fa); k++) {
    if (Math.abs(fb) < 1e-13) return b;
    const c = b - fb * (b - a) / (fb - fa); if (!isFinite(c)) break;
    a = b; fa = fb; b = c; fb = f(b);
  }
  return isFinite(fb) && Math.abs(fb) < 1e-9 ? b : NaN;
}
const rnd = () => 0.7 + Math.random() * 3.6;

// stored: richtige Formel, given: Eingabe, target: Größe, nach der umgestellt werden soll
function check(stored, given, target) {
  let F, G;
  try { F = parse(stored); if (!F.lhs) throw new Error('Die gespeicherte Formel braucht ein „=“'); } catch (e) { return { ok: false, error: true, msg: 'Gespeicherte Formel kaputt: ' + e.message }; }
  const known = new Set(F.vars);
  const want = target || F.lhsVar;
  try { G = parse(given, known); } catch (e) { return { ok: false, msg: e.message }; }
  if (!G.lhs) { // nur die rechte Seite eingegeben
    if (!want) return { ok: false, msg: 'Schreib die ganze Formel mit „=“' };
    G = parse(`${want} = (${normalize(given)})`, known);
  }
  const unknown = G.vars.filter(v => !known.has(v));
  if (unknown.length) return { ok: false, msg: `Kommt in der Formel nicht vor: ${unknown.join(', ')}` };
  if (target && (G.lhsVar !== target || G.rhsVars.has(target))) return { ok: false, msg: `Stell nach ${target} um: ${target} = …` };
  const solveFor = F.lhsVar || F.vars[0];
  let good = 0, constrains = false;
  for (let k = 0; k < 12 && good < 6; k++) {
    const env = Object.fromEntries(F.vars.map(v => [v, rnd()]));
    env[solveFor] = solve(F, env, solveFor);
    if (!isFinite(env[solveFor])) continue;
    const l = G.lhs(env), r = G.rhs(env); if (!isFinite(l) || !isFinite(r)) continue;
    if (Math.abs(l - r) > 1e-7 * Math.max(Math.abs(l) + Math.abs(r), 1e-12)) return { ok: false, msg: 'Stimmt nicht' };
    const e2 = { ...env, [solveFor]: env[solveFor] * 1.37 }, l2 = G.lhs(e2), r2 = G.rhs(e2);
    if (!isFinite(l2) || !isFinite(r2) || Math.abs(l2 - r2) > 1e-4 * Math.max(Math.abs(l2) + Math.abs(r2), 1e-12)) constrains = true;
    good++;
  }
  if (good < 3) return { ok: false, msg: 'Lässt sich nicht nachrechnen' };
  if (!constrains) return { ok: false, msg: 'Das gilt immer – da fehlt etwas' };
  return { ok: true };
}
// Hübsch anzeigen
const pretty = s => normalize(s).replace(/\s*\*\s*/g, '·').replace(/\bsqrt\s*/g, '√').replace(/\bpi\b/g, 'π').replace(/\^2\b/g, '²').replace(/\^3\b/g, '³').replace(/\s*\/\s*/g, '/').replace(/\s*([=+])\s*/g, ' $1 ').replace(/([\w)²³])\s*-\s*/g, '$1 - ').replace(/\s+/g, ' ').trim();

// Taschenrechner: Zahl mit Einheit (5 mA, 2,2 kΩ, 3 ms) wird zur Zahl in der Grundeinheit, „ans“ = letztes Ergebnis
const PREFIX = { p: 1e-12, n: 1e-9, 'µ': 1e-6, u: 1e-6, m: 1e-3, c: 1e-2, k: 1e3, M: 1e6, G: 1e9 };
const UNIT_RE = /(?<![\d.])(\d+(?:\.\d+)?)\s*([pnµumckMG])?(Ohm|Hz|Pa|V|A|Ω|W|F|H|s|g|m|J|N|C|l|L)(?![\p{L}\d])/gu;
function calc(src, { deg = true, ans = 0 } = {}) {
  const s = normalize(src).replace(UNIT_RE, (_, n, p, u) => `(${n}*${PREFIX[p] ?? 1})`);
  const tk = tokenize(s, new Set(['ans']));
  if (!tk.length) throw new Error('Leer');
  if (tk.some(t => t.t === '=')) throw new Error('Kein „=“ im Rechner – für Formeln gibt es den Formellerner');
  const bad = tk.find(t => t.t === 'i' && t.v !== 'ans'); if (bad) throw new Error(`Unbekannt: ${bad.v}`);
  const v = parseExpr(tk, deg ? FUN_DEG : FUN)({ ans });
  if (!isFinite(v)) throw new Error('Nicht definiert');
  return v;
}
const api = { check, parse, varsOf, pretty, normalize, calc };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LHFormula = api;
})(typeof window !== 'undefined' ? window : globalThis);

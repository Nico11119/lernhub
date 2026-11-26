// ===================== LernHub – WebUntis (Laptop und Android-App gemeinsam) =====================
// Anmeldung (Passwort oder Freigabe-Schlüssel) und Prüfungen aus „Mein Stundenplan“ holen.
// Läuft im Electron-Hauptprozess (src/untis.js) und in der Android-App (dort mit nativem HTTP, sonst blockiert CORS).
(function (root) {
'use strict';
const b64enc = s => btoa(unescape(encodeURIComponent(s)));
const b64dec = s => decodeURIComponent(escape(atob(s)));
const setCookies = res => (res.headers.getSetCookie?.() || [res.headers.get('set-cookie') || '']).join(';');

// Adresse der WebUntis-Login-Seite (…webuntis.com/WebUntis/?school=…) oder Freigabe-Link (untis://setschool?…)
function parseAddress(input) {
  const s = String(input || '').trim();
  let u;
  try { u = new URL(/^[a-z]+:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
  if (u.protocol === 'untis:') {
    const q = u.searchParams;
    return { server: (q.get('url') || '').replace(/^https?:\/\//, '').replace(/\/.*$/, ''), school: q.get('school') || '', user: q.get('user') || '', secret: q.get('key') || '' };
  }
  const school = u.searchParams.get('school') || new URLSearchParams(u.hash.split('?')[1] || '').get('school') || '';
  return { server: u.host, school };
}
// Schulen mit eigener Subdomain (z. B. htlkrems.webuntis.com) haben kein ?school= in der Adresse:
// Der Server verrät den Namen im Cookie „schoolname“ (Base64), sonst gilt die Subdomain.
async function schoolOf(server) {
  try {
    const m = setCookies(await fetch(`https://${server}/WebUntis/`)).match(/schoolname="?_([^";]+)/);
    if (m) return b64dec(m[1]);
  } catch {}
  return /\.webuntis\.com$/i.test(server) ? server.split('.')[0] : '';
}
// Einmalcode (TOTP, RFC 6238) aus dem Freigabe-Schlüssel – so meldet sich auch die Untis-Mobile-App an.
async function totp(secret, t = Date.now()) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...String(secret).toUpperCase().replace(/[^A-Z2-7]/g, '')].map(c => A.indexOf(c).toString(2).padStart(5, '0')).join('');
  const key = new Uint8Array((bits.match(/.{8}/g) || []).map(b => parseInt(b, 2)));
  const msg = new Uint8Array(8); let c = Math.floor(t / 30000);
  for (let i = 7; i >= 0; i--) { msg[i] = c & 255; c = Math.floor(c / 256); }
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, msg)), o = h[h.length - 1] & 15;
  const v = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(v % 1e6).padStart(6, '0');
}

const ERR = { '-8504': 'Benutzername oder Passwort falsch', '-8500': 'Schule nicht gefunden – stimmt die Adresse?', '-8520': 'Nicht angemeldet' };
async function rpc(url, method, params, cookie) {
  let res;
  try { res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ id: 'lernhub', method, params, jsonrpc: '2.0' }) }); }
  catch { throw new Error('WebUntis nicht erreichbar – Internet und Adresse prüfen'); }
  const json = await res.json().catch(() => ({}));
  if (json.error) throw new Error(ERR[json.error.code] || json.error.message || 'WebUntis-Fehler');
  if (!res.ok) throw new Error(`WebUntis antwortet nicht (${res.status})`);
  return { json, res };
}
const untisDate = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const isoDate = n => { const s = String(n); return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`; };

// onDump(info): letzter Abruf zur Fehlersuche (ohne Zugangsdaten)
async function fetchExams(c, onDump) {
  if (!c?.server || !c.school || !c.user || !(c.password || c.secret)) throw new Error('Adresse, Benutzername und Passwort angeben');
  const base = `https://${c.server}/WebUntis`, school = encodeURIComponent(c.school), rpcUrl = `${base}/jsonrpc.do?school=${school}`;
  const schoolCookie = `schoolname="_${b64enc(c.school)}"`; // so setzt es WebUntis selbst
  let sid, personId, personType = 5, klasseId;
  if (c.secret) {
    const { json, res } = await rpc(`${base}/jsonrpc_intern.do?m=getUserData2017&school=${school}&v=i2.2`, 'getUserData2017', [{ auth: { clientTime: Date.now(), user: c.user, otp: await totp(c.secret) } }]);
    sid = setCookies(res).match(/JSESSIONID=([^;]+)/)?.[1];
    const d = json.result?.userData || {};
    personId = d.elemId; klasseId = d.klasseId; if (d.elemType && d.elemType !== 'STUDENT') personType = 0;
  } else {
    const { json } = await rpc(rpcUrl, 'authenticate', { user: c.user, password: c.password, client: 'LernHub' });
    sid = json.result?.sessionId; personId = json.result?.personId; personType = json.result?.personType ?? 5; klasseId = json.result?.klasseId;
  }
  if (!sid) throw new Error('Anmeldung bei WebUntis fehlgeschlagen');
  const cookie = `JSESSIONID=${sid}; ${schoolCookie}`;
  const call = (method, params) => rpc(rpcUrl, method, params, cookie).then(r => r.json.result);
  try {
    let auth = {};
    try { const t = await fetch(`${base}/api/token/new`, { headers: { cookie } }); if (t.ok) auth = { authorization: 'Bearer ' + (await t.text()).trim() }; } catch {}
    // Zeitraum: heute bis Schuljahresende
    const from = new Date();
    let to = new Date(Date.now() + 200 * 864e5);
    try { const y = await call('getCurrentSchoolyear', {}); if (y?.endDate) to = new Date(isoDate(y.endDate) + 'T12:00'); } catch {}
    if (to < from) to = new Date(Date.now() + 30 * 864e5);

    // „Mein Stundenplan“ (persönlich, mit Gruppen) bis Schulschluss, in 4-Wochen-Stücken
    const subjects = new Map(), notes = [], lessons = {}, plan = [];
    // Stundenplan-Tab: diese Woche und die nächsten 6 Wochen ausführlich (Raum, Lehrer, Entfall)
    const week0 = new Date(from); week0.setDate(week0.getDate() - ((week0.getDay() + 6) % 7)); week0.setHours(0, 0, 0, 0);
    const planFrom = +untisDate(week0), planTo = +untisDate(new Date(week0.getTime() + 48 * 864e5));
    const names = x => (x || []).map(y => y.name).filter(Boolean).join(', '), longs = x => (x || []).map(y => y.longname).filter(Boolean).join(', ');
    let ttOk = false;
    if (personId) {
      for (let d = new Date(week0); d <= to; d = new Date(d.getTime() + 28 * 864e5)) {
        const e = new Date(Math.min(d.getTime() + 27 * 864e5, to.getTime()));
        try {
          const tt = await call('getTimetable', { options: { element: { id: personId, type: personType || 5 }, startDate: untisDate(d), endDate: untisDate(e), subjectFields: ['id', 'name', 'longname'], roomFields: ['id', 'name', 'longname'], teacherFields: ['id', 'name', 'longname'], showLsText: true, showInfo: true, showSubstText: true } });
          ttOk = true;
          for (const l of tt || []) {
            const su = (l.su || []).filter(x => x.name);
            if (l.date >= planFrom && l.date <= planTo) plan.push({ d: isoDate(l.date), s: l.startTime, e: l.endTime, su: names(su), sl: longs(su), ro: names(l.ro), rl: longs(l.ro), te: names(l.te), c: l.code || '', t: [l.substText, l.info, l.lstext].filter(Boolean).join(' · ') });
            (lessons[l.date] ||= []).push({ su: su.map(x => x.name), start: l.startTime, end: l.endTime });
            if (!l.code) for (const x of su) subjects.set(x.name, x.longname || '');
            if (l.lstext || l.info || l.substText) notes.push({ datum: l.date, fach: su.map(x => x.name), lstext: l.lstext, info: l.info, substText: l.substText });
          }
        } catch {}
      }
    }
    const long = {};
    try { for (const su of await call('getSubjects', {}) || []) long[su.name] = su.longName; } catch {}
    // Stundenraster (1. Stunde 7:45–8:35 …) – Montag reicht, er ist an fast allen Schulen gleich
    let grid = [];
    try { grid = ((await call('getTimegridUnits', {})) || []).find(d => d.day === 2)?.timeUnits?.map(u => ({ n: u.name, s: u.startTime, e: u.endTime })) || []; } catch {}

    const q = new URLSearchParams({ startDate: untisDate(from), endDate: untisDate(to), klasseId: klasseId ?? -1, withGrades: 'false' });
    if (personId && personType === 5) q.set('studentId', personId);
    const r = await fetch(`${base}/api/exams?${q}`, { headers: { cookie, ...auth } });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.data) throw new Error(`Prüfungen konnten nicht geladen werden (${r.status})`);
    const raw = j.data.exams || [];

    const code = e => (typeof e.subject === 'object' ? e.subject?.name : e.subject) || '';
    // Gehört der Test zu mir? Namentlich zugeteilt – oder ich habe das Fach an dem Tag zu der Zeit in „Mein Stundenplan“ (wichtig bei Gruppen).
    const mine = e => {
      if (e.assignedStudents?.length && personId) return e.assignedStudents.some(s => s.id === personId) ? 'zugeteilt' : '';
      if (!ttOk) return 'ohne Stundenplan';
      const day = (lessons[e.examDate] || []).filter(l => l.su.includes(code(e)));
      if (!day.length) return '';
      if (!e.startTime || !e.endTime) return 'Fach am Tag';
      return day.some(l => l.start < e.endTime && l.end > e.startTime) ? 'Stunde passt' : '';
    };
    const exams = raw
      .filter(e => e.examDate && (e._grund = mine(e)))
      .map(e => ({ id: e.id ? String(e.id) : `${e.examDate}-${code(e)}-${e.startTime || 0}`, date: isoDate(e.examDate), subject: code(e), subjectLong: subjects.get(code(e)) || long[code(e)] || '', title: (e.name && e.name !== code(e) ? e.name : e.examType) || 'Test', type: e.examType || '' }));
    try { onDump?.({ zeit: new Date().toISOString(), personId, personType, klasseId, von: untisDate(from), bis: untisDate(to), faecher: [...subjects], stundenNotizen: notes, pruefungen: raw.map(({ _grund, ...e }) => ({ ...e, lernhub: _grund || 'nicht meins' })) }); } catch {}
    return { exams, subjects: [...subjects].map(([code, longName]) => ({ subject: code, subjectLong: longName || long[code] || '' })),
      timetable: ttOk ? { fetched: new Date().toISOString(), grid, lessons: plan.sort((a, b) => a.d.localeCompare(b.d) || a.s - b.s) } : null };
  } finally {
    rpc(rpcUrl, 'logout', {}, cookie).catch(() => {});
  }
}

const api = { parseAddress, schoolOf, totp, fetchExams };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LHUntis = api;
})(typeof window !== 'undefined' ? window : globalThis);

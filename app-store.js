/* Legal Staff — local data store and utilities.
   The app starts empty. Everything is kept in the browser (localStorage + IndexedDB for uploaded files). There is no server. */
(function () {
  'use strict';
  const KEY = 'ls.app.v2';
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => new Date(s + 'T00:00:00');
  const valid = s => !!s && !isNaN(parse(s));
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
  const fmt = (s, o) => valid(s) ? parse(s).toLocaleDateString('en-IN', o || { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const dmy = s => valid(s) ? pad(parse(s).getDate()) + '.' + pad(parse(s).getMonth() + 1) + '.' + parse(s).getFullYear() : '—';
  const dayMon = s => fmt(s, { day: 'numeric', month: 'short' });
  const longDate = s => fmt(s, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const isWeekend = s => [0, 6].includes(parse(s).getDay());
  const nextWorking = s => { while (isWeekend(s)) s = addDays(s, 1); return s; };
  const prevWorking = s => { while (isWeekend(s)) s = addDays(s, -1); return s; };
  const t12 = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return (h > 12 ? h - 12 : h) + ':' + pad(m); };
  const t12ap = t => { if (!t) return ''; const h = +t.split(':')[0]; return t12(t) + (h >= 12 ? ' PM' : ' AM'); };
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const uid = p => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const initials = n => (n || '').replace(/^Adv\.\s*/, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const short = n => { const p = (n || '').replace(/^Adv\.\s*/, '').split(/\s+/); return p.length > 1 ? p[0][0] + '. ' + p[p.length - 1] : (n || ''); };

  function seed() {
    return {
      v: 2, anchor: today(), session: null, cases: [], hearings: [], orders: [], tasks: [], docs: [], clients: [], team: [], invoices: [], log: [],
      firm: { name: '', city: '', address: '', gstin: '' },
      user: { name: '', title: '', role: 'Advocate', email: '', phone: '' },
      sub: { plan: '', cycle: 'annual', since: '', renews: '', history: [] },
      lim: null, deadlines: [], chats: {}, copilot: [], drafts: {}, notes: '', research: [], watch: [],
      agents: [
        { id: 'briefing', name: 'Daily briefing', what: "Compiles today's hearings, clashes and deadlines for every team member.", when: 'Every day, 7:30 AM IST', on: true, runs: [] },
        { id: 'sentinel', name: 'Deadline sentinel', what: 'Checks limitation deadlines and overdue tasks and raises alerts.', when: 'Every day, 6:00 AM IST', on: true, runs: [] },
        { id: 'client', name: 'Client update drafter', what: 'Drafts a plain-language update for the client after each new order.', when: 'When an order is confirmed', on: false, runs: [] },
        { id: 'causelist', name: 'Cause-list watcher', what: 'Lists your matters for the next working day, court by court.', when: 'Every evening, 7:00 PM IST', on: true, runs: [] }
      ],
      settings: { whatsapp: true, email: true, inapp: true, briefingTime: '07:30', remindDays: 2, sidebar: 'Light', backdrop: 'Wallpaper', density: 'Comfortable', collapsed: false },
      adminStatus: {}, adminNotes: {}
    };
  }

  let memory = null;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && d.v === 2) return d; } } catch (e) {}
    const d = seed(); save(d); return d;
  }
  function save(d) { memory = d; try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} return load(); }

  /* ---------- limitation calculator (rule-based) ---------- */
  function limitation(l) {
    const ready = l.ready || addDays(l.applied, 14);
    const from = addDays(l.judgment, 1), base = addDays(l.judgment, 60), copyDays = Math.max(0, diffDays(ready, l.applied));
    const adj = addDays(base, copyDays), due = nextWorking(adj), rolled = due !== adj;
    return { ready, from, base, copyDays, adj, due, rolled, daysLeft: diffDays(due, today()),
      rows: [
        ['1', 'Date of judgment and decree', 'Trigger event', dmy(l.judgment)],
        ['2', 'Exclude the day of judgment', 'Limitation Act, 1963, s.12(1)', 'from ' + dmy(from)],
        ['3', 'Limitation period for a commercial appeal', 'Commercial Courts Act, 2015, s.13(1A)', '60 days → ' + dmy(base)],
        ['4', `Time to obtain certified copy (applied ${dmy(l.applied).slice(0, 5)}, ready ${dmy(ready).slice(0, 5)})`, 'Limitation Act, s.12(2)', '+' + copyDays + ' days'],
        ['5', 'Adjusted last date', '', dmy(adj)],
        ['6', 'Check court working day', rolled ? 'Falls on a weekend · s.4 applies, next working day' : 'Weekday · s.4 not triggered. Check the court calendar for holidays.', rolled ? '→ ' + dmy(due) : 'Working day ✓']
      ].map(([n, step, basis, val]) => ({ n, step, basis, val })) };
  }

  /* ---------- order text → next date + points (rule-based) ---------- */
  function readOrder(text) {
    const paras = text.split(/\n\s*\n|\n(?=\s*\d+[.)]\s)/).map(p => p.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    let nextDate = '', nextFrom = '';
    const re = /(?:list(?:ed)?|re-?notify|renotify|put up|adjourned|next date|fixed|stand over|come up|to come up)[^.\d]{0,60}?(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/i;
    paras.forEach((p, i) => { const m = re.exec(p); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; const s = y + '-' + pad(+m[2]) + '-' + pad(+m[1]); if (valid(s)) { nextDate = s; nextFrom = `from ¶${i + 1}, "${m[0]}"`; } } });
    if (!nextDate) { const all = [...text.matchAll(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/g)].map(m => m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1])).filter(valid).sort(); const fut = all.filter(s => s >= today()); if (fut.length) { nextDate = fut[fut.length - 1]; nextFrom = 'latest future date found in the text'; } }
    return { paras, nextDate, nextFrom, points: paras.map(p => p.split(/(?<=\.)\s/)[0]) };
  }

  /* ---------- case question answering (search over the case file) ---------- */
  function answer(d, caseId, q) {
    const c = d.cases.find(x => x.id === caseId), lc = q.toLowerCase();
    const orders = d.orders.filter(o => o.caseId === caseId).sort((a, b) => b.date.localeCompare(a.date));
    const tasks = d.tasks.filter(t => t.caseId === caseId && !t.done), docs = d.docs.filter(x => x.caseId === caseId);
    const upcoming = d.hearings.filter(h => h.caseId === caseId && h.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
    const pending = orders.find(o => !o.confirmed && o.nextDate);
    const next = upcoming ? dmy(upcoming.date) : (pending ? dmy(pending.nextDate) + ' (from the last order, not yet confirmed)' : '');
    const has = (...w) => w.some(x => lc.includes(x));
    if (has('brief')) {
      const o = orders[0], b = c.brief;
      const lines = ['Hearing brief' + (next ? ' for ' + next : ''), ''];
      if (b) lines.push('Background: ' + b.background);
      else if (c.summary) lines.push('Background: ' + c.summary.replace(/\s*\[[^\]]*\]/g, ''));
      lines.push('Last order: ' + (o ? o.summary : 'no order on file.'));
      if (b) lines.push('What to press: ' + b.press.map((p, i) => `(${i + 1}) ${p}`).join('; ') + '.', 'To carry: ' + b.carry);
      if (tasks.length) lines.push('Open tasks: ' + tasks.map(t => t.t).join('; ') + '.');
      lines.push('', 'This is a draft. Please review it before relying on it.');
      return { text: lines.join('\n'), cites: [...(o ? ['Order ' + dmy(o.date)] : []), ...docs.slice(0, 2).map(x => x.name)], brief: true };
    }
    if (has('last order', 'latest order', 'recent order')) { const o = orders[0]; return o ? { text: `The last order is dated ${dmy(o.date)}${c.bench ? ', by ' + c.bench : ''}. ${o.summary}${next ? ' The matter is listed on ' + next + '.' : ''}`, cites: ['Order ' + dmy(o.date)] } : { text: 'There is no order in this case file yet. Upload one from Court Orders.', cites: [] }; }
    if (has('next date', 'next hearing', 'listed', 'when is')) return { text: next ? `The matter is next listed on ${next}${upcoming ? `, ${t12ap(upcoming.time)} at ${upcoming.court}` : ''}.` : 'No future hearing is recorded for this case.', cites: orders[0] ? ['Order ' + dmy(orders[0].date)] : ['Hearings'] };
    if (has('missing')) return c.missing && c.missing.length ? { text: `${c.missing.length === 2 ? 'Two' : c.missing.length} document${c.missing.length > 1 ? 's are' : ' is'} referred to but ${c.missing.length > 1 ? 'are' : 'is'} not in the case file:\n` + c.missing.map((m, i) => `${i + 1}. ${m}`).join('\n'), cites: (c.missing.join(' ').match(/(WS|Plaint) ¶\d+/g) || []) } : { text: `No missing documents are flagged. The case file has ${docs.length} document${docs.length === 1 ? '' : 's'}.`, cites: ['Documents'] };
    if (has('task', 'pending', 'to do', 'todo')) return { text: tasks.length ? `${tasks.length} task${tasks.length > 1 ? 's are' : ' is'} open:\n` + tasks.map(t => `• ${t.t}. ${t.who}, due ${dayMon(t.due)}.`).join('\n') : 'There are no open tasks in this case.', cites: ['Tasks'] };
    if (has('argument', 'contention', 'submission')) return c.args ? { text: c.args, cites: ['Plaint ¶9', 'WS ¶4–7'] } : { text: 'No arguments have been recorded for this case yet. They are picked up from pleadings and orders once those are in the case file.', cites: [] };
    if (has('document', 'file', 'evidence')) return { text: docs.length ? `The case file has ${docs.length} item${docs.length > 1 ? 's' : ''}:\n` + docs.map(x => `• ${x.name} (${x.ext}, ${x.v})`).join('\n') : 'No documents have been added to this case.', cites: ['Documents'] };
    if (has('part', 'client', 'defendant', 'plaintiff', 'respondent', 'petitioner', 'who')) { if (c.parties.length) return { text: c.parties.map(p => `${p.role}: ${p.name}${p.note ? ' — ' + p.note : ''}`).join('\n'), cites: ['Case record'] }; }
    if (has('issue', 'question of law')) { if (c.issues.length) return { text: 'Issues recorded:\n' + c.issues.map((s, i) => `${i + 1}. ${s}`).join('\n'), cites: ['Case record'] }; }
    const corpus = [];
    if (c.summary) c.summary.split(/(?<=\.)\s+/).forEach(s => corpus.push([s.replace(/\s*\[[^\]]*\]/g, ''), (s.match(/\[([^\]]*)\]/) || [])[1] || 'Case summary']));
    orders.forEach(o => (o.paras || [o.summary]).forEach((p, i) => corpus.push([p, `Order ${dmy(o.date)} ¶${i + 1}`])));
    d.hearings.filter(h => h.caseId === caseId && h.outcome).forEach(h => corpus.push([`${dmy(h.date)}, ${h.purpose}: ${h.outcome}`, 'Hearing ' + dmy(h.date)]));
    d.tasks.filter(t => t.caseId === caseId).forEach(t => corpus.push([`${t.t} — ${t.who}, due ${dayMon(t.due)}${t.done ? ' (done)' : ''}`, 'Tasks']));
    docs.forEach(x => corpus.push([`${x.name} — ${x.meta}`, x.name]));
    c.issues.forEach(s => corpus.push([s, 'Issues']));
    const stop = new Set('the a an of to in on is are was were what when where which who how do does did for and or any about with this that case tell me please there has have had be been it its by at as from'.split(' '));
    const words = lc.split(/[^a-z0-9.]+/).filter(w => w.length > 1 && !stop.has(w));
    const hits = corpus.map(([s, cite]) => [words.reduce((n, w) => n + (s.toLowerCase().includes(w) ? 1 : 0), 0), s, cite]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 3);
    if (hits.length) return { text: 'From the case file:\n' + hits.map(x => '• ' + x[1]).join('\n'), cites: [...new Set(hits.map(x => x[2]))] };
    return { text: `The documents in this case don't answer that clearly. I searched ${docs.length} document${docs.length === 1 ? '' : 's'} and ${orders.length} order${orders.length === 1 ? '' : 's'}. Try asking about the last order, next date, tasks, documents or parties.`, cites: [] };
  }

  /* ---------- downloads ---------- */
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function csv(name, rows) { download(name, new Blob(['﻿' + rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n')], { type: 'text/csv' })); }
  function ics(name, list, d) {
    const z = s => s.replace(/[,;\\]/g, m => '\\' + m);
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Legal Staff//Hearings//EN', 'CALSCALE:GREGORIAN'];
    list.forEach(h => { const c = d.cases.find(x => x.id === h.caseId) || {}; const [hh, mm] = (h.time || '10:30').split(':').map(Number); const st = h.date.replace(/-/g, '') + 'T' + pad(hh) + pad(mm) + '00'; const e = h.date.replace(/-/g, '') + 'T' + pad(Math.min(hh + 1, 23)) + pad(mm) + '00';
      L.push('BEGIN:VEVENT', 'UID:' + h.id + '@legalstaff', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART;TZID=Asia/Kolkata:' + st, 'DTEND;TZID=Asia/Kolkata:' + e, 'SUMMARY:' + z((c.title || 'Hearing') + ' — ' + (h.purpose || 'Hearing')), 'LOCATION:' + z(h.court || ''), 'DESCRIPTION:' + z([c.no, h.item, h.assignee].filter(Boolean).join(' · ')), 'END:VEVENT'); });
    L.push('END:VCALENDAR'); download(name, new Blob([L.join('\r\n')], { type: 'text/calendar' }));
  }
  function crc32(u) { const t = crc32.t || (crc32.t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; })); let r = -1; for (let i = 0; i < u.length; i++) r = t[(r ^ u[i]) & 255] ^ (r >>> 8); return (r ^ -1) >>> 0; }
  function zip(files, type) {
    const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
    files.forEach(f => { const n = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, n.length, true);
      parts.push(new Uint8Array(lh.buffer), n, data);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, n.length, true); ch.setUint32(42, off, true);
      cd.push(new Uint8Array(ch.buffer), n); off += 30 + n.length + data.length; });
    const size = cd.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(e.buffer)], { type });
  }
  /* paras: [[{t:'text', b:true|false, br:true}]] */
  function docx(name, paras) {
    const x = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = paras.map(p => '<w:p><w:pPr><w:spacing w:after="200"/></w:pPr>' + p.map(r => r.br ? '<w:r><w:br/></w:r>' : `<w:r><w:rPr>${r.b ? '<w:b/>' : ''}<w:sz w:val="23"/></w:rPr><w:t xml:space="preserve">${x(r.t)}</w:t></w:r>`).join('') + '</w:p>').join('');
    const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    download(name, zip([
      { name: '[Content_Types].xml', text: H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
      { name: '_rels/.rels', text: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/document.xml', text: H + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>' }
    ], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  }
  function htmlToRuns(root) {
    const paras = [];
    const walk = (node, bold, cur) => node.childNodes.forEach(n => {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' '); if (t.trim() || (cur.length && t)) cur.push({ t, b: bold }); }
      else if (n.nodeName === 'BR') cur.push({ br: true });
      else if (/^(DIV|P|H1|H2|H3|LI)$/.test(n.nodeName)) { const p = []; walk(n, bold || /^H/.test(n.nodeName), p); if (p.length) paras.push(p); }
      else walk(n, bold || /^(B|STRONG)$/.test(n.nodeName), cur);
    });
    const top = []; walk(root, false, top); if (top.length) paras.push(top);
    return paras;
  }

  /* ---------- uploaded files (IndexedDB) ---------- */
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('ls-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const files = {
    put: (id, file) => idb().then(db => new Promise((res, rej) => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').put(file, id); t.oncomplete = () => res(); t.onerror = () => rej(t.error); })),
    get: id => idb().then(db => new Promise((res, rej) => { const r = db.transaction('f').objectStore('f').get(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })),
    del: id => idb().then(db => new Promise(res => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').delete(id); t.oncomplete = () => res(); t.onerror = () => res(); })).catch(() => {})
  };
  const pickFile = (accept, multiple) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; if (accept) i.accept = accept; i.multiple = !!multiple; i.onchange = () => res([...i.files]); i.click(); });
  const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  window.LS = { KEY, load, save, reset, seed, iso, parse, valid, today, addDays, diffDays, fmt, dmy, dayMon, longDate, isWeekend, nextWorking, t12, t12ap, nowHM, uid, inr, initials, short, pad,
    limitation, readOrder, answer, download, csv, ics, docx, htmlToRuns, files, pickFile, size };
})();

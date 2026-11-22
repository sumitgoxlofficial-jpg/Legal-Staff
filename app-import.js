/* Legal Staff — move data in from other software.
   A firm coming from another practice-management product, an Excel diary or a Google Sheet exports its data as CSV or Excel
   and brings it in here: clients, cases, hearings, tasks and invoices. Columns are matched by name (with the names other
   products commonly use), every row is checked and previewed, duplicates of what is already here are skipped, and cases,
   hearings, tasks and invoices are linked to their client and case by name, number or CNR.
   Everything runs in the browser: the file is never uploaded anywhere. The parsing and matching core (window.LSI) has no
   DOM dependency, so tests/import.test.mjs runs it under Node. */
(function () {
  'use strict';

  /* ---------- reading files ---------- */
  /* CSV / TSV / semicolon-separated text, with quoted fields, doubled quotes, line breaks inside quotes and a BOM. */
  function parseCsv(text) {
    text = String(text || '').replace(/^﻿/, '');
    const first = text.split(/\r?\n/, 1)[0] || '', count = c => first.split(c).length;
    const sep = [',', ';', '\t', '|'].reduce((a, c) => count(c) > count(a) ? c : a, ',');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"' && cell === '') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ''));
  }

  /* .xlsx is a zip of XML files. Read the central directory, inflate with the browser's DecompressionStream, then read the
     shared strings and every worksheet. Returns [{ name, rows }]. Old binary .xls is not supported (save it as .xlsx or CSV). */
  async function unzip(buf) {
    const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), out = {};
    let e = b.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('This is not an Excel (.xlsx) file. Save it as .xlsx or CSV and try again.');
    let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true), dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = dec.decode(b.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = b.subarray(start, start + size);
      out[name] = method === 0 ? raw : method === 8 ? new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()) : null;
    }
    return out;
  }
  const xmlText = s => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, c) => String.fromCharCode(+c)).replace(/&amp;/g, '&');
  const colNo = ref => { let n = 0; for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  async function parseXlsx(buf) {
    const z = await unzip(buf), dec = new TextDecoder(), get = k => z[k] ? dec.decode(z[k]) : '';
    const shared = [...get('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => xmlText(t[1])).join(''));
    const rels = Object.fromEntries([...get('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map(m => [(/Id="([^"]+)"/.exec(m[0]) || [])[1], (/Target="([^"]+)"/.exec(m[0]) || [])[1]]));
    const sheets = [...get('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map(m => ({ name: xmlText((/name="([^"]*)"/.exec(m[0]) || [])[1] || 'Sheet'), target: rels[(/r:id="([^"]+)"/.exec(m[0]) || [])[1]] }))
      .map(s => ({ name: s.name, path: s.target ? (s.target.startsWith('/') ? s.target.slice(1) : 'xl/' + s.target.replace(/^\.\//, '')) : '' }));
    return sheets.filter(s => z[s.path]).map(s => {
      const rows = [];
      for (const r of get(s.path).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const row = [];
        for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const ref = (/r="([A-Z]+\d+)"/.exec(c[1]) || [])[1], t = (/t="([^"]+)"/.exec(c[1]) || [])[1], body = c[2] || '';
          const v = (/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1];
          const val = t === 's' ? shared[+v] || '' : t === 'inlineStr' ? xmlText(body) : v == null ? '' : xmlText(v);
          row[ref ? colNo(ref) : row.length] = val;
        }
        rows.push(Array.from(row, x => x == null ? '' : x));
      }
      return { name: s.name, rows: rows.filter(r => r.some(c => String(c).trim() !== '')) };
    }).filter(s => s.rows.length);
  }
  /* A File (or { name, text() / arrayBuffer() }) → [{ name, rows }] tables. */
  async function readFile(f) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (ext === 'xls') throw new Error(f.name + ' is an old Excel (.xls) file. Open it in Excel and save it as .xlsx or CSV.');
    if (ext === 'xlsx' || ext === 'xlsm') return (await parseXlsx(await f.arrayBuffer())).map(s => ({ name: f.name + ' · ' + s.name, rows: s.rows }));
    if (ext === 'json') return fromJson(f.name, JSON.parse(await f.text()));
    return [{ name: f.name, rows: parseCsv(await f.text()) }];
  }
  /* A JSON export: an array of objects, or an object holding arrays (e.g. { clients: [...], matters: [...] }). */
  function fromJson(name, x) {
    const toRows = arr => { const objs = arr.filter(o => o && typeof o === 'object' && !Array.isArray(o)); const keys = [...new Set(objs.flatMap(Object.keys))].filter(k => objs.some(o => o[k] == null || typeof o[k] !== 'object')); return [keys, ...objs.map(o => keys.map(k => o[k] == null ? '' : String(o[k])))]; };
    if (Array.isArray(x)) return [{ name, rows: toRows(x) }];
    if (x && x.v === 2 && Array.isArray(x.cases)) throw new Error('This is a Legal Staff backup. Restore it from Settings → Restore instead.');
    return Object.keys(x || {}).filter(k => Array.isArray(x[k]) && x[k].length).map(k => ({ name: name + ' · ' + k, rows: toRows(x[k]), hint: k }));
  }

  /* ---------- values ---------- */
  const pad = n => String(n).padStart(2, '0');
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  const okYmd = (y, m, d) => { if (y < 100) y += y < 70 ? 2000 : 1900; const t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d ? y + '-' + pad(m) + '-' + pad(d) : ''; };
  /* Indian exports write day first (31/01/2025). Month first is used only when the day-first reading is impossible. */
  function date(v) {
    const s = String(v == null ? '' : v).trim(); if (!s) return '';
    let m;
    if (/^\d{4,5}(\.\d+)?$/.test(s) && +s > 20000 && +s < 80000) { const t = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 864e5); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s))) return okYmd(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/.exec(s))) return okYmd(+m[3], +m[2], +m[1]) || okYmd(+m[3], +m[1], +m[2]);
    const mon = w => MON[w.toLowerCase()] || MON[w.slice(0, 3).toLowerCase()];
    if ((m = /^(\d{1,2})(?:st|nd|rd|th)?[\s\-/.,]+([A-Za-z]{3,9})\.?[\s\-/.,]+(\d{2,4})/.exec(s)) && mon(m[2])) return okYmd(+m[3], mon(m[2]), +m[1]);
    if ((m = /^([A-Za-z]{3,9})\.?[\s\-/.]+(\d{1,2})(?:st|nd|rd|th)?,?[\s\-/.]+(\d{2,4})/.exec(s)) && mon(m[1])) return okYmd(+m[3], mon(m[1]), +m[2]);
    return '';
  }
  function time(v) {
    const s = String(v == null ? '' : v).trim(); if (!s) return '';
    if (/^0?\.\d+$/.test(s)) { const mins = Math.round(+s * 1440); return pad(Math.floor(mins / 60) % 24) + ':' + pad(mins % 60); }
    const m = /^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*([ap])?\.?\s*m?\.?$/i.exec(s);
    if (!m || (m[2] == null && !m[3])) return '';
    let hh = +m[1]; const mm = +(m[2] || 0), ap = (m[3] || '').toLowerCase();
    if (ap === 'p' && hh < 12) hh += 12; if (ap === 'a' && hh === 12) hh = 0;
    return hh < 24 && mm < 60 ? pad(hh) + ':' + pad(mm) : '';
  }
  const money = v => { const n = parseFloat(String(v == null ? '' : v).replace(/₹|rs\.?|inr|,|\s/gi, '')); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; };
  const yes = v => /^(y|yes|true|1|paid|done|completed?|closed|x|✓|✔)$/i.test(String(v == null ? '' : v).trim());
  const cnrOf = v => { const c = String(v || '').replace(/[\s-]/g, '').toUpperCase(); return /^[A-Z]{4}\d{12}$/.test(c) || /^[A-Z0-9]{16}$/.test(c) ? c : ''; };
  const phoneOf = v => { const s = String(v || '').trim(); return /e\+/i.test(s) ? String(Math.round(+s)) : s; };
  const key = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const norm = s => String(s || '').toLowerCase().replace(/\b(vs?|versus)\b\.?/g, 'v').replace(/[^a-z0-9]/g, '');

  /* ---------- what each kind of record takes, and the column names other software uses for it ---------- */
  const KINDS = {
    clients: { label: 'Clients', one: 'client', fields: [
      ['name', 'Client name', ['client', 'clientname', 'name', 'fullname', 'partyname', 'customer', 'customername', 'contactname', 'displayname', 'company', 'companyname'], 1],
      ['type', 'Type', ['type', 'clienttype', 'category', 'entitytype', 'individualcompany']],
      ['phone', 'Phone', ['phone', 'mobile', 'mobileno', 'mobilenumber', 'phoneno', 'phonenumber', 'contactno', 'contactnumber', 'whatsapp', 'cell', 'telephone']],
      ['email', 'Email', ['email', 'emailid', 'emailaddress', 'mail', 'eaddress']],
      ['city', 'City', ['city', 'town', 'district', 'location', 'place']],
      ['contact', 'Contact person', ['contactperson', 'contact', 'representative', 'pointofcontact', 'poc', 'authorisedperson', 'authorizedperson']],
      ['address', 'Address', ['address', 'fulladdress', 'postaladdress', 'street', 'addressline1']],
      ['notes', 'Notes', ['notes', 'note', 'remarks', 'comments', 'description']]] },
    cases: { label: 'Cases', one: 'case', fields: [
      ['title', 'Case title', ['title', 'casetitle', 'matter', 'mattername', 'mattertitle', 'casename', 'causetitle', 'parties', 'partyname', 'petitionervrespondent', 'subject', 'name'], 1],
      ['no', 'Case number', ['caseno', 'casenumber', 'casenum', 'regno', 'registrationno', 'registrationnumber', 'casetypeno', 'suitno', 'number', 'matterno', 'matternumber', 'casereference', 'ref', 'reference'], 1],
      ['cnr', 'CNR', ['cnr', 'cnrno', 'cnrnumber', 'ecourtscnr']],
      ['court', 'Court', ['court', 'courtname', 'forum', 'courtcomplex', 'establishment', 'bench', 'courthall', 'courtroom', 'tribunal', 'jurisdiction']],
      ['stage', 'Stage', ['stage', 'casestage', 'currentstage', 'purpose', 'status', 'casestatus', 'nextpurpose']],
      ['client', 'Client', ['client', 'clientname', 'customer', 'party', 'ourclient', 'appearingfor', 'onbehalfof']],
      ['team', 'Lead advocate', ['leadadvocate', 'advocate', 'counsel', 'assignedto', 'responsible', 'responsibleattorney', 'handledby', 'owner', 'lawyer', 'attorney']],
      ['next', 'Next hearing date', ['nexthearing', 'nexthearingdate', 'nextdate', 'nextdateofhearing', 'ndoh', 'hearingdate', 'nextlistingdate', 'dateofhearing']],
      ['time', 'Hearing time', ['time', 'hearingtime', 'nexthearingtime']],
      ['fileNo', 'File number', ['fileno', 'filenumber', 'internalref', 'ourref', 'officefileno', 'internalreference']],
      ['bench', 'Bench / judge', ['judge', 'bench', 'coram', 'presidingofficer', 'beforejudge', 'courtno']],
      ['state', 'Court state', ['state', 'courtstate']],
      ['district', 'Court district', ['district', 'courtdistrict']],
      ['oppAdv', 'Opposite advocate', ['oppositeadvocate', 'oppositecounsel', 'opponentadvocate', 'respondentadvocate', 'otherside', 'opposingcounsel']],
      ['opp', 'Opposite party', ['oppositeparty', 'opponent', 'respondent', 'otherparty', 'defendant', 'accused']],
      ['filed', 'Filing date', ['filingdate', 'dateoffiling', 'filedon', 'opened', 'opendate', 'registrationdate', 'institutiondate']],
      ['filingNo', 'Filing number', ['filingno', 'filingnumber']],
      ['diaryNo', 'Diary number', ['diaryno', 'diarynumber']],
      ['notes', 'Notes', ['notes', 'remarks', 'comments', 'description', 'summary', 'brief']]] },
    hearings: { label: 'Hearings', one: 'hearing', fields: [
      ['case', 'Case (number, CNR or title)', ['case', 'caseno', 'casenumber', 'cnr', 'matter', 'mattername', 'casetitle', 'title', 'regno', 'reference'], 1],
      ['date', 'Hearing date', ['date', 'hearingdate', 'dateofhearing', 'listingdate', 'nextdate', 'nexthearingdate', 'businessdate', 'eventdate', 'start', 'startdate'], 1],
      ['time', 'Time', ['time', 'hearingtime', 'starttime']],
      ['purpose', 'Purpose', ['purpose', 'stage', 'business', 'purposeofhearing', 'event', 'subject', 'description', 'type']],
      ['court', 'Court', ['court', 'courtname', 'forum', 'location', 'courtroom']],
      ['item', 'Item no.', ['item', 'itemno', 'serialno', 'srno', 'causelistno']],
      ['outcome', 'Outcome', ['outcome', 'result', 'proceedings', 'whathappened', 'notes', 'remarks', 'business done']],
      ['assignee', 'Appearing advocate', ['advocate', 'assignedto', 'appearing', 'counsel', 'attendee', 'responsible', 'owner']]] },
    tasks: { label: 'Tasks', one: 'task', fields: [
      ['t', 'Task', ['task', 'title', 'todo', 'subject', 'description', 'name', 'activity', 'action'], 1],
      ['case', 'Case (number, CNR or title)', ['case', 'caseno', 'casenumber', 'cnr', 'matter', 'mattername', 'casetitle', 'reference']],
      ['due', 'Due date', ['due', 'duedate', 'deadline', 'date', 'by', 'targetdate']],
      ['who', 'Assigned to', ['assignedto', 'assignee', 'who', 'owner', 'responsible', 'advocate', 'staff']],
      ['done', 'Done', ['done', 'completed', 'status', 'complete', 'isdone']]] },
    invoices: { label: 'Invoices', one: 'invoice', fields: [
      ['no', 'Invoice number', ['invoiceno', 'invoicenumber', 'billno', 'billnumber', 'number', 'no', 'ref', 'reference']],
      ['date', 'Invoice date', ['date', 'invoicedate', 'billdate', 'issuedate', 'issued', 'createdon'], 1],
      ['amount', 'Fee (before GST)', ['amount', 'fee', 'feebeforegst', 'fees', 'subtotal', 'taxableamount', 'taxablevalue', 'professionalfee', 'amountbeforetax', 'total', 'totalamount', 'invoiceamount', 'value'], 1],
      ['client', 'Client', ['client', 'clientname', 'customer', 'billedto', 'billto', 'party']],
      ['case', 'Case (number, CNR or title)', ['case', 'caseno', 'casenumber', 'cnr', 'matter', 'mattername', 'casetitle']],
      ['paid', 'Paid', ['paid', 'status', 'paymentstatus', 'ispaid']],
      ['paidOn', 'Paid on', ['paidon', 'paiddate', 'paymentdate', 'datepaid', 'receivedon']],
      ['desc', 'Description', ['description', 'particulars', 'details', 'narration', 'memo', 'notes', 'service']]] }
  };
  const ORDER = ['clients', 'cases', 'hearings', 'tasks', 'invoices'];

  /* Which source column feeds each field: exact name first, then a known name inside a longer header ("Next Hearing Date (DD/MM)"). */
  function guessMap(kind, headers) {
    const hk = headers.map(key), used = new Set(), map = {};
    const pick = test => { const i = hk.findIndex((x, j) => !used.has(j) && x && test(x)); if (i >= 0) used.add(i); return i; };
    KINDS[kind].fields.forEach(([k, , syn]) => { const i = pick(x => syn.map(key).includes(x)); if (i >= 0) map[k] = i; });
    KINDS[kind].fields.forEach(([k, , syn]) => { if (map[k] != null) return; const i = pick(x => syn.map(key).some(s => s.length >= 4 && x.includes(s))); if (i >= 0) map[k] = i; });
    return map;
  }
  /* The kind a table most likely holds, from its name (sheet or JSON key) and how many headers each kind recognises. */
  function guessKind(headers, name) {
    const n = key(name);
    const byName = [['invoice', 'invoices'], ['bill', 'invoices'], ['hearing', 'hearings'], ['diary', 'hearings'], ['calendar', 'hearings'], ['event', 'hearings'], ['task', 'tasks'], ['todo', 'tasks'], ['client', 'clients'], ['contact', 'clients'], ['customer', 'clients'], ['case', 'cases'], ['matter', 'cases']].find(([w]) => n.includes(w));
    if (byName) return byName[1];
    const score = k => { const m = guessMap(k, headers); return KINDS[k].fields.reduce((a, [f, , , req]) => a + (m[f] != null ? (req ? 3 : 1) : 0), 0) - (KINDS[k].fields.some(([f, , , req]) => req && m[f] == null) ? 4 : 0); };
    return ORDER.slice().sort((a, b) => score(b) - score(a))[0];
  }

  /* ---------- turning rows into records ---------- */
  /* One mapped row → { v (values by field), err (message, or '') }. */
  function readRow(kind, map, row) {
    const v = {}; KINDS[kind].fields.forEach(([k]) => { v[k] = map[k] != null ? String(row[map[k]] == null ? '' : row[map[k]]).trim() : ''; });
    if (kind === 'cases') { if (!v.no && v.cnr) v.no = cnrOf(v.cnr) || v.cnr; if (!v.title && v.no) v.title = v.opp ? v.no + ' · ' + v.opp : v.no; }
    const miss = KINDS[kind].fields.filter(([k, , , req]) => req && !v[k]).map(f => f[1]);
    if (miss.length) return { v, err: 'Missing ' + miss.join(', ').toLowerCase() };
    const badDate = k => v[k] && !date(v[k]);
    if (kind === 'cases' && badDate('next')) return { v, err: 'Next hearing date not understood: ' + v.next };
    if (kind === 'hearings' && badDate('date')) return { v, err: 'Date not understood: ' + v.date };
    if (kind === 'tasks' && badDate('due')) return { v, err: 'Due date not understood: ' + v.due };
    if (kind === 'invoices') { if (badDate('date')) return { v, err: 'Date not understood: ' + v.date }; if (!(money(v.amount) > 0)) return { v, err: 'Amount not understood: ' + v.amount }; }
    if (kind === 'clients' && v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return { v, err: 'Email not valid: ' + v.email };
    return { v, err: '' };
  }
  const caseStatus = s => /dispos|decided|closed|dismiss|withdrawn|allowed|settled|finished|complete/i.test(s || '') ? 'disposed' : /pending filing|to be filed|draft/i.test(s || '') ? 'pending' : 'active';
  const category = (court, cnr) => /supreme/i.test(court) ? 'supreme' : /high court|\bhc\b/i.test(court) ? 'high_court' : /tribunal|nclt|nclat|\bdrt\b|drat|\bcat\b|itat|cestat|\bngt\b|consumer|commission|rera/i.test(court) ? 'tribunal' : 'district';
  const tribunal = court => (/\b(NCLT|NCLAT|DRT|DRAT|CAT|ITAT|CESTAT|NGT|AFT|SAT|TDSAT|APTEL|GSTAT)\b/i.exec(court || '') || [])[1] ? (/\b(NCLT|NCLAT|DRT|DRAT|CAT|ITAT|CESTAT|NGT|AFT|SAT|TDSAT|APTEL|GSTAT)\b/i.exec(court)[1]).toUpperCase() : /consumer/i.test(court || '') ? 'CONSUMER' : '';

  /* Adds the tables to db. tables: [{ kind, map, rows (data rows, no header) }]. opts: { uid, today, user, caseCap, stages }.
     Order is fixed (clients, cases, then hearings, tasks, invoices) so later rows link to records added earlier in the same run.
     Returns a report: { added: { kind: n }, skipped: [{ table, row, why }], linked, created, capped }. Nothing in db is changed or deleted. */
  function apply(db, tables, opts) {
    const o = Object.assign({ uid: p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), today: new Date().toISOString().slice(0, 10), user: (db.user && db.user.name) || '', caseCap: Infinity, stages: [] }, opts);
    const rep = { added: { clients: 0, cases: 0, hearings: 0, tasks: 0, invoices: 0 }, skipped: [], createdClients: 0, unlinked: 0, capped: 0 };
    const skip = (t, i, why) => rep.skipped.push({ table: t.name || KINDS[t.kind].label, row: i + 2, why });
    const clientBy = name => { const k = norm(name); return k ? db.clients.find(c => norm(c.name) === k) : null; };
    const ensureClient = name => { if (!String(name || '').trim()) return ''; let c = clientBy(name); if (!c) { c = { id: o.uid('cl'), name: String(name).trim(), type: /\b(ltd|limited|llp|pvt|private|corporation|bank|inc|company|co\.)\b/i.test(name) ? 'Company' : 'Individual', city: '', contact: '', phone: '', email: '', notes: 'Added while importing', portal: false, share: { dates: true, orders: true, invoices: false } }; db.clients.unshift(c); rep.createdClients++; } return c.id; };
    const caseBy = ref => { const s = String(ref || '').trim(); if (!s) return null; const cnr = cnrOf(s), k = key(s), n = norm(s);
      return (cnr && db.cases.find(c => c.cnr === cnr)) || db.cases.find(c => key(c.no) === k) || db.cases.find(c => c.fileNo && key(c.fileNo) === k) || db.cases.find(c => norm(c.title) === n || norm(c.full) === n) || null; };
    const fresh = new Set();   // hearings made in this run from a case's next date: a hearings sheet may add their time and purpose
    let live = db.cases.filter(c => c.status === 'active' || c.status === 'pending').length;
    const sorted = tables.slice().sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    sorted.forEach(t => t.rows.forEach((row, i) => {
      const { v, err } = readRow(t.kind, t.map, row);
      if (err) return skip(t, i, err);
      if (t.kind === 'clients') {
        const dup = clientBy(v.name) || (v.email && db.clients.find(c => c.email && c.email.toLowerCase() === v.email.toLowerCase())) || (v.phone && key(v.phone).length >= 10 && db.clients.find(c => c.phone && key(c.phone).slice(-10) === key(v.phone).slice(-10)));
        if (dup) { ['phone', 'email', 'city', 'contact', 'address'].forEach(k => { if (!dup[k] && v[k]) dup[k] = k === 'phone' ? phoneOf(v[k]) : v[k]; }); return skip(t, i, 'Already here: ' + dup.name + ' (blank details filled in)'); }
        const type = /compan|ltd|pvt|corporate|llp/i.test(v.type) ? 'Company' : /firm|partnership/i.test(v.type) ? 'Firm' : /gov|state|union|department|ministry/i.test(v.type) ? 'Government body' : /\b(ltd|limited|llp|pvt|private|bank)\b/i.test(v.name) ? 'Company' : 'Individual';
        db.clients.unshift({ id: o.uid('cl'), name: v.name, type, city: v.city, contact: v.contact, phone: phoneOf(v.phone), email: v.email, address: v.address, notes: v.notes, portal: false, share: { dates: true, orders: true, invoices: false } });
        rep.added.clients++;
      } else if (t.kind === 'cases') {
        const cnr = cnrOf(v.cnr), dup = (cnr && db.cases.find(c => c.cnr === cnr)) || db.cases.find(c => key(c.no) === key(v.no) && norm(c.title) === norm(v.title));
        if (dup) return skip(t, i, 'Already here: ' + dup.title + ' (' + dup.no + ')');
        const status = caseStatus(v.stage);
        if (status !== 'disposed' && live >= o.caseCap) { rep.capped++; return skip(t, i, 'Over the plan\'s active-case limit'); }
        const stage = (o.stages.find(s => key(s) === key(v.stage)) || v.stage || o.stages[0] || 'Pleadings'), court = v.court || 'Not recorded', team = v.team || o.user, id = o.uid('c');
        db.cases.unshift({ id, title: v.title, full: v.title, no: v.no, cnr, court, forum: court, purpose: stage, stage, status, team: [team].filter(Boolean), clientId: ensureClient(v.client), fileNo: v.fileNo, bench: v.bench, state: v.state, district: v.district, oppAdv: v.oppAdv, labels: [], idKind: cnr ? 'cnr' : v.filingNo ? 'filing_number' : v.diaryNo ? 'diary_number' : 'case_number', category: category(court, cnr), tribunal: tribunal(court), filingNo: v.filingNo, diaryNo: v.diaryNo, createdBy: o.user, createdOn: date(v.filed) || o.today, summary: v.notes, summaryMeta: v.notes ? 'Imported note' : '', parties: v.opp ? [v.opp] : [], issues: [], missing: [], args: '', imported: o.today });
        if (status !== 'disposed') live++;
        const nd = date(v.next);
        if (nd) { const hid = o.uid('h'); fresh.add(hid); db.hearings.push({ id: hid, caseId: id, date: nd, time: time(v.time) || '10:30', court, item: '', purpose: stage, assignee: team, outcome: '', brief: false }); }
        rep.added.cases++;
      } else {
        const c = caseBy(v.case);
        if (t.kind === 'hearings') {
          if (!c) return skip(t, i, 'No case matches "' + v.case + '". Import the cases first, or check the number');
          const d = date(v.date);
          const same = db.hearings.find(x => x.caseId === c.id && x.date === d);
          if (same && fresh.has(same.id)) { fresh.delete(same.id); Object.assign(same, { time: time(v.time) || same.time, purpose: v.purpose || same.purpose, item: v.item || same.item, court: v.court || same.court, assignee: v.assignee || same.assignee }); return; }
          if (same) return skip(t, i, 'Already on the calendar: ' + c.title + ' on ' + d);
          db.hearings.push({ id: o.uid('h'), caseId: c.id, date: d, time: time(v.time) || '10:30', court: v.court || c.court, item: v.item, purpose: v.purpose || c.stage || 'Hearing', assignee: v.assignee || (c.team || [])[0] || o.user, outcome: d < o.today ? v.outcome : '', brief: false });
          rep.added.hearings++;
        } else if (t.kind === 'tasks') {
          if (v.case && !c) rep.unlinked++;
          const due = date(v.due) || '';
          if (db.tasks.some(x => key(x.t) === key(v.t) && (x.caseId || '') === (c ? c.id : '') && (x.due || '') === due)) return skip(t, i, 'Already here: ' + v.t);
          db.tasks.push({ id: o.uid('t'), caseId: c ? c.id : '', t: v.t, who: v.who || o.user, due, done: yes(v.done) });
          rep.added.tasks++;
        } else if (t.kind === 'invoices') {
          if (v.case && !c) rep.unlinked++;
          if (v.no && db.invoices.some(x => key(x.no) === key(v.no))) return skip(t, i, 'Already here: invoice ' + v.no);
          const clientId = c && c.clientId ? c.clientId : ensureClient(v.client), paidOn = date(v.paidOn);
          if (!clientId && !c) return skip(t, i, 'No client or case to bill it to');
          db.invoices.unshift({ id: o.uid('i'), no: v.no || 'IMP-' + (date(v.date) || o.today).slice(0, 4) + '-' + pad(rep.added.invoices + 1).padStart(3, '0'), clientId, caseId: c ? c.id : '', date: date(v.date), amount: money(v.amount), paid: yes(v.paid) || !!paidOn, paidOn: paidOn || (yes(v.paid) ? date(v.date) : ''), desc: v.desc || 'Imported invoice' });
          rep.added.invoices++;
        }
      }
    }));
    return rep;
  }
  /* A blank template for each kind: the header row plus one example row. */
  const TEMPLATE = {
    clients: [['Client name', 'Type', 'Phone', 'Email', 'City', 'Contact person', 'Address', 'Notes'], ['Ramesh Kumar', 'Individual', '9876543210', 'ramesh@example.com', 'Patna', '', 'Boring Road, Patna', '']],
    cases: [['Case title', 'Case number', 'CNR', 'Court', 'Stage', 'Client', 'Lead advocate', 'Next hearing date', 'Hearing time', 'File number', 'Opposite party', 'Opposite advocate', 'Filing date', 'Notes'], ['Ramesh Kumar v. State of Bihar', 'CWJC 1234/2025', 'BRHC010012342025', 'Patna High Court', 'Arguments', 'Ramesh Kumar', '', '15/01/2027', '10:30', 'F-101', 'State of Bihar', '', '02/03/2025', '']],
    hearings: [['Case number', 'Hearing date', 'Time', 'Purpose', 'Court', 'Item no.', 'Outcome', 'Appearing advocate'], ['CWJC 1234/2025', '15/01/2027', '10:30', 'Arguments', 'Patna High Court', '12', '', '']],
    tasks: [['Task', 'Case number', 'Due date', 'Assigned to', 'Done'], ['File rejoinder', 'CWJC 1234/2025', '10/01/2027', '', 'No']],
    invoices: [['Invoice number', 'Invoice date', 'Fee (before GST)', 'Client', 'Case number', 'Paid', 'Paid on', 'Description'], ['INV-2025-001', '01/12/2025', '25000', 'Ramesh Kumar', 'CWJC 1234/2025', 'Yes', '05/12/2025', 'Appearance fee']]
  };

  window.LSI = { parseCsv, parseXlsx, readFile, fromJson, date, time, money, cnrOf, guessMap, guessKind, readRow, apply, KINDS, ORDER, TEMPLATE };

  /* ---------- the screen (needs the app's views; absent under Node) ---------- */
  if (!window.React || !window.LSV) return;
  const V = window.LSV, L = window.LS, h = React.createElement, useState = React.useState, K = V.K, X = V.X, Btn = V.Btn, Modal = V.Modal, Chip = V.Chip;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const SOURCES = ['Another practice-management software', 'Excel / Google Sheets diary', 'Accounting or billing software', 'Something else'];
  const STEPS = ['Where from', 'Add files', 'Match columns', 'Check and import'];

  function MigrateFlow({ app }) {
    const [step, setStep] = useState(0), [source, setSource] = useState(SOURCES[0]), [tables, setTables] = useState([]), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [rep, setRep] = useState(null), [open, setOpen] = useState(0);
    const close = () => app.modal(null);
    const add = () => L.pickFile('.csv,.tsv,.txt,.xlsx,.xlsm,.xls,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true).then(async fs => {
      if (!fs.length) return; setBusy('Reading ' + plural(fs.length, 'file') + '…'); setErr('');
      const got = [], bad = [];
      for (const f of fs) { try { (await readFile(f)).forEach(t => { if (t.rows.length < 2) return bad.push(t.name + ': no rows below the header'); const head = t.rows[0].map(String), kind = guessKind(head, t.hint || t.name); got.push({ id: L.uid('t'), name: t.name, head, rows: t.rows.slice(1), kind, map: guessMap(kind, head), on: true }); }); } catch (e) { bad.push(e.message || (f.name + ' could not be read')); } }
      setTables(ts => ts.concat(got)); setBusy(''); if (bad.length) setErr(bad.join(' · '));
    });
    const upd = (id, ch) => setTables(ts => ts.map(t => t.id === id ? Object.assign({}, t, ch) : t));
    const live = tables.filter(t => t.on);
    const checked = live.map(t => { const res = t.rows.map(r => readRow(t.kind, t.map, r)); return { t, ok: res.filter(r => !r.err).length, bad: res.map((r, i) => r.err ? { row: i + 2, why: r.err } : null).filter(Boolean) }; });
    const run = () => {
      let r; const acc = L.access(app.db.sub);
      app.mut(db => { r = apply(db, live.map(t => ({ kind: t.kind, map: t.map, rows: t.rows, name: t.name })), { uid: L.uid, today: L.today(), user: db.user.name, caseCap: acc.limits.cases, stages: window.LSP ? LSP.stages(db.firm) : [] });
        const n = Object.values(r.added).reduce((a, b) => a + b, 0);
        V.logIt(db, `Imported from ${source.toLowerCase()} by ${db.user.name}: ` + ORDER.filter(k => r.added[k]).map(k => plural(r.added[k], KINDS[k].one)).join(', ') + (n ? '' : 'nothing new')); }, null);
      if (r) setRep(r);
    };
    const dl = k => L.csv('legal-staff-' + k + '-template.csv', TEMPLATE[k]);
    const box = (children, extra) => h('div', { style: Object.assign({ border: '1px solid ' + K.line, borderRadius: 10, padding: '14px 16px' }, extra) }, children);
    const note = (txt, tone) => h('div', { style: { fontSize: 13, lineHeight: 1.55, color: tone === 'red' ? K.red : K.mut } }, txt);
    const sel = (value, onChange, options, label) => h('select', { value, 'aria-label': label, onChange: e => onChange(e.target.value), style: Object.assign({}, X.input, { height: 34 }) }, options.map(o => h('option', { key: o[0], value: o[0] }, o[1])));
    const nav = (back, next, nextLabel, disabled) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } }, back ? h(Btn, { onClick: back }, 'Back') : h('span'), h(Btn, { primary: true, disabled, onClick: next }, nextLabel));
    const bar = h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, STEPS.map((s, i) => h('span', { key: s, style: { fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 999, background: i === step ? K.ink : i < step ? K.soft2 : '#fff', color: i === step ? '#fff' : i < step ? K.ink : K.mut, border: '1px solid ' + (i === step ? K.ink : K.line) } }, (i + 1) + '. ' + s)));

    let body;
    if (rep) {
      const n = Object.values(rep.added).reduce((a, b) => a + b, 0);
      body = h(React.Fragment, null,
        box(h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: { fontSize: 15, fontWeight: 600 } }, n ? 'Imported ' + plural(n, 'record') : 'Nothing new was imported'),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, ORDER.map(k => h(Chip, { key: k, tone: rep.added[k] ? null : 'grey' }, plural(rep.added[k], KINDS[k].one)))),
          rep.createdClients > 0 && note(plural(rep.createdClients, 'client') + ' created from names in the cases or invoices. Add their phone and email under Clients.'),
          rep.unlinked > 0 && note(plural(rep.unlinked, 'task or invoice') + ' named a case that was not found, so they were added without one.'),
          rep.capped > 0 && note(plural(rep.capped, 'active case') + ' were not imported because the plan\'s case limit was reached. Upgrade under Subscription and import the same file again: what is already here is skipped.', 'red'))),
        rep.skipped.length > 0 && box(h('div', null, h('div', { style: { fontSize: 13.5, fontWeight: 600, marginBottom: 6 } }, plural(rep.skipped.length, 'row') + ' skipped'),
          h('div', { style: { maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 } }, rep.skipped.slice(0, 300).map((s, i) => h('div', { key: i, style: { fontSize: 12.5, color: K.txt } }, h('span', { style: { color: K.mut } }, s.table + ', row ' + s.row + ': '), s.why))),
          h('div', { style: { marginTop: 10 } }, h(Btn, { small: true, onClick: () => L.csv('legal-staff-import-skipped.csv', [['File', 'Row', 'Reason'], ...rep.skipped.map(s => [s.table, s.row, s.why])]) }, 'Download the skipped rows')))),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' } }, h(Btn, { onClick: () => { setRep(null); setTables([]); setStep(1); } }, 'Import more'), h(Btn, { primary: true, onClick: () => { close(); app.go(rep.added.cases ? 'cases' : rep.added.clients ? 'clients' : 'dashboard'); } }, 'Done')));
    } else if (step === 0) {
      body = h(React.Fragment, null,
        note('Bring your clients, cases, hearing dates, tasks and invoices from the software or diary you use now. Export them from there as Excel (.xlsx) or CSV, then add the files here. The files are read in your browser and are not uploaded anywhere.'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, SOURCES.map(s => h('label', { key: s, style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, border: '1px solid ' + (s === source ? K.ink : K.line), borderRadius: 10, padding: '10px 14px', cursor: 'pointer' } }, h('input', { type: 'radio', name: 'ls-src', checked: s === source, onChange: () => setSource(s) }), s))),
        box(h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: { fontSize: 13.5, fontWeight: 600 } }, 'How to get your data out'),
          note(source === SOURCES[1] ? 'In Excel: File → Save As → Excel Workbook (.xlsx) or CSV. In Google Sheets: File → Download → .xlsx or .csv. Keep one header row at the top of each sheet. One sheet per kind (Clients, Cases, Hearings…) works best.'
            : source === SOURCES[2] ? 'Export your customers as a client list and your sales invoices as a report to Excel or CSV. The fee before GST is used as the invoice amount.'
            : 'Most practice-management products have an Export, Download or Reports option on their cases (matters), clients (contacts), calendar and billing screens. Export each one to Excel or CSV. If yours only gives a JSON export, add that as it is. If it offers no export, ask its support for a copy of your data: you are entitled to it.'),
          h('div', { style: { fontSize: 13, color: K.mut } }, 'Or fill in a template: ', ORDER.map((k, i) => h(React.Fragment, { key: k }, i ? ' · ' : '', h('button', { type: 'button', onClick: () => dl(k), style: { border: 0, background: 'none', padding: 0, color: K.ink, textDecoration: 'underline', cursor: 'pointer', fontSize: 13 } }, KINDS[k].label)))))),
        nav(null, () => setStep(1), 'Next'));
    } else if (step === 1) {
      body = h(React.Fragment, null,
        note('Add every file you exported. Each sheet of an Excel file is read separately. Say what each one holds; the guess is made from its name and columns.'),
        tables.map(t => box(h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
          h('input', { type: 'checkbox', checked: t.on, 'aria-label': 'Import ' + t.name, onChange: e => upd(t.id, { on: e.target.checked }) }),
          h('div', { style: { flex: '1 1 200px', minWidth: 0 } }, h('div', { style: { fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.name), h('div', { style: { fontSize: 12.5, color: K.mut } }, plural(t.rows.length, 'row') + ' · ' + t.head.slice(0, 5).join(', ') + (t.head.length > 5 ? '…' : ''))),
          sel(t.kind, k => upd(t.id, { kind: k, map: guessMap(k, t.head) }), ORDER.map(k => [k, KINDS[k].label]), 'What ' + t.name + ' holds'),
          h(Btn, { small: true, danger: true, onClick: () => setTables(ts => ts.filter(x => x.id !== t.id)) }, 'Remove')), { key: t.id, opacity: t.on ? 1 : .55 })),
        h('div', null, h(Btn, { onClick: add, disabled: !!busy }, busy || (tables.length ? '+ Add another file' : '+ Choose files (Excel, CSV or JSON)'))),
        err && note(err, 'red'),
        nav(() => setStep(0), () => { setOpen(0); setStep(2); }, 'Next', !live.length));
    } else if (step === 2) {
      const t = live[Math.min(open, live.length - 1)], cols = [['', 'Not in this file'], ...t.head.map((x, i) => [String(i), x || 'Column ' + (i + 1)])];
      const sample = i => t.rows.slice(0, 3).map(r => r[i]).filter(x => String(x || '').trim()).slice(0, 2).join(' · ');
      body = h(React.Fragment, null,
        live.length > 1 && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, live.map((x, i) => h(Btn, { key: x.id, small: true, primary: x.id === t.id, onClick: () => setOpen(i) }, KINDS[x.kind].label + ' · ' + x.name.split(' · ').pop()))),
        note('Which column of "' + t.name + '" holds each detail. Columns with familiar names are matched already; check them against the example values.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(130px,1fr) minmax(150px,1.3fr)', gap: '8px 12px', alignItems: 'center' } },
          KINDS[t.kind].fields.map(([k, label, , req]) => h(React.Fragment, { key: k },
            h('div', { style: { fontSize: 13.5 } }, label, req && h('span', { style: { color: K.red } }, ' *'), t.map[k] != null && h('div', { style: { fontSize: 12, color: K.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sample(t.map[k]) || 'empty in the first rows')),
            sel(t.map[k] == null ? '' : String(t.map[k]), x => upd(t.id, { map: Object.assign({}, t.map, { [k]: x === '' ? undefined : +x }) }), cols, label)))),
        t.kind === 'cases' && note('A case needs a title and a number. With only one of them, the other is filled from it. Cases whose stage says disposed, decided or closed come in as disposed and do not count toward the plan\'s case limit.'),
        t.kind !== 'clients' && t.kind !== 'cases' && note('Rows are linked to a case by CNR, case number, file number or title, so import the cases in the same run or before.'),
        nav(() => setStep(1), () => open < live.length - 1 ? setOpen(open + 1) : setStep(3), open < live.length - 1 ? 'Next file' : 'Check the rows'));
    } else {
      const ok = checked.reduce((a, c) => a + c.ok, 0), bad = checked.reduce((a, c) => a + c.bad.length, 0);
      body = h(React.Fragment, null,
        checked.sort((a, b) => ORDER.indexOf(a.t.kind) - ORDER.indexOf(b.t.kind)).map(c => box(h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 14 } }, h('span', { style: { fontWeight: 500 } }, KINDS[c.t.kind].label + ' · ' + c.t.name), h('span', { style: { display: 'flex', gap: 6 } }, h(Chip, null, c.ok + ' ready'), c.bad.length > 0 && h(Chip, { tone: 'red' }, c.bad.length + ' with problems'))),
          c.bad.slice(0, 4).map((b, i) => h('div', { key: i, style: { fontSize: 12.5, color: K.txt } }, h('span', { style: { color: K.mut } }, 'Row ' + b.row + ': '), b.why)),
          c.bad.length > 4 && note('and ' + (c.bad.length - 4) + ' more. Rows with problems are skipped; the report lists them all.')), { key: c.t.id })),
        note('Nothing already here is changed or deleted. Records that are already here (same CNR, case number, client name, hearing date or invoice number) are skipped, so the same file can be imported again safely. ' + (window.LSB && LSB.on ? 'Imported records are saved to your firm\'s account and the team sees them.' : 'Imported records are saved on this device.')),
        nav(() => { setOpen(live.length - 1); setStep(2); }, run, ok ? 'Import ' + plural(ok, 'row') : 'Nothing to import', !ok));
      if (!ok && bad) body = h(React.Fragment, null, body, note('Every row has a problem. Go back and check that the columns are matched.', 'red'));
    }
    return h(Modal, { title: rep ? 'Import finished' : 'Move your data from other software', sub: rep ? null : 'Clients, cases, hearings, tasks and invoices', onClose: close, width: 680 }, !rep && bar, body);
  }
  function migrate(app) {
    app.modal(() => h(MigrateFlow, { app }));
  }
  Object.assign(window.LSI, { MigrateFlow, migrate });
})();

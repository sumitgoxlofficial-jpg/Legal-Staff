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

  /* Old Excel (.xls, Excel 97–2003, BIFF8): a compound file holding a "Workbook" stream of records. Reads the shared strings
     (including strings split across CONTINUE records), every worksheet's text, number, RK, MULRK, formula-result and boolean
     cells. Numbers come back as text; dates are Excel serials, which date() reads. Returns [{ name, rows }]. */
  function cfbStream(buf, names) {
    const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), u32 = o => dv.getUint32(o, true);
    if (b.length < 512 || u32(0) !== 0xE011CFD0 || u32(4) !== 0xE11AB1A1) throw new Error('This file is not an Excel 97–2003 (.xls) workbook. Open it in Excel and save it as .xlsx or CSV.');
    const ss = 1 << dv.getUint16(30, true), mss = 1 << dv.getUint16(32, true), cutoff = u32(56), at = n => 512 + n * ss, END = 0xFFFFFFFE;
    const fatSecs = []; for (let i = 0; i < 109; i++) { const v = u32(76 + i * 4); if (v < 0xFFFFFFFA) fatSecs.push(v); }
    for (let d = u32(68), guard = 0; d < 0xFFFFFFFA && guard++ < 10000;) { for (let i = 0; i < ss / 4 - 1; i++) { const v = u32(at(d) + i * 4); if (v < 0xFFFFFFFA) fatSecs.push(v); } d = u32(at(d) + ss - 4); }
    const fat = []; fatSecs.forEach(sec => { for (let i = 0; i < ss / 4; i++) fat.push(u32(at(sec) + i * 4)); });
    const chain = (start, table) => { const out = []; for (let n = start, guard = 0; n < 0xFFFFFFFA && n !== END && guard++ < 1e6; n = table[n]) out.push(n); return out; };
    const read = start => { const secs = chain(start, fat), out = new Uint8Array(secs.length * ss); secs.forEach((n, i) => out.set(b.subarray(at(n), at(n) + ss), i * ss)); return out; };
    const dir = read(u32(48)), ddv = new DataView(dir.buffer), ents = [];
    for (let o = 0; o + 128 <= dir.length; o += 128) { const nl = ddv.getUint16(o + 64, true); ents.push({ name: String.fromCharCode(...new Uint16Array(dir.slice(o, o + Math.max(0, nl - 2)).buffer)), type: dir[o + 66], start: ddv.getUint32(o + 116, true), size: ddv.getUint32(o + 120, true) }); }
    const e = ents.find(x => x.type === 2 && names.includes(x.name)); if (!e) throw new Error('No workbook found in this .xls file. Open it in Excel and save it as .xlsx or CSV.');
    if (e.size >= cutoff) return read(e.start).subarray(0, e.size);
    const mini = read(ents[0].start), mfat = [], mf = read(u32(60)), mdv = new DataView(mf.buffer); for (let i = 0; i + 4 <= mf.length; i += 4) mfat.push(mdv.getUint32(i, true));
    const secs = chain(e.start, mfat), out = new Uint8Array(secs.length * mss); secs.forEach((n, i) => out.set(mini.subarray(n * mss, n * mss + mss), i * mss)); return out.subarray(0, e.size);
  }
  function parseXls(buf) {
    const w = cfbStream(buf, ['Workbook', 'Book']), dv = new DataView(w.buffer, w.byteOffset, w.byteLength), u16 = o => dv.getUint16(o, true), u32 = o => dv.getUint32(o, true);
    const recs = []; for (let p = 0; p + 4 <= w.length;) { const type = u16(p), len = u16(p + 2); recs.push({ type, pos: p, off: p + 4, len }); p += 4 + len; }
    const bof = recs[0]; if (!bof || bof.type !== 0x0809 || u16(bof.off) !== 0x0600) throw new Error('This .xls file is from Excel 95 or older. Open it in Excel and save it as .xlsx or CSV.');
    if (recs.some(r => r.type === 0x002F)) throw new Error('This .xls file is password protected. Remove the password in Excel, save it, and try again.');
    /* XLUnicodeString chars: 1 byte each (latin-1) or 2 (UTF-16LE). seg is a list of [start, end) byte ranges (a record and its CONTINUEs). */
    const reader = segs => { let si = 0, p = segs[0][0]; const left = () => segs[si][1] - p, next = () => { si++; p = segs[si] ? segs[si][0] : 0; };
      const take = n => { const out = []; while (n > 0) { if (left() <= 0) next(); if (!segs[si]) break; const k = Math.min(n, left()); out.push([p, k]); p += k; n -= k; } return out; };
      const byte = () => { if (left() <= 0) next(); return w[p++]; }, word = () => { const t = take(2), c = t.flatMap(([q, k]) => Array.from(w.subarray(q, q + k))); return c[0] | (c[1] << 8); }, dword = () => { const t = take(4), c = t.flatMap(([q, k]) => Array.from(w.subarray(q, q + k))); return (c[0] | c[1] << 8 | c[2] << 16) + c[3] * 16777216; };
      const chars = (cch, high) => { let out = ''; while (cch > 0) { if (left() <= 0) { next(); if (!segs[si]) break; high = w[p++] & 1; } const k = Math.min(cch, Math.floor(left() / (high ? 2 : 1))); for (let i = 0; i < k; i++) out += String.fromCharCode(high ? w[p + 2 * i] | (w[p + 2 * i + 1] << 8) : w[p + i]); p += k * (high ? 2 : 1); cch -= k; } return out; };
      const str = (cch16) => { const cch = cch16 ? word() : byte(), fl = byte(), rich = fl & 8 ? word() : 0, ext = fl & 4 ? dword() : 0, t = chars(cch, fl & 1); take(rich * 4 + ext); return t; };
      return { str, done: () => !segs[si] || (si === segs.length - 1 && left() <= 0), dword }; };
    const withCont = i => { const segs = [[recs[i].off, recs[i].off + recs[i].len]]; for (let j = i + 1; recs[j] && recs[j].type === 0x003C; j++) segs.push([recs[j].off, recs[j].off + recs[j].len]); return segs; };
    let sst = []; const si = recs.findIndex(r => r.type === 0x00FC);
    if (si >= 0) { const r = reader(withCont(si)); r.dword(); const n = r.dword(); for (let i = 0; i < n && !r.done(); i++) sst.push(r.str(true)); }
    const num = x => { const s = String(Number(x.toPrecision(15))); return s; };
    const rk = v => { let x; if (v & 2) x = v >> 2; else { const t = new DataView(new ArrayBuffer(8)); t.setUint32(4, v & 0xFFFFFFFC, true); t.setUint32(0, 0, true); x = t.getFloat64(0, true); } return num(v & 1 ? x / 100 : x); };
    const sheets = recs.filter(r => r.type === 0x0085 && w[r.off + 5] === 0).map(r => ({ pos: u32(r.off), name: reader([[r.off + 6, r.off + r.len]]).str(false) }));
    return sheets.map(sh => {
      const grid = [], put = (row, col, v) => { (grid[row] || (grid[row] = []))[col] = v; };
      let i = recs.findIndex(r => r.pos === sh.pos); if (i < 0) return { name: sh.name, rows: [] };
      let pend = null;
      for (i++; i < recs.length && recs[i].type !== 0x000A; i++) {
        const r = recs[i], o = r.off, row = u16(o), col = u16(o + 2);
        if (r.type === 0x00FD) put(row, col, sst[u32(o + 6)] || '');
        else if (r.type === 0x0203) put(row, col, num(dv.getFloat64(o + 6, true)));
        else if (r.type === 0x027E) put(row, col, rk(u32(o + 6)));
        else if (r.type === 0x00BD) { const last = u16(o + r.len - 2); for (let c = col, q = o + 4; c <= last; c++, q += 6) put(row, c, rk(u32(q + 2))); }
        else if (r.type === 0x0204) put(row, col, reader([[o + 6, o + r.len]]).str(true));
        else if (r.type === 0x0205) put(row, col, w[o + 7] ? '' : w[o + 6] ? 'TRUE' : 'FALSE');
        else if (r.type === 0x0006) { if (u16(o + 12) === 0xFFFF) { const k = w[o + 6]; if (k === 0) pend = [row, col]; else if (k === 1) put(row, col, w[o + 8] ? 'TRUE' : 'FALSE'); } else put(row, col, num(dv.getFloat64(o + 6, true))); }
        else if (r.type === 0x0207 && pend) { put(pend[0], pend[1], reader(withCont(i)).str(true)); pend = null; }
      }
      const rows = Array.from(grid, r => Array.from(r || [], x => x == null ? '' : x)).filter(r => r.some(c => String(c).trim() !== ''));
      return { name: sh.name, rows };
    }).filter(s => s.rows.length);
  }
  /* A File (or { name, text() / arrayBuffer() }) → [{ name, rows }] tables. */
  async function readFile(f) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (ext === 'xls') return parseXls(await f.arrayBuffer()).map(s => ({ name: f.name + ' · ' + s.name, rows: s.rows }));
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
  /* Month first (03/04/2027 = 4 March) is used for ambiguous dates only while reading a column that shows it: some value has a
     second part above 12 and none has a first part above 12. Set by inColumns() around the rows of one table. */
  let MDY = false;
  function date(v, mdy) {
    if (mdy === undefined) mdy = MDY;
    const s = String(v == null ? '' : v).trim(); if (!s) return '';
    let m;
    if (/^\d{4,5}(\.\d+)?$/.test(s) && +s > 20000 && +s < 80000) { const t = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 864e5); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s))) return okYmd(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/.exec(s))) return mdy ? okYmd(+m[3], +m[1], +m[2]) || okYmd(+m[3], +m[2], +m[1]) : okYmd(+m[3], +m[2], +m[1]) || okYmd(+m[3], +m[1], +m[2]);
    const mon = w => MON[w.toLowerCase()] || MON[w.slice(0, 3).toLowerCase()];
    if ((m = /^(\d{1,2})(?:st|nd|rd|th)?[\s\-/.,]+([A-Za-z]{3,9})\.?[\s\-/.,]+(\d{2,4})/.exec(s)) && mon(m[2])) return okYmd(+m[3], mon(m[2]), +m[1]);
    if ((m = /^([A-Za-z]{3,9})\.?[\s\-/.]+(\d{1,2})(?:st|nd|rd|th)?,?[\s\-/.]+(\d{2,4})/.exec(s)) && mon(m[1])) return okYmd(+m[3], mon(m[1]), +m[2]);
    return '';
  }
  function time(v) {
    const s = String(v == null ? '' : v).trim(); if (!s) return '';
    if (/^\d{5}\.\d+$/.test(s) && +s > 20000) return time(String(+s % 1));
    if (/^0?\.\d+$/.test(s)) { const mins = Math.round(+s * 1440); return pad(Math.floor(mins / 60) % 24) + ':' + pad(mins % 60); }
    const re = /^(\d{1,2})(?:[:.](\d{2}))?(?::\d{2})?\s*([ap])?\.?\s*m?\.?$/i, dt = /[\sT](\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:[ap]\.?m\.?)?)\s*(?:z|[+-]\d{2}:?\d{2})?$/i.exec(s);
    const m = re.exec(s) || (dt && re.exec(dt[1].replace(/\.\d+$/, '')));
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
      ['first', 'First name (joined to the last name)', ['firstname', 'givenname', 'fname', 'first']],
      ['last', 'Last name', ['lastname', 'surname', 'familyname', 'lname', 'last']],
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

  /* Column names in the exports of some widely used practice-management products, checked before the general names above.
     Taken from how those products name their export columns; the wizard still shows every match for checking. */
  const PRESETS = {
    clio: { label: 'Clio', clients: { name: ['Name', 'Company'], first: ['First Name'], last: ['Last Name'], email: ['Primary Email Address', 'Email Address'], phone: ['Primary Phone Number', 'Phone Number'], city: ['Primary Address City', 'City'], address: ['Primary Address Street', 'Primary Address'] },
      cases: { title: ['Description', 'Matter Description'], no: ['Matter Number', 'Display Number'], client: ['Client', 'Client Name'], team: ['Responsible Attorney', 'Originating Attorney'], stage: ['Status', 'Matter Stage'], filed: ['Open Date'], notes: ['Practice Area'] },
      hearings: { case: ['Matter', 'Matter Number'], date: ['Start', 'Start Date', 'Start At'], time: ['Start', 'Start Time', 'Start At'], purpose: ['Summary', 'Subject', 'Name'], court: ['Location'], outcome: ['Description'], assignee: ['Attendees', 'Calendar Owner'] },
      tasks: { t: ['Name', 'Task Name'], case: ['Matter'], due: ['Due Date', 'Due At'], who: ['Assignee', 'Assigned To'], done: ['Status', 'Completed'] },
      invoices: { no: ['Bill Number', 'Invoice Number', 'Number'], date: ['Issue Date', 'Issued At'], amount: ['Subtotal', 'Total'], client: ['Client'], case: ['Matter', 'Matters'], paid: ['Status', 'State'], paidOn: ['Paid At', 'Paid Date'] } },
    mycase: { label: 'MyCase', clients: { first: ['First Name'], last: ['Last Name'], name: ['Company', 'Company Name'], email: ['Email', 'Email Address'], phone: ['Mobile Phone', 'Cell Phone', 'Work Phone', 'Home Phone'], city: ['City'], address: ['Address', 'Address 1'] },
      cases: { title: ['Case Name', 'Name'], no: ['Case Number', 'Case/Matter Number'], client: ['Contacts', 'Client', 'Contact'], team: ['Lead Attorney', 'Lead Lawyer', 'Originating Attorney'], stage: ['Case Stage', 'Stage', 'Status'], filed: ['Date Opened', 'Open Date'], notes: ['Description', 'Practice Area'] },
      hearings: { case: ['Case', 'Case Name', 'Case/Matter'], date: ['Start Date', 'Start'], time: ['Start Time', 'Start'], purpose: ['Event Name', 'Name', 'Event Type'], court: ['Location'], outcome: ['Description'], assignee: ['Staff', 'Shared With'] },
      tasks: { t: ['Task Name', 'Name'], case: ['Case', 'Case Name'], due: ['Due Date'], who: ['Assigned To', 'Assignees'], done: ['Completed', 'Status'] },
      invoices: { no: ['Invoice #', 'Invoice Number', 'Number'], date: ['Invoice Date', 'Date'], amount: ['Subtotal', 'Total', 'Amount'], client: ['Contact', 'Billing Contact', 'Client'], case: ['Case', 'Case Name'], paid: ['Status'], paidOn: ['Paid Date', 'Last Payment Date'] } },
    practicepanther: { label: 'PracticePanther', clients: { name: ['Display Name', 'Account Name', 'Name'], first: ['First Name'], last: ['Last Name'], email: ['Email', 'Primary Email'], phone: ['Mobile', 'Mobile Phone', 'Phone'], city: ['City'], address: ['Address', 'Street'] },
      cases: { title: ['Matter Name', 'Name'], no: ['Matter Number', 'Number'], client: ['Account', 'Account Name', 'Contact'], team: ['Assigned To', 'Assigned Users', 'Originator'], stage: ['Status'], filed: ['Open Date', 'Opened'], notes: ['Notes', 'Practice Area'] },
      hearings: { case: ['Matter', 'Matter Name'], date: ['Start Date', 'Start'], time: ['Start Time', 'Start'], purpose: ['Subject', 'Name'], court: ['Location'], outcome: ['Notes', 'Description'], assignee: ['Assigned To'] },
      tasks: { t: ['Subject', 'Name'], case: ['Matter', 'Matter Name'], due: ['Due Date'], who: ['Assigned To'], done: ['Status', 'Completed'] },
      invoices: { no: ['Invoice Number', 'Number'], date: ['Invoice Date', 'Date'], amount: ['Subtotal', 'Total'], client: ['Account', 'Account Name'], case: ['Matter', 'Matter Name'], paid: ['Status'], paidOn: ['Paid Date'] } }
  };
  /* Which source column feeds each field: the product's own names (preset) first, then exact general names, then a known name
     inside a longer header ("Next Hearing Date (DD/MM)"). A column may feed both the date and the time ("Start" = date and time). */
  function guessMap(kind, headers, preset) {
    const hk = headers.map(key), used = new Set(), map = {};
    const pick = test => { const i = hk.findIndex((x, j) => !used.has(j) && x && test(x)); if (i >= 0) used.add(i); return i; };
    const pre = PRESETS[preset] && PRESETS[preset][kind];
    if (pre) Object.keys(pre).forEach(f => { for (const name of pre[f]) { const i = hk.indexOf(key(name)); if (i >= 0 && (!used.has(i) || (f === 'time' && map.date === i))) { used.add(i); map[f] = i; break; } } });
    KINDS[kind].fields.forEach(([k, , syn]) => { if (map[k] != null) return; const i = pick(x => syn.map(key).includes(x)); if (i >= 0) map[k] = i; });
    KINDS[kind].fields.forEach(([k, , syn]) => { const i = pick(x => syn.map(key).includes(x)); if (i >= 0) map[k] = i; });
    KINDS[kind].fields.forEach(([k, , syn]) => { if (map[k] != null) return; const i = pick(x => syn.map(key).some(s => s.length >= 4 && x.includes(s))); if (i >= 0) map[k] = i; });
    if (kind === 'clients' && map.name == null && map.first == null) delete map.last;
    return map;
  }
  /* The kind a table most likely holds, from its name (sheet or JSON key) and how many headers each kind recognises. */
  function guessKind(headers, name, preset) {
    /* The sheet's own name (after the file name) decides first, then the file name. */
    const WORDS = [['invoice', 'invoices'], ['bill', 'invoices'], ['hearing', 'hearings'], ['diary', 'hearings'], ['calendar', 'hearings'], ['event', 'hearings'], ['task', 'tasks'], ['todo', 'tasks'], ['client', 'clients'], ['contact', 'clients'], ['customer', 'clients'], ['case', 'cases'], ['matter', 'cases']];
    const byName = String(name || '').split(' · ').reverse().map(key).reduce((hit, n) => hit || WORDS.find(([w]) => n.includes(w)), null);
    if (byName) return byName[1];
    const score = k => { const m = guessMap(k, headers, preset); return KINDS[k].fields.reduce((a, [f, , , req]) => a + (m[f] != null ? (req ? 3 : 1) : 0), 0) - (KINDS[k].fields.some(([f, , , req]) => req && m[f] == null) ? 4 : 0); };
    return ORDER.slice().sort((a, b) => score(b) - score(a))[0];
  }

  /* ---------- turning rows into records ---------- */
  const DATES = { cases: ['next', 'filed'], hearings: ['date'], tasks: ['due'], invoices: ['date', 'paidOn'], clients: [] };
  function monthFirst(kind, map, rows) {
    let dmy = 0, mdy = 0;
    DATES[kind].filter(f => map[f] != null).forEach(f => rows.forEach(r => { const m = /^\s*(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/.exec(String(r[map[f]] == null ? '' : r[map[f]])); if (m) { if (+m[1] > 12) dmy++; if (+m[2] > 12) mdy++; } }));
    return mdy > 0 && dmy === 0;
  }
  /* Runs fn with the table's date order in force. */
  function inColumns(kind, map, rows, fn) { const was = MDY; MDY = monthFirst(kind, map, rows); try { return fn(); } finally { MDY = was; } }
  /* One mapped row → { v (values by field), err (message, or '') }. */
  function readRow(kind, map, row) {
    const v = {}; KINDS[kind].fields.forEach(([k]) => { v[k] = map[k] != null ? String(row[map[k]] == null ? '' : row[map[k]]).trim() : ''; });
    if (kind === 'clients' && !v.name) v.name = [v.first, v.last].filter(Boolean).join(' ');
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
    const rep = { added: { clients: 0, cases: 0, hearings: 0, tasks: 0, invoices: 0 }, skipped: [], createdClients: 0, unlinked: 0, capped: 0 }, tag = o.importId ? { importId: o.importId, imported: o.today } : {};
    const skip = (t, i, why) => rep.skipped.push({ table: t.name || KINDS[t.kind].label, row: i + 2, why });
    const clientBy = name => { const k = norm(name); return k ? db.clients.find(c => norm(c.name) === k) : null; };
    const ensureClient = name => { if (!String(name || '').trim()) return ''; let c = clientBy(name); if (!c) { c = { ...tag, id: o.uid('cl'), name: String(name).trim(), type: /\b(ltd|limited|llp|pvt|private|corporation|bank|inc|company|co\.)\b/i.test(name) ? 'Company' : 'Individual', city: '', contact: '', phone: '', email: '', notes: 'Added while importing', portal: false, share: { dates: true, orders: true, invoices: false } }; db.clients.unshift(c); rep.createdClients++; } return c.id; };
    const caseBy = ref => { const s = String(ref || '').trim(); if (!s) return null; const cnr = cnrOf(s), k = key(s), n = norm(s);
      return (cnr && db.cases.find(c => c.cnr === cnr)) || db.cases.find(c => key(c.no) === k) || db.cases.find(c => c.fileNo && key(c.fileNo) === k) || db.cases.find(c => norm(c.title) === n || norm(c.full) === n) || null; };
    const fresh = new Set();   // hearings made in this run from a case's next date: a hearings sheet may add their time and purpose
    let live = db.cases.filter(c => c.status === 'active' || c.status === 'pending').length;
    const sorted = tables.slice().sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    sorted.forEach(t => inColumns(t.kind, t.map, t.rows, () => t.rows.forEach((row, i) => {
      const { v, err } = readRow(t.kind, t.map, row);
      if (err) return skip(t, i, err);
      if (t.kind === 'clients') {
        const dup = clientBy(v.name) || (v.email && db.clients.find(c => c.email && c.email.toLowerCase() === v.email.toLowerCase())) || (v.phone && key(v.phone).length >= 10 && db.clients.find(c => c.phone && key(c.phone).slice(-10) === key(v.phone).slice(-10)));
        if (dup) { ['phone', 'email', 'city', 'contact', 'address'].forEach(k => { if (!dup[k] && v[k]) dup[k] = k === 'phone' ? phoneOf(v[k]) : v[k]; }); return skip(t, i, 'Already here: ' + dup.name + ' (blank details filled in)'); }
        const type = /compan|ltd|pvt|corporate|llp/i.test(v.type) ? 'Company' : /firm|partnership/i.test(v.type) ? 'Firm' : /gov|state|union|department|ministry/i.test(v.type) ? 'Government body' : /\b(ltd|limited|llp|pvt|private|bank)\b/i.test(v.name) ? 'Company' : 'Individual';
        db.clients.unshift({ ...tag, id: o.uid('cl'), name: v.name, type, city: v.city, contact: v.contact, phone: phoneOf(v.phone), email: v.email, address: v.address, notes: v.notes, portal: false, share: { dates: true, orders: true, invoices: false } });
        rep.added.clients++;
      } else if (t.kind === 'cases') {
        const cnr = cnrOf(v.cnr), dup = (cnr && db.cases.find(c => c.cnr === cnr)) || db.cases.find(c => key(c.no) === key(v.no) && norm(c.title) === norm(v.title));
        if (dup) return skip(t, i, 'Already here: ' + dup.title + ' (' + dup.no + ')');
        const status = caseStatus(v.stage);
        if (status !== 'disposed' && live >= o.caseCap) { rep.capped++; return skip(t, i, 'Over the plan\'s active-case limit'); }
        const stage = (o.stages.find(s => key(s) === key(v.stage)) || v.stage || o.stages[0] || 'Pleadings'), court = v.court || 'Not recorded', team = v.team || o.user, id = o.uid('c');
        db.cases.unshift({ ...tag, id, title: v.title, full: v.title, no: v.no, cnr, court, forum: court, purpose: stage, stage, status, team: [team].filter(Boolean), clientId: ensureClient(v.client), fileNo: v.fileNo, bench: v.bench, state: v.state, district: v.district, oppAdv: v.oppAdv, labels: [], idKind: cnr ? 'cnr' : v.filingNo ? 'filing_number' : v.diaryNo ? 'diary_number' : 'case_number', category: category(court, cnr), tribunal: tribunal(court), filingNo: v.filingNo, diaryNo: v.diaryNo, createdBy: o.user, createdOn: date(v.filed) || o.today, summary: v.notes, summaryMeta: v.notes ? 'Imported note' : '', parties: v.opp ? [v.opp] : [], issues: [], missing: [], args: '', imported: o.today });
        if (status !== 'disposed') live++;
        const nd = date(v.next);
        if (nd) { const hid = o.uid('h'); fresh.add(hid); db.hearings.push({ ...tag, id: hid, caseId: id, date: nd, time: time(v.time) || '10:30', court, item: '', purpose: stage, assignee: team, outcome: '', brief: false }); }
        rep.added.cases++;
      } else {
        const c = caseBy(v.case);
        if (t.kind === 'hearings') {
          if (!c) return skip(t, i, 'No case matches "' + v.case + '". Import the cases first, or check the number');
          const d = date(v.date);
          const same = db.hearings.find(x => x.caseId === c.id && x.date === d);
          if (same && fresh.has(same.id)) { fresh.delete(same.id); Object.assign(same, { time: time(v.time) || same.time, purpose: v.purpose || same.purpose, item: v.item || same.item, court: v.court || same.court, assignee: v.assignee || same.assignee }); return; }
          if (same) return skip(t, i, 'Already on the calendar: ' + c.title + ' on ' + d);
          db.hearings.push({ ...tag, id: o.uid('h'), caseId: c.id, date: d, time: time(v.time) || '10:30', court: v.court || c.court, item: v.item, purpose: v.purpose || c.stage || 'Hearing', assignee: v.assignee || (c.team || [])[0] || o.user, outcome: d < o.today ? v.outcome : '', brief: false });
          rep.added.hearings++;
        } else if (t.kind === 'tasks') {
          if (v.case && !c) rep.unlinked++;
          const due = date(v.due) || '';
          if (db.tasks.some(x => key(x.t) === key(v.t) && (x.caseId || '') === (c ? c.id : '') && (x.due || '') === due)) return skip(t, i, 'Already here: ' + v.t);
          db.tasks.push({ ...tag, id: o.uid('t'), caseId: c ? c.id : '', t: v.t, who: v.who || o.user, due, done: yes(v.done) });
          rep.added.tasks++;
        } else if (t.kind === 'invoices') {
          if (v.case && !c) rep.unlinked++;
          if (v.no && db.invoices.some(x => key(x.no) === key(v.no))) return skip(t, i, 'Already here: invoice ' + v.no);
          const clientId = c && c.clientId ? c.clientId : ensureClient(v.client), paidOn = date(v.paidOn);
          if (!clientId && !c) return skip(t, i, 'No client or case to bill it to');
          db.invoices.unshift({ ...tag, id: o.uid('i'), no: v.no || 'IMP-' + (date(v.date) || o.today).slice(0, 4) + '-' + pad(rep.added.invoices + 1).padStart(3, '0'), clientId, caseId: c ? c.id : '', date: date(v.date), amount: money(v.amount), paid: yes(v.paid) || !!paidOn, paidOn: paidOn || (yes(v.paid) ? date(v.date) : ''), desc: v.desc || 'Imported invoice' });
          rep.added.invoices++;
        }
      }
    })));
    return rep;
  }

  /* ---------- undoing an import ----------
     Every record an import adds carries its importId. imports() lists the runs still present; undoImport() removes what a run
     added. Hearings and orders of a removed case go with it (as when a case is deleted); tasks, documents and deadlines that were
     added by hand stay, unlinked. An invoice added by hand to an imported case blocks the undo: invoices are financial records.
     An imported client that a case or invoice added by hand now uses is kept. Details filled into existing clients stay. */
  const COLS = ['clients', 'cases', 'hearings', 'tasks', 'invoices', 'docs'];
  function imports(db) {
    const by = {};
    COLS.forEach(k => (db[k] || []).forEach(r => { if (!r || !r.importId) return; const x = by[r.importId] || (by[r.importId] = { id: r.importId, date: '', counts: {}, label: '' }); x.counts[k] = (x.counts[k] || 0) + 1; if (r.imported && (!x.date || r.imported < x.date)) x.date = r.imported; }));
    (db.log || []).forEach(l => { const x = l.importId && by[l.importId]; if (x) { if (!x.label) x.label = l.x; if (!x.date) x.date = (l.ts || '').slice(0, 10); } });
    return Object.values(by).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }
  function undoImport(db, id) {
    const mine = r => r && r.importId === id, gone = new Set(db.cases.filter(mine).map(c => c.id));
    const held = db.invoices.filter(i => !mine(i) && gone.has(i.caseId));
    if (held.length) return { blocked: `${held.length === 1 ? 'Invoice ' + held[0].no + ' was' : held.length + ' invoices were'} raised by hand on a case from this import. Delete ${held.length === 1 ? 'it' : 'them'} or move ${held.length === 1 ? 'it' : 'them'} to another case first.` };
    const removed = { clients: 0, cases: 0, hearings: 0, tasks: 0, invoices: 0, docs: 0, orders: 0 }, files = [];
    const cut = (k, test) => { const before = db[k].length; db[k] = db[k].filter(r => !test(r)); removed[k] += before - db[k].length; };
    cut('cases', mine);
    cut('hearings', h => mine(h) || gone.has(h.caseId));
    cut('orders', x => gone.has(x.caseId));
    cut('tasks', mine); db.tasks.forEach(t => { if (gone.has(t.caseId)) t.caseId = ''; });
    db.docs.filter(x => mine(x) || (gone.has(x.caseId) && x.orderId)).forEach(x => files.push(x));
    cut('docs', x => mine(x) || (gone.has(x.caseId) && x.orderId)); db.docs.forEach(x => { if (gone.has(x.caseId)) x.caseId = ''; });
    cut('invoices', mine);
    ['deadlines', 'lims'].forEach(k => (db[k] || []).forEach(x => { if (gone.has(x.caseId)) x.caseId = ''; }));
    const used = new Set([...db.cases.map(c => c.clientId), ...db.invoices.map(i => i.clientId)]);
    const kept = db.clients.filter(c => mine(c) && used.has(c.id));
    kept.forEach(c => { delete c.importId; });
    cut('clients', mine);
    return { removed, kept: kept.length, files };
  }

  /* ---------- documents: which case a file belongs to, from its file name or the folders it sits in ---------- */
  function matchDoc(path, cases) {
    const k = key(path), n = norm(path); let best = '', score = 0;
    (cases || []).forEach(c => [[c.cnr, 1000, key], [c.no, 500, key], [c.fileNo, 400, key], [c.title, 300, norm], [c.full, 300, norm]].forEach(([v, w, f]) => {
      const kv = f(v); if (!kv || kv.length < (f === norm ? 6 : 4) || !(f === norm ? n : k).includes(kv)) return;
      if (w + kv.length > score) { score = w + kv.length; best = c.id; } }));
    return best;
  }
  const docType = name => /\b(order|judg(e)?ment|decree|proceedings?|daily ?order|interim)\b/i.test(name) ? 'Court order' : /\b(petition|plaint|reply|written ?statement|w\.?s\.?|affidavit|application|appeal|rejoinder|vakalat(nama)?|complaint|counter|objection)\b/i.test(name) ? 'Pleading' : /\bdraft\b/i.test(name) ? 'Draft' : /\b(letter|notice|e-?mail|mail|correspondence|reminder)\b/i.test(name) ? 'Correspondence' : 'Other';
  const MIME = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', txt: 'text/plain', rtf: 'application/rtf', tif: 'image/tiff', tiff: 'image/tiff' };
  /* A .zip of a document folder → [{ path, file }], skipping folders and system files. Files stored in a way the browser cannot unpack are listed in bad. */
  async function zipEntries(buf, name) {
    const z = await unzip(buf), out = [], bad = [];
    Object.keys(z).filter(p => !p.endsWith('/') && !/(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)/i.test(p) && !/(^|\/)\._/.test(p)).forEach(p => {
      if (!z[p]) return bad.push(p);
      const base = p.split('/').pop(), ext = (base.split('.').pop() || '').toLowerCase();
      out.push({ path: (name ? name.replace(/\.zip$/i, '') + '/' : '') + p, file: new File([z[p]], base, { type: MIME[ext] || 'application/octet-stream' }) });
    });
    return { out, bad };
  }

  /* A blank template for each kind: the header row plus one example row. */
  const TEMPLATE = {
    clients: [['Client name', 'Type', 'Phone', 'Email', 'City', 'Contact person', 'Address', 'Notes'], ['Ramesh Kumar', 'Individual', '9876543210', 'ramesh@example.com', 'Patna', '', 'Boring Road, Patna', '']],
    cases: [['Case title', 'Case number', 'CNR', 'Court', 'Stage', 'Client', 'Lead advocate', 'Next hearing date', 'Hearing time', 'File number', 'Opposite party', 'Opposite advocate', 'Filing date', 'Notes'], ['Ramesh Kumar v. State of Bihar', 'CWJC 1234/2025', 'BRHC010012342025', 'Patna High Court', 'Arguments', 'Ramesh Kumar', '', '15/01/2027', '10:30', 'F-101', 'State of Bihar', '', '02/03/2025', '']],
    hearings: [['Case number', 'Hearing date', 'Time', 'Purpose', 'Court', 'Item no.', 'Outcome', 'Appearing advocate'], ['CWJC 1234/2025', '15/01/2027', '10:30', 'Arguments', 'Patna High Court', '12', '', '']],
    tasks: [['Task', 'Case number', 'Due date', 'Assigned to', 'Done'], ['File rejoinder', 'CWJC 1234/2025', '10/01/2027', '', 'No']],
    invoices: [['Invoice number', 'Invoice date', 'Fee (before GST)', 'Client', 'Case number', 'Paid', 'Paid on', 'Description'], ['INV-2025-001', '01/12/2025', '25000', 'Ramesh Kumar', 'CWJC 1234/2025', 'Yes', '05/12/2025', 'Appearance fee']]
  };

  /* A matching the firm made by hand, remembered in this browser for the next file with the same columns. */
  const sig = (kind, head) => kind + '|' + head.map(key).join(',');
  const MAPS = 'ls.import.maps';
  const savedMap = (kind, head) => { try { const m = JSON.parse(localStorage.getItem(MAPS) || '{}')[sig(kind, head)]; return m && Object.values(m).every(i => i < head.length) ? m : null; } catch (e) { return null; } };
  const saveMap = (kind, head, map) => { try { const all = JSON.parse(localStorage.getItem(MAPS) || '{}'); all[sig(kind, head)] = map; const ks = Object.keys(all); ks.slice(0, Math.max(0, ks.length - 50)).forEach(k => delete all[k]); localStorage.setItem(MAPS, JSON.stringify(all)); } catch (e) {} };

  window.LSI = { parseCsv, parseXlsx, parseXls, readFile, fromJson, date, time, money, cnrOf, guessMap, guessKind, readRow, apply, inColumns, monthFirst, PRESETS, savedMap, saveMap, imports, undoImport, matchDoc, docType, zipEntries, KINDS, ORDER, TEMPLATE };

  /* ---------- the screen (needs the app's views; absent under Node) ---------- */
  if (!window.React || !window.LSV) return;
  const V = window.LSV, L = window.LS, h = React.createElement, useState = React.useState, K = V.K, X = V.X, Btn = V.Btn, Modal = V.Modal, Chip = V.Chip;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const SOURCES = [['other', 'Another practice-management software'], ['clio', 'Clio'], ['mycase', 'MyCase'], ['practicepanther', 'PracticePanther'], ['excel', 'Excel / Google Sheets diary'], ['accounts', 'Accounting or billing software'], ['else', 'Something else']];
  const srcLabel = id => (SOURCES.find(x => x[0] === id) || SOURCES[0])[1];
  const STEPS = ['Where from', 'Add files', 'Match columns', 'Check and import'];

  function MigrateFlow({ app }) {
    const [step, setStep] = useState(0), [source, setSource] = useState('other'), [tables, setTables] = useState([]), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [rep, setRep] = useState(null), [open, setOpen] = useState(0);
    const close = () => app.modal(null);
    const add = () => L.pickFile('.csv,.tsv,.txt,.xlsx,.xlsm,.xls,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true).then(async fs => {
      if (!fs.length) return; setBusy('Reading ' + plural(fs.length, 'file') + '…'); setErr('');
      const got = [], bad = [];
      for (const f of fs) { try { (await readFile(f)).forEach(t => { if (t.rows.length < 2) return bad.push(t.name + ': no rows below the header'); const head = t.rows[0].map(String), kind = guessKind(head, t.hint || t.name, source), mem = savedMap(kind, head); got.push({ id: L.uid('t'), name: t.name, head, rows: t.rows.slice(1), kind, map: mem || guessMap(kind, head, source), mem: !!mem, on: true }); }); } catch (e) { bad.push(e.message || (f.name + ' could not be read')); } }
      setTables(ts => ts.concat(got)); setBusy(''); if (bad.length) setErr(bad.join(' · '));
    });
    const upd = (id, ch) => setTables(ts => ts.map(t => t.id === id ? Object.assign({}, t, ch) : t));
    const live = tables.filter(t => t.on);
    const checked = live.map(t => { const res = inColumns(t.kind, t.map, t.rows, () => t.rows.map(r => readRow(t.kind, t.map, r))); return { t, ok: res.filter(r => !r.err).length, bad: res.map((r, i) => r.err ? { row: i + 2, why: r.err } : null).filter(Boolean) }; });
    const run = () => {
      live.forEach(t => saveMap(t.kind, t.head, t.map));
      let r; const acc = L.access(app.db.sub), importId = L.uid('imp');
      app.mut(db => { r = apply(db, live.map(t => ({ kind: t.kind, map: t.map, rows: t.rows, name: t.name })), { uid: L.uid, today: L.today(), user: db.user.name, caseCap: acc.limits.cases, stages: window.LSP ? LSP.stages(db.firm) : [], importId });
        const n = Object.values(r.added).reduce((a, b) => a + b, 0);
        V.logIt(db, `Imported from ${PRESETS[source] ? srcLabel(source) : srcLabel(source).toLowerCase()} by ${db.user.name}: ` + ORDER.filter(k => r.added[k]).map(k => plural(r.added[k], KINDS[k].one)).join(', ') + (n ? '' : 'nothing new'), '', { importId }); }, null);
      if (r) setRep(Object.assign(r, { importId }));
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
          note('Imported the wrong thing? Settings → Imports → Undo removes everything this import added.'),
          rep.capped > 0 && note(plural(rep.capped, 'active case') + ' were not imported because the plan\'s case limit was reached. Upgrade under Subscription and import the same file again: what is already here is skipped.', 'red'))),
        rep.skipped.length > 0 && box(h('div', null, h('div', { style: { fontSize: 13.5, fontWeight: 600, marginBottom: 6 } }, plural(rep.skipped.length, 'row') + ' skipped'),
          h('div', { style: { maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 } }, rep.skipped.slice(0, 300).map((s, i) => h('div', { key: i, style: { fontSize: 12.5, color: K.txt } }, h('span', { style: { color: K.mut } }, s.table + ', row ' + s.row + ': '), s.why))),
          h('div', { style: { marginTop: 10 } }, h(Btn, { small: true, onClick: () => L.csv('legal-staff-import-skipped.csv', [['File', 'Row', 'Reason'], ...rep.skipped.map(s => [s.table, s.row, s.why])]) }, 'Download the skipped rows')))),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' } }, h(Btn, { onClick: () => { setRep(null); setTables([]); setStep(1); } }, 'Import more'), h(Btn, { onClick: () => docs(app, rep.importId) }, 'Bring documents too'), h(Btn, { primary: true, onClick: () => { close(); app.go(rep.added.cases ? 'cases' : rep.added.clients ? 'clients' : 'dashboard'); } }, 'Done')));
    } else if (step === 0) {
      body = h(React.Fragment, null,
        note('Bring your clients, cases, hearing dates, tasks and invoices from the software or diary you use now. Export them from there as Excel (.xlsx) or CSV, then add the files here. The files are read in your browser and are not uploaded anywhere.'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, SOURCES.map(([s, lab]) => h('label', { key: s, style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, border: '1px solid ' + (s === source ? K.ink : K.line), borderRadius: 10, padding: '10px 14px', cursor: 'pointer' } }, h('input', { type: 'radio', name: 'ls-src', checked: s === source, onChange: () => setSource(s) }), lab))),
        box(h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: { fontSize: 13.5, fontWeight: 600 } }, 'How to get your data out'),
          note(PRESETS[source] ? `In ${srcLabel(source)}, export your contacts, matters (cases), calendar events, tasks and bills or invoices to CSV or Excel, from each screen's Export option or from its data-export settings. Add all the files in the next step. Columns are matched to ${srcLabel(source)}'s own names; check them in step 3, as exports can differ by version and settings.`
            : source === 'excel' ? 'In Excel: File → Save As → Excel Workbook (.xlsx) or CSV. In Google Sheets: File → Download → .xlsx or .csv. Keep one header row at the top of each sheet. One sheet per kind (Clients, Cases, Hearings…) works best.'
            : source === 'accounts' ? 'Export your customers as a client list and your sales invoices as a report to Excel or CSV. The fee before GST is used as the invoice amount.'
            : 'Most practice-management products have an Export, Download or Reports option on their cases (matters), clients (contacts), calendar and billing screens. Export each one to Excel or CSV. If yours only gives a JSON export, add that as it is. If it offers no export, ask its support for a copy of your data: you are entitled to it.'),
          h('div', { style: { fontSize: 13, color: K.mut } }, 'Documents too? ', h('button', { type: 'button', onClick: () => docs(app), style: { border: 0, background: 'none', padding: 0, color: K.ink, textDecoration: 'underline', cursor: 'pointer', fontSize: 13 } }, 'Bring a folder or ZIP of documents'), ' (import the cases first, so each file finds its case).'),
          h('div', { style: { fontSize: 13, color: K.mut } }, 'Or fill in a template: ', ORDER.map((k, i) => h(React.Fragment, { key: k }, i ? ' · ' : '', h('button', { type: 'button', onClick: () => dl(k), style: { border: 0, background: 'none', padding: 0, color: K.ink, textDecoration: 'underline', cursor: 'pointer', fontSize: 13 } }, KINDS[k].label)))))),
        nav(null, () => setStep(1), 'Next'));
    } else if (step === 1) {
      body = h(React.Fragment, null,
        note('Add every file you exported. Each sheet of an Excel file is read separately. Say what each one holds; the guess is made from its name and columns.'),
        tables.map(t => box(h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
          h('input', { type: 'checkbox', checked: t.on, 'aria-label': 'Import ' + t.name, onChange: e => upd(t.id, { on: e.target.checked }) }),
          h('div', { style: { flex: '1 1 200px', minWidth: 0 } }, h('div', { style: { fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.name), h('div', { style: { fontSize: 12.5, color: K.mut } }, plural(t.rows.length, 'row') + ' · ' + t.head.slice(0, 5).join(', ') + (t.head.length > 5 ? '…' : ''))),
          sel(t.kind, k => upd(t.id, { kind: k, map: savedMap(k, t.head) || guessMap(k, t.head, source), mem: !!savedMap(k, t.head) }), ORDER.map(k => [k, KINDS[k].label]), 'What ' + t.name + ' holds'),
          h(Btn, { small: true, danger: true, onClick: () => setTables(ts => ts.filter(x => x.id !== t.id)) }, 'Remove')), { key: t.id, opacity: t.on ? 1 : .55 })),
        h('div', null, h(Btn, { onClick: add, disabled: !!busy }, busy || (tables.length ? '+ Add another file' : '+ Choose files (Excel, CSV or JSON)'))),
        err && note(err, 'red'),
        nav(() => setStep(0), () => { setOpen(0); setStep(2); }, 'Next', !live.length));
    } else if (step === 2) {
      const t = live[Math.min(open, live.length - 1)], cols = [['', 'Not in this file'], ...t.head.map((x, i) => [String(i), x || 'Column ' + (i + 1)])];
      const sample = i => t.rows.slice(0, 3).map(r => r[i]).filter(x => String(x || '').trim()).slice(0, 2).join(' · ');
      body = h(React.Fragment, null,
        live.length > 1 && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, live.map((x, i) => h(Btn, { key: x.id, small: true, primary: x.id === t.id, onClick: () => setOpen(i) }, KINDS[x.kind].label + ' · ' + x.name.split(' · ').pop()))),
        note(t.mem ? 'These columns are matched the way you matched a file with the same columns last time. Check them against the example values.' : 'Which column of "' + t.name + '" holds each detail. Columns with familiar names' + (PRESETS[source] ? ' and ' + srcLabel(source) + '\'s own names' : '') + ' are matched already; check them against the example values. Your matching is remembered for the next file like this.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(130px,1fr) minmax(150px,1.3fr)', gap: '8px 12px', alignItems: 'center' } },
          KINDS[t.kind].fields.map(([k, label, , req]) => h(React.Fragment, { key: k },
            h('div', { style: { fontSize: 13.5 } }, label, req && h('span', { style: { color: K.red } }, ' *'), t.map[k] != null && h('div', { style: { fontSize: 12, color: K.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sample(t.map[k]) || 'empty in the first rows')),
            sel(t.map[k] == null ? '' : String(t.map[k]), x => upd(t.id, { mem: false, map: Object.assign({}, t.map, { [k]: x === '' ? undefined : +x }) }), cols, label)))),
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

  /* ---------- bringing documents: files, a folder or a ZIP; each file is matched to a case by its name or folder ---------- */
  const pickDir = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.webkitdirectory = true; i.onchange = () => res([...i.files]); i.click(); });
  function DocsFlow({ app, importId }) {
    const d = app.db, [items, setItems] = useState([]), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [done, setDone] = useState(null), [only, setOnly] = useState('');
    const close = () => app.modal(null), opts = [['', 'No case (keep unlinked)'], ...V.caseOpts(d)];
    const add = async fs => {
      if (!fs.length) return; setBusy('Reading ' + plural(fs.length, 'file') + '…'); setErr('');
      const got = [], bad = [];
      for (const f of fs) {
        const path = f.webkitRelativePath || f.name;
        if (/\.zip$/i.test(f.name)) { try { const z = await zipEntries(await f.arrayBuffer(), f.name); z.out.forEach(x => got.push(x)); z.bad.forEach(p => bad.push(f.name + ': ' + p + ' could not be unpacked')); } catch (e) { bad.push(f.name + ': ' + (e.message || 'not a ZIP file')); } }
        else if (!/(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(path) && !/(^|\/)\./.test(path)) got.push({ path, file: f });
      }
      const have = new Set(items.map(x => x.path));
      setItems(items.concat(got.filter(x => !have.has(x.path)).map(x => ({ id: L.uid('d'), path: x.path, file: x.file, caseId: matchDoc(x.path, d.cases), type: docType(x.path.split('/').pop()), on: true }))));
      setBusy(''); if (bad.length) setErr(bad.slice(0, 5).join(' · ') + (bad.length > 5 ? ' and ' + (bad.length - 5) + ' more' : ''));
    };
    const upd = (id, ch) => setItems(xs => xs.map(x => x.id === id ? Object.assign({}, x, ch) : x));
    const live = items.filter(x => x.on), matched = live.filter(x => x.caseId).length, total = live.reduce((a, x) => a + x.file.size, 0);
    const go = async () => {
      if (app.locked && app.locked()) return app.toast('Your plan has ended. Subscribe to import documents.');
      const tag = importId || L.uid('imp'), ok = [], failed = [];
      for (let i = 0; i < live.length; i++) {
        const x = live[i], f = x.file, ext = (f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4);
        setBusy(`Saving ${i + 1} of ${live.length}: ${f.name}`);
        try {
          const drive = await V.storeFile(app, x.id, f);
          app.mut(db => { db.docs.unshift({ id: x.id, caseId: x.caseId, kind: 'document', type: x.type, ext, ...(drive ? { drive } : {}), name: f.name.replace(/\.[^.]+$/, ''), meta: `${x.type} · ${L.size(f.size)} · imported by ${db.user.name}`, v: 'v1', added: L.today(), file: f.name, exhibit: '', custody: '', importId: tag, imported: L.today(), tags: x.path.includes('/') ? [x.path.split('/').slice(-2, -1)[0]] : [] }); }, null);
          ok.push(x);
        } catch (e) { failed.push({ path: x.path, why: (e && e.message) || 'could not be saved' }); }
      }
      app.mut(db => { V.logIt(db, `Imported ${plural(ok.length, 'document')} by ${db.user.name}` + (failed.length ? ` (${failed.length} failed)` : ''), '', { importId: tag }); }, null);
      setBusy(''); setDone({ ok: ok.length, linked: ok.filter(x => x.caseId).length, failed });
    };
    const box = (children, extra) => h('div', { style: Object.assign({ border: '1px solid ' + K.line, borderRadius: 10, padding: '14px 16px' }, extra) }, children);
    const note = (txt, tone) => h('div', { style: { fontSize: 13, lineHeight: 1.55, color: tone === 'red' ? K.red : K.mut } }, txt);
    const sel = (value, onChange, options, label) => h('select', { value, 'aria-label': label, onChange: e => onChange(e.target.value), style: Object.assign({}, X.input, { height: 32, fontSize: 13, minWidth: 0, width: '100%' }) }, options.map(o => Array.isArray(o) ? h('option', { key: o[0], value: o[0] }, o[1]) : h('option', { key: o, value: o }, o)));
    if (done) return h(Modal, { title: 'Documents imported', onClose: close, width: 600 },
      box(h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, h('div', { style: { fontSize: 15, fontWeight: 600 } }, 'Saved ' + plural(done.ok, 'document')), note(done.linked + ' linked to a case, ' + (done.ok - done.linked) + ' kept without one. Link them later from Documents → Edit.'),
        done.failed.length > 0 && note(plural(done.failed.length, 'file') + ' could not be saved: ' + done.failed.slice(0, 5).map(x => x.path + ' (' + x.why + ')').join('; '), 'red'))),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 10 } }, h(Btn, { primary: true, onClick: () => { close(); app.go('documents'); } }, 'Open Documents')));
    const shown = live.length > 60 && only ? items.filter(x => only === 'none' ? !x.caseId : x.caseId) : items;
    return h(Modal, { title: 'Bring your documents', sub: V.driveOn(app) ? 'Files are encrypted and saved to the hidden Legal Staff folder in your Google Drive.' : window.LSB && LSB.on ? 'Files are stored privately for your firm.' : 'Files stay in this browser. Nothing is uploaded to a server.', onClose: busy ? () => {} : close, width: 760 },
      note('Add the files, a whole folder, or a ZIP of your old case files. Each file is matched to a case when its name or folder contains the case\'s CNR, case number, file number or title (for example "CWJC 1234-2025/Order 12.03.2025.pdf"). Check the matches, then save.'),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        h(Btn, { disabled: !!busy, onClick: () => L.pickFile('', true).then(add) }, '+ Files or a ZIP'),
        h(Btn, { disabled: !!busy, onClick: () => pickDir().then(add) }, '+ A folder')),
      err && note(err, 'red'),
      items.length > 0 && h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 13.5 } },
        h('span', null, plural(live.length, 'file') + ' · ' + L.size(total) + ' · ', h('b', null, matched + ' matched to a case')),
        live.length > 60 && sel(only, setOnly, [['', 'Show all'], ['none', 'Show unmatched'], ['some', 'Show matched']], 'Filter')),
      items.length > 0 && h('div', { style: { maxHeight: '46vh', overflowY: 'auto', border: '1px solid ' + K.line, borderRadius: 10 } },
        shown.slice(0, 400).map((x, i) => h('div', { key: x.id, style: { display: 'grid', gridTemplateColumns: 'auto minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,.8fr)', gap: 8, alignItems: 'center', padding: '8px 12px', borderTop: i ? '1px solid ' + K.line : 0, opacity: x.on ? 1 : .5 } },
          h('input', { type: 'checkbox', checked: x.on, 'aria-label': 'Import ' + x.path, onChange: e => upd(x.id, { on: e.target.checked }) }),
          h('div', { style: { minWidth: 0, fontSize: 13 } }, h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: x.path }, x.path.split('/').pop()), h('div', { style: { fontSize: 11.5, color: K.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (x.path.includes('/') ? x.path.split('/').slice(0, -1).join(' / ') + ' · ' : '') + L.size(x.file.size))),
          sel(x.caseId, v => upd(x.id, { caseId: v }), opts, 'Case for ' + x.path),
          sel(x.type, v => upd(x.id, { type: v }), ['Pleading', 'Court order', 'Draft', 'Correspondence', 'Other'], 'Type of ' + x.path))),
        shown.length > 400 && h('div', { style: { padding: 10, fontSize: 12.5, color: K.mut } }, 'Showing the first 400. All ' + shown.length + ' are imported.')),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' } },
        h('span', { style: { fontSize: 13, color: K.mut } }, busy),
        h('div', { style: { display: 'flex', gap: 10 } }, h(Btn, { disabled: !!busy, onClick: close }, 'Cancel'), h(Btn, { primary: true, disabled: !!busy || !live.length, onClick: go }, busy && live.length ? 'Saving…' : 'Save ' + plural(live.length, 'document')))));
  }
  function docs(app, importId) { if (!app.db.cases.length) app.toast('No cases yet: the documents are kept without a case. Import your cases first to link them.'); app.modal(() => h(DocsFlow, { app, importId })); }

  /* ---------- Settings: the imports still present, each with Undo ---------- */
  const LABEL = { clients: 'client', cases: 'case', hearings: 'hearing', tasks: 'task', invoices: 'invoice', docs: 'document' };
  function ImportsList({ app }) {
    const list = imports(app.db); if (!list.length) return null;
    const undo = x => V.confirmBox(app, 'Undo this import?', `Everything this import added is deleted: ${Object.keys(x.counts).map(k => plural(x.counts[k], LABEL[k])).join(', ')}. Hearings and orders added since to its cases go with them; tasks and documents added by hand stay, without a case. Details filled into clients that were already here stay.`, 'Undo import', () => {
      let r; app.mut(db => { r = undoImport(db, x.id); if (!r.blocked) V.logIt(db, `Import undone by ${db.user.name}: ` + Object.keys(r.removed).filter(k => r.removed[k]).map(k => plural(r.removed[k], LABEL[k] || 'order')).join(', ')); }, null);
      if (!r) return; if (r.blocked) return app.toast(r.blocked);
      r.files.forEach(f => { try { V.dropFile(f); } catch (e) {} });
      app.toast('Import undone' + (r.kept ? ` · ${plural(r.kept, 'client')} kept because cases or invoices added by hand use them` : ''));
    });
    return h('div', null, list.map(x => h(V.Line, { key: x.id }, h('div', { style: { flex: 1, minWidth: 0 } }, 'Import' + (x.date ? ' of ' + L.fmt(x.date) : ''), h('div', { style: { fontSize: 12.5, color: K.mut } }, Object.keys(x.counts).map(k => plural(x.counts[k], LABEL[k])).join(', '))), h(Btn, { small: true, danger: true, onClick: () => undo(x) }, 'Undo'))));
  }
  function migrate(app) {
    app.modal(() => h(MigrateFlow, { app }));
  }
  Object.assign(window.LSI, { MigrateFlow, migrate, DocsFlow, docs, ImportsList });
})();

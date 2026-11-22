// Moving data in from other software (app-import.js): CSV and Excel reading, dates, column matching, linking and duplicates.
// Run: node tests/import.test.mjs
import { readFileSync } from 'node:fs';
import { deflateRawSync, crc32 } from 'node:zlib';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
new Function(readFileSync(new URL('../app-import.js', import.meta.url), 'utf8'))();
const I = globalThis.LSI;
let n = 0; const t = (name, fn) => Promise.resolve().then(fn).then(() => { n++; console.log('ok', name); }, e => { console.error('FAIL', name); throw e; });

// A minimal zip writer, so the test builds a real .xlsx with no dependencies.
function zip(files) {
  const parts = [], dir = []; let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text), data = deflateRawSync(raw), nm = Buffer.from(name), crc = crc32(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nm.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(lh, nm, data); dir.push(ch, nm); off += 30 + nm.length + data.length;
  }
  const cd = Buffer.concat(dir), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(dir.length / 2, 8); end.writeUInt16LE(dir.length / 2, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}
const sheet = rows => `<worksheet><sheetData>${rows}</sheetData></worksheet>`;
const xlsx = zip({
  'xl/workbook.xml': '<workbook><sheets><sheet name="Matters" sheetId="1" r:id="rId1"/><sheet name="Clients &amp; Contacts" sheetId="2" r:id="rId2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
  'xl/sharedStrings.xml': '<sst><si><t>Matter Name</t></si><si><t>Case No.</t></si><si><t>NDOH</t></si><si><t>Sharma v. Union of India</t></si><si><t>W.P.(C) 55/2024</t></si><si><r><t>Client </t></r><r><t>Name</t></r></si><si><t>Mobile No</t></si><si><t>A &amp; B Traders Pvt Ltd</t></si></sst>',
  'xl/worksheets/sheet1.xml': sheet('<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="s"><v>2</v></c></row><row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="s"><v>4</v></c><c r="D2"><v>46767</v></c></row>'),
  'xl/worksheets/sheet2.xml': sheet('<row r="1"><c r="A1" t="s"><v>5</v></c><c r="B1" t="s"><v>6</v></c></row><row r="2"><c r="A2" t="s"><v>7</v></c><c r="B2"><v>9876543210</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Meena Devi</t></is></c></row>')
});

const db = () => ({ user: { name: 'Adv. Rao' }, clients: [], cases: [], hearings: [], tasks: [], invoices: [] });
let seq = 0; const opts = { uid: p => p + (++seq), today: '2026-11-22', user: 'Adv. Rao', stages: ['Pleadings', 'Evidence', 'Arguments'] };

await t('CSV: quotes, embedded commas and line breaks, BOM, blank lines', () => {
  const rows = I.parseCsv('﻿Name,Notes\r\n"Kumar, R.","said ""yes""\nthen left"\r\n\r\nB,\n');
  assert.deepEqual(rows, [['Name', 'Notes'], ['Kumar, R.', 'said "yes"\nthen left'], ['B', '']]);
});
await t('CSV: semicolon and tab separated', () => {
  assert.deepEqual(I.parseCsv('a;b;c\n1;2;3'), [['a', 'b', 'c'], ['1', '2', '3']]);
  assert.deepEqual(I.parseCsv('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
});
await t('Dates: day first, ISO, month names, Excel serials, impossible dates', () => {
  assert.equal(I.date('05/03/2025'), '2025-03-05');
  assert.equal(I.date('31-01-2025'), '2025-01-31');
  assert.equal(I.date('12/31/2025'), '2025-12-31');      // day-first impossible, so month first
  assert.equal(I.date('5.3.25'), '2025-03-05');
  assert.equal(I.date('2025-03-05T10:00:00Z'), '2025-03-05');
  assert.equal(I.date('5 Mar 2025'), '2025-03-05');
  assert.equal(I.date('5th September, 2025'), '2025-09-05');
  assert.equal(I.date('March 5, 2025'), '2025-03-05');
  assert.equal(I.date('45658'), '2025-01-01'); assert.equal(I.date('46767'), '2028-01-15');
  assert.equal(I.date('31/02/2025'), '');
  assert.equal(I.date('next week'), '');
});
await t('Times, amounts, CNR', () => {
  assert.equal(I.time('2:30 PM'), '14:30'); assert.equal(I.time('10.30'), '10:30'); assert.equal(I.time('11 am'), '11:00'); assert.equal(I.time('12:15 a.m.'), '00:15'); assert.equal(I.time('0.4375'), '10:30'); assert.equal(I.time('soon'), '');
  assert.equal(I.money('₹ 1,25,000.50'), 125000.5); assert.equal(I.money('Rs. 500'), 500); assert.ok(isNaN(I.money('free')));
  assert.equal(I.cnrOf('dlhc-0100 0123 2024'), 'DLHC010001232024'); assert.equal(I.cnrOf('123'), '');
});
await t('Column matching and kind guessing from other products\' headers', () => {
  const head = ['Matter Name', 'Case No.', 'CNR Number', 'Court Name', 'Client Name', 'Next Hearing Date (DD/MM/YYYY)', 'Responsible Attorney'];
  const m = I.guessMap('cases', head);
  assert.deepEqual([m.title, m.no, m.cnr, m.court, m.client, m.next, m.team], [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(I.guessKind(head, 'export.csv'), 'cases');
  assert.equal(I.guessKind(['Name', 'Mobile', 'Email'], 'export.csv'), 'clients');
  assert.equal(I.guessKind(['Bill No', 'Bill Date', 'Amount', 'Customer'], 'x.csv'), 'invoices');
  assert.equal(I.guessKind(['Name'], 'Hearings.csv'), 'hearings');
});
await t('Excel: shared and inline strings, rich text, gaps between cells, date serials, two sheets', async () => {
  const sheets = await I.parseXlsx(xlsx);
  assert.deepEqual(sheets.map(s => s.name), ['Matters', 'Clients & Contacts']);
  assert.deepEqual(sheets[0].rows, [['Matter Name', 'Case No.', '', 'NDOH'], ['Sharma v. Union of India', 'W.P.(C) 55/2024', '', '46767']]);
  assert.deepEqual(sheets[1].rows[0], ['Client Name', 'Mobile No']);
  assert.equal(sheets[1].rows[2][0], 'Meena Devi');
  const files = await I.readFile({ name: 'export.xlsx', arrayBuffer: async () => xlsx });
  assert.equal(I.guessKind(files[0].rows[0], files[0].name), 'cases');
  assert.equal(I.guessKind(files[1].rows[0], files[1].name), 'clients');
  const m = I.guessMap('cases', files[0].rows[0]); assert.equal(m.next, 3);
});
await t('Old .xls and Legal Staff backups are refused with a clear message', async () => {
  await assert.rejects(I.readFile({ name: 'diary.xls' }), /save it as \.xlsx or CSV/);
  await assert.rejects(I.readFile({ name: 'b.json', text: async () => JSON.stringify({ v: 2, cases: [] }) }), /Restore/);
});
await t('JSON exports: an object of arrays becomes one table per array', () => {
  const ts = I.fromJson('export.json', { matters: [{ title: 'A v. B', number: 'CS 1/2025', court: { name: 'x' } }], contacts: [{ name: 'A' }], meta: 'x' });
  assert.deepEqual(ts.map(x => x.hint), ['matters', 'contacts']);
  assert.deepEqual(ts[0].rows, [['title', 'number'], ['A v. B', 'CS 1/2025']]);
});
await t('Import: clients, cases, hearings, tasks and invoices linked together; duplicates skipped', () => {
  const d = db();
  d.clients.push({ id: 'old', name: 'Meena Devi', phone: '', email: 'meena@example.com' });
  const T = (kind, rows) => ({ kind, map: I.guessMap(kind, rows[0]), rows: rows.slice(1), name: kind + '.csv' });
  const r = I.apply(d, [
    T('invoices', [['Bill No', 'Bill Date', 'Amount', 'Case No', 'Status'], ['B-7', '01/12/2025', '₹25,000', 'CS 12/2025', 'Paid'], ['B-8', '02/12/2025', 'abc', 'CS 12/2025', '']]),
    T('hearings', [['Case No', 'Date', 'Time', 'Purpose'], ['CS 12/2025', '15/01/2027', '2:30 PM', 'Evidence'], ['DLHC010001232024', '20/01/2027', '', ''], ['CS 99/2020', '01/02/2027', '', '']]),
    T('cases', [['Matter Name', 'Case No.', 'CNR', 'Court', 'Client', 'Stage', 'NDOH'], ['Kumar vs. State', 'CS 12/2025', '', 'Patna District Court', 'R. Kumar', 'evidence', '15/01/2027'], ['Sharma v. UOI', 'WP 5/2024', 'DLHC010001232024', 'Delhi High Court', 'Meena Devi', 'Disposed', ''], ['', '', '', '', '', '', '']]),
    T('clients', [['Name', 'Mobile', 'Email'], ['Meena Devi', '9876543210', ''], ['A & B Traders Pvt Ltd', '9000000000', 'ab@example.com'], ['Bad Mail', '', 'nope']]),
    T('tasks', [['Task', 'Matter', 'Due Date', 'Done'], ['File rejoinder', 'Kumar v State', '10/01/2027', 'no'], ['Call client', 'Unknown matter', '', 'yes']])
  ], opts);
  assert.deepEqual(r.added, { clients: 1, cases: 2, hearings: 1, tasks: 2, invoices: 1 });
  assert.equal(r.createdClients, 1);                                 // "R. Kumar" from the cases sheet
  assert.equal(d.clients.find(c => c.id === 'old').phone, '9876543210'); // blank detail filled on the existing client
  assert.equal(d.clients.find(c => c.name.startsWith('A & B')).type, 'Company');
  const kumar = d.cases.find(c => c.no === 'CS 12/2025'), sharma = d.cases.find(c => c.cnr === 'DLHC010001232024');
  assert.equal(kumar.stage, 'Evidence'); assert.equal(kumar.status, 'active'); assert.equal(kumar.clientId, d.clients.find(c => c.name === 'R. Kumar').id);
  assert.equal(sharma.status, 'disposed'); assert.equal(sharma.category, 'high_court'); assert.equal(sharma.clientId, 'old');
  // the case sheet's next date and the hearing sheet's same date make one hearing, not two
  assert.equal(d.hearings.filter(x => x.caseId === kumar.id).length, 1);
  assert.deepEqual(['time', 'purpose'].map(k => d.hearings.find(x => x.caseId === kumar.id)[k]), ['14:30', 'Evidence']);
  assert.equal(d.hearings.find(x => x.caseId === sharma.id).date, '2027-01-20');
  assert.equal(d.tasks.find(x => x.t === 'File rejoinder').caseId, kumar.id);
  assert.equal(d.tasks.find(x => x.t === 'Call client').done, true); assert.equal(r.unlinked, 1);
  const inv = d.invoices[0]; assert.deepEqual([inv.no, inv.amount, inv.paid, inv.paidOn, inv.caseId, inv.clientId], ['B-7', 25000, true, '2025-12-01', kumar.id, kumar.clientId]);
  const why = r.skipped.map(s => s.why).join(' | ');
  assert.match(why, /Amount not understood/); assert.match(why, /No case matches "CS 99\/2020"/); assert.match(why, /Already here: Meena Devi/); assert.match(why, /Email not valid/); assert.doesNotMatch(why, /Already on the calendar/);

  // Importing the same files again adds nothing.
  const before = JSON.stringify(d);
  const again = I.apply(d, [T('cases', [['Matter Name', 'Case No.', 'CNR'], ['Kumar vs. State', 'CS 12/2025', ''], ['Sharma v. UOI', 'WP 5/2024', 'DLHC010001232024']]), T('invoices', [['Bill No', 'Bill Date', 'Amount', 'Case No'], ['B-7', '01/12/2025', '25000', 'CS 12/2025']])], opts);
  assert.equal(Object.values(again.added).reduce((a, b) => a + b, 0), 0);
  assert.equal(JSON.stringify(d), before);
});
await t('Import: the plan\'s active-case limit is kept; disposed cases do not count', () => {
  const d = db(); d.cases.push({ id: 'x', no: 'A/1', title: 'X', status: 'active' });
  const rows = [['Title', 'Case No', 'Status'], ['One', 'N/1', 'Pending'], ['Two', 'N/2', 'Disposed'], ['Three', 'N/3', '']];
  const r = I.apply(d, [{ kind: 'cases', map: I.guessMap('cases', rows[0]), rows: rows.slice(1) }], Object.assign({}, opts, { caseCap: 2 }));
  assert.equal(r.added.cases, 2); assert.equal(r.capped, 1);
  assert.deepEqual(d.cases.map(c => c.no).sort(), ['A/1', 'N/1', 'N/2']);
});
await t('Rows: a case with only a CNR or only a number still imports; missing fields are named', () => {
  assert.equal(I.readRow('cases', { cnr: 0, court: 1 }, ['DLHC010001232024', 'Delhi HC']).err, '');
  assert.equal(I.readRow('cases', { no: 0 }, ['CS 4/2025']).v.title, 'CS 4/2025');
  assert.equal(I.readRow('hearings', { case: 0, date: 1 }, ['CS 4/2025', '']).err, 'Missing hearing date');
});
await t('Templates read back as the kind they are for, with every column matched', () => {
  for (const k of I.ORDER) { const head = I.TEMPLATE[k][0]; assert.equal(I.guessKind(head, 'legal-staff-' + k + '-template.csv'), k); assert.equal(Object.keys(I.guessMap(k, head)).length, head.length, k); }
});
console.log(n + ' tests passed');

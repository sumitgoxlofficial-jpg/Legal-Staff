// Legal Staff — pure-logic tests: GST invoice maths, invoice numbering, plans and roles, and the order date parser.
// Run: node tests/unit.mjs   (no browser; app-store.js is loaded with a stand-in window)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const src = readFileSync(fileURLToPath(new URL('../app-store.js', import.meta.url)), 'utf8');
const sandbox = { window: {}, console, Date, Intl, Math, JSON, Blob: class {}, TextEncoder, setTimeout };
vm.createContext(sandbox); vm.runInContext(src, sandbox);
const L = sandbox.window.LS;

let passed = 0, failed = 0;
const t = (name, fn) => { try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); } };
const eq = (a, b, m) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((m ? m + ': ' : '') + 'got ' + x + ', want ' + y); };

const firmDL = { name: 'Rao & Associates', legalName: 'Rao and Associates LLP', gstin: '07AAAFR1234K1Z5', stateCode: '07', gstReg: 'yes' };
const firmUnreg = { name: 'Adv. Meera Iyer', gstReg: 'no' };

console.log('GST');
t('intra-state: CGST 9% + SGST 9%', () => { const x = L.invoiceTax({ amount: 50000, mode: 'fwd', pos: '07' }, firmDL); eq([x.intra, x.cgst, x.sgst, x.igst, x.tax, x.total, x.title], [true, 4500, 4500, 0, 9000, 59000, 'Tax invoice']); });
t('inter-state: IGST 18%', () => { const x = L.invoiceTax({ amount: 50000, mode: 'fwd', pos: '27' }, firmDL); eq([x.intra, x.cgst, x.sgst, x.igst, x.total, x.posName], [false, 0, 0, 9000, 59000, 'Maharashtra']); });
t('place of supply defaults to the client GSTIN state, then the client state, then the firm', () => {
  eq(L.invoiceTax({ amount: 100, mode: 'fwd', clientGstin: '29ABCDE1234F1Z5' }, firmDL).pos, '29');
  eq(L.invoiceTax({ amount: 100, mode: 'fwd' }, firmDL, { stateCode: '33' }).pos, '33');
  eq(L.invoiceTax({ amount: 100, mode: 'fwd' }, firmDL, {}).pos, '07'); });
t('paise: tax rounded per head, total in paise', () => { const x = L.invoiceTax({ amount: 1234.57, mode: 'fwd', pos: '07' }, firmDL); eq([x.cgst, x.sgst, x.total], [111.11, 111.11, 1456.79]); });
t('odd rate split evenly (5% → 2.5% + 2.5%)', () => { const x = L.invoiceTax({ amount: 1000, mode: 'fwd', pos: '07', rate: 5 }, firmDL); eq([x.cgst, x.sgst, x.total], [25, 25, 1050]); });
t('reverse charge: no tax charged, tax shown as payable by the recipient', () => { const x = L.invoiceTax({ amount: 100000, mode: 'rcm', clientGstin: '27AAACM1234B1Z2' }, firmDL); eq([x.rcm, x.tax, x.igst, x.gst, x.total, x.pos], [true, 0, 18000, 18000, 100000, '27']); if (!/reverse charge: Yes/.test(x.notes[0]) || !/CA/.test(x.notes[0])) throw new Error('note: ' + x.notes[0]); });
t('bill of supply: no GST at all', () => { const x = L.invoiceTax({ amount: 25000, mode: 'bos' }, firmUnreg); eq([x.title, x.cgst, x.sgst, x.igst, x.total], ['Bill of supply', 0, 0, 0, 25000]); if (!/not registered/.test(x.notes[0])) throw new Error(x.notes[0]); });
t('an invoice saved before GST fields existed reads as before (18% added)', () => { const x = L.invoiceTax({ no: 'INV-2026-001', amount: 50000, date: '2026-10-01' }, { name: 'Old firm' }); eq([x.legacy, x.mode, x.tax, x.total], [true, 'fwd', 9000, 59000]); });
t('default treatment for a new invoice', () => { eq(L.invMode(firmDL, ''), 'fwd'); eq(L.invMode(firmDL, '27AAACM1234B1Z2'), 'rcm'); eq(L.invMode(firmUnreg, '27AAACM1234B1Z2'), 'bos'); eq(L.invMode({ name: 'No GSTIN' }, ''), 'bos'); });
t('GSTIN and PAN checks, state from GSTIN', () => { eq(L.gstinState('07AAAFR1234K1Z5'), '07'); eq(L.gstinState('99AAAFR1234K1Z5'), ''); eq(L.gstinState('07AAAFR1234K1X5'), ''); eq(L.PAN_RE.test('AAAFR1234K'), true); eq(L.stateName('36'), 'Telangana'); });
t('SAC defaults to 998212 and names it', () => { const x = L.invoiceTax({ amount: 1, mode: 'fwd' }, firmDL); eq(x.sac, '998212'); if (!/representation/.test(x.sacName)) throw new Error(x.sacName); eq(L.sacName('998211'), 'Legal advisory and representation services concerning criminal law'); });

console.log('Amount in words (Indian numbering)');
t('lakh and thousand', () => eq(L.inWords(118000), 'Rupees One Lakh Eighteen Thousand Only'));
t('crore with paise', () => eq(L.inWords(12345678.5), 'Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight and Fifty Paise Only'));
t('hundreds and teens', () => eq(L.inWords(1919), 'Rupees One Thousand Nine Hundred Nineteen Only'));
t('paise only, and zero', () => { eq(L.inWords(0.75), 'Seventy Five Paise Only'); eq(L.inWords(0), 'Rupees Zero Only'); });
t('100 crore', () => eq(L.inWords(1e9), 'Rupees One Hundred Crore Only'));

console.log('Invoice numbers');
t('financial year from the invoice date', () => { eq(L.fy('2026-04-01'), '2026-27'); eq(L.fy('2027-03-31'), '2026-27'); eq(L.fy('2027-04-01'), '2027-28'); eq(L.fy('2099-12-31'), '2099-00'); });
t('prefix: set, or the firm initials, at most 3 characters', () => { eq(L.invPrefix({ name: 'Rao & Associates' }), 'RA'); eq(L.invPrefix({ name: 'Legal Staff', prefix: 'ls' }), 'LS'); eq(L.invPrefix({ name: 'A B C D Partners' }), 'ABC'); eq(L.invPrefix({ name: '' }), 'INV'); eq(L.invPrefix({ prefix: 'ab-cd' }), 'ABC'); });
t('series and number, 16 characters at most', () => { const n = L.invNo(L.invSeries({ prefix: 'ABC' }, '2026-11-16'), 7); eq(n, 'ABC/2026-27/0007'); eq(n.length <= 16, true); });
t('next number continues the series and ignores other years and old numbers', () => {
  const inv = [{ no: 'LS/2026-27/0001' }, { no: 'LS/2026-27/0004' }, { no: 'LS/2025-26/0042' }, { no: 'INV-2026-003' }, { no: 'LS/2026-27/draft' }];
  eq(L.nextInvSeq(inv, 'LS/2026-27/'), 5); eq(L.nextInvSeq(inv, 'LS/2027-28/'), 1); eq(L.nextInvSeq([], 'LS/2026-27/'), 1); });
t('new financial year restarts at 0001', () => { const s1 = L.invSeries({ prefix: 'LS' }, '2027-03-31'), s2 = L.invSeries({ prefix: 'LS' }, '2027-04-01'); eq([s1, s2], ['LS/2026-27/', 'LS/2027-28/']); eq(L.invNo(s2, L.nextInvSeq([{ no: 'LS/2026-27/0099' }], s2)), 'LS/2027-28/0001'); });

console.log('Roles and plans');
t('designations map to access levels', () => {
  const m = r => L.roleOf(r, false);
  eq([m('Managing Partner'), m('Partner'), m('Associate'), m('Junior Advocate'), m('Advocate'), m('Paralegal'), m('Office Manager'), m('Clerk'), m('Intern'), m('Viewer'), m('Something new')], ['partner', 'partner', 'associate', 'associate', 'associate', 'clerk', 'clerk', 'clerk', 'clerk', 'viewer', 'associate']);
  eq(L.roleOf('Associate', true), 'owner'); });
t('active plan: limits and no grace', () => { const p = L.planState({ sub: { plan: 'Professional', renews: '2027-01-01', status: 'active' } }, '2026-11-16'); eq([p.active, p.readOnly, p.limits.seats, p.limits.cases, p.limits.gb], [true, false, 3, 600, 50]); });
t('expired plan: 7 days of grace, then read-only', () => {
  const d = { sub: { plan: 'Solo', renews: '2026-11-01', status: 'active' } };
  eq([L.planState(d, '2026-11-05').readOnly, L.planState(d, '2026-11-05').daysLeft], [false, 3]);
  eq(L.planState(d, '2026-11-08').readOnly, false); eq(L.planState(d, '2026-11-09').readOnly, true); eq(L.planState(d, '2026-11-09').limits.seats, 1); });
t('no plan: grace from the firm\'s creation, not before the rules started', () => {
  eq(L.planState({ sub: {}, firmCreated: '2026-12-01' }, '2026-12-08').readOnly, false);
  eq(L.planState({ sub: {}, firmCreated: '2026-12-01' }, '2026-12-09').readOnly, true);
  eq(L.planState({ sub: {}, firmCreated: '2025-01-01' }, L.addDays(L.PLAN_FROM, 7)).readOnly, false);
  eq(L.planState({ sub: {}, firmCreated: '2025-01-01' }, L.addDays(L.PLAN_FROM, 8)).readOnly, true);
  eq(L.planState({ sub: {} }, '2026-12-01').limits, L.TRIAL); });
t('Firm plan: unlimited cases', () => eq(L.planState({ sub: { plan: 'Firm', renews: '2099-01-01' } }, '2026-11-16').limits.cases, 0));
t('usage: seats, open cases, stored bytes (old records from their size text)', () => {
  const u = L.usage({ team: [{ status: 'Active' }, { status: 'Invited' }, { status: 'Suspended' }], cases: [{ status: 'active' }, { status: 'pending' }, { status: 'disposed' }], docs: [{ file: 'a.pdf', bytes: 1000 }, { file: 'b.pdf', meta: 'Pleading · 1.5 MB · uploaded by X' }, { meta: 'Court order · manual entry' }] });
  eq([u.seats, u.cases, u.bytes], [2, 2, 1000 + 1572864]); });
t('creator stamped only on new records', () => {
  const d = { cases: [{ id: 'c1' }], tasks: [] }, before = L.idSet(d); d.cases.push({ id: 'c2' }); d.tasks.push({ id: 't1', createdBy: 'someone' });
  L.stampNew(d, before, 'u-1', 'Asha'); eq([d.cases[0].createdBy, d.cases[1].createdBy, d.cases[1].createdByName, d.tasks[0].createdBy], [undefined, 'u-1', 'Asha', 'someone']); });

console.log('Order dates');
const next = s => L.readOrder(s).nextDate;
t('dd.mm.yyyy after a listing phrase', () => eq(next('1. Heard.\n\n2. List on 15.01.2027 for arguments.'), '2027-01-15'));
t('ordinal with month name', () => eq(next('Renotify on 3rd February, 2027.'), '2027-02-03'));
t('"day of" form', () => eq(next('Adjourned to the 5th day of March, 2027.'), '2027-03-05'));
t('month first (US style)', () => eq(next('Put up on March 9, 2027 for orders.'), '2027-03-09'));
t('two-digit year after a listing phrase', () => eq(next('Stand over to 12/04/27.'), '2027-04-12'));
t('slashes and hyphens', () => { eq(next('Next date 07-05-2027.'), '2027-05-07'); eq(next('Fixed for 7/5/2027.'), '2027-05-07'); });
t('invalid calendar date is ignored', () => eq(next('List on 31.02.2027.'), ''));
t('no listing phrase: latest future date, ignoring section-like two-digit years', () => { const fut = L.addDays(L.today(), 40), [y, m, d] = fut.split('-'); eq(next(`Order dated 01.01.2020 under s.12/3/45. Compliance by ${d}.${m}.${y}.`), fut); });
t('no date at all', () => eq(next('Heard. Reserved for orders.'), ''));
t('dateOf rejects impossible dates', () => { eq(L.dateOf(['29', '02', '2027']), ''); eq(L.dateOf(['29', '02', '2028']), '2028-02-29'); eq(L.dateOf([undefined, undefined, undefined, '3', 'Feb', '27']), '2027-02-03'); });

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

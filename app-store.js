/* Legal Staff — local data store and utilities.
   Everything is kept in the browser (localStorage + IndexedDB for uploaded files). There is no server. */
(function () {
  'use strict';
  const KEY = 'ls.app.v1';
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
    const T = nextWorking(today());
    const wd = n => n >= 0 ? nextWorking(addDays(T, n)) : prevWorking(addDays(T, n));
    const C = (id, title, no, court, purpose, stage, status, team, clientId, x) => Object.assign({ id, title, full: title, no, cnr: '', court, forum: court, bench: '', purpose, stage, status, team, clientId, summary: '', summaryMeta: '', parties: [], issues: [], missing: [], args: '' }, x || {});
    const R = 'Rohan Iyer', N = 'Neha Bhatia', K = 'Karan Sood';
    const cases = [
      C('c1', 'Kapoor Textiles v. Meridian Exports', 'CS(COMM) 219/2024', 'Delhi HC · Court 34', 'Reply to I.A.', 'Pleadings', 'active', [R, N, K], 'cl1', {
        full: 'Kapoor Textiles Pvt. Ltd. v. Meridian Exports LLP', cnr: 'DLHC010219122024', forum: 'High Court of Delhi · Commercial Division', bench: "Hon'ble Ms. Justice R. Menon",
        summary: `The plaintiff wants to recover ₹1.86 crore for unpaid invoices for fabric supplied between March and August 2023 [Plaint ¶6–11]. The defendant says the goods were defective and has filed a counter-claim [WS ¶4]. Summary judgment under Order XIII-A CPC is pending in I.A. 6612/2026 [I.A. 6612/2026]. On ${dmy(wd(-7))} the court gave the defendant two weeks to reply and listed the matter for ${dmy(wd(7))} [Order ${dmy(wd(-7))} ¶3–4].`,
        summaryMeta: 'AI-generated · approved by R. Iyer, ' + fmt(wd(-6)),
        parties: [{ role: 'Plaintiff (our client)', name: 'Kapoor Textiles Pvt. Ltd.', note: 'Through Mr. Vivek Kapoor, Director' }, { role: 'Defendant', name: 'Meridian Exports LLP', note: 'Counsel: Adv. S. Malhotra' }],
        issues: ['Whether the goods were rejected within a reasonable time (Sale of Goods Act, 1930 s.42)', 'Whether the defendant has any real prospect of defending the claim (Order XIII-A CPC)', 'Whether the counter-claim is maintainable without pre-institution mediation (s.12A, Commercial Courts Act)'],
        missing: ['The certified copy of the counter-claim, cited in WS ¶4.', 'The pre-institution mediation non-starter report, cited in Plaint ¶2.'],
        args: 'The plaintiff argued that the dues were admitted in the email of 12.09.2023. The defendant argues the goods were defective and rejected. No date of rejection is pleaded.',
        brief: { background: 'a recovery suit for ₹1.86 crore for fabric supplied and not paid for.', press: ['the defendant has not filed a reply, if that is still the case', 'they raised no objection to quality within the s.42 period', 'they have no real prospect of a defence under Order XIII-A'], carry: 'the delivery challans, the ledger statement and the email of 12.09.2023 acknowledging the dues.' }
      }),
      C('c2', 'State v. Arjun Verma', 'Bail Appln. 1123/2026', 'Saket · Court 412', 'Arguments', 'Arguments', 'active', [R], 'cl2', { parties: [{ role: 'Applicant (our client)', name: 'Arjun Verma', note: '' }, { role: 'Respondent', name: 'State (NCT of Delhi)', note: 'Through the APP' }] }),
      C('c3', 'Sharma v. Delhi Development Authority', 'W.P.(C) 4821/2025', 'Delhi HC · Court 9', 'Rejoinder', 'Pleadings', 'active', [N], 'cl3', { parties: [{ role: 'Petitioner (our client)', name: 'R. K. Sharma', note: '' }, { role: 'Respondent', name: 'Delhi Development Authority', note: '' }] }),
      C('c4', 'Mehta v. Mehta', 'HMA 88/2025', 'Family Court, Dwarka', 'Mediation', 'Mediation', 'active', [R], 'cl4'),
      C('c5', 'Gupta v. ICICI Lombard', 'FA 412/2025', 'Delhi HC · Court 21', 'Admission', 'Arguments', 'active', [N], 'cl5'),
      C('c6', 'Khanna v. Rao Builders', 'CS 1180/2024', 'Saket · Court 207', 'Written statement', 'Pending filing', 'pending', [R], 'cl6'),
      C('c7', 'Appeal against decree, CS(COMM) 88/2023', 'To be filed', 'Delhi HC', 'Filing due ' + dayMon(wd(6)), 'Pending filing', 'pending', [R], 'cl1'),
      C('c8', 'Bansal v. Union of India', 'W.P.(C) 9932/2026', 'Delhi HC · Court 34', 'Notice', 'Pleadings', 'active', [R, N], 'cl7'),
      C('c9', 'Arora v. Arora', 'HMA 41/2022', 'Family Court, Saket', 'Decree passed', 'Disposed', 'disposed', [R], 'cl8'),
      C('c10', 'Verma Steel v. Punjab National Bank', 'OA 318/2025', 'DRT-II, Delhi', 'Cross-examination', 'Evidence', 'active', [N], 'cl9'),
      C('c11', 'Malhotra v. Skyline Developers', 'CC 204/2025', 'Delhi State Consumer Commission', 'Final arguments', 'Arguments', 'active', [R, K], 'cl10'),
      C('c12', 'Singh v. State (NCT of Delhi)', 'CRL.A. 771/2024', 'Delhi HC · Court 12', 'Judgment awaited', 'Reserved for orders', 'active', [R], 'cl11'),
      C('c13', 'Oberoi Foods v. FreshKart Retail', 'ARB.P. 96/2026', 'Delhi HC · Court 40', 'Reply', 'Pleadings', 'active', [N], 'cl12'),
      C('c14', 'Nair v. Nair', 'Ex. 55/2025', 'Tis Hazari · Court 118', 'Objections', 'Execution', 'active', [K, R], 'cl13'),
      C('c15', 'In re: Estate of late H. Chopra', 'TEST.CAS. 14/2023', 'Delhi HC · Court 7', "Petitioner's evidence", 'Evidence', 'active', [N], 'cl14'),
      C('c16', 'Jain Traders v. Sunrise Logistics', 'CS 402/2021', 'Rohini · Court 305', 'Settled', 'Disposed', 'archived', [R], 'cl15')
    ];
    const H = (caseId, date, time, court, item, purpose, assignee, x) => Object.assign({ id: uid('h'), caseId, date, time, court, item, purpose, assignee, outcome: '', brief: false }, x || {});
    const hearings = [
      H('c8', T, '10:30', 'Delhi HC · Court 34', 'Item 14', 'Notice', R, { last: 'Notice issued; respondents to file counter-affidavit' }),
      H('c2', T, '10:30', 'Saket · Court 412', 'Item 6', 'Arguments', R, { last: 'Status report called from the IO' }),
      H('c3', T, '12:00', 'Delhi HC · Court 9', 'Item 31', 'Rejoinder', N, { brief: true, last: 'Counter-affidavit taken on record' }),
      H('c4', T, '14:15', 'Family Court, Dwarka', 'Item 3', 'Mediation', R, { last: 'Parties referred to mediation centre' }),
      H('c5', wd(-2), '11:00', 'Delhi HC · Court 21', 'Item 22', 'Admission', N, { outcome: 'Adjourned at the request of the respondent.' }),
      H('c6', wd(-1), '10:30', 'Saket · Court 207', 'Item 9', 'Written statement', R, { outcome: 'Time sought to file written statement.' }),
      H('c13', wd(1), '10:30', 'Delhi HC · Court 40', 'Item 18', 'Reply', N), H('c10', wd(2), '11:00', 'DRT-II, Delhi', 'Item 4', 'Cross-examination', N),
      H('c11', wd(5), '10:30', 'Delhi State Consumer Commission', 'Item 12', 'Final arguments', R), H('c14', wd(5), '14:00', 'Tis Hazari · Court 118', 'Item 7', 'Objections', K),
      H('c12', wd(6), '10:30', 'Delhi HC · Court 12', 'Item 2', 'Judgment', R), H('c15', wd(7), '11:00', 'Delhi HC · Court 7', 'Item 26', "Petitioner's evidence", N),
      H('c6', wd(8), '10:30', 'Saket · Court 207', 'Item 11', 'Written statement', R), H('c3', wd(9), '12:00', 'Delhi HC · Court 9', 'Item 19', 'Rejoinder', N),
      H('c2', wd(12), '10:30', 'Saket · Court 412', 'Item 5', 'Arguments', R), H('c13', wd(13), '14:00', 'Delhi HC · Court 40', 'Item 30', 'Reply', N),
      H('c5', wd(28), '11:00', 'Delhi HC · Court 21', 'Item 15', 'Admission', N),
      H('c1', wd(-7), '10:30', 'Delhi HC · Court 34', 'Item 11', 'Reply to I.A.', R, { outcome: `Defendant given 2 weeks. Next date ${dmy(wd(7))}.` }),
      H('c1', wd(-35), '10:30', 'Delhi HC · Court 34', 'Item 20', 'Directions', R, { outcome: 'Notice issued on I.A. 6612/2026.' }),
      H('c1', wd(-81), '10:30', 'Delhi HC · Court 34', 'Item 8', 'Admission/denial', R, { outcome: "Directions given. Date changed at the court's instance." }),
      H('c1', wd(-180), '10:30', 'Delhi HC · Court 34', 'Item 16', 'Completion of pleadings', R, { outcome: 'WS taken on record.' })
    ];
    const od = wd(-7), nd = wd(7);
    const orders = [
      { id: 'o1', caseId: 'c1', date: od, source: 'Manual upload · ' + dayMon(T) + ', 10:42', official: false, file: `Order_${dmy(od).replace(/\./g, '-')}.pdf · 2 pages · OCR complete`, coram: "HON'BLE MS. JUSTICE R. MENON", court: 'IN THE HIGH COURT OF DELHI AT NEW DELHI', cause: 'CS(COMM) 219/2024 & I.A. 6612/2026', p1: 'KAPOOR TEXTILES PVT. LTD. ..... Plaintiff', p2: 'MERIDIAN EXPORTS LLP ..... Defendant',
        paras: ['Learned counsel for the defendant seeks time to file reply to I.A. 6612/2026 under Order XIII-A CPC.', `Learned counsel for the plaintiff opposes, submitting that the application was served on ${dmy(wd(-28))}.`, "In the interest of justice, two weeks' time is granted to the defendant to file reply. Rejoinder, if any, be filed before the next date.", `List on ${dmy(nd)}.`],
        points: ['The defendant asked for time to reply to the summary judgment application, I.A. 6612/2026.', `The plaintiff objected. The application had been served on ${dmy(wd(-28))}.`, "The defendant has two weeks to file a reply. The plaintiff's rejoinder is due before the next date.", `The matter is listed for ${dmy(nd)}.`],
        summary: `Defendant given 2 weeks to reply to I.A. 6612/2026. Next date: ${dmy(nd)}.`, nextDate: nd, nextFrom: `from ¶4, "List on ${dmy(nd)}"`, confirmed: false },
      { id: 'o2', caseId: 'c3', date: wd(-5), source: 'eCourts · fetched ' + dayMon(wd(-4)) + ', 06:10', official: true, paras: ['Counter-affidavit filed by the respondent is taken on record.', 'Rejoinder, if any, be filed within four weeks.', `List on ${dmy(T)}.`], summary: 'Counter-affidavit taken on record. Rejoinder in 4 weeks.', nextDate: T, confirmed: true },
      { id: 'o3', caseId: 'c2', date: wd(-8), source: 'Manual upload · ' + dayMon(wd(-8)) + ', 17:20', official: false, paras: ['Status report is called from the Investigating Officer.', 'Interim protection to continue till the next date.', `List on ${dmy(T)}.`], summary: 'Status report called from the IO. Interim protection continued.', nextDate: T, confirmed: true },
      { id: 'o4', caseId: 'c1', date: wd(-35), source: 'eCourts · fetched ' + fmt(wd(-34)) + ', 06:05', official: true, paras: ['Notice issued on I.A. 6612/2026 (Order XIII-A).'], summary: 'Notice issued on I.A. 6612/2026 (Order XIII-A).', nextDate: od, confirmed: true },
      { id: 'o5', caseId: 'c1', date: wd(-81), source: 'eCourts · fetched ' + fmt(wd(-80)) + ', 06:02', official: true, paras: ['Pleadings are complete. Admission/denial of documents is directed.'], summary: 'Pleadings complete. Admission/denial of documents directed.', nextDate: wd(-35), confirmed: true },
      { id: 'o6', caseId: 'c1', date: wd(-180), source: 'Manual upload · ' + fmt(wd(-179)), official: false, paras: ['Written statement taken on record.'], summary: 'Written statement taken on record.', nextDate: wd(-81), confirmed: true }
    ];
    const tasks = [
      { id: 't1', caseId: 'c1', t: 'Draft rejoinder to reply in I.A. 6612/2026', who: N, due: wd(6), done: false },
      { id: 't2', caseId: 'c1', t: 'Collect original delivery challans from client', who: K, due: wd(3), done: false },
      { id: 't3', caseId: 'c1', t: 'Send hearing update to client', who: R, due: wd(8), done: false },
      { id: 't4', caseId: 'c6', t: 'File written statement', who: R, due: wd(-2), done: false },
      { id: 't5', caseId: 'c3', t: 'Finalise rejoinder affidavit', who: N, due: wd(-1), done: false },
      { id: 't6', caseId: 'c2', t: 'Obtain copy of status report', who: K, due: wd(-3), done: false },
      { id: 't7', caseId: 'c10', t: 'Prepare cross-examination questions for bank witness', who: N, due: wd(-1), done: false },
      { id: 't8', caseId: 'c14', t: 'Serve objections on decree-holder', who: K, due: wd(-4), done: false },
      { id: 't9', caseId: 'c11', t: 'Compile written submissions', who: R, due: wd(4), done: false }
    ];
    const D = (id, caseId, kind, ext, name, meta, v, x) => Object.assign({ id, caseId, kind, ext, name, meta, v, added: T }, x || {});
    const docs = [
      D('d1', 'c1', 'document', 'PDF', 'Order dated ' + dmy(od), 'Court order · manual upload · OCR indexed', 'v1'),
      D('d2', 'c1', 'document', 'PDF', 'Plaint with annexures', 'Pleading · 84 pages · OCR indexed', 'v2'),
      D('d3', 'c1', 'document', 'PDF', 'Written statement and counter-claim', 'Pleading · 41 pages', 'v1'),
      D('d4', 'c1', 'document', 'DOCX', 'Rejoinder to I.A. 6612/2026 (draft)', 'Draft · Neha Bhatia', 'v4'),
      D('d5', 'c1', 'evidence', 'XLS', 'Ledger statement FY 2023-24', 'Evidence · from client', 'v1', { exhibit: 'Ex. P-4', custody: 'Received from Mr. Vivek Kapoor by email' }),
      D('d6', 'c1', 'evidence', 'PDF', 'Email of 12.09.2023 acknowledging dues', 'Evidence · s.63 BSA certificate pending', 'v1', { exhibit: 'Ex. P-7', custody: 'Printed from client mailbox; certificate to be obtained' }),
      D('d7', 'c1', 'evidence', 'PDF', 'Delivery challans (24 nos.)', 'Evidence · originals with client', 'v1', { exhibit: 'Ex. P-2 (colly.)', custody: 'Copies on file; originals to be collected' }),
      D('d8', 'c3', 'document', 'PDF', 'Writ petition with annexures', 'Pleading · 62 pages', 'v1'),
      D('d9', 'c2', 'document', 'PDF', 'Bail application', 'Pleading · 18 pages', 'v2'),
      D('d10', 'c6', 'document', 'DOCX', 'Written statement (draft)', 'Draft · Rohan Iyer', 'v2')
    ];
    const CL = (id, name, contact, phone, email, city, type) => ({ id, name, contact, phone, email, city, type, notes: '', portal: false, share: { dates: true, orders: true, invoices: false } });
    const clients = [
      CL('cl1', 'Kapoor Textiles Pvt. Ltd.', 'Vivek Kapoor, Director', '+91 98100 00101', 'vivek@kapoortextiles.example', 'New Delhi', 'Company'),
      CL('cl2', 'Arjun Verma', 'Self', '+91 98100 00102', 'arjun.verma@mail.example', 'New Delhi', 'Individual'),
      CL('cl3', 'R. K. Sharma', 'Self', '+91 98100 00103', 'rk.sharma@mail.example', 'New Delhi', 'Individual'),
      CL('cl4', 'Anita Mehta', 'Self', '+91 98100 00104', 'anita.mehta@mail.example', 'Gurugram', 'Individual'),
      CL('cl5', 'Suresh Gupta', 'Self', '+91 98100 00105', 's.gupta@mail.example', 'Noida', 'Individual'),
      CL('cl6', 'Rao Builders', 'P. Rao, Partner', '+91 98100 00106', 'accounts@raobuilders.example', 'New Delhi', 'Firm'),
      CL('cl7', 'Deepak Bansal', 'Self', '+91 98100 00107', 'd.bansal@mail.example', 'New Delhi', 'Individual'),
      CL('cl8', 'Kavita Arora', 'Self', '+91 98100 00108', 'k.arora@mail.example', 'New Delhi', 'Individual'),
      CL('cl9', 'Verma Steel Pvt. Ltd.', 'Mohit Verma, MD', '+91 98100 00109', 'legal@vermasteel.example', 'Faridabad', 'Company'),
      CL('cl10', 'Sunil Malhotra', 'Self', '+91 98100 00110', 'sunil.m@mail.example', 'New Delhi', 'Individual'),
      CL('cl11', 'Harpreet Singh', 'Through brother', '+91 98100 00111', 'h.singh@mail.example', 'New Delhi', 'Individual'),
      CL('cl12', 'Oberoi Foods Pvt. Ltd.', 'Legal department', '+91 98100 00112', 'legal@oberoifoods.example', 'Gurugram', 'Company'),
      CL('cl13', 'Lakshmi Nair', 'Self', '+91 98100 00113', 'l.nair@mail.example', 'New Delhi', 'Individual'),
      CL('cl14', 'Rhea Chopra', 'Self', '+91 98100 00114', 'rhea.c@mail.example', 'New Delhi', 'Individual'),
      CL('cl15', 'Jain Traders', 'A. Jain, Proprietor', '+91 98100 00115', 'jaintraders@mail.example', 'New Delhi', 'Firm')
    ];
    clients[0].portal = true;
    const team = [
      { id: 'u1', name: R, title: 'Adv. Rohan Iyer', role: 'Managing Partner', email: 'rohan@iyerassociates.in', status: 'Active' },
      { id: 'u2', name: N, title: 'Adv. Neha Bhatia', role: 'Junior Advocate', email: 'neha@iyerassociates.in', status: 'Active' },
      { id: 'u3', name: K, title: 'Karan Sood', role: 'Paralegal', email: 'karan@iyerassociates.in', status: 'Active' },
      { id: 'u4', name: 'Aditi Rao', title: 'Aditi Rao', role: 'Office Manager', email: 'aditi@iyerassociates.in', status: 'Active' }
    ];
    let invNo = 140;
    const I = (clientId, caseId, off, amount, paid, desc) => ({ id: uid('i'), no: 'IA/26-27/' + (++invNo), clientId, caseId, date: addDays(T, off), amount, paid, paidOn: paid ? addDays(T, off + 6) : '', desc });
    const invoices = [
      I('cl9', 'c10', -160, 390000, true, 'Professional fees — DRT proceedings'), I('cl12', 'c13', -128, 440000, true, 'Retainer — arbitration petition'),
      I('cl1', 'c1', -98, 360000, true, 'Professional fees — I.A. 6612/2026'), I('cl10', 'c11', -95, 85000, false, 'Appearance fees — consumer complaint'),
      I('cl14', 'c15', -66, 520000, true, 'Professional fees — testamentary case'), I('cl12', 'c13', -38, 460000, true, 'Professional fees — reply and hearing'),
      I('cl6', 'c6', -36, 120000, false, 'Drafting — written statement'), I('cl13', 'c14', -34, 60000, false, 'Appearance fees — execution'),
      I('cl1', 'c1', -9, 300000, true, 'Professional fees — summary judgment'), I('cl9', 'c10', -8, 180000, true, 'Appearance fees — cross-examination'),
      I('cl3', 'c3', -6, 95000, false, 'Drafting — rejoinder'), I('cl2', 'c2', -5, 75000, false, 'Appearance fees — bail application'),
      I('cl7', 'c8', -3, 110000, false, 'Drafting and filing — writ petition'), I('cl1', 'c7', -2, 62500, false, 'Court fee and filing — commercial appeal')
    ];
    const log = [
      { ts: T + ' 10:52', caseId: '', x: 'Neha Bhatia edited the s.138 notice draft (v3)' },
      { ts: T + ' 10:42', caseId: 'c1', x: `Order of ${dmy(od)} uploaded by Rohan Iyer. Next date extracted.` },
      { ts: T + ' 07:30', caseId: '', x: 'Daily briefing sent to 4 team members' },
      { ts: wd(-6) + ' 16:10', caseId: 'c1', x: 'AI case summary approved by Rohan Iyer' },
      { ts: od + ' 11:20', caseId: 'c1', x: 'Hearing: defendant given 2 weeks to reply' },
      { ts: wd(-28) + ' 12:00', caseId: 'c1', x: 'I.A. 6612/2026 served on defendant' },
      { ts: wd(-35) + ' 11:00', caseId: 'c1', x: 'Notice issued on summary judgment application' },
      { ts: '2024-03-12 10:00', caseId: 'c1', x: 'Suit instituted' }
    ];
    return {
      v: 1, anchor: T, session: null, cases, hearings, orders, tasks, docs, clients, team, invoices, log,
      firm: { name: 'Iyer & Associates', city: 'New Delhi', address: 'Saket District Courts, New Delhi', gstin: '' },
      user: { name: 'Rohan Iyer', title: 'Adv. Rohan Iyer', role: 'Managing Partner', email: 'rohan@iyerassociates.in', phone: '' },
      sub: { plan: 'Firm', cycle: 'annual', since: T, renews: addDays(T, 365), history: [] },
      lim: { title: 'Commercial appeal against decree in CS(COMM) 88/2023', caseId: 'c7', judgment: wd(-68), applied: addDays(wd(-68), 4), ready: '', approved: false, approvedAt: '', sent: false },
      deadlines: [{ id: 'dl2', caseId: 'c6', title: 'Written statement, CS 1180/2024', rule: 'Order VIII r.1 CPC', due: addDays(T, 19), approved: true }],
      chats: {}, copilot: [], drafts: {}, notes: '', research: [], watch: [],
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
    try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && d.v === 1) return d; } } catch (e) {}
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

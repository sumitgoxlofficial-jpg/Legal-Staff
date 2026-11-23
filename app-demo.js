/* Legal Staff — demo data.
   Any firm (owner on the server, anyone in the browser-only version) can fill every section with a sample practice:
   clients, cases with case details, hearings (past with outcomes, today, a clash tomorrow, the next two weeks), court
   orders in every notification state, tasks, documents and evidence, invoices over six months, limitation calculations,
   deadlines, labels, saved research notes, workspace notes and a Section 138 notice draft.
   Every demo record carries demo: true, so "Remove demo data" takes out exactly those records (and anything later
   added to a demo case or billed to a demo client) and leaves the firm's own work alone.
   Demo cases carry no CNR, so the automatic court-record check never sends them to the court-data provider. */
(function () {
  'use strict';
  const L = window.LS;
  const isDemo = x => !!(x && x.demo === true);

  /* How many demo records the workspace holds (0 = demo data is off). */
  function count(d) {
    if (!d) return 0;
    return ['cases', 'clients', 'hearings', 'orders', 'tasks', 'docs', 'invoices', 'deadlines', 'lims']
      .reduce((n, k) => n + (d[k] || []).filter(isDemo).length, 0);
  }
  const loaded = d => (d.cases || []).some(isDemo);
  const ownerOnly = app => !!(window.LSB && LSB.on && !app.db.isOwner);

  /* ---------- the sample practice ---------- */
  function build(d) {
    const T = L.today();
    const back = n => { let s = L.addDays(T, -n); while (L.isWeekend(s)) s = L.addDays(s, -1); return s; }, ahead = n => L.nextWorking(L.addDays(T, n));
    const nw1 = L.nextWorking(L.addDays(T, 1));
    const city = (() => { const c = String((d.firm && d.firm.city) || '').trim(); return c ? c.replace(/\b\w/g, m => m.toUpperCase()) : 'Patna'; })();
    const me = (d.user && d.user.name) || 'Advocate';
    const others = (d.team || []).filter(u => u && u.name && u.name !== me && u.status !== 'Suspended').map(u => u.name);
    const who = i => (others.length && i % 3 === 2) ? others[i % others.length] : me;
    const adv = 'Adv. ' + me.replace(/^Adv\.\s*/, ''), counsel = 'learned counsel ' + me.replace(/^Adv\.\s*/, '');
    const id = (p, n) => p + '-demo-' + n;

    const COURT = {
      comm: 'Commercial Court, ' + city + ' · Court 2',
      sess: 'District & Sessions Court, ' + city + ' · Court 5',
      fam: 'Family Court, ' + city,
      jmfc: 'Judicial Magistrate First Class, ' + city + ' · Court 11',
      hc: 'High Court · Court 14',
      cons: 'District Consumer Commission, ' + city,
      drt: 'Debts Recovery Tribunal, ' + city,
      civ: 'Civil Judge (Senior Division), ' + city + ' · Court 3'
    };

    /* Labels */
    const labels = [['COM', 'Commercial matters', '#1F5FA8'], ['CRL', 'Criminal', '#C23B32'], ['FAM', 'Family', '#8E3FB0'], ['NI', 'Cheque bounce (s.138)', '#EA6A2E'], ['SBI', 'State Bank of India', '#0E8A86']]
      .filter(([code]) => !(d.labels || []).some(l => String(l.code).toUpperCase() === code))
      .map(([code, name, color], i) => ({ id: id('lb', i + 1), code, name, color, demo: true }));
    const lab = code => { const l = labels.find(x => x.code === code) || (d.labels || []).find(x => String(x.code).toUpperCase() === code); return l ? [l.id] : []; };

    /* Clients */
    const cl = (n, name, type, ccity, contact, phone, email, portal, notes) => ({ id: id('cl', n), name, type, city: ccity, contact, phone, email, notes: notes || '', portal: !!portal, share: { dates: true, orders: true, invoices: !!portal && n % 2 === 1 }, demo: true });
    const clients = [
      cl(1, 'Sharma Traders Pvt. Ltd.', 'Company', city, 'Vikas Sharma, Director', '98765 41001', 'vikas@sharmatraders.example.com', true, 'Retainer client since 2024. Prefers WhatsApp updates after every hearing.'),
      cl(2, 'Rohit Verma', 'Individual', city, 'Sunita Verma (mother)', '98765 41002', 'sunita.verma@example.com', false),
      cl(3, 'Meera Iyer', 'Individual', city, 'Meera Iyer', '98765 41003', 'meera.iyer@example.com', true, 'Do not call before 6 PM on weekdays.'),
      cl(4, 'Gupta Enterprises', 'Firm', city, 'Anil Gupta, Partner', '98765 41004', 'accounts@guptaenterprises.example.com', true),
      cl(5, 'Sunrise Co-operative Housing Society', 'Firm', city, 'R. K. Sinha, Secretary', '98765 41005', 'secretary@sunrisechs.example.com', false),
      cl(6, 'Anjali Das', 'Individual', city, 'Anjali Das', '98765 41006', 'anjali.das@example.com', false),
      cl(7, 'State Bank of India', 'Company', city, 'Branch Manager, SAM Branch', '98765 41007', 'sam.branch@sbi.example.com', true),
      cl(8, 'Rajesh Kumar', 'Individual', city, 'Rajesh Kumar', '98765 41008', 'rajesh.kumar@example.com', false)
    ];

    /* Cases */
    const P = (side, name, note) => ({ side, role: side === 'petitioner' ? 'Petitioner / appellant' : 'Respondent', name, note: note || '' });
    const cs = (n, o) => Object.assign({ id: id('c', n), full: o.title, cnr: '', forum: o.court, purpose: o.stage, status: 'active', fileNo: 'LS/' + T.slice(0, 4) + '/' + String(40 + n).padStart(3, '0'), bench: '', state: '', district: city, oppAdv: '', labels: [], idKind: 'case_number', category: 'district', tribunal: '', filingNo: '', diaryNo: '', createdBy: me, createdOn: back(60 + n * 9), summary: '', summaryMeta: '', parties: [], issues: [], missing: [], ourArgs: [], oppArgs: [], args: '', demo: true }, o, { team: [...new Set(o.team || [me])] });
    const cases = [
      cs(1, { title: 'Sharma Traders v. Apex Logistics', no: 'Comm. Suit 214/2025', court: COURT.comm, stage: 'Evidence', clientId: id('cl', 1), labels: lab('COM'), bench: 'Sh. A. K. Mishra, District Judge (Commercial)', oppAdv: 'Adv. Nitin Saxena', team: [me, who(2)],
        parties: [P('petitioner', 'Sharma Traders Pvt. Ltd.', 'Plaintiff, supplier of packaging material'), P('respondent', 'Apex Logistics LLP', 'Defendant, buyer')],
        issues: ['Whether the plaintiff proves supply of goods worth ₹18,40,000 under invoices of April–June 2025', 'Whether the defendant rejected the goods within a reasonable time (s.42 Sale of Goods Act)', 'Whether the plaintiff is entitled to interest at 18% p.a.'],
        ourArgs: ['Delivery challans signed by the defendant’s stores in-charge prove receipt (Ex. P-7)', 'No rejection was communicated for over four months; goods are deemed accepted under s.42', 'Part payment of ₹2,00,000 on 12 August 2025 is an acknowledgment under s.18 Limitation Act'],
        oppArgs: ['Goods were defective and rejected orally at the warehouse', 'The invoices carry no agreed rate of interest'],
        missing: ['Original e-way bills for the May 2025 consignments', 'Ledger extract certified under s.63 BSA'],
        summary: 'Money suit for ₹18,40,000 for packaging material supplied to Apex Logistics. Pre-institution mediation failed. Plaintiff’s evidence is in progress: PW-1 (Vikas Sharma) is part cross-examined.' }),
      cs(2, { title: 'State v. Rohit Verma (bail)', no: 'B.A. 1187/2026', court: COURT.sess, stage: 'Arguments', clientId: id('cl', 2), labels: lab('CRL'), isApp: true, bench: 'Sh. R. P. Singh, Addl. Sessions Judge', oppAdv: 'Ld. APP for the State',
        parties: [P('petitioner', 'Rohit Verma', 'Applicant, in custody since 2 months'), P('respondent', 'State', 'Through P.S. Kotwali')],
        issues: ['Whether the applicant deserves regular bail under s.483 BNSS', 'Whether there is a risk of tampering with witnesses'],
        ourArgs: ['Charge-sheet already filed; custodial interrogation no longer required', 'Applicant is a first-time offender with deep roots in the community', 'Co-accused with a similar role has been granted bail'],
        oppArgs: ['Offence is serious and the investigation of the second accused is pending'],
        missing: ['Certified copy of the co-accused’s bail order'],
        summary: 'Regular bail application after filing of the charge-sheet. Parity with the co-accused is the main ground.' }),
      cs(3, { title: 'Meera Iyer v. Karan Iyer', no: 'HMA 13B Petition 56/2026', court: COURT.fam, stage: 'Mediation', clientId: id('cl', 3), labels: lab('FAM'), oppAdv: 'Adv. Pooja Menon',
        parties: [P('petitioner', 'Meera Iyer', 'Wife'), P('respondent', 'Karan Iyer', 'Husband')],
        issues: ['Whether the six-month cooling-off period should be waived (Amardeep Singh v. Harveen Kaur)', 'Settlement of permanent alimony and custody of the minor child'],
        ourArgs: ['Parties have lived separately for over 18 months', 'All issues including alimony and custody are settled in the mediation memorandum'],
        summary: 'Divorce by mutual consent. First motion recorded; matter referred to the mediation centre to finalise the settlement terms.' }),
      cs(4, { title: 'Gupta Enterprises v. Neelkanth Steels', no: 'Complaint Case 3391/2025', court: COURT.jmfc, stage: 'Evidence', clientId: id('cl', 4), labels: lab('NI'), oppAdv: 'Adv. S. Tiwari', team: [me, who(5)],
        parties: [P('petitioner', 'Gupta Enterprises', 'Complainant, through partner Anil Gupta'), P('respondent', 'Neelkanth Steels Pvt. Ltd.', 'Accused company and its director')],
        issues: ['Whether cheque no. 004512 for ₹6,75,000 was issued towards a legally enforceable debt', 'Whether the demand notice was served within 30 days of the return memo'],
        ourArgs: ['Presumption under s.139 NI Act arises once signature on the cheque is admitted', 'Notice was sent within 9 days of the return memo; postal tracking shows delivery'],
        oppArgs: ['Cheque was given as security, not for an existing debt'],
        missing: ['Postal tracking report printout with s.63 BSA certificate'],
        summary: 'Complaint under s.138 NI Act for dishonour of a ₹6,75,000 cheque. Complainant’s evidence is part-heard.' }),
      cs(5, { title: 'Sunrise Housing Society v. Municipal Corporation', no: 'W.P.(C) 4471/2026', court: COURT.hc, stage: 'Arguments', clientId: id('cl', 5), category: 'high_court', district: '', oppAdv: 'Standing Counsel, Municipal Corporation', team: [me, who(8)],
        parties: [P('petitioner', 'Sunrise Co-operative Housing Society', 'Through its Secretary'), P('respondent', 'Municipal Corporation', 'And its Executive Engineer')],
        issues: ['Whether the demolition notice was issued without a hearing', 'Whether the sanctioned plan of 2009 covers the stilt parking'],
        ourArgs: ['Notice violates natural justice: no opportunity of hearing', 'Stilt parking is shown in the sanctioned plan of 2009'],
        missing: ['Certified copy of the 2009 sanctioned plan'],
        summary: 'Writ petition against a demolition notice for the society’s stilt parking. Interim protection from coercive action continues.' }),
      cs(6, { title: 'Anjali Das v. Bluewave Builders', no: 'CC 212/2026', court: COURT.cons, stage: 'Pleadings', clientId: id('cl', 6), tribunal: 'CONSUMER', category: 'tribunal', oppAdv: 'Adv. Harish Rao',
        parties: [P('petitioner', 'Anjali Das', 'Complainant, flat buyer'), P('respondent', 'Bluewave Builders Pvt. Ltd.', 'Opposite party')],
        issues: ['Whether delay of 26 months in possession is a deficiency in service', 'Refund with interest or delayed-possession compensation'],
        summary: 'Consumer complaint for delayed possession of a flat. Notice issued; written version awaited.' }),
      cs(7, { title: 'State Bank of India v. Mahadev Agro Industries', no: 'O.A. 908/2025', court: COURT.drt, stage: 'Evidence', clientId: id('cl', 7), labels: lab('SBI'), tribunal: 'DRT', category: 'tribunal', bench: 'Presiding Officer, DRT', oppAdv: 'Adv. M. Khan', team: [me, who(11)],
        parties: [P('petitioner', 'State Bank of India', 'Applicant bank'), P('respondent', 'Mahadev Agro Industries', 'Borrower and two guarantors')],
        issues: ['Recovery of ₹1,12,40,000 with interest under the RDB Act'],
        ourArgs: ['Loan documents and acknowledgment of debt dated 10 March 2025 are admitted'],
        summary: 'Original application for recovery of a term loan and cash-credit dues. Bank’s affidavit evidence filed; cross-examination of the bank’s witness pending.' }),
      cs(8, { title: 'Rajesh Kumar v. Suresh Kumar', no: 'Title Suit 77/2023', court: COURT.civ, stage: 'Reserved for orders', clientId: id('cl', 8), oppAdv: 'Adv. B. N. Pandey',
        parties: [P('petitioner', 'Rajesh Kumar', 'Plaintiff, elder brother'), P('respondent', 'Suresh Kumar', 'Defendant, younger brother')],
        issues: ['Whether the suit property is joint family property', 'Whether the plaintiff is entitled to a half share by partition'],
        summary: 'Partition suit between brothers. Final arguments concluded; order reserved.' }),
      cs(9, { title: 'Sharma Traders v. Apex Logistics (appeal)', no: 'To be numbered', court: 'High Court · Commercial Appellate Division', stage: 'Pending filing', status: 'pending', clientId: id('cl', 1), labels: lab('COM'), category: 'high_court', district: '',
        summary: 'Appeal under s.13(1A) Commercial Courts Act against the order refusing an interim deposit. Grounds being drafted.' }),
      cs(10, { title: 'Verma v. Verma (injunction)', no: 'Civil Suit 140/2024', court: COURT.civ, stage: 'Execution', status: 'disposed', clientId: id('cl', 2), oppAdv: 'Adv. K. Lal',
        parties: [P('petitioner', 'Sunita Verma', 'Plaintiff'), P('respondent', 'Mahesh Verma', 'Defendant')],
        summary: 'Suit for permanent injunction decreed with costs. Appeal period running.' })
    ];
    cases.forEach((c, i) => { c.created = c.createdOn + 'T05:' + String(10 + i).padStart(2, '0') + ':00.000Z'; });

    /* Court orders: text read by the same rules the app uses for pasted orders. */
    const dt = {
      h1: back(14), h2: back(7), h3: back(21), h4: back(10), h5: back(28), h6: back(2), h7: back(12), h8: back(18), h9: back(25), h10: back(5),
      f16: ahead(9), f17: ahead(6), f18: ahead(11), f19: ahead(13), pron: ahead(8)
    };
    const ord = (n, caseId, date, text, confirmed) => {
      const r = L.readOrder(text), c = cases.find(x => x.id === caseId);
      return { id: id('o', n), caseId, date, source: 'Demo order · ' + L.dayMon(date), official: false, file: 'Order sheet · ' + r.paras.length + ' paragraph' + (r.paras.length === 1 ? '' : 's'), cause: c.no, paras: r.paras, points: r.points,
        summary: r.points.slice(0, 2).join(' ') + (r.nextDate ? ' Next date: ' + L.dmy(r.nextDate) + '.' : ''), nextDate: r.nextDate, nextFrom: r.nextFrom, confirmed: !!confirmed, demo: true };
    };
    const orders = [
      ord(1, id('c', 1), dt.h1, `1. Present: ${counsel} for the plaintiff and learned counsel Nitin Saxena for the defendant.\n\n2. PW-1 Vikas Sharma further cross-examined in part. Learned counsel for the defendant seeks time to complete the cross-examination.\n\n3. Last opportunity granted subject to costs of ₹2,000. List on ${L.dmy(T)} for further cross-examination of PW-1.`, true),
      ord(2, id('c', 2), dt.h2, `1. Heard ${counsel} for the applicant and the learned APP for the State.\n\n2. The APP seeks time to obtain the case diary and the antecedent report of the applicant.\n\n3. Let the case diary be produced. List on ${L.dmy(nw1)} for further arguments.`, true),
      ord(3, id('c', 4), dt.h4, `1. Complainant present with ${counsel}; accused present on bail with counsel.\n\n2. CW-1 examined in chief and documents CW-1/1 to CW-1/5 exhibited; cross-examination deferred at the request of the accused.\n\n3. Part-heard. List on ${L.dmy(T)} for cross-examination of CW-1.`, true),
      ord(4, id('c', 7), dt.h7, `1. Affidavit in evidence of the applicant bank's witness is on record.\n\n2. The defendants seek leave to cross-examine the witness. Allowed.\n\n3. List on ${L.dmy(T)} for cross-examination of AW-1.`, true),
      ord(5, id('c', 8), dt.h8, `1. Final arguments of both sides heard at length.\n\n2. Written submissions, if any, be filed within one week with advance copy to the other side.\n\n3. Order reserved. List for pronouncement of order on ${L.dmy(dt.pron)}.`, false),
      ord(6, id('c', 5), dt.h5, `1. Issue notice. Learned standing counsel accepts notice on behalf of the respondents.\n\n2. Counter affidavit be filed within three weeks. Rejoinder, if any, within two weeks thereafter.\n\n3. In the meantime, no coercive steps shall be taken against the petitioner society on the impugned notice. List after four weeks.`, false),
      ord(7, id('c', 3), dt.h3, `1. Both parties present in person with counsel. First motion statements recorded.\n\n2. The parties are referred to the Mediation Centre to record the terms of settlement on alimony and custody.\n\n3. Put up on ${L.dmy(nw1)} with the mediation report.`, true),
      ord(8, id('c', 10), dt.h9, `1. Arguments heard. For the reasons recorded in the separate judgment, the suit is decreed with costs.\n\n2. The defendant is permanently restrained from interfering with the plaintiff's possession of the suit premises.\n\n3. Decree be drawn up accordingly. File be consigned to the record room.`, true),
      ord(9, id('c', 6), dt.h10, `1. Complaint admitted. Issue notice to the opposite party.\n\n2. The opposite party shall file its written version within 30 days of service.\n\n3. List on ${L.dmy(dt.f17)} for appearance and written version.`, true),
      ord(10, id('c', 1), T, `1. Present: ${counsel} for the plaintiff and learned counsel Nitin Saxena for the defendant.\n\n2. Cross-examination of PW-1 could not be concluded as the court was busy with a part-heard sessions trial.\n\n3. Adjourned. List on ${L.dmy(dt.f16)} for further cross-examination of PW-1.`, true)
    ];

    /* Hearings */
    let hn = 0;
    const hr = (caseId, date, time, o) => { const c = cases.find(x => x.id === caseId); hn++;
      return Object.assign({ id: id('h', hn), caseId, date, time, court: c.court, item: '', listNo: '', bench: c.bench || '', purpose: c.stage, assignee: c.team[0], outcome: '', brief: false, demo: true }, o || {}); };
    const hearings = [
      hr(id('c', 1), dt.h1, '10:30', { item: 'Item 9', purpose: 'Plaintiff evidence', outcome: 'Adjourned' }),
      hr(id('c', 2), dt.h2, '10:30', { item: 'Item 4', purpose: 'Bail arguments', outcome: 'Heard' }),
      hr(id('c', 3), dt.h3, '11:00', { item: 'Item 2', purpose: 'First motion', outcome: 'Adjourned' }),
      hr(id('c', 4), dt.h4, '11:00', { item: 'Item 15', purpose: 'Complainant evidence', outcome: 'Part-heard' }),
      hr(id('c', 5), dt.h5, '10:30', { item: 'Item 33', purpose: 'Admission', outcome: 'Adjourned' }),
      hr(id('c', 5), dt.h6, '10:30', { item: 'Item 27', purpose: 'Counter affidavit', assignee: who(8) }),
      hr(id('c', 7), dt.h7, '14:30', { item: 'Item 6', purpose: 'Applicant evidence', outcome: 'Adjourned' }),
      hr(id('c', 8), dt.h8, '12:00', { item: 'Item 1', purpose: 'Final arguments', outcome: 'Reserved for orders' }),
      hr(id('c', 10), dt.h9, '11:30', { item: 'Item 3', purpose: 'Judgment', outcome: 'Disposed' }),
      hr(id('c', 6), dt.h10, '10:30', { item: 'Item 18', purpose: 'Admission', outcome: 'Heard' }),
      hr(id('c', 1), T, '10:30', { item: 'Item 7', purpose: 'Cross-examination of PW-1', outcome: 'Adjourned', fromOrder: id('o', 1) }),
      hr(id('c', 4), T, '11:00', { item: 'Item 12', purpose: 'Cross-examination of CW-1', fromOrder: id('o', 3) }),
      hr(id('c', 7), T, '14:30', { item: 'Item 3', purpose: 'Cross-examination of AW-1', fromOrder: id('o', 4), assignee: who(11) }),
      hr(id('c', 2), nw1, '10:30', { item: 'Item 5', purpose: 'Bail arguments', fromOrder: id('o', 2), assignee: me }),
      hr(id('c', 3), nw1, '10:30', { item: 'Item 2', purpose: 'Mediation report', fromOrder: id('o', 7), assignee: me }),
      hr(id('c', 1), dt.f16, '11:00', { item: 'Item 9', purpose: 'Further cross-examination of PW-1', fromOrder: id('o', 10) }),
      hr(id('c', 6), dt.f17, '10:30', { item: 'Item 21', purpose: 'Written version', fromOrder: id('o', 9) }),
      hr(id('c', 4), dt.f18, '11:00', { item: 'Item 8', purpose: 'Complainant evidence' }),
      hr(id('c', 7), dt.f19, '14:30', { item: 'Item 4', purpose: 'Defendants’ evidence', assignee: who(11) })
    ];
    /* Chain each hearing to the next one, as recording an outcome with a next date does. */
    [[1, 11], [11, 16], [2, 14], [3, 15], [4, 12], [12, 18], [7, 13], [13, 19], [10, 17]].forEach(([a, b]) => { const x = hearings[a - 1], y = hearings[b - 1]; x.nextHearingId = y.id; y.prevHearingId = x.id; });

    /* Tasks */
    const tk = (n, caseId, t, due, done, i) => ({ id: id('t', n), caseId, t, who: who(i == null ? n : i), due, done: !!done, demo: true });
    const tasks = [
      tk(1, id('c', 1), 'Prepare cross-examination notes on the delivery challans for PW-1', back(1), false, 0),
      tk(2, id('c', 2), 'Get certified copy of the co-accused’s bail order', T, false, 2),
      tk(3, id('c', 2), 'Brief note on parity for tomorrow’s bail arguments', T, false, 0),
      tk(4, id('c', 4), 'Download postal tracking report and prepare s.63 BSA certificate', back(3), false, 5),
      tk(5, id('c', 5), 'Draft rejoinder to the counter affidavit', ahead(4), false, 8),
      tk(6, id('c', 6), 'Collect allotment letter and payment receipts from the client', ahead(2), false, 0),
      tk(7, id('c', 7), 'Prepare AW-1 for cross-examination', T, false, 11),
      tk(8, id('c', 9), 'Finalise grounds of appeal and court fee', ahead(5), false, 0),
      tk(9, id('c', 10), 'Apply for certified copy of the decree', back(20), true, 0),
      tk(10, id('c', 3), 'Send the draft settlement terms to the client for approval', back(6), true, 0)
    ];

    /* Documents and evidence (records only: no file is attached) */
    const doc = (n, caseId, kind, ext, name, meta, addedBack, extra) => Object.assign({ id: id('d', n), caseId, kind, ext, name, meta: meta + ' · sample record, no file attached', v: 'v1', added: back(addedBack), file: '', demo: true }, extra || {});
    const docs = [
      doc(1, id('c', 1), 'document', 'PDF', 'Plaint with documents', 'Pleading', 120),
      doc(2, id('c', 1), 'document', 'PDF', 'Written statement of the defendant', 'Pleading', 90),
      doc(3, id('c', 2), 'document', 'DOCX', 'Bail application under s.483 BNSS', 'Application', 9),
      doc(4, id('c', 4), 'document', 'PDF', 'Legal notice under s.138 NI Act', 'Notice', 140),
      doc(5, id('c', 5), 'document', 'PDF', 'Writ petition with annexures P-1 to P-9', 'Petition', 35),
      doc(6, id('c', 6), 'document', 'PDF', 'Consumer complaint with affidavit', 'Complaint', 12),
      doc(7, id('c', 10), 'document', 'PDF', 'Certified copy of the judgment and decree', 'Court record', 20),
      doc(8, id('c', 7), 'document', 'PDF', 'Affidavit in evidence of AW-1', 'Evidence affidavit', 14),
      doc(9, id('c', 4), 'evidence', 'IMG', 'Dishonoured cheque no. 004512 for ₹6,75,000', 'Evidence', 30, { exhibit: 'Ex. CW-1/2', custody: 'Original in the office safe, almirah 2' }),
      doc(10, id('c', 4), 'evidence', 'PDF', 'Bank return memo — “funds insufficient”', 'Evidence', 30, { exhibit: 'Ex. CW-1/3', custody: 'Original with the client' }),
      doc(11, id('c', 1), 'evidence', 'PDF', 'Delivery challans (14) signed by the defendant’s stores', 'Evidence', 60, { exhibit: 'Ex. P-7', custody: 'Originals filed in court on ' + L.dmy(back(60)) }),
      doc(12, id('c', 3), 'evidence', 'PDF', 'Mediation memorandum of settlement', 'Evidence', 4, { exhibit: 'Mark A', custody: 'Copy on file; original with the Mediation Centre' })
    ];

    /* Invoices over six months: paid, unpaid and overdue */
    const inv = (n, clientN, caseN, dateBack, amount, desc, paidBack) => ({ id: id('i', n), no: 'INV-' + T.slice(0, 4) + '-D' + String(n).padStart(2, '0'), clientId: id('cl', clientN), caseId: id('c', caseN), date: back(dateBack), amount, paid: paidBack != null, paidOn: paidBack != null ? L.addDays(T, -paidBack) : '', desc, demo: true });
    const invoices = [
      inv(1, 1, 1, 150, 45000, 'Professional fees — drafting of plaint and pre-institution mediation', 140),
      inv(2, 7, 7, 120, 60000, 'Professional fees — filing of O.A. and appearance', 105),
      inv(3, 4, 4, 95, 25000, 'Professional fees — complaint under s.138 NI Act', 80),
      inv(4, 5, 5, 62, 75000, 'Professional fees — writ petition, drafting and appearance'),
      inv(5, 2, 10, 45, 30000, 'Professional fees — final arguments and judgment'),
      inv(6, 3, 3, 20, 40000, 'Professional fees — mutual consent petition and mediation', 3),
      inv(7, 6, 6, 8, 20000, 'Professional fees — consumer complaint'),
      inv(8, 1, 1, 2, 15000, 'Appearance fee — evidence hearing', 1)
    ];

    /* Limitation calculations: two approved (they become deadlines), one waiting for approval */
    const lims = [
      { id: id('l', 1), title: 'First appeal against the decree in Verma v. Verma', rule: 'fa_dc', caseId: id('c', 10), judgment: dt.h9, applied: L.addDays(dt.h9, 1), ready: L.addDays(dt.h9, 8), n: '', unit: 'd', basis: '', copy: false, approved: true, approvedAt: L.fmt(L.addDays(dt.h9, 9)) + ' at 17:20 IST', approvedBy: me, sent: false, demo: true },
      { id: id('l', 2), title: 'Commercial appeal — Sharma Traders v. Apex Logistics (interim deposit order)', rule: 'cca', caseId: id('c', 9), judgment: back(20), applied: back(19), ready: back(12), n: '', unit: 'd', basis: '', copy: false, approved: true, approvedAt: L.fmt(back(11)) + ' at 11:05 IST', approvedBy: me, sent: false, demo: true },
      { id: id('l', 3), title: 'S.138 complaint — Gupta Enterprises v. Om Sai Traders (cheque 118803)', rule: 'ni138', caseId: '', judgment: back(25), applied: '', ready: '', n: '', unit: 'd', basis: '', copy: false, approved: false, approvedAt: '', sent: false, demo: true }
    ];
    /* Deadlines entered by hand */
    const deadlines = [
      { id: id('dl', 1), caseId: id('c', 6), title: 'Written version due from the opposite party — Anjali Das v. Bluewave Builders', rule: 'Consumer Protection Act, 2019, s.38(2)(a)', due: L.addDays(dt.h10, 30), approved: true, done: false, demo: true },
      { id: id('dl', 2), caseId: id('c', 5), title: 'Rejoinder to counter affidavit — Sunrise Housing Society', rule: 'Order of ' + L.dmy(dt.h5) + ' (two weeks after the counter)', due: ahead(5), approved: true, done: false, demo: true },
      { id: id('dl', 3), caseId: id('c', 1), title: 'Additional documents with affidavit — Sharma Traders v. Apex Logistics', rule: 'Entered manually', due: back(9), approved: true, done: true, doneAt: back(10), doneBy: me, demo: true }
    ];

    /* Activity log */
    const lg = (n, daysBack, hm, x, caseId) => ({ id: id('log', n), ts: back(daysBack) + ' ' + hm, caseId: caseId || '', x, demo: true });
    const log = [
      lg(1, 1, '18:10', 'Invoice INV-' + T.slice(0, 4) + '-D08 raised', id('c', 1)),
      lg(2, 2, '16:45', 'Hearing outcome recorded for Sunrise Housing Society v. Municipal Corporation', id('c', 5)),
      lg(3, 4, '12:30', 'Evidence “Mediation memorandum of settlement” added by ' + me, id('c', 3)),
      lg(4, 7, '15:05', 'Order dated ' + L.dmy(dt.h2) + ' added; next date ' + L.dmy(nw1) + ' confirmed', id('c', 2)),
      lg(5, 11, '11:05', 'Limitation date for “Commercial appeal — Sharma Traders v. Apex Logistics” approved by ' + me, id('c', 9)),
      lg(6, 12, '17:40', 'Case created by ' + me, id('c', 6)),
      lg(7, 18, '13:15', 'Order reserved in Rajesh Kumar v. Suresh Kumar', id('c', 8))
    ];

    const notes = 'Demo notes — collect the certified copy of the decree in Verma v. Verma.\nCall Mr. Gupta about the original cheque before the next date.\nSBI: ask the branch for the updated statement of account.';
    const research = ['L2', 'L10', 'L11', 'L3'];
    const draft = { at: back(3) + ' 18:20', by: 'you', label: 'Demo draft', demo: true, audit: [{ at: back(3) + ' 18:20', who: me, what: 'Document created' }],
      html: `<p><b>BY REGISTERED POST A.D. / SPEED POST / EMAIL</b></p><p>To,<br>Om Sai Traders,<br>Through its Proprietor,<br>Station Road, ${city}</p><p><b>Subject: Legal notice under Section 138 of the Negotiable Instruments Act, 1881 for dishonour of cheque no. 118803 dated ${L.dmy(back(40))} for ₹3,20,000</b></p><p>Under instructions from and on behalf of my client, Gupta Enterprises, through its partner Shri Anil Gupta, I serve upon you the following notice:</p><p>1. That you purchased goods from my client and, towards discharge of the outstanding amount, issued cheque no. 118803 dated ${L.dmy(back(40))} for ₹3,20,000 drawn on your bank.</p><p>2. That the said cheque, when presented, was returned unpaid with the remark “funds insufficient” by return memo dated ${L.dmy(back(32))}.</p><p>3. I therefore call upon you to pay the said sum of ₹3,20,000 within 15 days of receipt of this notice, failing which my client shall be constrained to initiate proceedings under Section 138 read with Section 142 of the Act, at your risk as to costs and consequences.</p><p>A copy of this notice is retained in my office for further action.</p><p>${adv}<br>Advocate for Gupta Enterprises</p>` };

    return { labels, clients, cases, orders, hearings, tasks, docs, invoices, lims, deadlines, log, notes, research, draft };
  }

  /* ---------- load / remove ---------- */
  function load(app) {
    const d = app.db;
    if (ownerOnly(app)) return app.toast('Only the firm owner can add demo data.');
    if (loaded(d)) return app.toast('Demo data is already in your workspace.');
    const x = build(d);
    app.mut(db => {
      db.labels = [...(db.labels || []), ...x.labels];
      db.clients = [...x.clients, ...db.clients];
      db.cases = [...x.cases, ...db.cases];
      db.orders = [...x.orders, ...db.orders];
      db.hearings = [...db.hearings, ...x.hearings];
      db.tasks = [...db.tasks, ...x.tasks];
      db.docs = [...x.docs, ...db.docs];
      db.invoices = [...x.invoices, ...db.invoices];
      db.lims = [...x.lims, ...(db.lims || [])];
      db.deadlines = [...(db.deadlines || []), ...x.deadlines];
      /* Approved calculations go into Deadlines exactly as when a user approves one. */
      x.lims.filter(l => l.approved).forEach(l => { const y = db.lims.find(z => z.id === l.id); window.LSV.syncDeadline(db, y); const dl = db.deadlines.find(z => z.limId === y.id); if (dl) dl.demo = true; });
      db.log = [...x.log, ...(db.log || [])].slice(0, L.LOG_MAX);
      db.settings = db.settings || {};
      const add = x.research.filter(r => !(db.research || []).includes(r));
      db.research = [...(db.research || []), ...add]; db.settings.demoResearch = add;
      if (!String(db.notes || '').trim()) { db.notes = x.notes; db.settings.demoNotes = x.notes; }
      db.drafts = db.drafts || {}; (db.drafts[2] = db.drafts[2] || []).unshift(x.draft);
      db.settings.demoAt = L.today();
    }, 'Demo data added to every section');
  }

  function remove(app) {
    if (ownerOnly(app)) return app.toast('Only the firm owner can remove demo data.');
    app.mut(db => {
      const caseIds = new Set(db.cases.filter(isDemo).map(c => c.id)), clientIds = new Set(db.clients.filter(isDemo).map(c => c.id)), labelIds = new Set((db.labels || []).filter(isDemo).map(l => l.id));
      const gone = x => isDemo(x) || (!!x.caseId && caseIds.has(x.caseId));
      /* A file someone uploaded to a demo case is removed with its record. */
      (db.docs || []).filter(x => gone(x) && x.file).forEach(x => { try { if (window.LSB && LSB.on) { if (x.drive) LSB.drive.remove(x.drive); else LSB.removeFile(x.id, x.file); } else L.files.del(x.id); } catch (e) {} });
      ['hearings', 'orders', 'tasks', 'docs', 'deadlines', 'lims', 'log'].forEach(k => { db[k] = (db[k] || []).filter(x => !gone(x)); });
      db.invoices = db.invoices.filter(i => !gone(i) && !clientIds.has(i.clientId));
      db.cases = db.cases.filter(c => !isDemo(c));
      db.clients = db.clients.filter(c => !isDemo(c));
      db.labels = (db.labels || []).filter(l => !isDemo(l));
      db.cases.forEach(c => { if (c.labels && c.labels.some(l => labelIds.has(l))) c.labels = c.labels.filter(l => !labelIds.has(l)); if (clientIds.has(c.clientId)) c.clientId = ''; });
      Object.keys(db.drafts || {}).forEach(k => { const a = (db.drafts[k] || []).filter(v => !isDemo(v)); if (a.length) db.drafts[k] = a; else delete db.drafts[k]; });
      const s = db.settings || {};
      if (Array.isArray(s.demoResearch)) db.research = (db.research || []).filter(r => !s.demoResearch.includes(r));
      if (s.demoNotes && db.notes === s.demoNotes) db.notes = '';
      delete s.demoResearch; delete s.demoNotes; delete s.demoAt;
    }, 'Demo data removed. Your own records are unchanged.');
  }

  /* ---------- UI ---------- */
  const V = () => window.LSV, h = (...a) => window.LSV.h(...a);
  const askRemove = app => V().confirmBox(app, 'Remove demo data?', 'Every sample client, case, hearing, order, task, document, invoice, calculation and deadline is removed, along with anything you added to a demo case. Your own records are not touched.', 'Remove demo data', () => remove(app));
  const summary = d => { const n = k => (d[k] || []).filter(isDemo).length; return `${n('cases')} cases, ${n('clients')} clients, ${n('hearings')} hearings, ${n('orders')} orders, ${n('tasks')} tasks, ${n('docs')} documents, ${n('invoices')} invoices and ${n('lims') + n('deadlines')} limitation records`; };

  /* Dashboard: offer demo data to an empty workspace; once loaded, say so and offer to remove it. */
  function DemoCard({ app }) {
    const d = app.db, K = V().K;
    if (!L.access(d.sub).ok || (window.LSB && LSB.on && !d.firmId)) return null;
    const on = loaded(d);
    if (!on && d.cases.length) return null;
    const box = { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', border: '1px dashed ' + (on ? '#C9D8FA' : '#C4C4C4'), background: on ? '#F4F7FE' : '#FFFFFF', borderRadius: 12, padding: '16px 20px' };
    return h('section', { style: box, 'aria-label': 'Demo data' },
      h('div', { style: { minWidth: 0, flex: '1 1 320px' } },
        h('div', { style: { fontSize: 15, fontWeight: 600, color: K.ink } }, on ? 'Demo data is on' : 'See Legal Staff with a full sample practice'),
        h('div', { style: { fontSize: 13.5, color: K.txt, lineHeight: 1.55, marginTop: 4 } }, on
          ? `Every section is filled with sample work: ${summary(d)}. Remove it whenever you are ready to start with your own matters.`
          : 'Fill every section — cases, hearings, causelist, court orders, documents, evidence, clients, invoices, deadlines, reports and drafts — with sample records. Remove them with one click later.')),
      ownerOnly(app) ? h('span', { style: { fontSize: 13, color: K.mut } }, 'The firm owner can ' + (on ? 'remove' : 'add') + ' demo data')
        : h(V().Btn, on ? { danger: true, onClick: () => askRemove(app) } : { primary: true, onClick: () => load(app) }, on ? 'Remove demo data' : 'Load demo data'));
  }

  /* Every other screen, while demo data is on: a slim reminder with the way out. */
  function DemoStrip({ app }) {
    const d = app.db, K = V().K;
    if (!loaded(d)) return null;
    return h('div', { role: 'status', style: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', maxWidth: 1320, margin: '0 0 18px', background: '#F4F7FE', border: '1px solid #C9D8FA', borderRadius: 10, padding: '8px 12px 8px 14px', fontSize: 13, color: '#1D4FB0' } },
      h('span', null, h('b', null, 'Demo data is on.'), ' Sample records marked as demo fill this section.'),
      !ownerOnly(app) && h(V().Btn, { small: true, onClick: () => askRemove(app) }, 'Remove demo data'));
  }

  /* Settings: load or remove at any time. */
  function SettingsCard({ app }) {
    const d = app.db, on = loaded(d), acc = L.access(d.sub), K = V().K;
    const text = on ? 'Sample records are in every section: ' + summary(d) + '.' : 'Fill every section with a sample practice to explore the app. Your own records are never changed, and demo records can be removed in one click.';
    const btn = ownerOnly(app) ? h('span', { style: { fontSize: 12.5, color: K.mut } }, 'Firm owner only')
      : !acc.ok ? h('span', { style: { fontSize: 12.5, color: K.mut } }, 'Start your free trial first')
      : h(V().Btn, on ? { small: true, danger: true, onClick: () => askRemove(app) } : { small: true, primary: true, onClick: () => load(app) }, on ? 'Remove' : 'Load demo data');
    return h(V().Card, { title: 'Demo data' }, h(V().Line, null, h('div', { style: { flex: 1, minWidth: 0 } }, on ? 'Demo data is on' : 'Demo data is off', h('div', { style: { fontSize: 12.5, color: K.mut, lineHeight: 1.5 } }, text)), btn));
  }

  window.LSD = { load, remove, count, loaded, isDemo, build, DemoCard, DemoStrip, SettingsCard };
})();

/* Legal Staff — practice type and practice area.
   A firm picks, when it is created, who it is (advocate, chamber, law firm, corporate legal team) and the one area of law it
   works in (criminal, banking and recovery, family, tax, ...). The picks are kept in firm.kind and firm.domain and shape the
   dashboard, the case stages, the suggested labels, the order of limitation presets and the sidebar. "general" keeps the default
   look. Nothing here is legal advice: limitation presets still carry the "check the statute / rules" note. */
(function () {
  const KINDS = [
    { k: 'advocate', label: 'Individual advocate', sub: 'Your own practice' },
    { k: 'chamber', label: 'Chamber', sub: 'A senior with juniors and clerks' },
    { k: 'firm', label: 'Law firm', sub: 'Partners, associates and staff' },
    { k: 'corporate', label: 'Corporate legal team', sub: 'In-house department of a company or bank' }
  ];

  /* stats: 4 entries. A string is a built-in figure (today, active, dl7, overdue, pending, unpaid, next14); an object
     { label, re, note } counts live cases whose stage, title or label names match the regular expression re.
     quick: 4 of newcase, upload, limit, draft, cnr, evidence, causelist, research, board, clients.
     lead: sidebar items shown first in the Practice group. rename: sidebar labels in this area.
     watch: a dashboard panel listing live cases that match re. */
  const D = {
    general: { label: 'General practice', sub: 'Several areas of law', code: 'GP',
      stages: ['Pleadings', 'Evidence', 'Arguments', 'Pending filing', 'Execution', 'Reserved for orders', 'Mediation'], labels: [], rules: [],
      stats: ['today', 'active', 'dl7', 'overdue'], quick: ['newcase', 'upload', 'limit', 'draft'], lead: [], rename: {}, watch: null, stageTitle: 'Active cases by stage' },
    criminal: { label: 'Criminal law', sub: 'Trials, bail, quashing and appeals', code: 'CR',
      stages: ['FIR / investigation', 'Bail', 'Charge framing', 'Prosecution evidence', 'Statement of accused', 'Defence evidence', 'Final arguments', 'Judgment reserved', 'Appeal / revision', 'Execution of sentence'],
      labels: [['BAIL', 'Bail', '#B42318'], ['ABL', 'Anticipatory bail', '#9A3412'], ['CUS', 'In custody', '#7C2D12'], ['QSH', 'Quashing', '#1D4FB0'], ['TRL', 'Trial', '#0F766E'], ['APL', 'Appeal', '#6D28D9']],
      rules: ['crim_appeal_hc', 'crim_appeal_other', 'crim_acq_hc', 'slp', 'writ'],
      stats: ['today', { label: 'Bail matters', re: 'bail', note: 'bail and anticipatory bail' }, { label: 'Accused in custody', re: 'custody', note: 'labelled "In custody"' }, 'dl7'],
      quick: ['newcase', 'upload', 'evidence', 'draft'], lead: ['cases', 'calendar', 'orders', 'evidence', 'causelist'], rename: { orders: 'Orders & remand' },
      watch: { title: 'Bail & custody watch', re: 'bail|custody', empty: 'No bail or custody matters right now. Cases at the Bail stage, or labelled Bail or In custody, appear here.' }, stageTitle: 'Cases by trial stage' },
    ni: { label: 'Cheque bounce (NI Act s.138)', sub: 'Complaints, notices and recovery', code: 'NI',
      stages: ['Demand notice sent', '15-day wait', 'Complaint filed', 'Summons / appearance', 'Complainant evidence', 'Statement of accused', 'Defence evidence', 'Arguments', 'Judgment', 'Appeal / revision', 'Recovery'],
      labels: [['138', 'Section 138', '#B42318'], ['NTC', 'Notice stage', '#9A3412'], ['CMP', 'Compounding', '#0F766E'], ['INT', 'Interim compensation', '#1D4FB0']],
      rules: ['ni138', 'crim_appeal_other', 'revision', 'suit'],
      stats: ['today', { label: 'Notices out', re: 'notice|15-day', note: 'demand notice stage' }, { label: 'Complaints in trial', re: 'complaint|summons|evidence|arguments', note: 'past filing' }, 'dl7'],
      quick: ['newcase', 'limit', 'draft', 'upload'], lead: ['cases', 'limitation', 'calendar', 'orders'], rename: {},
      watch: { title: 'Complaint deadline watch', re: 'notice|15-day', empty: 'No cases at the notice stage. A complaint must be filed within one month after the 15-day payment period ends.' }, stageTitle: 'Cheque cases by stage' },
    banking: { label: 'Banking & recovery', sub: 'DRT, SARFAESI, bank recovery', code: 'BK',
      stages: ['Notice / demand', 'SARFAESI s.13(2) notice', 'Possession (s.14)', 'DRT: OA filed', 'DRT: evidence', 'DRT: arguments', 'Recovery certificate', 'DRAT appeal', 'Settlement / OTS', 'Execution'],
      labels: [['DRT', 'DRT', '#1D4FB0'], ['SRF', 'SARFAESI', '#6D28D9'], ['NPA', 'NPA', '#B42318'], ['OTS', 'One-time settlement', '#0F766E'], ['RC', 'Recovery certificate', '#9A3412']],
      rules: ['sarfaesi17', 'drt_drat', 'ni138', 'suit', 'exec', 'writ'],
      stats: ['today', { label: 'SARFAESI / possession', re: 'sarfaesi|possession', note: 'secured asset actions' }, { label: 'At the DRT', re: 'drt', note: 'original applications' }, 'dl7'],
      quick: ['newcase', 'upload', 'limit', 'draft'], lead: ['cases', 'orders', 'limitation', 'calendar', 'clients'], rename: { clients: 'Banks & borrowers', orders: 'Orders & notices' },
      watch: { title: 'Recovery watch', re: 'sarfaesi|possession|recovery|ots|settlement', empty: 'No recovery matters at the SARFAESI, possession, recovery-certificate or settlement stage.' }, stageTitle: 'Recovery matters by stage' },
    insolvency: { label: 'Insolvency (NCLT / IBC)', sub: 'CIRP, liquidation, NCLAT', code: 'IB',
      stages: ['Demand notice', 'Application filed (s.7 / 9 / 10)', 'Admission', 'Moratorium / IRP', 'Claims and CoC', 'Resolution plan', 'Liquidation', 'NCLAT appeal', 'Supreme Court'],
      labels: [['CIRP', 'CIRP', '#1D4FB0'], ['LIQ', 'Liquidation', '#B42318'], ['FC', 'Financial creditor', '#0F766E'], ['OC', 'Operational creditor', '#9A3412']],
      rules: ['ibc61', 'slp', 'writ'],
      stats: ['today', { label: 'Before admission', re: 'demand|application|admission', note: 'not yet admitted' }, { label: 'In CIRP', re: 'moratorium|claims|resolution', note: 'moratorium to plan' }, 'dl7'],
      quick: ['newcase', 'upload', 'limit', 'draft'], lead: ['cases', 'orders', 'limitation', 'calendar'], rename: {},
      watch: { title: 'CIRP timeline watch', re: 'moratorium|claims|resolution', empty: 'No cases in the corporate insolvency resolution process.' }, stageTitle: 'Matters by IBC stage' },
    civil: { label: 'Civil litigation', sub: 'Suits, injunctions, execution', code: 'CV',
      stages: ['Pleadings', 'Issues', 'Evidence', 'Arguments', 'Reserved for orders', 'Decree', 'Appeal', 'Execution', 'Mediation'],
      labels: [['SUT', 'Suit', '#1D4FB0'], ['INJ', 'Injunction', '#9A3412'], ['EXE', 'Execution', '#6D28D9'], ['APL', 'Appeal', '#0F766E']],
      rules: ['fa_hc', 'fa_dc', 'revision', 'review', 'exec', 'suit', 'cca'],
      stats: ['today', 'active', { label: 'In execution', re: 'execution', note: 'decrees being enforced' }, 'dl7'],
      quick: ['newcase', 'upload', 'limit', 'draft'], lead: ['cases', 'orders', 'calendar', 'limitation'], rename: {},
      watch: null, stageTitle: 'Active cases by stage' },
    property: { label: 'Property & real estate', sub: 'Title, tenancy, RERA, partition', code: 'PR',
      stages: ['Title search', 'Notice', 'Pleadings', 'Injunction / interim', 'Evidence', 'Arguments', 'Reserved for orders', 'Decree', 'Appeal', 'Execution / possession'],
      labels: [['TTL', 'Title', '#1D4FB0'], ['PAR', 'Partition', '#6D28D9'], ['TEN', 'Tenancy', '#0F766E'], ['RER', 'RERA', '#9A3412'], ['LAQ', 'Land acquisition', '#B42318']],
      rules: ['suit', 'fa_hc', 'fa_dc', 'rera', 'exec', 'writ'],
      stats: ['today', 'active', { label: 'Interim relief pending', re: 'injunction|interim', note: 'stay and injunction matters' }, 'dl7'],
      quick: ['newcase', 'upload', 'clients', 'draft'], lead: ['cases', 'documents', 'orders', 'calendar'], rename: { documents: 'Title & documents' },
      watch: { title: 'Interim relief watch', re: 'injunction|interim', empty: 'No stay or injunction matters at the moment.' }, stageTitle: 'Property matters by stage' },
    family: { label: 'Family & matrimonial', sub: 'Divorce, maintenance, custody', code: 'FM',
      stages: ['Notice / counselling', 'Petition filed', 'Interim maintenance', 'Mediation', 'Evidence', 'Arguments', 'Reserved for orders', 'Decree', 'Appeal', 'Execution'],
      labels: [['DIV', 'Divorce', '#1D4FB0'], ['MNT', 'Maintenance', '#0F766E'], ['CUS', 'Child custody', '#6D28D9'], ['DV', 'Domestic violence', '#B42318'], ['GRD', 'Guardianship', '#9A3412']],
      rules: ['hma_appeal', 'fa_hc', 'exec', 'revision'],
      stats: ['today', 'active', { label: 'Maintenance matters', re: 'maintenance', note: 'interim or final' }, { label: 'In mediation', re: 'mediation|counselling', note: 'mediation and counselling' }],
      quick: ['newcase', 'upload', 'clients', 'draft'], lead: ['cases', 'calendar', 'clients', 'orders'], rename: { clients: 'Clients & families' },
      watch: { title: 'Mediation & counselling', re: 'mediation|counselling', empty: 'No cases are in mediation or counselling.' }, stageTitle: 'Family matters by stage' },
    corporate: { label: 'Commercial & corporate', sub: 'Commercial suits, company law, contracts', code: 'CM',
      stages: ['Notice / pre-litigation', 'Pleadings', 'Admission / denial', 'Issues', 'Evidence', 'Arguments', 'Reserved for orders', 'Mediation / settlement', 'Appeal', 'Execution'],
      labels: [['COM', 'Commercial suit', '#1D4FB0'], ['CMP', 'Company law', '#6D28D9'], ['CNT', 'Contract', '#0F766E'], ['SHA', 'Shareholder dispute', '#9A3412']],
      rules: ['cca', 'suit', 'fa_hc', 'arb34', 'slp'],
      stats: ['today', 'active', { label: 'Pre-litigation', re: 'notice|pre-litigation', note: 'notices and negotiation' }, 'dl7'],
      quick: ['newcase', 'upload', 'draft', 'limit'], lead: ['cases', 'orders', 'documents', 'limitation'], rename: {},
      watch: null, stageTitle: 'Commercial matters by stage' },
    arbitration: { label: 'Arbitration & ADR', sub: 'Tribunals, awards, enforcement', code: 'AR',
      stages: ['Notice invoking arbitration', 'Appointment (s.11)', 'Statement of claim', 'Statement of defence', 'Evidence', 'Arguments', 'Award', 'Challenge (s.34)', 'Enforcement (s.36)'],
      labels: [['DOM', 'Domestic', '#1D4FB0'], ['INT', 'International', '#6D28D9'], ['AWD', 'Award', '#0F766E'], ['S34', 's.34 challenge', '#B42318']],
      rules: ['arb34', 'suit', 'slp', 'writ'],
      stats: ['today', 'active', { label: 'Awards to challenge or enforce', re: 'award|challenge|enforcement', note: 'after the award' }, 'dl7'],
      quick: ['newcase', 'upload', 'limit', 'draft'], lead: ['cases', 'limitation', 'orders', 'calendar'], rename: {},
      watch: { title: 'Award watch', re: 'award|challenge', empty: 'No awards waiting to be challenged or enforced.' }, stageTitle: 'Arbitrations by stage' },
    tax: { label: 'Tax & GST', sub: 'Income tax, GST, customs', code: 'TX',
      stages: ['Notice / assessment', 'Reply filed', 'Hearing before the officer', 'First appeal', 'Tribunal appeal', 'High Court', 'Supreme Court', 'Refund / compliance', 'Settled'],
      labels: [['IT', 'Income tax', '#1D4FB0'], ['GST', 'GST', '#0F766E'], ['CUS', 'Customs', '#6D28D9'], ['SRC', 'Search / seizure', '#B42318']],
      rules: ['itax_cita', 'itax_itat', 'gst_appeal', 'writ', 'slp'],
      stats: ['today', { label: 'Notices to reply', re: 'notice|reply', note: 'at the notice stage' }, { label: 'In appeal', re: 'appeal', note: 'first appeal and tribunal' }, 'dl7'],
      quick: ['newcase', 'upload', 'limit', 'draft'], lead: ['cases', 'limitation', 'orders', 'calendar'], rename: { orders: 'Orders & notices' },
      watch: { title: 'Notice reply watch', re: 'notice|reply', empty: 'No notices waiting for a reply.' }, stageTitle: 'Tax matters by stage' },
    labour: { label: 'Labour & service', sub: 'Industrial disputes, service matters', code: 'LB',
      stages: ['Conciliation', 'Reference / statement of claim', 'Written statement', 'Evidence', 'Arguments', 'Award', 'Challenge in writ', 'Execution'],
      labels: [['TRM', 'Termination', '#B42318'], ['WGS', 'Wages', '#0F766E'], ['SRV', 'Service matter', '#1D4FB0'], ['PF', 'PF / ESI', '#6D28D9']],
      rules: ['cat', 'writ', 'review', 'slp'],
      stats: ['today', 'active', { label: 'In conciliation', re: 'conciliation', note: 'before reference' }, 'dl7'],
      quick: ['newcase', 'upload', 'draft', 'clients'], lead: ['cases', 'orders', 'calendar', 'clients'], rename: { clients: 'Workers & employers' },
      watch: null, stageTitle: 'Labour matters by stage' },
    ip: { label: 'Intellectual property', sub: 'Trademark, patent, copyright, design', code: 'IP',
      stages: ['Filing / registration', 'Examination / objection', 'Opposition', 'Hearing', 'Interim injunction', 'Evidence', 'Arguments', 'Decree / registration', 'Appeal'],
      labels: [['TM', 'Trademark', '#1D4FB0'], ['PT', 'Patent', '#6D28D9'], ['CR', 'Copyright', '#0F766E'], ['DS', 'Design', '#9A3412']],
      rules: ['suit', 'fa_hc', 'cca', 'writ'],
      stats: ['today', 'active', { label: 'Oppositions & objections', re: 'opposition|objection|examination', note: 'before the registry' }, 'dl7'],
      quick: ['newcase', 'upload', 'draft', 'limit'], lead: ['cases', 'documents', 'orders', 'calendar'], rename: { documents: 'Filings & documents' },
      watch: { title: 'Registry watch', re: 'opposition|objection|examination|hearing', empty: 'No matters pending before the registry.' }, stageTitle: 'IP matters by stage' },
    consumer: { label: 'Consumer disputes', sub: 'District, State and National Commissions', code: 'CS',
      stages: ['Notice', 'Complaint filed', 'Reply / written version', 'Evidence by affidavit', 'Arguments', 'Order reserved', 'Appeal', 'Execution'],
      labels: [['DEF', 'Deficiency of service', '#1D4FB0'], ['MED', 'Medical', '#B42318'], ['INS', 'Insurance', '#0F766E'], ['BLD', 'Builder', '#9A3412']],
      rules: ['consumer', 'rera', 'exec', 'suit'],
      stats: ['today', 'active', { label: 'In appeal', re: 'appeal', note: 'State or National Commission' }, 'dl7'],
      quick: ['newcase', 'upload', 'limit', 'draft'], lead: ['cases', 'orders', 'calendar', 'limitation'], rename: {},
      watch: null, stageTitle: 'Consumer cases by stage' },
    constitutional: { label: 'Constitutional & writ', sub: 'Writs, PILs, High Court and Supreme Court', code: 'WR',
      stages: ['Drafting', 'Filed', 'Notice issued', 'Counter affidavit', 'Rejoinder', 'Interim relief', 'Final hearing', 'Reserved', 'Judgment', 'Review / appeal'],
      labels: [['WRT', 'Writ', '#1D4FB0'], ['PIL', 'PIL', '#0F766E'], ['SRV', 'Service', '#6D28D9'], ['CNT', 'Contempt', '#B42318']],
      rules: ['writ', 'slp', 'review'],
      stats: ['today', 'active', { label: 'Awaiting counter', re: 'notice|counter|rejoinder', note: 'pleadings stage' }, 'dl7'],
      quick: ['newcase', 'upload', 'research', 'draft'], lead: ['cases', 'orders', 'calendar', 'brain'], rename: {},
      watch: { title: 'Interim relief watch', re: 'interim', empty: 'No matters are at the interim relief stage.' }, stageTitle: 'Petitions by stage' }
  };

  /* Limitation presets that exist for one area only. Same shape as the presets in app-store.js; each is a starting point to verify. */
  const RULES = [
    { k: 'crim_appeal_hc', label: 'Criminal appeal to the High Court (conviction) · 60 days', n: 60, u: 'd', start: 'Date of the sentence or order', basis: 'Limitation Act, 1963, Art. 115(b)(i)', copy: true, kind: 'Appeal to the High Court from a sentence or order other than an acquittal or a death sentence' },
    { k: 'crim_appeal_other', label: 'Criminal appeal to a court other than the High Court · 30 days', n: 30, u: 'd', start: 'Date of the sentence or order', basis: 'Limitation Act, 1963, Art. 115(b)(ii)', copy: true, kind: 'Appeal to the Sessions Court or another court from a sentence or order other than an acquittal' },
    { k: 'crim_acq_hc', label: 'Appeal against acquittal to the High Court (State) · 90 days', n: 90, u: 'd', start: 'Date of the order of acquittal', basis: 'Limitation Act, 1963, Art. 114(a). A complainant seeking special leave has a different period: check s.378 CrPC / the corresponding BNSS provision', copy: true, kind: 'Appeal by the State to the High Court from an order of acquittal' },
    { k: 'sarfaesi17', label: 'SARFAESI application to the DRT · 45 days', n: 45, u: 'd', start: 'Date the measure under s.13(4) was taken', basis: 'Securitisation and Reconstruction of Financial Assets and Enforcement of Security Interest Act, 2002, s.17(1)', copy: false, kind: 'Application to the Debts Recovery Tribunal against a measure taken by a secured creditor' },
    { k: 'drt_drat', label: 'Appeal from the DRT to the DRAT · 30 days', n: 30, u: 'd', start: 'Date a copy of the DRT order was received', basis: 'Recovery of Debts and Bankruptcy Act, 1993, s.20(3); pre-deposit conditions apply', copy: false, kind: 'Appeal to the Debts Recovery Appellate Tribunal' },
    { k: 'ibc61', label: 'IBC appeal to the NCLAT · 30 days', n: 30, u: 'd', start: 'Date the NCLT order was made available to the appellant', basis: 'Insolvency and Bankruptcy Code, 2016, s.61(2). The Appellate Tribunal may allow a further 15 days', copy: false, kind: 'Appeal against an order of the NCLT' },
    { k: 'arb34', label: 'Application to set aside an award (s.34) · 3 months', n: 3, u: 'm', start: 'Date the party received the arbitral award', basis: 'Arbitration and Conciliation Act, 1996, s.34(3). The court may allow a further 30 days, not more', copy: false, kind: 'Application to set aside an arbitral award' },
    { k: 'itax_cita', label: 'Income-tax appeal to the first appellate authority · 30 days', n: 30, u: 'd', start: 'Date of service of the notice of demand or the order', basis: 'Income-tax Act, 1961, s.249(2). Check the corresponding provision of the Income-tax Act, 2025 for the year concerned', copy: false, kind: 'Appeal to the Commissioner (Appeals)' },
    { k: 'itax_itat', label: 'Income-tax appeal to the ITAT · 60 days', n: 60, u: 'd', start: 'Date the order was communicated', basis: 'Income-tax Act, 1961, s.253(3). Check the corresponding provision of the Income-tax Act, 2025 for the year concerned', copy: false, kind: 'Appeal to the Income Tax Appellate Tribunal' },
    { k: 'gst_appeal', label: 'GST appeal to the first appellate authority · 3 months', n: 3, u: 'm', start: 'Date the decision or order was communicated', basis: 'Central Goods and Services Tax Act, 2017, s.107(1). Pre-deposit applies', copy: false, kind: 'Appeal against an order of an adjudicating authority under the GST Acts' },
    { k: 'hma_appeal', label: 'Appeal from a matrimonial decree · 30 days', n: 30, u: 'd', start: 'Date of the decree or order', basis: 'Hindu Marriage Act, 1955, s.28(4). Other personal laws have their own provisions', copy: true, kind: 'Appeal from a decree or order under the Hindu Marriage Act' },
    { k: 'cat', label: 'Application to the Administrative Tribunal · 1 year', n: 1, u: 'y', start: 'Date of the final order', basis: 'Administrative Tribunals Act, 1985, s.21(1)(a)', copy: false, kind: 'Application to the Central or a State Administrative Tribunal' }
  ];

  const QUICK = {
    newcase: ['New case', 'Manual entry or CNR import', 'case'], upload: ['Upload court order', 'Next date and key points', 'upload'], limit: ['Calculate limitation', 'Rule-based, with review', 'clock'],
    draft: ['Draft a document', 'Templates and dictation', 'pen'], cnr: ['Import by CNR', 'Pull a case from its CNR', 'case'], evidence: ['Add evidence', 'Exhibits and chain of custody', 'archive'],
    causelist: ['Daily causelist', 'Your matters, court by court', 'cal'], research: ['Legal research', 'Ask with citations', 'search'], board: ['Display board', 'Courts running now', 'court'], clients: ['Clients', 'Contacts and matters', 'users']
  };

  /* The area-specific limitation presets join the calculator's list, ahead of "Custom period". */
  const R = window.LS && window.LS.RULES; if (R && !R.some(r => r.k === RULES[0].k)) R.splice(R.length - 1, 0, ...RULES);

  const norm = v => (D[v] ? v : 'general');
  const domain = firm => D[norm(firm && firm.domain)];
  const kind = firm => KINDS.find(x => x.k === (firm && firm.kind)) || KINDS[0];
  const re = s => { try { return new RegExp(s, 'i'); } catch (e) { return /$^/; } };

  /* Stages for the case forms: the area's own, plus any stage a case already has. */
  const stages = (firm, current) => { const s = domain(firm).stages; return current && !s.includes(current) ? [...s, current] : s; };
  /* Limitation presets for the area, then the rest. Returns rule keys in display order. */
  const ruleOrder = (firm, all) => { const first = domain(firm).rules.filter(k => all.includes(k)); return [...first, ...all.filter(k => !first.includes(k))]; };
  /* Labels to create for a new firm: [{ code, name, color }]. */
  const labelsFor = key => (D[norm(key)].labels || []).map(([code, name, color]) => ({ code, name, color }));
  /* Does a live case match a stat or watch pattern? Looks at stage, title and the names of its labels. */
  const matches = (c, labels, pattern) => { const r = re(pattern); return r.test([c.stage, c.title].join(' ')) || (c.labels || []).some(id => { const l = labels.find(x => x.id === id); return l && r.test(l.name + ' ' + l.code); }); };
  /* Adds labels the firm does not have yet (matched by code). */
  const addLabels = (db, ls) => { db.labels = db.labels || []; (ls || []).forEach(l => { if (!db.labels.some(x => String(x.code).toUpperCase() === l.code.toUpperCase())) db.labels.push({ id: window.LS.uid('lb'), code: l.code, name: l.name, color: l.color }); }); };
  const pick = (firm, key, def) => ((D[norm(firm && firm.domain)] || {})[key]) || def;

  window.LSP = { KINDS, DOMAINS: D, RULES, QUICK, norm, domain, kind, stages, ruleOrder, labelsFor, addLabels, matches, pick,
    list: () => Object.keys(D).filter(k => k !== 'general').map(k => Object.assign({ k }, D[k])).concat([Object.assign({ k: 'general' }, D.general)]) };
})();

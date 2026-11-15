// Comparison pages at /compare/<slug>, rendered by seo/pages/compare.mjs.
// Shape: { slug, navLabel, navHint, title (H1), metaTitle, metaDescription, kicker, lead, keywords: [string],
//   columns: [{ key, name, tagline }] (2–3; the Legal Staff column key is 'ls'),
//   rows: [{ label, values: { <columnKey>: string }, best: <columnKey> (optional) }] (10–14),
//   decide: [{ column: <columnKey>, title, points: [string] }],
//   verdict: { heading, paragraphs: [string] }, faqs: [{ q, a }] (5–6), related: { features: [slug], tools: [slug], blogs: [slug] },
//   note: string (optional; trademark / fairness note shown under the verdict) }
export const comparisons = [
  {
    slug: 'physical-advocate-diary-vs-legal-staff', navLabel: 'Paper diary vs Legal Staff', navHint: 'Paper diaries and Excel vs automated order reading',
    title: 'Physical advocate diary vs Legal Staff: paper, Excel or a cloud court diary?',
    metaTitle: 'Physical Advocate Diary vs Legal Staff',
    metaDescription: 'Paper diary or Excel vs Legal Staff: compare how next dates are recorded, reminders, clashes, team access, documents and cost for Indian advocates.',
    kicker: 'Paper diary vs Legal Staff',
    lead: 'The paper diary has served the Bar for generations, and for some practices it still works. Here is an honest look at where it holds up, where it costs you time and missed dates, and what changes with a cloud court diary.',
    keywords: ['advocate diary', 'physical advocate diary', 'court diary app', 'digital advocate diary', 'lawyer diary India', 'case diary software'],
    columns: [
      { key: 'diary', name: 'Paper diary or Excel', tagline: 'Handwritten diary, register or spreadsheet' },
      { key: 'ls', name: 'Legal Staff', tagline: 'Cloud court diary and chamber workspace' }
    ],
    rows: [
      { label: 'Recording the next date', values: { diary: 'Read the order, then write the date by hand', ls: 'Picked out of the pasted or uploaded order; goes in the diary once you confirm it' }, best: 'ls' },
      { label: 'Reading orders', values: { diary: 'Each order read end to end by the advocate or clerk', ls: 'Summary with paragraph references, so you check rather than re-read' }, best: 'ls' },
      { label: 'Reminders', values: { diary: 'Depends on remembering to open the diary', ls: 'Two days before and on the morning of the hearing, on WhatsApp (Business API, once connected) and email' }, best: 'ls' },
      { label: 'Clashes', values: { diary: 'Spotted by eye, sometimes on the day', ls: 'Flagged when one advocate has two hearings at the same time' }, best: 'ls' },
      { label: 'Team access', values: { diary: 'One copy, in one bag; changes relayed by phone', ls: 'Shared with juniors and clerks according to their roles' }, best: 'ls' },
      { label: 'New year', values: { diary: 'Pending dates copied into a fresh diary by hand', ls: 'Nothing to carry forward' }, best: 'ls' },
      { label: 'Lost or damaged diary', values: { diary: 'Dates are gone unless you kept a copy', ls: 'Stored online; sign in from any device' }, best: 'ls' },
      { label: 'Documents', values: { diary: 'Separate physical files, email and chats', ls: 'Per-case vault for pleadings, orders, annexures and vakalatnamas' }, best: 'ls' },
      { label: 'Limitation and deadlines', values: { diary: 'Worked out by hand and noted down', ls: 'Rule-based limitation tracker showing each exclusion, approved by the advocate' }, best: 'ls' },
      { label: 'Client updates', values: { diary: 'Calls and messages from the advocate’s own phone', ls: 'Share the confirmed next date with the client when you choose' }, best: 'ls' },
      { label: 'Works without internet or power', values: { diary: 'Always', ls: 'Needs an internet connection and a browser' }, best: 'diary' },
      { label: 'Cost', values: { diary: 'The price of a diary or a spreadsheet', ls: 'Paid plans: Solo, Professional, Firm and Enterprise' }, best: 'diary' },
      { label: 'Getting started', values: { diary: 'Nothing to learn', ls: 'A short setup: add your running matters and their next dates' }, best: 'diary' }
    ],
    decide: [
      { column: 'diary', title: 'A paper diary can be enough when…', points: ['You appear in one or two courts with a modest number of matters', 'You are the only person who needs to see the diary', 'You prefer not to pay for software and are comfortable checking it every evening'] },
      { column: 'ls', title: 'Move to Legal Staff when…', points: ['You appear across several courts or tribunals and clashes are creeping in', 'Juniors and clerks need to see dates and tasks without calling you', 'You read many orders a week and want reminders that do not depend on memory', 'Clients regularly ask for the next date'] }
    ],
    verdict: {
      heading: 'The verdict',
      paragraphs: [
        'A paper diary is cheap, familiar and never runs out of battery. Its weakness is that everything depends on one person reading each order correctly, writing the date on the right page and remembering to look at it — and that only one copy exists.',
        'Legal Staff keeps the habit of a daily list but takes the copying out of it. Orders are read and summarised, the next date is proposed for your confirmation, clashes are flagged and reminders go out without anyone having to send them. Many advocates keep a pocket diary for the day itself and let Legal Staff hold the record.',
        'Whichever you use, keep checking the cause list of your court on the day: listings can change after an order is passed.'
      ]
    },
    faqs: [
      { q: 'Can I keep my paper diary and use Legal Staff too?', a: 'Yes. Many advocates keep a pocket diary for the day and use Legal Staff as the record that the team, reminders and clients work from.' },
      { q: 'How long does it take to move my diary over?', a: 'You add your running matters and their next dates once. After that, each new order keeps the diary current once you confirm the date it picks out.' },
      { q: 'Does Legal Staff take dates from cause lists automatically?', a: 'No. Dates come from orders you paste or upload, or entries you make, and nothing reaches the diary until an advocate confirms it.' },
      { q: 'Is an Excel sheet not good enough?', a: 'A spreadsheet is searchable and can be shared, but it still needs every date typed in by hand and it sends no reminders. It also does not read orders, flag clashes or hold the case documents.' },
      { q: 'Does Legal Staff work on my phone?', a: 'Yes, in a mobile browser. It is a web app; there are no native iOS or Android apps.' },
      { q: 'What if I lose internet in court?', a: 'Legal Staff needs a connection. The morning briefing and reminders arrive before the day starts, so you will usually have the day’s list with you already.' }
    ],
    related: {
      features: ['digital-advocate-diary', 'ai-court-order-reader', 'whatsapp-hearing-reminders'],
      tools: ['limitation-period-calculator'],
      blogs: ['switch-from-physical-advocate-diary-to-cloud-case-workspace', 'automate-daily-cause-list-next-hearing-date-tracking-india', 'automated-whatsapp-court-hearing-reminders-advocates-clients']
    }
  },
  {
    slug: 'ecourts-app-vs-legal-staff-workspace', navLabel: 'eCourts app vs Legal Staff', navHint: 'Case status lookups vs a full chamber workspace',
    title: 'eCourts Services app vs Legal Staff: case status lookups and a chamber workspace',
    metaTitle: 'eCourts Services App vs Legal Staff Workspace',
    metaDescription: 'eCourts is the official free case-status service. See what Legal Staff adds on top: order reading, a shared diary, reminders, documents, team and research.',
    kicker: 'eCourts app vs Legal Staff',
    lead: 'The eCourts Services app is the official, free way to check case status, listings and orders on the eCourts network, and it remains the source of record. Legal Staff is not a replacement for it. It is the workspace a chamber uses around it: reading orders, keeping a shared diary, sending reminders and holding the file.',
    keywords: ['ecourts services app', 'ecourts app for advocates', 'ecourts vs practice management software', 'case status app India', 'CNR case tracking', 'advocate case management'],
    columns: [
      { key: 'ecourts', name: 'eCourts Services app', tagline: 'Official, free case-status service' },
      { key: 'ls', name: 'Legal Staff', tagline: 'Chamber workspace on top' }
    ],
    rows: [
      { label: 'What it is', values: { ecourts: 'The official case-information service of the eCourts project', ls: 'Practice and case management software for advocates and firms' } },
      { label: 'Source of record', values: { ecourts: 'Yes — case status, listings and orders as published by the court', ls: 'No — works from the orders you paste or upload and from a connected court-data provider' }, best: 'ecourts' },
      { label: 'Cost', values: { ecourts: 'Free', ls: 'Paid plans: Solo, Professional, Firm and Enterprise' }, best: 'ecourts' },
      { label: 'Finding a case', values: { ecourts: 'Search by CNR, case number, party name and other fields', ls: 'Import case details by CNR where a court-data provider is connected, or add the case yourself' }, best: 'ecourts' },
      { label: 'Platforms', values: { ecourts: 'Website and mobile apps', ls: 'Web app in desktop and mobile browsers; no native apps' }, best: 'ecourts' },
      { label: 'Reading orders', values: { ecourts: 'View or download orders the court has uploaded', ls: 'Summary with paragraph references; next date picked out for your confirmation' }, best: 'ls' },
      { label: 'Diary across courts', values: { ecourts: 'Look up each case and its next date', ls: 'Week and day diary across all your courts, with clash detection and .ics export' }, best: 'ls' },
      { label: 'Reminders', values: { ecourts: 'Built for looking up case information', ls: 'WhatsApp (Business API, once connected) and email, two days before and on the morning' }, best: 'ls' },
      { label: 'Team and tasks', values: { ecourts: 'Built for individual lookups', ls: 'Roles for juniors and clerks, task assignment and a daily hearing board' }, best: 'ls' },
      { label: 'Your own documents', values: { ecourts: 'Shows what the court publishes', ls: 'Private per-case vault for pleadings, annexures, vakalatnamas and certified copies' }, best: 'ls' },
      { label: 'Questions on the case file', values: { ecourts: 'Not its purpose', ls: 'AI Case Brain answers from the case’s own documents, with citations, for advocate review' }, best: 'ls' },
      { label: 'Clients and billing', values: { ecourts: 'Not its purpose', ls: 'Client records, client portal sharing and per-matter invoices with GST' }, best: 'ls' }
    ],
    decide: [
      { column: 'ecourts', title: 'eCourts on its own is enough when…', points: ['You only need to check the status or next date of a few cases', 'You work alone and keep your own diary', 'You do not need reminders, documents or tasks in one place'] },
      { column: 'ls', title: 'Add Legal Staff when…', points: ['You run many matters across courts and need one diary for the chamber', 'You want orders summarised and dates confirmed, not copied', 'Juniors, clerks and clients need the right information without calls', 'You want the case file, research and billing in the same place'] }
    ],
    verdict: {
      heading: 'Use both: eCourts for the record, Legal Staff for the work',
      paragraphs: [
        'The eCourts Services app is free, official and the place to verify status, listings and orders. Nothing on this page suggests otherwise, and you should keep using it.',
        'What eCourts is not built to be is a chamber’s workspace. Legal Staff sits on top: you paste or upload the order, it summarises it and proposes the next date, you confirm, and the diary, hearing board and reminders follow. Documents, tasks, client updates and invoices live in the same case.',
        'Because eCourts does not offer an open public API, Legal Staff does not scrape it. Case import by CNR works where a court-data provider is connected, and you should always check the official record when in doubt.'
      ]
    },
    faqs: [
      { q: 'Does Legal Staff replace the eCourts app?', a: 'No. eCourts is the official, free case-information service and remains the source of record. Legal Staff adds order reading, a shared diary, reminders, documents, team and research on top.' },
      { q: 'Does Legal Staff pull data from eCourts automatically?', a: 'eCourts has no open public API, and Legal Staff does not scrape it. Case details can be imported by CNR where a court-data provider is connected; otherwise you add the case and paste or upload orders.' },
      { q: 'If both show a next date, which one do I trust?', a: 'The court’s official record. Legal Staff shows the date you confirmed from the order; if the listing changes, check the cause list and update the diary.' },
      { q: 'Is the eCourts app free?', a: 'Yes. It is an official service provided free of charge. Legal Staff is paid software with Solo, Professional, Firm and Enterprise plans.' },
      { q: 'Does Legal Staff cover High Courts and tribunals too?', a: 'Yes. You can keep matters from the Supreme Court, High Courts, district courts and tribunals in one diary, with dates confirmed from their orders.' },
      { q: 'Is there a Legal Staff mobile app?', a: 'Legal Staff is a web app that works in mobile browsers. There are no native iOS or Android apps.' }
    ],
    related: {
      features: ['ai-court-order-reader', 'digital-advocate-diary', 'chamber-team-collaboration'],
      tools: ['limitation-period-calculator', 'bns-ipc-crpc-bnss-converter'],
      blogs: ['ecourts-services-app-vs-ai-practice-management-indian-lawyers', 'track-cases-district-court-high-court-nclt-single-dashboard', 'how-ai-reads-indian-court-orders-extracts-next-hearing-dates']
    }
  },
  {
    slug: 'legacy-legal-erp-vs-legal-staff', navLabel: 'Enterprise legal ERPs vs Legal Staff', navHint: 'Heavy ERPs vs fast, AI-first practice management',
    title: 'Enterprise legal ERPs like Provakil, ManageMyLawsuits and PracticeLeague vs Legal Staff',
    metaTitle: 'Enterprise Legal ERP vs Legal Staff for Litigators',
    metaDescription: 'How a typical enterprise legal ERP compares with Legal Staff on implementation, configuration, training, cost model and fit for individual litigators.',
    kicker: 'Enterprise legal ERPs vs Legal Staff',
    lead: 'Names such as Provakil, ManageMyLawsuits and PracticeLeague often come up when Indian legal teams look for software. This page does not review any one of them. It compares a typical enterprise legal ERP, as a category, with Legal Staff, so you can judge which kind of tool fits your practice.',
    keywords: ['legal ERP India', 'Provakil alternative', 'ManageMyLawsuits alternative', 'PracticeLeague alternative', 'legal practice management software India', 'litigation management software'],
    columns: [
      { key: 'erp', name: 'Typical enterprise legal ERP', tagline: 'Broad legal-operations suite' },
      { key: 'ls', name: 'Legal Staff', tagline: 'Litigation-first chamber workspace' }
    ],
    rows: [
      { label: 'Built mainly for', values: { erp: 'Often corporate legal departments and larger firms managing legal operations', ls: 'Individual litigators, chambers and litigation firms' } },
      { label: 'Scope', values: { erp: 'Can span litigation, contracts, notices, compliance and legal spend', ls: 'Focused on litigation practice: orders, diary, reminders, documents, team and billing' }, best: 'erp' },
      { label: 'Implementation', values: { erp: 'Usually a project: scoping, configuration and data migration, often with the vendor', ls: 'Sign in with Google, add your matters and start' }, best: 'ls' },
      { label: 'Configuration', values: { erp: 'Highly configurable workflows, fields and approvals', ls: 'Sensible defaults for litigation, with less to configure' }, best: 'erp' },
      { label: 'Training', values: { erp: 'Often formal training for users and administrators', ls: 'Built to be picked up in a single walkthrough' }, best: 'ls' },
      { label: 'Cost model', values: { erp: 'Commonly quote-based contracts, sometimes with implementation fees', ls: 'Plans listed on the pricing section: Solo, Professional, Firm and Enterprise' } },
      { label: 'Time to first use', values: { erp: 'Depends on rollout scope; larger deployments take longer', ls: 'The same day for most chambers' }, best: 'ls' },
      { label: 'Reading court orders', values: { erp: 'Varies by product — check with the vendor', ls: 'Summaries with paragraph references; next date proposed for your confirmation' } },
      { label: 'Hearing reminders', values: { erp: 'Varies by product and configuration', ls: 'WhatsApp (Business API, once connected) and email, two days before and on the morning' } },
      { label: 'Court diary', values: { erp: 'Varies by product', ls: 'Week and day views across courts, clash detection, reassign to a junior, .ics export' } },
      { label: 'AI on the case file', values: { erp: 'Varies by product and plan', ls: 'AI Case Brain answers from the case’s own documents with citations; never invents case law' } },
      { label: 'Reporting for legal operations', values: { erp: 'Typically a core strength, with dashboards for management', ls: 'Practice reports for the chamber, per-matter invoices with GST' }, best: 'erp' },
      { label: 'Platforms', values: { erp: 'Varies by product', ls: 'Web app in desktop and mobile browsers; no native apps' } }
    ],
    decide: [
      { column: 'erp', title: 'An enterprise legal ERP may suit you when…', points: ['You run a corporate legal department with contracts, compliance and litigation in one system', 'You need custom workflows, approvals and management reporting', 'You have the time and budget for an implementation project and training'] },
      { column: 'ls', title: 'Legal Staff fits better when…', points: ['You are a litigator, chamber or litigation firm and court work is the core of your day', 'You want to be working the same day, without a configuration project', 'Order reading, the court diary and WhatsApp reminders matter more than legal-ops dashboards', 'You want a published plan rather than a custom quote'] }
    ],
    verdict: {
      heading: 'Different tools for different jobs',
      paragraphs: [
        'Enterprise legal ERPs are built to cover a lot of ground, and for a corporate legal department that breadth and configurability can be exactly what is needed. The trade-off is usually the effort to implement, configure and train, and a cost model built around larger organisations.',
        'Legal Staff takes the opposite approach: it is narrower, aimed at the advocate in court. Orders are read and the next date is proposed for your confirmation, the diary flags clashes, reminders go out on WhatsApp and email, and documents, tasks and invoices sit with the case.',
        'Before you decide, list what your team does every day, ask each vendor to show those exact tasks, and check their current features, pricing and terms directly with them.'
      ]
    },
    note: 'Provakil, ManageMyLawsuits and PracticeLeague are trademarks of their respective owners and are named only as examples of products in this category. This page makes no claims about any named product’s features, pricing or limitations; check each vendor’s current offering on its own website.',
    faqs: [
      { q: 'Is Legal Staff an alternative to Provakil, ManageMyLawsuits or PracticeLeague?', a: 'It can be, depending on your needs. Legal Staff is litigation-first software for advocates and chambers. Compare it with any product you are considering on the tasks your team does every day, and check each vendor’s current offering directly.' },
      { q: 'Does this page compare specific vendors?', a: 'No. It compares Legal Staff with a typical enterprise legal ERP in general terms. Features and pricing of named products change, so check them with each vendor.' },
      { q: 'How long does it take to set up Legal Staff?', a: 'Most chambers can sign in with Google, add their running matters and start using the diary the same day.' },
      { q: 'Can Legal Staff handle a large firm?', a: 'Legal Staff has Firm and Enterprise plans with team roles, task assignment, a hearing board and reports. If you also need contract management or compliance workflows, a broader legal ERP may suit you better.' },
      { q: 'Is my data separate from other firms?', a: 'Yes. Each firm’s data is isolated with row-level security, and documents are kept in private storage.' },
      { q: 'Does Legal Staff have a mobile app?', a: 'It is a web app that works in mobile browsers. There are no native iOS or Android apps.' }
    ],
    related: {
      features: ['chamber-team-collaboration', 'ai-legal-research-workspace', 'case-document-management'],
      tools: ['section-138-ni-act-timeline-calculator'],
      blogs: ['best-practice-management-software-indian-advocates-comparison', 'per-hearing-appearance-billing-retainer-invoicing-indian-advocates', 'client-confidentiality-secure-ai-workspace-vs-chatgpt-law-firms']
    }
  }
];

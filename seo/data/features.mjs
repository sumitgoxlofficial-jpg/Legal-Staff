// Product feature pages at /features/<slug>, rendered by seo/pages/feature.mjs.
// Shape: { slug, icon, navLabel, navHint, title (H1), metaTitle, metaDescription, kicker, lead, chips: [string],
//   problem: { heading, points: [{ title, text }] }, solution: { heading, points: [{ title, text }] },
//   preview: { kind: 'order'|'whatsapp'|'diary'|'research'|'vault'|'board', caption } (the interactive UI preview card),
//   howItWorks: [{ title, text }] (4–6), useCases: [{ who, text }] (3), faqs: [{ q, a }] (6–8),
//   related: { features: [slug], courts: [slug], tools: [slug], compare: [slug], blogs: [slug] } }
// Keep claims inside what the product does today (see the SEO brief): orders are pasted or uploaded and the advocate
// confirms every date; WhatsApp goes through the WhatsApp Business API once connected; research is reference notes plus
// answers from the case's own documents, not a case-law database.
export const features = [
  {
    slug: 'ai-court-order-reader', icon: 'order', navLabel: 'AI court order reader', navHint: 'Reads each order and picks out the next hearing date',
    title: 'AI court order reader that picks out the next hearing date',
    metaTitle: 'AI Court Order Reader for Indian Advocates',
    metaDescription: 'Paste or upload a court order. Legal Staff summarises it with paragraph references and picks out the next hearing date for you to confirm in your diary.',
    kicker: 'AI court order reader',
    lead: 'Paste or upload a daily order. Legal Staff reads it, summarises what was directed with paragraph references and picks out the next date of hearing. Nothing reaches your diary until you confirm it.',
    chips: ['Summaries with paragraph references', 'Next date waits for your confirmation', 'Works on pasted text and uploaded orders'],
    problem: {
      heading: 'Reading every order by hand',
      points: [
        { title: 'Orders arrive in every shape', text: 'PDFs downloaded from court websites, scans of certified copies, text forwarded by a clerk. Each one has to be opened and read end to end.' },
        { title: 'The next date hides in the last paragraph', text: 'A fixed date, “list after four weeks”, “to be listed along with the connected matter” — easy to misread at the end of a long court day.' },
        { title: 'Dates are typed twice', text: 'Every date is copied again into a paper diary or spreadsheet. One transposed digit and a hearing is missed.' }
      ]
    },
    solution: {
      heading: 'Orders read for you, dates confirmed by you',
      points: [
        { title: 'Summary with paragraph references', text: 'What was directed, what compliance is due and by whom, each point tied to the paragraph it came from so you can check it in seconds.' },
        { title: 'Next date picked out, held for approval', text: 'Legal Staff proposes the next hearing date and purpose. You confirm or correct it, and only then does it go into the diary and reminders.' },
        { title: 'Filed against the right case', text: 'The order is saved in the case’s document vault, so the junior or clerk who opens the matter next sees the same order and the same summary.' }
      ]
    },
    preview: { kind: 'order', caption: 'Click “Read order” to see the next-date paragraph picked out and held for your confirmation.' },
    howItWorks: [
      { title: 'Open or create the case', text: 'Add the parties, court and case number. Where a court-data provider is connected, you can import case details using the CNR.' },
      { title: 'Paste or upload the order', text: 'Paste the text of the order or upload the PDF or scan you downloaded or received.' },
      { title: 'Read the summary', text: 'Directions, compliance and the next date are listed with the paragraph each one comes from.' },
      { title: 'Confirm the next date', text: 'Accept the proposed date and purpose, or correct them. The confirmed date goes into the court diary.' },
      { title: 'Let reminders and the team follow', text: 'Reminders are scheduled from the confirmed date, and the matter shows up on the hearing board for whoever is assigned.' }
    ],
    useCases: [
      { who: 'Solo advocates in district courts', text: 'Dozens of short daily orders a week across several courtrooms. Paste each one in the evening and confirm the dates in a few minutes.' },
      { who: 'High Court chambers with juniors', text: 'Juniors upload the orders from the day’s matters; the senior sees a clean summary and approves the dates before they hit the diary.' },
      { who: 'In-house litigation teams', text: 'Matters spread across High Courts, tribunals and district courts, each summarised the same way so status reports take less chasing.' }
    ],
    faqs: [
      { q: 'Does Legal Staff fetch orders automatically from court websites?', a: 'No. eCourts does not offer an open public API, so Legal Staff does not scrape court websites. You paste or upload the order. Where a court-data provider is connected, case details can be imported by CNR. The official court website remains the source of record.' },
      { q: 'Will a date go into my diary without my approval?', a: 'No. Legal Staff proposes the next date and purpose from the order, but nothing reaches the calendar or triggers reminders until an advocate confirms it.' },
      { q: 'What happens when the order has no fixed date?', a: 'Orders such as “list after four weeks” or “to be listed with the connected matter” do not name a date. The summary shows the direction so you can set the date once the listing is published, or add a follow-up task.' },
      { q: 'Which formats can I use?', a: 'You can paste the text of an order or upload a PDF or a scanned copy. Clear scans read better than faint photocopies, and you should always check the summary against the order itself.' },
      { q: 'Can it handle long judgments?', a: 'The summary works with paragraph references, so you can jump to the part that matters. For detailed questions on a long judgment in a case, use the AI Case Brain, which answers from the case’s own documents with citations.' },
      { q: 'Is the summary legal advice?', a: 'No. It is a reading aid. An advocate must review the summary and the proposed date against the order before acting on them.' },
      { q: 'Who can see the orders I upload?', a: 'Only members of your firm, according to the roles you set. Each firm’s data is isolated with row-level security and documents are kept in private storage.' },
      { q: 'Do I still need to check the cause list?', a: 'Yes. Listings can change after an order is passed. Keep checking your court’s cause list for the day; Legal Staff keeps the confirmed date, purpose and reminders organised around it.' }
    ],
    related: {
      features: ['digital-advocate-diary', 'whatsapp-hearing-reminders', 'ai-legal-research-workspace', 'case-document-management'],
      courts: ['delhi-high-court', 'supreme-court-of-india', 'ecourts-district-and-sessions-courts', 'nclt-and-nclat'],
      tools: ['limitation-period-calculator'],
      compare: ['ecourts-app-vs-legal-staff-workspace', 'physical-advocate-diary-vs-legal-staff'],
      blogs: ['how-ai-reads-indian-court-orders-extracts-next-hearing-dates', 'automate-daily-cause-list-next-hearing-date-tracking-india', 'summarize-charge-sheets-arbitral-awards-judgments-ai-india']
    }
  },
  {
    slug: 'whatsapp-hearing-reminders', icon: 'whatsapp', navLabel: 'WhatsApp hearing reminders', navHint: 'Alerts for you, juniors and clients before every date',
    title: 'WhatsApp hearing reminders for advocates, juniors and clients',
    metaTitle: 'WhatsApp Hearing Reminders for Advocates',
    metaDescription: 'Hearing reminders on WhatsApp and email two days before and on the morning of each date, for you and your team, with client updates you choose to share.',
    kicker: 'WhatsApp & email reminders',
    lead: 'Legal Staff reminds you and the team on the matter two days before each hearing and again on the morning of the date. Reminders go on WhatsApp through the WhatsApp Business API once connected, and by email. Client updates are shared when you decide.',
    chips: ['Two days before and on the morning', 'Advocate, junior and client messages', 'Sent from the confirmed hearing date'],
    problem: {
      heading: 'Reminders that depend on memory',
      points: [
        { title: 'The diary is checked late at night', text: 'Tomorrow’s matters are found by flipping pages after a long day, and anything written on the wrong page is simply not seen.' },
        { title: 'Juniors are told by phone', text: 'Who appears where, with which file, is passed on in calls and forwards that are hard to track when plans change.' },
        { title: 'Clients call to ask the next date', text: 'Every “what happened today?” call takes time, and answers given from memory are not always right.' }
      ]
    },
    solution: {
      heading: 'Reminders that follow the confirmed date',
      points: [
        { title: 'Timed to each hearing', text: 'A reminder two days before the hearing and another on the morning of the date, with court, item and purpose where you have recorded them.' },
        { title: 'Each person gets their part', text: 'The advocate sees the day’s matters, the junior assigned to a matter is reminded of it, and nobody has to forward screenshots.' },
        { title: 'Client updates on your terms', text: 'Share a short update with the client after you have confirmed the next date. You decide what goes out and when.' }
      ]
    },
    preview: { kind: 'whatsapp', caption: 'Switch between the advocate, junior and client tabs to see what each person receives.' },
    howItWorks: [
      { title: 'Connect WhatsApp delivery', text: 'Connect your WhatsApp Business API account. Until it is connected, reminders go by email and appear in the daily briefing.' },
      { title: 'Add your team', text: 'Invite juniors and clerks with their roles and contact details, and add client contacts to their matters.' },
      { title: 'Confirm hearing dates', text: 'Dates come from the order reader after you confirm them, or you enter them directly in the diary.' },
      { title: 'Assign who appears', text: 'Assign each hearing to yourself or a junior. Reassign it and the reminders follow the new person.' },
      { title: 'Reminders go out automatically', text: 'Two days before and on the morning of the hearing, without anyone having to remember to send them.' }
    ],
    useCases: [
      { who: 'Advocates with matters in several courts', text: 'A morning message with the day’s matters means the day starts with a list, not a search through the diary.' },
      { who: 'Chambers that rely on juniors and clerks', text: 'Juniors are reminded of the matters assigned to them, including on days the senior is in another court.' },
      { who: 'Practices with many individual clients', text: 'Fewer status calls: share the confirmed next date with the client once the order is in.' }
    ],
    faqs: [
      { q: 'Do I need the WhatsApp Business API?', a: 'Yes, for WhatsApp delivery. Legal Staff sends WhatsApp messages through the WhatsApp Business API once your account is connected. Until then, reminders go by email and show in the daily briefing.' },
      { q: 'When are reminders sent?', a: 'Two days before each hearing and on the morning of the hearing, based on the date confirmed in the diary.' },
      { q: 'Are messages sent from my personal WhatsApp number?', a: 'No. Messages go through the WhatsApp Business API, not from a personal WhatsApp account on your phone.' },
      { q: 'What if the hearing date changes?', a: 'Confirm the new date from the next order or edit it in the diary. Reminders are scheduled from the confirmed date, so they move with it.' },
      { q: 'Can clients receive updates?', a: 'Yes, when you choose. You can share a client update about their own matter, such as the confirmed next date. Clients do not see your other matters.' },
      { q: 'Does WhatsApp messaging cost extra?', a: 'WhatsApp Business API messaging is priced by Meta and the provider you connect through, and their rates change. Check the current rates with your provider, and ask us in a demo how it fits your plan.' },
      { q: 'Can a reminder be wrong?', a: 'A reminder is only as accurate as the date you confirmed. Keep checking your court’s cause list on the day, since listings can change.' }
    ],
    related: {
      features: ['digital-advocate-diary', 'ai-court-order-reader', 'chamber-team-collaboration'],
      courts: ['bombay-high-court', 'madras-high-court', 'ecourts-district-and-sessions-courts', 'consumer-courts-ncdrc-scdrc'],
      tools: ['section-138-ni-act-timeline-calculator'],
      compare: ['physical-advocate-diary-vs-legal-staff'],
      blogs: ['automated-whatsapp-court-hearing-reminders-advocates-clients', 'automated-client-case-status-court-order-updates-on-whatsapp', 'managing-junior-advocates-court-clerks-daily-board-task-software']
    }
  },
  {
    slug: 'digital-advocate-diary', icon: 'calendar', navLabel: 'Digital advocate diary', navHint: 'Cloud court diary across every court',
    title: 'Digital advocate diary for every court you appear in',
    metaTitle: 'Digital Advocate Diary and Court Calendar',
    metaDescription: 'A cloud court diary for Indian advocates: week and day views across all your courts, clash alerts, reassign to a junior, .ics export and a morning briefing.',
    kicker: 'Digital advocate diary',
    lead: 'One calendar for the Supreme Court, High Courts, district courts and tribunals. See the week at a glance, catch two hearings at the same time before the day arrives, hand one to a junior and start each morning with a briefing.',
    chips: ['Week and day views across courts', 'Clash detection for each advocate', 'Export to any calendar as .ics'],
    problem: {
      heading: 'One paper diary, many courts',
      points: [
        { title: 'Clashes are found on the day', text: 'Two matters at 10:30 in different buildings are noticed only when you are standing in one of them.' },
        { title: 'The diary lives in one bag', text: 'Juniors and clerks cannot see it, so every change has to be relayed by phone.' },
        { title: 'Next year’s diary means rewriting', text: 'Carrying forward dates into a new diary every January is slow, and things fall through the gap.' }
      ]
    },
    solution: {
      heading: 'A shared diary that warns you early',
      points: [
        { title: 'All courts on one calendar', text: 'Week and day views show every matter with court, item and purpose, whichever forum it is in.' },
        { title: 'Clash detection', text: 'When one advocate has two hearings at the same time, the diary flags it so you can reassign one to a junior in a click.' },
        { title: 'Briefing every morning', text: 'A daily briefing lists the day’s hearings and what is due, and the diary exports as an .ics file for other calendar apps.' }
      ]
    },
    preview: { kind: 'diary', caption: 'A clash is flagged on Wednesday. Click “Assign to junior” to resolve it.' },
    howItWorks: [
      { title: 'Add your cases', text: 'Create cases with court and case number, or import case details by CNR where a court-data provider is connected.' },
      { title: 'Confirm dates from orders', text: 'The order reader proposes each next date; confirmed dates land in the diary with their purpose.' },
      { title: 'Check the week', text: 'Use the week view to plan appearances across courts and spot clashes before the day.' },
      { title: 'Reassign when needed', text: 'Move a hearing to a junior; the diary, the hearing board and the reminders update together.' },
      { title: 'Start the day with the briefing', text: 'Read the morning briefing, or export the diary as .ics to see it alongside your other calendars.' }
    ],
    useCases: [
      { who: 'Advocates moving from a paper diary', text: 'Keep the habit of a daily list without rewriting dates, carrying diaries or losing pages.' },
      { who: 'Chambers covering several courts a day', text: 'See which advocate is where, catch clashes early and spread the day’s matters across the team.' },
      { who: 'Firms with partners and associates', text: 'Each person sees their own diary, and the firm sees everyone’s hearings in one place.' }
    ],
    faqs: [
      { q: 'Does the diary pull cause lists automatically?', a: 'No. Legal Staff does not scrape cause lists. Dates come from orders you confirm or entries you make. Keep checking your court’s cause list on the day, since listings can change.' },
      { q: 'What counts as a clash?', a: 'Two hearings at the same time for the same advocate. The diary flags them so you can reassign one or plan around it.' },
      { q: 'Can I see the diary in Google Calendar or Outlook?', a: 'You can export the diary as an .ics file, which calendar apps such as Google Calendar and Outlook can import.' },
      { q: 'Is there a mobile app?', a: 'Legal Staff is a web app. There are no native iOS or Android apps, but it works in mobile browsers on your phone.' },
      { q: 'Can my juniors see my diary?', a: 'Team members see hearings according to their roles and the matters they work on, so a junior can see what is assigned to them.' },
      { q: 'What is in the morning briefing?', a: 'The day’s hearings with court and purpose where recorded, along with what is due, so the day starts with a single list.' },
      { q: 'Can I move my existing diary over?', a: 'Yes. Add your running matters and their next dates; after that, each new order keeps the diary up to date once you confirm the date.' }
    ],
    related: {
      features: ['ai-court-order-reader', 'whatsapp-hearing-reminders', 'chamber-team-collaboration'],
      courts: ['supreme-court-of-india', 'allahabad-high-court', 'punjab-and-haryana-high-court', 'ecourts-district-and-sessions-courts'],
      tools: ['limitation-period-calculator'],
      compare: ['physical-advocate-diary-vs-legal-staff', 'ecourts-app-vs-legal-staff-workspace'],
      blogs: ['switch-from-physical-advocate-diary-to-cloud-case-workspace', 'track-cases-district-court-high-court-nclt-single-dashboard', 'automate-daily-cause-list-next-hearing-date-tracking-india']
    }
  },
  {
    slug: 'ai-legal-research-workspace', icon: 'search', navLabel: 'AI legal research workspace', navHint: 'Research and summaries that cite their sources',
    title: 'AI legal research workspace that cites its sources',
    metaTitle: 'AI Legal Research Workspace for Advocates',
    metaDescription: 'Ask questions of a case’s own orders and documents and get answers with citations, plus searchable reference notes on provisions. Reviewed by you, always.',
    kicker: 'AI Case Brain & legal research',
    lead: 'Ask the AI Case Brain a question about a matter and it answers only from that case’s orders and documents, with citations you can open. Search reference notes on statutory provisions alongside. It never invents case law, and every answer is for an advocate to review.',
    chips: ['Answers from the case’s own documents', 'Every answer cites its source', 'Hearing-brief drafts for review'],
    problem: {
      heading: 'Research that is hard to trust',
      points: [
        { title: 'General chatbots invent authorities', text: 'Tools that answer from the open internet can produce citations that do not exist, and checking them takes longer than the research.' },
        { title: 'The answer is in the file somewhere', text: 'What was conceded in the reply, when the stay was extended, which annexure has the agreement — buried across hundreds of pages.' },
        { title: 'Hearing prep starts from zero', text: 'Every listing means re-reading the file to build a brief for the day.' }
      ]
    },
    solution: {
      heading: 'Answers you can check in one click',
      points: [
        { title: 'Grounded in the case file', text: 'The AI Case Brain reads the matter’s own orders and documents and answers from them, with citations back to the page or paragraph.' },
        { title: 'Reference notes on provisions', text: 'Searchable notes on statutory provisions for a quick refresher. They are notes, not a case-law database.' },
        { title: 'Hearing-brief drafts', text: 'A first draft of the brief for the next hearing, built from the file, for you to edit and approve.' }
      ]
    },
    preview: { kind: 'research', caption: 'Pick a question, then open a citation to see the passage the answer relies on.' },
    howItWorks: [
      { title: 'Keep the file in the case', text: 'Orders, pleadings and annexures uploaded to the case vault are what the Case Brain reads.' },
      { title: 'Ask a question', text: 'Ask in plain English: “When was the interim order last extended?” or “What did the respondent say about delay?”' },
      { title: 'Open the citations', text: 'Each answer cites the document and paragraph it relies on, so you can read the original passage.' },
      { title: 'Look up a provision', text: 'Search the reference notes for a quick note on a section, then check the bare Act.' },
      { title: 'Draft the hearing brief', text: 'Generate a draft brief for the next date, then edit and approve it before the hearing.' }
    ],
    useCases: [
      { who: 'Advocates taking over a running matter', text: 'Get up to speed on a file you did not draft by asking questions of it, with every answer pointing to the page.' },
      { who: 'Seniors preparing for a listing', text: 'Ask a junior to generate a hearing-brief draft from the file, then review it with the citations open.' },
      { who: 'Teams handling large records', text: 'Find the passage in a long paper book without paging through every volume.' }
    ],
    faqs: [
      { q: 'Is this a case-law database?', a: 'No. The AI Case Brain answers from your case’s own documents, and the research section holds reference notes on provisions. Use a case-law database or official reports for precedents.' },
      { q: 'Can the AI make up judgments or citations?', a: 'It is built to answer only from the documents in the case and to cite them; it does not invent case law. Always open the citation and check the original before relying on an answer.' },
      { q: 'What if the answer is not in the file?', a: 'The Case Brain only uses the case’s documents, so if they do not cover a point, research it in the bare Act, reports or a case-law database.' },
      { q: 'Can I file or cite AI output directly?', a: 'No. Treat it as a draft or a pointer. Cite the original order, pleading or authority after you have read it, and have an advocate review anything that goes to court.' },
      { q: 'Does it cover BNS, BNSS and BSA?', a: 'The reference notes cover statutory provisions, and the free IPC to BNS converter maps old sections to new ones. The new codes have been in force since 1 July 2024; always check the bare Act for the exact text.' },
      { q: 'Is my case file shared with other firms?', a: 'No. Each firm’s data is isolated with row-level security, and documents are kept in private storage visible only to your team according to their roles.' },
      { q: 'What does a hearing-brief draft contain?', a: 'A summary of the matter and recent orders drawn from the case documents, with references, for you to edit. It is a starting point, not a finished brief.' }
    ],
    related: {
      features: ['ai-court-order-reader', 'case-document-management', 'chamber-team-collaboration'],
      courts: ['supreme-court-of-india', 'delhi-high-court', 'karnataka-high-court', 'nclt-and-nclat'],
      tools: ['bns-ipc-crpc-bnss-converter', 'limitation-period-calculator'],
      compare: ['legacy-legal-erp-vs-legal-staff'],
      blogs: ['ai-legal-research-supreme-court-high-court-without-hallucinations', 'client-confidentiality-secure-ai-workspace-vs-chatgpt-law-firms', 'drafting-written-statements-bail-applications-faster-ai-workspace']
    }
  },
  {
    slug: 'case-document-management', icon: 'folder', navLabel: 'Case document management', navHint: 'Petitions, annexures, order sheets and vakalatnamas',
    title: 'Case document management for pleadings, orders and vakalatnamas',
    metaTitle: 'Case Document Management for Law Chambers',
    metaDescription: 'A private document vault for every case: petitions, annexures, order sheets, vakalatnamas and certified copies, with exhibit marks and drafts in one place.',
    kicker: 'Documents & evidence',
    lead: 'Every case gets its own vault for pleadings, orders, annexures, vakalatnamas and certified copies. Mark exhibits, keep drafts from the Drafting Studio next to the filed versions, and find the right paper without opening five WhatsApp chats.',
    chips: ['One vault per case', 'Exhibit marks on evidence', 'Private storage, firm-only access'],
    problem: {
      heading: 'Files scattered across bags, inboxes and chats',
      points: [
        { title: 'The paper book is in the other office', text: 'The physical file is wherever it was last used, and the soft copy is in someone’s email.' },
        { title: 'Which version was filed?', text: 'Drafts, corrected drafts and the filed copy all look alike once they are forwarded around.' },
        { title: 'Vakalatnamas and certified copies go missing', text: 'Small documents that matter on the day are the easiest to misplace.' }
      ]
    },
    solution: {
      heading: 'One vault per case, organised the way courts work',
      points: [
        { title: 'Folders that match the file', text: 'Petitions and pleadings, annexures, order sheets, vakalatnama and certified copies, each in its place inside the case.' },
        { title: 'Evidence with exhibit marks', text: 'Record exhibit marks against evidence so the team refers to the same document the same way.' },
        { title: 'Drafts beside filed copies', text: 'Drafting Studio templates, versions and DOCX/PDF exports live with the case, next to what was actually filed.' }
      ]
    },
    preview: { kind: 'vault', caption: 'Click a folder to filter the case file.' },
    howItWorks: [
      { title: 'Open the case', text: 'Every case has its own document vault from the moment it is created.' },
      { title: 'Upload what you have', text: 'Add petitions, replies, annexures, orders, vakalatnamas and certified copies to the right folder.' },
      { title: 'Mark the evidence', text: 'Record exhibit marks against evidence as the matter proceeds.' },
      { title: 'Draft in place', text: 'Start from a Drafting Studio template, keep versions and export to DOCX or PDF.' },
      { title: 'Share selectively', text: 'Share chosen documents with the client through the client portal; everything else stays inside the firm.' }
    ],
    useCases: [
      { who: 'Advocates who work from several places', text: 'Chamber, court and home: the case file is the same everywhere you sign in.' },
      { who: 'Chambers with clerks handling filings', text: 'Clerks upload the filed copies and certified copies; the advocate sees them in the case at once.' },
      { who: 'Firms with document-heavy matters', text: 'Commercial suits, company petitions and appeals with long records stay organised by folder and exhibit.' }
    ],
    faqs: [
      { q: 'What can I store in a case vault?', a: 'Pleadings, orders, annexures, vakalatnamas, certified copies and evidence, in common formats such as PDF, Word documents and images.' },
      { q: 'Who can see the documents?', a: 'Only members of your firm, according to their roles. Each firm’s data is isolated with row-level security, and storage is private.' },
      { q: 'Can I share documents with a client?', a: 'Yes. You can share selected documents through the client portal. Nothing is shared unless you choose it.' },
      { q: 'Does it replace certified copies?', a: 'No. A scan in the vault is for reference and preparation; courts and authorities still need certified copies where the rules require them.' },
      { q: 'Can I draft documents here?', a: 'Yes. The Drafting Studio has templates such as legal notice, section 138 notice, bail application, petition, written statement, reply, appeal, revision, affidavit and agreement, with versions and DOCX/PDF export.' },
      { q: 'Can the AI read the documents in the vault?', a: 'Yes. The AI Case Brain answers questions from the case’s documents with citations, for an advocate to review.' }
    ],
    related: {
      features: ['ai-legal-research-workspace', 'ai-court-order-reader', 'chamber-team-collaboration'],
      courts: ['calcutta-high-court', 'gujarat-high-court', 'drt-debt-recovery-tribunal', 'rera-tribunals'],
      tools: ['section-138-ni-act-timeline-calculator'],
      compare: ['legacy-legal-erp-vs-legal-staff'],
      blogs: ['organize-vakalatnama-certified-copies-order-sheets-cloud-workspace', 'client-confidentiality-secure-ai-workspace-vs-chatgpt-law-firms', 'drafting-written-statements-bail-applications-faster-ai-workspace']
    }
  },
  {
    slug: 'chamber-team-collaboration', icon: 'users', navLabel: 'Chamber team collaboration', navHint: 'Tasks and hearing board for juniors and clerks',
    title: 'Chamber team collaboration for advocates, juniors and clerks',
    metaTitle: 'Chamber Team and Task Management for Advocates',
    metaDescription: 'Run your chamber in one place: roles for juniors and clerks, tasks with due dates, a daily hearing board, client records and per-matter invoices with GST.',
    kicker: 'Chamber management',
    lead: 'Give every junior and clerk a role, assign tasks with due dates and run the day from a shared hearing board. Keep client records, share updates through the client portal and raise per-matter invoices with GST.',
    chips: ['Roles for juniors and clerks', 'Daily hearing board with tasks', 'Per-matter invoices with GST'],
    problem: {
      heading: 'A chamber run on calls and memory',
      points: [
        { title: 'Who is doing what?', text: 'Inspection, filing, certified copies, drafting — tasks are handed out verbally and checked by phone.' },
        { title: 'The morning scramble', text: 'Which matters are listed, who is appearing and which files go to court are sorted out at the last minute.' },
        { title: 'Billing comes last', text: 'Appearances and work done are reconstructed from memory at month-end, so invoices go out late.' }
      ]
    },
    solution: {
      heading: 'One board for the whole chamber',
      points: [
        { title: 'Roles and task assignment', text: 'Invite members with roles, assign tasks with due dates against a matter, and see what is open and overdue.' },
        { title: 'Hearing board for the day', text: 'Today’s matters with court, item, who is appearing and the tasks that must be done before the matter is called.' },
        { title: 'Clients and invoices', text: 'A client CRM, client portal sharing, per-matter invoices with GST and reports on the chamber’s work.' }
      ]
    },
    preview: { kind: 'board', caption: 'Tick tasks on today’s hearing board to see the chamber’s progress update.' },
    howItWorks: [
      { title: 'Invite your team', text: 'Add juniors, associates and clerks with roles that fit what they do.' },
      { title: 'Assign tasks to matters', text: 'Create tasks such as filing, inspection or drafting with a due date and an owner.' },
      { title: 'Run the day from the board', text: 'The hearing board shows today’s matters, who is appearing and which tasks are still open.' },
      { title: 'Keep clients informed', text: 'Store client details and share selected updates and documents through the client portal.' },
      { title: 'Invoice per matter', text: 'Raise invoices with GST against each matter and review reports on the chamber’s workload.' }
    ],
    useCases: [
      { who: 'Senior advocates with a team of juniors', text: 'Spread appearances, see who is where and know what is pending without a round of calls.' },
      { who: 'Litigation firms with several partners', text: 'One place for every partner’s matters, tasks and billing, with roles keeping access appropriate.' },
      { who: 'Chambers that bill per appearance or per matter', text: 'Invoices tied to the matter make month-end billing faster and easier to explain to clients.' }
    ],
    faqs: [
      { q: 'Can I control what each team member sees?', a: 'Yes. Members join with roles, and roles decide what they can see and do in the firm’s workspace.' },
      { q: 'What is the hearing board?', a: 'A daily view of the matters listed today, with court, item, the person appearing and the tasks still open for each matter.' },
      { q: 'Can juniors use it on their phones?', a: 'Yes, in a mobile browser. Legal Staff is a web app and has no native iOS or Android apps.' },
      { q: 'Does it handle GST invoices?', a: 'Yes. You can raise per-matter invoices with GST. Check the GST treatment that applies to your practice with your tax adviser.' },
      { q: 'Can clients log in?', a: 'You can share selected updates and documents with clients through the client portal. They see only what you share about their matters.' },
      { q: 'Which plan do I need for a team?', a: 'Legal Staff has Solo, Professional, Firm and Enterprise plans. See the pricing section for what each plan includes, or book a demo to talk it through.' }
    ],
    related: {
      features: ['digital-advocate-diary', 'whatsapp-hearing-reminders', 'case-document-management'],
      courts: ['delhi-high-court', 'bombay-high-court', 'patna-high-court', 'jharkhand-high-court'],
      tools: ['limitation-period-calculator', 'section-138-ni-act-timeline-calculator'],
      compare: ['legacy-legal-erp-vs-legal-staff', 'physical-advocate-diary-vs-legal-staff'],
      blogs: ['managing-junior-advocates-court-clerks-daily-board-task-software', 'per-hearing-appearance-billing-retainer-invoicing-indian-advocates', 'best-practice-management-software-indian-advocates-comparison']
    }
  }
];

// Court and tribunal pages at /courts/<slug>, rendered by seo/pages/court.mjs.
// Shape: { slug, name, short, type: 'supreme'|'high'|'district'|'tribunal'|'consumer', seat, benches: [string],
//   title (H1), metaTitle, metaDescription, lead, intro: [string] (2–3 paragraphs, unique to the forum),
//   orderFormat: { heading, points: [string] } (how orders/cause lists from this forum look and what Legal Staff picks out: next date, bench/court number, item number, purpose),
//   workflow: [{ title, text }] (5–6 steps for this forum), listingNotes: [string] (forum-specific practice points: e.g. mentioning, supplementary lists, e-filing portal by general name),
//   faqs: [{ q, a }] (5), related: { courts: [slug], cities: [slug], features: [slug], tools: [slug], blogs: [slug] } }
// Optional extras used by court.mjs:
//   sources: [string] — official sources of record, by general name (Legal Staff does not replace them)
//   sample: { doc, lines: [string], fields: [[label, value]], note } — the order-line mock-up. Wrap the parts Legal Staff extracts in [[…]].
//     Use generic placeholders only (no real case numbers, parties or judges).
// Keep slug/name/short unchanged: the header, footer and other templates read them.

const FEAT = {
  orders: 'ai-court-order-reader', wa: 'whatsapp-hearing-reminders', diary: 'digital-advocate-diary',
  research: 'ai-legal-research-workspace', docs: 'case-document-management', team: 'chamber-team-collaboration'
};
const TOOL = { conv: 'bns-ipc-crpc-bnss-converter', lim: 'limitation-period-calculator', s138: 'section-138-ni-act-timeline-calculator' };

export const courts = [
  /* ------------------------------------------------------------ Supreme Court */
  {
    slug: 'supreme-court-of-india', name: 'Supreme Court of India', short: 'Supreme Court', type: 'supreme',
    seat: 'New Delhi', benches: [],
    title: 'Supreme Court of India: case tracking and hearing diary for advocates',
    metaTitle: 'Supreme Court Case Tracking & Hearing Diary',
    metaDescription: 'Track Supreme Court of India matters: read records of proceedings, turn "list after four weeks" into a confirmed diary date and remind your team on WhatsApp.',
    lead: 'Records of proceedings, relative listing directions and miscellaneous-day boards, organised into one diary that your Advocate-on-Record, briefing counsel and juniors can all trust.',
    sources: ['Supreme Court of India website (cause lists, case status, records of proceedings)', 'Supreme Court e-filing portal', 'National Judicial Data Grid (NJDG) for aggregate data'],
    intro: [
      'Supreme Court work is shaped by two things a High Court practice rarely deals with: the Advocate-on-Record system, and listing directions that are relative rather than fixed. An order may simply say "List after four weeks" or "Issue notice, returnable in six weeks", and the actual date only appears when the matter shows up in an advance or daily list. A diary that only stores fixed dates misses that gap.',
      'Legal Staff treats each record of proceedings as the source of the next step. It reads the item number, court number and the direction, works out an indicative date where the order gives a period, and marks it clearly as indicative until you confirm it against the official list. Your AoR, the arguing counsel who briefed you from a High Court, and the junior who watches the board all see the same entry.',
      'Because many Supreme Court matters arrive from High Court practices, the same workspace keeps the impugned High Court order, the SLP paper-book and the counter-affidavit timeline together, so the chamber does not keep two diaries for one dispute.'
    ],
    orderFormat: {
      heading: 'Records of proceedings: item, court, section and a direction that is often relative',
      points: [
        'The header of a record of proceedings typically carries the item number, the court number and the registry section, followed by the case title and the coram.',
        'The operative direction is often relative ("List after four weeks", "Tag with…", "Issue notice returnable in six weeks") rather than a calendar date. Legal Staff computes an indicative date from the order date and labels it as such.',
        'Where a fixed date is given, it becomes a proposed hearing with the court number and item number attached, waiting for your confirmation.',
        'Interim directions (stay, status quo, "no coercive steps") are summarised with a paragraph reference so the brief for the next hearing starts from the order itself.'
      ]
    },
    sample: {
      doc: 'Record of proceedings (sample)',
      lines: ['[[ITEM NO. 14]]   [[COURT NO. 5]]   SECTION ___', 'SPECIAL LEAVE PETITION (C) No. ____ / 20__', '[Petitioner] … Petitioner(s)  VERSUS  [Respondent] … Respondent(s)', 'Issue notice. [[List after four weeks.]] Interim stay of the impugned order till the next date.'],
      fields: [['Court', 'Court No. 5'], ['Item', '14'], ['Direction', 'List after four weeks'], ['Indicative date', 'Order date + 4 weeks (to confirm)'], ['Interim', 'Stay till next date']],
      note: 'Relative directions become an indicative date only. Nothing reaches the diary until you confirm it against the advance or daily list.'
    },
    workflow: [
      { title: 'Open the matter with the AoR on record', text: 'Create the case with the diary number or registration number, the AoR, the instructing counsel and the High Court order under challenge. Upload the SLP paper-book to the case vault.' },
      { title: 'Upload or paste each record of proceedings', text: 'Legal Staff reads the item number, court number and direction, and summarises any interim relief with a paragraph reference.' },
      { title: 'Confirm the date, or hold an indicative one', text: 'Fixed dates are proposed for confirmation. Relative directions sit as an indicative date flagged "check advance list", so nobody mistakes them for a fixed listing.' },
      { title: 'Watch for clashes with High Court boards', text: 'If the same advocate is shown in Court No. 5 at the Supreme Court and in a High Court the same morning, the diary flags the clash so you can assign a junior or seek a pass-over in time.' },
      { title: 'Remind the AoR, counsel and client', text: 'WhatsApp and email reminders go two days before and on the morning of the hearing, with the court number and item number in the message.' },
      { title: 'Prepare the hearing brief', text: 'AI Case Brain drafts a brief from the case\'s own orders and pleadings, with citations to those documents, for counsel to review before the hearing.' }
    ],
    listingNotes: [
      'Only an Advocate-on-Record can file and act in the Supreme Court, so the AoR is a separate field from arguing counsel in Legal Staff. Reminders can go to both.',
      'Miscellaneous matters and regular hearing matters are listed on different days of the week; the exact pattern is notified by the Registry and changes, so treat the official cause list as the record.',
      'Advance lists, daily lists and supplementary lists are published on the court\'s website. Legal Staff does not scrape them; you confirm dates against them.',
      'Mentioning for urgent listing follows the procedure notified by the Registry from time to time. Keep the mentioning request and its outcome as a note on the case.',
      'During the summer recess the court sits in partial working days with limited benches; set your own reminder to re-check listings when regular benches resume.'
    ],
    faqs: [
      { q: 'Can Legal Staff tell me the exact date when an order says "List after four weeks"?', a: 'No tool can know the exact date until the Registry lists the matter. Legal Staff calculates an indicative date from the order date, marks it as indicative, and reminds you to check the advance and daily lists. You confirm the real date once it appears.' },
      { q: 'Does Legal Staff pull Supreme Court cause lists automatically?', a: 'No. The Supreme Court website is the source of record for cause lists and case status. You upload or paste the record of proceedings, and Legal Staff reads it and proposes the next step for your confirmation.' },
      { q: 'How do I track a matter where I am arguing counsel but not the AoR?', a: 'Add the AoR and yourself as separate people on the case. Both can receive reminders, and the diary shows who is appearing so a clash with your own High Court board is flagged.' },
      { q: 'Can I keep the High Court record with the SLP?', a: 'Yes. The case vault holds the impugned order, the High Court pleadings, the SLP paper-book and the counter, so AI Case Brain can answer questions from the full record with citations.' },
      { q: 'Is Legal Staff connected to the Supreme Court e-filing portal?', a: 'No. Filing is done on the court\'s own e-filing portal. Legal Staff keeps your drafts, versions and filed copies in the case vault and tracks what happens after filing.' }
    ],
    related: { courts: ['delhi-high-court', 'bombay-high-court', 'punjab-and-haryana-high-court'], cities: ['delhi'], features: [FEAT.orders, FEAT.diary, FEAT.wa, FEAT.research], tools: [TOOL.lim, TOOL.conv], blogs: ['how-ai-reads-indian-court-orders-extracts-next-hearing-dates', 'ai-legal-research-supreme-court-high-court-without-hallucinations', 'section-12-limitation-act-excluding-certified-copy-days-calculation'] }
  },

  /* ------------------------------------------------------------ Delhi HC */
  {
    slug: 'delhi-high-court', name: 'Delhi High Court', short: 'Delhi HC', type: 'high',
    seat: 'New Delhi', benches: [],
    title: 'Delhi High Court: order reading and court diary for advocates',
    metaTitle: 'Delhi High Court Case Diary & Order Tracking',
    metaDescription: 'For Delhi High Court practice: read orders, track "renotify" and Joint Registrar dates, organise court and item numbers, and send WhatsApp hearing reminders.',
    lead: 'Writs, commercial suits on the original side, Joint Registrar listings and roster benches: one diary that keeps each Delhi High Court date, court number and item number straight.',
    sources: ['Delhi High Court website (cause lists, case status, orders and judgments)', 'Delhi High Court e-filing portal', 'eCourts services and NJDG for the Delhi district courts'],
    intro: [
      'The Delhi High Court has ordinary original civil jurisdiction over suits above a statutory pecuniary limit, so a single chamber can be running commercial suits on the original side, writ petitions, first appeals and criminal matters at the same time. Each of these generates dates before different fora inside the same building: the bench itself, the Joint Registrar for completion of pleadings and admission or denial of documents, and sometimes a Local Commissioner recording evidence.',
      'Those dates are easy to lose because they do not all appear in the same cause list. Legal Staff reads each order, picks out whether the next date is before the court, the Joint Registrar or a Local Commissioner, and keeps the court number and item number with it. A "Renotify on…" direction becomes a proposed date that you confirm.',
      'For chambers that also appear in the Delhi district courts, the same calendar holds those dates too, so a Joint Registrar listing at the High Court and an evidence date in a district court complex the same morning are shown as a clash.'
    ],
    orderFormat: {
      heading: 'Delhi High Court orders: roster bench, item number and "renotify" directions',
      points: [
        'Orders usually open with the case number and the coram, and end with a direction such as "List on…", "Renotify on…" or "List before the Joint Registrar on…".',
        'Legal Staff separates dates before the bench from dates before the Joint Registrar or a Local Commissioner, because they appear in different lists.',
        'Court number and item number are taken from the cause list entry you paste or upload, and stored on the hearing so juniors know where to stand.',
        'On the original side, timelines for written statements and replication are tracked as tasks; for commercial suits the Order VIII Rule 1 CPC outer limit of 120 days is applied, with each step shown for your approval.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['W.P.(C) ____/20__ & CM APPL. ____/20__', '[Petitioner] v. [Respondent]', 'Counter affidavit be filed within four weeks; rejoinder within two weeks thereafter.', '[[Renotify on 18.03.2027.]]'],
      fields: [['Forum', 'Bench (roster court)'], ['Next date', '18 Mar 2027 (to confirm)'], ['Purpose', 'Renotified after pleadings'], ['Tasks', 'Counter: 4 weeks · Rejoinder: +2 weeks']],
      note: 'Pleading timelines become tasks with due dates. The hearing waits for your confirmation.'
    },
    workflow: [
      { title: 'Add the matter and its side', text: 'Record whether the case is on the original side, a writ, an appeal or criminal, with the case number and the parties. Add the advance cause list entry if you have it.' },
      { title: 'Read the order', text: 'Upload or paste the order. Legal Staff summarises it with paragraph references and proposes the next date, marking whether it is before the bench, the Joint Registrar or a Local Commissioner.' },
      { title: 'Confirm and file in the diary', text: 'Once you confirm, the hearing appears in the day and week view with the court number and item number from the cause list.' },
      { title: 'Turn directions into tasks', text: 'Directions to file a counter, reply or rejoinder become tasks with due dates assigned to a junior, so pleading deadlines are not lost between hearings.' },
      { title: 'Clash check across Delhi courts', text: 'If the same advocate has a Joint Registrar date and a district court evidence date at the same time, the diary flags it so someone else can take one.' },
      { title: 'Morning reminder on WhatsApp', text: 'The advocate and team receive the court number, item number and purpose on the morning of the hearing, plus a reminder two days earlier.' }
    ],
    listingNotes: [
      'The court has ordinary original civil jurisdiction above a pecuniary limit fixed by statute (raised to ₹2 crore by a 2015 amendment); check the current limit before filing.',
      'Matters on the original side often go before the Joint Registrar for completion of pleadings and admission/denial of documents before they reach the bench. Track those dates separately.',
      'Benches change with the roster. The court number on today\'s cause list is the one that matters; Legal Staff stores it per hearing rather than per case.',
      'Fresh matters, regular matters and supplementary lists are published on the court\'s website; the cause list there is the record.',
      'Urgent mentioning follows the court\'s current notices. Note the outcome against the case so the team sees it.'
    ],
    faqs: [
      { q: 'Can Legal Staff tell a Joint Registrar date from a bench date?', a: 'Yes, where the order says so. Legal Staff reads whether the matter is listed before the court, the Joint Registrar or a Local Commissioner and labels the proposed date accordingly. You confirm it before it enters the diary.' },
      { q: 'Does it work for commercial suits on the original side?', a: 'Yes. Written statement, replication and admission/denial steps are tracked as tasks. For commercial suits the 120-day outer limit under Order VIII Rule 1 CPC is applied, and every step is shown for your approval.' },
      { q: 'Will it fetch the Delhi High Court cause list for me?', a: 'No. The court\'s website is the source of record. You paste or upload the cause list entry or the order, and Legal Staff organises the court and item numbers in your diary.' },
      { q: 'Can my clerk see tomorrow\'s board for all Delhi courts?', a: 'Yes. The hearing board shows every confirmed hearing across the High Court and the district courts, with who is appearing and the court and item numbers.' },
      { q: 'Can I import a Delhi district court case by CNR?', a: 'Where a court-data provider is connected to your account, you can import a district court case by its CNR. Otherwise add it manually; eCourts remains the source of record.' }
    ],
    related: { courts: ['supreme-court-of-india', 'ecourts-district-and-sessions-courts', 'nclt-and-nclat', 'consumer-courts-ncdrc-scdrc'], cities: ['delhi'], features: [FEAT.orders, FEAT.diary, FEAT.team, FEAT.docs], tools: [TOOL.lim, TOOL.s138], blogs: ['cpc-order-8-rule-1-written-statement-120-days-commercial-courts', 'automate-daily-cause-list-next-hearing-date-tracking-india', 'managing-junior-advocates-court-clerks-daily-board-task-software'] }
  },

  /* ------------------------------------------------------------ Bombay HC */
  {
    slug: 'bombay-high-court', name: 'Bombay High Court', short: 'Bombay HC', type: 'high',
    seat: 'Mumbai', benches: ['Nagpur', 'Aurangabad (Chhatrapati Sambhajinagar)', 'Goa', 'Kolhapur (circuit bench)'],
    title: 'Bombay High Court: board tracking and court diary for advocates',
    metaTitle: 'Bombay High Court Board Tracking & Court Diary',
    metaDescription: 'For Bombay High Court practice in Mumbai, Nagpur, Aurangabad, Goa and Kolhapur: read orders, track "stand over" dates and send WhatsApp hearing reminders.',
    lead: 'Original side and appellate side, the principal seat and the benches: Legal Staff turns each "stand over" and "place on board" into a confirmed date with the right bench, court room and item number.',
    sources: ['Bombay High Court website (boards / cause lists, case status, orders)', 'Bombay High Court e-filing portal', 'eCourts services for Maharashtra and Goa district courts'],
    intro: [
      'The Bombay High Court sits at Mumbai, with benches at Nagpur, Aurangabad and Goa and a circuit bench at Kolhapur. A Pune or Kolhapur practice may have matters in Mumbai and at the circuit bench in the same week, and a Nagpur chamber may still have an original side suit in Mumbai. Recording the bench with each date is not optional.',
      'Bombay practice has its own vocabulary. The cause list is "the board"; a matter is "stood over" to a date; a praecipe is used to mention; the original side has its own officers, including the Prothonotary and Senior Master. Legal Staff reads these terms as they appear in orders, so "S.O. to 2 weeks" or "Stand over to…" becomes a proposed next date rather than a line someone has to decode.',
      'Once confirmed, the date sits in the diary with the bench, court room and item number, and the WhatsApp reminder says which building to go to, which matters when a junior is new to the benches.'
    ],
    orderFormat: {
      heading: 'Bombay High Court orders: "stand over", "place on board" and the bench',
      points: [
        'Orders commonly end with "Stand over to…", "S.O. to … weeks", "Place on board on…" or "Not on board". Legal Staff reads each as a direction and proposes a date where one is given or can be calculated.',
        'The bench (Mumbai, Nagpur, Aurangabad, Goa or Kolhapur) is stored with each hearing, so one case can move between principal seat and bench without confusion.',
        'Original side matters often carry directions about chamber orders, notices of motion or interim applications; these are summarised with paragraph references.',
        'Court room and item number come from the board entry you paste or upload and are shown on the day view and in reminders.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['IN THE HIGH COURT OF JUDICATURE AT BOMBAY', 'WRIT PETITION NO. ____ OF 20__', '[Petitioner] … Petitioner  v.  [Respondent] … Respondents', 'Reply be filed within three weeks. [[Stand over to 09.02.2027.]] [[Place on board]] at the top of the list.'],
      fields: [['Bench', 'Mumbai (principal seat)'], ['Next date', '9 Feb 2027 (to confirm)'], ['Direction', 'Stand over · Place on board'], ['Task', 'Reply within 3 weeks']],
      note: 'If the board gives a court room and item number, add it and it appears on the day view and in reminders.'
    },
    workflow: [
      { title: 'Record the bench and side', text: 'Add the case with its bench (Mumbai, Nagpur, Aurangabad, Goa or Kolhapur) and whether it is on the original or appellate side.' },
      { title: 'Paste the order or the board entry', text: 'Legal Staff reads "stand over", "S.O." and "place on board" directions and proposes the next date, with the court room and item number where available.' },
      { title: 'Confirm before it enters the diary', text: 'You check the proposed date against the board on the official website and confirm. Relative directions stay indicative until then.' },
      { title: 'Flag bench clashes', text: 'A matter at the Kolhapur circuit bench and another in Mumbai on the same morning are flagged, giving you time to brief a colleague or a junior.' },
      { title: 'Track original side steps', text: 'Directions on affidavits, notices of motion and chamber orders become tasks with due dates for the team.' },
      { title: 'Send reminders that name the bench', text: 'WhatsApp reminders include the bench, court room and item number so nobody turns up at the wrong building.' }
    ],
    listingNotes: [
      'The principal seat is at Mumbai, with benches at Nagpur, Aurangabad and Goa and a circuit bench at Kolhapur. Store the bench with every hearing.',
      'The original side in Mumbai has its own procedure and officers; matters may be listed before the Prothonotary and Senior Master or in chambers before reaching court.',
      'Mentioning is commonly done on a praecipe in the form the court currently prescribes; check the court\'s notices for the present practice.',
      'Boards are published on the court\'s website and may be supplemented during the day; the board on the website is the record.',
      'Maharashtra and Goa district court matters can be tracked in the same diary; import by CNR works where a court-data provider is connected.'
    ],
    faqs: [
      { q: 'Does Legal Staff understand "stand over" and "S.O."?', a: 'Yes. It reads these directions as they appear in Bombay High Court orders and proposes the next date, or an indicative date when the order gives a period. You confirm the date before it enters the diary.' },
      { q: 'Can I track matters at Nagpur, Aurangabad, Goa and Kolhapur together?', a: 'Yes. Each hearing carries its bench, so a chamber with matters at the principal seat and at a bench sees them in one calendar, with clashes flagged.' },
      { q: 'Does it fetch the Bombay High Court board automatically?', a: 'No. The board on the court\'s website is the source of record. Paste or upload the board entry or order and Legal Staff organises the court room and item number for you.' },
      { q: 'Can it help with original side timelines?', a: 'It tracks directions in orders as tasks with due dates and shows written statement timelines under Order VIII Rule 1 CPC for your approval. Check the Bombay High Court (Original Side) Rules for any rule-specific steps.' },
      { q: 'Will a junior get the reminder in Marathi?', a: 'Reminders are sent in English today. They include the case title, bench, court room, item number and purpose.' }
    ],
    related: { courts: ['supreme-court-of-india', 'nclt-and-nclat', 'drt-debt-recovery-tribunal', 'rera-tribunals'], cities: ['mumbai', 'nagpur', 'pune'], features: [FEAT.orders, FEAT.diary, FEAT.wa, FEAT.team], tools: [TOOL.lim, TOOL.s138], blogs: ['automate-daily-cause-list-next-hearing-date-tracking-india', 'track-cases-district-court-high-court-nclt-single-dashboard', 'automated-whatsapp-court-hearing-reminders-advocates-clients'] }
  },

  /* ------------------------------------------------------------ Calcutta HC */
  {
    slug: 'calcutta-high-court', name: 'Calcutta High Court', short: 'Calcutta HC', type: 'high',
    seat: 'Kolkata', benches: ['Port Blair (circuit bench)', 'Jalpaiguri (circuit bench)'],
    title: 'Calcutta High Court: order tracking and diary for advocates',
    metaTitle: 'Calcutta High Court Order Tracking & Diary',
    metaDescription: 'For Calcutta High Court practice on the original and appellate sides and at the Port Blair and Jalpaiguri circuit benches: read orders and remind your team.',
    lead: 'Separate original side and appellate side lists, circuit benches far from Kolkata and matters that move between them: one diary keeps the side, bench and next date together.',
    sources: ['Calcutta High Court website (daily lists, case status, orders)', 'eCourts services for West Bengal and Andaman & Nicobar district courts', 'NJDG'],
    intro: [
      'The Calcutta High Court is the oldest High Court in the country and still runs distinct original side and appellate side lists. Its jurisdiction covers West Bengal and the Andaman and Nicobar Islands, with circuit benches at Port Blair and Jalpaiguri. A Kolkata chamber can have a company or commercial matter on the original side, a writ on the appellate side and an appeal heard at Jalpaiguri, each with its own list.',
      'Legal Staff stores the side and the bench with every hearing. When you upload an order, it reads the direction (for example, that the matter will appear in the list on a given date, or under a particular heading) and proposes the next date for confirmation, with the court and item number from the list entry you add.',
      'Circuit bench work also tends to be planned around travel. Putting Jalpaiguri or Port Blair dates in the same calendar as the Kolkata lists makes it clear, weeks in advance, when the senior is away and who covers the Kolkata matters.'
    ],
    orderFormat: {
      heading: 'Calcutta High Court orders: side, heading and the next appearance',
      points: [
        'Orders often direct that a matter "appear in the list" on a date or under a specific heading; Legal Staff reads the date and the heading and proposes both.',
        'The side (original or appellate) and the bench (Kolkata, Port Blair or Jalpaiguri) are stored with each hearing, because they come from different lists.',
        'Liberty to mention, leave to file supplementary affidavits and time to file reports become notes or tasks with due dates.',
        'Court and item numbers are taken from the daily list entry you paste or upload.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['[[APPELLATE SIDE]]', 'WPA ____ of 20__  ·  [Petitioner] v. [State and others]', 'Affidavit-in-opposition within three weeks; reply within a week thereafter.', '[[Let the matter appear in the list on 22.02.2027]] under the heading "[[Hearing]]".'],
      fields: [['Side', 'Appellate side'], ['Bench', 'Kolkata'], ['Next date', '22 Feb 2027 (to confirm)'], ['Heading', 'Hearing'], ['Tasks', 'AO: 3 weeks · Reply: +1 week']],
      note: 'The heading is kept with the date so your clerk knows which part of the list to watch.'
    },
    workflow: [
      { title: 'Add the case with its side and bench', text: 'Record whether it is an original side or appellate side matter, and whether it is at Kolkata, Port Blair or Jalpaiguri.' },
      { title: 'Upload the order', text: 'Legal Staff summarises it, notes any heading under which the matter is to appear, and proposes the next date.' },
      { title: 'Confirm against the daily list', text: 'Check the proposed date and the court and item number on the official list, then confirm. Nothing enters the diary before that.' },
      { title: 'Plan circuit bench weeks', text: 'Circuit bench dates appear alongside Kolkata matters, so the clash view shows which Kolkata hearings need cover while you travel.' },
      { title: 'Assign and remind', text: 'Reassign a hearing to a junior in one step. The junior and the client get WhatsApp reminders two days before and on the morning.' }
    ],
    listingNotes: [
      'Original side and appellate side lists are published separately; store the side with each hearing.',
      'Circuit benches sit at Port Blair and Jalpaiguri. Their listings are part of the court\'s published lists; confirm dates there.',
      'Matters often appear under specific headings in the daily list. Keep the heading with the date so the team watches the right part of the list.',
      'Mentioning and urgent listing follow the court\'s current notices and the roster; note the outcome on the case.',
      'District court matters in West Bengal and the Andaman and Nicobar Islands can sit in the same diary; eCourts remains the source of record.'
    ],
    faqs: [
      { q: 'Can Legal Staff keep original side and appellate side matters apart?', a: 'Yes. Each hearing carries the side and the bench, and the diary can be filtered by them, so the clerk watching the original side list sees only those matters.' },
      { q: 'Does it support the Jalpaiguri and Port Blair circuit benches?', a: 'Yes, as benches you assign to a hearing. Dates are read from the orders you upload and confirmed by you against the court\'s lists.' },
      { q: 'Will it read "appear in the list under the heading…"?', a: 'Yes. It proposes the date and stores the heading with it. If the order gives no date, the item is kept as a note for you to follow up.' },
      { q: 'Does it download Calcutta High Court lists?', a: 'No. The court\'s website is the source of record. You paste or upload the order or the list entry; Legal Staff organises it.' },
      { q: 'Can clients get updates?', a: 'Yes. After you confirm a date, you can share a client update by WhatsApp or through the client portal.' }
    ],
    related: { courts: ['supreme-court-of-india', 'nclt-and-nclat', 'drt-debt-recovery-tribunal'], cities: ['kolkata'], features: [FEAT.orders, FEAT.diary, FEAT.team, FEAT.wa], tools: [TOOL.lim, TOOL.conv], blogs: ['track-cases-district-court-high-court-nclt-single-dashboard', 'automated-client-case-status-court-order-updates-on-whatsapp', 'how-ai-reads-indian-court-orders-extracts-next-hearing-dates'] }
  },

  /* ------------------------------------------------------------ Madras HC */
  {
    slug: 'madras-high-court', name: 'Madras High Court', short: 'Madras HC', type: 'high',
    seat: 'Chennai', benches: ['Madurai'],
    title: 'Madras High Court: Chennai and Madurai bench case diary',
    metaTitle: 'Madras High Court & Madurai Bench Case Diary',
    metaDescription: 'For Madras High Court practice at Chennai and the Madurai Bench: read orders, track "post" and "list" directions and send hearing reminders on WhatsApp.',
    lead: 'Chennai principal seat and the Madurai Bench, original side and writ side: Legal Staff reads each order, proposes the next date and keeps the bench and item number on the hearing.',
    sources: ['Madras High Court website (cause lists for Chennai and Madurai, case status, orders)', 'eCourts services for Tamil Nadu and Puducherry district courts', 'NJDG'],
    intro: [
      'The Madras High Court has its principal seat in Chennai and a bench at Madurai, and its jurisdiction covers Tamil Nadu and Puducherry. The two seats publish their own cause lists, and the southern districts generally look to the Madurai Bench. A chamber in Chennai with clients in the south can have matters in both places on consecutive days.',
      'Orders frequently direct that a matter be "posted" or "listed" after a period or on a date. Legal Staff reads that direction, calculates an indicative date where the order gives a period, and keeps the bench (Chennai or Madurai) with the hearing. You confirm it against the published list.',
      'The Chennai seat also exercises original side jurisdiction, so commercial and testamentary work can run alongside writs and criminal original petitions. Directions about counters, typed sets and reports are turned into tasks so juniors know what is due before the next posting.'
    ],
    orderFormat: {
      heading: 'Madras High Court orders: "post", "list" and the seat',
      points: [
        'Directions such as "Post after two weeks", "List on…" or "Call on…" are read as the next step. A period gives an indicative date; a date gives a proposed one.',
        'The seat (Chennai or Madurai Bench) is stored with each hearing, because the cause lists are separate.',
        'Directions to file counters, typed sets or status reports are captured as tasks with due dates.',
        'Court hall number and item number are taken from the cause list entry you add.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['[[BEFORE THE MADURAI BENCH]] OF MADRAS HIGH COURT', 'W.P.(MD) No. ____ of 20__', '[Petitioner] v. [Respondents]', 'Respondents to file counter. [[Post after two weeks.]]'],
      fields: [['Seat', 'Madurai Bench'], ['Direction', 'Post after two weeks'], ['Indicative date', 'Order date + 2 weeks (to confirm)'], ['Task', 'Counter by respondents']],
      note: 'Indicative dates are labelled as such and never reach the calendar without your confirmation.'
    },
    workflow: [
      { title: 'Create the case at the right seat', text: 'Choose Chennai or Madurai Bench, original side or writ side, and add the parties and case number.' },
      { title: 'Upload the order', text: 'Legal Staff reads "post", "list" and "call" directions, summarises the order with paragraph references and proposes the next date.' },
      { title: 'Confirm against the cause list', text: 'Check the court hall and item number on the official list for that seat, then confirm.' },
      { title: 'Follow up on counters and typed sets', text: 'Directions become tasks with due dates for the junior who handles filing.' },
      { title: 'See Chennai and Madurai together', text: 'The diary shows both seats, so a Madurai hearing and a Chennai hearing on the same morning are flagged as a clash.' },
      { title: 'Remind the team and client', text: 'WhatsApp and email reminders carry the seat, court hall and item number.' }
    ],
    listingNotes: [
      'The principal seat is at Chennai; the Madurai Bench hears matters from the southern districts. Their cause lists are published separately.',
      'Original side jurisdiction is exercised at the Chennai seat; track original side applications and their timelines separately from writ matters.',
      'The court\'s jurisdiction extends to Puducherry; district court matters there can sit in the same diary.',
      'Cause lists and any additional lists are published on the court\'s website, which remains the record.',
      'Mentioning practice follows the court\'s current notices and the portfolio of each bench.'
    ],
    faqs: [
      { q: 'Does Legal Staff handle the Madurai Bench separately?', a: 'Yes. Each hearing records the seat. You can filter the diary by Chennai or Madurai, and reminders name the seat.' },
      { q: 'What happens when an order says "Post after two weeks"?', a: 'Legal Staff calculates an indicative date two weeks from the order date and labels it as indicative. When the matter appears in the cause list, you confirm the actual date.' },
      { q: 'Can I track Puducherry matters?', a: 'Yes. Add Puducherry district court cases to the same workspace; import by CNR works where a court-data provider is connected.' },
      { q: 'Does it fetch the Madras High Court cause list?', a: 'No. The court\'s website is the source of record. You paste or upload the order or the list entry.' },
      { q: 'Can AI Case Brain answer from the typed set?', a: 'Yes. Upload the typed set and pleadings to the case vault, and AI Case Brain answers only from those documents, with citations, for an advocate to review.' }
    ],
    related: { courts: ['supreme-court-of-india', 'karnataka-high-court', 'nclt-and-nclat'], cities: ['chennai'], features: [FEAT.orders, FEAT.diary, FEAT.wa, FEAT.docs], tools: [TOOL.lim, TOOL.conv], blogs: ['how-ai-reads-indian-court-orders-extracts-next-hearing-dates', 'organize-vakalatnama-certified-copies-order-sheets-cloud-workspace', 'automated-whatsapp-court-hearing-reminders-advocates-clients'] }
  },

  /* ------------------------------------------------------------ Karnataka HC */
  {
    slug: 'karnataka-high-court', name: 'Karnataka High Court', short: 'Karnataka HC', type: 'high',
    seat: 'Bengaluru', benches: ['Dharwad', 'Kalaburagi'],
    title: 'Karnataka High Court: Bengaluru, Dharwad and Kalaburagi case diary',
    metaTitle: 'Karnataka High Court Case Diary for Advocates',
    metaDescription: 'For Karnataka High Court practice at Bengaluru and the Dharwad and Kalaburagi benches: read orders, confirm next dates and send WhatsApp hearing reminders.',
    lead: 'Three seats, many case types and a heavy writ and criminal petition docket: one diary that keeps each Karnataka High Court date with its bench, court hall and item number.',
    sources: ['Karnataka High Court website (cause lists for each bench, case status, orders)', 'eCourts services for Karnataka district courts', 'NJDG'],
    intro: [
      'The Karnataka High Court sits at Bengaluru, with permanent benches at Dharwad and Kalaburagi. Matters from the northern districts are generally heard at the benches, so a Bengaluru firm with clients across the state may have hearings in three cities in the same fortnight.',
      'Legal Staff stores the bench with every hearing and reads each order for the next date and its purpose. Where an order says "List after…" or "Call on…", it proposes a date for you to check against the published cause list. Court hall and item number come from the list entry you add.',
      'Bengaluru practices often combine High Court work with commercial courts, the NCLT Bengaluru bench and consumer commissions. Keeping all of them in one calendar means a clash between the High Court and a tribunal shows up the day the second date is confirmed, not on the morning itself.'
    ],
    orderFormat: {
      heading: 'Karnataka High Court orders: bench, court hall and the next step',
      points: [
        'The bench (Bengaluru, Dharwad or Kalaburagi) is stored with every hearing, because each publishes its own cause list.',
        'Directions such as "List after…", "Call on…" or "List for orders" become a proposed or indicative date with the purpose noted.',
        'Directions to file statements of objections or compliance reports are captured as tasks.',
        'Court hall and item number are taken from the cause list entry and shown on the day view.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['IN THE HIGH COURT OF KARNATAKA, [[DHARWAD BENCH]]', 'WRIT PETITION NO. ____ OF 20__', '[Petitioner] v. [Respondents]', 'Statement of objections to be filed. [[List on 03.03.2027]] [[for hearing]].'],
      fields: [['Bench', 'Dharwad'], ['Next date', '3 Mar 2027 (to confirm)'], ['Purpose', 'Hearing'], ['Task', 'Statement of objections']],
      note: 'You confirm the date and add the court hall and item number from the cause list.'
    },
    workflow: [
      { title: 'Choose the bench', text: 'Create the case at Bengaluru, Dharwad or Kalaburagi with the case type and parties.' },
      { title: 'Upload each order', text: 'Legal Staff summarises it, proposes the next date and purpose, and lists any directions as tasks.' },
      { title: 'Confirm against the cause list', text: 'Check the court hall and item number on the bench\'s published list and confirm the hearing.' },
      { title: 'Spot clashes with tribunals', text: 'A High Court hearing and an NCLT or consumer commission date at the same time are flagged in the diary.' },
      { title: 'Send reminders', text: 'The advocate, junior and client receive WhatsApp reminders two days before and on the morning, naming the bench.' }
    ],
    listingNotes: [
      'The High Court sits at Bengaluru with permanent benches at Dharwad and Kalaburagi; cause lists are published for each.',
      'Bench allocation follows the court\'s territorial arrangements; check the court\'s notifications when you are unsure where a matter lies.',
      'Daily and supplementary cause lists are published on the court\'s website, which remains the record.',
      'Karnataka district court cases can be tracked in the same diary; import by CNR works where a court-data provider is connected.'
    ],
    faqs: [
      { q: 'Can I see Bengaluru, Dharwad and Kalaburagi hearings in one view?', a: 'Yes. Every hearing carries its bench, and the week view shows all of them with clashes flagged.' },
      { q: 'Does Legal Staff read Kannada orders?', a: 'Order reading is designed around English orders, which is the usual language of High Court orders. For other languages, add the next date manually and keep the order in the case vault.' },
      { q: 'Does it pull the Karnataka High Court cause list?', a: 'No. The court\'s website is the source of record. You paste or upload the order or the list entry and confirm the date.' },
      { q: 'How are statement-of-objections deadlines tracked?', a: 'Directions in the order become tasks with due dates assigned to a team member, visible on the hearing board.' },
      { q: 'Is this useful for a solo advocate at Dharwad?', a: 'Yes. The Solo plan covers the diary, order reading and reminders; you can add a junior or clerk later.' }
    ],
    related: { courts: ['madras-high-court', 'nclt-and-nclat', 'consumer-courts-ncdrc-scdrc', 'rera-tribunals'], cities: ['bengaluru'], features: [FEAT.orders, FEAT.diary, FEAT.wa, FEAT.team], tools: [TOOL.lim, TOOL.s138], blogs: ['track-cases-district-court-high-court-nclt-single-dashboard', 'switch-from-physical-advocate-diary-to-cloud-case-workspace', 'how-ai-reads-indian-court-orders-extracts-next-hearing-dates'] }
  },

  /* ------------------------------------------------------------ Allahabad HC */
  {
    slug: 'allahabad-high-court', name: 'Allahabad High Court', short: 'Allahabad HC', type: 'high',
    seat: 'Prayagraj', benches: ['Lucknow'],
    title: 'Allahabad High Court: Prayagraj and Lucknow bench case diary',
    metaTitle: 'Allahabad High Court & Lucknow Bench Case Diary',
    metaDescription: 'For Allahabad High Court practice at Prayagraj and the Lucknow Bench: read orders, track bail and writ dates, organise court numbers, send WhatsApp reminders.',
    lead: 'High-volume bail, writ and criminal revision dockets at Prayagraj and Lucknow: Legal Staff reads each order\'s court number and next date so your diary keeps up.',
    sources: ['Allahabad High Court website (cause lists for Prayagraj and Lucknow, case status, orders)', 'eCourts services for Uttar Pradesh district courts', 'NJDG'],
    intro: [
      'The Allahabad High Court sits at Prayagraj, with a bench at Lucknow, and handles one of the largest dockets in the country. Practices here often run dozens of bail applications, writs and criminal revisions at once, across fresh lists, daily lists and additional lists. The challenge is volume: knowing which of forty matters is listed tomorrow, in which court number, and for what.',
      'Allahabad orders usually begin with a header block that states the court number, the case, the parties and counsel before the order itself. Legal Staff reads that block and the operative direction ("List on…", "Put up on…", "List in the next cause list", "Connect with…") and proposes the next date with the court number already attached.',
      'For chambers that also handle trial court work in Uttar Pradesh, district court dates can sit in the same diary, so a bail hearing at the High Court and an evidence date in the sessions court are seen together.'
    ],
    orderFormat: {
      heading: 'Allahabad High Court orders: the header block and the operative direction',
      points: [
        'Orders typically open with "Court No.", the case type and number, the parties and counsel, followed by the bench. Legal Staff reads the court number from this block.',
        'Directions such as "List on…", "Put up on…", "List in the next cause list" or "Connect with…" become a proposed date or a note to watch the next list.',
        'Bail orders and interim protection are summarised with paragraph references, including any conditions the client must comply with.',
        'The seat (Prayagraj or Lucknow) is stored with every hearing, because the cause lists are separate.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['[[Court No. - 64]]', 'Case :- CRIMINAL MISC. BAIL APPLICATION No. - ____ of 20__', 'Applicant :- [Applicant]   Opposite Party :- [State of U.P.]', 'Counsel for Applicant :- [Counsel]', 'Learned AGA seeks time to obtain instructions. [[List on 11.01.2027]] [[in the top ten cases]].'],
      fields: [['Seat', 'Prayagraj'], ['Court', 'Court No. 64'], ['Next date', '11 Jan 2027 (to confirm)'], ['Purpose', 'Bail hearing, top ten cases'], ['Note', 'State seeks time for instructions']],
      note: 'The court number comes from the order header; the item number is added from the cause list on the day.'
    },
    workflow: [
      { title: 'Add matters in bulk', text: 'Create bail applications, writs and revisions with case numbers and parties, at Prayagraj or Lucknow. Import by CNR is available for district court matters where a court-data provider is connected.' },
      { title: 'Upload orders as they come', text: 'Legal Staff reads the header block for the court number and the operative direction for the next date and purpose.' },
      { title: 'Confirm from the cause list', text: 'Check the fresh, daily or additional list on the court\'s website and confirm the date and item number.' },
      { title: 'Run tomorrow\'s board', text: 'The hearing board lists every matter for tomorrow by seat, court number and item number, with who is appearing.' },
      { title: 'Reassign when courts clash', text: 'When two of your matters are called in different court numbers at once, reassign one to a junior in a single step.' },
      { title: 'Update clients after the hearing', text: 'Share the outcome and next date with the client on WhatsApp once you have confirmed it.' }
    ],
    listingNotes: [
      'The principal seat is at Prayagraj and the bench at Lucknow; each publishes its own cause lists.',
      'Fresh matters, daily cause lists and additional or supplementary lists are published on the court\'s website, which is the record.',
      'Orders directing a matter to be connected with another case or listed "in the next cause list" give no fixed date; Legal Staff keeps a note to watch the list rather than inventing one.',
      'Bail conditions in an order can be summarised and shared with the client, so compliance is not missed.',
      'Uttar Pradesh district court matters can be tracked alongside; eCourts remains the source of record for them.'
    ],
    faqs: [
      { q: 'Can Legal Staff read the Allahabad High Court order header?', a: 'Yes. It reads the court number, the case, the parties and counsel from the header block and proposes the next date from the operative direction, for your confirmation.' },
      { q: 'What if the order says "List in the next cause list"?', a: 'There is no fixed date, so Legal Staff does not invent one. It adds a note to watch the next list and reminds you to confirm the date once the matter appears.' },
      { q: 'Does it separate Prayagraj and Lucknow matters?', a: 'Yes. Every hearing carries its seat, and the diary and reminders show it.' },
      { q: 'Can my clerk see all of tomorrow\'s bail matters?', a: 'Yes. The hearing board can be filtered by case type, seat and advocate, and shows the court number and item number for each confirmed hearing.' },
      { q: 'Does it fetch cause lists from the High Court website?', a: 'No. The court\'s website is the source of record. You upload or paste orders and list entries.' }
    ],
    related: { courts: ['supreme-court-of-india', 'ecourts-district-and-sessions-courts', 'nclt-and-nclat', 'drt-debt-recovery-tribunal'], cities: ['prayagraj', 'lucknow'], features: [FEAT.orders, FEAT.diary, FEAT.team, FEAT.wa], tools: [TOOL.conv, TOOL.lim], blogs: ['automate-daily-cause-list-next-hearing-date-tracking-india', 'managing-junior-advocates-court-clerks-daily-board-task-software', 'ipc-to-bns-crpc-to-bnss-bsa-section-conversion-chart-advocates'] }
  },

  /* ------------------------------------------------------------ Patna HC */
  {
    slug: 'patna-high-court', name: 'Patna High Court', short: 'Patna HC', type: 'high',
    seat: 'Patna', benches: [],
    title: 'Patna High Court: order sheet tracking and diary for advocates',
    metaTitle: 'Patna High Court Order Tracking & Diary',
    metaDescription: 'For Patna High Court practice: read numbered order sheets, track bail, writ and appeal dates, and send WhatsApp hearing reminders to your juniors and clients.',
    lead: 'Numbered order sheets, heavy criminal and service dockets, and district work across Bihar: Legal Staff keeps each Patna High Court date, purpose and item number straight.',
    sources: ['Patna High Court website (cause lists, case status, orders)', 'eCourts services for Bihar district courts', 'NJDG'],
    intro: [
      'The Patna High Court sits at Patna and has no separate benches, so the challenge is less about geography and more about volume and continuity: bail applications, criminal appeals, service writs and land matters can stay on the docket for years, with order after order on the same case.',
      'Orders are generally recorded as a running sequence, each entry dated and numbered. Legal Staff reads the latest entry, picks out the next date and purpose, and keeps a summary of every earlier entry with paragraph references, so a junior can see in a minute what happened at the last five hearings.',
      'Many Patna chambers also handle sessions trials and civil suits across Bihar. Those dates sit in the same diary, and import by CNR works for district court cases where a court-data provider is connected.'
    ],
    orderFormat: {
      heading: 'Patna High Court orders: a running, numbered order sheet',
      points: [
        'Each entry in the order sheet is usually numbered and dated. Legal Staff reads the latest entry and keeps the history summarised.',
        'Directions to list after a period, to call for a case diary or report, or to list for admission or hearing become a proposed date with the purpose.',
        'Requests for time by the State, and the period granted, are noted so the next hearing brief starts with them.',
        'Court number and item number come from the cause list entry you add.'
      ]
    },
    sample: {
      doc: 'Order sheet (sample)',
      lines: ['IN THE HIGH COURT OF JUDICATURE AT PATNA', 'CRIMINAL MISCELLANEOUS No. ____ of 20__', '[[Order No. 04]]   Dated: __.__.20__', 'Learned APP seeks time to obtain the case diary. [[List after three weeks]].'],
      fields: [['Order', 'No. 04'], ['Direction', 'List after three weeks'], ['Indicative date', 'Order date + 3 weeks (to confirm)'], ['Pending', 'Case diary from the State']],
      note: 'Earlier order entries stay summarised in the case timeline for the next hearing brief.'
    },
    workflow: [
      { title: 'Create the case', text: 'Add the case type, number and parties, and upload earlier orders to build the case timeline.' },
      { title: 'Read the latest order entry', text: 'Legal Staff reads the newest numbered entry, proposes the next date and purpose, and summarises it.' },
      { title: 'Confirm and add the item number', text: 'Check the cause list on the court\'s website, confirm the date and add the court and item number.' },
      { title: 'Track what the other side owes', text: 'Pending case diaries, counters and reports become notes or tasks, so you can press for them at the next hearing.' },
      { title: 'Remind and report', text: 'WhatsApp reminders go to the advocate and juniors; after the hearing, share the outcome with the client.' }
    ],
    listingNotes: [
      'The Patna High Court sits only at Patna; there are no separate benches to track.',
      'Cause lists, including any supplementary lists, are published on the court\'s website, which remains the record.',
      'Order sheets accumulate over long-running matters; keeping each one in the case vault lets AI Case Brain answer "what did the court last say about the case diary?" with a citation.',
      'For criminal matters registered after 1 July 2024, sections will be under the BNS and BNSS; use the converter to cross-check older FIRs.'
    ],
    faqs: [
      { q: 'Can Legal Staff read a long order sheet with many entries?', a: 'Yes. It reads the latest entry for the next date and keeps a summary of earlier entries with references, so the case timeline is complete.' },
      { q: 'Does it pull Patna High Court cause lists?', a: 'No. The court\'s website is the source of record. You paste or upload the order or the list entry, and confirm the date.' },
      { q: 'Can I track Bihar district court cases too?', a: 'Yes. Add them to the same workspace. Import by CNR works where a court-data provider is connected; otherwise add the case manually.' },
      { q: 'How does it help with old IPC and CrPC sections?', a: 'The free converter maps IPC to BNS, CrPC to BNSS and the Evidence Act to the BSA both ways. Always check the bare Act before relying on a mapping.' },
      { q: 'Can the client get the next date on WhatsApp?', a: 'Yes, once you confirm it. Client updates are shared by you, not sent automatically from an unconfirmed order.' }
    ],
    related: { courts: ['jharkhand-high-court', 'ecourts-district-and-sessions-courts', 'supreme-court-of-india'], cities: ['patna'], features: [FEAT.orders, FEAT.diary, FEAT.wa, FEAT.docs], tools: [TOOL.conv, TOOL.lim], blogs: ['ipc-to-bns-crpc-to-bnss-bsa-section-conversion-chart-advocates', 'organize-vakalatnama-certified-copies-order-sheets-cloud-workspace', 'automated-client-case-status-court-order-updates-on-whatsapp'] }
  },

  /* ------------------------------------------------------------ Jharkhand HC */
  {
    slug: 'jharkhand-high-court', name: 'Jharkhand High Court', short: 'Jharkhand HC', type: 'high',
    seat: 'Ranchi', benches: [],
    title: 'Jharkhand High Court: case diary for Ranchi, Bokaro and Dhanbad advocates',
    metaTitle: 'Jharkhand High Court Case Diary for Advocates',
    metaDescription: 'For Jharkhand High Court practice at Ranchi: read orders, track next dates across the High Court and district courts, and send WhatsApp hearing reminders.',
    lead: 'A Ranchi High Court docket with clients and trial courts spread across Dhanbad, Bokaro and the rest of the state: one diary for both, with clashes flagged.',
    sources: ['Jharkhand High Court website (cause lists, case status, orders)', 'eCourts services for Jharkhand district courts', 'NJDG'],
    intro: [
      'The Jharkhand High Court sits at Ranchi and was constituted in 2000, when the state was carved out of Bihar. Advocates from Dhanbad, Bokaro and Jamshedpur regularly travel to Ranchi for High Court work while keeping a district court practice at home. The diary has to show both, and it has to show when a Ranchi listing collides with a sessions trial a few hours away.',
      'Legal Staff reads each High Court order for the next date, the purpose and any directions, and proposes them for confirmation. District court dates sit in the same calendar, and where a court-data provider is connected you can import those cases by CNR.',
      'Mining, labour, service and criminal matters dominate many Jharkhand dockets. Whatever the subject, the workflow is the same: the order is read, the date is confirmed, the junior is assigned, and the reminder goes out.'
    ],
    orderFormat: {
      heading: 'Jharkhand High Court orders: the next date and what is pending',
      points: [
        'Orders end with a listing direction (a date, or a period such as "after four weeks"), which Legal Staff proposes as a date or an indicative date.',
        'Directions to the State to file a counter affidavit or a report are captured as pending items for the next hearing brief.',
        'Interim protection and its conditions are summarised with paragraph references.',
        'Court number and item number are added from the cause list entry.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['IN THE HIGH COURT OF JHARKHAND AT RANCHI', 'W.P.(S) No. ____ of 20__', '[Petitioner] v. [State of Jharkhand and others]', 'Counter affidavit be filed within four weeks. [[List this case on 25.01.2027]].'],
      fields: [['Seat', 'Ranchi'], ['Next date', '25 Jan 2027 (to confirm)'], ['Pending', 'Counter affidavit (State): 4 weeks'], ['Purpose', 'Further hearing']],
      note: 'A sessions trial date in Dhanbad on the same day would be flagged as a clash.'
    },
    workflow: [
      { title: 'Add High Court and district cases', text: 'Create Ranchi High Court matters and add district court cases from Dhanbad, Bokaro or elsewhere, by CNR where a provider is connected.' },
      { title: 'Upload the High Court order', text: 'Legal Staff summarises it, proposes the next date and lists what each side has to file.' },
      { title: 'Confirm and check travel clashes', text: 'Once confirmed, a Ranchi listing on the same day as a district court date is flagged so you can arrange cover.' },
      { title: 'Assign a junior', text: 'Reassign either hearing to a junior; they get the reminder with the court and item number.' },
      { title: 'Keep the client informed', text: 'Share the next date and a short outcome note with the client on WhatsApp after the hearing.' }
    ],
    listingNotes: [
      'The Jharkhand High Court sits at Ranchi; there are no separate benches.',
      'Cause lists are published on the court\'s website, which remains the record.',
      'Advocates who practise in both the High Court and district courts benefit most from clash detection, because travel time makes same-day listings hard to cover.',
      'For criminal matters registered from 1 July 2024, sections are under the BNS and BNSS; older FIRs keep IPC and CrPC references.'
    ],
    faqs: [
      { q: 'I practise in Dhanbad and Ranchi. Can I see both in one diary?', a: 'Yes. High Court and district court hearings appear together, and same-day clashes are flagged once both dates are confirmed.' },
      { q: 'Does Legal Staff import Jharkhand district court cases?', a: 'Import by CNR works where a court-data provider is connected to your account. Otherwise you add the case manually; eCourts remains the source of record.' },
      { q: 'Does it fetch the Jharkhand High Court cause list?', a: 'No. You paste or upload the order or the cause list entry, and confirm the date.' },
      { q: 'Can I track what the State has to file?', a: 'Yes. Directions to file counters or reports are captured as pending items and appear in the hearing brief.' },
      { q: 'Does it work on a phone?', a: 'Legal Staff is a web app that works in mobile browsers. There is no separate Android or iOS app.' }
    ],
    related: { courts: ['patna-high-court', 'ecourts-district-and-sessions-courts', 'supreme-court-of-india'], cities: ['ranchi', 'bokaro', 'dhanbad'], features: [FEAT.diary, FEAT.orders, FEAT.wa, FEAT.team], tools: [TOOL.conv, TOOL.lim], blogs: ['track-cases-district-court-high-court-nclt-single-dashboard', 'switch-from-physical-advocate-diary-to-cloud-case-workspace', 'automated-whatsapp-court-hearing-reminders-advocates-clients'] }
  },

  /* ------------------------------------------------------------ Gujarat HC */
  {
    slug: 'gujarat-high-court', name: 'Gujarat High Court', short: 'Gujarat HC', type: 'high',
    seat: 'Ahmedabad', benches: [],
    title: 'Gujarat High Court: order reading and court diary for advocates',
    metaTitle: 'Gujarat High Court Order Reading & Court Diary',
    metaDescription: 'For Gujarat High Court practice at Ahmedabad: read orders, track "on board" and next dates, organise court and item numbers, and send WhatsApp reminders.',
    lead: 'Ahmedabad High Court work alongside commercial courts, the NCLT Ahmedabad bench and trial courts across Gujarat: one diary with every date confirmed by you.',
    sources: ['Gujarat High Court website (board / cause lists, case status, orders)', 'eCourts services for Gujarat district courts', 'NJDG'],
    intro: [
      'The Gujarat High Court sits at Ahmedabad with no separate benches. Many advocates there already follow the board and case status on the court\'s website. What is usually missing is the step after that: turning the order into a confirmed date in a diary that the whole chamber shares, with the right reminders going out.',
      'Legal Staff reads each order for the listing direction (a date, a period, or that the matter is to be kept "on board"), proposes the next date and stores the court and item number from the board entry you add. Directions to file affidavits-in-reply or rejoinders become tasks.',
      'Ahmedabad practices often appear before the NCLT Ahmedabad bench, the DRT and the commercial courts as well. Bringing those dates into the same calendar is what makes clash detection useful.'
    ],
    orderFormat: {
      heading: 'Gujarat High Court orders: the board, the next date and the reply timeline',
      points: [
        'Orders commonly end with a direction to list on a date or after a period, or to keep the matter on board; Legal Staff proposes a date or an indicative date accordingly.',
        'Notice returnable dates are read as the next date where the order gives one.',
        'Directions for affidavits-in-reply and rejoinders become tasks with due dates.',
        'Court number and item number come from the board entry you paste or upload.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['IN THE HIGH COURT OF GUJARAT AT AHMEDABAD', 'SPECIAL CIVIL APPLICATION NO. ____ of 20__', '[Petitioner] v. [Respondents]', '[[Notice returnable on 15.02.2027]]. Affidavit-in-reply, if any, before the returnable date.'],
      fields: [['Next date', '15 Feb 2027 (to confirm)'], ['Purpose', 'Notice returnable'], ['Task', 'Watch for affidavit-in-reply before the date']],
      note: 'Returnable dates are proposed as hearings; you confirm once the board is published.'
    },
    workflow: [
      { title: 'Create the case', text: 'Add the case type, number and parties; upload the petition and annexures to the case vault.' },
      { title: 'Upload the order', text: 'Legal Staff reads the returnable or listing date, summarises the order and proposes the next date.' },
      { title: 'Confirm against the board', text: 'Check the board on the court\'s website, confirm the date and add the court and item number.' },
      { title: 'Track replies and rejoinders', text: 'Directions become tasks for the junior responsible, with due dates before the hearing.' },
      { title: 'Combine with tribunal dates', text: 'NCLT, DRT and commercial court dates sit in the same calendar so clashes are visible early.' },
      { title: 'Send reminders', text: 'WhatsApp and email reminders go to the team two days before and on the morning.' }
    ],
    listingNotes: [
      'The Gujarat High Court sits at Ahmedabad; there are no separate benches.',
      'The board and case status are published on the court\'s website, which remains the record.',
      'Notice returnable dates are a frequent next date in fresh matters; confirm when the board is published.',
      'District courts in Gujarat may record proceedings in Gujarati; for orders in other languages, add the next date manually and keep the order in the case vault.'
    ],
    faqs: [
      { q: 'Does Legal Staff read "notice returnable" dates?', a: 'Yes. Where the order gives a returnable date, it is proposed as the next hearing for your confirmation.' },
      { q: 'Can it read Gujarati orders from district courts?', a: 'Order reading is designed around English orders. For orders in Gujarati, add the next date manually and store the order in the case vault.' },
      { q: 'Does it fetch the Gujarat High Court board?', a: 'No. The court\'s website is the source of record. You paste or upload the order or board entry.' },
      { q: 'Can I track NCLT Ahmedabad matters too?', a: 'Yes. NCLT and NCLAT matters sit in the same diary, with IBC timelines tracked as tasks.' },
      { q: 'Can I export my diary to my phone calendar?', a: 'Yes. Confirmed hearings can be exported as an .ics file for your calendar app.' }
    ],
    related: { courts: ['nclt-and-nclat', 'drt-debt-recovery-tribunal', 'ecourts-district-and-sessions-courts'], cities: ['ahmedabad'], features: [FEAT.orders, FEAT.diary, FEAT.wa, FEAT.docs], tools: [TOOL.lim, TOOL.s138], blogs: ['how-ai-reads-indian-court-orders-extracts-next-hearing-dates', 'nclt-ibc-cirp-timeline-tracker-interim-applications-advocates', 'automate-daily-cause-list-next-hearing-date-tracking-india'] }
  },

  /* ------------------------------------------------------------ P&H HC */
  {
    slug: 'punjab-and-haryana-high-court', name: 'Punjab and Haryana High Court', short: 'P&H HC', type: 'high',
    seat: 'Chandigarh', benches: [],
    title: 'Punjab and Haryana High Court: case diary for Chandigarh advocates',
    metaTitle: 'Punjab & Haryana High Court Case Diary',
    metaDescription: 'For Punjab and Haryana High Court practice at Chandigarh: read orders, track CWP, CRM-M and RSA dates, and send WhatsApp hearing reminders to your team.',
    lead: 'One High Court for two states and a Union Territory, with heavy writ, bail and second appeal dockets: Legal Staff keeps each Chandigarh date, court and item number confirmed.',
    sources: ['Punjab and Haryana High Court website (cause lists, case status, orders)', 'eCourts services for Punjab, Haryana and Chandigarh district courts', 'NJDG'],
    intro: [
      'The Punjab and Haryana High Court at Chandigarh is the common High Court for Punjab, Haryana and the Union Territory of Chandigarh. Chambers here often carry large volumes of civil writ petitions (CWP), petitions under the criminal miscellaneous category (CRM-M, which includes bail and quashing petitions) and regular second appeals (RSA).',
      'With that volume, the bottleneck is usually not reading one order but keeping a hundred next dates accurate. Legal Staff reads each order\'s direction ("Adjourned to…", "List on…", "To be shown in the urgent list"), proposes the date, and keeps the case type visible so the board can be sorted by CWP, CRM-M or RSA.',
      'Clients and trial courts are spread across two states. District court dates in Punjab, Haryana and Chandigarh can sit in the same diary, with clashes against High Court listings flagged.'
    ],
    orderFormat: {
      heading: 'Punjab and Haryana High Court orders: case type, adjournment and the next date',
      points: [
        'The case type (CWP, CRM-M, CRR, RSA, FAO and others) is kept with each hearing so the board can be filtered by it.',
        'Directions such as "Adjourned to…", "List on…" or "To be shown in the urgent list" become a proposed date or a note.',
        'Status reports and replies directed from the State are captured as pending items.',
        'Court number and item number come from the cause list entry you add.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['IN THE HIGH COURT OF PUNJAB AND HARYANA AT CHANDIGARH', '[[CRM-M]]-____-20__', '[Petitioner] v. [State of Haryana]', 'Learned State counsel seeks time to file status report. [[Adjourned to 20.01.2027]].'],
      fields: [['Case type', 'CRM-M'], ['Next date', '20 Jan 2027 (to confirm)'], ['Pending', 'Status report (State)'], ['Purpose', 'Further hearing']],
      note: 'Filter the hearing board by case type to prepare all CRM-M matters together.'
    },
    workflow: [
      { title: 'Add cases by type', text: 'Create CWP, CRM-M, RSA and other matters with numbers and parties.' },
      { title: 'Upload orders', text: 'Legal Staff reads the adjournment or listing direction and proposes the next date, noting what the State or the other side owes.' },
      { title: 'Confirm with the cause list', text: 'Check the court\'s website for the court and item number and confirm.' },
      { title: 'Prepare by case type', text: 'Filter tomorrow\'s board by CRM-M or CWP so juniors can prepare similar matters together.' },
      { title: 'Flag district court clashes', text: 'A trial in Punjab or Haryana on the same morning as a Chandigarh listing is flagged.' },
      { title: 'Remind the team and clients', text: 'WhatsApp reminders go two days before and on the morning of each hearing.' }
    ],
    listingNotes: [
      'The court sits at Chandigarh and serves Punjab, Haryana and the UT of Chandigarh; there are no separate benches.',
      'Cause lists, including urgent and supplementary lists, are published on the court\'s website, which remains the record.',
      'Case-type prefixes (CWP, CRM-M, RSA and others) are part of the case number; keep them exactly as registered.',
      'Criminal matters from 1 July 2024 use BNS and BNSS sections; older FIRs keep IPC and CrPC references.'
    ],
    faqs: [
      { q: 'Can I sort my board by CWP, CRM-M and RSA?', a: 'Yes. The case type is stored with each case, and the hearing board can be filtered by it.' },
      { q: 'Does Legal Staff read "Adjourned to…" orders?', a: 'Yes. It proposes the date given and notes any reason recorded, such as the State seeking time. You confirm it before it enters the diary.' },
      { q: 'Does it fetch the High Court cause list?', a: 'No. The court\'s website is the source of record. You paste or upload the order or the list entry.' },
      { q: 'Can I track Haryana and Punjab district court cases?', a: 'Yes. Add them to the same workspace; import by CNR works where a court-data provider is connected.' },
      { q: 'Can juniors see only their own matters?', a: 'Roles and assignments decide what each member works on; the hearing board can be filtered by the advocate appearing.' }
    ],
    related: { courts: ['supreme-court-of-india', 'ecourts-district-and-sessions-courts', 'rera-tribunals', 'nclt-and-nclat'], cities: ['chandigarh', 'shimla'], features: [FEAT.orders, FEAT.diary, FEAT.team, FEAT.wa], tools: [TOOL.conv, TOOL.lim], blogs: ['managing-junior-advocates-court-clerks-daily-board-task-software', 'ipc-to-bns-crpc-to-bnss-bsa-section-conversion-chart-advocates', 'automate-daily-cause-list-next-hearing-date-tracking-india'] }
  },

  /* ------------------------------------------------------------ District courts */
  {
    slug: 'ecourts-district-and-sessions-courts', name: 'District and Sessions Courts (eCourts)', short: 'District courts', type: 'district',
    seat: 'Every district', benches: [],
    title: 'District and sessions courts: CNR tracking and court diary',
    metaTitle: 'District Court Case Tracking by CNR & Court Diary',
    metaDescription: 'Track district and sessions court cases: import by CNR where a provider is connected, read order sheets for next date and stage, and send WhatsApp reminders.',
    lead: 'Daily order sheets, stages like evidence and arguments, and dozens of courts in one complex: Legal Staff turns each district court date into a confirmed, reminded entry.',
    sources: ['eCourts services (portal and app) for case status, cause lists and orders', 'District court websites', 'National Judicial Data Grid (NJDG)'],
    intro: [
      'District and sessions courts are where most litigators spend most of their days, and where most dates are given: often several per case per month. The eCourts system gives every case a 16-character CNR and publishes case status, cause lists and many orders. It is the source of record, and it is excellent for looking a case up. It is not a diary for your chamber.',
      'Legal Staff fills that gap. Where a court-data provider is connected to your account, you can import a case by CNR; otherwise you add it once. Each day\'s order sheet can be pasted or uploaded, and Legal Staff reads the next date, the stage (for example, prosecution evidence, cross-examination or final arguments) and the court in which it is listed.',
      'Because district courts give short dates, clashes are frequent: two courtrooms in the same complex calling your matters at 11, or a civil court and a sessions court in different complexes. The diary flags them as soon as the second date is confirmed.'
    ],
    orderFormat: {
      heading: 'District court order sheets: stage, next date and the court',
      points: [
        'Daily order sheets are short: who appeared, what happened, and a direction such as "Put up for PE on…", "Adjourned for arguments to…" or "For evidence on…". Legal Staff reads the date and the stage.',
        'The court is identified by the judge\'s designation and court number (for example, Civil Judge, Additional Sessions Judge), which is stored with the hearing.',
        'eCourts case status shows the next date and stage; you confirm Legal Staff\'s proposed date against it.',
        'Where orders are in a regional language, add the date manually and keep the order in the case vault.'
      ]
    },
    sample: {
      doc: 'Order sheet (sample)',
      lines: ['IN THE COURT OF [[ADDITIONAL SESSIONS JUDGE-03]], [District]', 'Sessions Case No. ____ / 20__  ·  CNR: ____________', 'PW-2 present, examined and discharged. Remaining PWs be summoned.', '[[Put up for PE on 07.01.2027]].'],
      fields: [['Court', 'Additional Sessions Judge-03'], ['Next date', '7 Jan 2027 (to confirm)'], ['Stage', 'Prosecution evidence'], ['Task', 'Summons for remaining witnesses']],
      note: 'Confirm the date against eCourts case status; the CNR stays on the case for reference.'
    },
    workflow: [
      { title: 'Bring cases in by CNR or manually', text: 'Where a court-data provider is connected, import by CNR. Otherwise add the court, case number and parties once.' },
      { title: 'Paste or upload the order sheet', text: 'Legal Staff reads the next date, the stage and the court, and proposes them for confirmation.' },
      { title: 'Confirm and see the complex at a glance', text: 'The day view groups hearings by court complex and courtroom, so juniors can plan the morning\'s movement.' },
      { title: 'Resolve clashes early', text: 'Two matters called at the same time in different courtrooms are flagged; reassign one to a junior.' },
      { title: 'Morning briefing and reminders', text: 'A daily briefing lists the day\'s matters by court, and WhatsApp reminders go out two days before and on the morning.' },
      { title: 'Keep evidence organised', text: 'Exhibit marks, witness lists and certified copies sit in the case vault, ready for the next stage.' }
    ],
    listingNotes: [
      'Every case on eCourts has a 16-character CNR. Keep it on the case even if you add the case manually; it makes checking status quick.',
      'eCourts services publish case status, cause lists and many orders, and remain the source of record. Legal Staff does not scrape them.',
      'Stages (summons, appearance, framing of charge or issues, evidence, arguments, judgment) matter as much as the date; Legal Staff stores both.',
      'Some district courts record order sheets in the regional language; Legal Staff\'s order reading is designed around English orders.',
      'NJDG offers aggregate data on pendency; it is not a case-level diary.'
    ],
    faqs: [
      { q: 'Can I import a district court case by CNR?', a: 'Yes, where a court-data provider is connected to your account. eCourts has no open public API, so Legal Staff does not claim to fetch every case automatically. Without a provider, you add the case once and then upload orders.' },
      { q: 'Does Legal Staff replace the eCourts app?', a: 'No. eCourts is the official source of case status and cause lists. Legal Staff is your chamber\'s diary and workspace: it reads orders, tracks stages, assigns work and sends reminders.' },
      { q: 'Does it read "Put up for PE" and similar short orders?', a: 'Yes. It reads the date and the stage (for example, prosecution evidence) and proposes both for your confirmation.' },
      { q: 'What about orders in Hindi or another regional language?', a: 'Order reading is designed around English orders. For other languages, add the next date manually and keep the order in the case vault.' },
      { q: 'Can my clerk see every court we are in tomorrow?', a: 'Yes. The hearing board lists tomorrow\'s confirmed hearings by court complex and courtroom, with who is appearing.' }
    ],
    related: { courts: ['delhi-high-court', 'allahabad-high-court', 'patna-high-court', 'consumer-courts-ncdrc-scdrc'], cities: ['delhi', 'jaipur', 'lucknow', 'indore', 'cuttack', 'dhanbad'], features: [FEAT.diary, FEAT.orders, FEAT.wa, FEAT.docs], tools: [TOOL.conv, TOOL.s138, TOOL.lim], blogs: ['ecourts-services-app-vs-ai-practice-management-indian-lawyers', 'automate-daily-cause-list-next-hearing-date-tracking-india', 'section-138-ni-act-cheque-bounce-limitation-calculator-guide'] }
  },

  /* ------------------------------------------------------------ NCLT / NCLAT */
  {
    slug: 'nclt-and-nclat', name: 'NCLT and NCLAT', short: 'NCLT / NCLAT', type: 'tribunal',
    seat: 'NCLT Principal Bench and NCLAT at New Delhi', benches: ['NCLT benches in major cities, including Mumbai, Kolkata, Chennai, Ahmedabad, Bengaluru, Hyderabad and others', 'NCLAT bench at Chennai'],
    title: 'NCLT and NCLAT: IBC and company law case tracking for advocates',
    metaTitle: 'NCLT & NCLAT Case Tracking for IBC Advocates',
    metaDescription: 'Track NCLT and NCLAT matters: read orders on IAs and company petitions, follow CIRP timelines as tasks, flag bench clashes and send WhatsApp hearing reminders.',
    lead: 'Company petitions, a stream of interlocutory applications and statutory CIRP timelines: Legal Staff reads each NCLT and NCLAT order and keeps every IA and its next date in view.',
    sources: ['NCLT website (cause lists and orders for each bench)', 'NCLAT website (cause lists, orders)', 'Insolvency and Bankruptcy Board of India (IBBI) for regulations'],
    intro: [
      'The National Company Law Tribunal sits through a Principal Bench at New Delhi and benches in a number of cities, each with one or more courts. Appeals go to the National Company Law Appellate Tribunal at New Delhi, which also has a bench at Chennai. For an insolvency practice, a single corporate debtor can generate a company petition and a dozen interlocutory applications, each listed separately and moving at its own pace.',
      'Legal Staff reads each order and attaches it to the right application: the main petition under the Insolvency and Bankruptcy Code, or a particular IA within it. It proposes the next date with the bench and court, and records directions to the resolution professional, the committee of creditors or the parties as tasks.',
      'The Code also imposes statutory timelines. The corporate insolvency resolution process has a 180-day period that can be extended by up to 90 days, within an outer limit of 330 days including litigation time, and an appeal to the NCLAT under section 61 must be filed within 30 days, with up to 15 more days on sufficient cause. Legal Staff tracks these as tasks with every step shown for your approval; it does not decide whether time is excluded.'
    ],
    orderFormat: {
      heading: 'NCLT and NCLAT orders: bench, court, petition and IA numbers',
      points: [
        'Orders identify the bench and the court within it (for example, Court-II), the company petition number and, often, one or more IA numbers dealt with together.',
        'Legal Staff links each direction to the right IA and proposes the next date for each, rather than one date for the whole case.',
        'Directions to the resolution professional, the CoC or the parties (to file a reply, a progress report or an affidavit) become tasks.',
        'Admission orders are summarised with the date of admission and the moratorium noted, so you can start CIRP timeline tasks for your approval.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['NATIONAL COMPANY LAW TRIBUNAL, [[MUMBAI BENCH, COURT-II]]', 'C.P. (IB) No. ____ / 20__  ·  [[I.A. No. ____ / 20__]]', '[Financial Creditor] v. [Corporate Debtor]', 'Reply to the IA within two weeks; rejoinder within one week thereafter. [[List on 16.02.2027]].'],
      fields: [['Bench', 'Mumbai, Court-II'], ['Linked to', 'IA within the CP (IB)'], ['Next date', '16 Feb 2027 (to confirm)'], ['Tasks', 'Reply: 2 weeks · Rejoinder: +1 week']],
      note: 'Each IA keeps its own next date, so the case view shows what is listed for what.'
    },
    workflow: [
      { title: 'Open the petition and its IAs', text: 'Add the company petition with its bench and court, then add each IA as it is filed. Upload the petition and annexures to the case vault.' },
      { title: 'Read each order against the right IA', text: 'Legal Staff summarises the order, links directions to the IA they concern and proposes the next date for each.' },
      { title: 'Confirm against the bench\'s cause list', text: 'Check the NCLT or NCLAT cause list on the official website and confirm the date and item number.' },
      { title: 'Track CIRP and appeal timelines', text: 'From the admission date, add tasks for the 180-day period, any extension and the 330-day outer limit. For appeals, track the 30-day period under section 61 and the further 15 days. Each step is shown for your approval.' },
      { title: 'Flag bench clashes', text: 'NCLT matters at different benches, or an NCLT listing and a High Court board, on the same morning are flagged.' },
      { title: 'Remind RPs, counsel and clients', text: 'WhatsApp reminders go to the team and, if you choose, to the client or resolution professional before each date.' }
    ],
    listingNotes: [
      'The NCLT has a Principal Bench at New Delhi and benches in several cities, some with more than one court. Check the NCLT website for the current list of benches and courts.',
      'The NCLAT sits at New Delhi and has a bench at Chennai; appeals are listed according to its current jurisdiction arrangements.',
      'Cause lists for each bench and the NCLAT are published on the official websites, which remain the record.',
      'Interlocutory applications are listed with their own numbers; track each one separately so a reply deadline in one IA is not lost in another.',
      'IBC timelines (CIRP period, extensions, appeal periods) are statutory; Legal Staff helps you track them but you decide whether any period is excluded.'
    ],
    faqs: [
      { q: 'Can Legal Staff track several IAs in one company petition?', a: 'Yes. Each IA is tracked with its own next date and tasks, and orders are linked to the IA they deal with.' },
      { q: 'Does it calculate the CIRP 330-day limit?', a: 'It tracks the 180-day period, any extension of up to 90 days and the 330-day outer limit as tasks from the dates you approve. Whether any period is excluded is your call, and the tracker shows each step.' },
      { q: 'What is the appeal period to the NCLAT under the IBC?', a: 'Section 61 of the Code provides 30 days, with up to 15 further days if sufficient cause is shown. Check the bare Act and current rulings before relying on a date.' },
      { q: 'Does it fetch NCLT cause lists?', a: 'No. The NCLT and NCLAT websites are the source of record. You paste or upload the order or the list entry, and confirm.' },
      { q: 'Can I track matters at different NCLT benches together?', a: 'Yes. Each hearing carries its bench and court, so a Mumbai and an Ahmedabad listing on the same day are shown together and flagged if they clash.' }
    ],
    related: { courts: ['supreme-court-of-india', 'drt-debt-recovery-tribunal', 'delhi-high-court', 'bombay-high-court'], cities: ['delhi', 'mumbai', 'chennai', 'kolkata', 'ahmedabad', 'bengaluru', 'hyderabad'], features: [FEAT.orders, FEAT.diary, FEAT.docs, FEAT.research], tools: [TOOL.lim], blogs: ['nclt-ibc-cirp-timeline-tracker-interim-applications-advocates', 'track-cases-district-court-high-court-nclt-single-dashboard', 'summarize-charge-sheets-arbitral-awards-judgments-ai-india'] }
  },

  /* ------------------------------------------------------------ DRT / DRAT */
  {
    slug: 'drt-debt-recovery-tribunal', name: 'Debt Recovery Tribunals (DRT and DRAT)', short: 'DRT / DRAT', type: 'tribunal',
    seat: 'DRTs across India; DRATs in a few cities', benches: ['Debt Recovery Tribunals in many cities', 'Debt Recovery Appellate Tribunals hearing appeals from groups of DRTs'],
    title: 'DRT and DRAT: case tracking for bank recovery and SARFAESI matters',
    metaTitle: 'DRT & DRAT Case Tracking for Advocates',
    metaDescription: 'Track Debt Recovery Tribunal and DRAT matters: original applications, SARFAESI section 17 applications and appeals, with next dates and WhatsApp reminders.',
    lead: 'Original applications, securitisation applications and appeals, before the Registrar, the Presiding Officer and the Recovery Officer: Legal Staff keeps each DRT and DRAT date in one diary.',
    sources: ['Debt Recovery Tribunal and DRAT case status and cause lists published through the official DRT portal', 'Department of Financial Services notifications'],
    intro: [
      'Debt Recovery Tribunals hear original applications by banks and financial institutions under the Recovery of Debts and Bankruptcy Act, 1993, and securitisation applications by borrowers and others under section 17 of the SARFAESI Act. Appeals go to the Debt Recovery Appellate Tribunals. For a recovery practice, whether acting for lenders or borrowers, one account can generate an OA, an SA and later an appeal, each before a different officer.',
      'Within a DRT, matters can be listed before the Registrar for procedural steps such as service and completion of pleadings, before the Presiding Officer for hearing, and later before the Recovery Officer once a recovery certificate is issued. Legal Staff reads each order and records which of these the next date is before, so the right junior turns up in the right room.',
      'DRT dockets also tend to move in batches for a single lender. Tagging cases by client lets you see, in one view, every OA and SA for that bank and the next date in each.'
    ],
    orderFormat: {
      heading: 'DRT and DRAT orders: OA, SA and appeal numbers, and before whom',
      points: [
        'Orders carry the application type and number (OA, SA, or an appeal number at the DRAT) and Legal Staff keeps it exactly as written.',
        'Legal Staff notes whether the next date is before the Registrar, the Presiding Officer or the Recovery Officer.',
        'Directions to file a written statement, reply or rejoinder, or to effect service, become tasks.',
        'Interim orders (for example, on possession under SARFAESI) are summarised with paragraph references and their conditions.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['DEBT RECOVERY TRIBUNAL-[[__]], [City]', '[[S.A. No. ____ / 20__]]', '[Applicant] v. [Secured Creditor]', 'Reply by the respondent bank within three weeks. [[Adjourned to 28.01.2027 for hearing before the Presiding Officer]].'],
      fields: [['Forum', 'DRT (Presiding Officer)'], ['Application', 'SA under SARFAESI s.17'], ['Next date', '28 Jan 2027 (to confirm)'], ['Task', 'Bank\'s reply: 3 weeks']],
      note: 'Registrar and Recovery Officer dates are tagged separately from hearings before the Presiding Officer.'
    },
    workflow: [
      { title: 'Create OAs, SAs and appeals', text: 'Add each matter with its DRT or DRAT, application type and number, and tag the client (lender or borrower).' },
      { title: 'Upload each order', text: 'Legal Staff reads the next date and whether it is before the Registrar, the Presiding Officer or the Recovery Officer.' },
      { title: 'Confirm and assign', text: 'Confirm the date against the official cause list and assign the appearance to a junior or counsel.' },
      { title: 'Track pleadings and service', text: 'Directions to file written statements, replies or proof of service become tasks with due dates.' },
      { title: 'Review by client', text: 'Filter the diary by lender or borrower to see every account and its next date in one view.' },
      { title: 'Remind and report', text: 'WhatsApp reminders go to the team before each date, and you can share a client update once a date is confirmed.' }
    ],
    listingNotes: [
      'DRTs hear original applications under the RDB Act and securitisation applications under section 17 of the SARFAESI Act; appeals lie to the DRAT.',
      'Original applications are maintainable above a pecuniary threshold notified by the Central Government; check the current notification before filing.',
      'Appeals to the DRAT generally require a pre-deposit; the amount and any waiver depend on the statute and the tribunal\'s order, so check the provision that applies.',
      'Cause lists and case status are published through the official DRT portal, which remains the record.',
      'DRTs also act as the adjudicating authority for insolvency of individuals and partnership firms under the IBC, other than personal guarantors to corporate debtors, whose matters go to the NCLT.'
    ],
    faqs: [
      { q: 'Can Legal Staff tell a Registrar date from a hearing before the Presiding Officer?', a: 'Yes, where the order says so. Each proposed date is labelled with the officer before whom it is listed, and you confirm it.' },
      { q: 'Can I see all matters for one bank together?', a: 'Yes. Tag cases by client and filter the diary or case list to see every OA, SA and appeal with its next date.' },
      { q: 'Does it calculate SARFAESI and RDB Act limitation?', a: 'The limitation tracker calculates periods using rules you can see, with each exclusion shown for approval. Check the statute and current rulings for the period that applies.' },
      { q: 'Does it pull DRT cause lists automatically?', a: 'No. The official DRT portal is the source of record. You paste or upload the order or list entry.' },
      { q: 'Can I keep recovery certificate proceedings with the OA?', a: 'Yes. Recovery Officer dates sit on the same case as the original application, so the history stays in one place.' }
    ],
    related: { courts: ['nclt-and-nclat', 'bombay-high-court', 'delhi-high-court', 'allahabad-high-court'], cities: ['mumbai', 'delhi', 'kolkata', 'chennai', 'ahmedabad', 'prayagraj'], features: [FEAT.orders, FEAT.diary, FEAT.team, FEAT.docs], tools: [TOOL.lim, TOOL.s138], blogs: ['track-cases-district-court-high-court-nclt-single-dashboard', 'per-hearing-appearance-billing-retainer-invoicing-indian-advocates', 'section-12-limitation-act-excluding-certified-copy-days-calculation'] }
  },

  /* ------------------------------------------------------------ Consumer commissions */
  {
    slug: 'consumer-courts-ncdrc-scdrc', name: 'Consumer Commissions (NCDRC, SCDRC, DCDRC)', short: 'Consumer commissions', type: 'consumer',
    seat: 'National Commission at New Delhi; State and District Commissions', benches: ['State Consumer Disputes Redressal Commission in each state', 'District Consumer Disputes Redressal Commissions'],
    title: 'Consumer commissions: complaint and appeal tracking for advocates',
    metaTitle: 'Consumer Commission Case Tracking for Advocates',
    metaDescription: 'Track District, State and National Consumer Commission cases: written version deadlines, evidence affidavits, appeals and next dates, with WhatsApp reminders.',
    lead: 'Three tiers, strict timelines for the written version and appeals, and short dates for evidence affidavits: Legal Staff keeps each consumer complaint moving.',
    sources: ['e-Daakhil portal for e-filing', 'CONFONET case status and cause lists for consumer commissions', 'National Consumer Disputes Redressal Commission website'],
    intro: [
      'Under the Consumer Protection Act, 2019, complaints are heard by District Commissions, State Commissions and the National Commission, with pecuniary jurisdiction based on the value of the goods or services paid for. Under the rules in force since December 2021, District Commissions hear complaints up to ₹50 lakh, State Commissions above ₹50 lakh and up to ₹2 crore, and the National Commission above ₹2 crore. Check for any later revision before filing.',
      'Consumer cases are often won or lost on timelines rather than merits: the opposite party\'s written version, evidence by affidavit, and appeal periods. A complaint must generally be filed within two years of the cause of action; an appeal from a District Commission to the State Commission lies within 45 days, and from the State Commission to the National Commission within 30 days. Legal Staff tracks each as a task with every step shown for your approval.',
      'Orders in consumer matters are usually short: who appeared, what was filed, and the next date with its purpose. Legal Staff reads them, proposes the next date and attaches the tier and commission so a busy practice can see all three levels at once.'
    ],
    orderFormat: {
      heading: 'Consumer commission orders: tier, purpose and the next date',
      points: [
        'Orders name the commission (District, State or National) and the complaint, appeal or revision number. Legal Staff stores the tier with each hearing.',
        'Purposes are typically stated ("for filing written version", "for evidence by way of affidavit", "for arguments"); Legal Staff reads the purpose with the date.',
        'Directions on the written version are flagged, because the time for filing it is strictly enforced.',
        'Final orders are summarised with the relief granted and the date, so the appeal period can be tracked from the date you approve.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['[[DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION]], [District]', 'Consumer Complaint No. ____ / 20__', '[Complainant] v. [Opposite Party]', 'Notice served. Opposite party seeks time. [[Put up on 04.02.2027 for filing written version]].'],
      fields: [['Tier', 'District Commission'], ['Next date', '4 Feb 2027 (to confirm)'], ['Purpose', 'Written version'], ['Flag', 'Written version timeline: check the statutory limit']],
      note: 'Deadline flags use red only for statutory timelines that are about to run out.'
    },
    workflow: [
      { title: 'Choose the tier', text: 'Create the complaint or appeal at the District, State or National Commission, with the consideration paid recorded for jurisdiction.' },
      { title: 'Record the cause of action date', text: 'The limitation tracker shows the two-year period for the complaint, with any exclusion shown for your approval.' },
      { title: 'Upload each order', text: 'Legal Staff reads the next date and purpose (written version, evidence, arguments) and proposes it.' },
      { title: 'Watch the written version', text: 'From the date of service you approve, the written version timeline is tracked as a task with an alert.' },
      { title: 'Track appeals after the final order', text: 'From the date of the order, add the appeal period (45 days to the State Commission, 30 days to the National Commission) as a task.' },
      { title: 'Update the client', text: 'Consumer clients often want frequent updates; share confirmed dates and outcomes on WhatsApp.' }
    ],
    listingNotes: [
      'Pecuniary jurisdiction is based on the value of goods or services paid as consideration: up to ₹50 lakh (District), above ₹50 lakh to ₹2 crore (State), above ₹2 crore (National), under the 2021 rules.',
      'The time for the opposite party to file its written version is strictly enforced; track it from the date of service.',
      'Complaints can be e-filed through the e-Daakhil portal; case status and cause lists are available through CONFONET. These remain the record.',
      'Appeals from a State Commission order to the National Commission lie within 30 days, and from the National Commission to the Supreme Court within 30 days; check the Act for pre-deposit requirements.',
      'Mediation may be offered at the first hearing; note the referral and its outcome on the case.'
    ],
    faqs: [
      { q: 'Which commission should I file in?', a: 'It depends on the value of the goods or services paid as consideration. Under the 2021 rules: up to ₹50 lakh at the District Commission, above ₹50 lakh and up to ₹2 crore at the State Commission, and above ₹2 crore at the National Commission. Check for any later revision.' },
      { q: 'Does Legal Staff track the written version deadline?', a: 'Yes, as a task from the date of service you approve, with an alert before it runs out. You decide the dates; Legal Staff shows each step.' },
      { q: 'What are the appeal periods?', a: 'Under the Consumer Protection Act, 2019, an appeal from a District Commission lies to the State Commission within 45 days, and from a State Commission to the National Commission within 30 days. Check the Act for pre-deposit and condonation.' },
      { q: 'Does it pull case status from CONFONET?', a: 'No. CONFONET and the commissions\' websites are the source of record. You paste or upload orders and confirm dates.' },
      { q: 'Can I keep the evidence affidavit drafts with the case?', a: 'Yes. Drafting Studio has affidavit templates, and every version sits in the case vault.' }
    ],
    related: { courts: ['ecourts-district-and-sessions-courts', 'rera-tribunals', 'supreme-court-of-india', 'delhi-high-court'], cities: ['delhi', 'mumbai', 'bengaluru', 'hyderabad', 'jaipur', 'kochi'], features: [FEAT.diary, FEAT.orders, FEAT.wa, FEAT.docs], tools: [TOOL.lim], blogs: ['automated-client-case-status-court-order-updates-on-whatsapp', 'drafting-written-statements-bail-applications-faster-ai-workspace', 'section-12-limitation-act-excluding-certified-copy-days-calculation'] }
  },

  /* ------------------------------------------------------------ RERA */
  {
    slug: 'rera-tribunals', name: 'RERA Authorities and Appellate Tribunals', short: 'RERA', type: 'tribunal',
    seat: 'Each state and Union Territory', benches: ['State Real Estate Regulatory Authorities', 'Real Estate Appellate Tribunals', 'Adjudicating officers for compensation'],
    title: 'RERA authorities and appellate tribunals: complaint tracking for advocates',
    metaTitle: 'RERA Complaint & Appeal Tracking for Advocates',
    metaDescription: 'Track RERA complaints, adjudicating officer claims and Appellate Tribunal appeals across states: read orders, follow appeal periods and send WhatsApp reminders.',
    lead: 'Homebuyer and promoter disputes before state authorities, adjudicating officers and appellate tribunals: Legal Staff keeps each RERA date, forum and appeal period in view.',
    sources: ['Each state\'s RERA authority website (cause lists, orders, project registrations)', 'Each state\'s Real Estate Appellate Tribunal website or notice board'],
    intro: [
      'The Real Estate (Regulation and Development) Act, 2016 is administered state by state. Each state has its own Real Estate Regulatory Authority and Appellate Tribunal, its own website and its own way of publishing cause lists and orders. Maharashtra\'s authority (MahaRERA), Uttar Pradesh\'s authority and the two Haryana authorities at Gurugram and Panchkula each work a little differently. A real estate practice with clients in several states has to follow several systems.',
      'Within a state there are usually three tracks: complaints under section 31 before the Authority, compensation claims before the adjudicating officer under section 71, and appeals to the Appellate Tribunal. An appeal to the Tribunal lies within 60 days of the order, and a further appeal to the High Court within 60 days of the Tribunal\'s decision. Legal Staff stores the forum with each hearing and tracks appeal periods as tasks from the order date you approve.',
      'Homebuyer matters also tend to come in groups, with many allottees in the same project. Tagging cases by project lets you see every complaint against one promoter and its next date together.'
    ],
    orderFormat: {
      heading: 'RERA orders: forum, complaint number and the next step',
      points: [
        'Orders identify the state Authority, the adjudicating officer or the Appellate Tribunal, and the complaint or appeal number. Legal Staff stores the forum with each hearing.',
        'Directions to the promoter to file a reply or deposit an amount, and compliance dates, become tasks.',
        'Final orders are summarised with the relief granted (refund with interest, possession, compensation) and the order date, to start the appeal period you approve.',
        'Many authorities hear matters online; the hearing link or mode can be added as a note on the hearing.'
      ]
    },
    sample: {
      doc: 'Order (sample)',
      lines: ['BEFORE THE [[REAL ESTATE REGULATORY AUTHORITY]], [State]', 'Complaint No. ____ / 20__', '[Allottee] v. [Promoter]', 'Promoter to file reply with project status. [[Next hearing on 10.03.2027]].'],
      fields: [['Forum', 'State RERA Authority'], ['Next date', '10 Mar 2027 (to confirm)'], ['Task', 'Watch for promoter\'s reply'], ['Tag', 'Project: [Project name]']],
      note: 'Tag by project to see every allottee\'s complaint against the same promoter.'
    },
    workflow: [
      { title: 'Pick the state and forum', text: 'Create the complaint before the Authority, a claim before the adjudicating officer, or an appeal before the Appellate Tribunal, in the right state.' },
      { title: 'Tag by project and promoter', text: 'Group allottees\' complaints by project so batch hearings are prepared together.' },
      { title: 'Upload each order', text: 'Legal Staff reads the next date, compliance directions and any relief granted, and proposes the next step.' },
      { title: 'Confirm against the authority\'s list', text: 'Check the state authority\'s published cause list or notice and confirm the date.' },
      { title: 'Track the 60-day appeal period', text: 'From the date of the order you approve, add the appeal period to the Appellate Tribunal (and later to the High Court) as a task.' },
      { title: 'Keep allottees informed', text: 'Share confirmed dates and outcomes with clients on WhatsApp or through the client portal.' }
    ],
    listingNotes: [
      'Each state and UT has its own RERA authority and Appellate Tribunal, with its own website and practice. Some states have more than one authority (Haryana has authorities at Gurugram and Panchkula).',
      'Complaints under section 31 go to the Authority; compensation claims under section 71 go to the adjudicating officer. Track them as separate matters if both are filed.',
      'An appeal to the Appellate Tribunal lies within 60 days of the order; a promoter\'s appeal generally requires a pre-deposit under the Act. A further appeal to the High Court lies within 60 days.',
      'Each authority\'s website is the source of record for its cause lists and orders.',
      'Execution of RERA orders may involve recovery proceedings; note the stage on the case.'
    ],
    faqs: [
      { q: 'Can Legal Staff handle RERA matters in more than one state?', a: 'Yes. Each case records the state and forum, so a practice with MahaRERA, UP RERA and Haryana matters sees them in one diary.' },
      { q: 'What is the appeal period to the RERA Appellate Tribunal?', a: 'Section 44 of the Act provides 60 days from the date of the order, and section 58 provides a further 60 days to appeal to the High Court. Check the Act and the state rules for condonation and pre-deposit.' },
      { q: 'Does it track adjudicating officer claims separately?', a: 'Yes. A compensation claim before the adjudicating officer can be a separate matter linked to the complaint, with its own dates.' },
      { q: 'Does it fetch RERA cause lists?', a: 'No. Each state authority\'s website is the source of record. You paste or upload the order or the list entry.' },
      { q: 'Can I group complaints from the same project?', a: 'Yes. Tag cases by project or promoter and filter the diary to prepare batch hearings together.' }
    ],
    related: { courts: ['consumer-courts-ncdrc-scdrc', 'bombay-high-court', 'punjab-and-haryana-high-court', 'allahabad-high-court'], cities: ['mumbai', 'pune', 'lucknow', 'bengaluru', 'chandigarh', 'delhi'], features: [FEAT.orders, FEAT.diary, FEAT.team, FEAT.wa], tools: [TOOL.lim], blogs: ['automated-client-case-status-court-order-updates-on-whatsapp', 'track-cases-district-court-high-court-nclt-single-dashboard', 'organize-vakalatnama-certified-copies-order-sheets-cloud-workspace'] }
  }
];

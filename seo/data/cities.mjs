// City pages at /advocate-software-in-<slug>, rendered by seo/pages/city.mjs (hub at /advocate-software-in-india).
// Shape: { slug, name, state, title (H1), metaTitle ('Best Practice & Case Management Software for Advocates in <City>'; the brand suffix is added by seoHead), metaDescription (140–160 chars),
//   intro: [string] (2 paragraphs, unique), courts: [{ name, short (≤ 18 chars, used on the hero diary card), kind ('Supreme Court'|'High Court'|'District courts'|'Tribunal'|'Consumer'|'Other'),
//     court (slug in courts.mjs, optional), places: [string] (optional, e.g. district court complexes), note }] (the High Court / bench and principal district courts and tribunals in or serving the city),
//   barNotes: [string] (3–4 local practice points: court complexes, bar associations by general name, typical case mix), benefits: [{ title, text }] (3–4 chamber workflow benefits framed for that city),
//   faqs: [{ q, a }] (4), nearby: [slug] (3–4), features: [slug] (3, feature pages to link), blogs: [slug] (2–3, blog posts to link) }
// Forum details are kept to well-established facts (seat, benches, principal complexes). Where unsure, the text stays general.
const T = name => `Practice and case management software for advocates in ${name}`;
const M = name => `Best Practice & Case Management Software for Advocates in ${name}`;

export const cities = [
  {
    slug: 'delhi', name: 'Delhi', state: 'Delhi', title: T('Delhi'), metaTitle: M('Delhi'),
    metaDescription: 'Court diary for Delhi advocates across the Supreme Court, Delhi High Court, Tis Hazari, Saket, Rohini and NCLT, with clash alerts and WhatsApp reminders.',
    intro: [
      'Delhi litigation rarely stays in one building. One chamber can have a Supreme Court matter at Tilak Marg in the morning, a writ before the Delhi High Court after lunch and a bail hearing at Saket or Rohini on the same day, with NCLT and DRT dates layered on top. Most of that still lives in a paper diary and the memory of one clerk.',
      'Legal Staff gives a Delhi chamber a single diary for every forum. Paste or upload each order, check the next date it picks out, and the hearing lands on the calendar with the court and purpose once you confirm it. When two appearances fall at the same time in different complexes, the clash shows up the evening before, while there is still time to brief a junior.'
    ],
    courts: [
      { name: 'Supreme Court of India', short: 'Supreme Court', kind: 'Supreme Court', court: 'supreme-court-of-india', note: 'Tilak Marg, New Delhi. Miscellaneous and regular hearing matters are listed differently, so record each matter’s stage alongside its date.' },
      { name: 'Delhi High Court', short: 'Delhi HC', kind: 'High Court', court: 'delhi-high-court', note: 'Sher Shah Road. Besides writ and appellate work it has original civil jurisdiction for suits above its pecuniary limit, including commercial suits.' },
      { name: 'Delhi district court complexes', short: 'Saket Courts', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', places: ['Tis Hazari', 'Patiala House', 'Karkardooma', 'Rohini', 'Saket', 'Dwarka', 'Rouse Avenue'], note: 'Civil, criminal, family and commercial courts are spread across these complexes, each serving its own districts; Rouse Avenue houses several special courts.' },
      { name: 'NCLT and NCLAT benches, New Delhi', short: 'NCLT Delhi', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'The NCLT Principal Bench and other New Delhi benches hear company and IBC matters; the NCLAT’s principal bench also sits in New Delhi.' },
      { name: 'Debt Recovery Tribunals and DRAT, Delhi', short: 'DRT Delhi', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Several DRTs sit in Delhi for bank and financial-institution recovery and SARFAESI matters, with appeals to the DRAT.' },
      { name: 'NCDRC and Delhi consumer commissions', short: 'NCDRC', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The National Commission, the Delhi State Commission and the district commissions all sit in the city.' }
    ],
    barNotes: [
      'Distance is the hidden cost. Rohini to Saket or Dwarka to Karkardooma can take most of a morning, so chambers split appearances between juniors and keep a colleague on standby for clashes.',
      'Each complex has its own bar association, bar room and notice boards. A shared chamber board saves the round of phone calls asking who is covering which court.',
      'The case mix is unusually wide: commercial suits and arbitration petitions on the High Court’s original side, service and writ matters, criminal trials and bail at the district level, and IBC petitions before the NCLT.',
      'Commercial suits follow the Commercial Courts Act timelines, including the 120-day outer limit for a written statement under Order VIII Rule 1 as amended for commercial disputes.'
    ],
    benefits: [
      { title: 'One diary for seven complexes and two apex forums', text: 'Every hearing is tagged with its forum, so a Rohini bail matter and a Supreme Court mention never hide from each other on separate pages.' },
      { title: 'Clash alerts before you leave chambers', text: 'Listed at Saket and the High Court at the same hour? The diary flags it in advance and you can reassign the Saket hearing to a junior from the hearing itself.' },
      { title: 'Reminders for juniors on the road', text: 'Juniors covering Karkardooma or Dwarka get a WhatsApp reminder two days before and on the morning of the hearing, once your WhatsApp Business number is connected.' },
      { title: 'Commercial timelines you can see', text: 'The limitation tracker shows each exclusion it applied, and nothing alerts the team until an advocate approves the date.' }
    ],
    faqs: [
      { q: 'Does Legal Staff cover both Delhi High Court and district court matters?', a: 'Yes. The diary is not tied to one court: add matters from the Supreme Court, the Delhi High Court, any district complex, the NCLT, DRTs or consumer commissions, and each hearing carries its forum. Case import by CNR works where a court-data provider is connected; otherwise you add the case once and its orders keep it current.' },
      { q: 'Can it warn me when I am listed in two complexes at the same time?', a: 'Yes. Clash detection flags two hearings for the same advocate at the same time, whether they are at Tis Hazari and Patiala House or at the High Court and the NCLT. You can then reassign one hearing to a junior.' },
      { q: 'Does Legal Staff download the Delhi High Court cause list for me?', a: 'No. It does not scrape cause lists. It reads the orders you paste or upload, picks out the next date and waits for your confirmation. Your team should still check the day’s list on the court’s website.' },
      { q: 'Can my juniors and clerk work from the same board?', a: 'Yes. Add them as team members with a role, assign hearings and tasks with due dates, and everyone sees the same hearing board. Each firm’s data is kept separate from every other firm’s.' }
    ],
    nearby: ['chandigarh', 'jaipur', 'lucknow', 'dehradun'],
    features: ['digital-advocate-diary', 'chamber-team-collaboration', 'ai-court-order-reader'],
    blogs: ['track-cases-district-court-high-court-nclt-single-dashboard', 'managing-junior-advocates-court-clerks-daily-board-task-software', 'cpc-order-8-rule-1-written-statement-120-days-commercial-courts']
  },
  {
    slug: 'mumbai', name: 'Mumbai', state: 'Maharashtra', title: T('Mumbai'), metaTitle: M('Mumbai'),
    metaDescription: 'Case management for Mumbai advocates at the Bombay High Court, City Civil Court, NCLT Mumbai and DRTs: order reading, court diary and WhatsApp reminders.',
    intro: [
      'A Mumbai practice runs on the Fort. The Bombay High Court, the City Civil and Sessions Court and the magistrates’ courts sit within walking distance, but the NCLT, DRTs and consumer commissions add more stops, and a single commercial client can have matters in four of them at once.',
      'Legal Staff keeps that spread in one workspace. Each order is read and summarised with paragraph references, the next date is proposed for your confirmation, and the chamber sees one board of who is appearing where. Original-side suits, company petitions and DRT applications sit side by side instead of in separate registers.'
    ],
    courts: [
      { name: 'Bombay High Court (principal seat)', short: 'Bombay HC', kind: 'High Court', court: 'bombay-high-court', note: 'Fort, Mumbai. Has an Original Side for suits within its jurisdiction alongside appellate and writ work; its benches include Nagpur, Aurangabad and Goa.' },
      { name: 'City Civil and Sessions Court, Mumbai', short: 'City Civil Ct', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil suits below the High Court’s pecuniary limit and sessions trials for the city; the Small Causes Court and metropolitan magistrates’ courts handle tenancy and summary criminal work.' },
      { name: 'NCLT Mumbai Bench', short: 'NCLT Mumbai', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'One of the busiest NCLT benches, with several courts hearing company petitions and IBC applications.' },
      { name: 'Debt Recovery Tribunals and DRAT, Mumbai', short: 'DRT Mumbai', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Multiple DRTs and the DRAT for western India sit in the city.' },
      { name: 'Maharashtra consumer commissions and MahaRERA', short: 'MahaRERA', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The Maharashtra State Consumer Commission, the Mumbai district commissions and MahaRERA hear a large share of real-estate disputes.' }
    ],
    barNotes: [
      'Original Side practice brings its own rhythm: chamber summons, notices of motion or interim applications and commercial suits move on different tracks from appellate matters.',
      'Long-standing bar associations at the High Court and the city civil court shape day-to-day practice, from mentioning to circulation of matters.',
      'Real-estate, commercial, insolvency and banking disputes dominate many chambers, so the same client often appears before MahaRERA, the NCLT and a DRT.',
      'Commute times from the suburbs to the Fort make an early, reliable morning briefing worth more than a late-night call.'
    ],
    benefits: [
      { title: 'One client, four forums, one view', text: 'Group a developer’s RERA complaints, NCLT petitions and High Court appeals under one client, each with its own diary entries and document vault.' },
      { title: 'Morning briefing before the local train', text: 'The daily briefing lists every appearance, its court and purpose, so the chamber starts the day on the same page.' },
      { title: 'Drafts that start from your templates', text: 'The Drafting Studio holds notices, affidavits, replies and appeals with versions and DOCX/PDF export, so juniors stop rebuilding formats from old files.' }
    ],
    faqs: [
      { q: 'Can I track Bombay High Court Original Side and appellate matters together?', a: 'Yes. Each matter carries its own forum and side as you record it, and all hearings sit on one diary. Orders you upload update the next date once you confirm it.' },
      { q: 'Does Legal Staff work for NCLT Mumbai and DRT matters?', a: 'Yes. Tribunal matters are added like any other case. The order reader summarises the order and proposes the next date; IBC and recovery timelines can be tracked as tasks and limitation dates with advocate approval.' },
      { q: 'Is there an iPhone or Android app?', a: 'Not a native app. Legal Staff is a web app that works in mobile browsers, so you can check the board on the way to the Fort without installing anything.' },
      { q: 'Can clients see updates without calling the chamber?', a: 'You can share updates with clients and give them access to selected matters through the client portal, so routine status calls drop.' }
    ],
    nearby: ['pune', 'nagpur', 'ahmedabad', 'indore'],
    features: ['ai-court-order-reader', 'case-document-management', 'chamber-team-collaboration'],
    blogs: ['nclt-ibc-cirp-timeline-tracker-interim-applications-advocates', 'automated-client-case-status-court-order-updates-on-whatsapp', 'drafting-written-statements-bail-applications-faster-ai-workspace']
  },
  {
    slug: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', title: T('Bengaluru'), metaTitle: M('Bengaluru'),
    metaDescription: 'Practice management for Bengaluru advocates at the Karnataka High Court, City Civil Courts, NCLT and DRT: orders read, dates confirmed, reminders on WhatsApp.',
    intro: [
      'Bengaluru chambers handle a distinctive mix: technology-company disputes and employment matters, a heavy property and land docket, and writ petitions against state authorities before the Karnataka High Court. Traffic between the High Court, the City Civil Court complex and the tribunals turns a three-matter day into a logistics exercise.',
      'Legal Staff lets the chamber plan that day from one screen. Orders are read and summarised with references, the next hearing date waits for an advocate’s confirmation, and juniors receive the day’s assignments on WhatsApp. For corporate clients the per-case document vault keeps pleadings, annexures and certified copies in order.'
    ],
    courts: [
      { name: 'Karnataka High Court (principal seat)', short: 'Karnataka HC', kind: 'High Court', court: 'karnataka-high-court', note: 'Bengaluru, in the Attara Kacheri building. Permanent benches sit at Dharwad and Kalaburagi.' },
      { name: 'City Civil and Sessions Courts, Bengaluru', short: 'City Civil Ct', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions and commercial courts for the city, with Bengaluru Rural district courts handling the surrounding district.' },
      { name: 'NCLT Bengaluru Bench', short: 'NCLT Bengaluru', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and insolvency matters for Karnataka are heard here.' },
      { name: 'DRT Bengaluru', short: 'DRT Bengaluru', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications for the region.' },
      { name: 'Karnataka State and district consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and the Bengaluru district commissions sit in the city.' }
    ],
    barNotes: [
      'Land, revenue and BDA or municipal disputes reach the High Court regularly as writ petitions, often with long annexure sets.',
      'Start-up and technology clients bring employment, IP and shareholder disputes, some of which end up before the NCLT.',
      'The Advocates’ Association and other bar bodies at the High Court and city courts are central to practice notices and court timings.',
      'Commercial courts at the city level make written-statement and case-management timelines a recurring diary item.'
    ],
    benefits: [
      { title: 'Plan around traffic, not surprises', text: 'See the whole day by complex the evening before, spot clashes, and hand one appearance to a junior before anyone leaves home.' },
      { title: 'Long annexure sets, findable', text: 'Keep each writ’s annexures, certified copies and vakalatnama in the case vault with exhibit marks, instead of scattered email threads.' },
      { title: 'Answers from the case file only', text: 'AI Case Brain answers questions from the case’s own orders and documents with citations, so a junior can prepare a hearing brief without guessing.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Karnataka High Court benches at Dharwad and Kalaburagi?', a: 'Yes. Record the bench with the matter and its hearings appear on the same diary as your Bengaluru cases. The diary is not limited to one court.' },
      { q: 'Can it help with commercial court timelines?', a: 'The limitation tracker calculates dates by rule and shows every exclusion it applied, such as time for a certified copy under section 12 of the Limitation Act. An advocate approves each date before alerts go out.' },
      { q: 'Will the AI invent case law for my brief?', a: 'No. AI Case Brain only answers from the documents and orders in that case and cites them. Drafts must be reviewed by an advocate.' },
      { q: 'How do juniors get their daily assignments?', a: 'Assign hearings and tasks on the board; juniors get WhatsApp and email reminders before each hearing once the WhatsApp Business connection is set up.' }
    ],
    nearby: ['chennai', 'hyderabad', 'kochi', 'pune'],
    features: ['ai-legal-research-workspace', 'case-document-management', 'digital-advocate-diary'],
    blogs: ['ai-legal-research-supreme-court-high-court-without-hallucinations', 'organize-vakalatnama-certified-copies-order-sheets-cloud-workspace']
  },
  {
    slug: 'chennai', name: 'Chennai', state: 'Tamil Nadu', title: T('Chennai'), metaTitle: M('Chennai'),
    metaDescription: 'Court diary and order reader for Chennai advocates at the Madras High Court, City Civil Court, NCLT and NCLAT Chennai, with WhatsApp hearing reminders.',
    intro: [
      'Much of Chennai’s litigation happens on one campus. The Madras High Court and the City Civil Court share the Parry’s Corner area, and the NCLT, NCLAT bench and DRTs are a short drive away. Proximity helps, but it also means a chamber can be listed in five courtrooms before lunch.',
      'Legal Staff turns that density into a manageable board. Each order is summarised with paragraph references and the next date is proposed for your confirmation; clash detection then shows when two of your matters are called at the same time, so a junior can be sent to hold one.'
    ],
    courts: [
      { name: 'Madras High Court (principal seat)', short: 'Madras HC', kind: 'High Court', court: 'madras-high-court', note: 'Chennai, with a bench at Madurai. Its jurisdiction also covers Puducherry. It retains an original side for civil suits.' },
      { name: 'City Civil Court, Chennai', short: 'City Civil Ct', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Sits within the High Court campus; small causes, magistrates’ and family courts handle other city work.' },
      { name: 'NCLT and NCLAT Chennai Benches', short: 'NCLT Chennai', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'The NCLT Chennai Bench hears company and IBC matters; the NCLAT also has a bench in Chennai for southern appeals.' },
      { name: 'Debt Recovery Tribunals and DRAT, Chennai', short: 'DRT Chennai', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Several DRTs and a DRAT sit in Chennai.' },
      { name: 'Tamil Nadu consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and district commissions for Chennai.' }
    ],
    barNotes: [
      'Several long-standing bar associations operate on the High Court campus, and many chambers sit within walking distance of it.',
      'Writ petitions against state and local bodies, service matters and criminal original petitions are a large part of the High Court docket.',
      'Because the NCLAT has a Chennai bench, insolvency practitioners here often follow a matter from the NCLT through appeal without leaving the city.',
      'Chambers with Madurai Bench matters plan travel days well ahead, which makes a reliable diary and reminder chain important.'
    ],
    benefits: [
      { title: 'Five courtrooms, one board', text: 'See every courtroom you are listed in on the campus at a glance and reassign overlapping matters to juniors before the board starts.' },
      { title: 'Madurai trips without missed dates', text: 'Hearings at the Madurai Bench sit on the same calendar, with reminders two days before so travel can be booked in time.' },
      { title: 'Order summaries with paragraph references', text: 'Read a long order’s summary first and jump to the paragraph that matters, then confirm the next date it found.' }
    ],
    faqs: [
      { q: 'Can I keep Madras High Court principal seat and Madurai Bench matters together?', a: 'Yes. Record the bench with each matter; all hearings appear on one diary with clash detection across both.' },
      { q: 'Does Legal Staff support NCLT to NCLAT appeals?', a: 'You can link the appeal to the original matter, keep both sets of orders in the vault and track timelines as approved limitation dates and tasks.' },
      { q: 'Does it pick up the next date from my orders automatically?', a: 'It proposes the next date it reads in the order, with the paragraph it came from. Nothing goes on the calendar until an advocate confirms it.' },
      { q: 'Can I export the diary to my phone’s calendar?', a: 'Yes. The diary exports to .ics, which most phone and desktop calendars can import.' }
    ],
    nearby: ['bengaluru', 'hyderabad', 'kochi'],
    features: ['ai-court-order-reader', 'digital-advocate-diary', 'whatsapp-hearing-reminders'],
    blogs: ['how-ai-reads-indian-court-orders-extracts-next-hearing-dates', 'nclt-ibc-cirp-timeline-tracker-interim-applications-advocates']
  },
  {
    slug: 'kolkata', name: 'Kolkata', state: 'West Bengal', title: T('Kolkata'), metaTitle: M('Kolkata'),
    metaDescription: 'Practice management for Kolkata advocates at the Calcutta High Court, Alipore, Bankshall Court, NCLT and DRT: one diary, read orders and WhatsApp reminders.',
    intro: [
      'Kolkata practice is split between the Calcutta High Court’s Original Side and appellate side, the City Civil and Sessions courts, the Bankshall Court for metropolitan criminal work and the Alipore complex to the south. Add NCLT, DRT and consumer matters and a chamber’s register fills quickly.',
      'Legal Staff gives that register a single home. Orders are read and summarised, the next date waits for your confirmation, and the diary shows each matter with its side and court. Juniors who run between Esplanade and Alipore get reminders on WhatsApp, so a date noted in the morning is not forgotten by afternoon.'
    ],
    courts: [
      { name: 'Calcutta High Court (principal seat)', short: 'Calcutta HC', kind: 'High Court', court: 'calcutta-high-court', note: 'Kolkata, with an Original Side and an Appellate Side; circuit benches sit at Port Blair and Jalpaiguri.' },
      { name: 'Kolkata city and district courts', short: 'Alipore Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', places: ['City Civil Court', 'City Sessions Court', 'Bankshall Court', 'Alipore'], note: 'City civil and sessions courts and the Bankshall Court handle central Kolkata work; the Alipore complex serves South 24 Parganas.' },
      { name: 'NCLT Kolkata Bench', short: 'NCLT Kolkata', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Hears company and IBC matters for the eastern region.' },
      { name: 'Debt Recovery Tribunals and DRAT, Kolkata', short: 'DRT Kolkata', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI matters for the region, with appeals to the DRAT in Kolkata.' },
      { name: 'West Bengal consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and the Kolkata district commissions.' }
    ],
    barNotes: [
      'Original Side practice and its procedure differ from the Appellate Side, and many chambers handle both, so marking the side on every matter avoids confusion.',
      'The Bar Library Club, the Bar Association and the Incorporated Law Society are long-standing institutions of the High Court bar.',
      'Tenancy, property succession and partition suits remain a staple, alongside company and recovery work from the city’s older businesses.',
      'Alipore and the city courts are far enough apart that the same advocate rarely covers both on one morning.'
    ],
    benefits: [
      { title: 'Side and court on every entry', text: 'Mark Original Side, Appellate Side or the trial court on each matter so the board never mixes them up.' },
      { title: 'Junior reminders between Esplanade and Alipore', text: 'Assign the Alipore matter to a junior and they get WhatsApp reminders two days before and on the morning of the hearing.' },
      { title: 'Old files, one vault', text: 'Scan certified copies, order sheets and vakalatnamas into each case so long-running partition and succession suits stay complete.' }
    ],
    faqs: [
      { q: 'Can I track Calcutta High Court Original Side and Appellate Side matters separately?', a: 'Yes. Record the side with each matter. All hearings sit on one diary, and you can filter the board by court.' },
      { q: 'Will Legal Staff help with decades-old files?', a: 'You can upload old order sheets and certified copies into the case vault. Legal Staff can summarise uploaded orders, and AI Case Brain answers questions from those documents with citations.' },
      { q: 'Do reminders work for clients too?', a: 'You can share hearing updates with clients. WhatsApp delivery runs through the WhatsApp Business API once your chamber connects it; email works from the start.' },
      { q: 'Is my chamber’s data visible to other firms?', a: 'No. Each firm’s data is isolated with row-level security, and documents sit in private storage.' }
    ],
    nearby: ['cuttack', 'patna', 'guwahati', 'dhanbad'],
    features: ['digital-advocate-diary', 'case-document-management', 'whatsapp-hearing-reminders'],
    blogs: ['organize-vakalatnama-certified-copies-order-sheets-cloud-workspace', 'switch-from-physical-advocate-diary-to-cloud-case-workspace']
  },
  {
    slug: 'hyderabad', name: 'Hyderabad', state: 'Telangana', title: T('Hyderabad'), metaTitle: M('Hyderabad'),
    metaDescription: 'Case management for Hyderabad advocates at the Telangana High Court, City Civil Court, Nampally, NCLT and DRT, with order reading and WhatsApp reminders.',
    intro: [
      'Since 2019 the Telangana High Court has had its own seat in Hyderabad, and the city’s chambers handle a busy blend of writs against state bodies, land and revenue disputes, criminal work at Nampally and a growing company and insolvency docket before the NCLT.',
      'Legal Staff gives a Hyderabad chamber one diary for all of it. Paste or upload an order, check the summary and the next date it picked out, and confirm. Clash detection catches overlaps between the High Court and the city courts, and every member of the chamber works from the same hearing board.'
    ],
    courts: [
      { name: 'High Court for the State of Telangana', short: 'Telangana HC', kind: 'High Court', note: 'Hyderabad. Functioning as a separate High Court since 1 January 2019, after Andhra Pradesh’s High Court moved to Amaravati.' },
      { name: 'Hyderabad city courts', short: 'City Civil Ct', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', places: ['City Civil Court', 'Nampally Criminal Courts'], note: 'Civil and criminal courts for the city; the Ranga Reddy and Medchal–Malkajgiri district courts serve the surrounding districts.' },
      { name: 'NCLT Hyderabad Bench', short: 'NCLT Hyderabad', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for the region.' },
      { name: 'DRT Hyderabad', short: 'DRT Hyderabad', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications.' },
      { name: 'Telangana consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and Hyderabad district commissions.' }
    ],
    barNotes: [
      'Land and revenue matters, including disputes over records and acquisition, are a large part of writ practice.',
      'Some chambers still carry matters at the Andhra Pradesh High Court in Amaravati, so one diary for both states helps.',
      'Bar associations at the High Court and the city courts publish court timing and listing notices that the whole chamber needs to see.',
      'Real-estate and technology-sector growth has brought more commercial and RERA work to Hyderabad chambers.'
    ],
    benefits: [
      { title: 'Two High Courts, one diary', text: 'Keep Telangana and Andhra Pradesh High Court matters together, with travel days visible well ahead.' },
      { title: 'Writs with heavy records', text: 'Store revenue records, maps and annexures in each case’s vault with exhibit marks so the writ bundle is always complete.' },
      { title: 'Limitation dates with the working shown', text: 'The limitation tracker shows each exclusion it applied and waits for an advocate’s approval before alerts go out.' }
    ],
    faqs: [
      { q: 'Does Legal Staff have a page for the Telangana High Court?', a: 'Not a dedicated guide yet, but the diary, order reader and reminders work the same for Telangana High Court matters as for any other forum.' },
      { q: 'Can I keep Andhra Pradesh High Court matters in the same account?', a: 'Yes. Add the matter with its court; there is no restriction to one state.' },
      { q: 'Can I calculate limitation for an appeal against a city civil court decree?', a: 'Use the free limitation calculator or the in-app tracker. It applies rules such as section 12 exclusions and shows its working; check the bare Act before relying on any date.' },
      { q: 'Does it work on a phone?', a: 'Yes, in the mobile browser. There is no native iOS or Android app.' }
    ],
    nearby: ['bengaluru', 'chennai', 'nagpur'],
    features: ['ai-court-order-reader', 'digital-advocate-diary', 'case-document-management'],
    blogs: ['section-12-limitation-act-excluding-certified-copy-days-calculation', 'track-cases-district-court-high-court-nclt-single-dashboard']
  },
  {
    slug: 'prayagraj', name: 'Prayagraj', state: 'Uttar Pradesh', title: T('Prayagraj'), metaTitle: M('Prayagraj'),
    metaDescription: 'Court diary for Prayagraj advocates at the Allahabad High Court, district court and Board of Revenue: orders read, next dates confirmed, WhatsApp reminders.',
    intro: [
      'Prayagraj is home to the principal seat of the Allahabad High Court, one of the largest High Courts in the country by volume of cases. For chambers here the daily challenge is scale: long cause lists, fresh and additional lists, and dozens of matters a week in which a single missed date can mean dismissal for want of prosecution.',
      'Legal Staff is built for that volume. Upload each order, read its summary, confirm the next date and let the diary carry it. Juniors who wait in court for an item to be reached get WhatsApp reminders, and the morning briefing lists every matter in which the chamber is engaged that day.'
    ],
    courts: [
      { name: 'Allahabad High Court (principal seat)', short: 'Allahabad HC', kind: 'High Court', court: 'allahabad-high-court', note: 'Prayagraj. A bench sits at Lucknow; the principal seat hears matters from the districts not assigned to the Lucknow Bench.' },
      { name: 'District and Sessions Court, Prayagraj', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions, family and special courts for Prayagraj district.' },
      { name: 'Board of Revenue, Uttar Pradesh', short: 'Board of Revenue', kind: 'Other', note: 'The state’s highest revenue court sits in Prayagraj, so revenue and land-record appeals are part of local practice.' },
      { name: 'NCLT Allahabad Bench', short: 'NCLT Allahabad', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for Uttar Pradesh and nearby areas are heard here.' }
    ],
    barNotes: [
      'The High Court Bar Association at Prayagraj is among the largest in the country, and chambers often have several juniors watching boards in different courtrooms at once.',
      'Bail, criminal revisions and writs against state authorities make up a large share of the docket, many listed at short notice.',
      'Revenue matters move between the Board of Revenue, the district and the High Court, so one client file often spans all three.',
      'Advocates from across the state travel to Prayagraj for High Court dates, which makes advance reminders essential.'
    ],
    benefits: [
      { title: 'Volume without a missed date', text: 'Every order you upload becomes a confirmed next date on the diary, so a matter adjourned on a crowded day is never left in a bag of papers.' },
      { title: 'Juniors on several boards at once', text: 'Assign each courtroom’s matters to a junior; each gets the list and WhatsApp reminders, and the senior sees the whole board.' },
      { title: 'Revenue to High Court in one file', text: 'Keep Board of Revenue orders, district orders and the writ in one case vault, linked to the same client.' },
      { title: 'Outstation clients kept informed', text: 'Share hearing updates with clients in distant districts so they stop travelling just to ask about the next date.' }
    ],
    faqs: [
      { q: 'Can Legal Staff handle the volume of an Allahabad High Court practice?', a: 'Yes. There is no cap on matters per diary day, the board can be split by courtroom and junior, and clash detection flags overlapping listings for the same advocate.' },
      { q: 'Does it read the Allahabad High Court cause list?', a: 'No. Legal Staff does not scrape cause lists. It reads the orders you upload and proposes next dates for your confirmation; check the cause list on the court’s website as usual.' },
      { q: 'Can I keep Lucknow Bench matters in the same account?', a: 'Yes. Record the bench with the matter. Hearings at Prayagraj and Lucknow appear on one diary.' },
      { q: 'What does it cost for a chamber with several juniors?', a: 'There are Solo, Professional, Firm and Enterprise plans. See the pricing section on the home page or book a demo to choose the right one.' }
    ],
    nearby: ['lucknow', 'patna', 'delhi'],
    features: ['digital-advocate-diary', 'chamber-team-collaboration', 'whatsapp-hearing-reminders'],
    blogs: ['automate-daily-cause-list-next-hearing-date-tracking-india', 'managing-junior-advocates-court-clerks-daily-board-task-software', 'how-ai-reads-indian-court-orders-extracts-next-hearing-dates']
  },
  {
    slug: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh', title: T('Chandigarh'), metaTitle: M('Chandigarh'),
    metaDescription: 'Practice management for Chandigarh advocates at the Punjab and Haryana High Court, Sector 43 district courts, NCLT, CAT and AFT, with WhatsApp reminders.',
    intro: [
      'Chandigarh’s legal life centres on the Punjab and Haryana High Court in the Capitol Complex, which hears matters from two states and the Union Territory. Litigants and advocates travel in from across Punjab and Haryana, and chambers here juggle High Court dates with trial-court matters spread across both states.',
      'Legal Staff keeps that geography under control. Each order is summarised and its next date proposed for confirmation; the diary shows the High Court, the Sector 43 district courts and outstation trial courts together, and clients in distant districts can receive updates instead of calling.'
    ],
    courts: [
      { name: 'Punjab and Haryana High Court', short: 'P&H HC', kind: 'High Court', court: 'punjab-and-haryana-high-court', note: 'Capitol Complex, Chandigarh. A common High Court for Punjab, Haryana and the UT of Chandigarh.' },
      { name: 'District Courts, Sector 43', short: 'Sector 43 Courts', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'The Chandigarh district court complex for civil, criminal and family matters.' },
      { name: 'NCLT Chandigarh Bench', short: 'NCLT Chandigarh', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for the region.' },
      { name: 'DRTs, Chandigarh', short: 'DRT Chandigarh', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications.' },
      { name: 'CAT and Armed Forces Tribunal benches', short: 'CAT / AFT', kind: 'Tribunal', note: 'Central Administrative Tribunal and Armed Forces Tribunal regional benches sit in Chandigarh, so service matters are a notable part of practice.' }
    ],
    barNotes: [
      'The High Court Bar Association is large and active, and the Capitol Complex is a walk from most chambers in the northern sectors.',
      'Service matters, land acquisition, criminal appeals and bail from both states fill much of the High Court docket.',
      'Many advocates also appear before trial courts in Mohali, Panchkula or further afield, which makes cross-state diary planning routine.',
      'Defence-service clients bring matters before the Armed Forces Tribunal alongside writs in the High Court.'
    ],
    benefits: [
      { title: 'Two states, one diary', text: 'Keep High Court dates and trial-court dates from Punjab and Haryana districts on one calendar with clash detection.' },
      { title: 'Clients far from Chandigarh', text: 'Share the next date and a short order summary with clients who live hours away, instead of fielding calls after every hearing.' },
      { title: 'Service-matter files in order', text: 'Keep service records, representations and orders in each case vault so CAT, AFT and writ files are complete.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Punjab and Haryana High Court matters?', a: 'Yes. Add the matter, upload orders as they come, and confirm the next date Legal Staff reads from each order. Case import by CNR is available where a court-data provider is connected.' },
      { q: 'Can I track trial courts in Punjab and Haryana districts too?', a: 'Yes. The diary works for any court or tribunal, so outstation trial dates sit next to your High Court list.' },
      { q: 'Can I use it for CAT and Armed Forces Tribunal matters?', a: 'Yes. Tribunal matters are added like any other case, with orders, documents and reminders.' },
      { q: 'How quickly can my chamber start?', a: 'You can sign in with Google and add your team and first matters the same day. A demo can walk you through moving an existing diary.' }
    ],
    nearby: ['shimla', 'delhi', 'dehradun'],
    features: ['digital-advocate-diary', 'whatsapp-hearing-reminders', 'case-document-management'],
    blogs: ['automated-client-case-status-court-order-updates-on-whatsapp', 'switch-from-physical-advocate-diary-to-cloud-case-workspace']
  },
  {
    slug: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', title: T('Ahmedabad'), metaTitle: M('Ahmedabad'),
    metaDescription: 'Case management for Ahmedabad advocates at the Gujarat High Court, Bhadra City Civil Court, NCLT and DRT: orders read, dates confirmed, WhatsApp alerts.',
    intro: [
      'Ahmedabad chambers serve a commercial city. Trading houses, textile and pharmaceutical businesses and a busy real-estate market produce a steady flow of recovery suits, cheque-bounce complaints, company petitions and writs before the Gujarat High Court at Sola.',
      'Legal Staff helps a chamber keep pace. Section 138 complaints can be tracked against their statutory steps, orders are read and their next dates confirmed, and the board shows which junior is at Sola, Bhadra or the tribunals on any given day.'
    ],
    courts: [
      { name: 'Gujarat High Court', short: 'Gujarat HC', kind: 'High Court', court: 'gujarat-high-court', note: 'Sola, Ahmedabad. The High Court for the State of Gujarat.' },
      { name: 'City Civil and Sessions Court, Bhadra', short: 'Bhadra Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil and sessions courts for Ahmedabad city, with metropolitan magistrates’ courts for criminal work and separate courts for Ahmedabad (Rural) district.' },
      { name: 'NCLT Ahmedabad Bench', short: 'NCLT Ahmedabad', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for Gujarat.' },
      { name: 'DRTs, Ahmedabad', short: 'DRT Ahmedabad', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications for the region.' },
      { name: 'Gujarat consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and the Ahmedabad district commissions.' }
    ],
    barNotes: [
      'Negotiable Instruments Act complaints under section 138 are a high-volume part of magistrate practice, with strict notice and complaint timelines.',
      'Commercial and recovery work is heavy, and many matters run in parallel before civil courts, the DRT and the NCLT.',
      'The Gujarat High Court Advocates’ Association and the city bar associations are the main bar bodies chambers deal with.',
      'Sola and Bhadra are on opposite sides of the city, so one advocate rarely covers both on a busy morning.'
    ],
    benefits: [
      { title: 'Cheque-bounce timelines on rails', text: 'Work out notice and complaint deadlines with the free section 138 calculator, then track each complaint’s hearings on the diary.' },
      { title: 'Sola and Bhadra on one board', text: 'See who covers the High Court and who covers the city court every morning, with clashes flagged in advance.' },
      { title: 'GST invoices per matter', text: 'Raise per-matter invoices with GST for corporate clients and keep billing next to the case, not in a separate ledger.' }
    ],
    faqs: [
      { q: 'Can Legal Staff help with section 138 NI Act complaints?', a: 'Yes. Use the free section 138 timeline calculator for notice and complaint dates, draft notices from templates in the Drafting Studio, and track each complaint’s hearings on the diary. Check the Act before relying on any date.' },
      { q: 'Does it cover Gujarat High Court matters?', a: 'Yes. Add the matter, upload orders and confirm the next date. The diary also covers city courts, the NCLT and DRTs.' },
      { q: 'Can I bill clients per hearing or per matter?', a: 'Legal Staff creates per-matter invoices with GST. Many chambers record appearances as line items on those invoices.' },
      { q: 'Can I draft a legal notice inside Legal Staff?', a: 'Yes. The Drafting Studio includes templates for legal notices and section 138 notices, with versions and DOCX/PDF export.' }
    ],
    nearby: ['mumbai', 'jodhpur', 'indore'],
    features: ['digital-advocate-diary', 'chamber-team-collaboration', 'ai-court-order-reader'],
    blogs: ['section-138-ni-act-cheque-bounce-limitation-calculator-guide', 'per-hearing-appearance-billing-retainer-invoicing-indian-advocates']
  },
  {
    slug: 'pune', name: 'Pune', state: 'Maharashtra', title: T('Pune'), metaTitle: M('Pune'),
    metaDescription: 'Practice management for Pune advocates at the Shivajinagar district court, DRT Pune and Bombay High Court: orders read, dates confirmed, WhatsApp reminders.',
    intro: [
      'Pune is one of Maharashtra’s largest district-court practices, centred on the Shivajinagar court complex. Many chambers also carry appeals and writs before the Bombay High Court in Mumbai, so the week is split between local trial work and a trip down the expressway.',
      'Legal Staff keeps both halves in one diary. Orders from the district court and the High Court are read and summarised, next dates wait for confirmation, and Mumbai days are visible early enough to plan travel. Juniors handling local matters get WhatsApp reminders while the senior is in Mumbai.'
    ],
    courts: [
      { name: 'Bombay High Court (Mumbai)', short: 'Bombay HC', kind: 'High Court', court: 'bombay-high-court', note: 'Pune falls within the jurisdiction of the principal seat at Mumbai; there is no High Court bench in Pune.' },
      { name: 'District and Sessions Court, Shivajinagar', short: 'Shivajinagar Ct', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions and commercial courts for Pune district, with taluka courts across the district and a separate family court.' },
      { name: 'DRT Pune', short: 'DRT Pune', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI matters for the region.' },
      { name: 'NCLT Mumbai Bench', short: 'NCLT Mumbai', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for Pune companies are heard at the Mumbai Bench.' },
      { name: 'Pune district consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'District-level consumer complaints, many involving real estate and vehicles.' }
    ],
    barNotes: [
      'The Pune Bar Association is one of the larger district bar bodies in the state, and the Shivajinagar complex is busy from early morning.',
      'Industrial, labour and employment matters reflect the region’s manufacturing and technology base.',
      'Property, cooperative-housing and real-estate disputes are frequent in a fast-growing city.',
      'Mumbai days for High Court and NCLT matters need to be planned around local trial dates.'
    ],
    benefits: [
      { title: 'Mumbai days planned in advance', text: 'High Court and NCLT dates show on the same diary as Shivajinagar hearings, with reminders two days before so travel can be fixed.' },
      { title: 'Juniors cover local dates', text: 'Reassign a district-court hearing to a junior when you are in Mumbai; they get the matter, the last order summary and a WhatsApp reminder.' },
      { title: 'Housing-society files in one place', text: 'Keep society resolutions, agreements and orders in each case vault so repeat clients’ histories are a click away.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Pune district court matters?', a: 'Yes. Add the matter, upload each order and confirm the next date. CNR-based import is available where a court-data provider is connected.' },
      { q: 'Can I keep my Bombay High Court matters in the same diary?', a: 'Yes. The diary covers every forum, and clash detection flags a Pune hearing and a Mumbai hearing on the same morning.' },
      { q: 'Can my junior see the last order before the hearing?', a: 'Yes. Each matter shows its orders and summaries, and AI Case Brain can draft a hearing brief from the case’s own documents for the junior to review.' },
      { q: 'Does it work without internet in court?', a: 'Legal Staff is a web app and needs a connection. It works in mobile browsers; you can also export the diary to .ics for your phone calendar.' }
    ],
    nearby: ['mumbai', 'nagpur', 'bengaluru'],
    features: ['digital-advocate-diary', 'chamber-team-collaboration', 'ai-legal-research-workspace'],
    blogs: ['managing-junior-advocates-court-clerks-daily-board-task-software', 'switch-from-physical-advocate-diary-to-cloud-case-workspace']
  },
  {
    slug: 'patna', name: 'Patna', state: 'Bihar', title: T('Patna'), metaTitle: M('Patna'),
    metaDescription: 'Court diary for Patna advocates at the Patna High Court, Patna civil court, DRT and consumer commissions: orders read, next dates confirmed, WhatsApp alerts.',
    intro: [
      'The Patna High Court serves the whole of Bihar, and advocates and litigants travel to it from every district. Bail matters, service disputes and writs against state authorities fill the lists, while the Patna civil court complex and tribunals keep local chambers busy the rest of the week.',
      'Legal Staff gives a Patna chamber one dependable record. Upload or paste the order, check the summary and the next date it found, confirm, and the diary carries it. Clients in distant districts can be sent updates, and juniors watching the board get WhatsApp reminders.'
    ],
    courts: [
      { name: 'Patna High Court', short: 'Patna HC', kind: 'High Court', court: 'patna-high-court', note: 'Patna. The High Court for the State of Bihar.' },
      { name: 'Civil Court, Patna', short: 'Civil Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'The district and sessions courts for Patna, with civil, criminal and family courts.' },
      { name: 'DRT Patna', short: 'DRT Patna', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications for Bihar.' },
      { name: 'Bihar consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and the Patna district commission.' },
      { name: 'NCLT (Kolkata Bench)', short: 'NCLT Kolkata', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters from Bihar are generally heard by the NCLT Kolkata Bench; check the current territorial notification.' }
    ],
    barNotes: [
      'Bail applications, anticipatory bail and criminal miscellaneous petitions form a large share of High Court work.',
      'Service matters involving state employees and teachers are a recurring category.',
      'The High Court’s advocates’ associations and the civil court bar are the main bar bodies in the city.',
      'Clients often travel from distant districts, so a clear next date shared after each hearing saves wasted trips.'
    ],
    benefits: [
      { title: 'Bail lists that move fast', text: 'Record each bail matter and the order that listed it; the next date goes on the diary the moment you confirm it.' },
      { title: 'Updates for clients across Bihar', text: 'Share the next date and a plain summary with clients so they travel only when they need to.' },
      { title: 'Juniors with the right file', text: 'Assign hearings to juniors with the last order attached, so the person in court has what they need.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Patna High Court matters?', a: 'Yes. Add the case, upload orders as they come and confirm the next date Legal Staff reads. CNR-based import is available where a court-data provider is connected.' },
      { q: 'Can I draft a bail application in Legal Staff?', a: 'Yes. The Drafting Studio has a bail application template, with dictation, versions and DOCX/PDF export. Drafts must be reviewed by an advocate.' },
      { q: 'Can I convert IPC and CrPC sections to BNS and BNSS?', a: 'Use the free section converter for IPC to BNS, CrPC to BNSS and Evidence Act to BSA. Remember the new codes apply from 1 July 2024; older offences may still be governed by the old codes.' },
      { q: 'Can clients receive updates in WhatsApp?', a: 'Yes, once your chamber connects the WhatsApp Business API. Email updates work without it.' }
    ],
    nearby: ['ranchi', 'kolkata', 'prayagraj', 'dhanbad'],
    features: ['whatsapp-hearing-reminders', 'ai-court-order-reader', 'chamber-team-collaboration'],
    blogs: ['ipc-to-bns-crpc-to-bnss-bsa-section-conversion-chart-advocates', 'drafting-written-statements-bail-applications-faster-ai-workspace', 'automated-whatsapp-court-hearing-reminders-advocates-clients']
  },
  {
    slug: 'ranchi', name: 'Ranchi', state: 'Jharkhand', title: T('Ranchi'), metaTitle: M('Ranchi'),
    metaDescription: 'Practice management for Ranchi advocates at the Jharkhand High Court and Ranchi civil court: order reading, one court diary and WhatsApp hearing reminders.',
    intro: [
      'Ranchi is the seat of the Jharkhand High Court, which hears matters from every district of the state, including the mining and industrial belts of Dhanbad, Bokaro and Jamshedpur. Chambers here combine High Court writs and appeals with civil-court work in Ranchi and outstation trial dates.',
      'Legal Staff gives that practice one diary. Orders are read and summarised, the next date waits for your confirmation, and hearings from Ranchi and the districts sit side by side. Clash detection catches a High Court listing that overlaps with a trial date elsewhere before it becomes a problem.'
    ],
    courts: [
      { name: 'Jharkhand High Court', short: 'Jharkhand HC', kind: 'High Court', court: 'jharkhand-high-court', note: 'Ranchi, now at its new campus in Dhurwa. The High Court for the State of Jharkhand, set up in 2000.' },
      { name: 'Civil Court, Ranchi', short: 'Civil Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'District and sessions courts for Ranchi, including civil, criminal and family courts.' },
      { name: 'Jharkhand consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission sits in Ranchi alongside the district commission.' },
      { name: 'NCLT (Kolkata Bench)', short: 'NCLT Kolkata', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters from Jharkhand are generally heard by the NCLT Kolkata Bench; check the current notification.' }
    ],
    barNotes: [
      'Land disputes, including those involving tenancy laws specific to the region, are a significant part of civil and writ practice.',
      'Mining, industrial and public-sector employment matters reach the High Court from across the state.',
      'The Jharkhand High Court Advocates’ Association and the Ranchi District Bar Association are the main bar bodies.',
      'Advocates often travel to district courts in the coal and steel belt, so one diary across districts matters.'
    ],
    benefits: [
      { title: 'High Court and districts together', text: 'See a Dhurwa listing and a trial date in another district on one calendar, with clashes flagged.' },
      { title: 'Land records in the case vault', text: 'Keep khatiyan copies, maps and mutation orders with exhibit marks so writs and suits have their records ready.' },
      { title: 'Next dates confirmed, not guessed', text: 'Every date comes from an order you uploaded, with the paragraph it came from, and waits for your confirmation.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Jharkhand High Court matters?', a: 'Yes. Add the matter, upload orders and confirm next dates. The diary also covers district courts across Jharkhand.' },
      { q: 'Can I track matters in Dhanbad and Bokaro courts from Ranchi?', a: 'Yes. Add any district court as the forum; all hearings appear on one diary with clash detection.' },
      { q: 'Does it check the High Court website for me?', a: 'No. Legal Staff does not scrape court websites. It reads the orders you provide and proposes the next date for confirmation.' },
      { q: 'Is my data safe?', a: 'Each firm’s data is isolated with row-level security, documents are kept in private storage, and sign-in is through Google.' }
    ],
    nearby: ['bokaro', 'dhanbad', 'patna', 'kolkata'],
    features: ['digital-advocate-diary', 'case-document-management', 'ai-court-order-reader'],
    blogs: ['track-cases-district-court-high-court-nclt-single-dashboard', 'how-ai-reads-indian-court-orders-extracts-next-hearing-dates']
  },
  {
    slug: 'jaipur', name: 'Jaipur', state: 'Rajasthan', title: T('Jaipur'), metaTitle: M('Jaipur'),
    metaDescription: 'Case management for Jaipur advocates at the Rajasthan High Court Jaipur Bench, district courts, NCLT and DRT, with order reading and WhatsApp reminders.',
    intro: [
      'Jaipur hosts the Jaipur Bench of the Rajasthan High Court, whose principal seat is in Jodhpur. As the state capital it also draws tribunal, revenue and service litigation, and the Jaipur Metropolitan and Jaipur District courts carry a large trial docket.',
      'Legal Staff helps a Jaipur chamber run all of this from one board. Orders are read and summarised, next dates are confirmed by an advocate, and matters that must go to Jodhpur appear well in advance. Juniors get WhatsApp reminders for each hearing they are assigned.'
    ],
    courts: [
      { name: 'Rajasthan High Court, Jaipur Bench', short: 'Raj HC Jaipur', kind: 'High Court', note: 'Jaipur. The principal seat of the Rajasthan High Court is at Jodhpur; the Jaipur Bench hears matters from the districts assigned to it.' },
      { name: 'Jaipur district courts', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', places: ['Jaipur Metropolitan', 'Jaipur District'], note: 'Separate judgeships for the city and the surrounding district.' },
      { name: 'NCLT Jaipur Bench', short: 'NCLT Jaipur', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for Rajasthan.' },
      { name: 'DRT Jaipur', short: 'DRT Jaipur', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications.' },
      { name: 'Rajasthan consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and the Jaipur district commissions.' }
    ],
    barNotes: [
      'Service matters and writs against the state government are prominent because the capital’s departments are here.',
      'Some matters must be heard at the principal seat in Jodhpur, so chambers plan occasional trips across the state.',
      'The High Court Bar Association at the Jaipur Bench and the district bar associations are the main bar bodies.',
      'Revenue and land disputes move between revenue courts, civil courts and the High Court.'
    ],
    benefits: [
      { title: 'Jaipur and Jodhpur on one calendar', text: 'Matters before either seat of the High Court appear together, with travel days visible early.' },
      { title: 'Service files complete', text: 'Keep service records, representations and departmental orders in each case vault for quick reference at hearing.' },
      { title: 'Hearing briefs from the record', text: 'AI Case Brain drafts a hearing brief from the case’s own orders and documents, with citations, for an advocate to review.' }
    ],
    faqs: [
      { q: 'Does Legal Staff support Rajasthan High Court Jaipur Bench matters?', a: 'Yes. Record the bench with each matter; hearings at Jaipur and Jodhpur appear on the same diary.' },
      { q: 'Can it draft a writ petition?', a: 'The Drafting Studio includes a petition template you can adapt, with versions and DOCX/PDF export. Drafts must be reviewed by an advocate.' },
      { q: 'Can I use it for revenue court matters?', a: 'Yes. Add any forum as the court; orders, documents and reminders work the same way.' },
      { q: 'Does Legal Staff give legal advice?', a: 'No. It is software for managing your practice. AI output is drawn from your case documents and must be reviewed by an advocate.' }
    ],
    nearby: ['jodhpur', 'delhi', 'ahmedabad', 'indore'],
    features: ['ai-legal-research-workspace', 'digital-advocate-diary', 'case-document-management'],
    blogs: ['ai-legal-research-supreme-court-high-court-without-hallucinations', 'summarize-charge-sheets-arbitral-awards-judgments-ai-india']
  },
  {
    slug: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', title: T('Lucknow'), metaTitle: M('Lucknow'),
    metaDescription: 'Court diary for Lucknow advocates at the Allahabad High Court Lucknow Bench, district courts, CAT and UP RERA: orders read, dates confirmed, WhatsApp alerts.',
    intro: [
      'Lucknow has the Lucknow Bench of the Allahabad High Court at Gomti Nagar, and as the state capital it is also home to the UP State Consumer Commission, UP RERA and a CAT bench. Writs against state departments, service matters and real-estate complaints sit alongside a busy district-court practice.',
      'Legal Staff gives a Lucknow chamber one diary across these forums. Upload an order, read its summary, confirm the next date, and the hearing is on the board for the whole team. When a matter must go to the principal seat at Prayagraj, it shows up with enough notice to plan.'
    ],
    courts: [
      { name: 'Allahabad High Court, Lucknow Bench', short: 'HC Lucknow', kind: 'High Court', court: 'allahabad-high-court', note: 'Gomti Nagar, Lucknow. Hears matters from the districts assigned to the bench, broadly the Awadh region; the principal seat is at Prayagraj.' },
      { name: 'District and Sessions Court, Lucknow', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions, family and special courts for Lucknow district.' },
      { name: 'UP State Consumer Commission', short: 'State Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The state-level consumer commission sits in Lucknow, along with the district commissions.' },
      { name: 'UP RERA', short: 'UP RERA', kind: 'Tribunal', court: 'rera-tribunals', note: 'The Uttar Pradesh Real Estate Regulatory Authority is headquartered in Lucknow.' },
      { name: 'CAT and DRT, Lucknow', short: 'CAT Lucknow', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'A Central Administrative Tribunal bench and a Debt Recovery Tribunal sit in Lucknow.' }
    ],
    barNotes: [
      'Service matters for state and central employees are a major category, both in the High Court and before the CAT.',
      'Homebuyer complaints reach both UP RERA and the consumer commissions, so the same project can generate matters in two forums.',
      'The Awadh Bar Association at the Lucknow Bench and the district bar associations are the main bar bodies.',
      'Some matters need to be heard at Prayagraj, which means coordinating with counsel or travelling there.'
    ],
    benefits: [
      { title: 'RERA and consumer in one client file', text: 'Group a homebuyer’s RERA complaint and consumer complaint under one client with separate diaries and shared documents.' },
      { title: 'Lucknow and Prayagraj together', text: 'Matters before either seat of the High Court appear on one diary with clash detection.' },
      { title: 'Service-matter tasks with due dates', text: 'Assign juniors to collect records and prepare replies with due dates, visible on the chamber board.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Allahabad High Court Lucknow Bench matters?', a: 'Yes. Record the bench with each matter; Lucknow and Prayagraj hearings appear on the same diary.' },
      { q: 'Can I track UP RERA complaints?', a: 'Yes. Add RERA matters like any other case, with orders, documents, reminders and client updates.' },
      { q: 'Can juniors be reminded of hearings at the CAT?', a: 'Yes. Assign the hearing and the junior receives WhatsApp and email reminders two days before and on the morning of the hearing.' },
      { q: 'Does it work for district court matters in nearby districts?', a: 'Yes. Any court can be added as the forum.' }
    ],
    nearby: ['prayagraj', 'delhi', 'dehradun', 'patna'],
    features: ['chamber-team-collaboration', 'digital-advocate-diary', 'whatsapp-hearing-reminders'],
    blogs: ['track-cases-district-court-high-court-nclt-single-dashboard', 'automated-whatsapp-court-hearing-reminders-advocates-clients']
  },
  {
    slug: 'kochi', name: 'Kochi', state: 'Kerala', title: T('Kochi'), metaTitle: M('Kochi'),
    metaDescription: 'Practice management for Kochi advocates at the Kerala High Court in Ernakulam, district courts, NCLT Kochi and DRT: orders read and WhatsApp reminders.',
    intro: [
      'The Kerala High Court sits at Ernakulam in Kochi and also has jurisdiction over Lakshadweep. Its bar is known for heavy writ practice, and many chambers balance High Court work with matters in Ernakulam district courts and the NCLT and DRTs in the city.',
      'Legal Staff gives a Kochi chamber a single, shared diary. Orders are read and summarised with paragraph references; next dates are proposed and confirmed; and juniors receive WhatsApp reminders. Documents for each matter sit in a private vault rather than in a dozen inboxes.'
    ],
    courts: [
      { name: 'Kerala High Court', short: 'Kerala HC', kind: 'High Court', note: 'Ernakulam, Kochi. The High Court for Kerala and the Union Territory of Lakshadweep.' },
      { name: 'Ernakulam district courts', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions, family and special courts for Ernakulam district.' },
      { name: 'NCLT Kochi Bench', short: 'NCLT Kochi', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for Kerala and Lakshadweep.' },
      { name: 'DRTs, Ernakulam', short: 'DRT Ernakulam', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications.' },
      { name: 'Ernakulam district consumer commission', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'District-level consumer complaints; the Kerala State Commission sits in Thiruvananthapuram.' }
    ],
    barNotes: [
      'Writ petitions against public authorities and local bodies are a large part of High Court practice.',
      'The Kerala High Court Advocates’ Association and the Ernakulam bar are the main bar bodies.',
      'Shipping, port-related and commercial matters reflect Kochi’s role as a port city.',
      'Families abroad often follow cases remotely, so clear updates after each hearing are valued.'
    ],
    benefits: [
      { title: 'Writ volume, organised', text: 'Each writ has its orders, counter-affidavits and annexures in one vault with next dates confirmed from the orders.' },
      { title: 'Clients overseas kept in the loop', text: 'Share updates and selected documents through the client portal, so clients in the Gulf or elsewhere do not need to call.' },
      { title: 'Templates for replies and affidavits', text: 'Draft replies and affidavits from templates with dictation and versions, exported to DOCX or PDF.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Kerala High Court matters?', a: 'Yes. Add the case, upload orders, and confirm the next date. It works for any court or tribunal.' },
      { q: 'Can clients abroad see their case?', a: 'Yes. Share selected matters through the client portal, and send updates by email or WhatsApp once connected.' },
      { q: 'Does it store documents securely?', a: 'Documents are kept in private storage and each firm’s data is isolated with row-level security.' },
      { q: 'Is there a free trial?', a: 'You can start free from the pricing section on the home page, or book a demo to see it with your own matters.' }
    ],
    nearby: ['chennai', 'bengaluru', 'hyderabad'],
    features: ['case-document-management', 'whatsapp-hearing-reminders', 'ai-court-order-reader'],
    blogs: ['automated-client-case-status-court-order-updates-on-whatsapp', 'client-confidentiality-secure-ai-workspace-vs-chatgpt-law-firms']
  },
  {
    slug: 'indore', name: 'Indore', state: 'Madhya Pradesh', title: T('Indore'), metaTitle: M('Indore'),
    metaDescription: 'Case management for Indore advocates at the MP High Court Indore Bench, district court and commercial courts, with order reading and WhatsApp reminders.',
    intro: [
      'Indore is Madhya Pradesh’s commercial hub and hosts a bench of the Madhya Pradesh High Court; the principal seat is at Jabalpur and another bench sits at Gwalior. Trading and manufacturing businesses generate commercial suits, cheque-bounce complaints and company matters alongside regular criminal and civil work.',
      'Legal Staff keeps an Indore chamber’s forums in one diary. Orders are read and their next dates confirmed, section 138 complaints can be tracked against their timelines, and the chamber board shows who is at the High Court and who is at the district court each morning.'
    ],
    courts: [
      { name: 'Madhya Pradesh High Court, Indore Bench', short: 'MP HC Indore', kind: 'High Court', note: 'Indore. The principal seat is at Jabalpur; a further bench sits at Gwalior.' },
      { name: 'District and Sessions Court, Indore', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions, commercial and family courts for Indore district.' },
      { name: 'NCLT Indore Bench', short: 'NCLT Indore', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'An NCLT bench sits in Indore for Madhya Pradesh matters; check the current territorial notification.' },
      { name: 'Indore district consumer commission', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'District-level consumer complaints; the State Commission sits in Bhopal.' }
    ],
    barNotes: [
      'Cheque-bounce complaints under section 138 are a high-volume part of magistrate practice in a trading city.',
      'Commercial suits and recovery matters run alongside company and insolvency work.',
      'The High Court Bar Association at the Indore Bench and the district bar association are the main bar bodies.',
      'Some matters need the principal seat at Jabalpur, so chambers coordinate with counsel or travel.'
    ],
    benefits: [
      { title: 'Section 138 matters in bulk', text: 'Calculate notice and complaint deadlines with the free calculator and track each complaint’s hearings and orders on the diary.' },
      { title: 'Indore and Jabalpur together', text: 'Matters before either seat appear on one diary with clash detection and reminders.' },
      { title: 'Invoices beside the case', text: 'Raise GST invoices per matter for business clients without a separate billing tool.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for MP High Court Indore Bench matters?', a: 'Yes. Record the bench with each matter; hearings at Indore, Jabalpur and Gwalior can sit on one diary.' },
      { q: 'Can I manage many section 138 complaints at once?', a: 'Yes. Each complaint is a matter with its own orders and hearings, and the free section 138 calculator helps with notice and complaint deadlines. Check the Act before relying on any date.' },
      { q: 'Can I export my diary?', a: 'Yes, to .ics for phone and desktop calendars.' },
      { q: 'Does it need installation?', a: 'No. Legal Staff runs in the browser on desktop and mobile; there is no native app.' }
    ],
    nearby: ['nagpur', 'ahmedabad', 'jaipur', 'bilaspur'],
    features: ['digital-advocate-diary', 'chamber-team-collaboration', 'case-document-management'],
    blogs: ['section-138-ni-act-cheque-bounce-limitation-calculator-guide', 'per-hearing-appearance-billing-retainer-invoicing-indian-advocates']
  },
  {
    slug: 'nagpur', name: 'Nagpur', state: 'Maharashtra', title: T('Nagpur'), metaTitle: M('Nagpur'),
    metaDescription: 'Practice management for Nagpur advocates at the Bombay High Court Nagpur Bench and district court: orders read, next dates confirmed, WhatsApp reminders.',
    intro: [
      'Nagpur is home to the Nagpur Bench of the Bombay High Court, which hears matters from the Vidarbha region. Chambers here combine High Court writs and appeals with district-court practice, and many clients travel in from other Vidarbha districts for hearings.',
      'Legal Staff gives a Nagpur chamber one diary for the bench and the trial courts. Orders are summarised and their next dates confirmed; juniors get WhatsApp reminders; and clients who live hours away can be sent the next date after every hearing.'
    ],
    courts: [
      { name: 'Bombay High Court, Nagpur Bench', short: 'HC Nagpur', kind: 'High Court', court: 'bombay-high-court', note: 'Nagpur. Hears matters from the Vidarbha districts; the principal seat is in Mumbai.' },
      { name: 'District and Sessions Court, Nagpur', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions, family and special courts for Nagpur district.' },
      { name: 'Nagpur district consumer commission', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'District-level consumer complaints.' },
      { name: 'NCLT Mumbai Bench', short: 'NCLT Mumbai', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters from Maharashtra are generally heard in Mumbai.' }
    ],
    barNotes: [
      'Agricultural land, irrigation and acquisition disputes reach the bench from across Vidarbha.',
      'Criminal appeals and bail matters are a large part of the bench’s work.',
      'The High Court Bar Association at Nagpur and the District Bar Association are the main bar bodies.',
      'Mumbai trips for NCLT or principal-seat matters need planning around local dates.'
    ],
    benefits: [
      { title: 'Clients from across Vidarbha', text: 'Send the next date and a short summary after each hearing so clients travel only when needed.' },
      { title: 'Bench and trial court on one board', text: 'See High Court and district-court hearings together, with clashes flagged in advance.' },
      { title: 'Acquisition files in order', text: 'Keep notifications, award copies and orders in each case vault with exhibit marks.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Bombay High Court Nagpur Bench matters?', a: 'Yes. Record the bench with each matter; the diary covers every forum, including Mumbai and district courts.' },
      { q: 'Can I send hearing updates to clients in other districts?', a: 'Yes. Share updates by email, or WhatsApp once your chamber connects the WhatsApp Business API, and give clients portal access to selected matters.' },
      { q: 'How does the limitation tracker work?', a: 'It calculates by rule, shows each exclusion it applied, and needs an advocate’s approval before alerts go out.' },
      { q: 'Can I move my existing paper diary?', a: 'Yes. Add matters once, then upload each new order; most chambers move active matters first. A demo can help plan the move.' }
    ],
    nearby: ['mumbai', 'pune', 'bilaspur', 'indore'],
    features: ['whatsapp-hearing-reminders', 'digital-advocate-diary', 'case-document-management'],
    blogs: ['switch-from-physical-advocate-diary-to-cloud-case-workspace', 'automated-client-case-status-court-order-updates-on-whatsapp']
  },
  {
    slug: 'guwahati', name: 'Guwahati', state: 'Assam', title: T('Guwahati'), metaTitle: M('Guwahati'),
    metaDescription: 'Court diary for Guwahati advocates at the Gauhati High Court, Kamrup Metro courts, NCLT and DRT Guwahati: orders read, dates confirmed, WhatsApp reminders.',
    intro: [
      'The Gauhati High Court has its principal seat in Guwahati and serves Assam, Nagaland, Mizoram and Arunachal Pradesh, with benches at Kohima, Aizawl and Itanagar. A Guwahati chamber can carry matters from four states, often for clients who live far from the city.',
      'Legal Staff helps keep that wide practice organised. Orders from the principal seat, the outlying benches and the district courts are read and summarised; the next date is confirmed by an advocate; and clients and juniors receive reminders before every hearing.'
    ],
    courts: [
      { name: 'Gauhati High Court (principal seat)', short: 'Gauhati HC', kind: 'High Court', note: 'Guwahati. Common High Court for Assam, Nagaland, Mizoram and Arunachal Pradesh, with benches at Kohima, Aizawl and Itanagar.' },
      { name: 'Kamrup Metropolitan district courts', short: 'Kamrup Metro', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions and family courts for the Guwahati area.' },
      { name: 'NCLT Guwahati Bench', short: 'NCLT Guwahati', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for the north-eastern states.' },
      { name: 'DRT Guwahati', short: 'DRT Guwahati', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications for the region.' },
      { name: 'Assam consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and Kamrup district commissions.' }
    ],
    barNotes: [
      'Matters from four states mean that the same chamber may track different state laws and authorities side by side.',
      'Land, citizenship-related and service matters are recurring categories before the High Court.',
      'The Gauhati High Court Bar Association and the Kamrup bar associations are the main bar bodies.',
      'Clients may live a long journey away, so clear communication after each hearing matters.'
    ],
    benefits: [
      { title: 'Four states, one diary', text: 'Matters before the principal seat and the benches at Kohima, Aizawl and Itanagar appear together with clash detection.' },
      { title: 'Distant clients informed', text: 'Share the next date and a plain summary with clients after each hearing, by email or WhatsApp once connected.' },
      { title: 'Records kept together', text: 'Keep each matter’s documents, certified copies and orders in a private vault.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Gauhati High Court bench matters?', a: 'Yes. Record the bench with each matter; Guwahati, Kohima, Aizawl and Itanagar hearings appear on one diary.' },
      { q: 'Can I add tribunal matters?', a: 'Yes. NCLT, DRT and consumer matters are added like any other case.' },
      { q: 'Can my team access the diary from different cities?', a: 'Yes. Legal Staff is a web app, so team members sign in from wherever they are and see the same board.' },
      { q: 'Does the AI research tool replace a case-law database?', a: 'No. AI Legal Research provides searchable reference notes on provisions. It is not a full case-law database.' }
    ],
    nearby: ['kolkata', 'patna', 'cuttack'],
    features: ['digital-advocate-diary', 'whatsapp-hearing-reminders', 'chamber-team-collaboration'],
    blogs: ['automated-whatsapp-court-hearing-reminders-advocates-clients', 'track-cases-district-court-high-court-nclt-single-dashboard']
  },
  {
    slug: 'cuttack', name: 'Cuttack', state: 'Odisha', title: T('Cuttack'), metaTitle: M('Cuttack'),
    metaDescription: 'Practice management for Cuttack advocates at the Orissa High Court, district courts, NCLT and DRT Cuttack: orders read, dates confirmed, WhatsApp reminders.',
    intro: [
      'Cuttack is the seat of the Orissa High Court, while Bhubaneswar, the state capital, is a short drive away. Many advocates live in one city and practise in the other, and chambers combine High Court work with district courts and tribunals in both.',
      'Legal Staff gives that twin-city practice one diary. Orders are summarised, next dates confirmed, and hearings in Cuttack and Bhubaneswar sit on one board. Clash detection shows when a High Court listing overlaps with a matter across the river, so a junior can be sent in time.'
    ],
    courts: [
      { name: 'Orissa High Court', short: 'Orissa HC', kind: 'High Court', note: 'Cuttack. The High Court for the State of Odisha.' },
      { name: 'District and Sessions Court, Cuttack', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions and family courts for Cuttack district; Khordha district courts serve Bhubaneswar.' },
      { name: 'NCLT Cuttack Bench', short: 'NCLT Cuttack', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters for Odisha and nearby states.' },
      { name: 'DRT Cuttack', short: 'DRT Cuttack', kind: 'Tribunal', court: 'drt-debt-recovery-tribunal', note: 'Recovery and SARFAESI applications.' },
      { name: 'Odisha consumer commissions', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The State Commission and district commissions.' }
    ],
    barNotes: [
      'The twin-city commute between Cuttack and Bhubaneswar shapes many advocates’ day.',
      'Mining, land acquisition and service matters reach the High Court from across the state.',
      'The Orissa High Court Bar Association and the Cuttack bar are the main bar bodies.',
      'Industrial clients bring company and recovery work to the NCLT and DRT.'
    ],
    benefits: [
      { title: 'Twin-city diary', text: 'See Cuttack and Bhubaneswar hearings together and spot overlaps before the day starts.' },
      { title: 'Order summaries for long judgments', text: 'Read the summary of a long order with paragraph references, then confirm the next date it found.' },
      { title: 'Juniors covering the other city', text: 'Reassign a hearing in the other city to a junior; they get the matter details and WhatsApp reminders.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Orissa High Court matters?', a: 'Yes. Add the matter, upload orders and confirm next dates. It works for district courts and tribunals too.' },
      { q: 'Can I see Bhubaneswar and Cuttack hearings together?', a: 'Yes. All hearings sit on one diary regardless of court, with clash detection.' },
      { q: 'Can it summarise a long judgment?', a: 'Yes. Upload the judgment or order and Legal Staff summarises it with paragraph references. An advocate should review the summary before relying on it.' },
      { q: 'Can I calculate limitation for an appeal?', a: 'Use the free limitation calculator, which shows exclusions such as time for a certified copy. Always check the bare Act.' }
    ],
    nearby: ['kolkata', 'ranchi', 'bilaspur'],
    features: ['ai-court-order-reader', 'digital-advocate-diary', 'chamber-team-collaboration'],
    blogs: ['summarize-charge-sheets-arbitral-awards-judgments-ai-india', 'section-12-limitation-act-excluding-certified-copy-days-calculation']
  },
  {
    slug: 'jodhpur', name: 'Jodhpur', state: 'Rajasthan', title: T('Jodhpur'), metaTitle: M('Jodhpur'),
    metaDescription: 'Case management for Jodhpur advocates at the Rajasthan High Court principal seat and district courts: orders read, next dates confirmed, WhatsApp reminders.',
    intro: [
      'Jodhpur is the principal seat of the Rajasthan High Court, with a bench at Jaipur. Advocates here handle matters from the western districts of the state, from land and water disputes to criminal appeals and service matters, and many clients travel long distances for a hearing.',
      'Legal Staff gives a Jodhpur chamber one dependable record. Upload each order, read the summary, confirm the next date and the hearing is on the board. Matters before the Jaipur Bench appear on the same diary, and clients can be sent the next date after every hearing.'
    ],
    courts: [
      { name: 'Rajasthan High Court (principal seat)', short: 'Raj HC Jodhpur', kind: 'High Court', note: 'Jodhpur. The Jaipur Bench hears matters from the districts assigned to it.' },
      { name: 'Jodhpur district courts', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', places: ['Jodhpur Metropolitan', 'Jodhpur District'], note: 'Separate judgeships for the city and the surrounding district.' },
      { name: 'CAT Jodhpur Bench', short: 'CAT Jodhpur', kind: 'Tribunal', note: 'A Central Administrative Tribunal bench sits in Jodhpur for central-service matters.' },
      { name: 'Jodhpur district consumer commission', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'District-level consumer complaints.' }
    ],
    barNotes: [
      'Clients from western Rajasthan often travel far, which makes a clear next date after every hearing especially useful.',
      'Land, water and revenue disputes are recurring categories, alongside criminal appeals.',
      'The Rajasthan High Court Advocates’ Association and the district bar associations are the main bar bodies.',
      'Some chambers also appear before the Jaipur Bench and coordinate with counsel there.'
    ],
    benefits: [
      { title: 'Principal seat and bench together', text: 'Jodhpur and Jaipur hearings appear on one diary, with clash detection and reminders.' },
      { title: 'Next dates sent to clients', text: 'Share the next date and a short summary with clients after each hearing.' },
      { title: 'Revenue records ready for hearing', text: 'Keep jamabandi copies, maps and revenue orders in each case vault with exhibit marks.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Rajasthan High Court matters at Jodhpur?', a: 'Yes. Add the matter, upload orders and confirm next dates. Jaipur Bench matters sit on the same diary.' },
      { q: 'Can I track CAT matters?', a: 'Yes. Add the CAT as the forum; orders, documents and reminders work the same way.' },
      { q: 'Can I give a junior access only to their matters?', a: 'You can assign hearings and tasks to each junior and they see what is assigned to them on the board. Roles are set per team member.' },
      { q: 'Can I manage matters from several western Rajasthan districts?', a: 'Yes. Add each district court as the forum for its matters. Every hearing appears on one diary with its court, so outstation dates are visible next to your High Court list.' }
    ],
    nearby: ['jaipur', 'ahmedabad', 'delhi'],
    features: ['digital-advocate-diary', 'case-document-management', 'whatsapp-hearing-reminders'],
    blogs: ['automated-client-case-status-court-order-updates-on-whatsapp', 'how-ai-reads-indian-court-orders-extracts-next-hearing-dates']
  },
  {
    slug: 'bilaspur', name: 'Bilaspur', state: 'Chhattisgarh', title: T('Bilaspur'), metaTitle: M('Bilaspur'),
    metaDescription: 'Practice management for Bilaspur advocates at the Chhattisgarh High Court and district courts: orders read, next dates confirmed and WhatsApp reminders.',
    intro: [
      'Bilaspur is the seat of the Chhattisgarh High Court, while the state capital and many government offices are in Raipur. Advocates in both cities shuttle between them, and High Court practice here covers writs, service matters, land disputes and criminal appeals from across the state.',
      'Legal Staff gives that practice one diary. Orders are read and their next dates confirmed; hearings in Bilaspur and Raipur sit on one board; and juniors receive WhatsApp reminders so a matter is never left unattended while the senior is on the road.'
    ],
    courts: [
      { name: 'Chhattisgarh High Court', short: 'CG High Court', kind: 'High Court', note: 'Bilaspur. The High Court for the State of Chhattisgarh, set up in 2000.' },
      { name: 'District and Sessions Court, Bilaspur', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions and family courts for Bilaspur district.' },
      { name: 'Raipur courts and commissions', short: 'Raipur Courts', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Raipur district courts and state-level commissions in the capital form the other half of many practices.' },
      { name: 'Bilaspur district consumer commission', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'District-level consumer complaints.' }
    ],
    barNotes: [
      'The Bilaspur–Raipur commute is a defining feature of practice in the state.',
      'Service matters, land and mining-related disputes are common before the High Court.',
      'The High Court Bar Association and the Bilaspur District Bar Association are the main bar bodies.',
      'Criminal appeals and bail from districts across the state are listed regularly.'
    ],
    benefits: [
      { title: 'Bilaspur and Raipur together', text: 'See both cities’ hearings on one diary and catch overlaps before the drive.' },
      { title: 'Juniors hold the fort', text: 'Assign local matters to juniors with WhatsApp reminders while you are in the other city.' },
      { title: 'Service files with tasks', text: 'Track replies, rejoinders and record collection as tasks with due dates on the chamber board.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Chhattisgarh High Court matters?', a: 'Yes. Add the matter, upload orders and confirm next dates. District courts across the state can be added too.' },
      { q: 'Can I plan around travel between Bilaspur and Raipur?', a: 'The diary shows every hearing by court and time, so you can see which days need travel and which matters to assign to juniors.' },
      { q: 'Does it work on slow mobile connections?', a: 'Legal Staff is a web app that works in mobile browsers. It needs a connection; the .ics export keeps dates in your phone calendar too.' },
      { q: 'Can I draft replies and appeals?', a: 'Yes. The Drafting Studio has templates for replies, appeals, revisions and affidavits, with versions and DOCX/PDF export.' }
    ],
    nearby: ['nagpur', 'cuttack', 'ranchi', 'indore'],
    features: ['digital-advocate-diary', 'chamber-team-collaboration', 'whatsapp-hearing-reminders'],
    blogs: ['managing-junior-advocates-court-clerks-daily-board-task-software', 'drafting-written-statements-bail-applications-faster-ai-workspace']
  },
  {
    slug: 'shimla', name: 'Shimla', state: 'Himachal Pradesh', title: T('Shimla'), metaTitle: M('Shimla'),
    metaDescription: 'Court diary for Shimla advocates at the Himachal Pradesh High Court and district courts: orders read, next dates confirmed, WhatsApp hearing reminders.',
    intro: [
      'Shimla is the seat of the Himachal Pradesh High Court. Clients and advocates come up from districts across the state, and in the hills a missed date costs a long journey, not just a phone call. Chambers here combine High Court work with district courts and the state consumer commission.',
      'Legal Staff gives a Shimla chamber one record it can trust. Each order is summarised, the next date confirmed, and reminders go to the advocate and team two days before and on the morning of the hearing, so travel can be arranged in good time.'
    ],
    courts: [
      { name: 'Himachal Pradesh High Court', short: 'HP High Court', kind: 'High Court', note: 'Shimla. The High Court for the State of Himachal Pradesh.' },
      { name: 'District and Sessions Court, Shimla', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions and family courts for Shimla district.' },
      { name: 'HP State Consumer Commission', short: 'State Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The state-level consumer commission sits in Shimla.' },
      { name: 'Tribunal matters in Chandigarh', short: 'NCLT Chandigarh', kind: 'Tribunal', court: 'nclt-and-nclat', note: 'Company and IBC matters from Himachal Pradesh are generally heard at the NCLT Chandigarh Bench; check the current notification.' }
    ],
    barNotes: [
      'Long travel times in the hills make advance reminders and accurate next dates especially valuable.',
      'Land, forest, service and tourism-related commercial disputes are common.',
      'The High Court Bar Association and the Shimla District Bar Association are the main bar bodies.',
      'Some matters go to tribunals in Chandigarh, adding a second city to the diary.'
    ],
    benefits: [
      { title: 'Reminders that respect the journey', text: 'Two-days-before reminders give clients and juniors time to plan the trip to Shimla.' },
      { title: 'Shimla and Chandigarh dates together', text: 'High Court hearings and Chandigarh tribunal dates sit on one diary with clash detection.' },
      { title: 'Small chambers, full toolkit', text: 'A solo advocate gets the same order reader, diary, drafting and document vault as a large firm.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Himachal Pradesh High Court matters?', a: 'Yes. Add the matter, upload orders, and confirm the next date Legal Staff reads.' },
      { q: 'Is there a plan for a solo advocate?', a: 'Yes, the Solo plan. See the pricing section on the home page.' },
      { q: 'Can clients get reminders before they travel?', a: 'Yes. Share updates with clients; WhatsApp delivery works once your chamber connects the WhatsApp Business API, and email works from the start.' },
      { q: 'Does it keep my documents private?', a: 'Yes. Documents are in private storage and each firm’s data is isolated from other firms.' }
    ],
    nearby: ['chandigarh', 'dehradun', 'delhi'],
    features: ['whatsapp-hearing-reminders', 'digital-advocate-diary', 'ai-court-order-reader'],
    blogs: ['automated-whatsapp-court-hearing-reminders-advocates-clients', 'switch-from-physical-advocate-diary-to-cloud-case-workspace']
  },
  {
    slug: 'dehradun', name: 'Dehradun', state: 'Uttarakhand', title: T('Dehradun'), metaTitle: M('Dehradun'),
    metaDescription: 'Practice management for Dehradun advocates with district court work and Uttarakhand High Court matters at Nainital: one diary and WhatsApp reminders.',
    intro: [
      'Dehradun is Uttarakhand’s capital, but the Uttarakhand High Court sits at Nainital, a long drive away. Dehradun chambers therefore split their week between local district courts and commissions and planned trips to the High Court, or coordinate with counsel based in Nainital.',
      'Legal Staff keeps both ends of that practice in one diary. Orders are summarised and next dates confirmed; Nainital dates show up well in advance; and juniors handling local matters get WhatsApp reminders while the senior is away.'
    ],
    courts: [
      { name: 'Uttarakhand High Court (Nainital)', short: 'UK HC Nainital', kind: 'High Court', note: 'The High Court for Uttarakhand sits at Nainital, not in Dehradun.' },
      { name: 'District and Sessions Court, Dehradun', short: 'District Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Civil, sessions, family and special courts for Dehradun district.' },
      { name: 'Uttarakhand State Consumer Commission', short: 'State Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'The state-level consumer commission sits in Dehradun.' },
      { name: 'Uttarakhand RERA', short: 'UK RERA', kind: 'Tribunal', court: 'rera-tribunals', note: 'The state real-estate regulator is based in Dehradun.' }
    ],
    barNotes: [
      'The distance to Nainital means many chambers work with a correspondent or travel for specific dates.',
      'Real-estate, land and service matters are common in the capital.',
      'The Dehradun Bar Association is the main local bar body.',
      'Government departments in the capital generate writ and service litigation that ends up at Nainital.'
    ],
    benefits: [
      { title: 'Nainital dates planned early', text: 'High Court hearings appear on the same diary as local matters, with reminders two days ahead.' },
      { title: 'Work with correspondent counsel', text: 'Share matter updates and documents with the counsel appearing at Nainital, and keep the orders in one vault.' },
      { title: 'Local matters covered', text: 'Assign district-court and commission hearings to juniors with WhatsApp reminders while you travel.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Uttarakhand High Court matters?', a: 'Yes. Add the matter with the High Court as its forum, upload orders and confirm the next dates. The diary also covers Dehradun courts.' },
      { q: 'Can I track RERA and consumer complaints?', a: 'Yes. Add them like any other matter, with documents, hearings and client updates.' },
      { q: 'Can I share orders with counsel at Nainital?', a: 'You can add team members and assign hearings; documents for each matter sit in its vault for those with access.' },
      { q: 'Will Legal Staff remind me of limitation deadlines?', a: 'Yes. The limitation tracker calculates dates, shows each exclusion, and alerts you once an advocate approves the date.' }
    ],
    nearby: ['delhi', 'chandigarh', 'shimla', 'lucknow'],
    features: ['digital-advocate-diary', 'chamber-team-collaboration', 'case-document-management'],
    blogs: ['track-cases-district-court-high-court-nclt-single-dashboard', 'section-12-limitation-act-excluding-certified-copy-days-calculation']
  },
  {
    slug: 'bokaro', name: 'Bokaro', state: 'Jharkhand', title: T('Bokaro'), metaTitle: M('Bokaro'),
    metaDescription: 'Court diary for Bokaro advocates at the Bokaro civil court and Jharkhand High Court in Ranchi: orders read, next dates confirmed, WhatsApp hearing reminders.',
    intro: [
      'Bokaro is a steel city, and its legal work reflects it: employment and service disputes, land matters connected to industrial townships, motor accident claims, and a regular criminal docket. Local advocates practise mainly in the Bokaro civil court and travel to the Jharkhand High Court in Ranchi for writs and appeals.',
      'Legal Staff gives a Bokaro chamber one diary for the district and Ranchi. Orders are read and their next dates confirmed; High Court dates show up early enough to plan the drive; and juniors who hold the fort locally get WhatsApp reminders for each hearing.'
    ],
    courts: [
      { name: 'Jharkhand High Court (Ranchi)', short: 'Jharkhand HC', kind: 'High Court', court: 'jharkhand-high-court', note: 'Writs, appeals and revisions from Bokaro go to the High Court at Ranchi.' },
      { name: 'Civil Court, Bokaro', short: 'Civil Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'The district and sessions courts for Bokaro district, including civil, criminal and motor accident claims work.' },
      { name: 'Bokaro district consumer commission', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'District-level consumer complaints; the State Commission sits in Ranchi.' }
    ],
    barNotes: [
      'Employment and service disputes linked to the steel plant and its contractors are a recurring category.',
      'Motor accident claims and land matters are common in district practice.',
      'The Bokaro District Bar Association is the main local bar body.',
      'High Court work means regular trips to Ranchi, so local and Ranchi dates need to be planned together.'
    ],
    benefits: [
      { title: 'District and Ranchi in one diary', text: 'See Bokaro civil court and Jharkhand High Court hearings together, with clashes flagged.' },
      { title: 'Claims files complete', text: 'Keep FIR copies, medical records and award orders for each claim in the case vault with exhibit marks.' },
      { title: 'Juniors covering local dates', text: 'Assign local hearings to juniors while you are in Ranchi; they get WhatsApp reminders and the last order.' }
    ],
    faqs: [
      { q: 'Does Legal Staff work for Bokaro civil court matters?', a: 'Yes. Add the matter, upload orders and confirm next dates. CNR-based import works where a court-data provider is connected.' },
      { q: 'Can I keep my Jharkhand High Court matters in the same account?', a: 'Yes. All forums sit on one diary with clash detection.' },
      { q: 'Can I convert old IPC sections in charge sheets to BNS?', a: 'Use the free IPC to BNS converter. The new codes apply from 1 July 2024, so check which code governs your matter.' },
      { q: 'Is it suitable for a two-advocate chamber?', a: 'Yes. Start on a smaller plan and add team members as the chamber grows.' }
    ],
    nearby: ['dhanbad', 'ranchi', 'patna'],
    features: ['digital-advocate-diary', 'case-document-management', 'whatsapp-hearing-reminders'],
    blogs: ['ipc-to-bns-crpc-to-bnss-bsa-section-conversion-chart-advocates', 'track-cases-district-court-high-court-nclt-single-dashboard']
  },
  {
    slug: 'dhanbad', name: 'Dhanbad', state: 'Jharkhand', title: T('Dhanbad'), metaTitle: M('Dhanbad'),
    metaDescription: 'Practice management for Dhanbad advocates at the Dhanbad civil court, industrial tribunals and Jharkhand High Court: one diary and WhatsApp reminders.',
    intro: [
      'Dhanbad sits at the centre of India’s coal belt. Alongside a busy civil and criminal docket, industrial disputes involving coal-sector employers and workers are a long-standing part of local practice, and appeals and writs travel to the Jharkhand High Court in Ranchi.',
      'Legal Staff gives a Dhanbad chamber one diary for district courts, industrial tribunals and the High Court. Orders are summarised and next dates confirmed, juniors get WhatsApp reminders, and each matter’s documents sit in its own private vault.'
    ],
    courts: [
      { name: 'Jharkhand High Court (Ranchi)', short: 'Jharkhand HC', kind: 'High Court', court: 'jharkhand-high-court', note: 'Dhanbad falls under the Jharkhand High Court, so challenges to tribunal awards and appeals from the district are argued in Ranchi.' },
      { name: 'Civil Court, Dhanbad', short: 'Civil Court', kind: 'District courts', court: 'ecourts-district-and-sessions-courts', note: 'Sessions trials, civil suits, family matters and compensation claims for Dhanbad district are heard here.' },
      { name: 'Central Government Industrial Tribunals, Dhanbad', short: 'CGIT Dhanbad', kind: 'Tribunal', note: 'Central Government Industrial Tribunal-cum-Labour Courts sit in Dhanbad and hear industrial disputes, including many from the coal sector.' },
      { name: 'Dhanbad district consumer commission', short: 'Consumer Comm.', kind: 'Consumer', court: 'consumer-courts-ncdrc-scdrc', note: 'District-level consumer complaints.' }
    ],
    barNotes: [
      'Industrial and labour disputes from the coal sector are a distinctive part of practice.',
      'Land, compensation and rehabilitation matters connected to mining are common.',
      'The Dhanbad District Bar Association is the main local bar body.',
      'Criminal trials and bail form a steady part of the district docket.'
    ],
    benefits: [
      { title: 'Tribunal and court in one diary', text: 'Industrial tribunal, civil court and High Court hearings sit together with clash detection.' },
      { title: 'Workmen’s records organised', text: 'Keep service records, references and awards in each case vault with exhibit marks.' },
      { title: 'Reminders across the team', text: 'Every assigned junior gets WhatsApp reminders two days before and on the morning of the hearing.' }
    ],
    faqs: [
      { q: 'Can Legal Staff track industrial tribunal matters?', a: 'Yes. Add the tribunal as the forum; orders, documents and reminders work as for any court.' },
      { q: 'Can a tribunal award and the writ against it be kept together?', a: 'Yes. Link the writ in the Jharkhand High Court to the tribunal matter under the same client, with the award, the orders and the next dates for both on file.' },
      { q: 'Can I raise invoices for corporate clients?', a: 'Yes. Per-matter invoices with GST can be raised from the case.' },
      { q: 'How do I start?', a: 'Sign in with Google from the pricing section on the home page, or book a demo to see Legal Staff with your own matters.' }
    ],
    nearby: ['bokaro', 'ranchi', 'kolkata', 'patna'],
    features: ['chamber-team-collaboration', 'ai-court-order-reader', 'case-document-management'],
    blogs: ['per-hearing-appearance-billing-retainer-invoicing-indian-advocates', 'summarize-charge-sheets-arbitral-awards-judgments-ai-india']
  }
];

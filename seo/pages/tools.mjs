// /tools hub and the three free advocate tools. The calculation/render code lives in static/tools.js and is run here at
// build time (Node vm sandbox, no DOM) so each page ships the default result in its static HTML — crawlable and usable
// without JavaScript. In the browser, static/tools.js re-runs the same code live from the inlined JSON data.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { tools } from '../data/tools.mjs';
import { features } from '../data/features.mjs';
import { courts } from '../data/courts.mjs';
import { sectionMap, lawPairs } from '../data/section-map.mjs';
import { limitationRules, limitationNotes } from '../data/limitation-rules.mjs';
import { page, seoHead, ld, hero, section, faqBlock, relatedLinks, disclaimer, icon, esc, SITE } from '../lib.mjs';

let blogIndex = [];
try { blogIndex = (await import('../data/blogs.mjs')).blogs || []; } catch (e) { blogIndex = []; }

const T = (() => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../../static/tools.js', import.meta.url), 'utf8'), ctx);
  return ctx.LSTools;
})();

const tool = slug => tools.find(t => t.slug === slug);
const json = (id, data) => `<script type="application/json" id="${id}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const TODAY = SITE.updated;

/* ---------- shared bits ---------- */
const convertBar = name => `<div class="convert-bar no-print"><div class="wrap"><p>Want Legal Staff to read your court orders automatically and remind you on WhatsApp before every date? <b>Start Free.</b></p><div class="cb-btns"><a class="btn btn-light btn-sm" href="/#pricing">Start free ${icon('arrow', 16)}</a><button class="btn btn-ghost-light btn-sm" type="button" data-book="Tool: ${esc(name)}">Book a demo</button></div></div></div>`;

const toolArt = kind => `<svg class="tool-art" viewBox="0 0 340 280" width="340" height="280" fill="none">
  <circle cx="170" cy="140" r="122" stroke="#262626"/>
  <g class="ls-float"><rect x="62" y="40" width="216" height="200" rx="16" fill="#141414" stroke="#2E2E2E"/>
  ${kind === 'converter' ? [0, 1, 2, 3, 4].map(r => `<rect x="82" y="${64 + r * 34}" width="52" height="22" rx="6" fill="${r === 1 ? '#FFFFFF' : '#1F1F1F'}" stroke="#333"/><path d="M144 ${75 + r * 34}h22 M160 ${70 + r * 34}l6 5-6 5" stroke="#6B6B6B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="176" y="${64 + r * 34}" width="82" height="22" rx="6" fill="${r === 1 ? '#E5E5E5' : '#1F1F1F'}" stroke="#333"/>`).join('')
  : kind === 'limitation' ? `<rect x="82" y="60" width="176" height="22" rx="6" fill="#E5E5E5"/>${[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4, 5].map(c => `<rect x="${82 + c * 30}" y="${94 + r * 34}" width="24" height="26" rx="6" fill="${r === 2 && c === 4 ? '#B42318' : (r === 1 && c > 1) || (r === 2 && c < 2) ? '#3A3A3A' : '#1F1F1F'}" stroke="#333"/>`).join('')).join('')}`
  : `<path d="M90 140h160" stroke="#3A3A3A" stroke-width="2"/>${[90, 132, 170, 212, 250].map((x, i) => `<circle cx="${x}" cy="140" r="${i === 4 ? 9 : 7}" fill="${i === 4 ? '#B42318' : i === 3 ? '#FFFFFF' : '#1F1F1F'}" stroke="${i === 4 ? '#B42318' : '#8A8A8A'}" stroke-width="1.6"/><rect x="${x - 20}" y="${i % 2 ? 160 : 100}" width="40" height="18" rx="5" fill="#1F1F1F" stroke="#333"/>`).join('')}<rect x="82" y="60" width="120" height="10" rx="5" fill="#E5E5E5"/><rect x="82" y="200" width="176" height="18" rx="6" fill="#1F1F1F" stroke="#333"/><rect x="82" y="200" width="118" height="18" rx="6" fill="#E5E5E5"/>`}
  </g></svg>`;

const featureLinks = slugs => slugs.map(s => features.find(f => f.slug === s)).filter(Boolean).map(f => ({ kind: 'Feature', label: f.navLabel, hint: f.navHint, href: `/features/${f.slug}` }));
const courtLinks = slugs => slugs.map(s => courts.find(c => c.slug === s)).filter(Boolean).map(c => ({ kind: 'Court', label: c.name, href: `/courts/${c.slug}` }));
const blogLinks = slugs => slugs.map(s => blogIndex.find(b => b.slug === s)).filter(Boolean).map(b => ({ kind: 'Guide', label: b.title, href: `/blog/${b.slug}` }));
const toolLinks = except => tools.filter(t => t.slug !== except).map(t => ({ kind: 'Free tool', label: t.title, hint: t.navHint, href: `/tools/${t.slug}` }));

const howBlock = (items, extra = '') => `<div class="prose ls-reveal" style="max-width:820px"><ol class="how-list">${items.map(i => `<li><b>${esc(i.t)}</b> ${esc(i.d)}</li>`).join('')}</ol>${extra}</div>`;

function toolPage({ slug, metaTitle, description, kicker, lead, chips, art, panel, how, faqs, rel, extraLd = [] }) {
  const t = tool(slug), path = `/tools/${slug}`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Free advocate tools', path: '/tools' }, { name: t.navLabel, path }];
  const jsonld = [ld.webApplication({ name: t.title, description, path, category: 'UtilitiesApplication' }), ld.breadcrumb(crumbs), ld.faqPage(faqs), ...extraLd];
  const body = `${hero({ kicker, title: t.title, lead, crumbs, source: `Tool hero: ${t.navLabel}`, secondary: { href: '#tool', label: 'Use the tool' }, chips, art: toolArt(art) })}
<section class="section tool-sec" id="tool"><div class="wrap">${panel}${disclaimer('This free tool is a calculation aid: confirm every date and section against the bare Act before you file or cite.')}</div></section>
${section({ id: 'how', tone: 'tone-soft', kicker: 'Method', title: 'How this is calculated', inner: how })}
${faqBlock(faqs)}
${relatedLinks('Related features, tools and guides', rel)}
${convertBar(t.navLabel)}`;
  return { path, priority: 0.8, changefreq: 'monthly', html: page({ head: seoHead({ title: metaTitle, description, path, jsonld }), body, active: 'tools', scripts: ['/static/tools.js'] }) };
}

/* ======================================================================
   1. IPC → BNS / CrPC → BNSS / IEA → BSA converter
   ====================================================================== */
function converterPage() {
  const state = { pair: 'all', dir: 'old', q: '' };
  const pre = T.converter.render(state, { rows: sectionMap, pairs: lawPairs });
  const counts = Object.fromEntries(lawPairs.map(p => [p.id, sectionMap.filter(r => r.law === p.id).length]));
  const seg = (name, legend, opts) => `<fieldset class="seg"><legend>${esc(legend)}</legend><div class="seg-opts">${opts.map((o, i) => `<label><input type="radio" name="${name}" value="${o.v}"${i === 0 ? ' checked' : ''}><span>${esc(o.l)}</span></label>`).join('')}</div></fieldset>`;
  const panel = `<div class="tool-panel" data-tool="converter">
  <div class="tp-head"><h2 class="tp-title">Section converter</h2><p class="tp-sub">${sectionMap.length} high-frequency litigation sections across the IPC, CrPC and Indian Evidence Act and their replacements in force from 1 July 2024.</p></div>
  <div class="cv-controls">
    ${seg('cv-pair', 'Law', [{ v: 'all', l: 'All three' }, ...lawPairs.map(p => ({ v: p.id, l: `${p.oldAct} ↔ ${p.newAct}` }))])}
    ${seg('cv-dir', 'Direction', [{ v: 'old', l: 'Old → new' }, { v: 'new', l: 'New → old' }])}
    <label class="cv-search">Search by section number or keyword<span class="cv-search-in">${icon('search', 18)}<input type="search" name="q" placeholder="e.g. 420, 438, 65B, cheating, bail" autocomplete="off" spellcheck="false"></span></label>
  </div>
  <p class="cv-count" data-count aria-live="polite">${pre.total} sections</p>
  <p class="sr-only" data-live aria-live="polite"></p>
  <div class="cv-out" data-out>${pre.html}</div>
  ${json('cv-data', { rows: sectionMap, pairs: lawPairs })}
</div>`;
  const how = howBlock([
    { t: 'Source of the mapping.', d: 'Each row pairs a section of the old law with the provision that replaced it in the Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita or Bharatiya Sakshya Adhiniyam, checked against the text of the new Acts. Official comparative tables are also published by the Government (for example through the Bureau of Police Research & Development).' },
    { t: 'Sub-sections matter.', d: 'Many old sections are now sub-sections of a single new section — IPC 323 is BNS 115(2), IPC 379 is BNS 303(2). We show the sub-section that carries the punishment, because that is what goes into a charge, FIR or prayer clause.' },
    { t: 'One old section, several new ones (and the reverse).', d: 'Where an old provision was split or merged (IPC 506 into BNS 351(2) and 351(3); IEA 24–27 into BSA 22–23), the row says so in the notes. Read the full new section before relying on the number.' },
    { t: 'No direct equivalent.', d: 'Some provisions were dropped or replaced by differently worded offences — sedition (IPC 124A) is the main example: BNS 152 penalises acts endangering the sovereignty, unity and integrity of India, which is not a renumbered 124A. Some BNS offences, such as organised crime (BNS 111), have no IPC equivalent.' },
    { t: 'Rows marked "Check the official comparative table".', d: 'Where the correspondence is partial or we are not fully certain of it, the row carries that badge. Verify those against the bare Act and the official table before citing them.' },
    { t: 'Which law applies.', d: 'The new Acts apply from 1 July 2024. Offences committed before that date are generally tried under the IPC (savings in BNS 358), and investigations, inquiries, trials and appeals pending on that date continue under the CrPC (BNSS 531). Check the savings clause for your stage of the case.' }
  ]);
  const faqs = [
    { q: 'What is IPC 420 in BNS?', a: 'Cheating and dishonestly inducing delivery of property (IPC 420) is now section 318(4) of the Bharatiya Nyaya Sanhita, 2023, punishable with imprisonment up to seven years and fine. The definition of cheating is in BNS 318(1).' },
    { q: 'What is IPC 302 in BNS?', a: 'Punishment for murder under IPC 302 is now BNS 103(1): death or imprisonment for life, and fine. BNS 103(2) separately deals with murder by a group of five or more persons on grounds such as race, caste, community, sex, place of birth, language or personal belief.' },
    { q: 'Which BNSS section replaces CrPC 438 and 482?', a: 'Anticipatory bail (CrPC 438) is now BNSS 482, and the High Court\'s inherent powers (CrPC 482) are now BNSS 528. Because the number 482 now means anticipatory bail, write the Act name with the section in every petition.' },
    { q: 'Is there a BNS section for sedition (IPC 124A)?', a: 'No direct equivalent. The offence of sedition is not retained in the BNS. BNS 152 deals with acts endangering the sovereignty, unity and integrity of India, but its ingredients are different, so do not treat it as a renumbered section 124A.' },
    { q: 'What replaced the section 65B certificate for electronic evidence?', a: 'Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 replaces IEA 65B. The certificate is in the form set out in the Schedule to the BSA, with Part A filled by the party producing the record and Part B by an expert.' },
    { q: 'Should I use IPC or BNS sections for an offence committed before 1 July 2024?', a: 'Generally the IPC, because the BNS applies to offences committed on or after 1 July 2024 and the repeal clause saves earlier proceedings. Pending CrPC investigations and trials also continue under the CrPC. Check the savings clauses (BNS 358, BNSS 531) and the latest rulings for your specific stage.' }
  ];
  const rel = [...featureLinks(['ai-legal-research-workspace', 'ai-court-order-reader', 'case-document-management']), ...toolLinks('bns-ipc-crpc-bnss-converter'), ...blogLinks(['ipc-to-bns-crpc-to-bnss-bsa-section-conversion-chart-advocates', 'drafting-written-statements-bail-applications-faster-ai-workspace', 'summarize-charge-sheets-arbitral-awards-judgments-ai-india']), ...courtLinks(['ecourts-district-and-sessions-courts'])];
  return toolPage({
    slug: 'bns-ipc-crpc-bnss-converter', art: 'converter',
    metaTitle: 'IPC to BNS, CrPC to BNSS & IEA to BSA Section Converter',
    description: 'Convert IPC to BNS, CrPC to BNSS and Evidence Act to BSA sections both ways. Search 130+ high-frequency litigation sections with punishment notes and copy them.',
    kicker: 'Free advocate tool · New criminal laws',
    lead: `Find the BNS, BNSS or BSA section for an old IPC, CrPC or Evidence Act section — or go back the other way. ${counts.ipc} IPC, ${counts.crpc} CrPC and ${counts.iea} Evidence Act provisions, with punishment notes and a copy button for drafting.`,
    chips: ['Both directions', 'Search by number or keyword', 'Uncertain rows flagged'], panel, how, faqs, rel
  });
}

/* ======================================================================
   2. Limitation period calculator
   ====================================================================== */
function limitationPage() {
  const def = { type: 'first-appeal-hc', start: '2026-10-01', applied: '2026-10-03', ready: '2026-10-20', certRefused: false };
  const rule = limitationRules.find(r => r.id === def.type);
  const pre = T.limitation.render(T.limitation.calc(def, limitationRules, TODAY));
  const panel = `<div class="tool-panel tool-split" data-tool="limitation">
  <div class="tp-form">
    <div class="tp-head"><h2 class="tp-title">Limitation calculator</h2><p class="tp-sub">Results update as you type. Sample dates are filled in.</p></div>
    <form class="tool-form" novalidate>
      <label>Filing type<select name="type">${limitationRules.map(r => `<option value="${r.id}"${r.id === def.type ? ' selected' : ''}>${esc(r.label)}</option>`).join('')}</select></label>
      <label><span data-start-label>${esc(rule.startLabel)}</span><input type="date" name="start" value="${def.start}" required></label>
      <label class="check tf-check" data-slp-field${rule.altPeriod ? '' : ' hidden'}><input type="checkbox" name="certRefused"> The High Court refused a certificate of fitness to appeal (60 days from the refusal)</label>
      <fieldset class="tf-group" data-copy-fields${rule.copyExclusion ? '' : ' hidden'}><legend>Certified copy (Limitation Act s.12(2))</legend>
        <label>Applied for on<input type="date" name="applied" value="${def.applied}"></label>
        <label>Ready for delivery on<input type="date" name="ready" value="${def.ready}"></label>
        <p class="tf-hint">Use the date the copy was notified as ready, from the copying section's endorsement — not the date you collected it.</p>
      </fieldset>
    </form>
  </div>
  <div class="tp-result" aria-live="polite" data-out>${pre}</div>
  ${json('lt-data', limitationRules)}
</div>`;
  const how = howBlock([
    { t: 'Exclude the first day.', d: limitationNotes.s12_1 + ' A 90-day appeal from a decree of 1 October therefore runs from 2 October, and day 90 is 30 December.' },
    { t: 'Add the prescribed period.', d: 'Written statement: 30 days from service of summons (Order VIII Rule 1 CPC), extendable to 90 days in ordinary civil suits and to a hard limit of 120 days in commercial suits. First appeal to a High Court from a decree: 90 days (Article 116(a)). SLP: 90 days from the judgment, or 60 days from the refusal of a certificate of fitness (Supreme Court Rules, 2013). Money suits: generally three years under the article that fits the claim.' },
    { t: 'Exclude the time requisite for the certified copy.', d: limitationNotes.s12_2 + ' The calculator counts the days from the date the copy was applied for to the date it was ready, both days included, and does not count the judgment day twice when the application was made the same day.' },
    { t: 'Only if the copy was applied for in time.', d: 'If the copy is applied for after the limitation period has already run out, nothing is excluded — the time was not "requisite" for an appeal that was already out of time. ' + limitationNotes.s12_explanation },
    { t: 'Check the last day.', d: limitationNotes.s4 + ' The tool flags a deadline that falls on a Saturday or Sunday, but it cannot know court holidays or vacations — check the court calendar.' },
    { t: 'Count down from today.', d: 'Days remaining are counted from today\'s date on your device.' }
  ]);
  const faqs = [
    { q: 'How do I calculate the limitation for a first appeal with certified copy time?', a: 'Start from the date of the decree, exclude that day (section 12(1)), add 90 days (Article 116(a)), then add the days from the date you applied for the certified copy to the date it was ready (section 12(2) and (3)), provided you applied within the 90 days. The calculator shows each step.' },
    { q: 'Is the day of applying for the certified copy excluded?', a: 'The calculator counts both the day of application and the day the copy was ready as excluded, and does not count the judgment day twice. Registries and benches can differ on how they count the edges, so if you are within a day or two of the deadline, file earlier rather than rely on the margin.' },
    { q: 'What is the time limit for a written statement in a commercial suit?', a: '30 days from service of summons. The court can allow it up to 120 days from service for reasons recorded and on payment of costs, but not beyond: after day 120 the defendant forfeits the right to file it and the court cannot take it on record.' },
    { q: 'Can a written statement be filed after 90 days in an ordinary civil suit?', a: 'Order VIII Rule 1 allows extension up to 90 days for reasons recorded. In non-commercial suits courts have treated the 90-day limit as directory in exceptional cases, but that is discretionary — treat day 90 as your working deadline.' },
    { q: 'What is the limitation for an SLP to the Supreme Court?', a: '90 days from the date of the judgment or order under challenge, or 60 days from the date the High Court refused a certificate of fitness where one was applied for. Delay can be condoned on sufficient cause. Check the Supreme Court Rules, 2013 and the Registry\'s computation.' },
    { q: 'What if the last day falls on a court holiday?', a: 'Section 4 of the Limitation Act lets you file on the day the court reopens if the prescribed period expires on a day the court is closed. The calculator flags weekends; check your court\'s holiday list and vacation notifications yourself.' }
  ];
  const rel = [...featureLinks(['digital-advocate-diary', 'whatsapp-hearing-reminders', 'ai-court-order-reader']), ...toolLinks('limitation-period-calculator'), ...blogLinks(['section-12-limitation-act-excluding-certified-copy-days-calculation', 'cpc-order-8-rule-1-written-statement-120-days-commercial-courts', 'automate-daily-cause-list-next-hearing-date-tracking-india']), ...courtLinks(['supreme-court-of-india', 'delhi-high-court'])];
  return toolPage({
    slug: 'limitation-period-calculator', art: 'limitation',
    metaTitle: 'Limitation Period Calculator with Section 12 Exclusion',
    description: 'Free limitation calculator for advocates: written statements (30/90/120 days), first appeals, SLPs and money suits, with s.12 certified-copy days excluded step by step.',
    kicker: 'Free advocate tool · Limitation Act, 1963',
    lead: 'Work out the last day to file a written statement, first appeal, SLP or money suit. The calculator excludes the day of judgment and the certified-copy time under section 12, and shows every step so you can check it.',
    chips: ['Section 12 exclusion', 'Order VIII Rule 1 (30/90/120 days)', 'Weekend flag (s.4)'], panel, how, faqs, rel
  });
}

/* ======================================================================
   3. Section 138 NI Act timeline
   ====================================================================== */
function chequePage() {
  const def = { cheque: '2026-09-01', presented: '2026-09-25', info: '2026-09-29', notice: '2026-10-20', delivery: '2026-10-24' };
  const pre = T.cheque.render(T.cheque.calc(def, TODAY));
  const fld = (name, label, hint, optional) => `<label>${esc(label)}${optional ? ' <span class="tf-opt">(optional)</span>' : ''}<input type="date" name="${name}" value="${def[name]}"${hint ? ` aria-describedby="h-${name}"` : ''}>${hint ? `<span class="tf-hint" id="h-${name}">${esc(hint)}</span>` : ''}</label>`;
  const panel = `<div class="tool-panel tool-split" data-tool="cheque">
  <div class="tp-form">
    <div class="tp-head"><h2 class="tp-title">Section 138 timeline</h2><p class="tp-sub">Results update as you type. Sample dates are filled in; clear any date you don't have yet.</p></div>
    <form class="tool-form" novalidate>
      ${fld('cheque', 'Date on the cheque', '')}
      ${fld('presented', 'Date presented to the bank', 'If left blank, the return memo date is used as an approximation.', true)}
      ${fld('info', 'Return memo / information of dishonour received on', 'The day the payee learnt of the dishonour from the bank.')}
      ${fld('notice', 'Legal (demand) notice sent on', '')}
      ${fld('delivery', 'Notice delivered to the drawer on', 'Or the date of deemed service (e.g. refused or unclaimed) — take advice on deemed service.')}
    </form>
  </div>
  <div class="tp-result" aria-live="polite" data-out>${pre}</div>
</div>`;
  const how = howBlock([
    { t: 'Cheque validity.', d: 'Proviso (a) to section 138 requires the cheque to be presented within six months of its date or within its period of validity, whichever is earlier. Under RBI directions cheques are valid for three months, so the tool checks presentation within three months (a cheque dated 15 January is treated as valid up to 14 April; presentation on the 15th is flagged for checking).' },
    { t: 'Demand notice: 30 days.', d: 'Proviso (b): the payee must make a written demand within 30 days of receiving information from the bank about the dishonour. The day of receipt is excluded, so day 30 is the last day; a notice sent on day 31 fails.' },
    { t: 'Payment window: 15 days.', d: 'Proviso (c): the drawer has 15 days from receipt of the notice to pay. The cause of action arises on the day after those 15 days end, if payment has not been made. A complaint filed before then is premature.' },
    { t: 'Complaint: within one month.', d: 'Section 142(1)(b): the complaint must be filed within one month of the date the cause of action arises. The tool excludes the day the cause of action arose and ends the month on the corresponding calendar date. The proviso lets the court take cognizance after that if the complainant shows sufficient cause for the delay.' },
    { t: 'Where to file.', d: 'Section 142(2) fixes territorial jurisdiction — broadly, where the payee\'s bank branch that collects the cheque is situated. Check the bare section for your facts.' },
    { t: 'What the tool cannot know.', d: 'Court holidays, the exact date of deemed service, and whether a notice was correctly addressed. Treat the result as a checklist, not an opinion.' }
  ]);
  const faqs = [
    { q: 'What is the time limit to send a cheque bounce notice under section 138?', a: 'Within 30 days of receiving information from the bank that the cheque was dishonoured (proviso (b) to section 138). Excluding the day of receipt, day 30 is the last day. A notice sent on day 31 does not satisfy the section.' },
    { q: 'When does the cause of action arise in a cheque bounce case?', a: 'On the day after the 15-day period given to the drawer to pay ends, if payment is not made. The 15 days run from the date the drawer receives the demand notice.' },
    { q: 'What is the last date to file a section 138 complaint?', a: 'Within one month of the date the cause of action arises (section 142(1)(b)). The calculator excludes the day the cause of action arose, so the month ends on the corresponding date of the next month.' },
    { q: 'Can a late section 138 complaint be filed?', a: 'Yes, with an application showing sufficient cause for the delay. The proviso to section 142(1)(b) allows the court to take cognizance after the one-month period if it is satisfied with the reasons.' },
    { q: 'How long is a cheque valid for presentation?', a: 'Three months from the date on the cheque, under RBI directions; section 138 requires presentation within six months or the validity period, whichever is earlier. Banks generally treat a cheque dated 15 January as valid up to 14 April.' },
    { q: 'Does the tool adjust deadlines for court holidays?', a: 'No. It cannot know court holidays, so check whether any last day falls on a day your court is closed and plan to file earlier where possible.' }
  ];
  const rel = [...featureLinks(['digital-advocate-diary', 'whatsapp-hearing-reminders', 'case-document-management']), ...toolLinks('section-138-ni-act-timeline-calculator'), ...blogLinks(['section-138-ni-act-cheque-bounce-limitation-calculator-guide', 'drafting-written-statements-bail-applications-faster-ai-workspace', 'automated-client-case-status-court-order-updates-on-whatsapp']), ...courtLinks(['ecourts-district-and-sessions-courts'])];
  return toolPage({
    slug: 'section-138-ni-act-timeline-calculator', art: 'cheque',
    metaTitle: 'Section 138 NI Act Timeline & Deadline Calculator',
    description: 'Check a cheque bounce case: cheque validity, 30-day notice, 15-day payment period, cause of action and the s.142 complaint deadline, with a pass/fail checklist.',
    kicker: 'Free advocate tool · Negotiable Instruments Act, 1881',
    lead: 'Enter the cheque, dishonour and notice dates to check every statutory step of a section 138 case — and see the last day to file the complaint under section 142.',
    chips: ['Pass/fail checklist', '30-day notice check', 's.142 complaint deadline'], panel, how, faqs, rel
  });
}

/* ======================================================================
   /tools hub
   ====================================================================== */
function hubPage() {
  const path = '/tools';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Free advocate tools', path }];
  const cards = `<div class="grid3">${tools.map((t, i) => `<a class="card tool-card ls-reveal ls-lift" style="--ls-delay:${i * 80}ms" href="/tools/${t.slug}"><span class="card-ic">${icon(t.icon, 22)}</span><h3>${esc(t.title)}</h3><p>${esc(t.navHint)}.</p><span class="tool-go">Open the tool ${icon('arrow', 16)}</span></a>`).join('')}</div>`;
  const why = `<div class="prose ls-reveal" style="max-width:820px"><p>Each tool runs in your browser: no sign-in, nothing you type is sent anywhere. Every result shows its working — the section, the excluded days and the arithmetic — so you can check it against the bare Act before you rely on it.</p><p>Inside Legal Staff, the same rules sit behind the limitation tracker: dates are calculated with every exclusion shown, wait for your approval, and then reach the court diary and WhatsApp reminders.</p></div>`;
  const rel = [...featureLinks(['digital-advocate-diary', 'ai-court-order-reader', 'whatsapp-hearing-reminders']), ...blogLinks(['ipc-to-bns-crpc-to-bnss-bsa-section-conversion-chart-advocates', 'section-12-limitation-act-excluding-certified-copy-days-calculation', 'section-138-ni-act-cheque-bounce-limitation-calculator-guide'])];
  const body = `${hero({ kicker: 'Free advocate tools', title: 'Free tools for Indian advocates', lead: 'Convert IPC, CrPC and Evidence Act sections to the BNS, BNSS and BSA, compute limitation with section 12 exclusions, and check a cheque bounce timeline — free, with every step shown.', crumbs, source: 'Tools hub', secondary: { href: '#all-tools', label: 'See the tools' } })}
${section({ id: 'all-tools', title: 'All free tools', inner: cards })}
${section({ tone: 'tone-soft', kicker: 'How they work', title: 'Calculations you can check', inner: why + disclaimer() })}
${relatedLinks('Related features and guides', rel)}
${convertBar('Tools hub')}`;
  const description = 'Free tools for Indian advocates: IPC to BNS, CrPC to BNSS and IEA to BSA converter, limitation calculator with s.12 exclusion, and s.138 NI Act timeline.';
  return { path, priority: 0.7, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Free Tools for Advocates: BNS Converter, Limitation, s.138', description, path, jsonld: [ld.breadcrumb(crumbs), ld.itemList('Free advocate tools', tools.map(t => ({ name: t.title, path: `/tools/${t.slug}` })))] }), body, active: 'tools', scripts: [] }) };
}

export function pages() {
  return [hubPage(), converterPage(), limitationPage(), chequePage()];
}

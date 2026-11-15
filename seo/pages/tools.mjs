// /tools hub and the three free tools. The calculation/render code lives in static/tools.js and is run here at build
// time (in a sandbox without a DOM) so each page ships a pre-computed default result; the browser re-runs it live.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { tools } from '../data/tools.mjs';
import { services } from '../data/services.mjs';
import { stampDuty, stampStates } from '../data/stamp-duty.mjs';
import { classes as tmClasses, sectors as tmSectors, businessTypes } from '../data/trademark-classes.mjs';
import { complianceRules, lateFees, companyNormalFee, llpNormalFee, financialYears } from '../data/compliance-rules.mjs';
import { page, seoHead, ld, hero, section, faqBlock, ctaBand, relatedLinks, disclaimer, icon, esc, inr, SITE } from '../lib.mjs';

let blogIndex = [];
try { blogIndex = (await import('../data/blogs.mjs')).blogs || []; } catch (e) { blogIndex = []; }

const T = (() => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../../static/tools.js', import.meta.url), 'utf8'), ctx);
  return ctx.LSTools;
})();

const tool = slug => tools.find(t => t.slug === slug);
const json = (id, data) => `<script type="application/json" id="${id}">${JSON.stringify(data, (k, v) => (v === Infinity ? 1e15 : v)).replace(/</g, '\\u003c')}</script>`;
const proPrice = slug => { const s = services.find(x => x.slug === slug); return s && s.tiers ? Math.min(...s.tiers.map(t => t.price)) : null; };

/* ---------- incorporation fee schedule (government fees) ---------- */
export const incorporationFees = {
  nameReservation: 1000,
  spiceNilUpTo: 1500000,
  // Registration fee for companies having share capital (Companies (Registration Offices and Fees) Rules, 2014):
  // base + per ₹10,000 (or part) above `from`.
  companySchedule: [
    { upTo: 100000, from: 0, base: 5000, per: 0 },
    { upTo: 500000, from: 100000, base: 5000, per: 400 },
    { upTo: 5000000, from: 500000, base: 21000, per: 300 },
    { upTo: 10000000, from: 5000000, base: 156000, per: 100 },
    { upTo: 1e15, from: 10000000, base: 206000, per: 75 }
  ],
  companyMax: 25000000,
  // LLP incorporation (FiLLiP) by contribution, LLP Rules 2009 Annexure A.
  llpIncorporation: [{ upTo: 100000, fee: 500 }, { upTo: 500000, fee: 2000 }, { upTo: 1000000, fee: 4000 }, { upTo: 1e15, fee: 5000 }],
  llpForm3: llpNormalFee,
  llpStampFallback: 1000,
  pan: 66, tan: 65
};
const CAP_STEPS = [100000, 200000, 300000, 500000, 700000, 1000000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000, 6000000, 7500000, 10000000];
const PRESETS = [[100000, '₹1 lakh'], [500000, '₹5 lakh'], [1000000, '₹10 lakh'], [1500000, '₹15 lakh'], [2500000, '₹25 lakh'], [5000000, '₹50 lakh'], [10000000, '₹1 crore']];

/* ---------- shared bits ---------- */
const convertBar = name => `<div class="convert-bar no-print"><div class="wrap"><p>Need a practicing CMA/CA/CS or dedicated paralegal to file this error-free? <b>Book instant assistance.</b></p><button class="btn btn-light btn-sm" type="button" data-book="Tool: ${esc(name)}">Book now ${icon('arrow', 16)}</button></div></div>`;

const toolArt = kind => `<svg class="tool-art" viewBox="0 0 340 280" width="340" height="280" fill="none">
  <defs><linearGradient id="ta-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#CFCFCF"/><stop offset="1" stop-color="#7A7A7A"/></linearGradient></defs>
  <circle cx="170" cy="140" r="122" stroke="#262626"/><circle cx="170" cy="140" r="90" stroke="#1F1F1F" stroke-dasharray="3 6" class="ls-spin-slow"/>
  <g class="ls-float-slow"><rect x="70" y="44" width="200" height="192" rx="16" fill="#141414" stroke="#2E2E2E"/>
  ${kind === 'calc' ? `<rect x="90" y="64" width="160" height="44" rx="8" fill="#0A0A0A" stroke="#2E2E2E"/><rect x="160" y="80" width="76" height="12" rx="6" fill="url(#ta-silver)"/>
    ${[0, 1, 2].map(r => [0, 1, 2, 3].map(c => `<rect x="${90 + c * 42}" y="${122 + r * 36}" width="34" height="28" rx="7" fill="${r === 2 && c === 3 ? '#FFFFFF' : '#1F1F1F'}" stroke="#333"/>`).join('')).join('')}`
  : kind === 'calendar' ? `<rect x="90" y="64" width="160" height="22" rx="6" fill="url(#ta-silver)"/>
    ${[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${90 + c * 33}" y="${98 + r * 32}" width="26" height="24" rx="6" fill="${(r === 1 && c === 3) ? '#FFFFFF' : (r === 2 && c === 1) ? '#B42318' : '#1F1F1F'}" stroke="#333"/>`).join('')).join('')}`
  : `<rect x="90" y="64" width="160" height="34" rx="17" fill="#0A0A0A" stroke="#3A3A3A"/><circle cx="110" cy="81" r="7" stroke="#CFCFCF" stroke-width="2"/><path d="M115 86l5 5" stroke="#CFCFCF" stroke-width="2" stroke-linecap="round"/><rect x="128" y="77" width="70" height="8" rx="4" fill="#4A4A4A"/>
    ${[0, 1, 2].map(i => `<g transform="translate(90 ${112 + i * 38})"><rect width="160" height="30" rx="8" fill="${i === 0 ? '#FFFFFF' : '#1F1F1F'}" stroke="#333"/><text x="12" y="20" font-family="Instrument Sans, sans-serif" font-size="13" font-weight="600" fill="${i === 0 ? '#0A0A0A' : '#9E9E9E'}">${['42', '9', '35'][i]}</text><rect x="40" y="12" width="${90 - i * 14}" height="6" rx="3" fill="${i === 0 ? '#0A0A0A' : '#3A3A3A'}"/></g>`).join('')}`}
  </g>
  <g class="ls-float" style="animation-delay:-3s"><rect x="214" y="22" width="108" height="40" rx="10" fill="#FFFFFF"/><circle cx="234" cy="42" r="8" fill="#0A0A0A"/><path d="M230 42l3 3 5-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><rect x="248" y="35" width="58" height="6" rx="3" fill="#0A0A0A"/><rect x="248" y="45" width="38" height="4" rx="2" fill="#BDBDBD"/></g>
</svg>`;

const blogLinks = slugs => slugs.map(sl => blogIndex.find(b => b.slug === sl)).filter(Boolean).map(b => ({ kind: 'Guide', label: b.title, href: `/blog/${b.slug}` }));
const svcLinks = slugs => slugs.map(sl => services.find(s => s.slug === sl)).filter(Boolean).map(s => ({ kind: 'Service', label: s.navLabel, hint: s.navHint, href: `/services/${s.slug}` }));
const toolLinks = except => tools.filter(t => t.slug !== except).map(t => ({ kind: 'Free tool', label: t.title, hint: t.navHint, href: `/tools/${t.slug}` }));

function toolPage({ slug, metaTitle, metaDescription, kicker, lead, chips, body, faqs, related, secondary }) {
  const t = tool(slug), path = `/tools/${slug}`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Free tools', path: '/tools' }, { name: t.short, path }];
  const jsonld = [ld.webApplication({ name: t.title, description: metaDescription, path, category: 'BusinessApplication' }), ld.breadcrumb(crumbs), ld.faqPage(faqs)];
  const html = `${hero({ kicker, title: t.title, lead, crumbs, source: `Tool hero: ${t.short}`, primary: 'Get it filed by a professional', secondary: secondary || { href: '#tool', label: 'Use the tool' }, chips, art: toolArt(t.icon) })}
${body}
${faqBlock(faqs)}
${relatedLinks('Related services, tools and guides', related)}
${ctaBand({ title: 'Prefer a professional to handle the filing?', text: 'Book a free 15-minute call. A practising CMA, CA or CS reviews your inputs and quotes a fixed professional fee — government fees at actuals.', source: `Tool CTA band: ${t.short}` })}
${convertBar(t.short)}`;
  return { path, priority: 0.8, changefreq: 'monthly', html: page({ head: seoHead({ title: metaTitle, description: metaDescription, path, jsonld }), body: html, active: 'tools', scripts: ['/static/tools.js'] }) };
}

/* =================== 1. incorporation cost calculator =================== */
function incPage() {
  const pro = { pvt: { price: proPrice('private-limited-company-registration') || 4999, label: 'Private limited / OPC registration plans start here; see /services for what each plan includes.' },
    llp: { price: proPrice('llp-registration-india') || 4999, label: 'LLP registration plans start here; see /services for what each plan includes.' } };
  const data = { stamp: stampDuty, fees: incorporationFees, pro, steps: CAP_STEPS };
  const def = { entity: 'pvt', state: 'maharashtra', capital: 100000, dsc: 2, dscCost: 1500, pro: false, llpStamp: null };
  const result = T.incorporation(def, data);
  const stepIdx = CAP_STEPS.indexOf(def.capital);
  const ent = [['pvt', 'Private Limited'], ['llp', 'LLP'], ['opc', 'OPC']];
  const form = `<form class="tool-inputs card" id="inc-form" novalidate aria-label="Incorporation cost inputs">
    <fieldset class="seg"><legend>Entity type</legend><div class="seg-row">${ent.map(([v, l]) => `<label><input type="radio" name="entity" value="${v}"${v === def.entity ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
    <label>State / Union Territory of registered office<select id="inc-state">${stampStates.map(s => `<option value="${s.slug}"${s.slug === def.state ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
    <div class="field">
      <div class="field-top"><span id="inc-cap-name">Authorised share capital</span><output id="inc-cap-label" for="inc-cap">${inr(def.capital)}</output></div>
      <input type="range" id="inc-cap-range" min="0" max="${CAP_STEPS.length - 1}" step="1" value="${stepIdx}" aria-label="Capital (slider, ₹1 lakh to ₹1 crore)">
      <div class="presets" role="group" aria-label="Capital presets">${PRESETS.map(([v, l]) => `<button type="button" class="preset" data-v="${v}" aria-pressed="${v === def.capital}">${l}</button>`).join('')}</div>
      <label>Exact amount (₹), any value including above ₹1 crore<input id="inc-cap" type="number" min="0" step="1000" inputmode="numeric" value="${def.capital}"></label>
    </div>
    <div class="grid2">
      <label><span id="inc-dsc-name">Directors / subscribers (DSC count)</span><input id="inc-dsc" type="number" min="0" max="15" step="1" inputmode="numeric" value="${def.dsc}"></label>
      <label>DSC cost per person (₹)<input id="inc-dsccost" type="number" min="0" step="100" inputmode="numeric" value="${def.dscCost}"></label>
    </div>
    <label class="llp-only">LLP agreement stamp duty (₹) — estimate, edit if known<input id="inc-llpstamp" type="number" min="0" step="100" inputmode="numeric" placeholder="auto"></label>
    <label class="check"><input type="checkbox" id="inc-pro"> <span>Add Legal Staff professional fee (from ${inr(pro.pvt.price)}) — <a href="/services/private-limited-company-registration">see plans</a></span></label>
    <noscript><p class="cal-note">JavaScript is off, so the estimate on this page shows the default inputs (Private Limited, Maharashtra, ₹1 lakh capital, two DSCs).</p></noscript>
  </form>`;
  const out = `<div class="tool-result print-area">
    <p class="print-only">${esc(SITE.name)} — Company incorporation cost estimate (indicative)</p>
    <div id="inc-out" class="tool-out" aria-live="polite">${T.renderInc(result)}</div>
    <div class="tool-actions no-print"><button class="btn btn-dark btn-sm" type="button" id="inc-print">${icon('print', 16)} Print / save as PDF</button><button class="btn btn-ghost btn-sm" type="button" id="inc-download">${icon('doc', 16)} Download summary (.csv)</button></div>
    ${disclaimer('Stamp duty figures are indicative and compiled from state schedules; the MCA portal computes the final amount at the time of filing.')}
  </div>`;
  const toolSec = `<section class="section tool-app" id="tool"><div class="wrap"><div class="tool-grid">${form}${out}</div></div></section>`;

  const stampRows = stampStates.map(s => { const v = stampDuty[s.slug]; return `<tr><th>${esc(v.state)}</th><td>${esc(v.roc.office)}</td><td>${esc(v.moa.summary)}</td><td>${esc(v.aoa.summary)}</td></tr>`; }).join('');
  const how = section({ id: 'how', tone: 'tone-soft', kicker: 'How this is calculated', title: 'What goes into the cost of incorporating', lead: 'Every line in the estimate maps to a statutory fee or a market cost. Here is the logic, and where it is approximate.', inner: `<div class="how-grid">
    <div class="card ls-reveal"><span class="card-ic">${icon('building', 22)}</span><h3>MCA fees</h3><p>Name reservation through SPICe+ Part A or RUN costs ₹1,000. For companies, the SPICe+ incorporation fee is nil where authorised capital is up to ₹15 lakh; above that, the registration-fee schedule in the Companies (Registration Offices and Fees) Rules, 2014 applies (₹5,000 up to ₹1 lakh, then a per-₹10,000 rate that falls as capital rises). LLP incorporation fees in FiLLiP run by contribution slab, from ₹500 up to ₹1 lakh to ₹5,000 above ₹10 lakh.</p></div>
    <div class="card ls-reveal" style="--ls-delay:80ms"><span class="card-ic">${icon('stamp', 22)}</span><h3>Stamp duty</h3><p>Stamp duty on the MoA and AoA is a state levy, so it depends on where the registered office is. Some states charge a flat amount, others a percentage of authorised capital with a cap. Since SPICe+, the duty is paid through the MCA portal for most states. LLP agreements are stamped separately on the state e-stamp system, usually linked to contribution.</p></div>
    <div class="card ls-reveal" style="--ls-delay:160ms"><span class="card-ic">${icon('shield', 22)}</span><h3>PAN, TAN and DSC</h3><p>PAN and TAN are applied for within the incorporation form; the small processing fees are shown as indicative. Each director or designated partner needs a Class 3 digital signature certificate; prices vary by vendor and validity, so the default of ₹1,500 per person is editable.</p></div>
  </div>
  <div class="prose ls-reveal" style="max-width:860px;margin-top:28px"><h3>Assumptions</h3><ul>
    <li>Company estimates assume a company with share capital, standard SPICe+ filing with e-MoA (INC-33) and e-AoA (INC-34), and DINs allotted in SPICe+ (available for up to three proposed directors).</li>
    <li>The registration fee above ₹15 lakh applies the general schedule; the MCA fee calculator may apply different rates for specific classes of company, so treat that line as indicative.</li>
    <li>Not included: stamp duty on share certificates, notarisation or apostille of foreign documents, office-address documents, GST registration, bank charges and any resubmission costs.</li>
    <li>Professional fees, when switched on, show the starting price of our plans; government fees are always charged at actuals.</li>
  </ul></div>
  <h3 class="h3 ls-reveal" style="margin-top:36px">State-wise MoA / AoA stamp duty and jurisdictional RoC (indicative)</h3>
  <div class="matrix-wrap ls-reveal"><table class="matrix"><thead><tr><th>State / UT</th><th>Registrar of Companies</th><th>MoA</th><th>AoA</th></tr></thead><tbody>${stampRows}</tbody></table></div>
  <p class="muted" style="font-size:14px;margin-top:12px">Rates are compiled from state stamp schedules and are revised from time to time. Rows marked as conservative estimates could not be verified and lean high. Confirm the amount computed on the MCA portal before you pay.</p>` });

  const faqs = [
    { q: 'Is company registration free for capital up to ₹15 lakh?', a: 'The MCA incorporation fee in SPICe+ is nil for companies with authorised capital up to ₹15 lakh. You still pay name reservation, state stamp duty on the MoA and AoA, PAN and TAN processing, and the cost of digital signatures, so the total is never zero.' },
    { q: 'Why does stamp duty differ between states?', a: 'Stamp duty is levied under each state\u2019s stamp law (or the Indian Stamp Act as adopted by that state). Some states charge a flat amount on the MoA and AoA; others charge a percentage of authorised capital with a cap. The registered office decides which state\u2019s duty applies.' },
    { q: 'Does a higher authorised capital cost more?', a: 'Yes, above ₹15 lakh the MCA registration fee rises with authorised capital, and in states that charge AoA stamp duty as a percentage, stamp duty rises too. Many founders start with a modest authorised capital and increase it later through SH-7, which has its own fee and stamp duty.' },
    { q: 'How is LLP registration cost different?', a: 'LLPs pay a FiLLiP fee by contribution slab, a Form 3 fee for filing the LLP agreement, and stamp duty on the LLP agreement under the state stamp law. There is no MoA or AoA. Form 3 must be filed within 30 days of incorporation, after which ₹100 per day of delay applies.' },
    { q: 'Are these figures final?', a: 'No. They are indicative estimates based on published schedules as we understand them. Government fees and stamp duty are revised from time to time, and the MCA portal computes the payable amount at filing. Confirm before you pay, or ask us to prepare the filing.' }
  ];
  return toolPage({ slug: 'incorporation-cost-calculator', metaTitle: 'Company Registration Cost & Stamp Duty Calculator India',
    metaDescription: 'Estimate the cost to register a Private Limited, OPC or LLP in any state: MCA fees, MoA/AoA stamp duty, PAN, TAN and DSC. Live totals, print and CSV download.',
    kicker: 'Free tool · Incorporation cost', lead: 'Pick your entity, state and capital. See the MCA fee, state stamp duty on the MoA and AoA (or LLP agreement), PAN, TAN and DSC costs add up live — then print or download the summary.',
    chips: ['All major states and UTs', 'Pvt Ltd, OPC and LLP', 'Print or CSV summary'],
    body: `${json('inc-data', data)}${toolSec}${how}`, faqs,
    related: [...svcLinks(['private-limited-company-registration', 'llp-registration-india', 'cma-ca-cs-certification-services']), ...toolLinks('incorporation-cost-calculator'), ...blogLinks(['spice-plus-part-a-name-rejection-rules-rule-8', 'spice-plus-part-b-resubmission-remarks-mca-v3', 'virtual-office-company-registration-mca-v3-geo-coordinates']), { kind: 'Compare', label: 'Pvt Ltd vs LLP vs OPC', href: '/compare/pvt-ltd-vs-llp-vs-opc' }] });
}

/* =================== 2. compliance calendar =================== */
function calPage() {
  const data = { rules: complianceRules, lateFees, companyNormalFee, llpNormalFee };
  const today = SITE.updated;
  const def = { entity: 'company', inc: '2026-04-15', fy: '2026-27', audit: false, agmDate: '', today };
  const cal = T.calendar(def, data);
  const aoc = cal.items.find(i => i.id === 'aoc4');
  const lfDef = { rule: 'aoc4', due: aoc ? aoc.date : today, filed: T.D.addDays(aoc ? aoc.date : today, 30), capital: 100000, officers: 2 };
  const late = T.lateFee(lfDef, data);
  const form = `<form class="tool-inputs card" id="cal-form" novalidate aria-label="Calendar inputs">
    <fieldset class="seg"><legend>Entity type</legend><div class="seg-row">${[['company', 'Private Limited'], ['llp', 'LLP']].map(([v, l]) => `<label><input type="radio" name="centity" value="${v}"${v === def.entity ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
    <label>Date of incorporation<input type="date" id="cal-inc" value="${def.inc}" min="2015-01-01" max="2030-12-31"></label>
    <label>Financial year<select id="cal-fy">${financialYears.map(f => `<option value="${f}"${f === def.fy ? ' selected' : ''}>FY ${f}</option>`).join('')}</select></label>
    <label class="co-only">AGM date, if held or planned <span class="muted">(optional — AOC-4 and MGT-7 dates follow it)</span><input type="date" id="cal-agm"></label>
    <label class="check llp-only"><input type="checkbox" id="cal-audit"> <span>Accounts audited (turnover above ₹40 lakh or contribution above ₹25 lakh) — ITR due 31 October</span></label>
    <p class="field-hint">Status is worked out against today\u2019s date in your browser. Items marked \u201cif applicable\u201d depend on your facts.</p>
    <div class="tool-actions no-print"><button class="btn btn-dark btn-sm" type="button" id="cal-ics">${icon('calendar', 16)} Add to calendar (.ics)</button><button class="btn btn-ghost btn-sm" type="button" id="cal-print">${icon('print', 16)} Print</button></div>
    <noscript><p class="cal-note">JavaScript is off, so the calendar shows the default inputs (company incorporated ${T.D.fmt(def.inc)}, FY ${def.fy}) with status as of ${T.D.fmt(today)}.</p></noscript>
  </form>`;
  const out = `<div class="tool-result print-area"><p class="print-only">${esc(SITE.name)} — ROC & tax compliance calendar (indicative)</p><div id="cal-out" class="tool-out" aria-live="polite">${T.renderCal(cal)}</div>${disclaimer('Due dates are as per the statute; the government sometimes extends dates by circular, and conditional items depend on your facts.')}</div>`;
  const toolSec = `<section class="section tool-app" id="tool"><div class="wrap"><div class="tool-grid cal-grid">${form}${out}</div></div></section>`;

  const lfRules = complianceRules.filter(r => r.lateFee);
  const lfForm = `<form class="tool-inputs card" id="lf-form" novalidate aria-label="Late fee inputs">
    <label>Filing<select id="lf-rule">${lfRules.map(r => `<option value="${r.id}"${r.id === lfDef.rule ? ' selected' : ''}${r.entity === 'llp' ? ' hidden disabled' : ''}>${esc(r.form)} — ${esc(r.title)}</option>`).join('')}</select></label>
    <div class="grid2"><label>Due date<input type="date" id="lf-due" value="${lfDef.due}"></label><label>Actual / expected filing date<input type="date" id="lf-filed" value="${lfDef.filed}"></label></div>
    <div class="grid2"><label><span id="lf-cap-name">Authorised capital (₹)</span><input type="number" id="lf-cap" min="0" step="1000" inputmode="numeric" value="${lfDef.capital}"></label>
      <label class="officers-only">Officers in default (INC-20A)<input type="number" id="lf-officers" min="1" max="15" step="1" inputmode="numeric" value="${lfDef.officers}"></label></div>
    <p class="field-hint">The due date is filled from your calendar above; change it if your AGM or appointment date differs.</p>
  </form>`;
  const lfSec = section({ id: 'late-fee', tone: 'tone-soft', kicker: 'Late-fee calculator', title: 'What a delay will cost', lead: 'Pick a filing and the date you filed or expect to file. Fixed statutory amounts are exact; multiples of the normal fee are labelled indicative.', inner: `<div class="tool-grid">${lfForm}<div class="tool-result"><div id="lf-out" class="tool-out" aria-live="polite">${T.renderLate(late)}</div></div></div>` });

  const feeRows = [
    ['AOC-4, MGT-7 / MGT-7A', '₹100 per day of delay, no cap, plus the normal fee', 'Exact'],
    ['LLP Form 3, Form 8, Form 11', '₹100 per day of delay, no cap, plus the normal fee', 'Exact'],
    ['DIR-3 KYC', '₹5,000 flat once the due date passes; DIN is marked deactivated until filed', 'Exact'],
    ['INC-20A', 'Section 10A penalty: ₹50,000 on the company; ₹1,000 per day (max ₹1 lakh) per officer in default; plus additional filing fee', 'Penalty exact; filing fee indicative'],
    ['ADT-1, DPT-3 and other event forms', '2×, 4×, 6×, 10× or 12× the normal fee depending on the length of delay', 'Indicative'],
    ['TDS returns (24Q/26Q)', '₹200 per day under section 234E, capped at the TDS amount', 'Exact'],
    ['Belated income-tax return', '₹5,000 under section 234F, plus interest under section 234A', 'Exact (interest not computed)']
  ];
  const how = section({ id: 'how', kicker: 'How to use', title: 'How the calendar works out each date', inner: `<div class="how-grid">
    <div class="card ls-reveal"><span class="card-ic">${icon('rocket', 22)}</span><h3>First-year items run from incorporation</h3><p>The first board meeting and first auditor appointment within 30 days, share certificates within two months and INC-20A within 180 days are counted from the date on your certificate of incorporation. LLPs file the LLP agreement (Form 3) within 30 days.</p></div>
    <div class="card ls-reveal" style="--ls-delay:80ms"><span class="card-ic">${icon('calendar', 22)}</span><h3>Annual filings follow the AGM</h3><p>A company\u2019s first AGM is due within nine months of the end of its first financial year; later AGMs within six months, i.e. by 30 September. AOC-4 follows within 30 days of the AGM and MGT-7/7A within 60 days. Enter your AGM date to recompute both.</p></div>
    <div class="card ls-reveal" style="--ls-delay:160ms"><span class="card-ic">${icon('clock', 22)}</span><h3>Fixed dates and the first-FY rule</h3><p>DPT-3 (30 June), DIR-3 KYC (30 September), ITR (31 October for audit cases), LLP Form 11 (30 May) and Form 8 (30 October) fall on fixed dates. Where the law lets the first financial year run to the next 31 March, the calendar assumes it does; tax filings always follow April to March.</p></div>
  </div>
  <h3 class="h3 ls-reveal" style="margin-top:36px">Late fees at a glance</h3>
  <div class="matrix-wrap ls-reveal"><table class="matrix"><thead><tr><th>Filing</th><th>Additional fee or penalty</th><th>How precise</th></tr></thead><tbody>${feeRows.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>` });

  const faqs = [
    { q: 'When is the first AGM of a new private limited company due?', a: 'Within nine months from the end of the company\u2019s first financial year. For a company incorporated in June 2026 whose first financial year ends on 31 March 2027, the first AGM is due by 31 December 2027. Later AGMs are due within six months of the year end, i.e. by 30 September.' },
    { q: 'What happens if INC-20A is not filed within 180 days?', a: 'Section 10A provides a penalty of ₹50,000 on the company and ₹1,000 per day, up to ₹1 lakh, on every officer in default. The company cannot commence business or borrow until it files, and the Registrar may initiate removal of its name from the register.' },
    { q: 'Is the late fee on AOC-4 and MGT-7 capped?', a: 'No. Since 1 July 2018 the additional fee for these annual forms is ₹100 per day of delay with no upper limit, in addition to the normal filing fee. The same ₹100-per-day rule applies to LLP Forms 3, 8 and 11.' },
    { q: 'Do I need to file DIR-3 KYC every year?', a: 'As currently applied, every individual holding a DIN or DPIN as on 31 March files DIR-3 KYC (or the web version if details are unchanged) by 30 September. A missed filing deactivates the DIN until it is filed with a ₹5,000 fee. Check the MCA portal for any change in periodicity.' },
    { q: 'Which items depend on my facts?', a: 'DPT-3 applies if the company has outstanding loans or receipts; MSME-1 applies if dues to MSME suppliers are outstanding beyond 45 days; TDS returns apply if tax was deducted; advance tax applies if the year\u2019s tax is ₹10,000 or more; a tax audit applies above the section 44AB threshold. These are marked \u201cif applicable\u201d.' },
    { q: 'Can I add these dates to Google Calendar or Outlook?', a: 'Yes. Use \u201cAdd to calendar\u201d to download an .ics file with every date, each with a reminder seven days before, and import it into Google Calendar, Outlook or Apple Calendar.' }
  ];
  return toolPage({ slug: 'roc-compliance-calendar', metaTitle: 'ROC Compliance Calendar & Late Fee Calculator for Startups',
    metaDescription: 'Generate your company or LLP compliance calendar: INC-20A, AGM, AOC-4, MGT-7, DIR-3 KYC, DPT-3, Form 8, Form 11 and ITR due dates, late fees and .ics export.',
    kicker: 'Free tool · Compliance calendar', lead: 'Enter your incorporation date and financial year. Get every ROC and income-tax due date in order, flagged overdue, due soon or upcoming — with a late-fee calculator and a calendar file you can import.',
    chips: ['Companies and LLPs', 'Late-fee calculator', '.ics calendar export'],
    body: `${json('cal-data', data)}${toolSec}${lfSec}${how}`, faqs,
    related: [...svcLinks(['roc-annual-compliance', 'legal-staffing-virtual-compliance-officer', 'cma-ca-cs-certification-services']), ...toolLinks('roc-compliance-calendar'), ...blogLinks(['inc-20a-late-filing-penalty-after-180-days-condonation', 'post-incorporation-compliance-checklist-first-60-days-sh1-adt1', 'dir-3-kyc-deactivated-din-reactivation-fee-process', 'director-loan-private-limited-company-section-185-dpt3'])] });
}

/* =================== 3. trademark class finder =================== */
function tmPage() {
  const secLabel = Object.fromEntries(tmSectors.map(s => [s.id, s.label]));
  const card = c => {
    const secs = [...new Set(c.examples.flatMap(e => e.sectors))];
    const text = [String(c.n), c.heading, c.plain, ...c.keywords, ...c.examples.map(e => e.text), c.kind].join(' ').toLowerCase().replace(/[^a-z0-9&\s-]/g, ' ').replace(/\s+/g, ' ');
    return `<details class="tm-card" id="class-${c.n}" data-n="${c.n}" data-sectors="${secs.join(' ')}" data-text="${esc(text)}">
      <summary><span class="tm-n">${c.n}</span><span class="tm-h"><b>Class ${c.n}: ${esc(c.heading)}</b><small>${c.kind === 'goods' ? 'Goods' : 'Services'} · ${esc(secs.slice(0, 3).map(s => secLabel[s]).join(', '))}</small></span><i aria-hidden="true"></i></summary>
      <div class="tm-body"><p>${esc(c.plain)}</p><p class="tm-ex-h">Common Indian business examples</p><ul class="tm-ex">${c.examples.map(e => `<li><span>${esc(e.text)}</span><span class="tm-tags">${e.sectors.map(s => `<span class="tag">${esc(secLabel[s])}</span>`).join('')}</span></li>`).join('')}</ul>
      <p class="tm-kw"><b>Search terms:</b> ${esc(c.keywords.join(', '))}</p></div></details>`;
  };
  const goods = tmClasses.filter(c => c.kind === 'goods'), svc = tmClasses.filter(c => c.kind === 'services');
  const app = `<section class="section tool-app" id="tool"><div class="wrap"><div id="tm-app">
    <div class="tm-top">
      <div class="card tm-helper"><label>Typical classes for your business<select id="tm-biz"><option value="">Choose a business type…</option>${businessTypes.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('')}</select></label><div id="tm-rec" class="tm-rec" aria-live="polite"></div></div>
      <div class="card tm-controls"><div class="search-box">${icon('search', 18)}<input id="tm-q" type="search" placeholder="Search a class number, product or service, e.g. 42, skincare, payments" aria-label="Search trademark classes"></div>
        <div class="tm-chips" role="group" aria-label="Filter by sector">${tmSectors.map(s => `<button type="button" class="tm-chip" data-sector="${s.id}" aria-pressed="false">${esc(s.label)}</button>`).join('')}</div>
        <div class="tm-meta"><span id="tm-count">45 classes in the Nice Classification</span><button type="button" class="tm-reset" id="tm-reset">Reset</button></div></div>
    </div>
    <h2 class="h3 tm-grp">Goods — classes 1 to 34</h2><div class="tm-grid">${goods.map(card).join('')}</div>
    <h2 class="h3 tm-grp">Services — classes 35 to 45</h2><div class="tm-grid">${svc.map(card).join('')}</div>
    <p id="tm-empty" class="cal-note" hidden>No class matches that search. Try a broader word (for example \u201cfood\u201d instead of a brand name), or book a call and we will classify it for you.</p>
  </div></div></section>`;
  const nicRows = businessTypes.map(b => `<tr><th>${esc(b.label)}</th><td>${b.classes.map(n => `<a href="#class-${n}">${n}</a>`).join(', ')}</td><td>${b.nic.map(c => `<b>${esc(c.code)}</b> ${esc(c.desc)}`).join('<br>')}</td></tr>`).join('');
  const how = section({ id: 'how', tone: 'tone-soft', kicker: 'How to use', title: 'Choosing trademark classes and NIC codes', inner: `<div class="how-grid">
    <div class="card ls-reveal"><span class="card-ic">${icon('search', 22)}</span><h3>Search by what you sell</h3><p>India follows the Nice Classification: classes 1 to 34 cover goods and 35 to 45 cover services. Search for the product or service in plain words, then open a class to see what it covers and how similar Indian businesses use it.</p></div>
    <div class="card ls-reveal" style="--ls-delay:80ms"><span class="card-ic">${icon('shield', 22)}</span><h3>File where you trade, not everywhere</h3><p>Each class is a separate application and a separate government fee. File in the classes you use or genuinely plan to use; broad, unused filings invite objections and oppositions. Software products usually need classes 9 and 42; an online store selling your own goods adds class 35.</p></div>
    <div class="card ls-reveal" style="--ls-delay:160ms"><span class="card-ic">${icon('doc', 22)}</span><h3>NIC codes are a different list</h3><p>The National Industrial Classification (NIC 2008) code describes your business activity for SPICe+, Udyam and GST-linked forms. It has nothing to do with trademark classes. The codes below are four-digit NIC classes; forms may ask for the 2-digit division or the 5-digit sub-class within it.</p></div>
  </div>
  <h3 class="h3 ls-reveal" style="margin-top:36px">Typical trademark classes and suggested NIC 2008 codes by business type</h3>
  <div class="matrix-wrap ls-reveal"><table class="matrix"><thead><tr><th>Business type</th><th>Trademark classes</th><th>Suggested NIC 2008 class</th></tr></thead><tbody>${nicRows}</tbody></table></div>
  <p class="muted" style="font-size:14px;margin-top:12px">Suggestions only. The right classes depend on your exact goods and services description, and the right NIC code on your main activity. A trademark search for conflicting marks should come before filing.</p>` });
  const faqs = [
    { q: 'Which trademark class is a SaaS product in?', a: 'Software offered as a service is in class 42. Downloadable software and mobile apps are in class 9. Many SaaS companies file in both, and add class 35 if the product provides business, marketing or marketplace services.' },
    { q: 'Do I need to file in class 35 for an online store?', a: 'Class 35 covers retail and online-store services. If you sell your own products online, file in the goods class for those products (for example class 25 for clothing) and consider class 35 for the store itself, especially if you also sell other brands.' },
    { q: 'Can one trademark application cover several classes?', a: 'Indian law allows a multi-class application, but the official fee is charged per class. Each class is examined for its own goods or services, so the description in each class needs to be accurate.' },
    { q: 'Is an NIC code the same as a trademark class?', a: 'No. NIC 2008 codes classify economic activity for government forms such as SPICe+ and Udyam registration. Trademark classes follow the Nice Classification and decide the scope of your brand protection. You will usually need both.' },
    { q: 'Are these examples a substitute for a trademark search?', a: 'No. They help you understand where your goods and services sit. Before filing, run a search for identical and similar marks in the same and related classes; a professional search also checks phonetic similarity and pending applications.' }
  ];
  const data = { businessTypes, headings: Object.fromEntries(tmClasses.map(c => [c.n, c.heading])) };
  return toolPage({ slug: 'trademark-class-finder', metaTitle: 'Trademark Class Finder India: All 45 Classes & NIC Codes',
    metaDescription: 'Search all 45 Nice trademark classes in plain English with Indian business examples for SaaS, D2C, pharma, EdTech and FinTech, plus suggested NIC 2008 codes.',
    kicker: 'Free tool · Trademark classes', lead: 'Search all 45 Nice classes in plain English, filter by sector, and pick your business type to see the classes founders usually file in — with suggested NIC 2008 codes for your incorporation and Udyam forms.',
    chips: ['All 45 classes', 'Indian business examples', 'NIC 2008 suggestions'],
    body: `${json('tm-data', data)}${app}${how}`, faqs,
    related: [...svcLinks(['private-limited-company-registration', 'msme-udyam-dpiit-startup-registration', 'legal-staffing-virtual-compliance-officer']), ...toolLinks('trademark-class-finder'), ...blogLinks(['saas-msa-vendor-influencer-contract-legal-review-india', 'legal-due-diligence-checklist-indian-seed-startups-cap-table', 'spice-plus-part-a-name-rejection-rules-rule-8'])] });
}

/* =================== hub =================== */
function hubPage() {
  const path = '/tools';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Free tools', path }];
  const desc = { 'incorporation-cost-calculator': 'MCA fees, state stamp duty on MoA/AoA or LLP agreement, PAN, TAN and DSC for any state. Live total, print and CSV.',
    'roc-compliance-calendar': 'Every ROC and income-tax due date for your company or LLP, with status, a late-fee calculator and .ics export.',
    'trademark-class-finder': 'All 45 Nice classes in plain English with Indian business examples, sector filters and suggested NIC 2008 codes.' };
  const cards = `<div class="grid3">${tools.map((t, i) => `<a class="card tool-card ls-reveal ls-lift" style="--ls-delay:${i * 80}ms" href="/tools/${t.slug}"><span class="card-ic">${icon(t.icon, 22)}</span><h3>${esc(t.title)}</h3><p>${esc(desc[t.slug] || t.navHint)}</p><span class="tool-go">Open the tool ${icon('arrow', 16)}</span></a>`).join('')}</div>`;
  const body = `${hero({ kicker: 'Free tools', title: 'Free incorporation and compliance tools for Indian founders', lead: 'Work out what incorporation will cost in your state, generate your annual ROC and tax calendar, and find the right trademark classes — free, in your browser, no sign-up.', crumbs, source: 'Tools hub hero', secondary: { href: '#tools', label: 'See the tools' } })}
${section({ id: 'tools', title: 'Pick a tool', lead: 'Each tool shows how it calculates, labels anything indicative, and lets you print or download the result.', inner: cards })}
${section({ tone: 'tone-soft', kicker: 'Why we built these', title: 'Numbers you can check before you file', inner: `<div class="prose ls-reveal" style="max-width:820px"><p>Most incorporation and compliance mistakes are avoidable: a capital figure that pushes the MCA fee up, an AGM date that quietly sets AOC-4 and MGT-7 running late, a trademark filed in the wrong class. These tools put the rules in front of you, with the statutory basis for each figure.</p><p>They are estimates, not filings. Government fees, stamp duty and due dates change, so confirm on the MCA, state stamp and Income Tax portals, or book a call and a practising professional will do it for you.</p></div>${disclaimer()}` })}
${relatedLinks('Services behind the tools', svcLinks(['private-limited-company-registration', 'llp-registration-india', 'roc-annual-compliance', 'msme-udyam-dpiit-startup-registration']))}
${ctaBand({ source: 'Tools hub CTA' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.itemList('Free tools', tools.map(t => ({ name: t.title, path: `/tools/${t.slug}` })))];
  return { path, priority: 0.7, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Free Incorporation & ROC Compliance Tools for Founders', description: 'Free tools for Indian founders: an incorporation cost and stamp duty calculator, a ROC compliance calendar with late fees, and a trademark class finder.', path, jsonld }), body, active: 'tools' }) };
}

export function pages() {
  return [hubPage(), incPage(), calPage(), tmPage()];
}

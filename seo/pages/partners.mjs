// Advocate Partner Network pages: /partners, /partners/register, /partners/login, /partners/terms, /partners/privacy and the
// signed-in portal shells (/partners/dashboard … /partners/support, noindex). Same header, footer, hero, sections and tokens as every
// other Legal Staff page; behaviour lives in /static/partners.js and the database functions in migration 0039.
// Never promises clients, cases, income or professional success. Commission is described as conditional and is OFF until counsel approves it.
import { page, seoHead, ld, hero, section, faqBlock, icon, esc, abs } from '../lib.mjs';
import { legalPage } from './legal.mjs';
import { CONTENT } from '../data/partners-content.mjs';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { steps: STEPS, benefits: BENEFITS, faq: FAQ } = CONTENT;
const BENEFIT_ICONS = ['spark', 'pin', 'folder', 'doc', 'shield', 'check', 'users', 'book'];

const CSS = '<link rel="stylesheet" href="/static/partners.css">';
const BASE = '/partners';

export const CATEGORIES = [
  ['campus_ambassador', 'users', 'Campus Ambassador', 'Law college students, student communities and law school alumni networks who tell advocates about the LegalStaff Directory.'],
  ['advocate_referral_partner', 'scale', 'Advocate Referral Partner', 'Eligible practising advocates who share the Directory within their professional networks, subject to the conduct requirements that apply to them.'],
  ['legal_bookshop_partner', 'book', 'Legal Bookshop Partner', 'Law bookshops, legal stationery suppliers and legal publishing businesses.'],
  ['court_service_centre_partner', 'print', 'Court Service Centre Partner', 'Typing centres, printing shops, photocopy centres and documentation businesses near courts.'],
  ['district_coordinator', 'pin', 'District Coordinator', 'Independent district-level representatives for permitted platform awareness activities and local partner recruitment.'],
  ['legal_community_partner', 'building', 'Legal Community Partner', 'Legal publishers, legal education communities and other eligible legal ecosystem organisations.']
];
const CATS_JSON = JSON.stringify(CATEGORIES.map(c => ({ key: c[0], name: c[2] }))).replace(/</g, '\\u003c');

const head = (title, description, path, noindex = false) => seoHead({ title, description, path, noindex, jsonld: [ld.breadcrumb([{ name: 'Home', path: '/' }, { name: 'Partners', path: BASE }])] }) + '\n' + CSS;
const crumbs = (name, path) => [{ name: 'Home', path: '/' }, { name: 'Partners', path: BASE }, ...(path === BASE ? [] : [{ name, path }])];
const shell = (title, description, path, body, scripts = [], noindex = false, app = false) => ({ path, noindex, priority: noindex ? 0 : 0.6, changefreq: 'monthly', html: page({ head: head(title, description, path, noindex), body, app, scripts: ['/static/consent.js', '/vendor/supabase.js', ...scripts] }) });

function landing() {
  const cats = `<div class="lg-grid pn-cats" id="pn-cats">${CATEGORIES.map(c => `<div class="lg-tile ls-reveal"><span class="lg-tile-ic">${icon(c[1], 20)}</span><b>${esc(c[2])}</b><span>${esc(c[3])}</span></div>`).join('')}</div>`;
  const steps = `<ol class="pn-steps" id="pn-steps">${STEPS.map((s, i) => `<li class="ls-reveal"><span class="pn-n">${i + 1}</span><div><b>${esc(s.title)}</b><p>${esc(s.text)}</p></div></li>`).join('')}</ol>`;
  const benefits = `<div class="lg-grid" id="pn-benefits">${BENEFITS.map((b, i) => `<div class="lg-tile ls-reveal"><span class="lg-tile-ic">${icon(BENEFIT_ICONS[i % BENEFIT_ICONS.length], 20)}</span><b>${esc(b.title)}</b><span>${esc(b.text)}</span></div>`).join('')}</div>`;
  const commission = `<div class="pn-note ls-reveal" id="pn-rewards"><p><b>How rewards work.</b> ${esc(CONTENT.rewards_note)}</p></div>`;
  const body = `${hero({ kicker: 'Advocate Partner Network', title: CONTENT.hero_title, lead: CONTENT.hero_lead, crumbs: crumbs('Partners', BASE), primary: 'Become a Partner', primaryHref: `${BASE}/register`, secondary: { label: 'Explore Advocate Directory', href: '/directory' }, extra: `<a class="btn btn-ghost-light" href="${BASE}/login">Partner login</a>`, chips: ['Free to join', 'Instant dashboard', 'Unique link and QR code'] })}
${section({ id: 'how', kicker: 'How it works', title: 'From Google sign-in to your dashboard in a minute', inner: steps })}
${section({ id: 'categories', kicker: 'Partner categories', title: 'Six ways to take part', lead: 'Each category has its own eligibility and terms. Choose the one that fits you when you apply.', inner: cats, tone: 'tone-soft' })}
${section({ id: 'benefits', kicker: 'Benefits', title: 'What partners get', inner: benefits })}
${section({ id: 'rewards', kicker: 'Rewards', title: 'Honest about rewards', inner: commission, tone: 'tone-soft' })}
${faqBlock(FAQ)}
<section class="cta-band"><div class="wrap"><div class="cta-in"><div><h2 class="h2 light">Ready to apply?</h2><p class="lead">Registration takes a few minutes. Our team reviews every application.</p></div>
<div class="row-btns"><a class="btn btn-light" href="${BASE}/register">Become a Partner ${icon('arrow', 16)}</a><a class="btn btn-ghost-light" href="${BASE}/login">Partner login</a></div></div></div></section>
<script>window.PN_CATS=${CATS_JSON};</script>`;
  const p = shell('LegalStaff Advocate Partner Network', 'Join a nationwide network helping India\u2019s advocates establish their professional digital presence. Free to join, approved by our team, with a unique referral link and QR code.', BASE, body, ['/static/partners.js']);
  p.html = p.html.replace('</head>', `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }).replace(/</g, '\\u003c')}</script>\n</head>`);
  p.html = p.html.replace('<body>', '<body data-pview="landing">');
  return p;
}

function register() {
  const body = `${hero({ kicker: 'Advocate Partner Network', title: 'Apply to become a partner', lead: 'Sign in with Google and fill in your details. Your referral link and dashboard are ready straight away.', crumbs: crumbs('Apply', `${BASE}/register`), primary: null, secondary: { label: 'Back to Partners', href: BASE } })}
<section class="section"><div class="wrap narrow">
<div class="pn-card" id="pn-app"><noscript><p class="muted">This form needs JavaScript.</p></noscript>
  <p class="muted" id="pn-loading">Loading\u2026</p></div>
</div></section>`;
  return shell('Apply to become a LegalStaff partner', 'Apply to the LegalStaff Advocate Partner Network. Sign in with Google, fill in your details and get your referral link and dashboard straight away.', `${BASE}/register`, body, ['/static/partners.js']);
}
function login() {
  const body = `${hero({ kicker: 'Advocate Partner Network', title: 'Partner sign in', lead: 'Sign in with the Google account you applied with. No password to remember.', crumbs: crumbs('Sign in', `${BASE}/login`), primary: 'Apply to become a partner', primaryHref: `${BASE}/register`, secondary: { label: 'Back to Partners', href: BASE } })}
<section class="section"><div class="wrap narrow"><div class="pn-card" id="pn-login"><p class="muted">Loading\u2026</p></div></div></section>`;
  return shell('Partner sign in', 'Sign in to your LegalStaff partner dashboard with a one-time email code.', `${BASE}/login`, body, ['/static/partners.js']);
}

const li = x => `<li>${x}</li>`;
function terms() {
  const p = legalPage({ path: `${BASE}/terms`, name: 'Partner Terms', metaTitle: 'LegalStaff Partner Terms', description: 'Terms for partners in the LegalStaff Advocate Partner Network: eligibility, referrals, attribution, rewards, conduct, payouts and suspension.', kicker: 'Advocate Partner Network', lead: 'The terms that apply to every LegalStaff partner. Category-specific terms are shown when you apply.', sections: [
    { id: 'status', title: 'Status of this document', html: '<p>This is the working draft of the Partner Terms. It must be reviewed by qualified Indian legal counsel before any reward is activated for any category. Until a category\u2019s arrangement has been approved and recorded, no reward is generated for it, whatever any screen or message says.</p>' },
    { id: 'role', title: 'What a partner is', html: '<p>A partner is an independent person or business who tells practising advocates about the LegalStaff Directory. A partner is not an employee, agent or representative of LegalStaff, cannot bind LegalStaff, and must not describe themselves as one.</p>' },
    { id: 'conduct', title: 'Conduct', html: `<ul>${[
      'Do not promise or imply that a listing will bring clients, cases, income or professional success.',
      'Do not solicit on behalf of any advocate, offer inducements to advocates, or share any part of an advocate\u2019s fees. Advocates remain bound by the rules of their Bar Council and the Bar Council of India, including Rule 36 of the BCI Rules on advertising and solicitation.',
      'Do not misstate LegalStaff\u2019s verification: only LegalStaff decides whether a listing is approved.',
      'Use only the approved marketing material, or material that does not contradict it.',
      'Do not create fake registrations, refer yourself, or manipulate links, QR codes or payments.',
      'Comply with all laws that apply to you, including consent rules for messaging and data protection law.'].map(li).join('')}</ul>` },
    { id: 'attribution', title: 'Referrals and attribution', html: '<p>A referral is recorded by LegalStaff\u2019s servers when an advocate follows your link or QR code and then submits a directory application. The first valid referral within the attribution window (30 days by default) is kept. A referral cannot be moved to another partner after it is recorded. Directory applications made without a referral, or made before a link was followed, are not attributed. Self-referrals and referrals that match your own details are rejected.</p>' },
    { id: 'rewards', title: 'Rewards', html: '<p>Where the programme terms for your category have been approved and switched on, a fixed reward may be recorded when every condition is met: the referral is valid, the advocate is genuine and unique, a payment has been verified (if the listing requires one), required documents are submitted, LegalStaff has approved the listing, and no fraud flag is outstanding. Rewards are reversed if the listing is rejected, refunded or found to be fraudulent. LegalStaff may change reward amounts, and may switch a category on or off, for future referrals.</p><p>A reward is not guaranteed and is not payment for legal work.</p>' },
    { id: 'payouts', title: 'Payouts', html: '<p>Approved rewards are paid by UPI or bank transfer once you have completed KYC and your approved balance reaches the minimum withdrawal. Payouts may be paused, held or refused where there is a compliance or fraud concern. You are responsible for any tax on what you receive.</p>' },
    { id: 'suspension', title: 'Suspension and termination', html: '<p>LegalStaff may suspend or terminate a partner account for breach of these terms, suspected fraud or any conduct that harms advocates or LegalStaff. Existing records are kept for audit and legal reasons.</p>' },
    { id: 'changes', title: 'Changes', html: '<p>We may update these terms. The version you accepted is recorded with your application, and you will be asked to accept a new version where it matters.</p>' }
  ] });
  p.html = p.html.replace('</head>', CSS + '\n</head>');
  return p;
}
function privacy() {
  const p = legalPage({ path: `${BASE}/privacy`, name: 'Partner Privacy Notice', metaTitle: 'LegalStaff Partner Privacy Notice', description: 'How LegalStaff handles partner data: what we collect, why, how long we keep it, and how to correct or erase it, under the DPDP Act, 2023.', kicker: 'Advocate Partner Network', lead: 'What we collect from partners, why, and what you can do about it.', sections: [
    { id: 'status', title: 'Status of this notice', html: '<p>This is a working draft prepared for review by qualified Indian legal counsel against the Digital Personal Data Protection Act, 2023 and the DPDP Rules. It supplements the main <a href="/privacy">Privacy Policy</a>.</p>' },
    { id: 'collect', title: 'What we collect', html: `<ul>${[
      'Identity and contact details: name, email, mobile number, state, district, city, organisation or college, designation.',
      'Application and consent records: the terms and privacy versions you accepted and when.',
      'Referral activity: clicks on your link, advocate applications attributed to you, and their status. Advocates\u2019 contact details are never shown to you.',
      'Payout information, where you request a withdrawal: KYC documents and your UPI or bank details. Payment details are stored encrypted; screens show only a masked version.',
      'Security records: audit logs of important actions, and fraud-review flags.'].map(li).join('')}</ul>` },
    { id: 'why', title: 'Why we use it', html: '<p>To assess and run your partnership, attribute referrals correctly, calculate and pay any reward, prevent fraud, meet legal obligations and support you. We do not sell partner data.</p>' },
    { id: 'keep', title: 'How long we keep it', html: '<p>For as long as your account is active and for the period the law requires for financial and audit records afterwards. Application data of rejected applicants is kept for a limited period for fraud prevention and then erased. LegalStaff will set exact periods in the retention schedule once counsel has reviewed it.</p>' },
    { id: 'rights', title: 'Your rights', html: '<p>You may ask to access, correct or erase your data, withdraw consent, and make a grievance. Use the <a href="/data-rights#request">data rights request form</a>. Some records must be kept where the law requires it.</p>' },
    { id: 'contact', title: 'Grievances', html: '<p>See the Grievance Officer details on the <a href="/privacy">Privacy Policy</a>.</p>' }
  ] });
  p.html = p.html.replace('</head>', CSS + '\n</head>');
  return p;
}

// The partner area is one page. The other portal URLs (referrals, earnings, payouts, profile, resources, support) open the same page scrolled to that section.
const PORTAL = [['dashboard', 'Partner dashboard'], ['referrals', 'Referrals'], ['earnings', 'Monthly earnings'], ['payouts', 'Payouts'], ['profile', 'Profile'], ['resources', 'Resources'], ['support', 'Support']];
function portalPage(view, title) {
  const body = `<div class="pn-portal"><h1 class="pn-sr">Partner dashboard</h1><div class="pn-top"><a href="/" class="pn-brand"><img src="/assets/ls-logo-white.png" alt="Legal Staff" width="120" height="30"></a><a href="#" id="pn-out" class="btn btn-ghost-light btn-sm">Sign out</a></div>
<div id="pn-view" data-view="${view}" aria-live="polite"><div class="pn-skel"><i></i><i></i><i></i></div></div></div>`;
  const pg = shell('Partner dashboard', 'LegalStaff partner dashboard.', `${BASE}/${view}`, body, ['/vendor/qrcode.js', '/static/partners.js'], true, true);
  pg.html = pg.html.replace('<body>', `<body data-pview="portal">`);
  return pg;
}

export function pages() {
  writeFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'static', 'partner-content-defaults.json'), JSON.stringify(CONTENT, null, 1) + '\n');
  return [landing(), register(), login(), terms(), privacy(), ...PORTAL.map(([k, l]) => portalPage(k, l))];
}

// Company and legal pages: /about, /privacy, /cookies, /terms, /refund-policy, /data-rights.
// Written for India's Digital Personal Data Protection Act, 2023 (DPDP Act) and the DPDP Rules, plus standard B2B SaaS terms.
// Operator details come from seo/data/company.mjs; null values render the FALLBACK wording (never invented details).
import { company, FALLBACK } from '../data/company.mjs';
import { page, seoHead, ld, breadcrumbs, icon, esc, abs, SITE } from '../lib.mjs';

const C = company;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = d => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };

/* ---------------- operator details with graceful fallbacks ---------------- */
const legalName = () => esc(C.legalName || FALLBACK.legalName);
const emailLink = e => `<a href="mailto:${esc(e)}">${esc(e)}</a>`;
const contactLine = () => C.email ? `email ${emailLink(C.email)}` : `<a href="/data-rights#request">${FALLBACK.email}</a>`;
const courtsCity = () => C.courtsCity ? `the courts at ${esc(C.courtsCity)}` : esc(FALLBACK.courtsCity);
const G = C.grievanceOfficer || {};
const grievanceBlock = () => `<div class="lg-card lg-officer">
  <p class="lg-card-k">${icon('shield', 16)} Grievance Officer</p>
  ${G.name ? `<p class="lg-card-t">${esc(G.name)}</p><p>Grievance Officer, ${esc(C.brand)}</p>` : `<p class="lg-card-t">${esc(FALLBACK.grievanceOfficer.split(' — ')[0])}</p><p>Reachable through the <a href="/data-rights#request">request form on our Data rights page</a>.</p>`}
  <dl>
    ${G.email ? `<dt>Email</dt><dd>${emailLink(G.email)}</dd>` : ''}
    ${G.phone ? `<dt>Phone</dt><dd><a href="tel:${esc(G.phone.replace(/[^\d+]/g, ''))}">${esc(G.phone)}</a></dd>` : ''}
    <dt>Operator</dt><dd>${legalName()}</dd>
    ${C.address ? `<dt>Address</dt><dd>${esc(C.address)}</dd>` : ''}
  </dl>
</div>`;

/* ---------------- shared layout ---------------- */
const LEGAL = [
  { path: '/about', name: 'About Legal Staff', short: 'About us' },
  { path: '/privacy', name: 'Privacy Policy', short: 'Privacy Policy' },
  { path: '/cookies', name: 'Cookie Policy', short: 'Cookie Policy' },
  { path: '/terms', name: 'Terms of Service', short: 'Terms of Service' },
  { path: '/refund-policy', name: 'Cancellation & Refund Policy', short: 'Refund Policy' },
  { path: '/data-rights', name: 'Data rights & grievances', short: 'Data rights & grievances' }
];
const legalNav = current => `<nav class="lg-nav" aria-label="Company and legal pages"><p>Company &amp; legal</p><ul>${LEGAL.map(l => `<li><a href="${l.path}"${l.path === current ? ' aria-current="page"' : ''}>${esc(l.short)}</a></li>`).join('')}</ul></nav>`;

const NOTE = `<p class="lg-note">${icon('doc', 16)}<span>This policy is provided for information and should be reviewed by your legal adviser.</span></p>`;

const table = (caption, headers, rows) => `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}"><table>
  <caption>${esc(caption)}</caption>
  <thead><tr>${headers.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map((c, j) => j === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
</table></div>`;

/**
 * legalPage: dark title band (breadcrumb, H1, lead, Last updated), then prose + sidebar (table of contents, legal nav).
 * sections: [{ id, title, html }] — each becomes an <h2 id> in the article and a TOC entry when toc is true.
 */
function legalPage({ path, name, metaTitle, description, kicker = 'Company & legal', lead, sections, toc = true, note = true, jsonld = [], scripts = [], tail = '', priority = 0.4 }) {
  const crumbs = [{ name: 'Home', path: '/' }, { name, path }];
  const tocList = `<ol>${sections.map(s => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}</ol>`;
  const article = `<article class="prose lg-body">
    ${toc ? `<details class="toc toc-mobile"><summary>On this page</summary>${tocList}</details>` : ''}
    ${sections.map(s => `<section class="lg-sec" aria-labelledby="${s.id}"><h2 id="${s.id}">${esc(s.title)}</h2>${s.html}</section>`).join('\n')}
    ${note ? NOTE : ''}
  </article>`;
  const aside = `<aside class="post-aside lg-aside" aria-label="On this page and related pages">
    ${toc ? `<nav class="toc toc-desktop" aria-label="On this page"><p>On this page</p>${tocList}</nav>` : ''}
    ${legalNav(path)}
  </aside>`;
  const band = `<section class="hero post-hero lg-hero"><div class="hero-bg" aria-hidden="true"><div class="hero-grid"></div><div class="hero-glow"></div></div>
    <div class="wrap hero-in"><div class="hero-copy">
      ${breadcrumbs(crumbs)}
      <p class="kicker light lh" style="--d:60ms">${esc(kicker)}</p>
      <h1 class="h1 post-title lh" style="--d:120ms">${esc(name)}</h1>
      ${lead ? `<p class="lead lh" style="--d:200ms">${lead}</p>` : ''}
      <p class="post-meta lh" style="--d:280ms"><span>Last updated <time datetime="${C.updated}">${fmtDate(C.updated)}</time></span><span>${esc(C.brand)}</span></p>
    </div></div></section>`;
  const body = `${band}
<section class="section post-section"><div class="wrap"><div class="post-layout">${article}${aside}</div></div></section>${tail}`;
  const head = seoHead({ title: metaTitle, description, path, jsonld: [ld.breadcrumb(crumbs), { '@context': 'https://schema.org', '@type': 'WebPage', name, url: abs(path), dateModified: C.updated, inLanguage: 'en-IN', isPartOf: { '@id': abs('/#website') }, publisher: { '@id': abs('/#org') } }, ...jsonld] });
  return { path, priority, changefreq: 'yearly', lastmod: C.updated, html: page({ head, body, scripts: ['/static/consent.js', ...scripts] }) };
}

/* =====================================================================================
   /about
   ===================================================================================== */
function about() {
  const principles = [
    ['scale', 'The advocate stays in control', 'Legal Staff suggests; you decide. A next hearing date read from an order reaches your diary only after you confirm it, and a limitation date is only a calculation until you approve it.'],
    ['spark', 'AI output is reviewed by an advocate', 'The Case Brain answers only from the orders and documents in the case, with references you can check. It does not invent case law, and every draft or summary is a starting point for an advocate to review.'],
    ['shield', 'Each firm’s data is kept separate', 'Every chamber or firm works in its own space. Database rules (row-level security) stop one firm from seeing another’s cases, and documents sit in private storage.'],
    ['folder', 'Your data is yours', 'We do not sell personal data or use your case files for advertising. You can export your data and close your account.']
  ];
  const does = [
    ['order', 'Court orders', 'Paste or upload an order; Legal Staff summarises it with paragraph references and picks out the next date for you to confirm.', '/features/ai-court-order-reader'],
    ['calendar', 'Court diary', 'One week and day view across all your courts, clash detection, reassigning hearings to juniors and a morning briefing.', '/features/digital-advocate-diary'],
    ['whatsapp', 'Reminders', 'WhatsApp and email reminders before each hearing for you and your team, once WhatsApp is connected.', '/features/whatsapp-hearing-reminders'],
    ['book', 'Research and drafting', 'Case-grounded answers with citations, reference notes on provisions, and drafting templates with DOCX/PDF export.', '/features/ai-legal-research-workspace'],
    ['folder', 'Documents and evidence', 'A per-case vault for pleadings, orders, vakalatnama and certified copies, with exhibit marks.', '/features/case-document-management'],
    ['users', 'Chamber', 'Team roles, tasks, the hearing board, a client list, client sharing and per-matter GST invoices.', '/features/chamber-team-collaboration']
  ];
  const sections = [
    { id: 'what', title: 'What Legal Staff is', html: `<p>${esc(C.brand)} is practice and case management software for Indian advocates and law firms. It keeps cases, court orders, hearing dates, documents, research, drafts, tasks and invoices in one web workspace, and it reminds you and your team before each hearing.</p>
      <p>It is software, not a law firm. It does not give legal advice, and it does not appear in court for anyone. It is a web app that works in desktop and mobile browsers; there is no separate iOS or Android app.</p>
      <div class="lg-grid">${does.map(([ic, t, d, href]) => `<a class="lg-tile ls-lift" href="${href}"><span class="lg-tile-ic">${icon(ic, 18)}</span><b>${esc(t)}</b><span>${esc(d)}</span></a>`).join('')}</div>` },
    { id: 'who', title: 'Who it is for', html: `<ul>
        <li><b>Independent advocates</b> who keep their own diary and want every next date and order in one place.</li>
        <li><b>Chambers</b> with juniors and clerks who need a shared hearing board and clear task assignment.</li>
        <li><b>Law firms and in-house litigation teams</b> handling matters across High Courts, district courts and tribunals.</li>
      </ul>
      <p>See how it fits your forum on the <a href="/courts">courts and tribunals</a> pages, or start with the <a href="/tools">free advocate tools</a>.</p>` },
    { id: 'principles', title: 'Our principles', html: `<div class="lg-principles">${principles.map(([ic, t, d]) => `<div class="lg-principle"><span class="lg-tile-ic">${icon(ic, 18)}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></div>`).join('')}</div>
      <p>How we handle personal data is set out in our <a href="/privacy">Privacy Policy</a>; the rules for using the service are in our <a href="/terms">Terms of Service</a>.</p>` },
    { id: 'contact', title: 'Contact us', html: `<ul>
        <li><b>Product questions or a demo:</b> <button class="lg-linkbtn" type="button" data-book="About page">book a demo</button>${C.email ? ` or ${contactLine()}` : ''}.</li>
        <li><b>Privacy, data rights or a complaint:</b> use the <a href="/data-rights#request">request form on our Data rights page</a>.</li>
        <li><b>Operator:</b> ${legalName()}${C.address ? `, ${esc(C.address)}` : ''}.</li>
      </ul>` }
  ];
  return legalPage({
    path: '/about', name: 'About Legal Staff', kicker: 'About us', priority: 0.5,
    metaTitle: 'About Legal Staff — Software for Indian Advocates',
    description: 'Legal Staff is practice and case management software for Indian advocates and law firms: orders, court diary, reminders, documents and AI you review.',
    lead: 'Practice and case management software for Indian advocates and law firms. The advocate stays in control; the software does the reading and remembering.',
    sections, note: false,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Legal Staff', url: abs('/about'), mainEntity: { '@id': abs('/#org') }, description: SITE.tagline }]
  });
}

/* =====================================================================================
   /privacy
   ===================================================================================== */
function privacy() {
  const collect = table('What we collect and why', ['Data', 'What it includes', 'Why we use it', 'Basis'], [
    ['Sign-in (Google or email code)', 'If you use Google: your name, email address and profile picture, as shared by Google. If you use an email code: your email address, to which we send a one-time code.', 'To create your account, sign you in and show who did what inside your firm.', 'Consent'],
    ['Firm and team details', 'Firm or chamber name, team members’ names, emails, roles and phone numbers.', 'To set up your workspace, control who can see what, and send reminders to the right person.', 'Consent; contract with the firm'],
    ['Practice data your firm enters', 'Cases, parties, clients, hearings, orders, documents, notes, tasks and invoices.', 'To provide the service to your firm. We act as a <b>data processor</b> for this data (see below).', 'On the firm’s instructions'],
    ['Advocate directory applications', 'Name, enrolment number, State Bar Council, enrolment year, city, email, mobile, practice areas, courts, languages, and the names of the verification documents you attach.', 'To verify and, once approved, publish your directory profile. Contact details are used to reach you about the application.', 'Consent'],
    ['Demo and contact requests', 'Name, email, phone, firm and your message.', 'To reply to you and arrange a demo.', 'Consent'],
    ['Payments', 'Order and payment IDs, plan, billing cycle, amount and GSTIN (if you give one). Card, UPI and bank details are handled by Razorpay and never reach us.', 'To activate your plan, issue GST invoices and keep tax records.', 'Contract; legal obligation'],
    ['Notifications', 'The email address or WhatsApp number of the member a reminder is for, and the hearing details in it.', 'To send hearing reminders and briefings that your firm has turned on.', 'Consent; on the firm’s instructions'],
    ['Technical data', 'Hosting logs (IP address, browser, time, page requested) and data kept in your browser’s storage.', 'To keep the service secure and working, and to keep you signed in. See our <a href="/cookies">Cookie Policy</a>.', 'Legitimate use; necessary for the service']
  ]);
  const providers = table('Service providers who process data for us', ['Provider', 'What they do', 'Where'], [
    ['Supabase', 'Database, authentication and private file storage for accounts and practice data.', 'Mumbai, India (ap-south-1 region)'],
    ['Vercel', 'Hosting and content delivery for the website and app files; security logs.', 'Global edge network'],
    ['Google', 'Google sign-in; web fonts for the site.', 'Global'],
    ['Razorpay', 'Payment processing and checkout.', 'India'],
    ['Resend', 'Sending email reminders and notices, once email is connected.', 'May be outside India'],
    ['Meta (WhatsApp Business API)', 'Sending WhatsApp reminders, only once your firm connects WhatsApp.', 'May be outside India'],
    ['A court-data provider', 'Fetching case status by CNR, only if your firm connects one.', 'Depends on the provider']
  ]);
  const sections = [
    { id: 'summary', title: 'In short', html: `<div class="summary"><p>We collect what we need to run Legal Staff for you, we do not sell personal data, and we do not use advertising or analytics cookies. For the case data your firm uploads, your firm decides what is collected and why; we process it only on the firm’s instructions. You can ask to see, correct or erase your data, withdraw consent, nominate someone, or complain, using our <a href="/data-rights">Data rights page</a>.</p></div>` },
    { id: 'who', title: 'Who we are and our role', html: `<p>This policy is issued by ${legalName()} (“Legal Staff”, “we”, “us”). It explains how we handle personal data on our website and in the Legal Staff app, under India’s Digital Personal Data Protection Act, 2023 (the “DPDP Act”) and the Digital Personal Data Protection Rules, as they come into force.</p>
      <p>We have two different roles:</p>
      <ul>
        <li><b>Data fiduciary</b> for account and website data: the details of advocates and staff who sign up, directory applications, demo and contact requests, payments and technical data. We decide why and how this data is used.</li>
        <li><b>Data processor</b> for practice data that a law firm or advocate enters about its clients, opposing parties, witnesses and others in its cases. The firm is the data fiduciary for that data: it decides what to collect and why, and we process it only to provide the service on the firm’s instructions.</li>
      </ul>
      <p>If you are a client of a firm that uses Legal Staff and have a question about your case data, the firm is the right first contact. If you write to us instead, we will pass your request to that firm and tell you we have done so.</p>` },
    { id: 'collect', title: 'What personal data we collect and why', html: `<p>We collect only what each purpose needs. The table lists each purpose.</p>${collect}
      <p>We do not ask for, and you should not upload to the directory, any document beyond what verification needs. We do not use personal data for advertising, and we do not sell it.</p>` },
    { id: 'basis', title: 'Why we are allowed to use it', html: `<p>Most of our processing is based on your <b>consent</b>, which you give when you sign in, apply to the directory, send us a request or turn on a feature. Consent is specific to the purpose shown at the time, and you can withdraw it (see <a href="#rights">your rights</a>).</p>
      <p>Some processing relies on the <b>“certain legitimate uses”</b> the DPDP Act allows without fresh consent, for example where you have given data voluntarily for a specific purpose, or where we must keep records to comply with law (such as tax and GST records) or respond to a lawful request.</p>
      <p>For practice data, the firm is responsible for having a valid basis for the client and party data it enters.</p>` },
    { id: 'sharing', title: 'Who we share data with', html: `<p>We share personal data only with service providers that help us run Legal Staff, under contracts that limit them to providing that service. Some only come into play when your firm turns a feature on.</p>${providers}
      <p>Inside a firm, data is visible to that firm’s members according to the roles the firm sets. Client portal sharing shows a client only what the firm chooses to share. We may also disclose data where the law requires it, for example to comply with a court order or a lawful request from a government authority.</p>` },
    { id: 'transfer', title: 'Data outside India', html: `<p>Our main database and file storage are hosted in ${esc(C.dataRegion)}. Some providers listed above may process data outside India, for example to deliver email or serve website files from the nearest location. The DPDP Act permits transfer of personal data outside India except to countries the Central Government restricts by notification; we will follow any such restriction.</p>` },
    { id: 'retention', title: 'How long we keep data', html: `<ul>
        <li><b>Account and practice data:</b> for as long as the firm’s account is active. The firm can export its data and delete records at any time, and can ask us to delete the account.</li>
        <li><b>After an account is closed:</b> we delete or anonymise the data within a reasonable period, except what we must keep by law.</li>
        <li><b>Payment and invoice records:</b> for as long as tax and accounting laws require.</li>
        <li><b>Directory applications:</b> while the profile is listed or the application is being reviewed; you can ask us to remove it.</li>
        <li><b>Demo, contact and data-rights requests:</b> as long as needed to deal with them and keep a record of how we responded.</li>
      </ul>
      <p>When the purpose is over and no law requires us to keep the data, we erase it, as the DPDP Act and Rules require.</p>` },
    { id: 'security', title: 'How we protect data', html: `<ul>
        <li>Row-level security in the database, so each firm can reach only its own records.</li>
        <li>Private storage for documents, reached only by signed-in members of the firm.</li>
        <li>Encryption in transit (HTTPS) between your browser and our services.</li>
        <li>Sign-in through Google or a one-time email code, so we never store a password.</li>
        <li>Access logging where our providers make it available, and access to production data limited to people who need it.</li>
      </ul>
      <p>No method of storing or sending data is perfectly secure, so we cannot promise absolute security. Please keep your Google account secure and remove team members who leave.</p>` },
    { id: 'breach', title: 'If there is a data breach', html: `<p>If a personal data breach happens, we will act to contain it, and we will inform the people affected and the Data Protection Board of India in the form and within the time the DPDP Act and Rules require. Where we hold the data as a processor for a firm, we will tell that firm promptly so it can meet its own duties.</p>` },
    { id: 'rights', title: 'Your rights under the DPDP Act', html: `<p>As a data principal (the person the data is about), you have the right to:</p>
      <ul>
        <li><b>Access information</b> about the personal data we process, how we process it, and who we have shared it with.</li>
        <li><b>Correction, completion, updating and erasure</b> of your personal data.</li>
        <li><b>Withdraw consent</b> at any time, as easily as you gave it. Withdrawal does not affect processing already done. If you withdraw consent needed to run your account, we may not be able to keep providing the service.</li>
        <li><b>Grievance redressal:</b> to have a complaint about how we handle your data dealt with by us.</li>
        <li><b>Nominate</b> another person to exercise your rights if you die or become unable to do so.</li>
        <li><b>Complain to the Data Protection Board of India</b>, after first using our grievance process.</li>
      </ul>
      <p>The Act also asks data principals not to file false or frivolous complaints and to give accurate information. Each right is explained on our <a href="/data-rights">Data rights page</a>.</p>` },
    { id: 'children', title: 'Children', html: `<p>Legal Staff is a professional tool for advocates and law firms. It is not meant for anyone under 18, and we do not knowingly collect personal data of children without verifiable consent of a parent or lawful guardian. Firms that enter data about a child in a case (for example, a minor party) are responsible, as data fiduciary, for handling it as the law requires. If you think we hold a child’s data by mistake, tell us through the <a href="/data-rights#request">request form</a>.</p>` },
    { id: 'requests', title: 'How to make a request', html: `<p>Use the <a href="/data-rights#request">request form on our Data rights page</a>. We may ask you to confirm your identity before acting on a request. We will respond within the time the DPDP Rules prescribe. If the request is about practice data held by a law firm, we will pass it to that firm and tell you.</p>${grievanceBlock()}` },
    { id: 'changes', title: 'Changes to this policy', html: `<p>We will update this policy when our practices or the law change, and change the “Last updated” date at the top. If a change is significant, we will tell signed-in users in the app or by email before it takes effect.</p>` },
    { id: 'contact', title: 'Contact', html: `<p>For anything in this policy, ${contactLine()}. See also our <a href="/cookies">Cookie Policy</a>, <a href="/terms">Terms of Service</a> and <a href="/refund-policy">Refund Policy</a>.</p>` }
  ];
  return legalPage({
    path: '/privacy', name: 'Privacy Policy', kicker: 'Privacy Policy and DPDP notice',
    metaTitle: 'Privacy Policy & DPDP Act Notice',
    description: 'How Legal Staff collects, uses and protects personal data under India’s DPDP Act, 2023: what we collect, processors, retention and your rights.',
    lead: 'How we collect, use and protect personal data, written for India’s Digital Personal Data Protection Act, 2023 and the DPDP Rules.',
    sections
  });
}

/* =====================================================================================
   /cookies
   ===================================================================================== */
function cookies() {
  const rows = table('Cookies and browser storage on Legal Staff', ['Name or area', 'Provider', 'Purpose', 'Type', 'Duration'], [
    ['Sign-in session<br><code>sb-…-auth-token</code> (localStorage)', 'Legal Staff, via Supabase', 'Keeps you signed in to the app.', 'Strictly necessary', 'Until you sign out or the session expires'],
    ['App data and preferences<br><code>ls.app.v2</code> and other <code>ls.*</code> keys (localStorage)', 'Legal Staff', 'Remembers your settings; when no server is connected, holds your practice data on this device.', 'Strictly necessary', 'Until you clear it or sign out'],
    ['Directory application<br><code>ls.directory.*</code> (localStorage)', 'Legal Staff', 'Remembers your application reference so you can check or edit it.', 'Strictly necessary', 'Until you clear it'],
    ['Saved requests<br><code>ls.contact.requests</code>, <code>ls.data.requests</code> (localStorage)', 'Legal Staff', 'Keeps a demo or data-rights request on this device only if our server could not be reached.', 'Strictly necessary', 'Until you clear it'],
    ['Notice choice<br><code>ls.consent.v1</code> (localStorage)', 'Legal Staff', 'Remembers that you have seen this storage notice.', 'Strictly necessary', 'Until you clear it'],
    ['Google sign-in button', 'Google', 'Loads the “Sign in with Google” button; Google may set its own cookies on Google’s domains.', 'Third party', 'Set by Google'],
    ['Web fonts', 'Google Fonts', 'Delivers the site’s typeface. No cookie is set by us; Google receives your IP address and browser details to send the font files.', 'Third party', 'Not applicable'],
    ['Payment checkout', 'Razorpay', 'Loaded only when you pay for a plan; Razorpay may set cookies for payment security and fraud checks.', 'Third party', 'Set by Razorpay'],
    ['Hosting logs', 'Vercel', 'Server logs that may include your IP address, used for security and to keep the site running. No cookie.', 'Strictly necessary', 'As kept by Vercel']
  ]);
  const sections = [
    { id: 'short', title: 'In short', html: `<div class="summary"><p>Legal Staff uses <b>no advertising or analytics cookies</b>. We use only the browser storage needed to sign you in and run the app. A few third-party services (Google sign-in, Google Fonts, Razorpay checkout and our host, Vercel) receive technical data when they load.</p></div>` },
    { id: 'what', title: 'Cookies and browser storage', html: `<p>Cookies are small files a website saves in your browser. “Local storage” is a similar place in your browser where a site can keep data. Legal Staff mostly uses local storage, which stays on your device and is not sent with every web request.</p>` },
    { id: 'list', title: 'What we use', html: rows },
    { id: 'control', title: 'How to clear or block storage', html: `<ul>
        <li><b>Sign out</b> in the app to end your session.</li>
        <li><b>Clear site data:</b> in Chrome or Edge, open the padlock or site-info icon in the address bar, then “Site settings” or “Cookies and site data” and clear data for this site. In Safari, go to Settings › Safari › Advanced › Website Data. In Firefox, open the padlock icon and choose “Clear cookies and site data”.</li>
        <li><b>Private browsing</b> removes stored data when you close the window.</li>
      </ul>
      <p>Because this storage is strictly necessary, blocking it will sign you out and may stop the app from working. Clearing it on a device with no server connection also deletes practice data kept only on that device, so export first.</p>` },
    { id: 'future', title: 'If this changes', html: `<p>If we ever add analytics or any non-essential cookies, we will ask for your consent first and update this page. For how we handle personal data generally, see our <a href="/privacy">Privacy Policy</a>; for requests, use our <a href="/data-rights">Data rights page</a>.</p>` }
  ];
  return legalPage({
    path: '/cookies', name: 'Cookie Policy', kicker: 'Cookie & device storage policy',
    metaTitle: 'Cookie & Browser Storage Policy',
    description: 'Legal Staff uses no advertising or analytics cookies. See the strictly necessary browser storage we use to sign you in, and the third parties that load.',
    lead: 'No advertising or analytics cookies. Just the browser storage needed to sign you in and run the app.',
    sections
  });
}

/* =====================================================================================
   /terms
   ===================================================================================== */
function terms() {
  const sections = [
    { id: 'about', title: 'About these terms', html: `<p>These Terms of Service (“Terms”) are an agreement between ${legalName()} (“Legal Staff”, “we”) and the advocate, firm or organisation that uses Legal Staff (“you”, the “Customer”). They apply to the website, the app and any related services. By creating an account or using the service, you accept these Terms.</p>` },
    { id: 'eligibility', title: 'Who can use Legal Staff', html: `<ul>
        <li>Legal Staff is for advocates, law firms, chambers and organisations, and their staff. It is not a consumer service, and users must be at least 18.</li>
        <li>If you create an account for a firm or organisation, you confirm you are authorised to accept these Terms for it, and the firm is the Customer.</li>
        <li>You are responsible for the people you invite and for what they do in your workspace.</li>
      </ul>` },
    { id: 'account', title: 'Your account and security', html: `<p>You sign in with Google. Keep your Google account secure, give team members only the roles they need, and remove people who leave. Tell us promptly through the <a href="/data-rights#request">request form</a> if you think your account has been misused.</p>` },
    { id: 'use', title: 'Acceptable use', html: `<p>You agree not to:</p>
      <ul>
        <li>break any law, court order or professional rule, including the Bar Council of India rules that apply to you;</li>
        <li>upload data you have no right to process, or malware;</li>
        <li>try to reach another firm’s data, test our security without written permission, or disrupt the service;</li>
        <li>scrape, resell or reverse-engineer the service except where the law allows;</li>
        <li>use reminders or client sharing to send spam or messages people have not agreed to receive;</li>
        <li>publish false or misleading information in the advocate directory.</li>
      </ul>
      <p>We may remove content or limit access that breaks these rules.</p>` },
    { id: 'data', title: 'Your data', html: `<p><b>You own your data.</b> Everything your firm puts into Legal Staff (cases, client and party details, documents, notes, drafts and invoices) remains yours. You give us a limited licence to host, copy, process and display it only to provide, secure and support the service for you.</p>
      <p>For personal data about your clients and other parties, you are the data fiduciary under the DPDP Act and we are your data processor, as described in our <a href="/privacy">Privacy Policy</a>. You are responsible for having a lawful basis for that data and for responding to your clients’ requests; we will help where we reasonably can.</p>
      <p>We do not sell your data or use your case files to advertise to anyone.</p>` },
    { id: 'ai', title: 'AI features', html: `<p>Legal Staff includes AI features, such as reading court orders, picking out the next hearing date, the Case Brain, research notes and drafting help. These features are assistive:</p>
      <ul>
        <li>Output can be incomplete or wrong. An advocate must review every summary, date, calculation and draft before relying on it or filing it.</li>
        <li>Dates read from orders and limitation calculations are suggestions until you confirm them.</li>
        <li>The output is not legal advice. Legal Staff is software, not a law firm, and does not act for you or your clients.</li>
      </ul>
      <p>You remain responsible for your professional work, your filings and your advice to clients.</p>` },
    { id: 'third', title: 'Third-party services', html: `<p>Some features depend on services we do not control, such as Google sign-in, Razorpay, email delivery, the WhatsApp Business API and court-data providers. Their own terms apply when you use them, and we are not responsible for their availability or for errors in court data they supply. eCourts and court websites are run by the courts, not by us.</p>` },
    { id: 'fees', title: 'Plans, fees and taxes', html: `<ul>
        <li>Paid plans (Solo, Professional, Firm and Enterprise) are billed monthly or annually in Indian rupees at the prices shown when you subscribe.</li>
        <li>Prices are subject to GST and other applicable taxes, which we show on the invoice. Give your GSTIN at checkout to get a GST invoice in your firm’s name.</li>
        <li>Payments are processed by Razorpay. We never see or store your card or UPI details.</li>
        <li>Unless you cancel, a plan renews for the same period at the end of each billing period where your payment method supports renewal; otherwise you will be asked to pay to renew.</li>
        <li>We may change prices for future periods with reasonable notice before they apply to you.</li>
      </ul>` },
    { id: 'cancel', title: 'Cancellation and refunds', html: `<p>You can cancel at any time; your plan stays active until the end of the period you have paid for. Refunds are covered by our <a href="/refund-policy">Cancellation &amp; Refund Policy</a>.</p>` },
    { id: 'termination', title: 'Suspension, termination and export', html: `<ul>
        <li>We may suspend or close an account that seriously or repeatedly breaks these Terms, does not pay, or puts the service or other users at risk. Where reasonable, we will warn you first.</li>
        <li>You can stop using the service and close your account at any time.</li>
        <li>Before closure, and for a reasonable period after it, you can export your data. After that we delete it as described in our <a href="/privacy#retention">Privacy Policy</a>.</li>
      </ul>` },
    { id: 'confidentiality', title: 'Confidentiality', html: `<p>We treat the content of your workspace as confidential. We access it only to provide and support the service, to keep it secure, when you ask us to, or when the law requires it. Our staff and service providers are bound to keep it confidential. We understand that your files may be covered by client confidentiality and professional privilege, and we do not claim any right to them.</p>` },
    { id: 'ip', title: 'Our intellectual property', html: `<p>The Legal Staff software, design, templates, reference notes and brand belong to us or our licensors. While your plan is active, we give you a non-exclusive, non-transferable right to use them for your practice. Documents you create from our templates belong to you. If you send us feedback, we may use it to improve the product without any obligation to you.</p>` },
    { id: 'disclaimers', title: 'Disclaimers', html: `<p>We work to keep Legal Staff available, accurate and secure, but we provide it “as is” and “as available”. To the extent the law allows, we do not promise that it will be uninterrupted or error-free, that court data from third parties will be complete or current, or that AI output will be correct. Always check dates and orders against the court record.</p>` },
    { id: 'liability', title: 'Limitation of liability', html: `<p>To the extent the law allows:</p>
      <ul>
        <li>neither party is liable for indirect, incidental, special or consequential loss, or for lost profits, revenue or goodwill;</li>
        <li>our total liability for all claims relating to the service is limited to the fees you paid us in the ${C.liabilityCap.months} months before the event giving rise to the claim.</li>
      </ul>
      <p>These limits do not apply where the law does not allow them to be limited, such as for fraud.</p>` },
    { id: 'indemnity', title: 'Indemnity', html: `<p>You agree to compensate us for losses and reasonable costs arising from a third-party claim caused by data you uploaded without the right to do so, or by your breach of these Terms or the law.</p>` },
    { id: 'law', title: 'Governing law and disputes', html: `<p>These Terms are governed by the laws of India. Subject to any mandatory law, ${courtsCity()} have exclusive jurisdiction. We encourage you to raise any issue with us first through the <a href="/data-rights#request">request form</a>, so we can try to resolve it informally.</p>` },
    { id: 'changes', title: 'Changes to these terms', html: `<p>We may update these Terms as the service or the law changes. We will change the “Last updated” date and, for significant changes, tell you in the app or by email before they take effect. Continuing to use the service after that means you accept the updated Terms.</p>` },
    { id: 'contact', title: 'Contact', html: `<p>Questions about these Terms: ${contactLine()}. See also our <a href="/privacy">Privacy Policy</a> and <a href="/cookies">Cookie Policy</a>.</p>` }
  ];
  return legalPage({
    path: '/terms', name: 'Terms of Service', kicker: 'Terms of Service',
    metaTitle: 'Terms of Service',
    description: 'The terms for using Legal Staff: accounts, acceptable use, your data, AI features reviewed by an advocate, fees and GST, cancellation, liability and law.',
    lead: 'The rules for using Legal Staff, in plain English. You own your data; AI output is assistive and must be reviewed by an advocate.',
    sections
  });
}

/* =====================================================================================
   /refund-policy
   ===================================================================================== */
function refund() {
  const w = C.refund.windowDays;
  const sections = [
    { id: 'cancel', title: 'Cancelling your plan', html: `<p>You can cancel a monthly or annual plan at any time by writing to us through the <a href="/data-rights#request">request form</a> (choose “Other”), or from the app’s billing settings where that option is shown. When you cancel, your plan stays active until the end of the period you have already paid for, and it will not renew after that. Your data stays available to export.</p>` },
    { id: 'refunds', title: 'Refunds', html: `<ul>
        <li><b>First payment:</b> if you ask within ${w} days of your first payment for a plan, we refund it in full.</li>
        <li><b>After ${w} days:</b> ${C.refund.annualProRata ? 'we refund the unused part of an annual plan on a pro-rata basis.' : 'we do not give pro-rata refunds for the unused part of a monthly or annual period. Your plan simply runs until the end of the period.'}</li>
        <li><b>Renewals:</b> if a renewal was charged and you did not mean it to be, write to us within ${w} days of the charge and we will look at it fairly.</li>
        <li><b>Failed or duplicate payments:</b> if money left your account but the payment failed, or you were charged twice, we refund the extra amount in full to the original payment method.</li>
      </ul>` },
    { id: 'how', title: 'How refunds are paid', html: `<p>Refunds go back to the original payment method through Razorpay. Once we approve a refund, the time it takes to reach you depends on your bank or card issuer; it usually takes several working days. We cannot refund to a different account or in cash.</p>` },
    { id: 'gst', title: 'GST invoices', html: `<p>Every payment comes with a GST invoice${C.gstin ? ` issued under GSTIN ${esc(C.gstin)}` : ''}. If you give your GSTIN at checkout, the invoice is in your firm’s name. When we make a refund, we issue a credit note where GST law requires it.</p>` },
    { id: 'ask', title: 'How to ask', html: `<p>${C.email ? `Email ${emailLink(C.email)} or use` : 'Use'} the <a href="/data-rights#request">request form</a> (choose “Other”) with your firm name, the payment or order ID and the date. See also our <a href="/terms#fees">Terms of Service</a>.</p>` }
  ];
  return legalPage({
    path: '/refund-policy', name: 'Cancellation & Refund Policy', kicker: 'Billing',
    metaTitle: 'Cancellation & Refund Policy',
    description: `Cancel Legal Staff any time; your plan runs to the end of the period paid. Full refund within ${w} days of your first payment; failed or duplicate payments refunded.`,
    lead: `Cancel any time. Full refund if you ask within ${w} days of your first payment.`,
    sections, toc: false
  });
}

/* =====================================================================================
   /data-rights
   ===================================================================================== */
const RELATIONSHIPS = ['I use Legal Staff (advocate or firm member)', 'I am a client of a firm that uses Legal Staff', 'I applied to the advocate directory', 'I visited the website or asked for a demo', 'Other'];
const REQUEST_TYPES = [
  ['access', 'Access my information'],
  ['correction', 'Correct or update my data'],
  ['erasure', 'Erase my data'],
  ['withdraw', 'Withdraw consent'],
  ['nominate', 'Nominate a person'],
  ['grievance', 'Make a complaint (grievance)'],
  ['other', 'Other']
];

function dataRights() {
  const rights = [
    ['Access', 'You can ask for a summary of the personal data we hold about you, what we do with it, and the other organisations we have shared it with (such as the service providers in our Privacy Policy).'],
    ['Correction, completion and updating', 'If your data is wrong, incomplete or out of date, tell us and we will fix it. Most account details you can also change yourself in the app.'],
    ['Erasure', 'You can ask us to erase your data once it is no longer needed for the purpose you gave it for. We may keep some data where a law requires it, such as invoices for tax.'],
    ['Withdraw consent', 'You can withdraw consent at any time, as easily as you gave it. Processing already done stays lawful, and some features or your account may stop working without the data they need.'],
    ['Nominate', 'You can name another person to exercise your rights if you die or become unable to act. Give their name and contact details and how they are related to you.'],
    ['Grievance redressal', 'If you are unhappy with how we have handled your data or a request, you can complain to us and we will look into it and reply.'],
    ['Complain to the Data Protection Board', 'If our reply does not resolve your complaint, you can complain to the Data Protection Board of India. The Act expects you to use our grievance process first.']
  ];
  const form = `<form class="lg-form" id="dr-form" novalidate>
    <div class="grid2"><label>Full name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label></div>
    <div class="grid2"><label><span>Phone <span class="muted">(optional)</span></span><input name="phone" type="tel" inputmode="tel" autocomplete="tel"></label>
      <label>Your relationship with us<select name="relationship" required>${RELATIONSHIPS.map(r => `<option>${esc(r)}</option>`).join('')}</select></label></div>
    <div class="grid2"><label>Request type<select name="type" required>${REQUEST_TYPES.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></label>
      <label>Law firm or advocate <span class="muted">(if your data is in a firm’s case)</span><input name="firm" autocomplete="organization"></label></div>
    <label>Details<textarea name="details" rows="5" required placeholder="What data, which account or application, and what you would like us to do. Please don’t include confidential case details."></textarea></label>
    <label class="check"><input type="checkbox" name="declaration" required> I confirm the information above is true and that the request is about my own data, or that I am authorised to make it.</label>
    <p class="form-err" role="alert" hidden></p>
    <button class="btn btn-dark" type="submit">Send request</button>
  </form>
  <div class="lg-done" id="dr-done" hidden tabindex="-1" role="status">
    <div class="done-ic">${icon('check', 28)}</div>
    <h3>Request received</h3>
    <p>Your reference number is <b class="lg-ref" id="dr-ref"></b>. Keep it for any follow-up.</p>
    <p class="muted" id="dr-done-text"></p>
    <button class="btn btn-ghost" type="button" id="dr-again">Make another request</button>
  </div>`;
  const sections = [
    { id: 'rights', title: 'Your rights', html: `<p>Under India’s Digital Personal Data Protection Act, 2023 and the DPDP Rules, as they come into force, you have these rights over your personal data. How we handle data is explained in our <a href="/privacy">Privacy Policy</a>.</p>
      <div class="lg-rights">${rights.map(([t, d]) => `<div class="lg-right"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>` },
    { id: 'firm-data', title: 'If your data is in a law firm’s case', html: `<p>Law firms and advocates use Legal Staff to manage their cases. For the client and party details they enter, the <b>firm is the data fiduciary</b>: it decides what is collected and why, and we only process it for them. If your request is about that data, we will pass it to the firm and tell you that we have done so. It will usually be quicker to contact the firm directly.</p>` },
    { id: 'request', title: 'Make a request', html: `<p>Fill in the form and we will reply by email. We may ask you to confirm your identity before we act. We will respond within the time the DPDP Rules prescribe.</p>${form}` },
    { id: 'grievance', title: 'Grievance Officer', html: `<p>Complaints about how we handle personal data are dealt with by our Grievance Officer.</p>${grievanceBlock()}` },
    { id: 'board', title: 'Escalating to the Data Protection Board', html: `<p>If you have used our grievance process and are not satisfied with the outcome, you can complain to the <b>Data Protection Board of India</b>, set up under the DPDP Act. Check the Board’s official website for how to file a complaint. Before you escalate, please give us a chance to fix the problem.</p>` }
  ];
  const script = `<script>
(function () {
  'use strict';
  var form = document.getElementById('dr-form'); if (!form) return;
  var err = form.querySelector('.form-err'), done = document.getElementById('dr-done'), btn = form.querySelector('button[type=submit]');
  var LABELS = ${JSON.stringify(Object.fromEntries(REQUEST_TYPES))};
  function ref() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; var r = ''; var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (var i = 0; i < 4; i++) r += a.charAt(Math.floor(Math.random() * a.length)); return 'DR-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + r; }
  function show(msg, refNo) {
    document.getElementById('dr-ref').textContent = refNo; document.getElementById('dr-done-text').textContent = msg;
    form.hidden = true; done.hidden = false; done.focus();
  }
  document.getElementById('dr-again').addEventListener('click', function () { done.hidden = true; form.hidden = false; form.reset(); form.elements.name.focus(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = {}; ['name', 'email', 'phone', 'relationship', 'type', 'firm', 'details'].forEach(function (k) { v[k] = (form.elements[k].value || '').trim(); });
    var bad = !v.name ? 'Enter your name.' : !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v.email) ? 'Enter a valid email address.' : (v.phone && v.phone.replace(/\\D/g, '').length < 10) ? 'Enter a 10-digit phone number, or leave it blank.' : v.details.length < 10 ? 'Tell us a little more about your request.' : !form.elements.declaration.checked ? 'Tick the declaration to continue.' : '';
    if (bad) { err.textContent = bad; err.hidden = false; return; }
    err.hidden = true;
    var refNo = ref(), label = LABELS[v.type] || 'Other';
    var row = { name: v.name, email: v.email, phone: v.phone, firm: v.firm, topic: 'Data request: ' + label, source: 'data-rights',
      message: 'Reference: ' + refNo + '\\nRelationship: ' + v.relationship + '\\nRequest: ' + label + (v.firm ? '\\nFirm named: ' + v.firm : '') + '\\nDeclaration: confirmed\\n\\n' + v.details };
    var cfg = window.LS_CONFIG || {};
    var reset = function () { btn.disabled = false; btn.textContent = 'Send request'; };
    btn.disabled = true; btn.textContent = 'Sending\\u2026';
    if (cfg.supabaseUrl && cfg.supabaseKey && window.fetch) {
      fetch(cfg.supabaseUrl.replace(/\\/$/, '') + '/rest/v1/contact_requests', { method: 'POST', headers: { apikey: cfg.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) })
        .then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); }); reset(); show('We have received your request and will reply to ' + v.email + '.' + (v.relationship.indexOf('client of a firm') > -1 ? ' If it concerns case data held by a law firm, we will pass it to that firm and let you know.' : ''), refNo); })
        .catch(function () { reset(); err.textContent = 'We could not send your request just now. Check your connection and try again. Nothing has been sent yet.'; err.hidden = false; });
    } else {
      var saved = false;
      try { var a = JSON.parse(localStorage.getItem('ls.data.requests') || '[]'); a.push(Object.assign({ at: new Date().toISOString(), ref: refNo }, row)); localStorage.setItem('ls.data.requests', JSON.stringify(a)); saved = true; } catch (x) {}
      reset();
      show((saved ? 'Saved in this browser only. ' : '') + 'Our server is not connected right now, so this request has NOT reached us yet. Please try again later' + ${JSON.stringify(G.email || C.email ? ' or email ' + (G.email || C.email) : '')} + ', quoting this reference.', refNo);
    }
  });
})();
</script>`;
  return legalPage({
    path: '/data-rights', name: 'Your data rights & grievance redressal', kicker: 'DPDP Act rights',
    metaTitle: 'Data Rights & Grievance Redressal (DPDP Act)',
    description: 'Exercise your DPDP Act rights with Legal Staff: access, correction, erasure, withdrawing consent, nomination and grievances. Send a request and get a reference.',
    lead: 'See, correct or erase your data, withdraw consent, nominate someone or make a complaint. Send a request below and you will get a reference number.',
    sections, tail: script, priority: 0.5
  });
}

export function pages() {
  return [about(), privacy(), cookies(), terms(), refund(), dataRights()];
}

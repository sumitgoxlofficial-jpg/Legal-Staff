// Legal Staff — static SEO site toolkit: head/meta, JSON-LD, layout, header, footer matrix and shared blocks.
// Every page is rendered to plain HTML at build time (node seo/build.mjs), so crawlers get full content without JavaScript.
import { features } from './data/features.mjs';
import { courts } from './data/courts.mjs';
import { cities } from './data/cities.mjs';
import { comparisons } from './data/comparisons.mjs';
import { tools } from './data/tools.mjs';
import { pillars } from './data/pillars.mjs';

export const SITE = {
  name: 'Legal Staff',
  url: (process.env.SITE_URL || 'https://legalstaff.in').replace(/\/$/, ''),
  locale: 'en_IN',
  logo: '/assets/ls-logo-black.png',
  mark: '/assets/ls-mark-black.png',
  ogImage: '/assets/ls-logo-black.png',
  email: '',
  tagline: 'Practice and case management for Indian advocates and law firms',
  updated: process.env.SITE_UPDATED || new Date().toISOString().slice(0, 10)
};

/* ---------------- helpers ---------------- */
export const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const abs = p => SITE.url + (p.startsWith('/') ? p : '/' + p);
export const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

/* ---------------- JSON-LD builders ---------------- */
export const ld = {
  organization: () => ({ '@context': 'https://schema.org', '@type': 'Organization', '@id': abs('/#org'), name: SITE.name, url: SITE.url, logo: abs(SITE.logo) }),
  website: () => ({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': abs('/#website'), name: SITE.name, url: SITE.url, inLanguage: 'en-IN', publisher: { '@id': abs('/#org') } }),
  breadcrumb: items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })) }),
  faqPage: faqs => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }),
  softwareApplication: ({ name = SITE.name, description, path = '/', featureList = [] } = {}) => ({
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', '@id': abs('/#app'), name, description: description || 'Practice and case management for Indian advocates and law firms: reads court orders, picks out the next hearing date, sends WhatsApp reminders and keeps cases, documents and research in one workspace.',
    url: abs(path), applicationCategory: 'BusinessApplication', applicationSubCategory: 'Legal practice management', operatingSystem: 'Web',
    offers: { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: '2999', highPrice: '39999', offerCount: '3' }, publisher: { '@id': abs('/#org') },
    ...(featureList.length ? { featureList } : {})
  }),
  article: ({ title, description, path, published, modified, section, keywords = [] }) => ({
    '@context': 'https://schema.org', '@type': 'Article', headline: clip(title, 110), description, url: abs(path), mainEntityOfPage: abs(path),
    datePublished: published, dateModified: modified || published, articleSection: section, keywords: keywords.join(', '), inLanguage: 'en-IN',
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url }, publisher: { '@id': abs('/#org') }, image: abs(SITE.ogImage)
  }),
  webApplication: ({ name, description, path, category = 'BusinessApplication' }) => ({
    '@context': 'https://schema.org', '@type': 'WebApplication', name, description, url: abs(path), applicationCategory: category, operatingSystem: 'Any (web browser)',
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, provider: { '@id': abs('/#org') }
  }),
  itemList: (name, items) => ({ '@context': 'https://schema.org', '@type': 'ItemList', name, itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(it.path), name: it.name })) })
};

/* ---------------- <head> ---------------- */
export function seoHead({ title, description, path, type = 'website', jsonld = [], noindex = false, published, modified }) {
  const full = title.includes(SITE.name) ? title : `${title} | ${SITE.name}`;
  const url = abs(path);
  const graph = [ld.organization(), ...jsonld].map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(clip(description, 165))}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:locale" content="${SITE.locale}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(clip(description, 200))}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(abs(SITE.ogImage))}">
${published ? `<meta property="article:published_time" content="${published}">\n<meta property="article:modified_time" content="${modified || published}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(full)}">
<meta name="twitter:description" content="${esc(clip(description, 200))}">
<meta name="twitter:image" content="${esc(abs(SITE.ogImage))}">
<link rel="icon" type="image/png" href="/assets/ls-favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/motion.css">
<link rel="stylesheet" href="/static/site.css">
<script>document.documentElement.classList.add('ls-js')</script>
${graph}`;
}

/* ---------------- icons (inline SVG, 24px grid, 1.6 stroke) ---------------- */
const ICON = {
  building: 'M4 21V5l8-3 8 3v16 M9 21v-4h6v4 M8 8h.01 M12 8h.01 M16 8h.01 M8 12h.01 M12 12h.01 M16 12h.01',
  handshake: 'M3 12l4-4 4 3 3-3 7 6 M7 8l-4 4 5 5 3-1 M14 8l3 3-6 6',
  stamp: 'M8 3h8v6l-2 3H10L8 9z M5 15h14v3H5z M4 21h16',
  calendar: 'M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4',
  rocket: 'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2 M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5z M15 9h.01',
  users: 'M16 21a6 6 0 0 0-12 0 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21a5 5 0 0 0-4-4.9 M16 3.5a4 4 0 0 1 0 7',
  calc: 'M5 3h14v18H5z M8 7h8 M8 11h.01 M12 11h.01 M16 11h.01 M8 15h.01 M12 15h.01 M16 15h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-5-5',
  scale: 'M12 3v18 M5 21h14 M4 8h16 M6 8l-3 6a4 4 0 0 0 6 0z M18 8l-3 6a4 4 0 0 0 6 0z',
  book: 'M4 4h6a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4z M20 4h-6a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h7z',
  check: 'M5 12l4 4L19 6',
  doc: 'M14 3H6v18h12V7z M14 3v4h4 M9 13h6 M9 17h6',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  chevron: 'M6 9l6 6 6-6',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  close: 'M6 6l12 12 M18 6L6 18',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  order: 'M14 3H6v18h12V7z M14 3v4h4 M9 13h6 M9 17h4',
  chat: 'M4 5h16v11H9l-5 4z M8 9h8 M8 12.5h5',
  whatsapp: 'M4 20l1.3-3.9A8 8 0 1 1 8 19.2z M9 9.5c.3 1.6 1.9 3.6 4 4.5l1.2-1.1 1.8.9-.4 1.6c-3.3.2-7-3.3-7.1-6.6L10 8.5l.8 1.8z',
  folder: 'M3 6h6l2 2h10v12H3z',
  gavel: 'M14 4l6 6 M12 6l6 6 M13 5l-6 6 3 3 6-6 M9 14l-6 6 M4 21h8',
  print: 'M7 8V3h10v5 M5 8h14a2 2 0 0 1 2 2v6h-4 M7 16H3v-6a2 2 0 0 1 2-2 M7 13h10v8H7z'
};
export const icon = (k, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON[k] || ICON.doc}"/></svg>`;

/* ---------------- header ---------------- */
const TOP_CITIES = ['delhi', 'mumbai', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'prayagraj', 'chandigarh', 'ahmedabad', 'pune', 'patna', 'ranchi', 'jaipur', 'lucknow', 'kochi'];
const TOP_COURTS = ['supreme-court-of-india', 'delhi-high-court', 'bombay-high-court', 'madras-high-court', 'calcutta-high-court', 'karnataka-high-court', 'allahabad-high-court', 'punjab-and-haryana-high-court', 'ecourts-district-and-sessions-courts', 'nclt-and-nclat', 'consumer-courts-ncdrc-scdrc', 'drt-debt-recovery-tribunal'];
export const cityPath = slug => `/advocate-software-in-${slug}`;

export function header(active = '') {
  const item = (href, ic, label, hint) => `<a href="${href}" class="nav-dd-item"><span class="nav-dd-ic">${icon(ic, 18)}</span><span><b>${esc(label)}</b><small>${esc(hint)}</small></span></a>`;
  const featItems = features.map(f => item(`/features/${f.slug}`, f.icon, f.navLabel, f.navHint)).join('');
  const courtItems = TOP_COURTS.map(sl => courts.find(c => c.slug === sl)).filter(Boolean).map(c => `<a href="/courts/${c.slug}" class="nav-dd-item nav-dd-plain"><span class="nav-dd-ic">${icon('gavel', 18)}</span><span><b>${esc(c.name)}</b></span></a>`).join('') + `<a href="/courts" class="nav-dd-item nav-dd-plain"><span class="nav-dd-ic">${icon('arrow', 18)}</span><span><b>All courts &amp; tribunals</b></span></a>`;
  const toolItems = tools.map(t => item(`/tools/${t.slug}`, t.icon, t.navLabel, t.navHint)).join('');
  const cmpItems = comparisons.map(c => item(`/compare/${c.slug}`, 'scale', c.navLabel, c.navHint)).join('');
  const dd = (key, label, items, wide) => `<div class="nav-dd${active === key ? ' is-active' : ''}"><button class="nav-link nav-dd-btn" type="button" aria-expanded="false">${label}${icon('chevron', 14)}</button><div class="nav-dd-panel${wide ? ' wide' : ''}" role="menu">${items}</div></div>`;
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header" id="top">
  <div class="wrap nav">
    <a class="brand" href="/" aria-label="${esc(SITE.name)} home"><img src="/assets/ls-mark-white.png" alt="" width="28" height="28"><span>${esc(SITE.name)}</span></a>
    <nav class="nav-links" aria-label="Main">
      ${dd('features', 'Features', featItems, true)}
      ${dd('courts', 'Courts', courtItems, true)}
      ${dd('tools', 'Free Advocate Tools', toolItems)}
      ${dd('compare', 'Compare', cmpItems)}
      <a class="nav-link${active === 'blog' ? ' is-active' : ''}" href="/blog">Blog</a>
    </nav>
    <div class="nav-cta">
      <a class="nav-link nav-signin" href="/app">Sign in</a>
      <a class="btn btn-light btn-sm" href="/#pricing">Start free</a>
      <button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">${icon('menu', 22)}</button>
    </div>
  </div>
  <div class="mobile-nav" id="mobile-nav" hidden>
    <div class="wrap">
      <p class="mn-h">Features</p>${features.map(f => `<a href="/features/${f.slug}">${esc(f.navLabel)}</a>`).join('')}
      <p class="mn-h">Courts</p>${TOP_COURTS.slice(0, 6).map(sl => courts.find(c => c.slug === sl)).filter(Boolean).map(c => `<a href="/courts/${c.slug}">${esc(c.name)}</a>`).join('')}<a href="/courts">All courts &amp; tribunals</a>
      <p class="mn-h">Free advocate tools</p>${tools.map(t => `<a href="/tools/${t.slug}">${esc(t.navLabel)}</a>`).join('')}
      <p class="mn-h">More</p>${comparisons.map(c => `<a href="/compare/${c.slug}">${esc(c.navLabel)}</a>`).join('')}<a href="/blog">Blog</a><a href="/directory">Find an advocate</a><a href="/app">Sign in</a>
      <a class="btn btn-light" href="/#pricing">Start free</a>
      <button class="btn btn-ghost-light" type="button" data-book="Mobile menu" style="margin-top:8px;width:100%">Book a demo</button>
    </div>
  </div>
</header>`;
}

/* ---------------- footer SEO matrix ---------------- */
export function footer() {
  const col = (title, links) => `<div class="f-col"><p class="f-h">${title}</p><ul>${links.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ul></div>`;
  const cityLinks = TOP_CITIES.map(s => cities.find(c => c.slug === s)).filter(Boolean).map(c => [cityPath(c.slug), `Advocate software in ${c.name}`]);
  const courtLinks = TOP_COURTS.map(s => courts.find(c => c.slug === s)).filter(Boolean).map(c => [`/courts/${c.slug}`, c.name]);
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="f-top">
      <div class="f-brand"><img src="/assets/ls-logo-white.png" alt="${esc(SITE.name)}" width="132" height="66" loading="lazy"><p>${esc(SITE.tagline)}. Legal Staff is software: it does not give legal advice, and AI output must be reviewed by an advocate.</p>
        <a class="btn btn-light btn-sm" href="/#pricing">Start free</a></div>
      ${col('Features', features.map(f => [`/features/${f.slug}`, f.navLabel]))}
      ${col('Free advocate tools', [...tools.map(t => [`/tools/${t.slug}`, t.navLabel]), ['/blog', 'Blog & guides']])}
      ${col('Compare', comparisons.map(c => [`/compare/${c.slug}`, c.navLabel]))}
      ${col('Guides by topic', pillars.map(p => [`/blog#${p.id}`, p.name]))}
    </div>
    <div class="f-cities">
      <p class="f-h">Courts &amp; tribunals</p>
      <ul>${courtLinks.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('')}<li><a href="/courts">All courts &amp; tribunals</a></li></ul>
    </div>
    <div class="f-cities">
      <p class="f-h">Practice management software by city</p>
      <ul>${cityLinks.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('')}<li><a href="/advocate-software-in-india">All cities</a></li></ul>
    </div>
    <div class="f-bottom"><span>© ${new Date().getFullYear()} ${esc(SITE.name)}</span><span><a href="/">Home</a> · <a href="/#pricing">Pricing</a> · <a href="/directory">Advocate directory</a> · <a href="/partners">Partners</a> · <a href="/app">Sign in</a> · <a href="/sitemap.xml">Sitemap</a></span><span><a href="/about">About</a> · <a href="/privacy">Privacy policy</a> · <a href="/cookies">Cookie policy</a> · <a href="/terms">Terms</a> · <a href="/refund-policy">Refunds</a> · <a href="/data-rights">Your data rights</a></span></div>
  </div>
</footer>`;
}

/* ---------------- shared blocks ---------------- */
export const breadcrumbs = items => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map((it, i) => i < items.length - 1 ? `<li><a href="${it.path}">${esc(it.name)}</a></li>` : `<li aria-current="page">${esc(it.name)}</li>`).join('')}</ol></nav>`;

export const faqBlock = (faqs, title = 'Frequently asked questions') => `<section class="section" id="faq"><div class="wrap narrow">
  <h2 class="h2 ls-reveal">${esc(title)}</h2>
  <div class="faq">${faqs.map((f, i) => `<details class="faq-item ls-reveal" style="--ls-delay:${Math.min(i, 6) * 60}ms"${i === 0 ? ' open' : ''}><summary><span>${esc(f.q)}</span><i aria-hidden="true"></i></summary><div class="faq-a"><p>${esc(f.a)}</p></div></details>`).join('')}</div>
</div></section>`;

export const ctaBand = ({ title = 'Let Legal Staff read your orders and keep your diary', text = 'Every case, order and hearing date in one place, with WhatsApp reminders before each date. Set up your chamber in minutes.', label = 'Start free', source = 'CTA band' } = {}) => `<section class="cta-band"><div class="wrap">
  <div class="cta-in ls-reveal-scale"><div class="cta-rings" aria-hidden="true"><span></span><span></span><span></span></div>
    <h2 class="h2 light">${esc(title)}</h2><p>${esc(text)}</p>
    <div class="row-btns"><a class="btn btn-light" href="/#pricing">${esc(label)} ${icon('arrow', 16)}</a><button class="btn btn-ghost-light" type="button" data-book="${esc(source)}">Book a demo</button></div>
  </div></div></section>`;

export const disclaimer = (extra = '') => `<p class="disclaimer">${icon('shield', 16)}<span>General information for advocates, not legal advice. Statutes, rules and court practice directions change; check the bare Act, the latest amendments and your court's rules before relying on any date or section.${extra ? ' ' + esc(extra) : ''}</span></p>`;

/* ---------------- booking modal (posts to Supabase contact_requests, falls back to this browser) ---------------- */
const bookingModal = () => `<div class="modal" id="book" hidden aria-hidden="true">
  <div class="modal-bg" data-close></div>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="book-title">
    <button class="modal-x" type="button" data-close aria-label="Close">${icon('close', 20)}</button>
    <div class="book-form-wrap">
      <p class="kicker">Free 20-minute demo</p>
      <h2 id="book-title" class="h3">Book a demo of Legal Staff</h2>
      <p class="muted">We'll walk you through order reading, the court diary and WhatsApp reminders with your own courts in mind.</p>
      <form class="book-form" novalidate>
        <div class="grid2"><label>Name<input name="name" autocomplete="name" required></label><label>Phone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required></label></div>
        <label>Work email<input name="email" type="email" autocomplete="email" required></label>
        <div class="grid2"><label>Chamber or firm<input name="firm" autocomplete="organization"></label>
          <label>Most interested in<select name="topic">${features.map(f => `<option>${esc(f.navLabel)}</option>`).join('')}<option>Everything</option></select></label></div>
        <label>Anything we should know? <span class="muted">(optional)</span><textarea name="message" rows="3"></textarea></label>
        <label class="check"><input type="checkbox" name="consent" required> I agree to be contacted about this request.</label>
        <p class="form-err" role="alert" hidden></p>
        <button class="btn btn-dark btn-block" type="submit">Request a demo</button>
      </form>
    </div>
    <div class="book-done" hidden><div class="done-ic">${icon('check', 28)}</div><h2 class="h3">Request received</h2><p class="muted book-done-text">We'll get in touch within one working day to fix a time.</p><button class="btn btn-dark" type="button" data-close>Done</button></div>
  </div>
</div>`;

/* ---------------- page shell ---------------- */
export function page({ head, body, active = '', scripts = [] }) {
  return `<!doctype html>
<html lang="en-IN">
<head>
${head}
</head>
<body>
${header(active)}
<main id="main">
${body}
</main>
${footer()}
${bookingModal()}
<script src="/config.js"></script>
<script src="/static/site.js" defer></script>
<script src="/static/consent.js" defer></script>
${scripts.filter(s => s !== '/static/consent.js').map(s => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>
`;
}

/* ---------------- section helpers ---------------- */
export const hero = ({ kicker, title, lead, crumbs, primary = 'Start free', primaryHref = '/#pricing', source = 'Hero', secondary, chips = [], art = '' }) => `<section class="hero"><div class="hero-bg" aria-hidden="true"><div class="hero-grid"></div><div class="hero-glow"></div></div>
  <div class="wrap hero-in${art ? ' has-art' : ''}">
    <div class="hero-copy">
      ${crumbs ? breadcrumbs(crumbs) : ''}
      ${kicker ? `<p class="kicker light lh" style="--d:60ms">${esc(kicker)}</p>` : ''}
      <h1 class="h1 lh" style="--d:120ms">${esc(title)}</h1>
      ${lead ? `<p class="lead lh" style="--d:220ms">${esc(lead)}</p>` : ''}
      <div class="row-btns lh" style="--d:320ms"><a class="btn btn-light" href="${primaryHref}">${esc(primary)} ${icon('arrow', 16)}</a>${secondary ? `<a class="btn btn-ghost-light" href="${secondary.href}">${esc(secondary.label)}</a>` : `<button class="btn btn-ghost-light" type="button" data-book="${esc(source)}">Book a demo</button>`}</div>
      ${chips.length ? `<ul class="chips lh" style="--d:420ms">${chips.map(c => `<li>${icon('check', 14)}${esc(c)}</li>`).join('')}</ul>` : ''}
    </div>
    ${art ? `<div class="hero-art lh" style="--d:300ms" aria-hidden="true">${art}</div>` : ''}
  </div></section>`;

export const section = ({ id = '', kicker = '', title, lead = '', inner, tone = '' }) => `<section class="section${tone ? ' ' + tone : ''}"${id ? ` id="${id}"` : ''}><div class="wrap">
  ${kicker ? `<p class="kicker ls-reveal">${esc(kicker)}</p>` : ''}${title ? `<h2 class="h2 ls-reveal">${esc(title)}</h2>` : ''}${lead ? `<p class="lead-dark ls-reveal">${esc(lead)}</p>` : ''}
  ${inner}
</div></section>`;

export const relatedLinks = (title, links) => links.length ? `<section class="section tone-soft"><div class="wrap"><h2 class="h3 ls-reveal">${esc(title)}</h2><div class="rel-grid">${links.map((l, i) => `<a class="rel-card ls-reveal ls-lift" style="--ls-delay:${(i % 4) * 70}ms" href="${l.href}"><span class="rel-k">${esc(l.kind)}</span><b>${esc(l.label)}</b>${l.hint ? `<small>${esc(l.hint)}</small>` : ''}<span class="rel-go">${icon('arrow', 16)}</span></a>`).join('')}</div></div></section>` : '';

export { TOP_CITIES, TOP_COURTS };

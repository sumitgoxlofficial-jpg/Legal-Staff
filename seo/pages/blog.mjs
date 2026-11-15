// /blog (resources hub) and /blog/<slug> (articles). Data: seo/data/blogs.mjs (merges blogs-a + blogs-b), pillars: seo/data/pillars.mjs.
import { blogs } from '../data/blogs.mjs';
import { pillars } from '../data/pillars.mjs';
import { services } from '../data/services.mjs';
import { tools } from '../data/tools.mjs';
import { comparisons } from '../data/comparisons.mjs';
import { page, seoHead, ld, hero, section, ctaBand, breadcrumbs, disclaimer, icon, esc } from '../lib.mjs';

const pillarById = id => pillars.find(p => p.id === id);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = d => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };
const alertIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z M12 10v4.5 M12 17.5h.01"/></svg>`;

// One-line descriptions for the hub sections (keyed by pillar id; unknown pillars simply get none).
const PILLAR_INTRO = {
  'mca-v3-incorporation': 'SPICe+ on the MCA V3 portal, name approval, registered office proof, foreign-owned subsidiaries and converting an existing business.',
  'cma-certifications': 'Which certificates a practising Cost Accountant can sign, cost records and cost audit, bank CMA data, CAS-4 and share valuation.',
  'post-incorp-compliance': 'The first-year filings, director KYC, loans from directors and Startup India tax benefits — with the late-fee traps.',
  'legal-staffing': 'Remote paralegals, virtual compliance officers, contract review and outsourced POSH and due-diligence support.'
};

/* ---------------- validation ---------------- */
const REQUIRED = ['slug', 'pillar', 'title', 'metaTitle', 'metaDescription', 'published', 'updated', 'readMinutes', 'keywords', 'excerpt', 'summary', 'steps', 'rules', 'sections', 'pitfalls', 'faqs', 'related'];
function validate(b, i) {
  const who = `blogs.mjs: post #${i + 1}${b && b.slug ? ` (${b.slug})` : ''}`;
  for (const k of REQUIRED) {
    const v = b[k];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) throw new Error(`${who} is missing required field "${k}"`);
  }
  if (!pillarById(b.pillar)) throw new Error(`${who} has unknown pillar "${b.pillar}" (expected one of ${pillars.map(p => p.id).join(', ')})`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.published) || !/^\d{4}-\d{2}-\d{2}$/.test(b.updated)) throw new Error(`${who} dates must be YYYY-MM-DD`);
  if (!b.steps.items || !b.steps.items.length) throw new Error(`${who} steps.items is empty`);
  if (!b.rules.headers || !b.rules.rows || !b.rules.rows.length) throw new Error(`${who} rules needs headers and rows`);
  for (const [j, r] of b.rules.rows.entries()) if (r.length !== b.rules.headers.length) throw new Error(`${who} rules row ${j + 1} has ${r.length} cells, expected ${b.rules.headers.length}`);
  for (const s of b.sections) if (!s.heading || !s.paragraphs || !s.paragraphs.length) throw new Error(`${who} has a section without heading/paragraphs`);
  for (const f of b.faqs) if (!f.q || !f.a) throw new Error(`${who} has an FAQ without q/a`);
  // Soft checks: report, don't break the build.
  const warn = m => console.warn(`[blog] ${who}: ${m}`);
  if (b.metaTitle.length > 60) warn(`metaTitle is ${b.metaTitle.length} chars (> 60)`);
  if (b.metaDescription.length < 140 || b.metaDescription.length > 160) warn(`metaDescription is ${b.metaDescription.length} chars (want 140–160)`);
  if (b.faqs.length !== 4) warn(`has ${b.faqs.length} FAQs (contract says exactly 4)`);
}

/* ---------------- PillarCTA: sticky sidebar lead magnet, chosen by the article's pillar ---------------- */
export function PillarCTA(pillarId) {
  const p = pillarById(pillarId);
  if (!p) throw new Error('PillarCTA: unknown pillar ' + pillarId);
  const svc = services.find(s => s.slug === p.cta.service);
  return `<div class="pillar-cta" data-pillar="${esc(p.id)}">
    <div class="pc-rings" aria-hidden="true"><span></span><span></span></div>
    <span class="pc-k">${esc(p.name)}</span>
    <h3>${esc(p.cta.title)}</h3>
    <ul>${p.cta.points.map(pt => `<li>${icon('check', 15)}<span>${esc(pt)}</span></li>`).join('')}</ul>
    <button class="btn btn-light btn-block" type="button" data-book="Blog: ${esc(p.name)}" data-topic="${esc(p.cta.topic)}">${esc(p.cta.label)} ${icon('arrow', 16)}</button>
    <a class="pc-link" href="/services/${esc(p.cta.service)}">${esc(svc ? `See ${svc.navLabel} plans` : 'See the service')} ${icon('arrow', 14)}</a>
  </div>`;
}

/* ---------------- shared bits ---------------- */
const metaLine = (b, p) => `<span>${esc(p.name)}</span><span>${b.readMinutes} min read</span><span>Updated <time datetime="${b.updated}">${fmtDate(b.updated)}</time></span>`;
const card = (b, i) => {
  const p = pillarById(b.pillar);
  const hay = [b.title, b.excerpt, ...(b.keywords || []), p.name].join(' ').toLowerCase().replace(/\s+/g, ' ');
  return `<a class="post-card ls-reveal ls-lift" style="--ls-delay:${(i % 3) * 70}ms" href="/blog/${b.slug}" data-pillar="${esc(b.pillar)}" data-search="${esc(hay)}">
    <span class="pc-pillar">${esc(p.short)}</span><h3>${esc(b.title)}</h3><p>${esc(b.excerpt)}</p>
    <span class="pc-meta">${b.readMinutes} min read · Updated ${fmtDate(b.updated)}</span></a>`;
};

function relatedFor(b) {
  const out = [];
  for (const sl of b.related.services || []) { const s = services.find(x => x.slug === sl); if (s) out.push({ kind: 'Service', label: s.navLabel, hint: s.navHint, href: `/services/${s.slug}` }); }
  for (const sl of b.related.tools || []) { const t = tools.find(x => x.slug === sl); if (t) out.push({ kind: 'Free tool', label: t.title || t.navLabel, href: `/tools/${t.slug}` }); }
  for (const sl of b.related.compare || []) { const c = comparisons.find(x => x.slug === sl); if (c) out.push({ kind: 'Compare', label: c.title || c.navLabel, href: `/compare/${c.slug}` }); }
  // Sibling guides: only link posts that exist (the other data file may still be partial); top up from the same pillar.
  const sib = (b.related.blogs || []).map(sl => blogs.find(x => x.slug === sl)).filter(x => x && x.slug !== b.slug);
  for (const x of blogs) { if (sib.length >= 3) break; if (x.pillar === b.pillar && x.slug !== b.slug && !sib.includes(x)) sib.push(x); }
  for (const x of sib) out.push({ kind: 'Guide', label: x.title, href: `/blog/${x.slug}` });
  return out;
}

/* ---------------- article ---------------- */
function articlePage(b) {
  const p = pillarById(b.pillar);
  const path = `/blog/${b.slug}`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Resources', path: '/blog' }, { name: p.name, path: `/blog#${p.id}` }, { name: b.title, path }];
  const toc = [
    ['summary', 'Executive summary'],
    ['steps', b.steps.heading || 'Step-by-step guide'],
    ['rules', b.rules.heading || 'Statutory rules and forms'],
    ...b.sections.map((s, i) => [`more-${i + 1}`, s.heading]),
    ['pitfalls', 'Common pitfalls'],
    ['faq', 'Frequently asked questions'],
    ['related', 'Related services and guides']
  ];
  const tocList = `<ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol>`;
  const rel = relatedFor(b);

  const prose = `<article class="prose post-body">
    <details class="toc toc-mobile"><summary>On this page</summary>${tocList}</details>
    <h2 id="summary">Executive summary</h2>
    <div class="summary">${b.summary.map(x => `<p>${esc(x)}</p>`).join('')}</div>

    <h2 id="steps">${esc(b.steps.heading || 'Step-by-step guide')}</h2>
    <ol class="post-steps">${b.steps.items.map(s => `<li class="ls-reveal"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>

    <h2 id="rules">${esc(b.rules.heading || 'Statutory rules and forms')}</h2>
    <div class="table-wrap" tabindex="0" role="region" aria-label="${esc(b.rules.caption || b.rules.heading)}"><table>
      ${b.rules.caption ? `<caption>${esc(b.rules.caption)}</caption>` : ''}
      <thead><tr>${b.rules.headers.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${b.rules.rows.map(r => `<tr>${r.map((c, j) => j === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>

    ${b.sections.map((s, i) => `<h2 id="more-${i + 1}">${esc(s.heading)}</h2>${s.paragraphs.map(x => `<p>${esc(x)}</p>`).join('')}${s.bullets && s.bullets.length ? `<ul>${s.bullets.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`).join('\n')}

    <h2 id="pitfalls">Common pitfalls</h2>
    <div class="pitfalls">${b.pitfalls.map(x => `<div class="pitfall">${alertIcon}<div><b>${esc(x.title)}</b><p>${esc(x.text)}</p></div></div>`).join('')}</div>

    <h2 id="faq">Frequently asked questions</h2>
    <div class="faq">${b.faqs.map((f, i) => `<details class="faq-item"${i === 0 ? ' open' : ''}><summary><span>${esc(f.q)}</span><i aria-hidden="true"></i></summary><div class="faq-a"><p>${esc(f.a)}</p></div></details>`).join('')}</div>

    ${disclaimer()}

    <h2 id="related">Related services and guides</h2>
    <div class="rel-grid">${rel.map(l => `<a class="rel-card ls-lift" href="${l.href}"><span class="rel-k">${esc(l.kind)}</span><b>${esc(l.label)}</b>${l.hint ? `<small>${esc(l.hint)}</small>` : ''}<span class="rel-go">${icon('arrow', 16)}</span></a>`).join('')}</div>
  </article>`;

  const aside = `<aside class="post-aside" aria-label="On this page and next steps">
    <nav class="toc toc-desktop" aria-label="On this page"><p>On this page</p>${tocList}</nav>
    ${PillarCTA(b.pillar)}
  </aside>`;

  const head = `<section class="hero post-hero"><div class="hero-bg" aria-hidden="true"><div class="hero-grid"></div><div class="hero-glow"></div></div>
    <div class="wrap hero-in"><div class="hero-copy">
      ${breadcrumbs(crumbs)}
      <p class="kicker light lh" style="--d:60ms"><a href="/blog#${p.id}">${esc(p.name)}</a></p>
      <h1 class="h1 post-title lh" style="--d:120ms">${esc(b.title)}</h1>
      <p class="lead lh" style="--d:200ms">${esc(b.excerpt)}</p>
      <p class="post-meta lh" style="--d:280ms">${metaLine(b, p)}</p>
    </div></div></section>`;

  const body = `${head}
<section class="section post-section"><div class="wrap"><div class="post-layout">${prose}${aside}</div></div></section>
${ctaBand({ title: p.cta.title, text: 'Book a free 15-minute call. A practising professional reviews your case, lists what is missing and quotes a fixed fee.', label: p.cta.label, source: `Blog CTA band: ${p.name}` })}`;

  const jsonld = [
    ld.article({ title: b.title, description: b.metaDescription, path, published: b.published, modified: b.updated, section: p.name, keywords: b.keywords }),
    ld.breadcrumb(crumbs),
    ld.faqPage(b.faqs)
  ];
  return { path, priority: 0.7, changefreq: 'monthly', lastmod: b.updated, html: page({ head: seoHead({ title: b.metaTitle, description: b.metaDescription, path, jsonld, type: 'article', published: b.published, modified: b.updated }), body, active: 'blog', scripts: ['/static/blog.js'] }) };
}

/* ---------------- hub ---------------- */
function hubPage() {
  const path = '/blog';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Resources', path }];
  const sorted = [...blogs].sort((a, b) => b.updated.localeCompare(a.updated));
  const tools_ = `<div class="blog-tools">
    <div class="search-box">${icon('search', 18)}<label class="sr-only" for="blog-q">Search guides</label><input id="blog-q" type="search" placeholder="Search guides — e.g. INC-20A, CAS-4, DIN" autocomplete="off"></div>
    <div class="blog-filters" role="group" aria-label="Filter by topic">
      <button type="button" data-filter="all" aria-pressed="true">All <span>${blogs.length}</span></button>
      ${pillars.map(p => `<button type="button" data-filter="${esc(p.id)}" aria-pressed="false">${esc(p.name)} <span>${blogs.filter(b => b.pillar === p.id).length}</span></button>`).join('')}
    </div>
    <p class="blog-count muted" aria-live="polite"></p>
  </div>`;
  const groups = pillars.map(p => {
    const list = sorted.filter(b => b.pillar === p.id);
    return `<section class="blog-group" id="${esc(p.id)}" data-group="${esc(p.id)}">
      <div class="bg-head"><h2 class="h3">${esc(p.name)}</h2>${PILLAR_INTRO[p.id] ? `<p class="muted">${esc(PILLAR_INTRO[p.id])}</p>` : ''}</div>
      ${list.length ? `<div class="post-grid">${list.map(card).join('')}</div>` : `<p class="muted">New guides on this topic are on the way. <a href="/services/${esc(p.cta.service)}">See the related service</a>.</p>`}
    </section>`;
  }).join('');
  const body = `${hero({ kicker: 'Resources', title: 'Guides for Indian founders, finance teams and firms', lead: 'Step-by-step guides to MCA V3 filings, CMA and CA certifications, first-year ROC compliance and legal staffing — with the forms, due dates and penalties in one place.', crumbs, source: 'Blog hub', chips: [`${blogs.length} in-depth guides`, 'Forms, due dates and fees in tables', 'Updated for 2026'] })}
${section({ id: 'guides', inner: `${tools_}<div class="blog-groups">${groups}</div><p class="blog-empty muted" hidden>No guide matches that search. Try a form name such as SPICe+, INC-20A or DIR-3 KYC, or <button type="button" class="linkish" data-book="Blog search: no result">ask us directly</button>.</p>` })}
${ctaBand({ source: 'Blog hub CTA' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.itemList('Legal Staff guides', sorted.map(b => ({ name: b.title, path: `/blog/${b.slug}` })))];
  return { path, priority: 0.8, changefreq: 'weekly', html: page({ head: seoHead({ title: 'Guides: MCA V3, CMA Certification & ROC Compliance', description: 'Practical guides on SPICe+ and MCA V3 filings, practising CMA certificates, cost audit, first-year ROC compliance and remote legal staffing for Indian companies.', path, jsonld }), body, active: 'blog', scripts: ['/static/blog.js'] }) };
}

export function pages() {
  blogs.forEach(validate);
  const seen = new Set();
  for (const b of blogs) { if (seen.has(b.slug)) throw new Error('blogs.mjs: duplicate slug ' + b.slug); seen.add(b.slug); }
  return [hubPage(), ...blogs.map(articlePage)];
}

// /blog (resources hub) and /blog/<slug> (articles). Data: seo/data/blogs.mjs (merges blogs-a + blogs-b), pillars: seo/data/pillars.mjs.
import { blogs } from '../data/blogs.mjs';
import { pillars } from '../data/pillars.mjs';
import { features } from '../data/features.mjs';
import { courts } from '../data/courts.mjs';
import { tools } from '../data/tools.mjs';
import { comparisons } from '../data/comparisons.mjs';
import { page, seoHead, ld, hero, section, ctaBand, breadcrumbs, disclaimer, icon, esc } from '../lib.mjs';

const pillarById = id => pillars.find(p => p.id === id);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = d => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };
const alertIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z M12 10v4.5 M12 17.5h.01"/></svg>`;

// One-line descriptions for the hub sections (keyed by pillar id; unknown pillars simply get none).
const PILLAR_INTRO = {
  'court-diary-whatsapp': 'Next-date tracking, cause lists, WhatsApp hearing reminders and moving your diary from paper to one calendar for every court.',
  'ai-order-reader-research': 'How AI reads orders, drafts and summaries you can verify, research without invented citations, and keeping client files confidential.',
  'procedural-limitation': 'Limitation, written statement, section 138 and IBC timelines, and the new BNS, BNSS and BSA section numbers, worked through step by step.',
  'chamber-management': 'Running a chamber: juniors and clerks, the daily hearing board, client updates, documents and per-hearing billing.'
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

/* ---------------- AdvocateCTA: sticky sidebar card, chosen by the article's pillar (stacks after the article on mobile) ---------------- */
export function AdvocateCTA(pillarId) {
  const p = pillarById(pillarId);
  if (!p) throw new Error('AdvocateCTA: unknown pillar ' + pillarId);
  const f = features.find(x => x.slug === p.cta.feature);
  return `<div class="pillar-cta advocate-cta" data-pillar="${esc(p.id)}">
    <div class="pc-rings" aria-hidden="true"><span></span><span></span></div>
    <span class="pc-k">${esc(p.name)}</span>
    <p class="pc-title">${esc(p.cta.title)}</p>
    <ul>${p.cta.points.map(pt => `<li>${icon('check', 15)}<span>${esc(pt)}</span></li>`).join('')}</ul>
    <div class="pc-btns">
      <a class="btn btn-light btn-block" href="/#pricing">${esc(p.cta.label || 'Start free')} ${icon('arrow', 16)}</a>
      <button class="btn btn-ghost-light btn-block" type="button" data-book="Blog: ${esc(p.name)}">Book a demo</button>
    </div>
    ${f ? `<a class="pc-link" href="/features/${esc(f.slug)}">See ${esc(f.navLabel)} ${icon('arrow', 14)}</a>` : ''}
  </div>`;
}
export const PillarCTA = AdvocateCTA;

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
  const r = b.related || {};
  for (const sl of r.features || []) { const f = features.find(x => x.slug === sl); if (f) out.push({ kind: 'Feature', label: f.navLabel, hint: f.navHint, href: `/features/${f.slug}` }); }
  for (const sl of r.courts || []) { const c = courts.find(x => x.slug === sl); if (c) out.push({ kind: 'Court', label: c.name, href: `/courts/${c.slug}` }); }
  for (const sl of r.tools || []) { const t = tools.find(x => x.slug === sl); if (t) out.push({ kind: 'Free tool', label: t.title || t.navLabel, href: `/tools/${t.slug}` }); }
  for (const sl of r.compare || []) { const c = comparisons.find(x => x.slug === sl); if (c) out.push({ kind: 'Compare', label: c.title || c.navLabel, href: `/compare/${c.slug}` }); }
  // Sibling guides: only link posts that exist (the other data file may still be partial); top up from the same pillar.
  const sib = (r.blogs || []).map(sl => blogs.find(x => x.slug === sl)).filter(x => x && x.slug !== b.slug);
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
    ['rules', b.rules.heading || 'Rules at a glance'],
    ...b.sections.map((s, i) => [`more-${i + 1}`, s.heading]),
    ['pitfalls', 'Common pitfalls'],
    ['faq', 'Frequently asked questions'],
    ['related', 'Related features and guides']
  ];
  const tocList = `<ol>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol>`;
  const rel = relatedFor(b);

  const prose = `<article class="prose post-body">
    <details class="toc toc-mobile"><summary>On this page</summary>${tocList}</details>
    <h2 id="summary">Executive summary</h2>
    <div class="summary">${b.summary.map(x => `<p>${esc(x)}</p>`).join('')}</div>

    <h2 id="steps">${esc(b.steps.heading || 'Step-by-step guide')}</h2>
    <ol class="post-steps">${b.steps.items.map(s => `<li class="ls-reveal"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>

    <h2 id="rules">${esc(b.rules.heading || 'Rules at a glance')}</h2>
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

    <h2 id="related">Related features and guides</h2>
    <div class="rel-grid">${rel.map(l => `<a class="rel-card ls-lift" href="${l.href}"><span class="rel-k">${esc(l.kind)}</span><b>${esc(l.label)}</b>${l.hint ? `<small>${esc(l.hint)}</small>` : ''}<span class="rel-go">${icon('arrow', 16)}</span></a>`).join('')}</div>
  </article>`;

  const aside = `<aside class="post-aside" aria-label="On this page and next steps">
    <nav class="toc toc-desktop" aria-label="On this page"><p>On this page</p>${tocList}</nav>
    ${AdvocateCTA(b.pillar)}
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
${ctaBand({ title: p.cta.title, text: 'Orders read and summarised, next dates confirmed into one diary, and WhatsApp reminders before every hearing. Set up your chamber in minutes.', label: p.cta.label || 'Start free', source: `Blog CTA band: ${p.name}` })}`;

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
    <div class="search-box">${icon('search', 18)}<label class="sr-only" for="blog-q">Search guides</label><input id="blog-q" type="search" placeholder="Search guides — e.g. cause list, bail, section 12" autocomplete="off"></div>
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
      ${list.length ? `<div class="post-grid">${list.map(card).join('')}</div>` : `<p class="muted">New guides on this topic are on the way. <a href="/features/${esc(p.cta.feature)}">See the related feature</a>.</p>`}
    </section>`;
  }).join('');
  const body = `${hero({ kicker: 'Resources for advocates', title: 'Practical guides for Indian advocates and chambers', lead: 'Court diaries and next-date tracking, WhatsApp hearing reminders, reading orders with AI, limitation and procedural timelines, and running a chamber — written for litigators, with the rules in tables.', crumbs, source: 'Blog hub', chips: [`${blogs.length} in-depth guides`, 'Procedure and timelines in tables', 'Updated for 2026'] })}
${section({ id: 'guides', inner: `${tools_}<div class="blog-groups">${groups}</div><p class="blog-empty muted" hidden>No guide matches that search. Try a term such as cause list, written statement or section 138, or <button type="button" class="linkish" data-book="Blog search: no result">ask us directly</button>.</p>` })}
${ctaBand({ source: 'Blog hub CTA' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.itemList('Legal Staff guides for advocates', sorted.map(b => ({ name: b.title, path: `/blog/${b.slug}` })))];
  return { path, priority: 0.8, changefreq: 'weekly', html: page({ head: seoHead({ title: 'Guides for Advocates: Court Diary, AI & Procedure', description: 'Practical guides for Indian advocates: next-date tracking, WhatsApp hearing reminders, AI order reading, limitation timelines and running a chamber.', path, jsonld }), body, active: 'blog', scripts: ['/static/blog.js'] }) };
}

export function pages() {
  blogs.forEach(validate);
  const seen = new Set();
  for (const b of blogs) { if (seen.has(b.slug)) throw new Error('blogs.mjs: duplicate slug ' + b.slug); seen.add(b.slug); }
  return [hubPage(), ...blogs.map(articlePage)];
}

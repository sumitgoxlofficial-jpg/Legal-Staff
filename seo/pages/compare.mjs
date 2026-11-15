// /compare and /compare/<slug>
import { comparisons } from '../data/comparisons.mjs';
import { features } from '../data/features.mjs';
import { tools } from '../data/tools.mjs';
import { page, seoHead, ld, hero, section, faqBlock, ctaBand, relatedLinks, disclaimer, icon, esc } from '../lib.mjs';

let blogIndex = [];
try { blogIndex = (await import('../data/blogs.mjs')).blogs || []; } catch (e) { blogIndex = []; }

const art = c => `<svg viewBox="0 0 360 280" width="360" height="280" fill="none" aria-hidden="true">
  <circle cx="180" cy="140" r="120" stroke="#262626"/>
  ${c.columns.map((col, i) => { const n = c.columns.length, w = 92, gap = 16, x0 = 180 - (n * w + (n - 1) * gap) / 2 + i * (w + gap); return `<g class="ls-float" style="animation-delay:${-i * 1.6}s"><rect x="${x0}" y="${60 + i * 10}" width="${w}" height="${150 - i * 4}" rx="12" fill="${i === 0 ? '#FFFFFF' : '#141414'}" stroke="#2E2E2E"/><rect x="${x0 + 14}" y="${78 + i * 10}" width="${w - 40}" height="8" rx="4" fill="${i === 0 ? '#0A0A0A' : '#BDBDBD'}"/>${[0, 1, 2, 3].map(r => `<rect x="${x0 + 14}" y="${102 + i * 10 + r * 22}" width="${w - 28 - ((r + i) % 3) * 12}" height="6" rx="3" fill="${i === 0 ? '#CFCFCF' : '#3A3A3A'}"/>`).join('')}</g>`; }).join('')}
  <g class="ls-float" style="animation-delay:-3s"><circle cx="292" cy="62" r="22" fill="#FFFFFF"/><path d="M282 62l7 7 13-14" stroke="#0A0A0A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
</svg>`;

function comparePage(c) {
  const path = `/compare/${c.slug}`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Compare', path: '/compare' }, { name: c.navLabel, path }];
  const jsonld = [
    ld.article({ title: c.title, description: c.metaDescription, path, published: c.published || '2026-11-15', modified: c.updated, section: 'Comparisons', keywords: c.keywords || [] }),
    ld.breadcrumb(crumbs), ld.faqPage(c.faqs)
  ];
  const head = `<tr><th scope="col">Criteria</th>${c.columns.map(col => `<th scope="col">${esc(col.name)}<div class="muted" style="font-weight:400;font-size:13px">${esc(col.tagline)}</div></th>`).join('')}</tr>`;
  const rows = c.rows.map(r => `<tr><th scope="row">${esc(r.label)}</th>${c.columns.map(col => `<td${r.best === col.key ? ' class="win"' : ''}>${esc(r.values[col.key])}${r.best === col.key ? '<span class="best">Best</span>' : ''}</td>`).join('')}</tr>`).join('');
  const matrix = `<div class="matrix-wrap ls-reveal"><table class="matrix"><caption class="lp-sr" style="position:absolute;left:-9999px">${esc(c.title)}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div><p class="muted" style="font-size:13px;margin:10px 0 0">Scroll sideways on small screens to see every column.</p>`;
  const decide = `<div class="decide">${c.decide.map((d, i) => { const col = c.columns.find(x => x.key === d.column) || { name: d.column }; return `<div class="card ls-reveal ls-lift" style="--ls-delay:${i * 90}ms"><span class="tag dark">Choose ${esc(col.name)}</span><h3>${esc(d.title)}</h3><ul>${d.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`; }).join('')}</div>`;
  const verdict = `<div class="prose ls-reveal" style="max-width:820px"><h2 style="margin-top:0">${esc(c.verdict.heading)}</h2>${c.verdict.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>${c.note ? `<p class="muted" style="font-size:13.5px;max-width:820px;margin:18px 0 0">${esc(c.note)}</p>` : ''}${disclaimer()}`;
  const rel = [
    ...(c.related.features || []).map(sl => features.find(x => x.slug === sl)).filter(Boolean).map(x => ({ kind: 'Feature', label: x.navLabel, hint: x.navHint, href: `/features/${x.slug}` })),
    ...(c.related.tools || []).map(sl => tools.find(t => t.slug === sl)).filter(Boolean).map(t => ({ kind: 'Free tool', label: t.title, href: `/tools/${t.slug}` })),
    ...(c.related.blogs || []).map(sl => blogIndex.find(b => b.slug === sl)).filter(Boolean).map(b => ({ kind: 'Guide', label: b.title, href: `/blog/${b.slug}` })),
    ...comparisons.filter(x => x.slug !== c.slug && x.title).map(x => ({ kind: 'Compare', label: x.title, href: `/compare/${x.slug}` }))
  ];
  const body = `${hero({ kicker: c.kicker, title: c.title, lead: c.lead, crumbs, source: 'Compare hero', secondary: { href: '#matrix', label: 'See the comparison' }, art: art(c) })}
${section({ id: 'matrix', kicker: 'Side by side', title: 'The comparison at a glance', inner: matrix })}
${section({ id: 'decide', tone: 'tone-soft', kicker: 'When to choose which', title: 'Pick the option that fits your stage', inner: decide })}
${section({ id: 'verdict', inner: verdict })}
${faqBlock(c.faqs)}
${relatedLinks('Keep reading', rel)}
${ctaBand({ title: 'See Legal Staff with your own courts and cases', text: 'Move your diary over in an afternoon. Orders are read for you, dates wait for your confirmation, and reminders go out on WhatsApp.', source: 'Compare CTA band' })}`;
  return { path, priority: 0.8, changefreq: 'monthly', html: page({ head: seoHead({ title: c.metaTitle, description: c.metaDescription, path, jsonld, type: 'article' }), body, active: 'compare' }) };
}

function hubPage() {
  const path = '/compare';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Compare', path }];
  const cards = `<div class="grid3">${comparisons.map((c, i) => `<a class="card ls-reveal ls-lift" style="--ls-delay:${i * 80}ms;text-decoration:none" href="/compare/${c.slug}"><span class="card-ic">${icon('scale', 22)}</span><h3>${esc(c.title)}</h3><p>${esc(c.navHint)}</p></a>`).join('')}</div>`;
  const body = `${hero({ kicker: 'Compare', title: 'How Legal Staff compares for Indian litigators', lead: 'Paper diaries, the eCourts app and enterprise legal ERPs — compared on time spent, missed-date risk, cost and fit for a chamber.', crumbs, source: 'Compare hub' })}
${section({ title: 'All comparisons', inner: cards })}${ctaBand({ source: 'Compare hub CTA' })}`;
  return { path, priority: 0.6, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Compare Advocate Diary and Practice Management Options', description: 'Paper diaries vs Legal Staff, the eCourts app vs a full chamber workspace, and enterprise legal ERPs vs AI-first practice management — compared side by side.', path, jsonld: [ld.breadcrumb(crumbs), ld.itemList('Comparisons', comparisons.map(c => ({ name: c.navLabel, path: `/compare/${c.slug}` })))] }), body, active: 'compare' }) };
}

export function pages() {
  for (const c of comparisons) if (!c.rows) throw new Error('comparisons.mjs: ' + c.slug + ' has no content yet');
  return [hubPage(), ...comparisons.map(comparePage)];
}

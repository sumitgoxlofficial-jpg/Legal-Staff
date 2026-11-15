// /services and /services/<slug>
import { services } from '../data/services.mjs';
import { comparisons } from '../data/comparisons.mjs';
import { tools } from '../data/tools.mjs';
import { page, seoHead, ld, hero, section, faqBlock, ctaBand, relatedLinks, disclaimer, icon, esc, inr } from '../lib.mjs';

let blogIndex = [];
try { blogIndex = (await import('../data/blogs.mjs')).blogs || []; } catch (e) { blogIndex = []; }

// Hero illustration: a filing card that ticks through steps (pure SVG, animated with motion.css classes).
const art = s => `<svg class="svc-art" viewBox="0 0 360 300" width="360" height="300" fill="none">
  <defs><linearGradient id="sv-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#CFCFCF"/><stop offset="1" stop-color="#7A7A7A"/></linearGradient></defs>
  <circle cx="180" cy="150" r="128" stroke="#262626"/><circle cx="180" cy="150" r="96" stroke="#1F1F1F" stroke-dasharray="3 6" class="ls-spin-slow"/>
  <g class="ls-float-slow"><rect x="70" y="52" width="220" height="196" rx="14" fill="#141414" stroke="#2E2E2E"/>
    <rect x="90" y="74" width="96" height="10" rx="5" fill="url(#sv-silver)"/><rect x="90" y="92" width="60" height="6" rx="3" fill="#3A3A3A"/>
    ${s.timeline.slice(0, 4).map((t, i) => `<g transform="translate(90 ${120 + i * 30})"><rect width="22" height="22" rx="6" fill="${i < 3 ? '#FFFFFF' : '#1F1F1F'}" stroke="#3A3A3A"/>${i < 3 ? '<path d="M6 11l4 4 7-8" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' : ''}<rect x="34" y="4" width="${120 - i * 12}" height="6" rx="3" fill="#4A4A4A"/><rect x="34" y="14" width="${70 + i * 8}" height="4" rx="2" fill="#2E2E2E"/></g>`).join('')}
  </g>
  <g class="ls-float" style="animation-delay:-2s"><rect x="236" y="34" width="104" height="40" rx="10" fill="#FFFFFF"/><circle cx="256" cy="54" r="8" fill="#0A0A0A"/><path d="M252 54l3 3 5-6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><rect x="270" y="47" width="56" height="6" rx="3" fill="#0A0A0A"/><rect x="270" y="57" width="38" height="4" rx="2" fill="#BDBDBD"/></g>
  <g class="ls-float" style="animation-delay:-4s"><rect x="24" y="214" width="112" height="40" rx="10" fill="#FFFFFF"/><rect x="38" y="226" width="16" height="16" rx="4" stroke="#0A0A0A" stroke-width="1.6"/><path d="M42 234h8 M46 230v8" stroke="#0A0A0A" stroke-width="1.6" stroke-linecap="round"/><rect x="62" y="227" width="60" height="6" rx="3" fill="#0A0A0A"/><rect x="62" y="237" width="40" height="4" rx="2" fill="#BDBDBD"/></g>
</svg>`;

function servicePage(s) {
  const path = `/services/${s.slug}`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }, { name: s.navLabel, path }];
  const minPrice = Math.min(...s.tiers.map(t => t.price));
  const jsonld = [
    ld.legalService({ name: s.title, description: s.metaDescription, path, offers: s.tiers.map(t => ({ name: `${s.navLabel} — ${t.name}`, desc: t.for, price: t.price })) }),
    ld.breadcrumb(crumbs), ld.faqPage(s.faqs)
  ];
  const docs = s.documents.map((g, gi) => `<div class="doc-group ls-reveal" style="--ls-delay:${gi * 80}ms"><h3 class="h3">${esc(g.group)}</h3><ul class="checklist">${g.items.map(it => `<li><span class="tick">${icon('check', 14)}</span><span><b>${esc(it.name)}</b>${it.note ? `<small>${esc(it.note)}</small>` : ''}</span></li>`).join('')}</ul></div>`).join('');
  const timeline = `<ol class="timeline">${s.timeline.map(t => `<li><span class="t-when">${esc(t.when)}</span><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>${t.forms && t.forms.length ? `<div class="t-forms">${t.forms.map(f => `<span class="tag">${esc(f)}</span>`).join('')}</div>` : ''}</li>`).join('')}</ol>`;
  const tiers = `<div class="tiers">${s.tiers.map((t, i) => `<div class="tier ls-reveal ls-lift${t.featured ? ' featured' : ''}" style="--ls-delay:${i * 90}ms">
      ${t.featured ? '<span class="tag dark" style="align-self:flex-start">Most complete</span>' : ''}<h3>${esc(t.name)}</h3><p class="t-for">${esc(t.for)}</p>
      <p class="t-price">${inr(t.price)} <small>${esc(t.priceNote || 'professional fee')}</small></p>
      <ul>${t.includes.map(x => `<li>${icon('check', 15)}<span>${esc(x)}</span></li>`).join('')}</ul>
      <button class="btn ${t.featured ? 'btn-dark' : 'btn-ghost'}" type="button" data-book="Tier: ${esc(t.name)}" data-topic="${esc(s.navLabel)}">Choose ${esc(t.name)}</button></div>`).join('')}</div>
    <p class="muted" style="margin:18px 0 0;font-size:14px">${esc(s.govFeesNote)}</p>`;
  const deliver = `<ul class="checklist">${s.deliverables.map(d => `<li class="ls-reveal"><span class="tick">${icon('check', 14)}</span><span><b>${esc(d)}</b></span></li>`).join('')}</ul>`;
  const rel = [
    ...(s.related.tools || []).map(sl => tools.find(t => t.slug === sl)).filter(Boolean).map(t => ({ kind: 'Free tool', label: t.title, href: `/tools/${t.slug}` })),
    ...(s.related.compare || []).map(sl => comparisons.find(c => c.slug === sl)).filter(c => c && c.title).map(c => ({ kind: 'Compare', label: c.title, href: `/compare/${c.slug}` })),
    ...(s.related.services || []).map(sl => services.find(x => x.slug === sl)).filter(Boolean).map(x => ({ kind: 'Service', label: x.navLabel, hint: x.navHint, href: `/services/${x.slug}` })),
    ...(s.related.blogs || []).map(sl => blogIndex.find(b => b.slug === sl)).filter(Boolean).map(b => ({ kind: 'Guide', label: b.title, href: `/blog/${b.slug}` }))
  ];
  const body = `${hero({ kicker: s.kicker, title: s.title, lead: s.lead, crumbs, source: 'Service hero', chips: s.chips, secondary: { href: '#pricing', label: `Plans from ${inr(minPrice)}` }, art: art(s) })}
${section({ id: 'overview', kicker: 'Overview', title: s.intro.heading, inner: `<div class="prose ls-reveal" style="max-width:820px">${s.intro.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}</div>` })}
${section({ id: 'documents', tone: 'tone-soft', kicker: 'Documents required', title: 'Checklist: what to keep ready', lead: 'Scanned, legible colour copies. We tell you within a day if anything needs to be re-done.', inner: `<div class="doc-groups">${docs}</div>` })}
${section({ id: 'process', kicker: 'Step-by-step filing timeline', title: 'How the filing runs, start to finish', inner: timeline })}
${section({ id: 'pricing', tone: 'tone-soft', kicker: 'Deliverables & pricing', title: 'Fixed professional fees', lead: 'Pick the scope you need. Government fees and stamp duty are charged at actuals, with the receipt.', inner: tiers })}
${section({ id: 'deliverables', kicker: 'What you receive', title: 'Deliverables', inner: deliver + disclaimer() })}
${faqBlock(s.faqs)}
${relatedLinks('Related tools, comparisons and guides', rel)}
${ctaBand({ title: `Start your ${s.navLabel.toLowerCase()} today`, source: 'Service CTA band' })}`;
  return { path, priority: 0.9, changefreq: 'monthly', html: page({ head: seoHead({ title: s.metaTitle, description: s.metaDescription, path, jsonld }), body, active: s.slug === 'cma-ca-cs-certification-services' ? 'cma' : 'services' }) };
}

function hubPage() {
  const path = '/services';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Services', path }];
  const cards = `<div class="grid3">${services.map((s, i) => `<a class="card ls-reveal ls-lift" style="--ls-delay:${(i % 3) * 80}ms;text-decoration:none" href="/services/${s.slug}"><span class="card-ic">${icon(s.icon, 22)}</span><h3>${esc(s.navLabel)}</h3><p>${esc(s.navHint)}</p><p style="margin-top:12px;color:var(--ink);font-weight:600;font-size:14px">From ${inr(Math.min(...s.tiers.map(t => t.price)))} ${icon('arrow', 14).replace('<svg', '<svg style="display:inline;vertical-align:-2px"')}</p></a>`).join('')}</div>`;
  const body = `${hero({ kicker: 'Services', title: 'Incorporation, certification and compliance — handled by practising professionals', lead: 'Fixed-fee company and LLP registration, CMA/CA/CS certificates, annual ROC filings, Startup India recognition and dedicated legal staff, for founders and firms across India.', crumbs, source: 'Services hub' })}
${section({ title: 'Choose a service', inner: cards })}
${ctaBand({ source: 'Services hub CTA' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.itemList('Services', services.map(s => ({ name: s.navLabel, path: `/services/${s.slug}` })))];
  return { path, priority: 0.8, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Company Registration, CMA Certification & ROC Compliance Services in India', description: 'Fixed-fee Private Limited and LLP registration, practising CMA/CA/CS certification, annual ROC compliance, Startup India and MSME registration, and remote legal staffing.', path, jsonld }), body, active: 'services' }) };
}

export function pages() {
  for (const s of services) if (!s.tiers) throw new Error('services.mjs: ' + s.slug + ' has no content yet');
  return [hubPage(), ...services.map(servicePage)];
}

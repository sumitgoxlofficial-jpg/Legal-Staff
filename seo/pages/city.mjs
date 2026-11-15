// /advocate-software-in-<slug> (one page per city) and the hub at /advocate-software-in-india (cities grouped by state with their High Court).
import { cities } from '../data/cities.mjs';
import { features } from '../data/features.mjs';
import { courts } from '../data/courts.mjs';
import { tools } from '../data/tools.mjs';
import { page, seoHead, ld, hero, section, faqBlock, ctaBand, relatedLinks, icon, esc, cityPath } from '../lib.mjs';

let blogIndex = [];
try { blogIndex = (await import('../data/blogs.mjs')).blogs || []; } catch (e) { blogIndex = []; }

const HUB = '/advocate-software-in-india';
const bySlug = Object.fromEntries(cities.map(c => [c.slug, c]));
const courtBySlug = Object.fromEntries(courts.map(c => [c.slug, c]));
const humanize = slug => { const s = slug.replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
const blogTitle = slug => (blogIndex.find(b => b.slug === slug) || {}).title || humanize(slug);

// High Court for each state on the hub (court slug where a court page exists).
const STATE_HC = {
  'Delhi': ['Delhi High Court', 'delhi-high-court'], 'Maharashtra': ['Bombay High Court', 'bombay-high-court'], 'Karnataka': ['Karnataka High Court', 'karnataka-high-court'],
  'Tamil Nadu': ['Madras High Court', 'madras-high-court'], 'West Bengal': ['Calcutta High Court', 'calcutta-high-court'], 'Telangana': ['High Court for the State of Telangana'],
  'Uttar Pradesh': ['Allahabad High Court', 'allahabad-high-court'], 'Chandigarh': ['Punjab and Haryana High Court', 'punjab-and-haryana-high-court'], 'Gujarat': ['Gujarat High Court', 'gujarat-high-court'],
  'Bihar': ['Patna High Court', 'patna-high-court'], 'Jharkhand': ['Jharkhand High Court', 'jharkhand-high-court'], 'Rajasthan': ['Rajasthan High Court'], 'Kerala': ['Kerala High Court'],
  'Madhya Pradesh': ['Madhya Pradesh High Court'], 'Assam': ['Gauhati High Court'], 'Odisha': ['Orissa High Court'], 'Chhattisgarh': ['Chhattisgarh High Court'],
  'Himachal Pradesh': ['Himachal Pradesh High Court'], 'Uttarakhand': ['Uttarakhand High Court']
};

const KIND_ICON = { 'Supreme Court': 'scale', 'High Court': 'gavel', 'District courts': 'building', 'Tribunal': 'stamp', 'Consumer': 'shield', 'Other': 'doc' };
const BENEFIT_ICON = ['calendar', 'clock', 'whatsapp', 'folder'];

/* Hero art: a dark "today" board built from the city's own forums, with one clash flagged. */
const PURPOSES = [['Admission', 'Arguments', 'Evidence'], ['Mention', 'Final hearing', 'Framing of issues'], ['Fresh matter', 'Bail', 'Cross-examination'], ['Interim relief', 'Orders', 'Reply filing']];
function heroBoard(c) {
  const h = [...c.slug].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const purp = PURPOSES[h % PURPOSES.length];
  const fs = c.courts.slice(0, 3);
  const rows = [
    { t: '10:30', f: fs[0], p: purp[0], who: 'You' },
    { t: '10:30', f: fs[1] || fs[0], p: purp[1], who: 'Clash', clash: true },
    { t: '14:15', f: fs[2] || fs[1] || fs[0], p: purp[2], who: 'Junior' }
  ];
  return `<div class="cty-board">
    <div class="cty-board-h"><span>${icon('calendar', 16)}Today · ${esc(c.name)}</span><span class="cty-dot"></span></div>
    <ul>${rows.map((r, i) => `<li class="ls-float" style="animation-delay:${-i * 1.4}s"><span class="cty-t">${r.t}</span><span class="cty-f"><b>${esc(r.f.short || r.f.name)}</b><small>${esc(r.p)}</small></span><span class="cty-who${r.clash ? ' is-clash' : ''}">${esc(r.who)}</span></li>`).join('')}</ul>
    <div class="cty-board-f">${icon('whatsapp', 15)}<span>Reminder sent to the junior for 14:15</span></div>
  </div>`;
}

const courtCard = (ct, i) => {
  const link = ct.court && courtBySlug[ct.court];
  const title = link ? `<a href="/courts/${ct.court}">${esc(ct.name)}</a>` : esc(ct.name);
  return `<article class="cty-court ls-reveal" style="--ls-delay:${(i % 3) * 70}ms">
    <div class="cty-court-h"><span class="card-ic">${icon(KIND_ICON[ct.kind] || 'doc', 20)}</span><span class="tag">${esc(ct.kind)}</span></div>
    <h3>${title}</h3><p>${esc(ct.note)}</p>
    ${ct.places ? `<ul class="cty-places">${ct.places.map(p => `<li>${icon('pin', 13)}${esc(p)}</li>`).join('')}</ul>` : ''}
    ${link ? `<a class="cty-more" href="/courts/${ct.court}">${esc(link.short || link.name)} guide ${icon('arrow', 14)}</a>` : ''}
  </article>`;
};

function cityPage(c) {
  const path = cityPath(c.slug);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Cities', path: HUB }, { name: c.name, path }];
  const hc = c.courts.find(x => x.kind === 'High Court') || c.courts[0];
  const jsonld = [
    ld.softwareApplication({ path, description: `Practice and case management for advocates in ${c.name}: court orders read and next dates confirmed, a court diary across ${hc.name} and local courts, WhatsApp reminders and a document vault.` }),
    ld.breadcrumb(crumbs), ld.faqPage(c.faqs)
  ];
  const lead = `One diary for ${hc.name} and the courts and tribunals around ${c.name}. Orders read and summarised, next dates confirmed by you, reminders on WhatsApp for the whole chamber.`;

  const glance = `<div class="cty-intro">
    <div class="prose ls-reveal">${c.intro.map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <aside class="cty-facts ls-reveal" style="--ls-delay:120ms" aria-label="${esc(c.name)} at a glance">
      <p class="cty-facts-k">${esc(c.name)} at a glance</p>
      <dl>
        <div><dt>State / UT</dt><dd>${esc(c.state)}</dd></div>
        <div><dt>High Court</dt><dd>${hc.court && courtBySlug[hc.court] ? `<a href="/courts/${hc.court}">${esc(hc.name)}</a>` : esc(hc.name)}</dd></div>
        <div><dt>Forums on this page</dt><dd>${c.courts.length} court and tribunal groups</dd></div>
        <div><dt>Nearby</dt><dd>${c.nearby.map(s => bySlug[s]).filter(Boolean).map(n => `<a href="${cityPath(n.slug)}">${esc(n.name)}</a>`).join(', ')}</dd></div>
      </dl>
    </aside>
  </div>`;

  const courtsInner = `<div class="cty-courts">${c.courts.map(courtCard).join('')}</div>
    <p class="cty-note">${icon('shield', 15)}<span>Court locations, benches and territorial jurisdiction change from time to time. Check the court’s official website and the latest notifications before filing.</span></p>`;

  const notes = `<ol class="cty-notes">${c.barNotes.map((n, i) => `<li class="ls-reveal" style="--ls-delay:${i * 70}ms"><span class="cty-n">${String(i + 1).padStart(2, '0')}</span><p>${esc(n)}</p></li>`).join('')}</ol>`;

  const benefits = `<div class="cty-benefits">${c.benefits.map((b, i) => `<div class="card ls-reveal ls-lift" style="--ls-delay:${i * 80}ms"><span class="card-ic">${icon(BENEFIT_ICON[i % BENEFIT_ICON.length], 22)}</span><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></div>`).join('')}</div>`;

  const nearby = c.nearby.map(s => bySlug[s]).filter(Boolean);
  const nearbyInner = `<ul class="cty-near">${nearby.map(n => `<li><a class="ls-lift" href="${cityPath(n.slug)}">${icon('pin', 16)}<span><b>${esc(n.name)}</b><small>${esc(n.state)}</small></span></a></li>`).join('')}<li><a class="ls-lift" href="${HUB}">${icon('arrow', 16)}<span><b>All cities</b><small>By state and High Court</small></span></a></li></ul>`;

  const rel = [
    ...c.features.map(sl => features.find(f => f.slug === sl)).filter(Boolean).map(f => ({ kind: 'Feature', label: f.navLabel, hint: f.navHint, href: `/features/${f.slug}` })),
    ...tools.map(t => ({ kind: 'Free tool', label: t.title || t.navLabel, hint: t.navHint, href: `/tools/${t.slug}` })),
    ...c.blogs.map(sl => ({ kind: 'Guide', label: blogTitle(sl), href: `/blog/${sl}` }))
  ];

  const body = `${hero({ kicker: `Advocate software · ${c.state}`, title: c.title, lead, crumbs, source: `City hero: ${c.name}`, chips: ['Next dates confirmed by you', 'Clash detection', 'WhatsApp and email reminders'], art: heroBoard(c) })}
${section({ id: 'overview', kicker: `Practising in ${c.name}`, title: `What a ${c.name} litigation practice looks like`, inner: glance })}
${section({ id: 'courts', tone: 'tone-soft', kicker: 'Local courts', title: `Courts and tribunals ${c.name} advocates appear before`, inner: courtsInner })}
${section({ id: 'practice', kicker: 'Local practice notes', title: `What shapes the working day in ${c.name}`, inner: notes })}
${section({ id: 'workflow', tone: 'tone-soft', kicker: 'Chamber workflow', title: `How Legal Staff fits a ${c.name} chamber`, inner: benefits })}
${faqBlock(c.faqs, `Questions from advocates in ${c.name}`)}
${section({ id: 'nearby', kicker: 'Nearby', title: `Advocate software near ${c.name}`, inner: nearbyInner })}
${relatedLinks(`Features, tools and guides for ${c.name} chambers`, rel)}
${ctaBand({ title: `Run your ${c.name} diary from one screen`, text: `Upload an order from ${hc.short || hc.name}, confirm the next date and let Legal Staff remind your team before every hearing.`, source: `City CTA: ${c.name}` })}`;

  return { path, priority: 0.7, changefreq: 'monthly', html: page({ head: seoHead({ title: c.metaTitle, description: c.metaDescription, path, jsonld }), body }) };
}

function hubPage() {
  const path = HUB;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Cities', path }];
  const states = [];
  for (const c of cities) { let g = states.find(s => s.state === c.state); if (!g) states.push(g = { state: c.state, list: [] }); g.list.push(c); }
  const groups = states.map((g, gi) => {
    const [hcName, hcSlug] = STATE_HC[g.state] || ['High Court'];
    const hc = hcSlug && courtBySlug[hcSlug] ? `<a href="/courts/${hcSlug}">${esc(hcName)}</a>` : esc(hcName);
    return `<section class="cty-state ls-reveal" style="--ls-delay:${(gi % 4) * 60}ms" aria-labelledby="st-${gi}">
      <div class="cty-state-h"><h3 id="st-${gi}">${esc(g.state)}</h3><p>${icon('gavel', 15)}<span>${hc}</span></p></div>
      <ul>${g.list.map(c => { const h = c.courts.find(x => x.kind === 'High Court') || c.courts[0]; return `<li><a class="ls-lift" href="${cityPath(c.slug)}"><b>${esc(c.name)}</b><small>${esc(h.name)}</small><span class="rel-go">${icon('arrow', 15)}</span></a></li>`; }).join('')}</ul>
    </section>`;
  }).join('');
  const faqs = [
    { q: 'Is Legal Staff only for the cities listed here?', a: 'No. Legal Staff works for any court or tribunal in India. These pages describe how chambers in particular cities use it, with the courts they appear before most often.' },
    { q: 'Does Legal Staff fetch cause lists from every court?', a: 'No. It does not scrape court websites or cause lists. It reads the orders you paste or upload and proposes the next date for your confirmation. Case import by CNR works where a court-data provider is connected.' },
    { q: 'Can one account cover matters in several states?', a: 'Yes. A chamber’s diary can hold matters from any High Court, district court or tribunal, with clash detection across all of them.' }
  ];
  const body = `${hero({ kicker: 'Cities', title: 'Practice and case management software for advocates across India', lead: 'Pick your city to see the High Court, district courts and tribunals local chambers work with, and how Legal Staff keeps one diary across them.', crumbs, source: 'City hub' })}
${section({ title: 'Cities by state and High Court', lead: `${cities.length} cities across ${states.length} states and union territories. Each page covers the local courts, practice notes and questions advocates there ask.`, inner: `<div class="cty-states">${groups}</div>` })}
${faqBlock(faqs)}
${ctaBand({ source: 'City hub CTA' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.itemList('Advocate software by city', cities.map(c => ({ name: `Advocate software in ${c.name}`, path: cityPath(c.slug) }))), ld.faqPage(faqs)];
  return { path, priority: 0.6, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Advocate Practice Management Software by City in India', description: 'Practice and case management software for advocates in 25 Indian cities, grouped by state with each High Court, local district courts and tribunals.', path, jsonld }), body }) };
}

export function pages() {
  for (const c of cities) if (!c.courts || !c.faqs) throw new Error('cities.mjs: ' + c.slug + ' has no content yet');
  return [hubPage(), ...cities.map(cityPage)];
}

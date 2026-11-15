// /courts (hub) and /courts/<slug> (one page per court or tribunal). Data: seo/data/courts.mjs.
import { courts } from '../data/courts.mjs';
import { cities } from '../data/cities.mjs';
import { features } from '../data/features.mjs';
import { tools } from '../data/tools.mjs';
import { page, seoHead, ld, hero, section, faqBlock, ctaBand, relatedLinks, disclaimer, icon, esc, cityPath } from '../lib.mjs';

let blogIndex = [];
try { blogIndex = (await import('../data/blogs.mjs')).blogs || []; } catch (e) { blogIndex = []; }

const TYPE_LABEL = { supreme: 'Supreme Court', high: 'High Court', district: 'District courts', tribunal: 'Tribunal', consumer: 'Consumer commission' };
const GROUPS = [
  { key: 'supreme', title: 'Supreme Court', text: 'Records of proceedings, relative listing directions and the Advocate-on-Record system.' },
  { key: 'high', title: 'High Courts', text: 'Principal seats and benches, original and appellate sides, roster benches and daily boards.' },
  { key: 'district', title: 'District and sessions courts', text: 'Daily order sheets, stages and CNR numbers across every district court complex.' },
  { key: 'tribunal', title: 'Tribunals and commissions', text: 'NCLT and NCLAT, DRT and DRAT, consumer commissions and RERA, each with its own timelines.' }
];
const groupOf = c => (c.type === 'consumer' ? 'tribunal' : c.type);
const courtBySlug = sl => courts.find(c => c.slug === sl);
const humanize = sl => sl.replace(/-/g, ' ').replace(/^./, m => m.toUpperCase());

// "[[x]]" marks the parts of a sample order that Legal Staff extracts.
const marked = s => esc(s).replace(/\[\[(.+?)\]\]/g, '<mark class="ct-x">$1</mark>');
const field = (c, ...labels) => { for (const l of labels) { const f = (c.sample?.fields || []).find(([k]) => k === l); if (f) return f[1]; } return ''; };

/* ---------------- hero art: a day card with two hearings and a clash ---------------- */
function heroArt(c) {
  const other = courtBySlug((c.related.courts || [])[0]);
  const where = field(c, 'Court', 'Bench', 'Seat', 'Forum', 'Tier') || c.short;
  const purpose = field(c, 'Purpose', 'Direction', 'Stage') || 'Hearing';
  return `<div class="ct-art">
    <div class="ct-art-top"><span>Day view</span><span class="ct-art-pill">${icon('calendar', 14)} Tomorrow</span></div>
    <div class="ct-art-row"><span class="ct-art-t">10:30</span><span class="ct-art-b"><b>${esc(c.short)}</b><small>${esc(where)} · ${esc(purpose)}</small></span><span class="ct-art-ok">${icon('check', 14)}</span></div>
    <div class="ct-art-row is-clash"><span class="ct-art-t">10:30</span><span class="ct-art-b"><b>${esc(other ? other.short : 'Second forum')}</b><small>Same advocate, same time</small></span><span class="ct-art-flag">Clash</span></div>
    <div class="ct-art-row"><span class="ct-art-t">14:15</span><span class="ct-art-b"><b>Reassigned to junior</b><small>Reminder sent on WhatsApp</small></span><span class="ct-art-ok">${icon('check', 14)}</span></div>
  </div>`;
}

/* ---------------- order mock-up ---------------- */
function orderMock(c) {
  const s = c.sample;
  if (!s) return '';
  return `<figure class="ct-order ls-reveal-scale" aria-label="Sample order and the fields Legal Staff extracts">
    <div class="ct-paper">
      <p class="ct-paper-k">${icon('order', 16)} ${esc(s.doc)}</p>
      ${s.lines.map(l => `<p class="ct-line">${marked(l)}</p>`).join('')}
    </div>
    <div class="ct-extract">
      <p class="ct-extract-h">${icon('spark', 16)} Picked out for your confirmation</p>
      <dl>${s.fields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="ct-extract-btns"><span class="ct-btn-w">${icon('check', 14)} Confirm date</span><span class="ct-btn-g">Edit</span></div>
    </div>
    ${s.note ? `<figcaption>${esc(s.note)}</figcaption>` : ''}
  </figure>`;
}

/* ---------------- WhatsApp + clash side panel ---------------- */
function sidePanel(c) {
  const where = field(c, 'Court', 'Bench', 'Seat', 'Forum', 'Tier') || c.short;
  const item = field(c, 'Item');
  const purpose = field(c, 'Purpose', 'Stage', 'Direction') || 'Hearing';
  const other = courtBySlug((c.related.courts || [])[0]);
  return `<aside class="ct-side">
    <div class="ct-wa ls-reveal" aria-label="Sample WhatsApp reminder">
      <div class="ct-wa-top">${icon('whatsapp', 16)} Legal Staff · reminder</div>
      <div class="ct-wa-msg"><b>Hearing tomorrow</b><br>[Case title]<br>${esc(c.short)} · ${esc(where)}${item ? ` · Item ${esc(item)}` : ''}<br>Purpose: ${esc(purpose)}<br>Appearing: [Junior advocate]<span class="ct-wa-time">7:30 am ✓✓</span></div>
    </div>
    <div class="ct-clash ls-reveal" style="--ls-delay:120ms">
      <p class="ct-clash-h">${icon('clock', 16)} Clash detected</p>
      <p>${esc(c.short)} and ${esc(other ? other.short : 'another forum')} at 10:30 for the same advocate. Reassign one hearing to a junior.</p>
    </div>
  </aside>`;
}

function courtPage(c) {
  const path = `/courts/${c.slug}`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Courts', path: '/courts' }, { name: c.name, path }];
  const jsonld = [ld.softwareApplication({ path }), ld.breadcrumb(crumbs), ld.faqPage(c.faqs)];
  const chips = [c.seat ? `Seat: ${c.seat}` : '', ...(c.benches || []).slice(0, 3)].filter(Boolean).slice(0, 4);

  const glance = `<div class="ct-glance ls-reveal" style="--ls-delay:120ms">
    <p class="ct-glance-h">${icon('gavel', 18)} ${esc(c.short)} at a glance</p>
    <dl>
      <div><dt>Type</dt><dd>${esc(TYPE_LABEL[c.type] || 'Court')}</dd></div>
      <div><dt>Seat</dt><dd>${esc(c.seat)}</dd></div>
      ${(c.benches || []).length ? `<div><dt>${c.type === 'high' ? 'Benches' : 'Also'}</dt><dd><ul>${c.benches.map(b => `<li>${esc(b)}</li>`).join('')}</ul></dd></div>` : ''}
      ${(c.sources || []).length ? `<div><dt>Source of record</dt><dd><ul>${c.sources.map(s => `<li>${esc(s)}</li>`).join('')}</ul></dd></div>` : ''}
    </dl>
    <p class="ct-glance-n">Legal Staff does not replace official cause lists or case status. You confirm every date against them.</p>
  </div>`;
  const intro = `<div class="ct-intro"><div class="prose ls-reveal">${c.intro.map(p => `<p>${esc(p)}</p>`).join('')}</div>${glance}</div>`;

  const format = `<div class="ct-format"><div><h3 class="h3 ls-reveal">${esc(c.orderFormat.heading)}</h3><ul class="ct-points">${c.orderFormat.points.map((p, i) => `<li class="ls-reveal" style="--ls-delay:${i * 70}ms"><span class="ct-tick">${icon('check', 14)}</span><span>${esc(p)}</span></li>`).join('')}</ul></div>${orderMock(c)}</div>`;

  const flow = `<div class="ct-flow"><ol class="timeline">${c.workflow.map((w, i) => `<li class="ls-reveal" style="--ls-delay:${i * 60}ms"><span class="t-when">Step ${i + 1}</span><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></li>`).join('')}</ol>${sidePanel(c)}</div>`;

  const notes = `<ul class="ct-notes">${c.listingNotes.map((n, i) => `<li class="ls-reveal" style="--ls-delay:${(i % 3) * 70}ms"><span class="ct-n">${String(i + 1).padStart(2, '0')}</span><p>${esc(n)}</p></li>`).join('')}</ul>${disclaimer('Forum details on this page are general; benches, rosters and listing practice are notified by each court or tribunal and change.')}`;

  const cityCards = (c.related.cities || []).map(sl => cities.find(x => x.slug === sl)).filter(Boolean);
  const citySec = cityCards.length ? section({ id: 'cities', kicker: 'Where this forum sits', title: `Advocates using Legal Staff for ${c.short} matters`, inner: `<div class="ct-cities">${cityCards.map((x, i) => `<a class="ct-city ls-reveal ls-lift" style="--ls-delay:${i * 60}ms" href="${cityPath(x.slug)}">${icon('pin', 18)}<span><b>${esc(x.name)}</b><small>Advocate software in ${esc(x.name)}</small></span></a>`).join('')}</div>` }) : '';

  const rel = [
    ...(c.related.features || []).map(sl => features.find(x => x.slug === sl)).filter(Boolean).map(x => ({ kind: 'Feature', label: x.navLabel, hint: x.navHint, href: `/features/${x.slug}` })),
    ...(c.related.tools || []).map(sl => tools.find(t => t.slug === sl)).filter(Boolean).map(t => ({ kind: 'Free tool', label: t.title || t.navLabel, href: `/tools/${t.slug}` })),
    ...(c.related.blogs || []).map(sl => { const b = blogIndex.find(x => x.slug === sl); return { kind: 'Guide', label: b ? b.title : humanize(sl), href: `/blog/${sl}` }; }),
    ...(c.related.courts || []).map(courtBySlug).filter(Boolean).map(x => ({ kind: 'Court', label: x.name, href: `/courts/${x.slug}` }))
  ];

  const body = `${hero({ kicker: (TYPE_LABEL[c.type] || 'Court') === c.short ? c.short : `${TYPE_LABEL[c.type] || 'Court'} · ${c.short}`, title: c.title, lead: c.lead, crumbs, source: `Court hero: ${c.short}`, chips, art: heroArt(c) })}
${section({ id: 'overview', kicker: 'Overview', title: `How Legal Staff fits a day at the ${c.short}`, inner: intro })}
${section({ id: 'orders', tone: 'tone-soft', kicker: 'Order reading', title: `How orders from the ${c.short} look`, lead: 'Upload or paste an order or a cause list entry. Legal Staff reads it, summarises it with paragraph references and picks out the next date. Nothing reaches your diary until you confirm it.', inner: format })}
${section({ id: 'workflow', kicker: 'Workflow', title: `From order to reminder: ${c.short} matters in Legal Staff`, inner: flow })}
${section({ id: 'practice', tone: 'tone-soft', kicker: 'Practice notes', title: `Listing and practice notes for the ${c.short}`, inner: notes })}
${citySec}
${faqBlock(c.faqs, `${c.short}: frequently asked questions`)}
${relatedLinks('Related features, tools and guides', rel)}
${ctaBand({ title: `Run your ${c.short} diary in Legal Staff`, text: 'Upload an order, confirm the next date, and let reminders go out to your team on WhatsApp. Set up your chamber in minutes.', source: `Court CTA: ${c.short}` })}`;

  return { path, priority: 0.8, changefreq: 'monthly', html: page({ head: seoHead({ title: c.metaTitle, description: c.metaDescription, path, jsonld }), body, active: 'courts' }) };
}

function hubPage() {
  const path = '/courts';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Courts', path }];
  const groups = GROUPS.map(g => {
    const list = courts.filter(c => groupOf(c) === g.key);
    if (!list.length) return '';
    return `<div class="ct-group"><div class="ct-group-h ls-reveal"><h2 class="h3">${esc(g.title)}</h2><p class="muted">${esc(g.text)}</p></div>
      <div class="grid3">${list.map((c, i) => `<a class="card ct-card ls-reveal ls-lift" style="--ls-delay:${(i % 3) * 70}ms" href="/courts/${c.slug}"><span class="card-ic">${icon('gavel', 22)}</span><h3>${esc(c.name)}</h3><p>${esc(c.seat)}${(c.benches || []).length && c.type === 'high' ? ` · benches: ${esc(c.benches.join(', '))}` : ''}</p><span class="ct-card-go">Read the guide ${icon('arrow', 14)}</span></a>`).join('')}</div></div>`;
  }).join('');
  const how = `<div class="grid3">${[
    ['order', 'Orders read, dates confirmed', 'Paste or upload an order from any forum. Legal Staff picks out the next date, bench and purpose, and waits for your confirmation.'],
    ['calendar', 'One diary for every forum', 'Supreme Court, High Court benches, district courts and tribunals in one week view, with clashes flagged for each advocate.'],
    ['whatsapp', 'Reminders that name the court', 'WhatsApp and email reminders two days before and on the morning, with the court number and item number.']
  ].map(([ic, t, p], i) => `<div class="card ls-reveal" style="--ls-delay:${i * 80}ms"><span class="card-ic">${icon(ic, 22)}</span><h3>${t}</h3><p>${p}</p></div>`).join('')}</div>
  <p class="muted ct-hub-note ls-reveal">Court websites, eCourts services and the National Judicial Data Grid remain the source of record. Import by CNR works where a court-data provider is connected; Legal Staff does not scrape cause lists.</p>`;
  const body = `${hero({ kicker: 'Courts and tribunals', title: 'Court and tribunal guides for Indian litigators', lead: 'How orders and cause lists look in each forum, and how Legal Staff turns them into confirmed diary dates, clash alerts and WhatsApp reminders for your chamber.', crumbs, source: 'Courts hub', chips: ['Supreme Court', `${courts.filter(c => c.type === 'high').length} High Courts`, 'District courts', 'Tribunals and commissions'] })}
${section({ id: 'how', kicker: 'Across every forum', title: 'The same workflow, adapted to each court', inner: how })}
${section({ id: 'all', tone: 'tone-soft', kicker: 'Guides', title: 'Choose your court or tribunal', inner: groups })}
${ctaBand({ source: 'Courts hub CTA' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.itemList('Court and tribunal guides', courts.map(c => ({ name: c.name, path: `/courts/${c.slug}` })))];
  return { path, priority: 0.7, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Court & Tribunal Guides for Indian Advocates', description: 'How orders and cause lists look in the Supreme Court, High Courts, district courts, NCLT, DRT, consumer commissions and RERA, and how Legal Staff tracks them.', path, jsonld }), body, active: 'courts' }) };
}

export function pages() {
  for (const c of courts) if (!c.intro || !c.workflow || !c.faqs) throw new Error('courts.mjs: ' + c.slug + ' has no content yet');
  return [hubPage(), ...courts.map(courtPage)];
}

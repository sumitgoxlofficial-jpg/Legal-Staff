// /company-registration-in-india (hub) and /company-registration-in-<slug> (35 city and state pages).
// Content lives in seo/data/locations.mjs; stamp duty and the default RoC come from seo/data/stamp-duty.mjs,
// so the incorporation cost calculator and these pages always show the same state figures.
import { locations } from '../data/locations.mjs';
import { stampDuty } from '../data/stamp-duty.mjs';
import { services } from '../data/services.mjs';
import { page, seoHead, ld, hero, section, faqBlock, ctaBand, relatedLinks, disclaimer, icon, esc, inr, locPath } from '../lib.mjs';

const HUB = '/company-registration-in-india';
const CALC = '/tools/incorporation-cost-calculator';
const bySlug = Object.fromEntries(locations.map(l => [l.slug, l]));
const svc = slug => services.find(s => s.slug === slug);
const fromPrice = slug => { const s = svc(slug); return s && s.tiers ? Math.min(...s.tiers.map(t => t.price)) : null; };

// RoC: a location may refine the state-level office (Maharashtra and Tamil Nadu have two Registrars each).
const rocFor = l => {
  const sd = stampDuty[l.stateKey];
  return l.roc || (sd && sd.roc) || { office: `the Registrar of Companies for ${l.state}`, jurisdiction: l.state };
};
// Text in locations.mjs may use {roc}, {name} and {state}; they resolve against the same data the page shows.
const fill = (l, s) => String(s).replace(/\{roc\}/g, rocFor(l).office).replace(/\{name\}/g, l.name).replace(/\{state\}/g, l.state);
const stateTitle = l => l.type === 'state' ? l.name : l.state;

// Cross-links: city → its state page; state → its city pages.
const statePage = l => l.type === 'city' && bySlug[l.stateKey] && bySlug[l.stateKey].type === 'state' ? bySlug[l.stateKey] : null;
const citiesOf = l => l.type === 'state' ? locations.filter(c => c.type === 'city' && c.stateKey === l.slug) : [];

const art = l => {
  const roc = rocFor(l).office.replace(/\s*\(.*\)$/, '');
  const short = roc.length > 26 ? roc.slice(0, 25) + '…' : roc;
  return `<svg viewBox="0 0 360 300" width="360" height="300" fill="none">
  <circle cx="180" cy="150" r="126" stroke="#262626"/><circle cx="180" cy="150" r="92" stroke="#1F1F1F" stroke-dasharray="3 6" class="ls-spin-slow"/><circle cx="180" cy="150" r="56" stroke="#2A2A2A"/>
  <g class="ls-float-slow"><path d="M180 214s-46-40-46-72a46 46 0 0 1 92 0c0 32-46 72-46 72z" fill="#141414" stroke="#3A3A3A" stroke-width="1.6"/><circle cx="180" cy="142" r="16" fill="#FFFFFF"/><circle cx="180" cy="142" r="6" fill="#0A0A0A"/></g>
  <g class="ls-float" style="animation-delay:-2s"><rect x="196" y="40" width="148" height="46" rx="10" fill="#FFFFFF"/><text x="210" y="59" font-family="Instrument Sans, sans-serif" font-size="10" fill="#5E5E5E">Registrar</text><text x="210" y="75" font-family="Instrument Sans, sans-serif" font-size="12.5" font-weight="600" fill="#0A0A0A">${esc(short)}</text></g>
  <g class="ls-float" style="animation-delay:-4s"><rect x="16" y="222" width="160" height="46" rx="10" fill="#FFFFFF"/><text x="30" y="241" font-family="Instrument Sans, sans-serif" font-size="10" fill="#5E5E5E">Stamp duty</text><text x="30" y="257" font-family="Instrument Sans, sans-serif" font-size="12.5" font-weight="600" fill="#0A0A0A">${esc(stateTitle(l))} · paid online</text></g>
</svg>`;
};

function crumbsFor(l) {
  const c = [{ name: 'Home', path: '/' }, { name: 'Company registration in India', path: HUB }];
  const sp = statePage(l);
  if (sp) c.push({ name: sp.name, path: locPath(sp.slug) });
  c.push({ name: l.name, path: locPath(l.slug) });
  return c;
}

function metaFor(l) {
  const fee = fromPrice('private-limited-company-registration');
  const base = `Company registration in ${l.name}: ${l.hook}.`;
  const tails = [` Documents, timeline and fixed fees${fee ? ` from ${inr(fee)}` : ''}.`, ' Documents, timeline and fixed fees.', fee ? ` Fixed fees from ${inr(fee)}.` : ' Fixed fees.', ' Fixed fees.', ''];
  const opts = tails.map(t => base + t);
  const d = opts.find(o => o.length >= 140 && o.length <= 160) || opts.find(o => o.length <= 160) || base;
  const t1 = `Company Registration in ${l.name}: RoC & Stamp Duty`;
  const title = (t1 + ' | Legal Staff').length <= 62 ? t1 : `Company Registration in ${l.name} | Legal Staff`;
  return { title, description: d };
}

function locationPage(l) {
  const path = locPath(l.slug);
  const sd = stampDuty[l.stateKey];
  if (!sd) console.warn(`location.mjs: no stamp-duty entry for "${l.stateKey}" (${l.slug}) — showing generic text`);
  const roc = rocFor(l);
  const sp = statePage(l);
  const cities = citiesOf(l);
  const crumbs = crumbsFor(l);
  const { title, description } = metaFor(l);
  const faqs = l.faqs.map(f => ({ q: fill(l, f.q), a: fill(l, f.a) }));
  const calcHref = `${CALC}?state=${encodeURIComponent(l.stateKey)}`;
  const pvtFee = fromPrice('private-limited-company-registration');
  const llpFee = fromPrice('llp-registration-india');
  const where = l.type === 'state' ? `anywhere in ${l.name}` : `in ${l.name}`;

  const jsonld = [
    ld.professionalService({ name: `Company registration in ${l.name}`, description, path, city: l.type === 'city' ? l.name : undefined, region: l.state }),
    ld.breadcrumb(crumbs), ld.faqPage(faqs)
  ];

  // Overview + highlights
  const overview = `<div class="loc-split"><div class="prose ls-reveal"><p>${esc(fill(l, l.intro))}</p>
      ${sp ? `<p>This page covers ${esc(l.name)} specifically. For rules that apply across the state — and other cities in it — see <a href="${locPath(sp.slug)}">company registration in ${esc(sp.name)}</a>.</p>` : ''}
      ${cities.length ? `<p>City guides in ${esc(l.name)}: ${cities.map(c => `<a href="${locPath(c.slug)}">${esc(c.name)}</a>`).join(', ')}.</p>` : ''}</div>
    <dl class="loc-facts ls-reveal">${[{ label: 'Jurisdictional RoC', value: roc.office }, ...l.highlights].slice(0, 4).map(h => `<div><dt>${esc(h.label)}</dt><dd>${esc(h.value)}</dd></div>`).join('')}</dl></div>`;

  // RoC
  const rocInner = `<div class="loc-roc ls-reveal"><div class="loc-roc-ic">${icon('building', 26)}</div><div>
      <p class="loc-roc-k">Registrar for a registered office ${esc(where)}</p><h3 class="h3">${esc(roc.office)}</h3><p class="muted">Jurisdiction: ${esc(roc.jurisdiction)}.</p></div></div>
    <div class="grid3 loc-roc-points">
      <div class="card ls-reveal"><span class="card-ic">${icon('rocket', 22)}</span><h3>Incorporation</h3><p>SPICe+ applications are processed by the Central Registration Centre (CRC). Once approved, your company is allotted a CIN and mapped to ${esc(roc.office)}.</p></div>
      <div class="card ls-reveal" style="--ls-delay:80ms"><span class="card-ic">${icon('doc', 22)}</span><h3>Ongoing filings</h3><p>Annual returns (MGT-7/7A), financial statements (AOC-4), INC-20A, DIR-3 KYC and event-based forms are filed online on the MCA V3 portal and tracked against this Registrar.</p></div>
      <div class="card ls-reveal" style="--ls-delay:160ms"><span class="card-ic">${icon('pin', 22)}</span><h3>Changing address</h3><p>A move within the same Registrar needs a board resolution and INC-22 within 30 days. Moving to another Registrar in the same state needs Regional Director confirmation (INC-23); another state needs an MoA change under section 13.</p></div>
    </div>
    <p class="muted loc-small">Office addresses are listed on the MCA website’s Registrar of Companies contact page. Every incorporation and annual filing is online, so a visit is rarely needed.</p>`;

  // Stamp duty (from stamp-duty.mjs)
  const sdRows = sd ? [['Memorandum of Association (MoA)', sd.moa.summary], ['Articles of Association (AoA)', sd.aoa.summary], ['LLP agreement', sd.llpAgreement.summary]] : [];
  const stampInner = `<div class="loc-split"><div class="ls-reveal">
      ${sd ? `<div class="matrix-wrap"><table class="matrix loc-stamp"><thead><tr><th scope="col">Instrument</th><th scope="col">${esc(sd.state)} stamp duty <span class="tag">${esc(sd.confidence || 'indicative')}</span></th></tr></thead><tbody>${sdRows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted loc-small">${esc(sd.note)}</p>` : `<p>Stamp duty on the MoA and AoA in ${esc(l.state)} is computed and paid on the MCA portal during SPICe+ filing. Confirm the current schedule before filing.</p>`}
    </div><div class="prose ls-reveal"><h3 style="margin-top:0">What this means ${esc(where)}</h3><p>${esc(fill(l, l.stampDuty.moaAoaNote))}</p>${l.stampDuty.sourceNote ? `<p>${esc(fill(l, l.stampDuty.sourceNote))}</p>` : ''}
      <p><a class="btn btn-dark btn-sm" href="${calcHref}">${icon('calc', 16)} Estimate costs in ${esc(l.name)}</a></p></div></div>`;

  // Ecosystem
  const ecoInner = `<ul class="loc-eco">${l.ecosystem.map((e, i) => `<li class="ls-reveal" style="--ls-delay:${i * 70}ms"><span class="loc-eco-n">${String(i + 1).padStart(2, '0')}</span><p>${esc(fill(l, e))}</p></li>`).join('')}</ul>`;

  // Registered office
  const officeInner = `<div class="loc-split"><ul class="checklist loc-one">${l.officeTips.map(t => `<li class="ls-reveal"><span class="tick">${icon('check', 14)}</span><span><b>${esc(fill(l, t))}</b></span></li>`).join('')}</ul>
    <div class="card ls-reveal"><span class="card-ic">${icon('doc', 22)}</span><h3>Address proof the RoC expects</h3><ul class="loc-list"><li>Utility bill (electricity, gas, water or telephone) not older than two months</li><li>NOC from the owner, or from the co-working operator</li><li>Rent, lease or leave-and-licence agreement where the premises are rented</li><li>The office must be able to receive post; the RoC can verify it physically under section 12</li></ul></div></div>`;

  // Process
  const steps = [
    { when: 'Day 1–2', title: 'Pick the structure and reserve a name', text: 'Choose a private limited company, LLP or OPC, then reserve the name through SPICe+ Part A (or RUN-LLP for an LLP). We run trademark and MCA name searches first to avoid objections.', forms: ['SPICe+ Part A', 'RUN-LLP'] },
    { when: 'Day 1–3', title: 'Digital signatures for directors', text: 'Each director and subscriber gets a Class 3 DSC after video or Aadhaar-based verification. DINs for up to three directors are allotted inside SPICe+.', forms: ['DSC'] },
    { when: 'Day 2–4', title: `Registered office proof ${where}`, text: `Collect a recent utility bill, the owner’s or operator’s NOC and the rent agreement for the ${l.type === 'state' ? l.name : l.name} address. This address fixes your Registrar (${roc.office}) and your stamp duty state.`, forms: ['NOC', 'Utility bill'] },
    { when: 'Day 3–6', title: `SPICe+ filing with ${stateTitle(l)} stamp duty paid online`, text: `We file SPICe+ Part B with the e-MoA and e-AoA. ${stateTitle(l)} stamp duty is calculated and paid electronically in the same filing, and AGILE-PRO-S applies for GST, EPFO, ESIC and a bank account (and professional tax where the state levies it).`, forms: ['INC-32', 'INC-33', 'INC-34', 'INC-35'] },
    { when: 'Day 6–15', title: `Approval and mapping to ${roc.office}`, text: `The Central Registration Centre approves the application and issues the certificate of incorporation with CIN, PAN and TAN. Your company is then administered by ${roc.office}. Timelines depend on MCA processing and any resubmission.`, forms: ['Certificate of incorporation'] },
    { when: 'After incorporation', title: `First compliances ${where}`, text: `Open the bank account, appoint the first auditor within 30 days, file INC-20A within 180 days, and register under the ${stateTitle(l)} Shops and Establishments law and for professional tax where applicable.`, forms: ['INC-20A', 'ADT-1', 'GST'] }
  ];
  const timeline = `<ol class="timeline">${steps.map(t => `<li class="ls-reveal"><span class="t-when">${esc(t.when)}</span><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p><div class="t-forms">${t.forms.map(f => `<span class="tag">${esc(f)}</span>`).join('')}</div></li>`).join('')}</ol>`;

  // Entity options
  const entities = `<div class="grid3">
    <a class="card ls-reveal ls-lift loc-card-link" href="/services/private-limited-company-registration"><span class="card-ic">${icon('building', 22)}</span><h3>Private limited company</h3><p>Best for founders raising equity, issuing ESOPs or selling to enterprises. Needs two directors (one resident in India) and two shareholders.</p>${pvtFee ? `<p class="loc-from">From ${inr(pvtFee)} + govt fees ${icon('arrow', 14)}</p>` : ''}</a>
    <a class="card ls-reveal ls-lift loc-card-link" style="--ls-delay:80ms" href="/services/llp-registration-india"><span class="card-ic">${icon('handshake', 22)}</span><h3>Limited liability partnership</h3><p>Suits partner-run firms and professional practices that want limited liability with lighter compliance. Filed on the FiLLiP form.</p>${llpFee ? `<p class="loc-from">From ${inr(llpFee)} + govt fees ${icon('arrow', 14)}</p>` : ''}</a>
    <a class="card ls-reveal ls-lift loc-card-link" style="--ls-delay:160ms" href="/compare/pvt-ltd-vs-llp-vs-opc"><span class="card-ic">${icon('scale', 22)}</span><h3>Not sure? Compare all three</h3><p>Pvt Ltd vs LLP vs One Person Company on cost, compliance, funding and tax — side by side.</p><p class="loc-from">See the comparison ${icon('arrow', 14)}</p></a>
  </div>`;

  // Related: nearby + state/city links + core services
  const nearSlugs = [...new Set([...(sp ? [sp.slug] : []), ...cities.map(c => c.slug), ...l.nearby])].filter(s => s !== l.slug && bySlug[s]).slice(0, 6);
  const rel = [
    ...nearSlugs.map(s => bySlug[s]).map(n => ({ kind: n.type === 'state' ? 'State guide' : 'City guide', label: `Company registration in ${n.name}`, hint: rocFor(n).office, href: locPath(n.slug) })),
    { kind: 'Free tool', label: `Estimate costs in ${l.name}`, hint: `${stateTitle(l)} stamp duty, MCA fees, DSC`, href: calcHref },
    { kind: 'All locations', label: 'Company registration across India', hint: 'Every city and state guide', href: HUB }
  ];

  const pageTitle = `Company Registration in ${l.name}`;
  const lead = l.type === 'state'
    ? `Register a private limited company or LLP anywhere in ${l.name}: the Registrar that covers your district, ${l.name} stamp duty, registered-office rules and a fixed professional fee.`
    : `Register a private limited company or LLP with a ${l.name} registered office: ${roc.office}, ${l.state} stamp duty, local registered-office rules and a fixed professional fee.`;

  const body = `${hero({ kicker: l.type === 'state' ? `State guide · ${l.name}` : `City guide · ${l.state}`, title: pageTitle, lead, crumbs, source: `Location hero: ${l.name}`, primary: `Register in ${l.name}`, secondary: { href: calcHref, label: `Estimate costs in ${l.name}` }, chips: [roc.office, `${stateTitle(l)} stamp duty paid online`, pvtFee ? `Fixed fee from ${inr(pvtFee)}` : 'Fixed professional fee'], art: art(l) })}
${section({ id: 'overview', kicker: 'Overview', title: `Why founders incorporate ${l.type === 'state' ? 'in ' + l.name : 'in ' + l.name}`, inner: overview })}
${section({ id: 'roc', tone: 'tone-soft', kicker: 'Jurisdiction', title: `Which RoC covers ${l.name}`, inner: rocInner })}
${section({ id: 'stamp-duty', kicker: 'State stamp duty', title: `Stamp duty on MoA and AoA in ${stateTitle(l)}`, inner: stampInner })}
${section({ id: 'ecosystem', tone: 'tone-soft', kicker: 'Local ecosystem', title: `The ${l.name} business ecosystem`, inner: ecoInner })}
${section({ id: 'office', kicker: 'Registered office', title: `Registered-office tips for ${l.name}`, inner: officeInner })}
${section({ id: 'process', tone: 'tone-soft', kicker: 'Step by step', title: `Registration process in ${l.name}`, inner: timeline })}
${section({ id: 'entities', kicker: 'Entity options', title: 'Choose the right structure', inner: entities + disclaimer() })}
${faqBlock(faqs, `Company registration in ${l.name}: FAQs`)}
${relatedLinks('Nearby and related guides', rel)}
${ctaBand({ title: `Register your company in ${l.name}`, text: `Book a free 15-minute call. We confirm your Registrar, ${stateTitle(l)} stamp duty and the documents you need, then quote a fixed fee.`, source: `Location CTA: ${l.name}` })}`;

  return { path, priority: l.type === 'state' ? 0.7 : 0.7, changefreq: 'monthly', html: page({ head: seoHead({ title, description, path, jsonld }), body, active: 'services' }) };
}

function hubPage() {
  const path = HUB;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Company registration in India', path }];
  const card = (l, i) => `<a class="loc-hub-card ls-reveal ls-lift" style="--ls-delay:${(i % 4) * 50}ms" href="${locPath(l.slug)}"><b>${esc(l.name)}</b><small>${esc(l.type === 'city' ? l.state + ' · ' : '')}${esc(rocFor(l).office)}</small>${icon('arrow', 16)}</a>`;
  const cities = locations.filter(l => l.type === 'city');
  const states = locations.filter(l => l.type === 'state');
  const description = 'Company and LLP registration guides for 25 Indian cities and 10 states: jurisdictional RoC, state stamp duty, registered-office rules and fixed fees.';
  const intro = `<div class="prose ls-reveal" style="max-width:820px"><p>Incorporation is the same national process everywhere in India — SPICe+ for companies and FiLLiP for LLPs, processed by the Central Registration Centre. What changes with location is the Registrar of Companies your company is mapped to, the state stamp duty on the MoA and AoA, the Shops and Establishments law, whether professional tax applies and which state startup schemes you can use.</p><p>Pick your city or state below for the local details, or use the <a href="${CALC}">incorporation cost calculator</a> to compare stamp duty across states.</p></div>`;
  const body = `${hero({ kicker: 'Company registration by location', title: 'Company registration in India: city and state guides', lead: 'Your registered-office address decides your Registrar, stamp duty and state compliances. Find the guide for where you are setting up.', crumbs, source: 'Location hub', secondary: { href: CALC, label: 'Compare stamp duty by state' } })}
${section({ id: 'how', kicker: 'Why location matters', title: 'One national process, local differences', inner: intro })}
${section({ id: 'cities', tone: 'tone-soft', kicker: `${cities.length} cities`, title: 'Company registration by city', inner: `<div class="loc-hub-grid">${cities.map(card).join('')}</div>` })}
${section({ id: 'states', kicker: `${states.length} states and UTs`, title: 'Company registration by state', inner: `<div class="loc-hub-grid">${states.map(card).join('')}</div>` })}
${ctaBand({ source: 'Location hub CTA' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.itemList('Company registration by location', locations.map(l => ({ name: `Company registration in ${l.name}`, path: locPath(l.slug) })))];
  return { path, priority: 0.7, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Company Registration in India by City & State', description, path, jsonld }), body, active: 'services' }) };
}

export function pages() {
  for (const l of locations) if (!l.faqs || !l.intro || !l.stateKey) throw new Error('locations.mjs: ' + l.slug + ' has no content yet');
  return [hubPage(), ...locations.map(locationPage)];
}

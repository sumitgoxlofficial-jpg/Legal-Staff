// /features and /features/<slug> — product feature pages with an interactive UI preview card (static/features.js).
import { features } from '../data/features.mjs';
import { courts } from '../data/courts.mjs';
import { tools } from '../data/tools.mjs';
import { comparisons } from '../data/comparisons.mjs';
import { page, seoHead, ld, hero, section, faqBlock, ctaBand, relatedLinks, icon, esc } from '../lib.mjs';

let blogIndex = [];
try { blogIndex = (await import('../data/blogs.mjs')).blogs || []; } catch (e) { blogIndex = []; }

/* ---------------- interactive preview cards (sample data only) ---------------- */
const shell = (kind, label, inner) => `<div class="fp" data-fp="${kind}">
  <div class="fp-top"><span class="fp-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="fp-title">${label}</span><span class="fp-sample">Sample</span></div>
  <div class="fp-body">${inner}</div>
</div>`;

const PREVIEW = {
  order: () => shell('order', 'Order reader · W.P.(C) ____/2026', `
    <div class="fp-doc" aria-label="Sample court order">
      <p class="fp-meta">IN THE HIGH COURT OF ______ · W.P.(C) ____/2026</p>
      <p class="fp-meta">Petitioner v. Respondent · Order dated __.11.2026</p>
      <p class="fp-para" data-para="1"><b>1.</b> Present: learned counsel for the petitioner; learned counsel for the respondent.</p>
      <p class="fp-para" data-para="2"><b>2.</b> Counter affidavit is stated to have been filed. Rejoinder, if any, be filed within four weeks with an advance copy to the other side.</p>
      <p class="fp-para" data-para="3"><b>3.</b> Interim order to continue till the next date.</p>
      <p class="fp-para" data-para="4" data-next><b>4.</b> List for final hearing on 14.01.2027.</p>
    </div>
    <div class="fp-actions"><button class="fp-btn" type="button" data-act="read">${icon('spark', 16)}Read order</button><span class="fp-status" aria-live="polite">Nothing is saved in this preview</span></div>
    <ul class="fp-sum" hidden><li><b>Rejoinder</b> within four weeks <span>para 2</span></li><li><b>Interim order</b> continues till next date <span>para 3</span></li></ul>
    <div class="fp-chip" hidden><span class="fp-chip-t">${icon('calendar', 16)}<span>Next date: <b>14 Jan 2027</b> · Final hearing · para 4</span></span><button class="fp-btn fp-btn-sm" type="button" data-act="confirm">Confirm</button></div>`),

  whatsapp: () => {
    const bub = (t, time, extra = '') => `<div class="fp-bub${extra}"><p>${t}</p><time>${time}</time></div>`;
    const panels = {
      adv: [bub('<b>Hearing in 2 days</b><br>Petitioner v. Respondent · W.P.(C) ____/2026<br>Thu, 14 Jan · Court No. __ · Item __<br>Purpose: final hearing', '6:00 PM'),
        bub('<b>Good morning — 3 matters today</b><br>1. W.P.(C) ____/2026 · Court __ · Item __<br>2. C.S. ____/2026 · Court __ · Item __<br>3. Crl. Rev. ____/2026 · Court __ · Item __', '7:30 AM')],
      jr: [bub('<b>Assigned to you</b><br>Plaintiff v. Defendant · C.S. ____/2026<br>Court No. __ · Item __ · Framing of issues<br>Carry: written statement and documents index', '6:00 PM'),
        bub('<b>Task due today</b><br>Apply for certified copy of order dated __.__.2026', '7:30 AM')],
      cl: [bub('<b>Update on your matter</b><br>Petitioner v. Respondent<br>The court has listed the matter for final hearing on 14 Jan 2027. Your advocate will share the next update after the hearing.', '5:45 PM')]
    };
    const tabs = [['adv', 'Advocate'], ['jr', 'Junior'], ['cl', 'Client']];
    return shell('whatsapp', 'Reminders · WhatsApp Business API', `
    <div class="fp-tabs" role="tablist" aria-label="Who receives the message">${tabs.map(([k, l], i) => `<button type="button" role="tab" id="fp-tab-${k}" aria-controls="fp-panel-${k}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div class="fp-phone">
      <div class="fp-wa-head"><span class="fp-wa-av" aria-hidden="true">LS</span><span><b>Legal Staff</b><small>Business account</small></span></div>
      ${tabs.map(([k, l], i) => `<div class="fp-wa-chat" role="tabpanel" id="fp-panel-${k}" aria-labelledby="fp-tab-${k}" data-panel="${k}"${i ? ' hidden' : ''}><span class="fp-wa-day">Sample messages</span>${panels[k].join('')}</div>`).join('')}
    </div>`);
  },

  diary: () => {
    const days = [['Mon', '11', [['10:30', 'W.P.(C) ____/2026', 'Court 4']]], ['Tue', '12', [['11:00', 'Crl. A. ____/2026', 'Court 7']]],
      ['Wed', '13', 'clash'], ['Thu', '14', [['10:30', 'W.P.(C) ____/2026', 'Court 2'], ['14:15', 'C.A. ____/2026', 'NCLT']]], ['Fri', '15', [['10:00', 'O.S. ____/2026', 'District']]], ['Sat', '16', []]];
    const ev = (t, m, c, extra = '') => `<li class="fp-ev${extra}"><b>${t}</b><span>${m}</span><small>${c}</small></li>`;
    const col = ([d, n, evs]) => `<div class="fp-day${evs === 'clash' ? ' has-clash' : ''}"><p class="fp-dh"><span>${d}</span><b>${n}</b></p><ul>${evs === 'clash'
      ? ev('10:30', 'W.P.(C) ____/2026', 'Court 4 · You', ' is-clash') + ev('10:30', 'C.S. ____/2026', '<span data-owner>Court 12 · You</span>', ' is-clash" data-move="1')
      : evs.length ? evs.map(e => ev(...e)).join('') : '<li class="fp-free">No hearings</li>'}</ul></div>`;
    return shell('diary', 'Court diary · Week view', `
    <div class="fp-week">${days.map(col).join('')}</div>
    <div class="fp-alert" role="status"><span class="fp-alert-t"><span class="fp-flag">Clash</span>Wed 10:30 — two hearings for you, Court 4 and Court 12.</span><button class="fp-btn fp-btn-sm" type="button" data-act="assign">Assign to junior</button></div>`);
  },

  research: () => shell('research', 'AI Case Brain · Petitioner v. Respondent', `
    <div class="fp-qs" role="group" aria-label="Sample questions"><button type="button" class="fp-q is-on" aria-pressed="true" data-q="a">When was the interim order last extended?</button><button type="button" class="fp-q" aria-pressed="false" data-q="b">Note: section 12, Limitation Act</button></div>
    <div class="fp-ans" data-ans="a"><p class="fp-src">Answer from this case’s documents</p>
      <p>The interim order was continued by the order dated __.10.2026 <button type="button" class="fp-ref" data-ref="a1">[1]</button> and again by the order dated __.11.2026, till the next date <button type="button" class="fp-ref" data-ref="a2">[2]</button>.</p>
      <details class="fp-cite" id="fp-a1"><summary>[1] Order dated __.10.2026 · para 3</summary><p>“Interim order to continue.”</p></details>
      <details class="fp-cite" id="fp-a2"><summary>[2] Order dated __.11.2026 · para 3</summary><p>“Interim order to continue till the next date.”</p></details></div>
    <div class="fp-ans" data-ans="b" hidden><p class="fp-src">Reference note · not a case-law search</p>
      <p>Section 12 of the Limitation Act, 1963 excludes the day from which the period is reckoned and, for appeals, revisions and reviews, the time needed to obtain a copy of the decree or order complained of <button type="button" class="fp-ref" data-ref="b1">[1]</button>.</p>
      <details class="fp-cite" id="fp-b1"><summary>[1] Reference note · Limitation Act, 1963, s.12</summary><p>Summary for quick reference. Read the bare Act, including sub-sections (2) to (4), before computing any period.</p></details></div>
    <p class="fp-note">${icon('shield', 14)}Review every answer against the original before relying on it.</p>`),

  vault: () => {
    const folders = [['all', 'All documents'], ['pet', 'Petitions & pleadings'], ['ann', 'Annexures'], ['ord', 'Order sheets'], ['vak', 'Vakalatnama'], ['cc', 'Certified copies']];
    const files = [['pet', 'Writ petition with affidavit.pdf', 'Filed'], ['pet', 'Counter affidavit (respondent).pdf', 'Received'], ['pet', 'Rejoinder — draft v2.docx', 'Draft'],
      ['ann', 'Annexure P-1 — Agreement.pdf', ''], ['ann', 'Annexure P-2 — Notice.pdf', ''], ['ann', 'Annexure P-3 — Reply to notice.pdf', ''], ['ann', 'Annexure R-1.pdf', ''],
      ['ord', 'Order dated __.10.2026.pdf', ''], ['ord', 'Order dated __.11.2026.pdf', 'Next date confirmed'], ['vak', 'Vakalatnama — petitioner.pdf', 'Filed'], ['cc', 'Certified copy — impugned order.pdf', '']];
    const count = k => k === 'all' ? files.length : files.filter(f => f[0] === k).length;
    return shell('vault', 'Documents · W.P.(C) ____/2026', `
    <div class="fp-vault">
      <ul class="fp-tree" role="list" aria-label="Folders">${folders.map(([k, l], i) => `<li><button type="button" data-folder="${k}" aria-pressed="${i === 0}"${i === 0 ? ' class="is-on"' : ''}>${icon('folder', 16)}<span>${l}</span><small>${count(k)}</small></button></li>`).join('')}</ul>
      <div class="fp-files"><p class="fp-files-h" aria-live="polite">${files.length} documents</p><ul>${files.map(([k, n, t]) => `<li data-in="${k}">${icon('doc', 16)}<span>${n}</span>${t ? `<em>${t}</em>` : ''}</li>`).join('')}</ul></div>
    </div>`);
  },

  board: () => {
    const rows = [['Court 4 · Item 12', 'W.P.(C) ____/2026', 'You', [['Flag paper book', true], ['Rejoinder copy for court', false]]],
      ['Court 12 · Item 3', 'C.S. ____/2026', 'Junior', [['Carry documents index', true], ['Note proposed issues', false]]],
      ['NCLT · Item 21', 'C.A. ____/2026', 'Associate', [['Check service on respondent', false], ['Print latest order', false]]]];
    let n = 0;
    const total = rows.reduce((s, r) => s + r[3].length, 0), done = rows.reduce((s, r) => s + r[3].filter(t => t[1]).length, 0);
    return shell('board', 'Hearing board · Today', `
    <div class="fp-prog"><p><b data-done>${done}</b> of <b>${total}</b> tasks done</p><span class="fp-bar"><i style="width:${Math.round(done / total * 100)}%"></i></span></div>
    <ul class="fp-board">${rows.map(([c, m, who, tasks]) => `<li class="fp-match"><div class="fp-mh"><span><small>${c}</small><b>${m}</b></span><em>${who}</em></div>
      <ul>${tasks.map(([t, d]) => { n++; return `<li><label><input type="checkbox"${d ? ' checked' : ''}><span>${t}</span></label></li>`; }).join('')}</ul></li>`).join('')}</ul>`);
  }
};

const PILL = { order: 'Next date confirmed', whatsapp: 'Reminder sent', diary: 'Clash resolved', research: 'Answer with citations', vault: 'Filed in the case', board: 'Task done' };
const heroArt = f => `<div class="fh-art"><div class="fh-ring"></div><div class="fh-card ls-float"><span class="fh-ic">${icon(f.icon, 30)}</span><span class="fh-l"></span><span class="fh-l s"></span><span class="fh-l"></span></div>
  <div class="fh-pill ls-float" style="animation-delay:-2s">${icon('check', 14)}${PILL[f.preview.kind]}</div></div>`;

/* ---------------- feature page ---------------- */
function featurePage(f) {
  const path = `/features/${f.slug}`;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Features', path: '/features' }, { name: f.navLabel, path }];
  const jsonld = [
    ld.softwareApplication({ description: f.metaDescription, path, featureList: [...f.solution.points.map(p => p.title), ...f.chips] }),
    ld.breadcrumb(crumbs), ld.faqPage(f.faqs)
  ];
  const list = (pts, ic) => `<ul>${pts.map(p => `<li><span class="ps-ic">${icon(ic, 14)}</span><span><b>${esc(p.title)}</b><small>${esc(p.text)}</small></span></li>`).join('')}</ul>`;
  const ps = `<div class="ps">
    <div class="ps-col ps-prob ls-reveal"><p class="ps-k">The problem</p><h3>${esc(f.problem.heading)}</h3>${list(f.problem.points, 'close')}</div>
    <div class="ps-mid" aria-hidden="true">${icon('arrow', 20)}</div>
    <div class="ps-col ps-sol ls-reveal" style="--ls-delay:120ms"><p class="ps-k">With Legal Staff</p><h3>${esc(f.solution.heading)}</h3>${list(f.solution.points, 'check')}</div>
  </div>`;
  const preview = `<div class="fp-wrap"><div class="fp-copy ls-reveal"><p class="kicker light">Try it</p><h2 class="h2 light">See it work</h2><p>${esc(f.preview.caption)}</p>
      <p class="fp-small">A simplified preview with sample text. No real parties or case numbers, and nothing you click here is saved.</p></div>
    <div class="ls-reveal-scale">${PREVIEW[f.preview.kind]()}</div></div>`;
  const steps = `<ol class="timeline">${f.howItWorks.map(s => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>`;
  const uses = `<div class="grid3">${f.useCases.map((u, i) => `<div class="card ls-reveal ls-lift" style="--ls-delay:${i * 90}ms"><span class="card-ic">${icon(['users', 'gavel', 'building'][i % 3], 22)}</span><h3>${esc(u.who)}</h3><p>${esc(u.text)}</p></div>`).join('')}</div>`;
  const r = f.related || {};
  const rel = [
    ...(r.features || []).map(sl => features.find(x => x.slug === sl)).filter(Boolean).map(x => ({ kind: 'Feature', label: x.navLabel, hint: x.navHint, href: `/features/${x.slug}` })),
    ...(r.courts || []).map(sl => courts.find(x => x.slug === sl)).filter(Boolean).map(x => ({ kind: 'Court', label: x.name, href: `/courts/${x.slug}` })),
    ...(r.tools || []).map(sl => tools.find(x => x.slug === sl)).filter(Boolean).map(x => ({ kind: 'Free tool', label: x.title || x.navLabel, href: `/tools/${x.slug}` })),
    ...(r.compare || []).map(sl => comparisons.find(x => x.slug === sl)).filter(Boolean).map(x => ({ kind: 'Compare', label: x.title || x.navLabel, href: `/compare/${x.slug}` })),
    ...(r.blogs || []).map(sl => blogIndex.find(x => x.slug === sl)).filter(Boolean).map(x => ({ kind: 'Guide', label: x.title, href: `/blog/${x.slug}` }))
  ];
  const body = `${hero({ kicker: f.kicker, title: f.title, lead: f.lead, crumbs, source: `Feature hero: ${f.navLabel}`, chips: f.chips, art: heroArt(f) })}
${section({ id: 'problem', kicker: 'Problem vs solution', title: 'What changes with Legal Staff', inner: ps })}
<section class="section tone-dark fp-sec" id="preview"><div class="wrap">${preview}</div></section>
${section({ id: 'how', kicker: 'How it works', title: 'From first step to daily habit', inner: steps })}
${section({ id: 'who', tone: 'tone-soft', kicker: 'Who it’s for', title: 'Built for the way litigators work', inner: uses })}
${faqBlock(f.faqs)}
${relatedLinks('Related features, courts and guides', rel)}
${ctaBand({ source: `Feature CTA: ${f.navLabel}` })}`;
  return { path, priority: 0.9, changefreq: 'monthly', html: page({ head: seoHead({ title: f.metaTitle, description: f.metaDescription, path, jsonld }), body, active: 'features', scripts: ['/static/features.js'] }) };
}

/* ---------------- /features hub ---------------- */
function hubPage() {
  const path = '/features';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Features', path }];
  const cards = `<div class="grid3">${features.map((f, i) => `<a class="card ls-reveal ls-lift" style="--ls-delay:${(i % 3) * 80}ms;text-decoration:none" href="/features/${f.slug}"><span class="card-ic">${icon(f.icon, 22)}</span><h3>${esc(f.navLabel)}</h3><p>${esc(f.navHint)}.</p><span class="fhub-go">Learn more ${icon('arrow', 14)}</span></a>`).join('')}</div>`;
  const flow = `<ol class="timeline">${[
    ['An order comes in', 'Paste or upload it; Legal Staff summarises it with paragraph references and proposes the next date.'],
    ['You confirm the date', 'Nothing reaches the diary until an advocate confirms it.'],
    ['The diary and board update', 'The hearing appears in the court diary and on the day’s hearing board, with clashes flagged.'],
    ['Reminders go out', 'Two days before and on the morning of the hearing, on WhatsApp once connected, and by email.'],
    ['The file stays together', 'The order is filed in the case vault, where the AI Case Brain can answer questions from it with citations.']
  ].map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>`;
  const body = `${hero({ kicker: 'Features', title: 'Practice and case management features for Indian advocates', lead: 'Order reading, a shared court diary, WhatsApp reminders, document vaults, AI answers from your own case files and a hearing board for the chamber — in one web workspace.', crumbs, source: 'Features hub', chips: ['Web app, works in mobile browsers', 'Each firm’s data isolated', 'AI output reviewed by an advocate'] })}
${section({ title: 'All features', inner: cards })}
${section({ tone: 'tone-soft', kicker: 'How they fit together', title: 'From order to reminder', inner: flow })}
${ctaBand({ source: 'Features hub CTA' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.itemList('Legal Staff features', features.map(f => ({ name: f.navLabel, path: `/features/${f.slug}` }))), ld.softwareApplication({ path, featureList: features.map(f => f.navLabel) })];
  return { path, priority: 0.8, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Features for Advocates and Law Chambers', description: 'Legal Staff features for Indian advocates: AI court order reader, digital court diary, WhatsApp hearing reminders, case documents, AI Case Brain and team tools.', path, jsonld }), body, active: 'features' }) };
}

export function pages() {
  for (const f of features) if (!f.problem) throw new Error('features.mjs: ' + f.slug + ' has no content yet');
  return [hubPage(), ...features.map(featurePage)];
}

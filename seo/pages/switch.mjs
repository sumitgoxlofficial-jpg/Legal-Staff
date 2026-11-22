// /switch-to-legal-staff — for firms moving from other practice-management software, an Excel diary or billing software.
// Describes the in-app importer (app-import.js); keep the two in step when either changes.
import { page, seoHead, ld, hero, section, faqBlock, ctaBand, relatedLinks, icon, esc } from '../lib.mjs';
import { comparisons } from '../data/comparisons.mjs';

const PATH = '/switch-to-legal-staff';
const TITLE = 'Switch to Legal Staff: bring your cases, clients and documents with you';
const DESC = 'Moving from other practice-management software, an Excel diary or billing software? Import clients, cases, hearing dates, tasks, invoices and case documents from Excel, CSV, JSON or a ZIP, check every row, and undo in one click.';

const MOVES = [
  ['users', 'Clients', 'Names, phone, email, city and address. First and last name columns are joined. Clients already here are not duplicated; their blank details are filled in.'],
  ['scale', 'Cases', 'Title, case number, CNR, court, stage, lead advocate, file number, opposite party and filing date. Disposed matters come in as disposed.'],
  ['calendar', 'Hearing dates', 'Past and upcoming dates with time, purpose and court. A next-date column on the cases sheet becomes a hearing on the calendar.'],
  ['check', 'Tasks', 'To-dos with due dates and the person assigned, linked to their case.'],
  ['doc', 'Invoices', 'Number, date, fee, client, case and whether it was paid, so your billing history stays complete.'],
  ['folder', 'Documents', 'Pleadings, orders and correspondence from a folder or a ZIP. Each file is matched to its case from its name or folder.']
];
const STEPS = [
  ['Export from your old software', 'Use its Export, Download or Reports option on the cases, clients, calendar and billing screens. Excel (.xlsx or old .xls), CSV and JSON all work. An Excel diary or Google Sheet can be added as it is.'],
  ['Add the files', 'Sign in, open Settings → Move from other software (or Import from other software on the Cases page) and add every file at once. Each Excel sheet is read separately and the app works out what it holds.'],
  ['Check the column matching', 'Columns are matched by name, including the names other products use, such as “Matter Name”, “NDOH” or “Responsible Attorney”. Example values sit beside each match. Matching you change is remembered for next time.'],
  ['Check the rows, then import', 'Every row is checked before anything is saved: dates, amounts, emails and the case each hearing belongs to. Rows with a problem are listed with the reason and can be downloaded.'],
  ['Bring the documents', 'Add a folder or a ZIP of case files. Files whose name or folder carries the CNR, case number, file number or title are linked to that case; you can change any match before saving.']
];
const SOURCES = ['Clio', 'MyCase', 'PracticePanther', 'Other practice-management software', 'Excel or Google Sheets diary', 'Accounting and billing software', 'Any CSV, Excel or JSON export'];
const SAFE = [
  ['shield', 'Read in your browser', 'Export files are read on your own computer. Only the records you choose to import are saved to your firm’s account.'],
  ['check', 'Nothing is overwritten', 'Records already in Legal Staff are never changed or deleted. Duplicates, matched by CNR, case number, client name or invoice number, are skipped, so the same file can be imported again safely.'],
  ['clock', 'Undo in one click', 'Every import is listed in Settings. Undo removes what that import added and leaves your own work in place.'],
  ['calendar', 'Indian dates understood', 'Day-first dates such as 31/01/2025, 5 Mar 2025 and Excel dates are read correctly. Columns written month first are recognised from their values.']
];
const FAQS = [
  { q: 'Which software can I move from?', a: 'Any software, diary or spreadsheet that can export to Excel (.xlsx or .xls), CSV or JSON. For Clio, MyCase and PracticePanther the importer already knows their usual column names; for everything else it matches columns by common names and you confirm the matching.' },
  { q: 'My old software has no export button. What can I do?', a: 'Ask its support team for a copy of your data in Excel or CSV. The data is yours, and most providers will send it. Until then you can start with the free templates in the importer and fill in your running matters.' },
  { q: 'Will my documents come across too?', a: 'Yes. Add the files, a folder or a ZIP of your case files. Each file is matched to a case when its name or folder contains the CNR, case number, file number or case title, and given a type such as order or pleading from its name. You check every match before saving.' },
  { q: 'What happens if I import the wrong file?', a: 'Open Settings, find the import in the list and choose Undo. Everything that import added is removed. Hearings added since to those cases go with them; tasks and documents you added by hand stay, without a case.' },
  { q: 'Do I need to import everything at once?', a: 'No. Import clients and cases first, then hearings, tasks, invoices and documents whenever you are ready. Later files are linked to the cases already in Legal Staff.' },
  { q: 'Is there a limit on how many cases I can bring?', a: 'Imports follow your plan’s active-case limit. Disposed matters do not count towards it. If an import reaches the limit, the rest are listed as skipped; after upgrading you can import the same file again and only the missing cases are added.' }
];

const art = `<svg viewBox="0 0 360 280" width="360" height="280" fill="none" aria-hidden="true">
  <circle cx="180" cy="140" r="120" stroke="#262626"/>
  <g class="ls-float"><rect x="46" y="78" width="104" height="124" rx="12" fill="#141414" stroke="#2E2E2E"/>${[0, 1, 2, 3, 4].map(r => `<rect x="60" y="${96 + r * 20}" width="${76 - (r % 3) * 14}" height="6" rx="3" fill="#3A3A3A"/>`).join('')}</g>
  <g class="ls-float" style="animation-delay:-2s"><path d="M160 140h40 M188 128l12 12-12 12" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
  <g class="ls-float" style="animation-delay:-3.2s"><rect x="210" y="70" width="104" height="140" rx="12" fill="#FFFFFF" stroke="#2E2E2E"/><rect x="224" y="88" width="60" height="8" rx="4" fill="#0A0A0A"/>${[0, 1, 2, 3].map(r => `<rect x="224" y="${112 + r * 22}" width="${76 - (r % 2) * 18}" height="6" rx="3" fill="#CFCFCF"/>`).join('')}</g>
  <g class="ls-float" style="animation-delay:-1s"><circle cx="300" cy="66" r="22" fill="#FFFFFF" stroke="#2E2E2E"/><path d="M290 66l7 7 13-14" stroke="#0A0A0A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
</svg>`;

export function pages() {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Switch to Legal Staff', path: PATH }];
  const card = ([ic, h, p], i) => `<div class="card ls-reveal ls-lift" style="--ls-delay:${(i % 3) * 80}ms"><span class="card-ic">${icon(ic, 22)}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`;
  const moves = `<div class="grid3">${MOVES.map(card).join('')}</div>`;
  const steps = `<div class="grid3">${STEPS.map(([h, p], i) => `<div class="card ls-reveal" style="--ls-delay:${(i % 3) * 80}ms"><span class="tag dark">Step ${i + 1}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>`;
  const sources = `<div class="ls-reveal" style="display:flex;flex-wrap:wrap;gap:10px">${SOURCES.map(s => `<span class="tag" style="font-size:14px;padding:8px 14px">${icon('check', 14)} ${esc(s)}</span>`).join('')}</div><p class="muted" style="font-size:13.5px;max-width:820px;margin:16px 0 0">Product names are trademarks of their owners. Legal Staff is not affiliated with them; it reads the export files these products let you download.</p>`;
  const safe = `<div class="grid2">${SAFE.map(card).join('')}</div>`;
  const rel = comparisons.filter(c => c.title).map(c => ({ kind: 'Compare', label: c.title, href: `/compare/${c.slug}` }));
  const body = `${hero({ kicker: 'Switch to Legal Staff', title: TITLE, lead: 'Moving from other practice-management software, an Excel diary or billing software? Bring your clients, cases, hearing dates, tasks, invoices and case files in one sitting, check every row before it is saved, and undo in one click if something is wrong.', crumbs, source: 'Switch hero', secondary: { href: '#how', label: 'How the move works' }, art })}
${section({ kicker: 'What comes across', title: 'Everything your chamber runs on', inner: moves })}
${section({ id: 'how', tone: 'tone-soft', kicker: 'How the move works', title: 'Five steps, most of them automatic', inner: steps })}
${section({ kicker: 'Where from', title: 'Works with the software and spreadsheets you use now', inner: sources })}
${section({ tone: 'tone-soft', kicker: 'Safe to try', title: 'Your data stays yours, and nothing is overwritten', inner: safe })}
${faqBlock(FAQS)}
${relatedLinks('Compare before you switch', rel)}
${ctaBand({ title: 'Bring your practice over this afternoon', text: 'Start the free trial, export from your old software and import it in minutes. Your running matters, next dates and files, ready on day one.', source: 'Switch CTA band' })}`;
  const jsonld = [ld.breadcrumb(crumbs), ld.faqPage(FAQS)];
  return [{ path: PATH, priority: 0.8, changefreq: 'monthly', html: page({ head: seoHead({ title: 'Switch to Legal Staff: Import from Other Legal Software', description: DESC, path: PATH, jsonld }), body, active: 'compare' }) }];
}

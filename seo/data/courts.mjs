// Court and tribunal pages at /courts/<slug>, rendered by seo/pages/court.mjs.
// Shape: { slug, name, short, type: 'supreme'|'high'|'district'|'tribunal'|'consumer', seat, benches: [string],
//   title (H1), metaTitle, metaDescription, lead, intro: [string] (2–3 paragraphs, unique to the forum),
//   orderFormat: { heading, points: [string] } (how orders/cause lists from this forum look and what Legal Staff picks out: next date, bench/court number, item number, purpose),
//   workflow: [{ title, text }] (5–6 steps for this forum), listingNotes: [string] (forum-specific practice points: e.g. mentioning, supplementary lists, e-filing portal by general name),
//   faqs: [{ q, a }] (5), related: { courts: [slug], cities: [slug], features: [slug], tools: [slug], blogs: [slug] } }
export const courts = [
  ['supreme-court-of-india', 'Supreme Court of India', 'Supreme Court'], ['delhi-high-court', 'Delhi High Court', 'Delhi HC'], ['bombay-high-court', 'Bombay High Court', 'Bombay HC'],
  ['calcutta-high-court', 'Calcutta High Court', 'Calcutta HC'], ['madras-high-court', 'Madras High Court', 'Madras HC'], ['karnataka-high-court', 'Karnataka High Court', 'Karnataka HC'],
  ['allahabad-high-court', 'Allahabad High Court', 'Allahabad HC'], ['patna-high-court', 'Patna High Court', 'Patna HC'], ['jharkhand-high-court', 'Jharkhand High Court', 'Jharkhand HC'],
  ['gujarat-high-court', 'Gujarat High Court', 'Gujarat HC'], ['punjab-and-haryana-high-court', 'Punjab and Haryana High Court', 'P&H HC'],
  ['ecourts-district-and-sessions-courts', 'District and Sessions Courts (eCourts)', 'District courts'], ['nclt-and-nclat', 'NCLT and NCLAT', 'NCLT / NCLAT'],
  ['drt-debt-recovery-tribunal', 'Debt Recovery Tribunals (DRT and DRAT)', 'DRT / DRAT'], ['consumer-courts-ncdrc-scdrc', 'Consumer Commissions (NCDRC, SCDRC, DCDRC)', 'Consumer commissions'], ['rera-tribunals', 'RERA Authorities and Appellate Tribunals', 'RERA']
].map(([slug, name, short]) => ({ slug, name, short }));

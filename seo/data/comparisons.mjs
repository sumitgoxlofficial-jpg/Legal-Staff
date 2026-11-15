// Comparison pages at /compare/<slug>, rendered by seo/pages/compare.mjs.
// Shape: { slug, navLabel, navHint, title (H1), metaTitle, metaDescription, kicker, lead, keywords: [string],
//   columns: [{ key, name, tagline }] (2–3; the Legal Staff column key is 'ls'),
//   rows: [{ label, values: { <columnKey>: string }, best: <columnKey> (optional) }] (10–14),
//   decide: [{ column: <columnKey>, title, points: [string] }],
//   verdict: { heading, paragraphs: [string] }, faqs: [{ q, a }] (5–6), related: { features: [slug], tools: [slug], blogs: [slug] } }
export const comparisons = [
  { slug: 'physical-advocate-diary-vs-legal-staff', navLabel: 'Paper diary vs Legal Staff', navHint: 'Paper diaries and Excel vs automated order reading' },
  { slug: 'ecourts-app-vs-legal-staff-workspace', navLabel: 'eCourts app vs Legal Staff', navHint: 'Case status lookups vs a full chamber workspace' },
  { slug: 'legacy-legal-erp-vs-legal-staff', navLabel: 'Enterprise legal ERPs vs Legal Staff', navHint: 'Heavy ERPs vs fast, AI-first practice management' }
];

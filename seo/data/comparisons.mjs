// Comparison pages. Rendered by seo/pages/compare.mjs at /compare/<slug>.
// Shape: { slug, navLabel, navHint, title (H1), metaTitle, metaDescription, kicker, lead,
//   columns: [{ key, name, tagline }] (2–3),
//   rows: [{ label, values: { <columnKey>: string }, best: <columnKey> (optional) }] (10–14),
//   decide: [{ column: <columnKey>, title, points: [string] }],
//   verdict: { heading, paragraphs: [string] }, faqs: [{ q, a }] (5–6), related: { services: [slug], tools: [slug], blogs: [slug] } }
export const comparisons = [
  { slug: 'pvt-ltd-vs-llp-vs-opc', navLabel: 'Pvt Ltd vs LLP vs OPC', navHint: 'Tax, compliance cost, investors, liability' },
  { slug: 'in-house-cs-vs-virtual-compliance-officer', navLabel: 'In-house CS vs virtual compliance officer', navHint: 'Cost, coverage and risk for startups' },
  { slug: 'legacy-portals-vs-dedicated-cma-legal-desk', navLabel: 'Portals vs dedicated CMA & legal desk', navHint: 'Why funded startups switch' }
];

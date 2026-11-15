// Core services. Rendered by seo/pages/service.mjs at /services/<slug>.
// Shape (every field required unless marked optional):
// { slug, icon, navLabel, navHint, title (H1), metaTitle, metaDescription, kicker, lead, chips: [string],
//   intro: { heading, paragraphs: [string] },
//   documents: [{ group, items: [{ name, note }] }],
//   timeline: [{ when, title, text, forms: [string] }],
//   tiers: [{ name, for, price (number, INR, professional fee), priceNote, featured (bool, optional), includes: [string] }],
//   govFeesNote, deliverables: [string], faqs: [{ q, a }] (6–8), related: { services: [slug], tools: [slug], compare: [slug], blogs: [slug] } }
export const services = [
  { slug: 'private-limited-company-registration', icon: 'building', navLabel: 'Private Limited registration', navHint: 'SPICe+ Part A & B, DSC, DIN, PAN/TAN, INC-20A' },
  { slug: 'llp-registration-india', icon: 'handshake', navLabel: 'LLP registration', navHint: 'FiLLiP, LLP agreement drafting and Form 3' },
  { slug: 'cma-ca-cs-certification-services', icon: 'stamp', navLabel: 'CMA, CA & CS certification', navHint: 'SPICe+ Block 11, INC-20A, CAS-4, CRA-4, bank CMA' },
  { slug: 'roc-annual-compliance', icon: 'calendar', navLabel: 'ROC annual compliance', navHint: 'AOC-4, MGT-7, DIR-3 KYC, ADT-1, DPT-3' },
  { slug: 'msme-udyam-dpiit-startup-registration', icon: 'rocket', navLabel: 'Startup India, MSME & GST', navHint: 'DPIIT recognition, 80-IAC, Udyam, GST' },
  { slug: 'legal-staffing-virtual-compliance-officer', icon: 'users', navLabel: 'Legal staffing & compliance officer', navHint: 'Remote paralegals, CLM and virtual compliance officers' }
];

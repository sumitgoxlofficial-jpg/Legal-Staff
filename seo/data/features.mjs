// Product feature pages at /features/<slug>, rendered by seo/pages/feature.mjs.
// Shape: { slug, icon, navLabel, navHint, title (H1), metaTitle, metaDescription, kicker, lead, chips: [string],
//   problem: { heading, points: [{ title, text }] }, solution: { heading, points: [{ title, text }] },
//   preview: { kind: 'order'|'whatsapp'|'diary'|'research'|'vault'|'board', caption } (the interactive UI preview card),
//   howItWorks: [{ title, text }] (4–6), useCases: [{ who, text }] (3), faqs: [{ q, a }] (6–8),
//   related: { features: [slug], courts: [slug], tools: [slug], compare: [slug], blogs: [slug] } }
export const features = [
  { slug: 'ai-court-order-reader', icon: 'order', navLabel: 'AI court order reader', navHint: 'Reads each order and picks out the next hearing date' },
  { slug: 'whatsapp-hearing-reminders', icon: 'whatsapp', navLabel: 'WhatsApp hearing reminders', navHint: 'Alerts for you, juniors and clients before every date' },
  { slug: 'digital-advocate-diary', icon: 'calendar', navLabel: 'Digital advocate diary', navHint: 'Cloud court diary with cause-list calendar' },
  { slug: 'ai-legal-research-workspace', icon: 'search', navLabel: 'AI legal research workspace', navHint: 'Research and summaries that cite their sources' },
  { slug: 'case-document-management', icon: 'folder', navLabel: 'Case document management', navHint: 'Petitions, annexures, order sheets and vakalatnamas' },
  { slug: 'chamber-team-collaboration', icon: 'users', navLabel: 'Chamber team collaboration', navHint: 'Tasks and hearing board for juniors and clerks' }
];

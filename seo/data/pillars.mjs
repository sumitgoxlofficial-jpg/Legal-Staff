// Blog pillars. Each post has `pillar: <id>`; the sidebar CTA (AdvocateCTA) is chosen from this list.
export const pillars = [
  { id: 'court-diary-whatsapp', name: 'Court Diary & WhatsApp Alerts', short: 'Court diary',
    cta: { title: 'Never miss a date: your court diary, filled from every order', points: ['Next dates picked out of each order for you to confirm', 'WhatsApp reminders two days before and on the morning of the hearing', 'One calendar for every court and tribunal'], label: 'Start free', feature: 'digital-advocate-diary' } },
  { id: 'ai-order-reader-research', name: 'AI Order Reader & Research', short: 'AI & research',
    cta: { title: 'Let Legal Staff read your orders and draft your hearing brief', points: ['Order summaries with paragraph citations', 'Case Brain answers only from your own case file', 'Nothing used to train public models'], label: 'Start free', feature: 'ai-court-order-reader' } },
  { id: 'procedural-limitation', name: 'Procedural & Limitation Guides', short: 'Procedure',
    cta: { title: 'Track every limitation date with a calculation you can check', points: ['Rule-based limitation with each exclusion shown', 'Alerts before the last date', 'Written statement and appeal deadlines on your calendar'], label: 'Start free', feature: 'digital-advocate-diary' } },
  { id: 'chamber-management', name: 'Chamber Management', short: 'Chamber',
    cta: { title: 'Run your chamber from one board: juniors, clerks, clients and fees', points: ['Daily hearing board and task assignment', 'Client updates on WhatsApp', 'Per-hearing billing and GST invoices'], label: 'Start free', feature: 'chamber-team-collaboration' } }
];

// Filing types for /tools/limitation-period-calculator. The calculator in static/tools.js reads these as data.
// Shape: { id, label, period: { days } | { years }, outer?: { days, label }, startLabel (what the first date means),
//          copyExclusion: true when Limitation Act s.12(2)/(3) certified-copy time is excluded,
//          condonation: text on extension/condonation, source: governing provision, notes: [string] }
// Day counting: the day the period starts from (judgment / service / accrual) is excluded (Limitation Act s.12(1);
// for CPC time limits, General Clauses Act s.9), so a 30-day period from 1 March ends on 31 March.
export const limitationRules = [
  {
    id: 'ws-civil',
    label: 'Written statement — civil (non-commercial) suit',
    short: 'Written statement (civil suit)',
    period: { days: 30 },
    outer: { days: 90, label: 'Outer limit if the court extends time' },
    startLabel: 'Date of service of summons',
    copyExclusion: false,
    source: 'Order VIII Rule 1, Code of Civil Procedure, 1908',
    condonation: 'The court may allow the written statement up to 90 days from service, for reasons recorded in writing. In non-commercial suits courts have treated the 90-day limit as directory in exceptional cases, but do not plan on it.',
    notes: ['Time runs from service of summons on the defendant, not from the first date of appearance.', 'Certified-copy time under section 12 does not apply to a written statement.']
  },
  {
    id: 'ws-commercial',
    label: 'Written statement — commercial suit',
    short: 'Written statement (commercial suit)',
    period: { days: 30 },
    outer: { days: 120, label: 'Hard outer limit (no extension beyond)' },
    startLabel: 'Date of service of summons',
    copyExclusion: false,
    source: 'Order VIII Rule 1 CPC as amended for commercial disputes by the Commercial Courts Act, 2015',
    condonation: 'The court may allow it up to 120 days from service, for reasons recorded and on payment of costs. On expiry of 120 days the defendant forfeits the right to file the written statement and the court cannot take it on record.',
    notes: ['Day 120 is a hard stop: there is no condonation beyond it.', 'Certified-copy time under section 12 does not apply to a written statement.']
  },
  {
    id: 'first-appeal-hc',
    label: 'First appeal to the High Court from a decree',
    short: 'First appeal (High Court)',
    period: { days: 90 },
    startLabel: 'Date of the decree / judgment',
    copyExclusion: true,
    source: 'Article 116(a), Schedule to the Limitation Act, 1963 (appeals under the CPC to a High Court)',
    condonation: 'An appeal filed late can be admitted if the court is satisfied there was sufficient cause for the delay (Limitation Act section 5) — file with an application for condonation of delay explaining each day.',
    notes: ['Section 12(2) excludes the time requisite for obtaining a copy of the decree; section 12(3) also excludes the time for a copy of the judgment.', 'An appeal to a court other than the High Court is 30 days (Article 116(b)).']
  },
  {
    id: 'slp',
    label: 'Special Leave Petition to the Supreme Court',
    short: 'SLP (Supreme Court)',
    period: { days: 90 },
    altPeriod: { days: 60, label: 'Where the High Court refused a certificate of fitness to appeal', startLabel: 'Date the High Court refused the certificate' },
    startLabel: 'Date of the judgment / order',
    copyExclusion: true,
    source: 'Supreme Court Rules, 2013 — Order XXII Rule 1 (petitions under Article 136 of the Constitution)',
    condonation: 'Delay can be condoned by the Supreme Court on sufficient cause; an application for condonation of delay is filed with the petition.',
    notes: ['90 days from the date of the judgment or order; 60 days from the date of refusal where a certificate of fitness was applied for and refused by the High Court.', 'The time taken to obtain the certified copy is excluded in computing the period, as under section 12 — check the Registry\'s computation for your case.']
  },
  {
    id: 'money-suit',
    label: 'Suit for money / recovery of a debt',
    short: 'Money recovery suit',
    period: { years: 3 },
    startLabel: 'Date the right to sue accrued (e.g. loan made, goods delivered, payment due)',
    copyExclusion: false,
    source: 'Schedule to the Limitation Act, 1963 — three-year articles such as Article 19 (money lent), Article 14 (price of goods sold and delivered) and Article 113 (residuary)',
    condonation: 'Section 5 condonation does not apply to suits. A written acknowledgment of liability signed before the period expires (section 18) or a part payment (section 19) starts a fresh three-year period.',
    notes: ['Which article applies decides the starting point: when the loan was made, when the goods were delivered, when the agreed credit period ended, or (Article 113) when the right to sue accrues. Read the article that fits your facts.', 'The period ends on the same calendar date three years later (the starting day is excluded).']
  }
];

export const limitationNotes = {
  s4: 'Section 4: where the prescribed period expires on a day the court is closed, the suit, appeal or application may be filed on the day the court reopens.',
  s12_1: 'Section 12(1): the day from which the period is to be reckoned is excluded.',
  s12_2: 'Section 12(2): for an appeal, revision or review, the day the judgment was pronounced and the time requisite for obtaining a copy of the decree or order are excluded.',
  s12_explanation: 'Explanation to section 12: time taken by the court to prepare the decree or order before the copy is applied for is not excluded.'
};

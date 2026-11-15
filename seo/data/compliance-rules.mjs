// Compliance rules for the ROC & tax calendar generator (/tools/roc-compliance-calendar).
// Data, not UI: static/tools.js evaluates these rules on { entity, incorporation date, financial year }.
//
// Rule shape: { id, entity: 'company'|'llp'|'both', form, title, law, when: 'first'|'annual'|'period',
//   due: one of
//     { type: 'afterIncorp', days } | { type: 'afterIncorp', months }      first-year items, from the date of incorporation
//     { type: 'agm' }                                                     company AGM (first: 9 months from end of first FY; later: 6 months, i.e. 30 Sept)
//     { type: 'afterAgm', days }                                          from the AGM date (or the last date the AGM should have been held)
//     { type: 'afterFy', month, day }                                     a fixed day after the FY ends (FY 2025-26 -> 2026)
//     { type: 'inFy', month, day, periodEnd: { month, day } }             a fixed day inside the FY (quarterly / half-yearly)
//   basis: 'statutory' (annual accounts/returns: skipped for an FY that ends before the entity's first statutory FY ends)
//        | 'period' (applies if the entity existed by the period end, e.g. tax year, DIN held on 31 March)
//   firstAgmOnly?, laterAgmOnly?, conditional? (string shown as "if applicable"), audit?: true|false (LLP ITR variant)
//   lateFee: key into lateFees, sure: boolean (false = indicative rule, labelled in the UI), note }
//
// Assumption: where the Companies Act / LLP Act allow the first financial year to run to 31 March of the following
// year (company incorporated on or after 1 January; LLP incorporated after 30 September), the calendar assumes the
// longer first year has been chosen. Income-tax obligations always follow the April–March previous year.

export const complianceRules = [
  // ---------- company: first-year ----------
  { id: 'board1', entity: 'company', form: 'Board meeting', title: 'First board meeting', law: 'Section 173(1), Companies Act 2013', when: 'first',
    due: { type: 'afterIncorp', days: 30 }, sure: true, note: 'Hold within 30 days of incorporation. Small companies and OPCs must then meet at least once in each half of the calendar year; other companies at least four times a year, with no more than 120 days between meetings.' },
  { id: 'auditor1', entity: 'company', form: 'Auditor appointment', title: 'Board appoints the first auditor', law: 'Section 139(6)', when: 'first',
    due: { type: 'afterIncorp', days: 30 }, sure: true, note: 'The first auditor holds office until the conclusion of the first AGM.' },
  { id: 'adt1first', entity: 'company', form: 'ADT-1', title: 'Intimation of first auditor (commonly filed)', law: 'Section 139 read with Rule 4', when: 'first',
    due: { type: 'afterIncorp', days: 45 }, lateFee: 'multiplier', sure: false, note: 'Usually filed within 15 days of the board appointing the first auditor (shown here as 45 days from incorporation, assuming appointment on day 30). Practice varies; many professionals file it as a matter of caution.' },
  { id: 'sharecert', entity: 'company', form: 'Share certificates', title: 'Issue share certificates to subscribers', law: 'Section 56(4)(a)', when: 'first',
    due: { type: 'afterIncorp', months: 2 }, sure: true, note: 'Within two months of incorporation. Certificates are stamped as per the state stamp law; dematerialisation rules apply to private companies other than small companies.' },
  { id: 'inc20a', entity: 'company', form: 'INC-20A', title: 'Declaration for commencement of business', law: 'Section 10A', when: 'first',
    due: { type: 'afterIncorp', days: 180 }, lateFee: 'inc20a', sure: true, note: 'For companies with share capital. Subscribers must have paid the subscription money and the bank statement is attached. The RoC can initiate strike-off if it is not filed.' },
  // ---------- company: AGM-linked ----------
  { id: 'agm', entity: 'company', form: 'AGM', title: 'Annual general meeting', law: 'Section 96', when: 'annual', basis: 'statutory',
    due: { type: 'agm' }, sure: true, note: 'First AGM within 9 months from the end of the first financial year; later AGMs within 6 months of the FY end (30 September) and not more than 15 months apart. OPCs do not hold an AGM.' },
  { id: 'adt1agm', entity: 'company', form: 'ADT-1', title: 'Auditor appointed at first AGM (5-year term)', law: 'Section 139(1)', when: 'annual', basis: 'statutory', firstAgmOnly: true,
    due: { type: 'afterAgm', days: 15 }, lateFee: 'multiplier', sure: true, note: 'Within 15 days of the AGM at which the auditor is appointed for a term of five years.' },
  { id: 'aoc4', entity: 'company', form: 'AOC-4', title: 'Financial statements', law: 'Section 137', when: 'annual', basis: 'statutory',
    due: { type: 'afterAgm', days: 30 }, lateFee: 'perDay100', sure: true, note: 'Within 30 days of the AGM (AOC-4 XBRL where applicable).' },
  { id: 'mgt7', entity: 'company', form: 'MGT-7 / MGT-7A', title: 'Annual return', law: 'Section 92', when: 'annual', basis: 'statutory',
    due: { type: 'afterAgm', days: 60 }, lateFee: 'perDay100', sure: true, note: 'Within 60 days of the AGM. Small companies and OPCs file the abridged MGT-7A.' },
  // ---------- company: fixed annual dates ----------
  { id: 'dpt3', entity: 'company', form: 'DPT-3', title: 'Return of deposits / outstanding receipts', law: 'Rule 16, Companies (Acceptance of Deposits) Rules', when: 'annual', basis: 'period',
    due: { type: 'afterFy', month: 6, day: 30 }, lateFee: 'multiplier', sure: true, conditional: 'If the company has outstanding loans or receipts (including from directors) as on 31 March', note: 'Annual return as on 31 March, due by 30 June.' },
  { id: 'dir3kyc', entity: 'both', form: 'DIR-3 KYC', title: 'KYC of every director / designated partner holding a DIN', law: 'Rule 12A, Companies (Appointment and Qualification of Directors) Rules', when: 'annual', basis: 'period',
    due: { type: 'afterFy', month: 9, day: 30 }, lateFee: 'dir3kyc', sure: true, note: 'For every individual holding a DIN/DPIN as on 31 March. Use the web form if details are unchanged. Check the MCA portal for any change in periodicity.' },
  { id: 'taxaudit', entity: 'both', form: 'Form 3CA/3CB-3CD', title: 'Tax audit report', law: 'Section 44AB, Income-tax Act', when: 'annual', basis: 'period',
    due: { type: 'afterFy', month: 9, day: 30 }, sure: true, conditional: 'If turnover crosses the section 44AB threshold', note: 'Due one month before the return due date (30 September where the return is due on 31 October).' },
  { id: 'itr6', entity: 'company', form: 'ITR-6', title: 'Income-tax return', law: 'Section 139(1)', when: 'annual', basis: 'period',
    due: { type: 'afterFy', month: 10, day: 31 }, lateFee: 'itr234F', sure: true, note: 'Every company files ITR-6 (other than those claiming section 11 exemption). 30 November applies where a transfer-pricing report (Form 3CEB) is required.' },
  // ---------- LLP ----------
  { id: 'llp3', entity: 'llp', form: 'Form 3', title: 'LLP agreement and changes', law: 'Section 23, LLP Act 2008', when: 'first',
    due: { type: 'afterIncorp', days: 30 }, lateFee: 'llpPerDay100', sure: true, note: 'File the LLP agreement within 30 days of incorporation.' },
  { id: 'form11', entity: 'llp', form: 'Form 11', title: 'Annual return of LLP', law: 'Section 35', when: 'annual', basis: 'statutory',
    due: { type: 'afterFy', month: 5, day: 30 }, lateFee: 'llpPerDay100', sure: true, note: 'Within 60 days of the close of the financial year (30 May).' },
  { id: 'form8', entity: 'llp', form: 'Form 8', title: 'Statement of account and solvency', law: 'Section 34', when: 'annual', basis: 'statutory',
    due: { type: 'afterFy', month: 10, day: 30 }, lateFee: 'llpPerDay100', sure: true, note: 'Within 30 days of the end of six months of the FY (30 October). Accounts are audited if turnover exceeds ₹40 lakh or contribution exceeds ₹25 lakh.' },
  { id: 'itr5', entity: 'llp', form: 'ITR-5', title: 'Income-tax return (non-audit)', law: 'Section 139(1)', when: 'annual', basis: 'period', audit: false,
    due: { type: 'afterFy', month: 7, day: 31 }, lateFee: 'itr234F', sure: true, note: 'For LLPs whose accounts are not required to be audited. The government sometimes extends this date by notification.' },
  { id: 'itr5a', entity: 'llp', form: 'ITR-5', title: 'Income-tax return (audit case)', law: 'Section 139(1)', when: 'annual', basis: 'period', audit: true,
    due: { type: 'afterFy', month: 10, day: 31 }, lateFee: 'itr234F', sure: true, note: 'For LLPs liable to audit under any law.' },
  // ---------- both: in-year periodic ----------
  { id: 'adv1', entity: 'both', form: 'Advance tax', title: 'Advance tax: 15% instalment', law: 'Section 211', when: 'period', basis: 'period', due: { type: 'inFy', month: 6, day: 15, periodEnd: { month: 6, day: 15 } }, sure: true, conditional: 'If tax payable for the year is ₹10,000 or more', note: 'Shortfall attracts interest under sections 234B/234C.' },
  { id: 'tdsq1', entity: 'both', form: 'TDS return (24Q/26Q)', title: 'TDS return, Q1 (Apr–Jun)', law: 'Section 200(3)', when: 'period', basis: 'period', due: { type: 'inFy', month: 7, day: 31, periodEnd: { month: 6, day: 30 } }, lateFee: 'tds234E', sure: true, conditional: 'If tax was deducted at source', note: 'Late fee under section 234E applies per day of delay.' },
  { id: 'adv2', entity: 'both', form: 'Advance tax', title: 'Advance tax: 45% instalment', law: 'Section 211', when: 'period', basis: 'period', due: { type: 'inFy', month: 9, day: 15, periodEnd: { month: 9, day: 15 } }, sure: true, conditional: 'If tax payable for the year is ₹10,000 or more', note: 'Cumulative 45% of estimated tax.' },
  { id: 'msme1a', entity: 'company', form: 'MSME-1', title: 'Half-yearly return of MSME dues (Apr–Sep)', law: 'Section 405 order', when: 'period', basis: 'period', due: { type: 'inFy', month: 10, day: 31, periodEnd: { month: 9, day: 30 } }, sure: true, conditional: 'If payments to MSME suppliers are outstanding beyond 45 days', note: 'No filing fee; non-filing is punishable under section 405.' },
  { id: 'tdsq2', entity: 'both', form: 'TDS return (24Q/26Q)', title: 'TDS return, Q2 (Jul–Sep)', law: 'Section 200(3)', when: 'period', basis: 'period', due: { type: 'inFy', month: 10, day: 31, periodEnd: { month: 9, day: 30 } }, lateFee: 'tds234E', sure: true, conditional: 'If tax was deducted at source', note: '' },
  { id: 'adv3', entity: 'both', form: 'Advance tax', title: 'Advance tax: 75% instalment', law: 'Section 211', when: 'period', basis: 'period', due: { type: 'inFy', month: 12, day: 15, periodEnd: { month: 12, day: 15 } }, sure: true, conditional: 'If tax payable for the year is ₹10,000 or more', note: 'Cumulative 75% of estimated tax.' },
  { id: 'tdsq3', entity: 'both', form: 'TDS return (24Q/26Q)', title: 'TDS return, Q3 (Oct–Dec)', law: 'Section 200(3)', when: 'period', basis: 'period', due: { type: 'inFy', month: 1, day: 31, periodEnd: { month: 12, day: 31 } }, lateFee: 'tds234E', sure: true, conditional: 'If tax was deducted at source', note: '' },
  { id: 'adv4', entity: 'both', form: 'Advance tax', title: 'Advance tax: 100% instalment', law: 'Section 211', when: 'period', basis: 'period', due: { type: 'inFy', month: 3, day: 15, periodEnd: { month: 3, day: 15 } }, sure: true, conditional: 'If tax payable for the year is ₹10,000 or more', note: 'Balance of estimated tax for the year.' },
  { id: 'msme1b', entity: 'company', form: 'MSME-1', title: 'Half-yearly return of MSME dues (Oct–Mar)', law: 'Section 405 order', when: 'period', basis: 'period', due: { type: 'afterFy', month: 4, day: 30 }, sure: true, conditional: 'If payments to MSME suppliers are outstanding beyond 45 days', note: '' },
  { id: 'tdsq4', entity: 'both', form: 'TDS return (24Q/26Q)', title: 'TDS return, Q4 (Jan–Mar)', law: 'Section 200(3)', when: 'period', basis: 'period', due: { type: 'afterFy', month: 5, day: 31 }, lateFee: 'tds234E', sure: true, conditional: 'If tax was deducted at source', note: '' }
];

// Normal MCA filing fee by authorised share capital (companies with share capital), used as the base for additional fees.
export const companyNormalFee = [
  { below: 100000, fee: 200 }, { below: 500000, fee: 300 }, { below: 2500000, fee: 400 }, { below: 10000000, fee: 500 }, { below: Infinity, fee: 600 }
];
// Normal LLP filing fee by contribution (Forms 3, 8, 11).
export const llpNormalFee = [
  { upTo: 100000, fee: 50 }, { upTo: 500000, fee: 100 }, { upTo: 1000000, fee: 150 }, { upTo: 2500000, fee: 200 }, { upTo: 10000000, fee: 400 }, { upTo: Infinity, fee: 600 }
];

// Late-fee rules used by the late-fee calculator.
export const lateFees = {
  perDay100: { label: '₹100 per day of delay, plus the normal filing fee', type: 'perDay', rate: 100, base: 'company', sure: true,
    law: 'Companies (Registration Offices and Fees) Rules, 2014 — additional fee for AOC-4 and MGT-7/7A (no upper cap).' },
  llpPerDay100: { label: '₹100 per day of delay, plus the normal filing fee', type: 'perDay', rate: 100, base: 'llp', sure: true,
    law: 'LLP Rules, 2009 as amended in 2022 — additional fee of ₹100 per day for Forms 3, 8 and 11 (no upper cap).' },
  dir3kyc: { label: '₹5,000 flat after the due date', type: 'flat', amount: 5000, sure: true,
    law: 'Rule 12A — a DIN not KYC-compliant is marked "Deactivated due to non-filing of DIR-3 KYC" until the form is filed with the ₹5,000 fee.' },
  inc20a: { label: 'Penalty under section 10A plus additional filing fee', type: 'penalty10A', company: 50000, officerPerDay: 1000, officerMax: 100000, sure: true,
    law: 'Section 10A(2): ₹50,000 on the company and ₹1,000 per day (maximum ₹1,00,000) on every officer in default. The form itself also attracts additional fees for delay (indicative multiplier shown).' },
  multiplier: { label: 'Multiple of the normal filing fee, by length of delay (indicative)', type: 'multiplier', base: 'company', sure: false,
    bands: [{ upToDays: 30, times: 2 }, { upToDays: 60, times: 4 }, { upToDays: 90, times: 6 }, { upToDays: 180, times: 10 }, { upToDays: Infinity, times: 12 }],
    law: 'Companies (Registration Offices and Fees) Rules, 2014 — additional fee for forms other than the annual forms is a multiple of the normal fee; bands as commonly applied, confirm on the MCA fee calculator.' },
  tds234E: { label: '₹200 per day, capped at the TDS amount', type: 'perDay', rate: 200, capNote: 'The total late fee cannot exceed the amount of TDS for the quarter.', sure: true,
    law: 'Section 234E, Income-tax Act. Penalty under section 271H may also apply for delays beyond one year.' },
  itr234F: { label: '₹5,000 fee for a belated return, plus interest', type: 'flat', amount: 5000, sure: true,
    law: 'Section 234F (₹5,000; ₹1,000 only for individuals with income up to ₹5 lakh). Interest under section 234A at 1% per month on unpaid tax is extra and not computed here.' }
};

export const financialYears = ['2024-25', '2025-26', '2026-27', '2027-28'];

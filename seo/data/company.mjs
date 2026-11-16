// Operator details used by the company and legal pages (seo/pages/legal.mjs).
// One place to fill in. Any value that is not known yet is null; the pages then render a safe fallback
// (see FALLBACK below) and the field is listed in `missing` so the owner knows what to supply.
// Do NOT guess these values: a privacy policy or terms page with a wrong entity name or address is worse than a fallback.
//
// Shape:
//   brand            string   Trading name shown everywhere.
//   site             string   Domain the policies apply to.
//   legalName        string|null  Registered name of the operating entity (e.g. company / LLP / proprietor).
//   address          string|null  Registered or postal address for notices.
//   city             string|null  City of the registered office.
//   email            string|null  General contact / privacy email.
//   phone            string|null  Contact phone (optional).
//   gstin            string|null  GSTIN of the operator, shown on the refund page if set.
//   grievanceOfficer { name, email, phone } each string|null  Grievance Officer under the DPDP Act / IT Rules.
//   courtsCity       string|null  City whose courts have exclusive jurisdiction under the Terms.
//   refund           { windowDays, annualProRata }  OWNER MUST CONFIRM (see comment below).
//   liabilityCap     { months }   OWNER MUST CONFIRM (see comment below).
//   dataRegion       string   Where the primary database is hosted.
//   updated          'YYYY-MM-DD'  "Last updated" date printed on every legal page.

export const company = {
  brand: 'Legal Staff',
  site: 'legalstaff.in',
  legalName: null,
  address: null,
  city: null,
  email: null,
  phone: null,
  gstin: null,
  grievanceOfficer: { name: null, email: null, phone: null },
  courtsCity: null,
  // OWNER MUST CONFIRM: conservative default. Full refund if asked within `windowDays` of the FIRST payment for a plan;
  // after that, no pro-rata refunds for the unused part of an annual plan (annualProRata: false).
  refund: { windowDays: 7, annualProRata: false, confirmed: false },
  // OWNER MUST CONFIRM: total liability capped at the fees paid in the `months` before the claim. Standard SaaS wording.
  liabilityCap: { months: 12, confirmed: false },
  dataRegion: 'Mumbai, India (AWS ap-south-1, via Supabase)',
  updated: '2026-11-16'
};

// Text used when a value is null.
export const FALLBACK = {
  legalName: `${company.brand} (the operator of ${company.site})`,
  email: 'use the form on our Data rights page',
  grievanceOfficer: `Grievance Officer, ${company.brand} — reachable through the Data rights page`,
  courtsCity: 'the courts having jurisdiction where the operator is registered'
};

// Fields still null (dot paths), plus values that need the owner's sign-off.
export const missing = [
  ...['legalName', 'address', 'city', 'email', 'phone', 'gstin', 'courtsCity'].filter(k => company[k] == null),
  ...Object.keys(company.grievanceOfficer).filter(k => company.grievanceOfficer[k] == null).map(k => 'grievanceOfficer.' + k)
];
export const needsConfirmation = [
  ...(company.refund.confirmed ? [] : [`refund.windowDays (${company.refund.windowDays} days, no pro-rata on annual plans)`]),
  ...(company.liabilityCap.confirmed ? [] : [`liabilityCap.months (${company.liabilityCap.months} months of fees)`])
];

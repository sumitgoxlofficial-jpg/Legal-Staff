// Legal Staff: pure logic for the court-record engine (no network, no database), shared by
// functions/court-sync and tests/court-logic.test.mjs. Nothing here may read a secret.

export const STATUS = { VERIFIED: 'VERIFIED', PENDING: 'PENDING', STALE: 'STALE', FAILED: 'FAILED', MANUAL: 'MANUAL REVIEW', PARTIAL: 'PARTIAL' };

/* ---------- identifiers ---------- */
export const normalizeCnr = s => String(s || '').replace(/[\s-]/g, '').toUpperCase();
/* Court CNRs are 4 letters + 12 digits. Tribunal CNRs minted by eCourtsIndia are 16 characters, letters and digits. */
export const cnrValid = s => /^[A-Z]{4}\d{12}$/.test(normalizeCnr(s)) || /^[A-Z]{3,7}[A-Z0-9]{9,13}$/.test(normalizeCnr(s)) && normalizeCnr(s).length === 16;

const TRIBUNAL_PREFIX = [
  ['NCLAT', /^NCLAT/], ['NCLT', /^NCLT/], ['ITAT', /^ITAT?/], ['CAT', /^CGA|^CAT/], ['CESTAT', /^CES/], ['DRAT', /^DRA/], ['DRT', /^DRT/], ['SAT', /^SAT/],
  ['TDSAT', /^TDS/], ['APTEL', /^APT/], ['GSTAT', /^GTL|^GST/], ['NGT', /^NGT/], ['AFT', /^AFT/], ['CONSUMER', /^JAG/]
];
/* Best guess of the kind of court from a CNR. A guess only: the provider's own answer decides. */
export function classifyCnr(cnr) {
  const c = normalizeCnr(cnr);
  if (!cnrValid(c)) return { category: 'unknown', supported: false, reason: 'Not a valid CNR' };
  if (/^[A-Z]{4}\d{12}$/.test(c)) {
    if (c.startsWith('SCIN')) return { category: 'supreme', supported: true };
    if (c.slice(2, 4) === 'HC' || c.startsWith('HC')) return { category: 'high_court', supported: true };
    return { category: 'district', supported: true };
  }
  for (const [name, re] of TRIBUNAL_PREFIX) if (re.test(c)) return { category: 'tribunal', tribunal: name, supported: true };
  return { category: 'unknown', supported: false, reason: 'Unrecognised CNR layout' };
}

/* ---------- provider capability registry (static fallback; the database table provider_capabilities overrides it) ---------- */
export const CATEGORIES = ['supreme', 'high_court', 'district', 'tribunal'];
export const PROVIDERS = {
  official_manual: { name: 'Official portals (manual)', kind: 'official', automated: false, categories: CATEGORIES, ops: ['portal_link'] },
  ecourtsindia: { name: 'eCourtsIndia API', kind: 'paid', automated: true, categories: CATEGORIES, ops: ['case_detail', 'refresh'],
    /* Per the provider's own published coverage; not independently tested by us until verified_at is set in provider_capabilities. */
    tribunals: ['NCLT', 'NCLAT', 'ITAT', 'CAT', 'CESTAT', 'DRT', 'DRAT', 'SAT', 'TDSAT', 'APTEL', 'GSTAT', 'NGT', 'AFT', 'CONSUMER'] }
};
export function capability(provider, info, op, overrides) {
  const p = PROVIDERS[provider];
  if (!p) return { supported: false, reason: 'Unknown provider' };
  if (overrides && overrides.length) { const hit = overrides.find(o => o.provider_key === provider && o.category === info.category && o.operation === op && (!o.court_code || o.court_code === info.tribunal)); if (hit) return { supported: !!hit.supported, reason: hit.notes || '', tested: !!hit.verified_at }; }
  if (!p.ops.includes(op)) return { supported: false, reason: `${p.name} does not offer ${op}` };
  if (!p.categories.includes(info.category)) return { supported: false, reason: `${p.name} does not cover this kind of court` };
  if (info.category === 'tribunal' && p.tribunals && info.tribunal && !p.tribunals.includes(info.tribunal)) return { supported: false, reason: `${p.name} does not list ${info.tribunal}` };
  return { supported: true, tested: false };
}

/* ---------- cost (paise; 1 credit = Rs 1 = 100 paise). Rate card of eCourtsIndia, October 2026; check the provider's pricing page. ---------- */
export const RATE = {
  payg: { case_detail: 150, refresh: 15, order_pdf: 375 },
  enterprise: { case_detail: 50, refresh: 5, order_pdf: 125 }
};
export const costPaise = (plan, op) => ((RATE[plan] || RATE.payg)[op]) ?? 0;

/* ---------- request identity and de-duplication ---------- */
export const requestKey = (provider, op, id, extra) => [provider, op, normalizeCnr(id), extra || ''].join('|');

/* ---------- freshness and scheduling ---------- */
export const hoursSince = (iso, now) => iso ? Math.max(0, ((now || Date.now()) - Date.parse(iso)) / 36e5) : Infinity;
export const DEFAULTS = { upcomingHours: 12, activeHours: 24, inactiveHours: 168, closedHours: 720, maxAgeHours: 24, freshCooldownMinutes: 10, upcomingDays: 3 };
/* How often a case should be re-checked. Cases with a hearing close by come first. */
export function intervalHours(c, cfg, now) {
  const k = Object.assign({}, DEFAULTS, cfg || {}), today = new Date(now || Date.now()).toISOString().slice(0, 10);
  if (c.state === 'closed') return k.closedHours;
  if (c.state === 'inactive') return k.inactiveHours;
  if (c.next_hearing_date) { const d = (Date.parse(c.next_hearing_date) - Date.parse(today)) / 864e5; if (d >= 0 && d <= k.upcomingDays) return k.upcomingHours; }
  return k.activeHours;
}
export const isDue = (c, cfg, now) => hoursSince(c.last_checked_at, now) >= intervalHours(c, cfg, now);
/* Order of work: hearings soonest first, never-checked first, then oldest check. */
export function priority(c, now) {
  const today = Date.parse(new Date(now || Date.now()).toISOString().slice(0, 10));
  const d = c.next_hearing_date ? (Date.parse(c.next_hearing_date) - today) / 864e5 : 999;
  return [(d >= 0 ? d : 998), c.last_checked_at ? Date.parse(c.last_checked_at) : 0];
}
export const byPriority = (a, b, now) => { const x = priority(a, now), y = priority(b, now); return x[0] - y[0] || x[1] - y[1]; };

/* ---------- verification status ---------- */
/* A successful HTTP response alone never means verified: the record must also match the registered identifiers. */
export function verificationStatus(o) {
  if (o.manual) return STATUS.MANUAL;
  if (o.failed) return STATUS.FAILED;
  if (!o.checkedAt) return STATUS.PENDING;
  if (!o.matched) return STATUS.MANUAL;
  if (hoursSince(o.checkedAt, o.now) > (o.maxAgeHours || DEFAULTS.maxAgeHours) * 2) return STATUS.STALE;
  return o.partial ? STATUS.PARTIAL : STATUS.VERIFIED;
}
export function freshnessLabel(iso, now, maxAgeHours) {
  const h = hoursSince(iso, now), m = maxAgeHours || DEFAULTS.maxAgeHours;
  if (!isFinite(h)) return 'never checked';
  return h <= m ? 'fresh' : h <= m * 2 ? 'ageing' : 'stale';
}

/* ---------- reading a provider's answer ---------- */
const squash = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function find(o, names, depth = 0) {
  if (!o || typeof o !== 'object' || depth > 5) return undefined;
  const want = names.map(squash);
  for (const [k, v] of Object.entries(o)) if (want.includes(squash(k)) && v != null && v !== '' && typeof v !== 'object') return v;
  for (const [k, v] of Object.entries(o)) if (want.includes(squash(k)) && v != null && typeof v === 'object') return v;
  for (const v of Object.values(o)) if (v && typeof v === 'object') { const r = find(v, names, depth + 1); if (r !== undefined) return r; }
  return undefined;
}
export const isoDate = s => {
  s = String(s || ''); let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s); return isNaN(+d) ? '' : d.toISOString().slice(0, 10);
};
const names = v => (Array.isArray(v) ? v : v ? [v] : []).map(x => typeof x === 'string' ? x.trim() : String((x && (x.name || x.advocateName)) || '').trim()).filter(Boolean);
/* Turns a provider response into our own shape. Written against real eCourtsIndia answers (17 Nov 2026): a High Court record and a pending district-court record.
   Court cases arrive under data.courtCaseData, tribunal cases under data.tribunalCaseData (documented, not yet seen by us). There is no case title: it is built from the parties.
   Court-case fields that were seen: caseNumber (an internal number), registrationNumber ("12606/2023"), caseType, caseStatus, courtName, filingDate, registrationDate, nextHearingDate (pending cases),
   lastHearingDate, decisionDate, orderCount, hearingCount, petitioners/respondents (string arrays), petitionerAdvocates/respondentAdvocates, judgmentOrders and interimOrders ({orderDate, orderType|description, orderUrl}),
   historyOfCaseHearings ({businessOnDate, hearingDate, purposeOfListing, judge}: the business done on businessOnDate fixed hearingDate as the next date). Missing fields stay empty and the result is PARTIAL. */
const arr = v => Array.isArray(v) ? v : [];
const str = v => v == null || typeof v === 'object' ? '' : String(v).trim();
export function normalizeCase(raw) {
  const d = raw && raw.data ? raw.data : raw || {}, cc = d.courtCaseData || d.tribunalCaseData || d;
  const g = (...n) => { for (const k of n) { const v = cc && cc[k]; if (v != null && v !== '' && typeof v !== 'object') return String(v).trim(); } const v = find(cc, n); return v == null || typeof v === 'object' ? '' : String(v).trim(); };
  const hist = arr(cc && (cc.historyOfCaseHearings || cc.hearings || cc.hearingHistory)), ord = [...arr(cc && cc.judgmentOrders), ...arr(cc && cc.interimOrders), ...arr(cc && cc.orders)];
  const hearings = hist.map(h => ({ date: isoDate(h.businessOnDate || h.hearingDate || h.date || h.businessDate), purpose: str(h.purposeOfListing || h.purpose || h.purposeOfHearing || h.purposeName), judge: str(h.judge || h.judgeName) })).filter(h => h.date);
  const seen = new Set(), orders = ord.map(o => ({ date: isoDate(o.orderDate || o.date), type: str(o.orderType || o.description || o.type) || 'Order', file: str(o.orderUrl || o.fileName || o.file), url: str(o.url) }))
    .filter(o => o.date && !seen.has(o.date + '|' + o.file) && seen.add(o.date + '|' + o.file));
  const pet = names(cc && cc.petitioners), res = names(cc && cc.respondents), side = a => a.length ? a[0] + (a.length > 1 ? ' & ORS' : '') : '';
  const type = g('caseType', 'caseTypeName'), reg = g('registrationNumber'), num = reg ? (type && !/^\D/.test(reg) ? `${type} ${reg}` : reg) : g('caseNumber', 'caseNo');
  const n = {
    cnr: normalizeCnr(g('cnr', 'cnrNumber') || d.cnr), title: g('title', 'caseTitle', 'causeTitle') || (pet.length && res.length ? `${side(pet)} vs ${side(res)}` : side(pet) || side(res)), caseNumber: num, regNumber: reg,
    caseType: type, court: g('courtName', 'court'), status: g('caseStatus', 'status', 'statusNormalized'),
    filingDate: isoDate(g('filingDate', 'dateOfFiling')), registrationDate: isoDate(g('registrationDate', 'dateOfRegistration')), decisionDate: isoDate(g('decisionDate')),
    nextHearing: isoDate(g('nextHearingDate', 'nextDate', 'nextHearing')), lastHearing: isoDate(g('lastHearingDate', 'previousHearingDate')),
    petitioners: pet, respondents: res, petitionerAdvocates: names(cc && cc.petitionerAdvocates), respondentAdvocates: names(cc && cc.respondentAdvocates),
    orderCount: Number(cc && cc.orderCount) || 0, hearings, orders, lastOrder: orders.map(o => o.date).sort().pop() || ''
  };
  const need = ['title', 'court', 'status'], have = need.filter(k => n[k]);
  n.missing = need.filter(k => !n[k]); n.partial = have.length < need.length;
  n.empty = !n.title && !n.court && !n.status && !n.nextHearing && !n.caseNumber;
  return n;
}
/* The fetched record must belong to the case it is attached to. */
/* "WP(C) 138/2024", "138/2024" and "Case No. 138 of 2024" all reduce to 138/2024. */
export const caseKey = t => { t = String(t || ''); let m = /(\d+)\s*\/\s*(\d{4})\b/.exec(t) || /(\d+)\s+of\s+(\d{4})\b/i.exec(t); return m ? `${+m[1]}/${m[2]}` : ''; };
export function matchesIdentifiers(c, n) {
  const reasons = [];
  if (n.empty) return { ok: false, reasons: ['The provider returned no case data'] };
  if (c.cnr && n.cnr && normalizeCnr(c.cnr) !== normalizeCnr(n.cnr)) reasons.push('CNR does not match');
  if (c.case_number) { const a = caseKey(c.case_number), b = caseKey(n.regNumber || n.caseNumber); if (a && b && a !== b) reasons.push('Case number does not match'); }
  return { ok: !reasons.length, reasons };
}

/* ---------- change detection ---------- */
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const DONE = /dispos|decided|closed|dismiss|withdrawn|allowed|rejected|judg?ment/i;
export function diffSnapshots(prev, next) {
  const ev = [];
  if (!prev) return [{ kind: 'first_snapshot', title: 'First verified record stored', detail: {} }];
  if (prev.nextHearing !== next.nextHearing && next.nextHearing) ev.push({ kind: prev.nextHearing ? (next.nextHearing > prev.nextHearing ? 'hearing_adjourned' : 'hearing_changed') : 'hearing_set', title: prev.nextHearing ? `Next hearing moved from ${prev.nextHearing} to ${next.nextHearing}` : `Next hearing set for ${next.nextHearing}`, detail: { from: prev.nextHearing, to: next.nextHearing } });
  if ((prev.status || '') !== (next.status || '') && next.status) ev.push({ kind: DONE.test(next.status) && !DONE.test(prev.status || '') ? 'case_disposed' : 'status_changed', title: `Status changed from “${prev.status || 'unknown'}” to “${next.status}”`, detail: { from: prev.status, to: next.status } });
  const po = new Set((prev.orders || []).map(o => o.date + '|' + o.file)), fresh = (next.orders || []).filter(o => !po.has(o.date + '|' + o.file));
  fresh.forEach(o => ev.push({ kind: /judg/i.test(o.type) ? 'new_judgment' : 'new_order', title: `${/judg/i.test(o.type) ? 'New judgment' : 'New order'} dated ${o.date}`, detail: o }));
  if (prev.court && next.court && prev.court !== next.court) ev.push({ kind: 'case_transferred', title: `Court changed from ${prev.court} to ${next.court}`, detail: { from: prev.court, to: next.court } });
  if (!fresh.length && (next.orderCount || 0) > (prev.orderCount || 0)) ev.push({ kind: 'new_order', title: `${next.orderCount - prev.orderCount} new order(s) on the record`, detail: { from: prev.orderCount, to: next.orderCount } });
  if (!sameSet(prev.petitioners || [], next.petitioners || []) || !sameSet(prev.respondents || [], next.respondents || [])) ev.push({ kind: 'parties_changed', title: 'Parties changed', detail: {} });
  return ev;
}

/* ---------- budget ---------- */
/* Whether a paid call may go ahead. override is an unexpired explicit authorisation by an administrator. */
export function budgetDecision({ spentPaise, limitPaise, costPaise: c, stop, override }) {
  if (override) return { allow: true, overridden: spentPaise + c > limitPaise };
  if (!stop) return { allow: true };
  const left = limitPaise - spentPaise;
  return left >= c ? { allow: true, leftPaise: left - c } : { allow: false, leftPaise: Math.max(0, left), reason: 'The monthly court-data budget is used up. An administrator can raise it or authorise an override.' };
}

/* ---------- errors, retries, circuit breaker ---------- */
/* What a provider HTTP failure means. billable:false because eCourtsIndia documents that failed requests are not charged. */
export function classifyHttp(status, code) {
  code = String(code || '').toUpperCase();
  if (status === 401 || status === 403 || /INVALID_TOKEN|TOKEN_(INACTIVE|EXPIRED)|ACCOUNT_INACTIVE/.test(code)) return { kind: 'credentials', retry: false, open: true, message: 'The court-data provider rejected the API key. An administrator must replace it.' };
  if (status === 402 || /INSUFFICIENT_CREDITS|SUBSCRIPTION_REQUIRED/.test(code)) return { kind: 'credits', retry: false, open: true, message: 'The court-data provider account is out of credits.' };
  if (status === 404 || /CASE_NOT_FOUND|NOT_FOUND/.test(code)) return { kind: 'not_found', retry: false, manual: true, message: 'The provider has no record for this identifier. Verify it on the official portal.' };
  if (status === 400 || /INVALID_CNR|VALIDATION/.test(code)) return { kind: 'invalid', retry: false, manual: true, message: 'The provider rejected this identifier.' };
  if (status === 429 || /RATE_LIMIT/.test(code)) return { kind: 'rate_limit', retry: true, message: 'The provider is rate limiting requests.' };
  if (status >= 500 || status === 0 || status === 408 || status === 409) return { kind: 'server', retry: true, message: 'The court-data provider is not responding.' };
  return { kind: 'other', retry: false, message: 'The provider returned an unexpected answer (' + status + ').' };
}
export const backoffMs = (attempt, retryAfterSec) => retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 30000) : Math.min(500 * 2 ** attempt + Math.floor((attempt * 137) % 250), 8000);
/* Opens after `threshold` failures inside `windowMin`, stays open `coolMin`, then lets one probe through. */
export function circuitState(fails, openUntil, now) {
  now = now || Date.now();
  if (openUntil && Date.parse(openUntil) > now) return 'open';
  return openUntil ? 'half_open' : 'closed';
}
export const shouldOpenCircuit = (recentFailures, threshold) => recentFailures >= (threshold || 5);

/* Secrets never leave the server: strips anything that looks like a bearer token or key from text bound for logs or clients. */
export const scrub = s => String(s == null ? '' : s).replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [hidden]').replace(/\beci_(live|test)_[A-Za-z0-9]+/g, '[hidden]').replace(/(api[_-]?key|token|secret)=([^&\s]+)/gi, '$1=[hidden]');

/* ---------- official portals (free, manual verification) ---------- */
export const PORTALS = {
  district: [['eCourts Services: case status by CNR', 'https://services.ecourts.gov.in/ecourtindia_v6/']],
  high_court: [['High Court Services: case status by CNR', 'https://hcservices.ecourts.gov.in/hcservices/']],
  supreme: [['Supreme Court of India: case status', 'https://www.sci.gov.in/']],
  tribunal: {
    NCLT: [['NCLT', 'https://nclt.gov.in/']], NCLAT: [['NCLAT', 'https://nclat.nic.in/']], DRT: [['Debts Recovery Tribunals', 'https://drt.gov.in/']], DRAT: [['Debts Recovery Tribunals', 'https://drt.gov.in/']],
    ITAT: [['ITAT', 'https://itat.gov.in/']], CESTAT: [['CESTAT', 'https://cestat.gov.in/']], NGT: [['NGT', 'https://greentribunal.gov.in/']], CAT: [['CAT', 'https://cgat.gov.in/']],
    AFT: [['Armed Forces Tribunal', 'https://aftdelhi.nic.in/']], SAT: [['SAT', 'https://satweb.sat.gov.in/']], TDSAT: [['TDSAT', 'https://tdsat.gov.in/']], CONSUMER: [['e-Jagriti (consumer commissions)', 'https://e-jagriti.gov.in/']]
  }
};
/* Links to the official place to check a case by hand. Checked 17 Nov 2026 (HTTP 200 and the right site): eCourts district and High Court services, Supreme Court, NCLT, NCLAT, DRT, ITAT, CESTAT, NGT, CAT, TDSAT, SAT (satweb.sat.gov.in). e-Jagriti is the official consumer platform but blocked our checker. Not confirmed: AFT (timed out). Addresses change, so keep checking. */
export function portalLinks(info) {
  const t = PORTALS.tribunal;
  if (info.category === 'tribunal') return (info.tribunal && t[info.tribunal]) || Object.values(t).flat().filter((x, i, a) => a.findIndex(y => y[1] === x[1]) === i);
  return PORTALS[info.category] || [...PORTALS.district, ...PORTALS.high_court, ...PORTALS.supreme];
}

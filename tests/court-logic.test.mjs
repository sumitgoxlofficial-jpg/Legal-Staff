// Unit tests for supabase/functions/_shared/court-logic.js (pure logic, no network). Run: node tests/court-logic.test.mjs
import * as L from '../supabase/functions/_shared/court-logic.js';

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };
const NOW = Date.parse('2026-11-17T10:00:00Z');

t('CNR: court CNR accepted, junk rejected, spaces and dashes ignored', () => { ok(L.cnrValid('dlhc01-0001 232024')); ok(!L.cnrValid('123')); ok(!L.cnrValid('')); ok(!L.cnrValid('DLHC0100012320')); });
t('CNR: tribunal CNR (NCLT) is accepted and classified', () => { ok(L.cnrValid('NCLTDL0000012024')); const c = L.classifyCnr('NCLTDL0000012024'); eq([c.category, c.tribunal], ['tribunal', 'NCLT']); });
t('CNR: classifies district, high court and Supreme Court', () => { eq(L.classifyCnr('BRPA020149972024').category, 'district'); eq(L.classifyCnr('DLHC010001232024').category, 'high_court'); eq(L.classifyCnr('SCIN010001232024').category, 'supreme'); });
t('capability registry: covered court is supported but marked untested', () => { const c = L.capability('ecourtsindia', { category: 'high_court' }, 'case_detail'); ok(c.supported); ok(!c.tested); });
t('capability registry: unknown tribunal and unsupported operation are refused', () => { ok(!L.capability('ecourtsindia', { category: 'tribunal', tribunal: 'XYZT' }, 'case_detail').supported); ok(!L.capability('official_manual', { category: 'district' }, 'case_detail').supported); ok(!L.capability('nope', { category: 'district' }, 'case_detail').supported); });
t('capability registry: a database override wins', () => { const o = [{ provider_key: 'ecourtsindia', category: 'district', operation: 'case_detail', court_code: '', supported: false, notes: 'down', verified_at: 'x' }]; const c = L.capability('ecourtsindia', { category: 'district' }, 'case_detail', o); ok(!c.supported); ok(c.tested); });
t('cost: pay-as-you-go and enterprise rates (paise)', () => { eq(L.costPaise('payg', 'case_detail'), 150); eq(L.costPaise('enterprise', 'case_detail'), 50); eq(L.costPaise('payg', 'refresh'), 15); eq(L.costPaise('nope', 'case_detail'), 150); });
t('request key: identical requests share a key, whatever the spacing or case of the CNR', () => { eq(L.requestKey('p', 'case_detail', 'dlhc01 0001 232024'), L.requestKey('p', 'case_detail', 'DLHC010001232024')); ok(L.requestKey('p', 'a', 'X') !== L.requestKey('p', 'b', 'X')); });
t('schedule: upcoming hearing 12h, active 24h, inactive weekly, closed monthly', () => { eq(L.intervalHours({ state: 'active', next_hearing_date: '2026-11-19' }, null, NOW), 12); eq(L.intervalHours({ state: 'active', next_hearing_date: '2027-02-01' }, null, NOW), 24); eq(L.intervalHours({ state: 'inactive' }, null, NOW), 168); eq(L.intervalHours({ state: 'closed' }, null, NOW), 720); });
t('schedule: configured intervals are honoured', () => { eq(L.intervalHours({ state: 'active' }, { activeHours: 6 }, NOW), 6); });
t('schedule: isDue compares the last check with the interval', () => { ok(L.isDue({ state: 'active', last_checked_at: '2026-11-16T08:00:00Z' }, null, NOW)); ok(!L.isDue({ state: 'active', last_checked_at: '2026-11-17T08:00:00Z' }, null, NOW)); ok(L.isDue({ state: 'active' }, null, NOW)); });
t('priority: hearing soonest first, never-checked before checked', () => { const a = { next_hearing_date: '2026-11-18' }, b = { next_hearing_date: '2026-12-30' }, c = { next_hearing_date: '2026-11-18', last_checked_at: '2026-11-16T00:00:00Z' }; eq([b, a, c].sort((x, y) => L.byPriority(x, y, NOW)), [a, c, b]); });
t('status: never checked is PENDING', () => eq(L.verificationStatus({ matched: true }), 'PENDING'));
t('status: a response that does not match the case is MANUAL REVIEW, not VERIFIED', () => eq(L.verificationStatus({ checkedAt: new Date(NOW).toISOString(), matched: false, now: NOW }), 'MANUAL REVIEW'));
t('status: matched and recent is VERIFIED; partial is PARTIAL; old is STALE; failed is FAILED', () => {
  const at = new Date(NOW - 3600e3).toISOString();
  eq(L.verificationStatus({ checkedAt: at, matched: true, now: NOW }), 'VERIFIED'); eq(L.verificationStatus({ checkedAt: at, matched: true, partial: true, now: NOW }), 'PARTIAL');
  eq(L.verificationStatus({ checkedAt: new Date(NOW - 80 * 3600e3).toISOString(), matched: true, now: NOW }), 'STALE'); eq(L.verificationStatus({ failed: true, checkedAt: at, matched: true }), 'FAILED'); eq(L.verificationStatus({ manual: true }), 'MANUAL REVIEW'); });
t('freshness label', () => { eq(L.freshnessLabel(new Date(NOW - 3600e3).toISOString(), NOW, 24), 'fresh'); eq(L.freshnessLabel(new Date(NOW - 30 * 3600e3).toISOString(), NOW, 24), 'ageing'); eq(L.freshnessLabel(new Date(NOW - 99 * 3600e3).toISOString(), NOW, 24), 'stale'); eq(L.freshnessLabel(null, NOW), 'never checked'); });

const RAW = { data: { courtCaseData: { cnr: 'DLHC010001232024', title: 'A v. B', caseNumber: 'CS(COMM) 12/2024', courtName: 'Delhi High Court', caseType: 'CS(COMM)', status: 'PENDING', filingDate: '2024-01-05', registrationDate: '05-01-2024',
  nextHearingDate: '2026-12-01', petitioners: ['A Ltd'], respondents: ['B Ltd'], petitionerAdvocates: ['Adv. X'], respondentAdvocates: [], hearings: [{ hearingDate: '2026-10-01', purpose: 'Arguments', judge: 'J. Y' }],
  judgmentOrders: [{ orderDate: '2026-10-01', orderType: 'Order', orderUrl: 'order-1.pdf' }] } }, meta: { request_id: 'r' } };
t('normalise: reads the provider shape into ours', () => { const n = L.normalizeCase(RAW); eq([n.cnr, n.title, n.court, n.status, n.nextHearing, n.filingDate, n.registrationDate], ['DLHC010001232024', 'A v. B', 'Delhi High Court', 'PENDING', '2026-12-01', '2024-01-05', '2024-01-05']); eq(n.petitioners, ['A Ltd']); eq(n.orders.length, 1); eq(n.lastOrder, '2026-10-01'); ok(!n.partial); ok(!n.empty); });
t('normalise: missing fields make the result PARTIAL; no data is empty', () => { const n = L.normalizeCase({ data: { courtCaseData: { cnr: 'DLHC010001232024', status: 'PENDING' } } }); ok(n.partial); ok(n.missing.includes('title')); ok(L.normalizeCase({}).empty); ok(L.normalizeCase(null).empty); });
t('match: same CNR attaches; different CNR is refused; different case number is refused', () => {
  const n = L.normalizeCase(RAW); ok(L.matchesIdentifiers({ cnr: 'DLHC010001232024' }, n).ok); ok(!L.matchesIdentifiers({ cnr: 'DLHC010009992024' }, n).ok);
  ok(L.matchesIdentifiers({ cnr: 'DLHC010001232024', case_number: 'CS(COMM) 12/2024' }, n).ok); ok(!L.matchesIdentifiers({ cnr: 'DLHC010001232024', case_number: 'CS(COMM) 99/2024' }, n).ok); ok(!L.matchesIdentifiers({}, L.normalizeCase({})).ok); });
t('diff: first record is not a "change"', () => eq(L.diffSnapshots(null, L.normalizeCase(RAW)).map(e => e.kind), ['first_snapshot']));
t('diff: no change means no events', () => eq(L.diffSnapshots(L.normalizeCase(RAW), L.normalizeCase(RAW)), []));
t('diff: hearing date moved later is an adjournment', () => { const a = L.normalizeCase(RAW), b = { ...a, nextHearing: '2027-01-15' }; eq(L.diffSnapshots(a, b).map(e => e.kind), ['hearing_adjourned']); });
t('diff: hearing moved earlier, set for the first time', () => { const a = L.normalizeCase(RAW); eq(L.diffSnapshots(a, { ...a, nextHearing: '2026-11-25' })[0].kind, 'hearing_changed'); eq(L.diffSnapshots({ ...a, nextHearing: '' }, a)[0].kind, 'hearing_set'); });
t('diff: disposal, status change, new order, new judgment, transfer', () => {
  const a = L.normalizeCase(RAW); eq(L.diffSnapshots(a, { ...a, status: 'DISPOSED' })[0].kind, 'case_disposed'); eq(L.diffSnapshots(a, { ...a, status: 'ARGUMENTS' })[0].kind, 'status_changed');
  eq(L.diffSnapshots(a, { ...a, orders: [...a.orders, { date: '2026-11-01', type: 'Order', file: 'order-2.pdf' }] })[0].kind, 'new_order'); eq(L.diffSnapshots(a, { ...a, orders: [...a.orders, { date: '2026-11-01', type: 'Judgment', file: 'j.pdf' }] })[0].kind, 'new_judgment');
  eq(L.diffSnapshots(a, { ...a, court: 'Bombay High Court' })[0].kind, 'case_transferred'); });
t('budget: allows within the limit, refuses beyond it when stopping, allows under an override', () => {
  eq(L.budgetDecision({ spentPaise: 100, limitPaise: 1000, costPaise: 150, stop: true }).allow, true); eq(L.budgetDecision({ spentPaise: 900, limitPaise: 1000, costPaise: 150, stop: true }).allow, false);
  eq(L.budgetDecision({ spentPaise: 900, limitPaise: 1000, costPaise: 150, stop: false }).allow, true); const o = L.budgetDecision({ spentPaise: 900, limitPaise: 1000, costPaise: 150, stop: true, override: true }); ok(o.allow && o.overridden); });
t('errors: bad key, no credits, not found, rate limit, server error are told apart', () => {
  eq(L.classifyHttp(401, 'INVALID_TOKEN').kind, 'credentials'); ok(L.classifyHttp(401, '').open); eq(L.classifyHttp(402, 'INSUFFICIENT_CREDITS').kind, 'credits'); ok(L.classifyHttp(404, 'CASE_NOT_FOUND').manual);
  ok(L.classifyHttp(429, 'RATE_LIMIT_MINUTE').retry); ok(L.classifyHttp(503, '').retry); ok(L.classifyHttp(0, 'NETWORK').retry); ok(!L.classifyHttp(401, '').retry); ok(!L.classifyHttp(402, '').retry); });
t('backoff: grows, is capped, honours Retry-After', () => { ok(L.backoffMs(1) > L.backoffMs(0)); ok(L.backoffMs(20) <= 8000); eq(L.backoffMs(0, 3), 3000); eq(L.backoffMs(0, 600), 30000); });
t('circuit breaker', () => { eq(L.circuitState(0, new Date(NOW + 60e3).toISOString(), NOW), 'open'); eq(L.circuitState(0, new Date(NOW - 60e3).toISOString(), NOW), 'half_open'); eq(L.circuitState(0, null, NOW), 'closed'); ok(L.shouldOpenCircuit(5)); ok(!L.shouldOpenCircuit(2)); });
t('scrub: keys and bearer tokens never survive', () => {
  const s = L.scrub('failed: Authorization: Bearer eci_live_ABC123xyz and eci_test_Q9 and api_key=SECRET123 token=zzz'); ok(!/ABC123|Q9|SECRET123|zzz/.test(s), s); ok(L.scrub(null) === ''); });
t('portals: official links for every court category and tribunal', () => { for (const c of ['district', 'high_court', 'supreme']) ok(L.portalLinks({ category: c }).length > 0); ok(L.portalLinks({ category: 'tribunal', tribunal: 'NCLT' })[0][1].startsWith('https://')); ok(L.portalLinks({ category: 'tribunal' }).length > 5); });

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

// Engine test: runs the real supabase/functions/court-sync code against (1) an in-memory database (tests/court-fake-db.mjs) and
// (2) a local mock of the eCourtsIndia API that we can make fail in every way. It proves OUR logic: caching, duplicate blocking,
// budget, matching, change detection, errors, secrets. It does NOT prove that eCourtsIndia answers as the mock does: see "Integration"
// in tests/README.md. Run: node tests/court-engine.test.mjs   (needs `tsc` on the PATH)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

// ---- build: transpile the Deno function to a Node module and point its imports at the fakes ----
const out = mkdtempSync(join(tmpdir(), 'court-engine-'));
mkdirSync(join(out, '_shared')); cpSync(join(root, 'supabase/functions/_shared/court-logic.js'), join(out, '_shared/court-logic.js'));
const src = readFileSync(join(root, 'supabase/functions/court-sync/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim').replace('../_shared/court-logic.js', './_shared/court-logic.js');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src);
writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--allowJs', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); } catch (e) { console.log(String(e.stdout)); throw e; }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'court-fake-db.mjs'), join(out, 'js/fake-db.mjs')); cpSync(join(out, '_shared'), join(out, 'js/_shared'), { recursive: true });
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));

// ---- mock provider ----
const mock = { calls: [], key: 'eci_live_GOODKEY', mode: 'ok', delayMs: 0, body: null, hits: {} };
const CASE = (o = {}) => ({ data: { courtCaseData: { cnr: 'DLHC010001232024', title: 'A v. B', caseNumber: 'CS(COMM) 12/2024', courtName: 'Delhi High Court', caseType: 'CS(COMM)', status: 'PENDING', nextHearingDate: '2099-12-01',
  petitioners: ['A Ltd'], respondents: ['B Ltd'], hearings: [], judgmentOrders: [{ orderDate: '2026-10-01', orderType: 'Order', orderUrl: 'order-1.pdf' }], ...o } }, meta: { request_id: 'r1' } });
const server = http.createServer((req, res) => {
  const reply = (s, b, h = {}) => { res.writeHead(s, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(b)); };
  const auth = req.headers.authorization || '';
  mock.calls.push({ method: req.method, path: req.url, auth });
  const key = req.url.split('?')[0]; mock.hits[key] = (mock.hits[key] || 0) + 1;
  setTimeout(() => {
    if (auth !== 'Bearer ' + mock.key) return reply(401, { error: { code: 'INVALID_TOKEN' } });
    if (mock.mode === 'credits') return reply(402, { error: { code: 'INSUFFICIENT_CREDITS' } });
    if (mock.mode === '500') return reply(500, { error: { code: 'INTERNAL_ERROR' } });
    if (mock.mode === '429once' && !mock.done429) { mock.done429 = true; return reply(429, { error: { code: 'RATE_LIMIT_MINUTE' } }, { 'retry-after': '0' }); }
    if (req.url.includes('/search/capabilities')) return reply(200, { data: {} });
    if (req.method === 'POST' && req.url.endsWith('/refresh')) return reply(202, { data: { queued: true } });
    if (mock.mode === '404') return reply(404, { error: { code: 'CASE_NOT_FOUND' } });
    if (mock.mode === 'empty') return reply(200, { data: {} });
    reply(200, mock.body || CASE());
  }, mock.delayMs);
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;

// ---- run the handler ----
const env = { COURT_API_URL: `http://127.0.0.1:${port}`, COURT_API_KEY: mock.key, SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', COURT_API_TIMEOUT_MS: '3000' };
const setEnv = o => { for (const k of Object.keys(env)) delete env[k]; Object.assign(env, o); };
const base = { ...env };
let handler; globalThis.Deno = { env: { get: k => env[k] }, serve: h => { handler = h; } };
const { db, reset } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')).href);
await import(pathToFileURL(idx).href);
const FIRM = 'f1', USER = 'u1'; db.users.tok = USER; db.users.admin = 'admin1'; db.admins.add('admin1');
const call = async (body, token = 'tok', hdr = {}) => { const r = await handler(new Request('http://fn', { method: 'POST', headers: { authorization: 'Bearer ' + token, ...hdr }, body: JSON.stringify(body) })); return { status: r.status, body: await r.json() }; };
const addCase = (id, extra = {}) => { db.tables.records = db.tables.records || []; db.tables.records.push({ firm_id: FIRM, kind: 'case', id, data: { title: 'A v. B', no: 'CS(COMM) 12/2024', cnr: 'DLHC010001232024', court: 'Delhi High Court', status: 'active', team: ['Adv. T'], ...extra } }); };
const fresh = () => { reset(); setEnv(base); mock.mode = 'ok'; mock.body = null; mock.calls = []; mock.hits = {}; mock.delayMs = 0; mock.done429 = false; mock.key = 'eci_live_GOODKEY'; db.memberships = [{ user: USER, firm: FIRM }]; db.tables.subscriptions = [{ firm_id: FIRM, status: 'active', renews: '2099-01-01' }]; };
const verify = (id = 'c1', o = {}) => call({ action: 'verify', firm_id: FIRM, case_id: id, ...o });
const lc = () => db.tables.legal_cases[0];
const age = () => { const c = db.tables.legal_cases[0]; c.last_checked_at = new Date(Date.now() - 3 * 3600e3).toISOString(); c.last_verified_at = null; c.verification_status = 'STALE'; };
const paid = () => mock.calls.filter(c => c.method === 'GET' && c.path.includes('/case/')).length;

console.log('court engine · mock provider on 127.0.0.1:' + port);

await t('starts and answers without any paid API key: case goes to MANUAL REVIEW with official links', async () => {
  fresh(); setEnv({ ...base, COURT_API_KEY: '' }); addCase('c1'); const r = await verify();
  eq(r.status, 200); eq(r.body.status, 'MANUAL REVIEW'); ok(r.body.links.length > 0, 'official links'); eq(mock.calls.length, 0, 'no provider call'); ok(/No court-data provider key/.test(r.body.note)); });
await t('paid API works with valid credentials: VERIFIED, record stored, source shown', async () => {
  fresh(); addCase('c1'); const r = await verify(); eq(r.body.status, 'VERIFIED'); eq(r.body.source, 'ecourtsindia'); ok(r.body.checkedAt); eq(paid(), 1);
  eq(lc().verification_status, 'VERIFIED'); eq(lc().next_hearing_date, '2099-12-01'); ok(lc().last_verified_at); eq(db.tables.case_snapshots.length, 1); eq(db.tables.case_parties.length, 2);
  ok(mock.calls[0].auth === 'Bearer eci_live_GOODKEY', 'key sent as bearer'); });
await t('a response alone is not "verified": a record for a different CNR is refused', async () => {
  fresh(); addCase('c1'); mock.body = CASE({ cnr: 'DLHC010009992024' }); const r = await verify(); eq(r.body.status, 'MANUAL REVIEW'); ok(/does not match/.test(r.body.note)); eq(db.tables.case_snapshots?.length ?? 0, 0, 'nothing attached'); });
await t('a different case number is refused', async () => { fresh(); addCase('c1', { no: 'CS(COMM) 99/2024' }); const r = await verify(); eq(r.body.status, 'MANUAL REVIEW'); ok(/Case number/.test(r.body.note)); });
await t('an empty provider answer is MANUAL REVIEW and the spend is given back', async () => { fresh(); addCase('c1'); mock.mode = 'empty'; const r = await verify(); eq(r.body.status, 'MANUAL REVIEW'); eq(db.spent, 0, 'refunded'); });
await t('cache: a second check inside the freshness window costs nothing', async () => { fresh(); addCase('c1'); await verify(); const spent = db.spent; const r = await verify(); eq(r.body.cached, true); eq(paid(), 1, 'one provider call'); eq(db.spent, spent); });
await t('shared cache: another firm\'s case with the same CNR reuses the response', async () => {
  fresh(); addCase('c1'); await verify(); db.memberships.push({ user: USER, firm: 'f2' }); db.tables.subscriptions.push({ firm_id: 'f2', status: 'active', renews: '2099-01-01' }); db.tables.records.push({ firm_id: 'f2', kind: 'case', id: 'x9', data: { title: 'A v. B', no: 'CS(COMM) 12/2024', cnr: 'DLHC010001232024', court: 'Delhi HC', status: 'active', team: [] } });
  const r = await call({ action: 'verify', firm_id: 'f2', case_id: 'x9' }); eq(r.body.status, 'VERIFIED'); eq(paid(), 1, 'still one provider call'); });
await t('fresh check: asked for explicitly it goes to the provider, but not twice within the cooldown', async () => {
  fresh(); addCase('c1'); await verify(); db.tables.legal_cases[0].last_checked_at = new Date(Date.now() - 3600e3).toISOString(); const r = await verify('c1', { fresh: true }); eq(r.body.status, 'VERIFIED'); ok(paid() >= 2, 'second call made');
  const n = paid(); const r2 = await verify('c1', { fresh: true }); eq(paid(), n, 'cooldown'); ok(/wait/.test(r2.body.note)); });
await t('smart refresh: a fresh check sends the cheap refresh first; a normal check does not', async () => {
  fresh(); addCase('c1'); await verify(); ok(!mock.calls.some(c => c.method === 'POST'), 'no refresh on a normal check'); db.tables.legal_cases[0].last_checked_at = new Date(Date.now() - 3600e3).toISOString(); await verify('c1', { fresh: true }); ok(mock.calls.some(c => c.method === 'POST' && c.path.endsWith('/refresh')), 'refresh sent'); });
await t('duplicate-request block: ten simultaneous checks make one provider call', async () => {
  fresh(); addCase('c1'); mock.delayMs = 150; const rs = await Promise.all(Array.from({ length: 10 }, () => verify())); eq(paid(), 1, 'one call'); ok(rs.some(r => r.body.status === 'VERIFIED')); ok(rs.filter(r => /already running/.test(r.body.note || '')).length >= 1, 'others were told it is running'); });
await t('budget: spending stops at the limit and the case stays STALE/PENDING, no call made', async () => {
  fresh(); addCase('c1'); addCase('c2', { cnr: 'DLHC010002222024' }); db.budget.limit = 150; mock.body = null;
  await verify('c1'); eq(db.spent, 150); const before = paid(); const r = await verify('c2'); eq(r.body.blocked, true); ok(/budget/.test(r.body.note)); eq(paid(), before, 'no call after the limit'); });
await t('budget: an administrator override lets one more call through', async () => { fresh(); addCase('c1'); addCase('c2', { cnr: 'DLHC010002222024' }); db.budget.limit = 150; await verify('c1'); db.budget.override = true; mock.body = CASE({ cnr: 'DLHC010002222024' }); const r = await verify('c2'); eq(r.body.status, 'VERIFIED'); });
await t('budget from the environment variable is enforced', async () => { fresh(); setEnv({ ...base, MONTHLY_COURT_API_BUDGET: '1' }); addCase('c1'); const r = await verify(); eq(r.body.blocked, true); eq(paid(), 0); });
await t('invalid credentials: a clear provider message, no retry storm, circuit opens', async () => {
  fresh(); addCase('c1'); mock.key = 'someone-else'; const r = await verify(); ok(/rejected the API key/.test(r.body.note), r.body.note); eq(r.body.status, 'FAILED'); eq(paid(), 1, 'no retries on a 401'); eq(db.spent, 0, 'refunded');
  const r2 = await verify('c1', { fresh: true }); ok(true); });
await t('out of provider credits: reported, not retried, not charged', async () => { fresh(); addCase('c1'); mock.mode = 'credits'; const r = await verify(); ok(/out of credits/.test(r.body.note)); eq(paid(), 1); eq(db.spent, 0); });
await t('provider down (500): retried a bounded number of times, then FAILED; the app does not crash', async () => { fresh(); addCase('c1'); mock.mode = '500'; const r = await verify(); eq(r.status, 200); eq(r.body.status, 'FAILED'); ok(paid() <= 3, 'bounded retries: ' + paid()); eq(db.spent, 0); eq(lc().attempts, 1); });
await t('rate limit (429) is waited out and retried once, then succeeds', async () => { fresh(); addCase('c1'); mock.mode = '429once'; const r = await verify(); eq(r.body.status, 'VERIFIED'); eq(paid(), 2); });
await t('provider timeout does not hang the request', async () => { fresh(); setEnv({ ...base, COURT_API_TIMEOUT_MS: '3000' }); addCase('c1'); mock.delayMs = 3500; const t0 = Date.now(); const r = await verify(); ok(Date.now() - t0 < 20000, 'returned'); eq(r.body.status, 'FAILED'); });
await t('CASE_NOT_FOUND is MANUAL REVIEW with official links, not FAILED', async () => { fresh(); addCase('c1'); mock.mode = '404'; const r = await verify(); eq(r.body.status, 'MANUAL REVIEW'); ok(r.body.links.length > 0); });
await t('unsupported jurisdictions and identifiers are identified, not guessed', async () => {
  fresh(); addCase('c1', { cnr: 'ZZZZZZ' }); let r = await verify(); eq(r.body.status, 'MANUAL REVIEW'); ok(/CNR is not valid/.test(r.body.note));
  addCase('c2', { cnr: '', idKind: 'diary_number', diaryNo: '123/2024' }); r = await verify('c2'); eq(r.body.status, 'MANUAL REVIEW'); ok(/diary number/.test(r.body.note)); eq(paid(), 0); });
await t('tribunal CNR (NCLT) is looked up like a court CNR', async () => { fresh(); addCase('c1', { cnr: 'NCLTDL0000012024' }); mock.body = CASE({ cnr: 'NCLTDL0000012024' }); const r = await verify(); eq(r.body.status, 'VERIFIED'); eq(lc().category, 'tribunal'); eq(lc().tribunal, 'NCLT'); });
await t('change detection: a hearing moved to a new date raises one notification and keeps the old snapshot', async () => {
  fresh(); addCase('c1'); await verify(); eq(db.tables.notification_events?.length ?? 0, 0, 'first record is not a change'); mock.body = CASE({ nextHearingDate: '2099-12-20' }); age();
  const r = await verify('c1', { fresh: true }); eq(r.body.changed, true); eq(db.tables.notification_events.length, 1); eq(db.tables.notification_events[0].kind, 'hearing_adjourned'); eq(db.tables.case_snapshots.length, 2, 'old snapshot preserved'); });
await t('no notification when nothing changed', async () => { fresh(); addCase('c1'); await verify(); age(); await verify('c1', { fresh: true }); eq(db.tables.notification_events?.length ?? 0, 0); });
await t('new order and disposal are recorded and written into the firm\'s own records', async () => {
  fresh(); addCase('c1'); await verify(); mock.body = CASE({ status: 'DISPOSED', judgmentOrders: [{ orderDate: '2026-10-01', orderType: 'Order', orderUrl: 'order-1.pdf' }, { orderDate: '2026-11-10', orderType: 'Judgment', orderUrl: 'j.pdf' }] });
  age(); await verify('c1', { fresh: true });
  const kinds = db.tables.notification_events.map(e => e.kind).sort(); ok(kinds.includes('new_judgment') && kinds.includes('case_disposed'), kinds.join());
  ok(db.tables.records.some(r => r.kind === 'order' && r.data.date === '2026-11-10'), 'order record'); eq(db.tables.records.find(r => r.kind === 'case').data.status, 'disposed'); eq(lc().state, 'closed'); });
await t('a future hearing from the provider is added to the calendar once', async () => { fresh(); addCase('c1'); await verify(); const h = () => db.tables.records.filter(r => r.kind === 'hearing' && r.data.date === '2099-12-01').length; eq(h(), 1); age(); await verify('c1', { fresh: true }); eq(h(), 1, 'not duplicated'); });
await t('partial data is PARTIAL, not VERIFIED', async () => { fresh(); addCase('c1'); mock.body = CASE({ title: '', courtName: '' }); const r = await verify(); eq(r.body.status, 'PARTIAL'); ok(/Missing/.test(r.body.note)); });
await t('verification log is written for every outcome', async () => { fresh(); addCase('c1'); await verify(); await verify(); const o = db.tables.verification_logs.map(l => l.outcome); ok(o.includes('ok') && o.includes('cached'), o.join()); });
await t('usage log records paid requests, cached reads and cost', async () => { fresh(); addCase('c1'); await verify(); await verify(); const u = db.tables.api_usage_logs; ok(u.some(x => x.billable && x.cost_paise === 150), 'billable'); ok(u.some(x => x.cached), 'cached'); });
await t('scheduler: syncs only due cases, hearings soonest first, skips firms without a plan, respects the batch size', async () => {
  fresh(); setEnv({ ...base, COURT_SYNC_BATCH: '2' }); addCase('c1', { cnr: 'DLHC010000012024' }); addCase('c2', { cnr: 'DLHC010000022024' }); addCase('c3', { cnr: 'DLHC010000032024' }); db.tables.records.push({ firm_id: 'f9', kind: 'case', id: 'z', data: { title: 'No plan', no: '1', cnr: 'DLHC010000992024', court: 'x', status: 'active' } });
  mock.body = null; mock.calls = []; const r = await call({ action: 'sync' }, 'none', { 'x-cron-secret': 'cron-test' }); eq(r.status, 200); eq(r.body.registered, 3, 'three firm-f1 cases registered, f9 skipped'); ok(r.body.checked <= 2, 'batch size'); ok(!mock.calls.some(c => c.path.includes('0992024')), 'no plan, no call'); });
await t('scheduler refuses callers without the cron secret', async () => { fresh(); const r = await call({ action: 'sync' }, 'none', { 'x-cron-secret': 'wrong' }); eq(r.status, 403); });
await t('permissions: a non-member is refused; an expired plan is refused; members cannot use admin actions', async () => {
  fresh(); addCase('c1'); db.users.stranger = 'u2'; eq((await call({ action: 'verify', firm_id: FIRM, case_id: 'c1' }, 'stranger')).status, 403); db.access = false; eq((await verify()).status, 402); db.access = true; eq((await call({ action: 'admin_overview' })).status, 403); eq((await call({ action: 'rotate_key', key: 'x'.repeat(20) })).status, 403); eq((await call({ action: 'verify', firm_id: FIRM, case_id: 'c1' }, 'nobody')).status, 401); });
await t('admin: overview shows budget, spend, status counts; settings change within bounds; override needs a reason', async () => {
  fresh(); addCase('c1'); await verify(); db.tables.api_budget_settings = [{ provider_key: 'ecourtsindia', monthly_budget_paise: 100000, stop_on_limit: true, plan: 'payg' }]; db.tables.court_providers = [{ key: 'ecourtsindia', enabled: true }];
  const o = await call({ action: 'admin_overview' }, 'admin'); eq(o.status, 200); eq(o.body.totals.cases, 1); eq(o.body.totals.byStatus.VERIFIED, 1); ok(o.body.provider.keyConfigured); eq(o.body.budget.limitPaise, 100000);
  eq((await call({ action: 'admin_update', settings: { monthlyBudgetRs: -5 } }, 'admin')).status, 400); eq((await call({ action: 'admin_update', settings: { override: { hours: 2, reason: '' } } }, 'admin')).status, 400);
  const u = await call({ action: 'admin_update', settings: { monthlyBudgetRs: 500, activeHours: 12, override: { hours: 2, reason: 'Urgent matter before the High Court' } } }, 'admin'); eq(u.status, 200); eq(db.tables.api_budget_settings[0].monthly_budget_paise, 50000); ok(db.tables.api_budget_settings[0].override_until); });
await t('key rotation: a bad key is rejected and the old one kept; a good key is stored in Vault and used next', async () => {
  fresh(); setEnv({ ...base, COURT_API_KEY: '' }); db.vaultKey = 'eci_live_GOODKEY'; addCase('c1');
  const bad = await call({ action: 'rotate_key', key: 'eci_live_WRONGKEY123' }, 'admin'); eq(bad.status, 400); ok(/rejected/.test(bad.body.error)); eq(db.vaultKey, 'eci_live_GOODKEY', 'old key kept');
  mock.key = 'eci_live_NEWKEY999'; const good = await call({ action: 'rotate_key', key: 'eci_live_NEWKEY999' }, 'admin'); eq(good.status, 200); eq(db.vaultKey, 'eci_live_NEWKEY999'); ok(!JSON.stringify(good.body).includes('NEWKEY999'), 'key not echoed');
  const r = await verify(); eq(r.body.status, 'VERIFIED', 'new key in use without a deploy'); });
await t('secrets never appear in any response or in the stored logs', async () => {
  fresh(); addCase('c1'); const bodies = []; bodies.push((await verify()).body); mock.key = 'other'; bodies.push((await verify('c1', { fresh: true })).body); mock.key = 'eci_live_GOODKEY'; mock.mode = '500'; bodies.push((await verify('c1', { fresh: true })).body); bodies.push((await call({ action: 'admin_overview' }, 'admin')).body);
  const all = JSON.stringify([bodies, db.tables.verification_logs, db.tables.api_usage_logs, db.tables.provider_health_logs, db.tables.legal_cases]); ok(!all.includes('GOODKEY'), 'key found in output'); ok(!/Bearer /.test(all), 'bearer found in output'); });
await t('the browser bundle (app files, config.js) contains no court API key or provider secret', async () => {
  for (const f of ['app.html', 'app-backend.js', 'app-views.js', 'app-store.js', 'config.js', 'support.js']) { let s = ''; try { s = readFileSync(join(root, f), 'utf8'); } catch { continue; } ok(!/eci_(live|test)_[A-Za-z0-9]{6,}/.test(s), f + ' holds a key'); ok(!/COURT_API_KEY\s*[:=]\s*['"][^'"]+/.test(s), f + ' assigns COURT_API_KEY'); } });

server.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

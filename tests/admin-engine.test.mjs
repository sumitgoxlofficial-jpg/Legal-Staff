// Engine test: the real supabase/functions/admin code against an in-memory database and a mock Razorpay refund API.
// Proves: who may call (no token, normal user, unconfirmed email), that every change is written to the audit log, refunds (full amount,
// only paid Razorpay payments, applied through apply_refund, Razorpay refusal changes nothing), free-coupon scoping, errors not reported as success.
// Needs `tsc` on the PATH.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };
const out = mkdtempSync(join(tmpdir(), 'admin-engine-'));
const src = readFileSync(join(root, 'supabase/functions/admin/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src); writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); }
catch (e) { const m = String(e.stdout || e.stderr || e); if (/error TS/.test(m)) { console.log(m); process.exit(1); } }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'razorpay-fake-db.mjs'), join(out, 'js/fake-db.mjs'));
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));
const env = { SUPABASE_URL: 'http://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', RAZORPAY_KEY_ID: 'rzp_test_abc', RAZORPAY_KEY_SECRET: 'secret0123456789' };
let handler; globalThis.Deno = { env: { get: k => env[k] }, serve: h => { handler = h; } };
const rz = { refunds: [], mode: 'ok' }; const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => { url = String(url); const m = url.match(/payments\/(pay_[^/]+)\/refund$/);
  if (m) { rz.refunds.push({ payment: m[1], body: JSON.parse(init.body), auth: init.headers.Authorization }); return rz.mode === 'ok' ? new Response(JSON.stringify({ id: 'rfnd_' + rz.refunds.length, payment_id: m[1], status: 'processed' }), { status: 200 }) : new Response(JSON.stringify({ error: { description: 'The payment has been fully refunded already' } }), { status: 400 }); }
  return realFetch(url, init); };
await import(pathToFileURL(idx).href);
const { db, reset } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')).href);
const call = (token, body) => handler(new Request('http://fn.test', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) })).then(async r => ({ s: r.status, ...(await r.json()) }));
const fresh = () => { reset(); rz.refunds = []; rz.mode = 'ok'; db.users = { admin: { id: 'a1', email: 'Owner@LegalStaff.test', email_confirmed_at: '2026-01-01' }, unconfirmed: { id: 'a2', email: 'owner@legalstaff.test', email_confirmed_at: null }, user: { id: 'u1', email: 'someone@x.in', email_confirmed_at: '2026-01-01' } };
  db.tables.super_admins = [{ email: 'owner@legalstaff.test' }]; db.tables.firms = [{ id: 'f1', name: 'Firm One' }]; db.tables.subscriptions = [{ firm_id: 'f1', plan: 'Solo', cycle: 'monthly', status: 'active', since: '2026-11-01', renews: '2026-12-01' }]; };

console.log('who may call');
await t('no sign-in: 401', async () => { fresh(); eq((await call(null, { action: 'settings' })).s, 401); });
await t('a signed-in normal user: 403, for read and write actions alike', async () => { fresh(); for (const a of ['settings', 'payments', 'audit_log', 'refund', 'firm_update', 'coupon_save', 'directory_decide']) eq((await call('user', { action: a })).s, 403, a); });
await t('a super admin whose email is not confirmed: 403', async () => { fresh(); eq((await call('unconfirmed', { action: 'settings' })).s, 403); });
await t('a confirmed super admin (email case-insensitive) is let in', async () => { fresh(); db.tables.pay_settings = [{ id: 1, alert_email: 'a@b.in' }]; ok((await call('admin', { action: 'audit_log' })).s === 200); });

console.log('audit trail and error handling');
await t('changing a plan is audited with who, before and after', async () => { fresh(); const r = await call('admin', { action: 'firm_update', firm_id: 'f1', plan: 'Professional', cycle: 'annual', renews: '2027-12-01' }); eq(r.s, 200);
  const l = db.tables.admin_audit_log.at(-1); eq(l.action, 'plan.set'); eq(l.actor, 'owner@legalstaff.test'); eq(l.target, 'f1'); eq(l.detail.before.plan, 'Solo'); eq(l.detail.after.plan, 'Professional'); eq(db.tables.subscriptions[0].plan, 'Professional'); });
await t('a plan change for a firm that does not exist is refused (404) and writes nothing', async () => { fresh(); const r = await call('admin', { action: 'firm_update', firm_id: 'nope', plan: 'Solo', cycle: 'monthly', renews: '2027-01-01' }); eq(r.s, 404); eq(db.tables.subscriptions.length, 1); });
await t('a database failure is reported as an error, not as success', async () => { fresh(); db.failWrites = ['subscriptions']; const r = await call('admin', { action: 'firm_update', firm_id: 'f1', plan: 'Solo', cycle: 'monthly', renews: '2027-01-01' }); db.failWrites = null; eq(r.s, 500); ok(/Nothing was changed/.test(r.error)); });
await t('ending a plan, saving settings, expenses and support status are all audited', async () => { fresh(); db.tables.pay_settings = [{ id: 1 }]; db.tables.contact_requests = [{ id: 7, email: 'x@y.in' }];
  await call('admin', { action: 'firm_update', firm_id: 'f1', end: true }); await call('admin', { action: 'settings_save', settings: { alert_email: 'ops@legalstaff.in' } }); await call('admin', { action: 'expense_add', label: 'Hosting', amount: 100, spent_on: '2026-11-01' }); await call('admin', { action: 'support_status', id: 7, status: 'closed' });
  eq(db.tables.admin_audit_log.map(x => x.action), ['plan.end', 'settings.save', 'expense.add', 'support.status']); });
await t('a coupon that makes things free must name its plans', async () => { fresh(); const r = await call('admin', { action: 'coupon_save', coupon: { code: 'FREEALL', kind: 'percent', value: 100 } }); eq(r.s, 400); eq((db.tables.promo_codes || []).length, 0);
  const r2 = await call('admin', { action: 'coupon_save', coupon: { code: 'FREEDIR', kind: 'percent', value: 100, plans: ['Directory'] } }); eq(r2.s, 200); eq(db.tables.promo_codes[0].plans, ['Directory']); });

console.log('refunds');
const paidPlan = (o = {}) => { db.tables.payments = [{ id: 'p1', firm_id: 'f1', status: 'paid', amount_paise: 29900, gateway_payment_id: 'pay_AAA', utr: 'pay_AAA', method: 'razorpay', ...o }]; };
await t('refunds the FULL amount of a paid Razorpay payment, applies it through apply_refund and audits it', async () => { fresh(); paidPlan(); const r = await call('admin', { action: 'refund', kind: 'plan', id: 'p1', reason: 'duplicate' }); eq(r.s, 200);
  eq(rz.refunds[0].payment, 'pay_AAA'); eq(rz.refunds[0].body.amount, 29900); ok(rz.refunds[0].auth.startsWith('Basic '));
  const c = db.rpcCalls.find(x => x.name === 'apply_refund'); eq(c.a.p_payment_id, 'pay_AAA'); eq(c.a.p_amount, 29900); eq(db.tables.admin_audit_log.at(-1).action, 'payment.refund'); });
await t('an unpaid payment cannot be refunded', async () => { fresh(); paidPlan({ status: 'created' }); eq((await call('admin', { action: 'refund', kind: 'plan', id: 'p1' })).s, 400); eq(rz.refunds.length, 0); });
await t('a free / promo order (no Razorpay payment) cannot be refunded', async () => { fresh(); paidPlan({ amount_paise: 0, gateway_payment_id: null, utr: null }); eq((await call('admin', { action: 'refund', kind: 'plan', id: 'p1' })).s, 400); eq(rz.refunds.length, 0); });
await t('if Razorpay refuses, nothing is changed here and the reason is shown', async () => { fresh(); paidPlan(); rz.mode = 'refuse'; const r = await call('admin', { action: 'refund', kind: 'plan', id: 'p1' }); eq(r.s, 502); ok(/already/.test(r.error)); eq(db.rpcCalls.filter(x => x.name === 'apply_refund').length, 0); eq(db.tables.payments[0].status, 'paid'); });
await t('a directory listing fee refund goes through the same path', async () => { fresh(); db.tables.directory_orders = [{ id: 'o1', status: 'paid', amount_paise: 4900, utr: 'pay_DDD' }]; const r = await call('admin', { action: 'refund', kind: 'directory', id: 'o1', reason: 'duplicate' }); eq(r.s, 200); eq(rz.refunds[0].body.amount, 4900); });
globalThis.fetch = realFetch;
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

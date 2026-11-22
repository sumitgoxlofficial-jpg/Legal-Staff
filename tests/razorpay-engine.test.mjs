// Engine test: runs the real supabase/functions/razorpay code against an in-memory database (tests/razorpay-fake-db.mjs) and a LOCAL MOCK of
// api.razorpay.com. It proves OUR logic: signatures (checkout and webhook), replay and duplicate protection, amount/ownership checks, that nothing
// is activated without a confirmed payment, failed/refund events, promo claims, seat limits. It does NOT prove Razorpay answers exactly like the
// mock: for that, run a test-mode payment (rzp_test_ keys) end to end; see tests/README.md. Needs `tsc` on the PATH.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHmac } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

const out = mkdtempSync(join(tmpdir(), 'rzp-engine-'));
const src = readFileSync(join(root, 'supabase/functions/razorpay/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src);
writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); }
catch (e) { const m = String(e.stdout || e.stderr || e); if (/error TS/.test(m)) { console.log(m); process.exit(1); } }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'razorpay-fake-db.mjs'), join(out, 'js/fake-db.mjs'));
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));

const KEY_ID = 'rzp_test_abc', KEY_SECRET = 'keysecret0123456789', WH_SECRET = 'whsec_test_0123456789';
const env = { SUPABASE_URL: 'http://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WH_SECRET };
let handler; globalThis.Deno = { env: { get: k => env[k] }, serve: h => { handler = h; } };
const rz = { orders: {}, calls: [] };   // the mock Razorpay: orders by id
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  url = String(url); rz.calls.push(url);
  const m = url.match(/api\.razorpay\.com\/v1\/orders\/(.+)$/);
  if (m) { const o = rz.orders[decodeURIComponent(m[1])]; return new Response(JSON.stringify(o || { error: 'nope' }), { status: o ? 200 : 400 }); }
  if (/api\.razorpay\.com\/v1\/orders$/.test(url)) { const b = JSON.parse(init.body), id = 'order_' + Math.random().toString(36).slice(2, 10); rz.orders[id] = { id, amount: b.amount, amount_paid: 0, currency: 'INR', status: 'created', notes: b.notes }; return new Response(JSON.stringify(rz.orders[id]), { status: 200 }); }
  if (/functions\/v1\/billing/.test(url)) return new Response('{}', { status: 200 });
  return realFetch(url, init);
};
await import(pathToFileURL(idx).href);
const fake = await import(pathToFileURL(join(out, 'js/fake-db.mjs')).href); const { db } = fake;

const hmac = (s, k) => createHmac('sha256', k).update(s).digest('hex');
const call = (body, headers = {}) => handler(new Request('http://fn.test', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }));
const as = (token, body) => call(body, { Authorization: 'Bearer ' + token });
let evn = 0;
const hook = async (event, payload, { secret = WH_SECRET, id = 'evt_' + ++evn, sign = true } = {}) => {
  const raw = JSON.stringify({ event, payload }); return call(raw, { 'x-razorpay-signature': sign ? hmac(raw, secret) : 'bad', 'x-razorpay-event-id': id });
};
const FIRM = 'f1', USER = 'u1';
const fresh = () => { fake.reset(); Object.keys(rz.orders).forEach(k => delete rz.orders[k]); db.users = { tok: { id: USER, email: 'a@b.in' }, other: { id: 'u2', email: 'c@d.in' } };
  db.tables.subscriptions = [{ firm_id: FIRM, plan: 'Solo', cycle: 'monthly', status: 'trialing', trial_ends: new Date(Date.now() + 3 * 864e5).toISOString() }]; db.tables.members = [{ firm_id: FIRM, user_id: USER }];
  db.tables.directory_applications = [{ id: 'APP-1', user_id: USER, status: 'pending', paid_at: null }]; };
const planPayment = (over = {}) => { const p = { id: 'pay-row-1', firm_id: FIRM, user_id: USER, plan: 'Professional', cycle: 'monthly', seats: 1, amount_paise: 79900, method: 'razorpay', gateway_order_id: 'order_P1', order_no: 'LSX1', status: 'created', ...over }; db.tables.payments = [p]; rz.orders[p.gateway_order_id] = { id: p.gateway_order_id, amount: p.amount_paise, amount_paid: p.amount_paise, currency: 'INR', status: 'paid', notes: {} }; return p; };
const captured = (orderId, paymentId, amount, extra = {}) => ({ payment: { entity: { id: paymentId, order_id: orderId, amount, currency: 'INR', status: 'captured', ...extra } } });
const dirOrder = (id = 'order_D1', over = {}) => { rz.orders[id] = { id, amount: 4900, amount_paid: 4900, currency: 'INR', status: 'paid', notes: { kind: 'directory', application_id: 'APP-1', user_id: USER, promo: '' }, ...over }; return rz.orders[id]; };
const sig = (o, p, k = KEY_SECRET) => hmac(o + '|' + p, k);
const body = async r => ({ s: r.status, ...(await r.json()) });

console.log('webhook');
await t('without the webhook secret configured it refuses (501), activating nothing', async () => { fresh(); planPayment(); delete env.RAZORPAY_WEBHOOK_SECRET; const r = await hook('payment.captured', captured('order_P1', 'pay_1', 79900)); env.RAZORPAY_WEBHOOK_SECRET = WH_SECRET; eq(r.status, 501); eq(db.tables.payments[0].status, 'created'); });
await t('a bad signature is rejected (400) and nothing changes', async () => { fresh(); planPayment(); const r = await hook('payment.captured', captured('order_P1', 'pay_1', 79900), { sign: false }); eq(r.status, 400); eq(db.tables.payments[0].status, 'created'); eq(db.tables.subscriptions[0].status, 'trialing'); });
await t('a body signed with the wrong secret is rejected', async () => { fresh(); planPayment(); const r = await hook('payment.captured', captured('order_P1', 'pay_1', 79900), { secret: 'not-the-secret' }); eq(r.status, 400); });
await t('a signed payment.captured activates the plan with no browser involved', async () => { fresh(); planPayment(); const r = await hook('payment.captured', captured('order_P1', 'pay_1', 79900)); eq(r.status, 200);
  eq(db.tables.payments[0].status, 'paid'); eq(db.tables.payments[0].gateway_payment_id, 'pay_1'); eq(db.tables.subscriptions[0].status, 'active'); eq(db.tables.subscriptions[0].plan, 'Professional'); eq(db.tables.payment_events[0].outcome, 'activated'); });
await t('the same event delivered twice is recognised (replay) and applied once', async () => { fresh(); planPayment(); await hook('payment.captured', captured('order_P1', 'pay_1', 79900), { id: 'evt_same' }); const renews = db.tables.subscriptions[0].renews; const r = await body(await hook('payment.captured', captured('order_P1', 'pay_1', 79900), { id: 'evt_same' })); ok(r.replay); eq(db.tables.subscriptions[0].renews, renews); eq(db.tables.payment_events.length, 1); });
await t('a different event for an already paid order does not add a second period', async () => { fresh(); planPayment(); await hook('payment.captured', captured('order_P1', 'pay_1', 79900)); const renews = db.tables.subscriptions[0].renews; await hook('order.paid', { ...captured('order_P1', 'pay_1', 79900), order: { entity: { id: 'order_P1' } } }); eq(db.tables.subscriptions[0].renews, renews); eq(db.tables.payment_events.at(-1).outcome, 'already_done'); });
await t('an amount that differs from our order is not activated', async () => { fresh(); planPayment(); await hook('payment.captured', captured('order_P1', 'pay_1', 100)); eq(db.tables.payments[0].status, 'created'); eq(db.tables.subscriptions[0].status, 'trialing'); eq(db.tables.payment_events[0].outcome, 'amount_mismatch'); });
await t('an unknown order id changes nothing', async () => { fresh(); planPayment(); await hook('payment.captured', captured('order_UNKNOWN', 'pay_9', 79900)); eq(db.tables.payments[0].status, 'created'); });
await t('payment.failed marks the open payment failed, with the reason, and gives no access', async () => { fresh(); planPayment(); await hook('payment.failed', captured('order_P1', 'pay_x', 79900, { status: 'failed', error_description: 'Card declined' })); eq(db.tables.payments[0].status, 'failed'); eq(db.tables.payments[0].failure_reason, 'Card declined'); eq(db.tables.subscriptions[0].status, 'trialing'); });
await t('payment.failed never downgrades a payment that is already paid', async () => { fresh(); planPayment({ status: 'paid' }); await hook('payment.failed', captured('order_P1', 'pay_x', 79900, { status: 'failed' })); eq(db.tables.payments[0].status, 'paid'); });
await t('a directory payment captured in the webhook lists the profile (tab closed before the callback)', async () => { fresh(); dirOrder(); const r = await hook('payment.captured', captured('order_D1', 'pay_d1', 4900)); eq(r.status, 200);
  eq(db.tables.directory_orders.length, 1); eq(db.tables.directory_orders[0].status, 'paid'); eq(db.tables.directory_orders[0].utr, 'pay_d1'); ok(db.tables.directory_applications[0].paid_at, 'profile has paid_at'); eq(db.tables.payment_events[0].outcome, 'listed'); });
await t('a directory order that was not fully paid does not list the profile', async () => { fresh(); dirOrder('order_D1', { amount_paid: 0, status: 'attempted' }); await hook('payment.captured', captured('order_D1', 'pay_d1', 4900)); eq(db.tables.directory_applications[0].paid_at, null); eq(db.tables.payment_events[0].outcome, 'amount_mismatch'); });
await t('a directory order made for another user is not listed under this application', async () => { fresh(); dirOrder('order_D1', { notes: { kind: 'directory', application_id: 'APP-1', user_id: 'someone-else' } }); await hook('payment.captured', captured('order_D1', 'pay_d1', 4900)); eq(db.tables.directory_applications[0].paid_at, null); });
await t('a second paid order for an already listed profile is recorded as a duplicate for refund, not silently dropped', async () => { fresh(); dirOrder('order_D1'); dirOrder('order_D2'); await hook('payment.captured', captured('order_D1', 'pay_d1', 4900)); await hook('payment.captured', captured('order_D2', 'pay_d2', 4900));
  eq(db.tables.payment_events.at(-1).outcome, 'duplicate_payment'); eq(db.tables.directory_orders.length, 2); eq(db.tables.directory_applications[0].order_no, 'order_D1'); });
await t('refund.processed is applied through apply_refund exactly as Razorpay reports it', async () => { fresh(); db.rpcResults.apply_refund = 'listing_refunded'; await hook('refund.processed', { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_d1', amount: 4900, status: 'processed' } } });
  const c = db.rpcCalls.find(x => x.name === 'apply_refund'); eq(c.a, { p_payment_id: 'pay_d1', p_refund_id: 'rfnd_1', p_amount: 4900 }); eq(db.tables.payment_events[0].outcome, 'listing_refunded'); });

console.log('browser callback (verify-payment)');
await t('a wrong checkout signature is rejected and activates nothing', async () => { fresh(); planPayment(); const r = await body(await as('tok', { action: 'verify-payment', firm_id: FIRM, razorpay_order_id: 'order_P1', razorpay_payment_id: 'pay_1', razorpay_signature: 'f'.repeat(64) })); eq(r.s, 400); eq(db.tables.payments[0].status, 'created'); });
await t('a correct signature but an order Razorpay has not marked paid is not activated (409)', async () => { fresh(); planPayment(); rz.orders.order_P1.status = 'attempted'; rz.orders.order_P1.amount_paid = 0; const r = await body(await as('tok', { action: 'verify-payment', firm_id: FIRM, razorpay_order_id: 'order_P1', razorpay_payment_id: 'pay_1', razorpay_signature: sig('order_P1', 'pay_1') })); eq(r.s, 409); eq(db.tables.payments[0].status, 'created'); });
await t('a correct signature on a paid order activates the plan, once', async () => { fresh(); planPayment(); const a = { action: 'verify-payment', firm_id: FIRM, razorpay_order_id: 'order_P1', razorpay_payment_id: 'pay_1', razorpay_signature: sig('order_P1', 'pay_1') };
  const r = await body(await as('tok', a)); eq(r.s, 200); eq(db.tables.subscriptions[0].status, 'active'); const renews = db.tables.subscriptions[0].renews; const r2 = await body(await as('tok', a)); ok(r2.already); eq(db.tables.subscriptions[0].renews, renews); });
await t('a signature made with another key (a forged one) is rejected', async () => { fresh(); planPayment(); const r = await body(await as('tok', { action: 'verify-payment', firm_id: FIRM, razorpay_order_id: 'order_P1', razorpay_payment_id: 'pay_1', razorpay_signature: sig('order_P1', 'pay_1', 'attacker-key') })); eq(r.s, 400); });
await t('a signed-in stranger cannot verify a firm they are not in', async () => { fresh(); planPayment(); db.rpcResults.is_member = false; const r = await body(await as('other', { action: 'verify-payment', firm_id: FIRM, razorpay_order_id: 'order_P1', razorpay_payment_id: 'pay_1', razorpay_signature: sig('order_P1', 'pay_1') })); eq(r.s, 403); eq(db.tables.payments[0].status, 'created'); });
await t('no sign-in, no verification (401)', async () => { fresh(); planPayment(); const r = await body(await call({ action: 'verify-payment', firm_id: FIRM })); eq(r.s, 401); });
await t('directory verify: valid signature + fully paid order lists the profile; a replay does not duplicate the order', async () => { fresh(); dirOrder(); const a = { action: 'dir-verify-payment', application_id: 'APP-1', razorpay_order_id: 'order_D1', razorpay_payment_id: 'pay_d1', razorpay_signature: sig('order_D1', 'pay_d1') };
  eq((await body(await as('tok', a))).s, 200); ok(db.tables.directory_applications[0].paid_at); db.tables.directory_applications[0].paid_at = db.tables.directory_applications[0].paid_at; const r2 = await body(await as('tok', a)); eq(r2.s, 200); eq(db.tables.directory_orders.length, 1); });
await t('directory verify: another user cannot claim someone else\'s application', async () => { fresh(); dirOrder(); const r = await body(await as('other', { action: 'dir-verify-payment', application_id: 'APP-1', razorpay_order_id: 'order_D1', razorpay_payment_id: 'pay_d1', razorpay_signature: sig('order_D1', 'pay_d1') })); eq(r.s, 404); eq(db.tables.directory_applications[0].paid_at, null); });
await t('if the order row cannot be saved, the profile is NOT listed and the buyer is told to retry (no listing without a ledger row)', async () => { fresh(); dirOrder(); db.failWrites = ['directory_orders']; const r = await body(await as('tok', { action: 'dir-verify-payment', application_id: 'APP-1', razorpay_order_id: 'order_D1', razorpay_payment_id: 'pay_d1', razorpay_signature: sig('order_D1', 'pay_d1') })); db.failWrites = null; eq(r.s, 500); eq(db.tables.directory_applications[0].paid_at, null); });
await t('if the plan cannot be switched on, the payment goes back to "created" so the webhook can finish the job', async () => { fresh(); planPayment(); db.failWrites = ['subscriptions']; const r = await hook('payment.captured', captured('order_P1', 'pay_1', 79900)); db.failWrites = null; eq(r.status, 500); eq(db.tables.payments[0].status, 'created'); });

console.log('orders and promo codes');
await t('Solo cannot be bought by a firm with more than one member', async () => { fresh(); db.tables.members = [{ firm_id: FIRM, user_id: USER }, { firm_id: FIRM, user_id: 'u3' }, { firm_id: FIRM, user_id: 'u4' }]; const r = await body(await as('tok', { action: 'create-order', firm_id: FIRM, plan: 'Solo', cycle: 'monthly' })); eq(r.s, 400); ok(/more than/.test(r.error)); eq((db.tables.payments || []).length, 0); });
await t('a 100%-off code is claimed atomically; when the claim fails nothing is activated', async () => { fresh(); db.tables.promo_codes = [{ code: 'FREE', active: true, percent_off: 100, uses: 0, max_uses: 1, once_per_firm: true }]; db.rpcResults.promo_claim = false;
  const r = await body(await as('tok', { action: 'create-order', firm_id: FIRM, plan: 'Solo', cycle: 'monthly', promo: 'FREE' })); eq(r.s, 400); eq((db.tables.payments || []).length, 0); eq(db.tables.subscriptions[0].status, 'trialing'); });
await t('a 100%-off code that is claimed switches the plan on and counts the use once', async () => { fresh(); db.tables.promo_codes = [{ code: 'FREE', active: true, percent_off: 100, uses: 0, max_uses: 5, once_per_firm: true }];
  const r = await body(await as('tok', { action: 'create-order', firm_id: FIRM, plan: 'Solo', cycle: 'monthly', promo: 'FREE' })); eq(r.s, 200); ok(r.free); eq(db.tables.subscriptions[0].status, 'active'); eq(db.rpcCalls.filter(c => c.name === 'promo_claim').length, 1); eq(db.rpcCalls.filter(c => c.name === 'promo_use').length, 0); });
await t('only the firm owner can create a plan order', async () => { fresh(); db.rpcResults.is_owner = false; const r = await body(await as('tok', { action: 'create-order', firm_id: FIRM, plan: 'Solo', cycle: 'monthly' })); eq(r.s, 403); });
await t('the order amount is computed on the server; a tampered client price is ignored', async () => { fresh(); const r = await body(await as('tok', { action: 'create-order', firm_id: FIRM, plan: 'Solo', cycle: 'monthly', amount: 1, amount_paise: 100 })); eq(r.s, 200); eq(r.amount, 29900); });
await t('the secret key is never in any response', async () => { fresh(); const r = await (await call({ action: 'config' })).text(); ok(!r.includes(KEY_SECRET) && !r.includes(WH_SECRET)); ok(r.includes(KEY_ID)); });

globalThis.fetch = realFetch;
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

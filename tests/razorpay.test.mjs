// Razorpay for the Rs 49 directory listing: the pure rules, then the real functions/listing-razorpay code against the in-memory database
// (tests/email-fake-db.mjs) and a local mock of the Razorpay API. It does NOT touch real Razorpay: see docs/email-marketing.md.
// Run: node tests/razorpay.test.mjs   (needs `tsc` on the PATH)
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0;
const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };
const L = await import(pathToFileURL(join(root, 'supabase/functions/_shared/razorpay-logic.js')));
const SECRET = 'rzp_secret_for_tests', WH = 'webhook_secret_tests', sign = (s, m) => createHmac('sha256', s).update(m).digest('hex');

console.log('rules');
await t('checkout signature = HMAC-SHA256(order|payment); a wrong one or a different secret fails', async () => { ok(await L.verifyCheckout(SECRET, 'order_1', 'pay_1', sign(SECRET, 'order_1|pay_1'))); ok(!(await L.verifyCheckout(SECRET, 'order_1', 'pay_2', sign(SECRET, 'order_1|pay_1')))); ok(!(await L.verifyCheckout('other', 'order_1', 'pay_1', sign(SECRET, 'order_1|pay_1')))); ok(!(await L.verifyCheckout(SECRET, '', 'pay_1', ''))); });
await t('webhook signature = HMAC-SHA256(raw body)', async () => { const b = '{"event":"payment.captured"}'; ok(await L.verifyWebhook(WH, b, sign(WH, b))); ok(!(await L.verifyWebhook(WH, b + ' ', sign(WH, b)))); ok(!(await L.verifyWebhook('', b, sign(WH, b)))); });
await t('a payment is accepted only for its order, Rs 49, INR and captured/authorised', () => {
  const p = (o) => ({ order_id: 'order_1', amount: 4900, currency: 'INR', status: 'captured', ...o });
  eq(L.judgePayment(p(), 'order_1'), { ok: true, capture: false }); eq(L.judgePayment(p({ status: 'authorized' }), 'order_1'), { ok: true, capture: true });
  for (const o of [{ order_id: 'x' }, { amount: 100 }, { currency: 'USD' }, { status: 'failed' }, { status: 'created' }]) ok(!L.judgePayment(p(o), 'order_1').ok, JSON.stringify(o)); });

const out = mkdtempSync(join(tmpdir(), 'rzp-'));
mkdirSync(join(out, '_shared')); cpSync(join(root, 'supabase/functions/_shared/razorpay-logic.js'), join(out, '_shared/razorpay-logic.js'));
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + readFileSync(join(root, 'supabase/functions/listing-razorpay/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim').replace('../_shared/razorpay-logic.js', './_shared/razorpay-logic.js'));
writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--allowJs', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); }
catch (e) { console.log('TypeScript compile errors:\n' + (e.stdout?.toString() || e.message)); process.exit(1); }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'email-fake-db.mjs'), join(out, 'js/fake-db.mjs')); cpSync(join(out, '_shared'), join(out, 'js/_shared'), { recursive: true });
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));
const { seed, table } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')));

// mock Razorpay
const rz = { orders: {}, payments: {}, n: 0, calls: [] };
const srv = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
  const reply = (s, o) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  rz.calls.push(req.method + ' ' + req.url);
  if (req.headers.authorization !== 'Basic ' + Buffer.from('rzp_test_KEYID:' + SECRET).toString('base64')) return reply(401, { error: { description: 'Authentication failed' } });
  if (req.method === 'POST' && req.url === '/v1/orders') { const body = JSON.parse(b), id = 'order_' + ++rz.n; rz.orders[id] = body; return reply(200, { id, ...body }); }
  const m = req.url.match(/^\/v1\/payments\/([^/]+)(\/capture)?$/); if (m) { const p = rz.payments[m[1]]; if (!p) return reply(404, { error: { description: 'not found' } }); if (m[2]) p.status = 'captured'; return reply(200, p); }
  reply(404, {}); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const E = { SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's', RAZORPAY_KEY_ID: 'rzp_test_KEYID', RAZORPAY_KEY_SECRET: SECRET, RAZORPAY_WEBHOOK_SECRET: WH, RAZORPAY_API_BASE: `http://127.0.0.1:${srv.address().port}` };
let handler; globalThis.Deno = { env: { get: (k) => E[k] }, serve: (h) => { handler = h; } };
await import(pathToFileURL(idx));
const call = async (body, query = '', headers = {}, raw) => { const r = await handler(new Request('https://p.supabase.co/functions/v1/listing-razorpay' + query, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: raw ?? JSON.stringify(body) })); return { status: r.status, body: await r.json() }; };
seed();
table('directory_applications').push({ id: 'LS-DIR-1', enr: 'BR/1/2020', status: 'pending', name: 'Asha', email: 'asha@example.in' }, { id: 'LS-DIR-2', enr: 'BR/2/2020', status: 'pending', name: 'Bimal', email: 'b@example.in' }, { id: 'LS-DIR-3', enr: 'BR/3/2020', status: 'rejected', name: 'R', email: '' });
const A1 = { application_id: 'LS-DIR-1', enr: 'br/1/2020' }, A2 = { application_id: 'LS-DIR-2', enr: 'BR/2/2020' };
const pay = (id, order, o = {}) => (rz.payments[id] = { id, order_id: order, amount: 4900, currency: 'INR', status: 'captured', ...o });
const verify = (A, order, id, sig) => call({ action: 'verify', ...A, razorpay_order_id: order, razorpay_payment_id: id, razorpay_signature: sig ?? sign(SECRET, order + '|' + id) });

console.log('checkout');
let o1;
await t('config exposes only the public key id, never the secret', async () => { const r = await call({ action: 'config' }); eq(r.body.enabled, true); eq(r.body.key_id, 'rzp_test_KEYID'); ok(!JSON.stringify(r.body).includes(SECRET)); });
await t('creating an order needs reference + matching enrolment number; rejected applications cannot pay', async () => { eq((await call({ action: 'create', application_id: 'LS-DIR-1', enr: 'BR/9/2020' })).status, 404); eq((await call({ action: 'create', application_id: 'LS-DIR-3', enr: 'BR/3/2020' })).status, 409); eq(table('directory_payments').length, 0); });
await t('an order is created at Rs 49 on Razorpay and stored; pressing again reuses it', async () => { const r = await call({ action: 'create', ...A1 }); eq([r.status, r.body.amount, r.body.currency], [200, 4900, 'INR']); o1 = r.body.order_id; eq(rz.orders[o1].amount, 4900); eq(table('directory_payments')[0].method, 'razorpay'); eq((await call({ action: 'create', ...A1 })).body.order_id, o1); eq(rz.n, 1); });
await t('a forged signature is refused and nothing is marked paid', async () => { pay('pay_1', o1); const r = await verify(A1, o1, 'pay_1', 'deadbeef'); eq(r.status, 400); eq(table('directory_payments')[0].status, 'created'); });
await t('a valid signature but a payment for another order or amount is refused', async () => { pay('pay_x', 'order_other'); eq((await verify(A1, o1, 'pay_x')).status, 409); pay('pay_y', o1, { amount: 100 }); eq((await verify(A1, o1, 'pay_y')).status, 409); pay('pay_z', o1, { status: 'failed' }); eq((await verify(A1, o1, 'pay_z')).status, 409); eq(table('directory_payments')[0].status, 'created'); });
await t('a signature for the right order cannot be used by another applicant', async () => { pay('pay_1', o1); eq((await verify(A2, o1, 'pay_1')).status, 404); });
await t('a genuine captured payment marks the listing paid, with its payment id', async () => { const r = await verify(A1, o1, 'pay_1'); eq([r.status, r.body.paid], [200, true]); const d = table('directory_payments')[0]; eq([d.status, d.gateway_payment_id, d.confirmed_by], ['paid', 'pay_1', 'razorpay']); });
await t('an authorised (not yet captured) payment is captured by the server first', async () => { const r = await call({ action: 'create', ...A2 }); const o2 = r.body.order_id; pay('pay_2', o2, { status: 'authorized' }); const v = await verify(A2, o2, 'pay_2'); eq(v.body.paid, true); ok(rz.calls.includes('POST /v1/payments/pay_2/capture')); eq(rz.payments.pay_2.status, 'captured'); });
await t('status and create now report paid and create no new order', async () => { const n = rz.n; eq((await call({ action: 'status', ...A1 })).body.paid, true); eq((await call({ action: 'create', ...A1 })).body.paid, true); eq(rz.n, n); });
await t('the paid listing counts for the email campaign trigger inputs (application email is on the row)', () => ok(table('directory_applications')[0].email === 'asha@example.in'));

console.log('webhook');
seed(); table('directory_applications').push({ id: 'LS-DIR-1', enr: 'BR/1/2020', status: 'pending', email: 'a@e.in' }); rz.n = 10;
const hook = (ev, key = WH) => { const raw = JSON.stringify(ev); return call(null, '?action=webhook', { 'x-razorpay-signature': sign(key, raw) }, raw); };
await t('an unsigned or wrongly signed webhook is refused', async () => { const raw = '{"event":"payment.captured"}'; eq((await call(null, '?action=webhook', {}, raw)).status, 403); eq((await hook({ event: 'payment.captured' }, 'wrong')).status, 403); });
await t('a signed payment.captured confirms the listing even if the browser never returned', async () => { const c = await call({ action: 'create', ...A1 }); const order = c.body.order_id; const r = await hook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_w1', order_id: order, amount: 4900, currency: 'INR', status: 'captured' } } } }); eq(r.body.paid, true); eq(table('directory_payments').find((d) => d.gateway_order_id === order).status, 'paid'); });
await t('a repeated webhook changes nothing; a webhook for an unknown order or a wrong amount is ignored', async () => { const before = JSON.stringify(table('directory_payments')); const order = table('directory_payments')[0].gateway_order_id; await hook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_w1', order_id: order, amount: 4900, currency: 'INR', status: 'captured' } } } }); eq(JSON.stringify(table('directory_payments')), before); eq((await hook({ event: 'payment.captured', payload: { payment: { entity: { id: 'p', order_id: 'order_nope', amount: 4900, currency: 'INR', status: 'captured' } } } })).body.ignored, true); });
await t('a second payment for an already-paid listing is not confirmed again; its payment id is kept for a refund', async () => {
  table('directory_payments').push({ id: 'dup', application_id: 'LS-DIR-1', order_no: 'LRDUP', amount_paise: 4900, method: 'razorpay', status: 'created', gateway_order_id: 'order_dup', created_at: new Date().toISOString() });
  const r = await hook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_dup', order_id: 'order_dup', amount: 4900, currency: 'INR', status: 'captured' } } } }); eq(r.body.duplicate, true);
  const d = table('directory_payments').find((x) => x.id === 'dup'); eq([d.status, d.gateway_payment_id], ['created', 'pay_dup']); eq(table('directory_payments').filter((x) => x.status === 'paid').length, 1); });

console.log('switched off');
await t('without keys the checkout is off and nothing is called', async () => { const k = E.RAZORPAY_KEY_ID; E.RAZORPAY_KEY_ID = ''; eq((await call({ action: 'config' })).body.enabled, false); eq((await call({ action: 'create', ...A1 })).status, 501); E.RAZORPAY_KEY_ID = k; });
await t('a provider error never leaks the key', async () => { const k = E.RAZORPAY_KEY_SECRET; E.RAZORPAY_KEY_SECRET = 'wrong'; seed(); table('directory_applications').push({ id: 'LS-DIR-1', enr: 'BR/1/2020', status: 'pending' }); const r = await call({ action: 'create', ...A1 }); eq(r.status, 502); ok(!JSON.stringify(r.body).includes('rzp_test_KEYID') && !JSON.stringify(r.body).includes('wrong')); E.RAZORPAY_KEY_SECRET = k; });

srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

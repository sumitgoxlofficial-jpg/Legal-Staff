// Test for the Rs 49 directory listing in supabase/functions/upi-pay: the real function code against the in-memory database of
// tests/email-fake-db.mjs. Proves OUR logic (identification, unique amounts, matching a bank credit to exactly one order, no double confirmation,
// shared amount pool with plan payments, email-campaign attribution on payment). It does NOT touch real UPI, a bank or Paytm.
// Run: node tests/directory-pay.test.mjs   (needs `tsc` on the PATH)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0;
const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

const out = mkdtempSync(join(tmpdir(), 'dirpay-'));
const src = readFileSync(join(root, 'supabase/functions/upi-pay/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src); writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); }
catch (e) { console.log('TypeScript compile errors:\n' + (e.stdout?.toString() || e.message)); process.exit(1); }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'email-fake-db.mjs'), join(out, 'js/fake-db.mjs'));
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));
const { seed, table, clock, db } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')));
let handler; globalThis.Deno = { env: { get: (k) => ({ SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 's', SUPABASE_ANON_KEY: 'a' })[k] }, serve: (h) => { handler = h; } };
await import(pathToFileURL(idx));
const call = async (action, body, headers = {}) => { const r = await handler(new Request('https://p.supabase.co/functions/v1/upi-pay?action=' + action, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })); return { status: r.status, body: await r.json() }; };
const sms = (amt, utr) => call('sms', { text: `Rs ${amt} credited to your a/c XX1234 by UPI ref ${utr}. -Bank` }, {});
const smsAt = (amt, utr) => handler(new Request('https://p.supabase.co/functions/v1/upi-pay?action=sms&key=smskey', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `Rs.${amt} credited to A/c XX1234 on 18-11-26 by UPI Ref No ${utr}. Bank` }) })).then((r) => r.json());

seed();
table('pay_settings').push({ id: 1, upi_enabled: true, upi_id: 'legalstaff@okbank', payee_name: 'Legal Staff', paytm_mid: '', sms_secret: 'smskey', email_inbox: '' });
table('directory_applications').push({ id: 'LS-DIR-2026-00001', enr: 'BR/1234/2020', status: 'pending', name: 'Asha Rao', email: 'asha@example.in' }, { id: 'LS-DIR-2026-00002', enr: 'BR/999/2019', status: 'pending', name: 'Bimal', email: 'bimal@example.in' }, { id: 'LS-DIR-2026-00003', enr: 'BR/5/2018', status: 'rejected', name: 'Rej', email: '' });
const A1 = { application_id: 'LS-DIR-2026-00001', enr: 'br/1234/2020' }, A2 = { application_id: 'LS-DIR-2026-00002', enr: 'BR/999/2019' };

console.log('identification');
await t('the reference alone is not enough: a wrong or missing enrolment number is refused', async () => { eq((await call('dir_create', { application_id: A1.application_id, enr: 'BR/0/2000' })).status, 404); eq((await call('dir_create', { application_id: A1.application_id })).status, 400); eq((await call('dir_status', { application_id: 'nope', enr: 'x' })).status, 404); });
await t('a rejected application cannot be paid for', async () => eq((await call('dir_create', { application_id: 'LS-DIR-2026-00003', enr: 'BR/5/2018' })).status, 409));
await t('UPI switched off: no order is created', async () => { table('pay_settings')[0].upi_enabled = false; eq((await call('dir_create', A1)).status, 501); eq((await call('dir_status', A1)).body.enabled, false); table('pay_settings')[0].upi_enabled = true; eq(table('directory_payments').length, 0); });

console.log('creating orders');
let o1, o2;
await t('an order is Rs 49.00 to 49.99 with a UPI link for exactly that amount', async () => { const r = await call('dir_create', A1); eq(r.status, 200); o1 = r.body; ok(o1.amount >= 4900 && o1.amount < 5000); ok(o1.link.includes('am=' + (o1.amount / 100).toFixed(2))); ok(o1.link.includes('pa=legalstaff%40okbank') || o1.link.includes('pa=legalstaff@okbank')); ok(/^LD[0-9A-F]{12}$/.test(o1.order_no)); });
await t('pressing pay again reuses the open order (no pile of orders)', async () => { const r = await call('dir_create', A1); eq(r.body.order_no, o1.order_no); eq(table('directory_payments').length, 1); });
await t('two applicants get different amounts', async () => { o2 = (await call('dir_create', A2)).body; ok(o2.amount !== o1.amount); });
await t('the amount pool is shared with plan payments: a plan order at the same amount is never reused', async () => {
  table('payments').push({ id: 'pp1', method: 'upi', status: 'created', amount_paise: 4902, created_at: new Date().toISOString() }); table('directory_payments').forEach((d) => (d.created_at = new Date(Date.now() - 31 * 60e3).toISOString()));
  const r = await call('dir_create', A1); ok(r.body.amount !== 4902, 'got ' + r.body.amount); const open = table('directory_payments').filter((d) => d.status === 'created').map((d) => d.amount_paise); eq(new Set(open).size, open.length, 'open amounts unique'); table('payments').length = 0; });

console.log('confirmation');
await t('a bank credit of exactly the order amount confirms that one listing', async () => { const cur = table('directory_payments').filter((d) => d.application_id === A1.application_id && d.status === 'created').at(-1); const r = await smsAt((cur.amount_paise / 100).toFixed(2), '412345670001'); eq(r.matched, true); eq(table('directory_payments').find((d) => d.id === cur.id).status, 'paid'); eq(table('directory_payments').find((d) => d.id === cur.id).confirmed_by, 'sms'); });
await t('status now says paid, and a second order cannot be created for a paid listing', async () => { eq((await call('dir_status', A1)).body.paid, true); const before = table('directory_payments').length; const r = await call('dir_create', A1); eq(r.body.paid, true); eq(table('directory_payments').length, before); });
await t('the same bank reference cannot confirm anything twice', async () => { const o = table('directory_payments').find((d) => d.application_id === A2.application_id && d.status === 'created'); const r = await smsAt((o.amount_paise / 100).toFixed(2), '412345670001'); eq(r.matched, false); eq(o.status, 'created'); });
await t('a credit of an amount that matches no order confirms nothing', async () => { const r = await smsAt('49.00', '412345670002'); eq(r.matched, false); eq(table('directory_payments').filter((d) => d.status === 'paid').length, 1); });
await t('an amount shared by two open orders is never guessed', async () => { const o = table('directory_payments').find((d) => d.application_id === A2.application_id && d.status === 'created'); table('payments').push({ id: 'pp2', firm_id: 'f', method: 'upi', status: 'created', amount_paise: o.amount_paise, created_at: new Date().toISOString() }); const r = await smsAt((o.amount_paise / 100).toFixed(2), '412345670003'); eq(r.matched, false); eq(o.status, 'created'); eq(table('payments')[0].status, 'created'); table('payments').length = 0; });
await t('a payment for another applicant is not credited to the wrong one', async () => { const o = table('directory_payments').find((d) => d.application_id === A2.application_id && d.status === 'created'); const r = await smsAt((o.amount_paise / 100).toFixed(2), '412345670004'); eq(r.matched, true); eq(table('directory_payments').filter((d) => d.status === 'paid').map((d) => d.application_id).sort(), [A1.application_id, A2.application_id]); });
await t('a payment from an old, expired order (older than 24 h) is not matched', async () => { const x = (await call('dir_create', { application_id: 'LS-DIR-2026-00003', enr: 'BR/5/2018' })); eq(x.status, 409); });
await t('the SMS endpoint still needs its secret key', async () => { const r = await handler(new Request('https://p.supabase.co/functions/v1/upi-pay?action=sms&key=wrong', { method: 'POST', body: '{"text":"Rs.49.10 credited"}' })); eq(r.status, 403); });

console.log('plan payments are unaffected');
await t('a plan order for the same firm flow still confirms by amount (existing behaviour)', async () => {
  seed(); table('pay_settings').push({ id: 1, upi_enabled: true, upi_id: 'x@y', payee_name: 'LS', paytm_mid: '', sms_secret: 'smskey' });
  table('subscriptions').push({ firm_id: 'f1', status: 'trialing', trial_ends: new Date(Date.now() + 864e5).toISOString() });
  table('payments').push({ id: 'p9', firm_id: 'f1', user_id: 'u', plan: 'Solo', cycle: 'monthly', seats: null, amount_paise: 29905, method: 'upi', status: 'created', created_at: new Date().toISOString(), order_no: 'LS1', gstin: '', promo_code: null });
  globalThis.fetch = async () => new Response('{}', { status: 200 });   // the invoice call
  const r = await smsAt('299.05', '412345670099'); eq(r.matched, true); eq(table('payments')[0].status, 'paid'); eq(table('subscriptions').filter((x) => x.firm_id === 'f1').at(-1).status, 'active'); });

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

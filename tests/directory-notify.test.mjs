// The directory-verify sweep announces new contact requests to the advocate by email, once, without phone numbers or message text.
// Runs the real supabase/functions/directory-verify against the in-memory database and a mock Resend. Needs `tsc` on the PATH.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join, dirname } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); }; const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };
const out = mkdtempSync(join(tmpdir(), 'dirn-'));
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + readFileSync(join(root, 'supabase/functions/directory-verify/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim'));
writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); } catch (e) { const m = String(e.stdout || e.stderr || e); if (/error TS/.test(m)) { console.log(m); process.exit(1); } }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'razorpay-fake-db.mjs'), join(out, 'js/fake-db.mjs'));
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));
const env = { SUPABASE_URL: 'http://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', RESEND_API_KEY: 're_test', EMAIL_FROM: 'Legal Staff <no-reply@legalstaff.test>' };
let handler; globalThis.Deno = { env: { get: k => env[k] }, serve: h => { handler = h; } };
const mails = []; const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => { if (String(url).includes('api.resend.com')) { mails.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); } return realFetch(url, init); };
await import(pathToFileURL(idx).href); const { db, reset } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')).href);
const sweep = () => handler(new Request('http://fn', { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': 'c' }, body: '{"action":"sweep"}' })).then(async r => ({ s: r.status, ...(await r.json()) }));
const now = () => new Date().toISOString();
const fresh = () => { reset(); mails.length = 0; db.rpcResults.cron_secret_ok = true; db.tables.directory_applications = [{ id: 'A1', name: 'Asha Rao', email: 'asha@example.in', paid_at: now(), status: 'verified' }, { id: 'A2', name: 'Unpaid', email: 'u@example.in', paid_at: null, status: 'pending' }, { id: 'A3', name: 'Rejected', email: 'r@example.in', paid_at: now(), status: 'rejected' }]; };
await t('a new contact request emails the advocate: names and topics, never phone or message text', async () => { fresh();
  db.tables.directory_enquiries = [{ id: 1, application_id: 'A1', name: 'Client One', phone: '9876543210', email: 'c1@x.in', category: 'Bail', message: 'my secret case details', created_at: now(), notified_at: null }, { id: 2, application_id: 'A1', name: 'Client Two', category: 'Divorce', message: 'more private words', created_at: now(), notified_at: null }];
  const r = await sweep(); eq(r.s, 200); eq(r.notified, 2); eq(mails.length, 1); eq(mails[0].to, ['asha@example.in']); ok(/2 new contact requests/.test(mails[0].subject));
  const all = mails[0].text + mails[0].html; ok(all.includes('Client One') && all.includes('Bail')); ok(!/9876543210|secret case|private words|c1@x\.in/.test(all), 'private data in the email'); ok(db.tables.directory_enquiries.every(e => e.notified_at)); });
await t('each request is announced once: a second sweep sends nothing', async () => { mails.length = 0; const r = await sweep(); eq(r.notified, 0); eq(mails.length, 0); });
await t('requests for an unpaid or rejected profile are not announced (and are marked so they are not retried)', async () => { fresh(); db.tables.directory_enquiries = [{ id: 1, application_id: 'A2', name: 'X', created_at: now(), notified_at: null }, { id: 2, application_id: 'A3', name: 'Y', created_at: now(), notified_at: null }];
  const r = await sweep(); eq(r.notified, 0); eq(mails.length, 0); ok(db.tables.directory_enquiries.every(e => e.notified_at)); });
await t('old requests (before the migration) are not announced', async () => { fresh(); db.tables.directory_enquiries = [{ id: 1, application_id: 'A1', name: 'Old', created_at: new Date(Date.now() - 5 * 864e5).toISOString(), notified_at: null }]; const r = await sweep(); eq(mails.length, 0); eq(r.notified, 0); });
await t('if the email cannot be sent the request stays unannounced and is retried by the next sweep', async () => { fresh(); db.tables.directory_enquiries = [{ id: 1, application_id: 'A1', name: 'Z', created_at: now(), notified_at: null }]; env.RESEND_API_KEY = ''; const r = await sweep(); env.RESEND_API_KEY = 're_test'; eq(r.notified, 0); eq(db.tables.directory_enquiries[0].notified_at, null); const r2 = await sweep(); eq(r2.notified, 1); });
await t('only the cron secret may start a sweep', async () => { fresh(); db.rpcResults.cron_secret_ok = false; const r = await sweep(); eq(r.s, 403); eq(mails.length, 0); });
globalThis.fetch = realFetch; console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

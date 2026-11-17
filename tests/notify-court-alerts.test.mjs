// Court-record alerts in supabase/functions/notify: the real function code runs against the in-memory database (tests/court-fake-db.mjs)
// and a fake WhatsApp (Meta Cloud API) and email (Resend) endpoint. Proves OUR behaviour: who is told, once, batched, in waking hours,
// honouring settings, retrying a bounded number of times. It does not prove that Meta accepts the template: that needs a real send.
// Run: node tests/notify-court-alerts.test.mjs   (needs `tsc` on the PATH)
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

const out = mkdtempSync(join(tmpdir(), 'notify-'));
const src = readFileSync(join(root, 'supabase/functions/notify/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src); writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); } catch (e) { console.log(String(e.stdout)); throw e; }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'court-fake-db.mjs'), join(out, 'js/fake-db.mjs'));
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));

const BASE = { SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', WHATSAPP_TOKEN: 'EAAG-secret-token', WHATSAPP_PHONE_ID: '111222', WHATSAPP_TEMPLATE: 'daily_brief', WHATSAPP_ALERT_TEMPLATE: 'court_update', RESEND_API_KEY: 're_secret_key', EMAIL_FROM: 'Legal Staff <a@b.in>', APP_URL: 'https://legalstaff.in' };
const env = { ...BASE }; let handler;
globalThis.Deno = { env: { get: k => env[k] }, serve: h => { handler = h; } };
const setEnv = o => { for (const k of Object.keys(env)) delete env[k]; Object.assign(env, o); };
const calls = { wa: [], mail: [] }; let waMode = 'ok';
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  u = String(u); const body = o && o.body ? JSON.parse(o.body) : {};
  if (u.includes('graph.facebook.com')) { calls.wa.push({ u, auth: o.headers.Authorization, body }); return waMode === 'ok' ? new Response('{"messages":[{"id":"wamid"}]}', { status: 200 }) : new Response('{"error":{"message":"template not approved"}}', { status: 400 }); }
  if (u.includes('api.resend.com')) { calls.mail.push({ auth: o.headers.Authorization, body }); return new Response('{"id":"m1"}', { status: 200 }); }
  return realFetch(u, o);
};
let NOW = Date.parse('2026-11-17T05:00:00Z'); // 10:30 IST
const realNow = Date.now; Date.now = () => NOW;
const { db, reset } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')).href);
await import(pathToFileURL(idx).href);

const F = 'f1', agoH = h => new Date(NOW - h * 3600e3).toISOString();
const setup = (o = {}) => {
  reset(); setEnv(BASE); waMode = 'ok'; calls.wa = []; calls.mail = []; NOW = Date.parse('2026-11-17T05:00:00Z');
  db.tables = {
    firms: [{ id: F, name: 'Mehta & Co' }],
    members: [{ firm_id: F, user_id: 'u1', name: 'Adv. Test', title: 'Adv. Test', email: 'test@x.in', phone: '98765 43210', status: 'Active', is_owner: true }, { firm_id: F, user_id: 'u2', name: 'Adv. Other', title: 'Adv. Other', email: 'other@x.in', phone: '9999900000', status: 'Active', is_owner: false }, { firm_id: F, user_id: 'u3', name: 'Clerk', title: 'Clerk', email: 'clerk@x.in', phone: '9000000000', status: 'Active', is_owner: false }],
    user_state: [], subscriptions: [{ firm_id: F, status: 'active', renews: '2099-01-01', plan: 'Firm' }], notifications: [],
    records: [{ firm_id: F, kind: 'case', id: 'c1', data: { title: 'Mehta v. Orion', no: 'CS 12/2024', team: o.team ?? ['Adv. Test'] } }, { firm_id: F, kind: 'case', id: 'c2', data: { title: 'Rao v. State', no: 'CC 7/2025', team: ['Adv. Test'] } }],
    legal_cases: [{ id: 'lc1', firm_id: F, record_id: 'c1' }, { id: 'lc2', firm_id: F, record_id: 'c2' }],
    notification_events: o.events ?? [{ id: 'e1', firm_id: F, case_id: 'lc1', kind: 'hearing_adjourned', title: 'Next hearing moved from 2026-12-01 to 2027-01-15', created_at: agoH(2) }, { id: 'e2', firm_id: F, case_id: 'lc1', kind: 'new_order', title: 'New order dated 2026-11-10', created_at: agoH(1) }]
  };
};
const run = async () => { const r = await handler(new Request('http://fn', { method: 'POST', headers: { 'x-cron-secret': 'cron-test' }, body: '{}' })); return { status: r.status, body: await r.json() }; };
const setState = (uid, settings) => db.tables.user_state.push({ firm_id: F, user_id: uid, data: { settings } });
const sentRows = () => db.tables.notifications.filter(n => n.kind.startsWith('court:') && n.status === 'sent');

console.log('court alerts · notify function');
await t('the advocate on the case gets ONE WhatsApp and ONE email covering both changes; nobody else does', async () => {
  setup(); const r = await run(); eq(r.status, 200); eq(calls.wa.length, 1); eq(calls.mail.length, 1);
  eq(calls.wa[0].body.to, '919876543210', 'number normalised with the 91 prefix'); eq(calls.mail[0].body.to, ['test@x.in']);
  const msg = calls.wa[0].body.template.components[0].parameters[0].text;
  ok(/Mehta & Co/.test(msg) && /Mehta v\. Orion \(CS 12\/2024\)/.test(msg), msg); ok(/01\.12\.2026 to 15\.01\.2027/.test(msg) && /10\.11\.2026/.test(msg), 'dates as DD.MM.YYYY: ' + msg); ok(!/\n/.test(msg), 'no newline in a template variable');
  eq(calls.wa[0].body.template.name, 'court_update', 'the alert template is used'); eq(r.body.court.sent, 2); });
await t('the same change is never sent twice', async () => { setup(); await run(); await run(); await run(); eq(calls.wa.length, 1); eq(calls.mail.length, 1); eq(sentRows().length, 4, 'two events x two channels recorded'); });
await t('a new change later is sent alone, not together with the old ones', async () => {
  setup(); await run(); NOW += 3600e3; db.tables.notification_events.push({ id: 'e3', firm_id: F, case_id: 'lc2', kind: 'case_disposed', title: 'Status changed from “PENDING” to “DISPOSED”', created_at: new Date(NOW - 60e3).toISOString() });
  await run(); eq(calls.wa.length, 2); const m = calls.wa[1].body.template.components[0].parameters[0].text; ok(/Rao v\. State/.test(m) && !/Mehta v\. Orion/.test(m), m); });
await t('quiet hours: nothing goes out at night, it goes in the morning', async () => {
  setup(); NOW = Date.parse('2026-11-17T20:00:00Z'); /* 01:30 IST */ let r = await run(); eq(calls.wa.length + calls.mail.length, 0); ok(r.body.court.waiting, 'says it is waiting');
  NOW = Date.parse('2026-11-17T22:30:00Z'); /* 04:00 IST */ await run(); eq(calls.wa.length, 0);
  NOW = Date.parse('2026-11-18T01:45:00Z'); /* 07:15 IST: the morning briefing also goes out now, so count only alert messages */ db.tables.notification_events.forEach(e => e.created_at = new Date(NOW - 3600e3).toISOString()); await run(); eq(calls.wa.filter(c => c.body.template.name === 'court_update').length, 1); });
await t('the waking-hours edges: 7 AM yes, 9:59 PM yes, 6:59 AM no, 10 PM no', async () => {
  for (const [iso, want] of [['2026-11-17T01:30:00Z', true], ['2026-11-17T16:29:00Z', true], ['2026-11-17T01:29:00Z', false], ['2026-11-17T16:30:00Z', false]]) { setup(); NOW = Date.parse(iso); db.tables.notification_events.forEach(e => e.created_at = new Date(NOW - 3600e3).toISOString()); await run(); eq(calls.wa.length > 0, want, iso); } });
await t('an advocate who turned court alerts off gets none; others on the case still do', async () => { setup({ team: ['Adv. Test', 'Adv. Other'] }); setState('u1', { courtAlerts: false }); await run(); eq(calls.wa.length, 1); eq(calls.wa[0].body.to, '919999900000'); });
await t('WhatsApp switched off keeps the email; email switched off keeps the WhatsApp', async () => {
  setup(); setState('u1', { whatsapp: false }); await run(); eq([calls.wa.length, calls.mail.length], [0, 1]);
  setup(); setState('u1', { email: false }); await run(); eq([calls.wa.length, calls.mail.length], [1, 0]); });
await t('a case with nobody assigned goes to the firm owner', async () => { setup({ team: [] }); await run(); eq(calls.wa.length, 1); eq(calls.wa[0].body.to, '919876543210'); });
await t('a member without a mobile number still gets the email', async () => { setup(); db.tables.members[0].phone = ''; await run(); eq([calls.wa.length, calls.mail.length], [0, 1]); });
await t('WhatsApp not configured: skipped without error, email unaffected', async () => { setup(); setEnv({ ...BASE, WHATSAPP_TOKEN: '' }); const r = await run(); eq(r.status, 200); eq([calls.wa.length, calls.mail.length], [0, 1]); });
await t('without a separate alert template, the existing template is used', async () => { setup(); setEnv({ ...BASE, WHATSAPP_ALERT_TEMPLATE: '' }); await run(); eq(calls.wa[0].body.template.name, 'daily_brief'); });
await t('a WhatsApp failure (e.g. template not approved) is recorded and retried at most three times', async () => {
  setup(); waMode = 'fail'; for (let i = 0; i < 6; i++) await run(); eq(calls.wa.length, 3, 'three attempts, then stop'); ok(db.tables.notifications.some(n => n.status === 'failed' && /template not approved/.test(n.error)), 'error kept'); eq(calls.mail.length, 1, 'email unaffected');
  waMode = 'ok'; await run(); eq(calls.wa.length, 3, 'does not resume after giving up'); });
await t('changes older than 48 hours are not sent', async () => { setup({ events: [{ id: 'old', firm_id: F, case_id: 'lc1', kind: 'new_order', title: 'New order dated 2026-10-01', created_at: agoH(60) }] }); const r = await run(); eq(calls.wa.length + calls.mail.length, 0); eq(r.body.court.events, 0); });
await t('a long burst is trimmed to fit and says how many more there are', async () => {
  const events = Array.from({ length: 40 }, (_, i) => ({ id: 'b' + i, firm_id: F, case_id: 'lc1', kind: 'new_order', title: 'New order dated 2026-10-' + String(i % 28 + 1).padStart(2, '0'), created_at: agoH(1) }));
  setup({ events }); await run(); const m = calls.wa[0].body.template.components[0].parameters[0].text; ok(m.length <= 1000, 'length ' + m.length); ok(/\+\d+ more in Legal Staff/.test(m), m.slice(-60)); const mail = calls.mail[0].body; ok(mail.text.split('\n').filter(l => /New order/.test(l)).length === 40, 'the email lists all of them'); });
await t('the email says the alert comes from the court-data check and points to the official portal', async () => { setup(); await run(); const h = calls.mail[0].body.html; ok(/not from the court/.test(h) && /official portal/.test(h)); ok(/Settings › Notifications/.test(h)); });
await t('secrets never reach the stored notifications or the message text', async () => { setup(); waMode = 'fail'; await run(); const all = JSON.stringify([db.tables.notifications, calls.wa.map(c => c.body), calls.mail.map(c => c.body)]); ok(!all.includes('EAAG-secret-token') && !all.includes('re_secret_key'), 'secret found'); });
await t('the alert pass cannot break the daily briefing job: a database error is contained', async () => { setup(); const real = db.tables.notification_events; db.tables.notification_events = null; const r = await run(); eq(r.status, 200); db.tables.notification_events = real; });
await t('the plain functions: dates, recipients, trimming', async () => {
  const block = src.slice(src.indexOf('// court-alerts logic:start'), src.indexOf('// logic:end', src.indexOf('// court-alerts logic:start')));
  const js = block.replace(/: (any|string|number)(\[\])?/g, '').replace(/<[^>]*>\(/g, '(').replace(/\bconst alertHourOk/, 'const alertHourOk'); const fns = new Function(js + '; return { dmyText, alertHourOk, alertRecipients, alertLine, alertWhatsApp };')();
  eq(fns.dmyText('moved 2026-12-01 to 2027-01-15'), 'moved 01.12.2026 to 15.01.2027'); eq(fns.alertHourOk(6), false); eq(fns.alertHourOk(7), true); eq(fns.alertHourOk(21), true); eq(fns.alertHourOk(22), false);
  eq(fns.alertLine({ title: 'x 2026-01-02' }, { title: 'A v. B', no: '1/2024' }), 'A v. B (1/2024): x 02.01.2026'); eq(fns.alertLine({ title: 'x' }, null), 'A case: x');
  eq(fns.alertRecipients([{ user_id: 'a', name: 'N', is_owner: false }, { user_id: 'b', name: 'O', is_owner: true }], { team: ['N'] }).map(m => m.user_id), ['a']); eq(fns.alertRecipients([{ user_id: 'a', name: 'N' }, { user_id: 'b', name: 'O', is_owner: true }], { team: [] }).map(m => m.user_id), ['b']);
  ok(fns.alertWhatsApp('F', ['a', 'b']).startsWith('Court record update · F. a ; b')); });

Date.now = realNow; globalThis.fetch = realFetch;
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

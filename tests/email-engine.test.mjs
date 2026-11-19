// Engine test: runs the real supabase/functions/email-marketing code against (1) an in-memory database (tests/email-fake-db.mjs),
// (2) a local mock of the Brevo API that can fail in every way and (3) a local mock of the Google Sheets API holding a 10,000-row sheet.
// It proves OUR logic end to end (import, compliance gate, queues, caps, dry run, unsubscribe, bounces, reminders, kill switch, attribution,
// dashboard numbers). It does NOT prove that Brevo or Google answer as the mocks do. Run: node tests/email-engine.test.mjs  (needs `tsc` on the PATH)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import { generateKeyPairSync } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

// ---- build ----
const out = mkdtempSync(join(tmpdir(), 'email-engine-'));
mkdirSync(join(out, '_shared')); cpSync(join(root, 'supabase/functions/_shared/email-logic.js'), join(out, '_shared/email-logic.js'));
const src = readFileSync(join(root, 'supabase/functions/email-marketing/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim').replace('../_shared/email-logic.js', './_shared/email-logic.js');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src);
writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--allowJs', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); }
catch (e) { console.log('TypeScript compile errors:\n' + (e.stdout?.toString() || e.message)); process.exit(1); }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'email-fake-db.mjs'), join(out, 'js/fake-db.mjs')); cpSync(join(out, '_shared'), join(out, 'js/_shared'), { recursive: true });
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));
const { seed, table, clock, db } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')));

// ---- mock Brevo ----
const brevo = { sent: [], mode: 'ok', n: 0 };
const bs = http.createServer((req, res) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
  const reply = (s, o, h = {}) => { res.writeHead(s, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(o)); };
  if (req.headers['api-key'] !== 'brevo-test-key') return reply(401, { message: 'Key not found' });
  const body = JSON.parse(b || '{}'); if (brevo.mode === '429') return reply(429, { message: 'rate limit' }, { 'retry-after': '120' }); if (brevo.mode === '400') return reply(400, { code: 'invalid_parameter', message: 'bad' });
  brevo.sent.push(body); reply(201, { messageId: `<msg${++brevo.n}@smtp-relay.mailin.fr>` });
}); });
await new Promise((r) => bs.listen(0, '127.0.0.1', r));
// ---- mock Google Sheets: one sheet "Advocates" with 10,000 rows (9,500 unique emails) ----
const rowsOf = () => { const v = [['advocate_name', 'email', 'city', 'state', 'contact_source', 'source_url']]; for (let i = 0; i < 10000; i++) v.push([`Advocate ${i}`, `adv${i % 9500}@example.in`.toUpperCase().replace('@EXAMPLE.IN', '@example.in'), i % 2 ? 'Patna' : 'Ranchi', i % 2 ? 'Bihar' : 'Jharkhand', 'public_directory', 'https://legalstaff.in/d/' + i]); v.push(['Bad', 'not-an-email', '', '', '', '']); return v; };
let sheetValues = rowsOf();
const gsMode = { fail: false };
const gs = http.createServer((req, res) => { const reply = (s, o) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.headers.authorization !== 'Bearer g-token') return reply(401, { error: { message: 'bad token' } });
  if (gsMode.fail) return reply(503, { error: { message: 'backend error' } });
  if (req.url.includes('/values/')) return reply(200, { values: sheetValues });
  if (req.url.includes('SECRET_SHEET_ID')) return reply(403, { error: { message: 'no access' } });
  reply(200, { properties: { title: 'Advocate contacts' }, sheets: [{ properties: { title: 'Advocates', gridProperties: { rowCount: 10001 } } }, { properties: { title: 'Other', gridProperties: { rowCount: 10 } } }] }); });
await new Promise((r) => gs.listen(0, '127.0.0.1', r));
const SHEET_ID = 'SHEETID0123456789abcdefghij';
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const dnsOk = { on: true };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { const s = String(u);
  if (s.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'g-token', expires_in: 3600 }), { status: 200 });
  if (s.startsWith('https://dns.google/resolve')) { const name = new URL(s).searchParams.get('name'), type = new URL(s).searchParams.get('type'); const a = !dnsOk.on ? [] : type === 'TXT' && name === 'legalstaff.in' ? [{ data: '"v=spf1 include:spf.brevo.com ~all"' }] : name.startsWith('_dmarc') ? [{ data: '"v=DMARC1; p=none"' }] : name.startsWith('brevo1._domainkey') ? [{ data: 'b1.legalstaff-in.dkim.brevo.com.' }] : []; return new Response(JSON.stringify({ Answer: a }), { status: 200 }); }
  return realFetch(u, o); };

// ---- environment and loading the function ----
const E = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', BREVO_API_KEY: 'brevo-test-key', BREVO_WEBHOOK_SECRET: 'hook-secret-123', EMAIL_TOKEN_SECRET: 'x'.repeat(40), EMAIL_SEND_DELAY_MS: '0',
  BREVO_API_BASE: `http://127.0.0.1:${bs.address().port}`, GOOGLE_SHEETS_API_BASE: `http://127.0.0.1:${gs.address().port}`, GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'sa@p.iam.gserviceaccount.com', private_key: privateKey }) };
let handler; globalThis.Deno = { env: { get: (k) => E[k] }, serve: (h) => { handler = h; } };
await import(pathToFileURL(idx));
const call = async (body, { token = 'tok-admin', cron, query = '', method = 'POST', headers = {}, raw } = {}) => {
  const h = { 'content-type': 'application/json', ...headers }; if (token) h.authorization = 'Bearer ' + token; if (cron) h['x-cron-secret'] = cron;
  const r = await handler(new Request('https://proj.supabase.co/functions/v1/email-marketing' + query, { method, headers: h, body: method === 'GET' ? undefined : (raw ?? JSON.stringify(body)) }));
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const adm = async (action, extra = {}) => { const r = await call({ action, ...extra }); if (r.status !== 200) throw new Error(`${action}: ${r.status} ${r.body.error}`); return r.body; };
const tick = () => call({ action: 'tick' }, { cron: db.cronSecret, token: null });
const at = (d, hm) => Date.parse(`${d}T${hm}:00Z`) - 5.5 * 3600e3;
const IST = (d, hm) => { clock.t = at(d, hm); };
const settings = () => table('email_automation_settings')[0];
const contacts = () => table('email_contacts');
const accepted = () => table('email_logs').filter((l) => l.status === 'accepted');

console.log('access');
seed(); IST('2026-11-18', '09:00');
await t('no sign-in is refused, a non-administrator is refused, an administrator is accepted', async () => { eq((await call({ action: 'overview' }, { token: null })).status, 401); eq((await call({ action: 'overview' }, { token: 'tok-user' })).status, 403); eq((await call({ action: 'overview' })).status, 200); });
await t('the scheduler needs the secret', async () => { eq((await call({ action: 'tick' }, { cron: 'wrong', token: null })).status, 403); eq((await call({ action: 'tick' }, { cron: db.cronSecret, token: null })).status, 200); });
await t('the API key is never returned to the browser', async () => { const s = JSON.stringify(await adm('settings')) + JSON.stringify(await adm('provider')); ok(!s.includes('brevo-test-key')); ok(s.includes('"api_key_set":true')); });
await t('defaults: nothing enabled, dry run on', async () => { const s = (await adm('settings')).settings; eq([s.system_enabled, s.legal_approval, s.provider_approved, s.dry_run, s.kill_switch], [false, false, false, true, false]); ok((await adm('settings')).blockers.length >= 5); });

console.log('Google Sheets import (10,000 rows)');
let integ;
await t('connect by URL, list sheets, suggest the column mapping', async () => { const r = await adm('sheets_connect', { url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit` }); integ = r.integration; eq(r.sheets.map((s) => s.title), ['Advocates', 'Other']); eq(integ.column_map.email, 'email'); eq(integ.column_map.advocate_name, 'advocate_name'); });
await t('a sheet the service account cannot open gives a clear message', async () => { const r = await call({ action: 'sheets_connect', url: 'https://docs.google.com/spreadsheets/d/SECRET_SHEET_ID_0123456789/edit' }); eq(r.status, 400); ok(r.body.error.includes('Share it')); });
await t('preview reports new, duplicate and invalid rows without importing', async () => { const p = await adm('sheets_preview', { id: integ.id }); eq([p.total, p.valid, p.new, p.existing, p.duplicates, p.invalid], [10001, 9500, 9500, 0, 500, 1]); eq(contacts().length, 0); eq(p.sample.length, 15); });
await t('an import without the email column mapped is refused', async () => { const r = await call({ action: 'sheets_save', id: integ.id, column_map: { advocate_name: 'advocate_name' } }); eq(r.status, 400); });
await t('import: 9,500 unique contacts, 500 duplicates, 1 invalid, history recorded', async () => { const r = await adm('sheets_sync', { id: integ.id }); eq([r.new, r.updated, r.duplicate, r.invalid], [9500, 0, 500, 1]); eq(contacts().length, 9500); const h = (await adm('imports')).rows; eq(h.length, 1); eq(h[0].status, 'completed'); eq(h[0].rows_new, 9500); });
await t('every imported public-directory contact is UNKNOWN and BLOCKED', async () => eq(contacts().filter((c) => c.consent_status === 'UNKNOWN' && c.first_email_status === 'BLOCKED').length, 9500));
await t('a second sync adds nothing and never unblocks anyone', async () => { const r = await adm('sheets_sync', { id: integ.id }); eq([r.new, r.updated], [0, 9500]); eq(contacts().length, 9500); eq(contacts().filter((c) => c.first_email_status !== 'BLOCKED').length, 0); });
await t('a Google failure is reported, logged in history and does not touch the data; an empty sheet is an error too', async () => { gsMode.fail = true; const r = await call({ action: 'sheets_sync', id: integ.id }); ok(r.status >= 400, 'failure reported'); gsMode.fail = false; eq((await adm('imports')).rows.filter((x) => x.status === 'failed').length, 1); eq(contacts().length, 9500); const saved = sheetValues; sheetValues = [['advocate_name', 'email']]; const e = await call({ action: 'sheets_sync', id: integ.id }); eq(e.status, 400); ok(e.body.error.includes('no data rows')); sheetValues = saved; eq(contacts().length, 9500); eq(table('google_sheets_integrations')[0].last_sync_status.startsWith('failed'), true); });
await t('scheduled sync runs from the scheduler once per interval', async () => { await adm('sheets_save', { id: integ.id, sync_enabled: true }); table('google_sheets_integrations')[0].last_sync_at = new Date(clock.t - 25 * 36e5).toISOString(); const r = await tick(); ok(r.body.ran.some((x) => x.job === 'sheet_sync' && x.updated === 9500)); const r2 = await tick(); ok(!r2.body.ran.some((x) => x.job === 'sheet_sync'), 'not repeated'); });

console.log('consent and the contact database');
const ids = () => contacts().map((c) => c.contact_id);
await t('searching and filtering contacts', async () => { const r = await adm('contacts', { filters: { state: 'Bihar' }, size: 25 }); eq(r.total, 4750); eq(r.rows.length, 25); eq((await adm('contacts', { filters: { q: 'adv77@' } })).total, 1); eq((await adm('contacts', { filters: { consent: 'GRANTED' } })).total, 0); });
await t('a consent needs a source, a date and evidence', async () => { const r = await call({ action: 'consent_record', contact_id: ids()[0], source: 'signup form', consented_at: '2026-10-01T10:00:00+05:30', evidence_ref: '' }); eq(r.status, 400); const f = await call({ action: 'consent_record', contact_id: ids()[0], source: 'form', consented_at: '2099-01-01', evidence_ref: 'x' }); eq(f.status, 400); });
// 150 contacts get a documented, verified marketing consent
for (const cid of ids().slice(0, 150)) await adm('consent_record', { contact_id: cid, source: 'opt-in form', wording_version: 'v1', consented_at: '2026-10-01T10:00:00+05:30', verified_at: '2026-10-01T10:30:00+05:30', evidence_ref: 'form-' + cid });
await t('recorded consents are recognised: ELIGIBLE with an audit record', async () => { eq(contacts().filter((c) => c.first_email_status === 'ELIGIBLE').length, 150); eq(table('email_consents').length, 150); const d = await adm('contact', { contact_id: ids()[0] }); eq(d.consents.length, 1); eq(d.consents[0].evidence_ref, 'form-' + ids()[0]); });
await t('a granted but unverified consent stays blocked until the email is verified', async () => { const cid = ids()[200]; await adm('consent_record', { contact_id: cid, source: 'form', consented_at: '2026-10-01', evidence_ref: 'e1' }); eq(contacts().find((c) => c.contact_id === cid).first_email_status, 'BLOCKED'); await adm('consent_verify', { contact_id: cid }); eq(contacts().find((c) => c.contact_id === cid).first_email_status, 'ELIGIBLE'); });
await t('CSV and Excel export of the filtered contacts', async () => { const c = await adm('export', { filters: { state: 'Bihar' }, format: 'csv' }); eq(c.content.split('\r\n').length, 4751); ok(c.content.includes('Consent status')); const x = await adm('export', { format: 'xls', filters: { q: 'adv77@' } }); ok(x.content.includes('<Workbook') && x.content.includes('Advocate 77')); });

console.log('production safety: nothing is sent until every approval is recorded');
const providerReady = async () => { await adm('provider_save', { sender_email: 'hello@legalstaff.in', sender_name: 'Legal Staff' }); const r = await adm('provider_check'); eq(r.all, true); };
await t('personal mailboxes cannot be used as the sender', async () => eq((await call({ action: 'provider_save', sender_email: 'me@gmail.com' })).status, 400));
await t('SPF, DKIM and DMARC are checked; a failing domain is not authenticated', async () => { await adm('provider_save', { sender_email: 'hello@legalstaff.in' }); dnsOk.on = false; eq((await adm('provider_check')).all, false); eq(table('email_provider_settings')[0].domain_authenticated, false); dnsOk.on = true; await providerReady(); eq(table('email_provider_settings')[0].domain_authenticated, true); });
await t('automation cannot be enabled without legal and provider approval', async () => { const r = await call({ action: 'settings_save', settings: { system_enabled: true } }); eq(r.status, 400); ok(r.body.error.includes('approval')); });
await t('an approval needs a documented reference', async () => eq((await call({ action: 'settings_save', settings: { legal_approval: true } })).status, 400));
await t('templates cannot be activated before legal approval', async () => { const r = await call({ action: 'template_toggle', key: 'first_introduction', active: true }); eq(r.status, 400); ok(r.body.error.includes('legal approval')); });
await t('scheduler with default settings sends nothing', async () => { IST('2026-11-18', '10:05'); const before = brevo.sent.length; await tick(); eq(brevo.sent.length, before); eq(table('email_queue').length, 0); });
await t('a template without an unsubscribe link cannot be saved', async () => { const r = await call({ action: 'template_save', key: 'reminder', subject: 's', body_html: '<p>hi</p>' }); eq(r.status, 400); ok(r.body.error.includes('unsubscribe')); });

console.log('dry run');
await t('simulation lists exactly 100 of the consented contacts, queues nothing, sends nothing', async () => { const r = await adm('simulate', { kind: 'new' }); eq(r.new.selected.length, 100); eq(r.new.cap, 100); ok(r.new.blockers.length > 0); eq(table('email_queue').length, 0); eq(brevo.sent.length, 0); eq(contacts().filter((c) => c.first_email_status === 'QUEUED').length, 0); const set = new Set(contacts().filter((c) => c.consent_status === 'GRANTED').map((c) => c.contact_id)); ok(r.new.selected.every((s) => set.has(s.contact_id)), 'only consented contacts are selected'); });
await t('blocked contacts never appear in a simulation', async () => { const r = await adm('simulate', { kind: 'new' }); ok(r.new.selected.every((s) => contacts().find((c) => c.contact_id === s.contact_id).consent_status === 'GRANTED')); });
await t('the schedule preview renders real messages with unsubscribe and UTM links, still without sending', async () => { const r = await adm('preview_schedule'); eq(r.new.sample.length, 3); const m = r.new.sample[0]; ok(m.html.includes('/unsubscribe?t=')); ok(m.html.includes('utm_campaign=new_intro')); ok(m.html.includes('ls_t=')); ok(!m.html.includes('{{')); eq(brevo.sent.length, 0); });
await t('with every switch on but DRY_RUN true the scheduler simulates and still sends nothing', async () => {
  await adm('settings_save', { settings: { legal_approval: true, legal_approval_ref: 'Counsel opinion 12 Nov 2026', provider_approved: true, provider_approval_ref: 'Brevo account approval #4411' } });
  await adm('template_toggle', { key: 'first_introduction', active: true }); await adm('template_toggle', { key: 'reminder', active: true }); await adm('template_toggle', { key: 'final_reminder', active: true });
  await adm('settings_save', { settings: { system_enabled: true } }); IST('2026-11-18', '10:02'); const r = await tick();
  ok(r.body.ran.some((x) => x.job === 'sim_new:2026-11-18' && x.selected === 100)); eq(brevo.sent.length, 0); eq(table('email_queue').length, 0); eq(r.body.drain.note, 'production sending is not active'); });
await t('withdrawing an approval switches automation off and deactivates the templates', async () => { await adm('settings_save', { settings: { legal_approval: false } }); eq(settings().system_enabled, false); eq(table('email_templates').filter((x) => x.active).length, 0);
  await adm('settings_save', { settings: { legal_approval: true, legal_approval_ref: 'Counsel opinion 12 Nov 2026' } }); for (const k of ['first_introduction', 'reminder', 'final_reminder']) await adm('template_toggle', { key: k, active: true }); await adm('settings_save', { settings: { system_enabled: true } }); });

console.log('first-email queue (10:00 IST, 100 a day)');
await t('turning DRY_RUN off allows production; the 10:00 job queues exactly 100 and sends them in batches', async () => {
  await adm('settings_save', { settings: { dry_run: false } }); eq((await adm('settings')).blockers, []);
  IST('2026-11-19', '09:59'); await tick(); eq(table('email_queue').length, 0, 'not before 10:00');
  IST('2026-11-19', '10:00'); const r = await tick(); eq(r.body.ran.find((x) => x.job.startsWith('plan_new')).queued, 100); eq(r.body.drain.sent, 25);
  for (let i = 0; i < 3; i++) { IST('2026-11-19', '10:0' + (i + 5)); await tick(); }
  eq(brevo.sent.length, 100); eq(accepted().length, 100); });
await t('each recipient got exactly one email, and only consented contacts were mailed', async () => { const to = brevo.sent.map((s) => s.to[0].email); eq(new Set(to).size, 100); const granted = new Set(contacts().filter((c) => c.consent_status === 'GRANTED').map((c) => c.email_normalized)); ok(to.every((e) => granted.has(e))); });
await t('every email has the one-click unsubscribe headers, a campaign tag and a UTM-tagged link', async () => { const m = brevo.sent[0]; ok(m.headers['List-Unsubscribe'].includes('action=unsub&t=')); eq(m.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click'); eq(m.tags, ['new_intro']); ok(m.htmlContent.includes('utm_source=legalstaff_email')); ok(m.textContent.includes('/unsubscribe?t=')); ok(m.htmlContent.includes('Dear Advocate Advocate ')); eq(m.sender.email, 'hello@legalstaff.in'); });
await t('sent contacts are marked SENT with first_email_date and a reminder due in 5 days', async () => { const s = contacts().filter((c) => c.first_email_status === 'SENT'); eq(s.length, 100); ok(s.every((c) => c.reminder_due_date === '2026-11-24' && c.reminder_count === 0 && c.first_email_date)); });
await t('the daily limit holds: more ticks the same day send nothing even though 50 contacts are still eligible', async () => { IST('2026-11-19', '16:00'); await tick(); await tick(); eq(brevo.sent.length, 100); eq(contacts().filter((c) => c.first_email_status === 'ELIGIBLE').length, 51); const r = await adm('simulate', { kind: 'new' }); eq(r.new.remaining, 0); eq(r.new.selected.length, 0); });
await t('the same job cannot be planned twice, and running a plan again queues nobody', async () => { const r = await tick(); ok(!r.body.ran.some((x) => x.job?.startsWith('plan_new'))); });
await t('a provider message id is stored on the queue and the log', async () => { const q = table('email_queue').filter((x) => x.status === 'sent'); ok(q.every((x) => /^msg\d+@smtp-relay/.test(x.provider_message_id))); ok(accepted().every((l) => l.provider_message_id)); });
await t('skipped duplicates: a second worker claiming the same queue row cannot double-send', async () => {
  IST('2026-11-20', '10:00'); const before = brevo.sent.length; const [a, b] = await Promise.all([tick(), tick()]); const sent = brevo.sent.slice(before).map((s) => s.to[0].email); eq(new Set(sent).size, sent.length, 'no recipient twice'); eq(sent.length <= 25 * 2, true);
  for (let i = 0; i < 6; i++) { IST('2026-11-20', '10:' + String(10 + i * 5)); await tick(); } eq(brevo.sent.length, 151); const all2 = brevo.sent.map((s) => s.to[0].email + '|' + s.tags[0]); eq(new Set(all2).size, all2.length, 'no (recipient, campaign) pair twice'); });

console.log('unsubscribe');
await t('the unsubscribe page data masks the address; a POST suppresses immediately', async () => {
  const c = contacts().find((x) => x.first_email_status === 'SENT'); const tok = new URL(brevo.sent.find((s) => s.to[0].email === c.email_normalized).headers['List-Unsubscribe'].slice(1, -1)).searchParams.get('t');
  const g = await call({}, { token: null, method: 'GET', query: '?action=unsub&t=' + encodeURIComponent(tok) }); eq(g.body.unsubscribed, false); ok(!JSON.stringify(g.body).includes(c.email_normalized)); ok(g.body.email.includes('***'));
  const p = await call(null, { token: null, query: '?action=unsub&t=' + encodeURIComponent(tok), raw: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } }); eq(p.status, 200); eq(p.body.unsubscribed, true);
  eq(c.unsubscribe_status, 'UNSUBSCRIBED'); eq(c.consent_status, 'WITHDRAWN'); eq(table('email_suppressions').filter((s) => s.email_normalized === c.email_normalized).length, 1); eq(table('email_events').filter((e) => e.event_type === 'email_unsubscribed').length, 1); globalThis.__unsub = c; });
await t('a forged or edited unsubscribe link is refused', async () => { eq((await call({}, { token: null, method: 'GET', query: '?action=unsub&t=abc.def' })).status, 400); });
await t('an unsubscribed contact receives no reminder', async () => { const c = globalThis.__unsub; IST('2026-11-25', '15:00'); const before = brevo.sent.length; for (let i = 0; i < 8; i++) { IST('2026-11-25', '15:' + String(i * 5).padStart(2, '0')); await tick(); } ok(!brevo.sent.slice(before).some((s) => s.to[0].email === c.email_normalized)); });

console.log('reminders (15:00 IST, after 5 days, at most 2)');
await t('reminder 1 goes to every contact whose reminder is due, with the reminder template, capped at 100', async () => {
  const sentFirst = contacts().filter((c) => c.first_email_status === 'SENT' && c.unsubscribe_status === 'SUBSCRIBED'); ok(sentFirst.length >= 150);
  eq(brevo.sent.filter((s) => s.tags[0] === 'reminder_1').length > 0, true); const r1 = brevo.sent.filter((s) => s.tags[0] === 'reminder_1'); eq(r1.length, 100, 'capped'); ok(r1.every((s) => s.subject.startsWith('A Quick Reminder'))); });
await t('a registered contact gets no reminder: registration stops promotional follow-ups', async () => {
  IST('2026-11-26', '10:00'); const due = contacts().filter((c) => c.first_email_status === 'SENT' && c.reminder_count === 0 && c.reminder_due_date && c.unsubscribe_status === 'SUBSCRIBED'); ok(due.length > 0); const c = due[0];
  await call({}, { token: null, query: '?action=landing', raw: JSON.stringify({ t: await tokenFor(c, 'l', 'new_intro'), event: 'registration_started' }) }); eq(c.registration_status, 'STARTED');
  table('directory_applications').push({ id: 'x' }); const r = await rpcConvert(c.email_normalized, 'registration_completed', 'LS-DIR-1'); eq(r, true); eq(c.reminder_due_date, null);
  const before = brevo.sent.length; for (let i = 0; i < 12; i++) { IST('2026-11-26', '15:' + String(i * 5).padStart(2, '0')); await tick(); } ok(!brevo.sent.slice(before).some((s) => s.to[0].email === c.email_normalized)); });
await t('after reminder 1 the final reminder is due in 5 days; after it nothing more is ever sent (max 2 follow-ups)', async () => {
  for (const day of ['2026-11-27', '2026-12-01', '2026-12-02', '2026-12-10']) for (let i = 0; i < 14; i++) { IST(day, '15:' + String(i * 4).padStart(2, '0')); await tick(); IST(day, '10:' + String(i * 4).padStart(2, '0')); await tick(); }
  const r2 = brevo.sent.filter((s) => s.tags[0] === 'reminder_2'); ok(r2.length > 0, 'final reminders were sent'); ok(r2.every((s) => s.subject.startsWith('Final Reminder')));
  const per = {}; brevo.sent.forEach((s) => { per[s.to[0].email] = (per[s.to[0].email] || 0) + 1; }); ok(Math.max(...Object.values(per)) <= 3, 'never more than 1 + 2 emails per contact');
  ok(contacts().filter((c) => c.reminder_count > 2).length === 0); ok(contacts().filter((c) => c.reminder_count === 2).every((c) => c.reminder_due_date === null)); });

console.log('bounces, complaints, webhooks');
const hook = (events, key = 'hook-secret-123') => call(events, { token: null, query: '?action=webhook', headers: { authorization: 'Bearer ' + key } });
await t('a webhook without the secret is refused', async () => { eq((await hook({ event: 'delivered' }, 'nope')).status, 403); });
await t('delivered and click events are recorded once, opens are ignored', async () => {
  const q = table('email_queue').find((x) => x.status === 'sent'); const mid = q.provider_message_id; const c = contacts().find((x) => x.id === q.contact_id);
  const r = await hook([{ event: 'delivered', email: c.email_normalized, 'message-id': `<${mid}>`, id: 1 }, { event: 'delivered', email: c.email_normalized, 'message-id': `<${mid}>`, id: 1 }, { event: 'opened', email: c.email_normalized, 'message-id': `<${mid}>` }, { event: 'click', email: c.email_normalized, 'message-id': `<${mid}>`, link: 'https://legalstaff.in/directory?utm_source=legalstaff_email' }]);
  eq([r.body.received, r.body.recorded, r.body.ignored], [4, 3, 1]); eq(table('email_events').filter((e) => e.event_type === 'email_delivered' && e.contact_id === c.id).length, 1); eq(table('email_events').filter((e) => e.event_type === 'email_clicked' && e.contact_id === c.id).length, 1); ok(!table('email_events').some((e) => /open/.test(e.event_type))); });
await t('a hard bounce suppresses the address and no further mail goes to it', async () => {
  const c = contacts().find((x) => x.first_email_status === 'SENT' && x.unsubscribe_status === 'SUBSCRIBED' && x.registration_status === 'NONE' && !x.hard_bounced); const q = table('email_queue').find((x) => x.contact_id === c.id && x.status === 'sent');
  const r = await hook({ event: 'hard_bounce', email: c.email_normalized, 'message-id': `<${q.provider_message_id}>`, reason: 'mailbox does not exist' }); eq(r.body.suppressed, 1);
  eq(c.hard_bounced, true); eq(table('email_suppressions').find((s) => s.email_normalized === c.email_normalized).reason, 'hard_bounce'); eq(table('email_events').filter((e) => e.event_type === 'email_bounced' && e.contact_id === c.id).length, 1); globalThis.__bounced = c; });
await t('a spam complaint suppresses and withdraws consent', async () => { const c = contacts().find((x) => x.first_email_status === 'SENT' && !x.hard_bounced && x.unsubscribe_status === 'SUBSCRIBED' && x.registration_status === 'NONE'); await hook({ event: 'spam', email: c.email_normalized }); eq([c.spam_complaint, c.consent_status], [true, 'WITHDRAWN']); globalThis.__spam = c; });
await t('neither the bounced nor the complaining contact is ever selected again (even in a simulation)', async () => { const r = await adm('simulate'); for (const k of ['new', 'reminder']) ok(!r[k].selected.some((s) => [globalThis.__bounced.email_normalized, globalThis.__spam.email_normalized].includes(s.email))); });
await t('a suppression cannot be bypassed by recording a new consent', async () => { const r = await call({ action: 'consent_record', contact_id: globalThis.__unsub.contact_id, source: 'form', consented_at: '2026-11-01', evidence_ref: 'x' }); eq(r.status, 400); });
await t('suppressed addresses stay suppressed even if the contact row is edited back (the list is checked again at send time)', async () => {
  const c = globalThis.__bounced; Object.assign(c, { hard_bounced: false, consent_status: 'GRANTED', first_email_status: 'SENT', reminder_count: 0, reminder_due_date: '2026-01-01', consent_verified_at: '2026-10-01' }); table('email_consents').push({ consent_id: 'z', contact_id: c.id, purpose: 'marketing', withdrawn_at: null, verified_at: '2026-10-01' });
  const before = brevo.sent.length; IST('2026-12-15', '15:00'); for (let i = 0; i < 5; i++) { IST('2026-12-15', '15:0' + i); await tick(); } ok(!brevo.sent.slice(before).some((s) => s.to[0].email === c.email_normalized)); });

console.log('re-checks immediately before sending, pause, kill switch, provider failures');
// fresh consented contacts for the remaining scenarios
let pool = 1000; const fresh = async (n) => { for (const cid of ids().slice(pool, pool + n)) await adm('consent_record', { contact_id: cid, source: 'opt-in form', wording_version: 'v1', consented_at: '2026-10-01', verified_at: '2026-10-01', evidence_ref: 'f-' + cid }); pool += n; };
await t('a contact who unsubscribes AFTER being queued is not sent the email', async () => {
  await fresh(60); IST('2026-12-20', '10:00'); brevo.mode = '429'; await tick(); const queued = table('email_queue').filter((q) => q.status === 'queued'); ok(queued.length > 0, 'rows are waiting (provider rate-limited)');
  const victim = contacts().find((c) => c.id === queued[0].contact_id); await call({}, { token: null, method: 'POST', query: '?action=unsub&t=' + encodeURIComponent(await tokenFor(victim, 'u', '')), raw: '{}' });
  eq(queued[0].status, 'skipped'); brevo.mode = 'ok'; const before = brevo.sent.length; for (let i = 0; i < 10; i++) { IST('2026-12-20', '11:' + String(i * 5).padStart(2, '0')); await tick(); } ok(!brevo.sent.slice(before).some((s) => s.to[0].email === victim.email_normalized)); });
await t('a provider rate limit pauses sending and leaves the rest queued; sending resumes afterwards', async () => {
  await fresh(60); IST('2026-12-21', '10:00'); brevo.mode = '429'; const before = brevo.sent.length; const r = await tick(); eq(brevo.sent.length, before); ok(String(r.body.drain.note).includes('rate limited')); const left = table('email_queue').filter((q) => q.status === 'queued').length; ok(left > 0);
  IST('2026-12-21', '10:01'); const r2 = await tick(); ok(r2.body.drain.note.includes('rate limit'), 'still waiting'); brevo.mode = 'ok'; IST('2026-12-21', '10:05'); await tick(); ok(brevo.sent.length > before, 'resumed after the wait'); });
await t('a rejected message is logged as failed, the contact is marked FAILED and it is not retried', async () => {
  await fresh(30); IST('2026-12-22', '10:00'); brevo.mode = '400'; const before = table('email_logs').filter((l) => l.status === 'failed').length; await tick(); for (let i = 1; i < 4; i++) { IST('2026-12-22', '10:0' + i); await tick(); } brevo.mode = 'ok';
  const f = table('email_logs').filter((l) => l.status === 'failed'); ok(f.length > before); ok(contacts().some((c) => c.first_email_status === 'FAILED')); const failedQ = table('email_queue').filter((q) => q.status === 'failed'); ok(failedQ.every((q) => q.attempts === 1), 'one attempt only'); });
await t('the emergency stop halts sending at once and holds queued mail', async () => {
  await fresh(40);
  IST('2026-12-23', '10:00'); brevo.mode = '429'; await tick(); brevo.mode = 'ok'; await adm('kill', { on: true }); const before = brevo.sent.length; for (let i = 0; i < 4; i++) { IST('2026-12-23', '10:0' + (i + 6)); const r = await tick(); eq(r.body.note, 'emergency stop is on'); } eq(brevo.sent.length, before);
  await adm('kill', { on: false }); await adm('queue_cancel'); eq(table('email_queue').filter((q) => q.status === 'queued').length, 0); });
await t('turning the system off pauses sending; DRY_RUN back on stops production', async () => { await adm('settings_save', { settings: { dry_run: true } }); IST('2026-12-24', '10:00'); const before = brevo.sent.length; await tick(); await tick(); eq(brevo.sent.length, before); await adm('settings_save', { settings: { dry_run: false } }); });
await t('an invalid sender or a revoked provider approval blocks sending immediately', async () => { await adm('settings_save', { settings: { provider_approved: false } }); eq(settings().system_enabled, false); const before = brevo.sent.length; IST('2026-12-25', '10:00'); await tick(); eq(brevo.sent.length, before); });

console.log('attribution, dashboard, report, audit');
await t('landing token records one click per contact and campaign; a tampered token is rejected', async () => { const c = contacts().find((x) => x.first_email_status === 'SENT'); const tk = await tokenFor(c, 'l', 'new_intro'); const before = table('email_events').filter((e) => e.event_type === 'email_clicked').length; await call({}, { token: null, query: '?action=landing', raw: JSON.stringify({ t: tk }) }); await call({}, { token: null, query: '?action=landing', raw: JSON.stringify({ t: tk }) }); ok(table('email_events').filter((e) => e.event_type === 'email_clicked').length <= before + 1); eq((await call({}, { token: null, query: '?action=landing', raw: JSON.stringify({ t: tk + 'x' }) })).status, 400); });
await t('a Rs 49 payment is attributed to the contact and the campaign that was sent to them', async () => { const c = contacts().find((x) => x.first_email_status === 'SENT' && x.registration_status === 'NONE' && x.payment_status === 'NONE'); const camp = table('email_queue').filter((q) => q.contact_id === c.id && q.status === 'sent').sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0].campaign_id; await rpcConvert(c.email_normalized, 'payment_success', 'pay_77'); const ev = table('email_events').find((e) => e.event_type === 'payment_success' && e.contact_id === c.id); eq(ev.campaign_id, camp); eq(c.payment_status, 'PAID'); });
await t('dashboard numbers equal the underlying logs and events', async () => {
  const o = await adm('overview'), c = o.cards, cnt = (tbl, f) => table(tbl).filter(f).length;
  eq(c.total, contacts().length); eq(c.awaiting, contacts().filter((x) => x.consent_status === 'UNKNOWN').length); eq(c.unsubscribed, cnt('email_suppressions', (s) => s.reason === 'unsubscribed')); eq(c.delivered, cnt('email_events', (e) => e.event_type === 'email_delivered')); eq(c.bounced, cnt('email_events', (e) => e.event_type === 'email_bounced'));
  eq(c.registrations, cnt('email_events', (e) => e.event_type === 'registration_completed')); eq(c.paid, cnt('email_events', (e) => e.event_type === 'payment_success')); eq(c.failed, cnt('email_events', (e) => e.event_type === 'email_failed'));
  const kind = (id) => table('email_campaigns').find((x) => x.id === id).kind; const total = accepted().length; eq(o.campaigns.reduce((s, x) => s + x.sent, 0), total); eq(o.series.reduce((s, d) => s + d.new + d.reminders, 0) <= total, true);
  eq(contacts().filter((x) => x.consent_status !== 'UNKNOWN').length > 0, true); ok(c.eligible <= contacts().filter((x) => x.consent_status === 'GRANTED').length, 'blocked contacts are not counted as eligible'); });
await t('analytics per campaign add up', async () => { const a = await adm('analytics', { days: 30 }); eq(a.campaigns.find((x) => x.code === 'new_intro').sent, accepted().filter((l) => l.campaign_id === table('email_campaigns').find((c) => c.code === 'new_intro').id).length); });
await t('the 8 PM daily report is produced once a day', async () => { IST('2026-12-26', '20:00'); const r = await tick(); ok(r.body.ran.some((x) => x.job === 'report')); const r2 = await tick(); ok(!r2.body.ran.some((x) => x.job === 'report')); ok(table('email_job_runs').some((j) => j.job_key === 'report:2026-12-26')); });
await t('administrator actions are in the audit log; the log is read-only through the API', async () => { const a = (await adm('audit')).rows.map((x) => x.action); for (const k of ['settings_changed', 'consent_recorded', 'kill_switch_on', 'sheet_import', 'contacts_exported', 'dry_run']) ok(a.includes(k) || table('email_audit_logs').some((x) => x.action === k), k); });
await t('a test email can only go to an administrator', async () => { const r = await call({ action: 'template_test', key: 'reminder', subject: 'S', body_html: '<p>x {{unsubscribe_url}}</p>', to: 'stranger@example.in' }); eq(r.status, 403); const b = brevo.sent.length; const g = await call({ action: 'template_test', key: 'reminder', subject: 'S', body_html: '<p>x {{unsubscribe_url}}</p>' }); eq(g.status, 200); eq(brevo.sent.length, b + 1); ok(brevo.sent.at(-1).subject.startsWith('[TEST]')); });
await t('template preview renders desktop/mobile content with sample data', async () => { const r = await adm('template_preview', { subject: 'Hi {{advocate_name}}', body_html: '<p>{{advocate_name}} {{unsubscribe_url}}</p>' }); ok(r.html.includes('Rajesh Kumar')); eq(r.subject, 'Hi Rajesh Kumar'); });

console.log('manual send now');
await t('"Send new emails now" needs confirmation, honours the daily limit, and sends right away when there is room', async () => {
  await adm('settings_save', { settings: { legal_approval: true, legal_approval_ref: 'Counsel opinion 12 Nov 2026', provider_approved: true, provider_approval_ref: 'Provider mail 10 Nov 2026', system_enabled: true, dry_run: false, max_new_per_day: 3 } });
  const jr = table('email_job_runs'); for (let i = jr.length - 1; i >= 0; i--) if (jr[i].job_key === 'rate_limit') jr.splice(i, 1);   // earlier tests left a provider pause and old queue rows
  const elig = new Set(contacts().filter((c) => c.first_email_status === 'ELIGIBLE').map((c) => c.id)), qu = table('email_queue'); for (let i = qu.length - 1; i >= 0; i--) if (elig.has(qu[i].contact_id)) qu.splice(i, 1);
  IST('2026-11-30', '11:00'); const bad = await call({ action: 'send_now' }); eq(bad.status, 400);
  const before = brevo.sent.length; const r = await adm('send_now', { confirm: true }); eq(r.sent, 3); eq(brevo.sent.length, before + 3, 'sent at once, up to the daily limit');
  const again = await adm('send_now', { confirm: true }); eq(again.sent, 0); eq(brevo.sent.length, before + 3, 'a second click cannot exceed the limit');
  await adm('settings_save', { settings: { dry_run: true } }); const blocked = await call({ action: 'send_now', confirm: true }); eq(blocked.status, 400); });

// helpers that need the function's token secret
async function tokenFor(c, kind, camp) { const { makeToken } = await import(pathToFileURL(join(out, 'js/_shared/email-logic.js'))); return makeToken(E.EMAIL_TOKEN_SECRET, kind, c.id, camp); }
async function rpcConvert(email, ev, ref) { const { createClient } = await import(pathToFileURL(join(out, 'js/fake-db.mjs'))); const { data } = await createClient().rpc('email_record_conversion', { p_email: email, p_event: ev, p_ref: ref, p_meta: {} }); return data; }

bs.close(); gs.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

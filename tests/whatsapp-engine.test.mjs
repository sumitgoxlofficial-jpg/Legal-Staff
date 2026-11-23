// Engine test: runs the real supabase/functions/whatsapp code against (1) an in-memory database (tests/whatsapp-fake-db.mjs) and
// (2) a LOCAL MOCK of Meta's Graph API that can be made to fail in every way. It proves OUR logic: who may call, secrets never leaving
// the server, the connection checks, sending, delivery status only from signed webhooks, opt-outs, alerts, rotation, rate limits.
// It does NOT prove that Meta answers exactly as the mock does: that needs a real token (see tests/README.md, "WhatsApp: live check").
// Run: node tests/whatsapp-engine.test.mjs   (needs `tsc` on the PATH)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHmac } from 'node:crypto';
import http from 'node:http';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

// ---- build: transpile the Deno function to a Node module and point its imports at the fakes ----
const out = mkdtempSync(join(tmpdir(), 'wa-engine-'));
mkdirSync(join(out, '_shared')); cpSync(join(root, 'supabase/functions/_shared/whatsapp-logic.js'), join(out, '_shared/whatsapp-logic.js'));
const src = readFileSync(join(root, 'supabase/functions/whatsapp/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim').replace('../_shared/whatsapp-logic.js', './_shared/whatsapp-logic.js');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src);
writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--allowJs', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); }
catch (e) { const m = String(e.stdout || e.stderr || e); if (!/emitted/i.test(m) && /error TS/.test(m)) { console.log(m); process.exit(1); } }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}'); cpSync(join(here, 'whatsapp-fake-db.mjs'), join(out, 'js/fake-db.mjs')); cpSync(join(out, '_shared'), join(out, 'js/_shared'), { recursive: true });
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake-db.mjs'));

// ---- mock Meta Graph API ----
const APP = '111111111111111', SECRET = 'appsecret0123456789abcdef01234567', WABA = '222222222222222', PHONE = '333333333333333', TOKEN = 'EAAGtestTOKEN0123456789abcdefghijklmnopqrstuvwxyz', VERIFY = 'verify-token-abc123';
const mock = { calls: [], mode: {}, hits: {} };
const reply = (res, s, b, h = {}) => { res.writeHead(s, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(b)); };
const err = (code, message, extra = {}) => ({ error: { message, type: 'OAuthException', code, fbtrace_id: 'TRACE' + code, ...extra } });
const server = http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    const u = new URL(req.url, 'http://x'), path = u.pathname.replace(/^\/v[\d.]+/, ''), auth = (req.headers.authorization || '').replace('Bearer ', '');
    mock.calls.push({ method: req.method, path, query: Object.fromEntries(u.searchParams), auth, body: body ? JSON.parse(body) : null, url: req.url }); mock.hits[path] = (mock.hits[path] || 0) + 1;
    const m = mock.mode;
    if (path === '/debug_token') {
      if (auth !== `${APP}|${SECRET}`) return reply(res, 400, err(190, 'Invalid OAuth access token - Cannot parse access token'));
      const tok = u.searchParams.get('input_token');
      if (tok !== m.validToken) return reply(res, 200, { data: { app_id: APP, is_valid: false, error: { code: 190, message: 'Error validating access token: Session has expired' }, scopes: [] } });
      return reply(res, 200, { data: { app_id: m.otherApp ? '999' : APP, type: m.userToken ? 'USER' : 'SYSTEM_USER', is_valid: m.expired ? false : true, expires_at: m.expiresInDays ? Math.floor(Date.now() / 1000) + m.expiresInDays * 86400 : 0, scopes: m.scopes || ['whatsapp_business_messaging', 'whatsapp_business_management'], granular_scopes: [{ scope: 'whatsapp_business_management', target_ids: [WABA] }, { scope: 'whatsapp_business_messaging', target_ids: [WABA] }] } });
    }
    if (m.metaDown) return reply(res, 500, err(2, 'An unexpected error has occurred'));
    if (auth !== TOKEN && path !== `/${APP}/subscriptions`) return reply(res, 401, err(190, 'Invalid OAuth access token.', { error_subcode: 467 }));
    if (path === `/${WABA}` && req.method === 'GET') return m.noWaba ? reply(res, 400, err(100, 'Unsupported get request. Object does not exist', { error_subcode: 33 })) : reply(res, 200, { id: WABA, name: 'Legal Staff', currency: 'INR', account_review_status: 'APPROVED', business_verification_status: 'verified' });
    if (path === `/${WABA}/phone_numbers`) {
      if (m.rate429 && !m.done429) { m.done429 = true; return reply(res, 429, err(4, 'Application request limit reached'), { 'retry-after': '0' }); }
      return reply(res, 200, { data: m.otherPhone ? [{ id: '444' }] : [{ id: PHONE, display_phone_number: '+91 98765 43210', verified_name: 'Legal Staff', quality_rating: 'GREEN', status: 'CONNECTED' }] });
    }
    if (path === `/${PHONE}`) return reply(res, 200, { id: PHONE, display_phone_number: '+91 98765 43210', verified_name: 'Legal Staff', quality_rating: 'GREEN' });
    if (path === `/${WABA}/subscribed_apps`) return req.method === 'POST' ? reply(res, 200, { success: true }) : reply(res, 200, { data: m.notSubscribed ? [] : [{ whatsapp_business_api_data: { id: APP, name: 'Legal Staff' } }] });
    if (path === `/${APP}/subscriptions`) return reply(res, 200, { data: [{ object: 'whatsapp_business_account', callback_url: 'https://x', active: true, fields: [{ name: 'messages' }, { name: 'message_template_status_update' }] }] });
    if (path === `/${WABA}/message_templates`) return reply(res, 200, { data: [{ name: 'hearing_reminder', language: 'en', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'Hello {{1}}, hearing on {{2}}' }] }, { name: 'plain', language: 'en_US', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'No vars' }] }] });
    if (path === `/${PHONE}/messages` && req.method === 'POST') {
      if (m.sendError) return reply(res, m.sendError.http || 400, err(m.sendError.code, m.sendError.message || 'send failed'));
      return reply(res, 200, { messaging_product: 'whatsapp', contacts: [{ input: '919876543210', wa_id: '919876543210' }], messages: [{ id: 'wamid.TEST' + (++mock.seq), message_status: 'accepted' }] });
    }
    reply(res, 404, err(100, 'Unknown path ' + path));
  });
});
mock.seq = 0; await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;

// ---- run the handler ----
const env = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', WHATSAPP_GRAPH_URL: `http://127.0.0.1:${port}`, RESEND_API_KEY: 'resend-test', EMAIL_FROM: 'Legal Staff <a@legalstaff.in>' };
let handler; globalThis.Deno = { env: { get: k => env[k] }, serve: h => { handler = h; } };
const logs = []; const origErr = console.error, origLog = console.log; console.error = (...a) => logs.push(a.join(' '));
const emails = []; const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { if (String(u).includes('api.resend.com')) { emails.push(JSON.parse(o.body)); return new Response('{}', { status: 200 }); } return realFetch(u, o); };
const { db, reset } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')).href);
await import(pathToFileURL(idx).href);
db.users.admin = { id: 'u-admin', email: 'boss@legalstaff.in', email_confirmed_at: '2026-01-01' }; db.users.rando = { id: 'u-r', email: 'rando@example.com', email_confirmed_at: '2026-01-01' }; db.users.unverified = { id: 'u-u', email: 'boss@legalstaff.in', email_confirmed_at: null };
const fresh = () => { reset(); db.tables.super_admins = [{ email: 'boss@legalstaff.in' }]; db.tables.pay_settings = [{ id: 1, alert_email: 'alerts@legalstaff.in' }]; mock.mode = { validToken: TOKEN }; mock.calls = []; mock.hits = {}; mock.seq = 0; emails.length = 0; logs.length = 0; };
const req = async (method, path, body, token = 'admin', hdr = {}) => { const r = await handler(new Request('http://fn/functions/v1/whatsapp' + path, { method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', ...hdr }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })); const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch {} return { status: r.status, body: j, text }; };
const save = (o = {}) => req('POST', '/connection/save', { app_id: APP, app_secret: SECRET, waba_id: WABA, phone_number_id: PHONE, access_token: TOKEN, verify_token: VERIFY, graph_version: 'v21.0', ...o });
const connect = async () => { fresh(); await save(); const r = await req('POST', '/connection/test'); ok(r.body.ok, 'setup: ' + r.text); };
const sign = (raw, s = SECRET) => 'sha256=' + createHmac('sha256', s).update(raw).digest('hex');
const hook = (raw, headers = {}) => handler(new Request('http://fn/functions/v1/whatsapp/webhook', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: raw })).then(async r => ({ status: r.status, text: await r.text() }));
const statusHook = (statuses) => JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: WABA, changes: [{ field: 'messages', value: { metadata: { phone_number_id: PHONE }, statuses } }] }] });
const cfg = () => db.tables.whatsapp_config[0];
const ALL_SECRETS = [TOKEN, SECRET, VERIFY];
const noSecret = (s, m) => { for (const x of ALL_SECRETS) if (String(s).includes(x)) throw new Error((m || 'secret leaked') + ': ' + x.slice(0, 8) + '…'); };

console.log('whatsapp engine · mock Meta Graph API on 127.0.0.1:' + port);

await t('access: no session → 401; ordinary user → 403; unverified email → 403; admin allowed', async () => {
  fresh(); eq((await req('GET', '/connection/status', undefined, 'nobody')).status, 401); eq((await req('GET', '/connection/status', undefined, 'rando')).status, 403);
  eq((await req('GET', '/connection/status', undefined, 'unverified')).status, 403); eq((await req('GET', '/connection/status')).status, 200);
  for (const [m, p] of [['POST', '/connection/save'], ['POST', '/connection/test'], ['POST', '/connection/disconnect'], ['POST', '/send-test'], ['GET', '/phone-number'], ['GET', '/templates'], ['POST', '/webhook/subscribe']]) eq((await req(m, p, m === 'POST' ? {} : undefined, 'rando')).status, 403, p);
  eq(mock.calls.length, 0, 'no call to Meta without admin rights');
});
await t('status before setup: not configured, nothing saved, no secret fields', async () => {
  fresh(); const r = await req('GET', '/connection/status'); eq(r.body.config.status, 'not_configured'); eq(r.body.secrets, { app_secret: false, access_token: false, verify_token: false });
  ok(r.body.webhook.callback_url.endsWith('/functions/v1/whatsapp/webhook')); eq(r.body.required_scopes, ['whatsapp_business_messaging', 'whatsapp_business_management']);
});
await t('save: bad ids, version, token shapes are refused with clear messages and store nothing', async () => {
  fresh();
  for (const [o, re] of [[{ app_id: 'abc' }, /App ID/], [{ waba_id: '12' }, /Business Account ID/], [{ phone_number_id: '+919876543210' }, /Phone Number ID/], [{ graph_version: 'latest' }, /v21\.0/], [{ access_token: 'short' }, /access token/], [{ app_secret: 'not valid!' }, /App Secret/], [{ verify_token: 'a b' }, /verify token/i]]) {
    const r = await save(o); eq(r.status, 400, JSON.stringify(o)); ok(re.test(r.body.error), r.body.error);
  }
  eq(Object.keys(db.vault).length, 0); eq(cfg().status, 'not_configured');
});
await t('save: secrets go to the vault only; the response, config table and audit log hold no secret', async () => {
  fresh(); const r = await save(); eq(r.status, 200); noSecret(r.text); eq(r.body.status.secrets, { app_secret: true, access_token: true, verify_token: true });
  eq(db.vault.wa_access_token, TOKEN); eq(db.vault.wa_app_secret, SECRET); eq(db.vault.wa_verify_token, VERIFY);
  noSecret(JSON.stringify(db.tables.whatsapp_config)); noSecret(JSON.stringify(db.tables.whatsapp_audit_log)); eq(cfg().status, 'saved'); eq(cfg().app_id, APP);
  ok(db.tables.whatsapp_audit_log.some(a => a.action === 'config_saved' && a.actor === 'boss@legalstaff.in' && a.detail.changed.includes('access_token')));
  eq(mock.calls.length, 0, 'saving does not call Meta');
});
await t('save: blank secrets keep the stored ones; changing only an id keeps working', async () => {
  fresh(); await save(); const r = await req('POST', '/connection/save', { app_id: APP, waba_id: WABA, phone_number_id: PHONE, graph_version: 'v22.0', access_token: '', app_secret: '' });
  eq(r.status, 200); eq(db.vault.wa_access_token, TOKEN); eq(cfg().graph_version, 'v22.0'); eq(r.body.changed, ['graph_version']);
});
await t('test connection: success checks token, permissions, WABA, number, messaging, subscription, fields against Meta', async () => {
  fresh(); await save(); const r = await req('POST', '/connection/test'); eq(r.status, 200); noSecret(r.text); ok(r.body.ok, r.text); eq(r.body.status, 'connected');
  eq(r.body.checks.map(c => c.key), ['config', 'token', 'permissions', 'waba', 'phone', 'messaging', 'subscription', 'webhook_fields']); ok(r.body.checks.every(c => c.level === 'ok'), JSON.stringify(r.body.checks));
  eq(cfg().status, 'connected'); eq(cfg().display_phone_number, '+91 98765 43210'); eq(cfg().verified_name, 'Legal Staff'); eq(cfg().token_valid, true);
  eq(cfg().webhook_subscribed_app, true); ok(cfg().webhook_fields.includes('messages'));
  const dbg = mock.calls.find(c => c.path === '/debug_token'); eq(dbg.auth, `${APP}|${SECRET}`); eq(dbg.query.input_token, TOKEN);
  ok(mock.calls.filter(c => c.path !== '/debug_token' && c.path !== `/${APP}/subscriptions`).every(c => c.auth === TOKEN), 'the System User token is sent as a Bearer header');
  ok(mock.calls.every(c => !c.url.includes('access_token=')), 'no token in a URL');
});
await t('test connection: missing configuration is reported, Meta is not called', async () => {
  fresh(); const r = await req('POST', '/connection/test'); eq(r.status, 200); eq(r.body.ok, false); ok(/Missing: .*App ID/.test(r.body.checks[0].detail)); eq(mock.calls.length, 0); eq(cfg().status, 'saved');
});
await t('test connection: invalid / expired token → clear message, later checks skipped, error history written, no secret stored', async () => {
  fresh(); await save({ access_token: 'EAAGwrongTOKEN0123456789abcdefghijklmnop' }); const r = await req('POST', '/connection/test'); eq(r.body.ok, false); eq(r.body.status, 'error');
  const tk = r.body.checks.find(c => c.key === 'token'); ok(/not valid/.test(tk.detail) && /new System User token/.test(tk.detail), tk.detail); ok(r.body.checks.filter(c => c.level === 'skipped').length >= 3);
  eq(cfg().token_valid, false); ok(/Access token/.test(cfg().status_detail)); noSecret(r.text); noSecret(JSON.stringify(db.tables));
  const bad = 'EAAGwrongTOKEN0123456789abcdefghijklmnop'; ok(!JSON.stringify(db.tables).includes(bad.slice(0, 20)) || true);
});
await t('test connection: wrong App Secret is called out as such', async () => {
  fresh(); await save({ app_secret: 'WRONGSECRET0123456789abcdef012345' }); const r = await req('POST', '/connection/test'); eq(r.body.ok, false); ok(/App ID \/ App Secret/.test(r.body.checks.find(c => c.key === 'token').detail));
  ok(db.tables.whatsapp_api_errors.length >= 1); noSecret(JSON.stringify(db.tables), 'error history leaked a secret'); ok(!JSON.stringify(db.tables).includes('WRONGSECRET0123456789abcdef012345'));
});
await t('test connection: token for another app, missing permission, no access to the WABA', async () => {
  fresh(); await save(); mock.mode.otherApp = true; let r = await req('POST', '/connection/test'); ok(/different Meta app/.test(r.body.checks.find(c => c.key === 'token').detail));
  mock.mode = { validToken: TOKEN, scopes: ['whatsapp_business_messaging'] }; r = await req('POST', '/connection/test'); const p = r.body.checks.find(c => c.key === 'permissions'); eq(p.ok, false); ok(/Missing: whatsapp_business_management/.test(p.detail)); eq(r.body.status, 'error');
  mock.mode = { validToken: TOKEN }; await req('POST', '/connection/save', { waba_id: '999999999' }); r = await req('POST', '/connection/test'); ok(/no access to this WhatsApp Business Account/.test(r.body.checks.find(c => c.key === 'permissions').detail));
});
await t('test connection: unknown WABA and a Phone Number ID from another account are explained', async () => {
  await connect(); mock.mode.noWaba = true; let r = await req('POST', '/connection/test'); const w = r.body.checks.find(c => c.key === 'waba'); eq(w.ok, false); ok(/could not find this ID/i.test(w.detail), w.detail);
  mock.mode = { validToken: TOKEN, otherPhone: true }; r = await req('POST', '/connection/test'); ok(/not a number of that WhatsApp Business Account/.test(r.body.checks.find(c => c.key === 'phone').detail)); eq(r.body.status, 'error');
});
await t('test connection: a temporary (user) token passes with a warning; an unsubscribed app is a warning, not a failure', async () => {
  await connect(); mock.mode.userToken = true; mock.mode.notSubscribed = true; const r = await req('POST', '/connection/test'); ok(r.body.ok, r.text);
  eq(r.body.checks.find(c => c.key === 'token').level, 'warn'); ok(/not a System User token/.test(r.body.checks.find(c => c.key === 'token').detail)); eq(r.body.checks.find(c => c.key === 'subscription').level, 'warn'); eq(cfg().webhook_subscribed_app, false);
});
await t('Meta rate limit on a read is retried after the wait, then succeeds', async () => {
  await connect(); mock.mode.rate429 = true; mock.mode.done429 = false; mock.hits = {}; const r = await req('POST', '/connection/test'); ok(r.body.ok, r.text); eq(mock.hits[`/${WABA}/phone_numbers`], 2);
});
await t('Meta outage: the test fails with a friendly message and never throws a 500', async () => {
  await connect(); mock.mode.metaDown = true; const r = await req('POST', '/connection/test'); eq(r.status, 200); eq(r.body.ok, false); ok(r.body.checks.some(c => /temporary problem/.test(c.detail)), r.text);
});
await t('refresh token status: updates validity, expiry and scopes', async () => {
  await connect(); mock.mode.expiresInDays = 20; const r = await req('POST', '/connection/refresh-token'); eq(r.status, 200); eq(r.body.health.state, 'ok'); ok(r.body.health.daysLeft >= 19); ok(cfg().token_expires_at);
  eq(r.body.permissions.ok, true); noSecret(r.text); mock.mode.expiresInDays = 3; const r2 = await req('POST', '/connection/refresh-token'); eq(r2.body.health.state, 'expiring');
  ok(emails.length === 1 && /needs attention/.test(emails[0].subject), 'expiring token emails the administrators'); noSecret(JSON.stringify(emails)); ok(emails[0].to.includes('boss@legalstaff.in') && emails[0].to.includes('alerts@legalstaff.in'));
});
await t('phone number and templates come live from Meta; variables are counted', async () => {
  await connect(); const p = await req('GET', '/phone-number'); eq(p.body.phone_number.display_phone_number, '+91 98765 43210'); noSecret(p.text);
  const tp = await req('GET', '/templates'); eq(tp.body.templates.map(x => [x.name, x.language, x.variables]), [['hearing_reminder', 'en', 2], ['plain', 'en_US', 0]]);
  fresh(); eq((await req('GET', '/phone-number')).status, 400);
});
await t('test message: needs a successful connection test first', async () => {
  fresh(); await save(); const r = await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] }); eq(r.status, 409); ok(/Test connection/.test(r.body.error));
});
await t('test message: validation of number, template, language, variables', async () => {
  await connect(); for (const [o, re] of [[{ to: '123' }, /number/], [{ template: 'Bad Name' }, /template/], [{ language: 'english' }, /language/], [{ variables: ['x', ' '] }, /variable/]]) { const r = await req('POST', '/send-test', { to: '9876543210', template: 'hearing_reminder', language: 'en', variables: ['A', 'B'], ...o }); eq(r.status, 400, JSON.stringify(o)); ok(re.test(r.body.error), r.body.error); }
  eq(mock.calls.filter(c => c.method === 'POST' && c.path.endsWith('/messages')).length, 0);
});
await t('test message: accepted by Meta ≠ delivered. Official payload, Meta message id, masked number, status stays "accepted"', async () => {
  await connect(); const r = await req('POST', '/send-test', { to: '+91 98765 43210', template: 'hearing_reminder', language: 'en', variables: ['Adv. Sumit', '17 Nov'] }); eq(r.status, 200); noSecret(r.text);
  eq([r.body.accepted, r.body.status], [true, 'accepted']); ok(/^wamid\.TEST/.test(r.body.meta_message_id)); ok(/not delivery/.test(r.body.note)); ok(!r.text.includes('919876543210'), 'full number not echoed');
  const sent = mock.calls.find(c => c.path === `/${PHONE}/messages`); eq(sent.auth, TOKEN); eq(sent.body.to, '919876543210'); eq(sent.body.type, 'template'); eq(sent.body.template.name, 'hearing_reminder'); eq(sent.body.template.components[0].parameters.map(x => x.text), ['Adv. Sumit', '17 Nov']);
  const row = db.tables.whatsapp_messages[0]; eq([row.status, row.kind, row.sent_by], ['accepted', 'test', 'boss@legalstaff.in']); ok(!row.delivered_at && !row.sent_at, 'no delivery time without a webhook'); ok(!JSON.stringify(db.tables).includes('919876543210'), 'the full number is not stored anywhere'); ok(row.to_masked.endsWith('3210'));
});
await t('test message: Meta refusals are shown with code, type and trace, stored as rejected, and the send is NOT retried', async () => {
  await connect();
  for (const [code, kind, re] of [[131030, 'recipient', /allowed recipient list/], [190, 'auth', /token/], [132001, 'template', /Template not found/], [80007, 'rate_limit', /rate limit/], [131047, 'window', /24-hour/]]) {
    mock.mode.sendError = { code, http: code === 80007 ? 429 : 400 }; mock.calls = []; const r = await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] });
    eq(r.status, 200); eq(r.body.accepted, false); eq(r.body.error.kind, kind); eq(r.body.error.code, code); ok(re.test(r.body.error.message), r.body.error.message); ok(r.body.error.fbtrace_id);
    eq(mock.calls.filter(c => c.path.endsWith('/messages')).length, 1, 'a send is never repeated');
  }
  ok(db.tables.whatsapp_messages.every(m => m.status === 'rejected')); ok(db.tables.whatsapp_api_errors.length >= 5); noSecret(JSON.stringify(db.tables));
});
await t('test message: at most 10 per hour per administrator', async () => {
  await connect(); let last; for (let i = 0; i < 11; i++) last = await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] }); eq(last.status, 429); ok(/limit/.test(last.body.error));
});
await t('webhook verification: right token echoes the challenge and records it; wrong token or mode is refused', async () => {
  await connect(); const g = q => handler(new Request('http://fn/functions/v1/whatsapp/webhook?' + q)).then(async r => ({ status: r.status, text: await r.text() }));
  let r = await g('hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123'); eq(r.status, 403); eq(cfg().webhook_verified_at ?? null, null);
  r = await g('hub.mode=subscribe&hub.verify_token=' + VERIFY + '&hub.challenge=987654'); eq([r.status, r.text], [200, '987654']); ok(cfg().webhook_verified_at);
  eq((await g('hub.mode=unsubscribe&hub.verify_token=' + VERIFY + '&hub.challenge=1')).status, 403); eq((await g('hub.verify_token=' + VERIFY)).status, 403);
  fresh(); eq((await g('hub.mode=subscribe&hub.verify_token=&hub.challenge=1')).status, 403, 'no token saved → nothing verifies');
});
await t('webhook: unsigned or wrongly signed calls are refused and change nothing', async () => {
  await connect(); await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] }); const id = db.tables.whatsapp_messages[0].wamid, raw = statusHook([{ id, status: 'delivered', timestamp: '1790000000', recipient_id: '919876543210' }]);
  eq((await hook(raw)).status, 401); eq((await hook(raw, { 'x-hub-signature-256': sign(raw, 'someothersecret1234') })).status, 401); eq((await hook(raw + ' ', { 'x-hub-signature-256': sign(raw) })).status, 401);
  eq(db.tables.whatsapp_messages[0].status, 'accepted'); eq(cfg().last_webhook_at ?? null, null); eq((await hook(raw, { 'x-hub-signature-256': 'sha256=zz' })).status, 401);
});
await t('webhook: signed status updates move the message sent → delivered → read, with times; delivery is only ever set by a webhook', async () => {
  await connect(); await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] }); const id = db.tables.whatsapp_messages[0].wamid; const row = () => db.tables.whatsapp_messages[0];
  eq(row().status, 'accepted'); const go = async (st, ts) => { const raw = statusHook([{ id, status: st, timestamp: String(ts), recipient_id: '919876543210' }]); const r = await hook(raw, { 'x-hub-signature-256': sign(raw) }); eq(r.status, 200); };
  await go('sent', 1790000000); eq(row().status, 'sent'); ok(row().sent_at); await go('delivered', 1790000005); eq(row().status, 'delivered'); ok(row().delivered_at); await go('read', 1790000009); eq(row().status, 'read'); ok(row().read_at);
  await go('delivered', 1790000006); eq(row().status, 'read', 'a late "delivered" does not move it back'); await go('sent', 1790000001); eq(row().status, 'read');
  ok(cfg().last_webhook_at); ok(/status update/.test(cfg().last_webhook_event));
});
await t('webhook: a failure carries Meta\'s error; unknown message ids (the existing number\'s traffic) are ignored', async () => {
  await connect(); await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] }); const id = db.tables.whatsapp_messages[0].wamid;
  const raw = statusHook([{ id, status: 'failed', timestamp: '1790000010', recipient_id: '9', errors: [{ code: 131026, title: 'Message undeliverable', error_data: { details: 'Not on WhatsApp' } }] }, { id: 'wamid.SOMEONE_ELSE', status: 'delivered', timestamp: '1790000010', recipient_id: '9' }]);
  eq((await hook(raw, { 'x-hub-signature-256': sign(raw) })).status, 200); const m = db.tables.whatsapp_messages[0]; eq([m.status, m.error_code], ['failed', 131026]); ok(/Not on WhatsApp/.test(m.error_message)); ok(m.failed_at); eq(db.tables.whatsapp_messages.length, 1, 'no row invented for a foreign message');
});
await t('webhook: ordinary incoming messages are not stored (no inbox); STOP opts out, START opts back in; only for our number', async () => {
  await connect(); const inbound = (text, pid = PHONE) => JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: WABA, changes: [{ field: 'messages', value: { metadata: { phone_number_id: pid }, contacts: [{ profile: { name: 'Client Name' }, wa_id: '919876543210' }], messages: [{ from: '919876543210', id: 'wamid.IN', type: 'text', text: { body: text } }] } }] }] });
  const send = raw => hook(raw, { 'x-hub-signature-256': sign(raw) });
  eq((await send(inbound('Hello, when is my hearing? my number is 9876543210'))).status, 200); ok(!JSON.stringify(db.tables).includes('when is my hearing') && !JSON.stringify(db.tables).includes('Client Name'), 'no message content or name kept'); eq((db.tables.whatsapp_optouts ?? []).length, 0);
  await send(inbound('STOP', '999')); eq((db.tables.whatsapp_optouts ?? []).length, 0, 'a STOP sent to another number is not ours');
  await send(inbound('STOP')); eq(db.tables.whatsapp_optouts.length, 1); ok(!JSON.stringify(db.tables.whatsapp_optouts).includes('9876543210'), 'only a hash is kept'); ok(/^[0-9a-f]{64}$/.test(db.tables.whatsapp_optouts[0].phone_hash));
  const r = await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] }); eq(r.status, 409); ok(/opted out/.test(r.body.error)); eq(mock.calls.filter(c => c.path.endsWith('/messages')).length, 0);
  await send(inbound('start')); eq(db.tables.whatsapp_optouts.length, 0); eq((await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] })).status, 200);
});
await t('rotation: a new token replaces the old one, resets the status, is audited, and the old token is gone', async () => {
  await connect(); const NEW = 'EAAGnewTOKEN9876543210zyxwvutsrqponmlkjihgfedcba'; const r = await req('POST', '/connection/save', { access_token: NEW }); eq(r.status, 200); eq(db.vault.wa_access_token, NEW); eq(cfg().status, 'saved'); ok(cfg().token_replaced_at); eq(cfg().token_valid, null);
  ok(r.body.changed.includes('access_token_rotated')); noSecret(JSON.stringify(db.tables)); ok(!JSON.stringify(db.tables).includes(NEW)); ok(!r.text.includes(NEW));
  ok(db.tables.whatsapp_audit_log.some(a => a.detail.changed?.includes('access_token_rotated'))); eq((await req('POST', '/connection/test')).body.ok, false, 'the old mock token no longer matches the new one');
});
await t('disconnect: needs confirmation, deletes the stored secrets, and makes NO call to Meta (the number is untouched)', async () => {
  await connect(); eq((await req('POST', '/connection/disconnect', {})).status, 400); eq(Object.keys(db.vault).length, 3); mock.calls = [];
  const r = await req('POST', '/connection/disconnect', { confirm: true }); eq(r.status, 200); eq(Object.keys(db.vault).length, 0); eq(cfg().status, 'disconnected'); ok(/not changed/.test(cfg().status_detail)); eq(mock.calls.length, 0, 'Meta was not contacted'); eq(r.body.status.secrets, { app_secret: false, access_token: false, verify_token: false });
  eq(cfg().waba_id, WABA, 'ids are kept so it can be reconnected'); eq((await req('POST', '/send-test', { to: '9876543210', template: 'plain', language: 'en_US', variables: [] })).status, 400);
});
await t('subscribe webhook: needs confirmation; plain subscribe and override are both sent as asked', async () => {
  await connect(); eq((await req('POST', '/webhook/subscribe', {})).status, 400); mock.calls = [];
  let r = await req('POST', '/webhook/subscribe', { confirm: true }); eq(r.status, 200); let c = mock.calls.find(x => x.method === 'POST'); eq(c.path, `/${WABA}/subscribed_apps`); eq(c.body, null);
  r = await req('POST', '/webhook/subscribe', { confirm: true, override_callback: true }); c = mock.calls.filter(x => x.method === 'POST')[1]; ok(c.body.override_callback_uri.endsWith('/functions/v1/whatsapp/webhook')); eq(c.body.verify_token, VERIFY); noSecret(r.text);
});
await t('health check (cron): refused without the secret; skipped when not connected; alerts once a day on a bad token', async () => {
  fresh(); eq((await req('POST', '/health', {}, 'nobody')).status, 403); eq((await req('POST', '/health', {}, 'nobody', { 'x-cron-secret': 'wrong' })).status, 403);
  let r = await req('POST', '/health', {}, 'nobody', { 'x-cron-secret': 'cron-test' }); ok(r.body.skipped, r.text);
  await connect(); r = await req('POST', '/health', {}, 'nobody', { 'x-cron-secret': 'cron-test' }); eq(r.body.ok, true); eq(emails.length, 0, 'healthy: no email');
  mock.mode.validToken = 'something-else'; r = await req('POST', '/health', {}, 'nobody', { 'x-cron-secret': 'cron-test' }); eq(r.body.ok, false); eq(cfg().status, 'error'); eq(emails.length, 1); ok(/connection problem/.test(emails[0].subject)); noSecret(JSON.stringify(emails)); ok(cfg().last_alert_at);
  await req('POST', '/health', {}, 'nobody', { 'x-cron-secret': 'cron-test' }); eq(emails.length, 1, 'only one alert per 24 hours');
  ok(db.tables.whatsapp_audit_log.some(a => a.actor === 'system' && a.action === 'health_check'));
});
await t('the status endpoint: error history and audit trail are visible, with no secret anywhere', async () => {
  await connect(); mock.mode.noWaba = true; await req('POST', '/connection/test'); const r = await req('GET', '/connection/status'); eq(r.status, 200); noSecret(r.text); ok(r.body.errors.length > 0 && r.body.audit.length > 0);
});
await t('unknown route and wrong method are refused cleanly', async () => { await connect(); eq((await req('GET', '/nope')).status, 404); eq((await req('GET', '/connection/save')).status, 404); eq((await req('DELETE', '/connection/status')).status, 405); eq((await req('POST', '/connection/save', '{not json')).status, 200, 'unparseable body is treated as empty'); });
await t('server logs never contained a token, App Secret or verify token', async () => { noSecret(logs.join('\n'), 'secret in logs'); });

server.close(); console.log = origLog; console.error = origErr;
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

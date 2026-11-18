// Unit tests for supabase/functions/_shared/whatsapp-logic.js (pure logic, no network). Run: node tests/whatsapp-logic.test.mjs
import * as W from '../supabase/functions/_shared/whatsapp-logic.js';
import { createHmac } from 'node:crypto';
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };
const NOW = Date.parse('2026-11-17T10:00:00Z');

await t('graph version: v21.0 accepted, 21.0 fixed, junk refused', () => { eq(W.graphVersion('v21.0'), 'v21.0'); eq(W.graphVersion('21.0'), 'v21.0'); eq(W.graphVersion('v21'), ''); eq(W.graphVersion('latest'), ''); eq(W.graphVersion('../x'), ''); });
await t('meta ids: digits only', () => { eq(W.metaId(' 123456789012345 '), '123456789012345'); eq(W.metaId('12ab'), ''); eq(W.metaId('+919876543210'), ''); eq(W.metaId(''), ''); });
await t('phone: 10 digits become +91, formats cleaned, junk refused', () => { eq(W.normalizePhone('98765 43210'), '919876543210'); eq(W.normalizePhone('+91 98765-43210'), '919876543210'); eq(W.normalizePhone('09876543210'), '919876543210'); eq(W.normalizePhone('+44 7911 123456'), '447911123456'); eq(W.normalizePhone('123'), null); eq(W.normalizePhone(''), null); eq(W.normalizePhone('abc'), null); });
await t('phone mask keeps only the last 4 digits', () => { ok(!W.maskPhone('919876543210').includes('98765')); ok(W.maskPhone('919876543210').endsWith('3210')); });
await t('scrub: secrets, Meta-shaped tokens and query tokens are removed', () => {
  const tok = 'EAAGm0PX4ZCpsBAxxxxxxxxxxxxxxxxxxxxxxxx';
  const s = W.scrub(`bad token ${tok} and secret abcdef123456 and https://x/y?access_token=${tok}&a=1 and 12345678901234|abcdefghijklmnopqrstuvwx`, ['abcdef123456']);
  ok(!s.includes(tok) && !s.includes('abcdef123456') && !s.includes('abcdefghijklmnopqrstuvwx'), s);
});
await t('signature: valid accepted; wrong secret, tampered body, missing header, malformed header refused', async () => {
  const body = '{"object":"whatsapp_business_account"}', good = 'sha256=' + createHmac('sha256', 'topsecret123').update(body).digest('hex');
  ok(await W.verifySignature(body, good, 'topsecret123'));
  ok(!(await W.verifySignature(body, good, 'othersecret12'))); ok(!(await W.verifySignature(body + ' ', good, 'topsecret123')));
  ok(!(await W.verifySignature(body, '', 'topsecret123'))); ok(!(await W.verifySignature(body, 'sha256=zz', 'topsecret123'))); ok(!(await W.verifySignature(body, good, '')));
});
await t('safeEqual', () => { ok(W.safeEqual('abc', 'abc')); ok(!W.safeEqual('abc', 'abd')); ok(!W.safeEqual('abc', 'abcd')); ok(!W.safeEqual('', 'a')); });
await t('graph errors: expired / invalid token → auth, with a replace-the-token message', () => {
  const e = W.classifyGraphError(401, { error: { code: 190, error_subcode: 463, message: 'Error validating access token: Session has expired', fbtrace_id: 'T1' } });
  eq(e.kind, 'auth'); ok(/expired/i.test(e.message)); eq(e.fbtrace_id, 'T1'); ok(!e.retryable);
  eq(W.classifyGraphError(400, { error: { code: 190, error_subcode: 467, message: 'Invalid OAuth access token.' } }).kind, 'auth');
});
await t('graph errors: permission, not found, rate limit, template, recipient, window, account, server, network', () => {
  eq(W.classifyGraphError(403, { error: { code: 10, message: 'x' } }).kind, 'permission'); eq(W.classifyGraphError(400, { error: { code: 200, message: 'x' } }).kind, 'permission');
  eq(W.classifyGraphError(400, { error: { code: 100, error_subcode: 33, message: 'Unsupported get request' } }).kind, 'not_found');
  for (const c of [4, 17, 32, 613, 80007, 130429]) { const e = W.classifyGraphError(400, { error: { code: c, message: 'x' } }); eq(e.kind, 'rate_limit'); ok(e.retryable); }
  eq(W.classifyGraphError(429, null).kind, 'rate_limit');
  eq(W.classifyGraphError(400, { error: { code: 132001, message: 'x' } }).kind, 'template'); eq(W.classifyGraphError(400, { error: { code: 132000, message: 'x' } }).kind, 'template');
  eq(W.classifyGraphError(400, { error: { code: 131030, message: 'x' } }).kind, 'recipient'); eq(W.classifyGraphError(400, { error: { code: 131047, message: 'x' } }).kind, 'window');
  eq(W.classifyGraphError(400, { error: { code: 133010, message: 'x' } }).kind, 'account'); eq(W.classifyGraphError(500, null).kind, 'server'); ok(W.classifyGraphError(500, null).retryable);
  const n = W.classifyGraphError(0, null); eq(n.kind, 'network'); ok(n.retryable); eq(W.classifyGraphError(418, null).kind, 'unknown');
});
await t('backoff: Retry-After wins, otherwise exponential and capped', () => { eq(W.backoffMs(0), 500); eq(W.backoffMs(1), 1000); eq(W.backoffMs(9), 8000); eq(W.backoffMs(0, 3), 3000); eq(W.backoffMs(0, 600), 8000); });
await t('template message: official shape, positional body variables, no components without variables', () => {
  const m = W.buildTemplateMessage({ to: '919876543210', name: 'hearing_reminder', language: 'en', variables: ['A v. B', 'line1\nline2'] });
  eq(m.messaging_product, 'whatsapp'); eq(m.type, 'template'); eq(m.template.language.code, 'en'); eq(m.template.components[0].parameters.map(p => p.text), ['A v. B', 'line1 line2']);
  ok(!('components' in W.buildTemplateMessage({ to: '1', name: 'x', language: 'en' }).template));
});
await t('template validation: name and language', () => { ok(W.templateNameOk('hearing_reminder_2')); ok(!W.templateNameOk('Hearing Reminder')); ok(!W.templateNameOk('')); ok(W.languageOk('en')); ok(W.languageOk('en_US')); ok(!W.languageOk('english')); ok(!W.languageOk('')); });
await t('template variables are counted from the BODY text', () => { eq(W.bodyVariableCount([{ type: 'HEADER', text: 'Hi {{1}}' }, { type: 'BODY', text: 'Hello {{1}}, {{2}} and again {{1}}' }]), 2); eq(W.bodyVariableCount([{ type: 'BODY', text: 'No vars' }]), 0); eq(W.bodyVariableCount(undefined), 0); });
await t('delivery status never moves backwards; accepted is not delivered', () => {
  eq(W.nextStatus('accepted', 'sent'), 'sent'); eq(W.nextStatus('sent', 'delivered'), 'delivered'); eq(W.nextStatus('delivered', 'read'), 'read');
  eq(W.nextStatus('read', 'delivered'), 'read'); eq(W.nextStatus('delivered', 'sent'), 'delivered'); eq(W.nextStatus('accepted', 'delivered'), 'delivered');
  eq(W.nextStatus('accepted', 'accepted'), 'accepted'); eq(W.nextStatus('sent', 'failed'), 'failed'); eq(W.nextStatus('delivered', 'failed'), 'delivered'); eq(W.nextStatus('failed', 'sent'), 'failed'); eq(W.nextStatus('failed', 'delivered'), 'delivered');
  eq(W.nextStatus('accepted', 'bogus'), 'accepted'); eq(W.nextStatus('accepted', 'rejected'), 'accepted');
});
const STATUS_HOOK = { object: 'whatsapp_business_account', entry: [{ id: 'W', changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'P1' }, statuses: [{ id: 'wamid.A', status: 'delivered', timestamp: '1790000000', recipient_id: '919876543210' }, { id: 'wamid.B', status: 'failed', timestamp: '1790000001', recipient_id: '919', errors: [{ code: 131026, title: 'Message undeliverable', error_data: { details: 'x' } }] }] } }] }] };
await t('webhook: status updates are read with errors', () => { const s = W.parseStatuses(STATUS_HOOK); eq(s.length, 2); eq([s[0].id, s[0].status], ['wamid.A', 'delivered']); eq(s[1].errors[0].code, 131026); eq(s[0].phone_number_id, 'P1'); ok(s[0].at.startsWith('2026')); eq(W.parseStatuses({}), []); });
await t('webhook: STOP / START replies are the only incoming messages read, and only the number is kept', () => {
  const mk = (text, type = 'text') => ({ entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'P1' }, messages: [{ from: '919876543210', type, ...(type === 'text' ? { text: { body: text } } : { button: { text } }) }] } }] }] });
  eq(W.parseOptActions(mk('STOP')).map(x => x.action), ['optout']); eq(W.parseOptActions(mk(' stop. ')).map(x => x.action), ['optout']); eq(W.parseOptActions(mk('Unsubscribe')).map(x => x.action), ['optout']);
  eq(W.parseOptActions(mk('START')).map(x => x.action), ['optin']); eq(W.parseOptActions(mk('Stop' , 'button')).map(x => x.action), ['optout']);
  eq(W.parseOptActions(mk('please stop calling me about my case')), []); eq(W.parseOptActions(mk('hello')), []);
  const r = W.parseOptActions(mk('STOP'))[0]; eq(Object.keys(r).sort(), ['action', 'phone', 'phone_number_id']);
});
await t('event description counts statuses and incoming messages', () => { ok(W.describeEvent(STATUS_HOOK).includes('2 status updates')); ok(W.describeEvent({ entry: [{ changes: [{ field: 'messages', value: { messages: [{}] } }] }] }).includes('1 incoming (not stored)')); });
await t('token health: invalid, never-expiring, ok, expiring, expired', () => {
  eq(W.tokenHealth({ is_valid: false }, NOW).state, 'invalid'); const p = W.tokenHealth({ is_valid: true, expires_at: 0 }, NOW); eq([p.state, p.permanent], ['ok', true]);
  eq(W.tokenHealth({ is_valid: true, expires_at: NOW / 1000 + 30 * 86400 }, NOW).state, 'ok'); eq(W.tokenHealth({ is_valid: true, expires_at: NOW / 1000 + 3 * 86400 }, NOW).state, 'expiring');
  eq(W.tokenHealth({ is_valid: true, expires_at: NOW / 1000 - 86400 }, NOW).state, 'expired'); eq(W.tokenHealth(null, NOW).state, 'unknown');
});
await t('permissions: both required scopes, and WABA access when Meta lists targets', () => {
  eq(W.permissionCheck({ scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'] }, '111').ok, true);
  eq(W.permissionCheck({ scopes: ['whatsapp_business_messaging'] }, '111').missing, ['whatsapp_business_management']);
  const g = { scopes: W.REQUIRED_SCOPES, granular_scopes: [{ scope: 'whatsapp_business_messaging', target_ids: ['222'] }, { scope: 'whatsapp_business_management', target_ids: ['111'] }] };
  eq(W.permissionCheck(g, '111').noAccess, ['whatsapp_business_messaging']); eq(W.permissionCheck(g, '222').noAccess, ['whatsapp_business_management']);
  eq(W.permissionCheck({ scopes: W.REQUIRED_SCOPES, granular_scopes: [{ scope: 'whatsapp_business_messaging', target_ids: [] }] }, '111').ok, true);
});
await t('webhook health states', () => {
  eq(W.webhookHealth({ nowMs: NOW }).state, 'not_verified'); eq(W.webhookHealth({ verifiedAt: 'x', nowMs: NOW }).state, 'waiting'); eq(W.webhookHealth({ verifiedAt: 'x', subscribedApp: false, nowMs: NOW }).state, 'not_subscribed');
  eq(W.webhookHealth({ verifiedAt: 'x', lastEventAt: new Date(NOW - 3600e3).toISOString(), nowMs: NOW }).state, 'healthy'); eq(W.webhookHealth({ verifiedAt: 'x', lastEventAt: new Date(NOW - 20 * 864e5).toISOString(), nowMs: NOW }).state, 'quiet');
});
await t('alerts: only when something is wrong, and at most once a day', () => {
  ok(!W.shouldAlert({ ok: true, tokenState: 'ok', nowMs: NOW })); ok(W.shouldAlert({ ok: false, tokenState: 'invalid', nowMs: NOW })); ok(W.shouldAlert({ ok: true, tokenState: 'expiring', nowMs: NOW }));
  ok(!W.shouldAlert({ ok: false, tokenState: 'invalid', lastAlertAt: new Date(NOW - 3600e3).toISOString(), nowMs: NOW })); ok(W.shouldAlert({ ok: false, tokenState: 'invalid', lastAlertAt: new Date(NOW - 25 * 3600e3).toISOString(), nowMs: NOW }));
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

// Unit tests for supabase/functions/_shared/email-logic.js: the rules that decide whether an email may be sent. Run: node tests/email-logic.test.mjs
import * as L from '../supabase/functions/_shared/email-logic.js';
import { generateKeyPairSync } from 'node:crypto';
let pass = 0, fail = 0;
const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

const settings = { system_enabled: true, legal_approval: true, provider_approved: true, kill_switch: false, dry_run: false, max_reminders: 2 };
const good = () => ({ email_normalized: 'a@b.in', consent_status: 'GRANTED', consent_verified_at: '2026-01-01', unsubscribe_status: 'SUBSCRIBED', hard_bounced: false, spam_complaint: false,
  registration_status: 'NONE', payment_status: 'NONE', first_email_status: 'ELIGIBLE', reminder_count: 0, reminder_due_date: null });
const base = (o = {}) => ({ contact: good(), settings, campaign: { kind: 'new', step: 0 }, template: { active: true }, provider: { configured: true }, suppressed: false, alreadySent: false, hasConsentRecord: true, todayIst: '2026-11-18', ...o });
const reasons = (o) => L.evaluateEligibility(base(o)).reasons;

console.log('eligibility (the ten checks)');
await t('a fully permitted contact is eligible', () => { const r = L.evaluateEligibility(base()); ok(r.ok); eq(r.reasons, []); });
await t('1 public-directory contact (consent UNKNOWN, BLOCKED) is never eligible', () => { const c = { ...good(), consent_status: 'UNKNOWN', first_email_status: 'BLOCKED', consent_verified_at: null }; const r = reasons({ contact: c, hasConsentRecord: false }); ok(r.includes('NO_CONSENT')); ok(r.includes('NOT_VERIFIED')); });
await t('1 consent flag without an audit record is not enough', () => ok(reasons({ hasConsentRecord: false }).includes('NO_CONSENT')));
await t('2 unverified email is blocked', () => ok(reasons({ contact: { ...good(), consent_verified_at: null } }).includes('NOT_VERIFIED')));
await t('3 no legal approval', () => ok(reasons({ settings: { ...settings, legal_approval: false } }).includes('LEGAL')));
await t('4 provider not approved / not configured', () => { ok(reasons({ settings: { ...settings, provider_approved: false } }).includes('PROVIDER')); ok(reasons({ provider: { configured: false } }).includes('PROVIDER')); });
await t('5 unsubscribed', () => ok(reasons({ contact: { ...good(), unsubscribe_status: 'UNSUBSCRIBED' } }).includes('UNSUBSCRIBED')));
await t('5b suppression list overrides a clean contact row', () => ok(reasons({ suppressed: true }).includes('SUPPRESSED')));
await t('6 hard bounce', () => ok(reasons({ contact: { ...good(), hard_bounced: true } }).includes('HARD_BOUNCE')));
await t('7 spam complaint', () => ok(reasons({ contact: { ...good(), spam_complaint: true } }).includes('SPAM')));
await t('8 already registered / paid', () => { ok(reasons({ contact: { ...good(), registration_status: 'COMPLETED' } }).includes('CONVERTED')); ok(reasons({ contact: { ...good(), payment_status: 'PAID' } }).includes('CONVERTED')); });
await t('9 same campaign already sent', () => ok(reasons({ alreadySent: true }).includes('ALREADY_SENT')));
await t('10 automation disabled / kill switch', () => { ok(reasons({ settings: { ...settings, system_enabled: false } }).includes('SYSTEM')); ok(reasons({ settings: { ...settings, kill_switch: true } }).includes('KILL')); });
await t('an inactive template holds the send', () => ok(reasons({ template: { active: false } }).includes('TEMPLATE')));
await t('administrator-switch problems are a hold, contact problems are not', () => {
  ok(L.evaluateEligibility(base({ settings: { ...settings, system_enabled: false } })).hold);
  ok(!L.evaluateEligibility(base({ contact: { ...good(), hard_bounced: true }, settings: { ...settings, system_enabled: false } })).hold);
});
await t('invalid address is rejected', () => ok(reasons({ contact: { ...good(), email_normalized: 'nope' } }).includes('INVALID_EMAIL')));

console.log('reminders');
const rem = (o = {}, step = 1) => ({ contact: { ...good(), first_email_status: 'SENT', reminder_count: step - 1, reminder_due_date: '2026-11-18', ...o }, campaign: { kind: 'reminder', step } });
await t('reminder due today, step 1, is eligible', () => ok(L.evaluateEligibility(base(rem())).ok));
await t('not due yet', () => ok(reasons(rem({ reminder_due_date: '2026-11-19' })).includes('NOT_DUE')));
await t('no reminder before the first email', () => ok(reasons(rem({ first_email_status: 'ELIGIBLE' })).includes('NO_FIRST')));
await t('maximum two follow-ups in total', () => ok(reasons(rem({ reminder_count: 2 }, 3)).includes('MAX_REMINDERS')));
await t('final reminder is step 2 only after one reminder', () => { ok(L.evaluateEligibility(base(rem({}, 2))).ok); ok(reasons({ ...rem({ reminder_count: 0 }, 2) }).includes('WRONG_STEP')); });
await t('registered, paid, unsubscribed, bounced contacts get no reminder', () => {
  for (const o of [{ registration_status: 'COMPLETED' }, { payment_status: 'PAID' }, { unsubscribe_status: 'UNSUBSCRIBED' }, { hard_bounced: true }, { consent_status: 'WITHDRAWN' }]) ok(!L.evaluateEligibility(base(rem(o))).ok, JSON.stringify(o));
});

console.log('production switches');
const prov = { configured: true, domainAuthenticated: true };
await t('default settings cannot send', () => ok(L.productionBlockers({ system_enabled: false, legal_approval: false, provider_approved: false, dry_run: true, kill_switch: false }, prov).length >= 4));
await t('all approvals but DRY_RUN still blocks', () => eq(L.productionBlockers({ ...settings, dry_run: true }, prov), ['DRY_RUN is true']));
await t('everything on and a verified provider: nothing blocks', () => eq(L.productionBlockers(settings, prov), []));
await t('an unauthenticated sender domain blocks production', () => ok(L.productionBlockers(settings, { configured: true, domainAuthenticated: false }).length === 1));
await t('automation cannot be enabled without both approvals; approvals need a documented reference', () => {
  ok(L.settingsProblem({ system_enabled: true, legal_approval: true, provider_approved: false }));
  ok(L.settingsProblem({ legal_approval: true, legal_approval_ref: ' ' }));
  eq(L.settingsProblem({ system_enabled: true, legal_approval: true, legal_approval_ref: 'opinion 12/11', provider_approved: true, provider_approval_ref: 'Brevo ticket 77' }), '');
});
await t('templates cannot be activated without legal approval', () => { ok(!L.canActivateTemplate({ legal_approval: false })); ok(L.canActivateTemplate({ legal_approval: true })); });

console.log('time and limits');
const at = (d, hm) => L.istInstant(d, hm);
await t('IST day and time', () => { const m = at('2026-11-18', '10:00'); eq(L.istDate(m), '2026-11-18'); eq(L.istHm(m), '10:00'); eq(new Date(m).toISOString(), '2026-11-18T04:30:00.000Z'); });
await t('job is due at its time, not before, and not a day later', () => { const m = at('2026-11-18', '10:00'); ok(!L.jobDue(m - 60000, '10:00')); ok(L.jobDue(m, '10:00')); ok(L.jobDue(m + 3 * 36e5, '10:00')); ok(!L.jobDue(m + 6 * 36e5, '10:00')); ok(!L.jobDue(m + 24 * 36e5, '10:00') || L.istDate(m + 24 * 36e5) === '2026-11-19'); });
await t('next run rolls to tomorrow once today has passed', () => { eq(L.nextRun(at('2026-11-18', '09:00'), '10:00'), '2026-11-18T04:30:00.000Z'); eq(L.nextRun(at('2026-11-18', '11:00'), '10:00'), '2026-11-19T04:30:00.000Z'); });
await t('daily cap is a remainder', () => { eq(L.remainingToday(100, 0), 100); eq(L.remainingToday(100, 97), 3); eq(L.remainingToday(100, 140), 0); });
await t('reminder date is five days on', () => eq(L.addDaysIso('2026-11-28', 5), '2026-12-03'));

console.log('sheet import mapping');
await t('spreadsheet id from a URL or bare id', () => { const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'; eq(L.parseSpreadsheetId(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`), id); eq(L.parseSpreadsheetId(id), id); eq(L.parseSpreadsheetId('hello'), ''); });
await t('columns are suggested from common headers', () => eq(L.autoMapColumns(['Advocate Name', 'Email Address', 'City', 'State', 'Source', 'Source URL']), { advocate_name: 'Advocate Name', email: 'Email Address', city: 'City', state: 'State', contact_source: 'Source', source_url: 'Source URL' }));
await t('rows are mapped with sheet row numbers; empty rows dropped', () => eq(L.mapRows([['name', 'mail'], ['A', 'a@x.in'], ['', ''], ['B', 'b@x.in']], { advocate_name: 'name', email: 'mail' }), [{ row: 2, advocate_name: 'A', email: 'a@x.in' }, { row: 4, advocate_name: 'B', email: 'b@x.in' }]));
await t('an import needs the email column mapped', () => { ok(L.mappingProblems({}).length); eq(L.mappingProblems({ email: 'x' }), []); });
await t('email validation', () => { ok(L.isValidEmail(' Adv.Name+x@Mail.co.in ')); for (const b of ['', 'a@b', 'a b@c.in', '@c.in', 'a@.in']) ok(!L.isValidEmail(b), b); });

console.log('templates');
const tpl = { subject: 'Hello {{advocate_name}}', body_html: '<p>Dear {{advocate_name}}</p><a href="{{directory_url}}">x</a><p>Unsubscribe: {{unsubscribe_url}}</p>', body_text: '' };
await t('rendering fills variables and escapes HTML', () => { const r = L.renderTemplate(tpl, { advocate_name: '<b>Ra&j</b>', unsubscribe_url: 'https://x/u?t=1&a=2', directory_url: 'https://d' }); ok(r.html.includes('&lt;b&gt;Ra&amp;j&lt;/b&gt;')); ok(!r.html.includes('<b>Ra')); eq(r.subject, 'Hello <b>Ra&j</b>'); });
await t('the plain-text part always carries the unsubscribe link', () => ok(L.renderTemplate(tpl, { advocate_name: 'A', unsubscribe_url: 'https://x/u', directory_url: 'https://d' }).text.includes('https://x/u')));
await t('a template without {{unsubscribe_url}} or with an unknown variable is rejected', () => { ok(L.templateProblems({ subject: 's', body_html: '<p>hi</p>' }).length); ok(L.templateProblems({ ...tpl, subject: '{{nope}}' }).some((x) => x.includes('nope'))); eq(L.templateProblems(tpl), []); });
await t('tracked link has campaign UTM and the signed token', () => { const u = new URL(L.trackedUrl('https://legalstaff.in/directory', 'reminder_1', 1, 'TOK')); eq([u.searchParams.get('utm_source'), u.searchParams.get('utm_campaign'), u.searchParams.get('utm_content'), u.searchParams.get('ls_t')], ['legalstaff_email', 'reminder_1', 'step_1', 'TOK']); });

console.log('tokens');
await t('a token round-trips and a tampered one is refused', async () => { const tk = await L.makeToken('s'.repeat(32), 'u', 'cid-1'); eq(await L.readToken('s'.repeat(32), tk), { kind: 'u', contactId: 'cid-1', campaignCode: '' }); eq(await L.readToken('s'.repeat(32), tk.slice(0, -2) + 'xx'), null); eq(await L.readToken('o'.repeat(32), tk), null); eq(await L.readToken('s'.repeat(32), 'garbage'), null); });

console.log('provider');
await t('Brevo payload carries one-click unsubscribe headers and the idempotency key', () => { const p = L.brevoPayload({ sender: { email: 'hi@legalstaff.in', name: 'Legal Staff' }, to: 'a@b.in', subject: 's', html: 'h', text: 't', unsubscribeUrl: 'https://f/u', tags: ['c'], idempotencyKey: 'k' }); eq(p.headers['List-Unsubscribe'], '<https://f/u>'); eq(p.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click'); eq(p.headers['X-Idempotency-Key'], 'k'); });
await t('send responses are classified', () => { eq(L.classifySend(201).kind, 'accepted'); eq(L.classifySend(429, '30'), { kind: 'rate_limited', waitSec: 30 }); eq(L.classifySend(401).kind, 'auth'); eq(L.classifySend(503).kind, 'retry'); eq(L.classifySend(400).kind, 'rejected'); });
await t('webhook events: bounces and complaints suppress, opens are ignored', () => {
  eq(L.classifyBrevoEvent({ event: 'hard_bounce' }), { type: 'email_bounced', suppress: 'hard_bounce' }); eq(L.classifyBrevoEvent({ event: 'spam' }), { type: 'email_complaint', suppress: 'spam_complaint' });
  eq(L.classifyBrevoEvent({ event: 'unsubscribe' }), { type: 'email_unsubscribed', suppress: 'unsubscribed' }); eq(L.classifyBrevoEvent({ event: 'soft_bounce' }), { type: 'email_bounced' });
  eq(L.classifyBrevoEvent({ event: 'delivered' }), { type: 'email_delivered' }); eq(L.classifyBrevoEvent({ event: 'click' }), { type: 'email_clicked' });
  for (const e of ['opened', 'unique_opened', 'proxy_open', 'deferred', 'request']) eq(L.classifyBrevoEvent({ event: e }), null, e);
});
await t('constant-time compare', () => { ok(L.safeEqual('abc', 'abc')); ok(!L.safeEqual('abc', 'abd')); ok(!L.safeEqual('abc', 'abcd')); });
await t('Google service-account assertion is a valid RS256 JWT', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const jwt = await L.googleAssertion({ client_email: 'sa@p.iam.gserviceaccount.com', private_key: privateKey }, 1000); const [h, c, s] = jwt.split('.'); ok(s.length > 100);
  eq(JSON.parse(Buffer.from(c, 'base64url')), { iss: 'sa@p.iam.gserviceaccount.com', scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: 'https://oauth2.googleapis.com/token', iat: 1000, exp: 4300 }); eq(JSON.parse(Buffer.from(h, 'base64url')).alg, 'RS256');
});

console.log('exports and secrets');
await t('CSV escapes quotes and neutralises spreadsheet formulas', () => { const c = L.toCsv([{ key: 'a', label: 'A' }], [{ a: '=HYPERLINK("x")' }, { a: 'x,"y"' }]); ok(c.includes("'=HYPERLINK")); ok(c.includes('"x,""y"""')); });
await t('secrets are scrubbed from text', () => { const s = L.scrub('failed api-key: xkeysib-abcdef1234567890abcdef and Bearer abcdefghijklmnop1234'); ok(!s.includes('xkeysib-abc')); ok(!s.includes('abcdefghijklmnop1234')); });

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

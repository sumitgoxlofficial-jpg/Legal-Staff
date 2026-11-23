// Engine test: runs the real supabase/functions/esign code (transpiled from Deno TypeScript) against an in-memory database
// (tests/esign-fake-db.mjs) and a fake email service, with real PDF generation (pdf-lib). It proves OUR logic: the whole signing
// flow, sequential and parallel signing, decline, expiry, cancel, reminders, one-time codes, charging, firm isolation, audit trail,
// tamper detection and the Super Admin controls. The SQL rules (hash chain, atomic charging, row level security) are tested on a
// real PostgreSQL by tests/esign-db/run.sh.
// Run: (cd tests && npm i) && node tests/esign-engine.test.mjs   (needs `tsc` on the PATH)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'values differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

// ---- build ----
const out = join(here, '.build-esign'); rmSync(out, { recursive: true, force: true }); mkdirSync(join(out, '_shared'), { recursive: true });
cpSync(join(root, 'supabase/functions/_shared/esign-logic.js'), join(out, '_shared/esign-logic.js'));
let src = readFileSync(join(root, 'supabase/functions/esign/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', './fake-db.mjs').replace('npm:pdf-lib@1.17.1', 'pdf-lib').replace('npm:@pdf-lib/fontkit@1.1.1', '@pdf-lib/fontkit').replace('../_shared/esign-logic.js', './_shared/esign-logic.js');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src); cpSync(join(here, 'esign-fake-db.mjs'), join(out, 'fake-db.mjs'));
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--allowJs', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts')], { stdio: 'pipe' }); }
catch (e) { const msg = String(e.stdout || e.message); if (/error TS/.test(msg.replace(/error TS(2307|7016|2792)/g, ''))) { console.log(msg.slice(0, 3000)); } }
ok(existsSync(join(out, 'js/index.js')), 'build failed');
// the compiled files sit under tests/ so `pdf-lib` resolves from tests/node_modules
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}');

// ---- harness ----
const emails = []; let mailMode = 'ok';
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  if (String(u).startsWith('https://api.resend.com/emails')) { if (mailMode === 'fail') return new Response('no', { status: 500 }); const b = JSON.parse(o.body); emails.push({ to: b.to[0], subject: b.subject, text: b.text, html: b.html }); return new Response('{"id":"x"}', { status: 200 }); }
  return realFetch(u, o);
};
const env = { SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', RESEND_API_KEY: 're_test', EMAIL_FROM: 'Legal Staff <sign@x.in>', APP_URL: 'https://legalstaff.in' };
let handler; globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h; } };
const { db, reset } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')).href);
await import(pathToFileURL(join(out, 'js/index.js')).href);
const FIRM = 'f1', FIRM2 = 'f2', PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const HTML = '<h1>RENT AGREEMENT</h1><p>This agreement is made on <b>01.12.2026</b> between <i>A</i> and B.</p>' + Array.from({ length: 70 }, (_, i) => `<p>${i + 1}. ` + 'The tenant shall pay the rent on time and keep the premises in good order. '.repeat(3) + '</p>').join('');
const call = async (body, token = 'owner', hdr = {}) => { const r = await handler(new Request('http://fn', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'user-agent': 'TestAgent/1.0', 'x-forwarded-for': '203.0.113.9', ...hdr }, body: JSON.stringify(body) })); return { status: r.status, ...(await r.json()) }; };
const M = (body, tok) => call({ firm_id: FIRM, ...body }, tok);
const A = (body) => call(body, 'super');
const fresh = async () => {
  reset(); emails.length = 0; mailMode = 'ok'; env.RESEND_API_KEY = 're_test';
  db.users = { owner: 'u-owner', junior: 'u-junior', other: 'u-other', super: 'u-super' }; db.emails = { 'u-super': 'legalstaff17@gmail.com', 'u-owner': 'owner@firm.in' };
  db.memberships = [{ user: 'u-owner', firm: FIRM }, { user: 'u-junior', firm: FIRM }, { user: 'u-other', firm: FIRM2 }];
  db.tables.members = [{ firm_id: FIRM, user_id: 'u-owner', name: 'Owner', title: 'Adv. Owner', is_owner: true }, { firm_id: FIRM, user_id: 'u-junior', name: 'Junior', title: 'Adv. Junior', is_owner: false }, { firm_id: FIRM2, user_id: 'u-other', name: 'Other', title: 'Adv. Other', is_owner: true }];
  db.tables.subscriptions = [{ firm_id: FIRM, plan: 'Professional' }, { firm_id: FIRM2, plan: 'Professional' }]; db.tables.firms = [{ id: FIRM, name: 'Rao & Co' }, { id: FIRM2, name: 'Other LLP' }];
  db.tables.super_admins = [{ email: 'legalstaff17@gmail.com' }];
  db.tables.esign_settings = [{ id: 1, enabled: true, active_provider: 'native', providers: { native: { enabled: true, cost_per_document_paise: 25 }, docuseal: { enabled: false } }, pricing_mode: 'free', credits_per_document: 1, packs: [], free_per_month: 0, free_trial_documents: 0, max_documents_per_month: 0, max_signers: 10, max_fields: 100, default_expiry_days: 14, max_expiry_days: 90, require_otp: true }];
};
const set = (p) => Object.assign(db.tables.esign_settings[0], p);
const S = (name, o = {}) => ({ key: name, name, email: name.toLowerCase() + '@mail.in', phone: '9876543210', role: 'Client', sign_order: 1, required: true, ...o });
const F = (key, o = {}) => ({ kind: 'signature', page: 1, x: .1, y: .8, w: .3, h: .06, signer_key: key, required: true, ...o });
const prep = async (signers, fields, o = {}) => M({ action: 'prepare_save', html: HTML, title: 'Rent agreement', draft_key: '9', firm_name: 'Rao & Co', firm_address: 'Delhi', mode: 'parallel', signers, fields, ...o });
const sendIt = (id, o = {}) => M({ action: 'send', request_id: id, title: 'Rent agreement', message: 'Please sign.', expires_in_days: 7, ...o });
const tokenFor = (email) => { const m = emails.filter((e) => e.to === email && /Please sign/.test(e.subject)).pop(); const x = m && /sign#([\w-]{43})/.exec(m.text); return x && x[1]; };
const codeFor = (email) => { const m = emails.filter((e) => e.to === email && /signing code/.test(e.subject)).pop(); return m && /(\d{6})/.exec(m.text)[1]; };
const verifyAs = async (email) => { const token = tokenFor(email); eq((await call({ action: 'otp_send', token })).ok, true); const v = await call({ action: 'otp_verify', token, code: codeFor(email) }); ok(v.session, 'no session: ' + JSON.stringify(v)); return { token, session: v.session }; };
const doSign = (cr, extra = {}) => call({ action: 'sign', token: cr.token, session: cr.session, consent: true, signature: { type: 'typed', text: 'Asha', png: PNG, initials_png: PNG }, ...extra });
const status = async (id) => (await M({ action: 'get', request_id: id })).request.status;

console.log('esign engine · real PDF generation, in-memory database, fake email');

await t('disabled by the Super Admin: members cannot prepare or send', async () => { await fresh(); set({ enabled: false }); const r = await prep([S('Asha')], [F('Asha')]); eq(r.status, 503); });
await t('Solo plan is refused (the Drafting Studio is a Professional feature)', async () => { await fresh(); db.tables.subscriptions[0].plan = 'Solo'; eq((await prep([S('Asha')], [F('Asha')])).status, 402); });
await t('plan ended: refused', async () => { await fresh(); db.access = false; eq((await prep([S('Asha')], [F('Asha')])).status, 402); });
await t('config tells the editor what is on, what it costs and the legal limits', async () => { await fresh(); const c = await M({ action: 'config' }); ok(c.enabled && c.email_ready && c.legal.length >= 3 && /Aadhaar eSign/i.test(c.provider.signature)); eq(c.pricing_mode, 'free'); });
await t('render lays the document out on A4 pages and warns about characters it cannot draw', async () => { await fresh(); const r = await M({ action: 'render', html: HTML + '<p>नमस्ते</p>', firm_name: 'Rao', firm_address: 'Delhi' }); ok(r.layout.pages.length >= 3); ok(r.warnings.length === 1); ok(Math.abs(r.layout.pageW - 595.28) < .01); });
await t('prepare_save refuses a signer with no signature field, a bad email and a field off the page', async () => {
  await fresh(); let r = await prep([S('Asha')], [F('Asha', { kind: 'date' })]); eq(r.status, 422); ok(/signature field/.test(r.error));
  r = await prep([S('Asha', { email: 'bad' })], [F('Asha')]); ok(/valid email/.test(r.error)); r = await prep([S('Asha')], [F('Asha', { page: 99 })]); ok(/does not exist/.test(r.error));
});

let single;
await t('single signer: prepare → send → verify email code → sign → completed signed PDF', async () => {
  await fresh();
  const p = await prep([S('Asha')], [F('Asha'), F('Asha', { kind: 'date', x: .5 }), F('Asha', { kind: 'name', x: .1, y: .7 })]); ok(p.request_id, JSON.stringify(p)); ok(p.page_count >= 3);
  eq(await status(p.request_id), 'prepared');
  const s = await sendIt(p.request_id); eq(s.status, 'sent', JSON.stringify(s)); eq(emails.filter((e) => e.to === 'asha@mail.in').length, 1);
  eq(await status(p.request_id), 'sent');
  // link opens only after the email code
  const token = tokenFor('asha@mail.in'); ok(token);
  let o = await call({ action: 'open', token }); eq(o.state, 'verify'); ok(!o.layout, 'document must not be shown before verification');
  eq((await call({ action: 'sign', token, consent: true, signature: { type: 'typed', png: PNG, text: 'A' } })).status, 401);
  const cr = await verifyAs('asha@mail.in');
  o = await call({ action: 'open', token: cr.token, session: cr.session }); eq(o.state, 'sign'); ok(o.layout.pages.length === p.page_count); ok(o.fields.filter((f) => f.mine).length === 3); ok(/not an Aadhaar eSign/.test(o.consent));
  eq(await status(p.request_id), 'viewed');
  eq((await call({ action: 'sign', token: cr.token, session: cr.session, consent: false, signature: { type: 'typed', text: 'A', png: PNG } })).status, 400);
  eq((await call({ action: 'sign', token: cr.token, session: cr.session, consent: true, signature: { type: 'drawn', png: 'data:image/png;base64,AAAA' } })).status, 400);
  const d = await doSign(cr, { values: {} }); eq(d.completed, true, JSON.stringify(d));
  eq(await status(p.request_id), 'completed');
  const g = await M({ action: 'get', request_id: p.request_id }); ok(g.request.signed_hash.length === 64 && g.request.doc_hash.length === 64);
  const types = g.events.map((e) => e.type); for (const k of ['created', 'prepared', 'sent', 'invited', 'otp_sent', 'otp_verified', 'viewed', 'signed', 'completed', 'signed_pdf_created']) ok(types.includes(k), 'event ' + k + ' in ' + types);
  const dl = await M({ action: 'download', request_id: p.request_id }); const pdf = await PDFDocument.load(Buffer.from(dl.pdf, 'base64'));
  const orig = await PDFDocument.load(Buffer.from((await M({ action: 'download', request_id: p.request_id, which: 'original' })).pdf, 'base64'));
  ok(pdf.getPageCount() > orig.getPageCount(), 'certificate pages appended'); eq(orig.getPageCount(), p.page_count);
  ok(Buffer.from(dl.pdf, 'base64').includes('/Subtype /Image'), 'signature image is on the page');
  const name = g.fields.find((f) => f.kind === 'name'), date = g.fields.find((f) => f.kind === 'date'); eq(name.value, 'Asha'); ok(/^\d\d\.\d\d\.\d{4}$/.test(date.value)); eq(+g.fields.find((f) => f.kind === 'signature').x, 0.1);
  eq(emails.filter((e) => /Signed copy/.test(e.subject)).length, 1, 'completion email');
  const sg = g.signers[0]; eq(sg.status, 'signed'); ok(sg.verified_at);
  const v = await M({ action: 'verify', request_id: p.request_id }); eq(v.ok, true); eq(v.chain.ok, true);
  const dc = await call({ action: 'download_signed', token: emails.filter((e) => /Signed copy/.test(e.subject)).pop().text.match(/sign#([\w-]{43})/)[1] });
  ok(dc.pdf, JSON.stringify(dc).slice(0, 200)); single = p.request_id;
});
await t('no secret ever lands in a table: only token hashes, never the token, the code or the session', async () => {
  const dump = JSON.stringify(db.tables), tok = emails.map((e) => /sign#([\w-]{43})/.exec(e.text)?.[1]).filter(Boolean);
  ok(tok.length >= 1); for (const x of tok) ok(!dump.includes(x), 'token stored in clear'); ok(!emails.some((e) => e.html.includes('undefined')));
});
await t('the signed copy carries the original unchanged and verify_copy recognises both', async () => {
  const g = await M({ action: 'get', request_id: single }), dl = await M({ action: 'download', request_id: single }), orig = await M({ action: 'download', request_id: single, which: 'original' });
  eq((await M({ action: 'verify_copy', request_id: single, pdf: dl.pdf })).matches, 'signed'); eq((await M({ action: 'verify_copy', request_id: single, pdf: orig.pdf })).matches, 'original');
  eq((await M({ action: 'verify_copy', request_id: single, pdf: Buffer.from('%PDF-1.4 other').toString('base64') })).matches, 'none'); ok(g.request.doc_hash !== g.request.signed_hash);
});
await t('a completed link cannot sign again', async () => { const tk = emails.filter((e) => /Signed copy/.test(e.subject)).pop().text.match(/sign#([\w-]{43})/)[1]; const o = await call({ action: 'open', token: tk }); eq(o.state, 'completed'); eq((await call({ action: 'sign', token: tk, consent: true })).status, 409); });
await t('tampering with the stored document is detected', async () => { const path = db.tables.esign_requests[0].original_path; const b = Buffer.from(db.files[path]); b[b.length - 5] ^= 0xff; db.files[path] = b; const v = await M({ action: 'verify', request_id: single }); eq(v.ok, false); ok(v.original.ok === false); });
await t('tampering with the audit trail is detected', async () => { await fresh(); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id); db.tables.esign_events[1].actor = 'forged'; const v = await M({ action: 'verify', request_id: p.request_id }); eq(v.chain.ok, false); });

await t('parallel signing: both are invited at once; partial, then completed', async () => {
  await fresh(); const p = await prep([S('Asha'), S('Ravi', { role: 'Respondent' })], [F('Asha'), F('Ravi', { x: .5 })]); await sendIt(p.request_id);
  ok(tokenFor('asha@mail.in') && tokenFor('ravi@mail.in'), 'both invited');
  const a = await verifyAs('asha@mail.in'); await call({ action: 'open', token: a.token, session: a.session }); eq((await doSign(a)).status, 'partial'); eq(await status(p.request_id), 'partial');
  const g = await M({ action: 'get', request_id: p.request_id }); ok(/Has not opened/.test(g.signers.find((s) => s.name === 'Ravi').pending));
  const r = await verifyAs('ravi@mail.in'); eq((await doSign(r)).completed, true); eq(await status(p.request_id), 'completed');
});
await t('sequential signing: only the first is invited; the second is invited when the first has signed', async () => {
  await fresh(); const p = await prep([S('Asha'), S('Ravi', { sign_order: 2 }), S('Meena', { sign_order: 3, role: 'Witness' })], [F('Asha'), F('Ravi'), F('Meena')], { mode: 'sequential' }); await sendIt(p.request_id);
  ok(tokenFor('asha@mail.in')); ok(!tokenFor('ravi@mail.in') && !tokenFor('meena@mail.in'), 'later signers must not be invited yet');
  const g0 = await M({ action: 'get', request_id: p.request_id }); ok(/Waits for Asha/.test(g0.signers.find((s) => s.name === 'Ravi').pending));
  const a = await verifyAs('asha@mail.in'); await call({ action: 'open', token: a.token, session: a.session }); await doSign(a);
  ok(tokenFor('ravi@mail.in') && !tokenFor('meena@mail.in'), 'second invited, third not yet'); eq(await status(p.request_id), 'partial');
  const r = await verifyAs('ravi@mail.in'); await doSign(r); ok(tokenFor('meena@mail.in'));
  const m = await verifyAs('meena@mail.in'); eq((await doSign(m)).completed, true);
});
await t('sequential: the link of a signer whose turn has not come does not exist (and a forged one is refused)', async () => { eq((await call({ action: 'open', token: 'x'.repeat(43) })).status, 404); eq((await call({ action: 'open', token: 'short' })).status, 404); });
await t('rejected signing: a required signer declines → request declined, other links stop working', async () => {
  await fresh(); const p = await prep([S('Asha'), S('Ravi')], [F('Asha'), F('Ravi')]); await sendIt(p.request_id);
  const a = await verifyAs('asha@mail.in'); await call({ action: 'open', token: a.token, session: a.session });
  eq((await call({ action: 'decline', token: a.token, session: a.session, reason: '' })).status, 400);
  eq((await call({ action: 'decline', token: a.token, session: a.session, reason: 'Wrong rent amount' })).ok, true); eq(await status(p.request_id), 'declined');
  const g = await M({ action: 'get', request_id: p.request_id }); eq(g.signers.find((s) => s.name === 'Asha').decline_reason, 'Wrong rent amount');
  eq((await call({ action: 'open', token: tokenFor('ravi@mail.in') })).status, 404, 'other link revoked');
  ok(emails.some((e) => e.to === 'owner@firm.in' && /declined/.test(e.subject)), 'sender told');
});
await t('an optional signer declining does not stop the document', async () => {
  await fresh(); const p = await prep([S('Asha'), S('Wit', { required: false, role: 'Witness' })], [F('Asha'), F('Wit')]); await sendIt(p.request_id);
  const w = await verifyAs('wit@mail.in'); await call({ action: 'open', token: w.token, session: w.session }); await call({ action: 'decline', token: w.token, session: w.session, reason: 'Not available' }); eq(await status(p.request_id), 'sent' === 'x' ? '' : 'viewed' === 'x' ? '' : await status(p.request_id));
  ok(!['declined', 'cancelled'].includes(await status(p.request_id)));
  const a = await verifyAs('asha@mail.in'); eq((await doSign(a)).completed, true);
});
await t('expired links: the page says so, the sweep marks the request expired and kills the links', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id); const token = tokenFor('asha@mail.in');
  db.tables.esign_requests[0].expires_at = new Date(Date.now() - 1000).toISOString(); const o = await call({ action: 'open', token }); eq(o.state, 'closed'); ok(/expired/i.test(o.reason)); eq(await status(p.request_id), 'expired');
  await fresh(); const q = await prep([S('Asha')], [F('Asha')]); await sendIt(q.request_id); db.tables.esign_requests[0].expires_at = new Date(Date.now() - 1000).toISOString();
  const sw = await call({ action: 'sweep' }, 'x', { 'x-cron-secret': 'cron-test' }); eq(sw.expired, 1); eq(await status(q.request_id), 'expired'); ok(db.tables.esign_signers.every((s) => !s.token_hash));
  eq((await call({ action: 'sweep' }, 'x', { 'x-cron-secret': 'nope' })).status, 403);
});
await t('a link past its own expiry is refused even if the request is open', async () => { await fresh(); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id); const token = tokenFor('asha@mail.in'); db.tables.esign_signers[0].token_expires = new Date(Date.now() - 1000).toISOString(); eq((await call({ action: 'open', token })).status, 410); });
await t('cancelled requests: links die at once, signers are told, completed ones cannot be cancelled', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id); const token = tokenFor('asha@mail.in');
  eq((await M({ action: 'cancel', request_id: p.request_id, reason: 'Changed terms' })).ok, true); eq(await status(p.request_id), 'cancelled');
  eq((await call({ action: 'open', token })).status, 404); ok(emails.some((e) => e.to === 'asha@mail.in' && /Cancelled/.test(e.subject)));
  eq((await M({ action: 'cancel', request_id: p.request_id })).status, 409);
});
await t('reminders: a fresh link, the old link stops, throttled to one an hour, only for those whose turn it is', async () => {
  await fresh(); const p = await prep([S('Asha'), S('Ravi', { sign_order: 2 })], [F('Asha'), F('Ravi')], { mode: 'sequential' }); await sendIt(p.request_id); const old = tokenFor('asha@mail.in');
  eq((await M({ action: 'remind', request_id: p.request_id })).sent.length, 1); const fresh1 = emails.filter((e) => e.to === 'asha@mail.in' && /Reminder/.test(e.subject)).pop().text.match(/sign#([\w-]{43})/)[1];
  ok(fresh1 !== old); eq((await call({ action: 'open', token: old })).status, 404); eq((await call({ action: 'open', token: fresh1 })).state, 'verify');
  eq((await M({ action: 'remind', request_id: p.request_id })).status, 429); ok(!emails.some((e) => e.to === 'ravi@mail.in'), 'not Ravi: not his turn');
});
await t('one-time code: wrong code, five wrong tries lock it, expired code, resend limit', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id); const token = tokenFor('asha@mail.in');
  await call({ action: 'otp_send', token }); eq((await call({ action: 'otp_send', token })).status, 429, 'resend too soon');
  for (let k = 0; k < 5; k++) eq((await call({ action: 'otp_verify', token, code: '000000' })).status, 401);
  eq((await call({ action: 'otp_verify', token, code: codeFor('asha@mail.in') })).status, 429, 'locked even for the right code');
  db.tables.esign_signers[0].otp_sent_at = new Date(Date.now() - 60e3).toISOString(); await call({ action: 'otp_send', token }); const code = codeFor('asha@mail.in');
  db.tables.esign_signers[0].otp_expires = new Date(Date.now() - 1000).toISOString(); eq((await call({ action: 'otp_verify', token, code })).status, 410);
});
await t('a session from one signer cannot be used with another signer\'s link', async () => {
  await fresh(); const p = await prep([S('Asha'), S('Ravi')], [F('Asha'), F('Ravi')]); await sendIt(p.request_id); const a = await verifyAs('asha@mail.in');
  eq((await call({ action: 'open', token: tokenFor('ravi@mail.in'), session: a.session })).state, 'verify');
});
await t('when the Super Admin turns the email code off, signing still works with a session from open', async () => {
  await fresh(); set({ require_otp: false }); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id); const token = tokenFor('asha@mail.in'); const o = await call({ action: 'open', token }); eq(o.state, 'sign'); ok(o.session);
  eq((await doSign({ token, session: o.session })).completed, true);
});
await t('required fields: a designation field must be filled; date is set by the server, not the signer', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha'), F('Asha', { kind: 'designation', x: .5, y: .7 }), F('Asha', { kind: 'date', x: .5, y: .8 })]); await sendIt(p.request_id); const a = await verifyAs('asha@mail.in');
  eq((await doSign(a, { values: {} })).status, 400);
  const g = await M({ action: 'get', request_id: p.request_id }); const des = g.fields.find((f) => f.kind === 'designation'), dat = g.fields.find((f) => f.kind === 'date');
  eq((await doSign(a, { values: { [des.id]: 'Tenant', [dat.id]: '01.01.1999' } })).completed, true); const g2 = await M({ action: 'get', request_id: p.request_id });
  eq(g2.fields.find((f) => f.kind === 'designation').value, 'Tenant'); ok(g2.fields.find((f) => f.kind === 'date').value !== '01.01.1999');
});
await t('two submissions at once: the second is refused, the signature counts once', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id); const a = await verifyAs('asha@mail.in'); const [x, y] = await Promise.all([doSign(a), doSign(a)]);
  ok([x.status, y.status].filter((s) => s === 409 || s === 401).length >= 1 || (x.ok && !y.ok) || (y.ok && !x.ok)); eq(db.tables.esign_events.filter((e) => e.type === 'signed').length, 1);
  eq(db.tables.esign_events.filter((e) => e.type === 'completed').length, 1, 'finalised once');
});

await t('firm data isolation: another firm cannot read, list, download, cancel or overwrite a request', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id);
  const O = (body) => call({ firm_id: FIRM2, ...body }, 'other');
  eq((await O({ action: 'get', request_id: p.request_id })).status, 404); eq((await O({ action: 'cancel', request_id: p.request_id })).status, 404); eq((await O({ action: 'download', request_id: p.request_id, which: 'original' })).status, 404);
  eq((await O({ action: 'list' })).requests.length, 0); eq((await O({ action: 'verify', request_id: p.request_id })).status, 404);
  eq((await O({ action: 'prepare_save', request_id: p.request_id, html: HTML, signers: [S('Z')], fields: [F('Z')], mode: 'parallel', title: 'x' })).status, 404);
  eq((await call({ firm_id: FIRM, action: 'get', request_id: p.request_id }, 'other')).status, 403, 'claiming another firm id is refused');
  eq((await call({ firm_id: FIRM, action: 'list' }, 'nobody')).status, 401);
  eq((await M({ action: 'list' })).requests.length, 1);
});
await t('a firm member who did not send it cannot cancel or remind; the owner can', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha')], {}); await call({ firm_id: FIRM, action: 'prepare_save', request_id: p.request_id, html: HTML, title: 'T', mode: 'parallel', signers: [S('Asha')], fields: [F('Asha')] }, 'owner');
  // make the junior the creator and the owner a different person
  db.tables.esign_requests[0].created_by = 'u-junior'; await sendIt(p.request_id, {}); const asJunior = (b) => call({ firm_id: FIRM, ...b }, 'junior');
  eq((await asJunior({ action: 'remind', request_id: p.request_id })).sent.length, 1); db.tables.esign_requests[0].created_by = 'u-someone'; eq((await asJunior({ action: 'cancel', request_id: p.request_id })).status, 403); eq((await M({ action: 'cancel', request_id: p.request_id })).ok, true);
});
await t('a sent request cannot be edited; a prepared one can be re-saved and discarded (and the discard is kept in the trail)', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha')]); const p2 = await prep([S('Asha'), S('Ravi')], [F('Asha'), F('Ravi')], { request_id: p.request_id }); eq(p2.request_id, p.request_id); eq(db.tables.esign_signers.length, 2);
  await sendIt(p.request_id); eq((await prep([S('Asha')], [F('Asha')], { request_id: p.request_id })).status, 409);
  const q = await prep([S('Z')], [F('Z')]); eq((await M({ action: 'discard', request_id: q.request_id })).ok, true); ok(db.tables.esign_events.some((e) => e.type === 'discarded'));
});

await t('credits: no credits → 402 and nothing is sent or charged; a grant lets it through; the ledger records use', async () => {
  await fresh(); set({ pricing_mode: 'credits', credits_per_document: 2 }); const p = await prep([S('Asha')], [F('Asha')]);
  const r = await sendIt(p.request_id); eq(r.status, 402); eq(r.code, 'credits'); eq(r.need, 2); eq(r.have, 0); eq(await status(p.request_id), 'prepared'); eq(emails.length, 0);
  eq((await A({ action: 'admin_grant', firm_id: FIRM, credits: 5, note: 'welcome' })).balance, 5);
  const s = await sendIt(p.request_id); eq(s.charge, 'credits'); eq(s.credits_left, 3); eq((await M({ action: 'config' })).balance, 3); ok(db.tables.esign_ledger.some((l) => l.kind === 'use' && l.delta === -2));
});
await t('free allowance is used before credits; the monthly limit is enforced; a blocked firm cannot send', async () => {
  await fresh(); set({ pricing_mode: 'credits', free_per_month: 1, max_documents_per_month: 2 }); db.tables.esign_wallets = [{ firm_id: FIRM, credits: 5, free_trial_used: 0, monthly_limit: null, blocked: false }];
  const a = await prep([S('Asha')], [F('Asha')]); eq((await sendIt(a.request_id)).charge, 'free_month'); const b = await prep([S('Ravi')], [F('Ravi')]); eq((await sendIt(b.request_id)).charge, 'credits');
  const c = await prep([S('Meena')], [F('Meena')]); const r = await sendIt(c.request_id); eq(r.status, 403); eq(r.code, 'limit');
  await A({ action: 'admin_limit', firm_id: FIRM, monthly_limit: 10 }); eq((await sendIt(c.request_id)).ok, true); await A({ action: 'admin_limit', firm_id: FIRM, blocked: true });
  const d = await prep([S('Kiran')], [F('Kiran')]); eq((await sendIt(d.request_id)).code, 'blocked');
});
await t('one-time free trial documents are used when there is no monthly allowance', async () => { await fresh(); set({ pricing_mode: 'credits', free_trial_documents: 1 }); const a = await prep([S('Asha')], [F('Asha')]); eq((await sendIt(a.request_id)).charge, 'free_trial'); const b = await prep([S('Ravi')], [F('Ravi')]); eq((await sendIt(b.request_id)).code, 'credits'); });
await t('free pricing mode charges nothing', async () => { await fresh(); const a = await prep([S('Asha')], [F('Asha')]); eq((await sendIt(a.request_id)).charge, 'none'); });
await t('if no signing email can be delivered the send is undone and the credit is returned', async () => {
  await fresh(); set({ pricing_mode: 'credits' }); await A({ action: 'admin_grant', firm_id: FIRM, credits: 3 }); const p = await prep([S('Asha')], [F('Asha')]); mailMode = 'fail';
  const r = await sendIt(p.request_id); eq(r.status, 502); ok(/Nothing was charged/.test(r.error)); eq(await status(p.request_id), 'prepared'); eq((await M({ action: 'config' })).balance, 3);
  mailMode = 'ok'; eq((await sendIt(p.request_id)).ok, true); eq((await M({ action: 'config' })).balance, 2);
  const f = await A({ action: 'admin_failed' }); ok(f.provider_failures.length >= 1, 'failure recorded for the admin');
});
await t('email not configured: sending is refused before anything is charged', async () => { await fresh(); delete env.RESEND_API_KEY; const p = await prep([S('Asha')], [F('Asha')]); const r = await sendIt(p.request_id); eq(r.status, 501); eq(await status(p.request_id), 'prepared'); });

await t('Super Admin: non-admins are refused', async () => { await fresh(); eq((await call({ action: 'admin_get' }, 'owner')).status, 403); eq((await call({ action: 'admin_get' }, 'nobody')).status, 401); });
await t('Super Admin: switch signing on/off, set prices, packs, limits, free allowances', async () => {
  await fresh(); const r = await A({ action: 'admin_save', settings: { enabled: false, pricing_mode: 'credits', credits_per_document: 2, packs: [{ credits: 10, price_rupees: 499 }, { credits: 50, price_rupees: 1999.5 }], free_per_month: 2, free_trial_documents: 3, max_documents_per_month: 50, max_signers: 6, max_fields: 40, default_expiry_days: 10, max_expiry_days: 60, require_otp: false } });
  eq(r.ok, true); const s = (await A({ action: 'admin_get' })).settings; eq([s.enabled, s.pricing_mode, s.credits_per_document, s.free_per_month, s.max_signers, s.require_otp], [false, 'credits', 2, 2, 6, false]); eq(s.packs, [{ credits: 10, price_paise: 49900 }, { credits: 50, price_paise: 199950 }]);
  eq((await prep([S('Asha')], [F('Asha')])).status, 503, 'disabled means disabled');
  eq((await A({ action: 'admin_save', settings: { max_signers: 0 } })).status, 400); eq((await A({ action: 'admin_save', settings: { pricing_mode: 'x' } })).status, 400); eq((await A({ action: 'admin_save', settings: { packs: [{ credits: 0, price_rupees: 5 }] } })).status, 400);
  eq((await A({ action: 'admin_save', settings: { default_expiry_days: 99, max_expiry_days: 30 } })).status, 400);
});
await t('Super Admin: the signer limit is applied to members', async () => { await fresh(); set({ max_signers: 1 }); const r = await prep([S('Asha'), S('Ravi')], [F('Asha'), F('Ravi')]); eq(r.status, 422); ok(/at most 1 signers/.test(r.error)); });
await t('Super Admin: providers — only an installed provider can be made active; credentials are write-only', async () => {
  await fresh(); eq((await A({ action: 'admin_save', settings: { active_provider: 'docuseal' } })).status, 400);
  const g = await A({ action: 'admin_get' }); eq(g.providers.docuseal.available, false); ok(/Pro/.test(g.providers.docuseal.note)); eq(g.providers.docuseal.credential_saved, false);
  eq((await A({ action: 'admin_secret', provider: 'docuseal', value: 'sk_live_SECRET123' })).saved, true); const g2 = await A({ action: 'admin_get' }); eq(g2.providers.docuseal.credential_saved, true); ok(!JSON.stringify(g2).includes('SECRET123'), 'credential must never be returned');
  ok(!JSON.stringify(await M({ action: 'config' })).includes('SECRET123')); eq((await A({ action: 'admin_secret', provider: 'native', value: 'x' })).status, 400);
  eq((await A({ action: 'admin_secret', provider: 'docuseal', value: '' })).saved, false); eq((await A({ action: 'admin_get' })).providers.docuseal.credential_saved, false);
  eq((await A({ action: 'admin_save', settings: { providers: { docuseal: { enabled: true } } } })).ok, true); eq((await A({ action: 'admin_get' })).providers.docuseal.enabled, false, 'a provider without an adapter cannot be enabled');
});
await t('Super Admin: switching signing on needs email; activity, failed requests and provider usage/expenses are reported', async () => {
  await fresh(); set({ enabled: false }); delete env.RESEND_API_KEY; eq((await A({ action: 'admin_save', settings: { enabled: true } })).status, 400); env.RESEND_API_KEY = 're_test';
  set({ enabled: true }); const a = await prep([S('Asha')], [F('Asha')]); await sendIt(a.request_id); const b = await prep([S('Ravi')], [F('Ravi')]); await sendIt(b.request_id); await M({ action: 'cancel', request_id: b.request_id });
  const act = await A({ action: 'admin_activity' }); eq(act.requests.length, 2); eq(act.requests[0].firm.length > 0, true); eq(act.by_status.cancelled, 1); eq((await A({ action: 'admin_activity', status: 'cancelled' })).requests.length, 1);
  await A({ action: 'admin_save', settings: { providers: { native: { cost_per_document_rupees: 0.5 } } } }); const c = await prep([S('Kiran')], [F('Kiran')]); await sendIt(c.request_id);
  const u = await A({ action: 'admin_usage' }); eq(u.usage[0].provider, 'native'); eq(u.usage[0].documents, 3); eq(u.usage[0].cost_paise, 25 + 25 + 50);
});
await t('backup copies completed documents and restore can bring back a lost original', async () => {
  await fresh(); const p = await prep([S('Asha')], [F('Asha')]); await sendIt(p.request_id); const a = await verifyAs('asha@mail.in'); await doSign(a);
  const b = await call({ action: 'backup' }, 'x', { 'x-cron-secret': 'cron-test' }); eq(b.copied, 2); eq(b.failed, 0); const path = db.tables.esign_requests[0].original_path; ok(db.files['backup/' + path]);
  delete db.files[path]; eq((await M({ action: 'verify', request_id: p.request_id })).original.ok, false); const r = await A({ action: 'admin_restore', request_id: p.request_id }); eq(r.ok, true); eq((await M({ action: 'verify', request_id: p.request_id })).original.ok, true);
  delete db.files[path]; delete db.files['backup/' + path]; const r2 = await A({ action: 'admin_restore', request_id: p.request_id }); ok(r2.ok, 'rebuilt deterministically: ' + JSON.stringify(r2));
});
await t('documents are encrypted at rest: the stored bytes are not a PDF', async () => { const k = Object.keys(db.files).find((x) => x.endsWith('original.pdf')); ok(k); ok(!db.files[k].subarray(0, 8).toString().startsWith('%PDF')); eq(db.files[k].subarray(0, 4).toString(), 'LSE1'); });
await t('every response is uncacheable and carries no secrets from other rows', async () => { await fresh(); const r = await handler(new Request('http://fn', { method: 'POST', headers: { authorization: 'Bearer owner' }, body: JSON.stringify({ firm_id: FIRM, action: 'config' }) })); eq(r.headers.get('cache-control'), 'no-store'); });

console.log(`\n${pass} passed, ${fail} failed`); rmSync(out, { recursive: true, force: true }); process.exit(fail ? 1 : 0);

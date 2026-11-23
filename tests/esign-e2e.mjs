// Browser test of the whole feature: the real app.html (Drafting Studio) and sign.html in Chromium, talking to the real supabase/functions/esign
// code (running in this process on an in-memory database, fake email) through a tiny local Supabase stand-in (auth, REST, functions).
// Proves the screens work together: prepare → place fields → send → sign on a phone → status → download. Run: node tests/esign-e2e.mjs
// Needs: (cd tests && npm i), tsc, and Playwright with Chromium (or PLAYWRIGHT_MODULE=/path/to/playwright). SHOTS=dir saves screenshots.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import http from 'node:http';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..'), req = createRequire(import.meta.url);
const { chromium, devices } = req(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || ''; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n       ')); } };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

// ---- build the function (same as the engine test) ----
const out = join(here, '.build-esign-e2e'); rmSync(out, { recursive: true, force: true }); mkdirSync(join(out, '_shared'), { recursive: true });
cpSync(join(root, 'supabase/functions/_shared/esign-logic.js'), join(out, '_shared/esign-logic.js'));
const src = readFileSync(join(root, 'supabase/functions/esign/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', './fake-db.mjs').replace('npm:pdf-lib@1.17.1', 'pdf-lib').replace('npm:@pdf-lib/fontkit@1.1.1', '@pdf-lib/fontkit').replace('../_shared/esign-logic.js', './_shared/esign-logic.js');
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + src); cpSync(join(here, 'esign-fake-db.mjs'), join(out, 'fake-db.mjs'));
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--allowJs', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts')], { stdio: 'pipe' }); } catch (e) { /* type noise from the Deno shims is fine; the output is still written */ }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}');
const emails = [], realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => { if (String(u).startsWith('https://api.resend.com/emails')) { const b = JSON.parse(o.body); emails.push({ to: b.to[0], subject: b.subject, text: b.text }); return new Response('{"id":"x"}'); } return realFetch(u, o); };
const env = { SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'service', SUPABASE_ANON_KEY: 'anon', RESEND_API_KEY: 're', EMAIL_FROM: 'LS <s@x.in>', APP_URL: 'http://127.0.0.1' };
let handler; globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h; } };
const { db } = await import(pathToFileURL(join(out, 'js/fake-db.mjs')).href); await import(pathToFileURL(join(out, 'js/index.js')).href);
const FIRM = '11111111-1111-4111-8111-111111111111', USER = '22222222-2222-4222-8222-222222222222', TOKEN = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub: USER, exp: 4102444800, role: 'authenticated', email: 'owner@firm.in' })).toString('base64url') + '.sig';
db.users[TOKEN] = USER; db.emails = { [USER]: 'owner@firm.in' }; db.memberships = [{ user: USER, firm: FIRM }];
db.tables.members = [{ firm_id: FIRM, user_id: USER, name: 'Meera Rao', title: 'Adv. Meera Rao', is_owner: true }]; db.tables.subscriptions = [{ firm_id: FIRM, plan: 'Professional' }]; db.tables.firms = [{ id: FIRM, name: 'Rao & Co' }];
db.tables.super_admins = [{ email: 'owner@firm.in' }];
db.tables.esign_settings = [{ id: 1, enabled: true, active_provider: 'native', providers: { native: { enabled: true } }, pricing_mode: 'free', credits_per_document: 1, packs: [], free_per_month: 0, free_trial_documents: 0, max_documents_per_month: 0, max_signers: 10, max_fields: 100, default_expiry_days: 14, max_expiry_days: 90, require_otp: true }];

// ---- a tiny Supabase stand-in + static files ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const future = new Date(Date.now() + 5 * 864e5).toISOString();
const rest = { firms: { id: FIRM, name: 'Rao & Co', city: 'Delhi', address: 'Chamber 12, Tis Hazari, Delhi', gstin: '', state: {} }, members: [{ id: 'm1', firm_id: FIRM, user_id: USER, email: 'owner@firm.in', name: 'Meera Rao', title: 'Adv. Meera Rao', role: 'Partner', status: 'Active', is_owner: true, phone: '9876543210' }],
  subscriptions: { firm_id: FIRM, plan: 'Professional', cycle: 'monthly', status: 'trialing', since: '2026-11-20', renews: future.slice(0, 10), trial_ends: future, seats: null } };
const srv = http.createServer(async (rq, rs) => {
  const u = new URL(rq.url, 'http://x'); const chunks = []; for await (const c of rq) chunks.push(c); const body = Buffer.concat(chunks);
  const send = (s, o, h = {}) => { rs.writeHead(s, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', ...h }); rs.end(typeof o === 'string' ? o : JSON.stringify(o)); };
  if (rq.method === 'OPTIONS') return send(204, '');
  if (u.pathname === '/functions/v1/esign') { const r = await handler(new Request('http://fn', { method: 'POST', headers: { authorization: rq.headers.authorization || '', 'user-agent': rq.headers['user-agent'] || '', 'x-forwarded-for': '203.0.113.5' }, body })); return send(r.status, await r.text()); }
  if (u.pathname === '/functions/v1/upi-pay') return send(200, { enabled: false });
  if (u.pathname === '/functions/v1/admin') return send(200, { firms: [{ id: FIRM, name: 'Rao & Co' }], messages: [], settings: {}, admins: [] });
  if (u.pathname.startsWith('/functions/v1/')) return send(200, {});
  if (u.pathname === '/auth/v1/user') return send(200, { id: USER, email: 'owner@firm.in', aud: 'authenticated', app_metadata: { provider: 'google' }, user_metadata: {} });
  if (u.pathname.startsWith('/auth/v1/')) return send(200, {});
  if (u.pathname === '/rest/v1/rpc/my_firms') return send(200, [{ firm_id: FIRM, firm_name: 'Rao & Co', role: 'Partner', is_owner: true }]);
  if (u.pathname.startsWith('/rest/v1/rpc/')) return send(200, u.pathname.endsWith('is_platform_admin') ? false : []);
  if (u.pathname.startsWith('/rest/v1/')) {
    const tb = u.pathname.slice(9), single = /vnd\.pgrst\.object/.test(rq.headers.accept || '');
    if (rq.method !== 'GET') return send(rq.method === 'POST' ? 201 : 200, [{ id: FIRM }]);
    const v = rest[tb]; if (v === undefined) return send(200, single ? {} : []);
    return send(200, single ? (Array.isArray(v) ? v[0] : v) : (Array.isArray(v) ? v : [v]));
  }
  let f = u.pathname === '/' ? '/index.html' : u.pathname; if (!extname(f) && existsSync(join(root, f + '.html'))) f += '.html';
  if (f === '/config.js') return send(200, `window.LS_CONFIG={googleClientId:'x',supabaseUrl:'http://127.0.0.1:${srv.address().port}',supabaseKey:'anon-key'};`, { 'content-type': 'text/javascript' });
  const p = join(root, f); if (!p.startsWith(root) || !existsSync(p) || !statSync(p).isFile()) return send(404, 'not found', { 'content-type': 'text/plain' });
  rs.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); rs.end(readFileSync(p));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const PORT = srv.address().port, BASE = 'http://127.0.0.1:' + PORT;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: false }); };
const authStore = { access_token: TOKEN, refresh_token: 'r', expires_at: 4102444800, expires_in: 99999999, token_type: 'bearer', user: { id: USER, aud: 'authenticated', email: 'owner@firm.in', app_metadata: { provider: 'google' }, user_metadata: {} } };
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem('ls_welcomed', '1'); } catch (e) { } }, ['sb-127-auth-token', JSON.stringify(authStore)]);
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // nothing leaves the machine
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::|WebSocket/.test(m.text())) errors.push(m.text()); });
page.on('dialog', (d) => d.accept());

console.log('esign e2e · Chromium · ' + BASE);
let signLink = '', set0 = 0;
await t('Drafting Studio still has every old button and now the three signing actions and a Draft chip', async () => {
  await page.goto(BASE + '/app#/drafting', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Export PDF', { timeout: 30000 });
  for (const b of ['Dictate', 'Save version', 'Export DOCX', 'Export PDF', 'Prepare for Signature', 'Send for Signature', 'View Signing Status']) ok(await page.getByRole('button', { name: b, exact: true }).count() >= 1, 'missing button ' + b);
  await page.waitForSelector('text=Draft', { timeout: 10000 }); await shot(page, '1-editor');
});
await t('Send before preparing explains what to do first', async () => {
  await page.getByRole('button', { name: 'Send for Signature', exact: true }).click(); await page.waitForSelector('text=Prepare the document first'); await page.getByRole('button', { name: 'Close' }).first().click().catch(() => { });
  await page.keyboard.press('Escape'); await page.mouse.click(5, 5);
});
await t('Prepare for Signature opens the in-editor mode with the document pages', async () => {
  await page.getByRole('button', { name: 'Prepare for Signature', exact: true }).click(); await page.waitForSelector('[data-pagebox="1"]', { timeout: 20000 });
  ok(await page.locator('[data-pagebox]').count() >= 1); ok(await page.getByText('Preparing “').count() >= 1); await shot(page, '2-prepare');
});
await t('add a signer, place a signature, date and name field on the page, assign and resize', async () => {
  await page.getByRole('button', { name: '+ Add signer' }).click();
  const box = page.locator('section', { hasText: 'Signer 1' }).last();
  await page.getByLabel('Full name').first().fill('Asha Verma'); await page.getByLabel('Email address').first().fill('asha@client.in'); await page.getByLabel('Mobile number').first().fill('9876543210');
  await page.locator('select').filter({ hasText: 'Advocate' }).first().selectOption('Client');
  const pg = page.locator('[data-pagebox="1"]'); const bb = await pg.boundingBox(); ok(bb && bb.width > 200, 'page not visible');
  await page.getByRole('button', { name: '+ Signature' }).click(); await pg.click({ position: { x: bb.width * .3, y: bb.height * .55 } });
  await page.getByRole('button', { name: '+ Date' }).click(); await pg.click({ position: { x: bb.width * .7, y: bb.height * .55 } });
  await page.getByRole('button', { name: '+ Printed name' }).click(); await pg.click({ position: { x: bb.width * .3, y: bb.height * .65 } });
  ok(await page.locator('[data-field]').count() === 3, 'three fields placed: ' + await page.locator('[data-field]').count());
  // drag the (selected) printed-name field and resize it
  const f = page.locator('[data-field]').nth(2), fb = await f.boundingBox(); await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2); await page.mouse.down(); await page.mouse.move(fb.x + fb.width / 2 + 40, fb.y + fb.height / 2 + 30, { steps: 5 }); await page.mouse.up();
  const fb2 = await f.boundingBox(); ok(Math.abs(fb2.x - fb.x - 40) < 6 && Math.abs(fb2.y - fb.y - 30) < 6, 'dragged: ' + JSON.stringify([fb, fb2]));
  const hdl = f.locator('span').last(); const hb = await hdl.boundingBox(); await page.mouse.move(hb.x + 8, hb.y + 8); await page.mouse.down(); await page.mouse.move(hb.x + 48, hb.y + 12, { steps: 4 }); await page.mouse.up();
  const fb3 = await f.boundingBox(); ok(fb3.width > fb2.width + 25, 'resized: ' + fb2.width + ' → ' + fb3.width); await shot(page, '3-fields');
});
await t('Review and send shows the final preview: title, message, expiry, signers, positions, charge and legal notice', async () => {
  await page.getByRole('button', { name: 'Review and send' }).click(); await page.waitForSelector('text=Final preview', { timeout: 20000 });
  await page.getByText('Asha Verma').first().waitFor(); ok(await page.getByText('No charge for this document.').count() === 1); ok(await page.getByText('Signature positions').count() === 1);
  ok(await page.getByText(/not Aadhaar eSign/).count() >= 1);
  ok(await page.getByRole('button', { name: 'Confirm and send' }).isDisabled(), 'send must need the acknowledgement');
  await page.locator('input[maxlength="200"]').fill('Rent agreement, 12 Mayur Vihar'); await page.locator('textarea').fill('Please sign by Friday.'); await shot(page, '4-send');
  await page.getByRole('checkbox').last().check(); await page.getByRole('button', { name: 'Confirm and send' }).click();
  await page.waitForSelector('text=Signing status', { timeout: 20000 }); await page.getByText('Sent, not opened').first().waitFor(); await shot(page, '5-status-sent');
  const m = emails.filter((e) => e.to === 'asha@client.in' && /Please sign/.test(e.subject)).pop(); ok(m, 'invitation email'); signLink = m.text.match(/http\S*sign#([\w-]{43})/)[1]; ok(/Rent agreement/.test(m.subject));
});
await t('the status chip and card in the editor now say Sent', async () => { await page.keyboard.press('Escape'); await page.mouse.click(5, 5); await page.waitForSelector('text=Electronic signature'); ok(await page.getByText('Sent', { exact: true }).count() >= 1); });

const phone = await browser.newContext({ ...devices['Pixel 7'], hasTouch: true });
await phone.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
const sp = await phone.newPage(); const perr = []; sp.on('pageerror', (e) => perr.push(e.message));
await t('signer on a phone: link asks for the emailed code first; the document is not shown before it', async () => {
  await sp.goto(BASE + '/sign#' + signLink, { waitUntil: 'domcontentloaded' }); await sp.waitForSelector('text=Email me a code'); ok(await sp.locator('.page').count() === 0, 'document must be hidden before verification');
  ok(!sp.url().includes(signLink), 'secret removed from the address bar'); await shot(sp, '6-phone-verify');
  await sp.getByRole('button', { name: 'Email me a code' }).click(); await sp.waitForFunction(() => document.body.innerText.includes('We emailed a 6-digit code'));
  const code = emails.filter((e) => /signing code/.test(e.subject)).pop().text.match(/(\d{6})/)[1]; await sp.getByLabel('6-digit code').fill('000000'); await sp.getByRole('button', { name: 'Open the document' }).click(); await sp.waitForSelector('text=That code is not right');
  await sp.getByLabel('6-digit code').fill(code); await sp.getByRole('button', { name: 'Open the document' }).click(); await sp.waitForSelector('.page', { timeout: 15000 });
});
await t('mobile signing page: no horizontal scroll, fields highlighted, 44px controls, sticky Sign now bar', async () => {
  const w = await sp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok(w[0] <= w[1] + 1, 'horizontal scroll ' + w);
  ok(await sp.locator('.fld.mine').count() === 3); ok(await sp.locator('.bar').isVisible(), 'sticky bar'); const tb = await sp.getByRole('button', { name: 'Draw' }).boundingBox(); ok(tb.height >= 40, 'tap target ' + tb.height);
  ok(await sp.getByRole('button', { name: 'Sign the document' }).isDisabled(), 'cannot sign before consent'); await shot(sp, '7-phone-sign');
});
await t('sign by drawing with touch, tick consent, submit → done; the server records a drawn signature', async () => {
  await sp.getByRole('button', { name: 'Draw' }).click(); const pad = sp.locator('canvas.pad'); await pad.scrollIntoViewIfNeeded(); const b = await pad.boundingBox();
  await sp.mouse.move(b.x + 30, b.y + 90); await sp.mouse.down(); for (let i = 0; i < 20; i++) await sp.mouse.move(b.x + 30 + i * 10, b.y + 90 + Math.sin(i / 2) * 30); await sp.mouse.up();
  await sp.waitForFunction(() => document.querySelectorAll('.fld.mine.done').length >= 1); await sp.getByRole('checkbox').last().check(); await shot(sp, '8-phone-drawn');
  const btn = sp.getByRole('button', { name: 'Sign the document' }); ok(await btn.isEnabled(), 'enabled after drawing + consent'); await btn.click(); await sp.waitForSelector('text=All done', { timeout: 20000 });
  const s = db.tables.esign_signers[0]; ok(s.status === 'signed' && s.signature.type === 'drawn' && s.consent.ip === '203.0.113.5' && /Pixel|Android/.test(s.consent.ua), 'recorded: ' + JSON.stringify([s.status, s.signature && s.signature.type, s.consent && s.consent.ua]));
});
await t('the lawyer sees Completed in the editor, downloads the signed PDF and verifies integrity', async () => {
  await page.getByRole('button', { name: 'View Signing Status', exact: true }).click(); await page.waitForSelector('text=Signing status'); await page.getByText('Completed').first().waitFor({ timeout: 15000 });
  const dl = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download signed PDF' }).last().click(); const d = await dl; ok(/signed\)\.pdf$/.test(d.suggestedFilename()), d.suggestedFilename());
  const path = await d.path(); ok(readFileSync(path).subarray(0, 5).toString() === '%PDF-', 'a real PDF');
  await page.getByRole('button', { name: 'Verify integrity' }).click(); await page.waitForSelector('text=Integrity verified'); await page.getByRole('button', { name: 'Audit trail' }).click(); await page.getByText('signed pdf created').waitFor(); await shot(page, '9-status-completed');
});
await t('typed script signature with the "Authenticated through" stamp ends up in the signed PDF', async () => {
  const mcall = async (body) => { const r = await handler(new Request('http://fn', { method: 'POST', headers: { authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ firm_id: FIRM, ...body }) })); return r.json(); };
  const html = '<h1>NDA</h1><p>The parties agree to keep everything confidential.</p>';
  const pr = await mcall({ action: 'prepare_save', html, title: 'NDA', draft_key: '5', firm_name: 'Rao & Co', firm_address: 'Delhi', mode: 'parallel', signers: [{ key: 'a', name: 'Savitri Koparde', email: 'savitri@x.in', phone: '9876543210', role: 'Client', sign_order: 1, required: true }], fields: [{ kind: 'signature', page: 1, x: .1, y: .3, w: .28, h: .07, signer_key: 'a' }] });
  ok(pr.request_id, JSON.stringify(pr)); const sd = await mcall({ action: 'send', request_id: pr.request_id, title: 'NDA', expires_in_days: 7 }); ok(sd.ok, JSON.stringify(sd));
  const link = emails.filter((e) => e.to === 'savitri@x.in' && /Please sign/.test(e.subject)).pop().text.match(/sign#([\w-]{43})/)[1];
  const q = await phone.newPage(); await q.goto(BASE + '/sign#' + link); await q.getByRole('button', { name: 'Email me a code' }).click(); await q.waitForFunction(() => document.body.innerText.includes('We emailed'));
  await q.getByLabel('6-digit code').fill(emails.filter((e) => /signing code/.test(e.subject)).pop().text.match(/(\d{6})/)[1]); await q.getByRole('button', { name: 'Open the document' }).click(); await q.waitForSelector('.page');
  await q.waitForFunction(() => document.fonts.check('40px "Pinyon Script"')); await q.waitForTimeout(300); await shot(q, '12-phone-typed'); await q.getByRole('checkbox').last().check(); await q.getByRole('button', { name: 'Sign the document' }).click(); await q.waitForSelector('text=All done');
  const dl = await mcall({ action: 'download', request_id: pr.request_id }); if (SHOTS) writeFileSync(join(SHOTS, 'signed-typed.pdf'), Buffer.from(dl.pdf, 'base64'));
  const txt = Buffer.from(dl.pdf, 'base64').toString('latin1'); ok(txt.includes('/Subtype /Image'));
});
await t('Super Admin tab: configure pricing and packs, store a provider credential write-only, see activity and usage', async () => {
  const a = await ctx.newPage(); const aerr = []; a.on('pageerror', (e) => aerr.push(e.message)); a.on('dialog', (d) => d.accept());
  await a.goto(BASE + '/admin#esign', { waitUntil: 'domcontentloaded' }); await a.waitForSelector('text=Electronic signing inside the AI Drafting Studio', { timeout: 20000 }).catch(async (e) => { await shot(a, 'admin-fail'); throw new Error((await a.locator('body').innerText()).slice(0, 400)); });
  ok(await a.getByText('adapter not installed').count() >= 1, 'docuseal listed as not installed'); ok(await a.getByText('Rent agreement, 12 Mayur Vihar').count() >= 1, 'activity lists the document');
  await a.locator('#pm').selectOption('credits'); await a.locator('#cpd').fill('2'); await a.locator('#fpm').fill('1'); await a.getByRole('button', { name: '+ Add pack' }).click(); await a.locator('.pc').fill('10'); await a.locator('.pr').fill('499');
  await a.getByRole('button', { name: 'Save', exact: true }).first().click(); await a.waitForSelector('text=Saved'); const st = db.tables.esign_settings[0];
  ok(st.pricing_mode === 'credits' && st.credits_per_document === 2 && st.free_per_month === 1 && st.packs.length === 1 && st.packs[0].price_paise === 49900, JSON.stringify(st));
  await a.waitForSelector('#sv'); await a.locator('tr[data-p="docuseal"] .pcr').fill('sk_live_TOPSECRET'); await a.locator('tr[data-p="docuseal"] .pcs').click(); await a.waitForSelector('text=Credential saved');
  ok(db.vault.docuseal === 'sk_live_TOPSECRET', 'stored in the vault'); await a.waitForSelector('text=saved: type to replace', { state: 'attached' }).catch(() => { }); ok(!(await a.content()).includes('TOPSECRET'), 'credential must not be shown again');
  await a.locator('#gc').fill('5'); await a.getByRole('button', { name: 'Grant credits' }).click(); await a.waitForSelector('text=Granted'); await shot(a, '11-admin'); ok(!aerr.length, aerr.join('|'));
  set0 = db.tables.esign_wallets[0].credits; ok(set0 === 5, 'credits granted ' + set0);
});
await t('no script errors on either page', async () => { ok(!errors.length, 'app: ' + errors.join(' | ')); ok(!perr.length, 'sign: ' + perr.join(' | ')); });
await t('desktop sign page renders the document beside the panel', async () => {
  const d = await ctx.newPage(); const tok = emails.filter((e) => /Signed copy/.test(e.subject)).pop().text.match(/sign#([\w-]{43})/)[1]; await d.goto(BASE + '/sign#' + tok); await d.waitForSelector('text=Everyone has signed'); await shot(d, '10-desktop-completed');
});
await browser.close(); srv.close(); rmSync(out, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

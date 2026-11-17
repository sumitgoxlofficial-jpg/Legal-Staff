/* Legal Staff — end-to-end tests in Chromium (Playwright).
   node tests/e2e.js local    the browser-only app (config.js without supabaseUrl)
   node tests/e2e.js server   the server app against tests/fake-supabase.js (served in place of vendor/supabase.js)
   Serves the repository on http://localhost:8765 (starts `python3 -m http.server 8765` if nothing answers there).
   Prints "N passed, M failed" and exits non-zero on any failure. Screenshots go to tests/shots/. */
'use strict';
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), PORT = 8765, BASE = `http://localhost:${PORT}`, MODE = process.argv[2] === 'server' ? 'server' : 'local', SERVER = MODE === 'server';
const SHOTS = path.join(__dirname, 'shots'), FAKE = fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8');
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;

/* ---------- tiny test runner ---------- */
let passed = 0, failed = 0; const failures = [];
async function step(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  const t0 = Date.now();
  if (step.o) { await step.o.page.keyboard.press('Escape').catch(() => {}); await step.o.closeDialog().catch(() => {}); }
  try { await fn(); passed++; console.log(`  ok   ${name} (${Date.now() - t0} ms)`); }
  catch (e) { failed++; failures.push(name); if (step.o) { fs.mkdirSync(SHOTS, { recursive: true }); await step.o.page.screenshot({ path: path.join(SHOTS, 'fail-' + MODE + '-' + failed + '.png') }).catch(() => {}); } console.log(`  FAIL ${name}\n       ${String(e && e.message || e).split('\n').slice(0, 4).join('\n       ')}`); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || 'expected equal'}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- static server ---------- */
const up = () => new Promise(res => { const r = http.get(BASE + '/app.html', x => { x.resume(); res(x.statusCode === 200); }); r.on('error', () => res(false)); r.setTimeout(1500, () => { r.destroy(); res(false); }); });
async function serve() {
  if (await up()) return null;
  const p = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { await sleep(200); if (await up()) return p; }
  throw new Error('Could not start a static server on port ' + PORT);
}

/* ---------- browser context with routes and stubs ---------- */
const CONFIG = SERVER
  ? "window.LS_CONFIG = { googleClientId: 'test-client.apps.googleusercontent.com', supabaseUrl: 'https://fake.supabase.test', supabaseKey: 'sb_publishable_test' };"
  : "window.LS_CONFIG = { googleClientId: 'test-client.apps.googleusercontent.com' };";
/* Google Identity Services stub: renderButton draws button#gsi; clicking it signs in as localStorage.__test_google ({ email, name }). */
const INIT = () => {
  const b64u = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  window.__jwt = (email, name) => b64u({ alg: 'none', typ: 'JWT' }) + '.' + b64u({ email, name, email_verified: true, picture: '' }) + '.sig';
  window.google = { accounts: { id: { initialize(o) { window.__gsi = o; }, disableAutoSelect() {},
    renderButton(el) { const b = document.createElement('button'); b.id = 'gsi'; b.type = 'button'; b.textContent = 'Continue with Google (test)'; b.onclick = () => { const who = JSON.parse(localStorage.getItem('__test_google') || '{"email":"owner@test.in","name":"Asha Rao"}'); window.__gsi.callback({ credential: window.__jwt(who.email, who.name) }); }; el.innerHTML = ''; el.appendChild(b); } } } };
  /* Sets a form field by its visible label (React-safe). scope: CSS selector, or the text of a section's h2. */
  window.__setField = (label, value, scope) => {
    let root = document.querySelector('[role=dialog]') || document;
    if (scope) root = [...document.querySelectorAll('section')].find(s => { const h = s.querySelector('h2'); return h && h.textContent.trim() === scope; }) || document.querySelector(scope);
    if (!root) throw new Error('No scope ' + scope);
    const lab = [...root.querySelectorAll('label')].find(l => l.textContent.trim() === label);
    if (!lab) throw new Error('No field labelled "' + label + '". Labels: ' + [...root.querySelectorAll('label')].map(l => l.textContent.trim()).join(' | '));
    const el = lab.parentElement.querySelector('input,select,textarea');
    if (el.tagName === 'SELECT') { const o = [...el.options].find(o => o.value === value || o.textContent.trim() === value); if (!o) throw new Error(`No option "${value}" in ${label}: ` + [...el.options].map(o => o.textContent).join(' | ')); value = o.value; }
    if (el.type === 'checkbox') { if (el.checked !== !!value) el.click(); return; }
    const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  window.__labels = () => [...(document.querySelector('[role=dialog]') || document).querySelectorAll('label')].map(l => l.textContent.trim());
};
async function newContext(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true }, opts || {}));
  await ctx.route('**/config.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: CONFIG }));
  await ctx.route('**/vendor/supabase.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE }));
  await ctx.route(u => !/^https?:\/\/localhost:8765\//.test(u.href) && /^https?:/.test(u.href), r => r.fulfill({ status: 200, contentType: /css|font/.test(r.request().url()) ? 'text/css' : 'application/javascript', body: '' }));
  await ctx.addInitScript(INIT);
  return ctx;
}
const consoleErrors = [];
function watch(page, who) {
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`[${who}] ${m.text()}`); });
  page.on('pageerror', e => consoleErrors.push(`[${who}] pageerror: ${e.message}`));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  return page;
}

/* ---------- page helpers ---------- */
function H(page) {
  const o = {
    page,
    dlg: () => page.locator('[role=dialog]'),
    btn: (name, scope) => (scope ? (typeof scope === 'string' ? page.locator(scope) : scope) : page).getByRole('button', { name, exact: true }).first(),
    click: async (name, scope) => { const b = o.btn(name, scope); await b.waitFor({ state: 'visible', timeout: 6000 }); await b.click(); },
    dclick: name => o.click(name, '[role=dialog]'),
    set: (label, value, scope) => page.evaluate(([l, v, s]) => window.__setField(l, v, s), [label, value, scope || null]),
    fill: async (pairs, scope) => { for (const [l, v] of pairs) await o.set(l, v, scope); },
    toast: async (text, timeout) => { await page.locator('[role=status]', { hasText: text }).first().waitFor({ timeout: timeout || 6000 }); },
    see: async (text, timeout) => { await page.getByText(text, { exact: false }).first().waitFor({ timeout: timeout || 6000 }); },
    notSee: async text => { await sleep(150); eq(await page.getByText(text, { exact: false }).count(), 0, 'should not see "' + text + '"'); },
    go: async hash => { for (let i = 0; i < 3 && await page.locator('[role=dialog]').count(); i++) { await page.keyboard.press('Escape'); await sleep(120); } await page.evaluate(h => { location.hash = h; }, hash); await sleep(250); },
    hash: () => page.evaluate(() => location.hash),
    closeDialog: async () => { if (await page.locator('[role=dialog]').count()) { await page.locator('[role=dialog] button[aria-label=Close]').first().click(); await sleep(150); } },
    /* Server mode: wait until the debounced sync has gone out. */
    settle: async () => { await sleep(SERVER ? 750 : 120); if (SERVER) await page.waitForFunction(() => !window.LSB.pending(), null, { timeout: 8000 }); await sleep(SERVER ? 100 : 0); },
    ls: (fn, arg) => page.evaluate(fn, arg),
    download: async action => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), action()]); return d; },
    chooseFile: async (action, file) => { const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }), action()]); await fc.setFiles(file); },
    fake: (fn, arg) => page.evaluate(fn, arg),
    shot: async name => { fs.mkdirSync(SHOTS, { recursive: true }); await sleep(500); await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); }
  };
  return o;
}
const iso = d => d.toISOString().slice(0, 10);
const plusDays = n => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() + n); return iso(d); };
const TODAY = plusDays(0);
const nextWeekday = n => { let s = plusDays(n); while ([0, 6].includes(new Date(s + 'T12:00:00').getDay())) { n++; s = plusDays(n); } return s; };

async function signIn(o, email, name) {
  await o.page.evaluate(([e, n]) => localStorage.setItem('__test_google', JSON.stringify({ email: e, name: n })), [email, name]);
  await o.page.locator('#gsi').waitFor({ timeout: 8000 });
  await o.page.locator('#gsi').click();
}
async function waitIn(o) { await o.page.waitForFunction(() => document.querySelector('aside nav') && !document.querySelector('.ls-boot') && !document.getElementById('gsi'), null, { timeout: 10000 }); await sleep(200); }

/* ---------- scenarios ---------- */
const OWNER = { email: 'owner@test.in', name: 'Asha Rao' }, JUNIOR = { email: 'junior@test.in', name: 'Ravi Kumar' };
const ORDER_TEXT = '1. Heard learned counsel for the parties on the application for interim relief.\n\n2. The respondent seeks time to file a reply, which is granted as a last opportunity.\n\n3. List on 15.01.2027 for final arguments.';
const ctx = {};   // ids gathered along the way

async function onboard(o, firm, kind, domain) {
  await o.page.locator('[role=dialog]', { hasText: 'Who is this for?' }).waitFor({ timeout: 10000 });
  await o.page.locator('[role=dialog] [data-pick="' + (kind || 'firm') + '"]').click(); await o.dclick('Continue');
  await o.page.locator('[role=dialog]', { hasText: 'Your area of practice' }).waitFor({ timeout: 5000 });
  eq(await o.page.locator('[role=dialog] button:has-text("Continue")').isDisabled(), true, 'Continue waits for an area');
  await o.page.locator('[role=dialog] [data-pick="' + (domain || 'general') + '"]').click(); await o.dclick('Continue');
  await o.page.locator('[role=dialog]', { hasText: 'Set up your practice' }).waitFor({ timeout: 5000 });
  await o.fill([['Designation', 'Managing Partner'], [{ advocate: 'Practice name', chamber: 'Chamber name', firm: 'Law firm name', corporate: 'Company or department name' }[kind || 'firm'], firm || 'Rao & Associates'], ['City', 'New Delhi'], ['Office address', '12 Lawyers Chambers, Delhi High Court']]);
  await o.dclick('Start using Legal Staff');
  await o.toast('Your practice is set up', 10000);
  await waitIn(o);
}

async function core(o) {
  const { page } = o;
  await step('sign in with Google and set up the firm', async () => {
    await page.goto(BASE + '/app.html');
    await signIn(o, OWNER.email, OWNER.name);
    await onboard(o);
    await o.see('Rao & Associates');
    if (SERVER) { const st = await o.fake(() => __fakeAdmin.state()); eq(st.firms.length, 1, 'firms on server'); eq(st.members[0].is_owner, true, 'owner member'); }
  });

  await step('client: create, edit, delete', async () => {
    await o.go('#/clients');
    await o.click('+ New client');
    await o.fill([['Client name', 'Mehta Traders Pvt Ltd'], ['Type', 'Company'], ['City', 'Delhi'], ['Contact person', 'R. Mehta, Director'], ['Phone', '9811000000'], ['Email', 'accounts@mehta.example']]);
    await o.dclick('Add client'); await o.toast('Client added');
    await page.getByRole('button', { name: /Mehta Traders Pvt Ltd/ }).first().click();
    await o.dclick('Edit'); await o.set('City', 'Gurugram'); await o.dclick('Save changes'); await o.toast('Client updated');
    await o.see('Gurugram');
    await o.click('+ New client'); await o.fill([['Client name', 'Temp Client']]); await o.dclick('Add client'); await o.toast('Client added');
    await page.getByRole('button', { name: /Temp Client/ }).first().click();
    await o.dclick('Delete'); await o.dclick('Delete client'); await o.toast('Client deleted');
    await o.notSee('Temp Client');
  });

  ctx.hd = nextWeekday(2);
  await step('case: create (with first hearing), edit, delete', async () => {
    await o.go('#/cases');
    await o.click('+ New case', 'main');
    await o.fill([['Case title', 'Mehta Traders v. Orion Logistics'], ['Case number', 'CS(COMM) 412/2026'], ['CNR (optional)', 'DLHC010012342026'], ['Court', 'Delhi HC · Court 4'], ['Client', 'Mehta Traders Pvt Ltd'], ['Next hearing date (optional)', ctx.hd], ['Time', '10:30']]);
    await o.dclick('Create case'); await o.toast('Case created');
    ctx.caseId = decodeURIComponent((await o.hash()).split('/')[2]);
    assert(ctx.caseId, 'case id in the address');
    await o.click('Edit case'); await o.set('Court', 'Delhi HC · Court 5'); await o.dclick('Save changes'); await o.toast('Case updated');
    await o.see('Delhi HC · Court 5');
    await o.go('#/cases'); await o.click('+ New case', 'main');
    await o.fill([['Case title', 'Temp v. Case'], ['Case number', 'CS 1/2026'], ['Court', 'Saket · Court 2']]); await o.dclick('Create case'); await o.toast('Case created');
    await o.click('Delete case', 'main'); await o.dclick('Delete case'); await o.toast('Case deleted');
    await o.go('#/cases'); await o.notSee('Temp v. Case'); await o.see('Mehta Traders v. Orion Logistics');
  });

  await step('labels, daily causelist, orders by date / notification, display board', async () => {
    await o.go('#/labels'); await o.click('+ Add label', 'main');
    await o.fill([['Code', 'sbi'], ['Full name', 'State Bank of India']]); await o.dclick('Add label'); await o.toast('Label added');
    await o.see('State Bank of India');
    await o.go('#/case/' + ctx.caseId); await o.click('Edit case');
    await page.getByRole('button', { name: 'SBI', exact: true }).click(); await o.fill([['File number (optional)', 'PV_1'], ['Court district (optional)', 'Patna']]);
    await o.dclick('Save changes'); await o.toast('Case updated');
    await o.see('File PV_1'); await o.see('Patna');
    await o.go('#/cases'); await o.see('SBI');
    await o.go('#/causelist'); await page.locator('input[aria-label="Go to date"]').fill(ctx.hd); await sleep(150);
    await o.see('Mehta Traders v. Orion Logistics'); await o.see('PV_1');
    await o.go('#/ordersdate'); await o.see('Orders by Date');
    await o.go('#/ordersnotif'); await o.see('Orders by Notification');
    await o.go('#/board'); await o.see('Display Board');
    await o.go('#/case/' + ctx.caseId); await o.click('Mark as application'); await o.toast('Marked as an application'); await o.click('Mark as case'); await o.toast('Marked as a case');
  });

  await step('hearing: add with a clash (asks first), edit, delete', async () => {
    await o.go('#/case/' + ctx.caseId);
    await o.click('+ Hearing');
    await o.fill([['Date', ctx.hd], ['Time', '10:30'], ['Purpose', 'Interim application']]);
    await o.dclick('Add to calendar');
    await o.page.locator('[role=dialog]', { hasText: 'This hearing clashes' }).waitFor();
    await o.dclick('Save anyway'); await o.toast('Hearing added to calendar');
    await page.getByRole('button', { name: /^Alerts/ }).click(); await o.see('hearings clash'); await page.keyboard.press('Escape');
    await o.go('#/case/' + ctx.caseId + '/hearings');
    await page.getByRole('button', { name: 'Edit hearing' }).first().click();
    await o.set('Time', '12:00'); await o.dclick('Save changes'); await o.toast('Hearing updated');
    await o.click('+ Hearing'); await o.fill([['Date', plusDays(30)], ['Time', '11:00'], ['Purpose', 'To be deleted']]); await o.dclick('Add to calendar'); await o.toast('Hearing added');
    const n = await page.getByRole('button', { name: 'Delete hearing' }).count();
    await page.getByRole('button', { name: 'Delete hearing' }).first().click(); await o.dclick('Delete hearing'); await o.toast('Hearing deleted');
    eq(await page.getByRole('button', { name: 'Delete hearing' }).count(), n - 1, 'hearings after delete');
  });

  await step('order: paste text, next date found, confirm, edit, delete', async () => {
    await o.go('#/case/' + ctx.caseId);
    await o.click('+ Order');
    await o.set('Order text', ORDER_TEXT); await o.dclick('Read order'); await o.toast('next date found');
    ctx.orderId = decodeURIComponent((await o.hash()).split('/')[2]);
    await o.see('15 January 2027');
    await o.click('Confirm and add to calendar'); await o.toast('Hearing added to the calendar');
    await o.see('Added to calendar. Hearing history updated.');
    await o.click('Edit order'); await o.set('Order text', ORDER_TEXT.replace('15.01.2027', '22.01.2027')); await o.dclick('Save changes'); await o.toast('confirm the new next date');
    await o.see('22 January 2027');
    await o.click('Confirm and add to calendar'); await o.toast('Hearing added to the calendar');
    await o.go('#/case/' + ctx.caseId); await o.click('+ Order');
    await o.set('Order text', '1. Matter not reached today. Renotify.'); await o.dclick('Read order'); await o.toast('Order saved');
    await o.click('Delete order'); await o.dclick('Delete order'); await o.toast('Order deleted');
    eq(await o.hash(), '#/orders', 'back on the orders list');
  });

  await step('task: add, complete, edit, delete', async () => {
    await o.go('#/case/' + ctx.caseId);
    await o.click('+ Add task');
    await o.fill([['Task', 'File reply to interim application'], ['Due date', plusDays(3)]]); await o.dclick('Add task'); await o.toast('Task added');
    await page.getByRole('button', { name: 'Complete task' }).first().click(); await o.toast('Task completed');
    await page.getByRole('button', { name: 'Edit task' }).first().click(); await o.set('Task', 'File reply (revised)'); await o.dclick('Save changes'); await o.toast('Task updated');
    await o.see('File reply (revised)');
    await page.getByRole('button', { name: 'Delete task' }).first().click(); await o.dclick('Delete task'); await o.toast('Task deleted');
    await o.notSee('File reply (revised)');
    await o.click('+ Add task'); await o.fill([['Task', 'Collect certified copy'], ['Due date', plusDays(5)]]); await o.dclick('Add task'); await o.toast('Task added');
  });
}

const FY = (() => { const d = new Date(), y = d.getFullYear(), a = d.getMonth() >= 3 ? y : y - 1; return a + '-' + String((a + 1) % 100).padStart(2, '0'); })();
const invText = page => page.locator('#ls-invoice').innerText();
/* The invoice as it prints (print media: only .ls-print is visible), on an A4-width page. */
async function printShot(page, name) {
  await page.emulateMedia({ media: 'print' }); await page.setViewportSize({ width: 794, height: 1123 });
  const vis = await page.evaluate(() => { const el = document.getElementById('ls-invoice'), r = el.getBoundingClientRect(); return getComputedStyle(el).visibility === 'visible' && getComputedStyle(document.querySelector('header')).visibility === 'hidden' && r.left < 2 && r.width > 700; });
  await page.screenshot({ path: path.join(SHOTS, `gst-invoice-${name}-print-${MODE}.png`) });
  await page.emulateMedia({ media: 'screen' }); await page.setViewportSize({ width: 1280, height: 900 });
  assert(vis, 'print view shows only the invoice, full width');
}
async function newInvoice(o, pairs) {
  await o.go('#/billing'); await o.click('+ New invoice');
  await o.fill(pairs); await o.dclick('Create invoice');
  await o.page.locator('#ls-invoice').waitFor();
  return invText(o.page);
}
async function gst(o) {
  const { page } = o;
  await step('firm profile: GST registration, state, PAN and invoice prefix', async () => {
    await o.go('#/settings');
    await o.fill([['Legal name on invoices (if different)', 'Rao and Associates LLP'], ['State', '07'], ['GST registration', 'yes'], ['GSTIN', '07AAAFR1234K1Z5'], ['PAN (optional)', 'AAAFR1234K'], ['Invoice number prefix', 'ls']], 'Firm profile');
    await o.click('Save', page.locator('section', { has: page.locator('h2', { hasText: 'Firm profile' }) })); await o.toast('Saved');
    await o.see('LS/' + FY + '/0001, 0002');
    if (SERVER) { await o.settle(); const st = await o.fake(() => __fakeAdmin.state().firms[0]); eq(st.gstin, '07AAAFR1234K1Z5', 'GSTIN column'); eq(st.state.profile.stateCode, '07', 'state in firm profile'); eq(st.state.profile.prefix, 'LS', 'prefix'); }
  });
  await step('GST invoice: intra-state CGST + SGST, numbered LS/FY/0001', async () => {
    const t = await newInvoice(o, [['Description', 'Professional fees: drafting and appearance'], ['Taxable value (₹)', '50000']]);
    for (const x of ['TAX INVOICE', 'Rao and Associates LLP', 'GSTIN 07AAAFR1234K1Z5', 'PAN AAAFR1234K', 'LS/' + FY + '/0001', 'Place of supply Delhi (07)', 'Tax payable on reverse charge No', '998212', 'CGST @ 9%', 'SGST @ 9%', '₹4,500', '₹59,000', 'Rupees Fifty Nine Thousand Only', 'Mehta Traders Pvt Ltd', 'Authorised signatory'])
      assert(t.includes(x), 'invoice shows "' + x + '"\n' + t);
    assert(!t.includes('IGST'), 'no IGST within the state');
    await sleep(400); await page.locator('#ls-invoice').screenshot({ path: path.join(SHOTS, `gst-invoice-intra-${MODE}.png`) }); await printShot(page, 'intra');
    await o.dclick('Mark as paid'); await o.toast('Invoice marked paid');
    await o.dclick('Mark unpaid'); await o.toast('Marked unpaid');
    await o.dclick('Edit'); await o.set('Taxable value (₹)', '60000'); await o.dclick('Save changes'); await o.see('₹70,800');
    assert((await invText(page)).includes('LS/' + FY + '/0001'), 'number unchanged after edit');
  });
  await step('GST invoice: inter-state IGST', async () => {
    const t = await newInvoice(o, [['Description', 'Appearance before the Bombay High Court'], ['Taxable value (₹)', '75000'], ['Place of supply', '27'], ["Client's billing address", '4th floor, Nariman Point, Mumbai']]);
    for (const x of ['LS/' + FY + '/0002', 'Place of supply Maharashtra (27)', 'IGST @ 18%', '₹13,500', '₹88,500', 'Rupees Eighty Eight Thousand Five Hundred Only', 'Nariman Point']) assert(t.includes(x), 'invoice shows "' + x + '"\n' + t);
    assert(!t.includes('CGST'), 'no CGST across states');
    await sleep(400); await page.locator('#ls-invoice').screenshot({ path: path.join(SHOTS, `gst-invoice-inter-${MODE}.png`) }); await printShot(page, 'inter');
  });
  await step('GST invoice: business client with GSTIN → reverse charge, no tax charged', async () => {
    await o.go('#/billing'); await o.click('+ New invoice');
    await o.fill([['Description', 'Legal opinion on the supply contract'], ['Taxable value (₹)', '100000'], ["Client's GSTIN (optional)", '27AAACM1234B1Z2']]);
    const mode = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] label')].find(l => l.textContent === 'Tax treatment').parentElement.querySelector('select').value); eq(mode, 'rcm', 'treatment switches to reverse charge');
    await o.see('the client pays IGST');
    await o.dclick('Create invoice'); await page.locator('#ls-invoice').waitFor();
    const t = await invText(page);
    for (const x of ['Tax payable on reverse charge Yes', 'payable by the recipient', 'GST charged on this invoice', 'GSTIN 27AAACM1234B1Z2', '₹18,000', 'Rupees One Lakh Only', 'Check with your CA']) assert(t.includes(x), 'invoice shows "' + x + '"\n' + t);
    assert(/Total\s*₹1,00,000/.test(t), 'total equals the taxable value\n' + t);
    await sleep(400); await page.locator('#ls-invoice').screenshot({ path: path.join(SHOTS, `gst-invoice-rcm-${MODE}.png`) });
  });
  await step('invoice numbers: a new series each financial year, the old one continues', async () => {
    const [y] = FY.split('-'), nextFyDate = (+y + 1) + '-04-02', lastDay = (+y + 1) + '-03-31', nfy = (+y + 1) + '-' + String((+y + 2) % 100).padStart(2, '0');
    let t = await newInvoice(o, [['Description', 'Fees, April'], ['Taxable value (₹)', '1000'], ['Invoice date', nextFyDate]]); assert(t.includes('LS/' + nfy + '/0001'), 'new FY starts at 0001\n' + t);
    t = await newInvoice(o, [['Description', 'Fees, March'], ['Taxable value (₹)', '1000'], ['Invoice date', lastDay]]); assert(t.includes('LS/' + FY + '/0004'), 'current FY continues at 0004\n' + t);
    await o.dclick('Edit'); await o.set('Invoice date', nextFyDate); await o.dclick('Save changes'); await o.see('Keep the date in FY ' + FY);
    await o.closeDialog();
    if (SERVER) { const s = await o.fake(() => __fakeAdmin.state().invoice_series); assert(s.some(x => x.prefix === 'LS/' + FY + '/' && x.last === 4) && s.some(x => x.prefix === 'LS/' + nfy + '/' && x.last === 1), 'server counters ' + JSON.stringify(s)); }
  });
  await step('unregistered firm: bill of supply, no GST', async () => {
    await o.go('#/settings'); await o.set('GST registration', 'no', 'Firm profile');
    await o.click('Save', page.locator('section', { has: page.locator('h2', { hasText: 'Firm profile' }) })); await o.toast('Saved');
    await o.go('#/billing'); await o.click('+ New invoice');
    const opts = await page.evaluate(() => [...[...document.querySelectorAll('[role=dialog] label')].find(l => l.textContent === 'Tax treatment').parentElement.querySelector('select').options].map(x => x.value).join(','));
    eq(opts, 'bos', 'only a bill of supply');
    await o.fill([['Description', 'Drafting of a will'], ['Taxable value (₹)', '15000']]); await o.dclick('Create invoice'); await page.locator('#ls-invoice').waitFor();
    const t = await invText(page);
    for (const x of ['BILL OF SUPPLY', 'not registered under GST', 'Rupees Fifteen Thousand Only']) assert(t.includes(x), 'shows "' + x + '"\n' + t);
    assert(!/CGST|IGST|reverse charge/.test(t), 'no GST lines\n' + t);
    await o.go('#/settings'); await o.set('GST registration', 'yes', 'Firm profile');
    await o.click('Save', page.locator('section', { has: page.locator('h2', { hasText: 'Firm profile' }) })); await o.toast('Saved');
  });
  await step('an invoice saved before GST fields existed still reads correctly', async () => {
    await o.settle();
    const legacy = { id: 'ilegacy', no: 'INV-2026-001', clientId: '', caseId: ctx.caseId, date: TODAY, amount: 10000, paid: false, paidOn: '', desc: 'Old invoice' };
    if (SERVER) await o.fake(([inv]) => { const S = __fakeAdmin.state(); S.records.push({ firm_id: S.firms[0].id, kind: 'invoice', id: inv.id, data: inv, updated_at: '' }); __fakeAdmin.save(); }, [legacy]);
    else await o.ls(([inv]) => { const d = JSON.parse(localStorage.getItem('ls.app.v2')); d.invoices.push(inv); localStorage.setItem('ls.app.v2', JSON.stringify(d)); }, [legacy]);
    await page.reload(); await waitIn(o);
    await o.go('#/billing'); await page.getByRole('button', { name: /INV-2026-001/ }).click();
    const t = await invText(page); for (const x of ['TAX INVOICE', 'INV-2026-001', 'CGST @ 9%', '₹11,800']) assert(t.includes(x), 'legacy shows "' + x + '"\n' + t);
    await o.see('Saved before GST details were recorded');
    await o.dclick('Delete'); await o.dclick('Delete invoice'); await o.toast('Invoice deleted');
  });
  await step('invoices CSV has the GST columns', async () => {
    await o.go('#/billing'); const d = await o.download(() => o.click('Export CSV'));
    const csv = fs.readFileSync(await d.path(), 'utf8'); assert(/Place of supply.*CGST.*SGST.*IGST.*Reverse charge/.test(csv.split('\n')[0]), csv.split('\n')[0]);
    assert(csv.includes('LS/' + FY + '/0002') && csv.includes('Maharashtra (27)'), 'rows');
  });
  await step('pricing: no AI credits; honest AI line', async () => {
    await o.go('#/pricing'); await o.notSee('AI credits'); await o.see('AI features: coming soon');
    if (!SERVER) eq(await page.locator('#ls-plan-banner').count(), 0, 'no plan banner without a server');
  });
}

async function files(o) {
  const { page } = o;
  await step('document: upload, download, delete', async () => {
    await o.go('#/documents');
    await o.click('+ Upload');
    await o.fill([['Type', 'Pleading'], ['Title (optional)', 'Plaint with annexures']]);
    await o.chooseFile(() => o.dclick('Choose file…'), { name: 'plaint.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 plaint test file') });
    await o.toast('Document uploaded');
    await o.see('Plaint with annexures');
    if (SERVER) { const keys = await o.fake(() => Object.keys(__fakeAdmin.state().storage)); assert(keys.some(k => k.endsWith('/plaint.pdf')), 'file stored on the server: ' + keys.join(',')); }
    const d = await o.download(() => page.getByRole('button', { name: 'Download', exact: true }).first().click());
    eq(d.suggestedFilename(), 'plaint.pdf', 'downloaded file name');
    const body = fs.readFileSync(await d.path(), 'utf8'); assert(body.includes('plaint test file'), 'downloaded content');
    await page.getByRole('button', { name: 'Delete Plaint with annexures' }).click(); await o.dclick('Delete'); await o.toast('Deleted');
    await o.notSee('Plaint with annexures');
    if (SERVER) { const keys = await o.fake(() => Object.keys(__fakeAdmin.state().storage)); assert(!keys.some(k => k.endsWith('/plaint.pdf')), 'file removed from the server'); }
    await o.click('+ Upload'); await o.fill([['Title (optional)', 'Vakalatnama']]);
    await o.chooseFile(() => o.dclick('Choose file…'), { name: 'vakalat.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 vakalat') });
    await o.toast('Document uploaded');
  });
  await step('evidence: add an exhibit with chain of custody', async () => {
    await o.go('#/evidence');
    await o.click('+ Add evidence');
    await o.fill([['Exhibit mark', 'Ex. P-1'], ['Source / chain of custody', 'Original invoice received from client on 3 Nov']]);
    await o.chooseFile(() => o.dclick('Choose file…'), { name: 'invoice-scan.png', mimeType: 'image/png', buffer: Buffer.from('PNGDATA') });
    await o.toast('Evidence added');
    await o.see('Ex. P-1'); await o.see('Original invoice received from client');
  });
}

async function deadlines(o) {
  const { page } = o;
  await step('deadline: add one and mark it done', async () => {
    await o.go('#/limitation');
    await o.click('+ Add a deadline');
    await o.fill([['What is due', 'Written statement'], ['Provision or basis', 'Order VIII r.1 CPC'], ['Last date', plusDays(20)], ['Linked case (optional)', 'Mehta Traders v. Orion Logistics']]);
    await o.dclick('Add deadline'); await o.toast('Deadline added');
    await o.click('Mark done'); await o.toast('Marked done');
    await o.see('Undo');
  });
  await step('limitation: preset with certified copy, missing fact, approve → deadline', async () => {
    await o.go('#/limitation');
    await o.click('New calculation');
    const start = plusDays(-20), applied = plusDays(-18), ready = plusDays(-8);
    await o.set('Matter', 'Appeal against order in CS 412/2026');
    await o.set('Rule', 'fa_dc');
    await o.set('Date of the decree or order', start);
    await o.set('Certified copy applied for on (leave empty if none)', applied);
    await o.set('Linked case (optional)', 'Mehta Traders v. Orion Logistics');
    await o.dclick('Start calculation'); await o.toast('Calculation started');
    await o.see('One fact is missing');
    await page.evaluate(v => { const i = [...document.querySelectorAll('main input[type=date]')].pop(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, ready);
    await o.click('Use this date');
    const due = await page.evaluate(([s, a, r]) => LS.limitation({ rule: 'fa_dc', judgment: s, applied: a, ready: r }).due, [start, applied, ready]);
    const label = await page.evaluate(d => LS.longDate(d), due);
    await o.see(label);
    await o.click('Approve and set alerts'); await o.toast('Approved');
    await o.see('Limitation (approved)');
    await o.see('Approved by');
  });
}

async function outcomes(o) {
  const { page } = o;
  await step('hearing outcome with a next date adds the next hearing', async () => {
    await o.go('#/case/' + ctx.caseId);
    await o.click('+ Hearing'); await o.fill([['Date', TODAY], ['Time', '15:15'], ['Purpose', 'Arguments on IA']]); await o.dclick('Add to calendar'); await o.toast('Hearing added');
    await o.go('#/case/' + ctx.caseId + '/hearings');
    await o.click('Record outcome');
    ctx.next = nextWeekday(9);
    await o.fill([['Outcome', 'Adjourned'], ['Short note (optional)', 'Respondent sought time'], ['Next date (optional)', ctx.next], ['Time', '15:15']]);
    await o.dclick('Save outcome'); await o.toast('next hearing added');
    const dmy = await page.evaluate(d => LS.dmy(d), ctx.next);
    await o.see('Next date ' + dmy);
    await o.see('Respondent sought time');
  });
  await step('case details and Case Brain answer with a citation', async () => {
    await o.go('#/case/' + ctx.caseId);
    await o.click('Case details');
    await page.evaluate(() => { const blk = [...document.querySelectorAll('[role=dialog] div')].find(x => x.firstChild && x.firstChild.textContent === 'Issues' && x.querySelector('button')); [...blk.querySelectorAll('button')].find(b => b.textContent === '+ Add').click(); });
    await page.locator('[data-list="issues"]').first().fill('Whether the claim is barred by limitation');
    await o.dclick('Save case details'); await o.toast('Case details saved');
    await o.see('Whether the claim is barred by limitation');
    await o.click('Hearing brief');
    await page.waitForFunction(() => location.hash === '#/brain');
    await o.see('Hearing brief');
    await o.click('What are the issues?');
    await page.locator('button.ls-cite', { hasText: 'Case details › Issues' }).last().waitFor();
    await page.locator('button.ls-cite', { hasText: 'Case details › Issues' }).last().click();
    await page.locator('[role=dialog]', { hasText: 'Case details' }).waitFor();
    await o.closeDialog();
  });
}

async function exportsAndSearch(o) {
  const { page } = o;
  await step('exports: invoices CSV, hearings ICS, draft DOCX', async () => {
    await o.go('#/billing');
    let d = await o.download(() => o.click('Export CSV')); eq(d.suggestedFilename(), 'invoices.csv');
    await o.go('#/calendar'); await o.click('Today');
    d = await o.download(() => o.click('Export .ics')); assert(/^hearings-.*\.ics$/.test(d.suggestedFilename()), d.suggestedFilename());
    const ics = fs.readFileSync(await d.path(), 'utf8'); assert(ics.includes('BEGIN:VEVENT') && ics.includes('Mehta Traders'), 'ICS has the hearing');
    await o.go('#/drafting');
    d = await o.download(() => o.click('Export DOCX')); assert(/\.docx$/.test(d.suggestedFilename()), d.suggestedFilename());
    const head = fs.readFileSync(await d.path()).slice(0, 2).toString(); eq(head, 'PK', 'DOCX is a zip');
  });
  await step('search finds the case and opens it', async () => {
    await o.go('#/dashboard');
    await page.locator('#ls-search').fill('Orion');
    await page.locator('#ls-search').press('ArrowDown');
    await o.see('CS(COMM) 412/2026');
    await page.locator('#ls-search').press('Enter');
    await page.waitForFunction(() => location.hash.startsWith('#/case/'));
  });
}

async function settingsProfile(o) {
  await step('settings: profile save', async () => {
    await o.go('#/settings');
    await o.set('Mobile (WhatsApp)', '9876543210', 'Your profile');
    await o.click('Save', o.page.locator('section', { has: o.page.locator('h2', { hasText: 'Your profile' }) }));
    await o.toast('Saved');
    if (SERVER) { await o.settle(); const m = await o.fake(e => __fakeAdmin.state().members.find(x => x.email === e), OWNER.email); eq(m.phone, '9876543210', 'phone on the server'); }
    else { const p = await o.ls(() => JSON.parse(localStorage.getItem('ls.app.v2')).user.phone); eq(p, '9876543210', 'phone saved on device'); }
  });
}

const SCREENS = ['dashboard', 'cases', 'orders', 'calendar', 'limitation', 'brain', 'drafting', 'pricing', 'admin', 'workspace', 'courts', 'clients', 'documents', 'evidence', 'research', 'agents', 'team', 'billing', 'portal', 'reports', 'settings'];
async function narrow(o, label) {
  const { page } = o;
  await step('390px: no horizontal overflow on any screen' + (label ? ' (' + label + ')' : ''), async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const bad = [];
    const extra = ['case/' + ctx.caseId, 'case/' + ctx.caseId + '/hearings', 'case/' + ctx.caseId + '/documents', 'case/' + ctx.caseId + '/timeline', 'order/' + ctx.orderId];
    for (const s of [...SCREENS, ...extra]) {
      await o.go('#/' + s); await sleep(120);
      const w = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
      if (w > 391) bad.push(s + ' (' + w + 'px)');
    }
    await o.go('#/billing'); await page.locator('main').getByRole('button', { name: /LS\// }).first().click(); await page.locator('#ls-invoice').waitFor(); await sleep(400);
    const inv = await page.evaluate(() => { const el = document.getElementById('ls-invoice'), d = el.closest('[role=dialog]'); return { w: el.scrollWidth - el.clientWidth, right: d.getBoundingClientRect().right, page: document.documentElement.scrollWidth }; });
    if (inv.w > 1 || inv.right > 391 || inv.page > 391) bad.push('invoice dialog ' + JSON.stringify(inv));
    await page.screenshot({ path: path.join(SHOTS, `invoice-390-${MODE}.png`) }); await o.closeDialog();
    if (SERVER) { await o.go('#/team'); await page.screenshot({ path: path.join(SHOTS, 'team-390.png') }); }
    await page.setViewportSize({ width: 1280, height: 900 });
    assert(!bad.length, 'overflow on: ' + bad.join(', '));
  });
}

async function persistence(o) {
  const { page } = o;
  await step('reload keeps everything' + (SERVER ? ' (server)' : ' (this device)'), async () => {
    await o.settle();
    await page.reload(); await waitIn(o);
    await o.go('#/cases'); await o.see('Mehta Traders v. Orion Logistics');
    await o.go('#/clients'); await o.see('Mehta Traders Pvt Ltd'); await o.see('Gurugram');
    await o.go('#/case/' + ctx.caseId); await o.see('Whether the claim is barred by limitation'); await o.see('Collect certified copy');
    await o.go('#/limitation'); await o.see('Appeal against order in CS 412/2026'); await o.see('Written statement');
    await o.go('#/evidence'); await o.see('Ex. P-1');
    if (SERVER) { const kinds = await o.fake(() => [...new Set(__fakeAdmin.records().map(r => r.kind))].sort().join(',')); for (const k of ['case', 'client', 'deadline', 'doc', 'hearing', 'limitation', 'log', 'order', 'task']) assert(kinds.split(',').includes(k), 'server has ' + k + ' records: ' + kinds); }
  });
}

async function paging(o) {
  await step('server: more than 1,000 records load in pages (PostgREST cap)', async () => {
    await o.settle();
    const n = await o.fake(() => { const S = __fakeAdmin.state(), f = S.firms[0].id; for (let i = 0; i < 1150; i++) S.records.push({ firm_id: f, kind: 'client', id: 'zz' + String(i).padStart(5, '0'), data: { id: 'zz' + i, name: 'Bulk client ' + i, type: 'Individual', city: '', contact: '', phone: '', email: '', notes: '', portal: false, share: { dates: true, orders: true, invoices: false } }, updated_at: '' }); __fakeAdmin.save(); return S.records.filter(r => r.kind === 'client').length; });
    const short = await o.fake(() => __fakeAdmin.from('records').select('id').eq('kind', 'client')); eq(short.data.length, 1000, 'an unbounded select is capped at 1,000 rows');
    await o.page.reload(); await waitIn(o);
    await o.go('#/clients'); await o.see(n + ' clients');
    await o.fake(() => { const S = __fakeAdmin.state(); S.records = S.records.filter(r => !String(r.id).startsWith('zz')); __fakeAdmin.save(); });
    await o.page.reload(); await waitIn(o);
  });
}

async function asUser(o, who) { await o.settle(); await o.fake(([e, n]) => __fakeAdmin.signInAs(e, n), [who.email, who.name]); await o.page.reload(); await waitIn(o); }

async function team(o) {
  const { page } = o;
  await step('team: invite a member, who joins on first sign-in', async () => {
    await o.go('#/team');
    await o.click('+ Invite member');
    await o.fill([['Full name', JUNIOR.name], ['Work email', JUNIOR.email], ['Role', 'Associate']]);
    await o.dclick('Add to team'); await o.toast('Team member added');
    await o.settle(); await o.see('Invited');
    const m = await o.fake(e => __fakeAdmin.state().members.find(x => x.email === e), JUNIOR.email);
    assert(m && m.status === 'Invited' && !m.user_id, 'invite stored on the server');
    await o.fake(() => __fakeAdmin.signOut()); await page.reload();
    await signIn(o, JUNIOR.email, JUNIOR.name); await waitIn(o);
    await o.see('Rao & Associates');
    await o.go('#/cases'); await o.see('Mehta Traders v. Orion Logistics');
    await o.go('#/team'); eq(await page.getByText('Invited', { exact: true }).count(), 0, 'no one is still invited');
    const m2 = await o.fake(e => __fakeAdmin.state().members.find(x => x.email === e), JUNIOR.email); eq(m2.status, 'Active', 'member active');
    await o.go('#/settings'); await o.notSee('Delete firm data');
    await asUser(o, OWNER);
  });
}

async function serverSettings(o) {
  const { page } = o;
  await step('settings: clear this device signs out and keeps server data', async () => {
    await o.go('#/settings');
    await o.click('Clear', page.locator('section', { has: page.locator('h2', { hasText: "Your firm's data" }) }));
    await o.dclick('Clear and sign out');
    await page.locator('#gsi').waitFor({ timeout: 8000 });
    const left = await o.ls(() => Object.keys(localStorage).filter(k => /^ls[.-]/.test(k)).length); eq(left, 0, 'app keys left in localStorage');
    await signIn(o, OWNER.email, OWNER.name); await waitIn(o);
    await o.go('#/cases'); await o.see('Mehta Traders v. Orion Logistics');
  });
  await step('settings: owner deletes the firm data (typed confirmation)', async () => {
    await o.go('#/settings');
    await o.click('Delete', page.locator('section', { has: page.locator('h2', { hasText: "Your firm's data" }) }));
    await o.set('Type the firm name to confirm: Rao & Associates', 'Rao & Associates');
    await o.dclick('Delete firm data'); await o.toast('Firm data deleted', 10000);
    await o.go('#/cases'); await o.see('No cases yet');
    const st = await o.fake(() => __fakeAdmin.state()); eq(st.records.length, 0, 'records left'); eq(Object.keys(st.storage).length, 0, 'files left'); eq(st.members.length, 4, 'members kept');
  });
}

const CLERK = { email: 'clerk@test.in', name: 'Sunil Clerk' }, VIEWER = { email: 'viewer@test.in', name: 'Vidya Viewer' };
const disabledWhy = async loc => { await loc.waitFor({ timeout: 6000 }); return (await loc.isDisabled()) ? (await loc.getAttribute('title')) || 'disabled' : ''; };
async function invite(o, who, role) { await o.go('#/team'); await o.click('+ Invite member'); await o.fill([['Full name', who.name], ['Work email', who.email], ['Role', role]]); await o.dclick('Add to team'); await o.toast('Team member added'); await o.settle(); }
async function joinAs(o, who) { await o.settle(); await o.fake(() => __fakeAdmin.signOut()); await o.page.reload(); await signIn(o, who.email, who.name); await waitIn(o); }
const firmId = o => o.fake(() => __fakeAdmin.state().firms[0].id);

async function roles(o) {
  const { page } = o;
  await step('roles: owner adds a clerk and a viewer (Firm plan)', async () => {
    await o.fake(f => __fakeAdmin.setSub(f, 'Firm', '2099-01-01'), await firmId(o)); await page.reload(); await waitIn(o);
    await invite(o, CLERK, 'Clerk'); await invite(o, VIEWER, 'Viewer');
    await o.see('Clerk / staff'); await o.see('Viewer (read-only)');
    await joinAs(o, CLERK); await joinAs(o, VIEWER); await joinAs(o, OWNER);
    const st = await o.fake(() => __fakeAdmin.state().members.map(m => m.email + ':' + m.status).join(',')); assert(/clerk@test.in:Active/.test(st) && /viewer@test.in:Active/.test(st), st);
  });
  await step('roles: associate — invoices without paid/delete, own deletes only, no team or firm settings', async () => {
    await asUser(o, JUNIOR);
    await o.go('#/billing'); assert(!(await disabledWhy(o.btn('+ New invoice'))), 'associate can raise invoices');
    await page.getByRole('button', { name: new RegExp('LS/' + FY + '/0002') }).click(); await page.locator('#ls-invoice').waitFor();
    assert(/owner or a partner/.test(await disabledWhy(o.btn('Mark as paid', '[role=dialog]'))), 'mark paid disabled with a reason');
    assert(/owner or a partner/.test(await disabledWhy(o.btn('Delete', '[role=dialog]'))), 'delete disabled with a reason');
    assert(!(await disabledWhy(o.btn('Edit', '[role=dialog]'))), 'edit allowed while unpaid');
    await o.shot('role-associate-invoice');
    const t = await newInvoice(o, [['Description', 'Fees raised by the associate'], ['Taxable value (₹)', '2000']]); assert(new RegExp('LS/' + FY + '/\\d{4}').test(t), t);
    await o.go('#/team'); assert(/Only the firm owner/.test(await disabledWhy(o.btn('+ Invite member'))), 'invite disabled');
    await o.go('#/settings'); eq(await page.locator('section', { has: page.locator('h2', { hasText: 'Firm profile' }) }).getByRole('button', { name: 'Save' }).count(), 0, 'firm profile read-only');
    await o.notSee('Delete firm data'); await o.see('Only the firm owner or a partner can change the firm profile');
    await o.go('#/case/' + ctx.caseId);
    assert(/cannot delete items other people added/.test(await disabledWhy(o.btn('Delete case', 'main'))), 'cannot delete the owner\'s case');
    assert(!(await disabledWhy(o.btn('Edit case'))), 'can edit the case');
    assert(await page.getByRole('button', { name: 'Delete task' }).first().isDisabled(), 'owner\'s task cannot be deleted');
    await o.click('+ Add task'); await o.fill([['Task', 'Associate own task'], ['Due date', plusDays(4)]]); await o.dclick('Add task'); await o.toast('Task added');
    const row = page.locator('div', { hasText: 'Associate own task' }).filter({ has: page.getByRole('button', { name: 'Delete task' }) }).last();
    assert(!(await row.getByRole('button', { name: 'Delete task' }).isDisabled()), 'own task can be deleted');
    await row.getByRole('button', { name: 'Delete task' }).click(); await o.dclick('Delete task'); await o.toast('Task deleted');
    await o.go('#/documents'); assert(/uploaded files/.test(await disabledWhy(page.getByRole('button', { name: 'Delete Vakalatnama' }))), 'cannot delete an uploaded file');
    await o.shot('role-associate-documents');
  });
  await step('roles: server refuses an associate (invoice delete / paid, file delete, members)', async () => {
    await o.settle();
    const r = await o.fake(async () => { const S = __fakeAdmin.state(), f = S.firms[0].id, inv = S.records.find(x => x.kind === 'invoice' && !x.data.paid), out = {};
      out.del = (await __fakeAdmin.from('records').delete().eq('firm_id', f).eq('kind', 'invoice').eq('id', inv.id)).error;
      out.paid = (await __fakeAdmin.from('records').upsert([{ firm_id: f, kind: 'invoice', id: inv.id, data: Object.assign({}, inv.data, { paid: true, paidOn: '2026-11-16' }) }])).error;
      out.edit = (await __fakeAdmin.from('records').upsert([{ firm_id: f, kind: 'invoice', id: inv.id, data: Object.assign({}, inv.data, { desc: 'Edited by associate' }) }])).error;
      const path = Object.keys(S.storage).find(k => k.endsWith('/vakalat.pdf')); out.rm = (await __fakeAdmin.storage().remove([path])).data.length; out.still = !!__fakeAdmin.state().storage[path];
      out.member = (await __fakeAdmin.from('members').insert({ firm_id: f, email: 'x@test.in', name: 'X', role: 'Associate' })).error;
      out.role = await __fakeAdmin.rpc('member_role', { f }); return out; });
    eq(r.del && r.del.code, '42501', 'invoice delete refused'); assert(/owner or a partner/.test(r.del.message), r.del.message);
    eq(r.paid && r.paid.code, '42501', 'paid refused'); eq(r.edit, null, 'an associate may edit an unpaid invoice');
    eq(r.rm, 0, 'file not removed'); eq(r.still, true, 'file still stored'); eq(r.member && r.member.code, '42501', 'member insert refused'); eq(r.role.data, 'associate', 'member_role');
  });
  await step('roles: clerk — hearings yes; cases, orders, invoices no', async () => {
    await asUser(o, CLERK);
    assert(/cannot do this/.test(await disabledWhy(o.btn('+ New case', 'header'))), 'new case disabled');
    await o.go('#/case/' + ctx.caseId);
    assert(!(await disabledWhy(o.btn('+ Hearing'))), 'clerk can add a hearing'); assert(await disabledWhy(o.btn('+ Order')), 'no orders'); assert(await disabledWhy(o.btn('Edit case')), 'no case edits');
    await o.shot('role-clerk-case');
    await o.click('+ Hearing'); await o.fill([['Date', plusDays(40)], ['Time', '14:00'], ['Purpose', 'Added by clerk']]); await o.dclick('Add to calendar'); await o.toast('Hearing added');
    await o.go('#/billing'); assert(await disabledWhy(o.btn('+ New invoice')), 'no invoices'); await o.see('LS/' + FY + '/0001');
    await o.settle();
    const e = await o.fake(async () => { const S = __fakeAdmin.state(), inv = S.records.find(x => x.kind === 'invoice'); return (await __fakeAdmin.from('records').upsert([{ firm_id: inv.firm_id, kind: 'invoice', id: inv.id, data: Object.assign({}, inv.data, { desc: 'clerk' }) }])).error; });
    eq(e && e.code, '42501', 'server refuses invoice writes by a clerk');
  });
  await step('roles: viewer — read-only in the app and on the server', async () => {
    await asUser(o, VIEWER);
    await o.go('#/case/' + ctx.caseId);
    assert(/read-only/.test(await disabledWhy(o.btn('+ Hearing'))), '+ Hearing disabled for a viewer');
    await page.getByRole('button', { name: /Complete task|Reopen task/ }).first().click(); await o.toast('read-only');
    await o.settle();
    const e = await o.fake(async () => { const S = __fakeAdmin.state(), f = S.firms[0].id; return (await __fakeAdmin.from('records').upsert([{ firm_id: f, kind: 'task', id: 'tviewer', data: { id: 'tviewer', t: 'x' } }])).error; });
    eq(e && e.code, '42501', 'server refuses writes by a viewer');
    await asUser(o, OWNER);
    await o.go('#/billing'); await page.getByRole('button', { name: new RegExp('LS/' + FY + '/0002') }).click(); await o.dclick('Mark as paid'); await o.toast('Invoice marked paid'); await o.settle();
    const paid = await o.fake(() => __fakeAdmin.records('invoice').find(r => /0002$/.test(r.data.no)).data.paid); eq(paid, true, 'owner marked paid on the server');
  });
}

async function plans(o) {
  const { page } = o;
  const setSub = async (plan, renews) => { await o.settle(); await o.fake(([f, p, r]) => __fakeAdmin.setSub(f, p, r), [await firmId(o), plan, renews]); await page.reload(); await waitIn(o); };
  await step('plan: seat limit on invite (app and server)', async () => {
    await setSub('Solo', '2099-01-01');
    await o.go('#/team'); await o.see('4 of 1 seat used (Solo plan)');
    await o.click('+ Invite member'); await o.toast('allows 1 user');
    const e = await o.fake(async () => (await __fakeAdmin.from('members').insert({ firm_id: __fakeAdmin.state().firms[0].id, email: 'extra@test.in', name: 'Extra', role: 'Associate' })).error);
    assert(e && /allows 1 user/.test(e.message), 'server refuses the extra seat: ' + JSON.stringify(e));
  });
  await step('plan: open-case and storage limits', async () => {
    await o.fake(() => { const S = __fakeAdmin.state(), f = S.firms[0].id; for (let i = 0; i < 150; i++) S.records.push({ firm_id: f, kind: 'case', id: 'cbulk' + i, data: { id: 'cbulk' + i, title: 'Bulk ' + i, no: 'B' + i, court: 'X', status: 'active', team: [], parties: [], issues: [] }, updated_at: '' }); S.records.push({ firm_id: f, kind: 'doc', id: 'dbig', data: { id: 'dbig', caseId: '', kind: 'document', ext: 'ZIP', name: 'Archive', meta: 'Other · 10.0 GB', file: 'archive.zip', bytes: 10 * 1073741824, v: 'v1' }, updated_at: '' }); __fakeAdmin.save(); });
    await page.reload(); await waitIn(o);
    await o.go('#/cases'); await o.click('+ New case', 'main'); await o.toast('allows 150 open cases');
    await o.go('#/documents'); await o.click('+ Upload');
    await o.chooseFile(() => o.dclick('Choose file…'), { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x'.repeat(2048)) }); await o.toast('includes 10 GB');
    await o.fake(() => { const S = __fakeAdmin.state(); S.records = S.records.filter(r => !/^cbulk|^dbig$/.test(r.id)); __fakeAdmin.save(); });
  });
  await step('plan: expired → 7-day grace banner, then read-only with "Choose a plan"', async () => {
    await setSub('Solo', plusDays(-3));
    let b = page.locator('#ls-plan-banner'); await b.waitFor(); eq(await b.getAttribute('data-readonly'), 'false', 'grace, not read-only'); assert(/4 days left/.test(await b.innerText()), await b.innerText());
    assert(!(await disabledWhy(o.btn('+ New case', 'header'))), 'still editable in the grace period');
    await setSub('Solo', plusDays(-10));
    b = page.locator('#ls-plan-banner'); await b.waitFor(); eq(await b.getAttribute('data-readonly'), 'true', 'read-only');
    assert(/Read-only/.test(await b.innerText()) && /Choose a plan/.test(await b.innerText()), await b.innerText());
    assert(/Read-only/.test(await disabledWhy(o.btn('+ New case', 'header'))), 'new case disabled');
    await o.go('#/cases'); await o.see('Mehta Traders v. Orion Logistics');
    await o.shot('readonly-banner');
    await o.go('#/clients'); assert(await disabledWhy(o.btn('+ New client')), 'new client disabled');
    await o.go('#/billing'); const d = await o.download(() => o.click('Export CSV')); eq(d.suggestedFilename(), 'invoices.csv', 'exports still work');
    await o.go('#/settings'); await o.see('Delete firm data');
    await page.locator('#ls-plan-banner').getByRole('button', { name: 'Choose a plan' }).click(); await page.waitForFunction(() => location.hash === '#/pricing');
    await o.click('Choose Professional'); await o.see('Checkout'); await page.locator('button', { hasText: '×' }).last().click();
    await asUser(o, JUNIOR); assert(/Ask the firm owner/.test(await page.locator('#ls-plan-banner').innerText()), 'members are told to ask the owner'); await asUser(o, OWNER);
  });
  await step('plan: no plan yet → trial banner; invoices still numbered on a database without 0006', async () => {
    await o.fake(f => __fakeAdmin.setFirm(f, { created_at: new Date().toISOString() }), await firmId(o)); await setSub('', '');
    const b = page.locator('#ls-plan-banner'); await b.waitFor(); assert(/no plan yet/.test(await b.innerText()) && /7 days left/.test(await b.innerText()), await b.innerText());
    await o.fake(() => __fakeAdmin.setOption('schema', 5));
    await setSub('Firm', '2099-01-01'); eq(await page.locator('#ls-plan-banner').count(), 0, 'no banner with an active plan');
    const t = await newInvoice(o, [['Description', 'Numbered without the server counter'], ['Taxable value (₹)', '500']]); assert(new RegExp('LS/' + FY + '/\\d{4}').test(t), t);
    await o.fake(() => __fakeAdmin.setOption('schema', 6));
  });
}

/* ---------- main ---------- */
/* A chamber that only does criminal work: the dashboard, stages, labels and limitation presets follow that area. */
async function practiceArea(browser) {
  const c = await newContext(browser), o = H(watch(await c.newPage(), 'criminal')); step.o = o;
  await step('sign-up asks for the practice type and area; a criminal chamber gets a criminal dashboard', async () => {
    await o.page.goto(BASE + '/app.html');
    await signIn(o, 'crim@test.in', 'Vikram Sethi');
    await onboard(o, 'Sethi Chambers', 'chamber', 'criminal');
    await o.go('#/dashboard');
    await o.see('Bail matters'); await o.see('Accused in custody'); await o.see('Bail & custody watch'); await o.see('Cases by trial stage'); await o.see('Chamber · Criminal law');
    await o.notSee('Active cases by stage');
    await o.page.locator('aside').getByText('Evidence', { exact: true }).first().waitFor();
    const tops = await o.page.evaluate(() => [...document.querySelectorAll('aside nav button')].map(b => b.textContent.trim()));
    assert(tops.indexOf('Evidence') < tops.indexOf('Court Intelligence'), 'criminal sidebar leads with evidence: ' + tops.join(','));
  });
  await step('criminal labels, stages and limitation presets', async () => {
    await o.go('#/labels'); await o.see('Anticipatory bail'); await o.see('In custody');
    await o.go('#/cases'); await o.click('+ New case', 'main');
    const stages = await o.page.evaluate(() => [...document.querySelectorAll('[role=dialog] select')].flatMap(s => [...s.options].map(x => x.textContent)));
    assert(stages.includes('Bail') && stages.includes('Charge framing') && !stages.includes('Pleadings'), 'stage options: ' + stages.join(','));
    await o.fill([['Case title', 'State v. Arun Mishra'], ['Case number', 'SC 77/2026'], ['Court', 'Saket · Court 9']]); await o.set('Stage', 'Bail');
    await o.dclick('Create case'); await o.toast('Case created');
    await o.go('#/dashboard'); await o.see('State v. Arun Mishra');   // shows in the bail & custody watch
    await o.go('#/limitation'); await o.click('New calculation');
    const first = await o.page.evaluate(() => document.querySelector('[role=dialog] select[aria-label=Rule]').options[0].textContent);
    assert(/Criminal appeal/.test(first), 'first limitation preset: ' + first);
  });
  await step('the practice area can be changed in Settings', async () => {
    await o.go('#/settings'); await o.set('Area of practice (shapes the dashboard)', 'tax'); await o.click('Save', 'main'); await sleep(300);
    await o.go('#/dashboard'); await o.see('Tax matters by stage'); await o.see('Notices to reply'); await o.notSee('Bail matters');
  });
  await c.close();
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true }); fs.readdirSync(SHOTS).filter(f => f.startsWith('fail-' + MODE)).forEach(f => fs.unlinkSync(path.join(SHOTS, f)));
  const srv = await serve();
  const browser = await chromium.launch();
  console.log(`Legal Staff e2e · ${MODE} mode · ${BASE}`);
  try {
    const c = await newContext(browser), o = H(watch(await c.newPage(), 'owner'));
    step.o = o; await core(o); await gst(o); await files(o); await deadlines(o); await outcomes(o); await exportsAndSearch(o); await settingsProfile(o);
    await persistence(o);
    if (SERVER) { await paging(o); await team(o); await roles(o); await plans(o); }
    await practiceArea(browser);
    step.o = o;
    if (typeof extra === 'function') await extra(o, browser);
    await narrow(o);
    if (SERVER) await serverSettings(o);
    await c.close();
  } finally { await browser.close(); if (srv) srv.kill(); }
  await step('no console errors', async () => { assert(!consoleErrors.length, consoleErrors.slice(0, 8).join('\n')); });
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) console.log('Failed: ' + failures.join(' · '));
  return failed ? 1 : 0;
}
let extra = null;
main().then(code => process.exit(code), e => { console.error(e); process.exit(1); });

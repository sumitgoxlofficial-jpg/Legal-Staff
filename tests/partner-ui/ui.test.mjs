// End-to-end: real Chromium drives the real pages (partner site, partner portal, Super Admin console, directory) against a real
// PostgreSQL 16 with migration 0039, through tests/partner-ui/bridge.mjs. Run: node tests/partner-ui/ui.test.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { startDb, stopDb, startServer, sql, callRpc, uidOf } from './bridge.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const results = [];
const ok = (cond, name) => { results.push([!!cond, name]); if (!cond) console.log('  FAIL:', name); };
const BASE = 'http://localhost:8099';
const OWNER = 'owner@legalstaff.test', ASHA = 'asha@example.in', FIN = 'fin@legalstaff.test';
let PROMPT = 'Test note';

startDb();
const srv = await startServer(8099);
const browser = await chromium.launch();
const errors = [];
async function ctxFor(label, viewport = { width: 1280, height: 900 }) {
  const c = await browser.newContext({ viewport, acceptDownloads: true });
  const p = await c.newPage();
  p.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g|net::ERR/.test(m.text())) errors.push(`${label}: ${m.text()}`); });
  p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? PROMPT : undefined));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // Google's script is not loaded in the test: a stand-in whose button "signs in" as the email put in window.__googleAs
  await p.addInitScript(() => { let cb; window.google = { accounts: { id: { initialize: (o) => { cb = o.callback; }, renderButton: (el) => { const b = document.createElement('button'); b.id = 'fake-google'; b.textContent = 'Continue with Google'; b.onclick = () => cb({ credential: window.__googleAs }); el.appendChild(b); } } } }; });
  return { c, p };
}
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
async function otpLogin(p, email, emailSel, sendSel, codeSel, goSel) {
  await p.fill(emailSel, email); await p.click(sendSel); await p.waitForSelector(codeSel, { state: 'visible' });
  await p.fill(codeSel, '123456'); await p.click(goSel);
}

try {
  /* ---- 1. public landing: content, live categories, mobile ---- */
  const pub = await ctxFor('public');
  await pub.p.goto(BASE + '/partners');
  ok((await pub.p.textContent('h1')).includes('Become a LegalStaff Partner.'), 'landing headline');
  await pub.p.waitForFunction(() => document.querySelectorAll('#pn-cats .lg-tile').length === 6);
  ok(true, 'landing shows the six categories read from the database');
  const body = await pub.p.textContent('body');
  ok(/Explore Advocate Directory/.test(body) && /Free to join/.test(body) && /How it works/i.test(body) && /Frequently asked questions/.test(body), 'landing has the required sections and CTAs');
  ok(!/₹\s?49|₹\s?15\b|guaranteed (income|clients)/i.test(body.replace(/not guaranteed|never guaranteed/gi, '')), 'landing states no price or commission figure and promises nothing');
  ok(await pub.p.evaluate(() => !!document.querySelector('.site-header .brand img') && !!document.querySelector('.site-footer')), 'landing uses the site header and footer');
  await pub.p.setViewportSize({ width: 390, height: 844 });
  ok((await overflow(pub.p)) <= 1, 'landing has no horizontal scroll at 390px');
  for (const path of ['/partners/register', '/partners/login', '/partners/terms', '/partners/privacy']) {
    const r = await pub.p.goto(BASE + path); ok(r.status() === 200 && (await overflow(pub.p)) <= 1, `${path} loads without horizontal scroll at 390px`);
  }
  await pub.c.close();

  /* ---- 2. partner registration with email OTP ---- */
  const asha = await ctxFor('asha');
  await asha.p.goto(BASE + '/partners/register');
  ok(/Sign in with Google/.test(await asha.p.textContent('#pn-app')) && !(await asha.p.$('#pn-email')), 'registration starts with Google, with no code to type');
  await asha.p.evaluate((e) => { window.__googleAs = e; }, ASHA);
  await asha.p.click('#fake-google');
  await asha.p.waitForSelector('#pn-reg');
  ok((await asha.p.inputValue('#r-name')) === 'Asha Rao' && /Signed in with Google as asha@example.in/.test(await asha.p.textContent('#pn-reg')), 'the form is pre-filled with the name and email from Google');
  await asha.p.click('#pn-reg button[type=submit]');
  ok((await asha.p.textContent('#r-err')).length > 3, 'registration validates before submitting');
  await asha.p.fill('#r-mobile', '9876500001');
  await asha.p.selectOption('#r-cat', 'campus_ambassador'); await asha.p.selectOption('#r-state', 'Bihar');
  await asha.p.fill('#r-district', 'Patna'); await asha.p.fill('#r-city', 'Patna'); await asha.p.fill('#r-org', 'Chanakya National Law University');
  await asha.p.check('#r-terms'); await asha.p.check('#r-priv');
  await asha.p.click('#r-go');
  await asha.p.waitForFunction(() => /Application/.test(document.querySelector('#pn-app h2')?.textContent || ''));
  ok(/received/i.test(await asha.p.textContent('#pn-app')), 'application submitted');
  ok(sql("select count(*) from public.partner_applications where status = 'applied'") === '1', 'the application is in the database');
  await asha.p.goto(BASE + '/partners/dashboard');
  await asha.p.waitForSelector('.pn-banner');
  ok(/applied/i.test(await asha.p.textContent('#pn-view') + await asha.p.textContent('.pn-banner')), 'an applicant sees their status, not the dashboard');

  /* ---- 3. Super Admin: Partner Network inside the existing console ---- */
  const adm = await ctxFor('admin');
  await adm.p.goto(BASE + '/admin.html');
  await otpLogin(adm.p, OWNER, '#em', '#b1', '#code', '#b2');
  await adm.p.waitForSelector('#tabs a.nav-item[data-k="partners"]');
  ok((await adm.p.textContent('#tabs')).includes('Partner Network'), 'Partner Network tab exists in the existing admin');
  await adm.p.click('#tabs a.nav-item[data-k="partners"]');
  await adm.p.waitForSelector('#tabs a[data-k="partners/overview"]');
  const menu = await adm.p.$$eval('#tabs a[data-k^="partners/"]', (a) => a.map((x) => x.textContent));
  ok(menu.length === 19, `Super Admin sees all 19 menu items (${menu.length})`);
  for (const want of ['Overview', 'Partner Applications', 'All Partners', 'Partner Categories', 'Referral Management', 'Advocate Registrations', 'Commission Management', 'Monthly Earnings', 'Payout Management', 'Marketing Campaigns', 'Marketing Resources', 'Partner Notifications', 'Leaderboard', 'Fraud Detection', 'Compliance Management', 'Partner Support', 'Reports & Analytics', 'System Settings', 'Audit Logs']) ok(menu.includes(want), `menu: ${want}`);
  await adm.p.click('a[data-k="partners/applications"]');
  await adm.p.waitForSelector('text=Asha Rao');
  PROMPT = 'Welcome aboard';
  await adm.p.click('button[data-d="approve"]');
  await adm.p.waitForFunction(() => !document.querySelector('button[data-d="approve"]'));
  ok(sql("select code from public.partners") === 'LS10001', 'approving creates partner LS10001');

  // every screen renders without an error card
  for (const [key] of [['overview'], ['partners'], ['categories'], ['referrals'], ['registrations'], ['commissions'], ['earnings'], ['payouts'], ['campaigns'], ['resources'], ['notifications'], ['leaderboard'], ['fraud'], ['compliance'], ['support'], ['reports'], ['settings'], ['audit']]) {
    await adm.p.click(`a[data-k="partners/${key}"]`); await adm.p.waitForFunction(() => { const s = document.querySelector('#page'); return s && !s.querySelector('.skel-block') && s.textContent.length > 20; });
    ok(!(await adm.p.$('#page .card.err')), `admin screen "${key}" renders`);
  }

  /* ---- 4. legal approval first, then commission on (listing price reconciled) ---- */
  await adm.p.click('a[data-k="partners/categories"]'); await adm.p.waitForSelector('button[data-c="campus_ambassador"]');
  await adm.p.click('button[data-c="campus_ambassador"]');
  await adm.p.waitForSelector('.toast');
  ok(/counsel/i.test(await adm.p.textContent('.toast')), 'commission cannot be switched on without recorded legal approval (screen shows why)');
  await adm.p.click('a[data-k="partners/compliance"]'); await adm.p.waitForSelector('#l-new'); await adm.p.click('#l-new');
  await adm.p.waitForSelector('#l-ref'); await adm.p.fill('#l-ref', 'COUNSEL-OPINION-2026-11'); await adm.p.fill('#l-by', 'Test Counsel LLP'); await adm.p.fill('#l-on', '2026-11-01');
  await adm.p.$eval('#l-scope', (e, v) => { e.value = v; }, 'Reward per verified listing');
  await adm.p.click('.modal [data-s]'); await adm.p.waitForSelector('text=COUNSEL-OPINION-2026-11');
  ok(sql('select count(*) from public.partner_compliance_approvals') === '1', 'legal approval recorded');
  await adm.p.click('a[data-k="partners/categories"]'); await adm.p.waitForSelector('button[data-c="campus_ambassador"]'); await adm.p.click('button[data-c="campus_ambassador"]');
  await adm.p.waitForFunction(() => /Commission off/.test(document.body.textContent));
  ok(sql("select commission_enabled from public.partner_categories where key='campus_ambassador'") === 't', 'commission switched on for the approved category only');
  ok(sql('select count(*) from public.partner_categories where commission_enabled') === '1', 'other categories remain off');
  await adm.p.click('a[data-k="partners/settings"]'); await adm.p.waitForSelector('#s-save');
  await adm.p.fill('#s-listing_price_paise', '49'); await adm.p.selectOption('#s-listing_price_status', 'approved');
  await adm.p.check('#s-commission_generation'); await adm.p.fill('#s-min_withdrawal_paise', '15');
  await adm.p.click('#s-save'); await adm.p.waitForFunction(() => /Settings saved/.test(document.body.textContent)); await adm.p.waitForTimeout(300);
  if (process.env.DEBUG) console.log('SET>', sql("select key||'='||value from public.partner_settings where key in ('listing_price_status','min_withdrawal_paise','listing_price_paise','commission_generation')"));
  ok(sql("select value from public.partner_settings where key='listing_price_status'") === '"approved"' && sql("select value from public.partner_settings where key='min_withdrawal_paise'") === '1500', 'settings saved from the admin screen (price approved, minimum withdrawal 15)');

  /* ---- 5. partner portal ---- */
  await asha.p.goto(BASE + '/partners/login');
  await asha.p.waitForFunction(() => location.pathname === '/partners/dashboard');   // session already exists, so login forwards
  await asha.p.waitForSelector('.pn-stats');
  ok((await asha.p.inputValue('#pn-url')) === 'https://legalstaff.in/directory/?ref=LS10001', 'referral link uses the partner ID');
  ok(!!(await asha.p.$('#pn-qr svg')), 'QR code is drawn');
  const dl = asha.p.waitForEvent('download'); await asha.p.click('#pn-dl'); const file = await dl;
  ok(/LS10001-qr\.png$/.test(file.suggestedFilename()), 'QR download works');
  const png = readFileSync(await file.path()); ok(png.slice(1, 4).toString() === 'PNG', 'QR download is a PNG');
  ok((await asha.p.$$('.pn-stat')).length === 9, 'dashboard shows the nine required figures');
  for (const v of ['referrals', 'earnings', 'payouts', 'profile', 'resources', 'support']) {
    await asha.p.goto(BASE + '/partners/' + v); await asha.p.waitForFunction(() => !/Loading…/.test(document.querySelector('#pn-view').textContent));
    ok(!(await asha.p.$('#pn-view .pn-err:not([hidden])')), `partner page /${v} renders`);
  }
  await asha.p.setViewportSize({ width: 390, height: 844 });
  for (const v of ['dashboard', 'earnings', 'payouts']) { await asha.p.goto(BASE + '/partners/' + v); await asha.p.waitForFunction(() => !/Loading…/.test(document.querySelector('#pn-view').textContent)); ok((await overflow(asha.p)) <= 1 || await asha.p.evaluate(() => getComputedStyle(document.querySelector('.pn-tablewrap') || document.body).overflowX === 'auto'), `portal /${v} fits a phone`); }
  await asha.p.setViewportSize({ width: 1280, height: 900 });

  /* ---- 6. an advocate arrives through the referral link ---- */
  const adv = await ctxFor('advocate');
  await adv.p.addInitScript(() => localStorage.setItem('test.session', JSON.stringify({ user: { id: 'u-anil', email: 'anil@example.in' } })));
  await adv.p.goto(BASE + '/directory?ref=ls10001'.replace('ls', 'LS'));
  await adv.p.waitForFunction(() => !!localStorage.getItem('ls.partner.ref'));
  const claim = await adv.p.evaluate(() => JSON.parse(localStorage.getItem('ls.partner.ref')));
  ok(claim.code === 'LS10001' && claim.token.length === 32, 'the directory remembers the referral claim');
  await adv.p.waitForTimeout(800);
  ok(sql('select count(*) from public.partner_referrals') === '1', 'the click was recorded on the server');
  await adv.p.goto(BASE + '/directory?ref=LS10009');
  ok((await adv.p.evaluate(() => JSON.parse(localStorage.getItem('ls.partner.ref')).code)) === 'LS10001', 'a later link does not replace the first valid referral');
  // submit the application through the page's own code path
  const res = await adv.p.evaluate(async (UID) => {
    const c = JSON.parse(localStorage.getItem('ls.partner.ref'));
    const r = await fetch('/__insert', { method: 'POST', body: JSON.stringify({ table: 'directory_applications', email: 'anil@example.in', row: { id: 'LS-DIR-2026-00001', name: 'Anil Kumar', enr: 'BR/100/2015', council: 'Bihar State Bar Council', year: '2015', city: 'Patna', email: 'anil@example.in', mobile: '9000000001', details: { documents: ['id.pdf'] }, referral_code: c.code, visitor_token: c.token, user_id: UID } }) });
    return r.json();
  }, uidOf('anil@example.in'));
  ok(!res.error, 'the advocate application is accepted');
  ok(sql("select status || ',' || touch_verified from public.referral_attributions") === 'valid,true', 'attribution recorded server-side and matched to the click');
  ok(sql('select count(*) from public.partner_commissions') === '1' && sql('select status from public.partner_commissions') === 'pending_payment', 'a commission entry waits for a verified payment');

  /* ---- 7. admin: record payment, verify listing, approve commission ---- */
  await adm.p.click('a[data-k="partners/registrations"]'); await adm.p.waitForSelector('button[data-pay]');
  await adm.p.click('button[data-pay]'); await adm.p.waitForSelector('#p-amt'); await adm.p.fill('#p-amt', '49'); await adm.p.fill('#p-ref', 'UPI-REF-778899'); await adm.p.click('.modal [data-s]');
  await adm.p.waitForFunction(() => /Payment recorded/.test(document.body.textContent));
  ok(sql('select status from public.partner_commissions') === 'pending_verification', 'with payment, the commission waits for directory verification');
  sql("update public.directory_applications set status = 'verified' where id = 'LS-DIR-2026-00001'");   // the existing directory review stays authoritative
  await adm.p.click('a[data-k="partners/commissions"]'); await adm.p.waitForSelector('button[data-a="approve"]');
  ok(sql('select status from public.partner_commissions') === 'eligible', 'a verified, paid, documented listing is eligible');
  await adm.p.click('button[data-a="approve"]'); await adm.p.waitForSelector('button[data-a="payable"]'); await adm.p.click('button[data-a="payable"]');
  await adm.p.waitForFunction(() => !document.querySelector('button[data-a="payable"]'));
  ok(sql('select status from public.partner_commissions') === 'payable', 'finance approved it and made it payable');
  await adm.p.click('a[data-k="partners/earnings"]'); await adm.p.waitForSelector('#e-mo');
  ok(/LS10001/.test(await adm.p.textContent('#page')) && /Asha Rao/.test(await adm.p.textContent('#page')), 'Monthly Earnings lists the partner who referred this month');
  const eRow = await adm.p.$eval('#page table tbody tr', (tr) => [...tr.querySelectorAll('td')].map((c) => c.textContent.trim()));
  ok(eRow[3] === '1' && eRow[4] === '1' && eRow[5] === '1' && /15\.00/.test(eRow[6]) && /0\.00/.test(eRow[7]) && /15\.00/.test(eRow[8]), `monthly row: 1 referred, 1 paid, 1 verified, \u20B915 earned, \u20B90 paid out, \u20B915 to pay (${eRow.join(' | ')})`);
  const eDl = adm.p.waitForEvent('download'); await adm.p.click('#e-xl'); const eFile = await eDl;
  ok(readFileSync(await eFile.path()).slice(0, 2).toString() === 'PK' && /partner-earnings-\d{4}-\d{2}\.xlsx$/.test(eFile.suggestedFilename()), 'the month exports to Excel');
  await adm.p.click('a[data-k="partners/registrations"]');   // replaying the referral screen must not double anything
  ok(sql('select count(*) from public.partner_commissions') === '1', 'still exactly one commission');

  /* ---- 8. KYC, payment method, withdrawal, payout ---- */
  await adm.p.click('a[data-k="partners/partners"]'); await adm.p.waitForSelector('button[data-o]'); await adm.p.click('button[data-o]');
  await adm.p.waitForSelector('button[data-k="verified"]'); await adm.p.click('button[data-k="verified"]');
  await adm.p.waitForFunction(() => !document.querySelector('.modal'));
  ok(sql('select kyc_status from public.partners') === 'verified', 'KYC verified by staff');
  await asha.p.goto(BASE + '/partners/payouts'); await asha.p.waitForSelector('#po-form');
  await asha.p.fill('#pm-upiid', 'asha.rao@okbank'); await asha.p.click('#po-form button[type=submit]');
  await asha.p.waitForFunction(() => /as\*\*\*@okbank/.test(document.body.textContent));
  ok(sql('select count(*) from public.partner_payment_methods') === '1', 'payment method saved (masked on screen)');
  ok(!(await asha.p.textContent('body')).includes('asha.rao@okbank'), 'the full UPI ID is never shown back');
  await asha.p.waitForSelector('#po-req:not([disabled])'); await asha.p.click('#po-req');
  await asha.p.waitForFunction(() => /requested/i.test(document.body.textContent));
  ok(sql('select count(*) from public.partner_payouts') === '1', 'withdrawal requested');
  await adm.p.click('a[data-k="partners/payouts"]'); await adm.p.waitForSelector('button[data-a="approve"]'); await adm.p.click('button[data-a="approve"]');
  await adm.p.waitForSelector('button[data-a="paid"]'); PROMPT = 'HDFC-UTR-5566778899'; await adm.p.click('button[data-a="paid"]');
  await adm.p.waitForFunction(() => /HDFC-UTR-5566778899/.test(document.body.textContent));
  ok(sql('select status from public.partner_commissions') === 'paid' && sql('select status from public.partner_payouts') === 'paid', 'payout paid with a UTR; the ledger shows the commission paid');
  await asha.p.goto(BASE + '/partners/earnings'); await asha.p.waitForSelector('.pn-table');
  ok(/paid/i.test(await asha.p.textContent('.pn-table')), 'the partner sees the commission as paid');

  /* ---- 9. reports and exports ---- */
  await adm.p.click('a[data-k="partners/reports"]'); await adm.p.waitForSelector('#r-k'); await adm.p.selectOption('#r-k', 'commission_ledger');
  const d1 = adm.p.waitForEvent('download'); await adm.p.click('#r-csv'); const csvF = await d1;
  const csvText = readFileSync(await csvF.path(), 'utf8'); if (process.env.DEBUG) console.log('CSV>', JSON.stringify(csvText.slice(0, 240)));
  ok(csvText.startsWith('﻿Date,Commission') && /1500|15/.test(csvText) && /paid/.test(csvText), 'CSV export of the commission ledger');
  const d2 = adm.p.waitForEvent('download'); await adm.p.click('#r-xl'); const xl = await d2;
  ok(readFileSync(await xl.path()).slice(0, 2).toString() === 'PK' && /\.xlsx$/.test(xl.suggestedFilename()), 'Excel export of the commission ledger');
  await adm.p.click('#r-pv'); await adm.p.waitForSelector('#r-print'); ok((await adm.p.textContent('#r-print')).includes('Commission'), 'report preview (print to PDF) renders');
  await adm.p.click('a[data-k="partners/audit"]'); await adm.p.waitForFunction(() => /Append-only/.test(document.querySelector('#page')?.textContent || '') && !!document.querySelector('#page table'));
  ok(/payout\.paid/.test(await adm.p.textContent('#page')) && /commission\.approve/.test(await adm.p.textContent('#page')), 'audit log shows the money trail');

  /* ---- 10. staff roles in the same console ---- */
  callRpc('admin_staff_save', { p_email: FIN, p_role: 'finance_manager', p_active: true }, OWNER);
  const fin = await ctxFor('finance');
  await fin.p.goto(BASE + '/admin.html'); await otpLogin(fin.p, FIN, '#em', '#b1', '#code', '#b2');
  await fin.p.waitForSelector('#tabs a[data-k^="partners/"]');
  ok((await fin.p.$$eval('#tabs a.nav-item', (b) => b.map((x) => x.textContent.trim()))).join() === 'Partner Network', 'a staff member sees only the Partner Network tab, not the Super Admin tabs');
  const fm = (await fin.p.$$eval('#tabs a[data-k^="partners/"]', (a) => a.map((x) => x.dataset.k.split('/')[1])));
  ok(fm.includes('commissions') && fm.includes('payouts') && !fm.includes('compliance') && !fm.includes('fraud') && !fm.includes('audit'), 'Finance Manager menu is limited to their permissions');
  await fin.p.click('a[data-k="partners/settings"]'); await fin.p.waitForSelector('#page .card');
  ok(!(await fin.p.$('#s-save')), 'settings are read-only for staff');
  ok(callRpc('admin_settings_save', { p: { min_withdrawal_paise: 1 } }, FIN).error?.message.includes('permission'), 'the server refuses a staff settings change even if called directly');
  const stranger = callRpc('admin_overview', {}, 'nobody@example.in');
  ok(stranger.error?.message.includes('permission'), 'a signed-in non-staff user is refused by the server');
  const ashaAdmin = callRpc('admin_commissions', {}, ASHA);
  ok(ashaAdmin.error?.message.includes('permission'), 'a partner cannot read admin data');

  ok(errors.length === 0, 'no JavaScript errors in any page' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
} catch (e) {
  ok(false, 'test run aborted: ' + e.message.split('\n')[0]);
  console.log(e.stack);
} finally {
  await browser.close(); srv.close(); stopDb();
}
const failed = results.filter((r) => !r[0]);
console.log(`ui: ${results.length - failed.length} passed, ${failed.length} failed`);
for (const f of failed) console.log('FAIL:', f[1]);
process.exit(failed.length ? 1 : 0);

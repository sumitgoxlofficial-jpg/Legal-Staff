// The public directory loads its list WITHOUT photos and fetches photos only for the cards on screen (migration 0052).
// Runs the real directory.html in Chromium with a scripted Supabase client. Needs Playwright (NODE_PATH=$(npm root -g)).
import { createRequire } from 'node:module';
import { start } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

const PIC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// 9 listed advocates (the page shows 6 per page): the first 7 have a photo, "Asha Aaa" first alphabetically
const ROWS = Array.from({ length: 9 }, (_, i) => ({ id: 'APP-P' + i, name: 'Adv ' + String.fromCharCode(65 + i) + 'ccc', enr: 'D/70' + i + '/2015', council: 'Bar Council of Delhi', year: '2015', city: 'Delhi', details: { areas: ['Criminal'], courts: 'Delhi High Court', langs: 'English' }, has_photo: i < 7, verified: true }));

const srv = await start(0); const base = 'http://localhost:' + srv.address().port;
const stubSupabase = `window.supabase = { createClient() { const w = window.__calls = window.__calls || []; return {
  auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getUser: async () => ({ data: { user: null } }), signOut: async () => ({}) },
  from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
  rpc: async (name, args) => { w.push({ name, args });
    const mode = window.__mode || 'new', ROWS = window.__ROWS, PIC = window.__PIC;
    if (name === 'directory_profiles_lite') return mode === 'old' ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.directory_profiles_lite' } } : { data: ROWS, error: null };
    if (name === 'directory_profiles') return { data: ROWS.map(r => ({ ...r, has_photo: undefined, photo: r.has_photo ? PIC : '' })), error: null };
    if (name === 'directory_photos') return { data: (args.p_ids || []).map(id => ROWS.find(r => r.id === id)).filter(r => r && r.has_photo).map(r => ({ id: r.id, photo: PIC })), error: null };
    return { data: [], error: null }; } }; } };`;

async function open(mode) {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.LS_CONFIG = { supabaseUrl: "https://stub.supabase.test", supabaseKey: "anon-key", googleClientId: "" };' }));
  await ctx.route('**/vendor/supabase.js', r => r.fulfill({ contentType: 'text/javascript', body: stubSupabase }));
  await page.addInitScript(([rows, pic, m]) => { window.__ROWS = rows; window.__PIC = pic; window.__mode = m; }, [ROWS, PIC, mode]);
  await page.goto(base + '/directory#results'); await page.waitForFunction(() => /Adv Accc/.test(document.body.textContent), null, { timeout: 20000 });
  return { browser, page };
}
const calls = (page, name) => page.evaluate(n => (window.__calls || []).filter(c => c.name === n), name);
const imgs = page => page.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.src.startsWith('data:image/png')).length);

await t('the list is loaded without photos (the lite function), and the full one is not called', async () => {
  const { browser, page } = await open('new'); try {
    ok((await calls(page, 'directory_profiles_lite')).length === 1, 'lite list not requested');
    ok((await calls(page, 'directory_profiles')).length === 0, 'the heavy list was requested');
  } finally { await browser.close(); } });

await t('photos are fetched once, only for the 6 cards on the page, and then shown', async () => {
  const { browser, page } = await open('new'); try {
    await page.waitForFunction(() => (window.__calls || []).some(c => c.name === 'directory_photos'), null, { timeout: 10000 });
    await page.waitForFunction(() => [...document.querySelectorAll('img')].some(i => i.src.startsWith('data:image/png')), null, { timeout: 10000 });
    const ph = await calls(page, 'directory_photos'); ok(ph.length === 1, 'expected one photo call, got ' + ph.length);
    ok(ph[0].args.p_ids.length === 6 && ph[0].args.p_ids.every(id => /^APP-P[0-5]$/.test(id)), 'asked for ' + JSON.stringify(ph[0].args.p_ids));
    ok(await imgs(page) >= 6, 'photos not displayed: ' + await imgs(page));
  } finally { await browser.close(); } });

await t('the next page fetches only the photos it needs (and none for a profile without one)', async () => {
  const { browser, page } = await open('new'); try {
    await page.waitForFunction(() => (window.__calls || []).some(c => c.name === 'directory_photos'));
    await page.evaluate(() => { const b = [...document.querySelectorAll('nav[aria-label="Pages"] button')].find(x => x.textContent.trim() === '2' || /next/i.test(x.textContent)); b && b.click(); });
    await page.waitForFunction(() => (window.__calls || []).filter(c => c.name === 'directory_photos').length >= 2, null, { timeout: 10000 });
    const ph = await calls(page, 'directory_photos'); const second = ph[1].args.p_ids;
    ok(second.length === 1 && second[0] === 'APP-P6', 'second call asked for ' + JSON.stringify(second) + ' (P7 and P8 have no photo)');
  } finally { await browser.close(); } });

await t('a database without migration 0052 still works: it falls back to the full list and shows photos', async () => {
  const { browser, page } = await open('old'); try {
    ok((await calls(page, 'directory_profiles')).length === 1, 'fallback not used');
    await page.waitForFunction(() => [...document.querySelectorAll('img')].some(i => i.src.startsWith('data:image/png')), null, { timeout: 10000 });
    ok((await calls(page, 'directory_photos')).length === 0, 'photos were fetched although the list already had them');
  } finally { await browser.close(); } });

srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

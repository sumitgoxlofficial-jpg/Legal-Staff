// Public-site smoke test in real Chromium, desktop and phone: every public page loads without script errors, has a title,
// description, canonical and one h1, shows no broken image, does not scroll sideways, and private pages are noindex.
// node tests/site-smoke.mjs   (needs Playwright). Outside requests are blocked, so this proves the pages, not third parties.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
import { start, ROOT } from './serve.mjs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const SKIP = new Set(['node_modules', 'supabase', 'tests', 'seo', 'emails', 'docs', 'vendor', 'local', 'server']);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name.startsWith('.') || SKIP.has(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
const pages = walk(ROOT).map(f => '/' + path.relative(ROOT, f).replace(/\.html$/, '').replace(/^index$/, '')).sort();
const PRIVATE = /^\/(app|admin|unsubscribe|404|partners\/(dashboard|referrals|earnings|payouts|profile|resources|support|login))$/;
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const srv = await start(0); const BASE = 'http://127.0.0.1:' + srv.address().port;
const browser = await chromium.launch(); let failed = 0, checked = 0; const fail = (p, m) => { failed++; console.log(`  FAIL ${p}: ${m}`); };
for (const [label, opts] of [['desktop', { viewport: { width: 1366, height: 800 } }], ['phone', devices['iPhone 12']]]) {
  const ctx = await browser.newContext(opts);
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  for (const p of pages) {
    if (ONLY && !ONLY.test(p)) continue;
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_BLOCKED|Failed to load resource|net::/.test(m.text())) errs.push(m.text().slice(0, 200)); });
    page.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url().slice(BASE.length)}`); });
    try {
      await page.goto(BASE + p, { waitUntil: 'load', timeout: 30000 }); await page.waitForTimeout(350);
      const d = await page.evaluate(() => ({
        title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '', canon: (document.querySelector('link[rel=canonical]') || {}).href || '',
        robots: (document.querySelector('meta[name=robots]') || {}).content || '', h1: document.querySelectorAll('h1').length,
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        img: [...document.images].filter(i => i.complete && !i.naturalWidth && i.src.startsWith(location.origin)).map(i => i.getAttribute('src')),
        text: document.body.innerText.length }));
      checked++;
      if (errs.length) fail(`${label} ${p}`, 'errors: ' + [...new Set(errs)].join(' | '));
      if (!d.title) fail(`${label} ${p}`, 'no title');
      if (d.img.length) fail(`${label} ${p}`, 'broken images ' + d.img.join(','));
      if (d.over > 2) fail(`${label} ${p}`, `scrolls sideways by ${d.over}px`);
      if (d.text < (PRIVATE.test(p) ? 20 : 100)) fail(`${label} ${p}`, 'page is nearly empty');
      if (label === 'desktop') {
        if (PRIVATE.test(p)) { const src = fs.readFileSync(path.join(ROOT, (p.slice(1) || 'index') + '.html'), 'utf8'); if (!/<meta name="robots" content="noindex/.test(src)) fail(p, 'private page is not noindex'); }
        else { if (!d.desc) fail(p, 'no meta description'); if (!d.canon) fail(p, 'no canonical'); if (/noindex/.test(d.robots)) fail(p, 'public page is noindex'); if (d.h1 !== 1) fail(p, `${d.h1} h1 elements`); }
      }
    } catch (e) { fail(`${label} ${p}`, String(e.message).split('\n')[0]); }
    await page.close();
  }
  await ctx.close();
}
if (!ONLY) {
  const ctx = await browser.newContext(); const r = await (await ctx.newPage()).goto(BASE + '/no-such-page-xyz'); checked++;
  if (r.status() !== 404) fail('/no-such-page-xyz', 'status ' + r.status());
  if (!fs.existsSync(path.join(ROOT, '404.html'))) fail('/404', 'no 404.html: visitors get the host default page');
  const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8'); const locs = [...sm.matchAll(/<loc>https:\/\/legalstaff\.in([^<]*)<\/loc>/g)].map(m => m[1] || '/');
  for (const l of locs) { checked++; if (!pages.includes(l === '/' ? '/' : l)) fail('sitemap', l + ' has no page'); if (PRIVATE.test(l)) fail('sitemap', l + ' is private'); }
  for (const p of pages) if (!PRIVATE.test(p) && !locs.includes(p)) fail('sitemap', p + ' is public but not listed');
}
await browser.close(); srv.close();
console.log(`\n${checked} checks, ${failed} failed`); process.exit(failed ? 1 : 0);

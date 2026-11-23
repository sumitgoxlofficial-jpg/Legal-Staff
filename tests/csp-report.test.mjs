// The full Content-Security-Policy in vercel.json (sent today as Report-Only) must produce NO violations on the key pages.
// If this passes and a checkout and a Google sign-in work in a real browser, the policy can be switched from report-only to enforced
// by renaming the header "Content-Security-Policy-Report-Only" to "Content-Security-Policy". Needs Playwright (NODE_PATH=$(npm root -g)).
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { resolve as res, ROOT } from './serve.mjs';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')), hdrs = v.headers.flatMap(h => h.headers);
const CSP = (hdrs.find(h => h.key === 'Content-Security-Policy-Report-Only') || hdrs.find(h => h.key === 'Content-Security-Policy' && /default-src/.test(h.value)) || {}).value;
if (!CSP) { console.log('FAIL  no full Content-Security-Policy(-Report-Only) with default-src found in vercel.json'); process.exit(1); }
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', woff2: 'font/woff2', xml: 'application/xml', txt: 'text/plain' };
const srv = http.createServer((req, rs) => { const r = res(req.url); if (r.location) { rs.writeHead(r.status, { location: r.location }); return rs.end(); } if (!r.file) { rs.writeHead(r.status); return rs.end('nf'); }
  rs.writeHead(r.status, { 'content-type': TYPES[path.extname(r.file).slice(1)] || 'application/octet-stream', 'Content-Security-Policy-Report-Only': CSP }); fs.createReadStream(r.file).pipe(rs); });
await new Promise(ok => srv.listen(0, '127.0.0.1', ok)); const base = 'http://localhost:' + srv.address().port;
const pages = ['/', '/about', '/features', '/app', '/admin', '/directory#results', '/directory#apply', '/directory#pay', '/partners', '/partners/login', '/refund-policy', '/terms', '/courts/delhi-high-court', '/features/digital-advocate-diary'];
const browser = await chromium.launch(); const bad = [];
for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => { window.__v = []; document.addEventListener('securitypolicyviolation', e => window.__v.push(e.violatedDirective + ' ' + e.blockedURI.slice(0, 80))); });
  try { await page.goto(base + p, { waitUntil: 'domcontentloaded', timeout: 20000 }); await page.waitForTimeout(1200); } catch (e) { bad.push(p + ': page did not load (' + e.message.split('\n')[0] + ')'); }
  for (const x of await page.evaluate(() => window.__v || []).catch(() => [])) bad.push(p + ': ' + x);
  await page.close();
}
await browser.close(); srv.close();
if (bad.length) { console.log('FAIL  ' + bad.length + ' policy violation(s):\n  ' + [...new Set(bad)].slice(0, 15).join('\n  ')); process.exit(1); }
console.log(`ok   ${pages.length} key pages load with no violation of the full Content-Security-Policy`); process.exit(0);

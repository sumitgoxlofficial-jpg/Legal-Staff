// The crawlable advocate profile page and its sitemap (api/advocate.js, api/advocates-sitemap.js) with the directory RPC mocked.
import { createRequire } from 'node:module'; import { dirname, join } from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), here = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + e.message); } };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); }; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ROWS = [
  { id: 'LS-DIR-2026-11111', name: 'Asha Rao', enr: 'D/1234/2016', council: 'Bar Council of Delhi', year: '2016', city: 'Delhi', verified: true, photo: 'data:image/png;base64,AAAA', details: { areas: ['Criminal', 'Bail'], courts: 'Delhi High Court; Saket', langs: 'Hindi, English', district: 'South' } },
  { id: 'LS-DIR-2026-22222', name: 'Not Checked', enr: 'D/9/2020', council: 'Bar Council of Delhi', year: '2020', city: 'Noida', verified: false, details: {} },
  { id: 'LS-DIR-2026-33333', name: '</script><img src=x onerror=alert(1)>', enr: 'D/7/2018', council: 'c', year: '2018', city: '"><svg onload=alert(1)>', verified: true, details: { areas: ['<b>x</b>'] } }];
let calls = [], down = false;
globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); if (down) return new Response('boom', { status: 500 }); return new Response(JSON.stringify(ROWS), { status: 200 }); };
const advocate = require(join(here, '../api/advocate.js')), sitemap = require(join(here, '../api/advocates-sitemap.js'));
const run = async (h, req) => { const r = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; await h(req, r); return r; };
await t('a listed, checked profile gets a real page: title, canonical, description, JSON-LD, indexable', async () => { const r = await run(advocate, { query: { id: 'LS-DIR-2026-11111' } }); eq(r.statusCode, 200);
  for (const k of ['<title>Asha Rao, Advocate in Delhi', 'rel="canonical" href="https://legalstaff.in/advocate/LS-DIR-2026-11111"', 'name="description"', 'application/ld+json', '"@type":"Attorney"', 'index, follow', 'Documents checked by Legal Staff', 'not a Bar Council certificate', 'directory#profile/LS-DIR-2026-11111']) ok(r.body.includes(k), 'missing ' + k);
  ok(!r.body.includes('data:image'), 'the base64 photo must not be inlined'); });
await t('contact details are never in the page (the RPC does not return them and the page prints only public fields)', async () => { const r = await run(advocate, { query: { id: 'LS-DIR-2026-11111' } }); const visible = r.body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''); ok(!/@|mailto:|tel:|\b\d{10}\b/.test(visible), 'looks like contact data'); });
await t('a profile whose documents are not checked is reachable but noindex and says so', async () => { const r = await run(advocate, { query: { id: 'LS-DIR-2026-22222' } }); eq(r.statusCode, 200); ok(r.body.includes('noindex, follow')); ok(r.body.includes('Documents not checked yet')); ok(!r.body.includes('Documents checked by Legal Staff')); });
await t('names and cities with markup are escaped everywhere (no script can run from a profile)', async () => { const r = await run(advocate, { query: { id: 'LS-DIR-2026-33333' } }); const html = r.body;
  ok(!/<img src=x|<svg onload|<b>x<\/b>/.test(html), 'raw markup in page'); ok(!/<\/script><img/.test(html), 'script breakout in JSON-LD'); ok(html.includes('&lt;img src=x')); });
await t('an unknown or malformed id is a 404 with noindex, and malformed ids never reach the database', async () => { calls = []; for (const id of ['nope', "x'; drop table", '../../etc', '', 'a'.repeat(80)]) { const r = await run(advocate, { query: { id } }); eq(r.statusCode, 404, id); ok(r.body.includes('noindex')); } eq(calls.length, 1, 'only the well-formed unknown id queried the directory'); });
await t('when the directory is down the page is a 503 that is not cached', async () => { down = true; const r = await run(advocate, { query: { id: 'LS-DIR-2026-11111' } }); down = false; eq(r.statusCode, 503); eq(r.headers['cache-control'], 'no-store'); });
await t('the sitemap lists only checked profiles, with absolute URLs, and the request carries the public key only', async () => { calls = []; const r = await run(sitemap, {}); eq(r.statusCode, 200); ok(r.headers['content-type'].startsWith('application/xml'));
  ok(r.body.includes('<loc>https://legalstaff.in/advocate/LS-DIR-2026-11111</loc>')); ok(!r.body.includes('22222'), 'unchecked profile listed'); ok(/url\)?>/.test(r.body) || r.body.includes('33333'));
  ok(calls[0].url.endsWith('/rest/v1/rpc/directory_profiles')); ok(!/service_role/i.test(JSON.stringify(calls[0].init))); });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

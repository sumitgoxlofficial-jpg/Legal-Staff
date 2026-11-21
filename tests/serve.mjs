// Static server that behaves like the Vercel deployment: clean URLs (/about -> about.html, /about.html -> 308 /about),
// vercel.json redirects, and 404.html for unknown paths. Used by the browser tests; `node tests/serve.mjs 8000` for local work.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain; charset=utf-8', pdf: 'application/pdf', ico: 'image/x-icon', webp: 'image/webp', woff2: 'font/woff2' };
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const redirects = (vercel.redirects || []).map(r => ({ re: new RegExp('^' + r.source.replace(/:[a-zA-Z]+\*?/g, '[^/]+') + '$'), to: r.destination }));
const isFile = f => { try { return fs.statSync(f).isFile(); } catch { return false; } };
export function resolve(urlPath) {
  const p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (p.includes('..')) return { status: 400 };
  const hit = redirects.find(r => r.re.test(p)); if (hit) return { status: 308, location: hit.to };
  if (p.endsWith('.html')) return { status: 308, location: p === '/index.html' ? '/' : p.slice(0, -5) };
  const base = path.join(ROOT, p);
  for (const f of [p.endsWith('/') ? path.join(base, 'index.html') : base, base + '.html', path.join(base, 'index.html')]) if (isFile(f)) return { status: 200, file: f };
  const nf = path.join(ROOT, '404.html'); return { status: 404, file: isFile(nf) ? nf : null };
}
export function start(port = 0) {
  const srv = http.createServer((req, res) => {
    const r = resolve(req.url);
    if (r.location) { res.writeHead(r.status, { location: r.location }); return res.end(); }
    if (!r.file) { res.writeHead(r.status, { 'content-type': 'text/plain' }); return res.end(r.status === 404 ? 'Not found' : 'Bad request'); }
    res.writeHead(r.status, { 'content-type': TYPES[path.extname(r.file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(r.file).pipe(res);
  });
  return new Promise(ok => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const s = await start(Number(process.argv[2]) || 8000); console.log('http://localhost:' + s.address().port); }

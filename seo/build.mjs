// Legal Staff — static site generator for the SEO pages.
// Usage: node seo/build.mjs   (SITE_URL=https://your-domain node seo/build.mjs to change canonical URLs)
// Every module in seo/pages exports pages() → [{ path, html, priority, changefreq }].
// Output: one .html file per route (served with Vercel cleanUrls), sitemap.xml and robots.txt at the repo root.
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, unlinkSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['feature', 'court', 'compare', 'city', 'tools', 'blog', 'legal'];
const MANIFEST = join(ROOT, 'seo', '.generated.json');

// Remove files written by the previous build so renamed or deleted routes don't linger.
if (existsSync(MANIFEST)) for (const f of JSON.parse(readFileSync(MANIFEST, 'utf8'))) { const p = join(ROOT, f); if (existsSync(p)) unlinkSync(p); }

const out = [];
for (const m of MODULES) {
  const mod = await import(`./pages/${m}.mjs`);
  for (const pg of mod.pages()) out.push(pg);
}

// Sanity checks: unique paths, every page has exactly one <h1>, a canonical and a description.
const seen = new Set();
for (const pg of out) {
  if (seen.has(pg.path)) throw new Error('Duplicate route ' + pg.path);
  seen.add(pg.path);
  const h1 = (pg.html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) throw new Error(`${pg.path} has ${h1} <h1> elements`);
  if (!pg.html.includes('rel="canonical"') || !pg.html.includes('name="description"')) throw new Error(pg.path + ' is missing canonical or description');
}

const fileFor = p => (p === '/' ? 'index.html' : p.replace(/^\//, '') + '.html');
const written = [];
for (const pg of out) {
  const f = fileFor(pg.path);
  if (f === 'index.html') throw new Error('The generator must not overwrite index.html');
  mkdirSync(dirname(join(ROOT, f)), { recursive: true });
  writeFileSync(join(ROOT, f), pg.html);
  written.push(f);
}
writeFileSync(MANIFEST, JSON.stringify(written.sort(), null, 1) + '\n');

// Sitemap: hand-written pages first, then every generated route.
const today = SITE.updated;
const staticPages = [{ path: '/', priority: 1.0, changefreq: 'weekly' }, { path: '/directory', priority: 0.6, changefreq: 'daily' }];
const urls = [...staticPages, ...out].map(p => `  <url><loc>${SITE.url}${p.path === '/' ? '/' : p.path}</loc><lastmod>${p.lastmod || today}</lastmod><changefreq>${p.changefreq || 'monthly'}</changefreq><priority>${(p.priority ?? 0.6).toFixed(1)}</priority></url>`);
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /app.html\nDisallow: /admin\nDisallow: /admin.html\nDisallow: /supabase/\nDisallow: /seo/\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

const byType = out.reduce((a, p) => { const k = p.path.split('/')[1].replace(/^advocate-software-in-.*/, 'cities') || 'root'; a[k] = (a[k] || 0) + 1; return a; }, {});
console.log(`Built ${out.length} pages`, byType, `→ sitemap.xml has ${urls.length} URLs`);

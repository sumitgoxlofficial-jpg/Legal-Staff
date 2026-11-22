// /advocates-sitemap.xml → one URL per listed profile (see vercel.json rewrites and robots.txt).
const { profiles, esc, SITE } = require('./_lib.js');
module.exports = async (req, res) => {
  try {
    const rows = await profiles();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8'); res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.filter(p => p.verified && /^[A-Za-z0-9_-]{3,40}$/.test(String(p.id)))   // only profiles whose documents Legal Staff has checked are offered to search engines
      .map(p => `  <url><loc>${esc(SITE + '/advocate/' + encodeURIComponent(p.id))}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`).join('\n')}\n</urlset>\n`);
  } catch (e) { console.error('advocates sitemap', e && e.message); res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); res.end('Temporarily unavailable.'); }
};

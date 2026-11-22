// /advocate/:id → a crawlable, shareable page for one listed profile (see vercel.json rewrites).
const { profiles, profilePage, notFound } = require('./_lib.js');
module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '').slice(0, 60);
  try {
    const p = /^[A-Za-z0-9_-]{3,40}$/.test(id) ? (await profiles()).find(x => String(x.id) === id) : null;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!p) { res.statusCode = 404; res.setHeader('Cache-Control', 'public, max-age=60'); return res.end(notFound()); }
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    res.statusCode = 200; res.end(profilePage(p));
  } catch (e) { console.error('advocate page', e && e.message); res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); res.end('Temporarily unavailable.'); }
};

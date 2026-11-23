// Shared by the advocate profile page and its sitemap. Reads the same public RPC the directory page uses (anon key, listed profiles only).
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ihbbfgzzbpxznbpspyam.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_JFuccB-z-0I1zRlzuAi0VA_-84zj94g';   // the publishable key is public (it is in config.js)
const SITE = (process.env.SITE_URL || 'https://legalstaff.in').replace(/\/$/, '');
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const list = v => Array.isArray(v) ? v.map(String) : String(v || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

async function profiles(fetchImpl = fetch) {
  const r = await fetchImpl(SUPABASE_URL + '/rest/v1/rpc/directory_profiles', { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' }, body: '{}' });
  if (!r.ok) throw new Error('directory unavailable (' + r.status + ')');
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

/** The page for one profile: real head tags and visible text for search engines and link previews; people are sent on to the directory app. */
function profilePage(p) {
  const d = p.details || {}, id = String(p.id);
  const areas = list(d.areas), courts = list(d.courts), langs = list(d.langs);
  const city = p.city || d.city || '', where = [city, d.district && d.district !== city ? d.district : ''].filter(Boolean).join(', ');
  const name = String(p.name || 'Advocate');
  const verified = !!p.verified;
  const title = clip(`${name}, Advocate${city ? ' in ' + city : ''}${areas.length ? ' · ' + areas.slice(0, 2).join(', ') : ''} | Legal Staff Directory`, 70);
  const desc = clip(`${name} is an advocate${city ? ' in ' + city : ''}${areas.length ? ' practising ' + areas.slice(0, 4).join(', ') : ''}${courts.length ? ' before ' + courts.slice(0, 3).join(', ') : ''}. ${verified ? 'Legal Staff has checked the enrolment documents (not a Bar Council certificate).' : 'Enrolment documents not checked yet.'} Send a contact request through the Legal Staff Directory.`, 300);
  const url = `${SITE}/advocate/${encodeURIComponent(id)}`, app = `${SITE}/directory#profile/${encodeURIComponent(id)}`;
  const ld = { '@context': 'https://schema.org', '@type': 'Attorney', name, url, ...(city ? { address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'IN' } } : {}), ...(areas.length ? { knowsAbout: areas } : {}), ...(langs.length ? { knowsLanguage: langs } : {}), ...(p.year ? { description: `Enrolled ${p.year}${p.council ? ', ' + p.council : ''}` } : {}), isPartOf: { '@type': 'WebSite', name: 'Legal Staff Directory', url: SITE + '/directory' } };
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${verified ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="Legal Staff"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${SITE}/assets/ls-logo-black.png">
<meta name="twitter:card" content="summary"><link rel="icon" type="image/png" href="/assets/ls-favicon.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<style>body{margin:0;font:16px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;color:#0A0A0A;background:#fff}main{max-width:720px;margin:0 auto;padding:40px 20px}h1{font-size:30px;letter-spacing:-.02em;margin:0 0 6px}.m{color:#5E5E5E}.chip{display:inline-block;font-size:13px;background:#F0F0EF;border-radius:8px;padding:2px 10px;margin:0 6px 6px 0}a.btn{display:inline-block;margin-top:22px;background:#0A0A0A;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:10px}</style></head>
<body><main><p class="m"><a href="/directory" style="color:inherit">Legal Staff Directory</a></p>
<h1>${esc(name)}</h1><p class="m">Advocate${where ? ' · ' + esc(where) : ''}${p.year ? ' · enrolled ' + esc(p.year) : ''}</p>
<p>${verified ? '<span class="chip">Documents checked by Legal Staff</span>' : '<span class="chip">Documents not checked yet</span>'}</p>
<p class="m" style="font-size:14px">${verified ? 'Legal Staff has checked this advocate\'s enrolment documents. This is not a Bar Council certificate: confirm the enrolment number with the State Bar Council.' : 'Legal Staff has not checked this advocate\'s documents yet. Confirm the enrolment number with the State Bar Council before relying on this profile.'}</p>
${areas.length ? `<h2 style="font-size:18px">Practice areas</h2><p>${areas.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</p>` : ''}
${courts.length ? `<h2 style="font-size:18px">Courts</h2><p>${esc(courts.join('; '))}</p>` : ''}
${langs.length ? `<h2 style="font-size:18px">Languages</h2><p>${esc(langs.join(', '))}</p>` : ''}
<a class="btn" href="${esc(app)}">View profile and contact</a></main>
<script>if(!/bot|crawl|spider|slurp|preview/i.test(navigator.userAgent))location.replace(${JSON.stringify(app)});</script></body></html>`;
}
const notFound = () => `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Profile not found | Legal Staff Directory</title></head><body style="font:16px/1.6 system-ui;margin:0"><main style="max-width:520px;margin:12vh auto;padding:0 20px;text-align:center"><h1>Profile not found</h1><p>This advocate is not listed in the Legal Staff Directory (or the link is wrong).</p><p><a href="/directory">Search the directory</a></p></main></body></html>`;

module.exports = { profiles, profilePage, notFound, esc, SITE };

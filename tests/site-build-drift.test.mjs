// The committed site pages must be what the generator (seo/) produces. A page edited by hand, without the same change in seo/,
// would be silently undone by the next `node seo/build.mjs`; this test fails instead and names the page and the first difference.
// Run: node tests/site-build-drift.test.mjs   (reads only; writes nothing)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = (/const MODULES = (\[[^\]]+\])/.exec(readFileSync(join(ROOT, 'seo/build.mjs'), 'utf8')) || [])[1];
if (!MODULES) throw new Error('Could not read the module list from seo/build.mjs');
// The free-tool pages pre-render a sample result whose "days left" depends on the day of the build; the page script recomputes it.
const norm = s => s.replace(/<span class="lt-chip[^"]*">[^<]*<\/span>/g, '<span class="lt-chip">…</span>');

let pages = 0; const bad = [];
for (const m of JSON.parse(MODULES.replace(/'/g, '"'))) {
  for (const pg of (await import(`../seo/pages/${m}.mjs`)).pages()) {
    pages++;
    const f = join(ROOT, pg.path.replace(/^\//, '') + '.html');
    if (!existsSync(f)) { bad.push(`${pg.path}: not built (run node seo/build.mjs)`); continue; }
    const want = norm(pg.html), have = norm(readFileSync(f, 'utf8'));
    if (want === have) continue;
    let i = 0; while (i < want.length && want[i] === have[i]) i++;
    bad.push(`${pg.path}: committed page differs from seo/ at character ${i}\n    committed: ${JSON.stringify(have.slice(Math.max(0, i - 40), i + 80))}\n    generator: ${JSON.stringify(want.slice(Math.max(0, i - 40), i + 80))}`);
  }
}
if (bad.length) { console.error(bad.join('\n')); console.error(`\n${bad.length} of ${pages} pages differ. Put the change in seo/ and run node seo/build.mjs.`); process.exit(1); }
console.log(`ok   all ${pages} generated pages match seo/`);

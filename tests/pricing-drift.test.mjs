// Prices charged by the server functions and prices advertised on the site, the app and by the support assistant must all equal
// supabase/functions/_shared/pricing.js. Fails naming the file and the number that differs.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PRICES, PER_USER, MAX_USERS, DIR_FEE_PAISE } = await import(pathToFileURL(join(root, 'supabase/functions/_shared/pricing.js')).href);
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + e.message.split('\n').slice(0, 6).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': found ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b)); };
const read = f => readFileSync(join(root, f), 'utf8');
const inr = n => n.toLocaleString('en-IN');
const grab = (src, re, file, what) => { const m = src.match(re); if (!m) throw new Error(file + ': could not find ' + what + ' (was the code reorganised? update this test)'); return m; };

for (const fn of ['razorpay', 'billing', 'admin']) await t(`${fn}: charged prices equal the price file`, () => {
  const src = read(`supabase/functions/${fn}/index.ts`);
  const p = grab(src, /const PRICES[^=]*=\s*(\{[^;]*\});/, fn, 'PRICES'); eq(Function('return ' + p[1])(), PRICES, fn + ' PRICES');
  const u = grab(src, /const PER_USER[^=]*=\s*(\{[^}]*\})/, fn, 'PER_USER'); eq(Function('return ' + u[1])(), PER_USER, fn + ' PER_USER');
  const mx = grab(src, /MAX_USERS\s*=\s*(\d+)/, fn, 'MAX_USERS'); eq(+mx[1], MAX_USERS, fn + ' MAX_USERS');
});
await t('razorpay: the directory fee equals the price file', () => { const m = grab(read('supabase/functions/razorpay/index.ts'), /const DIR_FEE_PAISE\s*=\s*(\d+)/, 'razorpay', 'DIR_FEE_PAISE'); eq(+m[1], DIR_FEE_PAISE, 'DIR_FEE_PAISE'); });

for (const f of ['app.html', 'index.html']) await t(`${f}: plan cards and the per-user add-on equal the price file`, () => {
  const src = read(f), rows = [...src.matchAll(/\['(Solo|Professional|Firm)', '[^']*', (\d+), (\d+),/g)];
  eq(rows.map(r => r[1]), ['Solo', 'Professional', 'Firm'], f + ' plans found');
  for (const r of rows) eq([+r[2], +r[3]], [PRICES[r[1]].monthly, PRICES[r[1]].annual], f + ' ' + r[1] + ' [monthly, annual]');
  const x = src.match(/inr\(ann \? (\d+) : (\d+)\)/); if (f === 'index.html') { ok(x, 'per-user add-on not found in index.html'); eq([+x[1], +x[2]], [PER_USER.annual, PER_USER.monthly], f + ' per-user [annual, monthly]'); }
});
function ok(v, m) { if (!v) throw new Error(m); }

await t('JSON-LD lowPrice / highPrice (lowest and highest yearly plan) equal the price file on every page and in seo/lib.mjs', () => {
  const low = String(Math.min(...Object.values(PRICES).map(p => p.annual))), high = String(Math.max(...Object.values(PRICES).map(p => p.annual)));
  const files = []; const walk = d => { for (const e of readdirSync(join(root, d))) { if (e === 'node_modules' || e === '.git' || e === 'tests' || e === 'docs' || e === 'vendor') continue; const rel = d ? d + '/' + e : e, st = statSync(join(root, rel)); if (st.isDirectory()) walk(rel); else if (/\.(html|mjs)$/.test(e)) files.push(rel); } }; walk('');
  const bad = [], seen = []; for (const f of files) { const s = read(f); for (const m of s.matchAll(/["']?lowPrice["']?\s*:\s*["']?(\d+)["']?[^}]*?["']?highPrice["']?\s*:\s*["']?(\d+)["']?/g)) { seen.push(f); if (m[1] !== low || m[2] !== high) bad.push(`${f}: low ${m[1]} high ${m[2]}`); } }
  ok(seen.length > 20, 'expected the JSON-LD price range on many pages, found ' + seen.length);
  if (bad.length) throw new Error(`expected low ${low} high ${high}; ${bad.length} file(s) differ:\n` + bad.slice(0, 5).join('\n') + (bad.length > 5 ? `\n…and ${bad.length - 5} more (rebuild with node seo/build.mjs)` : ''));
});

await t('support assistant: every price it quotes equals the price file', () => {
  const src = read('supabase/functions/support-ai/index.ts'), say = n => 'Rs ' + inr(n);
  for (const [plan, p] of Object.entries(PRICES)) {
    const line = grab(src, new RegExp('^\\s*' + plan + ': (.*)$', 'm'), 'support-ai', plan + ' line')[1];
    ok(line.includes(say(p.monthly) + ' per month'), `${plan} monthly: expected "${say(p.monthly)} per month" in: ${line.slice(0, 120)}`);
    ok(line.includes(say(p.annual) + ' per year'), `${plan} annual: expected "${say(p.annual)} per year" in: ${line.slice(0, 120)}`);
  }
  ok(src.includes(`plus ${say(PER_USER.monthly)} per month or ${say(PER_USER.annual)} per year for each extra user`), 'per-user add-on wording differs from the price file');
  ok(src.includes(`up to ${MAX_USERS} users`), 'maximum users differs from the price file');
  ok(src.includes(`one-time ${say(DIR_FEE_PAISE / 100)} fee`), 'directory fee wording differs from the price file');
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

// "Delete my account": the real supabase/functions/account against a scripted Supabase client. Needs `tsc` on the PATH.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join, dirname } from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); }; const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };
const out = mkdtempSync(join(tmpdir(), 'acct-'));
writeFileSync(join(out, 'index.ts'), 'declare const Deno: any;\n' + readFileSync(join(root, 'supabase/functions/account/index.ts'), 'utf8').replace('jsr:@supabase/supabase-js@2', 'fake-supabase-shim'));
writeFileSync(join(out, 'shim.d.ts'), 'declare module "fake-supabase-shim" { export const createClient: any; }');
try { execFileSync('tsc', ['--target', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--skipLibCheck', '--strict', 'false', '--lib', 'es2022,dom', '--outDir', join(out, 'js'), join(out, 'index.ts'), join(out, 'shim.d.ts')], { stdio: 'pipe' }); } catch (e) { const m = String(e.stdout || e.stderr || e); if (/error TS/.test(m)) { console.log(m); process.exit(1); } }
writeFileSync(join(out, 'js/package.json'), '{"type":"module"}');
const S = { user: null, rpc: null, deleted: [], removed: [], files: {}, calls: [] };
writeFileSync(join(out, 'js/fake.mjs'), `export const createClient = () => globalThis.__fake;`);
globalThis.__fake = {
  auth: { getUser: async () => ({ data: { user: S.user }, error: S.user ? null : { message: 'bad' } }), admin: { deleteUser: async id => { S.deleted.push(id); return { error: null }; } } },
  rpc: async (n, a) => { S.calls.push(n); return S.rpc(a); },
  storage: { from: b => ({ list: async pre => ({ data: S.files[b + ':' + pre] || [], error: null }), remove: async ps => { S.removed.push(...ps.map(p => b + ':' + p)); return { error: null }; } }) },
};
const idx = join(out, 'js/index.js'); writeFileSync(idx, readFileSync(idx, 'utf8').replace('fake-supabase-shim', './fake.mjs'));
let handler; globalThis.Deno = { env: { get: k => ({ SUPABASE_URL: 'http://db.test', SUPABASE_SERVICE_ROLE_KEY: 's' })[k] }, serve: h => { handler = h; } };
await import(pathToFileURL(idx).href);
const call = (body, auth = 'Bearer tok') => handler(new Request('http://fn', { method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { Authorization: auth } : {}) }, body: JSON.stringify(body) })).then(async r => ({ s: r.status, ...(await r.json()) }));
const reset = () => { S.user = { id: 'u1', email: 'Asha@Example.in' }; S.rpc = async () => ({ data: { firms: [] }, error: null }); S.deleted = []; S.removed = []; S.files = {}; S.calls = []; };
await t('not signed in: refused, nothing touched', async () => { reset(); const r = await call({ action: 'delete', confirm: 'x' }, ''); eq(r.s, 401); eq(S.calls.length, 0); eq(S.deleted.length, 0); });
await t('a bad token is refused', async () => { reset(); S.user = null; const r = await call({ action: 'delete', confirm: 'x' }); eq(r.s, 401); eq(S.deleted.length, 0); });
await t('the confirmation must be the account email (case-insensitive)', async () => { reset(); let r = await call({ action: 'delete', confirm: 'someone@else.in' }); eq(r.s, 400); eq(S.calls.length, 0); eq(S.deleted.length, 0); r = await call({ action: 'delete', confirm: ' asha@example.in ' }); eq(r.s, 200); eq(S.deleted, ['u1']); });
await t('unknown actions are refused', async () => { reset(); eq((await call({ action: 'nuke' })).s, 400); });
await t('when the database refuses (owns a firm with colleagues) the sign-in is NOT deleted and the reason is shown', async () => { reset(); S.rpc = async () => ({ data: null, error: { code: 'P0001', message: 'You own a firm that still has other members. Hand the firm over to a colleague or remove them first.' } }); const r = await call({ action: 'delete', confirm: 'asha@example.in' }); eq(r.s, 409); ok(/still has other members/.test(r.error)); eq(S.deleted.length, 0); });
await t('an unexpected database error hides internals and deletes nothing', async () => { reset(); S.rpc = async () => ({ data: null, error: { code: 'XX000', message: 'relation secret_table exploded' } }); const r = await call({ action: 'delete', confirm: 'asha@example.in' }); eq(r.s, 500); ok(!/secret_table/.test(r.error)); eq(S.deleted.length, 0); });
await t('a sole owner: the firm\'s stored files and chat files are deleted, then the sign-in', async () => { reset(); S.rpc = async () => ({ data: { firms: ['F1'] }, error: null });
  S.files['documents:F1'] = [{ name: 'd1', id: null }, { name: 'loose.pdf', id: 'x' }]; S.files['documents:F1/d1'] = [{ name: 'a.pdf', id: 'y' }]; S.files['chat:F1'] = [{ name: 'c.png', id: 'z' }];
  const r = await call({ action: 'delete', confirm: 'asha@example.in' }); eq(r.s, 200); eq(r.files_removed, 3); eq(S.removed.sort(), ['chat:F1/c.png', 'documents:F1/d1/a.pdf', 'documents:F1/loose.pdf']); eq(S.deleted, ['u1']); });
await t('a colleague leaving removes no firm files', async () => { reset(); const r = await call({ action: 'delete', confirm: 'asha@example.in' }); eq(r.s, 200); eq(S.removed.length, 0); eq(S.deleted, ['u1']); });
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

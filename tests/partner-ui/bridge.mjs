// Test bridge: serves the repository as a static site and turns the browser's Supabase calls into real SQL against a throwaway
// PostgreSQL 16 that has migration 0024 applied. It replaces only the network (Supabase Auth, PostgREST); every rule runs in the database.
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync, chmodSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, extname, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PGBIN = process.env.PGBIN || '/usr/lib/postgresql/16/bin';
const PGPORT = 5546;
const isRoot = process.getuid && process.getuid() === 0;
const asPg = (cmd) => (isRoot ? execFileSync('su', ['postgres', '-c', cmd], { stdio: 'pipe' }) : execFileSync('bash', ['-c', cmd], { stdio: 'pipe' }));
let D;
const env = { ...process.env, PGOPTIONS: '-c client_min_messages=warning' };
const base = () => ['-h', D, '-p', String(PGPORT), '-U', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1'];

export function psqlFile(f) {
  const r = spawnSync('psql', [...base(), '-f', f], { encoding: 'utf8', env });
  if (r.status) throw new Error('psql: ' + r.stderr);
  return r.stdout;
}
export function sql(q) {
  const r = spawnSync('psql', [...base(), '-c', q], { encoding: 'utf8', env });
  if (r.status) throw new Error('psql: ' + r.stderr.trim());
  return r.stdout.trim();
}
export function startDb() {
  D = mkdtempSync(join('/var/tmp', 'ls-uitest.'));
  if (isRoot) chmodSync(D, 0o777);
  asPg(`${PGBIN}/initdb -D ${D}/data -A trust >/dev/null && ${PGBIN}/pg_ctl -D ${D}/data -o '-p ${PGPORT} -k ${D}' -l ${D}/log -w start >/dev/null`);
  for (const f of [join(ROOT, 'tests/partner-db/stub.sql'), join(ROOT, 'supabase/migrations/0024_partner_network.sql')]) psqlFile(f);
  return D;
}
export function stopDb() {
  try { asPg(`${PGBIN}/pg_ctl -D ${D}/data -m immediate stop >/dev/null 2>&1`); } catch (e) { /* already stopped */ }
  try { rmSync(D, { recursive: true, force: true }); } catch (e) { /* best effort */ }
}

export const uidOf = (email) => { const h = createHash('sha1').update(email).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const lit = (v) => v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v)
  : Array.isArray(v) ? (v.length ? `array[${v.map(lit).join(',')}]::text[]` : 'array[]::text[]')
  : typeof v === 'object' ? `$j$${JSON.stringify(v)}$j$::jsonb` : `$s$${String(v)}$s$`;
const asUser = (email) => `select set_config('test.uid','${email ? uidOf(email) : ''}',false), set_config('test.jwt','${email ? JSON.stringify({ email }) : ''}',false); set role ${email ? 'authenticated' : 'anon'};`;
const errOf = (r) => (r.stderr.match(/ERROR:\s+(.*)/) || [])[1] || r.stderr;

export function callRpc(fn, args, email) {
  if (!/^[a-z_]+$/.test(fn)) return { error: { message: 'bad function name' } };
  const call = `select coalesce((select row_to_json(x) from (select public.${fn}(${Object.entries(args || {}).map(([k, v]) => `${k} => ${lit(v)}`).join(', ')}) as r) x)->'r', 'null'::json);`;
  const r = spawnSync('psql', [...base(), '-c', asUser(email) + ' ' + call], { encoding: 'utf8', env });
  if (r.status) return { error: { message: errOf(r).trim() } };
  const lines = r.stdout.trim().split('\n');
  return { data: JSON.parse(lines[lines.length - 1]) };
}
function insertRow(table, row, email) {
  const cols = Object.keys(row);
  const r = spawnSync('psql', [...base(), '-c', `${asUser(email)} insert into public.${table} (${cols.join(',')}) values (${cols.map((c) => lit(row[c])).join(',')});`], { encoding: 'utf8', env });
  return r.status ? { error: { message: errOf(r), code: /duplicate key/.test(r.stderr) ? '23505' : '' } } : { data: null };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
export function startServer(port = 8099) {
  const stub = readFileSync(join(ROOT, 'tests/partner-ui/supabase-stub.js'));
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const p = decodeURIComponent(u.pathname);
    if (req.method === 'POST' && p.startsWith('/__')) {
      let b = '';
      req.on('data', (c) => { b += c; });
      req.on('end', () => {
        let j = {};
        try { j = JSON.parse(b || '{}'); } catch (e) { /* ignore */ }
        const out = p === '/__rpc' ? callRpc(j.fn, j.args, j.email) : p === '/__insert' ? insertRow(j.table, j.row, j.email) : { error: { message: 'unknown' } };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      });
      return;
    }
    if (p === '/vendor/supabase.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(stub); }
    if (p === '/config.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end("window.LS_CONFIG={supabaseUrl:'http://localhost',supabaseKey:'test'};"); }
    let f = join(ROOT, p);
    if (existsSync(f + '.html')) f += '.html';   // Vercel cleanUrls: /partners → partners.html
    else if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f) || !f.startsWith(ROOT)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  return new Promise((r) => srv.listen(port, () => r(srv)));
}

// An in-memory stand-in for the supabase-js client, enough for supabase/functions/whatsapp. Used only by tests/whatsapp-engine.test.mjs.
// The Vault functions (wa_secret_*) are re-implemented here; the SQL itself is tested on a real PostgreSQL by tests/whatsapp-db/run.sh.
export const db = { tables: {}, vault: {}, users: {}, cronSecret: 'cron-test' };
export const reset = () => { db.tables = { whatsapp_config: [{ id: 1, graph_version: 'v21.0', status: 'not_configured', status_detail: '', app_id: '', waba_id: '', phone_number_id: '', token_scopes: [], webhook_fields: [] }] }; db.vault = {}; };
reset();
const T = n => (db.tables[n] = db.tables[n] || []); let seq = 1;
const cmp = (v, op, x) => { if (op === 'eq') return String(v) === String(x); if (v == null) return false; return op === 'gte' ? String(v) >= String(x) : String(v) > String(x); };
class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ord = null; this.lim = 1e9; this.head = false; this.one = null; }
  select(_c, o) { if (o) this.head = !!o.head; return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  upsert(r, o) { this.op = 'upsert'; this.rows = Array.isArray(r) ? r : [r]; this.opt = o || {}; return this; }
  update(p) { this.op = 'update'; this.patch = p; return this; } delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.f.push(r => cmp(r[c], 'eq', v)); return this; } gte(c, v) { this.f.push(r => cmp(r[c], 'gte', v)); return this; }
  order(c, o) { this.ord = [c, !(o && o.ascending === false)]; return this; } limit(n) { this.lim = n; return this; }
  single() { this.one = 'single'; return this; } maybeSingle() { this.one = 'maybe'; return this; }
  then(res, rej) { try { res(this.run()); } catch (e) { (rej || (x => { throw x; }))(e); } }
  run() {
    const rows = T(this.t);
    if (this.op === 'insert' || this.op === 'upsert') {
      for (const r0 of this.rows) {
        const r = { ...r0 }; if (r.id == null && this.t !== 'whatsapp_optouts') r.id = seq++;
        if (this.t === 'whatsapp_messages' && r.wamid && rows.some(x => x.wamid === r.wamid)) return { data: null, error: { message: 'duplicate wamid' } };
        if (this.op === 'upsert') { const k = this.opt.onConflict || 'id', ex = rows.find(x => x[k] === r[k]); if (ex) { Object.assign(ex, r); continue; } }
        if (['whatsapp_audit_log', 'whatsapp_api_errors', 'whatsapp_messages'].includes(this.t)) r.at = r.at || new Date().toISOString(); if (this.t === 'whatsapp_messages') r.created_at = new Date().toISOString();
        rows.push(r);
      }
      return { data: null, error: null };
    }
    let m = rows.filter(r => this.f.every(fn => fn(r)));
    if (this.op === 'update') { m.forEach(r => Object.assign(r, this.patch)); return { data: null, error: null }; }
    if (this.op === 'delete') { m.forEach(r => rows.splice(rows.indexOf(r), 1)); return { data: null, error: null }; }
    if (this.ord) { const [c, asc] = this.ord; m = m.slice().sort((a, b) => (String(a[c] ?? a.created_at) < String(b[c] ?? b.created_at) ? -1 : 1) * (asc ? 1 : -1)); }
    const total = m.length; m = m.slice(0, this.lim);
    if (this.head) return { data: null, error: null, count: total };
    if (this.one === 'single') return m.length ? { data: m[0], error: null } : { data: null, error: { message: 'no row' } };
    if (this.one === 'maybe') return { data: m[0] ?? null, error: null };
    return { data: m, error: null, count: total };
  }
}
const NAMES = ['wa_app_secret', 'wa_access_token', 'wa_verify_token'];
const rpcs = {
  wa_secret_get: a => { if (!NAMES.includes(a.p_name)) throw new Error('unknown secret'); return db.vault[a.p_name] ?? null; },
  wa_secret_set: a => { if (!NAMES.includes(a.p_name) || !a.p_value || a.p_value.length < 8) throw new Error('bad secret'); db.vault[a.p_name] = a.p_value; return null; },
  wa_secret_delete: a => { delete db.vault[a.p_name]; return null; },
  wa_secret_status: () => NAMES.map(name => ({ name, present: name in db.vault })),
  cron_secret_ok: a => a.s === db.cronSecret
};
const mk = ctx => ({
  from: t => new Q(t),
  rpc: async (name, a = {}) => { if (!rpcs[name]) return { data: null, error: { message: 'unknown rpc ' + name } }; try { return { data: rpcs[name](a), error: null }; } catch (e) { return { data: null, error: { message: e.message } }; } },
  auth: { getUser: async () => ({ data: { user: ctx.user || null } }) }
});
export const createClient = (_url, key, opts) => { const tok = (opts?.global?.headers?.Authorization || '').replace('Bearer ', ''); return mk({ user: key === 'service' ? null : db.users[tok] || null }); };

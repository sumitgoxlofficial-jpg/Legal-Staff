// In-memory stand-in for supabase-js, enough for supabase/functions/razorpay. Used only by tests/razorpay-engine.test.mjs.
// Real SQL (apply_refund, promo_claim, constraints) is tested on PostgreSQL by tests/hardening-db/run.sh.
export const db = { tables: {}, users: {}, rpcCalls: [], rpcResults: {} };
export const reset = () => { db.tables = {}; db.rpcCalls = []; db.rpcResults = { promo_claim: true, promo_use: null, apply_refund: 'plan_refunded', is_member: true, is_owner: true }; };
reset();
const T = n => (db.tables[n] = db.tables[n] || []); let seq = 1;
const UNIQUE = { payment_events: ['event_id'], directory_orders: ['order_no'], payments: ['order_no'] };
class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ret = false; this.lim = 1e9; this.head = false; this.one = null; }
  select(_c, o) { this.ret = true; if (o && o.head) this.head = true; return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  upsert(r) { this.op = 'upsert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  update(p) { this.op = 'update'; this.patch = p; return this; }
  eq(c, v) { this.f.push(r => String(r[c]) === String(v)); return this; }
  is(c, v) { this.f.push(r => (v === null ? r[c] == null : r[c] === v)); return this; }
  limit(n) { this.lim = n; return this; } order() { return this; } single() { this.one = 'single'; return this; } maybeSingle() { this.one = 'maybe'; return this; }
  then(res, rej) { try { res(this.run()); } catch (e) { (rej || (x => { throw x; }))(e); } }
  run() {
    const rows = T(this.t);
    if (db.failWrites && db.failWrites.includes(this.t) && this.op !== 'select') return { data: null, error: { message: 'forced failure' } };
    if (this.op === 'insert' || this.op === 'upsert') {
      const made = [];
      for (const r0 of this.rows) {
        const r = { id: seq++, ...r0 };
        for (const k of UNIQUE[this.t] || []) if (r[k] != null && rows.some(x => x[k] === r[k])) return { data: null, error: { message: 'duplicate key value violates unique constraint ' + k } };
        if (this.op === 'upsert') { const ex = rows.find(x => x.firm_id && x.firm_id === r.firm_id); if (ex) { Object.assign(ex, r0); continue; } }
        rows.push(r); made.push(r);
      }
      return { data: this.ret ? (this.one ? made[0] : made) : null, error: null };
    }
    let m = rows.filter(r => this.f.every(fn => fn(r)));
    if (this.op === 'update') { m.forEach(r => Object.assign(r, this.patch)); return { data: this.ret ? m.map(r => ({ id: r.id })) : null, error: null }; }
    m = m.slice(0, this.lim);
    if (this.head) return { data: null, error: null, count: m.length };
    if (this.one === 'single') return m.length ? { data: m[0], error: null } : { data: null, error: { message: 'no row' } };
    if (this.one === 'maybe') return { data: m[0] ?? null, error: null };
    return { data: m, error: null, count: m.length };
  }
}
const mk = ctx => ({
  from: t => new Q(t),
  rpc: async (name, a = {}) => { db.rpcCalls.push({ name, a }); const r = db.rpcResults[name]; return { data: typeof r === 'function' ? r(a) : r ?? null, error: null }; },
  auth: { getUser: async () => ({ data: { user: ctx.user || null } }) }
});
export const createClient = (_url, key, opts) => { const tok = (opts?.global?.headers?.Authorization || '').replace('Bearer ', ''); return mk({ user: db.users[tok] || null }); };

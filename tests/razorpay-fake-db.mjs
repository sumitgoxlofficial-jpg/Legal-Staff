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
  upsert(r, o) { this.op = 'upsert'; this.rows = Array.isArray(r) ? r : [r]; this.conflict = (o && o.onConflict) || 'firm_id'; return this; }
  delete() { this.op = 'delete'; return this; }
  update(p) { this.op = 'update'; this.patch = p; return this; }
  eq(c, v) { this.f.push(r => String(r[c]) === String(v)); return this; }
  is(c, v) { this.f.push(r => (v === null ? r[c] == null : r[c] === v)); return this; }
  lt(c, v) { this.f.push(r => r[c] != null && String(r[c]) < String(v)); return this; } lte(c, v) { this.f.push(r => r[c] != null && String(r[c]) <= String(v)); return this; } gte(c, v) { this.f.push(r => r[c] != null && String(r[c]) >= String(v)); return this; }
  gt(c, v) { this.f.push(r => r[c] > v); return this; } in(c, vs) { this.f.push(r => vs.includes(r[c])); return this; }
  range(a, b) { this.off = a; this.lim = b - a + 1; return this; }
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
        if (this.op === 'upsert') { const k = this.conflict; const ex = rows.find(x => x[k] != null && x[k] === r[k]); if (ex) { Object.assign(ex, r0); continue; } }
        rows.push(r); made.push(r);
      }
      return { data: this.ret ? (this.one ? made[0] : made) : null, error: null };
    }
    let m = rows.filter(r => this.f.every(fn => fn(r)));
    if (this.op === 'delete') { m.forEach(r => rows.splice(rows.indexOf(r), 1)); return { data: null, error: null }; }
    if (this.op === 'update') { m.forEach(r => Object.assign(r, this.patch)); return { data: this.ret ? m.map(r => ({ id: r.id })) : null, error: null }; }
    const total = m.length; m = m.slice(this.off || 0, (this.off || 0) + this.lim).map(r => ({ ...r }));   // snapshots, like a real database
    if (this.head) return { data: null, error: null, count: total };
    if (this.one === 'single') return m.length ? { data: m[0], error: null } : { data: null, error: { message: 'no row' } };
    if (this.one === 'maybe') return { data: m[0] ?? null, error: null };
    return { data: m, error: null, count: total };
  }
}
const mk = ctx => ({
  from: t => new Q(t),
  rpc: async (name, a = {}) => { db.rpcCalls.push({ name, a }); const r = db.rpcResults[name]; const v = typeof r === 'function' ? r(a) : r ?? null; return v && v.__error ? { data: null, error: v.__error } : { data: v, error: null }; },
  storage: { from: () => ({ list: async () => ({ data: [], error: null }), remove: async () => ({ error: null }) }) },
  auth: { getUser: async () => ({ data: { user: ctx.user || null } }), admin: { listUsers: async () => ({ data: { users: [] }, error: null }), deleteUser: async id => { (db.deletedUsers ||= []).push(id); return { error: null }; } } }
});
export const createClient = (_url, key, opts) => { const tok = (opts?.global?.headers?.Authorization || '').replace('Bearer ', ''); return mk({ user: db.users[tok] || null }); };

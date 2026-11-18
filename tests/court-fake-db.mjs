// An in-memory stand-in for the supabase-js client, enough for supabase/functions/court-sync. It is used only by
// tests/court-engine.test.mjs. The SQL functions (court_budget_reserve, court_claim ...) are re-implemented here with the same
// rules as migration 0022; those rules themselves are tested against a real Postgres (see tests/README.md).
export const db = { tables: {}, users: {}, memberships: [], admins: new Set(), access: true, cronSecret: 'cron-test', vaultKey: '', budget: { limit: 100000, stop: true, override: false }, spent: 0, claims: new Set(), now: () => Date.now() };
export const reset = () => { db.tables = {}; db.vaultKey = ''; db.spent = 0; db.claims = new Set(); db.budget = { limit: 100000, stop: true, override: false }; db.access = true; };
const T = n => (db.tables[n] = db.tables[n] || []);
let seq = 1;
const get = (row, col) => col.includes('->>') ? (([a, b]) => (row[a] || {})[b])(col.split('->>')) : row[col];
const cmp = (v, op, x) => { if (op === 'eq') return String(v) === String(x); if (op === 'neq') return String(v) !== String(x); if (v == null) return false; const a = typeof x === 'number' ? Number(v) : String(v); return op === 'gt' ? a > x : op === 'gte' ? a >= x : op === 'lt' ? a < x : a <= x; };

class Q {
  constructor(table) { this.t = table; this.f = []; this.op = 'select'; this.ord = null; this.lim = 1e9; this.count = false; this.head = false; this.one = null; }
  select(_c, o) { if (this.op === 'select') this.op = 'select'; if (o) { this.count = !!o.count; this.head = !!o.head; } this.ret = true; return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  upsert(r, o) { this.op = 'upsert'; this.rows = Array.isArray(r) ? r : [r]; this.opt = o || {}; return this; }
  update(p) { this.op = 'update'; this.patch = p; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.f.push(r => cmp(get(r, c), 'eq', v)); return this; } neq(c, v) { this.f.push(r => cmp(get(r, c), 'neq', v)); return this; }
  gt(c, v) { this.f.push(r => cmp(get(r, c), 'gt', v)); return this; } gte(c, v) { this.f.push(r => cmp(get(r, c), 'gte', v)); return this; }
  lt(c, v) { this.f.push(r => cmp(get(r, c), 'lt', v)); return this; } lte(c, v) { this.f.push(r => cmp(get(r, c), 'lte', v)); return this; }
  like(c, pat) { const pre = String(pat).replace(/%$/, ''); this.f.push(r => String(get(r, c) ?? '').startsWith(pre)); return this; }
  range(a, b) { this.from = a; this.to = b; return this; }
  in(c, v) { this.f.push(r => v.includes(get(r, c))); return this; } not(c, _o, _v) { this.f.push(r => get(r, c) != null); return this; }
  order(c, o) { this.ord = [c, !(o && o.ascending === false)]; return this; } limit(n) { this.lim = n; return this; }
  single() { this.one = 'single'; return this; } maybeSingle() { this.one = 'maybe'; return this; }
  then(res, rej) { try { res(this.run()); } catch (e) { (rej || (x => { throw x; }))(e); } }
  match(r) { return this.f.every(fn => fn(r)); }
  run() {
    const rows = T(this.t);
    if (this.op === 'insert' || this.op === 'upsert') {
      const out = [];
      for (const r0 of this.rows) {
        const r = { id: r0.id ?? (seq++ + '-' + this.t), ...r0 };
        if (this.op === 'insert' && this.t === 'court_jobs' && ['queued', 'running'].includes(r.status ?? 'queued') && rows.some(x => x.case_id === r.case_id && ['queued', 'running'].includes(x.status))) return { data: null, error: { message: 'duplicate key' } };
        if (this.op === 'upsert') {
          const keys = (this.opt.onConflict || { api_budget_settings: 'provider_key', court_providers: 'key', api_response_cache: 'request_key' }[this.t] || 'id').split(',').map(s => s.trim()), ex = rows.find(x => keys.every(k => String(x[k]) === String(r[k])) || (this.t === 'records' && x.firm_id === r.firm_id && x.kind === r.kind && x.id === r.id));
          if (ex) { if (!this.opt.ignoreDuplicates) Object.assign(ex, r0); out.push(ex); continue; }
        }
        if (this.t === 'legal_cases') { const dup = rows.find(x => x.firm_id === r.firm_id && x.record_id === r.record_id); if (dup) return { data: null, error: { message: 'duplicate' } };
          Object.assign(r, { verification_status: 'PENDING', verification_note: '', attempts: 0, state: 'active', next_check_at: new Date(db.now()).toISOString(), last_checked_at: null, last_verified_at: null, last_changed_at: null, source_provider: '', tribunal: '', ...r0 }); }
        if (this.t === 'case_snapshots') r.taken_at = new Date(db.now() + rows.length).toISOString();
        if (r.created_at === undefined && ['notifications', 'notification_events', 'verification_logs', 'api_usage_logs'].includes(this.t)) r.created_at = new Date(db.now()).toISOString();
        rows.push(r); out.push(r);
      }
      return this.fin(out);
    }
    let m = rows.filter(r => this.match(r));
    if (this.op === 'update') { m.forEach(r => Object.assign(r, this.patch)); return this.fin(m); }
    if (this.op === 'delete') { m.forEach(r => rows.splice(rows.indexOf(r), 1)); return this.fin(m); }
    if (this.ord) { const [c, asc] = this.ord; m = m.slice().sort((a, b) => (String(get(a, c)) < String(get(b, c)) ? -1 : 1) * (asc ? 1 : -1)); }
    const total = m.length; if (this.from != null) m = m.slice(this.from, this.to + 1); m = m.slice(0, this.lim);
    if (this.head) return { data: null, error: null, count: total };
    return this.fin(m, total);
  }
  fin(m, total) {
    if (this.one === 'single') return m.length ? { data: m[0], error: null } : { data: null, error: { message: 'no row' } };
    if (this.one === 'maybe') return { data: m[0] ?? null, error: null };
    return { data: m, error: null, count: total ?? m.length };
  }
}
const rpcs = {
  court_budget_reserve: (a, ctx) => { const lim = a.p_limit_override ?? db.budget.limit, spent = db.spent, ovr = db.budget.override;
    if (db.budget.stop && !ovr && spent + a.p_cost > lim) return { allow: false, spent, limit: lim };
    db.spent += a.p_cost; return { allow: true, spent: db.spent, limit: lim, overridden: db.spent > lim }; },
  court_budget_refund: a => { db.spent = Math.max(0, db.spent - a.p_cost); return null; },
  court_claim: a => { if (db.claims.has(a.p_key)) return false; db.claims.add(a.p_key); return true; },
  court_release: a => { db.claims.delete(a.p_key); return null; },
  court_api_key: () => db.vaultKey, court_set_api_key: a => { db.vaultKey = a.p_key; return null; },
  cron_secret_ok: a => a.s === db.cronSecret
};
const mk = ctx => ({
  from: t => new Q(t),
  rpc: async (name, a = {}) => {
    if (name === 'is_platform_admin') return { data: db.admins.has(ctx.user), error: null };
    if (name === 'is_member') return { data: db.memberships.some(m => m.user === ctx.user && m.firm === a.f), error: null };
    if (name === 'firm_access') return { data: db.access, error: null };
    if (!rpcs[name]) return { data: null, error: { message: 'unknown rpc ' + name } };
    return { data: rpcs[name](a, ctx), error: null };
  },
  auth: { getUser: async () => ({ data: { user: ctx.user ? { id: ctx.user } : null } }) }
});
export const createClient = (_url, key, opts) => {
  const tok = (opts?.global?.headers?.Authorization || '').replace('Bearer ', '');
  return mk({ user: key === 'service' ? null : db.users[tok] || null });
};

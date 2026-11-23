// An in-memory stand-in for the supabase-js client, enough to run supabase/functions/esign. Used only by tests/esign-engine.test.mjs.
// The SQL functions (esign_charge, esign_refund ...) are re-implemented here with the same rules as migration 0024; those rules
// themselves are tested against a real PostgreSQL 16 (tests/esign-db/run.sh).
import { createHash, randomUUID } from 'node:crypto';
export const db = { tables: {}, users: {}, memberships: [], supers: new Set(), access: true, plan: 'Professional', cronSecret: 'cron-test', vault: {}, files: {}, masterKey: Buffer.alloc(32, 7).toString('base64'), now: () => Date.now() };
export const reset = () => { db.tables = {}; db.vault = {}; db.files = {}; db.access = true; db.plan = 'Professional'; seq = 1; };
const T = (n) => (db.tables[n] = db.tables[n] || []);
let seq = 1;
const get = (r, c) => r[c];
const cmp = (v, op, x) => { if (op === 'eq') return String(v) === String(x); if (op === 'neq') return String(v) !== String(x); if (v == null) return false; const a = typeof x === 'number' ? Number(v) : String(v); return op === 'gt' ? a > x : op === 'gte' ? a >= x : op === 'lt' ? a < x : a <= x; };
const sha = (t) => createHash('sha256').update(t).digest('hex');
const evText = (e) => [e.prev_hash, e.request_id, e.signer_id ?? '', e.type, e.actor, e.ip, e.ua, e.at, JSON.stringify(e.data)].join('|');
const DEFAULTS = {
  esign_requests: () => ({ id: randomUUID(), status: 'prepared', message: '', mode: 'parallel', provider: 'native', provider_ref: '', page_count: 0, doc_hash: '', original_path: '', signed_path: '', signed_hash: '', charge: null, error: null, created_at: new Date(db.now()).toISOString(), updated_at: new Date(db.now()).toISOString(), sent_at: null, completed_at: null }),
  esign_signers: () => ({ id: randomUUID(), status: 'pending', reminders: 0, otp_attempts: 0, decline_reason: '', created_at: new Date(db.now()).toISOString(), token_hash: null, session_hash: null, otp_hash: null, otp_sent_at: null, verified_at: null, viewed_at: null, signed_at: null, last_reminder_at: null, notified_at: null, signature: null, consent: null }),
  esign_fields: () => ({ id: randomUUID(), value: null, filled_at: null }),
  esign_provider_usage: () => ({ id: seq++, at: new Date(db.now()).toISOString(), ok: true, cost_paise: 0, units: 1 }),
  esign_wallets: () => ({ credits: 0, free_trial_used: 0, monthly_limit: null, blocked: false, updated_at: new Date(db.now()).toISOString() }),
};
class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.ord = []; this.lim = 1e9; this.count = false; this.head = false; this.one = null; }
  select(_c, o) { if (o) { this.count = !!o.count; this.head = !!o.head; } return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  upsert(r, o) { this.op = 'upsert'; this.rows = Array.isArray(r) ? r : [r]; this.opt = o || {}; return this; }
  update(p) { this.op = 'update'; this.patch = p; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.f.push((r) => cmp(r[c], 'eq', v)); return this; } neq(c, v) { this.f.push((r) => cmp(r[c], 'neq', v)); return this; }
  gt(c, v) { this.f.push((r) => cmp(r[c], 'gt', v)); return this; } gte(c, v) { this.f.push((r) => cmp(r[c], 'gte', v)); return this; }
  lt(c, v) { this.f.push((r) => cmp(r[c], 'lt', v)); return this; } lte(c, v) { this.f.push((r) => cmp(r[c], 'lte', v)); return this; }
  in(c, v) { this.f.push((r) => v.includes(r[c])); return this; }
  not(c, op, v) { this.f.push((r) => (op === 'is' && v === null ? r[c] != null : r[c] !== v)); return this; }
  order(c, o) { this.ord.push([c, !(o && o.ascending === false)]); return this; } limit(n) { this.lim = n; return this; }
  single() { this.one = 'single'; return this; } maybeSingle() { this.one = 'maybe'; return this; }
  then(res, rej) { try { res(this.run()); } catch (e) { (rej || ((x) => { throw x; }))(e); } }
  run() {
    const rows = T(this.t);
    if (this.op === 'insert' || this.op === 'upsert') {
      const out = [];
      for (const r0 of this.rows) {
        const r = { ...(DEFAULTS[this.t] ? DEFAULTS[this.t]() : {}), ...r0 };
        if (this.op === 'upsert') { const k = (this.opt.onConflict || 'id'); const ex = rows.find((x) => x[k] === r[k]); if (ex) { Object.assign(ex, r0); out.push(ex); continue; } }
        if (this.t === 'esign_signers' && rows.some((x) => x.request_id === r.request_id && x.email === r.email)) return { data: null, error: { message: 'duplicate signer' } };
        if (this.t === 'esign_events') { const last = rows.filter((x) => x.request_id === r.request_id).pop(); r.id = seq++; r.at = new Date(db.now()).toISOString(); r.prev_hash = last ? last.hash : ''; r.hash = sha(evText(r)); r.ip = r.ip ?? ''; r.ua = r.ua ?? ''; r.actor = r.actor ?? ''; r.data = r.data ?? {}; }
        rows.push(r); out.push(r);
      }
      return this.fin(out);
    }
    let m = rows.filter((r) => this.f.every((fn) => fn(r)));
    if (this.op === 'update') { if (this.t === 'esign_events') throw new Error('audit trail cannot be changed'); m.forEach((r) => Object.assign(r, this.patch)); return this.fin(m); }
    if (this.op === 'delete') { if (this.t === 'esign_events') throw new Error('audit trail cannot be changed'); m.forEach((r) => rows.splice(rows.indexOf(r), 1)); if (this.t === 'esign_signers') { const ids = new Set(m.map((x) => x.id)); db.tables.esign_fields = T('esign_fields').filter((f) => !ids.has(f.signer_id)); } return this.fin(m); }
    for (const [c, asc] of this.ord.slice().reverse()) m = m.slice().sort((a, b) => (String(a[c] ?? '') < String(b[c] ?? '') ? -1 : String(a[c] ?? '') > String(b[c] ?? '') ? 1 : 0) * (asc ? 1 : -1));
    const total = m.length; m = m.slice(0, this.lim);
    if (this.head) return { data: null, error: null, count: total };
    return this.fin(m, total);
  }
  fin(m, total) {
    const c = (x) => JSON.parse(JSON.stringify(x));
    if (this.one === 'single') return m.length ? { data: c(m[0]), error: null } : { data: null, error: { message: 'no row' } };
    if (this.one === 'maybe') return { data: m[0] ? c(m[0]) : null, error: null };
    return { data: c(m), error: null, count: total ?? m.length };
  }
}
const monthCount = (f, from, via) => T('esign_requests').filter((r) => r.firm_id === f && r.sent_at && r.sent_at >= from && r.charge && (!via || r.charge.via === via)).length;
const wallet = (f) => { let w = T('esign_wallets').find((x) => x.firm_id === f); if (!w) { w = { firm_id: f, ...DEFAULTS.esign_wallets() }; T('esign_wallets').push(w); } return w; };
const ledger = (o) => T('esign_ledger').push({ id: seq++, created_at: new Date(db.now()).toISOString(), ...o });
const rpcs = {
  cron_secret_ok: (a) => a.s === db.cronSecret, esign_master_key: () => db.masterKey,
  esign_secret_set: (a) => { if (!a.p_value) delete db.vault[a.p_name]; else db.vault[a.p_name] = a.p_value; return null; }, esign_secret_has: (a) => !!db.vault[a.p_name], esign_secret_get: (a) => db.vault[a.p_name],
  esign_month_count: (a) => monthCount(a.f, a.p_from, a.p_via),
  esign_charge: (a) => {
    const w = wallet(a.p_firm); if (w.blocked) return { ok: false, code: 'blocked' };
    const lim = w.monthly_limit ?? a.p_limit; if (lim > 0 && monthCount(a.p_firm, a.p_month_from) >= lim) return { ok: false, code: 'limit', limit: lim };
    let via;
    if (!a.p_priced || a.p_cost === 0) via = 'none';
    else if (monthCount(a.p_firm, a.p_month_from, 'free_month') < a.p_free_month) via = 'free_month';
    else if (w.free_trial_used < a.p_free_trial) { via = 'free_trial'; w.free_trial_used++; }
    else if (w.credits >= a.p_cost) { via = 'credits'; w.credits -= a.p_cost; ledger({ firm_id: a.p_firm, delta: -a.p_cost, kind: 'use', request_id: a.p_request, balance_after: w.credits }); }
    else return { ok: false, code: 'credits', need: a.p_cost, have: w.credits };
    const r = T('esign_requests').find((x) => x.id === a.p_request); r.charge = { via, credits: via === 'credits' ? a.p_cost : 0 }; r.sent_at = new Date(db.now()).toISOString();
    return { ok: true, via, credits: r.charge.credits, left: w.credits };
  },
  esign_refund: (a) => { const r = T('esign_requests').find((x) => x.id === a.p_request); if (!r || !r.charge) return { ok: true }; const w = wallet(r.firm_id);
    if (r.charge.via === 'credits') { w.credits += r.charge.credits; ledger({ firm_id: r.firm_id, delta: r.charge.credits, kind: 'refund', request_id: r.id, balance_after: w.credits }); } else if (r.charge.via === 'free_trial') w.free_trial_used--;
    r.charge = null; r.sent_at = null; return { ok: true }; },
  esign_add_credits: (a) => { if (a.p_payment && T('esign_ledger').some((l) => l.payment_id === a.p_payment)) return wallet(a.p_firm).credits; const w = wallet(a.p_firm); w.credits += a.p_n; ledger({ firm_id: a.p_firm, delta: a.p_n, kind: a.p_kind, payment_id: a.p_payment, balance_after: w.credits }); return w.credits; },
  esign_chain_check: (a) => { let prev = ''; let n = 0; for (const e of T('esign_events').filter((x) => x.request_id === a.p_request)) { n++; if (e.prev_hash !== prev || e.hash !== sha(evText(e))) return { ok: false, events: n, broken_at: e.id }; prev = e.hash; } return { ok: true, events: n, head: prev }; },
};
const storage = { from: () => ({
  upload: async (p, body) => { db.files[p] = Buffer.from(body); return { data: { path: p }, error: null }; },
  download: async (p) => (db.files[p] ? { data: new Blob([db.files[p]]), error: null } : { data: null, error: { message: 'not found' } }),
  remove: async (ps) => { ps.forEach((p) => delete db.files[p]); return { data: null, error: null }; },
  copy: async (a, b) => { if (!db.files[a]) return { error: { message: 'not found' } }; db.files[b] = Buffer.from(db.files[a]); return { error: null }; },
}) };
const mk = (ctx) => ({
  from: (t) => new Q(t), storage,
  rpc: async (name, a = {}) => {
    if (name === 'is_member') return { data: db.memberships.some((m) => m.user === ctx.user && m.firm === a.f), error: null };
    if (name === 'firm_access') return { data: db.access, error: null };
    if (!rpcs[name]) return { data: null, error: { message: 'unknown rpc ' + name } };
    return { data: rpcs[name](a, ctx), error: null };
  },
  auth: { getUser: async () => ({ data: { user: ctx.user ? { id: ctx.user, email: db.emails?.[ctx.user] ?? ctx.user + '@x.in', email_confirmed_at: '2026-01-01' } : null } }), admin: { getUserById: async (id) => ({ data: { user: { id, email: db.emails?.[id] ?? id + '@x.in' } } }) } },
});
export const createClient = (_url, key, opts) => { const tok = (opts?.global?.headers?.Authorization || '').replace('Bearer ', ''); return mk({ user: key === 'service' ? null : db.users[tok] || null }); };

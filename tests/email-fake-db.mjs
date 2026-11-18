// An in-memory stand-in for the supabase-js client, enough for supabase/functions/email-marketing. Used only by tests/email-engine.test.mjs.
// The SQL functions (email_import_rows, email_suppress ...) are re-implemented here with the same rules as migration 0035;
// those rules themselves are tested against a real PostgreSQL by tests/email-db/run.sh.
export const db = { tables: {}, users: {}, admins: new Set(), cronSecret: 'cron-test' };
const RealDate = Date; export const clock = { t: RealDate.now() };
globalThis.Date = class extends RealDate { constructor(...a) { a.length ? super(...a) : super(clock.t); } static now() { return clock.t; } };
const iso = () => new Date().toISOString();
let seq = 1; const uid = (p) => `${p}-${seq++}`;
const UNIQUE = { email_contacts: [['email_normalized'], ['contact_id']], email_queue: [['idempotency_key'], ['campaign_id', 'contact_id']], email_events: [['dedupe_key']], email_job_runs: [['job_key']], email_suppressions: [['email_normalized']], google_sheets_integrations: [['spreadsheet_id']], email_logs: [['provider_message_id']] };
const DEFAULTS = {
  email_queue: () => ({ status: 'queued', attempts: 0, skip_reason: '', provider_message_id: null, last_error: '', created_at: iso(), updated_at: iso() }),
  email_events: () => ({ occurred_at: iso(), created_at: iso(), meta: {}, provider_message_id: null, queue_id: null, campaign_id: null, dedupe_key: null }),
  email_logs: () => ({ created_at: iso(), provider_message_id: null, error: '' }),
  email_job_runs: () => ({ started_at: iso(), finished_at: null, summary: {} }),
  email_import_runs: () => ({ status: 'running', started_at: iso(), errors: [], rows_read: 0 }),
  google_sheets_integrations: () => ({ sync_enabled: false, last_sync_at: null, last_sync_status: 'never', last_sync_summary: {}, created_at: iso() }),
  email_audit_logs: () => ({ created_at: iso(), details: {}, target: '' }), email_consents: () => ({ created_at: iso() }),
};
const T = (n) => (db.tables[n] = db.tables[n] || []);
const cmp = (v, op, x) => { if (op === 'eq') return String(v) === String(x); if (op === 'neq') return String(v) !== String(x); if (v == null) return false; const a = typeof x === 'number' ? Number(v) : String(v); return op === 'gt' ? a > x : op === 'gte' ? a >= x : op === 'lt' ? a < x : a <= x; };
const dupOf = (t, rows, r) => (UNIQUE[t] || []).some((cols) => cols.every((c) => r[c] != null) && rows.some((x) => cols.every((c) => x[c] === r[c])));

class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.lim = 1e9; this.from = 0; this.head = false; }
  select(_c, o) { if (o) this.head = !!o.head; this.ret = true; return this; }
  insert(r) { this.op = 'insert'; this.rows = Array.isArray(r) ? r : [r]; return this; }
  upsert(r, o) { this.op = 'upsert'; this.rows = Array.isArray(r) ? r : [r]; this.opt = o || {}; return this; }
  update(p) { this.op = 'update'; this.patch = p; return this; } delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.f.push((r) => cmp(r[c], 'eq', v)); return this; } neq(c, v) { this.f.push((r) => cmp(r[c], 'neq', v)); return this; }
  gt(c, v) { this.f.push((r) => cmp(r[c], 'gt', v)); return this; } gte(c, v) { this.f.push((r) => cmp(r[c], 'gte', v)); return this; }
  lt(c, v) { this.f.push((r) => cmp(r[c], 'lt', v)); return this; } lte(c, v) { this.f.push((r) => cmp(r[c], 'lte', v)); return this; }
  in(c, v) { this.f.push((r) => v.includes(r[c])); return this; }
  not(c, _o, _v) { this.f.push((r) => r[c] != null); return this; } is(c, _v) { this.f.push((r) => r[c] == null); return this; }
  ilike(c, p) { const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*'), 'i'); this.f.push((r) => re.test(String(r[c] ?? ''))); return this; }
  or(s) { const parts = s.split(',').map((x) => x.split('.')); this.f.push((r) => parts.some(([c, , p]) => new RegExp(p.replace(/%/g, '.*'), 'i').test(String(r[c] ?? '')))); return this; }
  order(c, o) { this.ord = [c, !(o && o.ascending === false)]; return this; } limit(n) { this.lim = n; return this; } range(a, b) { this.from = a; this.lim = b - a + 1; return this; }
  single() { this.one = 'single'; return this; } maybeSingle() { this.one = 'maybe'; return this; }
  then(res, rej) { try { res(this.run()); } catch (e) { (rej || ((x) => { throw x; }))(e); } }
  run() {
    const rows = T(this.t), tbl = this.t;
    if (this.op === 'insert' || this.op === 'upsert') {
      const out = [];
      for (const r0 of this.rows) {
        const r = { id: r0.id ?? uid(tbl), ...(DEFAULTS[tbl] ? DEFAULTS[tbl]() : {}), ...r0 };
        if (tbl === 'email_contacts') Object.assign(r, { contact_id: r.contact_id ?? 'LSC-' + String(rows.length + 1).padStart(6, '0') });
        if (this.op === 'upsert') {
          const keys = (this.opt.onConflict || 'id').split(',').map((s) => s.trim()), ex = rows.find((x) => keys.every((k) => x[k] === r[k]));
          if (ex) { if (!this.opt.ignoreDuplicates) Object.assign(ex, r0); if (!this.opt.ignoreDuplicates) out.push(ex); continue; }
        } else if (dupOf(tbl, rows, r)) return { data: null, error: { message: `duplicate key value violates unique constraint on ${tbl}`, code: '23505' } };
        rows.push(r); out.push(r);
      }
      return this.fin(out);
    }
    let m = rows.filter((r) => this.f.every((fn) => fn(r)));
    if (this.op === 'update') { m.forEach((r) => Object.assign(r, this.patch)); return this.fin(m); }
    if (this.op === 'delete') { m.forEach((r) => rows.splice(rows.indexOf(r), 1)); return this.fin(m); }
    if (this.ord) { const [c, asc] = this.ord; m = m.slice().sort((a, b) => (String(a[c]) < String(b[c]) ? -1 : String(a[c]) > String(b[c]) ? 1 : 0) * (asc ? 1 : -1)); }
    const total = m.length; m = m.slice(this.from, this.from + this.lim);
    if (this.head) return { data: null, error: null, count: total };
    return this.fin(m, total);
  }
  fin(m, total) {
    const copy = m.map((r) => ({ ...r }));
    if (this.one === 'single') return copy.length ? { data: copy[0], error: null } : { data: null, error: { message: 'no row' } };
    if (this.one === 'maybe') return { data: copy[0] ?? null, error: null };
    return { data: copy, error: null, count: total ?? m.length };
  }
}

const audit = (actor, action, target, details = {}) => T('email_audit_logs').push({ id: uid('aud'), actor, action, target, details, created_at: iso() });
const norm = (s) => String(s ?? '').trim().toLowerCase();
const EMAIL = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
const contactBy = (f) => T('email_contacts').find(f);
const rpcs = {
  cron_secret_ok: (a) => a.s === db.cronSecret,
  email_import_rows: (a) => {
    const rows = T('email_contacts'), o = { new: 0, updated: 0, duplicate: 0, invalid: 0, consents: 0, errors: [] }, seen = new Set();
    for (const r of a.p_rows) {
      const n = norm(r.email); if (!EMAIL.test(n)) { o.invalid++; o.errors.push({ row: r.row, error: 'Invalid email address' }); continue; }
      if (seen.has(n)) { o.duplicate++; continue; } seen.add(n);
      let c = contactBy((x) => x.email_normalized === n);
      if (c) { for (const k of ['advocate_name', 'city', 'state', 'contact_source', 'source_url']) if (r[k]) c[k] = r[k]; o.updated++; }
      else { c = { id: uid('c'), contact_id: 'LSC-' + String(rows.length + 1).padStart(6, '0'), advocate_name: r.advocate_name || '', email: r.email.trim(), email_normalized: n, city: r.city || '', state: r.state || '', contact_source: r.contact_source || '', source_url: r.source_url || '',
        consent_status: 'UNKNOWN', consent_source: '', consent_timestamp: null, consent_verified_at: null, first_email_status: 'BLOCKED', first_email_date: null, reminder_due_date: null, reminder_count: 0, registration_status: 'NONE', payment_status: 'NONE', profile_verified: false, unsubscribe_status: 'SUBSCRIBED', hard_bounced: false, spam_complaint: false, created_at: iso(), last_updated: iso() }; rows.push(c); o.new++; }
    }
    return o;
  },
  email_apply_consent: (a) => {
    const c = contactBy((x) => x.id === a.p_contact); if (!c) return { error: { message: 'Unknown contact' } };
    if (T('email_suppressions').some((s) => s.email_normalized === c.email_normalized)) return { error: { message: 'This address is suppressed' } };
    if (!a.p_source || !a.p_evidence || !a.p_at) return { error: { message: 'A consent needs a source, a date and an evidence reference' } };
    audit('admin', 'consent_recorded', c.contact_id, {}); const id = uid('consent'); T('email_consents').push({ consent_id: id, contact_id: c.id, email: c.email_normalized, purpose: 'marketing', consent_source: a.p_source, wording_version: a.p_wording, consented_at: a.p_at, verified_at: a.p_verified, withdrawn_at: null, evidence_ref: a.p_evidence, created_at: iso() });
    Object.assign(c, { consent_status: 'GRANTED', consent_source: a.p_source, consent_timestamp: a.p_at, consent_verified_at: a.p_verified, first_email_status: c.first_email_status === 'BLOCKED' && a.p_verified && c.unsubscribe_status === 'SUBSCRIBED' && !c.hard_bounced && !c.spam_complaint ? 'ELIGIBLE' : c.first_email_status });
    return id;
  },
  email_verify_consent: (a) => { const c = contactBy((x) => x.id === a.p_contact); T('email_consents').filter((x) => x.contact_id === c.id).forEach((x) => (x.verified_at = x.verified_at || a.p_at)); c.consent_verified_at = c.consent_verified_at || a.p_at; if (c.first_email_status === 'BLOCKED') c.first_email_status = 'ELIGIBLE'; return null; },
  email_suppress: (a) => {
    const n = norm(a.p_email), c = contactBy((x) => x.email_normalized === n);
    if (!T('email_suppressions').some((s) => s.email_normalized === n)) T('email_suppressions').push({ id: uid('s'), email_normalized: n, contact_id: c?.id ?? null, reason: a.p_reason, source: a.p_source, created_at: iso() });
    if (c) { if (a.p_reason === 'unsubscribed') c.unsubscribe_status = 'UNSUBSCRIBED'; if (['hard_bounce', 'invalid'].includes(a.p_reason)) c.hard_bounced = true; if (a.p_reason === 'spam_complaint') c.spam_complaint = true;
      if (['ELIGIBLE', 'QUEUED'].includes(c.first_email_status)) c.first_email_status = 'BLOCKED'; c.reminder_due_date = null;
      T('email_queue').filter((q) => q.contact_id === c.id && q.status === 'queued').forEach((q) => Object.assign(q, { status: 'skipped', skip_reason: 'suppressed: ' + a.p_reason }));
      if (['unsubscribed', 'spam_complaint'].includes(a.p_reason)) c.consent_status = 'WITHDRAWN'; }
    audit(a.p_actor, 'suppressed', n, { reason: a.p_reason }); return null;
  },
  email_record_conversion: (a) => {
    const c = contactBy((x) => x.email_normalized === norm(a.p_email)); if (!c) return false;
    const q = T('email_queue').filter((x) => x.contact_id === c.id && x.status === 'sent').sort((x, y) => (x.updated_at < y.updated_at ? 1 : -1))[0], key = `${a.p_event}:${c.id}:${a.p_ref || 'once'}`;
    const fresh = !T('email_events').some((e) => e.dedupe_key === key); if (fresh) T('email_events').push({ id: uid('e'), event_type: a.p_event, contact_id: c.id, campaign_id: q?.campaign_id ?? null, queue_id: q?.id ?? null, meta: a.p_meta || {}, dedupe_key: key, occurred_at: iso(), created_at: iso(), provider_message_id: null });
    if (['registration_completed', 'payment_success'].includes(a.p_event)) { c.registration_status = 'COMPLETED'; c.reminder_due_date = null; if (['ELIGIBLE', 'QUEUED'].includes(c.first_email_status)) c.first_email_status = 'BLOCKED'; T('email_queue').filter((x) => x.contact_id === c.id && x.status === 'queued').forEach((x) => Object.assign(x, { status: 'skipped', skip_reason: 'converted' })); }
    if (a.p_event === 'payment_success') c.payment_status = 'PAID'; if (a.p_event === 'profile_verified') c.profile_verified = true; if (a.p_event === 'registration_started' && c.registration_status === 'NONE') c.registration_status = 'STARTED';
    return fresh;
  },
};
export const createClient = (_url, _key, opt) => ({
  from: (t) => new Q(t),
  rpc: (n, a) => { try { const r = rpcs[n](a); return Promise.resolve(r && r.error ? { data: null, error: r.error } : { data: r, error: null }); } catch (e) { return Promise.resolve({ data: null, error: { message: e.message } }); } },
  auth: { getUser: async () => { const tok = (opt?.global?.headers?.Authorization || '').replace('Bearer ', ''); const u = db.users[tok]; return { data: { user: u || null } }; } },
});
export const seed = () => {
  db.tables = {};
  T('email_automation_settings').push({ id: 1, system_enabled: false, legal_approval: false, legal_approval_ref: '', provider_approved: false, provider_approval_ref: '', dry_run: true, kill_switch: false, max_new_per_day: 100, max_reminders_per_day: 100, new_email_time: '10:00', reminder_time: '15:00', report_time: '20:00', reminder_after_days: 5, max_reminders: 2, timezone: 'Asia/Kolkata', sheet_sync_hours: 24, report_to: '' });
  T('email_provider_settings').push({ id: 1, provider: 'brevo', sender_email: '', sender_name: 'Legal Staff', reply_to: '', sender_domain: '', spf_ok: null, dkim_ok: null, dmarc_ok: null, domain_authenticated: false });
  const tp = [['first_introduction', 'Introducing Legal Staff – Your Advocate Profile for Just ₹49'], ['reminder', 'A Quick Reminder – Legal Staff Advocate Directory'], ['final_reminder', 'Final Reminder – Explore Legal Staff Directory']];
  tp.forEach(([key, subject]) => T('email_templates').push({ id: uid('t'), key, name: key, subject, body_html: '<p>Dear Advocate {{advocate_name}},</p><p><a href="{{directory_url}}">https://legalstaff.in/directory</a></p><p>Unsubscribe: {{unsubscribe_url}}</p>', body_text: '', active: false, version: 1 }));
  [['new_intro', 'new', 0, 'first_introduction'], ['reminder_1', 'reminder', 1, 'reminder'], ['reminder_2', 'reminder', 2, 'final_reminder']].forEach(([code, kind, step, template_key]) => T('email_campaigns').push({ id: uid('camp'), code, name: code, kind, step, template_key, active: true }));
  db.admins = new Set(['admin@legalstaff.in']); db.users = { 'tok-admin': { email: 'admin@legalstaff.in', email_confirmed_at: '2026-01-01' }, 'tok-user': { email: 'someone@else.in', email_confirmed_at: '2026-01-01' } };
  T('super_admins').push({ email: 'admin@legalstaff.in' });
};
export const table = T;

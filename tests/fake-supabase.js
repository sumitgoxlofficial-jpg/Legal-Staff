/* Legal Staff — in-browser fake of the supabase-js client, for tests only (served in place of vendor/supabase.js by tests/e2e.js).
   It keeps a whole "server" in localStorage['__fake_server'] so reloads keep data, and emulates the parts of PostgREST, Auth,
   Storage, RPC and Edge Functions that app-backend.js uses, with the row level security and triggers of
   supabase/migrations 0001–0006 that matter for roles, plans and invoices.
   Test controls: window.__fakeAdmin (signInAs, state, setSub, setOption, reset, …). The signed-in user is localStorage['__fake_session']. */
(function () {
  'use strict';
  const KEY = '__fake_server', SKEY = '__fake_session', PAGE_CAP = 1000;
  const today = () => new Date().toISOString().slice(0, 10);
  const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const blank = () => ({ schema: 6, users: {}, firms: [], members: [], records: [], user_state: [], subscriptions: [], payments: [], notifications: [], platform_admins: [], directory_applications: [], contact_requests: [], invoice_series: [], storage: {}, otp: {}, calls: [] });
  let S;
  function load() { try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; } if (!S) S = blank(); const b = blank(); Object.keys(b).forEach(k => { if (S[k] == null) S[k] = b[k]; }); return S; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.warn('fake server: storage full'); } }
  load();
  const uid = () => { const id = localStorage.getItem(SKEY) || ''; return S.users[id] ? id : ''; };
  const me = () => S.users[uid()] || null;
  const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const E = (message, code, status) => ({ message, code: code || 'P0001', details: null, hint: null, status: status || 400 });
  const RLS = t => E('new row violates row-level security policy for table "' + t + '"', '42501', 403);
  class Refuse extends Error { constructor(e) { super(e.message); this.e = e; } }
  const refuse = (msg, code) => { throw new Refuse(E(msg, code || '42501', 403)); };
  function log(kind, what) { S.calls.push([kind, what]); if (S.calls.length > 400) S.calls.splice(0, 100); }

  /* ---------- membership helpers (0001 is_member/is_owner, 0006 member_role) ---------- */
  const memberRow = f => S.members.find(m => m.firm_id === f && m.user_id === uid() && m.status === 'Active');
  const isMember = f => !!memberRow(f);
  const isOwner = f => { const m = memberRow(f); return !!(m && m.is_owner); };
  function roleOf(m) { if (!m) return null; if (m.is_owner) return 'owner'; const r = String(m.role || ''); if (/partner/i.test(r)) return 'partner'; if (/^(viewer|read.?only)/i.test(r)) return 'viewer'; if (/(clerk|paralegal|office|staff|intern|munshi|secretary)/i.test(r)) return 'clerk'; return 'associate'; }
  const memberRole = f => roleOf(memberRow(f));
  const isAdmin = () => S.platform_admins.some(a => a.user_id === uid());
  const v6 = () => S.schema >= 6;
  const PLAN_SEATS = { Solo: 1, Professional: 3, Firm: 15 };
  function seats(f) { const s = S.subscriptions.find(x => x.firm_id === f && x.status === 'active'); return s ? (PLAN_SEATS[s.plan] || 1) : 3; }

  /* ---------- tables: primary keys, defaults and policies ---------- */
  const PK = { firms: ['id'], members: ['id'], records: ['firm_id', 'kind', 'id'], user_state: ['user_id', 'firm_id'], subscriptions: ['firm_id'], payments: ['id'], notifications: ['id'], platform_admins: ['user_id'], directory_applications: ['id'], contact_requests: ['id'], invoice_series: ['firm_id', 'prefix'] };
  const KINDS = ['case', 'client', 'hearing', 'order', 'task', 'doc', 'invoice', 'deadline', 'watch', 'log', 'limitation'];
  const DEF = {
    firms: () => ({ id: uuid(), city: '', address: '', gstin: '', state: {}, created_by: uid(), created_at: new Date().toISOString() }),
    members: () => ({ id: uuid(), user_id: null, name: '', title: '', role: 'Advocate', phone: '', status: 'Invited', is_owner: false, created_at: new Date().toISOString() + String(S.members.length).padStart(4, '0') }),
    records: () => ({ updated_at: new Date().toISOString(), updated_by: uid() }),
    user_state: () => ({ user_id: uid(), data: {}, updated_at: new Date().toISOString() }),
    contact_requests: () => ({ id: uuid(), created_at: new Date().toISOString() }),
    directory_applications: () => ({ id: 'LS-DIR-' + Math.floor(Math.random() * 1e5), status: 'pending', note: '', created_at: new Date().toISOString() })
  };
  /* sel: may the caller see the row. ins/upd(new, old): may it write (throws Refuse). del(row): visible to delete. */
  const POL = {
    firms: { sel: r => isMember(r.id), upd: r => isMember(r.id) },
    members: { sel: r => isMember(r.firm_id) || r.user_id === uid(), ins: r => isOwner(r.firm_id) && r.user_id == null && !r.is_owner, upd: r => isOwner(r.firm_id), del: r => isOwner(r.firm_id) && !r.is_owner },
    records: { sel: r => isMember(r.firm_id), ins: r => isMember(r.firm_id), upd: r => isMember(r.firm_id), del: r => isMember(r.firm_id) },
    user_state: { sel: r => r.user_id === uid() && isMember(r.firm_id), ins: r => r.user_id === uid() && isMember(r.firm_id), upd: r => r.user_id === uid() && isMember(r.firm_id), del: r => r.user_id === uid() && isMember(r.firm_id) },
    subscriptions: { sel: r => isMember(r.firm_id) }, payments: { sel: r => isMember(r.firm_id) }, notifications: { sel: r => isMember(r.firm_id) },
    platform_admins: { sel: r => r.user_id === uid() },
    directory_applications: { sel: () => isAdmin(), ins: () => true, upd: () => isAdmin() },
    contact_requests: { sel: () => isAdmin(), ins: () => true },
    invoice_series: {}
  };
  /* ---------- triggers (0001 touch_record, 0004 bulk guard, 0006 roles / seats / invoices) ---------- */
  const paidOf = d => [!!(d && d.paid), (d && d.paidOn) || ''];
  function beforeWrite(t, nw, old) {
    if (t === 'records') {
      if (!KINDS.includes(nw.kind)) refuse('new row for relation "records" violates check constraint "records_kind_check"', '23514');
      nw.updated_at = new Date().toISOString(); nw.updated_by = uid();
      if (!v6() || !uid()) return;
      const role = memberRole(nw.firm_id);
      if (role === 'viewer' && nw.kind !== 'log') refuse('Your role in this firm is read-only.');
      if (nw.kind === 'invoice') {
        if (role === 'clerk' || role === 'viewer') refuse('Your role cannot create or change invoices.');
        const was = old ? paidOf(old.data) : [false, ''], now = paidOf(nw.data);
        if ((was[0] !== now[0] || (old && was[1] !== now[1])) && !['owner', 'partner'].includes(role)) refuse('Only the firm owner or a partner can mark an invoice paid or unpaid.');
      }
    }
    if (t === 'members' && v6() && uid()) {
      if (old) {
        ['firm_id', 'user_id', 'email', 'is_owner'].forEach(k => { if (JSON.stringify(old[k]) !== JSON.stringify(nw[k])) refuse('Only the role, status, name and title of a member can be changed.'); });
        if (old.is_owner && nw.status !== 'Active') refuse('The firm owner cannot be suspended or set back to invited.');
        if (old.status === 'Suspended' && nw.status !== 'Suspended') seatCheck(nw.firm_id, nw.id);
      } else seatCheck(nw.firm_id, null);
    }
  }
  function seatCheck(f, except) { const n = S.members.filter(m => m.firm_id === f && m.id !== except && (m.status === 'Active' || m.status === 'Invited')).length, max = seats(f); if (n >= max) refuse(`Your plan allows ${max} user${max === 1 ? '' : 's'} (active and invited). Remove a member or choose a bigger plan.`, 'P0001'); }
  function beforeDelete(t, row) {
    if (t === 'records' && v6() && uid()) { const role = memberRole(row.firm_id);
      if (row.kind === 'invoice' && !['owner', 'partner'].includes(role)) refuse('Only the firm owner or a partner can delete invoices.');
      if (role === 'viewer' && row.kind !== 'log') refuse('Your role in this firm is read-only.'); }
  }
  function afterDeleteStatement(t, rows) {
    if (t !== 'records' || !uid()) return; const by = {};
    rows.filter(r => r.kind !== 'log').forEach(r => { by[r.firm_id] = (by[r.firm_id] || 0) + 1; });
    Object.keys(by).forEach(f => { if (by[f] > 100 && !isOwner(f)) refuse('Only the firm owner can delete more than 100 records at once.'); });
  }

  /* ---------- PostgREST-like query builder ---------- */
  const keyOf = (t, r) => PK[t].map(k => String(r[k])).join('|');
  function project(r, cols) { if (!cols || cols.trim() === '*') return clone(r); const o = {}; cols.split(',').map(c => c.trim()).filter(Boolean).forEach(c => { o[c] = clone(r[c]); }); return o; }
  class Q {
    constructor(t) { this.t = t; this.op = 'select'; this.f = []; this.ord = []; this.rng = null; this.lim = null; this.one = ''; this.ret = null; }
    select(cols) { if (this.op === 'select') this.cols = cols || '*'; else this.ret = cols || '*'; return this; }
    insert(rows) { this.op = 'insert'; this.rows = [].concat(rows); return this; }
    upsert(rows, o) { this.op = 'upsert'; this.rows = [].concat(rows); this.opt = o || {}; return this; }
    update(v) { this.op = 'update'; this.vals = v; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.f.push(r => String(r[c]) === String(v)); return this; }
    neq(c, v) { this.f.push(r => String(r[c]) !== String(v)); return this; }
    in(c, a) { const s = new Set(a.map(String)); this.f.push(r => s.has(String(r[c]))); return this; }
    gte(c, v) { this.f.push(r => r[c] >= v); return this; }
    lte(c, v) { this.f.push(r => r[c] <= v); return this; }
    order(c, o) { this.ord.push([c, !(o && o.ascending === false)]); return this; }
    range(a, b) { this.rng = [a, b]; return this; }
    limit(n) { this.lim = n; return this; }
    single() { this.one = 'single'; return this; }
    maybeSingle() { this.one = 'maybe'; return this; }
    then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
    rowsVisible(pol) { return (S[this.t] || []).filter(r => this.f.every(fn => fn(r)) && (!pol || pol(r))); }
    run() {
      load(); const t = this.t, P = POL[t] || {};
      if (!S[t]) return { data: null, error: E(`relation "public.${t}" does not exist`, '42P01', 404) };
      log(this.op, t);
      try {
        if (this.op === 'select') {
          let rows = this.rowsVisible(P.sel || (() => false));
          if (this.ord.length) rows = rows.slice().sort((a, b) => { for (const [c, asc] of this.ord) { const x = a[c], y = b[c]; if (x < y) return asc ? -1 : 1; if (x > y) return asc ? 1 : -1; } return 0; });
          if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
          if (this.lim != null) rows = rows.slice(0, this.lim);
          rows = rows.slice(0, PAGE_CAP).map(r => project(r, this.cols));
          return this.finish(rows);
        }
        if (this.op === 'insert' || this.op === 'upsert') {
          const out = [], staged = [];
          for (const r0 of this.rows) {
            const r = Object.assign({}, DEF[t] ? DEF[t]() : {}, clone(r0)), k = keyOf(t, r), i = S[t].findIndex(x => keyOf(t, x) === k);
            if (i >= 0 && this.op === 'insert') return { data: null, error: E('duplicate key value violates unique constraint "' + t + '_pkey"', '23505', 409) };
            if (t === 'members' && S.members.some(m => m.firm_id === r.firm_id && m.email === r.email && m.id !== r.id)) return { data: null, error: E('duplicate key value violates unique constraint "members_firm_id_email_key"', '23505', 409) };
            if (i >= 0) { const old = S[t][i], nw = Object.assign({}, old, clone(r0));
              if (!(P.upd && P.upd(old))) return { data: null, error: RLS(t) };
              beforeWrite(t, nw, old); if (!P.upd(nw)) return { data: null, error: RLS(t) }; staged.push([i, nw]); out.push(nw); }
            else { if (!(P.ins && P.ins(r))) return { data: null, error: RLS(t) }; beforeWrite(t, r, null); staged.push([-1, r]); out.push(r); }
          }
          staged.forEach(([i, r]) => { if (i >= 0) S[t][i] = r; else S[t].push(r); }); save();
          return this.finish(this.ret ? out.map(r => project(r, this.ret)) : null);
        }
        if (this.op === 'update') {
          const rows = this.rowsVisible(P.upd || (() => false)), out = [];
          for (const old of rows) { const nw = Object.assign({}, old, clone(this.vals)); beforeWrite(t, nw, old); if (!P.upd(nw)) return { data: null, error: RLS(t) }; out.push([old, nw]); }
          out.forEach(([old, nw]) => { S[t][S[t].indexOf(old)] = nw; }); save();
          return this.finish(this.ret ? out.map(x => project(x[1], this.ret)) : null);
        }
        if (this.op === 'delete') {
          const rows = this.rowsVisible(P.del || (() => false));
          rows.forEach(r => beforeDelete(t, r)); afterDeleteStatement(t, rows);
          S[t] = S[t].filter(r => !rows.includes(r)); save();
          return this.finish(this.ret ? rows.map(r => project(r, this.ret)) : null);
        }
      } catch (e) { if (e instanceof Refuse) { load(); return { data: null, error: e.e }; } throw e; }
    }
    finish(rows) {
      if (this.one && Array.isArray(rows)) {
        if (rows.length === 1) return { data: rows[0], error: null };
        if (!rows.length && this.one === 'maybe') return { data: null, error: null };
        return { data: null, error: E('JSON object requested, multiple (or no) rows returned', 'PGRST116', 406) };
      }
      return { data: rows, error: null };
    }
  }

  /* ---------- RPC ---------- */
  const RPC = {
    is_member: a => isMember(a.f), is_owner: a => isOwner(a.f), is_platform_admin: () => isAdmin(),
    member_role: a => v6() ? memberRole(a.f) : undefined,
    my_firms() {
      const u = me(); if (!u) refuse('not signed in', 'P0001');
      S.members.forEach(m => { if (m.email === u.email && m.user_id == null && m.status === 'Invited') { m.user_id = u.id; m.status = 'Active'; } });
      return S.members.filter(m => m.user_id === u.id && m.status === 'Active').sort((a, b) => a.created_at.localeCompare(b.created_at)).map(m => ({ firm_id: m.firm_id, firm_name: (S.firms.find(f => f.id === m.firm_id) || {}).name, role: m.role, is_owner: m.is_owner }));
    },
    create_firm(a) {
      const u = me(); if (!u) refuse('not signed in', 'P0001');
      if (S.members.some(m => m.user_id === u.id && m.is_owner)) refuse('you already own a firm', 'P0001');
      const f = Object.assign(DEF.firms(), { name: String(a.p_name).trim(), city: String(a.p_city).trim(), address: String(a.p_address).trim() });
      S.firms.push(f);
      S.members.push(Object.assign(DEF.members(), { firm_id: f.id, user_id: u.id, email: u.email, name: String(a.p_user_name).trim(), title: (/(Partner|Associate|Advocate)/.test(a.p_role) ? 'Adv. ' : '') + String(a.p_user_name).trim(), role: a.p_role, status: 'Active', is_owner: true }));
      if (!S.platform_admins.length) S.platform_admins.push({ user_id: u.id });
      return f.id;
    },
    update_my_profile(a) { const m = memberRow(a.f); if (!m) refuse('Your membership of this firm was not found, so the profile was not saved.', 'P0001'); Object.assign(m, { name: String(a.p_name).trim().slice(0, 120), title: String(a.p_title).trim().slice(0, 140), phone: String(a.p_phone).trim().slice(0, 30) }); return null; },
    erase_firm_data(a) {
      if (!isOwner(a.f)) refuse('Only the firm owner can delete the firm\'s data.');
      const n = S.records.filter(r => r.firm_id === a.f).length; S.records = S.records.filter(r => r.firm_id !== a.f); S.user_state = S.user_state.filter(r => r.firm_id !== a.f); S.notifications = S.notifications.filter(r => r.firm_id !== a.f);
      const f = S.firms.find(x => x.id === a.f); if (f) f.state = v6() && f.state && f.state.profile ? { profile: f.state.profile } : {};
      return n;
    },
    directory_decide(a) { if (!isAdmin()) refuse('not allowed', 'P0001'); const x = S.directory_applications.find(y => y.id === a.p_ref); if (x) Object.assign(x, { status: a.p_status, note: a.p_note || '' }); return null; },
    next_invoice_no(a) {
      if (!v6()) return undefined;
      const role = memberRole(a.f); if (!['owner', 'partner', 'associate'].includes(role)) refuse('Your role cannot raise invoices.');
      const p = String(a.p_prefix || ''); if (!/^[A-Za-z0-9/_-]{1,30}$/.test(p)) refuse('bad prefix', 'P0001');
      const max = Math.max(0, ...S.records.filter(r => r.firm_id === a.f && r.kind === 'invoice' && String(r.data.no || '').startsWith(p) && /^\d{1,9}$/.test(String(r.data.no).slice(p.length))).map(r => +String(r.data.no).slice(p.length)));
      let s = S.invoice_series.find(x => x.firm_id === a.f && x.prefix === p); if (!s) { s = { firm_id: a.f, prefix: p, last: 0 }; S.invoice_series.push(s); }
      s.last = Math.max(s.last, max) + 1; return s.last;
    }
  };
  async function rpc(name, args) {
    load(); log('rpc', name);
    const fn = RPC[name];
    try { const v = fn ? fn(args || {}) : undefined; if (v === undefined) return { data: null, error: E(`Could not find the function public.${name} in the schema cache`, 'PGRST202', 404) }; save(); return { data: v, error: null }; }
    catch (e) { if (e instanceof Refuse) { load(); return { data: null, error: e.e }; } throw e; }
  }

  /* ---------- Auth ---------- */
  function session() { const u = me(); return u ? { access_token: 'fake.' + u.id, token_type: 'bearer', user: { id: u.id, email: u.email, user_metadata: { full_name: u.name || '' }, app_metadata: { provider: u.provider || 'google' } } } : null; }
  function userFor(email, name, provider) { email = String(email).trim().toLowerCase(); let u = Object.values(S.users).find(x => x.email === email); if (!u) { u = { id: uuid(), email, name: name || '', provider }; S.users[u.id] = u; } else if (name && !u.name) u.name = name; return u; }
  function decodeJwt(t) { try { const b = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(atob(b).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))); } catch (e) { return null; } }
  const auth = {
    async getSession() { load(); return { data: { session: session() }, error: null }; },
    async signInWithIdToken({ token }) { load(); const p = decodeJwt(token); if (!p || !p.email) return { data: { user: null, session: null }, error: E('Invalid ID token', 'invalid_token', 400) }; const u = userFor(p.email, p.name, 'google'); localStorage.setItem(SKEY, u.id); save(); return { data: { user: session().user, session: session() }, error: null }; },
    async signInWithOtp({ email }) { load(); S.otp[String(email).toLowerCase()] = '123456'; save(); return { data: {}, error: null }; },
    async verifyOtp({ email, token }) { load(); const e = String(email).toLowerCase(); if (S.otp[e] !== token) return { data: { user: null, session: null }, error: E('Token has expired or is invalid', 'otp_expired', 403) }; delete S.otp[e]; const u = userFor(e, '', 'email'); localStorage.setItem(SKEY, u.id); save(); return { data: { user: session().user, session: session() }, error: null }; },
    async signOut() { localStorage.removeItem(SKEY); return { error: null }; },
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; }
  };

  /* ---------- Storage (bucket 'documents', path <firm_id>/<doc_id>/<file>) ---------- */
  const folder = p => String(p).split('/')[0];
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  function bucket(name) {
    const err = (m, s) => ({ data: null, error: Object.assign(new Error(m), { statusCode: String(s || 400) }) });
    return {
      async upload(path, file, o) { load(); log('storage.upload', path); if (name !== 'documents') return err('Bucket not found', 404); if (!isMember(folder(path)) || (v6() && memberRole(folder(path)) === 'viewer')) return err('new row violates row-level security policy', 403);
        if (S.storage[path] && !(o && o.upsert)) return err('The resource already exists', 409);
        const data = await b64(file); load(); S.storage[path] = { size: file.size, type: (o && o.contentType) || file.type || 'application/octet-stream', data, owner: uid(), created: new Date().toISOString() }; save(); return { data: { path }, error: null }; },
      async download(path) { load(); const o = S.storage[path]; if (!o || !isMember(folder(path))) return err('Object not found', 404); const bin = atob(o.data), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return { data: new Blob([u], { type: o.type }), error: null }; },
      async remove(paths) { load(); log('storage.remove', paths.join(',')); const out = [];
        paths.forEach(p => { const f = folder(p); if (!S.storage[p] || !isMember(f)) return; if (v6() && !['owner', 'partner'].includes(memberRole(f))) return; delete S.storage[p]; out.push({ name: p }); }); save(); return { data: out, error: null }; },
      async list(prefix, o) { load(); const pre = String(prefix || '').replace(/\/$/, ''); if (!isMember(folder(pre))) return { data: [], error: null };
        const seen = new Map(); Object.keys(S.storage).filter(p => p.startsWith(pre + '/')).forEach(p => { const rest = p.slice(pre.length + 1), i = rest.indexOf('/'); if (i < 0) seen.set(rest, { name: rest, id: p, metadata: { size: S.storage[p].size } }); else if (!seen.has(rest.slice(0, i))) seen.set(rest.slice(0, i), { name: rest.slice(0, i), id: null }); });
        const all = [...seen.values()], off = (o && o.offset) || 0, lim = (o && o.limit) || 100; return { data: all.slice(off, off + lim), error: null }; },
      async createSignedUrl(path) { const r = await this.download(path); return r.error ? r : { data: { signedUrl: URL.createObjectURL(r.data) }, error: null }; }
    };
  }

  /* ---------- Edge functions ---------- */
  async function invoke(name, o) {
    load(); log('fn', name); const body = (o && o.body) || {};
    const fail = (msg, status) => ({ data: null, error: Object.assign(new Error('Edge Function returned a non-2xx status code'), { context: { json: async () => ({ error: msg }), status } }) });
    if (!me()) return fail('Sign in again.', 401);
    if (name === 'notify') return { data: { results: [{ channel: 'email', ok: true }] }, error: null };
    if (name === 'court-status') return { data: { status: 'Listed', nextDate: '', title: 'Fetched case ' + body.cnr }, error: null };
    if (name === 'razorpay-order') return fail('Payments are not configured yet.', 501);
    if (name === 'razorpay-verify') return fail('Payments are not configured yet.', 501);
    return fail('Function not found', 404);
  }

  window.supabase = { createClient: () => ({ auth, from: t => new Q(t), rpc, storage: { from: bucket }, functions: { invoke } }) };

  /* ---------- test controls ---------- */
  window.__fakeAdmin = {
    state: () => (load(), S), save: () => save(), reset() { S = blank(); save(); localStorage.removeItem(SKEY); },
    signInAs(email, name) { load(); const u = userFor(email, name, 'google'); localStorage.setItem(SKEY, u.id); save(); return u.id; },
    signOut() { localStorage.removeItem(SKEY); },
    user: () => me(),
    firmOf(email) { load(); const u = Object.values(S.users).find(x => x.email === email); const m = u && S.members.find(x => x.user_id === u.id); return m ? m.firm_id : ''; },
    setSub(firmId, plan, renews, status) { load(); S.subscriptions = S.subscriptions.filter(s => s.firm_id !== firmId); if (plan) S.subscriptions.push({ firm_id: firmId, plan, cycle: 'annual', status: status || 'active', since: today(), renews: renews || '2099-01-01', updated_at: new Date().toISOString() }); save(); },
    setFirm(firmId, patch) { load(); Object.assign(S.firms.find(f => f.id === firmId), patch); save(); },
    setMember(email, patch) { load(); const m = S.members.find(x => x.email === email); Object.assign(m, patch); save(); return m; },
    setOption(k, v) { load(); S[k] = v; save(); },
    records: kind => (load(), S.records.filter(r => !kind || r.kind === kind)),
    rpc: (n, a) => rpc(n, a), from: t => new Q(t), storage: n => bucket(n || 'documents'), roleOf
  };
})();

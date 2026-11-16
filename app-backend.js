/* Legal Staff — Supabase backend. When config.js has supabaseUrl and supabaseKey, the app keeps its data
   on the server (per firm, protected by row level security). Without them it keeps data in the browser. */
(function () {
  'use strict';
  const cfg = window.LS_CONFIG || {};
  const on = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase && window.supabase.createClient);
  /* While the page is being hidden or closed, small requests go out with keepalive so the last save still reaches the server. */
  let hiding = false;
  const kfetch = (u, o) => fetch(u, hiding && o && (!o.body || (typeof o.body === 'string' && o.body.length < 60000)) ? Object.assign({}, o, { keepalive: true }) : o);
  const sb = on ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { global: { fetch: kfetch } }) : null;
  const KIND = { cases: 'case', clients: 'client', hearings: 'hearing', orders: 'order', tasks: 'task', docs: 'doc', invoices: 'invoice', deadlines: 'deadline', lims: 'limitation', watch: 'watch', log: 'log' };
  const USER_KEYS = ['settings', 'notes', 'chats', 'copilot', 'research', 'drafts', 'photo'];
  const PAGE = 1000, LOG_MAX = 300, NEWEST_FIRST = { cases: 1, clients: 1, docs: 1, orders: 1, invoices: 1, lims: 1 };
  let snap = {}, firmSnap = '', userSnap = '', teamSnap = '', meSnap = '', firmId = '', uid = '', busy = null, again = false;
  /* Profile photo: photoCol is true once the members table has the photo column (migration 0020); mePhoto is the caller's photo as stored there. */
  let photoCol = false, mePhoto = '';
  const fail = (e, what) => { const m = (e && (e.message || e.error_description || e.error)) || String(e); throw new Error(what ? what + ': ' + m : m); };
  const ok = r => { if (r.error) fail(r.error); return r.data; };
  /* PostgREST returns at most 1,000 rows per request, so read in pages until a page comes back empty. q() must be stably ordered. */
  async function pages(q) { const out = []; for (let from = 0; ; ) { const rows = ok(await q().range(from, from + PAGE - 1)) || []; if (!rows.length) return out; out.push(...rows); from += rows.length; } }
  const changed = (rows, what) => { if (!rows || !rows.length) throw new Error(what + ' was not saved on the server. You may not have permission to change it.'); return rows; };
  async function delIds(kind, ids) { for (let i = 0; i < ids.length; i += 200) ok(await sb.from('records').delete().eq('firm_id', firmId).eq('kind', kind).in('id', ids.slice(i, i + 200))); }
  /* Same order on every device: by the time the record was first saved, then id. Lists that the app prepends to come newest first. */
  function order(d) { Object.keys(KIND).forEach(c => { if (c === 'log') return d.log.sort((a, b) => String(b.ts).localeCompare(String(a.ts)) || String(b.id).localeCompare(String(a.id))); const s = NEWEST_FIRST[c] ? -1 : 1; d[c].sort((a, b) => s * (String(a.created || '').localeCompare(String(b.created || '')) || String(a.id).localeCompare(String(b.id)))); }); }
  const teamKey = t => JSON.stringify(t.map(u => [u.id, u.email, u.name, u.title, u.role, u.status]));
  const meKey = u => JSON.stringify([u.name, u.title, u.phone]);
  const firmRow = d => ({ name: d.firm.name, city: d.firm.city, address: d.firm.address, gstin: d.firm.gstin, state: { lim: d.lim, agents: d.agents } });
  const userRow = d => Object.fromEntries(USER_KEYS.map(k => [k, d[k]]));
  function take(d) {
    snap = {}; Object.keys(KIND).forEach(c => (d[c] || []).forEach(r => { snap[KIND[c] + '|' + r.id] = JSON.stringify(r); }));
    firmSnap = JSON.stringify(firmRow(d)); userSnap = JSON.stringify(userRow(d)); teamSnap = teamKey(d.team); meSnap = meKey(d.user);
  }
  async function members(d) {
    const rows = ok(await sb.from('members').select('*').eq('firm_id', firmId).order('created_at'));
    d.team = rows.map(m => ({ id: m.id, name: m.name || m.email.split('@')[0], title: m.title || m.name || m.email, role: m.role, email: m.email, status: m.status, owner: m.is_owner, userId: m.user_id, photo: m.photo || '' }));
    if (rows.length) photoCol = 'photo' in rows[0];
    const me = rows.find(m => m.user_id === uid);
    if (me) { d.user = { name: me.name, title: me.title, role: me.role, email: me.email, phone: me.phone }; d.isOwner = me.is_owner; mePhoto = me.photo || ''; }
  }
  async function pushPhoto(d) {
    const p = d.photo || ''; ok(await sb.rpc('set_my_photo', { f: firmId, p_photo: p })); mePhoto = p;
    const row = d.team.find(x => x.userId === uid); if (row) row.photo = p;
  }
  async function subscription(d) {
    const s = ok(await sb.from('subscriptions').select('*').eq('firm_id', firmId).maybeSingle());
    const pays = ok(await sb.from('payments').select('plan,cycle,amount_paise,paid_at').eq('firm_id', firmId).eq('status', 'paid').order('paid_at', { ascending: false }));
    const month = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
    const au = (await sb.from('ai_usage').select('used').eq('firm_id', firmId).eq('month', month).maybeSingle()).data;
    d.sub = { aiUsed: au ? au.used : 0, plan: s ? s.plan : '', cycle: s ? s.cycle : 'annual', status: s ? s.status : '', since: s ? s.since : '', renews: s ? s.renews : '', trialEnds: s && s.trial_ends ? s.trial_ends : '', history: pays.map(p => ({ plan: p.plan + ' · ' + (p.cycle === 'annual' ? 'Annual' : 'Monthly'), total: window.LS.inr(p.amount_paise / 100), date: (p.paid_at || '').slice(0, 10) })) };
  }

  const B = {
    on, client: sb,
    async session() { const s = ok(await sb.auth.getSession()).session; uid = s ? s.user.id : ''; return s; },
    async signInGoogle(token, nonce) { const d = ok(await sb.auth.signInWithIdToken({ provider: 'google', token, nonce })); uid = d.user.id; return d.session; },
    /* Email sign-in: Supabase emails a one-time code (and a sign-in link that opens /app). */
    async sendOtp(email) { ok(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + '/app' } })); },
    async verifyOtp(email, token) { const d = ok(await sb.auth.verifyOtp({ email, token, type: 'email' })); uid = d.user.id; return d.session; },
    async signOut() { firmId = ''; uid = ''; snap = {}; try { await sb.auth.signOut(); } catch (e) {} },
    async firms() { return ok(await sb.rpc('my_firms')); },
    async createFirm(v) { return ok(await sb.rpc('create_firm', { p_name: v.firm, p_city: v.city, p_address: v.address || v.city, p_user_name: v.name, p_role: v.role })); },
    /* Builds the app's working data for one firm. */
    async load(id, session) {
      firmId = id; const d = window.LS.seed(); d.firmId = id; d.session = { email: session.user.email, provider: (session.user.app_metadata || {}).provider || 'google' };
      const [firm, recs, us] = await Promise.all([sb.from('firms').select('*').eq('id', id).single(), pages(() => sb.from('records').select('kind,id,data').eq('firm_id', id).order('kind').order('id')), sb.from('user_state').select('data').eq('firm_id', id).eq('user_id', uid).maybeSingle()]);
      const f = ok(firm); d.firm = { name: f.name, city: f.city, address: f.address, gstin: f.gstin };
      if (f.state && f.state.lim) d.lim = f.state.lim; if (f.state && Array.isArray(f.state.agents) && f.state.agents.length) d.agents = f.state.agents;
      const by = {}; Object.keys(KIND).forEach(c => { by[KIND[c]] = d[c] = []; });
      recs.forEach(r => { if (by[r.kind]) by[r.kind].push(Object.assign({}, r.data, { id: r.id })); });
      order(d);
      const u = ok(us); if (u && u.data) USER_KEYS.forEach(k => { if (u.data[k] != null) d[k] = k === 'settings' ? Object.assign(d.settings, u.data[k]) : u.data[k]; });
      /* A calculation kept in the older firm state (one object in firms.state.lim) becomes a 'limitation' record; the next sync stores it and clears the old key. */
      const legacy = !!(d.lim && d.lim.judgment); window.LS.migrate(d);
      await members(d); await subscription(d);
      /* The member row is what the team sees. A device that has no photo of its own yet takes it from there; a photo saved before the column existed is sent up now. */
      if (photoCol) { if (!(u && u.data && 'photo' in u.data)) d.photo = mePhoto; else if ((d.photo || '') !== mePhoto) await pushPhoto(d).catch(() => {}); }
      take(d);
      if (legacy) { delete snap['limitation|llegacy']; delete snap['deadline|dlllegacy']; firmSnap = ''; d.migrated = true; }
      /* Keep only the newest activity entries so the log cannot crowd out practice records. */
      const old = d.log.slice(LOG_MAX); d.log = d.log.slice(0, LOG_MAX);
      if (old.length) { try { await delIds('log', old.map(x => x.id)); old.forEach(x => { delete snap['log|' + x.id]; }); } catch (e) {} }
      return d;
    },
    /* Sends whatever changed since the last sync. Returns true if the team list was refreshed from the server. */
    sync(d) {
      if (!on || !firmId) return Promise.resolve(false);
      if (busy) { again = true; return busy; }
      busy = (async () => {
        let refreshed = false;
        try {
          const now = {}, up = [], del = {}, stamp = new Date().toISOString();
          if (d.log && d.log.length > LOG_MAX) d.log.length = LOG_MAX;
          /* Profile edits are read now: the team refresh below reloads d.user from the server. */
          const meWant = meKey(d.user) !== meSnap ? { name: d.user.name, title: d.user.title, phone: d.user.phone || '' } : null;
          Object.keys(KIND).forEach(c => (d[c] || []).forEach(r => { if (!r.id) r.id = window.LS.uid(KIND[c][0]); const k = KIND[c] + '|' + r.id; if (c !== 'log' && !r.created && !(k in snap)) r.created = stamp; const s = JSON.stringify(r); now[k] = s; if (snap[k] !== s) up.push({ firm_id: firmId, kind: KIND[c], id: r.id, data: r }); }));
          Object.keys(snap).forEach(k => { if (!(k in now)) { const i = k.indexOf('|'); (del[k.slice(0, i)] = del[k.slice(0, i)] || []).push(k.slice(i + 1)); } });
          for (let i = 0; i < up.length; i += 200) ok(await sb.from('records').upsert(up.slice(i, i + 200)));
          for (const kind of Object.keys(del)) await delIds(kind, del[kind]);
          snap = now;
          const fr = firmRow(d), fs = JSON.stringify(fr); if (fs !== firmSnap) { changed(ok(await sb.from('firms').update(fr).eq('id', firmId).select('id')), 'The firm profile'); firmSnap = fs; }
          const ur = userRow(d), us = JSON.stringify(ur); if (us !== userSnap) { ok(await sb.from('user_state').upsert({ user_id: uid, firm_id: firmId, data: ur, updated_at: new Date().toISOString() })); userSnap = us; }
          if (photoCol && (d.photo || '') !== mePhoto) await pushPhoto(d);
          if (teamKey(d.team) !== teamSnap) {
            const before = JSON.parse(teamSnap || '[]'), ids = new Set(d.team.map(u => u.id));
            try {
              for (const u of d.team) { const was = before.find(x => x[0] === u.id);
                if (!was) { const em = String(u.email).trim().toLowerCase(); ok(await sb.from('members').insert({ firm_id: firmId, email: em, name: u.name, title: u.title, role: u.role }));
                  B.fn('notify', { action: 'invite', firm_id: firmId, email: em }).catch(() => {}); }   // invitation email; never blocks saving
                else if (was[4] !== u.role || was[5] !== u.status) changed(ok(await sb.from('members').update({ role: u.role, status: u.status, title: u.title }).eq('id', u.id).select('id')), 'The change to ' + (u.name || u.email)); }
              for (const x of before) if (!ids.has(x[0])) ok(await sb.from('members').delete().eq('id', x[0]));
            } finally { await members(d); teamSnap = teamKey(d.team); meSnap = meKey(d.user); refreshed = true; }
          }
          /* The profile function changes only the caller's own row; read the row back to be sure it changed. */
          if (meWant) {
            try { ok(await sb.rpc('update_my_profile', { f: firmId, p_name: meWant.name, p_title: meWant.title, p_phone: meWant.phone })); }
            finally { await members(d); teamSnap = teamKey(d.team); meSnap = meKey(d.user); refreshed = true; }
            if (d.user.name !== meWant.name || d.user.title !== meWant.title || (d.user.phone || '') !== meWant.phone) throw new Error('Your profile was not saved on the server.');
          }
        } finally { busy = null; }
        if (again) { again = false; return (await B.sync(d)) || refreshed; }
        return refreshed;
      })();
      return busy;
    },
    pending: () => !!busy,
    hiding(v) { hiding = !!v; },
    /* Owner only: deletes the firm's stored files and every practice record. Members, the subscription and payment records stay. */
    async eraseFirm(d) {
      if (!d.isOwner) throw new Error('Only the firm owner can delete the firm\'s data.');
      const st = sb.storage.from('documents'), paths = new Set();
      (d.docs || []).forEach(x => { if (x.file) paths.add(B.path(x.id, x.file)); });
      const list = async pre => { const out = []; for (let off = 0; ; off += 1000) { const r = ok(await st.list(pre, { limit: 1000, offset: off })) || []; out.push(...r); if (r.length < 1000) return out; } };
      for (const f of await list(firmId)) { if (f.id) paths.add(firmId + '/' + f.name); else for (const g of await list(firmId + '/' + f.name)) if (g.id) paths.add(firmId + '/' + f.name + '/' + g.name); }
      const all = [...paths]; for (let i = 0; i < all.length; i += 100) ok(await st.remove(all.slice(i, i + 100)));
      /* Files kept in members' Google Drives (encrypted, hidden folder) are deleted too, where that Drive is still connected. */
      for (const x of d.docs || []) if (x.drive) await B.drive.remove(x.drive);
      const r = await sb.rpc('erase_firm_data', { f: firmId });
      if (r.error) {
        if (!(r.error.code === 'PGRST202' || /could not find the function/i.test(r.error.message || ''))) fail(r.error);
        /* Database without migration 0004: delete directly (records are open to members under 0001's policies). */
        ok(await sb.from('records').delete().eq('firm_id', firmId)); ok(await sb.from('user_state').delete().eq('firm_id', firmId).eq('user_id', uid)); ok(await sb.from('firms').update({ state: {} }).eq('id', firmId));
      }
      snap = {}; return all.length;
    },
    /* Enterprise enquiries go to the same table as the website's contact form. */
    async contact(row) { ok(await sb.from('contact_requests').insert(row)); },
    async refreshSub(d) { await subscription(d); },
    /* Owner only: starts (or, while it runs, switches) the firm's 7-day free trial. No payment is taken. */
    async startTrial(d, plan, cycle) { ok(await sb.rpc('start_trial', { f: firmId, p_plan: plan, p_cycle: cycle })); await subscription(d); },
    /* ---- documents ---- */
    path: (docId, name) => firmId + '/' + docId + '/' + String(name).replace(/[^\w.\- ]+/g, '_'),
    async upload(docId, file) { ok(await sb.storage.from('documents').upload(B.path(docId, file.name), file, { upsert: false, contentType: file.type || 'application/octet-stream' })); },
    async download(docId, name) { return ok(await sb.storage.from('documents').download(B.path(docId, name))); },
    async removeFile(docId, name) { try { await sb.storage.from('documents').remove([B.path(docId, name)]); } catch (e) {} },
    /* ---- server functions ---- */
    async fn(name, body) {
      const r = await sb.functions.invoke(name, { body });
      if (r.error) { let msg = r.error.message; try { const j = await r.error.context.json(); if (j && j.error) msg = j.error; } catch (e) {} throw new Error(msg); }
      return r.data;
    },
    /* ---- encrypted storage in the user's own Google Drive (hidden app folder; see supabase/functions/drive) ---- */
    drive: {
      status: () => B.fn('drive', { action: 'status' }),
      connect: code => B.fn('drive', { action: 'connect', code }),
      disconnect: () => B.fn('drive', { action: 'disconnect' }),
      backupNow: () => B.fn('drive', { action: 'backup_now' }),
      backups: () => B.fn('drive', { action: 'backups', firm_id: firmId }).then(r => r.backups || []),
      restore: fileId => B.fn('drive', { action: 'restore', firm_id: firmId, file_id: fileId }),
      /* Sends the file to the server, which encrypts it and stores it in the caller's Drive. Returns { id, user, email }. */
      async upload(docId, file) { const r = await B.fn('drive?action=upload&firm_id=' + encodeURIComponent(firmId) + '&doc_id=' + encodeURIComponent(docId), file); return r.drive; },
      download: drive => B.fn('drive', { action: 'download', firm_id: firmId, drive }),
      remove: drive => B.fn('drive', { action: 'delete', firm_id: firmId, drive }).catch(() => {})
    },
    /* Direct UPI to the operator's account (server function 'upi-pay'), confirmed automatically by Paytm status or bank SMS. */
    upi: {
      config: () => B.fn('upi-pay', { action: 'config' }),
      create: (plan, cycle, gstin, promo) => B.fn('upi-pay', { action: 'create', firm_id: firmId, plan, cycle, gstin, promo: promo || '' }),
      promo: (plan, cycle, promo) => B.fn('upi-pay', { action: 'promo', firm_id: firmId, plan, cycle, promo }),
      status: orderNo => B.fn('upi-pay', { action: 'status', firm_id: firmId, order_no: orderNo })
    },
    /* GST invoices for plan payments (server function 'billing'). */
    billing: {
      list: () => B.fn('billing', { action: 'list', firm_id: firmId }),
      pdf: id => B.fn('billing', { action: 'pdf', firm_id: firmId, invoice_id: id }),
      email: id => B.fn('billing', { action: 'email', firm_id: firmId, invoice_id: id })
    },
    /* Real AI (server function 'ai', Groq): mode 'brain' | 'research' | 'draft'. Resolves to { text, used, limit }. */
    ai: body => B.fn('ai', Object.assign({ firm_id: firmId }, body)),
    notify: () => B.fn('notify', { firm_id: firmId }),
    invite: email => B.fn('notify', { action: 'invite', firm_id: firmId, email: String(email).trim().toLowerCase() }),
    court: cnr => B.fn('court-status', { cnr }),
    /* ---- directory moderation ---- */
    async isAdmin() { return !!ok(await sb.rpc('is_platform_admin')); },
    async queue() { return ok(await sb.from('directory_applications').select('*').order('created_at', { ascending: true })).map(a => Object.assign({}, a, { date: new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) })); },
    async decide(id, status, note) { ok(await sb.rpc('directory_decide', { p_ref: id, p_status: status, p_note: note || '' })); }
  };
  window.LSB = B;
})();

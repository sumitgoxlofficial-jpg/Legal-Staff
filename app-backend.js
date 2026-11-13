/* Legal Staff — Supabase backend. When config.js has supabaseUrl and supabaseKey, the app keeps its data
   on the server (per firm, protected by row level security). Without them it keeps data in the browser. */
(function () {
  'use strict';
  const cfg = window.LS_CONFIG || {};
  const on = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase && window.supabase.createClient);
  const sb = on ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;
  const KIND = { cases: 'case', clients: 'client', hearings: 'hearing', orders: 'order', tasks: 'task', docs: 'doc', invoices: 'invoice', deadlines: 'deadline', watch: 'watch', log: 'log' };
  const USER_KEYS = ['settings', 'notes', 'chats', 'copilot', 'research', 'drafts'];
  let snap = {}, firmSnap = '', userSnap = '', teamSnap = '', meSnap = '', firmId = '', uid = '', busy = null, again = false;
  const fail = (e, what) => { const m = (e && (e.message || e.error_description || e.error)) || String(e); throw new Error(what ? what + ': ' + m : m); };
  const ok = r => { if (r.error) fail(r.error); return r.data; };
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
    d.team = rows.map(m => ({ id: m.id, name: m.name || m.email.split('@')[0], title: m.title || m.name || m.email, role: m.role, email: m.email, status: m.status, owner: m.is_owner, userId: m.user_id }));
    const me = rows.find(m => m.user_id === uid);
    if (me) { d.user = { name: me.name, title: me.title, role: me.role, email: me.email, phone: me.phone }; d.isOwner = me.is_owner; }
  }
  async function subscription(d) {
    const s = ok(await sb.from('subscriptions').select('*').eq('firm_id', firmId).maybeSingle());
    const pays = ok(await sb.from('payments').select('plan,cycle,amount_paise,paid_at').eq('firm_id', firmId).eq('status', 'paid').order('paid_at', { ascending: false }));
    d.sub = { plan: s ? s.plan : '', cycle: s ? s.cycle : 'annual', since: s ? s.since : '', renews: s ? s.renews : '', history: pays.map(p => ({ plan: p.plan + ' · ' + (p.cycle === 'annual' ? 'Annual' : 'Monthly'), total: window.LS.inr(p.amount_paise / 100), date: (p.paid_at || '').slice(0, 10) })) };
  }

  const B = {
    on, client: sb,
    async session() { const s = ok(await sb.auth.getSession()).session; uid = s ? s.user.id : ''; return s; },
    async signInGoogle(token, nonce) { const d = ok(await sb.auth.signInWithIdToken({ provider: 'google', token, nonce })); uid = d.user.id; return d.session; },
    async signOut() { firmId = ''; uid = ''; snap = {}; try { await sb.auth.signOut(); } catch (e) {} },
    async firms() { return ok(await sb.rpc('my_firms')); },
    async createFirm(v) { return ok(await sb.rpc('create_firm', { p_name: v.firm, p_city: v.city, p_address: v.address || v.city, p_user_name: v.name, p_role: v.role })); },
    /* Builds the app's working data for one firm. */
    async load(id, session) {
      firmId = id; const d = window.LS.seed(); d.firmId = id; d.session = { email: session.user.email, provider: 'google' };
      const [firm, recs, us] = await Promise.all([sb.from('firms').select('*').eq('id', id).single(), sb.from('records').select('kind,id,data,updated_at').eq('firm_id', id).order('updated_at', { ascending: false }).limit(20000), sb.from('user_state').select('data').eq('firm_id', id).eq('user_id', uid).maybeSingle()]);
      const f = ok(firm); d.firm = { name: f.name, city: f.city, address: f.address, gstin: f.gstin };
      if (f.state && f.state.lim) d.lim = f.state.lim; if (f.state && Array.isArray(f.state.agents) && f.state.agents.length) d.agents = f.state.agents;
      const by = {}; Object.keys(KIND).forEach(c => { by[KIND[c]] = d[c] = []; });
      ok(recs).forEach(r => { if (by[r.kind]) by[r.kind].push(Object.assign({}, r.data, { id: r.id })); });
      d.log.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
      const u = ok(us); if (u && u.data) USER_KEYS.forEach(k => { if (u.data[k] != null) d[k] = k === 'settings' ? Object.assign(d.settings, u.data[k]) : u.data[k]; });
      await members(d); await subscription(d); take(d); return d;
    },
    /* Sends whatever changed since the last sync. Returns true if the team list was refreshed from the server. */
    sync(d) {
      if (!on || !firmId) return Promise.resolve(false);
      if (busy) { again = true; return busy; }
      busy = (async () => {
        let refreshed = false;
        try {
          const now = {}, up = [], del = {};
          Object.keys(KIND).forEach(c => (d[c] || []).forEach(r => { if (!r.id) r.id = window.LS.uid(KIND[c][0]); const k = KIND[c] + '|' + r.id, s = JSON.stringify(r); now[k] = s; if (snap[k] !== s) up.push({ firm_id: firmId, kind: KIND[c], id: r.id, data: r }); }));
          Object.keys(snap).forEach(k => { if (!(k in now)) { const i = k.indexOf('|'); (del[k.slice(0, i)] = del[k.slice(0, i)] || []).push(k.slice(i + 1)); } });
          for (let i = 0; i < up.length; i += 200) ok(await sb.from('records').upsert(up.slice(i, i + 200)));
          for (const kind of Object.keys(del)) ok(await sb.from('records').delete().eq('firm_id', firmId).eq('kind', kind).in('id', del[kind]));
          snap = now;
          const fr = firmRow(d), fs = JSON.stringify(fr); if (fs !== firmSnap) { ok(await sb.from('firms').update(fr).eq('id', firmId)); firmSnap = fs; }
          const ur = userRow(d), us = JSON.stringify(ur); if (us !== userSnap) { ok(await sb.from('user_state').upsert({ user_id: uid, firm_id: firmId, data: ur, updated_at: new Date().toISOString() })); userSnap = us; }
          if (meKey(d.user) !== meSnap) { ok(await sb.rpc('update_my_profile', { f: firmId, p_name: d.user.name, p_title: d.user.title, p_phone: d.user.phone || '' })); meSnap = meKey(d.user); refreshed = true; }
          if (teamKey(d.team) !== teamSnap) {
            const before = JSON.parse(teamSnap || '[]'), ids = new Set(d.team.map(u => u.id));
            try {
              for (const u of d.team) { const was = before.find(x => x[0] === u.id);
                if (!was) ok(await sb.from('members').insert({ firm_id: firmId, email: String(u.email).trim().toLowerCase(), name: u.name, title: u.title, role: u.role }));
                else if (was[4] !== u.role || was[5] !== u.status) ok(await sb.from('members').update({ role: u.role, status: u.status, title: u.title }).eq('id', u.id)); }
              for (const x of before) if (!ids.has(x[0])) ok(await sb.from('members').delete().eq('id', x[0]));
            } finally { await members(d); teamSnap = teamKey(d.team); meSnap = meKey(d.user); refreshed = true; }
          }
        } finally { busy = null; }
        if (again) { again = false; return (await B.sync(d)) || refreshed; }
        return refreshed;
      })();
      return busy;
    },
    pending: () => !!busy,
    async refreshSub(d) { await subscription(d); },
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
    /* Opens Razorpay Checkout for a plan and resolves once the server has verified the payment. */
    async checkout(d, plan, cycle, gstin) {
      const o = await B.fn('razorpay-order', { firm_id: firmId, plan, cycle, gstin });
      if (!window.Razorpay) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load Razorpay Checkout.')); document.head.appendChild(s); });
      const paid = await new Promise((res, rej) => { const rz = new window.Razorpay({ key: o.key_id, order_id: o.order_id, amount: o.amount, currency: o.currency, name: 'Legal Staff', description: plan + ' plan · ' + (cycle === 'annual' ? 'Annual' : 'Monthly'), prefill: { email: o.email, name: d.user.name, contact: d.user.phone || '' }, notes: { firm: d.firm.name }, theme: { color: '#0A0A0A' }, handler: res, modal: { ondismiss: () => rej(new Error('Payment was cancelled.')) } }); rz.on('payment.failed', e => rej(new Error((e.error && e.error.description) || 'The payment failed.'))); rz.open(); });
      await B.fn('razorpay-verify', paid); await subscription(d);
    },
    notify: () => B.fn('notify', { firm_id: firmId }),
    court: cnr => B.fn('court-status', { cnr }),
    /* ---- directory moderation ---- */
    async isAdmin() { return !!ok(await sb.rpc('is_platform_admin')); },
    async queue() { return ok(await sb.from('directory_applications').select('*').order('created_at', { ascending: true })).map(a => Object.assign({}, a, { date: new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) })); },
    async decide(id, status, note) { ok(await sb.rpc('directory_decide', { p_ref: id, p_status: status, p_note: note || '' })); }
  };
  window.LSB = B;
})();

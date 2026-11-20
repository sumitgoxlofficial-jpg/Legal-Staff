/* Legal Staff — Advocate Partner Network: landing hydration, registration, sign-in and the partner portal.
   Every rule lives in the database (migration 0039). This file only calls the partner_* functions as the signed-in user and draws the results;
   it holds no secrets and makes no decisions about money, eligibility or attribution. */
(function () {
  'use strict';
  var cfg = window.LS_CONFIG || {}, view = document.body.getAttribute('data-pview');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var inr = function (p) { return '₹' + (Number(p || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var dt = function (v) { if (!v) return ''; var d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }); };
  var STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];
  var SOURCES = ['A friend or colleague', 'Social media', 'A WhatsApp group', 'An existing partner', 'My law college', 'Search engine', 'Other'];
  var CHIP = { approved: 'good', verified: 'good', paid: 'good', valid: 'good', eligible: 'good', payable: 'good', applied: '', under_review: 'warn', pending: 'warn', info: 'warn', requested: 'warn', processing: 'warn', pending_payment: 'warn', pending_verification: 'warn', pending_attribution: 'warn', on_hold: 'warn', suspended: 'bad', terminated: 'bad', rejected: 'bad', reversed: 'bad', failed: 'bad', rejected_self: 'bad', rejected_unknown: 'bad', rejected_inactive: 'bad', overridden: 'bad' };
  var chip = function (s) { return '<span class="pn-chip ' + (CHIP[s] || '') + '">' + esc(String(s || '').replace(/_/g, ' ')) + '</span>'; };

  var sb = null;
  if (cfg.supabaseUrl && cfg.supabaseKey && window.supabase && window.supabase.createClient) sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  var errText = function (e) { var m = (e && (e.message || e.error_description)) || 'Something went wrong. Try again.'; return /expired|invalid/i.test(m) && /token|otp|code/i.test(m) ? 'That code is wrong or has expired. Request a new one.' : m; };
  var rpc = function (name, args) { if (!sb) return Promise.reject(new Error('The server is not connected.')); return sb.rpc(name, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); };
  var session = function () { return sb ? sb.auth.getSession().then(function (r) { return r.data && r.data.session; }) : Promise.resolve(null); };
  var busy = function (btn, on, label) { if (!btn) return; btn.disabled = on; if (label) btn.textContent = label; };
  var msg = function (el, text, ok) { if (!el) return; el.className = ok ? 'pn-ok' : 'pn-err'; el.textContent = text; el.hidden = !text; };

  /* ---------- landing: categories are managed by Super Admin, so show the live list when it can be read ---------- */
  function landing() {
    if (!sb) return;
    rpc('partner_public_config').then(function (c) {
      var box = $('#pn-cats');
      if (box && c && c.categories && c.categories.length) box.innerHTML = c.categories.map(function (k) { return '<div class="lg-tile ls-in"><b>' + esc(k.name) + '</b><span>' + esc(k.description) + '</span></div>'; }).join('');
      if (c && c.registration_open === false) document.querySelectorAll('a[href="/partners/register"]').forEach(function (a) { a.setAttribute('aria-disabled', 'true'); a.title = 'Registration is closed at the moment'; });
    }).catch(function () { /* keep the built-in list */ });
    // text that Super Admin has edited replaces the built-in text
    rpc('partner_public_content').then(function (c) {
      if (!c) return;
      var h1 = $('.hero h1'), lead = $('.hero .lead');
      if (c.hero_title && h1) h1.textContent = c.hero_title;
      if (c.hero_lead && lead) lead.textContent = c.hero_lead;
      if (c.steps && $('#pn-steps')) $('#pn-steps').innerHTML = c.steps.map(function (x, i) { return '<li class="ls-in"><span class="pn-n">' + (i + 1) + '</span><div><b>' + esc(x.title) + '</b><p>' + esc(x.text) + '</p></div></li>'; }).join('');
      if (c.benefits && $('#pn-benefits')) $('#pn-benefits').innerHTML = c.benefits.map(function (x) { return '<div class="lg-tile ls-in"><span class="lg-tile-ic">✓</span><b>' + esc(x.title) + '</b><span>' + esc(x.text) + '</span></div>'; }).join('');
      if (c.faq && $('#faq .faq')) $('#faq .faq').innerHTML = c.faq.map(function (x, i) { return '<details class="faq-item ls-in"' + (i === 0 ? ' open' : '') + '><summary><span>' + esc(x.q) + '</span><i aria-hidden="true"></i></summary><div class="faq-a"><p>' + esc(x.a) + '</p></div></details>'; }).join('');
      if (c.rewards_note && $('#pn-rewards')) $('#pn-rewards').innerHTML = '<p><b>How rewards work.</b> ' + esc(c.rewards_note) + '</p>';
    }).catch(function () { /* keep the built-in text */ });
  }

  /* ---------- sign in with Google (same mechanism as the directory: Google's button + Supabase signInWithIdToken, no redirect) ---------- */
  var gsiLoad = null;
  function gsi() {
    if (gsiLoad) return gsiLoad;
    var id = String(cfg.googleClientId || '').trim();
    gsiLoad = new Promise(function (res, rej) {
      if (!id) return rej(new Error('Google sign-in is not switched on yet.'));
      if (window.google && window.google.accounts && window.google.accounts.id) return res(id);
      var sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = function () { res(id); }; sc.onerror = function () { gsiLoad = null; rej(new Error('Could not reach Google. Check your connection and try again.')); };
      document.head.appendChild(sc);
    });
    return gsiLoad;
  }
  function googleButton(el, done, fail) {
    gsi().then(function (id) {
      var bytes = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(bytes);
      var raw = Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(function (h) {
        var hashed = Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        window.google.accounts.id.initialize({ client_id: id, nonce: hashed, callback: function (r) {
          sb.auth.signInWithIdToken({ provider: 'google', token: r.credential, nonce: raw }).then(function (x) { if (x.error) return fail(errText(x.error)); done(x.data.user); }, function (e) { fail(errText(e)); });
        } });
        window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'center', width: Math.max(220, Math.min(380, el.offsetWidth || 340)) });
      });
    }).catch(function (e) { fail(e.message || 'Google sign-in is not available right now.'); });
  }
  /* Google first; the email code stays as a small fallback. */
  function signInPanel(root, opts) {
    root.innerHTML = '<div class="pn-form"><h2>' + esc(opts.title) + '</h2><p class="muted">' + esc(opts.lead) + '</p><div id="pn-g" style="min-height:44px;max-width:380px"></div><div class="pn-err" id="pn-ge" hidden></div>' +
      '<p class="pn-hint"><a href="#" id="pn-use-email">Use an email code instead</a></p></div>';
    googleButton($('#pn-g', root), opts.done, function (m) { msg($('#pn-ge', root), m); });
    $('#pn-use-email', root).onclick = function (e) { e.preventDefault(); otpFlow(root, { title: opts.title, lead: 'We email you a one-time code.', create: opts.create, done: opts.done }); };
  }

  /* ---------- email one-time code (shared by register and sign-in) ---------- */
  function otpFlow(root, opts) {
    root.innerHTML = '<form class="pn-form" id="pn-f1" novalidate><h2>' + esc(opts.title) + '</h2><p class="muted">' + esc(opts.lead) + '</p>' +
      '<label>Email<input type="email" id="pn-email" autocomplete="email" inputmode="email" required></label><div class="pn-err" id="pn-e1" hidden></div>' +
      '<div class="pn-actions"><button class="btn btn-ink" type="submit" id="pn-b1">Send code</button></div></form>' +
      '<form class="pn-form" id="pn-f2" novalidate hidden><h2>Enter your code</h2><p class="muted" id="pn-sent"></p>' +
      '<label>One-time code<input id="pn-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required></label><div class="pn-err" id="pn-e2" hidden></div>' +
      '<div class="pn-actions"><button class="btn btn-ink" type="submit" id="pn-b2">Verify</button><button class="btn btn-line" type="button" id="pn-back">Use a different email</button></div></form>';
    var f1 = $('#pn-f1', root), f2 = $('#pn-f2', root), em = '';
    f1.onsubmit = function (e) {
      e.preventDefault(); em = $('#pn-email', root).value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return msg($('#pn-e1', root), 'Enter a valid email address.');
      if (!sb) return msg($('#pn-e1', root), 'The server is not connected. Try again later.');
      msg($('#pn-e1', root), ''); busy($('#pn-b1', root), true, 'Sending…');
      sb.auth.signInWithOtp({ email: em, options: { shouldCreateUser: opts.create } }).then(function (r) {
        busy($('#pn-b1', root), false, 'Send code');
        if (r.error) return msg($('#pn-e1', root), /signups not allowed|not found/i.test(r.error.message) ? 'No account uses this email. Apply to become a partner first.' : errText(r.error));
        f1.hidden = true; f2.hidden = false; $('#pn-sent', root).textContent = 'We sent a code to ' + em + '. It expires in a few minutes.'; $('#pn-code', root).focus();
      });
    };
    $('#pn-back', root).onclick = function () { f2.hidden = true; f1.hidden = false; };
    f2.onsubmit = function (e) {
      e.preventDefault(); var code = $('#pn-code', root).value.replace(/\s/g, '');
      if (code.length < 6) return msg($('#pn-e2', root), 'Enter the code from your email.');
      msg($('#pn-e2', root), ''); busy($('#pn-b2', root), true, 'Checking…');
      sb.auth.verifyOtp({ email: em, token: code, type: 'email' }).then(function (r) {
        busy($('#pn-b2', root), false, 'Verify');
        if (r.error) return msg($('#pn-e2', root), errText(r.error));
        opts.done(r.data.user);
      });
    };
  }

  /* ---------- registration ---------- */
  function register() {
    var root = $('#pn-app'); if (!root) return;
    if (!sb) { root.innerHTML = '<p class="pn-err">The server is not connected, so applications cannot be taken right now.</p>'; return; }
    session().then(function (s) { if (s) return afterSignIn(); signInPanel(root, { title: 'Sign in with Google to apply', lead: 'Use your Google account, then fill in your details. There is no code to type, and your dashboard opens straight away.', create: true, done: afterSignIn }); });
    function afterSignIn() {
      return Promise.all([rpc('partner_me'), rpc('partner_public_config')]).then(function (a) {
        var me = a[0], conf = a[1];
        if (me.state === 'partner') { location.replace('/partners/dashboard'); return; }
        if (me.state === 'applicant') return status(me.application);
        if (!conf.registration_open) { root.innerHTML = '<h2>Registration is closed</h2><p class="muted">Partner registration is not open at the moment. Please check back soon.</p>'; return; }
        sb.auth.getUser().then(function (u) { var md = (u.data && u.data.user && u.data.user.user_metadata) || {}; form(conf, me.email, md.full_name || md.name || ''); });
      }).catch(function (e) { root.innerHTML = '<p class="pn-err">' + esc(errText(e)) + '</p>'; });
    }
    function status(a) {
      var text = { applied: 'Your application has been received. Your dashboard opens as soon as our team approves it.', under_review: 'Your application is being reviewed.', approved: 'Your application is approved.', rejected: 'Your application was not approved. ' + (a.note || '') }[a.status] || '';
      root.innerHTML = '<h2>Application ' + chip(a.status) + '</h2><p>' + esc(text) + '</p><p class="muted">Submitted ' + esc(dt(a.created_at)) + '.</p><div class="pn-actions">' + (a.status === 'approved' ? '<a class="btn btn-ink" href="/partners/dashboard">Open dashboard</a>' : '') + '<button class="btn btn-line" id="pn-so">Sign out</button></div>';
      $('#pn-so', root).onclick = function () { sb.auth.signOut().then(function () { location.reload(); }); };
    }
    function form(conf, email, gname) {
      var cats = conf.categories || [];
      root.innerHTML = '<form class="pn-form" id="pn-reg" novalidate><h2>Your details</h2><p class="muted">Signed in with Google as ' + esc(email) + '.</p>' +
        '<label>Full name<input id="r-name" autocomplete="name" value="' + esc(gname || '') + '" required></label>' +
        '<div class="pn-row"><label>Mobile number<input id="r-mobile" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="10-digit mobile" required></label>' +
        '<label>Partner category<select id="r-cat" required><option value="">Choose a category</option>' + cats.map(function (c) { return '<option value="' + esc(c.key) + '">' + esc(c.name) + '</option>'; }).join('') + '</select></label></div>' +
        '<p class="pn-hint" id="r-cat-note"></p>' +
        '<div class="pn-row"><label>State / UT<select id="r-state" required><option value="">Choose</option>' + STATES.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></label><label>District<input id="r-district" required></label></div>' +
        '<div class="pn-row"><label>City / town<input id="r-city" required></label><label id="r-org-w">Organisation or college <span class="pn-hint" id="r-org-h">(if applicable)</span><input id="r-org"></label></div>' +
        '<div class="pn-row"><label id="r-des-w">Professional designation <span class="pn-hint">(where relevant)</span><input id="r-des"></label><label>Enrolment number <span class="pn-hint">(advocates only)</span><input id="r-enr"></label></div>' +
        '<label>How did you hear about us?<select id="r-src"><option value="">Choose</option>' + SOURCES.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></label>' +
        '<label class="pn-check"><input type="checkbox" id="r-terms"><span>I accept the <a href="/partners/terms" target="_blank" rel="noopener">Partner Terms</a>.</span></label>' +
        '<label class="pn-check"><input type="checkbox" id="r-priv"><span>I have read the <a href="/partners/privacy" target="_blank" rel="noopener">Partner Privacy Notice</a> and consent to LegalStaff processing my details for this application.</span></label>' +
        '<div class="pn-err" id="r-err" hidden></div><div class="pn-actions"><button class="btn btn-ink" type="submit" id="r-go">Submit application</button></div></form>';
      var catSel = $('#r-cat', root);
      catSel.onchange = function () { var c = cats.filter(function (x) { return x.key === catSel.value; })[0]; $('#r-cat-note', root).textContent = c ? (c.eligibility || '') : ''; $('#r-org-h', root).textContent = c && c.requires_organisation ? '(required)' : '(if applicable)'; };
      $('#pn-reg', root).onsubmit = function (e) {
        e.preventDefault(); var v = function (id) { return $(id, root).value.trim(); }, c = cats.filter(function (x) { return x.key === catSel.value; })[0];
        var bad = !v('#r-name') ? 'Enter your full name.' : v('#r-mobile').replace(/\D/g, '').slice(-10).length < 10 ? 'Enter a 10-digit mobile number.' : !c ? 'Choose a partner category.' : !$('#r-state', root).value ? 'Choose your state.' : !v('#r-district') || !v('#r-city') ? 'Enter your district and city.' : c.requires_organisation && !v('#r-org') ? 'Enter your organisation or college name.' : c.requires_designation && !v('#r-des') ? 'Enter your professional designation.' : !$('#r-terms', root).checked || !$('#r-priv', root).checked ? 'Accept the terms and give your privacy consent to continue.' : '';
        if (bad) return msg($('#r-err', root), bad);
        msg($('#r-err', root), ''); busy($('#r-go', root), true, 'Submitting…');
        rpc('partner_apply', { p: { name: v('#r-name'), mobile: v('#r-mobile'), category_key: c.key, state: $('#r-state', root).value, district: v('#r-district'), city: v('#r-city'), organisation: v('#r-org'), designation: v('#r-des'), enrolment_no: v('#r-enr'), referral_source: $('#r-src', root).value, accept_terms: true, accept_privacy: true } })
          .then(function () { return rpc('partner_me'); }).then(function (m) { if (m.state === 'partner') { location.href = '/partners/dashboard?welcome=1'; return; } status({ status: 'applied', created_at: new Date().toISOString() }); })
          .catch(function (er) { busy($('#r-go', root), false, 'Submit application'); msg($('#r-err', root), errText(er)); });
      };
    }
  }

  /* ---------- sign-in ---------- */
  function login() {
    var root = $('#pn-login'); if (!root) return;
    // After signing in: a partner goes to the dashboard; anyone else goes to the details form (or sees their application status).
    var route = function () { return rpc('partner_me').then(function (m) { location.replace(m.state === 'partner' ? '/partners/dashboard' : '/partners/register'); }).catch(function () { location.replace('/partners/dashboard'); }); };
    session().then(function (s) { if (s) return route(); signInPanel(root, { title: 'Sign in', lead: 'Use your Google account. If you are new, you will fill in your details next and land on your dashboard.', create: true, done: route }); });
  }

  /* ---------- portal ---------- */
  var me = null;
  var SECTIONS = [['dashboard', 'Overview'], ['earnings', 'Monthly earnings'], ['payouts', 'Payouts'], ['referrals', 'Referrals'], ['resources', 'Resources'], ['profile', 'Profile'], ['support', 'Support']];
  function portal() {
    var root = $('#pn-view'); if (!root) return;
    var focus = root.getAttribute('data-view');
    $('#pn-out').onclick = function (e) { e.preventDefault(); sb.auth.signOut().then(function () { location.href = '/partners/login'; }); };
    if (!sb) { root.innerHTML = '<p class="pn-err">The server is not connected.</p>'; return; }
    session().then(function (s) {
      if (!s) { location.replace('/partners/login'); return; }
      return rpc('partner_me').then(function (m) {
        me = m;
        if (m.state === 'none') { location.replace('/partners/register'); return; }
        if (m.state === 'applicant') { root.innerHTML = waiting(m.application); return; }
        hub(root, m, focus);
      });
    }).catch(function (e) { root.innerHTML = '<p class="pn-err">' + esc(errText(e)) + '</p>'; });
  }
  function waiting(a) {
    return '<div class="pn-banner"><b>Your application is ' + chip(a.status) + '</b><p class="muted" style="margin:6px 0 0">Your dashboard opens as soon as our team approves it. ' + esc(a.note || '') + '</p></div>';
  }
  /* The whole partner area is one page: the link first, then money, payouts, referrals, resources, profile and support, each in its own section. */
  function hub(root, m, focus) {
    var p = m.partner, welcome = /[?&]welcome=1/.test(location.search);
    root.innerHTML = (welcome ? '<div class="pn-welcome"><b>Welcome, ' + esc(p.name.split(' ')[0]) + '. You are in.</b><span>Your partner ID is <b>' + esc(p.code) + '</b>. Your referral link and QR code are ready below: share them with advocates.</span></div>' : '') +
      (p.status !== 'approved' ? '<div class="pn-banner"><b>Your account is ' + chip(p.status) + '.</b> ' + esc(p.status_note || '') + ' Referral tracking and payouts are off while your account is not in good standing. Contact support if you have questions.</div>' : '') +
      '<nav class="pn-jump" aria-label="Sections">' + SECTIONS.map(function (x) { return '<a href="#s-' + x[0] + '">' + x[1] + '</a>'; }).join('') + '</nav>' +
      SECTIONS.map(function (x) { return '<section class="pn-sec" id="s-' + x[0] + '">' + (x[0] === 'dashboard' ? '' : '<h2 class="pn-sh">' + x[1] + '</h2>') + '<div id="v-' + x[0] + '"><p class="muted">Loading…</p></div></section>'; }).join('');
    var jobs = SECTIONS.map(function (x) {
      var el = $('#v-' + x[0]);
      return Promise.resolve().then(function () { return VIEWS[x[0]](el); }).catch(function (e) { el.innerHTML = '<p class="pn-err">' + esc(errText(e)) + '</p>'; });
    });
    Promise.all(jobs).then(function () {
      if (location.hash && $(location.hash)) $(location.hash).scrollIntoView();
      else if (focus && focus !== 'dashboard' && $('#s-' + focus)) $('#s-' + focus).scrollIntoView();
    });
    if (welcome && window.history && history.replaceState) history.replaceState(null, '', location.pathname);
  }
  function table(cols, rows, empty) {
    if (!rows.length) return '<div class="pn-tablewrap"><div class="pn-empty">' + esc(empty) + '</div></div>';
    return '<div class="pn-tablewrap"><table class="pn-table"><thead><tr>' + cols.map(function (c) { return '<th' + (c[2] ? ' class="num"' : '') + '>' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td' + (c[2] ? ' class="num"' : '') + '>' + c[1](r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function qrSvg(url) { var q = window.qrcode(0, 'M'); q.addData(url); q.make(); return q; }
  function qrPng(url, code) {
    var q = qrSvg(url), n = q.getModuleCount(), cell = 20, pad = 60, w = n * cell + pad * 2, h = w + 120, c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#0A0A0A';
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(pad + k * cell, pad + r * cell, cell, cell);
    g.textAlign = 'center'; g.font = '600 44px "Instrument Sans", system-ui, sans-serif'; g.fillText('LegalStaff Partner ' + code, w / 2, w + 20); g.font = '400 30px "Instrument Sans", system-ui, sans-serif'; g.fillStyle = '#5E5E5E'; g.fillText('legalstaff.in/directory', w / 2, w + 70);
    return c.toDataURL('image/png');
  }
  var VIEWS = {
    dashboard: function (root) {
      return Promise.all([rpc('partner_dashboard'), rpc('partner_notifications_list', { p_mark_read: false })]).then(function (a) {
        var d = a[0], notes = a[1], t = d.totals, m = d.money, max = Math.max.apply(null, d.monthly.map(function (x) { return Math.max(x.clicks, x.registrations, x.listings); }).concat([1]));
        var stat = function (k, v, s) { return '<div class="pn-stat"><span>' + esc(k) + '</span><b>' + esc(v) + '</b>' + (s ? '<small>' + esc(s) + '</small>' : '') + '</div>'; };
        var share = 'https://wa.me/?text=' + encodeURIComponent('Apply for a profile in the LegalStaff Advocate Directory: ' + d.referral_url);
        root.innerHTML = '<div class="pn-heroCard"><div class="pn-heroMain"><span class="pn-eyebrow">Your referral link · Partner ID ' + esc(d.partner.code) + '</span><h2>Share this link with advocates</h2>' +
          '<div class="pn-link pn-linkDark"><input readonly id="pn-url" value="' + esc(d.referral_url) + '" aria-label="Referral link"><button class="btn btn-light btn-sm" id="pn-copy" type="button">Copy</button></div>' +
          '<div class="pn-actions" style="margin-top:12px"><a class="btn btn-ghost-light btn-sm" href="' + esc(share) + '" target="_blank" rel="noopener">Share on WhatsApp</a><button class="btn btn-ghost-light btn-sm" id="pn-dl" type="button">Download QR</button></div>' +
          '<p class="pn-heroNote">' + esc(d.commission_note) + ' Rewards are never guaranteed and arise only on verified listings.</p></div><div class="pn-heroQr" id="pn-qr" aria-label="QR code"></div></div>' +
          '<div class="pn-stats">' + stat('Link clicks', t.referrals) + stat('Advocates referred', t.registrations) + stat('Paid registrations', t.paid_registrations) + stat('Approved listings', t.approved_listings) + stat('Pending verification', t.pending_verification) +
          stat('Eligible commission', inr(m.eligible_paise)) + stat('Pending commission', inr(m.pending_paise)) + stat('Paid commission', inr(m.paid_paise)) + stat('Available balance', inr(m.available_paise), 'Minimum withdrawal ' + inr(m.min_withdrawal_paise)) + '</div>' +
          '<div class="pn-grid2"><div class="pn-card"><h3 class="pn-h">Last six months</h3><div class="pn-bars">' + d.monthly.map(function (x) { return '<div class="pn-bar" title="' + esc(x.month) + ': ' + x.clicks + ' clicks, ' + x.registrations + ' registrations, ' + x.listings + ' approved"><i style="height:' + Math.round(x.registrations / max * 100) + '%"></i><i class="b" style="height:' + Math.round(x.listings / max * 100) + '%"></i><span>' + esc(x.month.slice(5)) + '</span></div>'; }).join('') + '</div><div class="pn-legend"><span><i></i>Registrations</span><span><i class="b"></i>Approved listings</span></div></div>' +
          '<div class="pn-card"><h3 class="pn-h">Notifications</h3><div id="pn-notes">' + (notes.length ? notes.slice(0, 6).map(function (n) { return '<div class="pn-notif' + (n.read ? '' : ' unread') + '"><b>' + esc(n.title) + '</b>' + esc(n.body) + '<br><small>' + esc(dt(n.at)) + '</small></div>'; }).join('') : '<div class="pn-empty">Nothing yet.</div>') + '</div></div></div>';
        $('#pn-qr').innerHTML = qrSvg(d.referral_url).createSvgTag(5, 0, 'QR code for ' + d.partner.code);
        $('#pn-copy').onclick = function () { var i = $('#pn-url'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).catch(function () { document.execCommand('copy'); }); this.textContent = 'Copied'; var b = this; setTimeout(function () { b.textContent = 'Copy'; }, 1500); };
        $('#pn-dl').onclick = function () { var a = document.createElement('a'); a.href = qrPng(d.referral_url, d.partner.code); a.download = 'legalstaff-partner-' + d.partner.code + '-qr.png'; a.click(); };
        if (notes.some(function (n) { return !n.read; })) rpc('partner_notifications_list', { p_mark_read: true });
      });
    },
    referrals: function (root) {
      return rpc('partner_referrals_list').then(function (rows) {
        root.innerHTML = '<p class="muted">Advocate names are shortened and contact details are never shown to partners.</p>' + table([['Date', function (r) { return esc(dt(r.when)); }], ['Advocate', function (r) { return esc(r.advocate || ''); }], ['City', function (r) { return esc(r.city || ''); }], ['Referral', function (r) { return chip(r.attribution); }], ['Listing', function (r) { return chip(r.listing); }], ['Paid', function (r) { return r.paid ? 'Yes' : 'No'; }], ['Commission', function (r) { return r.commission ? chip(r.commission) : '<span class="muted">None</span>'; }]], rows, 'No referrals yet.');
      });
    },
    earnings: function (root) {
      return Promise.all([rpc('partner_earnings_list'), rpc('partner_dashboard'), rpc('partner_monthly_earnings')]).then(function (a) {
        var m = a[1].money, months = a[2];
        root.innerHTML = '<div class="pn-stats"><div class="pn-stat"><span>Eligible</span><b>' + inr(m.eligible_paise) + '</b></div><div class="pn-stat"><span>Approved</span><b>' + inr(m.approved_paise) + '</b></div><div class="pn-stat"><span>Available to withdraw</span><b>' + inr(m.available_paise) + '</b></div><div class="pn-stat"><span>Paid</span><b>' + inr(m.paid_paise) + '</b></div></div>' +
          '<p class="muted">An entry moves from pending to eligible once the advocate’s payment (if any) is verified, documents are in and LegalStaff has approved the listing. Finance then approves it before it becomes payable.</p>' +
          '<h3 class="pn-h">By month</h3>' + table([['Month', function (r) { return esc(r.month); }], ['Advocates referred', function (r) { return r.referred; }, true], ['Listings approved', function (r) { return r.verified; }, true], ['Earned', function (r) { return inr(r.earned_paise); }, true], ['Paid to you', function (r) { return inr(r.paid_out_paise); }, true], ['Waiting', function (r) { return inr(r.waiting_paise); }, true]], months, 'No referrals yet.') +
          '<h3 class="pn-h" style="margin-top:24px">Every entry</h3>' + table([['Date', function (r) { return esc(dt(r.created_at)); }], ['Amount', function (r) { return inr(r.amount_paise); }, true], ['Status', function (r) { return chip(r.status); }], ['Note', function (r) { return esc(r.reason); }]], a[0], 'No commission entries. Rewards apply only to categories whose terms are approved and switched on.');
      });
    },
    payouts: function (root) {
      return rpc('partner_payouts_list').then(function (d) {
        var can = !d.paused && d.kyc_status === 'verified' && d.methods.length && d.available_paise >= d.min_withdrawal_paise;
        root.innerHTML = (d.paused ? '<div class="pn-banner">Payouts are paused at the moment.</div>' : '') + (d.kyc_status !== 'verified' ? '<div class="pn-banner"><b>KYC ' + chip(d.kyc_status) + '.</b> Upload your documents under <a href="/partners/profile">Profile</a>. A withdrawal needs verified KYC.</div>' : '') +
          '<div class="pn-grid2"><div class="pn-card"><h3 class="pn-h">Withdraw</h3><p>Available balance <b>' + inr(d.available_paise) + '</b>. Minimum withdrawal ' + inr(d.min_withdrawal_paise) + '.</p><div class="pn-err" id="po-e" hidden></div><button class="btn btn-ink" id="po-req"' + (can ? '' : ' disabled') + '>Request withdrawal</button></div>' +
          '<div class="pn-card"><h3 class="pn-h">Payment method</h3>' + (d.methods.length ? d.methods.map(function (x) { return '<p style="margin:0 0 6px"><b>' + esc(x.kind.toUpperCase()) + '</b> ' + esc(x.masked) + (x.is_default ? ' ' + chip('approved').replace('approved', 'default') : '') + '</p>'; }).join('') : '<p class="muted">None added yet.</p>') +
          '<form class="pn-form" id="po-form" novalidate style="margin-top:14px"><label>Type<select id="pm-kind"><option value="upi">UPI</option><option value="bank">Bank transfer</option></select></label><div id="pm-upi"><label>UPI ID<input id="pm-upiid" placeholder="name@bank"></label></div><div id="pm-bank" hidden><label>Account holder<input id="pm-holder"></label><div class="pn-row"><label>Account number<input id="pm-acct" inputmode="numeric"></label><label>IFSC<input id="pm-ifsc"></label></div></div><div class="pn-err" id="pm-e" hidden></div><div class="pn-actions"><button class="btn btn-line" type="submit">Save payment method</button></div><p class="pn-hint">Stored encrypted. Only a masked version is shown here.</p></form></div></div>' +
          '<h3 class="pn-h">Payout history</h3>' + table([['Requested', function (r) { return esc(dt(r.requested_at)); }], ['Amount', function (r) { return inr(r.amount_paise); }, true], ['To', function (r) { return esc(r.destination); }], ['Status', function (r) { return chip(r.status); }], ['UTR', function (r) { return esc(r.utr || ''); }], ['Note', function (r) { return esc(r.note || ''); }]], d.payouts, 'No payouts yet.');
        var kind = $('#pm-kind'); kind.onchange = function () { $('#pm-upi').hidden = kind.value !== 'upi'; $('#pm-bank').hidden = kind.value !== 'bank'; };
        $('#po-form').onsubmit = function (e) { e.preventDefault(); var det = kind.value === 'upi' ? { upi_id: $('#pm-upiid').value.trim() } : { holder: $('#pm-holder').value.trim(), account_no: $('#pm-acct').value.trim(), ifsc: $('#pm-ifsc').value.trim().toUpperCase() };
          rpc('partner_add_payment_method', { p_kind: kind.value, p_details: det }).then(function () { VIEWS.payouts(root); }).catch(function (er) { msg($('#pm-e'), errText(er)); }); };
        $('#po-req').onclick = function () { busy(this, true, 'Requesting…'); rpc('partner_request_payout').then(function () { VIEWS.payouts(root); }).catch(function (er) { msg($('#po-e'), errText(er)); busy($('#po-req'), false, 'Request withdrawal'); }); };
      });
    },
    profile: function (root) {
      var p = me.partner;
      root.innerHTML = '<div class="pn-grid2"><div class="pn-card"><h3 class="pn-h">Your details</h3>' + [['Partner ID', p.code], ['Name', p.name], ['Email', p.email], ['Mobile', p.mobile], ['Category', me.category.name], ['State', p.state], ['Status', p.status], ['KYC', p.kyc_status]].map(function (r) { return '<p style="margin:0 0 8px"><span class="muted">' + esc(r[0]) + '</span><br><b>' + esc(r[1]) + '</b></p>'; }).join('') +
        '<p class="pn-hint">Name, email, mobile, category and state are changed only by our team, so your identity stays consistent for payouts. Contact support to change them.</p></div>' +
        '<div class="pn-card"><h3 class="pn-h">Update</h3><form class="pn-form" id="pf" novalidate><label>City<input id="pf-city" value="' + esc(p.city) + '"></label><label>District<input id="pf-dist" value="' + esc(p.district) + '"></label><label>Organisation<input id="pf-org" value="' + esc(p.organisation) + '"></label><label>Designation<input id="pf-des" value="' + esc(p.designation) + '"></label><div class="pn-err" id="pf-e" hidden></div><div class="pn-actions"><button class="btn btn-ink" type="submit">Save</button></div></form></div></div>' +
        '<div class="pn-card"><h3 class="pn-h">KYC documents</h3><p class="muted">For payouts we need your PAN and a bank or UPI proof. Files up to 10 MB (PDF, JPG or PNG) are stored privately and seen only by authorised staff.</p><form class="pn-form" id="kf" novalidate><div class="pn-row"><label>Document<select id="kf-kind"><option value="pan">PAN card</option><option value="bank_proof">Bank / UPI proof</option><option value="aadhaar_masked">Aadhaar (masked copy)</option><option value="business_proof">Business proof</option><option value="college_id">College ID</option></select></label><label>File<input type="file" id="kf-file" accept=".pdf,.jpg,.jpeg,.png" style="height:auto;padding:9px"></label></div><div class="pn-err" id="kf-e" hidden></div><div class="pn-actions"><button class="btn btn-ink" type="submit" id="kf-go">Upload</button></div></form></div>';
      $('#pf').onsubmit = function (e) { e.preventDefault(); rpc('partner_update_profile', { p: { city: $('#pf-city').value, district: $('#pf-dist').value, organisation: $('#pf-org').value, designation: $('#pf-des').value } }).then(function () { msg($('#pf-e'), 'Saved.', true); }).catch(function (er) { msg($('#pf-e'), errText(er)); }); };
      $('#kf').onsubmit = function (e) {
        e.preventDefault(); var f = $('#kf-file').files[0]; if (!f) return msg($('#kf-e'), 'Choose a file.');
        if (f.size > 10485760) return msg($('#kf-e'), 'The file is larger than 10 MB.');
        if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) return msg($('#kf-e'), 'Upload a PDF, JPG or PNG.');
        busy($('#kf-go'), true, 'Uploading…'); msg($('#kf-e'), '');
        sb.auth.getUser().then(function (r) { var uid = r.data.user.id, path = uid + '/' + Date.now() + '-' + f.name.replace(/[^\w.\-]+/g, '_');
          return sb.storage.from('partner-docs').upload(path, f, { upsert: false, contentType: f.type }).then(function (u) { if (u.error) throw u.error; return rpc('partner_register_document', { p_kind: $('#kf-kind').value, p_path: path, p_name: f.name, p_size: f.size }); });
        }).then(function () { msg($('#kf-e'), 'Uploaded. Our team will review it.', true); busy($('#kf-go'), false, 'Upload'); $('#kf').reset(); }).catch(function (er) { msg($('#kf-e'), errText(er)); busy($('#kf-go'), false, 'Upload'); });
      };
    },
    resources: function (root) {
      return rpc('partner_resources_list').then(function (rows) {
        root.innerHTML = rows.length ? rows.map(function (r, i) { return '<div class="pn-res"><span class="pn-chip">' + esc(r.kind.replace('_', ' ')) + '</span> <b>' + esc(r.title) + '</b>' + (r.body ? '<pre>' + esc(r.body) + '</pre><button class="btn btn-line btn-sm" data-copy="' + i + '">Copy text</button> ' : '') + (r.file_url ? '<a class="btn btn-line btn-sm" href="' + esc(r.file_url) + '" target="_blank" rel="noopener">Open file</a>' : '') + '</div>'; }).join('') : '<div class="pn-tablewrap"><div class="pn-empty">No resources have been published for your category yet.</div></div>';
        root.querySelectorAll('[data-copy]').forEach(function (b) { b.onclick = function () { navigator.clipboard && navigator.clipboard.writeText(rows[+b.getAttribute('data-copy')].body); b.textContent = 'Copied'; }; });
      });
    },
    support: function (root) {
      return rpc('partner_support_list').then(function (rows) {
        root.innerHTML = '<div class="pn-card" style="margin-bottom:20px"><h3 class="pn-h">Contact partner support</h3><form class="pn-form" id="sf" novalidate><label>Subject<input id="sf-s" maxlength="160"></label><label>Message<textarea id="sf-m" maxlength="4000"></textarea></label><div class="pn-err" id="sf-e" hidden></div><div class="pn-actions"><button class="btn btn-ink" type="submit">Send</button></div></form></div><h3 class="pn-h">Your messages</h3>' +
          (rows.length ? rows.map(function (r) { return '<div class="pn-res"><b>' + esc(r.subject) + '</b> ' + chip(r.status) + '<p style="margin:8px 0">' + esc(r.message) + '</p>' + (r.reply ? '<pre>' + esc(r.reply) + '</pre>' : '') + '<small class="muted">' + esc(dt(r.at)) + '</small></div>'; }).join('') : '<div class="pn-tablewrap"><div class="pn-empty">No messages yet.</div></div>');
        $('#sf').onsubmit = function (e) { e.preventDefault(); rpc('partner_support_create', { p_subject: $('#sf-s').value, p_message: $('#sf-m').value }).then(function () { VIEWS.support(root); }).catch(function (er) { msg($('#sf-e'), errText(er)); }); };
      });
    }
  };

  if (view === 'landing') landing(); else if (view === 'portal') portal(); else if ($('#pn-app')) register(); else if ($('#pn-login')) login();
})();

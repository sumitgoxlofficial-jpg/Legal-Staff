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
  /* Sign in right on the landing page: "Become a Partner" and "Partner login" open a Google sign-in popup here instead of a separate page.
     Afterwards a partner goes to the dashboard; anyone new goes straight to the details form (they are already signed in). Without JS the links still work. */
  function directSignIn() {
    var css = document.createElement('style');
    css.textContent = '.pn-modal{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,10,10,.6)}.pn-modal[hidden]{display:none}.pn-modal-box{position:relative;width:100%;max-width:440px;background:#fff;color:#0a0a0a;border-radius:16px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}.pn-modal-x{position:absolute;top:10px;right:14px;border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:#555}';
    document.head.appendChild(css);
    var modal = document.createElement('div'); modal.className = 'pn-modal'; modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = '<div class="pn-modal-box"><button type="button" class="pn-modal-x" aria-label="Close">\u00d7</button><div id="pn-direct"></div></div>';
    document.body.appendChild(modal);
    var box = $('#pn-direct', modal);
    var close = function () { modal.hidden = true; };
    $('.pn-modal-x', modal).onclick = close;
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    var route = function () { return rpc('partner_me').then(function (m) { location.href = m.state === 'partner' ? '/partners/dashboard' : '/partners/register'; }).catch(function () { location.href = '/partners/register'; }); };
    var open = function (isLogin) {
      session().then(function (sess) {
        if (sess) return route();
        modal.hidden = false;
        signInPanel(box, { title: isLogin ? 'Partner sign in' : 'Sign in with Google to apply', lead: isLogin ? 'Use the Google account you applied with.' : 'Use your Google account, then fill in your details. There is no code to type.', create: true, done: route });
      });
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href="/partners/register"], a[href="/partners/login"]');
      if (!a || a.getAttribute('aria-disabled') === 'true' || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault(); open(a.getAttribute('href') === '/partners/login');
    });
  }
  function landing() {
    if (!sb) return;
    directSignIn();
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
        // Open Google's account chooser straight away (One Tap). The button above stays as the fallback if it is dismissed or blocked.
        try { window.google.accounts.id.prompt(); } catch (e) { /* button still works */ }
      });
    }).catch(function (e) { fail(e.message || 'Google sign-in is not available right now.'); });
  }
  /* Google first; the email code stays as a small fallback. */
  function signInPanel(root, opts) {
    root.innerHTML = '<div class="pn-form"><h2 class="pn-sih">' + esc(opts.title) + '</h2><p class="muted">' + esc(opts.lead) + '</p><div id="pn-g" style="min-height:44px;max-width:380px"></div><div class="pn-err" id="pn-ge" hidden></div>' +
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
    var o1 = $('#pn-out'); if (o1) o1.onclick = function (e) { e.preventDefault(); if (sb) sb.auth.signOut().then(function () { location.href = '/partners/login'; }); };
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
  /* ---------- small chart helpers (plain SVG, no library) ---------- */
  function countUp(el) {
    var to = Number(el.getAttribute('data-count')) || 0, kind = el.getAttribute('data-fmt'), fmt = function (v) { return kind === 'inr' ? inr(v) : Math.round(v).toLocaleString('en-IN'); };
    if (reduceMotion || !to) { el.textContent = fmt(to); return; }
    var t0 = null, dur = 1000; el.textContent = fmt(0);
    (function step(ts) { if (t0 === null) t0 = ts; var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); })(performance.now());
  }
  function smooth(pts) { if (!pts.length) return ''; var d = 'M' + pts[0][0] + ' ' + pts[0][1]; for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], cx = (a[0] + b[0]) / 2; d += ' C' + cx + ' ' + a[1] + ' ' + cx + ' ' + b[1] + ' ' + b[0] + ' ' + b[1]; } return d; }
  var monthName = function (ym) { var a = String(ym).split('-'); return new Date(+a[0], (+a[1] || 1) - 1, 1).toLocaleString('en-IN', { month: 'short' }); };
  function spark(vals, color) {
    var W = 96, H = 30, n = vals.length, mx = Math.max.apply(null, vals.concat([1])); if (n < 2) return '';
    var pts = vals.map(function (v, i) { return [Math.round(i / (n - 1) * (W - 4) + 2), Math.round(H - 3 - v / mx * (H - 8))]; });
    return '<svg class="pn-spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><path d="' + smooth(pts) + ' L' + pts[n - 1][0] + ' ' + H + ' L' + pts[0][0] + ' ' + H + 'Z" fill="' + color + '" opacity=".12"/><path class="pn-draw" pathLength="1" d="' + smooth(pts) + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  var SERIES = [['clicks', 'Link clicks', '#3B5BDB'], ['registrations', 'Advocates referred', '#0A0A0A'], ['listings', 'Approved listings', '#12B76A']];
  function areaChart(monthly) {
    var W = 640, H = 250, L = 34, R = 12, T = 14, B = 30, n = monthly.length;
    var mx = Math.max.apply(null, monthly.map(function (x) { return Math.max(x.clicks, x.registrations, x.listings); }).concat([4]));
    var top = mx <= 4 ? 4 : Math.ceil(mx / 4) * 4, X = function (i) { return n < 2 ? (L + W - R) / 2 : L + i / (n - 1) * (W - L - R); }, Y = function (v) { return T + (1 - v / top) * (H - T - B); };
    var grid = [0, 1, 2, 3, 4].map(function (g) { var v = top / 4 * g, y = Y(v); return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" class="pn-grid"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="pn-axis">' + Math.round(v) + '</text>'; }).join('');
    var xs = monthly.map(function (x, i) { return '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" class="pn-axis">' + esc(monthName(x.month)) + '</text>'; }).join('');
    var defs = '<defs><linearGradient id="pn-gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B5BDB" stop-opacity=".28"/><stop offset="1" stop-color="#3B5BDB" stop-opacity="0"/></linearGradient></defs>';
    var lines = SERIES.map(function (se, si) {
      var pts = monthly.map(function (x, i) { return [X(i), Y(x[se[0]])]; }), d = smooth(pts);
      return '<g class="pn-ser" data-s="' + se[0] + '">' + (si === 0 && n > 1 ? '<path d="' + d + ' L' + X(n - 1) + ' ' + (H - B) + ' L' + X(0) + ' ' + (H - B) + 'Z" fill="url(#pn-gA)" class="pn-areafade"/>' : '') +
        '<path class="pn-draw" pathLength="1" d="' + d + '" fill="none" stroke="' + se[2] + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        pts.map(function (q, i) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.2" fill="#fff" stroke="' + se[2] + '" stroke-width="2" class="pn-dot" style="--i:' + i + '"/>'; }).join('') + '</g>';
    }).join('');
    var empty = monthly.every(function (x) { return !x.clicks && !x.registrations && !x.listings; });
    return '<div class="pn-chart" id="pn-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Monthly clicks, referrals and approved listings for the last six months">' + defs + grid + xs + '<line class="pn-guide" id="pn-guide" y1="' + T + '" y2="' + (H - B) + '" x1="0" x2="0" opacity="0"/>' + lines + '</svg>' +
      '<div class="pn-tip" id="pn-tip" hidden></div>' + (empty ? '<div class="pn-chart-empty">Your numbers will appear here once people start using your link.</div>' : '') + '</div>' +
      '<div class="pn-legend2">' + SERIES.map(function (se) { return '<button type="button" class="pn-lg" data-s="' + se[0] + '" aria-pressed="true"><i style="background:' + se[2] + '"></i>' + se[1] + '</button>'; }).join('') + '</div>';
  }
  function wireChart(monthly) {
    var box = $('#pn-chart'); if (!box) return;
    var svg = box.querySelector('svg'), tip = $('#pn-tip'), guide = $('#pn-guide'), W = 640, L = 34, R = 12, n = monthly.length;
    var X = function (i) { return n < 2 ? (L + W - R) / 2 : L + i / (n - 1) * (W - L - R); };
    box.onpointermove = function (e) {
      var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, best = 0, bd = 1e9;
      monthly.forEach(function (_, i) { var d = Math.abs(X(i) - x); if (d < bd) { bd = d; best = i; } });
      var d = monthly[best]; guide.setAttribute('x1', X(best)); guide.setAttribute('x2', X(best)); guide.setAttribute('opacity', '1');
      tip.hidden = false; tip.innerHTML = '<b>' + esc(monthName(d.month)) + ' ' + esc(String(d.month).slice(0, 4)) + '</b>' + SERIES.map(function (se) { return '<span><i style="background:' + se[2] + '"></i>' + se[1] + '<em>' + d[se[0]] + '</em></span>'; }).join('');
      var px = X(best) / W * r.width, tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(r.width - tw - 4, px - tw / 2)) + 'px';
    };
    box.onpointerleave = function () { tip.hidden = true; guide.setAttribute('opacity', '0'); };
    document.querySelectorAll('.pn-lg').forEach(function (b) { b.onclick = function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); var g = svg.querySelector('.pn-ser[data-s="' + b.getAttribute('data-s') + '"]'); if (g) g.style.opacity = on ? '1' : '0'; b.classList.toggle('off', !on); }; });
  }
  function donut(parts, total) {
    var R = 54, C = 2 * Math.PI * R, off = 0, segs = parts.map(function (x) {
      var len = total ? x.v / total * C : 0, seg = '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="' + x.c + '" stroke-width="16" stroke-dasharray="' + Math.max(0, len - (len > 3 ? 2 : 0)) + ' ' + C + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 70 70)" class="pn-seg"/>';
      off += len; return seg;
    }).join('');
    return '<div class="pn-donut"><svg viewBox="0 0 140 140" role="img" aria-label="Commission split"><circle cx="70" cy="70" r="' + R + '" fill="none" stroke="#EFEFEE" stroke-width="16"/>' + segs + '</svg><div class="pn-donutC"><small>Total earned</small><b data-count="' + total + '" data-fmt="inr">' + inr(total) + '</b></div></div>';
  }
  var NAVIC = { dashboard: 'home', referrals: 'users', earnings: 'trend', payouts: 'wallet', resources: 'folder', profile: 'user', support: 'help' };
  var ICP = { home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z', trend: 'M3 17l6-6 4 4 8-8M15 7h6v6', wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7V6a2 2 0 0 1 2-2h12M16 14h2', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01', click: 'M9 9l5 12 1.7-5.3L21 14zM9 3v2M3 9h2M5.6 5.6L7 7', check: 'M20 6L9 17l-5-5', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2', out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', rupee: 'M6 3h12M6 8h12M9 13h3a4 4 0 0 0 0-5M9 13l7 8', copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1', share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14', qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4', more: 'M5 12h.01M12 12h.01M19 12h.01', star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z' };
  var ic = function (n, sz) { return '<svg class="pn-ic" width="' + (sz || 18) + '" height="' + (sz || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (ICP[n] || '') + '"/></svg>'; };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var initials = function (n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(''); };
  var hour = function () { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

  /* The partner area is one app: a sidebar with a section list, and one panel on screen at a time (the URL hash picks it). */
  function hub(root, m, focus) {
    var p = m.partner, welcome = /[?&]welcome=1/.test(location.search), first = String(p.name || 'Partner').split(' ')[0];
    var host = root.closest('.pn-portal'); if (host) host.classList.add('pn-shelled');
    var TAB = [['dashboard', 'Home'], ['referrals', 'Referrals'], ['earnings', 'Earnings'], ['payouts', 'Payouts']], MORE = ['profile', 'resources', 'support'];
    var appbar = '<header class="pn-appbar"><a href="/" class="pn-brand" aria-label="Legal Staff home"><img src="/assets/ls-logo-white.png" alt="Legal Staff" width="120" height="30"></a><span class="pn-appTag">Partner</span><span class="pn-grow"></span><a href="/partners" class="pn-site">Website</a><span class="pn-av sm" title="' + esc(p.name) + '">' + esc(initials(p.name)) + '</span></header>';
    var tabbar = '<nav class="pn-tabbar" aria-label="Sections">' + TAB.map(function (x) { return '<a href="#s-' + x[0] + '" data-nav="' + x[0] + '">' + ic(NAVIC[x[0]], 22) + '<span>' + x[1] + '</span></a>'; }).join('') + '<button type="button" class="pn-moreb" id="pn-more" aria-expanded="false">' + ic('more', 22) + '<span>More</span></button></nav>' +
      '<div class="pn-sheet" id="pn-sheet" hidden><div class="pn-sheetBox">' + MORE.map(function (n) { var t = SECTIONS.filter(function (x) { return x[0] === n; })[0]; return '<a href="#s-' + n + '" data-nav="' + n + '">' + ic(NAVIC[n], 20) + '<span>' + t[1] + '</span></a>'; }).join('') + '<a href="#" id="pn-out3">' + ic('out', 20) + '<span>Sign out</span></a></div></div>';
    root.innerHTML = appbar + '<div class="pn-shell"><aside class="pn-side"><div class="pn-me"><span class="pn-av">' + esc(initials(p.name)) + '</span><div><b>' + esc(p.name) + '</b><small>Partner ID ' + esc(p.code) + '</small></div></div>' +
      '<nav class="pn-nav" aria-label="Partner sections">' + SECTIONS.map(function (x) { return '<a href="#s-' + x[0] + '" data-nav="' + x[0] + '">' + ic(NAVIC[x[0]], 18) + '<span>' + x[1] + '</span></a>'; }).join('') + '</nav>' +
      '<a href="#" class="pn-signout" id="pn-out2">' + ic('out', 18) + '<span>Sign out</span></a></aside>' +
      '<main class="pn-main"><header class="pn-head"><div><p class="pn-hello">' + hour() + ', ' + esc(first) + '</p><h2 id="pn-title">Overview</h2></div><div class="pn-headR">' + chip(p.status) + '</div></header>' +
      (welcome ? '<div class="pn-welcome"><b>Welcome, ' + esc(first) + '. You are in.</b><span>Your partner ID is <b>' + esc(p.code) + '</b>. Your referral link and QR code are ready below: share them with advocates.</span></div>' : '') +
      (p.status !== 'approved' ? '<div class="pn-banner"><b>Your account is ' + chip(p.status) + '.</b> ' + esc(p.status_note || '') + ' Referral tracking and payouts are off while your account is not in good standing. Contact support if you have questions.</div>' : '') +
      SECTIONS.map(function (x) { return '<section class="pn-sec pn-panel" id="s-' + x[0] + '" hidden>' + (x[0] === 'dashboard' ? '' : '<h2 class="pn-sh">' + x[1] + '</h2>') + '<div id="v-' + x[0] + '"><div class="pn-skel"><i></i><i></i><i></i></div></div></section>'; }).join('') + '</main></div>' + tabbar;
    var signOut = function (e) { e.preventDefault(); sb.auth.signOut().then(function () { location.href = '/partners/login'; }); };
    $('#pn-out2').onclick = signOut; $('#pn-out3').onclick = signOut;
    var sheet = $('#pn-sheet'), moreB = $('#pn-more');
    var setSheet = function (on) { sheet.hidden = !on; moreB.setAttribute('aria-expanded', on); };
    moreB.onclick = function () { setSheet(sheet.hidden); };
    sheet.addEventListener('click', function (e) { if (e.target === sheet || e.target.closest('[data-nav]')) setSheet(false); });
    var show = function (name) {
      if (!$('#s-' + name)) name = 'dashboard';
      SECTIONS.forEach(function (x) { var el = $('#s-' + x[0]); if (el) { var on = x[0] === name; if (on && el.hidden) { el.hidden = false; el.classList.remove('pn-in'); void el.offsetWidth; el.classList.add('pn-in'); } else if (!on) el.hidden = true; } });
      root.querySelectorAll('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      moreB.classList.toggle('on', MORE.indexOf(name) >= 0);
      var t = SECTIONS.filter(function (x) { return x[0] === name; })[0]; $('#pn-title').textContent = t ? t[1] : 'Overview';
    };
    var cur = function () { var h = (location.hash || '').replace('#s-', ''); return $('#s-' + h) ? h : (focus && $('#s-' + focus) ? focus : 'dashboard'); };
    root.querySelectorAll('[data-nav]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var n = a.getAttribute('data-nav'); if (window.history && history.replaceState) history.replaceState(null, '', '#s-' + n); show(n); window.scrollTo({ top: Math.max(0, root.getBoundingClientRect().top + window.pageYOffset - 70), behavior: reduceMotion ? 'auto' : 'smooth' }); }; });
    window.addEventListener('hashchange', function () { show(cur()); });
    show(cur());
    SECTIONS.forEach(function (x) {
      var el = $('#v-' + x[0]);
      Promise.resolve().then(function () { return VIEWS[x[0]](el); }).catch(function (e) { el.innerHTML = '<p class="pn-err">' + esc(errText(e)) + '</p>'; });
    });
    if (welcome && window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.hash);
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
        var d = a[0], notes = a[1], t = d.totals, m = d.money, mo = d.monthly || [];
        var col = function (k) { return mo.map(function (x) { return x[k] || 0; }); };
        var share = 'https://wa.me/?text=' + encodeURIComponent('Apply for a profile in the LegalStaff Advocate Directory: ' + d.referral_url);
        var kpi = function (i, icon, label, val, fmt, color, series, sub) { return '<div class="pn-kpi" style="--i:' + i + ';--c:' + color + '"><div class="pn-kpiTop"><span class="pn-kpiIc">' + ic(icon, 18) + '</span>' + (series ? spark(series, color) : '') + '</div><b data-count="' + (val || 0) + '"' + (fmt ? ' data-fmt="' + fmt + '"' : '') + '>0</b><span class="pn-kpiL">' + esc(label) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>'; };
        var total = (m.pending_paise || 0) + (m.eligible_paise || 0) + (m.paid_paise || 0);
        var parts = [{ n: 'Pending', v: m.pending_paise || 0, c: '#F79009' }, { n: 'Eligible', v: m.eligible_paise || 0, c: '#3B5BDB' }, { n: 'Paid', v: m.paid_paise || 0, c: '#12B76A' }];
        var fun = [['Link clicks', t.referrals, '#3B5BDB'], ['Advocates referred', t.registrations, '#6D83E8'], ['Paid registrations', t.paid_registrations, '#0A0A0A'], ['Approved listings', t.approved_listings, '#12B76A']];
        var fmax = Math.max.apply(null, fun.map(function (x) { return x[1] || 0; }).concat([1]));
        root.innerHTML =
          '<div class="pn-heroCard pn-rise" style="--i:0"><div class="pn-heroMain"><span class="pn-eyebrow">' + ic('star', 14) + ' Your referral link</span><h2>Share this link with advocates</h2>' +
          '<div class="pn-link pn-linkDark"><input readonly id="pn-url" value="' + esc(d.referral_url) + '" aria-label="Referral link"><button class="btn btn-light btn-sm" id="pn-copy" type="button">' + ic('copy', 15) + ' Copy</button></div>' +
          '<div class="pn-actions" style="margin-top:14px"><a class="btn btn-ghost-light btn-sm" href="' + esc(share) + '" target="_blank" rel="noopener">' + ic('share', 15) + ' Share on WhatsApp</a><button class="btn btn-ghost-light btn-sm" id="pn-dl" type="button">' + ic('qr', 15) + ' Download QR</button></div>' +
          '<p class="pn-heroNote">' + esc(d.commission_note) + ' Rewards are never guaranteed and arise only on verified listings.</p></div><div class="pn-heroQr" id="pn-qr" aria-label="QR code"></div></div>' +
          '<div class="pn-kpis">' + kpi(1, 'click', 'Link clicks', t.referrals, '', '#3B5BDB', col('clicks')) + kpi(2, 'users', 'Advocates referred', t.registrations, '', '#0A0A0A', col('registrations')) + kpi(3, 'check', 'Approved listings', t.approved_listings, '', '#12B76A', col('listings')) + kpi(4, 'wallet', 'Available balance', m.available_paise, 'inr', '#7A5AF8', null, 'Minimum withdrawal ' + inr(m.min_withdrawal_paise)) + '</div>' +
          '<div class="pn-grid2 pn-rise" style="--i:5"><div class="pn-card"><div class="pn-cardHead"><h3 class="pn-h">Performance</h3><span class="pn-muted2">Last six months</span></div>' + areaChart(mo) + '</div>' +
          '<div class="pn-card"><div class="pn-cardHead"><h3 class="pn-h">Commission</h3><span class="pn-muted2">By status</span></div><div class="pn-split">' + donut(parts, total) + '<ul class="pn-keys">' + parts.map(function (x) { return '<li><i style="background:' + x.c + '"></i><span>' + x.n + '</span><b>' + inr(x.v) + '</b></li>'; }).join('') + '</ul></div></div></div>' +
          '<div class="pn-grid2 pn-rise" style="--i:6"><div class="pn-card"><div class="pn-cardHead"><h3 class="pn-h">Referral funnel</h3><span class="pn-muted2">From click to approved listing</span></div><div class="pn-funnel">' + fun.map(function (x, i) {
            var w = Math.max(x[1] ? 4 : 0, Math.round((x[1] || 0) / fmax * 100)), prev = i ? fun[i - 1][1] : 0, rate = i && prev ? Math.round((x[1] || 0) / prev * 100) + '% of previous' : '';
            return '<div class="pn-fRow" style="--i:' + i + '"><div class="pn-fTop"><span>' + esc(x[0]) + '</span><b>' + (x[1] || 0) + '</b></div><div class="pn-fTrack"><i style="--w:' + w + '%;background:' + x[2] + '"></i></div><small>' + esc(rate) + '</small></div>';
          }).join('') + '</div><p class="pn-hint" style="margin:12px 0 0">' + (t.pending_verification || 0) + ' listing' + ((t.pending_verification || 0) === 1 ? '' : 's') + ' waiting for verification.</p></div>' +
          '<div class="pn-card"><div class="pn-cardHead"><h3 class="pn-h">Notifications</h3></div><div id="pn-notes" class="pn-feed">' + (notes.length ? notes.slice(0, 6).map(function (n) { return '<div class="pn-notif' + (n.read ? '' : ' unread') + '"><span class="pn-dotN"></span><div><b>' + esc(n.title) + '</b>' + esc(n.body) + '<br><small>' + esc(dt(n.at)) + '</small></div></div>'; }).join('') : '<div class="pn-empty">' + ic('clock', 22) + '<br>Nothing yet. Updates about your referrals and payouts appear here.</div>') + '</div></div></div>';
        $('#pn-qr').innerHTML = qrSvg(d.referral_url).createSvgTag(5, 0, 'QR code for ' + d.partner.code);
        $('#pn-copy').onclick = function () { var i = $('#pn-url'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).catch(function () { document.execCommand('copy'); }); var b = this; b.innerHTML = ic('check', 15) + ' Copied'; setTimeout(function () { b.innerHTML = ic('copy', 15) + ' Copy'; }, 1500); };
        $('#pn-dl').onclick = function () { var a = document.createElement('a'); a.href = qrPng(d.referral_url, d.partner.code); a.download = 'legalstaff-partner-' + d.partner.code + '-qr.png'; a.click(); };
        root.querySelectorAll('[data-count]').forEach(countUp);
        wireChart(mo);
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

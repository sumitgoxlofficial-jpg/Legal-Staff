/* Ties a visit from a Legal Staff email to the contact and campaign it came from (signed token ls_t, campaign UTM). No cookies; the token is kept in
   this browser's localStorage for 30 days so a later registration can be attributed. Sends nothing but the token. */
(function () {
  var KEY = 'ls_email_t', cfg = window.LS_CONFIG || {};
  function endpoint() { return cfg.supabaseUrl ? cfg.supabaseUrl.replace(/\/$/, '') + '/functions/v1/email-marketing?action=landing' : ''; }
  function send(t, event) {
    var url = endpoint(); if (!url || !t) return;
    try { fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: t, event: event }), keepalive: true }).catch(function () {}); } catch (e) {}
  }
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && Date.now() - v.at < 30 * 864e5 ? v.t : ''; } catch (e) { return ''; } }
  var q = new URLSearchParams(location.search), t = q.get('ls_t');
  if (t && q.get('utm_source') === 'legalstaff_email') {
    try { localStorage.setItem(KEY, JSON.stringify({ t: t, at: Date.now() })); } catch (e) {}
    try { if (!sessionStorage.getItem('ls_email_click')) { sessionStorage.setItem('ls_email_click', '1'); send(t, 'click'); } } catch (e) { send(t, 'click'); }
  }
  window.LSEmailAttribution = { registrationStarted: function () { var s = read(); if (s) send(s, 'registration_started'); } };
})();

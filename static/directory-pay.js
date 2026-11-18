/* The Rs 49 lifetime listing card on the directory "application status" screen. Pays by UPI through functions/upi-pay (no account needed);
   the application reference and enrolment number identify the applicant. Paying does not publish the profile: the moderator still decides. */
(function () {
  var R = window.React; if (!R) return;
  var h = R.createElement, cfg = window.LS_CONFIG || {};
  var url = function (a) { return (cfg.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/upi-pay?action=' + a; };
  function call(action, body) {
    return fetch(url(action), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || 'Something went wrong.'); return j; }); });
  }
  function loadQr() {
    return window.qrcode ? Promise.resolve() : new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = res; s.onerror = function () { rej(new Error('qr')); }; document.head.appendChild(s); });
  }
  var rupees = function (p) { return '₹' + (p / 100).toFixed(2); };
  var box = { border: '1px solid #E5E5E5', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' };
  var btn = function (dark) { return { height: 44, padding: '0 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: dark ? 0 : '1px solid #E5E5E5', background: dark ? '#0A0A0A' : '#fff', color: dark ? '#fff' : '#0A0A0A', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }; };

  function Card(p) {
    var st = R.useState({ phase: 'loading' }), s = st[0], setS = st[1], qrS = R.useState(''), qr = qrS[0], setQr = qrS[1];
    var body = { application_id: p.id, enr: p.enr };
    R.useEffect(function () { var dead = false; call('dir_status', body).then(function (r) { if (!dead) setS(r.paid ? { phase: 'paid', amount: r.amount } : { phase: r.enabled === false ? 'off' : 'idle' }); }).catch(function (e) { if (!dead) setS({ phase: 'error', msg: e.message }); }); return function () { dead = true; }; }, [p.id]);
    R.useEffect(function () {
      if (s.phase !== 'pay') return; var dead = false;
      loadQr().then(function () { var q = window.qrcode(0, 'M'); q.addData(s.order.link); q.make(); if (!dead) setQr(q.createSvgTag({ cellSize: 5, margin: 2, scalable: true })); }).catch(function () {});
      var t = setInterval(function () { call('dir_status', Object.assign({ order_no: s.order.order_no }, body)).then(function (r) { if (!dead && r.paid) setS({ phase: 'paid', amount: r.amount }); }).catch(function () {}); }, 5000);
      var stop = setTimeout(function () { clearInterval(t); }, 30 * 60e3);
      return function () { dead = true; clearInterval(t); clearTimeout(stop); };
    }, [s.phase]);
    var start = function () { setS({ phase: 'creating' }); call('dir_create', body).then(function (r) { setS(r.paid ? { phase: 'paid', amount: r.amount } : { phase: 'pay', order: r }); }).catch(function (e) { setS({ phase: 'error', msg: e.message }); }); };
    var head = h('div', { style: { fontWeight: 600, fontSize: 15 } }, 'Lifetime listing: ₹49, one-time');
    var note = h('div', { style: { fontSize: 13, color: '#5E5E5E' } }, 'No monthly subscription, no annual renewal, no commission. Paying does not publish your profile: it is published when a moderator verifies your documents.');
    if (s.phase === 'loading') return null;
    if (s.phase === 'off') return null;   // UPI not switched on: show nothing rather than a dead button
    if (s.phase === 'paid') return h('div', { role: 'status', style: Object.assign({}, box, { background: '#E7F6EC', borderColor: '#BFE3CB' }) }, h('div', { style: { fontWeight: 600, color: '#137333' } }, '✓ Listing fee paid' + (s.amount ? ' (' + rupees(s.amount) + ')' : '')), h('div', { style: { fontSize: 13, color: '#363636' } }, 'Thank you. Nothing more to pay, ever, for this listing.'));
    if (s.phase === 'pay') {
      var o = s.order;
      return h('div', { style: box }, head,
        h('div', { style: { fontSize: 14 } }, 'Pay exactly ', h('b', null, rupees(o.amount)), ' by UPI. The paise identify your payment, so please do not round it.'),
        h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' } },
          h('div', { style: { width: 180, height: 180, border: '1px solid #E5E5E5', borderRadius: 12, padding: 8, boxSizing: 'border-box' }, dangerouslySetInnerHTML: { __html: qr || '' } }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#363636' } }, h('a', { href: o.link, style: btn(true) }, 'Open my UPI app'), h('div', null, 'or scan the code, or pay to ', h('b', null, o.upi_id)), h('div', { style: { color: '#5E5E5E' } }, 'This page confirms automatically within a minute or two of your payment.'))),
        note);
    }
    return h('div', { style: box }, head, note, s.phase === 'error' ? h('div', { role: 'alert', style: { color: '#B42318', fontSize: 13 } }, s.msg) : null,
      h('div', null, h('button', { type: 'button', style: btn(true), disabled: s.phase === 'creating', onClick: start }, s.phase === 'creating' ? 'Preparing…' : 'Pay ₹49 by UPI')));
  }
  window.LSDirPay = { card: function (app, det) { var enr = (det && det.enr) || (app && app.enr) || ''; return app && app.id && enr && app.status !== 'rejected' && cfg.supabaseUrl ? h(Card, { key: 'pay-' + app.id, id: app.id, enr: enr }) : null; } };
})();

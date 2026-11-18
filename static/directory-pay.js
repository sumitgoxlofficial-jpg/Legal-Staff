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

  var rzUrl = function (a) { return (cfg.supabaseUrl || '').replace(/\/$/, '') + '/functions/v1/listing-razorpay?action=' + a; };
  function rzCall(action, body) {
    return fetch(rzUrl(action), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || 'Something went wrong.'); return j; }); });
  }
  function loadRzp() {
    return window.Razorpay ? Promise.resolve() : new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = function () { rej(new Error('Could not load the payment window. Check your connection and try again.')); }; document.head.appendChild(s); });
  }

  function Card(p) {
    var st = R.useState({ phase: 'loading' }), s = st[0], setS = st[1], qrS = R.useState(''), qr = qrS[0], setQr = qrS[1], ws = R.useState({ upi: false, rzp: false }), way = ws[0], setWay = ws[1];
    var body = { application_id: p.id, enr: p.enr };
    R.useEffect(function () {
      var dead = false;
      Promise.all([call('dir_status', body).catch(function () { return { paid: false, enabled: false }; }), rzCall('config', {}).catch(function () { return { enabled: false }; })]).then(function (r) {
        if (dead) return; var w = { upi: r[0].enabled !== false && !r[0].paid, rzp: !!r[1].enabled };
        setWay(w); setS(r[0].paid ? { phase: 'paid', amount: r[0].amount } : (w.upi || w.rzp) ? { phase: 'idle' } : { phase: 'off' });
        if (!r[0].paid && w.rzp) rzCall('status', body).then(function (x) { if (!dead && x.paid) setS({ phase: 'paid', amount: x.amount }); }).catch(function () {});
      });
      return function () { dead = true; };
    }, [p.id]);
    R.useEffect(function () {
      if (s.phase !== 'pay') return; var dead = false;
      loadQr().then(function () { var q = window.qrcode(0, 'M'); q.addData(s.order.link); q.make(); if (!dead) setQr(q.createSvgTag({ cellSize: 5, margin: 2, scalable: true })); }).catch(function () {});
      var t = setInterval(function () { call('dir_status', Object.assign({ order_no: s.order.order_no }, body)).then(function (r) { if (!dead && r.paid) setS({ phase: 'paid', amount: r.amount }); }).catch(function () {}); }, 5000);
      var stop = setTimeout(function () { clearInterval(t); }, 30 * 60e3);
      return function () { dead = true; clearInterval(t); clearTimeout(stop); };
    }, [s.phase]);
    var startUpi = function () { setS({ phase: 'creating' }); call('dir_create', body).then(function (r) { setS(r.paid ? { phase: 'paid', amount: r.amount } : { phase: 'pay', order: r }); }).catch(function (e) { setS({ phase: 'error', msg: e.message }); }); };
    var startRzp = function () {
      setS({ phase: 'creating' });
      Promise.all([rzCall('create', body), loadRzp()]).then(function (r) {
        var o = r[0]; if (o.paid) return setS({ phase: 'paid', amount: o.amount });
        var box = new window.Razorpay({ key: o.key_id, order_id: o.order_id, amount: o.amount, currency: o.currency, name: 'Legal Staff', description: 'Lifetime directory listing', theme: { color: '#0A0A0A' },
          handler: function (resp) { setS({ phase: 'checking' }); rzCall('verify', Object.assign({ razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature }, body)).then(function (v) { setS(v.paid ? { phase: 'paid', amount: v.amount } : { phase: 'error', msg: 'We could not confirm the payment yet. If money was deducted it will be confirmed shortly; refresh this page in a few minutes.' }); }).catch(function (e) { setS({ phase: 'error', msg: e.message + ' If money was deducted it will be confirmed shortly; refresh this page in a few minutes.' }); }); },
          modal: { ondismiss: function () { setS(function (c) { return c.phase === 'checking' ? c : { phase: 'idle' }; }); } } });
        box.on('payment.failed', function (f) { setS({ phase: 'error', msg: (f && f.error && f.error.description) || 'The payment failed. You have not been charged; please try again.' }); });
        box.open();
      }).catch(function (e) { setS({ phase: 'error', msg: e.message }); });
    };
    var head = h('div', { style: { fontWeight: 600, fontSize: 15 } }, 'Lifetime listing: \u20b949, one-time');
    var note = h('div', { style: { fontSize: 13, color: '#5E5E5E' } }, 'No monthly subscription, no annual renewal, no commission. Paying does not publish your profile: it is published when a moderator verifies your documents.');
    if (s.phase === 'loading' || s.phase === 'off') return null;   // nothing to show until a payment way is switched on
    if (s.phase === 'paid') return h('div', { role: 'status', style: Object.assign({}, box, { background: '#E7F6EC', borderColor: '#BFE3CB' }) }, h('div', { style: { fontWeight: 600, color: '#137333' } }, '\u2713 Listing fee paid' + (s.amount ? ' (' + rupees(s.amount) + ')' : '')), h('div', { style: { fontSize: 13, color: '#363636' } }, 'Thank you. Nothing more to pay, ever, for this listing.'));
    if (s.phase === 'pay') {
      var o = s.order;
      return h('div', { style: box }, head,
        h('div', { style: { fontSize: 14 } }, 'Pay exactly ', h('b', null, rupees(o.amount)), ' by UPI. The paise identify your payment, so please do not round it.'),
        h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' } },
          h('div', { style: { width: 180, height: 180, border: '1px solid #E5E5E5', borderRadius: 12, padding: 8, boxSizing: 'border-box' }, dangerouslySetInnerHTML: { __html: qr || '' } }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#363636' } }, h('a', { href: o.link, style: btn(true) }, 'Open my UPI app'), h('div', null, 'or scan the code, or pay to ', h('b', null, o.upi_id)), h('div', { style: { color: '#5E5E5E' } }, 'This page confirms automatically within a minute or two of your payment.'))),
        note);
    }
    var busyNow = s.phase === 'creating' || s.phase === 'checking';
    return h('div', { style: box }, head, note, s.phase === 'error' ? h('div', { role: 'alert', style: { color: '#B42318', fontSize: 13 } }, s.msg) : null, s.phase === 'checking' ? h('div', { role: 'status', style: { fontSize: 13 } }, 'Confirming your payment\u2026') : null,
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        way.rzp ? h('button', { type: 'button', style: btn(true), disabled: busyNow, onClick: startRzp }, busyNow ? 'Please wait\u2026' : 'Pay \u20b949 by card, netbanking or UPI') : null,
        way.upi ? h('button', { type: 'button', style: btn(!way.rzp), disabled: busyNow, onClick: startUpi }, 'Pay \u20b949 by UPI QR') : null));
  }
  window.LSDirPay = { card: function (app, det) { var enr = (det && det.enr) || (app && app.enr) || ''; return app && app.id && enr && app.status !== 'rejected' && cfg.supabaseUrl ? h(Card, { key: 'pay-' + app.id, id: app.id, enr: enr }) : null; } };
})();

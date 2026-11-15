/* Legal Staff — behaviour for static content pages: nav dropdowns, mobile menu, scroll reveals and the booking form. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- dropdowns: click/tap to toggle, Escape and outside click to close ---- */
  $$('.nav-dd').forEach(function (dd) {
    var btn = $('.nav-dd-btn', dd);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !dd.classList.contains('open');
      $$('.nav-dd.open').forEach(function (o) { o.classList.remove('open'); $('.nav-dd-btn', o).setAttribute('aria-expanded', 'false'); });
      dd.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function () { $$('.nav-dd.open').forEach(function (o) { o.classList.remove('open'); $('.nav-dd-btn', o).setAttribute('aria-expanded', 'false'); }); });

  /* ---- mobile menu ---- */
  var burger = $('.nav-burger'), mnav = $('#mobile-nav');
  if (burger && mnav) burger.addEventListener('click', function () {
    var open = mnav.hasAttribute('hidden');
    if (open) mnav.removeAttribute('hidden'); else mnav.setAttribute('hidden', '');
    burger.setAttribute('aria-expanded', String(open));
  });

  /* ---- scroll reveals (motion.css .ls-reveal / .ls-reveal-scale) ---- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = $$('.ls-reveal, .ls-reveal-scale, .timeline li');
  if (reduce || !('IntersectionObserver' in window)) targets.forEach(function (el) { el.classList.add('ls-in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('ls-in'); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---- booking modal ---- */
  var modal = $('#book'); if (!modal) return;
  var form = $('.book-form', modal), err = $('.form-err', modal), lastFocus = null, source = 'Site';
  function openModal(src, topic) {
    source = src || 'Site'; lastFocus = document.activeElement;
    $('.book-form-wrap', modal).hidden = false; $('.book-done', modal).hidden = true; err.hidden = true;
    if (topic) { var sel = form.elements.topic; for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === topic) sel.selectedIndex = i; }
    modal.hidden = false; modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open');
    setTimeout(function () { form.elements.name.focus(); }, 30);
  }
  function closeModal() { modal.hidden = true; modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('modal-open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-book]');
    if (b) { e.preventDefault(); openModal(b.getAttribute('data-book') + ' · ' + location.pathname, b.getAttribute('data-topic')); }
    if (e.target.closest && e.target.closest('[data-close]') && modal.contains(e.target)) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!modal.hidden) closeModal(); $$('.nav-dd.open').forEach(function (o) { o.classList.remove('open'); }); }
    if (e.key === 'Tab' && !modal.hidden) { var f = $$('input,select,textarea,button', modal).filter(function (x) { return !x.closest('[hidden]'); }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  });
  if (/[?&]book=1/.test(location.search)) openModal('URL · ' + location.pathname);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = {}; ['name', 'phone', 'email', 'firm', 'topic', 'message'].forEach(function (k) { v[k] = (form.elements[k].value || '').trim(); });
    var bad = !v.name ? 'Enter your name.' : v.phone.replace(/\D/g, '').length < 10 ? 'Enter a 10-digit phone number.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? 'Enter a valid email address.' : !form.elements.consent.checked ? 'Tick the box so we can contact you.' : '';
    if (bad) { err.textContent = bad; err.hidden = false; return; }
    err.hidden = true;
    var btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Sending…';
    var row = { name: v.name, email: v.email, phone: v.phone, firm: v.firm, topic: v.topic, message: v.message, source: source.slice(0, 200) };
    var cfg = window.LS_CONFIG || {};
    var done = function (remote) {
      btn.disabled = false; btn.textContent = 'Request a call back';
      $('.book-done-text', modal).textContent = remote ? 'Thanks, ' + v.name.split(' ')[0] + '. A practising professional will call you back within one working day.' : 'Saved in this browser. The server is not connected, so please also email or call us to be sure we receive it.';
      $('.book-form-wrap', modal).hidden = true; $('.book-done', modal).hidden = false; form.reset();
    };
    if (cfg.supabaseUrl && cfg.supabaseKey && window.fetch) {
      fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/contact_requests', { method: 'POST', headers: { apikey: cfg.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) })
        .then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); }); done(true); })
        .catch(function () { btn.disabled = false; btn.textContent = 'Request a call back'; err.textContent = 'Could not send just now. Check your connection and try again.'; err.hidden = false; });
    } else {
      try { var a = JSON.parse(localStorage.getItem('ls.contact.requests') || '[]'); a.push(Object.assign({ at: new Date().toISOString() }, row)); localStorage.setItem('ls.contact.requests', JSON.stringify(a)); } catch (x) {}
      done(false);
    }
  });
})();

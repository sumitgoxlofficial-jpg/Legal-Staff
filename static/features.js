/* Legal Staff — interactive UI preview cards on /features/<slug> (sample data only; nothing is saved). */
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- order: read → highlight next-date paragraph → confirm chip ---- */
  $$('[data-fp="order"]').forEach(function (card) {
    var btn = card.querySelector('[data-act="read"]'), chip = card.querySelector('.fp-chip'), sum = card.querySelector('.fp-sum'), status = card.querySelector('.fp-status');
    var paras = $$('.fp-para', card), next = card.querySelector('[data-next]'), state = 'idle';
    function reset() {
      paras.forEach(function (p) { p.classList.remove('is-scan', 'is-next'); });
      chip.hidden = true; sum.hidden = true; chip.classList.remove('is-done');
      chip.querySelector('.fp-chip-t span').innerHTML = 'Next date: <b>14 Jan 2027</b> · Final hearing · para 4';
      var c = chip.querySelector('[data-act]'); c.textContent = 'Confirm'; c.setAttribute('data-act', 'confirm');
      btn.lastChild.textContent = 'Read order'; btn.disabled = false; status.textContent = 'Nothing is saved in this preview'; state = 'idle';
    }
    btn.addEventListener('click', function () {
      if (state !== 'idle') { reset(); return; }
      state = 'reading'; btn.disabled = true; status.textContent = 'Reading order…';
      paras.forEach(function (p, i) { setTimeout(function () { paras.forEach(function (q) { q.classList.remove('is-scan'); }); p.classList.add('is-scan'); }, i * 220); });
      setTimeout(function () {
        paras.forEach(function (q) { q.classList.remove('is-scan'); });
        next.classList.add('is-next'); sum.hidden = false; chip.hidden = false;
        status.textContent = 'Next date found in para 4 — waiting for your confirmation';
        btn.disabled = false; btn.lastChild.textContent = 'Reset'; state = 'read';
      }, paras.length * 220 + 120);
    });
    chip.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      if (b.getAttribute('data-act') === 'confirm') {
        chip.classList.add('is-done');
        chip.querySelector('.fp-chip-t span').innerHTML = '<b>Added to diary</b> · 14 Jan 2027 · reminders scheduled';
        b.textContent = 'Undo'; b.setAttribute('data-act', 'undo'); status.textContent = 'Confirmed by the advocate';
      } else {
        chip.classList.remove('is-done');
        chip.querySelector('.fp-chip-t span').innerHTML = 'Next date: <b>14 Jan 2027</b> · Final hearing · para 4';
        b.textContent = 'Confirm'; b.setAttribute('data-act', 'confirm'); status.textContent = 'Next date found in para 4 — waiting for your confirmation';
      }
    });
  });

  /* ---- chat: emoji reactions toggle (the tabs are handled with the WhatsApp card below) ---- */
  $$('[data-fp="chat"] .fp-react').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true', n = +b.getAttribute('data-n') + (on ? 1 : -1);
      b.setAttribute('aria-pressed', on); b.setAttribute('data-n', n); b.classList.toggle('is-on', on); b.querySelector('b').textContent = n;
    });
  });

  /* ---- whatsapp and chat: tabs ---- */
  $$('[data-fp="whatsapp"],[data-fp="chat"]').forEach(function (card) {
    var tabs = $$('[role="tab"]', card);
    function select(t) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
      $$('[data-panel]', card).forEach(function (p) {
        var on = p.getAttribute('data-panel') === t.getAttribute('data-tab'); p.hidden = !on;
        if (on) $$('.fp-bub,.fp-msg', p).forEach(function (b, i) { b.classList.remove('is-in'); void b.offsetWidth; b.style.animationDelay = (i * 160) + 'ms'; b.classList.add('is-in'); });
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n);
      });
    });
  });

  /* ---- diary: resolve clash ---- */
  $$('[data-fp="diary"]').forEach(function (card) {
    var alert = card.querySelector('.fp-alert'), btn = alert.querySelector('[data-act]'), day = card.querySelector('.fp-day.has-clash');
    var moved = card.querySelector('[data-move]'), owner = moved.querySelector('[data-owner]'), text = alert.querySelector('.fp-alert-t');
    var orig = text.innerHTML;
    btn.addEventListener('click', function () {
      var resolved = alert.classList.toggle('is-ok');
      day.classList.toggle('has-clash', !resolved);
      $$('.fp-ev', day).forEach(function (e) { e.classList.toggle('is-clash', !resolved); });
      moved.classList.toggle('is-moved', resolved);
      owner.textContent = resolved ? 'Court 12 · Junior' : 'Court 12 · You';
      text.innerHTML = resolved ? '<span class="fp-flag ok">Resolved</span>C.S. ____/2026 assigned to your junior. Diary, board and reminders updated.' : orig;
      btn.textContent = resolved ? 'Undo' : 'Assign to junior';
    });
  });

  /* ---- research: switch question, open citations ---- */
  $$('[data-fp="research"]').forEach(function (card) {
    var qs = $$('[data-q]', card);
    qs.forEach(function (q) {
      q.addEventListener('click', function () {
        qs.forEach(function (x) { var on = x === q; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
        $$('[data-ans]', card).forEach(function (a) { a.hidden = a.getAttribute('data-ans') !== q.getAttribute('data-q'); });
      });
    });
    $$('[data-ref]', card).forEach(function (r) {
      r.addEventListener('click', function () {
        var d = card.querySelector('#fp-' + r.getAttribute('data-ref')); if (!d) return;
        d.open = !d.open; if (d.open) { d.classList.remove('is-flash'); void d.offsetWidth; d.classList.add('is-flash'); }
      });
    });
  });

  /* ---- vault: filter by folder ---- */
  $$('[data-fp="vault"]').forEach(function (card) {
    var btns = $$('[data-folder]', card), items = $$('[data-in]', card), head = card.querySelector('.fp-files-h');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-folder'), n = 0;
        btns.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
        items.forEach(function (it) { var show = k === 'all' || it.getAttribute('data-in') === k; it.hidden = !show; if (show) n++; });
        head.textContent = n + (n === 1 ? ' document' : ' documents') + (k === 'all' ? '' : ' in ' + b.querySelector('span').textContent);
      });
    });
  });

  /* ---- board: tick tasks ---- */
  $$('[data-fp="board"]').forEach(function (card) {
    var boxes = $$('input[type="checkbox"]', card), out = card.querySelector('[data-done]'), bar = card.querySelector('.fp-bar i');
    function update() {
      var d = boxes.filter(function (b) { return b.checked; }).length;
      out.textContent = d; bar.style.width = Math.round(d / boxes.length * 100) + '%';
      card.classList.toggle('is-all', d === boxes.length);
    }
    boxes.forEach(function (b) { b.addEventListener('change', update); });
  });
})();

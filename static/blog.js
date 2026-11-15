/* Legal Staff — blog behaviour. Hub: client-side search and pillar filters (every card is already in the static HTML; this only hides/shows).
   Articles: highlights the current section in the sidebar table of contents. */
(function () {
  'use strict';
  var root = document.querySelector('.blog-tools'); if (!root) return;
  var q = document.getElementById('blog-q');
  var btns = Array.prototype.slice.call(root.querySelectorAll('[data-filter]'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.post-card[data-pillar]'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.blog-group'));
  var count = root.querySelector('.blog-count');
  var empty = document.querySelector('.blog-empty');
  var filter = 'all';

  function apply() {
    var terms = (q.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    var shown = 0;
    cards.forEach(function (c) {
      // Match at the start of a word, so "din" finds DIN but not "including".
      var hay = ' ' + (c.getAttribute('data-search') || '').replace(/[^a-z0-9₹+]+/g, ' ');
      var ok = (filter === 'all' || c.getAttribute('data-pillar') === filter) && terms.every(function (t) { return hay.indexOf(' ' + t.replace(/[^a-z0-9₹+]+/g, ' ').trim()) !== -1; });
      c.hidden = !ok; if (ok) { shown++; c.classList.add('ls-in'); }
    });
    groups.forEach(function (g) {
      var inFilter = filter === 'all' || g.getAttribute('data-group') === filter;
      var visible = g.querySelectorAll('.post-card:not([hidden])').length;
      g.hidden = !inFilter || (terms.length > 0 && visible === 0);
    });
    var filtered = filter !== 'all' || terms.length;
    count.textContent = filtered ? (shown === 1 ? '1 guide' : shown + ' guides') + ' shown' : '';
    if (empty) empty.hidden = shown !== 0;
  }

  function setFilter(f) {
    filter = f;
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === f)); });
    apply();
  }

  btns.forEach(function (b) { b.addEventListener('click', function () { setFilter(b.getAttribute('data-filter')); }); });
  q.addEventListener('input', apply);

  // ?q=term pre-fills the search (links from other pages / site search).
  var m = /[?&]q=([^&]+)/.exec(location.search);
  if (m) { try { q.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) {} apply(); }
})();

(function () {
  'use strict';
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-desktop a[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;
  var byId = {}; links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var heads = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.remove('is-current'); });
      var a = byId[e.target.id]; if (a) a.classList.add('is-current');
    });
  }, { rootMargin: '-90px 0px -65% 0px' });
  heads.forEach(function (h) { io.observe(h); });
})();

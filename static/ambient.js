/* Legal Staff — ambient graphics and motion for every light (white / paper) section of the public site.
   Self-contained: injects its own styles, finds light top-level sections (also after React renders them),
   and adds a decorative, aria-hidden layer behind the content: a dot grid, soft silver glows,
   floating legal line-icons, a flowing dashed path, an orbiting ring and a cursor spotlight.
   Monochrome to match the brand (ink #0A0A0A on paper). Respects prefers-reduced-motion. */
(function () {
  'use strict';
  if (window.__lsAmbient) return; window.__lsAmbient = true;
  var doc = document, reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = [
    '.ls-amb-host{position:relative;isolation:isolate}',
    '.ls-amb{position:absolute;top:0;bottom:0;left:0;width:100%;z-index:-1;pointer-events:none;overflow:hidden;contain:strict}',
    '.ls-amb-grid{position:absolute;inset:0;background-image:radial-gradient(rgba(10,10,10,.13) 1px,transparent 1.4px);background-size:26px 26px;-webkit-mask-image:radial-gradient(ellipse 60% 70% at var(--gx,85%) var(--gy,20%),#000 0%,transparent 70%);mask-image:radial-gradient(ellipse 60% 70% at var(--gx,85%) var(--gy,20%),#000 0%,transparent 70%);}',
    '.ls-amb-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(10,10,10,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(10,10,10,.05) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(ellipse 50% 60% at var(--gx,15%) var(--gy,80%),#000 0%,transparent 72%);mask-image:radial-gradient(ellipse 50% 60% at var(--gx,15%) var(--gy,80%),#000 0%,transparent 72%);}',
    '.ls-amb-glow{position:absolute;width:min(560px,80vw);aspect-ratio:1;border-radius:50%;background:radial-gradient(closest-side,rgba(160,160,160,.20),rgba(220,220,220,.10) 55%,transparent);animation:ls-amb-blob 18s ease-in-out infinite;will-change:transform}',
    '.ls-amb-glow.b{animation-duration:23s;animation-direction:reverse;background:radial-gradient(closest-side,rgba(10,10,10,.06),transparent)}',
    '.ls-amb-ic{position:absolute;color:#0A0A0A;opacity:0;transition:opacity 1.2s ease}',
    '.ls-amb-on .ls-amb-ic{opacity:var(--o,.10)}',
    '.ls-amb-ic svg{display:block;width:100%;height:100%;animation:ls-amb-float var(--d,9s) ease-in-out var(--dl,0s) infinite;will-change:transform}',
    '.ls-amb-ic .p{transform:translateY(calc(var(--par,0) * 1px));transition:transform .2s linear;width:100%;height:100%}',
    '.ls-amb-path{position:absolute;left:0;width:100%;height:200px;overflow:visible}',
    '.ls-amb-path path{fill:none;stroke:#0A0A0A;stroke-opacity:.10;stroke-width:1.4;stroke-dasharray:3 9}',
    '.ls-amb-path path.solid{stroke-opacity:.07;stroke-dasharray:1600;stroke-dashoffset:1600;transition:stroke-dashoffset 3.2s cubic-bezier(.2,.7,.2,1);animation:none}',
    '.ls-amb-on .ls-amb-path path.solid{stroke-dashoffset:0}',
    '.ls-amb-path circle{fill:#0A0A0A;fill-opacity:.35}',
    '.ls-amb-orbit{position:absolute;width:220px;height:220px;border:1px dashed rgba(10,10,10,.12);border-radius:50%;animation:ls-spin 60s linear infinite;will-change:transform}',
    '.ls-amb-orbit::before{content:"";position:absolute;inset:34px;border:1px solid rgba(10,10,10,.07);border-radius:50%}',
    '.ls-amb-orbit i{position:absolute;left:50%;top:-4px;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#0A0A0A;opacity:.35;box-shadow:0 0 0 6px rgba(10,10,10,.05)}',
    '.ls-amb-spot{position:absolute;width:460px;height:460px;left:0;top:0;margin:-230px 0 0 -230px;border-radius:50%;background:radial-gradient(closest-side,rgba(10,10,10,.05),transparent);opacity:0;transition:opacity .5s ease;will-change:transform}',
    '.ls-amb-host:hover>.ls-amb .ls-amb-spot{opacity:1}',
    '.ls-amb-spark{position:absolute;width:6px;height:6px;border-radius:50%;background:#0A0A0A;opacity:0;animation:ls-amb-spark var(--d,6s) ease-in-out var(--dl,0s) infinite}',
    '@keyframes ls-amb-blob{0%,100%{transform:translate3d(0,0,0) scale(1)}33%{transform:translate3d(6%,-8%,0) scale(1.08)}66%{transform:translate3d(-5%,6%,0) scale(.94)}}',
    '@keyframes ls-amb-float{0%,100%{transform:translateY(0) rotate(var(--r0,-4deg))}50%{transform:translateY(-14px) rotate(var(--r1,4deg))}}',
    '@keyframes ls-amb-spark{0%,100%{opacity:0;transform:translateY(0) scale(.4)}40%{opacity:.28;transform:translateY(-18px) scale(1)}80%{opacity:0;transform:translateY(-40px) scale(.6)}}',
    '@keyframes ls-spin{to{transform:rotate(360deg)}}',
    '@media (max-width:760px){.ls-amb-ic.m-hide,.ls-amb-orbit,.ls-amb-spark{display:none}.ls-amb-on .ls-amb-ic{opacity:calc(var(--o,.10) * .7)}}',
    '@media (prefers-reduced-motion:reduce){.ls-amb *{animation:none!important;transition:none!important}.ls-amb-spot{display:none}.ls-amb-path path.solid{stroke-dashoffset:0}}',
    '@media print{.ls-amb{display:none}}'
  ].join('\n');
  var st = doc.createElement('style'); st.id = 'ls-ambient-css'; st.textContent = css; doc.head.appendChild(st);

  /* Line icons drawn in a 24x24 box, stroke only. */
  var ICONS = {
    scales: 'M12 3v18M7 21h10M4 7h16M12 5l0 2M6 7l-3 6a3.2 3.2 0 0 0 6 0zM18 7l-3 6a3.2 3.2 0 0 0 6 0z',
    gavel: 'M14 4l6 6M12 6l6 6M13 5l-4 4 6 6 4-4M11 11l-8 8M3 21h9',
    doc: 'M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 14h7M9 17h5',
    cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h2M12 14h2M8 17h2',
    pillar: 'M3 21h18M4 18h16M5 18V9M9 18V9M15 18V9M19 18V9M3 9h18M12 3l9 5H3z',
    seal: 'M12 3l2.2 1.6 2.7-.1.9 2.6 2.2 1.6-.8 2.6.8 2.6-2.2 1.6-.9 2.6-2.7-.1L12 21l-2.2-1.6-2.7.1-.9-2.6-2.2-1.6.8-2.6-.8-2.6 2.2-1.6.9-2.6 2.7.1zM9 12l2 2 4-4',
    book: 'M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 2h13v-4M8 7h7M8 10h5',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    pen: 'M4 20l4-1 11-11-3-3L5 16zM14 7l3 3M4 20h16',
    clip: 'M8 4h8v3H8zM6 5H5v16h14V5h-1M9 12l2 2 4-4M9 17h6'
  };
  var ORDER = ['scales', 'doc', 'gavel', 'cal', 'pillar', 'seal', 'book', 'bell', 'pen', 'clip'];

  /* Positions: kept in the side gutters so text stays clean. [left%, top%, size px, opacity] */
  var LAYOUTS = [
    [[4, 14, 56, .11], [90, 22, 72, .09], [8, 70, 44, .10], [86, 74, 50, .10], [96, 48, 30, .07]],
    [[88, 10, 64, .10], [5, 30, 52, .10], [92, 62, 46, .09], [12, 84, 60, .08], [2, 56, 28, .07]],
    [[6, 46, 70, .09], [84, 14, 48, .11], [90, 82, 64, .08], [16, 10, 36, .09], [97, 50, 28, .07]],
    [[92, 40, 58, .10], [3, 12, 46, .10], [6, 80, 66, .08], [80, 88, 38, .09], [3, 46, 30, .07]]
  ];

  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="' + ICONS[name] + '"/></svg>';
  }

  function lum(c) {
    var m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    var p = m[1].split(',').map(parseFloat); if (p.length > 3 && p[3] < 0.5) return null;
    return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
  }
  function isLight(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && /gradient|url/.test(cs.backgroundImage) && n === el) {
        var L0 = lum(cs.backgroundColor); if (L0 !== null && L0 < 0.85) return false;
      }
      var L = lum(cs.backgroundColor);
      if (L !== null) return L > 0.88;
    }
    return true;
  }

  var count = 0;
  function decorate(sec) {
    if (sec.__lsAmb) return;
    if (sec.closest('[role=dialog],.modal,.modal-card,dialog,.site-header,.site-footer,footer,nav,form') ||
        (sec.parentElement && sec.parentElement.closest('section,.section,.ls-amb-host'))) { sec.__lsAmb = true; return; }
    if (sec.offsetHeight < 200) return; /* not rendered yet: try again on a later scan */
    sec.__lsAmb = true;
    if (!isLight(sec)) return;
    var cs = getComputedStyle(sec);
    var i = count++, lay = LAYOUTS[i % LAYOUTS.length];
    sec.classList.add('ls-amb-host');
    if (cs.position === 'static') sec.style.position = 'relative';

    var h = '';
    var gx = (i % 2 ? 12 : 88) + '%', gy = (i % 3 === 0 ? 18 : i % 3 === 1 ? 50 : 80) + '%';
    h += '<div class="ls-amb-grid" style="--gx:' + gx + ';--gy:' + gy + '"></div>';
    h += '<div class="ls-amb-lines" style="--gx:' + (i % 2 ? '88%' : '10%') + ';--gy:' + (i % 2 ? '20%' : '85%') + '"></div>';
    h += '<div class="ls-amb-glow" style="' + (i % 2 ? 'left:-12%;top:-20%' : 'right:-10%;top:-25%') + '"></div>';
    h += '<div class="ls-amb-glow b" style="' + (i % 2 ? 'right:-14%;bottom:-30%' : 'left:-12%;bottom:-30%') + '"></div>';

    /* flowing path */
    var top = (i % 2 ? 30 : 62);
    var d = i % 2 ? 'M-20 120 C 220 10, 420 190, 720 90 S 1180 20, 1460 130' : 'M-20 60 C 260 170, 520 0, 820 100 S 1220 180, 1460 40';
    h += '<svg class="ls-amb-path" style="top:' + top + '%;transform:translateY(-50%)" viewBox="0 0 1440 200" preserveAspectRatio="none"><path class="solid" d="' + d + '"/><path d="' + d + '"/>' +
      '<circle r="3"><animateMotion dur="' + (14 + i % 4 * 3) + 's" repeatCount="indefinite" path="' + d + '"/></circle></svg>';

    /* orbit ring on alternating sides */
    h += '<div class="ls-amb-orbit" style="' + (i % 2 ? 'left:-70px;bottom:8%' : 'right:-70px;top:10%') + ';animation-direction:' + (i % 2 ? 'reverse' : 'normal') + '"><i></i></div>';

    /* floating icons */
    lay.forEach(function (p, k) {
      var name = ORDER[(i * 3 + k) % ORDER.length];
      h += '<div class="ls-amb-ic' + (k > 2 ? ' m-hide' : '') + '" data-par="' + (k % 2 ? -1 : 1) * (0.04 + k * 0.015) + '" style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + p[2] + 'px;height:' + p[2] + 'px;--o:' + p[3] +
        ';--d:' + (8 + (k * 1.7 + i) % 6) + 's;--dl:' + (-k * 1.3) + 's;--r0:' + (k % 2 ? 5 : -5) + 'deg;--r1:' + (k % 2 ? -3 : 4) + 'deg;transform:translate(-50%,-50%)"><div class="p">' + svg(name) + '</div></div>';
    });

    /* rising sparks */
    for (var s = 0; s < 6; s++) {
      var sx = s < 3 ? 6 + s * 7 + (i % 3) * 2 : 74 + (s - 3) * 8 - (i % 3) * 2;
      h += '<span class="ls-amb-spark" style="left:' + sx + '%;top:' + (30 + (s * 17 + i * 11) % 55) + '%;--d:' + (5 + s % 3 * 1.5) + 's;--dl:' + (-s * 1.1) + 's"></span>';
    }
    h += '<div class="ls-amb-spot"></div>';

    var layer = doc.createElement('div');
    layer.className = 'ls-amb'; layer.setAttribute('aria-hidden', 'true'); layer.innerHTML = h;
    sec.appendChild(layer);
    hosts.push(sec); bleed(sec);
    if (io) io.observe(sec); else layer.classList.add('ls-amb-on');

    if (!reduce) {
      var spot = layer.querySelector('.ls-amb-spot'), raf = 0;
      sec.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        var r = layer.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        if (raf) return; raf = requestAnimationFrame(function () { raf = 0; spot.style.transform = 'translate(' + x + 'px,' + y + 'px)'; });
      }, { passive: true });
    }
  }

  var hosts = [];
  /* Constrained sections (max-width) get a full-bleed layer sized to the page width, never wider (no sideways scroll). */
  function bleed(sec) {
    var l = sec.querySelector(':scope>.ls-amb'); if (!l) return;
    var vw = doc.documentElement.clientWidth, r = sec.getBoundingClientRect(), bl = parseFloat(getComputedStyle(sec).borderLeftWidth) || 0;
    l.style.left = (-r.left - bl) + 'px'; l.style.width = vw + 'px';
  }
  var rz = 0;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { hosts.forEach(bleed); }, 100); });
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var l = e.target.querySelector(':scope>.ls-amb'); if (!l) return;
      if (e.isIntersecting) l.classList.add('ls-amb-on');
      /* pause animations when off screen */
      l.style.animationPlayState = '';
      Array.prototype.forEach.call(l.querySelectorAll('*'), function (n) { n.style.animationPlayState = e.isIntersecting ? '' : 'paused'; });
    });
  }, { threshold: 0.08 }) : null;

  /* gentle parallax for icons */
  var ticking = false;
  function parallax() {
    ticking = false; var vh = window.innerHeight;
    hosts.forEach(function (sec) {
      var r = sec.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var mid = r.top + r.height / 2 - vh / 2;
      Array.prototype.forEach.call(sec.querySelectorAll(':scope>.ls-amb .ls-amb-ic'), function (ic) {
        ic.firstChild.style.setProperty('--par', (mid * parseFloat(ic.getAttribute('data-par'))).toFixed(1));
      });
    });
  }
  if (!reduce) window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });

  var SEL = 'section, .section, .lp-section, [data-ambient]';
  function scan() {
    Array.prototype.forEach.call(doc.querySelectorAll(SEL), function (s) { if (!s.hasAttribute('data-no-ambient')) decorate(s); });
    if (!reduce) parallax();
  }
  function start() {
    scan();
    /* React-rendered pages (index, directory) add sections after load. */
    if ('MutationObserver' in window) {
      var t = 0;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 120); }).observe(doc.body, { childList: true, subtree: true });
    }
    window.addEventListener('load', scan);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})();

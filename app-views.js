/* Legal Staff — UI kit, module screens and overlays rendered from JS (React.createElement). */
(function () {
  'use strict';
  const h = React.createElement, L = window.LS, LSP = window.LSP, useState = React.useState;
  const K = { ink: '#0A0A0A', mut: '#5E5E5E', line: '#E5E5E5', soft: '#F5F5F4', soft2: '#F0F0EF', red: '#B42318', redBg: '#FDECEA', txt: '#363636' };
  const X = {
    page: { display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1320 },
    h1: { fontWeight: 600, letterSpacing: '-.025em', fontSize: 24, margin: 0, lineHeight: 1.2 },
    h2: { fontSize: 16, fontWeight: 600, margin: 0 },
    sub: { fontSize: 14, color: K.mut, marginTop: 4 },
    kicker: { fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: 600 },
    card: { background: '#FFFFFF', border: '1px solid ' + K.line, borderRadius: 12 },
    input: { height: 38, border: '1px solid ' + K.line, background: '#FFFFFF', borderRadius: 8, padding: '0 12px', fontSize: 14, color: K.ink, width: '100%', outline: 'none' },
    row: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }
  };

  /* ---------- motion helpers ---------- */
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Count a number up inside an element. Edits the existing text node in place so React keeps owning it; stops if React changes the text. */
  function countUp(el, dur) {
    if (!el || reduced() || !window.requestAnimationFrame || !document.createTreeWalker) return;
    const tn = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode(); if (!tn) return;
    const orig = tn.nodeValue, m = /^([^\d]*)(\d[\d,]*)(\.\d+)?(.*)$/.exec(orig); if (!m || m[3]) return;
    const to = +m[2].replace(/,/g, ''); if (!(to > 0) || to > 1e9) return;
    const t0 = performance.now(), d = dur || 700; let last = m[1] + '0' + m[4]; tn.nodeValue = last;
    const step = now => { if (tn.nodeValue !== last) return; const k = Math.min(1, (now - t0) / d); if (k >= 1) { tn.nodeValue = orig; return; }
      last = tn.nodeValue = m[1] + Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('en-IN') + m[4]; requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function CountUp({ value }) { const ref = React.useRef(null); React.useLayoutEffect(() => { countUp(ref.current); }, []); return h('span', { ref, className: 'ls-count' }, value); }

  /* ---------- illustrations: monochrome ink line art, soft grey fills, a silver gradient that echoes the logo ---------- */
  const INK = '#0A0A0A', LT = '#C9C9C9';
  const ln = { fill: 'none', stroke: INK, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' };
  const P = (d, o) => h('path', Object.assign({ d }, ln, o));
  const F = (d, fill, o) => h('path', Object.assign({ d }, ln, { fill }, o));
  const R = (x, y, w, hh, rx, fill, o) => h('rect', Object.assign({ x, y, width: w, height: hh, rx }, ln, { fill: fill || '#FFFFFF' }, o));
  const Ci = (cx, cy, r, fill, o) => h('circle', Object.assign({ cx, cy, r }, ln, { fill: fill || '#FFFFFF' }, o));
  const G = (className, ...k) => h('g', { className }, ...k);
  const lite = { stroke: LT };
  const bg = nb => nb ? null : h('g', null, h('circle', { cx: 80, cy: 58, r: 46, fill: '#F2F2F1' }), h('ellipse', { cx: 80, cy: 104, rx: 38, ry: 3.5, fill: '#E8E8E7' }), P('M30 30h6 M33 27v6 M128 96h6 M131 93v6', { stroke: '#BDBDBD' }));
  const spark = (x, y, r, fill) => F(`M${x} ${y - r}l${r * .28} ${r * .72} ${r * .72} ${r * .28}-${r * .72} ${r * .28}-${r * .28} ${r * .72}-${r * .28}-${r * .72}-${r * .72}-${r * .28} ${r * .72}-${r * .28}z`, fill);
  const SCENES = {
    cases: (sv, nb) => h('g', null, bg(nb),
      F('M40 44a4 4 0 0 1 4-4h22l6 6h44a4 4 0 0 1 4 4v42a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4z', '#F0F0EF'),
      R(52, 28, 50, 40, 3), P('M60 37h24 M60 44h34 M60 51h20', lite),
      F('M38 58a4 4 0 0 1 4-4h76a4 4 0 0 1 4 4l-3 34a4 4 0 0 1-4 4H45a4 4 0 0 1-4-4z', '#FFFFFF'),
      R(66, 68, 28, 9, 2, '#F0F0EF', { stroke: 'none' }), P('M70 72.5h16'),
      G('ls-art-bob', Ci(118, 34, 11, sv), P('M113 34l3.5 3.5 6-7'))),
    calendar: (sv, nb) => h('g', null, bg(nb),
      R(40, 32, 80, 64, 8), F('M40 40a8 8 0 0 1 8-8h64a8 8 0 0 1 8 8v8H40z', INK), P('M58 26v12 M102 26v12'),
      ...[0, 1, 2].map(r => [0, 1, 2, 3, 4].map(c => (r === 1 && c === 3) ? null : h('rect', { key: r + '-' + c, x: 50 + c * 13, y: 56 + r * 12, width: 8, height: 6, rx: 1.5, fill: '#E5E5E5' }))),
      Ci(93, 71, 7, sv), P('M89.5 71l2.5 2.5 4-4.5'),
      G('ls-art-bob2', Ci(122, 90, 12), P('M122 84v6l4 3'))),
    order: (sv, nb) => h('g', null, bg(nb),
      F('M53 22h40l16 16v60a3 3 0 0 1-3 3H53a3 3 0 0 1-3-3V25a3 3 0 0 1 3-3z', '#FFFFFF'), P('M93 22v13a3 3 0 0 0 3 3h13'),
      P('M60 34h22', { strokeWidth: 2 }), P('M60 48h40 M60 56h40 M60 64h30', lite),
      R(58, 71, 34, 9, 2, '#EDEDED', { stroke: 'none' }), P('M62 75.5h22'),
      G('ls-art-bob', Ci(106, 88, 13, sv), Ci(106, 88, 8.5, 'none', { strokeDasharray: '2 2.5', vectorEffect: undefined }), P('M102 88l3 3 5-6'))),
    documents: (sv, nb) => h('g', null, bg(nb),
      h('g', { transform: 'rotate(-8 76 58)' }, R(50, 26, 50, 64, 3, '#F5F5F4')),
      R(58, 30, 50, 64, 3), P('M66 42h26 M66 50h34 M66 58h34 M66 66h22', lite),
      R(66, 75, 20, 10, 2, '#F0F0EF', { stroke: 'none' }), h('text', { x: 69.5, y: 82.6, fontSize: 6.5, fontWeight: 700, fill: INK, fontFamily: 'Instrument Sans, system-ui, sans-serif' }, 'PDF'),
      G('ls-art-bob', Ci(112, 88, 12, INK), P('M112 94v-11 M107.5 87.5l4.5-4.5 4.5 4.5', { stroke: '#FFFFFF' }))),
    clients: (sv, nb) => h('g', null, bg(nb),
      R(62, 26, 62, 42, 6, '#F5F5F4'), P('M96 38h18 M96 45h12', lite),
      R(36, 44, 78, 50, 6), Ci(58, 63, 9, sv), P('M45 86a13 11 0 0 1 26 0'), P('M80 60h24 M80 68h18 M80 76h22', lite),
      G('ls-art-bob', Ci(124, 86, 9), P('M124 82v8 M120 86h8'))),
    invoice: (sv, nb) => h('g', null, bg(nb),
      F('M54 20h52v76l-6.5-4-6.5 4-6.5-4-6.5 4-6.5-4-6.5 4-6.5-4-6.5 4z', '#FFFFFF'),
      P('M73 31h14 M73 36h14 M77 31c6 0 6 10 0 10h-3l9 8'), P('M62 58h20 M62 66h16 M62 74h22 M90 58h8 M90 66h8 M90 74h8', lite), P('M62 84h36', { strokeWidth: 2 }),
      G('ls-art-bob', Ci(116, 84, 11, sv), Ci(116, 84, 6.5, 'none'))),
    team: (sv, nb) => h('g', null, bg(nb),
      P('M60 40q20-16 40 0', { stroke: '#BDBDBD', strokeDasharray: '2 3', vectorEffect: undefined, className: 'ls-art-flow' }),
      Ci(52, 60, 9), P('M38 88a14 12 0 0 1 28 0'), Ci(108, 60, 9), P('M94 88a14 12 0 0 1 28 0'),
      Ci(80, 50, 13, sv), F('M60 92a20 17 0 0 1 40 0z', '#FFFFFF')),
    research: (sv, nb) => h('g', null, bg(nb),
      F('M80 42c-10-6-24-7-38-4v50c14-3 28-2 38 4z', '#FFFFFF'), F('M80 42c10-6 24-7 38-4v50c-14-3-28-2-38 4z', '#FFFFFF'), P('M80 42v50'),
      P('M50 50c8-1.5 16-1 22 1 M50 58c8-1.5 16-1 22 1 M50 66c8-1.5 16-1 22 1 M50 74c8-1.5 16-1 22 1 M88 51c6-2 14-2.5 22-1', lite),
      G('ls-art-bob', Ci(106, 68, 12, 'rgba(255,255,255,.88)'), Ci(106, 68, 8, 'none', { stroke: sv, strokeWidth: 3 }), P('M115 77l9 9', { strokeWidth: 3 }))),
    chat: (sv, nb) => h('g', null, bg(nb),
      R(34, 28, 64, 30, 10), F('M46 57l-5 9 12-8', '#FFFFFF'), P('M46 39h36 M46 47h24', lite),
      R(60, 64, 68, 30, 10, INK), F('M114 93l7 8 0-9z', INK),
      ...[82, 94, 106].map((x, i) => h('circle', { key: x, cx: x, cy: 79, r: 2.6, fill: '#FFFFFF', className: 'ls-art-dot', style: { animationDelay: i * .15 + 's' } })),
      G('ls-art-bob2', spark(122, 30, 9, sv))),
    shield: (sv, nb) => h('g', null, bg(nb),
      F('M80 22l30 11v22c0 20-13 32-30 39-17-7-30-19-30-39V33z', sv), P('M80 30l22 8v17c0 15-9.5 24-22 29.5', { stroke: '#FFFFFF', strokeOpacity: .9 }),
      P('M67 58l9 9 17-19', { strokeWidth: 2.5 })),
    empty: (sv, nb) => h('g', null, bg(nb),
      G('ls-art-bob', R(62, 22, 36, 28, 3), P('M69 31h22 M69 38h14', lite)),
      F('M42 68l12-24h52l12 24v20a4 4 0 0 1-4 4H46a4 4 0 0 1-4-4z', '#FFFFFF'), F('M42 68h24a14 9 0 0 0 28 0h24v20a4 4 0 0 1-4 4H46a4 4 0 0 1-4-4z', '#F5F5F4')),
    deadline: (sv, nb) => h('g', null, bg(nb),
      h('circle', { cx: 78, cy: 60, r: 34, fill: 'none', stroke: '#E5E5E5', strokeWidth: 4 }),
      h('circle', { cx: 78, cy: 60, r: 34, fill: 'none', stroke: INK, strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: '64 400', transform: 'rotate(-90 78 60)', className: 'ls-art-arc' }),
      Ci(78, 60, 27), P('M78 37v3 M78 80v3 M55 60h3 M98 60h3', lite), P('M78 46v14l9 6'), Ci(78, 60, 2, INK),
      G('ls-art-bob', P('M113 22h14 M113 44h14'), F('M115 22c0 7 10 7 10 11s-10 4-10 11h10c0-7-10-7-10-11s10-4 10-11z', sv))),
    tasks: (sv, nb) => h('g', null, bg(nb),
      R(50, 26, 60, 72, 6), R(66, 20, 28, 11, 3, INK),
      ...[0, 1, 2].map(i => { const y = 46 + i * 16; return h('g', { key: i }, R(60, y - 5, 10, 10, 2, i < 2 ? INK : '#FFFFFF'), i < 2 ? P(`M62.5 ${y}l2 2 3.5-4`, { stroke: '#FFFFFF' }) : null, P(`M76 ${y}h${[24, 20, 26][i]}`, lite)); }),
      G('ls-art-bob2', spark(122, 34, 8, sv))),
    court: (sv, nb) => h('g', null, bg(nb),
      F('M40 48l40-22 40 22z', sv), R(44, 48, 72, 5, 1),
      ...[50, 62, 74, 86, 98, 110].map(x => R(x - 2.5, 53, 5, 33, 1, '#FFFFFF', { key: x })),
      R(42, 86, 76, 6, 1), R(36, 92, 88, 6, 1),
      G('ls-art-bob', Ci(124, 30, 7, INK), h('circle', { cx: 124, cy: 30, r: 2.2, fill: '#FFFFFF' }))),
    agents: (sv, nb) => h('g', null, bg(nb),
      P('M68 30v8 M80 30v8 M92 30v8 M68 82v8 M80 82v8 M92 82v8 M48 50h8 M48 60h8 M48 70h8 M104 50h8 M104 60h8 M104 70h8'),
      R(56, 38, 48, 44, 8), R(65, 47, 30, 26, 4, sv), G('ls-art-pulse', spark(80, 60, 8, INK))),
    reports: (sv, nb) => h('g', null, bg(nb),
      R(38, 28, 84, 66, 6), P('M48 40h24', lite), P('M46 84h68'),
      R(52, 66, 9, 18, 1.5, '#E5E5E5', { stroke: 'none' }), R(66, 58, 9, 26, 1.5, '#E5E5E5', { stroke: 'none' }), R(80, 62, 9, 22, 1.5, '#E5E5E5', { stroke: 'none' }), R(94, 48, 9, 36, 1.5, INK, { stroke: 'none' }),
      P('M54 58l14-8 14 4 14-14 14 2', { className: 'ls-art-draw', vectorEffect: undefined }), Ci(110, 42, 3, sv)),
    portal: (sv, nb) => h('g', null, bg(nb),
      R(34, 30, 92, 62, 6), P('M34 42h92'), h('circle', { cx: 41, cy: 36, r: 1.6, fill: INK }), h('circle', { cx: 47, cy: 36, r: 1.6, fill: '#BDBDBD' }), h('circle', { cx: 53, cy: 36, r: 1.6, fill: '#BDBDBD' }),
      Ci(56, 62, 8, sv), P('M44 82a12 10 0 0 1 24 0'), P('M78 56h36 M78 64h28 M78 72h32', lite),
      G('ls-art-bob', Ci(124, 30, 9, INK), P('M120.5 30l2.5 2.5 4.5-5', { stroke: '#FFFFFF' }))),
    settings: (sv, nb) => h('g', null, bg(nb),
      R(40, 32, 80, 58, 8), P('M52 48h56 M52 61h56 M52 74h56', { stroke: '#D4D4D4' }),
      G('ls-art-slide', Ci(66, 48, 5, INK)), G('ls-art-slide2', Ci(94, 61, 5, sv)), Ci(76, 74, 5)),
    scales: (sv, nb) => h('g', null, bg(nb),
      P('M80 30v58'), R(68, 88, 24, 6, 2), Ci(80, 28, 3.5, sv),
      h('g', { className: 'ls-art-sway' }, P('M50 40h60'), P('M54 40l-10 22 M54 40l10 22 M106 40l-10 22 M106 40l10 22', { stroke: '#8A8A8A' }),
        F('M42 62h24a12 7 0 0 1-24 0z', sv), F('M94 62h24a12 7 0 0 1-24 0z', sv))),
    sunrise: (sv) => h('g', null,
      P('M24 52h16 M150 44h22 M158 50h10', { stroke: '#D4D4D4' }),
      h('g', { className: 'ls-art-rays' }, P('M100 34v-10 M70 46l-7-7 M130 46l7-7 M58 70H46 M142 70h12', { stroke: '#BDBDBD' })),
      h('g', { className: 'ls-art-rise' }, F('M62 92a38 38 0 0 1 76 0z', sv)),
      F('M80 76l20-11 20 11z', '#FFFFFF'), R(82, 76, 36, 3, .8), ...[86, 94, 102, 110].map(x => R(x, 79, 3.5, 10, .8, '#FFFFFF', { key: x })),
      P('M18 92h164'), P('M40 100h26 M134 100h30', { stroke: '#D4D4D4' })),
    setup: (sv) => h('g', null,
      h('ellipse', { cx: 220, cy: 104, rx: 150, ry: 3.5, fill: '#EDEDEC' }),
      h('g', { transform: 'translate(-6 0)' }, SCENES.documents(sv, true)),
      P('M126 58h66', { stroke: '#BDBDBD', strokeDasharray: '3 6', vectorEffect: undefined, className: 'ls-art-flow' }),
      h('circle', { cx: 220, cy: 58, r: 44, fill: '#F2F2F1' }), h('g', { transform: 'translate(140 0)' }, SCENES.scales(sv, true)),
      P('M248 58h66', { stroke: '#BDBDBD', strokeDasharray: '3 6', vectorEffect: undefined, className: 'ls-art-flow' }),
      h('g', { transform: 'translate(286 0)' }, SCENES.calendar(sv, true)))
  };
  const VB = { setup: '0 0 440 116', sunrise: '0 0 200 112' };
  let artN = 0;
  function Art({ name, style, className, tile }) {
    const id = React.useRef(null); if (!id.current) id.current = 'ls-sv' + (++artN);
    const sv = 'url(#' + id.current + ')', sc = SCENES[name] || SCENES.empty;
    return h('svg', { viewBox: tile ? '30 14 100 100' : (VB[name] || '0 0 160 120'), 'aria-hidden': true, focusable: 'false', className: 'ls-art ' + (className || ''), style },
      h('defs', null, h('linearGradient', { id: id.current, x1: 0, y1: 0, x2: 1, y2: 1 }, h('stop', { offset: 0, stopColor: '#FFFFFF' }), h('stop', { offset: .45, stopColor: '#E2E2E2' }), h('stop', { offset: .72, stopColor: '#ADADAD' }), h('stop', { offset: 1, stopColor: '#F2F2F2' }))),
      sc(sv, tile));
  }
  const art = {}; Object.keys(SCENES).forEach(k => { art[k] = p => h(Art, Object.assign({ name: k }, p)); });
  /* Pick an illustration from an empty-state title. */
  const artFor = t => { t = String(t || '').toLowerCase();
    return /case/.test(t) ? 'cases' : /hearing|listed|calendar|date/.test(t) ? 'calendar' : /order/.test(t) ? 'order' : /document|evidence|file|upload|exhibit/.test(t) ? 'documents'
      : /client/.test(t) ? 'clients' : /invoice|fee|payment|bill/.test(t) ? 'invoice' : /member|team|invite/.test(t) ? 'team' : /note|research|match|result/.test(t) ? 'research'
      : /task/.test(t) ? 'tasks' : /deadline|limitation/.test(t) ? 'deadline' : /application|available|admin|verif/.test(t) ? 'shield' : /agent|run/.test(t) ? 'agents'
      : /question|chat|answer|ask/.test(t) ? 'chat' : /report/.test(t) ? 'reports' : /portal/.test(t) ? 'portal' : 'empty'; };

  /* Sign-in panel composition: the logo with faint orbiting rings and floating reminder cards. */
  const miniIc = { bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20a2 2 0 0 0 4 0', check: 'M5 12.5l4.5 4.5L19 7.5', sun: 'M12 4v2 M5.6 6.6l1.4 1.4 M18.4 6.6L17 8 M3 15h18 M7 15a5 5 0 0 1 10 0 M6 19h12' };
  const mini = (cls, ic, title, sub, pulse) => h('div', { className: 'ls-mini ' + cls, 'aria-hidden': true },
    h('span', { className: 'ls-mini-ic' }, h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: INK, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: miniIc[ic] }))),
    h('span', null, h('b', null, title, pulse && h('i', { className: 'ls-mini-dot ls-pulse' })), h('span', { className: 'ls-mini-sub' }, sub)));
  function LoginStage() {
    return h(React.Fragment, null,
      mini('m1', 'bell', 'Hearing today · 10:30 AM', 'Delhi HC · Court 4 · Item 12', true),
      mini('m2', 'check', 'Next date confirmed', '14 Jan 2027 · added to calendar'),
      mini('m3', 'sun', 'Morning briefing sent', '7:30 AM · on WhatsApp and email'),
      h('div', { className: 'ls-login-stage' },
        h('div', { className: 'ls-orbits', 'aria-hidden': true }, h('span', { className: 'ls-ring-o r1' }), h('span', { className: 'ls-ring-o r2' }, h('i', { className: 'ls-odot' })), h('span', { className: 'ls-ring-o r3' }, h('i', { className: 'ls-odot' }))),
        h('img', { src: 'assets/ls-logo-white.png', alt: 'Legal Staff', className: 'ls-login-logo', style: { height: 'min(34vh,260px)', width: 'auto', display: 'block', position: 'relative' } })));
  }
  /* Booting screen: a faint skeleton of the workspace behind the logo, ring pulse and an indeterminate bar. */
  function Boot({ text }) {
    const bar = (w, hh, extra) => h('div', { className: 'ls-shimmer', style: Object.assign({ width: w, height: hh, borderRadius: 6 }, extra) });
    return h(React.Fragment, null,
      h('div', { className: 'ls-boot-skel', 'aria-hidden': true },
        h('div', { className: 'ls-boot-side' }, bar('70%', 22), h('div', { style: { height: 18 } }), ...[80, 64, 72, 58, 76, 62, 70, 54].map((w, i) => bar(w + '%', 12, { key: i, marginTop: 14 }))),
        h('div', { className: 'ls-boot-main' }, bar('100%', 36, { borderRadius: 8 }), bar('34%', 22, { marginTop: 26 }),
          h('div', { className: 'ls-boot-grid' }, ...[0, 1, 2, 3].map(i => bar('100%', 96, { key: i, borderRadius: 12 }))), bar('100%', 220, { borderRadius: 12, marginTop: 18 }))),
      h('div', { className: 'ls-boot-center' },
        h('span', { className: 'ls-boot-mark ls-ring' }, h('img', { src: 'assets/ls-mark-black.png', alt: '', style: { height: 34, display: 'block' } })),
        h('span', { style: { fontWeight: 600, fontSize: 20, letterSpacing: '-.02em' } }, 'Legal Staff'),
        h('div', { className: 'ls-boot-bar', role: 'progressbar', 'aria-label': 'Loading' }, h('i')),
        h('div', { style: { fontSize: 14.5, color: '#5E5E5E', fontStyle: 'italic', textAlign: 'center', padding: '0 16px' } }, text)));
  }
  const Btn = ({ primary, danger, small, onClick, children, disabled, title, style }) => h('button', { onClick, disabled, title, type: 'button', className: 'ls-btn', style: Object.assign({ whiteSpace: 'nowrap', height: small ? 30 : 36, padding: small ? '0 10px' : '0 16px', borderRadius: 8, fontSize: small ? 12.5 : 13.5, fontWeight: primary ? 500 : 400, border: primary ? 0 : '1px solid ' + (danger ? '#F4B8B1' : K.line), background: primary ? K.ink : '#FFFFFF', color: primary ? '#fff' : (danger ? K.red : K.ink), opacity: disabled ? .45 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }, style) }, children);
  const Chip = ({ tone, children }) => h('span', { style: { fontSize: 12, fontWeight: 500, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap', background: tone === 'red' ? K.redBg : (tone === 'grey' ? '#EDEDED' : K.soft2), color: tone === 'red' ? K.red : (tone === 'grey' ? K.txt : K.ink) } }, children);
  const Card = ({ title, right, children, pad, style }) => h('section', { style: Object.assign({}, X.card, { padding: pad === 0 ? 0 : (pad || '22px 24px') }, style) },
    (title || right) && h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14, padding: pad === 0 ? '18px 22px 0' : 0 } }, h('h2', { style: X.h2 }, title), right), children);
  const Page = ({ kicker, title, sub, actions, children, max, art }) => h('div', { style: Object.assign({}, X.page, max ? { maxWidth: max } : null) },
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 } }, art && h('div', { className: 'ls-page-art' }, h(Art, { name: art, tile: true, style: { width: 50, height: 50 } })),
        h('div', { style: { minWidth: 0 } }, kicker && h('div', { style: Object.assign({ marginBottom: 6 }, X.kicker) }, kicker), h('h1', { style: X.h1 }, title), sub && h('div', { style: X.sub }, sub))),
      actions && h('div', { style: Object.assign({}, X.row, { minWidth: 0, maxWidth: '100%' }) }, actions)), children);
  const Empty = ({ title, text, art, small }) => { const a = art || (artFor(title) !== 'empty' ? artFor(title) : artFor(text));
    return h('div', { className: 'ls-empty', style: { padding: small ? '20px 16px 24px' : '36px 22px 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: small ? 6 : 8, textAlign: 'center' } },
      art !== false && h(Art, { name: a, style: { width: small ? 104 : 156, height: 'auto', marginBottom: small ? 2 : 6 } }),
      h('div', { style: { fontSize: small ? 15 : 16, fontWeight: 600 } }, title), text && h('div', { style: { color: K.mut, fontSize: small ? 13.5 : 14, maxWidth: 380 } }, text)); };
  /* cols: [{ label, w, get(row) }] */
  const Table = ({ cols, rows, onRow, empty, min }) => {
    const grid = { display: 'grid', gridTemplateColumns: cols.map(c => c.w || '1fr').join(' '), gap: 16, alignItems: 'center', padding: '14px 22px' };
    return h('section', { style: Object.assign({}, X.card, { overflowX: 'auto' }) }, h('div', { style: { minWidth: min || 760 } },
      h('div', { style: Object.assign({}, grid, X.kicker, { padding: '12px 22px', borderBottom: '1px solid ' + K.line }) }, cols.map((c, i) => h('span', { key: i }, c.label))),
      rows.map((r, i) => h(onRow ? 'button' : 'div', { key: r.id || i, type: onRow ? 'button' : undefined, onClick: onRow ? () => onRow(r) : undefined, className: 'ls-row' + (onRow ? ' ls-row-btn' : ''), style: Object.assign({}, grid, { animationDelay: Math.min(i, 10) * 28 + 'ms', width: '100%', textAlign: 'left', border: 0, borderBottom: i < rows.length - 1 ? '1px solid ' + K.line : 0, background: '#FFFFFF', color: K.ink, fontSize: 13.5 }) }, cols.map((c, j) => h('span', { key: j, style: { minWidth: 0, color: j ? K.txt : K.ink, fontWeight: j ? 400 : 500 } }, c.get(r))))),
      !rows.length && h('div', { style: { position: 'sticky', left: 0, width: 'min(100%, calc(100vw - 34px))' } }, h(Empty, empty || { title: 'Nothing here yet' }))));
  };
  const Modal = ({ title, sub, onClose, children, width, art }) => h('div', { onMouseDown: e => { if (e.target === e.currentTarget) onClose(); }, className: 'ls-backdrop', style: { position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(32,30,29,.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px', overflowY: 'auto' } },
    h('div', { role: 'dialog', 'aria-modal': true, className: 'ls-dialog', style: Object.assign({}, X.card, { width: '100%', maxWidth: width || 520, padding: '24px 26px', boxShadow: '0 24px 64px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', gap: 16 }) },
      art && h('div', { className: 'ls-modal-art' }, h(Art, { name: art, style: { width: '100%', maxWidth: 400, height: 'auto', display: 'block' } })),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' } }, h('div', null, h('h2', { style: { fontSize: 18, fontWeight: 600, margin: 0 } }, title), sub && h('div', { style: X.sub }, sub)),
        h('button', { onClick: onClose, 'aria-label': 'Close', style: { border: 0, background: 'none', fontSize: 22, lineHeight: 1, color: K.mut } }, '×')), children));
  const Field = ({ label, error, children, half }) => h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, flex: half ? '1 1 180px' : '1 1 100%', minWidth: 0 } }, label && h('label', { style: { fontSize: 13, color: K.txt } }, label), children, error && h('div', { style: { fontSize: 12.5, color: K.red } }, error));
  /* fields: [{ k, label, type, options, req, ph, check(v, all), half, ro (read-only) }] */
  const Form = ({ fields, init, submit, onSubmit, onCancel, note }) => {
    const [v, setV] = useState(() => Object.assign({}, ...fields.map(f => ({ [f.k]: f.type === 'labels' ? [] : f.type === 'select' && !f.blank ? ((f.options[0] || [''])[0] !== undefined && Array.isArray(f.options[0]) ? f.options[0][0] : f.options[0]) || '' : '' })), init || {}));
    const [err, setErr] = useState({});
    const go = e => { e && e.preventDefault(); const er = {};
      fields.forEach(f => { const val = String(v[f.k] == null ? '' : v[f.k]).trim();
        if (f.req && !val) er[f.k] = 'Required';
        else if (val && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) er[f.k] = 'Enter a valid email address';
        else if (val && f.type === 'tel' && val.replace(/\D/g, '').length < 10) er[f.k] = 'Enter a 10-digit number';
        else if (val && f.type === 'number' && !(+val > 0)) er[f.k] = 'Enter an amount above zero';
        else if (f.check) { const m = f.check(val, v); if (m) er[f.k] = m; } });
      setErr(er); if (!Object.keys(er).length) onSubmit(v); };
    return h('form', { onSubmit: go, noValidate: true, style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14 } }, fields.map(f => h(Field, { key: f.k, label: f.label, error: err[f.k], half: f.half },
        f.ro ? h('input', { value: v[f.k] == null ? '' : v[f.k], readOnly: true, 'aria-readonly': true, title: f.roNote || 'Cannot be changed here', style: Object.assign({}, X.input, { background: K.soft, color: K.mut }) })
        : f.type === 'labels' ? (f.options.length ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, f.options.map(l => { const on = (v[f.k] || []).includes(l.id); return h('button', { key: l.id, type: 'button', 'aria-pressed': on, title: l.name, onClick: () => setV(Object.assign({}, v, { [f.k]: on ? v[f.k].filter(x => x !== l.id) : [...(v[f.k] || []), l.id] })), style: { border: '1.5px solid ' + l.color, background: on ? l.color : '#fff', color: on ? '#fff' : l.color, fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 11px' } }, l.code); })) : h('div', { style: { fontSize: 13, color: K.mut } }, 'No labels yet. Add them under Labels in the sidebar.'))
        : f.type === 'select' ? h('select', { value: v[f.k], onChange: e => setV(Object.assign({}, v, { [f.k]: e.target.value })), style: X.input }, f.blank && h('option', { value: '' }, f.blank), f.options.map(o => Array.isArray(o) ? h('option', { key: o[0], value: o[0] }, o[1]) : h('option', { key: o, value: o }, o)))
          : f.type === 'textarea' ? h('textarea', { value: v[f.k], placeholder: f.ph, rows: f.rows || 4, onChange: e => setV(Object.assign({}, v, { [f.k]: e.target.value })), style: Object.assign({}, X.input, { height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }) })
            : h('input', { type: f.type === 'number' ? 'text' : (f.type || 'text'), inputMode: f.type === 'number' ? 'decimal' : undefined, value: v[f.k], placeholder: f.ph, onChange: e => setV(Object.assign({}, v, { [f.k]: e.target.value })), style: X.input })))),
      note && h('div', { style: { fontSize: 12.5, color: K.mut } }, note),
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, onCancel && h(Btn, { onClick: onCancel }, 'Cancel'), h('button', { type: 'submit', className: 'ls-btn', style: { height: 36, padding: '0 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 500, border: 0, background: K.ink, color: '#fff' } }, submit || 'Save')));
  };
  const Toggle = ({ on, onChange, label }) => h('button', { type: 'button', role: 'switch', 'aria-checked': !!on, 'aria-label': label, onClick: () => onChange(!on), style: { width: 40, height: 22, borderRadius: 11, border: 0, padding: 2, background: on ? K.ink : '#C4C4C4', display: 'flex', justifyContent: 'flex-start', flexShrink: 0, transition: 'background .2s ease' } }, h('span', { style: { width: 18, height: 18, borderRadius: 9, background: '#fff', display: 'block', transform: on ? 'translateX(18px)' : 'none', transition: 'transform .22s var(--ls-ease-out)', boxShadow: '0 1px 2px rgba(0,0,0,.2)' } }));
  const Stat = ({ label, value, note, red }) => h('div', { className: 'ls-lift', style: Object.assign({}, X.card, { padding: '18px 20px', flex: '1 1 180px' }) }, h('div', { style: { fontSize: 13, color: K.mut } }, label), h('div', { style: { fontSize: 26, fontWeight: 600, letterSpacing: '-.02em', marginTop: 4, fontVariantNumeric: 'tabular-nums' } }, typeof value === 'string' || typeof value === 'number' ? h(CountUp, { value }) : value), note && h('div', { style: { fontSize: 13, color: red ? K.red : K.mut, marginTop: 4 } }, note));
  const Search = ({ value, onChange, placeholder, width }) => h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid ' + K.line, borderRadius: 8, padding: '0 12px', height: 38, minWidth: width || 240 } }, h('span', { style: { color: '#7A7A7A' } }, '⌕'), h('input', { value, onChange: e => onChange(e.target.value), placeholder, style: { border: 0, outline: 'none', flex: 1, fontSize: 14, background: 'transparent', minWidth: 0 } }));
  const Select = ({ value, onChange, options, style }) => h('select', { value, onChange: e => onChange(e.target.value), style: Object.assign({}, X.input, { width: 'auto', minWidth: 160 }, style) }, options.map(o => h('option', { key: o[0], value: o[0] }, o[1])));
  const Line = ({ children, last }) => h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1px solid ' + K.line, fontSize: 14 } }, children);
  const Bars = ({ rows, fmt }) => { const mx = Math.max(1, ...rows.map(r => r[1])); return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, rows.map(([k, n]) => h('div', { key: k, style: { display: 'grid', gridTemplateColumns: 'minmax(110px,1.2fr) 2fr auto', gap: 12, alignItems: 'center', fontSize: 13.5 } }, h('span', { style: { color: K.txt, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, k), h('span', { style: { height: 8, background: K.soft2, borderRadius: 4, overflow: 'hidden' } }, h('span', { className: 'ls-grow-x', style: { display: 'block', height: '100%', width: (n / mx * 100) + '%', background: K.ink } })), h('span', { style: { fontVariantNumeric: 'tabular-nums', fontWeight: 500 } }, fmt ? fmt(n) : n))), !rows.length && h('div', { style: { color: K.mut, fontSize: 14 } }, 'No data yet.')); };

  /* ---------- shared data helpers ---------- */
  const caseOf = (d, id) => d.cases.find(c => c.id === id) || { title: '—', no: '' };
  const clientOf = (d, id) => d.clients.find(c => c.id === id) || { name: '—' };
  /* keep: also list this case id (e.g. an archived case a record already belongs to). */
  const caseOpts = (d, keep) => d.cases.filter(c => c.status !== 'archived' || (keep && c.id === keep)).map(c => [c.id, c.title]);
  const teamOpts = d => d.team.map(u => u.name);
  const openTasks = d => d.tasks.filter(t => !t.done);
  const overdue = t => !t.done && t.due < L.today();
  const gstOf = a => Math.round(a * 18) / 100;
  function clashes(d) { const m = {}; d.hearings.filter(x => x.date >= L.today()).forEach(x => { const k = x.date + '|' + x.time + '|' + x.assignee; (m[k] = m[k] || []).push(x); }); return Object.values(m).filter(g => g.length > 1); }
  function nextHearing(d, caseId) { return d.hearings.filter(x => x.caseId === caseId && x.date >= L.today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]; }
  function alerts(d, app) {
    const out = [], T = L.today();
    d.orders.filter(o => !o.confirmed && o.nextDate).forEach(o => out.push({ text: `Confirm the next date (${L.dmy(o.nextDate)}) from the order in ${caseOf(d, o.caseId).title}.`, go: () => app.go('order', o.id) }));
    clashes(d).forEach(g => out.push({ text: `${g.length} hearings clash on ${L.dayMon(g[0].date)} at ${L.t12ap(g[0].time)} for ${g[0].assignee}.`, go: () => app.openWeek(g[0].date) }));
    (d.lims || []).filter(l => !l.approved).forEach(l => { const c = L.limitation(l); if (c.due && !c.needsReady) out.push({ text: `Limitation date for ${l.title} (${L.dayMon(c.due)}) is awaiting approval.`, go: () => app.go('limitation', l.id) }); else if (c.needsReady) out.push({ text: `Limitation calculation for ${l.title} needs the certified-copy ready date.`, go: () => app.go('limitation', l.id) }); });
    /* Approved limitation dates stay in alerts until they pass or are marked done; other deadlines from 7 days before. */
    d.deadlines.filter(x => !x.done && x.due >= T && (x.source === 'limitation' || L.diffDays(x.due, T) <= 7)).sort((a, b) => a.due.localeCompare(b.due)).forEach(x => { const n = L.diffDays(x.due, T); out.push({ text: `${x.source === 'limitation' ? 'Limitation: ' : ''}${x.title} is due ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'on ' + L.dayMon(x.due) + ' (' + n + ' days)'}.`, go: () => app.go('limitation', x.limId || '') }); });
    const od = d.tasks.filter(overdue); if (od.length) out.push({ text: `${od.length} task${od.length > 1 ? 's are' : ' is'} overdue.`, go: () => app.go('workspace') });
    const oi = d.invoices.filter(i => !i.paid && L.diffDays(L.today(), i.date) > 30); if (oi.length) out.push({ text: `${oi.length} invoice${oi.length > 1 ? 's are' : ' is'} unpaid for more than 30 days.`, go: () => app.go('billing') });
    const no = needsOutcome(d); if (no.length) out.push({ text: `${no.length} past hearing${no.length > 1 ? 's need' : ' needs'} an outcome recorded.`, go: () => app.go('dashboard') });
    return out;
  }
  const logIt = (d, x, caseId, extra) => { d.log.unshift(Object.assign({ ts: L.today() + ' ' + L.nowHM(), caseId: caseId || '', x }, extra)); if (d.log.length > L.LOG_MAX) d.log.length = L.LOG_MAX; };

  /* ---------- permissions, outcomes and shared edit helpers ---------- */
  /* Single permission check for edit/delete. Everything is allowed for now; roles fill this in later. */
  const can = (app, action) => true;
  const allowed = (app, action) => { if (can(app, action)) return true; app.toast('You do not have permission to do that.'); return false; };
  const OUTCOMES = ['Heard', 'Adjourned', 'Part-heard', 'Reserved for orders', 'Disposed', 'Not reached', 'Other'];
  const STAGES = ['Pleadings', 'Evidence', 'Arguments', 'Pending filing', 'Execution', 'Reserved for orders', 'Mediation'];
  const DOC_TYPES = ['Pleading', 'Court order', 'Draft', 'Correspondence', 'Other'];
  const isAdj = o => o === 'Adjourned' || (!!o && !OUTCOMES.includes(o) && /adjourn|time sought|time to|given \d|weeks/i.test(o));
  const needsOutcome = d => d.hearings.filter(x => x.date < L.today() && !x.outcome);
  const outcomeChip = x => x.outcome ? h(Chip, { tone: x.outcome === 'Not reached' || isAdj(x.outcome) ? 'grey' : '' }, x.outcome) : (x.date < L.today() ? h(Chip, { tone: 'red' }, 'Needs outcome') : null);
  const IconBtn = ({ label, onClick, children, danger }) => h('button', { type: 'button', onClick, title: label, 'aria-label': label, className: 'ls-btn', style: { width: 30, height: 30, flexShrink: 0, borderRadius: 8, border: '1px solid ' + (danger ? '#F4B8B1' : K.line), background: '#FFFFFF', color: danger ? K.red : K.ink, fontSize: 15, lineHeight: 1, padding: 0 } }, children);
  const acts = (...k) => h('span', { style: { display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } }, ...k.filter(Boolean));
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
  /* The server sends briefings hourly on the half hour IST (pg_cron at minute 0 UTC), so a time is stored as HH:30. */
  const BRIEF_TIMES = Array.from({ length: 18 }, (_, i) => L.pad(i + 5) + ':30');
  const briefAt = s => { const hh = +String((s && s.briefingTime) || '07:30').split(':')[0]; return L.pad(hh >= 0 && hh < 24 && !isNaN(hh) ? hh : 7) + ':30'; };
  function infoBox(app, title, text) { app.modal(() => h(Modal, { title, onClose: () => app.modal(null), width: 460 }, h('div', { style: { fontSize: 14, color: K.txt, lineHeight: 1.6 } }, text), h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h(Btn, { primary: true, onClick: () => app.modal(null) }, 'OK')))); }
  /* Another hearing for the same advocate at the same date and time. Asks before saving; nothing is saved on Cancel. */
  function clashGate(app, v, except, fn) {
    const d = app.db, cl = d.hearings.filter(x => !(except || []).includes(x.id) && x.date === v.date && x.time === v.time && x.assignee === v.assignee);
    if (!cl.length) return fn();
    confirmBox(app, 'This hearing clashes', `${v.assignee} already has ${cl.map(x => caseOf(d, x.caseId).title).join(' and ')} on ${L.dmy(v.date)} at ${L.t12ap(v.time)}. Nothing has been saved yet.`, 'Save anyway', fn);
  }

  /* ---------- forms opened from several places ---------- */
  /* editId: edit that case instead (same form, prefilled, without the first-hearing fields). */
  function newCase(app, init, editId) {
    const d = app.db, c0 = editId && d.cases.find(c => c.id === editId);
    if (editId && (!c0 || !allowed(app, 'case.edit'))) return;
    if (!editId && overLimit(app, 'cases')) return;
    const lead = c0 ? (c0.team || [])[0] : '', stages = LSP.stages(d.firm, c0 && c0.stage);
    app.modal(() => h(Modal, { title: c0 ? 'Edit case' : 'New case', sub: c0 ? c0.no : 'Add the matter manually. You can upload orders and documents afterwards.', onClose: () => app.modal(null), width: 600 },
      h(Form, { init: c0 ? { title: c0.title, full: c0.full || c0.title, no: c0.no, cnr: c0.cnr || '', court: c0.court, stage: c0.stage || stages[0], clientId: c0.clientId || '', team: lead || d.user.name, fileNo: c0.fileNo || '', state: c0.state || '', district: c0.district || '', bench: c0.bench || '', oppAdv: c0.oppAdv || '', labels: (c0.labels || []).slice() } : Object.assign({ team: d.user.name, stage: stages[0] }, init), submit: c0 ? 'Save changes' : 'Create case', onCancel: () => app.modal(null),
        fields: [
          { k: 'title', label: 'Case title', req: true, ph: 'Party A v. Party B' },
          ...(c0 ? [{ k: 'full', label: 'Full cause title', ph: 'As written in the cause list' }] : []),
          { k: 'no', label: 'Case number', req: true, ph: 'Case type and number', half: true }, { k: 'cnr', label: 'CNR (optional)', ph: '16 characters', half: true, check: v => { const c = v.replace(/[\s-]/g, ''); return v && !/^[A-Za-z]{4}\d{12}$/.test(c) ? 'A CNR has 4 letters followed by 12 digits' : (v && app.db.cases.some(x => x.cnr === c.toUpperCase() && x.id !== editId) ? 'Another case already has this CNR' : ''); } },
          { k: 'court', label: 'Court', req: true, ph: 'Court and courtroom', half: true }, { k: 'stage', label: 'Stage', type: 'select', options: stages, half: true },
          { k: 'clientId', label: 'Client', type: 'select', blank: 'Select a client', options: d.clients.map(c => [c.id, c.name]), half: true }, { k: 'team', label: 'Lead advocate', type: 'select', options: lead && !teamOpts(d).includes(lead) ? [lead, ...teamOpts(d)] : teamOpts(d), half: true },
          { k: 'fileNo', label: 'File number (optional)', ph: 'Your own file reference', half: true }, { k: 'bench', label: 'Bench / judge (optional)', ph: 'Presiding officer', half: true },
          { k: 'state', label: 'Court state (optional)', ph: 'Bihar', half: true }, { k: 'district', label: 'Court district (optional)', ph: 'Patna', half: true },
          { k: 'oppAdv', label: 'Opposite advocate (optional)', ph: 'Name', half: true },
          { k: 'labels', label: 'Labels', type: 'labels', options: d.labels || [] },
          ...(c0 ? [] : [{ k: 'next', label: 'Next hearing date (optional)', type: 'date', half: true }, { k: 'time', label: 'Time', type: 'time', half: true }])
        ],
        onSubmit: v => { if (c0) { app.mut(db => { const c = db.cases.find(x => x.id === editId); if (!c) return;
            const keepFull = (v.full || '').trim() === (c.full || '') && (c.full || c.title) === c.title, nv = { title: v.title.trim(), full: keepFull ? v.title.trim() : ((v.full || '').trim() || v.title.trim()), no: v.no.trim(), cnr: (v.cnr || '').replace(/[\s-]/g, '').toUpperCase(), court: v.court.trim(), stage: v.stage, clientId: v.clientId || '', fileNo: (v.fileNo || '').trim(), bench: (v.bench || '').trim(), state: (v.state || '').trim(), district: (v.district || '').trim(), oppAdv: (v.oppAdv || '').trim() };
            const names = { title: 'title', full: 'cause title', no: 'number', cnr: 'CNR', court: 'court', stage: 'stage', clientId: 'client', fileNo: 'file number', bench: 'bench', state: 'state', district: 'district', oppAdv: 'opposite advocate' }, ch = Object.keys(nv).filter(k => (c[k] || '') !== nv[k]).map(k => names[k]);
            if (nv.court !== c.court) db.hearings.forEach(x => { if (x.caseId === c.id && x.date >= L.today() && !x.outcome && x.court === c.court) x.court = nv.court; });
            if (c.purpose === c.stage) c.purpose = nv.stage; if (c.forum === c.court) c.forum = nv.court;
            Object.assign(c, nv); if ((c.labels || []).join() !== (v.labels || []).join()) { c.labels = (v.labels || []).slice(); ch.push('labels'); } if ((c.team || [])[0] !== v.team) { c.team = [v.team, ...(c.team || []).slice(1).filter(n => n !== v.team)]; ch.push('lead advocate'); }
            logIt(db, `Case edited by ${db.user.name}` + (ch.length ? ': ' + ch.join(', ') + ' changed' : ' (no changes)'), c.id); }, 'Case updated'); return app.modal(null); }
          const id = L.uid('c'); app.mut(db => {
          db.cases.unshift({ id, title: v.title.trim(), full: v.title.trim(), no: v.no.trim(), cnr: (v.cnr || '').replace(/[\s-]/g, '').toUpperCase(), court: v.court.trim(), forum: v.court.trim(), purpose: v.stage, stage: v.stage, status: v.stage === 'Pending filing' ? 'pending' : 'active', team: [v.team], clientId: v.clientId, fileNo: (v.fileNo || '').trim(), bench: (v.bench || '').trim(), state: (v.state || '').trim(), district: (v.district || '').trim(), oppAdv: (v.oppAdv || '').trim(), labels: (v.labels || []).slice(), createdBy: db.user.name, createdOn: L.today(), summary: '', summaryMeta: '', parties: [], issues: [], missing: [], args: '' });
          if (v.next) db.hearings.push({ id: L.uid('h'), caseId: id, date: v.next, time: v.time || '10:30', court: v.court.trim(), item: '', purpose: v.stage, assignee: v.team, outcome: '', brief: false });
          logIt(db, 'Case created by ' + db.user.name, id); }, 'Case created');
          app.modal(null); app.go('case', id); } })));
  }
  /* Removes a stored file (server storage or this browser's IndexedDB). */
  const dropFile = x => { if (window.LSB && LSB.on) { if (x.drive) LSB.drive.remove(x.drive); else if (x.file) LSB.removeFile(x.id, x.file); } else L.files.del(x.id); };
  /* Where a new upload goes: the uploader's Google Drive (encrypted, hidden folder) once they have connected it, otherwise the firm's private storage. */
  const driveOn = app => !!(window.LSB && LSB.on && app.driveSt && app.driveSt.configured && app.driveSt.connected);
  const storeFile = (app, id, f) => !(window.LSB && LSB.on) ? L.files.put(id, f).catch(() => {}).then(() => null) : driveOn(app) ? LSB.drive.upload(id, f) : LSB.upload(id, f).then(() => null);
  /* Blocked while the case has invoices. Hearings and orders go with the case; tasks and documents can be kept, unlinked. */
  function delCase(app, id) {
    const d = app.db, c = d.cases.find(x => x.id === id); if (!c || !allowed(app, 'case.delete')) return;
    const inv = d.invoices.filter(i => i.caseId === id);
    if (inv.length) return infoBox(app, 'This case cannot be deleted', `${c.title} has ${plural(inv.length, 'invoice')} (${inv.map(i => i.no).join(', ')}). Invoices are financial records, so the case they belong to is kept with them. Mark the case Disposed or Archived instead, or delete the invoice${inv.length > 1 ? 's' : ''} in Billing & Finance first.`);
    const n = { h: d.hearings.filter(x => x.caseId === id).length, o: d.orders.filter(x => x.caseId === id).length, t: d.tasks.filter(x => x.caseId === id).length, dc: d.docs.filter(x => x.caseId === id).length };
    const run = keep => { const gone = d.docs.filter(x => x.caseId === id && !keep); gone.forEach(dropFile);
      app.mut(db => { db.cases = db.cases.filter(x => x.id !== id); db.hearings = db.hearings.filter(x => x.caseId !== id); db.orders = db.orders.filter(x => x.caseId !== id);
        if (keep) { db.tasks.forEach(t => { if (t.caseId === id) t.caseId = ''; }); db.docs.forEach(x => { if (x.caseId === id) x.caseId = ''; }); } else { db.tasks = db.tasks.filter(t => t.caseId !== id); db.docs = db.docs.filter(x => x.caseId !== id); }
        db.deadlines.forEach(x => { if (x.caseId === id) x.caseId = ''; }); (db.lims || []).forEach(x => { if (x.caseId === id) x.caseId = ''; }); if (db.chats) delete db.chats[id];
        logIt(db, `Case ${c.title} (${c.no}) deleted by ${db.user.name}` + (n.h + n.o ? ` with ${plural(n.h, 'hearing')} and ${plural(n.o, 'order')}` : '') + (keep && n.t + n.dc ? '; its tasks and documents were kept, not linked to a case' : (n.t + n.dc ? `, ${plural(n.t, 'task')} and ${plural(n.dc, 'document')}` : ''))); }, 'Case deleted');
      app.modal(null); app.go('cases'); };
    const linked = [n.h && plural(n.h, 'hearing'), n.o && plural(n.o, 'court order'), n.t && plural(n.t, 'task'), n.dc && plural(n.dc, 'document')].filter(Boolean);
    app.modal(() => h(Modal, { title: 'Delete this case?', onClose: () => app.modal(null), width: 480 },
      h('div', { style: { fontSize: 14, color: K.txt, lineHeight: 1.6 } }, `${c.title} (${c.no}) will be deleted.`, linked.length ? ` It has ${linked.join(', ')}.` : ' Nothing else is linked to it.', n.h + n.o ? ' Its hearings and orders are deleted with it.' : '', n.t + n.dc ? ' Do you also want to delete its tasks and documents (uploaded files included), or keep them without a case?' : '', ' This cannot be undone.'),
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' } }, h(Btn, { onClick: () => app.modal(null) }, 'Cancel'),
        n.t + n.dc ? h(Btn, { danger: true, onClick: () => run(true) }, 'Delete case, keep tasks and documents') : null,
        h(Btn, { primary: true, onClick: () => run(false) }, linked.length ? 'Delete case and everything linked' : 'Delete case'))));
  }
  function importCnr(app) {
    app.modal(() => h(Modal, { title: 'Import by CNR', sub: 'Enter the 16-character CNR printed on the case status page.', onClose: () => app.modal(null) },
      h(Form, { submit: 'Continue', onCancel: () => app.modal(null), note: window.LSB && LSB.on ? 'The case details are fetched from your court-data provider. If none is connected, the CNR is carried into the new-case form for you to complete.' : 'Fetching case details needs the server and a court-data provider. The CNR is checked and carried into the new-case form.',
        fields: [{ k: 'cnr', label: 'CNR number', req: true, ph: '4 letters and 12 digits', check: v => { const c = v.replace(/[\s-]/g, ''); if (!/^[A-Za-z]{4}\d{12}$/.test(c)) return 'A CNR has 4 letters followed by 12 digits'; if (app.db.cases.some(x => x.cnr === c.toUpperCase())) return 'This CNR is already in your cases'; return ''; } }],
        onSubmit: v => { const cnr = v.cnr.replace(/[\s-]/g, '').toUpperCase(); if (!(window.LSB && LSB.on)) return newCase(app, { cnr }); app.toast('Looking up the CNR…'); LSB.court(cnr).then(r => newCase(app, { cnr, title: r.title || '', no: r.caseNo || '', court: r.court || '', next: r.nextDate || '' })).catch(e => { app.toast(e.message); newCase(app, { cnr }); }); } })));
  }
  const needCase = app => { if (caseOpts(app.db).length) return false; app.toast('Add a case first.'); newCase(app); return true; };
  const withName = (opts, n) => n && !opts.includes(n) ? [n, ...opts] : opts;
  function addTask(app, caseId, editId) {
    const d = app.db, t0 = editId && d.tasks.find(t => t.id === editId);
    if (editId && (!t0 || !allowed(app, 'task.edit'))) return;
    app.modal(() => h(Modal, { title: t0 ? 'Edit task' : 'New task', onClose: () => app.modal(null) }, h(Form, { init: t0 ? { t: t0.t, caseId: t0.caseId || '', who: t0.who, due: t0.due } : { caseId: caseId || '', who: d.user.name, due: L.addDays(L.today(), 3) }, submit: t0 ? 'Save changes' : 'Add task', onCancel: () => app.modal(null),
      fields: [{ k: 't', label: 'Task', req: true, ph: 'What needs to be done?' }, { k: 'caseId', label: 'Case', type: 'select', blank: 'No case', options: caseOpts(d, t0 && t0.caseId) }, { k: 'who', label: 'Assigned to', type: 'select', options: withName(teamOpts(d), t0 && t0.who), half: true }, { k: 'due', label: 'Due date', type: 'date', req: true, half: true }],
      onSubmit: v => { if (t0) app.mut(db => { const t = db.tasks.find(x => x.id === editId); if (!t) return; Object.assign(t, { t: v.t.trim(), caseId: v.caseId || '', who: v.who, due: v.due }); logIt(db, `Task "${t.t}" edited by ${db.user.name}`, t.caseId); }, 'Task updated');
        else app.mut(db => { db.tasks.push({ id: L.uid('t'), caseId: v.caseId, t: v.t.trim(), who: v.who, due: v.due, done: false }); }, 'Task added'); app.modal(null); } })));
  }
  function delTask(app, id) {
    const t = app.db.tasks.find(x => x.id === id); if (!t || !allowed(app, 'task.delete')) return;
    confirmBox(app, 'Delete this task?', `"${t.t}" (${t.who}, due ${L.dayMon(t.due)}) will be deleted.`, 'Delete task', () => app.mut(db => { db.tasks = db.tasks.filter(x => x.id !== id); logIt(db, `Task "${t.t}" deleted by ${db.user.name}`, t.caseId); }, 'Task deleted'));
  }
  /* editId: edit that hearing (same form, plus the court). */
  function addHearing(app, caseId, date, editId) {
    if (needCase(app)) return;
    const d = app.db, x0 = editId && d.hearings.find(x => x.id === editId);
    if (editId && (!x0 || !allowed(app, 'hearing.edit'))) return;
    app.modal(() => h(Modal, { title: x0 ? 'Edit hearing' : 'Add hearing', sub: x0 ? caseOf(d, x0.caseId).title : null, onClose: () => app.modal(null) }, h(Form, { init: x0 ? { caseId: x0.caseId, date: x0.date, time: x0.time, purpose: x0.purpose || '', item: x0.item || '', listNo: x0.listNo || '', bench: x0.bench || '', assignee: x0.assignee, court: x0.court || '' } : { caseId: caseId || (caseOpts(d)[0] || [''])[0], date: date || L.today(), time: '10:30', assignee: d.user.name }, submit: x0 ? 'Save changes' : 'Add to calendar', onCancel: () => app.modal(null),
      fields: [{ k: 'caseId', label: 'Case', type: 'select', options: caseOpts(d, x0 && x0.caseId) }, { k: 'date', label: 'Date', type: 'date', req: true, half: true }, { k: 'time', label: 'Time', type: 'time', req: true, half: true }, { k: 'purpose', label: 'Purpose', ph: 'Arguments', half: true }, { k: 'item', label: 'Item no. (optional)', ph: 'Item 12', half: true }, { k: 'listNo', label: 'List no. (optional)', ph: 'Supplementary list', half: true }, { k: 'bench', label: 'Bench for this listing (optional)', ph: 'Defaults to the case bench', half: true }, { k: 'assignee', label: 'Appearing', type: 'select', options: withName(teamOpts(d), x0 && x0.assignee), half: !!x0 }, ...(x0 ? [{ k: 'court', label: 'Court', req: true, half: true }] : [])],
      onSubmit: v => clashGate(app, v, x0 ? [x0.id] : [], () => { if (x0) app.mut(db => { const x = db.hearings.find(y => y.id === editId); if (!x) return; const was = x.date;
          Object.assign(x, { caseId: v.caseId, date: v.date, time: v.time, court: v.court.trim(), item: v.item || '', listNo: (v.listNo || '').trim(), bench: (v.bench || '').trim(), purpose: v.purpose || x.purpose || 'Hearing', assignee: v.assignee });
          logIt(db, `Hearing of ${L.dmy(was)} edited by ${db.user.name}` + (was !== v.date ? ', moved to ' + L.dmy(v.date) : ''), v.caseId); }, 'Hearing updated');
        else app.mut(db => { const c = caseOf(db, v.caseId); db.hearings.push({ id: L.uid('h'), caseId: v.caseId, date: v.date, time: v.time, court: c.court, item: v.item || '', listNo: (v.listNo || '').trim(), bench: (v.bench || '').trim(), purpose: v.purpose || c.purpose || 'Hearing', assignee: v.assignee, outcome: '', brief: false }); logIt(db, `Hearing added for ${L.dmy(v.date)}`, v.caseId); }, 'Hearing added to calendar'); app.modal(null); }) })));
  }
  function delHearing(app, id) {
    const d = app.db, x = d.hearings.find(y => y.id === id); if (!x || !allowed(app, 'hearing.delete')) return;
    const o = x.fromOrder && d.orders.find(y => y.id === x.fromOrder && y.confirmed);
    confirmBox(app, 'Delete this hearing?', `The hearing of ${L.dmy(x.date)}, ${L.t12ap(x.time)} in ${caseOf(d, x.caseId).title} is removed from the calendar.` + (x.outcome ? ' Its recorded outcome goes with it.' : '') + (o ? ` The next date in the order of ${L.dmy(o.date)} will show as not confirmed again.` : ''), 'Delete hearing',
      () => app.mut(db => { db.hearings = db.hearings.filter(y => y.id !== id); db.hearings.forEach(y => { if (y.nextHearingId === id) y.nextHearingId = ''; }); const oo = o && db.orders.find(y => y.id === o.id); if (oo) oo.confirmed = false; logIt(db, `Hearing of ${L.dmy(x.date)} deleted by ${db.user.name}`, x.caseId); }, 'Hearing deleted'));
  }
  /* On or after the hearing date: outcome, a short note, and an optional next date that adds (or moves) the linked next hearing. */
  function recordOutcome(app, id) {
    const d = app.db, x = d.hearings.find(y => y.id === id); if (!x || !allowed(app, 'hearing.outcome')) return;
    if (x.date > L.today()) return app.toast('An outcome can be recorded on or after the day of the hearing.');
    const nx = x.nextHearingId && d.hearings.find(y => y.id === x.nextHearingId), legacy = x.outcome && !OUTCOMES.includes(x.outcome);
    app.modal(() => h(Modal, { title: x.outcome ? 'Edit outcome' : 'Record outcome', sub: `${caseOf(d, x.caseId).title} · ${L.dmy(x.date)}, ${L.t12ap(x.time)} · ${x.court}`, onClose: () => app.modal(null) },
      h(Form, { init: { outcome: legacy ? 'Other' : (x.outcome || 'Heard'), note: legacy ? x.outcome : (x.outcomeNote || ''), next: nx ? nx.date : '', time: nx ? nx.time : (x.time || '10:30') }, submit: 'Save outcome', onCancel: () => app.modal(null),
        note: nx ? `The next hearing on ${L.dmy(nx.date)} is linked to this one. Changing the date here moves it.` : 'A next date adds the next hearing for this case to the calendar.',
        fields: [{ k: 'outcome', label: 'Outcome', type: 'select', options: OUTCOMES }, { k: 'note', label: 'Short note (optional)', type: 'textarea', rows: 2, ph: 'Respondent sought time; last opportunity granted', check: (v, a) => a.outcome === 'Other' && !v ? 'Say briefly what happened' : (v.length > 400 ? 'Keep the note under 400 characters' : '') },
          { k: 'next', label: 'Next date (optional)', type: 'date', half: true, check: v => v && v <= x.date ? 'The next date must be after this hearing' : '' }, { k: 'time', label: 'Time', type: 'time', half: true, check: (v, a) => a.next && !v ? 'Required' : '' }],
        onSubmit: v => { const same = v.next && !nx && d.hearings.find(z => z.caseId === x.caseId && z.date === v.next && z.id !== x.id);
          const save = () => { let msg = 'Outcome recorded';
            app.mut(db => { const y = db.hearings.find(z => z.id === id); if (!y) return; Object.assign(y, { outcome: v.outcome, outcomeNote: (v.note || '').trim(), outcomeAt: L.today(), outcomeBy: db.user.name });
              const linked = y.nextHearingId && db.hearings.find(z => z.id === y.nextHearingId);
              if (v.next && linked) { if (linked.date !== v.next || linked.time !== v.time) { linked.date = v.next; linked.time = v.time; msg = 'Outcome saved · next hearing moved to ' + L.dmy(v.next); } }
              else if (v.next && same) { y.nextHearingId = same.id; msg = 'Outcome recorded · linked to the hearing already on ' + L.dmy(v.next); }
              else if (v.next) { const nid = L.uid('h'); db.hearings.push({ id: nid, caseId: y.caseId, date: v.next, time: v.time, court: y.court, item: '', purpose: y.purpose || 'Hearing', assignee: y.assignee, outcome: '', brief: false, prevHearingId: y.id }); y.nextHearingId = nid; msg = 'Outcome recorded · next hearing added for ' + L.dmy(v.next); }
              logIt(db, `Hearing of ${L.dmy(y.date)}: ${v.outcome}` + (y.outcomeNote ? ' — ' + y.outcomeNote : '') + (v.next ? '. Next date ' + L.dmy(v.next) : '') + '. Recorded by ' + db.user.name, y.caseId, { outcome: v.outcome }); });
            app.toast(msg); app.modal(null); };
          if (v.next && !same && (!nx || nx.date !== v.next || nx.time !== v.time)) clashGate(app, { date: v.next, time: v.time, assignee: x.assignee }, [x.id, nx && nx.id], save); else save(); } })));
  }
  /* Small action buttons for a hearing row. */
  const hearingActs = (app, x) => acts(x.date <= L.today() && h(Btn, { small: true, primary: x.date < L.today() && !x.outcome, onClick: () => recordOutcome(app, x.id) }, x.outcome ? 'Edit outcome' : 'Record outcome'), h(IconBtn, { label: 'Edit hearing', onClick: () => addHearing(app, '', '', x.id) }, '✎'), h(IconBtn, { label: 'Delete hearing', danger: true, onClick: () => delHearing(app, x.id) }, '×'));
  function uploadDoc(app, kind, caseId) {
    if (needCase(app)) return;
    const d = app.db, ev = kind === 'evidence';
    app.modal(() => h(Modal, { title: ev ? 'Add evidence' : 'Upload document', sub: driveOn(app) ? `The file is encrypted and saved to the hidden Legal Staff folder in your Google Drive (${app.driveSt.email || 'connected'}).` : window.LSB && LSB.on ? 'The file is stored privately for your firm.' : 'The file stays in this browser. Nothing is uploaded to a server.', onClose: () => app.modal(null) }, h(Form, { init: { caseId: caseId || (caseOpts(d)[0] || [''])[0], type: ev ? 'Evidence' : 'Pleading' }, submit: 'Choose file…', onCancel: () => app.modal(null),
      fields: [{ k: 'caseId', label: 'Case', type: 'select', options: caseOpts(d) }, ev ? { k: 'exhibit', label: 'Exhibit mark', ph: 'Ex. P-1', half: true } : { k: 'type', label: 'Type', type: 'select', options: ['Pleading', 'Court order', 'Draft', 'Correspondence', 'Other'], half: true }, ev ? { k: 'custody', label: 'Source / chain of custody', ph: 'Received from client on…', half: true } : { k: 'label', label: 'Title (optional)', ph: 'Defaults to the file name', half: true }],
      onSubmit: v => L.pickFile().then(fs => { if (!fs.length) return; const f = fs[0], id = L.uid('d'), ext = (f.name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4);
        storeFile(app, id, f).then(drive => { app.mut(db => { db.docs.unshift({ id, caseId: v.caseId, kind, ext, ...(drive ? { drive } : {}), name: (v.label || '').trim() || f.name.replace(/\.[^.]+$/, ''), meta: `${ev ? 'Evidence' : v.type} · ${L.size(f.size)} · uploaded by ${db.user.name}`, v: 'v1', added: L.today(), file: f.name, exhibit: v.exhibit || '', custody: v.custody || '' }); logIt(db, `${ev ? 'Evidence' : 'Document'} "${f.name}" added by ${db.user.name}`, v.caseId); }, ev ? 'Evidence added' : 'Document uploaded'); app.modal(null); }).catch(e => app.toast('Upload failed: ' + e.message)); }) })));
  }
  const docType = x => x.kind === 'evidence' ? 'Evidence' : (x.type || (DOC_TYPES.includes((x.meta || '').split(' · ')[0]) ? x.meta.split(' · ')[0] : 'Other'));
  const tagLine = x => (x.tags || []).length ? ' · Tags: ' + x.tags.join(', ') : '';
  /* Rename, re-type or re-tag a document or evidence record, or move it to another case. */
  function editDoc(app, id) {
    const d = app.db, x = d.docs.find(y => y.id === id); if (!x || !allowed(app, 'doc.edit')) return; const ev = x.kind === 'evidence';
    app.modal(() => h(Modal, { title: ev ? 'Edit evidence record' : 'Edit document', sub: x.file ? 'File: ' + x.file : null, onClose: () => app.modal(null) }, h(Form, { init: { name: x.name, type: docType(x), caseId: x.caseId || '', exhibit: x.exhibit || '', custody: x.custody || '', tags: (x.tags || []).join(', ') }, submit: 'Save changes', onCancel: () => app.modal(null),
      fields: [{ k: 'name', label: 'Title', req: true }, ev ? { k: 'exhibit', label: 'Exhibit mark', ph: 'Ex. P-1', half: true } : { k: 'type', label: 'Type', type: 'select', options: DOC_TYPES, half: true }, ev ? { k: 'custody', label: 'Source / chain of custody', half: true } : { k: 'caseId', label: 'Case', type: 'select', blank: 'Not linked to a case', options: caseOpts(d, x.caseId), half: true }, ...(ev ? [{ k: 'caseId', label: 'Case', type: 'select', blank: 'Not linked to a case', options: caseOpts(d, x.caseId) }] : []), { k: 'tags', label: 'Tags (optional)', ph: 'Comma separated, e.g. annexure, original' }],
      onSubmit: v => { app.mut(db => { const y = db.docs.find(z => z.id === id); if (!y) return; const was = y.name, seg = (y.meta || '').split(' · ');
        if (!ev) { y.type = v.type; seg[0] = v.type; y.meta = seg.join(' · '); } else { y.exhibit = (v.exhibit || '').trim(); y.custody = (v.custody || '').trim(); }
        y.name = v.name.trim(); y.caseId = v.caseId || ''; y.tags = [...new Set((v.tags || '').split(',').map(s => s.trim()).filter(Boolean))];
        logIt(db, `${ev ? 'Evidence' : 'Document'} "${was}" edited by ${db.user.name}` + (was !== y.name ? ', renamed to "' + y.name + '"' : ''), y.caseId); }, 'Saved'); app.modal(null); } })));
  }
  function delDoc(app, id) {
    const x = app.db.docs.find(y => y.id === id); if (!x || !allowed(app, 'doc.delete')) return; const ev = x.kind === 'evidence';
    confirmBox(app, 'Delete this ' + (ev ? 'evidence record' : 'document') + '?', `"${x.name}" will be removed from the case file` + (x.file ? ', with its uploaded file.' : '.'), 'Delete', () => { dropFile(x); app.mut(db => { db.docs = db.docs.filter(y => y.id !== id); logIt(db, `${ev ? 'Evidence' : 'Document'} "${x.name}" deleted by ${db.user.name}`, x.caseId); }, 'Deleted'); });
  }
  const docActs = (app, x) => acts(h(Btn, { small: true, onClick: () => openDoc(app, x) }, 'Download'), h(IconBtn, { label: 'Edit ' + x.name, onClick: () => editDoc(app, x.id) }, '✎'), h(IconBtn, { label: 'Delete ' + x.name, danger: true, onClick: () => delDoc(app, x.id) }, '×'));
  function openDoc(app, doc) { if (!doc.file) return app.toast('No file is attached to this record.'); (window.LSB && LSB.on ? (doc.drive ? LSB.drive.download(doc.drive) : LSB.download(doc.id, doc.file)) : L.files.get(doc.id)).then(f => f ? L.download(doc.file, f) : app.toast('The file is no longer in this browser.')).catch(() => app.toast('Could not read the file.')); }
  function addOrder(app, caseId) {
    if (needCase(app)) return;
    const d = app.db;
    app.modal(() => h(Modal, { title: 'Add court order', sub: autoOn(d) ? 'Paste the text of the order. The next date and key points are picked out by rules, and a future next date goes straight to the calendar (change this in Settings).' : 'Paste the text of the order. The next date and key points are picked out by rules, and nothing reaches the calendar until you confirm.', onClose: () => app.modal(null), width: 620 }, h(Form, { init: { caseId: caseId || (caseOpts(d)[0] || [''])[0], date: L.today() }, submit: 'Read order', onCancel: () => app.modal(null),
      fields: [{ k: 'caseId', label: 'Case', type: 'select', options: caseOpts(d), half: true }, { k: 'date', label: 'Date of order', type: 'date', req: true, half: true }, { k: 'text', label: 'Order text', type: 'textarea', rows: 8, req: true, ph: 'Paste the numbered paragraphs of the order here', check: v => v.length < 20 ? 'Paste the operative part of the order' : '' }],
      onSubmit: v => { const r = L.readOrder(v.text), id = L.uid('o'), c = caseOf(d, v.caseId);
        app.mut(db => { db.orders.unshift({ id, caseId: v.caseId, date: v.date, source: 'Manual entry · ' + L.dayMon(L.today()) + ', ' + L.nowHM(), official: false, file: 'Pasted text · ' + r.paras.length + ' paragraph' + (r.paras.length === 1 ? '' : 's'), cause: c.no, paras: r.paras, points: r.points, summary: r.points.slice(0, 2).join(' ') + (r.nextDate ? ' Next date: ' + L.dmy(r.nextDate) + '.' : ''), nextDate: r.nextDate, nextFrom: r.nextFrom, confirmed: false });
          db.docs.unshift({ id: L.uid('d'), caseId: v.caseId, kind: 'document', ext: 'TXT', name: 'Order dated ' + L.dmy(v.date), meta: 'Court order · manual entry', v: 'v1', added: L.today(), orderId: id }); logIt(db, `Order of ${L.dmy(v.date)} added by ${db.user.name}.` + (r.nextDate ? ' Next date extracted.' : ''), v.caseId); if (autoOn(db) && r.nextDate && r.nextDate >= L.today()) applyNext(db, db.orders[0], 'added by ' + db.user.name); }, r.nextDate ? (autoOn(app.db) && r.nextDate >= L.today() ? 'Order read · next date added to the calendar' : 'Order read · next date found') : 'Order saved · no next date found');
        app.modal(null); app.go('order', id); } })));
  }
  /* ---------- automatic court-order updates ---------- */
  const autoOn = d => (d.settings || {}).autoOrders !== false;
  /* Confirms an order's next date and puts the hearing on the calendar, as the Confirm button does. */
  function applyNext(db, o, who) {
    const cs = db.cases.find(x => x.id === o.caseId) || {}; o.confirmed = true;
    if (!db.hearings.some(x => x.caseId === o.caseId && x.date === o.nextDate)) db.hearings.push({ id: L.uid('h'), caseId: o.caseId, date: o.nextDate, time: '10:30', court: cs.court || '', item: '', purpose: cs.purpose || 'Hearing', assignee: (cs.team || [])[0] || db.user.name, outcome: '', brief: false, fromOrder: o.id });
    logIt(db, `Next date ${L.dmy(o.nextDate)} added automatically from the order` + (who ? ' (' + who + ')' : ''), o.caseId);
  }
  /* Asks the court-data provider about every open case that has a CNR: new next dates and new orders are added. Server mode with a provider only. */
  let checking = false;
  async function autoCheck(app, force) {
    const d = app.db, st = d.settings || {};
    if (checking || !(window.LSB && LSB.on) || !d.session) return;
    if (!force && (st.autoCheck === false || (st.lastCheck && Date.now() - Date.parse(st.lastCheck) < 6 * 36e5))) return;
    const cs = d.cases.filter(c => c.cnr && (c.status === 'active' || c.status === 'pending')).slice(0, 30);
    if (!cs.length) { if (force) app.toast('No open case has a CNR to check.'); return; }
    checking = true; const got = []; let none = false, bad = 0;
    if (force) app.toast('Checking ' + plural(cs.length, 'case') + ' with the court-data provider…');
    for (const c of cs) { try { got.push([c.id, await LSB.court(c.cnr)]); } catch (e) { if (/No court-data provider/i.test(e.message)) { none = true; break; } bad++; } }
    checking = false; let upd = 0;
    app.mut(db => { const T = L.today(); db.settings.lastCheck = new Date().toISOString();
      got.forEach(([id, r]) => { const c = db.cases.find(x => x.id === id); if (!c || !r) return; let ch = false;
        const nd = L.valid(r.nextDate) && r.nextDate >= T ? r.nextDate : '', od = L.valid(r.lastOrderDate) ? r.lastOrderDate : '';
        if (nd && !db.hearings.some(x => x.caseId === id && x.date === nd)) { db.hearings.push({ id: L.uid('h'), caseId: id, date: nd, time: '10:30', court: c.court || '', item: '', purpose: c.purpose || 'Hearing', assignee: (c.team || [])[0] || db.user.name, outcome: '', brief: false, fromCourt: true }); logIt(db, `Court data: next date ${L.dmy(nd)} added`, id); ch = true; }
        if (od && !db.orders.some(x => x.caseId === id && x.date === od)) { const txt = r.status ? 'Case status: ' + r.status + '.' : 'An order is listed on the court record.';
          db.orders.unshift({ id: L.uid('o'), caseId: id, date: od, source: 'Court-data provider · ' + L.dayMon(T), official: true, file: 'From court data', cause: c.no, paras: [], points: [txt], summary: txt + (nd ? ' Next date: ' + L.dmy(nd) + '.' : ''), nextDate: nd, nextFrom: 'court data', confirmed: !!nd });
          logIt(db, `Court data: order of ${L.dmy(od)} added`, id); ch = true; }
        if (/dispos|decided|closed|dismiss|withdrawn|judg?ment/i.test(r.status || '') && (c.status === 'active' || c.status === 'pending')) { c.status = 'disposed'; logIt(db, 'Court data: case marked Disposed (' + r.status + ')', id); ch = true; }
        if (ch) upd++; }); },
      null);
    if (none) { if (force) app.toast('No court-data provider is connected yet.'); }
    else if (upd) app.toast(`Court check: ${plural(upd, 'case')} updated`);
    else if (force) app.toast(bad ? `Checked, but ${plural(bad, 'case')} could not be read.` : 'Checked: nothing new.');
  }
  /* The text record kept for an order (older ones are matched by name). */
  const orderDocs = (d, o) => d.docs.filter(x => x.orderId === o.id || (!x.orderId && !x.file && x.caseId === o.caseId && x.name === 'Order dated ' + L.dmy(o.date) && /Court order · manual entry/.test(x.meta || '')));
  /* Edit the date, case or text. The text is read again; a changed next date has to be confirmed again. */
  function editOrder(app, id) {
    const d = app.db, o = d.orders.find(x => x.id === id); if (!o || !allowed(app, 'order.edit')) return;
    app.modal(() => h(Modal, { title: 'Edit court order', sub: 'The text is read again for the next date and key points.' + (o.confirmed ? ' If the next date changes, confirm it again.' : ''), onClose: () => app.modal(null), width: 620 }, h(Form, { init: { caseId: o.caseId, date: o.date, text: (o.paras || []).map((p, i) => (i + 1) + '. ' + p).join('\n\n') }, submit: 'Save changes', onCancel: () => app.modal(null),
      fields: [{ k: 'caseId', label: 'Case', type: 'select', options: caseOpts(d, o.caseId), half: true }, { k: 'date', label: 'Date of order', type: 'date', req: true, half: true }, { k: 'text', label: 'Order text', type: 'textarea', rows: 8, req: true, check: v => v.length < 20 ? 'Paste the operative part of the order' : '' }],
      onSubmit: v => { const r = L.readOrder(v.text); let moved = false;
        app.mut(db => { const x = db.orders.find(y => y.id === id); if (!x) return; const docs = orderDocs(db, x), keepManual = x.nextFrom === 'entered by you' && !r.nextDate, next = keepManual ? x.nextDate : r.nextDate;
          if (next !== x.nextDate && x.confirmed) { x.confirmed = false; db.hearings = db.hearings.filter(hh => hh.fromOrder !== x.id || hh.outcome); moved = true; }
          if (v.caseId !== x.caseId) db.hearings.forEach(hh => { if (hh.fromOrder === x.id) hh.caseId = v.caseId; });
          Object.assign(x, { caseId: v.caseId, date: v.date, paras: r.paras, points: r.points, summary: r.points.slice(0, 2).join(' ') + (next ? ' Next date: ' + L.dmy(next) + '.' : ''), nextDate: next, nextFrom: keepManual ? x.nextFrom : r.nextFrom, cause: caseOf(db, v.caseId).no, file: 'Pasted text · ' + plural(r.paras.length, 'paragraph'), edited: L.today() });
          docs.forEach(y => { y.caseId = v.caseId; y.name = 'Order dated ' + L.dmy(v.date); y.orderId = x.id; });
          if (autoOn(db) && !x.confirmed && x.nextDate && x.nextDate >= L.today()) { applyNext(db, x, 'order edited'); moved = false; }
          logIt(db, `Order of ${L.dmy(v.date)} edited by ${db.user.name}` + (moved ? '; its next date changed and needs confirming again' : ''), v.caseId); }, moved ? 'Order updated · confirm the new next date' : 'Order updated');
        app.modal(null); } })));
  }
  function delOrder(app, id) {
    const d = app.db, o = d.orders.find(x => x.id === id); if (!o || !allowed(app, 'order.delete')) return;
    const hs = d.hearings.filter(x => x.fromOrder === id), drop = hs.filter(x => !x.outcome);
    confirmBox(app, 'Delete this order?', `The order of ${L.dmy(o.date)} in ${caseOf(d, o.caseId).title} and its text record will be deleted.` + (drop.length ? ` The hearing it added on ${drop.map(x => L.dmy(x.date)).join(', ')} is removed from the calendar too.` : '') + (hs.length > drop.length ? ' Hearings that already have an outcome are kept.' : ''), 'Delete order',
      () => { app.mut(db => { const docs = orderDocs(db, o).map(x => x.id); db.orders = db.orders.filter(x => x.id !== id); db.docs = db.docs.filter(x => !docs.includes(x.id)); db.hearings = db.hearings.filter(x => x.fromOrder !== id || x.outcome); db.hearings.forEach(x => { if (x.fromOrder === id) x.fromOrder = ''; }); logIt(db, `Order of ${L.dmy(o.date)} deleted by ${db.user.name}`, o.caseId); }, 'Order deleted'); app.go('orders'); });
  }
  /* Sign-up: who you are, the area of law you work in, then the firm details. */
  function Choice({ items, value, onPick, cols }) {
    return h('div', { role: 'radiogroup', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(' + (cols || 200) + 'px,1fr))', gap: 10 } }, items.map(x => {
      const on = value === x.k;
      return h('button', { key: x.k, type: 'button', role: 'radio', 'aria-checked': on, 'data-pick': x.k, onClick: () => onPick(x.k), className: 'ls-btn', style: { textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 14px', borderRadius: 10, border: '1.5px solid ' + (on ? K.ink : K.line), background: on ? K.soft : '#FFFFFF', color: K.ink } },
        h('span', { style: { fontSize: 14, fontWeight: 600 } }, x.label), h('span', { style: { fontSize: 12.5, color: K.mut, lineHeight: 1.4 } }, x.sub));
    }));
  }
  function OnboardFlow({ app, must }) {
    const d = app.db, [step, setStep] = useState(0), [kind, setKind] = useState(d.firm.kind || 'advocate'), [dom, setDom] = useState(d.firm.domain || '');
    const [labels, setLabels] = useState(true), area = dom ? LSP.DOMAINS[dom] : null;
    const kindName = LSP.kind({ kind }).label;
    const roles = kind === 'corporate' ? ['Head of Legal', 'General Counsel', 'Legal Manager', 'Legal Associate', 'Paralegal', 'Office Manager'] : kind === 'advocate' ? ['Advocate', 'Junior Advocate', 'Paralegal', 'Office Manager'] : ['Advocate', 'Managing Partner', 'Partner', 'Associate', 'Junior Advocate', 'Paralegal', 'Office Manager'];
    const nameLabel = { advocate: 'Practice name (e.g. Adv. Meera Iyer)', chamber: 'Chamber name', firm: 'Law firm name', corporate: 'Company or department name' }[kind];
    const titles = ['Who is this for?', 'Your area of practice', 'Set up your practice'];
    const subs = ['Pick the one that fits best. It decides how your team is set up.', 'Your dashboard, case stages, labels and limitation presets follow this. You can change it later in Settings.', 'These details appear on your letterhead, invoices and briefings. You can change them later in Settings.'];
    const finish = v => { const pick = { kind, domain: dom || 'general', labels: labels ? LSP.labelsFor(dom || 'general') : [] }; const all = Object.assign({}, v, pick);
      if (window.LSB && LSB.on && !app.db.firmId) { app.modal(null); return app.createFirm(all); }
      app.mut(db => { const name = v.name.trim(), old = db.user.name; db.user.name = name; db.user.role = v.role; db.user.title = (/(Partner|Associate|Advocate)/.test(v.role) ? 'Adv. ' : '') + name;
        db.firm.name = v.firm.trim(); db.firm.city = v.city.trim(); db.firm.address = (v.address || '').trim() || v.city.trim(); db.firm.kind = pick.kind; db.firm.domain = pick.domain; LSP.addLabels(db, pick.labels);
        const u = db.team.find(x => x.email === db.user.email) || db.team[0]; if (u) Object.assign(u, { name, title: db.user.title, role: v.role }); else db.team.push({ id: 'u1', name, title: db.user.title, role: v.role, email: db.user.email, status: 'Active' });
        if (old && old !== name) { db.tasks.forEach(t => { if (t.who === old) t.who = name; }); db.hearings.forEach(x => { if (x.assignee === old) x.assignee = name; }); db.cases.forEach(c => { c.team = c.team.map(n => n === old ? name : n); }); } }, 'Your practice is set up', true); app.modal(null); if (!L.access(app.db.sub).ok && L.access(app.db.sub).state === 'none') app.go('pricing'); };
    const nav = (back, next, nextLabel, disabled) => h('div', { style: { display: 'flex', gap: 10, justifyContent: 'space-between' } }, back ? h(Btn, { onClick: back }, 'Back') : h('span'), h(Btn, { primary: true, disabled, onClick: next }, nextLabel || 'Continue'));
    return h(Modal, { art: 'setup', width: step === 1 ? 760 : 560, title: titles[step], sub: subs[step], onClose: () => must ? app.toast('Set up your practice to continue, or sign out from the account menu.') : app.modal(null) },
      h('div', { style: { fontSize: 12, color: K.mut, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600 } }, 'Step ' + (step + 1) + ' of 3'),
      step === 0 && h(React.Fragment, null, h(Choice, { items: LSP.KINDS, value: kind, onPick: setKind }), nav(null, () => setStep(1))),
      step === 1 && h(React.Fragment, null, h(Choice, { items: LSP.list(), value: dom, onPick: setDom, cols: 220 }),
        area && area.labels.length > 0 && h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, color: K.txt } }, h('input', { type: 'checkbox', checked: labels, onChange: e => setLabels(e.target.checked) }), 'Add the usual labels for ' + area.label.toLowerCase() + ': ' + area.labels.map(l => l[1]).join(', ')),
        nav(() => setStep(0), () => setStep(2), 'Continue', !dom)),
      step === 2 && h(React.Fragment, null,
        h('div', { style: { fontSize: 13, color: K.txt, background: K.soft2, borderRadius: 8, padding: '8px 12px' } }, kindName + ' · ' + (area ? area.label : 'General practice'), ' ', h('a', { href: '#', onClick: e => { e.preventDefault(); setStep(0); } }, 'Change')),
        h(Form, { init: { name: d.user.name, role: roles.includes(d.user.role) ? d.user.role : roles[0], firm: d.firm.name || app.pendingFirm || '', city: d.firm.city, address: d.firm.address }, submit: 'Start using Legal Staff',
          fields: [{ k: 'name', label: 'Your full name', req: true, half: true }, { k: 'role', label: 'Designation', type: 'select', options: roles, half: true }, { k: 'firm', label: nameLabel, req: true }, { k: 'city', label: 'City', req: true, half: true }, { k: 'address', label: 'Office address', half: true }], onSubmit: finish })),
      must && h('div', { style: { fontSize: 13, color: K.mut, borderTop: '1px solid ' + K.line, paddingTop: 12 } }, 'Signed in as ' + ((d.session && d.session.email) || d.user.email) + '. ', h('a', { href: '#', onClick: e => { e.preventDefault(); app.modal(null); app.signOut(); } }, 'Sign out')));
  }
  function onboard(app) {
    const must = window.LSB && LSB.on && !app.db.firmId;
    app.modal(() => h(OnboardFlow, { app, must }));
  }
  /* ---------- limitation calculations (records of kind 'limitation', d.lims) ---------- */
  const limOf = (d, id) => (d.lims || []).find(x => x.id === id);
  const RULE_OPTS = (firm) => LSP.ruleOrder(firm, L.RULES.map(r => r.k)).map(k => [k, L.rule(k).label]);
  /* A calculation form whose fields follow the chosen preset. */
  function LimForm({ app, l0 }) {
    const d = app.db, T = L.today();
    const [v, setV] = useState(() => Object.assign({ title: '', rule: RULE_OPTS(app.db.firm)[0][0], caseId: '', judgment: '', applied: '', ready: '', n: '', unit: 'd', basis: '', copy: false }, l0 || {}));
    const [err, setErr] = useState({}), set = (k, x) => setV(Object.assign({}, v, { [k]: x })), r = L.rule(v.rule), copy = r.custom ? !!v.copy : r.copy;
    const inp = (k, type, ph) => h('input', { type: type || 'text', value: v[k] == null ? '' : v[k], placeholder: ph, onChange: e => set(k, e.target.value), style: X.input });
    const go = e => { e.preventDefault(); const er = {};
      if (!v.title.trim()) er.title = 'Required';
      if (!r.none && !v.judgment) er.judgment = 'Required'; else if (v.judgment && v.judgment > T) er.judgment = 'This date is in the future';
      if (r.custom && !(+v.n >= 1 && +v.n <= 9999)) er.n = 'Enter a whole number';
      if (r.custom && !v.basis.trim()) er.basis = 'Required';
      if (copy && v.applied) { if (v.judgment && v.applied < v.judgment) er.applied = 'Cannot be before the start date'; else if (v.applied > T) er.applied = 'This date is in the future'; }
      if (copy && v.ready) { if (!v.applied) er.ready = 'Enter the date the copy was applied for first'; else if (v.ready < v.applied) er.ready = 'Cannot be before it was applied for'; else if (v.ready > T) er.ready = 'This date is in the future'; }
      setErr(er); if (Object.keys(er).length) return;
      const row = { title: v.title.trim(), rule: v.rule, caseId: v.caseId || '', judgment: v.judgment || '', applied: copy ? v.applied || '' : '', ready: copy && v.applied ? v.ready || '' : '', n: r.custom ? String(Math.round(+v.n)) : '', unit: r.custom ? v.unit : 'd', basis: r.custom ? v.basis.trim() : '', copy: r.custom ? !!v.copy : false };
      if (l0) { const facts = ['rule', 'judgment', 'applied', 'ready', 'n', 'unit', 'basis', 'copy'].some(k => String(row[k]) !== String(l0[k] == null ? (k === 'copy' ? false : (k === 'unit' ? 'd' : '')) : l0[k]));
        app.mut(db => { const x = limOf(db, l0.id); if (!x) return; Object.assign(x, row); if (facts && x.approved) unapprove(db, x); else syncDeadline(db, x); logIt(db, `Limitation calculation "${row.title}" edited by ${db.user.name}`, row.caseId); }, facts && l0.approved ? 'Saved. The facts changed, so approve the new date again.' : 'Calculation saved');
        app.modal(null); return; }
      const id = L.uid('l'); app.mut(db => { db.lims.unshift(Object.assign({ id, approved: false, approvedAt: '', sent: false }, row)); }, 'Calculation started'); app.readyDraft = ''; app.modal(null); app.go('limitation', id); };
    const F = (k, label, el, half) => h(Field, { key: k, label, error: err[k], half }, el);
    return h('form', { onSubmit: go, noValidate: true, style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14 } },
        F('title', 'Matter', inp('title', 'text', 'Appeal against decree in …')),
        F('rule', 'Rule', h('select', { value: v.rule, onChange: e => set('rule', e.target.value), style: X.input, 'aria-label': 'Rule' }, RULE_OPTS(app.db.firm).map(o => h('option', { key: o[0], value: o[0] }, o[1])))),
        h('div', { key: 'rn', style: { flex: '1 1 100%', fontSize: 13, lineHeight: 1.55, background: r.none ? K.redBg : K.soft2, color: r.none ? K.red : K.txt, borderRadius: 8, padding: '10px 12px' } },
          r.custom ? 'Enter the period and the provision it comes from. The certified-copy and working-day rules are applied as for the presets.' : (r.none ? r.basis + '. No date is calculated. ' : `${r.kind}: ${L.period(r.n, r.u)} from ${r.pre ? `the day the cause of action arises, i.e. when ${r.pre} days to pay after receiving the demand notice have passed` : 'the ' + r.start.replace(/^Date/, 'date')}. ${r.basis}. `) + (r.custom ? '' : 'Preset only: check the statute / rules before relying on it.')),
        r.custom && F('n', 'Period', inp('n', 'text', 'e.g. 30'), true),
        r.custom && F('unit', 'Unit', h('select', { value: v.unit, onChange: e => set('unit', e.target.value), style: X.input, 'aria-label': 'Unit' }, [['d', 'Days'], ['m', 'Months'], ['y', 'Years']].map(o => h('option', { key: o[0], value: o[0] }, o[1]))), true),
        r.custom && F('basis', 'Provision or basis', inp('basis', 'text', 'e.g. Art. 137, Limitation Act')),
        r.custom && h('label', { key: 'copy', style: { flex: '1 1 100%', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, color: K.txt } }, h('input', { type: 'checkbox', checked: !!v.copy, onChange: e => set('copy', e.target.checked) }), 'Exclude the time taken to get a certified copy (s.12(2))'),
        F('caseId', 'Linked case (optional)', h('select', { value: v.caseId, onChange: e => set('caseId', e.target.value), style: X.input, 'aria-label': 'Linked case' }, h('option', { value: '' }, 'Not linked'), caseOpts(d, l0 && l0.caseId).map(o => h('option', { key: o[0], value: o[0] }, o[1])))),
        F('judgment', r.start + (r.none ? ' (optional)' : ''), inp('judgment', 'date'), true),
        copy && F('applied', 'Certified copy applied for on (leave empty if none)', inp('applied', 'date'), true),
        copy && l0 && v.applied && F('ready', 'Certified copy ready on', inp('ready', 'date'), true)),
      h('div', { style: { fontSize: 12.5, color: K.mut } }, l0 && l0.approved ? 'Changing a fact withdraws the approval; approve the new date again to put it back in alerts and the briefing.' : 'Nothing is sent or alerted until you approve the date.'),
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, h(Btn, { onClick: () => app.modal(null) }, 'Cancel'), h('button', { type: 'submit', className: 'ls-btn', style: { height: 36, padding: '0 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 500, border: 0, background: K.ink, color: '#fff' } }, l0 ? 'Save changes' : 'Start calculation')));
  }
  function newLim(app, editId) {
    const l0 = editId && limOf(app.db, editId); if (editId && (!l0 || !allowed(app, 'deadline.edit'))) return;
    app.modal(() => h(Modal, { title: l0 ? 'Edit calculation' : 'New limitation calculation', sub: l0 ? l0.title : 'Pick a rule. Each preset shows its period, start event and source; check the statute / rules before relying on it.', onClose: () => app.modal(null), width: 580 }, h(LimForm, { app, l0 })));
  }
  /* The approved date of a calculation lives in a 'deadline' record (source: 'limitation') so alerts, the Deadlines list and the briefing see it. */
  function syncDeadline(db, l) {
    const c = L.limitation(l), x = db.deadlines.find(y => y.limId === l.id);
    if (!l.approved || !c.due) { if (x) db.deadlines = db.deadlines.filter(y => y !== x); l.dlId = ''; return; }
    const row = { source: 'limitation', limId: l.id, caseId: l.caseId || '', title: l.title, rule: L.rule(l.rule).custom ? (l.basis || 'Custom period') : L.rule(l.rule).basis, due: c.due, approved: true };
    if (x) { if (x.due !== row.due) { x.done = false; x.doneAt = ''; } Object.assign(x, row); l.dlId = x.id; }
    else { const id = L.uid('dl'); db.deadlines.push(Object.assign({ id, done: false }, row)); l.dlId = id; }
  }
  function unapprove(db, l) { l.approved = false; l.approvedAt = ''; syncDeadline(db, l); }
  function approveLim(app, id) {
    const l = limOf(app.db, id); if (!l) return; const c = L.limitation(l);
    if (!c.due) return app.toast(c.none && L.rule(l.rule).none ? 'A writ petition has no fixed period, so there is no date to approve.' : 'Enter the missing facts first.');
    if (c.needsReady) return app.toast('Enter the date the certified copy was ready first.');
    app.mut(db => { const x = limOf(db, id); x.approved = true; x.approvedAt = L.fmt(L.today()) + ' at ' + L.nowHM() + ' IST'; x.approvedBy = db.user.name; syncDeadline(db, x); logIt(db, 'Limitation date ' + L.dmy(c.due) + ' for "' + x.title + '" approved by ' + db.user.name, x.caseId); }, window.LSB && LSB.on ? 'Approved. The date is in Deadlines, in-app alerts and the morning briefing email.' : 'Approved. The date is in Deadlines and in-app alerts on this device.');
  }
  function withdrawLim(app, id) { app.mut(db => { const x = limOf(db, id); if (!x) return; unapprove(db, x); logIt(db, `Approval of the limitation date for "${x.title}" withdrawn by ${db.user.name}`, x.caseId); }, 'Approval withdrawn. The date is no longer in alerts or the briefing.'); }
  function markDone(app, id, done) {
    const x = app.db.deadlines.find(y => y.id === id); if (!x || !allowed(app, 'deadline.edit')) return;
    app.mut(db => { const y = db.deadlines.find(z => z.id === id); y.done = !!done; y.doneAt = done ? L.today() : ''; y.doneBy = done ? db.user.name : ''; logIt(db, `Deadline "${y.title}" ${done ? 'marked done' : 'reopened'} by ${db.user.name}`, y.caseId); }, done ? 'Marked done. It no longer appears in alerts or reminders.' : 'Reopened');
  }
  function addDeadline(app, editId) {
    const d = app.db, x0 = editId && d.deadlines.find(x => x.id === editId);
    if (editId && (!x0 || !allowed(app, 'deadline.edit'))) return;
    app.modal(() => h(Modal, { title: x0 ? 'Edit deadline' : 'Add a deadline', onClose: () => app.modal(null) }, h(Form, { init: x0 ? { title: x0.title, rule: x0.rule === 'Entered manually' ? '' : x0.rule, due: x0.due, caseId: x0.caseId || '' } : null, submit: x0 ? 'Save changes' : 'Add deadline', onCancel: () => app.modal(null),
      fields: [{ k: 'title', label: 'What is due', req: true, ph: 'Written statement, reply, filing…' }, { k: 'rule', label: 'Provision or basis', ph: 'Order VIII r.1 CPC', half: true }, { k: 'due', label: 'Last date', type: 'date', req: true, half: true }, { k: 'caseId', label: 'Linked case (optional)', type: 'select', blank: 'Not linked', options: caseOpts(d, x0 && x0.caseId) }],
      onSubmit: v => { const row = { caseId: v.caseId || '', title: v.title.trim(), rule: (v.rule || '').trim() || 'Entered manually', due: v.due };
        if (x0) app.mut(db => { const x = db.deadlines.find(y => y.id === editId); if (!x) return; Object.assign(x, row); logIt(db, `Deadline "${row.title}" edited by ${db.user.name}` + (x0.due !== row.due ? `, last date now ${L.dmy(row.due)}` : ''), row.caseId); }, 'Deadline updated');
        else app.mut(db => { db.deadlines.push(Object.assign({ id: L.uid('dl'), approved: true, done: false }, row)); }, 'Deadline added'); app.modal(null); } })));
  }
  function delDeadline(app, id) {
    const x = app.db.deadlines.find(y => y.id === id); if (!x || !allowed(app, 'deadline.delete')) return;
    confirmBox(app, 'Delete this deadline?', `"${x.title}", due ${L.fmt(x.due)}, will no longer be tracked or shown in alerts.`, 'Delete deadline', () => app.mut(db => { db.deadlines = db.deadlines.filter(y => y.id !== id); logIt(db, `Deadline "${x.title}" deleted by ${db.user.name}`, x.caseId); }, 'Deadline deleted'));
  }
  function delLim(app, id) {
    const l = limOf(app.db, id); if (!l || !allowed(app, 'deadline.delete')) return;
    confirmBox(app, 'Delete this limitation calculation?', `The calculation for "${l.title}", its approval and its entry in Deadlines will be deleted. Deadlines you added yourself are kept.`, 'Delete calculation', () => { app.mut(db => { db.lims = db.lims.filter(x => x.id !== id); db.deadlines = db.deadlines.filter(x => x.limId !== id); logIt(db, `Limitation calculation "${l.title}" deleted by ${db.user.name}`, l.caseId); }, 'Calculation deleted'); app.go('limitation'); });
  }
  /* Saved calculations, newest first. sel: the one open on the page. */
  function limList(app, sel) {
    const d = app.db, T = L.today();
    return h(Card, { title: `Calculations (${d.lims.length})`, right: h(Btn, { small: true, onClick: () => newLim(app) }, 'New calculation') }, d.lims.map(l => { const c = L.limitation(l), on = l.id === sel;
      const st = c.none ? (L.rule(l.rule).none ? 'No fixed period' : 'Facts missing') : c.needsReady ? 'Copy date needed' : l.approved ? (d.deadlines.some(x => x.limId === l.id && x.done) ? 'Approved · done' : 'Approved') : 'Needs approval';
      return h(Line, { key: l.id }, h('button', { type: 'button', onClick: () => app.go('limitation', l.id), 'aria-current': on ? 'true' : undefined, style: { flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'none', padding: 0, color: K.ink, fontSize: 14, fontWeight: on ? 600 : 400 } }, (on ? '▸ ' : '') + l.title,
          h('div', { style: { fontSize: 12, color: K.mut, fontWeight: 400 } }, [L.rule(l.rule).custom ? 'Custom · ' + L.period(+l.n || 1, l.unit) : L.rule(l.rule).label, c.due && !c.needsReady ? 'last date ' + L.fmt(c.due) + (c.daysLeft >= 0 ? ' · ' + plural(c.daysLeft, 'day') + ' left' : ' · passed') : '', l.caseId && caseOf(d, l.caseId).title].filter(Boolean).join(' · '))),
        h(Chip, { tone: st === 'Needs approval' || st === 'Copy date needed' ? 'red' : (st === 'Approved' ? '' : 'grey') }, st),
        h(IconBtn, { label: 'Edit calculation ' + l.title, onClick: () => newLim(app, l.id) }, '✎'), h(IconBtn, { label: 'Delete calculation ' + l.title, danger: true, onClick: () => delLim(app, l.id) }, '×')); }));
  }
  function deadlinesCard(app) {
    const d = app.db, T = L.today(), sorted = d.deadlines.slice().sort((a, b) => (!!a.done - !!b.done) || a.due.localeCompare(b.due));
    return h(Card, { title: 'Deadlines', right: h(Btn, { small: true, onClick: () => addDeadline(app) }, '+ Add a deadline') }, sorted.map(x => { const n = L.diffDays(x.due, T), lim = x.source === 'limitation';
      return h(Line, { key: x.id }, h('div', { style: { flex: 1, minWidth: 0, color: x.done ? K.mut : K.ink, textDecoration: x.done ? 'line-through' : 'none' } }, x.title,
          h('div', { style: { fontSize: 12, color: !x.done && n >= 0 && n <= 3 ? K.red : K.mut, textDecoration: 'none' } }, [lim ? 'Limitation (approved)' : '', x.rule, 'due ' + L.fmt(x.due), x.done ? 'done' + (x.doneAt ? ' ' + L.dayMon(x.doneAt) : '') : (n === 0 ? 'due today' : n === 1 ? 'due tomorrow' : n > 0 ? plural(n, 'day') + ' left' : plural(-n, 'day') + ' ago'), x.caseId && caseOf(d, x.caseId).title].filter(Boolean).join(' · '))),
        h(Btn, { small: true, onClick: () => markDone(app, x.id, !x.done) }, x.done ? 'Undo' : 'Mark done'),
        lim ? h(IconBtn, { label: 'Open calculation', onClick: () => app.go('limitation', x.limId) }, '↗') : h(IconBtn, { label: 'Edit deadline', onClick: () => addDeadline(app, x.id) }, '✎'),
        !lim && h(IconBtn, { label: 'Delete deadline', danger: true, onClick: () => delDeadline(app, x.id) }, '×')); }),
      !d.deadlines.length && h(Empty, { small: true, title: 'No deadlines yet', text: 'Add a deadline with a known last date, or approve a limitation calculation and its date appears here.' }),
      d.deadlines.length > 0 && h('div', { style: { fontSize: 12.5, color: K.mut, marginTop: 10, lineHeight: 1.5 } }, window.LSB && LSB.on ? 'Open deadlines due within 7 days (approved limitation dates within 30) are in the morning briefing email, flagged when due today, tomorrow or in 3 days. Done deadlines drop out.' : 'Deadlines due within 7 days show in the Alerts menu on this device. Briefing emails need the server.'));
  }

  /* ---------- case details: parties, stage, issues, arguments, missing documents, summary ---------- */
  const PET = 'Petitioner / appellant side', RES = 'Respondent side';
  const sideOf = p => p.side || (/respond|defend|opposite|accused|non-applicant/i.test(p.role || '') ? 'respondent' : 'petitioner');
  const partyText = p => p.name + (p.note ? ' — ' + p.note : '');
  const ourArgs = c => c.ourArgs || (c.args ? String(c.args).split(/\n+/).map(s => s.trim()).filter(Boolean) : []);
  /* Rule-based: the key points of every stored order, oldest first, each with its order as the citation. */
  function draftSummary(d, id) {
    const c = d.cases.find(x => x.id === id), os = d.orders.filter(o => o.caseId === id).sort((a, b) => a.date.localeCompare(b.date)); if (!c || !os.length) return '';
    const pet = (c.parties || []).filter(p => sideOf(p) === 'petitioner').map(p => p.name), res = (c.parties || []).filter(p => sideOf(p) === 'respondent').map(p => p.name);
    const out = [`${pet.length && res.length ? pet.join(', ') + ' v. ' + res.join(', ') : c.title}${c.no ? ' (' + c.no + ')' : ''} is before ${c.court || 'the court'}${c.stage ? ', at the ' + c.stage.toLowerCase() + ' stage' : ''}.`];
    os.forEach(o => { const pts = (o.points || o.paras || []).map(p => String(p).trim().replace(/\.$/, '')).filter(Boolean).slice(0, 3); if (pts.length) out.push(`On ${L.dmy(o.date)} the court recorded: ${pts.join('; ')} [Order ${L.dmy(o.date)}].`); });
    const last = os[os.length - 1]; if (last.nextDate) out.push(`The last order gives ${L.dmy(last.nextDate)} as the next date${last.confirmed ? '' : ', not yet confirmed'} [Order ${L.dmy(last.date)}].`);
    return out.join(' ');
  }
  function ListEdit({ label, items, onChange, ph, id }) {
    const focusRow = i => setTimeout(() => { const els = document.querySelectorAll('[data-list="' + id + '"]'); els[i] && els[i].focus(); }, 0);
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } }, h('div', { style: { fontSize: 13, color: K.txt, fontWeight: 600 } }, label),
      items.map((x, i) => h('div', { key: i, style: { display: 'flex', gap: 6, minWidth: 0 } }, h('input', { value: x, placeholder: ph, 'aria-label': label + ' ' + (i + 1), 'data-list': id, style: Object.assign({}, X.input, { minWidth: 0 }),
        onChange: e => onChange(items.map((y, j) => j === i ? e.target.value : y)),
        onPaste: e => { const t = (e.clipboardData && e.clipboardData.getData('text')) || ''; if (!/\n/.test(t)) return; e.preventDefault(); const rows = t.split(/\r?\n/).map(s => s.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean); onChange([...items.slice(0, i), ...(x.trim() ? [x] : []), ...rows, ...items.slice(i + 1)]); },
        onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); onChange([...items.slice(0, i + 1), '', ...items.slice(i + 1)]); focusRow(i + 1); } } }),
        h(IconBtn, { label: 'Remove ' + label.toLowerCase() + ' ' + (i + 1), onClick: () => onChange(items.filter((_, j) => j !== i)) }, '×'))),
      h('div', null, h(Btn, { small: true, onClick: () => { onChange([...items, '']); focusRow(items.length); } }, '+ Add')), !items.length && h('div', { style: { fontSize: 12.5, color: K.mut } }, 'None yet. Paste several lines to add them at once.'));
  }
  function CaseDetailsForm({ app, id, focus, auto }) {
    const c = app.db.cases.find(x => x.id === id) || {}, ps = c.parties || [];
    const [v, setV] = useState(() => { const o = { pet: ps.filter(p => sideOf(p) === 'petitioner').map(partyText), res: ps.filter(p => sideOf(p) === 'respondent').map(partyText), stage: c.stage || LSP.stages(app.db.firm)[0], issues: (c.issues || []).slice(), ours: ourArgs(c).slice(), opp: (c.oppArgs || []).slice(), missing: (c.missing || []).slice(), summary: auto ? draftSummary(app.db, id) : (c.summary || '') };
      if (focus && Array.isArray(o[focus]) && !o[focus].length) o[focus].push(''); return o; });
    const [drafted, setDrafted] = useState(auto ? v.summary : '');
    React.useEffect(() => { const el = focus && document.querySelector(focus === 'summary' ? '#ls-cd-summary' : '[data-list="' + focus + '"], #ls-cd-' + focus); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } }, []);
    const set = k => val => setV(Object.assign({}, v, { [k]: val })), n = app.db.orders.filter(o => o.caseId === id).length;
    const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,250px),1fr))', gap: 18 };
    const save = () => { const clean = a => a.map(s => s.trim()).filter(Boolean), party = (s, side) => { const i = s.indexOf(' — '); return { side, role: side === 'petitioner' ? 'Petitioner / appellant' : 'Respondent', name: (i < 0 ? s : s.slice(0, i)).trim(), note: i < 0 ? '' : s.slice(i + 3).trim() }; };
      app.mut(db => { const x = db.cases.find(y => y.id === id); if (!x) return; const before = JSON.stringify([x.parties, x.stage, x.issues, ourArgs(x), x.oppArgs || [], x.missing, x.summary]);
        const nv = { parties: [...clean(v.pet).map(s => party(s, 'petitioner')), ...clean(v.res).map(s => party(s, 'respondent'))], issues: clean(v.issues), ourArgs: clean(v.ours), oppArgs: clean(v.opp), missing: clean(v.missing), summary: v.summary.trim() };
        const names = [['parties', JSON.stringify(x.parties || []) !== JSON.stringify(nv.parties)], ['stage', x.stage !== v.stage], ['issues', JSON.stringify(x.issues || []) !== JSON.stringify(nv.issues)], ['our arguments', JSON.stringify(ourArgs(x)) !== JSON.stringify(nv.ourArgs)], ['opponent\'s arguments', JSON.stringify(x.oppArgs || []) !== JSON.stringify(nv.oppArgs)], ['missing documents', JSON.stringify(x.missing || []) !== JSON.stringify(nv.missing)], ['summary', (x.summary || '') !== nv.summary]].filter(y => y[1]).map(y => y[0]);
        if (nv.summary !== (x.summary || '')) x.summaryMeta = !nv.summary ? '' : (drafted && nv.summary === drafted.trim() ? `Automatic draft from ${plural(n, 'order')} · review before relying on it` : `Written by ${db.user.name} · ${L.dayMon(L.today())}`);
        if (x.purpose === x.stage) x.purpose = v.stage; Object.assign(x, nv, { stage: v.stage, args: nv.ourArgs.join('\n') });
        if (JSON.stringify([x.parties, x.stage, x.issues, x.ourArgs, x.oppArgs, x.missing, x.summary]) !== before) logIt(db, `Case details updated by ${db.user.name}: ${names.join(', ')}`, id); }, 'Case details saved'); app.modal(null); };
    const stages = LSP.stages(app.db.firm, c.stage);
    return h(Modal, { title: 'Case details', sub: c.title + (c.no ? ' · ' + c.no : ''), onClose: () => app.modal(null), width: 760 },
      h('div', { style: grid }, h(ListEdit, { label: PET, id: 'pet', items: v.pet, onChange: set('pet'), ph: 'Name — note (optional)' }), h(ListEdit, { label: RES, id: 'res', items: v.res, onChange: set('res'), ph: 'Name — note (optional)' })),
      h(Field, { label: 'Stage' }, h('select', { id: 'ls-cd-stage', 'aria-label': 'Stage', value: v.stage, onChange: e => set('stage')(e.target.value), style: Object.assign({}, X.input, { maxWidth: 320 }) }, stages.map(s => h('option', { key: s, value: s }, s)))),
      h('div', { style: grid }, h(ListEdit, { label: 'Issues', id: 'issues', items: v.issues, onChange: set('issues'), ph: 'Whether …' }), h(ListEdit, { label: 'Missing documents', id: 'missing', items: v.missing, onChange: set('missing'), ph: 'Document referred to but not on file' }),
        h(ListEdit, { label: 'Our arguments', id: 'ours', items: v.ours, onChange: set('ours'), ph: 'Point we will press' }), h(ListEdit, { label: 'Opponent\'s arguments', id: 'opp', items: v.opp, onChange: set('opp'), ph: 'Point the other side makes' })),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }, h('label', { htmlFor: 'ls-cd-summary', style: { fontSize: 13, color: K.txt, fontWeight: 600 } }, 'Summary'),
          h(Btn, { small: true, disabled: !n, title: n ? '' : 'No orders in this case yet', onClick: () => { const s = draftSummary(app.db, id); setV(Object.assign({}, v, { summary: s })); setDrafted(s); } }, 'Draft from orders')),
        drafted && v.summary === drafted && h('div', { role: 'note', style: { fontSize: 12.5, color: K.txt, background: K.soft2, borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 } }, `Automatic draft, assembled by rules from the key points of ${plural(n, 'order')}. Review and edit it before relying on it.`),
        h('textarea', { id: 'ls-cd-summary', value: v.summary, rows: 6, placeholder: 'What the case is about, where it stands, and what is next.', onChange: e => set('summary')(e.target.value), style: Object.assign({}, X.input, { height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.55 }) })),
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' } }, h(Btn, { onClick: () => app.modal(null) }, 'Cancel'), h(Btn, { primary: true, onClick: save }, 'Save case details')));
  }
  /* focus: 'pet' | 'res' | 'stage' | 'issues' | 'ours' | 'opp' | 'missing' | 'summary'. auto: start with the summary drafted from orders. */
  function caseDetails(app, id, focus, auto) { if (!app.db.cases.some(x => x.id === id) || !allowed(app, 'case.edit')) return; app.modal(() => h(CaseDetailsForm, { app, id, focus, auto })); }
  const NEED = { parties: ['pet', 'Add parties in Case details'], issues: ['issues', 'Add issues in Case details'], ourArgs: ['ours', 'Add arguments in Case details'], oppArgs: ['opp', 'Add opponent\'s arguments'], missing: ['missing', 'Add missing documents'], summary: ['summary', 'Write summary in Case details'], details: ['pet', 'Open Case details'] };
  /* The read-only "Case details" section on the case page. */
  function detailsView(app, c) {
    const d = app.db, ps = c.parties || [], none = (k, what) => h('div', { style: { fontSize: 13.5, color: K.mut } }, `No ${what} recorded yet. `, h('button', { type: 'button', onClick: () => caseDetails(app, c.id, k), style: { border: 0, background: 'none', padding: 0, color: K.ink, textDecoration: 'underline', textUnderlineOffset: 2, fontSize: 13.5 } }, 'Add'));
    const block = (title, kids) => h('div', { style: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 } }, h('h3', { style: { fontSize: 13, color: K.mut, margin: 0, fontWeight: 600 } }, title), kids);
    const ol = (a, k, what) => a.length ? h('ol', { style: { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: K.txt, lineHeight: 1.5, overflowWrap: 'anywhere' } }, a.map((s, i) => h('li', { key: i }, s))) : none(k, what);
    const side = (s, k) => { const a = ps.filter(p => sideOf(p) === s); return a.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, a.map((p, i) => h('div', { key: i, style: { overflowWrap: 'anywhere' } }, h('div', { style: { fontWeight: 500, fontSize: 14 } }, p.name), p.note && h('div', { style: { fontSize: 13, color: K.mut } }, p.note)))) : none(k, 'parties'); };
    return h('div', { id: 'ls-case-details', style: { display: 'flex', flexDirection: 'column', gap: 18 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' } }, h('div', null, h('h2', { style: X.h2 }, 'Case details'), h('div', { style: { fontSize: 13, color: K.mut, marginTop: 4 } }, 'Client: ' + clientOf(d, c.clientId).name + ' · Stage: ' + (c.stage || '—'))), h(Btn, { small: true, onClick: () => caseDetails(app, c.id) }, 'Edit case details')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 22 } },
        block(PET, side('petitioner', 'pet')), block(RES, side('respondent', 'res')), block('Issues', ol(c.issues || [], 'issues', 'issues')), block('Missing documents', ol(c.missing || [], 'missing', 'missing documents')),
        block('Our arguments', ol(ourArgs(c), 'ours', 'arguments')), block('Opponent\'s arguments', ol(c.oppArgs || [], 'opp', 'arguments for the other side'))));
  }
  function help(app) {
    const rows = [['Ctrl / ⌘ + K', 'Search cases, clients and documents'], ['N', 'New case'], ['G then D', 'Dashboard'], ['G then C', 'Cases'], ['G then H', 'Hearings calendar'], ['Esc', 'Close a dialog or panel']];
    app.modal(() => h(Modal, { title: 'Help and shortcuts', onClose: () => app.modal(null) },
      h('div', null, rows.map(([k, v]) => h(Line, { key: k }, h('span', { style: { minWidth: 120, fontVariantNumeric: 'tabular-nums', fontSize: 12.5, border: '1px solid ' + K.line, borderRadius: 6, padding: '2px 8px', textAlign: 'center' } }, k), h('span', null, v)))),
      h('div', { style: { fontSize: 13, color: K.mut, lineHeight: 1.6 } }, window.LSB && LSB.on ? 'Your data is saved to your firm\'s account and is available to your team on any device. Case Brain answers come from search and rules over your own case file. Export a backup from Settings.' : 'No server is connected, so your data is saved on this device only. Export a backup from Settings.'),
      window.LSB && LSB.on && h(SupportForm, { app }),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h(Btn, { primary: true, onClick: () => app.modal(null) }, 'Done'))));
  }
  /* Help → Contact support: goes to the Legal Staff team (admin console → Support); the reply comes by email. */
  function SupportForm({ app }) {
    const d = app.db, [v, setV] = useState({ topic: 'Question', message: '' }), [st, setSt] = useState('');
    if (st === 'sent') return h('div', { style: { padding: '12px 14px', borderRadius: 10, background: '#E7F6EC', color: '#137333', fontSize: 13.5 } }, 'Message sent. We will reply to ' + (d.user.email || 'your email') + ', usually within a working day.');
    const send = () => { if (!v.message.trim()) return setSt('Write your message first.'); setSt('sending');
      LSB.contact({ name: d.user.name || '', email: d.user.email || '', phone: d.user.phone || '', firm: d.firm.name || '', topic: v.topic, message: v.message.trim().slice(0, 4000), source: 'app' })
        .then(() => setSt('sent')).catch(e => setSt(e.message)); };
    return h('div', { style: { borderTop: '1px solid ' + K.line, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', { style: { fontSize: 14, fontWeight: 600 } }, 'Contact support'),
      h(Select, { value: v.topic, onChange: x => setV(Object.assign({}, v, { topic: x })), options: ['Question', 'Problem or bug', 'Billing and payments', 'Feature request'].map(x => [x, x]), style: { width: '100%' } }),
      h('textarea', { value: v.message, rows: 4, onChange: e => setV(Object.assign({}, v, { message: e.target.value })), placeholder: 'How can we help?', style: { width: '100%', boxSizing: 'border-box', border: '1px solid ' + K.line, borderRadius: 8, padding: 10, font: 'inherit', fontSize: 14, resize: 'vertical' } }),
      st && st !== 'sending' && h('div', { style: { fontSize: 12.5, color: K.red } }, st),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 } }, h('span', { style: { fontSize: 12.5, color: K.mut } }, 'We reply by email to ' + (d.user.email || 'you') + '.'), h(Btn, { onClick: send, disabled: st === 'sending' }, st === 'sending' ? 'Sending…' : 'Send message')));
  }
  function confirmBox(app, title, text, label, fn) { app.modal(() => h(Modal, { title, onClose: () => app.modal(null), width: 440 }, h('div', { style: { fontSize: 14, color: K.txt, lineHeight: 1.6 } }, text), h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, h(Btn, { onClick: () => app.modal(null) }, 'Cancel'), h(Btn, { primary: true, onClick: () => { app.modal(null); fn(); } }, label)))); }

  /* ---------- sign-in ---------- */
  function GoogleBtn({ app, onError }) {
    const ref = React.useRef(null), id = ((window.LS_CONFIG || {}).googleClientId || '').trim();
    React.useEffect(() => {
      if (!id) return; let dead = false;
      const init = async () => { if (dead || !ref.current || !window.google || !google.accounts) return;
        const raw = L.uid('n') + L.uid('n'); let hashed; try { hashed = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))].map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) {}
        if (dead || !ref.current) return;
        google.accounts.id.initialize({ client_id: id, nonce: hashed, callback: r => { if (window.LSB && LSB.on) return app.googleSignIn(r.credential, hashed ? raw : undefined).catch(e => onError(e.message || 'Could not sign in.')); let p = null; try { const b = r.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); p = JSON.parse(decodeURIComponent(atob(b).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))); } catch (e) {}
          if (p && p.email && p.email_verified !== false) app.signIn(p.email, { name: p.name || '', picture: p.picture || '', provider: 'google' }); else onError('Google did not return a verified email address.'); } });
        google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'center', width: Math.max(200, Math.min(400, ref.current.offsetWidth || 400)) }); };
      if (window.google && google.accounts) init();
      else { const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = init; sc.onerror = () => !dead && onError('Could not reach Google. Check your connection and try again.'); document.head.appendChild(sc); }
      return () => { dead = true; };
    }, []);
    if (id) return h('div', { ref, style: { minHeight: 44, display: 'flex', justifyContent: 'center' } });
    return h('button', { type: 'button', onClick: () => onError('Google sign-in is not switched on yet. Add your Google OAuth Client ID to config.js, then reload.'), style: { height: 48, border: '1px solid ' + K.line, borderRadius: 8, background: '#fff', color: K.ink, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 } },
      h('svg', { width: 18, height: 18, viewBox: '0 0 48 48', 'aria-hidden': true }, h('path', { fill: '#EA4335', d: 'M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z' }), h('path', { fill: '#4285F4', d: 'M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.500-4.800 7.200l7.700 6c4.500-4.200 6.900-10.300 6.900-17.700z'.replace(/(\d)00\b/g, '$1') }), h('path', { fill: '#FBBC05', d: 'M10.500 28.600A14.500 14.500 0 0 1 9.700 24c0-1.600.300-3.100.800-4.600l-7.900-6.200A24 24 0 0 0 0 24c0 3.900.900 7.500 2.600 10.800l7.900-6.200z'.replace(/(\d)00\b/g, '$1') }), h('path', { fill: '#34A853', d: 'M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.700-6c-2.100 1.400-4.900 2.300-8.200 2.300-6.300 0-11.600-4.200-13.500-9.900l-7.900 6.200C6.500 42.600 14.600 48 24 48z'.replace(/(\d)00\b/g, '$1') })),
      'Continue with Google');
  }
  /* Email sign-in with a one-time code. Shown only when the server is connected (Supabase sends the email). */
  function EmailOtp({ app, onError }) {
    const [step, setStep] = useState('email'), [email, setEmail] = useState(''), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [wait, setWait] = useState(0);
    React.useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
    const input = { height: 48, border: '1px solid ' + K.line, borderRadius: 8, padding: '0 14px', fontSize: 15, color: K.ink, background: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
    const btn = dis => ({ height: 48, border: 0, borderRadius: 8, background: K.ink, color: '#fff', fontSize: 15, fontWeight: 600, cursor: dis ? 'default' : 'pointer', opacity: dis ? 0.6 : 1, fontFamily: 'inherit' });
    const link = { background: 'none', border: 0, padding: 0, color: K.ink, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' };
    const msg = e => { const m = (e && e.message) || ''; return /rate|too many|seconds/i.test(m) ? 'Too many attempts. Please wait a minute and try again.' : /expired|invalid/i.test(m) ? 'That code is wrong or has expired. Check the latest email or send a new code.' : (m || 'Something went wrong. Please try again.'); };
    const send = async e => { e && e.preventDefault(); const v = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return onError('Enter a valid email address.');
      onError(''); setBusy(true); try { await LSB.sendOtp(v); setEmail(v); setCode(''); setStep('code'); setWait(60); } catch (x) { onError(msg(x)); } setBusy(false); };
    const verify = async e => { e.preventDefault(); const c = code.replace(/\D/g, ''); if (c.length < 6) return onError('Enter the code from the email.');
      onError(''); setBusy(true); try { await app.emailSignIn(email, c); } catch (x) { onError(msg(x)); setBusy(false); } };
    if (step === 'email') return h('form', { onSubmit: send, noValidate: true, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('label', { htmlFor: 'ls-otp-email', style: { fontSize: 13.5, fontWeight: 600, color: K.ink } }, 'Work email'),
      h('input', { id: 'ls-otp-email', type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'you@chambers.in', value: email, onChange: e => setEmail(e.target.value), style: input }),
      h('button', { type: 'submit', disabled: busy, style: btn(busy) }, busy ? 'Sending code…' : 'Email me a sign-in code'));
    return h('form', { onSubmit: verify, noValidate: true, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', { style: { fontSize: 14, color: K.txt, lineHeight: 1.55 } }, 'We sent a code to ', h('b', null, email), '. It expires in a few minutes. Check spam if you don\'t see it.'),
      h('label', { htmlFor: 'ls-otp-code', style: { fontSize: 13.5, fontWeight: 600, color: K.ink } }, 'Sign-in code'),
      h('input', { id: 'ls-otp-code', autoFocus: true, inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 10, placeholder: '123456', value: code, onChange: e => setCode(e.target.value.replace(/[^\d]/g, '')), style: Object.assign({}, input, { letterSpacing: 6, fontSize: 20, fontVariantNumeric: 'tabular-nums' }) }),
      h('button', { type: 'submit', disabled: busy, style: btn(busy) }, busy ? 'Signing in…' : 'Verify and sign in'),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13, color: K.mut } },
        h('button', { type: 'button', style: link, onClick: () => { onError(''); setStep('email'); } }, 'Use a different email'),
        wait ? h('span', null, 'Resend code in ' + wait + 's') : h('button', { type: 'button', style: link, disabled: busy, onClick: send }, 'Resend code')));
  }
  function LoginForm({ app }) {
    const [err, setErr] = useState('');
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 440 } },
      h(GoogleBtn, { app, onError: setErr }),
      window.LSB && LSB.on && h('div', { 'aria-hidden': true, style: { display: 'flex', alignItems: 'center', gap: 12, color: K.mut, fontSize: 12.5 } }, h('span', { style: { flex: 1, height: 1, background: K.line } }), 'or', h('span', { style: { flex: 1, height: 1, background: K.line } })),
      window.LSB && LSB.on && h(EmailOtp, { app, onError: setErr }),
      err && h('div', { role: 'alert', style: { fontSize: 13.5, color: K.red, background: K.redBg, borderRadius: 8, padding: '10px 12px', lineHeight: 1.5 } }, err),
      h('div', { style: { fontSize: 13, color: K.mut, lineHeight: 1.55 } }, 'Use your work Google account or work email. New to Legal Staff? ', h('a', { href: 'index.html#pricing' }, 'See plans')),
      h('div', { style: { fontSize: 12.5, color: K.mut, lineHeight: 1.55 } }, 'By continuing you agree to the ', h('a', { href: '/terms', target: '_blank', rel: 'noopener' }, 'Terms of Service'), ' and ', h('a', { href: '/privacy', target: '_blank', rel: 'noopener' }, 'Privacy Policy'), '.'));
  }

  /* ---------- module screens ---------- */
  function TaskRow({ app, t, showCase }) {
    const d = app.db, od = overdue(t);
    return h(Line, null, h('button', { onClick: () => app.mut(db => { const x = db.tasks.find(y => y.id === t.id); x.done = !x.done; }, t.done ? 'Task reopened' : 'Task completed'), 'aria-label': t.done ? 'Reopen task' : 'Complete task', style: { width: 18, height: 18, border: '1.5px solid ' + (t.done ? K.ink : '#9E9E9E'), borderRadius: 9, flexShrink: 0, background: t.done ? K.ink : 'transparent', color: '#fff', fontSize: 11, lineHeight: 1, padding: 0 } }, t.done ? '✓' : ''),
      h('div', { style: { flex: 1, minWidth: 0, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? K.mut : K.ink } }, t.t, h('div', { style: { fontSize: 12, color: od ? K.red : K.mut } }, [showCase && t.caseId && caseOf(d, t.caseId).title, t.who, (od ? 'Overdue · ' : 'Due ') + L.dayMon(t.due)].filter(Boolean).join(' · '))),
      t.caseId && showCase && h(Btn, { small: true, onClick: () => app.go('case', t.caseId) }, 'Open case'), h(IconBtn, { label: 'Edit task', onClick: () => addTask(app, '', t.id) }, '✎'), h(IconBtn, { label: 'Delete task', danger: true, onClick: () => delTask(app, t.id) }, '×'));
  }
  function Workspace({ app }) {
    const d = app.db, me = d.user.name, [all, setAll] = useState(false);
    const mine = d.tasks.filter(t => t.who === me && (all || !t.done)).sort((a, b) => a.due.localeCompare(b.due));
    const hs = d.hearings.filter(x => x.assignee === me && x.date >= L.today() && L.diffDays(x.date, L.today()) <= 7).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const drafts = Object.keys(d.drafts || {});
    return h(Page, { art: 'tasks', kicker: 'Overview', title: 'My Workspace', sub: `${mine.filter(t => !t.done).length} open tasks · ${hs.length} hearings in the next 7 days`, actions: [h(Btn, { key: 1, primary: true, onClick: () => addTask(app) }, '+ New task')] },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: 20 } },
        h(Card, { title: 'My tasks', right: h(Btn, { small: true, onClick: () => setAll(!all) }, all ? 'Hide completed' : 'Show completed') }, mine.map(t => h(TaskRow, { key: t.id, app, t, showCase: true })), !mine.length && h(Empty, { title: 'No open tasks', text: 'Tasks assigned to you appear here.' })),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20 } },
          h(Card, { title: 'My hearings · next 7 days', right: h(Btn, { small: true, onClick: () => app.go('calendar') }, 'Calendar') }, hs.map(x => h(Line, { key: x.id }, h('div', { style: { width: 86, fontSize: 13, color: K.mut, fontVariantNumeric: 'tabular-nums' } }, L.dayMon(x.date), h('div', null, L.t12ap(x.time))), h('div', { style: { flex: 1, minWidth: 0 } }, caseOf(d, x.caseId).title, h('div', { style: { fontSize: 12, color: K.mut } }, [x.court, x.item, x.purpose].filter(Boolean).join(' · ')), x.outcome && h('div', { style: { marginTop: 4 } }, outcomeChip(x))), h(Btn, { small: true, onClick: () => app.go('case', x.caseId) }, 'Open'))), !hs.length && h(Empty, { title: 'No hearings this week' })),
          h(Card, { title: 'Private notes' }, h('textarea', { defaultValue: d.notes, onBlur: e => { const v = e.target.value; if (v !== app.db.notes) app.mut(db => { db.notes = v; }, 'Notes saved'); }, placeholder: 'Jot down anything. Saved on this device when you click away.', rows: 6, style: Object.assign({}, X.input, { height: 'auto', padding: '10px 12px', lineHeight: 1.55, resize: 'vertical' }) })),
          h(Card, { title: 'My drafts', right: h(Btn, { small: true, onClick: () => app.go('drafting') }, 'Drafting Studio') }, drafts.map(k => h(Line, { key: k }, h('div', { style: { flex: 1 } }, app.tplNames[+k] || 'Draft', h('div', { style: { fontSize: 12, color: K.mut } }, d.drafts[k].length + ' saved version' + (d.drafts[k].length === 1 ? '' : 's'))), h(Btn, { small: true, onClick: () => app.openDraft(+k) }, 'Open'), h(IconBtn, { label: 'Delete draft', danger: true, onClick: () => delDraft(app, +k) }, '×'))), !drafts.length && h('div', { style: { fontSize: 14, color: K.mut } }, 'Versions you save in the Drafting Studio are listed here.')))));
  }
  function Courts({ app }) {
    const d = app.db, by = {}, T = L.today(), row = k => by[k] = by[k] || { court: k, id: k, n: 0, up: 0, next: '', held: 0, adj: 0, nr: 0, wait: 0 }, tally = {};
    d.cases.filter(c => c.status === 'active' || c.status === 'pending').forEach(c => { row(c.court).n++; });
    /* Adjournments and the rest come from outcomes recorded on hearings (Record outcome). */
    d.hearings.forEach(x => { const k = x.court || caseOf(d, x.caseId).court, b = by[k] || (x.outcome && k ? row(k) : null); if (x.outcome) tally[OUTCOMES.includes(x.outcome) ? x.outcome : 'Other'] = (tally[OUTCOMES.includes(x.outcome) ? x.outcome : 'Other'] || 0) + 1; if (!b) return;
      if (x.outcome) { b.held++; if (isAdj(x.outcome)) b.adj++; else if (x.outcome === 'Not reached') b.nr++; }
      else if (x.date < T) b.wait++;
      else { if (L.diffDays(x.date, T) <= 14) b.up++; if (!b.next || x.date < b.next) b.next = x.date; } });
    const rows = Object.values(by).sort((a, b) => b.n - a.n || b.held - a.held), nw = L.nextWorking(L.addDays(T, 1)), rec = Object.values(tally).reduce((a, n) => a + n, 0), adjAll = rows.reduce((a, r) => a + r.adj, 0), waitAll = needsOutcome(d).length;
    const list = d.hearings.filter(x => x.date === nw).sort((a, b) => a.time.localeCompare(b.time)), pct = (n, of) => of ? ` (${Math.round(n / of * 100)}%)` : '';
    return h(Page, { art: 'court', kicker: 'Practice', title: 'Court Intelligence', sub: `${rows.length} court${rows.length === 1 ? '' : 's'} · figures are computed from your own cases, hearings and recorded outcomes` },
      h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } }, h(Stat, { label: 'Outcomes recorded', value: rec, note: waitAll ? plural(waitAll, 'past hearing') + ' without an outcome' : 'Every past hearing has an outcome', red: waitAll > 0 }), h(Stat, { label: 'Adjournments', value: adjAll, note: rec ? Math.round(adjAll / rec * 100) + '% of recorded outcomes' : 'Record outcomes to see the rate' }), h(Stat, { label: 'Not reached', value: tally['Not reached'] || 0, note: rec ? Math.round((tally['Not reached'] || 0) / rec * 100) + '% of recorded outcomes' : '—' })),
      h(Table, { min: 900, cols: [{ label: 'Court', w: 'minmax(200px,2fr)', get: r => r.court }, { label: 'Open matters', get: r => r.n }, { label: 'Hearings · 14 days', get: r => r.up }, { label: 'Next listing', get: r => r.next ? L.fmt(r.next) : '—' }, { label: 'Outcomes recorded', get: r => r.held }, { label: 'Adjourned', get: r => r.adj + pct(r.adj, r.held) }, { label: 'Not reached', get: r => r.nr }, { label: 'Awaiting outcome', get: r => r.wait ? h(Chip, { tone: 'red' }, r.wait) : 0 }], rows, empty: { title: 'No courts yet', text: 'Courts appear once you add cases.' } }),
      h(Card, { title: 'Recorded outcomes' }, h(Bars, { rows: OUTCOMES.filter(o => tally[o]).map(o => [o, tally[o]]) }), h('div', { style: { fontSize: 12.5, color: K.mut, marginTop: 12 } }, 'Record the outcome of each hearing from the case, the calendar or the dashboard. Hearings without one are not counted.')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: 20 } },
        h(Card, { title: 'Your list for ' + L.fmt(nw, { weekday: 'long', day: 'numeric', month: 'short' }) }, list.map(x => h(Line, { key: x.id }, h('div', { style: { width: 70, fontVariantNumeric: 'tabular-nums', color: K.mut, fontSize: 13 } }, L.t12ap(x.time)), h('div', { style: { flex: 1, minWidth: 0 } }, caseOf(d, x.caseId).title, h('div', { style: { fontSize: 12, color: K.mut } }, [x.court, x.item, x.assignee].filter(Boolean).join(' · '))), h(Btn, { small: true, onClick: () => app.go('case', x.caseId) }, 'Open'))), !list.length && h(Empty, { title: 'Nothing listed', text: 'No hearings are recorded for the next working day.' })),
        h(Card, { title: 'CNR watchlist', right: h(Btn, { small: true, onClick: () => app.modal(() => h(Modal, { title: 'Watch a CNR', onClose: () => app.modal(null) }, h(Form, { submit: 'Add to watchlist', onCancel: () => app.modal(null), fields: [{ k: 'cnr', label: 'CNR number', req: true, ph: '4 letters and 12 digits', check: v => !/^[A-Za-z]{4}\d{12}$/.test(v.replace(/[\s-]/g, '')) ? 'A CNR has 4 letters followed by 12 digits' : (app.db.watch.some(w => w.cnr === v.replace(/[\s-]/g, '').toUpperCase()) ? 'Already on the watchlist' : '') }, { k: 'label', label: 'Label', ph: 'Connected matter, opposite party’s suit…' }], onSubmit: v => { app.mut(db => { db.watch.push({ id: L.uid('w'), cnr: v.cnr.replace(/[\s-]/g, '').toUpperCase(), label: v.label.trim(), added: L.today() }); }, 'CNR added to watchlist'); app.modal(null); } }))) }, '+ Watch a CNR') },
          d.cases.filter(c => c.cnr).map(c => h(Line, { key: c.id }, h('div', { style: { flex: 1, minWidth: 0 } }, h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, c.cnr), h('div', { style: { fontSize: 12, color: K.mut } }, c.title + ' · your case')), h(Btn, { small: true, onClick: () => app.go('case', c.id) }, 'Open'))),
          d.watch.map(w => h(Line, { key: w.id }, h('div', { style: { flex: 1, minWidth: 0 } }, h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, w.cnr), h('div', { style: { fontSize: 12, color: K.mut } }, (w.label || 'No label') + ' · added ' + L.dayMon(w.added) + (w.checked ? ` · ${w.status}${w.nextDate ? ', next ' + L.fmt(w.nextDate) : ''} (checked ${L.dayMon(w.checked)})` : ''))), window.LSB && LSB.on && h(Btn, { small: true, onClick: () => { app.toast('Checking…'); LSB.court(w.cnr).then(r => app.mut(db => { const x = db.watch.find(y => y.id === w.id); if (x) { x.status = r.status || 'No status returned'; x.nextDate = r.nextDate || ''; x.checked = L.today(); if (!x.label && r.title) x.label = r.title; } }, r.nextDate ? 'Next date: ' + L.fmt(r.nextDate) : (r.status || 'Checked'))).catch(e => app.toast(e.message)); } }, 'Check status'), h(Btn, { small: true, danger: true, onClick: () => app.mut(db => { db.watch = db.watch.filter(x => x.id !== w.id); }, 'Removed from watchlist') }, 'Remove'))),
          h('div', { style: { fontSize: 12.5, color: K.mut, marginTop: 12, lineHeight: 1.55 } }, window.LSB && LSB.on ? 'Check status asks your court-data provider. If none is connected, the check says so.' : 'Status checks need the server and a court-data provider. Watched CNRs are kept as a list.'))));
  }
  function Clients({ app }) {
    const d = app.db, [q, setQ] = useState('');
    const fields = [{ k: 'name', label: 'Client name', req: true }, { k: 'type', label: 'Type', type: 'select', options: ['Individual', 'Company', 'Firm', 'Government body'], half: true }, { k: 'city', label: 'City', half: true }, { k: 'contact', label: 'Contact person', ph: 'Name, designation' }, { k: 'phone', label: 'Phone', type: 'tel', half: true }, { k: 'email', label: 'Email', type: 'email', half: true }];
    const edit = c => app.modal(() => h(Modal, { title: c ? 'Edit client' : 'New client', onClose: () => app.modal(null) }, h(Form, { fields, init: c || { type: 'Individual' }, submit: c ? 'Save changes' : 'Add client', onCancel: () => app.modal(null), onSubmit: v => { if (c && !allowed(app, 'client.edit')) return; app.mut(db => { if (c) { const x = db.clients.find(y => y.id === c.id); if (!x) return; Object.assign(x, v); logIt(db, `Client ${x.name} edited by ${db.user.name}`); } else db.clients.unshift(Object.assign({ id: L.uid('cl'), notes: '', portal: false, share: { dates: true, orders: true, invoices: false } }, v)); }, c ? 'Client updated' : 'Client added'); app.modal(null); } })));
    const del = cl => { if (!allowed(app, 'client.delete')) return; const cs = app.db.cases.filter(x => x.clientId === cl.id), inv = app.db.invoices.filter(i => i.clientId === cl.id);
      if (cs.length) return infoBox(app, 'This client cannot be deleted', `${cl.name} has ${plural(cs.length, 'case')} (${cs.slice(0, 3).map(x => x.title).join(', ')}${cs.length > 3 ? '…' : ''}). Link those cases to another client in Edit case, or delete them, first.`);
      if (inv.length) return infoBox(app, 'This client cannot be deleted', `${cl.name} has ${plural(inv.length, 'invoice')}. Invoices are financial records, so the client they are billed to is kept.`);
      confirmBox(app, 'Delete this client?', `${cl.name} and their contact details and notes will be deleted.`, 'Delete client', () => app.mut(db => { db.clients = db.clients.filter(x => x.id !== cl.id); logIt(db, `Client ${cl.name} deleted by ${db.user.name}`); }, 'Client deleted')); };
    const view = c => app.modal(() => { const cl = app.db.clients.find(x => x.id === c.id); if (!cl) return null; const cs = app.db.cases.filter(x => x.clientId === cl.id), due = app.db.invoices.filter(i => i.clientId === cl.id && !i.paid).reduce((a, i) => a + i.amount + gstOf(i.amount), 0);
      return h(Modal, { title: cl.name, sub: [cl.type, cl.city].filter(Boolean).join(' · '), onClose: () => app.modal(null), width: 560 },
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 14 } }, [['Contact', cl.contact], ['Phone', cl.phone], ['Email', cl.email], ['Outstanding', L.inr(due)]].map(([k, v]) => h('div', { key: k }, h('div', { style: { fontSize: 12, color: K.mut } }, k), h('div', { style: { overflowWrap: 'anywhere' } }, v || '—')))),
        h('div', null, h('div', { style: X.kicker }, 'Cases'), cs.map(x => h(Line, { key: x.id }, h('div', { style: { flex: 1, minWidth: 0 } }, x.title, h('div', { style: { fontSize: 12, color: K.mut } }, x.no + ' · ' + x.court)), h(Btn, { small: true, onClick: () => { app.modal(null); app.go('case', x.id); } }, 'Open'))), !cs.length && h('div', { style: { fontSize: 14, color: K.mut, paddingTop: 8 } }, 'No cases linked.')),
        h('div', null, h('div', { style: Object.assign({ marginBottom: 6 }, X.kicker) }, 'Notes'), h('textarea', { defaultValue: cl.notes, rows: 3, placeholder: 'Saved when you click away', onBlur: e => { const v = e.target.value; if (v !== cl.notes) app.mut(db => { db.clients.find(x => x.id === cl.id).notes = v; }, 'Notes saved'); }, style: Object.assign({}, X.input, { height: 'auto', padding: '10px 12px', resize: 'vertical' }) })),
        h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' } }, h(Btn, { danger: true, title: cs.length ? 'Clients with cases cannot be deleted' : '', onClick: () => del(cl) }, 'Delete'), h(Btn, { onClick: () => allowed(app, 'client.edit') && edit(cl) }, 'Edit'), h(Btn, { primary: true, onClick: () => newCase(app, { clientId: cl.id }) }, '+ New case'))); });
    const rows = d.clients.filter(c => !q || (c.name + c.contact + c.city + c.email).toLowerCase().includes(q.toLowerCase()));
    return h(Page, { art: 'clients', kicker: 'Practice', title: 'Clients CRM', sub: `${d.clients.length} clients · click a row for cases, contact details and notes`, actions: [h(Search, { key: 0, value: q, onChange: setQ, placeholder: 'Search clients' }), h(Btn, { key: 1, primary: true, onClick: () => edit(null) }, '+ New client')] },
      h(Table, { onRow: view, cols: [{ label: 'Client', w: 'minmax(220px,2fr)', get: c => h('span', null, c.name, h('span', { style: { display: 'block', fontSize: 12, color: K.mut, fontWeight: 400 } }, c.contact)) }, { label: 'Phone', get: c => c.phone || '—' }, { label: 'City', get: c => c.city || '—' }, { label: 'Cases', w: '80px', get: c => d.cases.filter(x => x.clientId === c.id).length }, { label: 'Outstanding', get: c => L.inr(d.invoices.filter(i => i.clientId === c.id && !i.paid).reduce((a, i) => a + i.amount + gstOf(i.amount), 0)) }, { label: 'Portal', w: '90px', get: c => h(Chip, { tone: c.portal ? '' : 'grey' }, c.portal ? 'Enabled' : 'Off') }], rows, empty: { title: 'No clients match', text: 'Try another search or add a client.' } }));
  }
  function Docs({ app, kind }) {
    const d = app.db, ev = kind === 'evidence', [q, setQ] = useState(''), [cf, setCf] = useState('');
    const rows = d.docs.filter(x => x.kind === kind && (!cf || x.caseId === cf) && (!q || (x.name + x.meta + (x.exhibit || '') + (x.custody || '') + (x.tags || []).join(' ')).toLowerCase().includes(q.toLowerCase())));
    const cols = [{ label: ev ? 'Exhibit' : 'Type', w: '90px', get: x => h('span', { style: { fontSize: 11, fontWeight: 600, border: '1px solid ' + K.line, borderRadius: 6, padding: '3px 6px', background: K.soft } }, ev ? (x.exhibit || '—') : x.ext) }, { label: ev ? 'Item' : 'Document', w: 'minmax(220px,2.2fr)', get: x => h('span', null, x.name, h('span', { style: { display: 'block', fontSize: 12, color: K.mut, fontWeight: 400 } }, (ev ? (x.custody || x.meta) : x.meta) + tagLine(x))) }, { label: 'Case', w: '1.4fr', get: x => x.caseId ? caseOf(d, x.caseId).title : 'Not linked' }, { label: 'Added', get: x => L.dayMon(x.added || d.anchor) }, { label: '', w: '190px', get: x => h('span', { style: { display: 'flex', justifyContent: 'flex-end' } }, docActs(app, x)) }];
    return h(Page, { art: 'documents', kicker: 'Practice', title: ev ? 'Evidence' : 'Documents', sub: `${rows.length} of ${d.docs.filter(x => x.kind === kind).length} ${ev ? 'exhibits and evidence records' : 'documents'} across your cases`, actions: [h(Select, { key: 0, value: cf, onChange: setCf, options: [['', 'All cases'], ...caseOpts(d)], style: { minWidth: 0, width: 'min(260px, 100%)', textOverflow: 'ellipsis' } }), h(Search, { key: 1, value: q, onChange: setQ, placeholder: ev ? 'Search evidence' : 'Search documents', width: 'min(240px, 100%)' }), h(Btn, { key: 2, primary: true, onClick: () => uploadDoc(app, kind, cf) }, ev ? '+ Add evidence' : '+ Upload')] },
      h(Table, { cols, rows, min: 860, empty: { title: ev ? 'No evidence recorded' : 'No documents', text: 'Change the filter or add a file.' } }));
  }
  const LIB = [
    ['Limitation Act, 1963 — s.3', 'Bar of limitation', 'Every suit, appeal or application filed after the prescribed period must be dismissed, even if limitation is not set up as a defence. Read with ss.4 to 24.', 'limitation bar dismissal time barred'],
    ['Limitation Act, 1963 — s.4', 'Expiry when the court is closed', 'Where the prescribed period expires on a day when the court is closed, the suit, appeal or application may be filed on the day the court reopens.', 'holiday court closed reopening last day weekend'],
    ['Limitation Act, 1963 — s.5', 'Condonation of delay', 'An appeal or application (other than one under Order XXI CPC) may be admitted after the prescribed period if the appellant or applicant shows sufficient cause. It does not apply to suits.', 'condonation delay sufficient cause appeal application'],
    ['Limitation Act, 1963 — s.12', 'Exclusion of time in legal proceedings', 'The day from which the period is reckoned is excluded (sub-s.1). For an appeal, revision or review, the day of the judgment and the time requisite for obtaining a copy of the decree, sentence or order are excluded (sub-s.2).', 'certified copy exclusion day of judgment time requisite appeal'],
    ['Limitation Act, 1963 — s.14', 'Proceeding bona fide in a court without jurisdiction', 'Time spent prosecuting another civil proceeding with due diligence and in good faith, in a court that could not entertain it for defect of jurisdiction or a like cause, is excluded.', 'wrong forum jurisdiction exclusion bona fide'],
    ['Limitation Act, 1963 — s.18', 'Acknowledgment in writing', 'A signed written acknowledgment of liability made before the period expires starts a fresh period of limitation from the date of the acknowledgment.', 'acknowledgment liability fresh period debt email admission'],
    ['Commercial Courts Act, 2015 — s.12A', 'Pre-institution mediation', 'A commercial suit that does not contemplate urgent interim relief cannot be instituted unless the plaintiff has exhausted pre-institution mediation. The Supreme Court held the requirement mandatory in Patil Automation v. Rakheja Engineers (2022).', 'mediation pre-institution commercial suit urgent interim relief mandatory'],
    ['Commercial Courts Act, 2015 — s.13(1A)', 'Appeals from Commercial Courts', 'A person aggrieved by a judgment or order of a Commercial Court at the level of District Judge, or of the Commercial Division of a High Court, may appeal to the Commercial Appellate Division within sixty days of the judgment or order.', 'commercial appeal sixty 60 days appellate division'],
    ['CPC — Order VIII r.1', 'Written statement', 'The defendant must file the written statement within 30 days of service of summons; the court may extend this up to 90 days. In commercial suits the outer limit is 120 days, after which the right is forfeited (SCG Contracts v. K.S. Chamankar Infrastructure, 2019).', 'written statement 30 90 120 days forfeit commercial'],
    ['CPC — Order XIII-A (commercial suits)', 'Summary judgment', 'The court may decide a claim without recording oral evidence where the plaintiff or defendant has no real prospect of succeeding or defending, and there is no other compelling reason for the claim to go to trial.', 'summary judgment no real prospect commercial'],
    ['Negotiable Instruments Act, 1881 — s.138', 'Dishonour of cheque', 'An offence arises when a cheque for a legally enforceable debt is returned unpaid, provided it was presented within its validity, a written demand is made within 30 days of information of dishonour, and the drawer fails to pay within 15 days of receiving the notice.', 'cheque bounce dishonour notice 30 days 15 days'],
    ['Negotiable Instruments Act, 1881 — s.142', 'Cognizance of offences', 'A complaint under s.138 must be made in writing by the payee or holder in due course within one month of the cause of action arising. Delay may be condoned on sufficient cause.', 'complaint one month cognizance cheque'],
    ['Sale of Goods Act, 1930 — s.42', 'Acceptance of goods', 'The buyer is deemed to have accepted the goods when he intimates acceptance, does an act inconsistent with the seller’s ownership, or retains the goods beyond a reasonable time without intimating rejection.', 'acceptance rejection reasonable time goods defective buyer'],
    ['Constitution of India — Art. 226', 'Writ jurisdiction of High Courts', 'High Courts may issue directions, orders or writs for enforcement of fundamental rights and for any other purpose. The remedy is discretionary; delay and an alternative efficacious remedy are relevant.', 'writ high court mandamus certiorari alternative remedy'],
    ['Bharatiya Nagarik Suraksha Sanhita, 2023 — s.483', 'Special powers of High Court or Court of Session regarding bail', 'The High Court or Court of Session may direct release on bail of a person accused of an offence and in custody. It corresponds to s.439 of the Code of Criminal Procedure, 1973.', 'bail high court sessions 439 custody'],
    ['Bharatiya Sakshya Adhiniyam, 2023 — s.63', 'Admissibility of electronic records', 'An electronic record is admissible as a document if the conditions of the section are met and it is accompanied by the prescribed certificate. It corresponds to s.65B of the Indian Evidence Act, 1872.', 'electronic record certificate 65B email printout evidence'],
    ['Hindu Marriage Act, 1955 — s.13B', 'Divorce by mutual consent', 'Both spouses may petition together for divorce after living separately for a year or more. The second motion is made between six and eighteen months after the first; the six-month period can be waived in suitable cases (Amardeep Singh v. Harveen Kaur, 2017).', 'mutual consent divorce cooling off six months']
  ].map((r, i) => ({ id: 'L' + i, ref: r[0], title: r[1], text: r[2], tags: r[3] }));
  /* Real AI answer to a general legal question (server function 'ai', mode 'research'). */
  function AiAsk({ app }) {
    const [q, setQ] = useState(''), [busy, setBusy] = useState(false), [ans, setAns] = useState(null);
    const ask = () => { const t = q.trim(); if (!t || busy) return; setBusy(true); setAns(null);
      LSB.ai({ mode: 'research', question: t }).then(r => { setAns({ q: t, text: r.text }); app.db.sub.aiUsed = r.used; }).catch(e => setAns({ q: t, error: e.message })).finally(() => setBusy(false)); };
    return h(Card, { title: 'Ask the AI', right: h('span', { style: { fontSize: 12.5, color: K.mut } }, '1 AI credit per question') },
      h('div', { style: { display: 'flex', gap: 8 } },
        h('textarea', { value: q, rows: 2, onChange: e => setQ(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }, placeholder: 'e.g. What is the limitation for a first appeal from a decree, and can delay be condoned?', style: { flex: 1, border: '1px solid ' + K.line, borderRadius: 8, padding: '10px 12px', fontSize: 14.5, fontFamily: 'inherit', resize: 'vertical', minWidth: 0 } }),
        h(Btn, { primary: true, onClick: ask, disabled: busy }, busy ? 'Thinking…' : 'Ask AI')),
      ans && h('div', { style: { marginTop: 14, borderTop: '1px solid ' + K.line, paddingTop: 14 } },
        h('div', { style: { fontSize: 12.5, color: K.mut, marginBottom: 6 } }, ans.q),
        ans.error ? h('div', { style: { fontSize: 14, color: K.red } }, 'The AI could not answer: ' + ans.error)
          : h('div', null, h('div', { style: { fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-line', color: '#1A1A1A' } }, ans.text),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' } },
              h(Btn, { small: true, onClick: () => { try { navigator.clipboard.writeText(ans.text); app.toast('Copied to clipboard'); } catch (x) { app.toast('Copy is not available in this browser'); } } }, 'Copy'),
              h('span', { style: { fontSize: 12.5, color: K.mut } }, 'AI answer. Check every section and judgment in the bare act or a law database before relying on it.')))));
  }
  function Research({ app }) {
    const d = app.db, [q, setQ] = useState(''), [only, setOnly] = useState(false);
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const scored = LIB.map(e => { const hay = (e.ref + ' ' + e.title + ' ' + e.text + ' ' + e.tags).toLowerCase(); return [words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0), e]; }).filter(x => (!words.length || x[0] > 0) && (!only || d.research.includes(x[1].id))).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    return h(Page, { art: 'research', kicker: 'AI', title: 'AI Legal Research', sub: 'Search the built-in reference notes on provisions used in your matters', max: 980, actions: [h(Btn, { key: 1, onClick: () => setOnly(!only), style: only ? { background: K.soft2, borderColor: K.ink } : null }, only ? 'Showing saved' : `Saved (${d.research.length})`)] },
      window.LSB && LSB.on && LSB.ai && h(AiAsk, { app }),
      h('div', { style: { display: 'flex', gap: 8, background: '#FFFFFF', border: '1px solid ' + K.line, borderRadius: 10, padding: '6px 6px 6px 14px' } }, h('input', { value: q, onChange: e => setQ(e.target.value), placeholder: 'Search the reference notes: condonation of delay, cheque notice, certified copy…', style: { flex: 1, border: 0, outline: 'none', fontSize: 15, background: 'transparent', minWidth: 0 } }), q && h(Btn, { onClick: () => setQ('') }, 'Clear')),
      h('div', { style: { fontSize: 13, color: K.mut } }, `${scored.length} of ${LIB.length} notes${words.length ? ' match' : ''}. These are short reference notes, not a case-law database. Check the bare act and current authorities before relying on them.`),
      scored.map(e => { const saved = d.research.includes(e.id); return h(Card, { key: e.id }, h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' } }, h('div', null, h('div', { style: { fontSize: 12.5, color: K.mut } }, e.ref), h('div', { style: { fontSize: 16, fontWeight: 600, marginTop: 2 } }, e.title)), h('div', { style: X.row }, h(Btn, { small: true, onClick: () => { try { navigator.clipboard.writeText(`${e.ref} — ${e.title}. ${e.text}`); app.toast('Copied to clipboard'); } catch (x) { app.toast('Copy is not available in this browser'); } } }, 'Copy'), h(Btn, { small: true, onClick: () => app.mut(db => { db.research = saved ? db.research.filter(x => x !== e.id) : [...db.research, e.id]; }, saved ? 'Removed from saved' : 'Saved') }, saved ? 'Saved ✓' : 'Save'))), h('p', { style: { fontSize: 14.5, lineHeight: 1.65, color: K.txt, margin: '10px 0 0', maxWidth: 820 } }, e.text)); }),
      !scored.length && h(Card, null, h(Empty, { title: 'No notes match', text: 'Try fewer or different words, for example "limitation" or "bail".' })));
  }
  function runAgent(d, id) {
    const T = L.today(), out = [];
    if (id === 'briefing') { d.team.forEach(u => { const hs = d.hearings.filter(x => x.date === T && x.assignee === u.name).sort((a, b) => a.time.localeCompare(b.time)), ts = d.tasks.filter(t => t.who === u.name && !t.done && t.due <= T); out.push(`${u.title}: ${hs.length} hearing${hs.length === 1 ? '' : 's'} today` + (hs.length ? ' — ' + hs.map(x => `${L.t12ap(x.time)} ${caseOf(d, x.caseId).title} (${x.court})`).join('; ') : '') + (ts.length ? `. ${ts.length} task${ts.length > 1 ? 's' : ''} due or overdue.` : '.')); }); clashes(d).filter(g => g[0].date === T).forEach(g => out.push(`Clash at ${L.t12ap(g[0].time)} for ${g[0].assignee}: ${g.map(x => caseOf(d, x.caseId).title).join(' and ')}.`)); }
    if (id === 'sentinel') { const open = d.deadlines.filter(x => !x.done), wait = d.lims.filter(l => !l.approved && L.limitation(l).due); if (!open.length && !wait.length) out.push('No open deadlines or limitation calculations.'); wait.forEach(l => { const c = L.limitation(l); out.push(`${l.title}: last date ${L.fmt(c.due)}, ${plural(c.daysLeft, 'day')} left — awaiting approval.`); }); open.sort((a, b) => a.due.localeCompare(b.due)).forEach(x => { const n = L.diffDays(x.due, T); out.push(`${x.source === 'limitation' ? 'Limitation · ' : ''}${x.title}: due ${L.fmt(x.due)}, ${n >= 0 ? plural(n, 'day') + ' left' : plural(-n, 'day') + ' ago'}.`); }); const od = d.tasks.filter(overdue); out.push(od.length ? 'Overdue tasks: ' + od.map(t => `${t.t} (${t.who}, ${L.dayMon(t.due)})`).join('; ') + '.' : 'No overdue tasks.'); }
    if (id === 'client') { const o = d.orders.filter(x => x.confirmed).sort((a, b) => b.date.localeCompare(a.date))[0]; if (!o) out.push('No confirmed order to report.'); else { const c = caseOf(d, o.caseId), cl = d.clients.find(x => x.id === c.clientId), nh = nextHearing(d, c.id), dear = cl ? String(cl.contact || cl.name || '').split(',')[0].trim() : ''; out.push(`Draft update for ${cl ? cl.name : 'the client (no client is linked to this case)'}:`, `Dear ${dear || 'Sir/Madam'},`, `Your matter ${c.title} (${c.no}) came up before the court on ${L.fmt(o.date)}. ${o.summary}` + (nh ? ` The next date is ${L.fmt(nh.date)}.` : ''), 'We will write again after the next hearing.', d.user.title + ', ' + d.firm.name); } }
    if (id === 'causelist') { const nw = L.nextWorking(L.addDays(T, 1)), hs = d.hearings.filter(x => x.date === nw).sort((a, b) => (a.court + a.time).localeCompare(b.court + b.time)); out.push(`Matters listed for ${L.fmt(nw, { weekday: 'long', day: 'numeric', month: 'long' })}: ${hs.length}.`); hs.forEach(x => out.push(`${x.court} · ${L.t12ap(x.time)}${x.item ? ' · ' + x.item : ''} — ${caseOf(d, x.caseId).title} (${x.assignee})`)); }
    return out.join('\n');
  }
  function Agents({ app }) {
    const d = app.db;
    return h(Page, { art: 'agents', kicker: 'AI', title: 'AI Agents', sub: `${d.agents.filter(a => a.on).length} of ${d.agents.length} agents enabled`, max: 1100 },
      h('div', { style: { fontSize: 13, color: K.mut, background: K.soft2, borderRadius: 8, padding: '10px 14px', lineHeight: 1.55 } }, 'Agents run in this browser when you open this page and press Run now. They are not scheduled and do not run while the app is closed. ' + (window.LSB && LSB.on ? `Separately, the server sends each member the morning briefing email at their chosen time (yours: ${L.t12ap(briefAt(d.settings))} IST) with hearings, deadlines, limitation dates and overdue tasks; set it in Settings › Notifications.` : 'Scheduled briefing emails need the server to be connected.')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,440px),1fr))', gap: 20 } }, d.agents.map(a => h(Card, { key: a.id },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' } }, h('div', null, h('div', { style: { fontSize: 16, fontWeight: 600 } }, a.name), h('div', { style: { fontSize: 14, color: K.txt, marginTop: 4, lineHeight: 1.5 } }, a.what), h('div', { style: { fontSize: 12.5, color: K.mut, marginTop: 6 } }, 'Runs when you press Run now' + (a.id === 'briefing' && window.LSB && LSB.on ? ' · the email briefing is sent by the server at ' + L.t12ap(briefAt(d.settings)) + ' IST' : ''))), h(Toggle, { on: a.on, label: 'Enable ' + a.name, onChange: v => app.mut(db => { db.agents.find(x => x.id === a.id).on = v; }, a.name + (v ? ' enabled' : ' paused')) })),
        h('div', { style: Object.assign({ marginTop: 14 }, X.row) }, h(Btn, { small: true, primary: true, disabled: !a.on, onClick: () => app.mut(db => { const x = db.agents.find(y => y.id === a.id); x.runs.unshift({ at: L.today() + ' ' + L.nowHM(), out: runAgent(db, a.id) }); x.runs = x.runs.slice(0, 5); }, a.name + ' finished') }, 'Run now'), h('span', { style: { fontSize: 12.5, color: K.mut } }, a.runs.length ? 'Last run ' + L.dayMon(a.runs[0].at.slice(0, 10)) + ', ' + a.runs[0].at.slice(11) : 'Not run yet')),
        a.runs[0] && h('div', { style: { marginTop: 12, background: K.soft, border: '1px solid ' + K.line, borderRadius: 8, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-line', color: K.txt, maxHeight: 240, overflow: 'auto' } }, a.runs[0].out)))));
  }
  function Team({ app }) {
    const d = app.db, roles = ['Managing Partner', 'Partner', 'Associate', 'Junior Advocate', 'Paralegal', 'Office Manager', 'Intern'];
    const invite = () => (window.LSB && LSB.on && !d.isOwner) ? app.toast('Only the firm owner can invite or change members.') : overLimit(app, 'users') ? null : app.modal(() => h(Modal, { title: 'Invite a team member', onClose: () => app.modal(null) }, h(Form, { submit: 'Add to team', onCancel: () => app.modal(null), note: window.LSB && LSB.on ? 'We email them an invitation. They join your firm the first time they sign in with this email address.' : 'No invitation email is sent in this browser-only version. The member is added with the status "Invited".', fields: [{ k: 'name', label: 'Full name', req: true }, { k: 'email', label: 'Work email', type: 'email', req: true, check: v => d.team.some(u => u.email.toLowerCase() === v.toLowerCase()) ? 'This email is already on the team' : '' }, { k: 'role', label: 'Role', type: 'select', options: roles }], onSubmit: v => { app.mut(db => { db.team.push({ id: L.uid('u'), name: v.name.trim(), title: (/(Partner|Associate|Advocate)/.test(v.role) ? 'Adv. ' : '') + v.name.trim(), role: v.role, email: v.email.trim(), status: 'Invited' }); }, 'Team member added'); app.modal(null); } })));
    const edit = u => (window.LSB && LSB.on && !d.isOwner) ? app.toast('Only the firm owner can invite or change members.') : app.modal(() => h(Modal, { title: u.title, sub: u.email, onClose: () => app.modal(null) }, h(Form, { init: { role: u.role, status: u.status }, submit: 'Save', onCancel: () => app.modal(null), fields: [{ k: 'role', label: 'Role', type: 'select', options: roles, half: true }, { k: 'status', label: 'Status', type: 'select', options: ['Active', 'Invited', 'Suspended'], half: true }], onSubmit: v => { app.mut(db => { Object.assign(db.team.find(x => x.id === u.id), v); }, 'Team member updated'); app.modal(null); } }),
      window.LSB && LSB.on && u.status === 'Invited' && u.email && h('div', { style: { borderTop: '1px solid ' + K.line, paddingTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { fontSize: 13, color: K.mut } }, 'Not joined yet. Send the invitation email again.'),
        h(Btn, { small: true, onClick: () => LSB.invite(u.email).then(r => app.toast(r.sent ? 'Invitation sent to ' + r.sent : r.skipped === 'invited recently' ? 'Already invited 3 times today. Try again tomorrow.' : r.skipped === 'already joined' ? 'They have already joined.' : r.error || 'The invitation was not sent.')).catch(e => app.toast(e.message)) }, 'Resend invitation')),
      u.name !== d.user.name && h('div', { style: { borderTop: '1px solid ' + K.line, paddingTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { fontSize: 13, color: K.mut } }, 'Their tasks and hearings stay assigned by name.'), h(Btn, { danger: true, onClick: () => { app.mut(db => { db.team = db.team.filter(x => x.id !== u.id); }, 'Removed from team'); app.modal(null); } }, 'Remove from team'))));
    return h(Page, { art: 'team', kicker: 'Firm', title: 'Team', sub: `${d.team.length} members · click a row to change role or status`, actions: [h(Btn, { key: 1, primary: true, onClick: invite }, '+ Invite member')] },
      h(Table, { onRow: edit, cols: [{ label: 'Member', w: 'minmax(220px,2fr)', get: u => h('span', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 } }, h(Avatar, { app, user: u, size: 30 }), h('span', { style: { minWidth: 0 } }, u.title, h('span', { style: { display: 'block', fontSize: 12, color: K.mut, fontWeight: 400 } }, u.email))) }, { label: 'Role', w: '1.2fr', get: u => u.role }, { label: 'Cases', get: u => d.cases.filter(c => c.team.includes(u.name) && c.status !== 'archived' && c.status !== 'disposed').length }, { label: 'Open tasks', get: u => { const n = openTasks(d).filter(t => t.who === u.name), o = n.filter(overdue).length; return n.length + (o ? ` (${o} overdue)` : ''); } }, { label: 'Hearings · 7 days', get: u => d.hearings.filter(x => x.assignee === u.name && x.date >= L.today() && L.diffDays(x.date, L.today()) <= 7).length }, { label: 'Status', w: '100px', get: u => h(Chip, { tone: u.status === 'Active' ? '' : (u.status === 'Suspended' ? 'red' : 'grey') }, u.status) }], rows: d.team }));
  }
  function invoiceView(app, id) {
    app.modal(() => { const d = app.db, i = d.invoices.find(x => x.id === id); if (!i) return null; const g = gstOf(i.amount), cl = clientOf(d, i.clientId), row = (a, b, bold) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid ' + K.line, fontWeight: bold ? 600 : 400 } }, h('span', null, a), h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, b));
      return h(Modal, { title: 'Invoice ' + i.no, onClose: () => app.modal(null), width: 560 },
        h('div', { className: 'ls-print', style: { border: '1px solid ' + K.line, borderRadius: 10, padding: '22px 24px', fontSize: 14, background: '#fff' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14 } }, h('div', null, h('div', { style: { fontWeight: 600, fontSize: 16 } }, d.firm.name), h('div', { style: { color: K.mut, fontSize: 13 } }, d.firm.address), d.firm.gstin && h('div', { style: { color: K.mut, fontSize: 13 } }, 'GSTIN ' + d.firm.gstin)), h('div', { style: { textAlign: 'right' } }, h('div', { style: { fontWeight: 600 } }, 'Tax invoice'), h('div', { style: { color: K.mut, fontSize: 13 } }, i.no), h('div', { style: { color: K.mut, fontSize: 13 } }, L.fmt(i.date)))),
          h('div', { style: { marginBottom: 12 } }, h('div', { style: { fontSize: 12, color: K.mut } }, 'Billed to'), h('div', { style: { fontWeight: 500 } }, cl.name), h('div', { style: { fontSize: 13, color: K.mut } }, caseOf(d, i.caseId).title)),
          row(i.desc || 'Professional fees', L.inr(i.amount)), row('GST @ 18%', L.inr(g)), row('Total', L.inr(i.amount + g), true), row('Status', i.paid ? 'Paid on ' + L.fmt(i.paidOn) : 'Unpaid')),
        h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' } }, h(Btn, { danger: true, onClick: () => delInvoice(app, id) }, 'Delete'), h(Btn, { onClick: () => editInvoice(app, id) }, 'Edit'), h(Btn, { onClick: () => window.print() }, 'Print / save as PDF'), i.paid ? h(Btn, { onClick: () => app.mut(db => { const x = db.invoices.find(y => y.id === id); x.paid = false; x.paidOn = ''; }, 'Marked unpaid') }, 'Mark unpaid') : h(Btn, { primary: true, onClick: () => app.mut(db => { const x = db.invoices.find(y => y.id === id); x.paid = true; x.paidOn = L.today(); logIt(db, `Invoice ${x.no} marked paid`, x.caseId); }, 'Invoice marked paid') }, 'Mark as paid'))); });
  }
  function editInvoice(app, id) {
    const d = app.db, i = d.invoices.find(x => x.id === id); if (!i || !allowed(app, 'invoice.edit')) return;
    app.modal(() => h(Modal, { title: 'Edit invoice ' + i.no, sub: i.paid ? 'This invoice is marked paid.' : null, onClose: () => invoiceView(app, id) }, h(Form, { init: { caseId: i.caseId, desc: i.desc || '', amount: String(i.amount), date: i.date }, submit: 'Save changes', onCancel: () => invoiceView(app, id), note: 'GST at 18% is added to the amount. The invoice number stays the same.',
      fields: [{ k: 'caseId', label: 'Case', type: 'select', options: caseOpts(d, i.caseId) }, { k: 'desc', label: 'Description', req: true }, { k: 'amount', label: 'Amount before GST (₹)', type: 'number', req: true, half: true, check: v => v && isNaN(+v.replace(/,/g, '')) ? 'Enter a number' : '' }, { k: 'date', label: 'Invoice date', type: 'date', req: true, half: true }],
      onSubmit: v => { app.mut(db => { const x = db.invoices.find(y => y.id === id); if (!x) return; const amt = Math.round(+String(v.amount).replace(/,/g, '') * 100) / 100, was = x.amount; Object.assign(x, { caseId: v.caseId, clientId: caseOf(db, v.caseId).clientId || x.clientId || '', desc: v.desc.trim(), amount: amt, date: v.date }); logIt(db, `Invoice ${x.no} edited by ${db.user.name}` + (was !== amt ? `, amount ${L.inr(was)} → ${L.inr(amt)}` : ''), x.caseId); }, 'Invoice updated'); invoiceView(app, id); } })));
  }
  function delInvoice(app, id) {
    const i = app.db.invoices.find(x => x.id === id); if (!i || !allowed(app, 'invoice.delete')) return;
    confirmBox(app, 'Delete invoice ' + i.no + '?', `${L.inr(i.amount + gstOf(i.amount))} billed to ${clientOf(app.db, i.clientId).name}.` + (i.paid ? ` It is marked paid on ${L.fmt(i.paidOn)}, so collections will drop by ${L.inr(i.amount)}.` : '') + ' This cannot be undone.', 'Delete invoice', () => app.mut(db => { db.invoices = db.invoices.filter(x => x.id !== id); logIt(db, `Invoice ${i.no} deleted by ${db.user.name}`, i.caseId); }, 'Invoice deleted'));
  }
  /* Deletes every saved version of a template's draft. */
  function delDraft(app, k) {
    const n = (app.db.drafts[k] || []).length; if (!n || !allowed(app, 'draft.delete')) return;
    confirmBox(app, 'Delete this draft?', `All ${plural(n, 'saved version')} of your ${app.tplNames[k] || 'draft'} will be deleted. The blank template stays.`, 'Delete draft', () => { app.buf = null; app.mut(db => { delete db.drafts[k]; logIt(db, `${app.tplNames[k] || 'Draft'} draft deleted by ${db.user.name}`); }, 'Draft deleted'); app.setState({ ver: 0 }); });
  }
  function Billing({ app }) {
    const d = app.db, [f, setF] = useState('all'), T = L.today(), ym = T.slice(0, 7);
    const tot = i => i.amount + gstOf(i.amount), unpaid = d.invoices.filter(i => !i.paid), od = unpaid.filter(i => L.diffDays(T, i.date) > 30);
    const rows = d.invoices.filter(i => f === 'all' || (f === 'paid' ? i.paid : !i.paid)).sort((a, b) => b.date.localeCompare(a.date));
    const create = () => needCase(app) || app.modal(() => h(Modal, { title: 'New invoice', onClose: () => app.modal(null) }, h(Form, { init: { date: T, caseId: (caseOpts(d)[0] || [''])[0] }, submit: 'Create invoice', onCancel: () => app.modal(null), note: 'GST at 18% is added to the amount.', fields: [{ k: 'caseId', label: 'Case', type: 'select', options: caseOpts(d) }, { k: 'desc', label: 'Description', req: true, ph: 'Professional fees — drafting and appearance' }, { k: 'amount', label: 'Amount before GST (₹)', type: 'number', req: true, half: true, check: v => v && isNaN(+v.replace(/,/g, '')) ? 'Enter a number' : '' }, { k: 'date', label: 'Invoice date', type: 'date', req: true, half: true }],
      onSubmit: v => { let id; app.mut(db => { const c = caseOf(db, v.caseId), n = Math.max(0, ...db.invoices.map(i => +String(i.no).split('-').pop() || 0)) + 1, ino = 'INV-' + L.today().slice(0, 4) + '-' + String(n).padStart(3, '0'); id = L.uid('i'); db.invoices.unshift({ id, no: ino, clientId: c.clientId || '', caseId: v.caseId, date: v.date, amount: Math.round(+String(v.amount).replace(/,/g, '') * 100) / 100, paid: false, paidOn: '', desc: v.desc.trim() }); logIt(db, 'Invoice ' + ino + ' raised', v.caseId); }, 'Invoice created'); invoiceView(app, id); } })));
    return h(Page, { art: 'invoice', kicker: 'Firm', title: 'Billing & Finance', sub: `${d.invoices.length} invoices · ${unpaid.length} unpaid`, actions: [h(Btn, { key: 0, onClick: () => L.csv('invoices.csv', [['Invoice', 'Client', 'Case', 'Date', 'Amount', 'GST', 'Total', 'Status', 'Paid on'], ...d.invoices.map(i => [i.no, clientOf(d, i.clientId).name, caseOf(d, i.caseId).title, i.date, i.amount, gstOf(i.amount), tot(i), i.paid ? 'Paid' : 'Unpaid', i.paidOn])]) }, 'Export CSV'), h(Btn, { key: 1, primary: true, onClick: create }, '+ New invoice')] },
      h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } }, h(Stat, { label: 'Collected this month', value: L.inr(d.invoices.filter(i => i.paid && i.paidOn.slice(0, 7) === ym).reduce((a, i) => a + i.amount, 0)), note: 'Fees, before GST' }), h(Stat, { label: 'Outstanding', value: L.inr(unpaid.reduce((a, i) => a + i.amount, 0)), note: unpaid.length + ' unpaid invoices' }), h(Stat, { label: 'Overdue by 30+ days', value: L.inr(od.reduce((a, i) => a + i.amount, 0)), note: od.length + ' invoices', red: od.length > 0 })),
      h('div', { style: { display: 'flex', gap: 6 } }, [['all', 'All'], ['unpaid', 'Unpaid'], ['paid', 'Paid']].map(([k, l]) => h('button', { key: k, onClick: () => setF(k), style: { height: 34, padding: '0 14px', borderRadius: 8, fontSize: 13, border: '1px solid ' + (f === k ? K.ink : K.line), background: f === k ? K.ink : '#fff', color: f === k ? '#fff' : K.txt } }, l))),
      h(Table, { onRow: i => invoiceView(app, i.id), min: 860, cols: [{ label: 'Invoice', w: '130px', get: i => i.no }, { label: 'Client', w: 'minmax(180px,1.6fr)', get: i => h('span', null, clientOf(d, i.clientId).name, h('span', { style: { display: 'block', fontSize: 12, color: K.mut } }, caseOf(d, i.caseId).title)) }, { label: 'Date', get: i => L.fmt(i.date) }, { label: 'Fees', get: i => L.inr(i.amount) }, { label: 'Total with GST', get: i => L.inr(tot(i)) }, { label: 'Status', w: '110px', get: i => h(Chip, { tone: i.paid ? '' : (L.diffDays(T, i.date) > 30 ? 'red' : 'grey') }, i.paid ? 'Paid' : (L.diffDays(T, i.date) > 30 ? 'Overdue' : 'Unpaid')) }], rows, empty: { title: 'No invoices in this view' } }));
  }
  function portalText(d, cl) {
    const cs = d.cases.filter(c => c.clientId === cl.id && c.status !== 'archived'), out = [`${d.firm.name} — update for ${cl.name}`, ''];
    cs.forEach(c => { const nh = nextHearing(d, c.id), o = d.orders.filter(x => x.caseId === c.id && x.confirmed).sort((a, b) => b.date.localeCompare(a.date))[0]; out.push(`${c.title} (${c.no}), ${c.court}`); if (cl.share.dates) out.push('  Next date: ' + (nh ? L.fmt(nh.date) : 'not fixed')); if (cl.share.orders && o) out.push(`  Last order (${L.dmy(o.date)}): ${o.summary}`); });
    if (cl.share.invoices) d.invoices.filter(i => i.clientId === cl.id && !i.paid).forEach(i => out.push(`Invoice ${i.no}: ${L.inr(i.amount + gstOf(i.amount))} unpaid`));
    return out.join('\n');
  }
  function Portal({ app }) {
    const d = app.db, set = (id, fn, msg) => app.mut(db => fn(db.clients.find(x => x.id === id)), msg);
    const preview = cl => app.modal(() => { const c = app.db.clients.find(x => x.id === cl.id); return h(Modal, { title: 'What ' + c.name + ' sees', sub: 'Built from the sharing choices for this client', onClose: () => app.modal(null), width: 560 }, h('div', { style: { background: K.soft, border: '1px solid ' + K.line, borderRadius: 8, padding: '14px 16px', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-line', color: K.txt } }, portalText(app.db, c)), h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, h(Btn, { onClick: () => { try { navigator.clipboard.writeText(portalText(app.db, c)); app.toast('Update copied to clipboard'); } catch (e) { app.toast('Copy is not available in this browser'); } } }, 'Copy as text'), h(Btn, { primary: true, onClick: () => app.modal(null) }, 'Done'))); });
    const sh = (c, k, label) => h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.portal ? K.txt : '#9E9E9E' } }, h('input', { type: 'checkbox', checked: !!c.share[k], disabled: !c.portal, onChange: e => set(c.id, x => { x.share[k] = e.target.checked; }) }), label);
    return h(Page, { art: 'portal', kicker: 'Firm', title: 'Client Portal', sub: `${d.clients.filter(c => c.portal).length} of ${d.clients.length} clients have portal access switched on` },
      h('div', { style: { fontSize: 13, color: K.mut, background: K.soft2, borderRadius: 8, padding: '10px 14px', lineHeight: 1.55 } }, 'Clients do not have their own login yet. Use the preview to see exactly what would be shared, and copy it to send yourself.'),
      h(Table, { min: 860, cols: [{ label: 'Client', w: 'minmax(200px,1.6fr)', get: c => h('span', null, c.name, h('span', { style: { display: 'block', fontSize: 12, color: K.mut, fontWeight: 400 } }, (n => n + (n === 1 ? ' case' : ' cases'))(d.cases.filter(x => x.clientId === c.id).length))) }, { label: 'Access', w: '90px', get: c => h(Toggle, { on: c.portal, label: 'Portal access for ' + c.name, onChange: v => set(c.id, x => { x.portal = v; }, v ? 'Portal access switched on' : 'Portal access switched off') }) }, { label: 'Shares', w: 'minmax(280px,2fr)', get: c => h('span', { style: { display: 'flex', gap: 14, flexWrap: 'wrap' } }, sh(c, 'dates', 'Hearing dates'), sh(c, 'orders', 'Order summaries'), sh(c, 'invoices', 'Invoices')) }, { label: '', w: '110px', get: c => h(Btn, { small: true, disabled: !c.portal, onClick: () => preview(c) }, 'Preview') }], rows: d.clients }));
  }
  function Reports({ app }) {
    const d = app.db, T = L.today(), cnt = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const live = d.cases.filter(c => c.status === 'active' || c.status === 'pending');
    const months = []; for (let i = 5; i >= 0; i--) { const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - i); months.push(L.iso(dt).slice(0, 7)); }
    const R = [
      ['Cases by status', cnt(d.cases, c => c.status[0].toUpperCase() + c.status.slice(1))], ['Open cases by stage', cnt(live, c => c.stage)], ['Open cases by court', cnt(live, c => c.court)],
      ['Hearings in the next 30 days, by advocate', cnt(d.hearings.filter(x => x.date >= T && L.diffDays(x.date, T) <= 30), x => x.assignee)], ['Open tasks by person', cnt(openTasks(d), t => t.who)],
      ['Fees billed by month (₹)', months.map(m => [L.fmt(m + '-01', { month: 'short', year: '2-digit' }), d.invoices.filter(i => i.date.slice(0, 7) === m).reduce((a, i) => a + i.amount, 0)]), n => L.inr(n)]
    ];
    const tdone = d.tasks.filter(t => t.done).length;
    return h(Page, { art: 'reports', kicker: 'Firm', title: 'Reports', sub: 'Computed live from your cases, hearings, tasks and invoices', actions: [h(Btn, { key: 1, onClick: () => L.csv('legal-staff-report.csv', R.flatMap(([t, rows]) => [[t], ...rows.map(r => ['', r[0], r[1]]), []])) }, 'Export CSV'), h(Btn, { key: 2, onClick: () => window.print() }, 'Print')] },
      h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } }, h(Stat, { label: 'Open cases', value: live.length, note: d.cases.length + ' in total' }), h(Stat, { label: 'Hearings · next 30 days', value: d.hearings.filter(x => x.date >= T && L.diffDays(x.date, T) <= 30).length }), h(Stat, { label: 'Tasks completed', value: tdone + ' / ' + d.tasks.length, note: d.tasks.filter(overdue).length + ' overdue', red: d.tasks.some(overdue) }), h(Stat, { label: 'Collection rate', value: Math.round(d.invoices.filter(i => i.paid).reduce((a, i) => a + i.amount, 0) / Math.max(1, d.invoices.reduce((a, i) => a + i.amount, 0)) * 100) + '%', note: 'of fees billed' })),
      h('div', { className: 'ls-print', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: 20 } }, R.map(([t, rows, f]) => h(Card, { key: t, title: t }, h(Bars, { rows, fmt: f })))));
  }
  /* ---------- Google Drive: encrypted storage in the user's own Drive (hidden app folder) ---------- */
  const DRIVE_SCOPE = 'openid email https://www.googleapis.com/auth/drive.appdata';
  const loadGsi = () => window.google && google.accounts && google.accounts.oauth2 ? Promise.resolve() : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = res; sc.onerror = () => rej(new Error('Could not reach Google.')); document.head.appendChild(sc); });
  /* Opens Google's consent pop-up for the hidden Drive folder and saves the connection. Must run from a click (pop-up blockers). */
  const driveConnect = app => loadGsi().then(() => new Promise((res, rej) => google.accounts.oauth2.initCodeClient({ client_id: app.driveSt.clientId, scope: DRIVE_SCOPE, ux_mode: 'popup', login_hint: app.db.user.email,
      callback: r => r.code ? LSB.drive.connect(r.code).then(res, rej) : rej(new Error('Google Drive was not turned on.')), error_callback: () => rej(new Error('Google Drive was not turned on.')) }).requestCode()))
    .then(() => LSB.drive.status()).then(x => { app.driveSt = x; app.setState(s => ({ rev: s.rev + 1 })); return x; });
  /* WhatsApp-style: asked once after sign-in; after that uploads and the nightly backup go to Drive with nothing to do. "Not now" asks again in 7 days. */
  function drivePrompt(app) {
    const later = () => { app.mut(db => { db.settings.driveAskedAt = L.today(); }, null, true); app.modal(null); };
    const Body = () => { const [busy, setBusy] = useState(false), [err, setErr] = useState('');
      const on = () => { if (busy) return; setBusy(true); setErr(''); driveConnect(app).then(x => { app.mut(db => { db.settings.driveAskedAt = L.today(); }, null, true); app.modal(null); app.toast('Google Drive backup is on' + (x.email ? ' for ' + x.email : '') + '. Uploads and a nightly backup are saved there automatically.'); LSB.drive.backupNow().then(() => LSB.drive.status()).then(y => { app.driveSt = y; app.setState(s => ({ rev: s.rev + 1 })); }).catch(() => {}); }).catch(e => { setBusy(false); setErr(e.message); }); };
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { fontSize: 14, color: K.txt, lineHeight: 1.6 } }, 'Keep a safe copy of your work in your own Google Drive, like a WhatsApp chat backup. Turn it on once and it runs by itself:'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: K.txt } }, ['Every document you upload is saved to your Drive', 'Your firm\'s data is backed up every night', 'Everything is encrypted and kept in a hidden folder. It does not show in your Drive and only Legal Staff can open it'].map((t, i) => h('div', { key: i, style: { display: 'flex', gap: 8 } }, h('span', null, '✓'), h('span', null, t)))),
        err && h('div', { style: { fontSize: 13, color: K.red } }, err),
        h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' } }, h(Btn, { onClick: later, disabled: busy }, 'Not now'), h(Btn, { primary: true, onClick: on, disabled: busy }, busy ? 'Waiting for Google…' : 'Turn on Google Drive backup')),
        h('div', { style: { fontSize: 12, color: K.mut } }, 'Google asks you to confirm once. You can turn it off any time in Settings.')); };
    app.modal(() => h(Modal, { title: 'Back up to Google Drive', onClose: later, width: 480 }, h(Body)));
  }
  /* Shows the prompt when Drive is available, this user has not connected it, and they have not said "Not now" in the last 7 days. */
  function maybeAskDrive(app) {
    const st = app.driveSt, d = app.db, asked = d.settings.driveAskedAt;
    if (!st || !st.configured || st.connected || app.state.modalOn || !L.access(d.sub).ok) return;
    if (asked && L.diffDays(L.today(), asked) < 7) return;
    drivePrompt(app);
  }
  function DriveCard({ app }) {
    const d = app.db, st = app.driveSt, owner = !!d.isOwner;
    const [busy, setBusy] = useState(''), [list, setList] = useState(null);
    const row = (label, sub, ctl) => h(Line, null, h('div', { style: { flex: 1, minWidth: 0 } }, label, sub && h('div', { style: { fontSize: 12.5, color: K.mut, lineHeight: 1.5 } }, sub)), ctl);
    const refresh = () => LSB.drive.status().then(x => { app.driveSt = x; app.setState(s => ({ rev: s.rev + 1 })); });
    const run = (what, p, done) => { if (busy) return; setBusy(what); return p().then(done).catch(e => app.toast(e.message)).finally(() => setBusy('')); };
    const connect = () => run('connect', () => driveConnect(app), () => app.toast('Google Drive connected. New uploads are saved there, encrypted.'));
    const disconnect = () => confirmBox(app, 'Disconnect Google Drive?', 'New uploads will go to the firm\'s private storage again. Files already saved in your Drive stay there, hidden and encrypted, but you and your team cannot open them until you connect the same Google account again.', 'Disconnect', () => run('disconnect', () => LSB.drive.disconnect(), () => { setList(null); refresh().then(() => app.toast('Google Drive disconnected')); }));
    const backupNow = () => run('backup', () => LSB.drive.backupNow(), r => { app.toast(`Backed up ${plural(r.firms, 'firm')} to your Google Drive`); setList(null); refresh(); });
    const showList = () => run('list', () => LSB.drive.backups(), setList);
    const restore = b => confirmBox(app, 'Restore this backup?', `The firm's data for everyone is replaced with the backup from ${L.fmt(b.date)}. Anything added since then is lost. Export a backup first if you may need it.`, 'Restore', () => run('restore', () => LSB.drive.restore(b.id), x => {
      if (!x || x.v !== 2 || !Array.isArray(x.cases)) throw new Error('That file is not a Legal Staff backup.');
      ['settings', 'chats', 'copilot', 'drafts', 'notes', 'research', 'adminStatus', 'adminNotes', 'session'].forEach(k => { x[k] = d[k]; }); app.replace(x, 'Backup restored from Google Drive'); }));
    const head = h('div', { style: { fontSize: 13, color: K.mut, lineHeight: 1.55, paddingBottom: 10 } }, 'Keep your uploads and a daily backup in your own Google Drive. Everything is encrypted before it reaches Google and kept in a hidden folder that only Legal Staff can open, so it does not show in your Drive.');
    if (!st) return h(Card, { title: 'Google Drive storage' }, head, row('Checking the connection…', null, null));
    if (!st.configured) return h(Card, { title: 'Google Drive storage' }, head, row('Not available yet', 'Google Drive storage has not been switched on for Legal Staff. Uploads are kept in the firm\'s private storage.', null));
    if (!st.connected) return h(Card, { title: 'Google Drive storage' }, head, row('Not connected', 'Uploads go to the firm\'s private storage.', h(Btn, { small: true, primary: true, onClick: connect, disabled: !!busy }, busy === 'connect' ? 'Connecting…' : 'Connect Google Drive')));
    return h(Card, { title: 'Google Drive storage' }, head,
      row('Connected · ' + (st.email || 'Google account'), 'Your new uploads are encrypted and saved to the hidden Legal Staff folder in this Drive. Your team opens them through Legal Staff.', h(Btn, { small: true, onClick: disconnect, disabled: !!busy }, 'Disconnect')),
      row('Daily backup', (st.lastBackup ? 'Last backup ' + new Date(st.lastBackup).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'No backup yet') + ' · every night at 2:30 AM, newest 30 kept' + (st.lastError ? ' · Last problem: ' + st.lastError : ''), h(Btn, { small: true, onClick: backupNow, disabled: !!busy }, busy === 'backup' ? 'Backing up…' : 'Back up now')),
      row('Backups in your Drive', list ? (list.length ? null : 'No backups of this firm yet.') : 'Encrypted copies of this firm\'s data', !list && h(Btn, { small: true, onClick: showList, disabled: !!busy }, busy === 'list' ? 'Loading…' : 'Show backups')),
      list && list.slice(0, 10).map(b => row(L.fmt(b.date), new Date(b.created).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) + ' · ' + L.size(b.size) + ' encrypted', owner ? h(Btn, { small: true, onClick: () => restore(b), disabled: !!busy }, 'Restore') : null)),
      list && !owner && h('div', { style: { fontSize: 12.5, color: K.mut, paddingTop: 8 } }, 'Only the firm owner can restore a backup.'));
  }
  /* ---- profile photo: pick an image, then drag and zoom it inside a circle; a small square JPEG is saved in db.photo ---- */
  const PHOTO_PX = 320, PHOTO_MAX_ZOOM = 4;
  /* A member's photo: your own is db.photo; a teammate's comes with their row in db.team. */
  const photoOf = (db, u) => !u || (u.email && u.email === db.user.email) ? db.photo : (u.photo || '');
  /* invert: the Ink sidebar flips every colour inside it with a CSS filter, so a photo shown there is flipped back. */
  function Avatar({ app, size, style, user, invert }) {
    const p = photoOf(app.db, user), n = size || 34;
    return h('div', { style: Object.assign({ width: n, height: n, borderRadius: '50%', background: K.soft2, color: K.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: Math.round(n * .38), flexShrink: 0, overflow: 'hidden' }, style) },
      p ? h('img', { src: p, alt: '', draggable: false, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: invert ? 'invert(1) hue-rotate(180deg)' : 'none' } }) : (L.initials((user || app.db.user).name) || '?'));
  }
  /* Courts a firm can pick as its main court. A court with a picture in assets/courts/ (COURT_PICS) shows it on the firm's mark in the sidebar. */
  const COURTS = ['Supreme Court of India', 'Allahabad High Court', 'Andhra Pradesh High Court', 'Bombay High Court', 'Calcutta High Court', 'Chhattisgarh High Court', 'Delhi High Court', 'Gauhati High Court', 'Gujarat High Court', 'Himachal Pradesh High Court', 'High Court of Jammu and Kashmir and Ladakh', 'Jharkhand High Court', 'Karnataka High Court', 'Kerala High Court', 'Madhya Pradesh High Court', 'Madras High Court', 'Manipur High Court', 'Meghalaya High Court', 'Orissa High Court', 'Patna High Court', 'Punjab and Haryana High Court', 'Rajasthan High Court', 'Sikkim High Court', 'Telangana High Court', 'Tripura High Court', 'Uttarakhand High Court'];
  /* Empty until the pictures are added: the Main court field in Settings appears once this lists at least one court. */
  const COURT_PICS = [];
  const courtPic = name => COURT_PICS.includes(name) ? 'assets/courts/' + name.toLowerCase().replace(/[^a-z]+/g, '-') + '.jpg' : '';
  /* The firm's mark: its own uploaded picture, else the picture of its main court, else its initials. */
  function FirmMark({ app, size, invert, style }) {
    const f = app.db.firm, n = size || 32, [bad, setBad] = useState('');
    const src = f.photo || courtPic(f.court), show = src && bad !== src;
    return h('div', { title: !f.photo && show ? f.court : undefined, style: Object.assign({ width: n, height: n, borderRadius: Math.round(n * .22), background: K.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Instrument Sans',system-ui,sans-serif", fontWeight: 600, fontSize: Math.round(n * .44), flexShrink: 0, overflow: 'hidden' }, style) },
      show ? h('img', { src, alt: '', draggable: false, onError: () => setBad(src), style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: invert ? 'invert(1) hue-rotate(180deg)' : 'none' } }) : (L.initials((f.name || '').replace(/&/g, ' ')) || 'LS'));
  }
  function PhotoCrop({ img, src, onSave, onCancel, square }) {
    const [box, setBox] = useState(() => Math.max(220, Math.min(340, window.innerWidth - 84)));
    const [v, setV] = useState({ z: 1, x: 0, y: 0 }), [drag, setDrag] = useState(false);
    const el = React.useRef(null), pts = React.useRef(new Map()), cur = React.useRef(v); cur.current = v;
    const w = img.naturalWidth, ht = img.naturalHeight, s0 = box / Math.min(w, ht);
    const fit = n => { const z = Math.max(1, Math.min(PHOTO_MAX_ZOOM, n.z)), mx = (w * s0 * z - box) / 2, my = (ht * s0 * z - box) / 2; return { z, x: Math.max(-mx, Math.min(mx, n.x)), y: Math.max(-my, Math.min(my, n.y)) }; };
    const move = f => setV(o => fit(f(o)));
    /* Zoom about a point of the box (px from its centre), so the spot under the cursor or between two fingers stays put. */
    const zoomAt = (z, px, py) => move(o => { const nz = Math.max(1, Math.min(PHOTO_MAX_ZOOM, z)), k = nz / o.z; return { z: nz, x: px - (px - o.x) * k, y: py - (py - o.y) * k }; });
    React.useEffect(() => {
      const n = el.current, wheel = e => { e.preventDefault(); const r = n.getBoundingClientRect(); zoomAt(cur.current.z * Math.exp(-e.deltaY * .0015), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2); };
      const size = () => setBox(Math.max(220, Math.min(340, window.innerWidth - 84)));
      n.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('resize', size);
      return () => { n.removeEventListener('wheel', wheel); window.removeEventListener('resize', size); };
    }, []);
    const down = e => { e.currentTarget.setPointerCapture(e.pointerId); pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); setDrag(true); };
    const up = e => { pts.current.delete(e.pointerId); if (!pts.current.size) setDrag(false); };
    const mv = e => {
      const m = pts.current, p = m.get(e.pointerId); if (!p) return;
      const q = { x: e.clientX, y: e.clientY };
      if (m.size === 1) { const dx = q.x - p.x, dy = q.y - p.y; move(o => ({ z: o.z, x: o.x + dx, y: o.y + dy })); }
      else if (m.size === 2) {
        const o = [...m.entries()].find(a => a[0] !== e.pointerId)[1], d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(q.x - o.x, q.y - o.y), r = el.current.getBoundingClientRect();
        if (d0 > 0) zoomAt(cur.current.z * d1 / d0, (q.x + o.x) / 2 - r.left - r.width / 2, (q.y + o.y) / 2 - r.top - r.height / 2);
      }
      m.set(e.pointerId, q);
    };
    const key = e => { const st = e.shiftKey ? 40 : 10, d = { ArrowLeft: [st, 0], ArrowRight: [-st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key];
      if (d) { e.preventDefault(); move(o => ({ z: o.z, x: o.x + d[0], y: o.y + d[1] })); } else if (e.key === '+' || e.key === '=') zoomAt(v.z * 1.1, 0, 0); else if (e.key === '-') zoomAt(v.z / 1.1, 0, 0); };
    const save = () => {
      const sc = s0 * v.z, side = (box - (square ? 20 : 0)) / sc, c = document.createElement('canvas'); c.width = c.height = PHOTO_PX;
      const g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, PHOTO_PX, PHOTO_PX); g.imageSmoothingQuality = 'high';
      g.drawImage(img, w / 2 - v.x / sc - side / 2, ht / 2 - v.y / sc - side / 2, side, side, 0, 0, PHOTO_PX, PHOTO_PX);
      onSave(c.toDataURL('image/jpeg', .86));
    };
    const third = (o, i) => h('i', { key: o + i, style: Object.assign({ position: 'absolute', background: 'rgba(255,255,255,.75)' }, o === 'v' ? { top: 0, bottom: 0, width: 1, left: (i * 100 / 3) + '%' } : { left: 0, right: 0, height: 1, top: (i * 100 / 3) + '%' }) });
    return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 } },
      h('div', { ref: el, tabIndex: 0, role: 'application', 'aria-label': 'Photo position. Drag or use the arrow keys to move, plus and minus to zoom.', onPointerDown: down, onPointerMove: mv, onPointerUp: up, onPointerCancel: up, onKeyDown: key, onDoubleClick: () => zoomAt(v.z > 1.01 ? 1 : 2, 0, 0),
        className: 'ls-crop', style: { position: 'relative', width: box, height: box, overflow: 'hidden', borderRadius: 12, background: '#0A0A0A', touchAction: 'none', userSelect: 'none', cursor: drag ? 'grabbing' : 'grab' } },
        h('img', { src, alt: '', draggable: false, style: { position: 'absolute', left: '50%', top: '50%', width: w * s0 * v.z, height: ht * s0 * v.z, maxWidth: 'none', transform: `translate(calc(-50% + ${v.x}px), calc(-50% + ${v.y}px))`, pointerEvents: 'none', transition: drag ? 'none' : 'width .12s, height .12s, transform .12s' } }),
        h('div', { style: { position: 'absolute', inset: square ? 10 : 0, borderRadius: square ? '18%' : '50%', boxShadow: '0 0 0 9999px rgba(10,10,10,.55)', border: '1.5px solid rgba(255,255,255,.9)', pointerEvents: 'none' } }),
        h('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none', opacity: drag ? 1 : 0, transition: 'opacity .2s' } }, [1, 2].map(i => third('v', i)), [1, 2].map(i => third('h', i)))),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 10, width: box, fontSize: 12.5, color: K.mut } },
        h('span', { 'aria-hidden': true, style: { fontSize: 15, lineHeight: 1 } }, '−'),
        h('input', { type: 'range', min: 1, max: PHOTO_MAX_ZOOM, step: .01, value: v.z, 'aria-label': 'Zoom', onChange: e => zoomAt(+e.target.value, 0, 0), style: { flex: 1, accentColor: K.ink } }),
        h('span', { 'aria-hidden': true, style: { fontSize: 17, lineHeight: 1 } }, '+')),
      h('div', { style: { fontSize: 12.5, color: K.mut, textAlign: 'center' } }, 'Drag to move. Pinch, scroll or use the slider to zoom.'),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' } }, h(Btn, { onClick: onCancel }, 'Cancel'), h(Btn, { primary: true, onClick: save }, square ? 'Save picture' : 'Save photo')));
  }
  function savePhoto(app, url, msg) {
    const server = !!(window.LSB && LSB.on);
    app.mut(db => { db.photo = url; }, server ? null : msg);
    if (app.db.photo !== url) return; /* the change was refused, e.g. the plan has ended; mut() has said why */
    if (server) app.flush().then(() => app.toast(msg), e => app.toast('Not saved: ' + e.message));
  }
  /* opts.firm: the picture is for the firm's mark (rounded square, saved in db.firm.photo) instead of the user's profile photo. */
  /* key: 'photo' is the firm's mark in the sidebar; 'groupPhoto' is the picture of the firm's group chat. Both live with the firm. */
  function saveFirmPhoto(app, url, msg, key) {
    const server = !!(window.LSB && LSB.on), k = key || 'photo';
    if (server && !app.db.isOwner) return app.toast(k === 'photo' ? 'Only the firm owner can change the firm picture.' : 'Only the firm owner can change the group photo.');
    app.mut(db => { db.firm[k] = url; }, server ? null : msg);
    if ((app.db.firm[k] || '') !== url) return;
    if (server) app.flush().then(() => app.toast(msg), e => app.toast('Not saved: ' + e.message));
  }
  function editPhoto(app, opts) {
    const firm = !!(opts && opts.firm), group = !!(opts && opts.group);
    if ((firm || group) && window.LSB && LSB.on && !app.db.isOwner) return app.toast(group ? 'Only the firm owner can change the group photo.' : 'Only the firm owner can change the firm picture.');
    L.pickFile('image/*').then(fs => {
      const f = fs[0]; if (!f) return;
      if (!/^image\//.test(f.type)) return app.toast('Choose an image file, such as a JPG or PNG');
      if (f.size > 20 * 1024 * 1024) return app.toast('That image is over 20 MB. Choose a smaller one');
      const src = URL.createObjectURL(f), img = new Image(), close = () => { app.modal(null); URL.revokeObjectURL(src); };
      img.onerror = () => { URL.revokeObjectURL(src); app.toast('That image could not be opened. Try a JPG or PNG'); };
      img.onload = () => app.modal(() => h(Modal, { title: group ? 'Edit group photo' : firm ? 'Edit firm picture' : 'Edit profile photo', onClose: close, width: 420 }, h(PhotoCrop, { img, src, square: firm, onCancel: close, onSave: url => { close(); group ? saveFirmPhoto(app, url, 'Group photo updated', 'groupPhoto') : firm ? saveFirmPhoto(app, url, 'Firm picture updated') : savePhoto(app, url, 'Profile photo updated'); } })));
      img.src = src;
    });
  }
  const removePhoto = app => savePhoto(app, '', 'Profile photo removed');
  function Settings({ app }) {
    const d = app.db, s = d.settings, set = (k, v, msg) => app.mut(db => { db.settings[k] = v; }, msg || 'Setting saved');
    const row = (label, sub, ctl) => h(Line, null, h('div', { style: { flex: 1, minWidth: 0 } }, label, sub && h('div', { style: { fontSize: 12.5, color: K.mut } }, sub)), ctl);
    const server = !!(window.LSB && LSB.on), owner = !server || !!d.isOwner;
    const formCard = (title, obj, fields, key) => h(Card, { title }, h(Form, { key: key + app.state.rev0, fields, init: obj, submit: 'Save', onSubmit: v => { app.mut(db => { Object.assign(db[key], Object.fromEntries(fields.map(f => [f.k, v[f.k]]))); if (key === 'user') { const u = db.team.find(x => x.email === obj.email) || db.team[0]; const old = u.name; db.user.title = (/(Partner|Associate|Advocate)/.test(v.role) ? 'Adv. ' : '') + v.name.trim(); Object.assign(u, { name: v.name.trim(), title: db.user.title, role: v.role, email: v.email }); if (old !== u.name) { db.tasks.forEach(t => { if (t.who === old) t.who = u.name; }); db.hearings.forEach(x => { if (x.assignee === old) x.assignee = u.name; }); db.cases.forEach(c => { c.team = c.team.map(n => n === old ? u.name : n); }); } } }, server ? null : 'Saved');
      /* On the server, say "Saved" only once the server has accepted the change. */
      if (server) app.flush().then(() => app.toast('Saved'), e => app.toast('Not saved: ' + e.message)); } }));
    const backup = row('Back up', 'Download everything as a JSON file', h(Btn, { small: true, onClick: () => L.download('legal-staff-backup-' + L.today() + '.json', new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })) }, 'Export'));
    const restore = owner && row('Restore', server ? 'Replace the firm\'s data for everyone with a backup file' : 'Replace the data with a backup file', h(Btn, { small: true, onClick: () => L.pickFile('.json,application/json').then(fs => fs[0] && fs[0].text().then(t => { try { const x = JSON.parse(t); if (!x || x.v !== 2 || !Array.isArray(x.cases)) throw 0; x.session = d.session; app.replace(x, 'Backup restored'); } catch (e) { app.toast('That file is not a Legal Staff backup'); } })) }, 'Import'));
    const signOut = row('Sign out', d.session ? 'Signed in as ' + d.session.email : '', h(Btn, { small: true, onClick: () => app.signOut() }, 'Sign out'));
    const dataCard = server
      ? h(React.Fragment, null, h(DriveCard, { app }), h(Card, { title: 'Your firm\'s data' }, backup, restore,
          row('Clear this device', 'Remove what this browser keeps and sign out. The firm\'s data on the server is not touched.', h(Btn, { small: true, onClick: () => confirmBox(app, 'Clear this device?', 'Everything Legal Staff keeps in this browser is removed and you are signed out. Your firm\'s data on the server stays as it is.', 'Clear and sign out', () => clearDevice(app)) }, 'Clear')),
          owner && row('Delete firm data', 'Permanently delete every record and file of ' + (d.firm.name || 'the firm') + ', for everyone in the firm', h(Btn, { small: true, danger: true, onClick: () => eraseFirm(app) }, 'Delete')),
          signOut))
      : h(Card, { title: 'Data on this device' }, backup, restore, row('Erase all data', 'Delete every case, client, invoice, file and setting on this device', h(Btn, { small: true, danger: true, onClick: () => confirmBox(app, 'Erase all data?', 'Every case, client, invoice, document and setting on this device will be deleted, including uploaded files. Export a backup first if you may need it. This cannot be undone.', 'Erase everything', () => { const s0 = d.session, u0 = d.user; L.files.clear(); const x = L.reset(); x.session = s0; x.user = u0; x.team = [{ id: 'u1', name: u0.name, title: u0.title, role: u0.role, email: u0.email, status: 'Active' }]; app.replace(x, 'All data erased'); onboard(app); }) }, 'Erase')), signOut);
    return h(Page, { art: 'settings', kicker: 'Firm', title: 'Settings', sub: server ? 'Saved to your firm\'s account' : 'Everything here is saved on this device', max: 1100 },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,440px),1fr))', gap: 20, alignItems: 'start' } },
        formCard('Firm profile', Object.assign({}, d.firm, { kind: d.firm.kind || 'advocate', domain: LSP.norm(d.firm.domain) }), [{ k: 'name', label: 'Firm name', req: true }, { k: 'kind', label: 'Practice type', type: 'select', options: LSP.KINDS.map(x => [x.k, x.label]), half: true }, { k: 'domain', label: 'Area of practice (shapes the dashboard)', type: 'select', options: LSP.list().map(x => [x.k, x.label]), half: true }, { k: 'city', label: 'City', req: true, half: true }, { k: 'gstin', label: 'GSTIN (optional)', half: true, check: v => v && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(v) ? 'A GSTIN has 15 characters, e.g. 07AAAAA0000A1Z5' : '' }, COURT_PICS.length ? { k: 'court', label: 'Main court', type: 'select', blank: 'Not set', options: COURTS, half: true } : null, { k: 'address', label: 'Address on letterhead and invoices' }].filter(Boolean), 'firm'),
        h(Card, { title: 'Firm picture' }, h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: () => editPhoto(app, { firm: true }), title: 'Upload a picture', className: 'ls-avatar-btn', style: { border: 0, padding: 0, background: 'none', borderRadius: 16, cursor: 'pointer' } }, h(FirmMark, { app, size: 72 })),
          h('div', { style: { flex: 1, minWidth: 180 } }, h('div', { style: { fontSize: 13.5 } }, d.firm.photo ? 'Your own picture shows next to the firm name.' : courtPic(d.firm.court) ? 'The ' + d.firm.court + ' shows next to the firm name.' : 'Shows next to the firm name, for everyone in the firm.'), h('div', { style: { fontSize: 12.5, color: K.mut, marginTop: 2 } }, d.firm.photo ? 'Remove it to go back to ' + (courtPic(d.firm.court) ? 'the photo of your main court.' : 'the firm initials.') : COURT_PICS.length ? 'Choose a main court in Firm profile to show its photo, or upload a logo or picture of your own.' : 'Upload a logo, or a picture such as your main court. You can move and zoom it before saving.')),
          h('div', { style: { display: 'flex', gap: 8 } }, h(Btn, { small: true, onClick: () => editPhoto(app, { firm: true }) }, d.firm.photo ? 'Change picture' : 'Upload picture'), d.firm.photo && h(Btn, { small: true, danger: true, onClick: () => saveFirmPhoto(app, '', 'Firm picture removed') }, 'Remove')))),
        h(Card, { title: 'Profile photo' }, h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: () => editPhoto(app), title: d.photo ? 'Change photo' : 'Upload a photo', className: 'ls-avatar-btn', style: { border: 0, padding: 0, background: 'none', borderRadius: '50%', cursor: 'pointer' } }, h(Avatar, { app, size: 72 })),
          h('div', { style: { flex: 1, minWidth: 180 } }, h('div', { style: { fontSize: 13.5 } }, d.photo ? 'Your team sees this photo next to your name.' : 'Add a photo for your team to see next to your name.'), h('div', { style: { fontSize: 12.5, color: K.mut, marginTop: 2 } }, 'JPG or PNG. You can move and zoom it before saving.')),
          h('div', { style: { display: 'flex', gap: 8 } }, h(Btn, { small: true, onClick: () => editPhoto(app) }, d.photo ? 'Change photo' : 'Upload photo'), d.photo && h(Btn, { small: true, danger: true, onClick: () => removePhoto(app) }, 'Remove')))),
        formCard('Your profile', d.user, [{ k: 'name', label: 'Full name', req: true, half: true }, owner ? { k: 'role', label: 'Designation', req: true, half: true } : { k: 'role', label: 'Designation (set by the firm owner)', ro: true, roNote: 'Only the firm owner can change designations', half: true }, { k: 'email', label: 'Email (from sign-in)', ro: true, roNote: 'This is the address you sign in with', half: true }, { k: 'phone', label: 'Mobile (WhatsApp)', type: 'tel', half: true }], 'user'),
        h(Card, { title: 'Notifications' }, row('WhatsApp', 'The morning briefing on WhatsApp, to the mobile in Your profile, once WhatsApp is connected for Legal Staff', h(Toggle, { on: s.whatsapp, label: 'WhatsApp notifications', onChange: v => set('whatsapp', v) })), row('Email', 'The morning briefing email, sent automatically every day at your chosen time', h(Toggle, { on: s.email, label: 'Email notifications', onChange: v => set('email', v) })), row('In-app alerts', 'The Alerts menu in the top bar', h(Toggle, { on: s.inapp, label: 'In-app alerts', onChange: v => set('inapp', v) })), row('Morning briefing time', 'IST. Briefings go out on the half hour, once a day.', h(Select, { value: briefAt(s), onChange: v => set('briefingTime', v), options: BRIEF_TIMES.map(t => [t, L.t12ap(t)]), style: { minWidth: 130 } })), row('Hearing reminder', `The briefing lists hearings today and ${plural(+s.remindDays || 2, 'day')} ahead`, h(Select, { value: String(s.remindDays), onChange: v => set('remindDays', +v), options: [['1', '1 day'], ['2', '2 days'], ['3', '3 days'], ['7', '7 days']], style: { minWidth: 130 } })), window.LSB && LSB.on ? row('Send today\'s briefing now', 'To you only, now: hearings today and in ' + plural(+s.remindDays || 2, 'day') + ', deadlines and limitation dates, overdue tasks. Email and WhatsApp only once those services are connected.', h(Btn, { small: true, onClick: () => { app.toast('Sending…'); LSB.notify().then(r => { const rs = (r && r.results) || [], okN = rs.filter(x => x.ok).length, sk = rs.find(x => x.skipped), er = rs.find(x => x.error); app.toast(okN ? `Briefing sent (${rs.filter(x => x.ok).map(x => x.channel).join(' and ')})` : (er ? 'Sending failed: ' + er.error : (sk ? sk.skipped : 'Nothing was sent. Check your email and WhatsApp number in Your profile.'))); }).catch(e => app.toast(e.message)); } }, 'Send')) : h('div', { style: { fontSize: 12.5, color: K.mut, marginTop: 10, lineHeight: 1.5 } }, 'Preferences are saved on this device. Briefing emails and WhatsApp messages need the server to be connected; until then, alerts show in the Alerts menu when you open the app.')),
        h(Card, { title: 'Court orders' }, row('Add the next date automatically', 'When an order you add has a future next date, it goes straight to the calendar. Switch off to confirm each one yourself.', h(Toggle, { on: s.autoOrders !== false, label: 'Automatic next dates', onChange: v => set('autoOrders', v) })),
          server ? row('Check the court record', 'Every few hours the app asks your court-data provider about each open case with a CNR and adds new next dates and orders.' + (s.lastCheck ? ' Last checked ' + L.fmt(s.lastCheck.slice(0, 10)) + '.' : ''), h(Toggle, { on: s.autoCheck !== false, label: 'Automatic court checks', onChange: v => set('autoCheck', v) })) : row('Check the court record', 'Needs the server and a court-data provider, so it is not available in this browser-only copy.', null),
          server ? row('Check all cases now', null, h(Btn, { small: true, onClick: () => autoCheck(app, true) }, 'Check now')) : null),
        h(Card, { title: 'Appearance' }, row('Sidebar', null, h(Select, { value: s.sidebar, onChange: v => set('sidebar', v), options: [['Light', 'Light'], ['Ink', 'Ink (dark)']], style: { minWidth: 150 } })), row('Background', null, h(Select, { value: s.backdrop, onChange: v => set('backdrop', v), options: ['Wallpaper', 'Dots', 'Grid', 'Plain'].map(x => [x, x]), style: { minWidth: 150 } })), row('Density', null, h(Select, { value: s.density, onChange: v => set('density', v), options: [['Comfortable', 'Comfortable'], ['Compact', 'Compact']], style: { minWidth: 150 } }))),
        h(Card, { title: 'Subscription' }, (acc => row(planName(acc) + (acc.state === 'active' ? ' · ' + (d.sub.cycle === 'annual' ? 'Annual' : 'Monthly') : ''), planSub(acc), h(Btn, { small: true, primary: !acc.ok, onClick: () => app.go('pricing') }, acc.state === 'none' ? 'Start free trial' : acc.ok ? 'Change plan' : 'Subscribe')))(L.access(d.sub)), server && d.sub.history.length ? row('Invoices', 'Download or email your invoices', h(Btn, { small: true, onClick: () => app.go('pricing') }, 'View invoices')) : null, d.sub.history.map((x, i) => row(x.plan + ' · ' + x.total, server ? 'Paid ' + L.fmt(x.date) + ' by UPI' : 'Recorded ' + L.fmt(x.date) + ' on this device · no payment taken (payments need the server)', null))),
        dataCard));
  }
  /* Removes what this browser keeps (saved data, file blobs) and signs out. Server data is untouched. */
  async function clearDevice(app) {
    await app.flush().catch(() => {});
    try { Object.keys(localStorage).filter(k => /^ls[.-]/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    await L.files.clear(); app.signOut(); app.toast('This device is cleared and you are signed out.');
  }
  /* Owner only, with the firm name typed as confirmation. */
  function eraseFirm(app) {
    const d = app.db, name = (d.firm.name || '').trim();
    if (!d.isOwner) return app.toast('Only the firm owner can delete the firm\'s data.');
    app.modal(() => h(Modal, { title: 'Delete firm data?', onClose: () => app.modal(null), width: 500 },
      h('div', { style: { fontSize: 14, color: K.txt, lineHeight: 1.6 } }, `This permanently deletes every case, client, hearing, order, task, invoice, deadline and uploaded file of ${name}, for everyone in the firm, and clears each member's saved notes, chats and drafts. Team members, the subscription and payment records are kept. Export a backup first. This cannot be undone.`),
      h(Form, { submit: 'Delete firm data', onCancel: () => app.modal(null), fields: [{ k: 'confirm', label: 'Type the firm name to confirm: ' + name, req: true, ph: name, check: v => v !== name ? 'The name does not match.' : '' }],
        onSubmit: () => { app.modal(null); app.toast('Deleting the firm\'s data…'); app.eraseFirm().then(n => app.toast(`Firm data deleted${n ? ' · ' + n + ' file' + (n === 1 ? '' : 's') + ' removed' : ''}`)).catch(e => app.toast('Could not delete the firm\'s data: ' + e.message)); } })));
  }
  function Orders({ app }) {
    const d = app.db, rows = d.orders.slice().sort((a, b) => b.date.localeCompare(a.date)), need = rows.filter(o => !o.confirmed && o.nextDate).length;
    return h(Page, { art: 'order', kicker: 'Practice', title: 'Court Orders', sub: `${rows.length} orders · ${need} awaiting your confirmation`, actions: [h(Btn, { key: 1, primary: true, onClick: () => addOrder(app) }, '+ Add court order')] },
      h(Table, { onRow: o => app.go('order', o.id), min: 860, cols: [{ label: 'Case', w: 'minmax(220px,1.6fr)', get: o => h('span', null, caseOf(d, o.caseId).title, h('span', { style: { display: 'block', fontSize: 12, color: K.mut, fontWeight: 400 } }, caseOf(d, o.caseId).no)) }, { label: 'Order dated', w: '110px', get: o => L.dmy(o.date) }, { label: 'Summary', w: 'minmax(240px,2.4fr)', get: o => h('span', null, o.summary, h('span', { style: { display: 'block', fontSize: 12, color: K.mut } }, o.source)) }, { label: 'Next date', w: '110px', get: o => o.nextDate ? L.dmy(o.nextDate) : '—' }, { label: 'Status', w: '150px', get: o => h(Chip, { tone: o.confirmed || !o.nextDate ? '' : 'red' }, o.confirmed ? 'Confirmed' : (o.nextDate ? 'Needs confirmation' : 'No date found')) }], rows, empty: { title: 'No orders yet', text: 'Add an order to extract the next date.' } }));
  }
  /* ---------- Pay by UPI: straight to the operator's UPI ID, confirmed automatically (functions/upi-pay) ---------- */
  const loadQr = () => window.qrcode ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the QR code.')); document.head.appendChild(s); });
  /* ---------- Team chat extras: files, meeting cards, reactions, background ---------- */
  const EMOJIS = ['👍', '❤️', '😂', '🙏', '✅', '👏'];
  const fileSize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  /* A soft doodle wallpaper (scales, gavel, book, page, ₹, quote marks) behind the messages, like a messenger's chat background. */
  const CHAT_BG = (() => {
    const g = '<g fill="none" stroke="#0A0A0A" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".06">' +
      '<path d="M30 20v28 M18 26h24 M18 26l-6 12h12z M42 26l-6 12h12z M24 50h12"/>' +
      '<path d="M120 30l14 14 M114 36l12-12 M128 50l8-8 M131 37l18 18"/>' +
      '<path d="M200 22h22a4 4 0 0 1 4 4v30h-22a4 4 0 0 0-4 4z M200 22v38"/>' +
      '<path d="M60 110h22l8 8v26H60z M82 110v8h8 M66 126h18 M66 134h14"/>' +
      '<path d="M160 112h16 M160 120h16 M164 112c10 0 10 8 0 8 M166 120l10 14"/>' +
      '<path d="M226 120c-6 0-8 4-8 9 0 4 3 6 6 6 M240 120c-6 0-8 4-8 9 0 4 3 6 6 6"/>' +
      '<circle cx="110" cy="190" r="10"/><path d="M110 184v6l4 3"/>' +
      '<path d="M20 180l10 10 18-20"/><path d="M190 186a14 14 0 1 0 28 0 14 14 0 1 0-28 0 M204 176v20 M196 186h16"/></g>';
    return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="230" viewBox="0 0 260 230">' + g + '</svg>') + '")';
  })();
  function FileMsg({ m, mine }) {
    const f = m.data || {}, img = /^image\//.test(f.type || ''), [src, setSrc] = useState(''), [busy, setBusy] = useState(false);
    React.useEffect(() => { if (img && f.path) LSB.chat.url(f.path).then(setSrc).catch(() => {}); }, [f.path]);
    const open = dl => { setBusy(true); LSB.chat.url(f.path, dl).then(u => window.open(u, '_blank', 'noopener')).catch(e => alert(e.message)).finally(() => setBusy(false)); };
    const ext = (String(f.name).split('.').pop() || 'file').slice(0, 4).toUpperCase(), pdf = ext === 'PDF';
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      img ? h('button', { onClick: () => open(false), style: { border: 0, padding: 0, background: 'none', cursor: 'zoom-in', display: 'block' }, title: 'Open ' + f.name },
          src ? h('img', { src, alt: f.name, style: { display: 'block', maxWidth: 260, maxHeight: 240, borderRadius: 10, objectFit: 'cover' } }) : h('div', { style: { width: 220, height: 140, borderRadius: 10, background: mine ? '#262626' : K.soft2 } }))
        : h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, background: mine ? '#1F1F1F' : K.soft, minWidth: 220 } },
          h('span', { style: { width: 38, height: 46, borderRadius: 6, background: pdf ? '#D93025' : '#5E5E5E', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6, flexShrink: 0 } }, ext),
          h('span', { style: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 } }, h('span', { style: { fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 } }, f.name), h('span', { style: { fontSize: 12, opacity: .7 } }, fileSize(f.size || 0) + ' · ' + (pdf ? 'PDF document' : 'File')))),
      !img && h('div', { style: { display: 'flex', gap: 6 } },
        h('button', { onClick: () => open(false), disabled: busy, style: { flex: 1, height: 30, borderRadius: 7, border: '1px solid ' + (mine ? '#3A3A3A' : K.line), background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600 } }, 'Open'),
        h('button', { onClick: () => open(true), disabled: busy, style: { flex: 1, height: 30, borderRadius: 7, border: '1px solid ' + (mine ? '#3A3A3A' : K.line), background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: 12.5, fontWeight: 600 } }, 'Download')),
      m.body && h('div', null, m.body));
  }
  function MeetMsg({ m, mine }) {
    const d = m.data || {}, start = new Date(d.start), end = new Date(start.getTime() + (d.minutes || 30) * 60e3);
    const g = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const cal = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(d.title || 'Team meeting') + '&dates=' + g(start) + '/' + g(end) + '&details=' + encodeURIComponent('Join with Google Meet: ' + d.link + (d.note ? '\n\n' + d.note : '')) + '&location=' + encodeURIComponent(d.link);
    const past = Date.now() > end.getTime();
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        h('span', { style: { width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid ' + K.line } },
          h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', 'aria-hidden': true }, h('rect', { x: 2, y: 6, width: 13, height: 12, rx: 2.5, fill: '#00832D' }), h('path', { d: 'M15 10.5 21 7v10l-6-3.5z', fill: '#0066DA' }), h('rect', { x: 2, y: 6, width: 6, height: 6, rx: 1.5, fill: '#FFBA00' }))),
        h('span', { style: { display: 'flex', flexDirection: 'column' } }, h('span', { style: { fontWeight: 700, fontSize: 14.5 } }, d.title || 'Team meeting'),
          h('span', { style: { fontSize: 12.5, opacity: .75 } }, start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + start.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) + ' – ' + end.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })))),
      d.note && h('div', { style: { fontSize: 13.5 } }, d.note),
      h('a', { href: d.link, target: '_blank', rel: 'noopener', style: { display: 'block', textAlign: 'center', height: 34, lineHeight: '34px', borderRadius: 8, background: past ? (mine ? '#262626' : K.soft2) : '#1A73E8', color: past ? 'inherit' : '#fff', fontWeight: 600, fontSize: 13.5, textDecoration: 'none' } }, past ? 'Meeting ended · open link' : 'Join with Google Meet'),
      !past && h('a', { href: cal, target: '_blank', rel: 'noopener', style: { textAlign: 'center', fontSize: 12.5, color: 'inherit', opacity: .8 } }, 'Add to Google Calendar'));
  }
  function MeetForm({ onSend, onClose }) {
    const now = new Date(Date.now() + 30 * 60e3); now.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
    const [v, setV] = useState({ title: 'Team meeting', date: L.iso(now), time: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'), minutes: '30', link: '', note: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
    const set = k => e => setV(Object.assign({}, v, { [k]: e.target.value }));
    const inp = { height: 36, border: '1px solid ' + K.line, borderRadius: 8, padding: '0 10px', font: 'inherit', fontSize: 14, width: '100%', boxSizing: 'border-box' };
    const lab = (t, el) => h('label', { style: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, color: K.mut, fontWeight: 500, flex: 1 } }, t, el);
    const go = () => { const link = v.link.trim(); if (!v.title.trim()) return setErr('Give the meeting a title.');
      if (!/^https:\/\/meet\.google\.com\/[a-z]{3,4}-[a-z]{4}-[a-z]{3,4}/i.test(link)) return setErr('Paste a Google Meet link, like https://meet.google.com/abc-defg-hij');
      const start = new Date(v.date + 'T' + v.time); if (isNaN(start)) return setErr('Choose a date and time.');
      setBusy(true); onSend({ title: v.title.trim(), start: start.toISOString(), minutes: +v.minutes || 30, link: link.split(/\s/)[0], note: v.note.trim() }).then(onClose).catch(e => { setErr(e.message); setBusy(false); }); };
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      lab('Title', h('input', { value: v.title, onChange: set('title'), style: inp })),
      h('div', { style: { display: 'flex', gap: 10 } }, lab('Date', h('input', { type: 'date', value: v.date, onChange: set('date'), style: inp })), lab('Time', h('input', { type: 'time', value: v.time, onChange: set('time'), style: inp })),
        lab('Length', h('select', { value: v.minutes, onChange: set('minutes'), style: inp }, [15, 30, 45, 60, 90, 120].map(n => h('option', { key: n, value: n }, n < 60 ? n + ' min' : n / 60 + ' hr' + (n > 60 ? 's' : '')))))),
      h('div', { style: { padding: 12, borderRadius: 10, background: K.soft, display: 'flex', flexDirection: 'column', gap: 8 } },
        h('div', { style: { fontSize: 13, color: K.txt, lineHeight: 1.5 } }, '1. Create the meeting in Google Meet, then copy its link.'),
        h('a', { href: 'https://meet.google.com/new', target: '_blank', rel: 'noopener', style: { alignSelf: 'flex-start', height: 32, lineHeight: '32px', padding: '0 14px', borderRadius: 8, background: '#1A73E8', color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none' } }, 'Create a Google Meet link ↗'),
        h('div', { style: { fontSize: 13, color: K.txt } }, '2. Paste the link here.'),
        h('input', { value: v.link, onChange: set('link'), placeholder: 'https://meet.google.com/abc-defg-hij', style: inp })),
      lab('Agenda (optional)', h('input', { value: v.note, onChange: set('note'), placeholder: 'e.g. Prepare for Rao vs State, item 14', style: inp })),
      err && h('div', { style: { fontSize: 13, color: K.red } }, err),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } }, h(Btn, { onClick: onClose }, 'Cancel'), h(Btn, { primary: true, onClick: go, disabled: busy }, busy ? 'Posting…' : 'Post meeting')));
  }

  /* ---------- Team chat: the firm's group chat and one-to-one chats with team members (live) ---------- */
  function Chat({ app }) {
    const d = app.db, server = window.LSB && LSB.on && LSB.chat;
    const me = server ? LSB.chat.me() : '';
    const people = d.team.filter(u => u.userId && u.userId !== me && u.status === 'Active');
    const [sel, setSel] = useState('team'), [msgs, setMsgs] = useState({}), [text, setText] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [mob, setMob] = useState('list');
    const [reacts, setReacts] = useState({}), [pick, setPick] = useState(null), [up, setUp] = useState(false), [fly, setFly] = useState(false);
    const fresh = React.useRef(new Set());   // ids that arrived after the chat opened: these animate in
    const scroller = React.useRef(null), box = React.useRef(null), fileIn = React.useRef(null), selRef = React.useRef(sel); selRef.current = sel;
    const narrow = app.state.w < 760;
    const who = id => d.team.find(u => u.userId === id);
    const chOf = u => LSB.chat.dm(u.userId);
    React.useEffect(() => {
      if (!server) return;
      app.chatEvt = m => { fresh.current.add(m.id); setMsgs(all => { const list = all[m.channel]; if (!list || list.some(x => x.id === m.id)) return all; return Object.assign({}, all, { [m.channel]: list.concat(m) }); });
        if (m.channel === selRef.current && m.sender !== me && document.visibilityState === 'visible') LSB.chat.read(m.channel).then(() => app.refreshChat()).catch(() => {}); };
      app.chatDel = m => setMsgs(all => { const out = {}; Object.keys(all).forEach(k => out[k] = all[k].filter(x => x.id !== m.id)); return out; });
      app.chatReact = (r, on) => setReacts(all => { const list = (all[r.channel] || Object.values(all).find(l => l.some(x => x.message_id === r.message_id)) || []).filter(x => !(x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji));
        const ch = r.channel || Object.keys(all).find(k => all[k].some(x => x.message_id === r.message_id)); if (!ch) return all;
        return Object.assign({}, all, { [ch]: on ? list.concat({ message_id: r.message_id, user_id: r.user_id, emoji: r.emoji }) : list }); });
      return () => { app.chatEvt = null; app.chatDel = null; app.chatReact = null; };
    }, []);
    React.useEffect(() => {
      if (!server) return; let dead = false; setErr('');
      LSB.chat.list(sel).then(list => { if (!dead) setMsgs(all => Object.assign({}, all, { [sel]: list })); }).catch(e => !dead && setErr(e.message));
      LSB.chat.reactions(sel).then(list => { if (!dead) setReacts(all => Object.assign({}, all, { [sel]: list })); }).catch(() => {});
      LSB.chat.read(sel).then(() => app.refreshChat()).catch(() => {});
      return () => { dead = true; };
    }, [sel]);
    React.useEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs[sel] && msgs[sel].length, sel]);
    if (!server) return h(Page, { art: 'team', kicker: 'Firm', title: 'Team chat' }, h(Empty, { title: 'Team chat needs the server', text: 'Chat works when Legal Staff is connected to its server, so messages reach your team on every device.' }));
    const unread = app.chatUnread || {};
    const send = () => { const body = text.trim(); if (!body || busy) return; setBusy(true); setErr('');
      setFly(true); setTimeout(() => setFly(false), 450);
      LSB.chat.send(sel, body).then(m => { fresh.current.add(m.id); setText(''); setMsgs(all => { const list = all[sel] || []; return list.some(x => x.id === m.id) ? all : Object.assign({}, all, { [sel]: list.concat(m) }); }); if (box.current) { box.current.style.height = 'auto'; box.current.focus(); } })
        .catch(e => setErr(e.message)).finally(() => setBusy(false)); };
    const post = (body, kind, data) => LSB.chat.send(sel, body, kind, data).then(m => fresh.current.add(m.id) && setMsgs(all => { const list = all[sel] || []; return list.some(x => x.id === m.id) ? all : Object.assign({}, all, { [sel]: list.concat(m) }); }));
    const attach = e => { const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
      if (file.size > 20 * 1048576) return setErr('Files up to 20 MB can be sent.');
      setUp(true); setErr(''); const caption = text.trim();
      LSB.chat.upload(sel, file).then(f => post(caption, 'file', f)).then(() => setText('')).catch(x => setErr(x.message)).finally(() => setUp(false)); };
    const meet = () => app.modal(() => h(Modal, { title: 'Schedule a team meeting', sub: 'Posts a Google Meet card in this chat', onClose: () => app.modal(null) }, h(MeetForm, { onSend: d => post('', 'meeting', d), onClose: () => app.modal(null) })));
    const react = (m, emoji) => { setPick(null); const list = reacts[m.channel] || [], mineR = list.some(x => x.message_id === m.id && x.user_id === me && x.emoji === emoji);
      setReacts(all => Object.assign({}, all, { [m.channel]: mineR ? list.filter(x => !(x.message_id === m.id && x.user_id === me && x.emoji === emoji)) : list.concat({ message_id: m.id, user_id: me, emoji }) }));
      LSB.chat.react(m, emoji, !mineR).catch(e => setErr(e.message)); };
    const open = ch => { setSel(ch); setMob('chat'); setPick(null); };
    const avatar = (label, dark, size, src) => h('span', { style: { width: size || 36, height: size || 36, borderRadius: '50%', background: dark ? K.ink : K.soft2, color: dark ? '#fff' : K.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: (size || 36) * .36, fontWeight: 600, flexShrink: 0, overflow: 'hidden' } },
      src ? h('img', { src, alt: '', draggable: false, style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }) : label);
    /* The group's photo: its own, else the firm picture or main court photo, else the firm's initials. Members show their profile photos. */
    const groupSrc = d.firm.groupPhoto || d.firm.photo || courtPic(d.firm.court);
    const groupAv = size => avatar(L.initials(d.firm.name) || 'T', true, size, groupSrc), userAv = (u, size) => avatar(L.initials(u ? u.name : '?'), false, size, u ? photoOf(d, u) : '');
    const groupPhoto = () => { if (!d.isOwner) return app.toast('Only the firm owner can change the group photo.');
      if (!d.firm.groupPhoto) return editPhoto(app, { group: true });
      app.modal(() => h(Modal, { title: 'Group photo', sub: 'Everyone at the firm sees this photo on the group chat.', onClose: () => app.modal(null), width: 400 },
        h('div', { style: { display: 'flex', justifyContent: 'center', padding: '4px 0 8px' } }, groupAv(112)),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' } }, h(Btn, { danger: true, onClick: () => { app.modal(null); saveFirmPhoto(app, '', 'Group photo removed', 'groupPhoto'); } }, 'Remove'), h(Btn, { primary: true, onClick: () => { app.modal(null); editPhoto(app, { group: true }); } }, 'Change photo')))); };
    const badge = n => n ? h('span', { style: { marginLeft: 'auto', minWidth: 20, height: 20, borderRadius: 10, background: '#137333', color: '#fff', fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' } }, n > 99 ? '99+' : n) : null;
    const preview = m => m.kind === 'file' ? '📎 ' + ((m.data || {}).name || 'File') : m.kind === 'meeting' ? '📅 ' + ((m.data || {}).title || 'Meeting') : m.body;
    const last = ch => { const l = msgs[ch]; return l && l.length ? l[l.length - 1] : null; };
    const row = (ch, title, sub, av) => h('button', { key: ch, onClick: () => open(ch), style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 0, borderBottom: '1px solid #F0F0EF', background: sel === ch && !narrow ? K.soft : 'transparent', textAlign: 'left', cursor: 'pointer', font: 'inherit' } },
      av, h('span', { style: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 } }, h('span', { style: { fontSize: 14, fontWeight: unread[ch] ? 700 : 600, color: K.ink } }, title),
        h('span', { style: { fontSize: 12.5, color: K.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (last(ch) ? (last(ch).sender === me ? 'You: ' : '') + preview(last(ch)) : sub))), badge(unread[ch]));
    const list = h('div', { style: { borderRight: narrow ? 0 : '1px solid ' + K.line, overflowY: 'auto', display: narrow && mob === 'chat' ? 'none' : 'block', minHeight: 0 } },
      h('div', { style: { padding: '12px 14px 6px', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: K.mut, fontWeight: 600 } }, 'Group'),
      row('team', d.firm.name || 'Team', `Everyone at the firm · ${people.length + 1} member${people.length ? 's' : ''}`, groupAv()),
      h('div', { style: { padding: '14px 14px 6px', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: K.mut, fontWeight: 600 } }, 'Direct messages'),
      people.length ? people.map(u => row(chOf(u), u.title || u.name, u.role, userAv(u))) :
        h('div', { style: { padding: '8px 14px 16px', fontSize: 13, color: K.mut, lineHeight: 1.5 } }, 'Team members appear here once they join. ', h('button', { onClick: () => app.go('team'), style: { border: 0, background: 'none', padding: 0, color: K.ink, textDecoration: 'underline', cursor: 'pointer', font: 'inherit' } }, 'Invite your team')));
    const other = sel === 'team' ? null : people.find(u => chOf(u) === sel);
    const head = h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid ' + K.line } },
      narrow && h('button', { onClick: () => setMob('list'), 'aria-label': 'Back to chats', style: { border: 0, background: 'none', fontSize: 20, cursor: 'pointer', padding: '0 6px 0 0' } }, '‹'),
      sel === 'team' ? h('button', { type: 'button', onClick: groupPhoto, title: d.isOwner ? 'Change group photo' : 'Group photo', 'aria-label': 'Group photo', className: 'ls-avatar-btn', style: { border: 0, padding: 0, background: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex' } }, groupAv(34)) : userAv(other, 34),
      h('div', { style: { display: 'flex', flexDirection: 'column' } }, h('span', { style: { fontWeight: 600, fontSize: 15 } }, sel === 'team' ? (d.firm.name || 'Team') : other ? (other.title || other.name) : 'Chat'),
        h('span', { style: { fontSize: 12.5, color: K.mut } }, sel === 'team' ? 'Group chat · everyone at the firm can read it' : other ? other.role + ' · only the two of you can read this' : '')));
    const items = msgs[sel], dayLabel = iso => { const t = L.today(), dd = L.iso(new Date(iso)); return dd === t ? 'Today' : dd === L.addDays(t, -1) ? 'Yesterday' : L.fmt(dd); };
    const time = iso => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    const body = h('div', { ref: scroller, className: 'ls-chatbg-pan', onClick: e => { if (e.target === e.currentTarget) setPick(null); }, style: { flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 52px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, backgroundColor: 'rgba(244,242,236,.82)', backgroundImage: CHAT_BG + ', radial-gradient(circle at 20% 10%, rgba(255,255,255,.7), transparent 60%)', backgroundSize: '260px 230px, 100% 100%', minHeight: 0 } },
      !items ? h('div', { style: { margin: 'auto', color: K.mut, fontSize: 13 } }, 'Loading messages…')
      : !items.length ? h('div', { style: { margin: 'auto', textAlign: 'center', color: K.mut, fontSize: 13.5, maxWidth: 300, lineHeight: 1.6 } }, sel === 'team' ? 'No messages yet. Say hello to your team.' : `No messages yet. Send ${other ? other.name : 'them'} a message.`)
      : items.map((m, i) => { const mine = m.sender === me, prev = items[i - 1], newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at), sameRun = prev && !newDay && prev.sender === m.sender && Date.parse(m.created_at) - Date.parse(prev.created_at) < 5 * 60e3, u = who(m.sender);
          return h(React.Fragment, { key: m.id },
            newDay && h('div', { style: { alignSelf: 'center', fontSize: 11.5, color: K.mut, background: '#fff', border: '1px solid ' + K.line, borderRadius: 999, padding: '2px 10px', margin: '10px 0 6px' } }, dayLabel(m.created_at)),
            h('div', { className: 'ls-msg', style: { display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginTop: sameRun ? 0 : 6, position: 'relative' } },
              h('button', { className: 'ls-react', onClick: () => setPick(pick === m.id ? null : m.id), 'aria-label': 'React to this message', title: 'React', style: { position: 'absolute', top: '50%', [mine ? 'left' : 'right']: -2, transform: 'translate(' + (mine ? '-100%' : '100%') + ',-50%)', width: 30, height: 30, borderRadius: 15, border: '1px solid ' + K.line, background: '#fff', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '☺'),
              !mine && sel === 'team' && !sameRun && h('span', { style: { fontSize: 12, fontWeight: 600, color: K.txt, margin: '0 0 2px 4px' } }, u ? (u.title || u.name) : 'Former member'),
              h('div', { className: fresh.current.has(m.id) ? (mine ? 'ls-in-me' : 'ls-in-them') : undefined, title: new Date(m.created_at).toLocaleString('en-IN'), style: { maxWidth: 'min(560px, 80%)', padding: '8px 12px', borderRadius: 14, borderTopRightRadius: mine && !sameRun ? 4 : 14, borderTopLeftRadius: !mine && !sameRun ? 4 : 14, background: mine ? K.ink : '#fff', color: mine ? '#fff' : K.ink, border: mine ? 0 : '1px solid ' + K.line, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' } },
                m.kind === 'file' ? h(FileMsg, { m, mine }) : m.kind === 'meeting' ? h(MeetMsg, { m, mine }) : m.body, h('span', { style: { display: 'block', fontSize: 10.5, opacity: .6, textAlign: 'right', marginTop: 2 } }, time(m.created_at))),
              (() => { const rs = (reacts[sel] || []).filter(x => x.message_id === m.id); if (!rs.length) return null; const by = {}; rs.forEach(x => (by[x.emoji] = by[x.emoji] || []).push(x.user_id));
                return h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: -6, padding: '0 6px', position: 'relative', zIndex: 1 } }, Object.keys(by).map(e => { const meIn = by[e].includes(me);
                  return h('button', { key: e, className: 'ls-pill', onClick: () => react(m, e), title: by[e].map(id => id === me ? 'You' : (who(id) || {}).name || 'Member').join(', '), style: { height: 24, padding: '0 7px', borderRadius: 12, border: '1px solid ' + (meIn ? '#1A73E8' : K.line), background: meIn ? '#E8F0FE' : '#fff', fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 2px rgba(0,0,0,.06)' } }, e, by[e].length > 1 && h('span', { style: { fontSize: 11.5, fontWeight: 600, color: K.txt } }, by[e].length)); })); })(),
              pick === m.id && h('div', { className: 'ls-picker', style: { display: 'flex', gap: 2, background: '#fff', border: '1px solid ' + K.line, borderRadius: 20, padding: '3px 6px', boxShadow: '0 6px 20px rgba(0,0,0,.12)', marginTop: 4 } },
                EMOJIS.map(e => h('button', { key: e, onClick: () => react(m, e), 'aria-label': 'React ' + e, style: { border: 0, background: 'none', fontSize: 19, cursor: 'pointer', padding: '2px 4px', borderRadius: 8 } }, e)))));
        }));
    const tool = (label, d, onClick, disabled) => h('button', { onClick, disabled, 'aria-label': label, title: label, style: { width: 38, height: 38, flexShrink: 0, borderRadius: 10, border: '1px solid ' + K.line, background: '#fff', cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: K.txt, opacity: disabled ? .5 : 1 } },
      h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d })));
    const composer = h('div', { style: { borderTop: '1px solid ' + K.line, padding: 12, display: 'flex', gap: 8, alignItems: 'flex-end', background: '#fff' } },
      h('input', { ref: fileIn, type: 'file', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*', onChange: attach, style: { display: 'none' } }),
      tool(up ? 'Uploading…' : 'Send a PDF or file', 'M20.5 11.5l-8.3 8.3a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9', () => fileIn.current && fileIn.current.click(), up),
      tool('Schedule a Google Meet', 'M3 7.5A1.5 1.5 0 0 1 4.5 6h9A1.5 1.5 0 0 1 15 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 16.5z M15 10.5l6-3.5v10l-6-3.5', meet),
      h('textarea', { ref: box, value: text, rows: 1, placeholder: sel === 'team' ? 'Message the team' : 'Message ' + (other ? other.name : ''), 'aria-label': 'Message',
        onChange: e => { setText(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; },
        onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } },
        style: { flex: 1, resize: 'none', border: '1px solid ' + K.line, borderRadius: 10, padding: '9px 12px', font: 'inherit', fontSize: 14, lineHeight: 1.45, maxHeight: 140, outline: 'none' } }),
      h('button', { className: 'ls-btn ls-send' + (fly ? ' fly' : ''), onClick: send, disabled: busy || up || !text.trim(), 'aria-label': 'Send', style: { height: 38, padding: '0 16px', borderRadius: 10, border: 0, background: K.ink, color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', opacity: busy || up || !text.trim() ? .45 : 1, flexShrink: 0 } },
        up ? 'Uploading…' : 'Send', h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: 'M22 2 11 13 M22 2l-7 20-4-9-9-4z' }))));
    const convo = h('div', { style: { display: narrow && mob === 'list' ? 'none' : 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 } }, head, h('div', { className: 'ls-chatbg', style: { flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }, body), err && h('div', { style: { padding: '6px 16px', fontSize: 12.5, color: K.red } }, err), composer);
    return h(Page, { art: 'team', kicker: 'Firm', title: 'Team chat', sub: 'Talk to your whole team or to one colleague. Messages are private to your firm.' },
      h('div', { style: { background: '#fff', border: '1px solid ' + K.line, borderRadius: 12, overflow: 'hidden', display: 'grid', gridTemplateColumns: narrow ? '1fr' : '300px 1fr', height: 'calc(100vh - 230px)', minHeight: 420 } }, list, convo));
  }

  /* ---- billing: GST invoices for plan payments (server function 'billing') ---- */
  const rupees = paise => L.inr(paise / 100), istDay = ts => new Date(Date.parse(ts) + 5.5 * 3600e3).toISOString().slice(0, 10);
  async function downloadInvoice(id) {
    const r = await LSB.billing.pdf(id), bin = atob(r.pdf), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' })), a = document.createElement('a');
    a.href = url; a.download = r.filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  /* Payment in flight: gold ₹ coins racing from the phone to the bank while we wait for the bank's confirmation. */
  function coinCss() {
    if (document.getElementById('ls-coin-css')) return;
    const st = document.createElement('style'); st.id = 'ls-coin-css';
    st.textContent = `
      .ls-coinflow{position:relative;width:280px;max-width:100%;height:64px;margin:2px auto 0}
      .ls-coinflow .lane{position:absolute;left:52px;right:52px;top:31px;height:2px;border-radius:2px;background:linear-gradient(90deg,#E5E5E5 0%,#E5E5E5 40%,#F4C542 50%,#E5E5E5 60%,#E5E5E5 100%);background-size:200% 100%;animation:lsLane 1.1s linear infinite}
      .ls-coinflow .end{position:absolute;top:10px;width:44px;height:44px;border-radius:12px;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.18)}
      .ls-coinflow .end.l{left:0}.ls-coinflow .end.r{right:0;animation:lsBank 1.1s ease-in-out infinite}
      .ls-coinflow .coin{position:absolute;left:46px;top:20px;width:22px;height:22px;border-radius:50%;font:700 12px/22px system-ui,sans-serif;text-align:center;color:#7A5200;
        background:radial-gradient(circle at 32% 30%,#FFF6C8 0%,#FFD95A 35%,#E9A800 75%,#B97F00 100%);box-shadow:0 0 0 1.5px #C88E00 inset,0 3px 8px rgba(201,142,0,.45);
        animation:lsCoin 1.1s cubic-bezier(.55,.05,.35,1) infinite;opacity:0}
      .ls-coinflow .coin:nth-child(4){animation-delay:.37s}.ls-coinflow .coin:nth-child(5){animation-delay:.74s}
      @keyframes lsCoin{0%{transform:translateX(0) translateY(6px) scale(.5) rotateY(0);opacity:0}15%{opacity:1}50%{transform:translateX(83px) translateY(-10px) scale(1.08) rotateY(360deg)}85%{opacity:1}100%{transform:translateX(166px) translateY(4px) scale(.55) rotateY(720deg);opacity:0}}
      @keyframes lsLane{0%{background-position:100% 0}100%{background-position:-100% 0}}
      @keyframes lsBank{0%,70%,100%{transform:scale(1)}85%{transform:scale(1.08)}}
      @keyframes lsPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
      .ls-pop{animation:lsPop .5s cubic-bezier(.2,.9,.3,1.3) both}
      @media (prefers-reduced-motion:reduce){.ls-coinflow .coin,.ls-coinflow .lane,.ls-coinflow .end.r,.ls-pop{animation:none}.ls-coinflow .coin:nth-child(3){opacity:1;left:calc(50% - 11px)}}`;
    document.head.appendChild(st);
  }
  const svgIcon = d => h('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d }));
  function CoinFlow({ label }) {
    coinCss();
    return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }, role: 'status', 'aria-live': 'polite' },
      h('div', { className: 'ls-coinflow' },
        h('div', { className: 'end l', title: 'Your UPI app' }, svgIcon('M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5z M11 18.5h2')),
        h('div', { className: 'lane' }),
        h('span', { className: 'coin' }, '₹'), h('span', { className: 'coin' }, '₹'), h('span', { className: 'coin' }, '₹'),
        h('div', { className: 'end r', title: 'Legal Staff' }, svgIcon('M3 9.5 12 4l9 5.5 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 20.5h18'))),
      h('div', { style: { fontSize: 13.5, fontWeight: 600, color: K.ink } }, label));
  }
  /* On the "Payment received" screen: the invoice for this order, once the server has issued it. */
  function PaidInvoice({ orderNo }) {
    const [inv, setInv] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
    React.useEffect(() => { let dead = false, n = 0;
      const look = () => LSB.billing.list().then(x => { const i = (x.invoices || []).find(v => v.order_no === orderNo); if (dead) return; if (i) setInv(i); else if (++n < 6) setTimeout(look, 3000); }).catch(() => { if (!dead && ++n < 6) setTimeout(look, 3000); });
      look(); return () => { dead = true; }; }, []);
    if (!inv) return h('div', { style: { fontSize: 12.5, color: K.mut } }, 'Preparing your invoice…');
    return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 16px', border: '1px solid ' + K.line, borderRadius: 10, background: '#FAFAF9', width: '100%', boxSizing: 'border-box' } },
      h('div', { style: { fontSize: 13.5, fontWeight: 600 } }, 'Invoice ' + inv.invoice_no),
      h('div', { style: { fontSize: 12.5, color: K.mut } }, inv.emailed_to ? 'A copy has been emailed to ' + inv.emailed_to + '.' : 'A copy is being emailed to you.'),
      h(Btn, { small: true, disabled: busy, onClick: () => { setBusy(true); setErr(''); downloadInvoice(inv.id).catch(e => setErr(e.message)).finally(() => setBusy(false)); } }, busy ? 'Preparing PDF…' : 'Download invoice (PDF)'),
      err && h('div', { style: { fontSize: 12, color: K.red } }, err));
  }
  /* Pricing page, top: the current plan, its dates, the last payment and every invoice. */
  function SubPanel({ app }) {
    const d = app.db, acc = L.access(d.sub), [bill, setBill] = useState(null), [busy, setBusy] = useState(''), [msg, setMsg] = useState(null);
    React.useEffect(() => { let dead = false; LSB.billing.list().then(x => !dead && setBill(x)).catch(e => !dead && setBill({ invoices: [], err: e.message })); return () => { dead = true; }; }, [app.state.rev0, d.sub.renews, d.sub.plan]);
    if (acc.state !== 'active' && !(bill && bill.invoices.length)) return null;
    const invs = (bill && bill.invoices) || [], last = invs[0], today = L.today(), sub = d.sub;
    const starts = sub.since && sub.since > today, left = sub.renews ? Math.max(0, Math.round((Date.parse(sub.renews) - Date.parse(today)) / 864e5) + 1) : 0;
    const status = acc.state !== 'active' ? ['Ended', '#B42318', '#FDECEA'] : starts ? ['Starts ' + L.fmt(sub.since), '#1D4ED8', '#E8EEFD'] : left <= 15 ? ['Ends in ' + left + ' day' + (left === 1 ? '' : 's'), '#B54708', '#FEF3E2'] : ['Active', '#137333', '#E7F6EC'];
    const act = (key, fn, ok) => { setBusy(key); setMsg(null); fn().then(r => ok && setMsg({ ok: true, t: ok(r) })).catch(e => setMsg({ ok: false, t: e.message })).finally(() => setBusy('')); };
    const fact = (k, v, sub2) => h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 } },
      h('div', { style: { fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: K.mut, fontWeight: 600 } }, k),
      h('div', { style: { fontSize: 15, fontWeight: 600, color: K.ink } }, v), sub2 && h('div', { style: { fontSize: 12.5, color: K.mut } }, sub2));
    const cycle = sub.cycle === 'annual' ? 'Annual' : 'Monthly';
    return h('div', { style: { background: '#FFFFFF', border: '1px solid ' + K.line, borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('div', { style: { fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: K.mut, fontWeight: 600 } }, 'Your subscription'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('div', { style: { fontSize: 20, fontWeight: 600, letterSpacing: '-.02em' } }, `${sub.plan} plan · ${cycle}`),
            h('span', { style: { fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: status[1], background: status[2] } }, status[0]))),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          acc.state === 'active' && h(Btn, { small: true, primary: true, onClick: () => app.setState(x => ({ showPlans: !x.showPlans })) }, app.state.showPlans ? 'Hide plans' : 'Upgrade or renew'),
          last && h(React.Fragment, null,
          h(Btn, { small: true, disabled: !!busy, onClick: () => act('dl', () => downloadInvoice(last.id)) }, busy === 'dl' ? 'Preparing PDF…' : 'Download latest invoice'),
          h(Btn, { small: true, disabled: !!busy, onClick: () => act('em', () => LSB.billing.email(last.id), r => 'Invoice ' + last.invoice_no + ' emailed to ' + r.sent_to + '.') }, busy === 'em' ? 'Sending…' : 'Email invoice')))),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 18, padding: '16px 0', borderTop: '1px solid ' + K.line, borderBottom: '1px solid ' + K.line } },
        fact(starts ? 'Starts on' : 'Started on', sub.since ? L.fmt(sub.since) : '—', starts ? 'After your free trial ends' : null),
        fact(acc.state === 'active' ? 'Valid until' : 'Ended on', sub.renews ? L.fmt(sub.renews) : '—', acc.state === 'active' ? (starts ? `${cycle} plan period` : `${left} day${left === 1 ? '' : 's'} left`) : null),
        fact('Last payment', last ? rupees(last.total) : '—', last ? L.fmt(istDay(last.issued_at)) + ' · ' + (last.method || 'UPI') + (last.promo ? ' · code ' + last.promo : '') : null),
        fact('Payment reference', last && last.utr ? last.utr : '—', last ? 'Order ' + (last.order_no || '—') : null)),
      msg && h('div', { style: { fontSize: 13, color: msg.ok ? '#137333' : K.red } }, msg.t),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        h('div', { style: { fontSize: 13, fontWeight: 600 } }, 'Invoices'),
        !bill ? h('div', { style: { fontSize: 13, color: K.mut } }, 'Loading invoices…')
          : bill.err ? h('div', { style: { fontSize: 13, color: K.red } }, 'Could not load invoices: ' + bill.err)
          : !invs.length ? h('div', { style: { fontSize: 13, color: K.mut } }, 'No invoices yet.')
          : h('div', { style: { display: 'flex', flexDirection: 'column' } }, invs.map(i => h('div', { key: i.id, style: { display: 'grid', gridTemplateColumns: 'minmax(130px,1fr) minmax(90px,.8fr) minmax(150px,1.4fr) minmax(80px,.7fr) auto', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid ' + K.line, fontSize: 13.5 } },
              h('span', { style: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }, i.invoice_no),
              h('span', { style: { color: K.mut } }, L.fmt(istDay(i.issued_at))),
              h('span', null, `${i.plan} · ${i.cycle === 'annual' ? 'Annual' : 'Monthly'}`, i.period && h('span', { style: { color: K.mut } }, ' · ' + L.fmt(i.period.from) + ' – ' + L.fmt(i.period.to))),
              h('span', { style: { fontVariantNumeric: 'tabular-nums', fontWeight: 600 } }, rupees(i.total)),
              h('span', { style: { display: 'flex', gap: 6 } },
                h(Btn, { small: true, disabled: !!busy, onClick: () => act('dl' + i.id, () => downloadInvoice(i.id)) }, busy === 'dl' + i.id ? '…' : 'PDF'),
                h(Btn, { small: true, disabled: !!busy, onClick: () => act('em' + i.id, () => LSB.billing.email(i.id), r => 'Invoice ' + i.invoice_no + ' emailed to ' + r.sent_to + '.') }, busy === 'em' + i.id ? '…' : 'Email')))))),
      h('div', { style: { fontSize: 12.5, color: K.mut, lineHeight: 1.6 } }, 'Plans are paid by UPI in advance, with no automatic charges and no GST added. Use Upgrade or renew any time; a new payment starts after your current period ends.'));
  }

  function upiPay(app, o) {
    const Body = () => {
      const [st, setSt] = useState({ phase: 'creating' }), [qr, setQr] = useState(''), [left, setLeft] = useState(0);
      React.useEffect(() => {
        let dead = false, poll = null, tick = null;
        LSB.upi.create(o.plan, o.cycle, o.gstin, o.promo, o.users).then(r => {
          if (dead) return;
          if (r.free) { setSt({ phase: 'paid', r, x: { confirmed_by: 'promo' } }); LSB.refreshSub(app.db).then(() => app.setState(s => ({ rev: s.rev + 1 }))).catch(() => {}); return; }
          setSt({ phase: 'waiting', r });
          loadQr().then(() => { const q = window.qrcode(0, 'M'); q.addData(r.link); q.make(); if (!dead) setQr(q.createSvgTag({ cellSize: 5, margin: 2, scalable: true })); }).catch(() => {});
          const end = Date.parse(r.expires_at);
          setLeft(Math.max(0, Math.round((end - Date.now()) / 1000)));
          tick = setInterval(() => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000))), 1000);
          const check = () => LSB.upi.status(r.order_no).then(x => {
            if (dead) return;
            if (x.status === 'paid') { clearInterval(poll); clearInterval(tick); setSt({ phase: 'paid', r, x }); LSB.refreshSub(app.db).then(() => app.setState(s => ({ rev: s.rev + 1 }))).catch(() => {}); }
            else if (Date.now() > end) { clearInterval(poll); clearInterval(tick); setSt({ phase: 'expired', r }); }
          }).catch(() => {});
          poll = setInterval(check, 4000);
        }).catch(e => !dead && setSt({ phase: 'error', msg: e.message }));
        return () => { dead = true; clearInterval(poll); clearInterval(tick); };
      }, []);
      const r = st.r, amt = r ? L.inr(r.amount / 100) : '', mm = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
      if (st.phase === 'creating') return h('div', { style: { padding: '24px 0' } }, h(CoinFlow, { label: 'Preparing your UPI payment…' }));
      if (st.phase === 'error') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, h('div', { style: { color: K.red, fontSize: 14 } }, st.msg), h(Btn, { onClick: () => app.modal(null) }, 'Close'));
      if (st.phase === 'paid') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center', padding: '10px 0' } },
        h('div', { className: 'ls-pop', style: { width: 58, height: 58, borderRadius: 29, background: '#E7F6EC', color: '#137333', fontSize: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 8px #F3FBF5' } }, '✓'),
        h('div', { style: { fontSize: 18, fontWeight: 600 } }, 'Payment received'),
        h('div', { style: { fontSize: 14, color: K.txt, lineHeight: 1.6 } }, `${amt} for the ${o.name} plan (${o.cycleLabel}). Your plan is active.`),
        st.x.utr && h('div', { style: { fontSize: 12.5, color: K.mut } }, 'UPI reference ' + st.x.utr + ' · order ' + r.order_no),
        h(PaidInvoice, { orderNo: r.order_no }),
        h(Btn, { primary: true, onClick: () => { app.modal(null); app.go('dashboard'); } }, 'Go to dashboard'));
      if (st.phase === 'expired') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { fontSize: 14, color: K.txt, lineHeight: 1.6 } }, `This payment window has closed. If you already paid ${amt}, it is still confirmed automatically within 24 hours and your plan turns on by itself. If you have not paid, start again.`),
        h('div', { style: { fontSize: 12.5, color: K.mut } }, 'Order ' + r.order_no),
        h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, h(Btn, { onClick: () => app.modal(null) }, 'Close')));
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' } },
        h('div', { style: { fontSize: 13, color: K.mut } }, `${o.name} plan · ${o.cycleLabel}`),
        h('div', null, h('div', { style: { fontSize: 12, color: K.mut, textTransform: 'uppercase', letterSpacing: '.06em' } }, 'Pay exactly'), h('div', { style: { fontSize: 30, fontWeight: 700, letterSpacing: '-.02em' } }, amt)),
        h('div', { style: { width: 220, height: 220, border: '1px solid ' + K.line, borderRadius: 12, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }, dangerouslySetInnerHTML: qr ? { __html: qr.replace('<svg ', '<svg width="100%" height="100%" ') } : undefined }, qr ? undefined : h('span', { style: { fontSize: 13, color: K.mut } }, 'Loading QR…')),
        h('div', { style: { fontSize: 13.5, color: K.txt } }, 'Scan with any UPI app: GPay, PhonePe, Paytm, BHIM'),
        h('a', { href: r.link, style: { display: 'inline-block', background: K.ink, color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, textDecoration: 'none' } }, 'Open UPI app (on your phone)'),
        h('div', { style: { fontSize: 12.5, color: K.mut } }, `Paying ${r.payee} · ${r.upi_id}`),
        h(CoinFlow, { label: `Verifying your payment… ${mm}` }),
        h('div', { style: { fontSize: 12, color: K.mut, lineHeight: 1.5 } }, 'Keep this window open. Your plan turns on by itself as soon as the payment arrives. Pay the exact amount shown, including paise, so it is matched to your order ' + r.order_no + '.'));
    };
    app.modal(() => h(Modal, { title: 'Pay by UPI', onClose: () => app.modal(null), width: 420 }, h(Body)));
  }
  /* ---------- AI drafting: writes a first draft as a new version of the open template ---------- */
  const textToHtml = t => String(t).replace(/\*\*/g, '').split(/\n{2,}/).map(p => '<p>' + p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>').join('');
  function aiDraft(app, tplIndex, tplName) {
    const d = app.db; if (needCase(app)) return;
    const Body = () => { const [v, setV] = useState({ caseId: (d.cases[0] || {}).id || '', what: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('');
      const go = () => { if (busy) return; if (!v.what.trim()) return setErr('Say what the draft should cover.'); setBusy(true); setErr('');
        LSB.ai({ mode: 'draft', case_id: v.caseId, template: tplName, question: v.what.trim() }).then(r => {
          app.buf = null; app.mut(db => { (db.drafts[tplIndex] = db.drafts[tplIndex] || []).unshift({ at: L.today() + ' ' + L.nowHM(), by: 'AI', label: 'AI draft', html: textToHtml(r.text) }); logIt(db, `AI drafted a ${tplName} for ${db.user.name}`, v.caseId); db.sub.aiUsed = r.used; }, 'AI draft saved as a new version. Check every fact and fill the [placeholders].');
          app.setState({ tpl: tplIndex, ver: 0 }); app.modal(null);
        }).catch(e => { setErr(e.message); setBusy(false); }); };
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('label', { style: { fontSize: 13, color: K.mut } }, 'Case', h(Select, { value: v.caseId, onChange: x => setV(Object.assign({}, v, { caseId: x })), options: caseOpts(d), style: { width: '100%', marginTop: 6 } })),
        h('label', { style: { fontSize: 13, color: K.mut } }, 'What should it cover?', h('textarea', { value: v.what, rows: 5, onChange: e => setV(Object.assign({}, v, { what: e.target.value })), placeholder: 'e.g. Legal notice to the respondent demanding ₹4,50,000 due under the invoice dated 12.08.2026, payable within 15 days.', style: { display: 'block', width: '100%', marginTop: 6, border: '1px solid ' + K.line, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' } })),
        err && h('div', { style: { fontSize: 13, color: K.red } }, err),
        h('div', { style: { fontSize: 12.5, color: K.mut } }, 'The AI uses this case\'s records and your instructions, and marks anything unknown as a [placeholder]. It is saved as a new version; nothing is sent. Uses 1 AI credit.'),
        h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, h(Btn, { onClick: () => app.modal(null), disabled: busy }, 'Cancel'), h(Btn, { primary: true, onClick: go, disabled: busy }, busy ? 'Drafting… (up to a minute)' : 'Draft with AI'))); };
    app.modal(() => h(Modal, { title: 'Draft a ' + tplName + ' with AI', onClose: () => app.modal(null), width: 560 }, h(Body)));
  }
  /* ---------- plan, free trial and access ---------- */
  const PLAN_ORDER = ['Solo', 'Professional', 'Firm'];
  const MOD_LABEL = { brain: 'AI Case Brain', drafting: 'AI Drafting Studio', portal: 'Client Portal', agents: 'AI Agents', reports: 'Reports and analytics' };
  const n0 = x => x === Infinity ? 'Unlimited' : Number(x).toLocaleString('en-IN');
  const planName = acc => acc.state === 'none' ? 'No plan yet' : acc.state === 'trial' ? acc.plan + ' · free trial' : acc.state === 'expired' ? acc.plan + ' · ' + (acc.wasTrial ? 'trial ended' : 'expired') : acc.plan + ' plan';
  const planSub = acc => acc.state === 'none' ? 'Start a 7-day free trial' : acc.state === 'trial' ? plural(acc.daysLeft, 'day') + ' left' : acc.state === 'expired' ? 'Subscribe to continue' : 'Renews ' + L.fmt(acc.ends);
  const endsOn = acc => String(acc.ends || '').includes('T') ? new Date(acc.ends).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : L.fmt(acc.ends);
  const liveCases = d => d.cases.filter(c => c.status === 'active' || c.status === 'pending').length;
  /* Opens the Subscription screen, with a plan's checkout already open when one is named. */
  const choosePlan = (app, name) => { const i = PLAN_ORDER.indexOf(name); if (i >= 0) app.setState({ plan: i, paid: false, gstin: app.db.firm.gstin || '', gstErr: '' }); app.go('pricing'); };
  const notOwner = app => !!(window.LSB && LSB.on && !app.db.isOwner);
  /* Refuses to go past the plan's user or active-case limit, and says why. */
  function overLimit(app, what) {
    const d = app.db, acc = L.access(d.sub), lim = acc.limits, have = what === 'users' ? d.team.length : liveCases(d), cap = lim[what];
    if (have < cap) return false;
    const next = PLAN_ORDER.find(p => L.PLANS[p][what] > cap);
    if (what === 'users' && acc.plan === 'Professional' && cap < 15) { app.toast(`Your Professional plan has ${n0(cap)} ${cap === 1 ? 'user' : 'users'}. Add users from Pricing (₹249 a month each).`); return true; }
    app.toast(`The ${acc.plan || 'current'} plan allows ${n0(cap)} ${what === 'users' ? (cap === 1 ? 'user' : 'users') : 'active cases'}.` + (next ? ` Upgrade to ${next} for ${n0(L.PLANS[next][what])}.` : ''));
    return true;
  }
  const Meter = ({ label, have, cap }) => { const pct = cap === Infinity ? 0 : Math.min(100, Math.round(have / Math.max(1, cap) * 100)), hot = pct >= 90;
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 } }, h('span', { style: { color: K.mut } }, label), h('span', { style: { fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: hot ? K.red : K.ink } }, n0(have) + ' / ' + n0(cap))),
      h('div', { style: { height: 6, borderRadius: 3, background: '#EDEDED', overflow: 'hidden' } }, h('div', { style: { width: (cap === Infinity ? 4 : pct) + '%', height: '100%', background: hot ? K.red : K.ink, borderRadius: 3 } }))); };
  /* Dashboard: the firm's plan, trial countdown, usage against the plan and what the plan includes. */
  function PlanCard({ app, acc }) {
    const d = app.db; if (!acc.ok) return null;
    const lim = acc.limits, trial = acc.state === 'trial', soon = !trial && acc.daysLeft <= 7, next = PLAN_ORDER[PLAN_ORDER.indexOf(acc.plan) + 1];
    const head = trial
      ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', background: K.ink, color: '#fff', borderRadius: 10, padding: '16px 20px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 } },
            h('div', { style: { textAlign: 'center', flexShrink: 0, minWidth: 52 } }, h('div', { style: { fontFamily: "'Instrument Sans',system-ui,sans-serif", fontSize: 28, fontWeight: 600, lineHeight: 1 } }, acc.daysLeft), h('div', { style: { fontSize: 11, opacity: .75 } }, acc.daysLeft === 1 ? 'day left' : 'days left')),
            h('div', { style: { minWidth: 0 } }, h('div', { style: { fontSize: 15, fontWeight: 600 } }, `Free trial of the ${acc.plan} plan`), h('div', { style: { fontSize: 13, opacity: .8, lineHeight: 1.5 } }, `Ends ${endsOn(acc)}. After that the workspace stops working until you subscribe. Your data is kept.`))),
          notOwner(app) ? h('span', { style: { fontSize: 13, opacity: .8 } }, 'The firm owner can subscribe') : h(Btn, { onClick: () => choosePlan(app, acc.plan), style: { background: '#fff', color: K.ink, border: 0, fontWeight: 600 } }, 'Subscribe now'))
      : h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' } },
          h('div', null, h('div', { style: { fontSize: 15, fontWeight: 600 } }, `${acc.plan} plan · ${d.sub.cycle === 'annual' ? 'Annual' : 'Monthly'}`), h('div', { style: { fontSize: 13, color: soon ? K.red : K.mut } }, soon ? `Ends ${endsOn(acc)} (${plural(acc.daysLeft, 'day')} left). Renew to keep working.` : `Paid until ${endsOn(acc)}`)),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, !notOwner(app) && soon && h(Btn, { small: true, primary: true, onClick: () => choosePlan(app, acc.plan) }, 'Renew'), !notOwner(app) && next && h(Btn, { small: true, onClick: () => choosePlan(app, next) }, 'Upgrade to ' + next)));
    const mods = Object.keys(MOD_LABEL).map(k => { const on = lim.mods.includes(k);
      return h('button', { key: k, type: 'button', onClick: () => app.go(k), title: on ? 'Open' : `Included from the ${L.MOD_PLAN[k]} plan`, style: { display: 'flex', alignItems: 'center', gap: 6, border: '1px solid ' + (on ? K.line : '#EDEDED'), background: on ? '#FFFFFF' : '#FAFAFA', color: on ? K.ink : '#8A8A8A', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, whiteSpace: 'nowrap' } }, h('span', null, on ? '✓' : '🔒'), MOD_LABEL[k], !on && h('span', { style: { fontSize: 11 } }, '· ' + L.MOD_PLAN[k])); });
    return h(Card, { title: 'Your plan', right: h('button', { type: 'button', onClick: () => app.go('pricing'), style: { border: 0, background: 'none', padding: 0, fontSize: 13, color: K.mut, textDecoration: 'underline', textUnderlineOffset: 2 } }, 'Compare plans') },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } }, head,
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 18 } },
          h(Meter, { label: 'Users', have: d.team.length, cap: lim.users }), h(Meter, { label: 'Active cases', have: liveCases(d), cap: lim.cases }),
          window.LSB && LSB.on ? h(Meter, { label: 'AI credits this month', have: d.sub.aiUsed || 0, cap: lim.ai }) : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 } }, h('span', { style: { color: K.mut } }, 'Storage and AI'), h('span', { style: { fontWeight: 600 } }, `${lim.storage} GB · ${n0(lim.ai)} AI credits / month`))),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, mods)));
  }
  /* Shown instead of every screen (except Subscription and Settings) when there is no plan, or the trial or plan has ended. */
  function PlanLock({ app, acc }) {
    const owner = !notOwner(app), name = acc.plan;
    const [kicker, title, text] = acc.state === 'none'
      ? ['Welcome', 'Start your 7-day free trial', 'Choose any plan to try Legal Staff free for 7 days. No payment is needed to start. When the trial ends, subscribe to keep working.']
      : acc.wasTrial
        ? ['Free trial ended', 'Your free trial has ended', `Your 7-day trial of the ${name} plan ended on ${endsOn(acc)}. Your cases, documents and settings are kept safely. Subscribe to continue where you left off.`]
        : ['Plan expired', `Your ${name} plan has expired`, `The paid period ended on ${endsOn(acc)}. Your data is kept safely. Renew to continue where you left off.`];
    return h(Page, { kicker, title, max: 760 }, h(Card, null,
      h(Empty, { title, text: owner ? text : text + ' Only the firm owner can choose or pay for a plan, so please ask them.', art: 'setup' }),
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 12 } },
        owner && acc.state !== 'none' && h(Btn, { key: 1, primary: true, onClick: () => choosePlan(app, name) }, (acc.wasTrial ? 'Subscribe to ' : 'Renew ') + name),
        h(Btn, { key: 2, primary: owner && acc.state === 'none', onClick: () => app.go('pricing') }, acc.state === 'none' ? 'Choose a plan' : 'Compare plans'),
        acc.state !== 'none' && h(Btn, { key: 3, onClick: () => app.go('settings') }, 'Export a backup')),
      acc.state !== 'none' && h('div', { style: { fontSize: 12.5, color: K.mut, textAlign: 'center', paddingBottom: 6 } }, 'Until a plan is active the workspace is read-only and closed. Settings stays open so you can export a backup.')));
  }
  /* Shown when a screen belongs to a higher plan than the firm's. */
  function PlanUpgrade({ app, acc, mod }) {
    const need = L.MOD_PLAN[mod], lim = L.PLANS[need];
    return h(Page, { kicker: 'Upgrade', title: MOD_LABEL[mod], max: 760 }, h(Card, null,
      h(Empty, { title: `${MOD_LABEL[mod]} is part of the ${need} plan`, text: `You are on the ${acc.plan} plan${acc.state === 'trial' ? ' (free trial)' : ''}. ${need} adds ${lim.mods.filter(k => !acc.limits.mods.includes(k)).map(k => MOD_LABEL[k]).join(', ')}, up to ${n0(lim.users)} users and ${n0(lim.cases).toLowerCase()} active cases.` }),
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 12 } },
        notOwner(app) ? h('span', { style: { fontSize: 13, color: K.mut } }, 'Ask the firm owner to upgrade the plan.') : h(Btn, { primary: true, onClick: () => choosePlan(app, need) }, acc.state === 'trial' ? `Switch the trial to ${need}` : `Upgrade to ${need}`),
        h(Btn, { onClick: () => app.go('dashboard') }, 'Back to dashboard'))));
  }
  const gate = () => ({});
  /* ---------- labels ---------- */
  const LABEL_COLORS = [['Orange', '#EA6A2E'], ['Blue', '#1F5FA8'], ['Purple', '#8E3FB0'], ['Teal', '#0E8A86'], ['Green', '#3F9A4B'], ['Amber', '#D98A12'], ['Red', '#C23B32'], ['Slate', '#4B5563']];
  const labelsOf = (d, c) => (c.labels || []).map(id => (d.labels || []).find(l => l.id === id)).filter(Boolean);
  const LabelChip = ({ l, small }) => h('span', { title: l.name, style: { background: l.color, color: '#fff', fontSize: small ? 11 : 12, fontWeight: 600, borderRadius: 999, padding: small ? '1px 8px' : '2px 10px', whiteSpace: 'nowrap', display: 'inline-block', lineHeight: 1.5 } }, l.code);
  const labelChips = (d, c, small) => { const ls = labelsOf(d, c); return ls.length ? h('span', { style: { display: 'inline-flex', gap: 5, flexWrap: 'wrap' } }, ls.map(l => h(LabelChip, { key: l.id, l, small }))) : null; };
  function labelForm(app, editId) {
    const d = app.db, l0 = editId && (d.labels || []).find(l => l.id === editId);
    if (!allowed(app, 'label.edit')) return;
    app.modal(() => h(Modal, { title: l0 ? 'Edit label' : 'Add label', sub: 'A short code shows on the case, for example a bank, a client group or “PC” for private cases.', onClose: () => app.modal(null), width: 480 },
      h(Form, { init: l0 ? { code: l0.code, name: l0.name, color: l0.color } : { color: LABEL_COLORS[(d.labels || []).length % LABEL_COLORS.length][1] }, submit: l0 ? 'Save changes' : 'Add label', onCancel: () => app.modal(null),
        fields: [{ k: 'code', label: 'Code', req: true, ph: 'SBI', half: true, check: v => v.length > 8 ? 'Keep it to 8 characters' : ((d.labels || []).some(l => l.code.toLowerCase() === v.toLowerCase() && l.id !== editId) ? 'A label with this code already exists' : '') },
          { k: 'color', label: 'Colour', type: 'select', options: LABEL_COLORS.map(c => [c[1], c[0]]), half: true }, { k: 'name', label: 'Full name', ph: 'State Bank of India' }],
        onSubmit: v => { const code = v.code.trim().toUpperCase(), name = (v.name || '').trim() || code;
          if (l0) app.mut(db => { const l = db.labels.find(x => x.id === editId); if (l) Object.assign(l, { code, name, color: v.color }); }, 'Label updated');
          else app.mut(db => { db.labels.push({ id: L.uid('lb'), code, name, color: v.color }); }, 'Label added');
          app.modal(null); } })));
  }
  function delLabel(app, id) {
    const d = app.db, l = (d.labels || []).find(x => x.id === id); if (!l || !allowed(app, 'label.delete')) return;
    const n = d.cases.filter(c => (c.labels || []).includes(id)).length;
    confirmBox(app, 'Delete this label?', `“${l.code}” is removed` + (n ? ` from ${plural(n, 'case')}. The cases themselves are not changed.` : '.'), 'Delete label', () => app.mut(db => { db.labels = db.labels.filter(x => x.id !== id); db.cases.forEach(c => { if ((c.labels || []).includes(id)) c.labels = c.labels.filter(x => x !== id); }); }, 'Label deleted'));
  }
  function Labels({ app }) {
    const d = app.db, [q, setQ] = useState(''), s = q.trim().toLowerCase(), all = d.labels || [], rows = all.filter(l => !s || (l.code + ' ' + l.name).toLowerCase().includes(s)), count = l => d.cases.filter(c => (c.labels || []).includes(l.id)).length;
    return h(Page, { art: 'cases', kicker: 'Practice', title: 'Labels', sub: `${plural(all.length, 'label')} · tag cases by bank, client group or any grouping you use, then filter the list and the causelist by it`,
      actions: [h(Btn, Object.assign({ key: 1, primary: true, onClick: () => labelForm(app) }, gate(app, 'label.edit')), '+ Add label'), h(Btn, { key: 2, disabled: !all.length, onClick: () => L.csv('labels.csv', [['Code', 'Name', 'Colour', 'Cases'], ...all.map(l => [l.code, l.name, l.color, count(l)])]) }, 'Export CSV')] },
      h(Search, { value: q, onChange: setQ, placeholder: 'Start typing to search…', width: 300 }),
      h(Table, { min: 640, empty: all.length ? 'No label matches your search.' : 'No labels yet. Add one, then tag cases from Edit case.', rows, cols: [
        { label: 'Label', w: '110px', get: l => h(LabelChip, { l }) }, { label: 'Code', w: '110px', get: l => h('b', null, l.code) }, { label: 'Name', w: 'minmax(200px,2fr)', get: l => l.name },
        { label: 'Cases', w: '90px', get: l => count(l) },
        { label: '', w: 'minmax(210px,1.2fr)', get: l => acts(h(Btn, { small: true, disabled: !count(l), onClick: () => { app.setState({ caseQ: l.code, caseFilter: 'all' }); app.go('cases'); } }, 'View cases'), h(IconBtn, Object.assign({ label: 'Edit label ' + l.code, onClick: () => labelForm(app, l.id) }, gate(app, 'label.edit')), '✎'), h(IconBtn, Object.assign({ label: 'Delete label ' + l.code, danger: true, onClick: () => delLabel(app, l.id) }, gate(app, 'label.delete')), '×')) }] }));
  }

  /* ---------- daily causelist ---------- */
  const weekOf = s => { const d = L.addDays(s, -new Date(s + 'T00:00:00').getDay()); return Array.from({ length: 7 }, (_, i) => L.addDays(d, i)); };
  const itemNo = x => { const m = /\d+/.exec(x.item || ''); return m ? +m[0] : 1e9; };
  function pastListing(d, x) { const p = d.hearings.filter(y => y.caseId === x.caseId && y.date < x.date).sort((a, b) => b.date.localeCompare(a.date))[0]; return p ? p.date : ''; }
  function Causelist({ app }) {
    const d = app.db, T = L.today(), [date, setDate] = useState(T), [tab, setTab] = useState('cases'), [q, setQ] = useState(''), [sort, setSort] = useState('default'), [lab, setLab] = useState(''), [flt, setFlt] = useState(false);
    const caseOfH = x => d.cases.find(c => c.id === x.caseId) || { title: '—', no: '', labels: [] }, s = q.trim().toLowerCase();
    const day = d.hearings.filter(x => x.date === date), isApp = x => !!caseOfH(x).isApp;
    const nCases = day.filter(x => !isApp(x)).length, nApps = day.length - nCases;
    const text = x => { const c = caseOfH(x); return [c.title, c.full, c.no, c.cnr, c.fileNo, x.court, x.bench, c.bench, x.item, x.assignee, c.oppAdv, labelsOf(d, c).map(l => l.code + ' ' + l.name).join(' ')].join(' ').toLowerCase(); };
    const list = day.filter(x => (tab === 'apps') === isApp(x) && (!lab || (caseOfH(x).labels || []).includes(lab)) && (!s || text(x).includes(s)));
    const cmp = { default: (a, b) => itemNo(a) - itemNo(b) || a.time.localeCompare(b.time), time: (a, b) => a.time.localeCompare(b.time) || itemNo(a) - itemNo(b), title: (a, b) => caseOfH(a).title.localeCompare(caseOfH(b).title) }[sort];
    const groups = {}; list.forEach(x => { const k = x.court || caseOfH(x).court || 'Court not set'; (groups[k] = groups[k] || []).push(x); });
    const names = Object.keys(groups).sort((a, b) => a.localeCompare(b)), week = weekOf(date), hasLab = (d.labels || []).length > 0;
    const pick = s2 => setDate(s2), shift = n => setDate(L.addDays(date, n));
    const KV = (k, v) => h('div', { key: k, style: { fontSize: 13, color: K.mut, lineHeight: 1.7 } }, k + ' : ', h('span', { style: { color: K.ink, fontWeight: 500 } }, v || '--'));
    const exportCsv = () => L.csv('causelist-' + date + '.csv', [['Court', 'Bench', 'Item', 'Time', 'Case number', 'CNR', 'Case', 'File number', 'List no.', 'Labels', 'Appearing', 'Opposite advocate'], ...names.flatMap(n => groups[n].slice().sort(cmp).map(x => { const c = caseOfH(x); return [n, x.bench || c.bench || '', x.item || '', L.t12ap(x.time), c.no, c.cnr || '', c.title, c.fileNo || '', x.listNo || '', labelsOf(d, c).map(l => l.code).join(' '), x.assignee || '', c.oppAdv || '']; }))]);
    const dayBtn = s2 => { const on = s2 === date, dt = new Date(s2 + 'T00:00:00'); return h('button', { key: s2, type: 'button', 'aria-pressed': on, 'aria-label': L.longDate(s2), onClick: () => pick(s2), className: 'ls-btn', style: { flex: '1 1 0', minWidth: 62, border: 0, borderRadius: 8, padding: '10px 4px', background: on ? '#1D5FD0' : 'transparent', color: on ? '#fff' : K.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 } },
      h('span', { style: { fontSize: 15, fontWeight: 600 } }, dt.getDate() + ' ' + dt.toLocaleDateString('en-IN', { month: 'short' })), h('span', { style: { fontSize: 11, letterSpacing: '.05em', opacity: on ? .9 : .6 } }, dt.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase() + (s2 === T ? ' · TODAY' : ''))); };
    const tabBtn = (k, label, n) => h('button', { key: k, type: 'button', 'aria-pressed': tab === k, onClick: () => setTab(k), style: { border: 0, padding: '8px 22px', fontSize: 13.5, fontWeight: 500, background: tab === k ? '#1D5FD0' : '#fff', color: tab === k ? '#fff' : K.ink } }, label + ' (' + n + ')');
    return h(Page, { art: 'calendar', kicker: 'Practice', title: 'Daily Causelist', sub: `${L.longDate(date)} · ${plural(day.length, 'matter')} listed · ${plural(names.length, 'court')} shown`,
      actions: [h(Btn, { key: 1, onClick: () => pick(T) }, 'Today'), h('label', { key: 2, style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5 } }, h('span', { style: { color: K.mut } }, 'Go to'), h('input', { type: 'date', value: date, 'aria-label': 'Go to date', onChange: e => L.valid(e.target.value) && pick(e.target.value), style: Object.assign({}, X.input, { width: 'auto', height: 36 }) })), h(Btn, { key: 3, disabled: !list.length, onClick: exportCsv }, 'Export')] },
      h('section', { style: Object.assign({}, X.card, { padding: 8, display: 'flex', alignItems: 'center', gap: 4 }) }, h(IconBtn, { label: 'Previous week', onClick: () => shift(-7) }, '‹'), h('div', { style: { display: 'flex', flex: 1, gap: 2, overflowX: 'auto', minWidth: 0 } }, week.map(dayBtn)), h(IconBtn, { label: 'Next week', onClick: () => shift(7) }, '›')),
      h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' } },
        h(Select, { value: sort, onChange: setSort, options: [['default', 'Sort by: Court, item no.'], ['time', 'Sort by: Time'], ['title', 'Sort by: Case title']], style: { minWidth: 190 } }),
        h('div', { style: { display: 'inline-flex', border: '1px solid ' + K.line, borderRadius: 8, overflow: 'hidden' } }, tabBtn('cases', 'Cases', nCases), tabBtn('apps', 'Applications', nApps)),
        hasLab ? h(Select, { value: lab, onChange: setLab, options: [['', 'All labels'], ...d.labels.map(l => [l.id, l.code + ' · ' + l.name])], style: { minWidth: 170 } }) : h('span')),
      h(Search, { value: q, onChange: setQ, placeholder: 'Search by case no., CNR, party, court no., item no. or bench', width: 320 }),
      !names.length ? h(Card, null, h(Empty, { title: day.length ? 'Nothing matches here' : 'Nothing listed on this day', text: day.length ? 'Try the other tab, clear the search, or choose another label.' : 'Hearings you add to a case on this date appear here, grouped by court.', art: 'calendar' })) :
      names.map(n => { const g = groups[n].slice().sort(cmp), benches = [...new Set(g.map(x => x.bench || caseOfH(x).bench).filter(Boolean))];
        return h('section', { key: n, style: Object.assign({}, X.card, { overflow: 'hidden' }) },
          h('div', { style: { background: K.soft, borderBottom: '1px solid ' + K.line, padding: '14px 22px', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', fontSize: 13, fontWeight: 600, letterSpacing: '.01em', textTransform: 'uppercase' } }, h('span', null, n), benches.length > 0 && h('span', { style: { color: K.mut } }, '|'), benches.length > 0 && h('span', null, 'Bench - ' + benches.join(', ')), h('span', { style: { color: K.mut, fontWeight: 500 } }, '| ' + plural(g.length, 'matter'))),
          g.map(x => { const c = caseOfH(x), past = pastListing(d, x), bench = x.bench || c.bench || '';
            return h('div', { key: x.id, style: { padding: '16px 22px', borderTop: '1px solid ' + K.line } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' } },
                h('div', { style: { minWidth: 0 } }, h('div', { style: { fontSize: 12.5, color: K.mut } }, [c.no, c.cnr && 'CNR: ' + c.cnr].filter(Boolean).join('  ·  ')), h('div', { style: { fontSize: 15.5, fontWeight: 600, marginTop: 2, overflowWrap: 'anywhere' } }, c.title), c.id && labelsOf(d, c).length > 0 && h('div', { style: { marginTop: 6 } }, labelChips(d, c, true))),
                h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }, outcomeChip(x), hearingActs(app, x), c.id && h(Btn, { small: true, onClick: () => app.go('case', c.id) }, 'Open case'))),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap: '0 24px', marginTop: 10 } },
                h('div', null, KV('Item', x.item && x.item.replace(/^item\s*/i, '')), KV('Time', L.t12ap(x.time)), KV('Past listing date', past && L.fmt(past)), KV('Purpose', x.purpose)),
                h('div', null, KV('File number', c.fileNo), KV('List num', x.listNo), KV('Meeting link', ''), KV('Stage', c.stage)),
                h('div', null, KV('Appearing', x.assignee), KV('Opposite advocate', c.oppAdv || 'Unknown'), KV('Court number and judge', [n, bench].filter(Boolean).join(' · ')))));
          })); }));
  }

  /* ---------- orders by date / by notification, display board ---------- */
  const orderRow = (app, o) => { const c = caseOf(app.db, o.caseId); return h('div', { key: o.id, style: { padding: '14px 22px', borderTop: '1px solid ' + K.line, display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' } },
    h('div', { style: { minWidth: 0, flex: '1 1 320px' } }, h('div', { style: { fontSize: 12.5, color: K.mut } }, c.no), h('div', { style: { fontSize: 15, fontWeight: 600, overflowWrap: 'anywhere' } }, c.title, c.id && labelChips(app.db, c, true) ? h('span', { style: { marginLeft: 8 } }, labelChips(app.db, c, true)) : null), h('div', { style: { fontSize: 13, color: K.txt, marginTop: 4, lineHeight: 1.5 } }, o.summary || 'No summary'), h('div', { style: { fontSize: 12, color: K.mut, marginTop: 2 } }, o.source)),
    h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }, h(Chip, { tone: o.confirmed || !o.nextDate ? '' : 'red' }, o.nextDate ? (o.confirmed ? 'Next date ' + L.dmy(o.nextDate) : 'Confirm ' + L.dmy(o.nextDate)) : 'No next date'), h(Btn, { small: true, onClick: () => app.go('order', o.id) }, 'Open order'))); };
  function OrdersByDate({ app }) {
    const d = app.db, T = L.today(), [date, setDate] = useState(T), [q, setQ] = useState(''), [all, setAll] = useState(false), s = q.trim().toLowerCase(), week = weekOf(date);
    const text = o => { const c = caseOf(d, o.caseId); return (c.title + ' ' + c.no + ' ' + (o.summary || '') + ' ' + (o.source || '')).toLowerCase(); };
    const rows = d.orders.filter(o => (all || o.date === date) && (!s || text(o).includes(s))).sort((a, b) => b.date.localeCompare(a.date));
    const dates = [...new Set(rows.map(o => o.date))], cnt = x => d.orders.filter(o => o.date === x).length;
    const dayBtn = x => { const on = !all && x === date, dt = new Date(x + 'T00:00:00'); return h('button', { key: x, type: 'button', 'aria-pressed': on, onClick: () => { setAll(false); setDate(x); }, className: 'ls-btn', style: { flex: '1 1 0', minWidth: 62, border: 0, borderRadius: 8, padding: '10px 4px', background: on ? '#1D5FD0' : 'transparent', color: on ? '#fff' : K.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 } }, h('span', { style: { fontSize: 15, fontWeight: 600 } }, dt.getDate() + ' ' + dt.toLocaleDateString('en-IN', { month: 'short' })), h('span', { style: { fontSize: 11, opacity: .75 } }, dt.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase() + (cnt(x) ? ' · ' + cnt(x) : ''))); };
    return h(Page, { art: 'order', kicker: 'Practice', title: 'Orders by Date', sub: all ? `All dates · ${plural(rows.length, 'order')}` : `${L.longDate(date)} · ${plural(rows.length, 'order')}`,
      actions: [h(Btn, { key: 1, onClick: () => { setAll(false); setDate(T); } }, 'Today'), h(Btn, { key: 2, primary: all, onClick: () => setAll(!all) }, all ? 'Showing all dates' : 'Show all dates'), h(Btn, Object.assign({ key: 3, primary: true, onClick: () => addOrder(app) }, gate(app, 'order.create')), '+ Add court order')] },
      h('section', { style: Object.assign({}, X.card, { padding: 8, display: 'flex', alignItems: 'center', gap: 4 }) }, h(IconBtn, { label: 'Previous week', onClick: () => setDate(L.addDays(date, -7)) }, '‹'), h('div', { style: { display: 'flex', flex: 1, gap: 2, overflowX: 'auto', minWidth: 0 } }, week.map(dayBtn)), h(IconBtn, { label: 'Next week', onClick: () => setDate(L.addDays(date, 7)) }, '›')),
      h(Search, { value: q, onChange: setQ, placeholder: 'Search by case, party or order text', width: 320 }),
      !rows.length ? h(Card, null, h(Empty, { title: 'No orders for this selection', text: 'Orders dated on this day appear here. Add one from a case or use Add court order.', art: 'order' })) :
      dates.map(x => h('section', { key: x, style: Object.assign({}, X.card, { overflow: 'hidden' }) }, h('div', { style: { background: K.soft, padding: '12px 22px', fontSize: 13, fontWeight: 600 } }, L.longDate(x) + ' · ' + plural(rows.filter(o => o.date === x).length, 'order')), rows.filter(o => o.date === x).map(o => orderRow(app, o)))));
  }
  const NOTIF = [['new', 'New · confirm next date', o => !o.confirmed && !!o.nextDate], ['confirmed', 'Confirmed · reminders set', o => !!o.confirmed], ['none', 'No next date found', o => !o.nextDate && !o.confirmed]];
  function OrdersByNotification({ app }) {
    const d = app.db, [tab, setTab] = useState('new'), [q, setQ] = useState(''), s = q.trim().toLowerCase(), cur = NOTIF.find(n => n[0] === tab);
    const rows = d.orders.filter(o => cur[2](o) && (!s || (caseOf(d, o.caseId).title + ' ' + caseOf(d, o.caseId).no + ' ' + (o.summary || '')).toLowerCase().includes(s))).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    return h(Page, { art: 'order', kicker: 'Practice', title: 'Orders by Notification', sub: `${plural(d.orders.filter(NOTIF[0][2]).length, 'new order')} waiting for you · each order is sorted by what it asks of you`,
      actions: [window.LSB && LSB.on && h(Btn, { key: 0, onClick: () => autoCheck(app, true) }, 'Check court records'), h(Btn, Object.assign({ key: 1, primary: true, onClick: () => addOrder(app) }, gate(app, 'order.create')), '+ Add court order')] },
      h('div', { style: { display: 'inline-flex', border: '1px solid ' + K.line, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start', flexWrap: 'wrap' } }, NOTIF.map(n => h('button', { key: n[0], type: 'button', 'aria-pressed': tab === n[0], onClick: () => setTab(n[0]), style: { border: 0, padding: '8px 18px', fontSize: 13.5, fontWeight: 500, background: tab === n[0] ? '#1D5FD0' : '#fff', color: tab === n[0] ? '#fff' : K.ink } }, n[1] + ' (' + d.orders.filter(n[2]).length + ')'))),
      h(Search, { value: q, onChange: setQ, placeholder: 'Search by case, party or order text', width: 320 }),
      h('section', { style: Object.assign({}, X.card, { overflow: 'hidden' }) }, rows.length ? rows.map(o => orderRow(app, o)) : h(Empty, { title: 'Nothing in this list', text: tab === 'new' ? 'You are up to date: every order with a next date is confirmed.' : 'No orders here yet.', art: 'order' })));
  }
  function DisplayBoard({ app }) {
    const d = app.db, T = L.today(), [date, setDate] = useState(T), [, tick] = useState(0);
    React.useEffect(() => { const t = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(t); }, []);
    const hs = d.hearings.filter(x => x.date === date), by = {}; hs.forEach(x => { const k = x.court || caseOf(d, x.caseId).court || 'Court not set'; (by[k] = by[k] || []).push(x); });
    const names = Object.keys(by).sort((a, b) => a.localeCompare(b)), done = x => !!x.outcome;
    return h(Page, { art: 'court', kicker: 'Practice', title: 'Display Board', sub: `${L.longDate(date)} · ${plural(hs.length, 'matter')} · ${hs.filter(done).length} done · refreshes every 30 seconds`,
      actions: [h(Btn, { key: 1, onClick: () => setDate(L.addDays(date, -1)) }, '‹ Prev'), h(Btn, { key: 2, onClick: () => setDate(T) }, 'Today'), h(Btn, { key: 3, onClick: () => setDate(L.addDays(date, 1)) }, 'Next ›')] },
      !names.length ? h(Card, null, h(Empty, { title: 'Nothing on the board', text: 'Hearings listed for this day appear here, court by court, with the item now running.', art: 'court' })) :
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,320px),1fr))', gap: 16 } }, names.map(n => { const g = by[n].slice().sort((a, b) => itemNo(a) - itemNo(b) || a.time.localeCompare(b.time)), now = g.find(x => !done(x));
        return h('section', { key: n, style: Object.assign({}, X.card, { padding: '18px 20px' }) }, h('div', { style: { fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: K.mut, fontWeight: 600 } }, n),
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, margin: '8px 0 12px' } }, h('span', { style: { fontSize: 13, color: K.mut } }, now ? 'Now / next item' : 'Board'), h('span', { style: { fontSize: 34, fontWeight: 600, letterSpacing: '-.02em', color: now ? '#1D5FD0' : K.mut } }, now ? (now.item ? String(now.item).replace(/^item\s*/i, '') : L.t12(now.time)) : 'Done')),
          g.map(x => h('button', { key: x.id, type: 'button', onClick: () => app.go('case', x.caseId), style: { display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left', border: 0, borderTop: '1px solid ' + K.line, background: 'transparent', padding: '9px 0', fontSize: 13.5, opacity: done(x) ? .55 : 1 } },
            h('b', { style: { minWidth: 34, fontVariantNumeric: 'tabular-nums' } }, x.item ? String(x.item).replace(/^item\s*/i, '') : '—'), h('span', { style: { flex: 1, minWidth: 0, overflowWrap: 'anywhere' } }, caseOf(d, x.caseId).title), outcomeChip(x) || h(Chip, { tone: x === now ? '' : 'grey' }, x === now ? 'Next' : L.t12ap(x.time))))); })));
  }

  const MODULES = { ordersdate: OrdersByDate, ordersnotif: OrdersByNotification, board: DisplayBoard, labels: Labels, causelist: Causelist, workspace: Workspace, courts: Courts, clients: Clients, documents: p => h(Docs, { app: p.app, kind: 'document' }), evidence: p => h(Docs, { app: p.app, kind: 'evidence' }), research: Research, agents: Agents, team: Team, chat: Chat, billing: Billing, portal: Portal, reports: Reports, settings: Settings, orders: Orders };

  /* ---------- top-bar dropdowns ---------- */
  function Drop({ style, children, onClose }) { return h(React.Fragment, null, h('div', { onClick: onClose, style: { position: 'fixed', inset: 0, zIndex: 58 } }), h('div', { className: 'ls-drop', style: Object.assign({}, X.card, { position: 'absolute', zIndex: 60, boxShadow: '0 16px 48px rgba(0,0,0,.14)', padding: 6, minWidth: 260 }, style) }, children)); }
  const Item = ({ onClick, children, sub }) => h('button', { type: 'button', onClick, style: { display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'none', borderRadius: 8, padding: '9px 10px', fontSize: 13.5, color: K.ink, lineHeight: 1.45 }, onMouseEnter: e => { e.currentTarget.style.background = K.soft2; }, onMouseLeave: e => { e.currentTarget.style.background = 'none'; } }, children, sub && h('span', { style: { display: 'block', fontSize: 12, color: K.mut } }, sub));
  function searchAll(d, q) {
    const s = q.toLowerCase().trim(); if (s.length < 2) return [];
    const out = [];
    d.cases.forEach(c => { if ((c.title + c.full + c.no + c.cnr + c.court).toLowerCase().includes(s)) out.push({ kind: 'Case', label: c.title, sub: c.no + ' · ' + c.court, to: ['case', c.id] }); });
    d.clients.forEach(c => { if ((c.name + c.contact + c.email).toLowerCase().includes(s)) out.push({ kind: 'Client', label: c.name, sub: c.contact || c.city, to: ['clients'] }); });
    d.docs.forEach(x => { if ((x.name + x.meta + (x.tags || []).join(' ')).toLowerCase().includes(s)) out.push({ kind: x.kind === 'evidence' ? 'Evidence' : 'Document', label: x.name, sub: caseOf(d, x.caseId).title, to: ['case', x.caseId, 'documents'] }); });
    d.orders.forEach(o => { if ((o.summary + (o.paras || []).join(' ')).toLowerCase().includes(s)) out.push({ kind: 'Order', label: 'Order dated ' + L.dmy(o.date), sub: caseOf(d, o.caseId).title, to: ['order', o.id] }); });
    return out.slice(0, 9);
  }

  window.LSV = { autoCheck, applyNext, labelsOf, labelChips, LabelChip, delLabel, FirmMark, COURTS, courtPic, Avatar, editPhoto, removePhoto, upiPay, SubPanel, aiDraft, maybeAskDrive, PlanCard, PlanLock, PlanUpgrade, planName, planSub, choosePlan, overLimit, h, K, X, Art, art, artFor, reduced, countUp, CountUp, LoginStage, Boot, Btn, Chip, Card, Page, Table, Modal, Form, Toggle, Empty, Line, Drop, Item, Select, LoginForm, MODULES, TaskRow, caseOf, clientOf, clashes, nextHearing, alerts, logIt, newCase, importCnr, addTask, addHearing, uploadDoc, openDoc, addOrder, help, onboard, newLim, addDeadline, confirmBox, searchAll, gstOf, overdue, openTasks,
    can, OUTCOMES, isAdj, IconBtn, infoBox, needsOutcome, outcomeChip, hearingActs, recordOutcome, delHearing, delCase, delTask, editDoc, delDoc, docActs, tagLine, editOrder, delOrder, editInvoice, delInvoice, delDeadline, delLim, deadlinesCard, limList, approveLim, withdrawLim, markDone, syncDeadline, briefAt, BRIEF_TIMES, delDraft, caseDetails, detailsView, draftSummary, NEED };
})();

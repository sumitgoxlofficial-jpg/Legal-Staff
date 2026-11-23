/* Legal Staff — electronic signing inside the AI Drafting Studio.
   Everything here is reached from the Drafting Studio's own toolbar: Prepare for Signature (an in-editor mode where fields are placed on
   the pages), Send for Signature (final preview, charges, confirm) and View Signing Status (signers, reminders, cancel, download, audit).
   Every call goes to the server function 'esign' through LSB.esign; no key or secret is ever in the browser.
   The signature made here is a SIMPLE electronic signature (typed or drawn). It is not Aadhaar eSign and not a DSC. */
(function () {
  'use strict';
  const h = React.createElement, V = window.LSV, LSB = window.LSB, L = window.LS, K = V.K;
  const { Btn, Modal, Chip, Select } = V;
  const useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useLayoutEffect = React.useLayoutEffect;
  const LABEL = { draft: 'Draft', prepared: 'Prepared for Signature', sent: 'Sent', viewed: 'Viewed', partial: 'Partially Signed', completed: 'Completed', declined: 'Declined', expired: 'Expired', cancelled: 'Cancelled', failed: 'Failed' };
  const OPEN = ['sent', 'viewed', 'partial'];
  const SIGNER_LABEL = { pending: 'Waiting for their turn', notified: 'Sent, not opened', viewed: 'Opened', signed: 'Signed', declined: 'Declined' };
  const KINDS = [['signature', 'Signature', { w: .28, h: .07 }], ['initials', 'Initials', { w: .1, h: .045 }], ['date', 'Date', { w: .16, h: .03 }], ['name', 'Printed name', { w: .24, h: .03 }], ['designation', 'Designation', { w: .24, h: .03 }], ['text', 'Custom text', { w: .3, h: .03 }]];
  const KIND_NAME = Object.fromEntries(KINDS.map(k => [k[0], k[1]]));
  const ROLES = ['Advocate', 'Petitioner', 'Respondent', 'Client', 'Witness', 'Other'];
  const COLORS = ['#1D4ED8', '#B45309', '#047857', '#9333EA', '#BE123C', '#0E7490'];
  const NOTE = 'Typed and drawn signatures are simple electronic signatures. They are not Aadhaar eSign and not a Digital Signature Certificate (DSC).';
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const when = iso => iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
  const api = (a, b) => LSB.esign(a, b);

  /* ---------- shared state: what the server allows, and each document's requests ---------- */
  const store = { firm: '', cfg: null, cfgErr: '', lists: {}, subs: new Set(), v: 0 };
  const bump = () => { store.v++; store.subs.forEach(f => f(store.v)); };
  const useStore = () => { const [, set] = useState(0); useEffect(() => { store.subs.add(set); return () => { store.subs.delete(set); }; }, []); return store; };
  const fresh = app => { if (store.firm !== app.db.firmId) { store.firm = app.db.firmId; store.cfg = null; store.lists = {}; store.cfgErr = ''; } };
  async function loadCfg(app) { fresh(app); if (!LSB.on) { store.cfg = { offline: true }; return bump(); } try { store.cfg = await api('config'); store.cfgErr = ''; } catch (e) { store.cfgErr = e.message; } bump(); }
  async function loadList(app, tpl) { fresh(app); if (!LSB.on) return; try { store.lists[tpl] = (await api('list', { draft_key: String(tpl) })).requests; } catch (e) { store.lists[tpl] = store.lists[tpl] || []; } bump(); }
  const latest = tpl => (store.lists[tpl] || [])[0] || null;
  const saveFile = (b64, name) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: 'application/pdf' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
  const snapshot = app => app.clean(app.ed ? app.ed.innerHTML : (app.buf != null ? app.buf : ''));
  const firmOf = app => ({ firm_name: app.db.firm.name, firm_address: app.db.firm.address || app.db.firm.city || '' });

  /* ---------- small pieces ---------- */
  const tone = s => s === 'completed' ? { bg: '#E7F6EC', fg: '#137333' } : ['declined', 'failed'].includes(s) ? { bg: '#FDECEA', fg: '#B42318' } : ['expired', 'cancelled'].includes(s) ? { bg: '#EDEDED', fg: '#5E5E5E' } : s === 'prepared' ? { bg: '#EEF2FF', fg: '#3730A3' } : { bg: '#FFF4D6', fg: '#8A5A00' };
  const StatusChip = ({ status, text }) => { const t = tone(status); return h('span', { style: { fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '3px 9px', whiteSpace: 'nowrap', background: t.bg, color: t.fg } }, text || LABEL[status] || status); };
  const sTone = s => s === 'signed' ? 'completed' : s === 'declined' ? 'declined' : s === 'pending' ? 'cancelled' : 'sent';
  const Notice = ({ children, red }) => h('div', { style: { fontSize: 12.5, lineHeight: 1.55, color: red ? K.red : K.txt, background: red ? K.redBg : '#F7F7F5', border: '1px solid ' + (red ? '#F4B8B1' : K.line), borderRadius: 8, padding: '9px 12px' } }, children);
  const Lab = ({ t, children, style }) => h('label', { style: Object.assign({ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: K.mut, minWidth: 0 }, style) }, t, children);
  const inp = { height: 36, border: '1px solid ' + K.line, borderRadius: 8, padding: '0 10px', fontSize: 14, width: '100%', boxSizing: 'border-box', background: '#fff', color: K.ink };

  /* ---------- the document pages, drawn from the server's layout, with signature fields on top ---------- */
  function Page({ layout, index, fields, signers, ro, tool, sel, onPlace, onSel, onField, mini }) {
    const ref = useRef(null), [w, setW] = useState(mini ? 200 : 600);
    useLayoutEffect(() => { const el = ref.current; if (!el) return; const f = () => setW(el.getBoundingClientRect().width || 600); f(); let ro2; if (window.ResizeObserver) { ro2 = new ResizeObserver(f); ro2.observe(el); } else window.addEventListener('resize', f); return () => { ro2 ? ro2.disconnect() : window.removeEventListener('resize', f); }; }, []);
    const pg = layout.pages[index], k = w / layout.pageW, pc = (v, d) => (100 * v / d) + '%';
    const colorOf = key => COLORS[Math.max(0, signers.findIndex(s => s.key === key)) % COLORS.length];
    const click = e => { if (ro || !tool || e.target.closest('[data-field]')) return; const r = ref.current.getBoundingClientRect(); onPlace(index + 1, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); };
    return h('div', { ref, 'data-pagebox': index + 1, onClick: click, style: { position: 'relative', width: '100%', aspectRatio: layout.pageW + ' / ' + layout.pageH, background: '#fff', border: '1px solid ' + K.line, borderRadius: 4, boxShadow: '0 1px 6px rgba(0,0,0,.06)', overflow: 'hidden', cursor: tool && !ro ? 'crosshair' : 'default', userSelect: 'none', flex: '0 0 auto' } },
      pg.rules.map((r, i) => h('div', { key: 'r' + i, style: { position: 'absolute', left: pc(r.x1, layout.pageW), width: pc(r.x2 - r.x1, layout.pageW), top: pc(r.y, layout.pageH), height: Math.max(1, r.w * k), background: '#0A0A0A', pointerEvents: 'none' } })),
      pg.lines.map((l, i) => h('div', { key: i, style: { position: 'absolute', left: pc(l.x, layout.pageW), top: pc(l.y - l.size * 0.84, layout.pageH), fontSize: l.size * k, lineHeight: 1.2, whiteSpace: 'pre', fontFamily: '"Times New Roman",Times,serif', color: '#1A1A1A', pointerEvents: 'none' } },
        l.runs.map((r, j) => h('span', { key: j, style: { fontWeight: r.b ? 700 : 400, fontStyle: r.i ? 'italic' : 'normal', textDecoration: r.u ? 'underline' : 'none' } }, r.t)))),
      h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: pc(22, layout.pageH), textAlign: 'center', fontSize: 8 * k, color: '#8A8A8A', pointerEvents: 'none' } }, `Page ${index + 1} of ${layout.pages.length}`),
      fields.filter(f => f.page === index + 1).map(f => h(Field, { key: f.key, f, color: colorOf(f.signer_key), who: (signers.find(s => s.key === f.signer_key) || {}).name || 'Signer', ro, selected: sel === f.key, onSel, onField, pageRef: ref, mini, k })));
  }
  function Field({ f, color, who, ro, selected, onSel, onField, pageRef, mini, k }) {
    const drag = useRef(null);
    const rect = () => pageRef.current.getBoundingClientRect();
    const down = mode => e => { if (ro) return; e.stopPropagation(); e.preventDefault(); onSel(f.key); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { mode, x0: e.clientX, y0: e.clientY, f0: { x: f.x, y: f.y, w: f.w, h: f.h } }; };
    const move = e => { const d = drag.current; if (!d) return; const r = rect(), dx = (e.clientX - d.x0) / r.width, dy = (e.clientY - d.y0) / r.height;
      if (d.mode === 'move') onField(f.key, { x: clamp(d.f0.x + dx, 0, 1 - f.w), y: clamp(d.f0.y + dy, 0, 1 - f.h) }); else onField(f.key, { w: clamp(d.f0.w + dx, .04, 1 - f.x), h: clamp(d.f0.h + dy, .02, 1 - f.y) }); };
    const up = () => { drag.current = null; };
    const key = e => { if (ro) return; const s = e.shiftKey ? .01 : .003; if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onField(f.key, null); } else if (e.key === 'ArrowLeft') { e.preventDefault(); onField(f.key, { x: clamp(f.x - s, 0, 1 - f.w) }); } else if (e.key === 'ArrowRight') { e.preventDefault(); onField(f.key, { x: clamp(f.x + s, 0, 1 - f.w) }); } else if (e.key === 'ArrowUp') { e.preventDefault(); onField(f.key, { y: clamp(f.y - s, 0, 1 - f.h) }); } else if (e.key === 'ArrowDown') { e.preventDefault(); onField(f.key, { y: clamp(f.y + s, 0, 1 - f.h) }); } };
    return h('div', { 'data-field': f.key, tabIndex: ro ? -1 : 0, role: 'button', 'aria-label': `${KIND_NAME[f.kind]} for ${who}`, onPointerDown: down('move'), onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key, onFocus: () => !ro && onSel(f.key),
      style: { position: 'absolute', left: (100 * f.x) + '%', top: (100 * f.y) + '%', width: (100 * f.w) + '%', height: (100 * f.h) + '%', boxSizing: 'border-box', border: (selected ? '2px solid ' : '1.5px dashed ') + color, background: color + '22', borderRadius: 4, cursor: ro ? 'default' : 'move', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', outline: 'none', boxShadow: selected ? '0 0 0 3px ' + color + '33' : 'none' } },
      !mini && h('span', { style: { fontSize: Math.max(9, Math.min(12.5, 11 * k * 1.2)), color, fontWeight: 600, padding: '0 4px', textAlign: 'center', lineHeight: 1.15, pointerEvents: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' } }, (f.label || KIND_NAME[f.kind]) + ' · ' + who),
      !ro && selected && h('span', { onPointerDown: down('resize'), onPointerMove: move, onPointerUp: up, style: { position: 'absolute', right: -1, bottom: -1, width: 16, height: 16, background: color, borderRadius: '4px 0 4px 0', cursor: 'nwse-resize', touchAction: 'none' } }));
  }

  /* ---------- Prepare for Signature: pages with fields on the left, signers on the right, inside the editor ---------- */
  function Prepare({ app, tpl, html, title, onExit, onSend }) {
    useStore();
    const cfg = store.cfg || {}, firm = firmOf(app);
    const [st, setSt] = useState({ loading: true, err: '', layout: null, warnings: [], signers: [], fields: [], mode: 'parallel', requestId: '', dirty: false, note: '' });
    const [tool, setTool] = useState(null), [sel, setSel] = useState(''), [active, setActive] = useState(''), [busy, setBusy] = useState(false), [problems, setProblems] = useState([]);
    const S = (p) => setSt(s => Object.assign({}, s, typeof p === 'function' ? p(s) : p));
    useEffect(() => { let dead = false; (async () => {
      try {
        const ex = latest(tpl); let loaded = null;
        if (ex && ex.status === 'prepared') loaded = await api('get', { request_id: ex.id, html });
        const r = await api('render', Object.assign({ html }, firm));
        if (dead) return;
        const signers = loaded ? loaded.signers.map(s => ({ key: s.id, name: s.name, email: s.email, phone: s.phone, role: s.role, sign_order: s.sign_order, required: s.required })) : [];
        const fields = loaded ? loaded.fields.map(f => ({ key: f.id, kind: f.kind, page: f.page, x: +f.x, y: +f.y, w: +f.w, h: +f.h, signer_key: f.signer_id, required: f.required, label: f.label })) : [];
        S({ loading: false, layout: r.layout, warnings: r.warnings, signers, fields, mode: loaded ? loaded.request.mode : 'parallel', requestId: loaded ? loaded.request.id : '', note: loaded && loaded.html_same === false ? 'The document text changed after you last prepared it. Check that every field is still where you want it.' : '' });
        setActive(signers[0] ? signers[0].key : '');
      } catch (e) { if (!dead) S({ loading: false, err: e.message }); }
    })(); return () => { dead = true; }; }, []);
    const colorOf = key => COLORS[Math.max(0, st.signers.findIndex(s => s.key === key)) % COLORS.length];
    const touch = fn => S(s => Object.assign({ dirty: true }, fn(s)));
    const addSigner = (o) => { const key = 's' + uid(); touch(s => ({ signers: s.signers.concat([Object.assign({ key, name: '', email: '', phone: '', role: 'Client', sign_order: s.signers.length + 1, required: true }, o)]) })); setActive(key); };
    const upSigner = (key, p) => touch(s => ({ signers: s.signers.map(x => x.key === key ? Object.assign({}, x, p) : x) }));
    const delSigner = key => { touch(s => ({ signers: s.signers.filter(x => x.key !== key), fields: s.fields.filter(f => f.signer_key !== key) })); if (active === key) setActive(''); };
    const place = (page, x, y) => { if (!tool) return; const sg = active || (st.signers[0] || {}).key; if (!sg) { app.toast('Add a signer first, then place their fields.'); return; }
      const size = KINDS.find(k => k[0] === tool)[2], f = { key: 'f' + uid(), kind: tool, page, w: size.w, h: size.h, x: clamp(x - size.w / 2, 0, 1 - size.w), y: clamp(y - size.h / 2, 0, 1 - size.h), signer_key: sg, required: true, label: '' };
      touch(s => ({ fields: s.fields.concat([f]) })); setSel(f.key); setTool(null); };
    const upField = (key, p) => touch(s => ({ fields: p === null ? s.fields.filter(f => f.key !== key) : s.fields.map(f => f.key === key ? Object.assign({}, f, p) : f) }));
    const body = (strict) => ({ request_id: st.requestId || undefined, draft_key: String(tpl), title, html, mode: st.mode, signers: st.signers.map(s => Object.assign({}, s, { sign_order: st.mode === 'parallel' ? 1 : s.sign_order })), fields: st.fields, draftOnly: !strict });
    const save = async (strict) => { setBusy(true); setProblems([]); try { const r = await api('prepare_save', Object.assign(body(strict), firm)); S({ requestId: r.request_id, dirty: false }); await loadList(app, tpl); return r; } catch (e) { setProblems(e.problems || [e.message]); app.toast(e.message); return null; } finally { setBusy(false); } };
    const exit = () => { if (st.dirty && !window.confirm('Leave without saving your signature fields?')) return; onExit(); };
    if (st.loading) return h('section', { style: { gridColumn: 'span 3', background: '#fff', border: '1px solid ' + K.line, borderRadius: 12, padding: 40, textAlign: 'center', color: K.mut } }, 'Preparing the document pages…');
    if (st.err) return h('section', { style: { gridColumn: 'span 3', background: '#fff', border: '1px solid ' + K.line, borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' } }, h(Notice, { red: true }, st.err), h(Btn, { onClick: onExit }, 'Back to the editor'));
    const selF = st.fields.find(f => f.key === sel), nPages = st.layout.pages.length;
    const chip = (on, c) => ({ border: '1.5px solid ' + c, background: on ? c : '#fff', color: on ? '#fff' : c, borderRadius: 999, padding: '5px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' });
    return h('section', { style: { gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 } },
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid ' + K.line, borderRadius: 12, padding: '12px 16px' } },
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } }, h(StatusChip, { status: 'prepared' }), h('span', { style: { fontSize: 14, fontWeight: 600 } }, 'Preparing “' + title + '” for signature'), h('span', { style: { fontSize: 12.5, color: K.mut } }, nPages + ' page' + (nPages > 1 ? 's' : '') + ' · ' + st.fields.length + ' field' + (st.fields.length === 1 ? '' : 's') + (st.dirty ? ' · unsaved changes' : ''))),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h(Btn, { onClick: exit, disabled: busy }, 'Back to editor'), h(Btn, { onClick: () => save(false).then(r => r && app.toast('Preparation saved')), disabled: busy }, 'Save'), h(Btn, { primary: true, disabled: busy, onClick: async () => { const r = await save(true); if (r) onSend(); } }, busy ? 'Saving…' : 'Review and send'))),
      st.warnings.map((w, i) => h(Notice, { key: i, red: true }, w)), st.note && h(Notice, null, st.note), problems.length > 0 && h(Notice, { red: true }, h('b', null, 'Fix before sending: '), problems.join(' ')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 16, alignItems: 'start' } },
        h('div', { style: { gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 } },
          h('div', { style: { position: 'sticky', top: 0, zIndex: 5, background: '#FAFAF9', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 } },
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { fontSize: 12, fontWeight: 600, color: K.mut, textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Place for'),
              st.signers.length ? st.signers.map(s => h('button', { key: s.key, type: 'button', onClick: () => setActive(s.key), style: chip((active || st.signers[0].key) === s.key, colorOf(s.key)) }, s.name || 'Signer')) : h('span', { style: { fontSize: 13, color: K.mut } }, 'Add a signer on the right first')),
            h('div', { style: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 } }, KINDS.map(([k, label]) => h('button', { key: k, type: 'button', onClick: () => setTool(tool === k ? null : k), 'aria-pressed': tool === k, style: { border: '1px solid ' + (tool === k ? K.ink : K.line), background: tool === k ? K.ink : '#fff', color: tool === k ? '#fff' : K.ink, borderRadius: 8, padding: '7px 12px', fontSize: 13.5, whiteSpace: 'nowrap', cursor: 'pointer' } }, '+ ' + label))),
            h('div', { style: { fontSize: 12.5, color: K.mut } }, tool ? 'Now tap or click where the ' + KIND_NAME[tool].toLowerCase() + ' should go on the page.' : 'Choose a field type, then tap the page. Leave a little room under a signature: the “Authenticated through Legal Staff”, name and date stamp is printed there. Drag a field to move it, drag its corner to resize, press Delete to remove it.'),
            selF && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#fff', border: '1px solid ' + K.line, borderRadius: 8, padding: '8px 10px' } },
              h('b', { style: { fontSize: 13 } }, KIND_NAME[selF.kind]),
              h('select', { 'aria-label': 'Signer for this field', value: selF.signer_key, onChange: e => upField(selF.key, { signer_key: e.target.value }), style: Object.assign({}, inp, { width: 'auto', height: 32 }) }, st.signers.map(s => h('option', { key: s.key, value: s.key }, s.name || 'Signer'))),
              h('label', { style: { fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' } }, 'Page', h('input', { type: 'number', min: 1, max: nPages, value: selF.page, onChange: e => upField(selF.key, { page: clamp(+e.target.value || 1, 1, nPages) }), style: Object.assign({}, inp, { width: 60, height: 32 }) })),
              selF.kind === 'text' || selF.kind === 'designation' ? h('input', { 'aria-label': 'Label shown to the signer', placeholder: 'Label for the signer', value: selF.label, onChange: e => upField(selF.key, { label: e.target.value }), style: Object.assign({}, inp, { width: 170, height: 32 }) }) : null,
              h('label', { style: { fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' } }, h('input', { type: 'checkbox', checked: selF.required, onChange: e => upField(selF.key, { required: e.target.checked }) }), 'Required'),
              h(Btn, { small: true, danger: true, onClick: () => { upField(selF.key, null); setSel(''); } }, 'Remove'))),
          st.layout.pages.map((_, i) => h(Page, { key: i, layout: st.layout, index: i, fields: st.fields, signers: st.signers, tool, sel, onPlace: place, onSel: setSel, onField: (key, p) => { upField(key, p); if (p === null) setSel(''); } }))),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, position: 'sticky', top: 0 } },
          h('div', { style: { background: '#fff', border: '1px solid ' + K.line, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
            h('div', { style: { fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: 600 } }, 'How they sign'),
            h('div', { style: { display: 'flex', gap: 6 } }, [['parallel', 'Together'], ['sequential', 'One by one']].map(([m, l]) => h('button', { key: m, type: 'button', onClick: () => touch(() => ({ mode: m })), 'aria-pressed': st.mode === m, style: { flex: 1, border: '1px solid ' + (st.mode === m ? K.ink : K.line), background: st.mode === m ? K.ink : '#fff', color: st.mode === m ? '#fff' : K.ink, borderRadius: 8, padding: '8px 6px', fontSize: 13.5, cursor: 'pointer' } }, l))),
            h('div', { style: { fontSize: 12.5, color: K.mut } }, st.mode === 'parallel' ? 'Everyone gets the link at once and signs in any order.' : 'Signers get the link in the order below; each is invited when the earlier ones have signed. Give two people the same number to let them sign together.')),
          st.signers.map((s, i) => h('div', { key: s.key, style: { background: '#fff', border: '1px solid ' + K.line, borderLeft: '4px solid ' + colorOf(s.key), borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, h('b', { style: { fontSize: 13.5 } }, 'Signer ' + (i + 1)), h(Btn, { small: true, danger: true, onClick: () => delSigner(s.key) }, 'Remove')),
            h(Lab, { t: 'Full name' }, h('input', { value: s.name, onChange: e => upSigner(s.key, { name: e.target.value }), autoComplete: 'off', style: inp })),
            h(Lab, { t: 'Email address' }, h('input', { type: 'email', value: s.email, onChange: e => upSigner(s.key, { email: e.target.value }), autoComplete: 'off', style: inp })),
            h(Lab, { t: 'Mobile number' }, h('input', { type: 'tel', inputMode: 'tel', value: s.phone, onChange: e => upSigner(s.key, { phone: e.target.value }), placeholder: '10 digits or +91…', autoComplete: 'off', style: inp })),
            h('div', { style: { display: 'flex', gap: 8 } },
              h(Lab, { t: 'Role', style: { flex: 1 } }, h('select', { value: s.role, onChange: e => upSigner(s.key, { role: e.target.value }), style: inp }, ROLES.map(r => h('option', { key: r }, r)))),
              st.mode === 'sequential' && h(Lab, { t: 'Order', style: { width: 70 } }, h('input', { type: 'number', min: 1, max: 50, value: s.sign_order, onChange: e => upSigner(s.key, { sign_order: clamp(+e.target.value || 1, 1, 50) }), style: inp }))),
            h('label', { style: { fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' } }, h('input', { type: 'checkbox', checked: s.required, onChange: e => upSigner(s.key, { required: e.target.checked }) }), s.required ? 'Required: the document is complete only when they sign' : 'Optional signer'),
            h('div', { style: { fontSize: 12, color: K.mut } }, st.fields.filter(f => f.signer_key === s.key).length + ' field(s) placed'))),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h(Btn, { onClick: () => addSigner({}) }, '+ Add signer'), !st.signers.some(s => s.email === (app.db.user.email || '').toLowerCase()) && app.db.user.email && h(Btn, { onClick: () => addSigner({ name: (app.db.user.name || '').replace(/^Adv\.?\s*/i, ''), email: (app.db.user.email || '').toLowerCase(), phone: app.db.user.phone || '', role: 'Advocate' }) }, '+ Add myself')),
          h(Notice, null, NOTE))));
  }

  /* ---------- Send for Signature: final preview, charges, confirm ---------- */
  function SendDialog({ app, tpl, html, title: t0 }) {
    useStore(); const cfg = store.cfg || {};
    const [d, setD] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
    const [title, setTitle] = useState(t0), [msg, setMsg] = useState(''), [days, setDays] = useState(cfg.default_expiry_days || 14), [ack, setAck] = useState(false);
    useEffect(() => { let dead = false; const ex = latest(tpl); if (!ex || ex.status !== 'prepared') { setErr('Prepare the document for signature first.'); return; }
      api('get', { request_id: ex.id, layout: 1, html }).then(r => { if (!dead) { setD(r); setTitle(r.request.title || t0); } }).catch(e => !dead && setErr(e.message)); return () => { dead = true; }; }, []);
    const close = () => app.modal(null);
    const priced = cfg.pricing_mode === 'credits', cost = priced ? cfg.credits_per_document : 0, freeLeft = Math.max(0, (cfg.free_per_month || 0) - (cfg.free_used_month || 0));
    const way = !priced || cost === 0 ? { ok: true, text: 'No charge for this document.' } : freeLeft > 0 ? { ok: true, text: `Uses one of your ${cfg.free_per_month} free documents this month (${freeLeft} left).` } : cfg.free_trial_left > 0 ? { ok: true, text: `Uses one of your free trial documents (${cfg.free_trial_left} left).` } : cfg.balance >= cost ? { ok: true, text: `Uses ${cost} signing credit${cost > 1 ? 's' : ''}. Balance ${cfg.balance} → ${cfg.balance - cost}.` } : { ok: false, text: `Needs ${cost} signing credit${cost > 1 ? 's' : ''}; your firm has ${cfg.balance || 0}.` };
    const limited = cfg.month_limit > 0 && cfg.month_used >= cfg.month_limit;
    const send = async () => { setBusy(true); setErr(''); try { const r = await api('send', { request_id: d.request.id, title: title.trim(), message: msg, expires_in_days: +days }); await loadList(app, tpl); await loadCfg(app); app.modal(null); app.toast(r.email_failed && r.email_failed.length ? 'Sent, but could not email ' + r.email_failed.join(', ') : 'Sent for signature. Signers have been emailed.'); openStatus(app, tpl); }
      catch (e) { setErr(e.message); if (e.message) loadCfg(app); setBusy(false); } };
    const buy = i => { const p = cfg.packs[i]; V.upiPay(app, { create: () => LSB.upi.esignCreate(i), name: p.credits + ' signing credits', doneText: `paid. ${p.credits} signing credits have been added to your firm.`, onPaid: () => loadCfg(app), after: () => openSend(app, tpl) }); };
    if (!d) return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, err ? h(Notice, { red: true }, err) : h('div', { style: { color: K.mut } }, 'Loading…'), h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h(Btn, { onClick: close }, 'Close')));
    const R = d.request, lay = R.layout, sg = d.signers.map(s => ({ key: s.id, name: s.name })), fl = d.fields.map(f => ({ key: f.id, kind: f.kind, page: f.page, x: +f.x, y: +f.y, w: +f.w, h: +f.h, signer_key: f.signer_id, label: f.label }));
    const stale = d.html_same === false;
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      stale && h(Notice, { red: true }, 'The document was edited after it was prepared. The signers will receive the prepared version below. To include your latest edits, go back and use Prepare for Signature again.'),
      h(Lab, { t: 'Document title' }, h('input', { value: title, maxLength: 200, onChange: e => setTitle(e.target.value), style: inp })),
      h(Lab, { t: 'Message to the signers (optional)' }, h('textarea', { value: msg, rows: 3, maxLength: 2000, onChange: e => setMsg(e.target.value), placeholder: 'e.g. Please sign the agreement before Friday.', style: Object.assign({}, inp, { height: 'auto', padding: 10, resize: 'vertical' }) })),
      h(Lab, { t: 'Link expires after' }, h('select', { value: days, onChange: e => setDays(e.target.value), style: inp }, [1, 3, 7, 14, 30, 60, 90, 180, 365].filter(n => n <= (cfg.max_expiry_days || 90)).map(n => h('option', { key: n, value: n }, n + (n === 1 ? ' day' : ' days'))))),
      h('div', { style: { border: '1px solid ' + K.line, borderRadius: 10, overflow: 'hidden' } }, h('div', { style: { padding: '8px 12px', background: '#F7F7F5', fontSize: 12, fontWeight: 600, color: K.mut } }, `Signers (${R.mode === 'sequential' ? 'one by one' : 'together'})`),
        d.signers.map(s => h('div', { key: s.id, style: { padding: '9px 12px', borderTop: '1px solid ' + K.line, fontSize: 13.5, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' } },
          R.mode === 'sequential' && h('b', null, s.sign_order + '.'), h('b', null, s.name), h('span', { style: { color: K.mut } }, s.role + (s.required ? '' : ' · optional')), h('span', null, s.email), h('span', { style: { color: K.mut } }, s.phone), h('span', { style: { color: K.mut } }, d.fields.filter(f => f.signer_id === s.id).length + ' field(s)')))),
      h('div', null, h('div', { style: { fontSize: 12, fontWeight: 600, color: K.mut, marginBottom: 6 } }, 'Signature positions'), h('div', { style: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 } }, lay.pages.map((_, i) => h('div', { key: i, style: { width: 150, flex: '0 0 auto' } }, h(Page, { layout: lay, index: i, fields: fl, signers: sg, ro: true, mini: true }))))),
      h(Notice, { red: !way.ok || limited }, limited ? `Your firm has reached its limit of ${cfg.month_limit} documents this month.` : way.text),
      !way.ok && !limited && (cfg.owner && cfg.packs && cfg.packs.length ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, cfg.packs.map((p, i) => h(Btn, { key: i, onClick: () => buy(i) }, `Buy ${p.credits} credits · ${L.inr(p.price_paise / 100)}`))) : h('div', { style: { fontSize: 13, color: K.mut } }, cfg.owner ? 'No credit packs are on sale yet. Contact Legal Staff.' : 'Ask your firm owner to buy signing credits.')),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, (cfg.legal || []).map((x, i) => h('div', { key: i, style: { fontSize: 12, color: K.mut, lineHeight: 1.5 } }, '• ' + x))),
      h('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5 } }, h('input', { type: 'checkbox', checked: ack, onChange: e => setAck(e.target.checked), style: { marginTop: 3 } }), 'I understand this is a simple electronic signature, not Aadhaar eSign or a DSC, and that this document may be signed this way.'),
      err && h(Notice, { red: true }, err),
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' } }, h(Btn, { onClick: close, disabled: busy }, 'Cancel'), h(Btn, { primary: true, onClick: send, disabled: busy || !ack || !way.ok || limited || !title.trim() }, busy ? 'Sending…' : 'Confirm and send')));
  }

  /* ---------- View Signing Status ---------- */
  function StatusPanel({ app, tpl }) {
    useStore();
    const [sel, setSel] = useState(''), [d, setD] = useState(null), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [showAudit, setShowAudit] = useState(false);
    const list = store.lists[tpl] || [], cur = list.find(r => r.id === sel) || list[0];
    const load = async () => { if (!cur) return; try { const r = await api('get', { request_id: cur.id }); setD(r); setErr(''); } catch (e) { setErr(e.message); } };
    useEffect(() => { loadList(app, tpl); }, []);
    useEffect(() => { setD(null); load(); if (!cur || !OPEN.includes(cur.status)) return; const t = setInterval(() => { loadList(app, tpl); load(); }, 20000); return () => clearInterval(t); }, [cur && cur.id, cur && cur.status]);
    const run = async (what, fn, ok) => { setBusy(what); setErr(''); try { const r = await fn(); if (ok) app.toast(typeof ok === 'function' ? ok(r) : ok); await loadList(app, tpl); await load(); } catch (e) { setErr(e.message); } setBusy(''); };
    if (!cur) return h('div', null, h(Notice, null, 'This document has not been sent for signature yet. Use Prepare for Signature, then Send for Signature.'), h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 } }, h(Btn, { onClick: () => app.modal(null) }, 'Close')));
    const R = d ? d.request : cur, S = d ? d.signers : cur.signers || [], open = OPEN.includes(R.status), can = d ? d.can_manage : false;
    const dl = which => run('dl' + which, async () => { const r = await api('download', { request_id: R.id, which }); saveFile(r.pdf, r.filename); }, null);
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      list.length > 1 && h('select', { value: cur.id, onChange: e => { setSel(e.target.value); setD(null); }, style: inp, 'aria-label': 'Earlier requests for this document' }, list.map(r => h('option', { key: r.id, value: r.id }, `${LABEL[r.status]} · ${r.title} · ${when(r.created_at)}`))),
      h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } }, h(StatusChip, { status: R.status }), h('b', { style: { fontSize: 15 } }, R.title)),
      h('div', { style: { fontSize: 12.5, color: K.mut, lineHeight: 1.7 } }, R.sent_at ? 'Sent ' + when(R.sent_at) + ' by ' + (R.creator_name || '') : 'Not sent yet', R.expires_at && OPEN.includes(R.status) ? ' · expires ' + when(R.expires_at) : '', R.completed_at ? ' · completed ' + when(R.completed_at) : '', R.cancelled_at ? ' · cancelled ' + when(R.cancelled_at) : ''),
      R.error && R.status !== 'completed' && h(Notice, { red: true }, R.error),
      h('div', { style: { border: '1px solid ' + K.line, borderRadius: 10, overflow: 'hidden' } },
        S.map(s => h('div', { key: s.id, style: { padding: '11px 14px', borderTop: '1px solid ' + K.line, display: 'flex', flexDirection: 'column', gap: 4 } },
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }, R.mode === 'sequential' && h('b', null, s.sign_order + '.'), h('b', { style: { fontSize: 14 } }, s.name), h('span', { style: { color: K.mut, fontSize: 13 } }, s.role + (s.required ? '' : ' · optional')), h(StatusChip, { status: sTone(s.status), text: SIGNER_LABEL[s.status] }), open && can && ['notified', 'viewed'].includes(s.status) && h(Btn, { small: true, disabled: !!busy, onClick: () => run('r' + s.id, () => api('remind', { request_id: R.id, signer_id: s.id }), 'Reminder sent to ' + s.email) }, busy === 'r' + s.id ? '…' : 'Remind')),
          h('div', { style: { fontSize: 12.5, color: K.mut } }, s.email + (s.phone ? ' · ' + s.phone : '')),
          h('div', { style: { fontSize: 12.5, color: K.txt } }, [s.notified_at && 'Invited ' + when(s.notified_at), s.viewed_at && 'opened ' + when(s.viewed_at), s.signed_at && 'signed ' + when(s.signed_at), s.declined_at && 'declined ' + when(s.declined_at), s.reminders && s.reminders + ' reminder(s)'].filter(Boolean).join(' · ') || 'Not invited yet'),
          s.pending && h('div', { style: { fontSize: 12.5, color: s.status === 'declined' ? K.red : '#8A5A00' } }, s.pending)))),
      err && h(Notice, { red: true }, err),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        open && can && h(Btn, { disabled: !!busy, onClick: () => run('rem', () => api('remind', { request_id: R.id }), r => 'Reminder sent to ' + r.sent.join(', ')) }, busy === 'rem' ? '…' : 'Send reminders'),
        open && can && h(Btn, { danger: true, disabled: !!busy, onClick: () => { if (window.confirm('Cancel this signing request? Every signing link stops working immediately.')) run('cancel', () => api('cancel', { request_id: R.id }), 'Request cancelled'); } }, 'Cancel request'),
        R.status === 'completed' && h(Btn, { primary: true, disabled: !!busy, onClick: () => dl('signed') }, busy === 'dlsigned' ? '…' : 'Download signed PDF'),
        R.original_path !== '' && R.sent_at && h(Btn, { disabled: !!busy, onClick: () => dl('original') }, 'Original'),
        R.sent_at && h(Btn, { disabled: !!busy, onClick: () => run('ver', () => api('verify', { request_id: R.id }), r => r.ok ? 'Integrity verified: the documents and the audit trail are unchanged.' : 'WARNING: a stored document or the audit trail does not match its record.') }, busy === 'ver' ? '…' : 'Verify integrity'),
        h(Btn, { onClick: () => setShowAudit(!showAudit) }, showAudit ? 'Hide audit trail' : 'Audit trail'), h(Btn, { onClick: () => { loadList(app, tpl); load(); } }, 'Refresh')),
      showAudit && d && h('div', { style: { maxHeight: 220, overflowY: 'auto', border: '1px solid ' + K.line, borderRadius: 8, padding: '8px 12px', fontSize: 12, lineHeight: 1.7, color: K.txt } }, d.events.map(e => h('div', { key: e.id }, h('span', { style: { color: K.mut } }, when(e.at) + ' · '), h('b', null, e.type.replace(/_/g, ' ')), ' · ' + e.actor + (e.ip ? ' · ' + e.ip : '')))),
      R.status === 'completed' && h(Notice, null, NOTE));
  }

  /* ---------- entry points used by the Drafting Studio ---------- */
  function openStatus(app, tpl) { app.modal(() => h(Modal, { title: 'Signing status', sub: app.tplNames[tpl], onClose: () => app.modal(null), width: 640 }, h(StatusPanel, { app, tpl }))); }
  function openSend(app, tpl) {
    const html = snapshot(app), title = app.tplNames[tpl] === 'Section 138 notice' ? 'Legal notice, s.138 NI Act' : app.tplNames[tpl];
    app.modal(() => h(Modal, { title: 'Send for signature', sub: 'Final preview', onClose: () => app.modal(null), width: 660 }, h(SendDialog, { app, tpl, html, title })));
  }
  function gate(app) {
    const c = store.cfg;
    if (!LSB.on) { V.infoBox(app, 'Electronic signing needs the online workspace', 'Sign in to a Legal Staff firm workspace to send documents for signature. Signing is not available when the app runs without a server.'); return false; }
    if (!c) { app.toast('Checking electronic signing…'); loadCfg(app); return false; }
    if (!c.enabled) { V.infoBox(app, 'Electronic signing is not switched on', 'Legal Staff has not switched on electronic signing yet. It will appear here as soon as it is available.'); return false; }
    if (!c.plan_ok) { V.infoBox(app, 'Electronic signing is a Professional feature', 'Electronic signing is part of the Professional plan, like the Drafting Studio. Upgrade from Pricing to use it.'); return false; }
    return true;
  }
  const LSE = {
    open(app, tpl) { if (!gate(app)) return; const html = snapshot(app); if (!html.trim()) return app.toast('The document is empty.'); app.esMode = { tpl, html, id: Date.now() }; app.setState(s => ({ esn: (s.esn || 0) + 1 })); },
    close(app) { app.esMode = null; app.setState(s => ({ esn: (s.esn || 0) + 1 })); },
    send(app, tpl) { if (!gate(app)) return; const r = latest(tpl); if (!r || r.status !== 'prepared') { V.infoBox(app, 'Prepare the document first', 'Use Prepare for Signature to add the signers and place the signature fields. Then come back to Send for Signature.'); return; } openSend(app, tpl); },
    status(app, tpl) { if (!LSB.on) return gate(app); openStatus(app, tpl); },
    /* The three toolbar buttons and the status chip. */
    Bar: ({ app, tpl }) => { useStore(); useEffect(() => { loadCfg(app); }, [app.db.firmId]); useEffect(() => { loadList(app, tpl); }, [tpl, app.db.firmId]);
      const r = latest(tpl), base = { className: 'ls-btn', style: { whiteSpace: 'nowrap', height: 36, padding: '0 14px', background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 13.5, color: '#0A0A0A' } };
      return h(React.Fragment, null, h('button', Object.assign({ type: 'button', onClick: () => LSE.open(app, tpl) }, base), 'Prepare for Signature'), h('button', Object.assign({ type: 'button', onClick: () => LSE.send(app, tpl) }, base), 'Send for Signature'), h('button', Object.assign({ type: 'button', onClick: () => LSE.status(app, tpl) }, base), 'View Signing Status')); },
    Chip: ({ app, tpl }) => { useStore(); const r = latest(tpl); return h(StatusChip, { status: r ? r.status : 'draft' }); },
    /* Right-hand card of the editor: the document's signing status at a glance. */
    Card: ({ app, tpl }) => { useStore(); const r = latest(tpl); if (!LSB.on || !store.cfg || !store.cfg.enabled) return null;
      return h('div', { style: { background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: 12, padding: 20 } },
        h('div', { style: { fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: 600, marginBottom: 10 } }, 'Electronic signature'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 } }, h(StatusChip, { status: r ? r.status : 'draft' }), r && h('span', { style: { fontSize: 12.5, color: K.mut } }, when(r.created_at))),
        r ? (r.signers || []).map(s => h('div', { key: s.id, style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '4px 0', alignItems: 'center' } }, h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, s.name), h(StatusChip, { status: sTone(s.status), text: s.status === 'pending' ? 'Waiting' : s.status === 'notified' ? 'Sent' : SIGNER_LABEL[s.status] }))) : h('div', { style: { fontSize: 13, color: K.mut } }, 'Prepare this document, add signers and send it. The status shows here.'),
        h('div', { style: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' } }, r && h(Btn, { small: true, onClick: () => LSE.status(app, tpl) }, 'Details'), r && r.status === 'completed' && h(Btn, { small: true, primary: true, onClick: () => api('download', { request_id: r.id }).then(x => saveFile(x.pdf, x.filename)).catch(e => app.toast(e.message)) }, 'Download signed PDF'))); },
    /* The in-editor preparation mode. */
    Pane: ({ app, tpl, mode, title }) => h(Prepare, { key: mode.id, app, tpl, html: mode.html, title, onExit: () => LSE.close(app), onSend: () => { LSE.close(app); openSend(app, tpl); } }),
    store, loadCfg, loadList
  };
  window.LSE = LSE;
})();

/* Legal Staff — Drafting Studio: eStamp record, electronic signatures, document automation, sealing and audit trail.
   Pure helpers are testable without a browser (tests/sign.test.mjs). UI pieces use the kit in app-views.js (window.LSV).

   What this is, and is not:
   - Signatures are drawn, typed or uploaded images captured on this device, with consent, time and an audit trail.
     They are not Aadhaar eSign or a Digital Signature Certificate; those need a licensed provider (an ASP or a CA).
   - eStamp records the details of a stamp you bought from SHCIL or your state's authorised portal. No duty is calculated
     here: rates differ by state and instrument, and a wrong figure on a document is worse than none.
   - Sealing fixes the text, stamp and signatures with a SHA-256 fingerprint; Verify recomputes it. */
(function () {
  'use strict';
  const NODE = typeof window === 'undefined';
  const G = {};

  /* ---------- pure helpers ---------- */
  const hex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const subtle = () => (NODE ? require('node:crypto').webcrypto : crypto).subtle;
  G.sha256 = async s => hex(await subtle().digest('SHA-256', new TextEncoder().encode(String(s))));
  G.plain = html => String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  G.placeholders = html => { const seen = [], re = /\[[^\[\]\n]{1,160}\]/g; let m; const t = G.plain(html); while ((m = re.exec(t))) if (!seen.includes(m[0])) seen.push(m[0]); return seen; };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  /* Replaces every occurrence of each placeholder (matched in text, never inside a tag). values: { '[name]': 'text' } */
  G.fill = (html, values) => String(html).replace(/(<[^>]*>)|([^<]+)/g, (all, tag, text) => {
    if (tag) return tag;
    return text.replace(/\[[^\[\]\n]{1,160}\]/g, p => {
      const raw = p.replace(/&amp;/g, '&');
      const v = values[p] != null ? values[p] : values[raw];
      return v != null && String(v).trim() ? esc(String(v).trim()) : p;
    });
  });
  /* Best-effort suggestions from the case record. The user always reviews them. */
  G.suggest = (phs, c, client) => {
    const out = {}, sides = c && c.title ? c.title.split(/\s+(?:v\/s|vs\.?|versus|v\.)\s+/i) : [];
    phs.forEach(p => { const k = p.slice(1, -1).toLowerCase();
      if (/case type and number|case number/.test(k) && c && c.no) out[p] = c.no;
      else if (/name of (the )?(petitioner|plaintiff|applicant|appellant)/.test(k) && sides[0]) out[p] = sides[0].trim();
      else if (/name of (the )?(respondent|defendant)/.test(k) && sides[1]) out[p] = sides[1].trim();
      else if (/^name (and address )?of client|^name of my client|^client$/.test(k) && client && client.name) out[p] = client.name;
      else if (/^place$/.test(k) && c && c.court) out[p] = c.court.replace(/^.*?,\s*/, ''); });
    return out;
  };
  /* What the fingerprint covers: the text, the stamp record and every signature (image included, by its own hash). */
  G.fingerprint = async v => {
    const sg = await Promise.all((v.signers || []).map(async s => ({ n: s.name, r: s.role, o: s.order, at: s.signedAt || '', m: s.method || '', i: s.sigImg ? await G.sha256(s.sigImg) : '' })));
    return G.sha256(JSON.stringify({ t: G.plain(v.html), ref: v.ref || '', stamp: v.stamp || null, sg }));
  };
  G.docId = hash => 'LSD-' + hash.slice(0, 12).toUpperCase().match(/.{4}/g).join('-');
  G.locked = v => !!(v && (v.seal || (v.signers || []).some(s => s.sigImg)));
  G.signedCount = v => (v && v.signers || []).filter(s => s.sigImg).length;
  G.STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];
  G.INSTRUMENTS = ['Affidavit', 'Agreement', 'Power of attorney', 'Indemnity bond', 'Lease / rent deed', 'Sale deed', 'Settlement deed', 'Other instrument'];
  G.ISSUERS = ['SHCIL e-Stamp', 'State e-stamp portal', 'Franking', 'Physical stamp paper'];
  G.ROLES = ['Advocate', 'Client', 'Deponent', 'First party', 'Second party', 'Witness', 'Notary'];
  G.stampValid = s => !!(s && s.state && s.certNo && +s.amount > 0);
  G.refNo = (tplCode, count, d) => 'LS/' + tplCode + '/' + (d || new Date()).getFullYear() + '/' + String(count + 1).padStart(4, '0');
  G.TPL_CODE = ['LN', 'PET', 'S138', 'BAIL', 'AFF', 'WS', 'RPL', 'APL', 'REV', 'AGR'];

  if (NODE) { module.exports = G; return; }
  window.LSG = G;

  /* ---------- UI ---------- */
  const V = window.LSV, L = window.LS, h = React.createElement, useState = React.useState, useRef = React.useRef, useEffect = React.useEffect, K = V.K;
  const SERIF = "'Times New Roman','Noto Serif',Georgia,serif";
  const stamp = () => L.today() + ' ' + L.nowHM();
  const fmt = at => at ? L.dmy(at.slice(0, 10)) + ' at ' + at.slice(11) + ' IST' : '';
  const note = t => h('div', { style: { fontSize: 12.5, color: K.mut, lineHeight: 1.5 } }, t);
  const log = (x, who, what) => { (x.audit = x.audit || []).push({ at: stamp(), who, what }); };

  /* Signature pad: draw, type or upload. Calls onDone({ img, method }). */
  function SignPad({ name, onDone, onClose, title }) {
    const [tab, setTab] = useState('draw'), [typed, setTyped] = useState(name || ''), [up, setUp] = useState(''), [ok, setOk] = useState(false), [err, setErr] = useState(''), [inked, setInked] = useState(false);
    const cv = useRef(null), st = useRef({ down: false });
    const W = 440, H = 150;
    useEffect(() => { const c = cv.current; if (!c || tab !== 'draw') return; const x = c.getContext('2d'); x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0B1F4B'; }, [tab]);
    const pt = e => { const r = cv.current.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    const down = e => { e.preventDefault(); cv.current.setPointerCapture && cv.current.setPointerCapture(e.pointerId); const x = cv.current.getContext('2d'), [px, py] = pt(e); st.current = { down: true }; x.beginPath(); x.moveTo(px, py); x.lineTo(px + .1, py + .1); x.stroke(); setInked(true); };
    const move = e => { if (!st.current.down) return; const x = cv.current.getContext('2d'), [px, py] = pt(e); x.lineTo(px, py); x.stroke(); };
    const up_ = () => { st.current.down = false; };
    const clear = () => { const c = cv.current; c.getContext('2d').clearRect(0, 0, W, H); setInked(false); };
    const typedImg = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#0B1F4B'; x.textBaseline = 'middle'; let fs = 62; x.font = `italic ${fs}px 'Segoe Script','Brush Script MT','Snell Roundhand',cursive`; while (x.measureText(typed).width > W - 24 && fs > 20) { fs -= 4; x.font = `italic ${fs}px 'Segoe Script','Brush Script MT','Snell Roundhand',cursive`; } x.fillText(typed, 12, H / 2); return c.toDataURL('image/png'); };
    const pickUp = async () => { const [f] = await L.pickFile('image/png,image/jpeg'); if (!f) return; if (f.size > 4 * 1048576) return setErr('Use an image under 4 MB.');
      const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
      const im = new Image(); im.onload = () => { const k = Math.min(1, W / im.width, H / im.height), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); setUp(c.toDataURL('image/png')); setErr(''); }; im.onerror = () => setErr('That image could not be read.'); im.src = url; };
    const apply = () => { setErr('');
      if (!ok) return setErr('Tick the consent box to apply your signature.');
      if (tab === 'draw') { if (!inked) return setErr('Draw your signature in the box.'); return onDone({ img: cv.current.toDataURL('image/png'), method: 'Drawn signature' }); }
      if (tab === 'type') { if (typed.trim().length < 2) return setErr('Type your full name.'); return onDone({ img: typedImg(), method: 'Typed signature' }); }
      if (!up) return setErr('Choose an image of the signature.'); onDone({ img: up, method: 'Uploaded signature image' }); };
    const tabBtn = (k, t) => h('button', { key: k, type: 'button', role: 'tab', 'aria-selected': tab === k, onClick: () => { setTab(k); setErr(''); }, style: { flex: 1, height: 34, border: 0, borderRadius: 7, background: tab === k ? '#fff' : 'transparent', fontWeight: tab === k ? 600 : 400, fontSize: 13.5, boxShadow: tab === k ? '0 1px 2px rgba(0,0,0,.12)' : 'none' } }, t);
    return h(V.Modal, { title: title || 'Apply signature', sub: name ? 'Signing as ' + name : null, onClose, width: 500 },
      h('div', { role: 'tablist', style: { display: 'flex', gap: 4, background: K.soft2, padding: 4, borderRadius: 9 } }, tabBtn('draw', 'Draw'), tabBtn('type', 'Type'), tabBtn('upload', 'Upload')),
      tab === 'draw' && h('div', null, h('canvas', { ref: cv, width: W, height: H, 'aria-label': 'Signature drawing area', onPointerDown: down, onPointerMove: move, onPointerUp: up_, onPointerLeave: up_, style: { width: '100%', height: 'auto', aspectRatio: W + '/' + H, border: '1px dashed #9A9A9A', borderRadius: 8, background: '#FCFCFB', touchAction: 'none', cursor: 'crosshair', display: 'block' } }), h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 6 } }, note('Draw with a mouse, finger or stylus.'), h('button', { type: 'button', onClick: clear, style: { border: 0, background: 'none', fontSize: 12.5, textDecoration: 'underline', color: K.mut } }, 'Clear'))),
      tab === 'type' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, h('input', { value: typed, onChange: e => setTyped(e.target.value), placeholder: 'Full name', 'aria-label': 'Full name', style: V.X.input }), h('div', { style: { height: H, border: '1px dashed #9A9A9A', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 16px', fontFamily: "'Segoe Script','Brush Script MT','Snell Roundhand',cursive", fontStyle: 'italic', fontSize: 38, color: '#0B1F4B', overflow: 'hidden', whiteSpace: 'nowrap' } }, typed)),
      tab === 'upload' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' } }, h(V.Btn, { onClick: pickUp }, up ? 'Choose another image' : 'Choose signature image'), up && h('img', { src: up, alt: 'Signature preview', style: { maxWidth: '100%', maxHeight: H, border: '1px solid ' + K.line, borderRadius: 8, background: '#fff' } }), note('Use a scan or photo of a wet-ink signature on plain white paper (PNG or JPG).')),
      h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer' } }, h('input', { type: 'checkbox', checked: ok, onChange: e => setOk(e.target.checked), style: { marginTop: 3 } }), 'I agree to apply this electronic signature to the document, and I understand it is recorded with the date, time and method.'),
      err && h('div', { role: 'alert', style: { fontSize: 13, color: K.red } }, err),
      h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, h(V.Btn, { onClick: onClose }, 'Cancel'), h(V.Btn, { primary: true, onClick: apply }, 'Apply signature')));
  }

  /* ---------- eStamp ---------- */
  G.estamp = (app, tpl, idx) => {
    const x = app.db.drafts[tpl][idx], cur = x.stamp || {};
    app.modal(() => h(V.Modal, { title: 'eStamp details', sub: 'Record the stamp you bought for this document', onClose: () => app.modal(null), width: 540 },
      h(V.Form, { init: { state: cur.state || '', instrument: cur.instrument || G.INSTRUMENTS[0], amount: cur.amount || '', certNo: cur.certNo || '', issuer: cur.issuer || G.ISSUERS[0], by: cur.by || app.db.user.name, date: cur.date || L.today() }, submit: 'Add to document', onCancel: () => app.modal(null),
        note: 'Buy the stamp from SHCIL (stockholding.com) or your state\'s authorised e-stamp portal, then enter its details here. Legal Staff does not calculate duty: it differs by state and instrument, so check the amount against the State Stamp Act.',
        fields: [{ k: 'state', label: 'State / UT of the stamp', type: 'select', blank: 'Choose…', options: G.STATES, req: true, half: true }, { k: 'instrument', label: 'Instrument', type: 'select', options: G.INSTRUMENTS, half: true },
          { k: 'amount', label: 'Stamp duty paid (₹)', type: 'number', req: true, half: true }, { k: 'issuer', label: 'Issued through', type: 'select', options: G.ISSUERS, half: true },
          { k: 'certNo', label: 'Certificate / stamp paper no.', req: true, ph: 'e.g. IN-DL12345678901234X', half: true }, { k: 'date', label: 'Date of purchase', type: 'date', req: true, half: true },
          { k: 'by', label: 'Purchased by', req: true }],
        onSubmit: v => { app.mut(db => { const y = db.drafts[tpl][idx]; if (G.locked(y)) return; y.stamp = { state: v.state, instrument: v.instrument, amount: String(v.amount).replace(/,/g, ''), certNo: v.certNo.trim(), issuer: v.issuer, by: v.by.trim(), date: v.date }; log(y, db.user.name, 'eStamp recorded: ' + v.issuer + ', ₹' + v.amount + ', certificate ' + v.certNo.trim()); V.logIt(db, 'eStamp recorded on ' + app.tplNames[tpl] + ' by ' + db.user.name); }, 'eStamp added to the document'); app.modal(null); } })));
  };
  G.removeStamp = (app, tpl, idx) => V.confirmBox(app, 'Remove the eStamp?', 'The stamp details are removed from this version of the document.', 'Remove', () => app.mut(db => { const y = db.drafts[tpl][idx]; if (G.locked(y)) return; delete y.stamp; log(y, db.user.name, 'eStamp removed'); }, 'eStamp removed'));

  /* ---------- document automation: fill every [placeholder] from one form ---------- */
  G.automate = (app, tpl, html, caseId, onSave) => {
    const phs = G.placeholders(html);
    if (!phs.length) return app.toast('No [placeholders] left to fill in this document.');
    const c = app.db.cases.find(k => k.id === caseId) || app.db.cases[0], client = c && app.db.clients.find(k => k.id === c.clientId);
    const sug = G.suggest(phs, c, client);
    const Body = () => { const [v, setV] = useState(() => Object.assign({}, sug)), n = phs.filter(p => (v[p] || '').trim()).length;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        note('Each field below is a [placeholder] in the document. Fill what you know; it is replaced everywhere it appears. Anything left blank stays as a placeholder. Suggestions come from the case record, so check them.'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '48vh', overflowY: 'auto', paddingRight: 4 } }, phs.map((p, i) => h('div', { key: p, style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          h('label', { htmlFor: 'ph' + i, style: { fontSize: 13, color: K.txt } }, p.slice(1, -1)), h('input', { id: 'ph' + i, value: v[p] || '', onChange: e => setV(Object.assign({}, v, { [p]: e.target.value })), placeholder: sug[p] ? '' : 'Enter value', style: V.X.input })))),
        h('div', { style: { display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' } }, h('span', { style: { fontSize: 13, color: K.mut } }, n + ' of ' + phs.length + ' filled'),
          h('span', { style: { display: 'flex', gap: 10 } }, h(V.Btn, { onClick: () => app.modal(null) }, 'Cancel'), h(V.Btn, { primary: true, disabled: !n, onClick: () => { app.modal(null); onSave(G.fill(html, v), n); } }, 'Fill document'))));
    };
    app.modal(() => h(V.Modal, { title: 'Fill details', sub: phs.length + ' placeholder' + (phs.length > 1 ? 's' : '') + ' found', onClose: () => app.modal(null), width: 540 }, h(Body)));
  };

  /* ---------- signatures ---------- */
  G.signers = (app, tpl, idx) => {
    const Body = () => { const [, bump] = useState(0), [adding, setAdding] = useState(false), [pad, setPad] = useState(null), x = app.db.drafts[tpl][idx], list = x.signers || [], lock = !!x.seal;
      const refresh = () => bump(n => n + 1);
      const canSign = s => !x.sequential || list.filter(o => o.order < s.order).every(o => o.sigImg);
      const sign = (s, r) => { app.mut(db => { const y = db.drafts[tpl][idx], t = y.signers.find(q => q.id === s.id); if (!t || t.sigImg || y.seal) return; t.sigImg = r.img; t.method = r.method; t.signedAt = stamp(); log(y, t.name, 'Signed as ' + t.role + ' (' + r.method + ')'); V.logIt(db, t.name + ' signed the ' + app.tplNames[tpl]); }, s.name + ' has signed'); setPad(null); refresh(); };
      const del = s => { app.mut(db => { const y = db.drafts[tpl][idx]; y.signers = y.signers.filter(q => q.id !== s.id).map((q, i) => Object.assign(q, { order: i + 1 })); log(y, db.user.name, 'Signer removed: ' + s.name); }, 'Signer removed'); refresh(); };
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        note('Add everyone who must sign. Each signer applies their signature on this device, with the signer present. Once the first signature is applied the text is locked.'),
        !list.length && h('div', { style: { fontSize: 14, color: K.mut, padding: '8px 0' } }, 'No signers yet.'),
        list.map(s => h('div', { key: s.id, style: { display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px solid ' + K.line, flexWrap: 'wrap' } },
          h('span', { style: { width: 24, height: 24, borderRadius: 12, background: K.soft2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 } }, s.order),
          h('div', { style: { flex: '1 1 160px', minWidth: 0 } }, h('div', { style: { fontSize: 14, fontWeight: 500 } }, s.name), h('div', { style: { fontSize: 12, color: K.mut } }, s.role + (s.email ? ' · ' + s.email : '') + (s.signedAt ? ' · signed ' + fmt(s.signedAt) : ''))),
          s.sigImg ? h(V.Chip, null, '✓ Signed') : h(V.Chip, { tone: 'grey' }, 'Pending'),
          !s.sigImg && h(V.Btn, { small: true, primary: true, disabled: !canSign(s), title: canSign(s) ? '' : 'Waiting for the earlier signer', onClick: () => setPad(s) }, 'Sign now'),
          !s.sigImg && !lock && h(V.IconBtn, { label: 'Remove ' + s.name, danger: true, onClick: () => del(s) }, '×'))),
        !lock && (adding ? h(V.Form, { submit: 'Add signer', onCancel: () => setAdding(false), init: { role: G.ROLES[0] },
          fields: [{ k: 'name', label: 'Full name', req: true, half: true }, { k: 'role', label: 'Capacity', type: 'select', options: G.ROLES, half: true }, { k: 'email', label: 'Email (optional)', type: 'email', half: true }],
          onSubmit: v => { app.mut(db => { const y = db.drafts[tpl][idx]; (y.signers = y.signers || []).push({ id: L.uid('sg'), name: v.name.trim(), role: v.role, email: (v.email || '').trim(), order: y.signers.length + 1 }); log(y, db.user.name, 'Signer added: ' + v.name.trim() + ' (' + v.role + ')'); }, 'Signer added'); setAdding(false); refresh(); } })
          : h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } }, h(V.Btn, { onClick: () => setAdding(true) }, '+ Add signer'), list.length > 1 && h('label', { style: { fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' } }, h('input', { type: 'checkbox', checked: !!x.sequential, onChange: e => { const on = e.target.checked; app.mut(db => { db.drafts[tpl][idx].sequential = on; }); refresh(); } }), 'Sign in order'))),
        note('Remote signing links need an eSign service, which is not connected to this workspace yet. To collect a signature from someone who is not here, export the PDF, have it signed, and upload a scan of their signature.'),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h(V.Btn, { primary: true, onClick: () => app.modal(null) }, 'Done')),
        pad && h(SignPad, { name: pad.name, title: 'Sign as ' + pad.role, onClose: () => setPad(null), onDone: r => sign(pad, r) }));
    };
    app.modal(() => h(V.Modal, { title: 'Signatures', onClose: () => app.modal(null), width: 580 }, h(Body)));
  };

  /* ---------- sealing and verification ---------- */
  G.seal = (app, tpl, idx) => {
    const x = app.db.drafts[tpl][idx], n = (x.signers || []).length, done = G.signedCount(x), ph = G.placeholders(x.html).length;
    const issues = [ph && ph + ' [placeholder' + (ph > 1 ? 's' : '') + '] still unfilled', n && done < n && (n - done) + ' of ' + n + ' signatures pending', !n && 'No signers added'].filter(Boolean);
    V.confirmBox(app, 'Seal this document?', (issues.length ? 'Open items: ' + issues.join('; ') + '. ' : '') + 'Sealing fixes the text, stamp and signatures with a SHA-256 fingerprint and locks this version. To change anything afterwards you make an editable copy.', 'Seal document', async () => {
      const y = app.db.drafts[tpl][idx]; if (y.seal) return;
      const hash = await G.fingerprint(y);
      app.mut(db => { const z = db.drafts[tpl][idx]; z.seal = { hash, id: G.docId(hash), at: stamp(), by: db.user.name }; log(z, db.user.name, 'Document sealed · ' + z.seal.id); V.logIt(db, db.user.name + ' sealed the ' + app.tplNames[tpl] + ' · ' + z.seal.id); }, 'Document sealed');
    });
  };
  G.verify = async (app, tpl, idx) => {
    const x = app.db.drafts[tpl][idx]; if (!x.seal) return;
    const now = await G.fingerprint(x), ok = now === x.seal.hash;
    app.modal(() => h(V.Modal, { title: ok ? 'Document verified' : 'Verification failed', onClose: () => app.modal(null), width: 520 },
      h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start' } }, h('span', { style: { width: 36, height: 36, borderRadius: 18, background: ok ? '#E6F4EA' : K.redBg, color: ok ? '#137333' : K.red, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 } }, ok ? '✓' : '!'),
        h('div', { style: { fontSize: 14, lineHeight: 1.6 } }, ok ? 'The text, stamp and signatures are exactly as they were when the document was sealed.' : 'The document no longer matches the fingerprint taken when it was sealed. Do not rely on this copy.')),
      h('div', { style: { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5, wordBreak: 'break-all', background: K.soft, borderRadius: 8, padding: '10px 12px', lineHeight: 1.7 } }, 'Document ID  ' + x.seal.id, h('br'), 'Sealed       ' + fmt(x.seal.at), h('br'), 'Sealed hash  ' + x.seal.hash, h('br'), 'Hash now     ' + now),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h(V.Btn, { primary: true, onClick: () => app.modal(null) }, 'Close'))));
  };

  /* ---------- on the sheet: letterhead, stamp block, signature blocks, seal certificate ---------- */
  const lab = { fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: '#555', fontFamily: 'system-ui,sans-serif' };
  G.stampBlock = x => {
    const s = x && x.stamp; if (!s) return null;
    return h('div', { contentEditable: false, className: 'ls-stampbox', style: { border: '2px solid #7A1F1F', outline: '1px solid #7A1F1F', outlineOffset: 3, margin: '4px 4px 24px', padding: '12px 16px', color: '#4A1010', background: 'repeating-linear-gradient(135deg,#FFF9F9 0 6px,#FFF4F4 6px 12px)', fontFamily: SERIF, breakInside: 'avoid' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' } }, h('span', { style: { fontWeight: 700, letterSpacing: '.12em', fontSize: 14 } }, 'NON-JUDICIAL STAMP · ' + s.state.toUpperCase()), h('span', { style: { fontWeight: 700, fontSize: 18 } }, '₹ ' + Number(s.amount).toLocaleString('en-IN') + '/-')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '8px 18px', marginTop: 10, fontSize: 13 } },
        [['Certificate no.', s.certNo], ['Instrument', s.instrument], ['Issued through', s.issuer], ['Purchased by', s.by], ['Date', L.dmy(s.date)]].map(([k, v]) => h('div', { key: k }, h('div', { style: lab }, k), h('div', { style: { fontWeight: 600, wordBreak: 'break-all' } }, v)))),
      h('div', { style: { fontSize: 10.5, marginTop: 8, color: '#7A1F1F', fontFamily: 'system-ui,sans-serif' } }, 'Details recorded by the advocate from the stamp purchased. Check the certificate against the issuer\'s portal.'));
  };
  G.signBlock = x => {
    const list = x && x.signers || []; if (!list.length) return null;
    return h('div', { contentEditable: false, style: { marginTop: 36, breakInside: 'avoid' } }, h('div', { style: Object.assign({}, lab, { marginBottom: 10 }) }, 'Signatures'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 22 } }, list.map(s => h('div', { key: s.id, style: { breakInside: 'avoid' } },
        h('div', { style: { height: 66, borderBottom: '1px solid #1A1A1A', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start' } }, s.sigImg ? h('img', { src: s.sigImg, alt: 'Signature of ' + s.name, style: { maxHeight: 62, maxWidth: '100%', display: 'block' } }) : h('span', { style: { fontSize: 11.5, color: '#9A9A9A', fontStyle: 'italic', fontFamily: 'system-ui,sans-serif', paddingBottom: 4 } }, 'Awaiting signature')),
        h('div', { style: { fontWeight: 600, marginTop: 6, fontSize: 14 } }, s.name), h('div', { style: { fontSize: 12.5, color: '#444' } }, s.role),
        s.sigImg && h('div', { style: { fontSize: 10.5, color: '#555', marginTop: 3, fontFamily: 'system-ui,sans-serif', lineHeight: 1.45 } }, 'Signed electronically · ' + s.method, h('br'), fmt(s.signedAt))))));
  };
  G.sealBlock = x => {
    if (!x || !x.seal) return null; const a = x.audit || [];
    return h('div', { contentEditable: false, className: 'ls-cert', style: { textAlign: 'left', marginTop: 44, border: '1.5px solid #0B1F4B', padding: '16px 20px', fontFamily: 'system-ui,sans-serif', fontSize: 12, color: '#0B1F4B', breakInside: 'avoid', pageBreakBefore: 'auto' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { fontWeight: 700, letterSpacing: '.14em', fontSize: 12.5 } }, 'CERTIFICATE OF COMPLETION'), h('span', { style: { fontWeight: 700, border: '1.5px solid #0B1F4B', padding: '2px 10px', letterSpacing: '.1em', fontSize: 11 } }, '✓ SEALED')),
      h('div', { style: { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, marginTop: 10, lineHeight: 1.75, wordBreak: 'break-all' } }, 'Document ID  ' + x.seal.id, h('br'), 'Reference    ' + (x.ref || '—'), h('br'), 'Sealed on    ' + fmt(x.seal.at) + ' by ' + x.seal.by, h('br'), 'SHA-256      ' + x.seal.hash),
      h('div', { style: Object.assign({}, lab, { marginTop: 12, color: '#0B1F4B' }) }, 'Audit trail'),
      h('table', { style: { width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 11 } }, h('tbody', null, a.map((e, i) => h('tr', { key: i, style: { borderTop: '1px solid #C9D2E6' } }, h('td', { style: { padding: '3px 8px 3px 0', whiteSpace: 'nowrap', verticalAlign: 'top' } }, fmt(e.at)), h('td', { style: { padding: '3px 0' } }, e.what + (e.who ? ' — ' + e.who : '')))))),
      h('div', { style: { marginTop: 10, fontSize: 10.5, color: '#4A5A80', lineHeight: 1.5 } }, 'The fingerprint covers the text, the stamp record and every signature. Anyone holding the sealed document can ask the advocate to run Verify in Legal Staff to confirm it is unchanged. Signatures are electronic signatures captured with consent; they are not Aadhaar eSign or a Digital Signature Certificate.'));
  };

  /* ---------- side panel: Sign & secure ---------- */
  G.panel = ({ app, tpl, vi, cur, saved, dirty, ensure, html, caseId, canEdit }) => {
    const s = cur && cur.stamp, sg = cur && cur.signers || [], done = G.signedCount(cur), lock = G.locked(cur), sealed = !!(cur && cur.seal);
    const row = (ok, title, sub, btns) => h('div', { key: title, style: { display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid ' + K.line, alignItems: 'flex-start' } },
      h('span', { style: { width: 22, height: 22, borderRadius: 11, flexShrink: 0, marginTop: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: ok ? K.ink : '#fff', color: ok ? '#fff' : K.mut, border: ok ? 0 : '1px solid #BDBDBD' } }, ok ? '✓' : ''),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontSize: 14, fontWeight: 500 } }, title), h('div', { style: { fontSize: 12.5, color: K.mut, margin: '2px 0 6px', lineHeight: 1.45 } }, sub), h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, btns)));
    const go = fn => async () => { const i = ensure(); if (i == null) return; fn(i); };
    const hasPh = G.placeholders(html).length;
    return h('div', { style: { background: '#FFFFFF', border: '1px solid ' + K.line, borderRadius: 12, padding: '18px 20px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } }, h('div', { style: { fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: 600 } }, 'Sign & secure'), sealed ? h(V.Chip, null, '✓ Sealed') : lock ? h(V.Chip, { tone: 'grey' }, 'Locked for signing') : null),
      sealed && h('div', { style: { fontSize: 12.5, color: K.txt, background: K.soft, borderRadius: 8, padding: '8px 10px', marginBottom: 6, lineHeight: 1.6, wordBreak: 'break-all' } }, h('b', null, cur.seal.id), h('br'), 'Sealed ' + fmt(cur.seal.at)),
      row(hasPh === 0, 'Fill details', hasPh ? hasPh + ' placeholder' + (hasPh > 1 ? 's' : '') + ' to fill from one form' : 'Every placeholder is filled', canEdit && !lock ? [h(V.Btn, { key: 'f', small: true, disabled: !hasPh, onClick: () => G.automate(app, tpl, html, caseId, (nh, n) => { const i = ensure(nh, 'Details filled'); if (i != null) app.toast(n + ' placeholder' + (n > 1 ? 's' : '') + ' filled. Saved as a new version.'); }) }, 'Fill details')] : []),
      row(!!s, 'eStamp', s ? s.state + ' · ₹' + Number(s.amount).toLocaleString('en-IN') + ' · ' + s.certNo : 'Record the stamp bought for this document', canEdit && !lock ? [h(V.Btn, { key: 's', small: true, onClick: go(i => G.estamp(app, tpl, i)) }, s ? 'Edit eStamp' : 'Add eStamp'), s && h(V.Btn, { key: 'r', small: true, onClick: () => G.removeStamp(app, tpl, vi) }, 'Remove')] : []),
      row(sg.length > 0 && done === sg.length, 'Signatures', sg.length ? done + ' of ' + sg.length + ' signed' : 'Add signers and collect signatures', canEdit && !sealed ? [h(V.Btn, { key: 'g', small: true, primary: !!sg.length && done < sg.length, onClick: go(i => G.signers(app, tpl, i)) }, sg.length ? 'Manage signatures' : 'Add signers')] : []),
      row(sealed, 'Seal', sealed ? 'Text, stamp and signatures are fixed' : 'Lock the document with a SHA-256 fingerprint', sealed ? [h(V.Btn, { key: 'v', small: true, primary: true, onClick: () => G.verify(app, tpl, vi) }, 'Verify integrity'), canEdit && h(V.Btn, { key: 'c', small: true, onClick: () => app.copyEditable && app.copyEditable() }, 'Editable copy')] : canEdit ? [h(V.Btn, { key: 'z', small: true, disabled: !sg.length, title: sg.length ? '' : 'Add at least one signer first', onClick: go(i => G.seal(app, tpl, i)) }, 'Seal document')] : []),
      lock && !sealed && canEdit && h('div', { style: { paddingTop: 8 } }, h(V.Btn, { small: true, onClick: () => app.copyEditable && app.copyEditable() }, 'Make editable copy (drops signatures)')),
      note('Signatures here are electronic signatures captured on this device. Aadhaar eSign and DSC need a licensed provider and are not part of this workspace.'));
  };
  G.auditCard = cur => {
    const a = cur && cur.audit || []; if (!a.length) return null;
    return h('div', { style: { background: '#FFFFFF', border: '1px solid ' + K.line, borderRadius: 12, padding: '18px 20px' } },
      h('div', { style: { fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: 600, marginBottom: 10 } }, 'Audit trail'),
      a.slice().reverse().map((e, i) => h('div', { key: i, style: { fontSize: 12.5, padding: '6px 0', borderTop: i ? '1px solid ' + K.line : 0, lineHeight: 1.45 } }, h('div', { style: { color: K.mut } }, fmt(e.at)), e.what)));
  };
})();

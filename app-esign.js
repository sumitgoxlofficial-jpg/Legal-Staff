/* Legal Staff — E-Sign module.
   What it does, all inside the app (no third party needed):
   - Signature requests for a document in the case file, with one or more signers, in parallel or in a fixed order.
   - Signing by drawing, typing or uploading a signature image, with an explicit consent and a signer confirmation.
   - Document fraud prevention: the SHA-256 of the file is sealed when the request is made and checked again before every
     signature; every event goes into a hash-chained audit trail; a Verify tool checks any file and any trail.
   - A Certificate of completion (self-contained HTML, printable to PDF) with the signatures, the hashes and the full trail.
   - Paperwork analytics: status, turnaround, ageing, and who is slow.
   - Stamp details (state, amount, e-stamp certificate number) recorded against a request and printed on the certificate.
   Not in here, because they need a licensed provider account and credentials: Aadhaar eSign through an ESP, NeSL, and buying
   e-stamps. Those show as "not connected" and are never faked. The signing happens on the device in front of the signer. */
(function () {
  'use strict';
  const V = window.LSV, L = window.LS; if (!V || !L) return;
  const { h, K, X, Btn, Card, Page, Table, Modal, Form, Chip, Select } = V;
  const { useState, useEffect, useRef } = React;

  /* ---------- crypto ---------- */
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const sha = async data => { if (!(window.crypto && crypto.subtle)) throw new Error('This browser cannot compute secure hashes (it needs https).'); return hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data)); };
  const fileHash = async blob => sha(await blob.arrayBuffer());
  const short = x => (x || '').slice(0, 10) + '…' + (x || '').slice(-6);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nowIso = () => new Date().toISOString();
  const when = ts => { try { return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ts; } };

  /* ---------- audit trail: each entry's hash covers the one before it ---------- */
  async function addAudit(env, who, act) {
    const prev = env.audit.length ? env.audit[env.audit.length - 1].hash : 'GENESIS', ts = nowIso();
    env.audit.push({ ts, who, act, prev, hash: await sha([prev, ts, who, act].join('|')) });
  }
  async function auditOk(env) {
    let prev = 'GENESIS';
    for (const a of env.audit || []) { if (a.prev !== prev || a.hash !== await sha([a.prev, a.ts, a.who, a.act].join('|'))) return false; prev = a.hash; }
    return true;
  }
  const sealOf = env => sha([env.hash, ...env.signers.map(s => (s.sigHash || '') + '@' + (s.signedAt || '')), env.audit.length ? env.audit[env.audit.length - 1].hash : ''].join('|'));

  /* ---------- state of a request ---------- */
  const status = e => e.status === 'sent' && e.expires && e.expires < L.today() ? 'expired' : e.status;
  const TONE = { draft: 'grey', sent: 'ink', completed: 'ink', declined: 'red', voided: 'grey', expired: 'red' };
  const LABEL = { draft: 'Draft', sent: 'Out for signature', completed: 'Completed', declined: 'Declined', voided: 'Cancelled', expired: 'Expired' };
  /* Whose turn it is: everyone pending (parallel), or only the first pending signer (in order). */
  const canSign = (e, s) => status(e) === 'sent' && s.status === 'pending' && (e.order !== 'sequential' || e.signers.find(x => x.status === 'pending') === s);
  const docsWithFile = d => d.docs.filter(x => x.file && x.kind !== 'evidence');
  const driveOn = app => !!(window.LSB && LSB.on && app.driveSt && app.driveSt.configured && app.driveSt.connected);
  /* The sealed copy lives under its own id, so editing or deleting the case document cannot change what was signed. */
  const storeCopy = (app, id, f) => !(window.LSB && LSB.on) ? L.files.put(id, f) : driveOn(app) ? LSB.drive.upload(id, f).then(dr => dr) : LSB.upload(id, f).then(() => null);
  const readCopy = (e) => (window.LSB && LSB.on ? (e.drive ? LSB.drive.download(e.drive) : LSB.download(e.fileId, e.fileName)) : L.files.get(e.fileId));
  const caseTitle = (d, id) => (d.cases.find(c => c.id === id) || {}).title || 'Not linked';
  const envOf = (app, id) => (app.db.esign || []).find(x => x.id === id);
  /* Run an async change on a request, then save it. The request is edited on the live record so the app's usual save and sync applies. */
  async function change(app, id, fn, msg) {
    const e = envOf(app, id); if (!e) return;
    const copy = JSON.parse(JSON.stringify(e)); await fn(copy);
    app.mut(db => { const i = db.esign.findIndex(x => x.id === id); if (i >= 0) db.esign[i] = copy; }, msg);
  }

  /* ---------- signature pad ---------- */
  function Pad({ onChange }) {
    const ref = useRef(null), st = useRef({ on: false, any: false });
    useEffect(() => { const c = ref.current, x = c.getContext('2d'); x.lineWidth = 2.6; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0A0A0A'; }, []);
    const pt = ev => { const c = ref.current, r = c.getBoundingClientRect(); return [(ev.clientX - r.left) * c.width / r.width, (ev.clientY - r.top) * c.height / r.height]; };
    const down = ev => { ev.preventDefault(); ref.current.setPointerCapture && ref.current.setPointerCapture(ev.pointerId); const x = ref.current.getContext('2d'), [px, py] = pt(ev); x.beginPath(); x.moveTo(px, py); x.lineTo(px + .01, py + .01); x.stroke(); st.current.on = true; };
    const move = ev => { if (!st.current.on) return; const x = ref.current.getContext('2d'), [px, py] = pt(ev); x.lineTo(px, py); x.stroke(); st.current.any = true; };
    const up = () => { if (!st.current.on) return; st.current.on = false; onChange(st.current.any ? ref.current.toDataURL('image/png') : ''); };
    const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); st.current.any = false; onChange(''); };
    return h('div', null, h('canvas', { ref, width: 600, height: 200, onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerLeave: up, style: { width: '100%', height: 150, border: '1px dashed ' + K.line, borderRadius: 10, background: '#fff', touchAction: 'none', cursor: 'crosshair', display: 'block' }, 'aria-label': 'Signature pad. Draw your signature here.' }),
      h('div', { style: { marginTop: 8 } }, h(Btn, { small: true, onClick: clear }, 'Clear')));
  }
  /* Typed signature, rendered to a picture so every method yields the same kind of image. */
  function typed(name) {
    const c = document.createElement('canvas'); c.width = 600; c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#0A0A0A'; x.textBaseline = 'middle';
    let size = 84; do { x.font = `italic ${size}px "Snell Roundhand","Segoe Script","Brush Script MT",cursive`; size -= 4; } while (x.measureText(name).width > 560 && size > 24);
    x.fillText(name, 20, 105); return c.toDataURL('image/png');
  }
  const readImg = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'), k = Math.min(1, 600 / i.width, 200 / i.height); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); }; i.onerror = () => rej(new Error('That is not an image.')); i.src = r.result; }; r.onerror = () => rej(r.error); r.readAsDataURL(f); });

  /* ---------- signing ---------- */
  function SignModal({ app, id, sid }) {
    const e = envOf(app, id), s = e && e.signers.find(x => x.id === sid);
    const [mode, setMode] = useState('draw'), [img, setImg] = useState(''), [name, setName] = useState(s ? s.name : ''), [conf, setConf] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('');
    const [chk, setChk] = useState({ state: 'checking' });
    useEffect(() => { let on = true; (async () => { try { const f = await readCopy(e); if (!f) return on && setChk({ state: 'missing' }); const hh = await fileHash(f); on && setChk({ state: hh === e.hash ? 'ok' : 'bad', now: hh }); } catch (x) { on && setChk({ state: 'error', msg: x.message }); } })(); return () => { on = false; }; }, []);
    if (!e || !s) return null;
    const pic = mode === 'type' ? (name.trim() ? typed(name.trim()) : '') : img;
    const submit = async () => {
      setErr('');
      if (chk.state !== 'ok') return setErr('The document cannot be verified, so it cannot be signed.');
      if (!pic) return setErr('Add a signature first.');
      if (conf.trim().toLowerCase() !== (s.email || '').toLowerCase()) return setErr('Type the signer\'s email address exactly as it was entered on the request.');
      if (!ok) return setErr('Tick the consent box to continue.');
      setBusy(true);
      try {
        await change(app, id, async c => {
          const sg = c.signers.find(x => x.id === sid); if (!canSign(c, sg)) throw new Error('This request is no longer waiting for this signer.');
          sg.status = 'signed'; sg.signedAt = nowIso(); sg.sig = pic; sg.sigHash = await sha(pic); sg.method = mode; sg.docHashAtSigning = chk.now;
          await addAudit(c, sg.name, `Signed (${mode === 'draw' ? 'drawn' : mode === 'type' ? 'typed' : 'uploaded'} signature) · document hash verified ${short(chk.now)}`);
          if (c.signers.every(x => x.status === 'signed')) { c.status = 'completed'; c.completedAt = nowIso(); await addAudit(c, 'System', 'All signers have signed. Request completed and sealed'); c.seal = await sealOf(c); }
        }, 'Signature recorded');
        app.modal(null);
      } catch (x) { setErr(x.message || 'Could not sign.'); setBusy(false); }
    };
    const tab = (k, l) => h('button', { type: 'button', onClick: () => setMode(k), style: { border: '1px solid ' + (mode === k ? K.ink : K.line), background: mode === k ? K.ink : '#fff', color: mode === k ? '#fff' : K.ink, borderRadius: 8, height: 32, padding: '0 12px', fontSize: 13 } }, l);
    return h(Modal, { title: 'Sign: ' + e.title, sub: `Signing as ${s.name}${s.role ? ' · ' + s.role : ''}`, onClose: () => app.modal(null), width: 560 },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { border: '1px solid ' + (chk.state === 'ok' ? K.line : '#F4B8B1'), background: chk.state === 'ok' ? K.soft : K.redBg, borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.5 } },
          chk.state === 'checking' && 'Checking the document against its sealed fingerprint…',
          chk.state === 'ok' && h('span', null, h('b', null, 'Document verified. '), 'This file is identical to the one sent for signature. ', h('span', { style: { color: K.mut } }, 'SHA-256 ' + short(e.hash))),
          chk.state === 'bad' && h('span', { style: { color: K.red } }, h('b', null, 'Document has been changed. '), 'The file no longer matches the fingerprint sealed when this request was made. Signing is blocked. Cancel this request and start a new one.'),
          chk.state === 'missing' && h('span', { style: { color: K.red } }, 'The sealed copy of the document is not available here, so it cannot be verified or signed.'),
          chk.state === 'error' && h('span', { style: { color: K.red } }, chk.msg)),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, tab('draw', 'Draw'), tab('type', 'Type'), tab('upload', 'Upload image'), h('button', { type: 'button', disabled: true, title: 'Aadhaar eSign is coming soon.', style: { border: '1px solid ' + K.line, background: K.soft, color: K.mut, borderRadius: 8, height: 32, padding: '0 12px', fontSize: 13, cursor: 'not-allowed' } }, 'Aadhaar eSign · Coming soon')),
        mode === 'draw' && h(Pad, { onChange: setImg }),
        mode === 'type' && h('div', null, h('input', { value: name, onChange: ev => setName(ev.target.value), placeholder: 'Type your full name', style: X.input }), pic && h('img', { src: pic, alt: 'Typed signature preview', style: { width: '100%', maxHeight: 120, objectFit: 'contain', border: '1px dashed ' + K.line, borderRadius: 10, marginTop: 8, background: '#fff' } })),
        mode === 'upload' && h('div', null, h(Btn, { onClick: () => L.pickFile('image/*').then(fs => fs[0] && readImg(fs[0]).then(setImg).catch(x => setErr(x.message))) }, img ? 'Choose a different image' : 'Choose signature image'), img && h('img', { src: img, alt: 'Signature preview', style: { width: '100%', maxHeight: 120, objectFit: 'contain', border: '1px dashed ' + K.line, borderRadius: 10, marginTop: 8, background: '#fff' } })),
        h('label', { style: { fontSize: 13 } }, 'Confirm the signer\'s email address', h('input', { value: conf, onChange: ev => setConf(ev.target.value), placeholder: s.email, autoComplete: 'off', style: Object.assign({}, X.input, { marginTop: 6 }) })),
        h('label', { style: { display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.5, alignItems: 'flex-start' } }, h('input', { type: 'checkbox', checked: ok, onChange: ev => setOk(ev.target.checked), style: { marginTop: 3 } }), 'I have read the document and agree to sign it electronically. I understand this is an electronic signature under the Information Technology Act, 2000, and that the time and document fingerprint are recorded.'),
        err && h('div', { role: 'alert', style: { color: K.red, fontSize: 13 } }, err),
        h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, h(Btn, { onClick: () => app.modal(null) }, 'Cancel'), h(Btn, { primary: true, disabled: busy || chk.state !== 'ok', onClick: submit }, busy ? 'Signing…' : 'Sign document'))));
  }

  /* ---------- certificate of completion ---------- */
  function certificate(d, e) {
    const sg = e.signers.map(s => `<tr><td>${esc(s.name)}<br><small>${esc(s.email)}${s.role ? ' · ' + esc(s.role) : ''}</small></td><td>${s.status === 'signed' ? `<img src="${s.sig}" alt="signature" style="height:60px">` : esc(s.status)}</td><td>${s.signedAt ? esc(when(s.signedAt)) : '—'}<br><small>${esc(s.method || '')}</small></td><td class="m">${esc(s.docHashAtSigning || '')}</td></tr>`).join('');
    const au = e.audit.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(when(a.ts))}</td><td>${esc(a.who)}</td><td>${esc(a.act)}</td><td class="m">${esc(a.hash.slice(0, 16))}</td></tr>`).join('');
    const st = e.stamp && (e.stamp.state || e.stamp.amount || e.stamp.cert) ? `<h2>Stamp details (recorded by the sender, not verified by Legal Staff)</h2><p>State: ${esc(e.stamp.state || '—')} · Amount: ${esc(e.stamp.amount ? '₹' + e.stamp.amount : '—')} · Certificate / UIN: ${esc(e.stamp.cert || '—')}</p>` : '';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Certificate of completion · ${esc(e.title)}</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#0A0A0A;max-width:880px;margin:32px auto;padding:0 20px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:26px 0 8px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top;font-size:13px}small{color:#666}.m{font:11px ui-monospace,monospace;word-break:break-all}.ok{display:inline-block;border:1px solid #0A0A0A;border-radius:6px;padding:2px 8px;font-size:12px}@media print{body{margin:0}}</style></head><body>
<h1>Certificate of completion</h1><p><span class="ok">${e.status === 'completed' ? 'COMPLETED' : esc((LABEL[status(e)] || '').toUpperCase())}</span> · generated ${esc(when(nowIso()))} · ${esc(d.firm.name || 'Legal Staff')}</p>
<h2>Document</h2><table><tr><td>Title</td><td>${esc(e.title)}</td></tr><tr><td>File</td><td>${esc(e.fileName)} (${esc(L.size(e.size || 0))})</td></tr><tr><td>Case</td><td>${esc(caseTitle(d, e.caseId))}</td></tr><tr><td>Sent by / on</td><td>${esc(e.createdBy)} · ${esc(when(e.created))}</td></tr><tr><td>Signing order</td><td>${e.order === 'sequential' ? 'One after another' : 'Any order'}</td></tr><tr><td>Document SHA-256</td><td class="m">${esc(e.hash)}</td></tr>${e.seal ? `<tr><td>Seal SHA-256</td><td class="m">${esc(e.seal)}</td></tr>` : ''}</table>
<h2>Signers</h2><table><tr><th>Signer</th><th>Signature</th><th>Signed at</th><th>Document hash seen when signing</th></tr>${sg}</table>${st}
<h2>Audit trail (each line's fingerprint includes the line before it)</h2><table><tr><th>#</th><th>Time</th><th>By</th><th>Event</th><th>Fingerprint</th></tr>${au}</table>
<p><small>To verify: compute the SHA-256 of the original file and compare it to the document hash above, or use Verify on the E-Sign page in Legal Staff. Signatures here are electronic signatures captured in the app; they are not Aadhaar eSign or digital signature certificates unless stated in the trail.</small></p></body></html>`;
  }

  /* ---------- new request ---------- */
  function NewRequest({ app }) {
    const d = app.db, docs = docsWithFile(d);
    const [src, setSrc] = useState(docs[0] ? docs[0].id : 'upload'), [file, setFile] = useState(null), [title, setTitle] = useState(''), [caseId, setCaseId] = useState((d.cases[0] || {}).id || ''), [order, setOrder] = useState('parallel');
    const [days, setDays] = useState('7'), [signers, setSigners] = useState([{ name: '', email: '', role: '' }]), [stamp, setStamp] = useState({ state: '', amount: '', cert: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
    const setS = (i, k, v) => setSigners(signers.map((s, j) => j === i ? Object.assign({}, s, { [k]: v }) : s));
    const go = async () => {
      setErr('');
      if (!title.trim()) return setErr('Give the request a title.');
      const ss = signers.map(s => ({ name: s.name.trim(), email: s.email.trim(), role: s.role.trim() }));
      if (!ss.length || ss.some(s => !s.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email))) return setErr('Every signer needs a name and a valid email address.');
      if (new Set(ss.map(s => s.email.toLowerCase())).size !== ss.length) return setErr('Two signers have the same email address.');
      if (!(+days >= 1 && +days <= 365)) return setErr('Expiry must be between 1 and 365 days.');
      let blob = null, name = '';
      if (src === 'upload') { if (!file) return setErr('Choose the file to be signed.'); blob = file; name = file.name; }
      else { const doc = d.docs.find(x => x.id === src); try { blob = await (window.LSB && LSB.on ? (doc.drive ? LSB.drive.download(doc.drive) : LSB.download(doc.id, doc.file)) : L.files.get(doc.id)); } catch (x) { blob = null; } if (!blob) return setErr('That document\'s file could not be read.'); name = doc.file; }
      setBusy(true);
      try {
        const id = L.uid('es'), fileId = id + '-f', hash = await fileHash(blob), dup = (d.esign || []).find(x => x.hash === hash && ['sent', 'completed'].includes(x.status));
        if (dup && !window.confirm(`This exact file is already in "${dup.title}" (${LABEL[status(dup)]}). Send it again?`)) return setBusy(false);
        const drive = await storeCopy(app, fileId, blob);
        const env = { id, title: title.trim(), caseId, fileId, ...(drive ? { drive } : {}), fileName: name, size: blob.size, hash, created: nowIso(), createdBy: d.user.name, status: 'sent', order, expires: L.addDays(L.today(), +days), signers: ss.map((s, i) => Object.assign(s, { id: id + '-s' + i, status: 'pending' })), stamp, audit: [] };
        await addAudit(env, d.user.name, `Request created for ${ss.length} signer${ss.length > 1 ? 's' : ''}. Document sealed with SHA-256 ${short(hash)}`);
        await addAudit(env, d.user.name, 'Sent for signature' + (order === 'sequential' ? ' (in order)' : ''));
        app.mut(db => { db.esign = db.esign || []; db.esign.unshift(env); V.logIt(db, `E-sign request "${env.title}" sent by ${db.user.name}`, caseId); }, 'Request created');
        app.modal(null);
      } catch (x) { setErr(x.message || 'Could not create the request.'); setBusy(false); }
    };
    const lab = (t, c) => h('label', { style: { fontSize: 13, flex: '1 1 200px' } }, t, c);
    return h(Modal, { title: 'New signature request', sub: 'The document is fingerprinted now. Any later change to it blocks signing.', onClose: () => app.modal(null), width: 640 },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        lab('Document', h('select', { value: src, onChange: ev => setSrc(ev.target.value), style: Object.assign({}, X.input, { marginTop: 6 }) }, docs.map(x => h('option', { key: x.id, value: x.id }, x.name + ' (' + x.file + ')')), h('option', { value: 'upload' }, 'Upload a new file…'))),
        src === 'upload' && h('div', null, h(Btn, { onClick: () => L.pickFile().then(fs => { if (fs[0]) { setFile(fs[0]); if (!title) setTitle(fs[0].name.replace(/\.[^.]+$/, '')); } }) }, file ? 'Change file' : 'Choose file'), file && h('span', { style: { marginLeft: 10, fontSize: 13, color: K.mut } }, file.name + ' · ' + L.size(file.size))),
        h('div', { style: { display: 'flex', gap: 14, flexWrap: 'wrap' } }, lab('Title', h('input', { value: title, onChange: ev => setTitle(ev.target.value), placeholder: 'Ex. Settlement agreement', style: Object.assign({}, X.input, { marginTop: 6 }) })), lab('Case', h('select', { value: caseId, onChange: ev => setCaseId(ev.target.value), style: Object.assign({}, X.input, { marginTop: 6 }) }, h('option', { value: '' }, 'Not linked'), d.cases.map(c => h('option', { key: c.id, value: c.id }, c.title))))),
        h('div', { style: { fontSize: 13, fontWeight: 600 } }, 'Signers'),
        signers.map((s, i) => h('div', { key: i, style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } }, order === 'sequential' && h('span', { style: { width: 20, color: K.mut, fontSize: 13 } }, i + 1 + '.'), h('input', { value: s.name, onChange: ev => setS(i, 'name', ev.target.value), placeholder: 'Full name', style: Object.assign({}, X.input, { flex: '1 1 140px' }) }), h('input', { value: s.email, onChange: ev => setS(i, 'email', ev.target.value), placeholder: 'Email', style: Object.assign({}, X.input, { flex: '1 1 170px' }) }), h('input', { value: s.role, onChange: ev => setS(i, 'role', ev.target.value), placeholder: 'Role (optional)', style: Object.assign({}, X.input, { flex: '1 1 110px' }) }), signers.length > 1 && h(Btn, { small: true, onClick: () => setSigners(signers.filter((_, j) => j !== i)) }, 'Remove'))),
        signers.length < 20 && h('div', null, h(Btn, { small: true, onClick: () => setSigners([...signers, { name: '', email: '', role: '' }]) }, '+ Add signer')),
        h('div', { style: { display: 'flex', gap: 14, flexWrap: 'wrap' } }, lab('Signing order', h('select', { value: order, onChange: ev => setOrder(ev.target.value), style: Object.assign({}, X.input, { marginTop: 6 }) }, h('option', { value: 'parallel' }, 'Any order'), h('option', { value: 'sequential' }, 'One after another'))), lab('Expires in (days)', h('input', { value: days, onChange: ev => setDays(ev.target.value), inputMode: 'numeric', style: Object.assign({}, X.input, { marginTop: 6 }) }))),
        h('div', { style: { fontSize: 13, fontWeight: 600 } }, 'Stamp details (optional)'),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h('input', { value: stamp.state, onChange: ev => setStamp({ ...stamp, state: ev.target.value }), placeholder: 'State', style: Object.assign({}, X.input, { flex: '1 1 120px' }) }), h('input', { value: stamp.amount, onChange: ev => setStamp({ ...stamp, amount: ev.target.value.replace(/[^\d.]/g, '') }), placeholder: 'Stamp duty paid (₹)', style: Object.assign({}, X.input, { flex: '1 1 120px' }) }), h('input', { value: stamp.cert, onChange: ev => setStamp({ ...stamp, cert: ev.target.value }), placeholder: 'E-stamp certificate / UIN', style: Object.assign({}, X.input, { flex: '1 1 160px' }) })),
        h('div', { style: { fontSize: 12, color: K.mut } }, 'Recorded as you enter it and printed on the certificate. Legal Staff does not buy or verify stamps.'),
        err && h('div', { role: 'alert', style: { color: K.red, fontSize: 13 } }, err),
        h('div', { style: { display: 'flex', gap: 10, justifyContent: 'flex-end' } }, h(Btn, { onClick: () => app.modal(null) }, 'Cancel'), h(Btn, { primary: true, disabled: busy, onClick: go }, busy ? 'Sealing…' : 'Send for signature'))));
  }

  /* ---------- request detail ---------- */
  function Detail({ app, id }) {
    const e = envOf(app, id), [tr, setTr] = useState(null); useEffect(() => { if (e) auditOk(e).then(setTr); }, [e && e.audit.length]);
    if (!e) return null; const d = app.db, st = status(e);
    const act = (fn, msg) => fn().then(() => msg && app.toast(msg)).catch(x => app.toast(x.message || 'Failed'));
    const cancel = () => V.confirmBox(app, 'Cancel this request?', 'Signers will no longer be able to sign it. Signatures already given stay in the record.', 'Cancel request', () => act(() => change(app, id, async c => { c.status = 'voided'; await addAudit(c, d.user.name, 'Request cancelled'); }, 'Request cancelled')));
    const decline = s => { const r = window.prompt(`Record that ${s.name} declined to sign. Reason (optional):`); if (r === null) return; act(() => change(app, id, async c => { const sg = c.signers.find(x => x.id === s.id); sg.status = 'declined'; sg.declineReason = r; c.status = 'declined'; await addAudit(c, sg.name, 'Declined to sign' + (r ? ': ' + r : '')); }, 'Recorded')); };
    const remind = s => act(async () => { await change(app, id, async c => { await addAudit(c, d.user.name, `Reminder sent to ${s.name}`); }); const b = encodeURIComponent(`Hello ${s.name},\n\nPlease sign "${e.title}"${e.expires ? ' before ' + L.dmy(e.expires) : ''}.\n\nRegards,\n${d.user.name}`); window.open(`mailto:${s.email}?subject=${encodeURIComponent('Signature needed: ' + e.title)}&body=${b}`); });
    return h(Modal, { title: e.title, sub: `${caseTitle(d, e.caseId)} · ${e.fileName}`, onClose: () => app.modal(null), width: 720 },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } }, h(Chip, { tone: TONE[st] }, LABEL[st]), e.expires && st === 'sent' && h('span', { style: { fontSize: 13, color: K.mut } }, 'Expires ' + L.dmy(e.expires)), tr !== null && h(Chip, { tone: tr ? 'ink' : 'red' }, tr ? 'Audit trail intact' : 'Audit trail altered')),
        h('div', { style: { fontSize: 12, color: K.mut, wordBreak: 'break-all' } }, 'Document SHA-256: ', h('code', null, e.hash)),
        e.signers.map((s, i) => h('div', { key: s.id, style: { display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', border: '1px solid ' + K.line, borderRadius: 10, padding: '10px 12px' } },
          h('div', null, h('div', { style: { fontSize: 14, fontWeight: 500 } }, (e.order === 'sequential' ? i + 1 + '. ' : '') + s.name, s.role ? ' · ' + s.role : ''), h('div', { style: { fontSize: 12.5, color: K.mut } }, s.email + (s.signedAt ? ' · signed ' + when(s.signedAt) : s.status === 'declined' ? ' · declined' + (s.declineReason ? ': ' + s.declineReason : '') : ''))),
          h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } }, s.status === 'signed' ? h(React.Fragment, null, h('img', { src: s.sig, alt: 'Signature of ' + s.name, style: { height: 36, maxWidth: 120, objectFit: 'contain' } }), h(Chip, null, 'Signed')) : s.status === 'declined' ? h(Chip, { tone: 'red' }, 'Declined') : h(React.Fragment, null, h(Chip, { tone: 'grey' }, canSign(e, s) ? 'Waiting' : st === 'sent' ? 'Waiting for earlier signer' : 'Pending'), canSign(e, s) && h(Btn, { small: true, primary: true, onClick: () => app.modal(() => h(SignModal, { app, id, sid: s.id })) }, 'Sign now'), canSign(e, s) && h(Btn, { small: true, onClick: () => remind(s) }, 'Remind'), canSign(e, s) && h(Btn, { small: true, onClick: () => decline(s) }, 'Mark declined'))))),
        h('div', null, h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 6 } }, 'Audit trail'), h('div', { style: { maxHeight: 190, overflowY: 'auto', fontSize: 12.5, border: '1px solid ' + K.line, borderRadius: 10 } }, e.audit.map((a, i) => h('div', { key: i, style: { padding: '7px 12px', borderBottom: i < e.audit.length - 1 ? '1px solid ' + K.line : 0 } }, h('span', { style: { color: K.mut } }, when(a.ts) + ' · '), h('b', { style: { fontWeight: 500 } }, a.who), ' · ' + a.act)))),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
          h(Btn, { onClick: () => act(async () => { const f = await readCopy(e); if (!f) throw new Error('The sealed copy is not available.'); L.download(e.fileName, f); }) }, 'Download original'),
          h(Btn, { onClick: () => L.download('Certificate - ' + e.title.replace(/[^\w\- ]+/g, '') + '.html', new Blob([certificate(d, e)], { type: 'text/html' })) }, 'Certificate'),
          st === 'sent' && h(Btn, { danger: true, onClick: cancel }, 'Cancel request'))));
  }

  /* ---------- verify any file against the sealed requests ---------- */
  function VerifyModal({ app }) {
    const [res, setRes] = useState(null), [busy, setBusy] = useState(false);
    const run = async () => { const fs = await L.pickFile(); if (!fs[0]) return; setBusy(true); try { const hh = await fileHash(fs[0]), hits = (app.db.esign || []).filter(x => x.hash === hh); const rows = []; for (const x of hits) rows.push({ x, trail: await auditOk(x), seal: x.seal ? await sealOf(x) === x.seal : null }); setRes({ name: fs[0].name, hash: hh, rows }); } catch (x) { setRes({ error: x.message }); } setBusy(false); };
    return h(Modal, { title: 'Verify a document', sub: 'Pick any file. Its SHA-256 fingerprint is compared to every sealed request in your firm.', onClose: () => app.modal(null), width: 560 },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, h('div', null, h(Btn, { primary: true, disabled: busy, onClick: run }, busy ? 'Checking…' : 'Choose file to verify')),
        res && res.error && h('div', { style: { color: K.red, fontSize: 13 } }, res.error),
        res && !res.error && h('div', { style: { fontSize: 13.5, lineHeight: 1.55 } }, h('div', { style: { color: K.mut, fontSize: 12, wordBreak: 'break-all' } }, res.name + ' · ' + res.hash),
          res.rows.length ? res.rows.map(r => h('div', { key: r.x.id, style: { border: '1px solid ' + K.line, borderRadius: 10, padding: '10px 12px', marginTop: 8 } }, h('b', null, 'Matches: '), r.x.title, ' · ' + LABEL[status(r.x)], h('div', { style: { fontSize: 12.5, color: K.mut } }, 'Audit trail ' + (r.trail ? 'intact' : 'ALTERED') + (r.seal === null ? '' : ' · Seal ' + (r.seal ? 'valid' : 'INVALID'))))) : h('div', { style: { marginTop: 8, color: K.red } }, 'No match. This file is not the sealed document of any request in your firm. It may have been altered, or it is a different file.'))));
  }

  /* ---------- analytics ---------- */
  const Stat = ({ label, value, note, red }) => h('div', { style: Object.assign({}, X.card, { padding: '16px 18px', flex: '1 1 150px' }) }, h('div', { style: { fontSize: 12.5, color: K.mut } }, label), h('div', { style: { fontSize: 24, fontWeight: 600, color: red ? K.red : K.ink, marginTop: 4 } }, value), note && h('div', { style: { fontSize: 12, color: K.mut, marginTop: 2 } }, note));
  const hrs = ms => ms < 36e5 ? Math.max(1, Math.round(ms / 6e4)) + ' min' : ms < 864e5 ? (ms / 36e5).toFixed(1) + ' h' : (ms / 864e5).toFixed(1) + ' days';
  function analytics(list) {
    const by = s => list.filter(e => status(e) === s), done = by('completed'), open = by('sent');
    const times = done.map(e => new Date(e.completedAt) - new Date(e.created)).filter(x => x >= 0), avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const closed = list.filter(e => ['completed', 'declined', 'expired', 'voided'].includes(status(e))).length;
    const oldest = open.length ? Math.max(...open.map(e => Date.now() - new Date(e.created))) : 0;
    const slow = {}; open.forEach(e => e.signers.forEach(s => { if (s.status === 'pending') slow[s.name] = (slow[s.name] || 0) + 1; }));
    return { total: list.length, done: done.length, open: open.length, declined: by('declined').length, expired: by('expired').length, avg, rate: closed ? Math.round(100 * done.length / closed) : null, oldest, slow: Object.entries(slow).sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }

  function ESign({ app }) {
    const d = app.db, list = d.esign || [], [f, setF] = useState('all'), [q, setQ] = useState(''), A = analytics(list);
    const rows = list.filter(e => (f === 'all' || status(e) === f) && (!q || (e.title + e.fileName + e.signers.map(s => s.name + s.email).join(' ')).toLowerCase().includes(q.toLowerCase())));
    const cols = [
      { label: 'Request', w: 'minmax(220px,2fr)', get: e => h('span', null, e.title, h('span', { style: { display: 'block', fontSize: 12, color: K.mut, fontWeight: 400 } }, caseTitle(d, e.caseId) + ' · ' + e.fileName)) },
      { label: 'Signed', w: '90px', get: e => e.signers.filter(s => s.status === 'signed').length + ' of ' + e.signers.length },
      { label: 'Status', w: '150px', get: e => h(Chip, { tone: TONE[status(e)] }, LABEL[status(e)]) },
      { label: 'Sent', w: '110px', get: e => L.dayMon(e.created.slice(0, 10)) },
      { label: '', w: '220px', get: e => h('span', { style: { display: 'inline-flex', gap: 6 } }, h(Btn, { small: true, onClick: () => app.modal(() => h(Detail, { app, id: e.id })) }, 'Open'), h(Btn, { small: true, onClick: () => L.download('Certificate - ' + e.title.replace(/[^\w\- ]+/g, '') + '.html', new Blob([certificate(d, e)], { type: 'text/html' })) }, 'Certificate')) }
    ];
    const prov = [['Aadhaar eSign', 'Signing with Aadhaar OTP through an eSign Service Provider (ESP).'], ['NeSL', 'National e-Governance Services Limited: e-sign and e-stamp for financial documents, with repository storage.'], ['E-stamping', 'Buying and affixing state e-stamp duty.']];
    return h(Page, { art: 'documents', kicker: 'Practice', title: 'E-Sign', sub: `${A.open} out for signature · ${A.done} completed`, actions: [h(Select, { key: 0, value: f, onChange: setF, options: [['all', 'All requests'], ...Object.keys(LABEL).map(k => [k, LABEL[k]])] }), h('input', { key: 1, value: q, onChange: ev => setQ(ev.target.value), placeholder: 'Search requests', style: Object.assign({}, X.input, { width: 'min(220px,100%)' }) }), h(Btn, { key: 2, onClick: () => app.modal(() => h(VerifyModal, { app })) }, 'Verify a file'), h(Btn, { key: 3, primary: true, onClick: () => d.cases.length ? app.modal(() => h(NewRequest, { app })) : app.toast('Add a case first.') }, '+ New request')] },
      h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap' } }, h(Stat, { label: 'Requests', value: A.total }), h(Stat, { label: 'Waiting for signature', value: A.open, note: A.oldest ? 'Oldest ' + hrs(A.oldest) : '' }), h(Stat, { label: 'Completion rate', value: A.rate == null ? '—' : A.rate + '%', note: 'of closed requests' }), h(Stat, { label: 'Average turnaround', value: A.avg ? hrs(A.avg) : '—', note: 'send to last signature' }), h(Stat, { label: 'Declined or expired', value: A.declined + A.expired, red: A.declined + A.expired > 0 })),
      A.slow.length > 0 && h(Card, { title: 'Paperwork waiting on' }, h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, A.slow.map(([n, c]) => h(Chip, { key: n }, n + ' · ' + c)))),
      h(Table, { cols, rows, min: 780, empty: { title: 'No signature requests', text: 'Send a document from a case for signature. It is fingerprinted, signed, and sealed with a certificate.' } }),
      h(Card, { title: 'Coming soon' }, h('div', { style: { fontSize: 13, color: K.mut, marginBottom: 10 } }, 'These are coming soon. Signing in the app (drawn, typed or uploaded signature) works today.'), prov.map(([n, t]) => h('div', { key: n, style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid ' + K.line, fontSize: 13.5 } }, h('span', null, h('b', { style: { fontWeight: 500 } }, n), h('span', { style: { display: 'block', fontSize: 12.5, color: K.mut } }, t)), h(Chip, { tone: 'grey' }, 'Coming soon')))));
  }

  V.MODULES.esign = ESign;
  V.esign = { sha, fileHash, addAudit, auditOk, sealOf, status, canSign, analytics, certificate, typed };
})();

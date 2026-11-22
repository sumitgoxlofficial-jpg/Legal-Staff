/* Legal Staff — AI Case Brain: a chat assistant with saved conversations (rename, archive, delete), file and image
   attachments, voice typing, and quick tasks. A chat can be linked to one case, so answers use that case's records
   with source links; without a case it is a general legal assistant.
   Conversations are private to each user (db.brain, kept with the user's own settings). Attached files are read in
   the browser: PDF text (pdf.js, loaded on first use), Word (.docx), text files; images and scanned PDF pages are
   sent to the server's vision model. */
(function () {
  'use strict';
  const h = React.createElement, L = window.LS, V = window.LSV, { useState, useEffect, useRef } = React;
  const K = V.K, MAX_TEXT = 30000, MAX_FILES = 6, MAX_MB = 25, MAX_IMG = 4;

  /* ---------- storage ---------- */
  /* Chats from the earlier one-chat-per-case version (db.chats[caseId]) become saved conversations, once. */
  function threads(d) {
    if (Array.isArray(d.brain)) return d.brain;
    d.brain = [];
    Object.keys(d.chats || {}).forEach(cid => { const m = d.chats[cid]; if (!Array.isArray(m) || !m.length || !d.cases.some(c => c.id === cid)) return;
      const first = m.find(x => x.role === 'user'), now = Date.now();
      d.brain.push({ id: L.uid('bt'), title: titleOf(first ? first.text : 'Case chat'), caseId: cid, created: now, updated: now, archived: false, msgs: m.map(x => ({ role: x.role === 'user' ? 'user' : 'ai', text: x.text || '', cites: x.cites || [], need: x.need })) }); });
    d.chats = {};
    return d.brain;
  }
  const titleOf = s => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > 52 ? t.slice(0, 50).replace(/\s\S*$/, '') + '…' : (t || 'New chat'); };
  const find = (d, id) => threads(d).find(t => t.id === id);

  /* ---------- reading attachments ---------- */
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load the PDF reader. Check the internet connection.')); document.head.appendChild(s); });
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  async function pdfLib() { if (!window.pdfjsLib) { await loadScript(PDFJS + 'pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } return window.pdfjsLib; }
  const toJpeg = (src, max, q) => { const c = document.createElement('canvas'), s = Math.min(1, max / Math.max(src.width, src.height)); c.width = Math.max(1, Math.round(src.width * s)); c.height = Math.max(1, Math.round(src.height * s)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', q); };
  async function readPdf(f) {
    const lib = await pdfLib(), doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise, n = Math.min(doc.numPages, 80), parts = [];
    for (let i = 1; i <= n; i++) { const p = await doc.getPage(i), tc = await p.getTextContent(); let line = '', out = [];
      tc.items.forEach(it => { line += it.str; if (it.hasEOL) { out.push(line); line = ''; } else if (it.str && !/\s$/.test(it.str)) line += ' '; }); if (line) out.push(line);
      parts.push(`[Page ${i}]\n` + out.join('\n').replace(/[ \t]+/g, ' ').trim()); if (parts.join('\n').length > MAX_TEXT) break; }
    const text = parts.join('\n\n'), images = [];
    /* A scanned PDF has no text layer: send its first pages as pictures for the AI to read. */
    if (text.replace(/\[Page \d+\]/g, '').replace(/\s/g, '').length < 80 * Math.min(n, 3)) {
      for (let i = 1; i <= Math.min(doc.numPages, 3); i++) { const p = await doc.getPage(i), vp = p.getViewport({ scale: 1 }), sc = Math.min(2, 1400 / vp.width), v2 = p.getViewport({ scale: sc }), c = document.createElement('canvas'); c.width = v2.width; c.height = v2.height; await p.render({ canvasContext: c.getContext('2d'), viewport: v2 }).promise; images.push(toJpeg(c, 1400, .8)); }
      return { text: '', images, pages: doc.numPages, scanned: true };
    }
    return { text, images, pages: doc.numPages };
  }
  /* Minimal .zip reader for .docx: finds word/document.xml and inflates it with the browser's DecompressionStream. */
  async function unzipEntry(buf, want) {
    const v = new DataView(buf), u8 = new Uint8Array(buf); let e = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('This Word file could not be opened.');
    let p = v.getUint32(e + 16, true); const count = v.getUint16(e + 10, true);
    for (let k = 0; k < count; k++) { if (v.getUint32(p, true) !== 0x02014b50) break;
      const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true), name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
      if (name === want) { const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true), data = u8.subarray(start, start + size);
        if (method === 0) return new TextDecoder().decode(data);
        if (!window.DecompressionStream) throw new Error('This browser cannot open Word files. Save it as PDF and attach that.');
        return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); }
      p += 46 + nl + xl + cl; }
    throw new Error('This Word file has no text.');
  }
  async function readDocx(f) { const xml = await unzipEntry(await f.arrayBuffer(), 'word/document.xml'), doc = new DOMParser().parseFromString(xml, 'application/xml');
    return [...doc.getElementsByTagName('w:p')].map(p => [...p.getElementsByTagName('w:t')].map(t => t.textContent).join('')).join('\n').replace(/\n{3,}/g, '\n\n').trim(); }
  const imgEl = f => new Promise((res, rej) => { const u = URL.createObjectURL(f), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('This image could not be opened.')); }; i.src = u; });
  async function readFile(f) {
    const ext = (String(f.name).split('.').pop() || '').toLowerCase(), base = { name: f.name, size: f.size };
    if (f.size > MAX_MB * 1048576) throw new Error(`${f.name} is larger than ${MAX_MB} MB.`);
    if (/^image\//.test(f.type) || /^(png|jpe?g|webp|gif|bmp|heic)$/.test(ext)) { const i = await imgEl(f); return Object.assign(base, { kind: 'image', images: [toJpeg(i, 1400, .82)], thumb: toJpeg(i, 120, .7) }); }
    if (ext === 'pdf' || f.type === 'application/pdf') { const r = await readPdf(f); return Object.assign(base, { kind: 'doc', text: r.text.slice(0, MAX_TEXT), images: r.images, pages: r.pages, scanned: !!r.scanned }); }
    if (ext === 'docx') return Object.assign(base, { kind: 'doc', text: (await readDocx(f)).slice(0, MAX_TEXT) });
    if (/^(txt|csv|md|json|xml|html?|rtf|log|tsv)$/.test(ext) || /^text\//.test(f.type)) { let t = await f.text(); if (/^html?$/.test(ext)) t = new DOMParser().parseFromString(t, 'text/html').body.textContent || ''; return Object.assign(base, { kind: 'doc', text: t.replace(/\r/g, '').slice(0, MAX_TEXT) }); }
    if (/^(doc|xls|xlsx|ppt|pptx|odt)$/.test(ext)) throw new Error(`${f.name}: save it as PDF or .docx, then attach it.`);
    throw new Error(`${f.name}: this kind of file cannot be read. Attach a PDF, Word (.docx), text file or image.`);
  }
  const fileSize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  /* ---------- asking ---------- */
  const scrollEnd = () => setTimeout(() => { const el = document.getElementById('ls-brain-end'); el && el.scrollIntoView({ block: 'end', behavior: V.reduced() ? 'auto' : 'smooth' }); }, 40);
  function newThread(app, caseId) { const id = L.uid('bt'), now = Date.now(); app.mut(db => { threads(db).unshift({ id, title: 'New chat', caseId: caseId || '', created: now, updated: now, archived: false, msgs: [] }); }); return find(app.db, id) ? id : ''; }
  /* Send one message in a chat. atts: files read by readFile (with their images); images are sent once and kept only as thumbnails. */
  function send(app, tid, text, atts, opts) {
    const t0 = find(app.db, tid); if (!t0) return;
    if (app.brainBusy) return app.toast('Still answering the last message…');
    atts = atts || [];
    const files = atts.map(f => ({ name: f.name, kind: f.kind, size: f.size, text: f.text || '', thumb: f.thumb || '', pages: f.pages || 0, scanned: !!f.scanned }));
    const q = String(text || '').trim() || (atts.length ? (atts.length > 1 ? 'Read the attached files and summarise them: what each is, the parties, key facts, dates and deadlines, and what I should do next.' : 'Read the attached file and summarise it: what it is, the parties, key facts, dates and deadlines, and what I should do next.') : '');
    if (!q) return;
    const prior = t0.msgs.filter(m => m.text && !m.pending && !m.err);
    const hist = (opts && opts.regen ? prior.slice(0, -1) : prior).slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));
    /* Every file attached in this chat stays available to follow-up questions, newest first. */
    const docs = [...files, ...[].concat(...t0.msgs.filter(m => m.role === 'user').map(m => m.files || [])).reverse()].filter(f => f.text).map(f => ({ name: f.name, text: f.text }));
    const images = [].concat(...atts.map(f => f.images || [])).slice(0, MAX_IMG);
    const ok = (() => { let done = false; app.mut(db => { const t = find(db, tid); if (!t) return;
      if (!(opts && opts.regen)) t.msgs.push({ role: 'user', text: String(text || '').trim() ? q : q, files, at: Date.now() });
      t.msgs.push({ role: 'ai', text: '', cites: [], pending: true, at: Date.now() }); t.updated = Date.now();
      if (t.title === 'New chat') t.title = titleOf(String(text || '').trim() || (files[0] ? files[0].name : q)); done = true; }); return done; })();
    if (!ok) return;
    const token = app.brainBusy = L.uid('q'); app.setState({ thinking: tid }); scrollEnd();
    const put = (patch) => { if (app.brainBusy !== token) return; app.brainBusy = null; app.mut(db => { const t = find(db, tid); if (!t) return; const m = [...t.msgs].reverse().find(x => x.pending); if (m) { Object.assign(m, patch); delete m.pending; } t.updated = Date.now(); }, null, true); app.setState({ thinking: '' }); scrollEnd(); };
    const caseId = t0.caseId && app.db.cases.some(c => c.id === t0.caseId) ? t0.caseId : '';
    const local = why => { if (caseId && !files.length) { const a = L.answer(app.db, caseId, q); return put({ text: (why ? why + '\n\n' : '') + a.text, cites: a.cites, need: a.need, local: true }); }
      put({ text: why || 'AI answers need the Legal Staff server, which is not connected in this browser-only version.', err: true }); };
    if (!(window.LSB && LSB.on && LSB.ai)) return local('');
    LSB.ai({ mode: 'brain', case_id: caseId || undefined, question: q, history: hist, attachments: docs, images }).then(r => {
      const tags = [...new Set((r.text.match(/\[([^\]\n]{3,80})\]/g) || []).map(x => x.slice(1, -1)).filter(x => /^(Order|Hearing|Case details|Documents|Tasks|Attachment:)/.test(x)))];
      put({ text: r.text, cites: tags }); if (r.used != null) app.db.sub.aiUsed = r.used;
      if (caseId && /hearing brief/i.test(q)) app.mut(db => { const nh = V.nextHearing(db, caseId); if (nh) nh.brief = true; }, null, true);
    }).catch(e => local('The AI could not answer (' + e.message + ').' + (caseId && !files.length ? ' Here is the answer from the case details instead:' : '')));
  }
  function stop(app) { if (!app.brainBusy) return; app.brainBusy = null; app.mut(db => { threads(db).forEach(t => t.msgs.forEach(m => { if (m.pending) { delete m.pending; m.text = 'Stopped.'; m.err = true; } })); }, null, true); app.setState({ thinking: '' }); }
  /* Entry point used elsewhere in the app ("Prepare hearing briefs", the case page): a new chat on that case, asked at once. */
  function ask(app, label, caseId) {
    const cid = caseId || app.state.brainCase || '';
    const cur = find(app.db, app.state.brainThread);
    const tid = cur && !cur.archived && cur.caseId === cid && !cur.msgs.length ? cur.id : newThread(app, cid);
    if (!tid) return; app.setState({ brainThread: tid, brainCase: cid }); send(app, tid, label);
  }

  /* ---------- icons ---------- */
  const PATH = { plus: 'M12 5v14 M5 12h14', clip: 'M20.5 11.5l-8.3 8.3a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9', mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3', send: 'M12 19V5 M5 12l7-7 7 7', stop: 'M7 7h10v10H7z', dots: 'M5 12h.01 M12 12h.01 M19 12h.01', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4', archive: 'M3 4h18v4H3z M5 8v12h14V8 M10 12h4', trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13', pen: 'M4 20h4L19 9l-4-4L4 16z', copy: 'M8 8h12v12H8z M16 8V4H4v12h4', redo: 'M20 12a8 8 0 1 1-2.3-5.6 M20 4v5h-5', task: 'M9 11l3 3 8-8 M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11', doc: 'M14 3H6v18h12V7z M14 3v4h4', word: 'M14 3H6v18h12V7z M14 3v4h4 M9 12l1.5 5 1.5-4 1.5 4 1.5-5', menu: 'M4 6h16 M4 12h16 M4 18h16', x: 'M6 6l12 12 M18 6L6 18', back: 'M15 6l-6 6 6 6', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', unarchive: 'M3 4h18v4H3z M5 8v12h14V8 M12 18v-6 M9 15l3-3 3 3', case: 'M3 7h18v13H3z M8 7V4h8v3' };
  const Ic = ({ n, s }) => h('svg', { width: s || 18, height: s || 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: PATH[n] }));
  const iconBtn = (label, n, onClick, o) => h('button', Object.assign({ type: 'button', onClick, title: label, 'aria-label': label, className: 'ls-btn', style: Object.assign({ width: 36, height: 36, flexShrink: 0, borderRadius: 18, border: 0, background: 'transparent', color: K.txt, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }, o && o.style) }, o && o.attrs), h(Ic, { n }));

  /* Ready-made tasks shown when a chat is empty. pick: true opens the file picker. */
  const TASKS = [
    ['Summarise a document', 'Attach a PDF, Word file or photo of an order, notice or judgment', 'doc', 'Summarise the attached document: what it is, the parties, key facts, the operative directions, dates and deadlines, and what I should do next.', true],
    ['Find dates and deadlines', 'From an attached order or notice', 'task', 'List every date, deadline and limitation period in the attached document, with what must be done by each date.', true],
    ['Draft a legal notice', 'Tell it the facts, it drafts the notice', 'pen', 'Draft a legal notice for my client. Facts: '],
    ['Draft a reply', 'To an attached notice, application or plaint', 'word', 'Draft a para-wise reply to the attached document on behalf of my client.', true],
    ['Translate to Hindi', 'Paste text or attach a file', 'redo', 'Translate the following into simple Hindi, keeping legal terms accurate: '],
    ['Explain a provision', 'BNS, BNSS, BSA, CPC, NI Act and more', 'spark', 'Explain, with the procedure and time limits: '] ];
  const CASE_TASKS = ['Prepare a hearing brief', 'Summarise the case', 'What are the issues?', 'Who are the parties?', 'What arguments were raised?', 'What documents are missing?', 'What happened at the last hearing?'];

  function dayGroup(ts) { const d = new Date(ts), now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); if (ts >= start) return 'Today'; if (ts >= start - 864e5) return 'Yesterday'; if (ts >= start - 7 * 864e5) return 'Previous 7 days'; if (ts >= start - 30 * 864e5) return 'Previous 30 days'; return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); }

  function Brain({ app }) {
    const d = app.db, S = app.state, all = threads(d), mobile = S.w < 900;
    const [text, setText] = useState(''), [atts, setAtts] = useState([]), [reading, setReading] = useState(0), [q, setQ] = useState(''), [showArch, setShowArch] = useState(false);
    const [menu, setMenu] = useState(null), [renaming, setRenaming] = useState(null), [rename, setRename] = useState(''), [listen, setListen] = useState(false), [side, setSide] = useState(false), [drag, setDrag] = useState(false), [draftCase, setDraftCase] = useState(S.brainCase || '');
    const fileIn = useRef(null), box = useRef(null), rec = useRef(null), baseText = useRef('');
    const t = find(d, S.brainThread), busy = !!S.thinking && !!app.brainBusy;
    const caseId = t ? t.caseId : draftCase, C = caseId ? d.cases.find(c => c.id === caseId) : null;
    useEffect(() => () => { rec.current && rec.current.stop(); }, []);
    useEffect(() => { scrollEnd(); }, [S.brainThread]);
    useEffect(() => { const el = box.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(220, el.scrollHeight) + 'px'; } }, [text]);
    /* Convert chats from the earlier version once, so they are saved. */
    useEffect(() => { if (!Array.isArray(app.db.brain)) app.mut(db => { threads(db); }, null, true); }, []);

    const open = id => { setMenu(null); setSide(false); app.setState({ brainThread: id }); };
    const newChat = () => { setMenu(null); setSide(false); setText(''); setAtts([]); app.setState({ brainThread: '' }); setTimeout(() => box.current && box.current.focus(), 30); };
    const addFiles = async list => {
      list = [...list]; if (!list.length) return;
      if (atts.length + list.length > MAX_FILES) { app.toast(`Attach up to ${MAX_FILES} files at a time.`); list = list.slice(0, Math.max(0, MAX_FILES - atts.length)); }
      setReading(n => n + list.length);
      for (const f of list) { try { const r = await readFile(f); if (r.kind === 'doc' && !r.text && !(r.images || []).length) throw new Error(f.name + ' has no readable text.'); setAtts(a => [...a, Object.assign(r, { key: L.uid('f') })]); } catch (e) { app.toast(e.message); } finally { setReading(n => n - 1); } }
    };
    const pick = () => fileIn.current && fileIn.current.click();
    const submit = () => {
      if (reading) return app.toast('Still reading the attached file…');
      if (busy) return; if (!text.trim() && !atts.length) return;
      if (listen) toggleMic();
      if ([].concat(...atts.map(f => f.images || [])).length > MAX_IMG) app.toast(`Only the first ${MAX_IMG} images or scanned pages are read in one message.`);
      let tid = t && !t.archived ? t.id : '';
      if (!tid) { tid = newThread(app, draftCase); if (!tid) return; app.setState({ brainThread: tid }); }
      send(app, tid, text, atts); setText(''); setAtts([]);
    };
    const toggleMic = () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (listen) { rec.current && rec.current.stop(); setListen(false); return; }
      if (!SR) return app.toast('Voice typing needs a browser with speech recognition, such as Chrome or Edge.');
      const r = rec.current = new SR(); r.lang = d.settings.dictLang === 'hi-IN' ? 'hi-IN' : 'en-IN'; r.continuous = true; r.interimResults = true;
      baseText.current = text ? text.replace(/\s*$/, ' ') : '';
      r.onresult = e => { let fin = '', mid = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const s = e.results[i][0].transcript; if (e.results[i].isFinal) fin += s; else mid += s; } if (fin) baseText.current += fin.trim() + ' '; setText(baseText.current + mid); };
      r.onerror = e => { setListen(false); if (e.error !== 'aborted' && e.error !== 'no-speech') app.toast(e.error === 'not-allowed' ? 'Microphone permission was refused.' : 'Voice typing stopped: ' + e.error); };
      r.onend = () => setListen(false);
      try { r.start(); setListen(true); } catch (e) { app.toast('Could not start voice typing.'); }
    };
    const setCase = v => { if (t) app.mut(db => { const x = find(db, t.id); if (x) x.caseId = v; }); else setDraftCase(v); app.setState({ brainCase: v }); };
    const archive = (x, on) => { setMenu(null); app.mut(db => { const y = find(db, x.id); if (y) y.archived = on; }, on ? 'Chat archived' : 'Chat restored'); if (on && S.brainThread === x.id) app.setState({ brainThread: '' }); };
    const del = x => { setMenu(null); V.confirmBox(app, 'Delete this chat?', `"${x.title}" and its messages will be deleted. This cannot be undone.`, 'Delete chat', () => { app.mut(db => { db.brain = threads(db).filter(y => y.id !== x.id); }, 'Chat deleted'); if (S.brainThread === x.id) app.setState({ brainThread: '' }); }); };
    const saveName = x => { const v = rename.trim(); setRenaming(null); if (v && v !== x.title) app.mut(db => { const y = find(db, x.id); if (y) y.title = v.slice(0, 80); }); };
    const copy = s => { try { navigator.clipboard.writeText(s); app.toast('Copied'); } catch (e) { app.toast('Copy is not available in this browser'); } };
    const asTask = m => { const first = m.text.split('\n').map(s => s.trim()).find(Boolean) || 'Follow up'; app.modal(() => h(V.Modal, { title: 'Add as a task', onClose: () => app.modal(null) }, h(V.Form, { init: { t: first.replace(/^[-•\d.)\s]+/, '').slice(0, 140), due: L.addDays(L.today(), 1), who: d.user.name }, submit: 'Add task', onCancel: () => app.modal(null),
      fields: [{ k: 't', label: 'Task', req: true }, { k: 'due', label: 'Due', type: 'date', half: true, req: true }, { k: 'who', label: 'Assign to', type: 'select', options: d.team.filter(u => u.status !== 'Suspended').map(u => u.name), half: true }],
      onSubmit: v => { app.mut(db => { db.tasks.push({ id: L.uid('t'), caseId: caseId || '', t: v.t.trim(), who: v.who || db.user.name, due: v.due, done: false }); V.logIt(db, 'Task added from AI Case Brain: ' + v.t.trim(), caseId || undefined); }, 'Task added'); app.modal(null); } }))); };
    const toWord = m => L.docx(titleOf(t ? t.title : 'AI answer').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.docx', m.text.split(/\n/).map(s => [{ t: s }]));
    const regen = () => { if (!t || busy) return; const lastUser = [...t.msgs].reverse().find(m => m.role === 'user'); if (!lastUser) return;
      app.mut(db => { const x = find(db, t.id); if (x && x.msgs.length && x.msgs[x.msgs.length - 1].role === 'ai') x.msgs.pop(); }, null, true); send(app, t.id, lastUser.text, [], { regen: true }); };

    /* Source tags in an answer link to the order, hearing list, case details or documents. */
    const caseOrders = C ? d.orders.filter(o => o.caseId === C.id) : [];
    const citeGo = c => { if (!C || /^Attachment:/.test(c)) return null; const m = /^Order (\d\d\.\d\d\.\d{4})/.exec(c), o = m && caseOrders.find(x => L.dmy(x.date) === m[1]);
      if (o) return () => app.go('order', o.id); if (/^Case details/.test(c)) return () => V.caseDetails(app, C.id, { 'Case details › Parties': 'pet', 'Case details › Issues': 'issues', 'Case details › Our arguments': 'ours', "Case details › Opponent's arguments": 'opp', 'Case details › Missing documents': 'missing', 'Case details › Summary': 'summary' }[c]);
      if (/^Hearing/.test(c)) return () => app.go('case', C.id, 'hearings'); if (c === 'Tasks') return () => app.go('case', C.id); return () => app.go('case', C.id, 'documents'); };
    const chipS = { fontSize: 12, background: K.soft2, color: '#2B2B2B', border: 0, borderRadius: 8, padding: '2px 8px', textAlign: 'left', overflowWrap: 'anywhere' };
    const fileChip = (f, onRemove) => h('div', { key: f.key || f.name, style: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid ' + K.line, borderRadius: 10, padding: f.thumb ? 4 : '6px 10px', maxWidth: 260, minWidth: 0 } },
      f.thumb ? h('img', { src: f.thumb, alt: '', style: { width: 40, height: 40, objectFit: 'cover', borderRadius: 7, flexShrink: 0 } }) : h('span', { style: { width: 30, height: 36, borderRadius: 5, background: /\.pdf$/i.test(f.name) ? '#D93025' : (/\.docx$/i.test(f.name) ? '#2B579A' : '#5E5E5E'), color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4, flexShrink: 0 } }, (String(f.name).split('.').pop() || '').slice(0, 4).toUpperCase()),
      h('span', { style: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, paddingRight: f.thumb ? 6 : 0 } }, h('span', { style: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: K.ink } }, f.name), h('span', { style: { fontSize: 11.5, color: K.mut } }, [fileSize(f.size || 0), f.pages ? f.pages + ' page' + (f.pages > 1 ? 's' : '') : '', f.scanned ? 'scanned: read as images' : (f.kind === 'image' ? 'Image' : '')].filter(Boolean).join(' · '))),
      onRemove && h('button', { type: 'button', onClick: onRemove, 'aria-label': 'Remove ' + f.name, title: 'Remove', style: { border: 0, background: K.soft2, borderRadius: 10, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', color: K.txt, flexShrink: 0 } }, h(Ic, { n: 'x', s: 12 })));

    /* ---- sidebar: chat history ---- */
    const ql = q.trim().toLowerCase();
    const shown = all.filter(x => !!x.archived === showArch && (!ql || (x.title + ' ' + x.msgs.map(m => m.text).join(' ')).toLowerCase().includes(ql))).sort((a, b) => b.updated - a.updated);
    const groups = []; shown.forEach(x => { const g = dayGroup(x.updated); const last = groups[groups.length - 1]; if (last && last[0] === g) last[1].push(x); else groups.push([g, [x]]); });
    const nArch = all.filter(x => x.archived).length;
    const row = x => { const on = t && t.id === x.id, cs = x.caseId ? d.cases.find(c => c.id === x.caseId) : null;
      if (renaming === x.id) return h('div', { key: x.id, style: { padding: '2px 0' } }, h('input', { autoFocus: true, value: rename, 'aria-label': 'Chat name', onChange: e => setRename(e.target.value), onBlur: () => saveName(x), onKeyDown: e => { if (e.key === 'Enter') saveName(x); if (e.key === 'Escape') setRenaming(null); }, style: Object.assign({}, V.X.input, { height: 34, fontSize: 13.5 }) }));
      return h('div', { key: x.id, className: 'ls-brain-row', style: { position: 'relative', display: 'flex', alignItems: 'center', borderRadius: 8, background: on ? K.soft2 : 'transparent' } },
        h('button', { type: 'button', onClick: () => open(x.id), style: { flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'transparent', padding: '8px 4px 8px 10px', cursor: 'pointer', color: K.ink } },
          h('span', { style: { display: 'block', fontSize: 13.5, fontWeight: on ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, x.title),
          cs && h('span', { style: { display: 'block', fontSize: 11.5, color: K.mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, cs.title)),
        h('button', { type: 'button', className: 'ls-brain-more', onClick: e => { e.stopPropagation(); setMenu(menu === x.id ? null : x.id); }, 'aria-label': 'Options for ' + x.title, title: 'Rename, archive or delete', style: { width: 30, height: 30, flexShrink: 0, border: 0, background: 'transparent', borderRadius: 6, cursor: 'pointer', color: K.txt, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: on || menu === x.id ? 1 : undefined } }, h(Ic, { n: 'dots' })),
        menu === x.id && h(V.Drop, { onClose: () => setMenu(null), style: { right: 0, top: 34, minWidth: 180 } },
          h(V.Item, { onClick: () => { setMenu(null); setRenaming(x.id); setRename(x.title); } }, h('span', { style: { display: 'inline-flex', gap: 10, alignItems: 'center' } }, h(Ic, { n: 'pen', s: 16 }), 'Rename')),
          h(V.Item, { onClick: () => archive(x, !x.archived) }, h('span', { style: { display: 'inline-flex', gap: 10, alignItems: 'center' } }, h(Ic, { n: x.archived ? 'unarchive' : 'archive', s: 16 }), x.archived ? 'Restore from archive' : 'Archive')),
          h(V.Item, { onClick: () => del(x) }, h('span', { style: { display: 'inline-flex', gap: 10, alignItems: 'center', color: K.red } }, h(Ic, { n: 'trash', s: 16 }), 'Delete'))));
    };
    const sidebar = h('aside', { style: { display: mobile && !side ? 'none' : 'flex', flexDirection: 'column', minHeight: 0, borderRight: mobile ? 0 : '1px solid ' + K.line, background: '#FAFAF9', padding: 12, gap: 10 } },
      h('div', { style: { display: 'flex', gap: 8 } }, h('button', { type: 'button', className: 'ls-btn', onClick: newChat, style: { flex: 1, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, border: 0, background: K.ink, color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' } }, h(Ic, { n: 'plus', s: 16 }), 'New chat'), mobile && iconBtn('Close chat list', 'x', () => setSide(false), { style: { border: '1px solid ' + K.line, borderRadius: 10, background: '#fff' } })),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid ' + K.line, borderRadius: 10, padding: '0 10px', height: 36, color: K.mut } }, h(Ic, { n: 'search', s: 15 }), h('input', { value: q, onChange: e => setQ(e.target.value), placeholder: 'Search chats', 'aria-label': 'Search chats', style: { border: 0, outline: 'none', flex: 1, minWidth: 0, fontSize: 13.5, background: 'transparent' } })),
      h('div', { style: { display: 'flex', gap: 4, background: K.soft2, borderRadius: 9, padding: 3 } }, [[false, 'Chats'], [true, 'Archived' + (nArch ? ' (' + nArch + ')' : '')]].map(([v, l]) => h('button', { key: l, type: 'button', onClick: () => setShowArch(v), 'aria-pressed': showArch === v, style: { flex: 1, height: 28, border: 0, borderRadius: 7, fontSize: 12.5, cursor: 'pointer', background: showArch === v ? '#fff' : 'transparent', fontWeight: showArch === v ? 600 : 400, color: K.ink, boxShadow: showArch === v ? '0 1px 2px rgba(0,0,0,.08)' : 'none' } }, l))),
      h('div', { style: { flex: 1, minHeight: 0, overflowY: 'auto', margin: '0 -4px', padding: '0 4px' } },
        !shown.length && h('div', { style: { fontSize: 13, color: K.mut, padding: '16px 6px', lineHeight: 1.5 } }, ql ? 'No chats match.' : showArch ? 'No archived chats. Archive a chat from its ⋯ menu to tidy the list without deleting it.' : 'Your chats will appear here.'),
        groups.map(([g, xs]) => h('div', { key: g, style: { marginBottom: 10 } }, h('div', { style: { fontSize: 11.5, fontWeight: 600, color: K.mut, padding: '6px 10px 4px' } }, g), xs.map(row)))));

    /* ---- conversation ---- */
    const msgs = t ? t.msgs : [];
    const lastAi = msgs.length && msgs[msgs.length - 1].role === 'ai' ? msgs.length - 1 : -1;
    const actBtn = (label, n, onClick) => h('button', { type: 'button', onClick, title: label, 'aria-label': label, className: 'ls-btn', style: { height: 28, border: 0, background: 'transparent', borderRadius: 7, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: K.mut, cursor: 'pointer' } }, h(Ic, { n, s: 15 }), label);
    const bubble = (m, i) => m.role === 'user'
      ? h('div', { key: i, className: 'ls-msg', style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 } },
          (m.files || []).length > 0 && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '85%' } }, m.files.map((f, j) => fileChip(Object.assign({ key: j }, f)))),
          h('div', { style: { background: K.soft2, color: K.ink, borderRadius: 18, padding: '10px 16px', fontSize: 15, lineHeight: 1.55, maxWidth: '85%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, m.text))
      : h('div', { key: i, className: 'ls-msg', style: { display: 'flex', gap: 12, alignItems: 'flex-start' } },
          h('span', { style: { width: 30, height: 30, borderRadius: 15, border: '1px solid ' + K.line, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: K.ink } }, h(Ic, { n: 'spark', s: 16 })),
          h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 } },
            m.pending ? h('span', { className: 'ls-typing', role: 'status', 'aria-label': 'Preparing the answer', style: { color: '#8A8A8A', display: 'inline-flex', padding: '6px 0' } }, h('span'), h('span'), h('span'))
              : h('div', { className: 'ls-fade', style: { fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: m.err ? K.red : '#1A1A1A' } }, m.text.replace(/\*\*/g, '')),
            !m.pending && (m.cites || []).length > 0 && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } }, m.cites.map((c, j) => { const go = citeGo(c); return go ? h('button', { key: j, type: 'button', className: 'ls-cite', title: 'Open the source', onClick: go, style: Object.assign({ cursor: 'pointer' }, chipS) }, c) : h('span', { key: j, style: chipS }, c); }),
              C && m.need && V.NEED[m.need] && h(V.Btn, { small: true, primary: true, onClick: () => V.caseDetails(app, C.id, V.NEED[m.need][0]) }, V.NEED[m.need][1])),
            !m.pending && m.text && !(m.err && m.text === 'Stopped.') && h('div', { style: { display: 'flex', gap: 2, flexWrap: 'wrap', marginLeft: -8 } },
              actBtn('Copy', 'copy', () => copy(m.text)), !m.err && actBtn('Add as task', 'task', () => asTask(m)), !m.err && actBtn('Word file', 'word', () => toWord(m)), i === lastAi && !busy && actBtn('Regenerate', 'redo', regen))));
    const name = String(d.user.title || d.user.name || '').replace(/^Adv\.?\s*/i, '').split(' ')[0];
    const welcome = h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 22, padding: '24px 4px', textAlign: 'center' } },
      h('div', null, h('div', { style: { width: 48, height: 48, borderRadius: 24, border: '1px solid ' + K.line, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 } }, h(Ic, { n: 'spark', s: 24 })),
        h('h2', { style: { fontFamily: "'Instrument Sans',system-ui,sans-serif", fontWeight: 600, letterSpacing: '-.02em', fontSize: mobile ? 22 : 26, margin: 0 } }, 'How can I help' + (name ? ', ' + name : '') + '?'),
        h('div', { style: { fontSize: 14, color: K.mut, marginTop: 6, maxWidth: 520 } }, C ? `This chat is linked to ${C.title}. Answers use its orders, hearings and case details, with links to the source.` : 'Ask anything, attach documents or photos, or give a task. Link a case at the top to ask about its records.')),
      h('div', { style: { display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10, width: '100%', maxWidth: 760 } }, (C ? [['Prepare a hearing brief', 'From the orders, hearings and case details', 'case', 'Prepare a hearing brief'], ...TASKS.slice(0, 5)] : TASKS).map(([label, sub, ic, prompt, needFile]) => h('button', { key: label, type: 'button', className: 'ls-btn ls-lift', onClick: () => { if (label === 'Prepare a hearing brief') { let tid = t && !t.archived ? t.id : newThread(app, caseId); if (!tid) return; app.setState({ brainThread: tid }); return send(app, tid, prompt); } setText(prompt); setTimeout(() => { const el = box.current; if (el) { el.focus(); el.setSelectionRange(prompt.length, prompt.length); } }, 20); if (needFile && !atts.length) pick(); },
        style: { textAlign: 'left', background: '#fff', border: '1px solid ' + K.line, borderRadius: 12, padding: '14px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', color: K.ink } }, h('span', { style: { color: K.txt, marginTop: 1 } }, h(Ic, { n: ic, s: 18 })), h('span', { style: { minWidth: 0 } }, h('span', { style: { display: 'block', fontSize: 13.5, fontWeight: 600 } }, label), h('span', { style: { display: 'block', fontSize: 12.5, color: K.mut, marginTop: 2, lineHeight: 1.4 } }, sub))))));

    const caseSel = h('select', { value: caseId || '', onChange: e => setCase(e.target.value), 'aria-label': 'Case linked to this chat', title: 'Link this chat to a case', style: { height: 34, maxWidth: mobile ? 170 : 300, border: '1px solid ' + K.line, borderRadius: 8, background: '#fff', fontSize: 13, padding: '0 8px', color: K.ink, minWidth: 0 } },
      h('option', { value: '' }, 'No case · general chat'), d.cases.map(c => h('option', { key: c.id, value: c.id }, (c.no ? c.no + ' · ' : '') + c.title)));
    const head = h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid ' + K.line, background: '#fff', minWidth: 0 } },
      mobile && iconBtn('Show chats', 'menu', () => setSide(true)),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t ? t.title : 'New chat'), t && t.archived && h('div', { style: { fontSize: 12, color: K.mut } }, 'Archived · restore it to keep chatting')),
      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, color: K.mut } }, !mobile && h(Ic, { n: 'case', s: 16 }), caseSel),
      C && !mobile && h('span', { style: { fontSize: 12, color: K.mut, whiteSpace: 'nowrap' } }, (n => n + (n === 1 ? ' doc' : ' docs'))(d.docs.filter(x => x.caseId === C.id).length) + ' · ' + (n => n + (n === 1 ? ' order' : ' orders'))(d.orders.filter(x => x.caseId === C.id).length)),
      t && iconBtn('New chat', 'plus', newChat, { style: { border: '1px solid ' + K.line, borderRadius: 8, width: 34, height: 34 } }));

    const canSend = !busy && !reading && (text.trim() || atts.length);
    const composer = h('div', { style: { padding: mobile ? '8px 10px 12px' : '8px 20px 16px', background: '#fff' } },
      h('div', { style: { maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 } },
        C && msgs.length > 0 && h('div', { style: { display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 } }, CASE_TASKS.map(l => h('button', { key: l, type: 'button', className: 'ls-btn', disabled: busy, onClick: () => t && send(app, t.id, l), style: { whiteSpace: 'nowrap', height: 30, padding: '0 12px', background: '#fff', border: '1px solid ' + K.line, borderRadius: 15, fontSize: 12.5, color: K.ink, cursor: 'pointer', flexShrink: 0 } }, l))),
        t && t.archived ? h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10, padding: 10, border: '1px solid ' + K.line, borderRadius: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5, color: K.mut } }, 'This chat is archived.', h(V.Btn, { small: true, primary: true, onClick: () => archive(t, false) }, 'Restore chat'))
        : h('div', { onDragOver: e => { e.preventDefault(); setDrag(true); }, onDragLeave: () => setDrag(false), onDrop: e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); },
            style: { border: '1px solid ' + (drag ? K.ink : '#C4C4C4'), borderRadius: 20, background: drag ? K.soft : '#fff', padding: '8px 8px 8px 8px', boxShadow: '0 2px 10px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 6 } },
          (atts.length > 0 || reading > 0) && h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', padding: '2px 4px 0' } }, atts.map(f => fileChip(f, () => setAtts(a => a.filter(x => x.key !== f.key)))), reading > 0 && h('span', { style: { fontSize: 12.5, color: K.mut, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 6px' } }, h('span', { className: 'ls-typing', style: { display: 'inline-flex' } }, h('span'), h('span'), h('span')), 'Reading file…')),
          h('textarea', { ref: box, value: text, rows: 1, 'aria-label': 'Message AI Case Brain', placeholder: listen ? 'Listening… speak now' : (C ? 'Ask about ' + C.title + ', or give a task…' : 'Message AI Case Brain…'),
            onChange: e => setText(e.target.value), onPaste: e => { const fs = [...(e.clipboardData && e.clipboardData.files || [])]; if (fs.length) { e.preventDefault(); addFiles(fs); } },
            onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !mobile) { e.preventDefault(); submit(); } },
            style: { border: 0, outline: 'none', resize: 'none', font: 'inherit', fontSize: 15, lineHeight: 1.5, padding: '6px 8px', maxHeight: 220, background: 'transparent', color: K.ink } }),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
            h('input', { ref: fileIn, type: 'file', multiple: true, accept: '.pdf,.docx,.txt,.csv,.md,.rtf,.html,.json,image/*', onChange: e => { addFiles(e.target.files); e.target.value = ''; }, style: { display: 'none' } }),
            iconBtn('Attach documents or images', 'clip', pick, { style: { border: '1px solid ' + K.line } }),
            h('span', { style: { flex: 1 } }),
            h('select', { 'aria-label': 'Voice typing language', title: 'Voice typing language', value: d.settings.dictLang === 'hi-IN' ? 'hi-IN' : 'en-IN', disabled: listen, onChange: e => { const v = e.target.value; app.mut(db => { db.settings.dictLang = v; }); }, style: { height: 30, border: 0, background: 'transparent', fontSize: 12.5, color: K.mut, cursor: 'pointer' } }, h('option', { value: 'en-IN' }, 'English'), h('option', { value: 'hi-IN' }, 'हिंदी')),
            iconBtn(listen ? 'Stop voice typing' : 'Voice typing', 'mic', toggleMic, { attrs: { 'aria-pressed': listen }, style: listen ? { background: K.redBg, color: K.red } : null }),
            busy ? iconBtn('Stop answering', 'stop', () => stop(app), { style: { background: K.ink, color: '#fff' } })
              : iconBtn('Send', 'send', submit, { attrs: { disabled: !canSend }, style: { background: canSend ? K.ink : '#D4D4D4', color: '#fff', cursor: canSend ? 'pointer' : 'default' } }))),
        h('div', { style: { fontSize: 11.5, color: K.mut, textAlign: 'center' } }, 'AI can make mistakes. Check facts, sections and citations before relying on them.' + (window.LSB && LSB.on && d.sub && d.sub.aiUsed != null ? ` · ${d.sub.aiUsed} AI credits used this month` : ''))));

    const convo = h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: '#fff' } }, head,
      h('div', { style: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
        msgs.length ? h('div', { style: { maxWidth: 800, width: '100%', margin: '0 auto', padding: mobile ? '16px 12px' : '24px 20px', display: 'flex', flexDirection: 'column', gap: 22 } }, msgs.map(bubble), h('div', { id: 'ls-brain-end' })) : welcome),
      composer);

    return h('div', { style: { margin: mobile ? '-8px -4px' : 0 } },
      h('div', { style: { background: '#fff', border: '1px solid ' + K.line, borderRadius: 14, overflow: 'hidden', display: 'grid', gridTemplateColumns: mobile ? '1fr' : '270px 1fr', height: mobile ? 'calc(100vh - 120px)' : 'calc(100vh - 160px)', minHeight: 480, position: 'relative' } },
        mobile && side ? sidebar : null, !mobile && sidebar, !(mobile && side) && convo));
  }

  V.MODULES.brain = Brain;
  Object.assign(V, { Brain, brainAsk: ask, brainThreads: threads });
})();

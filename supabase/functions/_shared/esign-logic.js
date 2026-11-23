// Pure logic of electronic signing (no network, no database): used by functions/esign and unit-tested in node
// (tests/esign-logic.test.mjs). Plain JavaScript so Deno and node run it unchanged.

export const PAGE = { w: 595.28, h: 841.89, mx: 56, top: 56, bottom: 64 };   // A4 in points
export const ROLES = ['Advocate', 'Petitioner', 'Respondent', 'Client', 'Witness', 'Other'];
export const FIELD_KINDS = ['signature', 'initials', 'date', 'name', 'designation', 'text'];
export const CONSENT_VERSION = 'v1';
export const CONSENT_TEXT = 'I agree to sign this document electronically. I have read the document and I intend my electronic signature to have the same effect as my handwritten signature. I understand that this is a simple electronic signature (typed or drawn) under the Information Technology Act, 2000, and that it is not an Aadhaar eSign or a Digital Signature Certificate (DSC) signature.';
export const SIGNATURE_TYPE_NOTE = 'Simple electronic signature (typed or drawn), made through Legal Staff. It is not an Aadhaar eSign and not a Digital Signature Certificate (DSC) signature.';
export const LEGAL_LIMITS = [
  'This is a simple electronic signature. It is not an Aadhaar eSign or a Digital Signature Certificate (DSC) signature, and it carries no statutory presumption of a secure electronic signature.',
  'Some documents cannot be signed electronically under the First Schedule to the Information Technology Act, 2000 (for example a will, a trust, a power of attorney and a contract for the sale of immovable property). Check the law before sending such a document.',
  'Documents that must be filed in court, sworn, notarised or stamped (affidavits, vakalatnamas, and similar) may need a wet-ink signature, a DSC or another form the court or authority accepts. Check the rules of the forum.',
  'Stamp duty, registration and attestation requirements are not affected by electronic signing.'
];
export const TERMINAL = ['completed', 'declined', 'expired', 'cancelled', 'failed'];
export const OPEN = ['sent', 'viewed', 'partial'];

// ---------- text helpers ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', rupee: '₹', copy: '©', middot: '·', bull: '•' };
export const decodeEntities = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' '; }
  return ENT[e.toLowerCase()] ?? m;
});
/** Characters the standard PDF fonts (WinAnsi) can draw. Everything else is replaced and counted, unless a Unicode font is supplied. */
const WIN = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.split(''));
export const winSafe = (s) => { let bad = 0; const out = Array.from(String(s).replace(/₹\s?/g, 'Rs. ')).map((c) => { const n = c.codePointAt(0); if ((n >= 32 && n < 127) || (n >= 160 && n <= 255) || WIN.has(c)) return c; if (c === '\n' || c === '\t') return c; bad++; return c === '​' || c === '﻿' ? '' : '?'; }).join(''); return { text: out, bad }; };

// ---------- the document: draft HTML → blocks of styled text ----------
const BLOCK = /^(p|div|h[1-6]|li|blockquote|tr|section|article|header|footer|pre)$/;
/** Reads the Drafting Studio's HTML (paragraphs, headings, lists, bold, italic, underline, line breaks) into blocks. */
export function parseHtml(html) {
  html = String(html ?? '').replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const blocks = []; let cur = null, b = 0, i = 0, u = 0; const lists = []; let align = 'left';
  const start = (type, al) => { if (cur && cur.runs.length) blocks.push(cur); cur = { type, align: al || align, runs: [], indent: Math.max(0, lists.length - (type === 'li' ? 1 : 0)), bullet: '' }; };
  const flush = () => { if (cur && cur.runs.length) blocks.push(cur); cur = null; };
  const push = (t) => { if (!t) return; if (!cur) start('p'); const r = cur.runs, last = r[r.length - 1]; if (last && last.b === !!b && last.i === !!i && last.u === !!u) last.t += t; else r.push({ t, b: !!b, i: !!i, u: !!u }); };
  const re = /<(\/?)([a-z][a-z0-9]*)([^>]*)>|([^<]+)/gi; let m; const stack = [];
  while ((m = re.exec(html))) {
    if (m[4] != null) { const t = decodeEntities(m[4]).replace(/\s+/g, ' '); if (t.trim() || (cur && cur.runs.length)) push(cur && cur.runs.length ? t : t.replace(/^\s+/, '')); continue; }
    const close = !!m[1], tag = m[2].toLowerCase(), attrs = m[3] || '';
    const al = (/text-align\s*:\s*(center|right|justify|left)/i.exec(attrs) || /\balign\s*=\s*["']?(center|right|justify|left)/i.exec(attrs) || [])[1];
    if (tag === 'br') { if (cur) push('\n'); else blocks.push({ type: 'gap', runs: [], align: 'left', indent: 0, bullet: '' }); continue; }
    if (tag === 'b' || tag === 'strong') { b += close ? (b > 0 ? -1 : 0) : 1; continue; }
    if (tag === 'i' || tag === 'em') { i += close ? (i > 0 ? -1 : 0) : 1; continue; }
    if (tag === 'u') { u += close ? (u > 0 ? -1 : 0) : 1; continue; }
    if (tag === 'ul' || tag === 'ol') { flush(); if (close) lists.pop(); else lists.push({ ordered: tag === 'ol', n: 0 }); continue; }
    if (/^h[1-6]$/.test(tag)) { flush(); if (close) b = Math.max(0, b - 1); else { b++; start('h', al || (tag === 'h1' ? 'center' : 'left')); cur.level = +tag[1]; } continue; }
    if (tag === 'li') { flush(); if (!close) { const l = lists[lists.length - 1]; if (l) l.n++; start('li', al); cur.bullet = l && l.ordered ? l.n + '.' : '•'; } continue; }
    if (BLOCK.test(tag)) {
      if (close) { flush(); const a = stack.pop(); align = a || 'left'; }
      else { flush(); stack.push(align); if (al) align = al; start('p'); cur.runs = []; }
      continue;
    }
  }
  flush();
  return blocks;
}

// ---------- layout ----------
/** Lays blocks out on A4 pages. measure(text, size, bold, italic) → width in points. Returns { pageW, pageH, pages: [{ lines, rules }] }.
 *  A line is { x, y, size, runs:[{t,b,i,u}] } with y the baseline measured from the top of the page. */
export function layoutDocument(blocks, measure, opts = {}) {
  const P = PAGE, width = P.w - 2 * P.mx, pages = [{ lines: [], rules: [] }];
  const body = opts.size || 11.5, lead = body * 1.42;
  let y = P.top, pg = pages[0];
  const room = (need) => { if (y + need > P.h - P.bottom) { pg = { lines: [], rules: [] }; pages.push(pg); y = P.top; return true; } return false; };
  const lh = opts.letterhead;
  if (lh && (lh.name || lh.address)) {
    const name = String(lh.name || '').slice(0, 120), addr = 'Advocates' + (lh.address ? ' · ' + String(lh.address).slice(0, 200) : '');
    y += 18; pg.lines.push({ x: P.mx, y, size: 17, runs: [{ t: name, b: true, i: false, u: false }] });
    y += 15; for (const l of wrap([{ t: addr, b: false, i: false, u: false }], 9.5, width, measure)) { pg.lines.push({ x: P.mx, y, size: 9.5, runs: l.runs }); y += 12; }
    y += 2; pg.rules.push({ y, x1: P.mx, x2: P.w - P.mx, w: 1.5 }); y += 22;
  }
  let gapPending = 0;
  for (const bl of blocks) {
    if (bl.type === 'gap') { gapPending += lead; continue; }
    const size = bl.type === 'h' ? (bl.level <= 1 ? 14 : bl.level === 2 ? 13 : body + 0.5) : body;
    const indent = (bl.indent || 0) * 22 + (bl.type === 'li' ? 22 : 0);
    const runs = bl.runs.map((r) => ({ ...r, b: r.b || bl.type === 'h' }));
    const lines = wrap(runs, size, width - indent, measure);
    if (!lines.length) continue;
    y += gapPending; gapPending = 0;
    if (bl.type === 'h') y += 4;
    const ll = size * 1.42;
    room(ll * Math.min(lines.length, 2));            // keep at least two lines together
    lines.forEach((l, k) => {
      if (k > 0) room(ll);
      y += ll;
      let x = P.mx + indent; const w = l.width;
      if (bl.align === 'center') x = P.mx + indent + (width - indent - w) / 2; else if (bl.align === 'right') x = P.w - P.mx - w;
      if (k === 0 && bl.type === 'li') pg.lines.push({ x: P.mx + indent - 16, y, size, runs: [{ t: bl.bullet, b: false, i: false, u: false }] });
      pg.lines.push({ x, y, size, runs: l.runs });
    });
    y += size * (bl.type === 'h' ? 0.6 : 0.45);
  }
  return { pageW: P.w, pageH: P.h, pages };
}
/** Greedy word wrap of styled runs into lines no wider than max. Words longer than a line are broken. */
export function wrap(runs, size, max, measure) {
  const lines = []; let cur = [], w = 0;
  const addTo = (r, t) => { const l = cur[cur.length - 1]; if (l && l.b === r.b && l.i === r.i && l.u === r.u) l.t += t; else cur.push({ t, b: r.b, i: r.i, u: r.u }); };
  const end = () => { while (cur.length && /^\s+$/.test(cur[cur.length - 1].t)) cur.pop(); if (cur.length) { cur[cur.length - 1].t = cur[cur.length - 1].t.replace(/\s+$/, ''); lines.push({ runs: cur, width: runsWidth(cur, size, measure) }); } cur = []; w = 0; };
  for (const r of runs) {
    for (const part of r.t.split(/(\n)/)) {
      if (part === '\n') { end(); if (!cur.length) lines.push({ runs: [{ t: '', b: false, i: false, u: false }], width: 0 }); continue; }
      for (const tok of part.split(/(\s+)/)) {
        if (!tok) continue;
        const tw = measure(tok, size, r.b, r.i), space = /^\s+$/.test(tok);
        if (!space && w + tw > max && cur.length) end();
        if (space && !cur.length) continue;
        if (tw > max) { let piece = ''; for (const ch of Array.from(tok)) { if (measure(piece + ch, size, r.b, r.i) > max && piece) { addTo(r, piece); end(); piece = ''; } piece += ch; } if (piece) { addTo(r, piece); w += measure(piece, size, r.b, r.i); } continue; }
        addTo(r, tok); w += tw;
      }
    }
  }
  end();
  return lines;
}
const runsWidth = (runs, size, measure) => runs.reduce((a, r) => a + measure(r.t, size, r.b, r.i), 0);

// ---------- validation ----------
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const cleanPhone = (p) => { const t = String(p ?? '').replace(/[^\d+]/g, ''); return t; };
export const phoneOk = (p) => /^(\+\d{8,15}|\d{10})$/.test(cleanPhone(p));
/** Checks signers and fields. Returns a list of plain-language problems (empty when fine). */
export function validatePrepared({ signers, fields, mode, pageCount }, lim) {
  const out = [];
  if (!signers.length) out.push('Add at least one signer.');
  if (signers.length > lim.max_signers) out.push(`A document can have at most ${lim.max_signers} signers.`);
  if (fields.length > lim.max_fields) out.push(`A document can have at most ${lim.max_fields} fields.`);
  const seen = new Set();
  signers.forEach((s, k) => {
    const who = s.name ? s.name : 'Signer ' + (k + 1);
    if (!String(s.name ?? '').trim()) out.push(`Signer ${k + 1} needs a full name.`);
    if (!EMAIL.test(String(s.email ?? '').trim())) out.push(`${who} needs a valid email address.`);
    if (!phoneOk(s.phone)) out.push(`${who} needs a mobile number (10 digits, or with country code).`);
    if (!ROLES.includes(s.role)) out.push(`${who} needs a role.`);
    const e = String(s.email ?? '').trim().toLowerCase(); if (e && seen.has(e)) out.push(`${e} is listed twice.`); seen.add(e);
    if (!(s.sign_order >= 1 && s.sign_order <= 50)) out.push(`${who} needs a signing order from 1 to 50.`);
  });
  if (mode !== 'parallel' && mode !== 'sequential') out.push('Choose sequential or parallel signing.');
  for (const f of fields) {
    if (!FIELD_KINDS.includes(f.kind)) out.push('A field has an unknown type.');
    if (!(f.page >= 1 && f.page <= Math.max(1, pageCount))) out.push('A field is on a page that does not exist.');
    if (!signers.some((s) => s.key === f.signer_key)) out.push('A field is not assigned to a signer.');
    if (!(f.w > 0 && f.h > 0 && f.x >= 0 && f.y >= 0 && f.x + f.w <= 1.0001 && f.y + f.h <= 1.0001)) out.push('A field is outside the page.');
  }
  signers.forEach((s) => {
    const mine = fields.filter((f) => f.signer_key === s.key);
    if (s.required && !mine.some((f) => f.kind === 'signature')) out.push(`${s.name || 'A required signer'} needs at least one signature field.`);
    if (!s.required && !mine.length) out.push(`${s.name || 'An optional signer'} has no fields.`);
  });
  return out;
}
export const clampExpiry = (days, lim) => { const n = Math.round(Number(days)); return Number.isFinite(n) && n >= 1 ? Math.min(n, lim.max_expiry_days) : lim.default_expiry_days; };

// ---------- who may sign now, and what the request's status is ----------
/** Signers whose turn it is. Parallel: everyone still pending. Sequential: the lowest order group that still has a pending required
 *  signer (optional signers earlier in the order never hold anyone up), plus anyone in the same or an earlier order. */
export function activeSigners(mode, signers) {
  const open = signers.filter((s) => s.status !== 'signed' && s.status !== 'declined');
  if (mode === 'parallel') return open;
  const blockers = signers.filter((s) => s.required && s.status !== 'signed' && s.status !== 'declined');
  if (!blockers.length) return open;
  const first = Math.min(...blockers.map((s) => s.sign_order));
  return open.filter((s) => s.sign_order <= first);
}
export const canSignNow = (mode, signers, id) => activeSigners(mode, signers).some((s) => s.id === id);
/** Request status from the signers' states (terminal and cancelled states are decided elsewhere). */
export function deriveStatus(req, signers, now = Date.now()) {
  if (TERMINAL.includes(req.status) || req.status === 'prepared' || req.status === 'draft') return req.status;
  if (signers.some((s) => s.required && s.status === 'declined')) return 'declined';
  const reqd = signers.filter((s) => s.required);
  if (reqd.length && reqd.every((s) => s.status === 'signed')) return 'completed';
  if (req.expires_at && Date.parse(req.expires_at) <= now) return 'expired';
  if (signers.some((s) => s.status === 'signed')) return 'partial';
  if (signers.some((s) => s.status === 'viewed')) return 'viewed';
  return 'sent';
}
export const STATUS_LABEL = { draft: 'Draft', prepared: 'Prepared for Signature', sent: 'Sent', viewed: 'Viewed', partial: 'Partially Signed', completed: 'Completed', declined: 'Declined', expired: 'Expired', cancelled: 'Cancelled', failed: 'Failed' };
export const SIGNER_LABEL = { pending: 'Waiting for their turn', notified: 'Sent, not opened', viewed: 'Opened', signed: 'Signed', declined: 'Declined' };
/** What is pending for a signer, in words, for the status panel. */
export function pendingAction(req, signers, s) {
  if (['completed', 'cancelled', 'expired', 'declined', 'failed'].includes(req.status)) return '';
  if (s.status === 'signed') return '';
  if (s.status === 'declined') return 'Declined' + (s.decline_reason ? ': ' + s.decline_reason : '');
  if (!canSignNow(req.mode, signers, s.id)) { const w = activeSigners(req.mode, signers).filter((x) => x.required && x.id !== s.id).map((x) => x.name); return 'Waits for ' + (w.join(', ') || 'earlier signers'); }
  return s.status === 'viewed' ? 'Opened the document, has not signed' : 'Has not opened the link yet';
}

// ---------- tokens, codes, hashes (WebCrypto: Deno and node 20+) ----------
const b64url = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const newToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
export const hex = (buf) => Array.from(new Uint8Array(buf)).map((x) => x.toString(16).padStart(2, '0')).join('');
export const sha256 = async (data) => hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data));
export const tokenOk = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
/** A 6-digit one-time code without modulo bias. */
export const newCode = () => { const a = new Uint32Array(1); let n; do { crypto.getRandomValues(a); n = a[0]; } while (n >= 4294000000); return String(n % 1000000).padStart(6, '0'); };
export const timingEq = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let d = 0; for (let k = 0; k < a.length; k++) d |= a.charCodeAt(k) ^ b.charCodeAt(k); return d === 0; };

// ---------- images from signers ----------
/** A signature picture sent by a signer: a PNG data URL of reasonable size. Returns the bytes or throws a plain message. */
export function readPng(dataUrl, maxBytes = 300000) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ''));
  if (!m) throw new Error('The signature picture is not valid.');
  const bin = atob(m[1]); if (bin.length > maxBytes) throw new Error('The signature picture is too large.');
  const u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (!(u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47)) throw new Error('The signature picture is not a PNG.');
  return u8;
}
/** DD.MM.YYYY in India time. */
export const istDate = (ms = Date.now()) => { const d = new Date(ms + 5.5 * 3600e3).toISOString(); return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`; };
export const istStamp = (ms) => { const d = new Date(ms + 5.5 * 3600e3).toISOString(); return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)} ${d.slice(11, 19)} IST`; };
export const istMonthStart = (ms = Date.now()) => { const d = new Date(ms + 5.5 * 3600e3); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 5.5 * 3600e3).toISOString(); };
export const clientIp = (h) => String((h.get ? h.get('x-forwarded-for') || h.get('cf-connecting-ip') || h.get('x-real-ip') : '') || '').split(',')[0].trim().slice(0, 64);

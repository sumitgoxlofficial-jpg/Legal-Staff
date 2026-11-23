// Unit tests of the pure signing logic (supabase/functions/_shared/esign-logic.js). Run: node tests/esign-logic.test.mjs
import * as L from '../supabase/functions/_shared/esign-logic.js';
let pass = 0, fail = 0;
const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };
const measure = (s, size) => s.length * size * 0.5;

await t('parseHtml: paragraphs, bold, italic, entities, breaks', () => {
  const b = L.parseHtml('<p>Hello <b>big</b> &amp; <i>small</i><br>next</p><h1>TITLE</h1><ul><li>one</li><li>two</li></ul><script>alert(1)</script>');
  eq(b[0].runs.map(r => r.t).join(''), 'Hello big & small\nnext'); ok(b[0].runs.some(r => r.b && r.t === 'big')); ok(b[0].runs.some(r => r.i));
  eq(b[1].type, 'h'); eq(b[1].align, 'center'); eq(b[2].bullet, '•'); eq(b[3].type, 'li');
  ok(!JSON.stringify(b).includes('alert'));
});
await t('parseHtml: ordered list numbers, alignment, nested divs', () => {
  const b = L.parseHtml('<div style="text-align:right">R</div><ol><li>a</li><li>b</li></ol><div><div>inner</div></div>');
  eq(b[0].align, 'right'); eq(b[1].bullet, '1.'); eq(b[2].bullet, '2.'); eq(b[3].runs[0].t, 'inner');
});
await t('layout: wraps, paginates, keeps every line inside the margins', () => {
  const html = Array.from({ length: 120 }, (_, i) => `<p>Paragraph ${i} ` + 'word '.repeat(60) + '</p>').join('');
  const d = L.layoutDocument(L.parseHtml(html), measure, { letterhead: { name: 'Firm', address: 'Delhi' } });
  ok(d.pages.length > 3, 'pages ' + d.pages.length);
  for (const p of d.pages) for (const l of p.lines) { ok(l.y <= L.PAGE.h - L.PAGE.bottom + 1, 'bottom'); ok(l.x >= L.PAGE.mx - 20, 'left'); ok(l.x + l.runs.reduce((a, r) => a + measure(r.t, l.size), 0) <= L.PAGE.w - L.PAGE.mx + 1, 'right'); }
  eq(d.pages[0].lines[0].runs[0].t, 'Firm'); ok(d.pages[0].rules.length === 1);
});
await t('layout: a very long word is broken, empty document has one page', () => {
  const d = L.layoutDocument(L.parseHtml('<p>' + 'x'.repeat(500) + '</p>'), measure); ok(d.pages[0].lines.length > 1);
  eq(L.layoutDocument([], measure).pages.length, 1);
});
await t('winSafe replaces what the standard fonts cannot draw', () => { const r = L.winSafe('Rs ₹ 5 नमस्ते é “q”'); ok(r.bad >= 5); ok(r.text.startsWith('Rs Rs. 5'), r.text); eq(L.winSafe('₹[amount]').text, 'Rs. [amount]'); eq(L.winSafe('₹500').bad, 0); ok(r.text.includes('é') && r.text.includes('“')); });
const lim = { max_signers: 3, max_fields: 5, default_expiry_days: 14, max_expiry_days: 30 };
const S = (o) => Object.assign({ key: 'a', name: 'Asha Rao', email: 'asha@x.in', phone: '9876543210', role: 'Client', sign_order: 1, required: true }, o);
const F = (o) => Object.assign({ kind: 'signature', page: 1, x: .1, y: .1, w: .3, h: .06, signer_key: 'a' }, o);
await t('validatePrepared accepts a good setup', () => eq(L.validatePrepared({ signers: [S()], fields: [F()], mode: 'parallel', pageCount: 2 }, lim), []));
await t('validatePrepared finds every kind of problem', () => {
  const p = L.validatePrepared({ signers: [S({ name: '', email: 'bad', phone: '12' }), S({ key: 'b', email: 'asha@x.in' }), S({ key: 'c' }), S({ key: 'd', email: 'd@x.in' })], fields: [F({ page: 9 }), F({ x: .9 }), F({ signer_key: 'zz' }), F({ kind: 'stamp' })], mode: 'x', pageCount: 2 }, lim).join(' | ');
  for (const w of ['full name', 'valid email', 'mobile', 'at most 3 signers', 'listed twice', 'sequential or parallel', 'page that does not exist', 'outside the page', 'not assigned', 'unknown type', 'signature field']) ok(p.includes(w), 'missing: ' + w);
});
await t('a required signer needs a signature field; an optional one needs any field', () => {
  ok(L.validatePrepared({ signers: [S()], fields: [F({ kind: 'date' })], mode: 'parallel', pageCount: 1 }, lim).some(x => /signature field/.test(x)));
  eq(L.validatePrepared({ signers: [S({ required: false })], fields: [F({ kind: 'date' })], mode: 'parallel', pageCount: 1 }, lim), []);
});
await t('clampExpiry', () => { eq(L.clampExpiry(7, lim), 7); eq(L.clampExpiry(999, lim), 30); eq(L.clampExpiry('x', lim), 14); eq(L.clampExpiry(0, lim), 14); });
const sg = (id, order, status = 'notified', required = true) => ({ id, sign_order: order, status, required, name: id });
await t('parallel: everyone open may sign', () => eq(L.activeSigners('parallel', [sg('a', 1), sg('b', 2), sg('c', 1, 'signed')]).map(s => s.id), ['a', 'b']));
await t('sequential: only the lowest group may sign; the next follows when it is done', () => {
  eq(L.activeSigners('sequential', [sg('a', 1), sg('b', 2), sg('c', 3)]).map(s => s.id), ['a']);
  eq(L.activeSigners('sequential', [sg('a', 1, 'signed'), sg('b', 2), sg('c', 3)]).map(s => s.id), ['b']);
  eq(L.activeSigners('sequential', [sg('a', 1), sg('b', 1), sg('c', 2)]).map(s => s.id), ['a', 'b']);
  ok(!L.canSignNow('sequential', [sg('a', 1), sg('b', 2)], 'b'));
});
await t('sequential: an optional earlier signer does not hold up later required signers', () => eq(L.activeSigners('sequential', [sg('a', 1, 'notified', false), sg('b', 2)]).map(s => s.id), ['a', 'b']));
const R = (o) => Object.assign({ status: 'sent', mode: 'parallel', expires_at: new Date(Date.now() + 1e6).toISOString() }, o);
await t('deriveStatus: sent → viewed → partial → completed', () => {
  eq(L.deriveStatus(R(), [sg('a', 1), sg('b', 1)]), 'sent');
  eq(L.deriveStatus(R(), [sg('a', 1, 'viewed'), sg('b', 1)]), 'viewed');
  eq(L.deriveStatus(R(), [sg('a', 1, 'signed'), sg('b', 1)]), 'partial');
  eq(L.deriveStatus(R(), [sg('a', 1, 'signed'), sg('b', 1, 'signed')]), 'completed');
  eq(L.deriveStatus(R(), [sg('a', 1, 'signed'), sg('b', 1, 'notified', false)]), 'completed');
});
await t('deriveStatus: a required decline ends it, an optional decline does not; expiry; terminal states stay', () => {
  eq(L.deriveStatus(R(), [sg('a', 1, 'declined'), sg('b', 1)]), 'declined');
  eq(L.deriveStatus(R(), [sg('a', 1), sg('b', 1, 'declined', false)]), 'sent');
  eq(L.deriveStatus(R({ expires_at: new Date(Date.now() - 1000).toISOString() }), [sg('a', 1)]), 'expired');
  eq(L.deriveStatus(R({ status: 'cancelled' }), [sg('a', 1, 'signed')]), 'cancelled');
  eq(L.deriveStatus(R({ status: 'prepared' }), [sg('a', 1)]), 'prepared');
});
await t('pendingAction words', () => {
  const r = R({ mode: 'sequential' }), ss = [sg('a', 1), sg('b', 2)];
  ok(/Waits for a/.test(L.pendingAction(r, ss, ss[1]))); ok(/not opened/.test(L.pendingAction(r, ss, ss[0]))); eq(L.pendingAction(R({ status: 'completed' }), ss, ss[0]), '');
});
await t('tokens: 43 url-safe chars, unique; only the hash is comparable', async () => {
  const a = L.newToken(), b = L.newToken(); ok(L.tokenOk(a) && a !== b); ok(!L.tokenOk('short') && !L.tokenOk(a + 'x') && !L.tokenOk(null)); eq((await L.sha256(a)).length, 64);
});
await t('codes are six digits; timingEq', () => { for (let k = 0; k < 200; k++) ok(/^\d{6}$/.test(L.newCode())); ok(L.timingEq('123456', '123456') && !L.timingEq('123456', '123457') && !L.timingEq('1', '12')); });
await t('readPng accepts a PNG and refuses everything else', () => {
  const png = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString('base64');
  eq(L.readPng(png).length, 7);
  for (const bad of ['data:image/jpeg;base64,AAAA', 'x', null, 'data:image/png;base64,' + Buffer.from('notpng').toString('base64'), 'data:image/png;base64,' + Buffer.alloc(400000, 1).toString('base64')]) { let thrown = false; try { L.readPng(bad); } catch { thrown = true; } ok(thrown, 'accepted ' + String(bad).slice(0, 30)); }
});
await t('India time helpers', () => { eq(L.istDate(Date.parse('2026-11-23T20:00:00Z')), '24.11.2026'); eq(L.istMonthStart(Date.parse('2026-11-23T20:00:00Z')), '2026-10-31T18:30:00.000Z'); });
await t('legal wording never claims Aadhaar eSign or DSC for a simple signature', () => { ok(/not an Aadhaar eSign/.test(L.SIGNATURE_TYPE_NOTE)); ok(/not an Aadhaar eSign or a Digital Signature Certificate/.test(L.CONSENT_TEXT)); });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

// Pure logic of the Drafting Studio (app-sign.js): fill, fingerprint, seal ids. Run: node tests/sign.test.mjs
import { createRequire } from 'node:module';
const G = createRequire(import.meta.url)('../app-sign.js');
let pass = 0, fail = 0;
const t = async (n, f) => { try { await f(); pass++; console.log('  ok  ', n); } catch (e) { fail++; console.log('  FAIL', n, e.message); } };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const html = '<p>I, [name], of [address]. Again [name].</p><div style="x[y]">[place]</div>';
await t('placeholders are found once each', () => ok(JSON.stringify(G.placeholders(html)) === JSON.stringify(['[name]', '[address]', '[place]'])));
await t('fill replaces every occurrence, leaves blanks, never touches tags', () => {
  const o = G.fill(html, { '[name]': 'A <b>', '[address]': '  ' });
  ok(o.includes('I, A &lt;b&gt;, of [address]. Again A &lt;b&gt;.'), o); ok(o.includes('style="x[y]"'), 'tag untouched'); ok(o.includes('[place]'));
});
await t('suggestions come from the case record', () => {
  const s = G.suggest(['[Case type and number]', '[Name of petitioner]', '[Name of respondent]'], { no: 'CS 4/2026', title: 'Mehta vs Orion' }, null);
  ok(s['[Case type and number]'] === 'CS 4/2026' && s['[Name of petitioner]'] === 'Mehta' && s['[Name of respondent]'] === 'Orion');
});
const v = { html: '<p>Text</p>', ref: 'LS/AFF/2026/0001', stamp: { state: 'Delhi', amount: '10', certNo: 'X1' }, signers: [{ name: 'A', role: 'Client', order: 1, sigImg: 'data:image/png;base64,AAA', signedAt: '2026-11-17 10:00', method: 'Drawn signature' }] };
await t('fingerprint is stable and changes with text, stamp or signature', async () => {
  const h = await G.fingerprint(v); ok(/^[0-9a-f]{64}$/.test(h)); ok(h === await G.fingerprint(JSON.parse(JSON.stringify(v))));
  ok(h !== await G.fingerprint({ ...v, html: '<p>Texts</p>' }), 'text'); ok(h !== await G.fingerprint({ ...v, stamp: { ...v.stamp, amount: '100' } }), 'stamp');
  ok(h !== await G.fingerprint({ ...v, signers: [{ ...v.signers[0], sigImg: 'data:image/png;base64,AAB' }] }), 'signature image');
  ok(h === await G.fingerprint({ ...v, html: '<div>Text</div>' }), 'markup alone does not matter');
});
await t('document id and lock rules', async () => {
  ok(/^LSD-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(G.docId(await G.fingerprint(v))));
  ok(G.locked(v) && !G.locked({ html: '', signers: [{ name: 'B' }] }) && G.locked({ seal: { hash: 'x' } }));
  ok(G.stampValid(v.stamp) && !G.stampValid({ state: 'Delhi', amount: '0', certNo: 'x' }));
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

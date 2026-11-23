// Drafting template library (app-templates.js). Saved drafts are stored by template position, so the first ten must never move.
// Run: node tests/templates.test.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
window.LS = { dmy: () => '22.11.2026', today: () => '2026-11-22' };
new Function(readFileSync(new URL('../app-templates.js', import.meta.url), 'utf8'))();
const T = window.LST, d = { user: { title: 'Adv. Asha Rao', name: 'Asha Rao' }, firm: { name: 'Rao & Associates', city: 'Patna' } };
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('the first ten templates keep their positions and reference codes', () => {
  assert.deepEqual(T.codes.slice(0, 10), ['LN', 'PET', 'S138', 'BAIL', 'AFF', 'WS', 'RPL', 'APL', 'REV', 'AGR']);
  assert.match(T.names[2], /Section 138/); assert.match(T.names[3], /bail/i); assert.match(T.names[9], /Agreement/);
});
t('every template is complete, in a known group, with a unique code', () => {
  assert.ok(T.LIST.length >= 80);
  T.LIST.forEach((x, i) => { for (const k of ['g', 'n', 'code', 'kind', 'law', 'forum', 'd']) assert.ok(x[k], `template ${i} has no ${k}`); assert.ok(T.GROUPS.includes(x.g), `template ${i} group`); assert.ok(x.tips.length >= 2, `template ${i} tips`); });
  assert.equal(new Set(T.codes).size, T.codes.length);
  T.GROUPS.forEach(g => assert.ok(T.LIST.some(x => x.g === g), 'empty group ' + g));
});
t('every template renders a full draft with placeholders and no broken values', () => {
  T.LIST.forEach((x, i) => { const h = T.html(i, d), txt = h.replace(/<[^>]+>/g, ' ');
    assert.ok(txt.length > 400, `template ${i} too short`); assert.doesNotMatch(txt, /undefined|NaN|\[object /, `template ${i}`);
    assert.match(txt, /\[[^\]]+\]/, `template ${i} has no placeholders`); });
});
t('documents carry what the studio checks look for', () => {
  const txt = i => T.html(i, d).replace(/<[^>]+>/g, ' ');
  assert.match(txt(2), /returned unpaid on \[dd\.mm\.yyyy\]/); assert.match(txt(2), /fifteen days/); assert.match(txt(2), /Date:\s*22\.11\.2026/);
  assert.match(txt(0), /fifteen days/);
  T.LIST.forEach((x, i) => {
    if (x.kind === 'deed') assert.match(txt(i), /witness/i, `deed ${i} needs a witness / execution block`);
    if (x.kind === 'affidavit') assert.match(txt(i), /verification|verified/i, `affidavit ${i} needs a verification`);
    if (['pleading', 'criminal', 'appeal', 'notice'].includes(x.kind)) assert.ok(txt(i).includes('Asha Rao') || /\[Signature|Authorised Officer/.test(txt(i)), `template ${i} needs a signature block`);
  });
});
t('criminal templates cite the BNSS / BNS, with the old section for reference', () => {
  T.LIST.filter(x => x.g === 'Criminal').forEach(x => assert.match(x.law + ' ' + x.n, /BNSS|NI Act|Negotiable/, x.n));
  assert.match(T.LIST.find(x => x.code === 'ABA').law, /s\.482 \(formerly s\.438 CrPC\)/);
  assert.match(T.LIST.find(x => x.code === 'Q528').law, /s\.528 \(formerly s\.482 CrPC\)/);
});
console.log(n + ' tests passed');

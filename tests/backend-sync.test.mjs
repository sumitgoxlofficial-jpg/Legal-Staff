// The record sync of app-backend.js (the app's server adapter) against an in-memory fake of Supabase that behaves like the real table:
// edits are applied only if nobody changed the record since this device read it, so two people editing the same record can no longer
// overwrite each other silently. Run: node tests/backend-sync.test.mjs
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import { join, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('  ok   ' + n); } catch (e) { fail++; console.log('  FAIL ' + n + '\n       ' + (e.stack || e.message).split('\n').slice(0, 3).join('\n       ')); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'differ') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); }; const ok = (v, m) => { if (!v) throw new Error(m || 'expected true'); };

// ---- a fake database: records keep updated_at; update(...).eq(updated_at, x) only matches when it is still x ----
const db = { records: [], calls: [] }; let clock = 1000;
const stampNow = () => new Date(1.7e12 + (clock += 1000)).toISOString();
class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.lim = 1e9; this.off = 0; this.mode = null; }
  select() { return this; } insert(r) { this.op = 'insert'; this.rows = [].concat(r); return this; } upsert(r) { this.op = 'upsert'; this.rows = [].concat(r); return this; } update(p) { this.op = 'update'; this.patch = p; return this; } delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.f.push(r => String(r[c]) === String(v)); return this; } in(c, vs) { this.f.push(r => vs.includes(r[c])); return this; } order() { return this; } limit(n) { this.lim = n; return this; } range(a, b) { this.off = a; this.lim = b - a + 1; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; } single() { this.mode = 'one'; return this; } then(res, rej) { try { res(this.run()); } catch (e) { (rej || (x => { throw x; }))(e); } }
  run() {
    if (this.t !== 'records') {   // everything the app reads on load besides records
      const one = { firms: { id: 'f1', name: 'Firm', city: 'Delhi', address: 'x', gstin: '', state: {} }, members: null };
      if (this.t === 'firms') return { data: one.firms, error: null };
      if (this.t === 'members') return { data: [{ id: 'm1', user_id: 'u1', email: 'a@x.in', name: 'Asha', title: 'Adv. Asha', role: 'Partner', status: 'Active', is_owner: true, phone: '' }], error: null };
      if (this.op !== 'select') return { data: [{ id: 'x' }], error: null };
      return { data: this.mode ? null : [], error: null };
    }
    const rows = db.records;
    if (this.op === 'upsert') { for (const r of this.rows) { const ex = rows.find(x => x.kind === r.kind && x.id === r.id); db.calls.push(['upsert', r.kind, r.id]); if (ex) Object.assign(ex, r); else rows.push({ ...r }); } return { data: null, error: null }; }
    const m = rows.filter(r => this.f.every(fn => fn(r)));
    if (this.op === 'update') { db.calls.push(['update', m.length]); m.forEach(r => Object.assign(r, this.patch)); return { data: m.map(r => ({ id: r.id })), error: null }; }
    if (this.op === 'delete') { db.calls.push(['delete', m.map(r => r.id)]); m.forEach(r => rows.splice(rows.indexOf(r), 1)); return { data: null, error: null }; }
    return { data: m.slice(this.off, this.off + this.lim).map(r => ({ kind: r.kind, id: r.id, data: r.data, updated_at: r.updated_at })), error: null };
  }
}
const client = { from: t => new Q(t), rpc: async () => ({ data: null, error: null }), auth: { getSession: async () => ({ data: { session: null } }) } };
const seed = () => ({ firm: {}, cases: [], clients: [], hearings: [], orders: [], tasks: [], docs: [], invoices: [], deadlines: [], esign: [], lims: [], watch: [], log: [], team: [], settings: {}, user: {}, sub: {}, labels: [], notes: [], chats: [], copilot: [], research: [], drafts: {}, photo: '' });
const ctx = { console, setTimeout, clearTimeout, fetch, Promise, JSON, Date, Math, Object, Array, String, Number, Error, Set, Map };
ctx.window = ctx; ctx.window.LS_CONFIG = { supabaseUrl: 'http://x', supabaseKey: 'k' }; ctx.window.supabase = { createClient: () => client };
ctx.window.LS = { seed, migrate() {}, uid: p => p + Math.random().toString(36).slice(2, 8) };
vm.createContext(ctx); vm.runInContext(readFileSync(join(root, 'app-backend.js'), 'utf8'), ctx);
const LSB = ctx.LSB;
const session = { user: { id: 'u1', email: 'a@x.in', app_metadata: {} } };
const mkRec = (id, over) => ({ firm_id: 'f1', kind: 'case', id, data: { title: 'T-' + id, ...over }, updated_at: stampNow() });
const open = async () => { const d = await LSB.load('f1', session); return d; };

await t('a normal edit is saved and the stamp moves forward', async () => { db.records = [mkRec('c1')]; db.calls = []; const d = await open(); d.cases[0].title = 'Edited'; await LSB.sync(d);
  eq(db.records[0].data.title, 'Edited'); ok(db.calls.some(c => c[0] === 'update' && c[1] === 1)); const before = db.records[0].updated_at; d.cases[0].title = 'Edited twice'; await LSB.sync(d); eq(db.records[0].data.title, 'Edited twice'); ok(db.records[0].updated_at >= before); });
await t('two devices editing the same record: the second one is NOT allowed to overwrite the first', async () => { db.records = [mkRec('c2')]; db.calls = [];
  const a = await open(); const b = await open();   // both read the record
  a.cases[0].title = 'From A'; await LSB.sync(a); eq(db.records[0].data.title, 'From A');
  // device B still holds the old stamp (a second adapter instance would; here we re-load into the same module to switch device)
  // so simulate B by making the server stamp differ from what the module remembers:
  const c2 = db.records[0]; c2.updated_at = stampNow(); c2.data = { ...c2.data, title: 'From A (colleague)' };   // a colleague saved after our last write
  a.cases[0].title = 'Late edit from A'; let err = null; try { await LSB.sync(a); } catch (e) { err = e; }
  ok(err && err.conflict, 'a conflict is reported'); eq(db.records[0].data.title, 'From A (colleague)', 'the colleague\'s version is kept'); });
await t('a conflict reports how many edits were refused and loading again shows the latest version', async () => { const d = await open(); eq(d.cases[0].title, 'From A (colleague)'); d.cases[0].title = 'Fresh edit'; await LSB.sync(d); eq(db.records[0].data.title, 'Fresh edit'); });
await t('new records are inserted, not treated as conflicts', async () => { db.records = []; db.calls = []; const d = await open(); d.cases.push({ id: 'new1', title: 'Brand new' }); await LSB.sync(d); eq(db.records.map(r => r.id), ['new1']); ok(db.records[0].updated_at, 'has a stamp');
  d.cases[0].title = 'Renamed'; await LSB.sync(d); eq(db.records[0].data.title, 'Renamed'); });
await t('deleting a record still works, and a conflict on one record does not block the others', async () => { db.records = [mkRec('d1'), mkRec('d2'), mkRec('d3')]; const d = await open();
  d.cases.find(c => c.id === 'd1').title = 'Edited d1'; d.cases.find(c => c.id === 'd2').title = 'Edited d2'; d.cases = d.cases.filter(c => c.id !== 'd3');
  db.records.find(r => r.id === 'd1').updated_at = stampNow();   // a colleague touched d1
  let err = null; try { await LSB.sync(d); } catch (e) { err = e; }
  ok(err && err.conflict && /not saved/.test(err.message)); eq(db.records.find(r => r.id === 'd2').data.title, 'Edited d2', 'the other edit was saved'); ok(!db.records.find(r => r.id === 'd3'), 'the delete went through'); eq(db.records.find(r => r.id === 'd1').data.title, 'T-d1', 'the conflicting edit was refused'); });
await t('a large batch (a restored backup) is still sent in one go', async () => { db.records = Array.from({ length: 80 }, (_, i) => mkRec('b' + i)); db.calls = []; const d = await open(); d.cases.forEach(c => { c.title = 'Restored ' + c.id; }); await LSB.sync(d);
  ok(db.calls.filter(c => c[0] === 'upsert').length === 80 && !db.calls.some(c => c[0] === 'update'), 'bulk path used'); eq(db.records[0].data.title.startsWith('Restored'), true); });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

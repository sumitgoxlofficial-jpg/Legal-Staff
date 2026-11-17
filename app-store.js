/* Legal Staff — local data store and utilities.
   The app starts empty. Everything is kept in the browser (localStorage + IndexedDB for uploaded files). There is no server. */
(function () {
  'use strict';
  const KEY = 'ls.app.v2';
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => new Date(s + 'T00:00:00');
  const valid = s => !!s && !isNaN(parse(s));
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
  const fmt = (s, o) => valid(s) ? parse(s).toLocaleDateString('en-IN', o || { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const dmy = s => valid(s) ? pad(parse(s).getDate()) + '.' + pad(parse(s).getMonth() + 1) + '.' + parse(s).getFullYear() : '—';
  const dayMon = s => fmt(s, { day: 'numeric', month: 'short' });
  const longDate = s => fmt(s, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const isWeekend = s => [0, 6].includes(parse(s).getDay());
  const nextWorking = s => { while (isWeekend(s)) s = addDays(s, 1); return s; };
  const prevWorking = s => { while (isWeekend(s)) s = addDays(s, -1); return s; };
  const t12 = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return (h > 12 ? h - 12 : h) + ':' + pad(m); };
  const t12ap = t => { if (!t) return ''; const h = +t.split(':')[0]; return t12(t) + (h >= 12 ? ' PM' : ' AM'); };
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const uid = p => (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const initials = n => (n || '').replace(/^Adv\.\s*/, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const short = n => { const p = (n || '').replace(/^Adv\.\s*/, '').split(/\s+/); return p.length > 1 ? p[0][0] + '. ' + p[p.length - 1] : (n || ''); };

  function seed() {
    return {
      v: 2, anchor: today(), session: null, cases: [], hearings: [], orders: [], tasks: [], docs: [], clients: [], team: [], invoices: [], log: [],
      firm: { name: '', city: '', address: '', gstin: '', legalName: '', stateCode: '', pan: '', gstReg: '', prefix: '', sac: '' },
      user: { name: '', title: '', role: 'Advocate', email: '', phone: '' },
      sub: { plan: '', cycle: 'annual', since: '', renews: '', history: [] },
      lim: null, lims: [], deadlines: [], chats: {}, copilot: [], drafts: {}, notes: '', research: [], watch: [],
      agents: [
        { id: 'briefing', name: 'Daily briefing', what: "Compiles today's hearings, clashes and deadlines for every team member.", when: 'When you press Run now', on: true, runs: [] },
        { id: 'sentinel', name: 'Deadline sentinel', what: 'Checks limitation deadlines and overdue tasks and raises alerts.', when: 'When you press Run now', on: true, runs: [] },
        { id: 'client', name: 'Client update drafter', what: 'Drafts a plain-language update for the client after each new order.', when: 'When you press Run now', on: false, runs: [] },
        { id: 'causelist', name: 'Cause-list watcher', what: 'Lists your matters for the next working day, court by court.', when: 'When you press Run now', on: true, runs: [] }
      ],
      settings: { whatsapp: true, email: true, inapp: true, briefingTime: '07:30', remindDays: 2, sidebar: 'Light', backdrop: 'Wallpaper', density: 'Comfortable', collapsed: false },
      adminStatus: {}, adminNotes: {}
    };
  }

  let memory = null;
  const remote = () => !!(window.LSB && window.LSB.on);
  function load() {
    if (remote()) { memory = seed(); return memory; }
    try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && d.v === 2) return migrate(d); } } catch (e) {}
    const d = seed(); save(d); return d;
  }
  function save(d) { memory = d; if (remote()) return true; try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} return load(); }

  /* ---------- limitation calculator (rule-based) ----------
     Presets: period n in u (d = days, m = months, y = years) counted from the start event, with s.12(1) excluding the first day,
     s.12(2) adding the time taken to get a certified copy where copy: true, and s.4 moving a weekend last date to the next working day.
     Every preset is a starting point: the screen labels each one "check the statute / rules". */
  const CHECK = 'check the statute / rules';
  const RULES = [
    { k: 'cca', label: 'Commercial Courts appeal · 60 days', n: 60, u: 'd', start: 'Date of judgment and decree', basis: 'Commercial Courts Act, 2015, s.13(1A)', copy: true, kind: 'Appeal against a judgment or order of a Commercial Court or Commercial Division' },
    { k: 'fa_hc', label: 'First appeal to High Court from a decree · 90 days', n: 90, u: 'd', start: 'Date of the decree', basis: 'Limitation Act, 1963, Art. 116(a)', copy: true, kind: 'Appeal under the CPC to a High Court from a decree or order' },
    { k: 'fa_dc', label: 'Appeal to the District Court · 30 days', n: 30, u: 'd', start: 'Date of the decree or order', basis: 'Limitation Act, 1963, Art. 116(b)', copy: true, kind: 'Appeal under the CPC to any court other than a High Court' },
    { k: 'review', label: 'Review of a judgment · 30 days', n: 30, u: 'd', start: 'Date of the decree or order', basis: 'Limitation Act, 1963, Art. 124', copy: true, kind: 'Application for review of judgment' },
    { k: 'revision', label: 'Revision under CPC s.115 · 90 days', n: 90, u: 'd', start: 'Date of the decree or order', basis: 'Limitation Act, 1963, Art. 131', copy: true, kind: 'Revision under s.115 of the Code of Civil Procedure' },
    { k: 'slp', label: 'SLP to the Supreme Court from a High Court judgment · 90 days', n: 90, u: 'd', start: 'Date of the High Court judgment or order', basis: 'Supreme Court Rules, 2013, Order XXII r.2 / Limitation Act, Art. 133', copy: true, kind: 'Special leave petition (civil) against a High Court judgment' },
    { k: 'exec', label: 'Execution of a decree · 12 years', n: 12, u: 'y', start: 'Date the decree became enforceable', basis: 'Limitation Act, 1963, Art. 136', copy: false, kind: 'Execution of a decree (other than a decree for a mandatory injunction)' },
    { k: 'suit', label: 'Suit on a contract or for money · 3 years', n: 3, u: 'y', start: 'Date the cause of action arose (e.g. breach, or the date payment fell due)', basis: 'Limitation Act, 1963, Art. 55 / Art. 113 (generic 3 years; find the specific Article)', copy: false, kind: 'Suit for compensation for breach of contract, or for money due' },
    { k: 'ni138', label: 'Complaint under s.138 NI Act · 1 month', n: 1, u: 'm', start: 'Date the drawer received the demand notice', basis: 'Negotiable Instruments Act, 1881, s.138(c) and s.142(1)(b)', copy: false, pre: 15, kind: 'Complaint for dishonour of a cheque' },
    { k: 'consumer', label: 'Consumer appeal to the State Commission · 45 days', n: 45, u: 'd', start: 'Date of the District Commission\'s order', basis: 'Consumer Protection Act, 2019, s.41', copy: false, kind: 'Appeal against an order of a District Consumer Commission' },
    { k: 'rera', label: 'RERA appeal to the Appellate Tribunal · 60 days', n: 60, u: 'd', start: 'Date a copy of the order was received', basis: 'Real Estate (Regulation and Development) Act, 2016, s.44(2)', copy: false, kind: 'Appeal against an order of the RERA Authority or adjudicating officer' },
    { k: 'writ', label: 'Writ petition · no fixed period', none: true, start: 'Date of the action or order challenged', basis: 'Articles 226 / 32 of the Constitution: no statutory period; delay and laches apply', copy: false, kind: 'Writ petition' },
    { k: 'custom', label: 'Custom period', custom: true, start: 'Date of the start event', basis: '', copy: false, kind: 'Custom period' }
  ];
  const rule = k => RULES.find(r => r.k === k) || RULES[0];
  const UNIT = { d: ['day', 'days'], m: ['month', 'months'], y: ['year', 'years'] };
  const period = (n, u) => n + ' ' + UNIT[u || 'd'][n === 1 ? 0 : 1];
  const addMonths = (s, n) => { const d = parse(s), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return iso(d); };
  const addPeriod = (s, n, u) => u === 'y' ? addMonths(s, 12 * n) : u === 'm' ? addMonths(s, n) : addDays(s, n);
  /* l: { rule, judgment (start event date), applied, ready, n, unit, basis, copy (custom only) }.
     Returns { due, daysLeft, rows, needsReady, none, r }. needsReady: the certified copy was applied for but its ready date is not entered yet. */
  function limitation(l) {
    const r = rule(l.rule), n = r.custom ? Math.max(1, Math.round(+l.n || 0)) : r.n, u = r.custom ? (l.unit || 'd') : r.u, basis = r.custom ? (l.basis || 'Entered by you') : r.basis;
    const copy = r.custom ? !!l.copy : r.copy, rows = [], row = (step, b, val) => rows.push({ n: String(rows.length + 1), step, basis: b, val });
    if (r.none || !valid(l.judgment)) {
      if (valid(l.judgment)) row(r.start, 'Start event', dmy(l.judgment));
      row(r.none ? 'No fixed limitation period' : 'Start date missing', r.none ? basis + '. File without delay and explain any delay in the petition. No date is calculated; ' + CHECK + '.' : 'Enter the date of the start event.', 'No date');
      return { r, none: true, due: '', daysLeft: null, rows, needsReady: false, copyDays: 0 };
    }
    let start = l.judgment;
    row(r.start, 'Start event', dmy(l.judgment));
    if (r.pre) { const end = addDays(l.judgment, r.pre); start = addDays(end, 1); row(`${r.pre} days to pay after receiving the notice end`, 'NI Act, s.138(c)', dmy(end)); row('Cause of action arises (no payment within 15 days)', 'NI Act, s.142(1)(b)', dmy(start)); }
    const from = addDays(start, 1), base = addPeriod(start, n, u);
    row('Exclude the day the period starts from', 'Limitation Act, 1963, s.12(1)', 'from ' + dmy(from));
    row('Limitation period' + (r.custom ? '' : ' · ' + r.kind), basis + ' · ' + CHECK, period(n, u) + ' → ' + dmy(base));
    const needsReady = !!(copy && valid(l.applied) && !valid(l.ready));
    const copyDays = copy && valid(l.applied) && valid(l.ready) ? Math.max(0, diffDays(l.ready, l.applied)) : 0;
    if (copy) row(valid(l.applied) ? `Time to obtain certified copy (applied ${dmy(l.applied).slice(0, 5)}, ready ${valid(l.ready) ? dmy(l.ready).slice(0, 5) : '?'})` : 'No certified copy applied for', valid(l.applied) ? 'Limitation Act, s.12(2)' : 'Limitation Act, s.12(2) · no time excluded', '+' + copyDays + ' days');
    const adj = addDays(base, copyDays), due = nextWorking(adj), rolled = due !== adj;
    row('Adjusted last date', '', dmy(adj));
    row('Check court working day', rolled ? 'Falls on a weekend · s.4 applies, next working day' : 'Weekday · s.4 not triggered. Check the court calendar for holidays.', rolled ? '→ ' + dmy(due) : 'Working day ✓');
    return { r, none: false, due, daysLeft: diffDays(due, today()), rows, needsReady, copyDays, base, adj, rolled };
  }
  /* Older data kept one calculation in d.lim (firm state). Move it into d.lims, the list of saved calculations, and give an approved one its deadline record. */
  function migrate(d) {
    if (!d) return d;
    if (!Array.isArray(d.lims)) d.lims = []; if (!Array.isArray(d.deadlines)) d.deadlines = [];
    const o = d.lim;
    if (o && typeof o === 'object' && o.judgment) {
      const id = 'llegacy';
      if (!d.lims.some(x => x.id === id)) {
        const l = Object.assign({ rule: 'cca', n: '', unit: 'd', basis: '', copy: false }, o, { id });
        d.lims.unshift(l);
        const c = limitation(l);
        if (l.approved && c.due && !d.deadlines.some(x => x.limId === id)) { l.dlId = 'dl' + id; d.deadlines.push({ id: l.dlId, source: 'limitation', limId: id, caseId: l.caseId || '', title: l.title, rule: rule(l.rule).basis, due: c.due, approved: true, done: false }); }
      }
      d.lim = null;
    }
    return d;
  }
  /* ---------- order text → next date + points (rule-based) ---------- */
  /* Dates as courts write them: 3.2.2027, 03-02-2027, 3/2/27, 3rd February 2027, 03 Feb 2027, 3rd day of February, 2027, February 3, 2027. */
  const MON = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const DATE = `(\\d{1,2})[./-](\\d{1,2})[./-](\\d{4}|\\d{2})(?!\\d)|(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+day\\s+of)?[\\s,.-]*\\b(${MON})\\b\\.?[\\s,.-]*(\\d{4}|\\d{2})(?!\\d)|\\b(${MON})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})(?!\\d)`;
  const monNo = w => ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(w.slice(0, 3).toLowerCase()) + 1;
  /* g: the nine DATE groups. Returns yyyy-mm-dd or ''. */
  function dateOf(g) {
    const [d, mo, y] = g[0] ? [+g[0], +g[1], g[2]] : g[3] ? [+g[3], monNo(g[4]), g[5]] : [+g[7], monNo(g[6]), g[8]];
    const s = (y.length === 2 ? '20' + y : y) + '-' + pad(mo) + '-' + pad(d);
    return valid(s) && iso(parse(s)) === s ? s : '';
  }
  function readOrder(text) {
    const paras = text.split(/\n\s*\n|\n(?=\s*\d+[.)]\s)/).map(p => p.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    let nextDate = '', nextFrom = '';
    const re = new RegExp('(?:list(?:ed)?|re-?notify|renotify|put up|adjourned|next date|next hearing|fixed|stand over|come up|to come up)[^.\\d]{0,60}?(?:' + DATE + ')', 'i');
    paras.forEach((p, i) => { const m = re.exec(p); if (m) { const s = dateOf(m.slice(1)); if (s) { nextDate = s; nextFrom = `from ¶${i + 1}, "${m[0]}"`; } } });
    /* No listing phrase: take the latest future date, ignoring two-digit years (too easily a section or rule number). */
    if (!nextDate) { const all = [...text.matchAll(new RegExp(DATE, 'gi'))].filter(m => !(m[1] && m[3].length === 2)).map(m => dateOf(m.slice(1))).filter(Boolean).sort(); const fut = all.filter(s => s >= today()); if (fut.length) { nextDate = fut[fut.length - 1]; nextFrom = 'latest future date found in the text'; } }
    return { paras, nextDate, nextFrom, points: paras.map(p => p.split(/(?<=\.)\s/)[0]) };
  }

  /* ---------- case question answering (search over the case file) ----------
     Answers come only from what is stored: Case details fields, orders, hearings, tasks and documents. Every answer names its source;
     when a field is empty the answer says so and returns need: <field> so the screen can offer the Case details editor. */
  function answer(d, caseId, q) {
    const c = d.cases.find(x => x.id === caseId) || { title: 'This case', parties: [], issues: [] }, lc = q.toLowerCase();
    const orders = d.orders.filter(o => o.caseId === caseId).sort((a, b) => b.date.localeCompare(a.date));
    const tasks = d.tasks.filter(t => t.caseId === caseId && !t.done), docs = d.docs.filter(x => x.caseId === caseId);
    const hs = d.hearings.filter(h => h.caseId === caseId), held = hs.filter(h => h.outcome).sort((a, b) => b.date.localeCompare(a.date));
    const upcoming = hs.filter(h => h.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    const pending = orders.find(o => !o.confirmed && o.nextDate);
    const next = upcoming ? dmy(upcoming.date) : (pending ? dmy(pending.nextDate) + ' (from the last order, not yet confirmed)' : '');
    const has = (...w) => w.some(x => x instanceof RegExp ? x.test(lc) : lc.includes(x));
    const side = p => p.side || (/respond|defend|opposite|accused|non-applicant/i.test(p.role || '') ? 'respondent' : 'petitioner');
    const parties = c.parties || [], pet = parties.filter(p => side(p) === 'petitioner'), res = parties.filter(p => side(p) === 'respondent');
    const issues = c.issues || [], missing = c.missing || [], opp = c.oppArgs || [], ours = c.ourArgs || (c.args ? String(c.args).split(/\n+/).map(s => s.trim()).filter(Boolean) : []);
    const F = 'Case details › ', OC = o => 'Order ' + dmy(o.date), HC = h => 'Hearing ' + dmy(h.date), strip = s => String(s).replace(/\s*\[[^\]]*\]/g, '');
    const list = a => a.map((s, i) => `${i + 1}. ${s}`).join('\n'), pn = p => p.name + (p.note ? ' — ' + p.note : '');
    const none = (what, need, extra) => ({ text: `No ${what} recorded yet — add them in Case details.` + (extra ? ' ' + extra : ''), cites: [], need });
    const sumCites = () => [F + 'Summary', ...new Set((c.summary.match(/\[([^\]]+)\]/g) || []).map(x => x.slice(1, -1)))];
    const outcomeLine = h => `${dmy(h.date)}: ${h.outcome}${h.outcomeNote ? ' — ' + h.outcomeNote : ''}`;
    const paraHits = re => { const out = []; orders.forEach(o => (o.paras || []).forEach((p, i) => { if (re.test(p)) out.push([p, OC(o) + ' ¶' + (i + 1)]); })); return out; };

    if (has('brief')) {
      const o = orders[0], b = c.brief, cites = [], lines = ['Hearing brief' + (next ? ' for ' + next : ''), ''];
      if (c.summary) { lines.push('Background: ' + strip(c.summary)); cites.push(F + 'Summary'); } else if (b) lines.push('Background: ' + b.background); else lines.push('Background: no summary written yet (add one in Case details).');
      if (pet.length || res.length) { lines.push('Parties: ' + (pet.map(p => p.name).join(', ') || '—') + ' v. ' + (res.map(p => p.name).join(', ') || '—') + '.'); cites.push(F + 'Parties'); }
      if (c.stage) lines.push('Stage: ' + c.stage + '.');
      if (issues.length) { lines.push('Issues: ' + issues.map((s, i) => `(${i + 1}) ${s}`).join('; ') + '.'); cites.push(F + 'Issues'); }
      lines.push('Last order: ' + (o ? `${dmy(o.date)} — ${o.summary}` : 'no order on file.')); if (o) cites.push(OC(o));
      if (held[0]) { lines.push('Last hearing: ' + outcomeLine(held[0]) + '.'); cites.push(HC(held[0])); }
      if (ours.length) { lines.push('What to press: ' + ours.map((p, i) => `(${i + 1}) ${p}`).join('; ') + '.'); cites.push(F + 'Our arguments'); } else if (b) lines.push('What to press: ' + b.press.map((p, i) => `(${i + 1}) ${p}`).join('; ') + '.');
      if (opp.length) { lines.push('Expect from the other side: ' + opp.map((p, i) => `(${i + 1}) ${p}`).join('; ') + '.'); cites.push(F + 'Opponent\'s arguments'); }
      if (missing.length) { lines.push('Still missing: ' + missing.join('; ') + '.'); cites.push(F + 'Missing documents'); }
      if (b && b.carry) lines.push('To carry: ' + b.carry);
      if (tasks.length) { lines.push('Open tasks: ' + tasks.map(t => t.t).join('; ') + '.'); cites.push('Tasks'); }
      const thin = !c.summary && !issues.length && !ours.length && !parties.length;
      if (thin) lines.push('', 'Case details are empty, so this brief only uses orders, hearings and tasks. Add parties, issues and arguments in Case details for a fuller brief.');
      lines.push('', 'This is a draft. Please review it before relying on it.');
      return { text: lines.join('\n'), cites, brief: true, need: thin ? 'details' : undefined };
    }
    if (has('summar', 'case about', 'is this about', 'overview', 'background', 'facts')) return c.summary ? { text: strip(c.summary) + (/^Automatic draft/.test(c.summaryMeta || '') ? '\n\n(This summary is an automatic draft from the orders.)' : ''), cites: sumCites() } : { text: 'No summary written yet — write one in Case details' + (orders.length ? `, or use "Draft from orders" there to assemble one from the ${orders.length} order${orders.length > 1 ? 's' : ''} on file.` : '.'), cites: [], need: 'summary' };
    if (has('last order', 'latest order', 'recent order')) { const o = orders[0]; return o ? { text: `The last order is dated ${dmy(o.date)}${c.bench ? ', by ' + c.bench : ''}. ${o.summary}${next ? ' The matter is listed on ' + next + '.' : ''}`, cites: [OC(o)] } : { text: 'There is no order in this case file yet. Upload one from Court Orders.', cites: [] }; }
    if (has('next date', 'next hearing', 'listed', 'when is')) return { text: next ? `The matter is next listed on ${next}${upcoming ? `, ${t12ap(upcoming.time)} at ${upcoming.court}` : ''}.` : 'No future hearing is recorded for this case.', cites: upcoming ? [HC(upcoming)] : (pending ? [OC(pending)] : []) };
    if (has('outcome', 'last hearing', 'what happened', 'adjourn', 'previous hearing')) { const past = hs.filter(h => h.date < today() && !h.outcome).length;
      return held.length ? { text: 'Recorded outcomes:\n' + held.slice(0, 6).map(h => '• ' + outcomeLine(h)).join('\n') + (past ? `\n${past} past hearing${past > 1 ? 's have' : ' has'} no outcome recorded yet.` : ''), cites: held.slice(0, 6).map(HC) } : { text: past ? `No outcome has been recorded for the ${past} past hearing${past > 1 ? 's' : ''} in this case. Record it from the Hearings tab.` : 'No hearing in this case has taken place yet, so there is no outcome to report.', cites: [] }; }
    if (has('missing')) return missing.length ? { text: `${missing.length === 2 ? 'Two' : missing.length} document${missing.length > 1 ? 's are' : ' is'} recorded as missing from the case file:\n` + list(missing), cites: [F + 'Missing documents'] } : none('missing documents', 'missing', `The case file has ${docs.length} document${docs.length === 1 ? '' : 's'}.`);
    if (has('task', /\bpending\b/, 'to do', 'todo')) return { text: tasks.length ? `${tasks.length} task${tasks.length > 1 ? 's are' : ' is'} open:\n` + tasks.map(t => `• ${t.t}. ${t.who}, due ${dayMon(t.due)}.`).join('\n') : 'There are no open tasks in this case.', cites: tasks.length ? ['Tasks'] : [] };
    if (has('opponent', 'other side', 'opposite', 'their argument', 'their case', 'respondent\'s argument', 'defence', 'defense')) return opp.length ? { text: 'The other side\'s arguments:\n' + list(opp), cites: [F + 'Opponent\'s arguments'] } : none('arguments for the other side', 'oppArgs');
    if (has('argument', 'contention', 'submission', 'submit', 'press', 'our case', 'grounds')) { const said = paraHits(/\b(submit|contend|argue|urge|press)/i).slice(0, 3);
      if (!ours.length && !opp.length && !said.length) return none('arguments', 'ourArgs');
      const parts = [], cites = [];
      parts.push(ours.length ? 'Our arguments:\n' + list(ours) : 'Our arguments: none recorded yet.'); if (ours.length) cites.push(F + 'Our arguments');
      parts.push(opp.length ? 'Opponent\'s arguments:\n' + list(opp) : 'Opponent\'s arguments: none recorded yet.'); if (opp.length) cites.push(F + 'Opponent\'s arguments');
      if (said.length) { parts.push('Recorded in the orders:\n' + said.map(x => '• ' + x[0]).join('\n')); said.forEach(x => cites.push(x[1])); }
      return { text: parts.join('\n\n'), cites, need: !ours.length ? 'ourArgs' : (!opp.length ? 'oppArgs' : undefined) }; }
    if (has('document', 'file', 'evidence', 'exhibit')) return { text: docs.length ? `The case file has ${docs.length} item${docs.length > 1 ? 's' : ''}:\n` + docs.map(x => `• ${x.name} (${x.kind === 'evidence' ? (x.exhibit || 'evidence') : x.ext}, ${x.v})${(x.tags || []).length ? ' · ' + x.tags.join(', ') : ''}`).join('\n') : 'No documents have been added to this case.', cites: docs.length ? ['Documents'] : [] };
    if (has('issue', 'question of law', 'points for determination', 'framed')) return issues.length ? { text: 'Issues recorded:\n' + list(issues), cites: [F + 'Issues'] } : none('issues', 'issues');
    if (has('part', 'petitioner', 'respondent', 'appellant', 'plaintiff', 'defendant', 'applicant', /\bwho\b/, 'versus', ' v. ')) return parties.length ? { text: (pet.length ? 'Petitioner / appellant side:\n' + pet.map(p => '• ' + pn(p)).join('\n') : 'Petitioner / appellant side: none recorded.') + '\n\n' + (res.length ? 'Respondent side:\n' + res.map(p => '• ' + pn(p)).join('\n') : 'Respondent side: none recorded.'), cites: [F + 'Parties'] } : none('parties', 'parties', c.clientId && d.clients.find(x => x.id === c.clientId) ? `The client on file is ${d.clients.find(x => x.id === c.clientId).name}.` : '');
    if (has('stage')) return c.stage ? { text: `The case is at the ${c.stage} stage.`, cites: [F + 'Stage'] } : none('stage', 'details');
    const corpus = [];
    if (c.summary) c.summary.split(/(?<=\.)\s+/).forEach(s => corpus.push([strip(s), (s.match(/\[([^\]]*)\]/) || [])[1] || F + 'Summary']));
    issues.forEach(s => corpus.push([s, F + 'Issues'])); ours.forEach(s => corpus.push([s, F + 'Our arguments'])); opp.forEach(s => corpus.push([s, F + 'Opponent\'s arguments'])); missing.forEach(s => corpus.push([s, F + 'Missing documents'])); parties.forEach(p => corpus.push([pn(p) + ' (' + (side(p) === 'respondent' ? 'respondent side' : 'petitioner side') + ')', F + 'Parties']));
    orders.forEach(o => (o.paras || [o.summary]).forEach((p, i) => corpus.push([p, `${OC(o)} ¶${i + 1}`])));
    held.forEach(h => corpus.push([`${dmy(h.date)}, ${h.purpose}: ${h.outcome}${h.outcomeNote ? ' — ' + h.outcomeNote : ''}`, HC(h)]));
    d.tasks.filter(t => t.caseId === caseId).forEach(t => corpus.push([`${t.t} — ${t.who}, due ${dayMon(t.due)}${t.done ? ' (done)' : ''}`, 'Tasks']));
    docs.filter(x => !x.orderId).forEach(x => corpus.push([[x.name, x.meta, x.exhibit, x.custody, (x.tags || []).join(', ')].filter(Boolean).join(' — '), x.name]));
    const stop = new Set('the a an of to in on is are was were what when where which who how do does did for and or any about with this that case tell me please there has have had be been it its by at as from'.split(' '));
    const words = lc.split(/[^a-z0-9.]+/).filter(w => w.length > 1 && !stop.has(w));
    const hits = corpus.map(([s, cite]) => [words.reduce((n, w) => n + (s.toLowerCase().includes(w) ? 1 : 0), 0), s, cite]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 3);
    if (hits.length) return { text: 'From the case file:\n' + hits.map(x => '• ' + x[1]).join('\n'), cites: [...new Set(hits.map(x => x[2]))] };
    const empty = [!parties.length && 'parties', !issues.length && 'issues', !ours.length && !opp.length && 'arguments', !c.summary && 'summary'].filter(Boolean);
    return { text: `The case file doesn't answer that clearly. I searched the case details, ${orders.length} order${orders.length === 1 ? '' : 's'}, ${hs.length} hearing${hs.length === 1 ? '' : 's'} and ${docs.length} document${docs.length === 1 ? '' : 's'}.` + (empty.length ? ` Nothing is recorded yet for: ${empty.join(', ')} — add them in Case details.` : '') + ' Try asking about the last order, next date, issues, arguments, parties or missing documents.', cites: [], need: empty.length ? 'details' : undefined };
  }

  /* ---------- downloads ---------- */
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function csv(name, rows) { download(name, new Blob(['﻿' + rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n')], { type: 'text/csv' })); }
  function ics(name, list, d) {
    const z = s => s.replace(/[,;\\]/g, m => '\\' + m);
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Legal Staff//Hearings//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE', 'TZID:Asia/Kolkata', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0530', 'TZOFFSETTO:+0530', 'TZNAME:IST', 'END:STANDARD', 'END:VTIMEZONE'];
    list.forEach(h => { const c = d.cases.find(x => x.id === h.caseId) || {}; const [hh, mm] = (h.time || '10:30').split(':').map(Number); const st = h.date.replace(/-/g, '') + 'T' + pad(hh) + pad(mm) + '00'; const e = h.date.replace(/-/g, '') + 'T' + pad(Math.min(hh + 1, 23)) + pad(mm) + '00';
      L.push('BEGIN:VEVENT', 'UID:' + h.id + '@legalstaff', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART;TZID=Asia/Kolkata:' + st, 'DTEND;TZID=Asia/Kolkata:' + e, 'SUMMARY:' + z((c.title || 'Hearing') + ' — ' + (h.purpose || 'Hearing')), 'LOCATION:' + z(h.court || ''), 'DESCRIPTION:' + z([c.no, h.item, h.assignee].filter(Boolean).join(' · ')), 'END:VEVENT'); });
    L.push('END:VCALENDAR'); download(name, new Blob([L.join('\r\n')], { type: 'text/calendar' }));
  }
  function crc32(u) { const t = crc32.t || (crc32.t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; })); let r = -1; for (let i = 0; i < u.length; i++) r = t[(r ^ u[i]) & 255] ^ (r >>> 8); return (r ^ -1) >>> 0; }
  function zip(files, type) {
    const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
    files.forEach(f => { const n = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, n.length, true);
      parts.push(new Uint8Array(lh.buffer), n, data);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, n.length, true); ch.setUint32(42, off, true);
      cd.push(new Uint8Array(ch.buffer), n); off += 30 + n.length + data.length; });
    const size = cd.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(e.buffer)], { type });
  }
  /* paras: [[{t:'text', b:true|false, br:true}]] */
  function docx(name, paras) {
    const x = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = paras.map(p => '<w:p><w:pPr><w:spacing w:after="200"/></w:pPr>' + p.map(r => r.br ? '<w:r><w:br/></w:r>' : `<w:r><w:rPr>${r.b ? '<w:b/>' : ''}<w:sz w:val="23"/></w:rPr><w:t xml:space="preserve">${x(r.t)}</w:t></w:r>`).join('') + '</w:p>').join('');
    const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    download(name, zip([
      { name: '[Content_Types].xml', text: H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
      { name: '_rels/.rels', text: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/document.xml', text: H + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>' }
    ], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  }
  function htmlToRuns(root) {
    const paras = [];
    const walk = (node, bold, cur) => node.childNodes.forEach(n => {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, ' '); if (t.trim() || (cur.length && t)) cur.push({ t, b: bold }); }
      else if (n.nodeName === 'BR') cur.push({ br: true });
      else if (/^(DIV|P|H1|H2|H3|LI)$/.test(n.nodeName)) { const p = []; walk(n, bold || /^H/.test(n.nodeName), p); if (p.length) paras.push(p); }
      else walk(n, bold || /^(B|STRONG)$/.test(n.nodeName), cur);
    });
    const top = []; walk(root, false, top); if (top.length) paras.push(top);
    return paras;
  }

  /* ---------- roles ----------
     The firm owner (members.is_owner) is 'owner'. Every other member's role string maps onto one access level, the same way as
     public.member_role() in supabase/migrations/0006_roles.sql. Unknown strings are 'associate'. */
  const ROLES = { owner: 'Owner', partner: 'Partner', associate: 'Associate', clerk: 'Clerk / staff', viewer: 'Viewer (read-only)' };
  const roleOf = (role, owner) => owner ? 'owner' : /partner/i.test(role || '') ? 'partner' : /^(viewer|read.?only)/i.test(role || '') ? 'viewer' : /(clerk|paralegal|office|staff|intern|munshi|secretary)/i.test(role || '') ? 'clerk' : 'associate';

  /* ---------- plans ----------
     What the pricing cards promise and the app can enforce. cases: open (active or pending) cases, 0 = unlimited. gb: stored files.
     Without an active plan the firm keeps working for GRACE days (from the day the plan expired, or from when the firm was created,
     but not before PLAN_FROM, the day these rules started) and is then read-only until a plan is chosen. Server mode only. */
  /* Professional seats: the number of users bought (sub.seats); 3 for subscriptions bought before per-user pricing. */
  const PLANS = { Solo: { seats: 1, cases: 150, gb: 10 }, Professional: { seats: 3, cases: 600, gb: 50 }, Firm: { seats: 15, cases: 0, gb: 250 } };
  const TRIAL = { seats: 3, cases: 600, gb: 50 }, GRACE = 7, PLAN_FROM = '2026-11-16';
  function planState(d, T) {
    T = T || today(); const s = (d && d.sub) || {}, p = PLANS[s.plan];
    const expired = !!p && valid(s.renews) && s.renews < T, active = !!p && !expired && (s.status || 'active') === 'active';
    const from = p ? (valid(s.renews) ? s.renews : T) : [d && d.firmCreated, PLAN_FROM].filter(valid).sort().pop();
    const graceEnds = addDays(from, GRACE), readOnly = !active && T > graceEnds;
    return { plan: s.plan || '', active, expired, trial: !p, renews: s.renews || '', graceEnds, daysLeft: active ? null : Math.max(0, diffDays(graceEnds, T)), readOnly, limits: p ? (s.plan === 'Professional' && s.seats ? Object.assign({}, p, { seats: s.seats }) : p) : TRIAL };
  }
  const docBytes = x => { if (!x || !x.file) return 0; if (x.bytes) return +x.bytes; const m = /([\d.]+)\s*(KB|MB|GB)\b/.exec(x.meta || ''); return m ? Math.round(+m[1] * { KB: 1024, MB: 1048576, GB: 1073741824 }[m[2]]) : 0; };
  const usage = d => ({ seats: (d.team || []).filter(u => u.status === 'Active' || u.status === 'Invited').length, cases: (d.cases || []).filter(c => c.status === 'active' || c.status === 'pending').length, bytes: (d.docs || []).reduce((a, x) => a + docBytes(x), 0) });

  /* ---------- who created a record ---------- */
  const COLS = ['cases', 'clients', 'hearings', 'orders', 'tasks', 'docs', 'invoices', 'deadlines', 'lims', 'watch'];
  const idSet = d => { const s = new Set(); COLS.forEach(c => (d[c] || []).forEach(r => s.add(c + '|' + r.id))); return s; };
  /* Records that were not there before a change get the creator's user id and name ("delete own" for associates and staff). */
  function stampNew(d, before, uid, name) { if (!uid) return; COLS.forEach(c => (d[c] || []).forEach(r => { if (!r.createdBy && !before.has(c + '|' + r.id)) { r.createdBy = uid; r.createdByName = name || ''; } })); }

  /* ---------- GST tax invoice ---------- */
  const STATES = [['01', 'Jammu and Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'], ['05', 'Uttarakhand'], ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'], ['16', 'Tripura'], ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'], ['26', 'Dadra and Nagar Haveli and Daman and Diu'], ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'], ['31', 'Lakshadweep'], ['32', 'Kerala'], ['33', 'Tamil Nadu'], ['34', 'Puducherry'], ['35', 'Andaman and Nicobar Islands'], ['36', 'Telangana'], ['37', 'Andhra Pradesh'], ['38', 'Ladakh'], ['97', 'Other Territory']];
  const stateName = c => (STATES.find(x => x[0] === c) || [, ''])[1];
  const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
  const gstinState = g => { g = String(g || '').trim().toUpperCase(); return GSTIN_RE.test(g) && stateName(g.slice(0, 2)) ? g.slice(0, 2) : ''; };
  /* SAC codes for legal services (heading 9982). */
  const SAC = [['998212', 'Legal advisory and representation services concerning other fields of law'], ['998211', 'Legal advisory and representation services concerning criminal law'], ['998213', 'Legal documentation and certification services concerning patents, copyrights and other intellectual property rights'], ['998214', 'Legal documentation and certification services concerning other documents'], ['998215', 'Arbitration and conciliation services'], ['998216', 'Other legal services n.e.c.']];
  const sacName = c => (SAC.find(x => x[0] === c) || [, 'Legal services'])[1];
  /* Indian financial year of a date: 2026-04-01 … 2027-03-31 → "2026-27". */
  const fy = s => { const d = parse(valid(s) ? s : today()), y = d.getFullYear(), a = d.getMonth() >= 3 ? y : y - 1; return a + '-' + pad((a + 1) % 100); };
  /* Invoice series: PREFIX/2026-27/0001 (at most 16 characters, as GST rule 46(b) requires, while the number has 4 digits). */
  const invPrefix = f => { const p = String((f && f.prefix) || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); if (p) return p; const w = String((f && f.name) || '').split(/\s+/).filter(x => /^[A-Za-z]/.test(x)).map(x => x[0].toUpperCase()).join('').slice(0, 3); return w || 'INV'; };
  const invSeries = (f, date) => invPrefix(f) + '/' + fy(date) + '/';
  const invNo = (series, n) => series + String(n).padStart(4, '0');
  const nextInvSeq = (invoices, series) => 1 + Math.max(0, ...(invoices || []).map(i => String(i.no || '')).filter(n => n.startsWith(series) && /^\d{1,9}$/.test(n.slice(series.length))).map(n => +n.slice(series.length)));
  /* Rupees in words, Indian numbering (lakh, crore). */
  const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'], TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  const three = n => [n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' : '', n % 100 ? two(n % 100) : ''].filter(Boolean).join(' ');
  function intWords(n) { if (!n) return ''; if (n >= 1e7) return [intWords(Math.floor(n / 1e7)) + ' Crore', intWords(n % 1e7)].filter(Boolean).join(' '); return [[Math.floor(n / 1e5), ' Lakh'], [Math.floor(n % 1e5 / 1e3), ' Thousand'], [n % 1e3, '']].filter(x => x[0]).map(x => (x[1] ? two(x[0]) : three(x[0])) + x[1]).join(' '); }
  function inWords(x) { const p = Math.round(Math.abs(+x || 0) * 100), r = Math.floor(p / 100), ps = p % 100; if (!r && !ps) return 'Rupees Zero Only'; return [r ? 'Rupees ' + intWords(r) : '', ps ? (r ? 'and ' : '') + two(ps) + ' Paise' : ''].filter(Boolean).join(' ') + ' Only'; }
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  /* inv.mode: 'fwd' tax charged (CGST+SGST within the state, IGST across states), 'rcm' reverse charge (the recipient pays), 'bos' bill of supply
     (no GST: the firm is not registered). An invoice saved before these fields existed is read as it was shown then: forward charge at 18%. */
  function invoiceTax(inv, firm, client) {
    inv = inv || {}; firm = firm || {}; client = client || {};
    const amount = r2(inv.amount), rate = inv.rate != null && inv.rate !== '' && !isNaN(+inv.rate) ? +inv.rate : 18, mode = ['fwd', 'rcm', 'bos'].includes(inv.mode) ? inv.mode : 'fwd';
    const fState = firm.stateCode || gstinState(firm.gstin), cGstin = String((inv.clientGstin != null ? inv.clientGstin : client.gstin) || '').toUpperCase();
    const pos = inv.pos || gstinState(cGstin) || client.stateCode || fState || '', intra = !fState || !pos || fState === pos;
    const cgst = mode === 'bos' || !intra ? 0 : r2(amount * rate / 200), sgst = cgst, igst = mode === 'bos' || intra ? 0 : r2(amount * rate / 100), gst = r2(cgst + sgst + igst);
    const tax = mode === 'fwd' ? gst : 0, total = r2(amount + tax), notes = [];
    if (mode === 'rcm') notes.push(`Tax payable on reverse charge: Yes. GST of ${inr(gst)} on this supply is payable by the recipient (legal services by an advocate or a firm of advocates to a business entity, Notification 13/2017–Central Tax (Rate)). Check with your CA.`);
    if (mode === 'bos') notes.push(`No GST is charged: ${firm.legalName || firm.name || 'the supplier'} is not registered under GST. Check with your CA.`);
    if (mode === 'fwd' && (!fState || !pos)) notes.push('The firm\'s state or the place of supply is not set, so the tax is shown as CGST and SGST. Set the state in Settings › Firm profile.');
    return { mode, title: mode === 'bos' ? 'Bill of supply' : 'Tax invoice', rcm: mode === 'rcm', intra, rate, amount, cgst, sgst, igst, gst, tax, total, words: inWords(total), fState, pos, posName: stateName(pos), sac: inv.sac || firm.sac || '998212', sacName: sacName(inv.sac || firm.sac || '998212'), clientGstin: cGstin, clientAddress: inv.clientAddress != null ? inv.clientAddress : [client.address, client.city].filter(Boolean).join(', '), notes, legacy: !inv.mode };
  }
  /* The tax treatment a new invoice starts with. */
  const invMode = (firm, gstin) => (firm && firm.gstReg === 'no') || !(firm && (firm.gstin || firm.gstReg === 'yes')) ? 'bos' : (gstinState(gstin) ? 'rcm' : 'fwd');

  /* ---------- uploaded files (IndexedDB) ---------- */
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('ls-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const files = {
    put: (id, file) => idb().then(db => new Promise((res, rej) => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').put(file, id); t.oncomplete = () => res(); t.onerror = () => rej(t.error); })),
    get: id => idb().then(db => new Promise((res, rej) => { const r = db.transaction('f').objectStore('f').get(id); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })),
    del: id => idb().then(db => new Promise(res => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').delete(id); t.oncomplete = () => res(); t.onerror = () => res(); })).catch(() => {}),
    /* Removes every stored file blob in this browser. */
    clear: () => idb().then(db => new Promise(res => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').clear(); t.oncomplete = () => { db.close(); res(); }; t.onerror = () => res(); })).catch(() => {})
  };
  const pickFile = (accept, multiple) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; if (accept) i.accept = accept; i.multiple = !!multiple; i.onchange = () => res([...i.files]); i.click(); });
  const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  window.LS = { KEY, load, save, reset, seed, iso, parse, valid, today, addDays, diffDays, fmt, dmy, dayMon, longDate, isWeekend, nextWorking, t12, t12ap, nowHM, uid, inr, initials, short, pad,
    LOG_MAX: 300, limitation, RULES, rule, period, addMonths, migrate, CHECK, readOrder, dateOf, answer, download, csv, ics, docx, htmlToRuns, files, pickFile, size,
    ROLES, roleOf, PLANS, TRIAL, GRACE, PLAN_FROM, planState, docBytes, usage, idSet, stampNew, STATES, stateName, GSTIN_RE, PAN_RE, gstinState, SAC, sacName, fy, invPrefix, invSeries, invNo, nextInvSeq, inWords, invoiceTax, invMode };
})();

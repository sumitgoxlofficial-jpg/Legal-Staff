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
      v: 2, anchor: today(), session: null, labels: [], cases: [], hearings: [], orders: [], tasks: [], docs: [], clients: [], team: [], invoices: [], esign: [], log: [],
      firm: { name: '', city: '', address: '', gstin: '', court: '', photo: '', groupPhoto: '', kind: '', domain: '' },
      user: { name: '', title: '', role: 'Advocate', email: '', phone: '' },
      sub: { plan: '', cycle: 'annual', status: '', since: '', renews: '', trialEnds: '', history: [] },
      lim: null, lims: [], deadlines: [], chats: {}, copilot: [], drafts: {}, notes: '', photo: '', research: [], watch: [],
      agents: [
        { id: 'briefing', name: 'Daily briefing', what: "Compiles today's hearings, clashes and deadlines for every team member.", when: 'When you press Run now', on: true, runs: [] },
        { id: 'sentinel', name: 'Deadline sentinel', what: 'Checks limitation deadlines and overdue tasks and raises alerts.', when: 'When you press Run now', on: true, runs: [] },
        { id: 'client', name: 'Client update drafter', what: 'Drafts a plain-language update for the client after each new order.', when: 'When you press Run now', on: false, runs: [] },
        { id: 'causelist', name: 'Cause-list watcher', what: 'Lists your matters for the next working day, court by court.', when: 'When you press Run now', on: true, runs: [] }
      ],
      settings: { courtAlerts: true, autoOrders: true, autoCheck: true, lastCheck: '', whatsapp: true, email: true, inapp: true, briefingTime: '07:30', remindDays: 2, sidebar: 'Light', backdrop: 'Wallpaper', density: 'Comfortable', collapsed: false },
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
    if (!Array.isArray(d.esign)) d.esign = []; if (!Array.isArray(d.labels)) d.labels = []; if (!Array.isArray(d.lims)) d.lims = []; if (!Array.isArray(d.deadlines)) d.deadlines = [];
    /* A client saved without sharing settings (an older backup or record) gets the defaults, so the client screens can always read them. */
    (d.clients || []).forEach(c => { if (c && !c.share) c.share = { dates: true, orders: true, invoices: false }; });
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

  /* ---------- plans, free trial and access ----------
     Every plan starts with a 7-day free trial. When the trial or the paid period ends, the workspace becomes read-only
     until a plan is paid for. mods lists the screens a plan includes beyond the ones every plan has.
     The same limits are enforced on the server (migration 0006): writes need access, members are capped by plan. */
  const TRIAL_DAYS = 7;
  const PLANS = {
    Solo: { users: 1, cases: 150, storage: 10, ai: 200, mods: [] },
    Professional: { users: 3, cases: 600, storage: 50, ai: 1000, mods: ['brain', 'drafting', 'portal'] },
    Firm: { users: 15, cases: Infinity, storage: 250, ai: 5000, mods: ['brain', 'drafting', 'portal', 'agents', 'reports'] }
  };
  /* The lowest plan that includes each gated screen. */
  const MOD_PLAN = { brain: 'Professional', drafting: 'Professional', portal: 'Professional', agents: 'Firm', reports: 'Firm' };
  /* state: 'none' (no plan chosen yet), 'trial', 'active', or 'expired' (trial or paid period over). */
  function access(sub, nowMs) {
    const s = sub || {}, now = nowMs || Date.now(), plan = PLANS[s.plan] ? s.plan : '';
    if (!plan) return { state: 'none', ok: false, plan: '', limits: PLANS.Solo, daysLeft: 0, trialUsed: false };
    /* Professional: the users bought (sub.seats); 3 on a trial or a plan bought before per-user pricing. */
    const limits = plan === 'Professional' && s.seats ? Object.assign({}, PLANS[plan], { users: s.seats }) : PLANS[plan];
    if (s.status === 'trialing') {
      const end = Date.parse(s.trialEnds || ''), ms = end - now;
      if (ms > 0) return { state: 'trial', ok: true, plan, limits, ends: s.trialEnds, daysLeft: Math.max(1, Math.ceil(ms / 864e5)), trialUsed: true };
      return { state: 'expired', ok: false, plan, limits, ends: s.trialEnds, daysLeft: 0, trialUsed: true, wasTrial: true };
    }
    const left = s.renews ? diffDays(s.renews, today()) : -1;
    if (left >= 0) return { state: 'active', ok: true, plan, limits, ends: s.renews, daysLeft: left + 1, trialUsed: true };
    return { state: 'expired', ok: false, plan, limits, ends: s.renews, daysLeft: 0, trialUsed: true, wasTrial: false };
  }
  const hasMod = (acc, mod) => !MOD_PLAN[mod] || (acc.ok && acc.limits.mods.includes(mod));

  window.LS = { KEY, load, save, reset, seed, iso, parse, valid, today, addDays, diffDays, fmt, dmy, dayMon, longDate, isWeekend, nextWorking, t12, t12ap, nowHM, uid, inr, initials, short, pad,
    LOG_MAX: 300, limitation, RULES, rule, period, addMonths, migrate, CHECK, readOrder, dateOf, answer, download, csv, ics, docx, htmlToRuns, files, pickFile, size,
    TRIAL_DAYS, PLANS, MOD_PLAN, access, hasMod };
})();

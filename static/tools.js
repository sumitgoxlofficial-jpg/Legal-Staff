/* Legal Staff — free tools (incorporation cost calculator, ROC compliance calendar, trademark class finder).
   The calculation and render functions are shared: seo/pages/tools.mjs runs this file at build time (no DOM) to
   pre-render the default result into the static HTML, and the browser re-runs the same code when inputs change. */
(function (root) {
  'use strict';

  /* ---------------- helpers ---------------- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var inr = function (n) { return '\u20b9' + Math.round(Number(n) || 0).toLocaleString('en-IN'); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY = 864e5;

  // Dates are ISO 'YYYY-MM-DD' strings, computed in UTC so that time zones never shift a due date.
  var D = {
    ms: function (iso) { var p = String(iso).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); },
    iso: function (ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); },
    make: function (y, m, d) { return D.iso(Date.UTC(y, m - 1, d)); },
    valid: function (iso) { return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) && !isNaN(D.ms(iso)); },
    addDays: function (iso, n) { return D.iso(D.ms(iso) + n * DAY); },
    addMonths: function (iso, n) {
      var p = iso.split('-').map(Number), y = p[0], m = p[1] - 1 + n, d = p[2];
      y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
      var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return D.make(y, m + 1, Math.min(d, last));
    },
    diff: function (a, b) { return Math.round((D.ms(b) - D.ms(a)) / DAY); },
    fmt: function (iso) { var p = iso.split('-'); return +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; },
    today: function () { var t = new Date(); return D.make(t.getFullYear(), t.getMonth() + 1, t.getDate()); }
  };

  /* ---------------- stamp duty + MCA fees ---------------- */
  function stampEval(calc, capital) {
    if (!calc) return null;
    var c = Math.max(0, Number(capital) || 0), v = 0;
    if (calc.type === 'flat') v = calc.amount;
    else if (calc.type === 'percent') {
      v = Math.round(c * calc.rate / 100);
      if (calc.min != null) v = Math.max(v, calc.min);
      if (calc.max != null && calc.max > 0) v = Math.min(v, calc.max);
    } else if (calc.type === 'slab') {
      var slab = null;
      for (var i = 0; i < calc.slabs.length; i++) if (c <= calc.slabs[i].upTo) { slab = calc.slabs[i]; break; }
      if (slab) v = slab.amount;
      else {
        var last = calc.slabs[calc.slabs.length - 1];
        v = last.amount;
        if (calc.perExtra) v += Math.ceil((c - last.upTo) / calc.perExtra.per) * calc.perExtra.amount;
      }
      if (calc.max != null) v = Math.min(v, calc.max);
    }
    return v;
  }

  // Companies (Registration Offices and Fees) Rules, 2014 — registration fee by nominal (authorised) share capital.
  function companyRegFee(capital, fees) {
    var c = Math.max(0, capital), b = fees.companySchedule, fee = 0;
    for (var i = 0; i < b.length; i++) {
      if (c <= b[i].upTo || i === b.length - 1) {
        fee = b[i].base + (b[i].per ? Math.ceil(Math.max(0, c - b[i].from) / 10000) * b[i].per : 0);
        break;
      }
    }
    return Math.min(fee, fees.companyMax);
  }
  function slabFee(table, amount) {
    for (var i = 0; i < table.length; i++) if (amount <= table[i].upTo) return table[i].fee;
    return table[table.length - 1].fee;
  }

  /** inp: { entity: 'pvt'|'opc'|'llp', state, capital, dsc, dscCost, pro, llpStamp (number|null) } */
  function incorporation(inp, data) {
    var f = data.fees, st = data.stamp[inp.state] || data.stamp[Object.keys(data.stamp)[0]];
    var cap = Math.max(0, Number(inp.capital) || 0), isLLP = inp.entity === 'llp';
    var lines = [];
    var add = function (group, key, label, amount, note, flag) { lines.push({ group: group, key: key, label: label, amount: Math.round(amount), note: note || '', flag: flag || '' }); };
    if (!isLLP) {
      add('mca', 'name', 'Name reservation (SPICe+ Part A)', f.nameReservation, 'Payable once; not again if the name was reserved through RUN.');
      if (cap <= f.spiceNilUpTo) add('mca', 'reg', 'Incorporation fee (SPICe+)', 0, 'Nil for authorised capital up to ' + inr(f.spiceNilUpTo) + '.');
      else add('mca', 'reg', 'Incorporation fee (SPICe+)', companyRegFee(cap, f), 'Authorised capital above ' + inr(f.spiceNilUpTo) + ': fee as per the Companies (Registration Offices and Fees) Rules schedule.', 'indicative');
      add('mca', 'din', 'DIN allotment', 0, 'Allotted free in SPICe+ for up to three proposed directors.');
      var moa = stampEval(st.moa.calc, cap), aoa = stampEval(st.aoa.calc, cap);
      add('stamp', 'moa', 'Stamp duty on MoA (' + st.state + ')', moa, st.moa.summary, 'indicative');
      add('stamp', 'aoa', 'Stamp duty on AoA (' + st.state + ')', aoa, st.aoa.summary, 'indicative');
    } else {
      add('mca', 'name', 'Name reservation (RUN-LLP)', f.nameReservation, 'Can also be reserved within FiLLiP.');
      add('mca', 'reg', 'Incorporation fee (FiLLiP)', slabFee(f.llpIncorporation, cap), 'By contribution slab under the LLP Rules.', 'indicative');
      add('mca', 'form3', 'Form 3 filing fee (LLP agreement)', slabFee(f.llpForm3, cap), 'Normal fee by contribution; file within 30 days of incorporation.', 'indicative');
      var auto = st.llpAgreement.calc ? stampEval(st.llpAgreement.calc, cap) : f.llpStampFallback;
      var llpStamp = inp.llpStamp != null && inp.llpStamp !== '' && !isNaN(inp.llpStamp) ? Number(inp.llpStamp) : auto;
      add('stamp', 'llpagr', 'Stamp duty on LLP agreement (' + st.state + ')', llpStamp, st.llpAgreement.summary + (inp.llpStamp != null && inp.llpStamp !== '' ? ' (your figure)' : ' (estimate \u2014 edit if you know the exact figure)'), 'indicative');
    }
    add('tax', 'pan', 'PAN application', f.pan, 'Applied through the incorporation form.', 'indicative');
    add('tax', 'tan', 'TAN application', f.tan, 'Applied through the incorporation form.', 'indicative');
    var dsc = Math.max(0, Math.round(Number(inp.dsc) || 0)), dscCost = Math.max(0, Number(inp.dscCost) || 0);
    add('other', 'dsc', 'Class 3 DSC \u00d7 ' + dsc + (isLLP ? ' (designated partners)' : ' (directors / subscribers)'), dsc * dscCost, inr(dscCost) + ' per person \u2014 market estimate, varies by vendor and validity.', 'estimate');
    if (inp.pro) {
      var pro = isLLP ? data.pro.llp : data.pro.pvt;
      add('pro', 'pro', 'Legal Staff professional fee (from)', pro.price, pro.label);
    }
    var sum = function (g) { return lines.filter(function (l) { return !g || g.indexOf(l.group) > -1; }).reduce(function (a, l) { return a + l.amount; }, 0); };
    return { lines: lines, gov: sum(['mca', 'tax']), stamp: sum(['stamp']), other: sum(['other']), pro: sum(['pro']), total: sum(), state: st, entity: inp.entity, capital: cap };
  }

  var ENT = { pvt: 'Private Limited Company', opc: 'One Person Company', llp: 'Limited Liability Partnership' };
  var FLAG = { indicative: '<span class="tl-flag">indicative</span>', estimate: '<span class="tl-flag">estimate</span>' };

  function renderInc(r) {
    var groups = [['mca', 'MCA fees'], ['stamp', 'State stamp duty'], ['tax', 'PAN & TAN'], ['other', 'Digital signatures'], ['pro', 'Professional fee']];
    var rows = groups.map(function (g) {
      var ls = r.lines.filter(function (l) { return l.group === g[0]; });
      if (!ls.length) return '';
      return '<tr class="tc-grp"><th colspan="2">' + g[1] + '</th></tr>' + ls.map(function (l) {
        return '<tr><td><b>' + esc(l.label) + '</b>' + (l.flag ? ' ' + FLAG[l.flag] : '') + '<small>' + esc(l.note) + '</small></td><td class="num">' + inr(l.amount) + '</td></tr>';
      }).join('');
    }).join('');
    return '<div class="tc-head"><p class="kicker">Estimated cost</p><p class="tc-total" data-total="' + r.total + '">' + inr(r.total) + '</p>' +
      '<p class="tc-sub">' + esc(ENT[r.entity]) + ' \u00b7 ' + esc(r.state.state) + ' \u00b7 ' + (r.entity === 'llp' ? 'contribution ' : 'authorised capital ') + inr(r.capital) + '</p>' +
      '<div class="tc-split"><span><small>Government fees</small><b>' + inr(r.gov) + '</b></span><span><small>Stamp duty</small><b>' + inr(r.stamp) + '</b></span><span><small>DSC</small><b>' + inr(r.other) + '</b></span>' + (r.pro ? '<span><small>Professional</small><b>' + inr(r.pro) + '</b></span>' : '') + '</div></div>' +
      '<div class="tc-table-wrap"><table class="tc-table"><tbody>' + rows + '<tr class="tc-sum"><th>Total</th><td class="num">' + inr(r.total) + '</td></tr></tbody></table></div>' +
      '<p class="tc-roc">' + 'Jurisdictional RoC: <b>' + esc(r.state.roc.office) + '</b> \u2014 ' + esc(r.state.roc.jurisdiction) + '.</p>' +
      '<p class="tc-note">' + esc(r.state.note) + '</p>';
  }

  function incCsv(r) {
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    var out = [['Item', 'Amount (INR)', 'Note'].map(q).join(',')];
    r.lines.forEach(function (l) { out.push([q(l.label), l.amount, q(l.note + (l.flag ? ' [' + l.flag + ']' : ''))].join(',')); });
    out.push([q('Total'), r.total, q('')].join(','));
    out.push('');
    out.push(q('Entity: ' + ENT[r.entity] + '; State: ' + r.state.state + '; ' + (r.entity === 'llp' ? 'Contribution' : 'Authorised capital') + ': ' + r.capital));
    out.push(q('Jurisdictional RoC: ' + r.state.roc.office));
    out.push(q('Indicative estimate generated by Legal Staff. Government fees and stamp duty change; confirm on the MCA portal before filing.'));
    return out.join('\r\n');
  }

  /* ---------------- compliance calendar ---------------- */
  function firstFyEnd(entity, inc) {
    var y = +inc.slice(0, 4), m = +inc.slice(5, 7);
    // Company: incorporated Jan–Mar may run its first FY to 31 March of the next year (assumed); otherwise next 31 March.
    if (entity === 'company') return D.make(y + 1, 3, 31);
    // LLP: incorporated after 30 September may run its first FY to 31 March of the year next following (assumed).
    if (m >= 10) return D.make(y + 2, 3, 31);
    return D.make(y + 1, 3, 31);
  }

  /** inp: { entity: 'company'|'llp', inc, fy: '2026-27', audit (LLP), agmDate, today } */
  function calendar(inp, data) {
    var Y = parseInt(inp.fy, 10), fyStart = D.make(Y, 4, 1), fyEnd = D.make(Y + 1, 3, 31);
    var inc = inp.inc, today = inp.today || D.today();
    var ffe = firstFyEnd(inp.entity, inc), isFirstFy = fyEnd === ffe;
    var notes = [];
    if (D.ms(inc) > D.ms(fyEnd)) notes.push('The incorporation date is after the end of FY ' + inp.fy + '. Choose a later financial year to see annual filings.');
    else if (D.ms(fyEnd) < D.ms(ffe)) notes.push('FY ' + inp.fy + ' falls inside the first financial year, which this calendar assumes runs to ' + D.fmt(ffe) + '. Annual ROC filings for it appear under FY ' + (+ffe.slice(0, 4) - 1) + '-' + ffe.slice(2, 4) + '. Income-tax filings still follow the April\u2013March year.');
    var agmDue = isFirstFy ? D.addMonths(fyEnd, 9) : D.addMonths(fyEnd, 6);
    var agmBase = D.valid(inp.agmDate) ? inp.agmDate : agmDue;
    var items = [];
    data.rules.forEach(function (r) {
      if (r.entity !== 'both' && r.entity !== inp.entity) return;
      if (r.audit === true && !inp.audit) return;
      if (r.audit === false && inp.audit) return;
      var date = null, d = r.due;
      if (d.type === 'afterIncorp') date = d.days ? D.addDays(inc, d.days) : D.addMonths(inc, d.months);
      else if (d.type === 'agm') date = agmDue;
      else if (d.type === 'afterAgm') date = D.addDays(agmBase, d.days);
      else if (d.type === 'afterFy') date = D.make(d.month >= 4 ? Y + 1 : Y + 2, d.month, d.day);
      else if (d.type === 'inFy') date = D.make(d.month >= 4 ? Y : Y + 1, d.month, d.day);
      if (!date) return;
      if (r.when === 'first') {
        var incIn = D.ms(inc) >= D.ms(fyStart) && D.ms(inc) <= D.ms(fyEnd), dueIn = D.ms(date) >= D.ms(fyStart) && D.ms(date) <= D.ms(fyEnd);
        if (!incIn && !dueIn) return;
      } else if (r.basis === 'statutory') {
        if (D.ms(fyEnd) < D.ms(ffe) || D.ms(inc) > D.ms(fyEnd)) return;
        if (r.firstAgmOnly && !isFirstFy) return;
      } else {
        var pe = d.type === 'inFy' ? D.make(d.periodEnd.month >= 4 ? Y : Y + 1, d.periodEnd.month, d.periodEnd.day) : fyEnd;
        if (D.ms(inc) > D.ms(pe)) return;
      }
      var left = D.diff(today, date);
      var status = left < 0 ? 'overdue' : left <= 30 ? 'soon' : 'upcoming';
      var title = r.title;
      if (r.id === 'agm') title = (isFirstFy ? 'First annual general meeting' : 'Annual general meeting') + (D.valid(inp.agmDate) ? ' (you entered ' + D.fmt(inp.agmDate) + ')' : '');
      items.push({ id: r.id, date: date, form: r.form, title: title, law: r.law, note: r.note, conditional: r.conditional || '', sure: r.sure, lateFee: r.lateFee || '', status: status, left: left });
    });
    items.sort(function (a, b) { return D.ms(a.date) - D.ms(b.date) || a.form.localeCompare(b.form); });
    return { items: items, notes: notes, fy: inp.fy, entity: inp.entity, inc: inc, today: today, firstFyEnd: ffe, isFirstFy: isFirstFy, agmDue: agmDue };
  }

  var STATUS = { overdue: 'Overdue', soon: 'Due soon', upcoming: 'Upcoming' };
  function renderCal(c) {
    var counts = { overdue: 0, soon: 0, upcoming: 0 };
    c.items.forEach(function (i) { counts[i.status]++; });
    var head = '<div class="cal-head"><div><p class="kicker">' + (c.entity === 'llp' ? 'LLP' : 'Private limited company') + ' \u00b7 FY ' + esc(c.fy) + '</p><p class="cal-count">' + c.items.length + ' dated compliances</p>' +
      '<p class="tc-sub">Incorporated ' + D.fmt(c.inc) + ' \u00b7 first FY assumed to end ' + D.fmt(c.firstFyEnd) + ' \u00b7 status as of ' + D.fmt(c.today) + '</p></div>' +
      '<div class="cal-legend"><span class="st st-overdue">' + counts.overdue + ' overdue</span><span class="st st-soon">' + counts.soon + ' due soon</span><span class="st st-upcoming">' + counts.upcoming + ' upcoming</span></div></div>';
    var notes = c.notes.map(function (n) { return '<p class="cal-note">' + esc(n) + '</p>'; }).join('');
    var list = '<ol class="cal-list">' + c.items.map(function (i) {
      var p = i.date.split('-');
      var when = i.left < 0 ? Math.abs(i.left) + ' days ago' : i.left === 0 ? 'today' : 'in ' + i.left + ' days';
      return '<li class="cal-item is-' + i.status + '" data-id="' + esc(i.id) + '"><div class="cal-date"><b>' + (+p[2]) + '</b><span>' + MON[+p[1] - 1] + ' ' + p[0] + '</span></div>' +
        '<div class="cal-body"><div class="cal-top"><span class="tag">' + esc(i.form) + '</span><span class="st st-' + i.status + '">' + STATUS[i.status] + ' \u00b7 ' + when + '</span>' + (i.sure ? '' : '<span class="tl-flag">indicative</span>') + '</div>' +
        '<h3>' + esc(i.title) + '</h3>' + (i.conditional ? '<p class="cal-cond">If applicable: ' + esc(i.conditional) + '</p>' : '') +
        '<p>' + esc(i.note) + '</p><p class="cal-law">' + esc(i.law) + '</p></div></li>';
    }).join('') + '</ol>';
    return head + notes + (c.items.length ? list : '<p class="cal-note">No dated compliances for this selection.</p>');
  }

  function icsFor(c) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var fold = function (s) { var out = [], line = s; while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); } out.push(line); return out.join('\r\n'); };
    var tx = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
    var ev = c.items.map(function (i) {
      var d = i.date.replace(/-/g, ''), next = D.addDays(i.date, 1).replace(/-/g, '');
      return ['BEGIN:VEVENT', 'UID:' + i.id + '-' + d + '-' + c.fy + '@legalstaff', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + next,
        fold('SUMMARY:' + tx(i.form + ' \u2014 ' + i.title)), fold('DESCRIPTION:' + tx((i.conditional ? 'If applicable: ' + i.conditional + '. ' : '') + i.note + ' (' + i.law + '). Indicative due date generated by Legal Staff; confirm before filing.')),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + tx(i.form + ' due in 7 days'), 'TRIGGER:-P7D', 'END:VALARM', 'END:VEVENT'].join('\r\n');
    });
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Legal Staff//ROC Compliance Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Compliance FY ' + c.fy].concat(ev).concat(['END:VCALENDAR']).join('\r\n') + '\r\n';
  }

  /* ---------------- late fee ---------------- */
  function normalFee(base, capital, data) {
    var c = Math.max(0, Number(capital) || 0);
    if (base === 'llp') { for (var i = 0; i < data.llpNormalFee.length; i++) if (c <= data.llpNormalFee[i].upTo) return data.llpNormalFee[i].fee; return 600; }
    for (var j = 0; j < data.companyNormalFee.length; j++) if (c < data.companyNormalFee[j].below) return data.companyNormalFee[j].fee;
    return 600;
  }

  /** inp: { rule (id), due, filed, capital, officers } */
  function lateFee(inp, data) {
    var rule = data.rules.filter(function (r) { return r.id === inp.rule; })[0];
    var lf = rule && data.lateFees[rule.lateFee];
    if (!rule || !lf || !D.valid(inp.due) || !D.valid(inp.filed)) return { ok: false };
    var days = Math.max(0, D.diff(inp.due, inp.filed)), lines = [], total = 0;
    var base = lf.base || (rule.entity === 'llp' ? 'llp' : 'company');
    if (days > 0) {
      if (lf.type === 'perDay') {
        total = days * lf.rate;
        lines.push([inr(lf.rate) + ' \u00d7 ' + days + ' days', total]);
        if (lf.base) lines.push(['Normal filing fee (payable in any case)', normalFee(base, inp.capital, data), true]);
      } else if (lf.type === 'flat') { total = lf.amount; lines.push(['Fixed additional fee / late fee', total]); }
      else if (lf.type === 'multiplier') {
        var nf = normalFee(base, inp.capital, data), band = lf.bands.filter(function (b) { return days <= b.upToDays; })[0] || lf.bands[lf.bands.length - 1];
        total = nf * band.times;
        lines.push([band.times + ' \u00d7 normal fee of ' + inr(nf), total]);
        lines.push(['Normal filing fee (payable in any case)', nf, true]);
      } else if (lf.type === 'penalty10A') {
        var officers = Math.max(1, Math.round(Number(inp.officers) || 1));
        var per = Math.min(days * lf.officerPerDay, lf.officerMax);
        lines.push(['Penalty on the company', lf.company]);
        lines.push(['Penalty per officer in default: ' + inr(lf.officerPerDay) + ' \u00d7 ' + days + ' days (max ' + inr(lf.officerMax) + ') \u00d7 ' + officers, per * officers]);
        total = lf.company + per * officers;
        var mult = data.lateFees.multiplier, nf2 = normalFee('company', inp.capital, data), b2 = mult.bands.filter(function (b) { return days <= b.upToDays; })[0];
        lines.push(['Additional filing fee on INC-20A (' + b2.times + ' \u00d7 ' + inr(nf2) + ', indicative)', nf2 * b2.times]);
        total += nf2 * b2.times;
      }
    }
    return { ok: true, days: days, total: total, lines: lines, rule: rule, lf: lf };
  }

  function renderLate(r) {
    if (!r.ok) return '<p class="cal-note">Pick a filing and enter valid dates.</p>';
    if (r.days === 0) return '<div class="lf-out ok"><p class="kicker">Additional fee</p><p class="tc-total">' + inr(0) + '</p><p class="tc-sub">Filed on or before the due date \u2014 no additional fee for ' + esc(r.rule.form) + '.</p></div>';
    return '<div class="lf-out"><p class="kicker">' + esc(r.rule.form) + ' \u00b7 ' + r.days + ' days late</p><p class="tc-total red" data-total="' + r.total + '">' + inr(r.total) + '</p>' +
      '<p class="tc-sub">' + esc(r.lf.label) + (r.lf.sure ? '' : ' \u00b7 indicative') + '</p>' +
      '<table class="tc-table"><tbody>' + r.lines.map(function (l) { return '<tr' + (l[2] ? ' class="tc-info"' : '') + '><td>' + esc(l[0]) + (l[2] ? '<small>Shown for reference; not included in the total above</small>' : '') + '</td><td class="num">' + inr(l[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="tc-note">' + esc(r.lf.law) + (r.lf.capNote ? ' ' + esc(r.lf.capNote) : '') + '</p></div>';
  }

  var API = { D: D, inr: inr, esc: esc, stampEval: stampEval, companyRegFee: companyRegFee, incorporation: incorporation, renderInc: renderInc, incCsv: incCsv, calendar: calendar, renderCal: renderCal, icsFor: icsFor, lateFee: lateFee, renderLate: renderLate };
  root.LSTools = API;
  if (typeof document === 'undefined') return;

  /* ================= browser ================= */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var readJSON = function (id) { var el = document.getElementById(id); try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } };
  var download = function (name, text, type) {
    var blob = new Blob([text], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  };
  var flash = function (el) { if (!el) return; el.classList.remove('tc-flash'); void el.offsetWidth; el.classList.add('tc-flash'); };
  var printScope = function (scope) {
    document.body.setAttribute('data-print', scope);
    window.print();
  };
  window.addEventListener('afterprint', function () { document.body.removeAttribute('data-print'); });

  /* ---- incorporation calculator ---- */
  function initInc() {
    var form = $('#inc-form'), out = $('#inc-out'), data = readJSON('inc-data');
    if (!form || !out || !data) return;
    var STEPS = data.steps, slider = $('#inc-cap-range', form), exact = $('#inc-cap', form), llpStamp = $('#inc-llpstamp', form);
    var nearest = function (v) { var best = 0; STEPS.forEach(function (s, i) { if (Math.abs(s - v) < Math.abs(STEPS[best] - v)) best = i; }); return best; };
    var setCap = function (v, from) {
      v = Math.max(0, Math.round(v));
      if (from !== 'exact') exact.value = v;
      if (from !== 'range') slider.value = nearest(Math.min(v, STEPS[STEPS.length - 1]));
      $('#inc-cap-label').textContent = inr(v);
      $$('.preset', form).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.v === v)); });
    };
    var last;
    var run = function () {
      var entity = $('input[name=entity]:checked', form).value;
      form.classList.toggle('is-llp', entity === 'llp');
      $('#inc-cap-name').textContent = entity === 'llp' ? 'Total contribution' : 'Authorised share capital';
      $('#inc-dsc-name').textContent = entity === 'llp' ? 'Designated partners (DSC count)' : 'Directors / subscribers (DSC count)';
      var dscEl = $('#inc-dsc', form);
      if (entity === 'opc' && +dscEl.value > 1 && !dscEl.dataset.touched) dscEl.value = 1;
      if (entity !== 'opc' && +dscEl.value < 2 && !dscEl.dataset.touched) dscEl.value = 2;
      var inp = { entity: entity, state: $('#inc-state', form).value, capital: +exact.value || 0, dsc: +dscEl.value || 0, dscCost: +$('#inc-dsccost', form).value || 0, pro: $('#inc-pro', form).checked,
        llpStamp: llpStamp && llpStamp.dataset.touched && llpStamp.value !== '' ? +llpStamp.value : null };
      last = incorporation(inp, data);
      if (llpStamp && !llpStamp.dataset.touched) { var l = last.lines.filter(function (x) { return x.key === 'llpagr'; })[0]; llpStamp.value = l ? l.amount : ''; }
      out.innerHTML = renderInc(last);
      flash($('.tc-total', out));
    };
    slider.addEventListener('input', function () { setCap(STEPS[+slider.value], 'range'); run(); });
    exact.addEventListener('input', function () { setCap(+exact.value || 0, 'exact'); run(); });
    $$('.preset', form).forEach(function (b) { b.addEventListener('click', function () { setCap(+b.dataset.v); run(); }); });
    $('#inc-dsc', form).addEventListener('input', function (e) { e.target.dataset.touched = '1'; });
    if (llpStamp) llpStamp.addEventListener('input', function () { llpStamp.dataset.touched = llpStamp.value === '' ? '' : '1'; });
    form.addEventListener('input', function (e) { if (e.target !== slider && e.target !== exact) run(); });
    form.addEventListener('change', function (e) { if (e.target.name === 'entity' || e.target.id === 'inc-state') { if (llpStamp) llpStamp.dataset.touched = ''; } run(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    $('#inc-print').addEventListener('click', function () { printScope('inc'); });
    $('#inc-download').addEventListener('click', function () { download('incorporation-cost-estimate-' + last.state.state.toLowerCase().replace(/\s+/g, '-') + '.csv', incCsv(last), 'text/csv;charset=utf-8'); });
    setCap(+exact.value || 100000);
    run();
  }

  /* ---- compliance calendar ---- */
  function initCal() {
    var form = $('#cal-form'), out = $('#cal-out'), data = readJSON('cal-data');
    if (!form || !out || !data) return;
    var lform = $('#lf-form'), lout = $('#lf-out'), last;
    var lfTouched = { due: false, filed: false };
    var runLate = function () {
      if (!lform) return;
      var ruleSel = $('#lf-rule', lform), entity = $('input[name=centity]:checked', form).value;
      $$('option', ruleSel).forEach(function (o) { var r = data.rules.filter(function (x) { return x.id === o.value; })[0]; o.hidden = o.disabled = !(r && (r.entity === 'both' || r.entity === entity)); });
      if (ruleSel.selectedOptions[0] && ruleSel.selectedOptions[0].disabled) { var firstOk = $$('option', ruleSel).filter(function (o) { return !o.disabled; })[0]; if (firstOk) ruleSel.value = firstOk.value; }
      var item = last && last.items.filter(function (i) { return i.id === ruleSel.value; })[0];
      if (!lfTouched.due && item) $('#lf-due', lform).value = item.date;
      if (!lfTouched.filed && D.valid($('#lf-due', lform).value)) $('#lf-filed', lform).value = D.addDays($('#lf-due', lform).value, 30);
      var rule = data.rules.filter(function (x) { return x.id === ruleSel.value; })[0];
      lform.classList.toggle('show-officers', !!(rule && rule.lateFee === 'inc20a'));
      $('#lf-cap-name').textContent = entity === 'llp' ? 'Contribution (\u20b9)' : 'Authorised capital (\u20b9)';
      var r = lateFee({ rule: ruleSel.value, due: $('#lf-due', lform).value, filed: $('#lf-filed', lform).value, capital: +$('#lf-cap', lform).value, officers: +$('#lf-officers', lform).value }, data);
      lout.innerHTML = renderLate(r);
      flash($('.tc-total', lout));
    };
    var run = function () {
      var entity = $('input[name=centity]:checked', form).value;
      form.classList.toggle('is-llp', entity === 'llp');
      var inc = $('#cal-inc', form).value;
      if (!D.valid(inc)) { out.innerHTML = '<p class="cal-note">Enter a valid incorporation date.</p>'; return; }
      last = calendar({ entity: entity, inc: inc, fy: $('#cal-fy', form).value, audit: $('#cal-audit', form).checked, agmDate: entity === 'company' ? $('#cal-agm', form).value : '', today: D.today() }, data);
      out.innerHTML = renderCal(last);
      flash($('.cal-count', out));
      runLate();
    };
    form.addEventListener('input', run); form.addEventListener('change', run);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    if (lform) {
      lform.addEventListener('submit', function (e) { e.preventDefault(); });
      lform.addEventListener('input', function (e) {
        if (e.target.id === 'lf-due') lfTouched.due = true;
        if (e.target.id === 'lf-filed') lfTouched.filed = true;
        runLate();
      });
      $('#lf-rule', lform).addEventListener('change', function () { lfTouched.due = false; lfTouched.filed = false; runLate(); });
    }
    $('#cal-ics').addEventListener('click', function () { if (last && last.items.length) download('compliance-calendar-fy-' + last.fy + '.ics', icsFor(last), 'text/calendar;charset=utf-8'); });
    $('#cal-print').addEventListener('click', function () { printScope('cal'); });
    run();
  }

  /* ---- trademark class finder ---- */
  function initTm() {
    var app = $('#tm-app'), data = readJSON('tm-data');
    if (!app || !data) return;
    var q = $('#tm-q', app), cards = $$('.tm-card', app), chips = $$('.tm-chip', app), countEl = $('#tm-count', app), empty = $('#tm-empty', app), biz = $('#tm-biz', app), rec = $('#tm-rec', app);
    var active = '', recSet = [];
    var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9&\s-]/g, ' ').replace(/\s+/g, ' ').trim(); };
    var filter = function () {
      var term = norm(q.value), n = 0;
      var num = /^\d{1,2}$/.test(term) ? +term : null;
      cards.forEach(function (c) {
        var okS = !active || c.dataset.sectors.split(' ').indexOf(active) > -1;
        var okQ = !term || (num != null ? +c.dataset.n === num : term.split(' ').every(function (w) { return c.dataset.text.indexOf(w) > -1; }));
        var show = okS && okQ;
        c.hidden = !show; if (show) n++;
        c.classList.toggle('is-rec', recSet.indexOf(+c.dataset.n) > -1);
        if (term && show && num == null && n <= 3) c.open = true;
      });
      countEl.textContent = n + (n === 1 ? ' class' : ' classes') + (active || term ? ' match' : ' in the Nice Classification');
      empty.hidden = n > 0;
    };
    q.addEventListener('input', filter);
    chips.forEach(function (ch) { ch.addEventListener('click', function () {
      active = active === ch.dataset.sector ? '' : ch.dataset.sector;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.sector === active)); });
      filter();
    }); });
    var renderRec = function () {
      var b = data.businessTypes.filter(function (x) { return x.id === biz.value; })[0];
      recSet = b ? b.classes : [];
      if (!b) { rec.innerHTML = ''; filter(); return; }
      rec.innerHTML = '<p class="kicker">Typical classes for ' + esc(b.label) + '</p><div class="tm-rec-classes">' + b.classes.map(function (n) {
        return '<a href="#class-' + n + '" class="tm-rec-c"><b>Class ' + n + '</b><span>' + esc(data.headings[n]) + '</span></a>'; }).join('') + '</div>' +
        '<p class="tm-why">' + esc(b.why) + '</p>' +
        '<p class="tm-nic"><b>Suggested NIC 2008 codes:</b> ' + b.nic.map(function (c) { return '<span class="tag">' + esc(c.code) + '</span> ' + esc(c.desc); }).join(' \u00b7 ') + '</p>';
      filter();
    };
    biz.addEventListener('change', renderRec);
    rec.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#class-"]'); if (!a) return;
      var card = document.getElementById(a.getAttribute('href').slice(1));
      if (card) { q.value = ''; active = ''; chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); filter(); card.open = true; }
    });
    $('#tm-reset', app).addEventListener('click', function () { q.value = ''; active = ''; biz.value = ''; chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); renderRec(); cards.forEach(function (c) { c.open = false; }); });
    app.classList.add('is-live');
    renderRec();
  }

  var start = function () { initInc(); initCal(); initTm(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);

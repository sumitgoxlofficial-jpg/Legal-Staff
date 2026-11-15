/* Legal Staff — free advocate tools: section converter (IPC/CrPC/IEA → BNS/BNSS/BSA), limitation period calculator,
   and the section 138 NI Act timeline calculator.
   The calculation and render functions are shared: seo/pages/tools.mjs runs this file at build time in a Node vm
   sandbox (no DOM) to pre-render the default result into the static HTML; the browser re-runs the same code live. */
(function (root) {
  'use strict';

  /* ---------------- helpers ---------------- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY = 864e5;
  var plural = function (n, w) { return n + ' ' + w + (Math.abs(n) === 1 ? '' : 's'); };

  // Dates are ISO 'YYYY-MM-DD' strings computed in UTC, so time zones never shift a deadline.
  var D = {
    ms: function (iso) { var p = String(iso).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); },
    iso: function (ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); },
    make: function (y, m, d) { return D.iso(Date.UTC(y, m - 1, d)); },
    valid: function (iso) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false;
      var p = iso.split('-').map(Number);
      return p[0] > 1900 && p[0] < 2200 && D.iso(D.ms(iso)) === iso;
    },
    addDays: function (iso, n) { return D.iso(D.ms(iso) + n * DAY); },
    // Same calendar date n months later; clamps to the month's last day (31 Jan + 1 month → 28/29 Feb).
    addMonths: function (iso, n) {
      var p = iso.split('-').map(Number), y = p[0], m = p[1] - 1 + n, d = p[2];
      y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
      var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return D.make(y, m + 1, Math.min(d, last));
    },
    diff: function (a, b) { return Math.round((D.ms(b) - D.ms(a)) / DAY); },
    dow: function (iso) { return new Date(D.ms(iso)).getUTCDay(); },
    fmt: function (iso) { var p = iso.split('-'); return DOW[D.dow(iso)] + ', ' + (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; },
    short: function (iso) { var p = iso.split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0]; },
    today: function () { var t = new Date(); return D.make(t.getFullYear(), t.getMonth() + 1, t.getDate()); },
    weekend: function (iso) { var w = D.dow(iso); return w === 0 || w === 6; }
  };

  var ICON = {
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>',
    cross: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    dot: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 8v5M12 16.5v.01"/></svg>',
    copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9h11v11H9z M5 15H4V4h11v1"/></svg>',
    arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14 M13 6l6 6-6 6"/></svg>'
  };
  var STATUS = {
    pass: { label: 'Pass', ic: ICON.check },
    fail: { label: 'Fail', ic: ICON.cross },
    warn: { label: 'Check', ic: ICON.dot },
    info: { label: 'Date', ic: ICON.dot },
    pending: { label: 'Needs date', ic: ICON.dot }
  };
  var badge = function (st) { var s = STATUS[st] || STATUS.info; return '<span class="tl-badge is-' + st + '">' + s.ic + s.label + '</span>'; };

  /* ======================================================================
     1. Section converter
     ====================================================================== */
  var secKey = function (s) { var m = String(s || '').match(/^(\d+)([A-Z]*)/i); return m ? [parseInt(m[1], 10), m[2].toUpperCase(), String(s)] : [1e9, '', String(s || '')]; };
  var cmpSec = function (a, b) { var x = secKey(a), y = secKey(b); return x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0) || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0); };
  var normSec = function (s) { return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/^(section|sec\.?|s\.)/, '').replace(/^(ipc|bns|crpc|bnss|iea|bsa)/, '').replace(/^(section|sec\.?|s\.)/, ''); };

  // Returns a rank (lower is better) or -1 when the row does not match the query.
  function matchRank(row, q, dir) {
    if (!q) return 0;
    var n = normSec(q);
    var from = dir === 'new' ? row.new : row.old, to = dir === 'new' ? row.old : row.new;
    if (/^\d/.test(n)) {
      var test = function (s) {
        if (!s) return -1;
        var parts = normSec(s).split('/'), best = -1;
        parts.forEach(function (p) { if (p === n || p.replace(/\(.*$/, '') === n) best = best < 0 ? 0 : Math.min(best, 0); else if (p.indexOf(n) === 0 && best < 0) best = 1; });
        return best;
      };
      var f = test(from); if (f >= 0) return f;
      var t = test(to); if (t >= 0) return 2 + t;
      return -1;
    }
    var words = q.toLowerCase().split(/\s+/).filter(Boolean), hay = (row.title + ' ' + row.notes).toLowerCase();
    for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return -1;
    return row.title.toLowerCase().indexOf(words[0]) >= 0 ? 4 : 5;
  }

  function convertRows(rows, state) {
    var dir = state.dir === 'new' ? 'new' : 'old', q = String(state.q || '').trim();
    return rows.map(function (r, i) { return { r: r, i: i, rank: matchRank(r, q, dir) }; })
      .filter(function (x) { return x.rank >= 0 && (state.pair === 'all' || !state.pair || x.r.law === state.pair); })
      .sort(function (a, b) {
        if (q && a.rank !== b.rank) return a.rank - b.rank;
        var fa = dir === 'new' ? a.r.new : a.r.old, fb = dir === 'new' ? b.r.new : b.r.old;
        if (!fa !== !fb) return fa ? -1 : 1;
        return cmpSec(fa, fb) || a.i - b.i;
      }).map(function (x) { return x.r; });
  }

  function renderConverter(state, data) {
    var dir = state.dir === 'new' ? 'new' : 'old';
    var list = convertRows(data.rows, state), html = '';
    var pairs = data.pairs.filter(function (p) { return state.pair === 'all' || !state.pair || p.id === state.pair; });
    pairs.forEach(function (p) {
      var rows = list.filter(function (r) { return r.law === p.id; });
      if (state.q && !rows.length) return;
      var fromAct = dir === 'new' ? p.newAct : p.oldAct, toAct = dir === 'new' ? p.oldAct : p.newAct;
      html += '<section class="cv-group" data-law="' + p.id + '"><h3 class="cv-h">' + esc(fromAct) + ' <span aria-hidden="true">→</span><span class="sr-only"> to </span> ' + esc(toAct) +
        ' <small>' + plural(rows.length, 'section') + '</small></h3>' +
        '<div class="cv-table-wrap"><table class="cv-table"><caption class="sr-only">' + esc((dir === 'new' ? p.newName + ' to ' + p.oldName : p.oldName + ' to ' + p.newName) + ' section conversion') + '</caption>' +
        '<thead><tr><th scope="col">' + esc(fromAct) + '</th><th scope="col">' + esc(toAct) + '</th><th scope="col">Subject and notes</th><th scope="col"><span class="sr-only">Copy</span></th></tr></thead><tbody>' +
        rows.map(function (r) {
          var from = dir === 'new' ? r.new : r.old, to = dir === 'new' ? r.old : r.new;
          var none = dir === 'new' ? 'New provision' : 'No direct equivalent';
          var toCell = to ? '<b class="cv-sec">' + esc(to) + '</b>' : '<span class="cv-none">' + (dir === 'new' ? 'No ' + esc(toAct) + ' equivalent' : 'No direct equivalent') + '</span>';
          var fromCell = from ? '<b class="cv-sec">' + esc(from) + '</b>' : '<span class="cv-none">' + none + '</span>';
          var copyText = (from ? fromAct + ' ' + from : 'New ' + fromAct + ' provision') + ' → ' + (to ? toAct + ' ' + to : 'no direct ' + toAct + ' equivalent') + ' (' + r.title + ')';
          return '<tr' + (r.verify ? ' class="is-verify"' : '') + '><td class="cv-from" data-label="' + esc(fromAct) + '">' + fromCell + '</td><td class="cv-to" data-label="' + esc(toAct) + '">' + toCell + '</td>' +
            '<td class="cv-note"><span class="cv-title">' + esc(r.title) + '</span><small>' + esc(r.notes) + '</small>' +
            (r.verify ? '<span class="cv-verify">Check the official comparative table</span>' : '') + '</td>' +
            '<td class="cv-act"><button type="button" class="cv-copy" data-copy="' + esc(copyText) + '" aria-label="Copy: ' + esc(copyText) + '">' + ICON.copy + '<span>Copy</span></button></td></tr>';
        }).join('') + '</tbody></table></div></section>';
    });
    if (!html) html = '<p class="cv-empty">No section matches “' + esc(state.q) + '”. Try the bare number (for example 420 or 438) or a keyword such as “bail”, “cheating” or “electronic”.</p>';
    return { html: html, count: list.length, total: data.rows.filter(function (r) { return state.pair === 'all' || !state.pair || r.law === state.pair; }).length };
  }

  /* ======================================================================
     2. Limitation period calculator
     ====================================================================== */
  function calcLimitation(input, rules, today) {
    var rule = rules.filter(function (r) { return r.id === input.type; })[0] || rules[0];
    var res = { rule: rule, errors: [], warnings: [], steps: [], today: today };
    var alt = rule.altPeriod && input.certRefused;
    var startLabel = alt ? rule.altPeriod.startLabel : rule.startLabel;
    res.startLabel = startLabel;
    if (!D.valid(input.start)) { res.errors.push('Enter the ' + startLabel.toLowerCase().replace(/ \(.*$/, '') + '.'); return res; }
    var start = input.start, period = alt ? rule.altPeriod : rule.period;
    var periodText = period.days ? plural(period.days, 'day') : plural(period.years, 'year');
    var base = period.days ? D.addDays(start, period.days) : D.addMonths(start, 12 * period.years);
    res.start = start; res.base = base; res.periodText = periodText;

    res.steps.push({ t: 'Starting point', v: D.fmt(start), d: startLabel + '. ' + (rule.copyExclusion ? 'Section 12(1) of the Limitation Act excludes this day, so day 1 of the period is ' + D.short(D.addDays(start, 1)) + '.' : 'This day is excluded (Limitation Act s.12(1) / General Clauses Act s.9), so day 1 is ' + D.short(D.addDays(start, 1)) + '.') });
    res.steps.push({ t: 'Prescribed period', v: periodText, d: (alt ? rule.altPeriod.label + ' — ' : '') + rule.source + '.' });
    res.steps.push({ t: 'Base deadline', v: D.fmt(base), d: period.days ? D.short(start) + ' + ' + periodText + '.' : 'Same calendar date ' + periodText + ' later.' });

    var excluded = 0;
    if (rule.copyExclusion) {
      var a = input.applied, r = input.ready, hasA = D.valid(a), hasR = D.valid(r);
      if (!hasA && !hasR) {
        res.steps.push({ t: 'Certified copy time (s.12(2))', v: 'Not entered', d: 'Enter the date you applied for the certified copy and the date it was ready to exclude that time.' });
      } else if (!hasA || !hasR) {
        res.warnings.push('Enter both the date the certified copy was applied for and the date it was ready; until then no copy time is excluded.');
        res.steps.push({ t: 'Certified copy time (s.12(2))', v: 'Incomplete', d: 'Both dates are needed.' });
      } else if (D.diff(a, start) > 0) {
        res.errors.push('The certified copy application date is before the ' + startLabel.toLowerCase() + '. Check the dates.');
      } else if (D.diff(a, r) < 0) {
        res.errors.push('The date the copy was ready is before the date it was applied for. Check the dates.');
      } else if (D.diff(base, a) > 0) {
        res.steps.push({ t: 'Certified copy time (s.12(2))', v: '0 days', d: 'The copy was applied for on ' + D.short(a) + ', after the period had already expired on ' + D.short(base) + '. Time spent on a copy applied for after limitation has run out is not "requisite", so nothing is excluded.' });
        res.warnings.push('The certified copy was applied for after the limitation period expired, so no copy time can be excluded. You will need to seek condonation of delay.');
      } else {
        var from = D.diff(start, a) === 0 ? D.addDays(start, 1) : a;
        excluded = Math.max(0, D.diff(from, r) + 1);
        var overlap = D.diff(start, a) === 0;
        res.steps.push({ t: 'Certified copy time (s.12(2))', v: plural(excluded, 'day'), d: 'Applied ' + D.short(a) + ', ready ' + D.short(r) + '. Counting both the application day and the day the copy was ready' + (overlap ? ' — minus the judgment day, which s.12(1) already excludes' : '') + ': ' + (excluded ? D.short(from) + ' to ' + D.short(r) + ' = ' + plural(excluded, 'day') : 'nothing extra') + '. The application was made within the period (on day ' + Math.max(0, D.diff(start, a)) + '), so this time is excluded.' });
      }
    }
    if (res.errors.length) return res;
    var final = D.addDays(base, excluded);
    res.excluded = excluded; res.final = final;
    if (excluded) res.steps.push({ t: 'Final deadline', v: D.fmt(final), d: D.short(base) + ' + ' + plural(excluded, 'excluded day') + '.' });

    if (rule.outer) {
      res.outer = D.addDays(start, rule.outer.days);
      res.steps.push({ t: rule.outer.label, v: D.fmt(res.outer), d: 'Day ' + rule.outer.days + ' from service (' + D.short(start) + ' + ' + rule.outer.days + ' days). ' + rule.condonation });
    }
    var check = [{ k: 'final', d: final }].concat(res.outer ? [{ k: 'outer', d: res.outer }] : []);
    res.weekend = check.filter(function (x) { return D.weekend(x.d); }).map(function (x) { return { which: x.k === 'outer' ? 'The outer limit' : 'The deadline', date: x.d }; });
    res.weekend.forEach(function (w) { res.warnings.push(w.which + ' (' + D.short(w.date) + ') falls on a ' + DOW_LONG[D.dow(w.date)] + '. If the court is closed that day, section 4 of the Limitation Act lets you file on the day it reopens — confirm with the court calendar.'); });
    res.remaining = D.diff(today, final);
    if (res.outer) res.outerRemaining = D.diff(today, res.outer);
    return res;
  }

  function renderLimitation(res) {
    if (res.errors.length) return '<div class="tl-alert is-fail" role="alert">' + res.errors.map(esc).join('<br>') + '</div>';
    var rule = res.rule, rem = res.remaining;
    var remText = rem > 0 ? plural(rem, 'day') + ' left' : rem === 0 ? 'Due today' : 'Expired ' + plural(-rem, 'day') + ' ago';
    var big = '<div class="lt-head"><div><p class="lt-k">' + (rule.outer ? 'Day 30 — last day without extension' : 'Last day to file') + '</p><p class="lt-date">' + D.fmt(res.final) + '</p></div>' +
      '<span class="lt-chip' + (rem < 0 ? ' is-late' : rem <= 7 ? ' is-soon' : '') + '">' + remText + '</span></div>';
    if (res.outer) {
      var orem = res.outerRemaining;
      big += '<div class="lt-head lt-sub"><div><p class="lt-k">Day ' + rule.outer.days + ' — ' + esc(rule.outer.label.toLowerCase()) + '</p><p class="lt-date">' + D.fmt(res.outer) + '</p></div>' +
        '<span class="lt-chip' + (orem < 0 ? ' is-late' : orem <= 7 ? ' is-soon' : '') + '">' + (orem > 0 ? plural(orem, 'day') + ' left' : orem === 0 ? 'Due today' : 'Expired ' + plural(-orem, 'day') + ' ago') + '</span></div>';
    }
    var facts = '<dl class="lt-facts"><div><dt>Day of judgment / start</dt><dd>Excluded (s.12(1))</dd></div>' +
      (rule.copyExclusion ? '<div><dt>Certified copy days excluded</dt><dd>' + plural(res.excluded || 0, 'day') + '</dd></div>' : '') +
      '<div><dt>Base deadline</dt><dd>' + D.short(res.base) + '</dd></div><div><dt>Final deadline</dt><dd>' + D.short(res.final) + '</dd></div></dl>';
    var steps = '<ol class="lt-steps">' + res.steps.map(function (s) { return '<li><div class="lt-step-h"><span>' + esc(s.t) + '</span><b>' + esc(s.v) + '</b></div><p>' + esc(s.d) + '</p></li>'; }).join('') + '</ol>';
    var warn = res.warnings.length ? '<ul class="lt-warn">' + res.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '';
    var notes = '<div class="lt-notes"><p><b>Extension and condonation.</b> ' + esc(rule.condonation) + '</p>' + rule.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') +
      '<p class="lt-asof">Days remaining counted from ' + D.short(res.today) + '. Court holidays are not known to this tool — check your court\'s calendar.</p></div>';
    return big + facts + warn + '<h3 class="lt-h">Step by step</h3>' + steps + notes +
      '<a class="btn btn-light lt-cta" href="/#pricing">Track this case inside Legal Staff ' + ICON.arrow + '</a>';
  }

  /* ======================================================================
     3. Section 138 NI Act timeline
     ====================================================================== */
  function calcCheque(input, today) {
    var v = function (k) { return D.valid(input[k]) ? input[k] : null; };
    var cheque = v('cheque'), presentedIn = v('presented'), info = v('info'), notice = v('notice'), delivery = v('delivery');
    var res = { checks: [], events: [], meters: [], today: today };
    var presented = presentedIn || info, presentedApprox = !presentedIn && !!info;

    // 1. Cheque presented within its validity (3 months from the cheque date).
    var c1 = { t: 'Cheque presented within its validity period', law: 'Proviso (a) to s.138; RBI: cheques valid for 3 months from the date on the cheque' };
    if (!cheque) { c1.st = 'pending'; c1.d = 'Enter the date on the cheque.'; }
    else if (!presented) { c1.st = 'pending'; c1.d = 'Enter the presentation date or the date of the return memo.'; }
    else {
      var lastValid = D.addDays(D.addMonths(cheque, 3), -1), stale = D.addMonths(cheque, 3), day = D.diff(cheque, presented);
      res.validUntil = lastValid;
      if (day < 0) { c1.st = 'fail'; c1.d = 'The cheque appears to have been presented (' + D.short(presented) + ') before the date on the cheque (' + D.short(cheque) + '). Check the dates.'; }
      else if (D.diff(presented, lastValid) >= 0) { c1.st = presentedApprox ? 'warn' : 'pass'; c1.d = 'Presented ' + D.short(presented) + (presentedApprox ? ' (using the return memo date, because no presentation date was entered — the actual presentation is usually a few days earlier)' : '') + '. Valid up to ' + D.short(lastValid) + '.'; if (presentedApprox) c1.d += ' Enter the presentation date to confirm.'; }
      else if (presented === stale) { c1.st = 'warn'; c1.d = 'Presented on ' + D.short(presented) + ', the same calendar date three months later. Banks generally treat the cheque as valid only up to ' + D.short(lastValid) + '; check the bank\'s return memo reason.'; }
      else { c1.st = presentedApprox ? 'warn' : 'fail'; c1.d = 'Presented ' + D.short(presented) + ', after the validity period ended on ' + D.short(lastValid) + '. A cheque presented after its validity is not covered by s.138.' + (presentedApprox ? ' (Based on the return memo date — enter the actual presentation date.)' : ''); }
      res.meters.push({ t: 'Cheque validity', used: Math.max(0, day), allowed: D.diff(cheque, lastValid) + 1, unit: 'days', label: 'Presented on day ' + day + ' of about ' + (D.diff(cheque, lastValid) + 1), over: D.diff(presented, lastValid) < 0 });
    }
    res.checks.push(c1);

    // 2. Demand notice within 30 days of receiving information of dishonour.
    var c2 = { t: 'Demand notice sent within 30 days of information of dishonour', law: 's.138 proviso (b)' };
    if (!info) { c2.st = 'pending'; c2.d = 'Enter the date you received the return memo / information of dishonour.'; }
    else {
      var noticeBy = D.addDays(info, 30); res.noticeBy = noticeBy;
      if (!notice) { c2.st = 'pending'; c2.d = 'Last day to send the notice: ' + D.fmt(noticeBy) + '. Enter the dispatch date to check it.'; }
      else {
        var nd = D.diff(info, notice);
        if (nd < 0) { c2.st = 'fail'; c2.d = 'The notice date (' + D.short(notice) + ') is before the information of dishonour (' + D.short(info) + '). Check the dates.'; }
        else if (nd <= 30) { c2.st = 'pass'; c2.d = 'Sent on day ' + nd + ' (' + D.short(notice) + '). The 30th day was ' + D.short(noticeBy) + '.'; }
        else { c2.st = 'fail'; c2.d = 'Sent on day ' + nd + ' (' + D.short(notice) + '), after the 30-day window closed on ' + D.short(noticeBy) + '. A complaint based on this notice is likely to fail; consider whether the cheque can be presented again within its validity — take advice.'; }
        res.meters.push({ t: 'Notice window', used: Math.max(0, nd), allowed: 30, unit: 'days', label: 'Notice sent on day ' + nd + ' of 30', over: nd > 30 });
      }
    }
    res.checks.push(c2);

    // 3–5. Payment window, cause of action and complaint deadline (depend on notice delivery).
    var c3 = { t: '15-day payment period after the drawer receives the notice', law: 's.138 proviso (c)' };
    var c4 = { t: 'Cause of action arises', law: 's.138 proviso (c) read with s.142(1)(b)' };
    var c5 = { t: 'Complaint filed within one month of the cause of action', law: 's.142(1)(b)' };
    if (delivery && notice && D.diff(notice, delivery) < 0) {
      c3.st = 'fail'; c3.d = 'The delivery date (' + D.short(delivery) + ') is before the dispatch date (' + D.short(notice) + '). Check the dates.';
      c4.st = c5.st = 'pending'; c4.d = c5.d = 'Fix the notice dates first.';
    } else if (!delivery) {
      c3.st = c4.st = c5.st = 'pending';
      c3.d = 'Enter the date the notice was delivered (or deemed served) to the drawer.'; c4.d = c5.d = 'Depends on the notice delivery date.';
    } else {
      var payBy = D.addDays(delivery, 15), coa = D.addDays(delivery, 16), fileBy = D.addMonths(coa, 1);
      res.payBy = payBy; res.coa = coa; res.fileBy = fileBy;
      var pr = D.diff(today, payBy);
      c3.st = 'info'; c3.d = 'Notice received ' + D.short(delivery) + '. The drawer can pay until ' + D.fmt(payBy) + ' (15 days, excluding the day of receipt).' + (pr >= 0 ? ' The window is still running — a complaint filed now would be premature.' : '');
      c4.st = 'info'; c4.d = D.fmt(coa) + ' — the day after the 15-day period ends, if payment is not made. A complaint filed before this date is premature.';
      var fr = D.diff(today, fileBy);
      c5.st = fr < 0 ? 'fail' : 'info';
      c5.d = 'File between ' + D.short(coa) + ' and ' + D.fmt(fileBy) + ' (one month, excluding the day the cause of action arose). ' +
        (fr < 0 ? 'That date passed ' + plural(-fr, 'day') + ' ago: the complaint now needs an application showing sufficient cause for the delay (proviso to s.142(1)(b)).' : D.diff(today, coa) > 0 ? 'The filing window has not opened yet.' : plural(fr, 'day') + ' left as of ' + D.short(today) + '.') +
        ' File before the court with jurisdiction under s.142(2).';
      var used = Math.max(0, D.diff(coa, today));
      res.meters.push({ t: 'Complaint window', used: Math.min(used, D.diff(coa, fileBy) + 5), allowed: D.diff(coa, fileBy), unit: 'days', label: D.diff(today, coa) > 0 ? 'Opens on ' + D.short(coa) : fr >= 0 ? 'Today is day ' + used + ' of ' + D.diff(coa, fileBy) : 'Window closed ' + plural(-fr, 'day') + ' ago', over: fr < 0, pending: D.diff(today, coa) > 0 });
    }
    res.checks.push(c3, c4, c5);

    var ev = [];
    if (cheque) ev.push({ d: cheque, t: 'Date on the cheque' });
    if (presentedIn) ev.push({ d: presentedIn, t: 'Cheque presented' });
    if (res.validUntil) ev.push({ d: res.validUntil, t: 'Cheque validity ends', soft: true });
    if (info) ev.push({ d: info, t: 'Information of dishonour received' });
    if (res.noticeBy && !notice) ev.push({ d: res.noticeBy, t: 'Last day to send notice', soft: true });
    if (notice) ev.push({ d: notice, t: 'Demand notice sent', bad: c2.st === 'fail' });
    if (delivery) ev.push({ d: delivery, t: 'Notice delivered to drawer' });
    if (res.payBy) ev.push({ d: res.payBy, t: '15-day payment period ends', soft: true });
    if (res.coa) ev.push({ d: res.coa, t: 'Cause of action arises', key: true });
    if (res.fileBy) ev.push({ d: res.fileBy, t: 'Last day to file complaint', key: true, bad: c5.st === 'fail' });
    ev.sort(function (a, b) { return D.diff(b.d, a.d); });
    res.events = ev;
    res.ok = res.checks.every(function (c) { return c.st !== 'fail'; });
    res.done = res.checks.every(function (c) { return c.st !== 'pending'; });
    return res;
  }

  function renderCheque(res) {
    var fails = res.checks.filter(function (c) { return c.st === 'fail'; }).length;
    var head = '<div class="lt-head"><div><p class="lt-k">' + (res.fileBy ? 'Last day to file the complaint' : 'Filing deadline') + '</p><p class="lt-date">' + (res.fileBy ? D.fmt(res.fileBy) : 'Enter the notice delivery date') + '</p></div>' +
      (fails ? '<span class="lt-chip is-late">' + plural(fails, 'issue') + ' found</span>' : res.done ? '<span class="lt-chip">Timeline in order</span>' : '<span class="lt-chip is-soon">Dates missing</span>') + '</div>';
    var checks = '<ul class="tl-checks">' + res.checks.map(function (c) {
      return '<li class="is-' + c.st + '"><div class="tl-check-h">' + badge(c.st) + '<b>' + esc(c.t) + '</b></div><p>' + esc(c.d) + '</p><small>' + esc(c.law) + '</small></li>';
    }).join('') + '</ul>';
    var meters = res.meters.length ? '<div class="tl-meters">' + res.meters.map(function (m) {
      var pct = m.allowed > 0 ? Math.min(100, Math.round(m.used / m.allowed * 100)) : 0;
      return '<div class="tl-meter' + (m.over ? ' is-over' : '') + (m.pending ? ' is-pending' : '') + '"><div class="tl-meter-h"><span>' + esc(m.t) + '</span><span>' + esc(m.label) + '</span></div>' +
        '<div class="tl-bar" role="img" aria-label="' + esc(m.t + ': ' + m.label) + '"><i style="width:' + pct + '%"></i></div></div>';
    }).join('') + '</div>' : '';
    var timeline = res.events.length ? '<h3 class="lt-h">Timeline</h3><ol class="tl-line">' + res.events.map(function (e, i) {
      var gap = i ? D.diff(res.events[i - 1].d, e.d) : null;
      return '<li class="' + (e.key ? 'is-key' : '') + (e.soft ? ' is-soft' : '') + (e.bad ? ' is-bad' : '') + '">' + (gap !== null ? '<span class="tl-gap">+' + plural(gap, 'day') + '</span>' : '') +
        '<span class="tl-dot" aria-hidden="true"></span><time datetime="' + e.d + '">' + D.fmt(e.d) + '</time><b>' + esc(e.t) + '</b></li>';
    }).join('') + '</ol>' : '';
    return head + checks + meters + timeline + '<p class="lt-asof">Counted as of ' + D.short(res.today) + '. Weekends and court holidays are not adjusted — if a last day falls on a holiday, check the court calendar.</p>' +
      '<a class="btn btn-light lt-cta" href="/#pricing">Track this case inside Legal Staff ' + ICON.arrow + '</a>';
  }

  var api = {
    D: D, esc: esc,
    converter: { rows: convertRows, render: renderConverter },
    limitation: { calc: calcLimitation, render: renderLimitation },
    cheque: { calc: calcCheque, render: renderCheque }
  };
  root.LSTools = api;

  /* ---------------- browser wiring ---------------- */
  if (typeof document === 'undefined') return;
  var readJSON = function (id) { var el = document.getElementById(id); try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } };

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, fail) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? ok() : fail(); } catch (e) { fail(e); }
      document.body.removeChild(ta);
    });
  }

  function initConverter(el) {
    var data = readJSON('cv-data'); if (!data) return;
    var out = el.querySelector('[data-out]'), count = el.querySelector('[data-count]'), search = el.querySelector('input[type=search]'), live = el.querySelector('[data-live]');
    var state = { pair: 'all', dir: 'old', q: '' }, t;
    var paint = function () {
      var r = renderConverter(state, data);
      out.innerHTML = r.html;
      if (count) count.textContent = state.q ? 'Showing ' + r.count + ' of ' + r.total + ' sections' : r.total + ' sections';
    };
    el.addEventListener('change', function (e) {
      if (e.target.name === 'cv-pair') state.pair = e.target.value;
      else if (e.target.name === 'cv-dir') state.dir = e.target.value;
      else return;
      paint();
    });
    search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { state.q = search.value; paint(); }, 80); });
    out.addEventListener('click', function (e) {
      var b = e.target.closest('.cv-copy'); if (!b) return;
      var txt = b.getAttribute('data-copy'), lbl = b.querySelector('span');
      copyText(txt).then(function () { b.classList.add('is-done'); lbl.textContent = 'Copied'; if (live) live.textContent = 'Copied: ' + txt; setTimeout(function () { b.classList.remove('is-done'); lbl.textContent = 'Copy'; }, 1600); },
        function () { lbl.textContent = 'Copy failed'; setTimeout(function () { lbl.textContent = 'Copy'; }, 1600); });
    });
    var q = (location.hash.match(/^#q=(.+)$/) || [])[1];
    if (q) { search.value = decodeURIComponent(q); state.q = search.value; }
    paint();
  }

  function initLimitation(el) {
    var rules = readJSON('lt-data'); if (!rules) return;
    var f = el.querySelector('form'), out = el.querySelector('[data-out]');
    var get = function (n) { var i = f.elements[n]; return i ? (i.type === 'checkbox' ? i.checked : i.value) : ''; };
    var paint = function () {
      var type = get('type'), rule = rules.filter(function (r) { return r.id === type; })[0] || rules[0];
      var alt = rule.altPeriod && get('certRefused');
      el.querySelector('[data-start-label]').textContent = alt ? rule.altPeriod.startLabel : rule.startLabel;
      el.querySelectorAll('[data-copy-fields]').forEach(function (n) { n.hidden = !rule.copyExclusion; });
      el.querySelectorAll('[data-slp-field]').forEach(function (n) { n.hidden = !rule.altPeriod; });
      out.innerHTML = renderLimitation(calcLimitation({ type: type, start: get('start'), applied: get('applied'), ready: get('ready'), certRefused: !!alt }, rules, D.today()));
    };
    f.addEventListener('input', paint); f.addEventListener('change', paint);
    f.addEventListener('submit', function (e) { e.preventDefault(); paint(); });
    paint();
  }

  function initCheque(el) {
    var f = el.querySelector('form'), out = el.querySelector('[data-out]');
    var paint = function () {
      var v = {}; ['cheque', 'presented', 'info', 'notice', 'delivery'].forEach(function (k) { v[k] = f.elements[k].value; });
      out.innerHTML = renderCheque(calcCheque(v, D.today()));
    };
    f.addEventListener('input', paint); f.addEventListener('change', paint);
    f.addEventListener('submit', function (e) { e.preventDefault(); paint(); });
    paint();
  }

  var boot = function () {
    document.querySelectorAll('[data-tool]').forEach(function (el) {
      var k = el.getAttribute('data-tool');
      try { if (k === 'converter') initConverter(el); else if (k === 'limitation') initLimitation(el); else if (k === 'cheque') initCheque(el); }
      catch (e) { if (window.console) console.warn('Tool failed to start', e); }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis);

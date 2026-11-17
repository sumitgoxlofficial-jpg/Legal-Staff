// One real call to the eCourtsIndia API to see whether our reader understands its answer. Costs one case-detail call (about Rs 1.50 pay-as-you-go).
// Usage: COURT_API_KEY=... node tests/court-live-check.mjs <CNR> [base-url]     The key is read from the environment and never printed.
import { normalizeCase, normalizeCnr, cnrValid, classifyCnr, scrub } from '../supabase/functions/_shared/court-logic.js';
const cnr = normalizeCnr(process.argv[2] || ''), base = (process.argv[3] || process.env.COURT_API_URL || 'https://webapi.ecourtsindia.com').replace(/\/+$/, ''), key = process.env.COURT_API_KEY || '';
if (!key) { console.error('Set COURT_API_KEY in the environment.'); process.exit(2); }
if (!cnrValid(cnr)) { console.error('Give a valid CNR as the first argument.'); process.exit(2); }
const t0 = Date.now(); let r;
try { r = await fetch(`${base}/api/partner/case/${encodeURIComponent(cnr)}`, { headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) }); } catch (e) { console.error('Could not reach the provider:', scrub(e.message)); process.exit(1); }
const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch {}
console.log('HTTP', r.status, '·', Date.now() - t0, 'ms ·', 'court kind guess:', classifyCnr(cnr).category);
if (r.status !== 200 || !j) { console.log('Error code:', scrub(j?.error?.code || j?.code || '(none)'), '·', scrub(j?.error?.message || text.slice(0, 200))); process.exit(1); }
const n = normalizeCase(j), has = v => Array.isArray(v) ? v.length > 0 : !!v;
for (const k of ['cnr', 'title', 'caseNumber', 'regNumber', 'caseType', 'court', 'status', 'filingDate', 'registrationDate', 'decisionDate', 'nextHearing', 'lastHearing', 'orderCount', 'petitioners', 'respondents', 'petitionerAdvocates', 'respondentAdvocates', 'hearings', 'orders']) console.log((has(n[k]) ? '  read     ' : '  MISSING  ') + k, has(n[k]) ? (Array.isArray(n[k]) ? `(${n[k].length})` : '= ' + n[k]) : '');
console.log('CNR in the answer matches the one asked for:', n.cnr === cnr, '· empty:', n.empty, '· partial:', n.partial);
console.log('Top-level keys:', Object.keys(j).join(', '), '· courtCaseData keys:', Object.keys((j.data || j).courtCaseData || (j.data || j).tribunalCaseData || {}).join(', '));

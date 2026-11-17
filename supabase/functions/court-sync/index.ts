// Legal Staff court-record engine (supabase/migrations/0022_court_intelligence.sql).
//
// Order of work for every check, cheapest first:
//   1. Official free sources. No automated official source is available (the eCourts portals use CAPTCHA, which is never bypassed),
//      so this step produces official portal links for manual verification.
//   2. The verified record we already hold, and a shared response cache: a recent matching record costs nothing.
//   3. The paid provider (eCourtsIndia), only when the data is missing or stale, a user asked for a fresh check, the budget allows it
//      and the provider's registered coverage includes this court.
//   4. Manual review: the case is flagged and official portal links are returned. Nothing is ever made up.
//
// Callers:  a signed-in member  { action: "verify" | "peek" | "sync_firm" | "retry", firm_id, ... }
//           a platform admin    { action: "admin_overview" | "admin_update" | "rotate_key" | "health" | "retry_dead" }
//           the scheduler       { action: "sync" | "health" } with x-cron-secret (deploy with JWT verification off).
// Secrets: COURT_API_KEY (function secret) or the Vault secret 'court_api_key' (set by rotate_key). The key is never returned,
// logged or placed in an error message (scrub() is applied to everything that leaves this function).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { STATUS, normalizeCnr, cnrValid, classifyCnr, capability, costPaise, requestKey, intervalHours, byPriority, verificationStatus, freshnessLabel,
  normalizeCase, matchesIdentifiers, diffSnapshots, classifyHttp, backoffMs, circuitState, shouldOpenCircuit, scrub, portalLinks, hoursSince, DEFAULTS } from "../_shared/court-logic.js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

const PROVIDER = "ecourtsindia";
const flag = (n: string, d = true) => { const v = Deno.env.get(n); return v == null || v === "" ? d : !/^(false|0|no|off)$/i.test(v); };
const env = () => ({
  base: (() => { const u = Deno.env.get("COURT_API_URL") ?? ""; return u && !u.includes("{") ? u.replace(/\/+$/, "") : "https://webapi.ecourtsindia.com"; })(),
  official: flag("ENABLE_OFFICIAL_SOURCES"), paid: flag("ENABLE_PAID_FALLBACK"), cache: flag("ENABLE_RESPONSE_CACHE"), dedupe: flag("ENABLE_DUPLICATE_REQUEST_BLOCK"), smart: flag("ENABLE_SMART_REFRESH"),
  budgetRs: Deno.env.get("MONTHLY_COURT_API_BUDGET") ? Number(Deno.env.get("MONTHLY_COURT_API_BUDGET")) : null,
  stop: flag("STOP_API_ON_BUDGET_LIMIT"), timeoutMs: Math.min(30000, Math.max(3000, Number(Deno.env.get("COURT_API_TIMEOUT_MS") ?? 15000)))
});
const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);
const istMonth = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
const addHours = (h: number) => new Date(Date.now() + h * 36e5).toISOString();

async function apiKey(admin: any): Promise<string> {
  const e = Deno.env.get("COURT_API_KEY"); if (e) return e;
  const { data } = await admin.rpc("court_api_key"); return (data as string) || "";
}
async function settings(admin: any) {
  const { data } = await admin.from("api_budget_settings").select("*").eq("provider_key", PROVIDER).maybeSingle();
  const { data: prov } = await admin.from("court_providers").select("*").eq("key", PROVIDER).maybeSingle();
  return { b: data ?? {}, prov: prov ?? { enabled: true } };
}
const cfgOf = (b: any) => ({ upcomingHours: b.upcoming_hours ?? DEFAULTS.upcomingHours, activeHours: b.active_hours ?? DEFAULTS.activeHours, inactiveHours: b.inactive_hours ?? DEFAULTS.inactiveHours,
  closedHours: b.closed_hours ?? DEFAULTS.closedHours, maxAgeHours: b.max_age_hours ?? DEFAULTS.maxAgeHours });

// ---------- the one place that talks to the provider ----------
type Reply = { status: number; code: string; data: any; ms: number; retryAfter: number; etag: string };
async function call(admin: any, method: "GET" | "POST", path: string, key: string, opts: { etag?: string } = {}): Promise<Reply> {
  const E = env(), t0 = Date.now(), ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), E.timeoutMs);
  try {
    const headers: Record<string, string> = { Authorization: "Bearer " + key, Accept: "application/json" };
    if (opts.etag) headers["If-None-Match"] = opts.etag;
    const r = await fetch(E.base + path, { method, headers, signal: ctl.signal });
    const text = await r.text(); let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    const code = String(data?.error?.code ?? data?.code ?? "");
    return { status: r.status, code, data, ms: Date.now() - t0, retryAfter: Number(r.headers.get("retry-after") ?? 0), etag: r.headers.get("etag") ?? "" };
  } catch { return { status: 0, code: "NETWORK", data: null, ms: Date.now() - t0, retryAfter: 0, etag: "" }; }
  finally { clearTimeout(timer); }
}
// Retries only what is safe: a rate-limited or failed GET was not billed and not executed. A POST (refresh) is retried only after a 429,
// which means the request was rejected before running; it is never retried after a timeout or a 5xx, because it may have run and been billed.
async function callRetry(admin: any, method: "GET" | "POST", path: string, key: string, opts: { etag?: string } = {}): Promise<Reply> {
  let r = await call(admin, method, path, key, opts);
  for (let i = 0; i < 2; i++) {
    const c = classifyHttp(r.status, r.code);
    if (!c.retry || (method === "POST" && r.status !== 429)) break;
    await new Promise((ok) => setTimeout(ok, backoffMs(i, r.retryAfter)));
    r = await call(admin, method, path, key, opts);
  }
  return r;
}
async function health(admin: any, r: Reply, msg = "") {
  const ok = r.status >= 200 && r.status < 300;
  await admin.from("provider_health_logs").insert({ provider_key: PROVIDER, ok, latency_ms: r.ms, status_code: r.status, message: scrub(msg || r.code) });
  if (ok) { await admin.from("court_providers").update({ circuit_open_until: null, updated_at: nowIso() }).eq("key", PROVIDER).not("circuit_open_until", "is", null); return; }
  const c = classifyHttp(r.status, r.code);
  const { count } = await admin.from("provider_health_logs").select("id", { count: "exact", head: true }).eq("provider_key", PROVIDER).eq("ok", false).gte("checked_at", addHours(-0.25));
  if (c.open || shouldOpenCircuit(count ?? 0, 5)) await admin.from("court_providers").update({ circuit_open_until: addHours(c.open ? 1 : 0.17), updated_at: nowIso() }).eq("key", PROVIDER);
}
const usage = (admin: any, row: any) => admin.from("api_usage_logs").insert({ provider_key: PROVIDER, ...row });
const vlog = (admin: any, row: any) => admin.from("verification_logs").insert({ provider_key: PROVIDER, retrieved_at: row.outcome === "ok" ? nowIso() : null, ...row, message: scrub(row.message ?? "") });

// ---------- registering a firm's case ----------
const caseState = (s: string) => /dispos|archiv/i.test(s ?? "") ? "closed" : "active";
async function register(admin: any, firmId: string, rec: any) {
  const cnr = normalizeCnr(rec.cnr ?? ""), kind = rec.idKind ?? "cnr", info = cnr ? classifyCnr(cnr) : { category: rec.category ?? "district" };
  const row = { firm_id: firmId, record_id: rec.id, identifier_kind: ["cnr", "case_number", "filing_number", "diary_number"].includes(kind) ? kind : "cnr", cnr,
    case_number: rec.no ?? "", filing_number: rec.filingNo ?? "", diary_number: rec.diaryNo ?? "", category: (info as any).category === "unknown" ? (rec.category ?? "district") : (info as any).category,
    tribunal: (info as any).tribunal ?? rec.tribunal ?? "", court_name: rec.court ?? "", title: rec.title ?? "", state: caseState(rec.status) };
  const { data: ex } = await admin.from("legal_cases").select("*").eq("firm_id", firmId).eq("record_id", rec.id).maybeSingle();
  if (ex) {
    const patch: any = {}; for (const k of ["cnr", "case_number", "filing_number", "diary_number", "identifier_kind", "category", "tribunal"]) if ((row as any)[k] !== ex[k]) patch[k] = (row as any)[k];
    if (row.state !== ex.state) patch.state = row.state;
    if (patch.cnr !== undefined) { patch.verification_status = "PENDING"; patch.next_check_at = nowIso(); patch.attempts = 0; }
    if (Object.keys(patch).length) { const { data } = await admin.from("legal_cases").update(patch).eq("id", ex.id).select("*").single(); return data; }
    return ex;
  }
  const { data, error } = await admin.from("legal_cases").insert(row).select("*").single();
  if (error) { // two requests for the same new case can arrive together: the unique (firm_id, record_id) key lets one win; the other reads its row
    const { data: again } = await admin.from("legal_cases").select("*").eq("firm_id", firmId).eq("record_id", rec.id).maybeSingle(); if (again) return again; throw new Error(error.message); }
  return data;
}
async function caseRecord(admin: any, firmId: string, id: string) {
  const { data } = await admin.from("records").select("data").eq("firm_id", firmId).eq("kind", "case").eq("id", id).maybeSingle(); return data?.data ? { ...data.data, id } : null;
}

// ---------- writing the result back into the app's own records ----------
async function applyToRecords(admin: any, firmId: string, rec: any, n: any, events: any[], lc: any) {
  const rows: any[] = [], stamp = nowIso(), id = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const logIt = (x: string) => rows.push({ firm_id: firmId, kind: "log", id: id("g"), data: { id: id("g"), ts: stamp.slice(0, 10) + " " + stamp.slice(11, 16), x, caseId: rec.id, by: "Court record" } });
  if (n.nextHearing && n.nextHearing >= today()) {
    const { data: ex } = await admin.from("records").select("id").eq("firm_id", firmId).eq("kind", "hearing").eq("data->>caseId", rec.id).eq("data->>date", n.nextHearing).limit(1);
    if (!ex?.length) { const hid = id("h"); rows.push({ firm_id: firmId, kind: "hearing", id: hid, data: { id: hid, caseId: rec.id, date: n.nextHearing, time: "10:30", court: rec.court ?? n.court ?? "", item: "", purpose: rec.purpose ?? "Hearing", assignee: (rec.team ?? [])[0] ?? "", outcome: "", brief: false, fromCourt: true, created: stamp } }); logIt(`Court record: next hearing ${n.nextHearing} added (${lc.source_provider || "provider"})`); }
  }
  for (const o of n.orders ?? []) {
    const { data: ex } = await admin.from("records").select("id").eq("firm_id", firmId).eq("kind", "order").eq("data->>caseId", rec.id).eq("data->>date", o.date).limit(1);
    if (ex?.length) continue;
    const oid = id("o"), txt = `${o.type} listed on the court record.`;
    rows.push({ firm_id: firmId, kind: "order", id: oid, data: { id: oid, caseId: rec.id, date: o.date, source: "Court record · " + stamp.slice(0, 10), official: true, file: o.file || "From court record", cause: rec.no ?? "", paras: [], points: [txt], summary: txt + (n.nextHearing ? ` Next date: ${n.nextHearing}.` : ""), nextDate: n.nextHearing ?? "", nextFrom: "court record", confirmed: !!n.nextHearing && n.nextHearing >= today(), created: stamp } });
    logIt(`Court record: order of ${o.date} added`);
  }
  if (events.some((e) => e.kind === "case_disposed") && rec.status !== "disposed") {
    await admin.from("records").update({ data: { ...rec, id: undefined, status: "disposed" } }).eq("firm_id", firmId).eq("kind", "case").eq("id", rec.id); logIt("Court record: case marked Disposed");
  }
  if (rows.length) await admin.from("records").upsert(rows, { onConflict: "firm_id,kind,id" });
}

// ---------- the pipeline ----------
type Out = { status: string; source: string; note: string; cached?: boolean; blocked?: boolean; normalized?: any; events?: any[]; checkedAt?: string; links?: any[]; freshness?: string; changed?: boolean };
async function verify(admin: any, firmId: string, rec: any, o: { fresh?: boolean; actor?: string | null; persist?: boolean } = {}): Promise<Out> {
  const E = env(), { b, prov } = await settings(admin), cfg = cfgOf(b), lc = await register(admin, firmId, rec);
  const info = { category: lc.category, tribunal: lc.tribunal || undefined }, links = E.official ? portalLinks(info).map((x: any) => ({ label: x[0], url: x[1] })) : [];
  const done = async (patch: any, out: Partial<Out>, log: any) => {
    await admin.from("legal_cases").update(patch).eq("id", lc.id);
    await vlog(admin, { firm_id: firmId, case_id: lc.id, operation: "verify", actor: o.actor ?? null, ...log });
    return { source: patch.source_provider ?? lc.source_provider, checkedAt: patch.last_checked_at ?? lc.last_checked_at, links, ...out } as Out;
  };
  const manual = (note: string, outcome = "manual") => done({ verification_status: STATUS.MANUAL, verification_note: note, last_checked_at: nowIso(), next_check_at: addHours(intervalHours({ ...lc, state: "inactive" }, cfg)) },
    { status: STATUS.MANUAL, note }, { outcome, status: STATUS.MANUAL, message: note });

  // identifiers this engine can look up
  if (lc.identifier_kind !== "cnr" || !lc.cnr) return manual("This case is registered by " + lc.identifier_kind.replace("_", " ") + ". Automated lookup needs a CNR (tribunals: the CNR minted for the case). Verify it on the official portal.");
  if (!cnrValid(lc.cnr)) return manual("The CNR is not valid. Check it against the court's order sheet.");
  const cap = capability(PROVIDER, info, "case_detail");
  if (!cap.supported) return manual(cap.reason || "No provider covers this court yet. Verify it on the official portal.");

  const maxAge = cfg.maxAgeHours, age = hoursSince(lc.last_verified_at);
  const ready = ["VERIFIED", "PARTIAL"].includes(lc.verification_status);
  // 2. what we already hold
  if (!o.fresh && ready && age <= maxAge) { await usage(admin, { endpoint: "case_detail", request_key: requestKey(PROVIDER, "case_detail", lc.cnr), firm_id: firmId, case_id: lc.id, cached: true });
    await vlog(admin, { firm_id: firmId, case_id: lc.id, operation: "verify", outcome: "cached", status: lc.verification_status, message: "Recent verified record reused", actor: o.actor ?? null });
    return { status: lc.verification_status, source: lc.source_provider, note: "Verified record from " + new Date(lc.last_verified_at).toISOString().slice(0, 16).replace("T", " ") + " UTC reused", cached: true, checkedAt: lc.last_verified_at, freshness: freshnessLabel(lc.last_verified_at, Date.now(), maxAge), links }; }
  if (o.fresh && lc.last_checked_at && hoursSince(lc.last_checked_at) * 60 < DEFAULTS.freshCooldownMinutes) return { status: lc.verification_status, source: lc.source_provider, note: `Checked ${Math.round(hoursSince(lc.last_checked_at) * 60)} minutes ago; please wait before asking again`, cached: true, checkedAt: lc.last_checked_at, links };

  // 3. the paid provider
  if (!E.paid || !prov.enabled) return manual("Automated court-record checks are switched off. Verify on the official portal.");
  if (circuitState(0, prov.circuit_open_until) === "open") return done({ verification_status: ready ? STATUS.STALE : lc.verification_status, verification_note: "The court-data provider is paused after repeated failures; it will be tried again shortly", next_check_at: addHours(1) },
    { status: ready ? STATUS.STALE : STATUS.FAILED, note: "The court-data provider is paused after repeated failures; it will be tried again shortly" }, { outcome: "blocked", status: STATUS.FAILED, message: "circuit open" });
  const key = await apiKey(admin);
  if (!key) return manual("No court-data provider key is configured. Verify on the official portal, or ask the administrator to connect a provider.");

  const rk = requestKey(PROVIDER, "case_detail", lc.cnr);
  let payload: any = null, fromCache = false, refreshSent = false;
  if (E.cache && !o.fresh) { const { data: c } = await admin.from("api_response_cache").select("payload,fetched_at").eq("request_key", rk).gt("expires_at", nowIso()).maybeSingle(); if (c) { payload = c.payload; fromCache = true; } }
  if (!payload) {
    if (E.dedupe) { const { data: got } = await admin.rpc("court_claim", { p_key: rk, p_ttl: 90 }); if (got !== true) { await vlog(admin, { firm_id: firmId, case_id: lc.id, operation: "verify", outcome: "deduped", status: lc.verification_status, message: "An identical request is already running", actor: o.actor ?? null });
      return { status: lc.verification_status, source: lc.source_provider, note: "A check for this case is already running. Try again in a minute.", cached: true, checkedAt: lc.last_checked_at, links }; } }
    try {
      const staleHearing = lc.next_hearing_date && lc.next_hearing_date < today() && lc.state === "active";
      const recentRefresh = !!lc.refresh_requested_at && hoursSince(lc.refresh_requested_at) < 0.25, wantRefresh = E.smart && !recentRefresh && (o.fresh || staleHearing), plan = b.plan ?? "payg"; // a refresh is queued and billed on its own, so never send a second one while the first may still be running
      const need = costPaise(plan, "case_detail") + (wantRefresh ? costPaise(plan, "refresh") : 0);
      const { data: res } = await admin.rpc("court_budget_reserve", { p_provider: PROVIDER, p_endpoint: "case_detail", p_cost: need, p_limit_override: E.budgetRs != null ? Math.round(E.budgetRs * 100) : null });
      if (!res?.allow) { const note = "The monthly court-data budget is used up. An administrator can raise it or authorise an override.";
        return await done({ verification_status: ready ? STATUS.STALE : lc.verification_status, verification_note: note, next_check_at: addHours(6) }, { status: ready ? STATUS.STALE : STATUS.PENDING, note, blocked: true }, { outcome: "blocked", status: STATUS.PENDING, message: "budget" }); }
      let spentRefresh = false;
      if (wantRefresh) { const rr = await callRetry(admin, "POST", `/api/partner/case/${encodeURIComponent(lc.cnr)}/refresh`, key); spentRefresh = rr.status >= 200 && rr.status < 300; refreshSent = spentRefresh;
        await usage(admin, { endpoint: "refresh", request_key: rk + "|refresh", firm_id: firmId, case_id: lc.id, http_status: rr.status, billable: spentRefresh, cost_paise: spentRefresh ? costPaise(plan, "refresh") : 0, latency_ms: rr.ms });
        if (!spentRefresh) await admin.rpc("court_budget_refund", { p_provider: PROVIDER, p_endpoint: "case_detail", p_cost: costPaise(plan, "refresh") }); }
      const r = await callRetry(admin, "GET", `/api/partner/case/${encodeURIComponent(lc.cnr)}`, key);
      const okR = r.status >= 200 && r.status < 300, good = okR && !!r.data;
      await usage(admin, { endpoint: "case_detail", request_key: rk, firm_id: firmId, case_id: lc.id, http_status: r.status, billable: good, cost_paise: good ? costPaise(plan, "case_detail") : 0, latency_ms: r.ms });
      await health(admin, r);
      if (!good) { await admin.rpc("court_budget_refund", { p_provider: PROVIDER, p_endpoint: "case_detail", p_cost: costPaise(plan, "case_detail") });
        const c = classifyHttp(r.status, r.code), attempts = (lc.attempts ?? 0) + 1;
        if (c.kind === "not_found" && (lc.attempts ?? 0) < 3 && E.smart && !(lc.refresh_requested_at && hoursSince(lc.refresh_requested_at) < 0.25)) {
          // The provider documents that a refresh on a valid CNR it does not hold yet fetches it from the official source. The refresh is queued (typically 2 to 10 minutes), so look again later.
          const rc = costPaise(plan, "refresh"), { data: rs } = await admin.rpc("court_budget_reserve", { p_provider: PROVIDER, p_endpoint: "refresh", p_cost: rc, p_limit_override: E.budgetRs != null ? Math.round(E.budgetRs * 100) : null });
          if (rs?.allow) { const rr = await callRetry(admin, "POST", `/api/partner/case/${encodeURIComponent(lc.cnr)}/refresh`, key), good2 = rr.status >= 200 && rr.status < 300;
            await usage(admin, { endpoint: "refresh", request_key: rk + "|refresh", firm_id: firmId, case_id: lc.id, http_status: rr.status, billable: good2, cost_paise: good2 ? rc : 0, latency_ms: rr.ms });
            if (good2) { const note = "Not held by the provider yet: it was asked to fetch the case from the official source. Checking again in about 10 minutes.";
              return await done({ verification_status: STATUS.PENDING, verification_note: note, attempts, last_checked_at: nowIso(), refresh_requested_at: nowIso(), next_check_at: addHours(0.17) }, { status: STATUS.PENDING, note }, { outcome: "ok", status: STATUS.PENDING, message: "refresh requested for an unknown CNR" }); }
            await admin.rpc("court_budget_refund", { p_provider: PROVIDER, p_endpoint: "refresh", p_cost: rc }); }
        }
        if (c.manual) return await manual(c.message, "failed");
        await admin.from("court_jobs").insert({ case_id: lc.id, firm_id: firmId, reason: "retry", status: attempts >= 5 ? "dead" : "queued", attempts, run_after: addHours(Math.min(24, 2 ** attempts / 2)), last_error: scrub(c.message) }).then(() => {}, () => {}); // one open job per case (unique index): a second insert is ignored
        return await done({ verification_status: ready ? STATUS.STALE : STATUS.FAILED, verification_note: c.message, attempts, last_checked_at: nowIso(), next_check_at: addHours(Math.min(24, 2 ** attempts / 2)) },
          { status: ready ? STATUS.STALE : STATUS.FAILED, note: c.message }, { outcome: "failed", status: STATUS.FAILED, message: c.message + " (" + r.status + ")" }); }
      payload = r.data;
      if (E.cache) await admin.from("api_response_cache").upsert({ request_key: rk, provider_key: PROVIDER, payload, etag: r.etag, fetched_at: nowIso(), expires_at: addHours(Math.max(1, maxAge / 2)) });
    } finally { if (E.dedupe) await admin.rpc("court_release", { p_key: rk }); }
  }

  // 4. the record must belong to this case
  const n = normalizeCase(payload), m = matchesIdentifiers(lc, n);
  if (n.empty) { await admin.rpc("court_budget_refund", { p_provider: PROVIDER, p_endpoint: "case_detail", p_cost: costPaise(b.plan ?? "payg", "case_detail") }).then(() => {}, () => {}); return await manual("The provider returned no data for this CNR. Verify it on the official portal."); }
  if (!m.ok) return await manual("The returned record does not match this case: " + m.reasons.join("; ") + ". It was not attached.");

  // 5. keep it, compare it with the last one, tell people only when something meaningful changed
  const { data: prevRow } = await admin.from("case_snapshots").select("payload").eq("case_id", lc.id).order("taken_at", { ascending: false }).limit(1).maybeSingle();
  const events = diffSnapshots(prevRow?.payload ?? null, n), hash = await sha(JSON.stringify(n));
  const meaningful = events.filter((e) => e.kind !== "first_snapshot");
  if (!prevRow || meaningful.length || (await lastHash(admin, lc.id)) !== hash) await admin.from("case_snapshots").insert({ case_id: lc.id, provider_key: PROVIDER, payload: n, payload_hash: hash });
  const status = verificationStatus({ checkedAt: nowIso(), matched: true, partial: n.partial, maxAgeHours: maxAge }), next = new Date(Date.now() + intervalHours({ state: lc.state, next_hearing_date: n.nextHearing }, cfg) * 36e5).toISOString();
  await admin.from("legal_cases").update({ title: n.title || lc.title, court_name: n.court || lc.court_name, case_type: n.caseType, case_number: n.caseNumber || lc.case_number, filing_date: n.filingDate || null, registration_date: n.registrationDate || null,
    status: n.status, next_hearing_date: n.nextHearing || null, last_hearing_date: n.lastHearing || null, source_provider: PROVIDER, source_url: `${E.base}/api/partner/case/${lc.cnr}`, verification_status: status,
    verification_note: n.partial ? "Missing from the provider: " + n.missing.join(", ") : refreshSent ? "A refresh was requested from the court source; newer data may appear in a few minutes" : "", last_checked_at: nowIso(), last_verified_at: nowIso(), last_changed_at: meaningful.length ? nowIso() : lc.last_changed_at, next_check_at: refreshSent ? addHours(0.17) : next, attempts: 0, ...(refreshSent ? { refresh_requested_at: nowIso() } : {}),
    state: /dispos|decided|closed|dismiss|withdrawn/i.test(n.status) ? "closed" : lc.state === "closed" ? "active" : lc.state }).eq("id", lc.id);
  await upsertDetail(admin, lc.id, n);
  if (meaningful.length) await admin.from("notification_events").insert(meaningful.map((e: any) => ({ firm_id: firmId, case_id: lc.id, kind: e.kind, title: e.title, detail: e.detail })));
  const rec2 = await caseRecord(admin, firmId, rec.id); if (rec2) await applyToRecords(admin, firmId, rec2, n, meaningful, { ...lc, source_provider: PROVIDER });
  await vlog(admin, { firm_id: firmId, case_id: lc.id, operation: "verify", outcome: "ok", status, message: (fromCache ? "From shared cache. " : "") + (meaningful.length ? meaningful.map((e: any) => e.title).join("; ") : "No change"), actor: o.actor ?? null });
  return { status, source: PROVIDER, note: n.partial ? "Missing from the provider: " + n.missing.join(", ") : refreshSent ? "A refresh was requested from the court source; newer data may appear in about 10 minutes" : meaningful.length ? meaningful.map((e: any) => e.title).join("; ") : "No change since the last check", normalized: { title: n.title, caseNo: n.caseNumber, court: n.court, status: n.status, nextDate: n.nextHearing, lastOrderDate: n.lastOrder }, events: meaningful, checkedAt: nowIso(), freshness: "fresh", changed: meaningful.length > 0, cached: fromCache, links };
}
async function sha(s: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
async function lastHash(admin: any, id: string) { const { data } = await admin.from("case_snapshots").select("payload_hash").eq("case_id", id).order("taken_at", { ascending: false }).limit(1).maybeSingle(); return data?.payload_hash; }
async function upsertDetail(admin: any, id: string, n: any) {
  const q = (t: string, rows: any[], c: string) => rows.length ? admin.from(t).upsert(rows, { onConflict: c, ignoreDuplicates: true }) : null;
  await Promise.all([
    q("case_parties", [...n.petitioners.map((x: string) => ({ case_id: id, role: "petitioner", name: x })), ...n.respondents.map((x: string) => ({ case_id: id, role: "respondent", name: x }))], "case_id,role,name"),
    q("case_advocates", [...n.petitionerAdvocates.map((x: string) => ({ case_id: id, side: "petitioner", name: x })), ...n.respondentAdvocates.map((x: string) => ({ case_id: id, side: "respondent", name: x }))], "case_id,side,name"),
    q("case_hearings", n.hearings.map((h: any) => ({ case_id: id, hearing_date: h.date, purpose: h.purpose, judge: h.judge, source: PROVIDER })), "case_id,hearing_date,purpose"),
    q("case_orders", n.orders.map((o: any) => ({ case_id: id, order_date: o.date, order_type: o.type, file_name: o.file, source_url: o.url })), "case_id,order_date,file_name")
  ].filter(Boolean));
}

// ---------- plans, access, scheduling ----------
async function firmActive(admin: any, firmId: string, memo: Record<string, boolean>) {
  if (firmId in memo) return memo[firmId];
  const { data: s } = await admin.from("subscriptions").select("status,renews,trial_ends").eq("firm_id", firmId).maybeSingle();
  return (memo[firmId] = !!s && ((s.status === "trialing" && s.trial_ends && Date.parse(s.trial_ends) > Date.now()) || (!!s.renews && s.renews >= today())));
}
async function registerNew(admin: any, memo: Record<string, boolean>) {
  const { data: recs } = await admin.from("records").select("firm_id,id,data").eq("kind", "case").not("data->>cnr", "is", null).neq("data->>cnr", "").limit(2000);
  const { data: have } = await admin.from("legal_cases").select("firm_id,record_id").limit(20000);
  const seen = new Set((have ?? []).map((x: any) => x.firm_id + "|" + x.record_id)); let n = 0;
  for (const r of recs ?? []) { if (seen.has(r.firm_id + "|" + r.id) || !(await firmActive(admin, r.firm_id, memo))) continue; try { await register(admin, r.firm_id, { ...r.data, id: r.id }); n++; } catch { /* skipped; retried next run */ } }
  return n;
}
async function runDue(admin: any, filter: { firmId?: string; limit: number }) {
  const memo: Record<string, boolean> = {}, { b } = await settings(admin), cfg = cfgOf(b), t = Date.now();
  let q = admin.from("legal_cases").select("*").lte("next_check_at", nowIso()).neq("identifier_kind", "x").order("next_check_at", { ascending: true }).limit(300);
  if (filter.firmId) q = q.eq("firm_id", filter.firmId);
  const { data: due } = await q; const list = (due ?? []).filter((c: any) => !(c.verification_status === "MANUAL REVIEW" && hoursSince(c.last_checked_at) < 168)).sort((a: any, c: any) => byPriority(a, c, t)).slice(0, filter.limit);
  const sum = { considered: due?.length ?? 0, checked: 0, changed: 0, failed: 0, blocked: 0, manual: 0, cached: 0 };
  for (let i = 0; i < list.length; i += 3) {
    await Promise.all(list.slice(i, i + 3).map(async (c: any) => {
      try { if (!(await firmActive(admin, c.firm_id, memo))) return; const rec = await caseRecord(admin, c.firm_id, c.record_id);
        if (!rec) { await admin.from("legal_cases").update({ state: "closed", next_check_at: addHours(720) }).eq("id", c.id); return; }
        const r = await verify(admin, c.firm_id, rec, {}); sum.checked++; if (r.changed) sum.changed++; if (r.blocked) sum.blocked++; if (r.cached) sum.cached++;
        if (r.status === STATUS.FAILED) sum.failed++; if (r.status === STATUS.MANUAL) sum.manual++;
      } catch (e) { sum.failed++; await vlog(admin, { firm_id: c.firm_id, case_id: c.id, operation: "sync", outcome: "failed", status: STATUS.FAILED, message: String((e as Error).message) }); }
    }));
    if (sum.blocked >= 3) break;
  }
  void cfg; return sum;
}

// ---------- administrator views ----------
async function overview(admin: any) {
  const m = istMonth(), { b, prov } = await settings(admin), monthStart = m + "-01T00:00:00Z";
  const [{ data: cost }, { data: cases }, { data: hl }, { data: logs }, { data: dead }, { data: lastOk }, { data: usageRows }, { data: caps }] = await Promise.all([
    admin.from("api_cost_records").select("*").eq("month", m), admin.from("legal_cases").select("verification_status"),
    admin.from("provider_health_logs").select("*").eq("provider_key", PROVIDER).order("checked_at", { ascending: false }).limit(20),
    admin.from("verification_logs").select("id,created_at,firm_id,case_id,operation,outcome,status,message").order("created_at", { ascending: false }).limit(60),
    admin.from("court_jobs").select("id,case_id,attempts,last_error,created_at").eq("status", "dead").limit(50),
    admin.from("verification_logs").select("created_at").eq("outcome", "ok").order("created_at", { ascending: false }).limit(1),
    admin.from("api_usage_logs").select("endpoint,billable,cached,cost_paise,http_status").gte("created_at", monthStart).limit(20000),
    admin.from("provider_capabilities").select("provider_key,category,court_code,operation,supported,verified_at").eq("provider_key", PROVIDER)]);
  const by: Record<string, number> = {}; (cases ?? []).forEach((c: any) => { by[c.verification_status] = (by[c.verification_status] ?? 0) + 1; });
  const spent = (cost ?? []).reduce((a: number, r: any) => a + Number(r.cost_paise), 0), reqs = (cost ?? []).reduce((a: number, r: any) => a + r.requests, 0);
  const u = usageRows ?? [], paid = u.filter((x: any) => x.billable).length, free = u.filter((x: any) => x.cached).length;
  const { count: verifiedMonth } = await admin.from("verification_logs").select("id", { count: "exact", head: true }).eq("outcome", "ok").gte("created_at", monthStart);
  const E = env(), limit = E.budgetRs != null ? E.budgetRs * 100 : Number(b.monthly_budget_paise ?? 100000);
  return { month: m, provider: { key: PROVIDER, enabled: prov.enabled, circuit: circuitState(0, prov.circuit_open_until), circuitOpenUntil: prov.circuit_open_until, keyConfigured: !!(await apiKey(admin)), flags: { official: E.official, paid: E.paid, cache: E.cache, dedupe: E.dedupe, smart: E.smart } },
    budget: { limitPaise: limit, spentPaise: spent, leftPaise: Math.max(0, limit - spent), stop: E.stop && (b.stop_on_limit ?? true), overrideUntil: b.override_until, overrideReason: b.override_reason, plan: b.plan ?? "payg", fromEnv: E.budgetRs != null },
    refresh: { upcomingHours: b.upcoming_hours, activeHours: b.active_hours, inactiveHours: b.inactive_hours, closedHours: b.closed_hours, maxAgeHours: b.max_age_hours },
    totals: { cases: cases?.length ?? 0, byStatus: by, paidRequests: paid, freeChecks: free, requests: reqs, costPerVerifiedPaise: verifiedMonth ? Math.round(spent / verifiedMonth) : 0, verifiedChecksThisMonth: verifiedMonth ?? 0 },
    byEndpoint: (cost ?? []).map((r: any) => ({ endpoint: r.endpoint, requests: r.requests, costPaise: Number(r.cost_paise) })), health: hl ?? [], lastSuccess: lastOk?.[0]?.created_at ?? null, logs: logs ?? [], dead: dead ?? [], capabilities: caps ?? [] };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body: any = await req.json().catch(() => ({})), action = String(body.action ?? "");
    const hdr = req.headers.get("x-cron-secret");
    if (hdr) {
      const { data: okSecret } = await admin.rpc("cron_secret_ok", { s: hdr }); if (okSecret !== true) throw new Fail("Not allowed.", 403);
      if (action === "sync") {
        const memo: Record<string, boolean> = {}, registered = await registerNew(admin, memo), sum = await runDue(admin, { limit: Number(Deno.env.get("COURT_SYNC_BATCH") ?? 40) });
        await vlog(admin, { operation: "sync_run", outcome: "ok", status: "", message: JSON.stringify({ registered, ...sum }) }); return json({ ok: true, registered, ...sum });
      }
      if (action === "health") { const key = await apiKey(admin); if (!key) return json({ ok: false, error: "No key configured" }); const r = await call(admin, "GET", "/api/partner/search/capabilities", key); await health(admin, r); return json({ ok: r.status >= 200 && r.status < 300, status: r.status, ms: r.ms }); }
      throw new Fail("Unknown scheduled action.");
    }
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser(); if (!user) throw new Fail("Sign in again.", 401);

    if (["admin_overview", "admin_update", "rotate_key", "health", "retry_dead"].includes(action)) {
      const { data: isAdmin } = await asUser.rpc("is_platform_admin"); if (isAdmin !== true) throw new Fail("Only a platform administrator can do this.", 403);
      if (action === "admin_overview") return json(await overview(admin));
      if (action === "health") { const key = await apiKey(admin); if (!key) throw new Fail("No court-data key is configured.", 400); const r = await call(admin, "GET", "/api/partner/search/capabilities", key); await health(admin, r); return json({ ok: r.status >= 200 && r.status < 300, status: r.status, ms: r.ms, message: r.status === 401 ? "The provider rejected the key." : "" }); }
      if (action === "rotate_key") {
        const k = String(body.key ?? "").trim(); if (k.length < 12 || k.length > 300 || /\s/.test(k)) throw new Fail("That does not look like an API key.");
        const r = await call(admin, "GET", "/api/partner/search/capabilities", k);
        if (r.status === 401 || r.status === 403) throw new Fail("The provider rejected this key. The old key is still in use.", 400);
        if (r.status === 0) throw new Fail("Could not reach the provider to check the key, so it was not saved. Try again.", 502);
        const { error } = await admin.rpc("court_set_api_key", { p_key: k }); if (error) throw new Fail("Could not store the key.", 500);
        await admin.from("court_providers").update({ circuit_open_until: null, updated_at: nowIso() }).eq("key", PROVIDER);
        await vlog(admin, { operation: "rotate_key", outcome: "ok", status: "", message: "Court-data key replaced", actor: user.id }); return json({ ok: true, checked: r.status >= 200 && r.status < 300 });
      }
      if (action === "retry_dead") { const { data: dj } = await admin.from("court_jobs").select("id,case_id").eq("status", "dead"); for (const j of dj ?? []) { await admin.from("court_jobs").update({ status: "done", finished_at: nowIso() }).eq("id", j.id); await admin.from("legal_cases").update({ next_check_at: nowIso(), attempts: 0, verification_status: "PENDING" }).eq("id", j.case_id); } return json({ ok: true, requeued: dj?.length ?? 0 }); }
      // admin_update: whitelisted fields only
      const p = body.settings ?? {}, patch: any = { updated_at: nowIso() }, num = (v: any, lo: number, hi: number) => { const x = Math.round(Number(v)); if (!isFinite(x) || x < lo || x > hi) throw new Fail("A number is out of range."); return x; };
      if (p.monthlyBudgetRs != null) patch.monthly_budget_paise = num(p.monthlyBudgetRs, 0, 10000000) * 100;
      if (p.stopOnLimit != null) patch.stop_on_limit = !!p.stopOnLimit;
      if (p.plan != null) { if (!["payg", "enterprise"].includes(p.plan)) throw new Fail("Unknown plan."); patch.plan = p.plan; }
      for (const [k, col, lo, hi] of [["upcomingHours", "upcoming_hours", 1, 168], ["activeHours", "active_hours", 1, 720], ["inactiveHours", "inactive_hours", 1, 2160], ["closedHours", "closed_hours", 1, 4320], ["maxAgeHours", "max_age_hours", 1, 720]] as any[]) if (p[k] != null) patch[col] = num(p[k], lo, hi);
      if (p.override) { const hrs = num(p.override.hours, 1, 72), why = String(p.override.reason ?? "").trim(); if (why.length < 5) throw new Fail("Give a reason for the override."); patch.override_until = addHours(hrs); patch.override_by = user.id; patch.override_reason = why.slice(0, 300); }
      if (p.clearOverride) { patch.override_until = null; patch.override_reason = ""; }
      const { error } = await admin.from("api_budget_settings").upsert({ provider_key: PROVIDER, ...patch }); if (error) throw new Fail(scrub(error.message), 500);
      if (p.enabled != null) await admin.from("court_providers").update({ enabled: !!p.enabled, updated_at: nowIso() }).eq("key", PROVIDER);
      await vlog(admin, { operation: "admin_update", outcome: "ok", status: "", message: "Settings changed: " + Object.keys(p).join(", "), actor: user.id }); return json(await overview(admin));
    }

    // member actions
    const firmId = String(body.firm_id ?? ""); if (!firmId) throw new Fail("Missing firm.");
    const { data: member } = await asUser.rpc("is_member", { f: firmId }); if (!member) throw new Fail("You are not a member of this firm.", 403);
    const { data: access } = await asUser.rpc("firm_access", { f: firmId }); if (!access) throw new Fail("Your plan has ended. Subscribe to check court records.", 402);
    const { count: recent } = await admin.from("verification_logs").select("id", { count: "exact", head: true }).eq("firm_id", firmId).not("actor", "is", null).gte("created_at", addHours(-1));
    if ((recent ?? 0) >= 120) throw new Fail("Too many manual checks in the last hour. Try again later.", 429);

    if (action === "verify") {
      const rec = await caseRecord(admin, firmId, String(body.case_id ?? "")); if (!rec) throw new Fail("Case not found.", 404);
      return json(await verify(admin, firmId, rec, { fresh: !!body.fresh, actor: user.id }));
    }
    if (action === "sync_firm") return json({ ok: true, ...(await runDue(admin, { firmId, limit: 15 })) });
    if (action === "retry") { const rec = await caseRecord(admin, firmId, String(body.case_id ?? "")); if (!rec) throw new Fail("Case not found.", 404); const lc = await register(admin, firmId, rec); await admin.from("legal_cases").update({ attempts: 0, next_check_at: nowIso() }).eq("id", lc.id); return json(await verify(admin, firmId, rec, { fresh: false, actor: user.id })); }
    if (action === "peek") { // a CNR typed into "Import by CNR": the same cache, de-duplication and budget, but nothing is stored against a case
      const cnr = normalizeCnr(body.cnr ?? ""); if (!cnrValid(cnr)) throw new Fail("A CNR has 4 letters followed by 12 digits.");
      const info = classifyCnr(cnr), cap = capability(PROVIDER, info, "case_detail"); if (!cap.supported) return json({ status: STATUS.MANUAL, note: cap.reason, links: portalLinks(info).map((x: any) => ({ label: x[0], url: x[1] })) }, 200);
      const key = await apiKey(admin); if (!key) return json({ status: STATUS.MANUAL, note: "No court-data provider is connected yet.", configured: false }, 200);
      const rk = requestKey(PROVIDER, "case_detail", cnr), { data: c } = await admin.from("api_response_cache").select("payload").eq("request_key", rk).gt("expires_at", nowIso()).maybeSingle(); let payload = c?.payload;
      if (!payload) {
        const { b } = await settings(admin), E = env(), { data: res } = await admin.rpc("court_budget_reserve", { p_provider: PROVIDER, p_endpoint: "case_detail", p_cost: costPaise(b.plan ?? "payg", "case_detail"), p_limit_override: E.budgetRs != null ? Math.round(E.budgetRs * 100) : null });
        if (!res?.allow) return json({ status: STATUS.PENDING, note: "The monthly court-data budget is used up.", blocked: true });
        const r = await callRetry(admin, "GET", `/api/partner/case/${encodeURIComponent(cnr)}`, key), good = r.status >= 200 && r.status < 300 && !!r.data;
        await usage(admin, { endpoint: "case_detail", request_key: rk, firm_id: firmId, http_status: r.status, billable: good, cost_paise: good ? costPaise(b.plan ?? "payg", "case_detail") : 0, latency_ms: r.ms }); await health(admin, r);
        if (!good) { await admin.rpc("court_budget_refund", { p_provider: PROVIDER, p_endpoint: "case_detail", p_cost: costPaise(b.plan ?? "payg", "case_detail") }); const cl = classifyHttp(r.status, r.code); return json({ status: cl.manual ? STATUS.MANUAL : STATUS.FAILED, note: cl.message }); }
        payload = r.data; if (E.cache) await admin.from("api_response_cache").upsert({ request_key: rk, provider_key: PROVIDER, payload, fetched_at: nowIso(), expires_at: addHours(12) });
      }
      const n = normalizeCase(payload); if (n.empty || (n.cnr && n.cnr !== cnr)) return json({ status: STATUS.MANUAL, note: "The provider returned no matching record." });
      return json({ status: n.partial ? STATUS.PARTIAL : STATUS.VERIFIED, source: PROVIDER, title: n.title, caseNo: n.caseNumber, court: n.court, nextDate: n.nextHearing, lastOrderDate: n.lastOrder, caseStatus: n.status });
    }
    throw new Fail("Unknown request.");
  } catch (e) {
    const err = e instanceof Fail ? e : new Fail("Something went wrong on the server.", 500); if (!(e instanceof Fail)) console.error(scrub((e as Error)?.message ?? e));
    return json({ error: scrub(err.message) }, err.status);
  }
});

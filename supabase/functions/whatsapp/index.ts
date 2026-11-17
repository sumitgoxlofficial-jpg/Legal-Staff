// Legal Staff — WhatsApp Cloud API (Meta) connection. Official Graph API only: no BSP, no third-party provider.
// Deploy with JWT verification OFF (Meta's webhook calls carry no Supabase JWT); every other route checks the caller itself.
//
// Routes (also reachable as /api/whatsapp/... through the vercel.json rewrite). Admin routes need a signed-in user whose verified
// email is in public.super_admins; GET/POST /webhook is public but only answers Meta (verify token, then X-Hub-Signature-256).
//   GET  /connection/status          saved settings, secret presence (never values), token and webhook health, error history
//   POST /connection/save            { app_id, waba_id, phone_number_id, graph_version, app_secret?, access_token?, verify_token? }
//   POST /connection/test            checks the token, permissions, WABA, phone number, webhook subscription against Meta
//   POST /connection/refresh-token   re-reads the token's validity, expiry and scopes (debug_token)
//   POST /connection/disconnect      { confirm: true } removes Legal Staff's stored credentials. Never touches the number at Meta.
//   GET  /phone-number               live details of the configured number from Meta
//   GET  /templates                  approved message templates of the WABA
//   POST /send-test                  { to, template, language, variables[] } one template message through the Cloud API
//   POST /webhook/subscribe          { confirm: true, override_callback?: bool } subscribes this app to the WABA's events
//   POST /health                     scheduled check (x-cron-secret): token, number, alert email to the administrators
// Secrets live in Supabase Vault (wa_app_secret, wa_access_token, wa_verify_token). They are never returned, logged, or put in an
// error message: scrub() runs over everything that leaves this function or is stored in the error history.
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as W from "../_shared/whatsapp-logic.js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }
const SITE = (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "");
const GRAPH = () => (Deno.env.get("WHATSAPP_GRAPH_URL") ?? "https://graph.facebook.com").replace(/\/+$/, "");   // WHATSAPP_GRAPH_URL: tests only
const nowIso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type SecretKey = "app_secret" | "access_token" | "verify_token";

async function cfgRow(admin: any) { const { data } = await admin.from("whatsapp_config").select("*").eq("id", 1).maybeSingle(); return data ?? { id: 1, graph_version: W.DEFAULT_GRAPH_VERSION, status: "not_configured", token_scopes: [], webhook_fields: [] }; }
async function cfgSet(admin: any, patch: Record<string, unknown>, actor?: string) { await admin.from("whatsapp_config").update({ ...patch, ...(actor ? { updated_by: actor } : {}), updated_at: nowIso() }).eq("id", 1); }
async function secret(admin: any, k: SecretKey): Promise<string> { const { data } = await admin.rpc("wa_secret_get", { p_name: W.SECRET_NAMES[k] }); return (data as string) || ""; }
async function secretsPresent(admin: any) {
  const { data } = await admin.rpc("wa_secret_status"); const has = (n: string) => !!(data ?? []).find((r: any) => r.name === n)?.present;
  return { app_secret: has("wa_app_secret"), access_token: has("wa_access_token"), verify_token: has("wa_verify_token") };
}
async function audit(admin: any, actor: string, action: string, detail: Record<string, unknown> = {}) { await admin.from("whatsapp_audit_log").insert({ actor, action, detail }); }
async function logError(admin: any, action: string, endpoint: string, e: any, secrets: string[]) {
  try { await admin.from("whatsapp_api_errors").insert({ action, endpoint: endpoint.slice(0, 120), http_status: e.status, code: e.code || null, subcode: e.subcode || null, kind: e.kind, message: W.scrub(e.message + (e.detail ? " [" + e.detail + "]" : ""), secrets).slice(0, 500), fbtrace_id: e.fbtrace_id }); } catch { /* history is best effort */ }
}

// ---------- the one place that talks to Meta ----------
type Reply = { ok: boolean; status: number; data: any; err?: any };
async function graph(admin: any, cfg: any, auth: string, method: "GET" | "POST", path: string, o: { action: string; query?: Record<string, string>; body?: unknown; secrets?: string[] }): Promise<Reply> {
  const u = new URL(`${GRAPH()}/${cfg.graph_version || W.DEFAULT_GRAPH_VERSION}${path}`); for (const [k, v] of Object.entries(o.query ?? {})) u.searchParams.set(k, v);
  for (let attempt = 0; ; attempt++) {
    let status = 0, data: any = null, retryAfter = 0; const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(u, { method, headers: { Authorization: "Bearer " + auth, Accept: "application/json", ...(o.body ? { "Content-Type": "application/json" } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined, signal: ctl.signal });
      status = r.status; retryAfter = Number(r.headers.get("retry-after") ?? 0); const text = await r.text(); try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    } catch { status = 0; } finally { clearTimeout(timer); }
    if (status >= 200 && status < 300 && !data?.error) return { ok: true, status, data };
    const err = W.classifyGraphError(status, data);
    if (method === "GET" && err.retryable && attempt < 2) { await sleep(W.backoffMs(attempt, retryAfter)); continue; }   // reads only: a send is never repeated
    await logError(admin, o.action, path, err, o.secrets ?? [auth]);
    return { ok: false, status, data, err };
  }
}

// ---------- who is calling ----------
async function requireAdmin(req: Request, url: string, admin: any): Promise<string> {
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asUser.auth.getUser(); if (!user) throw new Fail("Sign in again.", 401);
  const email = String(user.email ?? "").toLowerCase(), { data: ok } = await admin.from("super_admins").select("email").eq("email", email).maybeSingle();
  if (!ok || !user.email_confirmed_at) throw new Fail("Only Legal Staff administrators can manage the WhatsApp connection.", 403);
  return email;
}
async function isCron(req: Request, admin: any) {
  const cron = Deno.env.get("CRON_SECRET"), hdr = req.headers.get("x-cron-secret"); if (!hdr) return false;
  if (cron && W.safeEqual(hdr, cron)) return true; const { data } = await admin.rpc("cron_secret_ok", { s: hdr }); return data === true;
}

// ---------- what the browser may see ----------
async function publicStatus(admin: any, req?: Request) {
  const c = await cfgRow(admin), sec = await secretsPresent(admin), nowMs = Date.now();
  const [errs, msgs, logs] = await Promise.all([
    admin.from("whatsapp_api_errors").select("at,action,endpoint,http_status,code,kind,message,fbtrace_id").order("at", { ascending: false }).limit(20),
    admin.from("whatsapp_messages").select("kind,to_masked,template,language,status,wamid,error_code,error_message,created_at,delivered_at,read_at").order("created_at", { ascending: false }).limit(15),
    admin.from("whatsapp_audit_log").select("at,actor,action,detail").order("at", { ascending: false }).limit(12)]);
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  return {
    config: { app_id: c.app_id ?? "", waba_id: c.waba_id ?? "", phone_number_id: c.phone_number_id ?? "", graph_version: c.graph_version, status: c.status, status_detail: c.status_detail ?? "",
      display_phone_number: c.display_phone_number ?? "", verified_name: c.verified_name ?? "", quality_rating: c.quality_rating ?? "", last_checked_at: c.last_checked_at ?? null, connected_at: c.connected_at ?? null, updated_by: c.updated_by ?? "", updated_at: c.updated_at ?? null },
    secrets: sec,
    token: { valid: c.token_valid ?? null, type: c.token_type ?? "", expires_at: c.token_expires_at ?? null, scopes: c.token_scopes ?? [], checked_at: c.token_checked_at ?? null, replaced_at: c.token_replaced_at ?? null,
      health: sec.access_token ? W.tokenHealth(c.token_valid == null ? null : { is_valid: c.token_valid, expires_at: c.token_expires_at ? Date.parse(c.token_expires_at) / 1000 : 0 }, nowMs) : { state: "none", daysLeft: null } },
    webhook: { callback_url: `${base}/functions/v1/whatsapp/webhook`, verified_at: c.webhook_verified_at ?? null, subscribed_app: c.webhook_subscribed_app ?? null, fields: c.webhook_fields ?? [], required_fields: W.WEBHOOK_FIELDS,
      last_event_at: c.last_webhook_at ?? null, last_event: c.last_webhook_event ?? "", health: W.webhookHealth({ verifiedAt: c.webhook_verified_at, lastEventAt: c.last_webhook_at, subscribedApp: c.webhook_subscribed_app, nowMs }) },
    required_scopes: W.REQUIRED_SCOPES, errors: errs.data ?? [], messages: msgs.data ?? [], audit: logs.data ?? [],
    legacy_number_in_use: !!(Deno.env.get("WHATSAPP_TOKEN") && Deno.env.get("WHATSAPP_PHONE_ID"))   // the existing function-secret number keeps working until this connection is Connected
  };
}

// ---------- alerts ----------
async function alertAdmins(admin: any, c: any, headline: string, lines: string[]) {
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM"); if (!key || !from) return;
  const to = new Set<string>((((await admin.from("super_admins").select("email")).data ?? []) as any[]).map((r) => r.email)); const { data: ps } = await admin.from("pay_settings").select("alert_email").eq("id", 1).maybeSingle(); if (ps?.alert_email) to.add(String(ps.alert_email).toLowerCase());
  if (!to.size) return;
  const text = [headline, "", ...lines, "", `Open: ${SITE}/admin#settings/whatsapp`, "Legal Staff never emails tokens. Replace the token only on that page."].join("\n");
  try { await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [...to], subject: "Legal Staff · " + headline, text }) }); await cfgSet(admin, { last_alert_at: nowIso() }); } catch { /* best effort */ }
}

// ---------- the connection test ----------
type Check = { key: string; label: string; ok: boolean; level: "ok" | "warn" | "fail" | "skipped"; detail: string };
async function runChecks(admin: any, actor: string, action: string) {
  const c = await cfgRow(admin), token = await secret(admin, "access_token"), appSecret = await secret(admin, "app_secret"), sec = [token, appSecret], checks: Check[] = [];
  const add = (key: string, label: string, ok: boolean, detail: string, level?: Check["level"]) => checks.push({ key, label, ok, level: level ?? (ok ? "ok" : "fail"), detail: W.scrub(detail, sec) });
  const missing = [["App ID", c.app_id], ["WABA ID", c.waba_id], ["Phone Number ID", c.phone_number_id], ["System User access token", token], ["App Secret", appSecret]].filter(([, v]) => !v).map(([n]) => n);
  let health: any = { state: "unknown" }, phone: any = null, subscribedApp: boolean | null = null, fields: string[] = [];
  if (missing.length) { add("config", "Configuration", false, "Missing: " + missing.join(", ") + ". Save the configuration first."); }
  else {
    add("config", "Configuration", true, "All required values are saved.");
    const appTok = `${c.app_id}|${appSecret}`;
    // 1 + 2: the token itself, and what it may do
    const dbg = await graph(admin, c, appTok, "GET", "/debug_token", { action, query: { input_token: token }, secrets: sec });
    const d = dbg.data?.data;
    if (!dbg.ok) add("token", "Access token", false, dbg.err.kind === "auth" ? "Meta rejected the App ID / App Secret pair, so the token could not be checked. Re-enter the App Secret from App settings › Basic." : dbg.err.message);
    else if (!d || d.is_valid === false) { health = { state: "invalid" }; add("token", "Access token", false, "The token is not valid" + (d?.error?.message ? ": " + String(d.error.message).slice(0, 160) : "") + ". Generate a new System User token and replace it here."); }
    else if (String(d.app_id) !== String(c.app_id)) add("token", "Access token", false, "This token belongs to a different Meta app. Generate it for the app whose ID is saved here.");
    else {
      health = W.tokenHealth(d);
      const typ = String(d.type ?? ""), temp = typ !== "SYSTEM_USER";
      add("token", "Access token", health.state === "ok" || health.state === "expiring", health.state === "expired" ? "The token has expired." : `Valid ${typ ? "(" + typ.toLowerCase().replace("_", " ") + ")" : ""}${health.permanent ? ", does not expire" : ", expires in " + health.daysLeft + " days"}.` + (temp ? " This is not a System User token: replace it before going live." : ""), health.state === "expiring" || (temp && (health.state === "ok")) ? "warn" : undefined);
      const p = W.permissionCheck(d, c.waba_id);
      add("permissions", "Required permissions", p.ok, p.ok ? "whatsapp_business_messaging and whatsapp_business_management are granted." : (p.missing.length ? "Missing: " + p.missing.join(", ") + ". " : "") + (p.noAccess.length ? "The token has no access to this WhatsApp Business Account for: " + p.noAccess.join(", ") + ". Assign the account to the System User. " : "") + "Generate the token again with both permissions.");
      c.token_scopes = d.scopes ?? []; c.token_expires_at = Number(d.expires_at) ? new Date(Number(d.expires_at) * 1000).toISOString() : null; c.token_type = typ;
    }
    const tokenOk = checks.find((x) => x.key === "token")?.ok === true;
    if (!tokenOk) for (const [k, l] of [["waba", "WhatsApp Business Account"], ["phone", "Phone Number ID"], ["messaging", "Messaging access"]]) add(k, l, false, "Skipped: the access token is not usable.", "skipped");
    else {
      // 3: the WABA
      const w = await graph(admin, c, token, "GET", `/${c.waba_id}`, { action, query: { fields: "id,name,currency,timezone_id,account_review_status,business_verification_status" }, secrets: sec });
      add("waba", "WhatsApp Business Account", w.ok, w.ok ? `${w.data.name ?? "Account"} (${w.data.id})${w.data.account_review_status ? " · review: " + String(w.data.account_review_status).toLowerCase() : ""}${w.data.business_verification_status ? " · business: " + String(w.data.business_verification_status).toLowerCase() : ""}.` : w.err.message);
      // 4: the phone number belongs to that WABA
      if (w.ok) {
        const l = await graph(admin, c, token, "GET", `/${c.waba_id}/phone_numbers`, { action, query: { fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,throughput,name_status,status,messaging_limit_tier", limit: "100" }, secrets: sec });
        phone = l.ok ? (l.data.data ?? []).find((x: any) => String(x.id) === String(c.phone_number_id)) : null;
        add("phone", "Phone Number ID", !!phone, l.ok ? (phone ? `${phone.display_phone_number} · ${phone.verified_name || "name pending"} · quality ${String(phone.quality_rating ?? "unknown").toLowerCase()}${phone.status ? " · " + String(phone.status).toLowerCase() : ""}.` : "This Phone Number ID is not a number of that WhatsApp Business Account. Copy it from WhatsApp › API Setup.") : l.err.message);
      } else add("phone", "Phone Number ID", false, "Skipped: the WhatsApp Business Account could not be read.", "skipped");
      // 5: can this token act on the number (read). Sending is only proven by a test message.
      if (phone) { const n = await graph(admin, c, token, "GET", `/${c.phone_number_id}`, { action, query: { fields: "id,display_phone_number,verified_name" }, secrets: sec });
        add("messaging", "Messaging access", n.ok, n.ok ? "The token can read this number. Sending is confirmed by the test message." : n.err.message); }
      else add("messaging", "Messaging access", false, "Skipped: the phone number was not found.", "skipped");
      // 6: webhook subscription (informational)
      const s = await graph(admin, c, token, "GET", `/${c.waba_id}/subscribed_apps`, { action, secrets: sec });
      if (s.ok) { subscribedApp = (s.data.data ?? []).some((x: any) => String(x.whatsapp_business_api_data?.id) === String(c.app_id)); add("subscription", "Webhook subscription", subscribedApp === true, subscribedApp ? "This app is subscribed to the WhatsApp Business Account." : "This app is not subscribed to the account yet. Use “Subscribe webhook” below.", subscribedApp ? "ok" : "warn"); }
      else add("subscription", "Webhook subscription", false, s.err.message, "warn");
      const a = await graph(admin, c, appTok, "GET", `/${c.app_id}/subscriptions`, { action, secrets: sec });
      if (a.ok) { const wa = (a.data.data ?? []).find((x: any) => x.object === "whatsapp_business_account"); fields = (wa?.fields ?? []).map((f: any) => String(f.name)); const miss = W.WEBHOOK_FIELDS.slice(0, 1).filter((f) => !fields.includes(f));
        add("webhook_fields", "Webhook fields", !!wa && !miss.length, wa ? (miss.length ? "Subscribe the “messages” field in the app's Webhooks settings to receive delivery status." : "Subscribed to: " + fields.join(", ") + ".") : "No WhatsApp webhook is configured on the app yet (Meta app › WhatsApp › Configuration).", !!wa && !miss.length ? "ok" : "warn"); }
    }
  }
  const failed = checks.filter((x) => x.level === "fail"), ok = failed.length === 0 && !missing.length;
  const prev = c.status, patch: Record<string, unknown> = { last_checked_at: nowIso(), status: missing.length ? "saved" : ok ? "connected" : "error", status_detail: failed.length ? W.scrub(failed[0].label + ": " + failed[0].detail, sec).slice(0, 300) : "",
    token_valid: health.state === "unknown" ? null : health.state === "ok" || health.state === "expiring", token_checked_at: nowIso(), token_scopes: c.token_scopes ?? [], token_type: c.token_type ?? "", token_expires_at: c.token_expires_at ?? null,
    webhook_subscribed_app: subscribedApp, webhook_fields: fields };
  if (phone) Object.assign(patch, { display_phone_number: phone.display_phone_number ?? "", verified_name: phone.verified_name ?? "", quality_rating: phone.quality_rating ?? "" });
  if (ok && prev !== "connected") patch.connected_at = nowIso();
  await cfgSet(admin, patch);
  await audit(admin, actor, action === "health" ? "health_check" : "connection_test", { ok, failed: failed.map((x) => x.key) });
  if ((action === "health" || prev === "connected") && W.shouldAlert({ ok: ok || !!missing.length, tokenState: health.state, lastAlertAt: c.last_alert_at }))
    await alertAdmins(admin, c, ok ? "WhatsApp token needs attention" : "WhatsApp connection problem", failed.map((x) => `• ${x.label}: ${x.detail}`).concat(health.state === "expiring" ? [`• The access token expires in ${health.daysLeft} day(s). Replace it before then.`] : []));
  return { ok, status: patch.status, checks, health };
}

// ---------- validation helpers ----------
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
async function sendRate(admin: any, actor: string) {
  const since = new Date(Date.now() - 36e5).toISOString(), { count } = await admin.from("whatsapp_audit_log").select("id", { count: "exact", head: true }).eq("action", "send_test").eq("actor", actor).gte("at", since);
  if ((count ?? 0) >= 10) throw new Fail("Test message limit reached (10 per hour). Try again later.", 429);
}
async function needReady(admin: any) {
  const c = await cfgRow(admin), token = await secret(admin, "access_token"); if (!c.waba_id || !c.phone_number_id || !token) throw new Fail("Save the configuration (IDs and System User token) first.", 400); return { c, token };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const path = ("/" + new URL(req.url).pathname.replace(/^\/(functions\/v1\/)?(api\/)?whatsapp/, "")).replace(/\/{2,}/g, "/").replace(/(.)\/$/, "$1"), M = req.method;
  let secretsInPlay: string[] = [];
  try {
    // ----- Meta's webhook: public, answers only Meta -----
    if (path === "/webhook" && M === "GET") {
      const q = new URL(req.url).searchParams, stored = await secret(admin, "verify_token");
      if (q.get("hub.mode") === "subscribe" && stored && W.safeEqual(q.get("hub.verify_token") ?? "", stored) && q.get("hub.challenge")) {
        await cfgSet(admin, { webhook_verified_at: nowIso() }); await audit(admin, "meta", "webhook_verified", {});
        return new Response(q.get("hub.challenge")!, { status: 200, headers: { ...cors, "Content-Type": "text/plain" } });
      }
      return new Response("Forbidden", { status: 403, headers: cors });
    }
    if (path === "/webhook" && M === "POST") {
      const raw = await req.text(), appSecret = await secret(admin, "app_secret");
      if (!(await W.verifySignature(raw, req.headers.get("x-hub-signature-256"), appSecret))) { await logError(admin, "webhook", "/webhook", { status: 401, code: 0, subcode: 0, kind: "auth", message: "Webhook call with a missing or wrong signature was refused.", detail: "", fbtrace_id: "" }, [appSecret]); return new Response("Invalid signature", { status: 401, headers: cors }); }
      let p: any; try { p = JSON.parse(raw); } catch { return new Response("Bad request", { status: 400, headers: cors }); }
      if (p?.object !== "whatsapp_business_account") return new Response("ok", { status: 200, headers: cors });
      const c = await cfgRow(admin);
      for (const s of W.parseStatuses(p)) {                                        // only messages Legal Staff itself sent are updated
        const { data: row } = await admin.from("whatsapp_messages").select("id,status").eq("wamid", s.id).maybeSingle(); if (!row) continue;
        const next = W.nextStatus(row.status, s.status), when = s.at ?? nowIso(), patch: Record<string, unknown> = { status: next, updated_at: nowIso() };
        if (next !== row.status) { if (next === "sent") patch.sent_at = when; if (next === "delivered") patch.delivered_at = when; if (next === "read") { patch.read_at = when; patch.delivered_at = when; } if (next === "failed") patch.failed_at = when; }
        if (next === "failed" && s.errors[0]) Object.assign(patch, { error_code: s.errors[0].code, error_message: W.scrub(s.errors[0].title + (s.errors[0].details ? ": " + s.errors[0].details : ""), []).slice(0, 300) });
        await admin.from("whatsapp_messages").update(patch).eq("id", row.id);
      }
      for (const o of W.parseOptActions(p)) {                                     // STOP / START replies only: the sender's number is hashed, no text is kept, there is no inbox
        if (!c.phone_number_id || o.phone_number_id !== c.phone_number_id) continue; const hash = await W.sha256Hex(o.phone);
        if (o.action === "optout") await admin.from("whatsapp_optouts").upsert({ phone_hash: hash, source: "reply" }, { onConflict: "phone_hash" }); else await admin.from("whatsapp_optouts").delete().eq("phone_hash", hash);
      }
      await cfgSet(admin, { last_webhook_at: nowIso(), last_webhook_event: W.describeEvent(p).slice(0, 200) });
      return new Response("ok", { status: 200, headers: cors });
    }

    // ----- the scheduled health check -----
    if (path === "/health" && M === "POST") {
      if (!(await isCron(req, admin))) throw new Fail("Not allowed.", 403);
      const c = await cfgRow(admin), sec = await secretsPresent(admin); if (!["connected", "error"].includes(c.status) || !sec.access_token) return json({ skipped: "WhatsApp API is not connected." });
      const r = await runChecks(admin, "system", "health"); return json({ ok: r.ok, status: r.status });
    }

    // ----- everything below is for signed-in administrators -----
    const actor = await requireAdmin(req, url, admin);
    if (path === "/connection/status" && M === "GET") return json(await publicStatus(admin));

    if (path === "/connection/save" && M === "POST") {
      const b = await req.json().catch(() => ({})), c = await cfgRow(admin), changed: string[] = [];
      const app_id = b.app_id === undefined ? c.app_id : W.metaId(b.app_id), waba_id = b.waba_id === undefined ? c.waba_id : W.metaId(b.waba_id), phone_number_id = b.phone_number_id === undefined ? c.phone_number_id : W.metaId(b.phone_number_id);
      if (b.app_id !== undefined && !app_id) throw new Fail("Meta App ID must be the numeric ID from the app dashboard.");
      if (b.waba_id !== undefined && !waba_id) throw new Fail("WhatsApp Business Account ID must be numeric (WhatsApp › API Setup).");
      if (b.phone_number_id !== undefined && !phone_number_id) throw new Fail("Phone Number ID must be numeric (WhatsApp › API Setup). It is not the phone number itself.");
      const gv = b.graph_version === undefined || str(b.graph_version) === "" ? c.graph_version || W.DEFAULT_GRAPH_VERSION : W.graphVersion(b.graph_version); if (!gv) throw new Fail("Graph API version must look like v21.0.");
      const at = str(b.access_token), as = str(b.app_secret), vt = str(b.verify_token);
      if (at && (at.length < 20 || /\s/.test(at))) throw new Fail("That does not look like a Meta access token. Copy the whole token from Business Settings › System Users.");
      if (as && !/^[A-Za-z0-9]{16,64}$/.test(as)) throw new Fail("That does not look like a Meta App Secret (App settings › Basic › App secret).");
      if (vt && !/^[A-Za-z0-9_.~-]{8,128}$/.test(vt)) throw new Fail("Verify token: 8 to 128 letters, digits and - _ . ~ only.");
      secretsInPlay = [at, as, vt];
      if (app_id !== c.app_id) changed.push("app_id"); if (waba_id !== c.waba_id) changed.push("waba_id"); if (phone_number_id !== c.phone_number_id) changed.push("phone_number_id"); if (gv !== c.graph_version) changed.push("graph_version");
      const had = await secretsPresent(admin), patch: Record<string, unknown> = { app_id, waba_id, phone_number_id, graph_version: gv };
      if (as) { await admin.rpc("wa_secret_set", { p_name: W.SECRET_NAMES.app_secret, p_value: as }); changed.push(had.app_secret ? "app_secret_rotated" : "app_secret"); }
      if (vt) { await admin.rpc("wa_secret_set", { p_name: W.SECRET_NAMES.verify_token, p_value: vt }); changed.push(had.verify_token ? "verify_token_rotated" : "verify_token"); patch.webhook_verified_at = null; }
      if (at) { await admin.rpc("wa_secret_set", { p_name: W.SECRET_NAMES.access_token, p_value: at }); changed.push(had.access_token ? "access_token_rotated" : "access_token"); Object.assign(patch, { token_replaced_at: nowIso(), token_valid: null, token_expires_at: null, token_scopes: [], token_type: "" }); }
      const now = await secretsPresent(admin), complete = app_id && waba_id && phone_number_id && now.access_token && now.app_secret;
      if (changed.length) { patch.status = complete ? "saved" : "not_configured"; patch.status_detail = complete ? "Saved. Run “Test connection” to verify it with Meta." : "Waiting for all required values."; }
      await cfgSet(admin, patch, actor); await audit(admin, actor, "config_saved", { changed });
      return json({ ok: true, changed, status: await publicStatus(admin) });
    }

    if (path === "/connection/test" && M === "POST") {
      const { count } = await admin.from("whatsapp_audit_log").select("id", { count: "exact", head: true }).eq("action", "connection_test").gte("at", new Date(Date.now() - 36e5).toISOString());
      if ((count ?? 0) >= 30) throw new Fail("Too many connection tests in the last hour. Try again later.", 429);
      return json({ ...(await runChecks(admin, actor, "test")), status_view: await publicStatus(admin) });
    }

    if (path === "/connection/refresh-token" && M === "POST") {
      const c = await cfgRow(admin), token = await secret(admin, "access_token"), appSecret = await secret(admin, "app_secret"); if (!c.app_id || !token || !appSecret) throw new Fail("Save the App ID, App Secret and access token first.");
      const r = await graph(admin, c, `${c.app_id}|${appSecret}`, "GET", "/debug_token", { action: "refresh_token", query: { input_token: token }, secrets: [token, appSecret] });
      if (!r.ok) throw new Fail(r.err.kind === "auth" ? "Meta rejected the App ID / App Secret pair." : r.err.message, 502);
      const d = r.data?.data, h = W.tokenHealth(d), p = d ? W.permissionCheck(d, c.waba_id) : null;
      await cfgSet(admin, { token_valid: h.state === "ok" || h.state === "expiring", token_checked_at: nowIso(), token_type: String(d?.type ?? ""), token_scopes: d?.scopes ?? [], token_expires_at: Number(d?.expires_at) ? new Date(Number(d.expires_at) * 1000).toISOString() : null });
      await audit(admin, actor, "token_status_refreshed", { state: h.state });
      if (W.shouldAlert({ ok: h.state === "ok", tokenState: h.state, lastAlertAt: c.last_alert_at })) await alertAdmins(admin, c, "WhatsApp token needs attention", [h.state === "expiring" ? `The access token expires in ${h.daysLeft} day(s).` : "The access token is " + h.state + "."]);
      return json({ health: h, permissions: p, status: await publicStatus(admin) });
    }

    if (path === "/connection/disconnect" && M === "POST") {
      const b = await req.json().catch(() => ({})); if (b.confirm !== true) throw new Fail("Confirm the disconnect.");
      for (const n of Object.values(W.SECRET_NAMES)) await admin.rpc("wa_secret_delete", { p_name: n });
      await cfgSet(admin, { status: "disconnected", status_detail: "Credentials removed from Legal Staff. The WhatsApp number at Meta was not changed.", token_valid: null, token_expires_at: null, token_scopes: [], token_type: "", webhook_verified_at: null, webhook_subscribed_app: null, webhook_fields: [], connected_at: null }, actor);
      await audit(admin, actor, "disconnected", {}); return json({ ok: true, status: await publicStatus(admin) });
    }

    if (path === "/phone-number" && M === "GET") {
      const { c, token } = await needReady(admin); secretsInPlay = [token];
      const r = await graph(admin, c, token, "GET", `/${c.phone_number_id}`, { action: "phone_number", query: { fields: "id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,throughput,name_status,status,messaging_limit_tier" } });
      if (!r.ok) throw new Fail(r.err.message, r.err.kind === "rate_limit" ? 429 : 502); return json({ phone_number: r.data });
    }

    if (path === "/templates" && M === "GET") {
      const { c, token } = await needReady(admin); secretsInPlay = [token]; const out: any[] = []; let after = "";
      for (let i = 0; i < 3; i++) {
        const r = await graph(admin, c, token, "GET", `/${c.waba_id}/message_templates`, { action: "templates", query: { fields: "name,language,status,category,components", status: "APPROVED", limit: "100", ...(after ? { after } : {}) } });
        if (!r.ok) throw new Fail(r.err.message, r.err.kind === "rate_limit" ? 429 : 502);
        for (const t of r.data.data ?? []) out.push({ name: t.name, language: t.language, category: t.category, variables: W.bodyVariableCount(t.components), body: String((t.components ?? []).find((x: any) => x.type === "BODY")?.text ?? "").slice(0, 400) });
        after = r.data.paging?.cursors?.after ?? ""; if (!r.data.paging?.next || !after) break;
      }
      return json({ templates: out });
    }

    if (path === "/send-test" && M === "POST") {
      const b = await req.json().catch(() => ({})), { c, token } = await needReady(admin); secretsInPlay = [token];
      if (c.status !== "connected") throw new Fail("Run “Test connection” successfully before sending a test message.", 409);
      const to = W.normalizePhone(b.to), template = str(b.template), language = str(b.language), vars = Array.isArray(b.variables) ? b.variables.slice(0, 20).map((v: unknown) => String(v ?? "")) : [];
      if (!to) throw new Fail("Enter the recipient's WhatsApp number with country code, for example 919876543210."); if (!W.templateNameOk(template)) throw new Fail("Choose an approved template."); if (!W.languageOk(language)) throw new Fail("Template language must look like en or en_US.");
      if (vars.some((v) => !v.trim())) throw new Fail("Fill every template variable. Meta rejects empty ones.");
      const hash = await W.sha256Hex(to), { data: out } = await admin.from("whatsapp_optouts").select("phone_hash").eq("phone_hash", hash).maybeSingle(); if (out) throw new Fail("This number replied STOP and has opted out. It will not be messaged.", 409);
      await sendRate(admin, actor); await audit(admin, actor, "send_test", { template, language, to: W.maskPhone(to) });
      const r = await graph(admin, c, token, "POST", `/${c.phone_number_id}/messages`, { action: "send_test", body: W.buildTemplateMessage({ to, name: template, language, variables: vars }) });
      const request = { endpoint: `POST /${c.graph_version}/${c.phone_number_id}/messages`, to: W.maskPhone(to), template, language, variables: vars.length };
      if (r.ok) {
        const m = r.data?.messages?.[0] ?? {}, wamid = String(m.id ?? "");
        await admin.from("whatsapp_messages").insert({ wamid: wamid || null, kind: "test", to_masked: W.maskPhone(to), template, language, status: "accepted", sent_by: actor });
        return json({ accepted: true, status: "accepted", meta_message_id: wamid, meta_message_status: String(m.message_status ?? "accepted"), request, note: "Accepted by Meta. This is not delivery: the message shows as delivered only when Meta's delivery webhook confirms it." });
      }
      await admin.from("whatsapp_messages").insert({ wamid: null, kind: "test", to_masked: W.maskPhone(to), template, language, status: "rejected", error_code: r.err.code || null, error_message: r.err.message.slice(0, 300), sent_by: actor });
      return json({ accepted: false, status: "rejected", request, error: { kind: r.err.kind, code: r.err.code, subcode: r.err.subcode, message: r.err.message, fbtrace_id: r.err.fbtrace_id } });
    }

    if (path === "/webhook/subscribe" && M === "POST") {
      const b = await req.json().catch(() => ({})), { c, token } = await needReady(admin); secretsInPlay = [token]; if (b.confirm !== true) throw new Fail("Confirm the subscription.");
      let body: Record<string, unknown> | undefined;
      if (b.override_callback === true) { const vt = await secret(admin, "verify_token"); if (!vt) throw new Fail("Save a webhook verify token first."); secretsInPlay.push(vt); body = { override_callback_uri: `${(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "")}/functions/v1/whatsapp/webhook`, verify_token: vt }; }
      const r = await graph(admin, c, token, "POST", `/${c.waba_id}/subscribed_apps`, { action: "subscribe_webhook", body, secrets: secretsInPlay }); if (!r.ok) throw new Fail(r.err.message, 502);
      await cfgSet(admin, { webhook_subscribed_app: true }, actor); await audit(admin, actor, "webhook_subscribed", { override_callback: b.override_callback === true });
      return json({ ok: true, status: await publicStatus(admin) });
    }

    return json({ error: "Not found." }, M === "GET" || M === "POST" ? 404 : 405);
  } catch (e: any) {
    if (e instanceof Fail) return json({ error: W.scrub(e.message, secretsInPlay) }, e.status);
    console.error("whatsapp:", W.scrub(String(e?.message ?? e), secretsInPlay));      // never the stack with values, never a secret
    return json({ error: "Something went wrong. Try again, and check the error history if it keeps happening." }, 500);
  }
});

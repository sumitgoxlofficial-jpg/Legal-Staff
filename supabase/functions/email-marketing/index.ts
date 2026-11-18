// Legal Staff email marketing (supabase/migrations/0035_email_marketing.sql). One function, four kinds of caller:
//   a super administrator  { action: "overview" | "contacts" | "contact" | "export" | "consent_record" | "consent_verify" | "suppressions" | "suppress_add" |
//                            "suppression_lift" | "sheets_get" | "sheets_connect" | "sheets_preview" | "sheets_save" | "sheets_sync" | "imports" | "campaigns" |
//                            "templates" | "template_save" | "template_toggle" | "template_preview" | "template_test" | "queue" | "queue_cancel" | "history" |
//                            "analytics" | "settings" | "settings_save" | "kill" | "simulate" | "preview_schedule" | "provider" | "provider_save" | "provider_check" |
//                            "report_now" | "audit" }
//   the scheduler          { action: "tick" } with x-cron-secret: runs whatever is due (sheet sync, planning, sending, the daily report)
//   the email provider     ?action=webhook with the webhook secret (delivery, bounce, complaint, click, unsubscribe)
//   a recipient            ?action=unsub (GET shows, POST unsubscribes; also the RFC 8058 one-click POST) and ?action=landing (click / registration attribution)
// Deploy with JWT verification off; it checks every caller itself.
// Secrets (function secrets, never the browser): BREVO_API_KEY, BREVO_WEBHOOK_SECRET, EMAIL_TOKEN_SECRET, GOOGLE_SERVICE_ACCOUNT_JSON, CRON_SECRET (optional).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SITE, DIRECTORY_URL, normEmail, isValidEmail, parseSpreadsheetId, autoMapColumns, findHeaderRow, mapRows, mappingProblems, MAPPABLE, istDate, istHm, addDaysIso, istInstant, jobDue, nextRun,
  remainingToday, evaluateEligibility, describeReasons, productionBlockers, settingsProblem, canActivateTemplate, templateProblems, renderTemplate, trackedUrl, makeToken, readToken,
  safeEqual, brevoPayload, classifySend, classifyBrevoEvent, googleAssertion, parseServiceAccount, toCsv, toExcelXml, scrub, GLOBAL } from "../_shared/email-logic.js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }
const env = (n: string) => Deno.env.get(n) ?? "";
const nowIso = () => new Date().toISOString();
const FN_URL = () => `${env("SUPABASE_URL").replace(/\/$/, "")}/functions/v1/email-marketing`;
const tokenSecret = () => { const s = env("EMAIL_TOKEN_SECRET"); if (!s || s.length < 24) throw new Fail("EMAIL_TOKEN_SECRET is not set (use a random value of at least 24 characters).", 501); return s; };

// ---------- rate limiting (per function instance: slows abuse, is not a global quota) ----------
const hits = new Map<string, number[]>();
function limit(key: string, max: number, windowMs = 60000) {
  const t = Date.now(), a = (hits.get(key) ?? []).filter((x) => t - x < windowMs); a.push(t); hits.set(key, a);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
  if (a.length > max) throw new Fail("Too many requests. Try again in a minute.", 429);
}

async function all(q: () => any) {
  const out: any[] = [];
  for (let from = 0; ;) { const { data, error } = await q().range(from, from + 999); if (error) throw error; if (!data?.length) return out; out.push(...data); from += data.length; if (data.length < 1000) return out; }
}
const inChunks = async (ids: string[], fn: (c: string[]) => Promise<any[]>) => { const o: any[] = []; for (let i = 0; i < ids.length; i += 200) o.push(...(await fn(ids.slice(i, i + 200)))); return o; };
async function audit(admin: any, actor: string, action: string, target = "", details: any = {}) { await admin.from("email_audit_logs").insert({ actor, action, target, details }); }

// ---------- settings and provider ----------
async function getSettings(admin: any) { const { data } = await admin.from("email_automation_settings").select("*").eq("id", 1).single(); return data; }
async function getProvider(admin: any) {
  const { data: p } = await admin.from("email_provider_settings").select("*").eq("id", 1).single();
  const key = env("BREVO_API_KEY");
  return { ...p, apiKey: key, configured: !!key && !!p?.sender_email, domainAuthenticated: !!p?.domain_authenticated };
}
const publicProvider = (p: any) => { const { apiKey, ...rest } = p; return { ...rest, api_key_set: !!apiKey, webhook_secret_set: !!env("BREVO_WEBHOOK_SECRET"), token_secret_set: env("EMAIL_TOKEN_SECRET").length >= 24, google_sa_set: !!parseServiceAccount(env("GOOGLE_SERVICE_ACCOUNT_JSON")) }; };

// ---------- Google Sheets (read-only service account) ----------
let gTok: { t: string; exp: number } | null = null;
async function googleToken(): Promise<string> {
  if (gTok && gTok.exp > Date.now() + 60000) return gTok.t;
  const raw = env("GOOGLE_SERVICE_ACCOUNT_JSON"); if (!raw) throw new Fail("Google Sheets is not connected: set the GOOGLE_SERVICE_ACCOUNT_JSON secret and share the sheet with that service account.", 501);
  const sa: any = parseServiceAccount(raw); if (!sa) throw new Fail("GOOGLE_SERVICE_ACCOUNT_JSON could not be read: paste the whole key file (it starts with { and contains client_email and private_key).", 501);
  const assertion = await googleAssertion(sa, Math.floor(Date.now() / 1000));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) throw new Fail("Google refused the service account: " + scrub(j.error_description || j.error || r.status), 502);
  gTok = { t: j.access_token, exp: Date.now() + (j.expires_in ?? 3000) * 1000 }; return gTok.t;
}
const sheetsBase = () => (env("GOOGLE_SHEETS_API_BASE") || "https://sheets.googleapis.com").replace(/\/$/, "");
async function gget(path: string) {
  const r = await fetch(sheetsBase() + path, { headers: { Authorization: "Bearer " + (await googleToken()) } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 403 || r.status === 404) throw new Fail("The service account cannot open this spreadsheet. Share it (Viewer) with " + (parseServiceAccount(env("GOOGLE_SERVICE_ACCOUNT_JSON"))?.client_email ?? "the service account") + ".", 400);
  if (!r.ok) throw new Fail("Google Sheets error: " + scrub(j.error?.message || r.status), 502);
  return j;
}
async function sheetInfo(id: string) {
  const j = await gget(`/v4/spreadsheets/${id}?fields=properties.title,sheets.properties(title,gridProperties)`);
  return { title: j.properties?.title ?? "", sheets: (j.sheets ?? []).map((s: any) => ({ title: s.properties.title, rows: s.properties.gridProperties?.rowCount ?? 0 })) };
}
async function sheetValues(id: string, sheet: string, maxRows = 50000): Promise<string[][]> {
  const j = await gget(`/v4/spreadsheets/${id}/values/${encodeURIComponent("'" + sheet.replace(/'/g, "''") + "'!A1:Z" + maxRows)}?majorDimension=ROWS`);
  return j.values ?? [];
}

async function runImport(admin: any, integ: any, trigger: "manual" | "scheduled", actor: string) {
  const { data: run } = await admin.from("email_import_runs").insert({ integration_id: integ.id, trigger, started_by: actor }).select("*").single();
  try {
    if (!integ.sheet_name) throw new Fail("Choose a sheet first.");
    const problems = mappingProblems(integ.column_map); if (problems.length) throw new Fail(problems[0]);
    const rows = mapRows(await sheetValues(integ.spreadsheet_id, integ.sheet_name), integ.column_map);
    if (!rows.length) throw new Fail("The sheet has no data rows (or none that match the mapped columns). Nothing was imported.");
    const tot = { new: 0, updated: 0, duplicate: 0, invalid: 0, consents: 0 }; const errors: any[] = [];
    const seenAcross = new Set<string>();   // the same email in two chunks is also a duplicate
    const unique = rows.filter((r: any) => { const n = normEmail(r.email); if (n && seenAcross.has(n)) { tot.duplicate++; return false; } if (n) seenAcross.add(n); return true; });
    for (let i = 0; i < unique.length; i += 500) {
      const { data, error } = await admin.rpc("email_import_rows", { p_run: run.id, p_integration: integ.id, p_rows: unique.slice(i, i + 500) });
      if (error) throw error;
      for (const k of Object.keys(tot)) (tot as any)[k] += data[k] ?? 0;
      errors.push(...(data.errors ?? []));
    }
    const summary = { ...tot, rows: rows.length };
    await admin.from("email_import_runs").update({ status: "completed", rows_read: rows.length, rows_new: tot.new, rows_updated: tot.updated, rows_duplicate: tot.duplicate, rows_invalid: tot.invalid, consents_recognised: tot.consents, errors: errors.slice(0, 50), finished_at: nowIso() }).eq("id", run.id);
    await admin.from("google_sheets_integrations").update({ last_sync_at: nowIso(), last_sync_status: "completed", last_sync_summary: summary, updated_at: nowIso() }).eq("id", integ.id);
    await audit(admin, actor, "sheet_import", integ.spreadsheet_id, summary);
    return { run_id: run.id, ...summary, errors: errors.slice(0, 50) };
  } catch (e: any) {
    const msg = scrub(e.message || e);
    await admin.from("email_import_runs").update({ status: "failed", errors: [{ error: msg }], finished_at: nowIso() }).eq("id", run.id);
    await admin.from("google_sheets_integrations").update({ last_sync_at: nowIso(), last_sync_status: "failed: " + msg.slice(0, 200), updated_at: nowIso() }).eq("id", integ.id);
    await audit(admin, actor, "sheet_import_failed", integ.spreadsheet_id, { error: msg });
    throw e instanceof Fail ? e : new Fail(msg, 502);
  }
}

// ---------- planning ----------
const CLEAN = (q: any) => q.eq("consent_status", "GRANTED").not("consent_verified_at", "is", null).eq("unsubscribe_status", "SUBSCRIBED").eq("hard_bounced", false).eq("spam_complaint", false).eq("registration_status", "NONE").eq("payment_status", "NONE");

/** The facts evaluateEligibility needs, read fresh for a set of contacts. */
async function facts(admin: any, contacts: any[], campaignIds: string[]) {
  const ids = contacts.map((c) => c.id), emails = contacts.map((c) => c.email_normalized);
  const [cons, sup, queued] = await Promise.all([
    inChunks(ids, async (c) => (await admin.from("email_consents").select("contact_id").eq("purpose", "marketing").is("withdrawn_at", null).not("verified_at", "is", null).in("contact_id", c)).data ?? []),
    inChunks(emails, async (c) => (await admin.from("email_suppressions").select("email_normalized").in("email_normalized", c)).data ?? []),
    inChunks(ids, async (c) => (await admin.from("email_queue").select("contact_id,campaign_id,status").in("contact_id", c).in("campaign_id", campaignIds).in("status", ["sent", "sending"])).data ?? []),
  ]);
  return { consent: new Set(cons.map((r: any) => r.contact_id)), suppressed: new Set(sup.map((r: any) => r.email_normalized)), sent: new Set(queued.map((r: any) => r.contact_id + ":" + r.campaign_id)) };
}
const sentTodayCount = async (admin: any, kind: string, today: string) => {
  const { data: camps } = await admin.from("email_campaigns").select("id").eq("kind", kind);
  const { count } = await admin.from("email_queue").select("id", { count: "exact", head: true }).in("campaign_id", (camps ?? []).map((c: any) => c.id)).eq("scheduled_date", today).in("status", ["queued", "sending", "sent"]);
  return count ?? 0;
};

/**
 * Picks the contacts for one queue and (unless `dry`) queues them. In a dry run nothing is written: it returns exactly who would be queued and who
 * was rejected and why. Administrator switches (approvals, system, kill) are ignored in a dry run and listed in `blockers` instead.
 */
async function plan(admin: any, kind: "new" | "reminder", dry: boolean, actor = "scheduler") {
  const settings = await getSettings(admin), provider = await getProvider(admin), today = istDate(Date.now());
  const cap = kind === "new" ? settings.max_new_per_day : settings.max_reminders_per_day;
  const left = remainingToday(cap, await sentTodayCount(admin, kind, today));
  const { data: campaigns } = await admin.from("email_campaigns").select("*").eq("kind", kind).eq("active", true);
  const { data: templates } = await admin.from("email_templates").select("key,active");
  const tpl = new Map((templates ?? []).map((t: any) => [t.key, t]));
  const out: any = { kind, date: today, cap, remaining: left, selected: [], skipped: [], blockers: productionBlockers(settings, provider) };
  if (left <= 0 || !(campaigns ?? []).length) return out;
  let cands: any[];
  if (kind === "new") cands = (await CLEAN(admin.from("email_contacts").select("*")).eq("first_email_status", "ELIGIBLE").order("created_at").limit(left * 3 + 20)).data ?? [];
  else cands = (await CLEAN(admin.from("email_contacts").select("*")).eq("first_email_status", "SENT").lte("reminder_due_date", today).lt("reminder_count", settings.max_reminders).order("reminder_due_date").limit(left * 3 + 20)).data ?? [];
  const f = await facts(admin, cands, campaigns.map((c: any) => c.id));
  const rows: any[] = [];
  for (const c of cands) {
    if (out.selected.length >= left) break;
    const camp = kind === "new" ? campaigns[0] : campaigns.find((x: any) => x.step === c.reminder_count + 1);
    if (!camp) { out.skipped.push({ contact_id: c.contact_id, reasons: ["No campaign for this reminder step"] }); continue; }
    const ev = evaluateEligibility({ contact: c, settings: dry ? { ...settings, system_enabled: true, legal_approval: true, provider_approved: true, kill_switch: false } : settings,
      campaign: camp, template: dry ? { active: true } : tpl.get(camp.template_key), provider: dry ? { configured: true } : provider, suppressed: f.suppressed.has(c.email_normalized),
      alreadySent: f.sent.has(c.id + ":" + camp.id), hasConsentRecord: f.consent.has(c.id), todayIst: today });
    if (!ev.ok) { out.skipped.push({ contact_id: c.contact_id, email: c.email_normalized, reasons: describeReasons(ev.reasons) }); continue; }
    out.selected.push({ contact_id: c.contact_id, email: c.email_normalized, name: c.advocate_name, campaign: camp.code });
    rows.push({ campaign_id: camp.id, contact_id: c.id, scheduled_date: today, idempotency_key: `${camp.code}:${c.id}` });
  }
  if (!dry && rows.length) {
    const { data: ins, error } = await admin.from("email_queue").upsert(rows, { onConflict: "campaign_id,contact_id", ignoreDuplicates: true }).select("id,contact_id,campaign_id");
    if (error) throw error;
    const queuedIds = (ins ?? []).map((r: any) => r.contact_id);
    if (kind === "new" && queuedIds.length) await inChunks(queuedIds, async (c) => { await admin.from("email_contacts").update({ first_email_status: "QUEUED", last_updated: nowIso() }).in("id", c).eq("first_email_status", "ELIGIBLE"); return []; });
    await admin.from("email_events").upsert((ins ?? []).map((r: any) => ({ event_type: "email_queued", contact_id: r.contact_id, campaign_id: r.campaign_id, queue_id: r.id, dedupe_key: "queued:" + r.id })), { onConflict: "dedupe_key", ignoreDuplicates: true });
    out.queued = ins?.length ?? 0;
  }
  return out;
}

// ---------- sending ----------
async function brevoSend(provider: any, payload: any) {
  const r = await fetch((env("BREVO_API_BASE") || "https://api.brevo.com").replace(/\/$/, "") + "/v3/smtp/email", { method: "POST", headers: { "api-key": provider.apiKey, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, retryAfter: r.headers.get("retry-after"), messageId: j.messageId ? String(j.messageId).replace(/^<|>$/g, "") : "", error: scrub(j.message || j.code || "") };
}
const unsubUrl = async (contactId: string) => `${SITE}/unsubscribe?t=${await makeToken(tokenSecret(), "u", contactId)}`;
async function buildMessage(tpl: any, camp: any, c: any) {
  const secret = tokenSecret(), unsub = await unsubUrl(c.id);
  const direct = `${FN_URL()}?action=unsub&t=${await makeToken(secret, "u", c.id)}`;
  const link = trackedUrl(DIRECTORY_URL, camp.code, camp.step, await makeToken(secret, "l", c.id, camp.code));
  const msg = renderTemplate(tpl, { advocate_name: c.advocate_name || "", unsubscribe_url: unsub, directory_url: link, city: c.city, state: c.state, contact_id: c.contact_id });
  return { ...msg, unsub, direct };
}

/** Sends one queued email. Every safety check is run again here, on freshly read data. Returns "sent" | "skipped" | "hold" | "rate_limited" | "retry" | "failed". */
async function sendOne(admin: any, q: any): Promise<{ result: string; waitSec?: number; note?: string }> {
  const { data: claimed } = await admin.from("email_queue").update({ status: "sending", attempts: q.attempts + 1, updated_at: nowIso() }).eq("id", q.id).eq("status", "queued").select("*");
  if (!claimed?.length) return { result: "skipped", note: "already claimed" };   // another worker has it: no duplicate
  const release = (status: string, extra: any = {}) => admin.from("email_queue").update({ status, updated_at: nowIso(), ...extra }).eq("id", q.id);
  const [{ data: c }, { data: camp }, settings, provider, today] = [await admin.from("email_contacts").select("*").eq("id", q.contact_id).single(), await admin.from("email_campaigns").select("*").eq("id", q.campaign_id).single(), await getSettings(admin), await getProvider(admin), istDate(Date.now())];
  const { data: tpl } = await admin.from("email_templates").select("*").eq("key", camp.template_key).single();
  const f = await facts(admin, [c], [camp.id]);
  f.sent.delete(c.id + ":" + camp.id);   // our own 'sending' claim is not a previous send
  const ev = evaluateEligibility({ contact: c, settings, campaign: camp, template: tpl, provider, suppressed: f.suppressed.has(c.email_normalized), alreadySent: f.sent.has(c.id + ":" + camp.id), hasConsentRecord: f.consent.has(c.id), todayIst: today });
  const blockers = productionBlockers(settings, provider);
  if (blockers.length || (ev.hold && !ev.ok)) { await release("queued", { attempts: q.attempts }); return { result: "hold", note: blockers.join("; ") || describeReasons(ev.reasons).join("; ") }; }
  if (!ev.ok) {
    await release("skipped", { skip_reason: describeReasons(ev.reasons).join("; ") });
    await admin.from("email_logs").insert({ queue_id: q.id, campaign_id: camp.id, contact_id: c.id, to_email: c.email_normalized, subject: tpl.subject, status: "skipped", error: describeReasons(ev.reasons).join("; ") });
    if (camp.kind === "new" && c.first_email_status === "QUEUED") await admin.from("email_contacts").update({ first_email_status: ev.reasons.some((r: string) => ["UNSUBSCRIBED", "HARD_BOUNCE", "SPAM", "SUPPRESSED", "CONVERTED", "NO_CONSENT", "NOT_VERIFIED"].includes(r)) ? "BLOCKED" : "ELIGIBLE", last_updated: nowIso() }).eq("id", c.id);
    return { result: "skipped", note: describeReasons(ev.reasons).join("; ") };
  }
  const cap = camp.kind === "new" ? settings.max_new_per_day : settings.max_reminders_per_day;
  const { data: camps } = await admin.from("email_campaigns").select("id").eq("kind", camp.kind);
  const { count: done } = await admin.from("email_queue").select("id", { count: "exact", head: true }).in("campaign_id", camps.map((x: any) => x.id)).eq("scheduled_date", today).in("status", ["sending", "sent"]);
  if ((done ?? 0) > cap) { await release("queued", { attempts: q.attempts }); return { result: "hold", note: "daily limit reached" }; }   // 'sending' already includes this row
  const m = await buildMessage(tpl, camp, c);
  const res = await brevoSend(provider, brevoPayload({ sender: { email: provider.sender_email, name: provider.sender_name, replyTo: provider.reply_to }, to: c.email_normalized, toName: c.advocate_name,
    subject: m.subject, html: m.html, text: m.text, unsubscribeUrl: m.direct, tags: [camp.code], idempotencyKey: q.idempotency_key }));
  const k = classifySend(res.status, res.retryAfter);
  if (k.kind === "accepted") {
    await release("sent", { provider_message_id: res.messageId || null, last_error: "" });
    await admin.from("email_logs").insert({ queue_id: q.id, campaign_id: camp.id, contact_id: c.id, to_email: c.email_normalized, subject: m.subject, status: "accepted", provider_message_id: res.messageId || null });
    await admin.from("email_events").upsert({ event_type: "email_accepted", contact_id: c.id, campaign_id: camp.id, queue_id: q.id, provider_message_id: res.messageId || null, dedupe_key: "accepted:" + q.id }, { onConflict: "dedupe_key", ignoreDuplicates: true });
    const due = addDaysIso(today, settings.reminder_after_days);
    const patch = camp.kind === "new" ? { first_email_status: "SENT", first_email_date: nowIso(), reminder_count: 0, reminder_due_date: settings.max_reminders > 0 ? due : null }
      : { reminder_count: c.reminder_count + 1, reminder_due_date: c.reminder_count + 1 < settings.max_reminders ? due : null };
    await admin.from("email_contacts").update({ ...patch, last_updated: nowIso() }).eq("id", c.id);
    return { result: "sent" };
  }
  if (k.kind === "rate_limited") { await release("queued", { attempts: q.attempts, last_error: "rate limited" }); return { result: "rate_limited", waitSec: k.waitSec }; }
  if (k.kind === "auth") { await release("queued", { attempts: q.attempts, last_error: "provider rejected the API key" }); await audit(admin, "system", "provider_auth_failed", "", { status: res.status }); return { result: "hold", note: "The provider rejected the API key" }; }
  if (k.kind === "retry" && q.attempts + 1 < 3) { await release("queued", { last_error: `provider error ${res.status}` }); return { result: "retry" }; }
  await release("failed", { last_error: `${res.status} ${res.error}`.slice(0, 300) });
  await admin.from("email_logs").insert({ queue_id: q.id, campaign_id: camp.id, contact_id: c.id, to_email: c.email_normalized, subject: m.subject, status: "failed", error: `${res.status} ${res.error}`.slice(0, 300) });
  await admin.from("email_events").upsert({ event_type: "email_failed", contact_id: c.id, campaign_id: camp.id, queue_id: q.id, meta: { status: res.status }, dedupe_key: "failed:" + q.id }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (camp.kind === "new") await admin.from("email_contacts").update({ first_email_status: "FAILED", last_updated: nowIso() }).eq("id", c.id);
  return { result: "failed" };
}

async function drain(admin: any, maxRows = 25) {
  const stats: any = { sent: 0, skipped: 0, failed: 0, held: 0, retried: 0, note: "" }, today = istDate(Date.now());
  const settings = await getSettings(admin), provider = await getProvider(admin);
  const { data: rl } = await admin.from("email_job_runs").select("summary").eq("job_key", "rate_limit").maybeSingle();
  if (rl?.summary?.until && Date.parse(rl.summary.until) > Date.now()) { stats.note = "waiting for the provider rate limit"; return stats; }
  // queued rows from an earlier day are not sent: the contact goes back to ELIGIBLE (if still allowed) and the planner picks them again
  const { data: old } = await admin.from("email_queue").select("id,contact_id,campaign_id").eq("status", "queued").lt("scheduled_date", today);
  for (const o of old ?? []) { await admin.from("email_queue").update({ status: "skipped", skip_reason: "expired: not sent on its day", updated_at: nowIso() }).eq("id", o.id); await admin.from("email_contacts").update({ first_email_status: "ELIGIBLE" }).eq("id", o.contact_id).eq("first_email_status", "QUEUED"); }
  if (productionBlockers(settings, provider).length) { stats.note = "production sending is not active"; return stats; }
  const { data: rows } = await admin.from("email_queue").select("*").eq("status", "queued").lte("scheduled_date", today).order("created_at").limit(maxRows);
  for (const q of rows ?? []) {
    const r = await sendOne(admin, q);
    if (r.result === "sent") stats.sent++; else if (r.result === "skipped") stats.skipped++; else if (r.result === "failed") stats.failed++; else if (r.result === "retry") stats.retried++;
    else if (r.result === "hold") { stats.held++; stats.note = r.note ?? ""; break; }
    else if (r.result === "rate_limited") { await admin.from("email_job_runs").upsert({ job_key: "rate_limit", kind: "rate_limit", summary: { until: new Date(Date.now() + (r.waitSec ?? 60) * 1000).toISOString() } }); stats.note = `rate limited for ${r.waitSec}s`; break; }
    await new Promise((res) => setTimeout(res, Number(env("EMAIL_SEND_DELAY_MS") || 150)));   // gentle pacing
  }
  return stats;
}

// ---------- statistics (every number is a count of rows in the logs/events, so the dashboard can be checked against them) ----------
async function stats(admin: any, days = 14) {
  const today = istDate(Date.now()), from = addDaysIso(today, -(days - 1)), fromIso = new Date(istInstant(from, "00:00")).toISOString(), startToday = new Date(istInstant(today, "00:00")).toISOString();
  const cnt = async (t: string, f: (q: any) => any) => { const { count, error } = await f(admin.from(t).select("id", { count: "exact", head: true })); if (error) throw error; return count ?? 0; };
  const { data: camps } = await admin.from("email_campaigns").select("id,code,name,kind,step").order("step");
  const kindOf = new Map((camps ?? []).map((c: any) => [c.id, c.kind]));
  const [total, eligible, awaiting, withdrawn, verifiedProfiles, unsubscribed, hardBounced, complaints, deliveredAll, failedAll, bouncedAll, regAll, paidAll] = await Promise.all([
    cnt("email_contacts", (q) => q), cnt("email_contacts", (q) => CLEAN(q).in("first_email_status", ["ELIGIBLE", "QUEUED", "SENT"])),
    cnt("email_contacts", (q) => q.eq("consent_status", "UNKNOWN")), cnt("email_contacts", (q) => q.eq("consent_status", "WITHDRAWN")),
    cnt("email_events", (q) => q.eq("event_type", "profile_verified")), cnt("email_suppressions", (q) => q.eq("reason", "unsubscribed")),
    cnt("email_suppressions", (q) => q.in("reason", ["hard_bounce", "invalid"])), cnt("email_suppressions", (q) => q.eq("reason", "spam_complaint")),
    cnt("email_events", (q) => q.eq("event_type", "email_delivered")), cnt("email_events", (q) => q.eq("event_type", "email_failed")),
    cnt("email_events", (q) => q.eq("event_type", "email_bounced")), cnt("email_events", (q) => q.eq("event_type", "registration_completed")), cnt("email_events", (q) => q.eq("event_type", "payment_success")),
  ]);
  const logs = await all(() => admin.from("email_logs").select("campaign_id,status,created_at").eq("status", "accepted").gte("created_at", fromIso).order("created_at"));
  const events = await all(() => admin.from("email_events").select("event_type,campaign_id,occurred_at").gte("occurred_at", fromIso).order("occurred_at"));
  const dayOf = (iso: string) => istDate(Date.parse(iso));
  const series: any[] = []; for (let i = 0; i < days; i++) series.push({ date: addDaysIso(from, i), new: 0, reminders: 0, delivered: 0, clicked: 0, bounced: 0, failed: 0, registered: 0, paid: 0, unsubscribed: 0 });
  const byDay = new Map(series.map((s) => [s.date, s]));
  for (const l of logs) { const d = byDay.get(dayOf(l.created_at)); if (d) (kindOf.get(l.campaign_id) === "new" ? d.new++ : d.reminders++); }
  const MAP: any = { email_delivered: "delivered", email_clicked: "clicked", email_bounced: "bounced", email_failed: "failed", registration_completed: "registered", payment_success: "paid", email_unsubscribed: "unsubscribed" };
  for (const e of events) { const d = byDay.get(dayOf(e.occurred_at)), k = MAP[e.event_type]; if (d && k) d[k]++; }
  const todayRow: any = byDay.get(today) ?? {};
  // per campaign (all time): accepted from logs, the rest from events
  const perCamp: any[] = [];
  for (const c of camps ?? []) {
    const ev = async (t: string) => cnt("email_events", (q) => q.eq("campaign_id", c.id).eq("event_type", t));
    perCamp.push({ code: c.code, name: c.name, kind: c.kind, sent: await cnt("email_logs", (q) => q.eq("campaign_id", c.id).eq("status", "accepted")), delivered: await ev("email_delivered"), clicked: await ev("email_clicked"),
      bounced: await ev("email_bounced"), unsubscribed: await ev("email_unsubscribed"), registered: await ev("registration_completed"), paid: await ev("payment_success") });
  }
  return { date: today, cards: { total, eligible, awaiting, withdrawn, newToday: todayRow.new ?? 0, remindersToday: todayRow.reminders ?? 0, delivered: deliveredAll, failed: failedAll, bounced: bouncedAll, unsubscribed, hardBounced, complaints, registrations: regAll, paid: paidAll, verified: verifiedProfiles },
    today: { ...todayRow, startIso: startToday }, series, campaigns: perCamp };
}

// ---------- jobs: sheet sync, planning, sending, report ----------
async function claimJob(admin: any, key: string, kind: string) {
  const { error } = await admin.from("email_job_runs").insert({ job_key: key, kind });
  return !error;   // the primary key is the lock: a second worker's insert fails, so a job never runs twice
}
async function sendReport(admin: any, settings: any, provider: any, s: any) {
  if (!settings.report_to || !provider.configured) return false;
  const c = s.cards, t = s.today;
  const lines = [`Legal Staff email report for ${s.date}`, "", `New emails sent: ${t.new ?? 0}`, `Reminder emails sent: ${t.reminders ?? 0}`, `Delivered: ${t.delivered ?? 0}`, `Failed: ${t.failed ?? 0}`, `Bounced: ${t.bounced ?? 0}`, `Clicked: ${t.clicked ?? 0}`, `Registered: ${t.registered ?? 0}`, `Paid: ${t.paid ?? 0}`, `Unsubscribed: ${t.unsubscribed ?? 0}`, "", `Contacts: ${c.total} · eligible ${c.eligible} · awaiting permission ${c.awaiting}`];
  const r = await brevoSend(provider, { sender: { email: provider.sender_email, name: provider.sender_name }, to: [{ email: settings.report_to }], subject: `Legal Staff email report ${s.date}`, textContent: lines.join("\n"), htmlContent: `<pre style="font:14px/1.6 monospace">${lines.join("\n").replace(/</g, "&lt;")}</pre>` });
  return r.status >= 200 && r.status < 300;
}
async function tick(admin: any) {
  const now = Date.now(), today = istDate(now), settings = await getSettings(admin), provider = await getProvider(admin), out: any = { at: nowIso(), ran: [] };
  if (settings.kill_switch) { out.note = "emergency stop is on"; return out; }
  // 1. scheduled sheet sync
  const { data: integ } = await admin.from("google_sheets_integrations").select("*").eq("sync_enabled", true).limit(5);
  for (const i of integ ?? []) {
    const last = i.last_sync_at ? Date.parse(i.last_sync_at) : 0;
    if (now - last >= settings.sheet_sync_hours * 36e5 && (await claimJob(admin, `sync:${i.id}:${Math.floor(now / (settings.sheet_sync_hours * 36e5))}`, "sync"))) { try { out.ran.push({ job: "sheet_sync", ...(await runImport(admin, i, "scheduled", "scheduler")) }); } catch (e: any) { out.ran.push({ job: "sheet_sync", error: e.message }); } }
  }
  // 2. daily queues
  if (settings.system_enabled) for (const [kind, hm] of [["new", settings.new_email_time], ["reminder", settings.reminder_time]] as const) {
    if (!jobDue(now, hm)) continue;
    const key = `${settings.dry_run ? "sim" : "plan"}_${kind}:${today}`;
    if (!(await claimJob(admin, key, "plan"))) continue;
    const p = await plan(admin, kind, settings.dry_run, "scheduler");
    await admin.from("email_job_runs").update({ finished_at: nowIso(), summary: { kind, dry_run: settings.dry_run, selected: p.selected.length, queued: p.queued ?? 0, skipped: p.skipped.length, blockers: p.blockers, sample: p.selected.slice(0, 20) } }).eq("job_key", key);
    out.ran.push({ job: key, selected: p.selected.length, queued: p.queued ?? 0 });
  }
  // 3. send what is queued (production only)
  out.drain = await drain(admin, Number(env("EMAIL_BATCH") || 25));
  // 4. daily report
  if (jobDue(now, settings.report_time) && (await claimJob(admin, `report:${today}`, "report"))) {
    const s = await stats(admin, 2); const mailed = await sendReport(admin, settings, provider, s).catch(() => false);
    await admin.from("email_job_runs").update({ finished_at: nowIso(), summary: { ...s.today, cards: s.cards, mailed } }).eq("job_key", `report:${today}`); out.ran.push({ job: "report", mailed });
  }
  return out;
}

// ---------- webhooks and recipients ----------
async function webhook(admin: any, req: Request, url: URL) {
  const secret = env("BREVO_WEBHOOK_SECRET"); if (!secret) throw new Fail("Webhook secret is not configured.", 501);
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") || url.searchParams.get("key") || "";
  if (!safeEqual(given, secret)) throw new Fail("Not allowed.", 403);
  const body = await req.json().catch(() => null); if (!body) throw new Fail("Bad request.");
  const list = Array.isArray(body) ? body : [body]; const res = { received: list.length, recorded: 0, ignored: 0, suppressed: 0 };
  for (const ev of list) {
    const k = classifyBrevoEvent(ev); if (!k) { res.ignored++; continue; }
    const mid = String(ev["message-id"] ?? ev.messageId ?? "").replace(/^<|>$/g, ""), email = normEmail(ev.email);
    let q: any = null; if (mid) q = (await admin.from("email_queue").select("id,contact_id,campaign_id").eq("provider_message_id", mid).maybeSingle()).data;
    let contactId = q?.contact_id ?? null; if (!contactId && email) contactId = (await admin.from("email_contacts").select("id").eq("email_normalized", email).maybeSingle()).data?.id ?? null;
    const at = ev.ts_event ? new Date(Number(ev.ts_event) * 1000).toISOString() : ev.date ? new Date(ev.date).toISOString() : nowIso();
    const dedupe = k.type === "email_clicked" ? `click:${contactId}:${q?.campaign_id ?? ""}` : `${k.type}:${mid || email}:${ev.id ?? ev.ts_event ?? ""}`;
    const { error } = await admin.from("email_events").upsert({ event_type: k.type, contact_id: contactId, campaign_id: q?.campaign_id ?? null, queue_id: q?.id ?? null, provider_message_id: mid || null, meta: { event: ev.event, link: ev.link ?? undefined, reason: ev.reason ?? undefined }, dedupe_key: dedupe, occurred_at: at }, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (error) throw error; res.recorded++;
    if (k.suppress && email) { await admin.rpc("email_suppress", { p_email: email, p_reason: k.suppress, p_source: "webhook:" + ev.event, p_actor: "provider" }); res.suppressed++; }
  }
  return res;
}
async function unsub(admin: any, req: Request, url: URL) {
  const secret = tokenSecret();
  let t = url.searchParams.get("t") ?? "";
  if (req.method === "POST") { const ct = req.headers.get("content-type") ?? ""; if (ct.includes("json")) t = (await req.json().catch(() => ({}))).t ?? t; else if (ct.includes("form")) t = (await req.formData().catch(() => null))?.get("t")?.toString() ?? t; }
  const tok = await readToken(secret, t); if (!tok || tok.kind !== "u") throw new Fail("This unsubscribe link is not valid.", 400);
  const { data: c } = await admin.from("email_contacts").select("id,email_normalized,unsubscribe_status").eq("id", tok.contactId).maybeSingle(); if (!c) throw new Fail("This unsubscribe link is not valid.", 400);
  const masked = c.email_normalized.replace(/^(.).*(@.*)$/, "$1***$2");
  if (req.method !== "POST") return { email: masked, unsubscribed: c.unsubscribe_status === "UNSUBSCRIBED" };
  await admin.rpc("email_suppress", { p_email: c.email_normalized, p_reason: "unsubscribed", p_source: "link", p_actor: "recipient" });
  await admin.from("email_events").upsert({ event_type: "email_unsubscribed", contact_id: c.id, dedupe_key: "unsub:" + c.id }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  return { email: masked, unsubscribed: true };
}
async function landing(admin: any, req: Request) {
  const b = await req.json().catch(() => ({})); const tok = await readToken(tokenSecret(), b.t); if (!tok || tok.kind !== "l") throw new Fail("Not a valid link.", 400);
  const { data: camp } = await admin.from("email_campaigns").select("id").eq("code", tok.campaignCode).maybeSingle();
  const type = b.event === "registration_started" ? "registration_started" : "email_clicked";
  await admin.from("email_events").upsert({ event_type: type, contact_id: tok.contactId, campaign_id: camp?.id ?? null, dedupe_key: type === "email_clicked" ? `click:${tok.contactId}:${camp?.id ?? ""}` : `registration_started:${tok.contactId}:once` }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (type === "registration_started") { const { data: cc } = await admin.from("email_contacts").select("email_normalized").eq("id", tok.contactId).maybeSingle(); if (cc) await admin.rpc("email_record_conversion", { p_email: cc.email_normalized, p_event: "registration_started", p_ref: "once" }); }
  return { ok: true };
}

// ---------- DNS check of the sending domain (indicative: the provider's own dashboard is authoritative) ----------
async function dns(name: string, type: string): Promise<string[]> {
  try { const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, { headers: { Accept: "application/dns-json" } }); const j = await r.json(); return (j.Answer ?? []).map((a: any) => String(a.data).replace(/^"|"$/g, "").replace(/"\s*"/g, "")); } catch { return []; }
}
async function checkDomain(domain: string) {
  const [txt, dmarc, k1, k2, kt] = await Promise.all([dns(domain, "TXT"), dns("_dmarc." + domain, "TXT"), dns("brevo1._domainkey." + domain, "CNAME"), dns("brevo2._domainkey." + domain, "CNAME"), dns("mail._domainkey." + domain, "TXT")]);
  const spf = txt.some((t) => /^v=spf1/i.test(t) && /brevo|sendinblue/i.test(t)), dkim = k1.length > 0 || k2.length > 0 || kt.some((t) => /p=/.test(t)), dm = dmarc.some((t) => /^v=DMARC1/i.test(t));
  return { spf, dkim, dmarc: dm, all: spf && dkim && dm };
}

// ---------- the administrator API ----------
const CONTACT_COLS = "id,contact_id,advocate_name,email,city,state,contact_source,source_url,consent_status,consent_source,consent_timestamp,consent_verified_at,first_email_status,first_email_date,reminder_due_date,reminder_count,registration_status,payment_status,profile_verified,unsubscribe_status,hard_bounced,spam_complaint,last_updated";
function applyFilters(q: any, f: any) {
  if (f.state) q = q.eq("state", f.state); if (f.city) q = q.eq("city", f.city); if (f.consent) q = q.eq("consent_status", f.consent);
  if (f.email_status) q = q.eq("first_email_status", f.email_status); if (f.registration) q = q.eq("registration_status", f.registration); if (f.payment) q = q.eq("payment_status", f.payment);
  const s = String(f.q ?? "").replace(/[%,()*\\]/g, " ").trim(); if (s) q = q.or(`advocate_name.ilike.%${s}%,email_normalized.ilike.%${s}%,contact_id.ilike.%${s}%`);
  return q;
}
const pick = (o: any, keys: string[]) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
const SETTING_KEYS = ["system_enabled", "legal_approval", "legal_approval_ref", "provider_approved", "provider_approval_ref", "dry_run", "max_new_per_day", "max_reminders_per_day", "new_email_time", "reminder_time", "report_time", "reminder_after_days", "max_reminders", "sheet_sync_hours", "report_to"];

async function adminApi(admin: any, actor: string, action: string, b: any) {
  switch (action) {
    case "overview": {
      const [s, settings, provider, jobs] = [await stats(admin), await getSettings(admin), await getProvider(admin), (await admin.from("email_job_runs").select("job_key,kind,started_at,finished_at,summary").order("started_at", { ascending: false }).limit(10)).data ?? []];
      return { ...s, settings, provider: publicProvider(provider), blockers: productionBlockers(settings, provider), next: { new: nextRun(Date.now(), settings.new_email_time), reminder: nextRun(Date.now(), settings.reminder_time), report: nextRun(Date.now(), settings.report_time) }, jobs };
    }
    case "analytics": return await stats(admin, Math.min(90, Math.max(7, Number(b.days) || 30)));
    case "contacts": {
      const page = Math.max(0, Number(b.page) || 0), size = Math.min(100, Math.max(10, Number(b.size) || 25));
      const { data, count, error } = await applyFilters(admin.from("email_contacts").select(CONTACT_COLS, { count: "exact" }), b.filters ?? {}).order("created_at", { ascending: false }).range(page * size, page * size + size - 1);
      if (error) throw error;
      const [states, cities] = await Promise.all([admin.from("email_contacts").select("state").neq("state", "").limit(5000), admin.from("email_contacts").select("city").neq("city", "").limit(5000)]);
      return { rows: data, total: count, page, size, states: [...new Set((states.data ?? []).map((r: any) => r.state))].sort(), cities: [...new Set((cities.data ?? []).map((r: any) => r.city))].sort().slice(0, 500) };
    }
    case "contact": {
      const { data: c } = await admin.from("email_contacts").select("*").eq("contact_id", String(b.contact_id)).maybeSingle(); if (!c) throw new Fail("Contact not found.", 404);
      const [consents, logs, events, queue, sup] = await Promise.all([admin.from("email_consents").select("*").eq("contact_id", c.id).order("created_at", { ascending: false }), admin.from("email_logs").select("*").eq("contact_id", c.id).order("created_at", { ascending: false }).limit(100),
        admin.from("email_events").select("event_type,campaign_id,occurred_at,meta").eq("contact_id", c.id).order("occurred_at", { ascending: false }).limit(100), admin.from("email_queue").select("*").eq("contact_id", c.id).order("created_at", { ascending: false }), admin.from("email_suppressions").select("*").eq("email_normalized", c.email_normalized).maybeSingle()]);
      return { contact: c, consents: consents.data, logs: logs.data, events: events.data, queue: queue.data, suppression: sup.data };
    }
    case "export": {
      const rows = await all(() => applyFilters(admin.from("email_contacts").select(CONTACT_COLS), b.filters ?? {}).order("created_at"));
      const cols = [["contact_id", "Contact ID"], ["advocate_name", "Advocate name"], ["email", "Email"], ["city", "City"], ["state", "State"], ["contact_source", "Contact source"], ["consent_status", "Consent status"], ["first_email_status", "First email status"], ["first_email_date", "First email date"], ["reminder_count", "Reminders sent"], ["reminder_due_date", "Reminder due"], ["registration_status", "Registration status"], ["payment_status", "Payment status"], ["unsubscribe_status", "Unsubscribe"]].map(([key, label]) => ({ key, label }));
      await audit(admin, actor, "contacts_exported", "", { rows: rows.length, filters: b.filters ?? {}, format: b.format });
      return b.format === "xls" ? { filename: "legal-staff-contacts.xls", mime: "application/vnd.ms-excel", content: toExcelXml(cols, rows) } : { filename: "legal-staff-contacts.csv", mime: "text/csv", content: toCsv(cols, rows) };
    }
    case "consent_record": {
      const at = new Date(b.consented_at); if (isNaN(+at) || +at > Date.now() + 6e4) throw new Fail("Give the date the person gave permission (not in the future).");
      const ver = b.verified_at ? new Date(b.verified_at) : null; if (ver && isNaN(+ver)) throw new Fail("Verification date is not valid.");
      const { data: c } = await admin.from("email_contacts").select("id,contact_id,unsubscribe_status,hard_bounced,spam_complaint").eq("contact_id", String(b.contact_id)).maybeSingle(); if (!c) throw new Fail("Contact not found.", 404);
      if (c.unsubscribe_status === "UNSUBSCRIBED") throw new Fail("This contact unsubscribed. Lift the suppression with documented fresh permission first.");
      if (c.hard_bounced || c.spam_complaint) throw new Fail("This address bounced or complained and cannot receive marketing.");
      const { data, error } = await admin.rpc("email_apply_consent", { p_contact: c.id, p_source: String(b.source ?? ""), p_wording: String(b.wording_version ?? ""), p_at: at.toISOString(), p_verified: ver ? ver.toISOString() : null, p_evidence: String(b.evidence_ref ?? ""), p_by: actor });
      if (error) throw new Fail(error.message); return { consent_id: data };
    }
    case "consent_verify": { const { data: c } = await admin.from("email_contacts").select("id").eq("contact_id", String(b.contact_id)).maybeSingle(); if (!c) throw new Fail("Contact not found.", 404);
      const { error } = await admin.rpc("email_verify_consent", { p_contact: c.id, p_at: nowIso(), p_by: actor }); if (error) throw new Fail(error.message); return { ok: true }; }
    case "suppressions": { const page = Math.max(0, Number(b.page) || 0); const { data, count } = await admin.from("email_suppressions").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * 50, page * 50 + 49); return { rows: data, total: count, page }; }
    case "suppress_add": { if (!isValidEmail(b.email)) throw new Fail("Enter a valid email."); await admin.rpc("email_suppress", { p_email: b.email, p_reason: "manual", p_source: "admin", p_actor: actor }); return { ok: true }; }
    case "suppression_lift": { const { error } = await admin.rpc("email_lift_suppression", { p_email: b.email, p_actor: actor, p_note: String(b.note ?? "") }); if (error) throw new Fail(error.message); return { ok: true }; }

    case "sheets_get": { const { data } = await admin.from("google_sheets_integrations").select("*").order("created_at", { ascending: false }).limit(1); const p = await getProvider(admin);
      return { integration: data?.[0] ?? null, google_connected: !!env("GOOGLE_SERVICE_ACCOUNT_JSON"), service_account: (parseServiceAccount(env("GOOGLE_SERVICE_ACCOUNT_JSON"))?.client_email ?? ""), mappable: MAPPABLE, provider_ready: p.configured }; }
    case "sheets_connect": {
      const id = parseSpreadsheetId(b.url); if (!id) throw new Fail("Paste the spreadsheet URL or its ID.");
      const info = await sheetInfo(id); const sheet = info.sheets.find((s: any) => s.title === b.sheet) ?? info.sheets[0]; if (!sheet) throw new Fail("The spreadsheet has no sheets.");
      const top = await sheetValues(id, sheet.title, 15), head = top[findHeaderRow(top)] ?? [];   // title banner rows above the header are skipped
      const { data: ex } = await admin.from("google_sheets_integrations").select("*").eq("spreadsheet_id", id).maybeSingle();
      const map = ex && ex.sheet_name === sheet.title && Object.keys(ex.column_map ?? {}).length ? ex.column_map : autoMapColumns(head);
      const row = { spreadsheet_id: id, spreadsheet_url: String(b.url).slice(0, 500), spreadsheet_title: info.title, sheet_name: sheet.title, column_map: map, created_by: actor, updated_at: nowIso() };
      const { data: saved, error } = await admin.from("google_sheets_integrations").upsert(row, { onConflict: "spreadsheet_id" }).select("*").single(); if (error) throw error;
      await audit(admin, actor, "sheet_connected", id, { title: info.title, sheet: sheet.title }); return { integration: saved, sheets: info.sheets, headers: head };
    }
    case "sheets_preview": {
      const { data: i } = await admin.from("google_sheets_integrations").select("*").eq("id", b.id).single(); const map = b.column_map ?? i.column_map; const pr = mappingProblems(map); if (pr.length) throw new Fail(pr[0]);
      const values = await sheetValues(i.spreadsheet_id, b.sheet ?? i.sheet_name), rows = mapRows(values, map), seen = new Map<string, number>(); let invalid = 0, dup = 0; const valid: any[] = [];
      for (const r of rows) { const n = normEmail(r.email); if (!isValidEmail(n)) { invalid++; continue; } if (seen.has(n)) { dup++; continue; } seen.set(n, r.row); valid.push({ ...r, n }); }
      let existing = 0; for (let k = 0; k < valid.length; k += 200) existing += ((await admin.from("email_contacts").select("id", { count: "exact", head: true }).in("email_normalized", valid.slice(k, k + 200).map((v) => v.n))).count ?? 0);
      return { headers: values[findHeaderRow(values)] ?? [], total: rows.length, valid: valid.length, new: valid.length - existing, existing, duplicates: dup, invalid, sample: rows.slice(0, 15), note: "Imported contacts start as consent UNKNOWN and first email BLOCKED." };
    }
    case "sheets_save": {
      const upd: any = { updated_at: nowIso() }; if (b.sheet) upd.sheet_name = String(b.sheet); if (b.column_map) { const pr = mappingProblems(b.column_map); if (pr.length) throw new Fail(pr[0]); upd.column_map = pick(b.column_map, MAPPABLE); } if (typeof b.sync_enabled === "boolean") upd.sync_enabled = b.sync_enabled;
      const { data, error } = await admin.from("google_sheets_integrations").update(upd).eq("id", b.id).select("*").single(); if (error) throw error; await audit(admin, actor, "sheet_settings_saved", data.spreadsheet_id, { sync: data.sync_enabled, sheet: data.sheet_name }); return { integration: data };
    }
    case "sheets_sync": { const { data: i } = await admin.from("google_sheets_integrations").select("*").eq("id", b.id).single(); if (!i) throw new Fail("Connect a sheet first."); return await runImport(admin, i, "manual", actor); }
    case "imports": return { rows: (await admin.from("email_import_runs").select("*").order("started_at", { ascending: false }).limit(50)).data };

    case "campaigns": { const s = await stats(admin, 14); const { data } = await admin.from("email_campaigns").select("*").order("step"); return { campaigns: data.map((c: any) => ({ ...c, ...s.campaigns.find((x: any) => x.code === c.code) })) }; }
    case "templates": return { rows: (await admin.from("email_templates").select("*").order("created_at")).data, vars: ["advocate_name", "unsubscribe_url", "directory_url", "city", "state", "contact_id"] };
    case "template_save": {
      const t = { subject: String(b.subject ?? ""), body_html: String(b.body_html ?? ""), body_text: String(b.body_text ?? "") }; const pr = templateProblems(t); if (pr.length) throw new Fail(pr[0]);
      const { data: cur } = await admin.from("email_templates").select("*").eq("key", b.key).single(); if (!cur) throw new Fail("Template not found.", 404);
      const { data, error } = await admin.from("email_templates").update({ ...t, name: String(b.name ?? cur.name).slice(0, 100), version: cur.version + 1, updated_by: actor, updated_at: nowIso() }).eq("key", b.key).select("*").single(); if (error) throw error;
      await audit(admin, actor, "template_saved", b.key, { version: data.version }); return { template: data };
    }
    case "template_toggle": {
      const s = await getSettings(admin); if (b.active && !canActivateTemplate(s)) throw new Fail("Promotional templates can only be activated after legal approval is recorded in Automation Settings.");
      const { data: cur } = await admin.from("email_templates").select("subject,body_html,body_text").eq("key", b.key).single(); if (b.active) { const pr = templateProblems(cur); if (pr.length) throw new Fail(pr[0]); }
      await admin.from("email_templates").update({ active: !!b.active, updated_at: nowIso(), updated_by: actor }).eq("key", b.key); await audit(admin, actor, b.active ? "template_activated" : "template_deactivated", b.key); return { ok: true };
    }
    case "template_preview": {
      const t = { subject: String(b.subject ?? ""), body_html: String(b.body_html ?? ""), body_text: String(b.body_text ?? "") };
      return renderTemplate(t, { advocate_name: b.sample_name || "Rajesh Kumar", unsubscribe_url: SITE + "/unsubscribe?t=preview", directory_url: trackedUrl(DIRECTORY_URL, "preview", 0, ""), city: "Patna", state: "Bihar", contact_id: "LSC-000000" });
    }
    case "template_test": {
      const provider = await getProvider(admin); if (!provider.configured) throw new Fail("The email provider is not configured, so a test email cannot be sent.", 400);
      const to = normEmail(b.to || actor); const { data: ok } = await admin.from("super_admins").select("email").eq("email", to).maybeSingle(); if (!ok) throw new Fail("Test emails can only be sent to an administrator's own address.", 403);
      const m = renderTemplate({ subject: String(b.subject ?? ""), body_html: String(b.body_html ?? ""), body_text: String(b.body_text ?? "") }, { advocate_name: "Test Advocate", unsubscribe_url: SITE + "/unsubscribe?t=test", directory_url: DIRECTORY_URL, city: "", state: "", contact_id: "TEST" });
      const r = await brevoSend(provider, { sender: { email: provider.sender_email, name: provider.sender_name }, to: [{ email: to }], subject: "[TEST] " + m.subject, htmlContent: m.html, textContent: m.text, tags: ["test"] });
      if (r.status < 200 || r.status >= 300) throw new Fail(`The provider refused the test email (${r.status}). ${r.error}`, 502); await audit(admin, actor, "test_email_sent", to, { template: b.key }); return { sent_to: to };
    }
    case "queue": { const { data } = await admin.from("email_queue").select("*, email_contacts(contact_id,advocate_name,email_normalized), email_campaigns(code,name)").in("status", b.status ? [b.status] : ["queued", "sending", "failed", "skipped"]).order("created_at", { ascending: false }).limit(200);
      const { data: all2 } = await admin.from("email_queue").select("status").gte("scheduled_date", addDaysIso(istDate(Date.now()), -7)); const counts: any = {}; (all2 ?? []).forEach((r: any) => counts[r.status] = (counts[r.status] ?? 0) + 1); return { rows: data, counts }; }
    case "queue_cancel": { const { data } = await admin.from("email_queue").update({ status: "skipped", skip_reason: "cancelled by " + actor, updated_at: nowIso() }).eq("status", "queued").select("id,contact_id");
      for (const r of data ?? []) await admin.from("email_contacts").update({ first_email_status: "ELIGIBLE" }).eq("id", r.contact_id).eq("first_email_status", "QUEUED"); await audit(admin, actor, "queue_cancelled", "", { n: data?.length ?? 0 }); return { cancelled: data?.length ?? 0 }; }
    case "history": { const page = Math.max(0, Number(b.page) || 0); let q = admin.from("email_logs").select("*, email_campaigns(code)", { count: "exact" }); if (b.status) q = q.eq("status", b.status); if (b.q) q = q.ilike("to_email", `%${String(b.q).replace(/[%,()*]/g, "")}%`);
      const { data, count } = await q.order("created_at", { ascending: false }).range(page * 50, page * 50 + 49); return { rows: data, total: count, page }; }
    case "audit": { const { data } = await admin.from("email_audit_logs").select("*").order("created_at", { ascending: false }).limit(100); return { rows: data }; }

    case "settings": { const [s, p] = [await getSettings(admin), await getProvider(admin)]; return { settings: s, provider: publicProvider(p), blockers: productionBlockers(s, p), next: { new: nextRun(Date.now(), s.new_email_time), reminder: nextRun(Date.now(), s.reminder_time), report: nextRun(Date.now(), s.report_time) } }; }
    case "settings_save": {
      const cur = await getSettings(admin), patch = pick(b.settings ?? {}, SETTING_KEYS), next = { ...cur, ...patch };
      for (const k of ["max_new_per_day", "max_reminders_per_day", "reminder_after_days", "max_reminders", "sheet_sync_hours"]) if (k in patch && (!Number.isInteger(Number(patch[k])) || Number(patch[k]) < 0)) throw new Fail(`${k} must be a whole number.`);
      for (const k of ["new_email_time", "reminder_time", "report_time"]) if (k in patch && !/^([01]\d|2[0-3]):[0-5]\d$/.test(patch[k])) throw new Fail(`${k} must be HH:MM (24-hour, India time).`);
      if (patch.report_to && !isValidEmail(patch.report_to)) throw new Fail("Report address is not a valid email.");
      if (patch.legal_approval === false || patch.provider_approved === false) patch.system_enabled = next.system_enabled = false;   // withdrawing an approval switches automation off
      const pr = settingsProblem(next); if (pr) throw new Fail(pr);
      if (patch.system_enabled === true && !cur.system_enabled) { const p = await getProvider(admin); if (!p.configured) throw new Fail("The email provider is not configured (API key and sender), so automation cannot be enabled."); }
      if (patch.legal_approval === false) await admin.from("email_templates").update({ active: false }).eq("active", true);
      const { data, error } = await admin.from("email_automation_settings").update({ ...patch, updated_at: nowIso(), updated_by: actor }).eq("id", 1).select("*").single(); if (error) throw new Fail(error.message);
      const changed = Object.fromEntries(Object.entries(patch).filter(([k, v]) => cur[k] !== v)); await audit(admin, actor, "settings_changed", "", changed);
      return { settings: data, blockers: productionBlockers(data, await getProvider(admin)) };
    }
    case "kill": { const on = !!b.on; await admin.from("email_automation_settings").update({ kill_switch: on, updated_at: nowIso(), updated_by: actor }).eq("id", 1); await audit(admin, actor, on ? "kill_switch_on" : "kill_switch_off"); return { kill_switch: on }; }
    case "simulate": { const kinds: any[] = b.kind ? [b.kind] : ["new", "reminder"]; const out: any = {}; for (const k of kinds) out[k] = await plan(admin, k, true, actor); if (!b.quiet) await audit(admin, actor, "dry_run", "", { new: out.new?.selected.length, reminder: out.reminder?.selected.length }); return out; }
    case "preview_schedule": {
      const out: any = {}; for (const k of ["new", "reminder"] as const) { const p = await plan(admin, k, true, actor); const { data: camps } = await admin.from("email_campaigns").select("*").eq("kind", k);
        const sample = []; for (const s of p.selected.slice(0, 3)) { const { data: c } = await admin.from("email_contacts").select("*").eq("contact_id", s.contact_id).single(); const camp = camps.find((x: any) => x.code === s.campaign); const { data: t } = await admin.from("email_templates").select("*").eq("key", camp.template_key).single(); sample.push({ to: c.email_normalized, ...(await buildMessage(t, camp, c).then((m) => ({ subject: m.subject, html: m.html, text: m.text }))) }); }
        out[k] = { count: p.selected.length, cap: p.cap, remaining: p.remaining, sample }; }
      return out;
    }
    case "provider": return { provider: publicProvider(await getProvider(admin)) };
    case "provider_save": {
      const email = normEmail(b.sender_email); if (!isValidEmail(email)) throw new Fail("Enter a valid sender address on your own domain."); if (/@(gmail|yahoo|outlook|hotmail|rediffmail)\./.test(email)) throw new Fail("Use a sender address on your own authenticated domain. Personal mailboxes are not allowed for campaigns.");
      const { data, error } = await admin.from("email_provider_settings").update({ sender_email: email, sender_name: String(b.sender_name || "Legal Staff").slice(0, 100), reply_to: b.reply_to && isValidEmail(b.reply_to) ? normEmail(b.reply_to) : "", sender_domain: email.split("@")[1], domain_authenticated: false, spf_ok: null, dkim_ok: null, dmarc_ok: null, updated_at: nowIso() }).eq("id", 1).select("*").single(); if (error) throw error;
      await audit(admin, actor, "provider_sender_saved", email); return { provider: publicProvider({ ...data, apiKey: env("BREVO_API_KEY") }) };
    }
    case "provider_check": {
      const p = await getProvider(admin); if (!p.sender_domain) throw new Fail("Save the sender address first."); const r = await checkDomain(p.sender_domain);
      await admin.from("email_provider_settings").update({ spf_ok: r.spf, dkim_ok: r.dkim, dmarc_ok: r.dmarc, domain_authenticated: r.all, dns_checked_at: nowIso() }).eq("id", 1); await audit(admin, actor, "domain_checked", p.sender_domain, r); return r;
    }
    case "report_now": { const s = await stats(admin, 2); const settings = await getSettings(admin); const mailed = await sendReport(admin, settings, await getProvider(admin), s).catch(() => false); return { ...s.today, cards: s.cards, mailed }; }
    default: throw new Fail("Unknown action.", 400);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url), admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  try {
    const qa = url.searchParams.get("action");
    if (qa === "webhook") { limit("wh:" + ip, 600); return json(await webhook(admin, req, url)); }
    if (qa === "unsub") { limit("un:" + ip, 30); return json(await unsub(admin, req, url)); }
    if (qa === "landing") { limit("ld:" + ip, 60); return json(await landing(admin, req)); }
    const body = await req.json().catch(() => ({})), action = body.action ?? "";
    const hdr = req.headers.get("x-cron-secret");
    if (hdr) {
      const cs = env("CRON_SECRET"); let okSecret = !!cs && safeEqual(hdr, cs);
      if (!okSecret) { const { data } = await admin.rpc("cron_secret_ok", { s: hdr }); okSecret = data === true; }
      if (!okSecret) throw new Fail("Not allowed.", 403);
      if (action !== "tick") throw new Fail("Unknown action.", 400);
      return json(await tick(admin));
    }
    const asUser = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser(); if (!user) throw new Fail("Sign in again.", 401);
    const email = normEmail(user.email); limit("ad:" + email, 240);
    const { data: ok } = await admin.from("super_admins").select("email").eq("email", email).maybeSingle();
    if (!ok || !user.email_confirmed_at) throw new Fail("This account is not a Legal Staff administrator.", 403);
    return json(await adminApi(admin, email, action, body));
  } catch (e: any) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error("email-marketing", scrub(e?.message ?? e)); return json({ error: "Something went wrong: " + scrub(e?.message ?? "unknown error").slice(0, 200) }, 500);
  }
});

// Legal Staff email marketing: the pure rules (no database, no network). Imported by functions/email-marketing and unit-tested in node
// (tests/email-logic.test.mjs). Everything that decides WHETHER an email may be sent lives here so it can be tested without sending anything.

export const SITE = "https://legalstaff.in";
export const DIRECTORY_URL = SITE + "/directory";

// ---------- addresses and sheet columns ----------
export const normEmail = (v) => String(v ?? "").trim().toLowerCase();
export const isValidEmail = (v) => { const n = normEmail(v); return n.length <= 254 && /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(n); };

/** Accepts a full Google Sheets URL or a bare spreadsheet ID; returns the ID or "". */
export function parseSpreadsheetId(input) {
  const s = String(input ?? "").trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
  if (m) return m[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(s) ? s : "";
}

export const SOURCE_FIELDS = ["advocate_name", "email", "city", "state", "contact_source", "source_url"];
export const CONSENT_FIELDS = ["consent_source", "consent_timestamp", "consent_verified_at", "consent_evidence_ref", "consent_wording_version"];
export const MAPPABLE = [...SOURCE_FIELDS, ...CONSENT_FIELDS];
const ALIASES = {
  advocate_name: ["advocate_name", "advocate name", "name", "full name", "advocate"], email: ["email", "email address", "e-mail", "mail", "email id"],
  city: ["city", "district", "town", "location"], state: ["state"], contact_source: ["contact_source", "contact source"], source_url: ["source_url", "source url", "source", "url", "link"],
  consent_source: ["consent_source", "consent source"], consent_timestamp: ["consent_timestamp", "consent timestamp", "consented_at", "consent date"],
  consent_verified_at: ["consent_verified_at", "consent verified at", "email_verified_at"], consent_evidence_ref: ["consent_evidence_ref", "evidence_ref", "consent evidence", "evidence"],
  consent_wording_version: ["consent_wording_version", "wording_version", "consent wording"],
};
/** Suggests { field: header } from a header row. Unmatched fields are left out. */
export function autoMapColumns(headers) {
  const norm = headers.map((h) => String(h ?? "").trim().toLowerCase().replace(/[\s-]+/g, " "));
  const out = {};
  for (const f of MAPPABLE) for (const a of ALIASES[f]) { const i = norm.indexOf(a.replace(/_/g, " ")) >= 0 ? norm.indexOf(a.replace(/_/g, " ")) : norm.indexOf(a); if (i >= 0) { out[f] = headers[i]; break; } }
  return out;
}
/** Index of the header row: the first of the first 15 rows with a cell that names the email column (sheets often start with title banner rows). 0 when none does. */
export function findHeaderRow(values) {
  for (let i = 0; i < Math.min(values.length, 15); i++) {
    const cells = (values[i] || []).map((h) => String(h ?? "").trim().toLowerCase().replace(/[\s-]+/g, " "));
    if (cells.some((c) => ALIASES.email.some((a) => c === a || c === a.replace(/_/g, " ")))) return i;
  }
  return 0;
}
/** Turns raw sheet rows (arrays; the header row is found by findHeaderRow) into objects for email_import_rows. `row` is the 1-based number of the row in the sheet. */
export function mapRows(values, map) {
  const h = findHeaderRow(values), header = values[h] || [], rows = values.slice(h + 1);
  const idx = {}; for (const [f, name] of Object.entries(map)) { const i = header.findIndex((x) => String(x).trim() === String(name).trim()); if (i >= 0) idx[f] = i; }
  return rows.map((r, n) => { const o = { row: h + n + 2 }; for (const [f, i] of Object.entries(idx)) o[f] = String(r[i] ?? "").trim(); return o; }).filter((o) => Object.entries(o).some(([k, v]) => k !== "row" && v));
}
/** Fields a mapping must contain before an import can run. */
export const mappingProblems = (map) => (map && map.email ? [] : ["Map the email column."]);

// ---------- time (India) ----------
const IST = 5.5 * 3600e3;
export const istDate = (ms) => new Date(ms + IST).toISOString().slice(0, 10);
export const istHm = (ms) => new Date(ms + IST).toISOString().slice(11, 16);
export const addDaysIso = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
/** UTC instant of a given IST day at HH:MM. */
export const istInstant = (date, hm) => Date.parse(`${date}T${hm}:00Z`) - IST;
/** A daily job is due once its IST time has passed today and no more than `windowH` hours have gone by (a late tick still runs it; a day later it does not). */
export function jobDue(nowMs, hm, windowH = 5) { const at = istInstant(istDate(nowMs), hm); return nowMs >= at && nowMs - at <= windowH * 36e5; }
/** The next time a daily job at HH:MM runs (ISO), counting today only when it has not yet passed. */
export function nextRun(nowMs, hm) { const t = istInstant(istDate(nowMs), hm); return new Date(nowMs < t ? t : t + 864e5).toISOString(); }
export const remainingToday = (limit, doneToday) => Math.max(0, Number(limit || 0) - Number(doneToday || 0));

// ---------- the compliance gate ----------
// Every check from the specification, in order. Used when the planner picks contacts AND again immediately before each send
// (with freshly read data), so a change made in between is honoured.
export const REASONS = {
  NO_CONSENT: "No documented marketing permission",
  NOT_VERIFIED: "Email address not verified",
  LEGAL: "Legal approval of the campaign model is not recorded",
  PROVIDER: "Email provider is not approved or not configured",
  UNSUBSCRIBED: "Contact has unsubscribed",
  HARD_BOUNCE: "Address hard-bounced",
  SPAM: "Contact marked a message as spam",
  CONVERTED: "Contact has already registered or paid",
  ALREADY_SENT: "This campaign was already sent to the contact",
  SYSTEM: "Automation is not enabled",
  KILL: "Emergency stop is on",
  TEMPLATE: "Template is not active",
  NOT_DUE: "Reminder is not due yet",
  NO_FIRST: "First email has not been sent",
  MAX_REMINDERS: "Maximum number of follow-ups reached",
  WRONG_STEP: "Not the next campaign step for this contact",
  INVALID_EMAIL: "Invalid email address",
  SUPPRESSED: "Address is on the suppression list",
};
/** Reasons that mean "hold everything" (an administrator switch), not "skip this contact". */
export const GLOBAL = new Set(["LEGAL", "PROVIDER", "SYSTEM", "KILL", "TEMPLATE"]);

/**
 * @param {object} i
 *  contact   row of email_contacts          settings  email_automation_settings
 *  campaign  {kind, step}                   template  {active}
 *  provider  {approved:boolean, configured:boolean}
 *  suppressed boolean (suppression list)    alreadySent boolean (queue/log row for this campaign + contact)
 *  hasConsentRecord boolean                 todayIst 'YYYY-MM-DD'
 *  dryRun    boolean (a dry run does not need the production switches to be on, but reports them)
 * @returns {{ok:boolean, reasons:string[], hold:boolean}} ok only when nothing blocks; hold when only administrator switches block
 */
export function evaluateEligibility(i) {
  const c = i.contact, s = i.settings, r = [];
  if (s.kill_switch) r.push("KILL");
  if (!s.system_enabled) r.push("SYSTEM");
  if (!s.legal_approval) r.push("LEGAL");
  if (!s.provider_approved || !i.provider?.configured) r.push("PROVIDER");
  if (!isValidEmail(c.email_normalized)) r.push("INVALID_EMAIL");
  if (c.consent_status !== "GRANTED" || !i.hasConsentRecord) r.push("NO_CONSENT");
  if (!c.consent_verified_at) r.push("NOT_VERIFIED");
  if (c.unsubscribe_status === "UNSUBSCRIBED") r.push("UNSUBSCRIBED");
  if (i.suppressed) r.push("SUPPRESSED");
  if (c.hard_bounced) r.push("HARD_BOUNCE");
  if (c.spam_complaint) r.push("SPAM");
  if (c.registration_status === "COMPLETED" || c.payment_status === "PAID") r.push("CONVERTED");
  if (i.alreadySent) r.push("ALREADY_SENT");
  if (!i.template?.active) r.push("TEMPLATE");
  if (i.campaign.kind === "new") {
    if (c.first_email_status !== "ELIGIBLE" && c.first_email_status !== "QUEUED") r.push(c.first_email_status === "SENT" ? "ALREADY_SENT" : "NO_CONSENT");
  } else {
    if (c.first_email_status !== "SENT") r.push("NO_FIRST");
    else {
      if (c.reminder_count >= s.max_reminders) r.push("MAX_REMINDERS");
      else if (c.reminder_count + 1 !== i.campaign.step) r.push("WRONG_STEP");
      if (!c.reminder_due_date || c.reminder_due_date > i.todayIst) r.push("NOT_DUE");
    }
  }
  const reasons = [...new Set(r)];
  const hard = reasons.filter((x) => !GLOBAL.has(x));
  return { ok: reasons.length === 0, reasons, hold: reasons.length > 0 && hard.length === 0 };
}
export const describeReasons = (codes) => codes.map((c) => REASONS[c] || c);

/** Production sending needs every switch on, DRY_RUN off, and a configured, authenticated provider. Returns the list of what is missing. */
export function productionBlockers(s, provider) {
  const b = [];
  if (s.kill_switch) b.push("Emergency stop is on");
  if (!s.system_enabled) b.push("SYSTEM_ENABLED is false");
  if (!s.legal_approval) b.push("LEGAL_APPROVAL is false");
  if (!s.provider_approved) b.push("PROVIDER_APPROVED is false");
  if (s.dry_run) b.push("DRY_RUN is true");
  if (!provider?.configured) b.push("Email provider API key is not configured");
  if (!provider?.domainAuthenticated) b.push("Sender domain is not authenticated (SPF, DKIM and DMARC)");
  return b;
}
/** Enabling the system needs both approvals, each with a documented reference. Returns an error string or "". */
export function settingsProblem(next) {
  if (next.system_enabled && !(next.legal_approval && next.provider_approved)) return "Automation cannot be enabled until legal approval and provider approval are both recorded.";
  if (next.legal_approval && !String(next.legal_approval_ref || "").trim()) return "Record where the legal approval is documented (reference) before turning it on.";
  if (next.provider_approved && !String(next.provider_approval_ref || "").trim()) return "Record where the provider approval is documented (reference) before turning it on.";
  return "";
}
/** The only template activation that is allowed: never while legal approval is missing. */
export const canActivateTemplate = (s) => !!s.legal_approval;

// ---------- templates ----------
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const TEMPLATE_VARS = ["advocate_name", "unsubscribe_url", "directory_url", "city", "state", "contact_id"];
export const templateProblems = (t) => {
  const p = [];
  if (!String(t.subject || "").trim()) p.push("The subject is empty.");
  if (!String(t.body_html || "").trim()) p.push("The body is empty.");
  if (!/{{\s*unsubscribe_url\s*}}/.test(String(t.body_html || ""))) p.push("The body must contain {{unsubscribe_url}}: every marketing email needs an unsubscribe link.");
  for (const f of [t.subject, t.body_html, t.body_text]) for (const m of String(f || "").matchAll(/{{\s*([a-z_]+)\s*}}/g)) if (!TEMPLATE_VARS.includes(m[1])) p.push(`Unknown variable {{${m[1]}}}.`);
  return [...new Set(p)];
};
/** Fills {{variables}}. HTML values are escaped; the plain-text part is not. */
export function renderTemplate(t, vars) {
  const fill = (s, html) => String(s ?? "").replace(/{{\s*([a-z_]+)\s*}}/g, (_, k) => (html ? esc(vars[k] ?? "") : String(vars[k] ?? "")));
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff"><div style="max-width:600px;margin:0 auto;padding:24px;font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0A0A0A">${fill(t.body_html, true)}</div></body></html>`;
  let text = fill(t.body_text || t.body_html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, ""), false).trim();
  if (!text.includes(vars.unsubscribe_url)) text += `\n\nUnsubscribe: ${vars.unsubscribe_url}`;
  return { subject: fill(t.subject, false), html, text };
}
/** Campaign-specific UTM link to the directory, carrying a signed token so a registration can be tied to the contact and campaign. */
export function trackedUrl(base, campaignCode, step, token) {
  const u = new URL(base);
  u.searchParams.set("utm_source", "legalstaff_email"); u.searchParams.set("utm_medium", "email"); u.searchParams.set("utm_campaign", campaignCode);
  u.searchParams.set("utm_content", "step_" + step); if (token) u.searchParams.set("ls_t", token);
  return u.toString();
}

// ---------- signed tokens (unsubscribe links and landing attribution) ----------
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
}
export function safeEqual(a, b) { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; }
/** kind 'u' = unsubscribe, 'l' = landing attribution. The token never expires for 'u': an old email must still be able to unsubscribe. */
export async function makeToken(secret, kind, contactId, campaignCode = "") { const body = [kind, contactId, campaignCode].join("."); return b64u(new TextEncoder().encode(body)) + "." + (await hmac(secret, body)).slice(0, 32); }
export async function readToken(secret, token) {
  const [a, sig] = String(token || "").split("."); if (!a || !sig) return null;
  let body; try { body = new TextDecoder().decode(Uint8Array.from(atob(a.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))); } catch { return null; }
  if (!safeEqual((await hmac(secret, body)).slice(0, 32), sig)) return null;
  const [kind, contactId, campaignCode] = body.split("."); return { kind, contactId, campaignCode };
}

// ---------- the provider (Brevo) ----------
/** The body of POST https://api.brevo.com/v3/smtp/email. Marketing mail always carries both List-Unsubscribe headers (RFC 8058 one-click). */
/** @param {any} o */
export function brevoPayload(o) {
  const { sender, to, toName, subject, html, text, unsubscribeUrl, unsubscribeMailto, tags, idempotencyKey } = o;
  return {
    sender: { email: sender.email, name: sender.name }, to: [{ email: to, name: toName || undefined }], subject, htmlContent: html, textContent: text,
    ...(sender.replyTo ? { replyTo: { email: sender.replyTo } } : {}),
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>${unsubscribeMailto ? `, <mailto:${unsubscribeMailto}>` : ""}`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click", "X-Idempotency-Key": idempotencyKey },
    tags: tags || [],
  };
}
/** What a send response means. 429 / 5xx are retried later, 4xx are permanent for this message. */
export function classifySend(status, retryAfter) {
  if (status >= 200 && status < 300) return { kind: "accepted" };
  if (status === 429) return { kind: "rate_limited", waitSec: Math.min(3600, Math.max(5, Number(retryAfter) || 60)) };
  if (status === 401 || status === 403) return { kind: "auth" };
  if (status >= 500 || status === 408) return { kind: "retry" };
  return { kind: "rejected" };
}
/** Maps a Brevo webhook event to what we record. Opens are deliberately ignored: they are not a confirmed human interaction. */
export function classifyBrevoEvent(ev) {
  const e = String(ev.event ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  switch (e) {
    case "delivered": return { type: "email_delivered" };
    case "click": case "clicks": return { type: "email_clicked" };
    case "hard_bounce": case "hardbounce": return { type: "email_bounced", suppress: "hard_bounce" };
    case "invalid_email": case "invalid": return { type: "email_bounced", suppress: "invalid" };
    case "blocked": return { type: "email_failed", suppress: "hard_bounce" };
    case "soft_bounce": case "softbounce": return { type: "email_bounced" };
    case "spam": case "complaint": return { type: "email_complaint", suppress: "spam_complaint" };
    case "unsubscribe": case "unsubscribed": return { type: "email_unsubscribed", suppress: "unsubscribed" };
    case "error": case "deferred_failed": return { type: "email_failed" };
    default: return null;   // opened, unique_opened, proxy_open, deferred, request, ...
  }
}

// ---------- Google service-account auth ----------
function pemToDer(pem) { const b = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""); return Uint8Array.from(atob(b), (c) => c.charCodeAt(0)); }
/** Signed JWT assertion for the Google OAuth token endpoint (read-only Sheets scope). */
export async function googleAssertion(sa, nowSec, scope = "https://www.googleapis.com/auth/spreadsheets.readonly") {
  const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const head = enc({ alg: "RS256", typ: "JWT" }), claim = enc({ iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: nowSec, exp: nowSec + 3300 });
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  return `${head}.${claim}.${b64u(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claim}`)))}`;
}

// ---------- Google service-account key, tolerant of how it was pasted ----------
/** Reads the service-account key from a secret that may be raw JSON, JSON wrapped in quotes, base64 of the JSON, or JSON whose private key lost its \n escapes
 *  (real line breaks inside the string) or got smart quotes from a word processor. Returns { client_email, private_key } or null. Never throws. */
export function parseServiceAccount(raw) {
  let s = String(raw ?? "").replace(/^\uFEFF/, "").trim();
  if (!s) return null;
  s = s.replace(/[\u201C\u201D]/g, '"');
  const ok = (o) => (o && typeof o === "object" && typeof o.client_email === "string" && typeof o.private_key === "string" && o.private_key.includes("PRIVATE KEY") ? { client_email: o.client_email.trim(), private_key: o.private_key.replace(/\\n/g, "\n") } : null);
  const tryJson = (t) => { try { const v = JSON.parse(t); return typeof v === "string" ? tryJson(v) : ok(v); } catch { return null; } };
  let r = tryJson(s); if (r) return r;
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && !s.includes("{")) { try { r = tryJson(atob(s.replace(/\s+/g, ""))); if (r) return r; } catch { /* not base64 */ } }
  const email = s.match(/"client_email"\s*:\s*"([^"]+)"/), key = s.match(/"private_key"\s*:\s*"([\s\S]*?-----END [A-Z ]*PRIVATE KEY-----(?:\\n|\s)*)"/);
  return email && key ? ok({ client_email: email[1], private_key: key[1].replace(/\r?\n/g, "\n").trim() + "\n" }) : null;
}

// ---------- exports ----------
const csvCell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };   // also neutralises spreadsheet formulas
export const toCsv = (cols, rows) => "﻿" + [cols.map((c) => csvCell(c.label)).join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c.key])).join(","))].join("\r\n");
/** Excel opens this XML Spreadsheet 2003 file directly (.xls). */
export const toExcelXml = (cols, rows) => {
  const x = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const row = (vals) => `<Row>${vals.map((v) => `<Cell><Data ss:Type="String">${x(v)}</Data></Cell>`).join("")}</Row>`;
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Contacts"><Table>${row(cols.map((c) => c.label))}${rows.map((r) => row(cols.map((c) => r[c.key]))).join("")}</Table></Worksheet></Workbook>`;
};

// ---------- secrets ----------
export const scrub = (s) => String(s ?? "").replace(/(api-key|authorization|bearer|private_key|token)["':=\s]+[A-Za-z0-9._\-+/=]{12,}/gi, "$1 [hidden]").replace(/xkeysib-[A-Za-z0-9-]+/g, "[hidden]").replace(/-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, "[hidden]");

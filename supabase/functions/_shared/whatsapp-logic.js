// Legal Staff — WhatsApp Cloud API (Meta) pure logic. No network, no database: unit-tested in node (tests/whatsapp-logic.test.mjs)
// and imported by supabase/functions/whatsapp and supabase/functions/notify.

export const DEFAULT_GRAPH_VERSION = 'v21.0';
export const REQUIRED_SCOPES = ['whatsapp_business_messaging', 'whatsapp_business_management'];
/** Webhook fields the app should be subscribed to. "messages" carries message status updates (sent, delivered, read, failed). */
export const WEBHOOK_FIELDS = ['messages', 'message_template_status_update', 'account_update'];
export const SECRET_NAMES = { app_secret: 'wa_app_secret', access_token: 'wa_access_token', verify_token: 'wa_verify_token' };

/** 'v21.0' style only. Returns the cleaned version, or '' when it is not one. */
export const graphVersion = (v) => { const s = String(v ?? '').trim().toLowerCase().replace(/^(\d)/, 'v$1'); return /^v\d{1,2}\.\d{1,2}$/.test(s) ? s : ''; };
/** Meta numeric ids (app id, WABA id, phone number id): digits only, 5 to 25 long. */
export const metaId = (v) => { const s = String(v ?? '').trim(); return /^\d{5,25}$/.test(s) ? s : ''; };

/** Replaces every secret value (and anything shaped like a Meta access token) in a string, so it can be logged or stored. */
export function scrub(text, secrets = []) {
  let s = String(text ?? '');
  for (const x of secrets) if (x && String(x).length >= 6) s = s.split(String(x)).join('[redacted]');
  return s.replace(/\bEA[A-Za-z0-9]{20,}\b/g, '[redacted]').replace(/\b\d{8,20}\|[A-Za-z0-9_-]{16,}\b/g, '[redacted]').replace(/(access_token|client_secret|appsecret_proof|input_token)=[^&\s"']+/gi, '$1=[redacted]');
}
/** "+91 ••••• 43210" style label for a phone number, so the full number is never kept or shown. */
export function maskPhone(digits) { const d = String(digits ?? '').replace(/\D/g, ''); return d.length < 6 ? '••••' : '+' + d.slice(0, d.length > 10 ? d.length - 10 : 2) + ' ••••• ' + d.slice(-4); }
/** Phone number as Meta wants it: country code and digits, no plus. 10 digits are taken as Indian numbers. null when it cannot be one. */
export function normalizePhone(raw, defaultCc = '91') {
  let d = String(raw ?? '').replace(/[^\d]/g, ''); if (String(raw ?? '').trim().startsWith('00')) d = d.replace(/^00/, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = defaultCc + d;
  return /^[1-9]\d{9,14}$/.test(d) ? d : null;
}

/** HMAC-SHA256 hex of a string with the app secret (Meta signs each webhook body with it). */
export async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function sha256Hex(data) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
/** Constant-time string comparison. */
export function safeEqual(a, b) { a = String(a ?? ''); b = String(b ?? ''); let r = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return r === 0; }
/** True only when header "sha256=<hex>" matches the HMAC of the exact raw body. */
export async function verifySignature(rawBody, header, appSecret) {
  if (!appSecret || !header) return false; const m = /^sha256=([0-9a-f]{64})$/i.exec(String(header).trim()); if (!m) return false;
  return safeEqual((await hmacHex(appSecret, rawBody)).toLowerCase(), m[1].toLowerCase());
}

/**
 * Turns a Graph API error (HTTP status + parsed body) into something the admin can act on.
 * kind: auth | permission | rate_limit | not_found | param | template | recipient | window | account | server | network | unknown
 */
export function classifyGraphError(status, body) {
  const e = (body && body.error) || {}, code = Number(e.code) || 0, sub = Number(e.error_subcode) || 0, raw = String(e.message ?? '').slice(0, 300), trace = String(e.fbtrace_id ?? '');
  const out = (kind, message, retryable = false) => ({ kind, retryable, status, code, subcode: sub, message, fbtrace_id: trace, detail: raw });
  if (status === 0) return out('network', 'Could not reach Meta (network error or timeout). Try again in a moment.', true);
  if (code === 190 || (status === 401 && !code)) return out('auth', sub === 463 || /expired/i.test(raw) ? 'The access token has expired. Generate a new System User token in Meta Business Settings and replace it here.' : 'Meta rejected the access token (invalid or revoked). Generate a new System User token and replace it here.');
  if ([4, 17, 32, 613, 80007, 130429].includes(code) || status === 429) return out('rate_limit', 'Meta rate limit reached. Wait a few minutes before trying again.', true);
  if (code === 131048 || code === 131056) return out('rate_limit', 'Meta limited messages to this recipient or number (spam or pair rate limit). Try again later.', true);
  if (code === 10 || (code >= 200 && code <= 299)) return out('permission', 'The token is missing a permission or has no access to this asset. It needs whatsapp_business_management and whatsapp_business_messaging, and the WhatsApp Business Account must be assigned to the System User.');
  if (code === 100 && (sub === 33 || /does not exist|missing permissions|cannot be loaded/i.test(raw))) return out('not_found', 'Meta could not find this ID, or the token has no access to it. Check the WABA ID and Phone Number ID, and that the System User has this account as an asset.');
  if (code === 131030) return out('recipient', 'This number is not on the allowed recipient list. While the app is in test mode, add the number in Meta (WhatsApp › API Setup) first.');
  if (code === 131026) return out('recipient', 'The message could not be delivered: the number is not on WhatsApp, or has not accepted the latest WhatsApp terms.');
  if (code === 131047 || code === 131051) return out('window', 'Outside the 24-hour customer window: only an approved template message can be sent.');
  if (code === 132001) return out('template', 'Template not found for that name and language. Use an approved template and its exact language code.');
  if (code === 132000 || code === 132012 || code === 132005 || code === 132007) return out('template', 'The template variables do not match the template (wrong count or format).');
  if (code === 132015 || code === 132016) return out('template', 'This template is paused or disabled by Meta. Use another approved template.');
  if (code === 133010 || code === 131031 || code === 368 || code === 131045) return out('account', code === 133010 ? 'This phone number is not registered with the WhatsApp Cloud API.' : 'The WhatsApp account or number is restricted or blocked. Check the Meta Business Manager notifications.');
  if (code === 100) return out('param', 'Meta rejected a parameter: ' + (raw || 'invalid request') + '.');
  if (status >= 500) return out('server', 'Meta had a temporary problem. Try again shortly.', true);
  return out('unknown', raw ? 'Meta said: ' + raw : 'Meta returned HTTP ' + status + '.', false);
}
/** Delay before retrying a read call. A Retry-After header (seconds) wins; otherwise exponential with a cap. */
export const backoffMs = (attempt, retryAfterSec = 0) => Math.min(8000, retryAfterSec > 0 ? retryAfterSec * 1000 : 500 * 2 ** attempt);

/** Body for POST /{phone_number_id}/messages: an approved template with positional body variables. */
export function buildTemplateMessage({ to, name, language, variables = [] }) {
  const vars = variables.map((v) => String(v ?? '').replace(/\s*\n\s*/g, ' ').slice(0, 1000));
  return { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'template', template: { name, language: { code: language }, ...(vars.length ? { components: [{ type: 'body', parameters: vars.map((text) => ({ type: 'text', text })) }] } : {}) } };
}
/** How many {{n}} body variables a template has (from the BODY component text of GET /message_templates). */
export function bodyVariableCount(components) { const b = (components || []).find((c) => c.type === 'BODY'); return b ? new Set((String(b.text ?? '').match(/\{\{\d+\}\}/g) || [])).size : 0; }
/** Template name and language rules from Meta: lowercase letters, digits, underscore; language like en or en_US. */
export const templateNameOk = (n) => /^[a-z0-9_]{1,512}$/.test(String(n ?? ''));
export const languageOk = (l) => /^[a-z]{2,3}(_[A-Z]{2})?$/.test(String(l ?? ''));

// ---------- delivery state ----------
// accepted = Meta's API took the request. Nothing below "sent" is a delivery. delivered/read only ever come from a webhook.
export const STATUS_RANK = { rejected: -1, accepted: 0, sent: 1, delivered: 2, read: 3, failed: 9 };
/** The status after a webhook update. Out-of-order updates never move a message backwards; failed beats accepted/sent only. */
export function nextStatus(current, incoming) {
  if (!(incoming in STATUS_RANK) || incoming === 'rejected') return current;
  if (!(current in STATUS_RANK)) return incoming;
  if (current === 'failed') return incoming === 'delivered' || incoming === 'read' ? incoming : current;
  if (incoming === 'failed') return current === 'delivered' || current === 'read' ? current : 'failed';
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : current;
}
/** Status updates inside a webhook payload. */
export function parseStatuses(payload) {
  const out = [];
  for (const en of payload?.entry ?? []) for (const ch of en?.changes ?? []) { if (ch?.field !== 'messages') continue;
    for (const s of ch?.value?.statuses ?? []) if (s?.id && s?.status) out.push({ id: String(s.id), status: String(s.status), at: s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : null,
      recipient: String(s.recipient_id ?? ''), phone_number_id: String(ch.value?.metadata?.phone_number_id ?? ''), errors: (s.errors ?? []).map((x) => ({ code: Number(x.code) || 0, title: String(x.title ?? x.message ?? '').slice(0, 200), details: String(x.error_data?.details ?? '').slice(0, 300) })) }); }
  return out;
}
const OUT = /^\s*(stop|stop all|stopall|unsubscribe|cancel|end|quit|opt[\s-]?out)\s*[.!]*\s*$/i, IN = /^\s*(start|unstop|subscribe|resume|opt[\s-]?in)\s*[.!]*\s*$/i;
/** Opt-out and opt-in keywords from ordinary inbound text. Only the sender's number and the decision are returned: no message content, no inbox. */
export function parseOptActions(payload) {
  const out = [];
  for (const en of payload?.entry ?? []) for (const ch of en?.changes ?? []) { if (ch?.field !== 'messages') continue;
    for (const m of ch?.value?.messages ?? []) { const text = m?.type === 'text' ? m?.text?.body : m?.type === 'button' ? m?.button?.text : ''; if (!text || !m.from) continue;
      const a = OUT.test(text) ? 'optout' : IN.test(text) ? 'optin' : ''; if (a) out.push({ phone: String(m.from).replace(/\D/g, ''), action: a, phone_number_id: String(ch.value?.metadata?.phone_number_id ?? '') }); } }
  return out;
}
/** What kind of event a webhook carried, for "last received event". */
export function describeEvent(payload) {
  const f = new Set(); let st = 0, msg = 0;
  for (const en of payload?.entry ?? []) for (const ch of en?.changes ?? []) { f.add(ch?.field); st += (ch?.value?.statuses ?? []).length; msg += (ch?.value?.messages ?? []).length; }
  return [...f].filter(Boolean).join(', ') + (st ? ` · ${st} status update${st > 1 ? 's' : ''}` : '') + (msg ? ` · ${msg} incoming (not stored)` : '');
}

// ---------- health ----------
/** Token state from Meta's debug_token data. expires_at 0 or missing means it does not expire (System User permanent token). */
export function tokenHealth(d, nowMs = Date.now()) {
  if (!d) return { state: 'unknown', daysLeft: null };
  if (d.is_valid === false) return { state: 'invalid', daysLeft: null };
  const exp = Number(d.expires_at) || 0; if (!exp) return { state: 'ok', daysLeft: null, permanent: true };
  const days = Math.floor((exp * 1000 - nowMs) / 864e5);
  return { state: days < 0 ? 'expired' : days <= 7 ? 'expiring' : 'ok', daysLeft: days, permanent: false };
}
/** Which of the two required permissions the token has, and (when Meta lists targets) whether this WABA is among them. */
export function permissionCheck(d, wabaId) {
  const scopes = d?.scopes ?? [], gran = d?.granular_scopes ?? [], have = REQUIRED_SCOPES.filter((s) => scopes.includes(s)), missing = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
  const noAccess = REQUIRED_SCOPES.filter((s) => { const g = gran.find((x) => x.scope === s); return g && (g.target_ids ?? []).length > 0 && !g.target_ids.map(String).includes(String(wabaId)); });
  return { have, missing, noAccess, ok: !missing.length && !noAccess.length };
}
export function webhookHealth({ verifiedAt, lastEventAt, subscribedApp, nowMs = Date.now() }) {
  if (!verifiedAt && !lastEventAt) return { state: 'not_verified', label: 'Not verified yet' };
  if (subscribedApp === false) return { state: 'not_subscribed', label: 'This app is not subscribed to the WhatsApp Business Account' };
  if (!lastEventAt) return { state: 'waiting', label: 'Verified. Waiting for the first event from Meta' };
  const hrs = (nowMs - Date.parse(lastEventAt)) / 36e5; return hrs > 24 * 14 ? { state: 'quiet', label: 'Verified. No event for over 14 days' } : { state: 'healthy', label: 'Receiving events' };
}
/** Whether to email the administrators: the state is bad and no alert went out in the last 24 hours. */
export function shouldAlert({ ok, tokenState, lastAlertAt, nowMs = Date.now() }) {
  const bad = !ok || tokenState === 'expiring' || tokenState === 'expired' || tokenState === 'invalid';
  return bad && (!lastAlertAt || nowMs - Date.parse(lastAlertAt) > 24 * 36e5);
}

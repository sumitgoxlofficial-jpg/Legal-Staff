// Electronic signing for the AI Drafting Studio (app.html) and the signing page (sign.html). One function, four kinds of caller:
//   1. firm members (Authorization: the member's session): config · render · prepare_save · get · list · send · remind · cancel ·
//      discard · download · verify · verify_copy
//   2. signers, who have no account: they hold a secret link. token (+ session after the email code): open · otp_send · otp_verify ·
//      sign · decline · download_signed
//   3. the schedule (x-cron-secret): sweep (expire, start the next signers, finish stuck documents) · backup (second copy of completed PDFs)
//   4. Legal Staff super admins: admin_get · admin_save · admin_secret · admin_activity · admin_failed · admin_usage · admin_grant · admin_firm · admin_restore
// Deploy with JWT verification off; the function checks every caller itself. Deploy the whole functions/ folder (it imports ../_shared).
//
// Signature type: the built-in provider makes a SIMPLE electronic signature (typed or drawn, with consent, email-code verification
// and a hash-chained audit trail). It is NOT Aadhaar eSign and NOT a Digital Signature Certificate (DSC). Those regulated methods
// would have to come from an authorised provider adapter; none is installed (see PROVIDERS).
//
// Security: link tokens are 256-bit random values; only their SHA-256 is stored. Documents are encrypted with AES-256-GCM (a key per
// firm derived from a Vault master key) before they reach Storage. No provider credential ever leaves the server.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import * as L from "../_shared/esign-logic.js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
class Fail extends Error { status: number; extra: any; constructor(msg: string, status = 400, extra: any = {}) { super(msg); this.status = status; this.extra = extra; } }
const SITE = () => (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
const now = () => Date.now();
const iso = (ms = now()) => new Date(ms).toISOString();

// ---------- providers: the signing service is replaceable ----------
// A provider says what kind of signature it can make and whether its adapter is installed. Only 'native' is installed.
// DocuSeal (self-hosted, AGPLv3): its README lists "API and Webhooks for integrations" among the free features and lists embedded
// signing, white-label, automated reminders and SMS verification as Pro features. Its pricing and API pages could not be read when this
// was built, so no adapter is shipped: confirm the commercial terms, then add an adapter here. Never call a paid-only endpoint without a licence.
const PROVIDERS: Record<string, { name: string; available: boolean; credential: boolean; signature: string; note: string }> = {
  native: { name: "Legal Staff built-in signing", available: true, credential: false, signature: "Simple electronic signature (typed or drawn). Not Aadhaar eSign, not DSC.", note: "Runs inside Legal Staff. No third-party cost besides email." },
  docuseal: { name: "DocuSeal (self-hosted)", available: false, credential: true, signature: "Simple electronic signature with PDF signing. Not Aadhaar eSign, not DSC.", note: "Evaluated, adapter not installed. AGPLv3 with an attribution term; embedded signing, white-label and SMS verification are Pro features. Verify the licence and pricing before enabling." },
};

// ---------- settings ----------
async function getSettings(admin: any) { const { data, error } = await admin.from("esign_settings").select("*").eq("id", 1).single(); if (error) throw error; return data; }
const limits = (s: any) => ({ max_signers: s.max_signers, max_fields: s.max_fields, default_expiry_days: s.default_expiry_days, max_expiry_days: s.max_expiry_days });

// ---------- encryption at rest ----------
const te = new TextEncoder(), MAGIC = te.encode("LSE1");
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
let baseKey: CryptoKey | null = null;
async function firmKey(admin: any, firmId: string) {
  if (!baseKey) {
    const { data, error } = await admin.rpc("esign_master_key");
    if (error || !data) throw new Fail("Signing storage is not set up (the encryption key is missing).", 501);
    baseKey = await crypto.subtle.importKey("raw", fromB64(data), "HKDF", false, ["deriveKey"]);
  }
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: te.encode("legal-staff-esign-v1"), info: te.encode("firm:" + firmId) }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function put(admin: any, firmId: string, path: string, bytes: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await firmKey(admin, firmId), bytes as BufferSource));
  const out = new Uint8Array(MAGIC.length + 12 + ct.length); out.set(MAGIC); out.set(iv, 4); out.set(ct, 16);
  const { error } = await admin.storage.from("esign").upload(path, out, { upsert: true, contentType: "application/octet-stream" });
  if (error) throw new Fail("Could not store the document: " + error.message, 502);
}
async function get(admin: any, firmId: string, path: string): Promise<Uint8Array> {
  const { data, error } = await admin.storage.from("esign").download(path);
  if (error || !data) throw new Fail("The stored document could not be read.", 404);
  const u = new Uint8Array(await data.arrayBuffer());
  if (u.length < 17 || !MAGIC.every((b, i) => u[i] === b)) throw new Fail("The stored document is damaged.", 500);
  try { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.subarray(4, 16) }, await firmKey(admin, firmId), u.subarray(16))); }
  catch { throw new Fail("The stored document failed its integrity check.", 500); }
}

// ---------- fonts and PDF ----------
let uniFont: { reg: Uint8Array; bold: Uint8Array | null } | null | undefined;
async function unicodeFont() {   // optional: a Unicode font (for Hindi and other scripts) from ESIGN_FONT_URL / ESIGN_FONT_BOLD_URL
  if (uniFont !== undefined) return uniFont;
  const u = Deno.env.get("ESIGN_FONT_URL"); if (!u) return (uniFont = null);
  try { const r = await fetch(u, { signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(String(r.status)); const reg = new Uint8Array(await r.arrayBuffer());
    const bu = Deno.env.get("ESIGN_FONT_BOLD_URL"); let bold: Uint8Array | null = null; if (bu) { const b = await fetch(bu, { signal: AbortSignal.timeout(15000) }); if (b.ok) bold = new Uint8Array(await b.arrayBuffer()); }
    return (uniFont = { reg, bold }); } catch (e) { console.error("font", e); return (uniFont = null); }
}
async function fonts(pdf: any) {
  const uni = await unicodeFont();
  if (uni) { pdf.registerFontkit(fontkit); const reg = await pdf.embedFont(uni.reg, { subset: true }), bold = uni.bold ? await pdf.embedFont(uni.bold, { subset: true }) : reg; return { reg, bold, ital: reg, bi: bold, unicode: true }; }
  return { reg: await pdf.embedFont(StandardFonts.TimesRoman), bold: await pdf.embedFont(StandardFonts.TimesRomanBold), ital: await pdf.embedFont(StandardFonts.TimesRomanItalic), bi: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic), unicode: false };
}
const pick = (f: any, b: boolean, i: boolean) => b && i ? f.bi : b ? f.bold : i ? f.ital : f.reg;
const hel = async (pdf: any) => ({ reg: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold) });

/** The document as laid-out pages. The same layout is drawn in the browser and written to the PDF. */
async function layoutFor(html: string, letterhead: any) {
  const pdf = await PDFDocument.create(), f = await fonts(pdf);
  const blocks = L.parseHtml(html); let bad = 0;
  if (!f.unicode) for (const b of blocks) for (const r of b.runs) { const w = L.winSafe(r.t); r.t = w.text; bad += w.bad; }
  const measure = (t: string, size: number, b: boolean, i: boolean) => { try { return pick(f, b, i).widthOfTextAtSize(t.replace(/\n/g, " "), size); } catch { return t.length * size * 0.5; } };
  const lh = f.unicode ? letterhead : { name: L.winSafe(letterhead?.name ?? "").text, address: L.winSafe(letterhead?.address ?? "").text };
  const layout = L.layoutDocument(blocks, measure, { letterhead: lh });
  return { layout, warnings: bad ? [`${bad} character${bad > 1 ? "s" : ""} (for example Hindi or other scripts) cannot be drawn in the signing copy and will appear as "?". Ask the administrator to set a Unicode font, or draft this part in English.`] : [] };
}
async function originalPdf(req: any, layout: any) {
  const pdf = await PDFDocument.create(), f = await fonts(pdf), h = await hel(pdf);
  pdf.setTitle(req.title); pdf.setProducer("Legal Staff"); pdf.setCreator("Legal Staff"); pdf.setCreationDate(new Date(req.created_at)); pdf.setModificationDate(new Date(req.created_at));
  const total = layout.pages.length;
  layout.pages.forEach((pg: any, n: number) => {
    const page = pdf.addPage([layout.pageW, layout.pageH]);
    for (const r of pg.rules) page.drawLine({ start: { x: r.x1, y: layout.pageH - r.y }, end: { x: r.x2, y: layout.pageH - r.y }, thickness: r.w, color: rgb(0.04, 0.04, 0.04) });
    for (const ln of pg.lines) { let x = ln.x; for (const run of ln.runs) { if (!run.t) continue; const font = pick(f, run.b, run.i), w = font.widthOfTextAtSize(run.t, ln.size);
      page.drawText(run.t, { x, y: layout.pageH - ln.y, size: ln.size, font, color: rgb(0.1, 0.1, 0.1) });
      if (run.u) page.drawLine({ start: { x, y: layout.pageH - ln.y - 1.5 }, end: { x: x + w, y: layout.pageH - ln.y - 1.5 }, thickness: 0.6, color: rgb(0.1, 0.1, 0.1) }); x += w; } }
    const foot = `${L.winSafe(req.title).text.slice(0, 70)}  ·  Page ${n + 1} of ${total}`, fw = h.reg.widthOfTextAtSize(foot, 8);
    page.drawText(foot, { x: (layout.pageW - fw) / 2, y: 30, size: 8, font: h.reg, color: rgb(0.45, 0.45, 0.45) });
  });
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}

/** Writes the signatures onto the original and appends the certificate (signers, consent, timestamps, audit trail, hashes). */
async function signedPdf(req: any, original: Uint8Array, signers: any[], fields: any[], events: any[], chain: any) {
  const pdf = await PDFDocument.load(original), f = await fonts(pdf), h = await hel(pdf);
  pdf.setProducer("Legal Staff"); pdf.setModificationDate(new Date(req.completed_at ?? now()));
  const byId: Record<string, any> = {}; signers.forEach((s) => (byId[s.id] = s));
  const png = new Map<string, any>();
  const img = async (key: string, dataUrl: string) => { if (!png.has(key)) png.set(key, await pdf.embedPng(L.readPng(dataUrl, 400000))); return png.get(key); };
  for (const fd of fields) {
    const s = byId[fd.signer_id]; if (!s || s.status !== "signed") continue;
    const page = pdf.getPage(fd.page - 1), { width: W, height: H } = page.getSize(), bx = fd.x * W, bw = fd.w * W, bh = fd.h * H, by = H - fd.y * H - bh;
    if (fd.kind === "signature" || fd.kind === "initials") {
      const dataUrl = fd.kind === "signature" ? s.signature?.png : s.signature?.initials_png; if (!dataUrl) continue;
      const im = await img(s.id + fd.kind, dataUrl), sc = Math.min(bw / im.width, bh / im.height), w = im.width * sc, hh = im.height * sc;
      page.drawImage(im, { x: bx + (bw - w) / 2, y: by + (bh - hh) / 2, width: w, height: hh });
      page.drawLine({ start: { x: bx, y: by }, end: { x: bx + bw, y: by }, thickness: 0.4, color: rgb(0.55, 0.55, 0.6) });
      if (fd.kind === "signature") {   // the stamp under the signature: who authenticated it, the signer, the time
        const ref = String(s.id).replace(/-/g, "").toUpperCase(), lines = [`Authenticated through Legal Staff (${ref})`, s.name, `Date: ${L.istStamp(Date.parse(s.signed_at))}`];
        lines.forEach((t, i) => page.drawText(L.winSafe(t).text.slice(0, 90), { x: bx, y: by - 8 - i * 7.5, size: 6, font: h.reg, color: rgb(0.1, 0.1, 0.1) }));
      }
    } else if (fd.value) {
      const txt = f.unicode ? fd.value : L.winSafe(fd.value).text; let size = Math.min(11, bh * 0.7); const font = f.reg;
      while (size > 5 && font.widthOfTextAtSize(txt, size) > bw) size -= 0.5;
      page.drawText(txt, { x: bx + 1, y: by + (bh - size) / 2 + size * 0.2, size, font, color: rgb(0.05, 0.05, 0.05) });
    }
  }
  // certificate
  let page = pdf.addPage([L.PAGE.w, L.PAGE.h]), y = L.PAGE.h - 56; const mx = 50, maxW = L.PAGE.w - 2 * mx;
  const line = (t: string, o: { size?: number; bold?: boolean; gap?: number; color?: number } = {}) => {
    const size = o.size ?? 9, font = o.bold ? h.bold : h.reg, words = L.winSafe(t).text.split(/\s+/); let cur = "";
    const out: string[] = []; for (const w of words) { const test = cur ? cur + " " + w : w; if (font.widthOfTextAtSize(test, size) > maxW && cur) { out.push(cur); cur = w; } else cur = test; } out.push(cur);
    for (const l of out) { if (y < 60) { page = pdf.addPage([L.PAGE.w, L.PAGE.h]); y = L.PAGE.h - 56; } page.drawText(l, { x: mx, y, size, font, color: rgb(o.color ?? 0.1, o.color ?? 0.1, o.color ?? 0.1) }); y -= size * 1.45; }
    y -= o.gap ?? 0;
  };
  line("Certificate of Completion", { size: 18, bold: true, gap: 4 });
  line("Electronic signing record, Legal Staff", { size: 10, color: 0.4, gap: 10 });
  line("Document: " + req.title, { size: 10, bold: true }); line("Request ID: " + req.id); line("Sent by: " + req.creator_name + " on " + L.istStamp(Date.parse(req.sent_at))); line("Completed: " + L.istStamp(Date.parse(req.completed_at ?? iso())));
  line("SHA-256 of the original document: " + req.doc_hash, { gap: 6 });
  line("Signature type: " + L.SIGNATURE_TYPE_NOTE, { bold: true, gap: 8 });
  line("Signers", { size: 12, bold: true, gap: 2 });
  for (const s of signers) {
    line(`${s.sign_order}. ${s.name} (${s.role})${s.required ? "" : " [optional]"}`, { size: 10, bold: true });
    line(`Email ${s.email} · Mobile ${s.phone || "-"} · Status: ${s.status === "signed" ? "Signed" : s.status === "declined" ? "Declined" : "Not signed"}`);
    if (s.status === "signed") {
      line(`Signed ${L.istStamp(Date.parse(s.signed_at))} · ${s.signature?.type === "drawn" ? "drawn" : "typed"} signature` + (s.verified_at ? ` · email verified ${L.istStamp(Date.parse(s.verified_at))}` : " · email code not required"));
      line(`Consent ${s.consent?.version ?? ""} given ${s.consent?.at ? L.istStamp(Date.parse(s.consent.at)) : ""} · IP ${s.consent?.ip || "-"}`);
      line(`Device: ${String(s.consent?.ua ?? "").slice(0, 140)}`, { gap: 5, color: 0.35 });
    } else line("", { gap: 3 });
  }
  line("Consent text shown to every signer", { size: 11, bold: true, gap: 1 }); line(L.CONSENT_TEXT, { gap: 8 });
  line("Audit trail", { size: 12, bold: true, gap: 2 });
  for (const e of events) line(`${L.istStamp(Date.parse(e.at))}  ${e.type}  ${e.actor}${e.ip ? "  IP " + e.ip : ""}`, { size: 8 });
  y -= 6; line(`The audit trail is a hash chain: each entry carries the SHA-256 of the one before it. Entries: ${chain?.events ?? events.length}. Head: ${chain?.head ?? ""}`, { size: 8, color: 0.35, gap: 6 });
  for (const t of L.LEGAL_LIMITS) line("• " + t, { size: 7.5, color: 0.35 });
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}

// ---------- email ----------
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function mailHtml(o: { heading: string; paras: string[]; cta?: { label: string; url: string }; note?: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F4F4F2"><table role="presentation" width="100%" style="background:#F4F4F2"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" style="max-width:560px">
<tr><td style="padding:0 4px 14px;font:700 17px ${FONT};color:#0A0A0A">Legal Staff</td></tr><tr><td style="background:#fff;border:1px solid #E5E5E5;border-radius:12px;padding:26px 28px">
<div style="font:600 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;padding-bottom:8px">Electronic signature</div>
<h1 style="margin:0 0 14px;font:600 20px/1.3 ${FONT};color:#0A0A0A">${esc(o.heading)}</h1>
${o.paras.map((p) => `<p style="margin:0 0 14px;font:15px/1.6 ${FONT};color:#363636">${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}
${o.cta ? `<p style="margin:20px 0"><a href="${esc(o.cta.url)}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;border-radius:8px;padding:12px 22px;font:600 15px ${FONT}">${esc(o.cta.label)}</a></p><p style="margin:0 0 14px;font:12.5px/1.5 ${FONT};color:#6B6B6B;word-break:break-all">Or paste this address in your browser:<br>${esc(o.cta.url)}</p>` : ""}
${o.note ? `<p style="margin:14px 0 0;font:12.5px/1.6 ${FONT};color:#6B6B6B">${esc(o.note)}</p>` : ""}
</td></tr><tr><td style="padding:14px 6px 0;font:12px/1.6 ${FONT};color:#8A8A8A;text-align:center">Sent through Legal Staff. If you were not expecting this email you can ignore it.</td></tr></table></td></tr></table></body></html>`;
}
const emailReady = () => !!(Deno.env.get("RESEND_API_KEY") && Deno.env.get("EMAIL_FROM"));
async function sendMail(to: string, subject: string, text: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) throw new Error("Email is not set up on the server.");
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text, html }), signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("The email service refused the message (" + r.status + ").");
}
const linkFor = (token: string) => `${SITE()}/sign#${token}`;
async function mailSigner(req: any, s: any, token: string, kind: "invite" | "remind" | "done") {
  const firm = req.letterhead?.name || "A law firm", by = req.creator_name || firm;
  if (kind === "done") return sendMail(s.email, `Signed copy: ${req.title}`, `Hello ${s.name},\n\n"${req.title}" has been signed by everyone. Download your copy: ${linkFor(token)}\n`, mailHtml({ heading: "The document is fully signed", paras: [`Hello ${s.name},`, `Everyone has signed "${req.title}". You can download the signed copy, which includes the certificate of completion.`], cta: { label: "Download signed copy", url: linkFor(token) }, note: "This link is personal to you. Do not forward it." }));
  const expires = req.expires_at ? L.istDate(Date.parse(req.expires_at)) : "";
  const paras = [`Hello ${s.name},`, `${by} (${firm}) has asked you to review and sign "${req.title}" as ${s.role}.`, ...(req.message ? [`Message from ${by}:\n${req.message}`] : []), `Open the link, read the document, and sign with a typed or drawn electronic signature. You do not need an account.${expires ? " The link works until " + expires + "." : ""}`];
  return sendMail(s.email, `${kind === "remind" ? "Reminder: " : ""}Please sign: ${req.title}`, paras.join("\n\n") + "\n\n" + linkFor(token) + "\n", mailHtml({ heading: kind === "remind" ? "Reminder: your signature is needed" : "Your signature is requested", paras, cta: { label: "Review and sign", url: linkFor(token) }, note: "This link is personal to you. Do not forward it. This is a simple electronic signature, not an Aadhaar eSign or DSC signature." }));
}

// ---------- audit events and usage ----------
type Ctx = { ip: string; ua: string };
async function ev(admin: any, req: any, signerId: string | null, type: string, actor: string, ctx: Ctx, data: any = {}) {
  const { error } = await admin.from("esign_events").insert({ request_id: req.id, firm_id: req.firm_id, signer_id: signerId, type, actor, ip: ctx.ip, ua: ctx.ua.slice(0, 300), data });
  if (error) throw new Error("audit write failed: " + error.message);
}
const setErr = (admin: any, id: string, msg: string) => admin.from("esign_requests").update({ error: msg.slice(0, 500), error_at: iso(), updated_at: iso() }).eq("id", id);
const SIGNER_PUBLIC = "id,request_id,firm_id,name,email,phone,role,sign_order,required,status,notified_at,viewed_at,signed_at,declined_at,decline_reason,reminders,last_reminder_at,verified_at";
const REQ_LIST = "id,firm_id,created_by,creator_name,draft_key,title,message,status,mode,provider,page_count,doc_hash,signed_hash,expires_at,sent_at,completed_at,cancelled_at,declined_at,charge,error,created_at,updated_at";

// ---------- request flow helpers ----------
async function loadReq(admin: any, firmId: string, id: string, cols = "*") {
  const { data } = await admin.from("esign_requests").select(cols).eq("id", String(id ?? "")).eq("firm_id", firmId).maybeSingle();
  if (!data) throw new Fail("That signing request was not found.", 404); return data;
}
const loadSigners = async (admin: any, id: string, cols = "*") => ((await admin.from("esign_signers").select(cols).eq("request_id", id).order("sign_order").order("created_at")).data ?? []);
const loadFields = async (admin: any, id: string) => ((await admin.from("esign_fields").select("*").eq("request_id", id).order("page").order("y")).data ?? []);

/** Moves a request to the status its signers imply and records it. */
async function refreshStatus(admin: any, req: any, signers: any[], ctx: Ctx) {
  const st = L.deriveStatus(req, signers, now());
  if (st !== req.status) {
    const patch: any = { status: st, updated_at: iso() }; if (st === "declined") patch.declined_at = iso();
    const { data } = await admin.from("esign_requests").update(patch).eq("id", req.id).eq("status", req.status).select("id");
    if (data?.length) { req.status = st; if (st === "expired") await ev(admin, req, null, "expired", "system", ctx, {}); if (st === "declined") await ev(admin, req, null, "declined", "system", ctx, {}); }
  }
  return req.status;
}
/** Gives the signers whose turn has come a fresh link and emails them. Returns who could not be emailed. */
async function notifyActive(admin: any, req: any, signers: any[], ctx: Ctx, kind: "invite" | "remind" = "invite") {
  const failed: string[] = [];
  for (const s of L.activeSigners(req.mode, signers)) {
    if (kind === "invite" && s.status !== "pending") continue;
    const token = L.newToken(), patch: any = { token_hash: await L.sha256(token), token_expires: req.expires_at, session_hash: null, session_expires: null, notified_at: s.notified_at ?? iso() };
    if (s.status === "pending") patch.status = "notified";
    await admin.from("esign_signers").update(patch).eq("id", s.id); Object.assign(s, patch);
    try { await mailSigner(req, s, token, kind); await ev(admin, req, s.id, kind === "invite" ? "invited" : "reminder_sent", "system", ctx, { to: s.email }); }
    catch (e) { failed.push(s.email); await ev(admin, req, s.id, "email_failed", "system", ctx, { to: s.email, error: String((e as Error).message).slice(0, 200) }); await setErr(admin, req.id, `Could not email ${s.email}: ${(e as Error).message}`); }
  }
  return failed;
}
async function finalize(admin: any, reqId: string, ctx: Ctx) {
  const { data: claimed } = await admin.from("esign_requests").update({ signed_path: "working", updated_at: iso() }).eq("id", reqId).eq("signed_path", "").in("status", ["sent", "viewed", "partial", "completed"]).select("*");
  if (!claimed?.length) return false;
  const req = claimed[0];
  try {
    const signers = await loadSigners(admin, reqId), fields = await loadFields(admin, reqId);
    const original = await get(admin, req.firm_id, req.original_path);
    if (await L.sha256(original) !== req.doc_hash) throw new Error("The stored original no longer matches its recorded hash.");
    req.completed_at = iso();
    await ev(admin, req, null, "completed", "system", ctx, { signers: signers.filter((s: any) => s.status === "signed").length });
    const { data: events } = await admin.from("esign_events").select("type,actor,ip,at").eq("request_id", reqId).order("id");
    const chain = (await admin.rpc("esign_chain_check", { p_request: reqId })).data;
    const bytes = await signedPdf(req, original, signers, fields, events ?? [], chain), hash = await L.sha256(bytes), path = `${req.firm_id}/${reqId}/signed.pdf`;
    await put(admin, req.firm_id, path, bytes);
    await admin.from("esign_requests").update({ status: "completed", completed_at: req.completed_at, signed_path: path, signed_hash: hash, error: null, updated_at: iso() }).eq("id", reqId);
    await ev(admin, req, null, "signed_pdf_created", "system", ctx, { sha256: hash, bytes: bytes.length });
    req.status = "completed";
    // everybody gets a personal link to download the signed copy
    for (const s of signers.filter((x: any) => x.status === "signed")) {
      const token = L.newToken(); await admin.from("esign_signers").update({ token_hash: await L.sha256(token), token_expires: iso(now() + 90 * 864e5) }).eq("id", s.id);
      try { await mailSigner(req, s, token, "done"); } catch (e) { await ev(admin, req, s.id, "email_failed", "system", ctx, { kind: "completion", to: s.email }); }
    }
    return true;
  } catch (e) {
    await admin.from("esign_requests").update({ signed_path: "", updated_at: iso() }).eq("id", reqId);
    await setErr(admin, reqId, "Could not create the signed PDF: " + (e as Error).message);
    await admin.from("esign_events").insert({ request_id: reqId, firm_id: req.firm_id, type: "finalize_failed", actor: "system", data: { error: String((e as Error).message).slice(0, 300) } });
    await admin.from("esign_provider_usage").insert({ provider: req.provider, firm_id: req.firm_id, request_id: reqId, kind: "finalize", units: 0, ok: false, note: String((e as Error).message).slice(0, 200) });
    return false;
  }
}
async function advance(admin: any, req: any, ctx: Ctx) {
  const signers = await loadSigners(admin, req.id);
  const st = await refreshStatus(admin, req, signers, ctx);
  if (st === "completed") await finalize(admin, req.id, ctx);
  else if (L.OPEN.includes(st) && req.mode === "sequential") await notifyActive(admin, req, signers, ctx, "invite");
  return st;
}

// ---------- callers ----------
async function member(admin: any, url: string, req: Request, body: any) {
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) throw new Fail("Sign in again.", 401);
  const firmId = String(body.firm_id ?? "");
  const { data: ok } = await asUser.rpc("is_member", { f: firmId });
  if (!ok) throw new Fail("You are not a member of this firm.", 403);
  const { data: m } = await admin.from("members").select("name,title,is_owner").eq("firm_id", firmId).eq("user_id", user.id).maybeSingle();
  return { user, firmId, asUser, name: m?.title || m?.name || user.email || "A member", owner: !!m?.is_owner };
}
async function needAccess(admin: any, c: any, set: any) {
  if (!set.enabled) throw new Fail("Electronic signing is not switched on for Legal Staff yet.", 503);
  const { data: access } = await c.asUser.rpc("firm_access", { f: c.firmId });
  if (!access) throw new Fail("Your plan has ended. Subscribe to prepare or send documents for signature.", 402);
  const { data: sub } = await admin.from("subscriptions").select("plan").eq("firm_id", c.firmId).maybeSingle();
  if ((sub?.plan ?? "Solo") === "Solo") throw new Fail("Electronic signing is part of the Professional plan, like the Drafting Studio. Upgrade to use it.", 402);
}
const canManage = (c: any, r: any) => c.owner || r.created_by === c.user.id;
async function superAdmin(admin: any, url: string, req: Request) {
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) throw new Fail("Sign in again.", 401);
  const { data: ok } = await admin.from("super_admins").select("email").eq("email", String(user.email ?? "").toLowerCase()).maybeSingle();
  if (!ok || !user.email_confirmed_at) throw new Fail("This account is not a Legal Staff administrator.", 403);
  return user;
}

const MEMBER = new Set(["config", "render", "prepare_save", "get", "list", "send", "remind", "cancel", "discard", "download", "verify", "verify_copy"]);
const SIGNER = new Set(["open", "otp_send", "otp_verify", "sign", "decline", "download_signed"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ctx: Ctx = { ip: L.clientIp(req.headers), ua: req.headers.get("user-agent") ?? "" };
  try {
    const body: any = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    if (action === "sweep" || action === "backup") {
      const { data: okSecret } = await admin.rpc("cron_secret_ok", { s: req.headers.get("x-cron-secret") ?? "" });
      if (okSecret !== true) return json({ error: "Not allowed." }, 403);
      return json(action === "sweep" ? await sweep(admin, ctx) : await backup(admin));
    }
    if (action.startsWith("admin_")) { const user = await superAdmin(admin, url, req); return json(await adminAction(admin, action, body, user)); }
    if (SIGNER.has(action)) return json(await signerAction(admin, action, body, ctx));
    if (MEMBER.has(action)) return json(await memberAction(admin, url, req, action, body, ctx));
    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message, ...e.extra }, e.status);
    console.error(e); return json({ error: "Something went wrong with electronic signing. Please try again." }, 500);
  }
});

// =====================================================================================================================
// firm members
// =====================================================================================================================
async function memberAction(admin: any, url: string, req: Request, action: string, body: any, ctx: Ctx) {
  const c = await member(admin, url, req, body), set = await getSettings(admin);
  const actor = c.name;

  if (action === "config") {
    const { data: w } = await admin.from("esign_wallets").select("*").eq("firm_id", c.firmId).maybeSingle();
    const from = L.istMonthStart(), used = (await admin.rpc("esign_month_count", { f: c.firmId, p_from: from })).data ?? 0, freeUsed = (await admin.rpc("esign_month_count", { f: c.firmId, p_from: from, p_via: "free_month" })).data ?? 0;
    const prov = PROVIDERS[set.active_provider] ?? PROVIDERS.native, uni = await unicodeFont();
    const { data: sub } = await admin.from("subscriptions").select("plan").eq("firm_id", c.firmId).maybeSingle();
    return { enabled: !!set.enabled, plan_ok: (sub?.plan ?? "Solo") !== "Solo", pricing_mode: set.pricing_mode, credits_per_document: set.credits_per_document, packs: set.packs, balance: w?.credits ?? 0,
      free_per_month: set.free_per_month, free_used_month: freeUsed, free_trial_left: Math.max(0, set.free_trial_documents - (w?.free_trial_used ?? 0)),
      month_used: used, month_limit: w?.monthly_limit ?? set.max_documents_per_month, blocked: !!w?.blocked, ...limits(set), require_otp: !!set.require_otp, email_ready: emailReady(), unicode_font: !!uni,
      provider: { id: set.active_provider, name: prov.name, signature: prov.signature }, roles: L.ROLES, legal: L.LEGAL_LIMITS, owner: c.owner };
  }

  if (action === "render") {
    const html = String(body.html ?? ""); if (html.length > 600000) throw new Fail("The document is too large to prepare for signature.", 413);
    const r = await layoutFor(html, { name: String(body.firm_name ?? "").slice(0, 120), address: String(body.firm_address ?? "").slice(0, 200) });
    return { layout: r.layout, warnings: r.warnings };
  }

  if (action === "list") {
    let q = admin.from("esign_requests").select(REQ_LIST).eq("firm_id", c.firmId).order("created_at", { ascending: false }).limit(200);
    if (body.draft_key != null && body.draft_key !== "") q = q.eq("draft_key", String(body.draft_key));
    const { data: rows } = await q, ids = (rows ?? []).map((r: any) => r.id);
    const { data: ss } = ids.length ? await admin.from("esign_signers").select(SIGNER_PUBLIC).in("request_id", ids).order("sign_order") : { data: [] };
    return { requests: (rows ?? []).map((r: any) => ({ ...r, signers: (ss ?? []).filter((s: any) => s.request_id === r.id) })) };
  }

  if (action === "get") {
    const r = await loadReq(admin, c.firmId, body.request_id, REQ_LIST + (body.layout ? ",layout,letterhead" : "") + (typeof body.html === "string" ? ",doc_html" : ""));
    const htmlSame = typeof body.html === "string" ? r.doc_html === body.html : null; delete r.doc_html;
    const signers = await loadSigners(admin, r.id, SIGNER_PUBLIC), fields = await loadFields(admin, r.id);
    const { data: events } = await admin.from("esign_events").select("id,type,actor,signer_id,at,ip,data,hash").eq("request_id", r.id).order("id");
    return { request: r, signers: signers.map((s: any) => ({ ...s, pending: L.pendingAction(r, signers, s) })), fields: fields.map((f: any) => ({ ...f, signer_key: f.signer_id })), events: events ?? [], label: L.STATUS_LABEL[r.status], can_manage: canManage(c, r), html_same: htmlSame };
  }

  if (action === "prepare_save") {
    await needAccess(admin, c, set);
    const html = String(body.html ?? ""); if (!html.trim()) throw new Fail("The document is empty."); if (html.length > 600000) throw new Fail("The document is too large to prepare for signature.", 413);
    const title = String(body.title ?? "").trim().slice(0, 200) || "Document", signersIn = Array.isArray(body.signers) ? body.signers : [], fieldsIn = Array.isArray(body.fields) ? body.fields : [];
    const mode = body.mode === "sequential" ? "sequential" : "parallel", lh = { name: String(body.firm_name ?? "").slice(0, 120), address: String(body.firm_address ?? "").slice(0, 200) };
    const { layout, warnings } = await layoutFor(html, lh);
    const signers = signersIn.map((s: any, k: number) => ({ key: String(s.key ?? "s" + k), name: String(s.name ?? "").trim().slice(0, 160), email: String(s.email ?? "").trim().toLowerCase(), phone: L.cleanPhone(s.phone), role: String(s.role ?? ""), sign_order: Math.round(Number(mode === "parallel" ? 1 : s.sign_order ?? k + 1)), required: s.required !== false }));
    const fields = fieldsIn.map((f: any) => ({ kind: String(f.kind), page: Math.round(Number(f.page)), x: +Number(f.x).toFixed(5), y: +Number(f.y).toFixed(5), w: +Number(f.w).toFixed(5), h: +Number(f.h).toFixed(5), signer_key: String(f.signer_key ?? ""), required: f.required !== false, label: String(f.label ?? "").slice(0, 200) }));
    const problems = body.draftOnly ? [] : L.validatePrepared({ signers, fields, mode, pageCount: layout.pages.length }, limits(set));
    if (problems.length) throw new Fail(problems[0], 422, { problems });
    let r: any;
    if (body.request_id) { r = await loadReq(admin, c.firmId, body.request_id); if (!["prepared", "draft"].includes(r.status)) throw new Fail("This document has already been sent. Cancel the request to prepare it again.", 409); if (!canManage(c, r)) throw new Fail("Only the person who prepared it, or the firm owner, can change it.", 403); }
    const patch = { title, mode, doc_html: html, letterhead: lh, layout, page_count: layout.pages.length, draft_key: String(body.draft_key ?? ""), status: "prepared", provider: set.active_provider, error: null, updated_at: iso() };
    if (r) await admin.from("esign_requests").update(patch).eq("id", r.id);
    else { const { data, error } = await admin.from("esign_requests").insert({ ...patch, firm_id: c.firmId, created_by: c.user.id, creator_name: actor }).select("*").single(); if (error) throw error; r = data; await ev(admin, r, null, "created", actor, ctx, { title }); }
    await admin.from("esign_signers").delete().eq("request_id", r.id);   // fields go with them (cascade)
    const idOf: Record<string, string> = {};
    if (signers.length) {
      const { data: ins, error } = await admin.from("esign_signers").insert(signers.map((s: any) => ({ request_id: r.id, firm_id: c.firmId, name: s.name || "Signer", email: s.email, phone: s.phone, role: L.ROLES.includes(s.role) ? s.role : "Other", sign_order: s.sign_order >= 1 ? s.sign_order : 1, required: s.required }))).select("id,email");
      if (error) throw new Fail("Could not save the signers: " + error.message, 422);
      signers.forEach((s: any) => { idOf[s.key] = ins.find((x: any) => x.email === s.email)?.id; });
    }
    const rows = fields.filter((f: any) => idOf[f.signer_key]).map((f: any) => ({ request_id: r.id, firm_id: c.firmId, signer_id: idOf[f.signer_key], kind: f.kind, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label }));
    if (rows.length) { const { error } = await admin.from("esign_fields").insert(rows); if (error) throw new Fail("Could not save the fields: " + error.message, 422); }
    await ev(admin, r, null, "prepared", actor, ctx, { signers: signers.length, fields: rows.length, pages: layout.pages.length });
    return { request_id: r.id, page_count: layout.pages.length, warnings };
  }

  if (action === "discard") {
    const r = await loadReq(admin, c.firmId, body.request_id);
    if (!["prepared", "draft"].includes(r.status)) throw new Fail("Only a document that has not been sent can be discarded. Cancel a sent request instead.", 409);
    if (!canManage(c, r)) throw new Fail("Only the person who prepared it, or the firm owner, can discard it.", 403);
    await admin.from("esign_signers").delete().eq("request_id", r.id);
    await admin.from("esign_requests").update({ status: "cancelled", cancelled_at: iso(), updated_at: iso() }).eq("id", r.id);   // kept (with its audit trail), never deleted
    await ev(admin, r, null, "discarded", actor, ctx, {}); return { ok: true };
  }

  if (action === "send") {
    await needAccess(admin, c, set);
    if (!emailReady()) throw new Fail("Email is not set up on the server, so signing links cannot be sent. Ask your Legal Staff administrator to set RESEND_API_KEY and EMAIL_FROM.", 501);
    const r = await loadReq(admin, c.firmId, body.request_id);
    if (r.status !== "prepared") throw new Fail("This document has already been sent or closed.", 409);
    if (!canManage(c, r)) throw new Fail("Only the person who prepared it, or the firm owner, can send it.", 403);
    if (!PROVIDERS[r.provider]?.available || (PROVIDERS[set.active_provider] && !PROVIDERS[set.active_provider].available)) throw new Fail("The signing provider is not available. Ask your Legal Staff administrator.", 503);
    const title = String(body.title ?? r.title).trim().slice(0, 200); if (!title) throw new Fail("Give the document a title.");
    const message = String(body.message ?? "").trim().slice(0, 2000), days = L.clampExpiry(body.expires_in_days, limits(set)), expires = iso(now() + days * 864e5);
    const signers = await loadSigners(admin, r.id), fields = await loadFields(admin, r.id);
    const problems = L.validatePrepared({ signers: signers.map((s: any) => ({ ...s, key: s.id })), fields: fields.map((f: any) => ({ ...f, signer_key: f.signer_id })), mode: r.mode, pageCount: r.page_count }, limits(set));
    if (problems.length) throw new Fail(problems[0], 422, { problems });
    Object.assign(r, { title, message, expires_at: expires });
    const { layout } = r.layout ? { layout: r.layout } : await layoutFor(r.doc_html, r.letterhead);
    const bytes = await originalPdf(r, layout), hash = await L.sha256(bytes), path = `${c.firmId}/${r.id}/original.pdf`;
    await put(admin, c.firmId, path, bytes);
    const priced = set.pricing_mode === "credits", cost = priced ? set.credits_per_document : 0;
    const { data: ch, error: che } = await admin.rpc("esign_charge", { p_firm: c.firmId, p_request: r.id, p_month_from: L.istMonthStart(), p_free_month: set.free_per_month, p_free_trial: set.free_trial_documents, p_cost: cost, p_limit: set.max_documents_per_month, p_priced: priced });
    if (che) throw che;
    if (!ch.ok) {
      const why: Record<string, string> = { blocked: "Electronic signing is paused for your firm. Contact Legal Staff support.", limit: `Your firm has reached its limit of ${ch.limit} documents sent for signature this month.`, credits: `This document needs ${ch.need} signing credit${ch.need > 1 ? "s" : ""} and your firm has ${ch.have}. Buy credits to continue.` };
      throw new Fail(why[ch.code] ?? "Could not charge for this document.", ch.code === "credits" ? 402 : 403, { code: ch.code, need: ch.need, have: ch.have });
    }
    try {
      const { data: up } = await admin.from("esign_requests").update({ title, message, status: "sent", expires_at: expires, doc_hash: hash, original_path: path, provider: set.active_provider, error: null, updated_at: iso() }).eq("id", r.id).eq("status", "prepared").select("id");
      if (!up?.length) throw new Error("The request changed while sending.");
      Object.assign(r, { status: "sent", doc_hash: hash, original_path: path, sent_at: iso(), provider: set.active_provider });
      await ev(admin, r, null, "sent", actor, ctx, { mode: r.mode, signers: signers.length, expires, sha256: hash, charge: ch.via, provider: set.active_provider });
      await admin.from("esign_provider_usage").insert({ provider: set.active_provider, firm_id: c.firmId, request_id: r.id, kind: "document", units: 1, cost_paise: set.providers?.[set.active_provider]?.cost_per_document_paise ?? 0 });
      const failed = await notifyActive(admin, r, signers, ctx, "invite");
      const targeted = L.activeSigners(r.mode, signers).length;
      if (failed.length >= targeted) throw new Error("None of the signing emails could be delivered (" + failed.join(", ") + ").");
      return { ok: true, status: "sent", charge: ch.via, credits_left: ch.left, email_failed: failed };
    } catch (e) {   // sending failed: give the charge back and put the document back to "prepared"
      await admin.rpc("esign_refund", { p_request: r.id });
      await admin.from("esign_signers").update({ status: "pending", token_hash: null, token_expires: null, notified_at: null }).eq("request_id", r.id);
      await admin.from("esign_requests").update({ status: "prepared", error: String((e as Error).message).slice(0, 400), error_at: iso(), updated_at: iso() }).eq("id", r.id);
      await ev(admin, r, null, "send_failed", actor, ctx, { error: String((e as Error).message).slice(0, 300) });
      await admin.from("esign_provider_usage").insert({ provider: set.active_provider, firm_id: c.firmId, request_id: r.id, kind: "document", units: 0, ok: false, note: String((e as Error).message).slice(0, 200) });
      throw new Fail("Could not send the document: " + (e as Error).message + " Nothing was charged.", 502);
    }
  }

  if (action === "remind") {
    const r = await loadReq(admin, c.firmId, body.request_id);
    if (!L.OPEN.includes(r.status)) throw new Fail("Only a request that is waiting for signatures can be reminded.", 409);
    if (!canManage(c, r)) throw new Fail("Only the person who sent it, or the firm owner, can send reminders.", 403);
    if (!emailReady()) throw new Fail("Email is not set up on the server.", 501);
    let signers = await loadSigners(admin, r.id);
    const target = signers.filter((s: any) => L.canSignNow(r.mode, signers, s.id) && ["notified", "viewed"].includes(s.status) && (!body.signer_id || s.id === body.signer_id));
    if (!target.length) throw new Fail("There is nobody to remind right now.", 409);
    const recent = target.filter((s: any) => s.last_reminder_at && now() - Date.parse(s.last_reminder_at) < 3600e3);
    if (recent.length === target.length) throw new Fail("A reminder was sent less than an hour ago.", 429);
    const sent: string[] = [], failed: string[] = [];
    for (const s of target.filter((x: any) => !recent.includes(x))) {
      const token = L.newToken(); await admin.from("esign_signers").update({ token_hash: await L.sha256(token), token_expires: r.expires_at, session_hash: null, session_expires: null, reminders: s.reminders + 1, last_reminder_at: iso() }).eq("id", s.id);
      try { await mailSigner(r, s, token, "remind"); sent.push(s.email); await ev(admin, r, s.id, "reminder_sent", actor, ctx, { to: s.email }); } catch (e) { failed.push(s.email); await ev(admin, r, s.id, "email_failed", actor, ctx, { to: s.email }); }
    }
    if (!sent.length) throw new Fail("The reminder emails could not be delivered.", 502);
    return { ok: true, sent, failed };
  }

  if (action === "cancel") {
    const r = await loadReq(admin, c.firmId, body.request_id);
    if (!L.OPEN.includes(r.status)) throw new Fail("Only a request that is waiting for signatures can be cancelled.", 409);
    if (!canManage(c, r)) throw new Fail("Only the person who sent it, or the firm owner, can cancel it.", 403);
    const signers = await loadSigners(admin, r.id);
    await admin.from("esign_requests").update({ status: "cancelled", cancelled_at: iso(), updated_at: iso() }).eq("id", r.id);
    await admin.from("esign_signers").update({ token_hash: null, session_hash: null }).eq("request_id", r.id);   // every link stops working at once
    await ev(admin, r, null, "cancelled", actor, ctx, { reason: String(body.reason ?? "").slice(0, 300) });
    for (const s of signers.filter((x: any) => ["notified", "viewed"].includes(x.status))) sendMail(s.email, `Cancelled: ${r.title}`, `The request to sign "${r.title}" was cancelled by the sender. Please do not sign it.`, mailHtml({ heading: "Signing request cancelled", paras: [`Hello ${s.name},`, `The request to sign "${r.title}" was cancelled by the sender. The link no longer works.`] })).catch(() => {});
    return { ok: true };
  }

  if (action === "download") {
    const r = await loadReq(admin, c.firmId, body.request_id), which = body.which === "original" ? "original" : "signed";
    if (which === "signed" && r.status !== "completed") throw new Fail("The signed copy is available once everyone has signed.", 409);
    if (!r.original_path) throw new Fail("The document has not been sent yet.", 409);
    if (which === "signed" && (!r.signed_path || r.signed_path === "working")) throw new Fail("The signed copy is being prepared. Try again in a minute.", 409);
    const bytes = await get(admin, c.firmId, which === "signed" ? r.signed_path : r.original_path);
    await ev(admin, r, null, "downloaded", actor, ctx, { which });
    return { filename: L.winSafe(r.title).text.replace(/[^\w.\- ]+/g, "_").slice(0, 80) + (which === "signed" ? " (signed).pdf" : " (original).pdf"), pdf: toB64(bytes) };
  }

  if (action === "verify" || action === "verify_copy") {
    const r = await loadReq(admin, c.firmId, body.request_id);
    if (action === "verify_copy") {
      const copy = fromB64(String(body.pdf ?? "")), h = await L.sha256(copy);
      return { sha256: h, matches: h === r.signed_hash && r.signed_hash ? "signed" : h === r.doc_hash && r.doc_hash ? "original" : "none" };
    }
    const out: any = { original: null, signed: null };
    for (const [k, path, want] of [["original", r.original_path, r.doc_hash], ["signed", r.signed_path, r.signed_hash]] as const) {
      if (!path || path === "working") continue;
      try { const h = await L.sha256(await get(admin, c.firmId, path)); out[k] = { ok: h === want, sha256: h, recorded: want }; } catch (e) { out[k] = { ok: false, error: (e as Error).message }; }
    }
    out.chain = (await admin.rpc("esign_chain_check", { p_request: r.id })).data; out.ok = !!out.chain?.ok && [out.original, out.signed].every((x) => !x || x.ok);
    return out;
  }
  throw new Fail("Unknown action.");
}

// =====================================================================================================================
// signers (no account: the secret link is the credential)
// =====================================================================================================================
async function byToken(admin: any, token: string) {
  if (!L.tokenOk(token)) throw new Fail("This signing link is not valid.", 404);
  const { data: s } = await admin.from("esign_signers").select("*").eq("token_hash", await L.sha256(token)).maybeSingle();
  if (!s) throw new Fail("This signing link is not valid or is no longer active.", 404);
  if (s.token_expires && Date.parse(s.token_expires) <= now()) throw new Fail("This signing link has expired. Ask the sender for a new one.", 410);
  const { data: r } = await admin.from("esign_requests").select("*").eq("id", s.request_id).single();
  return { s, r };
}
const sessionOk = async (s: any, session: string) => !!(s.session_hash && s.session_expires && Date.parse(s.session_expires) > now() && L.tokenOk(session) && L.timingEq(await L.sha256(session), s.session_hash));
const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, "$1•••$2");

async function signerAction(admin: any, action: string, body: any, ctx: Ctx) {
  const set = await getSettings(admin), token = String(body.token ?? "");
  let { s, r } = await byToken(admin, token);
  let signers = await loadSigners(admin, r.id);
  if (L.OPEN.includes(r.status) && r.expires_at && Date.parse(r.expires_at) <= now()) { await refreshStatus(admin, r, signers, ctx); }
  const closedMsg: Record<string, string> = { cancelled: "The sender cancelled this request.", declined: "This request was declined and is closed.", expired: "This request has expired. Ask the sender to send it again.", failed: "This request could not be completed.", prepared: "This request is not active." };
  const info = { title: r.title, firm: r.letterhead?.name ?? "", sender: r.creator_name, expires_at: r.expires_at, signer: { name: s.name, role: s.role, email_masked: maskEmail(s.email) } };

  if (action === "download_signed") {
    if (r.status !== "completed" || !r.signed_path || r.signed_path === "working") throw new Fail("The signed copy is not ready yet.", 409);
    await ev(admin, r, s.id, "downloaded_by_signer", `${s.name} <${s.email}>`, ctx, {});
    return { filename: L.winSafe(r.title).text.replace(/[^\w.\- ]+/g, "_").slice(0, 80) + " (signed).pdf", pdf: toB64(await get(admin, r.firm_id, r.signed_path)) };
  }
  if (r.status === "completed") { if (action === "open") return { state: "completed", ...info, signed: s.status === "signed" }; throw new Fail("This document has already been completed.", 409); }
  if (closedMsg[r.status]) { if (action === "open") return { state: "closed", reason: closedMsg[r.status], ...info }; throw new Fail(closedMsg[r.status], 410); }
  if (s.status === "signed") { if (action === "open") return { state: "signed", ...info, signed_at: s.signed_at }; throw new Fail("You have already signed this document.", 409); }
  if (s.status === "declined") { if (action === "open") return { state: "closed", reason: "You declined this request.", ...info }; throw new Fail("You declined this request.", 410); }
  const who = `${s.name} <${s.email}>`;

  if (action === "otp_send") {
    if (!set.require_otp) return { ok: true, skipped: true };
    if (s.otp_sent_at && now() - Date.parse(s.otp_sent_at) < 30e3) throw new Fail("Wait 30 seconds before asking for another code.", 429);
    if (!emailReady()) throw new Fail("Email is not set up, so the code cannot be sent.", 501);
    const code = L.newCode();
    await admin.from("esign_signers").update({ otp_hash: await L.sha256(code + ":" + s.id), otp_expires: iso(now() + 10 * 60e3), otp_attempts: 0, otp_sent_at: iso() }).eq("id", s.id);
    try { await sendMail(s.email, `Your signing code: ${code}`, `Your Legal Staff signing code is ${code}. It works for 10 minutes. If you did not ask for it, ignore this email.`, mailHtml({ heading: "Your signing code", paras: [`Enter this code to open "${r.title}":`, code, "It works for 10 minutes. Never share it."] })); }
    catch (e) { throw new Fail("The code could not be emailed. Try again shortly.", 502); }
    await ev(admin, r, s.id, "otp_sent", who, ctx, {}); return { ok: true };
  }

  if (action === "otp_verify") {
    if (!s.otp_hash || !s.otp_expires || Date.parse(s.otp_expires) <= now()) throw new Fail("That code has expired. Ask for a new one.", 410);
    if (s.otp_attempts >= 5) throw new Fail("Too many wrong codes. Ask for a new one.", 429);
    const good = L.timingEq(await L.sha256(String(body.code ?? "").trim() + ":" + s.id), s.otp_hash);
    if (!good) { await admin.from("esign_signers").update({ otp_attempts: s.otp_attempts + 1 }).eq("id", s.id); await ev(admin, r, s.id, "otp_failed", who, ctx, {}); throw new Fail("That code is not right.", 401); }
    const session = L.newToken();
    await admin.from("esign_signers").update({ verified_at: iso(), otp_hash: null, otp_expires: null, session_hash: await L.sha256(session), session_expires: iso(now() + 2 * 3600e3) }).eq("id", s.id);
    await ev(admin, r, s.id, "otp_verified", who, ctx, {}); return { ok: true, session };
  }

  // everything below needs a verified session when verification is required
  let session = String(body.session ?? "");
  if (set.require_otp) { if (!(await sessionOk(s, session))) { if (action === "open") return { state: "verify", ...info }; throw new Fail("Verify your email first.", 401); } }
  else if (!(await sessionOk(s, session))) { session = L.newToken(); await admin.from("esign_signers").update({ session_hash: await L.sha256(session), session_expires: iso(now() + 2 * 3600e3) }).eq("id", s.id); }
  const mine = (await loadFields(admin, r.id)), myTurn = L.canSignNow(r.mode, signers, s.id);

  if (action === "open") {
    if (!s.viewed_at) {
      await admin.from("esign_signers").update({ status: "viewed", viewed_at: iso() }).eq("id", s.id).in("status", ["notified", "pending"]); s.status = "viewed"; s.viewed_at = iso();
      await ev(admin, r, s.id, "viewed", who, ctx, {}); signers = await loadSigners(admin, r.id); await refreshStatus(admin, r, signers, ctx);
    }
    const names: Record<string, string> = {}; signers.forEach((x: any) => (names[x.id] = x.name));
    return { state: myTurn ? "sign" : "wait", ...info, session, layout: r.layout, fields: mine.map((f: any) => ({ id: f.id, kind: f.kind, page: f.page, x: +f.x, y: +f.y, w: +f.w, h: +f.h, required: f.required, label: f.label, mine: f.signer_id === s.id, owner: names[f.signer_id], value: f.signer_id === s.id ? f.value : (f.value ?? null) })),
      message: r.message, waiting_for: myTurn ? [] : L.activeSigners(r.mode, signers).filter((x: any) => x.id !== s.id && x.required).map((x: any) => x.name), consent: L.CONSENT_TEXT, consent_version: L.CONSENT_VERSION, notices: L.LEGAL_LIMITS, signature_note: L.SIGNATURE_TYPE_NOTE, today: L.istDate() };
  }

  if (!myTurn) throw new Fail("It is not your turn to sign yet. You will get an email when it is.", 409);

  if (action === "decline") {
    const reason = String(body.reason ?? "").trim().slice(0, 500); if (!reason) throw new Fail("Please say why you are declining.");
    const { data: up } = await admin.from("esign_signers").update({ status: "declined", declined_at: iso(), decline_reason: reason, session_hash: null }).eq("id", s.id).in("status", ["notified", "viewed"]).select("id");
    if (!up?.length) throw new Fail("This request is no longer open.", 409);
    await ev(admin, r, s.id, "signer_declined", who, ctx, { reason, required: s.required });
    signers = await loadSigners(admin, r.id); const st = await refreshStatus(admin, r, signers, ctx);
    if (st === "declined") { await admin.from("esign_signers").update({ token_hash: null, session_hash: null }).eq("request_id", r.id).neq("status", "signed"); await notifyCreator(admin, r, `${s.name} declined to sign "${r.title}"`, `${s.name} (${s.role}) declined: ${reason}`); }
    else await advance(admin, r, ctx);
    return { ok: true };
  }

  if (action === "sign") {
    if (body.consent !== true) throw new Fail("You must agree to sign electronically.");
    const fds = mine.filter((f: any) => f.signer_id === s.id), values = body.values ?? {};
    let sig: any = null;
    const needsSig = fds.some((f: any) => f.kind === "signature"), needsIni = fds.some((f: any) => f.kind === "initials");
    if (needsSig || needsIni) {
      const g = body.signature ?? {}; if (!["typed", "drawn"].includes(g.type)) throw new Fail("Choose a typed or drawn signature.");
      try { if (needsSig) L.readPng(g.png); if (needsIni) L.readPng(g.initials_png); } catch (e) { throw new Fail((e as Error).message); }
      if (g.type === "typed" && !String(g.text ?? "").trim()) throw new Fail("Type your name to sign.");
      sig = { type: g.type, text: String(g.text ?? "").slice(0, 160), png: needsSig ? g.png : null, initials_png: needsIni ? g.initials_png : null };
    }
    const upd: { id: string; value: string }[] = [];
    for (const f of fds) {
      let v = "";
      if (f.kind === "date") v = L.istDate(); else if (f.kind === "name") v = String(values[f.id] ?? s.name).trim().slice(0, 160); else if (f.kind === "designation" || f.kind === "text") v = String(values[f.id] ?? "").trim().slice(0, 300);
      else continue;
      if (!v && f.required) throw new Fail(`Fill in "${f.label || f.kind}" before signing.`);
      upd.push({ id: f.id, value: v });
    }
    const consent = { version: L.CONSENT_VERSION, text: L.CONSENT_TEXT, at: iso(), ip: ctx.ip, ua: ctx.ua.slice(0, 300) };
    const { data: done } = await admin.from("esign_signers").update({ status: "signed", signed_at: iso(), signature: sig, consent, session_hash: null }).eq("id", s.id).in("status", ["notified", "viewed"]).select("id");
    if (!done?.length) throw new Fail("This request is no longer open.", 409);
    for (const u of upd) await admin.from("esign_fields").update({ value: u.value, filled_at: iso() }).eq("id", u.id).eq("signer_id", s.id);
    for (const f of fds.filter((x: any) => x.kind === "signature" || x.kind === "initials")) await admin.from("esign_fields").update({ value: "signed", filled_at: iso() }).eq("id", f.id);
    await ev(admin, r, s.id, "signed", who, ctx, { signature_type: sig?.type ?? "none", consent_version: L.CONSENT_VERSION, verified: !!s.verified_at, fields: fds.length });
    const st = await advance(admin, r, ctx);
    return { ok: true, status: st, completed: st === "completed" };
  }
  throw new Fail("Unknown action.");
}
async function notifyCreator(admin: any, r: any, subject: string, text: string) {
  try { const { data } = await admin.auth.admin.getUserById(r.created_by); const to = data?.user?.email; if (to) await sendMail(to, subject, text, mailHtml({ heading: subject, paras: [text] })); } catch { /* best effort */ }
}

// =====================================================================================================================
// schedule
// =====================================================================================================================
async function sweep(admin: any, ctx: Ctx) {
  const out = { expired: 0, advanced: 0, finalized: 0 };
  const { data: open } = await admin.from("esign_requests").select("*").in("status", L.OPEN).limit(300);
  for (const r of open ?? []) {
    const signers = await loadSigners(admin, r.id), before = r.status, st = await refreshStatus(admin, r, signers, ctx);
    if (st === "expired" && before !== "expired") { out.expired++; await admin.from("esign_signers").update({ token_hash: null, session_hash: null }).eq("request_id", r.id).neq("status", "signed"); await notifyCreator(admin, r, `Expired: ${r.title}`, `The signing request "${r.title}" expired before everyone signed.`); }
    else if (st === "completed") { if (await finalize(admin, r.id, ctx)) out.finalized++; }
    else if (r.mode === "sequential" && L.activeSigners(r.mode, signers).some((s: any) => s.status === "pending")) { await notifyActive(admin, r, signers, ctx, "invite"); out.advanced++; }
  }
  const { data: stuck } = await admin.from("esign_requests").select("id").eq("status", "completed").eq("signed_path", "").limit(50);   // finished but the signed PDF failed earlier
  for (const r of stuck ?? []) if (await finalize(admin, r.id, ctx)) out.finalized++;
  return out;
}
async function backup(admin: any) {
  const { data } = await admin.from("esign_requests").select("id,firm_id,signed_path,original_path").eq("status", "completed").gte("completed_at", iso(now() - 3 * 864e5)).limit(200);
  let copied = 0, failed = 0;
  for (const r of data ?? []) for (const p of [r.signed_path, r.original_path]) {
    if (!p || p === "working") continue;
    const to = "backup/" + p; await admin.storage.from("esign").remove([to]);
    const { error } = await admin.storage.from("esign").copy(p, to); if (error) failed++; else copied++;
  }
  return { copied, failed };
}

// =====================================================================================================================
// super admin
// =====================================================================================================================
async function adminAction(admin: any, action: string, body: any, user: any) {
  const set = await getSettings(admin);
  const names = async (ids: string[]) => { const m: Record<string, string> = {}; if (ids.length) (await admin.from("firms").select("id,name").in("id", ids)).data?.forEach((f: any) => (m[f.id] = f.name)); return m; };
  if (action === "admin_get") {
    const providers: any = {};
    for (const [k, p] of Object.entries(PROVIDERS)) providers[k] = { ...p, ...(set.providers?.[k] ?? {}), credential_saved: p.credential ? !!(await admin.rpc("esign_secret_has", { p_name: k })).data : false };
    const { count: firms } = await admin.from("esign_wallets").select("firm_id", { count: "exact", head: true });
    return { settings: { ...set, providers: undefined }, providers, email_ready: emailReady(), unicode_font: !!(await unicodeFont()), wallets: firms ?? 0, legal: L.LEGAL_LIMITS };
  }
  if (action === "admin_save") {
    const b = body.settings ?? {}, p: any = {}, int = (v: any, lo: number, hi: number, name: string) => { const n = Math.round(Number(v)); if (!(n >= lo && n <= hi)) throw new Fail(`${name} must be between ${lo} and ${hi}.`); return n; };
    if ("enabled" in b) p.enabled = !!b.enabled; if ("require_otp" in b) p.require_otp = !!b.require_otp;
    if ("pricing_mode" in b) { if (!["free", "credits"].includes(b.pricing_mode)) throw new Fail("Pricing is free or credits."); p.pricing_mode = b.pricing_mode; }
    if ("credits_per_document" in b) p.credits_per_document = int(b.credits_per_document, 0, 100, "Credits per document");
    for (const [k, lo, hi, n] of [["free_per_month", 0, 1000, "Free documents per month"], ["free_trial_documents", 0, 1000, "Free trial documents"], ["max_documents_per_month", 0, 100000, "Document limit"], ["max_signers", 1, 50, "Signer limit"], ["max_fields", 1, 500, "Field limit"], ["default_expiry_days", 1, 365, "Default expiry"], ["max_expiry_days", 1, 365, "Longest expiry"]] as [string, number, number, string][]) if (k in b) p[k] = int(b[k], lo, hi, n);
    if ((p.default_expiry_days ?? set.default_expiry_days) > (p.max_expiry_days ?? set.max_expiry_days)) throw new Fail("The default expiry cannot be longer than the longest expiry.");
    if ("packs" in b) {
      if (!Array.isArray(b.packs) || b.packs.length > 8) throw new Fail("At most 8 credit packs.");
      p.packs = b.packs.map((k: any) => ({ credits: int(k.credits, 1, 100000, "Pack credits"), price_paise: int(Math.round(Number(k.price_rupees ?? k.price_paise / 100) * 100), 100, 100000000, "Pack price") }));
    }
    if ("active_provider" in b) { if (!PROVIDERS[b.active_provider]?.available) throw new Fail("That provider is not installed. Only providers with an adapter can be made active."); p.active_provider = b.active_provider; }
    if (b.providers) { const cur = { ...(set.providers ?? {}) }; for (const k of Object.keys(PROVIDERS)) if (b.providers[k]) { const x = b.providers[k]; cur[k] = { ...(cur[k] ?? {}), ...("enabled" in x ? { enabled: PROVIDERS[k].available ? !!x.enabled : false } : {}), ...("base_url" in x ? { base_url: String(x.base_url ?? "").trim().slice(0, 200) } : {}), ...("cost_per_document_paise" in x || "cost_per_document_rupees" in x ? { cost_per_document_paise: int(Math.round(Number(x.cost_per_document_rupees ?? x.cost_per_document_paise / 100) * 100), 0, 10000000, "Cost per document") } : {}) }; }
      if (cur.native && cur.native.enabled === false && (p.active_provider ?? set.active_provider) === "native") throw new Fail("The built-in provider is the active provider, so it cannot be switched off."); p.providers = cur; }
    if (p.enabled && !emailReady()) throw new Fail("Switch-on needs email: set RESEND_API_KEY and EMAIL_FROM for the functions first, because signing links and codes are sent by email.");
    p.updated_at = iso(); await admin.from("esign_settings").update(p).eq("id", 1); return { ok: true };
  }
  if (action === "admin_secret") {   // write-only: the value goes into Vault and is never returned
    const k = String(body.provider ?? ""); if (!PROVIDERS[k]?.credential) throw new Fail("That provider takes no credential.");
    const { error } = await admin.rpc("esign_secret_set", { p_name: k, p_value: String(body.value ?? "") }); if (error) throw new Fail("Could not save the credential.", 500);
    return { ok: true, saved: !!String(body.value ?? "") };
  }
  if (action === "admin_activity") {
    let q = admin.from("esign_requests").select(REQ_LIST).order("created_at", { ascending: false }).limit(Math.min(200, Number(body.limit) || 100));
    if (body.status) q = q.eq("status", String(body.status));
    const { data } = await q, m = await names([...new Set((data ?? []).map((r: any) => r.firm_id))] as string[]);
    const { data: counts } = await admin.from("esign_requests").select("status");
    const by: Record<string, number> = {}; (counts ?? []).forEach((r: any) => (by[r.status] = (by[r.status] ?? 0) + 1));
    return { requests: (data ?? []).map((r: any) => ({ ...r, firm: m[r.firm_id] ?? "" })), by_status: by };
  }
  if (action === "admin_failed") {
    const { data: a } = await admin.from("esign_requests").select(REQ_LIST).not("error", "is", null).order("error_at", { ascending: false }).limit(100);
    const { data: u } = await admin.from("esign_provider_usage").select("*").eq("ok", false).order("at", { ascending: false }).limit(100);
    const m = await names([...new Set([...(a ?? []).map((r: any) => r.firm_id), ...(u ?? []).map((r: any) => r.firm_id).filter(Boolean)])] as string[]);
    return { requests: (a ?? []).map((r: any) => ({ ...r, firm: m[r.firm_id] ?? "" })), provider_failures: (u ?? []).map((r: any) => ({ ...r, firm: m[r.firm_id] ?? "" })) };
  }
  if (action === "admin_usage") {
    const { data: use } = await admin.from("esign_provider_usage").select("provider,units,cost_paise,ok,at").order("at", { ascending: false }).limit(5000);
    const { data: sold } = await admin.from("payments").select("amount_paise,esign_credits,paid_at").eq("kind", "esign").eq("status", "paid").limit(5000);
    const rows: Record<string, any> = {};
    for (const x of use ?? []) { const k = x.provider + "|" + x.at.slice(0, 7); const r = (rows[k] = rows[k] ?? { provider: x.provider, month: x.at.slice(0, 7), documents: 0, failures: 0, cost_paise: 0 }); if (x.ok) { r.documents += x.units; r.cost_paise += x.cost_paise; } else r.failures++; }
    return { usage: Object.values(rows).sort((a: any, b: any) => b.month.localeCompare(a.month)), credit_sales: { orders: (sold ?? []).length, credits: (sold ?? []).reduce((a: number, x: any) => a + (x.esign_credits ?? 0), 0), revenue_paise: (sold ?? []).reduce((a: number, x: any) => a + x.amount_paise, 0) } };
  }
  if (action === "admin_firm") {   // wallets, limits, block
    const { data: ws } = await admin.from("esign_wallets").select("*").order("updated_at", { ascending: false }).limit(200); const m = await names((ws ?? []).map((w: any) => w.firm_id));
    return { wallets: (ws ?? []).map((w: any) => ({ ...w, firm: m[w.firm_id] ?? "" })) };
  }
  if (action === "admin_grant") {
    const n = Math.round(Number(body.credits)); if (!(n >= 1 && n <= 100000)) throw new Fail("Enter the number of credits (1 to 100000).");
    const f = String(body.firm_id ?? ""); if (!(await admin.from("firms").select("id").eq("id", f).maybeSingle()).data) throw new Fail("Firm not found.", 404);
    const { data, error } = await admin.rpc("esign_add_credits", { p_firm: f, p_n: n, p_kind: "grant", p_payment: null, p_note: String(body.note ?? "Granted by Legal Staff").slice(0, 200), p_by: user.id });
    if (error) throw new Fail("Could not add the credits.", 500); return { ok: true, balance: data };
  }
  if (action === "admin_limit") {   // per-firm monthly limit and block
    const f = String(body.firm_id ?? ""); await admin.from("esign_wallets").upsert({ firm_id: f, ...( "monthly_limit" in body ? { monthly_limit: body.monthly_limit === null || body.monthly_limit === "" ? null : Math.max(0, Math.round(Number(body.monthly_limit))) } : {}), ...("blocked" in body ? { blocked: !!body.blocked } : {}), updated_at: iso() }, { onConflict: "firm_id" }); return { ok: true };
  }
  if (action === "admin_restore") {   // re-create a missing original PDF from the stored document snapshot, if it reproduces the recorded hash
    const { data: r } = await admin.from("esign_requests").select("*").eq("id", String(body.request_id ?? "")).maybeSingle(); if (!r) throw new Fail("Request not found.", 404);
    const path = r.original_path; let have = true; try { await get(admin, r.firm_id, path); } catch { have = false; }
    if (have) return { ok: true, note: "The stored original is intact; nothing to restore." };
    const b = "backup/" + path; try { const bytes = await get(admin, r.firm_id, b); if (await L.sha256(bytes) === r.doc_hash) { await put(admin, r.firm_id, path, bytes); return { ok: true, note: "Restored from the backup copy." }; } } catch { /* fall through */ }
    const bytes = await originalPdf(r, r.layout), h = await L.sha256(bytes);
    if (h !== r.doc_hash) throw new Fail("The original could not be restored byte for byte, so it was not written. The recorded hash is " + r.doc_hash, 409);
    await put(admin, r.firm_id, path, bytes); return { ok: true, note: "Rebuilt from the stored snapshot; the hash matches." };
  }
  throw new Fail("Unknown action.");
}

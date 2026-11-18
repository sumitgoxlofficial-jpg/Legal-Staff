// Razorpay checkout for the Rs 49 lifetime directory listing (migrations 0026, 0027). Public (no account): the application reference AND its
// enrolment number identify the applicant. Paying does NOT publish a profile; the moderator still decides.
//   { action: "config" }                                  → { enabled, key_id }                      (key_id is public by design)
//   { action: "create" | "status" | "verify", application_id, enr, ... }
//   ?action=webhook   Razorpay webhook (payment.captured / order.paid), verified by X-Razorpay-Signature
// Secrets (function secrets only): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET. Deploy with JWT verification off.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { LISTING_PAISE, verifyCheckout, verifyWebhook, judgePayment } from "../_shared/razorpay-logic.js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }
const env = (n: string) => Deno.env.get(n) ?? "";
const API = () => (env("RAZORPAY_API_BASE") || "https://api.razorpay.com").replace(/\/$/, "");
const OPEN_MINUTES = 30;
const rl = new Map<string, number[]>();
function rateLimit(key: string, max: number) { const t = Date.now(), a = (rl.get(key) ?? []).filter((x) => t - x < 60000); a.push(t); rl.set(key, a); if (a.length > max) throw new Fail("Too many requests. Try again in a minute.", 429); }
const scrub = (s: unknown) => String(s ?? "").replace(/rzp_(live|test)_[A-Za-z0-9]+/g, "[hidden]");

async function rzp(path: string, method = "GET", body?: unknown) {
  const auth = "Basic " + btoa(env("RAZORPAY_KEY_ID") + ":" + env("RAZORPAY_KEY_SECRET"));
  const r = await fetch(API() + path, { method, headers: { Authorization: auth, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Fail("Razorpay: " + scrub(j.error?.description || r.status), 502);
  return j;
}
async function dirApplication(admin: any, body: any) {
  const id = String(body.application_id ?? "").slice(0, 60), enr = String(body.enr ?? "").trim().toUpperCase();
  if (!id || !enr) throw new Fail("Application reference and enrolment number are needed.");
  const { data: a } = await admin.from("directory_applications").select("id,enr,status").eq("id", id).maybeSingle();
  if (!a || String(a.enr).trim().toUpperCase() !== enr) throw new Fail("We could not find that application.", 404);
  if (a.status === "rejected") throw new Fail("This application was not approved, so there is nothing to pay for.", 409);
  return a;
}
/** Marks the listing paid. One paid row per application: a second payment for an already-paid listing is NOT confirmed (the payment id is kept on the row so it can be refunded). */
async function confirm(admin: any, row: any, paymentId: string) {
  const { data: already } = await admin.from("directory_payments").select("id,gateway_payment_id").eq("application_id", row.application_id).eq("status", "paid").limit(1);
  if (already?.length && already[0].gateway_payment_id === paymentId) return { paid: true };   // the same payment reported again (webhook retry): nothing to do
  if (already?.length) { await admin.from("directory_payments").update({ gateway_payment_id: paymentId }).eq("id", row.id).eq("status", "created"); console.error("listing paid twice, refund needed", row.application_id, paymentId); return { paid: true, duplicate: true }; }
  const { data: claimed, error } = await admin.from("directory_payments").update({ status: "paid", gateway_payment_id: paymentId, utr: paymentId, confirmed_by: "razorpay", paid_at: new Date().toISOString() }).eq("id", row.id).eq("status", "created").select("id");
  if (error || !claimed?.length) return { paid: false };
  await admin.from("directory_payments").delete().eq("application_id", row.application_id).eq("status", "created");   // the applicant's other open orders (UPI or Razorpay) are void
  return { paid: true };
}
/** Reads the payment from Razorpay (never trusts the browser), captures it when only authorised, and confirms. */
async function settle(admin: any, row: any, paymentId: string) {
  let p = await rzp("/v1/payments/" + encodeURIComponent(paymentId));
  const v = judgePayment(p, row.gateway_order_id);
  if (!v.ok) throw new Fail("That payment cannot be accepted: " + v.reason + ".", 409);
  if (v.capture) { p = await rzp("/v1/payments/" + encodeURIComponent(paymentId) + "/capture", "POST", { amount: LISTING_PAISE, currency: "INR" }); if (p.status !== "captured") throw new Fail("The payment could not be captured.", 502); }
  return confirm(admin, row, paymentId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  try {
    const q = new URL(req.url).searchParams, raw = await req.text();
    const enabled = !!(env("RAZORPAY_KEY_ID") && env("RAZORPAY_KEY_SECRET"));
    // ---- webhook: the source of truth when the browser closes before verify ----
    if (q.get("action") === "webhook") {
      if (!(await verifyWebhook(env("RAZORPAY_WEBHOOK_SECRET"), raw, req.headers.get("x-razorpay-signature") ?? ""))) throw new Fail("Not allowed.", 403);
      const ev = JSON.parse(raw || "{}"), pay = ev.payload?.payment?.entity;
      if (!["payment.captured", "order.paid"].includes(ev.event) || !pay?.order_id) return json({ ok: true, ignored: true });
      const { data: row } = await admin.from("directory_payments").select("*").eq("gateway_order_id", pay.order_id).maybeSingle();
      if (!row) return json({ ok: true, ignored: true });
      const v = judgePayment(pay, row.gateway_order_id);
      if (!v.ok || v.capture) { console.error("webhook payment not accepted", v.reason); return json({ ok: true, ignored: true }); }
      return json({ ok: true, ...(await confirm(admin, row, pay.id)) });
    }
    const body = raw ? JSON.parse(raw) : {}, action = q.get("action") ?? body.action ?? "";
    if (action === "config") return json({ enabled, key_id: enabled ? env("RAZORPAY_KEY_ID") : "" });
    if (!enabled) throw new Fail("Card and netbanking payments are not switched on yet.", 501);
    rateLimit("rz:" + ip, 40);
    const a = await dirApplication(admin, body);
    const { data: paid } = await admin.from("directory_payments").select("amount_paise,paid_at").eq("application_id", a.id).eq("status", "paid").maybeSingle();
    if (paid) return json({ paid: true, amount: paid.amount_paise });
    if (action === "status") return json({ paid: false });
    if (action === "create") {
      const { data: mine } = await admin.from("directory_payments").select("*").eq("application_id", a.id).eq("status", "created").eq("method", "razorpay").gte("created_at", new Date(Date.now() - OPEN_MINUTES * 60e3).toISOString()).limit(1);
      let row = mine?.[0];
      if (!row) {
        const orderNo = "LR" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
        const o = await rzp("/v1/orders", "POST", { amount: LISTING_PAISE, currency: "INR", receipt: orderNo, notes: { kind: "directory_listing", application_id: a.id } });
        const ins = await admin.from("directory_payments").insert({ application_id: a.id, order_no: orderNo, amount_paise: LISTING_PAISE, method: "razorpay", gateway_order_id: o.id }).select("*").single();
        if (ins.error) throw new Fail("Could not create the payment.", 500);
        row = ins.data;
      }
      return json({ paid: false, key_id: env("RAZORPAY_KEY_ID"), order_id: row.gateway_order_id, amount: LISTING_PAISE, currency: "INR" });
    }
    if (action === "verify") {
      const orderId = String(body.razorpay_order_id ?? ""), paymentId = String(body.razorpay_payment_id ?? "");
      if (!(await verifyCheckout(env("RAZORPAY_KEY_SECRET"), orderId, paymentId, String(body.razorpay_signature ?? "")))) throw new Fail("The payment signature is not valid.", 400);
      const { data: row } = await admin.from("directory_payments").select("*").eq("gateway_order_id", orderId).eq("application_id", a.id).maybeSingle();
      if (!row) throw new Fail("Payment order not found.", 404);
      const r = await settle(admin, row, paymentId);
      return json({ paid: !!r.paid, amount: LISTING_PAISE, ...(r.duplicate ? { duplicate: true } : {}) });
    }
    throw new Fail("Unknown action.");
  } catch (e: any) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error("listing-razorpay", scrub(e?.message ?? e)); return json({ error: "Something went wrong." }, 500);
  }
});

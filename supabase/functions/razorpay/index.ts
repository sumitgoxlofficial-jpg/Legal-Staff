// Razorpay Standard Checkout for plan payments (card, UPI, netbanking, wallets).
//  action "create-order"   : signed-in firm owner -> creates a Razorpay order for the plan -> { order_id, amount, currency, key_id, ... }
//  action "verify-payment" : checks HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) against razorpay_signature; only a match
//                            marks the payment paid, activates the plan and issues the invoice. A mismatch changes nothing (400).
// Secrets (Edge Functions -> Secrets, never in the repository or the browser): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
// Also: "promo" / "dir-promo" (price after a promo code) and free orders (a 100%-off code activates straight away, no payment taken).
// This is the only way plan and directory-fee money is received: there is no own UPI QR code any more.
// POST with an x-razorpay-signature header is the Razorpay WEBHOOK (secret RAZORPAY_WEBHOOK_SECRET; point Razorpay at this function's URL and tick
// payment.captured, order.paid, payment.failed, refund.processed). The browser callback is a convenience; the webhook is what makes a payment
// count when the tab was closed. Both paths run the same claim-guarded activation, so a payment is never applied twice. Every event is kept in payment_events.
// Deploy with JWT verification off; it checks every caller itself.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

const PRICES: Record<string, Record<string, number>> = { Solo: { monthly: 299, annual: 2999 }, Professional: { monthly: 799, annual: 7999 }, Firm: { monthly: 3999, annual: 39999 } };
const PER_USER: Record<string, number> = { monthly: 249, annual: 2499 }, MAX_USERS = 15;   // keep in step with billing and admin
const DIR_FEE_PAISE = 4900;                                                                 // directory listing fee: Rs 49 here 
const MIN_PAISE = 100;                                                                      // Razorpay's minimum order amount
const listPrice = (plan: string, cycle: string, seats?: number | null) => {
  const p = PRICES[plan]?.[cycle]; if (!p) return 0;
  return p + (plan === "Professional" ? (Math.max(1, Number(seats) || 1) - 1) * PER_USER[cycle] : 0);
};
function seatsFor(body: any): number | null {
  if (body.plan !== "Professional") return null;
  const n = Number(body.users ?? 1);
  if (!Number.isInteger(n) || n < 1 || n > MAX_USERS) throw new Fail(`Choose between 1 and ${MAX_USERS} users.`);
  return n;
}
function priceFor(base: number, promo: { percent_off?: number; amount_off?: number; fixed_total?: number | null } | null) {
  const basePaise = Math.round(base * 100);
  let total: number;
  if (promo && promo.fixed_total != null) total = Math.min(Math.max(0, promo.fixed_total), basePaise);
  else {
    const off = promo ? Math.round(basePaise * (promo.percent_off ?? 0) / 100) + Math.round((promo.amount_off ?? 0) * 100) : 0;
    total = basePaise - Math.min(basePaise, Math.max(0, off));
    if (total > 0 && total < MIN_PAISE) total = MIN_PAISE;
  }
  return { base: basePaise, discount: basePaise - total, total };
}
function promoProblem(c: any, plan: string, cycle: string, now = Date.now()) {
  if (!c || !c.active) return "That promo code is not valid.";
  if (c.starts_at && Date.parse(c.starts_at) > now) return "That promo code is not active yet.";
  if (c.expires_at && Date.parse(c.expires_at) < now) return "That promo code has expired.";
  if (c.max_uses != null && c.uses >= c.max_uses) return "That promo code has been fully used.";
  if (c.plans?.length && !c.plans.includes(plan)) return `That promo code is not valid for the ${plan} plan.`;
  if (c.cycles?.length && !c.cycles.includes(cycle)) return `That promo code is only for ${c.cycles.join(" / ")} billing.`;
  return "";
}

/** The promo code row for a directory listing fee, checked as plan "Directory" / cycle "once" (codes limited to other plans do not apply); null when none was given. */
async function dirPromo(admin: any, raw: unknown, userId: string) {
  const code = String(raw ?? "").trim().toUpperCase();
  if (!code) return null;
  const { data: c } = await admin.from("promo_codes").select("*").eq("code", code).maybeSingle();
  const why = promoProblem(c, "Directory", "once");
  if (why) throw new Fail(why);
  if (c.once_per_firm) {
    const { data: used } = await admin.from("directory_orders").select("id").eq("user_id", userId).eq("promo_code", code).eq("status", "paid").limit(1);
    if (used?.length) throw new Fail("You have already used that promo code.");
  }
  return c;
}

const promoText = (c: any) => c.fixed_total != null ? "pay \u20b9" + (c.fixed_total / 100).toFixed(2).replace(/\.00$/, "") + " in total" : [c.percent_off ? c.percent_off + "% off" : "", c.amount_off ? "\u20b9" + c.amount_off + " off" : ""].filter(Boolean).join(" + ");

/** HMAC-SHA256(order_id + "|" + payment_id, secret) as lowercase hex. */
async function sign(orderId: string, paymentId: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(orderId + "|" + paymentId)));
  return Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
}
/** Comparison that does not stop at the first differing character. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Lists a directory profile for a verified, fully paid Razorpay order. Returns what happened. Safe to call twice (verify + webhook). */
async function listDirectory(admin: any, order: any, paymentId: string, by = "razorpay"): Promise<string> {
  const appId = String(order.notes?.application_id ?? ""), userId = String(order.notes?.user_id ?? "");
  if (order.notes?.kind !== "directory" || !appId || !userId) return "not_directory";
  if (!(order.amount >= MIN_PAISE && order.amount <= DIR_FEE_PAISE) || order.amount_paid !== order.amount || order.currency !== "INR") return "amount_mismatch";
  const { data: app } = await admin.from("directory_applications").select("id,user_id,paid_at,status").eq("id", appId).maybeSingle();
  if (!app || app.user_id !== userId) return "unmatched";
  const { data: have } = await admin.from("directory_orders").select("id,status").eq("order_no", order.id).maybeSingle();
  const now = new Date().toISOString(), code = String(order.notes?.promo ?? "");
  if (!have) {
    const { error } = await admin.from("directory_orders").insert({ application_id: app.id, user_id: userId, order_no: order.id, amount_paise: order.amount, status: "paid", utr: paymentId, confirmed_by: by, paid_at: now, promo_code: code || null, discount_paise: DIR_FEE_PAISE - order.amount });
    if (error && !String(error.message).includes("duplicate")) { console.error("directory order insert", error.message); throw new Fail("Your payment was received but the listing could not be switched on yet. It will be applied automatically; if not, contact support.", 500); }
  }
  if (app.paid_at) return have ? "already_done" : "duplicate_payment";   // a second paid order for an already listed profile: recorded, needs a refund by an admin
  if (app.status === "rejected") return "rejected_application";
  const { data: marked, error: e2 } = await admin.from("directory_applications").update({ paid_at: now, order_no: order.id }).eq("id", app.id).is("paid_at", null).select("id");
  if (e2) throw new Fail("Your payment was received but the listing could not be switched on yet. It will be applied automatically; if not, contact support.", 500);
  if (marked?.length && code) await admin.rpc("promo_use", { c: code });
  return marked?.length ? "listed" : "already_done";
}

/** The webhook: signature over the RAW body, replay-proof by event id, amount and ownership re-checked against our own records. */
async function webhook(admin: any, req: Request, auth: string, keyId: string, keySecret: string) {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
  if (!secret) return json({ error: "Webhook secret is not configured." }, 501);
  const raw = await req.text(), sig = (req.headers.get("x-razorpay-signature") ?? "").toLowerCase();
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))), (b) => b.toString(16).padStart(2, "0")).join("");
  if (!safeEqual(mac, sig)) return json({ error: "Bad signature." }, 400);
  let ev: any; try { ev = JSON.parse(raw); } catch { return json({ error: "Bad body." }, 400); }
  const kind = String(ev.event ?? ""), eventId = req.headers.get("x-razorpay-event-id") || null;
  const pay = ev.payload?.payment?.entity ?? null, ref = ev.payload?.refund?.entity ?? null;
  const orderId = String(pay?.order_id ?? ev.payload?.order?.entity?.id ?? ""), paymentId = String(pay?.id ?? ref?.payment_id ?? "");
  const log = async (outcome: string) => { await admin.from("payment_events").update({ outcome }).eq("event_id", eventId); };
  if (eventId) {
    const { error } = await admin.from("payment_events").insert({ event_id: eventId, kind, order_id: orderId || null, payment_id: paymentId || null, amount_paise: pay?.amount ?? ref?.amount ?? null, outcome: "received", payload: { event: kind, order_id: orderId, payment_id: paymentId, status: pay?.status ?? ref?.status ?? null } });
    if (error) return json({ ok: true, replay: true });   // unique event id: already handled
  }
  try {
    if (kind === "payment.captured" || kind === "order.paid") {
      if (!orderId || !paymentId) { await log("ignored"); return json({ ok: true }); }
      const { data: p } = await admin.from("payments").select("*").eq("gateway_order_id", orderId).eq("method", "razorpay").maybeSingle();
      if (p) {
        if (pay?.currency !== "INR" || pay?.amount !== p.amount_paise) { await log("amount_mismatch"); return json({ ok: true }); }
        if (p.status === "paid") { await log("already_done"); return json({ ok: true }); }
        const done = await activate(admin, p, paymentId, "razorpay-webhook"); await log(done ? "activated" : "already_done"); return json({ ok: true });
      }
      const g = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(orderId), { headers: { Authorization: auth }, signal: AbortSignal.timeout(15000) });
      const order = await g.json().catch(() => ({}));
      if (!g.ok) { await log("lookup_failed"); return json({ error: "Could not read the order." }, 502); }   // 5xx makes Razorpay retry
      await log(await listDirectory(admin, order, paymentId, "razorpay-webhook")); return json({ ok: true });
    }
    if (kind === "payment.failed") {
      await admin.from("payments").update({ status: "failed", failure_reason: String(pay?.error_description ?? pay?.error_code ?? "failed").slice(0, 300) }).eq("gateway_order_id", orderId).eq("status", "created");
      await log("failed"); return json({ ok: true });
    }
    if (kind === "refund.processed" || kind === "refund.created") {
      if (kind === "refund.created" || !ref?.id) { await log("noted"); return json({ ok: true }); }
      const { data: res, error } = await admin.rpc("apply_refund", { p_payment_id: String(ref.payment_id), p_refund_id: String(ref.id), p_amount: Number(ref.amount) });
      if (error) { console.error("apply_refund", error.message); return json({ error: "Could not record the refund." }, 500); }
      await log(String(res)); return json({ ok: true });
    }
    await log("ignored"); return json({ ok: true });
  } catch (e) {
    console.error("webhook", kind, e instanceof Fail ? e.message : String(e));
    return json({ error: "Could not process the event." }, 500);   // Razorpay retries with back-off
  }
}

/** Marks the payment paid and activates the plan; the paid period starts after any free-trial days or paid period left. */
async function activate(admin: any, p: any, paymentId: string | null, by = "razorpay") {
  const { data: claimed } = await admin.from("payments").update({ status: "paid", utr: paymentId, gateway_payment_id: paymentId, confirmed_by: by, paid_at: new Date().toISOString() })
    .eq("id", p.id).eq("status", "created").select("id");
  if (!claimed?.length) return false;              // already confirmed (a repeated verify call)
  const { data: cur } = await admin.from("subscriptions").select("*").eq("firm_id", p.firm_id).maybeSingle();
  let start = Date.now();
  if (cur?.status === "trialing" && cur.trial_ends) start = Math.max(start, Date.parse(cur.trial_ends));
  if (cur?.status === "active" && cur.renews) start = Math.max(start, Date.parse(cur.renews + "T00:00:00Z") + 864e5);
  const d = new Date(start); const since = d.toISOString().slice(0, 10);
  if (p.cycle === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1); else d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  const { error: subErr } = await admin.from("subscriptions").upsert({ firm_id: p.firm_id, plan: p.plan, cycle: p.cycle, seats: p.seats ?? null, status: "active", since, renews: d.toISOString().slice(0, 10), trial_ends: null, updated_at: new Date().toISOString() });
  if (subErr) {   // never leave a payment marked paid with no plan behind it: put it back so a retry or the webhook can finish the job
    console.error("subscription upsert", subErr.message);
    await admin.from("payments").update({ status: "created", paid_at: null }).eq("id", p.id);
    throw new Fail("Your payment was received but the plan could not be switched on yet. It will be applied automatically; if not, contact support.", 500);
  }
  if (p.gstin) await admin.from("firms").update({ gstin: p.gstin }).eq("id", p.firm_id);
  if (p.promo_code) await admin.rpc("promo_use", { c: p.promo_code });
  try {
    await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/billing", { method: "POST", headers: { Authorization: "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issue", payment_id: p.id }), signal: AbortSignal.timeout(25000) });
  } catch (e) { console.error("invoice", e); }
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "", keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
    const needKeys = () => { if (!keyId || !keySecret) throw new Fail("Razorpay payments are not switched on yet.", 501); };
    if (req.headers.get("x-razorpay-signature")) { needKeys(); return await webhook(admin, req, "Basic " + btoa(keyId + ":" + keySecret), keyId, keySecret); }
    let body: any = {};
    try { body = await req.json(); } catch { throw new Fail("Bad request."); }
    const action = String(body.action ?? "");

    if (action === "config") return json({ enabled: !!(keyId && keySecret), key_id: keyId });

    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Fail("Sign in again.", 401);
    const auth = "Basic " + btoa(keyId + ":" + keySecret);

    // ---- directory listing fee: Rs 49 once through Razorpay. No row is written until the payment is verified. ----
    if (action === "dir-create-order" || action === "dir-verify-payment" || action === "dir-promo") {
      const { data: app } = await admin.from("directory_applications").select("id,user_id,paid_at").eq("id", String(body.application_id ?? "")).maybeSingle();
      if (!app || app.user_id !== user.id) throw new Fail("Application not found.", 404);
      if (action === "dir-promo") {
        const c = await dirPromo(admin, body.promo, user.id);
        if (!c) throw new Fail("Enter a promo code.");
        return json({ code: c.code, label: promoText(c), ...priceFor(DIR_FEE_PAISE / 100, c) });
      }
      if (action === "dir-create-order") {
        if (app.paid_at) return json({ paid: true });
        const promo = await dirPromo(admin, body.promo, user.id);
        const expected = priceFor(DIR_FEE_PAISE / 100, promo).total;
        if (expected === 0) {   // a 100%-off code: nothing to pay, the listing is paid now
          const { data: okClaim } = await admin.rpc("promo_claim", { c: promo!.code, p_firm: null, p_user: user.id });
          if (!okClaim) throw new Fail("That promo code can no longer be used.");
          const orderNo = "LD" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase(), now = new Date().toISOString();
          const { error } = await admin.from("directory_orders").insert({ application_id: app.id, user_id: user.id, order_no: orderNo, amount_paise: 0, status: "paid", confirmed_by: "promo", paid_at: now, promo_code: promo!.code, discount_paise: DIR_FEE_PAISE });
          if (error) throw new Fail("Could not apply the promo code.", 500);
          await admin.from("directory_applications").update({ paid_at: now, order_no: orderNo }).eq("id", app.id).is("paid_at", null);
          return json({ free: true, order_no: orderNo, amount: 0 });
        }
        needKeys();
        const receipt = "LD" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
        const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ amount: expected, currency: "INR", receipt, notes: { kind: "directory", application_id: app.id, user_id: user.id, promo: promo?.code ?? "" } }) });
        const order = await r.json().catch(() => ({}));
        if (r.status === 401) { console.error("razorpay auth failed"); throw new Fail("Razorpay rejected our credentials. The payment gateway needs to be reconfigured.", 401); }
        if (!r.ok || !order.id) { console.error("razorpay dir order", r.status, JSON.stringify(order)); throw new Fail("Razorpay could not create the order. Please try again.", 500); }
        return json({ order_id: order.id, amount: order.amount, currency: order.currency, receipt, key_id: keyId });
      }
      needKeys();
      const orderId = String(body.razorpay_order_id ?? ""), paymentId = String(body.razorpay_payment_id ?? ""), signature = String(body.razorpay_signature ?? "");
      if (!orderId || !paymentId || !signature) throw new Fail("Missing payment details.");
      if (!safeEqual(await sign(orderId, paymentId, keySecret), signature.toLowerCase())) throw new Fail("Payment verification failed. If money was deducted, it will be refunded; contact support.", 400);
      // The signature proves this payment is for this order; the order itself (made by us) proves what it was for, its promo code and how much.
      const g = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(orderId), { headers: { Authorization: auth }, signal: AbortSignal.timeout(15000) });
      const order = await g.json().catch(() => ({}));
      if (!g.ok || order.notes?.application_id !== app.id || order.notes?.user_id !== user.id) throw new Fail("Payment verification failed. If money was deducted, it will be refunded; contact support.", 400);
      const outcome = await listDirectory(admin, order, paymentId);
      if (outcome === "amount_mismatch" || outcome === "not_directory" || outcome === "unmatched") throw new Fail("Payment verification failed. If money was deducted, it will be refunded; contact support.", 400);
      if (outcome === "rejected_application") throw new Fail("This application was rejected, so it cannot be listed. Contact support for a refund.", 409);
      if (outcome === "duplicate_payment") return json({ success: true, order_no: orderId, utr: paymentId, duplicate: true });
      return json({ success: true, order_no: orderId, utr: paymentId });
    }

    const firmId = body.firm_id;

    /** The promo code row for this request, checked for this firm and plan; null when none was given. */
    const loadPromo = async (plan: string, cycle: string) => {
      const code = String(body.promo ?? "").trim().toUpperCase();
      if (!code) return null;
      const { data: c } = await admin.from("promo_codes").select("*").eq("code", code).maybeSingle();
      const why = promoProblem(c, plan, cycle); if (why) throw new Fail(why);
      if (c.once_per_firm) {
        const { data: usedCode } = await admin.from("payments").select("id").eq("firm_id", firmId).eq("promo_code", code).eq("status", "paid").limit(1);
        if (usedCode?.length) throw new Fail("Your firm has already used that promo code.");
      }
      return c;
    };

    if (action === "promo") {
      const { data: member } = await asUser.rpc("is_member", { f: firmId });
      if (!member) throw new Fail("You are not a member of this firm.", 403);
      const base = listPrice(body.plan, body.cycle, seatsFor(body));
      if (!base) throw new Fail("Unknown plan.");
      const c = await loadPromo(body.plan, body.cycle);
      if (!c) throw new Fail("Enter a promo code.");
      return json({ code: c.code, label: promoText(c), ...priceFor(base, c) });
    }

    if (action === "create-order") {
      const { data: owner } = await asUser.rpc("is_owner", { f: firmId });
      if (!owner) throw new Fail("Only the firm owner can change the plan.", 403);
      const seats = seatsFor(body);
      const base = listPrice(body.plan, body.cycle, seats);
      if (!base) throw new Fail("Unknown plan.");
      const { count: used } = await admin.from("members").select("id", { count: "exact", head: true }).eq("firm_id", firmId);
      const cap = seats ?? (body.plan === "Solo" ? 1 : MAX_USERS);
      if ((used ?? 0) > cap) throw new Fail(`Your team has ${used} users, which is more than the ${body.plan} plan allows. Choose a bigger plan, or remove members first.`);
      const g = String(body.gstin ?? "").trim().toUpperCase();
      if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g)) throw new Fail("That GSTIN is not valid.");
      const promo = await loadPromo(body.plan, body.cycle);
      const price = priceFor(base, promo);
      if (price.total === 0) {   // a 100%-off code: nothing to pay, switch the plan on now
        const { data: okClaim } = await admin.rpc("promo_claim", { c: promo.code, p_firm: firmId, p_user: null });
        if (!okClaim) throw new Fail("That promo code can no longer be used.");
        const orderNo = "LS" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
        const { data: fp, error: fe } = await admin.from("payments").insert({ firm_id: firmId, user_id: user.id, plan: body.plan, cycle: body.cycle, seats, amount_paise: 0, gstin: g, method: "promo", order_no: orderNo, status: "created", promo_code: promo.code, discount_paise: price.discount }).select("*").single();
        if (fe) throw new Fail("Could not apply the promo code.", 500);
        await activate(admin, { ...fp, promo_code: null }, null, "promo");   // the code was counted by promo_claim
        return json({ free: true, order_no: orderNo, amount: 0 });
      }
      needKeys();

      const receipt = "LS" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
      const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", signal: AbortSignal.timeout(15000),
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price.total, currency: "INR", receipt, notes: { firm_id: String(firmId), plan: body.plan, cycle: body.cycle } }) });
      const order = await r.json().catch(() => ({}));
      if (r.status === 401) { console.error("razorpay auth failed"); throw new Fail("Razorpay rejected our credentials. The payment gateway needs to be reconfigured.", 401); }
      if (!r.ok || !order.id) { console.error("razorpay order", r.status, JSON.stringify(order)); throw new Fail("Razorpay could not create the order. Please try again.", 500); }

      const { error } = await admin.from("payments").insert({ firm_id: firmId, user_id: user.id, plan: body.plan, cycle: body.cycle, seats, amount_paise: price.total, gstin: g, method: "razorpay", order_no: receipt, gateway_order_id: order.id, status: "created", promo_code: promo?.code ?? null, discount_paise: price.discount });
      if (error) { console.error(error); throw new Fail("Could not create the payment.", 500); }
      return json({ order_id: order.id, amount: order.amount, currency: order.currency, receipt, key_id: keyId });
    }

    if (action === "verify-payment") {
      needKeys();
      const orderId = String(body.razorpay_order_id ?? ""), paymentId = String(body.razorpay_payment_id ?? ""), signature = String(body.razorpay_signature ?? "");
      if (!orderId || !paymentId || !signature) throw new Fail("Missing payment details.");
      const { data: member } = await asUser.rpc("is_member", { f: firmId });
      if (!member) throw new Fail("You are not a member of this firm.", 403);
      const { data: p } = await admin.from("payments").select("*").eq("gateway_order_id", orderId).eq("firm_id", firmId).eq("method", "razorpay").maybeSingle();
      if (!p) throw new Fail("Payment not found.", 404);
      if (!safeEqual(await sign(orderId, paymentId, keySecret), signature.toLowerCase())) throw new Fail("Payment verification failed. If money was deducted, it will be refunded; contact support.", 400);
      if (p.status === "paid") return json({ success: true, order_no: p.order_no, already: true });
      const og = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(orderId), { headers: { Authorization: auth }, signal: AbortSignal.timeout(15000) });
      const ord = await og.json().catch(() => ({}));
      if (!og.ok || ord.status !== "paid" || ord.amount_paid !== p.amount_paise || ord.currency !== "INR") throw new Fail("Razorpay has not confirmed this payment as completed yet. If money was deducted, your plan switches on automatically once it is; otherwise contact support.", 409);
      await activate(admin, p, paymentId);
      return json({ success: true, order_no: p.order_no });
    }

    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Something went wrong with the payment." }, 500);
  }
});

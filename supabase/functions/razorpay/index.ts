// Razorpay Standard Checkout for plan payments (card, UPI, netbanking, wallets).
//  action "create-order"   : signed-in firm owner -> creates a Razorpay order for the plan -> { order_id, amount, currency, key_id, ... }
//  action "verify-payment" : checks HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) against razorpay_signature; only a match
//                            marks the payment paid, activates the plan and issues the invoice. A mismatch changes nothing (400).
// Secrets (Edge Functions -> Secrets, never in the repository or the browser): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
// Deploy with JWT verification off; it checks every caller itself. Prices, promo codes and activation mirror functions/upi-pay.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

const PRICES: Record<string, Record<string, number>> = { Solo: { monthly: 299, annual: 2999 }, Professional: { monthly: 799, annual: 7999 }, Firm: { monthly: 3999, annual: 39999 } };
const PER_USER: Record<string, number> = { monthly: 249, annual: 2499 }, MAX_USERS = 15;   // keep in step with upi-pay, billing and admin
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

/** Marks the payment paid and activates the plan; the paid period starts after any free-trial days or paid period left. */
async function activate(admin: any, p: any, paymentId: string) {
  const { data: claimed } = await admin.from("payments").update({ status: "paid", utr: paymentId, gateway_payment_id: paymentId, confirmed_by: "razorpay", paid_at: new Date().toISOString() })
    .eq("id", p.id).eq("status", "created").select("id");
  if (!claimed?.length) return false;              // already confirmed (a repeated verify call)
  const { data: cur } = await admin.from("subscriptions").select("*").eq("firm_id", p.firm_id).maybeSingle();
  let start = Date.now();
  if (cur?.status === "trialing" && cur.trial_ends) start = Math.max(start, Date.parse(cur.trial_ends));
  if (cur?.status === "active" && cur.renews) start = Math.max(start, Date.parse(cur.renews + "T00:00:00Z") + 864e5);
  const d = new Date(start); const since = d.toISOString().slice(0, 10);
  if (p.cycle === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1); else d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  await admin.from("subscriptions").upsert({ firm_id: p.firm_id, plan: p.plan, cycle: p.cycle, seats: p.seats ?? null, status: "active", since, renews: d.toISOString().slice(0, 10), trial_ends: null, updated_at: new Date().toISOString() });
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
    const keyId = Deno.env.get("RAZORPAY_KEY_ID"), keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) throw new Fail("Razorpay payments are not switched on yet.", 501);
    let body: any = {};
    try { body = await req.json(); } catch { throw new Fail("Bad request."); }
    const action = String(body.action ?? "");

    if (action === "config") return json({ enabled: true, key_id: keyId });

    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Fail("Sign in again.", 401);
    const firmId = body.firm_id;

    if (action === "create-order") {
      const { data: owner } = await asUser.rpc("is_owner", { f: firmId });
      if (!owner) throw new Fail("Only the firm owner can change the plan.", 403);
      const seats = seatsFor(body);
      const base = listPrice(body.plan, body.cycle, seats);
      if (!base) throw new Fail("Unknown plan.");
      const { count: used } = await admin.from("members").select("id", { count: "exact", head: true }).eq("firm_id", firmId);
      if (seats && (used ?? 0) > seats) throw new Fail(`Your team has ${used} users. Choose at least ${used} users, or remove members first.`);
      const g = String(body.gstin ?? "").trim().toUpperCase();
      if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g)) throw new Fail("That GSTIN is not valid.");
      let promo: any = null;
      const code = String(body.promo ?? "").trim().toUpperCase();
      if (code) {
        const { data: c } = await admin.from("promo_codes").select("*").eq("code", code).maybeSingle();
        const why = promoProblem(c, body.plan, body.cycle); if (why) throw new Fail(why);
        if (c.once_per_firm) {
          const { data: usedCode } = await admin.from("payments").select("id").eq("firm_id", firmId).eq("promo_code", code).eq("status", "paid").limit(1);
          if (usedCode?.length) throw new Fail("Your firm has already used that promo code.");
        }
        promo = c;
      }
      const price = priceFor(base, promo);
      if (price.total < MIN_PAISE) throw new Fail("This order is free or below the ₹1 minimum. Use the UPI option to apply the promo code.");

      const receipt = "LS" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
      const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", signal: AbortSignal.timeout(15000),
        headers: { Authorization: "Basic " + btoa(keyId + ":" + keySecret), "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price.total, currency: "INR", receipt, notes: { firm_id: String(firmId), plan: body.plan, cycle: body.cycle } }) });
      const order = await r.json().catch(() => ({}));
      if (r.status === 401) { console.error("razorpay auth failed"); throw new Fail("Razorpay rejected our credentials. The payment gateway needs to be reconfigured.", 401); }
      if (!r.ok || !order.id) { console.error("razorpay order", r.status, JSON.stringify(order)); throw new Fail("Razorpay could not create the order. Please try again.", 500); }

      const { error } = await admin.from("payments").insert({ firm_id: firmId, user_id: user.id, plan: body.plan, cycle: body.cycle, seats, amount_paise: price.total, gstin: g, method: "razorpay", order_no: receipt, gateway_order_id: order.id, status: "created", promo_code: promo?.code ?? null, discount_paise: price.discount });
      if (error) { console.error(error); throw new Fail("Could not create the payment.", 500); }
      return json({ order_id: order.id, amount: order.amount, currency: order.currency, receipt, key_id: keyId });
    }

    if (action === "verify-payment") {
      const orderId = String(body.razorpay_order_id ?? ""), paymentId = String(body.razorpay_payment_id ?? ""), signature = String(body.razorpay_signature ?? "");
      if (!orderId || !paymentId || !signature) throw new Fail("Missing payment details.");
      const { data: member } = await asUser.rpc("is_member", { f: firmId });
      if (!member) throw new Fail("You are not a member of this firm.", 403);
      const { data: p } = await admin.from("payments").select("*").eq("gateway_order_id", orderId).eq("firm_id", firmId).eq("method", "razorpay").maybeSingle();
      if (!p) throw new Fail("Payment not found.", 404);
      if (!safeEqual(await sign(orderId, paymentId, keySecret), signature.toLowerCase())) throw new Fail("Payment verification failed. If money was deducted, it will be refunded; contact support.", 400);
      if (p.status === "paid") return json({ success: true, order_no: p.order_no, already: true });
      await activate(admin, p, paymentId);
      return json({ success: true, order_no: p.order_no });
    }

    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Something went wrong with the payment." }, 500);
  }
});

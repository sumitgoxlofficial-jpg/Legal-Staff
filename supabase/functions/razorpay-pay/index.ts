// Plan payments through Razorpay Checkout: the only way money is received. Razorpay shows UPI, cards, netbanking and wallets
// on its own page, so nothing here draws a QR code or talks to a bank by itself.
//   config   → is Razorpay set up (keys present)
//   promo    → price after a promo code
//   create   → creates the Razorpay order for a plan (the price is fixed here, never taken from the browser)
//   verify   → checks Razorpay's signature for the finished payment, captures it if needed, activates the plan
//   status   → asks Razorpay about an order whose checkout window was closed, activates the plan if it was paid
//   webhook  → ?action=webhook, signed by Razorpay (events payment.captured / order.paid): activates the plan even if the browser closed
// Keys come from the function secrets RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET, or else from Vault
// (migration 0024, public.razorpay_keys()). Promo codes: public.promo_codes. Every paid order gets an invoice (functions/billing).
// Deploy with JWT verification off; it checks every caller itself.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

const PRICES: Record<string, Record<string, number>> = { Solo: { monthly: 299, annual: 2999 }, Professional: { monthly: 799, annual: 7999 }, Firm: { monthly: 3999, annual: 39999 } };
// Professional: PRICES covers the first user; each additional user costs PER_USER. Keep in step with razorpay-pay, billing and admin.
const PER_USER: Record<string, number> = { monthly: 249, annual: 2499 }, MAX_USERS = 15;
/** List price in rupees for a plan and cycle; seats only counts for Professional (missing → 1). */
const listPrice = (plan: string, cycle: string, seats?: number | null) => {
  const p = PRICES[plan]?.[cycle]; if (!p) return 0;
  return p + (plan === "Professional" ? (Math.max(1, Number(seats) || 1) - 1) * PER_USER[cycle] : 0);
};

// logic:start — pure functions.
/** Users bought on Professional (1–MAX_USERS), or null for plans with a fixed user count. */
function seatsFor(body: any): number | null {
  if (body.plan !== "Professional") return null;
  const n = Number(body.users ?? 1);
  if (!Number.isInteger(n) || n < 1 || n > MAX_USERS) throw new Fail(`Choose between 1 and ${MAX_USERS} users.`);
  return n;
}
/** Price in paise for a plan after a promo code (percent and/or flat rupees off, or a fixed total). No GST is added.
 *  Never below ₹1 unless the code makes it free. */
function priceFor(base: number, promo: { percent_off?: number; amount_off?: number; fixed_total?: number | null } | null) {
  const basePaise = Math.round(base * 100);
  let total: number;
  if (promo && promo.fixed_total != null) total = Math.min(Math.max(0, promo.fixed_total), basePaise);
  else {
    const off = promo ? Math.round(basePaise * (promo.percent_off ?? 0) / 100) + Math.round((promo.amount_off ?? 0) * 100) : 0;
    total = basePaise - Math.min(basePaise, Math.max(0, off));
    if (total > 0 && total < 100) total = 100;
  }
  return { base: basePaise, discount: basePaise - total, taxable: total, gst: 0, total };
}
/** Why a promo code can't be used for this plan right now, or '' if it can. */
function promoProblem(c: any, plan: string, cycle: string, now = Date.now()) {
  if (!c || !c.active) return "That promo code is not valid.";
  if (c.starts_at && Date.parse(c.starts_at) > now) return "That promo code is not active yet.";
  if (c.expires_at && Date.parse(c.expires_at) < now) return "That promo code has expired.";
  if (c.max_uses != null && c.uses >= c.max_uses) return "That promo code has been fully used.";
  if (c.plans?.length && !c.plans.includes(plan)) return `That promo code is not valid for the ${plan} plan.`;
  if (c.cycles?.length && !c.cycles.includes(cycle)) return `That promo code is only for ${c.cycles.join(" / ")} billing.`;
  return "";
}
// logic:end

async function rzpKeys(admin: any) {
  let id = Deno.env.get("RAZORPAY_KEY_ID") ?? "", secret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "", webhook = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
  if (!id || !secret || !webhook) {
    const { data } = await admin.rpc("razorpay_keys");
    const k = Array.isArray(data) ? data[0] : data;
    id = id || k?.key_id || ""; secret = secret || k?.key_secret || ""; webhook = webhook || k?.webhook_secret || "";
  }
  return { id, secret, webhook };
}
async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sameText(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
const basic = (k: { id: string; secret: string }) => "Basic " + btoa(k.id + ":" + k.secret);

/** Marks a payment paid and activates the plan; the paid period starts after any free-trial days or paid period left.
 *  Safe to call twice: only the first call that finds the payment unpaid does the work. */
async function activate(admin: any, p: any, gatewayPaymentId: string | null, by: string) {
  const { data: claimed } = await admin.from("payments").update({ status: "paid", gateway_payment_id: gatewayPaymentId, confirmed_by: by, paid_at: new Date().toISOString() })
    .eq("id", p.id).eq("status", "created").select("id");
  if (!claimed?.length) return false;
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
  await issueInvoice(p.id);
  return true;
}

/** Asks the billing function to create this payment's invoice and email it to the buyer (never blocks the plan). */
async function issueInvoice(paymentId: string) {
  try {
    await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/billing", { method: "POST", headers: { Authorization: "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issue", payment_id: paymentId }), signal: AbortSignal.timeout(25000) });
  } catch (e) { console.error("invoice", e); }
}

/** Checks one Razorpay payment against our order (right order, exact amount, INR), captures it if Razorpay only authorized it,
 *  then activates the plan. Returns true when the plan is (now) active for this order. */
async function settle(admin: any, keys: { id: string; secret: string }, p: any, rzpPaymentId: string, by: string) {
  const r = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(rzpPaymentId), { headers: { Authorization: basic(keys) }, signal: AbortSignal.timeout(15000) });
  const pay = await r.json().catch(() => ({}));
  if (!r.ok || pay.order_id !== p.gateway_order_id || pay.amount !== p.amount_paise || pay.currency !== "INR") return false;
  let status = pay.status;
  if (status === "authorized") {
    const c = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(rzpPaymentId) + "/capture", { method: "POST", headers: { Authorization: basic(keys), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: p.amount_paise, currency: "INR" }), signal: AbortSignal.timeout(15000) });
    status = (await c.json().catch(() => ({}))).status;
  }
  if (status !== "captured") return false;
  await activate(admin, p, rzpPaymentId, by);
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const q = new URL(req.url).searchParams;
    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    const action = q.get("action") ?? body.action ?? "";
    const keys = await rzpKeys(admin);

    // ---- Razorpay webhook: authenticated by Razorpay's signature over the raw body ----
    if (action === "webhook") {
      if (!keys.webhook) return new Response("webhook secret not set", { status: 501 });
      if (!sameText(await hmacHex(keys.webhook, raw), req.headers.get("x-razorpay-signature") ?? "")) return new Response("bad signature", { status: 400 });
      const pay = body?.payload?.payment?.entity;
      if ((body.event === "payment.captured" || body.event === "order.paid") && pay?.order_id && pay?.id) {
        const { data: p } = await admin.from("payments").select("*").eq("gateway_order_id", pay.order_id).maybeSingle();
        if (p && p.status === "created") await settle(admin, keys, p, pay.id, "razorpay");
      }
      return new Response("ok");
    }

    if (action === "config") return json({ enabled: !!(keys.id && keys.secret) });

    // ---- signed-in firm members ----
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Fail("Sign in again.", 401);
    const firmId = body.firm_id;

    /** The promo code row for this request, checked for this firm and plan; null when none was given. */
    const loadPromo = async (plan: string, cycle: string) => {
      const code = String(body.promo ?? "").trim().toUpperCase();
      if (!code) return null;
      const { data: c } = await admin.from("promo_codes").select("*").eq("code", code).maybeSingle();
      const why = promoProblem(c, plan, cycle);
      if (why) throw new Fail(why);
      if (c.once_per_firm) {
        const { data: used } = await admin.from("payments").select("id").eq("firm_id", firmId).eq("promo_code", code).eq("status", "paid").limit(1);
        if (used?.length) throw new Fail("Your firm has already used that promo code.");
      }
      return c;
    };
    const promoLabel = (c: any) => c.fixed_total != null ? "pay ₹" + (c.fixed_total / 100).toFixed(2).replace(/\.00$/, "") + " in total" : [c.percent_off ? c.percent_off + "% off" : "", c.amount_off ? "₹" + c.amount_off + " off" : ""].filter(Boolean).join(" + ");

    if (action === "promo") {
      const { data: member } = await asUser.rpc("is_member", { f: firmId });
      if (!member) throw new Fail("You are not a member of this firm.", 403);
      const base = listPrice(body.plan, body.cycle, seatsFor(body));
      if (!base) throw new Fail("Unknown plan.");
      const c = await loadPromo(body.plan, body.cycle);
      if (!c) throw new Fail("Enter a promo code.");
      return json({ code: c.code, label: promoLabel(c), ...priceFor(base, c) });
    }

    if (action === "create") {
      const { data: owner } = await asUser.rpc("is_owner", { f: firmId });
      if (!owner) throw new Fail("Only the firm owner can change the plan.", 403);
      const seats = seatsFor(body);
      const base = listPrice(body.plan, body.cycle, seats);
      if (!base) throw new Fail("Unknown plan.");
      const { count: used } = await admin.from("members").select("id", { count: "exact", head: true }).eq("firm_id", firmId);
      if (seats && (used ?? 0) > seats) throw new Fail(`Your team has ${used} users. Choose at least ${used} users, or remove members first.`);
      const g = String(body.gstin ?? "").trim().toUpperCase();
      if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g)) throw new Fail("That GSTIN is not valid.");
      const promo = await loadPromo(body.plan, body.cycle);
      const price = priceFor(base, promo);
      const orderNo = "LS" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
      if (price.total === 0) {   // a 100%-off code: nothing to pay, switch the plan on now
        const { data: p, error } = await admin.from("payments").insert({ firm_id: firmId, user_id: user.id, plan: body.plan, cycle: body.cycle, seats, amount_paise: 0, gstin: g, method: "promo", order_no: orderNo, status: "created", promo_code: promo.code, discount_paise: price.discount }).select("*").single();
        if (error) throw new Fail("Could not apply the promo code.", 500);
        await activate(admin, p, null, "promo");
        return json({ free: true, order_no: orderNo, amount: 0 });
      }
      if (!keys.id || !keys.secret) throw new Fail("Payments are not switched on yet. Please try again later.", 501);
      const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: basic(keys) },
        body: JSON.stringify({ amount: price.total, currency: "INR", receipt: orderNo, notes: { firm_id: firmId, plan: body.plan, cycle: body.cycle, order_no: orderNo } }), signal: AbortSignal.timeout(15000) });
      const order = await r.json().catch(() => ({}));
      if (!r.ok || !order.id) throw new Fail(order?.error?.description ?? "Razorpay could not start the payment. Please try again.", 502);
      const { error } = await admin.from("payments").insert({ firm_id: firmId, user_id: user.id, plan: body.plan, cycle: body.cycle, seats, amount_paise: price.total, gstin: g, method: "razorpay", order_no: orderNo, gateway_order_id: order.id, status: "created", promo_code: promo?.code ?? null, discount_paise: price.discount });
      if (error) throw new Fail("Could not record the payment.", 500);
      return json({ order_no: orderNo, order_id: order.id, amount: price.total, currency: "INR", key_id: keys.id, email: user.email });
    }

    if (action === "verify") {
      const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = body;
      if (!oid || !pid || !sig) throw new Fail("Incomplete payment details.");
      if (!keys.secret) throw new Fail("Payments are not switched on yet.", 501);
      if (!sameText(await hmacHex(keys.secret, oid + "|" + pid), String(sig))) throw new Fail("The payment signature did not verify.");
      const { data: p } = await admin.from("payments").select("*").eq("gateway_order_id", oid).maybeSingle();
      if (!p) throw new Fail("Unknown order.", 404);
      const { data: member } = await asUser.rpc("is_member", { f: p.firm_id });
      if (!member) throw new Fail("This order belongs to another firm.", 403);
      if (p.status === "created") await settle(admin, keys, p, pid, "razorpay");
      const { data: now } = await admin.from("payments").select("status,gateway_payment_id").eq("id", p.id).single();
      return json({ status: now.status, order_no: p.order_no, payment_id: now.gateway_payment_id });
    }

    if (action === "status") {
      const { data: member } = await asUser.rpc("is_member", { f: firmId });
      if (!member) throw new Fail("You are not a member of this firm.", 403);
      const { data: p } = await admin.from("payments").select("*").eq("order_no", String(body.order_no ?? "")).eq("firm_id", firmId).maybeSingle();
      if (!p) throw new Fail("Payment not found.", 404);
      if (p.status === "created" && p.gateway_order_id && keys.id) {   // the checkout window was closed: ask Razorpay what happened
        const r = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(p.gateway_order_id) + "/payments", { headers: { Authorization: basic(keys) }, signal: AbortSignal.timeout(15000) });
        const list = await r.json().catch(() => ({}));
        const hit = (list.items ?? []).find((x: any) => x.status === "captured" || x.status === "authorized");
        if (hit) await settle(admin, keys, p, hit.id, "razorpay");
      }
      const { data: now } = await admin.from("payments").select("status,gateway_payment_id").eq("id", p.id).single();
      return json({ status: now.status, payment_id: now.gateway_payment_id });
    }

    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Something went wrong with the payment." }, 500);
  }
});

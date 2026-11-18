// Directory listing fee (₹49) paid through Razorpay Checkout, with promo codes (public.promo_codes, migration 0013). Migration 0024.
// Actions (POST JSON, no sign-in needed — advocates apply before they have an account):
//   config → { enabled, amount, key_id }          what the application page needs to show the fee
//   promo  → { code, label, base, discount, total } price after a code (codes with plans = '{Directory}' or no plan limit)
//   create → { order_id, key_id, amount } for Razorpay Checkout, or { free: true, order_id } when a code makes the fee ₹0
//   verify → { ok: true, order_id }               checks Razorpay's signature; the fee is then paid and the application may be saved
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (supabase secrets set …). Deploy with JWT verification off.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Price in paise after a promo code (percent and/or flat rupees off, or a fixed total). Never below ₹1 unless the code makes it free. */
function priceFor(basePaise: number, promo: { percent_off?: number; amount_off?: number; fixed_total?: number | null } | null) {
  let total: number;
  if (promo && promo.fixed_total != null) total = Math.min(Math.max(0, promo.fixed_total), basePaise);
  else {
    const off = promo ? Math.round(basePaise * (promo.percent_off ?? 0) / 100) + Math.round((promo.amount_off ?? 0) * 100) : 0;
    total = basePaise - Math.min(basePaise, Math.max(0, off));
    if (total > 0 && total < 100) total = 100;   // Razorpay's minimum is ₹1
  }
  return { base: basePaise, discount: basePaise - total, total };
}
function promoProblem(c: any, now = Date.now()) {
  if (!c || !c.active) return "That promo code is not valid.";
  if (c.starts_at && Date.parse(c.starts_at) > now) return "That promo code is not active yet.";
  if (c.expires_at && Date.parse(c.expires_at) < now) return "That promo code has expired.";
  if (c.max_uses != null && c.uses >= c.max_uses) return "That promo code has been fully used.";
  if (c.plans?.length && !c.plans.includes("Directory")) return "That promo code is not valid for the directory fee.";
  return "";
}
const label = (c: any) => c.fixed_total != null ? "pay ₹" + (c.fixed_total / 100).toFixed(2).replace(/\.00$/, "") + " in total" : [c.percent_off ? c.percent_off + "% off" : "", c.amount_off ? "₹" + c.amount_off + " off" : ""].filter(Boolean).join(" + ");
async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "", keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
  try {
    if (req.method !== "POST") throw new Fail("Use POST.", 405);
    const body: any = await req.json().catch(() => ({}));
    const { data: s } = await admin.from("directory_fee_settings").select("*").eq("id", 1).single();
    const enabled = !!(s?.enabled && keyId && keySecret), base: number = s?.amount_paise ?? 4900;
    if (body.action === "config") return json({ enabled, amount: base, key_id: enabled ? keyId : "" });
    if (!enabled) throw new Fail("The directory fee is not switched on yet.", 501);

    const email = String(body.email ?? "").trim().toLowerCase();
    /** The promo code row for this request, checked; null when none was given. */
    const loadPromo = async () => {
      const code = String(body.promo ?? "").trim().toUpperCase();
      if (!code) return null;
      const { data: c } = await admin.from("promo_codes").select("*").eq("code", code).maybeSingle();
      const why = promoProblem(c); if (why) throw new Fail(why);
      if (c.once_per_firm) {   // "once per firm" means once per advocate (email) here
        const { data: used } = await admin.from("directory_fees").select("id").eq("promo_code", code).eq("email", email).neq("status", "created").limit(1);
        if (used?.length) throw new Fail("You have already used that promo code.");
      }
      return c;
    };

    if (body.action === "promo") {
      if (!EMAIL.test(email)) throw new Fail("Enter your email in the Personal step first.");
      const c = await loadPromo(); if (!c) throw new Fail("Enter a promo code.");
      return json({ code: c.code, label: label(c), ...priceFor(base, c) });
    }

    if (body.action === "create") {
      if (!EMAIL.test(email)) throw new Fail("Enter a valid email in the Personal step first.");
      const promo = await loadPromo(), price = priceFor(base, promo);
      const row = { email, base_paise: base, discount_paise: price.discount, amount_paise: price.total, promo_code: promo?.code ?? null };
      if (price.total === 0) {   // a 100%-off code: nothing to pay
        const order_id = "DIRPROMO-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
        const { error } = await admin.from("directory_fees").insert({ ...row, order_id, method: "promo", status: "paid", paid_at: new Date().toISOString() });
        if (error) throw new Fail("Could not apply the promo code.", 500);
        await admin.rpc("promo_use", { c: promo.code });
        return json({ free: true, order_id, amount: 0 });
      }
      const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", signal: AbortSignal.timeout(15000),
        headers: { Authorization: "Basic " + btoa(keyId + ":" + keySecret), "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price.total, currency: "INR", receipt: "DIR" + Date.now().toString(36), notes: { purpose: "Directory listing fee", email, promo: promo?.code ?? "" } }) });
      const o = await r.json().catch(() => ({}));
      if (!r.ok || !o.id) { console.error("razorpay order", r.status, JSON.stringify(o).slice(0, 300)); throw new Fail("Could not start the payment. Please try again in a moment.", 502); }
      const { error } = await admin.from("directory_fees").insert({ ...row, order_id: o.id });
      if (error) throw new Fail("Could not start the payment.", 500);
      return json({ order_id: o.id, key_id: keyId, amount: price.total });
    }

    if (body.action === "verify") {
      const oid = String(body.razorpay_order_id ?? ""), pid = String(body.razorpay_payment_id ?? ""), sig = String(body.razorpay_signature ?? "");
      if (!oid || !pid || !sig) throw new Fail("Payment details are missing.");
      if (!same(await hmacHex(keySecret, oid + "|" + pid), sig.toLowerCase())) throw new Fail("The payment could not be verified. If money was deducted, it will be refunded; contact support with the payment id " + pid + ".", 400);
      const { data: f } = await admin.from("directory_fees").update({ status: "paid", payment_id: pid, paid_at: new Date().toISOString() }).eq("order_id", oid).eq("status", "created").select("promo_code").maybeSingle();
      if (f?.promo_code) await admin.rpc("promo_use", { c: f.promo_code });
      const { data: cur } = await admin.from("directory_fees").select("status").eq("order_id", oid).maybeSingle();
      if (!cur) throw new Fail("Unknown payment.", 404);
      return json({ ok: true, order_id: oid });
    }
    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Something went wrong with the payment." }, 500);
  }
});

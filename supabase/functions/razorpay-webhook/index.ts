// Razorpay webhook: activates the plan even if the browser closed before verification.
// Deploy with JWT verification off; the request is authenticated by Razorpay's signature.
import { createClient } from "jsr:@supabase/supabase-js@2";

// Marks a payment as paid and activates the plan. Safe to call twice for the same order.
async function activate(admin: any, orderId: string, paymentId: string) {
  const { data: p } = await admin.from("payments").select("*").eq("razorpay_order_id", orderId).maybeSingle();
  if (!p) return null;
  if (p.status !== "paid") {
    // The paid period starts when the current one ends: unused free-trial days or a paid period still running are kept.
    const { data: cur } = await admin.from("subscriptions").select("*").eq("firm_id", p.firm_id).maybeSingle();
    let start = Date.now();
    if (cur?.status === "trialing" && cur.trial_ends) start = Math.max(start, Date.parse(cur.trial_ends));
    if (cur?.status === "active" && cur.renews) start = Math.max(start, Date.parse(cur.renews + "T00:00:00Z") + 864e5);
    const d = new Date(start); const since = d.toISOString().slice(0, 10);
    if (p.cycle === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1); else d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(d.getUTCDate() - 1); // the period's last day
    const renews = d.toISOString().slice(0, 10);
    await admin.from("payments").update({ status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() }).eq("id", p.id);
    await admin.from("subscriptions").upsert({ firm_id: p.firm_id, plan: p.plan, cycle: p.cycle, status: "active", since, renews, trial_ends: null, updated_at: new Date().toISOString() });
    if (p.gstin) await admin.from("firms").update({ gstin: p.gstin }).eq("id", p.firm_id);
  }
  const { data: sub } = await admin.from("subscriptions").select("*").eq("firm_id", p.firm_id).maybeSingle();
  return { payment: p, subscription: sub };
}
async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sameText(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }

// Keys come from the function secrets, or else from Vault (migration 0009, public.razorpay_keys()).
async function rzpKeys(admin: any) {
  let id = Deno.env.get("RAZORPAY_KEY_ID") ?? "", secret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "", webhook = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";
  if (!id || !secret || !webhook) {
    const { data } = await admin.rpc("razorpay_keys");
    const k = Array.isArray(data) ? data[0] : data;
    id = id || k?.key_id || ""; secret = secret || k?.key_secret || ""; webhook = webhook || k?.webhook_secret || "";
  }
  return { id, secret, webhook };
}

Deno.serve(async (req: Request) => {
  const { webhook: secret } = await rzpKeys(createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!));
  if (!secret) return new Response("webhook secret not set", { status: 501 });
  const raw = await req.text();
  const expected = await hmacHex(secret, raw);
  if (!sameText(expected, req.headers.get("x-razorpay-signature") ?? "")) return new Response("bad signature", { status: 400 });
  try {
    const evt = JSON.parse(raw);
    const pay = evt?.payload?.payment?.entity;
    if ((evt.event === "payment.captured" || evt.event === "order.paid") && pay?.order_id) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await activate(admin, pay.order_id, pay.id);
    } else if (evt.event === "payment.failed" && pay?.order_id) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("payments").update({ status: "failed" }).eq("razorpay_order_id", pay.order_id).eq("status", "created");
    }
    return new Response("ok");
  } catch (e) { console.error(e); return new Response("error", { status: 500 }); }
});

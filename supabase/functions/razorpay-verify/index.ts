// Verifies the Razorpay checkout signature on the server, then activates the plan.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
// Marks a payment as paid and activates the plan. Safe to call twice for the same order.
async function activate(admin: any, orderId: string, paymentId: string) {
  const { data: p } = await admin.from("payments").select("*").eq("razorpay_order_id", orderId).maybeSingle();
  if (!p) return null;
  const d = new Date(); const since = d.toISOString().slice(0, 10);
  if (p.cycle === "annual") d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
  const renews = d.toISOString().slice(0, 10);
  if (p.status !== "paid") {
    await admin.from("payments").update({ status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() }).eq("id", p.id);
    await admin.from("subscriptions").upsert({ firm_id: p.firm_id, plan: p.plan, cycle: p.cycle, status: "active", since, renews, updated_at: new Date().toISOString() });
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!secret) return json({ error: "Payments are not configured yet." }, 501);
    const url = Deno.env.get("SUPABASE_URL")!;
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return json({ error: "Incomplete payment details." }, 400);
    const expected = await hmacHex(secret, razorpay_order_id + "|" + razorpay_payment_id);
    if (!sameText(expected, String(razorpay_signature))) return json({ error: "The payment signature did not verify." }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: p } = await admin.from("payments").select("firm_id").eq("razorpay_order_id", razorpay_order_id).maybeSingle();
    if (!p) return json({ error: "Unknown order." }, 404);
    const { data: member } = await asUser.rpc("is_member", { f: p.firm_id });
    if (!member) return json({ error: "This order belongs to another firm." }, 403);
    const out = await activate(admin, razorpay_order_id, razorpay_payment_id);
    return json({ subscription: out?.subscription ?? null });
  } catch (e) { console.error(e); return json({ error: "Something went wrong verifying the payment." }, 500); }
});

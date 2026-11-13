// Creates a Razorpay order for a plan. Prices are fixed here, never taken from the browser.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const PRICES: Record<string, Record<string, number>> = { Solo: { monthly: 699, annual: 6999 }, Professional: { monthly: 1499, annual: 14999 }, Firm: { monthly: 3999, annual: 39999 } };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID"), keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return json({ error: "Payments are not configured yet. Add the Razorpay keys to the function secrets." }, 501);
    const url = Deno.env.get("SUPABASE_URL")!, authz = req.headers.get("Authorization") ?? "";
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authz } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const { firm_id, plan, cycle, gstin } = await req.json();
    const base = PRICES[plan]?.[cycle];
    if (!firm_id || !base) return json({ error: "Unknown plan." }, 400);
    const g = String(gstin ?? "").trim().toUpperCase();
    if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g)) return json({ error: "That GSTIN is not valid." }, 400);
    const { data: owner } = await asUser.rpc("is_owner", { f: firm_id });
    if (!owner) return json({ error: "Only the firm owner can change the plan." }, 403);
    const amount = Math.round(base * 118); // paise, including 18% GST
    const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(keyId + ":" + keySecret) },
      body: JSON.stringify({ amount, currency: "INR", receipt: ("ls-" + firm_id).slice(0, 40), notes: { firm_id, plan, cycle } }) });
    const order = await r.json();
    if (!r.ok) return json({ error: order?.error?.description ?? "Razorpay refused the order." }, 502);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.from("payments").insert({ firm_id, user_id: user.id, plan, cycle, amount_paise: amount, gstin: g, razorpay_order_id: order.id });
    if (error) return json({ error: "Could not record the order." }, 500);
    return json({ order_id: order.id, amount, currency: "INR", key_id: keyId, email: user.email });
  } catch (e) { console.error(e); return json({ error: "Something went wrong creating the order." }, 500); }
});

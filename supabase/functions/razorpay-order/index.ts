// Creates a Razorpay order for a plan. Prices are fixed here, never taken from the browser.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const PRICES: Record<string, Record<string, number>> = { Solo: { monthly: 299, annual: 2999 }, Professional: { monthly: 799, annual: 7999 }, Firm: { monthly: 3999, annual: 39999 } };
// Professional: the price above covers the first user; each additional user costs this much.
const PER_USER: Record<string, number> = { monthly: 249, annual: 2499 };
const FIXED_SEATS: Record<string, number> = { Solo: 1, Firm: 15 }, MAX_SEATS = 15;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID"), keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return json({ error: "Payments are not configured yet. Add the Razorpay keys to the function secrets." }, 501);
    const url = Deno.env.get("SUPABASE_URL")!, authz = req.headers.get("Authorization") ?? "";
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authz } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const { firm_id, plan, cycle, gstin, users } = await req.json();
    const price = PRICES[plan]?.[cycle];
    if (!firm_id || !price) return json({ error: "Unknown plan." }, 400);
    const seats = FIXED_SEATS[plan] ?? Number(users);
    if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) return json({ error: `Choose between 1 and ${MAX_SEATS} users.` }, 400);
    const base = price + (plan === "Professional" ? (seats - 1) * PER_USER[cycle] : 0);
    const g = String(gstin ?? "").trim().toUpperCase();
    if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g)) return json({ error: "That GSTIN is not valid." }, 400);
    const { data: owner } = await asUser.rpc("is_owner", { f: firm_id });
    if (!owner) return json({ error: "Only the firm owner can change the plan." }, 403);
    const { count: used } = await asUser.from("members").select("id", { count: "exact", head: true }).eq("firm_id", firm_id).in("status", ["Active", "Invited"]);
    if ((used ?? 0) > seats) return json({ error: `Your team has ${used} users (active and invited). Choose at least ${used} users, or remove members first.` }, 400);
    const amount = Math.round(base * 118); // paise, including 18% GST
    const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(keyId + ":" + keySecret) },
      body: JSON.stringify({ amount, currency: "INR", receipt: ("ls-" + firm_id).slice(0, 40), notes: { firm_id, plan, cycle, seats } }) });
    const order = await r.json();
    if (!r.ok) return json({ error: order?.error?.description ?? "Razorpay refused the order." }, 502);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.from("payments").insert({ firm_id, user_id: user.id, plan, cycle, seats, amount_paise: amount, gstin: g, razorpay_order_id: order.id });
    if (error) return json({ error: "Could not record the order." }, 500);
    return json({ order_id: order.id, amount, currency: "INR", key_id: keyId, email: user.email });
  } catch (e) { console.error(e); return json({ error: "Something went wrong creating the order." }, 500); }
});

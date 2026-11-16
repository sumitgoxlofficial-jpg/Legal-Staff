// Direct UPI payments to the operator's own UPI ID, confirmed automatically (no payment gateway, nothing approved by hand).
// A plan payment gets an order number and an exact amount; the customer pays by UPI QR or UPI app. The payment is confirmed
// by whichever comes first:
//  1. Paytm for Business order status (when paytm_mid is set and upi_id is the Paytm merchant UPI ID; `tr` carries the order),
//  2. a bank 'credited' SMS that an SMS-forwarder phone posts to ?action=sms&key=<sms_secret>, matched on the exact amount,
//  3. a bank 'credited' alert email, auto-forwarded from the operator's mailbox to the payments inbox (Resend inbound,
//     webhook to ?action=email&key=<sms_secret>); only mail that was sent to pay_settings.email_inbox counts.
// Two pending orders never share an amount: each gets a unique paise offset (0–99 paise) while it is open.
// Settings live in public.pay_settings (migration 0010). Deploy with JWT verification off; it checks every caller itself.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

const PRICES: Record<string, Record<string, number>> = { Solo: { monthly: 699, annual: 6999 }, Professional: { monthly: 1499, annual: 14999 }, Firm: { monthly: 3999, annual: 39999 } };
const OPEN_MINUTES = 30;          // how long an order waits for payment in the app
const LATE_HOURS = 24;            // a payment confirmed within this time still activates the plan

// logic:start — pure functions, unit-tested in node.
/** Amount in paise from text like "Rs.8,258.83", "INR 8258.83", "₹ 8,258.83". */
const toPaise = (s: string) => { const n = Number(String(s).replace(/,/g, "")); return Number.isFinite(n) ? Math.round(n * 100) : NaN; };
/** Reads a bank SMS: is it a credit, how much, and the UPI reference (UTR / RRN), if any. Debits and OTPs are ignored. */
function parseBankSms(text: string) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  const credit = /\b(credited|received|deposited|added to|credit(ed)? to|has been credited|cr\.?)\b/i.test(t);
  const debit = /\b(debited|withdrawn|spent|paid to|sent to|debit(ed)? from|dr\.?)\b/i.test(t) && !/\bcredited\b/i.test(t);
  if (!credit || debit || /\bOTP\b/i.test(t)) return null;
  const m = t.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const amount = toPaise(m[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const ref = t.match(/(?:upi\s*ref(?:erence)?(?:\s*no)?|utr|rrn|ref\s*no|txn\s*id|ref)[\s.:#-]*(\d{12})/i) ?? t.match(/\b(\d{12})\b/);
  return { amount, utr: ref ? ref[1] : null };
}
/** Plain text of a bank alert email: subject first, HTML tags removed, safety footers (OTP warnings etc.) dropped. */
function emailText(subject: string, text: string, html: string) {
  let t = String(text ?? "");
  if (!t.trim() && html) t = String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, ". ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8377;|&#x20b9;/gi, "₹").replace(/&[a-z#0-9]+;/gi, " ");
  const keep = t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter((x) => !/\b(OTP|never share|do not share|don't share|disclaimer|unsubscribe|if you have not|if you did not|not done by you)\b/i.test(x));
  return (String(subject ?? "") + ". " + keep.join(" ")).slice(0, 1500);
}
/** The smallest paise offset (0–99) not used by another open order for the same base amount. */
function pickOffset(base: number, taken: number[]) {
  const used = new Set(taken.map((a) => a - base));
  for (let k = 0; k < 100; k++) if (!used.has(k)) return k;
  return -1;
}
// logic:end

const upiLink = (s: any, orderNo: string, paise: number) => {
  const p = new URLSearchParams({ pa: s.upi_id, pn: s.payee_name || "Legal Staff", am: (paise / 100).toFixed(2), cu: "INR" });
  if (s.paytm_mid) p.set("tr", orderNo);           // Paytm merchant QR: lets the status check find this exact payment
  p.set("tn", "Legal Staff " + orderNo);
  return "upi://pay?" + p.toString().replace(/\+/g, "%20");
};

async function settings(admin: any) {
  const { data, error } = await admin.from("pay_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

/** Marks a UPI payment paid and activates the plan; the paid period starts after any free-trial days or paid period left. */
async function activate(admin: any, p: any, utr: string | null, by: string) {
  const { data: claimed } = await admin.from("payments").update({ status: "paid", utr, confirmed_by: by, razorpay_payment_id: null, paid_at: new Date().toISOString() })
    .eq("id", p.id).eq("status", "created").select("id");
  if (!claimed?.length) return false;              // already confirmed by the other route
  const { data: cur } = await admin.from("subscriptions").select("*").eq("firm_id", p.firm_id).maybeSingle();
  let start = Date.now();
  if (cur?.status === "trialing" && cur.trial_ends) start = Math.max(start, Date.parse(cur.trial_ends));
  if (cur?.status === "active" && cur.renews) start = Math.max(start, Date.parse(cur.renews + "T00:00:00Z") + 864e5);
  const d = new Date(start); const since = d.toISOString().slice(0, 10);
  if (p.cycle === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1); else d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  await admin.from("subscriptions").upsert({ firm_id: p.firm_id, plan: p.plan, cycle: p.cycle, status: "active", since, renews: d.toISOString().slice(0, 10), trial_ends: null, updated_at: new Date().toISOString() });
  if (p.gstin) await admin.from("firms").update({ gstin: p.gstin }).eq("id", p.firm_id);
  return true;
}

/** Matches a bank 'credited' message (SMS or email) to the one open order with exactly that amount, and activates it. */
async function confirmFromText(admin: any, sender: string, text: string, via: string) {
  const parsed = parseBankSms(text);
  if (!parsed) { await admin.from("upi_sms").insert({ sender, body: text || "(empty)", note: via + ": not a credit message" }); return { ok: true, matched: false }; }
  const ins = await admin.from("upi_sms").insert({ sender, body: text, amount_paise: parsed.amount, utr: parsed.utr, note: via }).select("id").single();
  if (ins.error) return { ok: true, matched: false, note: "already received" };   // same bank reference sent twice (SMS and email)
  const since = new Date(Date.now() - LATE_HOURS * 3600e3).toISOString();
  const { data: cands } = await admin.from("payments").select("*").eq("method", "upi").eq("status", "created").eq("amount_paise", parsed.amount).gte("created_at", since).order("created_at", { ascending: false });
  if ((cands ?? []).length !== 1) {
    await admin.from("upi_sms").update({ note: via + ": " + ((cands ?? []).length ? "more than one open order with this amount" : "no open order with this amount") }).eq("id", ins.data.id);
    return { ok: true, matched: false };
  }
  const ok = await activate(admin, cands![0], parsed.utr, via);
  await admin.from("upi_sms").update({ payment_id: cands![0].id, note: via + ": " + (ok ? "confirmed the payment" : "payment was already confirmed") }).eq("id", ins.data.id);
  return { ok: true, matched: ok };
}

/** Paytm for Business order status: paid only if the order number and the exact amount match. */
async function paytmCheck(admin: any, s: any, p: any) {
  if (!s.paytm_mid || !p.order_no) return false;
  try {
    const u = "https://securegw.paytm.in/merchant-status/getTxnStatus?JsonData=" + encodeURIComponent(JSON.stringify({ MID: s.paytm_mid, ORDERID: p.order_no }));
    const r = await fetch(u, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => ({}));
    if (j.STATUS !== "TXN_SUCCESS" || j.ORDERID !== p.order_no || toPaise(j.TXNAMOUNT) !== p.amount_paise) return false;
    if ((j.CURRENCY ?? "INR") !== "INR") return false;
    return await activate(admin, p, j.BANKTXNID || j.TXNID || null, "paytm");
  } catch { return false; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const q = new URL(req.url).searchParams;
    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = Object.fromEntries(new URLSearchParams(raw)); }
    const action = q.get("action") ?? body.action ?? "";
    const s = await settings(admin);

    // ---- bank SMS from the forwarder phone (authenticated by the secret key in the URL) ----
    if (action === "sms") {
      if (req.method !== "POST") return json({ ok: true });   // link previews (e.g. a chat app) are not messages
      const key = q.get("key") ?? req.headers.get("x-sms-key") ?? "";
      if (!key || key !== s.sms_secret) return json({ error: "Not allowed." }, 403);
      const text = String(body.text ?? body.message ?? body.body ?? body.msg ?? body.sms ?? body.content ?? (typeof body === "string" ? body : raw) ?? "").slice(0, 2000);
      const sender = String(body.from ?? body.sender ?? body.number ?? body.address ?? "").slice(0, 60);
      return json(await confirmFromText(admin, sender, text, "sms"));
    }

    // ---- bank alert email, forwarded to the payments inbox (Resend inbound webhook, or any poster that knows the key) ----
    if (action === "email") {
      if (req.method !== "POST") return json({ ok: true });
      const key = q.get("key") ?? req.headers.get("x-sms-key") ?? "";
      if (!key || key !== s.sms_secret) return json({ error: "Not allowed." }, 403);
      let m: any = body;
      if (body.type === "email.received" || body.data?.email_id) {
        const id = body.data?.email_id ?? body.data?.id;
        const r = await fetch("https://api.resend.com/emails/receiving/" + encodeURIComponent(id), { headers: { Authorization: "Bearer " + (Deno.env.get("RESEND_READ_KEY") || Deno.env.get("RESEND_API_KEY") || "") }, signal: AbortSignal.timeout(10000) });
        const got = await r.json().catch(() => ({}));
        if (!r.ok) { await admin.from("upi_sms").insert({ sender: "email", body: "could not read email " + id + ": " + JSON.stringify(got).slice(0, 400), note: "email fetch failed (" + r.status + ")" }); return json({ ok: false }, 200); }
        m = { ...body.data, ...got };
        // Only mail that was really addressed to the secret payments inbox counts (anyone can email the receiving domain).
        const inbox = String(s.email_inbox ?? "").toLowerCase();
        const where = JSON.stringify([m.to, m.cc, m.bcc, m.headers, body.data?.to]).toLowerCase();
        if (!inbox || !where.includes(inbox + "@")) {
          await admin.from("upi_sms").insert({ sender: String(m.from ?? "").slice(0, 60), body: String(m.subject ?? "").slice(0, 300), note: "email not sent to the payments inbox" });
          return json({ ok: true, matched: false });
        }
      }
      const from = String(typeof m.from === "object" ? (m.from?.email ?? JSON.stringify(m.from)) : (m.from ?? m.sender ?? "")).slice(0, 60);
      const subject = String(m.subject ?? "");
      if (/forwarding confirmation/i.test(subject)) {   // Gmail asks the inbox to confirm forwarding: keep it so the code can be read
        await admin.from("upi_sms").insert({ sender: from, body: (subject + " " + String(m.text ?? m.html ?? "")).slice(0, 2000), note: "mailbox forwarding confirmation" });
        return json({ ok: true, matched: false });
      }
      return json(await confirmFromText(admin, from, emailText(subject, m.text ?? m.body ?? m.plain ?? "", m.html ?? ""), "email"));
    }

    // ---- scheduled check of pending orders with Paytm ----
    if (action === "sweep") {
      const { data: okSecret } = await admin.rpc("cron_secret_ok", { s: req.headers.get("x-cron-secret") ?? "" });
      if (okSecret !== true) return json({ error: "Not allowed." }, 403);
      if (!s.upi_enabled || !s.paytm_mid) return json({ skipped: true });
      const { data: pend } = await admin.from("payments").select("*").eq("method", "upi").eq("status", "created").gte("created_at", new Date(Date.now() - LATE_HOURS * 3600e3).toISOString()).limit(50);
      let paid = 0; for (const p of pend ?? []) if (await paytmCheck(admin, s, p)) paid++;
      return json({ checked: (pend ?? []).length, paid });
    }

    if (action === "config") return json({ enabled: !!(s.upi_enabled && s.upi_id), payee: s.payee_name });

    // ---- signed-in firm members ----
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Fail("Sign in again.", 401);
    const firmId = body.firm_id;

    if (action === "create") {
      if (!s.upi_enabled || !s.upi_id) throw new Fail("UPI payments are not switched on yet.", 501);
      const { data: owner } = await asUser.rpc("is_owner", { f: firmId });
      if (!owner) throw new Fail("Only the firm owner can change the plan.", 403);
      const base = PRICES[body.plan]?.[body.cycle];
      if (!base) throw new Fail("Unknown plan.");
      const g = String(body.gstin ?? "").trim().toUpperCase();
      if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g)) throw new Fail("That GSTIN is not valid.");
      const basePaise = Math.round(base * 118);   // incl. 18% GST
      const { data: open } = await admin.from("payments").select("amount_paise").eq("method", "upi").eq("status", "created")
        .gte("amount_paise", basePaise).lt("amount_paise", basePaise + 100).gte("created_at", new Date(Date.now() - LATE_HOURS * 3600e3).toISOString());
      const k = pickOffset(basePaise, (open ?? []).map((r: any) => r.amount_paise));
      if (k < 0) throw new Fail("Too many UPI payments are waiting right now. Please try again in a few minutes.", 503);
      const orderNo = "LS" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
      const amount = basePaise + k;
      const { error } = await admin.from("payments").insert({ firm_id: firmId, user_id: user.id, plan: body.plan, cycle: body.cycle, amount_paise: amount, gstin: g, method: "upi", order_no: orderNo, status: "created" });
      if (error) throw new Fail("Could not create the payment.", 500);
      return json({ order_no: orderNo, amount, upi_id: s.upi_id, payee: s.payee_name, link: upiLink(s, orderNo, amount), expires_at: new Date(Date.now() + OPEN_MINUTES * 60e3).toISOString() });
    }

    if (action === "status") {
      const { data: member } = await asUser.rpc("is_member", { f: firmId });
      if (!member) throw new Fail("You are not a member of this firm.", 403);
      const { data: p } = await admin.from("payments").select("*").eq("order_no", String(body.order_no ?? "")).eq("firm_id", firmId).maybeSingle();
      if (!p) throw new Fail("Payment not found.", 404);
      if (p.status === "created") await paytmCheck(admin, s, p);
      const { data: now } = await admin.from("payments").select("status,utr,confirmed_by").eq("id", p.id).single();
      return json({ status: now.status, utr: now.utr, confirmed_by: now.confirmed_by });
    }

    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Something went wrong with the UPI payment." }, 500);
  }
});

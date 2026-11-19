// Super admin console API (admin.html). Every call: a signed-in user whose verified email is in public.super_admins.
// actions: overview · firms · firm_update · payments · coupons · coupon_save · coupon_delete · support · support_reply ·
//          support_status · expenses · expense_add · expense_delete · settings · settings_save
// Deploy with JWT verification off; it checks every caller itself.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

const PRICES: Record<string, Record<string, number>> = { Solo: { monthly: 299, annual: 2999 }, Professional: { monthly: 799, annual: 7999 }, Firm: { monthly: 3999, annual: 39999 } };
// Professional: PRICES covers the first user; each additional user costs PER_USER. Keep in step with razorpay, billing and admin.
const PER_USER: Record<string, number> = { monthly: 249, annual: 2499 }, MAX_USERS = 15;
/** List price in rupees for a plan and cycle; seats only counts for Professional (missing → 1). */
const listPrice = (plan: string, cycle: string, seats?: number | null) => {
  const p = PRICES[plan]?.[cycle]; if (!p) return 0;
  return p + (plan === "Professional" ? (Math.max(1, Number(seats) || 1) - 1) * PER_USER[cycle] : 0);
};
const SITE = (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "");

// logic:start — pure functions, unit-tested in node.
const IST = 5.5 * 3600e3;
/** 'YYYY-MM' of an instant in India time. */
const istMonth = (iso: string) => new Date(Date.parse(iso) + IST).toISOString().slice(0, 7);
const istDay = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10);
/** First month ('YYYY-MM') of the Indian financial year containing this month. */
const fyStart = (ym: string) => { const [y, m] = ym.split("-").map(Number); return `${m >= 4 ? y : y - 1}-04`; };
/** The last n months ending with ym, oldest first. */
function lastMonths(ym: string, n: number) {
  let [y, m] = ym.split("-").map(Number); const out: string[] = [];
  for (let i = 0; i < n; i++) { out.unshift(`${y}-${String(m).padStart(2, "0")}`); if (--m === 0) { m = 12; y--; } }
  return out;
}
/** Where a firm's subscription stands today: paid (active), trial, or expired / none. */
function subState(s: any, nowMs: number) {
  if (!s) return "none";
  const today = istDay(nowMs);
  if (s.status === "trialing") return s.trial_ends && Date.parse(s.trial_ends) > nowMs ? "trial" : "expired";
  if (s.status === "active") return s.renews && s.renews >= today ? (s.since && s.since > today ? "paid_upcoming" : "paid") : "expired";
  return "expired";
}
// logic:end

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
async function all(q: () => any) {   // reads past PostgREST's 1,000-row page limit
  const out: any[] = [];
  for (let from = 0; ;) { const { data, error } = await q().range(from, from + 999); if (error) throw error; if (!data?.length) return out; out.push(...data); from += data.length; if (data.length < 1000) return out; }
}
async function userCount(admin: any) {
  let n = 0;
  for (let page = 1; page < 200; page++) { const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 }); if (error) throw error; n += data.users.length; if (data.users.length < 1000) break; }
  return n;
}

async function sendEmail(to: string, subject: string, text: string, html: string, replyTo?: string) {
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) throw new Fail("Email is not set up.", 501);
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text, html, ...(replyTo ? { reply_to: replyTo } : {}) }) });
  if (!r.ok) throw new Fail("Could not send the email: " + (await r.text()).slice(0, 200), 502);
}
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const replyHtml = (name: string, reply: string, original: string) => `<!doctype html><html><body style="margin:0;padding:0;background:#F4F4F2"><table role="presentation" width="100%" style="background:#F4F4F2"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" style="max-width:600px"><tr><td style="padding:0 4px 16px"><table role="presentation"><tr><td style="padding-right:10px"><img src="${SITE}/assets/email-mark.png" width="31" height="32" alt="Legal Staff" style="display:block;border:0"></td><td style="font:700 18px/1 ${FONT};color:#0A0A0A">Legal Staff</td></tr></table></td></tr>
<tr><td style="background:#fff;border:1px solid #E5E5E5;border-radius:12px;padding:28px 30px">
<div style="font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;padding-bottom:8px">Legal Staff support</div>
<p style="margin:0 0 14px;font:15px/1.6 ${FONT};color:#363636">Hello${name ? " " + esc(name) : ""},</p>
${reply.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;font:15px/1.6 ${FONT};color:#0A0A0A">${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}
<p style="margin:18px 0 0;font:15px/1.6 ${FONT};color:#363636">Legal Staff support</p>
${original ? `<div style="margin-top:22px;padding-top:14px;border-top:1px solid #EDEDED;font:13px/1.55 ${FONT};color:#6B6B6B"><b>Your message</b><br>${esc(original).replace(/\n/g, "<br>")}</div>` : ""}
</td></tr><tr><td style="padding:16px 6px 0;font:12px/1.6 ${FONT};color:#8A8A8A;text-align:center">Reply to this email to continue the conversation.<br><a href="${SITE}" style="color:#5E5E5E">legalstaff.in</a></td></tr></table></td></tr></table></body></html>`;

/** The email an advocate gets when a moderator decides their directory application. */
function directoryDecisionEmail(name: string, status: string, note: string, paid: boolean, id: string) {
  const first = (name || "").split(/\s+/)[0] || "";
  const link = (h: string) => `${SITE}/directory#${h}`;
  let subject: string, lines: string[], label: string, url: string;
  if (status === "verified") {
    subject = "Your Legal Staff Directory profile is verified";
    lines = paid ? ["Your enrolment has been verified and your profile is now live in the Legal Staff Directory, with the verified tick on your photo.", "Clients can find you and send you contact requests. You will see them in your dashboard."]
      : ["Your enrolment has been verified. Your profile goes live as soon as the one-time \u20b949 listing fee is paid.", "Open your dashboard and tap Pay \u20b949 to finish."];
    label = paid ? "View my profile" : "Pay \u20b949 and go live"; url = link(paid ? "profile/" + encodeURIComponent(id) : "pay");
  } else if (status === "info") {
    subject = "We need a little more information for your directory profile";
    lines = ["A moderator reviewed your application and needs something more before it can be verified:", note, "Open your application, update it and resubmit. Your \u20b949 payment, if made, stays valid."];
    label = "Update my application"; url = link("status");
  } else {
    subject = "Your Legal Staff Directory application was not approved";
    lines = ["A moderator reviewed your application and could not approve it:", note, "If this is a mistake or you can fix the issue, you can apply again from your dashboard. Reply to this email if you have a question."];
    label = "Open my application"; url = link("status");
  }
  const text = `Hello ${first},\n\n${lines.join("\n\n")}\n\n${label}: ${url}\n\nLegal Staff Directory`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F4F4F2"><table role="presentation" width="100%" style="background:#F4F4F2"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" style="max-width:600px"><tr><td style="padding:0 4px 16px"><table role="presentation"><tr><td style="padding-right:10px"><img src="${SITE}/assets/email-mark.png" width="31" height="32" alt="Legal Staff" style="display:block;border:0"></td><td style="font:700 18px/1 ${FONT};color:#0A0A0A">Legal Staff</td></tr></table></td></tr>
<tr><td style="background:#fff;border:1px solid #E5E5E5;border-radius:12px;padding:28px 30px">
<div style="font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;padding-bottom:8px">Legal Staff Directory</div>
<p style="margin:0 0 14px;font:15px/1.6 ${FONT};color:#363636">Hello${first ? " " + esc(first) : ""},</p>
${lines.map((l) => `<p style="margin:0 0 14px;font:15px/1.6 ${FONT};color:#0A0A0A">${esc(l).replace(/\n/g, "<br>")}</p>`).join("")}
<p style="margin:20px 0 0"><a href="${url}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;font:600 15px/1 ${FONT};padding:14px 22px;border-radius:10px">${esc(label)}</a></p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Fail("Sign in again.", 401);
    const email = String(user.email ?? "").toLowerCase();
    const { data: ok } = await admin.from("super_admins").select("email").eq("email", email).maybeSingle();
    if (!ok || !user.email_confirmed_at) throw new Fail("This account is not a Legal Staff administrator.", 403);
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "", now = Date.now(), thisMonth = istMonth(new Date(now).toISOString());

    if (action === "overview") {
      const [users, firms, subs, paid, exps] = await Promise.all([
        userCount(admin),
        all(() => admin.from("firms").select("id,created_at").order("id")),
        all(() => admin.from("subscriptions").select("firm_id,plan,cycle,seats,status,since,renews,trial_ends").order("firm_id")),
        all(() => admin.from("payments").select("amount_paise,paid_at,plan,cycle,promo_code,method").eq("status", "paid").order("paid_at")),
        all(() => admin.from("admin_expenses").select("amount_paise,spent_on").order("spent_on")),
      ]);
      const months = lastMonths(thisMonth, 12), fy = fyStart(thisMonth), yr = thisMonth.slice(0, 4);
      const rev = (pred: (ym: string) => boolean) => sum(paid.filter((p: any) => p.paid_at && pred(istMonth(p.paid_at))).map((p: any) => p.amount_paise));
      const exp = (pred: (ym: string) => boolean) => sum(exps.filter((e: any) => pred(e.spent_on.slice(0, 7))).map((e: any) => e.amount_paise));
      const states: Record<string, number> = { paid: 0, paid_upcoming: 0, trial: 0, expired: 0, none: 0 };
      const byPlan: Record<string, number> = {}; let mrr = 0;
      for (const s of subs) { const st = subState(s, now); states[st]++; if (st === "paid" || st === "paid_upcoming") { byPlan[s.plan] = (byPlan[s.plan] ?? 0) + 1; const p = listPrice(s.plan, s.cycle, s.seats); mrr += Math.round((s.cycle === "annual" ? p / 12 : p) * 100); } }
      states.none += Math.max(0, firms.length - subs.length);
      const r = { month: rev((m) => m === thisMonth), fy: rev((m) => m >= fy && m <= thisMonth), year: rev((m) => m.startsWith(yr)), all: rev(() => true) };
      const e = { month: exp((m) => m === thisMonth), fy: exp((m) => m >= fy && m <= thisMonth), year: exp((m) => m.startsWith(yr)), all: exp(() => true) };
      return json({
        users, firms: firms.length, newFirmsMonth: firms.filter((f: any) => istMonth(f.created_at) === thisMonth).length,
        states, byPlan, mrr, revenue: r, expenses: e, profit: { month: r.month - e.month, fy: r.fy - e.fy, year: r.year - e.year, all: r.all - e.all },
        payments: { count: paid.length, month: paid.filter((p: any) => p.paid_at && istMonth(p.paid_at) === thisMonth).length, promo: paid.filter((p: any) => p.promo_code).length },
        series: months.map((m) => ({ month: m, revenue: rev((x) => x === m), expenses: exp((x) => x === m) })),
        thisMonth, fyLabel: `FY ${fy.slice(0, 4)}-${String((+fy.slice(0, 4) + 1) % 100).padStart(2, "0")}`, year: yr,
      });
    }

    if (action === "firms") {
      const [firms, subs, members, paid] = await Promise.all([
        all(() => admin.from("firms").select("id,name,city,gstin,created_at").order("created_at", { ascending: false })),
        all(() => admin.from("subscriptions").select("*").order("firm_id")),
        all(() => admin.from("members").select("firm_id,email,name,is_owner,status,user_id").order("firm_id")),
        all(() => admin.from("payments").select("firm_id,amount_paise,paid_at").eq("status", "paid").order("paid_at")),
      ]);
      const sub: Record<string, any> = {}; subs.forEach((s: any) => sub[s.firm_id] = s);
      return json({ firms: firms.map((f: any) => {
        const ms = members.filter((m: any) => m.firm_id === f.id), owner = ms.find((m: any) => m.is_owner) ?? ms[0], ps = paid.filter((p: any) => p.firm_id === f.id), s = sub[f.id];
        return { id: f.id, name: f.name, city: f.city, created_at: f.created_at, owner: owner?.email ?? "", ownerName: owner?.name ?? "", members: ms.length, joined: ms.filter((m: any) => m.user_id).length,
          plan: s?.plan ?? "", cycle: s?.cycle ?? "", status: subState(s, now), since: s?.since ?? "", renews: s?.renews ?? "", trial_ends: s?.trial_ends ?? "",
          paid: sum(ps.map((p: any) => p.amount_paise)), payments: ps.length, lastPaid: ps.length ? ps[ps.length - 1].paid_at : null };
      }) });
    }

    if (action === "firm_update") {   // grant, extend, change or end a plan by hand
      const { firm_id, plan, cycle, renews, end } = body;
      const { data: cur } = await admin.from("subscriptions").select("*").eq("firm_id", firm_id).maybeSingle();
      if (end) {
        const yesterday = istDay(now - 864e5);
        await admin.from("subscriptions").upsert({ firm_id, plan: cur?.plan ?? "Solo", cycle: cur?.cycle ?? "monthly", status: "active", since: cur?.since ?? yesterday, renews: yesterday, trial_ends: null, updated_at: new Date().toISOString() });
        return json({ ok: true });
      }
      if (!PRICES[plan] || !["monthly", "annual"].includes(cycle) || !/^\d{4}-\d{2}-\d{2}$/.test(String(renews))) throw new Fail("Choose a plan, a billing cycle and an end date.");
      const today = istDay(now);
      await admin.from("subscriptions").upsert({ firm_id, plan, cycle, status: "active", since: cur?.status === "active" && cur.since && cur.since <= today ? cur.since : today, renews, trial_ends: null, updated_at: new Date().toISOString() });
      return json({ ok: true });
    }

    if (action === "payments") {
      const [{ data: pays }, { data: firms }] = await Promise.all([
        admin.from("payments").select("id,firm_id,plan,cycle,amount_paise,status,method,order_no,utr,promo_code,confirmed_by,created_at,paid_at").order("created_at", { ascending: false }).limit(300),
        admin.from("firms").select("id,name"),
      ]);
      const name: Record<string, string> = {}; (firms ?? []).forEach((f: any) => name[f.id] = f.name);
      return json({ payments: (pays ?? []).map((p: any) => ({ ...p, firm: name[p.firm_id] ?? "" })), bank: [] });
    }

    if (action === "coupons") { const { data } = await admin.from("promo_codes").select("*").order("created_at", { ascending: false }); return json({ coupons: data ?? [] }); }
    if (action === "coupon_save") {
      const c = body.coupon ?? {}, code = String(c.code ?? "").trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new Fail("A code is 3 to 30 letters, numbers, - or _.");
      const kind = c.kind;   // 'percent' | 'amount' | 'fixed'
      const v = Number(c.value);
      if (!(v >= 0)) throw new Fail("Enter the discount.");
      const row: any = { code, percent_off: 0, amount_off: 0, fixed_total: null, plans: c.plans?.length ? c.plans : null, cycles: c.cycles?.length ? c.cycles : null,
        max_uses: c.max_uses ? Math.max(1, Math.round(Number(c.max_uses))) : null, once_per_firm: c.once_per_firm !== false, expires_at: c.expires_at ? new Date(c.expires_at + "T23:59:59+05:30").toISOString() : null,
        active: c.active !== false, note: String(c.note ?? "").slice(0, 200) };
      if (kind === "percent") { if (v <= 0 || v > 100) throw new Fail("A percentage is between 1 and 100."); row.percent_off = Math.round(v); }
      else if (kind === "amount") { if (v <= 0) throw new Fail("Enter the rupees off."); row.amount_off = Math.round(v); }
      else if (kind === "fixed") row.fixed_total = Math.round(v * 100);
      else throw new Fail("Choose the kind of discount.");
      const { error } = await admin.from("promo_codes").upsert(row, { onConflict: "code" });
      if (error) throw new Fail("Could not save the coupon: " + error.message);
      return json({ ok: true });
    }
    if (action === "coupon_delete") {
      const { data: c } = await admin.from("promo_codes").select("uses").eq("code", body.code).maybeSingle();
      if (!c) throw new Fail("Coupon not found.", 404);
      if (c.uses > 0) { await admin.from("promo_codes").update({ active: false }).eq("code", body.code); return json({ ok: true, deactivated: true }); }
      await admin.from("promo_codes").delete().eq("code", body.code); return json({ ok: true });
    }

    if (action === "support") { const { data } = await admin.from("contact_requests").select("*").order("created_at", { ascending: false }).limit(500); return json({ messages: data ?? [] }); }
    if (action === "support_reply") {
      const reply = String(body.reply ?? "").trim(); if (!reply) throw new Fail("Write a reply.");
      const { data: m } = await admin.from("contact_requests").select("*").eq("id", body.id).maybeSingle();
      if (!m) throw new Fail("Message not found.", 404);
      const { data: s } = await admin.from("pay_settings").select("seller_email,alert_email").eq("id", 1).single();
      await sendEmail(m.email, "Re: " + (m.topic || "Your message to Legal Staff"), `Hello ${m.name || ""},\n\n${reply}\n\nLegal Staff support\n\n— Your message —\n${m.message}`, replyHtml(m.name, reply, m.message), s?.seller_email || s?.alert_email || email);
      await admin.from("contact_requests").update({ status: "replied", reply, replied_at: new Date().toISOString() }).eq("id", body.id);
      return json({ ok: true });
    }
    if (action === "support_status") {
      if (!["open", "replied", "closed"].includes(body.status)) throw new Fail("Unknown status.");
      await admin.from("contact_requests").update({ status: body.status }).eq("id", body.id); return json({ ok: true });
    }

    if (action === "expenses") { const { data } = await admin.from("admin_expenses").select("*").order("spent_on", { ascending: false }).limit(500); return json({ expenses: data ?? [] }); }
    if (action === "expense_add") {
      const label = String(body.label ?? "").trim(), amt = Math.round(Number(body.amount) * 100), on = String(body.spent_on ?? "");
      if (!label || !(amt > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(on)) throw new Fail("Enter what it was for, the amount and the date.");
      await admin.from("admin_expenses").insert({ label, amount_paise: amt, spent_on: on }); return json({ ok: true });
    }
    if (action === "expense_delete") { await admin.from("admin_expenses").delete().eq("id", body.id); return json({ ok: true }); }

    const KEYS = ["alert_email", "seller_name", "seller_address", "seller_state_code", "seller_gstin", "seller_pan", "seller_email", "seller_phone"];
    // ---- directory review: applications, their private documents, and the decision ----
    if (action === "directory_list") {
      const { data } = await admin.from("directory_applications").select("id,name,enr,council,year,city,email,mobile,details,photo,status,note,paid_at,created_at,decided_at,ai_report").order("created_at", { ascending: false }).limit(500);
      return json({ applications: data ?? [] });
    }
    if (action === "directory_doc") {   // a 5-minute link to one uploaded document (must be a file recorded on an application)
      const path = String(body.path ?? "");
      if (!/^[0-9a-f-]{36}\/LS-DIR-\d{4}-\d+\/(cert|cop|id)-[^/]+$/i.test(path)) throw new Fail("Not a directory document.");
      const { data, error } = await admin.storage.from("directory-docs").createSignedUrl(path, 300);
      if (error || !data) throw new Fail("That file could not be opened. It may not have been uploaded.", 404);
      return json({ url: data.signedUrl });
    }
    if (action === "directory_decide") {
      const status = String(body.status ?? ""), note = String(body.note ?? "").trim();
      if (!["verified", "info", "rejected"].includes(status)) throw new Fail("Choose verify, ask for more information, or reject.");
      if (status !== "verified" && note.length < 5) throw new Fail("Write a note for the advocate: they will see it.");
      const { data: app } = await admin.from("directory_applications").select("id,name,email,paid_at").eq("id", String(body.id ?? "")).maybeSingle();
      if (!app) throw new Fail("Application not found.", 404);
      const { error } = await admin.from("directory_applications").update({ status, note, decided_at: new Date().toISOString(), decided_by: user.id }).eq("id", app.id);
      if (error) throw new Fail("The decision could not be saved.", 500);
      let emailed = false;   // the decision stands even if the email cannot be sent
      if (app.email) {
        try {
          const { data: s } = await admin.from("pay_settings").select("seller_email,alert_email").eq("id", 1).single();
          const m = directoryDecisionEmail(app.name, status, note, !!app.paid_at, app.id);
          await sendEmail(app.email, m.subject, m.text, m.html, s?.seller_email || s?.alert_email || email);
          emailed = true;
        } catch (e) { console.error("directory email", e); }
      }
      return json({ ok: true, emailed });
    }

    if (action === "settings") { const { data } = await admin.from("pay_settings").select(KEYS.join(",")).eq("id", 1).single(); return json({ settings: data, admins: ((await admin.from("super_admins").select("email")).data ?? []).map((a: any) => a.email) }); }
    if (action === "settings_save") {
      const patch: any = {}; for (const k of KEYS) if (k in (body.settings ?? {})) patch[k] = String(body.settings[k] ?? "").trim();
      if (patch.alert_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.alert_email)) throw new Fail("That alert email does not look right.");
      patch.updated_at = new Date().toISOString();
      await admin.from("pay_settings").update(patch).eq("id", 1); return json({ ok: true });
    }

    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Something went wrong in the admin console." }, 500);
  }
});

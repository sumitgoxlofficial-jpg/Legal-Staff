// Sends the morning briefing and hearing reminders by email (Resend) and WhatsApp (Meta Cloud API).
// Two callers: the daily schedule (header x-cron-secret) for every firm, or a signed-in member
// ({ firm_id, test: true }) to send today's briefing to themselves.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const istDate = (addDays = 0) => new Date(Date.now() + 5.5 * 3600e3 + addDays * 864e5).toISOString().slice(0, 10);
const nice = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const t12 = (t: string) => { const [h, m] = (t || "10:30").split(":").map(Number); return ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM"); };

async function sendEmail(to: string, subject: string, text: string) {
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) return { skipped: "Email is not configured." };
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text }) });
  return r.ok ? { ok: true } : { error: (await r.text()).slice(0, 300) };
}
async function sendWhatsApp(to: string, text: string) {
  const token = Deno.env.get("WHATSAPP_TOKEN"), phoneId = Deno.env.get("WHATSAPP_PHONE_ID"), template = Deno.env.get("WHATSAPP_TEMPLATE");
  if (!token || !phoneId || !template) return { skipped: "WhatsApp is not configured." };
  const num = to.replace(/\D/g, ""); if (num.length < 10) return { skipped: "No WhatsApp number." };
  // Business-initiated messages must use an approved template with one body variable.
  const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: num.length === 10 ? "91" + num : num, type: "template", template: { name: template, language: { code: Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "en" }, components: [{ type: "body", parameters: [{ type: "text", text: text.replace(/\s*\n\s*/g, " | ").slice(0, 1000) }] }] } }) });
  return r.ok ? { ok: true } : { error: (await r.text()).slice(0, 300) };
}

async function briefFirm(admin: any, firm: any, onlyUser: string | null) {
  const today = istDate();
  const { data: recs } = await admin.from("records").select("kind,id,data").eq("firm_id", firm.id).in("kind", ["hearing", "case", "task", "deadline"]);
  const { data: members } = await admin.from("members").select("user_id,email,name,title,phone,status").eq("firm_id", firm.id).eq("status", "Active");
  const { data: states } = await admin.from("user_state").select("user_id,data").eq("firm_id", firm.id);
  const of = (k: string) => (recs ?? []).filter((r: any) => r.kind === k).map((r: any) => r.data);
  const cases: Record<string, any> = {}; (recs ?? []).filter((r: any) => r.kind === "case").forEach((r: any) => cases[r.id] = r.data);
  const results: any[] = [];
  for (const m of members ?? []) {
    if (!m.user_id || (onlyUser && m.user_id !== onlyUser)) continue;
    const st = ((states ?? []).find((s: any) => s.user_id === m.user_id)?.data ?? {}).settings ?? {};
    const remind = Number(st.remindDays ?? 2);
    const mine = of("hearing").filter((h: any) => h.assignee === m.name);
    const todays = mine.filter((h: any) => h.date === today).sort((a: any, b: any) => String(a.time).localeCompare(String(b.time)));
    const soon = mine.filter((h: any) => h.date === istDate(remind));
    const overdue = of("task").filter((t: any) => t.who === m.name && !t.done && t.due < today);
    const dls = of("deadline").filter((d: any) => d.due >= today && d.due <= istDate(7));
    if (!onlyUser && !todays.length && !soon.length && !overdue.length && !dls.length) continue;
    const line = (h: any) => `${t12(h.time)} ${cases[h.caseId]?.title ?? "Hearing"} — ${h.court}${h.item ? ", " + h.item : ""}`;
    const body = [`Good morning, ${m.title || m.name}.`, "", todays.length ? `Hearings today (${todays.length}):` : "No hearings today.", ...todays.map(line),
      ...(soon.length ? ["", `Coming up on ${nice(istDate(remind))}:`, ...soon.map(line)] : []),
      ...(dls.length ? ["", "Deadlines in the next 7 days:", ...dls.map((d: any) => `${d.title} — ${nice(d.due)}`)] : []),
      ...(overdue.length ? ["", `Overdue tasks (${overdue.length}):`, ...overdue.map((t: any) => t.t)] : []), "", firm.name + " · Legal Staff"].join("\n");
    const subject = `${todays.length} hearing${todays.length === 1 ? "" : "s"} today · ${nice(today)}`;
    for (const [channel, on, to] of [["email", st.email !== false, m.email], ["whatsapp", st.whatsapp !== false, m.phone]] as const) {
      if (!on || !to) continue;
      const r: any = channel === "email" ? await sendEmail(to, subject, body) : await sendWhatsApp(to, body);
      if (r.skipped) { results.push({ channel, to, skipped: r.skipped }); continue; }
      await admin.from("notifications").insert({ firm_id: firm.id, channel, recipient: to, subject, body, status: r.ok ? "sent" : "failed", error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null });
      results.push({ channel, to, ok: !!r.ok, error: r.error });
    }
  }
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cron = Deno.env.get("CRON_SECRET");
    if (cron && req.headers.get("x-cron-secret") === cron) {
      const { data: firms } = await admin.from("firms").select("id,name");
      let sent = 0; for (const f of firms ?? []) sent += (await briefFirm(admin, f, null)).filter((r) => r.ok).length;
      return json({ sent });
    }
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const { firm_id } = await req.json();
    const { data: member } = await asUser.rpc("is_member", { f: firm_id });
    if (!member) return json({ error: "Not a member of this firm." }, 403);
    const { data: firm } = await admin.from("firms").select("id,name").eq("id", firm_id).single();
    return json({ results: await briefFirm(admin, firm, user.id) });
  } catch (e) { console.error(e); return json({ error: "Could not send the briefing." }, 500); }
});

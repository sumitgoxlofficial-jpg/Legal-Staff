// Sends the morning briefing (hearings today and in N days, deadlines and approved limitation dates, overdue tasks)
// by email (Resend) and WhatsApp (Meta Cloud API). Two callers: the hourly schedule (header x-cron-secret, pg_cron at
// minute 0 UTC = HH:30 IST), which briefs each member once a day in the IST hour of their Settings › Morning briefing time;
// or a signed-in member ({ firm_id }) sending today's briefing to themselves now ("Send now", no once-a-day limit).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// logic:start — pure functions, unit-tested in node (scratchpad step3/notify-logic.test.mjs strips the types and evaluates this block).
const IST_MS = 5.5 * 3600e3;
/** IST calendar date (YYYY-MM-DD) and hour (0-23) of a UTC instant. */
const istClock = (ms: number) => { const d = new Date(ms + IST_MS); return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() }; };
const addIso = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 864e5);
/** IST hour of a member's Settings › Morning briefing time (settings.briefingTime "HH:MM"; default 07:30 → 7). */
const briefHour = (settings: any) => { const h = parseInt(String(settings?.briefingTime ?? "07:30").split(":")[0], 10); return h >= 0 && h <= 23 ? h : 7; };
/** Scheduled run: a member is due in the IST hour that matches their briefing time. */
const dueThisHour = (settings: any, istHour: number) => briefHour(settings) === istHour;
/** Was a scheduled briefing already sent to this member on this channel on this IST day? (Send-now rows have kind 'briefing_now' and do not count.) */
const sentToday = (rows: any[], userId: string, channel: string, istDay: string) =>
  rows.some((n: any) => n.user_id === userId && n.channel === channel && (n.kind ?? "briefing") === "briefing" && n.status === "sent" && istClock(Date.parse(n.created_at)).date === istDay);
const flagOf = (days: number) => days === 0 ? "DUE TODAY" : days === 1 ? "DUE TOMORROW" : days === 3 ? "DUE IN 3 DAYS" : `due in ${days} days`;
/** Deadlines for the briefing: open (not done), due from today to 7 days ahead; approved limitation dates (source 'limitation') from 30 days ahead. Soonest first. */
const pickDeadlines = (list: any[], today: string) => (list ?? [])
  .filter((d: any) => d && !d.done && typeof d.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.due))
  .map((d: any) => ({ title: String(d.title || "Deadline"), due: d.due, days: dayDiff(d.due, today), limitation: d.source === "limitation", rule: d.rule || "" }))
  .filter((d: any) => d.days >= 0 && d.days <= (d.limitation ? 30 : 7))
  .map((d: any) => ({ ...d, flag: flagOf(d.days) }))
  .sort((a: any, b: any) => a.days - b.days || a.title.localeCompare(b.title));
// logic:end
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

// PostgREST returns at most 1,000 rows per request: read stably ordered pages until one comes back empty.
async function pages(q: () => any) {
  const out: any[] = [];
  for (let from = 0; ;) {
    const { data, error } = await q().range(from, from + 999);
    if (error) throw error;
    if (!data?.length) return out;
    out.push(...data); from += data.length;
  }
}

// opts.onlyUser: "Send now" for one member (always sends). Otherwise a scheduled run: only members whose briefing hour is opts.hour, once per IST day.
async function briefFirm(admin: any, firm: any, opts: { onlyUser: string | null; now: number }) {
  const clock = istClock(opts.now), today = clock.date;
  const { data: members } = await admin.from("members").select("user_id,email,name,title,phone,status").eq("firm_id", firm.id).eq("status", "Active");
  const { data: states } = await admin.from("user_state").select("user_id,data").eq("firm_id", firm.id);
  const settingsOf = (uid: string) => ((states ?? []).find((s: any) => s.user_id === uid)?.data ?? {}).settings ?? {};
  const due = (members ?? []).filter((m: any) => m.user_id && (opts.onlyUser ? m.user_id === opts.onlyUser : dueThisHour(settingsOf(m.user_id), clock.hour)));
  if (!due.length) return [];
  let sent: any[] = [];
  if (!opts.onlyUser) { const { data, error } = await admin.from("notifications").select("user_id,channel,kind,status,created_at").eq("firm_id", firm.id).eq("kind", "briefing").gte("created_at", new Date(opts.now - 36 * 3600e3).toISOString()); if (error) throw error; sent = data ?? []; }
  const recs = await pages(() => admin.from("records").select("kind,id,data").eq("firm_id", firm.id).in("kind", ["hearing", "case", "task", "deadline"]).order("kind").order("id"));
  const of = (k: string) => (recs ?? []).filter((r: any) => r.kind === k).map((r: any) => r.data);
  const cases: Record<string, any> = {}; (recs ?? []).filter((r: any) => r.kind === "case").forEach((r: any) => cases[r.id] = r.data);
  const dls = pickDeadlines(of("deadline"), today);
  const results: any[] = [];
  for (const m of due) {
    const st = settingsOf(m.user_id), remind = Number(st.remindDays ?? 2);
    const mine = of("hearing").filter((h: any) => h.assignee === m.name);
    const todays = mine.filter((h: any) => h.date === today).sort((a: any, b: any) => String(a.time).localeCompare(String(b.time)));
    const soonDay = addIso(today, remind), soon = mine.filter((h: any) => h.date === soonDay);
    const overdue = of("task").filter((t: any) => t.who === m.name && !t.done && t.due < today);
    if (!opts.onlyUser && !todays.length && !soon.length && !overdue.length && !dls.length) continue;
    const line = (h: any) => `${t12(h.time)} ${cases[h.caseId]?.title ?? "Hearing"} — ${h.court}${h.item ? ", " + h.item : ""}`;
    const dl = (d: any) => `${[0, 1, 3].includes(d.days) ? "!! " : ""}${d.flag}: ${d.title} — ${nice(d.due)}${d.limitation ? " (limitation date, approved)" : ""}${d.rule ? " · " + d.rule : ""}`;
    const body = [`Good morning, ${m.title || m.name}.`, "", todays.length ? `Hearings today (${todays.length}):` : "No hearings today.", ...todays.map(line),
      ...(soon.length ? ["", `Coming up on ${nice(soonDay)} (in ${remind} day${remind === 1 ? "" : "s"}):`, ...soon.map(line)] : []),
      ...(dls.length ? ["", `Deadlines and limitation dates (${dls.length}):`, ...dls.map(dl)] : []),
      ...(overdue.length ? ["", `Overdue tasks (${overdue.length}):`, ...overdue.map((t: any) => t.t)] : []), "", firm.name + " · Legal Staff"].join("\n");
    const urgent = dls.filter((d: any) => d.days <= 1);
    const subject = (urgent.length ? `Deadline ${urgent[0].days === 0 ? "today" : "tomorrow"}: ${urgent[0].title} · ` : "") + `${todays.length} hearing${todays.length === 1 ? "" : "s"} today · ${nice(today)}`;
    for (const [channel, on, to] of [["email", st.email !== false, m.email], ["whatsapp", st.whatsapp !== false, m.phone]] as const) {
      if (!on || !to) continue;
      if (!opts.onlyUser && sentToday(sent, m.user_id, channel, today)) { results.push({ channel, to, skipped: "Already sent today." }); continue; }
      const r: any = channel === "email" ? await sendEmail(to, subject, body) : await sendWhatsApp(to, body);
      if (r.skipped) { results.push({ channel, to, skipped: r.skipped }); continue; }
      await admin.from("notifications").insert({ firm_id: firm.id, user_id: m.user_id, kind: opts.onlyUser ? "briefing_now" : "briefing", channel, recipient: to, subject, body, status: r.ok ? "sent" : "failed", error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null });
      results.push({ channel, to, ok: !!r.ok, error: r.error });
    }
  }
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // The hourly job sends a shared secret: either the CRON_SECRET function secret, or the one kept in Vault (checked by cron_secret_ok).
    const cron = Deno.env.get("CRON_SECRET"), hdr = req.headers.get("x-cron-secret");
    let isCron = !!(cron && hdr === cron);
    if (!isCron && hdr) { const { data } = await admin.rpc("cron_secret_ok", { s: hdr }); isCron = data === true; }
    if (isCron) {
      const firms = await pages(() => admin.from("firms").select("id,name").order("id"));
      const now = Date.now(); let sent = 0, skipped = 0;
      for (const f of firms ?? []) { const rs = await briefFirm(admin, f, { onlyUser: null, now }); sent += rs.filter((r: any) => r.ok).length; skipped += rs.filter((r: any) => r.skipped).length; }
      return json({ sent, skipped, ist: istClock(now) });
    }
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const { firm_id } = await req.json();
    const { data: member } = await asUser.rpc("is_member", { f: firm_id });
    if (!member) return json({ error: "Not a member of this firm." }, 403);
    const { data: firm } = await admin.from("firms").select("id,name").eq("id", firm_id).single();
    return json({ results: await briefFirm(admin, firm, { onlyUser: user.id, now: Date.now() }) });
  } catch (e) { console.error(e); return json({ error: "Could not send the briefing." }, 500); }
});

// Also sends court-record alerts (courtAlerts: a moved hearing, a new order or judgment, a disposal found by functions/court-sync), batched per person
// and sent by WhatsApp and email in Indian waking hours, once per change. Also emails firm owners before their free trial ends (trialReminders) and before a paid plan runs out (planReminders),
// scheduled runs only. UPI plans do not renew by themselves, so the plan reminders are how a firm knows to renew.
// Sends the morning briefing (hearings today and in N days, deadlines and approved limitation dates, overdue tasks)
// by email (Resend) and WhatsApp (Meta Cloud API). Two callers: the hourly schedule (header x-cron-secret, pg_cron at
// minute 0 UTC = HH:30 IST), which briefs each member once a day in the IST hour of their Settings › Morning briefing time
// (every day, even when nothing is due);
// or a signed-in member ({ firm_id }) sending today's briefing to themselves now ("Send now", no once-a-day limit).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sha256Hex, maskPhone } from "../_shared/whatsapp-logic.js";

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
/** Free-trial reminder due now, if any: 3 days before the trial ends, 1 day before, and once it has ended (for 2 days). */
const trialStage = (trialEnds: string, now: number) => {
  const h = (Date.parse(trialEnds) - now) / 3600e3;
  if (isNaN(h)) return null;
  if (h <= 0) return h > -48 ? "trial_end" : null;
  if (h <= 24) return "trial_1d";
  if (h <= 72) return "trial_3d";
  return null;
};
/** Trial reminders go out in Indian working hours only (9 AM to 8:59 PM IST); every window is at least 24 hours long. */
const trialHourOk = (istHour: number) => istHour >= 9 && istHour <= 20;
// logic:end
// court-alerts logic:start — plain JS, unit-tested in node (tests/notify-court-alerts.test.mjs evaluates this block).
const COURT_ALERT_HOURS = [7, 21]; // IST: alerts wait for the morning rather than waking anyone
const alertHourOk = (istHour: number) => istHour >= COURT_ALERT_HOURS[0] && istHour <= COURT_ALERT_HOURS[1];
/** 2026-12-01 → 01.12.2026 inside any text. */
const dmyText = (t: string) => String(t ?? "").replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3.$2.$1");
/** Who hears about a case: its assigned advocates (case.team), else the firm owner. Names are matched against active members. */
const alertRecipients = (members: any[], caseData: any) => {
  const team: string[] = (caseData?.team ?? []).filter(Boolean);
  const named = members.filter((m: any) => m.user_id && team.includes(m.name));
  return named.length ? named : members.filter((m: any) => m.user_id && m.is_owner);
};
/** One line per change: "Mehta v. Orion (CS 12/2024): Next hearing moved from 01.12.2026 to 15.01.2027". */
const alertLine = (ev: any, caseData: any) => `${caseData?.title ?? "A case"}${caseData?.no ? " (" + caseData.no + ")" : ""}: ${dmyText(ev.title)}`;
/** The WhatsApp body: every change since the last message, trimmed to fit a template variable. */
const alertWhatsApp = (firm: string, lines: string[]) => {
  const head = `Court record update · ${firm}. `; let out = head; let used = 0;
  for (const l of lines) { const add = (used ? " ; " : "") + l; if ((out + add).length > 880) break; out += add; used++; }
  return used < lines.length ? out + ` ; +${lines.length - used} more in Legal Staff` : out;
};
// logic:end
const nice = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const t12 = (t: string) => { const [h, m] = (t || "10:30").split(":").map(Number); return ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + (h >= 12 ? " PM" : " AM"); };

// ---------- branded HTML email (table layout and inline styles, which every mail app supports) ----------
const SITE = (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
type Row = { lead?: string; main: string; sub?: string; tag?: string; urgent?: boolean };
type Block = { title: string; rows?: Row[]; empty?: string };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
function emailHtml(o: { preheader: string; kicker?: string; heading: string; intro?: string[]; code?: string; blocks?: Block[]; cta?: { label: string; url: string }; note?: string; reason: string }) {
  const p = (t: string) => `<p style="margin:0 0 14px;font:15px/1.6 ${FONT};color:#363636">${esc(t)}</p>`;
  const row = (r: Row) => `<tr>
      <td valign="top" style="padding:12px 14px 12px 0;border-top:1px solid #EDEDED;width:92px;font:600 13px/1.4 ${FONT};color:${r.urgent ? "#B42318" : "#0A0A0A"};white-space:nowrap">${esc(r.lead ?? "")}</td>
      <td valign="top" style="padding:12px 0;border-top:1px solid #EDEDED;font:15px/1.45 ${FONT};color:#0A0A0A">${esc(r.main)}${r.tag ? ` <span style="display:inline-block;margin-left:6px;padding:1px 8px;border-radius:6px;font:600 11px/18px ${FONT};background:${r.urgent ? "#FDECEA" : "#F0F0EF"};color:${r.urgent ? "#B42318" : "#363636"}">${esc(r.tag)}</span>` : ""}${r.sub ? `<div style="font:13px/1.5 ${FONT};color:#6B6B6B;margin-top:2px">${esc(r.sub)}</div>` : ""}</td>
    </tr>`;
  const block = (b: Block) => `<tr><td style="padding:10px 0 4px">
      <div style="font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;margin-bottom:6px">${esc(b.title)}</div>
      ${b.rows?.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${b.rows.map(row).join("")}</table>` : `<div style="padding:12px 0;border-top:1px solid #EDEDED;font:14px/1.5 ${FONT};color:#6B6B6B">${esc(b.empty ?? "Nothing here.")}</div>`}
    </td></tr>`;
  const cta = o.cta ? `<tr><td style="padding:22px 0 6px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:8px;background:#0A0A0A">
      <a href="${esc(o.cta.url)}" style="display:inline-block;padding:12px 22px;font:600 14px/1 ${FONT};color:#FFFFFF;text-decoration:none;border-radius:8px">${esc(o.cta.label)}</a></td></tr></table></td></tr>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(o.heading)}</title></head>
<body style="margin:0;padding:0;background:#F4F4F2;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4F4F2"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px">
    <tr><td style="padding:0 4px 16px">
      <a href="${SITE}" style="text-decoration:none"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
        <td valign="middle" style="padding-right:10px"><img src="${SITE}/assets/email-mark.png" width="31" height="32" alt="Legal Staff" style="display:block;border:0"></td>
        <td valign="middle" style="font:700 18px/1 ${FONT};letter-spacing:-.02em;color:#0A0A0A">Legal Staff</td>
      </tr></table></a>
    </td></tr>
    <tr><td style="background:#FFFFFF;border:1px solid #E5E5E5;border-radius:12px;padding:30px 30px 26px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${o.kicker ? `<tr><td style="font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;padding-bottom:8px">${esc(o.kicker)}</td></tr>` : ""}
        <tr><td style="font:700 22px/1.3 ${FONT};letter-spacing:-.02em;color:#0A0A0A;padding-bottom:16px">${esc(o.heading)}</td></tr>
        <tr><td>${(o.intro ?? []).map(p).join("")}</td></tr>
        ${o.code ? `<tr><td style="padding:6px 0 4px"><div style="display:inline-block;padding:14px 22px;border:1px solid #E5E5E5;border-radius:10px;background:#FAFAF9;font:700 30px/1 'SFMono-Regular',Menlo,Consolas,monospace;letter-spacing:.32em;color:#0A0A0A">${esc(o.code)}</div></td></tr>` : ""}
        ${(o.blocks ?? []).map(block).join("")}
        ${cta}
        ${o.note ? `<tr><td style="padding-top:16px;font:13px/1.55 ${FONT};color:#6B6B6B">${esc(o.note)}</td></tr>` : ""}
      </table>
    </td></tr>
    <tr><td style="padding:18px 6px 0;font:12px/1.6 ${FONT};color:#8A8A8A;text-align:center">
      <a href="${SITE}" style="color:#5E5E5E;text-decoration:none;font-weight:600">Legal Staff</a> · Practice management for Indian advocates<br>
      ${esc(o.reason)}<br>
      <a href="${SITE}/privacy" style="color:#8A8A8A">Privacy</a> · <a href="${SITE}/terms" style="color:#8A8A8A">Terms</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) return { skipped: "Email is not configured." };
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text, ...(html ? { html } : {}) }) });
  return r.ok ? { ok: true } : { error: (await r.text()).slice(0, 300) };
}
async function sendWhatsApp(admin: any, to: string, text: string, templateName?: string) {
  const template = templateName || Deno.env.get("WHATSAPP_TEMPLATE"), lang = Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "en";
  let token = Deno.env.get("WHATSAPP_TOKEN"), phoneId = Deno.env.get("WHATSAPP_PHONE_ID"), version = "v21.0";
  if (!token || !phoneId) {   // No number set through function secrets: use the connection made in Admin › Integrations once it is Connected. An existing number is never replaced.
    const { data: c } = await admin.from("whatsapp_config").select("status,phone_number_id,graph_version").eq("id", 1).maybeSingle();
    if (c?.status === "connected") { const { data: t } = await admin.rpc("wa_secret_get", { p_name: "wa_access_token" }); if (t) { token = t as string; phoneId = c.phone_number_id; version = c.graph_version || version; } }
  }
  if (!token || !phoneId || !template) return { skipped: "WhatsApp is not configured." };
  const num = to.replace(/\D/g, ""); if (num.length < 10) return { skipped: "No WhatsApp number." };
  const full = num.length === 10 ? "91" + num : num;
  const { data: out } = await admin.from("whatsapp_optouts").select("phone_hash").eq("phone_hash", await sha256Hex(full)).maybeSingle();   // replied STOP
  if (out) return { skipped: "Recipient opted out of WhatsApp messages." };
  // Business-initiated messages must use an approved template with one body variable.
  const r = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: full, type: "template", template: { name: template, language: { code: lang }, components: [{ type: "body", parameters: [{ type: "text", text: text.replace(/\s*\n\s*/g, " | ").slice(0, 1000) }] }] } }) });
  if (!r.ok) return { error: (await r.text()).slice(0, 300).split(token).join("[redacted]") };
  try { const j = await r.json(); const wamid = j?.messages?.[0]?.id; if (wamid) await admin.from("whatsapp_messages").insert({ wamid, kind: "briefing", to_masked: maskPhone(full), template, language: lang, status: "accepted" }); } catch { /* delivery tracking is best effort */ }
  return { ok: true };
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
    // The scheduled briefing goes out every day at the member's chosen time, even when nothing is due (they can turn email off in Settings).
    const quiet = !todays.length && !soon.length && !overdue.length && !dls.length;
    const line = (h: any) => `${t12(h.time)} ${cases[h.caseId]?.title ?? "Hearing"} — ${h.court}${h.item ? ", " + h.item : ""}`;
    const dl = (d: any) => `${[0, 1, 3].includes(d.days) ? "!! " : ""}${d.flag}: ${d.title} — ${nice(d.due)}${d.limitation ? " (limitation date, approved)" : ""}${d.rule ? " · " + d.rule : ""}`;
    const body = [`Good morning, ${m.title || m.name}.`, "", todays.length ? `Hearings today (${todays.length}):` : "No hearings today.", ...todays.map(line),
      ...(soon.length ? ["", `Coming up on ${nice(soonDay)} (in ${remind} day${remind === 1 ? "" : "s"}):`, ...soon.map(line)] : []),
      ...(dls.length ? ["", `Deadlines and limitation dates (${dls.length}):`, ...dls.map(dl)] : []),
      ...(overdue.length ? ["", `Overdue tasks (${overdue.length}):`, ...overdue.map((t: any) => t.t)] : []), "", firm.name + " · Legal Staff"].join("\n");
    const urgentDl = dls.filter((d: any) => d.days <= 1);
    const html = emailHtml({
      preheader: quiet ? "Nothing is due today." : `${todays.length ? todays.length + " hearing" + (todays.length === 1 ? "" : "s") + " today" : "No hearings today"}${dls.length ? " · " + dls.length + " deadline" + (dls.length === 1 ? "" : "s") : ""}${overdue.length ? " · " + overdue.length + " overdue task" + (overdue.length === 1 ? "" : "s") : ""}`,
      kicker: `Morning briefing · ${nice(today)}`, heading: `Good morning, ${m.title || m.name}`,
      intro: [quiet ? "Nothing is due today: no hearings, no deadlines in the next week and no overdue tasks. Have a good day." : todays.length ? `You have ${todays.length} hearing${todays.length === 1 ? "" : "s"} today.` : "You have no hearings today."],
      blocks: [
        { title: "Hearings today", rows: todays.map((h: any) => ({ lead: t12(h.time), main: cases[h.caseId]?.title ?? "Hearing", sub: [h.court, h.item].filter(Boolean).join(" · ") })), empty: "No hearings listed for today." },
        ...(soon.length ? [{ title: `Coming up · ${nice(soonDay)}`, rows: soon.map((h: any) => ({ lead: t12(h.time), main: cases[h.caseId]?.title ?? "Hearing", sub: [h.court, h.item].filter(Boolean).join(" · ") })) }] : []),
        ...(dls.length ? [{ title: "Deadlines and limitation dates", rows: dls.map((d: any) => ({ lead: nice(d.due), main: d.title, sub: [d.limitation ? "Limitation date, approved" : "", d.rule].filter(Boolean).join(" · "), tag: d.days === 0 ? "Due today" : d.days === 1 ? "Due tomorrow" : `In ${d.days} days`, urgent: d.days <= 1 })) }] : []),
        ...(overdue.length ? [{ title: "Overdue tasks", rows: overdue.map((t: any) => ({ lead: t.due ? nice(t.due) : "", main: t.t, tag: "Overdue", urgent: true })) }] : [])
      ],
      cta: { label: "Open Legal Staff", url: SITE + "/app" },
      reason: `You receive the morning briefing as a member of ${firm.name}. Change it in Settings › Notifications.`
    });
    const urgent = urgentDl;
    const subject = quiet ? `Your briefing · nothing due today · ${nice(today)}` : (urgent.length ? `Deadline ${urgent[0].days === 0 ? "today" : "tomorrow"}: ${urgent[0].title} · ` : "") + `${todays.length} hearing${todays.length === 1 ? "" : "s"} today · ${nice(today)}`;
    for (const [channel, on, to] of [["email", st.email !== false, m.email], ["whatsapp", st.whatsapp !== false, m.phone]] as const) {
      if (!on || !to) continue;
      if (!opts.onlyUser && sentToday(sent, m.user_id, channel, today)) { results.push({ channel, to, skipped: "Already sent today." }); continue; }
      const r: any = channel === "email" ? await sendEmail(to, subject, body, html) : await sendWhatsApp(admin, to, body);
      if (r.skipped) { results.push({ channel, to, skipped: r.skipped }); continue; }
      await admin.from("notifications").insert({ firm_id: firm.id, user_id: m.user_id, kind: opts.onlyUser ? "briefing_now" : "briefing", channel, recipient: to, subject, body, status: r.ok ? "sent" : "failed", error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null });
      results.push({ channel, to, ok: !!r.ok, error: r.error });
    }
  }
  return results;
}

// Emails the firm owner before the free trial ends, and once when it has ended. Each reminder goes out once per firm
// (a failed send is retried on later runs, at most 3 times). A firm that has paid is 'active', not 'trialing', so it gets none.
async function trialReminders(admin: any, now: number) {
  const clock = istClock(now); if (!trialHourOk(clock.hour)) return [];
  const { data: subs, error } = await admin.from("subscriptions").select("firm_id,plan,trial_ends").eq("status", "trialing");
  if (error) throw error;
  const app = (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "") + "/app#/pricing";
  const results: any[] = [];
  for (const s of subs ?? []) {
    const kind = trialStage(s.trial_ends, now); if (!kind) continue;
    const { data: past } = await admin.from("notifications").select("status").eq("firm_id", s.firm_id).eq("kind", kind);
    if ((past ?? []).some((n: any) => n.status === "sent") || (past ?? []).length >= 3) continue;
    const { data: firm } = await admin.from("firms").select("name").eq("id", s.firm_id).single();
    const { data: owners } = await admin.from("members").select("user_id,email,name,title").eq("firm_id", s.firm_id).eq("is_owner", true).eq("status", "Active");
    const end = new Date(s.trial_ends), endIst = istClock(end.getTime()), endDay = nice(endIst.date);
    const endTime = end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
    const daysLeft = dayDiff(endIst.date, clock.date);
    const when = daysLeft <= 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
    for (const o of owners ?? []) {
      if (!o.email) continue;
      const hello = `Hello ${o.title || o.name || ""},`.replace(" ,", ",");
      const subject = kind === "trial_end" ? "Your Legal Staff free trial has ended" : `Your Legal Staff free trial ends ${when}`;
      const body = (kind === "trial_end" ? [hello, "",
        `The 7-day free trial of the ${s.plan} plan for ${firm?.name ?? "your firm"} ended on ${endDay} at ${endTime} IST.`,
        "The workspace is now closed until you subscribe. Your cases, documents and settings are kept safely, and everything is back the moment you choose a plan.", "",
        `Subscribe here: ${app}`]
      : [hello, "",
        `The 7-day free trial of the ${s.plan} plan for ${firm?.name ?? "your firm"} ends ${when}, on ${endDay} at ${endTime} IST.`,
        "To keep working without interruption, choose a plan before then. Subscribing now does not cut the trial short: the paid period starts when the trial ends.", "",
        `Choose a plan: ${app}`, "",
        "If the trial ends without a plan, the workspace closes until you subscribe. Your data is kept."]).concat(["", "Legal Staff"]).join("\n");
      const ended = kind === "trial_end", fname = firm?.name ?? "your firm";
      const html = emailHtml({
        preheader: ended ? `Your workspace is closed until you subscribe. Your data is kept safely.` : `Your ${s.plan} trial ends ${when}. Subscribe to keep working without interruption.`,
        kicker: ended ? "Free trial ended" : `Free trial · ends ${when}`,
        heading: ended ? "Your free trial has ended" : `Your free trial ends ${when}`,
        intro: ended
          ? [`${hello}`, `The 7-day free trial of the ${s.plan} plan for ${fname} ended on ${endDay} at ${endTime} IST. The workspace is now closed until you subscribe.`, "Your cases, documents and settings are kept safely. Everything is back the moment you choose a plan."]
          : [`${hello}`, `The 7-day free trial of the ${s.plan} plan for ${fname} ends ${when}, on ${endDay} at ${endTime} IST.`, "Choose a plan before then to keep working without interruption. Subscribing now does not cut the trial short: the paid period starts when the trial ends."],
        cta: { label: ended ? "Subscribe now" : "Choose a plan", url: app },
        note: ended ? undefined : "If the trial ends without a plan, the workspace closes until you subscribe. Your data is kept.",
        reason: `You receive this as the owner of ${fname} on Legal Staff.`
      });
      const r: any = await sendEmail(o.email, subject, body, html);
      if (r.skipped) { results.push({ kind, to: o.email, skipped: r.skipped }); continue; }
      await admin.from("notifications").insert({ firm_id: s.firm_id, user_id: o.user_id, kind, channel: "email", recipient: o.email, subject, body, status: r.ok ? "sent" : "failed", error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null });
      results.push({ kind, to: o.email, ok: !!r.ok, error: r.error });
    }
  }
  return results;
}

/** Paid-plan reminder due today, from the days left until the plan's last day: 7 days before, 1 day before, and after it ends. */
const planStage = (daysLeft: number) => daysLeft >= 2 && daysLeft <= 7 ? "plan_7d" : daysLeft >= 0 && daysLeft <= 1 ? "plan_1d" : daysLeft >= -2 && daysLeft <= -1 ? "plan_end" : null;

// Emails the firm owner before a paid plan runs out, and once after it has ended. Once per firm per plan period
// (the kind carries the period's last day, so a renewal starts fresh); a failed send is retried on later runs, at most 3 times.
async function planReminders(admin: any, now: number) {
  const clock = istClock(now); if (!trialHourOk(clock.hour)) return [];
  const { data: subs, error } = await admin.from("subscriptions").select("firm_id,plan,cycle,since,renews").eq("status", "active");
  if (error) throw error;
  const app = (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "") + "/app#/pricing";
  const results: any[] = [];
  for (const s of subs ?? []) {
    if (!s.renews) continue;
    const daysLeft = dayDiff(s.renews, clock.date), stage = planStage(daysLeft); if (!stage) continue;
    const kind = stage + ":" + s.renews;
    const { data: past } = await admin.from("notifications").select("status").eq("firm_id", s.firm_id).eq("kind", kind);
    if ((past ?? []).some((n: any) => n.status === "sent") || (past ?? []).length >= 3) continue;
    const { data: firm } = await admin.from("firms").select("name").eq("id", s.firm_id).single();
    const { data: owners } = await admin.from("members").select("user_id,email,name,title").eq("firm_id", s.firm_id).eq("is_owner", true).eq("status", "Active");
    const fname = firm?.name ?? "your firm", endDay = nice(s.renews), ended = stage === "plan_end";
    const when = daysLeft <= 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
    const cyc = s.cycle === "annual" ? "annual" : "monthly";
    for (const o of owners ?? []) {
      if (!o.email) continue;
      const hello = `Hello ${o.title || o.name || ""},`.replace(" ,", ",");
      const subject = ended ? `Your Legal Staff ${s.plan} plan has ended` : `Your Legal Staff ${s.plan} plan ends ${when}`;
      const intro = ended
        ? [hello, `The ${cyc} ${s.plan} plan for ${fname} ended on ${endDay}. The workspace is closed until you renew.`, "Your cases, documents and settings are kept safely. Renew by UPI in a minute and everything is back at once."]
        : [hello, `The ${cyc} ${s.plan} plan for ${fname} is paid until ${endDay} and ends ${when}.`, "Plans paid by UPI do not renew by themselves. Renew now to keep working without interruption: the new period starts the day after your current one ends, so you lose no days."];
      const body = intro.concat(["", (ended ? "Renew now: " : "Renew your plan: ") + app, "", "Legal Staff"]).join("\n");
      const html = emailHtml({
        preheader: ended ? "Your workspace is closed until you renew. Your data is kept safely." : `Your ${s.plan} plan ends ${when}. Renew by UPI to keep working without interruption.`,
        kicker: ended ? "Plan ended" : `Plan · ends ${when}`,
        heading: ended ? `Your ${s.plan} plan has ended` : `Your ${s.plan} plan ends ${when}`,
        intro, cta: { label: ended ? "Renew now" : "Renew plan", url: app },
        note: ended ? undefined : "You will get an invoice by email as soon as the renewal payment is confirmed.",
        reason: `You receive this as the owner of ${fname} on Legal Staff.`
      });
      const r: any = await sendEmail(o.email, subject, body, html);
      if (r.skipped) { results.push({ kind, to: o.email, skipped: r.skipped }); continue; }
      await admin.from("notifications").insert({ firm_id: s.firm_id, user_id: o.user_id, kind, channel: "email", recipient: o.email, subject, body, status: r.ok ? "sent" : "failed", error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null });
      results.push({ kind, to: o.email, ok: !!r.ok, error: r.error });
    }
  }
  return results;
}

/** Court-record alerts: changes the court check found (notification_events, written by functions/court-sync) go to the advocates on the case.
 *  One message per person per channel covering every change since their last one, between 7 AM and 9:59 PM IST; each change is sent once per
 *  person and channel (kind 'court:<event id>'); a failed send is retried on later runs, at most 3 times. Switch off in Settings › Notifications. */
async function courtAlerts(admin: any, now: number) {
  const clock = istClock(now); if (!alertHourOk(clock.hour)) return { waiting: "outside 7 AM to 9:59 PM IST" };
  const since = new Date(now - 48 * 3600e3).toISOString();
  const { data: events, error } = await admin.from("notification_events").select("id,firm_id,case_id,kind,title,created_at").gte("created_at", since).order("created_at", { ascending: true }).limit(2000);
  if (error) throw error; if (!events?.length) return { events: 0, sent: 0 };
  const ids = [...new Set(events.map((e: any) => e.case_id).filter(Boolean))];
  const { data: legal } = await admin.from("legal_cases").select("id,record_id").in("id", ids);
  const recordOf: Record<string, string> = {}; (legal ?? []).forEach((l: any) => recordOf[l.id] = l.record_id);
  const out = { events: events.length, sent: 0, failed: 0, skipped: 0 };
  for (const firmId of [...new Set(events.map((e: any) => e.firm_id))] as string[]) {
    const evs = events.filter((e: any) => e.firm_id === firmId);
    const { data: firm } = await admin.from("firms").select("name").eq("id", firmId).single();
    const { data: members } = await admin.from("members").select("user_id,email,name,title,phone,is_owner").eq("firm_id", firmId).eq("status", "Active");
    const { data: states } = await admin.from("user_state").select("user_id,data").eq("firm_id", firmId);
    const { data: recs } = await admin.from("records").select("id,data").eq("firm_id", firmId).eq("kind", "case").in("id", [...new Set(evs.map((e: any) => recordOf[e.case_id]).filter(Boolean))]);
    const caseData: Record<string, any> = {}; (recs ?? []).forEach((r: any) => caseData[r.id] = r.data);
    const { data: past } = await admin.from("notifications").select("user_id,channel,kind,status").eq("firm_id", firmId).like("kind", "court:%").gte("created_at", since);
    const doneFor = (uid: string, ch: string, ev: string) => (past ?? []).some((n: any) => n.user_id === uid && n.channel === ch && n.kind === "court:" + ev && n.status === "sent");
    const failsFor = (uid: string, ch: string, ev: string) => (past ?? []).filter((n: any) => n.user_id === uid && n.channel === ch && n.kind === "court:" + ev && n.status === "failed").length;
    const mine: Record<string, any[]> = {};
    for (const ev of evs) for (const m of alertRecipients(members ?? [], caseData[recordOf[ev.case_id]])) (mine[m.user_id] = mine[m.user_id] ?? []).push(ev);
    for (const m of members ?? []) {
      const list = mine[m.user_id]; if (!list?.length) continue;
      const st = ((states ?? []).find((s: any) => s.user_id === m.user_id)?.data ?? {}).settings ?? {};
      if (st.courtAlerts === false) { out.skipped++; continue; }
      for (const [channel, on, to] of [["whatsapp", st.whatsapp !== false, m.phone], ["email", st.email !== false, m.email]] as const) {
        if (!on || !to) continue;
        const todo = list.filter((ev: any) => !doneFor(m.user_id, channel, ev.id) && failsFor(m.user_id, channel, ev.id) < 3); if (!todo.length) continue;
        const lines = todo.map((ev: any) => alertLine(ev, caseData[recordOf[ev.case_id]]));
        const fname = firm?.name ?? "your firm", subject = `Court record update: ${todo.length} change${todo.length === 1 ? "" : "s"}`;
        const body = [`Court record update · ${fname}`, "", ...lines, "", "Open Legal Staff: " + SITE + "/app"].join("\n");
        const html = channel === "email" ? emailHtml({ preheader: lines[0].slice(0, 110), kicker: "Court record", heading: subject, intro: [`The court record changed for ${todo.length === 1 ? "a case" : "cases"} you are on. These come from the court-data check, not from the court's own notice: confirm anything important on the official portal.`],
          blocks: [{ title: "What changed", rows: todo.map((ev: any) => ({ lead: nice(String(ev.created_at).slice(0, 10)), main: caseData[recordOf[ev.case_id]]?.title ?? "A case", sub: dmyText(ev.title), tag: ev.kind.replace(/_/g, " "), urgent: ev.kind === "hearing_changed" })) }],
          cta: { label: "Open Legal Staff", url: SITE + "/app" }, reason: `You receive court-record alerts as an advocate on these cases in ${fname}. Change it in Settings › Notifications.` }) : undefined;
        const r: any = channel === "email" ? await sendEmail(to, subject, body, html) : await sendWhatsApp(admin, to, alertWhatsApp(fname, lines), Deno.env.get("WHATSAPP_ALERT_TEMPLATE") || undefined);
        if (r.skipped) { out.skipped++; continue; }
        await admin.from("notifications").insert(todo.map((ev: any) => ({ firm_id: firmId, user_id: m.user_id, kind: "court:" + ev.id, channel, recipient: to, subject, body, status: r.ok ? "sent" : "failed", error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null })));
        if (r.ok) out.sent++; else out.failed++;
      }
    }
  }
  return out;
}

/** Emails a person the firm owner has just added to the team: who invited them, to which firm, and how to join.
 *  Owner only; the member row must exist and not have signed in yet; at most 3 invitations per person per day. */
async function sendInvite(admin: any, asUser: any, user: any, firmId: string, email: string) {
  const { data: owner } = await asUser.rpc("is_owner", { f: firmId });
  if (!owner) return { error: "Only the firm owner can invite members." };
  const { data: m } = await admin.from("members").select("id,name,role,user_id").eq("firm_id", firmId).eq("email", email).maybeSingle();
  if (!m) return { error: "Add them to the team first." };
  if (m.user_id) return { skipped: "already joined" };
  const since = new Date(Date.now() - 864e5).toISOString();
  const { data: past } = await admin.from("notifications").select("id").eq("firm_id", firmId).eq("kind", "invite").eq("recipient", email).gte("created_at", since);
  if ((past ?? []).length >= 3) return { skipped: "invited recently" };
  const [{ data: firm }, { data: me }] = await Promise.all([
    admin.from("firms").select("name").eq("id", firmId).single(),
    admin.from("members").select("name,title").eq("firm_id", firmId).eq("user_id", user.id).maybeSingle(),
  ]);
  const fname = firm?.name ?? "a firm", who = me?.title || me?.name || user.email;
  const app = (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "") + "/app";
  const subject = `${who} invited you to ${fname} on Legal Staff`;
  const intro = [`Hello${m.name ? " " + m.name : ""},`, `${who} has added you to ${fname} on Legal Staff${m.role ? " as " + m.role : ""}. Legal Staff keeps the firm's cases, hearings, court orders, documents and deadlines in one place.`,
    `To join, open Legal Staff and sign in with this email address (${email}), using Google or a one-time email code. You will land straight in ${fname}'s workspace.`];
  const body = intro.concat(["", "Join now: " + app, "", "Legal Staff"]).join("\n");
  const html = emailHtml({ preheader: `Sign in with ${email} to join ${fname}.`, kicker: "Team invitation", heading: `Join ${fname} on Legal Staff`, intro,
    cta: { label: "Accept invitation", url: app }, note: "If you did not expect this, you can ignore this email; nothing happens until you sign in.",
    reason: `You receive this because ${who} added ${email} to ${fname} on Legal Staff.` });
  const r: any = await sendEmail(email, subject, body, html);
  if (r.skipped) return { skipped: r.skipped };
  await admin.from("notifications").insert({ firm_id: firmId, user_id: null, kind: "invite", channel: "email", recipient: email, subject, body, status: r.ok ? "sent" : "failed", error: r.error ?? null, sent_at: r.ok ? new Date().toISOString() : null });
  return r.ok ? { sent: email } : { error: "Could not send the invitation email." };
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
      let trial: any[] = []; try { trial = await trialReminders(admin, now); } catch (e) { console.error("trial reminders", e); }
      let plan: any[] = []; try { plan = await planReminders(admin, now); } catch (e) { console.error("plan reminders", e); }
      let court: any = {}; try { court = await courtAlerts(admin, now); } catch (e) { console.error("court alerts", e); }
      return json({ sent, skipped, trial, plan, court, ist: istClock(now) });
    }
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Sign in again." }, 401);
    const reqBody = await req.json(), { firm_id } = reqBody;
    const { data: member } = await asUser.rpc("is_member", { f: firm_id });
    if (!member) return json({ error: "Not a member of this firm." }, 403);
    if (reqBody.action === "invite") return json(await sendInvite(admin, asUser, user, firm_id, String(reqBody.email ?? "").trim().toLowerCase()));
    const { data: firm } = await admin.from("firms").select("id,name").eq("id", firm_id).single();
    return json({ results: await briefFirm(admin, firm, { onlyUser: user.id, now: Date.now() }) });
  } catch (e) { console.error(e); return json({ error: "Could not send the briefing." }, 500); }
});

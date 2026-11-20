// Partner Network email: sends queued partner notifications (email_status = 'queued') and test emails of a template.
// actions: drain (scheduled job, header x-cron-secret) · test (signed-in staff with the notifications.manage permission)
// Uses the same Resend account as the rest of Legal Staff (RESEND_API_KEY, EMAIL_FROM). Deploy with JWT verification off; it checks the caller itself.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { fill, emailHtml, cronAllowed } from "../_shared/partner-mail.js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const SITE = (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "");

async function send(to: string, subject: string, text: string) {
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) throw new Error("Email is not set up (RESEND_API_KEY and EMAIL_FROM).");
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, text, html: emailHtml(SITE, subject, text) }) });
  if (!r.ok) throw new Error("Resend refused the email: " + (await r.text()).slice(0, 200));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "drain") {
      // Same check as the other scheduled functions: the CRON_SECRET function secret, or the one kept in Vault (cron_secret_ok).
      const hdr = req.headers.get("x-cron-secret") ?? "";
      let allowed = cronAllowed(hdr, Deno.env.get("CRON_SECRET") ?? "");
      if (!allowed && hdr) { const { data } = await admin.rpc("cron_secret_ok", { s: hdr }); allowed = data === true; }
      if (!allowed) return json({ error: "Not allowed." }, 403);
      const { data: rows } = await admin.from("partner_notifications").select("id,partner_id,title,body").eq("email_status", "queued").eq("channel", "email").order("created_at").limit(50);
      let sent = 0, failed = 0;
      for (const n of rows ?? []) {
        const { data: p } = await admin.from("partners").select("email,name").eq("id", n.partner_id).maybeSingle();
        try { if (!p?.email) throw new Error("no email"); await send(p.email, n.title, n.body); await admin.from("partner_notifications").update({ email_status: "sent" }).eq("id", n.id); sent++; }
        catch (e) { console.error("partner-mail", n.id, String(e).slice(0, 200)); await admin.from("partner_notifications").update({ email_status: "failed" }).eq("id", n.id); failed++; }
      }
      return json({ sent, failed });
    }
    if (body.action === "test") {
      const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
      const { data: ok } = await asUser.rpc("admin_can", { p: "notifications.manage" });
      if (!ok) return json({ error: "You do not have permission to send test emails." }, 403);
      const to = String(body.to ?? "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: "Enter a valid email address." }, 400);
      const { data: t } = await admin.from("partner_templates").select("subject,body").eq("key", String(body.template ?? "")).maybeSingle();
      if (!t) return json({ error: "Unknown template." }, 404);
      const vars = { name: "Sample Partner", code: "LS10001", status: "approved", amount: "₹300.00", note: "", ref: "ABC12345" };
      await send(to, "[Test] " + fill(t.subject, vars), fill(t.body, vars));
      return json({ ok: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (e) { console.error(e); return json({ error: String((e as Error).message ?? e).slice(0, 200) }, 500); }
});

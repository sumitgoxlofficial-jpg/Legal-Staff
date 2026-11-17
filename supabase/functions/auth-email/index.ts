// Supabase Auth "Send Email" hook: every sign-in code, sign-up confirmation, invite, email change and security notice
// Supabase Auth sends goes through here, so it uses the Legal Staff design and the verified legalstaff.in sender (Resend).
// Set up: Supabase › Authentication › Hooks › Send Email › HTTPS, URL <project>/functions/v1/auth-email, generate a secret
// and save it as the function secret SEND_EMAIL_HOOK_SECRET. Uses RESEND_API_KEY and EMAIL_FROM. Deploy with JWT verification off.
// The emailHtml template below is the same as in functions/notify; keep the two in step.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
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


type EmailData = { token: string; token_hash: string; redirect_to: string; email_action_type: string; site_url: string; token_new: string; token_hash_new: string; old_email?: string };
const fail = (status: number, message: string) => new Response(JSON.stringify({ error: { http_code: status, message } }), { status, headers: { "Content-Type": "application/json" } });

/** The link that signs the user in or confirms the action, through Supabase's verify endpoint. */
const verifyUrl = (hash: string, type: string, redirect: string) =>
  `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(redirect || SITE + "/app")}`;

/** Subject, heading and wording for each kind of email Supabase Auth sends. */
function compose(kind: string, to: string, code: string, link: string, d: EmailData, newEmail?: string) {
  const ignore = "If you did not ask for this, you can ignore this email. Your account stays safe.";
  const codeNote = (what: string) => `Enter this code in Legal Staff to ${what}, or use the button below. The code expires in 1 hour and works once.`;
  const reason = `This email was sent to ${to} because of a request on Legal Staff.`;
  switch (kind) {
    case "magiclink": case "email":
      return { subject: `${code} is your Legal Staff sign-in code`, preheader: `Your sign-in code is ${code}`, kicker: "Sign in", heading: "Your sign-in code", intro: [codeNote("sign in")], code, cta: { label: "Sign in to Legal Staff", url: link }, note: ignore, reason };
    case "signup":
      return { subject: `${code} is your Legal Staff confirmation code`, preheader: `Confirm your email with code ${code}`, kicker: "Welcome to Legal Staff", heading: "Confirm your email", intro: ["Thanks for signing up. " + codeNote("confirm your email address")], code, cta: { label: "Confirm email", url: link }, note: ignore, reason };
    case "invite":
      return { subject: "You have been invited to Legal Staff", preheader: "Accept your invitation to Legal Staff", kicker: "Invitation", heading: "You have been invited to Legal Staff", intro: ["You have been invited to join a firm on Legal Staff, the practice management workspace for Indian advocates.", "Accept the invitation to set up your account."], cta: { label: "Accept invitation", url: link }, note: "If you were not expecting this invitation, you can ignore this email.", reason };
    case "recovery":
      return { subject: "Reset your Legal Staff password", preheader: `Your reset code is ${code}`, kicker: "Account security", heading: "Reset your password", intro: [codeNote("reset your password")], code, cta: { label: "Reset password", url: link }, note: ignore, reason };
    case "email_change":
      return newEmail
        ? { subject: "Confirm your new email address for Legal Staff", preheader: `Confirm with code ${code}`, kicker: "Account security", heading: "Confirm your new email address", intro: [`Your Legal Staff account is moving to ${newEmail}. ` + codeNote("confirm this address")], code, cta: { label: "Confirm new email", url: link }, note: ignore, reason }
        : { subject: "Confirm the change of your Legal Staff email", preheader: `Confirm with code ${code}`, kicker: "Account security", heading: "Confirm the email change", intro: ["Someone asked to change the email address of your Legal Staff account. " + codeNote("approve the change")], code, cta: { label: "Approve the change", url: link }, note: "If you did not ask to change your email, do not approve it, and contact us.", reason };
    case "reauthentication":
      return { subject: `${code} is your Legal Staff verification code`, preheader: `Your verification code is ${code}`, kicker: "Account security", heading: "Confirm it is you", intro: ["Enter this code in Legal Staff to confirm it is you. It expires shortly."], code, note: ignore, reason };
    default: {
      // Security notices (password, email, phone or sign-in method changed, two-factor changes).
      const what: Record<string, string> = {
        password_changed_notification: "The password of your Legal Staff account was changed.",
        email_changed_notification: `The email address of your Legal Staff account was changed${d.old_email ? " from " + d.old_email : ""}.`,
        phone_changed_notification: "The phone number of your Legal Staff account was changed.",
        identity_linked_notification: "A new sign-in method was linked to your Legal Staff account.",
        identity_unlinked_notification: "A sign-in method was removed from your Legal Staff account.",
        mfa_factor_enrolled_notification: "A two-step verification method was added to your Legal Staff account.",
        mfa_factor_unenrolled_notification: "A two-step verification method was removed from your Legal Staff account."
      };
      return { subject: "Security notice for your Legal Staff account", preheader: what[kind] ?? "A change was made to your Legal Staff account.", kicker: "Security notice", heading: "A change was made to your account", intro: [what[kind] ?? "A change was made to your Legal Staff account.", "If this was you, there is nothing to do. If it was not, sign in and secure your account, and contact us."], cta: { label: "Open Legal Staff", url: SITE + "/app" }, reason };
    }
  }
}

async function send(to: string, m: ReturnType<typeof compose>) {
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) throw new Error("Email is not configured (RESEND_API_KEY, EMAIL_FROM).");
  const text = [m.heading, "", ...m.intro, ...(m.code ? ["", "Code: " + m.code] : []), ...(m.cta ? ["", m.cta.label + ": " + m.cta.url] : []), ...(m.note ? ["", m.note] : []), "", "Legal Staff · " + SITE].join("\n");
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: m.subject, text, html: emailHtml(m) }) });
  if (!r.ok) throw new Error("Resend refused the email: " + (await r.text()).slice(0, 300));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return fail(405, "Method not allowed");
  const secret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace(/^v1,whsec_/, "");
  if (!secret) return fail(500, "SEND_EMAIL_HOOK_SECRET is not set.");
  const payload = await req.text();
  let user: any, d: EmailData;
  try { ({ user, email_data: d } = new Webhook(secret).verify(payload, Object.fromEntries(req.headers)) as any); }
  catch { return fail(401, "Invalid hook signature."); }
  try {
    const kind = d.email_action_type, redirect = d.redirect_to || d.site_url;
    if (kind === "email_change") {
      // Supabase's field names are reversed here: the current address uses token + token_hash_new, the new one token_new + token_hash.
      if (d.token && d.token_hash_new && user.email) await send(user.email, compose(kind, user.email, d.token, verifyUrl(d.token_hash_new, kind, redirect), d));
      const newCode = d.token_new || (d.token_hash_new ? "" : d.token);
      if (user.new_email && d.token_hash) await send(user.new_email, compose(kind, user.new_email, newCode || d.token, verifyUrl(d.token_hash, kind, redirect), d, user.new_email));
    } else {
      await send(user.email, compose(kind, user.email, d.token, d.token_hash ? verifyUrl(d.token_hash, kind, redirect) : SITE + "/app", d));
    }
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) { console.error(e); return fail(500, (e as Error).message); }
});

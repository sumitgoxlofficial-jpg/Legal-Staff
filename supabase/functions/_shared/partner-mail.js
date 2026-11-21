// Pure helpers for the partner-mail function (unit-tested in node: tests/partner-mail.test.mjs).
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Fills {{name}}-style variables; unknown variables are removed, so a half-filled template never leaks braces. */
export function fill(text, vars = {}) {
  let out = String(text ?? "");
  for (const [k, v] of Object.entries(vars)) out = out.split("{{" + k + "}}").join(String(v ?? ""));
  return out.replace(/\{\{[a-z_]+\}\}/g, "");
}

/** The Legal Staff email layout (same look as the support-reply email in functions/admin). */
export function emailHtml(site, title, body) {
  const paras = String(body).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;font:15px/1.6 ${FONT};color:#0A0A0A">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F4F4F2"><table role="presentation" width="100%" style="background:#F4F4F2"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" style="max-width:600px"><tr><td style="padding:0 4px 16px"><table role="presentation"><tr><td style="padding-right:10px"><img src="${esc(site)}/assets/email-mark.png" width="31" height="32" alt="Legal Staff" style="display:block;border:0"></td><td style="font:700 18px/1 ${FONT};color:#0A0A0A">Legal Staff</td></tr></table></td></tr>
<tr><td style="background:#fff;border:1px solid #E5E5E5;border-radius:12px;padding:28px 30px"><div style="font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;padding-bottom:8px">Advocate Partner Network</div>
<h1 style="margin:0 0 14px;font:600 20px/1.3 ${FONT};color:#0A0A0A">${esc(title)}</h1>${paras}</td></tr>
<tr><td style="padding:16px 6px 0;font:12px/1.6 ${FONT};color:#8A8A8A;text-align:center">You receive this because you applied to the LegalStaff Advocate Partner Network.<br><a href="${esc(site)}/partners" style="color:#5E5E5E">legalstaff.in/partners</a></td></tr></table></td></tr></table></body></html>`;
}

/** Only these hosts and the caller's own secret may drain the queue; returns true when the request may run the batch. */
export const cronAllowed = (headerValue, secret) => !!secret && typeof headerValue === "string" && headerValue.length === secret.length && headerValue === secret;

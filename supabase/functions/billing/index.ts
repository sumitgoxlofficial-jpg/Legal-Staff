// Billing: invoices for plan payments (no GST is charged), as PDF, emailed to the buyer.
// actions:
//   issue  (server only: Authorization = service role key; called by upi-pay when a payment is confirmed)
//          → creates the payment's invoice (once) and emails it with the PDF attached.
//   list   (firm member) → { sub, invoices[] }; creates any missing invoice for a paid payment first.
//   pdf    (firm member) → { filename, pdf (base64) } for one invoice.
//   email  (firm member) → emails one invoice to the signed-in user.
// Seller details come from public.pay_settings (seller_*). Deploy with JWT verification off; it checks every caller itself.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fail extends Error { status: number; constructor(msg: string, status = 400) { super(msg); this.status = status; } }

const SITE = (Deno.env.get("APP_URL") ?? "https://legalstaff.in").replace(/\/$/, "");
const PRICES: Record<string, Record<string, number>> = { Solo: { monthly: 299, annual: 2999 }, Professional: { monthly: 799, annual: 7999 }, Firm: { monthly: 3999, annual: 39999 } };
// Professional: PRICES covers the first user; each additional user costs PER_USER. Keep in step with upi-pay, billing and admin.
const PER_USER: Record<string, number> = { monthly: 249, annual: 2499 }, MAX_USERS = 15;
/** List price in rupees for a plan and cycle; seats only counts for Professional (missing → 1). */
const listPrice = (plan: string, cycle: string, seats?: number | null) => {
  const p = PRICES[plan]?.[cycle]; if (!p) return 0;
  return p + (plan === "Professional" ? (Math.max(1, Number(seats) || 1) - 1) * PER_USER[cycle] : 0);
};
const STATES: Record<string, string> = { "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat", "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory" };

// logic:start — pure functions, unit-tested in node.
/** Indian financial year of a date, e.g. '2026-27' (April to March, India time). */
function finYear(iso: string) {
  const d = new Date(Date.parse(iso) + 5.5 * 3600e3), y = d.getUTCFullYear(), fy = d.getUTCMonth() >= 3 ? y : y - 1;
  return `${fy}-${String((fy + 1) % 100).padStart(2, "0")}`;
}
/** '1,23,456.78' — Indian digit grouping, from paise. */
function inr(paise: number) {
  const neg = paise < 0, v = Math.abs(Math.round(paise)), r = Math.floor(v / 100), p = String(v % 100).padStart(2, "0");
  const s = String(r), last3 = s.slice(-3), rest = s.slice(0, -3);
  return (neg ? "-" : "") + (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3 + "." + p;
}
/** Rupees and paise in words, Indian system: 'Rupees One Thousand Two Hundred and Paise Fifty Only'. */
function inWords(paise: number) {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n: number) => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
  const three = (n: number) => (n >= 100 ? a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + (n % 100 ? two(n % 100) : "");
  const words = (n: number) => {
    if (n === 0) return "Zero";
    const parts: string[] = [], cr = Math.floor(n / 1e7), lk = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1000) % 100, rest = n % 1000;
    if (cr) parts.push(words(cr) + " Crore"); if (lk) parts.push(two(lk) + " Lakh"); if (th) parts.push(two(th) + " Thousand"); if (rest) parts.push(three(rest));
    return parts.join(" ");
  };
  const r = Math.floor(paise / 100), p = paise % 100;
  return "Rupees " + words(r) + (p ? " and Paise " + two(p) : "") + " Only";
}
/** Splits what was paid (GST included) into taxable value and tax, CGST+SGST within a state or IGST across states. */
function taxSplit(totalPaise: number, sellerState: string, buyerState: string) {
  const taxable = Math.round(totalPaise / 1.18), gst = totalPaise - taxable;
  const intra = !sellerState || !buyerState || sellerState === buyerState;
  if (intra) { const cgst = Math.floor(gst / 2); return { taxable, gst, intra, cgst, sgst: gst - cgst, igst: 0 }; }
  return { taxable, gst, intra, cgst: 0, sgst: 0, igst: gst };
}
// logic:end

const fmtDate = (iso: string) => new Date(Date.parse(iso.length === 10 ? iso + "T00:00:00+05:30" : iso)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
/** Helvetica in a PDF covers Windows-1252 only: keep those characters and replace the rest. */
const pdfSafe = (s: unknown) => String(s ?? "").replace(/₹/g, "Rs.").replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…]/g, "?");
/** Plan payments read "<plan> plan"; a one-time purchase of e-signing credits (cycle "once") reads as it is named. */
const pl = (d: any) => d.cycle === "once" ? d.plan : `${d.plan} plan`;
const cyc = (d: any) => d.cycle === "once" ? "One-time purchase" : d.cycle === "annual" ? "Annual" : "Monthly";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);

/** Builds the invoice data for a paid payment (what gets stored and printed). */
async function buildInvoice(admin: any, p: any, s: any) {
  const [{ data: firm }, { data: sub }, u] = await Promise.all([
    admin.from("firms").select("name,city,address,gstin").eq("id", p.firm_id).single(),
    admin.from("subscriptions").select("since,renews").eq("firm_id", p.firm_id).maybeSingle(),
    admin.auth.admin.getUserById(p.user_id),
  ]);
  const email = u?.data?.user?.email ?? "";
  const buyerGstin = (p.gstin || firm?.gstin || "").toUpperCase();
  const sellerState = (s.seller_gstin || "").slice(0, 2) || s.seller_state_code || "";
  const buyerState = buyerGstin.slice(0, 2) || sellerState;
  const t = { taxable: p.amount_paise, gst: 0, intra: true, cgst: 0, sgst: 0, igst: 0 };   // no GST is charged
  const list = p.kind === "esign" ? p.amount_paise : Math.round(listPrice(p.plan, p.cycle, p.seats) * 100);
  return {
    seller: { name: s.seller_name || "Legal Staff", address: s.seller_address || "", gstin: s.seller_gstin || "", pan: s.seller_pan || "", email: s.seller_email || "", phone: s.seller_phone || "", state: STATES[sellerState] ?? "", stateCode: sellerState },
    buyer: { name: firm?.name ?? "", address: [firm?.address, firm?.city].filter(Boolean).join(", "), gstin: buyerGstin, email, state: STATES[buyerState] ?? "", stateCode: buyerState },
    plan: p.plan, cycle: p.cycle, sac: s.sac_code || "",
    period: sub && p.kind !== "esign" ? { from: sub.since, to: sub.renews } : null,
    list, promo: p.promo_code || "", adjust: t.taxable - list,   // negative: discount; small positive: unique-amount paise
    ...t, total: p.amount_paise,
    paidAt: p.paid_at, method: p.method === "promo" ? "Promo code" : "UPI", utr: p.utr || "", orderNo: p.order_no || "",
  };
}

/** The invoice row for a paid payment, created once with the next number of its financial year. */
async function ensureInvoice(admin: any, p: any) {
  const { data: have } = await admin.from("invoices").select("*").eq("payment_id", p.id).maybeSingle();
  if (have) return have;
  const { data: s } = await admin.from("pay_settings").select("*").eq("id", 1).single();
  const data = await buildInvoice(admin, p, s);
  const { data: no, error: e1 } = await admin.rpc("next_invoice_no", { fy: finYear(p.paid_at ?? new Date().toISOString()) });
  if (e1) throw e1;
  const { data: row, error } = await admin.from("invoices").insert({ invoice_no: no, payment_id: p.id, firm_id: p.firm_id, issued_at: p.paid_at ?? new Date().toISOString(), data, total_paise: p.amount_paise }).select("*").single();
  if (error) {   // another call created it at the same moment
    const { data: again } = await admin.from("invoices").select("*").eq("payment_id", p.id).maybeSingle();
    if (again) return again;
    throw error;
  }
  return row;
}

let logoBytes: Uint8Array | null = null;
async function logo() {
  if (logoBytes) return logoBytes;
  try { const r = await fetch(SITE + "/assets/ls-mark-black.png", { signal: AbortSignal.timeout(5000) }); if (r.ok) logoBytes = new Uint8Array(await r.arrayBuffer()); } catch { /* print without the mark */ }
  return logoBytes;
}

/** A4 invoice. */
async function invoicePdf(inv: any) {
  const d = inv.data, pdf = await PDFDocument.create();
  pdf.setTitle("Invoice " + inv.invoice_no); pdf.setAuthor(pdfSafe(d.seller.name)); pdf.setCreator("Legal Staff");
  const page = pdf.addPage([595.28, 841.89]), W = 595.28, M = 48;
  const f = await pdf.embedFont(StandardFonts.Helvetica), fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.04, 0.04, 0.04), mut = rgb(0.42, 0.42, 0.42), line = rgb(0.88, 0.88, 0.87), soft = rgb(0.965, 0.965, 0.957), green = rgb(0.075, 0.45, 0.2);
  const T = (s: unknown, x: number, y: number, o: { size?: number; bold?: boolean; color?: any; right?: boolean; max?: number } = {}) => {
    const font = o.bold ? fb : f, size = o.size ?? 9.5; let t = pdfSafe(s);
    if (o.max) while (t.length > 1 && font.widthOfTextAtSize(t, size) > o.max) t = t.slice(0, -2) + "…";
    page.drawText(t, { x: o.right ? x - font.widthOfTextAtSize(t, size) : x, y, size, font, color: o.color ?? ink });
  };
  const wrap = (s: string, x: number, y: number, w: number, size = 9.5, color = ink, lh = 13) => {
    const words = pdfSafe(s).split(/\s+/); let cur = "", yy = y;
    for (const wd of words) { const n = cur ? cur + " " + wd : wd; if (f.widthOfTextAtSize(n, size) > w && cur) { T(cur, x, yy, { size, color }); yy -= lh; cur = wd; } else cur = n; }
    if (cur) { T(cur, x, yy, { size, color }); yy -= lh; }
    return yy;
  };
  const hr = (y: number) => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: line });

  // header
  let y = 790;
  const lg = await logo();
  if (lg) { try { const img = await pdf.embedPng(lg); page.drawImage(img, { x: M, y: y - 8, width: 26, height: 27 }); } catch { /* no mark */ } }
  T("Legal Staff", M + (lg ? 34 : 0), y, { size: 17, bold: true });
  T("INVOICE", W - M, y + 2, { size: 15, bold: true, right: true });
  T("Original for recipient", W - M, y - 12, { size: 8, color: mut, right: true });
  y -= 36; hr(y); y -= 22;

  // invoice facts
  const facts: [string, string][] = [["Invoice no.", inv.invoice_no], ["Invoice date", fmtDate(inv.issued_at)], ["Order no.", d.orderNo || "-"], ["Status", "PAID"]];
  facts.forEach(([k, v], i) => { const x = M + i * ((W - 2 * M) / 4); T(k.toUpperCase(), x, y, { size: 7.5, bold: true, color: mut }); T(v, x, y - 14, { size: 10.5, bold: true, color: k === "Status" ? green : ink }); });
  y -= 40; hr(y); y -= 20;

  // parties
  const col = (title: string, p: any, x: number, w: number) => {
    let yy = y; T(title, x, yy, { size: 7.5, bold: true, color: mut }); yy -= 15;
    T(p.name || "-", x, yy, { size: 11, bold: true, max: w }); yy -= 15;
    if (p.address) yy = wrap(p.address, x, yy, w, 9.5, rgb(0.21, 0.21, 0.21));
    if (p.state) { T(`State: ${p.state}${p.stateCode ? " (" + p.stateCode + ")" : ""}`, x, yy, { color: rgb(0.21, 0.21, 0.21) }); yy -= 13; }
    if (p.gstin) { T("GSTIN: " + p.gstin, x, yy, { bold: true }); yy -= 13; }
    if (p.pan) { T("PAN: " + p.pan, x, yy); yy -= 13; }
    if (p.email) { T(p.email, x, yy, { color: rgb(0.21, 0.21, 0.21), max: w }); yy -= 13; }
    if (p.phone) { T(p.phone, x, yy, { color: rgb(0.21, 0.21, 0.21) }); yy -= 13; }
    return yy;
  };
  const half = (W - 2 * M - 24) / 2;
  y = Math.min(col("BILLED BY", d.seller, M, half), col("BILLED TO", d.buyer, M + half + 24, half)) - 20;
  if (d.gst && (d.buyer.state || d.seller.state)) { T(`Place of supply: ${d.buyer.state || d.seller.state}`, M, y, { size: 9, color: mut }); y -= 28; }

  // line table
  const cx = { desc: M + 10, sac: 330, per: 395, amt: W - M - 10 };
  page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: soft });
  T("DESCRIPTION", cx.desc, y, { size: 7.5, bold: true, color: mut }); T("SAC", cx.sac, y, { size: 7.5, bold: true, color: mut });
  T("PERIOD", cx.per, y, { size: 7.5, bold: true, color: mut }); T("AMOUNT (INR)", cx.amt, y, { size: 7.5, bold: true, color: mut, right: true });
  y -= 30;
  T(`Legal Staff ${pl(d)}`, cx.desc, y, { size: 10.5, bold: true });
  T(d.sac || "-", cx.sac, y); T(d.period ? fmtDate(d.period.from) + " –" : "-", cx.per, y, { size: 9 });
  T(inr(d.list), cx.amt, y, { right: true });
  y -= 13; T(`${d.cycle === "once" ? "Electronic signing credits" : (d.cycle === "annual" ? "Annual" : "Monthly") + " subscription"} · software as a service`, cx.desc, y, { size: 9, color: mut });
  if (d.period) T(fmtDate(d.period.to), cx.per, y, { size: 9 });
  y -= 18; hr(y); y -= 18;

  // totals
  const tx = 360, row = (k: string, v: string, o: { bold?: boolean; color?: any; size?: number } = {}) => { T(k, tx, y, { size: o.size ?? 9.5, bold: o.bold, color: o.color ?? rgb(0.21, 0.21, 0.21) }); T(v, cx.amt, y, { size: o.size ?? 9.5, bold: o.bold, right: true, color: o.color }); y -= 16; };
  row("Plan price", inr(d.list));
  if (d.adjust < 0) row(d.promo ? `Discount (promo ${d.promo})` : "Discount", "- " + inr(-d.adjust), { color: green });
  if (d.adjust > 0) row("Payment matching paise", "+ " + inr(d.adjust));
  if (d.gst) { row("Taxable value", inr(d.taxable), { bold: true }); if (d.intra) { row("CGST @ 9%", inr(d.cgst)); row("SGST @ 9%", inr(d.sgst)); } else row("IGST @ 18%", inr(d.igst)); }
  y -= 12; page.drawRectangle({ x: tx - 10, y: y - 9, width: W - M - tx + 10, height: 28, color: ink });
  T("Total paid", tx, y, { size: 11, bold: true, color: rgb(1, 1, 1) }); T("INR " + inr(d.total), cx.amt, y, { size: 11, bold: true, color: rgb(1, 1, 1), right: true });
  y -= 34; y = wrap("Amount in words: " + inWords(d.total), tx - 10, y, W - M - tx + 10, 8.5, mut, 11);

  // payment
  y -= 14; hr(y); y -= 20;
  T("PAYMENT", M, y, { size: 7.5, bold: true, color: mut }); y -= 15;
  T(`Paid by ${d.method} on ${d.paidAt ? fmtDate(d.paidAt) : fmtDate(inv.issued_at)}${d.utr ? "   ·   UPI reference " + d.utr : ""}`, M, y); y -= 13;
  if (d.promo) { T(`Promo code applied: ${d.promo}`, M, y, { color: mut }); y -= 13; }
  if (!d.gst) { T("No GST is charged on this invoice.", M, y, { color: mut, size: 8.5 }); y -= 12; }

  // footer
  page.drawLine({ start: { x: M, y: 74 }, end: { x: W - M, y: 74 }, thickness: 0.7, color: line });
  T("This is a computer-generated invoice and does not need a signature.", M, 58, { size: 8.5, color: mut });
  T(`${d.seller.name}${d.seller.email ? " · " + d.seller.email : ""} · ${SITE.replace(/^https?:\/\//, "")}`, M, 45, { size: 8.5, color: mut });
  T("Thank you for choosing Legal Staff.", W - M, 58, { size: 8.5, bold: true, right: true });
  return await pdf.save();
}
const b64 = (u8: Uint8Array) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const fileName = (inv: any) => "Legal-Staff-Invoice-" + inv.invoice_no.replace(/\//g, "-") + ".pdf";

/** Emails the invoice with the PDF attached, in the same branded layout as the other Legal Staff emails. */
async function emailInvoice(admin: any, inv: any, to: string) {
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !from || !to) throw new Fail("Email is not set up.", 501);
  const d = inv.data, pdf = await invoicePdf(inv), FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const rows: [string, string][] = [["Plan", `${d.plan} · ${cyc(d)}`], ...(d.period ? [["Valid", `${fmtDate(d.period.from)} – ${fmtDate(d.period.to)}`] as [string, string]] : []),
    ["Amount paid", "₹" + inr(d.total)], ["Invoice", inv.invoice_no], ["Paid by", d.method + (d.utr ? " · ref " + d.utr : "")], ...(d.promo ? [["Promo code", d.promo] as [string, string]] : [])];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your Legal Staff invoice</title></head>
<body style="margin:0;padding:0;background:#F4F4F2"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Payment received: ${esc(pl(d))}, ₹${esc(inr(d.total))}. Your invoice ${esc(inv.invoice_no)} is attached.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4F4F2"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px">
<tr><td style="padding:0 4px 16px"><a href="${SITE}" style="text-decoration:none"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td valign="middle" style="padding-right:10px"><img src="${SITE}/assets/email-mark.png" width="31" height="32" alt="Legal Staff" style="display:block;border:0"></td>
<td valign="middle" style="font:700 18px/1 ${FONT};letter-spacing:-.02em;color:#0A0A0A">Legal Staff</td></tr></table></a></td></tr>
<tr><td style="background:#FFFFFF;border:1px solid #E5E5E5;border-radius:12px;padding:30px 30px 26px">
<div style="font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#137333;padding-bottom:8px">Payment received</div>
<div style="font:700 22px/1.3 ${FONT};letter-spacing:-.02em;color:#0A0A0A;padding-bottom:14px">Your ${esc(pl(d))} ${d.cycle === "once" ? "have been added" : "is active"}</div>
<p style="margin:0 0 16px;font:15px/1.6 ${FONT};color:#363636">Thank you${d.buyer.name ? ", " + esc(d.buyer.name) : ""}. We have received your payment. Your invoice is attached as a PDF for your records.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows.map(([k, v]) => `<tr><td style="padding:11px 14px 11px 0;border-top:1px solid #EDEDED;width:120px;font:600 13px/1.4 ${FONT};color:#6B6B6B;white-space:nowrap">${esc(k)}</td><td style="padding:11px 0;border-top:1px solid #EDEDED;font:15px/1.45 ${FONT};color:#0A0A0A">${esc(v)}</td></tr>`).join("")}</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px"><tr><td style="border-radius:8px;background:#0A0A0A"><a href="${SITE}/app" style="display:inline-block;padding:12px 22px;font:600 14px/1 ${FONT};color:#FFFFFF;text-decoration:none;border-radius:8px">Open Legal Staff</a></td></tr></table>
<div style="padding-top:16px;font:13px/1.55 ${FONT};color:#6B6B6B">You can download this invoice again any time from Pricing → Your subscription in the app.</div>
</td></tr>
<tr><td style="padding:18px 6px 0;font:12px/1.6 ${FONT};color:#8A8A8A;text-align:center"><a href="${SITE}" style="color:#5E5E5E;text-decoration:none;font-weight:600">Legal Staff</a> · Practice management for Indian advocates<br>You received this because you paid for a Legal Staff plan.<br><a href="${SITE}/privacy" style="color:#8A8A8A">Privacy</a> · <a href="${SITE}/refund-policy" style="color:#8A8A8A">Refunds</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = `Payment received — your ${pl(d)} ${d.cycle === "once" ? "have been added" : "is active"}.\n\n` + rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nYour invoice is attached as a PDF.\n${SITE}/app`;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], ...(d.seller.email ? { reply_to: d.seller.email } : {}), subject: `Invoice ${inv.invoice_no}: Legal Staff ${pl(d)}, ₹${inr(d.total)}`, html, text, attachments: [{ filename: fileName(inv), content: b64(pdf) }] }) });
  if (!r.ok) throw new Fail("Could not send the invoice email: " + (await r.text()).slice(0, 200), 502);
  await admin.from("invoices").update({ emailed_to: to, emailed_at: new Date().toISOString() }).eq("id", inv.id);
}

/** Tells the business owner about a new payment (pay_settings.alert_email, or the seller email). Never blocks anything. */
async function alertOwner(admin: any, inv: any) {
  const { data: s } = await admin.from("pay_settings").select("alert_email,seller_email").eq("id", 1).single();
  const to = s?.alert_email || s?.seller_email, key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("EMAIL_FROM");
  if (!to || !key || !from) return;
  const d = inv.data, FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const rows: [string, string][] = [["Amount", "₹" + inr(d.total)], ["Firm", d.buyer.name || "-"], ["Buyer", d.buyer.email || "-"], ["Plan", `${d.plan} · ${cyc(d)}`],
    ...(d.period ? [["Period", `${fmtDate(d.period.from)} – ${fmtDate(d.period.to)}`] as [string, string]] : []), ["Invoice", inv.invoice_no], ["Paid by", d.method + (d.utr ? " · ref " + d.utr : "")], ...(d.promo ? [["Promo code", d.promo] as [string, string]] : [])];
  const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#F4F4F2"><table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E5E5;border-radius:12px"><tr><td style="padding:26px 28px">
<div style="font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#137333;padding-bottom:8px">New payment</div>
<div style="font:700 22px/1.3 ${FONT};color:#0A0A0A;padding-bottom:14px">₹${esc(inr(d.total))} from ${esc(d.buyer.name || "a firm")}</div>
<table role="presentation" width="100%">${rows.map(([k, v]) => `<tr><td style="padding:9px 12px 9px 0;border-top:1px solid #EDEDED;width:110px;font:600 13px ${FONT};color:#6B6B6B">${esc(k)}</td><td style="padding:9px 0;border-top:1px solid #EDEDED;font:14px ${FONT};color:#0A0A0A">${esc(v)}</td></tr>`).join("")}</table>
<div style="padding-top:14px;font:13px/1.5 ${FONT};color:#6B6B6B">The plan is active and the invoice has been emailed to the buyer.</div></td></tr></table></body></html>`;
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: `New payment: ₹${inr(d.total)} · ${d.buyer.name || "firm"} · ${d.plan}`, html, text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") }) }).catch(() => {});
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, admin = createClient(url, service);
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "";

    // ---- called by upi-pay right after a payment is confirmed ----
    if (action === "issue") {
      if (req.headers.get("Authorization") !== "Bearer " + service) return json({ error: "Not allowed." }, 403);
      const { data: p } = await admin.from("payments").select("*").eq("id", body.payment_id).eq("status", "paid").maybeSingle();
      if (!p) throw new Fail("Paid payment not found.", 404);
      const inv = await ensureInvoice(admin, p);
      if (!inv.emailed_at) { await emailInvoice(admin, inv, inv.data.buyer.email).catch((e) => console.error("invoice email", e)); await alertOwner(admin, inv); }
      return json({ invoice_no: inv.invoice_no });
    }

    // ---- firm members ----
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) throw new Fail("Sign in again.", 401);
    const firmId = body.firm_id;
    const { data: member } = await asUser.rpc("is_member", { f: firmId });
    if (!member) throw new Fail("You are not a member of this firm.", 403);

    if (action === "list") {
      const { data: paid } = await admin.from("payments").select("*").eq("firm_id", firmId).eq("status", "paid").order("paid_at", { ascending: false }).limit(50);
      const have = new Set(((await admin.from("invoices").select("payment_id").eq("firm_id", firmId)).data ?? []).map((r: any) => r.payment_id));
      for (const p of paid ?? []) if (!have.has(p.id)) await ensureInvoice(admin, p);
      const [{ data: invs }, { data: sub }] = await Promise.all([
        admin.from("invoices").select("id,invoice_no,issued_at,total_paise,emailed_to,emailed_at,data").eq("firm_id", firmId).order("issued_at", { ascending: false }),
        admin.from("subscriptions").select("*").eq("firm_id", firmId).maybeSingle(),
      ]);
      return json({ sub, invoices: (invs ?? []).map((i: any) => ({ id: i.id, invoice_no: i.invoice_no, issued_at: i.issued_at, total: i.total_paise, emailed_to: i.emailed_to, emailed_at: i.emailed_at,
        plan: i.data.plan, cycle: i.data.cycle, period: i.data.period, method: i.data.method, utr: i.data.utr, promo: i.data.promo, order_no: i.data.orderNo })) });
    }

    const { data: inv } = await admin.from("invoices").select("*").eq("id", body.invoice_id).eq("firm_id", firmId).maybeSingle();
    if (!inv) throw new Fail("Invoice not found.", 404);
    if (action === "pdf") return json({ filename: fileName(inv), pdf: b64(await invoicePdf(inv)) });
    if (action === "email") { await emailInvoice(admin, inv, user.email ?? ""); return json({ sent_to: user.email }); }

    throw new Fail("Unknown action.");
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message }, e.status);
    console.error(e); return json({ error: "Something went wrong with billing." }, 500);
  }
});

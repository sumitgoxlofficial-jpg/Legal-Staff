// Razorpay rules for the Rs 49 directory listing (no network, no database). Unit-tested in tests/razorpay-logic.test.mjs.
export const LISTING_PAISE = 4900;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function hmacHex(secret, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
}
export function safeEqual(a, b) { a = String(a ?? ""); b = String(b ?? ""); let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; }
/** Checkout success signature: HMAC-SHA256(order_id + "|" + payment_id) with the key secret. */
export async function verifyCheckout(secret, orderId, paymentId, signature) { return !!secret && !!orderId && !!paymentId && safeEqual(await hmacHex(secret, orderId + "|" + paymentId), signature); }
/** Webhook signature: HMAC-SHA256 of the raw body with the webhook secret. */
export async function verifyWebhook(secret, rawBody, signature) { return !!secret && !!signature && safeEqual(await hmacHex(secret, rawBody), signature); }
/** Is this payment entity the Rs 49 listing, for this order, and paid (or authorised, to be captured)? */
export function judgePayment(payment, orderId) {
  if (!payment || payment.order_id !== orderId) return { ok: false, reason: "payment belongs to another order" };
  if (payment.currency !== "INR" || Number(payment.amount) !== LISTING_PAISE) return { ok: false, reason: "wrong amount or currency" };
  if (payment.status === "captured") return { ok: true, capture: false };
  if (payment.status === "authorized") return { ok: true, capture: true };
  return { ok: false, reason: "payment is " + payment.status };
}

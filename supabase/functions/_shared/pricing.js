// THE ONE PLACE PLAN PRICES ARE DEFINED (rupees, no GST added). Changing a price means: edit this file, then make every place below agree.
// tests/pricing-drift.test.mjs fails if any of them disagrees, so a price can never be charged at one amount and advertised at another:
//   charged     supabase/functions/razorpay, billing, admin   (constants PRICES, PER_USER, MAX_USERS, DIR_FEE_PAISE)
//   advertised  app.html and index.html (plan cards), the JSON-LD "lowPrice/highPrice" on every page and in seo/lib.mjs, the support assistant's text
// After editing: run `node tests/pricing-drift.test.mjs`, fix what it names, rebuild the SEO pages (node seo/build.mjs), redeploy the three functions and support-ai.
export const PRICES = { Solo: { monthly: 299, annual: 2999 }, Professional: { monthly: 799, annual: 7999 }, Firm: { monthly: 3999, annual: 39999 } };
// Professional: PRICES is the first user; each extra user costs PER_USER, up to MAX_USERS.
export const PER_USER = { monthly: 249, annual: 2499 };
export const MAX_USERS = 15;
// Directory listing, one time, in paise.
export const DIR_FEE_PAISE = 4900;

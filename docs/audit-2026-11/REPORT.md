# LegalStaff.in — repository audit, fixes and production readiness (21–22 Nov 2026)

Scope: the repository at `main` (3d31de6) merged into branch `claude/stoic-lovelace-w5goqs`. Method: read every backend function, every migration that touches money, access or the directory, the admin console, the partner programme and the signed-in app; ran every existing test; added tests for each fix; checked the live Supabase project read-only (migrations list, edge functions, security advisor, three count queries) and Vercel (deployments). **The live site https://legalstaff.in could not be fetched from this environment (proxy 403), so the live-vs-repo comparison is by deployment metadata, not by page.** Nothing was deployed, no migration was applied to production, no real payment was made.

## 1. Audit

| | |
|---|---|
| HTML pages in the repo | 105 (92 in the sitemap; 13 private/utility). All 301 page-checks pass (desktop + phone) |
| Internal links checked | 13,028, none broken |
| Edge functions | 19 in the repo; 19 live. Live also has 4 legacy ones not in the repo (`razorpay-order`, `razorpay-verify`, `razorpay-webhook`, `upi-pay`): see "Remaining" |
| Migrations | 45 in the repo (0001–0045); 53 applied live (0044/0045 not yet) |
| Live vs repo | Vercel production = `main` 3d31de6, which is what this branch started from; no drift found at deployment level |

**Working end to end**: sign-in, firms and teams, records sync, documents/Drive, AI (credit-metered), court intelligence, WhatsApp/email notifications, plans/trial/promo codes/invoices, ₹49 listing checkout, directory review + AI document check, partner network (ledger, KYC gate, payouts, audit), email marketing, support inbox, admin overview/firms/coupons/expenses/settings.
**Partial**: role permissions inside a firm (labels only), upgrade/downgrade (no proration), directory duplicate prevention, reports/enquiries (no admin view, no advocate notification), e-sign (in-app only; Aadhaar eSign/NeSL "coming soon"), AI Agents (local text builders, not AI), Client Portal (preview only).
**Missing** (not built): user suspend/delete/edit in admin; plan-price editor; banners/announcements; manage super admins in UI; CSV export for firms/payments/support; per-profile public URLs/SEO pages for advocates; subscription cancellation by the customer; account deletion; server-side pagination of the directory.

## 2. Bugs found and fixed

| # | Sev | Defect | Fix | Test |
|---|---|---|---|---|
| 1 | High | No Razorpay webhook: a payment made and the tab closed = money taken, nothing activated; "failed" never recorded | Signed webhook in `functions/razorpay` + `payment_events` ledger (replay-proof) | razorpay-engine 31 |
| 2 | High | Checkout verify trusted the signature only; an authorised-not-captured payment activated a plan | Re-reads the order from Razorpay: paid, amount, INR | razorpay-engine |
| 3 | High | Directory: order insert error ignored, profile marked paid with no ledger row; duplicate second payment swallowed silently | Order saved first; failure leaves profile unlisted; duplicates recorded and surfaced for refund | razorpay-engine |
| 4 | High | First person to create a firm became a hidden platform admin (can verify directory profiles, read all support mail and enquiries, rotate court API key). Production has 1 such row | `is_platform_admin()` = Super Admin; `create_firm` no longer inserts | hardening-db |
| 5 | High | `directory_resubmit` callable by anon with public values: anyone could overwrite a listed profile in status "info" | Execute revoked; `directory_status` no longer leaks notes | hardening-db |
| 6 | High | Stored XSS into the Super Admin console via the directory application id | `esc()` in `admin-partners.js`; id format CHECK | hardening-db |
| 7 | High | Promo codes: check-then-act race let one firm stack free periods and exceed `max_uses` | `promo_claim()` atomic + advisory lock; free codes must name their plans | hardening-db, admin-engine |
| 8 | High | Solo plan could be bought by a firm with many members | Cap = Solo 1, otherwise seats/15 | razorpay-engine |
| 9 | High | Partner self-referral not caught when the same login used different contact details | Attribution now compares `user_id` | hardening-db |
| 10 | High | Commission in an open payout survived listing rejection; payout could be paid to a suspended partner | Payout put on hold + clawback flag; approve/processing/paid need an approved partner | hardening-db |
| 11 | High | No refund handling anywhere (promised in the refund policy); commission stayed after a refund | `apply_refund()`, webhook `refund.processed`, admin Refund button; listing taken down, plan ended, commission reversed/flagged | hardening-db, admin-engine |
| 12 | Med | Directory page said "Verified by Legal Staff" on every profile, "Find a verified advocate", "listed when verified" while profiles are listed on payment | Wording now matches behaviour; "Documents checked by Legal Staff (not a Bar Council certificate)" | site-smoke |
| 13 | Med | Public inserts (enquiries, reports, contact) unlimited, any application id, pre-settable admin fields | Length CHECKs, listed-profile check, hourly rate limit, no pre-answered rows | hardening-db |
| 14 | Med | Same enrolment number written differently = separate applications | Unique index on the normalised number (0 existing duplicates in production) | hardening-db |
| 15 | Med | Core admin function: no audit trail; DB errors reported as success; `directory_list` shipped up to 500 photos; directory ₹49 payments absent from Payments and revenue; failed payments never shown | `admin_audit_log` (append-only) + Activity log tab; errors surfaced; light list + per-record load; directory fees in Payments/revenue; event list and "needs a person" panel | admin-engine 14 |
| 16 | Med | Any member could rename the firm / change GSTIN printed on invoices; owner could suspend self (firm lock-out) or clear ownership (second trial) | `guard_firm_fields`, `guard_owner_member` triggers | hardening-db |
| 17 | Med | Draft HTML "sanitiser" was a regex (`<img onerror>` etc. passed; restored backups reach it) | DOM-based `static/sanitize.js` | sanitize 22 |
| 18 | Med | Chat meeting cards rendered any link (`javascript:`) and crashed the channel without `start` | DB CHECK on link and start | hardening-db |
| 19 | Med | "Send now" briefing had no cap (message relay) | 3/day per user | (code; not unit-tested) |
| 20 | Med | Support AI never ran: it looked for `reply IS NULL` but the column is `NOT NULL DEFAULT ''` (confirmed on the live DB) | Filter `reply = ''` | (not unit-tested) |
| 21 | Low | Admin sign-in created accounts for any email; any network error signed the super admin out | `shouldCreateUser:false`; only 401/403 sign out | — |
| 22 | Low | No 404 page; private pages (`/app`, partner login/register) indexable or in the sitemap; no security headers | `404.html`, noindex, `vercel.json` headers, sitemap rebuilt | site-smoke |
| 23 | Low | e2e suite stale (sidebar now grouped) | Assertion updated | e2e 25/25 |

## 3. Admin / Super Admin

Authorisation (server-side, every action) is sound: no sign-in 401, a normal user 403, an unconfirmed email 403, tested on read and write actions. The partner-network RPCs are all permission-checked and audited (existing tests: 145).

| Module | Status |
|---|---|
| Overview (revenue, MRR, firms, expenses, 12-month chart) | Working; now includes ₹49 directory fees |
| Firms & users: grant/extend/change/end plan | Working, now audited and validated. No user-level suspend/delete/edit, seats not editable |
| Payments: plan orders, directory fees, Razorpay events, needs-attention, refunds | Working (new); capped at the latest 300 rows, no search |
| Directory review (documents, AI report, verify/info/reject + email) | Working; list now lightweight |
| Coupons | Working; free codes must name plans |
| Support inbox + reply | Working; AI auto-reply now actually selects messages |
| Expenses, Settings (seller details), WhatsApp integration | Working |
| Email marketing (11 screens), Partner Network (20 screens) | Working, audited |
| Activity log | New |
| Missing | pricing editor, banners/announcements, super-admin management UI (SQL only), exports for firms/payments/support, reports/enquiries/reviews moderation views |

## 4. Payments

Provider: **Razorpay only** (UPI-direct path was removed in 0014/0038; four legacy edge functions remain deployed). Checkout signature verification, amount/ownership checks and idempotent activation were already correct; webhook, refund, failure and reconciliation were missing and are now built and tested against a mock. **Not tested against Razorpay itself** (no credentials here; the Razorpay MCP needs authorising). Remaining configuration: set `RAZORPAY_WEBHOOK_SECRET`, add the webhook in the Razorpay dashboard, deploy `razorpay` + `admin`, then do one `rzp_test_` end-to-end payment and one test refund. Not built: proration on upgrade/downgrade (the new plan replaces the old immediately and time is appended), customer cancellation, auto-renewal (manual prepaid by design), invoice for the ₹49 fee.

## 5. Security

Tested: unauthorised calls to admin actions, webhook with bad/forged signature, replay, tampered amounts, cross-user order claim, anon/authenticated access to RPCs and tables (hardening-db), 20 XSS vectors, public-insert flooding, privilege paths for owner/member. Verified sound (read): RLS on all tables, JWT checks in every function, HMAC constant-time, secrets never returned, `super_admins` has no client policy.
**Remaining risks** (not fixed, need a decision): (a) a paid ₹49 profile is **listed before any document check**, with the label "Not verified yet" — anyone can pay to list a real advocate's enrolment number and receive client enquiries; recommend listing only after verification, or expiring unverified profiles after N days; (b) no role enforcement inside a firm (`can()` always true; an intern can edit invoices/delete cases) — needs per-role policies; (c) first-touch referral rule is browser-only; (d) partner click flooding (no per-IP limit); (e) override of an approved commission's attribution leaves it payable; (f) KYC "verified" is a bare flag with no document review; (g) CORS `*` (bearer tokens, low risk); (h) erase/delete-account incomplete (chat, cases, Drive); (i) no CSP (inline scripts everywhere); (j) leaked-password protection disabled in Supabase Auth; (k) invoices always add 18% GST even without a GSTIN; (l) 52 tables have RLS and no policy (intentional server-only; advisor INFO).

## 6. Development

New: `supabase/migrations/0044_security_hardening.sql`, `0045_core_app_hardening.sql`; `404.html`; `static/sanitize.js`; `tests/serve.mjs`, `site-smoke.mjs`, `sanitize.test.mjs`, `razorpay-engine.test.mjs`, `razorpay-fake-db.mjs`, `admin-engine.test.mjs`, `hardening-db/*`, `run-all.sh`; `.github/workflows/tests.yml`. Modified: `functions/razorpay`, `admin`, `notify`, `support-ai`; `admin.html`, `static/admin-partners.js`, `directory.html`, `app.html`, `vercel.json`, `seo/pages/partners.mjs` (+ regenerated sitemap/tool pages), `tests/e2e.js`, READMEs, `.env.example`. Migrations are re-runnable and change no customer data.

## 7. Tests (all run here, no network)

court-logic 35 · court-engine 37 · notify 18 · whatsapp-logic 21 · whatsapp-engine 33 · email-logic 54 · email-engine 66 · partner-export 7 · partner-mail 6 · sign 5 · **razorpay-engine 31 · admin-engine 14** · court-db, whatsapp-db, email-db, partner-db 145 · **hardening-db 57** · **sanitize 22** · **site-smoke 301** · e2e 25. Failing: `tests/partner-ui/ui.test.mjs` 63/64 (fails the same way on main, stale after the instant-access change). Not tested: any real third party (Razorpay, Meta, Resend/Brevo, Groq, eCourtsIndia, Google), real-device mobile, load.

## 8. Production readiness

**READY WITH CONFIGURATION REQUIRED** for the code in this branch, and **NOT READY for a "fully secure SaaS" claim** until the decisions in §5 (a) and (b) are made. Before merge/deploy: apply 0044 and 0045 (0044 changes who counts as platform admin; confirm the one existing `platform_admins` user is the owner, who is a Super Admin by email), set the webhook secret, deploy `razorpay`, `admin`, `notify`, `support-ai`, run one Razorpay test-mode payment + refund, and decide whether to turn on the now-working support AI replies.

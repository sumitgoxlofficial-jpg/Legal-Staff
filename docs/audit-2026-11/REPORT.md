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

## 9. Round 2 (22 Nov): the "no decision needed" items

Fixed and tested (migration `0046`, `functions/admin`, `functions/directory-verify`, `api/*`, `admin.html`):

| Item | Fix | Test |
|---|---|---|
| Partner click flooding | Per-code limit of 400 clicks an hour on top of the per-visitor limit | hardening-db |
| First-touch rule only in the browser | The server now credits the partner whose link the visitor opened first inside the window (`attribution_rule = first_touch`, the setting that was stored but never read) | hardening-db |
| Override left an approved commission payable | Override also rejects approved/payable commissions; refused while the commission sits in a payout | hardening-db |
| KYC "verified" was a bare flag | Needs a PAN and a bank proof on file | hardening-db |
| Read-only after plan end covered only records | Drafts/notes (`user_state`), chat messages and chat files are read-only once a plan has ended; a firm that never started a plan is not locked (onboarding unaffected) | hardening-db |
| "Delete firm data" left chat and court cases | Also clears team chat and court-case records | hardening-db |
| Reports and enquiries had no admin view | Admin "Directory inbox" (read only, CSV export) | admin-engine |
| Advocates were not told about contact requests | The directory-verify sweep emails names and topics once per request (no phone, no message text); existing requests are marked as told so nothing old is sent | directory-notify 6 |
| No shareable profile pages | `/advocate/:id` (Vercel function): title, description, canonical, Open Graph, JSON-LD, escaped text; profiles whose documents are not checked are `noindex`; `/advocates-sitemap.xml` lists checked profiles only | advocate-page 7 |
| Admin: no user suspend, super-admin management or exports | Team suspend/reactivate (never the owner), add/remove administrators (never yourself or the last one), CSV export for firms, payments and the directory inbox; all audited | admin-engine 18 |

Still open from §5: the unverified-listing decision, in-firm roles, GST on invoices, proration/cancellation, optimistic concurrency, CSP, a full account-deletion flow (the auth user and Drive files), server-side directory pagination (profile photos still ship in the one directory call), a per-profile "copy link" button in the directory UI (the `/advocate/:id` pages exist), pricing editor and banners.

To go live: apply `0046`, deploy `admin` and `directory-verify`, and let Vercel build the `api/` folder (set `SUPABASE_URL`, `SUPABASE_ANON_KEY` only if the project changes; the defaults are the public values in `config.js`).

## 10. Unverified listings (22 Nov): fixed

Problem: since migration 0030 a profile went public the moment ₹49 was paid, labelled "Not verified yet". Anyone could pay with a real advocate's enrolment number, appear in the directory, rank in search and receive that advocate's client enquiries.

Fix (migration `0047_list_verified_only.sql`, `directory.html`, `directory-verify`, `support-ai`): a profile is public only when it is **paid and its documents have been checked** (`status = 'verified'`). The check is automatic (about a minute after the certificate and photo ID are uploaded), so an honest advocate waits minutes, not days. Enforced in the database, not just the page: `directory_profiles()`, response stats, review summaries and `dir_is_listed()` (the gate for client enquiries and reports) all require `verified`. A paid-but-unchecked advocate still sees their own application and its status. Refunds and rejections unlist as before. All wording that promised "listed as soon as the fee is paid" now says the profile goes live once the fee is paid and the documents have been checked; the reminder email and the support-AI knowledge text match.

Production effect when applied (read-only count on 22 Nov): 3 verified and paid profiles stay public; 3 paid profiles that are not verified (1 "needs information", 2 with no documents uploaded) leave the directory until their documents match. Tests: hardening-db section 9 (11 checks).

Still not enforced: the check reads documents with AI and compares them with what was typed; it does not look the number up on a Bar Council roll, so the tick remains "Legal Staff's own check, not a Bar Council certificate".

### Content Security Policy
Enforced now: `object-src 'none'; base-uri 'self'; frame-ancestors 'self'` (no plugins, no injected `<base>`, no framing by other sites). A full policy (script, style, font, image, connect and frame sources for Google sign-in, Razorpay, Supabase, Google Fonts, the PDF library) is sent as **Content-Security-Policy-Report-Only**: it blocks nothing. Open the app, the directory and a checkout in a browser with DevTools open; any line starting "[Report Only]" is something that would be blocked. When a full session produces none, rename the header to `Content-Security-Policy` in `vercel.json`. It still allows `'unsafe-inline'` and `'unsafe-eval'` for scripts because the pages use inline scripts and a template compiler, so it limits where scripts may load from but does not stop injected inline script; the real XSS defences are escaping and the sanitiser.

### Delete my account (migration 0049 + function `account`)
Settings → Delete my account (type your email). Server side: `erase_user_account` refuses, changing nothing, while the person owns a firm that still has other active members (hand it over first) or a partner account has earnings still being settled. Otherwise it removes them from every firm (firm and colleagues' data stay), clears their personal rows (notes, notifications, chat reads/reactions, Drive link, admin link), takes their directory profile off the list, and, if they are the only member of a firm, erases that firm's records; the function then deletes that firm's stored files and finally the sign-in. Payment, order and commission records are kept (accounting law; no practice data in them). Files in the user's Google Drive hidden folder stay encrypted there and are removed by the user in Google Drive → Manage apps. **Not live yet:** needs migration 0049 applied and the `account` function deployed (JWT verification off).

### Admin: delete a person's account
Admin → firm → Team → "Delete account" (type their email). Same rules and same database function as "Delete my account" (refuses for an owner with colleagues or partner earnings still settling; never for an administrator), plus the firm's files and the sign-in; audited as `user.delete`. Needs the `admin` function redeployed and migration 0049.
**Not built, needs your decision:** a price editor (plan prices are fixed in three server functions and the checkout, and a price change moves real money, so it should be a deliberate change with a migration and a test, not a form field) and site banners (no banner feature exists yet; say what it should show, to whom, and where).

### Partner UI test refreshed and back in the suite
`tests/partner-ui/ui.test.mjs` was stale (the dashboard now shows KPI cards, the admin sidebar is grouped and a refused admin call carries a 403 status). Updated to match; it now passes 112 of 112 and runs in `tests/run-all.sh`. Also: partner documents can be accepted or rejected one by one (migration 0050).

### Site banner (migration 0051) and billing wording
Admin → Settings → Site banner: message (300 characters, plain text), colour, optional https link, optional start and end dates (India time), on/off; audited as `banner.save`. Everyone reads the live banner through `site_banner()`; the table itself is closed to the browser. The app shows it above the page with a dismiss (×) that lasts for the browser session. Needs migration 0051 and the `admin` function redeployed.
Billing: plans are one-time payments for a fixed month or year with no automatic charge, so there is nothing to cancel mid-period; the Terms now say so (they wrongly said plans renew automatically) and that changing plan starts a new period with no pro-rata. Refunds stay a manual admin action. **The Terms text changed: please have it read by whoever advises you on legal wording.**

### Directory: photos on demand (migration 0052)
The list no longer carries every advocate's photo (about 217 KB for 3 profiles, growing with every listing). `directory_profiles_lite()` returns the same paid-and-verified profiles with a `has_photo` flag, and `directory_photos(ids)` returns the photos of at most 12 listed profiles, fetched for the 6 cards on screen, the open profile and the compare table. A page that meets a database without 0052 falls back to the old function. Tested in Chromium (`tests/directory-photos.test.mjs`) and in the database harness.
Legacy functions: `razorpay-verify`, `razorpay-order`, `razorpay-webhook` and `upi-pay` have no callers in the code, no scheduled job, and no traffic in the function logs (one rejected stray call to `upi-pay`). The tools available to me cannot delete a function: remove them in the Supabase dashboard (Edge Functions) once you agree.
`notify` redeployed (version 29): plan reminder emails no longer say "Renew by UPI", court-record alerts are on, and "Send now" is capped at 3 a day.

### Prices: one file and a drift test (decision: no database price editor)
Plan prices appear in more than 100 static pages as well as in checkout, billing, admin, the app and the support assistant, so a price editable only in the database could charge one amount while the site advertises another. Instead `supabase/functions/_shared/pricing.js` is the single definition, and `tests/pricing-drift.test.mjs` (in `tests/run-all.sh` and CI) fails, naming the file and number, if razorpay, billing, admin, the plan cards in app.html and index.html, the JSON-LD price range on every page, or the support assistant disagree with it. To change a price: edit that file, run the test, fix what it lists, rebuild the SEO pages, redeploy `razorpay`, `billing`, `admin` and `support-ai`.

### Content Security Policy: checked in a real browser
`tests/csp-report.test.mjs` serves the real pages with the full policy as Report-Only and fails on any violation. 52 pages were checked once by hand and 14 key pages run in the suite: zero violations, and a deliberately strict policy proves the detector does fire. What this cannot cover is what happens only after a click: the Razorpay checkout pop-up and the Google sign-in pop-up (third-party hosts are allowed in the policy, but they were not exercised). So: run one sandbox checkout and one Google sign-in with the browser console open; if no "[Report Only]" line appears, rename the header in `vercel.json` to `Content-Security-Policy` to enforce it.

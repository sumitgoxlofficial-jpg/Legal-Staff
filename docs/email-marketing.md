# Email Marketing Automation (Admin → Email Marketing)

Imports advocate contacts from one Google Sheet, keeps consent, queues, logs and suppressions in the database, and sends two daily queues (new emails 10:00 IST, reminders 15:00 IST) plus an 8:00 PM report, through an approved provider (Brevo). It lives inside the existing admin console (`admin.html`), the existing Supabase project and the existing super-admin login. Nothing else in Legal Staff was changed except one line in `directory.html` (see "Conversion tracking").

**Sending is OFF until you switch it on.** Out of the box `SYSTEM_ENABLED=false`, `LEGAL_APPROVAL=false`, `PROVIDER_APPROVED=false`, `DRY_RUN=true`, and all three templates are inactive.

## What is where

| Piece | File |
| --- | --- |
| Database (12 required tables + `email_import_runs`, `email_job_runs`), SQL functions, seed templates, 5-minute scheduler job | `supabase/migrations/0024_email_marketing.sql` |
| Rules (eligibility gate, templates, time, tokens, provider mapping) | `supabase/functions/_shared/email-logic.js` |
| Backend: Sheets import, planner, sender, webhooks, unsubscribe, admin API | `supabase/functions/email-marketing/index.ts` |
| Admin screens (11 submenus) | `admin-email.js`, loaded by `admin.html` |
| Public unsubscribe page | `unsubscribe.html` |
| Click / registration attribution on the directory | `static/email-attribution.js` |

## How a contact becomes sendable

1. The sheet is imported. Every new contact is `consent_status=UNKNOWN`, `first_email_status=BLOCKED`. **Importing never makes anyone sendable.** A re-import never unblocks a contact.
2. A contact becomes `ELIGIBLE` only when a marketing consent is recorded with a source, a date and an **evidence reference**, **and** the email is verified (`consent_verified_at`). Ways to record one: the contact page → *Record consent*, or optional `consent_*` columns in the sheet. Sheet consent is honoured only if source + date + evidence are all present and the source does not look like a public listing (public, directory, website, scrape, bar council, google, justdial, indiankanoon); anything else stays blocked.
3. Before **every** send (planning, and again right before each message, on freshly read data) the gate checks: documented marketing consent · verified email · legal approval · provider approved and configured · not unsubscribed · not on the suppression list · not hard-bounced · not a spam complainant · not registered/paid · this campaign not already sent · template active · automation enabled · emergency stop off. A reminder additionally needs: first email sent · due date reached · fewer than `MAX_REMINDERS` sent · the right step (reminder, then final reminder).
4. Marketing consent and essential transactional permission are separate (`email_consents.purpose`). This module only ever sends marketing mail.

Daily limits are caps, not permission: a queue sends *up to* its cap from contacts that pass the gate, and stops at the cap even across repeated runs.

## Go-live runbook (in order)

1. **Legal.** Get the legal opinion on the directory campaign model and on who may be emailed. Keep it on file.
2. **Provider.** Create the Brevo account, add and authenticate your sending domain (SPF, DKIM, DMARC), get Brevo's approval for this use.
3. **Deploy** (below) and set the secrets.
4. **Admin → Email Marketing → Automation Settings → Email provider:** save the sender (an address on your own domain; Gmail etc. are refused) and press *Check SPF, DKIM, DMARC*. The check is indicative; confirm in Brevo.
5. **Google Sheets Integration:** connect, map columns, preview, import. Contacts arrive BLOCKED.
6. Record consents for the contacts you are entitled to email (or import them with documented evidence). Press *Run dry-run simulation* and read who would be selected and why others are rejected.
7. **Approvals.** In Automation Settings tick `LEGAL_APPROVAL` and type where it is documented; tick `PROVIDER_APPROVED` likewise. Activate the templates (only possible after legal approval). Tick `SYSTEM_ENABLED` (refused unless both approvals and a configured provider exist). With `DRY_RUN` still on, the schedule runs as a simulation: check the *Recent scheduled jobs* panel.
8. Untick `DRY_RUN`. The overview banner turns green only when every condition is met. The next 10:00 IST tick queues and sends.

Withdrawing either approval switches automation off and deactivates all templates. **Emergency stop** (overview or settings) halts all sending on the next check; queued mail is held, not sent. It does not need any other setting.

## Deploy

```bash
# 1. database, migrations 0024 to 0027 (0024 also schedules the 5-minute job; check the project URL at the bottom of the migration matches yours)
supabase db push          # or run supabase/migrations/0024_email_marketing.sql in the SQL editor

# 2. function (JWT verification OFF: it checks every caller itself)
supabase functions deploy email-marketing --no-verify-jwt
supabase functions deploy upi-pay --no-verify-jwt     # redeploy: it now also confirms the Rs 49 directory listing
supabase functions deploy listing-razorpay --no-verify-jwt   # Razorpay for the Rs 49 listing

# 3. secrets
supabase secrets set BREVO_API_KEY=... BREVO_WEBHOOK_SECRET=... EMAIL_TOKEN_SECRET=... GOOGLE_SERVICE_ACCOUNT_JSON="$(cat sa.json)"
```

The static files (`admin.html`, `admin-email.js`, `unsubscribe.html`, `static/email-attribution.js`, `directory.html`) deploy with the site as before. `https://legalstaff.in/unsubscribe` works through the site's clean URLs.

**Google (read-only service account).** Google Cloud → enable the Google Sheets API → create a service account → create a JSON key → put it in `GOOGLE_SERVICE_ACCOUNT_JSON` → share the spreadsheet with the account's `client_email` as *Viewer*. The app only requests the `spreadsheets.readonly` scope. (A service account was chosen over per-admin OAuth so scheduled syncs keep working without anyone signed in.)

**Brevo webhooks.** Brevo → Transactional → Settings → Webhooks → add `https://<project>.supabase.co/functions/v1/email-marketing?action=webhook`, events: delivered, hard bounce, soft bounce, blocked, invalid, spam, unsubscribed, clicked, error; authentication: *Bearer token* = `BREVO_WEBHOOK_SECRET`. Brevo does not sign webhook bodies, so the shared secret in the Authorization header (compared in constant time) is the verification. Opens are ignored on purpose.

**Scheduler.** Migration 0024 schedules `legal-staff-email-tick` every 5 minutes (pg_cron + pg_net, authenticated with the Vault `cron_secret` from migration 0003). The tick decides what is due from the admin-set times, so changing a time needs no redeploy. Each job takes a unique key (`plan_new:2026-11-18`) in `email_job_runs`, so two workers cannot run the same job; each queue row is claimed atomically before sending. If you prefer Google Apps Script for orchestration, a time trigger that POSTs `{"action":"tick"}` with header `x-cron-secret` does the same; do not run both.

## Environment variables (function secrets)

| Name | Required | Purpose |
| --- | --- | --- |
| `BREVO_API_KEY` | to send | Provider API key. Server-side only, never returned by any endpoint (the UI shows only "set / not set") |
| `BREVO_WEBHOOK_SECRET` | for webhooks | Bearer secret Brevo sends on every webhook call |
| `EMAIL_TOKEN_SECRET` | yes (32+ chars) | Signs unsubscribe and attribution links. Rotating it breaks links already emailed |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | for Sheets | Service-account key (JSON) |
| `CRON_SECRET` | optional | Scheduler secret; the Vault `cron_secret` also works |
| `EMAIL_BATCH`, `EMAIL_SEND_DELAY_MS` | optional | Sends per tick (25) and pacing (150 ms) |
| `BREVO_API_BASE`, `GOOGLE_SHEETS_API_BASE` | tests only | Point the function at a mock |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase. Settings (limits, times, approvals) live in the database, not in environment variables.

## Unsubscribe and suppression

Every email carries `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058, pointing at the function) and an unsubscribe link in the body that opens `/unsubscribe`. That page shows the masked address and unsubscribes only when the person presses the button, so mail scanners that open links do not unsubscribe anyone. The one-click POST unsubscribes at once. Unsubscribing: adds the suppression row, cancels anything queued, withdraws consent, stops reminders. Hard bounces, invalid addresses and spam complaints (webhook) suppress the same way and **cannot be lifted**. An unsubscribe can be lifted only with a documented fresh-permission reference; the contact returns to `UNKNOWN`/`BLOCKED` until a new consent is recorded. A consent cannot be recorded for a suppressed address.

## Conversion tracking

* Links in emails carry `utm_source=legalstaff_email`, `utm_medium=email`, `utm_campaign=<campaign code>`, `utm_content=step_N` and a signed `ls_t` token (contact + campaign).
* `static/email-attribution.js` (loaded on `/directory`) records one click per contact and campaign and remembers the token for 30 days; `startApply()` in `directory.html` reports `registration_started`. Only the token is sent; no cookie.
* **Registration**: a database trigger on `directory_applications` attributes an application whose email matches a contact (`registration_completed`; `profile_verified` when an admin verifies it). This stops reminders.
* **₹49 payment**: migration `0025_email_payment_hook.sql` adds a trigger on `public.payments`: when a row becomes `paid` with `amount_paise = 4900`, the payer's email (from `auth.users`) is matched to a contact, `payment_success` is recorded against the campaign last sent to them, the contact is marked paid and reminders stop. It is idempotent per payment. **Limits:** this repo still has no dedicated ₹49 directory-listing checkout, so the hook only fires for ₹49 payments recorded in `payments` (which also requires a firm, plan and cycle); a promo that brings another plan to exactly ₹49 would match too. A future listing checkout that writes elsewhere should call `public.email_record_conversion(email, 'payment_success', payment_id, '{"amount_paise":4900}')` itself.
* Attribution is last-campaign-sent. Opens are never counted.

## Security notes

* All 14 tables have row level security enabled with no policies and no grants to `anon`/`authenticated`; only the function (service role) touches them, after checking `super_admins` and a confirmed email on every call. The audit log is append-only (trigger).
* Secrets only in function secrets. Webhook secret and tokens are compared in constant time. Provider and Google error text is scrubbed of keys before it is stored or returned.
* Rate limiting is **per function instance** (in memory): it slows abuse but is not a global quota. Put Supabase/Cloudflare rate limits in front for a hard limit.
* Backup and recovery: the data is in the Supabase project; enable Point-in-Time Recovery (or daily backups) for the project. Contacts can always be rebuilt from the sheet, but consent records, suppressions and logs cannot: they exist only in this database, so back them up.
* The CSV export neutralises spreadsheet formulas. "Excel" export is an XML Spreadsheet 2003 `.xls` file that Excel opens directly (a true `.xlsx` needs a library the site does not ship).

## Testing report

| Command | Result when run |
| --- | --- |
| `node tests/email-logic.test.mjs` | 50 passed |
| `node tests/email-engine.test.mjs` | 65 passed |
| `node tests/directory-pay.test.mjs` | 16 passed |
| `node tests/razorpay.test.mjs` | 19 passed |
| `bash tests/email-db/run.sh` | all database checks passed (migration applies and re-applies on PostgreSQL 16) |

The engine test runs the real function code against an in-memory database, a local Brevo mock and a local Google Sheets mock holding 10,000 rows. The database test runs the real migration on PostgreSQL 16. The admin pages and the unsubscribe page were also loaded in a headless browser against canned data (no JavaScript errors; desktop and 390 px mobile layouts).

**Not tested, and why you must test them yourself before relying on them:** a real Brevo send, Brevo's real webhook payloads and header behaviour, a real Google service-account sheet, real DNS for the domain check, the pg_cron/pg_net schedule on your project, delivery to real inboxes (spam placement), and the SQL functions through the real PostgREST/RPC layer (the engine test re-implements them in memory; they are tested separately on real PostgreSQL). Do one supervised end-to-end run with your own addresses before enabling production.

### Acceptance tests

| # | Requirement | Evidence |
| --- | --- | --- |
| 1 | Google Sheets imports correctly | engine: connect, preview, import, history, failure and empty-sheet errors |
| 2 | 10,000 contacts deduplicated | engine: 10,001 rows → 9,500 contacts, 500 duplicates, 1 invalid; db: 10,000 rows → 9,000 unique |
| 3 | Public-directory contacts stay blocked | db + engine: all imported UNKNOWN/BLOCKED; re-import never unblocks; public-looking consent sources ignored |
| 4 | Valid permission recognised | db + engine: consent with evidence → ELIGIBLE, audit row written; unverified stays blocked |
| 5 | First-email queue works | engine: 100 queued and sent in batches at 10:00 IST |
| 6 | Reminder scheduling works | engine: due after 5 days, reminder then final reminder, none after two |
| 7 | No duplicate email | engine: concurrent ticks, repeated ticks, (recipient, campaign) never twice; db: unique constraints |
| 8 | Unsubscribe suppresses immediately | engine + db: link, one-click POST, queued mail skipped, consent withdrawn |
| 9 | Hard bounces and complaints suppressed | engine + db: webhook → suppression, never selected again, cannot be lifted |
| 10 | Registration stops follow-ups | engine + db: reminder date cleared, no reminder sent |
| 11 | ₹49 payment attribution | engine + db: `email_record_conversion` attributes to the last campaign; payment trigger in migration 0025, tested on PostgreSQL; no dedicated ₹49 checkout exists in this repo |
| 12 | Daily limits enforced | engine: 100 cap holds across ticks with 50 more eligible |
| 13 | Pause immediately | engine: emergency stop halts and holds the queue; settings off/DRY_RUN on stop sending |
| 14 | Dashboard matches logs | engine: card values compared with counts of the underlying rows |
| 15 | Dry run sends nothing | engine: simulation and scheduled simulation queue and send nothing |
| 16 | Production needs every approval | unit + engine: enabling refused without both documented approvals; DRY_RUN, kill switch, unconfigured provider and unauthenticated domain each block |

Acceptance on the **live** system (real Brevo, real sheet) is not claimed here.


## The ₹49 directory listing checkout

Applicants pay **after applying**, from their application-status screen on `/directory` (a "Lifetime listing: ₹49, one-time" card with *Pay ₹49 by UPI*). No account is needed; the application reference **and** its enrolment number identify the applicant. Verification stays manual: **paying does not publish a profile.**

* It reuses your existing UPI engine (`functions/upi-pay`, `pay_settings`). Each order is ₹49.00 plus 0–99 paise, so the paise identify the payment. The amount pool is shared with plan orders so two open orders never have the same amount, and an amount shared by two open orders is never guessed.
* Confirmation is the same as for plans: Paytm order status, bank "credited" SMS, or bank alert email. The page polls and shows "Listing fee paid" within a minute or two.
* Data: `directory_payments` (migration 0026): one paid row per application, a bank reference can confirm only one payment. When a payment is confirmed the applicant's other open orders are deleted. A *second* payment for an already-paid listing is **not** confirmed (it appears in `upi_sms` as "payment was already confirmed"): refund it by hand.
* A paid listing is an email-campaign conversion (`payment_success`) through the applicant's email, so reminders stop.
* The card is hidden when UPI is not switched on in `pay_settings`, and for rejected applications.

**Moderator queue:** each application in Directory moderation shows a green "₹49 listing fee paid" badge when a paid `directory_payments` row exists (read through the existing platform-admin policy; an older database without the table just shows no badge). It does not change who can be verified. **Not included:** an invoice or receipt email.

### Razorpay (second way to pay the ₹49)

`functions/listing-razorpay` + migration 0027 add **card, netbanking, wallet and UPI through Razorpay Checkout** next to the manual UPI QR. The card on `/directory` shows both buttons when both are on, and hides a way that is off. Razorpay is used **only for this listing fee**; plan payments stay UPI-only (Razorpay was removed for plans in migration 0014).

1. Razorpay Dashboard → API Keys → generate a key pair. Set **function secrets** (never in the repo or `config.js`): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`. Only the key id is ever sent to the browser.
2. Dashboard → Webhooks → add `https://<project>.supabase.co/functions/v1/listing-razorpay?action=webhook`, secret = `RAZORPAY_WEBHOOK_SECRET`, events `payment.captured` and `order.paid`. The webhook is what confirms a payment when the applicant closes the page early. Keep payment capture on **automatic** in the Razorpay settings (an authorised-only payment is captured by the server at verify time, but the webhook ignores it).
3. Use `rzp_test_` keys first and pay with Razorpay's test cards; then swap to live keys.

How it is made safe: the server creates the order at exactly ₹49.00; after Checkout it verifies the signature (HMAC-SHA256 of `order_id|payment_id`), then **reads the payment from Razorpay** and accepts it only for that order, ₹49, INR, captured; the browser's word is never enough. A signature or webhook that fails verification changes nothing. A payment for an already-paid listing (for example paid by UPI too) is **not** confirmed: its payment id is stored on the leftover row (`status='created'` with a `gateway_payment_id`), so you can find it and refund it in the Razorpay dashboard. Razorpay's fee (around 2 % plus GST at the time of writing: check your plan) comes out of the ₹49.

**Not included:** an invoice or receipt email (Razorpay emails its own receipt if enabled in its settings; billing here is built around firm plans), automatic refunds, and a way to pay by something other than UPI/Razorpay. Not tested against real Razorpay (only a local mock): do one live ₹49 payment before announcing.

Tests: `node tests/razorpay.test.mjs` (19 checks: signature rules, forged and mismatched payments, capture, webhook, duplicates, switched off, key never leaked) and the 0027 checks in `bash tests/email-db/run.sh`.

Tests: `node tests/directory-pay.test.mjs` (16 checks, real `upi-pay` code against the in-memory database; no real UPI, bank or Paytm) and the migration 0026 checks in `bash tests/email-db/run.sh`. The pay card was also exercised in a headless browser against a mocked function.

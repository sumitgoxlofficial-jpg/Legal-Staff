# Legal Staff backend (Supabase)

## What is here

| Path | Purpose |
| --- | --- |
| `migrations/0001_core.sql` | Tables, row level security and sign-in functions |
| `migrations/0002_storage.sql` | Private `documents` bucket and its access rules |
| `migrations/0003_schedule.sql` | Daily 7:30 AM IST briefing job |
| `migrations/0007_drive.sql` | Encrypted Google Drive storage: connected accounts, the master key in Vault, the nightly 2:30 AM IST backup job |
| `migrations/0006_trial.sql` | 7-day free trial, read-only workspace once the trial or paid period ends, members capped by plan |
| `functions/notify` | Email (Resend) and WhatsApp (Meta Cloud API) briefings, court-record alerts and reminders, and free-trial reminder emails to firm owners 3 days and 1 day before the trial ends and when it has ended (deploy with JWT verification off; it checks the caller itself) |
| `migrations/0026_directory_membership.sql` | Directory membership: applications belong to a Google account, profile photo, one-time Rs 49 lifetime listing fee (`directory_orders`, `paid_at`), the advocate's lead inbox. A profile is public only when verified **and** paid; existing verified profiles are grandfathered |
| `migrations/0022_court_intelligence.sql` | Court-record engine: provider registry and coverage, verified case records, change snapshots, append-only audit, API usage, cost and budget, job queue with dead-letter state, Vault-held provider key, the 6-hourly sync job |
| `functions/court-sync` | The court-record engine: official-portal links, reuse of verified records and a shared cache, the paid eCourtsIndia provider as fallback, budget control, duplicate-request block, change detection, scheduler and the administrator actions. Deploy with JWT verification off; it checks every caller itself |
| `functions/_shared/court-logic.js` | The engine's pure logic (also unit-tested). Deploy `functions/` as a whole so `court-sync` can import it |
| `migrations/0024_whatsapp_cloud.sql` | WhatsApp Cloud API connection: settings row, message and delivery log, opt-outs (hashed), API error history, append-only audit log, Vault access functions (service role only), 6-hourly health check |
| `functions/whatsapp` | Admin › Settings › Integrations › WhatsApp API: save credentials (kept in Vault), test the connection against Meta, send a template test message, Meta webhook (verify token and `X-Hub-Signature-256`), token and webhook health, alert emails (deploy with JWT verification off) |
| `functions/_shared/whatsapp-logic.js` | Its pure logic (also unit-tested), also used by `notify` |
| `functions/court-status` | Older single-CNR lookup. The app no longer calls it (everything goes through `court-sync`); it can be removed |
| `functions/auth-email` | Supabase Auth "Send Email" hook: sign-in codes, sign-up confirmations, invites, email changes and security notices in the Legal Staff design, sent through Resend (deploy with JWT verification off; it checks the hook signature) |
| `functions/ai` | Real AI for AI Case Brain, AI Legal Research and AI Drafting Studio through Groq; picks the best model from Groq's live list; counts AI credits per firm per month by plan (deploy with JWT verification off; it checks the caller itself) |
| `functions/upi-pay` | Pay by UPI straight to the operator's UPI ID, no gateway: creates orders with a unique amount, confirms them automatically by Paytm for Business order status, bank 'credited' SMS from an SMS-forwarder phone, or forwarded bank alert emails, applies promo codes, then activates the plan (deploy with JWT verification off; it checks every caller itself) |
| `functions/upi-pay` (directory) | Also takes the Rs 49 directory listing fee: actions `dir_create` / `dir_status`, confirmed by the same Paytm / SMS / email routes as plan payments. Redeploy it after applying migration 0026 |
| `functions/billing` | Invoices for plan payments: numbers them, emails the PDF to the buyer, lists, downloads and re-sends them (deploy with JWT verification off) |
| `functions/drive` | Encrypted storage in each user's own Google Drive: uploads and nightly backups, encrypted with AES-256-GCM (a key per firm) and kept in the Drive's hidden app folder (deploy with JWT verification off; it checks the caller itself) |

## Current project

Project `legal-staff` (`ihbbfgzzbpxznbpspyam`, Mumbai). Migrations 0001 to 0010 are applied and `config.js` points at it.

## Set-up, in order

1. Create the Supabase project and apply the three migrations in order.
2. Deploy the five functions.
3. **Authentication → Providers → Google:** enable it and enter the Google OAuth Client ID (and secret). This is the same Client ID as `googleClientId` in `config.js`.
4. Put the project URL and publishable key in `config.js` (`supabaseUrl`, `supabaseKey`).
5. Add function secrets (Edge Functions → Secrets) for the services you use:

| Secret | For |
| --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email, e.g. `Legal Staff <briefing@yourdomain.in>` on a verified domain |
| `APP_URL` (optional) | Site address used in trial reminder links; defaults to `https://legalstaff.in` |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE` | WhatsApp. The template must be approved and have one body variable |
| `WHATSAPP_ALERT_TEMPLATE` (optional) | A second approved template (one body variable) for court-record alerts. Without it alerts use `WHATSAPP_TEMPLATE`. Also `WHATSAPP_TEMPLATE_LANG` (default `en`) |
| `COURT_API_URL`, `COURT_API_KEY` | Court data through `court-sync`. `COURT_API_URL` is the provider's base address (default `https://webapi.ecourtsindia.com`). The key can instead be stored from the admin panel (Vault), which needs no redeploy. Full list below |
| `SEND_EMAIL_HOOK_SECRET` | The secret Supabase generates under Authentication › Hooks › Send Email (format `v1,whsec_...`) |
| `GROQ_API_KEY` (or Vault secret `groq_api_key`) | AI. Optional `GROQ_MODEL` picks a specific Groq model |
| `CRON_SECRET` | Lets the daily job call `notify` |
| `GOOGLE_CLIENT_SECRET` | Google Drive storage: the client secret of the same OAuth client as `googleClientId`. In Google Cloud, also enable the Google Drive API and add the `drive.appdata` scope to the OAuth consent screen |

A service whose secrets are missing is skipped and the app says it is not connected.

## Access model

- Each firm's data is visible only to its active members. The person who creates a firm is its owner; only the owner invites members, changes roles and buys a plan.
- An invited member joins by signing in with the Google account whose email was invited.
- Subscriptions and payments are written only by the functions, never from the browser. The one exception is `start_trial()`, which the owner calls to start the firm's single 7-day free trial.
- Plans: every firm starts with a 7-day free trial of the plan it chooses. When the trial or a paid period ends, practice records and files can still be read and deleted but not added or changed (`firm_access()`), until a plan is paid for. Members are capped at 1 (Solo), 3 (Professional) or 15 (Firm). A payment made during the trial starts after the trial's last day.
- The first person to create a firm becomes the platform administrator, who verifies public directory applications. Add others in the `platform_admins` table.
- The public directory can submit applications, enquiries, reports and contact requests without signing in, and can read only verified profiles.

## WhatsApp Cloud API (Meta, direct)

Set up by a Legal Staff administrator in **Admin → Settings → Integrations → WhatsApp API** (`admin.html#settings/integrations`). The official Meta WhatsApp Business Platform is used directly: no Brevo, Twilio, Interakt, WATI or other paid provider. The page never contains a token: credentials are saved server-side and are not returned by any call.

### Calls (`functions/whatsapp`, also reachable as `/api/whatsapp/...` through the `vercel.json` rewrite)

| Call | What it does |
| --- | --- |
| `GET /connection/status` | Saved settings, which secrets exist (never their values), token and webhook health, API error history, recent messages, audit log |
| `POST /connection/save` | IDs, Graph version and, when supplied, App Secret, System User token, webhook verify token. A blank secret keeps the stored one; a new one replaces it (rotation) |
| `POST /connection/test` | Against Meta: token validity and expiry (`debug_token`), both permissions, the WABA, the Phone Number ID belongs to that WABA, the token can read the number, the app is subscribed, webhook fields |
| `POST /connection/refresh-token` | Re-reads token validity, expiry and scopes |
| `POST /connection/disconnect` | `{ confirm: true }` deletes the stored credentials from Legal Staff. It makes no call to Meta and does not touch the number |
| `GET /phone-number`, `GET /templates` | Live number details and approved templates from Meta |
| `POST /send-test` | One approved template message to one number. Result is "accepted" or "rejected" with Meta's message ID or error. It is marked delivered only when Meta's delivery webhook says so |
| `POST /webhook/subscribe` | `{ confirm: true, override_callback?: true }` subscribes the app to the WABA |
| `GET/POST /webhook` | Meta's callback. GET: verify token. POST: `X-Hub-Signature-256` is checked with the App Secret, then delivery, read and failure statuses update messages Legal Staff sent. Incoming messages are not stored and there is no inbox; only a STOP / START reply is acted on (the number is kept as a hash) and `notify` skips opted-out numbers |
| `POST /health` | Scheduled (every 6 hours, `x-cron-secret`): re-checks the connection and emails the administrators when the token is invalid or about to expire, or the connection fails (at most once a day) |

Only users listed in `public.super_admins` with a verified email can use the admin calls.

### Environment variables and secrets

| Name | Where | For |
| --- | --- | --- |
| `wa_app_secret`, `wa_access_token`, `wa_verify_token` | **Vault** (written by the page, encrypted at rest) | Meta App Secret, System User access token, webhook verify token. Never set these by hand, never as function secrets |
| `RESEND_API_KEY`, `EMAIL_FROM` | function secrets (already used elsewhere) | Alert emails to the administrators |
| `APP_URL` (optional) | function secret | Link in alert emails; defaults to `https://legalstaff.in` |
| `WHATSAPP_GRAPH_URL` | tests only | Points the function at a mock of Meta's API. Do not set it in production |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE`, `WHATSAPP_TEMPLATE_LANG` | function secrets (existing) | The number `notify` already uses. Unchanged. If `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` are set, `notify` keeps using them; only when they are not set does it use this connection (once it is Connected). `WHATSAPP_TEMPLATE` is needed either way |

### Deploy

1. Apply `migrations/0024_whatsapp_cloud.sql` (needs `pg_cron`, `pg_net` and Vault, and the `cron_secret` Vault entry from migration 0003). Check the project address in the last statement.
2. Deploy `functions/` (so `whatsapp` and `notify` can import `_shared/whatsapp-logic.js`), then deploy `whatsapp` with JWT verification **off** (Meta's calls carry no Supabase token; the function checks every admin call itself).
3. Do the Meta steps below, then open the page and save, Test connection, subscribe, send a test.

### Meta steps only a person can do

1. Meta Developer Apps (`developers.facebook.com/apps`): select the Legal Staff app. WhatsApp → API Setup: note the App ID (App settings → Basic), the App Secret, the WhatsApp Business Account ID and the Phone Number ID.
2. Meta Business Settings (`business.facebook.com/settings`) → Users → System Users: create a System User, assign the WhatsApp Business Account as an asset with full control, and generate a token for the Legal Staff app with `whatsapp_business_messaging` and `whatsapp_business_management`. Paste it only into the masked field on the page.
3. In the Meta app → WhatsApp → Configuration set the callback URL shown on the page and the same verify token, and subscribe the `messages` field.
4. Create and get an approved message template (a business-initiated message must use one).
5. Until the business is verified and the app is live, Meta only lets you message numbers added as test recipients.

## Google Drive storage

Each user can connect their own Google Drive in Settings. From then on their uploads, and a nightly backup of each firm they
belong to, are saved in the Drive's hidden app-data folder: the files do not appear in Drive and only Legal Staff can read them.
Every file is encrypted on the server before it is sent to Google (AES-256-GCM, one key per firm derived from a master key
that migration 0007 generates in Vault), so Google holds only ciphertext. Google refresh tokens are stored encrypted the same
way. Teammates open each other's files through the app. Users who have not connected Drive keep using the `documents` bucket.
Losing the Vault key `drive_master_key` makes every Drive file unreadable: never delete or rotate it without re-encrypting.

## Pay by UPI (direct to your account)

Settings are one row in `public.pay_settings`: `upi_enabled`, `upi_id` (where customers pay), `payee_name`, `paytm_mid`
(Paytm for Business merchant ID, optional) and `sms_secret` (generated). When `upi_enabled` is true the plan checkout shows
**Pay by UPI**, the only way to pay. Each order gets a unique amount (0–99 paise above the price) so a payment can be matched
to exactly one order. Confirmation is automatic, by whichever comes first:

- **Paytm for Business:** with `paytm_mid` set and `upi_id` being the Paytm merchant UPI ID, the order number travels in the
  UPI link (`tr`) and is checked with Paytm's order status page while the customer waits, and every 2 minutes for 24 hours.
  This uses Paytm's unofficial status page, which Paytm may change.
- **Bank SMS:** an Android phone with the bank SIM runs an SMS-forwarder app that POSTs each SMS to
  `/functions/v1/upi-pay?action=sms&key=<sms_secret>`. A 'credited' SMS whose amount matches one open order confirms it;
  each bank reference (UTR) can confirm only one payment. Every SMS is kept in `public.upi_sms` with what happened to it.
- **Bank alert email:** the mailbox that receives the bank's 'credited' alerts forwards them (a mail filter) to the secret
  payments inbox `<pay_settings.email_inbox>@<your>.resend.app`; Resend's `email.received` webhook calls
  `/functions/v1/upi-pay?action=email&key=<sms_secret>`, and the function reads the mail with the full-access Resend key
  kept in Vault as `resend_read_key` (migration 0012). Only mail addressed to that inbox counts. Matched like the SMS.

### Invoices

`functions/billing` (deploy with JWT verification off). Every confirmed plan payment gets an invoice numbered
`LS/<financial year>/<0001>` in order (`public.invoices`, migration 0015), emailed to the buyer with the PDF attached and
listed in the app under Pricing → Your subscription (download or email again). No GST is charged. The business owner gets a
"New payment" email at `pay_settings.alert_email` (or the seller email) for every payment. The seller block printed on
invoices comes from `pay_settings`: `seller_name`, `seller_address`, `seller_state_code`, `seller_gstin`, `seller_pan`,
`seller_email`, `seller_phone`, `sac_code`.

### Promo codes

`public.promo_codes` (migration 0013, server only). A code takes `percent_off` and/or `amount_off` (rupees) off the price,
or sets `fixed_total` (paise; e.g. 100 = Rs 1 for any plan). No GST is added. Optional limits: `plans`, `cycles`,
`max_uses`, `once_per_firm` (default on), `starts_at`, `expires_at`, `active`. A code that makes the plan free switches it
on at once. Examples:

```sql
insert into public.promo_codes (code, percent_off) values ('LAUNCH20', 20);
insert into public.promo_codes (code, fixed_total, max_uses) values ('NEW100', 100, 50);
update public.promo_codes set active = false where code = 'NEW100';
```

## Court records (court-sync)

### What it does, in the order it works

1. **Official free sources.** No automated official source is used: the eCourts portals sit behind CAPTCHA, which is never bypassed. This step gives the user official portal links for manual verification (`official_manual`).
2. **What we already hold.** A matching record verified within the freshness window (default 24 hours), then a response cache shared by CNR (public records), cost nothing.
3. **The paid provider (eCourtsIndia).** Only when the data is missing or stale, a user asked for a fresh check, the provider's registered coverage includes the court, the circuit breaker is closed and the monthly budget allows it.
4. **Manual review.** The case is flagged and official links shown. Nothing is made up.

Schedule (admin-configurable): hearing within 3 days every 12 h, active cases every 24 h, inactive weekly, closed monthly, hearings soonest first. This is a schedule, not a guarantee that a newly published record is available straight away.

### Verification statuses

`VERIFIED` matched the registered identifiers and is fresh · `PENDING` not checked yet · `STALE` verified before, needs a fresh check · `FAILED` the provider or source failed · `MANUAL REVIEW` needs a person (no provider, unsupported court or identifier, no record found, or a record that did not match) · `PARTIAL` some requested fields were missing. An HTTP 200 alone is never "verified".

### Environment variables (function secrets)

| Variable | Default | Meaning |
| --- | --- | --- |
| `COURT_API_PROVIDER` | `ecourtsindia` | Provider key (only `ecourtsindia` is implemented) |
| `COURT_API_URL` | `https://webapi.ecourtsindia.com` | Provider base address |
| `COURT_API_KEY` | none | Provider key. Alternatively stored in Vault from the admin panel; the environment variable wins if both exist |
| `ENABLE_OFFICIAL_SOURCES` | `true` | Return official portal links |
| `ENABLE_PAID_FALLBACK` | `true` | Allow paid provider calls at all |
| `ENABLE_RESPONSE_CACHE` | `true` | Shared response cache |
| `ENABLE_DUPLICATE_REQUEST_BLOCK` | `true` | One identical request at a time |
| `ENABLE_SMART_REFRESH` | `true` | Send the cheap refresh call before reading when a hearing date has passed or a fresh check was requested |
| `MONTHLY_COURT_API_BUDGET` | admin panel value (₹1,000) | Rupees per IST month; overrides the panel when set |
| `STOP_API_ON_BUDGET_LIMIT` | `true` | Refuse paid calls once the budget is used (an administrator can authorise a time-limited override) |
| `COURT_API_TIMEOUT_MS` | `15000` | Per-request timeout (3,000 to 30,000) |
| `COURT_SYNC_BATCH` | `40` | Cases checked per scheduled run |

`functions/court-sync/.env.example` lists them. Never put the key in `config.js`, the browser, GitHub or a log: the function strips keys and bearer tokens from everything it logs or returns, and `tests/court-engine.test.mjs` checks this.

### Deploy

1. Apply `migrations/0022_court_intelligence.sql` (needs the `pg_cron`, `pg_net` and Vault set-up from migrations 0003 and 0007). Check the project address in the last statement matches your project.
2. Deploy the `functions/` folder, then `court-sync` with JWT verification off.
3. Set the secrets above. Either set `COURT_API_KEY`, or sign in as a platform administrator, open **Court Intelligence → Provider administration → Replace API key**: the key is checked with the provider before it is stored.
4. In the same panel set the monthly budget and the provider rate plan (pay-as-you-go ₹1.50, enterprise ₹0.50 per case-detail call as of October 2026: check the provider's price list) and press **Check provider**.
5. The 6-hourly job (`legal-staff-court-sync`) then checks due cases. A firm's members can also press **Check due cases** or **Verify now**.

### Key rotation

Rotate from the admin panel (Vault) with no code change or redeploy; if you use the environment variable instead, change the secret and the next call uses it. A wrong key is rejected and the old one is kept.

### What is and is not covered

Coverage comes from the provider's published list (Supreme Court, High Courts, district courts, and 14 tribunal and commission types) and is recorded in `provider_capabilities`. **Tested live (17 Nov 2026): case detail for one Delhi High Court case and one Delhi district-court case, plus authentication, the free calls and the error codes** (`verified_at` is set only for those; migration 0023). Refresh, tribunals, the Supreme Court and other states are **not** tested yet: see `tests/README.md`. Cases registered only by case, filing or diary number are routed to manual review, because the provider looks cases up by CNR (tribunal CNRs are minted by the provider). Public court data is information, not a certified copy.

## WhatsApp and email court-record alerts

When the court check (`court-sync`) finds a change, the hourly `notify` job tells the advocates on that case. Changes it reports: a moved hearing date, a new order or judgment, a changed status or disposal, a transfer. Rules:

- **Who:** the advocates assigned to the case (`case.team`); a case with nobody assigned goes to the firm owner.
- **How many messages:** one WhatsApp and one email per person per run, covering every change since their last message (trimmed to fit, with "+N more in Legal Staff").
- **When:** 7:00 AM to 9:59 PM IST only. Changes found overnight wait for the morning.
- **Once:** each change is sent once per person and channel (recorded in `notifications` as `court:<event id>`). A failed send is retried on later runs, at most 3 times.
- **Window:** changes older than 48 hours are not sent.
- **Switches:** each person has Settings › Notifications › Court-record alerts, and the existing WhatsApp and Email switches. Default is on.
- The email says plainly that the alert comes from the court-data check, not from the court's own notice, and points to the official portal.

### Set up WhatsApp (Meta Cloud API)

1. In Meta Business, create a WhatsApp Business account and a phone number; note the **phone number ID** and create a permanent **access token** (System User).
2. Create a message template, category **Utility**, language English, one body variable. Suggested text for alerts: `Legal Staff court record update: {{1}}`. For the morning briefing: `Legal Staff morning briefing: {{1}}`. Meta reviews each template, usually within hours. Variables cannot contain line breaks, so the app joins lines with ` | ` and ` ; `.
3. Set the function secrets `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE` (briefing) and, optionally, `WHATSAPP_ALERT_TEMPLATE`.
4. Each person adds their mobile in Settings › Your profile.
5. Recipients must be reachable on WhatsApp. Business-initiated messages outside a 24-hour customer window must use an approved template, which is what this does. Meta bills per conversation; check their current price list.

Without the secrets nothing is sent and the app says WhatsApp is not connected; email alerts still go out if Resend is set up. The function logic is tested with a fake WhatsApp and email endpoint (`tests/notify-court-alerts.test.mjs`); a real send has **not** been tested because no Meta account is connected yet.

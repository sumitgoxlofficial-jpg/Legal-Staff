# Legal Staff backend (Supabase)

## What is here

| Path | Purpose |
| --- | --- |
| `migrations/0001_core.sql` | Tables, row level security and sign-in functions |
| `migrations/0002_storage.sql` | Private `documents` bucket and its access rules |
| `migrations/0003_schedule.sql` | Daily 7:30 AM IST briefing job |
| `migrations/0007_drive.sql` | Encrypted Google Drive storage: connected accounts, the master key in Vault, the nightly 2:30 AM IST backup job |
| `migrations/0006_trial.sql` | 7-day free trial, read-only workspace once the trial or paid period ends, members capped by plan |
| `functions/notify` | Email (Resend) and WhatsApp (Meta Cloud API) briefings and reminders, and free-trial reminder emails to firm owners 3 days and 1 day before the trial ends and when it has ended (deploy with JWT verification off; it checks the caller itself) |
| `migrations/0022_court_intelligence.sql` | Court-record engine: provider registry and coverage, verified case records, change snapshots, append-only audit, API usage, cost and budget, job queue with dead-letter state, Vault-held provider key, the 6-hourly sync job |
| `functions/court-sync` | The court-record engine: official-portal links, reuse of verified records and a shared cache, the paid eCourtsIndia provider as fallback, budget control, duplicate-request block, change detection, scheduler and the administrator actions. Deploy with JWT verification off; it checks every caller itself |
| `functions/_shared/court-logic.js` | The engine's pure logic (also unit-tested). Deploy `functions/` as a whole so `court-sync` can import it |
| `functions/court-status` | Older single-CNR lookup. The app no longer calls it (everything goes through `court-sync`); it can be removed |
| `functions/auth-email` | Supabase Auth "Send Email" hook: sign-in codes, sign-up confirmations, invites, email changes and security notices in the Legal Staff design, sent through Resend (deploy with JWT verification off; it checks the hook signature) |
| `functions/ai` | Real AI for AI Case Brain, AI Legal Research and AI Drafting Studio through Groq; picks the best model from Groq's live list; counts AI credits per firm per month by plan (deploy with JWT verification off; it checks the caller itself) |
| `functions/upi-pay` | Pay by UPI straight to the operator's UPI ID, no gateway: creates orders with a unique amount, confirms them automatically by Paytm for Business order status, bank 'credited' SMS from an SMS-forwarder phone, or forwarded bank alert emails, applies promo codes, then activates the plan (deploy with JWT verification off; it checks every caller itself) |
| `functions/billing` | Invoices for plan payments: numbers them, emails the PDF to the buyer, lists, downloads and re-sends them (deploy with JWT verification off) |
| `migrations/0024_esign.sql` | Electronic signing: settings, requests, signers, fields, the hash-chained audit trail, credit wallets and ledger, provider usage, the private `esign` bucket, Vault keys, the 15-minute sweep and nightly backup jobs |
| `functions/esign` | Electronic signing in the AI Drafting Studio and the signing page (`sign.html`): prepare, send, remind, cancel, status, download, verify; the signer's link, email code, signature and decline; the schedule; the Super Admin controls. Deploy the whole `functions/` folder (it imports `_shared/esign-logic.js`), with JWT verification off |
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

## Electronic signing (functions/esign)

Reached only from the Drafting Studio toolbar (Prepare for Signature, Send for Signature, View Signing Status) and from the signer's link `https://legalstaff.in/sign#<token>`. There is no separate signing module.

### What signature this makes (and does not)

The built-in provider makes a **simple electronic signature**: a typed or drawn signature, with the signer's consent, a one-time code sent to their email, and a hash-chained audit trail. It is **not Aadhaar eSign and not a Digital Signature Certificate (DSC)**, and the app, the emails and the certificate say so. Aadhaar eSign, DSC and other regulated methods must come from an authorised provider (an eSign Service Provider or a certifying authority) through an adapter in `PROVIDERS` in `functions/esign/index.ts`; none is installed. Limits shown to lawyers before they send: documents in the First Schedule to the IT Act, 2000 (will, trust, power of attorney, sale of immovable property) cannot be e-signed; affidavits, vakalatnamas and court filings may need wet ink or a DSC; stamp duty and registration are unaffected. This is information, not legal advice.

### Providers (replaceable)

| Provider | Status |
| --- | --- |
| `native` | Installed. No third-party cost except email. |
| `docuseal` (self-hosted) | **Evaluated, adapter not installed.** From its GitHub README (read when this was built): AGPLv3 with an additional term that the DocuSeal attribution stays in the user interface; "API and Webhooks for integrations" is listed among the free features; **embedded signing form, white-label, automated reminders, SMS identity verification, user roles, SSO and template-from-PDF/HTML APIs are listed as Pro (paid) features**. DocuSeal's own pricing and API pages could not be read, so the price of Pro, any per-document cloud price and whether Aadhaar eSign or DSC is supported are **not verified**. Do not assume production API or embedding is free: confirm the licence and price, then add an adapter. Never call a paid-only endpoint without a licence. |

An adapter must give: send a document with fields to named signers, report status, cancel, and return the signed PDF and its audit data. Provider credentials are stored write-only in Vault (`esign_provider_<name>`) from the admin panel; they never reach the browser.

### Set-up, in order

1. Apply `migrations/0024_esign.sql` (needs `pg_cron`, `pg_net`, Vault, and `cron_secret` from migration 0003). Check the project address in the last two statements.
2. Deploy `functions/` and `esign` with JWT verification off. Deploy `upi-pay` and `billing` again (signing credits use them).
3. Secrets: `RESEND_API_KEY` and `EMAIL_FROM` (links and codes are emailed; the Super Admin cannot switch signing on without them), `APP_URL` (default `https://legalstaff.in`). Optional `ESIGN_FONT_URL` and `ESIGN_FONT_BOLD_URL`: a Unicode TrueType font (for example Noto Sans, with Devanagari) so Hindi and other scripts appear in the signing copy; without it the PDF uses standard fonts, shows `₹` as `Rs.` and other non-Latin characters as `?`, and the lawyer is warned while preparing.
4. Sign in to `/admin` → **E-Signing**: switch signing on, set pricing, packs, free documents and limits. Nothing is priced by default and signing is off.

### Flow and states

Draft (no request) → Prepared for Signature → Sent → Viewed → Partially Signed → Completed; or Declined, Expired, Cancelled. Sequential signing invites the next order group when the earlier required signers have signed (optional signers never hold anyone up); parallel invites everyone at once. A required signer who declines ends the request and kills the other links. A link works until the request's expiry; the 15-minute job expires overdue requests, starts waiting signers and finishes any signed PDF that failed.

### Security

- Link tokens: 256-bit random, only the SHA-256 is stored; a reminder or re-invite replaces the token (the old link stops). Signers see nothing of the document until they enter the 6-digit code emailed to them (10 minutes, 5 tries, 30 s between sends; the Super Admin can switch this off). The session issued after the code lasts 2 hours.
- Documents (original and signed PDF) are encrypted with AES-256-GCM, one key per firm derived from a master key in Vault (`esign_master_key`), before they reach Storage. The `esign` bucket has no policies. **Losing that Vault key makes every stored signing document unreadable: never delete or rotate it without re-encrypting.**
- Firm isolation: the function takes the firm from a verified membership and filters every query by it; the tables also have row level security so members can read only their firm's rows, and never the token, code or signature columns.
- Audit trail: `esign_events` is append-only and hash-chained in the database (each row stores the hash of the previous one; updates and deletes are refused). "Verify integrity" re-hashes the stored PDFs and re-computes the chain. The signed PDF ends with a certificate listing the signers, consent, IPs, timestamps, the original document's SHA-256 and the chain head.
- Backup and recovery: the database is covered by Supabase backups; a nightly job keeps a second encrypted copy of each completed PDF under `backup/` in the bucket (Supabase Storage objects are not part of database backups). **Restore** (admin) rebuilds a lost original from the backup copy, or re-renders it from the stored snapshot and writes it only if the SHA-256 matches the recorded one.

### Billing

Super Admin settings: pricing `free` or `credits`, credits per document, credit packs (credits and price, set by the Super Admin), free documents per firm per month, one-time free trial documents, per-firm monthly document limit, per-firm override or block. A send uses this month's free documents first, then the one-time free ones, then credits; the charge is taken atomically (`esign_charge`) and returned if sending fails. The lawyer sees the charge before sending. Credits are bought by the firm owner by UPI like a plan (`upi-pay` action `esign_create`; confirmation, UTR matching and the invoice work as for plans; Razorpay was removed in migration 0014, so there is no card payment). Credits are also recorded in `esign_ledger`. Provider expense is the cost per document you enter for a provider, shown in **E-Signing → Provider usage and expenses**.

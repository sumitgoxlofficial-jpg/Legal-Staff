# Legal Staff backend (Supabase)

## What is here

| Path | Purpose |
| --- | --- |
| `migrations/0001_core.sql` | Tables, row level security and sign-in functions |
| `migrations/0002_storage.sql` | Private `documents` bucket and its access rules |
| `migrations/0003_schedule.sql` | Daily 7:30 AM IST briefing job |
| `migrations/0006_trial.sql` | 7-day free trial, read-only workspace once the trial or paid period ends, members capped by plan |
| `functions/razorpay-order` | Creates a Razorpay order at the server-side price |
| `functions/razorpay-verify` | Verifies the checkout signature and activates the plan |
| `functions/razorpay-webhook` | Activates the plan from Razorpay's webhook (deploy with JWT verification off) |
| `functions/notify` | Email (Resend) and WhatsApp (Meta Cloud API) briefings and reminders, and free-trial reminder emails to firm owners 3 days and 1 day before the trial ends and when it has ended (deploy with JWT verification off; it checks the caller itself) |
| `functions/court-status` | CNR lookup through a court-data provider |

## Current project

Project `legal-staff` (`ihbbfgzzbpxznbpspyam`, Mumbai). Migrations 0001 to 0006 are applied and `config.js` points at it.

## Set-up, in order

1. Create the Supabase project and apply the three migrations in order.
2. Deploy the five functions.
3. **Authentication → Providers → Google:** enable it and enter the Google OAuth Client ID (and secret). This is the same Client ID as `googleClientId` in `config.js`.
4. Put the project URL and publishable key in `config.js` (`supabaseUrl`, `supabaseKey`).
5. Add function secrets (Edge Functions → Secrets) for the services you use:

| Secret | For |
| --- | --- |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payments |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook (point it at `/functions/v1/razorpay-webhook`, events `payment.captured` and `payment.failed`) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email, e.g. `Legal Staff <briefing@yourdomain.in>` on a verified domain |
| `APP_URL` (optional) | Site address used in trial reminder links; defaults to `https://legalstaff.in` |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE` | WhatsApp. The template must be approved and have one body variable |
| `COURT_API_URL`, `COURT_API_KEY`, `COURT_API_HEADER` | Court data. The URL contains `{cnr}` |
| `CRON_SECRET` | Lets the daily job call `notify` |

A service whose secrets are missing is skipped and the app says it is not connected.

## Access model

- Each firm's data is visible only to its active members. The person who creates a firm is its owner; only the owner invites members, changes roles and buys a plan.
- An invited member joins by signing in with the Google account whose email was invited.
- Subscriptions and payments are written only by the functions, never from the browser. The one exception is `start_trial()`, which the owner calls to start the firm's single 7-day free trial.
- Plans: every firm starts with a 7-day free trial of the plan it chooses. When the trial or a paid period ends, practice records and files can still be read and deleted but not added or changed (`firm_access()`), until a plan is paid for. Members are capped at 1 (Solo), 3 (Professional) or 15 (Firm). A payment made during the trial starts after the trial's last day.
- The first person to create a firm becomes the platform administrator, who verifies public directory applications. Add others in the `platform_admins` table.
- The public directory can submit applications, enquiries, reports and contact requests without signing in, and can read only verified profiles.

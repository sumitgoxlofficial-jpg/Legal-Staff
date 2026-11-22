# Tests

Nothing here is deployed.

## Importing from other software

`node tests/import.test.mjs` runs the core of `app-import.js` under Node: CSV dialects, a real .xlsx built in the test (shared, inline and rich-text strings, sparse cells, date serials, two sheets), Indian date formats, times and amounts, column and kind guessing, JSON exports, linking clients, cases, hearings, tasks and invoices, duplicate skipping on a second import, and the plan's active-case limit.

## Court-record engine

| Command | What it proves |
| --- | --- |
| `node tests/court-logic.test.mjs` | Pure logic: CNR checks, capability registry, costs, schedule and priority, verification statuses, reading a provider answer, identifier matching, change detection, budget, error classes, circuit breaker, secret scrubbing. |
| `node tests/court-engine.test.mjs` | The real `supabase/functions/court-sync` code, run against an in-memory database and a **local mock** of the eCourtsIndia API that fails in every way: caching, shared cache, duplicate-request block, budget and override, wrong-CNR rejection, bad key, no credits, 429, 500, timeout, change detection, scheduler, permissions, admin actions, key rotation, secrets never in output. Needs `tsc` on the PATH. |
| `node tests/notify-court-alerts.test.mjs` | The real `notify` function for court-record alerts, against an in-memory database and a fake WhatsApp (Meta) and email (Resend) endpoint: who is told, one batched message per person, once per change, waking hours only, settings honoured, bounded retries, no secrets stored or sent in messages. It does not prove Meta accepts the template. Needs `tsc` on the PATH. |
| `bash tests/court-db/run.sh` | Migration `0022_court_intelligence.sql` on a real PostgreSQL 16 (Supabase pieces stubbed): re-runnable, atomic budget reserve, duplicate-claim lock, append-only audit, Vault key rotation, row level security. Needs PostgreSQL 16 binaries. |

## WhatsApp Cloud API

| Command | What it proves |
| --- | --- |
| `node tests/whatsapp-logic.test.mjs` | Pure logic: Graph error classification (token, permission, rate limit, template, recipient), webhook signature check, phone and template rules, delivery-status ordering ("accepted" is never "delivered"), STOP / START parsing, token expiry and health, alert throttling, secret scrubbing. |
| `node tests/whatsapp-engine.test.mjs` | The real `supabase/functions/whatsapp` code against an in-memory database and a **local mock of Meta's Graph API** that fails in every way: who may call, secrets never in any response, log or table, the connection checks, a send is never retried, delivery status only from correctly signed webhooks, opt-outs, rotation, disconnect makes no Meta call, health check and alert emails. Needs `tsc` on the PATH. |
| `bash tests/whatsapp-db/run.sh` | Migration `0024_whatsapp_cloud.sql` on a real PostgreSQL 16 (Supabase pieces stubbed): re-runnable, constraints, append-only audit log, Vault functions locked to the service role and to three names, row level security. |

**Not tested here:** Meta itself. The mock follows Meta's documented answers, but only a real token proves them. After saving real credentials, open Admin → Settings → Integrations → WhatsApp API and run **Test connection**, then **Send test message** to a number that is allowed to receive it, and check that the delivery webhook moves it to "delivered".

## Email marketing

| Command | What it proves |
| --- | --- |
| `node tests/email-logic.test.mjs` | Pure rules: the ten pre-send checks, reminders and caps, production switches, IST schedule, sheet mapping, templates, signed links, Brevo payload and event mapping, Google JWT, CSV safety, secret scrubbing. |
| `node tests/email-engine.test.mjs` | The real `supabase/functions/email-marketing` code against an in-memory database, a mock Brevo and a mock Google Sheets with 10,000 rows: import, consent, dry run, queues and caps, duplicates and concurrency, unsubscribe, bounces and complaints, reminders, kill switch, rate limits, attribution, dashboard totals, audit. Needs `tsc` on the PATH. |
| `bash tests/email-db/run.sh` | Migrations `0035_email_marketing.sql` and `0036_email_directory_fee_hook.sql` on a real PostgreSQL 16: re-runnable, import function at 10,000 rows, consent and suppression rules, conversions, append-only audit, row level security. |


Nothing here talks to the real Brevo, Google, UPI, Razorpay or a bank. See `docs/email-marketing.md` for what remains untested.

### Integration: what was tested against the real eCourtsIndia API

Run on 17 Nov 2026 with a real key (never stored in the repository), by hand with `curl`, then offline with the saved responses (anonymised copies are in `tests/fixtures/` and the unit tests read them):

| What | Result |
| --- | --- |
| Free calls with the key: `GET /api/partner/enums`, `GET /api/partner/search/capabilities` | HTTP 200. The second is what the app's "Check provider" and key rotation use. |
| Wrong key (`search/capabilities`) | HTTP 401, `error.code` `INVALID_TOKEN`: the app maps this to "the provider rejected the API key" |
| Malformed CNR | HTTP 400, `INVALID_CNR` (a bad CNR is not billed, and is sent to manual review) |
| `GET /api/partner/case/DLHC010001232024` (Delhi High Court, disposed) | HTTP 200 in 1.8 s. Read completely: parties, advocates, status, dates, order list. |
| `GET /api/partner/v2/search?...` then `GET /api/partner/case/DLSW020154072023` (Delhi South-West district court, pending) | HTTP 200. Read completely: next hearing date, 11 hearings, 11 orders, case number matching. |

What this found and fixed: there is **no case title** (built from the parties); the case number to match against is `registrationNumber` (the `caseNumber` field is an internal number); orders live in both `judgmentOrders` and `interimOrders`; the hearing history is `historyOfCaseHearings` with `businessOnDate` / `hearingDate` / `purposeOfListing`; tribunal records arrive under `tribunalCaseData` (documented, not yet seen).

**Not tested:** the refresh endpoint (`POST .../refresh`) and the free `bulk-refresh-status` call, tribunals, the Supreme Court, other states' courts, rate-limit behaviour, and how much was actually charged (the account's balance is not read by the app). Migration 0023 marks only High Court and district-court *case detail* as tested.

To repeat the check yourself:

```bash
COURT_API_KEY=... node tests/court-live-check.mjs DLHC010001232024
```

It makes one `GET /api/partner/case/{cnr}` call (about ₹1.50 on pay-as-you-go), prints which fields were read and which are missing, and never prints the key.

## Partner Network

| Command | What it proves |
| --- | --- |
| `bash tests/partner-db/run.sh` | Migration 0039 on real PostgreSQL 16: permissions per role, registration and duplicate blocking, attribution rules, commission gating and duplicate prevention, payouts, fraud flags, audit immutability, global switches, isolation between partners, and that advocate registration survives a partner-network fault. |
| `node tests/partner-ui/ui.test.mjs` | Real Chromium against the real pages and database (through `tests/partner-ui/bridge.mjs`): registration with OTP, admin approval, legal approval before commission, referral capture on the directory, payment, commission, KYC, payout, CSV/Excel export, staff roles, mobile layouts. Needs Playwright and PostgreSQL 16. |
| `node tests/partner-export.test.mjs`, `node tests/partner-mail.test.mjs` | CSV/Excel writer (formula-injection guard, valid xlsx) and email helpers. |


## Audit suites (2026-11-21)

`bash tests/run-all.sh` runs everything below plus the older suites.

| Command | What it proves |
| --- | --- |
| `node tests/razorpay-engine.test.mjs` | The real `functions/razorpay` against an in-memory database and a mock of api.razorpay.com: checkout signature, webhook signature (raw body), replay by event id, amount/ownership checks, payment is never applied twice, failed and refund events, nothing listed or activated without a confirmed payment, promo claims, Solo seat limit, secret never in a response. Proves our logic, not Razorpay: run one `rzp_test_` payment end to end to prove the account set-up. |
| `node tests/admin-engine.test.mjs` | The real `functions/admin`: 401 / 403 for no sign-in, a normal user and an unconfirmed email on every action; every change audited; refunds (full amount, paid Razorpay payments only, Razorpay refusal changes nothing); free coupons must name their plans; database failures are errors, not "ok". |
| `bash tests/hardening-db/run.sh` | Migrations 0001 to 0045 (the ones that matter) on real PostgreSQL 16: no hidden platform admin, legacy RPC closed, public insert limits and rate limit, duplicate enrolment numbers, refunds (`apply_refund`), atomic promo claims, partner self-referral and payout holds, owner row and firm profile guards, chat meeting cards. Re-runnable. |
| `node tests/sanitize.test.mjs` | The draft HTML sanitiser in Chromium: 20 XSS vectors neutralised, normal drafting markup kept. |
| `node tests/site-smoke.mjs` | Every public page on a Vercel-like server (clean URLs, redirects, 404), desktop and phone: no script errors, title, description, canonical, one h1, no broken image, no sideways scroll, private pages noindex, sitemap matches the public pages. |
| `node tests/e2e.js local` | The browser-only app, 25 steps (updated: the sidebar is grouped). |

Known stale: `node tests/partner-ui/ui.test.mjs` passes 63 of 64 and then fails at the partner dashboard (`.pn-stats` hidden) on main as well; the test predates the "instant access" change.

| `node tests/advocate-page.test.mjs` | The crawlable advocate page and sitemap function with the directory RPC mocked: real head tags and JSON-LD, markup escaped, unchecked profiles `noindex` and out of the sitemap, malformed ids never reach the database, no contact data in the page. |
| `node tests/directory-notify.test.mjs` | The directory-verify sweep announcing new contact requests: once each, names and topics only, nothing for unpaid or rejected profiles, retried when the email fails, cron secret only. |

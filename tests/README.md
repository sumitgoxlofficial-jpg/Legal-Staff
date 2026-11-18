# Tests

Nothing here is deployed.

## Court-record engine

| Command | What it proves |
| --- | --- |
| `node tests/court-logic.test.mjs` | Pure logic: CNR checks, capability registry, costs, schedule and priority, verification statuses, reading a provider answer, identifier matching, change detection, budget, error classes, circuit breaker, secret scrubbing. |
| `node tests/court-engine.test.mjs` | The real `supabase/functions/court-sync` code, run against an in-memory database and a **local mock** of the eCourtsIndia API that fails in every way: caching, shared cache, duplicate-request block, budget and override, wrong-CNR rejection, bad key, no credits, 429, 500, timeout, change detection, scheduler, permissions, admin actions, key rotation, secrets never in output. Needs `tsc` on the PATH. |
| `bash tests/court-db/run.sh` | Migration `0022_court_intelligence.sql` on a real PostgreSQL 16 (Supabase pieces stubbed): re-runnable, atomic budget reserve, duplicate-claim lock, append-only audit, Vault key rotation, row level security. Needs PostgreSQL 16 binaries. |

## Email marketing

| Command | What it proves |
| --- | --- |
| `node tests/email-logic.test.mjs` | Pure rules: the ten pre-send checks, reminders and caps, production switches, IST schedule, sheet mapping, templates, signed links, Brevo payload and event mapping, Google JWT, CSV safety, secret scrubbing. |
| `node tests/email-engine.test.mjs` | The real `supabase/functions/email-marketing` code against an in-memory database, a mock Brevo and a mock Google Sheets with 10,000 rows: import, consent, dry run, queues and caps, duplicates and concurrency, unsubscribe, bounces and complaints, reminders, kill switch, rate limits, attribution, dashboard totals, audit. Needs `tsc` on the PATH. |
| `bash tests/email-db/run.sh` | Migration `0024_email_marketing.sql` on a real PostgreSQL 16: re-runnable, import function at 10,000 rows, consent and suppression rules, conversions, append-only audit, row level security. |

| `node tests/directory-pay.test.mjs` | The ₹49 directory listing in `functions/upi-pay`: identification by reference + enrolment number, unique amounts shared with plan orders, matching a bank credit to exactly one order, no double confirmation, plan payments unaffected. Needs `tsc`. |
| `node tests/razorpay.test.mjs` | `functions/listing-razorpay` against a local Razorpay mock: signature rules, forged or mismatched payments refused, server-side capture, webhook, duplicate payments, switched off, key never leaked. Needs `tsc`. |

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

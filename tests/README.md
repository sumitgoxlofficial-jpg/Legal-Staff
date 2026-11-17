# Tests

Nothing here is deployed.

## Court-record engine

| Command | What it proves |
| --- | --- |
| `node tests/court-logic.test.mjs` | Pure logic: CNR checks, capability registry, costs, schedule and priority, verification statuses, reading a provider answer, identifier matching, change detection, budget, error classes, circuit breaker, secret scrubbing. |
| `node tests/court-engine.test.mjs` | The real `supabase/functions/court-sync` code, run against an in-memory database and a **local mock** of the eCourtsIndia API that fails in every way: caching, shared cache, duplicate-request block, budget and override, wrong-CNR rejection, bad key, no credits, 429, 500, timeout, change detection, scheduler, permissions, admin actions, key rotation, secrets never in output. Needs `tsc` on the PATH. |
| `bash tests/court-db/run.sh` | Migration `0022_court_intelligence.sql` on a real PostgreSQL 16 (Supabase pieces stubbed): re-runnable, atomic budget reserve, duplicate-claim lock, append-only audit, Vault key rotation, row level security. Needs PostgreSQL 16 binaries. |

## WhatsApp Cloud API

| Command | What it proves |
| --- | --- |
| `node tests/whatsapp-logic.test.mjs` | Pure logic: Graph error classification (token, permission, rate limit, template, recipient), webhook signature check, phone and template rules, delivery-status ordering ("accepted" is never "delivered"), STOP / START parsing, token expiry and health, alert throttling, secret scrubbing. |
| `node tests/whatsapp-engine.test.mjs` | The real `supabase/functions/whatsapp` code against an in-memory database and a **local mock of Meta's Graph API** that fails in every way: who may call, secrets never in any response, log or table, the connection checks, a send is never retried, delivery status only from correctly signed webhooks, opt-outs, rotation, disconnect makes no Meta call, health check and alert emails. Needs `tsc` on the PATH. |
| `bash tests/whatsapp-db/run.sh` | Migration `0024_whatsapp_cloud.sql` on a real PostgreSQL 16 (Supabase pieces stubbed): re-runnable, constraints, append-only audit log, Vault functions locked to the service role and to three names, row level security. |

**Not tested here:** Meta itself. The mock follows Meta's documented answers, but only a real token proves them. After saving real credentials, open Admin → Settings → Integrations → WhatsApp API and run **Test connection**, then **Send test message** to a number that is allowed to receive it, and check that the delivery webhook moves it to "delivered".

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

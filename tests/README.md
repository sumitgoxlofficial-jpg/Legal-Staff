# Tests

Nothing here is deployed.

## Court-record engine

| Command | What it proves |
| --- | --- |
| `node tests/court-logic.test.mjs` | Pure logic: CNR checks, capability registry, costs, schedule and priority, verification statuses, reading a provider answer, identifier matching, change detection, budget, error classes, circuit breaker, secret scrubbing. |
| `node tests/court-engine.test.mjs` | The real `supabase/functions/court-sync` code, run against an in-memory database and a **local mock** of the eCourtsIndia API that fails in every way: caching, shared cache, duplicate-request block, budget and override, wrong-CNR rejection, bad key, no credits, 429, 500, timeout, change detection, scheduler, permissions, admin actions, key rotation, secrets never in output. Needs `tsc` on the PATH. |
| `bash tests/court-db/run.sh` | Migration `0022_court_intelligence.sql` on a real PostgreSQL 16 (Supabase pieces stubbed): re-runnable, atomic budget reserve, duplicate-claim lock, append-only audit, Vault key rotation, row level security. Needs PostgreSQL 16 binaries. |

### What these do not prove (Integration)

They do not call the real eCourtsIndia API: that needs a paid or trial key. Until a run with a real key is recorded below, treat the provider's field names and coverage as **unverified**: `normalizeCase()` matches field names loosely, and every row in `provider_capabilities` has `verified_at` empty.

To run it once you have a key, from a machine that can reach the provider:

```bash
COURT_API_KEY=... node tests/court-live-check.mjs DLHC010001232024
```

It makes one `GET /api/partner/case/{cnr}` call (about ₹1.50 on pay-as-you-go), prints which fields were read and which were missing, and never prints the key. Record the result here, and set `verified_at` for the courts it covered:

| Date | Court / tribunal | Result |
| --- | --- | --- |
| *(none yet)* | | |

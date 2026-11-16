# Tests

Nothing here is deployed (`.vercelignore` excludes `tests/`). Playwright and Chromium must already be installed; the scripts never install anything.

| Command | What it runs |
| --- | --- |
| `node tests/unit.mjs` | Pure logic from `app-store.js`, no browser: GST maths (CGST/SGST, IGST, reverse charge, bill of supply, legacy invoices), amount in words, invoice numbering per financial year, plans and roles, the order-date parser. |
| `node tests/e2e.js local` | The browser-only app (no server): sign-in, onboarding, every create/edit/delete flow, GST invoices, exports, search, reload, 390 px layout, console errors. |
| `node tests/e2e.js server` | The same against `tests/fake-supabase.js`, plus server persistence, paging past 1,000 rows, team invite and join, roles (owner / associate / clerk / viewer, in the app and refused by the server), plan seats, case and storage limits, grace period and read-only, clearing the device, deleting firm data. |

Each prints `N passed, M failed` and exits non-zero on a failure. Run the two e2e modes one after the other (each starts and stops the static server).

`ONLY='<regex>' node tests/e2e.js server` runs only the steps whose names match (later steps usually need the earlier ones).

## How the e2e run works

- The repository is served on `http://localhost:8765`. If nothing answers there, the script starts `python3 -m http.server 8765` in the repository root and stops it at the end.
- Requests are rewritten in the browser: `config.js` gets a test configuration (server mode: a fake Supabase URL and key; local mode: no `supabaseUrl`), `vendor/supabase.js` is replaced by `tests/fake-supabase.js`, and every other outside host (Google Fonts, Google sign-in, Razorpay) gets an empty response.
- Google sign-in is stubbed: `window.google.accounts.id.renderButton` draws a `#gsi` button that signs in as `localStorage.__test_google` (`{ email, name }`).
- Screenshots (device scale factor 2) go to `tests/shots/` (git-ignored): GST invoices on screen and in print view, role-restricted screens, the read-only banner, and `fail-*.png` for any failed step.

## The fake server (`tests/fake-supabase.js`)

An in-browser stand-in for the supabase-js client that `app-backend.js` uses. It keeps all server data in `localStorage.__fake_server`, so reloads keep it, and the signed-in user in `localStorage.__fake_session`.

- Auth: `getSession`, `signInWithIdToken` (reads the email from the ID token), `signInWithOtp` / `verifyOtp` (the code is always `123456`), `signOut`, `onAuthStateChange`.
- `from(table)`: `select / insert / upsert / update / delete` with `eq, neq, in, gte, lte, order, range, limit, single, maybeSingle`. Unbounded selects stop at 1,000 rows like PostgREST. Errors come back as `{ data: null, error: { message, code } }`.
- Row level security and triggers from `supabase/migrations` 0001–0006: membership, owner-only member changes, the bulk-delete guard, `member_role()`, invoice and viewer rules, seat limits, storage delete for owner/partner only.
- RPCs: `my_firms, create_firm, update_my_profile, erase_firm_data, is_member, is_owner, is_platform_admin, member_role, next_invoice_no, directory_decide`. With `__fakeAdmin.setOption('schema', 5)` the 0006 functions disappear (`PGRST202`), to test the app against a database without that migration.
- Storage bucket `documents`: `upload, download, list, remove, createSignedUrl`. Functions: `notify, court-status`; the Razorpay functions answer "Payments are not configured yet."

Test controls on `window.__fakeAdmin`: `signInAs(email, name)` (then reload), `signOut()`, `state()`, `save()`, `reset()`, `setSub(firmId, plan, renews)`, `setFirm(firmId, patch)`, `setMember(email, patch)`, `setOption(key, value)`, `records(kind)`, and `from / rpc / storage` to call the fake directly as the signed-in user (for example, to check that the server refuses something the app hides).

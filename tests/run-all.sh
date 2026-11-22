#!/usr/bin/env bash
# Runs every automated suite that needs no network and no credentials. Exit code is non-zero if any suite fails.
# Needs: node 20+, tsc on PATH, PostgreSQL 16 binaries (PGBIN), Playwright with Chromium. Set SKIP_BROWSER=1 to skip the browser suites.
cd "$(dirname "$0")/.."
fail=0; run() { printf '%-34s' "$1"; if out=$("${@:2}" 2>&1); then echo "ok   $(echo "$out" | tail -1 | cut -c1-70)"; else echo "FAIL"; echo "$out" | tail -15; fail=1; fi; }
for t in court-logic court-engine notify-court-alerts whatsapp-logic whatsapp-engine email-logic email-engine partner-export partner-mail sign razorpay-engine admin-engine advocate-page directory-notify account-delete; do run "node tests/$t.test.mjs" node tests/$t.test.mjs; done
for s in court-db whatsapp-db email-db partner-db hardening-db; do run "bash tests/$s/run.sh" bash tests/$s/run.sh; done
if [ -z "${SKIP_BROWSER:-}" ]; then
  run "node tests/sanitize.test.mjs" node tests/sanitize.test.mjs
  run "node tests/site-smoke.mjs" node tests/site-smoke.mjs
  run "node tests/e2e.js local" node tests/e2e.js local
  run "node tests/directory-photos.test.mjs" node tests/directory-photos.test.mjs
  run "node tests/partner-ui/ui.test.mjs" node tests/partner-ui/ui.test.mjs
fi
exit $fail

#!/usr/bin/env bash
# Applies the real migrations 0001..0044 that matter (core, admin, directory, partner network, hardening) to a throwaway PostgreSQL 16
# and checks the audit fixes. Set PGBIN if the binaries are elsewhere. Needs no network.
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}; HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$HERE/../..; D=$(mktemp -d /var/tmp/ls-pgtest.XXXXXX); PORT=${PGPORT:-5546}
RUN=(); [ "$(id -u)" = 0 ] && { chown postgres "$D"; RUN=(su postgres -c); }
start="$PGBIN/initdb -U postgres -D $D/data -A trust >/dev/null && $PGBIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log -w start >/dev/null"
if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$start"; else bash -c "$start"; fi
cleanup() { stop="$PGBIN/pg_ctl -D $D/data -m immediate stop >/dev/null 2>&1"; if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$stop" || true; else bash -c "$stop" || true; fi; rm -rf "$D"; }
trap cleanup EXIT
P="psql -h $D -p $PORT -U postgres -qAt -v ON_ERROR_STOP=1"
$P -f "$HERE/stub.sql" >/dev/null
for m in 0001_core 0022_court_intelligence 0023_court_refresh 0006_trial 0010_upi 0013_promo_codes 0014_remove_razorpay 0019_team_chat 0020_chat_files_reactions 0021_seat_pricing 0018_super_admin 0026_directory_membership 0027_directory_compare_reviews 0029_is_super_admin 0039_partner_network 0041_partner_monthly_earnings 0042_partner_instant_access 0043_support_ai 0044_security_hardening 0045_core_app_hardening 0046_remaining_fixes; do
  f="$ROOT/supabase/migrations/$m.sql"; sed -e 's/^create extension if not exists pg_cron;//' -e 's/^create extension if not exists pg_net[^;]*;//' "$f" > "$D/m.sql"
  $P -f "$D/m.sql" >/dev/null 2>"$D/err" || { echo "MIGRATION $m FAILED"; cat "$D/err"; exit 1; }
done
echo "migrations apply"
for m in 0044_security_hardening 0045_core_app_hardening 0046_remaining_fixes; do $P -f "$ROOT/supabase/migrations/$m.sql" >/dev/null && echo "$m re-applies"; done
psql -h "$D" -p "$PORT" -U postgres -qAt -f "$HERE/hardening-db.test.sql" 2>&1 | grep -v '^$'

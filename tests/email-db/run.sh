#!/usr/bin/env bash
# Runs migrations 0035 and 0036 and their checks on a throwaway PostgreSQL 16 (Supabase pieces stubbed). Set PGBIN if the binaries are elsewhere.
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}; HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$HERE/../..; D=$(mktemp -d /var/tmp/ls-pgtest.XXXXXX); PORT=${PGPORT:-5545}
RUN=(); [ "$(id -u)" = 0 ] && { chown postgres "$D"; RUN=(su postgres -c); }
start="$PGBIN/initdb -D $D/data -A trust >/dev/null && $PGBIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log -w start >/dev/null"
if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$start"; else bash -c "$start"; fi
cleanup() { stop="$PGBIN/pg_ctl -D $D/data -m immediate stop >/dev/null 2>&1"; if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$stop" || true; else bash -c "$stop" || true; fi; rm -rf "$D"; }
trap cleanup EXIT
P="psql -h $D -p $PORT -U postgres -qAt"
$P -v ON_ERROR_STOP=1 -f "$ROOT/tests/court-db/supabase-stub.sql"
$P -v ON_ERROR_STOP=1 -c "create table public.directory_applications (id text primary key, email text not null default '', status text not null default 'pending'); grant all on public.directory_applications to service_role;" >/dev/null
sed 's/^create extension if not exists pg_cron;//' "$ROOT/supabase/migrations/0035_email_marketing.sql" > "$D/mig.sql"
$P -v ON_ERROR_STOP=1 -c "create table public.directory_orders (id uuid primary key default gen_random_uuid(), application_id text not null references public.directory_applications(id), amount_paise integer not null check (amount_paise >= 0), status text not null default 'created'); grant all on public.directory_orders to service_role;" >/dev/null
$P -v ON_ERROR_STOP=1 -f "$D/mig.sql" >/dev/null && echo "migration applies"
$P -v ON_ERROR_STOP=1 -f "$D/mig.sql" >/dev/null && echo "migration re-applies"
$P -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0036_email_directory_fee_hook.sql" >/dev/null && $P -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0036_email_directory_fee_hook.sql" >/dev/null && echo "migration 0036 applies and re-applies"
$P -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0037_email_public_record_basis.sql" >/dev/null && $P -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0037_email_public_record_basis.sql" >/dev/null && echo "migration 0037 applies and re-applies"
$P -v ON_ERROR_STOP=1 -f "$HERE/email-db.test.sql" 2>&1 | grep -v '^$'

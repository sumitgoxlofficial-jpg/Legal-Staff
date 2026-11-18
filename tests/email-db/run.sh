#!/usr/bin/env bash
# Runs migration 0024 and its checks on a throwaway PostgreSQL 16 (Supabase pieces stubbed). Set PGBIN if the binaries are elsewhere.
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
sed 's/^create extension if not exists pg_cron;//' "$ROOT/supabase/migrations/0024_email_marketing.sql" > "$D/mig.sql"
$P -v ON_ERROR_STOP=1 -c "create table if not exists auth.users (id uuid primary key, email text); create table public.payments (id uuid primary key default gen_random_uuid(), user_id uuid, amount_paise integer, status text default 'created'); grant all on public.payments to service_role;" >/dev/null
$P -v ON_ERROR_STOP=1 -f "$D/mig.sql" >/dev/null && echo "migration applies"
$P -v ON_ERROR_STOP=1 -f "$D/mig.sql" >/dev/null && echo "migration re-applies"
$P -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0025_email_payment_hook.sql" >/dev/null && echo "migration 0025 applies"
$P -v ON_ERROR_STOP=1 -f "$HERE/email-db.test.sql" 2>&1 | grep -v '^$'

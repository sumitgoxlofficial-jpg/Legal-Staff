#!/usr/bin/env bash
# Runs migration 0024 (WhatsApp Cloud API) and its checks on a throwaway PostgreSQL 16, with the Supabase pieces stubbed
# (tests/court-db/supabase-stub.sql). Set PGBIN if the binaries are elsewhere.
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}; HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$HERE/../..; D=$(mktemp -d /var/tmp/ls-wa-pgtest.XXXXXX); PORT=${PGPORT:-5545}
RUN=(); [ "$(id -u)" = 0 ] && { chown postgres "$D"; RUN=(su postgres -c); }
start="$PGBIN/initdb -U postgres -D $D/data -A trust >/dev/null && $PGBIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log -w start >/dev/null"
if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$start"; else bash -c "$start"; fi
cleanup() { stop="$PGBIN/pg_ctl -D $D/data -m immediate stop >/dev/null 2>&1"; if [ ${#RUN[@]} -gt 0 ]; then "${RUN[@]}" "$stop" || true; else bash -c "$stop" || true; fi; rm -rf "$D"; }
trap cleanup EXIT
P="psql -h $D -p $PORT -U postgres -qAt"
$P -v ON_ERROR_STOP=1 -f "$HERE/../court-db/supabase-stub.sql"
$P -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0024_whatsapp_cloud.sql" >/dev/null && echo "migration applies"
$P -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0024_whatsapp_cloud.sql" >/dev/null && echo "migration re-applies"
$P -f "$HERE/whatsapp-db.test.sql" 2>&1 | grep -v '^$'

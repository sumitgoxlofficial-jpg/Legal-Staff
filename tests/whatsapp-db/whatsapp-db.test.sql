-- Checks for migration 0024 on a real PostgreSQL. Each line prints "ok ..." or the script stops with an error.
\set ON_ERROR_STOP on
create or replace function pg_temp.expect_fail(sql text, label text) returns text language plpgsql as $$
begin execute sql; return 'FAIL ' || label || ' (it was allowed)'; exception when others then return 'ok   ' || label; end $$;

select 'ok   settings row is seeded once' where (select count(*) from public.whatsapp_config) = 1 and (select status from public.whatsapp_config) = 'not_configured';
select pg_temp.expect_fail($$insert into public.whatsapp_config (id) values (2)$$, 'only one settings row is allowed');
select pg_temp.expect_fail($$update public.whatsapp_config set status = 'bogus'$$, 'unknown connection status is refused');
select pg_temp.expect_fail($$update public.whatsapp_config set graph_version = 'latest'$$, 'bad Graph version is refused');
select pg_temp.expect_fail($$update public.whatsapp_config set waba_id = '12; drop table x'$$, 'non-numeric WABA id is refused');
select pg_temp.expect_fail($$insert into public.whatsapp_messages (status) values ('delivered-ish')$$, 'unknown message status is refused');
insert into public.whatsapp_messages (wamid, status) values ('wamid.1', 'accepted');
select pg_temp.expect_fail($$insert into public.whatsapp_messages (wamid) values ('wamid.1')$$, 'a Meta message id is unique');
select pg_temp.expect_fail($$insert into public.whatsapp_optouts (phone_hash) values ('919876543210')$$, 'opt-outs keep only a SHA-256 hash, never a number');
insert into public.whatsapp_optouts (phone_hash) values (repeat('a', 64));
select 'ok   a valid hash is accepted' where exists (select 1 from public.whatsapp_optouts);

-- audit log is append-only
insert into public.whatsapp_audit_log (actor, action) values ('boss@legalstaff.in', 'config_saved');
select pg_temp.expect_fail($$update public.whatsapp_audit_log set action = 'x'$$, 'audit log cannot be edited');
select pg_temp.expect_fail($$delete from public.whatsapp_audit_log$$, 'audit log cannot be deleted');

-- Vault: only the service role, only the three names, never a short value
select 'ok   service role can store a secret' from (select set_config('role', 'service_role', false)) x, lateral (select public.wa_secret_set('wa_access_token', 'EAAG-first-token-value')) y;
select case when public.wa_secret_get('wa_access_token') = 'EAAG-first-token-value' then 'ok   service role reads it back' else 'FAIL read back' end;
select public.wa_secret_set('wa_access_token', 'EAAG-second-token-value');
reset role; select case when (select count(*) from vault.secrets where name = 'wa_access_token') = 1 and (select secret from vault.secrets where name = 'wa_access_token') = 'EAAG-second-token-value' then 'ok   rotating replaces the secret (one row, new value)' else 'FAIL rotation' end; set role service_role;
select pg_temp.expect_fail($$select public.wa_secret_get('court_api_key')$$, 'cannot read any other vault secret through these functions');
select pg_temp.expect_fail($$select public.wa_secret_set('cron_secret', 'overwrite-attempt')$$, 'cannot write any other vault secret');
select pg_temp.expect_fail($$select public.wa_secret_delete('cron_secret')$$, 'cannot delete any other vault secret');
select pg_temp.expect_fail($$select public.wa_secret_set('wa_app_secret', 'short')$$, 'a too-short secret is refused');
select case when (select present from public.wa_secret_status() where name = 'wa_access_token') and not (select present from public.wa_secret_status() where name = 'wa_app_secret') then 'ok   status shows which secrets exist, no values' else 'FAIL status' end;
select public.wa_secret_delete('wa_access_token');
reset role; select case when not exists (select 1 from vault.secrets where name = 'wa_access_token') then 'ok   delete removes the secret' else 'FAIL delete' end;

-- nobody else can reach any of it. Supabase grants every public table to anon and authenticated by default, so RLS is what protects them:
grant all on all tables in schema public to anon, authenticated;
set role anon;
select pg_temp.expect_fail($$select public.wa_secret_get('wa_access_token')$$, 'anon cannot call the vault function');
select case when (select count(*) from public.whatsapp_config) = 0 then 'ok   anon sees no settings row (RLS)' else 'FAIL anon reads settings' end;
do $$ declare n int; begin update public.whatsapp_config set status = 'connected'; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL anon updated settings'; end if; end $$;
select 'ok   anon cannot change settings (RLS)';
reset role; set role authenticated;
select pg_temp.expect_fail($$select public.wa_secret_set('wa_access_token', 'attacker-supplied-token')$$, 'a signed-in user cannot call the vault function');
select pg_temp.expect_fail($$select public.wa_secret_status()$$, 'a signed-in user cannot list secret names');
select case when (select count(*) from public.whatsapp_config) = 0 and (select count(*) from public.whatsapp_messages) = 0 and (select count(*) from public.whatsapp_optouts) = 0 and (select count(*) from public.whatsapp_audit_log) = 0 and (select count(*) from public.whatsapp_api_errors) = 0 then 'ok   row level security: a signed-in user sees no row in any WhatsApp table' else 'FAIL RLS' end;
select pg_temp.expect_fail($$insert into public.whatsapp_audit_log (actor, action) values ('me', 'fake')$$, 'a signed-in user cannot write the audit log (RLS)');
reset role;
select case when (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname like 'whatsapp_%' and c.relkind = 'r' and not c.relrowsecurity) = 0 then 'ok   every WhatsApp table has row level security on' else 'FAIL a table without RLS' end;
select case when (select count(*) from cron.job where jobname = 'legal-staff-whatsapp-health') >= 1 then 'ok   health check is scheduled (the stub cannot unschedule, real pg_cron replaces the job)' else 'FAIL schedule' end;

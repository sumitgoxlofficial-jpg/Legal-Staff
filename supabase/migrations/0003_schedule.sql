-- Daily briefing at 7:30 AM IST (02:00 UTC): pg_cron calls the notify Edge Function.
-- The shared secret is generated inside the database and kept in Vault; notify checks it with cron_secret_ok().
-- Change the URL below if the project changes.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'cron_secret', 'Shared secret for the daily briefing job');
  end if;
end $$;

create or replace function public.cron_secret_ok(s text) returns boolean
language sql security definer set search_path = '' as $$
  select coalesce(s, '') <> '' and exists (select 1 from vault.decrypted_secrets where name = 'cron_secret' and decrypted_secret = s);
$$;
revoke all on function public.cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.cron_secret_ok(text) to service_role;

select cron.unschedule('legal-staff-daily-briefing') where exists (select 1 from cron.job where jobname = 'legal-staff-daily-briefing');
select cron.schedule('legal-staff-daily-briefing', '0 2 * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb);
$job$);

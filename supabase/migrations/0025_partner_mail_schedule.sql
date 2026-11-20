-- Legal Staff — Partner Network: send queued partner emails every 10 minutes through functions/partner-mail.
-- Apply after 0024 and after deploying functions/partner-mail. Needs the same Vault secret 'cron_secret' as the other scheduled jobs
-- (and CRON_SECRET in the function's secrets). Safe to run more than once.
create extension if not exists pg_cron;
select cron.unschedule('legal-staff-partner-mail') where exists (select 1 from cron.job where jobname = 'legal-staff-partner-mail');
select cron.schedule('legal-staff-partner-mail', '*/10 * * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/partner-mail',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"drain"}'::jsonb);
$job$);

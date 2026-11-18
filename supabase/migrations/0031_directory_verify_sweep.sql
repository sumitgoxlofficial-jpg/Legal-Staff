-- Legal Staff — retry automatic document checks that could not run (AI service busy or down). Every 3 minutes the
-- directory-verify function settles applications still 'pending' for more than 4 minutes. Same secret as the other jobs.
select cron.unschedule('legal-staff-directory-verify') where exists (select 1 from cron.job where jobname = 'legal-staff-directory-verify');
select cron.schedule('legal-staff-directory-verify', '*/3 * * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/directory-verify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"sweep"}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

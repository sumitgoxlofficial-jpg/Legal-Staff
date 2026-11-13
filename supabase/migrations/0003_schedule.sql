-- Daily briefing at 7:30 AM IST (02:00 UTC). Apply after the notify function is deployed.
-- Before running, store the two values in Vault (Dashboard → Project Settings → Vault):
--   project_url   https://<project-ref>.supabase.co
--   cron_secret   the same value as the CRON_SECRET function secret
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('legal-staff-daily-briefing', '0 2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb);
$$);

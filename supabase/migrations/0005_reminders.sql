-- Briefings at each member's chosen time: pg_cron calls notify every hour at minute 0 UTC (= HH:30 IST).
-- notify sends a member's briefing only in the IST hour of their Settings › Morning briefing time (user_state.data.settings.briefingTime,
-- default 07:30), and only once per IST day per channel, using the rows below. Apply this before deploying the matching notify function.
alter table public.notifications add column if not exists kind text default 'briefing';
alter table public.notifications add column if not exists user_id uuid;
create index if not exists notifications_daily_idx on public.notifications (firm_id, kind, created_at desc);

select cron.unschedule('legal-staff-daily-briefing') where exists (select 1 from cron.job where jobname = 'legal-staff-daily-briefing');
select cron.unschedule('legal-staff-briefings') where exists (select 1 from cron.job where jobname = 'legal-staff-briefings');
select cron.schedule('legal-staff-briefings', '0 * * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb);
$job$);

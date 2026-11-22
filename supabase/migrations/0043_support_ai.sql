-- Legal Staff — Support AI: answers new Support messages by email (functions/support-ai).
-- Apply after deploying functions/support-ai. Needs the Vault secret 'cron_secret' (and CRON_SECRET in the function's secrets),
-- the same as the other scheduled jobs. Safe to run more than once. To turn the AI off: select cron.unschedule('legal-staff-support-ai');
alter table public.contact_requests add column if not exists status text not null default 'open';
alter table public.contact_requests add column if not exists reply text;
alter table public.contact_requests add column if not exists replied_at timestamptz;
alter table public.contact_requests add column if not exists ai_replied boolean not null default false;  -- true when the AI wrote and sent the reply
alter table public.contact_requests add column if not exists ai_note text;                               -- why the AI left a message for a person
create index if not exists contact_requests_ai_idx on public.contact_requests (lower(email), replied_at) where ai_replied;

create extension if not exists pg_cron;
select cron.unschedule('legal-staff-support-ai') where exists (select 1 from cron.job where jobname = 'legal-staff-support-ai');
select cron.schedule('legal-staff-support-ai', '*/2 * * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/support-ai',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"drain"}'::jsonb);
$job$);

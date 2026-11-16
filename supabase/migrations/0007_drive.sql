-- Legal Staff — encrypted storage in each user's own Google Drive.
-- A user connects their Google Drive (scope drive.appdata: a hidden folder only Legal Staff can see). Their uploads and a
-- daily backup of each firm they belong to are encrypted on the server (AES-256-GCM, one key per firm derived from a
-- master key) and stored there. The master key is generated here and kept in Vault; it never leaves the server.

-- One row per connected user. Only the drive Edge Function (service role) reads or writes it: RLS is on with no policies.
create table if not exists public.drive_accounts (
  user_id uuid primary key,
  email text not null default '',
  refresh_token_enc text not null,                    -- the Google refresh token, encrypted with the master key
  connected_at timestamptz not null default now(),
  last_backup_at timestamptz,
  last_error text
);
alter table public.drive_accounts enable row level security;

-- Master encryption key (32 random bytes, base64), created once inside the database.
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'drive_master_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'drive_master_key', 'Master key for files stored in Google Drive');
  end if;
end $$;

create or replace function public.drive_master_key() returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'drive_master_key';
$$;
revoke all on function public.drive_master_key() from public, anon, authenticated;
grant execute on function public.drive_master_key() to service_role;

-- Nightly backup at 2:30 AM IST (21:00 UTC), using the same shared secret as the briefing job.
select cron.unschedule('legal-staff-drive-backup') where exists (select 1 from cron.job where jobname = 'legal-staff-drive-backup');
select cron.schedule('legal-staff-drive-backup', '0 21 * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/drive',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"backup_all"}'::jsonb,
    timeout_milliseconds := 120000);
$job$);

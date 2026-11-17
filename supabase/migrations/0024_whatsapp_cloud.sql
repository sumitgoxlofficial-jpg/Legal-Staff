-- Legal Staff — WhatsApp Cloud API (Meta) connection, set up from Admin › Settings › Integrations › WhatsApp API.
-- supabase/functions/whatsapp reads and writes everything below with the service role. Nothing here is readable from the browser:
-- row level security is on with no policies, and the Vault functions are granted to service_role only.
--
--   whatsapp_config      one row: the NON-secret settings (ids, Graph version, last check, token and webhook state).
--   Vault secrets        wa_app_secret, wa_access_token, wa_verify_token. Encrypted at rest by Supabase Vault; never returned by any API.
--   whatsapp_messages    every message submitted to Meta, and its status as Meta's webhooks report it. Only a masked number is kept.
--   whatsapp_optouts     numbers (as SHA-256 hashes) that replied STOP; notify skips them.
--   whatsapp_api_errors  history of Graph API errors (already scrubbed of secrets).
--   whatsapp_audit_log   who changed or tested the connection, and when.
-- This migration does not touch any existing WhatsApp number or the WHATSAPP_* function secrets.

create table if not exists public.whatsapp_config (
  id int primary key default 1 check (id = 1),
  app_id text not null default '' check (app_id ~ '^[0-9]{0,25}$'),
  waba_id text not null default '' check (waba_id ~ '^[0-9]{0,25}$'),
  phone_number_id text not null default '' check (phone_number_id ~ '^[0-9]{0,25}$'),
  graph_version text not null default 'v21.0' check (graph_version ~ '^v[0-9]{1,2}\.[0-9]{1,2}$'),
  status text not null default 'not_configured' check (status in ('not_configured', 'saved', 'connected', 'error', 'disconnected')),
  status_detail text not null default '',
  display_phone_number text not null default '',
  verified_name text not null default '',
  quality_rating text not null default '',
  token_valid boolean,
  token_type text not null default '',
  token_expires_at timestamptz,
  token_scopes text[] not null default '{}',
  token_checked_at timestamptz,
  token_replaced_at timestamptz,
  last_checked_at timestamptz,
  webhook_verified_at timestamptz,
  webhook_subscribed_app boolean,
  webhook_fields text[] not null default '{}',
  last_webhook_at timestamptz,
  last_webhook_event text not null default '',
  last_alert_at timestamptz,
  connected_at timestamptz,
  updated_by text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.whatsapp_config (id) values (1) on conflict do nothing;
alter table public.whatsapp_config enable row level security;

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  wamid text unique,
  kind text not null default 'test' check (kind in ('test', 'briefing', 'other')),
  to_masked text not null default '',
  template text not null default '',
  language text not null default '',
  -- accepted: Meta's API took the request. sent / delivered / read / failed only ever come from Meta's webhooks. rejected: the API refused it.
  status text not null default 'accepted' check (status in ('accepted', 'rejected', 'sent', 'delivered', 'read', 'failed')),
  error_code int,
  error_message text not null default '',
  sent_by text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_recent_idx on public.whatsapp_messages (created_at desc);
alter table public.whatsapp_messages enable row level security;

create table if not exists public.whatsapp_optouts (
  phone_hash text primary key check (phone_hash ~ '^[0-9a-f]{64}$'),
  source text not null default 'reply',
  created_at timestamptz not null default now()
);
alter table public.whatsapp_optouts enable row level security;

create table if not exists public.whatsapp_api_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null default '',
  endpoint text not null default '',
  http_status int,
  code int,
  subcode int,
  kind text not null default '',
  message text not null default '',
  fbtrace_id text not null default ''
);
create index if not exists whatsapp_api_errors_recent_idx on public.whatsapp_api_errors (at desc);
alter table public.whatsapp_api_errors enable row level security;

create table if not exists public.whatsapp_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null default '',
  action text not null,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists whatsapp_audit_log_recent_idx on public.whatsapp_audit_log (at desc);
alter table public.whatsapp_audit_log enable row level security;
-- The log is append-only.
create or replace function public.whatsapp_audit_immutable() returns trigger language plpgsql as $$ begin raise exception 'whatsapp_audit_log is append-only'; end $$;
drop trigger if exists whatsapp_audit_no_change on public.whatsapp_audit_log;
create trigger whatsapp_audit_no_change before update or delete on public.whatsapp_audit_log for each row execute function public.whatsapp_audit_immutable();

-- ---------- Vault access (service role only) ----------
create or replace function public.wa_secret_get(p_name text) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_name not in ('wa_app_secret', 'wa_access_token', 'wa_verify_token') then raise exception 'unknown secret'; end if;
  return (select decrypted_secret from vault.decrypted_secrets where name = p_name order by created_at desc limit 1);
end $$;
create or replace function public.wa_secret_set(p_name text, p_value text) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  if p_name not in ('wa_app_secret', 'wa_access_token', 'wa_verify_token') then raise exception 'unknown secret'; end if;
  if p_value is null or length(p_value) < 8 then raise exception 'secret too short'; end if;
  select id into sid from vault.secrets where name = p_name limit 1;
  if sid is null then perform vault.create_secret(p_value, p_name, 'Legal Staff WhatsApp Cloud API (set from Admin › Integrations)');
  else perform vault.update_secret(sid, p_value); end if;
end $$;
create or replace function public.wa_secret_delete(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_name not in ('wa_app_secret', 'wa_access_token', 'wa_verify_token') then raise exception 'unknown secret'; end if;
  delete from vault.secrets where name = p_name;
end $$;
-- Which secrets exist (never their values).
create or replace function public.wa_secret_status() returns table (name text, present boolean)
language sql stable security definer set search_path = '' as $$
  select n.name, exists (select 1 from vault.secrets s where s.name = n.name) from (values ('wa_app_secret'), ('wa_access_token'), ('wa_verify_token')) as n(name);
$$;
revoke all on function public.wa_secret_get(text), public.wa_secret_set(text, text), public.wa_secret_delete(text), public.wa_secret_status() from public, anon, authenticated;
grant execute on function public.wa_secret_get(text), public.wa_secret_set(text, text), public.wa_secret_delete(text), public.wa_secret_status() to service_role;

-- Health check every 6 hours: token validity and expiry, the number, and an email to the administrators when something is wrong.
select cron.unschedule('legal-staff-whatsapp-health') where exists (select 1 from cron.job where jobname = 'legal-staff-whatsapp-health');
select cron.schedule('legal-staff-whatsapp-health', '17 */6 * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/whatsapp/health',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb);
$job$);

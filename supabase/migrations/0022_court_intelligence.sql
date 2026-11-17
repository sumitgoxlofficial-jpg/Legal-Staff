-- Legal Staff — court-record engine: provider registry, verified case records, change detection, API cost control.
-- Apply after 0001–0021. Safe to run more than once.
--
-- What it adds
--   1. Reference data: courts, tribunals, court_providers, provider_capabilities (which provider covers which court and operation).
--   2. Verified records: legal_cases, case_parties, case_advocates, case_hearings, case_orders, case_documents, case_snapshots.
--   3. Audit and operations: verification_logs (append-only), api_usage_logs, api_cost_records, api_budget_settings, notification_events,
--      provider_health_logs, court_jobs (the queue and its dead-letter state), api_response_cache, api_inflight.
--   4. Functions: court_budget_reserve / court_budget_refund (atomic spend control), court_claim / court_release (duplicate-request
--      block), court_api_key / court_set_api_key (the paid provider's key lives in Vault, so it can be rotated without a deploy).
--   5. A job that asks functions/court-sync to check due cases every 6 hours.
-- Row level security: firm members read their own firm's case data; reference tables are readable by any signed-in user;
-- usage, cost, budget and health tables are readable by platform administrators only. Every write is made by functions/court-sync
-- with the service role: nothing here is writable from the browser.

-- ---------- 1. reference data ----------
create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('supreme', 'high_court', 'district', 'tribunal')),
  state text not null default '',
  active boolean not null default true
);
create table if not exists public.tribunals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  note text not null default ''
);
create table if not exists public.court_providers (
  key text primary key,
  name text not null,
  kind text not null check (kind in ('official', 'paid')),
  enabled boolean not null default true,
  priority integer not null default 100,       -- lower runs first
  circuit_open_until timestamptz,              -- circuit breaker: no calls before this time
  settings jsonb not null default '{}'::jsonb, -- never holds a secret
  updated_at timestamptz not null default now()
);
create table if not exists public.provider_capabilities (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.court_providers(key) on delete cascade,
  category text not null check (category in ('supreme', 'high_court', 'district', 'tribunal')),
  court_code text not null default '',         -- '' = the whole category; otherwise a tribunal code such as NCLT
  operation text not null,
  supported boolean not null default true,
  notes text not null default '',
  verified_at timestamptz,                     -- set only after we ran a real call against this provider for this combination
  unique (provider_key, category, court_code, operation)
);

-- ---------- 2. verified case records ----------
create table if not exists public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  record_id text not null,                     -- the case's id in public.records
  identifier_kind text not null default 'cnr' check (identifier_kind in ('cnr', 'case_number', 'filing_number', 'diary_number')),
  cnr text not null default '',
  case_number text not null default '',
  filing_number text not null default '',
  diary_number text not null default '',
  category text not null default 'district',
  tribunal text not null default '',
  court_code text not null default '',
  court_name text not null default '',
  case_type text not null default '',
  title text not null default '',
  filing_date date,
  registration_date date,
  status text not null default '',
  next_hearing_date date,
  last_hearing_date date,
  source_url text not null default '',
  source_provider text not null default '',
  state text not null default 'active' check (state in ('active', 'inactive', 'closed')),
  verification_status text not null default 'PENDING' check (verification_status in ('VERIFIED', 'PENDING', 'STALE', 'FAILED', 'MANUAL REVIEW', 'PARTIAL')),
  verification_note text not null default '',
  last_checked_at timestamptz,                 -- last attempt
  last_verified_at timestamptz,                -- last time a matching record was retrieved
  last_changed_at timestamptz,
  next_check_at timestamptz not null default now(),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  unique (firm_id, record_id)
);
create index if not exists legal_cases_cnr_idx on public.legal_cases (cnr);
create index if not exists legal_cases_number_idx on public.legal_cases (case_number);
create index if not exists legal_cases_court_idx on public.legal_cases (court_code);
create index if not exists legal_cases_verified_idx on public.legal_cases (last_verified_at);
create index if not exists legal_cases_due_idx on public.legal_cases (next_check_at) where state <> 'closed';
create index if not exists legal_cases_firm_idx on public.legal_cases (firm_id, verification_status);

create table if not exists public.case_parties (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  role text not null check (role in ('petitioner', 'respondent')),
  name text not null,
  unique (case_id, role, name)
);
create table if not exists public.case_advocates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  side text not null check (side in ('petitioner', 'respondent')),
  name text not null,
  unique (case_id, side, name)
);
create table if not exists public.case_hearings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  hearing_date date not null,
  purpose text not null default '',
  judge text not null default '',
  source text not null default '',
  unique (case_id, hearing_date, purpose)
);
create table if not exists public.case_orders (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  order_date date not null,
  order_type text not null default 'Order',
  file_name text not null default '',
  source_url text not null default '',
  fetched_at timestamptz not null default now(),
  unique (case_id, order_date, file_name)
);
create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  kind text not null default 'order',
  name text not null,
  url text not null default '',
  content_hash text not null default '',
  created_at timestamptz not null default now()
);
-- Every verified retrieval keeps the previous state: snapshots are never edited or deleted (see the trigger below).
create table if not exists public.case_snapshots (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  provider_key text not null,
  taken_at timestamptz not null default now(),
  payload jsonb not null,
  payload_hash text not null
);
create index if not exists case_snapshots_case_idx on public.case_snapshots (case_id, taken_at desc);

-- ---------- 3. audit and operations ----------
create table if not exists public.verification_logs (
  id bigint generated always as identity primary key,
  firm_id uuid,
  case_id uuid,
  provider_key text not null default '',
  operation text not null default '',
  outcome text not null,                       -- ok | cached | deduped | blocked | failed | manual
  status text not null default '',             -- the verification status this attempt resulted in
  message text not null default '',
  request_key text not null default '',
  actor uuid,                                  -- the member who asked; null for the scheduler
  retrieved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists verification_logs_case_idx on public.verification_logs (case_id, created_at desc);

create table if not exists public.api_usage_logs (
  id bigint generated always as identity primary key,
  provider_key text not null,
  endpoint text not null,
  request_key text not null default '',
  firm_id uuid,
  case_id uuid,
  http_status integer not null default 0,
  billable boolean not null default false,
  cost_paise integer not null default 0,
  cached boolean not null default false,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists api_usage_logs_month_idx on public.api_usage_logs (provider_key, created_at desc);

create table if not exists public.api_cost_records (
  month text not null,                         -- IST month, YYYY-MM
  provider_key text not null,
  endpoint text not null,
  requests integer not null default 0,
  cost_paise bigint not null default 0,
  primary key (month, provider_key, endpoint)
);
create table if not exists public.api_budget_settings (
  provider_key text primary key references public.court_providers(key) on delete cascade,
  monthly_budget_paise bigint not null default 100000,   -- Rs 1,000
  stop_on_limit boolean not null default true,
  override_until timestamptz,                  -- an administrator's explicit, time-limited authorisation to exceed the budget
  override_by uuid,
  override_reason text not null default '',
  plan text not null default 'payg' check (plan in ('payg', 'enterprise')),
  upcoming_hours integer not null default 12,
  active_hours integer not null default 24,
  inactive_hours integer not null default 168,
  closed_hours integer not null default 720,
  max_age_hours integer not null default 24,
  updated_at timestamptz not null default now()
);
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  case_id uuid references public.legal_cases(id) on delete cascade,
  kind text not null,
  title text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notification_events_firm_idx on public.notification_events (firm_id, created_at desc);
create table if not exists public.provider_health_logs (
  id bigint generated always as identity primary key,
  provider_key text not null,
  checked_at timestamptz not null default now(),
  ok boolean not null,
  latency_ms integer not null default 0,
  status_code integer not null default 0,
  message text not null default ''
);
create index if not exists provider_health_idx on public.provider_health_logs (provider_key, checked_at desc);

-- The queue. A job that fails repeatedly is parked as 'dead' (the dead-letter queue) until an administrator retries it.
create table if not exists public.court_jobs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  firm_id uuid not null,
  reason text not null default 'scheduled',    -- scheduled | requested | retry
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'dead')),
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  last_error text not null default '',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists court_jobs_run_idx on public.court_jobs (status, run_after);
create unique index if not exists court_jobs_one_open_idx on public.court_jobs (case_id) where status in ('queued', 'running');

create table if not exists public.api_response_cache (
  request_key text primary key,
  provider_key text not null,
  payload jsonb not null,
  etag text not null default '',
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists public.api_inflight (
  request_key text primary key,
  locked_at timestamptz not null default now()
);

-- ---------- append-only audit ----------
create or replace function public.court_no_edit() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'This history is append-only.' using errcode = '42501'; end $$;
drop trigger if exists verification_logs_append_only on public.verification_logs;
create trigger verification_logs_append_only before update or delete on public.verification_logs for each row execute function public.court_no_edit();
drop trigger if exists case_snapshots_append_only on public.case_snapshots;
create trigger case_snapshots_append_only before update on public.case_snapshots for each row execute function public.court_no_edit();
-- (snapshots go when their case is deleted: that is a cascade delete of the case, not an edit.)

-- ---------- row level security ----------
alter table public.courts enable row level security;
alter table public.tribunals enable row level security;
alter table public.court_providers enable row level security;
alter table public.provider_capabilities enable row level security;
alter table public.legal_cases enable row level security;
alter table public.case_parties enable row level security;
alter table public.case_advocates enable row level security;
alter table public.case_hearings enable row level security;
alter table public.case_orders enable row level security;
alter table public.case_documents enable row level security;
alter table public.case_snapshots enable row level security;
alter table public.verification_logs enable row level security;
alter table public.api_usage_logs enable row level security;
alter table public.api_cost_records enable row level security;
alter table public.api_budget_settings enable row level security;
alter table public.notification_events enable row level security;
alter table public.provider_health_logs enable row level security;
alter table public.court_jobs enable row level security;
alter table public.api_response_cache enable row level security;
alter table public.api_inflight enable row level security;

drop policy if exists courts_read on public.courts;
create policy courts_read on public.courts for select to authenticated using (true);
drop policy if exists tribunals_read on public.tribunals;
create policy tribunals_read on public.tribunals for select to authenticated using (true);
drop policy if exists providers_read on public.court_providers;
create policy providers_read on public.court_providers for select to authenticated using (true);
drop policy if exists capabilities_read on public.provider_capabilities;
create policy capabilities_read on public.provider_capabilities for select to authenticated using (true);
drop policy if exists legal_cases_read on public.legal_cases;
create policy legal_cases_read on public.legal_cases for select to authenticated using (public.is_member(firm_id));
drop policy if exists case_parties_read on public.case_parties;
create policy case_parties_read on public.case_parties for select to authenticated using (exists (select 1 from public.legal_cases c where c.id = case_id and public.is_member(c.firm_id)));
drop policy if exists case_advocates_read on public.case_advocates;
create policy case_advocates_read on public.case_advocates for select to authenticated using (exists (select 1 from public.legal_cases c where c.id = case_id and public.is_member(c.firm_id)));
drop policy if exists case_hearings_read on public.case_hearings;
create policy case_hearings_read on public.case_hearings for select to authenticated using (exists (select 1 from public.legal_cases c where c.id = case_id and public.is_member(c.firm_id)));
drop policy if exists case_orders_read on public.case_orders;
create policy case_orders_read on public.case_orders for select to authenticated using (exists (select 1 from public.legal_cases c where c.id = case_id and public.is_member(c.firm_id)));
drop policy if exists case_documents_read on public.case_documents;
create policy case_documents_read on public.case_documents for select to authenticated using (exists (select 1 from public.legal_cases c where c.id = case_id and public.is_member(c.firm_id)));
drop policy if exists case_snapshots_read on public.case_snapshots;
create policy case_snapshots_read on public.case_snapshots for select to authenticated using (exists (select 1 from public.legal_cases c where c.id = case_id and public.is_member(c.firm_id)));
drop policy if exists verification_logs_read on public.verification_logs;
create policy verification_logs_read on public.verification_logs for select to authenticated using (public.is_platform_admin() or (firm_id is not null and public.is_member(firm_id)));
drop policy if exists notification_events_read on public.notification_events;
create policy notification_events_read on public.notification_events for select to authenticated using (public.is_member(firm_id));
drop policy if exists api_usage_admin on public.api_usage_logs;
create policy api_usage_admin on public.api_usage_logs for select to authenticated using (public.is_platform_admin());
drop policy if exists api_cost_admin on public.api_cost_records;
create policy api_cost_admin on public.api_cost_records for select to authenticated using (public.is_platform_admin());
drop policy if exists api_budget_admin on public.api_budget_settings;
create policy api_budget_admin on public.api_budget_settings for select to authenticated using (public.is_platform_admin());
drop policy if exists provider_health_admin on public.provider_health_logs;
create policy provider_health_admin on public.provider_health_logs for select to authenticated using (public.is_platform_admin());
drop policy if exists court_jobs_admin on public.court_jobs;
create policy court_jobs_admin on public.court_jobs for select to authenticated using (public.is_platform_admin() or public.is_member(firm_id));
-- api_response_cache and api_inflight have no policy: only the service role can touch them.

-- ---------- spend control ----------
create or replace function public.court_ist_month() returns text
language sql immutable set search_path = '' as $$ select to_char((now() at time zone 'utc') + interval '5 hours 30 minutes', 'YYYY-MM'); $$;

-- Reserves cost_paise against this month's budget in one atomic step, so two requests cannot both spend the last rupee.
-- Returns true when the call may go ahead (the amount is counted at once; court_budget_refund gives it back if the call is not billed).
create or replace function public.court_budget_reserve(p_provider text, p_endpoint text, p_cost integer, p_limit_override bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.api_budget_settings; m text := public.court_ist_month(); spent bigint; lim bigint; ovr boolean;
begin
  select * into b from public.api_budget_settings where provider_key = p_provider for update;
  lim := coalesce(p_limit_override, b.monthly_budget_paise, 100000);
  select coalesce(sum(cost_paise), 0) into spent from public.api_cost_records where month = m and provider_key = p_provider;
  ovr := b.override_until is not null and b.override_until > now();
  if coalesce(b.stop_on_limit, true) and not ovr and spent + p_cost > lim then
    return jsonb_build_object('allow', false, 'spent', spent, 'limit', lim);
  end if;
  insert into public.api_cost_records as r (month, provider_key, endpoint, requests, cost_paise) values (m, p_provider, p_endpoint, 1, p_cost)
    on conflict (month, provider_key, endpoint) do update set requests = r.requests + 1, cost_paise = r.cost_paise + excluded.cost_paise;
  return jsonb_build_object('allow', true, 'spent', spent + p_cost, 'limit', lim, 'overridden', spent + p_cost > lim);
end $$;
create or replace function public.court_budget_refund(p_provider text, p_endpoint text, p_cost integer) returns void
language sql security definer set search_path = '' as $$
  update public.api_cost_records set requests = greatest(0, requests - 1), cost_paise = greatest(0, cost_paise - p_cost)
   where month = public.court_ist_month() and provider_key = p_provider and endpoint = p_endpoint;
$$;

-- ---------- duplicate-request block ----------
-- True for the first caller; false while an identical request is still running (the lock lapses after p_ttl seconds).
create or replace function public.court_claim(p_key text, p_ttl integer default 90) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.api_inflight as i (request_key, locked_at) values (p_key, now())
    on conflict (request_key) do update set locked_at = now() where i.locked_at < now() - make_interval(secs => p_ttl);
  get diagnostics n = row_count; return n > 0;
end $$;
create or replace function public.court_release(p_key text) returns void
language sql security definer set search_path = '' as $$ delete from public.api_inflight where request_key = p_key; $$;

-- ---------- the paid provider's key, in Vault ----------
create or replace function public.court_api_key() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'court_api_key' order by created_at desc limit 1;
$$;
create or replace function public.court_set_api_key(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare id uuid;
begin
  select s.id into id from vault.secrets s where s.name = 'court_api_key' limit 1;
  if id is null then perform vault.create_secret(p_key, 'court_api_key', 'Court-data provider API key (rotate from the Court Intelligence admin panel)');
  else perform vault.update_secret(id, p_key); end if;
end $$;
create or replace function public.court_has_api_key() returns boolean
language sql stable security definer set search_path = '' as $$ select exists (select 1 from vault.secrets where name = 'court_api_key'); $$;
-- These are for the court-sync function (service role) only.
revoke all on function public.court_budget_reserve(text, text, integer, bigint), public.court_budget_refund(text, text, integer), public.court_claim(text, integer),
  public.court_release(text), public.court_api_key(), public.court_set_api_key(text), public.court_has_api_key() from public, anon, authenticated;
grant execute on function public.court_budget_reserve(text, text, integer, bigint), public.court_budget_refund(text, text, integer), public.court_claim(text, integer),
  public.court_release(text), public.court_api_key(), public.court_set_api_key(text), public.court_has_api_key() to service_role;

-- ---------- seed data ----------
insert into public.court_providers (key, name, kind, enabled, priority) values
  ('official_manual', 'Official portals (manual verification)', 'official', true, 10),
  ('ecourtsindia', 'eCourtsIndia API', 'paid', true, 50)
on conflict (key) do nothing;
insert into public.api_budget_settings (provider_key) values ('ecourtsindia') on conflict do nothing;

insert into public.tribunals (code, name) values
  ('NCLT', 'National Company Law Tribunal'), ('NCLAT', 'National Company Law Appellate Tribunal'), ('DRT', 'Debts Recovery Tribunal'), ('DRAT', 'Debts Recovery Appellate Tribunal'),
  ('CAT', 'Central Administrative Tribunal'), ('ITAT', 'Income Tax Appellate Tribunal'), ('CESTAT', 'Customs, Excise and Service Tax Appellate Tribunal'), ('NGT', 'National Green Tribunal'),
  ('AFT', 'Armed Forces Tribunal'), ('SAT', 'Securities Appellate Tribunal'), ('TDSAT', 'Telecom Disputes Settlement and Appellate Tribunal'), ('CONSUMER', 'Consumer Commissions (e-Jagriti)'),
  ('APTEL', 'Appellate Tribunal for Electricity'), ('GSTAT', 'Goods and Services Tax Appellate Tribunal')
on conflict (code) do nothing;
insert into public.courts (code, name, category) values
  ('SCI', 'Supreme Court of India', 'supreme'), ('HC', 'High Courts (all)', 'high_court'), ('DC', 'District and subordinate courts', 'district')
on conflict (code) do nothing;

-- What each provider says it covers. verified_at stays empty until a real call has been made for that combination.
insert into public.provider_capabilities (provider_key, category, court_code, operation, supported, notes)
select 'ecourtsindia', c, '', o, true, 'Listed in the provider''s published coverage; not yet integration-tested here'
from unnest(array['supreme', 'high_court', 'district']) c, unnest(array['case_detail', 'refresh']) o
on conflict do nothing;
insert into public.provider_capabilities (provider_key, category, court_code, operation, supported, notes)
select 'ecourtsindia', 'tribunal', t.code, o, true, 'Listed in the provider''s published coverage; tribunal CNRs are minted by the provider. Not yet integration-tested here'
from public.tribunals t, unnest(array['case_detail', 'refresh']) o
on conflict do nothing;
insert into public.provider_capabilities (provider_key, category, court_code, operation, supported, notes)
select 'official_manual', c, '', 'portal_link', true, 'Links to the official portal; no automated lookup (the portals use CAPTCHA, which is not bypassed)'
from unnest(array['supreme', 'high_court', 'district', 'tribunal']) c
on conflict do nothing;

-- ---------- scheduler: every 6 hours, 15 minutes past the hour ----------
create extension if not exists pg_cron;
select cron.unschedule('legal-staff-court-sync') where exists (select 1 from cron.job where jobname = 'legal-staff-court-sync');
select cron.schedule('legal-staff-court-sync', '15 */6 * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/court-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"sync"}'::jsonb);
$job$);

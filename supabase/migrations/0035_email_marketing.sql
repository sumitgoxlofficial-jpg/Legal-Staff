-- Legal Staff — Email Marketing Automation module (admin.html → "Email Marketing", functions/email-marketing).
-- Apply after 0001–0023. Safe to run more than once.
--
-- Principles
--   * Google Sheets is the import/source system; this database owns consent, queues, logs and automation state.
--   * Public-directory contacts are imported with consent_status = UNKNOWN and first_email_status = BLOCKED and stay blocked until a
--     documented, verified marketing consent is recorded (email_apply_consent).
--   * Production sending is OFF by default: SYSTEM_ENABLED, LEGAL_APPROVAL and PROVIDER_APPROVED are false, DRY_RUN is true.
--   * Every table is server-side only (row level security on, no policies): the browser never reads or writes them directly;
--     functions/email-marketing uses the service role after checking super_admins.

-- ---------- 1. settings (single row) ----------
create table if not exists public.email_automation_settings (
  id integer primary key default 1 check (id = 1),
  system_enabled boolean not null default false,
  legal_approval boolean not null default false,
  legal_approval_ref text not null default '',       -- where the legal approval is documented
  provider_approved boolean not null default false,
  provider_approval_ref text not null default '',
  dry_run boolean not null default true,
  kill_switch boolean not null default false,        -- emergency: nothing is sent while true
  max_new_per_day integer not null default 100 check (max_new_per_day between 0 and 5000),
  max_reminders_per_day integer not null default 100 check (max_reminders_per_day between 0 and 5000),
  new_email_time text not null default '10:00' check (new_email_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  reminder_time text not null default '15:00' check (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  report_time text not null default '20:00' check (report_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  reminder_after_days integer not null default 5 check (reminder_after_days between 1 and 60),
  max_reminders integer not null default 2 check (max_reminders between 0 and 5),
  timezone text not null default 'Asia/Kolkata',
  sheet_sync_hours integer not null default 24 check (sheet_sync_hours between 1 and 168),
  report_to text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
insert into public.email_automation_settings (id) values (1) on conflict do nothing;

create table if not exists public.email_provider_settings (
  id integer primary key default 1 check (id = 1),
  provider text not null default 'brevo' check (provider in ('brevo')),
  sender_email text not null default '',
  sender_name text not null default 'Legal Staff',
  reply_to text not null default '',
  sender_domain text not null default '',
  spf_ok boolean, dkim_ok boolean, dmarc_ok boolean,  -- result of the last DNS check (null = never checked)
  dns_checked_at timestamptz,
  domain_authenticated boolean not null default false, -- true only when SPF, DKIM and DMARC all passed
  updated_at timestamptz not null default now()
);
insert into public.email_provider_settings (id) values (1) on conflict do nothing;

-- ---------- 2. Google Sheets ----------
create table if not exists public.google_sheets_integrations (
  id uuid primary key default gen_random_uuid(),
  spreadsheet_id text not null unique,
  spreadsheet_url text not null default '',
  spreadsheet_title text not null default '',
  sheet_name text not null default '',
  column_map jsonb not null default '{}'::jsonb,      -- { field: "Column header" }
  sync_enabled boolean not null default false,
  last_sync_at timestamptz,
  last_sync_status text not null default 'never',
  last_sync_summary jsonb not null default '{}'::jsonb,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_import_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.google_sheets_integrations(id) on delete set null,
  trigger text not null default 'manual' check (trigger in ('manual', 'scheduled', 'preview')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  rows_read integer not null default 0,
  rows_new integer not null default 0,
  rows_updated integer not null default 0,
  rows_duplicate integer not null default 0,        -- repeated email inside the sheet
  rows_invalid integer not null default 0,
  consents_recognised integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  started_by text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists email_import_runs_started_idx on public.email_import_runs (started_at desc);

-- ---------- 3. contacts ----------
create sequence if not exists public.email_contact_seq;
create table if not exists public.email_contacts (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null unique default ('LSC-' || lpad(nextval('public.email_contact_seq')::text, 6, '0')),
  advocate_name text not null default '',
  email text not null,
  email_normalized text not null unique check (email_normalized = lower(btrim(email_normalized))),
  city text not null default '',
  state text not null default '',
  contact_source text not null default '',
  source_url text not null default '',
  integration_id uuid references public.google_sheets_integrations(id) on delete set null,
  import_run_id uuid references public.email_import_runs(id) on delete set null,
  sheet_row integer,
  consent_status text not null default 'UNKNOWN' check (consent_status in ('UNKNOWN', 'GRANTED', 'WITHDRAWN')),
  consent_source text not null default '',
  consent_timestamp timestamptz,
  consent_verified_at timestamptz,                  -- the email address was verified (e.g. confirmation link)
  first_email_status text not null default 'BLOCKED' check (first_email_status in ('BLOCKED', 'ELIGIBLE', 'QUEUED', 'SENT', 'FAILED')),
  first_email_date timestamptz,
  reminder_due_date date,
  reminder_count integer not null default 0 check (reminder_count >= 0),
  registration_status text not null default 'NONE' check (registration_status in ('NONE', 'STARTED', 'COMPLETED')),
  payment_status text not null default 'NONE' check (payment_status in ('NONE', 'PAID')),
  profile_verified boolean not null default false,
  unsubscribe_status text not null default 'SUBSCRIBED' check (unsubscribe_status in ('SUBSCRIBED', 'UNSUBSCRIBED')),
  hard_bounced boolean not null default false,
  spam_complaint boolean not null default false,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists email_contacts_state_idx on public.email_contacts (state, city);
create index if not exists email_contacts_first_idx on public.email_contacts (first_email_status, consent_status);
create index if not exists email_contacts_reminder_idx on public.email_contacts (reminder_due_date) where first_email_status = 'SENT';
create index if not exists email_contacts_name_idx on public.email_contacts (lower(advocate_name));

-- ---------- 4. consent audit trail ----------
create table if not exists public.email_consents (
  consent_id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.email_contacts(id) on delete cascade,
  email text not null,
  purpose text not null default 'marketing' check (purpose in ('marketing', 'transactional')),
  consent_source text not null check (length(btrim(consent_source)) > 0),
  wording_version text not null default '',
  consented_at timestamptz not null,
  verified_at timestamptz,
  withdrawn_at timestamptz,
  evidence_ref text not null default '',
  recorded_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists email_consents_contact_idx on public.email_consents (contact_id, purpose);

-- ---------- 5. templates and campaigns ----------
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  name text not null,
  subject text not null,
  body_html text not null,
  body_text text not null default '',
  active boolean not null default false,            -- promotional templates stay inactive until legal approval
  version integer not null default 1,
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                         -- e.g. new_intro, reminder_1, reminder_2 (also the UTM campaign)
  name text not null,
  kind text not null check (kind in ('new', 'reminder')),
  step integer not null default 0,                   -- 0 = first email, 1 = first reminder, 2 = final reminder
  template_key text not null references public.email_templates(key),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 6. queue, logs, events, suppressions ----------
create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id),
  contact_id uuid not null references public.email_contacts(id) on delete cascade,
  scheduled_date date not null,                      -- IST day the email is meant for
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'skipped', 'failed')),
  skip_reason text not null default '',
  attempts integer not null default 0,
  provider_message_id text,
  idempotency_key text not null unique,              -- campaign:contact, so the same campaign can never be queued twice
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);
create index if not exists email_queue_campaign_idx on public.email_queue (campaign_id);
create index if not exists email_queue_contact_idx on public.email_queue (contact_id);
create index if not exists email_queue_sched_idx on public.email_queue (scheduled_date, status);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.email_queue(id) on delete set null,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  contact_id uuid references public.email_contacts(id) on delete set null,
  to_email text not null,
  subject text not null default '',
  status text not null check (status in ('accepted', 'failed', 'skipped')),
  provider text not null default 'brevo',
  provider_message_id text,
  error text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists email_logs_campaign_idx on public.email_logs (campaign_id);
create index if not exists email_logs_contact_idx on public.email_logs (contact_id);
create index if not exists email_logs_created_idx on public.email_logs (created_at desc);
create unique index if not exists email_logs_msg_idx on public.email_logs (provider_message_id) where provider_message_id is not null;

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('email_queued', 'email_accepted', 'email_delivered', 'email_failed', 'email_bounced', 'email_clicked',
    'email_unsubscribed', 'email_complaint', 'registration_started', 'registration_completed', 'payment_success', 'profile_verified')),
  contact_id uuid references public.email_contacts(id) on delete cascade,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  queue_id uuid references public.email_queue(id) on delete set null,
  provider_message_id text,
  meta jsonb not null default '{}'::jsonb,
  dedupe_key text unique,                            -- webhook retries and repeated triggers never double count
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists email_events_campaign_idx on public.email_events (campaign_id, event_type);
create index if not exists email_events_contact_idx on public.email_events (contact_id, event_type);
create index if not exists email_events_time_idx on public.email_events (occurred_at desc);

create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique,
  contact_id uuid references public.email_contacts(id) on delete set null,
  reason text not null check (reason in ('unsubscribed', 'hard_bounce', 'spam_complaint', 'invalid', 'manual')),
  source text not null default '',
  created_at timestamptz not null default now()
);

-- one row per scheduled job per day: the unique key is what stops two workers running the same job
create table if not exists public.email_job_runs (
  job_key text primary key,                          -- e.g. plan_new:2026-11-18
  kind text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

create table if not exists public.email_audit_logs (
  id bigint generated always as identity primary key,
  actor text not null default 'system',
  action text not null,
  target text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists email_audit_created_idx on public.email_audit_logs (created_at desc);
create or replace function public.email_audit_append_only() returns trigger language plpgsql as $$
begin raise exception 'email_audit_logs is append-only'; end $$;
drop trigger if exists email_audit_no_change on public.email_audit_logs;
create trigger email_audit_no_change before update or delete on public.email_audit_logs for each row execute function public.email_audit_append_only();

-- ---------- 7. row level security: server only ----------
do $$ declare t text; begin
  foreach t in array array['email_automation_settings','email_provider_settings','google_sheets_integrations','email_import_runs','email_contacts','email_consents',
    'email_templates','email_campaigns','email_queue','email_logs','email_events','email_suppressions','email_job_runs','email_audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  grant usage, select on sequence public.email_contact_seq to service_role;
  grant usage, select on sequence public.email_audit_logs_id_seq to service_role;
end $$;

-- ---------- 8. functions (service role only) ----------
create or replace function public.email_norm(p text) returns text language sql immutable as $$ select lower(btrim(coalesce(p, ''))) $$;

-- Imports a chunk of sheet rows. New contacts are always UNKNOWN + BLOCKED; existing contacts only have their descriptive fields refreshed.
-- Consent columns in the sheet are recognised only when they carry a source, a timestamp and an evidence reference, and the source is not a public one.
-- Returns counts: new, updated, duplicate (same email twice in this chunk), invalid, consents.
create or replace function public.email_import_rows(p_run uuid, p_integration uuid, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; n text; c public.email_contacts; existed boolean; seen text[] := '{}';
  v_new int := 0; v_upd int := 0; v_dup int := 0; v_bad int := 0; v_cons int := 0; errs jsonb := '[]'::jsonb;
  cs text; cts timestamptz; cev text; cver timestamptz; cwv text;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    n := public.email_norm(r->>'email');
    if n !~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' or length(n) > 254 then
      v_bad := v_bad + 1; if jsonb_array_length(errs) < 50 then errs := errs || jsonb_build_object('row', r->'row', 'error', 'Invalid email address', 'value', left(coalesce(r->>'email', ''), 80)); end if; continue; end if;
    if n = any(seen) then v_dup := v_dup + 1; continue; end if;
    seen := seen || n;
    select * into c from public.email_contacts where email_normalized = n;
    existed := found;
    if existed then
      update public.email_contacts set advocate_name = coalesce(nullif(btrim(r->>'advocate_name'), ''), advocate_name), city = coalesce(nullif(btrim(r->>'city'), ''), city),
        state = coalesce(nullif(btrim(r->>'state'), ''), state), contact_source = coalesce(nullif(btrim(r->>'contact_source'), ''), contact_source),
        source_url = coalesce(nullif(btrim(r->>'source_url'), ''), source_url), integration_id = p_integration, import_run_id = p_run,
        sheet_row = nullif(r->>'row', '')::int, last_updated = now() where id = c.id;
      v_upd := v_upd + 1;
    else
      insert into public.email_contacts (advocate_name, email, email_normalized, city, state, contact_source, source_url, integration_id, import_run_id, sheet_row)
        values (left(btrim(coalesce(r->>'advocate_name', '')), 200), left(btrim(r->>'email'), 254), n, left(btrim(coalesce(r->>'city', '')), 100), left(btrim(coalesce(r->>'state', '')), 100),
          left(btrim(coalesce(r->>'contact_source', '')), 100), left(btrim(coalesce(r->>'source_url', '')), 500), p_integration, p_run, nullif(r->>'row', '')::int)
        returning * into c;
      v_new := v_new + 1;
    end if;
    -- optional consent evidence carried in the sheet
    cs := btrim(coalesce(r->>'consent_source', '')); cev := btrim(coalesce(r->>'consent_evidence_ref', '')); cwv := btrim(coalesce(r->>'consent_wording_version', ''));
    begin cts := nullif(btrim(coalesce(r->>'consent_timestamp', '')), '')::timestamptz; exception when others then cts := null; end;
    begin cver := nullif(btrim(coalesce(r->>'consent_verified_at', '')), '')::timestamptz; exception when others then cver := null; end;
    if cs <> '' and cev <> '' and cts is not null and cts <= now() and cs !~* '(public|directory|website|scrap|bar.?council|web|google|justdial|indiankanoon)' and c.consent_status <> 'GRANTED' and c.consent_status <> 'WITHDRAWN' then
      perform public.email_apply_consent(c.id, cs, cwv, cts, cver, cev, 'sheet-import');
      v_cons := v_cons + 1;
    end if;
  end loop;
  return jsonb_build_object('new', v_new, 'updated', v_upd, 'duplicate', v_dup, 'invalid', v_bad, 'consents', v_cons, 'errors', errs);
end $$;

-- Records a marketing consent and recomputes the contact's state. Never re-enables a suppressed address.
create or replace function public.email_apply_consent(p_contact uuid, p_source text, p_wording text, p_at timestamptz, p_verified timestamptz, p_evidence text, p_by text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.email_contacts; cid uuid;
begin
  if coalesce(btrim(p_source), '') = '' or coalesce(btrim(p_evidence), '') = '' or p_at is null then raise exception 'A consent needs a source, a date and an evidence reference'; end if;
  select * into c from public.email_contacts where id = p_contact for update;
  if not found then raise exception 'Unknown contact'; end if;
  if exists (select 1 from public.email_suppressions where email_normalized = c.email_normalized) then raise exception 'This address is suppressed (unsubscribed, bounced or complained). Lift an unsubscribe first, with documented fresh permission.'; end if;
  insert into public.email_consents (contact_id, email, purpose, consent_source, wording_version, consented_at, verified_at, evidence_ref, recorded_by)
    values (c.id, c.email_normalized, 'marketing', btrim(p_source), coalesce(p_wording, ''), p_at, p_verified, btrim(p_evidence), coalesce(p_by, '')) returning consent_id into cid;
  update public.email_contacts set consent_status = 'GRANTED', consent_source = btrim(p_source), consent_timestamp = p_at, consent_verified_at = p_verified,
    first_email_status = case when first_email_status = 'BLOCKED' and p_verified is not null and unsubscribe_status = 'SUBSCRIBED' and not hard_bounced and not spam_complaint then 'ELIGIBLE' else first_email_status end,
    last_updated = now() where id = c.id;
  insert into public.email_audit_logs (actor, action, target, details) values (coalesce(p_by, 'system'), 'consent_recorded', c.contact_id, jsonb_build_object('consent_id', cid, 'source', p_source, 'verified', p_verified is not null));
  return cid;
end $$;

-- Verifies the email of an already-recorded consent (e.g. the person clicked a confirmation link).
create or replace function public.email_verify_consent(p_contact uuid, p_at timestamptz, p_by text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.email_contacts;
begin
  select * into c from public.email_contacts where id = p_contact for update;
  if not found or c.consent_status <> 'GRANTED' then raise exception 'There is no granted consent to verify'; end if;
  update public.email_consents set verified_at = coalesce(verified_at, p_at) where contact_id = c.id and purpose = 'marketing' and withdrawn_at is null;
  update public.email_contacts set consent_verified_at = coalesce(consent_verified_at, p_at),
    first_email_status = case when first_email_status = 'BLOCKED' and unsubscribe_status = 'SUBSCRIBED' and not hard_bounced and not spam_complaint then 'ELIGIBLE' else first_email_status end,
    last_updated = now() where id = c.id;
  insert into public.email_audit_logs (actor, action, target, details) values (coalesce(p_by, 'system'), 'consent_verified', c.contact_id, '{}'::jsonb);
end $$;

-- Immediate marketing suppression (unsubscribe, hard bounce, complaint, manual). Idempotent. Cancels anything still queued.
create or replace function public.email_suppress(p_email text, p_reason text, p_source text, p_actor text) returns void
language plpgsql security definer set search_path = public as $$
declare n text := public.email_norm(p_email); c public.email_contacts;
begin
  select * into c from public.email_contacts where email_normalized = n for update;
  insert into public.email_suppressions (email_normalized, contact_id, reason, source) values (n, c.id, p_reason, coalesce(p_source, ''))
    on conflict (email_normalized) do nothing;
  if c.id is not null then
    update public.email_contacts set
      unsubscribe_status = case when p_reason = 'unsubscribed' then 'UNSUBSCRIBED' else unsubscribe_status end,
      hard_bounced = hard_bounced or p_reason in ('hard_bounce', 'invalid'),
      spam_complaint = spam_complaint or p_reason = 'spam_complaint',
      first_email_status = case when first_email_status in ('ELIGIBLE', 'QUEUED') then 'BLOCKED' else first_email_status end,
      reminder_due_date = null, last_updated = now() where id = c.id;
    update public.email_queue set status = 'skipped', skip_reason = 'suppressed: ' || p_reason, updated_at = now() where contact_id = c.id and status = 'queued';
    update public.email_consents set withdrawn_at = coalesce(withdrawn_at, now()) where contact_id = c.id and purpose = 'marketing' and withdrawn_at is null and p_reason in ('unsubscribed', 'spam_complaint');
    if p_reason in ('unsubscribed', 'spam_complaint') then update public.email_contacts set consent_status = 'WITHDRAWN' where id = c.id; end if;
  end if;
  insert into public.email_audit_logs (actor, action, target, details) values (coalesce(p_actor, 'system'), 'suppressed', n, jsonb_build_object('reason', p_reason, 'source', p_source));
end $$;

-- Removes a suppression only for an UNSUBSCRIBED contact who has given fresh permission (a new consent must be recorded after this).
create or replace function public.email_lift_suppression(p_email text, p_actor text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare n text := public.email_norm(p_email); s public.email_suppressions;
begin
  select * into s from public.email_suppressions where email_normalized = n;
  if not found then raise exception 'Not suppressed'; end if;
  if s.reason <> 'unsubscribed' then raise exception 'Only an unsubscribe can be lifted, and only with fresh permission. Bounces and complaints stay suppressed.'; end if;
  if coalesce(btrim(p_note), '') = '' then raise exception 'Document the fresh permission (reference) first'; end if;
  delete from public.email_suppressions where id = s.id;
  update public.email_contacts set unsubscribe_status = 'SUBSCRIBED', consent_status = 'UNKNOWN', consent_verified_at = null, first_email_status = 'BLOCKED', last_updated = now() where email_normalized = n;
  insert into public.email_audit_logs (actor, action, target, details) values (coalesce(p_actor, 'system'), 'suppression_lifted', n, jsonb_build_object('note', p_note));
end $$;

-- Records a conversion event for a contact found by email (registration / payment / verification), once per event type, attributed to the
-- campaign of the most recent email that was sent to that contact.
create or replace function public.email_record_conversion(p_email text, p_event text, p_ref text, p_meta jsonb default '{}'::jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare n text := public.email_norm(p_email); c public.email_contacts; q public.email_queue; ins int;
begin
  if p_event not in ('registration_started', 'registration_completed', 'payment_success', 'profile_verified') then raise exception 'Unknown conversion event'; end if;
  select * into c from public.email_contacts where email_normalized = n;
  if not found then return false; end if;
  select * into q from public.email_queue where contact_id = c.id and status = 'sent' order by updated_at desc limit 1;
  insert into public.email_events (event_type, contact_id, campaign_id, queue_id, meta, dedupe_key)
    values (p_event, c.id, q.campaign_id, q.id, coalesce(p_meta, '{}'::jsonb), p_event || ':' || c.id || ':' || coalesce(nullif(p_ref, ''), 'once')) on conflict (dedupe_key) do nothing;
  get diagnostics ins = row_count;
  update public.email_contacts set
    registration_status = case when p_event = 'registration_completed' or p_event = 'payment_success' then 'COMPLETED' when p_event = 'registration_started' and registration_status = 'NONE' then 'STARTED' else registration_status end,
    payment_status = case when p_event = 'payment_success' then 'PAID' else payment_status end,
    profile_verified = profile_verified or p_event = 'profile_verified',
    reminder_due_date = case when p_event in ('registration_completed', 'payment_success') then null else reminder_due_date end,   -- registration stops promotional follow-ups
    first_email_status = case when p_event in ('registration_completed', 'payment_success') and first_email_status in ('ELIGIBLE', 'QUEUED') then 'BLOCKED' else first_email_status end,
    last_updated = now() where id = c.id;
  if p_event in ('registration_completed', 'payment_success') then
    update public.email_queue set status = 'skipped', skip_reason = 'converted', updated_at = now() where contact_id = c.id and status = 'queued';
  end if;
  return ins > 0;
end $$;

-- Registrations from the public directory: applicants whose email is in the contact list are attributed automatically.
create or replace function public.email_directory_hook() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.email, '') <> '' then
    if tg_op = 'INSERT' then perform public.email_record_conversion(new.email, 'registration_completed', new.id);
    elsif new.status = 'verified' and old.status is distinct from 'verified' then perform public.email_record_conversion(new.email, 'profile_verified', new.id); end if;
  end if;
  return new;
exception when others then return new;   -- attribution must never block a registration
end $$;
do $$ begin
  if to_regclass('public.directory_applications') is not null then
    drop trigger if exists email_directory_conversion on public.directory_applications;
    create trigger email_directory_conversion after insert or update of status on public.directory_applications for each row execute function public.email_directory_hook();
  end if;
end $$;

-- A contact is "ever contacted" when any send exists; used by the planner as a cheap guard.
revoke all on function public.email_import_rows(uuid, uuid, jsonb), public.email_apply_consent(uuid, text, text, timestamptz, timestamptz, text, text),
  public.email_verify_consent(uuid, timestamptz, text), public.email_suppress(text, text, text, text), public.email_lift_suppression(text, text, text),
  public.email_record_conversion(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.email_import_rows(uuid, uuid, jsonb), public.email_apply_consent(uuid, text, text, timestamptz, timestamptz, text, text),
  public.email_verify_consent(uuid, timestamptz, text), public.email_suppress(text, text, text, text), public.email_lift_suppression(text, text, text),
  public.email_record_conversion(text, text, text, jsonb) to service_role;

-- ---------- 9. seed: templates (INACTIVE until legal approval) and campaigns ----------
insert into public.email_templates (key, name, subject, body_html, body_text, active) values
('first_introduction', 'First introduction', 'Introducing Legal Staff – Your Advocate Profile for Just ₹49',
$h$<p>Dear Advocate {{advocate_name}},</p>
<p>We are pleased to introduce Legal Staff, a dedicated online directory designed to help advocates establish their professional presence online.</p>
<p>With Legal Staff, you can create a professional profile showcasing:</p>
<ul><li>Your name and professional photograph</li><li>Bar Council enrolment details</li><li>Courts where you practise</li><li>Areas of legal practice</li><li>Languages you speak</li><li>Document verification and profile status</li></ul>
<p><b>Special Lifetime Listing: Just ₹49 (One-Time Payment).</b><br>No monthly subscription.<br>No annual renewal.<br>No commission on your professional fees.</p>
<p>Explore the directory and registration details:<br><a href="{{directory_url}}">https://legalstaff.in/directory</a></p>
<p>Build your professional profile with Legal Staff.</p>
<p>Regards,<br>Team Legal Staff<br><a href="https://legalstaff.in">https://legalstaff.in</a></p>
<p>Unsubscribe: <a href="{{unsubscribe_url}}">{{unsubscribe_url}}</a></p>$h$,
$t$Dear Advocate {{advocate_name}},

We are pleased to introduce Legal Staff, a dedicated online directory designed to help advocates establish their professional presence online.

With Legal Staff, you can create a professional profile showcasing:
- Your name and professional photograph
- Bar Council enrolment details
- Courts where you practise
- Areas of legal practice
- Languages you speak
- Document verification and profile status

Special Lifetime Listing: Just ₹49 (One-Time Payment).
No monthly subscription.
No annual renewal.
No commission on your professional fees.

Explore the directory and registration details:
{{directory_url}}

Build your professional profile with Legal Staff.

Regards,
Team Legal Staff
https://legalstaff.in

Unsubscribe: {{unsubscribe_url}}$t$, false),
('reminder', 'Reminder', 'A Quick Reminder – Legal Staff Advocate Directory',
$h$<p>Dear Advocate {{advocate_name}},</p>
<p>We recently shared information about Legal Staff, an online directory for advocates.</p>
<p>If you have not yet reviewed the platform, you can explore its features and professional profile options.</p>
<p><b>Lifetime listing: ₹49 – One-Time Payment.</b></p>
<p>Your profile can showcase your professional details, courts, practice areas and enrolment information.</p>
<p>Explore Legal Staff:<br><a href="{{directory_url}}">https://legalstaff.in/directory</a></p>
<p>Thank you for your time.</p>
<p>Regards,<br>Team Legal Staff</p>
<p>Unsubscribe: <a href="{{unsubscribe_url}}">{{unsubscribe_url}}</a></p>$h$,
$t$Dear Advocate {{advocate_name}},

We recently shared information about Legal Staff, an online directory for advocates.

If you have not yet reviewed the platform, you can explore its features and professional profile options.

Lifetime listing: ₹49 – One-Time Payment.

Your profile can showcase your professional details, courts, practice areas and enrolment information.

Explore Legal Staff:
{{directory_url}}

Thank you for your time.

Regards,
Team Legal Staff

Unsubscribe: {{unsubscribe_url}}$t$, false),
('final_reminder', 'Final reminder', 'Final Reminder – Explore Legal Staff Directory',
$h$<p>Dear Advocate {{advocate_name}},</p>
<p>This is our final reminder about Legal Staff's advocate directory.</p>
<p>If you are interested in learning more about the platform, its profile features and the ₹49 one-time lifetime listing, please visit:<br><a href="{{directory_url}}">https://legalstaff.in/directory</a></p>
<p>We appreciate your time and consideration.</p>
<p>Regards,<br>Team Legal Staff</p>
<p>Unsubscribe: <a href="{{unsubscribe_url}}">{{unsubscribe_url}}</a></p>$h$,
$t$Dear Advocate {{advocate_name}},

This is our final reminder about Legal Staff's advocate directory.

If you are interested in learning more about the platform, its profile features and the ₹49 one-time lifetime listing, please visit:
{{directory_url}}

We appreciate your time and consideration.

Regards,
Team Legal Staff

Unsubscribe: {{unsubscribe_url}}$t$, false)
on conflict (key) do nothing;

insert into public.email_campaigns (code, name, kind, step, template_key) values
  ('new_intro', 'New email: first introduction', 'new', 0, 'first_introduction'),
  ('reminder_1', 'Reminder 1', 'reminder', 1, 'reminder'),
  ('reminder_2', 'Reminder 2: final', 'reminder', 2, 'final_reminder')
on conflict (code) do nothing;

-- ---------- 10. scheduler: one tick every 5 minutes; the function decides which job is due (times are admin-configurable) ----------
-- The function ignores ticks unless a job is due, so an extra tick costs nothing. Re-using the shared cron secret in Vault (migration 0003).
create extension if not exists pg_cron;
select cron.unschedule('legal-staff-email-tick') where exists (select 1 from cron.job where jobname = 'legal-staff-email-tick');
select cron.schedule('legal-staff-email-tick', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/email-marketing',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"tick"}'::jsonb);
$job$);

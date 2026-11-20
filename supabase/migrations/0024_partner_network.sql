-- Legal Staff — Advocate Partner Network (LAPN): partners, categories, referral attribution, commission ledger, payouts,
-- marketing, notifications, fraud flags, compliance approvals, role-based access, audit. Apply after 0001–0023. Safe to run more than once.
--
-- Design
--   * Every rule that matters (who may do what, what earns a commission, what may be paid) lives here, in the database, so no
--     browser, edge function or admin screen can bypass it. All tables are locked: no direct access for anon or authenticated.
--     The browser calls the partner_* functions (a signed-in partner, only ever their own data), the admin_* functions (staff,
--     checked per permission on every call) and a few public functions (partner_public_config, partner_validate_code, partner_track_click).
--   * The existing public.directory_applications table stays authoritative for advocates. This migration only adds two columns to it
--     (referral_code, visitor_token) and triggers that record attribution and re-evaluate the commission ledger. A failure in that
--     code is caught and logged, so advocate registration can never be broken by the partner network.
--   * Commission is OFF everywhere until legal approval is recorded for the category (a CHECK constraint, not just a screen rule).
--   * The listing price is NOT assumed: the live directory has no listing fee. The price stays unset until a super admin reconciles
--     and approves it (partner_settings.listing_price_*). A commission needs a verified payment record, which only staff or the
--     payment webhook (service role) can create. Nothing is taken from a browser payment response.

create extension if not exists pgcrypto with schema extensions;

-- ---------- helpers ----------
create or replace function public.ps_digits(t text) returns text language sql immutable as $$ select regexp_replace(coalesce(t, ''), '\D', '', 'g') $$;
create or replace function public.ps_mobile10(t text) returns text language sql immutable as $$ select right(regexp_replace(coalesce(t, ''), '\D', '', 'g'), 10) $$;
create or replace function public.ps_email() returns text language sql stable as $$ select lower(btrim(coalesce((select auth.jwt()) ->> 'email', ''))) $$;
create or replace function public.ps_inr(p bigint) returns text language sql immutable as $$ select '₹' || trim(to_char(coalesce(p, 0) / 100.0, 'FM99,99,99,990.00')) $$;

-- ---------- settings ----------
create table if not exists public.partner_settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.partner_settings (key, value, description) values
  ('programme_name', '"LegalStaff Advocate Partner Network"', 'Programme name shown on partner pages'),
  ('programme_description', '"A nationwide network helping India''s advocates establish their professional digital presence."', 'Programme description'),
  ('geography', '"India"', 'Where the programme operates'),
  ('network_enabled', 'true', 'Global switch: off pauses the whole Partner Network (records are kept)'),
  ('registration_open', 'true', 'Public partner registration'),
  ('referral_tracking', 'true', 'Record referral clicks and attribute advocate applications'),
  ('commission_generation', 'false', 'Global switch for creating commission ledger entries. Off until counsel has approved the arrangement'),
  ('payouts_paused', 'false', 'Pause withdrawal requests and payout processing'),
  ('campaigns_enabled', 'true', 'Marketing campaigns'),
  ('joining_fee_paise', '0', 'Partner joining fee (paise). Free by default'),
  ('listing_price_paise', 'null', 'Directory listing price (paise). Unset: the live directory is free and this must be reconciled by a super admin'),
  ('listing_price_status', '"unreconciled"', 'unreconciled | approved. Only an approved price may be displayed or charged'),
  ('default_commission_paise', '1500', 'Proposed commission per eligible listing (paise). Applies only where a category has commission on'),
  ('min_withdrawal_paise', '30000', 'Minimum withdrawal (paise)'),
  ('payout_cycle', '"monthly"', 'monthly | fortnightly | weekly'),
  ('attribution_window_days', '30', 'How long a referral click stays valid'),
  ('attribution_rule', '"first_touch"', 'first_touch: the first valid referral within the window is kept'),
  ('referral_code_prefix', '"LS"', 'Prefix of partner IDs (2–4 capital letters)'),
  ('fraud_review_threshold', '50', 'Risk score at which a flag needs manual review'),
  ('fraud_hold_threshold', '70', 'Risk score at which a commission is held automatically'),
  ('burst_limit_per_day', '10', 'Attributions from one partner in 24 h that raise a review flag'),
  ('otp_required', 'true', 'Email OTP before registration (Supabase Auth)'),
  ('sms_provider', '""', 'SMS provider name, once configured (mobile OTP stays off until then)'),
  ('whatsapp_enabled', 'false', 'WhatsApp messages to partners. Only with lawful authorisation'),
  ('terms_version', '"2026-11-v1"', 'Current partner terms version'),
  ('privacy_version', '"2026-11-v1"', 'Current partner privacy notice version'),
  ('compliance_review_date', 'null', 'Date by which counsel should re-review the programme')
on conflict (key) do nothing;

-- ---------- roles and staff (Super Admin is the existing public.super_admins table) ----------
create table if not exists public.partner_roles (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  name text not null,
  description text not null default '',
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.partner_roles (key, name, description, permissions, is_system) values
  ('admin', 'Admin', 'Runs the programme day to day; no settings, roles or payouts', array['partners.view','partners.manage','categories.manage','referrals.view','commissions.view','marketing.manage','notifications.manage','fraud.manage','support.manage','reports.view','audit.view','compliance.view'], true),
  ('finance_manager', 'Finance Manager', 'Commission approval and payouts', array['partners.view','referrals.view','commissions.view','commissions.manage','payments.verify','payouts.view','payouts.manage','reports.view'], true),
  ('partner_manager', 'Partner Manager', 'Partner applications and accounts', array['partners.view','partners.manage','referrals.view','reports.view'], true),
  ('marketing_manager', 'Marketing Manager', 'Campaigns and marketing materials', array['partners.view','marketing.manage','notifications.manage','reports.view'], true),
  ('support_manager', 'Support Manager', 'Partner support tickets', array['partners.view','support.manage'], true)
on conflict (key) do nothing;
create table if not exists public.partner_staff (
  email text primary key check (email = lower(email)),
  role_key text not null references public.partner_roles(key),
  active boolean not null default true,
  added_by text not null default '',
  added_at timestamptz not null default now()
);

-- ---------- categories ----------
create table if not exists public.partner_categories (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  name text not null,
  description text not null default '',
  eligibility text not null default '',
  terms text not null default '',
  requires_organisation boolean not null default false,
  requires_designation boolean not null default false,
  requires_kyc boolean not null default true,
  active boolean not null default true,
  archived boolean not null default false,
  referral_tracking_enabled boolean not null default true,
  commission_enabled boolean not null default false,
  commission_paise integer check (commission_paise is null or commission_paise >= 0),
  legal_approval_ref text,
  legal_approved_at timestamptz,
  sort integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Commission can never be on without a recorded legal approval, whatever code or screen tries to switch it on.
  constraint partner_categories_commission_needs_legal check (not commission_enabled or length(btrim(coalesce(legal_approval_ref, ''))) > 0)
);
insert into public.partner_categories (key, name, description, eligibility, requires_organisation, requires_designation, sort) values
  ('campus_ambassador', 'Campus Ambassador', 'Law college students, student communities and law school alumni networks who tell advocates about the LegalStaff Directory.', 'Enrolled law students or alumni of a recognised law college.', true, false, 10),
  ('advocate_referral_partner', 'Advocate Referral Partner', 'Eligible practising advocates who share the Directory within their professional networks, subject to applicable conduct requirements.', 'Practising advocates who have confirmed that participation is permitted under the rules that apply to them.', false, true, 20),
  ('legal_bookshop_partner', 'Legal Bookshop Partner', 'Law bookshops, legal stationery suppliers and legal publishing businesses.', 'A registered or operating business in the legal books or stationery trade.', true, false, 30),
  ('court_service_centre_partner', 'Court Service Centre Partner', 'Typing centres, printing shops, photocopy centres and documentation businesses near courts.', 'An operating court-side service business.', true, false, 40),
  ('district_coordinator', 'District Coordinator', 'Independent district-level representatives for permitted platform awareness activities and local partner recruitment.', 'An individual who can represent a district and complete KYC.', false, false, 50),
  ('legal_community_partner', 'Legal Community Partner', 'Legal publishers, legal education communities and other eligible legal ecosystem organisations.', 'An organisation active in the legal ecosystem.', true, false, 60)
on conflict (key) do nothing;

create table if not exists public.partner_compliance_approvals (
  id uuid primary key default gen_random_uuid(),
  category_key text not null references public.partner_categories(key),
  reference text not null check (length(btrim(reference)) >= 3),
  scope text not null default '',
  approved_by_name text not null default '',
  approved_on date not null,
  valid_until date,
  document_url text not null default '',
  recorded_by text not null default '',
  recorded_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by text
);
create index if not exists partner_compliance_cat_idx on public.partner_compliance_approvals (category_key) where revoked_at is null;

-- ---------- applications and partners ----------
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  name text not null check (length(btrim(name)) between 2 and 120),
  mobile text not null,
  mobile_verified boolean not null default false,
  state text not null, district text not null, city text not null,
  category_key text not null references public.partner_categories(key),
  organisation text not null default '',
  designation text not null default '',
  enrolment_no text not null default '',
  referral_source text not null default '',
  status text not null default 'applied' check (status in ('applied', 'under_review', 'approved', 'rejected')),
  review_note text not null default '',
  reviewed_by text,
  reviewed_at timestamptz,
  terms_version text not null,
  privacy_consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists partner_app_user_live_idx on public.partner_applications (user_id) where status <> 'rejected';
create unique index if not exists partner_app_email_live_idx on public.partner_applications (lower(email)) where status <> 'rejected';
create unique index if not exists partner_app_mobile_live_idx on public.partner_applications (public.ps_mobile10(mobile)) where status <> 'rejected';

create sequence if not exists public.partner_code_seq start 10001;
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null unique,
  application_id uuid not null unique references public.partner_applications(id),
  name text not null, email text not null, mobile text not null,
  state text not null, district text not null, city text not null,
  category_key text not null references public.partner_categories(key),
  organisation text not null default '', designation text not null default '', enrolment_no text not null default '',
  status text not null default 'approved' check (status in ('approved', 'suspended', 'terminated')),
  status_note text not null default '',
  kyc_status text not null default 'none' check (kyc_status in ('none', 'submitted', 'verified', 'rejected')),
  approved_at timestamptz not null default now(),
  approved_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists partners_cat_idx on public.partners (category_key);
create index if not exists partners_geo_idx on public.partners (state, district);

create table if not exists public.partner_documents (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete cascade,
  application_id uuid references public.partner_applications(id) on delete cascade,
  user_id uuid not null,
  kind text not null check (kind in ('pan', 'aadhaar_masked', 'bank_proof', 'business_proof', 'college_id', 'other')),
  storage_path text not null,
  file_name text not null default '',
  size_bytes bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 10485760),
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected')),
  note text not null default '',
  uploaded_at timestamptz not null default now(),
  reviewed_by text, reviewed_at timestamptz
);
create table if not exists public.partner_terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  application_id uuid references public.partner_applications(id) on delete set null,
  kind text not null check (kind in ('terms', 'privacy')),
  version text not null,
  accepted_at timestamptz not null default now()
);

-- ---------- referrals: clicks, attributions, payments, commissions ----------
create table if not exists public.partner_referrals (            -- every referral landing recorded by the server
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  code text not null,
  visitor_token text not null check (length(visitor_token) between 16 and 64),
  campaign_id uuid,
  source text not null default '',
  landed_at timestamptz not null default now()
);
create index if not exists partner_referrals_partner_idx on public.partner_referrals (partner_id, landed_at desc);
create index if not exists partner_referrals_visitor_idx on public.partner_referrals (partner_id, visitor_token, landed_at);

alter table public.directory_applications add column if not exists referral_code text;
alter table public.directory_applications add column if not exists visitor_token text;

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  application_id text references public.directory_applications(id) on delete set null,
  partner_id uuid references public.partners(id),
  code text not null,
  category_key text,
  touch_id uuid references public.partner_referrals(id) on delete set null,
  touch_verified boolean not null default false,
  status text not null default 'valid' check (status in ('valid', 'rejected_unknown', 'rejected_inactive', 'rejected_self', 'overridden')),
  reason text not null default '',
  attributed_at timestamptz not null default now(),
  window_ends_at timestamptz
);
create unique index if not exists referral_attr_app_idx on public.referral_attributions (application_id) where application_id is not null;
create index if not exists referral_attr_partner_idx on public.referral_attributions (partner_id, attributed_at desc);

create table if not exists public.partner_listing_payments (      -- verified payment for a directory listing; written only by staff or the payment webhook
  id uuid primary key default gen_random_uuid(),
  application_id text not null unique references public.directory_applications(id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  reference text not null check (length(btrim(reference)) >= 4),
  method text not null default 'upi',
  source text not null default 'admin' check (source in ('admin', 'webhook')),
  verified_by text not null default '',
  verified_at timestamptz not null default now()
);
create unique index if not exists partner_listing_payments_ref_idx on public.partner_listing_payments (lower(btrim(reference)));

create table if not exists public.partner_payment_methods (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  kind text not null check (kind in ('upi', 'bank')),
  masked text not null,
  details_enc bytea not null,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id),
  amount_paise bigint not null check (amount_paise > 0),
  method_id uuid references public.partner_payment_methods(id),
  destination_masked text not null default '',
  status text not null default 'requested' check (status in ('requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'failed', 'on_hold')),
  note text not null default '',
  utr text,
  requested_at timestamptz not null default now(),
  decided_by text, decided_at timestamptz,
  paid_by text, paid_at timestamptz
);
create unique index if not exists partner_payouts_utr_idx on public.partner_payouts (lower(btrim(utr))) where utr is not null;
create unique index if not exists partner_payouts_open_idx on public.partner_payouts (partner_id) where status in ('requested', 'under_review', 'approved', 'processing', 'on_hold');

create table if not exists public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id),
  attribution_id uuid not null unique references public.referral_attributions(id),   -- one commission per attributed advocate, ever
  application_id text,
  category_key text not null,
  amount_paise integer not null check (amount_paise >= 0),
  status text not null default 'pending_payment' check (status in ('pending_attribution', 'pending_payment', 'pending_verification', 'eligible', 'approved', 'payable', 'paid', 'reversed', 'rejected', 'on_hold')),
  status_reason text not null default '',
  manual_hold boolean not null default false,
  legal_approval_ref text not null default '',
  payout_id uuid references public.partner_payouts(id),
  created_at timestamptz not null default now(),
  eligible_at timestamptz, approved_at timestamptz, approved_by text,
  payable_at timestamptz, paid_at timestamptz, reversed_at timestamptz, reversal_reason text not null default '',
  updated_at timestamptz not null default now()
);
create index if not exists partner_commissions_partner_idx on public.partner_commissions (partner_id, status);
create index if not exists partner_commissions_status_idx on public.partner_commissions (status);

-- ---------- marketing, notifications, support, fraud, audit ----------
create table if not exists public.partner_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) >= 2),
  channel text not null default 'general' check (channel in ('general', 'whatsapp', 'email', 'social', 'print')),
  message text not null default '',
  category_keys text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'paused', 'ended')),
  starts_at timestamptz, ends_at timestamptz,
  created_by text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.partner_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) >= 2),
  kind text not null check (kind in ('poster', 'banner', 'video', 'whatsapp', 'email', 'social', 'qr_poster', 'guide', 'faq')),
  body text not null default '',
  file_url text not null default '',
  category_keys text[] not null default '{}',
  published boolean not null default false,
  created_by text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.partner_templates (
  key text primary key,
  channel text not null default 'email' check (channel in ('email', 'sms', 'whatsapp', 'in_app')),
  subject text not null default '',
  body text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.partner_templates (key, channel, subject, body) values
  ('application_received', 'email', 'We received your partner application', E'Hello {{name}},\n\nThank you for applying to the LegalStaff Advocate Partner Network. Your application is with our team. We will email you once it has been reviewed.'),
  ('application_approved', 'email', 'Your LegalStaff partner application is approved', E'Hello {{name}},\n\nYour application has been approved. Your partner ID is {{code}}. Sign in at https://legalstaff.in/partners/login to get your referral link and QR code.'),
  ('application_rejected', 'email', 'Update on your LegalStaff partner application', E'Hello {{name}},\n\nWe are unable to approve your application at this time. {{note}}'),
  ('partner_suspended', 'email', 'Your partner account has been suspended', E'Hello {{name}},\n\nYour partner account is suspended. {{note}} Contact partner support if you have questions.'),
  ('referral_received', 'in_app', 'New referral registration', E'An advocate applied through your referral link ({{ref}}).'),
  ('commission_update', 'in_app', 'Commission update', E'Commission {{ref}} is now {{status}}.'),
  ('payout_update', 'email', 'Your payout is {{status}}', E'Hello {{name}},\n\nYour payout of {{amount}} is now {{status}}. {{note}}')
on conflict (key) do nothing;
create table if not exists public.partner_notifications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  kind text not null default 'general',
  title text not null, body text not null default '',
  channel text not null default 'in_app' check (channel in ('email', 'sms', 'whatsapp', 'in_app')),
  email_status text not null default 'none' check (email_status in ('none', 'queued', 'sent', 'failed')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists partner_notifications_idx on public.partner_notifications (partner_id, created_at desc);
create index if not exists partner_notifications_queue_idx on public.partner_notifications (created_at) where email_status = 'queued';

create table if not exists public.partner_support_tickets (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  subject text not null, message text not null,
  status text not null default 'open' check (status in ('open', 'replied', 'closed')),
  reply text not null default '', replied_by text, replied_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.partner_fraud_flags (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id),
  application_id text,
  attribution_id uuid,
  kind text not null,
  score integer not null default 0 check (score between 0 and 100),
  detail jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'dismissed', 'confirmed')),
  created_at timestamptz not null default now(),
  resolved_by text, resolved_at timestamptz, resolution_note text not null default ''
);
create index if not exists partner_fraud_open_idx on public.partner_fraud_flags (status, created_at desc);
create table if not exists public.partner_audit_logs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_user uuid, actor_email text not null default '', actor_role text not null default 'system',
  action text not null, entity text not null default '', entity_id text not null default '',
  detail jsonb not null default '{}'::jsonb
);
create index if not exists partner_audit_entity_idx on public.partner_audit_logs (entity, entity_id, at desc);
create table if not exists public.partner_rate_limits (
  key text not null, window_start timestamptz not null, n integer not null default 1,
  primary key (key, window_start)
);

-- The audit log can only grow.
create or replace function public.ps_audit_immutable() returns trigger language plpgsql as $$ begin raise exception 'partner_audit_logs is append-only'; end $$;
drop trigger if exists partner_audit_no_change on public.partner_audit_logs;
create trigger partner_audit_no_change before update or delete on public.partner_audit_logs for each row execute function public.ps_audit_immutable();

-- ---------- lock every table: all access goes through the functions below ----------
do $$ declare t text; begin
  foreach t in array array['partner_settings','partner_roles','partner_staff','partner_categories','partner_compliance_approvals','partner_applications','partners','partner_documents','partner_terms_acceptance','partner_referrals','referral_attributions','partner_listing_payments','partner_payment_methods','partner_payouts','partner_commissions','partner_campaigns','partner_resources','partner_templates','partner_notifications','partner_support_tickets','partner_fraud_flags','partner_audit_logs','partner_rate_limits'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- settings, identity, permissions, audit, rate limit ----------
create or replace function public.ps_s(k text) returns jsonb language sql stable security definer set search_path = public, pg_temp as $$ select value from public.partner_settings where key = k $$;
create or replace function public.ps_flag(k text) returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select coalesce((select value #>> '{}' from public.partner_settings where key = k) = 'true', false) $$;
create or replace function public.ps_int(k text) returns bigint language sql stable security definer set search_path = public, pg_temp as $$ select nullif((select value #>> '{}' from public.partner_settings where key = k), '')::bigint $$;
create or replace function public.ps_txt(k text) returns text language sql stable security definer set search_path = public, pg_temp as $$ select value #>> '{}' from public.partner_settings where key = k $$;

create or replace function public.ps_is_super() returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.super_admins where email = public.ps_email()) $$;
create or replace function public.ps_perms() returns text[] language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.ps_is_super() then array['*']
    else coalesce((select r.permissions from public.partner_staff s join public.partner_roles r on r.key = s.role_key where s.email = public.ps_email() and s.active), '{}'::text[]) end $$;
create or replace function public.ps_can(p text) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select p = any (public.ps_perms()) or '*' = any (public.ps_perms()) $$;
create or replace function public.ps_require(p text) returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
begin if (select auth.uid()) is null or not public.ps_can(p) then raise exception 'You do not have permission for this (%).', p using errcode = '42501'; end if; end $$;
-- callable by the browser and by storage policies: does the signed-in user hold this staff permission?
create or replace function public.admin_can(p text) returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select (select auth.uid()) is not null and public.ps_can(p) $$;
create or replace function public.ps_role() returns text language sql stable security definer set search_path = public, pg_temp as $$
  select case when (select auth.uid()) is null then 'system'
    when public.ps_is_super() then 'super_admin'
    else coalesce((select s.role_key from public.partner_staff s where s.email = public.ps_email() and s.active), case when exists (select 1 from public.partners where user_id = (select auth.uid())) then 'partner' else 'user' end) end $$;
create or replace function public.ps_audit(p_action text, p_entity text, p_id text, p_detail jsonb default '{}'::jsonb) returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.partner_audit_logs (actor_user, actor_email, actor_role, action, entity, entity_id, detail)
  values ((select auth.uid()), public.ps_email(), public.ps_role(), p_action, p_entity, coalesce(p_id, ''), coalesce(p_detail, '{}'::jsonb)) $$;
-- true while the caller is under the limit; false once n calls have been made in the window
create or replace function public.ps_rate(p_key text, p_max int, p_window interval) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window)); c int;
begin
  insert into public.partner_rate_limits (key, window_start) values (p_key, w) on conflict (key, window_start) do update set n = public.partner_rate_limits.n + 1 returning n into c;
  delete from public.partner_rate_limits where window_start < now() - interval '2 days';
  return c <= p_max;
end $$;

create or replace function public.ps_notify(p_partner uuid, p_template text, p_vars jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.partner_templates; subj text; body text; k text; v text;
begin
  select * into t from public.partner_templates where key = p_template and active;
  if not found then return; end if;
  subj := t.subject; body := t.body;
  for k, v in select * from jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) loop subj := replace(subj, '{{' || k || '}}', v); body := replace(body, '{{' || k || '}}', v); end loop;
  insert into public.partner_notifications (partner_id, kind, title, body, channel, email_status)
  values (p_partner, p_template, regexp_replace(subj, '\{\{[a-z_]+\}\}', '', 'g'), regexp_replace(body, '\{\{[a-z_]+\}\}', '', 'g'), t.channel, case when t.channel = 'email' then 'queued' else 'none' end);
end $$;

-- ---------- commission engine ----------
create or replace function public.ps_valid_approval(p_cat text) returns public.partner_compliance_approvals language sql stable security definer set search_path = public, pg_temp as $$
  select a.* from public.partner_compliance_approvals a where a.category_key = p_cat and a.revoked_at is null and (a.valid_until is null or a.valid_until >= current_date) order by a.approved_on desc limit 1 $$;

create or replace function public.ps_risk(p_attr uuid) returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select least(100, coalesce(sum(score), 0))::int from public.partner_fraud_flags where attribution_id = p_attr and status in ('open', 'confirmed') $$;

-- Create or refresh the ledger entry for one advocate application. Idempotent; never moves a commission that finance has already approved.
create or replace function public.ps_evaluate_commission(p_app text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare att public.referral_attributions; cat public.partner_categories; ap public.partner_compliance_approvals; app public.directory_applications;
  pay public.partner_listing_payments; cm public.partner_commissions; want text; why text; amt int; docs int := 0; v_id uuid;
begin
  select * into att from public.referral_attributions where application_id = p_app and status = 'valid';
  if not found then return null; end if;
  select * into app from public.directory_applications where id = p_app;
  select * into cm from public.partner_commissions where attribution_id = att.id;
  if found and cm.status in ('approved', 'payable', 'paid', 'reversed') then
    return cm.id;                                                  -- finance owns it from here
  end if;
  if not found then                                                -- a new entry needs every gate open at the moment of attribution evaluation
    if not public.ps_flag('network_enabled') or not public.ps_flag('commission_generation') then return null; end if;
    select * into cat from public.partner_categories where key = att.category_key;
    if not cat.commission_enabled then return null; end if;
    ap := public.ps_valid_approval(cat.key);
    if ap.id is null or att.attributed_at < ap.recorded_at then return null; end if;   -- counsel's approval must be on record before the activity it covers
    amt := coalesce(cat.commission_paise, public.ps_int('default_commission_paise'), 0);
  else
    amt := cm.amount_paise; ap.reference := cm.legal_approval_ref;
  end if;
  select * into pay from public.partner_listing_payments where application_id = p_app;
  if jsonb_typeof(app.details -> 'documents') = 'array' then docs := jsonb_array_length(app.details -> 'documents'); end if;
  if app.status = 'rejected' then want := 'rejected'; why := 'The directory application was rejected';
  elsif cm.manual_hold then want := 'on_hold'; why := coalesce(nullif(cm.status_reason, ''), 'Held by staff');
  elsif not att.touch_verified then want := 'pending_attribution'; why := 'Referral click not matched; staff must confirm the attribution';
  elsif pay.id is null then want := 'pending_payment'; why := 'No verified payment for the listing yet';
  elsif app.status <> 'verified' or docs = 0 then want := 'pending_verification'; why := case when docs = 0 then 'Documents not submitted' else 'Listing not yet approved' end;
  elsif public.ps_risk(att.id) >= coalesce(public.ps_int('fraud_hold_threshold'), 70) then want := 'on_hold'; why := 'Risk score above the hold threshold; manual review needed';
  else want := 'eligible'; why := 'All conditions met'; end if;
  if cm.id is null then
    insert into public.partner_commissions (partner_id, attribution_id, application_id, category_key, amount_paise, status, status_reason, legal_approval_ref, eligible_at)
    values (att.partner_id, att.id, p_app, att.category_key, amt, want, why, coalesce(ap.reference, ''), case when want = 'eligible' then now() end)
    on conflict (attribution_id) do nothing returning partner_commissions.id into v_id;
    if v_id is not null then perform public.ps_audit('commission.created', 'commission', v_id::text, jsonb_build_object('status', want, 'amount_paise', amt, 'legal_approval_ref', ap.reference)); end if;
  elsif cm.status <> want then
    update public.partner_commissions set status = want, status_reason = why, updated_at = now(), eligible_at = case when want = 'eligible' then coalesce(eligible_at, now()) else eligible_at end where partner_commissions.id = cm.id;
    perform public.ps_audit('commission.' || want, 'commission', cm.id::text, jsonb_build_object('from', cm.status, 'reason', why));
    if want = 'eligible' then perform public.ps_notify(cm.partner_id, 'commission_update', jsonb_build_object('ref', left(cm.id::text, 8), 'status', 'eligible')); end if;
    v_id := cm.id;
  else v_id := cm.id; end if;
  return v_id;
end $$;

-- ---------- attribution ----------
create or replace function public.ps_attribute_application(p_app text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.directory_applications; p public.partners; c public.partner_categories; t public.partner_referrals; win int; st text := 'valid'; why text := ''; verified boolean := false;
  aid uuid; recent int;
begin
  select * into a from public.directory_applications where id = p_app;
  if not found or btrim(coalesce(a.referral_code, '')) = '' then return; end if;
  if not public.ps_flag('network_enabled') or not public.ps_flag('referral_tracking') then return; end if;
  if exists (select 1 from public.referral_attributions where application_id = p_app) then return; end if;
  win := coalesce(public.ps_int('attribution_window_days'), 30);
  select * into p from public.partners where code = upper(btrim(a.referral_code));
  if not found then st := 'rejected_unknown'; why := 'Unknown referral code';
  elsif p.status <> 'approved' then st := 'rejected_inactive'; why := 'Partner account is not active';
  else
    select * into c from public.partner_categories where key = p.category_key;
    if not c.active or c.archived or not c.referral_tracking_enabled then st := 'rejected_inactive'; why := 'Category is not tracking referrals';
    elsif lower(btrim(a.email)) = lower(btrim(p.email)) or (length(public.ps_digits(a.mobile)) >= 10 and public.ps_mobile10(a.mobile) = public.ps_mobile10(p.mobile))
       or (p.enrolment_no <> '' and upper(btrim(p.enrolment_no)) = upper(btrim(a.enr))) then st := 'rejected_self'; why := 'Referrer details match the advocate';
    else
      select * into t from public.partner_referrals r where r.partner_id = p.id and r.visitor_token = a.visitor_token and r.landed_at >= now() - make_interval(days => win) order by r.landed_at limit 1;
      verified := found;
    end if;
  end if;
  insert into public.referral_attributions (application_id, partner_id, code, category_key, touch_id, touch_verified, status, reason, window_ends_at)
  values (p_app, p.id, upper(btrim(a.referral_code)), p.category_key, t.id, verified, st, why, case when verified then t.landed_at + make_interval(days => win) end) returning id into aid;
  perform public.ps_audit('attribution.' || st, 'attribution', aid::text, jsonb_build_object('application', p_app, 'code', upper(btrim(a.referral_code)), 'touch_verified', verified));
  if st = 'rejected_self' then
    insert into public.partner_fraud_flags (partner_id, application_id, attribution_id, kind, score, detail) values (p.id, p_app, aid, 'self_referral', 100, jsonb_build_object('why', why));
  elsif st = 'valid' then
    if not verified then insert into public.partner_fraud_flags (partner_id, application_id, attribution_id, kind, score, detail) values (p.id, p_app, aid, 'no_matching_click', 25, jsonb_build_object('why', 'No recorded click for this visitor inside the window')); end if;
    select count(*) into recent from public.referral_attributions where partner_id = p.id and attributed_at > now() - interval '24 hours';
    if recent > coalesce(public.ps_int('burst_limit_per_day'), 10) then
      insert into public.partner_fraud_flags (partner_id, application_id, attribution_id, kind, score, detail) values (p.id, p_app, aid, 'burst_of_registrations', 30, jsonb_build_object('last_24h', recent));
    end if;
    perform public.ps_notify(p.id, 'referral_received', jsonb_build_object('ref', p_app));
    perform public.ps_evaluate_commission(p_app);
  end if;
end $$;

-- Advocate registration must never fail because of the partner network.
create or replace function public.ps_directory_after_insert() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  begin perform public.ps_attribute_application(new.id);
  exception when others then
    insert into public.partner_audit_logs (action, entity, entity_id, detail) values ('attribution.error', 'directory_application', new.id, jsonb_build_object('error', sqlerrm));
  end;
  return new;
end $$;
create or replace function public.ps_directory_before_update() returns trigger language plpgsql as $$
begin   -- the referral claim is fixed at registration and cannot be edited, by anyone, afterwards
  new.referral_code := old.referral_code; new.visitor_token := old.visitor_token; return new;
end $$;
create or replace function public.ps_directory_after_status() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare cm public.partner_commissions;
begin
  begin
    if new.status = 'rejected' then
      select * into cm from public.partner_commissions where application_id = new.id;
      if found and cm.status in ('eligible', 'approved', 'payable') and cm.payout_id is null then
        update public.partner_commissions set status = 'reversed', reversed_at = now(), reversal_reason = 'Directory application rejected after the commission arose', updated_at = now() where id = cm.id;
        perform public.ps_audit('commission.reversed', 'commission', cm.id::text, jsonb_build_object('reason', 'application rejected'));
      elsif found and cm.status = 'paid' then
        insert into public.partner_fraud_flags (partner_id, application_id, kind, score, detail) values (cm.partner_id, new.id, 'clawback_review', 60, jsonb_build_object('commission', cm.id, 'why', 'application rejected after payout'));
      end if;
    end if;
    perform public.ps_evaluate_commission(new.id);
  exception when others then
    insert into public.partner_audit_logs (action, entity, entity_id, detail) values ('commission.error', 'directory_application', new.id, jsonb_build_object('error', sqlerrm));
  end;
  return new;
end $$;
drop trigger if exists ps_directory_ins on public.directory_applications;
create trigger ps_directory_ins after insert on public.directory_applications for each row execute function public.ps_directory_after_insert();
drop trigger if exists ps_directory_upd on public.directory_applications;
create trigger ps_directory_upd before update on public.directory_applications for each row execute function public.ps_directory_before_update();
drop trigger if exists ps_directory_status on public.directory_applications;
create trigger ps_directory_status after update of status on public.directory_applications for each row when (old.status is distinct from new.status) execute function public.ps_directory_after_status();

-- An attribution can never be re-pointed to another partner or advocate (only its status may change, by staff, with an audit entry).
create or replace function public.ps_attr_immutable() returns trigger language plpgsql as $$
begin
  if new.partner_id is distinct from old.partner_id or new.code is distinct from old.code or new.application_id is distinct from old.application_id or new.attributed_at is distinct from old.attributed_at then
    raise exception 'A referral attribution cannot be changed after it is recorded.'; end if;
  return new;
end $$;
drop trigger if exists ps_attr_fixed on public.referral_attributions;
create trigger ps_attr_fixed before update on public.referral_attributions for each row execute function public.ps_attr_immutable();

create or replace function public.ps_payment_after_insert() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.ps_evaluate_commission(new.application_id); return new; end $$;
drop trigger if exists ps_payment_ins on public.partner_listing_payments;
create trigger ps_payment_ins after insert on public.partner_listing_payments for each row execute function public.ps_payment_after_insert();

-- ---------- public functions (no sign-in) ----------
create or replace function public.partner_public_config() returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'enabled', public.ps_flag('network_enabled'), 'registration_open', public.ps_flag('network_enabled') and public.ps_flag('registration_open'),
    'name', public.ps_s('programme_name'), 'description', public.ps_s('programme_description'),
    'joining_fee_paise', public.ps_int('joining_fee_paise'), 'terms_version', public.ps_s('terms_version'), 'privacy_version', public.ps_s('privacy_version'),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'name', name, 'description', description, 'eligibility', eligibility, 'terms', terms, 'requires_organisation', requires_organisation, 'requires_designation', requires_designation) order by sort, name)
                from public.partner_categories where active and not archived), '[]'::jsonb)) $$;

create or replace function public.partner_validate_code(p_code text) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.ps_flag('network_enabled') and public.ps_flag('referral_tracking') and exists (
    select 1 from public.partners p join public.partner_categories c on c.key = p.category_key
    where p.code = upper(btrim(p_code)) and p.status = 'approved' and c.active and not c.archived and c.referral_tracking_enabled) $$;

-- Records a referral landing on the server. Quietly ignores bad codes and over-use so the page never breaks.
create or replace function public.partner_track_click(p_code text, p_visitor text, p_campaign uuid default null, p_source text default '') returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.partners;
begin
  if p_visitor is null or length(p_visitor) < 16 or length(p_visitor) > 64 or not public.partner_validate_code(p_code) then return false; end if;
  if not public.ps_rate('click:' || p_visitor, 30, interval '1 hour') then return false; end if;
  select * into p from public.partners where code = upper(btrim(p_code));
  if exists (select 1 from public.partner_referrals where partner_id = p.id and visitor_token = p_visitor and landed_at > now() - interval '30 minutes') then return true; end if;
  insert into public.partner_referrals (partner_id, code, visitor_token, campaign_id, source) values (p.id, p.code, p_visitor, p_campaign, left(coalesce(p_source, ''), 60));
  return true;
end $$;

-- ---------- partner functions (signed-in partner; only ever their own data) ----------
create or replace function public.ps_my_partner() returns public.partners language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  select * into p from public.partners where user_id = (select auth.uid());
  if not found then raise exception 'You are not an approved partner.' using errcode = '42501'; end if;
  return p;
end $$;

create or replace function public.partner_me() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners; a public.partner_applications;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  select * into p from public.partners where user_id = (select auth.uid());
  if found then
    return jsonb_build_object('state', 'partner', 'partner', to_jsonb(p) - 'user_id' - 'application_id', 'category', (select jsonb_build_object('key', key, 'name', name, 'terms', terms) from public.partner_categories where key = p.category_key),
      'unread', (select count(*) from public.partner_notifications where partner_id = p.id and read_at is null),
      'referral_url', 'https://legalstaff.in/directory/?ref=' || p.code);
  end if;
  select * into a from public.partner_applications where user_id = (select auth.uid()) order by created_at desc limit 1;
  if found then return jsonb_build_object('state', 'applicant', 'application', jsonb_build_object('id', a.id, 'status', a.status, 'category_key', a.category_key, 'created_at', a.created_at, 'note', a.review_note)); end if;
  return jsonb_build_object('state', 'none', 'email', public.ps_email());
end $$;

create or replace function public.partner_apply(p jsonb) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := (select auth.uid()); em text := public.ps_email(); cat public.partner_categories; aid uuid; nm text := btrim(coalesce(p ->> 'name', '')); mb text := btrim(coalesce(p ->> 'mobile', ''));
begin
  if uid is null or em = '' then raise exception 'Verify your email with the code we send, then submit the form.' using errcode = '28000'; end if;
  if not public.ps_flag('network_enabled') or not public.ps_flag('registration_open') then raise exception 'Partner registration is closed at the moment.'; end if;
  if not public.ps_rate('apply:' || uid::text, 5, interval '1 hour') then raise exception 'Too many attempts. Try again later.'; end if;
  if length(nm) < 2 or length(nm) > 120 then raise exception 'Enter your full name.'; end if;
  if length(public.ps_digits(mb)) not between 10 and 13 or public.ps_mobile10(mb) !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit Indian mobile number.'; end if;
  if btrim(coalesce(p ->> 'state', '')) = '' or btrim(coalesce(p ->> 'district', '')) = '' or btrim(coalesce(p ->> 'city', '')) = '' then raise exception 'Choose your state and enter your district and city.'; end if;
  if coalesce((p ->> 'accept_terms')::boolean, false) is not true or coalesce((p ->> 'accept_privacy')::boolean, false) is not true then raise exception 'Accept the partner terms and the privacy notice to continue.'; end if;
  select * into cat from public.partner_categories where key = p ->> 'category_key' and active and not archived;
  if not found then raise exception 'Choose a partner category.'; end if;
  if cat.requires_organisation and btrim(coalesce(p ->> 'organisation', '')) = '' then raise exception 'Enter your organisation or college name.'; end if;
  if cat.requires_designation and btrim(coalesce(p ->> 'designation', '')) = '' then raise exception 'Enter your professional designation.'; end if;
  if exists (select 1 from public.partners where user_id = uid) then raise exception 'You are already a partner.'; end if;
  begin
    insert into public.partner_applications (user_id, email, name, mobile, state, district, city, category_key, organisation, designation, enrolment_no, referral_source, terms_version)
    values (uid, em, nm, mb, btrim(p ->> 'state'), btrim(p ->> 'district'), btrim(p ->> 'city'), cat.key, left(btrim(coalesce(p ->> 'organisation', '')), 160), left(btrim(coalesce(p ->> 'designation', '')), 120),
      left(btrim(coalesce(p ->> 'enrolment_no', '')), 40), left(btrim(coalesce(p ->> 'referral_source', '')), 160), public.ps_txt('terms_version')) returning id into aid;
  exception when unique_violation then raise exception 'An application with this email or mobile number already exists.'; end;
  insert into public.partner_terms_acceptance (user_id, application_id, kind, version) values (uid, aid, 'terms', public.ps_txt('terms_version')), (uid, aid, 'privacy', public.ps_txt('privacy_version'));
  perform public.ps_audit('application.submitted', 'application', aid::text, jsonb_build_object('category', cat.key, 'state', p ->> 'state'));
  return aid;
end $$;

create or replace function public.partner_register_document(p_kind text, p_path text, p_name text, p_size bigint) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := (select auth.uid()); pid uuid; aid uuid; id uuid;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  if p_path not like uid::text || '/%' then raise exception 'Upload to your own folder only.'; end if;
  select p0.id into pid from public.partners p0 where p0.user_id = uid;
  select a.id into aid from public.partner_applications a where a.user_id = uid and a.status <> 'rejected' order by created_at desc limit 1;
  if pid is null and aid is null then raise exception 'Submit your application first.'; end if;
  insert into public.partner_documents (partner_id, application_id, user_id, kind, storage_path, file_name, size_bytes) values (pid, aid, uid, p_kind, p_path, left(coalesce(p_name, ''), 200), coalesce(p_size, 0)) returning partner_documents.id into id;
  if pid is not null and p_kind in ('pan', 'aadhaar_masked', 'bank_proof') then update public.partners set kyc_status = 'submitted' where id = pid and kyc_status in ('none', 'rejected'); end if;
  perform public.ps_audit('document.uploaded', 'document', id::text, jsonb_build_object('kind', p_kind));
  return id;
end $$;

create or replace function public.partner_dashboard() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner(); r jsonb;
begin
  select jsonb_build_object(
    'partner', jsonb_build_object('code', p.code, 'name', p.name, 'state', p.state, 'district', p.district, 'city', p.city, 'category_key', p.category_key, 'status', p.status, 'kyc_status', p.kyc_status),
    'referral_url', 'https://legalstaff.in/directory/?ref=' || p.code,
    'totals', jsonb_build_object(
      'referrals', (select count(*) from public.partner_referrals where partner_id = p.id),
      'registrations', (select count(*) from public.referral_attributions where partner_id = p.id and status = 'valid'),
      'paid_registrations', (select count(*) from public.referral_attributions t join public.partner_listing_payments y on y.application_id = t.application_id where t.partner_id = p.id and t.status = 'valid'),
      'approved_listings', (select count(*) from public.referral_attributions t join public.directory_applications d on d.id = t.application_id where t.partner_id = p.id and t.status = 'valid' and d.status = 'verified'),
      'pending_verification', (select count(*) from public.referral_attributions t join public.directory_applications d on d.id = t.application_id where t.partner_id = p.id and t.status = 'valid' and d.status in ('pending', 'info'))),
    'money', jsonb_build_object(
      'eligible_paise', coalesce((select sum(amount_paise) from public.partner_commissions where partner_id = p.id and status = 'eligible'), 0),
      'pending_paise', coalesce((select sum(amount_paise) from public.partner_commissions where partner_id = p.id and status in ('pending_attribution', 'pending_payment', 'pending_verification', 'on_hold')), 0),
      'approved_paise', coalesce((select sum(amount_paise) from public.partner_commissions where partner_id = p.id and status = 'approved'), 0),
      'paid_paise', coalesce((select sum(amount_paise) from public.partner_commissions where partner_id = p.id and status = 'paid'), 0),
      'available_paise', coalesce((select sum(amount_paise) from public.partner_commissions where partner_id = p.id and status = 'payable' and payout_id is null), 0),
      'min_withdrawal_paise', public.ps_int('min_withdrawal_paise')),
    'monthly', coalesce((select jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'),
        'clicks', (select count(*) from public.partner_referrals x where x.partner_id = p.id and date_trunc('month', x.landed_at at time zone 'Asia/Kolkata') = m),
        'registrations', (select count(*) from public.referral_attributions x where x.partner_id = p.id and x.status = 'valid' and date_trunc('month', x.attributed_at at time zone 'Asia/Kolkata') = m),
        'listings', (select count(*) from public.referral_attributions x join public.directory_applications d on d.id = x.application_id where x.partner_id = p.id and x.status = 'valid' and d.status = 'verified' and date_trunc('month', x.attributed_at at time zone 'Asia/Kolkata') = m)) order by m)
        from generate_series(date_trunc('month', now() at time zone 'Asia/Kolkata') - interval '5 months', date_trunc('month', now() at time zone 'Asia/Kolkata'), interval '1 month') m), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(x) from (select jsonb_build_object('when', t.attributed_at, 'advocate', left(d.name, 1) || '***', 'city', d.city, 'listing', d.status, 'attribution', t.status) x
        from public.referral_attributions t join public.directory_applications d on d.id = t.application_id where t.partner_id = p.id order by t.attributed_at desc limit 10) q), '[]'::jsonb),
    'commission_note', case when public.ps_flag('commission_generation') and (select commission_enabled from public.partner_categories where key = p.category_key) then 'Commission applies to your category.' else 'Commission is not active for your category. Referral activity is still recorded.' end
  ) into r;
  return r;
end $$;

create or replace function public.partner_referrals_list() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('when', t.attributed_at, 'advocate', left(d.name, 1) || '***', 'city', d.city, 'attribution', t.status, 'listing', d.status,
      'paid', exists (select 1 from public.partner_listing_payments y where y.application_id = t.application_id), 'commission', c.status) order by t.attributed_at desc)
    from public.referral_attributions t left join public.directory_applications d on d.id = t.application_id left join public.partner_commissions c on c.attribution_id = t.id where t.partner_id = p.id), '[]'::jsonb);
end $$;

create or replace function public.partner_earnings_list() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'created_at', c.created_at, 'amount_paise', c.amount_paise, 'status', c.status, 'reason', c.status_reason, 'paid_at', c.paid_at) order by c.created_at desc) from public.partner_commissions c where c.partner_id = p.id), '[]'::jsonb);
end $$;

create or replace function public.partner_payouts_list() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner();
begin
  return jsonb_build_object(
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'amount_paise', o.amount_paise, 'status', o.status, 'requested_at', o.requested_at, 'paid_at', o.paid_at, 'utr', o.utr, 'destination', o.destination_masked, 'note', o.note) order by o.requested_at desc) from public.partner_payouts o where o.partner_id = p.id), '[]'::jsonb),
    'methods', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'masked', m.masked, 'is_default', m.is_default) order by m.created_at desc) from public.partner_payment_methods m where m.partner_id = p.id and m.deleted_at is null), '[]'::jsonb),
    'kyc_status', p.kyc_status, 'min_withdrawal_paise', public.ps_int('min_withdrawal_paise'), 'paused', not public.ps_flag('network_enabled') or public.ps_flag('payouts_paused'),
    'available_paise', coalesce((select sum(amount_paise) from public.partner_commissions where partner_id = p.id and status = 'payable' and payout_id is null), 0));
end $$;

create or replace function public.ps_pii_key() returns text language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'partner_pii_key' order by created_at desc limit 1;
  if k is null then k := encode(extensions.gen_random_bytes(32), 'hex'); perform vault.create_secret(k, 'partner_pii_key', 'Encrypts partner payout details'); end if;
  return k;
end $$;

create or replace function public.partner_add_payment_method(p_kind text, p_details jsonb) returns uuid language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare p public.partners := public.ps_my_partner(); mask text; id uuid; acct text;
begin
  if p.status <> 'approved' then raise exception 'Your account is not active.'; end if;
  if not public.ps_rate('pm:' || p.id::text, 10, interval '1 day') then raise exception 'Too many changes today. Try again tomorrow.'; end if;
  if p_kind = 'upi' then
    if coalesce(p_details ->> 'upi_id', '') !~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z]{2,32}$' then raise exception 'Enter a valid UPI ID, like name@bank.'; end if;
    mask := left(p_details ->> 'upi_id', 2) || '***@' || split_part(p_details ->> 'upi_id', '@', 2);
  elsif p_kind = 'bank' then
    acct := public.ps_digits(p_details ->> 'account_no');
    if length(acct) not between 9 and 18 then raise exception 'Enter a valid bank account number.'; end if;
    if upper(coalesce(p_details ->> 'ifsc', '')) !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then raise exception 'Enter a valid IFSC code.'; end if;
    if length(btrim(coalesce(p_details ->> 'holder', ''))) < 2 then raise exception 'Enter the account holder name.'; end if;
    mask := 'A/c ****' || right(acct, 4) || ' · ' || upper(p_details ->> 'ifsc');
  else raise exception 'Choose UPI or bank transfer.'; end if;
  update public.partner_payment_methods set is_default = false where partner_id = p.id;
  insert into public.partner_payment_methods (partner_id, kind, masked, details_enc) values (p.id, p_kind, mask, extensions.pgp_sym_encrypt(p_details::text, public.ps_pii_key())) returning partner_payment_methods.id into id;
  perform public.ps_audit('payment_method.added', 'partner', p.id::text, jsonb_build_object('kind', p_kind, 'masked', mask));
  return id;
end $$;

create or replace function public.partner_request_payout() returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner(); m public.partner_payment_methods; bal bigint; oid uuid;
begin
  if not public.ps_flag('network_enabled') or public.ps_flag('payouts_paused') then raise exception 'Payouts are paused at the moment.'; end if;
  if p.status <> 'approved' then raise exception 'Your account is not active.'; end if;
  if p.kyc_status <> 'verified' then raise exception 'Complete KYC before requesting a withdrawal.'; end if;
  if not public.ps_rate('payout:' || p.id::text, 5, interval '1 day') then raise exception 'Too many requests today.'; end if;
  select * into m from public.partner_payment_methods where partner_id = p.id and deleted_at is null and is_default order by created_at desc limit 1;
  if not found then raise exception 'Add a UPI ID or bank account first.'; end if;
  perform 1 from public.partner_commissions where partner_id = p.id and status = 'payable' and payout_id is null for update;
  select coalesce(sum(amount_paise), 0) into bal from public.partner_commissions where partner_id = p.id and status = 'payable' and payout_id is null;
  if bal < coalesce(public.ps_int('min_withdrawal_paise'), 30000) then raise exception 'The minimum withdrawal is %. Your available balance is %.', public.ps_inr(public.ps_int('min_withdrawal_paise')), public.ps_inr(bal); end if;
  begin
    insert into public.partner_payouts (partner_id, amount_paise, method_id, destination_masked) values (p.id, bal, m.id, m.masked) returning id into oid;
  exception when unique_violation then raise exception 'You already have a withdrawal in progress.'; end;
  update public.partner_commissions set payout_id = oid, updated_at = now() where partner_id = p.id and status = 'payable' and payout_id is null;
  perform public.ps_audit('payout.requested', 'payout', oid::text, jsonb_build_object('amount_paise', bal));
  return oid;
end $$;

create or replace function public.partner_update_profile(p jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare me public.partners := public.ps_my_partner();
begin   -- name, category, state and contact details change only through staff, so identity cannot drift after approval
  update public.partners set organisation = coalesce(left(btrim(p ->> 'organisation'), 160), organisation), designation = coalesce(left(btrim(p ->> 'designation'), 120), designation),
    city = coalesce(nullif(btrim(p ->> 'city'), ''), city), district = coalesce(nullif(btrim(p ->> 'district'), ''), district) where id = me.id;
  perform public.ps_audit('profile.updated', 'partner', me.id::text, '{}'::jsonb);
end $$;

create or replace function public.partner_resources_list() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'kind', r.kind, 'body', replace(replace(r.body, '{{code}}', p.code), '{{link}}', 'https://legalstaff.in/directory/?ref=' || p.code), 'file_url', r.file_url) order by r.kind, r.title)
    from public.partner_resources r where r.published and (cardinality(r.category_keys) = 0 or p.category_key = any (r.category_keys))), '[]'::jsonb);
end $$;

create or replace function public.partner_notifications_list(p_mark_read boolean default false) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner(); r jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'at', n.created_at, 'read', n.read_at is not null) order by n.created_at desc), '[]'::jsonb) into r
    from (select * from public.partner_notifications where partner_id = p.id and channel in ('in_app', 'email') order by created_at desc limit 50) n;
  if p_mark_read then update public.partner_notifications set read_at = now() where partner_id = p.id and read_at is null; end if;
  return r;
end $$;

create or replace function public.partner_support_create(p_subject text, p_message text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner(); id uuid;
begin
  if length(btrim(coalesce(p_subject, ''))) < 3 or length(btrim(coalesce(p_message, ''))) < 5 then raise exception 'Write a subject and a message.'; end if;
  if not public.ps_rate('ticket:' || p.id::text, 10, interval '1 day') then raise exception 'Too many messages today.'; end if;
  insert into public.partner_support_tickets (partner_id, subject, message) values (p.id, left(btrim(p_subject), 160), left(btrim(p_message), 4000)) returning partner_support_tickets.id into id;
  return id;
end $$;
create or replace function public.partner_support_list() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'subject', t.subject, 'message', t.message, 'status', t.status, 'reply', t.reply, 'at', t.created_at) order by t.created_at desc) from public.partner_support_tickets t where t.partner_id = p.id), '[]'::jsonb);
end $$;

-- ---------- admin functions (staff; permission checked on every call) ----------
create or replace function public.admin_whoami() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if (select auth.uid()) is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  return jsonb_build_object('email', public.ps_email(), 'role', public.ps_role(), 'permissions', to_jsonb(public.ps_perms()), 'super', public.ps_is_super());
end $$;

create or replace function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return jsonb_build_object(
    'switches', jsonb_build_object('network', public.ps_flag('network_enabled'), 'registration', public.ps_flag('registration_open'), 'referral', public.ps_flag('referral_tracking'), 'commission', public.ps_flag('commission_generation'), 'payouts_paused', public.ps_flag('payouts_paused'), 'campaigns', public.ps_flag('campaigns_enabled')),
    'listing_price', jsonb_build_object('paise', public.ps_int('listing_price_paise'), 'status', public.ps_txt('listing_price_status')),
    'applications', jsonb_build_object('applied', (select count(*) from public.partner_applications where status = 'applied'), 'under_review', (select count(*) from public.partner_applications where status = 'under_review')),
    'partners', jsonb_build_object('active', (select count(*) from public.partners where status = 'approved'), 'suspended', (select count(*) from public.partners where status = 'suspended'), 'terminated', (select count(*) from public.partners where status = 'terminated')),
    'referrals', jsonb_build_object('clicks', (select count(*) from public.partner_referrals), 'attributed', (select count(*) from public.referral_attributions where status = 'valid'), 'rejected', (select count(*) from public.referral_attributions where status <> 'valid'),
      'verified_listings', (select count(*) from public.referral_attributions t join public.directory_applications d on d.id = t.application_id where t.status = 'valid' and d.status = 'verified')),
    'liability_paise', jsonb_build_object('eligible', coalesce((select sum(amount_paise) from public.partner_commissions where status = 'eligible'), 0), 'approved', coalesce((select sum(amount_paise) from public.partner_commissions where status = 'approved'), 0),
      'payable', coalesce((select sum(amount_paise) from public.partner_commissions where status = 'payable'), 0), 'paid', coalesce((select sum(amount_paise) from public.partner_commissions where status = 'paid'), 0), 'on_hold', coalesce((select sum(amount_paise) from public.partner_commissions where status = 'on_hold'), 0)),
    'payouts_open', (select count(*) from public.partner_payouts where status in ('requested', 'under_review', 'approved', 'processing', 'on_hold')),
    'fraud_open', (select count(*) from public.partner_fraud_flags where status = 'open'),
    'tickets_open', (select count(*) from public.partner_support_tickets where status = 'open'),
    'commission_categories_on', (select count(*) from public.partner_categories where commission_enabled));
end $$;

create or replace function public.admin_applications(p_status text default null) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return coalesce((select jsonb_agg(to_jsonb(a) - 'user_id' order by a.created_at desc) from (select * from public.partner_applications where p_status is null or status = p_status order by created_at desc limit 500) a), '[]'::jsonb);
end $$;

create or replace function public.admin_application_decide(p_id uuid, p_decision text, p_note text default '') returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.partner_applications; pid uuid; code text; pre text := coalesce(public.ps_txt('referral_code_prefix'), 'LS');
begin
  perform public.ps_require('partners.manage');
  select * into a from public.partner_applications where id = p_id for update;
  if not found then raise exception 'Application not found.'; end if;
  if p_decision = 'review' then
    update public.partner_applications set status = 'under_review', reviewed_by = public.ps_email(), reviewed_at = now() where id = p_id and status = 'applied';
  elsif p_decision = 'approve' then
    if a.status not in ('applied', 'under_review') then raise exception 'This application is already %.', a.status; end if;
    if pre !~ '^[A-Z]{2,4}$' then pre := 'LS'; end if;
    code := pre || nextval('public.partner_code_seq')::text;
    insert into public.partners (code, user_id, application_id, name, email, mobile, state, district, city, category_key, organisation, designation, enrolment_no, approved_by)
    values (code, a.user_id, a.id, a.name, a.email, a.mobile, a.state, a.district, a.city, a.category_key, a.organisation, a.designation, a.enrolment_no, public.ps_email()) returning id into pid;
    update public.partner_applications set status = 'approved', review_note = coalesce(p_note, ''), reviewed_by = public.ps_email(), reviewed_at = now() where id = p_id;
    perform public.ps_notify(pid, 'application_approved', jsonb_build_object('name', a.name, 'code', code));
  elsif p_decision = 'reject' then
    if a.status not in ('applied', 'under_review') then raise exception 'This application is already %.', a.status; end if;
    update public.partner_applications set status = 'rejected', review_note = coalesce(p_note, ''), reviewed_by = public.ps_email(), reviewed_at = now() where id = p_id;
  else raise exception 'Unknown decision.'; end if;
  perform public.ps_audit('application.' || p_decision, 'application', p_id::text, jsonb_build_object('note', p_note, 'partner_id', pid));
  return jsonb_build_object('ok', true, 'partner_id', pid, 'code', code);
end $$;

create or replace function public.admin_partners(p_search text default '', p_status text default null, p_category text default null, p_state text default null, p_limit int default 100, p_offset int default 0) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return jsonb_build_object('total', (select count(*) from public.partners p where (p_status is null or p.status = p_status) and (p_category is null or p.category_key = p_category) and (p_state is null or p.state = p_state) and (coalesce(p_search, '') = '' or p.name ilike '%' || p_search || '%' or p.code ilike p_search || '%' or p.email ilike '%' || p_search || '%')),
    'rows', coalesce((select jsonb_agg(r) from (select jsonb_build_object('id', p.id, 'code', p.code, 'name', p.name, 'email', p.email, 'mobile', p.mobile, 'state', p.state, 'district', p.district, 'city', p.city, 'category_key', p.category_key, 'status', p.status, 'kyc_status', p.kyc_status, 'approved_at', p.approved_at,
        'registrations', (select count(*) from public.referral_attributions t where t.partner_id = p.id and t.status = 'valid')) r
      from public.partners p where (p_status is null or p.status = p_status) and (p_category is null or p.category_key = p_category) and (p_state is null or p.state = p_state)
        and (coalesce(p_search, '') = '' or p.name ilike '%' || p_search || '%' or p.code ilike p_search || '%' or p.email ilike '%' || p_search || '%')
      order by p.created_at desc limit least(greatest(p_limit, 1), 500) offset greatest(p_offset, 0)) q), '[]'::jsonb));
end $$;

create or replace function public.admin_partner_get(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners;
begin
  perform public.ps_require('partners.view');
  select * into p from public.partners where id = p_id;
  if not found then raise exception 'Partner not found.'; end if;
  return jsonb_build_object('partner', to_jsonb(p) - 'user_id',
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'file_name', d.file_name, 'status', d.status, 'path', d.storage_path, 'uploaded_at', d.uploaded_at) order by d.uploaded_at desc) from public.partner_documents d where d.partner_id = p.id), '[]'::jsonb),
    'referrals', coalesce((select jsonb_agg(jsonb_build_object('at', t.attributed_at, 'application', t.application_id, 'status', t.status, 'reason', t.reason, 'touch_verified', t.touch_verified) order by t.attributed_at desc) from public.referral_attributions t where t.partner_id = p.id), '[]'::jsonb),
    'commissions', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'amount_paise', c.amount_paise, 'status', c.status, 'at', c.created_at) order by c.created_at desc) from public.partner_commissions c where c.partner_id = p.id), '[]'::jsonb),
    'activity', coalesce((select jsonb_agg(jsonb_build_object('at', l.at, 'action', l.action, 'by', l.actor_email) order by l.at desc) from (select * from public.partner_audit_logs where (entity = 'partner' and entity_id = p.id::text) order by at desc limit 50) l), '[]'::jsonb));
end $$;

create or replace function public.admin_partner_update(p_id uuid, p jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.manage');
  if p ? 'category_key' and not exists (select 1 from public.partner_categories where key = p ->> 'category_key') then raise exception 'Unknown category.'; end if;
  update public.partners set name = coalesce(nullif(btrim(p ->> 'name'), ''), name), mobile = coalesce(nullif(btrim(p ->> 'mobile'), ''), mobile), state = coalesce(nullif(btrim(p ->> 'state'), ''), state),
    district = coalesce(nullif(btrim(p ->> 'district'), ''), district), city = coalesce(nullif(btrim(p ->> 'city'), ''), city), organisation = coalesce(p ->> 'organisation', organisation),
    designation = coalesce(p ->> 'designation', designation), category_key = coalesce(p ->> 'category_key', category_key),
    kyc_status = coalesce(case when p ->> 'kyc_status' in ('none', 'submitted', 'verified', 'rejected') then p ->> 'kyc_status' end, kyc_status) where id = p_id;
  if not found then raise exception 'Partner not found.'; end if;
  perform public.ps_audit('partner.updated', 'partner', p_id::text, p);
end $$;

create or replace function public.admin_partner_status(p_id uuid, p_action text, p_note text default '') returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.partners; ns text;
begin
  perform public.ps_require('partners.manage');
  select * into p from public.partners where id = p_id for update;
  if not found then raise exception 'Partner not found.'; end if;
  ns := case p_action when 'suspend' then 'suspended' when 'reactivate' then 'approved' when 'terminate' then 'terminated' end;
  if ns is null then raise exception 'Unknown action.'; end if;
  if p.status = 'terminated' then raise exception 'A terminated partner cannot be changed.'; end if;
  if p_action = 'reactivate' and p.status <> 'suspended' then raise exception 'Only a suspended partner can be reactivated.'; end if;
  update public.partners set status = ns, status_note = coalesce(p_note, '') where id = p_id;
  if ns <> 'approved' then   -- no new commission or payout while an account is not in good standing; existing records stay
    update public.partner_commissions set status = 'on_hold', manual_hold = true, status_reason = 'Partner ' || ns, updated_at = now() where partner_id = p_id and status in ('eligible', 'approved', 'payable') and payout_id is null;
  end if;
  perform public.ps_audit('partner.' || p_action, 'partner', p_id::text, jsonb_build_object('note', p_note));
  if ns = 'suspended' then perform public.ps_notify(p_id, 'partner_suspended', jsonb_build_object('name', p.name, 'note', coalesce(p_note, ''))); end if;
end $$;

-- categories
create or replace function public.admin_categories() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('partners', (select count(*) from public.partners p where p.category_key = c.key),
      'approval', (select to_jsonb(a) from public.partner_compliance_approvals a where a.category_key = c.key and a.revoked_at is null and (a.valid_until is null or a.valid_until >= current_date) order by a.approved_on desc limit 1)) order by c.sort, c.name) from public.partner_categories c), '[]'::jsonb);
end $$;
create or replace function public.admin_category_save(p jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare k text := lower(btrim(coalesce(p ->> 'key', '')));
begin
  perform public.ps_require('categories.manage');
  if k !~ '^[a-z][a-z0-9_]{1,40}$' then raise exception 'The key is lower-case letters, numbers and underscores.'; end if;
  if length(btrim(coalesce(p ->> 'name', ''))) < 2 then raise exception 'Enter a category name.'; end if;
  insert into public.partner_categories (key, name, description, eligibility, terms, requires_organisation, requires_designation, requires_kyc, referral_tracking_enabled, commission_paise, sort)   -- commission stays off on a new category
  values (k, btrim(p ->> 'name'), coalesce(p ->> 'description', ''), coalesce(p ->> 'eligibility', ''), coalesce(p ->> 'terms', ''), coalesce((p ->> 'requires_organisation')::boolean, false), coalesce((p ->> 'requires_designation')::boolean, false), coalesce((p ->> 'requires_kyc')::boolean, true),
    coalesce((p ->> 'referral_tracking_enabled')::boolean, true), nullif(p ->> 'commission_paise', '')::int, coalesce((p ->> 'sort')::int, 100))
  on conflict (key) do update set name = excluded.name, description = excluded.description, eligibility = excluded.eligibility, terms = excluded.terms, requires_organisation = excluded.requires_organisation, requires_designation = excluded.requires_designation,
    requires_kyc = excluded.requires_kyc, referral_tracking_enabled = excluded.referral_tracking_enabled, sort = excluded.sort, updated_at = now(),
    commission_paise = case when public.ps_can('commissions.manage') then excluded.commission_paise else public.partner_categories.commission_paise end;
  perform public.ps_audit('category.saved', 'category', k, p);
end $$;
create or replace function public.admin_category_state(p_key text, p_action text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('categories.manage');
  update public.partner_categories set active = case p_action when 'activate' then true when 'restore' then true when 'deactivate' then false when 'archive' then false else active end,
    archived = case p_action when 'archive' then true when 'restore' then false else archived end, updated_at = now() where key = p_key;
  if not found or p_action not in ('activate', 'deactivate', 'archive', 'restore') then raise exception 'Unknown category or action.'; end if;
  perform public.ps_audit('category.' || p_action, 'category', p_key, '{}'::jsonb);
end $$;
-- Turning commission on needs a recorded, unexpired legal approval for that exact category.
create or replace function public.admin_category_commission(p_key text, p_enabled boolean, p_paise int default null) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare ap public.partner_compliance_approvals;
begin
  perform public.ps_require('commissions.manage');
  if p_enabled then
    ap := public.ps_valid_approval(p_key);
    if ap.id is null then raise exception 'Record counsel''s approval for this category before turning commission on.'; end if;
    update public.partner_categories set commission_enabled = true, legal_approval_ref = ap.reference, legal_approved_at = now(), commission_paise = coalesce(p_paise, commission_paise), updated_at = now() where key = p_key;
  else
    update public.partner_categories set commission_enabled = false, commission_paise = coalesce(p_paise, commission_paise), updated_at = now() where key = p_key;
  end if;
  if not found then raise exception 'Unknown category.'; end if;
  perform public.ps_audit('category.commission_' || case when p_enabled then 'on' else 'off' end, 'category', p_key, jsonb_build_object('paise', p_paise, 'legal_ref', ap.reference));
end $$;

-- compliance
create or replace function public.admin_compliance() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('compliance.view');
  return jsonb_build_object('approvals', coalesce((select jsonb_agg(to_jsonb(a) order by a.recorded_at desc) from public.partner_compliance_approvals a), '[]'::jsonb),
    'terms_version', public.ps_s('terms_version'), 'privacy_version', public.ps_s('privacy_version'), 'review_date', public.ps_s('compliance_review_date'),
    'checklist', jsonb_build_array('BCI Rule 36 and the restrictions on advocates sharing remuneration or paying for work', 'Advocate directory content and marketing materials', 'Partner commission arrangements, category by category', 'Digital Personal Data Protection Act, 2023 and the DPDP Rules: consent, notice, retention, correction and erasure', 'Partner terms and privacy notice'));
end $$;
create or replace function public.admin_compliance_record(p jsonb) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  perform public.ps_require('compliance.manage');
  if not exists (select 1 from public.partner_categories where key = p ->> 'category_key') then raise exception 'Unknown category.'; end if;
  insert into public.partner_compliance_approvals (category_key, reference, scope, approved_by_name, approved_on, valid_until, document_url, recorded_by)
  values (p ->> 'category_key', btrim(p ->> 'reference'), coalesce(p ->> 'scope', ''), coalesce(p ->> 'approved_by_name', ''), (p ->> 'approved_on')::date, nullif(p ->> 'valid_until', '')::date, coalesce(p ->> 'document_url', ''), public.ps_email()) returning partner_compliance_approvals.id into id;
  perform public.ps_audit('compliance.recorded', 'category', p ->> 'category_key', p);
  return id;
end $$;
create or replace function public.admin_compliance_revoke(p_id uuid) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare ap public.partner_compliance_approvals;
begin
  perform public.ps_require('compliance.manage');
  update public.partner_compliance_approvals set revoked_at = now(), revoked_by = public.ps_email() where id = p_id and revoked_at is null returning * into ap;
  if not found then raise exception 'Approval not found.'; end if;
  if public.ps_valid_approval(ap.category_key) is null then   -- no valid approval left: commission goes off for that category at once
    update public.partner_categories set commission_enabled = false, updated_at = now() where key = ap.category_key;
  end if;
  perform public.ps_audit('compliance.revoked', 'category', ap.category_key, jsonb_build_object('approval', p_id));
end $$;

-- referrals and attribution review
create or replace function public.admin_referrals(p_status text default null, p_limit int default 200) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('referrals.view');
  return coalesce((select jsonb_agg(r) from (select jsonb_build_object('id', t.id, 'at', t.attributed_at, 'partner', p.code, 'partner_name', p.name, 'application', t.application_id, 'advocate', d.name, 'enrolment', d.enr, 'city', d.city, 'attribution', t.status, 'reason', t.reason, 'touch_verified', t.touch_verified,
      'listing', d.status, 'paid', exists (select 1 from public.partner_listing_payments y where y.application_id = t.application_id), 'commission', c.status, 'risk', public.ps_risk(t.id)) r
    from public.referral_attributions t left join public.partners p on p.id = t.partner_id left join public.directory_applications d on d.id = t.application_id left join public.partner_commissions c on c.attribution_id = t.id
    where p_status is null or t.status = p_status order by t.attributed_at desc limit least(greatest(p_limit, 1), 1000)) q), '[]'::jsonb);
end $$;
create or replace function public.admin_attribution_confirm(p_id uuid, p_note text default '') returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.referral_attributions;
begin
  perform public.ps_require('referrals.manage');
  update public.referral_attributions set touch_verified = true, reason = coalesce(nullif(p_note, ''), reason) where id = p_id and status = 'valid' returning * into t;
  if not found then raise exception 'Attribution not found.'; end if;
  update public.partner_fraud_flags set status = 'dismissed', resolved_by = public.ps_email(), resolved_at = now(), resolution_note = 'Attribution confirmed by staff' where attribution_id = p_id and kind = 'no_matching_click' and status = 'open';
  perform public.ps_audit('attribution.confirmed', 'attribution', p_id::text, jsonb_build_object('note', p_note));
  perform public.ps_evaluate_commission(t.application_id);
end $$;
create or replace function public.admin_attribution_override(p_id uuid, p_note text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.referral_attributions;
begin
  perform public.ps_require('referrals.manage');
  if length(btrim(coalesce(p_note, ''))) < 5 then raise exception 'Give a reason for the override.'; end if;
  update public.referral_attributions set status = 'overridden', reason = p_note where id = p_id and status = 'valid' returning * into t;
  if not found then raise exception 'Attribution not found or not valid.'; end if;
  update public.partner_commissions set status = 'rejected', status_reason = 'Attribution overridden: ' || p_note, updated_at = now() where attribution_id = p_id and status in ('pending_attribution', 'pending_payment', 'pending_verification', 'eligible', 'on_hold');
  perform public.ps_audit('attribution.overridden', 'attribution', p_id::text, jsonb_build_object('note', p_note));
end $$;

-- payment verification (staff, or the service role from a verified payment webhook)
create or replace function public.admin_record_listing_payment(p_application text, p_amount_paise int, p_reference text, p_method text default 'upi') returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare ref text := btrim(coalesce(p_reference, '')); dup public.partner_listing_payments; ap public.referral_attributions;
begin
  perform public.ps_require('payments.verify');
  if not exists (select 1 from public.directory_applications where id = p_application) then raise exception 'Directory application not found.'; end if;
  if coalesce(p_amount_paise, 0) <= 0 then raise exception 'Enter the amount received.'; end if;
  select * into dup from public.partner_listing_payments where lower(btrim(reference)) = lower(ref);
  if found then   -- a repeated payment reference is a fraud signal: flag it, do not create another payment
    select * into ap from public.referral_attributions where application_id = p_application;
    insert into public.partner_fraud_flags (partner_id, application_id, attribution_id, kind, score, detail) values (ap.partner_id, p_application, ap.id, 'repeated_payment_reference', 80, jsonb_build_object('reference', ref, 'first_used_for', dup.application_id));
    perform public.ps_audit('payment.duplicate_reference', 'directory_application', p_application, jsonb_build_object('reference', ref));
    return jsonb_build_object('ok', false, 'error', 'This payment reference was already used for another listing. It has been flagged for review.');
  end if;
  insert into public.partner_listing_payments (application_id, amount_paise, reference, method, source, verified_by) values (p_application, p_amount_paise, ref, coalesce(p_method, 'upi'), 'admin', public.ps_email());
  perform public.ps_audit('payment.verified', 'directory_application', p_application, jsonb_build_object('amount_paise', p_amount_paise, 'reference', ref));
  return jsonb_build_object('ok', true);
end $$;

-- commissions
create or replace function public.admin_commissions(p_status text default null, p_limit int default 300) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('commissions.view');
  return jsonb_build_object('rows', coalesce((select jsonb_agg(r) from (select jsonb_build_object('id', c.id, 'at', c.created_at, 'partner', p.code, 'partner_name', p.name, 'category_key', c.category_key, 'application', c.application_id, 'amount_paise', c.amount_paise, 'status', c.status, 'reason', c.status_reason, 'legal_ref', c.legal_approval_ref, 'payout_id', c.payout_id, 'risk', public.ps_risk(c.attribution_id)) r
      from public.partner_commissions c join public.partners p on p.id = c.partner_id where p_status is null or c.status = p_status order by c.created_at desc limit least(greatest(p_limit, 1), 1000)) q), '[]'::jsonb),
    'totals', coalesce((select jsonb_object_agg(status, s) from (select status, sum(amount_paise) s from public.partner_commissions group by status) z), '{}'::jsonb));
end $$;
create or replace function public.admin_commission_action(p_id uuid, p_action text, p_note text default '') returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare c public.partner_commissions; ns text;
begin
  perform public.ps_require('commissions.manage');
  select * into c from public.partner_commissions where id = p_id for update;
  if not found then raise exception 'Commission not found.'; end if;
  if p_action = 'approve' then
    if c.status <> 'eligible' then raise exception 'Only an eligible commission can be approved (this one is %).', c.status; end if;
    if not public.ps_flag('commission_generation') then raise exception 'Commission generation is switched off.'; end if;
    if not exists (select 1 from public.partner_categories k where k.key = c.category_key and k.commission_enabled) or public.ps_valid_approval(c.category_key) is null then raise exception 'This category has no valid legal approval, so its commissions cannot be approved.'; end if;
    update public.partner_commissions set status = 'approved', approved_at = now(), approved_by = public.ps_email(), status_reason = coalesce(nullif(p_note, ''), 'Approved'), updated_at = now() where id = p_id;
  elsif p_action = 'payable' then
    if c.status <> 'approved' then raise exception 'Only an approved commission can be made payable.'; end if;
    if not exists (select 1 from public.partners where id = c.partner_id and status = 'approved') then raise exception 'The partner is not in good standing.'; end if;
    update public.partner_commissions set status = 'payable', payable_at = now(), updated_at = now() where id = p_id;
  elsif p_action = 'reject' then
    if c.status in ('paid', 'reversed', 'rejected') or c.payout_id is not null then raise exception 'This commission can no longer be rejected.'; end if;
    update public.partner_commissions set status = 'rejected', status_reason = coalesce(nullif(p_note, ''), 'Rejected'), updated_at = now() where id = p_id;
  elsif p_action = 'hold' then
    if c.status in ('paid', 'reversed', 'rejected') or c.payout_id is not null then raise exception 'This commission cannot be put on hold.'; end if;
    update public.partner_commissions set status = 'on_hold', manual_hold = true, status_reason = coalesce(nullif(p_note, ''), 'Held by staff'), updated_at = now() where id = p_id;
  elsif p_action = 'release' then
    if c.status <> 'on_hold' then raise exception 'This commission is not on hold.'; end if;
    update public.partner_commissions set manual_hold = false, status = 'pending_verification', status_reason = 'Released; re-checking', updated_at = now() where id = p_id;
    perform public.ps_evaluate_commission(c.application_id);
  elsif p_action = 'reverse' then
    if c.status in ('reversed', 'rejected') then raise exception 'Already %.', c.status; end if;
    if c.payout_id is not null and c.status <> 'paid' then raise exception 'It is part of an open payout. Reject that payout first.'; end if;
    if length(btrim(coalesce(p_note, ''))) < 5 then raise exception 'Give a reason for the reversal.'; end if;
    update public.partner_commissions set status = 'reversed', reversed_at = now(), reversal_reason = p_note, updated_at = now() where id = p_id;
    if c.status = 'paid' then insert into public.partner_fraud_flags (partner_id, application_id, kind, score, detail) values (c.partner_id, c.application_id, 'clawback_required', 60, jsonb_build_object('commission', c.id, 'reason', p_note)); end if;
  else raise exception 'Unknown action.'; end if;
  perform public.ps_audit('commission.' || p_action, 'commission', p_id::text, jsonb_build_object('from', c.status, 'note', p_note));
  perform public.ps_notify(c.partner_id, 'commission_update', jsonb_build_object('ref', left(p_id::text, 8), 'status', (select status from public.partner_commissions where id = p_id)));
end $$;
create or replace function public.admin_commissions_make_payable() returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  perform public.ps_require('commissions.manage');
  update public.partner_commissions c set status = 'payable', payable_at = now(), updated_at = now() where c.status = 'approved' and exists (select 1 from public.partners p where p.id = c.partner_id and p.status = 'approved');
  get diagnostics n = row_count;
  perform public.ps_audit('commission.bulk_payable', 'commission', '', jsonb_build_object('count', n));
  return n;
end $$;

-- payouts
create or replace function public.admin_payouts(p_status text default null) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('payouts.view');
  return coalesce((select jsonb_agg(r) from (select jsonb_build_object('id', o.id, 'partner', p.code, 'partner_name', p.name, 'kyc', p.kyc_status, 'amount_paise', o.amount_paise, 'status', o.status, 'destination', o.destination_masked, 'requested_at', o.requested_at, 'utr', o.utr, 'paid_at', o.paid_at, 'note', o.note,
      'commissions', (select count(*) from public.partner_commissions c where c.payout_id = o.id)) r
    from public.partner_payouts o join public.partners p on p.id = o.partner_id where p_status is null or o.status = p_status order by o.requested_at desc limit 500) q), '[]'::jsonb);
end $$;
create or replace function public.admin_payout_destination(p_id uuid) returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare m public.partner_payment_methods; o public.partner_payouts;
begin
  perform public.ps_require('payouts.manage');
  select * into o from public.partner_payouts where id = p_id;
  if not found then raise exception 'Payout not found.'; end if;
  select * into m from public.partner_payment_methods where id = o.method_id;
  perform public.ps_audit('payout.destination_viewed', 'payout', p_id::text, '{}'::jsonb);
  return extensions.pgp_sym_decrypt(m.details_enc, public.ps_pii_key())::jsonb;
end $$;
create or replace function public.admin_payout_action(p_id uuid, p_action text, p_note text default '', p_utr text default null) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare o public.partner_payouts; p public.partners; ns text; u text := nullif(btrim(coalesce(p_utr, '')), '');
begin
  perform public.ps_require('payouts.manage');
  select * into o from public.partner_payouts where id = p_id for update;
  if not found then raise exception 'Payout not found.'; end if;
  select * into p from public.partners where id = o.partner_id;
  if p_action in ('approve', 'processing', 'paid') and (not public.ps_flag('network_enabled') or public.ps_flag('payouts_paused')) then raise exception 'Payout processing is paused.'; end if;
  if p_action = 'review' and o.status in ('requested', 'on_hold') then ns := 'under_review';
  elsif p_action = 'approve' and o.status in ('requested', 'under_review', 'on_hold') then
    if p.kyc_status <> 'verified' then raise exception 'The partner''s KYC is not verified.'; end if;
    ns := 'approved';
  elsif p_action = 'processing' and o.status = 'approved' then ns := 'processing';
  elsif p_action = 'hold' and o.status in ('requested', 'under_review', 'approved', 'processing') then ns := 'on_hold';
  elsif p_action in ('reject', 'fail') and o.status in ('requested', 'under_review', 'approved', 'processing', 'on_hold') then
    if p_action = 'reject' and length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'Say why the payout is rejected.'; end if;
    ns := case p_action when 'reject' then 'rejected' else 'failed' end;
    update public.partner_commissions set payout_id = null, updated_at = now() where payout_id = p_id and status = 'payable';   -- balance goes back to the partner
  elsif p_action = 'paid' and o.status in ('approved', 'processing') then
    if u is null or length(u) < 6 then raise exception 'Enter the UTR or bank reference of the transfer.'; end if;
    begin
      update public.partner_payouts set utr = u where id = p_id;
    exception when unique_violation then
      insert into public.partner_fraud_flags (partner_id, kind, score, detail) values (o.partner_id, 'repeated_payout_reference', 80, jsonb_build_object('utr', u, 'payout', p_id));
      raise exception 'That UTR is already recorded on another payout.';
    end;
    update public.partner_commissions set status = 'paid', paid_at = now(), updated_at = now() where payout_id = p_id and status = 'payable';
    update public.partner_payouts set paid_by = public.ps_email(), paid_at = now() where id = p_id;
    ns := 'paid';
  else raise exception 'A % payout cannot be %.', o.status, p_action; end if;
  update public.partner_payouts set status = ns, note = coalesce(nullif(p_note, ''), note), decided_by = public.ps_email(), decided_at = now() where id = p_id;
  perform public.ps_audit('payout.' || p_action, 'payout', p_id::text, jsonb_build_object('note', p_note, 'utr', u, 'status', ns));
  perform public.ps_notify(o.partner_id, 'payout_update', jsonb_build_object('name', p.name, 'amount', public.ps_inr(o.amount_paise), 'status', replace(ns, '_', ' '), 'note', coalesce(p_note, '')));
end $$;

-- marketing
create or replace function public.admin_campaigns() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('clicks', (select count(*) from public.partner_referrals r where r.campaign_id = c.id), 'registrations', (select count(*) from public.referral_attributions t join public.partner_referrals r on r.id = t.touch_id where r.campaign_id = c.id and t.status = 'valid')) order by c.created_at desc) from public.partner_campaigns c), '[]'::jsonb);
end $$;
create or replace function public.admin_campaign_save(p jsonb) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := nullif(p ->> 'id', '')::uuid; st text := coalesce(p ->> 'status', 'draft');
begin
  perform public.ps_require('marketing.manage');
  if st = 'active' and not public.ps_flag('campaigns_enabled') then raise exception 'Campaigns are switched off in settings.'; end if;
  if id is null then
    insert into public.partner_campaigns (name, channel, message, category_keys, status, starts_at, ends_at, created_by) values (btrim(p ->> 'name'), coalesce(p ->> 'channel', 'general'), coalesce(p ->> 'message', ''),
      coalesce(array(select jsonb_array_elements_text(p -> 'category_keys')), '{}'), st, nullif(p ->> 'starts_at', '')::timestamptz, nullif(p ->> 'ends_at', '')::timestamptz, public.ps_email()) returning partner_campaigns.id into id;
  else
    update public.partner_campaigns c set name = btrim(p ->> 'name'), channel = coalesce(p ->> 'channel', channel), message = coalesce(p ->> 'message', message), category_keys = case when p ? 'category_keys' then array(select jsonb_array_elements_text(p -> 'category_keys')) else category_keys end, status = st,
      starts_at = nullif(p ->> 'starts_at', '')::timestamptz, ends_at = nullif(p ->> 'ends_at', '')::timestamptz where c.id = nullif(p ->> 'id', '')::uuid;
  end if;
  perform public.ps_audit('campaign.saved', 'campaign', id::text, p);
  return id;
end $$;
create or replace function public.admin_resources() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.partner_resources r), '[]'::jsonb);
end $$;
create or replace function public.admin_resource_save(p jsonb) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid := nullif(p ->> 'id', '')::uuid;
begin
  perform public.ps_require('marketing.manage');
  if id is null then
    insert into public.partner_resources (title, kind, body, file_url, category_keys, published, created_by) values (btrim(p ->> 'title'), p ->> 'kind', coalesce(p ->> 'body', ''), coalesce(p ->> 'file_url', ''),
      coalesce(array(select jsonb_array_elements_text(p -> 'category_keys')), '{}'), coalesce((p ->> 'published')::boolean, false), public.ps_email()) returning partner_resources.id into id;
  else
    update public.partner_resources r set title = btrim(p ->> 'title'), kind = coalesce(p ->> 'kind', kind), body = coalesce(p ->> 'body', body), file_url = coalesce(p ->> 'file_url', file_url),
      category_keys = case when p ? 'category_keys' then array(select jsonb_array_elements_text(p -> 'category_keys')) else category_keys end, published = coalesce((p ->> 'published')::boolean, published), updated_at = now() where r.id = nullif(p ->> 'id', '')::uuid;
  end if;
  perform public.ps_audit('resource.saved', 'resource', id::text, jsonb_build_object('title', p ->> 'title', 'published', p ->> 'published'));
  return id;
end $$;

-- notifications
create or replace function public.admin_notifications() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return jsonb_build_object('templates', coalesce((select jsonb_agg(to_jsonb(t) order by t.key) from public.partner_templates t), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('at', n.created_at, 'partner', p.code, 'title', n.title, 'channel', n.channel, 'email_status', n.email_status) order by n.created_at desc) from (select * from public.partner_notifications order by created_at desc limit 100) n join public.partners p on p.id = n.partner_id), '[]'::jsonb));
end $$;
create or replace function public.admin_template_save(p_key text, p_subject text, p_body text, p_active boolean default true) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('notifications.manage');
  update public.partner_templates set subject = coalesce(p_subject, subject), body = coalesce(p_body, body), active = coalesce(p_active, active), updated_at = now() where key = p_key;
  if not found then raise exception 'Unknown template.'; end if;
  perform public.ps_audit('template.saved', 'template', p_key, '{}'::jsonb);
end $$;
create or replace function public.admin_broadcast(p_title text, p_body text, p_categories text[] default '{}') returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare n int;
begin
  perform public.ps_require('notifications.manage');
  if length(btrim(coalesce(p_title, ''))) < 3 or length(btrim(coalesce(p_body, ''))) < 3 then raise exception 'Write a title and a message.'; end if;
  insert into public.partner_notifications (partner_id, kind, title, body, channel) select id, 'campaign', btrim(p_title), btrim(p_body), 'in_app' from public.partners where status = 'approved' and (cardinality(coalesce(p_categories, '{}')) = 0 or category_key = any (p_categories));
  get diagnostics n = row_count;
  perform public.ps_audit('notification.broadcast', 'notification', '', jsonb_build_object('title', p_title, 'count', n));
  return n;
end $$;

-- leaderboard, fraud, support, settings, roles, audit, reports
create or replace function public.admin_leaderboard(p_days int default 90) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('referrals.view');
  return coalesce((select jsonb_agg(r) from (select jsonb_build_object('code', p.code, 'name', p.name, 'category_key', p.category_key, 'state', p.state, 'district', p.district,
      'registrations', count(t.id) filter (where t.status = 'valid'), 'approved_listings', count(d.id) filter (where d.status = 'verified' and t.status = 'valid')) r
    from public.partners p left join public.referral_attributions t on t.partner_id = p.id and t.attributed_at > now() - make_interval(days => greatest(p_days, 1)) left join public.directory_applications d on d.id = t.application_id
    where p.status = 'approved' group by p.id order by count(d.id) filter (where d.status = 'verified' and t.status = 'valid') desc, count(t.id) filter (where t.status = 'valid') desc limit 50) q), '[]'::jsonb);
end $$;
create or replace function public.admin_fraud_flags(p_status text default 'open') returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('fraud.manage');
  return coalesce((select jsonb_agg(r) from (select jsonb_build_object('id', f.id, 'at', f.created_at, 'kind', f.kind, 'score', f.score, 'status', f.status, 'partner', p.code, 'partner_name', p.name, 'application', f.application_id, 'detail', f.detail, 'note', f.resolution_note) r
    from public.partner_fraud_flags f left join public.partners p on p.id = f.partner_id where p_status is null or f.status = p_status order by f.created_at desc limit 500) q), '[]'::jsonb);
end $$;
create or replace function public.admin_fraud_resolve(p_id uuid, p_decision text, p_note text default '') returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare f public.partner_fraud_flags;
begin
  perform public.ps_require('fraud.manage');
  if p_decision not in ('dismissed', 'confirmed') then raise exception 'Choose dismiss or confirm.'; end if;
  update public.partner_fraud_flags set status = p_decision, resolved_by = public.ps_email(), resolved_at = now(), resolution_note = coalesce(p_note, '') where id = p_id and status = 'open' returning * into f;
  if not found then raise exception 'Flag not found or already resolved.'; end if;
  if f.application_id is not null then perform public.ps_evaluate_commission(f.application_id); end if;
  if p_decision = 'confirmed' and f.attribution_id is not null then
    update public.partner_commissions set status = 'on_hold', manual_hold = true, status_reason = 'Fraud flag confirmed: ' || f.kind, updated_at = now() where attribution_id = f.attribution_id and status in ('pending_attribution', 'pending_payment', 'pending_verification', 'eligible', 'on_hold') ;
  end if;
  perform public.ps_audit('fraud.' || p_decision, 'fraud_flag', p_id::text, jsonb_build_object('note', p_note, 'kind', f.kind));
end $$;
create or replace function public.admin_fraud_add(p_partner uuid, p_kind text, p_score int, p_note text) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare id uuid;
begin
  perform public.ps_require('fraud.manage');
  insert into public.partner_fraud_flags (partner_id, kind, score, detail) values (p_partner, left(coalesce(nullif(btrim(p_kind), ''), 'manual_flag'), 60), least(greatest(coalesce(p_score, 30), 0), 100), jsonb_build_object('note', p_note, 'by', public.ps_email())) returning partner_fraud_flags.id into id;
  perform public.ps_audit('fraud.flagged', 'fraud_flag', id::text, jsonb_build_object('note', p_note));
  return id;
end $$;

create or replace function public.admin_tickets(p_status text default null) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('support.manage');
  return coalesce((select jsonb_agg(r) from (select jsonb_build_object('id', t.id, 'at', t.created_at, 'partner', p.code, 'partner_name', p.name, 'email', p.email, 'subject', t.subject, 'message', t.message, 'status', t.status, 'reply', t.reply) r
    from public.partner_support_tickets t join public.partners p on p.id = t.partner_id where p_status is null or t.status = p_status order by t.created_at desc limit 300) q), '[]'::jsonb);
end $$;
create or replace function public.admin_ticket_reply(p_id uuid, p_reply text, p_close boolean default false) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('support.manage');
  if length(btrim(coalesce(p_reply, ''))) < 2 then raise exception 'Write a reply.'; end if;
  update public.partner_support_tickets set reply = btrim(p_reply), status = case when p_close then 'closed' else 'replied' end, replied_by = public.ps_email(), replied_at = now() where id = p_id;
  if not found then raise exception 'Ticket not found.'; end if;
  perform public.ps_audit('ticket.replied', 'ticket', p_id::text, '{}'::jsonb);
end $$;

create or replace function public.admin_settings() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return jsonb_build_object('settings', coalesce((select jsonb_object_agg(key, jsonb_build_object('value', value, 'description', description, 'updated_at', updated_at)) from public.partner_settings), '{}'::jsonb), 'can_edit', public.ps_can('settings.manage'));
end $$;
create or replace function public.admin_settings_save(p jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare k text; v jsonb; flags text[] := array['network_enabled','registration_open','referral_tracking','commission_generation','payouts_paused','campaigns_enabled','otp_required','whatsapp_enabled'];
  ints text[] := array['joining_fee_paise','default_commission_paise','min_withdrawal_paise','attribution_window_days','fraud_review_threshold','fraud_hold_threshold','burst_limit_per_day']; old jsonb;
begin
  perform public.ps_require('settings.manage');
  for k, v in select * from jsonb_each(p) loop
    select value into old from public.partner_settings where key = k;
    if not found then raise exception 'Unknown setting %.', k; end if;
    if k = any (flags) and jsonb_typeof(v) <> 'boolean' then raise exception '% must be on or off.', k; end if;
    if k = any (ints) and (jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric < 0 or (v #>> '{}')::numeric <> floor((v #>> '{}')::numeric)) then raise exception '% must be a whole number, zero or more.', k; end if;
    if k = 'attribution_window_days' and (v #>> '{}')::int not between 1 and 365 then raise exception 'The attribution window is 1 to 365 days.'; end if;
    if k = 'referral_code_prefix' and (jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[A-Z]{2,4}$') then raise exception 'The prefix is 2 to 4 capital letters.'; end if;
    if k = 'payout_cycle' and (v #>> '{}') not in ('monthly', 'fortnightly', 'weekly') then raise exception 'Choose monthly, fortnightly or weekly.'; end if;
    if k = 'listing_price_paise' and v <> 'null'::jsonb and (jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric < 0) then raise exception 'Listing price must be an amount in paise.'; end if;
    if k = 'listing_price_status' then
      if (v #>> '{}') not in ('unreconciled', 'approved') then raise exception 'Unknown price status.'; end if;
      if (v #>> '{}') = 'approved' and coalesce(public.ps_int('listing_price_paise'), (p ->> 'listing_price_paise')::bigint) is null then raise exception 'Set the listing price before approving it.'; end if;
    end if;
    if k = 'commission_generation' and v = 'true'::jsonb and not exists (select 1 from public.partner_categories where commission_enabled) then raise exception 'No category has commission switched on, which needs recorded legal approval first.'; end if;
    update public.partner_settings set value = v, updated_at = now(), updated_by = (select auth.uid()) where key = k;
    perform public.ps_audit('setting.changed', 'setting', k, jsonb_build_object('from', old, 'to', v));
  end loop;
end $$;

create or replace function public.admin_roles() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('roles.manage');
  return jsonb_build_object('roles', coalesce((select jsonb_agg(to_jsonb(r) order by r.is_system desc, r.name) from public.partner_roles r), '[]'::jsonb),
    'staff', coalesce((select jsonb_agg(to_jsonb(s) order by s.email) from public.partner_staff s), '[]'::jsonb),
    'permissions', jsonb_build_array('partners.view','partners.manage','categories.manage','referrals.view','referrals.manage','commissions.view','commissions.manage','payments.verify','payouts.view','payouts.manage','marketing.manage','notifications.manage','fraud.manage','compliance.view','compliance.manage','support.manage','reports.view','settings.manage','audit.view','roles.manage'));
end $$;
create or replace function public.admin_role_save(p_key text, p_name text, p_permissions text[]) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare allowed text[] := array['partners.view','partners.manage','categories.manage','referrals.view','referrals.manage','commissions.view','commissions.manage','payments.verify','payouts.view','payouts.manage','marketing.manage','notifications.manage','fraud.manage','compliance.view','compliance.manage','support.manage','reports.view','settings.manage','audit.view','roles.manage'];
begin
  perform public.ps_require('roles.manage');
  if not public.ps_is_super() then raise exception 'Only a Super Admin can create or change roles.' using errcode = '42501'; end if;
  if exists (select 1 from unnest(coalesce(p_permissions, '{}')) x where x <> all (allowed)) then raise exception 'Unknown permission.'; end if;
  if exists (select 1 from public.partner_roles where key = p_key and is_system) then raise exception 'Built-in roles cannot be edited. Create a custom role instead.'; end if;
  insert into public.partner_roles (key, name, permissions) values (p_key, btrim(p_name), coalesce(p_permissions, '{}')) on conflict (key) do update set name = excluded.name, permissions = excluded.permissions;
  perform public.ps_audit('role.saved', 'role', p_key, jsonb_build_object('permissions', p_permissions));
end $$;
create or replace function public.admin_staff_save(p_email text, p_role text, p_active boolean default true) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('roles.manage');
  if not public.ps_is_super() then raise exception 'Only a Super Admin can manage staff.' using errcode = '42501'; end if;
  if lower(btrim(p_email)) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email.'; end if;
  insert into public.partner_staff (email, role_key, active, added_by) values (lower(btrim(p_email)), p_role, coalesce(p_active, true), public.ps_email()) on conflict (email) do update set role_key = excluded.role_key, active = excluded.active;
  perform public.ps_audit('staff.saved', 'staff', lower(btrim(p_email)), jsonb_build_object('role', p_role, 'active', p_active));
end $$;

create or replace function public.admin_audit(p_entity text default null, p_limit int default 200) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('audit.view');
  return coalesce((select jsonb_agg(to_jsonb(l) - 'actor_user' order by l.at desc) from (select * from public.partner_audit_logs where p_entity is null or entity = p_entity order by at desc limit least(greatest(p_limit, 1), 1000)) l), '[]'::jsonb);
end $$;

create or replace function public.admin_report(p_kind text, p jsonb default '{}'::jsonb) returns json language plpgsql stable security definer set search_path = public, pg_temp as $$
declare r json; need text := case when p_kind in ('commission_ledger', 'monthly_revenue') then 'commissions.view' when p_kind = 'payouts' then 'payouts.view' when p_kind = 'fraud' then 'fraud.manage' else 'reports.view' end;
begin
  perform public.ps_require(need);
  perform public.ps_audit('report.run', 'report', p_kind, '{}'::jsonb);
  if p_kind = 'partner_master' then
    select json_agg(json_build_object('Partner ID', code, 'Name', name, 'Email', email, 'Mobile', mobile, 'Category', category_key, 'State', state, 'District', district, 'City', city, 'Status', status, 'KYC', kyc_status, 'Approved on', to_char(approved_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')) order by code) into r from public.partners;
  elsif p_kind = 'applications' then
    select json_agg(json_build_object('Applied on', to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'Name', name, 'Email', email, 'Category', category_key, 'State', state, 'District', district, 'Status', status, 'Reviewed by', coalesce(reviewed_by, '')) order by created_at) into r from public.partner_applications;
  elsif p_kind = 'state_wise' then
    select json_agg(json_build_object('State', state, 'Partners', n, 'Registrations', regs, 'Approved listings', listings) order by n desc) into r from (select p.state, count(distinct p.id) n, count(t.id) filter (where t.status = 'valid') regs, count(d.id) filter (where d.status = 'verified' and t.status = 'valid') listings
      from public.partners p left join public.referral_attributions t on t.partner_id = p.id left join public.directory_applications d on d.id = t.application_id group by p.state) z;
  elsif p_kind = 'district_wise' then
    select json_agg(json_build_object('State', state, 'District', district, 'Partners', n, 'Registrations', regs, 'Approved listings', listings) order by state, district) into r from (select p.state, p.district, count(distinct p.id) n, count(t.id) filter (where t.status = 'valid') regs, count(d.id) filter (where d.status = 'verified' and t.status = 'valid') listings
      from public.partners p left join public.referral_attributions t on t.partner_id = p.id left join public.directory_applications d on d.id = t.application_id group by p.state, p.district) z;
  elsif p_kind = 'referrals' then
    select json_agg(json_build_object('Date', to_char(t.attributed_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'Partner ID', t.code, 'Application', t.application_id, 'Attribution', t.status, 'Click matched', t.touch_verified, 'Reason', t.reason) order by t.attributed_at) into r from public.referral_attributions t;
  elsif p_kind = 'approved_listings' then
    select json_agg(json_build_object('Application', d.id, 'Advocate', d.name, 'Enrolment', d.enr, 'City', d.city, 'Partner ID', t.code, 'Decided on', to_char(d.decided_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')) order by d.decided_at) into r
      from public.referral_attributions t join public.directory_applications d on d.id = t.application_id where t.status = 'valid' and d.status = 'verified';
  elsif p_kind = 'commission_ledger' then
    select json_agg(json_build_object('Date', to_char(c.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'Commission', c.id, 'Partner ID', pt.code, 'Category', c.category_key, 'Application', c.application_id, 'Amount (INR)', c.amount_paise / 100.0, 'Status', c.status, 'Reason', c.status_reason, 'Legal approval', c.legal_approval_ref, 'Paid on', to_char(c.paid_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')) order by c.created_at) into r from public.partner_commissions c join public.partners pt on pt.id = c.partner_id;
  elsif p_kind = 'payouts' then
    select json_agg(json_build_object('Requested', to_char(o.requested_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'Partner ID', pt.code, 'Amount (INR)', o.amount_paise / 100.0, 'Status', o.status, 'Destination', o.destination_masked, 'UTR', coalesce(o.utr, ''), 'Paid on', to_char(o.paid_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD')) order by o.requested_at) into r from public.partner_payouts o join public.partners pt on pt.id = o.partner_id;
  elsif p_kind = 'monthly_revenue' then
    select json_agg(json_build_object('Month', m, 'Verified listing payments (INR)', pay / 100.0, 'Commission accrued (INR)', comm / 100.0, 'Remaining before other costs (INR)', (pay - comm) / 100.0, 'Listings paid', n) order by m) into r
      from (select to_char(verified_at at time zone 'Asia/Kolkata', 'YYYY-MM') m, sum(amount_paise) pay, count(*) n, coalesce(sum((select c.amount_paise from public.partner_commissions c where c.application_id = y.application_id and c.status in ('eligible', 'approved', 'payable', 'paid'))), 0) comm from public.partner_listing_payments y group by 1) z;
  elsif p_kind = 'campaigns' then
    select json_agg(json_build_object('Campaign', c.name, 'Channel', c.channel, 'Status', c.status, 'Clicks', (select count(*) from public.partner_referrals x where x.campaign_id = c.id)) order by c.created_at) into r from public.partner_campaigns c;
  elsif p_kind = 'fraud' then
    select json_agg(json_build_object('Date', to_char(f.created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD'), 'Kind', f.kind, 'Score', f.score, 'Status', f.status, 'Partner ID', coalesce(pt.code, ''), 'Application', coalesce(f.application_id, ''), 'Resolution', f.resolution_note) order by f.created_at) into r from public.partner_fraud_flags f left join public.partners pt on pt.id = f.partner_id;
  else raise exception 'Unknown report.'; end if;
  return coalesce(r, '[]'::json);   -- json (not jsonb) so each column keeps the order it is written in
end $$;

-- ---------- storage for KYC documents (private; each user reaches only their own folder) ----------
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit) values ('partner-docs', 'partner-docs', false, 10485760) on conflict (id) do nothing;
    drop policy if exists partner_docs_own on storage.objects;
    create policy partner_docs_own on storage.objects for all to authenticated using (bucket_id = 'partner-docs' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'partner-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
    drop policy if exists partner_docs_staff on storage.objects;
    create policy partner_docs_staff on storage.objects for select to authenticated using (bucket_id = 'partner-docs' and public.admin_can('partners.manage'));
  end if;
end $$;

-- ---------- who may call what ----------
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and (p.proname like 'admin\_%' or p.proname like 'partner\_%' or p.proname like 'ps\_%') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname in ('partner_public_config', 'partner_validate_code', 'partner_track_click') then execute format('grant execute on function %s to anon, authenticated', f.sig);
    elsif f.proname like 'admin\_%' or f.proname like 'partner\_%' then execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;
-- The service role (payment webhook, scheduled jobs) may use the internal evaluators directly.
grant execute on function public.ps_evaluate_commission(text), public.ps_attribute_application(text) to service_role;

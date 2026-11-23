-- Legal Staff — electronic signing inside the AI Drafting Studio (functions/esign, sign.html).
--
-- What this adds
--   esign_settings   one row of platform settings the Super Admin controls (on/off, providers, prices, limits)
--   esign_requests   one signing request per document sent for signature (the document snapshot, status, hashes)
--   esign_signers    the people who sign: contact details, order, role, a HASH of their link token, consent, status
--   esign_fields     signature / initials / date / name / designation / text fields placed on a page
--   esign_events     append-only audit trail; every row carries the hash of the row before it (a hash chain)
--   esign_wallets    signing credits per firm, and per-firm overrides (monthly limit, blocked)
--   esign_ledger     every credit purchase, grant, use and refund
--   esign_provider_usage  units and cost per provider call, for the Super Admin's expense view
--   a private Storage bucket 'esign' for the original and signed PDFs (written only by the function, encrypted by it)
--
-- Access model: every table has row level security. Firm members may READ their own firm's rows (secret columns such as
-- token hashes are not granted to them); nobody writes from the browser. Everything is written by functions/esign with the
-- service role, after it has checked the caller. Signers (people without an account) only ever talk to functions/esign
-- with their secret link; they never touch these tables.
--
-- Provider credentials are kept in Vault ('esign_provider_<name>'), never in a table the browser can read.

-- ---------- settings ----------
create table if not exists public.esign_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  active_provider text not null default 'native',
  providers jsonb not null default '{"native":{"enabled":true,"cost_per_document_paise":0},"docuseal":{"enabled":false,"base_url":"","cost_per_document_paise":0}}'::jsonb,
  pricing_mode text not null default 'free' check (pricing_mode in ('free', 'credits')),
  credits_per_document integer not null default 1 check (credits_per_document between 0 and 100),
  packs jsonb not null default '[]'::jsonb,                 -- [{ "credits": 10, "price_paise": 49900 }] set by the Super Admin; no price is built in
  free_per_month integer not null default 0 check (free_per_month >= 0),        -- documents per firm per IST month that cost nothing
  free_trial_documents integer not null default 0 check (free_trial_documents >= 0),   -- documents per firm, once, that cost nothing
  max_documents_per_month integer not null default 0 check (max_documents_per_month >= 0),   -- per firm; 0 = no limit
  max_signers integer not null default 10 check (max_signers between 1 and 50),
  max_fields integer not null default 100 check (max_fields between 1 and 500),
  default_expiry_days integer not null default 14 check (default_expiry_days between 1 and 365),
  max_expiry_days integer not null default 90 check (max_expiry_days between 1 and 365),
  require_otp boolean not null default true,                -- the signer proves control of their email with a one-time code before signing
  updated_at timestamptz not null default now()
);
insert into public.esign_settings (id) values (1) on conflict do nothing;
alter table public.esign_settings enable row level security;      -- no policies: only functions/esign (service role) reads it

-- ---------- requests ----------
create table if not exists public.esign_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  created_by uuid not null,
  creator_name text not null default '',
  draft_key text not null default '',                       -- which drafting template the document came from (index in the Drafting Studio)
  title text not null check (length(trim(title)) between 1 and 200),
  message text not null default '' check (length(message) <= 2000),
  status text not null default 'prepared' check (status in ('draft', 'prepared', 'sent', 'viewed', 'partial', 'completed', 'declined', 'expired', 'cancelled', 'failed')),
  mode text not null default 'parallel' check (mode in ('parallel', 'sequential')),
  provider text not null default 'native',
  provider_ref text not null default '',
  doc_html text not null default '',                        -- the document as it was when prepared; the signing copy is rendered from this
  letterhead jsonb not null default '{}'::jsonb,            -- firm name and address printed at the top of page 1
  layout jsonb,                                             -- pages and lines as rendered (also what the browser draws)
  page_count integer not null default 0,
  doc_hash text not null default '',                        -- SHA-256 of the original PDF
  original_path text not null default '',
  signed_path text not null default '',
  signed_hash text not null default '',
  expires_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  declined_at timestamptz,
  charge jsonb,                                             -- how the send was paid: { via: 'credits' | 'free_month' | 'free_trial' | 'none', credits: n }
  error text,
  error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists esign_requests_firm_idx on public.esign_requests (firm_id, created_at desc);
create index if not exists esign_requests_draft_idx on public.esign_requests (firm_id, draft_key, created_at desc);
create index if not exists esign_requests_open_idx on public.esign_requests (expires_at) where status in ('sent', 'viewed', 'partial');

-- ---------- signers ----------
create table if not exists public.esign_signers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.esign_requests(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  email text not null check (email = lower(email) and email like '%_@_%._%'),
  phone text not null default '',
  role text not null default 'Other',
  sign_order integer not null default 1 check (sign_order between 1 and 50),
  required boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'notified', 'viewed', 'signed', 'declined')),
  token_hash text,                                          -- SHA-256 of the link token; the token itself is never stored
  token_expires timestamptz,
  session_hash text,                                        -- SHA-256 of the short-lived session secret issued after the email code
  session_expires timestamptz,
  otp_hash text, otp_expires timestamptz, otp_attempts integer not null default 0, otp_sent_at timestamptz,
  verified_at timestamptz,
  notified_at timestamptz, viewed_at timestamptz, signed_at timestamptz, declined_at timestamptz,
  decline_reason text not null default '',
  consent jsonb,                                            -- { text, version, at, ip, ua }
  signature jsonb,                                          -- { type: 'typed' | 'drawn', text?, png? (data URL), font? }
  reminders integer not null default 0,
  last_reminder_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists esign_signers_token_idx on public.esign_signers (token_hash) where token_hash is not null;
create index if not exists esign_signers_request_idx on public.esign_signers (request_id, sign_order);
create index if not exists esign_signers_email_idx on public.esign_signers (firm_id, email);

-- ---------- fields ----------
-- x, y, w, h are fractions of the page (0 to 1) measured from the top-left corner, so they survive any page size.
create table if not exists public.esign_fields (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.esign_requests(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  signer_id uuid not null references public.esign_signers(id) on delete cascade,
  kind text not null check (kind in ('signature', 'initials', 'date', 'name', 'designation', 'text')),
  page integer not null check (page >= 1),
  x numeric not null check (x >= 0 and x <= 1),
  y numeric not null check (y >= 0 and y <= 1),
  w numeric not null check (w > 0 and w <= 1),
  h numeric not null check (h > 0 and h <= 1),
  required boolean not null default true,
  label text not null default '' check (length(label) <= 200),
  value text,                                               -- filled in by the signer (date, name, designation, text); signature and initials images live on the signer
  filled_at timestamptz,
  created_at timestamptz not null default now(),
  check (x + w <= 1.0001 and y + h <= 1.0001)
);
create index if not exists esign_fields_request_idx on public.esign_fields (request_id, page);

-- ---------- audit trail: append-only, hash-chained ----------
create table if not exists public.esign_events (
  id bigserial primary key,
  request_id uuid not null references public.esign_requests(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  signer_id uuid,
  type text not null,
  actor text not null default '',                           -- who did it: a member's name, a signer's name and email, or 'system'
  ip text not null default '',
  ua text not null default '',
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default clock_timestamp(),
  prev_hash text not null default '',
  hash text not null default ''
);
create index if not exists esign_events_request_idx on public.esign_events (request_id, id);
create index if not exists esign_events_type_idx on public.esign_events (type, at desc);

-- The text that is hashed for one event. Kept in one function so the insert trigger and the verifier cannot disagree.
create or replace function public.esign_event_text(e public.esign_events) returns text
language sql immutable set search_path = '' as $$
  select concat_ws('|', e.prev_hash, e.request_id::text, coalesce(e.signer_id::text, ''), e.type, e.actor, e.ip, e.ua,
    to_char(e.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), e.data::text);
$$;
create or replace function public.esign_hash(t text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(t, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.esign_event_chain() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_prev text;
begin
  perform pg_advisory_xact_lock(hashtext('esign:' || new.request_id::text));
  select e.hash into v_prev from public.esign_events e where e.request_id = new.request_id order by e.id desc limit 1;
  new.prev_hash := coalesce(v_prev, '');
  new.at := clock_timestamp();
  new.hash := public.esign_hash(public.esign_event_text(new));
  return new;
end $$;
drop trigger if exists esign_events_chain on public.esign_events;
create trigger esign_events_chain before insert on public.esign_events for each row execute function public.esign_event_chain();

-- Nobody edits or deletes audit rows. (Deleting a whole request, which the app never does, needs a deliberate switch.)
create or replace function public.esign_event_frozen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('esign.allow_purge', true), '') = 'on' then return old; end if;
  raise exception 'The signing audit trail cannot be changed.' using errcode = '42501';
end $$;
drop trigger if exists esign_events_frozen on public.esign_events;
create trigger esign_events_frozen before update or delete on public.esign_events for each row execute function public.esign_event_frozen();

-- Recomputes a request's hash chain. Returns { ok, events, broken_at } where broken_at is the first event id that does not match.
create or replace function public.esign_chain_check(p_request uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.esign_events; v_prev text := ''; n integer := 0;
begin
  for r in select * from public.esign_events e where e.request_id = p_request order by e.id loop
    n := n + 1;
    if r.prev_hash <> v_prev or r.hash <> public.esign_hash(public.esign_event_text(r)) then
      return jsonb_build_object('ok', false, 'events', n, 'broken_at', r.id);
    end if;
    v_prev := r.hash;
  end loop;
  return jsonb_build_object('ok', true, 'events', n, 'head', v_prev);
end $$;

-- ---------- credits ----------
create table if not exists public.esign_wallets (
  firm_id uuid primary key references public.firms(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  free_trial_used integer not null default 0 check (free_trial_used >= 0),
  monthly_limit integer check (monthly_limit is null or monthly_limit >= 0),   -- per-firm override of the platform limit (0 = no limit); null = use the platform limit
  blocked boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.esign_ledger (
  id bigserial primary key,
  firm_id uuid not null references public.firms(id) on delete cascade,
  delta integer not null,
  kind text not null check (kind in ('purchase', 'grant', 'use', 'refund', 'free')),
  request_id uuid,
  payment_id uuid,
  note text not null default '',
  balance_after integer not null default 0,
  by_user uuid,
  created_at timestamptz not null default now()
);
create index if not exists esign_ledger_firm_idx on public.esign_ledger (firm_id, created_at desc);

create table if not exists public.esign_provider_usage (
  id bigserial primary key,
  provider text not null,
  firm_id uuid references public.firms(id) on delete set null,
  request_id uuid,
  kind text not null default 'document',
  units integer not null default 1,
  cost_paise integer not null default 0,
  ok boolean not null default true,
  note text not null default '',
  at timestamptz not null default now()
);
create index if not exists esign_usage_idx on public.esign_provider_usage (provider, at desc);

-- Credit orders are ordinary UPI payments (functions/upi-pay): kind 'esign', cycle 'once', and the credits they buy.
alter table public.payments add column if not exists kind text not null default 'plan';
alter table public.payments add column if not exists esign_credits integer;

-- ---------- charging ----------
-- Counts what a firm has used this IST month. A document counts once it has been sent.
create or replace function public.esign_month_count(f uuid, p_from timestamptz, p_via text default null) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.esign_requests r
  where r.firm_id = f and r.sent_at >= p_from and r.charge is not null and (p_via is null or r.charge ->> 'via' = p_via);
$$;

-- Takes the payment for sending one document, atomically, and marks the request sent.
--   order of use: this month's free documents, then the firm's one-time free documents, then credits.
--   p_priced = false (pricing mode "free") charges nothing but still counts toward the monthly limit.
-- Returns { ok: true, via, credits, left } or { ok: false, code: 'blocked' | 'limit' | 'credits', need, have }.
create or replace function public.esign_charge(p_firm uuid, p_request uuid, p_month_from timestamptz, p_free_month integer, p_free_trial integer,
  p_cost integer, p_limit integer, p_priced boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare w public.esign_wallets; v_used integer; v_free integer; v_lim integer; v_via text; v_credits integer := 0; v_charge jsonb;
begin
  insert into public.esign_wallets (firm_id) values (p_firm) on conflict do nothing;
  select * into w from public.esign_wallets x where x.firm_id = p_firm for update;
  if w.blocked then return jsonb_build_object('ok', false, 'code', 'blocked'); end if;
  v_lim := coalesce(w.monthly_limit, p_limit);
  v_used := public.esign_month_count(p_firm, p_month_from);
  if v_lim > 0 and v_used >= v_lim then return jsonb_build_object('ok', false, 'code', 'limit', 'limit', v_lim); end if;
  v_free := public.esign_month_count(p_firm, p_month_from, 'free_month');
  if not p_priced or p_cost = 0 then v_via := 'none';
  elsif v_free < p_free_month then v_via := 'free_month';
  elsif w.free_trial_used < p_free_trial then
    v_via := 'free_trial'; update public.esign_wallets x set free_trial_used = x.free_trial_used + 1, updated_at = now() where x.firm_id = p_firm;
  elsif w.credits >= p_cost then
    v_via := 'credits'; v_credits := p_cost;
    update public.esign_wallets x set credits = x.credits - p_cost, updated_at = now() where x.firm_id = p_firm;
    insert into public.esign_ledger (firm_id, delta, kind, request_id, note, balance_after) values (p_firm, -p_cost, 'use', p_request, 'Document sent for signature', w.credits - p_cost);
  else return jsonb_build_object('ok', false, 'code', 'credits', 'need', p_cost, 'have', w.credits); end if;
  v_charge := jsonb_build_object('via', v_via, 'credits', v_credits);
  update public.esign_requests r set charge = v_charge, sent_at = now(), updated_at = now() where r.id = p_request and r.firm_id = p_firm;
  return jsonb_build_object('ok', true, 'via', v_via, 'credits', v_credits, 'left', (select x.credits from public.esign_wallets x where x.firm_id = p_firm));
end $$;

-- Gives back what a send took (the send failed after payment). Clears the charge so the document no longer counts.
create or replace function public.esign_refund(p_request uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.esign_requests; v_bal integer;
begin
  select * into r from public.esign_requests x where x.id = p_request for update;
  if not found or r.charge is null then return jsonb_build_object('ok', true, 'refunded', 0); end if;
  if r.charge ->> 'via' = 'credits' then
    update public.esign_wallets w set credits = w.credits + (r.charge ->> 'credits')::integer, updated_at = now() where w.firm_id = r.firm_id returning w.credits into v_bal;
    insert into public.esign_ledger (firm_id, delta, kind, request_id, note, balance_after) values (r.firm_id, (r.charge ->> 'credits')::integer, 'refund', p_request, 'Sending failed; credits returned', coalesce(v_bal, 0));
  elsif r.charge ->> 'via' = 'free_trial' then
    update public.esign_wallets w set free_trial_used = greatest(w.free_trial_used - 1, 0), updated_at = now() where w.firm_id = r.firm_id;
  end if;
  update public.esign_requests x set charge = null, sent_at = null, updated_at = now() where x.id = p_request;
  return jsonb_build_object('ok', true, 'refunded', coalesce((r.charge ->> 'credits')::integer, 0));
end $$;

-- Adds credits (a confirmed UPI purchase, or a grant by the Super Admin). A payment can add credits only once.
create or replace function public.esign_add_credits(p_firm uuid, p_n integer, p_kind text, p_payment uuid, p_note text, p_by uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_bal integer;
begin
  if p_n <= 0 then raise exception 'credits must be positive'; end if;
  if p_kind not in ('purchase', 'grant') then raise exception 'bad kind'; end if;
  if p_payment is not null and exists (select 1 from public.esign_ledger l where l.payment_id = p_payment) then
    return (select w.credits from public.esign_wallets w where w.firm_id = p_firm);
  end if;
  insert into public.esign_wallets (firm_id) values (p_firm) on conflict do nothing;
  update public.esign_wallets w set credits = w.credits + p_n, updated_at = now() where w.firm_id = p_firm returning w.credits into v_bal;
  insert into public.esign_ledger (firm_id, delta, kind, payment_id, note, balance_after, by_user) values (p_firm, p_n, p_kind, p_payment, coalesce(p_note, ''), v_bal, p_by);
  return v_bal;
end $$;

-- ---------- Vault: provider credentials and the document encryption key ----------
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'esign_master_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'esign_master_key', 'Master key for signing documents (AES-256-GCM, a key per firm)');
  end if;
end $$;
create or replace function public.esign_master_key() returns text
language sql security definer set search_path = '' as $$ select decrypted_secret from vault.decrypted_secrets where name = 'esign_master_key'; $$;
create or replace function public.esign_secret_get(p_name text) returns text
language sql security definer set search_path = '' as $$ select decrypted_secret from vault.decrypted_secrets where name = 'esign_provider_' || p_name; $$;
create or replace function public.esign_secret_has(p_name text) returns boolean
language sql security definer set search_path = '' as $$ select exists (select 1 from vault.decrypted_secrets where name = 'esign_provider_' || p_name and coalesce(decrypted_secret, '') <> ''); $$;
create or replace function public.esign_secret_set(p_name text, p_value text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_name !~ '^[a-z0-9_]{2,40}$' then raise exception 'bad provider name'; end if;
  select s.id into v_id from vault.secrets s where s.name = 'esign_provider_' || p_name;
  if coalesce(p_value, '') = '' then
    if v_id is not null then delete from vault.secrets where id = v_id; end if;
  elsif v_id is null then perform vault.create_secret(p_value, 'esign_provider_' || p_name, 'Signing provider credential');
  else perform vault.update_secret(v_id, p_value); end if;
end $$;

-- ---------- storage: a private bucket nobody but the function reaches ----------
insert into storage.buckets (id, name, public, file_size_limit) values ('esign', 'esign', false, 31457280) on conflict (id) do nothing;
-- (no policies on purpose: anon and authenticated users cannot list, read or write this bucket)

-- ---------- row level security ----------
alter table public.esign_requests enable row level security;
alter table public.esign_signers enable row level security;
alter table public.esign_fields enable row level security;
alter table public.esign_events enable row level security;
alter table public.esign_wallets enable row level security;
alter table public.esign_ledger enable row level security;
alter table public.esign_provider_usage enable row level security;

drop policy if exists esign_requests_select on public.esign_requests;
create policy esign_requests_select on public.esign_requests for select to authenticated using (public.is_member(firm_id));
drop policy if exists esign_signers_select on public.esign_signers;
create policy esign_signers_select on public.esign_signers for select to authenticated using (public.is_member(firm_id));
drop policy if exists esign_fields_select on public.esign_fields;
create policy esign_fields_select on public.esign_fields for select to authenticated using (public.is_member(firm_id));
drop policy if exists esign_events_select on public.esign_events;
create policy esign_events_select on public.esign_events for select to authenticated using (public.is_member(firm_id));
drop policy if exists esign_wallets_select on public.esign_wallets;
create policy esign_wallets_select on public.esign_wallets for select to authenticated using (public.is_member(firm_id));
drop policy if exists esign_ledger_select on public.esign_ledger;
create policy esign_ledger_select on public.esign_ledger for select to authenticated using (public.is_member(firm_id));

-- Members read through the API only the columns that hold no secrets: no token, code or session hashes, no signature images.
revoke all on public.esign_requests, public.esign_signers, public.esign_fields, public.esign_events, public.esign_wallets, public.esign_ledger,
  public.esign_settings, public.esign_provider_usage from anon, authenticated;
grant select (id, firm_id, created_by, creator_name, draft_key, title, message, status, mode, provider, page_count, doc_hash, signed_hash, expires_at, sent_at, completed_at, cancelled_at, declined_at, charge, error, created_at, updated_at)
  on public.esign_requests to authenticated;
grant select (id, request_id, firm_id, name, email, phone, role, sign_order, required, status, notified_at, viewed_at, signed_at, declined_at, decline_reason, reminders, last_reminder_at, created_at)
  on public.esign_signers to authenticated;
grant select on public.esign_fields to authenticated;
grant select (id, request_id, firm_id, signer_id, type, actor, at, hash) on public.esign_events to authenticated;
grant select on public.esign_wallets, public.esign_ledger to authenticated;

-- ---------- privileges ----------
revoke execute on function public.esign_month_count(uuid, timestamptz, text), public.esign_charge(uuid, uuid, timestamptz, integer, integer, integer, integer, boolean),
  public.esign_refund(uuid), public.esign_add_credits(uuid, integer, text, uuid, text, uuid), public.esign_chain_check(uuid),
  public.esign_master_key(), public.esign_secret_get(text), public.esign_secret_has(text), public.esign_secret_set(text, text),
  public.esign_event_chain(), public.esign_hash(text), public.esign_event_text(public.esign_events) from public, anon, authenticated;
grant execute on function public.esign_month_count(uuid, timestamptz, text), public.esign_charge(uuid, uuid, timestamptz, integer, integer, integer, integer, boolean),
  public.esign_refund(uuid), public.esign_add_credits(uuid, integer, text, uuid, text, uuid), public.esign_chain_check(uuid),
  public.esign_master_key(), public.esign_secret_get(text), public.esign_secret_has(text), public.esign_secret_set(text, text),
  public.esign_hash(text), public.esign_event_text(public.esign_events) to service_role;

-- ---------- schedule ----------
-- Every 15 minutes: expire overdue requests, start the next signers of sequential requests, send automatic reminders.
-- Every night at 3:00 IST (21:30 UTC): keep a second encrypted copy of each completed document.
select cron.unschedule('legal-staff-esign-sweep') where exists (select 1 from cron.job where jobname = 'legal-staff-esign-sweep');
select cron.schedule('legal-staff-esign-sweep', '*/15 * * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/esign',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"sweep"}'::jsonb,
    timeout_milliseconds := 60000);
$job$);
select cron.unschedule('legal-staff-esign-backup') where exists (select 1 from cron.job where jobname = 'legal-staff-esign-backup');
select cron.schedule('legal-staff-esign-backup', '30 21 * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/esign',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"backup"}'::jsonb,
    timeout_milliseconds := 120000);
$job$);

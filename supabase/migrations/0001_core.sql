-- Legal Staff — core schema: firms, members, practice records, subscriptions, directory.
-- Every table has row level security. Practice data is visible only to members of the firm.

create extension if not exists pgcrypto;

-- ---------- firms and members ----------
create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  city text not null default '',
  address text not null default '',
  gstin text not null default '',
  state jsonb not null default '{}'::jsonb,           -- firm-wide working state (limitation calculation, agents)
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  user_id uuid,                                        -- null until the invited person signs in
  email text not null check (email = lower(email)),
  name text not null default '',
  title text not null default '',
  role text not null default 'Advocate',
  phone text not null default '',
  status text not null default 'Invited' check (status in ('Active', 'Invited', 'Suspended')),
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  unique (firm_id, email)
);
create index members_user_idx on public.members (user_id);
create index members_email_idx on public.members (email);

-- Is the caller an active member of this firm? SECURITY DEFINER so policies on members do not recurse.
create or replace function public.is_member(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.firm_id = f and m.user_id = (select auth.uid()) and m.status = 'Active');
$$;
create or replace function public.is_owner(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.firm_id = f and m.user_id = (select auth.uid()) and m.status = 'Active' and m.is_owner);
$$;

-- ---------- practice records ----------
-- One row per case, client, hearing, order, task, document, invoice, deadline, watched CNR or log entry.
create table public.records (
  firm_id uuid not null references public.firms(id) on delete cascade,
  kind text not null check (kind in ('case', 'client', 'hearing', 'order', 'task', 'doc', 'invoice', 'deadline', 'watch', 'log')),
  id text not null check (length(id) between 1 and 80),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (firm_id, kind, id)
);
create index records_hearing_date_idx on public.records ((data ->> 'date')) where kind = 'hearing';

create or replace function public.touch_record() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); new.updated_by := (select auth.uid()); return new; end $$;
create trigger records_touch before insert or update on public.records for each row execute function public.touch_record();

-- Per-user state inside a firm: preferences, notes, chats, saved drafts.
create table public.user_state (
  user_id uuid not null default auth.uid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, firm_id)
);

-- ---------- billing (written only by edge functions with the service role) ----------
create table public.subscriptions (
  firm_id uuid primary key references public.firms(id) on delete cascade,
  plan text not null check (plan in ('Solo', 'Professional', 'Firm')),
  cycle text not null check (cycle in ('monthly', 'annual')),
  status text not null default 'active',
  since date not null default current_date,
  renews date not null,
  updated_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  user_id uuid not null,
  plan text not null, cycle text not null,
  amount_paise integer not null check (amount_paise > 0),
  gstin text not null default '',
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_firm_idx on public.payments (firm_id);

-- ---------- notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.firms(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  recipient text not null,
  subject text not null default '',
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_firm_idx on public.notifications (firm_id, created_at desc);

-- ---------- platform admins (moderate the public directory) ----------
create table public.platform_admins (user_id uuid primary key, added_at timestamptz not null default now());
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid()));
$$;

-- ---------- public advocate directory ----------
create table public.directory_applications (
  id text primary key default ('LS-DIR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 100000))::int::text, 5, '0')),
  name text not null check (length(trim(name)) between 2 and 120),
  enr text not null check (length(trim(enr)) between 3 and 40),
  council text not null,
  year text not null,
  city text not null,
  email text not null default '',
  mobile text not null default '',
  details jsonb not null default '{}'::jsonb,          -- practice areas, courts, languages, about, document names
  status text not null default 'pending' check (status in ('pending', 'info', 'verified', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
create unique index directory_enr_live_idx on public.directory_applications (upper(enr)) where status <> 'rejected';

create table public.directory_enquiries (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.directory_applications(id) on delete cascade,
  name text not null, email text not null default '', phone text not null default '',
  category text not null default '', language text not null default '', message text not null default '',
  created_at timestamptz not null default now()
);
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, phone text not null default '', firm text not null default '',
  team_size text not null default '', topic text not null default '', message text not null default '',
  source text not null default 'landing',
  created_at timestamptz not null default now()
);
create table public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  application_id text references public.directory_applications(id) on delete set null,
  reason text not null, details text not null default '', email text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
alter table public.firms enable row level security;
alter table public.members enable row level security;
alter table public.records enable row level security;
alter table public.user_state enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_admins enable row level security;
alter table public.directory_applications enable row level security;
alter table public.directory_enquiries enable row level security;
alter table public.contact_requests enable row level security;
alter table public.profile_reports enable row level security;

create policy firms_select on public.firms for select to authenticated using (public.is_member(id));
create policy firms_update on public.firms for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy members_select on public.members for select to authenticated using (public.is_member(firm_id) or (user_id = (select auth.uid())));
create policy members_insert on public.members for insert to authenticated with check (public.is_owner(firm_id) and user_id is null and not is_owner);
create policy members_update on public.members for update to authenticated using (public.is_owner(firm_id)) with check (public.is_owner(firm_id));
create policy members_delete on public.members for delete to authenticated using (public.is_owner(firm_id) and not is_owner);

create policy records_all on public.records for all to authenticated using (public.is_member(firm_id)) with check (public.is_member(firm_id));
create policy user_state_all on public.user_state for all to authenticated using (user_id = (select auth.uid()) and public.is_member(firm_id)) with check (user_id = (select auth.uid()) and public.is_member(firm_id));

create policy subscriptions_select on public.subscriptions for select to authenticated using (public.is_member(firm_id));
create policy payments_select on public.payments for select to authenticated using (public.is_member(firm_id));
create policy notifications_select on public.notifications for select to authenticated using (public.is_member(firm_id));
create policy platform_admins_select on public.platform_admins for select to authenticated using (user_id = (select auth.uid()));

-- Directory: anyone may apply or write in; only platform admins read the queue. Public reads go through the functions below.
create policy dir_apply on public.directory_applications for insert to anon, authenticated with check (status = 'pending' and note = '' and decided_at is null and decided_by is null);
create policy dir_admin_select on public.directory_applications for select to authenticated using (public.is_platform_admin());
create policy dir_admin_update on public.directory_applications for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy enquiries_insert on public.directory_enquiries for insert to anon, authenticated with check (true);
create policy enquiries_admin on public.directory_enquiries for select to authenticated using (public.is_platform_admin());
create policy contact_insert on public.contact_requests for insert to anon, authenticated with check (true);
create policy contact_admin on public.contact_requests for select to authenticated using (public.is_platform_admin());
create policy reports_insert on public.profile_reports for insert to anon, authenticated with check (true);
create policy reports_admin on public.profile_reports for select to authenticated using (public.is_platform_admin());

-- A member may change only their own display details; role, status and ownership stay with the owner.
create or replace function public.update_my_profile(f uuid, p_name text, p_title text, p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.members set name = left(trim(p_name), 120), title = left(trim(p_title), 140), phone = left(trim(p_phone), 30)
  where firm_id = f and user_id = (select auth.uid()) and status = 'Active';
end $$;

-- ---------- sign-in bootstrap ----------
-- Links invitations addressed to the caller's verified email, then returns the firms they belong to.
create or replace function public.my_firms() returns table (firm_id uuid, firm_name text, role text, is_owner boolean)
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(coalesce((select auth.jwt()) ->> 'email', ''));
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  if v_email <> '' then
    update public.members m set user_id = (select auth.uid()), status = 'Active'
    where m.email = v_email and m.user_id is null and m.status = 'Invited';
  end if;
  return query select m.firm_id, f.name, m.role, m.is_owner from public.members m join public.firms f on f.id = m.firm_id
    where m.user_id = (select auth.uid()) and m.status = 'Active' order by m.created_at;
end $$;

-- Creates a firm with the caller as its owner. The first person ever to do this also becomes the platform admin.
create or replace function public.create_firm(p_name text, p_city text, p_address text, p_user_name text, p_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text := lower(coalesce((select auth.jwt()) ->> 'email', '')); v_firm uuid; v_title text;
begin
  if v_uid is null or v_email = '' then raise exception 'not signed in'; end if;
  if exists (select 1 from public.members where user_id = v_uid and is_owner) then raise exception 'you already own a firm'; end if;
  v_title := case when p_role ~ '(Partner|Associate|Advocate)' then 'Adv. ' else '' end || trim(p_user_name);
  insert into public.firms (name, city, address, created_by) values (trim(p_name), trim(p_city), trim(p_address), v_uid) returning id into v_firm;
  insert into public.members (firm_id, user_id, email, name, title, role, status, is_owner) values (v_firm, v_uid, v_email, trim(p_user_name), v_title, p_role, 'Active', true);
  if not exists (select 1 from public.platform_admins) then insert into public.platform_admins (user_id) values (v_uid); end if;
  return v_firm;
end $$;

-- ---------- public directory reads ----------
create or replace function public.directory_profiles() returns table (id text, name text, enr text, council text, year text, city text, details jsonb)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.enr, a.council, a.year, a.city, a.details - 'documents' from public.directory_applications a where a.status = 'verified' order by a.name;
$$;
-- An applicant checks progress with their reference and enrolment number together.
create or replace function public.directory_status(p_ref text, p_enr text) returns table (id text, name text, enr text, council text, year text, city text, status text, note text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.enr, a.council, a.year, a.city, a.status, a.note, a.created_at from public.directory_applications a
  where a.id = trim(p_ref) and upper(a.enr) = upper(trim(p_enr));
$$;
-- An applicant asked for more information resubmits; the record returns to the queue.
create or replace function public.directory_resubmit(p_ref text, p_enr text, p_name text, p_council text, p_year text, p_city text, p_email text, p_mobile text, p_details jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.directory_applications a set name = trim(p_name), council = p_council, year = p_year, city = trim(p_city), email = p_email, mobile = p_mobile, details = coalesce(p_details, '{}'::jsonb), status = 'pending', decided_at = null, decided_by = null
  where a.id = trim(p_ref) and upper(a.enr) = upper(trim(p_enr)) and a.status = 'info';
  return found;
end $$;
create or replace function public.directory_decide(p_ref text, p_status text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('verified', 'info', 'rejected') then raise exception 'bad status'; end if;
  if p_status <> 'verified' and length(trim(coalesce(p_note, ''))) = 0 then raise exception 'a note is required'; end if;
  update public.directory_applications set status = p_status, note = coalesce(trim(p_note), ''), decided_at = now(), decided_by = (select auth.uid()) where id = p_ref;
end $$;

-- ---------- privileges ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_member(uuid), public.is_owner(uuid), public.is_platform_admin(), public.my_firms(), public.create_firm(text, text, text, text, text), public.update_my_profile(uuid, text, text, text), public.directory_decide(text, text, text) to authenticated;
grant execute on function public.directory_profiles(), public.directory_status(text, text), public.directory_resubmit(text, text, text, text, text, text, text, text, jsonb) to anon, authenticated;

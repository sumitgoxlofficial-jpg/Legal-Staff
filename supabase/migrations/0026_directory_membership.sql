-- Legal Staff — directory membership: sign in with Google, profile photo, one-time Rs 49 lifetime listing fee,
-- and a lead inbox for the advocate. Re-runnable.
--
--  * An application now belongs to a signed-in account (user_id). Only that account can change it or read its leads.
--  * The profile photo is a small square JPEG kept as a data URL on the row (same approach as members.photo, migration 0020).
--  * A profile is published only when a moderator has verified it AND the one-time listing fee has been paid (paid_at).
--    The fee buys a place in the directory, never a ranking: results stay in alphabetical order.
--  * The fee is paid by UPI through functions/upi-pay (actions dir_create / dir_status) and confirmed the same way as plan payments.

alter table public.directory_applications add column if not exists user_id uuid;
alter table public.directory_applications add column if not exists photo text not null default '';
alter table public.directory_applications add column if not exists paid_at timestamptz;
alter table public.directory_applications add column if not exists order_no text;
alter table public.directory_applications drop constraint if exists directory_photo_ok;
alter table public.directory_applications add constraint directory_photo_ok check (photo = '' or (photo like 'data:image/jpeg;base64,%' and length(photo) <= 200000));
create index if not exists directory_user_idx on public.directory_applications (user_id);

-- Profiles that were already verified before the fee existed stay listed.
update public.directory_applications set paid_at = coalesce(decided_at, created_at) where status = 'verified' and paid_at is null;

-- ---------- listing fee orders ----------
create table if not exists public.directory_orders (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.directory_applications(id) on delete cascade,
  user_id uuid not null,
  order_no text not null unique,
  amount_paise integer not null check (amount_paise > 0),
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  utr text,
  confirmed_by text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists directory_orders_open_idx on public.directory_orders (status, created_at) where status = 'created';
alter table public.directory_orders enable row level security;
drop policy if exists dir_orders_select on public.directory_orders;
create policy dir_orders_select on public.directory_orders for select to authenticated using (user_id = (select auth.uid()));

-- ---------- applying needs a signed-in account ----------
drop policy if exists dir_apply on public.directory_applications;
create policy dir_apply on public.directory_applications for insert to authenticated
  with check (status = 'pending' and note = '' and decided_at is null and decided_by is null and paid_at is null and order_no is null and user_id = (select auth.uid()));
drop policy if exists dir_owner_select on public.directory_applications;
create policy dir_owner_select on public.directory_applications for select to authenticated using (user_id = (select auth.uid()));

-- ---------- public read: verified and paid profiles only, with the photo ----------
drop function if exists public.directory_profiles();
create function public.directory_profiles() returns table (id text, name text, enr text, council text, year text, city text, details jsonb, photo text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.enr, a.council, a.year, a.city, a.details - 'documents', a.photo
  from public.directory_applications a where a.status = 'verified' and a.paid_at is not null order by a.name;
$$;

-- ---------- the signed-in advocate's own applications ----------
create or replace function public.directory_my_applications() returns table (id text, name text, enr text, council text, year text, city text, email text, mobile text, details jsonb, photo text, status text, note text, created_at timestamptz, paid_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.enr, a.council, a.year, a.city, a.email, a.mobile, a.details, a.photo, a.status, a.note, a.created_at, a.paid_at
  from public.directory_applications a where a.user_id = (select auth.uid()) order by a.created_at desc;
$$;

-- Update details and photo. Allowed while the application is waiting or more information was asked for; a request for
-- information goes back into the queue. Enrolment details are locked once a moderator has decided.
create or replace function public.directory_update_mine(p_ref text, p_name text, p_council text, p_year text, p_city text, p_email text, p_mobile text, p_details jsonb, p_photo text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.directory_applications a set name = trim(p_name), council = p_council, year = p_year, city = trim(p_city), email = p_email, mobile = p_mobile,
    details = coalesce(p_details, '{}'::jsonb), photo = coalesce(p_photo, a.photo),
    status = 'pending', decided_at = null, decided_by = null
  where a.id = trim(p_ref) and a.user_id = (select auth.uid()) and a.status in ('pending', 'info');
  return found;
end $$;

-- The photo may be changed at any time, even after the profile is live.
create or replace function public.directory_set_photo(p_ref text, p_photo text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.directory_applications a set photo = coalesce(p_photo, '') where a.id = trim(p_ref) and a.user_id = (select auth.uid());
  return found;
end $$;

-- Contact requests sent to the signed-in advocate's published profile(s): the lead inbox.
create or replace function public.directory_my_enquiries() returns table (id uuid, application_id text, name text, email text, phone text, category text, language text, message text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, e.application_id, e.name, e.email, e.phone, e.category, e.language, e.message, e.created_at
  from public.directory_enquiries e join public.directory_applications a on a.id = e.application_id
  where a.user_id = (select auth.uid()) and a.paid_at is not null order by e.created_at desc limit 200;
$$;

revoke execute on function public.directory_my_applications(), public.directory_update_mine(text, text, text, text, text, text, text, jsonb, text), public.directory_set_photo(text, text), public.directory_my_enquiries() from public, anon;
grant execute on function public.directory_my_applications(), public.directory_update_mine(text, text, text, text, text, text, text, jsonb, text), public.directory_set_photo(text, text), public.directory_my_enquiries() to authenticated;
revoke execute on function public.directory_profiles() from public;
grant execute on function public.directory_profiles() to anon, authenticated;

-- Legal Staff — helping clients choose between similar advocates, without rankings or paid placement.
--
--  * Response signal: the advocate marks a contact request as replied; the public sees only "replied to X of Y requests in
--    the last 90 days" (shown from 3 requests). It is a fact about behaviour, not a score.
--  * Client reviews: the table, the submit and read functions exist, but the site shows nothing unless
--    `directoryReviews: true` is set in config.js. Reviews and ratings by advocates' clients may be restricted by the Bar
--    Council of India rules: take legal advice before switching them on. Reviews are held as 'pending' until a platform
--    admin sets them to 'approved'. Re-runnable.

alter table public.directory_enquiries add column if not exists replied_at timestamptz;

-- ---------- reply tracking ----------
create or replace function public.directory_mark_replied(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.directory_enquiries e set replied_at = coalesce(e.replied_at, now())
  where e.id = p_id and exists (select 1 from public.directory_applications a where a.id = e.application_id and a.user_id = (select auth.uid()));
  return found;
end $$;

drop function if exists public.directory_my_enquiries();
create function public.directory_my_enquiries() returns table (id uuid, application_id text, name text, email text, phone text, category text, language text, message text, created_at timestamptz, replied_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id, e.application_id, e.name, e.email, e.phone, e.category, e.language, e.message, e.created_at, e.replied_at
  from public.directory_enquiries e join public.directory_applications a on a.id = e.application_id
  where a.user_id = (select auth.uid()) and a.paid_at is not null order by e.created_at desc limit 200;
$$;

-- Public, counts only: requests received and replied to in the last 90 days, for published profiles.
create or replace function public.directory_response_stats() returns table (application_id text, total integer, replied integer)
language sql stable security definer set search_path = '' as $$
  select e.application_id, count(*)::int, count(e.replied_at)::int
  from public.directory_enquiries e join public.directory_applications a on a.id = e.application_id
  where a.status = 'verified' and a.paid_at is not null and e.created_at > now() - interval '90 days'
  group by e.application_id;
$$;

-- ---------- reviews (off by default in the site) ----------
create table if not exists public.directory_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.directory_applications(id) on delete cascade,
  enquiry_id uuid unique references public.directory_enquiries(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (length(body) <= 600),
  reviewer text not null default '' check (length(reviewer) <= 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists directory_reviews_app_idx on public.directory_reviews (application_id, status);
alter table public.directory_reviews enable row level security;
drop policy if exists reviews_admin_all on public.directory_reviews;
create policy reviews_admin_all on public.directory_reviews for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Only someone who really sent a contact request to this advocate can review, once per request.
create or replace function public.directory_submit_review(p_enquiry uuid, p_rating integer, p_body text, p_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare a text;
begin
  select application_id into a from public.directory_enquiries where id = p_enquiry;
  if a is null then return false; end if;
  insert into public.directory_reviews (application_id, enquiry_id, rating, body, reviewer)
  values (a, p_enquiry, greatest(1, least(5, p_rating)), left(coalesce(p_body, ''), 600), left(coalesce(p_name, ''), 80))
  on conflict (enquiry_id) do nothing;
  return found;
end $$;

create or replace function public.directory_review_summary() returns table (application_id text, n integer, avg numeric)
language sql stable security definer set search_path = '' as $$
  select r.application_id, count(*)::int, round(avg(r.rating), 1) from public.directory_reviews r
  join public.directory_applications a on a.id = r.application_id
  where r.status = 'approved' and a.status = 'verified' and a.paid_at is not null group by r.application_id;
$$;

create or replace function public.directory_reviews_for(p_app text) returns table (rating smallint, body text, reviewer text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.rating, r.body, r.reviewer, r.created_at from public.directory_reviews r
  where r.application_id = p_app and r.status = 'approved' order by r.created_at desc limit 20;
$$;

revoke execute on function public.directory_mark_replied(uuid), public.directory_my_enquiries() from public, anon;
grant execute on function public.directory_mark_replied(uuid), public.directory_my_enquiries() to authenticated;
revoke execute on function public.directory_response_stats(), public.directory_submit_review(uuid, integer, text, text), public.directory_review_summary(), public.directory_reviews_for(text) from public;
grant execute on function public.directory_response_stats(), public.directory_submit_review(uuid, integer, text, text), public.directory_review_summary(), public.directory_reviews_for(text) to anon, authenticated;

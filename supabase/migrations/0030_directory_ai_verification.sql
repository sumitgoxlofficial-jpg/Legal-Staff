-- Legal Staff — directory: profiles are public as soon as the listing fee is paid; the blue tick comes from an automatic
-- document check (functions/directory-verify). Re-runnable.
--  * A listed profile is any non-rejected, paid application. `verified` is true only once the documents passed the check.
--  * ai_checks counts automatic checks per application (the function stops after a few); ai_report keeps what was read.
alter table public.directory_applications add column if not exists ai_checks integer not null default 0;
alter table public.directory_applications add column if not exists ai_report jsonb;

drop function if exists public.directory_profiles();
create function public.directory_profiles() returns table (id text, name text, enr text, council text, year text, city text, details jsonb, photo text, verified boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.enr, a.council, a.year, a.city, a.details - 'documents', a.photo, (a.status = 'verified')
  from public.directory_applications a where a.paid_at is not null and a.status <> 'rejected' order by a.name;
$$;
revoke execute on function public.directory_profiles() from public;
grant execute on function public.directory_profiles() to anon, authenticated;

create or replace function public.directory_response_stats() returns table (application_id text, total integer, replied integer)
language sql stable security definer set search_path = '' as $$
  select e.application_id, count(*)::int, count(e.replied_at)::int
  from public.directory_enquiries e join public.directory_applications a on a.id = e.application_id
  where a.status <> 'rejected' and a.paid_at is not null and e.created_at > now() - interval '90 days'
  group by e.application_id;
$$;

create or replace function public.directory_review_summary() returns table (application_id text, n integer, avg numeric)
language sql stable security definer set search_path = '' as $$
  select r.application_id, count(*)::int, round(avg(r.rating), 1) from public.directory_reviews r
  join public.directory_applications a on a.id = r.application_id
  where r.status = 'approved' and a.status <> 'rejected' and a.paid_at is not null group by r.application_id;
$$;

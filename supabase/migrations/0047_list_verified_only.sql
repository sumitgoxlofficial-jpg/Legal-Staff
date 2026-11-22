-- Legal Staff — a directory profile is public only when it is paid AND its documents have been checked (status 'verified').
-- Before this, 0030 listed every paid, non-rejected profile as "Not verified yet": anyone could pay ₹49 with a real advocate's enrolment number,
-- appear in the directory and receive that advocate's client enquiries. The document check is automatic (about a minute after the documents are
-- uploaded), so an honest advocate waits minutes, not days. Re-runnable; changes no rows.
--  * directory_profiles(), response stats, review summaries: verified + paid only.
--  * dir_is_listed() (gate for enquiries and reports): verified + paid only, so unverified profiles cannot receive client enquiries.
--  * an advocate always sees their own application and its status through directory_my_applications() (unchanged).

drop function if exists public.directory_profiles();
create function public.directory_profiles() returns table (id text, name text, enr text, council text, year text, city text, details jsonb, photo text, verified boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.enr, a.council, a.year, a.city, a.details - 'documents', a.photo, true
  from public.directory_applications a where a.paid_at is not null and a.status = 'verified' order by a.name;
$$;
revoke execute on function public.directory_profiles() from public;
grant execute on function public.directory_profiles() to anon, authenticated;

create or replace function public.directory_response_stats() returns table (application_id text, total integer, replied integer)
language sql stable security definer set search_path = '' as $$
  select e.application_id, count(*)::int, count(e.replied_at)::int
  from public.directory_enquiries e join public.directory_applications a on a.id = e.application_id
  where a.status = 'verified' and a.paid_at is not null and e.created_at > now() - interval '90 days'
  group by e.application_id;
$$;

create or replace function public.directory_review_summary() returns table (application_id text, n integer, avg numeric)
language sql stable security definer set search_path = '' as $$
  select r.application_id, count(*)::int, round(avg(r.rating), 1) from public.directory_reviews r
  join public.directory_applications a on a.id = r.application_id
  where r.status = 'approved' and a.status = 'verified' and a.paid_at is not null group by r.application_id;
$$;

create or replace function public.dir_is_listed(p_id text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.directory_applications a where a.id = p_id and a.paid_at is not null and a.status = 'verified');
$$;

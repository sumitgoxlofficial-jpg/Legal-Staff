-- 0052: the public directory no longer ships every advocate's photo with the list.
--   directory_profiles_lite()  the same listed (paid and verified) profiles, without the photo (a flag says whether one exists)
--   directory_photos(ids)      the photos of up to 12 listed profiles, fetched only for the cards on screen
-- Both follow the same listing rule as directory_profiles(): paid and verified, nothing else. The old function stays for pages not yet refreshed.
create or replace function public.directory_profiles_lite() returns table (id text, name text, enr text, council text, year text, city text, details jsonb, has_photo boolean, verified boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.enr, a.council, a.year, a.city, a.details - 'documents', coalesce(a.photo, '') <> '', true
  from public.directory_applications a where a.paid_at is not null and a.status = 'verified' order by a.name;
$$;
revoke execute on function public.directory_profiles_lite() from public;
grant execute on function public.directory_profiles_lite() to anon, authenticated;

create or replace function public.directory_photos(p_ids text[]) returns table (id text, photo text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.photo
  from public.directory_applications a
  where a.id = any ((coalesce(p_ids, '{}'::text[]))[1:12]) and a.paid_at is not null and a.status = 'verified' and coalesce(a.photo, '') <> '';
$$;
revoke execute on function public.directory_photos(text[]) from public;
grant execute on function public.directory_photos(text[]) to anon, authenticated;

-- Legal Staff — lets the sites ask "is the signed-in user a super admin?" so that signing in with an admin email anywhere
-- (directory, app) opens the admin console instead. Reads public.super_admins (emails) against the verified auth email.
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.super_admins s join auth.users u on lower(u.email) = s.email
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  );
$$;
revoke execute on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

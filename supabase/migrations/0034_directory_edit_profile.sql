-- Legal Staff — an advocate can edit the contact and practice details of a profile at any time, even after it is verified and live.
-- Name, enrolment number, State Bar Council, year, Certificate of Practice number and the documents are not touched here:
-- they were matched to the certificate, so changing them still goes through directory_update_mine (only while pending or more information was asked for).
create or replace function public.directory_update_profile(p_ref text, p_city text, p_email text, p_mobile text, p_details jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if length(trim(coalesce(p_city, ''))) = 0 then return false; end if;
  update public.directory_applications a set
    city = trim(p_city), email = trim(coalesce(p_email, '')), mobile = trim(coalesce(p_mobile, '')),
    details = coalesce(a.details, '{}'::jsonb) || (coalesce(p_details, '{}'::jsonb) - 'documents' - 'cop')
  where a.id = trim(p_ref) and a.user_id = (select auth.uid());
  return found;
end $$;
revoke execute on function public.directory_update_profile(text, text, text, text, jsonb) from public, anon;
grant execute on function public.directory_update_profile(text, text, text, text, jsonb) to authenticated;

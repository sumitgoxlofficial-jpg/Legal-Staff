-- Legal Staff — profile photos shown to the whole firm.
-- The photo is a small square JPEG kept as a data URL on the member's own row, so every member of the firm
-- can read it through the existing members_select policy. A member may change only their own photo.
alter table public.members add column if not exists photo text not null default '';
alter table public.members drop constraint if exists members_photo_ok;
alter table public.members add constraint members_photo_ok check (photo = '' or (photo like 'data:image/jpeg;base64,%' and length(photo) <= 200000));

create or replace function public.set_my_photo(f uuid, p_photo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.members set photo = coalesce(p_photo, '')
  where firm_id = f and user_id = (select auth.uid()) and status = 'Active';
  if not found then raise exception 'Your membership of this firm was not found, so the photo was not saved.'; end if;
end $$;
revoke execute on function public.set_my_photo(uuid, text) from public, anon;
grant execute on function public.set_my_photo(uuid, text) to authenticated;

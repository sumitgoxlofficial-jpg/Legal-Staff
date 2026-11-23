-- Legal Staff — what each team role may do, enforced in the database (the screens only mirror it).
--   lead        the firm owner and Managing Partner, Partner, Advocate, Head of Legal, General Counsel, Legal Manager: everything.
--   working     Associate, Junior Advocate, Legal Associate, Office Manager (and any role not listed): everything except deleting
--               cases, clients and invoices.
--   restricted  Paralegal, Intern: add and edit practice records, but no invoices and no deleting anything (except the activity log,
--               which the app trims by itself).
-- A person's role is whatever the owner set on their team row (only the owner can change it). Re-runnable; changes no data.

create or replace function public.member_tier(f uuid) returns text language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case when m.is_owner or m.role in ('Managing Partner', 'Partner', 'Advocate', 'Head of Legal', 'General Counsel', 'Legal Manager') then 'lead'
                when m.role in ('Paralegal', 'Intern') then 'restricted'
                else 'working' end
    from public.members m where m.firm_id = f and m.user_id = (select auth.uid()) and m.status = 'Active' limit 1), 'none')
$$;
revoke execute on function public.member_tier(uuid) from public, anon;
grant execute on function public.member_tier(uuid) to authenticated;

drop policy if exists records_delete on public.records;
create policy records_delete on public.records for delete to authenticated using (
  public.is_member(firm_id) and (kind = 'log' or case public.member_tier(firm_id)
    when 'lead' then true
    when 'working' then kind not in ('case', 'client', 'invoice')
    else false end));

drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated with check (
  public.is_member(firm_id) and public.firm_access(firm_id) and (kind <> 'invoice' or public.member_tier(firm_id) in ('lead', 'working')));

drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated using (
  public.is_member(firm_id) and (kind <> 'invoice' or public.member_tier(firm_id) in ('lead', 'working')))
  with check (public.is_member(firm_id) and public.firm_access(firm_id) and (kind <> 'invoice' or public.member_tier(firm_id) in ('lead', 'working')));

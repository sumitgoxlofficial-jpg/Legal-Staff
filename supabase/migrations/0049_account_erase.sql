-- 0049: erase_user_account(u) -- the server half of "Delete my account" (called only by the `account` edge function, service role).
-- Safe by design: it refuses rather than orphaning anyone.
--   * a firm the user owns that still has other active members cannot be abandoned: ownership must be handed over first
--   * a partner with money still owed or in motion must be settled first
-- Kept on purpose, because the law and the books require it: payment, order and commission records (they hold no practice data).
-- Returns the firm ids whose data was erased, so the caller can also delete those firms' stored files.
create or replace function public.erase_user_account(u uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f record; erased uuid[] := '{}'; pid uuid;
begin
  if u is null then raise exception 'No user.' using errcode = '22023'; end if;
  for f in select m.firm_id from public.members m where m.user_id = u and m.is_owner loop
    if exists (select 1 from public.members o where o.firm_id = f.firm_id and o.status = 'Active' and o.user_id is distinct from u) then
      raise exception 'You own a firm that still has other members. Hand the firm over to a colleague or remove them first.' using errcode = 'P0001';
    end if;
  end loop;
  select p.id into pid from public.partners p where p.user_id = u;
  if pid is not null and (
       exists (select 1 from public.partner_payouts x where x.partner_id = pid and x.status in ('requested', 'under_review', 'approved', 'processing', 'on_hold'))
    or exists (select 1 from public.partner_commissions c where c.partner_id = pid and c.status in ('eligible', 'approved', 'payable', 'on_hold'))) then
    raise exception 'Your partner account has earnings that are still being settled. Ask support to close it out first.' using errcode = 'P0001';
  end if;

  for f in select m.firm_id from public.members m where m.user_id = u and m.is_owner loop
    delete from public.records where firm_id = f.firm_id;
    delete from public.user_state where firm_id = f.firm_id;
    delete from public.notifications where firm_id = f.firm_id;
    delete from public.chat_messages where firm_id = f.firm_id;
    delete from public.chat_reads where firm_id = f.firm_id;
    delete from public.legal_cases where firm_id = f.firm_id;
    update public.firms set state = '{}'::jsonb where id = f.firm_id;
    erased := erased || f.firm_id;
  end loop;

  -- the person leaves every firm they belonged to (the firms and their colleagues' data stay)
  update public.members set user_id = null, status = 'Suspended', is_owner = false where user_id = u;
  delete from public.user_state where user_id = u;
  delete from public.notifications where user_id = u;
  delete from public.chat_reads where user_id = u;
  delete from public.chat_reactions where user_id = u;
  delete from public.drive_accounts where user_id = u;
  delete from public.platform_admins where user_id = u;
  update public.contact_requests set user_id = null where user_id = u;
  -- a directory profile goes off the public list at once
  update public.directory_applications set status = 'rejected', note = 'Account deleted by the advocate.', decided_at = now() where user_id = u and status <> 'rejected';
  return jsonb_build_object('firms', to_jsonb(erased));
end $$;
revoke execute on function public.erase_user_account(uuid) from public, anon, authenticated;
grant execute on function public.erase_user_account(uuid) to service_role;

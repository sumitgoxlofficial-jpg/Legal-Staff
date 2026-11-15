-- Legal Staff — safety fixes.
-- 1. Bulk deletes of practice records are for the firm owner only. Members still delete single records as before.
-- 2. erase_firm_data(): the owner's "Delete firm data" action, done in one transaction on the server.
-- 3. update_my_profile() reports failure instead of silently changing nothing.

-- ---------- 1. owner-only bulk delete ----------
-- RLS works row by row, so it cannot tell a single delete from a wipe. A statement-level trigger sees every row a
-- statement removed and refuses the statement when a non-owner removes more than 100 records of one firm at once.
-- Activity-log rows are not counted: the app trims the log to its newest 300 entries and deletes the rest in batches.
create or replace function public.guard_bulk_record_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if (select auth.uid()) is null then return null; end if;   -- service role (edge functions, cron) and the SQL editor
  for r in select o.firm_id, count(*) as n from old_rows o where o.kind <> 'log' group by o.firm_id loop
    if r.n > 100 and not public.is_owner(r.firm_id) then
      raise exception 'Only the firm owner can delete more than 100 records at once.' using errcode = '42501';
    end if;
  end loop;
  return null;
end $$;
drop trigger if exists records_bulk_delete_guard on public.records;
create trigger records_bulk_delete_guard after delete on public.records
  referencing old table as old_rows for each statement execute function public.guard_bulk_record_delete();

-- ---------- 2. delete a firm's data (owner only) ----------
-- Deletes every practice record, every member's saved state for the firm, the firm's notification log and the firm-wide
-- working state. The firm, its members, its subscription and its payment records are kept (payments are tax records).
-- Files in Storage (bucket 'documents', prefix <firm_id>/) are removed by the app through the Storage API before this
-- runs, because Storage objects must not be deleted with SQL. Directory applications and contact requests are not
-- linked to a firm, so they are not touched.
create or replace function public.erase_firm_data(f uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_owner(f) then raise exception 'Only the firm owner can delete the firm''s data.' using errcode = '42501'; end if;
  delete from public.records where firm_id = f;
  get diagnostics n = row_count;
  delete from public.user_state where firm_id = f;
  delete from public.notifications where firm_id = f;
  update public.firms set state = '{}'::jsonb where id = f;
  return n;
end $$;

-- ---------- 3. profile update reports failure ----------
create or replace function public.update_my_profile(f uuid, p_name text, p_title text, p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.members set name = left(trim(p_name), 120), title = left(trim(p_title), 140), phone = left(trim(p_phone), 30)
  where firm_id = f and user_id = (select auth.uid()) and status = 'Active';
  if not found then raise exception 'Your membership of this firm was not found, so the profile was not saved.'; end if;
end $$;

-- ---------- privileges ----------
revoke execute on function public.guard_bulk_record_delete() from public, anon, authenticated;
revoke execute on function public.erase_firm_data(uuid) from public, anon;
grant execute on function public.erase_firm_data(uuid) to authenticated;
revoke execute on function public.update_my_profile(uuid, text, text, text) from public, anon;
grant execute on function public.update_my_profile(uuid, text, text, text) to authenticated;

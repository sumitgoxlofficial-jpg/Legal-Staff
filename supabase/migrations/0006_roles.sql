-- Legal Staff — roles and permissions, plan seats, and the GST invoice series.
-- Apply after 0001–0005. Safe to run more than once.
--
-- Access levels (public.member_role): the firm owner (members.is_owner) is 'owner'; every other active member's role text maps
-- onto 'partner' | 'associate' | 'clerk' | 'viewer' exactly as LS.roleOf() does in app-store.js. Unknown designations are 'associate'.
--   Managing Partner, Partner                         → partner
--   Advocate, Associate, Junior Advocate, (anything else) → associate
--   Paralegal, Office Manager, Clerk, Intern, Staff     → clerk
--   Viewer / Read-only                                → viewer
-- The app hides or disables what a role may not do. The server enforces the rules below; the rest of the matrix (e.g. associates
-- and clerks deleting only what they added) is enforced in the app only.
--
-- 0. records.kind also allows 'limitation' (saved limitation calculations, written by the app since the limitation tracker).
-- 1. member_role(f): the caller's access level in firm f, or null if they are not an active member.
-- 2. Practice records: only the owner or a partner can delete an invoice or change whether it is paid; clerks and viewers cannot
--    write invoices; viewers cannot write any record except the activity log. Done in a trigger, so a refusal reaches the app as an
--    error (42501) instead of a silently skipped row. The 0004 guard on bulk deletes by non-owners stays as it is.
-- 3. Members: only the owner manages members (the 0001 policies), and now cannot change a member's firm, sign-in link, email or
--    ownership, or suspend the owner. Active + invited members may not exceed the plan's seats (Solo 1, Professional 3, Firm 15;
--    3 while the firm has no active plan).
-- 4. Storage (bucket 'documents'): only the owner or a partner can delete files; viewers cannot upload.
-- 5. Invoice numbers: next_invoice_no(f, prefix) hands out the next number of a series such as 'RA/2026-27/' without collisions.
-- 6. erase_firm_data() keeps the firm's invoice profile (legal name, GST state, PAN, prefix) in firms.state.profile.

-- ---------- 0. record kinds ----------
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('case', 'client', 'hearing', 'order', 'task', 'doc', 'invoice', 'deadline', 'watch', 'log', 'limitation'));

-- ---------- 1. access level ----------
create or replace function public.member_role(f uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when m.is_owner then 'owner'
    when m.role ~* 'partner' then 'partner'
    when m.role ~* '^(viewer|read.?only)' then 'viewer'
    when m.role ~* '(clerk|paralegal|office|staff|intern|munshi|secretary)' then 'clerk'
    else 'associate' end
  from public.members m
  where m.firm_id = f and m.user_id = (select auth.uid()) and m.status = 'Active'
  limit 1;
$$;

-- ---------- 2. practice records ----------
create or replace function public.guard_record_write() returns trigger
language plpgsql set search_path = '' as $$
declare v_role text; v_old jsonb;
begin
  if tg_op = 'DELETE' then v_role := public.member_role(old.firm_id); else v_role := public.member_role(new.firm_id); end if;
  -- No caller (service role: edge functions, cron; the SQL editor) or not a member (the row level security policies refuse): no checks here.
  if (select auth.uid()) is null or v_role is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.kind = 'invoice' and v_role not in ('owner', 'partner') then
      raise exception 'Only the firm owner or a partner can delete invoices.' using errcode = '42501';
    end if;
    if v_role = 'viewer' and old.kind <> 'log' then raise exception 'Your role in this firm is read-only.' using errcode = '42501'; end if;
    return old;
  end if;
  if v_role = 'viewer' and new.kind <> 'log' then raise exception 'Your role in this firm is read-only.' using errcode = '42501'; end if;
  if new.kind = 'invoice' then
    if v_role not in ('owner', 'partner', 'associate') then
      raise exception 'Your role cannot create or change invoices.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
      v_old := old.data;
    else
      -- An upsert of an existing invoice fires this INSERT trigger first; its UPDATE trigger then compares with the stored row.
      select r.data into v_old from public.records r where r.firm_id = new.firm_id and r.kind = new.kind and r.id = new.id;
      if found then return new; end if;
    end if;
    if (coalesce(v_old -> 'paid', 'false'::jsonb) = 'true'::jsonb) is distinct from (coalesce(new.data -> 'paid', 'false'::jsonb) = 'true'::jsonb)
       or (tg_op = 'UPDATE' and coalesce(v_old ->> 'paidOn', '') is distinct from coalesce(new.data ->> 'paidOn', '')) then
      if v_role not in ('owner', 'partner') then
        raise exception 'Only the firm owner or a partner can mark an invoice paid or unpaid.' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists records_role_guard on public.records;
create trigger records_role_guard before insert or update or delete on public.records
  for each row execute function public.guard_record_write();

-- ---------- 3. members ----------
create or replace function public.plan_seats(f uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select case s.plan when 'Solo' then 1 when 'Professional' then 3 when 'Firm' then 15 end
                   from public.subscriptions s where s.firm_id = f and s.status = 'active'), 3);
$$;

-- SECURITY INVOKER on purpose: current_user is 'authenticated' for requests from the app, and the function owner inside
-- my_firms(), create_firm() and update_my_profile() (SECURITY DEFINER), which link invitations and edit profiles as before.
create or replace function public.guard_member_write() returns trigger
language plpgsql set search_path = '' as $$
declare n integer; m integer;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'UPDATE' then
    if new.firm_id is distinct from old.firm_id or new.user_id is distinct from old.user_id
       or new.email is distinct from old.email or new.is_owner is distinct from old.is_owner then
      raise exception 'Only the role, status, name, title and phone of a member can be changed.' using errcode = '42501';
    end if;
    if old.is_owner and new.status <> 'Active' then
      raise exception 'The firm owner cannot be suspended or set back to invited.' using errcode = '42501';
    end if;
    if not (old.status = 'Suspended' and new.status in ('Active', 'Invited')) then return new; end if;
  end if;
  if new.status = 'Suspended' then return new; end if;
  perform pg_advisory_xact_lock(hashtext('legal-staff-members:' || new.firm_id::text));
  select count(*) into n from public.members x where x.firm_id = new.firm_id and x.status in ('Active', 'Invited') and x.id <> new.id;
  m := public.plan_seats(new.firm_id);
  if n >= m then
    raise exception 'Your plan allows % user(s), active and invited. Remove a member or choose a bigger plan.', m using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists members_guard on public.members;
create trigger members_guard before insert or update on public.members
  for each row execute function public.guard_member_write();

-- ---------- 4. stored files ----------
drop policy if exists documents_delete on storage.objects;
create policy documents_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.member_role(((storage.foldername(name))[1])::uuid) in ('owner', 'partner'));
drop policy if exists documents_write on storage.objects;
create policy documents_write on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.member_role(((storage.foldername(name))[1])::uuid) in ('owner', 'partner', 'associate', 'clerk'));

-- ---------- 5. invoice series ----------
-- One counter per firm and series (e.g. 'RA/2026-27/'). Read and written only through next_invoice_no().
create table if not exists public.invoice_series (
  firm_id uuid not null references public.firms(id) on delete cascade,
  prefix text not null check (prefix ~ '^[A-Za-z0-9/_-]{1,30}$'),
  last integer not null default 0,
  primary key (firm_id, prefix)
);
alter table public.invoice_series enable row level security;

-- Returns the next number, never lower than the highest number already used in the firm's invoices of that series.
create or replace function public.next_invoice_no(f uuid, p_prefix text) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_role text := public.member_role(f); v_max integer; v_n integer;
begin
  if v_role is null or v_role not in ('owner', 'partner', 'associate') then
    raise exception 'Your role cannot raise invoices.' using errcode = '42501';
  end if;
  if p_prefix is null or p_prefix !~ '^[A-Za-z0-9/_-]{1,30}$' then raise exception 'Invalid invoice series.'; end if;
  select coalesce(max(substring(r.data ->> 'no' from length(p_prefix) + 1)::integer), 0) into v_max
    from public.records r
    where r.firm_id = f and r.kind = 'invoice' and left(r.data ->> 'no', length(p_prefix)) = p_prefix
      and substring(r.data ->> 'no' from length(p_prefix) + 1) ~ '^\d{1,9}$';
  insert into public.invoice_series as s (firm_id, prefix, last) values (f, p_prefix, v_max + 1)
    on conflict (firm_id, prefix) do update set last = greatest(s.last, v_max) + 1
    returning s.last into v_n;
  return v_n;
end $$;

-- ---------- 6. delete firm data keeps the invoice profile ----------
create or replace function public.erase_firm_data(f uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_owner(f) then raise exception 'Only the firm owner can delete the firm''s data.' using errcode = '42501'; end if;
  delete from public.records where firm_id = f;
  get diagnostics n = row_count;
  delete from public.user_state where firm_id = f;
  delete from public.notifications where firm_id = f;
  update public.firms set state = case when state ? 'profile' then jsonb_build_object('profile', state -> 'profile') else '{}'::jsonb end where id = f;
  return n;
end $$;

-- ---------- privileges ----------
revoke execute on function public.guard_record_write(), public.guard_member_write() from public, anon, authenticated;
revoke execute on function public.member_role(uuid), public.plan_seats(uuid), public.next_invoice_no(uuid, text), public.erase_firm_data(uuid) from public, anon;
grant execute on function public.member_role(uuid), public.plan_seats(uuid), public.next_invoice_no(uuid, text), public.erase_firm_data(uuid) to authenticated;

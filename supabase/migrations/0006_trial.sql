-- Legal Staff — 7-day free trial and plan enforcement.
-- 1. A firm's owner starts one free trial by choosing a plan. No payment is taken.
-- 2. firm_access(): true while the trial is running or a paid period has not ended.
-- 3. Without access, practice records and files can be read and deleted but not added or changed.
-- 4. The number of members a firm may have follows its plan (Solo 1, Professional 3, Firm 15).

-- ---------- 1. trial ----------
alter table public.subscriptions add column if not exists trial_ends timestamptz;
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check check (status in ('trialing', 'active'));

-- Users allowed by a plan. A firm with no plan yet has only its owner.
create or replace function public.plan_users(p_plan text) returns integer
language sql immutable set search_path = '' as $$
  select case p_plan when 'Firm' then 15 when 'Professional' then 3 else 1 end;
$$;

-- Starts the firm's free trial on the chosen plan. While the trial is running the owner may switch it to another
-- plan; the end date does not move. A firm gets one trial: once it has ended or a plan has been paid for, this refuses.
create or replace function public.start_trial(f uuid, p_plan text, p_cycle text) returns public.subscriptions
language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions; v_ends timestamptz := now() + interval '7 days'; n integer;
begin
  if not public.is_owner(f) then raise exception 'Only the firm owner can choose the plan.' using errcode = '42501'; end if;
  if p_plan not in ('Solo', 'Professional', 'Firm') or p_cycle not in ('monthly', 'annual') then raise exception 'Unknown plan.'; end if;
  select count(*) into n from public.members m where m.firm_id = f;
  if n > public.plan_users(p_plan) then raise exception 'The % plan allows % user(s) and the firm has %. Remove members first or choose a larger plan.', p_plan, public.plan_users(p_plan), n; end if;
  select * into s from public.subscriptions x where x.firm_id = f for update;
  if not found then
    insert into public.subscriptions (firm_id, plan, cycle, status, since, renews, trial_ends)
      values (f, p_plan, p_cycle, 'trialing', current_date, v_ends::date, v_ends) returning * into s;
  elsif s.status = 'trialing' and s.trial_ends > now() then
    update public.subscriptions x set plan = p_plan, cycle = p_cycle, updated_at = now() where x.firm_id = f returning * into s;
  else
    raise exception 'The free trial for this firm has already been used. Subscribe to a plan to continue.';
  end if;
  return s;
end $$;

-- ---------- 2. does the firm have access right now? ----------
-- A paid period runs to the end of its last day in India.
create or replace function public.firm_access(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subscriptions s where s.firm_id = f and (
    (s.status = 'trialing' and s.trial_ends > now()) or
    (s.status = 'active' and s.renews >= (now() at time zone 'Asia/Kolkata')::date)));
$$;

-- ---------- 3. no access: read and delete only ----------
drop policy if exists records_all on public.records;
create policy records_select on public.records for select to authenticated using (public.is_member(firm_id));
create policy records_delete on public.records for delete to authenticated using (public.is_member(firm_id));
create policy records_insert on public.records for insert to authenticated with check (public.is_member(firm_id) and public.firm_access(firm_id));
create policy records_update on public.records for update to authenticated using (public.is_member(firm_id)) with check (public.is_member(firm_id) and public.firm_access(firm_id));

drop policy if exists documents_write on storage.objects;
create policy documents_write on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_member(((storage.foldername(name))[1])::uuid) and public.firm_access(((storage.foldername(name))[1])::uuid));

-- ---------- 4. members allowed by the plan ----------
create or replace function public.guard_member_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_plan text; n integer; cap integer;
begin
  select s.plan into v_plan from public.subscriptions s where s.firm_id = new.firm_id;
  cap := public.plan_users(v_plan);
  select count(*) into n from public.members m where m.firm_id = new.firm_id;
  if n >= cap then
    raise exception 'Your plan allows % user(s). Upgrade the plan to add more members.', cap using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists members_plan_limit on public.members;
create trigger members_plan_limit before insert on public.members for each row execute function public.guard_member_limit();

-- ---------- privileges ----------
revoke execute on function public.guard_member_limit() from public, anon, authenticated;
revoke execute on function public.start_trial(uuid, text, text), public.firm_access(uuid), public.plan_users(text) from public, anon;
grant execute on function public.start_trial(uuid, text, text), public.firm_access(uuid), public.plan_users(text) to authenticated;

-- Legal Staff — per-user pricing for the Professional plan.
-- Professional is ₹799 a month (₹7,999 a year) for the first user plus ₹249 a month (₹2,499 a year) for each additional
-- user (functions/upi-pay, billing, admin). The number of users bought is kept with the payment and the subscription.
-- Solo stays at 1 user and Firm at 15, so seats is null for them; a Professional row without seats (bought before this
-- change, or a trial) keeps the earlier 3 users in the app.
alter table public.subscriptions add column if not exists seats integer check (seats is null or seats between 1 and 15);
alter table public.payments add column if not exists seats integer check (seats is null or seats between 1 and 15);

-- The member cap follows the users bought on Professional (3 when none were bought: a trial or an older plan).
create or replace function public.guard_member_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_plan text; v_seats integer; n integer; cap integer;
begin
  select s.plan, s.seats into v_plan, v_seats from public.subscriptions s where s.firm_id = new.firm_id;
  cap := case when v_plan = 'Professional' and v_seats is not null then v_seats else public.plan_users(v_plan) end;
  select count(*) into n from public.members m where m.firm_id = new.firm_id;
  if n >= cap then
    raise exception 'Your plan allows % user(s). Add users or upgrade the plan to add more members.', cap using errcode = '42501';
  end if;
  return new;
end $$;

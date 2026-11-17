-- Legal Staff — per-user pricing for the Professional plan.
-- Professional is ₹799 a month (₹7,999 a year) for the first user plus ₹249 a month (₹2,499 a year) for each additional
-- user, so the number of users bought is stored with the payment and the subscription. Solo stays at 1 user, Firm at 15.

alter table public.subscriptions add column if not exists seats integer check (seats is null or seats between 1 and 15);
alter table public.payments add column if not exists seats integer check (seats is null or seats between 1 and 15);

create or replace function public.plan_seats(f uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select case s.plan when 'Solo' then 1 when 'Professional' then coalesce(s.seats, 3) when 'Firm' then 15 end
                   from public.subscriptions s where s.firm_id = f and s.status = 'active'), 3);
$$;
revoke execute on function public.plan_seats(uuid) from public, anon;
grant execute on function public.plan_seats(uuid) to authenticated;

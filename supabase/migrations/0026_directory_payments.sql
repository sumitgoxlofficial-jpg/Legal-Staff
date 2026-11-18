-- Legal Staff: the Rs 49 lifetime directory listing (paid by UPI through functions/upi-pay, no account needed).
-- One row per payment attempt for a directory application. Paying does NOT publish a profile: publication is still the moderator's decision.
-- Server only: row level security on, no policies; functions/upi-pay (service role) writes, platform administrators may read.
create table if not exists public.directory_payments (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references public.directory_applications(id) on delete cascade,
  order_no text not null unique,
  amount_paise integer not null check (amount_paise between 4900 and 4999),   -- Rs 49.00 + 0-99 paise: the paise identify the payment
  status text not null default 'created' check (status in ('created', 'paid')),
  method text not null default 'upi',
  utr text,
  confirmed_by text,                                                            -- 'paytm' | 'sms' | 'email'
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists directory_payments_app_idx on public.directory_payments (application_id, status);
create index if not exists directory_payments_open_idx on public.directory_payments (status, created_at) where status = 'created';
create unique index if not exists directory_payments_one_paid_idx on public.directory_payments (application_id) where status = 'paid';   -- one lifetime listing per application
create unique index if not exists directory_payments_utr_idx on public.directory_payments (utr) where utr is not null;               -- a bank reference confirms one payment
alter table public.directory_payments enable row level security;
revoke all on public.directory_payments from anon, authenticated;
drop policy if exists directory_payments_admin on public.directory_payments;
create policy directory_payments_admin on public.directory_payments for select to authenticated using (public.is_platform_admin());
grant select on public.directory_payments to authenticated;
grant all on public.directory_payments to service_role;

-- A paid listing counts as a conversion for the email campaigns (migration 0024), matched by the applicant's email.
create or replace function public.directory_payment_hook() returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    select email into v_email from public.directory_applications where id = new.application_id;
    if coalesce(v_email, '') <> '' and to_regprocedure('public.email_record_conversion(text,text,text,jsonb)') is not null then
      perform public.email_record_conversion(v_email, 'payment_success', new.id::text, jsonb_build_object('amount_paise', new.amount_paise, 'listing', true));
    end if;
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists directory_payment_conversion on public.directory_payments;
create trigger directory_payment_conversion after insert or update of status on public.directory_payments for each row execute function public.directory_payment_hook();

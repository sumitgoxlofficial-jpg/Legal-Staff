-- Legal Staff — ₹49 directory listing fee, paid by Razorpay (functions/directory-pay).
-- An advocate pays on the last step of the application. The payment is checked on the server (Razorpay signature); only then can the
-- application row be inserted, and a fee is good for exactly one application. Promo codes reuse public.promo_codes (migration 0013):
-- give a directory code plans = '{Directory}' (or leave plans empty for every plan). The fee stays OFF until you switch it on:
--   update public.directory_fee_settings set enabled = true;   -- after RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set on the function

create table if not exists public.directory_fee_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  amount_paise integer not null default 4900 check (amount_paise >= 100)
);
insert into public.directory_fee_settings (id) values (1) on conflict do nothing;
alter table public.directory_fee_settings enable row level security;   -- no policies: only the server reads it

create table if not exists public.directory_fees (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,                 -- Razorpay order id, or DIRPROMO-… for a code that makes the fee free
  email text not null,
  method text not null default 'razorpay',
  base_paise integer not null,
  discount_paise integer not null default 0,
  amount_paise integer not null,
  promo_code text,
  status text not null default 'created' check (status in ('created', 'paid', 'used')),
  payment_id text,
  application_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.directory_fees enable row level security;           -- no policies: only the server reads or writes it
create index if not exists directory_fees_promo_idx on public.directory_fees (promo_code, lower(email)) where status <> 'created';

alter table public.directory_applications add column if not exists fee_order_id text unique;

-- True when the fee is off, or this order is paid, unused and was paid by this email.
create or replace function public.directory_fee_ok(o text, e text) returns boolean language sql stable security definer set search_path = '' as
$$ select not coalesce((select enabled from public.directory_fee_settings where id = 1), false)
       or exists (select 1 from public.directory_fees f where f.order_id = o and f.status = 'paid' and lower(f.email) = lower(e)) $$;
grant execute on function public.directory_fee_ok(text, text) to anon, authenticated;

drop policy if exists dir_apply on public.directory_applications;
create policy dir_apply on public.directory_applications for insert to anon, authenticated
  with check (status = 'pending' and note = '' and decided_at is null and decided_by is null and public.directory_fee_ok(fee_order_id, email));

-- Uses the fee up when its application is saved.
create or replace function public.directory_fee_use() returns trigger language plpgsql security definer set search_path = '' as
$$ begin
  if new.fee_order_id is not null then
    update public.directory_fees set status = 'used', application_id = new.id where order_id = new.fee_order_id;
  end if;
  return new;
end $$;
drop trigger if exists directory_fee_use on public.directory_applications;
create trigger directory_fee_use after insert on public.directory_applications for each row execute function public.directory_fee_use();

-- Legal Staff — GST invoices for plan payments (functions/billing): one invoice per paid payment, numbered
-- LS/<financial year>/<0001> in order within each financial year, emailed as a PDF to the buyer.

-- A 100%-off promo code makes a ₹0 payment.
alter table public.payments drop constraint if exists payments_amount_paise_check;
alter table public.payments add constraint payments_amount_paise_check check (amount_paise >= 0);

-- The seller details printed on every invoice (the business that receives the money).
alter table public.pay_settings
  add column if not exists seller_name text not null default 'Legal Staff',
  add column if not exists seller_address text not null default '',
  add column if not exists seller_state_code text not null default '',   -- 2-digit GST state code, e.g. '07' for Delhi
  add column if not exists seller_gstin text not null default '',
  add column if not exists seller_pan text not null default '',
  add column if not exists seller_email text not null default '',
  add column if not exists seller_phone text not null default '',
  add column if not exists sac_code text not null default '';

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  issued_at timestamptz not null default now(),
  data jsonb not null,                -- seller, buyer, lines and totals exactly as printed
  total_paise integer not null,
  emailed_to text,
  emailed_at timestamptz
);
create index if not exists invoices_firm_idx on public.invoices (firm_id, issued_at desc);
alter table public.invoices enable row level security;
create policy invoices_select on public.invoices for select to authenticated using (public.is_member(firm_id));

-- Next invoice number in a financial year ('2026-27'), gap-free under concurrency (server only).
create table if not exists public.invoice_counters (fy text primary key, last integer not null default 0);
alter table public.invoice_counters enable row level security;
create or replace function public.next_invoice_no(fy text) returns text language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.invoice_counters as c (fy, last) values (fy, 1)
    on conflict (fy) do update set last = c.last + 1
    returning last into n;
  return 'LS/' || fy || '/' || lpad(n::text, 4, '0');
end $$;
revoke all on function public.next_invoice_no(text) from public, anon, authenticated;
grant execute on function public.next_invoice_no(text) to service_role;

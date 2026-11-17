-- Legal Staff — direct UPI payments to the operator's own UPI ID, confirmed automatically (functions/upi-pay):
-- by Paytm for Business' order status check, and/or by bank 'credited' SMS sent in by an SMS-forwarder phone.

-- Payments: UPI orders use order_no instead of a Razorpay order id.
alter table public.payments alter column razorpay_order_id drop not null;
alter table public.payments add column if not exists method text not null default 'razorpay';
alter table public.payments add column if not exists order_no text unique;
alter table public.payments add column if not exists utr text;
alter table public.payments add column if not exists confirmed_by text;   -- 'paytm' | 'sms'
create index if not exists payments_upi_pending_idx on public.payments (method, status, created_at) where method = 'upi';

-- One row of operator settings. Only the upi-pay function (service role) reads or writes it: RLS on, no policies.
create table if not exists public.pay_settings (
  id integer primary key default 1 check (id = 1),
  upi_enabled boolean not null default false,
  upi_id text not null default '',            -- where customers pay, e.g. paytmqr...@paytm or name@okhdfcbank
  payee_name text not null default 'Legal Staff',
  paytm_mid text not null default '',         -- Paytm for Business merchant ID, for the order status check
  sms_secret text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  updated_at timestamptz not null default now()
);
insert into public.pay_settings (id) values (1) on conflict do nothing;
alter table public.pay_settings enable row level security;

-- Every SMS the forwarder sends in, kept for audit; a bank reference can confirm only one payment.
create table if not exists public.upi_sms (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  sender text not null default '',
  body text not null,
  amount_paise integer,
  utr text,
  payment_id uuid references public.payments(id) on delete set null,
  note text not null default ''
);
create unique index if not exists upi_sms_utr_idx on public.upi_sms (utr) where utr is not null;
alter table public.upi_sms enable row level security;

-- Checks pending UPI orders with Paytm every 2 minutes, for customers who closed the payment window.
select cron.unschedule('legal-staff-upi-sweep') where exists (select 1 from cron.job where jobname = 'legal-staff-upi-sweep');
select cron.schedule('legal-staff-upi-sweep', '*/2 * * * *', $job$
  select net.http_post(
    url := 'https://ihbbfgzzbpxznbpspyam.supabase.co/functions/v1/upi-pay',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"sweep"}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

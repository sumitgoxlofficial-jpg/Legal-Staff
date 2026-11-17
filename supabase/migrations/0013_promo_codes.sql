-- Legal Staff — promo codes for plan checkout (functions/upi-pay: actions 'promo' and 'create').
-- A code takes a percentage and/or a flat rupee amount off the plan price before GST, or sets a fixed total. Only the server reads this table.
create table if not exists public.promo_codes (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  percent_off integer not null default 0 check (percent_off between 0 and 100),
  amount_off integer not null default 0 check (amount_off >= 0),      -- rupees, before GST
  fixed_total integer check (fixed_total >= 0),                       -- paise: the customer pays exactly this, GST included
  plans text[],                                                       -- null = every plan; e.g. '{Solo,Professional}'
  cycles text[],                                                      -- null = both; '{monthly}' or '{annual}'
  max_uses integer,                                                   -- null = unlimited
  uses integer not null default 0,
  once_per_firm boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (percent_off > 0 or amount_off > 0 or fixed_total is not null)
);
alter table public.promo_codes enable row level security;

alter table public.payments add column if not exists promo_code text;
alter table public.payments add column if not exists discount_paise integer not null default 0;

-- Counts one use of a code when its payment is confirmed (atomic, server only).
create or replace function public.promo_use(c text) returns void language sql security definer set search_path = '' as
$$ update public.promo_codes set uses = uses + 1 where code = c $$;
revoke all on function public.promo_use(text) from public, anon, authenticated;
grant execute on function public.promo_use(text) to service_role;

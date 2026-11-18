-- Legal Staff — promo codes on the directory listing fee (functions/upi-pay dir_promo / dir_create, functions/razorpay).
-- Directory orders remember the code and the discount, and may now be free (a 100%-off code).
alter table public.directory_orders add column if not exists promo_code text;
alter table public.directory_orders add column if not exists discount_paise integer not null default 0;
alter table public.directory_orders drop constraint if exists directory_orders_amount_paise_check;
alter table public.directory_orders add constraint directory_orders_amount_paise_check check (amount_paise >= 0);

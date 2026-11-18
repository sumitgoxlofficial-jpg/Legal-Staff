-- Legal Staff: Razorpay as the second way to pay the Rs 49 directory listing (functions/listing-razorpay). UPI (migration 0026) stays.
-- Razorpay is used only for this one listing fee; plan payments remain UPI-only (migration 0014). Keys live in function secrets, never here.
alter table public.directory_payments add column if not exists gateway_order_id text;
alter table public.directory_payments add column if not exists gateway_payment_id text;
alter table public.directory_payments drop constraint if exists directory_payments_amount_paise_check;
alter table public.directory_payments drop constraint if exists directory_payments_amount_ck;
alter table public.directory_payments add constraint directory_payments_amount_ck check ((method = 'upi' and amount_paise between 4900 and 4999) or (method = 'razorpay' and amount_paise = 4900));
alter table public.directory_payments drop constraint if exists directory_payments_method_ck;
alter table public.directory_payments add constraint directory_payments_method_ck check (method in ('upi', 'razorpay'));
create unique index if not exists directory_payments_gw_order_idx on public.directory_payments (gateway_order_id) where gateway_order_id is not null;
create unique index if not exists directory_payments_gw_payment_idx on public.directory_payments (gateway_payment_id) where gateway_payment_id is not null;
-- A row that is still 'created' but has a gateway_payment_id is a payment taken for a listing that was already paid another way: refund it by hand.

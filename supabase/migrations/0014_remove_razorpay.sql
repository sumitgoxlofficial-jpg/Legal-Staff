-- Legal Staff — Razorpay removed: plans are paid only by UPI straight to our account (functions/upi-pay).
-- Deletes the stored Razorpay keys and renames the leftover payment columns.
delete from vault.secrets where name in ('razorpay_key_id', 'razorpay_key_secret', 'razorpay_webhook_secret');
drop function if exists public.razorpay_keys();
alter table public.payments rename column razorpay_order_id to gateway_order_id;
alter table public.payments rename column razorpay_payment_id to gateway_payment_id;
alter table public.payments alter column method set default 'upi';

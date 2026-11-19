-- Legal Staff — plan and directory-fee payments go only through Razorpay (functions/razorpay).
-- The direct-UPI flow (own QR code, bank SMS / email matching, Paytm sweep) is switched off.
-- Old UPI payment rows, directory_orders and the upi_sms audit table are kept as history.
select cron.unschedule('legal-staff-upi-sweep') where exists (select 1 from cron.job where jobname = 'legal-staff-upi-sweep');
alter table public.payments alter column method set default 'razorpay';
update public.pay_settings set upi_enabled = false where id = 1;

-- Legal Staff — confirm UPI payments from bank 'credited' alert emails too (functions/upi-pay, action=email).
-- Bank alerts are auto-forwarded from the operator's mailbox to a secret payments inbox on the Resend receiving domain;
-- only mail addressed to that inbox's local part counts.
alter table public.pay_settings add column if not exists email_inbox text not null default ('pay-' || encode(extensions.gen_random_bytes(5), 'hex'));
comment on column public.payments.confirmed_by is 'paytm | sms | email';

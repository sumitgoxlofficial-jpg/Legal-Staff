-- Legal Staff — where to email the business owner when a customer pays (functions/billing). Empty: the seller email, if any.
alter table public.pay_settings add column if not exists alert_email text not null default '';

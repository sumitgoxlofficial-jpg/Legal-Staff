-- Legal Staff: attributes a confirmed Rs 49 payment to the email campaign that was sent to the payer (migration 0024).
-- Fires when a row in public.payments becomes 'paid' with amount_paise = 4900 (the lifetime directory listing price). The payer's email is
-- looked up from auth.users; if it is not in the email contact list nothing happens. It never blocks or fails a payment.
-- Note: a promo code that brings another plan to exactly Rs 49 would also match; the effect is only that a listed contact stops getting reminders.
create or replace function public.email_payment_hook() returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if new.status = 'paid' and new.amount_paise = 4900 and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    select email into v_email from auth.users where id = new.user_id;
    if coalesce(v_email, '') <> '' then perform public.email_record_conversion(v_email, 'payment_success', new.id::text, jsonb_build_object('amount_paise', new.amount_paise)); end if;
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists email_payment_conversion on public.payments;
create trigger email_payment_conversion after insert or update of status on public.payments for each row execute function public.email_payment_hook();

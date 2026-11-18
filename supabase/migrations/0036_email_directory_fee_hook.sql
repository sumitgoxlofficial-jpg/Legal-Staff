-- Legal Staff: a paid directory listing fee (Rs 49, public.directory_orders from migration 0026_directory_membership, paid by UPI or Razorpay)
-- counts as a conversion for the email campaigns (migration 0035): the contact is matched by the applicant's email, marked PAID, their reminders
-- stop, and the payment is attributed to the campaign last sent to them. A 100%-off promo order (amount 0) is a registration, not a payment.
-- Never blocks or fails a payment.
create or replace function public.email_directory_fee_hook() returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    select email into v_email from public.directory_applications where id = new.application_id;
    if coalesce(v_email, '') <> '' and to_regprocedure('public.email_record_conversion(text,text,text,jsonb)') is not null then
      perform public.email_record_conversion(v_email, case when new.amount_paise > 0 then 'payment_success' else 'registration_completed' end, new.id::text,
        jsonb_build_object('amount_paise', new.amount_paise, 'listing_fee', true));
    end if;
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists email_directory_fee_conversion on public.directory_orders;
create trigger email_directory_fee_conversion after insert or update of status on public.directory_orders for each row execute function public.email_directory_fee_hook();

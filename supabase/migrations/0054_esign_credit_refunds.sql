-- A refunded e-signing credit purchase takes the credits back (never below zero) and never touches the firm's plan.
-- Plan refunds now look only at plan payments when deciding whether any paid plan payment is left.
-- Applied to the live project as 0054_esign_credit_refunds; checked in a rolled-back transaction: credits 0 -> 100 -> 0, plan unchanged, a repeated refund ignored.
create or replace function public.apply_refund(p_payment_id text, p_refund_id text, p_amount integer)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare pay public.payments; ord public.directory_orders; latest uuid; v_take integer; v_bal integer; yday text := to_char((now() at time zone 'Asia/Kolkata')::date - 1, 'YYYY-MM-DD');
begin
  select * into pay from public.payments where gateway_payment_id = p_payment_id for update;
  if found then
    if pay.status = 'refunded' then return 'already'; end if;
    if pay.status <> 'paid' then return 'not_paid'; end if;
    if p_amount < pay.amount_paise then update public.payments set refund_paise = coalesce(refund_paise, 0) + p_amount, refund_id = p_refund_id where id = pay.id; return 'partial'; end if;
    update public.payments set status = 'refunded', refunded_at = now(), refund_id = p_refund_id, refund_paise = p_amount where id = pay.id;
    if pay.kind = 'esign' then
      insert into public.esign_wallets (firm_id) values (pay.firm_id) on conflict do nothing;
      select least(w.credits, coalesce(pay.esign_credits, 0)) into v_take from public.esign_wallets w where w.firm_id = pay.firm_id for update;
      if v_take > 0 then
        update public.esign_wallets w set credits = w.credits - v_take, updated_at = now() where w.firm_id = pay.firm_id returning w.credits into v_bal;
        insert into public.esign_ledger (firm_id, delta, kind, payment_id, note, balance_after) values (pay.firm_id, -v_take, 'refund', pay.id, 'Payment refunded; credits taken back', coalesce(v_bal, 0));
      end if;
      return 'credits_refunded';
    end if;
    select id into latest from public.payments where firm_id = pay.firm_id and status = 'paid' and kind = 'plan' order by paid_at desc nulls last limit 1;
    if latest is null then update public.subscriptions set renews = yday::date, trial_ends = null, updated_at = now() where firm_id = pay.firm_id and status = 'active'; end if;
    return 'plan_refunded';
  end if;
  select * into ord from public.directory_orders where utr = p_payment_id for update;
  if found then
    if ord.status = 'refunded' then return 'already'; end if;
    if ord.status <> 'paid' then return 'not_paid'; end if;
    if p_amount < ord.amount_paise then return 'partial'; end if;
    update public.directory_orders set status = 'refunded', refunded_at = now(), refund_id = p_refund_id where id = ord.id;
    update public.directory_applications set paid_at = null where id = ord.application_id and order_no = ord.order_no;
    return 'listing_refunded';
  end if;
  return 'unmatched';
end $function$;

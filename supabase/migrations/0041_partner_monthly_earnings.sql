-- Legal Staff — Partner Network: monthly referral and earnings summary, for paying partners.
-- Apply after 0039. Safe to run more than once. Adds two read-only functions; no tables change.
--
-- A referral belongs to the month (India time) in which the advocate's application was attributed to the partner. For each partner and month:
-- how many advocates they referred, how many of those paid and were verified, and what the commission ledger says about them.
-- "to_pay" is what has been approved or made payable but not yet paid. Amounts come only from the ledger: where a category has no commission
-- (it is off until counsel's approval is recorded) the money columns are zero and only the counts show.

create or replace function public.admin_monthly_earnings(p_month text default null) returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m text := coalesce(nullif(btrim(p_month), ''), to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM'));
begin
  perform public.ps_require('commissions.view');
  if m !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Choose a month.'; end if;
  perform public.ps_audit('report.run', 'report', 'monthly_earnings', jsonb_build_object('month', m));
  return jsonb_build_object('month', m,
    'categories_with_commission_on', (select count(*) from public.partner_categories where commission_enabled),
    'commission_generation', public.ps_flag('commission_generation'),
    'rows', coalesce((select jsonb_agg(x order by (x ->> 'referred')::int desc, x ->> 'code') from (
      select jsonb_build_object('partner_id', p.id, 'code', p.code, 'name', p.name, 'category_key', p.category_key, 'state', p.state, 'district', p.district, 'status', p.status, 'kyc', p.kyc_status,
        'referred', count(t.id),
        'paid', count(t.id) filter (where public.ps_paid(t.application_id) is not null),
        'verified', count(t.id) filter (where d.status = 'verified'),
        'earned_paise', coalesce(sum(c.amount_paise) filter (where c.status in ('eligible', 'approved', 'payable', 'paid')), 0),
        'to_pay_paise', coalesce(sum(c.amount_paise) filter (where c.status in ('approved', 'payable')), 0),
        'paid_out_paise', coalesce(sum(c.amount_paise) filter (where c.status = 'paid'), 0),
        'waiting_paise', coalesce(sum(c.amount_paise) filter (where c.status in ('pending_attribution', 'pending_payment', 'pending_verification', 'on_hold')), 0)) x
      from public.partners p
      join public.referral_attributions t on t.partner_id = p.id and t.status = 'valid' and to_char(t.attributed_at at time zone 'Asia/Kolkata', 'YYYY-MM') = m
      left join public.directory_applications d on d.id = t.application_id
      left join public.partner_commissions c on c.attribution_id = t.id
      group by p.id) q), '[]'::jsonb));
end $$;

-- A partner's own months, newest first (last 12).
create or replace function public.partner_monthly_earnings() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare p public.partners := public.ps_my_partner();
begin
  return coalesce((select jsonb_agg(x order by x ->> 'month' desc) from (
    select jsonb_build_object('month', to_char(t.attributed_at at time zone 'Asia/Kolkata', 'YYYY-MM'),
      'referred', count(t.id),
      'verified', count(t.id) filter (where d.status = 'verified'),
      'earned_paise', coalesce(sum(c.amount_paise) filter (where c.status in ('eligible', 'approved', 'payable', 'paid')), 0),
      'paid_out_paise', coalesce(sum(c.amount_paise) filter (where c.status = 'paid'), 0),
      'waiting_paise', coalesce(sum(c.amount_paise) filter (where c.status in ('pending_attribution', 'pending_payment', 'pending_verification', 'on_hold')), 0)) x
    from public.referral_attributions t left join public.directory_applications d on d.id = t.application_id left join public.partner_commissions c on c.attribution_id = t.id
    where t.partner_id = p.id and t.status = 'valid' and t.attributed_at > now() - interval '12 months'
    group by to_char(t.attributed_at at time zone 'Asia/Kolkata', 'YYYY-MM')) q), '[]'::jsonb);
end $$;

revoke all on function public.admin_monthly_earnings(text), public.partner_monthly_earnings() from public, anon, authenticated;
grant execute on function public.admin_monthly_earnings(text), public.partner_monthly_earnings() to authenticated;

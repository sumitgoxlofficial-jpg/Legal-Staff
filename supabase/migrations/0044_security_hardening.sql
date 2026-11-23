-- Legal Staff — security and payment hardening (found in the 2026-11-21 audit). Re-runnable; changes no customer data.
--  1. The first person to create a firm stopped being a hidden platform administrator: is_platform_admin() is now the Super Admin check.
--  2. Legacy directory_resubmit (anon-callable, authenticated by public values) is closed; directory_status no longer leaks moderation notes.
--  3. Public inserts (enquiries, reports, contact) get length limits and a per-target rate limit; profile ids get a format check.
--  4. Enrolment numbers are unique after normalisation (when no existing duplicates block it).
--  5. Refunds: 'refunded' status for plan and listing payments; a refunded listing reverses its partner commission (or raises a clawback flag).
--  6. Partner network: self-referral through the same login, open payouts on rejection/suspension, referred applications can be deleted.

-- 1 ---------------------------------------------------------------------------------------------------------------
create or replace function public.create_firm(p_name text, p_city text, p_address text, p_user_name text, p_role text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text := lower(coalesce((select auth.jwt()) ->> 'email', '')); v_firm uuid; v_title text;
begin
  if v_uid is null or v_email = '' then raise exception 'not signed in'; end if;
  if exists (select 1 from public.members where user_id = v_uid and is_owner) then raise exception 'you already own a firm'; end if;
  v_title := case when p_role ~ '(Partner|Associate|Advocate)' then 'Adv. ' else '' end || trim(p_user_name);
  insert into public.firms (name, city, address, created_by) values (trim(p_name), trim(p_city), trim(p_address), v_uid) returning id into v_firm;
  insert into public.members (firm_id, user_id, email, name, title, role, status, is_owner) values (v_firm, v_uid, v_email, trim(p_user_name), v_title, p_role, 'Active', true);
  return v_firm;
end $$;
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select public.is_super_admin(); $$;
revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- 2 ---------------------------------------------------------------------------------------------------------------
revoke execute on function public.directory_resubmit(text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
create or replace function public.directory_status(p_ref text, p_enr text) returns table (id text, name text, enr text, council text, year text, city text, status text, note text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name, a.enr, a.council, a.year, a.city, a.status, ''::text, a.created_at from public.directory_applications a
  where a.id = trim(p_ref) and upper(a.enr) = upper(trim(p_enr)) and a.user_id is null;   -- only pre-sign-in applications; signed-in applicants use directory_my_applications()
$$;

-- 3 ---------------------------------------------------------------------------------------------------------------
do $$ begin
  alter table public.directory_applications drop constraint if exists dir_app_id_fmt;
  alter table public.directory_applications add constraint dir_app_id_fmt check (id ~ '^[A-Za-z0-9_-]{3,40}$') not valid;
  alter table public.directory_enquiries drop constraint if exists dir_enq_len;
  alter table public.directory_enquiries add constraint dir_enq_len check (length(name) <= 120 and length(email) <= 200 and length(phone) <= 30 and length(category) <= 120 and length(language) <= 60 and length(message) <= 3000) not valid;
  alter table public.profile_reports drop constraint if exists dir_rep_len;
  alter table public.profile_reports add constraint dir_rep_len check (length(reason) <= 200 and length(details) <= 3000 and length(email) <= 200) not valid;
  alter table public.contact_requests drop constraint if exists contact_len;
  alter table public.contact_requests add constraint contact_len check (length(name) <= 120 and length(email) <= 200 and length(phone) <= 30 and length(firm) <= 200 and length(team_size) <= 60 and length(topic) <= 200 and length(message) <= 5000) not valid;
end $$;
create or replace function public.dir_is_listed(p_id text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.directory_applications a where a.id = p_id and a.paid_at is not null and a.status <> 'rejected');
$$;
revoke execute on function public.dir_is_listed(text) from public;
grant execute on function public.dir_is_listed(text) to anon, authenticated;
create table if not exists public.public_insert_log (id bigint generated always as identity primary key, kind text not null, target text not null, at timestamptz not null default now());
create index if not exists public_insert_log_idx on public.public_insert_log (kind, target, at);
alter table public.public_insert_log enable row level security;
revoke all on public.public_insert_log from anon, authenticated;
-- At most p_max rows of one kind per target per hour; older log rows are pruned as a side effect.
create or replace function public.public_insert_guard() returns trigger language plpgsql security definer set search_path = '' as $$
declare k text := tg_argv[0]; mx int := tg_argv[1]::int; t text;
begin
  t := case k when 'contact' then 'all' else coalesce(to_jsonb(new) ->> 'application_id', '-') end;
  if (select count(*) from public.public_insert_log where kind = k and target = t and at > now() - interval '1 hour') >= mx then raise exception 'Too many requests. Please try again later.' using errcode = '54000'; end if;
  insert into public.public_insert_log (kind, target) values (k, t);
  delete from public.public_insert_log where at < now() - interval '2 days' and random() < 0.02;
  return new;
end $$;
drop trigger if exists enquiry_guard on public.directory_enquiries;
create trigger enquiry_guard before insert on public.directory_enquiries for each row execute function public.public_insert_guard('enquiry', '30');
drop trigger if exists report_guard on public.profile_reports;
create trigger report_guard before insert on public.profile_reports for each row execute function public.public_insert_guard('report', '20');
drop trigger if exists contact_guard on public.contact_requests;
create trigger contact_guard before insert on public.contact_requests for each row execute function public.public_insert_guard('contact', '200');
drop policy if exists enquiries_insert on public.directory_enquiries;
create policy enquiries_insert on public.directory_enquiries for insert to anon, authenticated with check (public.dir_is_listed(application_id) and replied_at is null);
drop policy if exists contact_insert on public.contact_requests;
create policy contact_insert on public.contact_requests for insert to anon, authenticated with check (status = 'open' and reply = '' and replied_at is null and firm_id is null and user_id is null and ai_replied = false);
drop policy if exists reports_insert on public.profile_reports;
create policy reports_insert on public.profile_reports for insert to anon, authenticated with check (application_id is null or public.dir_is_listed(application_id));

-- 4 ---------------------------------------------------------------------------------------------------------------
do $$ begin
  create unique index if not exists directory_enr_norm_idx on public.directory_applications (upper(regexp_replace(enr, '[^A-Za-z0-9]', '', 'g'))) where status <> 'rejected';
exception when unique_violation then
  raise notice 'directory_enr_norm_idx not created: existing applications share a normalised enrolment number; resolve them and re-run this migration';
end $$;

-- 5 ---------------------------------------------------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('created', 'paid', 'failed', 'refunded'));
alter table public.payments add column if not exists refunded_at timestamptz, add column if not exists refund_id text, add column if not exists refund_paise integer;
alter table public.payments add column if not exists failure_reason text;
alter table public.directory_orders drop constraint if exists directory_orders_status_check;
alter table public.directory_orders add constraint directory_orders_status_check check (status in ('created', 'paid', 'failed', 'refunded'));
alter table public.directory_orders add column if not exists refunded_at timestamptz, add column if not exists refund_id text;
-- A payment ledger: one row per gateway event, so every state change is traceable and a replayed webhook is recognised.
create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  event_id text unique,                -- Razorpay's x-razorpay-event-id; a replay hits this unique key
  kind text not null,                  -- e.g. payment.captured, order.paid, payment.failed, refund.processed
  order_id text, payment_id text, amount_paise integer,
  outcome text not null default '',    -- what we did: activated, listed, already_done, refunded, ignored, unmatched
  payload jsonb,
  at timestamptz not null default now()
);
create index if not exists payment_events_order_idx on public.payment_events (order_id);
alter table public.payment_events enable row level security;   -- no policies: service role only
revoke all on public.payment_events from anon, authenticated;

create or replace function public.ps_order_refunded() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare cm public.partner_commissions;
begin
  begin
    select * into cm from public.partner_commissions where application_id = new.application_id;
    if found then
      if cm.status in ('pending_payment', 'pending_verification', 'eligible', 'approved', 'payable', 'on_hold', 'manual_hold') and cm.payout_id is null then
        update public.partner_commissions set status = 'reversed', reversed_at = now(), reversal_reason = 'Listing fee refunded', updated_at = now() where id = cm.id;
        perform public.ps_audit('commission.reversed', 'commission', cm.id::text, jsonb_build_object('reason', 'listing fee refunded'));
      elsif cm.status in ('payable', 'approved') and cm.payout_id is not null then
        update public.partner_payouts set status = 'on_hold', note = 'Held: a listing fee in this payout was refunded' where id = cm.payout_id and status in ('requested', 'under_review', 'approved', 'processing');
        insert into public.partner_fraud_flags (partner_id, application_id, kind, score, detail) values (cm.partner_id, new.application_id, 'clawback_review', 60, jsonb_build_object('commission', cm.id, 'why', 'listing fee refunded while in a payout'));
      elsif cm.status = 'paid' then
        insert into public.partner_fraud_flags (partner_id, application_id, kind, score, detail) values (cm.partner_id, new.application_id, 'clawback_review', 60, jsonb_build_object('commission', cm.id, 'why', 'listing fee refunded after payout'));
      end if;
    end if;
  exception when others then
    insert into public.partner_audit_logs (action, entity, entity_id, detail) values ('commission.error', 'directory_application', new.application_id, jsonb_build_object('error', sqlerrm));
  end;
  return new;
end $$;
do $$ begin
  if to_regclass('public.directory_orders') is not null then
    drop trigger if exists ps_order_refund on public.directory_orders;
    create trigger ps_order_refund after update of status on public.directory_orders for each row when (new.status = 'refunded' and old.status is distinct from 'refunded') execute function public.ps_order_refunded();
  end if;
end $$;

-- 6 ---------------------------------------------------------------------------------------------------------------
create or replace function public.ps_attribute_application(p_app text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.directory_applications; p public.partners; c public.partner_categories; t public.partner_referrals; win int; st text := 'valid'; why text := ''; verified boolean := false;
  aid uuid; recent int;
begin
  select * into a from public.directory_applications where id = p_app;
  if not found or btrim(coalesce(a.referral_code, '')) = '' then return; end if;
  if not public.ps_flag('network_enabled') or not public.ps_flag('referral_tracking') then return; end if;
  if exists (select 1 from public.referral_attributions where application_id = p_app) then return; end if;
  win := coalesce(public.ps_int('attribution_window_days'), 30);
  select * into p from public.partners where code = upper(btrim(a.referral_code));
  if not found then st := 'rejected_unknown'; why := 'Unknown referral code';
  elsif p.status <> 'approved' then st := 'rejected_inactive'; why := 'Partner account is not active';
  else
    select * into c from public.partner_categories where key = p.category_key;
    if not c.active or c.archived or not c.referral_tracking_enabled then st := 'rejected_inactive'; why := 'Category is not tracking referrals';
    elsif a.user_id = p.user_id or lower(btrim(a.email)) = lower(btrim(p.email)) or (length(public.ps_digits(a.mobile)) >= 10 and public.ps_mobile10(a.mobile) = public.ps_mobile10(p.mobile))
       or (p.enrolment_no <> '' and upper(btrim(p.enrolment_no)) = upper(btrim(a.enr))) then st := 'rejected_self'; why := 'Referrer details match the advocate';
    else
      select * into t from public.partner_referrals r where r.partner_id = p.id and r.visitor_token = a.visitor_token and r.landed_at >= now() - make_interval(days => win) order by r.landed_at limit 1;
      verified := found;
    end if;
  end if;
  insert into public.referral_attributions (application_id, partner_id, code, category_key, touch_id, touch_verified, status, reason, window_ends_at)
  values (p_app, p.id, upper(btrim(a.referral_code)), p.category_key, t.id, verified, st, why, case when verified then t.landed_at + make_interval(days => win) end) returning id into aid;
  perform public.ps_audit('attribution.' || st, 'attribution', aid::text, jsonb_build_object('application', p_app, 'code', upper(btrim(a.referral_code)), 'touch_verified', verified));
  if st = 'rejected_self' then
    insert into public.partner_fraud_flags (partner_id, application_id, attribution_id, kind, score, detail) values (p.id, p_app, aid, 'self_referral', 100, jsonb_build_object('why', why));
  elsif st = 'valid' then
    if not verified then insert into public.partner_fraud_flags (partner_id, application_id, attribution_id, kind, score, detail) values (p.id, p_app, aid, 'no_matching_click', 25, jsonb_build_object('why', 'No recorded click for this visitor inside the window')); end if;
    select count(*) into recent from public.referral_attributions where partner_id = p.id and attributed_at > now() - interval '24 hours';
    if recent > coalesce(public.ps_int('burst_limit_per_day'), 10) then
      insert into public.partner_fraud_flags (partner_id, application_id, attribution_id, kind, score, detail) values (p.id, p_app, aid, 'burst_of_registrations', 30, jsonb_build_object('last_24h', recent));
    end if;
    perform public.ps_notify(p.id, 'referral_received', jsonb_build_object('ref', p_app));
    perform public.ps_evaluate_commission(p_app);
  end if;
end $$;
create or replace function public.ps_attr_immutable() returns trigger language plpgsql as $$
begin
  if new.partner_id is distinct from old.partner_id or new.code is distinct from old.code or (new.application_id is distinct from old.application_id and new.application_id is not null) or new.attributed_at is distinct from old.attributed_at then
    raise exception 'A referral attribution cannot be changed after it is recorded.'; end if;
  return new;
end $$;
create or replace function public.ps_directory_after_status() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare cm public.partner_commissions;
begin
  begin
    if new.status = 'rejected' then
      select * into cm from public.partner_commissions where application_id = new.id;
      if found and cm.status in ('eligible', 'approved', 'payable') and cm.payout_id is null then
        update public.partner_commissions set status = 'reversed', reversed_at = now(), reversal_reason = 'Directory application rejected after the commission arose', updated_at = now() where id = cm.id;
        perform public.ps_audit('commission.reversed', 'commission', cm.id::text, jsonb_build_object('reason', 'application rejected'));
      elsif found and cm.status = 'paid' then
        insert into public.partner_fraud_flags (partner_id, application_id, kind, score, detail) values (cm.partner_id, new.id, 'clawback_review', 60, jsonb_build_object('commission', cm.id, 'why', 'application rejected after payout'));
      end if;
    end if;
    if new.status = 'rejected' then   -- money already inside an open payout is held, not paid out on a rejected listing
      for cm in select * from public.partner_commissions where application_id = new.id and payout_id is not null and status in ('payable', 'approved') loop
        update public.partner_payouts set status = 'on_hold', note = 'Held: a listing in this payout was rejected' where id = cm.payout_id and status in ('requested', 'under_review', 'approved', 'processing');
        insert into public.partner_fraud_flags (partner_id, application_id, kind, score, detail) values (cm.partner_id, new.id, 'clawback_review', 60, jsonb_build_object('commission', cm.id, 'why', 'application rejected while its commission was in a payout'));
      end loop;
    end if;
    perform public.ps_evaluate_commission(new.id);
  exception when others then
    insert into public.partner_audit_logs (action, entity, entity_id, detail) values ('commission.error', 'directory_application', new.id, jsonb_build_object('error', sqlerrm));
  end;
  return new;
end $$;
create or replace function public.admin_payout_action(p_id uuid, p_action text, p_note text default '', p_utr text default null) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare o public.partner_payouts; p public.partners; ns text; u text := nullif(btrim(coalesce(p_utr, '')), '');
begin
  perform public.ps_require('payouts.manage');
  select * into o from public.partner_payouts where id = p_id for update;
  if not found then raise exception 'Payout not found.'; end if;
  select * into p from public.partners where id = o.partner_id;
  if p_action in ('approve', 'processing', 'paid') and p.status <> 'approved' then raise exception 'The partner account is not active, so this payout cannot move forward.'; end if;
  if p_action in ('approve', 'processing', 'paid') and (not public.ps_flag('network_enabled') or public.ps_flag('payouts_paused')) then raise exception 'Payout processing is paused.'; end if;
  if p_action = 'review' and o.status in ('requested', 'on_hold') then ns := 'under_review';
  elsif p_action = 'approve' and o.status in ('requested', 'under_review', 'on_hold') then
    if p.kyc_status <> 'verified' then raise exception 'The partner''s KYC is not verified.'; end if;
    ns := 'approved';
  elsif p_action = 'processing' and o.status = 'approved' then ns := 'processing';
  elsif p_action = 'hold' and o.status in ('requested', 'under_review', 'approved', 'processing') then ns := 'on_hold';
  elsif p_action in ('reject', 'fail') and o.status in ('requested', 'under_review', 'approved', 'processing', 'on_hold') then
    if p_action = 'reject' and length(btrim(coalesce(p_note, ''))) < 3 then raise exception 'Say why the payout is rejected.'; end if;
    ns := case p_action when 'reject' then 'rejected' else 'failed' end;
    update public.partner_commissions set payout_id = null, updated_at = now() where payout_id = p_id and status = 'payable';   -- balance goes back to the partner
  elsif p_action = 'paid' and o.status in ('approved', 'processing') then
    if u is null or length(u) < 6 then raise exception 'Enter the UTR or bank reference of the transfer.'; end if;
    begin
      update public.partner_payouts set utr = u where id = p_id;
    exception when unique_violation then
      insert into public.partner_fraud_flags (partner_id, kind, score, detail) values (o.partner_id, 'repeated_payout_reference', 80, jsonb_build_object('utr', u, 'payout', p_id));
      raise exception 'That UTR is already recorded on another payout.';
    end;
    update public.partner_commissions set status = 'paid', paid_at = now(), updated_at = now() where payout_id = p_id and status = 'payable';
    update public.partner_payouts set paid_by = public.ps_email(), paid_at = now() where id = p_id;
    ns := 'paid';
  else raise exception 'A % payout cannot be %.', o.status, p_action; end if;
  update public.partner_payouts set status = ns, note = coalesce(nullif(p_note, ''), note), decided_by = public.ps_email(), decided_at = now() where id = p_id;
  perform public.ps_audit('payout.' || p_action, 'payout', p_id::text, jsonb_build_object('note', p_note, 'utr', u, 'status', ns));
  perform public.ps_notify(o.partner_id, 'payout_update', jsonb_build_object('name', p.name, 'amount', public.ps_inr(o.amount_paise), 'status', replace(ns, '_', ' '), 'note', coalesce(p_note, '')));
end $$;

-- 7 ---------------------------------------------------------------------------------------------------------------
-- Promo codes: one atomic claim (limit and once-per-firm checked and counted in a single locked step), used before any free activation.
create or replace function public.promo_claim(c text, p_firm uuid default null, p_user uuid default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare r public.promo_codes; used boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended('promo:' || upper(c) || ':' || coalesce(p_firm::text, p_user::text, ''), 0));
  select * into r from public.promo_codes where code = upper(c) for update;
  if not found or not r.active then return false; end if;
  if r.max_uses is not null and r.uses >= r.max_uses then return false; end if;
  if r.once_per_firm then
    if p_firm is not null then used := exists (select 1 from public.payments where firm_id = p_firm and promo_code = r.code and status in ('paid', 'refunded')); end if;
    if p_user is not null and not used then used := exists (select 1 from public.directory_orders where user_id = p_user and promo_code = r.code and status in ('paid', 'refunded')); end if;
    if used then return false; end if;
  end if;
  update public.promo_codes set uses = uses + 1 where code = r.code;
  return true;
end $$;
revoke execute on function public.promo_claim(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.promo_claim(text, uuid, uuid) to service_role;

-- Refunds, applied in one transaction from the Razorpay webhook or the admin Refund button. p_amount is in paise.
--   plan payment, full refund   -> payment 'refunded'; if it was the firm's latest paid period, the plan ends today (same as "End plan now")
--   listing fee, full refund    -> order 'refunded'; the listing is taken down (paid_at cleared); the partner commission is reversed or flagged by trigger
--   partial refund              -> amount recorded only; nothing is switched off
create or replace function public.apply_refund(p_payment_id text, p_refund_id text, p_amount integer) returns text
language plpgsql security definer set search_path = '' as $$
declare pay public.payments; ord public.directory_orders; latest uuid; yday text := to_char((now() at time zone 'Asia/Kolkata')::date - 1, 'YYYY-MM-DD');
begin
  select * into pay from public.payments where gateway_payment_id = p_payment_id for update;
  if found then
    if pay.status = 'refunded' then return 'already'; end if;
    if pay.status <> 'paid' then return 'not_paid'; end if;
    if p_amount < pay.amount_paise then update public.payments set refund_paise = coalesce(refund_paise, 0) + p_amount, refund_id = p_refund_id where id = pay.id; return 'partial'; end if;
    update public.payments set status = 'refunded', refunded_at = now(), refund_id = p_refund_id, refund_paise = p_amount where id = pay.id;
    select id into latest from public.payments where firm_id = pay.firm_id and status = 'paid' order by paid_at desc nulls last limit 1;
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
end $$;
revoke execute on function public.apply_refund(text, text, integer) from public, anon, authenticated;
grant execute on function public.apply_refund(text, text, integer) to service_role;

-- Core admin actions leave a trail: who, what, which record, before/after.
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor text not null, action text not null, target text not null default '', detail jsonb not null default '{}'::jsonb, at timestamptz not null default now()
);
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);
alter table public.admin_audit_log enable row level security;   -- no policies: the admin function (service role) only
revoke all on public.admin_audit_log from anon, authenticated;
create or replace function public.admin_audit_immutable() returns trigger language plpgsql as $$ begin raise exception 'The admin audit log is append-only.'; end $$;
drop trigger if exists admin_audit_no_change on public.admin_audit_log;
create trigger admin_audit_no_change before update or delete on public.admin_audit_log for each row execute function public.admin_audit_immutable();

-- Legal Staff — remaining audit items that need no business decision (22 Nov 2026). Re-runnable; changes no customer data.
--  1. Partner network: click flooding per code, first-touch attribution enforced on the server, an override also reverses an approved commission
--     (or refuses while it sits in a payout), KYC cannot be marked verified without a PAN and a bank proof.
--  2. After a plan has ended (a subscription row exists and firm_access is false): drafts/notes (user_state), team chat messages and chat files
--     become read-only too, like practice records. A firm that never started a plan is not locked, so onboarding is unaffected.
--  3. "Delete firm data" also removes team chat and court-case records.

create or replace function public.ps_text(k text) returns text language sql stable security definer set search_path = public, pg_temp as $$ select (select value #>> '{}' from public.partner_settings where key = k) $$;

create or replace function public.partner_track_click(p_code text, p_visitor text, p_campaign uuid default null, p_source text default '') returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare p public.partners;
begin
  if p_visitor is null or length(p_visitor) < 16 or length(p_visitor) > 64 or not public.partner_validate_code(p_code) then return false; end if;
  if not public.ps_rate('click:' || p_visitor, 30, interval '1 hour') then return false; end if;
  if not public.ps_rate('clickcode:' || upper(btrim(p_code)), 400, interval '1 hour') then return false; end if;   -- rotating visitor tokens cannot inflate one partner's clicks without limit
  select * into p from public.partners where code = upper(btrim(p_code));
  if exists (select 1 from public.partner_referrals where partner_id = p.id and visitor_token = p_visitor and landed_at > now() - interval '30 minutes') then return true; end if;
  insert into public.partner_referrals (partner_id, code, visitor_token, campaign_id, source) values (p.id, p.code, p_visitor, p_campaign, left(coalesce(p_source, ''), 60));
  return true;
end $$;
create or replace function public.admin_attribution_override(p_id uuid, p_note text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare t public.referral_attributions;
begin
  perform public.ps_require('referrals.manage');
  if length(btrim(coalesce(p_note, ''))) < 5 then raise exception 'Give a reason for the override.'; end if;
  if exists (select 1 from public.partner_commissions where attribution_id = p_id and payout_id is not null and status in ('approved', 'payable')) then raise exception 'This commission is already in a payout. Put the payout on hold first.'; end if;
  update public.referral_attributions set status = 'overridden', reason = p_note where id = p_id and status = 'valid' returning * into t;
  if not found then raise exception 'Attribution not found or not valid.'; end if;
  update public.partner_commissions set status = 'rejected', status_reason = 'Attribution overridden: ' || p_note, updated_at = now() where attribution_id = p_id and status in ('pending_attribution', 'pending_payment', 'pending_verification', 'eligible', 'approved', 'payable', 'on_hold');
  perform public.ps_audit('attribution.overridden', 'attribution', p_id::text, jsonb_build_object('note', p_note));
end $$;
create or replace function public.admin_partner_update(p_id uuid, p jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.manage');
  if p ? 'category_key' and not exists (select 1 from public.partner_categories where key = p ->> 'category_key') then raise exception 'Unknown category.'; end if;
  if p ->> 'kyc_status' = 'verified' and (select kyc_status from public.partners where id = p_id) <> 'verified' and not (
       exists (select 1 from public.partner_documents d where d.partner_id = p_id and d.kind = 'pan' and d.status <> 'rejected')
   and exists (select 1 from public.partner_documents d where d.partner_id = p_id and d.kind = 'bank_proof' and d.status <> 'rejected')) then
    raise exception 'KYC cannot be verified until the partner has uploaded a PAN and a bank proof.'; end if;
  update public.partners set name = coalesce(nullif(btrim(p ->> 'name'), ''), name), mobile = coalesce(nullif(btrim(p ->> 'mobile'), ''), mobile), state = coalesce(nullif(btrim(p ->> 'state'), ''), state),
    district = coalesce(nullif(btrim(p ->> 'district'), ''), district), city = coalesce(nullif(btrim(p ->> 'city'), ''), city), organisation = coalesce(p ->> 'organisation', organisation),
    designation = coalesce(p ->> 'designation', designation), category_key = coalesce(p ->> 'category_key', category_key),
    kyc_status = coalesce(case when p ->> 'kyc_status' in ('none', 'submitted', 'verified', 'rejected') then p ->> 'kyc_status' end, kyc_status) where id = p_id;
  if not found then raise exception 'Partner not found.'; end if;
  perform public.ps_audit('partner.updated', 'partner', p_id::text, p);
end $$;
create or replace function public.ps_attribute_application(p_app text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.directory_applications; p public.partners; c public.partner_categories; t public.partner_referrals; win int; st text := 'valid'; why text := ''; verified boolean := false;
  aid uuid; recent int;
begin
  select * into a from public.directory_applications where id = p_app;
  if not found or btrim(coalesce(a.referral_code, '')) = '' then return; end if;
  if not public.ps_flag('network_enabled') or not public.ps_flag('referral_tracking') then return; end if;
  if exists (select 1 from public.referral_attributions where application_id = p_app) then return; end if;
  win := coalesce(public.ps_int('attribution_window_days'), 30);
  if coalesce(public.ps_text('attribution_rule'), 'first_touch') = 'first_touch' and coalesce(btrim(a.visitor_token), '') <> '' then
    -- first touch: the partner whose link this visitor opened first inside the window keeps the credit, whatever code was typed later
    select pr.* into p from public.partner_referrals r join public.partners pr on pr.id = r.partner_id
      where r.visitor_token = a.visitor_token and r.landed_at >= now() - make_interval(days => win) order by r.landed_at limit 1;
  end if;
  if p.id is null then select * into p from public.partners where code = upper(btrim(a.referral_code)); end if;
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
  values (p_app, p.id, p.code, p.category_key, t.id, verified, st, why, case when verified then t.landed_at + make_interval(days => win) end) returning id into aid;
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

-- 2 ---------------------------------------------------------------------------------------------------------------
create or replace function public.firm_locked(f uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subscriptions s where s.firm_id = f) and not public.firm_access(f);
$$;
revoke execute on function public.firm_locked(uuid) from public, anon;
grant execute on function public.firm_locked(uuid) to authenticated;

drop policy if exists user_state_all on public.user_state;
drop policy if exists user_state_select on public.user_state;
drop policy if exists user_state_delete on public.user_state;
drop policy if exists user_state_insert on public.user_state;
drop policy if exists user_state_update on public.user_state;
create policy user_state_select on public.user_state for select to authenticated using (user_id = (select auth.uid()) and public.is_member(firm_id));
create policy user_state_delete on public.user_state for delete to authenticated using (user_id = (select auth.uid()) and public.is_member(firm_id));
create policy user_state_insert on public.user_state for insert to authenticated with check (user_id = (select auth.uid()) and public.is_member(firm_id) and not public.firm_locked(firm_id));
create policy user_state_update on public.user_state for update to authenticated using (user_id = (select auth.uid()) and public.is_member(firm_id)) with check (user_id = (select auth.uid()) and public.is_member(firm_id) and not public.firm_locked(firm_id));

drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages for insert to authenticated with check (sender = (select auth.uid()) and public.chat_can(firm_id, channel) and not public.firm_locked(firm_id));
create or replace function public.chat_write_ok(p text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.chat_path_ok(p) and case when (storage.foldername(p))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then not public.firm_locked(((storage.foldername(p))[1])::uuid) else false end
$$;
grant execute on function public.chat_write_ok(text) to authenticated;
drop policy if exists chat_files_write on storage.objects;
create policy chat_files_write on storage.objects for insert to authenticated with check (bucket_id = 'chat' and public.chat_write_ok(name));

-- 3 ---------------------------------------------------------------------------------------------------------------
create or replace function public.erase_firm_data(f uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_owner(f) then raise exception 'Only the firm owner can delete the firm''s data.' using errcode = '42501'; end if;
  delete from public.records where firm_id = f;
  get diagnostics n = row_count;
  delete from public.user_state where firm_id = f;
  delete from public.notifications where firm_id = f;
  delete from public.chat_messages where firm_id = f;   -- reactions go with their messages
  delete from public.chat_reads where firm_id = f;
  delete from public.legal_cases where firm_id = f;     -- case parties, hearings, orders, documents and snapshots follow
  update public.firms set state = '{}'::jsonb where id = f;
  return n;
end $$;
revoke execute on function public.erase_firm_data(uuid) from public, anon;
grant execute on function public.erase_firm_data(uuid) to authenticated;

-- 4 ---------------------------------------------------------------------------------------------------------------
-- Advocates are emailed about new contact requests (directory-verify sweep). Enquiries that already exist are marked as told, so deploying this
-- does not send a burst of old news; only requests that arrive from now on are announced.
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'directory_enquiries' and column_name = 'notified_at') then
    alter table public.directory_enquiries add column notified_at timestamptz;
    update public.directory_enquiries set notified_at = now();
  end if;
end $$;
create index if not exists directory_enquiries_unnotified_idx on public.directory_enquiries (created_at) where notified_at is null;

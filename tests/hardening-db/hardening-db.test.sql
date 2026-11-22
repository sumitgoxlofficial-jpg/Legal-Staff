-- Checks for migration 0044 (audit fixes) on real PostgreSQL, on top of the real core, directory and partner-network migrations.
\set ON_ERROR_STOP 0
set client_min_messages = warning;
create schema t; create table t.r (ok boolean, name text); grant usage on schema t to public; grant all on t.r to public;
create function t.a(q text, n text) returns void language plpgsql security definer as $$ declare b boolean; begin begin execute 'select (' || q || ')' into b; exception when others then b := false; insert into t.r values (false, n || ' [error: ' || sqlerrm || ']'); return; end; insert into t.r values (coalesce(b, false), n); end $$;
create function t.as_user(uid uuid, em text) returns void language plpgsql as $$ begin perform set_config('test.uid', coalesce(uid::text, ''), false); perform set_config('test.jwt', case when em is null then '' else jsonb_build_object('email', em)::text end, false); end $$;
create function t.raises(q text, pat text, n text) returns void language plpgsql as $$ declare m text; begin begin execute q; m := null; exception when others then m := sqlerrm; end; insert into t.r values (m is not null and m like pat, n || coalesce(' [got: ' || m || ']', ' [no error]')); end $$;
create function t.ok(q text, n text) returns void language plpgsql as $$ declare m text; begin begin execute q; m := null; exception when others then m := sqlerrm; end; insert into t.r values (m is null, n || coalesce(' [error: ' || m || ']', '')); end $$;
create function t.cnt(q text) returns bigint language plpgsql security definer as $$ declare n bigint; begin execute q into n; return n; end $$;
create function t.code() returns text language sql security definer as $$ select code from public.partners limit 1 $$;
grant execute on all functions in schema t to public;

insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'asha@example.in', now()), ('00000000-0000-0000-0000-0000000000a0', 'owner@legalstaff.test', now()), ('00000000-0000-0000-0000-00000000000b', 'bina@example.in', now());
insert into public.super_admins (email) values ('owner@legalstaff.test') on conflict do nothing;
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set O '''00000000-0000-0000-0000-0000000000a0'''

-- ===== 1. nobody becomes a hidden administrator by creating a firm =====
set role authenticated; select t.as_user(:A, 'asha@example.in');
select public.create_firm('Rao Chambers', 'Patna', 'x', 'Partner', 'Asha Rao');
select t.a($q$not public.is_platform_admin()$q$, 'the first firm creator is not a platform admin');
select t.a($q$not public.is_super_admin()$q$, 'a normal user is not a super admin');
select t.raises($q$select public.directory_decide('X', 'verified', '')$q$, '%not allowed%', 'a normal user cannot decide a directory application');
reset role;
select t.a($q$t.cnt('select count(*) from public.platform_admins') = 0$q$, 'create_firm wrote nothing to platform_admins');
set role authenticated; select t.as_user(:O, 'owner@legalstaff.test');
select t.a($q$public.is_platform_admin()$q$, 'a real super admin still passes is_platform_admin');
reset role;

-- ===== 2. the legacy anon rewrite path is closed =====
set role anon; select t.as_user(null, null);
select t.raises($q$select public.directory_resubmit('APP-A1', 'D/1/2016', 'x', 'c', '2016', 'c', 'e', 'm', '{}')$q$, '%permission denied%', 'anon cannot call directory_resubmit');
reset role;
set role authenticated; select t.as_user(:A, 'asha@example.in');
select t.raises($q$select public.directory_resubmit('APP-A1', 'D/1/2016', 'x', 'c', '2016', 'c', 'e', 'm', '{}')$q$, '%permission denied%', 'a signed-in user cannot call directory_resubmit');
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, user_id) values ('APP-A1', 'Asha Rao', 'D/1234/2016', 'Bar Council of Delhi', '2016', 'Delhi', 'asha@example.in', '9876543210', :A);
reset role;
update public.directory_applications set paid_at = now(), status = 'info', note = 'secret moderator note' where id = 'APP-A1';
set role anon;
select t.a($q$(select count(*) from public.directory_status('APP-A1', 'D/1234/2016')) = 0$q$, 'directory_status no longer answers for signed-in applications (and never returns the note)');
reset role;

-- ===== 3. input limits, formats, duplicates =====
set role authenticated; select t.as_user(:B, 'bina@example.in');
select t.raises($q$insert into public.directory_applications (id, name, enr, council, year, city, user_id) values ('x" onfocus="alert(1)', 'Bina', 'D/9/2010', 'c', '2010', 'c', '00000000-0000-0000-0000-00000000000b')$q$, '%dir_app_id_fmt%', 'an application id cannot carry markup');
select t.raises($q$insert into public.directory_applications (id, name, enr, council, year, city, user_id) values ('APP-B1', 'Bina', 'D-1234-2016', 'c', '2016', 'c', '00000000-0000-0000-0000-00000000000b')$q$, '%directory_enr_norm_idx%', 'the same enrolment number written differently is a duplicate');
select t.ok($q$insert into public.directory_applications (id, name, enr, council, year, city, user_id) values ('APP-B2', 'Bina', 'D/777/2010', 'c', '2010', 'c', '00000000-0000-0000-0000-00000000000b')$q$, 'a different enrolment number is accepted');
reset role;
update public.directory_applications set paid_at = now(), status = 'verified' where id = 'APP-B2';
set role anon; select t.as_user(null, null);
select t.ok($q$insert into public.directory_enquiries (application_id, name, message) values ('APP-B2', 'Client', 'Need help')$q$, 'anon can contact a listed advocate');
select t.raises($q$insert into public.directory_enquiries (application_id, name, message) values ('NOPE', 'Client', 'x')$q$, '%row-level security%', 'anon cannot send an enquiry to a profile that is not listed');
select t.raises($q$insert into public.directory_enquiries (application_id, name, message) values ('APP-B2', 'Client', repeat('x', 5000))$q$, '%dir_enq_len%', 'an oversized enquiry is rejected');
select t.raises($q$insert into public.directory_enquiries (application_id, name, message, replied_at) values ('APP-B2', 'Client', 'x', now())$q$, '%row-level security%', 'an enquiry cannot arrive pre-marked as replied');
do $$ declare i int; begin for i in 1..40 loop begin insert into public.directory_enquiries (application_id, name, message) values ('APP-B2', 'Spam ' || i, 'x'); exception when others then perform t.raises('select 1/0', '%', 'x'); delete from t.r where name = 'x'; insert into t.r values (sqlerrm like '%Too many%', 'enquiry flood is stopped by the per-profile hourly limit (stopped at row ' || i || ')'); exit; end; end loop; end $$;
select t.ok($q$insert into public.contact_requests (name, email, message) values ('Visitor', 'v@example.in', 'Hello')$q$, 'a normal contact request is accepted');
select t.raises($q$insert into public.contact_requests (name, email, message, status, reply, ai_replied) values ('Visitor', 'v@example.in', 'Hello', 'replied', 'done', true)$q$, '%row-level security%', 'a contact request cannot arrive pre-answered');
select t.raises($q$insert into public.profile_reports (application_id, reason) values ('NOPE', 'spam')$q$, '%row-level security%', 'a report needs a listed profile');
reset role;

-- ===== 4. refunds reverse a commission that has not been paid out =====
select t.a($q$exists (select 1 from pg_constraint where conname = 'directory_orders_status_check' and pg_get_constraintdef(oid) like '%refunded%')$q$, 'a listing order can be marked refunded');
select t.a($q$exists (select 1 from pg_constraint where conname = 'payments_status_check' and pg_get_constraintdef(oid) like '%refunded%')$q$, 'a plan payment can be marked refunded');
select t.a($q$t.cnt('select count(*) from pg_trigger where tgname = ''ps_order_refund''') = 1$q$, 'the refund trigger is installed');
select t.a($q$not has_table_privilege('anon', 'public.payment_events', 'select') and not has_table_privilege('authenticated', 'public.payment_events', 'select')$q$, 'the payment event ledger is not readable by browsers');

-- ===== 5. partner network: self-referral through the same login, deletion of referred applications =====
set role authenticated; select t.as_user(:A, 'asha@example.in');
select public.partner_apply('{"name":"Asha Rao","mobile":"9876500001","state":"Bihar","district":"Patna","city":"Patna","category_key":"campus_ambassador","organisation":"NLU Patna","accept_terms":true,"accept_privacy":true}');
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, user_id, referral_code, visitor_token) values ('APP-SELF', 'Asha Again', 'D/5555/2018', 'c', '2018', 'c', 'other@example.in', '9000000099', :A, t.code(), 'tok');
reset role;
select t.a($q$(select count(*) from public.partners where status = 'approved') = 1$q$, 'fixture: the partner is approved');
select t.a($q$(select status from public.referral_attributions where application_id = 'APP-SELF') = 'rejected_self'$q$, 'a partner registering a listing from their own login is a self-referral even with other contact details');
select t.a($q$exists (select 1 from public.partner_fraud_flags where kind = 'self_referral')$q$, 'the self-referral raised a fraud flag');
select t.ok($q$delete from public.directory_applications where id = 'APP-SELF'$q$, 'a referred application can be deleted (erasure requests) without tripping the attribution lock');
select t.a($q$(select count(*) from public.referral_attributions where application_id is null) = 1$q$, 'the attribution record is kept, detached from the deleted application');

-- ===== 6. refunds and promo claims (the functions the Razorpay webhook and the admin Refund button call) =====
create function t.as_service() returns void language sql as $$ select 1 $$;
insert into public.firms (id, name, city, address, created_by) values ('11111111-1111-1111-1111-111111111111', 'Refund Firm', 'Delhi', 'x', :A) on conflict do nothing;
insert into public.subscriptions (firm_id, plan, cycle, status, since, renews) values ('11111111-1111-1111-1111-111111111111', 'Professional', 'monthly', 'active', current_date - 3, current_date + 27);
insert into public.payments (firm_id, user_id, plan, cycle, amount_paise, gateway_order_id, gateway_payment_id, status, paid_at) values ('11111111-1111-1111-1111-111111111111', :A, 'Professional', 'monthly', 79900, 'order_X', 'pay_X', 'paid', now());
set role anon; select t.raises($q$select public.apply_refund('pay_X', 'rf1', 79900)$q$, '%permission denied%', 'anon cannot apply a refund');
reset role; set role authenticated; select t.as_user(:A, 'asha@example.in'); select t.raises($q$select public.apply_refund('pay_X', 'rf1', 79900)$q$, '%permission denied%', 'a signed-in user cannot apply a refund'); select t.raises($q$select public.promo_claim('X')$q$, '%permission denied%', 'a signed-in user cannot claim promo codes'); reset role;
set role service_role;
select t.a($q$public.apply_refund('pay_X', 'rf1', 10000) = 'partial'$q$, 'a partial refund is recorded and switches nothing off');
select t.a($q$(select status from public.payments where gateway_payment_id = 'pay_X') = 'paid' and (select renews from public.subscriptions where firm_id = '11111111-1111-1111-1111-111111111111') > current_date$q$, 'after a partial refund the payment is still paid and the plan still runs');
select t.a($q$public.apply_refund('pay_X', 'rf2', 79900) = 'plan_refunded'$q$, 'a full refund of the latest plan payment is applied');
select t.a($q$(select status from public.payments where gateway_payment_id = 'pay_X') = 'refunded' and (select renews from public.subscriptions where firm_id = '11111111-1111-1111-1111-111111111111') < (now() at time zone 'Asia/Kolkata')::date$q$, 'the refunded plan payment is marked refunded and the plan ends');
select t.a($q$public.apply_refund('pay_X', 'rf2', 79900) = 'already'$q$, 'the same refund twice is a no-op');
select t.a($q$public.apply_refund('pay_NOPE', 'rf9', 100) = 'unmatched'$q$, 'a refund for a payment we never took is reported as unmatched');
reset role;
-- a listing fee: refund takes the profile down
update public.directory_applications set paid_at = now(), order_no = 'order_L1', status = 'verified' where id = 'APP-B2';
insert into public.directory_orders (application_id, user_id, order_no, amount_paise, status, utr, paid_at) values ('APP-B2', :B, 'order_L1', 4900, 'paid', 'pay_L1', now());
set role service_role;
select t.a($q$public.apply_refund('pay_L1', 'rf3', 4900) = 'listing_refunded'$q$, 'a full refund of a listing fee is applied');
select t.a($q$(select paid_at from public.directory_applications where id = 'APP-B2') is null$q$, 'a refunded listing is taken down (no paid benefit without a payment)');
reset role;
-- promo claims: limits are atomic
insert into public.promo_codes (code, percent_off, max_uses, once_per_firm) values ('ONCE1', 100, 1, true), ('MANY', 100, 3, true);
set role service_role;
select t.a($q$public.promo_claim('ONCE1', '11111111-1111-1111-1111-111111111111', null)$q$, 'the first claim of a single-use code succeeds');
select t.a($q$not public.promo_claim('ONCE1', '22222222-2222-2222-2222-222222222222', null)$q$, 'the second claim of a single-use code fails');
select t.a($q$public.promo_claim('MANY', '11111111-1111-1111-1111-111111111111', null)$q$, 'a multi-use code can be claimed by a firm');
select t.a($q$(select uses from public.promo_codes where code = 'MANY') = 1$q$, 'the claim counted the use');
select t.a($q$not public.promo_claim('NOSUCH', null, '00000000-0000-0000-0000-00000000000a')$q$, 'an unknown code cannot be claimed');
reset role;

-- ===== 7. core app: owner row, firm profile, chat meeting cards =====
update public.subscriptions set renews = current_date + 30 where firm_id = '11111111-1111-1111-1111-111111111111';
insert into public.members (firm_id, user_id, email, name, role, status, is_owner) values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 'asha@example.in', 'Asha', 'Partner', 'Active', true), ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 'bina@example.in', 'Bina', 'Associate', 'Active', false);
set role authenticated; select t.as_user(:B, 'bina@example.in');
select t.raises($q$update public.firms set name = 'Hijacked' where id = '11111111-1111-1111-1111-111111111111'$q$, '%Only the firm owner%', 'a member cannot rename the firm or change its GSTIN');
select t.raises($q$update public.firms set gstin = '07AAAAA0000A1Z5' where id = '11111111-1111-1111-1111-111111111111'$q$, '%Only the firm owner%', 'a member cannot change the GSTIN printed on invoices');
select t.ok($q$update public.firms set state = '{"labels":[]}'::jsonb where id = '11111111-1111-1111-1111-111111111111'$q$, 'a member can still write the shared working state');
update public.members set is_owner = true where user_id = '00000000-0000-0000-0000-00000000000b';
reset role;
select t.a($q$t.cnt('select count(*) from public.members where is_owner and user_id = ''00000000-0000-0000-0000-00000000000b''') = 0$q$, 'a member cannot make themselves owner');
set role authenticated; select t.as_user(:A, 'asha@example.in');
select t.ok($q$update public.firms set name = 'Rao & Rao Chambers' where id = '11111111-1111-1111-1111-111111111111'$q$, 'the owner can rename the firm');
select t.raises($q$update public.members set status = 'Suspended' where user_id = '00000000-0000-0000-0000-00000000000a'$q$, '%owner cannot be suspended%', 'the owner cannot suspend themselves (firm lock-out)');
select t.raises($q$update public.members set is_owner = false where user_id = '00000000-0000-0000-0000-00000000000a'$q$, '%owner cannot be suspended%', 'the owner cannot clear their own ownership (second trial)');
select t.ok($q$update public.members set name = 'Asha R.', title = 'Adv.' where user_id = '00000000-0000-0000-0000-00000000000a'$q$, 'the owner can still edit their own name and title');
select t.ok($q$insert into public.chat_messages (firm_id, channel, body, kind, data) values ('11111111-1111-1111-1111-111111111111', 'team', 'Hearing prep', 'meeting', '{"link":"https://meet.google.com/abc-defg-hij","start":"2026-12-01T10:00:00.000Z"}')$q$, 'a proper Google Meet card is accepted');
select t.raises($q$insert into public.chat_messages (firm_id, channel, body, kind, data) values ('11111111-1111-1111-1111-111111111111', 'team', 'x', 'meeting', '{"link":"javascript:alert(1)","start":"2026-12-01T10:00:00.000Z"}')$q$, '%chat_meeting_check%', 'a meeting card with a javascript: link is rejected');
select t.raises($q$insert into public.chat_messages (firm_id, channel, body, kind, data) values ('11111111-1111-1111-1111-111111111111', 'team', 'x', 'meeting', '{"link":"https://evil.example/meet.google.com/abc","start":"2026-12-01T10:00:00.000Z"}')$q$, '%chat_meeting_check%', 'a meeting card pointing at another site is rejected');
select t.raises($q$insert into public.chat_messages (firm_id, channel, body, kind, data) values ('11111111-1111-1111-1111-111111111111', 'team', 'x', 'meeting', '{"link":"https://meet.google.com/abc-defg-hij"}')$q$, '%chat_meeting_check%', 'a meeting card without a start time is rejected');
reset role;

-- ===== 8. remaining audit items (migration 0046) =====
insert into auth.users values ('00000000-0000-0000-0000-00000000000c', 'chitra@example.in', now());
\set C '''00000000-0000-0000-0000-00000000000c'''
create function t.codes() returns text[] language sql security definer as $$ select array_agg(code order by created_at) from public.partners $$;
create function t.attr(a text) returns uuid language sql security definer as $$ select id from public.referral_attributions where application_id = a $$;
create function t.pid(c text) returns uuid language sql security definer as $$ select id from public.partners where code = c $$;
set role authenticated; select t.as_user(:C, 'chitra@example.in');
select public.partner_apply('{"name":"Chitra Nair","mobile":"9876500002","state":"Kerala","district":"Kochi","city":"Kochi","category_key":"campus_ambassador","organisation":"NLU Kochi","accept_terms":true,"accept_privacy":true}');
reset role;
select t.a($q$array_length(t.codes(), 1) = 2$q$, 'fixture: two approved partners');

-- 8a. first touch: the visitor opened partner 1's link first, then partner 2's; a listing typed with partner 2's code is still credited to partner 1
set role anon; select t.as_user(null, null);
select public.partner_track_click((t.codes())[1], 'ft-visitor-token-0001');
select public.partner_track_click((t.codes())[2], 'ft-visitor-token-0001');
reset role;
set role authenticated; select t.as_user(:B, 'bina@example.in');
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, user_id, referral_code, visitor_token) values ('APP-FT', 'Bina First', 'D/8888/2019', 'c', '2019', 'c', 'bina.ft@example.in', '9000000123', :B, (t.codes())[2], 'ft-visitor-token-0001');
reset role;
select t.a($q$(select p.code from public.referral_attributions r join public.partners p on p.id = r.partner_id where r.application_id = 'APP-FT') = (t.codes())[1]$q$, 'first touch: the partner whose link was opened first keeps the credit');
select t.a($q$(select r.code from public.referral_attributions r where r.application_id = 'APP-FT') = (t.codes())[1]$q$, 'the attribution records the credited partner''s code, not the one typed');

-- 8b. click flooding
set role anon; select t.as_user(null, null);
do $$ declare i int; begin for i in 1..430 loop perform public.partner_track_click((t.codes())[1], 'flood-token-' || lpad(i::text, 8, '0'), null, ''); end loop; end $$;
reset role;
select t.a($q$t.cnt('select count(*) from public.partner_referrals where visitor_token like ''flood-token-%''') <= 400$q$, 'one referral code cannot collect more than 400 clicks an hour whatever visitor tokens are used');
select t.a($q$t.cnt('select count(*) from public.partner_referrals where visitor_token like ''flood-token-%''') > 300$q$, 'normal traffic below the limit is still recorded');

-- 8c. KYC needs documents; an override also reverses an approved commission
set role authenticated; select t.as_user(:O, 'owner@legalstaff.test');
select t.raises($q$select public.admin_partner_update(t.pid((t.codes())[1]), '{"kyc_status":"verified"}'::jsonb)$q$, '%PAN and a bank proof%', 'KYC cannot be marked verified with no documents');
reset role;
insert into public.partner_documents (partner_id, user_id, kind, storage_path, file_name, size_bytes) select id, user_id, 'pan', 'x/pan.pdf', 'pan.pdf', 10 from public.partners where code = (t.codes())[1];
insert into public.partner_documents (partner_id, user_id, kind, storage_path, file_name, size_bytes) select id, user_id, 'bank_proof', 'x/bank.pdf', 'bank.pdf', 10 from public.partners where code = (t.codes())[1];
set role authenticated; select t.as_user(:O, 'owner@legalstaff.test');
select t.ok($q$select public.admin_partner_update(t.pid((t.codes())[1]), '{"kyc_status":"verified"}'::jsonb)$q$, 'KYC can be verified once a PAN and a bank proof are on file');
reset role;
insert into public.partner_commissions (partner_id, attribution_id, application_id, category_key, amount_paise, status) select r.partner_id, r.id, 'APP-FT', r.category_key, 1500, 'approved' from public.referral_attributions r where r.application_id = 'APP-FT' on conflict (attribution_id) do update set status = 'approved';
set role authenticated; select t.as_user(:O, 'owner@legalstaff.test');
select t.ok($q$select public.admin_attribution_override(t.attr('APP-FT'), 'testing the override of an approved commission')$q$, 'a Super Admin can override an attribution');
reset role;
select t.a($q$(select status from public.partner_commissions where application_id = 'APP-FT') = 'rejected'$q$, 'overriding the attribution also rejects its approved commission');


-- 8d. after a plan has ended, drafts and chat are read-only too; a firm that never had a plan is not locked
insert into public.firms (id, name, city, address, created_by) values ('33333333-3333-3333-3333-333333333333', 'No-plan Firm', 'Delhi', 'x', :C);
insert into public.members (firm_id, user_id, email, name, role, status, is_owner) values ('33333333-3333-3333-3333-333333333333', :C, 'chitra@example.in', 'Chitra', 'Partner', 'Active', true);
set role authenticated; select t.as_user(:C, 'chitra@example.in');
select t.ok($q$insert into public.user_state (user_id, firm_id, data) values ('00000000-0000-0000-0000-00000000000c', '33333333-3333-3333-3333-333333333333', '{"settings":{}}')$q$, 'a firm that has not started a plan can still save its settings (onboarding is not locked)');
reset role;
update public.subscriptions set renews = current_date - 5 where firm_id = '11111111-1111-1111-1111-111111111111';
set role authenticated; select t.as_user(:A, 'asha@example.in');
select t.a($q$(select public.firm_locked('11111111-1111-1111-1111-111111111111'))$q$, 'a firm whose plan has ended is locked');
select t.raises($q$insert into public.user_state (user_id, firm_id, data) values ('00000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', '{}')$q$, '%row-level security%', 'after the plan ended, drafts and notes cannot be written');
select t.raises($q$insert into public.chat_messages (firm_id, channel, body) values ('11111111-1111-1111-1111-111111111111', 'team', 'still chatting')$q$, '%row-level security%', 'after the plan ended, new chat messages cannot be sent');
select t.a($q$(select count(*) from public.chat_messages where firm_id = '11111111-1111-1111-1111-111111111111') >= 1$q$, 'after the plan ended, existing chat messages can still be read');
reset role;
update public.subscriptions set renews = current_date + 30 where firm_id = '11111111-1111-1111-1111-111111111111';
set role authenticated; select t.as_user(:A, 'asha@example.in');
select t.ok($q$insert into public.user_state (user_id, firm_id, data) values ('00000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', '{}')$q$, 'with a running plan, drafts and notes are written as usual');
reset role;

-- 8e. "Delete firm data" also clears team chat and court-case records
insert into public.legal_cases (firm_id, record_id, cnr) values ('11111111-1111-1111-1111-111111111111', 'c1', 'DLHC010000012024');
set role authenticated; select t.as_user(:A, 'asha@example.in');
select t.ok($q$select public.erase_firm_data('11111111-1111-1111-1111-111111111111')$q$, 'the owner can delete the firm data');
reset role;
select t.a($q$t.cnt('select count(*) from public.chat_messages where firm_id = ''11111111-1111-1111-1111-111111111111''') = 0$q$, 'team chat is gone after delete firm data');
select t.a($q$t.cnt('select count(*) from public.legal_cases where firm_id = ''11111111-1111-1111-1111-111111111111''') = 0$q$, 'court-case records are gone after delete firm data');

select t.a($q$exists (select 1 from information_schema.columns where table_name = 'directory_enquiries' and column_name = 'notified_at')$q$, 'enquiries carry a notified_at marker for the advocate email');
select t.a($q$t.cnt('select count(*) from public.directory_enquiries where notified_at is null') > 0$q$, 'enquiries created after the migration are waiting to be announced');

-- ===== 9. only verified, paid profiles are public (migration 0047) =====
insert into public.directory_applications (id, name, enr, council, year, city, user_id, paid_at, status) values
  ('APP-V-OK', 'Verified Paid', 'D/3001/2015', 'c', '2015', 'Delhi', :A, now(), 'verified'),
  ('APP-V-UNPAID', 'Verified Unpaid', 'D/3002/2015', 'c', '2015', 'Delhi', :A, null, 'verified'),
  ('APP-PAID-PENDING', 'Paid Not Checked', 'D/3003/2015', 'c', '2015', 'Delhi', :A, now(), 'pending'),
  ('APP-PAID-INFO', 'Paid Needs Info', 'D/3004/2015', 'c', '2015', 'Delhi', :A, now(), 'info');
set role anon; select t.as_user(null, null);
select t.a($q$exists (select 1 from public.directory_profiles() where id = 'APP-V-OK')$q$, 'a paid, verified profile is in the public directory');
select t.a($q$not exists (select 1 from public.directory_profiles() where id = 'APP-PAID-PENDING')$q$, 'a paid profile whose documents have not been checked is NOT public');
select t.a($q$not exists (select 1 from public.directory_profiles() where id = 'APP-PAID-INFO')$q$, 'a paid profile that needs more information is NOT public');
select t.a($q$not exists (select 1 from public.directory_profiles() where id = 'APP-V-UNPAID')$q$, 'a verified profile that has not paid is NOT public');
select t.a($q$(select bool_and(verified) from public.directory_profiles())$q$, 'every public profile carries the verified flag');
select t.ok($q$insert into public.directory_enquiries (application_id, name, message) values ('APP-V-OK', 'Client', 'Hello')$q$, 'a client can contact a verified, paid advocate');
select t.raises($q$insert into public.directory_enquiries (application_id, name, message) values ('APP-PAID-PENDING', 'Client', 'Hello')$q$, '%row-level security%', 'nobody can send client enquiries to an unverified profile');
select t.raises($q$insert into public.profile_reports (application_id, reason) values ('APP-PAID-PENDING', 'x')$q$, '%row-level security%', 'an unverified profile is not a public target for reports either');
reset role;
update public.directory_applications set status = 'verified' where id = 'APP-PAID-PENDING';
set role anon; select t.as_user(null, null);
select t.a($q$exists (select 1 from public.directory_profiles() where id = 'APP-PAID-PENDING')$q$, 'once the check passes, the profile goes live with no other step');
reset role;
update public.directory_applications set paid_at = null where id = 'APP-PAID-PENDING';
set role anon; select t.as_user(null, null);
select t.a($q$not exists (select 1 from public.directory_profiles() where id = 'APP-PAID-PENDING')$q$, 'a refunded (unpaid) profile disappears again');
reset role;
-- the advocate still sees their own unlisted application
set role authenticated; select t.as_user(:A, 'asha@example.in');
select t.a($q$exists (select 1 from public.directory_my_applications() where id = 'APP-PAID-INFO')$q$, 'an advocate still sees their own unlisted application and its status');
reset role;

-- ===== 10. team roles are enforced in the database (migration 0048) =====
update public.subscriptions set renews = current_date + 30 where firm_id = '11111111-1111-1111-1111-111111111111';
insert into public.members (firm_id, user_id, email, name, role, status, is_owner) values ('11111111-1111-1111-1111-111111111111', :C, 'chitra@example.in', 'Chitra', 'Intern', 'Active', false) on conflict do nothing;
insert into public.records (firm_id, kind, id, data) values
  ('11111111-1111-1111-1111-111111111111', 'case', 'c-role', '{}'), ('11111111-1111-1111-1111-111111111111', 'task', 't-role', '{}'),
  ('11111111-1111-1111-1111-111111111111', 'invoice', 'i-role', '{}'), ('11111111-1111-1111-1111-111111111111', 'log', 'l-role', '{}'), ('11111111-1111-1111-1111-111111111111', 'log', 'l-role2', '{}');
select t.a($q$(select public.member_tier('11111111-1111-1111-1111-111111111111')) is null or true$q$, 'tier function exists');
-- the Associate (Bina, role "Associate"): works, but cannot delete cases, clients or invoices
set role authenticated; select t.as_user(:B, 'bina@example.in');
select t.a($q$public.member_tier('11111111-1111-1111-1111-111111111111') = 'working'$q$, 'an Associate is a working member');
select t.ok($q$insert into public.records (firm_id, kind, id, data) values ('11111111-1111-1111-1111-111111111111', 'invoice', 'i-assoc', '{}')$q$, 'an Associate can raise an invoice');
delete from public.records where kind = 'case' and id = 'c-role';
delete from public.records where kind = 'invoice' and id = 'i-role';
delete from public.records where kind = 'task' and id = 't-role';
reset role;
select t.a($q$t.cnt('select count(*) from public.records where kind = ''case'' and id = ''c-role''') = 1$q$, 'an Associate cannot delete a case');
select t.a($q$t.cnt('select count(*) from public.records where kind = ''invoice'' and id = ''i-role''') = 1$q$, 'an Associate cannot delete an invoice');
select t.a($q$t.cnt('select count(*) from public.records where kind = ''task'' and id = ''t-role''') = 0$q$, 'an Associate can delete a task');
-- the Intern: no invoices, no deleting
insert into public.records (firm_id, kind, id, data) values ('11111111-1111-1111-1111-111111111111', 'task', 't-role2', '{}');
set role authenticated; select t.as_user(:C, 'chitra@example.in');
select t.a($q$public.member_tier('11111111-1111-1111-1111-111111111111') = 'restricted'$q$, 'an Intern is restricted');
select t.raises($q$insert into public.records (firm_id, kind, id, data) values ('11111111-1111-1111-1111-111111111111', 'invoice', 'i-intern', '{}')$q$, '%row-level security%', 'an Intern cannot raise an invoice');
select t.ok($q$insert into public.records (firm_id, kind, id, data) values ('11111111-1111-1111-1111-111111111111', 'task', 't-intern', '{}')$q$, 'an Intern can add a task');
update public.records set data = '{"x":1}' where kind = 'invoice' and id = 'i-role';
delete from public.records where kind = 'task' and id = 't-role2';
delete from public.records where kind = 'log' and id = 'l-role';
reset role;
select t.a($q$t.cnt('select count(*) from public.records where kind = ''invoice'' and id = ''i-role'' and data = ''{"x":1}''') = 0$q$, 'an Intern cannot edit an invoice');
select t.a($q$t.cnt('select count(*) from public.records where kind = ''task'' and id = ''t-role2''') = 1$q$, 'an Intern cannot delete a task');
select t.a($q$t.cnt('select count(*) from public.records where kind = ''log'' and id = ''l-role''') = 0$q$, 'anyone can trim the activity log');
-- the owner (a lead) can do everything
set role authenticated; select t.as_user(:A, 'asha@example.in');
select t.a($q$public.member_tier('11111111-1111-1111-1111-111111111111') = 'lead'$q$, 'the owner is a lead');
delete from public.records where kind = 'case' and id = 'c-role';
delete from public.records where kind = 'invoice' and id = 'i-role';
reset role;
select t.a($q$t.cnt('select count(*) from public.records where id in (''c-role'', ''i-role'')') = 0$q$, 'the owner can delete cases and invoices');
-- a non-member sees nothing and can change nothing
set role authenticated; select t.as_user(:O, 'owner@legalstaff.test');
select t.a($q$public.member_tier('11111111-1111-1111-1111-111111111111') = 'none'$q$, 'someone outside the firm has no tier');
reset role;

-- ===== 0049: erase_user_account ==========================================================================
\echo 0049 account erase
insert into public.firms (id, name, city, address, created_by) values ('77777777-7777-7777-7777-777777777771', 'Solo Firm', 'Delhi', 'x', '00000000-0000-0000-0000-0000000000e1'), ('77777777-7777-7777-7777-777777777772', 'Team Firm', 'Delhi', 'x', '00000000-0000-0000-0000-0000000000e2') on conflict do nothing;
set session_replication_role = replica;
insert into public.members (firm_id, user_id, email, name, role, status, is_owner) values
 ('77777777-7777-7777-7777-777777777771', '00000000-0000-0000-0000-0000000000e1', 'solo@example.in', 'Solo', 'Managing Partner', 'Active', true),
 ('77777777-7777-7777-7777-777777777772', '00000000-0000-0000-0000-0000000000e2', 'team@example.in', 'Team Owner', 'Managing Partner', 'Active', true),
 ('77777777-7777-7777-7777-777777777772', '00000000-0000-0000-0000-0000000000e3', 'mate@example.in', 'Mate', 'Advocate', 'Active', false);
set session_replication_role = origin;
insert into public.records (firm_id, kind, id, data) values ('77777777-7777-7777-7777-777777777771', 'case', 'c-solo', '{}'), ('77777777-7777-7777-7777-777777777772', 'case', 'c-team', '{}');
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, user_id, status, paid_at) values ('APP-E1', 'Solo Adv', 'D/4040/2015', 'c', '2015', 'c', 'solo@example.in', '9000000041', '00000000-0000-0000-0000-0000000000e1', 'verified', now());
-- permissions
set role authenticated; select t.as_user('00000000-0000-0000-0000-0000000000e1', 'solo@example.in');
select t.raises($q$select public.erase_user_account('00000000-0000-0000-0000-0000000000e1')$q$, '%permission denied%', 'a signed-in user cannot call erase_user_account directly');
reset role; set role anon;
select t.raises($q$select public.erase_user_account('00000000-0000-0000-0000-0000000000e1')$q$, '%permission denied%', 'anon cannot call erase_user_account');
reset role;
-- from here the calls come from the service role (no signed-in user)
select t.as_user(null, null);
-- a firm with active colleagues blocks its owner
select t.raises($q$select public.erase_user_account('00000000-0000-0000-0000-0000000000e2')$q$, '%still has other members%', 'an owner with colleagues must hand the firm over first');
select t.a($q$t.cnt('select count(*) from public.records where id = ''c-team''') = 1$q$, 'nothing was erased when it refused');
-- a colleague can leave without touching the firm
select t.ok($q$select public.erase_user_account('00000000-0000-0000-0000-0000000000e3')$q$, 'a colleague can delete their account');
select t.a($q$t.cnt('select count(*) from public.members where email = ''mate@example.in'' and user_id is null and status = ''Suspended''') = 1$q$, 'the colleague no longer belongs to the firm');
select t.a($q$t.cnt('select count(*) from public.records where id = ''c-team''') = 1$q$, 'the firm and its records are untouched');
-- a sole owner: the firm's practice data goes, the firm row and money records stay
select t.a($q$(public.erase_user_account('00000000-0000-0000-0000-0000000000e1')->'firms')::text like '%77777777-7777-7777-7777-777777777771%'$q$, 'it reports which firm was erased');
select t.a($q$t.cnt('select count(*) from public.records where id = ''c-solo''') = 0$q$, 'the sole owner''s records are erased');
select t.a($q$t.cnt('select count(*) from public.firms where id = ''77777777-7777-7777-7777-777777777771''') = 1$q$, 'the firm row stays (payments reference it)');
select t.a($q$t.cnt('select count(*) from public.directory_applications where id = ''APP-E1'' and status = ''rejected''') = 1$q$, 'the directory profile is taken off the public list');
select t.a($q$t.cnt('select count(*) from public.directory_profiles() where id = ''APP-E1''') = 0$q$, 'and it no longer appears in the directory');
select t.ok($q$select public.erase_user_account('00000000-0000-0000-0000-0000000000e1')$q$, 'running it twice is harmless');
select t.raises($q$select public.erase_user_account(null)$q$, '%No user%', 'a missing user is refused');

-- ===== 0050: partner document review =====================================================================
\echo 0050 partner doc review
create function t.doc(k text) returns uuid language sql security definer as $$ select id from public.partner_documents where kind = k and partner_id = (select id from public.partners where code = (select (array_agg(code order by created_at))[1] from public.partners)) limit 1 $$;
create function t.kyc() returns text language sql security definer as $$ select kyc_status from public.partners where code = (select (array_agg(code order by created_at))[1] from public.partners) $$;
select t.as_user(:A, 'asha@example.in'); set role authenticated;
select t.raises($q$select public.admin_partner_doc_review(t.doc('pan'), 'rejected', 'blurry')$q$, '%permission%', 'an ordinary user cannot review partner documents');
reset role; set role anon;
select t.raises($q$select public.admin_partner_doc_review(t.doc('pan'), 'rejected', 'blurry')$q$, '%permission denied%', 'anon cannot review partner documents');
reset role;
select t.as_user(:O, 'owner@legalstaff.test'); set role authenticated;
select t.raises($q$select public.admin_partner_doc_review(t.doc('pan'), 'rejected', '')$q$, '%Say why%', 'a rejection needs a reason');
select t.raises($q$select public.admin_partner_doc_review(t.doc('pan'), 'maybe', 'x')$q$, '%accepted or rejected%', 'only accept or reject');
select t.raises($q$select public.admin_partner_doc_review('00000000-0000-0000-0000-00000000ffff', 'accepted', '')$q$, '%not found%', 'an unknown document is refused');
select t.ok($q$select public.admin_partner_doc_review(t.doc('bank_proof'), 'accepted', '')$q$, 'a document can be accepted');
select t.a($q$t.kyc() = 'verified'$q$, 'accepting leaves KYC as it was');
select t.ok($q$select public.admin_partner_doc_review(t.doc('pan'), 'rejected', 'The PAN card is not readable')$q$, 'a document can be rejected with a reason');
reset role;
select t.a($q$t.kyc() = 'submitted'$q$, 'rejecting the only PAN sends a verified KYC back for review');
select t.a($q$t.cnt('select count(*) from public.partner_documents where status = ''rejected'' and note = ''The PAN card is not readable'' and reviewed_by = ''owner@legalstaff.test''') = 1$q$, 'the reason and the reviewer are recorded');
select t.a($q$t.cnt('select count(*) from public.partner_audit_logs where action = ''partner.document_rejected''') = 1$q$, 'the review is in the audit log');

-- ===== 0051: site banner =================================================================================
\echo 0051 site banner
select t.as_user(null, null);
select t.a($q$public.site_banner() is null$q$, 'no banner while it is off');
set role anon;
select count(*) as bn_anon from public.site_banner \gset
update public.site_banner set enabled = true, message = 'hacked';
reset role;
select t.a('(' || :bn_anon || ' = 0)', 'anon cannot read the banner table directly');
select t.a($q$t.cnt('select count(*) from public.site_banner where enabled or message = ''hacked''') = 0$q$, 'anon cannot write the banner table');
set role authenticated;
select count(*) as bn_auth from public.site_banner \gset
update public.site_banner set enabled = true, message = 'hacked';
reset role;
select t.a('(' || :bn_auth || ' = 0)', 'a signed-in user sees no rows of the banner table (row level security, no policy)');
select t.a($q$t.cnt('select count(*) from public.site_banner where enabled or message = ''hacked''') = 0$q$, 'a signed-in user cannot write the banner');
update public.site_banner set enabled = true, message = 'Maintenance tonight 11pm', tone = 'warning' where id = 1;
set role anon;
select t.a($q$(public.site_banner() ->> 'message') = 'Maintenance tonight 11pm' and (public.site_banner() ->> 'tone') = 'warning'$q$, 'an enabled banner is visible to everyone');
reset role;
update public.site_banner set starts_on = (now() at time zone 'Asia/Kolkata')::date + 2 where id = 1;
select t.a($q$public.site_banner() is null$q$, 'not shown before its start date');
update public.site_banner set starts_on = null, ends_on = (now() at time zone 'Asia/Kolkata')::date - 1 where id = 1;
select t.a($q$public.site_banner() is null$q$, 'not shown after its end date');
update public.site_banner set starts_on = (now() at time zone 'Asia/Kolkata')::date, ends_on = (now() at time zone 'Asia/Kolkata')::date where id = 1;
select t.a($q$public.site_banner() is not null$q$, 'shown on its last day');
update public.site_banner set message = '   ' where id = 1;
select t.a($q$public.site_banner() is null$q$, 'a blank message shows nothing');
select t.raises($q$update public.site_banner set link_url = 'javascript:alert(1)'$q$, '%site_banner_link_url_check%', 'only https links are allowed');
select t.raises($q$update public.site_banner set message = repeat('x', 301)$q$, '%site_banner_message_check%', 'a message is at most 300 characters');
select t.raises($q$update public.site_banner set starts_on = '2026-12-10', ends_on = '2026-12-01'$q$, '%site_banner_check%', 'the end cannot be before the start');
select t.raises($q$insert into public.site_banner (id) values (2)$q$, '%site_banner_id_check%', 'there is only ever one banner');
update public.site_banner set enabled = false, message = '', starts_on = null, ends_on = null where id = 1;

\echo
select 'RESULT', count(*) filter (where ok), count(*) filter (where not ok) from t.r;
select 'FAIL: ' || name from t.r where not ok;

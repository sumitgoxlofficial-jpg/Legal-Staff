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
update public.directory_applications set paid_at = now() where id = 'APP-B2';
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

\echo
select 'RESULT', count(*) filter (where ok), count(*) filter (where not ok) from t.r;
select 'FAIL: ' || name from t.r where not ok;

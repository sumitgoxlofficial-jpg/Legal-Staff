-- Behavioural checks for migration 0039 on real PostgreSQL. Each t.ok(...) is one assertion; failures are listed at the end.
\set ON_ERROR_STOP 0
set client_min_messages = warning;
create schema t; create table t.r (ok boolean, name text);
grant usage on schema t to public; grant all on t.r to public;
create table t.v (k text primary key, v text); grant all on t.v to public;
-- t.a: run a boolean query with the test owner's rights (so it can read locked tables) and record the result
create function t.a(q text, n text) returns void language plpgsql security definer as $$ declare b boolean; begin begin execute 'select (' || q || ')' into b; exception when others then b := false; insert into t.r values (false, n || ' [error: ' || sqlerrm || ']'); return; end; insert into t.r values (coalesce(b, false), n); end $$;
create function t.as_user(uid uuid, em text) returns void language plpgsql as $$ begin perform set_config('test.uid', coalesce(uid::text, ''), false); perform set_config('test.jwt', case when em is null then '' else jsonb_build_object('email', em)::text end, false); end $$;
create function t.err(q text) returns text language plpgsql as $$ begin execute q; return null; exception when others then return sqlerrm; end $$;
create function t.raises(q text, pat text, n text) returns void language plpgsql as $$ declare m text; begin begin execute q; m := null; exception when others then m := sqlerrm; end; insert into t.r values (m is not null and m like pat, n || coalesce(' [got: ' || left(m, 90) || ']', ' [no error]')); end $$;
create function t.vid(k text) returns text language sql security definer as $$ select v from t.v where t.v.k = vid.k $$;
create function t.cid(a text) returns uuid language sql security definer as $$ select id from public.partner_commissions where application_id = a $$;
create function t.pid(c text) returns uuid language sql security definer as $$ select id from public.partners where code = c $$;
create function t.cnt(q text) returns bigint language plpgsql security definer as $$ declare n bigint; begin execute q into n; return n; end $$;
grant execute on all functions in schema t to public;

-- fixtures: users
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set F '''00000000-0000-0000-0000-00000000000f'''
\set P '''00000000-0000-0000-0000-0000000000a1'''
\set S '''00000000-0000-0000-0000-0000000000a2'''
\set M '''00000000-0000-0000-0000-0000000000a3'''
\set O '''00000000-0000-0000-0000-0000000000a0'''

-- ===== public =====
set role anon; select t.as_user(null, null);
select t.a($q$jsonb_array_length(public.partner_public_config() -> 'categories') = 6$q$, 'public config lists the six categories');
select t.a($q$not (public.partner_public_config() -> 'categories' -> 0 ? 'commission_enabled')$q$, 'public config does not expose commission settings');
select t.raises('select * from public.partners', '%permission denied%', 'anon cannot read tables');
select t.raises('select public.admin_overview()', '%permission denied%', 'anon cannot call admin functions');
select t.raises('select public.partner_dashboard()', '%permission denied%', 'anon cannot call partner functions');
reset role;

-- ===== registration =====
set role authenticated;
select t.as_user(:A, 'asha@example.in');
select t.raises($$select public.partner_apply('{"name":"Asha Rao","mobile":"9876500001","state":"Bihar","district":"Patna","city":"Patna","category_key":"campus_ambassador","accept_terms":true,"accept_privacy":true}')$$, '%organisation or college%', 'category needing an organisation rejects a blank one');
select t.raises($$select public.partner_apply('{"name":"Asha Rao","mobile":"9876500001","state":"Bihar","district":"Patna","city":"Patna","category_key":"campus_ambassador","organisation":"NLU","accept_terms":false,"accept_privacy":true}')$$, '%Accept the partner terms%', 'terms and privacy consent are required');
select t.raises($$select public.partner_apply('{"name":"Asha Rao","mobile":"12345","state":"Bihar","district":"Patna","city":"Patna","category_key":"campus_ambassador","organisation":"NLU","accept_terms":true,"accept_privacy":true}')$$, '%mobile%', 'an invalid mobile is rejected');
insert into t.v select 'asha_app', public.partner_apply('{"name":"Asha Rao","mobile":"9876500001","state":"Bihar","district":"Patna","city":"Patna","category_key":"campus_ambassador","organisation":"NLU Patna","accept_terms":true,"accept_privacy":true}')::text;
select t.a($q$(select v from t.v where k='asha_app') is not null$q$, 'a valid application is accepted');
select t.a($q$(public.partner_me() ->> 'state') = 'applicant'$q$, 'the applicant sees an applicant state, not a partner');
select t.raises($$select public.partner_dashboard()$$, '%not an approved partner%', 'an applicant cannot open the partner dashboard');
select t.as_user(:B, 'asha@example.in');
select t.raises($$select public.partner_apply('{"name":"Other","mobile":"9876500002","state":"Bihar","district":"Patna","city":"Patna","category_key":"district_coordinator","accept_terms":true,"accept_privacy":true}')$$, '%already exists%', 'a duplicate email is blocked');
select t.as_user(:B, 'bina@example.in');
select t.raises($$select public.partner_apply('{"name":"Bina","mobile":"+91 98765 00001","state":"Bihar","district":"Patna","city":"Patna","category_key":"district_coordinator","accept_terms":true,"accept_privacy":true}')$$, '%already exists%', 'a duplicate mobile (any format) is blocked');
insert into t.v select 'bina_app', public.partner_apply('{"name":"Bina Das","mobile":"9876500002","state":"Jharkhand","district":"Ranchi","city":"Ranchi","category_key":"district_coordinator","accept_terms":true,"accept_privacy":true}')::text;
select t.as_user(:C, 'chitra@example.in');
insert into t.v select 'chitra_app', public.partner_apply('{"name":"Chitra Sen","mobile":"9876500003","state":"Delhi","district":"New Delhi","city":"Delhi","category_key":"legal_bookshop_partner","organisation":"Sen Law Books","accept_terms":true,"accept_privacy":true}')::text;
reset role;
select t.a($q$t.cnt($$select count(*) from public.partner_terms_acceptance$$) = 6$q$, 'terms and privacy acceptance are recorded with their versions');

-- registration can be closed
select t.as_user(:O, 'owner@legalstaff.test'); set role authenticated;
select public.admin_settings_save('{"registration_open": false}');
select t.as_user(:F, 'fatima@example.in');
select t.raises($$select public.partner_apply('{"name":"Fatima K","mobile":"9876500009","state":"Bihar","district":"Patna","city":"Patna","category_key":"district_coordinator","accept_terms":true,"accept_privacy":true}')$$, '%closed%', 'registration can be switched off from settings');
select t.as_user(:O, 'owner@legalstaff.test');
select public.admin_settings_save('{"registration_open": true}');
reset role;

-- ===== roles and permissions =====
select t.as_user(:O, 'owner@legalstaff.test'); set role authenticated;
select public.admin_staff_save('pm@legalstaff.test', 'partner_manager');
select public.admin_staff_save('fin@legalstaff.test', 'finance_manager');
select public.admin_staff_save('mk@legalstaff.test', 'marketing_manager');
select public.admin_staff_save('sup@legalstaff.test', 'support_manager');
select t.a($q$(public.admin_whoami() ->> 'role') = 'super_admin'$q$, 'owner is Super Admin');
select public.admin_role_save('viewer', 'Read-only viewer', array['partners.view','reports.view']);
select t.raises($$select public.admin_role_save('x','X',array['nope'])$$, '%Unknown permission%', 'custom roles accept only known permissions');
select public.admin_staff_save('view@legalstaff.test', 'viewer');
reset role;
select t.as_user(:P, 'pm@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_role_save('evil','Evil',array['settings.manage'])$$, '%permission%', 'only Super Admin can create roles');
select t.raises($$select public.admin_settings_save('{"min_withdrawal_paise": 1}')$$, '%permission%', 'Partner Manager cannot change settings');
select t.raises($$select public.admin_commissions()$$, '%permission%', 'Partner Manager cannot see commissions');
select t.raises($$select public.admin_payouts()$$, '%permission%', 'Partner Manager cannot see payouts');
select t.raises($$select public.admin_application_decide('00000000-0000-0000-0000-000000000000', 'approve')$$, 'Application not found%', 'Partner Manager may decide applications (reaches the not-found check, not a permission error)');
select public.admin_application_decide(t.vid('asha_app')::uuid, 'review');
insert into t.v select 'asha_res', public.admin_application_decide(t.vid('asha_app')::uuid, 'approve', 'Welcome')::text;
select t.a($q$((select v::jsonb from t.v where k='asha_res') ->> 'code') = 'LS10001'$q$, 'the first approved partner gets LS10001');
select public.admin_application_decide(t.vid('bina_app')::uuid, 'approve');
select public.admin_application_decide(t.vid('chitra_app')::uuid, 'reject', 'Could not verify the business');
select t.raises($$select public.admin_application_decide(t.vid('asha_app')::uuid, 'reject')$$, '%already approved%', 'a decided application cannot be decided twice');
reset role;
select t.as_user(:M, 'mk@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_application_decide(t.vid('bina_app')::uuid, 'reject')$$, '%permission%', 'Marketing Manager cannot decide applications');
select t.raises($$select public.admin_category_save('{"key":"x1","name":"X"}')$$, '%permission%', 'Marketing Manager cannot edit categories');
select t.a($q$public.admin_campaign_save('{"name":"Diwali push","channel":"whatsapp","message":"Hello","status":"draft"}') is not null$q$, 'Marketing Manager can create campaigns');
reset role;
select t.as_user(:S, 'sup@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_campaign_save('{"name":"x"}')$$, '%permission%', 'Support Manager cannot manage campaigns');
select t.a($q$jsonb_typeof(public.admin_tickets()) = 'array'$q$, 'Support Manager can read tickets');
reset role;
select t.as_user(:A, 'asha@example.in'); set role authenticated;
select t.raises($$select public.admin_overview()$$, '%permission%', 'a partner cannot call admin functions');
select t.a($q$(public.partner_me() ->> 'state') = 'partner'$q$, 'an approved applicant becomes a partner');
reset role;

-- ===== referral tracking =====
set role anon; select t.as_user(null, null);
select t.a($q$public.partner_validate_code('ls10001')$q$, 'a valid code validates (case-insensitive)');
select t.a($q$not public.partner_validate_code('LS99999')$q$, 'an unknown code does not validate');
select t.a($q$public.partner_track_click('LS10001', 'visitor-token-aaaaaaaa1')$q$, 'a click is recorded');
select t.a($q$public.partner_track_click('LS10001', 'visitor-token-aaaaaaaa1')$q$, 'a repeat click inside 30 minutes is accepted without a duplicate row');
select t.a($q$not public.partner_track_click('LS99999', 'visitor-token-aaaaaaaa2')$q$, 'an unknown code records nothing');
select t.a($q$not public.partner_track_click('LS10001', 'short')$q$, 'a weak visitor token is refused');
reset role;
select t.a($q$t.cnt($$select count(*) from public.partner_referrals$$) = 1$q$, 'repeat clicks do not create duplicates');
select public.partner_track_click('LS10001', 'visitor-token-bbbbbbbb2'); -- a second visitor
select public.partner_track_click('LS10001', 'visitor-token-cccccccc3');
select public.partner_track_click('LS10001', 'visitor-token-dddddddd4');
select public.partner_track_click('LS10002', 'visitor-token-eeeeeeee5');

-- ===== advocate registration and attribution =====
reset role; select t.as_user(null, null);
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, details, referral_code, visitor_token) values
  ('A1', 'Anil Kumar', 'BR/100/2015', 'Bar Council of Bihar', '2015', 'Patna', 'anil@x.in', '9000000001', '{"documents":["id.pdf","enrolment.pdf"]}', 'ls10001', 'visitor-token-aaaaaaaa1'),
  ('A2', 'Asha Rao', 'BR/101/2016', 'Bar Council of Bihar', '2016', 'Patna', 'asha@example.in', '9000000002', '{"documents":["id.pdf"]}', 'LS10001', 'visitor-token-bbbbbbbb2'),
  ('A3', 'Ravi Verma', 'BR/102/2016', 'Bar Council of Bihar', '2016', 'Patna', 'ravi@x.in', '9000000003', '{"documents":["id.pdf"]}', 'LS77777', 'visitor-token-cccccccc3'),
  ('A4', 'Direct Dev', 'BR/103/2016', 'Bar Council of Bihar', '2016', 'Patna', 'dev@x.in', '9000000004', '{}', null, null),
  ('A5', 'No Click Nina', 'BR/104/2016', 'Bar Council of Bihar', '2016', 'Patna', 'nina@x.in', '9000000005', '{"documents":["id.pdf"]}', 'LS10001', 'visitor-token-zzzzzzzzzz9'),
  ('A6', 'Mobile Match', 'BR/105/2016', 'Bar Council of Bihar', '2016', 'Patna', 'mm@x.in', '+91 98765 00001', '{}', 'LS10001', 'visitor-token-dddddddd4');
reset role;
select t.a($q$(select status from public.referral_attributions where application_id = 'A1') = 'valid' and (select touch_verified from public.referral_attributions where application_id = 'A1')$q$, 'a referred advocate is attributed, matched to a recorded click');
select t.a($q$(select status from public.referral_attributions where application_id = 'A2') = 'rejected_self'$q$, 'a self-referral by email is rejected');
select t.a($q$(select status from public.referral_attributions where application_id = 'A6') = 'rejected_self'$q$, 'a self-referral by mobile (different format) is rejected');
select t.a($q$(select status from public.referral_attributions where application_id = 'A3') = 'rejected_unknown'$q$, 'an unknown code is recorded as rejected');
select t.a($q$not exists (select 1 from public.referral_attributions where application_id = 'A4')$q$, 'a direct registration has no attribution');
select t.a($q$(select status from public.referral_attributions where application_id = 'A5') = 'valid' and not (select touch_verified from public.referral_attributions where application_id = 'A5')$q$, 'a code with no recorded click is attributed but unverified');
select t.a($q$exists (select 1 from public.partner_fraud_flags where kind = 'self_referral' and application_id = 'A2' and score = 100)$q$, 'self-referral raises a flag');
select t.a($q$t.cnt($$select count(*) from public.directory_applications$$) = 6$q$, 'every advocate registration succeeded regardless of attribution outcome');
select t.raises($$update public.referral_attributions set partner_id = null where application_id = 'A1'$$, '%cannot be changed%', 'an attribution cannot be re-pointed');
select t.raises($$update public.referral_attributions set code = 'LS10002' where application_id = 'A1'$$, '%cannot be changed%', 'an attribution code cannot be edited');
update public.directory_applications set referral_code = 'LS10002', visitor_token = 'x' where id = 'A1';
select t.a($q$(select referral_code from public.directory_applications where id = 'A1') = 'ls10001'$q$, 'the referral claim on the advocate record cannot be rewritten');
update public.directory_applications set referral_code = 'LS10001' where id = 'A4';
select t.a($q$not exists (select 1 from public.referral_attributions where application_id = 'A4')$q$, 'attributing after the fact is not possible');
select t.raises($$update public.partner_audit_logs set action = 'x'$$, '%append-only%', 'the audit log cannot be edited');
select t.raises($$delete from public.partner_audit_logs$$, '%append-only%', 'the audit log cannot be deleted from');

-- ===== commission: off by default, legal approval first =====
select t.a($q$not exists (select 1 from public.partner_categories where commission_enabled)$q$, 'commission is off for every category by default');
select t.a($q$not public.ps_flag('commission_generation')$q$, 'global commission generation is off by default');
select t.a($q$public.ps_s('listing_price_paise') = 'null'::jsonb and public.ps_txt('listing_price_status') = 'unreconciled'$q$, 'the listing price is unset and unreconciled by default');
select t.raises($$update public.partner_categories set commission_enabled = true where key = 'campus_ambassador'$$, '%commission_needs_legal%', 'the database refuses commission without a legal approval reference');
select t.as_user(:F, 'fin@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_category_commission('campus_ambassador', true, 1500)$$, '%counsel%', 'commission cannot be turned on before approval is recorded');
select t.raises($$select public.admin_compliance_record('{"category_key":"campus_ambassador","reference":"OPINION-1","approved_on":"2026-11-01"}')$$, '%permission%', 'Finance Manager cannot record legal approvals');
reset role;
-- payment and verification happen while commission is off
select t.as_user(:F, 'fin@legalstaff.test'); set role authenticated;
select t.a($q$(public.admin_record_listing_payment('A1', 4900, 'UTR-AAAA-0001') ->> 'ok')::boolean$q$, 'a payment can be verified by Finance');
reset role;
update public.directory_applications set status = 'verified' where id = 'A1';
select t.a($q$not exists (select 1 from public.partner_commissions)$q$, 'no commission arises while the category is not approved, even when everything else is complete');

-- record counsel's approval, then enable
select t.as_user(:O, 'owner@legalstaff.test'); set role authenticated;
select public.admin_compliance_record('{"category_key":"campus_ambassador","reference":"COUNSEL-OPINION-2026-11","scope":"Referral reward for verified listings","approved_by_name":"Test Counsel","approved_on":"2026-11-01"}');
select public.admin_category_commission('campus_ambassador', true, 1500);
select t.a($q$(select commission_enabled and legal_approval_ref = 'COUNSEL-OPINION-2026-11' from public.partner_categories where key = 'campus_ambassador')$q$, 'commission turns on with the approval reference recorded');
select t.raises($$select public.admin_settings_save('{"payout_cycle":"daily"}')$$, '%monthly, fortnightly or weekly%', 'settings are validated');
select t.raises($$select public.admin_settings_save('{"listing_price_status":"approved"}')$$, '%Set the listing price%', 'the listing price cannot be approved until it has a value');
select public.admin_settings_save('{"commission_generation": true, "min_withdrawal_paise": 1500, "listing_price_paise": 4900}');
select public.admin_settings_save('{"listing_price_status": "approved"}');
reset role;
select t.a($q$not exists (select 1 from public.partner_commissions)$q$, 'an earlier attribution (before the approval was recorded) earns nothing');

-- a new referral after approval
select public.partner_track_click('LS10001', 'visitor-token-ffffffff6');
reset role; select t.as_user(null, null);
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, details, referral_code, visitor_token) values
  ('B1', 'Bharat Singh', 'BR/200/2018', 'Bar Council of Bihar', '2018', 'Gaya', 'bharat@x.in', '9100000001', '{"documents":["a.pdf"]}', 'LS10001', 'visitor-token-ffffffff6');
reset role;
select t.a($q$(select status from public.partner_commissions where application_id = 'B1') = 'pending_payment'$q$, 'new commission waits for a verified payment');
select t.as_user(:F, 'fin@legalstaff.test'); set role authenticated;
select public.admin_record_listing_payment('B1', 4900, 'UTR-BBBB-0002');
select t.a($q$(select status from public.partner_commissions where application_id = 'B1') = 'pending_verification'$q$, 'with payment, it waits for listing approval');
reset role;
update public.directory_applications set status = 'verified' where id = 'B1';
select t.a($q$(select status from public.partner_commissions where application_id = 'B1') = 'eligible'$q$, 'payment + documents + approved listing + clean risk = eligible');
update public.directory_applications set status = 'info' where id = 'B1'; update public.directory_applications set status = 'verified' where id = 'B1';
select t.a($q$t.cnt($$select count(*) from public.partner_commissions where application_id = 'B1'$$) = 1$q$, 'replaying events never creates a second commission');
select t.a($q$(select amount_paise from public.partner_commissions where application_id = 'B1') = 1500$q$, 'the proposed commission of Rs 15 applies');
select t.raises($$insert into public.partner_commissions (partner_id, attribution_id, category_key, amount_paise) select partner_id, id, category_key, 1 from public.referral_attributions where application_id = 'B1'$$, '%duplicate key%', 'a second commission for the same attribution is refused by the database');

-- repeated payment reference
select t.as_user(:F, 'fin@legalstaff.test'); set role authenticated;
select t.a($q$(public.admin_record_listing_payment('A1', 4900, 'utr-bbbb-0002') ->> 'ok')::boolean = false$q$, 'a repeated payment reference is refused');
reset role;
select t.a($q$exists (select 1 from public.partner_fraud_flags where kind = 'repeated_payment_reference')$q$, 'and flagged for review');
select t.a($q$t.cnt($$select count(*) from public.partner_listing_payments$$) = 2$q$, 'no extra payment row was created');

-- ===== finance workflow =====
select t.as_user(:P, 'pm@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_commission_action(t.cid('B1'), 'approve')$$, '%permission%', 'Partner Manager cannot approve commissions');
reset role;
select t.as_user(:F, 'fin@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_commission_action(t.cid('B1'), 'payable')$$, '%Only an approved%', 'a commission cannot skip approval');
select public.admin_commission_action(t.cid('B1'), 'approve', 'ok');
select public.admin_commissions_make_payable();
select t.a($q$(select status from public.partner_commissions where application_id = 'B1') = 'payable'$q$, 'approved commissions become payable');
reset role;

-- ===== partner view and payout =====
select t.as_user(:A, 'asha@example.in'); set role authenticated;
select t.a($q$(public.partner_dashboard() -> 'money' ->> 'available_paise')::int = 1500$q$, 'the dashboard shows the available balance');
select t.a($q$(public.partner_dashboard() -> 'totals' ->> 'registrations')::int = 3$q$, 'the dashboard counts only valid attributions');
select t.a($q$public.partner_dashboard() -> 'recent' -> 0 ->> 'advocate' like '_***'$q$, 'advocate names are masked for partners');
select t.a($q$public.partner_dashboard() ->> 'referral_url' = 'https://legalstaff.in/directory/?ref=LS10001'$q$, 'the referral link is built from the partner ID');
select t.raises($$select public.partner_request_payout()$$, '%KYC%', 'a payout needs verified KYC');
select t.raises($$select public.partner_add_payment_method('upi', '{"upi_id":"bad"}')$$, '%valid UPI%', 'a bad UPI ID is rejected');
select t.raises($$select public.partner_add_payment_method('bank', '{"account_no":"123","ifsc":"X","holder":"A"}')$$, '%bank account%', 'a bad bank account is rejected');
select public.partner_add_payment_method('upi', '{"upi_id":"asha.rao@okbank"}');
reset role;
select t.a($q$(select masked from public.partner_payment_methods limit 1) = 'as***@okbank'$q$, 'only a masked UPI ID is stored in readable form');
select t.a($q$(select details_enc::text from public.partner_payment_methods limit 1) not like '%asha%'$q$, 'payout details are encrypted at rest');
select t.as_user(:P, 'pm@legalstaff.test'); set role authenticated;
select public.admin_partner_update(t.pid('LS10001'), '{"kyc_status":"verified"}');
reset role;
select t.as_user(:A, 'asha@example.in'); set role authenticated;
insert into t.v select 'payout1', public.partner_request_payout()::text;
select t.a($q$(select v from t.v where k='payout1') is not null$q$, 'a payout is requested for the available balance');
select t.raises($$select public.partner_request_payout()$$, '%minimum%', 'a second request cannot double-spend the balance');
select t.a($q$(public.partner_dashboard() -> 'money' ->> 'available_paise')::int = 0$q$, 'the balance is locked into the payout');
reset role;
select t.as_user(:F, 'fin@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_payout_action(t.vid('payout1')::uuid, 'paid', '', 'UTR1234567')$$, '%cannot be paid%', 'a payout cannot be paid before approval');
select public.admin_payout_action(t.vid('payout1')::uuid, 'approve');
select t.raises($$select public.admin_payout_action(t.vid('payout1')::uuid, 'paid', '', '')$$, '%UTR%', 'a UTR is required to mark paid');
select public.admin_payout_action(t.vid('payout1')::uuid, 'paid', 'Sent', 'HDFC-UTR-998877');
select t.a($q$(select status from public.partner_commissions where application_id = 'B1') = 'paid'$q$, 'paying the payout marks its commissions paid');
select t.a($q$(public.admin_payout_destination(t.vid('payout1')::uuid) ->> 'upi_id') = 'asha.rao@okbank'$q$, 'finance can reveal the destination, which is audited');
select t.a($q$exists (select 1 from public.partner_audit_logs where action = 'payout.destination_viewed')$q$, 'revealing a destination is audit-logged');
select t.raises($$select public.admin_commission_action(t.cid('B1'), 'approve')$$, '%eligible%', 'a paid commission cannot be re-approved');
select public.admin_commission_action(t.cid('B1'), 'reverse', 'Refund after fraud finding');
select t.a($q$exists (select 1 from public.partner_fraud_flags where kind = 'clawback_required')$q$, 'reversing a paid commission flags a clawback');
reset role;
select t.a($q$t.cnt($$select count(*) from public.partner_audit_logs where entity = 'payout'$$) >= 3$q$, 'payout steps are audited');

-- ===== reversal when a listing is rejected =====
select public.partner_track_click('LS10001', 'visitor-token-gggggggg7');
reset role; select t.as_user(null, null);
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, details, referral_code, visitor_token) values
  ('C1', 'Chandan Lal', 'BR/300/2019', 'Bar Council of Bihar', '2019', 'Gaya', 'chandan@x.in', '9200000001', '{"documents":["a.pdf"]}', 'LS10001', 'visitor-token-gggggggg7');
reset role;
select t.as_user(:F, 'fin@legalstaff.test'); set role authenticated;
select public.admin_record_listing_payment('C1', 4900, 'UTR-CCCC-0004'); reset role;
update public.directory_applications set status = 'verified' where id = 'C1';
select t.a($q$(select status from public.partner_commissions where application_id = 'C1') = 'eligible'$q$, 'second advocate: eligible');
update public.directory_applications set status = 'rejected' where id = 'C1';
select t.a($q$(select status from public.partner_commissions where application_id = 'C1') = 'reversed'$q$, 'rejecting the listing reverses the commission');

-- ===== suspended partner, global switches =====
select t.as_user(:P, 'pm@legalstaff.test'); set role authenticated;
select public.admin_partner_status(t.pid('LS10002'), 'suspend', 'Under review');
reset role;
insert into t.v select 'clicked', public.partner_track_click('LS10002', 'visitor-token-hhhhhhhh8')::text;
select t.a($q$not (select v::boolean from t.v where k='clicked')$q$, 'a suspended partner no longer records clicks');
reset role; select t.as_user(null, null);
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, referral_code, visitor_token) values ('D1', 'Dilip', 'BR/400/2019', 'Bar Council of Bihar', '2019', 'Gaya', 'dilip@x.in', '9300000001', 'LS10002', 'visitor-token-hhhhhhhh8');
reset role;
select t.a($q$not exists (select 1 from public.referral_attributions where application_id = 'D1') or (select status from public.referral_attributions where application_id = 'D1') = 'rejected_inactive'$q$, 'a suspended partner earns no attribution');
select t.as_user(:O, 'owner@legalstaff.test'); set role authenticated;
select public.admin_settings_save('{"network_enabled": false}');
reset role;
select t.a($q$not public.partner_validate_code('LS10001')$q$, 'pausing the network stops code validation');
select t.a($q$not public.partner_track_click('LS10001', 'visitor-token-iiiiiiii9')$q$, 'pausing the network stops click tracking');
select t.as_user(:A, 'asha@example.in'); set role authenticated;
select t.a($q$(public.partner_dashboard() -> 'totals' ->> 'registrations')::int >= 2$q$, 'pausing the network keeps existing records visible');
select t.raises($$select public.partner_request_payout()$$, '%paused%', 'pausing the network stops payouts');
reset role;
select t.as_user(:O, 'owner@legalstaff.test'); set role authenticated;
select public.admin_settings_save('{"network_enabled": true}');
select t.a($q$jsonb_array_length(public.admin_audit('setting')) >= 4$q$, 'settings changes are audit-logged');
select t.a($q$json_array_length(public.admin_report('partner_master')) = 2$q$, 'the partner master report lists both partners');
select t.a($q$json_array_length(public.admin_report('commission_ledger')) = 2$q$, 'the commission ledger report lists commissions');
select t.a($q$(public.admin_report('monthly_revenue') -> 0 ->> 'Listings paid')::int >= 2$q$, 'the revenue report counts verified listing payments');
reset role;
select t.as_user(:M, 'mk@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_report('commission_ledger')$$, '%permission%', 'reports respect permissions: Marketing cannot export the commission ledger');
reset role;

-- ===== isolation between partners =====
select t.as_user(:B, 'bina@example.in'); set role authenticated;
select t.a($q$(public.partner_dashboard() -> 'totals' ->> 'registrations')::int = 0$q$, 'partner B sees none of partner A''s registrations');
select t.a($q$jsonb_array_length(public.partner_earnings_list()) = 0$q$, 'partner B sees none of partner A''s earnings');
select t.a($q$jsonb_array_length(public.partner_payouts_list() -> 'payouts') = 0$q$, 'partner B sees none of partner A''s payouts');
reset role;

select pg_get_functiondef('public.ps_evaluate_commission(text)'::regprocedure) as evaldef \gset
-- ===== the real directory fee (Razorpay orders in directory_orders) =====
select public.partner_track_click('LS10001', 'visitor-token-jjjjjjjj10');
select public.partner_track_click('LS10001', 'visitor-token-kkkkkkkk11');
reset role; select t.as_user(null, null);
insert into public.directory_applications (id, name, enr, council, year, city, email, mobile, details, referral_code, visitor_token) values
  ('R1', 'Rahul Jha', 'BR/600/2021', 'Bihar State Bar Council', '2021', 'Gaya', 'rahul@x.in', '9400000001', '{"documents":["a.pdf"]}', 'LS10001', 'visitor-token-jjjjjjjj10'),
  ('R2', 'Rita Devi', 'BR/601/2021', 'Bihar State Bar Council', '2021', 'Gaya', 'rita@x.in', '9400000002', '{"documents":["a.pdf"]}', 'LS10001', 'visitor-token-kkkkkkkk11');
insert into public.directory_orders (application_id, order_no, amount_paise, status, utr, confirmed_by, paid_at) values ('R2', 'order_promo', 0, 'paid', null, 'promo', now());
select t.a($q$(select status from public.partner_commissions where application_id = 'R2') = 'pending_payment'$q$, 'a 100%-off promo order is a registration, not a payment: commission keeps waiting');
insert into public.directory_orders (application_id, order_no, amount_paise, status, utr, confirmed_by, paid_at) values ('R1', 'order_rzp_1', 4900, 'paid', 'pay_ABC123', 'razorpay', now());
select t.a($q$(select status from public.partner_commissions where application_id = 'R1') = 'pending_verification'$q$, 'a paid Razorpay directory order counts as the verified payment');
update public.directory_applications set status = 'verified', paid_at = now() where id = 'R1';
select t.a($q$(select status from public.partner_commissions where application_id = 'R1') = 'eligible'$q$, 'paid order + verified listing = eligible, with no manual payment entry');
select t.a($q$public.ps_paid('R1') = 4900 and public.ps_paid('R2') is null$q$, 'ps_paid reports real money only');
insert into public.directory_orders (application_id, order_no, amount_paise, status, confirmed_by, paid_at) values ('R2', 'order_rzp_2', 500, 'paid', 'razorpay', now());
select t.a($q$(select status from public.partner_commissions where application_id = 'R2') = 'pending_payment'$q$, 'a payment smaller than the commission does not make it eligible');
create or replace function public.ps_evaluate_commission(p_app text) returns uuid language plpgsql as $$ begin raise exception 'boom'; end $$;
insert into public.directory_applications (id, name, enr, council, year, city) values ('R3', 'Rohan', 'BR/602/2021', 'Bihar State Bar Council', '2021', 'Gaya');
insert into public.directory_orders (application_id, order_no, amount_paise, status, confirmed_by, paid_at) values ('R3', 'order_rzp_3', 4900, 'paid', 'razorpay', now());
select t.a($q$exists (select 1 from public.directory_orders where order_no = 'order_rzp_3')$q$, 'a Razorpay order is recorded even if the partner network code fails');
\i /tmp/ls-restore-eval.sql

-- ===== monthly earnings (for paying partners) =====
select t.as_user(:O, 'owner@legalstaff.test'); set role authenticated;
select t.a($q$(public.admin_monthly_earnings() -> 'rows' -> 0 ->> 'code') = 'LS10001'$q$, 'monthly earnings lists the partner who referred this month');
select t.a($q$(public.admin_monthly_earnings() -> 'rows' -> 0 ->> 'referred')::int >= 5$q$, 'monthly earnings counts referred advocates (valid attributions only, self-referrals excluded)');
select t.a($q$(public.admin_monthly_earnings() -> 'rows' -> 0 ->> 'paid')::int >= 3$q$, 'monthly earnings counts those with a verified payment');
select t.a($q$(public.admin_monthly_earnings() -> 'rows' -> 0 ->> 'to_pay_paise')::int = 0 and (public.admin_monthly_earnings() -> 'rows' -> 0 ->> 'paid_out_paise')::int = 0$q$, 'the paid-out and to-pay amounts follow the ledger (the only paid commission was reversed)');
select t.a($q$(public.admin_monthly_earnings() -> 'rows' -> 0 ->> 'earned_paise')::int = 1500$q$, 'earned counts only live ledger entries (eligible R1 = Rs 15)');
select t.a($q$jsonb_array_length(public.admin_monthly_earnings('2020-01') -> 'rows') = 0$q$, 'a month with no referrals is empty');
select t.raises($$select public.admin_monthly_earnings('not-a-month')$$, '%Choose a month%', 'a bad month is refused');
reset role;
select t.as_user(:M, 'mk@legalstaff.test'); set role authenticated;
select t.raises($$select public.admin_monthly_earnings()$$, '%permission%', 'Marketing Manager cannot see earnings');
reset role;
select t.as_user(:A, 'asha@example.in'); set role authenticated;
select t.a($q$(public.partner_monthly_earnings() -> 0 ->> 'referred')::int >= 5 and (public.partner_monthly_earnings() -> 0 ->> 'earned_paise')::int = 1500$q$, 'a partner sees their own monthly summary');
reset role;
select t.as_user(:B, 'bina@example.in'); set role authenticated;
select t.a($q$jsonb_array_length(public.partner_monthly_earnings()) = 0$q$, 'another partner sees none of it');
reset role;

-- ===== advocate registration survives a partner-network fault =====
select pg_get_functiondef('public.ps_attribute_application(text)'::regprocedure) as keepdef \gset
create or replace function public.ps_attribute_application(p_app text) returns void language plpgsql as $$ begin raise exception 'boom'; end $$;
reset role; select t.as_user(null, null);
insert into public.directory_applications (id, name, enr, council, year, city, referral_code) values ('E1', 'Eshan', 'BR/500/2020', 'Bar Council of Bihar', '2020', 'Gaya', 'LS10001');
reset role;
select t.a($q$exists (select 1 from public.directory_applications where id = 'E1')$q$, 'advocate registration succeeds even if the partner network code fails');
select t.a($q$exists (select 1 from public.partner_audit_logs where action = 'attribution.error')$q$, 'and the failure is logged');
:keepdef;

-- ===== report =====
select detail::text from public.partner_audit_logs where action like '%error';
select '--- ' || count(*) filter (where ok) || ' passed, ' || count(*) filter (where not ok) || ' failed' from t.r;
select 'FAIL: ' || name from t.r where not ok;

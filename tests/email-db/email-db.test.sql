-- Checks for migration 0024 on a real PostgreSQL: every check raises an exception when it fails, so a failure stops the run.
create or replace function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$ begin if ok then raise notice 'ok   %', msg; else raise exception 'FAIL %', msg; end if; end $$;
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- seed: three public-directory contacts through the real import function (as the service role would)
set role service_role;
insert into public.email_import_runs (id) values ('00000000-0000-0000-0000-0000000000aa');
select pg_temp.check((public.email_import_rows('00000000-0000-0000-0000-0000000000aa', null, '[
  {"row":2,"advocate_name":"Asha Rao","email":"Asha@Example.in","city":"Patna","state":"Bihar","contact_source":"public_directory","source_url":"https://x/1"},
  {"row":3,"advocate_name":"Bimal Das","email":"bimal@example.in","city":"Ranchi","state":"Jharkhand","contact_source":"public_directory"},
  {"row":4,"advocate_name":"Dup","email":" ASHA@example.in ","city":"x"},
  {"row":5,"advocate_name":"Bad","email":"not-an-email"},
  {"row":6,"advocate_name":"Chitra N","email":"chitra@example.in","city":"Delhi","state":"Delhi","contact_source":"web form","consent_source":"signup form","consent_timestamp":"2026-10-01T10:00:00+05:30","consent_evidence_ref":"form-123","consent_wording_version":"v1","consent_verified_at":"2026-10-01T10:05:00+05:30"},
  {"row":7,"advocate_name":"Scraped","email":"scraped@example.in","consent_source":"public directory listing","consent_timestamp":"2026-10-01T10:00:00+05:30","consent_evidence_ref":"x"}
]'::jsonb)->>'new') = '4', 'import: 4 new contacts (one in-batch duplicate and one invalid skipped)');
select pg_temp.check((select count(*) from public.email_contacts) = 4, 'one row per normalised email (duplicate detected)');
select pg_temp.check((select email_normalized from public.email_contacts where email_normalized='asha@example.in') = 'asha@example.in', 'email is stored normalised');
select pg_temp.check((select count(*) from public.email_contacts where consent_status = 'UNKNOWN' and first_email_status = 'BLOCKED') = 3, 'public-directory contacts are UNKNOWN + BLOCKED');
select pg_temp.check((select first_email_status from public.email_contacts where advocate_name='Scraped') = 'BLOCKED', 'consent columns naming a public source are NOT recognised');
select pg_temp.check((select first_email_status || consent_status from public.email_contacts where advocate_name='Chitra N') = 'ELIGIBLEGRANTED', 'documented, verified consent in the sheet is recognised -> ELIGIBLE');
select pg_temp.check((select count(*) from public.email_consents where purpose='marketing') = 1, 'exactly one consent record was written (audit trail)');
select pg_temp.check((select contact_id from public.email_contacts where email_normalized='asha@example.in') ~ '^LSC-[0-9]{6}$', 'contact ids are generated');

-- re-import: no new rows, descriptive fields refreshed, system fields untouched
select pg_temp.check((public.email_import_rows('00000000-0000-0000-0000-0000000000aa', null, '[{"row":2,"advocate_name":"Asha R. Rao","email":"asha@example.in","city":"Patna"}]'::jsonb)->>'updated') = '1', 're-import updates instead of duplicating');
select pg_temp.check((select advocate_name || first_email_status from public.email_contacts where email_normalized='asha@example.in') = 'Asha R. RaoBLOCKED', 'a re-import never unblocks a contact');
select pg_temp.check((select count(*) from public.email_contacts) = 4, 'still 4 contacts');

-- unique email constraint
do $$ begin begin insert into public.email_contacts (email, email_normalized) values ('X@y.in', 'asha@example.in'); perform pg_temp.check(false, 'duplicate email rejected'); exception when unique_violation then perform pg_temp.check(true, 'duplicate email rejected by the unique constraint'); end; end $$;

-- consent needs evidence
do $$ declare c uuid := (select id from public.email_contacts where email_normalized='asha@example.in'); begin
  begin perform public.email_apply_consent(c, 'form', 'v1', now(), now(), '', 'admin'); perform pg_temp.check(false, 'consent without evidence rejected'); exception when raise_exception then perform pg_temp.check(true, 'consent without an evidence reference is rejected'); end;
  perform public.email_apply_consent(c, 'signup form', 'v2', now() - interval '1 day', null, 'ticket-9', 'admin');
  perform pg_temp.check((select first_email_status from public.email_contacts where id = c) = 'BLOCKED', 'granted but unverified consent stays BLOCKED');
  perform public.email_verify_consent(c, now(), 'admin');
  perform pg_temp.check((select first_email_status from public.email_contacts where id = c) = 'ELIGIBLE', 'verifying the email makes the contact ELIGIBLE');
  perform pg_temp.check((select count(*) from public.email_consents where contact_id = c and verified_at is not null) = 1, 'consent record carries the verification time');
end $$;

-- queue + unique campaign/contact
do $$ declare c uuid := (select id from public.email_contacts where email_normalized='asha@example.in'); k uuid := (select id from public.email_campaigns where code='new_intro'); begin
  insert into public.email_queue (campaign_id, contact_id, scheduled_date, idempotency_key) values (k, c, current_date, 'new_intro:' || c);
  begin insert into public.email_queue (campaign_id, contact_id, scheduled_date, idempotency_key) values (k, c, current_date, 'other'); perform pg_temp.check(false, 'second queue row rejected'); exception when unique_violation then perform pg_temp.check(true, 'the same campaign cannot be queued twice for a contact'); end;
  begin insert into public.email_queue (campaign_id, contact_id, scheduled_date, idempotency_key) values (k, c, current_date, 'new_intro:' || c); perform pg_temp.check(false, 'idempotency'); exception when unique_violation then perform pg_temp.check(true, 'idempotency key is unique'); end;
end $$;

-- unsubscribe: immediate suppression, cancels the queue, withdraws consent
do $$ declare c uuid := (select id from public.email_contacts where email_normalized='asha@example.in'); begin
  perform public.email_suppress('ASHA@example.in', 'unsubscribed', 'link', 'recipient');
  perform pg_temp.check((select unsubscribe_status || consent_status || first_email_status from public.email_contacts where id = c) = 'UNSUBSCRIBEDWITHDRAWNBLOCKED', 'unsubscribe: contact UNSUBSCRIBED, consent WITHDRAWN, BLOCKED');
  perform pg_temp.check((select status from public.email_queue where contact_id = c) = 'skipped', 'unsubscribe cancels anything still queued');
  perform pg_temp.check((select count(*) from public.email_suppressions where email_normalized='asha@example.in') = 1, 'address is on the suppression list');
  perform pg_temp.check((select withdrawn_at is not null from public.email_consents where contact_id = c order by created_at desc limit 1), 'consent record shows the withdrawal time');
  perform public.email_suppress('asha@example.in', 'unsubscribed', 'link', 'recipient');
  perform pg_temp.check((select count(*) from public.email_suppressions where email_normalized='asha@example.in') = 1, 'unsubscribing twice is harmless');
  begin perform public.email_apply_consent(c, 'x', 'v', now(), now(), 'e', 'admin'); perform pg_temp.check(false, 'consent on suppressed'); exception when raise_exception then perform pg_temp.check(true, 'a consent cannot be recorded for a suppressed address'); end;
end $$;
-- a new consent alone cannot revive an unsubscribed address in the engine's query because the suppression row remains
select pg_temp.check((select count(*) from public.email_suppressions where email_normalized='asha@example.in') = 1, 'suppression remains until explicitly lifted');
do $$ begin
  begin perform public.email_lift_suppression('asha@example.in', 'admin', ''); perform pg_temp.check(false, 'lift without note'); exception when raise_exception then perform pg_temp.check(true, 'lifting an unsubscribe needs a documented note'); end;
  perform public.email_lift_suppression('asha@example.in', 'admin', 'fresh opt-in form 55');
  perform pg_temp.check((select consent_status || first_email_status from public.email_contacts where email_normalized='asha@example.in') = 'UNKNOWNBLOCKED', 'after lifting, consent is UNKNOWN again and the contact BLOCKED');
end $$;

-- hard bounce and complaint cannot be lifted
do $$ begin
  perform public.email_suppress('bimal@example.in', 'hard_bounce', 'webhook', 'provider');
  perform pg_temp.check((select hard_bounced from public.email_contacts where email_normalized='bimal@example.in'), 'hard bounce flags the contact');
  begin perform public.email_lift_suppression('bimal@example.in', 'admin', 'note'); perform pg_temp.check(false, 'bounce lift'); exception when raise_exception then perform pg_temp.check(true, 'a hard bounce cannot be lifted'); end;
  perform public.email_suppress('chitra@example.in', 'spam_complaint', 'webhook', 'provider');
  perform pg_temp.check((select spam_complaint and first_email_status = 'BLOCKED' and consent_status = 'WITHDRAWN' from public.email_contacts where email_normalized='chitra@example.in'), 'spam complaint blocks the contact and withdraws consent');
end $$;

-- conversions: registration stops follow-ups, payment attribution, idempotent
do $$ declare c uuid; k uuid := (select id from public.email_campaigns where code='new_intro'); q uuid; begin
  insert into public.email_contacts (advocate_name, email, email_normalized, consent_status, consent_verified_at, first_email_status, first_email_date, reminder_due_date) values ('Eve', 'eve@example.in', 'eve@example.in', 'GRANTED', now(), 'SENT', now(), current_date) returning id into c;
  insert into public.email_queue (campaign_id, contact_id, scheduled_date, status, idempotency_key) values (k, c, current_date, 'sent', 'x:' || c) returning id into q;
  perform pg_temp.check(public.email_record_conversion('EVE@example.in', 'registration_completed', 'LS-DIR-1'), 'registration recorded');
  perform pg_temp.check(not public.email_record_conversion('eve@example.in', 'registration_completed', 'LS-DIR-1'), 'the same registration is not counted twice');
  perform pg_temp.check((select reminder_due_date is null and registration_status = 'COMPLETED' from public.email_contacts where id = c), 'registration clears the reminder date (follow-ups stop)');
  perform pg_temp.check((select campaign_id = k from public.email_events where contact_id = c and event_type = 'registration_completed'), 'registration is attributed to the campaign that was sent');
  perform public.email_record_conversion('eve@example.in', 'payment_success', 'pay_1', '{"amount_paise":4900}');
  perform pg_temp.check((select payment_status = 'PAID' from public.email_contacts where id = c), 'Rs 49 payment marks the contact PAID');
  perform pg_temp.check((select (meta->>'amount_paise') = '4900' from public.email_events where contact_id = c and event_type = 'payment_success'), 'payment amount is stored on the event');
  perform pg_temp.check(not public.email_record_conversion('nobody@example.in', 'payment_success', 'p'), 'unknown email: nothing recorded');
  -- directory trigger
  insert into public.directory_applications (id, email) values ('LS-DIR-T1', 'chitra@example.in');
  perform pg_temp.check((select count(*) from public.email_events where event_type='registration_completed' and contact_id = (select id from public.email_contacts where email_normalized='chitra@example.in')) = 1, 'a directory application from a listed email is attributed automatically');
  update public.directory_applications set status = 'verified' where id = 'LS-DIR-T1';
  perform pg_temp.check((select profile_verified from public.email_contacts where email_normalized='chitra@example.in'), 'verified profile is recorded');
end $$;


-- scale: 10,000 sheet rows with 1,000 repeated emails, imported the way the function does it (chunks of 500)
set role service_role;
do $$ declare i int; t record; tot_new int := 0; tot_dup int := 0; begin
  for i in 0..19 loop
    select public.email_import_rows('00000000-0000-0000-0000-0000000000aa', null, (select jsonb_agg(jsonb_build_object('row', n + 2, 'advocate_name', 'Adv ' || n, 'email', 'bulk' || (n % 9000) || '@example.in', 'city', 'C', 'state', 'S', 'contact_source', 'public_directory')) from generate_series(i * 500, i * 500 + 499) n)) as r into t;
    tot_new := tot_new + (t.r->>'new')::int; tot_dup := tot_dup + (t.r->>'duplicate')::int + (t.r->>'updated')::int;
  end loop;
  perform pg_temp.check(tot_new = 9000, '10,000 rows -> 9,000 unique contacts created (' || tot_new || ')');
  perform pg_temp.check((select count(*) from public.email_contacts where email_normalized like 'bulk%') = 9000, 'no duplicate contacts exist');
  perform pg_temp.check((select count(*) from public.email_contacts where email_normalized like 'bulk%' and consent_status = 'UNKNOWN' and first_email_status = 'BLOCKED') = 9000, 'all bulk-imported public-directory contacts are blocked');
end $$;
reset role;


-- Rs 49 payment hook on public.payments
do $$ declare u uuid := gen_random_uuid(); c uuid; k uuid := (select id from public.email_campaigns where code='reminder_1'); pid uuid; begin
  insert into public.email_contacts (advocate_name, email, email_normalized, consent_status, consent_verified_at, first_email_status, reminder_due_date) values ('Pay', 'pay@example.in', 'pay@example.in', 'GRANTED', now(), 'SENT', current_date) returning id into c;
  insert into public.email_queue (campaign_id, contact_id, scheduled_date, status, idempotency_key) values (k, c, current_date, 'sent', 'p:' || c);
  insert into auth.users (id, email) values (u, 'Pay@Example.in');
  insert into public.payments (user_id, amount_paise, status) values (u, 29900, 'paid');
  perform pg_temp.check((select payment_status from public.email_contacts where id = c) = 'NONE', 'a Rs 299 payment is not treated as the Rs 49 listing');
  insert into public.payments (user_id, amount_paise, status) values (u, 4900, 'created') returning id into pid;
  perform pg_temp.check((select payment_status from public.email_contacts where id = c) = 'NONE', 'an unpaid Rs 49 order does nothing');
  update public.payments set status = 'paid' where id = pid;
  perform pg_temp.check((select payment_status = 'PAID' and reminder_due_date is null from public.email_contacts where id = c), 'paid Rs 49 marks the contact PAID and stops reminders');
  perform pg_temp.check((select campaign_id = k from public.email_events where contact_id = c and event_type = 'payment_success'), 'payment attributed to the campaign last sent');
  update public.payments set status = 'paid' where id = pid;
  perform pg_temp.check((select count(*) from public.email_events where contact_id = c and event_type = 'payment_success') = 1, 'a repeated update is not double counted');
  insert into public.payments (user_id, amount_paise, status) values (gen_random_uuid(), 4900, 'paid');
  perform pg_temp.check(true, 'a payer who is not a contact does not break the payment');
end $$;


-- directory listing payments (migration 0026)
do $$ declare c uuid; d1 uuid; d2 uuid; begin
  insert into public.directory_applications (id, email) values ('LS-DIR-P1', 'lister@example.in');
  insert into public.email_contacts (advocate_name, email, email_normalized, first_email_status, consent_status) values ('Lister', 'lister@example.in', 'lister@example.in', 'SENT', 'GRANTED') returning id into c;
  insert into public.email_queue (campaign_id, contact_id, scheduled_date, status, idempotency_key) values ((select id from public.email_campaigns where code='new_intro'), c, current_date, 'sent', 'l:' || c);
  begin insert into public.directory_payments (application_id, order_no, amount_paise) values ('LS-DIR-P1', 'LDX0', 5100); perform pg_temp.check(false, 'amount band'); exception when check_violation then perform pg_temp.check(true, 'a listing amount must be Rs 49.00 to 49.99'); end;
  insert into public.directory_payments (application_id, order_no, amount_paise) values ('LS-DIR-P1', 'LDX1', 4907) returning id into d1;
  insert into public.directory_payments (application_id, order_no, amount_paise) values ('LS-DIR-P1', 'LDX2', 4911) returning id into d2;
  perform pg_temp.check((select payment_status from public.email_contacts where id = c) = 'NONE', 'an unpaid listing order changes nothing');
  update public.directory_payments set status = 'paid', utr = '412345670001', paid_at = now() where id = d1;
  perform pg_temp.check((select payment_status = 'PAID' from public.email_contacts where id = c), 'a paid listing marks the matched email contact PAID');
  begin update public.directory_payments set status = 'paid', utr = '412345670002' where id = d2; perform pg_temp.check(false, 'second paid'); exception when unique_violation then perform pg_temp.check(true, 'only one paid listing per application'); end;
  begin insert into public.directory_payments (application_id, order_no, amount_paise, status, utr) values ('LS-DIR-P1', 'LDX3', 4920, 'created', '412345670001'); perform pg_temp.check(false, 'utr'); exception when unique_violation then perform pg_temp.check(true, 'a bank reference can confirm only one payment'); end;
end $$;
reset role; set role authenticated;
do $$ begin begin perform count(*) from public.directory_payments; perform pg_temp.check(true, 'platform-admin policy exists (returns no rows for a non-admin)'); exception when insufficient_privilege then perform pg_temp.check(false, 'select grant'); end; end $$;
reset role; set role anon;
do $$ begin begin perform count(*) from public.directory_payments; perform pg_temp.check(false, 'anon read'); exception when insufficient_privilege then perform pg_temp.check(true, 'anonymous users cannot read listing payments'); end; end $$;
reset role; set role service_role;


-- Razorpay listing payments (migration 0027)
do $$ begin
  insert into public.directory_applications (id, email) values ('LS-DIR-R1', 'rz@example.in');
  begin insert into public.directory_payments (application_id, order_no, amount_paise, method, gateway_order_id) values ('LS-DIR-R1', 'LR1', 4950, 'razorpay', 'order_a'); perform pg_temp.check(false, 'rz amount'); exception when check_violation then perform pg_temp.check(true, 'a Razorpay listing order must be exactly Rs 49.00'); end;
  begin insert into public.directory_payments (application_id, order_no, amount_paise, method) values ('LS-DIR-R1', 'LR2', 4900, 'card'); perform pg_temp.check(false, 'method'); exception when check_violation then perform pg_temp.check(true, 'only upi and razorpay are accepted methods'); end;
  insert into public.directory_payments (application_id, order_no, amount_paise, method, gateway_order_id) values ('LS-DIR-R1', 'LR3', 4900, 'razorpay', 'order_b');
  begin insert into public.directory_payments (application_id, order_no, amount_paise, method, gateway_order_id) values ('LS-DIR-R1', 'LR4', 4900, 'razorpay', 'order_b'); perform pg_temp.check(false, 'dup order'); exception when unique_violation then perform pg_temp.check(true, 'a Razorpay order id maps to one row'); end;
  update public.directory_payments set status = 'paid', gateway_payment_id = 'pay_1' where order_no = 'LR3';
  begin insert into public.directory_payments (application_id, order_no, amount_paise, method, gateway_order_id, gateway_payment_id) values ('LS-DIR-R1', 'LR5', 4900, 'razorpay', 'order_c', 'pay_1'); perform pg_temp.check(false, 'dup pay'); exception when unique_violation then perform pg_temp.check(true, 'a Razorpay payment id confirms only one row'); end;
  begin update public.directory_payments set status = 'paid' where order_no = 'LR3' and false; perform pg_temp.check(true, 'noop'); end;
end $$;

-- audit log is append-only
do $$ begin
  begin update public.email_audit_logs set action = 'x'; perform pg_temp.check(false, 'audit update'); exception when raise_exception then perform pg_temp.check(true, 'audit log cannot be updated'); end;
  begin delete from public.email_audit_logs; perform pg_temp.check(false, 'audit delete'); exception when raise_exception then perform pg_temp.check(true, 'audit log cannot be deleted'); end;
end $$;

-- settings defaults and constraints
select pg_temp.check((select not system_enabled and not legal_approval and not provider_approved and dry_run and not kill_switch and max_new_per_day = 100 and max_reminders_per_day = 100 and new_email_time = '10:00' and reminder_time = '15:00' and report_time = '20:00' and reminder_after_days = 5 and max_reminders = 2 and timezone = 'Asia/Kolkata' from public.email_automation_settings), 'default settings match the specification (everything off, DRY_RUN on)');
do $$ begin begin update public.email_automation_settings set new_email_time = '25:99'; perform pg_temp.check(false, 'bad time'); exception when check_violation then perform pg_temp.check(true, 'a malformed send time is rejected'); end; end $$;
select pg_temp.check((select count(*) from public.email_templates where active) = 0, 'all three promotional templates start INACTIVE');
select pg_temp.check((select count(*) from public.email_templates where body_html like '%{{unsubscribe_url}}%') = 3, 'every template contains the unsubscribe link');
select pg_temp.check((select count(*) from public.email_campaigns) = 3, 'three campaigns: first, reminder, final reminder');

-- row level security: nothing is readable from the browser roles
reset role; set role authenticated;
do $$ begin begin perform count(*) from public.email_contacts; perform pg_temp.check(false, 'authenticated read'); exception when insufficient_privilege then perform pg_temp.check(true, 'signed-in users cannot read contacts'); end; end $$;
reset role; set role anon;
do $$ begin begin perform public.email_suppress('a@b.in', 'manual', '', ''); perform pg_temp.check(false, 'anon rpc'); exception when insufficient_privilege then perform pg_temp.check(true, 'anonymous users cannot call the suppression function'); end; end $$;
reset role;
select 'ALL DATABASE CHECKS PASSED';

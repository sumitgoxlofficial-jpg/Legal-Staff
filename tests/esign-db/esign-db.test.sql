\set ON_ERROR_STOP 0
create or replace function t(name text, ok boolean) returns void language plpgsql as $$ begin raise notice '% %', case when ok then '  ok  ' else '  FAIL' end, name; end $$;
insert into firms (id, name) values ('00000000-0000-0000-0000-00000000000a', 'A'), ('00000000-0000-0000-0000-00000000000b', 'B');
insert into members values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1');
insert into esign_requests (id, firm_id, created_by, title) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'NDA'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'Lease');
-- hash chain
insert into esign_events (request_id, firm_id, type, actor, data) select '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', x, 'system', jsonb_build_object('n', x) from unnest(array['created','sent','viewed']) x;
select t('events chain: three events verify', (esign_chain_check('10000000-0000-0000-0000-000000000001') ->> 'ok')::boolean and (esign_chain_check('10000000-0000-0000-0000-000000000001') ->> 'events')::int = 3);
select t('second event links to the first', (select e2.prev_hash = e1.hash from esign_events e1, esign_events e2 where e1.type='created' and e2.type='sent'));
do $$ begin update esign_events set actor = 'x'; perform t('events cannot be updated', false); exception when others then perform t('events cannot be updated', true); end $$;
do $$ begin delete from esign_events; perform t('events cannot be deleted', false); exception when others then perform t('events cannot be deleted', true); end $$;
-- tamper by bypassing the trigger (superuser) and detect
alter table esign_events disable trigger esign_events_frozen; update esign_events set data = '{"n":"forged"}' where type = 'sent'; alter table esign_events enable trigger esign_events_frozen;
select t('tampering is detected', (esign_chain_check('10000000-0000-0000-0000-000000000001') ->> 'ok')::boolean = false);
-- charging
select esign_add_credits('00000000-0000-0000-0000-00000000000a', 2, 'grant', null, 'test', null);
select t('free month first', (esign_charge('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', date_trunc('month', now()), 1, 0, 1, 0, true) ->> 'via') = 'free_month');
insert into esign_requests (id, firm_id, created_by, title) values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Second');
select t('then credits', (esign_charge('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000003', date_trunc('month', now()), 1, 0, 1, 0, true) ->> 'via') = 'credits');
select t('credit deducted', (select credits from esign_wallets where firm_id = '00000000-0000-0000-0000-00000000000a') = 1);
select esign_refund('10000000-0000-0000-0000-000000000003');
select t('refund returns credit', (select credits from esign_wallets where firm_id = '00000000-0000-0000-0000-00000000000a') = 2);
select t('refund clears sent_at', (select sent_at is null from esign_requests where id = '10000000-0000-0000-0000-000000000003'));
select t('limit enforced', (esign_charge('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000003', date_trunc('month', now()), 1, 0, 1, 1, true) ->> 'code') = 'limit');
select t('no credits refused', (esign_charge('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', date_trunc('month', now()), 0, 0, 1, 0, true) ->> 'code') = 'credits');
select t('free pricing mode charges nothing', (esign_charge('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', date_trunc('month', now()), 0, 0, 1, 0, false) ->> 'via') = 'none');
select esign_add_credits('00000000-0000-0000-0000-00000000000a', 5, 'purchase', '20000000-0000-0000-0000-000000000001', 'x', null);
select esign_add_credits('00000000-0000-0000-0000-00000000000a', 5, 'purchase', '20000000-0000-0000-0000-000000000001', 'x', null);
select t('a payment adds credits once', (select credits from esign_wallets where firm_id = '00000000-0000-0000-0000-00000000000a') = 7);
select esign_secret_set('docuseal', 'tok'); select t('secret stored', esign_secret_has('docuseal') and esign_secret_get('docuseal') = 'tok');
select esign_secret_set('docuseal', ''); select t('secret removed', not esign_secret_has('docuseal'));
-- row level security / firm isolation
set role authenticated; set test.uid = '00000000-0000-0000-0000-0000000000a1';
select t('member sees own firm requests only', (select count(*) from esign_requests) = 2 and (select bool_and(firm_id = '00000000-0000-0000-0000-00000000000a') from esign_requests));
select t('member sees own wallet only', (select count(*) from esign_wallets) = 1);
do $$ begin perform token_hash from esign_signers; perform t('token hashes are not readable', false); exception when others then perform t('token hashes are not readable', true); end $$;
do $$ begin perform doc_html from esign_requests; perform t('document html column not granted', false); exception when others then perform t('document html column not granted', true); end $$;
do $$ begin insert into esign_requests (firm_id, created_by, title) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'x'); perform t('members cannot write', false); exception when others then perform t('members cannot write', true); end $$;
do $$ begin perform * from esign_settings; perform t('settings not readable by members', false); exception when others then perform t('settings not readable by members', true); end $$;
do $$ begin perform esign_charge('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', now(), 0, 0, 0, 0, false); perform t('members cannot call charge', false); exception when others then perform t('members cannot call charge', true); end $$;
reset role; set role anon;
do $$ begin perform * from esign_requests; perform t('anon reads nothing', false); exception when others then perform t('anon reads nothing', true); end $$;

\echo --- budget: limit Rs 3.00 = 300 paise, detail costs 150
update api_budget_settings set monthly_budget_paise = 300, stop_on_limit = true, override_until = null;
select 'call1', public.court_budget_reserve('ecourtsindia','case_detail',150)->>'allow';
select 'call2', public.court_budget_reserve('ecourtsindia','case_detail',150)->>'allow';
select 'call3 (must be false)', public.court_budget_reserve('ecourtsindia','case_detail',150)->>'allow';
select 'refund then retry', (public.court_budget_refund('ecourtsindia','case_detail',150)), public.court_budget_reserve('ecourtsindia','case_detail',150)->>'allow';
update api_budget_settings set override_until = now() + interval '1 hour';
select 'override allows', public.court_budget_reserve('ecourtsindia','case_detail',150)->>'allow', public.court_budget_reserve('ecourtsindia','case_detail',150)->>'overridden';
select 'spent', sum(cost_paise) from api_cost_records;
\echo --- duplicate-request block
select 'first claim', public.court_claim('k1', 90);
select 'second claim (must be false)', public.court_claim('k1', 90);
select public.court_release('k1');
select 'after release', public.court_claim('k1', 90);
update api_inflight set locked_at = now() - interval '5 minutes';
select 'lapsed lock can be retaken', public.court_claim('k1', 90);
\echo --- append-only audit
insert into verification_logs (outcome) values ('ok');
do $$ begin begin update verification_logs set outcome='x'; raise notice 'UPDATE ALLOWED (bad)'; exception when others then raise notice 'update blocked: %', sqlerrm; end; end $$;
do $$ begin begin delete from verification_logs; raise notice 'DELETE ALLOWED (bad)'; exception when others then raise notice 'delete blocked: %', sqlerrm; end; end $$;
\echo --- key rotation (Vault)
select 'has key before', public.court_has_api_key();
select public.court_set_api_key('eci_live_TESTKEY1111');
select 'has key after', public.court_has_api_key(), public.court_api_key();
select public.court_set_api_key('eci_live_TESTKEY2222');
select 'rotated', public.court_api_key(), (select count(*) from vault.secrets where name='court_api_key') as rows_kept;
\echo --- RLS
insert into firms (id, name) values ('11111111-1111-1111-1111-111111111111','A'), ('22222222-2222-2222-2222-222222222222','B');
insert into members (firm_id, user_id) values ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001');
insert into legal_cases (firm_id, record_id, cnr) values ('11111111-1111-1111-1111-111111111111','c1','DLHC010000012024'), ('22222222-2222-2222-2222-222222222222','c2','DLHC010000022024');
grant select on all tables in schema public to authenticated; grant all on all tables in schema public to service_role;
set role authenticated; set test.uid = 'aaaaaaaa-0000-0000-0000-000000000001';
select 'member sees own firm only', count(*) from legal_cases;
select 'member cannot read usage logs', count(*) from api_usage_logs;
select 'member cannot read budget', count(*) from api_budget_settings;
select 'reference data readable', count(*) from tribunals;
do $$ begin begin insert into legal_cases (firm_id, record_id) values ('11111111-1111-1111-1111-111111111111','zz'); raise notice 'INSERT ALLOWED (bad)'; exception when others then raise notice 'insert blocked: %', sqlerrm; end; end $$;
do $$ begin begin perform public.court_api_key(); raise notice 'KEY READABLE (bad)'; exception when others then raise notice 'key fn blocked: %', sqlerrm; end; end $$;
reset role;

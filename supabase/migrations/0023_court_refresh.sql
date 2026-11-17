-- Legal Staff — remember when a refresh was requested from the court-data provider, so a second (separately billed) refresh
-- is not sent while the first is still running (the provider's refresh is queued and usually settles in 2 to 10 minutes).
-- Apply after 0022. Safe to run more than once.
alter table public.legal_cases add column if not exists refresh_requested_at timestamptz;

-- Integration test of 17 Nov 2026 (tests/README.md): the provider's case-detail call was run for a disposed High Court case (Delhi, DLHC) and a
-- pending district-court case (Delhi South-West, DLSW) and both were read completely. Only those two combinations are marked as tested.
-- Refresh, tribunals and the Supreme Court have NOT been exercised, so they stay unmarked.
update public.provider_capabilities
   set verified_at = coalesce(verified_at, '2026-11-17T11:30:00Z'), notes = 'Case detail tested live on 17 Nov 2026 (Delhi High Court, Delhi district court); other courts of this kind rely on the provider''s published coverage'
 where provider_key = 'ecourtsindia' and category in ('high_court', 'district') and court_code = '' and operation = 'case_detail';

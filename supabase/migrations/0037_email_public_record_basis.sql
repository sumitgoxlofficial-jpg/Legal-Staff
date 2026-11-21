-- Public-record basis for the directory campaign.
-- Contacts taken from an official government listing have not opted in to marketing. They are NOT recorded as consent GRANTED.
-- They get their own, honest basis (consent_status = 'PUBLIC_RECORD', audit purpose 'public_record') that only counts while the
-- administrator has switched allow_public_record on (with a documented reference). Unsubscribe, suppression, bounce, complaint and
-- conversion checks apply to them exactly as to everyone else.

alter table public.email_automation_settings add column if not exists allow_public_record boolean not null default false;
alter table public.email_automation_settings add column if not exists public_record_ref text not null default '';

alter table public.email_contacts drop constraint if exists email_contacts_consent_status_check;
alter table public.email_contacts add constraint email_contacts_consent_status_check check (consent_status in ('UNKNOWN', 'GRANTED', 'WITHDRAWN', 'PUBLIC_RECORD'));
alter table public.email_consents drop constraint if exists email_consents_purpose_check;
alter table public.email_consents add constraint email_consents_purpose_check check (purpose in ('marketing', 'transactional', 'public_record'));

-- Marks every contact that has no consent decision yet (UNKNOWN) as PUBLIC_RECORD, with the government page and the date it was checked
-- kept as evidence, and makes it eligible for the first email. Suppressed, unsubscribed, bounced, complained and invalid addresses are skipped.
create or replace function public.email_apply_public_record(p_source text, p_url text, p_checked timestamptz, p_by text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if coalesce(btrim(p_source), '') = '' or coalesce(btrim(p_url), '') = '' or p_checked is null then raise exception 'A public-record basis needs the source name, the page address and the date it was checked'; end if;
  with c as (
    select * from public.email_contacts k
    where k.consent_status = 'UNKNOWN' and k.unsubscribe_status = 'SUBSCRIBED' and not k.hard_bounced and not k.spam_complaint
      and k.registration_status = 'NONE' and k.payment_status = 'NONE'
      and k.email_normalized ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      and not exists (select 1 from public.email_suppressions s where s.email_normalized = k.email_normalized)
    for update
  ), ins as (
    insert into public.email_consents (contact_id, email, purpose, consent_source, wording_version, consented_at, verified_at, evidence_ref, recorded_by)
      select id, email_normalized, 'public_record', btrim(p_source), '', p_checked, null, btrim(p_url), coalesce(p_by, '') from c returning contact_id
  ), upd as (
    update public.email_contacts k set consent_status = 'PUBLIC_RECORD', consent_source = btrim(p_source), consent_timestamp = p_checked,
      first_email_status = case when k.first_email_status = 'BLOCKED' then 'ELIGIBLE' else k.first_email_status end, last_updated = now()
    where k.id in (select contact_id from ins) returning 1
  ) select count(*) into n from upd;
  insert into public.email_audit_logs (actor, action, target, details) values (coalesce(p_by, 'system'), 'public_record_applied', '', jsonb_build_object('source', p_source, 'url', p_url, 'contacts', n));
  return n;
end $$;
revoke all on function public.email_apply_public_record(text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.email_apply_public_record(text, text, timestamptz, text) to service_role;

-- Suppression also withdraws a public-record basis, so an unsubscribed person is never mailed again.
create or replace function public.email_suppress(p_email text, p_reason text, p_source text, p_actor text) returns void
language plpgsql security definer set search_path = public as $$
declare n text := public.email_norm(p_email); c public.email_contacts;
begin
  select * into c from public.email_contacts where email_normalized = n for update;
  insert into public.email_suppressions (email_normalized, contact_id, reason, source) values (n, c.id, p_reason, coalesce(p_source, ''))
    on conflict (email_normalized) do nothing;
  if c.id is not null then
    update public.email_contacts set
      unsubscribe_status = case when p_reason = 'unsubscribed' then 'UNSUBSCRIBED' else unsubscribe_status end,
      hard_bounced = hard_bounced or p_reason in ('hard_bounce', 'invalid'),
      spam_complaint = spam_complaint or p_reason = 'spam_complaint',
      first_email_status = case when first_email_status in ('ELIGIBLE', 'QUEUED') then 'BLOCKED' else first_email_status end,
      reminder_due_date = null, last_updated = now() where id = c.id;
    update public.email_queue set status = 'skipped', skip_reason = 'suppressed: ' || p_reason, updated_at = now() where contact_id = c.id and status = 'queued';
    update public.email_consents set withdrawn_at = coalesce(withdrawn_at, now()) where contact_id = c.id and purpose in ('marketing', 'public_record') and withdrawn_at is null and p_reason in ('unsubscribed', 'spam_complaint');
    if p_reason in ('unsubscribed', 'spam_complaint') then update public.email_contacts set consent_status = 'WITHDRAWN' where id = c.id; end if;
  end if;
  insert into public.email_audit_logs (actor, action, target, details) values (coalesce(p_actor, 'system'), 'suppressed', n, jsonb_build_object('reason', p_reason, 'source', p_source));
end $$;

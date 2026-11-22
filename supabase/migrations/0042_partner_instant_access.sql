-- Legal Staff — Partner Network: instant dashboard after sign-in, and editable page content. Apply after 0039 and 0041. Safe to run more than once.
--
--  * Setting auto_approve_partners (ON by default): a partner who has signed in with Google and filled in their details gets their partner ID,
--    referral link and dashboard at once. Switch it off in System Settings to go back to approving each application by hand.
--    Commission is not affected: it still needs counsel's recorded approval per category. Staff can suspend any partner.
--  * partner_content: the text of the public /partners page (hero, steps, benefits, FAQ, rewards note) that Super Admin / Marketing can edit
--    without a developer. The generated page carries the defaults (for search engines); the page shows these overrides once it loads.

insert into public.partner_settings (key, value, description) values
  ('auto_approve_partners', 'true', 'Give partners their ID, link and dashboard as soon as they have filled in their details. Off: each application waits for staff approval')
on conflict (key) do nothing;

create table if not exists public.partner_content (
  key text primary key check (key in ('hero_title', 'hero_lead', 'steps', 'benefits', 'faq', 'rewards_note')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.partner_content enable row level security;
revoke all on table public.partner_content from anon, authenticated;

-- Creates the partner from an application (used by staff approval and by automatic approval). Internal: not callable from the browser.
create or replace function public.ps_approve_application(p_id uuid, p_by text, p_note text default '', p_auto boolean default false) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.partner_applications; pid uuid; code text; pre text := coalesce(public.ps_txt('referral_code_prefix'), 'LS');
begin
  select * into a from public.partner_applications where id = p_id for update;
  if not found then raise exception 'Application not found.'; end if;
  if a.status not in ('applied', 'under_review') then raise exception 'This application is already %.', a.status; end if;
  if pre !~ '^[A-Z]{2,4}$' then pre := 'LS'; end if;
  code := pre || nextval('public.partner_code_seq')::text;
  insert into public.partners (code, user_id, application_id, name, email, mobile, state, district, city, category_key, organisation, designation, enrolment_no, approved_by)
  values (code, a.user_id, a.id, a.name, a.email, a.mobile, a.state, a.district, a.city, a.category_key, a.organisation, a.designation, a.enrolment_no, p_by) returning id into pid;
  update public.partner_applications set status = 'approved', review_note = coalesce(p_note, ''), reviewed_by = p_by, reviewed_at = now() where id = p_id;
  perform public.ps_notify(pid, 'application_approved', jsonb_build_object('name', a.name, 'code', code));
  perform public.ps_audit(case when p_auto then 'application.auto_approved' else 'application.approve' end, 'application', p_id::text, jsonb_build_object('note', p_note, 'partner_id', pid, 'code', code));
  return jsonb_build_object('ok', true, 'partner_id', pid, 'code', code);
end $$;

create or replace function public.admin_application_decide(p_id uuid, p_decision text, p_note text default '') returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.partner_applications; r jsonb;
begin
  perform public.ps_require('partners.manage');
  select * into a from public.partner_applications where id = p_id for update;
  if not found then raise exception 'Application not found.'; end if;
  if p_decision = 'review' then
    update public.partner_applications set status = 'under_review', reviewed_by = public.ps_email(), reviewed_at = now() where id = p_id and status = 'applied';
    perform public.ps_audit('application.review', 'application', p_id::text, jsonb_build_object('note', p_note));
    return jsonb_build_object('ok', true);
  elsif p_decision = 'approve' then
    return public.ps_approve_application(p_id, public.ps_email(), coalesce(p_note, ''), false);
  elsif p_decision = 'reject' then
    if a.status not in ('applied', 'under_review') then raise exception 'This application is already %.', a.status; end if;
    update public.partner_applications set status = 'rejected', review_note = coalesce(p_note, ''), reviewed_by = public.ps_email(), reviewed_at = now() where id = p_id;
    perform public.ps_audit('application.reject', 'application', p_id::text, jsonb_build_object('note', p_note));
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'Unknown decision.';
end $$;

-- Same validation as before; when automatic approval is on, the partner exists as soon as the details are saved.
create or replace function public.partner_apply(p jsonb) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := (select auth.uid()); em text := public.ps_email(); cat public.partner_categories; aid uuid; nm text := btrim(coalesce(p ->> 'name', '')); mb text := btrim(coalesce(p ->> 'mobile', ''));
begin
  if uid is null or em = '' then raise exception 'Sign in with Google, then submit the form.' using errcode = '28000'; end if;
  if not public.ps_flag('network_enabled') or not public.ps_flag('registration_open') then raise exception 'Partner registration is closed at the moment.'; end if;
  if not public.ps_rate('apply:' || uid::text, 5, interval '1 hour') then raise exception 'Too many attempts. Try again later.'; end if;
  if length(nm) < 2 or length(nm) > 120 then raise exception 'Enter your full name.'; end if;
  if length(public.ps_digits(mb)) not between 10 and 13 or public.ps_mobile10(mb) !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit Indian mobile number.'; end if;
  if btrim(coalesce(p ->> 'state', '')) = '' or btrim(coalesce(p ->> 'district', '')) = '' or btrim(coalesce(p ->> 'city', '')) = '' then raise exception 'Choose your state and enter your district and city.'; end if;
  if coalesce((p ->> 'accept_terms')::boolean, false) is not true or coalesce((p ->> 'accept_privacy')::boolean, false) is not true then raise exception 'Accept the partner terms and the privacy notice to continue.'; end if;
  select * into cat from public.partner_categories where key = p ->> 'category_key' and active and not archived;
  if not found then raise exception 'Choose a partner category.'; end if;
  if cat.requires_organisation and btrim(coalesce(p ->> 'organisation', '')) = '' then raise exception 'Enter your organisation or college name.'; end if;
  if cat.requires_designation and btrim(coalesce(p ->> 'designation', '')) = '' then raise exception 'Enter your professional designation.'; end if;
  if exists (select 1 from public.partners where user_id = uid) then raise exception 'You are already a partner.'; end if;
  begin
    insert into public.partner_applications (user_id, email, name, mobile, state, district, city, category_key, organisation, designation, enrolment_no, referral_source, terms_version)
    values (uid, em, nm, mb, btrim(p ->> 'state'), btrim(p ->> 'district'), btrim(p ->> 'city'), cat.key, left(btrim(coalesce(p ->> 'organisation', '')), 160), left(btrim(coalesce(p ->> 'designation', '')), 120),
      left(btrim(coalesce(p ->> 'enrolment_no', '')), 40), left(btrim(coalesce(p ->> 'referral_source', '')), 160), public.ps_txt('terms_version')) returning id into aid;
  exception when unique_violation then raise exception 'An application with this email or mobile number already exists.'; end;
  insert into public.partner_terms_acceptance (user_id, application_id, kind, version) values (uid, aid, 'terms', public.ps_txt('terms_version')), (uid, aid, 'privacy', public.ps_txt('privacy_version'));
  perform public.ps_audit('application.submitted', 'application', aid::text, jsonb_build_object('category', cat.key, 'state', p ->> 'state'));
  if public.ps_flag('auto_approve_partners') then perform public.ps_approve_application(aid, 'automatic', 'Approved automatically', true); end if;
  return aid;
end $$;

-- ---------- editable page content ----------
create or replace function public.partner_public_content() returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select jsonb_object_agg(key, value) from public.partner_content), '{}'::jsonb) $$;

create or replace function public.admin_content() returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  perform public.ps_require('partners.view');
  return jsonb_build_object('overrides', public.partner_public_content(), 'can_edit', public.ps_can('marketing.manage'));
end $$;

-- p_value null removes the override (the page goes back to its built-in text).
create or replace function public.admin_content_save(p_key text, p_value jsonb) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare i jsonb; bad boolean := false; lim int;
begin
  perform public.ps_require('marketing.manage');
  if p_key not in ('hero_title', 'hero_lead', 'steps', 'benefits', 'faq', 'rewards_note') then raise exception 'Unknown content block.'; end if;
  if p_value is null or p_value = 'null'::jsonb then
    delete from public.partner_content where key = p_key;
  else
    lim := case p_key when 'hero_title' then 120 when 'hero_lead' then 300 when 'rewards_note' then 1500 when 'faq' then 20 else 8 end;
    if p_key in ('hero_title', 'hero_lead', 'rewards_note') then
      if jsonb_typeof(p_value) <> 'string' or length(btrim(p_value #>> '{}')) < 2 or length(p_value #>> '{}') > lim then raise exception 'This text must be between 2 and % characters.', lim; end if;
    else
      if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) not between 1 and lim then raise exception 'Add between 1 and % items.', lim; end if;
      for i in select * from jsonb_array_elements(p_value) loop
        if p_key = 'faq' then
          bad := bad or jsonb_typeof(i) <> 'object' or length(btrim(coalesce(i ->> 'q', ''))) < 3 or length(btrim(coalesce(i ->> 'a', ''))) < 3 or length(i ->> 'q') > 200 or length(i ->> 'a') > 1500;
        else
          bad := bad or jsonb_typeof(i) <> 'object' or length(btrim(coalesce(i ->> 'title', ''))) < 2 or length(btrim(coalesce(i ->> 'text', ''))) < 2 or length(i ->> 'title') > 120 or length(i ->> 'text') > 600;
        end if;
      end loop;
      if bad then raise exception 'Every item needs its text filled in (and not too long).'; end if;
    end if;
    insert into public.partner_content (key, value, updated_by) values (p_key, p_value, (select auth.uid())) on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  end if;
  perform public.ps_audit('content.saved', 'content', p_key, jsonb_build_object('removed', p_value is null));
end $$;

-- who may call what
revoke all on function public.ps_approve_application(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.admin_application_decide(uuid, text, text), public.partner_apply(jsonb), public.partner_public_content(), public.admin_content(), public.admin_content_save(text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_application_decide(uuid, text, text), public.partner_apply(jsonb), public.admin_content(), public.admin_content_save(text, jsonb) to authenticated;
grant execute on function public.partner_public_content() to anon, authenticated;

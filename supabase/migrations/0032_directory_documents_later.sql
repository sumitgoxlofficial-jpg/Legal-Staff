-- Legal Staff — an advocate may skip the documents at signup and upload them later; they are reminded by email until they do.
--  * directory_set_documents(): the owner replaces the recorded documents (paths of the uploaded files) while the application
--    is waiting or needs information; it goes back to 'pending' so the automatic check runs on the new files.
--  * doc_reminders / last_reminder_at: how many "upload your documents" emails were sent (functions/directory-verify, at most 3).
alter table public.directory_applications add column if not exists doc_reminders integer not null default 0;
alter table public.directory_applications add column if not exists last_reminder_at timestamptz;

create or replace function public.directory_set_documents(p_ref text, p_documents jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.directory_applications a
     set details = jsonb_set(coalesce(a.details, '{}'::jsonb), '{documents}', coalesce(p_documents, '[]'::jsonb)),
         status = 'pending', note = '', decided_at = null, decided_by = null
   where a.id = trim(p_ref) and a.user_id = (select auth.uid()) and a.status in ('pending', 'info');
  return found;
end $$;
revoke execute on function public.directory_set_documents(text, jsonb) from public, anon;
grant execute on function public.directory_set_documents(text, jsonb) to authenticated;

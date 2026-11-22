-- Legal Staff — private storage for the documents an advocate uploads to prove their enrolment, reviewed in the admin console.
--  * Bucket `directory-docs` is private. Object path: <user id>/<application id>/<kind>-<file name>, kind = cert | cop | id.
--  * The applicant can upload, replace, read and delete files in their own folder only.
--  * Moderators open them through short-lived signed links made by functions/admin (service role); no public access, and
--    the documents are never shown on a public profile. Re-runnable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('directory-docs', 'directory-docs', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'];

drop policy if exists dirdocs_read on storage.objects;
create policy dirdocs_read on storage.objects for select to authenticated
  using (bucket_id = 'directory-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists dirdocs_write on storage.objects;
create policy dirdocs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'directory-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists dirdocs_update on storage.objects;
create policy dirdocs_update on storage.objects for update to authenticated
  using (bucket_id = 'directory-docs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'directory-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists dirdocs_delete on storage.objects;
create policy dirdocs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'directory-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

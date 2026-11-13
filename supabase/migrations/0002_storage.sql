-- Private bucket for case documents. Object path: <firm_id>/<document_id>/<file name>.
insert into storage.buckets (id, name, public, file_size_limit) values ('documents', 'documents', false, 26214400) on conflict (id) do nothing;

create policy documents_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy documents_write on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy documents_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_member(((storage.foldername(name))[1])::uuid));

-- Private IntelliDrive access: every object is stored beneath the authenticated owner's UUID.
-- The company-documents bucket remains private; no public or cross-user access is granted.

drop policy if exists "company documents owner read" on storage.objects;
create policy "company documents owner read"
on storage.objects for select to authenticated
using (bucket_id = 'company-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "company documents owner upload" on storage.objects;
create policy "company documents owner upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'company-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "company documents owner update" on storage.objects;
create policy "company documents owner update"
on storage.objects for update to authenticated
using (bucket_id = 'company-documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'company-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "company documents owner delete" on storage.objects;
create policy "company documents owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'company-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "files metadata owner delete" on public.files_metadata;
create policy "files metadata owner delete"
on public.files_metadata for delete to authenticated
using (uploaded_by = (select auth.uid()));

comment on policy "company documents owner read" on storage.objects is
'Allows authenticated users to read only company-document objects in their own UUID folder.';
comment on policy "files metadata owner delete" on public.files_metadata is
'Allows an uploader to remove only their own file index metadata.';

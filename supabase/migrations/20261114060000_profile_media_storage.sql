-- Keep profile media private and scoped to the authenticated user's own UUID folder.
alter table public.profiles
  add column if not exists avatar_storage_path text,
  add column if not exists background_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-profile-media',
  'user-profile-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile media owner read" on storage.objects;
create policy "profile media owner read"
on storage.objects for select to authenticated
using (bucket_id = 'user-profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "profile media owner upload" on storage.objects;
create policy "profile media owner upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'user-profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "profile media owner update" on storage.objects;
create policy "profile media owner update"
on storage.objects for update to authenticated
using (bucket_id = 'user-profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'user-profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "profile media owner delete" on storage.objects;
create policy "profile media owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'user-profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

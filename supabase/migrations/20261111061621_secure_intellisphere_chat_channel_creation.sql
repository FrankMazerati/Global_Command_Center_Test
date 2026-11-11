create or replace function private.can_create_intellisphere_chat_channel(
 p_organization_id uuid,
 p_tenant_id uuid,
 p_created_by_profile_id uuid,
 p_channel_type text
)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
 select auth.uid() is not null
 and p_created_by_profile_id = auth.uid()
 and p_channel_type = 'group'
 and exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.member_status = 'active'
  and p.organization_id = p_organization_id
  and p.tenant_id is not distinct from p_tenant_id
 );
$$;
revoke all on function private.can_create_intellisphere_chat_channel(uuid,uuid,uuid,text) from public, anon;
grant execute on function private.can_create_intellisphere_chat_channel(uuid,uuid,uuid,text) to authenticated;
drop policy if exists intellisphere_chat_channels_insert_creator on public.intellisphere_chat_channels;
create policy intellisphere_chat_channels_insert_creator
 on public.intellisphere_chat_channels for insert to authenticated
 with check ((select private.can_create_intellisphere_chat_channel(
  organization_id,tenant_id,created_by_profile_id,channel_type
 )));

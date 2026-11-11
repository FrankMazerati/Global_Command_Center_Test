drop function if exists public.create_intellisphere_chat_channel(text,text,uuid[]);
drop function if exists public.add_intellisphere_chat_member(uuid,uuid);
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_intellisphere_chat_member(p_channel_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public, auth as $$
 select auth.uid() is not null and exists (select 1 from public.intellisphere_chat_members m
 join public.profiles p on p.id = m.profile_id where m.channel_id = p_channel_id and m.profile_id = auth.uid()
 and m.left_at is null and p.member_status = 'active');
$$;
revoke all on function private.is_intellisphere_chat_member(uuid) from public, anon;
grant execute on function private.is_intellisphere_chat_member(uuid) to authenticated;
create policy intellisphere_chat_channels_insert_creator on public.intellisphere_chat_channels for insert to authenticated with check (
 created_by_profile_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid())
 and p.member_status = 'active' and p.organization_id = intellisphere_chat_channels.organization_id
 and p.tenant_id is not distinct from intellisphere_chat_channels.tenant_id));
create policy intellisphere_chat_members_insert_same_scope on public.intellisphere_chat_members for insert to authenticated with check (
 exists (select 1 from public.intellisphere_chat_channels c join public.profiles target on target.id = intellisphere_chat_members.profile_id
 where c.id = intellisphere_chat_members.channel_id and target.member_status = 'active'
 and target.organization_id = c.organization_id and target.tenant_id is not distinct from c.tenant_id
 and (c.created_by_profile_id = (select auth.uid()) or (select private.is_intellisphere_chat_member(c.id)))));
grant insert on public.intellisphere_chat_channels to authenticated;
grant insert on public.intellisphere_chat_members to authenticated;

-- Restrict channel metadata updates to fields users are meant to edit.
drop policy if exists intellisphere_chat_channels_update_creator on public.intellisphere_chat_channels;
create policy intellisphere_chat_channels_update_creator on public.intellisphere_chat_channels for update to authenticated
using (created_by_profile_id = (select auth.uid()) and exists (
 select 1 from public.profiles p where p.id = (select auth.uid()) and p.member_status = 'active'
 and p.organization_id = intellisphere_chat_channels.organization_id
 and p.tenant_id is not distinct from intellisphere_chat_channels.tenant_id))
with check (created_by_profile_id = (select auth.uid()) and exists (
 select 1 from public.profiles p where p.id = (select auth.uid()) and p.member_status = 'active'
 and p.organization_id = intellisphere_chat_channels.organization_id
 and p.tenant_id is not distinct from intellisphere_chat_channels.tenant_id));
revoke update on public.intellisphere_chat_channels from authenticated;
grant update (name, description, updated_at, archived_at) on public.intellisphere_chat_channels to authenticated;

-- A message sender can edit only their own text in a channel they still belong to.
drop policy if exists intellisphere_chat_messages_update_sender on public.intellisphere_chat_messages;
create policy intellisphere_chat_messages_update_sender on public.intellisphere_chat_messages for update to authenticated
using (sender_profile_id = (select auth.uid()) and exists (
 select 1 from public.intellisphere_chat_members m join public.profiles p on p.id = m.profile_id
 where m.channel_id = intellisphere_chat_messages.channel_id and m.profile_id = (select auth.uid()) and m.left_at is null
 and p.member_status = 'active' and p.organization_id = intellisphere_chat_messages.organization_id
 and p.tenant_id is not distinct from intellisphere_chat_messages.tenant_id))
with check (sender_profile_id = (select auth.uid()) and message_type = 'text' and exists (
 select 1 from public.intellisphere_chat_members m join public.profiles p on p.id = m.profile_id
 where m.channel_id = intellisphere_chat_messages.channel_id and m.profile_id = (select auth.uid()) and m.left_at is null
 and p.member_status = 'active' and p.organization_id = intellisphere_chat_messages.organization_id
 and p.tenant_id is not distinct from intellisphere_chat_messages.tenant_id));
revoke update on public.intellisphere_chat_messages from authenticated;
grant update (body, edited_at, deleted_at) on public.intellisphere_chat_messages to authenticated;

-- Only group channels are currently available from the client UI.
drop policy if exists intellisphere_chat_channels_insert_creator on public.intellisphere_chat_channels;
create policy intellisphere_chat_channels_insert_creator on public.intellisphere_chat_channels for insert to authenticated
with check (channel_type = 'group' and created_by_profile_id = (select auth.uid()) and exists (
 select 1 from public.profiles p where p.id = (select auth.uid()) and p.member_status = 'active'
 and p.organization_id = intellisphere_chat_channels.organization_id
 and p.tenant_id is not distinct from intellisphere_chat_channels.tenant_id));

-- Client-originated messages must be ordinary text; system events remain server-controlled.
drop policy if exists intellisphere_chat_messages_insert_member on public.intellisphere_chat_messages;
create policy intellisphere_chat_messages_insert_member on public.intellisphere_chat_messages for insert to authenticated
with check (message_type = 'text' and sender_profile_id = (select auth.uid()) and exists (
 select 1 from public.intellisphere_chat_members m
 join public.intellisphere_chat_channels c on c.id = m.channel_id
 join public.profiles p on p.id = m.profile_id
 where m.channel_id = intellisphere_chat_messages.channel_id and m.profile_id = (select auth.uid()) and m.left_at is null
 and c.organization_id = intellisphere_chat_messages.organization_id
 and c.tenant_id is not distinct from intellisphere_chat_messages.tenant_id and c.archived_at is null
 and p.member_status = 'active' and p.organization_id = c.organization_id
 and p.tenant_id is not distinct from c.tenant_id));

create or replace function private.can_invite_intellisphere_chat_member(p_channel_id uuid, p_profile_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public, auth as $$
 select auth.uid() is not null and exists (
 select 1 from public.intellisphere_chat_channels c
 join public.profiles actor on actor.id = auth.uid()
 join public.profiles target on target.id = p_profile_id
 where c.id = p_channel_id and c.archived_at is null
 and actor.member_status = 'active' and target.member_status = 'active'
 and actor.organization_id = c.organization_id and actor.tenant_id is not distinct from c.tenant_id
 and target.organization_id = c.organization_id and target.tenant_id is not distinct from c.tenant_id
 and (c.created_by_profile_id = auth.uid() or exists (
 select 1 from public.intellisphere_chat_members m
 where m.channel_id = c.id and m.profile_id = auth.uid() and m.left_at is null)));
$$;
drop function if exists private.is_intellisphere_chat_member(uuid);

drop policy if exists intellisphere_chat_members_insert_same_scope on public.intellisphere_chat_members;
create or replace function private.can_invite_intellisphere_chat_member(p_channel_id uuid, p_profile_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public, auth as $$
 select auth.uid() is not null and exists (
 select 1 from public.intellisphere_chat_channels c join public.profiles actor on actor.id = auth.uid()
 join public.profiles target on target.id = p_profile_id where c.id = p_channel_id and actor.member_status = 'active'
 and target.member_status = 'active' and actor.organization_id = c.organization_id
 and actor.tenant_id is not distinct from c.tenant_id and target.organization_id = c.organization_id
 and target.tenant_id is not distinct from c.tenant_id and (c.created_by_profile_id = auth.uid() or exists (
 select 1 from public.intellisphere_chat_members m where m.channel_id = c.id and m.profile_id = auth.uid() and m.left_at is null)));
$$;
revoke all on function private.can_invite_intellisphere_chat_member(uuid,uuid) from public, anon;
grant execute on function private.can_invite_intellisphere_chat_member(uuid,uuid) to authenticated;
create policy intellisphere_chat_members_insert_same_scope on public.intellisphere_chat_members for insert to authenticated
with check ((select private.can_invite_intellisphere_chat_member(channel_id, profile_id)));

drop policy if exists assistant_messages_session_owner_scope on public.assistant_messages;

create policy assistant_messages_owner_read
on public.assistant_messages
for select to authenticated
using (
  exists (
    select 1 from public.assistant_sessions s
    join public.profiles p on p.id=s.profile_id
    where s.id=assistant_messages.session_id
      and s.profile_id=(select auth.uid())
      and p.member_status='active'
      and p.organization_id=s.organization_id
      and p.tenant_id is not distinct from s.tenant_id
  )
);

create policy assistant_messages_user_insert
on public.assistant_messages
for insert to authenticated
with check (
  sender_type='user'
  and exists (
    select 1 from public.assistant_sessions s
    join public.profiles p on p.id=s.profile_id
    where s.id=assistant_messages.session_id
      and s.profile_id=(select auth.uid())
      and s.session_status='active'
      and p.member_status='active'
      and p.organization_id=s.organization_id
      and p.tenant_id is not distinct from s.tenant_id
  )
);

revoke update, delete on public.assistant_messages from authenticated;
grant select, insert on public.assistant_messages to authenticated;

drop policy if exists assistant_sessions_owner_scope on public.assistant_sessions;
create policy assistant_sessions_owner_scope
on public.assistant_sessions
for all to authenticated
using (
  profile_id=(select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid())
      and p.member_status='active'
      and p.organization_id=assistant_sessions.organization_id
      and p.tenant_id is not distinct from assistant_sessions.tenant_id
  )
)
with check (
  profile_id=(select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid())
      and p.member_status='active'
      and p.organization_id=assistant_sessions.organization_id
      and p.tenant_id is not distinct from assistant_sessions.tenant_id
  )
);

create or replace function public.ensure_chat_buddy_welcome_message(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.assistant_sessions s
    join public.assistants a on a.id=s.assistant_id
    join public.profiles p on p.id=s.profile_id
    where s.id=p_session_id
      and s.profile_id=auth.uid()
      and s.session_status='active'
      and p.member_status='active'
      and p.organization_id=s.organization_id
      and p.tenant_id is not distinct from s.tenant_id
      and a.assistant_key='helpbuddy'
      and a.status='active'
  ) then
    raise exception 'The requested Chat Buddy session is not available to this account.' using errcode='42501';
  end if;

  insert into public.assistant_messages (
    session_id,sender_type,content,message_kind,intent_key,sensitivity
  )
  values (
    p_session_id,
    'assistant',
    'Hi, I’m Chat Buddy. I can help organize your work and prepare next steps within your access. Your messages and checklists can be saved here. Live AI response generation is not connected in this workspace yet.',
    'chat',
    'chat_buddy_welcome_v1',
    'standard'
  )
  on conflict (session_id) where intent_key='chat_buddy_welcome_v1'
  do nothing
  returning id into v_message_id;

  if v_message_id is null then
    select id into v_message_id
    from public.assistant_messages
    where session_id=p_session_id and intent_key='chat_buddy_welcome_v1'
    limit 1;
  end if;

  return v_message_id;
end;
$$;

revoke all on function public.ensure_chat_buddy_welcome_message(uuid) from public, anon;
grant execute on function public.ensure_chat_buddy_welcome_message(uuid) to authenticated;

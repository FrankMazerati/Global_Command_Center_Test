create table if not exists public.intellisphere_documents (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 tenant_id uuid references public.tenants(id) on delete cascade,
 owner_profile_id uuid not null references public.profiles(id) on delete cascade,
 document_type text not null default 'intelliword' check (document_type in ('intelliword','intellisheets','intellislides','intellinotes')),
 title text not null default 'Untitled document' check (char_length(title) between 1 and 500),
 content_markdown text not null default '',
 version integer not null default 1 check (version > 0),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz
);
create index if not exists intellisphere_documents_owner_updated_idx on public.intellisphere_documents (owner_profile_id, updated_at desc) where deleted_at is null;
create index if not exists intellisphere_documents_org_tenant_idx on public.intellisphere_documents (organization_id, tenant_id);
alter table public.intellisphere_documents enable row level security;
create policy intellisphere_documents_select_owner_scope on public.intellisphere_documents for select to authenticated using (
 owner_profile_id = (select auth.uid()) and deleted_at is null
 and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.member_status = 'active'
 and p.organization_id = intellisphere_documents.organization_id
 and (intellisphere_documents.tenant_id is null or p.tenant_id = intellisphere_documents.tenant_id))
);
create policy intellisphere_documents_insert_owner_scope on public.intellisphere_documents for insert to authenticated with check (
 owner_profile_id = (select auth.uid())
 and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.member_status = 'active'
 and p.organization_id = intellisphere_documents.organization_id
 and (intellisphere_documents.tenant_id is null or p.tenant_id = intellisphere_documents.tenant_id))
);
create policy intellisphere_documents_update_owner_scope on public.intellisphere_documents for update to authenticated
 using (owner_profile_id = (select auth.uid()) and deleted_at is null
 and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.member_status = 'active'
 and p.organization_id = intellisphere_documents.organization_id
 and (intellisphere_documents.tenant_id is null or p.tenant_id = intellisphere_documents.tenant_id)))
 with check (owner_profile_id = (select auth.uid())
 and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.member_status = 'active'
 and p.organization_id = intellisphere_documents.organization_id
 and (intellisphere_documents.tenant_id is null or p.tenant_id = intellisphere_documents.tenant_id)));
create policy intellisphere_documents_delete_owner_scope on public.intellisphere_documents for delete to authenticated using (owner_profile_id = (select auth.uid()));

create table if not exists public.intellisphere_chat_channels (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 tenant_id uuid references public.tenants(id) on delete cascade,
 channel_type text not null default 'group' check (channel_type in ('group','direct','team')),
 name text not null check (char_length(name) between 1 and 120),
 description text not null default '',
 created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 archived_at timestamptz
);
create table if not exists public.intellisphere_chat_members (
 channel_id uuid not null references public.intellisphere_chat_channels(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 joined_at timestamptz not null default now(),
 left_at timestamptz,
 primary key (channel_id, profile_id)
);
create index if not exists intellisphere_chat_members_profile_idx on public.intellisphere_chat_members (profile_id, channel_id) where left_at is null;
create table if not exists public.intellisphere_chat_messages (
 id uuid primary key default gen_random_uuid(),
 channel_id uuid not null references public.intellisphere_chat_channels(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 tenant_id uuid references public.tenants(id) on delete cascade,
 sender_profile_id uuid not null references public.profiles(id) on delete cascade,
 message_type text not null default 'text' check (message_type in ('text','system')),
 body text not null check (char_length(body) between 1 and 20000),
 reply_to_message_id uuid references public.intellisphere_chat_messages(id) on delete set null,
 created_at timestamptz not null default now(),
 edited_at timestamptz,
 deleted_at timestamptz
);
create index if not exists intellisphere_chat_messages_channel_created_idx on public.intellisphere_chat_messages (channel_id, created_at desc) where deleted_at is null;
alter table public.intellisphere_chat_channels enable row level security;
alter table public.intellisphere_chat_members enable row level security;
alter table public.intellisphere_chat_messages enable row level security;
create policy intellisphere_chat_channels_read_member on public.intellisphere_chat_channels for select to authenticated using (
 archived_at is null and exists (select 1 from public.intellisphere_chat_members m join public.profiles p on p.id = m.profile_id
 where m.channel_id = intellisphere_chat_channels.id and m.profile_id = (select auth.uid()) and m.left_at is null
 and p.member_status = 'active' and p.organization_id = intellisphere_chat_channels.organization_id
 and (intellisphere_chat_channels.tenant_id is null or p.tenant_id = intellisphere_chat_channels.tenant_id))
);
create policy intellisphere_chat_channels_update_creator on public.intellisphere_chat_channels for update to authenticated using (created_by_profile_id = (select auth.uid())) with check (created_by_profile_id = (select auth.uid()));
create policy intellisphere_chat_channels_delete_creator on public.intellisphere_chat_channels for delete to authenticated using (created_by_profile_id = (select auth.uid()));
create policy intellisphere_chat_members_read_self on public.intellisphere_chat_members for select to authenticated using (profile_id = (select auth.uid()) and left_at is null);
create policy intellisphere_chat_messages_read_member on public.intellisphere_chat_messages for select to authenticated using (
 deleted_at is null and exists (select 1 from public.intellisphere_chat_members m join public.profiles p on p.id = m.profile_id
 where m.channel_id = intellisphere_chat_messages.channel_id and m.profile_id = (select auth.uid()) and m.left_at is null
 and p.member_status = 'active' and p.organization_id = intellisphere_chat_messages.organization_id
 and (intellisphere_chat_messages.tenant_id is null or p.tenant_id = intellisphere_chat_messages.tenant_id))
);
create policy intellisphere_chat_messages_insert_member on public.intellisphere_chat_messages for insert to authenticated with check (
 sender_profile_id = (select auth.uid()) and exists (
 select 1 from public.intellisphere_chat_members m join public.intellisphere_chat_channels c on c.id = m.channel_id
 join public.profiles p on p.id = m.profile_id
 where m.channel_id = intellisphere_chat_messages.channel_id and m.profile_id = (select auth.uid()) and m.left_at is null
 and c.organization_id = intellisphere_chat_messages.organization_id and c.tenant_id is not distinct from intellisphere_chat_messages.tenant_id
 and p.member_status = 'active' and p.organization_id = c.organization_id and (c.tenant_id is null or p.tenant_id = c.tenant_id))
);
create policy intellisphere_chat_messages_update_sender on public.intellisphere_chat_messages for update to authenticated using (sender_profile_id = (select auth.uid())) with check (sender_profile_id = (select auth.uid()));
create policy intellisphere_chat_messages_delete_sender on public.intellisphere_chat_messages for delete to authenticated using (sender_profile_id = (select auth.uid()));

create or replace function public.create_intellisphere_chat_channel(p_name text, p_channel_type text default 'group', p_member_profile_ids uuid[] default '{}'::uuid[])
returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth as $$
declare v_actor uuid := auth.uid(); v_profile public.profiles%rowtype; v_channel_id uuid; v_requested_count integer; v_valid_count integer;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
 if p_channel_type not in ('group','direct','team') then raise exception 'Unsupported channel type' using errcode = '22023'; end if;
 if char_length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'Channel name must contain 1 to 120 characters' using errcode = '22023'; end if;
 if coalesce(cardinality(p_member_profile_ids),0) > 49 then raise exception 'A channel can include at most 50 members' using errcode = '22023'; end if;
 select * into v_profile from public.profiles where id = v_actor and member_status = 'active';
 if not found then raise exception 'An active organization profile is required' using errcode = '42501'; end if;
 select count(distinct x) into v_requested_count from unnest(coalesce(p_member_profile_ids,'{}'::uuid[])) as x where x is not null and x <> v_actor;
 select count(*) into v_valid_count from public.profiles p where p.id = any(coalesce(p_member_profile_ids,'{}'::uuid[])) and p.id <> v_actor
 and p.member_status = 'active' and p.organization_id = v_profile.organization_id and p.tenant_id is not distinct from v_profile.tenant_id;
 if v_requested_count <> v_valid_count then raise exception 'Every invited member must be active in the same organization and tenant' using errcode = '42501'; end if;
 insert into public.intellisphere_chat_channels (organization_id, tenant_id, channel_type, name, created_by_profile_id)
 values (v_profile.organization_id, v_profile.tenant_id, p_channel_type, trim(p_name), v_actor) returning id into v_channel_id;
 insert into public.intellisphere_chat_members (channel_id, profile_id) values (v_channel_id, v_actor) on conflict do nothing;
 insert into public.intellisphere_chat_members (channel_id, profile_id)
 select v_channel_id, p.id from public.profiles p where p.id = any(coalesce(p_member_profile_ids,'{}'::uuid[])) and p.id <> v_actor
 and p.member_status = 'active' and p.organization_id = v_profile.organization_id and p.tenant_id is not distinct from v_profile.tenant_id on conflict do nothing;
 return v_channel_id;
end; $$;
create or replace function public.add_intellisphere_chat_member(p_channel_id uuid, p_profile_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, auth as $$
declare v_actor uuid := auth.uid(); v_channel public.intellisphere_chat_channels%rowtype; v_target public.profiles%rowtype; v_actor_is_member boolean;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
 select * into v_channel from public.intellisphere_chat_channels where id = p_channel_id and archived_at is null;
 if not found then raise exception 'Channel not found' using errcode = 'P0002'; end if;
 select exists (select 1 from public.intellisphere_chat_members m where m.channel_id = p_channel_id and m.profile_id = v_actor and m.left_at is null) into v_actor_is_member;
 if v_channel.created_by_profile_id <> v_actor and not v_actor_is_member then raise exception 'Only channel members can invite participants' using errcode = '42501'; end if;
 select * into v_target from public.profiles where id = p_profile_id and member_status = 'active' and organization_id = v_channel.organization_id and tenant_id is not distinct from v_channel.tenant_id;
 if not found then raise exception 'Invitee must be active in the same organization and tenant' using errcode = '42501'; end if;
 insert into public.intellisphere_chat_members (channel_id, profile_id) values (p_channel_id, p_profile_id)
 on conflict (channel_id, profile_id) do update set left_at = null, joined_at = now();
end; $$;
revoke all on function public.create_intellisphere_chat_channel(text,text,uuid[]) from public, anon;
revoke all on function public.add_intellisphere_chat_member(uuid,uuid) from public, anon;
grant execute on function public.create_intellisphere_chat_channel(text,text,uuid[]) to authenticated;
grant execute on function public.add_intellisphere_chat_member(uuid,uuid) to authenticated;
revoke all on public.intellisphere_documents from public, anon;
revoke all on public.intellisphere_chat_channels from public, anon;
revoke all on public.intellisphere_chat_members from public, anon;
revoke all on public.intellisphere_chat_messages from public, anon;
grant select, insert, update, delete on public.intellisphere_documents to authenticated;
grant select, update, delete on public.intellisphere_chat_channels to authenticated;
grant select on public.intellisphere_chat_members to authenticated;
grant select, insert, update, delete on public.intellisphere_chat_messages to authenticated;
do $$ begin
 if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
 select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'intellisphere_chat_messages')
 then execute 'alter publication supabase_realtime add table public.intellisphere_chat_messages'; end if;
end $$;

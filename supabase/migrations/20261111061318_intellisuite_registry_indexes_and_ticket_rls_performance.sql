-- Index foreign keys used by document ownership, organization scope, chat membership, and reply cleanup.
create index if not exists intellisphere_documents_tenant_fk_idx on public.intellisphere_documents (tenant_id);
create index if not exists intellisphere_chat_channels_created_by_fk_idx on public.intellisphere_chat_channels (created_by_profile_id);
create index if not exists intellisphere_chat_channels_organization_fk_idx on public.intellisphere_chat_channels (organization_id);
create index if not exists intellisphere_chat_channels_tenant_fk_idx on public.intellisphere_chat_channels (tenant_id);
create index if not exists intellisphere_chat_messages_organization_fk_idx on public.intellisphere_chat_messages (organization_id);
create index if not exists intellisphere_chat_messages_tenant_fk_idx on public.intellisphere_chat_messages (tenant_id);
create index if not exists intellisphere_chat_messages_sender_fk_idx on public.intellisphere_chat_messages (sender_profile_id);
create index if not exists intellisphere_chat_messages_reply_fk_idx on public.intellisphere_chat_messages (reply_to_message_id);

-- The app registry contains product metadata only. It is safe for active authenticated members to read.
create policy intellisphere_apps_read_active_members on public.intellisphere_apps for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.member_status = 'active'));
revoke all on public.intellisphere_apps from public, anon;
grant select on public.intellisphere_apps to authenticated;

-- These applications have working foundations, but are still in development.
update public.intellisphere_apps set status = 'in_development',
 launch_path = '/m/productivity-and-collaboration/intellistack-productivity-tools/intelliword',
 capabilities = '["document_editor","private_database_save","typed_signature_block","word_compatible_doc_export","browser_print_to_pdf"]'::jsonb
where app_key = 'intelliword';
update public.intellisphere_apps set status = 'in_development',
 launch_path = '/m/productivity-and-collaboration/intellistack-productivity-tools/intellisheets',
 capabilities = '["editable_grid","simple_sum_formula","csv_import","csv_export","local_drafts"]'::jsonb
where app_key = 'intellisheets';
update public.intellisphere_apps set status = 'in_development',
 launch_path = '/m/productivity-and-collaboration/intellistack-productivity-tools/intellislides',
 capabilities = '["slide_title_and_body_editor","slide_add_remove_navigate","markdown_outline_export","local_drafts"]'::jsonb
where app_key = 'intellislides';
insert into public.intellisphere_apps (app_key,name,category,description,status,launch_path,capabilities)
values ('intellichat','IntelliChat','communications',
 'Organization-scoped group text messaging with database persistence and realtime message delivery.',
 'in_development','/m/productivity-and-collaboration/intellistack-collaboration-tools/intellichat',
 '["group_channels","member_scoped_access","persistent_text_messages","realtime_message_events"]'::jsonb)
on conflict (app_key) do update set category=excluded.category,description=excluded.description,
 status=excluded.status,launch_path=excluded.launch_path,capabilities=excluded.capabilities;

-- Apply Supabase init-plan optimization to ten ticket workflow policies without changing authorization logic.
do $$
declare policy_row record; using_expression text; check_expression text; statement text;
begin
 for policy_row in
  select schemaname,tablename,policyname,qual,with_check from pg_policies
  where schemaname='public'
   and tablename in ('assistant_ticket_actions','ticket_attachment_links','ticket_conversation_messages','ticket_knowledge_links','ticket_workflow_links')
   and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%')
 loop
  using_expression := case when policy_row.qual is null then null else replace(policy_row.qual,'auth.uid()','(select auth.uid())') end;
  check_expression := case when policy_row.with_check is null then null else replace(policy_row.with_check,'auth.uid()','(select auth.uid())') end;
  statement := format('alter policy %I on %I.%I',policy_row.policyname,policy_row.schemaname,policy_row.tablename);
  if using_expression is not null then statement := statement || format(' using (%s)',using_expression); end if;
  if check_expression is not null then statement := statement || format(' with check (%s)',check_expression); end if;
  execute statement;
 end loop;
end
$$;

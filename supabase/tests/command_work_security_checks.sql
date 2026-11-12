-- Structural security regression checks for the Command Work and Chat Buddy persistence layer.
-- This file creates no rows. Run against the target Supabase project after applying migrations.
do $$
declare
  required_table text;
begin
  foreach required_table in array array[
    'command_work_items',
    'command_work_item_events',
    'command_work_item_approvals',
    'assistant_sessions',
    'assistant_messages',
    'workflows',
    'workflow_runs',
    'workflow_step_runs'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = required_table
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled for public.%', required_table;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.command_work_items', 'select')
    or has_table_privilege('anon', 'public.command_work_items', 'insert')
    or has_table_privilege('anon', 'public.command_work_item_events', 'select')
    or has_table_privilege('anon', 'public.command_work_item_approvals', 'select')
    or has_table_privilege('anon', 'public.assistant_sessions', 'select')
    or has_table_privilege('anon', 'public.assistant_messages', 'insert')
    or has_table_privilege('anon', 'public.workflow_runs', 'insert')
    or has_table_privilege('anon', 'public.workflow_step_runs', 'update') then
    raise exception 'Anonymous access remains granted on a sensitive workspace table.';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'assistant_messages_chat_buddy_welcome_per_session_idx'
  ) then
    raise exception 'Chat Buddy welcome-message idempotency index is missing.';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'command_work_items'
      and policyname = 'command_work_items_read_scope'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'command_work_items'
      and policyname = 'command_work_items_insert_scope'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'command_work_item_approvals'
      and policyname = 'command_work_item_approvals_decide'
  ) then
    raise exception 'A required organization/tenant-scoped work or approval policy is missing.';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='workflow_step_runs'
      and policyname='workflow_step_runs_insert_owner_scope'
  ) then
    raise exception 'Workflow step creation policy is missing.';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='governance_management_role_catalog'
      and policyname='governance_management_role_catalog_authenticated_read'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='workforce_organizational_units'
      and policyname='workforce_organizational_units_read_scope'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='workforce_role_assignments'
      and policyname='workforce_role_assignments_read_admin_scope'
  ) then
    raise exception 'A required role catalog or workforce hierarchy read policy is missing.';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='integration_connections'
      and policyname='integration_connections_global_admin_read'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='workforce_management_assignments'
      and policyname='workforce_management_assignments_read_admin_scope'
  ) then
    raise exception 'A required global-admin integration or management-assignment policy is missing.';
  end if;

  if not has_function_privilege('authenticated', 'public.is_global_admin()', 'execute')
    or has_function_privilege('anon', 'public.is_global_admin()', 'execute') then
    raise exception 'Global-admin scope helper grants are incorrect.';
  end if;

  if not has_table_privilege('anon', 'public.site_pages', 'select')
    or not has_table_privilege('anon', 'public.site_social_links', 'select')
    or not has_table_privilege('anon', 'public.site_contact_submissions', 'insert') then
    raise exception 'An intended public-site anonymous permission was accidentally removed.';
  end if;
end
$$;

-- Negative cross-tenant and role-escalation tests require an authenticated JWT
-- for each test identity. They are intentionally not simulated with service-role
-- access here because service-role access bypasses RLS.

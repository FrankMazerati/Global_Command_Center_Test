drop policy if exists command_work_items_insert_scope on public.command_work_items;
create policy command_work_items_insert_scope on public.command_work_items for insert to authenticated with check (
  created_by_profile_id=(select auth.uid()) and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
    and p.organization_id=command_work_items.organization_id and p.tenant_id is not distinct from command_work_items.tenant_id)
  and (assignee_profile_id is null or (exists (select 1 from public.profiles a where a.id=command_work_items.assignee_profile_id
    and a.member_status='active' and a.organization_id=command_work_items.organization_id and a.tenant_id is not distinct from command_work_items.tenant_id)
    and (assignee_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id)))
);
drop policy if exists command_work_items_update_scope on public.command_work_items;
create policy command_work_items_update_scope on public.command_work_items for update to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
  and p.organization_id=command_work_items.organization_id and p.tenant_id is not distinct from command_work_items.tenant_id
  and (command_work_items.created_by_profile_id=(select auth.uid()) or command_work_items.assignee_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id))))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
  and p.organization_id=command_work_items.organization_id and p.tenant_id is not distinct from command_work_items.tenant_id)
  and (assignee_profile_id is null or (exists (select 1 from public.profiles a where a.id=command_work_items.assignee_profile_id
    and a.member_status='active' and a.organization_id=command_work_items.organization_id and a.tenant_id is not distinct from command_work_items.tenant_id)
    and (assignee_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id)))));
drop policy if exists command_work_items_delete_scope on public.command_work_items;
create policy command_work_items_delete_scope on public.command_work_items for delete to authenticated using (
  exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
    and p.organization_id=command_work_items.organization_id and p.tenant_id is not distinct from command_work_items.tenant_id)
  and (created_by_profile_id=(select auth.uid()) or public.is_org_admin(organization_id)));
drop policy if exists command_work_item_approvals_insert_requester on public.command_work_item_approvals;
create policy command_work_item_approvals_insert_requester on public.command_work_item_approvals for insert to authenticated with check (
  requested_by_profile_id=(select auth.uid()) and status='pending' and approver_profile_id is distinct from (select auth.uid())
  and exists (select 1 from public.command_work_items w join public.profiles p on p.id=(select auth.uid())
    where w.id=command_work_item_approvals.work_item_id and w.organization_id=command_work_item_approvals.organization_id
      and w.tenant_id is not distinct from command_work_item_approvals.tenant_id and p.organization_id=w.organization_id
      and p.tenant_id is not distinct from w.tenant_id and p.member_status='active'
      and (w.created_by_profile_id=(select auth.uid()) or w.assignee_profile_id=(select auth.uid()) or public.is_org_admin(w.organization_id)))
  and (approver_profile_id is null or exists (select 1 from public.profiles a where a.id=command_work_item_approvals.approver_profile_id
    and a.member_status='active' and a.organization_id=command_work_item_approvals.organization_id
    and a.tenant_id is not distinct from command_work_item_approvals.tenant_id)));
drop policy if exists command_work_item_approvals_decide on public.command_work_item_approvals;
create policy command_work_item_approvals_decide on public.command_work_item_approvals for update to authenticated
using (status='pending' and requested_by_profile_id<>(select auth.uid())
  and (approver_profile_id=(select auth.uid()) or public.is_org_admin(organization_id))
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
    and p.organization_id=command_work_item_approvals.organization_id and p.tenant_id is not distinct from command_work_item_approvals.tenant_id))
with check (status in ('approved','denied') and decided_by_profile_id=(select auth.uid()) and decided_at is not null
  and length(btrim(coalesce(decision_reason,'')))>=4 and requested_by_profile_id<>(select auth.uid())
  and (approver_profile_id=(select auth.uid()) or public.is_org_admin(organization_id))
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
    and p.organization_id=command_work_item_approvals.organization_id and p.tenant_id is not distinct from command_work_item_approvals.tenant_id));
drop policy if exists workflow_step_runs_update_owner_scope on public.workflow_step_runs;
create policy workflow_step_runs_update_owner_scope on public.workflow_step_runs for update to authenticated
using (exists (select 1 from public.workflow_runs r join public.profiles p on p.id=(select auth.uid())
  where r.id=workflow_step_runs.workflow_run_id and r.organization_id=workflow_step_runs.organization_id
    and r.tenant_id is not distinct from workflow_step_runs.tenant_id and p.member_status='active'
    and p.organization_id=r.organization_id and p.tenant_id is not distinct from r.tenant_id
    and (r.started_by=(select auth.uid()) or workflow_step_runs.assigned_profile_id=(select auth.uid()))))
with check (exists (select 1 from public.workflow_runs r join public.profiles p on p.id=(select auth.uid())
  where r.id=workflow_step_runs.workflow_run_id and r.organization_id=workflow_step_runs.organization_id
    and r.tenant_id is not distinct from workflow_step_runs.tenant_id and p.member_status='active'
    and p.organization_id=r.organization_id and p.tenant_id is not distinct from r.tenant_id
    and (r.started_by=(select auth.uid()) or workflow_step_runs.assigned_profile_id=(select auth.uid())))
  and (workflow_step_runs.assigned_profile_id is null or workflow_step_runs.assigned_profile_id=(select auth.uid())
    or exists (select 1 from public.workflow_runs r join public.profiles a on a.id=workflow_step_runs.assigned_profile_id
      where r.id=workflow_step_runs.workflow_run_id and r.started_by=(select auth.uid())
        and a.member_status='active' and a.organization_id=r.organization_id and a.tenant_id is not distinct from r.tenant_id)));

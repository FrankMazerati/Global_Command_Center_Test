drop policy if exists workflow_step_runs_insert_owner_scope on public.workflow_step_runs;
create policy workflow_step_runs_insert_owner_scope on public.workflow_step_runs
for insert to authenticated
with check (
  exists (
    select 1 from public.workflow_runs r
    join public.profiles p on p.id=(select auth.uid())
    where r.id=workflow_step_runs.workflow_run_id
      and r.started_by=(select auth.uid())
      and r.organization_id=workflow_step_runs.organization_id
      and r.tenant_id is not distinct from workflow_step_runs.tenant_id
      and p.member_status='active'
      and p.organization_id=r.organization_id
      and p.tenant_id is not distinct from r.tenant_id
      and (
        workflow_step_runs.assigned_profile_id is null
        or workflow_step_runs.assigned_profile_id=(select auth.uid())
        or exists (
          select 1 from public.profiles a
          where a.id=workflow_step_runs.assigned_profile_id
            and a.member_status='active'
            and a.organization_id=r.organization_id
            and a.tenant_id is not distinct from r.tenant_id
        )
      )
  )
);

drop policy if exists command_work_item_approvals_cancel_requester on public.command_work_item_approvals;
create policy command_work_item_approvals_cancel_requester on public.command_work_item_approvals
for update to authenticated
using (
  status='pending'
  and requested_by_profile_id=(select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.member_status='active'
      and p.organization_id=command_work_item_approvals.organization_id
      and p.tenant_id is not distinct from command_work_item_approvals.tenant_id
  )
)
with check (
  status='cancelled'
  and requested_by_profile_id=(select auth.uid())
  and decided_at is null
  and decided_by_profile_id is null
);

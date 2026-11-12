drop policy if exists command_work_items_read_scope on public.command_work_items;
create policy command_work_items_read_scope on public.command_work_items
for select to authenticated
using (
  public.is_global_admin()
  or exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid())
      and p.member_status='active'
      and p.organization_id=command_work_items.organization_id
      and (p.tenant_id is not distinct from command_work_items.tenant_id or public.is_org_admin(command_work_items.organization_id))
      and (
        command_work_items.created_by_profile_id=(select auth.uid())
        or command_work_items.assignee_profile_id=(select auth.uid())
        or public.is_org_admin(command_work_items.organization_id)
        or exists (
          select 1 from public.command_work_item_approvals a
          where a.work_item_id=command_work_items.id
            and (a.requested_by_profile_id=(select auth.uid()) or a.approver_profile_id=(select auth.uid()))
        )
      )
  )
);

drop policy if exists command_work_items_delete_scope on public.command_work_items;
create policy command_work_items_delete_scope on public.command_work_items
for delete to authenticated
using (
  public.is_global_admin()
  or exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.member_status='active'
      and p.organization_id=command_work_items.organization_id
      and (p.tenant_id is not distinct from command_work_items.tenant_id or public.is_org_admin(command_work_items.organization_id))
      and (command_work_items.created_by_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id))
  )
);

drop policy if exists command_work_item_events_insert_scope on public.command_work_item_events;
create policy command_work_item_events_insert_scope on public.command_work_item_events
for insert to authenticated
with check (
  actor_profile_id=(select auth.uid())
  and exists (
    select 1 from public.command_work_items w
    join public.profiles p on p.id=(select auth.uid())
    where w.id=command_work_item_events.work_item_id
      and w.organization_id=command_work_item_events.organization_id
      and w.tenant_id is not distinct from command_work_item_events.tenant_id
      and p.member_status='active'
      and (public.is_global_admin() or (
        p.organization_id=w.organization_id
        and (p.tenant_id is not distinct from w.tenant_id or public.is_org_admin(w.organization_id))
      ))
      and (
        w.created_by_profile_id=(select auth.uid())
        or w.assignee_profile_id=(select auth.uid())
        or public.is_org_admin(w.organization_id)
        or (
          command_work_item_events.event_type='approval_decided'
          and exists (
            select 1 from public.command_work_item_approvals a
            where a.work_item_id=w.id
              and a.approver_profile_id=(select auth.uid())
              and a.status in ('approved','denied')
          )
        )
      )
  )
);

drop policy if exists command_work_item_approvals_decide on public.command_work_item_approvals;
create policy command_work_item_approvals_decide on public.command_work_item_approvals
for update to authenticated
using (
  status='pending'
  and requested_by_profile_id<>(select auth.uid())
  and (approver_profile_id=(select auth.uid()) or public.is_org_admin(organization_id))
  and (
    public.is_global_admin()
    or exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.member_status='active'
        and p.organization_id=command_work_item_approvals.organization_id
        and p.tenant_id is not distinct from command_work_item_approvals.tenant_id
    )
  )
)
with check (
  status in ('approved','denied')
  and decided_by_profile_id=(select auth.uid())
  and decided_at is not null
  and length(btrim(coalesce(decision_reason,'')))>=4
  and requested_by_profile_id<>(select auth.uid())
  and (approver_profile_id=(select auth.uid()) or public.is_org_admin(organization_id))
  and (
    public.is_global_admin()
    or exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.member_status='active'
        and p.organization_id=command_work_item_approvals.organization_id
        and p.tenant_id is not distinct from command_work_item_approvals.tenant_id
    )
  )
);

drop policy if exists workforce_organizational_units_read_scope on public.workforce_organizational_units;
create policy workforce_organizational_units_read_scope
on public.workforce_organizational_units
for select to authenticated
using (
  public.is_global_admin()
  or exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid())
      and p.member_status='active'
      and p.organization_id=workforce_organizational_units.organization_id
      and (
        p.tenant_id=workforce_organizational_units.tenant_id
        or public.is_org_admin(workforce_organizational_units.organization_id)
      )
  )
);

drop policy if exists integration_connections_global_admin_read on public.integration_connections;
create policy integration_connections_global_admin_read
on public.integration_connections
for select to authenticated
using (public.is_global_admin());

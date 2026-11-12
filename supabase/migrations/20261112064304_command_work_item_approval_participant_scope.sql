drop policy if exists command_work_items_read_scope on public.command_work_items;
create policy command_work_items_read_scope on public.command_work_items
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.member_status='active'
      and p.organization_id=command_work_items.organization_id
      and p.tenant_id is not distinct from command_work_items.tenant_id
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

drop policy if exists command_work_item_events_read_scope on public.command_work_item_events;
create policy command_work_item_events_read_scope on public.command_work_item_events
for select to authenticated
using (
  exists (
    select 1 from public.command_work_items w
    where w.id=command_work_item_events.work_item_id
      and w.organization_id=command_work_item_events.organization_id
      and w.tenant_id is not distinct from command_work_item_events.tenant_id
      and (
        w.created_by_profile_id=(select auth.uid())
        or w.assignee_profile_id=(select auth.uid())
        or public.is_org_admin(w.organization_id)
        or exists (
          select 1 from public.command_work_item_approvals a
          where a.work_item_id=w.id
            and (a.requested_by_profile_id=(select auth.uid()) or a.approver_profile_id=(select auth.uid()))
        )
      )
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
      and p.organization_id=w.organization_id
      and p.tenant_id is not distinct from w.tenant_id
      and p.member_status='active'
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

drop policy if exists command_work_items_update_scope on public.command_work_items;
create policy command_work_items_update_scope on public.command_work_items
for update to authenticated
using (
  public.is_global_admin()
  or exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.member_status='active'
      and p.organization_id=command_work_items.organization_id
      and (p.tenant_id is not distinct from command_work_items.tenant_id or public.is_org_admin(command_work_items.organization_id))
      and (command_work_items.created_by_profile_id=(select auth.uid())
        or command_work_items.assignee_profile_id=(select auth.uid())
        or public.is_org_admin(command_work_items.organization_id))
  )
)
with check (
  (
    public.is_global_admin()
    or exists (
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.member_status='active'
        and p.organization_id=command_work_items.organization_id
        and (p.tenant_id is not distinct from command_work_items.tenant_id or public.is_org_admin(command_work_items.organization_id))
    )
  )
  and (
    assignee_profile_id is null
    or (
      exists (
        select 1 from public.profiles a
        where a.id=command_work_items.assignee_profile_id
          and a.member_status='active'
          and a.organization_id=command_work_items.organization_id
          and a.tenant_id is not distinct from command_work_items.tenant_id
      )
      and (assignee_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id))
    )
  )
);

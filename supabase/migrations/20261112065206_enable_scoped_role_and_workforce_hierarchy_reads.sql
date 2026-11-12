grant select on public.governance_management_role_catalog to authenticated;
grant select on public.workforce_organizational_units to authenticated;
grant select on public.workforce_role_assignments to authenticated;
grant select on public.workforce_management_assignments to authenticated;

drop policy if exists governance_management_role_catalog_authenticated_read on public.governance_management_role_catalog;
create policy governance_management_role_catalog_authenticated_read
on public.governance_management_role_catalog
for select to authenticated
using (is_active = true);

drop policy if exists workforce_organizational_units_read_scope on public.workforce_organizational_units;
create policy workforce_organizational_units_read_scope
on public.workforce_organizational_units
for select to authenticated
using (
  exists (
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

drop policy if exists workforce_role_assignments_read_admin_scope on public.workforce_role_assignments;
create policy workforce_role_assignments_read_admin_scope
on public.workforce_role_assignments
for select to authenticated
using (public.is_org_admin(organization_id));

drop policy if exists workforce_management_assignments_read_admin_scope on public.workforce_management_assignments;
create policy workforce_management_assignments_read_admin_scope
on public.workforce_management_assignments
for select to authenticated
using (public.is_org_admin(organization_id));

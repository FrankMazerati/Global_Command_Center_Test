-- Group membership writes are restricted to active organization admins within
-- their organization/tenant scope. Privileged groups require a global admin.
-- Existing SELECT policies remain unchanged.

drop policy if exists group_memberships_admin_insert on public.group_memberships;
create policy group_memberships_admin_insert
on public.group_memberships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.groups g
    where g.id = group_memberships.group_id
      and (
        private.is_global_admin()
        or (
          not g.is_privileged
          and private.is_org_admin_scope(g.organization_id, g.tenant_id)
        )
      )
  )
  and exists (
    select 1 from public.profiles target
    join public.groups g on g.id = group_memberships.group_id
    where target.id = group_memberships.profile_id
      and target.organization_id = g.organization_id
      and (g.tenant_id is null or target.tenant_id = g.tenant_id)
  )
  and (added_by is null or added_by = auth.uid())
);

drop policy if exists group_memberships_admin_delete on public.group_memberships;
create policy group_memberships_admin_delete
on public.group_memberships
for delete
to authenticated
using (
  exists (
    select 1
    from public.groups g
    where g.id = group_memberships.group_id
      and (
        private.is_global_admin()
        or (
          not g.is_privileged
          and private.is_org_admin_scope(g.organization_id, g.tenant_id)
        )
      )
  )
);

comment on policy group_memberships_admin_insert on public.group_memberships is
  'Only active global admins or organization admins scoped to the target organization/tenant may add memberships; privileged groups require global admin.';
comment on policy group_memberships_admin_delete on public.group_memberships is
  'Only active global admins or organization admins scoped to the target organization/tenant may remove memberships; privileged groups require global admin.';

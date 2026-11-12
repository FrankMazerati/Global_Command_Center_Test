create or replace function private.can_manage_directory_groups(
  p_organization_id uuid,
  p_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select private.is_global_admin()
    or exists (
      select 1
      from public.profiles actor
      join public.profile_roles pr on pr.profile_id = actor.id
      join public.roles r on r.id = pr.role_id
      where actor.id = auth.uid()
        and actor.member_status = 'active'
        and actor.organization_id = p_organization_id
        and (p_tenant_id is null or actor.tenant_id = p_tenant_id)
        and pr.is_active
        and (pr.starts_at is null or pr.starts_at <= now())
        and (pr.expires_at is null or pr.expires_at > now())
        and r.role_key = 'organization_admin'
    );
$function$;

revoke all on function private.can_manage_directory_groups(uuid, uuid) from public, anon;
grant execute on function private.can_manage_directory_groups(uuid, uuid) to authenticated;

drop policy if exists group_memberships_insert_directory_admins on public.group_memberships;
create policy group_memberships_insert_directory_admins
on public.group_memberships
for insert
to authenticated
with check (
  added_by = (select auth.uid())
  and exists (
    select 1
    from public.groups g
    join public.profiles target on target.id = profile_id
    where g.id = group_id
      and private.can_manage_directory_groups(g.organization_id, g.tenant_id)
      and target.organization_id = g.organization_id
      and (g.tenant_id is null or target.tenant_id = g.tenant_id)
      and (not g.is_privileged or private.is_global_admin())
  )
);

drop policy if exists group_memberships_delete_directory_admins on public.group_memberships;
create policy group_memberships_delete_directory_admins
on public.group_memberships
for delete
to authenticated
using (
  exists (
    select 1
    from public.groups g
    join public.profiles target on target.id = profile_id
    where g.id = group_id
      and private.can_manage_directory_groups(g.organization_id, g.tenant_id)
      and target.organization_id = g.organization_id
      and (g.tenant_id is null or target.tenant_id = g.tenant_id)
      and (not g.is_privileged or private.is_global_admin())
  )
);

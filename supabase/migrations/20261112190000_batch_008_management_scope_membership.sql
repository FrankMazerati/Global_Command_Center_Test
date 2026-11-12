-- Batch 008: extend existing management assignments with explicit, tenant-bound location scope.
-- Additive only: no customer rows are seeded, remapped, or deleted.

begin;

-- The existing governance management catalog remains canonical. Permit a future
-- location scope without silently granting it to any existing role.
alter table public.governance_management_role_catalog
  drop constraint if exists governance_management_role_scope_check;
alter table public.governance_management_role_catalog
  add constraint governance_management_role_scope_check
  check (
    cardinality(allowed_scopes) > 0
    and allowed_scopes <@ array['global','region','tenant','department','location']::text[]
  );

-- Extend the existing management assignment model; do not create a parallel one.
alter table public.workforce_management_assignments
  drop constraint if exists workforce_management_assignments_scope_type_check;
alter table public.workforce_management_assignments
  add constraint workforce_management_assignments_scope_type_check
  check (scope_type = any (array['global','region','tenant','department','location_set']::text[]));

alter table public.workforce_management_assignments
  drop constraint if exists workforce_management_scope_target_check;
alter table public.workforce_management_assignments
  add constraint workforce_management_scope_target_check
  check (
    (scope_type = 'global' and region_id is null and tenant_id is null and department_id is null)
    or (scope_type = 'region' and region_id is not null and tenant_id is null and department_id is null)
    or (scope_type = 'tenant' and region_id is null and tenant_id is not null and department_id is null)
    or (scope_type = 'department' and region_id is null and tenant_id is null and department_id is not null)
    or (scope_type = 'location_set' and region_id is null and tenant_id is not null and department_id is null)
  );

-- Verified identity bridge: no automatic email/name matching and no synthetic
-- workforce records are linked to authenticated profiles by this migration.
create table if not exists public.workforce_profile_identity_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  workforce_person_id uuid not null references public.workforce_people(id) on delete restrict,
  link_status text not null default 'pending'
    check (link_status = any (array['pending','verified','revoked']::text[])),
  link_method text not null default 'administrator_review'
    check (link_method = any (array['administrator_review','verified_directory_object','approved_invitation']::text[])),
  verified_by_profile_id uuid references public.profiles(id) on delete restrict,
  verified_at timestamptz,
  revoked_by_profile_id uuid references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workforce_profile_identity_links_profile_unique unique (profile_id),
  constraint workforce_profile_identity_links_person_unique unique (workforce_person_id),
  constraint workforce_profile_identity_links_verification_check check (
    (link_status <> 'verified' or (verified_by_profile_id is not null and verified_at is not null))
    and (link_status <> 'revoked' or (revoked_by_profile_id is not null and revoked_at is not null))
  )
);

-- Region-to-location mapping is tenant-bound; city/region labels alone never
-- confer access to all organizations in that geography.
create table if not exists public.governance_region_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  region_id uuid not null references public.governance_regions(id) on delete restrict,
  location_organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint governance_region_locations_unique unique (tenant_id, region_id, location_organization_id)
);

-- Explicit non-contiguous location membership for assignments such as a manager
-- responsible for eight selected sites within a much larger company.
create table if not exists public.workforce_management_assignment_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  management_assignment_id uuid not null references public.workforce_management_assignments(id) on delete cascade,
  location_organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint workforce_management_assignment_locations_unique
    unique (management_assignment_id, location_organization_id)
);

create index if not exists workforce_profile_identity_links_tenant_status_idx
  on public.workforce_profile_identity_links (tenant_id, link_status);
create index if not exists governance_region_locations_tenant_region_idx
  on public.governance_region_locations (tenant_id, region_id);
create index if not exists governance_region_locations_location_idx
  on public.governance_region_locations (location_organization_id);
create index if not exists workforce_management_assignment_locations_tenant_assignment_idx
  on public.workforce_management_assignment_locations (tenant_id, management_assignment_id);
create index if not exists workforce_management_assignment_locations_location_idx
  on public.workforce_management_assignment_locations (location_organization_id);

-- Internal trigger guard. SECURITY DEFINER is restricted to trigger execution:
-- fixed search_path, fully-qualified objects, no client EXECUTE grant.
create or replace function private.validate_batch008_tenant_location_membership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_root_organization_id uuid;
  v_is_descendant boolean;
begin
  select t.organization_id
    into v_root_organization_id
  from public.tenants t
  where t.id = new.tenant_id;

  if v_root_organization_id is null then
    raise exception 'Unknown tenant for location membership' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = new.location_organization_id
      and o.organization_type = 'location'
      and o.status = 'active'
  ) then
    raise exception 'Target must be an active location organization' using errcode = '23514';
  end if;

  with recursive organization_tree(id, parent_organization_id) as (
    select o.id, o.parent_organization_id
    from public.organizations o
    where o.id = new.location_organization_id
    union all
    select parent.id, parent.parent_organization_id
    from public.organizations parent
    join organization_tree child on child.parent_organization_id = parent.id
  )
  select exists (
    select 1 from organization_tree where id = v_root_organization_id
  ) into v_is_descendant;

  if not v_is_descendant then
    raise exception 'Location is outside the supplied tenant organization tree' using errcode = '23514';
  end if;

  return new;
end;
$function$;

create or replace function private.validate_batch008_assignment_location()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_assignment public.workforce_management_assignments%rowtype;
  v_person_tenant_id uuid;
  v_root_organization_id uuid;
  v_assignment_org_in_tenant boolean;
begin
  select a.* into v_assignment
  from public.workforce_management_assignments a
  where a.id = new.management_assignment_id;

  if not found then
    raise exception 'Management assignment does not exist' using errcode = '23503';
  end if;

  if v_assignment.scope_type <> 'location_set'
     or v_assignment.tenant_id is distinct from new.tenant_id then
    raise exception 'Location membership must match a location_set assignment and tenant' using errcode = '23514';
  end if;

  select wp.tenant_id into v_person_tenant_id
  from public.workforce_people wp
  where wp.id = v_assignment.workforce_person_id;

  if v_person_tenant_id is distinct from new.tenant_id then
    raise exception 'Management assignment workforce person belongs to a different tenant' using errcode = '23514';
  end if;

  select t.organization_id into v_root_organization_id
  from public.tenants t where t.id = new.tenant_id;

  with recursive organization_tree(id, parent_organization_id) as (
    select o.id, o.parent_organization_id
    from public.organizations o
    where o.id = v_assignment.organization_id
    union all
    select parent.id, parent.parent_organization_id
    from public.organizations parent
    join organization_tree child on child.parent_organization_id = parent.id
  )
  select exists (select 1 from organization_tree where id = v_root_organization_id)
    into v_assignment_org_in_tenant;

  if not v_assignment_org_in_tenant then
    raise exception 'Management assignment organization is outside the supplied tenant tree' using errcode = '23514';
  end if;

  return new;
end;
$function$;

create or replace function private.validate_batch008_profile_identity_link()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_profile_tenant_id uuid;
  v_profile_organization_id uuid;
  v_person_tenant_id uuid;
  v_person_organization_id uuid;
begin
  select p.tenant_id, p.organization_id
    into v_profile_tenant_id, v_profile_organization_id
  from public.profiles p
  where p.id = new.profile_id;

  select wp.tenant_id, wp.organization_id
    into v_person_tenant_id, v_person_organization_id
  from public.workforce_people wp
  where wp.id = new.workforce_person_id;

  if v_profile_tenant_id is distinct from new.tenant_id
     or v_person_tenant_id is distinct from new.tenant_id
     or v_profile_organization_id is distinct from new.organization_id
     or v_person_organization_id is distinct from new.organization_id then
    raise exception 'Profile, workforce person, organization and tenant must match exactly' using errcode = '23514';
  end if;

  if new.link_status = 'verified' and new.verified_by_profile_id is null then
    raise exception 'Verified identity links require an approving profile' using errcode = '23514';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_batch008_region_location_tenant_guard
  on public.governance_region_locations;
create trigger trg_batch008_region_location_tenant_guard
before insert or update on public.governance_region_locations
for each row execute function private.validate_batch008_tenant_location_membership();

drop trigger if exists trg_batch008_assignment_location_guard
  on public.workforce_management_assignment_locations;
create trigger trg_batch008_assignment_location_guard
before insert or update on public.workforce_management_assignment_locations
for each row execute function private.validate_batch008_assignment_location();

drop trigger if exists trg_batch008_profile_identity_link_guard
  on public.workforce_profile_identity_links;
create trigger trg_batch008_profile_identity_link_guard
before insert or update on public.workforce_profile_identity_links
for each row execute function private.validate_batch008_profile_identity_link();

-- New tables are deliberately unavailable to browser roles until dedicated,
-- approved server-side mutation/read APIs and scope-aware policies are shipped.
alter table public.workforce_profile_identity_links enable row level security;
alter table public.governance_region_locations enable row level security;
alter table public.workforce_management_assignment_locations enable row level security;

revoke all on public.workforce_profile_identity_links from anon, authenticated;
revoke all on public.governance_region_locations from anon, authenticated;
revoke all on public.workforce_management_assignment_locations from anon, authenticated;

grant select, insert, update, delete on public.workforce_profile_identity_links to service_role;
grant select, insert, update, delete on public.governance_region_locations to service_role;
grant select, insert, update, delete on public.workforce_management_assignment_locations to service_role;

revoke all on function private.validate_batch008_tenant_location_membership() from public, anon, authenticated;
revoke all on function private.validate_batch008_assignment_location() from public, anon, authenticated;
revoke all on function private.validate_batch008_profile_identity_link() from public, anon, authenticated;

commit;

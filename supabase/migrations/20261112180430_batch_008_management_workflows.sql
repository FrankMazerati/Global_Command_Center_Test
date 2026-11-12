-- Batch 008 completion: align hierarchy scopes and add audited management lifecycle RPCs.
-- Additive, tenant-bound, and deliberately does not create employee/location business records.

begin;

-- The canonical management catalog must recognize the same scope key used by
-- the assignment table and its validator.
alter table public.governance_management_role_catalog
  drop constraint if exists governance_management_role_scope_check;
alter table public.governance_management_role_catalog
  add constraint governance_management_role_scope_check
  check (
    cardinality(allowed_scopes) > 0
    and allowed_scopes <@ array['global','region','tenant','department','location','location_set']::text[]
  );

alter table public.governance_management_role_catalog
  drop constraint if exists governance_management_role_catalog_role_family_check;
alter table public.governance_management_role_catalog
  add constraint governance_management_role_catalog_role_family_check
  check (role_family = any(array['global','regional','tenant','location','service_line','customer_relationship','collaboration']::text[]));

-- A regional appointment may be tenant-specific (regional operations inside
-- one customer) or multi-tenant (where separately authorized). Tenant-specific
-- region assignments remain anchored to the tenant's root organization.
alter table public.workforce_management_assignments
  drop constraint if exists workforce_management_scope_target_check;
alter table public.workforce_management_assignments
  add constraint workforce_management_scope_target_check
  check (
    (scope_type = 'global' and region_id is null and tenant_id is null and department_id is null)
    or (scope_type = 'region' and region_id is not null and department_id is null)
    or (scope_type = 'tenant' and region_id is null and tenant_id is not null and department_id is null)
    or (scope_type = 'department' and region_id is null and tenant_id is null and department_id is not null)
    or (scope_type = 'location_set' and region_id is null and tenant_id is not null and department_id is null)
  );

-- Location-level management roles. These are role-template metadata only;
-- they do not assign employees or grant access to any location.
insert into public.governance_management_role_catalog
  (role_key, role_name, role_family, allowed_scopes, description, requires_approval, is_active)
values
  ('location_operations_manager','Location Operations Manager','location',array['location_set']::text[],'Leads daily operations for explicitly assigned locations only.',true,true),
  ('location_finance_manager','Location Finance Manager','location',array['location_set']::text[],'Oversees local financial operations and controls within assigned locations.',true,true),
  ('location_service_delivery_manager','Location Service Delivery Manager','location',array['location_set']::text[],'Owns local service delivery, SLA performance and escalations within assigned locations.',true,true),
  ('location_workforce_manager','Location Workforce Manager','location',array['location_set']::text[],'Coordinates local workforce coverage and scheduling within assigned locations.',true,true),
  ('location_security_compliance_manager','Location Security and Compliance Manager','location',array['location_set']::text[],'Coordinates local security and compliance activity within assigned locations.',true,true)
on conflict (role_key) do nothing;

-- Strengthen the existing assignment validator rather than introduce a second
-- competing assignment write path.
create or replace function private.validate_workforce_management_assignment()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_allowed_scopes text[];
  v_role_active boolean;
  v_target_org uuid;
  v_person_org uuid;
  v_person_tenant uuid;
  v_person_synthetic boolean;
  v_region_status text;
begin
  select allowed_scopes, is_active
    into v_allowed_scopes, v_role_active
  from public.governance_management_role_catalog
  where role_key = new.management_role_key;

  if not found or not v_role_active then
    raise exception 'Management role is missing or inactive' using errcode = '23514';
  end if;

  if not (new.scope_type = any(v_allowed_scopes)) then
    raise exception 'Management role is not permitted for the selected scope type'
      using errcode = '23514';
  end if;

  if new.tenant_id is not null then
    select organization_id into v_target_org
    from public.tenants where id = new.tenant_id;
    if v_target_org is distinct from new.organization_id then
      raise exception 'Tenant management scope must match the tenant root organization'
        using errcode = '23514';
    end if;
  end if;

  if new.department_id is not null then
    select organization_id into v_target_org
    from public.departments where id = new.department_id;
    if v_target_org is distinct from new.organization_id then
      raise exception 'Department management scope must match the department organization'
        using errcode = '23514';
    end if;
  end if;

  if new.region_id is not null then
    select status into v_region_status
    from public.governance_regions where id = new.region_id;
    if v_region_status is distinct from 'active' then
      raise exception 'Regional assignment requires an active governance region'
        using errcode = '23514';
    end if;
  end if;

  select organization_id, tenant_id, is_synthetic
    into v_person_org, v_person_tenant, v_person_synthetic
  from public.workforce_people where id = new.workforce_person_id;

  if not found then
    raise exception 'Workforce person does not exist' using errcode = '23503';
  end if;

  if v_person_org is distinct from new.organization_id and not exists (
    select 1 from public.workforce_organization_memberships m
    where m.workforce_person_id = new.workforce_person_id
      and m.organization_id = new.organization_id
      and m.status = 'active'
      and m.starts_at <= now()
      and (m.ends_at is null or m.ends_at > now())
  ) then
    raise exception 'Management assignee must have an active workforce membership in the assignment organization'
      using errcode = '23514';
  end if;

  if new.tenant_id is not null and v_person_tenant is distinct from new.tenant_id then
    raise exception 'Workforce assignee must belong to the assignment tenant'
      using errcode = '23514';
  end if;

  if new.authorization_enabled and v_person_synthetic then
    raise exception 'Synthetic workforce records cannot receive active management authorization'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

-- Region-location mapping must reference a real active region and a location
-- beneath the tenant root.
create or replace function private.validate_batch008_tenant_location_membership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_root_organization_id uuid;
  v_is_descendant boolean;
  v_region_status text;
begin
  select t.organization_id into v_root_organization_id
  from public.tenants t where t.id = new.tenant_id;

  if v_root_organization_id is null then
    raise exception 'Unknown tenant for location membership' using errcode = '23503';
  end if;

  select status into v_region_status
  from public.governance_regions where id = new.region_id;

  if v_region_status is distinct from 'active' then
    raise exception 'Region must be active before locations can be mapped' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.organizations o
    where o.id = new.location_organization_id
      and o.organization_type = 'location'
      and o.status = 'active'
  ) then
    raise exception 'Target must be an active location organization' using errcode = '23514';
  end if;

  with recursive organization_tree(id, parent_organization_id) as (
    select o.id, o.parent_organization_id from public.organizations o
    where o.id = new.location_organization_id
    union all
    select parent.id, parent.parent_organization_id
    from public.organizations parent
    join organization_tree child on child.parent_organization_id = parent.id
  )
  select exists(select 1 from organization_tree where id = v_root_organization_id)
    into v_is_descendant;

  if not v_is_descendant then
    raise exception 'Location is outside the supplied tenant organization tree' using errcode = '23514';
  end if;

  return new;
end;
$function$;

-- An assigned location must be beneath both the tenant root and the exact
-- organization responsible for the assignment, not merely somewhere in town.
create or replace function private.validate_batch008_assignment_location()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_assignment public.workforce_management_assignments%rowtype;
  v_person_tenant_id uuid;
  v_is_under_assignment_org boolean;
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

  if not exists (
    select 1 from public.organizations o
    where o.id = new.location_organization_id
      and o.organization_type = 'location'
      and o.status = 'active'
  ) then
    raise exception 'Assignment target must be an active location organization' using errcode = '23514';
  end if;

  with recursive organization_tree(id, parent_organization_id) as (
    select o.id, o.parent_organization_id from public.organizations o
    where o.id = new.location_organization_id
    union all
    select parent.id, parent.parent_organization_id
    from public.organizations parent
    join organization_tree child on child.parent_organization_id = parent.id
  )
  select exists(select 1 from organization_tree where id = v_assignment.organization_id)
    into v_is_under_assignment_org;

  if not v_is_under_assignment_org then
    raise exception 'Location is outside the assignment organization hierarchy' using errcode = '23514';
  end if;

  return new;
end;
$function$;

-- Verified identity links require a real (non-synthetic) active workforce
-- person and an active verifier in the exact same tenant and organization.
create or replace function private.validate_batch008_profile_identity_link()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_profile_tenant_id uuid;
  v_profile_organization_id uuid;
  v_profile_status public.member_status;
  v_person_tenant_id uuid;
  v_person_organization_id uuid;
  v_person_synthetic boolean;
  v_person_employment_status text;
  v_verifier_tenant_id uuid;
  v_verifier_organization_id uuid;
  v_verifier_status public.member_status;
begin
  select p.tenant_id, p.organization_id, p.member_status
    into v_profile_tenant_id, v_profile_organization_id, v_profile_status
  from public.profiles p where p.id = new.profile_id;

  select wp.tenant_id, wp.organization_id, wp.is_synthetic, wp.employment_status
    into v_person_tenant_id, v_person_organization_id, v_person_synthetic, v_person_employment_status
  from public.workforce_people wp where wp.id = new.workforce_person_id;

  if v_profile_tenant_id is distinct from new.tenant_id
     or v_person_tenant_id is distinct from new.tenant_id
     or v_profile_organization_id is distinct from new.organization_id
     or v_person_organization_id is distinct from new.organization_id then
    raise exception 'Profile, workforce person, organization and tenant must match exactly' using errcode = '23514';
  end if;

  if new.link_status = 'verified' then
    if v_profile_status is distinct from 'active'::public.member_status
       or v_person_synthetic
       or v_person_employment_status <> 'active' then
      raise exception 'Only active profiles can be linked to real active workforce people' using errcode = '23514';
    end if;

    if new.verified_by_profile_id is null then
      raise exception 'Verified identity links require an approving profile' using errcode = '23514';
    end if;

    select p.tenant_id, p.organization_id, p.member_status
      into v_verifier_tenant_id, v_verifier_organization_id, v_verifier_status
    from public.profiles p where p.id = new.verified_by_profile_id;

    if v_verifier_tenant_id is distinct from new.tenant_id
       or v_verifier_organization_id is distinct from new.organization_id
       or v_verifier_status is distinct from 'active'::public.member_status then
      raise exception 'Identity verifier must be active in the same tenant and organization' using errcode = '23514';
    end if;
  end if;

  if new.link_status = 'revoked' and (new.revoked_by_profile_id is null or new.revoked_at is null) then
    raise exception 'Revoked identity links require revocation actor and timestamp' using errcode = '23514';
  end if;

  return new;
end;
$function$;

-- Administrator-reviewed identity linking. Actor identity always comes from
-- auth.uid(); callers cannot spoof the approver or tenant.
create or replace function public.admin_link_workforce_profile_identity(
  p_profile_id uuid,
  p_workforce_person_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_actor uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_person public.workforce_people%rowtype;
  v_link_id uuid;
begin
  if v_actor is null or length(trim(coalesce(p_reason,''))) < 8 then
    raise exception 'Authenticated administrator and a meaningful reason are required' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles
  where id = p_profile_id and member_status = 'active';

  select * into v_person from public.workforce_people
  where id = p_workforce_person_id and employment_status = 'active' and is_synthetic = false;

  if v_profile.id is null or v_person.id is null
     or v_profile.tenant_id is null or v_profile.organization_id is null
     or v_person.tenant_id is distinct from v_profile.tenant_id
     or v_person.organization_id is distinct from v_profile.organization_id then
    raise exception 'Target must be an active profile and a real active workforce person in the same tenant and organization'
      using errcode = '23514';
  end if;

  if not private.is_global_admin()
     and not private.is_org_admin_scope(v_profile.organization_id, v_profile.tenant_id) then
    raise exception 'Not authorized to link workforce identity in this organization' using errcode = '42501';
  end if;

  insert into public.workforce_profile_identity_links
    (tenant_id, organization_id, profile_id, workforce_person_id, link_status,
     link_method, verified_by_profile_id, verified_at, reason)
  values
    (v_profile.tenant_id, v_profile.organization_id, v_profile.id, v_person.id, 'verified',
     'administrator_review', v_actor, now(), trim(p_reason))
  returning id into v_link_id;

  insert into public.audit_events
    (organization_id, tenant_id, actor_profile_id, actor_auth_user_id, action,
     resource_type, resource_id, outcome, reason, event_data)
  values
    (v_profile.organization_id, v_profile.tenant_id, v_actor, v_actor,
     'workforce.identity_link.verified', 'workforce_profile_identity_link', v_link_id::text,
     'success', trim(p_reason),
     jsonb_build_object('profile_id',v_profile.id,'workforce_person_id',v_person.id));

  return v_link_id;
end;
$function$;

-- Create an unapproved management appointment. It is not authorization until
-- a different authorized administrator approves it.
create or replace function public.request_workforce_management_assignment(
  p_workforce_person_id uuid,
  p_management_role_key text,
  p_scope_type text,
  p_organization_id uuid,
  p_region_id uuid default null,
  p_tenant_id uuid default null,
  p_department_id uuid default null,
  p_assignment_reason text default null,
  p_starts_at timestamptz default now(),
  p_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_actor uuid := auth.uid();
  v_person public.workforce_people%rowtype;
  v_assignment_id uuid;
begin
  if v_actor is null or length(trim(coalesce(p_assignment_reason,''))) < 8 then
    raise exception 'Authenticated administrator and a meaningful assignment reason are required' using errcode = '42501';
  end if;

  if not private.is_global_admin()
     and not private.is_org_admin_scope(p_organization_id, p_tenant_id) then
    raise exception 'Not authorized to request management assignments in this organization' using errcode = '42501';
  end if;

  select * into v_person from public.workforce_people
  where id = p_workforce_person_id and employment_status = 'active' and is_synthetic = false;

  if v_person.id is null then
    raise exception 'Only real active workforce people can receive management assignments' using errcode = '23514';
  end if;

  insert into public.workforce_management_assignments
    (workforce_person_id, management_role_key, organization_id, scope_type,
     region_id, tenant_id, department_id, status, authorization_enabled,
     starts_at, ends_at, created_by_profile_id, assignment_reason)
  values
    (p_workforce_person_id, p_management_role_key, p_organization_id, p_scope_type,
     p_region_id, p_tenant_id, p_department_id, 'proposed', false,
     coalesce(p_starts_at,now()), p_ends_at, v_actor, trim(p_assignment_reason))
  returning id into v_assignment_id;

  insert into public.audit_events
    (organization_id, tenant_id, actor_profile_id, actor_auth_user_id, action,
     resource_type, resource_id, outcome, reason, event_data)
  values
    (p_organization_id, p_tenant_id, v_actor, v_actor,
     'workforce.management_assignment.requested', 'workforce_management_assignment',
     v_assignment_id::text, 'success', trim(p_assignment_reason),
     jsonb_build_object('workforce_person_id',p_workforce_person_id,
       'management_role_key',p_management_role_key,'scope_type',p_scope_type,
       'region_id',p_region_id,'tenant_id',p_tenant_id,'department_id',p_department_id));

  return v_assignment_id;
end;
$function$;

-- Location-set membership is editable only while the appointment is proposed.
create or replace function public.set_workforce_management_assignment_locations(
  p_assignment_id uuid,
  p_location_organization_ids uuid[],
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_actor uuid := auth.uid();
  v_assignment public.workforce_management_assignments%rowtype;
  v_count integer;
begin
  if v_actor is null or length(trim(coalesce(p_reason,''))) < 8
     or coalesce(cardinality(p_location_organization_ids),0) < 1
     or cardinality(p_location_organization_ids) > 100 then
    raise exception 'Authenticated administrator, reason, and 1-100 locations are required' using errcode = '22023';
  end if;

  if cardinality(p_location_organization_ids) <>
     (select count(distinct x) from unnest(p_location_organization_ids) as x) then
    raise exception 'Duplicate location IDs are not allowed' using errcode = '22023';
  end if;

  select * into v_assignment from public.workforce_management_assignments
  where id = p_assignment_id for update;

  if v_assignment.id is null or v_assignment.status <> 'proposed'
     or v_assignment.scope_type <> 'location_set' then
    raise exception 'Only proposed location_set assignments can have their location list changed' using errcode = '23514';
  end if;

  if not private.is_global_admin()
     and not private.is_org_admin_scope(v_assignment.organization_id,v_assignment.tenant_id) then
    raise exception 'Not authorized to edit this management assignment' using errcode = '42501';
  end if;

  delete from public.workforce_management_assignment_locations
  where management_assignment_id = p_assignment_id;

  insert into public.workforce_management_assignment_locations
    (tenant_id, management_assignment_id, location_organization_id, created_by_profile_id)
  select v_assignment.tenant_id, p_assignment_id, x, v_actor
  from unnest(p_location_organization_ids) as x;

  get diagnostics v_count = row_count;

  insert into public.audit_events
    (organization_id, tenant_id, actor_profile_id, actor_auth_user_id, action,
     resource_type, resource_id, outcome, reason, event_data)
  values
    (v_assignment.organization_id, v_assignment.tenant_id, v_actor, v_actor,
     'workforce.management_assignment.locations_set', 'workforce_management_assignment',
     p_assignment_id::text, 'success', trim(p_reason),
     jsonb_build_object('location_organization_ids',to_jsonb(p_location_organization_ids),
       'location_count',v_count));

  return v_count;
end;
$function$;

-- Two-person approval: requester cannot approve their own appointment.
create or replace function public.approve_workforce_management_assignment(
  p_assignment_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_actor uuid := auth.uid();
  v_assignment public.workforce_management_assignments%rowtype;
  v_requires_approval boolean;
begin
  if v_actor is null or length(trim(coalesce(p_reason,''))) < 8 then
    raise exception 'Authenticated approver and a meaningful approval reason are required' using errcode = '42501';
  end if;

  select * into v_assignment from public.workforce_management_assignments
  where id = p_assignment_id for update;

  if v_assignment.id is null or v_assignment.status <> 'proposed' then
    raise exception 'Only proposed management assignments can be approved' using errcode = '23514';
  end if;

  if v_assignment.created_by_profile_id = v_actor then
    raise exception 'The requester cannot approve their own management assignment' using errcode = '42501';
  end if;

  if not private.is_global_admin()
     and not private.is_org_admin_scope(v_assignment.organization_id,v_assignment.tenant_id) then
    raise exception 'Not authorized to approve this management assignment' using errcode = '42501';
  end if;

  select requires_approval into v_requires_approval
  from public.governance_management_role_catalog
  where role_key = v_assignment.management_role_key and is_active;

  if v_requires_approval is distinct from true then
    raise exception 'Management role is inactive or has no approval policy' using errcode = '23514';
  end if;

  if v_assignment.scope_type = 'location_set'
     and not exists (select 1 from public.workforce_management_assignment_locations
       where management_assignment_id = p_assignment_id) then
    raise exception 'A location_set assignment must include at least one explicit location before approval' using errcode = '23514';
  end if;

  update public.workforce_management_assignments
  set status = 'active', authorization_enabled = true,
      approved_by_profile_id = v_actor, approved_at = now(), updated_at = now()
  where id = p_assignment_id;

  insert into public.audit_events
    (organization_id, tenant_id, actor_profile_id, actor_auth_user_id, action,
     resource_type, resource_id, outcome, reason, event_data)
  values
    (v_assignment.organization_id, v_assignment.tenant_id, v_actor, v_actor,
     'workforce.management_assignment.approved', 'workforce_management_assignment',
     p_assignment_id::text, 'success', trim(p_reason),
     jsonb_build_object('workforce_person_id',v_assignment.workforce_person_id,
       'management_role_key',v_assignment.management_role_key,
       'scope_type',v_assignment.scope_type));

  return true;
end;
$function$;

create or replace function public.revoke_workforce_management_assignment(
  p_assignment_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_actor uuid := auth.uid();
  v_assignment public.workforce_management_assignments%rowtype;
begin
  if v_actor is null or length(trim(coalesce(p_reason,''))) < 8 then
    raise exception 'Authenticated administrator and a meaningful revocation reason are required' using errcode = '42501';
  end if;

  select * into v_assignment from public.workforce_management_assignments
  where id = p_assignment_id for update;

  if v_assignment.id is null or v_assignment.status in ('revoked','expired') then
    raise exception 'Management assignment is missing or already inactive' using errcode = '23514';
  end if;

  if not private.is_global_admin()
     and not private.is_org_admin_scope(v_assignment.organization_id,v_assignment.tenant_id) then
    raise exception 'Not authorized to revoke this management assignment' using errcode = '42501';
  end if;

  update public.workforce_management_assignments
  set status = 'revoked', authorization_enabled = false, updated_at = now()
  where id = p_assignment_id;

  insert into public.audit_events
    (organization_id, tenant_id, actor_profile_id, actor_auth_user_id, action,
     resource_type, resource_id, outcome, reason, event_data)
  values
    (v_assignment.organization_id, v_assignment.tenant_id, v_actor, v_actor,
     'workforce.management_assignment.revoked', 'workforce_management_assignment',
     p_assignment_id::text, 'success', trim(p_reason),
     jsonb_build_object('workforce_person_id',v_assignment.workforce_person_id,
       'management_role_key',v_assignment.management_role_key,
       'scope_type',v_assignment.scope_type));

  return true;
end;
$function$;

-- No direct browser table access. Only the audited RPCs above can mutate these
-- records for authenticated callers.
revoke all on function public.admin_link_workforce_profile_identity(uuid,uuid,text) from public, anon;
revoke all on function public.request_workforce_management_assignment(uuid,text,text,uuid,uuid,uuid,uuid,text,timestamptz,timestamptz) from public, anon;
revoke all on function public.set_workforce_management_assignment_locations(uuid,uuid[],text) from public, anon;
revoke all on function public.approve_workforce_management_assignment(uuid,text) from public, anon;
revoke all on function public.revoke_workforce_management_assignment(uuid,text) from public, anon;

grant execute on function public.admin_link_workforce_profile_identity(uuid,uuid,text) to authenticated;
grant execute on function public.request_workforce_management_assignment(uuid,text,text,uuid,uuid,uuid,uuid,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.set_workforce_management_assignment_locations(uuid,uuid[],text) to authenticated;
grant execute on function public.approve_workforce_management_assignment(uuid,text) to authenticated;
grant execute on function public.revoke_workforce_management_assignment(uuid,text) to authenticated;

commit;

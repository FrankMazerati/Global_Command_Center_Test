-- Establish tenant-scoped staffing targets and a read-only reconciliation view.
-- This migration does not create people, move identities, assign roles, or delete data.
-- It deliberately targets only the five existing synthetic demo tenants. The
-- IntelliStack Managed Services business-unit tenant remains separate.

insert into public.roles (role_key, name, description, is_privileged, is_system_role)
select v.role_key, v.name, v.description, v.is_privileged, true
from (values
  ('regional_manager', 'Regional Manager', 'Leads a regional organization scope.', true),
  ('help_desk_manager', 'Help Desk Manager', 'Owns help desk operations and staffing.', true),
  ('help_desk_lead', 'Help Desk Lead', 'Leads help desk technicians and daily queue execution.', false)
) as v(role_key, name, description, is_privileged)
where not exists (
  select 1 from public.roles r where r.role_key = v.role_key
);

create or replace view public.workforce_directory_role_reconciliation
with (security_invoker = true)
as
with role_targets(role_key, target_count, hierarchy_order) as (
  values
    ('ceo'::text, 1, 10),
    ('cfo'::text, 2, 20),
    ('coo'::text, 2, 20),
    ('regional_manager'::text, 5, 30),
    ('department_manager'::text, 5, 40),
    ('help_desk_manager'::text, 1, 50),
    ('help_desk_lead'::text, 1, 60),
    ('help_desk_l3'::text, 5, 70),
    ('help_desk_l2'::text, 5, 80),
    ('help_desk_l1'::text, 5, 90)
),
demo_tenants as (
  select t.id as tenant_id, t.organization_id, t.name as tenant_name, t.slug
  from public.tenants t
  where t.settings ->> 'tenant_kind' = 'demo'
),
counts as (
  select
    w.tenant_id,
    r.role_key,
    count(distinct a.workforce_person_id)::integer as assigned_count
  from public.workforce_role_assignments a
  join public.roles r on r.id = a.role_id
  join public.workforce_people w on w.id = a.workforce_person_id
  where a.is_active
  group by w.tenant_id, r.role_key
)
select
  t.tenant_id,
  t.organization_id,
  t.tenant_name,
  t.slug as tenant_slug,
  target.role_key,
  role.name as role_name,
  target.hierarchy_order,
  target.target_count,
  coalesce(counts.assigned_count, 0) as assigned_count,
  greatest(target.target_count - coalesce(counts.assigned_count, 0), 0) as remaining_count,
  greatest(coalesce(counts.assigned_count, 0) - target.target_count, 0) as over_target_count,
  coalesce(counts.assigned_count, 0) = target.target_count as target_met
from demo_tenants t
cross join role_targets target
left join public.roles role on role.role_key = target.role_key
left join counts on counts.tenant_id = t.tenant_id and counts.role_key = target.role_key;

comment on view public.workforce_directory_role_reconciliation is
'Read-only staffing target reconciliation for the five synthetic demo tenants. It reports current active role assignments against approved per-tenant targets; it never provisions or changes identities.';


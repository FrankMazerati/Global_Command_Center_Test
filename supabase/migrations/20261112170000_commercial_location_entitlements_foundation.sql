-- Commercial foundation: three plans, location activation, and scoped operations
-- This migration is intentionally additive. Existing subscriptions, organizations,
-- workforce units, and customer records are preserved.

create table if not exists public.organization_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_code text not null,
  name text not null,
  location_type text not null default 'office',
  region_name text,
  country_code text not null default 'US',
  timezone text,
  address jsonb not null default '{}'::jsonb,
  status text not null default 'pending_activation'
    check (status in ('pending_activation','active','suspended','closed')),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, location_code),
  unique (id, organization_id)
);

create index if not exists organization_locations_org_status_idx
  on public.organization_locations (organization_id, status);

create table if not exists public.organization_location_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  scope_role text not null default 'member'
    check (scope_role in ('member','location_manager','location_admin','regional_manager','auditor')),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint organization_location_memberships_location_org_fk
    foreign key (location_id, organization_id)
    references public.organization_locations(id, organization_id) on delete restrict,
  unique (location_id, profile_id)
);

create index if not exists organization_location_memberships_profile_idx
  on public.organization_location_memberships (profile_id, is_active, location_id);

alter table public.marketplace_customer_subscriptions
  add column if not exists billing_scope text not null default 'organization'
    check (billing_scope in ('location','organization')),
  add column if not exists location_id uuid
    references public.organization_locations(id) on delete restrict,
  add column if not exists contracted_location_count integer
    check (contracted_location_count is null or contracted_location_count > 0),
  add column if not exists included_user_count integer
    check (included_user_count is null or included_user_count >= 0),
  add column if not exists price_version_id uuid
    references public.marketplace_price_versions(id) on delete restrict;

alter table public.marketplace_customer_subscriptions
  drop constraint if exists marketplace_customer_subscriptions_scope_location_check;
alter table public.marketplace_customer_subscriptions
  add constraint marketplace_customer_subscriptions_scope_location_check
  check (
    (billing_scope = 'location' and location_id is not null)
    or (billing_scope = 'organization' and location_id is null)
  );

create index if not exists marketplace_customer_subscriptions_location_idx
  on public.marketplace_customer_subscriptions (location_id, status)
  where location_id is not null;

create table if not exists public.marketplace_subscription_location_assignments (
  id uuid primary key default gen_random_uuid(),
  customer_subscription_id uuid not null
    references public.marketplace_customer_subscriptions(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid not null,
  status text not null default 'active'
    check (status in ('active','suspended','ended')),
  monthly_price_allocation numeric(12,2)
    check (monthly_price_allocation is null or monthly_price_allocation >= 0),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint marketplace_subscription_location_assignments_location_org_fk
    foreign key (location_id, organization_id)
    references public.organization_locations(id, organization_id) on delete restrict,
  unique (customer_subscription_id, location_id)
);

create index if not exists marketplace_subscription_location_assignments_location_idx
  on public.marketplace_subscription_location_assignments (location_id, status);

create table if not exists public.marketplace_plan_entitlement_catalog (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null
    check (plan_key in ('essential','professional','enterprise')),
  entitlement_key text not null,
  entitlement_group text not null,
  description text not null,
  scope_level text not null
    check (scope_level in ('location','multi_location','organization')),
  included boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  availability_status text not null default 'planned'
    check (availability_status in ('planned','in_development','available','restricted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_key, entitlement_key)
);

alter table public.marketplace_entitlements
  add column if not exists location_id uuid
    references public.organization_locations(id) on delete restrict,
  add column if not exists scope_level text not null default 'organization'
    check (scope_level in ('location','multi_location','organization'));

create index if not exists marketplace_entitlements_location_idx
  on public.marketplace_entitlements (location_id, entitlement_key, status)
  where location_id is not null;

alter table public.organization_locations enable row level security;
alter table public.organization_location_memberships enable row level security;
alter table public.marketplace_subscription_location_assignments enable row level security;
alter table public.marketplace_plan_entitlement_catalog enable row level security;

drop policy if exists organization_locations_scoped_read on public.organization_locations;
create policy organization_locations_scoped_read
on public.organization_locations for select to authenticated
using (
  public.is_global_admin()
  or public.is_org_admin(organization_id)
  or exists (
    select 1 from public.organization_location_memberships m
    where m.location_id = organization_locations.id
      and m.organization_id = organization_locations.organization_id
      and m.profile_id = auth.uid()
      and m.is_active
      and (m.starts_at is null or m.starts_at <= now())
      and (m.expires_at is null or m.expires_at > now())
  )
);

drop policy if exists organization_locations_admin_manage on public.organization_locations;
create policy organization_locations_admin_manage
on public.organization_locations for all to authenticated
using (public.is_global_admin() or public.is_org_admin(organization_id))
with check (public.is_global_admin() or public.is_org_admin(organization_id));

drop policy if exists organization_location_memberships_scoped_read on public.organization_location_memberships;
create policy organization_location_memberships_scoped_read
on public.organization_location_memberships for select to authenticated
using (
  profile_id = auth.uid()
  or public.is_global_admin()
  or public.is_org_admin(organization_id)
);

drop policy if exists organization_location_memberships_admin_manage on public.organization_location_memberships;
create policy organization_location_memberships_admin_manage
on public.organization_location_memberships for all to authenticated
using (public.is_global_admin() or public.is_org_admin(organization_id))
with check (public.is_global_admin() or public.is_org_admin(organization_id));

drop policy if exists marketplace_subscription_location_assignments_scoped_read on public.marketplace_subscription_location_assignments;
create policy marketplace_subscription_location_assignments_scoped_read
on public.marketplace_subscription_location_assignments for select to authenticated
using (
  public.is_global_admin()
  or public.is_org_admin(organization_id)
  or exists (
    select 1 from public.organization_location_memberships m
    where m.location_id = marketplace_subscription_location_assignments.location_id
      and m.profile_id = auth.uid()
      and m.scope_role in ('location_manager','location_admin','regional_manager','auditor')
      and m.is_active
      and (m.starts_at is null or m.starts_at <= now())
      and (m.expires_at is null or m.expires_at > now())
  )
);

drop policy if exists marketplace_plan_entitlement_catalog_authenticated_read on public.marketplace_plan_entitlement_catalog;
create policy marketplace_plan_entitlement_catalog_authenticated_read
on public.marketplace_plan_entitlement_catalog for select to authenticated
using (true);

drop policy if exists marketplace_plan_entitlement_catalog_admin_write on public.marketplace_plan_entitlement_catalog;
create policy marketplace_plan_entitlement_catalog_admin_write
on public.marketplace_plan_entitlement_catalog for all to authenticated
using (public.is_global_admin())
with check (public.is_global_admin());

-- A location entitlement is effective only when the caller belongs to that location
-- (or is an authorized organization/global administrator) AND an active paid
-- subscription covers that location. This function does not provision external access.
create or replace function public.has_location_entitlement(
  p_location_id uuid,
  p_entitlement_key text
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_locations l
    join public.marketplace_plan_entitlement_catalog c
      on c.entitlement_key = p_entitlement_key
     and c.included
     and c.availability_status = 'available'
    join public.marketplace_customer_subscriptions s
      on s.organization_id = l.organization_id
     and s.status = 'active'
    left join public.marketplace_subscription_location_assignments a
      on a.customer_subscription_id = s.id
     and a.location_id = l.id
     and a.organization_id = l.organization_id
     and a.status = 'active'
    where l.id = p_location_id
      and l.status = 'active'
      and c.plan_key = s.plan_key
      and (
        (s.billing_scope = 'location' and s.location_id = l.id)
        or (s.billing_scope = 'organization' and a.id is not null)
      )
      and (
        public.is_global_admin()
        or public.is_org_admin(l.organization_id)
        or exists (
          select 1 from public.organization_location_memberships m
          where m.location_id = l.id
            and m.profile_id = auth.uid()
            and m.is_active
            and (m.starts_at is null or m.starts_at <= now())
            and (m.expires_at is null or m.expires_at > now())
        )
      )
  );
$$;

revoke all on function public.has_location_entitlement(uuid,text) from public, anon;
grant execute on function public.has_location_entitlement(uuid,text) to authenticated;

-- The three plans are cataloged as proposed launch prices. Checkout remains disabled
-- until commercial review, cost validation, and payment-provider configuration.
insert into public.marketplace_products (
  product_key, sku, name, short_description, full_description,
  package_keys, included_features, capabilities, pricing_model,
  purchase_readiness, readiness_notes, checkout_enabled, pricing_unit_label,
  active_status, visibility, provisioning_mode, sort_order
)
values (
  'maximus-optimus-command-center',
  'IS-MOCC-SUBSCRIPTION',
  'Maximus Optimus Command Center',
  'Connected business operations platform with local, multi-location, and enterprise management.',
  'The IntelliStack business operating environment combining workforce coordination, Chat Buddy, IntelliChat, service management, business productivity applications, governance, and tiered operational management.',
  '["essential","professional","enterprise"]'::jsonb,
  '["Local Operations Manager","Chat Buddy","Bring the Work to You","IntelliChat","Help Desk and ticket workflows","Core IntelliSphere business applications","Role-based access control","Standard audit and approvals"]'::jsonb,
  '{"local_operations":true,"multi_location_operations":true,"global_operations_center":true,"location_licensing":true,"enterprise_contracts":true,"checkout":"disabled_pending_review"}'::jsonb,
  'tiered_location_and_organization',
  'needs_review',
  'Proposed commercial catalog entry. Validate feature readiness, hosting, AI usage, third-party licensing, support costs, tax, payment provider, and legal terms before sale.',
  false,
  'per activated location / month; Enterprise by negotiated organization contract',
  'active',
  'public',
  'manual_review',
  10
)
on conflict (product_key) do update
set name = excluded.name,
    short_description = excluded.short_description,
    full_description = excluded.full_description,
    package_keys = excluded.package_keys,
    included_features = excluded.included_features,
    capabilities = excluded.capabilities,
    pricing_model = excluded.pricing_model,
    purchase_readiness = excluded.purchase_readiness,
    readiness_notes = excluded.readiness_notes,
    checkout_enabled = false,
    pricing_unit_label = excluded.pricing_unit_label,
    updated_at = now();

insert into public.marketplace_price_versions (
  product_id, package_key, price_key, currency, region,
  monthly_company_price, annual_company_price, setup_fee,
  eligibility, status, version_number, pricing_model,
  pricing_unit_label, benchmark_notes, approval_status
)
select p.id, v.package_key, v.price_key, 'USD', 'US',
       v.monthly_price, v.annual_price, 0,
       v.eligibility, 'draft', 1, v.pricing_model,
       v.unit_label, v.notes, 'pending'
from public.marketplace_products p
cross join (values
  ('essential','mocc-essential-location-2026-v1',799::numeric,9588::numeric,
   'location_monthly','per activated location / month',
   '{"scope":"single_location","checkout_enabled":false,"price_status":"proposed"}'::jsonb,
   'Proposed launch price; annual amount is the undiscounted monthly equivalent.'),
  ('professional','mocc-professional-location-2026-v1',1499::numeric,17988::numeric,
   'location_monthly','per activated location / month',
   '{"scope":"contracted_multi_location","checkout_enabled":false,"price_status":"proposed"}'::jsonb,
   'Proposed launch price; regional and multi-location management is limited to contracted, activated locations.'),
  ('enterprise','mocc-enterprise-organization-2026-v1',3500::numeric,42000::numeric,
   'organization_monthly','per enterprise organization / month; negotiated coverage',
   '{"scope":"organization_wide","minimum_monthly_price":3500,"location_coverage":"negotiated","checkout_enabled":false,"price_status":"proposed"}'::jsonb,
   'Proposed starting organization-wide commitment; contracted locations, users, support, AI usage, integrations, implementation and volume pricing are negotiated.')
) as v(package_key,price_key,monthly_price,annual_price,pricing_model,unit_label,eligibility,notes)
where p.product_key = 'maximus-optimus-command-center'
  and not exists (
    select 1 from public.marketplace_price_versions existing
    where existing.price_key = v.price_key
  );

insert into public.marketplace_plan_entitlement_catalog
  (plan_key, entitlement_key, entitlement_group, description, scope_level, included, limits, availability_status)
values
  ('essential','local_operations_manager','operations','Manage one activated location and its local workforce, tickets, devices, and workflows.','location',true,'{"location_limit":1,"cross_location_visibility":false}'::jsonb,'planned'),
  ('essential','chat_buddy_core','assistant','Core professional Chat Buddy assistance and standard workflow coordination.','location',true,'{"custom_avatar_wardrobe":false,"advanced_conversation_modes":false}'::jsonb,'planned'),
  ('essential','bring_work_to_you','workspace','Authorized work queue for tickets, tasks, and approvals.','location',true,'{}'::jsonb,'planned'),
  ('essential','intellichat_core','communications','Core in-house messaging and team communication.','location',true,'{"advanced_meetings":false}'::jsonb,'planned'),
  ('essential','help_desk_core','service_management','Ticket lifecycle, basic assignment, escalation, and SLA tracking.','location',true,'{}'::jsonb,'planned'),
  ('essential','business_suite_core','productivity','Core IntelliSphere productivity applications where production-ready.','location',true,'{"advanced_ai_features":false}'::jsonb,'planned'),
  ('essential','standard_security_governance','security','Role-based access control, standard approvals, and audit history.','location',true,'{}'::jsonb,'planned'),
  ('professional','local_operations_manager','operations','Manage each activated location.','location',true,'{}'::jsonb,'planned'),
  ('professional','multi_location_operations','operations','Regional and cross-location operations for contracted, activated locations only.','multi_location',true,'{"uncontracted_locations_visible_as_unlicensed":true}'::jsonb,'planned'),
  ('professional','chat_buddy_advanced','assistant','Expanded conversations, character customization, wardrobe, and scheduled appearances.','multi_location',true,'{}'::jsonb,'planned'),
  ('professional','workflow_automation_advanced','automation','Expanded automation, collaboration, approvals, and analytics.','multi_location',true,'{}'::jsonb,'planned'),
  ('professional','intellichat_advanced','communications','Expanded collaboration and meeting capabilities as delivered.','multi_location',true,'{}'::jsonb,'planned'),
  ('professional','intelliaccess_optional','security','Optional privileged-access orchestration subject to separate module entitlement and readiness.','multi_location',false,'{"requires_separate_module":true}'::jsonb,'planned'),
  ('enterprise','global_operations_center','operations','Organization-wide command and control across all contracted locations, regions, and business units.','organization',true,'{"coverage":"contracted_locations_only"}'::jsonb,'planned'),
  ('enterprise','global_identity_management','identity','Enterprise-wide identity, organizational hierarchy, and access administration.','organization',true,'{}'::jsonb,'planned'),
  ('enterprise','enterprise_governance','governance','Centralized enterprise governance, audit, compliance, and policy orchestration.','organization',true,'{}'::jsonb,'planned'),
  ('enterprise','enterprise_intelligence','ai','Advanced Maximus and Optimus orchestration with governed action proposals.','organization',true,'{"actions_require_authorization":true}'::jsonb,'planned'),
  ('enterprise','intelliaccess_advanced','security','Advanced IntelliAccess privileged-access management and JIT orchestration, subject to integration readiness.','organization',true,'{"external_provisioning_requires_verified_connector":true}'::jsonb,'planned'),
  ('enterprise','enterprise_integrations','integrations','Expanded enterprise integration, migration, and automation options.','organization',true,'{}'::jsonb,'planned')
on conflict (plan_key, entitlement_key) do update
set entitlement_group = excluded.entitlement_group,
    description = excluded.description,
    scope_level = excluded.scope_level,
    included = excluded.included,
    limits = excluded.limits,
    updated_at = now();

comment on table public.organization_locations is
  'Customer business locations. A location is not an organization/tenant; it is a licensed operational site under an organization.';
comment on table public.organization_location_memberships is
  'Explicit profile-to-location scope assignments for location-aware authorization.';
comment on table public.marketplace_subscription_location_assignments is
  'Maps an organization-wide enterprise subscription to the specific contracted and activated locations it covers.';
comment on table public.marketplace_plan_entitlement_catalog is
  'Versionable plan capability catalog. Planned capabilities are not advertised as production-ready until availability_status is available.';
comment on function public.has_location_entitlement(uuid,text) is
  'Checks authenticated location membership and an active subscription assignment for a plan entitlement. Does not perform external provisioning.';

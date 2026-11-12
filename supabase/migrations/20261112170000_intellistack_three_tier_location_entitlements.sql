-- IntelliStack three-tier subscription, location licensing, and management-scope foundation.
-- Safe additive migration: preserves legacy price versions, customer subscriptions, organizations, and all existing operational data.
-- This file is committed to the feature branch for review; it is NOT applied to the live Supabase project.

begin;

alter table public.organizations
  add column if not exists location_code text,
  add column if not exists location_timezone text,
  add column if not exists location_country_code text,
  add column if not exists location_address jsonb;


-- Company members can discover their own company's location metadata. This does not
-- grant access to the operational records stored under any location.
drop policy if exists organizations_read_child_locations on public.organizations;
create policy organizations_read_child_locations
  on public.organizations
  for select to authenticated
  using (
    organization_type = 'location'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.member_status = 'active'
        and p.organization_id = organizations.parent_organization_id
    )
  );

create unique index if not exists organizations_parent_location_code_uidx
  on public.organizations(parent_organization_id, location_code)
  where organization_type = 'location' and location_code is not null;

alter table public.organizations
  add constraint organizations_id_parent_organization_uidx unique (id, parent_organization_id);

alter table public.marketplace_price_versions
  add column if not exists monthly_location_price numeric(12,2),
  add column if not exists annual_location_price numeric(12,2),
  add column if not exists included_location_count integer,
  add column if not exists additional_location_monthly_price numeric(12,2),
  add column if not exists management_scope text;

alter table public.marketplace_price_versions
  add constraint marketplace_price_versions_location_prices_nonnegative
    check (
      (monthly_location_price is null or monthly_location_price >= 0)
      and (annual_location_price is null or annual_location_price >= 0)
      and (additional_location_monthly_price is null or additional_location_monthly_price >= 0)
      and (included_location_count is null or included_location_count >= 0)
    ),
  add constraint marketplace_price_versions_management_scope_check
    check (management_scope is null or management_scope in ('local', 'multi_location', 'global'));

alter table public.marketplace_subscriptions
  add column if not exists scope_type text not null default 'organization',
  add column if not exists management_scope text not null default 'local',
  add column if not exists pricing_version_id uuid references public.marketplace_price_versions(id),
  add column if not exists included_location_count integer,
  add column if not exists additional_location_monthly_price numeric(12,2);

alter table public.marketplace_subscriptions
  add constraint marketplace_subscriptions_id_organization_uidx unique (id, organization_id);

alter table public.marketplace_subscriptions
  add constraint marketplace_subscriptions_scope_type_check
    check (scope_type in ('location', 'organization')),
  add constraint marketplace_subscriptions_management_scope_check
    check (management_scope in ('local', 'multi_location', 'global')),
  add constraint marketplace_subscriptions_location_terms_check
    check (
      (included_location_count is null or included_location_count >= 0)
      and (additional_location_monthly_price is null or additional_location_monthly_price >= 0)
    );

alter table public.marketplace_entitlements
  add column if not exists scope_type text not null default 'organization',
  add column if not exists location_organization_id uuid references public.organizations(id);

create index if not exists marketplace_entitlements_scope_lookup_idx
  on public.marketplace_entitlements(organization_id, entitlement_key, status, location_organization_id);

alter table public.marketplace_entitlements
  add constraint marketplace_entitlements_scope_type_check
    check (scope_type in ('organization', 'location')),
  add constraint marketplace_entitlements_location_scope_check
    check (
      (scope_type = 'organization' and location_organization_id is null)
      or (scope_type = 'location' and location_organization_id is not null)
    );

create table if not exists public.marketplace_subscription_locations (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  organization_id uuid not null references public.organizations(id),
  location_organization_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'removed')),
  monthly_amount numeric(12,2) not null default 0 check (monthly_amount >= 0),
  starts_at date not null default current_date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_subscription_locations_subscription_org_fk
    foreign key (subscription_id, organization_id)
    references public.marketplace_subscriptions(id, organization_id) on delete cascade,
  constraint marketplace_subscription_locations_parent_fk
    foreign key (location_organization_id, organization_id)
    references public.organizations(id, parent_organization_id),
  constraint marketplace_subscription_locations_not_self
    check (location_organization_id <> organization_id),
  constraint marketplace_subscription_locations_dates
    check (ends_at is null or ends_at >= starts_at),
  constraint marketplace_subscription_locations_subscription_location_key
    unique (subscription_id, location_organization_id)
);

create unique index if not exists marketplace_subscription_locations_one_active_plan_uidx
  on public.marketplace_subscription_locations(location_organization_id)
  where status = 'active';

create index if not exists marketplace_subscription_locations_org_status_idx
  on public.marketplace_subscription_locations(organization_id, status);

alter table public.marketplace_subscription_locations enable row level security;

drop policy if exists marketplace_subscription_locations_owner_read
  on public.marketplace_subscription_locations;
create policy marketplace_subscription_locations_owner_read
  on public.marketplace_subscription_locations
  for select to authenticated
  using (
    exists (
      select 1
      from public.marketplace_subscriptions s
      where s.id = marketplace_subscription_locations.subscription_id
        and s.user_id = (select auth.uid())
    )
  );

revoke all on public.marketplace_subscription_locations from anon, authenticated;
grant select on public.marketplace_subscription_locations to authenticated;

create table if not exists public.marketplace_plan_entitlement_catalog (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null,
  entitlement_key text not null,
  entitlement_group text not null,
  management_scope text not null
    check (management_scope in ('local', 'multi_location', 'global', 'cross_plan_addon')),
  is_included boolean not null default false,
  is_optional_addon boolean not null default false,
  description text not null,
  release_state text not null default 'not_certified'
    check (release_state in ('not_certified', 'planned', 'in_development', 'available', 'integration_required', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_plan_entitlement_catalog_plan_key_check
    check (plan_key in ('essential', 'professional', 'enterprise')),
  constraint marketplace_plan_entitlement_catalog_plan_feature_key
    unique (plan_key, entitlement_key),
  constraint marketplace_plan_entitlement_catalog_addon_check
    check (not (is_included and is_optional_addon))
);

alter table public.marketplace_plan_entitlement_catalog enable row level security;
drop policy if exists marketplace_plan_entitlement_catalog_authenticated_read
  on public.marketplace_plan_entitlement_catalog;
create policy marketplace_plan_entitlement_catalog_authenticated_read
  on public.marketplace_plan_entitlement_catalog
  for select to authenticated using (true);
revoke all on public.marketplace_plan_entitlement_catalog from anon, authenticated;
grant select on public.marketplace_plan_entitlement_catalog to authenticated;

create or replace function public.has_marketplace_entitlement(
  p_organization_id uuid,
  p_entitlement_key text,
  p_location_organization_id uuid default null
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $function$
  select coalesce(exists (
    select 1
    from public.marketplace_entitlements e
    where e.organization_id = p_organization_id
      and e.entitlement_key = p_entitlement_key
      and e.status = 'active'
      and (e.starts_at is null or e.starts_at <= statement_timestamp())
      and (e.expires_at is null or e.expires_at > statement_timestamp())
      and (
        (e.scope_type = 'organization' and e.location_organization_id is null)
        or (
          e.scope_type = 'location'
          and p_location_organization_id is not null
          and e.location_organization_id = p_location_organization_id
        )
      )
  ), false);
$function$;

revoke all on function public.has_marketplace_entitlement(uuid, text, uuid) from public, anon;
grant execute on function public.has_marketplace_entitlement(uuid, text, uuid) to authenticated;

-- New sales catalog: three plans only. Legacy plan and customer history are preserved unchanged.
insert into public.marketplace_price_versions (
  package_key, price_key, currency,
  monthly_company_price, annual_company_price,
  monthly_location_price, annual_location_price,
  setup_fee, pricing_model, pricing_unit_label, management_scope,
  eligibility, status, version_number, approval_status
)
select v.package_key, v.price_key, 'USD',
       v.monthly_company_price, null,
       v.monthly_location_price, null,
       0, v.pricing_model, v.pricing_unit_label, v.management_scope,
       v.eligibility, 'draft', 1, 'pending'
from (values
  ('essential', 'package-essential-location-2026-v1', null::numeric, 799::numeric,
   'location_monthly', 'per activated location / month', 'local',
   '{"checkout_enabled":false,"commercial_status":"approved_direction_pending_finance_validation","included_products":["global-identity","optimus","help-desk","intellichat","knowledge-base"],"location_limit":1}'::jsonb),
  ('professional', 'package-professional-location-2026-v1', null::numeric, 1499::numeric,
   'location_monthly', 'per activated location / month', 'multi_location',
   '{"checkout_enabled":false,"commercial_status":"approved_direction_pending_finance_validation","included_products":["global-identity","optimus","maximus","help-desk","security-operations","network-operations","intellichat","knowledge-base","workflow-automation"],"location_limit":"contracted"}'::jsonb),
  ('enterprise', 'package-enterprise-global-2026-v1', 3500::numeric, null::numeric,
   'enterprise_contract_monthly', 'per organization / month; location coverage negotiated', 'global',
   '{"checkout_enabled":false,"commercial_status":"approved_direction_pending_finance_validation","included_products":["global-identity","intellihire","intellitax","intellipay","intelliwork","helpbuddy","optimus","maximus","help-desk","security-operations","network-operations","intellichat","knowledge-base","workflow-automation"],"location_coverage":"negotiated","additional_location_price":"negotiated"}'::jsonb)
) as v(package_key,price_key,monthly_company_price,monthly_location_price,pricing_model,pricing_unit_label,management_scope,eligibility)
where not exists (
  select 1 from public.marketplace_price_versions existing
  where existing.price_key = v.price_key
);

-- Entitlement catalog is configuration only; it does not create customer subscriptions,
-- activate features, create locations, or grant access. Release state remains not_certified.
insert into public.marketplace_plan_entitlement_catalog
  (plan_key, entitlement_key, entitlement_group, management_scope, is_included, is_optional_addon, description)
values
  ('essential','local_operations','management','local',true,false,'Local Operations Manager for one activated company location.'),
  ('essential','local_workforce','workforce','local',true,false,'Local employee, team, department, and manager administration.'),
  ('essential','local_help_desk','service_management','local',true,false,'Location-scoped tickets, service workflows, and SLA tracking.'),
  ('essential','chat_buddy_basic','assistant','local',true,false,'Core Chat Buddy assistance and basic coordination.'),
  ('essential','bring_work_to_you_core','workspace','local',true,false,'Core Bring the Work to You priorities, tasks, and approvals.'),
  ('essential','intellichat_core','collaboration','local',true,false,'Core internal messaging and team collaboration.'),
  ('essential','productivity_suite_core','productivity','local',true,false,'Core IntelliWord, IntelliSheets, IntelliSlides, IntelliNotes, IntelliForms, and IntelliDrive entitlements as released.'),
  ('essential','identity_directory_core','identity','local',true,false,'Location-scoped directory, identity, and workforce records.'),
  ('essential','role_based_access_control','security','local',true,false,'Core role-based permissions and server-enforced authorization.'),
  ('essential','audit_history','governance','local',true,false,'Location-scoped audit history and operational accountability.'),
  ('essential','basic_approvals','workflow','local',true,false,'Standard approval requests and decisions.'),
  ('essential','manual_privileged_access','security','local',true,false,'Secure manual privileged-access request and approval path; no automated JIT broker included.'),
  ('essential','intelliaccess_jit','premium_security','cross_plan_addon',false,true,'Optional IntelliAccess Just-in-Time privileged access module, subject to deployment readiness.'),
  ('professional','local_operations','management','local',true,false,'Local Operations Manager for each activated location.'),
  ('professional','local_workforce','workforce','local',true,false,'Local employee, team, department, and manager administration.'),
  ('professional','local_help_desk','service_management','local',true,false,'Location-scoped tickets, service workflows, and SLA tracking.'),
  ('professional','chat_buddy_basic','assistant','local',true,false,'Core Chat Buddy assistance and basic coordination.'),
  ('professional','bring_work_to_you_core','workspace','local',true,false,'Core Bring the Work to You priorities, tasks, and approvals.'),
  ('professional','intellichat_core','collaboration','local',true,false,'Core internal messaging and team collaboration.'),
  ('professional','productivity_suite_core','productivity','local',true,false,'Core in-house productivity suite entitlements as released.'),
  ('professional','identity_directory_core','identity','local',true,false,'Location-scoped directory, identity, and workforce records.'),
  ('professional','role_based_access_control','security','local',true,false,'Core role-based permissions and server-enforced authorization.'),
  ('professional','audit_history','governance','local',true,false,'Location-scoped audit history and operational accountability.'),
  ('professional','basic_approvals','workflow','local',true,false,'Standard approval requests and decisions.'),
  ('professional','multi_location_management','management','multi_location',true,false,'Manage multiple activated locations under one company organization.'),
  ('professional','regional_operations_manager','management','multi_location',true,false,'Regional views and management over explicitly assigned locations.'),
  ('professional','cross_location_ticket_coordination','service_management','multi_location',true,false,'Cross-location ticket coordination subject to user scope and data permissions.'),
  ('professional','chat_buddy_advanced','assistant','multi_location',true,false,'Advanced Chat Buddy conversation, coordination, and workflow features.'),
  ('professional','avatar_wardrobe_customization','assistant_customization','multi_location',true,false,'Expanded avatar appearance, wardrobe, and accessory customization.'),
  ('professional','scheduled_outfits','assistant_customization','multi_location',true,false,'Schedule Chat Buddy outfits and appearance preferences.'),
  ('professional','advanced_automation','workflow','multi_location',true,false,'Advanced workflow automation with approval gates and execution audit.'),
  ('professional','cross_location_analytics','analytics','multi_location',true,false,'Compare authorized operational measures across activated locations.'),
  ('professional','expanded_integrations','integration','multi_location',true,false,'Expanded integration options subject to provider contracts and configured connections.'),
  ('professional','intelliaccess_jit','premium_security','cross_plan_addon',false,true,'Optional IntelliAccess Just-in-Time privileged access module, subject to deployment readiness.'),
  ('enterprise','local_operations','management','local',true,false,'Local Operations Manager for every contracted activated location.'),
  ('enterprise','multi_location_management','management','multi_location',true,false,'Multi-location management across contracted locations.'),
  ('enterprise','regional_operations_manager','management','multi_location',true,false,'Regional operations hierarchy and assigned regional oversight.'),
  ('enterprise','global_operations_center','management','global',true,false,'Global Operations Center for organization-wide oversight.'),
  ('enterprise','global_organization_hierarchy','management','global',true,false,'Company, subsidiary, region, location, department, team, and workforce hierarchy.'),
  ('enterprise','multi_company_management','management','global',true,false,'Governed management of subsidiaries and related operating companies.'),
  ('enterprise','global_identity_administration','identity','global',true,false,'Organization-wide identity and directory administration within explicit grants.'),
  ('enterprise','centralized_policy_management','governance','global',true,false,'Central policy management with scoped inheritance and exceptions.'),
  ('enterprise','enterprise_governance','governance','global',true,false,'Enterprise governance, audit, compliance, and risk oversight.'),
  ('enterprise','advanced_intelliaccess_jit','premium_security','global',true,false,'Advanced IntelliAccess JIT privilege orchestration, approval, expiry, and revocation verification.'),
  ('enterprise','enterprise_ai_orchestration','assistant','global',true,false,'Advanced Maximus and Optimus orchestration with approval and audit boundaries.'),
  ('enterprise','global_reporting','analytics','global',true,false,'Consolidated reporting across contracted organization scope.'),
  ('enterprise','cross_region_federation','integration','global',true,false,'Governed cross-region and organization federation capabilities where configured.')
on conflict (plan_key, entitlement_key) do nothing;


-- Location creation is a controlled operation: Essential can register its first location;
-- additional locations require an active Professional/Enterprise organization entitlement.
create or replace function public.create_organization_location(
  p_organization_id uuid,
  p_name text,
  p_location_code text,
  p_region text default null,
  p_timezone text default 'UTC',
  p_country_code text default 'US',
  p_address jsonb default '{}'::jsonb
)
returns public.organizations
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_existing_locations integer;
  v_location public.organizations;
  v_has_local_entitlement boolean;
  v_has_multi_location_entitlement boolean;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.is_org_admin(p_organization_id) then
    raise exception 'Organization administrator access required' using errcode = '42501';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Location name is required' using errcode = '22023';
  end if;

  if p_location_code !~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,31} then
    raise exception 'Location code must be 2-32 characters using letters, numbers, hyphens, or underscores' using errcode = '22023';
  end if;

  if p_country_code !~ '^[A-Za-z]{2} then
    raise exception 'Country code must be a two-letter ISO code' using errcode = '22023';
  end if;

  if p_address is not null and jsonb_typeof(p_address) <> 'object' then
    raise exception 'Location address must be a JSON object' using errcode = '22023';
  end if;

  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'Unknown timezone: %', p_timezone using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.organizations o
    where o.id = p_organization_id
      and o.status = 'active'
      and o.organization_type in ('company', 'business_unit')
  ) then
    raise exception 'Active company organization not found' using errcode = '22023';
  end if;

  select count(*)::integer into v_existing_locations
  from public.organizations o
  where o.parent_organization_id = p_organization_id
    and o.organization_type = 'location'
    and o.status = 'active';

  select exists (
    select 1 from public.marketplace_entitlements e
    where e.organization_id = p_organization_id
      and e.entitlement_key = 'local_operations'
      and e.status = 'active'
      and e.scope_type = 'organization'
      and e.location_organization_id is null
      and (e.starts_at is null or e.starts_at <= statement_timestamp())
      and (e.expires_at is null or e.expires_at > statement_timestamp())
  ) into v_has_local_entitlement;

  if not v_has_local_entitlement then
    raise exception 'An active Essential, Professional, or Enterprise local-operations entitlement is required' using errcode = '42501';
  end if;

  if v_existing_locations > 0 then
    select exists (
      select 1 from public.marketplace_entitlements e
      where e.organization_id = p_organization_id
        and e.entitlement_key in ('multi_location_management', 'global_operations_center')
        and e.status = 'active'
        and e.scope_type = 'organization'
        and e.location_organization_id is null
        and (e.starts_at is null or e.starts_at <= statement_timestamp())
        and (e.expires_at is null or e.expires_at > statement_timestamp())
    ) into v_has_multi_location_entitlement;

    if not v_has_multi_location_entitlement then
      raise exception 'Additional locations require Professional multi-location or Enterprise global-operations entitlement' using errcode = '42501';
    end if;
  end if;

  insert into public.organizations (
    parent_organization_id,
    name,
    organization_type,
    status,
    region,
    location_code,
    location_timezone,
    location_country_code,
    location_address
  )
  values (
    p_organization_id,
    trim(p_name),
    'location',
    'active',
    nullif(trim(p_region), ''),
    upper(p_location_code),
    p_timezone,
    upper(p_country_code),
    coalesce(p_address, '{}'::jsonb)
  )
  returning * into v_location;

  insert into public.audit_events (
    organization_id,
    actor_profile_id,
    actor_auth_user_id,
    action,
    resource_type,
    resource_id,
    outcome,
    event_data
  )
  values (
    p_organization_id,
    v_actor,
    v_actor,
    'organization.location_created',
    'organization_location',
    v_location.id::text,
    'success',
    jsonb_build_object(
      'location_code', v_location.location_code,
      'location_name', v_location.name,
      'parent_organization_id', p_organization_id,
      'organization_type', 'location'
    )
  );

  return v_location;
end;
$function$;

revoke all on function public.create_organization_location(uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_organization_location(uuid, text, text, text, text, text, jsonb) to authenticated;


commit;

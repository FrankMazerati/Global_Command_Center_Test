-- Structural regression checks for the three-tier location licensing migration.
-- Run only after the migration is applied to a development database.

do $$
declare
  v_count integer;
  v_rls boolean;
begin
  if to_regclass('public.marketplace_plan_entitlement_catalog') is null then
    raise exception 'Missing marketplace_plan_entitlement_catalog';
  end if;
  if to_regclass('public.marketplace_subscription_locations') is null then
    raise exception 'Missing marketplace_subscription_locations';
  end if;

  select relrowsecurity into v_rls
  from pg_class where oid = 'public.marketplace_plan_entitlement_catalog'::regclass;
  if not coalesce(v_rls, false) then
    raise exception 'Plan entitlement catalog must have RLS enabled';
  end if;

  select relrowsecurity into v_rls
  from pg_class where oid = 'public.marketplace_subscription_locations'::regclass;
  if not coalesce(v_rls, false) then
    raise exception 'Subscription location assignments must have RLS enabled';
  end if;

  select count(distinct plan_key) into v_count
  from public.marketplace_plan_entitlement_catalog;
  if v_count <> 3 then
    raise exception 'Expected exactly three plan keys in the entitlement catalog; found %', v_count;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_read_child_locations'
  ) then raise exception 'Company-scoped location metadata read policy missing'; end if;

  if not exists (
    select 1 from public.marketplace_price_versions
    where price_key = 'package-essential-location-2026-v1'
      and monthly_location_price = 799
      and status = 'draft'
      and approval_status = 'pending'
  ) then raise exception 'Essential price record missing or unexpectedly active'; end if;

  if not exists (
    select 1 from public.marketplace_price_versions
    where price_key = 'package-professional-location-2026-v1'
      and monthly_location_price = 1499
      and status = 'draft'
      and approval_status = 'pending'
  ) then raise exception 'Professional price record missing or unexpectedly active'; end if;

  if not exists (
    select 1 from public.marketplace_price_versions
    where price_key = 'package-enterprise-global-2026-v1'
      and monthly_company_price = 3500
      and management_scope = 'global'
      and status = 'draft'
      and approval_status = 'pending'
  ) then raise exception 'Enterprise price record missing or unexpectedly active'; end if;

  if has_table_privilege('anon', 'public.marketplace_plan_entitlement_catalog', 'select') then
    raise exception 'Anonymous users must not read the plan entitlement catalog';
  end if;
  if has_table_privilege('anon', 'public.marketplace_subscription_locations', 'select') then
    raise exception 'Anonymous users must not read subscription location assignments';
  end if;

  if has_function_privilege('anon', 'public.has_marketplace_entitlement(uuid,text,uuid)', 'execute') then
    raise exception 'Anonymous users must not execute entitlement helper';
  end if;
  if has_function_privilege('anon', 'public.create_organization_location(uuid,text,text,text,text,text,jsonb)', 'execute') then
    raise exception 'Anonymous users must not register organization locations';
  end if;
  if not has_function_privilege('authenticated', 'public.create_organization_location(uuid,text,text,text,text,text,jsonb)', 'execute') then
    raise exception 'Authenticated users must be able to call the guarded location registration RPC';
  end if;

  -- Legacy customer subscription rows are intentionally not updated by this migration.
  -- Do not assert a fixed row count here: legitimate customer activity may change it over time.
end
$$;

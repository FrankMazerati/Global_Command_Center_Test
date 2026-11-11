alter table public.integration_provider_catalog
 add column if not exists is_featured boolean not null default false,
 add column if not exists display_order integer not null default 1000,
 add column if not exists search_aliases text[] not null default '{}'::text[],
 add column if not exists product_surfaces text[] not null default array['command_center']::text[];

create index if not exists integration_provider_catalog_featured_idx
 on public.integration_provider_catalog(is_featured desc, display_order, provider_name);
create index if not exists integration_provider_catalog_aliases_idx
 on public.integration_provider_catalog using gin(search_aliases);
create index if not exists integration_provider_catalog_surfaces_idx
 on public.integration_provider_catalog using gin(product_surfaces);

update public.integration_provider_catalog
set search_aliases = array(
  select distinct lower(trim(x))
  from unnest(array[provider_name,publisher,replace(provider_key,'_',' ')]::text[]) x
  where trim(x) <> ''
),
product_surfaces = case
 when category in ('human_resources','payroll','global_workforce','talent_acquisition','talent_intelligence')
   then array['command_center','intellistaff','intellihire','intelliwork']::text[]
 when category in ('accounting','erp','accounts_payable','expense_management','spend_management','payments','financial_data','financial_close')
   then array['command_center','intellipay','intellisphere']::text[]
 when category in ('crm','marketing_automation','customer_support','contact_center','communications')
   then array['command_center','intelliwork','intellisphere']::text[]
 when category in ('productivity','project_management','work_management','knowledge_management','content_management','cloud_storage','esignature')
   then array['command_center','intelliwork','intellisphere']::text[]
 else array['command_center','intellisphere']::text[]
end;

update public.integration_provider_catalog
set is_featured=true, display_order=case provider_key
 when 'microsoft_365' then 1
 when 'microsoft_entra_id' then 2
 when 'google_workspace' then 3
 when 'okta' then 4
 when 'aws_cloud' then 5
 when 'salesforce' then 6
 when 'slack' then 7
 when 'zoom' then 8
 when 'servicenow' then 9
 when 'microsoft_intune' then 10
 when 'workday' then 11
 when 'github' then 12
 else display_order end
where provider_key in ('microsoft_365','microsoft_entra_id','google_workspace','okta','aws_cloud','salesforce','slack','zoom','servicenow','microsoft_intune','workday','github');

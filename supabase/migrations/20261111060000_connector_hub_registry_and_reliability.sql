
-- Connector Hub foundation: registry, health, sync, webhook intake and event history.
-- Catalog entries are discoverable placeholders only. No provider is represented as connected or production-ready.

alter table public.integration_provider_catalog
  add column if not exists readiness_stage text not null default 'cataloged',
  add column if not exists auth_methods text[] not null default '{}'::text[],
  add column if not exists required_scopes text[] not null default '{}'::text[],
  add column if not exists supported_sync_modes text[] not null default '{}'::text[],
  add column if not exists documentation_url text,
  add column if not exists security_tier text not null default 'standard',
  add column if not exists supports_webhooks boolean not null default false,
  add column if not exists supports_incremental_sync boolean not null default false,
  add column if not exists health_check_interval_seconds integer not null default 900,
  add column if not exists owner_team text not null default 'platform_integrations',
  add column if not exists reviewed_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='integration_provider_catalog_readiness_stage_check') then
    alter table public.integration_provider_catalog add constraint integration_provider_catalog_readiness_stage_check
    check (readiness_stage in ('cataloged','requirements_defined','adapter_in_development','adapter_ready','sandbox_verified','security_reviewed','production_approved','deprecated'));
  end if;
  if not exists (select 1 from pg_constraint where conname='integration_provider_catalog_security_tier_check') then
    alter table public.integration_provider_catalog add constraint integration_provider_catalog_security_tier_check
    check (security_tier in ('standard','sensitive','critical'));
  end if;
  if not exists (select 1 from pg_constraint where conname='integration_provider_catalog_health_interval_check') then
    alter table public.integration_provider_catalog add constraint integration_provider_catalog_health_interval_check
    check (health_check_interval_seconds between 60 and 86400);
  end if;
end $$;

alter table public.integration_connections
  add column if not exists last_successful_sync_at timestamptz,
  add column if not exists last_health_status text not null default 'unknown',
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists next_health_check_at timestamptz,
  add column if not exists credential_reference text,
  add column if not exists auth_expires_at timestamptz,
  add column if not exists connector_config_version integer not null default 1,
  add column if not exists paused_reason text,
  add column if not exists last_provider_request_id text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='integration_connections_health_status_check') then
    alter table public.integration_connections add constraint integration_connections_health_status_check
    check (last_health_status in ('unknown','healthy','degraded','unhealthy','authentication_required','rate_limited'));
  end if;
  if not exists (select 1 from pg_constraint where conname='integration_connections_failure_count_check') then
    alter table public.integration_connections add constraint integration_connections_failure_count_check
    check (consecutive_failures >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='integration_connections_config_version_check') then
    alter table public.integration_connections add constraint integration_connections_config_version_check
    check (connector_config_version > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='integration_connections_provider_catalog_fk') then
    alter table public.integration_connections add constraint integration_connections_provider_catalog_fk
    foreign key (provider_key) references public.integration_provider_catalog(provider_key) on update restrict on delete restrict;
  end if;
end $$;

create table if not exists public.integration_health_checks (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete restrict,
  check_type text not null check (check_type in ('scheduled','manual','post_auth','post_sync','webhook_probe')),
  health_status text not null check (health_status in ('healthy','degraded','unhealthy','authentication_required','rate_limited','unknown')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  provider_http_status integer check (provider_http_status is null or provider_http_status between 100 and 599),
  error_code text,
  sanitized_error text,
  provider_request_id text,
  checked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object')
);

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete restrict,
  sync_type text not null check (sync_type in ('initial','incremental','scheduled','manual','backfill','reconciliation')),
  sync_status text not null default 'queued' check (sync_status in ('queued','running','succeeded','partial','failed','cancelled','waiting_retry')),
  requested_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  records_read bigint not null default 0 check (records_read >= 0),
  records_created bigint not null default 0 check (records_created >= 0),
  records_updated bigint not null default 0 check (records_updated >= 0),
  records_skipped bigint not null default 0 check (records_skipped >= 0),
  records_failed bigint not null default 0 check (records_failed >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  cursor_reference text,
  error_code text,
  sanitized_error text,
  correlation_id text,
  created_at timestamptz not null default now(),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table if not exists public.integration_connection_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete restrict,
  event_key text not null check (length(trim(event_key)) between 1 and 120),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id text,
  event_data jsonb not null default '{}'::jsonb check (jsonb_typeof(event_data)='object'),
  occurred_at timestamptz not null default now()
);

create table if not exists public.integration_webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete restrict,
  provider_event_id text not null,
  event_type text not null,
  payload_sha256 text not null check (length(payload_sha256) between 32 and 128),
  encrypted_payload_reference text,
  signature_verified boolean not null default false,
  processing_status text not null default 'received' check (processing_status in ('received','verified','queued','processing','processed','ignored','failed','dead_letter')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_error_code text,
  correlation_id text,
  safe_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_metadata)='object'),
  unique (connection_id, provider_event_id)
);

create table if not exists public.integration_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete restrict,
  operation_type text not null,
  operation_reference text not null,
  attempt_number integer not null check (attempt_number > 0),
  outcome text not null check (outcome in ('succeeded','retryable_failure','permanent_failure','rate_limited')),
  provider_http_status integer check (provider_http_status is null or provider_http_status between 100 and 599),
  error_code text,
  sanitized_error text,
  retry_after timestamptz,
  attempted_at timestamptz not null default now(),
  correlation_id text,
  unique (connection_id, operation_type, operation_reference, attempt_number)
);

create index if not exists integration_provider_catalog_category_idx on public.integration_provider_catalog(category, provider_name);
create index if not exists integration_provider_catalog_functions_idx on public.integration_provider_catalog using gin(business_functions);
create index if not exists integration_connections_health_due_idx on public.integration_connections(next_health_check_at) where connection_status in ('connected','degraded','error');
create index if not exists integration_health_checks_connection_time_idx on public.integration_health_checks(connection_id, checked_at desc);
create index if not exists integration_sync_runs_queue_idx on public.integration_sync_runs(sync_status, next_attempt_at, created_at) where sync_status in ('queued','waiting_retry');
create index if not exists integration_sync_runs_connection_idx on public.integration_sync_runs(connection_id, created_at desc);
create index if not exists integration_connection_events_timeline_idx on public.integration_connection_events(connection_id, occurred_at desc);
create index if not exists integration_webhook_inbox_queue_idx on public.integration_webhook_inbox(processing_status, next_attempt_at, received_at) where processing_status in ('received','verified','queued','failed','dead_letter');
create index if not exists integration_delivery_attempts_connection_idx on public.integration_delivery_attempts(connection_id, attempted_at desc);

alter table public.integration_provider_catalog enable row level security;
drop policy if exists integration_provider_catalog_authenticated_read on public.integration_provider_catalog;
create policy integration_provider_catalog_authenticated_read on public.integration_provider_catalog
for select to authenticated using (true);
grant select on public.integration_provider_catalog to authenticated;
revoke insert, update, delete on public.integration_provider_catalog from anon, authenticated;

alter table public.integration_health_checks enable row level security;
alter table public.integration_sync_runs enable row level security;
alter table public.integration_connection_events enable row level security;
alter table public.integration_webhook_inbox enable row level security;
alter table public.integration_delivery_attempts enable row level security;

-- Admin-scoped visibility only. Credentials, webhook payloads and operational writes stay server-side.
do $$ declare t text; begin
 foreach t in array array['integration_health_checks','integration_sync_runs','integration_connection_events','integration_webhook_inbox','integration_delivery_attempts'] loop
   execute format('drop policy if exists %I on public.%I', t||'_admin_read', t);
   execute format($p$create policy %I on public.%I for select to authenticated using (
     exists (
       select 1 from public.integration_connections c
       join public.profiles p on p.id=(select auth.uid())
       join public.profile_roles pr on pr.profile_id=p.id
       join public.roles r on r.id=pr.role_id
       where c.id=%I.connection_id
         and p.member_status='active'
         and p.organization_id=c.organization_id
         and (c.tenant_id is null or p.tenant_id=c.tenant_id)
         and pr.is_active and (pr.expires_at is null or pr.expires_at>now())
         and r.role_key=any(array['super_admin','global_admin','organization_admin','security_admin','it_manager'])
     )
   )$p$, t||'_admin_read',t,t);
 end loop;
end $$;

revoke all on public.integration_health_checks, public.integration_sync_runs,
 public.integration_connection_events, public.integration_webhook_inbox,
 public.integration_delivery_attempts from anon, authenticated;
grant select on public.integration_health_checks, public.integration_sync_runs,
 public.integration_connection_events, public.integration_webhook_inbox,
 public.integration_delivery_attempts to authenticated;

-- The following catalog rows are discovery entries only; adapter readiness is not implied.
insert into public.integration_provider_catalog
(provider_key,provider_name,publisher,category,description,business_functions,capabilities,catalog_status,metadata,integration_role)
values
('google_workspace','Google Workspace','Google','productivity','collaboration;email;calendar;documents', ARRAY['collaboration','email','calendar','documents']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('google_cloud','Google Cloud','Google','cloud_infrastructure','cloud;infrastructure;security', ARRAY['cloud','infrastructure','security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('google_identity','Google Cloud Identity','Google','identity','identity;directory;access', ARRAY['identity','directory','access']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('aws_iam_identity_center','AWS IAM Identity Center','Amazon Web Services','identity','identity;directory;access', ARRAY['identity','directory','access']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('aws_cloud','Amazon Web Services','Amazon','cloud_infrastructure','cloud;infrastructure;security', ARRAY['cloud','infrastructure','security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('amazon_s3','Amazon S3','Amazon','cloud_storage','storage;backup;files', ARRAY['storage','backup','files']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('apple_business_manager','Apple Business Manager','Apple','device_management','devices;identity;deployment', ARRAY['devices','identity','deployment']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('okta','Okta','Okta','identity','identity;sso;directory', ARRAY['identity','sso','directory']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('ping_identity','Ping Identity','Ping Identity','identity','identity;sso;directory', ARRAY['identity','sso','directory']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('auth0','Auth0','Okta','identity','identity;authentication', ARRAY['identity','authentication']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('onelogin','OneLogin','One Identity','identity','identity;sso', ARRAY['identity','sso']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('duo_security','Cisco Duo','Cisco','identity_security','mfa;identity;security', ARRAY['mfa','identity','security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('jumpcloud','JumpCloud','JumpCloud','identity','identity;directory;devices', ARRAY['identity','directory','devices']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('microsoft_sentinel','Microsoft Sentinel','Microsoft','security_analytics','security;siem;incident_response', ARRAY['security','siem','incident_response']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('palo_alto_cortex','Palo Alto Cortex XDR','Palo Alto Networks','cybersecurity','security;endpoint;incident_response', ARRAY['security','endpoint','incident_response']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('palo_alto_prisma','Palo Alto Prisma Cloud','Palo Alto Networks','cloud_security','security;cloud;posture', ARRAY['security','cloud','posture']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('fortinet_fortigate','Fortinet FortiGate','Fortinet','network_security','network;firewall;security', ARRAY['network','firewall','security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('zscaler','Zscaler','Zscaler','network_security','zero_trust;web_security', ARRAY['zero_trust','web_security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('tenable','Tenable','Tenable','vulnerability_management','security;vulnerability', ARRAY['security','vulnerability']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('qualys','Qualys','Qualys','vulnerability_management','security;vulnerability', ARRAY['security','vulnerability']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('rapid7','Rapid7 Insight','Rapid7','security_analytics','security;vulnerability;siem', ARRAY['security','vulnerability','siem']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sentinelone','SentinelOne','SentinelOne','cybersecurity','security;endpoint', ARRAY['security','endpoint']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('wiz','Wiz','Wiz','cloud_security','security;cloud', ARRAY['security','cloud']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('proofpoint','Proofpoint','Proofpoint','email_security','security;email', ARRAY['security','email']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('mimecast','Mimecast','Mimecast','email_security','security;email', ARRAY['security','email']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('knowbe4','KnowBe4','KnowBe4','security_awareness','security;training', ARRAY['security','training']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('datadog','Datadog','Datadog','observability','monitoring;logs;apm', ARRAY['monitoring','logs','apm']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('new_relic','New Relic','New Relic','observability','monitoring;apm', ARRAY['monitoring','apm']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('dynatrace','Dynatrace','Dynatrace','observability','monitoring;apm', ARRAY['monitoring','apm']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('grafana_cloud','Grafana Cloud','Grafana Labs','observability','monitoring;dashboards', ARRAY['monitoring','dashboards']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('prometheus','Prometheus','CNCF','observability','metrics;monitoring', ARRAY['metrics','monitoring']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('zabbix','Zabbix','Zabbix','network_monitoring','monitoring;network', ARRAY['monitoring','network']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('nagios','Nagios','Nagios Enterprises','network_monitoring','monitoring;network', ARRAY['monitoring','network']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('prtg','PRTG Network Monitor','Paessler','network_monitoring','monitoring;network', ARRAY['monitoring','network']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('logicmonitor','LogicMonitor','LogicMonitor','network_monitoring','monitoring;network', ARRAY['monitoring','network']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('elastic','Elastic Stack','Elastic','observability','logs;search;security', ARRAY['logs','search','security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sumo_logic','Sumo Logic','Sumo Logic','security_analytics','logs;siem;observability', ARRAY['logs','siem','observability']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('ibm_qradar','IBM QRadar','IBM','security_analytics','siem;security', ARRAY['siem','security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('rapid7_insightidr','Rapid7 InsightIDR','Rapid7','security_analytics','siem;security', ARRAY['siem','security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('servicenow_itom','ServiceNow ITOM','ServiceNow','it_operations','it;cmdb;operations', ARRAY['it','cmdb','operations']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('freshservice','Freshservice','Freshworks','it_service_management','itsm;service_desk', ARRAY['itsm','service_desk']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('freshdesk','Freshdesk','Freshworks','customer_support','support;customer_service', ARRAY['support','customer_service']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('manageengine_servicedesk','ManageEngine ServiceDesk Plus','Zoho','it_service_management','itsm;service_desk', ARRAY['itsm','service_desk']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('bmc_helix','BMC Helix','BMC','it_service_management','itsm;operations', ARRAY['itsm','operations']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('ivanti','Ivanti','Ivanti','endpoint_management','devices;security;it', ARRAY['devices','security','it']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('tanium','Tanium','Tanium','endpoint_management','devices;security;it', ARRAY['devices','security','it']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('ninjaone','NinjaOne','NinjaOne','endpoint_management','devices;patching', ARRAY['devices','patching']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('kandji','Kandji','Kandji','device_management','apple;devices;mdm', ARRAY['apple','devices','mdm']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('jamf','Jamf Pro','Jamf','device_management','apple;devices;mdm', ARRAY['apple','devices','mdm']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('connectwise','ConnectWise','ConnectWise','it_operations','rmm;itsm;operations', ARRAY['rmm','itsm','operations']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('datto','Datto','Kaseya','it_operations','rmm;backup;operations', ARRAY['rmm','backup','operations']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('atera','Atera','Atera','it_operations','rmm;itsm', ARRAY['rmm','itsm']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('salesforce_marketing_cloud','Salesforce Marketing Cloud','Salesforce','marketing_automation','marketing;campaigns', ARRAY['marketing','campaigns']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('hubspot','HubSpot','HubSpot','crm','crm;marketing;sales', ARRAY['crm','marketing','sales']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('zoho_crm','Zoho CRM','Zoho','crm','crm;sales', ARRAY['crm','sales']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('dynamics_365','Dynamics 365','Microsoft','crm','crm;sales;service', ARRAY['crm','sales','service']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('pipedrive','Pipedrive','Pipedrive','crm','crm;sales', ARRAY['crm','sales']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('freshsales','Freshsales','Freshworks','crm','crm;sales', ARRAY['crm','sales']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sugarcrm','SugarCRM','SugarCRM','crm','crm;sales', ARRAY['crm','sales']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('intercom','Intercom','Intercom','customer_support','support;messaging', ARRAY['support','messaging']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('helpscout','Help Scout','Help Scout','customer_support','support;messaging', ARRAY['support','messaging']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('genesys_cloud','Genesys Cloud','Genesys','contact_center','voice;contact_center', ARRAY['voice','contact_center']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('five9','Five9','Five9','contact_center','voice;contact_center', ARRAY['voice','contact_center']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('twilio','Twilio','Twilio','communications','sms;voice;messaging', ARRAY['sms','voice','messaging']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sendgrid','Twilio SendGrid','Twilio','communications','email;messaging', ARRAY['email','messaging']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('mailchimp','Mailchimp','Intuit','marketing_automation','marketing;email', ARRAY['marketing','email']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('constant_contact','Constant Contact','Constant Contact','marketing_automation','marketing;email', ARRAY['marketing','email']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('zoom','Zoom','Zoom','collaboration','video;meetings;messaging', ARRAY['video','meetings','messaging']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('webex','Cisco Webex','Cisco','collaboration','video;meetings;messaging', ARRAY['video','meetings','messaging']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('slack','Slack','Salesforce','collaboration','messaging;workflow', ARRAY['messaging','workflow']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('microsoft_teams','Microsoft Teams','Microsoft','collaboration','messaging;meetings', ARRAY['messaging','meetings']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('asana','Asana','Asana','project_management','projects;tasks', ARRAY['projects','tasks']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('monday_com','monday.com','monday.com','project_management','projects;work_management', ARRAY['projects','work_management']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('clickup','ClickUp','ClickUp','project_management','projects;tasks', ARRAY['projects','tasks']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('trello','Trello','Atlassian','project_management','boards;tasks', ARRAY['boards','tasks']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('notion','Notion','Notion','knowledge_management','documents;knowledge', ARRAY['documents','knowledge']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('smartsheet','Smartsheet','Smartsheet','project_management','projects;work_management', ARRAY['projects','work_management']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('airtable','Airtable','Airtable','work_management','database;workflow', ARRAY['database','workflow']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('microsoft_sharepoint','Microsoft SharePoint','Microsoft','content_management','documents;collaboration', ARRAY['documents','collaboration']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('microsoft_onedrive','Microsoft OneDrive','Microsoft','cloud_storage','files;storage', ARRAY['files','storage']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('google_drive','Google Drive','Google','cloud_storage','files;storage', ARRAY['files','storage']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('dropbox','Dropbox','Dropbox','cloud_storage','files;storage', ARRAY['files','storage']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('box','Box','Box','cloud_storage','files;governance', ARRAY['files','governance']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('egnyte','Egnyte','Egnyte','content_management','files;governance', ARRAY['files','governance']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('docusign','DocuSign','DocuSign','esignature','contracts;signature', ARRAY['contracts','signature']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('adobe_sign','Adobe Acrobat Sign','Adobe','esignature','contracts;signature', ARRAY['contracts','signature']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('github','GitHub','GitHub','developer_tools','source_control;ci_cd', ARRAY['source_control','ci_cd']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('gitlab','GitLab','GitLab','developer_tools','source_control;ci_cd', ARRAY['source_control','ci_cd']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('bitbucket','Bitbucket','Atlassian','developer_tools','source_control;ci_cd', ARRAY['source_control','ci_cd']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('azure_devops','Azure DevOps','Microsoft','developer_tools','source_control;ci_cd', ARRAY['source_control','ci_cd']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('jenkins','Jenkins','Jenkins Project','developer_tools','ci_cd;automation', ARRAY['ci_cd','automation']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('circleci','CircleCI','CircleCI','developer_tools','ci_cd', ARRAY['ci_cd']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('buildkite','Buildkite','Buildkite','developer_tools','ci_cd', ARRAY['ci_cd']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('docker_hub','Docker Hub','Docker','developer_tools','containers;images', ARRAY['containers','images']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('kubernetes','Kubernetes','CNCF','developer_tools','containers;orchestration', ARRAY['containers','orchestration']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('snyk','Snyk','Snyk','developer_security','security;code_scanning', ARRAY['security','code_scanning']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sonarqube','SonarQube','Sonar','developer_security','security;code_quality', ARRAY['security','code_quality']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sentry','Sentry','Sentry','observability','errors;monitoring', ARRAY['errors','monitoring']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('launchdarkly','LaunchDarkly','LaunchDarkly','developer_tools','feature_flags;release', ARRAY['feature_flags','release']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('quickbooks_online','QuickBooks Online','Intuit','accounting','accounting;finance', ARRAY['accounting','finance']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('xero','Xero','Xero','accounting','accounting;finance', ARRAY['accounting','finance']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sage_intacct','Sage Intacct','Sage','accounting','accounting;finance', ARRAY['accounting','finance']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sage_300','Sage 300','Sage','erp','erp;finance', ARRAY['erp','finance']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('oracle_fusion','Oracle Fusion Cloud','Oracle','erp','erp;finance;hr', ARRAY['erp','finance','hr']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('sap_s4hana','SAP S/4HANA','SAP','erp','erp;finance;operations', ARRAY['erp','finance','operations']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('microsoft_dynamics_finance','Dynamics 365 Finance','Microsoft','erp','erp;finance', ARRAY['erp','finance']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('blackline','BlackLine','BlackLine','financial_close','finance;reconciliation', ARRAY['finance','reconciliation']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('bill_com','BILL','BILL','accounts_payable','finance;payables', ARRAY['finance','payables']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('ramp','Ramp','Ramp','spend_management','finance;cards;expenses', ARRAY['finance','cards','expenses']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('brex','Brex','Brex','spend_management','finance;cards;expenses', ARRAY['finance','cards','expenses']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('expensify','Expensify','Expensify','expense_management','finance;expenses', ARRAY['finance','expenses']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('concur','SAP Concur','SAP','expense_management','finance;travel;expenses', ARRAY['finance','travel','expenses']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('stripe','Stripe','Stripe','payments','payments;billing', ARRAY['payments','billing']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('paypal','PayPal','PayPal','payments','payments;checkout', ARRAY['payments','checkout']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('adyen','Adyen','Adyen','payments','payments;checkout', ARRAY['payments','checkout']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('square','Square','Block','payments','payments;point_of_sale', ARRAY['payments','point_of_sale']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('plaid','Plaid','Plaid','financial_data','bank_connectivity;financial_data', ARRAY['bank_connectivity','financial_data']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('workday_hcm','Workday HCM','Workday','human_resources','hr;workforce', ARRAY['hr','workforce']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('ukg','UKG','UKG','human_resources','hr;payroll;workforce', ARRAY['hr','payroll','workforce']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('paychex','Paychex','Paychex','payroll','payroll;hr', ARRAY['payroll','hr']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('gusto','Gusto','Gusto','payroll','payroll;hr', ARRAY['payroll','hr']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('rippling','Rippling','Rippling','human_resources','hr;it;payroll', ARRAY['hr','it','payroll']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('bamboohr','BambooHR','BambooHR','human_resources','hr;people', ARRAY['hr','people']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('deel','Deel','Deel','global_workforce','contractors;payroll', ARRAY['contractors','payroll']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('remote','Remote','Remote','global_workforce','contractors;payroll', ARRAY['contractors','payroll']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('greenhouse','Greenhouse','Greenhouse','talent_acquisition','recruiting;ats', ARRAY['recruiting','ats']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('lever','Lever','Lever','talent_acquisition','recruiting;ats', ARRAY['recruiting','ats']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('icims','iCIMS','iCIMS','talent_acquisition','recruiting;ats', ARRAY['recruiting','ats']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('smartrecruiters','SmartRecruiters','SmartRecruiters','talent_acquisition','recruiting;ats', ARRAY['recruiting','ats']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('workable','Workable','Workable','talent_acquisition','recruiting;ats', ARRAY['recruiting','ats']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('eightfold_ai','Eightfold AI','Eightfold AI','talent_intelligence','recruiting;talent', ARRAY['recruiting','talent']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('power_bi_service','Power BI Service','Microsoft','analytics','analytics;dashboards', ARRAY['analytics','dashboards']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('tableau','Tableau','Salesforce','analytics','analytics;dashboards', ARRAY['analytics','dashboards']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('looker','Looker','Google','analytics','analytics;dashboards', ARRAY['analytics','dashboards']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('snowflake','Snowflake','Snowflake','data_platform','data;warehouse', ARRAY['data','warehouse']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('databricks','Databricks','Databricks','data_platform','data;lakehouse', ARRAY['data','lakehouse']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('fivetran','Fivetran','Fivetran','data_integration','etl;data', ARRAY['etl','data']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('airbyte','Airbyte','Airbyte','data_integration','etl;data', ARRAY['etl','data']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('dbt_cloud','dbt Cloud','dbt Labs','data_platform','analytics;transformation', ARRAY['analytics','transformation']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('segment','Twilio Segment','Twilio','customer_data','customer_data;analytics', ARRAY['customer_data','analytics']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('amplitude','Amplitude','Amplitude','product_analytics','analytics;product', ARRAY['analytics','product']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('mixpanel','Mixpanel','Mixpanel','product_analytics','analytics;product', ARRAY['analytics','product']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('cloudflare','Cloudflare','Cloudflare','network_security','dns;security;edge', ARRAY['dns','security','edge']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('akamai','Akamai','Akamai','network_security','cdn;security', ARRAY['cdn','security']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('vercel','Vercel','Vercel','developer_platform','hosting;deployment', ARRAY['hosting','deployment']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('netlify','Netlify','Netlify','developer_platform','hosting;deployment', ARRAY['hosting','deployment']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('atlassian_statuspage','Atlassian Statuspage','Atlassian','incident_communications','status;incidents', ARRAY['status','incidents']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('pagerduty','PagerDuty','PagerDuty','incident_management','incidents;on_call', ARRAY['incidents','on_call']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('opsgenie','Opsgenie','Atlassian','incident_management','incidents;on_call', ARRAY['incidents','on_call']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector'),
('statuspage_io','Statuspage','Atlassian','incident_communications','status;incidents', ARRAY['status','incidents']::text[], '[]'::jsonb, 'catalog_only', '{}'::jsonb, 'business_connector')
on conflict (provider_key) do update set
  metadata = public.integration_provider_catalog.metadata || excluded.metadata,
  updated_at = now();

update public.integration_provider_catalog
set readiness_stage='cataloged',
    auth_methods='{}'::text[],
    required_scopes='{}'::text[],
    supported_sync_modes='{}'::text[],
    supports_webhooks=false,
    supports_incremental_sync=false,
    owner_team='platform_integrations'
where readiness_stage is null or readiness_stage='';

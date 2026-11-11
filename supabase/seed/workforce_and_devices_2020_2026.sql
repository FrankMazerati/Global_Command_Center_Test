-- Extend the founding-to-current history to 5,000 workforce people and 7,500 managed assets.
begin;

-- 1,500 additional people bring the workforce directory to 5,000.
with dept_map as (
  select
    case
      when g%100 < 5 then 'Executive'
      when g%100 < 12 then 'Finance'
      when g%100 < 20 then 'Human Resources'
      when g%100 < 40 then 'Help Desk'
      when g%100 < 50 then 'IT Administration'
      when g%100 < 60 then 'Security Operations'
      when g%100 < 68 then 'Network Operations'
      when g%100 < 78 then 'Product Engineering'
      when g%100 < 85 then 'Customer Support'
      when g%100 < 91 then 'Sales'
      when g%100 < 96 then 'Governance & Compliance'
      else 'Operations & Facilities'
    end department_name,
    g
  from generate_series(1,1500) g
),
managers as (
  select distinct on (w.department_id) w.department_id,w.id manager_id
  from public.workforce_people w
  where w.organization_id=(select id from public.organizations where slug='intellistack-managed-services')
    and w.job_level in ('Manager','Director','Executive')
  order by w.department_id,w.employee_id
),
new_people as (
  select
    g.g,
    3500+g.g employee_seq,
    md5('history-workforce-person-'||g.g)::uuid person_id,
    d.id department_id,
    m.manager_id,
    date '2020-02-10'+((g.g*97)%2300) hire_date,
    case when g.g%13=0 then 'terminated' else 'active' end employment_status,
    case when g.g%20=0 then 'contractor' when g.g%30=0 then 'part_time' else 'employee' end employment_type,
    (array['Jordan','Taylor','Morgan','Avery','Riley','Cameron','Parker','Quinn','Reese','Drew','Alex','Casey','Jamie','Rowan','Skyler','Emerson','Harper','Blake','Devon','Payton'])[((g.g*3-1)%20)+1] first_name,
    (array['Bennett','Brooks','Carter','Collins','Edwards','Foster','Gray','Hayes','Jenkins','Morgan','Parker','Reed','Sullivan','Turner','Warren','Miller','Nelson','Torres','Lewis','Thompson'])[((g.g*7-1)%20)+1] last_name,
    (array['Chicago','Oak Park','Naperville','Evanston','Dallas','Atlanta','Denver','Seattle'])[((g.g*11-1)%8)+1] city,
    (array['IL','IL','IL','IL','TX','GA','CO','WA'])[((g.g*11-1)%8)+1] region
  from dept_map g
  join public.departments d on d.name=g.department_name
    and d.organization_id=(select id from public.organizations where slug='intellistack-managed-services')
  join managers m on m.department_id=d.id
)
insert into public.workforce_people
  (id,global_person_id,employee_id,organization_id,tenant_id,company_id,department_id,
   first_name,last_name,display_name,work_email,work_phone,job_title,job_level,employment_type,
   employment_status,manager_person_id,location_city,location_region,country_code,timezone,
   identity_source,is_synthetic,directory_sync_status,created_at,updated_at,history_batch_id)
select
  p.person_id,
  'IntelliStack-Global-'||lpad(p.employee_seq::text,6,'0'),
  'IS-EMP-'||lpad(p.employee_seq::text,7,'0'),
  o.id,t.id,'IS-COMP-001',p.department_id,
  p.first_name,p.last_name,p.first_name||' '||p.last_name,
  'person.'||lpad(p.employee_seq::text,7,'0')||'@intellistack.example',
  '+1-773-555-'||lpad((6000+p.g)::text,4,'0'),
  case d.name
    when 'Executive' then (array['Executive Operations Analyst','Strategy Associate','Chief of Staff Analyst'])[((p.g*3-1)%3)+1]
    when 'Finance' then (array['Financial Analyst','Accountant','Finance Operations Specialist'])[((p.g*3-1)%3)+1]
    when 'Human Resources' then (array['Talent Acquisition Specialist','HR Business Partner','People Operations Analyst'])[((p.g*3-1)%3)+1]
    when 'Help Desk' then (array['Service Desk Analyst','Help Desk Specialist','Technical Support Analyst'])[((p.g*3-1)%3)+1]
    when 'IT Administration' then (array['Systems Administrator','Cloud Administrator','Endpoint Administrator'])[((p.g*3-1)%3)+1]
    when 'Security Operations' then (array['Security Operations Analyst','Incident Response Analyst','Threat Monitoring Specialist'])[((p.g*3-1)%3)+1]
    when 'Network Operations' then (array['Network Operations Analyst','Network Engineer','Infrastructure Specialist'])[((p.g*3-1)%3)+1]
    when 'Product Engineering' then (array['Software Engineer','QA Engineer','Product Developer'])[((p.g*3-1)%3)+1]
    when 'Customer Support' then (array['Customer Success Specialist','Customer Support Analyst','Client Services Coordinator'])[((p.g*3-1)%3)+1]
    when 'Sales' then (array['Account Executive','Sales Development Representative','Enterprise Account Manager'])[((p.g*3-1)%3)+1]
    when 'Governance & Compliance' then (array['GRC Analyst','Compliance Specialist','Risk Analyst'])[((p.g*3-1)%3)+1]
    else (array['Operations Coordinator','Facilities Analyst','Business Operations Specialist'])[((p.g*3-1)%3)+1]
  end,
  case when p.g%50=0 then 'Manager' when p.g%7=0 then 'Senior' else 'Individual Contributor' end,
  p.employment_type,p.employment_status,p.manager_id,p.city,p.region,'US','America/Chicago',
  'company_history_seed',true,'not_connected',now(),now(),
  b.id
from new_people p
join public.departments d on d.id=p.department_id
cross join public.organizations o
cross join public.tenants t
cross join public.company_history_batches b
where o.slug='intellistack-managed-services'
  and t.organization_id=o.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- Employee role assignments follow each person's employment status.
insert into public.workforce_role_assignments
  (id,workforce_person_id,role_id,organization_id,tenant_id,assignment_scope,is_primary,is_active,assigned_at)
select
  md5('history-workforce-role-'||w.employee_id)::uuid,
  w.id,r.id,w.organization_id,w.tenant_id,'organization',true,
  w.employment_status='active',
  ((date '2020-02-10'+(((substring(w.employee_id from 8))::int-3500)*97%2300))::timestamp+time '09:00') at time zone 'America/Chicago'
from public.workforce_people w
cross join public.roles r
where w.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
  and r.role_key='employee'
on conflict do nothing;

-- Hire and separation history for the additional employees.
insert into public.workforce_employment_events
  (id,organization_id,workforce_person_id,event_number,event_type,event_date,new_title,new_department_id,
   new_status,notes,metadata,history_batch_id,created_at)
select
  md5('history-new-hire-event-'||w.employee_id)::uuid,
  w.organization_id,w.id,'IS-EMP-EVT-HIRE-'||w.employee_id,'hire',
  date '2020-02-10'+(((substring(w.employee_id from 8))::int-3500)*97%2300),
  w.job_title,w.department_id,'active',
  'Employment commencement and onboarding record.',
  jsonb_build_object('record_lineage','company_history_seed_v1','employee_id',w.employee_id),
  b.id,
  now()
from public.workforce_people w
cross join public.company_history_batches b
where w.history_batch_id=b.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

insert into public.workforce_employment_events
  (id,organization_id,workforce_person_id,event_number,event_type,event_date,previous_status,new_status,
   notes,metadata,history_batch_id,created_at)
select
  md5('history-new-termination-event-'||w.employee_id)::uuid,
  w.organization_id,w.id,'IS-EMP-EVT-TERM-'||w.employee_id,'termination',
  least((now() at time zone 'America/Chicago')::date,
        date '2020-02-10'+(((substring(w.employee_id from 8))::int-3500)*97%2300)+365+((substring(w.employee_id from 8))::int%500)),
  'active','terminated',
  'Employment separation and access offboarding record.',
  jsonb_build_object('record_lineage','company_history_seed_v1','employee_id',w.employee_id),
  b.id,now()
from public.workforce_people w
cross join public.company_history_batches b
where w.history_batch_id=b.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
  and w.employment_status='terminated'
on conflict (id) do nothing;

-- IntelliWork employment documents for the additional workforce.
with people as (
  select w.*,row_number() over(order by w.employee_id) n
  from public.workforce_people w
  where w.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
),
doc_types as (
  select * from (values
    (1,'employment_agreement','Employment Agreement'),
    (2,'policy_acknowledgement','Employee Policy Acknowledgement'),
    (3,'annual_performance_review','Annual Performance Review')
  ) v(n,doc_type,title)
)
insert into public.workforce_documents
  (id,organization_id,document_number,module_key,document_type,title,workforce_person_id,
   effective_date,expires_at,document_status,content_markdown,issued_by_person_id,metadata,history_batch_id,created_at)
select
  md5('history-new-intelliwork-doc-'||p.employee_id||'-'||d.n)::uuid,
  p.organization_id,
  'IS-WORK-DOC-'||p.employee_id||'-'||d.n,
  'intelliwork',d.doc_type,d.title,p.id,
  date '2020-02-10'+(((substring(p.employee_id from 8))::int-3500)*97%2300),
  case when d.n=2 then date '2020-02-10'+(((substring(p.employee_id from 8))::int-3500)*97%2300)+365 else null end,
  case when p.employment_status='terminated' then 'archived' else 'signed' end,
  '# '||d.title||E'\n\nEmployee: '||p.display_name||E'\nEmployee ID: '||p.employee_id||
  E'\nDepartment: '||(select name from public.departments where id=p.department_id)||
  E'\n\nThis IntelliWork record captures employment terms, policy acknowledgement, role expectations, and employee development history.',
  p.manager_person_id,
  jsonb_build_object('record_lineage','company_history_seed_v1','employee_id',p.employee_id),
  (select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1'),
  now()
from people p cross join doc_types d
on conflict (id) do nothing;

-- Add historical procurement, assignment and compliance details to existing devices.
with ranked as (
  select d.id,d.device_status,d.assignment_type,d.workforce_person_id,
    row_number() over(order by d.id) n
  from public.devices d
),
people as (
  select id,row_number() over(order by employee_id) n
  from public.workforce_people
  where organization_id=(select id from public.organizations where slug='intellistack-managed-services')
),
enriched as (
  select r.*,
    coalesce(r.workforce_person_id,
      case when r.assignment_type='individual' and r.device_status='active' and r.n%6<>0
        then (select p.id from people p where p.n=((r.n*13-1)%5000)+1)
        else null end
    ) person_id,
    date '2020-02-10'+((r.n*31)%2350)::int purchase_day
  from ranked r
)
update public.devices d
set
  purchase_date=coalesce(d.purchase_date,e.purchase_day),
  warranty_expiration=coalesce(d.warranty_expiration,(e.purchase_day+interval '3 years')::date),
  workforce_person_id=e.person_id,
  assigned_at=coalesce(d.assigned_at,
    case when e.person_id is not null and d.device_status='active'
      then ((e.purchase_day+14)::timestamp+time '09:00') at time zone 'America/Chicago' else null end),
  compliance_status=case
    when d.device_status='retired' then 'not_applicable'
    when d.device_status='planned' then 'pending_review'
    when d.device_status='quarantined' then 'non_compliant'
    when d.device_status='maintenance' then 'at_risk'
    when e.n%100<86 then 'compliant'
    when e.n%100<96 then 'at_risk'
    else 'non_compliant' end,
  compliance_checked_at=((now() at time zone 'America/Chicago')::date-(e.n%60))::timestamp at time zone 'America/Chicago',
  encryption_status=case when e.n%100<96 then 'enabled' else 'disabled' end,
  secure_boot_status=case when e.n%100<96 then 'enabled' else 'disabled' end,
  firewall_status=case when e.n%100<96 then 'enabled' else 'disabled' end,
  endpoint_protection_status=case when e.n%100<96 then 'enabled' else 'disabled' end,
  management_source=coalesce(d.management_source,'company_history_seed'),
  management_platform=coalesce(d.management_platform,case when e.n%5=0 then 'Jamf Pro' when e.n%5=1 then 'Cisco Network Management' else 'Microsoft Intune' end),
  last_seen_at=coalesce(d.last_seen_at,now()-((e.n%30)||' days')::interval),
  last_inventory_at=coalesce(d.last_inventory_at,now()-((e.n%30)||' days')::interval),
  next_review_at=coalesce(d.next_review_at,((now() at time zone 'America/Chicago')::date+30)::timestamp at time zone 'America/Chicago'),
  acquisition_cost=coalesce(d.acquisition_cost,case when d.asset_class='infrastructure' then 3200 when d.asset_class='mobile' then 750 when d.asset_class='shared_peripheral' then 350 else 1250 end),
  serial_number=coalesce(d.serial_number,'IS-LEGACY-SN-'||lpad(e.n::text,6,'0')),
  asset_tag=coalesce(d.asset_tag,'IS-LEGACY-ASSET-'||lpad(e.n::text,6,'0')),
  manufacturer_serial_hash=coalesce(d.manufacturer_serial_hash,md5(coalesce(d.serial_number,'IS-LEGACY-SN-'||lpad(e.n::text,6,'0')))),
  hostname=coalesce(d.hostname,'IS-LEGACY-'||lpad(e.n::text,5,'0')),
  operating_system=coalesce(d.operating_system,case when d.device_type in ('laptop','desktop') then 'Windows' when d.device_type in ('tablet','work_phone','company_phone') then 'iOS / Android' when d.asset_class='infrastructure' then 'Linux / Network OS' else 'Not Applicable' end),
  os_version=coalesce(d.os_version,case when d.device_type in ('laptop','desktop') then '11' when d.device_type in ('tablet','work_phone','company_phone') then '17' else 'Current' end),
  memory_gb=coalesce(d.memory_gb,case when d.asset_class='infrastructure' then 64 when d.asset_class='endpoint' then 16 else 0 end),
  storage_gb=coalesce(d.storage_gb,case when d.asset_class='infrastructure' then 2048 when d.asset_class='endpoint' then 512 else 0 end),
  location_name=coalesce(d.location_name,'Chicago Headquarters'),
  building=coalesce(d.building,'Main Office'),
  floor_label=coalesce(d.floor_label,'Floor '||((e.n%8)+1)),
  room_label=coalesce(d.room_label,'Room '||lpad((e.n%40+1)::text,2,'0')),
  retired_at=case when d.device_status='retired' then coalesce(d.retired_at,(least(e.purchase_day+730,(now() at time zone 'America/Chicago')::date)::timestamp) at time zone 'America/Chicago') else d.retired_at end,
  disposal_method=case when d.device_status='retired' then coalesce(d.disposal_method,'certified_recycling') else d.disposal_method end,
  data_wipe_verified_at=case when d.device_status='retired' then coalesce(d.data_wipe_verified_at,now()) else d.data_wipe_verified_at end,
  history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1'),
  updated_at=now(),
  metadata=coalesce(d.metadata,'{}'::jsonb)||jsonb_build_object('history_lineage','company_history_seed_v1')
from enriched e
where d.id=e.id;

-- 3,280 new assets bring the device inventory to 7,500.
with type_map as (
  select g,
    case
      when g%100<35 then 'laptop'
      when g%100<50 then 'desktop'
      when g%100<60 then 'tablet'
      when g%100<70 then 'work_phone'
      when g%100<75 then 'company_phone'
      when g%100<85 then 'monitor'
      when g%100<90 then 'printer'
      when g%100<94 then 'server'
      when g%100<97 then 'network_switch'
      else 'wireless_access_point'
    end device_type_key,
    case when g%100<3 then 'retired'
         when g%100<7 then 'maintenance'
         when g%100<11 then 'planned'
         when g%100<13 then 'quarantined'
         else 'active' end device_status,
    date '2020-02-10'+((g*13)%2300)::int purchase_day
  from generate_series(1,3280) g
),
people as (
  select id,row_number() over(order by employee_id) n
  from public.workforce_people
  where organization_id=(select id from public.organizations where slug='intellistack-managed-services')
)
insert into public.devices
  (id,organization_id,tenant_id,device_name,device_type,manufacturer,model,serial_number,asset_tag,
   operating_system,os_version,device_status,last_seen_at,management_source,inventory,created_at,updated_at,
   workforce_person_id,asset_class,ownership_type,assignment_type,enrollment_status,management_platform,
   compliance_status,compliance_checked_at,manufacturer_serial_hash,purchase_date,warranty_expiration,
   lease_end_date,acquisition_cost,currency_code,assigned_at,location_name,building,floor_label,room_label,
   hostname,domain_name,directory_join_type,processor,memory_gb,storage_gb,encryption_status,
   secure_boot_status,firewall_status,endpoint_protection_status,os_build,last_inventory_at,next_review_at,
   retired_at,disposal_method,data_wipe_verified_at,privacy_scope,remote_lock_allowed,remote_wipe_allowed,
   metadata,history_batch_id)
select
  md5('history-device-'||m.g)::uuid,
  o.id,t.id,
  'IS-DEVICE-'||lpad((4220+m.g)::text,6,'0'),
  c.device_type_key,
  case when c.device_type_key in ('server','network_switch','wireless_access_point') then (array['Cisco','Juniper','Ubiquiti','HPE'])[((m.g*3-1)%4)+1]
       when c.device_type_key in ('work_phone','company_phone','tablet') then (array['Apple','Samsung','Google'])[((m.g*5-1)%3)+1]
       when c.device_type_key in ('monitor','printer') then (array['Dell','HP','LG','Canon'])[((m.g*7-1)%4)+1]
       else (array['Dell','Lenovo','HP','Apple'])[((m.g*11-1)%4)+1] end,
  case when c.device_type_key='laptop' then (array['Latitude 7440','ThinkPad T14','EliteBook 840','MacBook Pro'])[((m.g*3-1)%4)+1]
       when c.device_type_key='desktop' then (array['OptiPlex 7010','ThinkCentre M90','ProDesk 600'])[((m.g*3-1)%3)+1]
       when c.device_type_key='tablet' then (array['iPad Air','Galaxy Tab S9','Surface Pro'])[((m.g*3-1)%3)+1]
       when c.device_type_key in ('work_phone','company_phone') then (array['iPhone 15','Galaxy S24','Pixel 9'])[((m.g*3-1)%3)+1]
       when c.device_type_key='server' then (array['ProLiant DL380','PowerEdge R760','ThinkSystem SR650'])[((m.g*3-1)%3)+1]
       when c.device_type_key='network_switch' then (array['Catalyst 9300','EX3400','UniFi Pro'])[((m.g*3-1)%3)+1]
       else c.device_type_key||' Enterprise' end,
  'IS-HIST-SN-'||lpad(m.g::text,7,'0'),
  'IS-HIST-ASSET-'||lpad(m.g::text,7,'0'),
  case when c.device_type_key in ('laptop','desktop') then 'Windows'
       when c.device_type_key in ('tablet','work_phone','company_phone') then 'iOS / Android'
       when c.device_type_key in ('server','network_switch','wireless_access_point') then 'Linux / Network OS'
       else 'Not Applicable' end,
  case when c.device_type_key in ('laptop','desktop') then '11'
       when c.device_type_key in ('tablet','work_phone','company_phone') then '17'
       else 'Current' end,
  c.device_status::asset_status,
  case when c.device_status='active' then now()-((m.g%25)||' days')::interval else null end,
  'company_history_seed',
  jsonb_build_object('device_type',c.device_type_key,'procurement_batch','IS-PROC-'||lpad(((m.g-1)/100+1)::text,4,'0')),
  c.purchase_day::timestamptz,now(),
  case when c.device_status='active' and c.device_type_key in ('laptop','desktop','tablet','work_phone','company_phone') and m.g%5<>0
       then p.id else null end,
  cat.asset_class,
  case when c.device_type_key in ('byod_phone','byod_tablet','byod_laptop') then 'byod'
       when m.g%10=0 then 'leased' else 'company_owned' end,
  case when cat.default_assignment_type='individual' and c.device_status='active' and m.g%5<>0 then 'individual'
       else cat.default_assignment_type end,
  case when c.device_status='retired' then 'retired'
       when c.device_status='planned' then 'pending'
       when c.device_status='quarantined' then 'blocked'
       when c.device_status='active' then 'enrolled'
       else 'enrolled' end,
  case when m.g%5=0 then 'Jamf Pro' when m.g%5=1 then 'Cisco Network Management' else 'Microsoft Intune' end,
  case when c.device_status='retired' then 'not_applicable'
       when c.device_status='planned' then 'pending_review'
       when c.device_status='quarantined' then 'non_compliant'
       when c.device_status='maintenance' then 'at_risk'
       when m.g%100<85 then 'compliant'
       when m.g%100<95 then 'at_risk'
       else 'non_compliant' end,
  ((now() at time zone 'America/Chicago')::date-(m.g%60))::timestamp at time zone 'America/Chicago',
  md5('IS-HIST-SN-'||lpad(m.g::text,7,'0')),
  c.purchase_day,(c.purchase_day+interval '3 years')::date,
  case when m.g%10=0 then (c.purchase_day+interval '3 years')::date else null end,
  case when cat.asset_class='infrastructure' then 4500 when cat.asset_class='mobile' then 800 when cat.asset_class='shared_peripheral' then 450 else 1450 end,
  'USD',
  case when c.device_status='active' and c.device_type_key in ('laptop','desktop','tablet','work_phone','company_phone') and m.g%5<>0
       then ((c.purchase_day+14)::timestamp+time '09:00') at time zone 'America/Chicago' else null end,
  'Chicago Headquarters','Main Office','Floor '||((m.g%8)+1),'Room '||lpad((m.g%40+1)::text,2,'0'),
  'IS-HIST-'||lpad(m.g::text,6,'0'),'intellistack.example',
  case when c.device_type_key in ('laptop','desktop') then 'entra_id' when c.device_type_key in ('server','network_switch','wireless_access_point') then 'infrastructure' else 'not_applicable' end,
  case when c.device_type_key in ('laptop','desktop') then 'Intel Core i7' when c.device_type_key='server' then 'Intel Xeon' else 'Not Applicable' end,
  case when c.device_type_key in ('laptop','desktop') then 16 when c.device_type_key='server' then 128 else 8 end,
  case when c.device_type_key in ('laptop','desktop') then 512 when c.device_type_key='server' then 4096 else 256 end,
  case when c.device_status='quarantined' or m.g%100>=95 then 'disabled' else 'enabled' end,
  case when c.device_status='quarantined' or m.g%100>=95 then 'disabled' else 'enabled' end,
  case when c.device_status='quarantined' or m.g%100>=95 then 'disabled' else 'enabled' end,
  case when c.device_status='quarantined' or m.g%100>=95 then 'disabled' else 'enabled' end,
  case when c.device_type_key in ('laptop','desktop') then '22631' else 'Current' end,
  ((now() at time zone 'America/Chicago')::date-(m.g%30))::timestamp at time zone 'America/Chicago',
  ((now() at time zone 'America/Chicago')::date+30)::timestamp at time zone 'America/Chicago',
  case when c.device_status='retired' then least(c.purchase_day+730,(now() at time zone 'America/Chicago')::date)::timestamp at time zone 'America/Chicago' else null end,
  case when c.device_status='retired' then 'certified_recycling' else null end,
  case when c.device_status='retired' then ((now() at time zone 'America/Chicago')::date::timestamp) at time zone 'America/Chicago' else null end,
  case when m.g%10=0 then 'work_profile_only' when cat.asset_class='shared_peripheral' then 'shared_equipment' else 'full_company_device' end,
  m.g%10<>0,m.g%10<>0,
  jsonb_build_object('record_lineage','company_history_seed_v1','procurement_year',extract(year from c.purchase_day)),
  b.id
from type_map c
join public.device_type_catalog cat on cat.device_type_key=c.device_type_key
cross join public.organizations o
cross join public.tenants t
cross join public.company_history_batches b
left join people p on p.n=((c.g*17-1)%5000)+1
where o.slug='intellistack-managed-services'
  and t.organization_id=o.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- Asset assignment, procurement, lifecycle and compliance history.
insert into public.device_assignment_history
  (id,device_id,workforce_person_id,assignment_type,assigned_at,returned_at,condition_on_issue,
   condition_on_return,notes,created_at,history_batch_id)
select
  md5('history-device-assignment-'||d.id)::uuid,
  d.id,d.workforce_person_id,d.assignment_type,d.assigned_at,
  case when d.device_status='retired' then d.retired_at else null end,
  'good',
  case when d.device_status='retired' then 'fair' else null end,
  'Historical device issue record linked to the workforce directory.',
  d.assigned_at,
  b.id
from public.devices d
cross join public.company_history_batches b
where d.history_batch_id=b.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
  and d.workforce_person_id is not null
  and d.assigned_at is not null
on conflict (id) do nothing;

insert into public.device_lifecycle_events
  (id,device_id,event_type,event_at,actor_profile_id,details,created_at,history_batch_id)
select
  md5('history-device-event-received-'||d.id)::uuid,
  d.id,'received',
  ((d.purchase_date::timestamp+time '12:00') at time zone 'America/Chicago'),
  null,
  jsonb_build_object('purchase_date',d.purchase_date,'acquisition_cost',d.acquisition_cost,'record_lineage','company_history_seed_v1'),
  ((d.purchase_date::timestamp+time '12:00') at time zone 'America/Chicago'),
  b.id
from public.devices d
cross join public.company_history_batches b
where d.history_batch_id=b.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
  and d.purchase_date is not null
on conflict (id) do nothing;

insert into public.device_lifecycle_events
  (id,device_id,event_type,event_at,actor_profile_id,details,created_at,history_batch_id)
select
  md5('history-device-event-issued-'||d.id)::uuid,
  d.id,'issued',d.assigned_at,null,
  jsonb_build_object('workforce_person_id',d.workforce_person_id,'assignment_type',d.assignment_type,'record_lineage','company_history_seed_v1'),
  d.assigned_at,b.id
from public.devices d
cross join public.company_history_batches b
where d.history_batch_id=b.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
  and d.assigned_at is not null
on conflict (id) do nothing;

insert into public.device_lifecycle_events
  (id,device_id,event_type,event_at,actor_profile_id,details,created_at,history_batch_id)
select
  md5('history-device-event-retired-'||d.id)::uuid,
  d.id,'retired',d.retired_at,null,
  jsonb_build_object('disposal_method',d.disposal_method,'data_wipe_verified_at',d.data_wipe_verified_at,'record_lineage','company_history_seed_v1'),
  d.retired_at,b.id
from public.devices d
cross join public.company_history_batches b
where d.history_batch_id=b.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
  and d.retired_at is not null
on conflict (id) do nothing;

insert into public.device_compliance_checks
  (id,device_id,checked_at,check_source,policy_key,result,severity,evidence,remediation_guidance,reviewed_by_profile_id,created_at,history_batch_id)
select
  md5('history-device-compliance-'||d.id||'-'||k.policy_key)::uuid,
  d.id,d.compliance_checked_at,'scheduled_policy_scan',k.policy_key,
  case when d.compliance_status='compliant' then 'pass'
       when d.compliance_status='non_compliant' then 'fail'
       when d.compliance_status='not_applicable' then 'not_applicable'
       when d.compliance_status='pending_review' then 'unknown'
       else 'warning' end,
  case when d.compliance_status='non_compliant' then 'high'
       when d.compliance_status='at_risk' then 'medium'
       when d.compliance_status='compliant' then 'informational'
       else null end,
  jsonb_build_object('device_id',d.id,'compliance_status',d.compliance_status,'checked_at',d.compliance_checked_at,'record_lineage','company_history_seed_v1'),
  case when d.compliance_status='non_compliant' then 'Review the device policy configuration and remediate the failed control.'
       when d.compliance_status='at_risk' then 'Review the device and confirm the policy is current.'
       else null end,
  null,d.compliance_checked_at,b.id
from public.devices d
cross join public.company_history_batches b
cross join (values ('disk_encryption'),('endpoint_protection')) k(policy_key)
where d.history_batch_id=b.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
  and d.compliance_checked_at is not null
on conflict (id) do nothing;

update public.company_history_batches
set record_counts=record_counts||jsonb_build_object(
  'workforce_people_total',(select count(*) from public.workforce_people where organization_id=company_history_batches.organization_id),
  'new_workforce_people',(select count(*) from public.workforce_people where history_batch_id=company_history_batches.id),
  'devices_total',(select count(*) from public.devices where organization_id=company_history_batches.organization_id),
  'device_assignment_history',(select count(*) from public.device_assignment_history where history_batch_id=company_history_batches.id),
  'device_lifecycle_events',(select count(*) from public.device_lifecycle_events where history_batch_id=company_history_batches.id),
  'device_compliance_checks',(select count(*) from public.device_compliance_checks where history_batch_id=company_history_batches.id),
  'employment_events',(select count(*) from public.workforce_employment_events where history_batch_id=company_history_batches.id),
  'workforce_documents',(select count(*) from public.workforce_documents where history_batch_id=company_history_batches.id)
)
where batch_key='intellistack-company-history-2020-2026-v1';

commit;
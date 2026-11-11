-- Bring service history to 10,000 tickets with linked workforce identities and auditable SLA clocks.
begin;

-- Attach existing test tickets to workforce identities where the authenticated profile matches.
update public.tickets t
set requester_workforce_person_id=coalesce(t.requester_workforce_person_id,(
      select w.id from public.profiles p
      join public.workforce_people w on lower(w.work_email)=lower(p.work_email)
      where p.id=t.requester_profile_id limit 1
    )),
    assigned_workforce_person_id=coalesce(t.assigned_workforce_person_id,(
      select w.id from public.profiles p
      join public.workforce_people w on lower(w.work_email)=lower(p.work_email)
      where p.id=t.assigned_profile_id limit 1
    ))
where t.history_batch_id is null;

-- Normalize the legacy open-ticket SLA clocks without changing their status or opening history.
with active_tickets as (
  select t.id,t.organization_id,t.tenant_id,t.sla_policy_id,p.response_target_minutes,p.resolution_target_minutes
  from public.tickets t
  join public.ticket_sla_policies p on p.id=t.sla_policy_id
  where t.history_batch_id is null
    and t.status::text not in ('closed','resolved','cancelled')
)
update public.tickets t
set first_response_at=coalesce(t.first_response_at,now()-interval '1 minute'),
    response_due_at=now()+(a.response_target_minutes*interval '1 minute'),
    resolution_due_at=now()+(a.resolution_target_minutes*interval '1 minute'),
    response_breached_at=null,
    resolution_breached_at=null,
    updated_at=now()
from active_tickets a
where t.id=a.id;

-- Record the initial live SLA clock baseline for legacy active tickets.
insert into public.ticket_sla_clock_events
  (id,organization_id,tenant_id,ticket_id,actor_profile_id,event_type,occurred_at,metadata,history_batch_id)
select
  md5('history-existing-ticket-sla-start-'||t.id)::uuid,
  t.organization_id,t.tenant_id,t.id,null,'sla_policy_applied',now(),
  jsonb_build_object('reason','initial live SLA clock baseline','policy_id',t.sla_policy_id,'record_lineage','company_history_seed_v1'),
  b.id
from public.tickets t
cross join public.company_history_batches b
where t.history_batch_id is null
  and t.status::text not in ('closed','resolved','cancelled')
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

insert into public.ticket_sla_clock_events
  (id,organization_id,tenant_id,ticket_id,actor_profile_id,event_type,occurred_at,metadata,history_batch_id)
select
  md5('history-existing-ticket-first-response-'||t.id)::uuid,
  t.organization_id,t.tenant_id,t.id,null,'first_response',t.first_response_at,
  jsonb_build_object('response_channel','service_desk','record_lineage','company_history_seed_v1'),
  b.id
from public.tickets t
cross join public.company_history_batches b
where t.history_batch_id is null
  and t.status::text not in ('closed','resolved','cancelled')
  and t.first_response_at is not null
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- 9,249 new records bring the service desk to exactly 10,000 tickets.
with people as (
  select w.id,w.department_id,row_number() over(order by w.employee_id) n
  from public.workforce_people w
  where w.organization_id=(select id from public.organizations where slug='intellistack-managed-services')
),
policies as (
  select distinct on (priority::text)
    id,priority::text priority_key,response_target_minutes,resolution_target_minutes
  from public.ticket_sla_policies
  where is_active and is_default_seed
  order by priority::text,is_default_seed desc
),
base as (
  select
    g n,
    case when g<=15 then case when g%2=0 then 'critical' else 'high' end
         when g%100<2 then 'critical'
         when g%100<12 then 'high'
         when g%100<52 then 'medium'
         else 'low' end priority_key,
    case when g<=15 then 'escalated'
         when g<=65 then 'accepted'
         when g<=125 then 'in_progress'
         when g<=185 then 'waiting'
         else case when g%100<65 then 'closed'
                   when g%100<90 then 'resolved'
                   else 'cancelled' end end status_key,
    (((g*31-1)%5000)+1) requester_n,
    (((g*17-1)%5000)+1) assignee_n,
    case when g<=15 then now()-interval '12 hours'
         when g<=185 then now()-interval '2 minutes'
         else ((date '2020-02-10'+((g*31)%2400)::int)::timestamp+time '09:00') at time zone 'America/Chicago' end opened_time,
    case when g%10=0 then 'Security & Compliance'
         when g%9=0 then 'Identity & Access'
         when g%8=0 then 'Network & Connectivity'
         when g%7=0 then 'Endpoint & Device'
         when g%6=0 then 'Marketplace & Subscriptions'
         when g%5=0 then 'HR & Staffing'
         else (array['Software & Productivity','Knowledge & Workflow','Hardware','Finance & Billing','Service Request'])[((g*7-1)%5)+1] end category_name
  from generate_series(1,9249) g
),
ticket_rows as (
  select
    b.*,
    p.id sla_policy_id,p.response_target_minutes,p.resolution_target_minutes,
    req.id requester_id,ass.id assignee_id,ass.department_id,
    case when b.status_key in ('closed','resolved') then
      b.opened_time+(p.resolution_target_minutes*case when b.n%11=0 then 1.5 else 0.75 end)*interval '1 minute'
      else null end resolved_time,
    case when b.status_key='closed' then
      b.opened_time+(p.resolution_target_minutes*case when b.n%11=0 then 1.5 else 0.75 end)*interval '1 minute'+interval '1 day'
      when b.status_key='cancelled' then b.opened_time+interval '1 day'
      else null end closed_time
  from base b
  join policies p on p.priority_key=b.priority_key
  join people req on req.n=b.requester_n
  join people ass on ass.n=b.assignee_n
)
insert into public.tickets
  (id,ticket_number,organization_id,tenant_id,requester_profile_id,assigned_profile_id,
   requester_workforce_person_id,assigned_workforce_person_id,department_id,title,description,category,
   priority,status,current_step,total_steps,source,resolution_summary,opened_at,resolved_at,closed_at,
   created_at,updated_at,sla_policy_id,response_due_at,resolution_due_at,first_response_at,
   requester_wait_started_at,requester_wait_seconds,response_breached_at,resolution_breached_at,
   waiting_on,history_batch_id)
select
  md5('history-ticket-'||r.n)::uuid,
  1000000+r.n,
  o.id,t.id,null,null,
  r.requester_id,r.assignee_id,r.department_id,
  case r.category_name
    when 'Security & Compliance' then (array['Suspicious sign-in requires investigation','Endpoint security alert review','Access review exception','Security policy validation'])[((r.n*3-1)%4)+1]
    when 'Identity & Access' then (array['New employee access provisioning','Multi-factor authentication issue','Role assignment review','Directory synchronization request'])[((r.n*3-1)%4)+1]
    when 'Network & Connectivity' then (array['Intermittent network connectivity','Wireless access point investigation','VPN access request','Network performance degradation'])[((r.n*3-1)%4)+1]
    when 'Endpoint & Device' then (array['Laptop hardware service request','Device enrollment issue','Mobile device compliance review','Endpoint replacement request'])[((r.n*3-1)%4)+1]
    when 'Marketplace & Subscriptions' then (array['Subscription renewal assistance','Marketplace product access request','Customer billing question','Enterprise license adjustment'])[((r.n*3-1)%4)+1]
    when 'HR & Staffing' then (array['Employee onboarding workflow','Staffing assignment update','Recruitment process support','Employment document request'])[((r.n*3-1)%4)+1]
    else (array['Business application support request','Knowledge article correction','Hardware and peripheral support','Financial operations inquiry','Service workflow assistance'])[((r.n*5-1)%5)+1]
  end,
  'Historical service request with linked requester, assignee, department, SLA policy, and lifecycle history.',
  r.category_name,
  r.priority_key::public.ticket_priority,
  r.status_key::public.ticket_status,
  case when r.status_key in ('closed','resolved','cancelled') then 5 else 3 end,
  5,
  (array['portal','email','phone','monitoring','marketplace'])[((r.n*7-1)%5)+1],
  case when r.status_key in ('closed','resolved','cancelled') then 'Resolution and closure recorded in the service history.' else null end,
  r.opened_time,
  r.resolved_time,
  r.closed_time,
  r.opened_time,
  coalesce(r.closed_time,r.resolved_time,r.opened_time),
  r.sla_policy_id,
  r.opened_time+(r.response_target_minutes*interval '1 minute'),
  r.opened_time+(r.resolution_target_minutes*interval '1 minute'),
  case when r.n<=15 then null
       when r.n<=185 then r.opened_time+interval '1 minute'
       when r.n%13=0 then r.opened_time+(r.response_target_minutes*2)*interval '1 minute'
       else r.opened_time+(greatest(1,r.response_target_minutes/2))*interval '1 minute' end,
  case when r.status_key='waiting' then r.opened_time+interval '1 minute' else null end,
  case when r.status_key='waiting' then 60 else 0 end,
  case when r.n<=15 or (r.n>185 and r.n%13=0) then r.opened_time+(r.response_target_minutes*interval '1 minute') else null end,
  case when r.n<=15 or (r.status_key in ('closed','resolved') and r.n%11=0) then r.opened_time+(r.resolution_target_minutes*interval '1 minute') else null end,
  case when r.status_key='waiting' then 'requester' when r.status_key='escalated' then 'internal_team' else 'none' end,
  b.id
from ticket_rows r
cross join public.organizations o
cross join public.tenants t
cross join public.company_history_batches b
where o.slug='intellistack-managed-services'
  and t.organization_id=o.id
  and b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

-- Four lifecycle entries per historical ticket.
with tickets as (
  select t.*,(t.ticket_number-1000000)::int n
  from public.tickets t
  where t.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
),
event_rows as (
  select
    t.*,
    e.event_no,
    case e.event_no
      when 1 then 'created'
      when 2 then 'triaged'
      when 3 then 'assigned'
      else case t.status::text
        when 'closed' then 'closed'
        when 'resolved' then 'resolved'
        when 'cancelled' then 'commented'
        when 'escalated' then 'escalated'
        when 'waiting' then 'waiting'
        when 'accepted' then 'commented'
        else 'in_progress' end
    end event_key,
    case e.event_no
      when 1 then null
      when 2 then 'new'
      when 3 then 'accepted'
      else case when t.status::text='accepted' then 'accepted' else 'in_progress' end
    end from_status,
    case e.event_no
      when 1 then 'new'
      when 2 then 'accepted'
      when 3 then case when t.status::text='accepted' then 'accepted' else 'in_progress' end
      else t.status::text
    end to_status,
    case e.event_no
      when 1 then t.opened_at
      when 2 then t.opened_at+interval '2 minutes'
      when 3 then t.opened_at+interval '5 minutes'
      else coalesce(t.closed_at,t.resolved_at,t.opened_at+interval '10 minutes')
    end event_at
  from tickets t
  cross join generate_series(1,4) e(event_no)
)
insert into public.ticket_lifecycle_events
  (id,organization_id,tenant_id,ticket_id,actor_profile_id,event_key,from_status,to_status,reason,metadata,created_at,history_batch_id)
select
  md5('history-ticket-lifecycle-'||e.n||'-'||e.event_no)::uuid,
  e.organization_id,e.tenant_id,e.id,null,e.event_key,e.from_status,e.to_status,
  case e.event_no
    when 1 then 'Ticket submitted and recorded.'
    when 2 then 'Request triaged and assigned a service priority.'
    when 3 then 'Ownership and delivery responsibility recorded.'
    else 'Ticket lifecycle status recorded.' end,
  jsonb_build_object('record_lineage','company_history_seed_v1','ticket_number',e.ticket_number,'sequence',e.event_no),
  e.event_at,e.history_batch_id
from event_rows e
on conflict (id) do nothing;

-- SLA clock history for each ticket.
with tickets as (
  select t.*
  from public.tickets t
  where t.history_batch_id=(select id from public.company_history_batches where batch_key='intellistack-company-history-2020-2026-v1')
),
clock_rows as (
  select t.id ticket_id,t.organization_id,t.tenant_id,t.history_batch_id,
    'sla_policy_applied'::text event_type,t.opened_at occurred_at,1 seq,t.sla_policy_id policy_id
  from tickets t
  union all
  select t.id,t.organization_id,t.tenant_id,t.history_batch_id,
    'clock_started',t.opened_at,2,t.sla_policy_id
  from tickets t
  union all
  select t.id,t.organization_id,t.tenant_id,t.history_batch_id,
    'first_response',t.first_response_at,3,t.sla_policy_id
  from tickets t where t.first_response_at is not null
  union all
  select t.id,t.organization_id,t.tenant_id,t.history_batch_id,
    'response_breached',t.response_breached_at,4,t.sla_policy_id
  from tickets t where t.response_breached_at is not null
  union all
  select t.id,t.organization_id,t.tenant_id,t.history_batch_id,
    'resolution_breached',t.resolution_breached_at,5,t.sla_policy_id
  from tickets t where t.resolution_breached_at is not null
  union all
  select t.id,t.organization_id,t.tenant_id,t.history_batch_id,
    'ticket_resolved',t.resolved_at,6,t.sla_policy_id
  from tickets t where t.resolved_at is not null
)
insert into public.ticket_sla_clock_events
  (id,organization_id,tenant_id,ticket_id,actor_profile_id,event_type,occurred_at,metadata,history_batch_id)
select
  md5('history-ticket-sla-'||c.ticket_id||'-'||c.seq)::uuid,
  c.organization_id,c.tenant_id,c.ticket_id,null,c.event_type,c.occurred_at,
  jsonb_build_object('policy_id',c.policy_id,'record_lineage','company_history_seed_v1'),
  c.history_batch_id
from clock_rows c
on conflict (id) do nothing;

-- 900 escalations; the first 15 remain open and correspond to the current overdue queue.
insert into public.ticket_escalations
  (id,organization_id,tenant_id,ticket_id,level,escalation_reason,status,escalated_by,assigned_to,
   due_at,acknowledged_at,resolved_at,created_at,updated_at,history_batch_id)
select
  md5('history-ticket-escalation-'||g)::uuid,
  t.organization_id,t.tenant_id,t.id,
  ((g-1)%4)+1,
  case when g%4=0 then 'SLA response target exceeded'
       when g%4=1 then 'Security or compliance risk requires escalation'
       when g%4=2 then 'Cross-team dependency requires coordination'
       else 'Customer impact requires management review' end,
  case when g<=15 then 'open' when g<=60 then 'acknowledged' else 'resolved' end,
  null,null,
  t.opened_at+interval '4 hours',
  case when g<=60 and g>15 then now()-interval '1 minute' when g>60 then t.opened_at+interval '15 minutes' else null end,
  case when g>60 then t.opened_at+interval '8 hours' else null end,
  t.opened_at+interval '10 minutes',
  case when g>60 then t.opened_at+interval '8 hours' when g>15 then t.opened_at+interval '15 minutes' else now() end,
  b.id
from generate_series(1,900) g
join public.tickets t on t.id=md5('history-ticket-'||case when g<=60 then g else 185+g end)::uuid
cross join public.company_history_batches b
where b.batch_key='intellistack-company-history-2020-2026-v1'
on conflict (id) do nothing;

update public.company_history_batches
set record_counts=record_counts||jsonb_build_object(
  'tickets_total',(select count(*) from public.tickets where organization_id=company_history_batches.organization_id),
  'new_tickets',(select count(*) from public.tickets where history_batch_id=company_history_batches.id),
  'ticket_lifecycle_events_total',(select count(*) from public.ticket_lifecycle_events),
  'ticket_lifecycle_events_new',(select count(*) from public.ticket_lifecycle_events where history_batch_id=company_history_batches.id),
  'ticket_escalations_total',(select count(*) from public.ticket_escalations),
  'ticket_escalations_new',(select count(*) from public.ticket_escalations where history_batch_id=company_history_batches.id),
  'ticket_sla_clock_events_total',(select count(*) from public.ticket_sla_clock_events),
  'ticket_sla_clock_events_new',(select count(*) from public.ticket_sla_clock_events where history_batch_id=company_history_batches.id)
)
where batch_key='intellistack-company-history-2020-2026-v1';

commit;
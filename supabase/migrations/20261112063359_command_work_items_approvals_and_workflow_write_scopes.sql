create table if not exists public.command_work_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 240),
  description text,
  status text not null default 'open' check (status in ('open','in_progress','blocked','waiting_approval','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('critical','high','medium','low')),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  assignee_profile_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  source_type text not null default 'manual' check (source_type in ('manual','chat_buddy','ticket','workflow','calendar','integration')),
  source_id text,
  assistant_session_id uuid references public.assistant_sessions(id) on delete set null,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  requires_approval boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or status = 'completed')
);
create index if not exists command_work_items_org_tenant_status_idx on public.command_work_items (organization_id, tenant_id, status, priority, due_at);
create index if not exists command_work_items_assignee_status_idx on public.command_work_items (assignee_profile_id, status, due_at);
create index if not exists command_work_items_creator_idx on public.command_work_items (created_by_profile_id, created_at desc);
alter table public.command_work_items enable row level security;
revoke all on public.command_work_items from anon;
grant select, insert, update, delete on public.command_work_items to authenticated;
drop policy if exists command_work_items_read_scope on public.command_work_items;
create policy command_work_items_read_scope on public.command_work_items for select to authenticated using (
  exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
    and p.organization_id=command_work_items.organization_id and p.tenant_id is not distinct from command_work_items.tenant_id
    and (command_work_items.created_by_profile_id=(select auth.uid()) or command_work_items.assignee_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id))
);
drop policy if exists command_work_items_insert_scope on public.command_work_items;
create policy command_work_items_insert_scope on public.command_work_items for insert to authenticated with check (
  created_by_profile_id=(select auth.uid()) and exists (select 1 from public.profiles p where p.id=(select auth.uid())
    and p.member_status='active' and p.organization_id=command_work_items.organization_id and p.tenant_id is not distinct from command_work_items.tenant_id)
  and (assignee_profile_id is null or assignee_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id))
);
drop policy if exists command_work_items_update_scope on public.command_work_items;
create policy command_work_items_update_scope on public.command_work_items for update to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
  and p.organization_id=command_work_items.organization_id and p.tenant_id is not distinct from command_work_items.tenant_id
  and (command_work_items.created_by_profile_id=(select auth.uid()) or command_work_items.assignee_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id))))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.member_status='active'
  and p.organization_id=command_work_items.organization_id and p.tenant_id is not distinct from command_work_items.tenant_id)
  and (assignee_profile_id is null or assignee_profile_id=(select auth.uid()) or public.is_org_admin(command_work_items.organization_id)));
drop policy if exists command_work_items_delete_scope on public.command_work_items;
create policy command_work_items_delete_scope on public.command_work_items for delete to authenticated
using (created_by_profile_id=(select auth.uid()) or public.is_org_admin(organization_id));

create table if not exists public.command_work_item_events (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.command_work_items(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('created','updated','assigned','reassigned','status_changed','priority_changed','commented','completed','reopened','cancelled','approval_requested','approval_decided')),
  from_value jsonb not null default '{}'::jsonb,
  to_value jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists command_work_item_events_item_created_idx on public.command_work_item_events (work_item_id,created_at desc);
alter table public.command_work_item_events enable row level security;
revoke all on public.command_work_item_events from anon;
grant select,insert on public.command_work_item_events to authenticated;
drop policy if exists command_work_item_events_read_scope on public.command_work_item_events;
create policy command_work_item_events_read_scope on public.command_work_item_events for select to authenticated using (
  exists (select 1 from public.command_work_items w where w.id=command_work_item_events.work_item_id
    and w.organization_id=command_work_item_events.organization_id and w.tenant_id is not distinct from command_work_item_events.tenant_id
    and (w.created_by_profile_id=(select auth.uid()) or w.assignee_profile_id=(select auth.uid()) or public.is_org_admin(w.organization_id)))
);
drop policy if exists command_work_item_events_insert_scope on public.command_work_item_events;
create policy command_work_item_events_insert_scope on public.command_work_item_events for insert to authenticated with check (
  actor_profile_id=(select auth.uid()) and exists (select 1 from public.command_work_items w
    join public.profiles p on p.id=(select auth.uid()) where w.id=command_work_item_events.work_item_id
    and w.organization_id=command_work_item_events.organization_id and w.tenant_id is not distinct from command_work_item_events.tenant_id
    and p.organization_id=w.organization_id and p.tenant_id is not distinct from w.tenant_id and p.member_status='active'
    and (w.created_by_profile_id=(select auth.uid()) or w.assignee_profile_id=(select auth.uid()) or public.is_org_admin(w.organization_id)))
);

create table if not exists public.command_work_item_approvals (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.command_work_items(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  requested_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  approver_profile_id uuid references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','approved','denied','cancelled')),
  reason text not null check (length(btrim(reason))>=4),
  decision_reason text,
  decided_by_profile_id uuid references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  check ((status='pending' and decided_at is null and decided_by_profile_id is null)
    or (status in ('approved','denied') and decided_at is not null and decided_by_profile_id is not null and length(btrim(coalesce(decision_reason,'')))>=4)
    or status='cancelled')
);
create index if not exists command_work_item_approvals_inbox_idx on public.command_work_item_approvals (approver_profile_id,status,requested_at desc);
alter table public.command_work_item_approvals enable row level security;
revoke all on public.command_work_item_approvals from anon;
grant select,insert,update on public.command_work_item_approvals to authenticated;
drop policy if exists command_work_item_approvals_read_scope on public.command_work_item_approvals;
create policy command_work_item_approvals_read_scope on public.command_work_item_approvals for select to authenticated
using (requested_by_profile_id=(select auth.uid()) or approver_profile_id=(select auth.uid()) or public.is_org_admin(organization_id));
drop policy if exists command_work_item_approvals_insert_requester on public.command_work_item_approvals;
create policy command_work_item_approvals_insert_requester on public.command_work_item_approvals for insert to authenticated with check (
  requested_by_profile_id=(select auth.uid()) and status='pending' and approver_profile_id is distinct from (select auth.uid())
  and exists (select 1 from public.command_work_items w join public.profiles p on p.id=(select auth.uid())
    where w.id=command_work_item_approvals.work_item_id and w.organization_id=command_work_item_approvals.organization_id
    and w.tenant_id is not distinct from command_work_item_approvals.tenant_id and p.organization_id=w.organization_id
    and p.tenant_id is not distinct from w.tenant_id and p.member_status='active'
    and (w.created_by_profile_id=(select auth.uid()) or w.assignee_profile_id=(select auth.uid()) or public.is_org_admin(w.organization_id)))
);
drop policy if exists command_work_item_approvals_decide on public.command_work_item_approvals;
create policy command_work_item_approvals_decide on public.command_work_item_approvals for update to authenticated
using (status='pending' and requested_by_profile_id<>(select auth.uid()) and (approver_profile_id=(select auth.uid()) or public.is_org_admin(organization_id)))
with check (status in ('approved','denied') and decided_by_profile_id=(select auth.uid()) and decided_at is not null
  and length(btrim(coalesce(decision_reason,'')))>=4 and requested_by_profile_id<>(select auth.uid()));

drop policy if exists workflows_update_creator_scope on public.workflows;
create policy workflows_update_creator_scope on public.workflows for update to authenticated
using (created_by=(select auth.uid()) and exists (select 1 from public.profiles p where p.id=(select auth.uid())
  and p.member_status='active' and p.organization_id=workflows.organization_id and p.tenant_id is not distinct from workflows.tenant_id))
with check (created_by=(select auth.uid()) and exists (select 1 from public.profiles p where p.id=(select auth.uid())
  and p.member_status='active' and p.organization_id=workflows.organization_id and p.tenant_id is not distinct from workflows.tenant_id));

drop policy if exists workflow_runs_update_owner_scope on public.workflow_runs;
create policy workflow_runs_update_owner_scope on public.workflow_runs for update to authenticated
using (started_by=(select auth.uid()) and exists (select 1 from public.profiles p where p.id=(select auth.uid())
  and p.member_status='active' and p.organization_id=workflow_runs.organization_id and p.tenant_id is not distinct from workflow_runs.tenant_id))
with check (started_by=(select auth.uid()) and exists (select 1 from public.profiles p where p.id=(select auth.uid())
  and p.member_status='active' and p.organization_id=workflow_runs.organization_id and p.tenant_id is not distinct from workflow_runs.tenant_id));

drop policy if exists workflow_step_runs_insert_owner_scope on public.workflow_step_runs;
create policy workflow_step_runs_insert_owner_scope on public.workflow_step_runs for insert to authenticated with check (
  exists (select 1 from public.workflow_runs r join public.profiles p on p.id=(select auth.uid())
    where r.id=workflow_step_runs.workflow_run_id and r.started_by=(select auth.uid())
    and r.organization_id=workflow_step_runs.organization_id and r.tenant_id is not distinct from workflow_step_runs.tenant_id
    and p.member_status='active' and p.organization_id=r.organization_id and p.tenant_id is not distinct from r.tenant_id)
);
drop policy if exists workflow_step_runs_update_owner_scope on public.workflow_step_runs;
create policy workflow_step_runs_update_owner_scope on public.workflow_step_runs for update to authenticated
using (exists (select 1 from public.workflow_runs r where r.id=workflow_step_runs.workflow_run_id and r.started_by=(select auth.uid()))
  or assigned_profile_id=(select auth.uid()))
with check (exists (select 1 from public.workflow_runs r where r.id=workflow_step_runs.workflow_run_id and r.started_by=(select auth.uid()))
  or assigned_profile_id=(select auth.uid()));

-- Batch 001: durable workflow execution foundation
-- Additive only. Financial products are documented separately and are not enabled by this migration.

create table if not exists public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete restrict,
  organization_id uuid,
  tenant_id uuid,
  version integer not null check (version > 0),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  definition_sha256 text,
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','retired')),
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workflow_id, version),
  check (tenant_id is null or organization_id is not null),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (tenant_id) references public.tenants(id) on delete restrict
);

create table if not exists public.workflow_step_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete restrict,
  organization_id uuid,
  tenant_id uuid,
  step_key text not null check (length(trim(step_key)) between 1 and 160),
  step_order integer not null check (step_order > 0),
  step_status text not null default 'pending'
    check (step_status in ('pending','ready','running','waiting','succeeded','failed','skipped','cancelled','compensating','compensated')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 1 check (max_attempts > 0),
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  input_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(input_snapshot) = 'object'),
  output_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(output_snapshot) = 'object'),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_run_id, step_key),
  check (completed_at is null or started_at is null or completed_at >= started_at),
  check (organization_id is not null or tenant_id is null),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (tenant_id) references public.tenants(id) on delete restrict
);

create table if not exists public.workflow_run_events (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete restrict,
  organization_id uuid,
  tenant_id uuid,
  event_key text not null check (length(trim(event_key)) between 1 and 120),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  request_id text,
  correlation_id text,
  event_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(event_payload) = 'object'),
  occurred_at timestamptz not null default now(),
  check (organization_id is not null or tenant_id is null),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (tenant_id) references public.tenants(id) on delete restrict
);

create table if not exists public.workflow_run_checkpoints (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete restrict,
  organization_id uuid,
  tenant_id uuid,
  checkpoint_key text not null check (length(trim(checkpoint_key)) between 1 and 160),
  checkpoint_version integer not null default 1 check (checkpoint_version > 0),
  state_snapshot jsonb not null check (jsonb_typeof(state_snapshot) = 'object'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workflow_run_id, checkpoint_key, checkpoint_version),
  check (organization_id is not null or tenant_id is null),
  foreign key (organization_id) references public.organizations(id) on delete restrict,
  foreign key (tenant_id) references public.tenants(id) on delete restrict
);

create table if not exists public.operation_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null check (length(trim(scope_key)) between 1 and 160),
  idempotency_key text not null check (length(trim(idempotency_key)) between 8 and 200),
  request_hash text not null check (length(request_hash) between 32 and 128),
  operation_status text not null default 'processing'
    check (operation_status in ('processing','succeeded','failed','retryable')),
  response_status integer,
  response_body jsonb,
  resource_type text,
  resource_id text,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (scope_key, idempotency_key)
);

create index if not exists workflow_versions_scope_idx
  on public.workflow_versions (organization_id, tenant_id, workflow_id, version desc);
create index if not exists workflow_step_runs_queue_idx
  on public.workflow_step_runs (step_status, next_attempt_at, created_at)
  where step_status in ('pending','ready','failed','waiting');
create index if not exists workflow_step_runs_scope_idx
  on public.workflow_step_runs (organization_id, tenant_id, workflow_run_id);
create index if not exists workflow_run_events_timeline_idx
  on public.workflow_run_events (workflow_run_id, occurred_at desc);
create index if not exists workflow_run_events_scope_idx
  on public.workflow_run_events (organization_id, tenant_id, occurred_at desc);
create index if not exists workflow_run_checkpoints_scope_idx
  on public.workflow_run_checkpoints (workflow_run_id, created_at desc);
create index if not exists operation_idempotency_expiry_idx
  on public.operation_idempotency_keys (expires_at);
create index if not exists operation_idempotency_status_idx
  on public.operation_idempotency_keys (operation_status, created_at);

-- Situation runs were previously RLS-enabled without policies. Add tenant scope and safe self-service visibility.
alter table public.situation_runs
  add column if not exists tenant_id uuid references public.tenants(id) on delete restrict;

create index if not exists situation_runs_scope_idx
  on public.situation_runs (organization_id, tenant_id, started_at desc);

alter table public.workflow_versions enable row level security;
alter table public.workflow_step_runs enable row level security;
alter table public.workflow_run_events enable row level security;
alter table public.workflow_run_checkpoints enable row level security;
alter table public.operation_idempotency_keys enable row level security;
alter table public.situation_runs enable row level security;

drop policy if exists workflow_versions_read_scope on public.workflow_versions;
create policy workflow_versions_read_scope on public.workflow_versions
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.organization_id = workflow_versions.organization_id
      and (workflow_versions.tenant_id is null or p.tenant_id = workflow_versions.tenant_id)
  )
);

drop policy if exists workflow_step_runs_read_scope on public.workflow_step_runs;
create policy workflow_step_runs_read_scope on public.workflow_step_runs
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.organization_id = workflow_step_runs.organization_id
      and (workflow_step_runs.tenant_id is null or p.tenant_id = workflow_step_runs.tenant_id)
  )
);

drop policy if exists workflow_run_events_read_scope on public.workflow_run_events;
create policy workflow_run_events_read_scope on public.workflow_run_events
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.organization_id = workflow_run_events.organization_id
      and (workflow_run_events.tenant_id is null or p.tenant_id = workflow_run_events.tenant_id)
  )
);

drop policy if exists workflow_run_checkpoints_read_scope on public.workflow_run_checkpoints;
create policy workflow_run_checkpoints_read_scope on public.workflow_run_checkpoints
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.organization_id = workflow_run_checkpoints.organization_id
      and (workflow_run_checkpoints.tenant_id is null or p.tenant_id = workflow_run_checkpoints.tenant_id)
  )
);

-- The idempotency registry is backend-only: no direct client reads or writes.
revoke all on public.operation_idempotency_keys from anon, authenticated;
revoke insert, update, delete on public.workflow_versions, public.workflow_step_runs,
  public.workflow_run_events, public.workflow_run_checkpoints from anon, authenticated;
grant select on public.workflow_versions, public.workflow_step_runs,
  public.workflow_run_events, public.workflow_run_checkpoints to authenticated;

-- Situation scenario runs: participants can create and read only their own organization's/tenant's runs.
drop policy if exists situation_runs_read_scope on public.situation_runs;
create policy situation_runs_read_scope on public.situation_runs
for select to authenticated
using (
  started_by = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.organization_id = situation_runs.organization_id
      and (situation_runs.tenant_id is null or p.tenant_id = situation_runs.tenant_id)
  )
);

drop policy if exists situation_runs_insert_scope on public.situation_runs;
create policy situation_runs_insert_scope on public.situation_runs
for insert to authenticated
with check (
  started_by = (select auth.uid())
  and run_status = 'in_progress'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.organization_id = situation_runs.organization_id
      and (situation_runs.tenant_id is null or p.tenant_id = situation_runs.tenant_id)
  )
);

revoke insert, update, delete on public.workflow_versions, public.workflow_step_runs,
  public.workflow_run_events, public.workflow_run_checkpoints from anon, authenticated;

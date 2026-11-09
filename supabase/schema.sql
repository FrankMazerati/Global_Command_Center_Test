-- IntelliSync shared data layer — target schema for Supabase Postgres.
-- This file is the relational contract behind src/lib/domain/types.ts. It is not applied
-- automatically: the application currently runs on browser state, and this schema is the
-- server-side shape the same records move into.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- organisations
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  parent_id uuid references departments (id) on delete set null,
  unique (tenant_id, name)
);

-- ---------------------------------------------------------------- identity
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  department_id uuid references departments (id) on delete set null,
  full_name text not null,
  email text not null,
  employee_number text,
  job_title text,
  role text not null check (role in ('technician', 'manager', 'administrator', 'employee', 'contractor')),
  manager_id uuid references people (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended', 'departed')),
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

-- Platform identity is deliberately separate from any directory identity.
create table if not exists auth_identities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people (id) on delete cascade,
  provider text not null default 'supabase',
  subject text not null,
  last_sign_in_at timestamptz,
  unique (provider, subject)
);

-- One Supabase identity is assigned to exactly one login portal. Provision rows
-- through a trusted admin/service-role workflow; the browser can only read its own.
create table if not exists user_portal_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  portal text not null check (portal in ('intellistack', 'intellistaff', 'intelliwork', 'intellihire', 'tenant')),
  tenant_id uuid references tenants (id) on delete cascade,
  assigned_at timestamptz not null default now()
);

create table if not exists directory_identities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people (id) on delete cascade,
  provider text not null check (provider in ('entra', 'active_directory', 'google')),
  external_id text not null,
  distinguished_name text,
  organisational_unit text,
  synced_at timestamptz not null default now(),
  unique (provider, external_id)
);

-- ---------------------------------------------------------------- assets
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  serial_number text not null,
  manufacturer text,
  model text,
  asset_tag text,
  assigned_person_id uuid references people (id) on delete set null,
  assigned_at timestamptz,
  compliance_state text check (compliance_state in ('unknown', 'compliant', 'non_compliant')),
  created_at timestamptz not null default now(),
  unique (tenant_id, serial_number)
);

create table if not exists device_assignments (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  returned_at timestamptz,
  recorded_by uuid references people (id) on delete set null
);

-- ---------------------------------------------------------------- work
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  number text not null,
  title text not null,
  description text,
  priority text not null check (priority in ('P1', 'P2', 'P3', 'P4')),
  status text not null,
  requester_id uuid references people (id) on delete set null,
  assignee_id uuid references people (id) on delete set null,
  device_id uuid references devices (id) on delete set null,
  sla_due_at timestamptz,
  accepted_at timestamptz,
  started_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets (id) on delete cascade,
  mission_ref text not null,
  status text not null,
  owner_id uuid references people (id) on delete set null,
  review_submitted_at timestamptz,
  signed_off_at timestamptz,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  unique (mission_ref)
);

create table if not exists mission_team (
  mission_id uuid not null references missions (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  mission_role text not null,
  responsibility text,
  primary key (mission_id, person_id, mission_role)
);

create table if not exists checkpoints (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  position int not null,
  title text not null,
  description text,
  state text not null check (state in (
    'not_started', 'in_progress', 'pending_authorization', 'waiting_on_person',
    'pending_verification', 'blocked', 'completed', 'unsuccessful', 'skipped', 'escalation_required'
  )),
  star_level int check (star_level between 1 and 5),
  assignee_id uuid references people (id) on delete set null,
  assignee_role text,
  verification text,
  requires_evidence boolean not null default false,
  requires_approval boolean not null default false,
  approval_id uuid,
  depends_on int[] not null default '{}',
  actual_result text,
  blocked_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references people (id) on delete set null,
  unique (mission_id, position)
);

create table if not exists checkpoint_evidence (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references checkpoints (id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('note', 'file', 'log', 'screenshot')),
  document_id uuid,
  added_by uuid references people (id) on delete set null,
  added_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- approvals and signatures
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  mission_id uuid references missions (id) on delete set null,
  title text not null,
  summary text,
  type text not null,
  level int not null check (level between 1 and 3),
  status text not null check (status in ('pending', 'approved', 'rejected', 'escalated')),
  required_approver_id uuid references people (id) on delete set null,
  required_approver_label text not null,
  requested_by uuid references people (id) on delete set null,
  decided_by uuid references people (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists approval_history (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references approvals (id) on delete cascade,
  actor_id uuid references people (id) on delete set null,
  action text not null check (action in ('submitted', 'approved', 'rejected', 'escalated', 'commented')),
  note text,
  at timestamptz not null default now()
);

alter table checkpoints
  add constraint checkpoints_approval_fk foreign key (approval_id) references approvals (id) on delete set null;

create table if not exists signatures (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid references approvals (id) on delete cascade,
  signer_id uuid references people (id) on delete set null,
  status text not null check (status in ('awaiting_signature', 'signed', 'declined')),
  signed_at timestamptz,
  audit_hash text,
  note text
);

-- ---------------------------------------------------------------- documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  connector_id uuid,
  name text not null,
  kind text not null,
  folder text,
  size_bytes bigint,
  storage_path text,
  checksum text,
  created_at timestamptz not null default now()
);

create table if not exists document_actions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  mode text not null check (mode in ('linked', 'imported', 'attached')),
  target_type text not null,
  target_id uuid,
  actor_id uuid references people (id) on delete set null,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------- events and audit
create table if not exists sync_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  connector_id uuid,
  type text not null,
  summary text not null,
  detail text,
  dedupe_key text,
  status text not null default 'recorded' check (status in ('recorded', 'retried', 'suppressed', 'failed')),
  attempt int not null default 1,
  at timestamptz not null default now(),
  unique (tenant_id, dedupe_key)
);

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  surface text not null,
  type text not null,
  summary text not null,
  detail text,
  actor_id uuid references people (id) on delete set null,
  target_type text,
  target_id uuid,
  target_label text,
  at timestamptz not null default now()
);

create table if not exists mission_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  type text not null,
  summary text not null,
  detail text,
  actor_id uuid references people (id) on delete set null,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------- recognition
create table if not exists recognition_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  kind text not null check (kind in ('star', 'xp', 'level', 'badge')),
  rule_id text not null,
  label text not null,
  stars int not null default 0,
  xp int not null default 0,
  source_type text not null,
  source_id uuid,
  source_label text,
  evidence text,
  award_key text not null,
  at timestamptz not null default now(),
  unique (person_id, award_key)
);

-- ---------------------------------------------------------------- indexes
create index if not exists idx_checkpoints_mission on checkpoints (mission_id, position);
create index if not exists idx_checkpoints_assignee on checkpoints (assignee_id) where state <> 'completed';
create index if not exists idx_tickets_tenant_status on tickets (tenant_id, status);
create index if not exists idx_approvals_pending on approvals (tenant_id, status) where status in ('pending', 'escalated');
create index if not exists idx_sync_events_recent on sync_events (tenant_id, at desc);
create index if not exists idx_activity_recent on activity_events (tenant_id, at desc);
create index if not exists idx_ledger_person on recognition_ledger (person_id, at desc);

-- ---------------------------------------------------------------- row level security
alter table user_portal_memberships enable row level security;
revoke all on table public.user_portal_memberships from anon, authenticated;
grant select on table public.user_portal_memberships to authenticated;
drop policy if exists portal_membership_read_self on public.user_portal_memberships;
create policy portal_membership_read_self on public.user_portal_memberships
  for select to authenticated using (user_id = auth.uid());

alter table people enable row level security;
alter table tickets enable row level security;
alter table missions enable row level security;
alter table checkpoints enable row level security;
alter table approvals enable row level security;
alter table documents enable row level security;
alter table sync_events enable row level security;
alter table activity_events enable row level security;
alter table recognition_ledger enable row level security;

-- A tenant-scoped helper keeps every policy identical.
create or replace function current_tenant_id() returns uuid
language sql stable as $$
  select tenant_id from people where id = auth.uid()
$$;

create policy tenant_read on people for select using (tenant_id = current_tenant_id());
create policy tenant_read on tickets for select using (tenant_id = current_tenant_id());
create policy tenant_read on missions for select using (
  ticket_id in (select id from tickets where tenant_id = current_tenant_id())
);
create policy tenant_read on checkpoints for select using (
  mission_id in (select id from missions where ticket_id in (select id from tickets where tenant_id = current_tenant_id()))
);
create policy tenant_read on approvals for select using (tenant_id = current_tenant_id());
create policy tenant_read on documents for select using (tenant_id = current_tenant_id());
create policy tenant_read on sync_events for select using (tenant_id = current_tenant_id());
create policy tenant_read on activity_events for select using (tenant_id = current_tenant_id());
create policy tenant_read on recognition_ledger for select using (tenant_id = current_tenant_id());

-- Only the named approver (or a tenant administrator) may decide an approval.
create policy approval_decide on approvals for update using (
  tenant_id = current_tenant_id()
  and status in ('pending', 'escalated')
  and (
    required_approver_id = auth.uid()
    or exists (select 1 from people where id = auth.uid() and role = 'administrator')
  )
);

-- Writes to checkpoints are limited to the mission owner or the task assignee.
create policy checkpoint_write on checkpoints for update using (
  assignee_id = auth.uid()
  or mission_id in (select id from missions where owner_id = auth.uid())
);

-- ---------------------------------------------------------------- seed the tenant contract
insert into tenants (slug, name)
values ('intellistack', 'IntelliStack Systems')
on conflict (slug) do nothing;

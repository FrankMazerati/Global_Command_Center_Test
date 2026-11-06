create table public.sync_connections (
  id text primary key,
  name text not null,
  category text not null,
  status text not null default 'not_connected' check (status in ('not_connected','healthy','degraded','failed')),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sync_events (
  id uuid primary key default gen_random_uuid(),
  connection_id text not null references public.sync_connections(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','dead')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  actor_id uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index on public.sync_events (status, next_attempt_at);
create table public.sync_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.sync_events(id) on delete set null,
  connection_id text,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz not null default now()
);

grant select on public.sync_connections to anon, authenticated;
grant insert, update on public.sync_connections to authenticated;
grant select, insert, update on public.sync_events to authenticated;
grant select, insert on public.sync_audit to authenticated;
grant all on public.sync_connections, public.sync_events, public.sync_audit to service_role;

alter table public.sync_connections enable row level security;
alter table public.sync_events enable row level security;
alter table public.sync_audit enable row level security;

create policy "Connection health is viewable" on public.sync_connections for select to anon, authenticated using (true);
create policy "Signed-in users manage connections" on public.sync_connections for update to authenticated using (true) with check (true);
create policy "Signed-in users add connections" on public.sync_connections for insert to authenticated with check (true);
create policy "Signed-in users read events" on public.sync_events for select to authenticated using (true);
create policy "Signed-in users queue events" on public.sync_events for insert to authenticated with check (actor_id = auth.uid());
create policy "Signed-in users update events" on public.sync_events for update to authenticated using (true) with check (true);
create policy "Signed-in users read audit" on public.sync_audit for select to authenticated using (true);
create policy "Signed-in users write audit" on public.sync_audit for insert to authenticated with check (actor_id = auth.uid());

insert into public.sync_connections (id, name, category) values
 ('active-directory','New Active Directory','Identity'),
 ('central-authorization','Central Authorization','Security'),
 ('intellidesk','IntelliDesk','Service'),
 ('intelliaccess','IntelliAccess','Security'),
 ('intelliconnect','IntelliConnect','Integration'),
 ('intellichat','IntelliChat','Collaboration'),
 ('intellicalendar','IntelliCalendar','Collaboration'),
 ('intellidrive','IntelliDrive','Storage'),
 ('mysync','MySync','Employee'),
 ('company-sync','Company Sync','Administration'),
 ('device-inventory','Device Inventory','Assets'),
 ('licensing','Licensing','Assets');
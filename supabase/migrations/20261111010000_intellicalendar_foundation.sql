-- IntelliCalendar foundation
-- Apply through the approved Supabase migration pipeline before enabling event storage.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  category text not null default 'Meeting'
    check (category in ('Meeting','Focus time','Personal','Deadline','Company','Out of office')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_valid_range check (end_at > start_at)
);

create index if not exists calendar_events_owner_start_idx
  on public.calendar_events (owner_id, start_at);
create index if not exists calendar_events_owner_end_idx
  on public.calendar_events (owner_id, end_at);

create table if not exists public.calendar_event_members (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'read'
    check (permission in ('read','write')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists calendar_event_members_user_idx
  on public.calendar_event_members (user_id, event_id);

alter table public.calendar_events enable row level security;
alter table public.calendar_event_members enable row level security;

create or replace function public.is_calendar_event_member(_event_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1 from public.calendar_event_members m
    where m.event_id = _event_id and m.user_id = _user_id
  );
$;

revoke all on function public.is_calendar_event_member(uuid, uuid) from public;
grant execute on function public.is_calendar_event_member(uuid, uuid) to authenticated;

drop policy if exists "calendar_events_select_owner_or_member" on public.calendar_events;
create policy "calendar_events_select_owner_or_member"
  on public.calendar_events for select to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_calendar_event_member(calendar_events.id, (select auth.uid()))
  );

drop policy if exists "calendar_events_insert_owner" on public.calendar_events;
create policy "calendar_events_insert_owner"
  on public.calendar_events for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "calendar_events_update_owner" on public.calendar_events;
create policy "calendar_events_update_owner"
  on public.calendar_events for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "calendar_events_delete_owner" on public.calendar_events;
create policy "calendar_events_delete_owner"
  on public.calendar_events for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "calendar_members_select_self_or_owner" on public.calendar_event_members;
create policy "calendar_members_select_self_or_owner"
  on public.calendar_event_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.calendar_events e
      where e.id = calendar_event_members.event_id and e.owner_id = (select auth.uid())
    )
  );

drop policy if exists "calendar_members_manage_owner" on public.calendar_event_members;
create policy "calendar_members_manage_owner"
  on public.calendar_event_members for all to authenticated
  using (
    exists (
      select 1 from public.calendar_events e
      where e.id = calendar_event_members.event_id and e.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.calendar_events e
      where e.id = calendar_event_members.event_id and e.owner_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.calendar_event_members to authenticated;

create or replace function public.set_calendar_event_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_calendar_event_updated_at();

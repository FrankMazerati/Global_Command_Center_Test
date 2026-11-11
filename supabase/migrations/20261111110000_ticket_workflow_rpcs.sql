-- Ticket continuity slice: safe caller-scoped creation and state transitions,
-- plus durable audit coverage for non-content ticket changes and comments.
-- No table grants or RLS policies are broadened by this migration.

begin;

create or replace function public.audit_ticket_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_ticket_id uuid;
  v_organization_id uuid;
  v_tenant_id uuid;
  v_actor_id uuid := auth.uid();
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_action text;
  v_request_id text := nullif(current_setting('request.jwt.claim.request_id', true), '');
begin
  if tg_op = 'INSERT' then
    v_ticket_id := new.id;
    v_organization_id := new.organization_id;
    v_tenant_id := new.tenant_id;
    v_action := 'ticket.created';
    v_after := jsonb_build_object(
      'ticket_number', new.ticket_number,
      'status', new.status::text,
      'priority', new.priority::text,
      'category', new.category,
      'requester_profile_id', new.requester_profile_id,
      'assigned_profile_id', new.assigned_profile_id,
      'department_id', new.department_id,
      'source', new.source,
      'sla_policy_id', new.sla_policy_id,
      'response_due_at', new.response_due_at,
      'resolution_due_at', new.resolution_due_at
    );
  elsif tg_op = 'UPDATE' then
    v_ticket_id := new.id;
    v_organization_id := new.organization_id;
    v_tenant_id := new.tenant_id;
    v_action := 'ticket.updated';
    v_before := jsonb_build_object(
      'status', old.status::text,
      'priority', old.priority::text,
      'category', old.category,
      'requester_profile_id', old.requester_profile_id,
      'assigned_profile_id', old.assigned_profile_id,
      'department_id', old.department_id,
      'waiting_on', old.waiting_on,
      'current_step', old.current_step,
      'total_steps', old.total_steps,
      'source', old.source,
      'sla_policy_id', old.sla_policy_id,
      'response_due_at', old.response_due_at,
      'resolution_due_at', old.resolution_due_at,
      'first_response_at', old.first_response_at,
      'requester_wait_started_at', old.requester_wait_started_at,
      'requester_wait_seconds', old.requester_wait_seconds,
      'response_breached_at', old.response_breached_at,
      'resolution_breached_at', old.resolution_breached_at,
      'resolved_at', old.resolved_at,
      'closed_at', old.closed_at
    );
    v_after := jsonb_build_object(
      'status', new.status::text,
      'priority', new.priority::text,
      'category', new.category,
      'requester_profile_id', new.requester_profile_id,
      'assigned_profile_id', new.assigned_profile_id,
      'department_id', new.department_id,
      'waiting_on', new.waiting_on,
      'current_step', new.current_step,
      'total_steps', new.total_steps,
      'source', new.source,
      'sla_policy_id', new.sla_policy_id,
      'response_due_at', new.response_due_at,
      'resolution_due_at', new.resolution_due_at,
      'first_response_at', new.first_response_at,
      'requester_wait_started_at', new.requester_wait_started_at,
      'requester_wait_seconds', new.requester_wait_seconds,
      'response_breached_at', new.response_breached_at,
      'resolution_breached_at', new.resolution_breached_at,
      'resolved_at', new.resolved_at,
      'closed_at', new.closed_at
    );
    select coalesce(jsonb_agg(changed.field order by changed.field), '[]'::jsonb)
      into v_changed_fields
    from (values
      ('title', old.title is distinct from new.title),
      ('description', old.description is distinct from new.description),
      ('category', old.category is distinct from new.category),
      ('priority', old.priority is distinct from new.priority),
      ('status', old.status is distinct from new.status),
      ('requester_profile_id', old.requester_profile_id is distinct from new.requester_profile_id),
      ('assigned_profile_id', old.assigned_profile_id is distinct from new.assigned_profile_id),
      ('department_id', old.department_id is distinct from new.department_id),
      ('waiting_on', old.waiting_on is distinct from new.waiting_on),
      ('current_step', old.current_step is distinct from new.current_step),
      ('total_steps', old.total_steps is distinct from new.total_steps),
      ('source', old.source is distinct from new.source),
      ('resolution_summary', old.resolution_summary is distinct from new.resolution_summary),
      ('sla_policy_id', old.sla_policy_id is distinct from new.sla_policy_id),
      ('response_due_at', old.response_due_at is distinct from new.response_due_at),
      ('resolution_due_at', old.resolution_due_at is distinct from new.resolution_due_at),
      ('first_response_at', old.first_response_at is distinct from new.first_response_at),
      ('requester_wait_started_at', old.requester_wait_started_at is distinct from new.requester_wait_started_at),
      ('requester_wait_seconds', old.requester_wait_seconds is distinct from new.requester_wait_seconds),
      ('response_breached_at', old.response_breached_at is distinct from new.response_breached_at),
      ('resolution_breached_at', old.resolution_breached_at is distinct from new.resolution_breached_at),
      ('resolved_at', old.resolved_at is distinct from new.resolved_at),
      ('closed_at', old.closed_at is distinct from new.closed_at)
    ) as changed(field, did_change)
    where changed.did_change;
    if v_changed_fields = '[]'::jsonb then
      return new;
    end if;
  else
    v_ticket_id := old.id;
    v_organization_id := old.organization_id;
    v_tenant_id := old.tenant_id;
    v_action := 'ticket.deleted';
    v_before := jsonb_build_object(
      'ticket_number', old.ticket_number,
      'status', old.status::text,
      'priority', old.priority::text,
      'category', old.category,
      'requester_profile_id', old.requester_profile_id,
      'assigned_profile_id', old.assigned_profile_id,
      'department_id', old.department_id
    );
  end if;

  insert into public.audit_events (
    organization_id, tenant_id, actor_profile_id, actor_auth_user_id,
    action, resource_type, resource_id, outcome, request_id, event_data
  ) values (
    v_organization_id, v_tenant_id, v_actor_id, v_actor_id,
    v_action, 'ticket', v_ticket_id::text, 'success', v_request_id,
    jsonb_build_object(
      'ticket_number', case when tg_op = 'DELETE' then old.ticket_number else new.ticket_number end,
      'operation', tg_op,
      'changed_fields', case when tg_op = 'UPDATE' then v_changed_fields else '[]'::jsonb end,
      'before', v_before,
      'after', v_after,
      'content_values_recorded', false
    )
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function public.audit_ticket_mutation() from public, anon, authenticated;
grant execute on function public.audit_ticket_mutation() to service_role;

create or replace function public.audit_ticket_conversation_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_row public.ticket_conversation_messages%rowtype;
  v_actor_id uuid := auth.uid();
  v_request_id text := nullif(current_setting('request.jwt.claim.request_id', true), '');
  v_operation text := tg_op;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  insert into public.audit_events (
    organization_id, tenant_id, actor_profile_id, actor_auth_user_id,
    action, resource_type, resource_id, outcome, request_id, event_data
  ) values (
    v_row.organization_id,
    v_row.tenant_id,
    coalesce(v_actor_id, v_row.author_profile_id),
    v_actor_id,
    'ticket.updated',
    'ticket',
    v_row.ticket_id::text,
    'success',
    v_request_id,
    jsonb_build_object(
      'operation', v_operation,
      'changed_fields', jsonb_build_array('conversation_message'),
      'message_id', v_row.id,
      'visibility', v_row.visibility,
      'message_content_recorded', false
    )
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

drop trigger if exists ticket_conversation_messages_audit_mutation on public.ticket_conversation_messages;
create trigger ticket_conversation_messages_audit_mutation
after insert or update or delete on public.ticket_conversation_messages
for each row execute function public.audit_ticket_conversation_mutation();

revoke all on function public.audit_ticket_conversation_mutation() from public, anon, authenticated;
grant execute on function public.audit_ticket_conversation_mutation() to service_role;

create or replace function public.create_portal_ticket(
  p_title text,
  p_description text,
  p_category text,
  p_priority text default 'medium'
)
returns public.tickets
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_profile record;
  v_ticket public.tickets;
  v_priority text := lower(coalesce(nullif(trim(p_priority), ''), 'medium'));
begin
  if auth.uid() is null then
    raise exception 'Sign in before creating a ticket.' using errcode = '42501';
  end if;
  if p_title is null or char_length(trim(p_title)) < 5 or char_length(trim(p_title)) > 240 then
    raise exception 'Ticket title must contain 5 to 240 characters.' using errcode = '22023';
  end if;
  if p_description is null or char_length(trim(p_description)) < 10 or char_length(trim(p_description)) > 10000 then
    raise exception 'Ticket details must contain 10 to 10,000 characters.' using errcode = '22023';
  end if;
  if p_category is null or char_length(trim(p_category)) < 2 or char_length(trim(p_category)) > 100 then
    raise exception 'Choose a ticket category.' using errcode = '22023';
  end if;
  if v_priority not in ('critical', 'high', 'medium', 'low') then
    raise exception 'Choose a supported ticket priority.' using errcode = '22023';
  end if;

  select id, organization_id, tenant_id
    into v_profile
  from public.profiles
  where id = auth.uid();
  if not found or v_profile.organization_id is null then
    raise exception 'An active organization profile is required to create a ticket.' using errcode = '42501';
  end if;

  insert into public.tickets (
    organization_id, tenant_id, requester_profile_id, title, description,
    category, priority, status, source, opened_at, created_at, updated_at,
    waiting_on, requester_wait_seconds
  ) values (
    v_profile.organization_id, v_profile.tenant_id, v_profile.id,
    trim(p_title), trim(p_description), trim(p_category),
    v_priority::public.ticket_priority, 'new'::public.ticket_status,
    'portal', now(), now(), now(), 'none', 0
  ) returning * into v_ticket;

  return v_ticket;
end;
$function$;

revoke all on function public.create_portal_ticket(text, text, text, text) from public, anon;
grant execute on function public.create_portal_ticket(text, text, text, text) to authenticated;

create or replace function public.update_ticket_details(
  p_ticket_id uuid,
  p_title text,
  p_description text,
  p_category text
)
returns public.tickets
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_ticket public.tickets;
begin
  if auth.uid() is null then
    raise exception 'Sign in before editing a ticket.' using errcode = '42501';
  end if;
  if p_title is null or char_length(trim(p_title)) < 5 or char_length(trim(p_title)) > 240 then
    raise exception 'Ticket title must contain 5 to 240 characters.' using errcode = '22023';
  end if;
  if p_description is null or char_length(trim(p_description)) < 10 or char_length(trim(p_description)) > 10000 then
    raise exception 'Ticket details must contain 10 to 10,000 characters.' using errcode = '22023';
  end if;
  if p_category is null or char_length(trim(p_category)) < 2 or char_length(trim(p_category)) > 100 then
    raise exception 'Ticket category must contain 2 to 100 characters.' using errcode = '22023';
  end if;

  select * into v_ticket
  from public.tickets
  where id = p_ticket_id
  for update;
  if not found then
    raise exception 'Ticket not found or not visible to this account.' using errcode = 'P0002';
  end if;
  if v_ticket.status::text in ('resolved', 'closed', 'cancelled') then
    raise exception 'Reopen this ticket before editing its details.' using errcode = '22023';
  end if;

  update public.tickets
    set title = trim(p_title),
        description = trim(p_description),
        category = trim(p_category),
        updated_at = now()
  where id = p_ticket_id
  returning * into v_ticket;

  return v_ticket;
end;
$function$;

revoke all on function public.update_ticket_details(uuid, text, text, text) from public, anon;
grant execute on function public.update_ticket_details(uuid, text, text, text) to authenticated;

create or replace function public.apply_ticket_transition(
  p_ticket_id uuid,
  p_action text,
  p_reason text default null,
  p_assignee_profile_id uuid default null,
  p_priority text default null
)
returns public.tickets
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_ticket public.tickets;
  v_assignee record;
  v_reason text := nullif(trim(p_reason), '');
  v_priority text := lower(nullif(trim(p_priority), ''));
  v_actor_id uuid := auth.uid();
  v_status text;
  v_waiting_on text;
  v_requester_wait_seconds integer;
  v_wait_started_at timestamptz;
begin
  if v_actor_id is null then
    raise exception 'Sign in before changing a ticket.' using errcode = '42501';
  end if;
  if p_action not in ('accept', 'start', 'wait_requester', 'wait_internal', 'resume', 'escalate', 'resolve', 'close', 'reopen', 'cancel', 'assign', 'set_priority') then
    raise exception 'Unsupported ticket action.' using errcode = '22023';
  end if;
  if p_action in ('wait_requester', 'wait_internal', 'escalate', 'resolve', 'reopen', 'cancel')
     and char_length(coalesce(v_reason, '')) < 20 then
    raise exception 'Provide a reason of at least 20 characters for this action.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_reason, '')) > 2000 then
    raise exception 'The reason must be 2,000 characters or fewer.' using errcode = '22023';
  end if;

  select * into v_ticket
  from public.tickets
  where id = p_ticket_id
  for update;
  if not found then
    raise exception 'Ticket not found or not visible to this account.' using errcode = 'P0002';
  end if;
  v_status := v_ticket.status::text;
  v_waiting_on := coalesce(v_ticket.waiting_on::text, 'none');
  v_requester_wait_seconds := coalesce(v_ticket.requester_wait_seconds, 0);
  v_wait_started_at := v_ticket.requester_wait_started_at;

  if p_action = 'set_priority' then
    if v_priority not in ('critical', 'high', 'medium', 'low') then
      raise exception 'Choose a supported ticket priority.' using errcode = '22023';
    end if;
    update public.tickets
      set priority = v_priority::public.ticket_priority,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'assign' then
    if p_assignee_profile_id is null then
      raise exception 'Choose a user in the same organization and tenant.' using errcode = '22023';
    end if;
    if v_status in ('resolved', 'closed', 'cancelled') then
      raise exception 'A closed ticket cannot be reassigned; reopen it first.' using errcode = '22023';
    end if;
    select id, organization_id, tenant_id into v_assignee
    from public.profiles
    where id = p_assignee_profile_id;
    if not found
       or v_assignee.organization_id is distinct from v_ticket.organization_id
       or v_assignee.tenant_id is distinct from v_ticket.tenant_id then
      raise exception 'The selected assignee is outside this ticket tenant or not visible to you.' using errcode = '42501';
    end if;
    update public.tickets
      set assigned_profile_id = p_assignee_profile_id,
          status = case when v_status = 'new' then 'accepted'::public.ticket_status else status end,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'accept' then
    if v_status <> 'new' or (v_ticket.assigned_profile_id is not null and v_ticket.assigned_profile_id <> v_actor_id) then
      raise exception 'Only a new, unassigned ticket (or one assigned to you) can be accepted.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'accepted'::public.ticket_status,
          assigned_profile_id = coalesce(assigned_profile_id, v_actor_id),
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'start' then
    if v_status not in ('new', 'accepted', 'waiting', 'escalated') then
      raise exception 'This ticket cannot enter in-progress from its current status.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'in_progress'::public.ticket_status,
          assigned_profile_id = coalesce(assigned_profile_id, v_actor_id),
          waiting_on = 'none',
          requester_wait_seconds = v_requester_wait_seconds + case
            when v_waiting_on = 'requester' and v_wait_started_at is not null
              then greatest(0, floor(extract(epoch from (now() - v_wait_started_at)))::integer)
            else 0
          end,
          requester_wait_started_at = null,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'wait_requester' then
    if v_status not in ('accepted', 'in_progress', 'escalated') then
      raise exception 'Only an active ticket can be set to requester wait.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'waiting'::public.ticket_status,
          waiting_on = 'requester',
          requester_wait_started_at = now(),
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'wait_internal' then
    if v_status not in ('accepted', 'in_progress', 'escalated') then
      raise exception 'Only an active ticket can be set to internal-team wait.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'waiting'::public.ticket_status,
          waiting_on = 'internal_team',
          requester_wait_started_at = null,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'resume' then
    if v_status <> 'waiting' then
      raise exception 'Only a waiting ticket can be resumed.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'in_progress'::public.ticket_status,
          waiting_on = 'none',
          requester_wait_seconds = v_requester_wait_seconds + case
            when v_waiting_on = 'requester' and v_wait_started_at is not null
              then greatest(0, floor(extract(epoch from (now() - v_wait_started_at)))::integer)
            else 0
          end,
          requester_wait_started_at = null,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'escalate' then
    if v_status not in ('accepted', 'in_progress', 'waiting') then
      raise exception 'This ticket cannot be escalated from its current status.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'escalated'::public.ticket_status,
          waiting_on = 'none',
          requester_wait_started_at = null,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'resolve' then
    if v_status not in ('accepted', 'in_progress', 'waiting', 'escalated') then
      raise exception 'This ticket cannot be resolved from its current status.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'resolved'::public.ticket_status,
          resolution_summary = v_reason,
          resolved_at = now(),
          waiting_on = 'none',
          requester_wait_seconds = v_requester_wait_seconds + case
            when v_waiting_on = 'requester' and v_wait_started_at is not null
              then greatest(0, floor(extract(epoch from (now() - v_wait_started_at)))::integer)
            else 0
          end,
          requester_wait_started_at = null,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'close' then
    if v_status <> 'resolved' then
      raise exception 'Resolve the ticket before closing it.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'closed'::public.ticket_status,
          closed_at = now(),
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'reopen' then
    if v_status not in ('resolved', 'closed') then
      raise exception 'Only resolved or closed tickets can be reopened.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'in_progress'::public.ticket_status,
          resolved_at = null,
          closed_at = null,
          waiting_on = 'none',
          requester_wait_started_at = null,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

  elsif p_action = 'cancel' then
    if v_status in ('resolved', 'closed', 'cancelled') then
      raise exception 'A resolved, closed, or cancelled ticket cannot be cancelled.' using errcode = '22023';
    end if;
    update public.tickets
      set status = 'cancelled'::public.ticket_status,
          resolution_summary = v_reason,
          closed_at = now(),
          waiting_on = 'none',
          requester_wait_seconds = v_requester_wait_seconds + case
            when v_waiting_on = 'requester' and v_wait_started_at is not null
              then greatest(0, floor(extract(epoch from (now() - v_wait_started_at)))::integer)
            else 0
          end,
          requester_wait_started_at = null,
          updated_at = now()
    where id = p_ticket_id
    returning * into v_ticket;
  end if;

  return v_ticket;
end;
$function$;

revoke all on function public.apply_ticket_transition(uuid, text, text, uuid, text) from public, anon;
grant execute on function public.apply_ticket_transition(uuid, text, text, uuid, text) to authenticated;

comment on function public.create_portal_ticket(text, text, text, text) is
  'Creates a portal ticket using the caller profile organization and tenant; SECURITY INVOKER preserves table grants and RLS.';
comment on function public.update_ticket_details(uuid, text, text, text) is
  'Edits visible, non-terminal ticket details as the caller; SECURITY INVOKER preserves table RLS and audit triggers.';
comment on function public.apply_ticket_transition(uuid, text, text, uuid, text) is
  'Applies a validated ticket state transition as the caller; SECURITY INVOKER preserves table grants and RLS.';
comment on function public.audit_ticket_conversation_mutation() is
  'Trigger-only audit for ticket conversation metadata; message body content is never copied into audit_events.';

notify pgrst, 'reload schema';
commit;

create policy ticket_sla_clock_events_insert_authorized
on public.ticket_sla_clock_events
for insert
to authenticated
with check (
  actor_profile_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    join public.tickets t on t.id = ticket_sla_clock_events.ticket_id
    where p.id = (select auth.uid())
      and p.member_status = 'active'
      and p.organization_id = ticket_sla_clock_events.organization_id
      and p.organization_id = t.organization_id
      and ticket_sla_clock_events.tenant_id is not distinct from p.tenant_id
      and t.tenant_id is not distinct from p.tenant_id
      and (
        t.requester_profile_id = p.id
        or t.assigned_profile_id = p.id
        or exists (
          select 1
          from public.profile_roles pr
          join public.roles r on r.id = pr.role_id
          where pr.profile_id = p.id
            and pr.is_active
            and (pr.starts_at is null or pr.starts_at <= now())
            and (pr.expires_at is null or pr.expires_at > now())
            and r.role_key = any (array[
              'help_desk_l1','help_desk_l2','help_desk_l3',
              'service_desk_analyst','service_desk_manager',
              'help_desk_supervisor','technician','it_manager',
              'organization_admin','global_admin','super_admin'
            ]::text[])
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.apply_ticket_transition(p_ticket_id uuid, p_action text, p_reason text DEFAULT NULL::text, p_assignee_profile_id uuid DEFAULT NULL::uuid, p_priority ticket_priority DEFAULT NULL::ticket_priority)
 RETURNS tickets
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_old public.tickets%rowtype;
  v_new public.tickets%rowtype;
  v_is_manager boolean;
  v_is_support boolean;
  v_event_key text;
  v_next_status public.ticket_status;
  v_level smallint;
  v_wait_seconds bigint := 0;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.id = v_actor and p.member_status = 'active';

  if not found or v_profile.organization_id is null then
    raise exception 'An active organization profile is required' using errcode = '42501';
  end if;

  select
    coalesce(bool_or(r.role_key in ('service_desk_manager','help_desk_supervisor','global_admin','super_admin')), false),
    coalesce(bool_or(r.role_key in ('help_desk_l1','help_desk_l2','help_desk_l3','service_desk_manager','help_desk_supervisor','global_admin','super_admin')), false)
  into v_is_manager, v_is_support
  from public.profile_roles pr
  join public.roles r on r.id = pr.role_id
  where pr.profile_id = v_actor
    and pr.is_active
    and (pr.starts_at is null or pr.starts_at <= now())
    and (pr.expires_at is null or pr.expires_at > now());

  if p_action = 'accept' then
    return public.accept_ticket(p_ticket_id);
  end if;

  select t.* into v_old
  from public.tickets t
  where t.id = p_ticket_id
    and t.organization_id = v_profile.organization_id
    and t.tenant_id is not distinct from v_profile.tenant_id
  for update;

  if not found then
    raise exception 'Ticket not found or not accessible in your organization and tenant' using errcode = 'P0002';
  end if;

  if p_action not in ('start','wait_requester','wait_internal','resume','escalate','resolve','close','reopen','cancel','assign','set_priority') then
    raise exception 'Unsupported ticket action' using errcode = '22023';
  end if;

  if p_action in ('wait_requester','wait_internal','escalate','resolve','reopen','cancel','assign')
     and length(coalesce(v_reason,'')) < 20 then
    raise exception 'Provide a reason of at least 20 characters for this action' using errcode = '22023';
  end if;

  if p_action in ('assign','set_priority','close','cancel') and not v_is_manager then
    raise exception 'Manager permission is required for this ticket action' using errcode = '42501';
  end if;

  if p_action in ('start','wait_requester','wait_internal','resume','escalate','resolve','reopen')
     and not v_is_support then
    raise exception 'Help desk role permission is required for this ticket action' using errcode = '42501';
  end if;

  if p_action not in ('assign','set_priority','cancel')
     and v_old.assigned_profile_id is distinct from v_actor
     and not v_is_manager then
    raise exception 'Only the assigned technician or an authorized manager can perform this action' using errcode = '42501';
  end if;

  if p_action = 'assign' then
    if p_assignee_profile_id is null then
      raise exception 'Choose an assignee before assigning the ticket' using errcode = '22023';
    end if;
    if not exists (
      select 1
      from public.profiles target
      join public.profile_roles pr on pr.profile_id = target.id
      join public.roles r on r.id = pr.role_id
      where target.id = p_assignee_profile_id
        and target.member_status = 'active'
        and target.organization_id = v_old.organization_id
        and target.tenant_id is not distinct from v_old.tenant_id
        and pr.is_active
        and (pr.starts_at is null or pr.starts_at <= now())
        and (pr.expires_at is null or pr.expires_at > now())
        and r.role_key in ('help_desk_l1','help_desk_l2','help_desk_l3','service_desk_manager','help_desk_supervisor')
    ) then
      raise exception 'Assignee must be an active help desk worker in the same organization and tenant' using errcode = '22023';
    end if;
    update public.tickets t
    set assigned_profile_id = p_assignee_profile_id,
        status = case when t.status in ('new','offered') then 'accepted'::public.ticket_status else t.status end,
        updated_at = now()
    where t.id = p_ticket_id
    returning t.* into v_new;
    v_event_key := 'assigned';

  elsif p_action = 'set_priority' then
    if p_priority is null then
      raise exception 'Choose a priority' using errcode = '22023';
    end if;
    update public.tickets t set priority = p_priority, updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    v_event_key := 'triaged';

  elsif p_action = 'start' then
    if v_old.status not in ('new','offered','accepted','escalated') then
      raise exception 'Ticket cannot be started from its current status' using errcode = '22023';
    end if;
    update public.tickets t
    set assigned_profile_id = coalesce(t.assigned_profile_id, v_actor),
        status = 'in_progress',
        waiting_on = 'none',
        requester_wait_started_at = null,
        updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    v_event_key := 'in_progress';

  elsif p_action in ('wait_requester','wait_internal') then
    if v_old.status not in ('new','offered','accepted','in_progress','escalated') then
      raise exception 'Ticket cannot enter waiting from its current status' using errcode = '22023';
    end if;
    update public.tickets t
    set status = 'waiting',
        waiting_on = case when p_action = 'wait_requester' then 'requester' else 'internal' end,
        requester_wait_started_at = case when p_action = 'wait_requester' then now() else null end,
        updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    v_event_key := 'waiting';

  elsif p_action = 'resume' then
    if v_old.status <> 'waiting' then
      raise exception 'Only waiting tickets can be resumed' using errcode = '22023';
    end if;
    if v_old.waiting_on = 'requester' and v_old.requester_wait_started_at is not null then
      v_wait_seconds := greatest(0, floor(extract(epoch from (now() - v_old.requester_wait_started_at)))::bigint);
    end if;
    update public.tickets t
    set status = 'in_progress',
        waiting_on = 'none',
        requester_wait_seconds = requester_wait_seconds + v_wait_seconds,
        requester_wait_started_at = null,
        updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    v_event_key := 'in_progress';

  elsif p_action = 'escalate' then
    if v_old.status in ('resolved','closed','cancelled') then
      raise exception 'A completed or cancelled ticket cannot be escalated' using errcode = '22023';
    end if;
    select (coalesce(max(e.level),0) + 1)::smallint into v_level
    from public.ticket_escalations e where e.ticket_id = p_ticket_id;
    if v_level > 4 then
      raise exception 'Maximum escalation level reached; manager review is required' using errcode = '22023';
    end if;
    update public.tickets t set status = 'escalated', updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    insert into public.ticket_escalations (
      organization_id, tenant_id, ticket_id, level, escalation_reason, escalated_by, assigned_to
    ) values (
      v_new.organization_id, v_new.tenant_id, v_new.id, v_level, v_reason, v_actor, null
    );
    v_event_key := 'escalated';

  elsif p_action = 'resolve' then
    if v_old.status in ('resolved','closed','cancelled') then
      raise exception 'Ticket is already complete or cancelled' using errcode = '22023';
    end if;
    update public.tickets t
    set status = 'resolved',
        resolution_summary = v_reason,
        resolved_at = now(),
        closed_at = null,
        updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    v_event_key := 'resolved';

  elsif p_action = 'close' then
    if v_old.status <> 'resolved' then
      raise exception 'Only resolved tickets can be closed' using errcode = '22023';
    end if;
    update public.tickets t set status = 'closed', closed_at = now(), updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    v_event_key := 'closed';

  elsif p_action = 'reopen' then
    if v_old.status not in ('resolved','closed') then
      raise exception 'Only resolved or closed tickets can be reopened' using errcode = '22023';
    end if;
    update public.tickets t
    set status = case when t.assigned_profile_id is null then 'new'::public.ticket_status else 'in_progress'::public.ticket_status end,
        resolved_at = null,
        closed_at = null,
        resolution_summary = null,
        updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    v_event_key := 'reopened';

  elsif p_action = 'cancel' then
    if v_old.status in ('resolved','closed','cancelled') then
      raise exception 'Completed ticket cannot be cancelled' using errcode = '22023';
    end if;
    update public.tickets t set status = 'cancelled', updated_at = now()
    where t.id = p_ticket_id returning t.* into v_new;
    v_event_key := 'cancelled';
  end if;

  if p_action = 'wait_requester' then
    insert into public.ticket_sla_clock_events (
      organization_id, tenant_id, ticket_id, actor_profile_id, event_type, metadata
    ) values (
      v_new.organization_id, v_new.tenant_id, v_new.id, v_actor,
      'requester_wait_started',
      pg_catalog.jsonb_build_object('from_status', v_old.status::text, 'to_status', v_new.status::text)
    );
  elsif p_action = 'resume' and v_old.waiting_on = 'requester' then
    insert into public.ticket_sla_clock_events (
      organization_id, tenant_id, ticket_id, actor_profile_id, event_type, metadata
    ) values (
      v_new.organization_id, v_new.tenant_id, v_new.id, v_actor,
      'requester_wait_ended',
      pg_catalog.jsonb_build_object('wait_seconds', v_wait_seconds, 'from_status', v_old.status::text, 'to_status', v_new.status::text)
    );
  elsif p_action = 'resolve' then
    insert into public.ticket_sla_clock_events (
      organization_id, tenant_id, ticket_id, actor_profile_id, event_type, metadata
    ) values (
      v_new.organization_id, v_new.tenant_id, v_new.id, v_actor,
      'ticket_resolved',
      pg_catalog.jsonb_build_object('from_status', v_old.status::text, 'to_status', v_new.status::text)
    );
  elsif p_action = 'reopen' then
    insert into public.ticket_sla_clock_events (
      organization_id, tenant_id, ticket_id, actor_profile_id, event_type, metadata
    ) values (
      v_new.organization_id, v_new.tenant_id, v_new.id, v_actor,
      'ticket_reopened',
      pg_catalog.jsonb_build_object('from_status', v_old.status::text, 'to_status', v_new.status::text, 'prior_resolution_preserved', v_old.resolution_summary is not null)
    );
  end if;

  insert into public.ticket_lifecycle_events (
    organization_id, tenant_id, ticket_id, actor_profile_id,
    event_key, from_status, to_status, reason, metadata
  ) values (
    v_new.organization_id, v_new.tenant_id, v_new.id, v_actor,
    v_event_key, v_old.status::text, v_new.status::text, v_reason,
    jsonb_build_object(
      'action', p_action,
      'old_assignee', v_old.assigned_profile_id,
      'new_assignee', v_new.assigned_profile_id,
      'old_priority', v_old.priority::text,
      'new_priority', v_new.priority::text,
      'previous_resolution_summary', case when p_action = 'reopen' then v_old.resolution_summary else null end
    )
  );

  return v_new;
end;
$function$

create or replace function public.request_ticket_approval(
  p_ticket_id uuid,
  p_permission_key text,
  p_reason text
)
returns public.ticket_approval_requests
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_ticket public.tickets%rowtype;
  v_approval public.ticket_approval_requests%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_permission text := nullif(btrim(coalesce(p_permission_key, '')), '');
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if v_reason is null or length(v_reason) < 4 or length(v_reason) > 2000 then
    raise exception 'Provide an approval reason between 4 and 2,000 characters' using errcode = '22023';
  end if;
  if v_permission is null or length(v_permission) > 160 then
    raise exception 'A valid permission or action key is required' using errcode = '22023';
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.id = v_actor and p.member_status = 'active';
  if not found or v_profile.organization_id is null then
    raise exception 'An active organization profile is required' using errcode = '42501';
  end if;

  select t.* into v_ticket
  from public.tickets t
  where t.id = p_ticket_id
    and t.organization_id = v_profile.organization_id
    and t.tenant_id is not distinct from v_profile.tenant_id
  for update;
  if not found then
    raise exception 'Ticket not found or not accessible in your organization and tenant' using errcode = 'P0002';
  end if;

  insert into public.ticket_approval_requests (
    organization_id, tenant_id, ticket_id, requested_by,
    approver_profile_id, permission_key, reason, status
  ) values (
    v_ticket.organization_id, v_ticket.tenant_id, v_ticket.id, v_actor,
    null, v_permission, v_reason, 'pending'
  )
  returning * into v_approval;

  insert into public.ticket_lifecycle_events (
    organization_id, tenant_id, ticket_id, actor_profile_id,
    event_key, from_status, to_status, reason, metadata
  ) values (
    v_ticket.organization_id, v_ticket.tenant_id, v_ticket.id, v_actor,
    'approval_requested', v_ticket.status::text, v_ticket.status::text, v_reason,
    jsonb_build_object('approval_request_id', v_approval.id, 'permission_key', v_permission)
  );

  return v_approval;
end;
$function$;

create or replace function public.decide_ticket_approval(
  p_approval_id uuid,
  p_decision text,
  p_reason text
)
returns public.ticket_approval_requests
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_approval public.ticket_approval_requests%rowtype;
  v_ticket public.tickets%rowtype;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if v_decision not in ('approved', 'denied') then
    raise exception 'Decision must be approved or denied' using errcode = '22023';
  end if;
  if v_reason is null or length(v_reason) < 4 or length(v_reason) > 2000 then
    raise exception 'Provide a decision note between 4 and 2,000 characters' using errcode = '22023';
  end if;

  update public.ticket_approval_requests a
  set status = v_decision,
      approver_profile_id = v_actor,
      decided_at = now(),
      decision_reason = v_reason
  where a.id = p_approval_id and a.status = 'pending'
  returning a.* into v_approval;

  if not found then
    raise exception 'Approval request is unavailable, already decided, or you are not authorized to decide it' using errcode = '42501';
  end if;

  select t.* into v_ticket
  from public.tickets t
  where t.id = v_approval.ticket_id
    and t.organization_id = v_approval.organization_id
    and t.tenant_id is not distinct from v_approval.tenant_id;

  if not found then
    raise exception 'The approval ticket is no longer accessible' using errcode = 'P0002';
  end if;

  insert into public.ticket_lifecycle_events (
    organization_id, tenant_id, ticket_id, actor_profile_id,
    event_key, from_status, to_status, reason, metadata
  ) values (
    v_ticket.organization_id, v_ticket.tenant_id, v_ticket.id, v_actor,
    case when v_decision = 'approved' then 'approval_granted' else 'approval_denied' end,
    v_ticket.status::text, v_ticket.status::text, v_reason,
    jsonb_build_object('approval_request_id', v_approval.id, 'permission_key', v_approval.permission_key)
  );

  return v_approval;
end;
$function$;

revoke all on function public.request_ticket_approval(uuid, text, text) from public, anon;
revoke all on function public.decide_ticket_approval(uuid, text, text) from public, anon;
grant execute on function public.request_ticket_approval(uuid, text, text) to authenticated;
grant execute on function public.decide_ticket_approval(uuid, text, text) to authenticated;

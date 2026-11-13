create or replace function public.accept_ticket(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_tenant_id uuid;
  v_previous_status public.ticket_status;
  v_ticket public.tickets%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select p.organization_id, p.tenant_id
    into v_org_id, v_tenant_id
  from public.profiles p
  where p.id = v_user_id
    and p.member_status = 'active';

  if not found or v_org_id is null then
    raise exception 'An active organization profile is required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = v_user_id
      and pr.is_active
      and pr.starts_at <= pg_catalog.now()
      and (pr.expires_at is null or pr.expires_at > pg_catalog.now())
      and r.role_key = any (array[
        'help_desk_l1','help_desk_l2','help_desk_l3',
        'service_desk_analyst','service_desk_manager',
        'help_desk_supervisor','it_manager','organization_admin',
        'global_admin','super_admin'
      ]::text[])
  ) then
    raise exception 'Your role is not authorized to accept help desk tickets' using errcode = '42501';
  end if;

  select t.status into v_previous_status
  from public.tickets t
  where t.id = p_ticket_id
    and t.organization_id = v_org_id
    and (t.tenant_id is null or t.tenant_id = v_tenant_id)
    and t.requester_profile_id is distinct from v_user_id
    and t.assigned_profile_id is null
    and t.status in ('new','offered')
  for update;

  if not found then
    raise exception 'Ticket is unavailable, outside your organization, or already claimed' using errcode = '40001';
  end if;

  update public.tickets t
  set assigned_profile_id = v_user_id,
      status = 'accepted',
      updated_at = pg_catalog.now()
  where t.id = p_ticket_id
    and t.organization_id = v_org_id
    and (t.tenant_id is null or t.tenant_id = v_tenant_id)
    and t.assigned_profile_id is null
    and t.status = v_previous_status
  returning t.* into v_ticket;

  if not found then
    raise exception 'Ticket was claimed by another worker; refresh the queue' using errcode = '40001';
  end if;

  insert into public.ticket_lifecycle_events (
    organization_id, tenant_id, ticket_id, actor_profile_id,
    event_key, from_status, to_status, reason, metadata
  ) values (
    v_ticket.organization_id, v_ticket.tenant_id, v_ticket.id, v_user_id,
    'assigned', v_previous_status::text, 'accepted',
    'Accepted by an authorized help desk worker',
    pg_catalog.jsonb_build_object('assignment_method','atomic_accept_ticket')
  );

  return v_ticket;
end;
$function$;

revoke all on function public.accept_ticket(uuid) from public, anon;
grant execute on function public.accept_ticket(uuid) to authenticated;

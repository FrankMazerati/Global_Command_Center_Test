-- Ticket lifecycle audit ledger: record durable audit_events for every ticket mutation.
-- Additive: preserves existing lifecycle/SLA triggers and does not expose ticket content.
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
      'assigned_profile_id', new.assigned_profile_id,
      'source', new.source
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
      'assigned_profile_id', old.assigned_profile_id,
      'waiting_on', old.waiting_on,
      'current_step', old.current_step,
      'resolution_due_at', old.resolution_due_at,
      'response_due_at', old.response_due_at
    );
    v_after := jsonb_build_object(
      'status', new.status::text,
      'priority', new.priority::text,
      'category', new.category,
      'assigned_profile_id', new.assigned_profile_id,
      'waiting_on', new.waiting_on,
      'current_step', new.current_step,
      'resolution_due_at', new.resolution_due_at,
      'response_due_at', new.response_due_at
    );
    select coalesce(jsonb_agg(coalesce(a.key, b.key) order by coalesce(a.key, b.key)), '[]'::jsonb)
      into v_changed_fields
    from jsonb_each(v_after) a
    full join jsonb_each(v_before) b using (key)
    where a.value is distinct from b.value;
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
      'assigned_profile_id', old.assigned_profile_id
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
      'after', v_after
    )
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

drop trigger if exists tickets_audit_mutation on public.tickets;
create trigger tickets_audit_mutation
after insert or update or delete on public.tickets
for each row execute function public.audit_ticket_mutation();

revoke all on function public.audit_ticket_mutation() from public, anon, authenticated;
grant execute on function public.audit_ticket_mutation() to service_role;

comment on function public.audit_ticket_mutation() is
  'Writes a minimal, append-only audit_events record for each ticket insert/update/delete; excludes ticket descriptions and message content.';

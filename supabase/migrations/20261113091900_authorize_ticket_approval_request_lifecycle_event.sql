alter policy ticket_lifecycle_insert_authorized
on public.ticket_lifecycle_events
with check (
  actor_profile_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    join public.tickets t on t.id = ticket_lifecycle_events.ticket_id
    where p.id = (select auth.uid())
      and p.member_status = 'active'
      and p.organization_id = ticket_lifecycle_events.organization_id
      and p.organization_id = t.organization_id
      and (
        ticket_lifecycle_events.tenant_id is null
        or p.tenant_id = ticket_lifecycle_events.tenant_id
      )
      and (t.tenant_id is null or p.tenant_id = t.tenant_id)
      and (
        (
          ticket_lifecycle_events.event_key = any (array['created','commented']::text[])
          and (
            t.requester_profile_id = p.id
            or t.assigned_profile_id = p.id
            or exists (
              select 1 from public.profile_roles pr
              join public.roles r on r.id = pr.role_id
              where pr.profile_id = p.id and pr.is_active
                and (pr.starts_at is null or pr.starts_at <= now())
                and (pr.expires_at is null or pr.expires_at > now())
                and r.role_key = any (array[
                  'super_admin','global_admin','organization_admin',
                  'service_desk_manager','it_manager','technician'
                ]::text[])
            )
          )
        )
        or (
          ticket_lifecycle_events.event_key = any (
            array['triaged','assigned','in_progress','waiting','resolved','reopened','closed','escalated']::text[]
          )
          and (
            t.assigned_profile_id = p.id
            or exists (
              select 1 from public.profile_roles pr
              join public.roles r on r.id = pr.role_id
              where pr.profile_id = p.id and pr.is_active
                and (pr.starts_at is null or pr.starts_at <= now())
                and (pr.expires_at is null or pr.expires_at > now())
                and r.role_key = any (array[
                  'super_admin','global_admin','organization_admin',
                  'service_desk_manager','it_manager','technician'
                ]::text[])
            )
          )
        )
        or (
          ticket_lifecycle_events.event_key = any (
            array['approval_granted','approval_denied','cancelled']::text[]
          )
          and exists (
            select 1 from public.profile_roles pr
            join public.roles r on r.id = pr.role_id
            where pr.profile_id = p.id and pr.is_active
              and (pr.starts_at is null or pr.starts_at <= now())
              and (pr.expires_at is null or pr.expires_at > now())
              and r.role_key = any (array[
                'super_admin','global_admin','organization_admin',
                'service_desk_manager','it_manager'
              ]::text[])
          )
        )
        or (
          ticket_lifecycle_events.event_key = 'approval_requested'
          and exists (
            select 1
            from public.ticket_approval_requests ar
            where ar.id::text = ticket_lifecycle_events.metadata ->> 'approval_request_id'
              and ar.ticket_id = t.id
              and ar.requested_by = p.id
              and ar.organization_id = p.organization_id
              and ar.tenant_id is not distinct from t.tenant_id
          )
        )
      )
  )
);

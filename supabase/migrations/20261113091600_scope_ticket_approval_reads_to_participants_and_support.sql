alter policy ticket_approval_read_scope
on public.ticket_approval_requests
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.member_status = 'active'
      and p.organization_id = ticket_approval_requests.organization_id
      and (
        ticket_approval_requests.tenant_id is null
        or p.tenant_id = ticket_approval_requests.tenant_id
      )
      and (
        ticket_approval_requests.requested_by = p.id
        or exists (
          select 1
          from public.tickets t
          where t.id = ticket_approval_requests.ticket_id
            and t.organization_id = p.organization_id
            and t.tenant_id is not distinct from p.tenant_id
            and (
              t.requester_profile_id = p.id
              or t.assigned_profile_id = p.id
            )
        )
        or exists (
          select 1
          from public.profile_roles pr
          join public.roles r on r.id = pr.role_id
          where pr.profile_id = p.id
            and pr.is_active
            and pr.starts_at <= now()
            and (pr.expires_at is null or pr.expires_at > now())
            and r.role_key = any (
              array[
                'help_desk_l1',
                'help_desk_l2',
                'help_desk_l3',
                'service_desk_analyst',
                'service_desk_manager',
                'help_desk_supervisor',
                'technician',
                'it_manager',
                'organization_admin',
                'global_admin',
                'super_admin'
              ]::text[]
            )
        )
      )
  )
);

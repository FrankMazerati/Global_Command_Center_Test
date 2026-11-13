alter policy ticket_approval_decision_manager
on public.ticket_approval_requests
using (
  status = 'pending'
  and exists (
    select 1
    from public.profiles p
    join public.profile_roles pr on pr.profile_id = p.id
    join public.roles r on r.id = pr.role_id
    where p.id = (select auth.uid())
      and p.member_status = 'active'
      and p.organization_id = ticket_approval_requests.organization_id
      and (
        ticket_approval_requests.tenant_id is null
        or p.tenant_id = ticket_approval_requests.tenant_id
      )
      and pr.is_active
      and (pr.starts_at is null or pr.starts_at <= now())
      and (pr.expires_at is null or pr.expires_at > now())
      and r.role_key = any (
        array[
          'super_admin',
          'global_admin',
          'organization_admin',
          'service_desk_manager',
          'it_manager'
        ]::text[]
      )
  )
)
with check (
  status = any (array['approved', 'denied']::text[])
  and requested_by <> (select auth.uid())
  and approver_profile_id = (select auth.uid())
  and decided_at is not null
  and decision_reason is not null
  and length(trim(decision_reason)) >= 4
  and exists (
    select 1
    from public.profiles p
    join public.profile_roles pr on pr.profile_id = p.id
    join public.roles r on r.id = pr.role_id
    where p.id = (select auth.uid())
      and p.member_status = 'active'
      and p.organization_id = ticket_approval_requests.organization_id
      and (
        ticket_approval_requests.tenant_id is null
        or p.tenant_id = ticket_approval_requests.tenant_id
      )
      and pr.is_active
      and (pr.starts_at is null or pr.starts_at <= now())
      and (pr.expires_at is null or pr.expires_at > now())
      and r.role_key = any (
        array[
          'super_admin',
          'global_admin',
          'organization_admin',
          'service_desk_manager',
          'it_manager'
        ]::text[]
      )
  )
);

create policy ticket_lifecycle_insert_cancelled_authorized
on public.ticket_lifecycle_events
for insert
to authenticated
with check (
  event_key = 'cancelled'
  and actor_profile_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    join public.tickets t on t.id = ticket_lifecycle_events.ticket_id
    where p.id = (select auth.uid())
      and p.member_status = 'active'
      and p.organization_id = ticket_lifecycle_events.organization_id
      and p.organization_id = t.organization_id
      and p.tenant_id is not distinct from t.tenant_id
      and ticket_lifecycle_events.tenant_id is not distinct from t.tenant_id
      and exists (
        select 1
        from public.profile_roles pr
        join public.roles r on r.id = pr.role_id
        where pr.profile_id = p.id
          and pr.is_active
          and (pr.starts_at is null or pr.starts_at <= now())
          and (pr.expires_at is null or pr.expires_at > now())
          and r.role_key in ('service_desk_manager','it_manager','organization_admin','global_admin','super_admin')
      )
  )
);

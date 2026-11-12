-- Batch 008: cover foreign keys introduced by the management-scope foundation.
begin;
create index if not exists workforce_profile_identity_links_organization_idx
  on public.workforce_profile_identity_links (organization_id);
create index if not exists workforce_profile_identity_links_verified_by_idx
  on public.workforce_profile_identity_links (verified_by_profile_id)
  where verified_by_profile_id is not null;
create index if not exists workforce_profile_identity_links_revoked_by_idx
  on public.workforce_profile_identity_links (revoked_by_profile_id)
  where revoked_by_profile_id is not null;
create index if not exists governance_region_locations_region_idx
  on public.governance_region_locations (region_id);
create index if not exists governance_region_locations_created_by_idx
  on public.governance_region_locations (created_by_profile_id)
  where created_by_profile_id is not null;
create index if not exists workforce_management_assignment_locations_assignment_idx
  on public.workforce_management_assignment_locations (management_assignment_id);
create index if not exists workforce_management_assignment_locations_created_by_idx
  on public.workforce_management_assignment_locations (created_by_profile_id)
  where created_by_profile_id is not null;
commit;
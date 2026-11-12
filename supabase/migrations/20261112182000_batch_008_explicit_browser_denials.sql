-- Explicit deny policies make the closed-by-default boundary visible to the
-- database advisor while the server-side scope resolver is built in Batch 009.
begin;

drop policy if exists workforce_profile_identity_links_deny_browser
  on public.workforce_profile_identity_links;
create policy workforce_profile_identity_links_deny_browser
  on public.workforce_profile_identity_links
  for all to anon, authenticated
  using (false) with check (false);

drop policy if exists governance_region_locations_deny_browser
  on public.governance_region_locations;
create policy governance_region_locations_deny_browser
  on public.governance_region_locations
  for all to anon, authenticated
  using (false) with check (false);

drop policy if exists workforce_management_assignment_locations_deny_browser
  on public.workforce_management_assignment_locations;
create policy workforce_management_assignment_locations_deny_browser
  on public.workforce_management_assignment_locations
  for all to anon, authenticated
  using (false) with check (false);

commit;
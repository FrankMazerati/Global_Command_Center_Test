# Batch 009 — Frontend Authorization Inventory

**Status:** Initial source and policy inventory complete; implementation not yet started  
**Repository:** `FrankMazerati/Global_Command_Center_Test`  
**Branch:** `feature/enterprise-workspace-chat-buddy-build`  
**PR:** #7 (draft; do not merge without explicit approval)

## 1. Purpose and scope

This inventory maps the current TanStack Router frontend, Supabase access layer, representative workspace data services, and live database RLS policies to the Batch 009 frontend authorization matrix. It is a source inspection and read-only database inspection. No customer/workforce rows were created or modified, no database schema was changed, and no Vercel preview was run.

The key distinction is that a signed-in session is not equivalent to an approved management assignment, a role/action permission, an authorized location or regional scope, or an active subscription entitlement. The frontend must present the effective access decision, but the database/API must remain the enforcement point.

## 2. Frontend route architecture

The repository uses TanStack Router with a small number of file routes and parameterized workspace routes:

- `src/routes/__root.tsx` — root shell, session-presence check, public/login route handling, AppShell mounting.
- `src/routes/index.tsx` — Command Center home, work summaries, Chat Buddy and dashboard data orchestration.
- `src/routes/login.tsx` — Supabase password sign-in and OAuth entry points.
- `src/routes/m.$section.tsx` — dynamic workspace section resolution using the navigation catalog.
- `src/routes/m.$section.$group.$page.tsx` — shared dynamic page foundation and workspace dispatch.
- `src/routes/p.$slug.tsx` — public published-page loader using a separate anonymous Supabase client.
- `src/lib/nav.ts` — single navigation catalog and slug resolution.
- `src/lib/supabase.ts` — singleton browser Supabase client using a publishable/anon key.
- `src/lib/command-work.ts` and `src/lib/work-context.tsx` — Chat Buddy sessions/messages, command work items, local notes, and shared work context.
- `src/lib/tickets.ts` — ticket profile loading and ticket list query helpers.

The generated route tree confirms the dynamic route shape `/m/$section/$group/$page`. The section and page loaders validate whether a catalog destination exists; they do not resolve the caller's role, management assignment, location/region scope, entitlement, or resource sensitivity.

## 3. Current session gate — useful but insufficient for management authorization

The root component calls `supabase.auth.getSession()` for non-public routes and redirects to `/login` when no session exists. It then mounts the requested workspace. This is a session-presence gate, not a management authorization resolver.

The current route tree does not expose a route-level effective-access contract. The navigation catalog is a content/routing registry; its entries are not authorization grants. Hiding or showing a navigation item cannot be treated as a security boundary.

Required next change: replace the implicit boolean `authorized` presentation state with a typed, server-derived effective-access state. Preserve the login/public routes and avoid making the client responsible for deciding the user's scope.

## 4. Data-access hotspots

### 4.1 Shared directory component

In `src/routes/m.$section.$group.$page.tsx`, `SupabaseDirectory` loads profiles or a selected directory table directly through the browser Supabase client. The profiles query selects identity, employment, manager, organization, tenant, location, contact and avatar fields, then applies a 500-row client query limit. Other directory kinds use `select("*")`.

The page's search/filter operates on rows already returned to the browser. The database RLS policies are therefore the actual row boundary; the client-side search is not authorization. Before using this shared component for broader management dashboards, replace broad generic reads with purpose-specific, server-authorized projections and explicit field-level sensitivity controls. Keep privileged fields out of the response entirely when not authorized.

The component also contains direct create/update operations for selected directory kinds. These must be reviewed individually against the approved write workflow; frontend button visibility is not sufficient.

### 4.2 Ticket data service

`src/lib/tickets.ts` loads the authenticated profile and queries tickets through the browser client. It applies page-specific requester/assignee/department/status filters, but those filters are user-interface query shaping, not the source of authorization. The live `tickets` RLS policies remain the row boundary.

The current ticket RLS policy inspected in this inventory uses organization and tenant matching plus requester/assignee or a set of existing service-desk role keys. It does not yet express the new approved management-assignment location-set or regional scope contract. A regional manager must not receive regional ticket access merely because the UI selected a region; the backend policy/resolver must explicitly establish each assigned location.

The separate ticket helper/RPC name mismatch previously recorded remains a distinct workflow compatibility issue and must be addressed before claiming all ticket mutations work.

### 4.3 Command Work and Chat Buddy

`src/lib/command-work.ts` obtains the current authenticated user with `auth.getUser()`, loads the active profile, and uses existing `is_global_admin` / `is_org_admin` RPCs to shape command-work list queries. It also creates user-authored Chat Buddy messages and command-work items.

This is a useful existing pattern for identity derivation and server-side RPC checks, but the client-side organization/tenant filters are not the enforcement boundary. Batch 009 must validate the RLS/RPC definitions and move management scope decisions to the shared backend resolver. Chat Buddy/Maximus/Optimus must receive only records authorized for the requesting user and must not be able to widen scope.

## 5. Live RLS inventory — read-only inspection

The following existing public tables were confirmed to have RLS enabled: `profiles`, `tickets`, `devices`, `tenants`, `groups`, `group_memberships`, `marketplace_entitlements`, and `workforce_management_assignments`. The identity-link table is also RLS-enabled and has an explicit browser-deny policy. The queried management membership tables were not returned under the guessed names in this initial inventory; exact relation names need confirmation from migration definitions before any implementation.

Observed policy patterns:

- `profiles`: self-read plus global-admin/organization-admin-scope read. The current broad browser query therefore depends on RLS to return only rows allowed by those policies.
- `tickets`: requester/assignee or existing service-desk role-based read within organization/tenant scope, plus global-admin policy.
- `devices`: assigned-user or existing technical/admin role-based read within organization/tenant scope, plus global-admin policy.
- `groups`: organization/tenant membership read plus global-admin policy.
- `group_memberships`: self or organization-admin-scope read plus global-admin policy.
- `tenants`: tenant membership/organization-admin read plus global-admin policy.
- `marketplace_entitlements`: organization/tenant scoped read.
- `workforce_management_assignments`: organization-admin read policy only in the inspected policy list; no end-user management-scope read contract was observed.
- New Batch 008 identity links: explicit deny policy for browser roles, consistent with the decision to expose controlled lifecycle operations rather than direct table access.

This confirms there are existing database authorization controls, but they are not yet a unified management-scope resolver. Existing organization/tenant and role-key rules must not be mistaken for location/regional/global management scope.

RLS was enabled but not forced on the inspected tables. This inventory did not attempt to test table-owner, service-role, or function-owner behavior. It is not a complete security audit and does not clear the previously reported project-wide advisor findings.

## 6. Primary gaps against the Batch 009 matrix

1. No shared frontend effective-access provider/contract is currently wired into the route tree.
2. No verified management assignment + explicit location/region membership resolver is wired into dashboard context.
3. No entitlement-aware Location / Regional / Global context switcher is present as a security-backed feature.
4. Navigation and dynamic route resolution validate catalog existence, not permission/action/scope.
5. Generic directory queries and client-side filtering need purpose-built authorized projections and field-level data minimization.
6. Existing ticket/device/group policies use legacy organization/tenant and role-key patterns; management location-set and regional scopes need to be added without widening current access.
7. Search, exports, realtime, notifications, cache and AI retrieval require the same backend scope contract; each path must be separately inventoried before release.
8. Empty, restricted, pending-approval, not-entitled, expired/revoked, and source-unavailable states need a shared typed result model rather than generic error text.

## 7. Implementation sequence

### Phase A — finish source/policy map
- Confirm exact Batch 008 migration relation names and constraints for region/location and assignment/location membership.
- Inventory all workspace components that directly query Supabase, all RPC calls, all writes, and all realtime subscriptions.
- Review every RLS policy and relevant function for the data sources used by the three operations dashboards.
- Identify sensitive columns and current exposure for HR, finance, legal, customer, security and workforce data.
- Resolve the existing ticket RPC compatibility mismatch as a separate tracked task.

### Phase B — backend effective-access contract
- Implement one fail-closed resolver deriving the caller from `auth.uid()`.
- Require active profile, verified workforce identity link, active workforce person, approved/active/authorization-enabled assignment, effective dates, canonical role/action permission, explicit scope membership, tenant ancestry, active entitlement and resource sensitivity.
- Do not accept caller-supplied profile IDs or arbitrary organization/location/region scopes.
- Return a minimal effective-access snapshot with decision/audit correlation and explicit denial reasons.
- Test missing identity, synthetic workforce, pending/revoked/expired assignment, missing membership, cross-tenant, missing entitlement and permission denial.

### Phase C — connect frontend safely
- Add a typed provider/context consuming the backend snapshot.
- Add a context switcher that can only select among server-returned authorized scopes.
- Add reusable access boundaries and permission-aware actions for presentation, while retaining backend authorization on every data read/write.
- Replace broad generic data reads with purpose-built services and safe field projections.
- Ensure URL edits, direct API calls, search, exports, realtime, notifications, cache and AI cannot widen scope.

### Phase D — operations dashboards and tests
- Implement Location Operations first, then assigned-location Regional Operations, then Global Operations Center.
- Verify the explicit eight-of-fifty regional test.
- Add positive and negative tests from the Batch 009 matrix, including direct URL/API, cross-tenant, expiry/revocation, entitlements and AI context.
- Run targeted lint, tests, production build, responsive QA and Supabase advisors.
- Keep PR #7 draft/unmerged until release criteria are satisfied.

## 8. CI finding and correction

The previous Production Readiness workflow failed only in the targeted ESLint command. The job log exposed exactly three `prettier/prettier` formatting errors at `src/lib/nav.ts` lines 634–636, for the Global, Regional and Location Operations Dashboard navigation tuples. No semantic lint errors were reported in that run.

Those three tuples were reformatted and committed to the existing feature branch in commit:

`beea0c7f17d1a284d08e7c543f9878b7d6686ec7`

The corrected file was fetched back from the branch and the changed formatting was verified. New CI runs were queued after that commit:
- Production Readiness: run `43281641533`
- Responsive Layout QA: run `43281641646`

At the time of this inventory, those runs were queued; their success is not yet claimed.

## 9. Safety and delivery constraints

- Continue on `feature/enterprise-workspace-chat-buddy-build` and PR #7 only.
- Do not create another branch or PR.
- Do not merge PR #7 without explicit user approval.
- Do not use Vercel previews unless requested.
- Do not seed synthetic employees, customer records, locations, assignments, subscriptions, entitlements or activity into production.
- Do not alter existing customer records or bypass approved lifecycle RPCs.
- Do not claim the overall Supabase security advisor is clean; existing project-wide findings remain.

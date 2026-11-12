# Batch 008 — Organizational Intelligence & Management Scope Foundation

**Product:** Maximus Optimus Command Center  
**Company:** IntelliStack Systems, Incorporated  
**Status:** Architecture and schema-audit foundation — implementation staged, not production-enabled  
**Security principle:** Make the security process smarter.

## 1. Batch objective

Build the authoritative organizational and management-scope foundation that will power the Global Operations Dashboard, Regional Operations Dashboard, Location Operations Dashboard, executive templates, department templates, and later dashboard data services.

Batch 008 is successful only when the system can answer these questions server-side:

1. Which customer tenant owns this data?
2. Which company, business unit, region, location, department, or team does this resource belong to?
3. Which active role and management assignment does this person hold?
4. Which exact organizational resources are included in that assignment?
5. Which subscription entitlements cover those resources and capabilities?
6. Is this person allowed to read this specific data or perform this specific action now?

A dashboard filter, template switch, URL, client-side role label, or Chat Buddy instruction is never an authorization boundary.

## 2. Live-schema audit — existing foundation to preserve

The connected Supabase project was inspected read-only on 2026-11-12. The following structures already exist and must be extended rather than duplicated:

- `tenants`: customer isolation boundary; includes `organization_id`, status and tenant identifiers.
- `organizations`: parent-child organization records; includes `parent_organization_id`, `organization_type`, status, region and organization identifiers.
- `profiles`: includes `tenant_id`, `organization_id`, `department_id`, `organizational_unit_id`, `manager_profile_id`, job title and member status.
- `profile_roles`: time-aware role assignments with `organization_id`, `tenant_id`, `starts_at`, `expires_at`, `is_active`, grantor and grant reason.
- `roles` and `role_permissions`: existing role catalog and permission mappings. The catalog already contains CEO, CFO, COO, CIO, CTO, CISO, CHRO, executive assistant, auditor, compliance, IT, Help Desk L1/L2/L3, NOC, SOC and other roles.
- `organizational_units`: existing directory/OU-like hierarchy, with `organization_id`, `parent_unit_id` and `distinguished_path`.
- `workforce_organizational_units`: tenant-aware workforce OU structure with `tenant_id`, `organization_id` and `parent_unit_id`.
- `governance_regions`, `governance_management_role_catalog`, `workforce_management_assignments`, and `workforce_role_assignments`: existing region, management-template, management-assignment, and workforce-role structures (detailed in Section 14).

### Important findings and constraints

- The current organization records inspected included six `company` records and one `business_unit` record; no `region` or `location` organization records were present in that live query. This is a schema/data observation, not permission to seed synthetic locations.
- The existing `organizations` table has a parent-child relationship, but the allowed organization-type constraint and its tenant consistency rules must be inspected before inserting new region/location types.
- `organizational_units` is not a substitute for the company/region/location business hierarchy.
- `workforce_organizational_units` is tenant-aware, but it is not a manager-to-location assignment model. The separate `workforce_management_assignments` model exists, but it currently lacks explicit location membership and a verified link to authenticated profiles.
- `profile_roles` supports organization/tenant role context and time windows, but it does not by itself represent a manager responsible for an arbitrary set of locations.
- Existing organization read policies primarily expose a user's own organization and global administrators. They do not establish the required explicit regional/location membership model.
- Existing profiles include `manager_profile_id`, but the field alone is not a complete, validated management hierarchy or delegated authority model.
- Existing role keys must be reused. Do not create duplicate CEO/CFO/COO/CIO role catalog entries to represent dashboard templates.

No live records were changed during this audit.

## 3. Canonical hierarchy

The target business hierarchy is:

`Tenant → Company → (optional) Region → Location → Department → Team → Employee`

The hierarchy is intentionally flexible:

- A one-location customer can have Company → Location without a Region.
- A multi-location customer can have Company → Region → Location.
- A company may have multiple subsidiaries or business units.
- A regional scope can contain all locations in a region or an explicitly selected, non-contiguous set of locations.
- Departments and teams may be represented using the existing workforce/organizational-unit structures where appropriate; do not create duplicate department/team trees.
- A tenant boundary is always separate from the organization tree. Two tenants must never share access because their company or location names match.

The existing `organizations.parent_organization_id` tree is the first candidate for company/business-unit/region/location relationships. Before using it for new types, verify its check constraints, uniqueness rules, tenant ownership path, and all dependent triggers/functions. Do not create a second company-location hierarchy.

## 4. Management scope assignments

A management assignment is a time-bounded authorization context that connects a person, an existing role, a dashboard level, and an explicit organizational scope.

Required logical fields:

| Field | Purpose |
|---|---|
| Assignment ID | Stable identifier |
| Tenant ID | Customer isolation boundary |
| Owning organization ID | Company/organization administering the assignment |
| Profile ID | Person receiving the assignment |
| Role ID / role key | Existing role catalog entry |
| Dashboard level | `global`, `regional`, or `location` |
| Scope mode | `tenant_enterprise`, `organization_subtree`, `single_location`, `explicit_locations`, or `department_subtree` |
| Scope root organization ID | Optional root for a governed subtree |
| Template key | Dashboard template compatible with role and level |
| Starts at / expires at | Time boundary |
| Status | Pending, active, suspended, expired, revoked |
| Granted by / reason | Accountability and audit context |
| Created / updated timestamps | Lifecycle tracking |

For `explicit_locations`, use a normalized membership relation from assignment ID to location organization ID. Do not store a list of location IDs in client-editable JSON or trust a client-supplied array without validating every member.

### West Side example

A company has 50 Chicago locations. A regional manager has one active assignment with eight explicit location memberships. All regional dashboard queries must resolve only those eight locations, subject to the tenant, subscription, role, and action checks. The other 42 locations must not appear in identifiable records, search, exports, autocomplete, notifications, AI summaries, cached results, or drill-downs.

If the assignment changes from eight to six locations, access to the two removed locations must cease server-side immediately after the change commits. The assignment history remains auditable.

### Global and location scope

- A Global Operations assignment covers only the tenant/company entities included in the customer's enterprise agreement and the person's authorized enterprise role.
- A Regional Operations assignment may cover a named region or an explicit set of locations. A city label alone never implies access to every location in that city.
- A Location Operations assignment is restricted to one activated location and its permitted departments/teams.
- A person's job title or dashboard template never creates a scope assignment.

## 5. Dashboard template registry

Templates are presentation/workflow definitions, not permission grants.

The template registry should reuse the existing `roles.role_key` values and support:

- `template_key`
- `dashboard_level`
- `role_key`
- Display name and description
- Version and publication status
- Default widget/layout configuration
- Approved data domains and widget identifiers
- Required product capability/entitlement key
- Supported actions (permission keys only; actual authorization is checked separately)
- Created/updated metadata

A template key is unique per role and dashboard level. Examples:

- `global.ceo`, `regional.ceo`, `location.ceo`
- `global.cfo`, `regional.cfo`, `location.cfo`
- `global.coo`, `regional.coo`, `location.coo`
- `global.cio`, `regional.cio`, `location.cio`
- `global.ciso`, `regional.ciso`, `location.ciso`

Not every customer must appoint every executive role. Department/specialist templates use the same pattern where meaningful, for example `location.help_desk_l1`, `regional.noc_manager`, or `global.governance_manager`.

A profile may have multiple active role/scope assignments and may switch only among templates supported by those assignments. Switching changes layout and task context; it does not change role grants, scope, entitlements, or separation-of-duties controls.

## 6. Authorization decision order

Every dashboard query, drill-down, export, search, AI retrieval, notification preview, and mutation must enforce these checks on the server:

1. Authenticated, active profile and valid session.
2. Correct tenant boundary.
3. Active role assignment and time window.
4. Active management-scope assignment and time window.
5. Requested resource belongs to the assigned scope.
6. Required subscription entitlement covers the feature and relevant location/company.
7. Action-specific permission is granted.
8. Data sensitivity, legal/HR/finance/security restrictions and separation-of-duties rules permit the operation.

All checks must be repeated for each requested resource and action. An authorized aggregate must not reveal restricted underlying rows. Small-group metrics may require suppression or stronger permission to prevent inference.

The UI may hide or disable unavailable controls for clarity, but the API/database remains authoritative.

## 7. Database implementation shape

The next schema increment must extend existing canonical structures and add only missing relationships:

1. **Region-to-location membership** — normalized tenant-bound mapping from existing governance regions to covered location organizations.
2. **Assignment-to-location membership** — normalized explicit location membership linked to existing `workforce_management_assignments` for non-contiguous scopes.
3. **Verified profile identity bridge** — a safe mapping between authenticated profiles and workforce people, because current global-person matching returned zero linked records.
4. **Dashboard layout registry (only if required)** — versioned layout metadata referencing existing `governance_management_role_catalog.role_key`; do not duplicate role identity.
5. **Audit lifecycle events** — grant, approve, activate, change scope, suspend, expire, revoke, and template publication events, linked to the existing governance/audit model where its contract supports the event.

Do not add a parallel management assignment table, a new role catalog, duplicate organization hierarchy, duplicate profile-to-department mapping, or duplicate subscription catalog.

### RLS and write-path requirements

- Enable RLS on every new exposed table.
- Read policies must be explicit: users may read their own active assignments; authorized administrators may read assignments within their organization/tenant administration scope. Do not use `TO authenticated` alone as authorization.
- Direct client writes to scope assignments and location membership should be denied initially. Mutations must go through narrowly scoped server-side operations that validate the grantor, tenant, target profile, role, scope, subscription coverage, and audit event atomically.
- Any `SECURITY DEFINER` routine must live in a non-exposed schema, set a fixed safe search path, validate `auth.uid()`, and have explicit execute grants. Prefer invoker rights when possible.
- Update policies require both `USING` and `WITH CHECK`.
- Do not rely on user-editable JWT metadata for authorization.
- Scope assignment changes must invalidate or version dashboard caches and derived access decisions.
- Expiry/revocation must be checked at request time, not only by a background job.
- Avoid broadening the existing organization-read policy as a shortcut. Add precise authorized membership logic.

### Subscription integration

- Essential: Location Operations for each activated, covered location.
- Professional: Regional Operations for contracted/covered locations and explicitly assigned regional scopes.
- Enterprise: Global Operations for the negotiated tenant/company coverage.
- Higher tiers may include lower-level dashboard capabilities, but do not grant a person additional role or location scope.
- A location that is registered but not activated/covered is not operationally licensed.
- The subscription entitlement and the person's authorization are independent required checks.

## 8. Required server-side service contracts

The implementation should expose narrow operations (names are illustrative until aligned with the repository's existing RPC naming conventions):

- Resolve the current user's dashboard contexts.
- List active templates available to the current user.
- Resolve exact location membership for a management assignment.
- Check access to a requested organization/location/resource and action.
- Create or modify a management assignment through an authorized approval path.
- Revoke/suspend an assignment and invalidate derived access.
- Publish/version a dashboard template.
- Produce a dashboard data response already filtered to the caller's authorized scope.

Do not expose a generic client-callable function that accepts arbitrary `profile_id`, `tenant_id`, or scope IDs and returns data without independently validating the caller.

## 9. Acceptance and security test plan

No synthetic employees, fake locations, demo assignments, or fake operational metrics are to be inserted into customer data.

| Test | Expected result |
|---|---|
| West Side manager assigned eight of 50 locations | Only eight locations and their permitted aggregate data are returned |
| Same manager requests one of the other 42 locations by UUID/URL | Denied server-side |
| Manager searches for an unassigned location | No identifying result or autocomplete leak |
| Regional manager changes browser filter to all Chicago | Scope remains the eight assigned locations |
| Location CEO requests another location's finance data | Denied |
| Location CFO requests permitted local finance summary | Allowed only with the required finance permission and active location entitlement |
| Regional CFO requests all-company finance data | Denied outside assigned region |
| Global CEO without Enterprise coverage | No Global Operations entitlement or enterprise data |
| Enterprise CEO without a required data permission | Denied for that data domain despite global dashboard access |
| User switches to CFO template without CFO role assignment | Template unavailable; no access change |
| User has CEO and CFO assignments | May switch only within each assignment's authorized scope |
| Assignment expires or is revoked | Subsequent requests denied, including cached/drill-down paths |
| Cross-tenant organization/location ID is supplied | Denied regardless of matching names |
| Aggregate contains sensitive small group | Suppressed or restricted according to policy |
| Chat Buddy asks for data outside caller scope | Retrieval returns no restricted data; assistant cannot override authorization |

## 10. Delivery gates

Batch 008 should be delivered in the following sequence:

**Gate A — Schema and dependency verification**
- Inspect organization type constraints, tenant ownership mapping, triggers, indexes, RLS policies, role catalog keys, marketplace entitlement function signatures, and governance audit contract.
- Identify existing safe helper functions and their grants.
- Document any legacy structures that must not be repurposed.

**Gate B — Additive schema migration**
- Create the assignment, assignment-location membership, template registry and lifecycle event structures.
- Add indexes and constraints for tenant integrity, assignment dates, unique memberships and lookup paths.
- Keep direct client writes closed until secure mutation RPCs are ready.
- Keep migration unapplied to production until an isolated Supabase development branch or equivalent safe validation environment is available.

**Gate C — Server-side authorization functions**
- Implement exact-scope resolution and action checks.
- Integrate role permissions and marketplace entitlements.
- Add atomic assignment lifecycle operations and audit writes.

**Gate D — Verification**
- Run SQL/static migration checks and RLS policy inspection.
- Test positive and negative access paths with multiple tenants, roles and location sets.
- Verify expiry/revocation and cache invalidation.
- Run Supabase security advisors and resolve new warnings attributable to this batch.

**Gate E — Dashboard integration**
- Connect dashboard template routing only after the scope resolver is verified.
- Keep unconnected widgets visibly unavailable/not configured; never display fabricated live metrics.

## 11. Current completion status

| Item | Status |
|---|---|
| Existing organization, workforce, profile and role structures audited | Complete — read-only inspection |
| Existing role catalog reuse decision | Complete |
| Canonical company/region/location hierarchy rules | Defined |
| Explicit management scope model | Defined |
| Template registry contract | Defined |
| Tenant/subscription/role/action authorization order | Defined |
| RLS and secure write-path requirements | Defined |
| Negative and positive acceptance tests | Defined |
| New schema migration | Not yet created |
| Server-side assignment resolver/RPCs | Not implemented |
| Live dashboard data integration | Not implemented |
| Production schema changes | None |

**Safety note:** The connected Supabase project currently has no isolated development branch available. No production DDL or data changes were made for Batch 008. The migration and RPC implementation must be validated in an isolated environment before production application.


## 12. Additional dependency findings from the schema audit

A second read-only pass checked constraints, triggers and entitlement helper functions:

- `organizations.parent_organization_id` is a self-referencing FK with `ON DELETE SET NULL`; the inspected table has no declared CHECK constraint restricting `organization_type`. This does not mean arbitrary values are semantically safe: the existing application, triggers, policies and RPCs still need review before introducing `region` or `location` values.
- `tenants.organization_id` references the tenant's root organization with `ON DELETE CASCADE`. The `organizations` table itself does not carry a `tenant_id` column. Therefore, organization-to-tenant membership must be resolved and validated through the tenant root/parent-child tree (or a deliberately designed mapping) rather than assuming a tenant column exists on every organization.
- The organization readable-ID trigger is present and must be preserved when adding organization types.
- The existing profile global-identity trigger responds to changes in profile name/contact/job/department/organization/tenant fields; new management assignment logic should not duplicate or interfere with it.
- `profile_roles` enforces `expires_at > starts_at` when an expiry is supplied and has FKs to profiles, roles, organizations and tenants.
- The read-only function-name audit did not find a function named `has_marketplace_entitlement` or a function matching the searched marketplace-entitlement name pattern. The subscription/location entitlement API must therefore be discovered by its actual catalog, RPC, or helper definitions before wiring it into the new scope resolver. Do not assume that helper exists.

### Design consequence

The first migration must not simply add `tenant_id` to every organization or widen organization RLS. It must establish a verified tenant-root ancestry check (or a normalized organization-to-tenant membership relation if existing federation requirements demand it), and validate every assigned location against that boundary. Parent changes, tenant-root changes, and assignment changes must be checked for cross-tenant integrity.

## 13. Updated completion status

| Item | Status |
|---|---|
| Existing table/column audit | Complete — read-only |
| Existing RLS policy audit for core hierarchy and identity tables | Complete — read-only |
| Existing FK/check constraint audit | Complete — read-only |
| Existing trigger audit | Complete — read-only |
| Existing role catalog reuse decision | Complete |
| Marketplace entitlement helper discovery | Exact helper not found; API discovery still required |
| Tenant-root ancestry strategy | Identified as required; implementation not yet written |
| Additive schema migration | Not yet created |
| Server-side assignment resolver/RPCs | Not implemented |
| Production schema changes | None |


## 14. Critical second-pass discovery — existing management model

A deeper catalog inspection found that the first-pass statement that no management-assignment capability exists was too broad. The database already contains a management model, and Batch 008 must extend it rather than introduce a parallel assignment system.

### Existing canonical management structures

- `governance_regions` already models a region hierarchy (`global`, `continent`, `subregion`, `country`, `operational_area`) with parent regions and lifecycle status.
- `governance_management_role_catalog` already contains 25 management-role templates, allowed scopes, role family, approval requirement and active state. This is the canonical governance management-role catalog; do not create a duplicate role-template registry without proving a missing requirement.
- `workforce_management_assignments` already stores a workforce person, management role key, organization, scope type (`global`, `region`, `tenant`, `department`), optional region/tenant/department target, status, authorization-enabled flag, dates, approval metadata and reason.
- `workforce_role_assignments` already maps workforce people to roles with tenant and organization context.
- `workforce_people` stores 5,000 workforce records and has a `global_person_id`; profiles also have `global_person_id`.

### Important identity-link finding

A read-only count found 5,000 workforce people and zero matching profile rows by `global_person_id`. This means the workforce-person assignment model is not currently linked to authenticated profiles by that identifier. Do not assume a workforce management assignment authorizes a signed-in profile. A verified identity-linking workflow or a separate explicit profile-to-assignment link is required before it can drive dashboard authorization.

### Important location-scope gap

- `workforce_management_assignments` has no explicit location scope type or assignment-to-location membership table.
- `governance_regions` has no tenant/location membership mapping table in the inspected schema.
- `workforce_management_assignments` region scope references `governance_regions`, but that alone does not establish which tenant locations belong to a region.
- The existing assignment scope CHECK constraint allows only global, region, tenant and department. Location is not currently supported.
- The existing governance role catalog allowed-scope constraint allows global, region, tenant and department. It does not currently include location.
- Existing management assignment RLS read policy uses `is_org_admin(organization_id)`; it does not establish a user's explicit eight-location membership.

### Corrected Batch 008 implementation strategy

1. Preserve `governance_regions`, `governance_management_role_catalog`, `workforce_management_assignments`, `workforce_role_assignments`, `workforce_people`, and `profiles` as the canonical existing structures.
2. Add an explicit, tenant-bound region-to-location organization membership relation, with integrity checks ensuring each location belongs to the same tenant's organization tree.
3. Add explicit management-assignment-to-location membership for non-contiguous assignments such as eight West Side locations. The relation must reference an existing `workforce_management_assignments` row and a verified location organization; it must not store location IDs in JSON.
4. Add a secure profile identity bridge only after defining the authoritative matching and lifecycle rules. A matching email or display name is not sufficient. Prefer verified global identity linkage or an approved account-link operation.
5. Extend scope enums/check constraints and governance role allowed scopes to support location only after migration compatibility and existing records are assessed.
6. Reuse the existing role catalog for role/template identity. If dashboard layouts need separate versioning, add a focused dashboard-layout registry that references existing management role keys; do not duplicate the role catalog.
7. Do not make `workforce_management_assignments.authorization_enabled` a profile authorization source until the identity bridge, tenant integrity, location membership, entitlement and action-permission checks are all verified.

## 15. Updated implementation gate and safety decision

A Supabase development branch is required to validate this migration. The branch creation quote for the connected Supabase organization is **$0.01344 per hour**. Branch creation has not been completed because the non-zero recurring cost requires the user's explicit agreement. No branch was created, no migration was applied, and no production data was modified.

The repository work can continue on the existing GitHub feature branch. Database migration execution and end-to-end RLS tests remain blocked until an isolated Supabase branch is approved and available.


## 16. Current live data baseline (read-only counts, 2026-11-12)

The following counts were checked without changing records:

| Existing structure | Current count |
|---|---:|
| Governance regions | 7 |
| Governance management-role templates | 25 |
| Workforce management assignments | 0 |
| Active authorization-enabled management assignments | 0 |
| Workforce people | 5,000 |
| Workforce people linked to profiles by global person ID | 0 |

The role catalog currently covers global, regional, tenant, service-line and collaboration role families. Its allowed scope values are currently global, region, tenant and department. The current list includes Global Finance Director, Global Operations Director, Global Security and Risk Director, Regional Director, Regional Operations Manager, Regional Service Delivery Manager, Regional Workforce and Scheduling Manager, Tenant Manager, Tenant Operations Manager, Tenant Security and Compliance Lead, and other roles.

This is a useful foundation, but it is not yet the requested complete CEO/CFO/COO/CIO dashboard-template matrix at all three dashboard levels. The existing 25-role governance catalog is a management assignment/approval catalog, not proof that all dashboard layouts or executive permissions are configured.

## 17. Immediate next engineering tasks

1. Map the seven existing governance regions to the existing organization/location tree using a tenant-safe relation; do not assume region names or city labels establish membership.
2. Add explicit location scope membership to existing workforce management assignments, preserving existing scope behavior and approval gates.
3. Establish verified profile-to-workforce identity linking; current global-person matching is zero.
4. Reconcile existing management-role catalog scope rules with the requested location-level templates without silently widening existing privileges.
5. Implement an invoker-rights authorization resolver that combines authenticated profile, verified management assignment, explicit location membership, tenant boundary, active role permissions, and active subscription entitlement.
6. Add approved assignment lifecycle RPCs and audit writes only after the resolver and negative tests are validated in an isolated database branch.

No assignment rows were seeded. No location or region mappings were invented. The zero-assignment baseline is preserved.

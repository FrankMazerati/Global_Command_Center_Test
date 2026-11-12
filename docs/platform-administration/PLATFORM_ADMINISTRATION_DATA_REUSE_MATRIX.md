# Platform Administration Center — Live Data Reuse & Gap Matrix

**Inspection date:** 2026-11-12  
**Supabase project:** IntelliStack Systems Maximus Optimus Global Command Center  
**Inspection type:** Read-only live schema, migration, grants, RLS and advisor inspection  
**No schema changes were made.**

## Executive finding

The live database already contains most of the core control-plane building blocks. The Platform Administration Center should reuse them instead of creating parallel organization, identity, RBAC, access-request, audit, integration, service-catalog or workflow systems.

The principal structural gap is a generic, governed platform template/configuration registry with immutable versions, validation results, approvals and publication lineage. Before creating it, the implementation must decide which existing workflow-version and audit structures can be reused and how they will be composed.

## Live database snapshot

| Observation | Read-only result |
|---|---:|
| Tables inspected across `public`, `dispatch`, `intellisync` | 202 |
| Tables with RLS enabled | 202 |
| Tables with no RLS policy | 49 |
| Existing RLS policies | 291 |
| Applied migrations | 127 |
| Roles | 67 |
| Permissions | 49 |
| Role-permission mappings | 300 |
| Profile-role assignments | 3 |
| Profiles | 12 |

All 202 inspected tables have RLS enabled. The 49 tables without policies must remain treated as closed by default. Do not add blanket policies simply to make UI pages return data.

The three active profile-role assignments are currently one each for `employee`, `help_desk_l1`, and `super_admin`. This is not a sufficiently populated assignment baseline to infer the full intended pilot access matrix.

## Reuse-versus-gap matrix

| Platform Administration capability | Existing database objects | Current assessment | Decision |
|---|---|---|---|
| Organization hierarchy | `organizations`, `tenants`, `departments`, `organizational_units` | Existing canonical structures with organization/tenant relationships | Reuse; verify scope and mutation authorization |
| People and identity | `profiles`, global identity and workforce identity structures | Existing canonical profile and identity model | Reuse; do not create a second directory |
| Roles and permissions | `roles`, `permissions`, `role_permissions` | Existing catalog and mapping model | Reuse; audit zero-mapped roles and privileged role semantics |
| User role assignments | `profile_roles` | Supports organization/tenant scope, start/expiry and active state; only three current assignments | Reuse; verify approval/revocation path and assignment policy |
| Scoped permission grants | `permission_scope_grants` | Supports organization, tenant, department and resource scope, effect, conditions and expiry; currently no rows | Reuse; review policies and write authority |
| Access requests | `access_requests` | Supports requester/target, role/permission request, reason, status, temporary access, start/expiry and approver; currently no rows | Reuse; verify full approval history and revocation semantics |
| Audit | `audit_events`, `governance_audit_events`, domain audit tables | Multiple event stores exist; `audit_events` has actor, resource, outcome, reason, request ID and organization/tenant scope | Select and document canonical event contract; do not create a third generic audit table |
| Service registry | `service_catalog` | Existing service key, owner department, status, request schema and approval rules; currently no rows and no user-facing RLS policy | Reuse as registry candidate; keep server-only until a deliberate policy/API is designed |
| Integration registry | `integration_provider_catalog`, `integration_connections`, health/event/sync tables | Existing provider, connection, health and event structures | Reuse; secrets remain in secret storage, never in browser data |
| Workflow templates and execution | `workflows`, `workflow_versions`, `workflow_runs`, run events/checkpoints/step runs | Versioned definitions and execution history already exist | Reuse workflow engine for workflow department; do not duplicate workflow version tables |
| Domain-specific templates | `help_buddy_response_templates` | Has version, approval, visibility, organization/tenant and status metadata | Reuse only for Chat Buddy domain; do not treat as generic platform template registry |
| Generic platform templates | No generic `admin_templates` or `template_versions` table found in inspected public schema | Generic shared lifecycle not represented as a dedicated database domain | Design after validating workflow-version reuse and required immutable version contract |
| Platform configuration | No generic platform configuration registry/table found by name-pattern inspection | No shared versioned global/scoped configuration entity identified | Gap candidate; define effective configuration precedence and change approval before schema |
| Release/change management | Existing workflow, approval, audit and migration history; no generic platform release/change registry identified | Partial building blocks only | Decide whether deployment/release records remain in Vercel/GitHub and store references in platform metadata |
| Validation and preview | No generic administration validation-run registry identified | No shared persisted validation artifact model identified | Gap candidate; determine whether CI artifacts and validation records need a platform-level index |

## Authorization and RLS findings

### Core policy coverage

The inspected core tables have existing policies for selected operations:

- `organizations` and `tenants`: membership/global-admin reads and global-admin updates.
- `profiles`: self/global-admin reads and self-service/global-admin updates.
- `roles`, `permissions`, `role_permissions`: authenticated catalog reads with global-admin management policies where present.
- `profile_roles`: self/admin-scope reads.
- `permission_scope_grants`: own/admin reads and global-admin management.
- `access_requests`: requester/admin reads, requester insert and admin update/delete.
- `audit_events`: admin-scope/global-admin reads and global-admin insert.
- `integration_connections`: admin-scope management and global-admin read.
- `workflows` and `workflow_runs`: scope-limited read/insert/update policies.
- `service_catalog`: RLS enabled but no policy and no authenticated table grant in the inspected grants.

The existence of a policy name is not proof that its predicate is correct. Review policy expressions, helper functions, and negative cross-tenant behavior before using these objects for new admin screens.

### Security advisor findings

- 16 `SECURITY DEFINER` functions are executable by `authenticated`; none of the inspected 16 is executable by `anon`.
- These functions require individual source review for caller identity, scope validation, safe `search_path`, and whether the function truly needs definer privileges.
- The advisor reports 49 RLS-enabled tables with no policies.
- The advisor also reports 36 multiple-permissive-policy findings. Review overlap and query cost; do not mechanically combine policies where doing so changes access semantics.

No existing functions or policies were modified during this inspection.

## Priority issues before connecting the admin UI

1. **Do not expose the new UI to unrestricted table writes.** The browser should call narrow server operations, not receive broad CRUD access to administrative tables.
2. **Review the 16 authenticated SECURITY DEFINER functions.** This is a pre-existing review item; it is not evidence that all sixteen are vulnerable. Review individually and preserve legitimate policy helpers.
3. **Keep the 49 no-policy tables closed.** Classify by owner, scope, grants and intended use before adding policies.
4. **Resolve audit event ownership.** Define whether `audit_events` is the canonical platform event contract and how governance/domain-specific records relate to it.
5. **Validate role assignments.** The current live assignment count is too small to represent the intended seeded pilot personas. Do not invent or auto-grant roles.
6. **Review privileged role mappings.** Some of the 67 role definitions have zero permission mappings. This must be reconciled against the intended access matrix before any new role grant is issued.
7. **Preserve service catalog default-deny.** Build a server-side service registry read path or an explicit scoped RLS policy only after its consumer and owner rules are defined.

## Recommended next schema design

After the above review, design the smallest additive schema that fills confirmed gaps:

- generic administration template metadata and immutable versions, if workflow versions cannot serve this purpose safely;
- versioned platform configuration with explicit scope and deterministic override precedence;
- validation-run metadata and links to CI/test artifacts, if existing GitHub/Vercel artifacts do not meet audit needs;
- change/publication metadata only if deployment references and existing audit/workflow records cannot satisfy traceability.

Do not create a new role system, organization hierarchy, approval engine, audit engine, integration registry or workflow engine.

## Next verification gate

Before any migration:

1. Inspect source definitions of all 16 authenticated SECURITY DEFINER functions.
2. Review exact RLS expressions and table grants for core administration tables.
3. Build the role-to-permission and profile-role test matrix for Super Admin, Platform Administrator, Company Administrator, Department Administrator and standard users.
4. Test cross-tenant denial at SQL/RPC/server-function level.
5. Confirm canonical audit semantics and append-only expectations.
6. Produce a reviewed migration plan and rollback strategy.

**Status:** Read-only inventory completed. No migration proposed or applied.


## Privileged-function source review — first pass

The 16 authenticated-executable SECURITY DEFINER functions were inspected at source level. This is a first-pass code review, not a complete security certification.

### Confirmed positive controls

- `private.is_org_admin_scope` checks an active role assignment against the requested organization and permits either an organization-wide grant or a matching tenant grant.
- Workforce identity linking checks the target profile and workforce person are active, real, and in the same organization and tenant before linking.
- Workforce management approval rejects self-approval, requires a proposed assignment, verifies the relevant management-role approval policy, and writes an audit event.
- Workforce management request/approve/revoke operations use the private organization-scope helper and record reasons/audit events.
- Ticket acceptance derives the actor's organization/tenant from the active profile and constrains the ticket to that scope before claiming it.
- Chat Buddy welcome-message creation verifies session ownership and active assistant/profile state.
- The marketplace deal-quote request constrains the cart to the authenticated user and their organization/tenant and requires approved active pricing.

### High-priority scope issue to resolve before enabling platform-admin writes

Both `public.is_global_admin()` and `private.is_global_admin()` check that the active profile has an active, unexpired `super_admin` or `global_admin` role assignment, but neither requires the assignment's `organization_id` and `tenant_id` to be NULL.

The `profile_roles` table has organization and tenant foreign keys plus an expiry-order check, but no constraint enforcing that global roles must be unscoped. The current active `super_admin` assignment is unscoped, so the observed record is consistent with the intended model; however, the database does not enforce that invariant for future assignments.

**Required correction before privileged UI mutations:** define and enforce that global roles can only be granted at global scope, and that tenant/company/department-scoped roles cannot satisfy global-admin helpers. Add database constraints and/or guarded grant procedures as appropriate, then test a deliberately scoped `super_admin` and `global_admin` assignment is denied global authority. Do not simply add a UI check.

### Additional function review items

- `public.holds_role` checks role presence and assignment dates but does not evaluate organization/tenant scope. Confirm every caller uses it only for truly global role-presence checks or replace scope-sensitive call sites with scoped helpers.
- `public.is_org_admin` uses the profile's organization and a broad role-key list. Confirm that each listed role is intended to grant organization administration and that assignment scope is checked.
- `public.kb_can_manage` checks the `knowledge.manage` permission mapping but does not explicitly constrain the role assignment by organization/tenant. Confirm the intended global-versus-organization knowledge-management model.
- `public.kb_is_super_admin` also does not require unscoped global role assignment.
- `public.accept_ticket` checks the role key and ticket organization/tenant but does not match the role assignment's own organization/tenant scope.
- `public.request_workforce_management_assignment` validates the person is active and non-synthetic but does not visibly compare the person's organization/tenant with the requested assignment scope.
- `public.set_workforce_management_assignment_locations` checks assignment ownership and the proposed location-set lifecycle but does not visibly verify every submitted location belongs to the assignment's authorized organization/tenant.
- `public.marketplace_request_deal_quote` is a user-owned cart operation rather than a platform-admin grant path; retain its cart ownership, organization/tenant and approved-pricing checks.

These findings require call-site, trigger and constraint review before changing any function. No function, grant, role assignment, policy or database record was modified.

## Revised next gate

1. Trace all policy and RPC call sites for `is_global_admin`, `holds_role`, `is_org_admin`, `kb_can_manage` and `kb_is_super_admin`.
2. Confirm intended global role semantics and enforce unscoped global grants at the database boundary.
3. Verify workforce assignment person/scope and location/scope checks.
4. Add negative tests for scoped global roles, cross-tenant role use, cross-organization workforce assignment, and foreign location IDs.
5. Only after those tests pass, connect the Platform Administration Center's privileged operations through narrow server-side procedures.


### RLS call-site impact

The global-admin helpers are referenced by multiple existing RLS policies, including policies on access requests, permission/role administration, profiles, role assignments, command work items and approvals, assistant/avatar administration, knowledge management, site content, scenario management, and workforce-related records.

Because these helper functions are shared authorization dependencies, correcting their scope semantics requires regression tests across every dependent policy—not only the new Platform Administration Center. A scoped `super_admin` or `global_admin` must never satisfy a global helper, and existing legitimate unscoped global-admin behavior must remain intact.

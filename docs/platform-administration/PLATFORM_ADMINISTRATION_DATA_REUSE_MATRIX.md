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

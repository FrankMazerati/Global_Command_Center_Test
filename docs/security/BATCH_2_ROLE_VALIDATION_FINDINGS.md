# Batch 2 — Role Validation Findings

**Environment inspected:** Supabase project `fzwbvccvqnbvzbqfgiep`  
**Inspection type:** Read-only schema and role-permission queries  
**Date:** 2026-11-11

## Canonical identity and group schema

The existing application data model already provides a canonical identity model. Do not introduce a parallel employee table.

- `profiles.id` is the profile/auth identity key.
- `profiles.organization_id`, `tenant_id`, `department_id`, and `organizational_unit_id` define organizational context.
- `profiles.employee_global_id` and `company_global_id` provide business identity references.
- `profiles.first_name`, `last_name`, `display_name`, `work_email`, `work_phone`, `job_title`, `manager_profile_id`, `member_status`, `location_city`, `location_region`, `country_code`, and `timezone` support employee directory and profile presentation.
- `groups` stores organization/tenant-scoped groups, including `group_key`, `group_type`, `description`, and `is_privileged`.
- `group_memberships` links `group_id` to `profile_id`, with `added_by` and optional `expires_at`.
- `roles`, `profile_roles`, `permissions`, and `role_permissions` are the existing role/permission system.

## Current Help Desk role-permission snapshot

The following counts and permission keys came from a read-only query of the connected project.

| Role | Assigned permission count | Finding |
|---|---:|---|
| Help Desk Level 1 | 11 | Includes `ticket.assign`; assignment scope needs explicit verification. |
| Help Desk Level 2 | 10 | No `ticket.assign` in the current direct role-permission list. |
| Help Desk Level 3 | 10 | Same direct permission-key list as L2; advanced L3 distinction is not represented here. |
| Help Desk Supervisor | 0 | No direct permissions assigned. |
| Service Desk Analyst | 0 | No direct permissions assigned. |
| Service Desk Manager | 9 | Includes `ticket.assign`, `ticket.read.department`, `workflow.manage`, and knowledge management. |

## Required authorization decisions before changing grants

1. Determine whether `ticket.assign` for L1 is intended to be self-assignment only, queue-limited, or a broader assignment capability. Do not infer its scope from the permission key alone.
2. Define L2 and L3 escalation/technical action differences using actual permission definitions and server-side checks; their current direct permission lists are identical.
3. Define the supervisor role's intended scope before granting it permissions. The zero-permission state may be deliberate pending role design.
4. Define the Service Desk Analyst role separately from Help Desk L1/L2/L3; do not automatically inherit grants.
5. Confirm whether manager authority is organization-wide, department-scoped, or team-scoped. A role name is not a scope.
6. Inspect RLS policies and every ticket RPC/action path before treating UI filtering as authorization.
7. Add negative tests for cross-organization, cross-tenant, unassigned-ticket, and unauthorized escalation/assignment attempts.

## Acceptance tests required to close Batch 2

- L1 can read and update only authorized assigned/department tickets as defined by policy; cannot perform unapproved assignment, management, or cross-scope reads.
- L2 can perform its explicitly approved escalations and technical updates; cannot inherit manager or administrator rights.
- L3 can perform approved advanced technical actions; cannot cross tenant/organization boundaries or grant roles.
- Supervisor can see only the approved team/queue scope and can perform only explicitly approved supervisory actions.
- Manager can manage only the approved organizational scope; cannot become a Global Admin by virtue of the manager role.
- Directory users, profile detail, group records, and group membership remain organization/tenant scoped.
- Expired group memberships and role grants are not treated as active.
- All denied actions are enforced server-side and leave appropriate audit evidence.

## Current implementation state

The application directory now reads identity rows from the canonical `profiles` table and includes the existing employee identity, work contact, manager, status, and location fields. The directory routing has also been extended to read existing `groups` and `group_memberships` records without creating duplicate data.

**Not yet certified:** The Groups page is currently a read-only directory view, not a complete membership editor. Role grants have not been changed. RLS/RPC authorization tests have not yet been run. A passing lint/test/build result has not yet been observed. Therefore Batch 2 remains open until those controls and tests are implemented and verified.


## Follow-up implementation — employee profile and group management

The working branch now includes:

- `EmployeeProfileWorkspace`: loads the signed-in user's own `profiles` row by `auth.uid()`, displays identity/employment fields, group memberships, badge progress, and star/XP ledger totals. It includes a self-service editor limited to display name, work phone, location, timezone, and avatar URL; it does not expose role, organization, tenant, employee ID, or manager fields for self-editing.
- The existing AppShell profile dropdown already links “My profile” to the `user-profiles` route. That route now renders the employee profile workspace.
- `GroupMembershipWorkspace`: allows scoped directory administrators to select a visible employee, inspect that employee's group memberships, add memberships with optional expiry, and remove memberships. The UI checks active role assignments for administrator roles, while database RLS remains the authoritative enforcement layer.
- Migration `20261111190000_group_membership_admin_write_policies.sql`: defines organization/tenant-scoped insert/delete policies for group memberships. Privileged groups require global administrator authority; organization administrators can manage non-privileged groups only within their assigned scope.
- `.github/workflows/production-readiness-checks.yml`: aligned the existing branch-validation workflow with the repository's declared pnpm 11.25.0 toolchain. A temporary duplicate workflow was removed so there is one authoritative CI pipeline.

## Verification boundary and blockers

The application code and migration have been committed to the test branch. The Supabase migration has **not** been applied to the connected database. Therefore group membership write operations are not yet verified against the live RLS policy and may be denied until the migration is reviewed and applied to the intended environment.

No successful CI run has been observed for the latest branch commits. The GitHub workflow-run lookup currently returns no run for the latest commit. A passing lint, test, and production build result is therefore **not certified**.

The Help Desk L1/L2/L3/Lead/Manager authorization matrix remains a separate open implementation item. The database permission snapshot documents current gaps, but no role grants or ticket RLS policies have been changed as part of this follow-up.

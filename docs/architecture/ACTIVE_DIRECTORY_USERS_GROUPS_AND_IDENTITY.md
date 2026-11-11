# New Active Directory — Users, Groups, and Identity Architecture

## Product placement

The employee directory and individual employee profiles belong inside:

**Hamburger → New Active Directory → Users and Identity → User Accounts / User Profiles / Employee Accounts**

Groups and memberships belong inside:

**Hamburger → New Active Directory → Groups and Organization → Security Groups / Distribution Groups / Group Membership**

Do not create a second employee directory in Command Center or My Business Center. Those areas may link to directory records but must resolve to the same canonical profile identity.

## Canonical data model

Use existing Supabase identity and organization structures as the source of truth where present:

- `profiles`: person-level profile and identity attributes.
- `organizations`: company / organization boundary.
- `tenants`: tenant boundary and tenant configuration.
- `departments`: department membership and organization structure.
- `groups`: directory/security/distribution groups.
- `group_memberships`: membership edges with lifecycle and scope.
- `roles`: role catalog.
- `profile_roles`: user-to-role assignments.
- `permissions`: permission catalog.
- `role_permissions`: role-to-permission definitions.
- `permission_scope_grants`: constrained, scoped grants.
- `connected_workspaces` and `connected_workspace_members`: connected-workspace membership where applicable.

Before implementation, verify exact columns, foreign keys, uniqueness rules, RLS policies, and whether any of these objects have evolved. Never assume a table's name alone guarantees the required semantics.

## Users and employee profiles

The directory should provide:

- Global directory search with organization/tenant scope enforced on the server.
- Employee, contractor, tenant user, business user, and external-user filters.
- Account state: invited, active, suspended, locked, offboarding, deactivated.
- Identity attributes: display name, legal/preferred name where permitted, work email, work phone, job title, department, manager, location, employment type, start/end dates, and profile photo.
- Stable Global User ID and tenant/company identifiers displayed according to policy.
- Profile drill-down with role grants, group memberships, assigned devices, licenses, access requests, approvals, and audit history.
- Clear separation between user-editable profile fields and administrator-managed identity attributes.

Never expose sensitive fields such as authentication secrets, recovery codes, personal banking details, or private HR notes in the general directory.

## Groups and organizational hierarchy

Support organizational units, departments, teams, security groups, distribution groups, and application-access groups as distinct concepts. Each group should have:

- Name, description, group type, organization ID, tenant ID, owner, status, and lifecycle dates.
- Explicit member list and membership source (manual, rule-based, synced, or provisioned).
- Approval requirements for privileged/security groups.
- Membership review cadence and expiry where applicable.
- Audit history for create, update, add/remove member, owner changes, and deletion/deactivation.

Group nesting must be cycle-safe and bounded. Do not let a group membership in one tenant imply membership in another.

## Access and licensing

The Access and Licensing section should link to roles, permission grants, application entitlements, license inventory, MFA/SSO status, access requests, and access audit. Access grants should record:

- requester, subject, resource, requested scope, business reason;
- manager, resource owner, and security approval as required;
- start and expiry timestamps;
- approver decisions and timestamps;
- revoke reason and revocation actor;
- immutable audit event identifier.

An executive title must not silently create Super Admin. Global Admin / Super Admin grants use a separate privileged access workflow.

## Page actions

| Page | Primary actions |
|---|---|
| User Accounts | Search, filter, invite, view profile, suspend/reactivate, initiate offboarding |
| User Profiles | View profile, edit allowed fields, view access, devices, licenses, history |
| Employee Accounts | Filter by employment type, view lifecycle, manager and department |
| Contractor Accounts | View sponsor, contract dates, scoped access, expiry, offboarding |
| Tenant User Accounts | Switch tenant context only when authorized; never change ownership implicitly |
| Security Groups | Create, edit, view members, request privileged membership, review access |
| Distribution Groups | Create, edit, manage delivery membership within approved scope |
| Group Membership | Add/remove members, bulk import with validation, review pending changes |
| Roles and Permissions | Inspect role definitions, compare grants, submit access change for approval |
| Access Requests | Request, approve, deny, revoke, extend with reason and audit |

## UI and responsive behavior

- Keep New Active Directory as one expandable primary hamburger section.
- User Accounts, User Profiles, and Employee Accounts are adjacent pages under Users and Identity.
- Groups, Security Groups, Distribution Groups, and Group Membership remain under Groups and Organization.
- Use one directory table with search/filter/sort/pagination and an accessible row-to-profile action.
- Profile view should use clear tabs: Overview, Organization, Groups, Roles & Access, Devices & Licenses, Requests & Approvals, Audit.
- On tablet/mobile, tables become stacked summary rows with visible primary identifiers and accessible detail expansion.
- Empty, loading, unavailable, permission-denied, and integration-not-configured states must be distinct.

## Security acceptance criteria

- Every query is scoped using trusted authenticated organization/tenant membership.
- Direct URL, API, RPC, search, export, and storage requests enforce identical authorization.
- A user cannot edit their own role, tenant, organization, employment status, or privileged identity attributes unless a separately authorized workflow explicitly permits it.
- Group membership changes cannot grant permissions outside the actor's authority.
- Offboarding revokes sessions and scoped grants according to policy, while preserving required audit records.
- Tests cover cross-tenant profile IDs, group IDs, role IDs, attachment paths, and bulk import rows.

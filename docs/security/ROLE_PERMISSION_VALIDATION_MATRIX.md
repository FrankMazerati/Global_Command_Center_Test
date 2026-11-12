# Role and Permission Validation Matrix

**Purpose:** Define intended authorization boundaries and executable acceptance tests for the Command Center.  
**Important:** This document is a target specification. It does not certify the current database role-permission assignments.

## Authorization invariants

- Authorization is evaluated on the server for every request and data operation.
- The authenticated user's organization, tenant, active status, and role grants come from trusted database-backed membership.
- A client-supplied `organization_id`, `tenant_id`, profile ID, route slug, or search filter never expands access.
- Roles are additive only where explicitly designed; privileged grants require a separately authorized approval workflow.
- A title such as CEO, CFO, CIO, CTO, Lead, or Manager is not itself proof of a platform-administrator grant.
- Global Admin / Super Admin is a distinct platform-administration authority, not an automatic consequence of executive seniority.
- Temporary grants have an approver, scope, start/end time, reason, revocation path, and audit event.
- Denied operations return a safe denial and do not leak whether another tenant's protected record exists.

## Help Desk roles

| Capability | L1 | L2 | L3 | Lead / Supervisor | Service Desk Manager |
|---|---:|---:|---:|---:|---:|
| Read assigned tickets | Yes | Yes | Yes | Team scope | Team/org scope |
| Create tickets | Yes | Yes | Yes | Yes | Yes |
| Update permitted ticket fields | Assigned | Assigned / L2 scope | Assigned / L3 scope | Team oversight | Scoped queue |
| Public ticket replies | Yes | Yes | Yes | Yes | Yes |
| Internal notes | Policy-limited | Yes | Yes | Yes | Yes |
| Escalate to next level | Yes | Yes | Yes | Yes | Yes |
| Assign/reassign team queue | No | Only explicit scoped handoff | Only explicit scoped handoff | Team scope | Scoped queue |
| Change SLA policy | No | No | No | No by default | Approval-gated |
| Manage user/group membership | No | No | No | No | No by default |
| Grant privileged roles | No | No | No | No | No |
| Read payroll / private HR | No | No | No | No | No by default |
| Read finance ledger | No | No | No | No | No |
| Change tenant security policy | No | No | No | No | No |

### L1 acceptance tests
1. An L1 user can list only tickets assigned to that user or explicitly shared with the L1 queue.
2. L1 can create a ticket; requester, organization, and tenant are derived from the authenticated profile.
3. L1 can update only fields allowed by the ticket workflow and only while the ticket is in an editable state.
4. L1 can add an authorized public reply and escalate with a required reason.
5. L1 cannot broadly assign/reassign tickets, change group membership, grant roles, change SLA policy, or access finance/HR data.
6. Replaying the same request with another tenant's ticket ID returns a safe denial.
7. Direct API/RPC invocation and route deep-link attempts enforce the same checks as the UI.

### L2 acceptance tests
1. L2 can access the L2 queue and approved diagnostic actions within assigned organization/tenant scope.
2. L2 can accept scoped handoffs and return/escalate with an audit reason.
3. L2 cannot grant roles, administer directory groups, change tenant security, or read payroll/finance.
4. L2 cannot use a modified request body to change ticket tenant or organization.

### L3 acceptance tests
1. L3 can perform approved advanced technical actions on assigned/escalated work.
2. Production-impacting actions require the defined change approval and record an audit event.
3. L3 cannot bypass workflow approvals, elevate their own role, or inspect unrelated employee records.
4. L3 cannot change global security, billing, or tenant ownership.

### Lead / Supervisor acceptance tests
1. Lead can view team workload, quality indicators, team ticket queue, and escalation status for their assigned team.
2. Lead can coach, review, and recommend reassignment within explicitly assigned team scope.
3. Lead cannot grant privileged roles, change tenant boundaries, or read unrelated HR/finance content.
4. Lead's role assignment must have explicit permission grants; an empty role mapping is not treated as implicit access.

### Manager acceptance tests
1. Manager can review scoped team staffing, SLA performance, workload, and queue reports.
2. Queue administration is constrained to the manager's assigned organization, tenant, and team scope.
3. Sensitive personnel actions require the separate HR permission and approval path.
4. Manager cannot become Global Admin or Super Admin by implication.

## Executive workspaces

| Role | Dedicated workspace capabilities | Explicit exclusions by default |
|---|---|---|
| CEO | Enterprise KPIs, strategy, initiatives, board/operating reports, material risks, cross-functional summaries | Raw credentials, unrestricted private HR records, unrestricted SOC evidence, platform role administration |
| CFO | Ledger, revenue, expenses, invoices, receivables, subscriptions, purchases/sales, budgets, forecasts, reconciliations, finance approvals | Unmasked payment credentials, unrelated employee private content, global identity/security administration |
| CIO | IT portfolio, service health, assets, identity governance, vendor/license posture, IT budgets, operational risk | Private employee content, unrestricted SOC evidence, payroll, unapproved production changes |
| CTO | Engineering portfolio, architecture, release health, product delivery, reliability, technical debt, developer tooling | Payroll/HR, unrestricted finance, unapproved production changes or secrets |

Executives receive only records their company and role are authorized to view. Cross-company comparisons require an explicit portfolio/global scope grant and audit trail. Executive assistant or analyst delegation must be separately granted, time-limited, and revocable.

## Required automated test dimensions

For each persona, test:

- permitted read, create, update, delete, export, and RPC operations;
- direct route access and direct API/RPC calls;
- search, autocomplete, related-record lookup, and attachment/storage access;
- same-tenant, same-organization, cross-organization, and cross-tenant cases;
- inactive user, expired grant, revoked grant, and removed group membership;
- forged profile, tenant, organization, role, and resource-owner identifiers;
- audit record creation for approvals, access changes, exports, and privileged operations.

## Current known verification gaps

Prior inspection of the connected Supabase environment found executive role definitions without permission assignments and a Help Desk Lead/Supervisor role with no assigned permissions. L1/L2/L3 assignments require review against the matrix above; in particular, verify whether L1's ticket assignment permission is broader than the intended assigned-ticket workflow. Recheck the current environment before acting because database state may have changed since that inspection.

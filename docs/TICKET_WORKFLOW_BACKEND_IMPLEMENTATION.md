# Ticket Workflow Backend — Implementation and Verification Plan

This document is the implementation contract for the existing Supabase-backed ticket workflow. It is not tied to a third-party editor or paid service.

## Verified implementation — 2026-11-13

The following contracts are now present in the existing Supabase project and wired into the ticket workspace:

- `create_ticket` creates authenticated requests.
- `accept_ticket` performs an atomic first-worker-wins claim. It remains SECURITY DEFINER because it must safely perform a row-locked claim across the normal technician UPDATE policy; it now uses an empty search path, fully qualified objects, and explicit active-profile, role, organization, tenant, requester, status, and unassigned checks.
- `apply_ticket_transition` handles accept, start, requester/internal wait, resume, escalation, resolution, close, reopen, cancel, assignment/reassignment, and priority changes.
- `update_ticket_details` validates and updates ticket title, description, and category.
- `request_ticket_approval` and `decide_ticket_approval` provide atomic ticket approval creation and decisions.
- Ticket approval RLS restricts visibility to the requester, ticket participants, and authorized support/management roles. Decisions require an active manager role, same organization/tenant scope, a decision note, and separation of duties; requesters cannot approve their own requests.
- Approval lifecycle events must reference the real approval row created by the same requester and ticket. This keeps event history connected to the approval record.
- The ticket workspace now includes approval requests, manager decisions, comments, lifecycle history, assignment, priority, and status actions.

The approval flow was exercised inside a rollback-only transaction using the seeded L1 technician and Super Admin identities: the L1 request was created, self-approval was rejected, the Super Admin decision succeeded, and the transaction was rolled back. No test approval rows were left behind.

The application verification, production-readiness validation, and responsive-layout QA workflows completed successfully on the verified application revision before the latest documentation/migration-only changes. Re-run them after subsequent code changes before treating that revision as green.

## Confirmed existing database contracts

- `create_ticket(p_title text, p_description text, p_priority ticket_priority, p_category text)`
- `accept_ticket(p_ticket_id uuid)`
- `admin_update_ticket(p_ticket_id uuid, p_status ticket_status, p_priority ticket_priority, p_assigned_profile_id uuid, p_reason text, p_resolution_summary text)`

The frontend is aligned to `create_ticket`. `accept_ticket` is an atomic first-worker-wins claim for eligible unassigned tickets and checks help-desk roles. `admin_update_ticket` is restricted to global administrators and must not be used as the general technician workflow API.

## Required backend contracts

### 1. `apply_ticket_transition`

Implement a secure server-side function with a typed action contract covering:
- `accept`, `start`, `wait_requester`, `wait_internal`, `resume`
- `escalate`, `resolve`, `close`, `reopen`, `cancel`
- `assign`, `set_priority`

Requirements:
1. Require an authenticated user with an active profile and organization membership.
2. Lock the target ticket row with `FOR UPDATE` before checking current state and applying changes.
3. Enforce organization and tenant scope on every lookup and update; tenant equality must be null-safe where organization-scoped tickets permit a null tenant.
4. Enforce role and relationship rules server-side. A help-desk worker may perform only actions allowed by role, level, assignment, and escalation ownership; managers/admins may perform only their authorized broader actions.
5. Enforce the state/action matrix from `src/lib/ticket-workflow.ts`; never trust a client-provided current status.
6. Require a reason for wait, escalation, resolve, reopen, and cancel. Require a resolution summary for resolve/close.
7. For assignment/reassignment, require an active target profile in the same organization and exact tenant scope; record old and new assignees.
8. Preserve atomic first-worker-wins behavior for accept. The existing `accept_ticket` may remain the implementation for that action if its return and event contract is consistent.
9. Update `resolved_at`, `closed_at`, `waiting_on`, SLA clock state, and assignment fields consistently. Preserve prior resolution details in lifecycle history on reopen.
10. Insert a `ticket_lifecycle_events` row for every successful state, assignment, priority, wait, resume, and escalation change.
11. Return the updated ticket row. Raise meaningful authorization, validation, and concurrency errors.
12. AI and browser code must call this same authorized contract and may never bypass it.

### 2. `update_ticket_details`

Securely update title, description, and category. Validate lengths; enforce requester/assignee/manager policy; require matching organization and tenant scope; record changed field names in lifecycle/audit history; return the updated ticket.

### 3. Conversation scope and insertion

Confirmed schema facts:
- `ticket_conversation_messages.channel` is required.
- Customer-facing values are `channel='customer'` and `visibility='customer'`; internal messages use `internal`.
- `ticket_conversation_messages.tenant_id` is currently NOT NULL, while tickets may be organization-scoped with `tenant_id IS NULL`.

A reviewed migration must decide and implement the safe nullable-tenant correction and null-safe RLS matching (`IS NOT DISTINCT FROM`) across message, ticket, and profile scopes. Preserve strict isolation whenever a tenant is present. Prefer a server-side `add_ticket_conversation_message` RPC that validates organization, tenant, ticket relationship, and permission for customer-visible versus internal comments. Audit message metadata only, never message bodies.

## Approval workflow

The existing command-work approval UI reads `command_work_item_approvals`. Its current decision helper performs a direct status update followed by a separate event insert, which is not atomic. Replace that pair with a single server-side decision RPC that:
- locks the pending approval row;
- checks the active approver, organization/tenant scope, and separation of duties;
- accepts only pending-to-approved/denied transitions;
- writes the decision and corresponding work-item event atomically;
- returns the authoritative decision record.

Ticket access approvals must remain distinct from ordinary command-work approvals. Sensitive access ticket transitions must verify an approved, correctly scoped request.

## Chat Buddy integration

Chat Buddy must resolve a ticket reference against the authenticated user's RLS-visible ticket records before setting it as active context. It may summarize, draft, and request actions, but each mutation must call the same server-authorized workflow RPC as the ticket workspace. Never infer successful writes or claim an action occurred before the backend confirms it.

## Acceptance tests

- Requester creates a ticket and sees it in My Tickets.
- Authorized L1 atomically accepts an unassigned new/offered ticket; concurrent second claimant loses cleanly.
- Unauthorized roles cannot accept, assign, reprioritize, resolve, close, or reopen.
- Assigned technicians can perform only permitted transitions; unrelated same-organization users cannot mutate.
- Reassignment rejects inactive, cross-organization, and cross-tenant targets.
- Requester-wait and internal-wait are distinguishable and resume correctly.
- Resolve/close require a resolution summary; reopen records reason and preserves prior resolution history.
- L1/L2/L3 escalation records level, reason, destination, acknowledgment, and timestamps.
- Requester-visible comments are visible to requesters; internal comments are restricted to authorized staff.
- Null-tenant organization tickets can receive comments without weakening tenant isolation.
- Every successful mutation creates expected lifecycle and audit evidence.
- Approval decisions are atomic, authorized, single-use, and auditable.

## Remaining implementation and verification scope

- Escalation currently records levels 1–4, the actor, reason, and escalation event. Routing to a named L2/L3 queue, acknowledgment timers, and escalation destination ownership still need to be completed.
- Reassignment requires a 20-character reason and records old/new assignee identifiers. Reopen lifecycle metadata preserves the previous resolution summary.
- Ticket conversation insertion currently uses the existing direct insert path with the required `channel` field. A dedicated server-side conversation RPC and complete requester/internal visibility matrix remain follow-up hardening work.
- SLA clocks and wait accounting exist, but need role-based end-to-end tests for requester wait, internal wait, resume, pause/resume behavior, and breach notifications.
- Browser-level authenticated role testing is still required for requester, L1, L2, L3, service-desk manager, IT manager, and global administrator. The rollback-only database test validates the approval RPC path without retaining test data.
- Do not merge the pull request into `main` or deploy production without explicit approval. Keep using the existing pull request branch and existing Supabase project.

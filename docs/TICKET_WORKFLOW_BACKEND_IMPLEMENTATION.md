# Ticket Workflow Backend — Implementation and Verification Plan

This document is the implementation contract for the existing Supabase-backed ticket workflow. It is not tied to a third-party editor or paid service.

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

## Current rollout boundary

Read-only inspection confirmed that `apply_ticket_transition`, `update_ticket_details`, and `add_ticket_conversation_message` are not currently present in the live database. Do not call them as though they exist. The current message insert path is direct and requires the existing non-null tenant column. A live schema/RPC rollout is intentionally not performed in this pass: it requires a reviewed migration and explicit production-database authorization. The application must surface missing contracts as unavailable rather than fake success.

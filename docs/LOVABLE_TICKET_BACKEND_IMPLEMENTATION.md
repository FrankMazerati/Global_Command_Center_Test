# Lovable Backend Request — Ticket Workflow

Use this specification in Lovable to implement the missing ticket backend contracts. Follow repository `AGENTS.md`: database changes belong in Lovable, not hand-written migration files.

## Existing functions confirmed in Supabase

- `create_ticket(p_title text, p_description text, p_priority ticket_priority, p_category text)`
- `accept_ticket(p_ticket_id uuid)`
- `admin_update_ticket(p_ticket_id uuid, p_status ticket_status, p_priority ticket_priority, p_assigned_profile_id uuid, p_reason text, p_resolution_summary text)`

The frontend has been aligned to `create_ticket`. `accept_ticket` is already implemented as an atomic claim for eligible unassigned tickets and checks help-desk roles. `admin_update_ticket` is restricted to global administrators, so it must not be treated as the general technician workflow API.

## Required backend functions

### 1. `apply_ticket_transition`

Create a secure server-side function with a typed action contract covering:

- `accept`, `start`, `wait_requester`, `wait_internal`, `resume`
- `escalate`, `resolve`, `close`, `reopen`, `cancel`
- `assign`, `set_priority`

Requirements:

1. Require an authenticated user with an active profile and organization membership.
2. Lock the target ticket row with `FOR UPDATE` before checking its current state and applying the change.
3. Enforce organization and tenant scope on every lookup and update.
4. Enforce role and relationship rules server-side. A help-desk worker may perform only actions permitted by their role and assignment; managers/admins may perform their authorized broader actions.
5. Enforce the state/action matrix from `src/lib/ticket-workflow.ts`; do not trust a client-provided current status.
6. Require a reason for wait, escalation, resolve, reopen, and cancel actions. Require a resolution summary for resolve/close.
7. For assignment/reassignment, require an active target profile in the same organization and tenant; record old and new assignees.
8. For accept, preserve the atomic first-worker-wins behavior of the existing `accept_ticket` function.
9. Update `resolved_at`, `closed_at`, `waiting_on`, SLA clock state, and assignment fields consistently for each action. Preserve prior resolution information as history when reopening.
10. Insert a `ticket_lifecycle_events` row for every successful state, assignment, priority, wait, resume, and escalation change.
11. Return the updated ticket row. Raise meaningful authorization, validation, and concurrency errors.
12. Never allow AI or browser code to bypass these rules.

### 2. `update_ticket_details`

Create a secure function to update title, description, and category. Validate lengths; enforce requester/assignee/manager policy; require the same organization/tenant scope; record changed field names in lifecycle/audit history; return the updated ticket.

### 3. Conversation tenant-scope correction

Current database facts:

- `ticket_conversation_messages.channel` is required.
- The accepted customer-facing values are `channel='customer'` and `visibility='customer'`; internal messages use `internal`.
- `ticket_conversation_messages.tenant_id` is currently NOT NULL.
- Tickets can be organization-scoped with `tenant_id IS NULL`.

This prevents organization-scoped tickets from reliably receiving conversation messages. Please decide and implement the safe schema/RLS correction: allow nullable tenant IDs for organization-scoped tickets and use null-safe matching (`IS NOT DISTINCT FROM`) between message, ticket, and profile scopes. Keep strict tenant isolation when a tenant is present. Do not broaden access across tenants.

### 4. Conversation insert function or policy

Prefer a server-side `add_ticket_conversation_message` function that validates the current user's organization, tenant, ticket relationship, and permission to post requester-visible versus internal content. Record a lifecycle event with message metadata only; do not copy message bodies into audit events.

## Acceptance tests

- Requester can create a ticket and see it in My Tickets.
- Authorized L1 can atomically accept an unassigned offered/new ticket; a second concurrent worker loses cleanly.
- Unauthorized roles cannot accept, assign, change priority, resolve, close, or reopen.
- Assigned technician can perform permitted work transitions; an unrelated same-organization user cannot mutate the ticket.
- Reassignment rejects inactive, cross-organization, and cross-tenant targets.
- Waiting-on-requester and waiting-on-internal are distinguishable and resume correctly.
- Resolve/close require a resolution summary.
- Reopen records the reason and retains the previous resolution in history.
- L1/L2/L3 escalation records level, reason, assignee/team, acknowledgment, and timestamps.
- Customer-visible comments are visible to the requester; internal comments are visible only to authorized staff.
- Organization-scoped tickets with null tenant IDs can receive comments without weakening tenant isolation.
- Every successful mutation creates the expected lifecycle event and audit evidence.

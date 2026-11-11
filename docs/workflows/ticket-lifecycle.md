# Ticket continuity: create → work → conversation → audit

This implementation replaces the local-only active-ticket stub with a real Supabase-backed workflow. It does not seed sample tickets and does not widen table grants or RLS policies.

## User flow

1. A signed-in user creates a ticket from the catalog manager or the active-ticket workspace. The `create_portal_ticket` function takes requester, organization, and tenant identifiers from the caller's profile instead of trusting browser-supplied scope.
2. Ticket lists (all visible, my requests, assigned, team, command queue, and history) query `public.tickets` with the existing caller session. Supabase RLS remains the source of row access. The UI labels results as the latest 200 accessible records rather than implying it has loaded the full history.
3. A user opens a record by its ticket number or UUID. State actions are validated in the UI and again in `apply_ticket_transition`. The RPC is `SECURITY INVOKER`; it cannot bypass the deployed table grants, policies, or tenant scope. Assignment additionally verifies that the target profile belongs to the same organization and tenant.
4. Status transitions, reason-required actions, assignment, priority changes, requester wait-time accounting, and SLA dates are visible from the source row. Resolve, close, cancel, reopen, and escalation require a user confirmation in the client; database constraints and authorization remain authoritative.
5. Public replies and role-authorized internal notes are inserted into `ticket_conversation_messages`, where its existing policies decide whether the operation is allowed. The database trigger records a minimal `audit_events` entry for message changes without copying the message body.
6. Ticket insert/update/delete audit records retain the operation, changed field names, safe before/after metadata, request ID, tenant/organization, actor, and ticket reference. Ticket descriptions, message bodies, and resolution-summary contents are not copied into the event payload.

## Migration and deployment

Apply `supabase/migrations/20261111110000_ticket_workflow_rpcs.sql` only after the existing deployed ticket foundation and the prior ticket audit/SLA migrations are present. The repository currently contains the lifecycle extension and seed script but not a reproducible base migration for every deployed table/type/policy; do not treat this extension as a clean-database bootstrap.

The migration adds invoker-safe functions and trigger-only audit coverage. It intentionally does not add blanket `authenticated` policies or service-role access to browser code. A user-facing action can therefore return a permission error until the real organization/role policies authorize it; the UI surfaces that error instead of fabricating a successful change.

## Validation still required

- Apply the migration to the test Supabase project after confirming its current schema matches the columns and enums used here.
- Run authenticated smoke tests as a requester, technician, manager, and a user in a different tenant: create, list, assign, transition, add requester-visible reply, attempt a protected internal note, and read audit history.
- Verify direct RPC calls cannot cross organization or tenant scope and that the first-response/SLA triggers remain intact.
- Capture the GitHub Actions result after the direct-to-main commit. No migration is applied to a live Supabase database by this code-only change.

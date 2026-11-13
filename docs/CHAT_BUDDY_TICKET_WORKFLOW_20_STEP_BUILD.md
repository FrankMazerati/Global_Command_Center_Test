# Chat Buddy + Full Ticket Workflow — 20-Step Build Plan

**Target for tonight:** complete and validate steps 1–10 (approximately 50% of this scoped build).  
**Working branch:** `work/help-buddy-completion-2026-11-12`  
**Safety:** keep all work on this branch; do not merge to `main` or deploy production without explicit approval.

Status legend: **Done** = implemented and verified; **In progress** = partial implementation exists; **Blocked** = requires a backend/schema change or external configuration; **Planned** = not yet implemented.

## Tonight: foundation and first working slice (steps 1–10)

1. **Branch and baseline audit — Done.** Confirm branch ancestry, working tree history, existing UI, database objects, and security boundaries.
2. **Ticket schema and lifecycle inventory — Done.** Confirm ticket statuses, priorities, lifecycle events, assignment, escalation, approvals, conversations, attachments, and audit structures.
3. **Ticket creation RPC contract — Done (code change; runtime test pending).** Change the frontend from the nonexistent `create_portal_ticket` RPC to the existing authenticated `create_ticket` function and its actual parameter names.
4. **Status vocabulary alignment — Done (code change; runtime test pending).** Include the database's `offered` status in the UI workflow and labels.
5. **Conversation write contract — Done (code change; runtime test pending).** Include the required conversation `channel` and map requester-visible messages to database `customer` visibility.
6. **Ticket list and queue views — In progress.** Review requester, assigned, team, history, and command queue filters against tenant and organization scope.
7. **Ticket creation form — In progress.** Verify field validation, priority/category handling, authenticated requester context, duplicate-submit prevention, and post-create navigation.
8. **Active ticket workspace — In progress.** Verify selected-ticket context, assignment display, editable details, responsive layout, and refresh behavior.
9. **Atomic ticket acceptance — Existing backend function; frontend integration/role test pending.** Wire the accept action to `accept_ticket`; verify only an authorized worker can claim an eligible unassigned ticket and that concurrent claims cannot both win.
10. **End-to-end first-slice verification — Planned.** Run create → list → open → accept → conversation → refresh, including role and tenant-boundary checks. Do not call the first 50% complete until this passes.

## Next: complete the lifecycle and Chat Buddy orchestration (steps 11–20)

11. **Authorized transition API — Blocked on Lovable backend work.** Add a single server-enforced transition function for technician and manager actions; do not replace it with direct browser updates.
12. **Assignment and reassignment.** Validate active assignees within the same organization/tenant, preserve previous assignment, record actor/reason, and notify affected parties.
13. **Priority and SLA behavior.** Change priority through an authorized path, recalculate applicable SLA clocks, and expose due/breach indicators.
14. **Waiting and resume states.** Distinguish waiting on requester from waiting on an internal team, store the reason, pause/resume the correct SLA clocks, and retain history.
15. **Resolution and closure.** Require a resolution summary, record resolver/time, validate outstanding work, and separate resolved from closed.
16. **Reopen workflow.** Permit only allowed reopen paths, require a reason, restore active work, and retain the prior resolution as history.
17. **Escalation L1/L2/L3.** Record escalation level, reason, receiving team/assignee, acknowledgment, due time, and escalation history.
18. **Conversation and comments.** Enforce requester-visible versus internal notes server-side, require channel/visibility consistency, and prevent unauthorized disclosure.
19. **Ticket history and attachments.** Combine lifecycle and audit events into a readable timeline; secure attachment storage, metadata, visibility, and scan state.
20. **Chat Buddy orchestration and acceptance tests.** Let Chat Buddy create a ticket with confirmation, summarize current status, suggest next actions, prepare reassignment/escalation requests, and report outcomes only after server confirmation. Add end-to-end tests for requester, L1, L2, L3, manager, and administrator roles.

## Confirmed backend contract gaps

- The frontend previously called `create_portal_ticket`, `update_ticket_details`, and `apply_ticket_transition`; those RPCs were not found in the live public schema.
- The live schema includes `create_ticket`, `accept_ticket`, and `admin_update_ticket`. The latter is restricted to global administrators and is not a substitute for a technician transition API.
- `ticket_conversation_messages` requires `channel`; its accepted channel/visibility vocabulary differs from the old frontend's `public` value.
- `ticket_conversation_messages.tenant_id` is non-nullable while tickets may be organization-scoped. This needs an explicit Lovable schema/backend decision before organization-level ticket comments can be guaranteed.
- The repository's `AGENTS.md` requires database schema changes to be made through Lovable, not hand-edited migration files. Do not bypass that rule.

## Validation and release gates

- Run the repository's lint, test, and production build scripts when a runnable environment is available.
- Test each operation with the correct role and verify server-side authorization, tenant isolation, audit events, and failure states.
- Confirm Vercel preview build and GitHub checks before presenting a preview as verified.
- Keep `main` unchanged and do not merge or deploy production without explicit approval.

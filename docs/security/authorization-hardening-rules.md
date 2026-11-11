# Authorization Hardening Rules — Batch 002

## Purpose

Establish a safe authorization baseline for the Command Center without granting broad access to tables or changing existing business workflows blindly.

## Five rules

1. **No public execution of trigger-only privileged functions.** Trigger functions are invoked by PostgreSQL triggers and must not be exposed as RPC endpoints. Keep direct EXECUTE revoked from PUBLIC, anon, and authenticated.
2. **Default deny until an access matrix exists.** An RLS-enabled table with no policy remains closed. Do not add blanket authenticated or organization-wide policies merely to clear an advisor warning. Before opening a table, identify its data owner, tenant boundary, permitted roles, operations, and audit requirements.
3. **Authorization comes from trusted database records.** Derive access from active profile, organization membership, role assignments, scopes, start/end dates, and approvals. Never authorize from user-editable Auth user metadata.
4. **Privileged RPCs must enforce the caller and scope.** Every SECURITY DEFINER function exposed to authenticated users must check the caller identity, active membership, organization/tenant scope, allowed operation, and safe search_path. Keep internal functions out of exposed schemas or revoke client execution.
5. **Sensitive changes require approval, expiry, and audit.** Access grants and privileged actions must record requester, approver, scope, reason, start/end time, revocation, and an auditable event. Enforce these conditions server-side, not only in the UI.

## Verified baseline — 2026-11-11

- The inspected exposed/application schemas (public, dispatch, intellisync) have RLS enabled on their ordinary tables.
- Supabase Advisor reported 54 RLS-enabled tables without policies. Inspection showed those tables currently grant neither anon nor authenticated table privileges. They are therefore closed to browser roles; this is a default-deny posture, not permission to add blanket policies. Each table must be classified before any user-facing access is added.
- Two trigger-only SECURITY DEFINER functions were exposed to client roles: public.initialize_ticket_sla() and public.record_ticket_first_response(). Direct execution has now been revoked from PUBLIC, anon, and authenticated. Their PostgreSQL triggers remain installed:
  - tickets_initialize_sla on tickets
  - ticket_message_record_first_response on ticket_conversation_messages
- Verification confirmed both functions are no longer executable by anon or authenticated, while both triggers remain present.
- Nine other SECURITY DEFINER functions remain executable by authenticated users. Several are intentional caller-scoped policy helpers or privileged RPCs. They require individual source review and authorization tests; do not revoke them indiscriminately because existing RLS policies may depend on them.
- Supabase Auth leaked-password protection is currently disabled and remains a configuration follow-up.

## Next implementation order

1. Build a table-by-table access matrix for the 54 closed tables, grouped by product domain.
2. Review each authenticated SECURITY DEFINER function and its policy dependencies.
3. Test cross-organization and cross-tenant read/write denial, including URL/RPC direct calls.
4. Test manager/resource-owner approval, time-bounded grants, expiry, and revocation.
5. Add automated database authorization tests and make them required in the main-branch workflow.

## Guardrails

- Do not invent or seed demonstration identities, connection records, or health states.
- Do not weaken RLS to make a UI page render.
- Do not use user-editable metadata as an authorization source.
- Do not expose service-role or secret keys to browser code.
- Preserve existing audit history and business logic; prefer additive, backward-compatible migrations.

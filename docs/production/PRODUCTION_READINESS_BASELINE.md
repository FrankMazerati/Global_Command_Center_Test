# Global Command Center — Production Readiness Baseline

**Repository:** `FrankMazerati/Global_Command_Center_Test`  
**Working branch:** `work/production-readiness-baseline`  
**Baseline commit:** `926d7fc38e0fb5c2a3c2eb43f0eeb4e36dd366e4`  
**Status:** Engineering baseline; not a production certification.

## Scope

This baseline organizes the work required to make the existing TanStack Start / React / Vite application production-ready. It does not assert that the application, Supabase policies, role assignments, or external integrations have passed validation merely because source files exist.

## Existing repository signals

- The repository contains a React 19, TanStack Start, Vite, TypeScript application.
- Existing scripts include build, lint, and Vitest test commands.
- Existing authenticated home, login, navigation, workspace, ticket, and Supabase client surfaces are present.
- Supabase migrations and synthetic company-history seed files are present.
- The company-history seed is explicitly labelled `company_history_seed_v1`; its generated rows must not be represented as audited real-world company financial history.
- Existing navigation is centralized in `src/lib/nav.ts`. Keep it the single navigation taxonomy; do not create a competing menu registry.

## Release gates

A release is not production-ready until all applicable gates are evidenced:

1. **Build and static quality**
   - Install from the committed lockfile using the repository's documented package manager.
   - Run TypeScript/build, lint, and all tests.
   - Resolve blocking failures; document non-blocking formatting drift separately.
   - Verify the production build output and Vercel output-directory configuration agree.

2. **Authentication and session lifecycle**
   - Sign-in, sign-out, password reset, session refresh, expired session, and unauthorized deep-link behavior work.
   - No demo mode or client-side role selector grants privileged access.
   - No service-role key or provider secret is shipped to the browser.

3. **Authorization**
   - Every page, data query, RPC, storage operation, search, export, and object lookup is protected server-side.
   - UI hiding is presentation only and is never treated as an authorization boundary.
   - Organization and tenant scope are derived from trusted authenticated membership, not browser-supplied IDs or editable user metadata.
   - UPDATE policies validate both existing-row visibility and the proposed new row.
   - Cross-tenant negative tests are mandatory.

4. **Directory and workforce**
   - Employee directory, user profiles, devices, departments, groups, memberships, role assignments, and access requests use the existing canonical identity model.
   - Avoid duplicate directory tables or shadow profile records.
   - Group membership and role assignment changes are audited and approval-gated where policy requires.

5. **Executive workspaces**
   - CEO, CFO, CIO, and CTO workspaces are separate role-aware experiences backed by scoped data contracts.
   - Executive titles do not implicitly grant Global Admin / Super Admin permissions.
   - Delegated access is explicit, time-bounded, revocable, and audited.

6. **Financial and company history**
   - Financial records retain source, period, currency, accounting basis, status, and lineage.
   - Distinguish actual sourced records, user-provided records, synthetic demo data, estimates, and unavailable data.
   - Never allocate organization-wide synthetic totals to Meta or another named company.
   - Reconcile sales, line items, invoices, payments, credits, refunds, subscriptions, add-ons, and general-ledger totals before reporting them as complete.

7. **Operational readiness**
   - Error, empty, loading, stale-data, permission-denied, and integration-not-configured states are visible and truthful.
   - High-impact changes have confirmation, audit, rollback or compensating-action guidance.
   - Monitoring covers authentication failures, authorization denials, API errors, job failures, and deployment health.

## Help Desk role validation targets

See [ROLE_PERMISSION_VALIDATION_MATRIX.md](../security/ROLE_PERMISSION_VALIDATION_MATRIX.md). The matrix is a target policy and test specification, not a claim that current database assignments already match it.

| Persona | Required positive test | Required negative test |
|---|---|---|
| Help Desk L1 | Read assigned tickets; update permitted fields; reply; escalate | Cannot reassign queue broadly, grant roles, inspect HR/finance, or access another tenant |
| Help Desk L2 | L2 queue and advanced diagnostics within assigned scope | Cannot administer identity, tenant membership, payroll, or global security |
| Help Desk L3 | Advanced technical remediation under change control | Cannot bypass approval, change privileged roles, or inspect unrelated employee records |
| Help Desk Lead | Team queue, quality review, coaching, escalations | Cannot grant tenant/global administrator privileges by virtue of lead status |
| Service Desk Manager | Scoped staffing, SLA oversight, reports, queue operations | Cannot access unrelated tenant records or unrestricted HR/finance/security evidence |

## Current implementation sequence

- [ ] Verify current branch and working tree before each change.
- [ ] Review the actual route tree, route guards, shared navigation, and workspace dispatcher.
- [ ] Implement directory page consolidation under New Active Directory → Users and Groups.
- [ ] Implement role-aware executive workspace entry points and scoped data contracts.
- [ ] Add automated role-boundary tests, including cross-tenant denials.
- [ ] Validate existing Supabase migrations and policies against the target matrix; do not apply broad grants or blanket policies.
- [ ] Verify the Meta company record and its provenance separately from synthetic IntelliStack history.
- [ ] Run build, lint, tests, and responsive QA.
- [ ] Deploy a preview from this branch and inspect logs/checks before any promotion.

## Change safety

All changes in this workstream are made on `work/production-readiness-baseline`. Do not merge into `main`, apply production migrations, or alter live authorization policies without a reviewed diff, backup/recovery plan, and successful positive and negative tests.

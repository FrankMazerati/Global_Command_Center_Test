# Platform Administration Center — Unified Implementation Sequence

**Product:** Maximus Optimus Command Center  
**Governing organization:** IntelliStack Systems, Incorporated  
**Placement:** Main hamburger → Platform Administration Center  
**Implementation branch:** `feature/platform-administration-center-sequence`  
**Status:** Approved architecture and implementation baseline; implementation and runtime validation remain in progress.

## 1. Product boundary and navigation placement

The Platform Administration Center is the single control plane for configuring, governing, securing, extending, releasing, and diagnosing the IntelliStack platform.

It is not part of **My Business Center**. My Business Center contains business operations and company-facing workspaces. The Platform Administration Center contains platform-level administration.

The main hamburger receives one top-level entry: **Platform Administration Center**. Its internal departments are managed inside that center. Do not add fourteen separate administrative top-level hamburger entries.

All menu and route additions must extend the existing single navigation source, `src/lib/nav.ts`. Do not introduce a competing navigation registry.

## 2. Fourteen administration departments

1. **Platform Studio** — module builder, feature builder, extension catalog, component lifecycle.
2. **Dashboard & Template Management** — dashboard layouts, widgets, reusable page templates, preview.
3. **Organization & Hierarchy** — global, tenant, company, business unit, department, team, location and reporting relationships.
4. **Identity & Authorization** — role catalog, permission catalog, scoped grants, access requests, approvals, expiry and revocation.
5. **Platform Configuration** — global settings, tenant/company overrides, feature flags, policy configuration.
6. **Navigation & Service Registry** — hamburger taxonomy, route/page registry, service catalog, availability and ownership.
7. **Chat Buddy Administration** — character presets, avatar/wardrobe catalog, assistant configuration, knowledge sources, conversation templates and policy.
8. **Help Center Administration** — knowledge collections, articles, troubleshooting flows, support templates and publication lifecycle.
9. **Connectivity & Integrations** — connectors, API registrations, webhooks, credentials metadata, sync status and integration health. Secrets remain in approved secret storage and are never returned to browser clients.
10. **Data & Database Administration** — schema catalog, migration inventory, data classification, retention, lineage and controlled maintenance.
11. **Workflow & Automation** — workflow templates, approval paths, escalation rules, notifications, schedules and execution history.
12. **Security, Audit & Compliance** — security policies, audit rules, evidence, compliance controls, privileged-access review and exception tracking.
13. **Release & Change Management** — change requests, release plans, environments, deployment records, rollback and compensating-action plans.
14. **Monitoring & Diagnostics** — service health, operational alerts, incidents, diagnostic reports, job failures and dependency status.

## 3. Shared administration template contract

All departments use one shared template framework. A template has:

- stable identifier, type, name, description and owner;
- scope: platform, tenant, company, department or user, as permitted;
- status: draft, in review, approved, published, deprecated or archived;
- schema/version and validated configuration payload;
- creator, editor, timestamps and change reason;
- required permissions and approval policy;
- preview/test metadata and validation results;
- publication version and rollback reference;
- audit-event references.

Every template-management screen reuses the same lifecycle: list/search → create or duplicate → edit draft → validate → preview/test → submit for approval when required → publish → inspect history → rollback or archive.

The shared UI shell provides Overview, Template Library, Configuration, Permissions, Scope & Assignment, Preview & Testing, Approval & Publishing, Version History and Audit Records. Departments may add domain-specific panels without forking the lifecycle.

## 4. Frontend architecture

- Use the existing React 19, TanStack Start, TypeScript and Vite application.
- Reuse the existing route and workspace conventions; do not create a second application shell.
- Add one Platform Administration Center landing page and fourteen internal department workspaces.
- Use a consistent administration shell with department navigation, search, breadcrumbs, scope indicator, status indicator and permission-aware actions.
- Provide responsive layouts for phone, tablet and desktop.
- Every screen must implement loading, empty, stale, unavailable, not-configured, validation-error, permission-denied and success states where applicable.
- Disabled or restricted actions explain the missing permission and provide an access-request path where policy permits.
- The UI may hide or disable actions for usability, but UI visibility is never an authorization boundary.

## 5. Backend architecture and service boundaries

Implement server-side service boundaries for:

- template catalog and lifecycle;
- configuration registry and effective configuration resolution;
- organization/tenant scope resolution;
- authorization and approval decisions;
- navigation and service registration;
- workflow execution and scheduling;
- audit-event recording;
- release/change orchestration;
- monitoring and diagnostic aggregation.

Use TanStack Start server functions/server routes for authenticated application operations and Supabase/Postgres for durable data, subject to the existing repository architecture. Use database constraints, RLS, narrowly scoped RPCs and server-side checks together. Do not expose service-role keys or integration secrets to browser code.

A request's actor, active organization, tenant membership and permissions must be derived from trusted authenticated database records. Never trust a client-supplied tenant, organization, role, permission, owner or scope identifier to expand authority.

## 6. Data model — logical entities to reconcile with the live schema

Before writing migrations, inspect the current Supabase schema, foreign keys, indexes, grants, RLS policies and existing identity model. Reuse canonical tables and avoid duplicate directory or organization models.

The logical administration domain may require the following entities, implemented only where an equivalent does not already exist:

- `admin_departments` — the fourteen internal administration workspaces and metadata;
- `admin_templates` — template identity, type, owner, scope, lifecycle state and current version;
- `admin_template_versions` — immutable versioned template payloads and validation metadata;
- `platform_configurations` — versioned configuration records and scope;
- `platform_config_overrides` — tenant/company scoped overrides where needed;
- `service_registry_entries` — service/page registration, owner, route, status and dependencies;
- `admin_change_requests` — change reason, risk, affected scope, requester and review state;
- `admin_approvals` — approver, decision, timestamp, reason and policy linkage;
- `admin_publications` — published version, environment, actor and deployment reference;
- `admin_audit_events` — append-only administrative event records;
- `admin_validation_runs` — test/validation results and artifact references.

Use existing `profiles`, `organizations`, `tenants`, `departments`, `roles`, `permissions`, role assignments and access-request structures where they already provide the correct semantics. Do not create shadow copies.

All new tables require a documented data owner, data classification, tenant boundary, permitted operations, RLS policy, grants, retention rule and negative authorization tests before they are exposed to application users. Default deny is preferred to speculative broad access.

## 7. Authorization and governance model

- **Global Admin / Super Admin:** platform-wide authority only when explicitly granted through the privileged-access process.
- **Platform Administrator:** delegated platform administration within the assigned scope and permission set.
- **Company Administrator:** authorized company-level configuration only.
- **Department Administrator:** authorized department-level configuration only.
- **Standard user:** no administrative modification rights unless separately granted.

An executive title, manager title or department membership does not imply platform-administrator authority.

Sensitive actions require policy-defined approvals, a reason, explicit scope, time bounds where appropriate, revocation/rollback path and audit event. Temporary grants record requester, subject, resource, scope, approver, start, expiry, revocation actor and reason.

Enforce authorization on page loaders, server functions, API routes, database queries, RPCs, storage, search, exports and background jobs. Include positive and negative tests for cross-tenant access, changed identifiers, direct URL access, direct RPC invocation, self-elevation and expired grants.

## 8. Department-specific starter template families

| Department | Initial reusable templates |
|---|---|
| Platform Studio | Module Builder, Feature Builder, Platform Extension |
| Dashboard & Template Management | Dashboard Builder, Layout, Widget |
| Organization & Hierarchy | Tenant, Company, Department, Team, Reporting Hierarchy |
| Identity & Authorization | Role, Permission, Access Request, Approval, Temporary Grant |
| Platform Configuration | Global Setting, Scoped Override, Feature Configuration |
| Navigation & Service Registry | Menu Item, Page, Route, Service Registration |
| Chat Buddy Administration | Character, Avatar, Wardrobe, Knowledge Source, Conversation |
| Help Center Administration | Knowledge Collection, Article, Troubleshooting, Support Response |
| Connectivity & Integrations | Connector, API, Webhook, Sync Configuration |
| Data & Database Administration | Schema Catalog, Migration, Retention, Data Classification |
| Workflow & Automation | Workflow, Approval Flow, Escalation, Notification |
| Security, Audit & Compliance | Security Policy, Audit Rule, Evidence, Compliance Control |
| Release & Change Management | Change Request, Release Plan, Deployment, Rollback |
| Monitoring & Diagnostics | Health Check, Alert, Incident, Diagnostic Report |

## 9. Unified implementation sequence and gates

### Gate 0 — Repository and architecture inventory
- Confirm the active repository, branch and current application conventions.
- Inspect navigation, route tree, components, Supabase migrations, generated types, test setup and deployment configuration.
- Map existing identity, organization, authorization, audit and approval tables.
- Identify existing functionality to reuse; do not duplicate it.

### Gate 1 — Shared foundation
- Define shared types and schemas for administration departments, template metadata, scope, lifecycle and validation.
- Implement the common administration shell and reusable template lifecycle components.
- Define server-side service interfaces and error contracts.
- Add unit tests for schema validation, lifecycle transitions and scope resolution.

### Gate 2 — Authorization and audit foundation
- Map administration capabilities to existing role/permission records.
- Add narrowly scoped database changes only after schema inventory and migration review.
- Implement server-side guards and append-only audit recording.
- Add positive, negative, cross-tenant, direct-route and direct-RPC tests.

### Gate 3 — Center navigation and department registry
- Add one Platform Administration Center entry to the existing navigation taxonomy.
- Register the fourteen internal departments and their routes in the existing route convention.
- Verify no duplicate top-level administration entries and no dead links.

### Gate 4 — Shared template management experience
- Implement template library, editor, validation, preview, approval, publication, version history and rollback interfaces.
- Connect screens to authorized server operations; do not ship fake live controls.
- Mark unavailable integrations and unconfigured services truthfully.

### Gate 5 — Department workspaces
- Implement the fourteen department workspaces using the shared shell and template contract.
- Add department-specific fields, actions, policy checks and validation.
- Keep the same common lifecycle and audit model.

### Gate 6 — Integration and end-to-end validation
- Validate global, tenant, company, department and user scope boundaries.
- Validate approvals, expiry, revocation, publishing and rollback.
- Test all navigation destinations, responsive layouts and operational states.
- Confirm no existing Business Center, directory, Help Desk, Chat Buddy or executive workspace behavior regresses.

### Gate 7 — Release readiness
- Run install from lockfile, TypeScript/build, lint and full tests.
- Review database migrations and RLS policies.
- Confirm Vercel framework/build/output settings match actual build output.
- Inspect GitHub Actions and Vercel preview checks; fix failures before requesting merge.
- Keep preview separate from production certification. Do not apply production migrations or promote production without explicit review and authorization.

## 10. Definition of done

The sequence is complete only when:

1. One Platform Administration Center entry exists in the main hamburger and is not nested under My Business Center.
2. All fourteen internal departments resolve to working routes.
3. All departments use the same reusable template lifecycle and shared authorization foundation.
4. Every displayed action is implemented or clearly marked unavailable/not configured.
5. Backend authorization protects all data and mutations independently of the UI.
6. Tenant/company/department scope cannot be expanded through client input.
7. Sensitive changes are approval-gated and audited as policy requires.
8. Version history, publication and rollback are tested.
9. Loading, empty, error, denied and unavailable states are present.
10. Build, lint, tests, migration review and preview deployment checks have evidence recorded.

## 11. Non-goals and safety boundaries

- Do not place platform configuration under My Business Center.
- Do not create a separate hamburger entry for each department.
- Do not create duplicate identity, employee directory, tenant or organization models.
- Do not expose secrets, service-role credentials or unrestricted database administration to the browser.
- Do not weaken RLS to make a screen appear functional.
- Do not invent live integration status, seeded production identities or completed validation.
- Do not deploy database changes to production as part of an unreviewed feature branch.
- Do not treat a successful preview build as production certification.


## 12. Implementation progress — 2026-11-12

### Completed on `feature/platform-administration-center-sequence`

- Created the unified Platform Administration Center implementation baseline.
- Linked the baseline from the repository README.
- Replaced the former standalone IntelliStack Configuration Center menu section with **Platform Administration Center**.
- Positioned Platform Administration Center immediately after My Business Center as its own top-level area, not nested inside business operations.
- Registered fourteen internal department groups, each with six shared workspace destinations: Overview, Template Library, Configuration, Permissions & Scope, Testing & Publishing, and Version History & Audit.
- Added a shared responsive frontend workspace shell with a fourteen-department overview and department-level lifecycle panels.
- Connected the dynamic workspace route to that shell.
- Updated the footer's Service Status destination.
- Added a compatibility mapping for the former Configuration Center route so existing bookmarked links can resolve to the new center.

### Explicitly not completed yet

- No database migrations or RLS policies have been added.
- No live template persistence, approval mutation, publication, rollback or administrative write API is connected.
- The new department pages truthfully identify their backend as not connected; they are frontend foundation screens, not production-ready administration tools.
- No local install, lint, TypeScript, unit-test or production build was run from this GitHub editing session.
- No Vercel preview deployment was initiated and no production deployment or merge was performed.

### Next implementation checkpoint

Inventory the existing Supabase schema, migrations, role/permission records, organization/tenant model, audit tables, and current RLS policies. Produce a reuse-versus-gap matrix before proposing any migration. Only then implement the shared server-side authorization and audit foundation, with negative cross-tenant tests before connecting administrative mutations.

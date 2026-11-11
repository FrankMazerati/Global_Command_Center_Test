# IntelliSphere Business Suite — Next Five Product Foundations

**Status:** Architecture and implementation scope started; these five products are not yet activated in the application.  
**Exclusions:** IntelliPay and IntelliTax are explicitly outside this batch.  
**Design rule:** Do not create placeholder dashboards, sample counts, fabricated activity, or buttons without real actions. Each product must earn its operational status through real records, permissions, tests, and an audited workflow.

## Shared product contract

All five products use the same IntelliStack foundation:

- Supabase Auth identity and active organization/tenant context.
- Server-enforced row-level security; never trust client-supplied organization or tenant IDs.
- Private file storage and signed, short-lived download links where documents are needed.
- Search limited to records the caller is authorized to read.
- Record-level drilldowns, pagination, and accurate counts.
- Audit events for material state changes.
- Explicit lifecycle states: planned, in development, connected, operational, unavailable.
- No live integration claims until credentials, scopes, sync behavior, and failure handling have been verified.

## 1. IntelliProjects

**Purpose:** Project portfolio and delivery management.

First operational slice:
- Create projects with owner, sponsor, department, dates, priority, and status.
- Add workstreams, milestones, tasks, dependencies, and accountable owners.
- Track blockers, risks, decisions, approvals, and change history.
- Show project health only from defined, query-backed rules.
- Connect approved tasks to the existing workflow execution engine without duplicating workflow state.

Required domain model:
- projects, project_members, project_workstreams, project_milestones, project_tasks, project_dependencies, project_risks, project_decisions.
- Organization and tenant ownership on every tenant-scoped record.
- Explicit access policy for project membership, managers, and authorized administrators.

Acceptance checks:
- A user outside a project cannot search, open, update, or infer its records.
- Project rollups reconcile with their underlying tasks and milestones.
- Dependency cycles are rejected or surfaced as validation errors.
- Every status transition records actor, time, and reason.

## 2. IntelliAnalytics

**Purpose:** Governed reporting and business intelligence across authorized platform data.

First operational slice:
- A metric catalog with name, definition, owner, source, refresh time, and calculation version.
- Saved reports and dashboard layouts.
- Filters, date ranges, drilldowns, and export of authorized records.
- Source provenance and visible freshness/availability labels.
- No manually typed dashboard numbers presented as live metrics.

Required domain model:
- analytics_metric_definitions, analytics_report_definitions, analytics_report_runs, analytics_dashboard_layouts, analytics_saved_views.
- Query execution through approved views or server-side functions with caller authorization.
- Views must preserve RLS (for example, security-invoker views where supported).

Acceptance checks:
- Every displayed count matches its detail query under the same filters and permissions.
- Exported rows are limited to the same authorized result set.
- Metrics display source, calculation version, and last successful refresh.
- Missing or stale sources show unavailable/stale states, never invented values.

## 3. IntelliCRM

**Purpose:** Customer and relationship management for business development and account teams.

First operational slice:
- Accounts and customer organizations.
- Contacts and role/relationship mapping.
- Opportunities, stages, value estimates, expected close dates, and owners.
- Activities, follow-ups, notes, and relationship history.
- Pipeline views based on actual opportunity records.

Required domain model:
- crm_accounts, crm_contacts, crm_opportunities, crm_activities, crm_relationships.
- Keep CRM customer records distinct from marketplace billing/customer subscription records unless a reviewed canonical relationship is established.
- Record ownership, organization scope, tenant scope, and permitted team sharing.

Acceptance checks:
- Users can only access accounts and opportunities within their assigned scope.
- Pipeline totals reconcile with opportunity records and stage filters.
- Changes to ownership, stage, or value are audited.
- Duplicate account/contact handling is explicit and reviewable.

## 4. IntelliContracts

**Purpose:** Contract intake, lifecycle, review, approvals, and renewal management.

First operational slice:
- Contract intake and metadata.
- Parties, contract type, effective date, expiration, renewal notice, and owner.
- Versioned document attachments in private storage.
- Review comments, approval gates, obligations, and renewal reminders.
- Legal sign-off states that cannot be bypassed by AI or ordinary users.

Required domain model:
- contracts, contract_parties, contract_versions, contract_reviews, contract_approvals, contract_obligations, contract_events.
- Private storage paths and record metadata must share the same organization/tenant authorization.
- Version history is append-oriented; approved versions remain immutable.

Acceptance checks:
- Only authorized parties can read contract documents.
- Approval decisions capture actor, role, timestamp, and decision.
- Replacing an attachment never destroys the previous approved version.
- Renewal dates and notice windows derive from saved contract terms.

## 5. IntelliLearning

**Purpose:** Employee and contractor learning, development, and certification tracking.

First operational slice:
- Course and learning-path catalog.
- Enrollment, assigned learning, due dates, and progress.
- Lessons, knowledge checks, assessments, and completion.
- Certification records, expiry, and manager visibility.
- Link completed learning to approved skills and workforce progression records.

Required domain model:
- learning_courses, learning_paths, learning_path_courses, learning_enrollments, learning_lesson_progress, learning_assessments, learning_assessment_attempts, learning_certifications.
- Reuse existing skills and recognition records only through explicit foreign keys and reviewed lifecycle rules; do not duplicate XP or badge ledgers.

Acceptance checks:
- Learners can see their own assignments and permitted team progress.
- Managers see only authorized direct/indirect reports under the configured scope.
- Completion requires the defined assessment or learning criteria.
- Certification expiry and renewal status are derived from actual dates and evidence.

## Implementation order

1. IntelliProjects — establishes a reusable work hierarchy and project/task relationships.
2. IntelliCRM — establishes account and opportunity workflows.
3. IntelliContracts — adds controlled document lifecycle and approval patterns.
4. IntelliLearning — adds assignments and progress with careful reuse of workforce records.
5. IntelliAnalytics — follows once the first four have stable, auditable records and meaningful source data.

## Release gate

A product is not marked operational until:
- its schema and migrations are committed and applied in order;
- RLS policies and storage access are tested with allowed and denied users;
- CRUD, validation, pagination, and error states are tested;
- no dead controls or fabricated sample activity remain;
- the production build, tests, and deployment workflow pass;
- the product registry accurately describes what is live and what remains unavailable.

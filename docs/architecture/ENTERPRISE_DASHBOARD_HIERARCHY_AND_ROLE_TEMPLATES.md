# Enterprise Operations Dashboards & Management-Hierarchy Templates

**Product:** Maximus Optimus Command Center  
**Company:** IntelliStack Systems, Incorporated  
**Status:** Planning foundation / implementation contract  
**Security principle:** Make the security process smarter.

## 1. The three operational dashboard levels

IntelliStack has three distinct operational dashboards. They share a platform and design system, but each has a different management scope, data aggregation boundary, operating workflow, and entitlement.

| Dashboard | Scope | Primary product tier | Primary purpose |
|---|---|---|---|
| **Global Operations Dashboard** | Entire contracted enterprise: companies, subsidiaries, business units, regions and covered locations | Enterprise | Enterprise-wide command, governance, strategic oversight and consolidated operations |
| **Regional Operations Dashboard** | Only the regions and locations assigned to the manager, within the contracted subscription scope | Professional; Enterprise may also include it | Regional coordination, comparison, resource balancing and escalation |
| **Location Operations Dashboard** | One activated location, with permitted departments, teams and employees | Essential; included in higher tiers for covered locations | Daily business execution, service delivery, workforce and local control |

These are not three names for the same screen. The dashboard level changes the available data aggregation, actions, workflow, reporting and permitted scope.

### 1.1 Global Operations Dashboard

The global dashboard is the executive and enterprise operations control plane. It can aggregate:
- Company, subsidiary and business-unit health.
- Regional and location performance.
- Enterprise workforce and organizational health.
- Consolidated financial and operational measures where authorized integrations and data are available.
- Service Desk, SLA, incident, NOC and SOC posture.
- Security, identity, access, compliance, audit and policy status.
- Enterprise projects, strategic initiatives, critical events and major risks.
- Subscription coverage, location activation, entitlement status and usage.
- Cross-enterprise work requiring executive coordination.

It must support drill-down from enterprise → company/business unit → region → location → department → team → work item, but each drill-down rechecks authorization. Seeing an aggregate does not automatically grant access to underlying employee records, sensitive tickets, financial transactions or security investigations.

### 1.2 Regional Operations Dashboard

A regional dashboard shows only the locations and regions assigned to the logged-in manager and covered by the customer's active subscription.

Example: a company has 50 Chicago-area locations, but a regional manager is responsible for eight locations on Chicago's West Side. Their regional dashboard:
- Aggregates the eight assigned locations only.
- Shows the region's service levels, open work, workforce coverage, device and infrastructure health, incidents, risks and operating performance.
- Compares the eight locations against one another and against approved regional targets.
- Identifies workload imbalances and proposes resource transfers or cross-location support.
- Supports region-level approvals and escalations only where the user's role permits.
- Does not expose the other 42 locations' identifiable operational records.
- Does not become a global dashboard merely because the user can see a regional total.

A regional manager may be assigned a city, a portion of a city, a named region, a group of non-contiguous locations, or several regions. Assignment is based on explicit location membership and scope grants—not assumptions from a job title or postal code.

### 1.3 Location Operations Dashboard

A location dashboard represents the day-to-day operating picture of one activated location:
- Local workforce, departments, teams and staffing.
- Local service desk, tickets, SLA and customer-impacting work.
- Local devices, endpoints, network and infrastructure.
- Local security posture, alerts and assigned response actions.
- Local approvals, policies, risks and audit events.
- Local projects, tasks, schedules, communications and announcements.
- Location budget and financial summaries only for authorized finance roles.
- Local performance measures and manager action lists.

The location dashboard does not reveal other locations' detailed records. A location executive may have a local CEO/CFO/COO template without inheriting company-wide authority.

## 2. The template model: dashboard level × management role × authorized scope

Every dashboard view is determined by three independent dimensions:

1. **Dashboard level:** Global, Regional or Location.
2. **Role template:** CEO, CFO, CIO, COO, CISO, department leader, specialist, etc.
3. **Authorized scope:** the exact company, region, locations, departments, teams and records the user may access.

For example:
- A CEO at a single location receives the Location CEO template.
- A regional COO receives the Regional COO template for their assigned locations.
- The enterprise CEO receives the Global CEO template for the contracted enterprise.
- A regional CFO receives the Regional CFO template only for the region they manage.
- A person who is both CIO and CISO can switch between those authorized work templates without gaining additional permissions.

A template is a presentation and workflow configuration, not an access grant. Switching templates must never elevate privileges, change role assignments, bypass RLS, or reveal data outside the user's current scope.

## 3. Executive role template catalog

Each executive template exists at the levels where the organization has appointed that role. The metrics and actions adapt to the selected scope.

| Role template | Primary dashboard focus | Typical governed actions |
|---|---|---|
| **CEO — Chief Executive Officer** | Strategy, company health, revenue, growth, risks, customer outcomes, workforce and executive decisions | Approve strategic decisions within delegated authority; assign executive owners; review major risks |
| **CFO — Chief Financial Officer** | Revenue, expenses, budgets, forecasts, cash position, financial controls, procurement and location cost performance | Approve budgets and financial commitments within delegated limits; review variance and forecasts |
| **COO — Chief Operating Officer** | Service delivery, location performance, capacity, workforce coverage, process efficiency, SLA and operational risks | Rebalance resources, assign operational owners, approve operational changes within scope |
| **CIO — Chief Information Officer** | IT strategy, application portfolio, technology spend, service health, architecture, integrations and technology risk | Govern IT priorities, approve technology changes and investments within authority |
| **CTO — Chief Technology Officer** | Engineering, platform architecture, product technology, reliability, technical debt, delivery and innovation | Prioritize technical initiatives and approve architecture decisions within authority |
| **CISO — Chief Information Security Officer** | Enterprise security posture, identity, vulnerabilities, incidents, privileged access, controls and risk | Coordinate incident response, approve security exceptions within policy, oversee remediation |
| **CHRO — Chief Human Resources Officer** | Workforce capacity, hiring, retention, employee experience, learning, compensation summaries and HR risk | Approve HR programs and workforce actions within delegated authority; sensitive employee records remain restricted |
| **CMO — Chief Marketing Officer** | Pipeline contribution, campaign performance, brand, demand generation, market segments and marketing spend | Approve campaigns and marketing allocations within delegated authority |
| **CRO — Chief Revenue Officer** | Sales pipeline, bookings, retention, customer success, renewals, forecast and revenue performance | Coordinate sales and customer-success priorities; approve commercial actions within delegated limits |
| **CPO — Chief Product Officer** | Product roadmap, adoption, customer feedback, product quality, release health and portfolio priorities | Prioritize roadmap and product decisions within governance |
| **Chief Legal Officer / General Counsel** | Legal matters, contract obligations, litigation exposure, regulatory matters, legal holds and policy exceptions | Review/approve legal matters under legal privilege and delegated authority |
| **Chief Compliance Officer** | Regulatory obligations, control testing, policy adherence, audit findings, remediation and evidence | Assign remediation, review control exceptions, attest to compliance evidence |
| **Chief Data / AI Officer** | Data quality, analytics, AI inventory, model governance, usage, risk, lineage and data stewardship | Approve governed data/AI use cases and model lifecycle actions within policy |
| **Chief Customer Officer** | Customer experience, support quality, churn signals, escalations, adoption and customer outcomes | Coordinate customer recovery and service improvement within authority |
| **Executive Assistant / Chief of Staff** | Executive calendar, briefings, action registers, meeting preparation, decision follow-up and delegated tasks | Prepare and track work; execute only explicitly delegated actions, never inherit executive authority |

The CEO, CFO, CIO and COO are core templates. Other executive templates are available according to the customer's organization design and licensed product capabilities.

## 4. Department and operational role templates

The catalog also supports non-C-suite managers and specialist teams. Templates are scope-aware and can be combined when a person has multiple assigned roles.

| Role / template | Dashboard content |
|---|---|
| Regional Manager | Assigned region's locations, comparative performance, staffing, service levels, incidents and action queue |
| Location / Site Manager | One location's people, service, schedules, devices, local risks and daily execution |
| Department Manager | Department goals, headcount, workload, approvals, service metrics and team performance |
| Finance Manager / Controller | Budget, general ledger summaries, reconciliation, AP/AR, close status and control exceptions |
| HR Manager | Staffing, onboarding, employee cases and workforce processes within HR privacy boundaries |
| IT Director / IT Manager | IT service portfolio, endpoint/network health, incidents, changes, access requests and IT staffing |
| Help Desk Manager | Queue health, SLA, assignment, escalations, technician capacity, aging and quality |
| Help Desk L1 | Assigned queue, approved knowledge, ticket intake, triage and permitted standard actions |
| Help Desk L2 | Assigned escalations, diagnostics and elevated task access only when separately authorized |
| Help Desk L3 | Complex technical cases, engineering/vendor coordination and privileged tasks only through approved access |
| IT Administrator | Authorized identity, device, endpoint, platform and configuration operations; privileged actions remain JIT-gated |
| NOC Manager / NOC Analyst | Network availability, infrastructure, monitoring, incidents, changes and restoration coordination |
| SOC Manager / SOC Analyst | Security alerts, cases, threat investigations, containment requests and incident response |
| Governance Manager | Policies, controls, evidence, exceptions, audit findings, remediation and attestations |
| Auditor | Read-only evidence and audit trails within explicitly approved scope |
| Compliance Manager | Regulatory obligations, control mapping, evidence collection, remediation and reporting |
| Sales Manager / Sales Representative | Pipeline, accounts, opportunities, activity and forecast within assigned territory |
| Customer Support Manager / Agent | Customer cases, response/resolution, customer health and escalations |
| Product Manager | Roadmap, requirements, delivery, adoption, defects and product metrics |
| Project / Program Manager | Portfolio, milestones, dependencies, risks, budget, resources and delivery health |
| Engineering Manager / Engineer | Team delivery, code/release health, technical incidents and assigned engineering work |
| Data / AI Manager / Analyst | Data products, quality, lineage, AI workloads, model evaluations and governance constraints |
| Operations / Facilities Manager | Sites, assets, maintenance, schedules, vendors, safety and facility incidents |
| Employee | Personal tasks, assigned tickets, schedule, communications, learning and personal work queue |

Templates for L1/L2/L3 must reflect the actual assigned role and approved capabilities. A template must never grant domain administrator, global administrator, or other permanent privilege merely because the user selected an advanced technical view.

## 5. Dashboard template capabilities and personalization

Each template can define:
- KPI cards and thresholds.
- Charts, tables, trend lines and comparisons.
- Priority and exception queues.
- Daily briefing and executive talking points.
- Worklists, approvals, decisions and follow-up actions.
- Drill-down paths.
- Default filters and saved views.
- Department-specific widgets.
- Notification preferences.
- Layout, widget visibility, ordering and density.
- Accessibility and device-responsive layout.
- Chat Buddy briefing and role-aware prompts.
- Bring the Work to You work-item composition.

Users may personalize layout and save views. Administrators may publish approved role templates. Users may load another role's template only if they are authorized to use that template's data scope. Loading a template does not add that role to their profile or grant its permissions.

## 6. Scope assignment and enforcement

Scope is assigned explicitly, not inferred from a title, location name, geography, or UI filter.

Scope dimensions:
- Tenant / customer boundary.
- Company and subsidiary.
- Business unit.
- Region.
- One or more locations.
- Department and team.
- Individual resource or record.
- Time-bound delegation where appropriate.

A user may have several disjoint assignments—for example, eight West Side Chicago locations—without receiving access to all Chicago locations. A regional manager can be assigned eight specific locations, a whole region, or multiple non-contiguous sites. Assignment changes are auditable and take effect server-side.

Every query and action must enforce:
- Tenant boundary.
- Subscription coverage and feature entitlement.
- Active membership and role.
- Resource scope.
- Action-specific permission.
- Data sensitivity and separation-of-duties constraints.

Aggregates must also respect scope. The system must not leak restricted information through totals, charts, exports, autocomplete, search results, AI summaries, notification previews, or cached dashboard responses. Sensitive small-group aggregates may require suppression or additional permission to prevent inference.

## 7. Template switching and multiple responsibilities

A person may hold more than one role. The workspace should support an authorized template switcher—for example, a CEO who is also temporarily covering CFO responsibilities, or a CIO who also holds a CISO appointment.

Rules:
- The switcher lists only roles and templates already assigned or explicitly delegated.
- Switching changes the workspace presentation and active responsibility context, not the person's underlying permissions.
- Actions are still authorized against the person's current grants and the selected responsibility context.
- Delegation has an owner, recipient, scope, start, expiry, and revocation history.
- A user cannot select an unassigned CEO/CFO/CIO template to gain access.
- A user may view a lower-level template only when permitted; a higher-level view requires both appropriate role and scope.
- Audit logs record role context and scope for sensitive actions.

## 8. Dashboard information architecture

Each level has a consistent structure while allowing role-specific widgets.

**Global**
1. Enterprise briefing and overall status.
2. Company / subsidiary / business-unit portfolio.
3. Regional and location performance.
4. Enterprise financial and business measures.
5. Workforce and organizational health.
6. Service Desk, NOC, SOC, security and critical incidents.
7. Governance, audit, risk and compliance.
8. Strategic initiatives, executive decisions and major dependencies.
9. Subscription coverage, licensing and entitlements.
10. Enterprise-wide action register and Chat Buddy briefing.

**Regional**
1. Regional briefing and health.
2. Assigned-location portfolio and comparison.
3. Service performance and ticket workload.
4. Workforce coverage and resource capacity.
5. Devices, infrastructure and network health.
6. Security incidents and regional risk.
7. Budgets and operating costs where authorized.
8. Regional projects and initiatives.
9. Cross-location coordination and approvals.
10. Regional action register and Chat Buddy briefing.

**Location**
1. Daily location briefing and status.
2. Workforce, departments and team coverage.
3. Help Desk queue and service levels.
4. Devices, facilities and infrastructure.
5. Local security and risk.
6. Approvals and work awaiting action.
7. Local projects, schedules and announcements.
8. Financial summary for authorized roles.
9. Location goals and operating metrics.
10. Local action register and Chat Buddy briefing.

## 9. Subscription and entitlement relationship

- Essential licenses Local Operations for each activated location.
- Professional adds Regional Operations capabilities for contracted locations and explicitly assigned regional scope.
- Enterprise adds Global Operations Center for contracted enterprise scope and covered locations.
- Higher tiers may include lower-level dashboards for their covered locations, but do not bypass role-based or scope-based authorization.
- A customer can own 50 locations and activate one initially. The other 49 may appear as registered/pending locations for authorized administrators, but their paid operational features remain inactive until contracted and activated.
- A regional manager sees only the subset of active locations assigned to that manager.
- A Global Operations user sees enterprise-wide data only if the Enterprise agreement covers it and the user's role authorizes it.
- Subscription changes never automatically promote a user to an administrative role.

## 10. Implementation workstreams: the six remaining foundation items

These six items are to be completed alongside the dashboard hierarchy, in the existing feature branch.

### Workstream 1 — Regional Operations Dashboard
- Build regional dashboard scope model and template routing.
- Support one or many assigned regions and explicit location lists.
- Support location comparisons, workload balancing, staffing coverage, regional SLA, incidents and regional action queues.
- Include the role-specific regional templates from the catalog.
- Enforce assignment and tenant boundaries in server-side queries and RLS.
- Do not show all city locations merely because a manager's title includes “Regional.”

### Workstream 2 — Global Operations Center Dashboard
- Define enterprise roll-up across contracted companies, business units, regions and locations.
- Add executive and enterprise operational views.
- Support secure drill-down with independent authorization at each level.
- Include global CEO/CFO/COO/CIO/CISO and other enterprise templates.
- Keep global controls distinct from local and regional operational actions.
- Do not activate enterprise functionality for a customer without the appropriate subscription.

### Workstream 3 — Scoped regional and location assignments
- Reuse the existing organization and workforce hierarchy wherever it is canonical.
- Add or extend explicit profile-to-region/location membership and time-bound delegation as required.
- Support disjoint location groups such as eight West Side Chicago sites.
- Define who can assign, approve, revoke and audit scope.
- Test cross-tenant, cross-region, unassigned-location and revoked-membership access.
- Never rely on a client filter to enforce scope.

### Workstream 4 — Enterprise subscription-to-location administration
- Extend existing marketplace subscription and entitlement tables.
- Associate each active location with the subscription/contract that covers it.
- Support Enterprise organization-wide agreements with a defined list of covered locations and included allowances.
- Support pending, active, suspended, expired and closed location states.
- Prevent double billing when an Enterprise agreement replaces per-location subscriptions.
- Preserve historical subscription and billing records; no destructive rewrite.
- Checkout remains disabled until billing provider, contract and entitlement lifecycle are production-ready.

### Workstream 5 — Secure subscription upgrades, downgrades and billing transitions
- Define upgrade, downgrade, renewal, cancellation, suspension, reactivation and Enterprise conversion.
- Use effective dates and explicit proration policy; never silently rewrite historical invoices or price versions.
- Validate that removing a tier/module does not delete customer data.
- Gracefully restrict new use of capabilities after downgrade while preserving export, retention, legal hold and recovery paths.
- Prevent Enterprise conversion from overlapping charges; retain audit trail and old subscription history.
- Require appropriate billing authority and separation of duties.
- Add idempotency, concurrency protection and failure recovery for billing-provider events.
- No real billing mutation until provider integration and reconciliation are validated.

### Workstream 6 — IntelliAccess entitlement enforcement
- Separate base security controls from premium privileged-access orchestration.
- Base plans retain authentication, tenant isolation, RBAC, basic approvals, standard audit and manual privileged-access processes.
- Premium IntelliAccess gates JIT workflows, approval orchestration, external provisioning, privileged sessions and verified revocation automation.
- Entitlement must be checked server-side for every privileged workflow and connector operation.
- No UI-only enforcement, no self-approval by Chat Buddy, and no permanent admin rights granted by the plan.
- Keep external provisioning disabled until connector identity, secrets, scopes, allowlisted operations, MFA/step-up and revocation verification are configured and tested.

## 11. Validation and acceptance criteria

The work is not complete merely because dashboard routes or plan names render. Acceptance requires:
- A CEO, CFO, CIO, COO, CISO and other assigned role can load the matching template at each supported management level.
- A user with multiple roles can switch only among authorized templates without permission elevation.
- A regional manager assigned eight locations sees those eight, not every city location.
- A local manager cannot query regional/global records through direct API, RPC, URL, search, export, AI or cache.
- A company with one active location cannot invoke Regional or Global operations capabilities unless separately entitled.
- An Enterprise contract can cover an explicit list of locations and no others.
- Subscription changes preserve history, data, entitlements and correct billing periods.
- IntelliAccess cannot be invoked without the required module entitlement, role, approval, MFA and verified connector configuration.
- Unauthorized and cross-tenant tests pass at the database/API boundary.
- No synthetic business records are added to customer data.

## 12. Release and commercial controls

These specifications are planning and implementation contracts, not proof that every feature is production-ready. Keep checkout and customer-facing promises gated until:
- Schema migrations have been reviewed and safely applied.
- RLS and authorization tests pass.
- Billing provider behavior and reconciliation are validated.
- Location assignment and dashboard scope tests pass.
- Each feature has a truthful readiness state.
- Security review and release acceptance are complete.

**Outcome:** one coherent dashboard system in which the executive role determines the management lens, the dashboard level determines the operating horizon, and explicit scope determines exactly which locations and records the person can see and control.


## 12. Batch 008 implementation foundation

The detailed schema audit, canonical scope-assignment model, dashboard-template registry contract, RLS/write-path requirements, and acceptance tests are maintained in [Batch 008 — Organizational Intelligence & Management Scope Foundation](./BATCH_008_ORGANIZATIONAL_INTELLIGENCE_FOUNDATION.md).

The implementation must reuse the existing tenant, organization, profile, role, permission, and workforce structures. It must not create a duplicate hierarchy or role catalog. The live-schema audit found that the existing role catalog already includes the core executive roles, while explicit manager-to-location assignment is still a missing capability.

The current connected Supabase project had no isolated development branch during the audit. Accordingly, Batch 008 documentation was committed to the existing feature branch, but no production schema or customer data was changed. The additive migration and server-side assignment operations remain gated on isolated validation.


## Batch 009 implementation sequence

The completed Batch 008 management foundation is documented in [Batch 008 — Organizational Intelligence & Management Scope Foundation](./BATCH_008_ORGANIZATIONAL_INTELLIGENCE_FOUNDATION.md). The next implementation scope is [Batch 009 — Scoped Operations Intelligence & Dashboard Delivery](./BATCH_009_SCOPED_OPERATIONS_INTELLIGENCE_DASHBOARDS.md), which defines the unified server-side scope resolver, entitlement-aware role templates, and the Location, Regional and Global Operations dashboards.

# Batch 009 — Scoped Operations Intelligence & Dashboard Delivery

**Status:** Scope approved for planning; implementation not started  
**Predecessor:** Batch 008 — Organizational Intelligence & Management Scope Foundation  
**Repository workflow:** Continue on `feature/enterprise-workspace-chat-buddy-build`, existing PR #7. Do not create another branch or PR.  
**Database target:** Main Supabase project only, using reviewed additive migrations and staged verification.  
**Release rule:** Keep PR #7 draft and unmerged until implementation, regression tests, and CI are complete.

## 1. Objective

Deliver three connected operating horizons using one authorization model:

1. **Location Operations** — one or more explicitly assigned locations.
2. **Regional Operations** — one or more authorized regions and only the locations mapped to those regions and covered by the tenant's contract.
3. **Global Operations Center** — authorized enterprise-wide roll-up across covered companies, regions and locations.

The management role determines the responsibility and dashboard template. The management scope determines which organizations, locations and records are visible. The subscription determines which operating horizon and advanced capabilities are enabled. None of these alone grants access.

## 2. Required authorization decision

Every dashboard read, drill-down and action must be authorized server-side using all of the following:

- Authenticated active profile from `auth.uid()`.
- Verified `workforce_profile_identity_links` record.
- Active workforce person and active employment status.
- Approved, active, authorization-enabled management assignment.
- Assignment start/end dates and revocation state.
- Active management role from `governance_management_role_catalog`.
- Existing role and action permissions from the canonical role/permission model.
- Explicit location membership from `workforce_management_assignment_locations`, or region-to-location mapping from `governance_region_locations`.
- Tenant and organization ancestry.
- Active subscription and matching entitlement from the existing marketplace subscription/entitlement model.
- Resource sensitivity and action-specific controls.

**Fail closed:** missing identity link, assignment, role, location mapping, tenant relationship, entitlement, or permission means no access. Do not infer scope from job title, email, city, URL, UI filter, dashboard template, or organization name.

The Batch 008 management RPCs are lifecycle operations; Batch 009 must build the read-side resolver. Do not treat an RPC's successful assignment mutation as proof that a dashboard data query is authorized.

## 3. Workstream A — Canonical management-scope resolver

Implement a single, versioned server-side resolver used by dashboard APIs and all dependent surfaces.

Required behavior:
- Derive the acting profile from the authenticated session; do not accept a caller-supplied profile ID as the authority.
- Return effective roles, scope level, tenant, authorized organization IDs, authorized location IDs, entitlement keys, and effective dates.
- Support multiple concurrent assignments and disjoint location sets.
- Apply deterministic precedence when scopes overlap; never silently broaden a narrower assignment.
- Respect expiry, suspension, revocation, employment termination, and identity-link revocation immediately.
- Re-check authorization on each sensitive action; short-lived cache entries must be invalidated on assignment, role, membership, entitlement or profile changes.
- Include an authorization decision ID/correlation ID for audit and diagnostics.
- Avoid returning sensitive employee or customer records from the resolver; return only the minimum scope claims needed by trusted server-side data services.

The resolver must be callable only from trusted server-side execution or through an authenticated RPC that returns only the caller's own effective scope. It must not become a cross-tenant enumeration endpoint.

## 4. Workstream B — Subscription entitlement integration

Reuse the existing marketplace subscriptions and `marketplace_entitlements` table; do not add a second subscription catalog.

Define and map the effective capability keys for:
- Local Operations.
- Regional Operations.
- Global Operations Center.
- Role-template capabilities where separately licensed.
- Advanced analytics/export capabilities if the product plan defines them.

Rules:
- Essential activates only contracted location operations.
- Professional activates regional operations only for the tenant's contracted coverage and authorized region/location assignments.
- Enterprise activates global operations only for the contracted organization and covered locations.
- Enterprise coverage must be explicit and auditable; an organization-wide contract must not silently include excluded subsidiaries or locations.
- Subscription entitlement never grants an employee role or overrides permissions.
- A paid tier cannot make an unassigned location visible.
- A management assignment cannot activate an unpaid feature.
- No entitlement rows or customer subscriptions are fabricated for testing.
- Checkout, billing mutations, proration and real payment-provider webhooks remain out of scope for Batch 009 unless separately authorized and fully specified.

The existing live entitlement table currently has no entitlement rows. The resolver must therefore deny unprovisioned capabilities until the entitlement lifecycle is genuinely configured; do not create test entitlements in customer data.

## 5. Workstream C — Role-template registry

Create a versioned dashboard-template registry only if the existing product registry cannot safely represent this contract. It must reference canonical role keys and scope levels rather than duplicate roles.

Templates to support:
- Location CEO, CFO, COO, CIO, CTO, CISO, CHRO and other configured executive roles.
- Regional CEO/COO/CFO/CIO and regional operational leadership where the organization has those appointments.
- Global CEO, CFO, COO, CIO, CTO, CISO, CHRO and enterprise leadership.
- Location/site manager, regional manager, department manager, audit/governance, finance, HR, IT, Help Desk, NOC, SOC, and support templates.

Template rules:
- A template controls layout, KPI selection, terminology and allowed actions presented.
- It does not grant a role, permission, subscription entitlement or data scope.
- A multi-role user can switch only among currently assigned templates.
- Delegated roles must display owner, recipient, scope, start, expiry and revocation context.
- Users may personalize layout, density, widget ordering and saved views without changing authorization.

## 6. Workstream D — Location Operations Dashboard

Deliver the location operating view with:
- Location health and daily briefing.
- Workforce and department coverage.
- Help Desk queue, SLA and aging.
- Devices, endpoint, network and facilities status.
- Local security incidents and risk.
- Approvals and actions awaiting the user's authority.
- Local projects, schedules and announcements.
- Financial summaries only for roles with financial permissions and data entitlements.
- Location action register and Chat Buddy briefing.

Support one location or an explicitly assigned set of locations. A location CEO/CFO/COO/CIO sees only the metrics and records permitted by their role, permissions and contract.

## 7. Workstream E — Regional Operations Dashboard

Deliver regional portfolio and comparative operations:
- Region health and executive briefing.
- Assigned location list, status and performance comparison.
- Service delivery, SLA, ticket and incident trends.
- Workforce coverage, capacity, scheduling and escalations.
- Device, network and infrastructure status.
- Regional security and compliance posture.
- Regional project and operating-cost summaries where authorized.
- Cross-location coordination, approvals and action register.

A regional assignment may cover a whole explicitly mapped region or a non-contiguous list of locations. A regional title or a city name must never grant every location in that geography.

## 8. Workstream F — Global Operations Center

Deliver enterprise-wide operations only for an entitled, authorized user:
- Enterprise health and executive briefing.
- Company, subsidiary and business-unit portfolio.
- Regional and location comparison.
- Enterprise service delivery, NOC, SOC, security and major incidents.
- Financial and operating performance by authorized company/location.
- Workforce and organizational health with HR privacy boundaries.
- Governance, audit, risk, compliance and remediation.
- Subscription coverage and entitlement posture.
- Strategic initiatives, executive decisions and enterprise action register.

Every drill-down must re-run authorization for the selected company, region, location and resource. Global visibility is not a bypass for sensitive HR, legal, financial, security or customer records.

## 9. Workstream G — Shared data services and side-channel protection

Build reusable server-side query services for:
- Dashboard cards and KPI aggregates.
- Tables, filters, sorting and pagination.
- Drill-down and detail pages.
- Exports and scheduled reports.
- Global search, autocomplete and saved searches.
- Notifications and notification previews.
- Chat Buddy context, AI retrieval, summaries and suggested actions.
- Cache keys, invalidation and realtime subscriptions.

Security requirements:
- Enforce scope at the database/API boundary, not in browser filtering.
- Prevent inference from restricted counts, trends, small groups, empty-result differences, timing, or aggregate changes.
- Apply field-level sensitivity for finance, HR, legal, customer, security and privileged-access data.
- Ensure exports cannot exceed the same scope as on-screen results.
- Ensure AI context and citations contain only records the current user may access.
- Never allow Chat Buddy, Maximus or Optimus to elevate the caller or approve their own access.
- Log sensitive reads/exports and all privileged writes with actor, effective role, scope and decision ID.

## 10. Workstream H — User experience and responsive delivery

Build the three dashboard experiences within the existing Command Center navigation and design system:
- Clear Global / Regional / Location context indicator.
- Visible current role and effective assignment.
- Location/region selector limited to authorized scope.
- KPI cards, comparison tables, trend charts and prioritized action queues.
- Explicit empty, pending-entitlement, expired-assignment, no-access and data-unavailable states.
- Mobile/tablet layouts with usable drill-down and filter controls.
- Saved personal views that cannot alter the underlying permission scope.

Do not show sample metrics as live customer data. If sample content is ever used in a separately labeled preview, keep it isolated from customer tenants and clearly identify it as sample.

## 11. Required negative and positive tests

At minimum:
1. Location manager assigned one site cannot read another site in the same tenant.
2. Regional manager assigned eight locations sees exactly those eight, not the remaining 42.
3. Regional assignment does not cross tenant boundaries unless an explicit authorized multi-tenant appointment and entitlement permit it.
4. Local Essential tenant cannot call Regional or Global dashboard APIs.
5. Professional tenant without a regional assignment cannot see the whole region.
6. Enterprise tenant with a contract excluding one subsidiary cannot drill into that subsidiary.
7. CEO template cannot expose CFO-only financial details without financial permission.
8. CFO template cannot expose HR-sensitive records without HR permission.
9. Expired, suspended, revoked or terminated assignments stop working immediately.
10. Revoked identity link stops all management-scope resolution.
11. Direct URL, RPC, search, export, notification, realtime, cache and AI retrieval attempts cannot bypass scope.
12. Small-group aggregates do not reveal restricted employee or customer information.
13. A user changing the template or URL cannot gain a role or entitlement.
14. Global admin and organization admin actions are audited and separation-of-duties rules are enforced.
15. All tests run without seeding fake employee, customer, subscription or activity records into production.

## 12. Delivery sequence

1. Map existing source tables and current RLS policies to the KPI/data domains; record every source and sensitivity class.
2. Implement the resolver and entitlement contract with fail-closed unit and SQL tests.
3. Add/adjust RLS policies and trusted query functions for the first location data slice.
4. Complete location dashboard and one-role/one-location end-to-end tests.
5. Extend the same query contract to regional scope and eight-of-fifty negative tests.
6. Extend to global scope with explicit contract coverage and drill-down tests.
7. Integrate search, exports, notifications, realtime and Chat Buddy/AI using the same resolver.
8. Complete responsive QA, regression suite, security/performance advisor review and CI.
9. Update product readiness and PR #7; keep draft until release criteria are met.

## 13. Out of scope

- Applying the separate staged three-tier commercial migration or activating checkout.
- Real subscription purchase, renewal, cancellation, proration or payment-provider integration.
- IntelliAccess JIT provisioning and privileged-session orchestration.
- New directory/HR/finance/security provider connections not already configured.
- Automatic population or import of real employee/location records.
- Any production customer data seeding for demonstration.
- Merging PR #7 or enabling customer-facing rollout without explicit approval.

## 14. Definition of done

Batch 009 is complete only when all three dashboards are driven by the same verified scope resolver, subscription entitlement checks and role/action permissions; the positive and negative tests above pass; data access is protected across every side channel; and the release/CI/security review is complete.

**Outcome:** one operating intelligence system with three management horizons—Location, Regional and Global—without three separate authorization systems or hidden cross-scope data access.

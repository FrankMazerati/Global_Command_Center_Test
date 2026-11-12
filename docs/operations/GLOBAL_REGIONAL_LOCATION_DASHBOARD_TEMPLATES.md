# Global, Regional & Location Operations Dashboards
## Role-based management templates, scope rules, and operating model

**Product:** Maximus Optimus Command Center  
**Company:** IntelliStack Systems, Incorporated  
**Status:** Product architecture and planning specification  
**Security principle:** Make the security process smarter.

## 1. Core decision

IntelliStack has three distinct operational dashboard levels:

1. **Global Operations Dashboard** — enterprise-wide view across all authorized companies, subsidiaries, business units, regions, and contract-covered locations.
2. **Regional Operations Dashboard** — management view across the specific region and locations assigned to that manager.
3. **Location Operations Dashboard** — day-to-day management view for one authorized location.

These are not three visual skins for the same page. Each has distinct scope, aggregation rules, workflows, management templates, and permitted actions. Dashboard level establishes operational context; role and assignments determine what appears and what a person may do.

A regional dashboard must never assume that a regional manager can see every location in a city. For example, a manager assigned to eight locations on Chicago's West Side sees those eight locations and their authorized rollups—not all Chicago locations. A different manager assigned to three North Side locations sees only those three. City is geographic context, not an authorization grant.

## 2. Organizational and authorization scope

The platform supports: **Company → Subsidiary / Business Unit → Region → Location → Department → Team → Employee**. The hierarchy is flexible; not every customer needs every level.

**Global scope:** aggregate only companies inside the authenticated tenant boundary, authorized subsidiaries/business units/regions, contract-covered locations, and records permitted by the viewer's role. Executives may see enterprise summaries without automatically seeing sensitive individual HR cases, payroll records, credentials, or confidential investigations.

**Regional scope:** the union of the manager's explicitly assigned locations, optionally grouped by region, territory, city, district, or operational cluster. The Chicago West manager's dashboard contains their eight assigned sites. A city-wide benchmark is possible only when separately authorized and privacy-safe; it must not expose other locations' underlying records. Scope reassignment and temporary delegation require an audited workflow and expiry.

**Location scope:** one activated location. Local leaders do not inherit access to sibling locations merely because they work for the same company.

Every protected query/action must pass tenant boundary, subscription entitlement, user role and explicit scope assignment, resource-level policy, and action permission (view/create/edit/assign/approve/export/configure). Enforce server-side and in database RLS. Scope rows before aggregation so restricted records cannot leak through counts, charts, exports, search, or drill-down. Hidden menu items and frontend filters are not security controls.

## 3. Workspace switching

A qualified person may have multiple authorized contexts. The workspace switcher changes presentation and scope context; it never grants permissions.

Examples:
- An enterprise CEO can switch Global → Regional → Location only where the CEO has authorized assignments.
- A regional COO can switch Regional → one of their assigned Location dashboards.
- A location CFO cannot switch to Global or unrelated regional workspaces because those options exist in the product.
- A manager assigned multiple locations can select an assigned site or permitted aggregate.

Show effective scope in the header, e.g. “Chicago West Region · 8 assigned locations.” Do not display a generic city label that implies broader access.

## 4. Role-template architecture

Templates define role-relevant metrics, cards, reports, alerts, and suggested workflows. They do not grant permissions. The role/permission system remains authoritative. A person may hold multiple roles; resolve templates from active role(s), selected workspace level, and authorized scope. Never silently elevate access when combining roles.

### Executive templates

| Role template | Primary focus | Global dashboard | Regional dashboard | Location dashboard |
|---|---|---|---|---|
| **CEO / Chief Executive** | Strategy, growth, organizational health, risk, execution | Enterprise performance, strategic initiatives, major risks, business-unit comparisons, executive decisions | Regional goals, growth, performance, escalations | Location health, goals, customer/service outcomes, staffing, major blockers |
| **CFO / Chief Financial** | Financial performance, cost, cash, forecast, controls | Consolidated financial KPIs, budgets vs actuals, margin, spend, forecast, financial risks | Regional budgets, labor/operating costs, variance, forecast, commitments | Location budget, controllable spend, labor cost, purchase requests, cost per outcome |
| **COO / Chief Operating** | Execution, throughput, quality, service delivery | Enterprise operations, cross-region bottlenecks, capacity, SLA trends, critical events | Assigned-location throughput, backlog, capacity, staffing, SLA and variance | Daily workload, staffing, service levels, inventory/resources, local blockers |
| **CIO / Chief Information** | IT strategy, systems, architecture, availability, IT spend | Technology portfolio, integration health, identity posture, availability, technical debt, IT risk | Regional system health, network/site availability, device lifecycle, IT workload | Local device/service health, connectivity, site systems, IT tickets, maintenance |
| **CTO / Chief Technology** | Engineering, platform architecture, reliability, delivery | Platform architecture, engineering delivery, release health, reliability, roadmap | Regional technology rollout, infrastructure readiness, dependencies | Site technology readiness, deployment status, equipment and technical blockers |
| **CISO / Chief Information Security** | Cyber risk, identity, threats, response, controls | Enterprise security posture, threat trends, incidents, privileged access, control exceptions | Assigned-region security events, vulnerabilities, access exceptions, response readiness | Local alerts, control status, device/security issues, access reviews |
| **CHRO / Chief Human Resources** | Workforce, talent, retention, compliance, employee experience | Enterprise headcount, hiring, attrition, workforce costs, training, HR risk | Regional staffing, vacancies, turnover, attendance trends, training | Local staffing, vacancies, schedules, onboarding, training, workforce issues |
| **Chief Data / AI Officer** | Data quality, analytics, AI portfolio, governance | Enterprise data quality, AI portfolio, model usage/cost, governance, value realization | Regional data completeness, adoption, automation, AI outcomes | Local data quality, adoption, operational reporting, AI-assisted workflow use |
| **CRO / Chief Revenue Officer** | Revenue, pipeline, retention, customer growth | Enterprise revenue, pipeline, forecast, retention, customer concentration | Regional pipeline, bookings, renewals, customer outcomes | Location-level sales/customer activity where applicable |
| **CMO / Chief Marketing Officer** | Brand, demand, campaigns, market performance | Brand/campaign performance, demand generation, market intelligence | Regional campaign performance, territory demand, conversion | Local campaign execution, events, leads, customer feedback |
| **General Counsel / CLO** | Legal exposure, contracts, obligations, litigation, policy | Enterprise legal risk, contract exposure, policy exceptions, legal holds | Regional contract/compliance exposure and escalations | Local contract obligations, permits, incidents, authorized legal tasks |

### Management and functional templates

| Role template | Dashboard emphasis |
|---|---|
| **Regional Director / Regional GM** | Assigned-location scorecard, comparative performance, staffing/capacity, cross-location blockers, regional actions |
| **Location General Manager / Site Director** | Location scorecard, daily operations, staffing, service levels, customer experience, incidents, local budget |
| **Department Director / Manager** | Department workload, team capacity, goals, budget where authorized, service metrics, approvals |
| **Finance Director / Controller** | Budget vs actual, cost centers, invoices/commitments, reconciliation, exceptions, financial approvals |
| **IT Director / IT Manager** | Service desk performance, assets/devices, access requests, infrastructure health, changes, vendors, IT risk |
| **HR Director / HR Manager** | Staffing, onboarding, vacancies, training, attendance trends, employee requests; confidential case access only when authorized |
| **Security Director / Security Manager** | Alerts, incidents, vulnerabilities, access reviews, policy exceptions, response status |
| **Operations Manager** | Daily execution, throughput, queues, capacity, quality, schedule adherence, escalations |
| **Help Desk Manager** | Backlog, SLA at risk/breached, assignment balance, aging, escalations, handoffs, first response, resolution |
| **Service Desk L1 / L2 / L3** | Assigned work, priority, next action, SLA timer, authorized knowledge, escalation path, eligible access requests |
| **SOC Manager / Analyst** | Alert queue, severity, triage, incident ownership, playbooks, containment approvals, evidence |
| **NOC Manager / Analyst** | Network/service availability, alerts, affected assets/sites, incident response, change windows, capacity |
| **Governance / Risk / Compliance** | Control status, evidence requests, audit findings, attestations, exceptions, remediation owners and deadlines |
| **Procurement / Vendor Manager** | Purchase requests, vendor status, contract renewals, spend commitments, approvals, vendor risk |
| **Sales / Account Manager** | Assigned accounts, pipeline, renewals, customer actions, approved customer data |
| **Facilities / Site Services Manager** | Building/site status, maintenance, safety tasks, facilities tickets, vendors, resource availability |

Templates are configurable by customer and can be renamed, combined, or extended. A role template must never hardcode broad data access.

## 5. Dashboard content by level

### Global Operations Dashboard
- Enterprise health and strategic KPI scorecards.
- Company, subsidiary, business-unit, region, and location portfolio.
- Active/at-risk locations and subscription coverage.
- Financial overview and budget variance for finance-authorized roles.
- Workforce overview and staffing trends for HR-authorized roles.
- Service desk, SLA, incidents, escalations, and critical work.
- NOC availability and infrastructure status.
- SOC threat/security posture and incident status.
- Governance, audit, policy exceptions, and remediation.
- Integration and automation health.
- Enterprise announcements and executive decisions.
- Maximus executive briefing and Optimus evidence/research links, with approval gates for actions.

### Regional Operations Dashboard
- Region/territory identity and number of assigned active locations.
- Location comparisons and regional KPI rollups.
- Staffing and capacity by assigned location.
- Service desk backlog, SLA, and aging across assigned locations.
- Network/site availability and operational incidents.
- Security posture and open remediation actions.
- Regional financial/expense variance where permitted.
- Cross-location workload and resource coordination.
- Location-specific alerts, tasks, approvals, and escalations.

### Location Operations Dashboard
- Location health and operating status where applicable.
- Employees, departments, teams, schedules, and staffing.
- Tickets, service requests, SLA risk, handoffs, and escalations.
- Device, network, and local technology status.
- Security alerts, local access requests, and control exceptions.
- Budget/cost indicators for finance-authorized roles.
- HR/onboarding/training indicators for HR-authorized roles.
- Local tasks, approvals, announcements, and upcoming events.
- Chat Buddy and Bring the Work to You for authorized work.

## 6. Shared dashboard components and data integrity

Every dashboard may use:
- KPI scorecards with current value, trend, target, comparison period, source, and last update.
- Attention queue for urgent, overdue, at-risk, pending approval, and blocked work.
- Performance trends with explicit date range and data completeness.
- Location/department comparisons limited to authorized scope.
- Work queue of actions the user may actually take.
- Executive briefing with changes, decisions needed, and source links.
- Risk/exception register with owner, severity, due date, and audit trail.
- Audience-targeted announcements and acknowledgements.
- Bring the Work to You for authorized tickets, tasks, approvals, and work items.
- Chat Buddy for conversational navigation and coordination, never authorization bypass.
- Data provenance labels distinguishing connected live data, verified internal records, imported historical records, estimates, and unavailable integrations.

Every metric identifies source and time window. Empty or unavailable data says “No data available,” “Not connected,” or “Not configured.” Never fabricate operational values. A five-to-six-year synthetic trend may be used only in an isolated, clearly labeled demo environment; do not seed synthetic operations into a live tenant or mix them with real KPIs.

## 7. Subscription and entitlement relationship

- **Essential — $799 per active location/month:** Location Operations Dashboard and Local Operations Manager for the contracted location.
- **Professional — $1,499 per active location/month:** location capabilities plus Regional Operations Dashboard for contracted, activated locations and explicitly assigned regional scopes.
- **Enterprise — $3,500+/organization/month, negotiated:** Global Operations Dashboard and Global Operations Center for contract-covered companies, business units, regions, and locations.

These are working planning prices, not public launch prices. Enterprise contracts define covered locations, users, modules, AI/video/storage allowances, and service commitments.

Subscription entitlement does not grant a user access to all data. User authorization does not create a paid subscription. Both checks must pass. A regional workspace requires relevant subscription coverage and an active regional assignment. Global requires Enterprise coverage and a global role/scope assignment. A local CEO does not automatically receive global visibility.

## 8. Role and scope resolution

For each request resolve:
- authenticated profile and tenant;
- active roles and role-template mappings;
- active workspace level;
- assigned organization, region, and location memberships;
- subscription and module entitlements;
- resource-level permission;
- requested action.

Role title alone is insufficient. A local CEO is a location executive, not automatically the tenant's global CEO. A regional CFO has regional finance visibility, not enterprise-wide finance visibility. A corporate CIO may have enterprise technology oversight but still require explicit permission for restricted HR, payroll, legal, security case, or privileged-access content.

Multiple roles do not override tenant, assignment, entitlement, or resource policies. Audit role changes, scope assignments, delegation, and sensitive exports.

## 9. Data model and implementation direction

Reuse existing organization and organizational-unit structures. Do not create a second organization hierarchy.

Build on the existing location/subscription licensing foundation:
- organization location registry and lifecycle state;
- explicit profile-to-location memberships;
- explicit region-to-location assignments with effective dates and delegation metadata;
- subscription-to-location coverage;
- plan/module entitlement catalog;
- server-side scoped dashboard query functions.

Before adding tables, inspect existing organizations, organizational_units, workforce_organizational_units, location structures, profile-role mappings, and authorization helpers. Extend canonical tables where possible.

Add concepts only if no existing equivalent exists:
- role dashboard template registry (role + workspace level + template version);
- user dashboard preferences (layout only, never permissions);
- dashboard metric definitions (source, scope, refresh cadence, sensitivity);
- saved dashboard configurations scoped to tenant and role.

RLS and server-side query functions must scope rows before aggregation. Test direct API/RPC, exports, search, and drill-down for cross-tenant and cross-region leakage.

## 10. Acceptance criteria

1. A one-location customer uses Location Operations and cannot access Regional/Global without the required entitlement.
2. A Professional customer manages only contracted locations and assigned regional scopes.
3. A manager assigned eight West Side Chicago locations sees exactly those eight in regional rollups and selectors.
4. Another regional manager cannot discover those locations through URL, API, export, or search.
5. Global users see only contract-covered and authorized enterprise scope.
6. CEO/CFO/CIO/COO and other templates present role-relevant metrics but do not change permissions.
7. A local CEO cannot automatically see enterprise-wide records.
8. Financial, HR, legal, security, and privileged information remains separately permissioned.
9. No dashboard invents operational values or mislabels sample data.
10. Every action links to a real authorized workflow or is marked unavailable/not configured.
11. Workspace switching changes context and layout, never authorization.
12. Scope changes, delegated access, approvals, and sensitive exports are auditable.

## 11. Implementation order

1. Confirm canonical hierarchy, region/location assignments, roles, and subscription entitlements in the existing schema.
2. Implement scoped server-side query functions and authorization tests.
3. Implement dashboard template registry and role-to-template resolution.
4. Deliver Location Operations Dashboard templates and validated metrics.
5. Deliver Regional Operations Dashboard with assigned-location rollups.
6. Deliver Global Operations Dashboard with enterprise aggregation and drill-down.
7. Add customer customization and saved layouts without weakening authorization.
8. Connect verified live integrations and data sources; never fabricate status.
9. Validate pilot metrics and executive reporting.

**Product principle:** One connected operating platform, three levels of operational command, and role-specific dashboards whose visibility follows the user's actual authority—not merely their job title.

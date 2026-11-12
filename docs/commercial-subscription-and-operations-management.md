# IntelliStack Commercial Model & Organizational Operations Architecture

**Status:** Approved working direction; public launch and checkout remain gated by commercial, technical, security, and legal validation.  
**Product:** Maximus Optimus Command Center  
**Company:** IntelliStack Systems, Incorporated  
**Security tagline:** **Make the security process smarter.**

## 1. Product and commercial positioning

IntelliStack is a connected business operating environment, not merely a ticketing product or a bundle of unrelated applications. It brings together workforce coordination, Chat Buddy, Bring the Work to You, IntelliChat, service management, business productivity applications, organizational administration, governance, and enterprise operations.

The commercial proposition is consolidation and coordinated execution: reduce the operational friction created by disconnected tools while improving visibility, accountability, security, and time to productive work.

Do not claim that a customer can retire another product until the corresponding IntelliStack capability is production-ready, security-reviewed, integrated, and validated against the customer's actual requirements.

## 2. Three subscription plans

The five-plan concept is replaced by three coherent subscription tiers.

| Plan | Working list price | Billing unit | Management scope |
|---|---:|---|---|
| Essential | **$799/month** | Per activated location | Local Operations Manager |
| Professional | **$1,499/month** | Per activated location | Multi-location / regional operations for contracted locations |
| Enterprise | **$3,500+/month** | Per organization/month, negotiated | Global Operations Center and enterprise-wide management |

These are approved working prices for planning, not yet public launch prices. Enterprise's starting price is an organization-wide commitment, not an unlimited-location license. Each contract defines covered locations, user and usage allowances, AI consumption, support, integrations, implementation, migration, service levels, and negotiated volume pricing.

### Essential — Local Command Center

A complete business workspace for one activated location:
- Local employees, departments, devices, workflows, and reporting.
- Core Chat Buddy and Bring the Work to You.
- Core IntelliChat messaging and team communication.
- Help Desk ticket lifecycle, assignment, escalation, and SLA tracking.
- Core IntelliSphere productivity applications as each reaches production readiness.
- Standard role-based access control, approvals, notifications, and audit history.
- Location-level operational dashboard.

No Global Operations Center or multi-location administration. Client-side menu hiding is not an authorization boundary.

### Professional — Multi-Location / Regional Operations

Everything in Essential, plus:
- Regional and multi-location operations for contracted, activated locations.
- Consolidated reporting and location comparisons.
- Cross-location ticket and workforce coordination, subject to explicit scope authorization.
- Centralized policy and workflow configuration for permitted locations.
- Advanced Chat Buddy conversations, character customization, wardrobe and outfit scheduling.
- Expanded IntelliChat collaboration and meeting capabilities as implemented.
- Advanced workflow automation, analytics, and reporting.
- Optional IntelliAccess module eligibility, subject to separate entitlement and integration readiness.

Professional does not automatically include every location owned by the customer. A location must be contracted and activated; a user must also be authorized for that location.

### Enterprise — Global Operations Center

Everything in Professional, plus:
- Global Operations Center across contracted locations.
- Company, subsidiary, business-unit, region, and location hierarchy.
- Global identity and organizational administration.
- Enterprise governance, security, audit, and policy orchestration.
- Enterprise workforce, device, service, and operational oversight.
- Advanced Maximus and Optimus with governed action proposals.
- Advanced IntelliAccess, subject to verified integrations and deployment controls.
- Enterprise integrations, migration coordination, automation, and executive reporting.

Enterprise location coverage is explicitly defined in the contract and represented by subscription-to-location assignments. It is not unlimited locations, users, AI usage, or third-party services by default.

## 3. Location-first adoption and expansion

A customer can begin with one location, prove the operating model, then expand in phases.

Example: a hypothetical healthcare company has 50 locations:
1. Activate one location on Essential at $799/month.
2. Measure adoption, service performance, time-to-productivity, approval latency, and operational results.
3. Activate additional locations individually.
4. Move selected locations to Professional at $1,499 per activated location/month when regional coordination is needed.
5. If corporate leadership wants organization-wide command, governance, and oversight, negotiate Enterprise starting at $3,500/month with a defined location schedule.

Illustrative Essential recurring revenue before negotiated discounts:

| Locations | Monthly | Annual |
|---:|---:|---:|
| 1 | $799 | $9,588 |
| 5 | $3,995 | $47,940 |
| 10 | $7,990 | $95,880 |
| 25 | $19,975 | $239,700 |
| 50 | $39,950 | $479,400 |

These are arithmetic scenarios, not forecasts. Volume discount bands, annual prepayment discounts, and pilot credits require a separate approved commercial policy.

## 4. Organizational hierarchy and management software

The platform supports this hierarchy without creating separate disconnected customer accounts:

**Company → Subsidiary / Business Unit → Region → Location → Department → Team → Employee**

Not every customer needs every level. The hierarchy is configurable and customer-defined.

### Local Operations Manager
Runs one activated location: local workforce, tickets, devices, workflows, approvals, and reporting. Local managers see only authorized location data.

### Regional Operations Manager
Coordinates multiple contracted and activated locations: regional reporting, workload distribution, cross-location collaboration, and performance comparisons. A regional manager's authority is limited to assigned regions and locations.

### Global Operations Center
Provides organization-wide visibility for contracted locations and business units, enterprise policies, centralized governance, global identity administration, consolidated analytics, and executive operations. Access is limited to appropriately authorized enterprise roles.

These products share an underlying platform, but their interfaces, data scopes, workflows, and authorization rules differ. Subscription entitlements determine what management capabilities the customer has purchased. User roles and scoped memberships determine what each person may do within those capabilities.

### Location lifecycle
- **Pending activation:** registered but not licensed for operational use.
- **Active:** covered by an active subscription and authorized for use.
- **Suspended:** paid operations restricted while records are retained.
- **Closed:** no new operations; retained under customer retention policy.

Do not hard-delete locations or historical business records merely because a subscription ends. Suspend, deactivate, or close with an audit trail.

## 5. Entitlements and security enforcement

Every protected operation must pass two independent checks:

1. **Commercial entitlement:** Is the capability included in the organization's active plan or separately purchased module, and is this location covered?
2. **Authorization:** Is this authenticated person permitted to act for this organization, region, location, department, resource, and time period?

Both checks are required. Hiding a menu item is not security. APIs, database operations, and privileged actions must enforce scope server-side.

Fundamental security is never paywalled:
- Authentication and tenant boundaries.
- Standard role-based access control and least privilege.
- Basic approval controls and standard audit history.
- Safe session handling.

Advanced IntelliAccess is a premium capability. Without it, customers still have standard permissions and manually administered privileged access. Premium JIT provisioning, privileged workspace orchestration, advanced revocation verification, and integrations require the appropriate entitlement and configured connector.

A capability marked planned, in development, or restricted must not be represented as production-ready. Only verified available features may be granted at runtime.

## 6. IntelliAccess — Privileged Access Management

**Tagline: Make the security process smarter.**

IntelliAccess reduces the time between an approved business need and authorized productive work without giving technicians permanent administrator privileges.

Design principles:
- Employees use their normal employee sign-in for everyday work.
- A privileged task is linked to a ticket, business justification, target system, exact operation scope, and requested duration.
- Authorized managers approve; parallel approval and first-valid-approval-wins behavior must be enforced atomically.
- Strong step-up authentication is required.
- Routine tasks should use narrowly allowlisted delegated operations where possible; complex administration may use an isolated privileged session.
- The privilege clock begins only after the external grant is confirmed provisioned.
- Access ends on task completion, expiry, or approved revocation.
- Revocation must be verified. Failed revocation is an active security incident requiring alerting and escalation.
- Chat Buddy coordinates the workflow but cannot approve itself, provision privilege outside policy, or bypass the backend authorization broker.
- Privileged-access time is measured separately from ticket SLA time.

Pilot outcomes to measure, not assume:
- Time from employee start to first productive ticket.
- Request-to-manager decision time.
- Approval-to-verified-provisioning time.
- Tickets delayed by missing privileges.
- First-response and resolution times.
- Manual provisioning steps eliminated.
- Temporary grants revoked on time.
- Failed provisioning and revocation events.

## 7. Premium modules and software consolidation

Exceptional capabilities may be sold as optional modules when this does not undermine the base platform.

Potential modules:
- IntelliAccess privileged access.
- Advanced AI usage and orchestration.
- Advanced video meetings and collaboration.
- Enterprise integrations and migration services.
- Advanced governance and analytics.

IntelliStack may provide alternatives to parts of Microsoft 365, Teams, standalone ITSM, identity, file storage, and collaboration systems. Replacement claims must be evidence-based. Before recommending retirement of an incumbent system, validate feature parity, workflow coverage, data migration, identity, retention, legal hold, audit, file compatibility, meetings, messaging, security, administration, external dependencies, and contractual obligations.

IntelliStack's directory does not automatically replace Active Directory Domain Services or Microsoft Entra ID. Integration and migration must account for the customer's existing identity architecture. Do not tell customers to cancel incumbent licenses until the replacement scope has been tested and accepted.

## 8. Cost and margin model

Before public launch, model cost-to-serve by location and organization:
- Cloud compute, database, storage, backup, bandwidth, and observability.
- AI inference, embeddings, retrieval, and usage spikes.
- Video and voice infrastructure.
- Third-party software, API, connector, and identity-provider licensing.
- Security monitoring, compliance, and incident response.
- Customer support, onboarding, implementation, and migration.
- Engineering, maintenance, and product development.
- Payment processing, taxes, legal, and insurance.

AI, storage, video, and third-party usage allowances must be explicit. Heavy usage may require fair-use limits or separately priced usage packs. Enterprise agreements define support, availability, data residency, integration, and implementation commitments.

## 9. Migration and consolidation program

1. Inventory current platforms, subscriptions, data, integrations, and workflows.
2. Map incumbent capabilities to verified IntelliStack capabilities.
3. Identify gaps, retained dependencies, and third-party licensing obligations.
4. Define data mapping, access, retention, and rollback.
5. Migrate a controlled pilot dataset and validate integrity.
6. Run parallel operations during transition.
7. Obtain customer acceptance; only then recommend retiring redundant subscriptions.

Migration and implementation may be separately priced. No customer data is migrated or deleted without authorization and an approved plan.

## 10. Database and backend implementation contract

Extend the existing marketplace and organizational model; do not create duplicate subscription or company registries.

Existing foundations:
- `marketplace_products` and `marketplace_price_versions`.
- `marketplace_customer_subscriptions`, `marketplace_subscription_items`, and `marketplace_entitlements`.
- `organizations` and `workforce_organizational_units`.

Additive schema:
- `organization_locations`: customer sites beneath an organization.
- `organization_location_memberships`: explicit profile-to-location scope.
- `marketplace_subscription_location_assignments`: locations covered by an organization-wide Enterprise contract.
- `marketplace_plan_entitlement_catalog`: plan-to-capability catalog with scope and readiness state.
- Billing-scope/location fields on customer subscriptions and location scope on entitlements.
- `has_location_entitlement(location_id, entitlement_key)`: server-side check requiring active subscription coverage and caller authorization.

Security requirements:
- RLS on all new tables; no anonymous access.
- Global/organization administrators manage location configuration.
- Ordinary members see only their own membership records and authorized locations.
- No reliance on frontend route hiding.
- No recursive RLS policy references.
- External provisioning uses separate controlled server-side integration workflows.
- Do not seed customer locations, employees, tickets, or fake operational data.

The initial plan catalog and prices remain drafts pending review. Checkout stays disabled. Planned or in-development entitlements are not activated.

## 11. Decisions and approvals still required

Working decisions:
- Three plans: Essential, Professional, Enterprise.
- Essential: $799 per activated location/month.
- Professional: $1,499 per activated location/month.
- Enterprise: starting at $3,500 per organization/month with negotiated coverage.
- One-location pilot permitted; additional locations activated as contracted.
- Enterprise contracts explicitly list covered locations and usage.
- Local, Regional, and Global Operations are distinct management capabilities.
- Fundamental security is included; premium security automation is separately entitled.
- No customer-facing checkout or public pricing until commercial validation.

Requires later approval:
- Volume discounts and pilot credits.
- Annual prepayment discount.
- Included users, storage, AI, video, and support allowances.
- Optional module prices and eligibility.
- Enterprise support/SLA and implementation packages.
- Tax, legal terms, payment provider, and public price publication.
- Production-readiness state for every feature and integration.

## 12. Pilot measurement framework

Measure:
- Time from employee start to first productive ticket.
- Time from access request to manager decision.
- Time from approval to verified provisioning.
- Tickets delayed by missing permissions.
- First-response and resolution times.
- Manual provisioning steps removed.
- Temporary grants revoked on time.
- Failed provisioning and revocation events.
- Location adoption and active-user rates.
- Technician, manager, and executive satisfaction.
- Migration defects and incumbent subscriptions actually retired.

**Commercial promise:** IntelliStack connects the work, people, permissions, and systems required to operate a business.  
**Security promise:** Make the security process smarter—without making fundamental security a premium-only privilege.

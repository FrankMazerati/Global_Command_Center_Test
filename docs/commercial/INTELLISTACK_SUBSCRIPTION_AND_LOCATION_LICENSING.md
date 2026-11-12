# IntelliStack Subscription, Location Licensing, and Operations Management

**Status:** Approved commercial direction; implementation is staged and must pass release certification before checkout or customer entitlements are activated.  
**Product:** Maximus Optimus Command Center  
**Company:** IntelliStack Systems, Incorporated  
**Working branch:** `feature/enterprise-workspace-chat-buddy-build`

## Commercial philosophy

**Make the security process smarter.** IntelliStack is priced as a connected business operating ecosystem, not as a basic help-desk utility. Each tier provides a coherent operating environment. Premium plans add more intelligence, automation, customization, security orchestration, and organizational scope; they do not remove fundamental security controls from lower tiers.

The customer purchases activated operating scope. A company may begin with one location, prove the value, and expand. Enterprise customers may negotiate a consolidated organization-wide agreement.

## Three subscription plans

All prices below are the current approved pricing direction for planning. They are monthly USD list-price proposals, not proof of production checkout readiness.

| Plan | Price | Billing unit | Management scope |
|---|---:|---|---|
| Essential | $799 | Per activated location / month | One local company location |
| Professional | $1,499 | Per activated location / month | Multi-location and regional operations |
| Enterprise | Starting at $3,500 | Per organization / month; negotiated | Global Operations Center and contracted organization-wide scope |

### Essential — Local Operations

Essential is a complete business operating environment for one activated location. It includes the core employee workspace, basic Chat Buddy, Bring the Work to You, IntelliChat core collaboration, Help Desk/ticket workflows, core productivity-suite entitlements as released, location directory/workforce records, role-based authorization, audit history, standard approvals, and a secure manual privileged-access process.

Essential does not include the multi-location management console or Global Operations Center. A customer may evaluate optional IntelliAccess separately when the module and integration are certified. Essential is limited to one activated location under the standard plan.

### Professional — Multi-Location Operations

Professional includes the Essential foundation for each activated location, plus multi-location administration, regional operations, cross-location coordination, advanced Chat Buddy, avatar wardrobe and scheduled appearance customization, advanced workflow automation, cross-location analytics, and expanded integrations.

The $1,499 price is per activated location per month. The subscription's organizational scope enables authorized management across the customer's activated locations. Regional managers only see locations assigned to their scope.

### Enterprise — Global Operations Center

Enterprise starts at $3,500 per month as an organization-wide contract. The contract defines included locations, covered companies/subsidiaries, user and usage allowances, integration scope, support, implementation, and any additional-location charges. There is no promise of unlimited locations at the starting price. Enterprise includes global organizational hierarchy, Global Operations Center, centralized identity and governance capabilities, enterprise AI orchestration, advanced IntelliAccess, and consolidated reporting, subject to product and integration readiness.

## Organization and location model

Reuse `public.organizations` as the canonical organization hierarchy. Do not create a second company directory or a duplicate location registry.

- Company / customer organization: parent record.
- Location: child organization with `organization_type = 'location'`, a location code, timezone, country code, and address metadata.
- Region: represent as an organization attribute or an explicit region node only when the customer needs a regional hierarchy. The subscription-location mapping must still identify the customer organization and the contracted location.
- Subsidiary: child organization with its own legal and operational scope.
- Department, team, and workforce reporting: continue to use the existing workforce organizational-unit and assignment model.

One location can have one active subscription-location assignment at a time. An Enterprise organization-level subscription may cover multiple contracted locations. The customer may not gain access to another location's data merely because both locations share a parent company.

## Local, regional, and global management software

1. **Local Operations Manager:** manages the employees, departments, tickets, devices, approvals, schedules, and performance of one activated location.
2. **Regional Operations Manager:** coordinates an explicitly assigned group of activated locations, supports comparisons and cross-location work, and never expands data access beyond the manager's assigned scope.
3. **Global Operations Center:** provides authorized enterprise-wide oversight across contracted subsidiaries, regions, and locations. Global visibility is an entitlement plus a role/scope grant, not a UI menu switch.

The subscription entitlement answers what management capabilities the organization has purchased. The user's role and scoped permissions answer what that user may do. Both checks are required on every protected route, query, RPC, and mutation.

## Feature and security boundaries

- Fundamental authentication, tenant isolation, RBAC, auditability, and safe manual access workflows are not paywalled.
- Essential receives secure role-based access and manual privileged-access requests; it does not receive the automated JIT broker by default.
- IntelliAccess is a premium module. Advanced Enterprise IntelliAccess includes JIT orchestration, approval coordination, temporary grants, expiry, and verified revocation only after the broker and provider integrations pass release gates.
- Chat Buddy coordinates requests and work; it cannot approve itself or bypass backend authorization.
- AI and UI visibility never replace server-side authorization.
- A module is not advertised as available merely because a catalog row exists. Each entitlement carries a release-certification state.
- External identity, directory, video, productivity, storage, and AI provider licensing remains a customer-specific cost until actual integrations and provider agreements are verified. Do not claim that IntelliStack eliminates Microsoft or other vendor licensing without a tested migration and compatibility path.

## Upgrade and expansion rules

- Essential: one active location.
- Professional: multiple activated locations billed at $1,499 per location/month.
- Enterprise: one negotiated organization-wide contract, with contracted location coverage and volume terms.
- A customer may upgrade a location or consolidate a group of location subscriptions into an Enterprise contract.
- When an Enterprise agreement replaces existing location subscriptions, billing must be prorated/credited according to contract terms and must not double-bill overlapping coverage.
- Optional premium modules may be sold to lower tiers only where the deployment is certified and the module's add-on terms are explicit.
- Volume discounts, annual billing, implementation fees, AI usage limits, video/storage allowances, support tiers, and additional Enterprise location rates remain configurable contract terms; do not hardcode unapproved values.

## Illustrative scenarios

### One location pilot

Essential: **$799/month** for one activated location. No other company locations are activated by default. Corporate administrators may see contracted organization metadata, but unlicensed locations do not receive operational entitlements.

### Five-location Professional deployment

5 × $1,499 = **$7,495/month** before any negotiated volume adjustment.

### Fifty-location Essential deployment

50 × $799 = **$39,950/month** before any negotiated volume adjustment. A company should not pay for the 50 locations before it activates them.

### Fifty-location Enterprise agreement

Starting price: **$3,500/month**, subject to a negotiated contract that defines location coverage, user/AI allowances, implementation, support, integrations, and additional-location fees. The $3,500 starting price is not a commitment to include 50 locations without further pricing.

## Database and implementation notes

The existing marketplace schema already includes product catalog, price versions, customer subscriptions, subscriptions, subscription items, entitlements, orders, and quote/pricing history. It also contains 4,800 customer-subscription records. Preserve those records and their provenance; do not rewrite legacy plan keys or amounts as part of this change.

The additive migration in `supabase/migrations/20261112170000_intellistack_three_tier_location_entitlements.sql`:
- adds location metadata to the canonical organizations table;
- adds per-location and organization-contract pricing fields to price versions;
- adds subscription scope and location entitlement fields;
- creates a subscription-to-location coverage table;
- creates a normalized three-plan entitlement catalog;
- adds an RLS-respecting `has_marketplace_entitlement` helper;
- stages Essential, Professional, and Enterprise pricing at $799, $1,499, and $3,500 respectively.

The new price versions remain draft/pending and checkout remains disabled. The entitlement catalog is product configuration, not customer access grants. It creates no customer, company, location, subscription, entitlement grant, employee, or demo activity record. Legacy plan records and all 4,800 existing customer-subscription rows remain unchanged.


### Legacy subscription transition

The existing `marketplace_customer_subscriptions` table contains 4,800 records using `level-1` through `level-5` keys, with active, cancelled, expired, past-due, and paused statuses. The existing price-version catalog also contains older `launch`, `basic`, `growth`, `premium`, and `full-experience` package keys. These records are not rewritten or deleted by this change. Some records are marked active or past due, so the transition to the three new plans requires an explicit grandfathering and contract-mapping policy before any legacy plan is retired or hidden from account management. The new three-plan Available Plans experience is the forward-looking sales catalog; it does not silently change existing customer contracts.

## Release gates

Before enabling checkout or claiming a module is production-ready:
1. Review the migration and apply it only to a dedicated development database/branch first.
2. Add authenticated positive/negative tests for tenant isolation, parent-company/location mapping, location-scope entitlements, and role-scope enforcement.
3. Verify a user from Company A cannot enumerate Company B's locations or subscription assignments.
4. Verify Essential cannot activate a second location without an authorized Professional/Enterprise entitlement.
5. Verify Professional regional managers see only assigned locations.
6. Verify Enterprise users require both global entitlement and an appropriate role/scope grant.
7. Verify a location cannot be attached to a subscription for a different parent organization.
8. Verify one active subscription assignment per location and no overlapping active coverage.
9. Verify plan upgrades/downgrades, proration, credits, cancellations, renewal, failed payment, suspension, and reinstatement without double billing.
10. Verify all location, subscription, entitlement, and administrative changes produce the required immutable audit evidence.
11. Run Supabase security/performance advisors and application lint, unit tests, integration tests, and production build.
12. Confirm real provider agreements, AI usage budgets, video/storage limits, support and migration costs before publishing final customer-facing terms.

## Application surface

The Marketplace **Available Plans** route now opens a dedicated subscription workspace. The **Business Locations** route now opens a company-scoped location manager that lists child location records and offers registration only when the migration, organization-admin role, and required subscription entitlement are present. The server-side registration RPC rechecks authorization and subscription scope, creates a child location record, and writes an audit event. It presents the three approved plan directions, location versus organization billing units, and Local/Regional/Global management scopes. It queries the marketplace price and entitlement catalogs when the migration is present; otherwise it clearly labels the display as a commercial-specification preview. It does not offer checkout or activate entitlements.

## Current implementation status

- Existing marketplace tables and pricing history are present in the live database.
- Existing catalog package keys include legacy `launch`, `basic`, `growth`, `premium`, and `full-experience`. They are not deleted or rewritten by this feature.
- New three-tier price records are staged as draft/pending in the migration source and are not active in live checkout.
- Location and subscription schema changes are staged on the feature branch only. No production migration was applied.
- No customer locations, subscriptions, entitlements, or sample business records were created.
- The local/regional/global management screens, lifecycle RPCs, billing provider integration, proration, and end-to-end authorization tests remain implementation/release work.


## Related operations dashboard specification

The three-tier commercial model is paired with three distinct role-based operational dashboards. See [Global, Regional & Location Operations Dashboards](../operations/GLOBAL_REGIONAL_LOCATION_DASHBOARD_TEMPLATES.md) for executive and functional templates, assigned-location scope rules, entitlement boundaries, and acceptance criteria.

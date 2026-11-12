# Commercial Entitlements — Implementation and Release Checklist

This checklist accompanies the subscription and organizational operations architecture. It distinguishes schema presence from verified product behavior.

## Delivery sequence

### Phase A — Commercial catalog and scope
- [ ] Confirm the new additive migration is present on the feature branch and its exact filename/hash is recorded.
- [ ] Validate every referenced column, foreign key, check constraint, and helper function against the live schema snapshot.
- [ ] Keep proposed price versions in draft / pending approval.
- [ ] Keep checkout disabled until price, tax, payment provider, legal terms, and cost-to-serve are approved.
- [ ] Preserve existing subscription records and legacy plan keys; map them through a reviewed migration rather than silently rewriting them.
- [ ] Define a formal conversion process from legacy plan keys to Essential, Professional, and Enterprise.

### Phase B — Location and hierarchy
- [ ] Confirm the canonical organization and organizational-unit model before creating duplicate hierarchy structures.
- [ ] Create locations only through an authorized organization-administration workflow.
- [ ] Define location codes, timezone, country, lifecycle, and parent organization.
- [ ] Assign profiles to locations explicitly with effective dates and scope roles.
- [ ] Support companies that have no regional layer and companies with subsidiaries, business units, franchises, or multiple countries.
- [ ] Ensure inactive/unlicensed locations cannot use paid operations.

### Phase C — Subscription coverage
- [ ] Essential subscription covers one explicitly assigned location.
- [ ] Professional subscription covers only the contracted, activated locations represented in its assignments.
- [ ] Enterprise subscription is organization-scoped but still has a defined covered-location schedule and usage limits.
- [ ] Prevent duplicate billing when converting location subscriptions into an Enterprise agreement.
- [ ] Handle activation, suspension, past-due, cancellation, expiry, renewal, and contract amendment transitions.
- [ ] Retain historical subscription and location assignments for audit and billing reconciliation.

### Phase D — Runtime enforcement
- [ ] Create a single server-side entitlement service used by route handlers, RPCs, and privileged actions.
- [ ] Enforce both subscription entitlement and user authorization for organization, region, and location.
- [ ] Use deny-by-default behavior when plan, location, membership, or subscription state is missing or ambiguous.
- [ ] Verify effective dates and subscription billing periods.
- [ ] Verify optional add-on entitlements independently of base plan entitlements.
- [ ] Do not use frontend feature flags as the only enforcement.
- [ ] Ensure background jobs and service-role workflows independently validate tenant and scope.

### Phase E — Authorization and regression tests
- [ ] Location A member cannot read Location B operational data.
- [ ] Location A manager cannot administer Location B without an explicit scope grant.
- [ ] Organization administrator can administer locations only within their organization.
- [ ] Global administrator access is explicit and audited.
- [ ] A registered but unactivated location cannot invoke paid capabilities.
- [ ] Suspended, cancelled, expired, or past-due subscriptions follow the approved grace-period policy.
- [ ] Essential cannot invoke Professional or Enterprise entitlements.
- [ ] Professional cannot invoke Global Operations Center.
- [ ] Enterprise users still cannot access locations outside the contract or their role scope.
- [ ] A user cannot self-create or self-approve a location membership.
- [ ] Direct API/RPC requests are denied even if the UI is manipulated.
- [ ] RLS tests cover both positive and negative cases across two organizations and multiple locations.
- [ ] Concurrency tests prevent duplicate subscription assignments and duplicate grants.

### Phase F — Product surfaces
- [ ] Local Operations Manager shows only the active location scope.
- [ ] Regional Operations Manager shows only contracted locations the user may administer.
- [ ] Global Operations Center shows the contracted enterprise scope and clearly labels unlicensed locations.
- [ ] Access-denied states explain whether the issue is missing plan entitlement, location activation, or user permission.
- [ ] Customer administrators can see plan, covered locations, usage allowances, renewals, and contract status.
- [ ] No dead menu links or false production-ready labels.

## Important implementation cautions

- Do not directly mutate production Supabase schema merely because a migration file exists in GitHub.
- Confirm the branch migration matches the exact live schema before execution.
- Do not rewrite existing legacy plan values or historical subscription amounts in place.
- Do not turn a draft catalog price into a purchasable price by changing a UI flag.
- Do not grant an entitlement solely because a user is a company administrator.
- Do not let an organization-wide Enterprise contract imply unlimited location coverage.
- Do not mark planned features as available until the service and integration are deployed and tested.

## Definition of done

The commercial foundation is complete only when a real customer can be provisioned into an organization, activate a contracted location, assign authorized people, have server-side entitlement and scope checks enforced, view accurate subscription coverage, and be prevented from accessing unlicensed locations or unavailable features. Billing transitions, audit evidence, and negative authorization tests must also pass.

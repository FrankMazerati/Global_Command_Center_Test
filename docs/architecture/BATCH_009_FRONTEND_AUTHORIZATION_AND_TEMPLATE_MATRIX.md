# Batch 009 — Frontend Authorization & Dashboard Template Matrix

**Product:** Maximus Optimus Command Center  
**Company:** IntelliStack Systems, Incorporated  
**Status:** Implementation contract — documentation only; frontend implementation not yet complete  
**Predecessor:** Batch 008 Organizational Intelligence & Management Scope Foundation  
**Related:** `ENTERPRISE_DASHBOARD_HIERARCHY_AND_ROLE_TEMPLATES.md` and `BATCH_009_SCOPED_OPERATIONS_INTELLIGENCE_DASHBOARDS.md`  
**Security principle:** Make the security process smarter.

## 1. Purpose and governing rule

This matrix connects every backend authorization decision to an observable frontend behavior and a verifiable test. It is the acceptance contract for the frontend portion of Batch 009.

The frontend is a presentation and interaction layer, never an authorization authority. It may hide, disable, explain, or guide access to controls, but the backend/database must independently authorize every read, search, drill-down, export, subscription capability, and state-changing action.

**Effective access = authenticated identity + verified workforce identity + active approved assignment + canonical role/action permission + explicit organizational/location scope + active subscription entitlement + resource sensitivity rules.**

If any required element is missing, expired, revoked, ambiguous, or unavailable, access fails closed. A dashboard template, URL, client-side role value, selector, saved view, or Chat Buddy instruction cannot grant access.

## 2. End-to-end authorization decision matrix

| Backend decision / source | Frontend must do | Required test evidence |
|---|---|---|
| Authenticated session from `auth.uid()` | Load the signed-in user's own effective context; never accept a client-selected profile as authority | Unauthenticated request receives sign-in/401 behavior; spoofed profile ID cannot change context |
| Verified workforce identity link | Show a clear unavailable/identity-verification state if no valid link exists; do not render management data | Missing, revoked, or mismatched link denies dashboards and APIs |
| Active workforce person / employment state | Stop management views when the workforce identity is inactive or terminated | Deactivation/termination invalidates active views and subsequent requests |
| Approved, active management assignment | Show only currently approved assignments; pending assignments appear as pending, not active | Pending/rejected/revoked assignments do not grant dashboard access |
| Assignment dates and revocation | Display effective/expiry context where relevant; refresh access after expiry or revocation | Before/after expiry and immediate revocation tests |
| Canonical management role catalog | Offer only assigned, active role templates | Forged role key or template switch does not change effective permission |
| Canonical role/action permissions | Render actions as available, disabled with explanation, or absent according to product policy; server still checks | Allowed action succeeds; disallowed action is denied through direct API/RPC too |
| Explicit assignment-to-location membership | Populate selectors and location data only with assigned locations | Assigned location succeeds; unassigned sibling location is denied |
| Region-to-location membership | Regional dashboard aggregates only mapped locations | Eight assigned locations show exactly eight; remaining 42 are excluded |
| Tenant and organization ancestry | Keep tenant/company boundaries in all selectors, queries, links, and caches | Cross-tenant URL, ID substitution, search, export, and API attempts are denied |
| Active marketplace subscription and entitlement | Show enabled, pending provisioning, expired, or unavailable capability states | No entitlement denies capability even if role and assignment exist |
| Resource sensitivity / field-level rules | Redact or omit restricted fields and actions; do not expose via hidden DOM, tooltips, previews, or downloads | CEO/CFO/HR/legal/security field-level negative tests |
| Authorization decision ID / audit context | Surface a support-safe reference for denied sensitive operations when appropriate; never expose internal secrets | Denied and privileged actions produce expected audit evidence |
| Resolver/cache invalidation | Refresh context after role, assignment, membership, entitlement, identity, or employment changes | Stale browser tab/cache cannot retain revoked access |

## 3. Dashboard level × role template × authorized scope

The dashboard level selects the operating horizon. The role template selects the presentation and workflow. The resolver supplies the actual scope. All three must agree.

| Dashboard level | Example templates | Data boundary | Frontend context |
|---|---|---|---|
| Location Operations | Location CEO, CFO, COO, CIO, CTO, CISO, CHRO; Site Manager; Department Manager; Help Desk/NOC/SOC/Finance/HR roles | One or explicitly assigned locations, with permitted departments and records | Location name, active role, assignment status, and authorized location selector |
| Regional Operations | Regional CEO/COO/CFO/CIO; Regional Manager; regional service/security/finance leadership | Explicit region membership or a non-contiguous assigned location set, within tenant and contract coverage | Region name, assigned-location count/list, role, and only authorized location comparisons |
| Global Operations Center | Global CEO/CFO/COO/CIO/CTO/CISO/CHRO and authorized enterprise executives | Contracted companies, subsidiaries, business units, regions, and covered locations | Enterprise context, included entities, active role, and contract coverage indicator |

### 3.1 Scope rules

- A job title does not create scope.
- A city name or postal code does not create scope.
- A regional assignment does not automatically include every location in a city or region.
- A global template does not create global entitlement or global permission.
- A paid subscription does not assign a user to a role or location.
- A role assignment does not activate an unpaid subscription capability.
- A user with multiple roles may switch among currently assigned templates, but the effective permissions remain the union/intersection rules of the canonical authorization engine—not the template.
- A saved view may remember layout, filters, and widget order; it cannot remember or restore revoked scope.
- Every drill-down, detail view, mutation, and export is independently authorized.

## 4. Role-template presentation matrix

Templates are configuration records referencing canonical role keys. This table defines intended presentation, not new permissions.

| Role family / examples | Location view | Regional view | Global view | Sensitive boundary / UI rule |
|---|---|---|---|---|
| CEO | Local business health, people summary, service, risks, decisions | Assigned location comparison, regional priorities, escalations | Enterprise portfolio, strategy, consolidated performance | Executive title alone does not expose finance, HR, legal, or security case details |
| CFO / Finance | Location budget and financial operations | Authorized regional financial summaries and variance | Authorized enterprise financial portfolio | Finance permission and entitlement required for detailed financial records/actions |
| COO / Operations | Daily execution, capacity, SLA, local risks | Cross-location delivery, capacity, and coordination | Enterprise operational health and major initiatives | Actions limited to delegated operational authority |
| CIO / IT leadership | Local IT service, endpoints, changes | Regional technology health and delivery | Enterprise technology portfolio and service health | Privileged configuration requires separate permission/JIT authorization |
| CTO / Engineering | Local platform/product engineering indicators where applicable | Regional delivery/engineering indicators where applicable | Enterprise architecture, reliability, product technology | No automatic production/admin access |
| CISO / SOC | Local security posture and assigned cases | Assigned regional security posture and cases | Enterprise security posture and authorized investigations | Incident details and containment actions are separately permissioned |
| CHRO / HR | Workforce summary and authorized HR cases | Regional workforce trends with privacy controls | Enterprise workforce trends with privacy controls | Employee-sensitive fields/cases require HR-specific permission |
| Legal / Compliance / Governance / Audit | Local controls, evidence, remediation | Regional controls and findings | Enterprise obligations, audit and risk posture | Legal privilege, investigations, and evidence access remain separately restricted |
| Help Desk L1/L2/L3 and Manager | Queue, assigned tickets, escalation and permitted diagnostics | Regional service queue/coverage when assigned | Enterprise service portfolio when authorized | L1/L2/L3 capability differences and privileged tasks are enforced server-side |
| IT Administrator | Authorized device/identity/configuration tasks | Assigned regional infrastructure tasks | Enterprise administration only when explicitly granted | Sensitive actions require step-up/JIT approval as applicable |
| NOC / SOC | Local infrastructure/security monitoring | Assigned regional monitoring | Enterprise monitoring | Case/alert visibility and response actions are separately permissioned |
| Sales / Customer Support | Assigned accounts/cases and local outcomes | Assigned territory/customer operations | Enterprise roll-up and authorized account access | Customer and commercial records remain scoped and field-restricted |
| Executive Assistant / Chief of Staff | Delegated calendar, briefings, action tracking | Delegated regional coordination | Delegated enterprise coordination | Delegation is explicit, time-bound, auditable; never inherits principal's authority |

If an organization does not appoint a role at a given level, that template is not offered as an active assignment. The system must not fabricate an appointment to fill a dashboard menu.

## 5. Frontend surface-by-surface behavior matrix

| Frontend surface | Required behavior | Backend enforcement and test |
|---|---|---|
| Command Center landing | Resolve the user's available dashboard levels and assigned templates; show a clear no-access or setup-pending state | Direct dashboard API with no scope/entitlement must deny |
| Dashboard level switcher | Offer only levels for which the user has effective scope and entitlement | Tampered level parameter is denied |
| Role/template switcher | Offer only active assigned roles/templates | Forged role/template ID cannot elevate access |
| Company / region / location selector | List only authorized entities; never infer from geography | Replace selected ID with unassigned or cross-tenant ID; deny |
| Left navigation / hamburger | Show permitted modules; restricted modules may show a lock and “Need more access” / request-access path where policy allows | Direct route/API remains denied |
| KPI cards and charts | Aggregate only authorized records; suppress unsafe small-group or inferential aggregates | Compare aggregate results with restricted locations/records added or removed |
| Tables, filters, pagination | Query server-side within effective scope; avoid client-side filtering of broad data | Manipulate filters, page tokens, sort keys, and IDs |
| Detail pages and drill-down | Reauthorize selected resource on every navigation and data fetch | Direct URL and guessed record ID denied |
| Action buttons and forms | Explain permission/approval requirements; show confirmation and outcome states | Call underlying mutation directly without permission; it must fail |
| Access request / approvals | Show requester, resource, scope, reason, approver status, expiry, and audit-safe outcome | Requester cannot self-approve; unauthorized approver cannot approve |
| Search and autocomplete | Return only authorized entities and safe metadata | Search exact restricted record name/ID; no leakage in results/counts/snippets |
| Reports and exports | Export only the authorized filtered dataset and fields; confirm export scope | Export endpoint cannot broaden scope or reveal hidden columns |
| Notifications and previews | Deliver only authorized notifications; preview must not leak sensitive content | Revoke access, then test stale notification/deep link |
| Realtime subscriptions | Subscribe only to authorized channels/records; revoke or reauthorize on changes | Existing subscription must stop delivering after revocation |
| Cache and saved views | Partition by user/tenant/scope/entitlement and invalidate on changes | Switch users or revoke assignment; stale cache must not reveal data |
| Chat Buddy / Maximus / Optimus | Use the same resolver and record-level authorization; explain when information is unavailable | Prompt injection or request to inspect another location cannot retrieve data |
| Mobile / tablet navigation | Preserve the same access decisions, locked states, scope labels, and safe drill-down | Repeat key access tests at mobile viewport and touch navigation |
| Error and empty states | Distinguish no access, no assignment, pending approval, no entitlement, expired assignment, empty authorized data, and unavailable source | Each state must map to a real backend outcome, not fabricated sample data |

## 6. Standard frontend authorization states

Every protected page/component must use a consistent state model:

1. **Loading / resolving:** do not flash protected data before authorization completes.
2. **Available:** scope, permission, and entitlement checks passed.
3. **Restricted — request access:** user may request access, but no protected data is returned.
4. **Pending approval:** show request status and next step; do not treat as active access.
5. **Not assigned:** explain that the required management assignment is missing.
6. **Not entitled:** explain that the organization subscription does not currently include the capability; do not expose upgrade-only data.
7. **Expired / revoked:** remove protected data and actions immediately; refresh effective context.
8. **Identity not verified / inactive:** block management dashboard access and provide the appropriate support path.
9. **No authorized records:** show an empty state without revealing whether inaccessible records exist.
10. **Source unavailable / integration not configured:** label data unavailable; never substitute fabricated live-looking values.
11. **Unexpected authorization error:** fail closed, log correlation/decision ID, and provide a safe retry/support path.

Protected content must not be rendered behind a modal, hidden with CSS, retained in browser state after revocation, or embedded in page source.

## 7. Positive and negative acceptance-test matrix

Tests should use isolated fixtures or a non-production test environment. Do not seed fake workforce, locations, subscriptions, entitlements, or activity into customer production data.

| ID | Type | Scenario | Expected result |
|---|---|---|---|
| POS-01 | Positive | Active verified employee has approved Location Manager assignment, required permission, and active Local Operations entitlement | Location dashboard and permitted local actions load |
| POS-02 | Positive | Location CFO has finance permission and appropriate entitlement | Authorized financial cards/details/actions appear |
| POS-03 | Positive | Location CEO lacks finance detail permission | CEO template loads, but restricted financial details/actions do not |
| POS-04 | Positive | Regional manager is assigned eight explicit locations and regional entitlement is active | Regional dashboard lists and aggregates exactly those eight |
| POS-05 | Positive | Global executive has active global assignment, contracted coverage, and required permissions | Global portfolio shows only included entities |
| POS-06 | Positive | User has two active roles | User can switch between the two assigned templates without gaining new permissions |
| POS-07 | Positive | User requests access to a restricted module | Valid request is created and status is visible; access remains denied pending approval |
| POS-08 | Positive | Authorized manager approves another person's eligible request | Approval is recorded; access appears only after provisioning/activation succeeds |
| POS-09 | Positive | User uses authorized search/export | Results and exported fields match the same effective scope |
| POS-10 | Positive | Chat Buddy summarizes an authorized ticket/location | Summary contains only authorized information and references |
| NEG-01 | Negative | Location manager changes URL/location ID to another site in same tenant | No data returned; safe denial |
| NEG-02 | Negative | Regional manager tries to see the other 42 locations | Denied; no records, counts, previews, or inference leakage |
| NEG-03 | Negative | User changes tenant/company ID in request | Cross-tenant request denied |
| NEG-04 | Negative | Essential plan calls Regional or Global endpoint | Denied even if UI route is manually entered |
| NEG-05 | Negative | Professional tenant has no active regional assignment | Regional data denied |
| NEG-06 | Negative | Enterprise contract excludes a subsidiary/location | Excluded entity and drill-down denied |
| NEG-07 | Negative | CEO template attempts CFO-only financial detail | Restricted fields/actions denied |
| NEG-08 | Negative | CFO template attempts HR-sensitive employee case | Restricted fields/actions denied |
| NEG-09 | Negative | User forges role/template key or client-side permission flag | No authorization change |
| NEG-10 | Negative | Assignment expires, is revoked, or employment is terminated | Current view is cleared/refreshed; subsequent requests denied |
| NEG-11 | Negative | Workforce identity link is revoked | Scope resolution and protected access denied |
| NEG-12 | Negative | User guesses a ticket, person, device, or approval ID | Record-level authorization denies |
| NEG-13 | Negative | Restricted record is queried through search/autocomplete | No sensitive result, snippet, count, or timing oracle |
| NEG-14 | Negative | Export request adds hidden columns or broadens filters | Server rejects or safely constrains export |
| NEG-15 | Negative | Stale notification, realtime channel, browser cache, or saved view is used after revocation | No protected content delivered |
| NEG-16 | Negative | User asks Chat Buddy/Maximus/Optimus to retrieve another tenant/location's records | AI retrieval denies; no prompt-based elevation |
| NEG-17 | Negative | Requester attempts to approve their own access | Approval denied and audited |
| NEG-18 | Negative | Dashboard template is switched to Global without global role/scope/entitlement | Global data remains inaccessible |
| NEG-19 | Negative | Small-group aggregate could reveal a sensitive employee or case | Aggregate is suppressed or safely generalized |
| NEG-20 | Negative | Authorization resolver or entitlement service is unavailable | Protected surfaces fail closed; no stale privileged fallback |

## 8. UI component and engineering contracts

Build reusable frontend primitives rather than embedding separate authorization logic in every dashboard:

- `EffectiveAccessProvider`: loads the current user's effective context from a trusted server endpoint.
- `DashboardContextSwitcher`: switches only among resolver-authorized levels and templates.
- `AuthorizedNavigation`: renders permitted navigation and safe access-request affordances.
- `ScopeSelector`: accepts only server-returned authorized organization/region/location options.
- `AccessBoundary`: handles loading, available, denied, pending, expired, and unavailable states.
- `PermissionAwareAction`: presents action state and explanation; never substitutes for backend authorization.
- `SensitiveField`: renders only fields returned by an authorized data service.
- `AuthorizationStatus`: displays safe reason, request path, and correlation reference.
- `DashboardDataService`: server-side scoped data access; no broad client query followed by filtering.
- `AuthorizedSearch` and `AuthorizedExport`: enforce the same scope and field policy as the source page.
- `AIContextGateway`: filters every retrieval and tool action through the same effective scope.

These are proposed contracts/names, not claims that components already exist. Reuse the repository's current architecture and naming conventions after inspection; do not create duplicate auth providers or permission systems.

## 9. Delivery sequence and definition of done

1. Inventory current frontend routes, layouts, role checks, data clients, RPC calls, and navigation definitions.
2. Map each existing UI surface to the canonical backend permission, scope, entitlement, and sensitivity decision.
3. Implement the trusted effective-context contract and loading/fail-closed states.
4. Implement navigation, dashboard context, role-template switching, and scope selector.
5. Implement Location Operations using scoped server data services.
6. Implement Regional Operations and the exact eight-of-50 acceptance test.
7. Implement Global Operations with explicit contracted coverage and reauthorized drill-down.
8. Apply the same scope to search, notifications, realtime, exports, cache, and Chat Buddy retrieval.
9. Run positive and negative integration tests, including direct API/RPC and mobile/tablet tests.
10. Run regression, lint, tests, production build, and security/performance review; document unresolved project-wide findings.
11. Update the existing PR #7 and keep it draft/unmerged until release criteria pass.

**Definition of done:** no protected frontend surface relies on client-only authorization; every dashboard template maps to canonical role keys; every displayed record/action is bounded by backend scope and entitlement; all required positive and negative tests pass; responsive behavior is verified; and CI is green.

## 10. Explicit non-goals

- This document does not implement frontend components or backend resolver code.
- It does not create new canonical roles or duplicate the role catalog.
- It does not grant access or create real assignments, subscriptions, or entitlements.
- It does not seed synthetic customer activity or production customer records.
- It does not authorize billing changes, external integrations, privileged access rollout, production release, or PR merge.

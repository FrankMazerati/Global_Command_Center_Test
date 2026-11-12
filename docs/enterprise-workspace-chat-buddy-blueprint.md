# Enterprise Workspace, Bring the Work to You, and Chat Buddy Build Blueprint

**Status:** Approved implementation baseline; implementation is incremental and must be verified against the live application and database.  
**Repository:** `FrankMazerati/Global_Command_Center_Test`  
**Database project:** `fzwbvccvqnbvzbqfgiep`  
**Feature branch:** `feature/enterprise-workspace-chat-buddy-build`

## Product objective

Build an enterprise operating environment that is ready to enter an enterprise: reusable role dashboards, organizational hierarchies, role-aware AI assistance, a meaningful work-prioritization console, and secure workflows. The product must not fabricate demo tenants, companies, employees, devices, conversations, or work assignments. Preserve existing records and their provenance. Any pre-existing synthetic-seed records must remain explicitly identified as synthetic and must never be presented as verified people or production activity.

## Non-negotiable principles

1. Viewing a workspace never grants the permissions represented by that workspace.
2. Workspace switching changes presentation, task context, and relevant assistant skills; it never changes the user's authenticated identity, tenant scope, or granted permissions.
3. Every consequential action is checked server-side against the actor, organization, tenant, resource, action, scope, delegation, and approval requirements.
4. Chat Buddy cannot self-authorize, bypass approvals, or elevate the user's permissions.
5. AI-prepared work is distinct from AI-executed work. Preparation may include drafts, checklists, summaries, and proposed schedules; execution requires an explicit authorized action and any required pre-approval.
6. Do not create new synthetic/demo business populations or activity records without explicit authorization. Preserve existing records; retain provenance and clearly distinguish synthetic-seed data from verified production data.
7. Reuse and extend existing tables, routes, and components after schema inspection. Do not create duplicate tables or parallel permission engines.
8. Keep the Command Center's premium dark navy / electric cyan enterprise visual language, compact controls, readable data, responsive tablet/mobile behavior, and independently scrollable work panels.

## Product and organizational structure

### Corporate parent
**IntelliStack Systems, Inc.** is the parent organization. Its Global CEO workspace provides authorized consolidated oversight across the corporate group, subsidiaries, products, tenants, objectives, risk, and performance.

### Operating businesses
- **IntelliStaff:** staffing operations, workforce availability, contractor and employee records, client assignments, placements, regional and branch operations, payroll/billing coordination, and workforce compliance.
- **IntelliHire:** job requisitions, candidate pipeline, applications, screening, interviews, hiring-manager coordination, offers, recruitment operations, and employer accounts.
- **IntelliWork:** employment lifecycle, onboarding, agreements, employee records, training, leave, time, performance, promotion, and offboarding.

Each operating business has its own CEO/leadership structure, finance, HR, operations, managers, regional/branch structure, and staff. Corporate leadership can see cross-business reporting only within its granted scope.

### Tenant enterprise model
Every tenant receives a configurable organizational hierarchy and the reusable job-role catalog. It can map its own job titles, departments, reporting lines, regions, offices, cost centers, and approval chains to the catalog without rebuilding dashboards.

## Role and workspace template catalog

Create a normalized, extensible catalog of positions and workspace templates, not one-off pages for every title. Cover executive leadership, finance/accounting, HR/people, IT/service desk, SOC/security, NOC/network, operations/facilities, sales/marketing/customer success, product/engineering/data/AI, legal/procurement/supply chain, project/program management, quality, manufacturing, research, safety, audit, risk, communications, and executive administration.

Include individual contributor, senior/specialist, team lead, supervisor, manager, office/branch manager, regional manager, director, VP/SVP/EVP, and C-suite roles. L1/L2/L3 are role-specific job grades where relevant (e.g., Help Desk L1/L2/L3, SOC L1/L2/L3, NOC L1/L2/L3), not a universal substitute for managerial hierarchy.

Each role template should define:
- canonical role key, title, department/function, job family, grade/level, and aliases;
- default dashboard template and optional workspace variants;
- reporting relationship defaults and allowed organizational scope;
- Chat Buddy role profile and allowed skill/template set;
- Bring the Work to You view, metrics, priority rules, and permitted quick actions;
- default permission-policy references, approval requirements, and data classification;
- configurable company/tenant overrides and version history.

Role templates are starting configurations, not grants. A user receives capabilities only from explicit role assignments and scoped permission grants.

## Executive and department dashboard templates

At minimum include CEO, President, COO, CFO, CIO, CTO, CISO, CHRO, CMO, CRO, CPO, CDO, CLO/General Counsel, Chief Compliance Officer, Chief Risk Officer, Chief Strategy Officer, Chief Customer Officer, Chief Procurement Officer, CAO, VP/SVP/EVP, Controller/Treasurer, Finance Director, HR Director, Talent Acquisition Director, IT Director, Engineering Director, SOC Manager, NOC Manager, Regional Manager, Branch/Office Manager, Department Manager, Team Lead, Supervisor, and broad departmental individual-contributor templates.

Dashboards should expose only role-relevant and authorized objectives, KPIs, people, work, risks, budgets, approvals, and drill-downs. Six-year views should support five years of historical periods plus current year and forward-looking plans/forecasts as configured. Do not manufacture sample populations or metrics. Existing records must retain source/provenance labels; imported records must be verified before being represented as production.

## Workspace switching

Provide a persistent, compact workspace selector. It lists only workspaces the authenticated user may access or preview. Switching preserves the current user identity and authorization. Global administrators may preview templates in a clearly labeled preview mode; preview must not impersonate an executive or expose real tenant data. Record workspace changes for audit and restore the user's last permitted workspace.

## Chat Buddy (Help Buddy) assistant experience

The dashboard assistant and the full assistant workspace must share conversation context and the same authorization service.

### Open/closed behavior
- Open state: show the assistant panel with avatar, status, current task/context, mode tabs, and relevant content.
- Closed/minimized state: collapse to a compact launcher or narrow header strip; preserve the active conversation, checklist, notes, selected workflow, and scroll state.
- The top-level toggle must clearly open/minimize the assistant, expose accessible labels and expanded state, and work on touch and keyboard.
- Closing/minimizing is not the same as ending a conversation, deleting history, or cancelling a workflow.
- On reopen, restore the previous mode and context. Provide an explicit separate action to end/reset a conversation where authorized.

### Assistant modes and reusable scenarios
1. **Assist / Conversation:** ask questions, receive role-aware guidance, and continue the active conversation.
2. **Checklist / Workflow:** create, reorder, check off, reopen, and complete steps; show progress and dependencies; retain owner, due date, evidence, and sign-off when relevant.
3. **Meeting preparation:** propose attendees and times from authorized calendars, draft agendas, gather authorized documents, and request confirmation before sending invitations.
4. **Trip preparation:** organize destination, dates, travel preferences, approved travel policy, itinerary, and documents; bookings/purchases require separate authorization.
5. **Business document gathering:** search only authorized repositories, summarize matches, preserve source links and permissions, and never broaden access.
6. **Work organization:** convert requests into assigned tasks, priorities, deadlines, and dependencies, with authorization checks for assigning others.
7. **Ticket/service desk:** summarize authorized ticket context, propose troubleshooting steps, prepare notes, and escalate only through approved workflows.
8. **Knowledge assistant:** retrieve approved knowledge bases and articles according to audience, tenant, and data scope.
9. **People/manager coordination:** show only authorized directory information and reporting relationships.
10. **Calendar and reminders:** prepare schedule changes and reminders; external invitations and consequential changes require confirmation and permission.
11. **Approval assistant:** explain pending approvals, assemble evidence, route requests, and never approve on behalf of an approver without explicit delegated authority.
12. **Security/governance guidance:** explain policies and help prepare incident/compliance records; restricted operational changes require specific privileges and approvals.
13. **Escalation/handoff:** route to the correct lead/manager/owner and preserve the audit trail.
14. **Training/onboarding:** role-specific learning, guided checklists, and completion evidence.

### Character and personalization
Preserve the approved youthful stylized 3D male assistant reference (swept brown hair, expressive face, blue IntelliStack hoodie with white I emblem, blue headset/microphone) as the default reference character. Support at least 100 diverse character presets (the live database currently contains 201 character profiles), configurable appearance, outfits/accessories, language, voice where supported, personality, and display name. Keep paid wardrobe/character options architected for entitlement-based locking. Preserve rotating greetings (50) and conversation starters (100), with personalization and repeat/cooldown controls.

## Bring the Work to You console

This is a compact work-prioritization console, not a wall of decorative buttons.

### Five sections
1. **Attention Required:** dynamic count of urgent decisions, incidents, blockers, and overdue work; every count drills into the underlying authorized records.
2. **Quick Actions:** compact, role-aware actions such as Schedule a Meeting, Prepare a Trip, Gather Business Documents, Organize My Work, and Create a Business Request. Show only actions the user can initiate.
3. **My Priorities:** ranked work based on severity, business impact, SLA/deadline, assignment, dependencies, and user responsibility.
4. **Waiting & Approvals:** items blocked on others, pending approvals, delegated work, and required sign-offs.
5. **Upcoming & Recommended:** meetings, deadlines, scheduled assignments, and grounded next-step recommendations.

Counts and status must be computed from live authorized records, never hardcoded. Each item must display why it is important, its owner, due date/SLA, status, and next permitted action. Provide drill-downs and empty/error/unavailable states.

## Authorization and audit model

Every action follows: identify actor and tenant -> resolve requested resource/action -> check role assignment and scoped grants -> check ownership/delegation -> evaluate approval policy/pre-authorization -> execute only if allowed -> record outcome.

Support view/create/edit/delete/assign/reassign/approve/delegate/configure/export/administer as distinct permissions. Dashboard customization must distinguish personal preferences from shared department/company configuration. Contractors and external users receive explicit limited scopes. Temporary access must have a future expiry, be revocable, and be audited. Approval policies must support requester, manager, resource owner, tenant admin, security/compliance, and Global Admin as configured—not assume one universal approver.

## Existing database assets verified during initial audit

The live Supabase project currently contains:
- 67 roles and 49 permissions;
- 50 Help Buddy response templates;
- 201 assistant character profiles;
- 5,000 workforce people and 5,000 IntelliHire candidates;
- existing organization, tenant, department, organizational-unit, workforce hierarchy, role-assignment, permission, access-request, ticket-approval, work-assignment, workflow, audit, assistant session/message, avatar, wardrobe, and IntelliHire tables;
- zero public base tables without RLS in the current schema audit.

These existing objects must be inspected and extended before creating new schema. The existing workforce and candidate seed populations carry synthetic provenance and must not be represented as verified real people; preserve them until the owner authorizes a specific data action. Existing database presence does not by itself prove every UI workflow is connected or every policy is correct. Verify RLS policies, grants, foreign keys, constraints, and actual read/write flows.

## Implementation sequence

### Phase 0 — repository/database verification
- Confirm repository default branch, build/test scripts, latest merged hamburger/navigation work, and current deployment.
- Inspect relevant live table definitions, RLS policies, indexes, constraints, and seed data.
- Identify frontend mock/local-only behavior and replace only after its backend contract is verified.
- Avoid duplicate role, assistant, workforce, approval, and workflow tables.

### Phase 1 — Chat Buddy interaction foundation
- Implement top toggle and durable open/minimized behavior.
- Make dashboard assistant and full assistant panel share context.
- Implement scenario/mode navigation and checklist workflow.
- Persist Chat Buddy sessions/messages and authenticated checklists to Supabase; label offline-only checklist fallback.
- Add role/permission gates before enabling action controls.

### Phase 2 — role/workspace registry and hierarchy
- Normalize missing job-family/position/workspace-template metadata.
- Map all existing 67 roles and identify gaps in the broad enterprise catalog.
- Configure corporate group, IntelliStaff, IntelliHire, IntelliWork, and tenant hierarchies.
- Seed reusable dashboard templates and workspace switcher metadata.

### Phase 3 — executive and departmental dashboards
- Build CEO/CFO/COO/CIO/CTO/CISO/CHRO and remaining executive workspaces.
- Build functional department and L1/L2/L3/team-lead/manager/regional/office variants.
- Connect metrics only to real authorized records with explicit provenance; do not seed demo populations.

### Phase 4 — Bring the Work to You
- Replace decorative/hardcoded work cards with live priority and attention queries.
- Implement five sections, compact quick actions, drill-downs, and permission-aware actions.
- Add role-specific prioritization and empty/error states.

### Phase 5 — IntelliStaff / IntelliHire / IntelliWork
- Build each operating business's leadership and functional dashboards.
- Connect recruitment -> candidate -> offer/placement -> workforce/employment lifecycle using verified foreign keys and audit events.

### Phase 6 — validation and enterprise demo
- Test user roles, cross-tenant isolation, workspace preview, assistant closed/open restoration, every scenario, approvals, revocation, and denied actions.
- Verify no synthetic data is presented as production data.
- Run unit/integration/build checks and review deployment checks before calling a batch complete.

## Completion criteria

A batch is complete only when its UI, data model, server-side authorization, audit behavior, tests, and failure/empty states are verified. A commit or a populated screen alone is not completion.


## Current backend batch execution record — 2026-11-12

- Existing assistant session/message tables are reused for Chat Buddy history; the UI writes only actual user messages and does not fabricate assistant replies.
- A tenant-scoped Command Work queue, immutable work-item event history, and work-item approval records have been added because the existing `work_assignments` table is for staffing/marketplace placements, not everyday internal tasks.
- Workflow write policies now permit the workflow owner to update runs and steps within the same organization/tenant; step assignment checks require same-scope active profiles.
- The existing 67-role catalog, 25 governance management-role definitions, workforce role assignments, and workforce organizational units are reused; no duplicate catalog or hierarchy table is introduced.
- New work queue and approval tables have RLS enabled, no anonymous table grants, and organization/tenant/active-membership checks.
- The homepage no longer falls back to fabricated work cards, sample news headlines, sample market prices, or pre-marked connected integrations. Empty/unconfigured states are preferable to false live status.
- No assistant messages, work items, approvals, or workflow runs are seeded. They are created only through actual authenticated user actions or authorized source-system imports.
- Remaining completion gates: run formatter/lint, unit tests, production build, authenticated integration tests, negative cross-tenant tests, and verify all changed migration files are aligned with the live migration history.

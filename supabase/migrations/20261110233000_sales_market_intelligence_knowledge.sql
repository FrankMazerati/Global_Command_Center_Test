-- Sales, executive positioning, and competitive intelligence knowledge collection.
-- Idempotent seed: safe to apply repeatedly by knowledge-base key and article slug.

insert into public.knowledge_bases (kb_key, name, description, visibility, status)
values (
  'sales_market_intelligence',
  'Sales, Executive and Market Intelligence',
  'Audience-specific product positioning, differentiators, market context, competitive intelligence, sales playbooks and evidence-backed product claims.',
  'public_internal',
  'active'
)
on conflict (kb_key) do update
set name = excluded.name,
    description = excluded.description,
    visibility = excluded.visibility,
    status = excluded.status;

with target_base as (
  select id from public.knowledge_bases where kb_key = 'sales_market_intelligence'
),
seed(title, slug, summary, body_md, audience, topic) as (
values
(
'IntelliStack Market Positioning: One Connected Operational Command Center',
'intellistack-market-positioning',
'The core market narrative: a governed command-center experience that brings people, work, operational systems and decision context together.',
$article$
# IntelliStack Market Positioning

## The short version
IntelliStack is building the Maximus Optimus Command Center: a unified, governed operational environment designed to bring work, people, service operations, business applications and decision-support context into one organized experience.

The customer problem is not simply that companies have too many applications. It is that employees and leaders must repeatedly move between disconnected tools, reconstruct context, find the right owner, interpret separate notifications and manually coordinate the next step.

## The market message
**Bring the work, the people and the information together.**

The Command Center is intended to give each authorized user a relevant starting point for the work they need to do, while giving leaders a clearer view across teams and operations.

## What makes the approach distinctive
- A personalized work environment, not just another list of application links.
- Help Buddy as a guided work and coordination assistant.
- Maximus and Optimus as complementary strategic and technical intelligence experiences.
- Global time, news and market context alongside company announcements and operational work.
- A connected suite spanning productivity, workforce, service management, identity, security, governance and business operations.
- IntelliSync as the integration and synchronization approach for connecting systems and preserving useful context.
- Role- and tenant-aware access, with governance and auditability treated as platform foundations.

## What we are not claiming
IntelliStack should not be positioned as having already replaced every specialist system, as having every connector live, or as having proven productivity savings without customer evidence. It can coexist with systems of record and provide a more connected experience across approved workflows.

## Customer outcome to demonstrate
Show a real workflow: a user enters the Command Center, sees relevant work and announcements, asks Help Buddy for assistance, follows an authorized process, and can trace the resulting task or service record. Measure the time, handoffs and context switches before and after a controlled pilot.
$article$,
'CEO, COO, CMO, Sales, Business Development',
'positioning'
),
(
'Executive Talking Points: CEO, COO, CFO, CIO, CTO, CISO and CHRO',
'executive-talking-points-by-role',
'Role-specific business narratives that explain why the Command Center matters to each executive and what evidence each leader should request.',
$article$
# Executive Talking Points by Role

Use the same platform story, translated into the executive's priorities. Avoid presenting a generic feature tour to every audience.

## CEO — Strategy and organizational alignment
- Bring people, information and work into one governed operating environment.
- Improve organizational visibility without removing departmental ownership.
- Connect strategic priorities to accountable execution.
- Ask: Where does fragmented work slow decisions or obscure ownership?

## COO — Execution and operational consistency
- Bring the next task, owner, due date, context and action into a coordinated workspace.
- Reduce manual handoffs and repeated status chasing.
- Connect announcements, service workflows and team responsibilities.
- Ask: Which cross-team process has the most avoidable waiting and rework?

## CFO — Cost transparency and measurable return
- Build a fact-based view of overlapping tools, integration costs, support costs and adoption.
- Evaluate consolidation opportunities without assuming every specialist tool can be retired.
- Measure cycle time, throughput, rework and cost against a baseline.
- Ask: Which costs are actually avoidable, and what is the full implementation and operating cost?

## CIO / CTO — Architecture and integration
- Position the Command Center as a governed experience and coordination layer across approved systems.
- Explain identity, authorization, APIs, data boundaries, event synchronization, observability and recovery.
- Preserve authoritative systems of record and define ownership for each integration.
- Ask: Which systems must remain authoritative, and what integration patterns are approved?

## CISO — Security and risk
- Emphasize server-side authorization, least privilege, tenant separation, audit trails and controlled approvals.
- Explain how assistant responses are limited to information the user is authorized to access.
- Distinguish implemented controls from controls awaiting validation.
- Ask: What are the required positive and negative security tests before production use?

## CHRO — Employee experience and workforce coordination
- Make work, onboarding guidance, announcements and help easier to find.
- Support role-aware experiences across employees, managers and contractors.
- Measure time to proficiency, employee task completion and support friction.
- Ask: Where do employees lose time finding information or understanding what to do next?

## CMO / Chief Commercial Officer — Market differentiation
- Lead with the connected experience and the customer's operational problem.
- Tell the story through a customer workflow, not a long feature inventory.
- Use substantiated claims and current competitive evidence.
- Ask: Which customer segment feels this pain strongly enough to sponsor a pilot?

## Department leaders and frontline managers
- Show how their team receives, prioritizes, completes and escalates work.
- Demonstrate ownership, workload visibility and clear handoffs.
- Ask: What would make the team's daily work easier to coordinate?

## Executive meeting rule
Start with the executive's business priority, demonstrate one relevant workflow, show the evidence and agree on a measurable next step.
$article$,
'CEO, COO, CFO, CIO, CTO, CISO, CHRO, CMO, department leaders',
'executive-messaging'
),
(
'Product Differentiators: Help Buddy, Work Feed and Connected Context',
'product-differentiators-helpbuddy-workfeed',
'Explain the user-facing features that make the Command Center more than a portal or application launcher.',
$article$
# Product Differentiators

## Help Buddy
Help Buddy is the user's conversational and workflow-guidance assistant. It helps people find authorized knowledge, understand procedures, work through tasks, coordinate handoffs and identify the next step. Its value is not just answering questions: it should help users move work forward while respecting permissions and approval boundaries.

## Bring the Work to You
The work feed is designed to surface relevant tasks, assignments, priorities, due dates, offers and actions in one organized place. Each item should retain its source, owner, state and authorization requirements. It should reduce the need to hunt through multiple systems to discover what needs attention.

## Global time
A global time view helps distributed teams coordinate across regions, understand local business hours and avoid scheduling or handoff mistakes.

## Global news feed
A curated news feed can provide business, technology, industry and world context. Explain relevance, source and publication time. News supports awareness; it does not replace due diligence or authoritative company information.

## Stock ticker and market context
Market indicators can give executives additional context for business discussions. Display source, exchange, quote timestamp and delayed/real-time status. This is informational context, not investment advice or a guarantee of trading-grade data.

## Company announcements
Targeted announcements can help leaders communicate to the right organization, department or audience. Strong implementation includes publisher permissions, priority, effective and expiry dates, read acknowledgements where appropriate, and an auditable publication history.

## The whole experience
The differentiator is the combination: users see their work, organizational messages and decision context together, with Help Buddy available to guide the next action. Demonstrate the connected journey rather than claiming any one widget is unique by itself.

## Evidence to collect
Measure task discovery time, announcement reach and acknowledgement, help resolution, workflow completion, user adoption and context-switch frequency during a controlled customer pilot.
$article$,
'Product, Sales, Marketing, COO, CHRO, Customer Success',
'product-differentiation'
),
(
'Help Buddy and Bring the Work to You: Customer Value Story',
'helpbuddy-bring-work-to-you-value-story',
'A demonstration narrative for guided assistance, work organization, prioritization and coordinated execution.',
$article$
# Help Buddy + Bring the Work to You

## The customer problem
Employees often know what outcome they need but must search across applications, knowledge articles, ticket queues, messages and team contacts to determine how to get there. Work can stall when ownership, prerequisites or the next step are unclear.

## The value story
The Command Center is designed to bring relevant work into the user's workspace and make Help Buddy available as a guide. The feed surfaces authorized work; Help Buddy helps the user understand it, find the right procedure, follow the steps and coordinate a handoff when needed.

## Demonstration sequence
1. Sign in as a representative role and show its authorized home workspace.
2. Review the work feed: source, priority, owner, due time and available action.
3. Open a work item and show its underlying record rather than relying only on a summary card.
4. Ask Help Buddy how to complete the task.
5. Show the relevant knowledge source and prerequisites.
6. Demonstrate an approval or escalation boundary where required.
7. Verify the actual outcome in the source workflow and show the record or audit evidence.

## What to emphasize
- Less searching for the next task.
- More consistent guidance and handoffs.
- Clearer ownership and status.
- Help that is grounded in authorized sources.
- A single assistant experience connected to work rather than a disconnected chatbot.

## What to measure
Time from task availability to first action; time to completion; number of handoffs; repeat contacts; escalation rate; knowledge helpfulness; and user-reported effort.

Do not claim autonomous completion for actions that still require a human decision, external integration or approval.
$article$,
'Sales, Product, COO, Help Desk leadership, Customer Success',
'workflow-value'
),
(
'Global Decision Context: Time, News, Markets and Announcements',
'global-decision-context',
'Position global time, news, market indicators and internal announcements as a decision-support layer around operational work.',
$article$
# Global Decision Context

The Command Center brings selected external and internal context alongside operational work so users do not have to assemble every signal manually.

## Global time
- Support distributed operations, cross-region scheduling and handoffs.
- Show location and time-zone labels clearly.
- Use local business hours to improve coordination, not to infer employee availability without an approved source.

## Global news
- Curate relevant world, business, technology and sector coverage.
- Show publisher, source link, publication time and relevance.
- Distinguish verified reporting, commentary and developing stories.
- Respect licensing and attribution requirements.

## Stock ticker and market indicators
- Display supported symbols and market indices with source, exchange, timestamp and delayed/real-time designation.
- Treat market data as informational context.
- Do not imply the platform provides financial advice, guaranteed accuracy or trading execution unless those capabilities are separately implemented and authorized.

## Company announcements
- Provide authorized publishers with audience targeting by company, tenant, department or role.
- Support priority, publication and expiry windows, links to related work and optional read acknowledgements.
- Keep announcement history and changes auditable.

## Why the combination matters
External context helps leaders understand the environment; internal announcements communicate organizational intent; the work feed and workflows connect that context to execution. This is a decision-support experience, not an automated decision-maker.

## Customer proof
Demonstrate source transparency, update freshness, user relevance, announcement reach and how a user moves from information to an authorized next action.
$article$,
'CEO, CFO, COO, CIO, CMO, Sales',
'decision-context'
),
(
'IntelliSync: Integration and Synchronization Architecture Talking Points',
'intellisync-architecture-and-positioning',
'Explain how IntelliSync is intended to connect systems, identities, events and workflows, including operational safeguards and implementation boundaries.',
$article$
# IntelliSync Architecture and Positioning

## The purpose
IntelliSync is the platform's integration and synchronization approach. Its purpose is to connect approved systems and keep relevant records, events and workflow context coordinated across the Command Center.

## Architecture layers
1. **Connectors and adapters:** communicate with approved internal and external systems through documented APIs, webhooks, scheduled imports or other supported mechanisms.
2. **Identity and tenant mapping:** map external identities and organizations to trusted internal identifiers without assuming that matching names prove identity.
3. **Canonical event and data model:** normalize source events while retaining the original source, source record ID, event time, received time and provenance.
4. **Synchronization orchestration:** process changes, handle retries and idempotency, detect duplicate or out-of-order events, and expose failures for review.
5. **Workflow and experience layer:** make authorized updates available to work feeds, Help Buddy, dashboards, search and reporting.
6. **Governance and observability:** track connector health, scopes, data freshness, failures, audit records, ownership and recovery procedures.

## Important design principles
- Source systems remain authoritative for the data they own unless an explicit ownership agreement says otherwise.
- Every connector has an owner, purpose, approved scopes, data classification and failure runbook.
- Synchronization must be idempotent and preserve source identifiers and provenance.
- Late, missing or conflicting events must be visible; never fabricate a successful sync.
- Authorization is checked at the server before data is retrieved or exposed to an assistant.
- Secrets remain in managed secret storage and are never written into tickets, logs or articles.

## How to explain it to a CIO or CTO
IntelliSync is not just a collection of links. It is the coordination fabric that lets the Command Center present connected work and context while preserving the boundaries and authority of the underlying systems.

## How to explain it to a COO
When approved systems exchange the right events and status, teams can coordinate work with fewer manual status checks and clearer handoffs.

## Implementation honesty
Describe each connector as **planned**, **configured**, **connected**, or **verified**. A health endpoint or a successful test connection does not prove every data flow is synchronized end to end. Confirm connector inventory, scopes, event coverage, reconciliation and failure recovery before calling an integration production-ready.
$article$,
'CIO, CTO, COO, CISO, Product, Sales',
'architecture'
),
(
'Competitive Landscape: Where IntelliStack Fits',
'competitive-landscape-positioning',
'Position IntelliStack responsibly against productivity suites, IT service platforms, CRM systems and specialist tools.',
$article$
# Competitive Landscape: Where IntelliStack Fits

## Positioning principle
Do not claim that IntelliStack is universally better than Microsoft, Google, ServiceNow, Salesforce or any other vendor. These companies have mature products, broad ecosystems and specialist capabilities. The useful question is where the Command Center adds value alongside or across the systems a customer already uses.

## Competitive categories

### Productivity and collaboration suites
Examples include Microsoft 365 and Google Workspace. Customers may already rely on them for documents, email, calendars, meetings, identity and collaboration. IntelliStack's opportunity is to organize operational work and approved workflows across the wider environment, not to pretend those suites do not exist.

### IT service management and workflow platforms
Examples include ServiceNow and comparable service-management products. They provide deep service, workflow and enterprise automation capabilities. IntelliStack's opportunity is to make service work part of a broader role-aware command-center experience and connect it to people, knowledge and other business operations.

### CRM and customer platforms
Examples include Salesforce and other CRM systems. They manage customer relationships, sales processes and customer data. IntelliStack's opportunity is to surface approved work and operational context across teams while respecting the CRM as the system of record for its owned data.

### Specialist security, HR, finance and analytics products
These tools may provide deep domain-specific controls and functionality. IntelliStack should integrate with them where appropriate rather than claim to replace specialist capabilities without equivalent evidence.

## Potential differentiation to demonstrate
- One organized entry point across approved business and operational workflows.
- Work feed designed around the user's role and responsibilities.
- Help Buddy connected to authorized knowledge and task guidance.
- Global time, news, market context and internal announcements in the same decision environment.
- IntelliSync integration and synchronization approach.
- Governance, identity and access boundaries built into the operating model.

## Competitive comparison checklist
For every named competitor, record product and edition, source URL, research date, verified features, limitations, integration options, pricing basis and customer segment. Recheck claims before external publication because products change frequently.

## Win strategy
Win where customers value cross-system coordination, role-aware work organization and a unified operating experience. Partner with or integrate into specialist systems when they are the better system of record. Do not promise replacement where the product has not demonstrated feature parity, security, scale or regulatory suitability.
$article$,
'CEO, CIO, CTO, CMO, Sales, Business Development',
'competitive-intelligence'
),
(
'Sales Playbook: Discovery, Qualification and Command Center Demonstration',
'sales-discovery-and-demo-playbook',
'A repeatable sales conversation that starts with customer pain, demonstrates a relevant workflow and ends with measurable pilot criteria.',
$article$
# Sales Playbook

## Discovery questions
1. Which applications do employees move between to complete a typical cross-department task?
2. Where do tasks get lost, delayed or reassigned?
3. How do employees find the right procedure or person to help?
4. How are announcements targeted and acknowledged?
5. How do leaders coordinate across time zones and stay aware of relevant external developments?
6. Which systems must remain authoritative?
7. What integration, identity, security and data-residency requirements apply?
8. What would make a pilot successful, and how is the current baseline measured?

## Qualification
Identify the executive sponsor, operational owner, technical owner, security reviewer, target users, affected workflows, systems involved, budget path, procurement requirements and decision timeline.

## Demonstration flow
- Start with a role-specific Command Center homepage.
- Show Bring the Work to You and explain how a work item retains its source and owner.
- Show Help Buddy finding relevant authorized guidance.
- Show global time, news, market context and company announcements.
- Walk through one workflow from discovery to verified completion.
- Explain IntelliSync's connector, identity, event and synchronization model.
- Close with permissions, auditability, integration boundaries and pilot measurement.

## Pilot design
Choose one or two workflows, a representative user group, named system owners and a limited time window. Record baseline and post-pilot measures such as task discovery time, completion time, handoffs, repeat requests, adoption and user satisfaction.

## Qualification warning
Do not sell a roadmap item as a live feature. Before each demonstration, verify the environment, integrations, data freshness, permissions and end-to-end behavior.
$article$,
'Sales, Business Development, Solutions Engineering, Customer Success',
'sales-playbook'
),
(
'Objection Handling: Common Questions and Evidence-Based Responses',
'intellistack-objection-handling',
'Consistent answers to buyer questions about overlap, integration, security, AI, value, implementation and product maturity.',
$article$
# Objection Handling

## “We already use Microsoft 365 or Google Workspace.”
That may be the right foundation for documents, email, calendars and collaboration. IntelliStack is positioned around coordinating work and operational context across approved systems. The next step is to identify a workflow that remains fragmented today and test whether the Command Center improves it.

## “We already have ServiceNow or another ITSM platform.”
Keep the service-management system where it is the authoritative record if that is the customer's architecture. Demonstrate how approved ticket context and work coordination can be surfaced in the Command Center without creating competing records or bypassing the service platform.

## “Is this replacing all our applications?”
No blanket replacement promise. The goal is a more connected experience across systems, with replacement considered only where a capability has been validated and the customer has approved the migration.

## “How does IntelliSync work?”
Explain the connector, identity mapping, event normalization, synchronization, monitoring and governance layers. Then show the actual connector status and data flow for the customer's environment. If it is not connected and tested, say so.

## “Can Help Buddy take actions?”
Help Buddy can guide users and support approved workflows. Consequential actions must follow the configured permission and approval process. Demonstrate only actions that are enabled and verified in the environment.

## “How secure is it?”
Discuss the actual architecture, server-side authorization, tenant isolation, secret handling, audit evidence and security tests. Do not claim a certification or compliance status without independent evidence for the relevant scope.

## “What is the return on investment?”
Build a customer-specific baseline. Measure tool costs, implementation and support costs, task time, handoffs, rework and adoption. Present assumptions and sensitivity rather than promising a fixed percentage saving.

## “Is the market feed real time?”
State the actual provider, source, update interval and any delay for each feed. Never describe delayed or cached data as real time.

## “Why should we trust the AI?”
Show source-grounded answers, access boundaries, citations, uncertainty handling and human approval gates. Explain where the assistant is not configured or where a workflow remains manual.

## Response rule
Acknowledge the concern, answer directly, show evidence, disclose limitations and propose a small test. Never argue a claim that cannot be substantiated.
$article$,
'Sales, Marketing, Solutions Engineering, Executive Leadership',
'objection-handling'
),
(
'Marketing Messaging: Value Propositions, Audiences and Campaign Themes',
'marketing-messaging-and-campaigns',
'Core message hierarchy and audience themes for positioning IntelliStack consistently across website, presentations and campaigns.',
$article$
# Marketing Messaging

## Primary message
**One connected command center for people, work and operational intelligence.**

## Supporting messages
- Bring the work to you: organize relevant tasks, priorities and next steps.
- Help Buddy: guided assistance connected to authorized knowledge and workflows.
- Connected context: global time, news, market indicators and company announcements.
- One operating environment: connect approved productivity, workforce, service, security, governance and business systems.
- Governed by design: permissions, approvals and auditability are part of the platform story.

## Audience themes
- CEOs: organizational visibility and coordinated execution.
- COOs: fewer manual handoffs and clearer operational ownership.
- CFOs: transparent cost models and measurable value.
- CIOs / CTOs: integration, architecture, identity and operational control.
- CISOs: permission boundaries, risk evidence and governance.
- CHROs: employee experience, onboarding and workforce coordination.
- Department leaders: priorities, assignments, procedures and escalation.

## Content formats
Use a concise executive brief, role-specific landing page, workflow demonstration, architecture explainer, customer use case, competitive comparison and pilot scorecard. Keep one consistent message while changing the proof and examples for each audience.

## Campaign themes
1. End application hopping: show a complete cross-system task journey.
2. Bring the work to you: show how the work feed and Help Buddy reduce task discovery friction.
3. From global context to local action: connect global information and company announcements to operational priorities.
4. One governed operating environment: explain how people, systems, workflows and permissions fit together.

## Brand and claims discipline
Use approved IntelliStack and Maximus Optimus Command Center names and brand assets. Do not imply customer endorsements, certifications, live integrations, measured savings or product availability without evidence and approval.
$article$,
'CMO, Marketing, Sales, Business Development',
'marketing'
),
(
'Product Proof and Claim Register: Live, Verified, Planned and Unavailable',
'product-proof-and-claim-register',
'A required discipline for sales and marketing: every product statement must map to evidence and a current capability state.',
$article$
# Product Proof and Claim Register

## Capability labels
- **Implemented:** code or configuration exists.
- **Verified:** an end-to-end test passed in the named environment on a recorded date.
- **Configured:** a connector or provider is set up, but full operational coverage may not be verified.
- **Planned:** approved direction, not yet available for customer use.
- **Unavailable:** not currently supported or not configured.

## Evidence required for external claims
For each capability, record:
- Feature or integration name.
- Environment and version.
- Capability state.
- Test date and test method.
- Evidence link or artifact.
- Known limitations and dependencies.
- Product owner and approval for external use.

## Examples of claims requiring proof
- Help Buddy resolves a defined percentage of requests.
- Bring the Work to You reduces time spent searching for tasks.
- IntelliSync synchronizes a named system in real time.
- The global news feed or stock ticker is current and licensed for the intended use.
- Company announcements reach every intended employee.
- The platform is compliant with a named framework or certified standard.
- IntelliStack replaces a named competitor product or reduces software spending.

## Measurement discipline
Use a baseline, defined numerator and denominator, sample size, observation period and exclusions. Separate measured results from estimates and forecasts. Do not generalize a small pilot into an enterprise-wide outcome without qualification.

## Approval
Product and engineering validate capability. Security validates security claims. Finance validates financial claims. Legal or designated leadership approves external claims and customer references.

This article is the final checkpoint before any presentation, proposal, website statement or campaign is published.
$article$,
'Product, Engineering, Security, Finance, Legal, Sales, Marketing',
'proof-and-governance'
),
(
'Customer Use Cases: Cross-Department Workflows to Demonstrate',
'customer-use-cases-command-center',
'Practical customer scenarios that connect platform capabilities to measurable operational outcomes.',
$article$
# Customer Use Cases

## Employee onboarding
A new employee receives role-appropriate work, announcements and onboarding guidance. Help Buddy points to authorized procedures; HR and IT workflows retain their source records. Measure time to readiness, missed steps and support requests.

## Service request and escalation
An employee finds the right service path, submits or opens a ticket, receives guided next steps and follows the escalation status. Measure time to triage, reassignment, first-contact resolution and overdue work.

## Distributed operations handoff
A manager reviews global time, team announcements and assigned work before handing off a task to another region. Measure handoff completeness, delay and missed ownership.

## Executive situation awareness
An executive reviews company announcements, global news, market indicators and operational summaries in one environment. Each source should be labeled and timestamped. Measure information discovery and decision preparation time without implying that the platform makes the decision.

## Access request
A user discovers a restricted resource, requests access and follows the correct approval chain. The system records scope, approver, duration and expiry. Measure request cycle time and policy exceptions.

## Customer account coordination
Sales, service and operations review authorized customer context and coordinate the next action while the designated CRM or service system remains authoritative. Measure handoff delay and duplicate data entry.

## Use-case rule
For each customer demonstration, select one workflow that matches a real pain point. Identify participating roles, source systems, permissions, dependencies and success measures before presenting the outcome as available.
$article$,
'Sales, Solutions Engineering, Customer Success, Executive Leadership',
'use-cases'
)
)
insert into public.knowledge_articles (
  knowledge_base_id, title, slug, summary, body_md, status, visibility, published_at, metadata
)
select
  target_base.id,
  seed.title,
  seed.slug,
  seed.summary,
  seed.body_md,
  'published',
  'public_internal'::public.content_visibility,
  now(),
  jsonb_build_object(
    'collection', 'sales_market_intelligence',
    'audience', seed.audience,
    'topic', seed.topic,
    'content_version', 1,
    'claim_standard', 'evidence_backed'
  )
from target_base
cross join seed
on conflict (knowledge_base_id, slug) do update
set title = excluded.title,
    summary = excluded.summary,
    body_md = excluded.body_md,
    status = excluded.status,
    visibility = excluded.visibility,
    published_at = coalesce(knowledge_articles.published_at, excluded.published_at),
    metadata = excluded.metadata,
    updated_at = now();

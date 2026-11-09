# IntelliSync — architecture standard

IntelliSync is the shared backbone of the Maximus Optimus Global Command Center. This document records the standard, what this repository implements today, and exactly what remains before an external operation can be reported as successful.

> See everything locally, connect everything globally, powered by intelligence.

## 1. Layers

| Layer                         | Responsibility                                                            | Where it lives in this repository                                                           |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1 · Command Center            | The single user-facing environment                                        | `src/routes/*`, `src/components/command/*`                                                  |
| 2 · IntelliSync orchestration | Connectivity, coordination, health, identity resolution                   | `src/lib/intellisync/registry.ts`, `src/routes/intellisync.tsx`                             |
| 3 · Six engines               | Identity, assets, workflow, communications, events, governance            | `buildEngineRegistry()` — every service declares its state and evidence                     |
| 4 · Shared data               | One record per person, device, ticket, mission, approval, document, event | `src/lib/domain/types.ts`, `src/lib/domain/seed.ts`, target schema in `supabase/schema.sql` |
| 5 · External systems          | Directory, mail, calendar, MDM, monitoring                                | `ADAPTER_REQUIREMENTS` + the connector catalog in `src/routes/connectors.tsx`               |
| 6 · Experience                | Shared components and design tokens on the same services                  | `src/components/command/ui.tsx`, `src/styles/workspace.css`                                 |

## 2. One source of truth

All modules read and write the same command state through the reducer (`src/lib/domain/reducer.ts`). There is no per-page mock data:

- Missions, checkpoints, approvals, signatures, tasks, checklists, notes, knowledge, documents, connectors, sync events, recognition and activity are single collections.
- Every mutation is an action that returns a new state or a rejection reason. Nothing is changed by a component directly.
- Records are cross-referenced by id (`missionId`, `approvalId`, `documentId`, `connectorId`), so a change in one surface is immediately visible in another.

`CommandState` is the development stand-in for the Supabase layer. `supabase/schema.sql` defines the relational target — tables, keys, indexes and row-level security — so the same shapes can move server-side without redesigning the UI.

## 3. The six engines

`buildEngineRegistry(state)` derives each engine from real records:

1. **Identity and People** — people records, directory provisioning, task ownership.
2. **Assets and Devices** — device records and endpoint management. Device records are **not configured** in this build; device facts live inside mission steps and their evidence.
3. **Workflow and Mission** — missions, authorization decisions, handoffs and escalation.
4. **Communications** — email delivery and calendar invitations. Both require provider credentials and are reported **not configured** until then.
5. **Events and Synchronization** — the event stream, retries, suppressed duplicates and integration health.
6. **Security, Governance and Audit** — activity and ticket trails, the recognition ledger, and row-level security (defined in SQL, not yet enforced).

A service is only `operational` when the records behind it exist. `attention` means a connector reported a real problem. `not_configured` means the interface exists but the provider credentials do not.

## 4. Provider adapters

| Adapter                    | Capability                                | Required configuration                            | Status in this build             |
| -------------------------- | ----------------------------------------- | ------------------------------------------------- | -------------------------------- |
| Microsoft Entra ID         | Directory identity, groups, account state | Entra app registration + Graph scopes + tenant id | Not configured                   |
| Active Directory (on-prem) | OUs, groups, enable/disable               | LDAP endpoint + least-privilege service account   | Not configured                   |
| Email delivery             | Invitations and notifications             | SMTP or Graph `sendMail` + verified sender        | Not configured                   |
| Calendar provider          | Events, attendees, responses              | Calendar write scope + connected mailbox          | Not configured                   |
| Endpoint management        | Enrolment, compliance, remote actions     | MDM tenant + device write permissions             | Not configured                   |
| Network monitoring         | Interface and tunnel state                | Monitoring API token                              | Not configured                   |
| Workspace Library          | Original documents with permissions       | Local library root                                | Operational (read-only preview)  |
| IntelliDesk records        | Tickets, missions, approvals, audit       | Shared data layer (Supabase Postgres)             | Operational in the browser state |

Adapters are declared once. A connector that lacks its prerequisite cannot be switched to `connected`; the reducer rejects the action and the catalog shows the requirement (`connector.requirement`) instead of a success state.

## 5. Events

Every connector, document and mission operation appends a structured event (`SyncEvent`, `ActivityEvent`, `MissionEvent`). Events carry an id, timestamp, actor, target type, target id and label, plus a dedupe key where duplicates are possible.

Implemented behaviours:

- Duplicate suppression is recorded rather than silently dropped (`event.duplicate_suppressed`).
- Retries are recorded (`sync.retried`) and surface in the attention queue.
- Failed operations keep their failure message; no event is rewritten to look successful.

Planned event names from the standard (`user.created`, `directory.account.created`, `device.assigned`, `calendar.invitation.sent`, `email.delivery.failed`) map onto the same table with a `type` discriminator. They are only emitted by real adapters.

## 6. Operations

A user-facing control is only wired when it produces a state change. Every mission control in Help Buddy writes a recorded event:

| Control                | Action                                    | Recorded as                                      |
| ---------------------- | ----------------------------------------- | ------------------------------------------------ |
| Pause / resume         | `mission.pause`, `mission.resume`         | `mission.paused`, `mission.resumed`              |
| Request help           | `mission.requestHelp`                     | `mission.help_requested` + help request record   |
| Reassign a task        | `checkpoint.assign`                       | `mission.task_assigned` (ownership unchanged)    |
| Transfer mission       | `mission.transfer`                        | `mission.transferred`                            |
| Escalate               | `mission.escalate`                        | `mission.escalated`                              |
| History                | opens the Ticket Trail                    | read-only                                        |
| Final review / signoff | `mission.submitReview`, `mission.signoff` | `mission.review_submitted`, `mission.signed_off` |

Authorization is separate from work. `mission.authorize` creates a real approval record with a named approver; the gated step completes only when that approval is approved, and the completion is recorded with the approving administrator's name.

## 7. Security and governance

- Tenant and department are attributes of every person and record.
- Approval decisions are limited to the named approver (`canDecideApproval`), and the reducer rejects decisions from anyone else.
- Tasks assigned to another person can only be completed by that person; the mission owner keeps ownership of the mission.
- Destructive or restricted steps (directory access, groups, signoff) require an approval record or a signoff before completion.
- Nothing in the UI writes to an external system directly; all external effects are adapter calls that must return a provider result.

## 8. Acceptance test mapping

| Step from the standard                        | Status                                                       |
| --------------------------------------------- | ------------------------------------------------------------ |
| Create a new employee                         | Person records exist; creation UI is not in this scope       |
| Assign company, department, role, permissions | Roles and departments are modelled per person                |
| Create authorized directory identity          | Requires Entra/AD adapter — not configured                   |
| Associate platform and directory identity     | Identity resolution is modelled, directory side pending      |
| Assign a computer to the employee             | Device facts recorded in mission steps; asset engine pending |
| Verify the person-to-device relationship      | Recorded as step evidence                                    |
| Create a ticket for that employee             | `MO-2026-0016` and the IntelliDesk queue                     |
| Associate the ticket with their device        | Step results + evidence                                      |
| Assign the ticket to a technician             | Mission admission / transfer                                 |
| Accept the mission                            | Recorded separately from viewing                             |
| Help Buddy guides the technician              | Live mission window + grounded assistant                     |
| Create a calendar appointment                 | Requires calendar adapter — not configured                   |
| Invite with a verified email                  | Requires mail adapter — not configured                       |
| Send the invitation                           | Not sent; the requirement is displayed                       |
| Verify provider response                      | Not available until configured                               |
| Record event and invitation status            | Event table ready, no provider events yet                    |
| Update the ticket trail                       | Implemented for every mission action                         |
| Record audit                                  | Activity + ticket trail + recognition ledger                 |
| Verify module consistency                     | All surfaces read the same state                             |
| Test failures, retries, permissions           | Permission rejections and retries are covered by tests       |

## 9. Development rules applied

1. **Build once, use everywhere** — one reducer, one registry, one component system.
2. **Images never dictate architecture** — reference screenshots informed layout only; every control calls a real action.
3. **Real integrations mean real results** — unconfigured providers are labelled, never simulated.
4. **Every action leaves a trail** — activity, ticket trail and sync events.
5. **Never break what works** — the existing Command Center, routing and styles are preserved; the new workspaces extend them.

## 10. Remaining configuration

To move from browser state to a live platform:

1. Create the Supabase project and apply `supabase/schema.sql`.
2. Register the Entra application and grant the Graph scopes listed above.
3. Provide SMTP or Graph `sendMail` credentials with a verified sender.
4. Connect a calendar mailbox with write scope.
5. Register the MDM tenant and a monitoring API token.
6. Store every secret server-side (Supabase Edge Functions or a service layer); never in the client bundle.

Until those exist, the interface reports `Not configured` with the exact requirement.

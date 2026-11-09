# Implementation report — Maximus Optimus Global Command Center

This document records what was built for the three standards supplied (the workspace specification, the live mission workflow, and the IntelliSync architecture standard), how it was verified, and what still requires configuration outside this repository.

Screenshots: [`docs/screenshots/`](docs/screenshots). Architecture standard: [`docs/INTELLISYNC.md`](docs/INTELLISYNC.md). Target schema: [`supabase/schema.sql`](supabase/schema.sql).

---

## 1. Delivered surfaces

| Surface             | Route               | Highlights                                                                                                                                                                                          |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command Center      | `/`                 | Live work queue from real missions, approvals, signatures and tasks; connector cards that open their workspace in place; grounded Help Buddy answers; mission overlay that preserves queue context. |
| Help Buddy          | `/help-buddy`       | Live mission window + fifteen folder workspaces.                                                                                                                                                    |
| Mission Control     | `/mission-control`  | Three-column technician workspace with a recorded stage strip.                                                                                                                                      |
| Platform Connectors | `/connectors`       | Catalog, per-connector workspace, real document previews, link/import/attach.                                                                                                                       |
| IntelliSync         | `/intellisync`      | Six engines with per-service state, adapter requirements, event stream, retries, duplicates.                                                                                                        |
| Character Studio    | `/character-studio` | Nine-state character, appearance presets, voice and mission-aware messaging.                                                                                                                        |

The functional surfaces are integrated alongside the original Lovable dashboard, Supabase login and legacy workspace routes. Existing image assets and archived source projects are preserved; the original dashboard is also available at `/lovable-dashboard`.

---

## 2. Help Buddy: the live mission window

The window sits above the tabs and keeps mission context while tabs change.

**Header** — `MO-2026-0016`, title, priority, working/paused state, mission owner, `x of 16 steps completed`, mission switcher, identity switch, collapse.

**Character and greeting** — the Help Buddy character with a speech bubble that changes with reality: welcoming on a fresh mission, focused on the next actionable step, waiting when an authorization or another person is outstanding, concerned with a block, celebrating on signoff. The banner under the character repeats the count and the next actor.

**Progress** — verified count, percentage, and the split across done, in progress, awaiting others, verifying, blocked and not started. All derived from checkpoint states, never from a local counter.

**The sixteen steps** — every step carries its own title, description, individual star level (`3,2,1,1,2,2,3,3,5,3,3,2,4,4,4,5`), assignee and role, verification requirement, evidence flag, timestamps and status. Steps scroll independently.

**Statuses** — Not Started, In Progress, Pending Authorization, Waiting on Another Person, Pending Verification, Completed, Blocked. Each is a real `CheckpointState` with its own colour, transition rules and trail event.

**Dependencies** — `dependsOn` orders gate completion. Step 02 cannot complete until step 01 is authorized; step 09 (directory groups) cannot complete until account creation and its own approval. Attempting a blocked step returns the exact reason, naming the predecessor.

**Authorization is not a checkbox** — step 01 is seeded as _Pending Authorization_ against a real approval record owned by Marcus Johnson (Active Directory Administrator). `mission.authorize` creates the approval; only the named approver can decide it; approval auto-completes the gated step with "Authorization approved by the required administrator", awards its 3 stars, unlocks step 02 and writes to the trail. The approving name is stored on the checkpoint (`verifiedBy`).

**Handoffs do not move ownership** — `checkpoint.assign` sets the task assignee and role, flips the step to _Waiting on Another Person_, and records `mission.task_assigned`. The reducer refuses a completion recorded by anyone other than the assignee. The mission stays with Frank Mazerati.

**Mission team** — owner/technician, Active Directory Administrator, Security Administrator and Manager/Approver, with availability and responsibility. "Who needs to act next" explains the blocker in plain language.

**Records and governance** — documents, evidence, approvals, signatures, notes, activity, recognition and level, each opening its workspace.

**Controls** — Pause, Request Help, Reassign, Transfer, Escalate, History, Submit for Final Review. Each writes an event; pause genuinely blocks new outcomes until resumed; transfer moves ownership and keeps the trail; escalation records reason, expertise and receiving team.

**Completion** — requires every mandatory step, the resolution, a submitted review and a recorded signoff. `completionBlockers` reports exactly which requirement is missing.

---

## 3. Mission Control

Admission control separates viewing, accepting and starting: `mission.view` records a view without accepting; `mission.accept` starts SLA tracking without implying work; `mission.start` records work start. Decline requires a reason and returns the ticket to routing without resolving it. The stage strip shows _Offered → Viewed → Accepted → Work started → …_ with recorded timestamps and explicit "not recorded" states.

Checkpoints, pending, escalation, resolution, completion, notes, requester/SLA/playbook/documents context and the ticket trail are all separate panels driven by the same state. Completing with open checkpoints or a missing resolution is rejected with the specific reason.

---

## 4. Platform Connectors

- 18 connectors with statuses Connected, Syncing, Attention, Available, Disconnected. An unconfigured connector cannot be connected: the reducer rejects it with the requirement text.
- The workspace opens over the catalog and carries the provider header, health strip, activity list, file list, preview, actions and the recorded-action history.
- Previews are real: a dependency-free ZIP reader plus DOCX, XLSX and PPTX text extractors (`src/lib/documents/`). The sample files in `public/documents/` are genuine Office/PDF files produced by `scripts/generate-sample-documents.py`. PDFs, images, CSV, text and JSON render natively.
- Document actions (link original, import copy, attach to work item) require a target and are recorded with the mission or task they were attached to.

---

## 5. Recognition

Stars, XP, levels and badges are written only by recorded work, keyed by rule + source so a repeat cannot double-award. The 16-step mission awards stars equal to each task's own difficulty (`task_complexity` rule, 10 XP per star), so a 5-star administrator task is worth more than a 1-star inspection — and only when the qualifying event actually happened.

---

## 6. IntelliSync

`src/lib/intellisync/registry.ts` derives six engines and their services from real state:

| Engine                         | Services                                               | State                                                    |
| ------------------------------ | ------------------------------------------------------ | -------------------------------------------------------- |
| Identity and People            | People records, directory provisioning, task ownership | 2 operational · 1 not configured                         |
| Assets and Devices             | Device records, endpoint management                    | Not configured (no asset store in this build)            |
| Workflow and Mission           | Mission engine, authorization decisions, handoffs      | Operational                                              |
| Communications                 | Email delivery, calendar                               | Not configured (needs provider credentials)              |
| Events and Synchronization     | Event stream, integration health                       | Operational, attention where a connector reports a fault |
| Security, Governance and Audit | Activity/audit, recognition ledger, row-level security | 2 operational · RLS defined in SQL, not enforced yet     |

Eight provider adapters declare capability plus the exact configuration they need. `/intellisync` renders the registry, the adapter table, the event stream (with retries and suppressed duplicates) and the layer standard. Nothing is reported successful without a record behind it.

---

## 7. Verification

| Check               | Result                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| `bun x tsc --noEmit` | 0 errors (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Actions lint sequence | 0 errors; 44 existing Fast Refresh warnings after formatting |
| `bun run test` | 55 tests passing, including exact portal membership and portal-boundary cases |
| `bun run build` | GitHub Pages static build succeeds; prerenders `/` and `/login` to `.output/public` |
| Pages artifact checks | `index.html`, `login/index.html`, `404.html`, and `.nojekyll` verified locally |

Domain tests cover: viewing ≠ accepting ≠ starting; decline returns the ticket without resolving it; completion blocked by open checkpoints; stars awarded once per checkpoint; approval authority; signature independence from approvals; connector prerequisites; document actions; grounded assistant answers; the sixteen-step structure; dependency gating; authorization separation (technician rejected, administrator approval completes the step and awards 3 stars); assignee-only completion; handoffs; pause/resume; help requests; transfer; review and signoff gates.

The source implementation had browser interaction checks for dashboard persistence, connector previews, mission step dependencies, and the administrator authorization loop. This test-repository integration is additionally validated by the route/domain suite and static Pages artifact checks. Portal sign-in itself requires the Supabase membership migration and provisioned accounts before it can be exercised end-to-end.

---

## 8. Deliberate limitations

- **External provider actions require configuration.** Directory writes, email delivery, calendar invitations and MDM actions are represented by adapters that report their requirement. They are never simulated.
- **Command Center demo state is browser-persisted and public in this static preview.** The root demo is intentionally open for preview and contains no private production records; it must not be connected to live customer data without server-side route authorization and database policies.
- **Portal assignments require migration and provisioning.** `/login` exposes separate IntelliStack, IntelliStaff, IntelliWork, IntelliHire, and Tenant entry points. `user_portal_memberships` assigns exactly one portal to a Supabase auth user, the authenticated client can read only its own assignment, and mismatches fail closed. Apply `supabase/schema.sql` and provision rows through a trusted admin/service-role process before expecting real login to succeed.
- **Workforce consoles are not included yet.** IntelliStaff is the planned operator portal for job postings, job seekers, companies, and matching; IntelliWork and IntelliHire are separate job-seeker and employer entry points. This static preview provides their separate login/verified states, not the full workforce management or candidate/employer product modules.
- **Command Center ownership is separate.** Only IntelliStack sign-in is directed to the Maximus Optimus Command Center. IntelliStaff, IntelliWork, IntelliHire, and Tenant identities are not granted IntelliStack portal membership.
- **Demo identity switch.** Help Buddy exposes an "Act as" control so the approval loop can be exercised. Decisions still belong to the named approver and the reducer rejects anyone else.
- **PDF previews** render through the browser viewer; text extraction is limited to DOCX/XLSX/PPTX/TXT/CSV/JSON.
- **Device records** exist inside mission steps and evidence rather than a first-class asset engine, which is why that engine reports _Not configured_.

---

## 9. Master Command Menu

The hamburger menu is driven by `src/lib/menu-spec.ts`, which encodes the published specification rather than a hand-written list:

- **13 native sections** — My Business Center, Command Center, New Active Directory, Productivity, Communication, Collaboration, Knowledge Base, AI Systems, Network Operations Center, Security, Governance, Audit, Settings — plus a **separate External Connectors block**.
- **230 destinations**, each with a unique address (`/section/<slug>`), an owning application and its own page. Merging, duplicating or hiding functions inside generic entries is prevented by the data model.
- **Every destination renders** an ownership panel, the twelve shared platform services, live shared-record counts, real recorded activity for that area, sibling destinations, and a direct link when a bespoke workspace exists (Help Buddy, Mission Control, Connectors, IntelliSync, Character Studio).
- **Search** across labels, groups, sections and owners; **drag-to-reorder** native sections with the order persisted; **Settings stays last** even after a drag; external connectors stay visually and structurally separate, labelled "Third-party applications — not IntelliStack products".
- **Role filtering**: My Business Center and Governance require manager or administrator, and the menu states how many sections are restricted for the signed-in role.
- **Tenant Desk rule**: tenant tickets, service requests, work queues, escalations, support history and activity exist only inside IntelliDesk › Tenant Desk; tenant business and knowledge records stay with their owning applications.

The menu is reachable from every screen: the dashboard header, every workspace shell and every section page.

## 10. Help Buddy character

The mascot is generated from the supplied brand reference and shipped as two assets: [`help-buddy-character.png`](src/assets/help-buddy-character.png) (full body, transparent) and `help-buddy-face.png` (avatar crop). He wears the royal-blue zip hoodie with white trim, the `I` shield on the chest, and the white-and-blue headset with boom microphone.

- Help Buddy workspace: full-body stage with the nine interaction states (idle, listening, thinking, speaking, working, responding, success, concerned, escalation), state badge, halo and name plate.
- Mission window and dashboard: face avatar and a character strip that names the current workload ("8 things are waiting on you") and the product line "Ask. Find. Connect. Get it done."
- The dashboard portrait and shield were also repaired: the Lovable-hosted asset URLs 404'd locally, so the founder portrait and the IntelliStack shield are now bundled (`public/brand/frank.jpg`, `public/brand/shield.svg`).

## 11. Running it

```sh
bun install
bun run dev
bun run lint
bun run test
bun run build
```

The existing `Build 004 - Global Command Center` GitHub Actions workflow verifies, builds, uploads and deploys `.output/public` to GitHub Pages. Its successful run exposes the site link through the `github-pages` environment and the “Deploy website” step. The current site URL is <https://frankmazerati.github.io/Global_Command_Center_Test/>. GitHub Pages has a single URL for this repository: manually deploying a feature branch publishes that branch to the same test site, not to a separate branch-specific URL. The Vite and TanStack Router base paths must remain `/Global_Command_Center_Test/`.

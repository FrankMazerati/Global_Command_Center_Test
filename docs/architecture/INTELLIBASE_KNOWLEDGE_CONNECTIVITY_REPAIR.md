# IntelliBase Knowledge Connectivity Repair

Date: 2026-11-14

## Scope

Repair the existing IntelliBase page-to-collection routing without adding new knowledge bases, navigation environments, or database tables.

## Root cause

The shared `KnowledgeSpacesWorkspace` selected collections by substring matching against the page slug. In particular, the generic `pageSlug.includes("platform")` check routed platform reference pages toward the Getting Started collection. Several existing IntelliBase pages (including Welcome, Technical Procedures, Integration Guides, Business Procedures, Idea Ledger pages, and Training pages) had no matching condition and therefore displayed no collection.

## Repair

- Replaced broad substring routing with an explicit page-slug-to-knowledge-base mapping for every current IntelliBase leaf page.
- Made Featured Knowledge and Recently Updated show all collections readable by the current signed-in user.
- Limited the collection filter to collections assigned to the current page.
- Reset collection selection and selected article when navigating to another IntelliBase page.
- Excluded `assistant_private` collections from the human-facing browser; the database policies remain authoritative for row access.
- Preserved the existing shared workspace and current navigation. No new menus or tables were added.

## Supabase audit snapshot

The connected project was inspected read-only. At audit time it contained 11 active knowledge bases and 114 published articles. The current row-level policies on `knowledge_bases` and `knowledge_articles` use `kb_can_read_base` and `kb_can_manage`; published human-readable article selection also excludes `assistant_private` visibility. The UI does not bypass those policies.

Several collections have short starter articles. This repair makes existing content discoverable; it does not claim that all knowledge articles are fully authored or complete.

## Verification performed

- Confirmed every current IntelliBase leaf-page slug has an explicit mapping.
- Confirmed the old broad `platform` substring condition is removed.
- Confirmed assistant-private visibility is excluded from the browser query.
- Confirmed the change is isolated to the existing knowledge workspace component plus this verification record and a repeatable CI workflow.

## Verification still required

The GitHub Actions workflow runs lint, tests, and the production build. The application must not be marked build-verified until those checks complete successfully. A signed-in browser smoke test is also required to confirm the user's account sees the correct authorized collections and can open article details.


## Connector Hub and IntelliSync audit

Read-only inspection of the connected Supabase project found:

- `integration_provider_catalog`: 169 provider catalog records.
- `integration_connections`: 0 connection records.
- `integration_connection_events`: 0 events.
- `integration_sync_runs`: 0 runs.
- IntelliSync operational tables (profiles, connection bindings, events, deliveries, runs, policies, conflicts, and audit): all currently contain 0 records.

The Supabase Edge Function `intellisync-api` is active (JWT verification enabled). Its current actions are event emission, listing events, listing connections, and health reporting. It does not currently expose a provider OAuth/connect flow, create or revoke a provider connection, start a synchronization run, or configure a schedule. Therefore the backend has an IntelliSync event/API foundation, but no live connector or synchronization configuration has been established.

The IntelliSync schema tables have RLS enabled and no direct table policies. The current IntelliSync RPC functions are granted to `service_role`, not directly to `authenticated`; this is consistent with keeping the sync tables server-side. Do not add broad client policies to make the tables appear in the browser.

The connector catalog is not proof that a provider is connected. The current connection count is zero.

## Supabase advisor snapshot

The project's advisor scan reported:

- Security: 49 RLS-enabled tables with no policies (a mix of internal schemas and public tables; review each table's intended exposure rather than adding blanket policies).
- Security: 16 SECURITY DEFINER functions executable by signed-in users. These require function-by-function authorization review; do not revoke them blindly because some are intentional authorization helpers or guarded workflows.
- Security: leaked-password protection is disabled in Supabase Auth and should be enabled before production use.
- Performance: 199 unindexed foreign keys, 51 RLS auth-initplan findings, 241 unused indexes, and 36 multiple-permissive-policy findings.
- Health advisor: no findings returned in this scan.

These findings are recorded for controlled remediation. No database policy, function, auth setting, or schema was changed during this repair.

## Conversation connector requirement

The prior conversation search recovered the Connector Hub subscription/seat-management discussion (approximately 20 connectors, with purchased, assigned, available, and pending seats). It did not recover a definitive connector name or implementation design for the separate “main conversation” connector. That requirement remains open and must not be guessed or merged into IntelliSync without confirmation.


## Connector Hub / IntelliSync frontend wiring

The repair branch now routes the existing Connector Hub and IntelliSync environments to purpose-built status workspaces:

- Connector Hub reads the approved provider catalog and authorized connection records. It distinguishes catalog entries from real connected accounts and deliberately does not display a fake Connect action while provider authorization is absent.
- IntelliSync calls the existing JWT-protected `intellisync-api` Edge Function for health, connection bindings, and recent events. It shows the API's actual state and does not invent job controls that the API does not expose.

A second schema inventory found no connector-specific subscription or seat-allocation tables. Generic Marketplace subscription tables exist, but they are not proof of Connector Hub purchased/assigned/available seat tracking. The prior Connector Hub subscription and seat-management requirement remains a separate implementation gap.

The current PR is a focused repair and status-wiring pass; it does not claim to complete provider OAuth, credential vaulting, webhook setup, sync scheduling, retry/reconciliation, or connector seat entitlements.

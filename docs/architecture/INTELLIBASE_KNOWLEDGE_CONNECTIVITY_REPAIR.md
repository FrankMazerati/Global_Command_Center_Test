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

# Maximus Optimus Global Command Center

This test repository keeps the original Lovable-built Global Command Center, its image assets, and archived source material, while adding the expanded Maximus Optimus workflow implementation: Help Buddy, Mission Control, Platform Connectors, IntelliSync, the domain state engine, and the master navigation.

## Live GitHub Pages site

The repository's GitHub Pages site is: <https://frankmazerati.github.io/Global_Command_Center_Test/>.

The existing **Build 004 - Global Command Center** workflow in GitHub Actions installs dependencies, formats and lints, runs tests, builds the static site, uploads the Pages artifact, and deploys it. Open the workflow run and click the `github-pages` environment URL (or its “Deploy website” link) to open the site. GitHub Pages provides one site URL for this repository; deploying a branch updates that test site rather than creating a separate branch-specific URL.

The workflow deploys pushes to `main` and can also be manually run with `workflow_dispatch` against a selected branch. The published app uses the repository subpath `/Global_Command_Center_Test/`; keep the matching Vite base path and router base path when changing deployment configuration.

## Separate login portals

`/login` presents five separate entry points: IntelliStack Systems, IntelliStaff, IntelliWork, IntelliHire, and Tenant / Organization. The three workforce cards—IntelliStaff, IntelliWork, and IntelliHire—share the purple brand but have portal-specific slogans, field labels, reset text, and account copy. IntelliStaff is the operator/team entry point for managing job postings, job seekers, companies, and matching; IntelliWork is for people seeking work; IntelliHire is for employers and companies. The IntelliStack portal is the owner/admin entry point for the Command Center; Tenant remains separate.

A portal card alone never grants access. `user_portal_memberships` maps each Supabase auth account to exactly one portal. The sign-in flow verifies that assignment after password authentication, rejects mismatches, and signs out; protected legacy routes check the membership again. Portal rows must be provisioned through a trusted administrator or service-role workflow, not from the browser.

`supabase/schema.sql` contains the membership table and read-own-row RLS policy, but it is a migration target and is **not applied automatically**. Until that schema is applied and each account is assigned, portal sign-in fails closed. The separate workforce entry points are present, but the full job-posting, candidate, company, and matching consoles are not part of this static preview yet.

The `/` Command Center is a public, static demo so the Pages preview can be opened without credentials; it uses browser-local demo state and contains no private production records. Only the IntelliStack sign-in flow directs an authenticated account into the Command Center. Do not connect private customer data to the public static demo without adding server-side authentication and corresponding database policies.

## Main areas

- `/` — integrated Maximus Optimus command-center demo.
- `/login` — separate IntelliStack, IntelliStaff, IntelliWork, IntelliHire, and Tenant portal entry points.
- `/help-buddy` — intelligent assistant, mission window, checklists, approvals, knowledge, tasks, and related tabs.
- `/mission-control` — technician workflow for mission admission, execution, and resolution.
- `/connectors` — platform connector catalog and document previews.
- `/intellisync` — orchestration and service registry.
- `/character-studio` — character profile and artwork controls.
- `/lovable-dashboard` — the previous Lovable-built dashboard, retained as a separate route. The older `/m/*` workspace routes and Supabase sign-in remain available to authorized IntelliStack and tenant memberships.

The original repository images and `source-projects/` archives are retained. The initial root shell, router, Vite config, CSS, dashboard source, and routing test are additionally preserved in `source-projects/lovable-baseline/`.

## Development and checks

This project uses Bun and the repository's committed `bun.lock`:

```bash
bun install
bun run dev
bun run lint
bun run test
bun run build
```

Real sign-in requires `VITE_SUPABASE_URL` plus a publishable/anon key, the portal-membership migration, and a trusted assignment row for each account. The workflow's Pages build itself is static and does not require credentials.

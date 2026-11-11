# Corrected Login + Home Build

## Scope
Rework the Global Command Center test repository so the `/login` and `/` experiences match the supplied dark blue HUD reference: compact operational navigation, a clear Maximus Optimus identity header, profile/status context, quick picks, work queue, Help Buddy assistant, and responsive mobile/tablet behavior.

## Design
- **Design movement:** cinematic mission-control HUD with restrained glass panels and luminous cyan/blue controls.
- **Core principles:** information-dense but legible; hierarchy before decoration; every primary control has a clear action; mobile preserves the same command-center order.
- **Color philosophy:** near-black navy gives the interface operational depth; cyan marks active intelligence and navigation; violet/green are reserved for module/status differentiation.
- **Layout paradigm:** persistent command shell with a compact rail, a wide work canvas, and a dedicated assistant rail rather than a centered marketing layout.
- **Signature elements:** shield identity mark, thin cyan frame lines, and the Help Buddy assistant card with action chips.
- **Interaction philosophy:** fast, direct, stateful controls; quick picks route into existing destinations, and ticket operations use the signed-in Supabase session, server-validated lifecycle rules, and existing row-level security rather than local demo state.
- **Animation:** subtle hover glow and active-state lift only; respect reduced-motion preferences.
- **Typography:** Orbitron for product/section labels and Exo 2 for operational copy.
- **Brand essence:** one intelligent network for people who need a calm, high-signal operating view; precise, confident, connected.
- **Brand voice examples:** “Your command center is ready.” / “Bring the work to you.”
- **Wordmark/mark:** use the supplied IntelliStack shield image beside the MAXIMUS OPTIMUS wordmark.
- **Signature brand color:** electric cyan (#35d7ff).

## Implementation
- Use the existing TanStack Router and Supabase client.
- Keep `/login` outside the authenticated AppShell, and keep internal destination routes inside it.
- Render `/` in its own authenticated full-screen command-center shell so the home page is not wrapped in the older generic header/footer.
- Reuse supplied shield/profile images plus the clean command-center environment image already present in the connected repository.
- Add a static route manifest for `/` and `/login`.

## Ticket lifecycle continuity

Implement ticket creation, visible queues, detail edits, authorized status transitions, requester/public and internal conversation, SLA context, Knowledge Base/Help Buddy entry points, and audit history as one real Supabase workflow. The browser uses the signed-in session for reads and writes; `create_portal_ticket`, `update_ticket_details`, and `apply_ticket_transition` are SECURITY INVOKER functions so existing role, organization, tenant, and RLS policies remain authoritative. Existing trigger-only audit functions write minimal event metadata, changed field names, actors, tenant scope, and request identifiers without copying ticket descriptions or message bodies. Route ticket catalog pages into dedicated queue and detail workspaces; do not add blanket policies, browser service-role credentials, or sample ticket fallbacks. The additive migration assumes the deployed ticket foundation and prior audit/SLA migrations already exist.

## Migration & Pilot Center — next implementation workstream

The official-source capability matrix is in [`docs/architecture/microsoft-migration-capabilities.md`](docs/architecture/microsoft-migration-capabilities.md). Build this as an IntelliSync-managed, tenant-scoped pilot and migration control plane, not as a generic file-copy button. Each customer pilot supports a maximum of 1,000 explicitly enrolled users, a selected 30- or 60-day window, scoped modules/workloads, an end-of-pilot questionnaire, and customer-controlled retention. Program and source objects must bind to the organization, tenant, immutable provider tenant ID, and source object ID. No client-supplied tenant ID alone may authorize a read or write.

The flow is: onboard the company and its approved cohort; declare each source workload, consent, license/prerequisites, endpoint, destination importer, mapping and exclusions; run read-only inventory; validate field mappings and produce a dry-run manifest; require explicit customer-owner approval; execute only approved operations in resumable, idempotent batches with bounded concurrency and provider-directed retry; reconcile source/destination identities, counts, permissions and exceptions; then collect feedback after the pilot ends. Admin consent to read a source is not approval to write to a destination. Deactivation, deletion, device deregistration, permission changes, or authentication cutover each need their own explicit approval and validation step.

Represent readiness truthfully per workload (`ready`, `blocked`, `partial`, or `unknown`) with evidence and an owner. Existing connector-catalog rows marked `catalog_only` are not connected integrations. Keep source extraction, destination writing, and role/permission mapping as separate adapters. Do not claim a successful migration solely because OAuth succeeded. Keep credentials, access tokens, SCIM secrets, passwords, private keys, and file content out of browser code, logs, and audit metadata; use server-side secret storage, least privilege, and tenant-scoped authorization.

Known Microsoft boundaries from the source review must remain visible in the product: AD DS requires a customer-approved Entra hybrid path or a customer-operated on-prem connector; password hashes cannot be copied to this application; Entra/SCIM or a supported sign-in flow is required for accounts. Intune device inventory is not equivalent to transferring device ownership/management, and Autopilot tenant transfer is a separate controlled operation. OneDrive/SharePoint content requires its own source and target file/permission adapter; the current IntelliDrive destination is not yet verified for bulk import. Sticky Notes access is user-delegated, not a tenant-wide app-only extraction. Edge favorites have a user export/import path; toolbars, profiles, extensions, and app policies do not have one universal migration endpoint. App registrations, assignments and consent can be inventoried, but secrets must be recreated and consented, never exported. See the linked report for sources and endpoint-specific caveats.

The repository must not invent operational history. Historical tickets, users, devices, sales or audits shown as real must come from authorized company exports or live system sources. Generated sample data may be used only in a visibly labeled, isolated demo tenant; seed metadata such as `company_history_seed_v1` must never be presented as verified company history.

No customer Microsoft tenant is currently connected in this coding environment. Until a supported source connector, verified destination importer, required tenant/app authorization, and customer-approved scope are configured, the UI must show an honest setup/readiness state and must not display a fake `Connected`, inventory count, completed migration, or success status.

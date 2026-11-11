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

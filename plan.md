# Corrected Login + Home Build

## Scope
Rework the Global Command Center test repository so the `/login` and `/` experiences match the supplied dark blue HUD reference: compact operational navigation, a clear Maximus Optimus identity header, profile/status context, quick picks, work queue, Help Buddy assistant, and responsive mobile/tablet behavior.

## Design
- **Design movement:** cinematic mission-control HUD with restrained glass panels and luminous cyan/blue controls.
- **Core principles:** information-dense but legible; hierarchy before decoration; every primary control has a clear action; mobile preserves the same command-center order.
- **Color philosophy:** near-black navy gives the interface operational depth; cyan marks active intelligence and navigation; violet/green are reserved for module/status differentiation.
- **Layout paradigm:** persistent command shell with a compact rail, a wide work canvas, and a dedicated assistant rail rather than a centered marketing layout.
- **Signature elements:** shield identity mark, thin cyan frame lines, and the Help Buddy assistant card with action chips.
- **Interaction philosophy:** fast, direct, stateful controls; quick picks route into the existing destination system, task actions update local demo state, and assistant messages remain visible in the current session.
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

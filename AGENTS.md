## Project operating rules
- Keep development on the existing feature branch until the user explicitly approves a merge or deployment. Do not create paid infrastructure, new database branches, or subscriptions.
- Use the existing GitHub, Supabase, and Vercel/Netlify resources and their current allowances. Never introduce a paid dependency or service as a prerequisite.
- Do not rewrite published Git history. Keep commits fast-forward and preserve the existing branch history.
- Database changes must be delivered as reviewed, version-controlled migrations. Do not apply schema changes to the live project without explicit authorization and a verified safe rollout plan. Prefer read-only inspection and application-layer work until then.
- Never put secrets in the repository or browser code. Use the existing server-side secret/configuration mechanism.
- Do not edit generated files unless the owning generator is part of the approved workflow.

## Project rules
- Navigation is data-driven from `src/lib/nav.ts`; every menu item resolves to `/m/$section/$group/$page`, so add pages by editing that data, not by adding route files. Why: one source keeps menu, search, breadcrumbs and routes in sync.
- Cross-section working state (active ticket, Chat Buddy, notes, checklist) lives in `WorkContextProvider` mounted in `__root.tsx` around the shell. Why: the ticket must stay the working context across navigation.
- Ticket tools open as panels inside the ticket workspace (`src/components/workspace/TicketWorkspace.tsx`), never as navigation away. Why: core product requirement.
- All ticket mutations must be authorized and validated server-side. Client-side status checks are usability aids, not security controls.
- Label unavailable, sample, and unconfigured integrations honestly. Never simulate successful backend writes.

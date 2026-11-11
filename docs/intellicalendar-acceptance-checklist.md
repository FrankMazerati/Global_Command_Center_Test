# IntelliCalendar — Acceptance & Regression Checklist

Run this checklist in the isolated feature branch before merge or activation.

## Build and code quality
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Confirm TanStack route generation and TypeScript compilation complete without errors.
- [ ] Confirm the dedicated workspace renders from Collaboration → IntelliStack Collaboration Tools → IntelliCalendar.
- [ ] Confirm the global hamburger destination and dashboard quick link both resolve to the same page.

## Calendar interaction
- [ ] Month, week, and day views render correctly at mobile, tablet, and desktop widths.
- [ ] Previous, next, and Today navigation preserve the selected view.
- [ ] Creating an event requires a title and a valid end time after its start.
- [ ] All-day, category, location, and description fields persist.
- [ ] Editing an event updates only the selected event.
- [ ] Deleting an event requires confirmation and removes only the selected event.
- [ ] Search and category filters update both the calendar and upcoming list.
- [ ] Events spanning a date boundary are reviewed for correct display in all relevant days.
- [ ] Empty, loading, signed-out, missing-table, and backend-error states are readable and truthful.

## Security and tenant isolation
- [ ] Anonymous users cannot read or mutate event records.
- [ ] User A cannot read, update, or delete User B's private events.
- [ ] Event owners can manage only their own records.
- [ ] An invited member can read only the event explicitly shared with them.
- [ ] Event membership cannot be self-granted.
- [ ] A revoked member loses access immediately.
- [ ] Verify RLS behavior with at least two real authenticated test accounts and direct API requests, not only UI navigation.

## Integrations and external services
- [ ] Microsoft 365 and Google Calendar remain labeled disconnected until OAuth is configured.
- [ ] No tokens or provider secrets are stored in browser-visible code.
- [ ] Sync conflict handling, recurrence, reminders, attendee RSVP, resource booking, and audit delivery are not advertised as active until implemented and tested.

## Activation gate
The SQL migration must be applied through the approved Supabase migration process. Then run the complete checks above and inspect GitHub Actions results. Do not merge or advertise live calendar persistence until build, tests, RLS, and authenticated CRUD checks pass.

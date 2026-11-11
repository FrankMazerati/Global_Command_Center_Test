# IntelliCalendar — Foundation & Build Notes

**Product:** IntelliCalendar  
**Platform:** Maximus Optimus Command Center  
**Brand:** IntelliStack Systems, Incorporated  
**Build branch:** `feature/intellicalendar-foundation`

## Product identity

IntelliCalendar is the native scheduling and time-coordination workspace for the Command Center. Its visual system uses deep navy/black surfaces, electric blue and cyan highlights, luminous fine borders, glass-like panels, Orbitron/Exo 2 typography already present in the application, and the IntelliStack product voice.

Signature copy:
- “See everything, connect everything, work smarter.”
- “Think beyond locally, connect everything globally, powered by intelligence.”
- “One world. One schedule. One intelligent network.”

## Included in this foundation

- Dedicated IntelliCalendar workspace on the existing Collaboration → IntelliStack Collaboration Tools → IntelliCalendar destination.
- Month, week, and day calendar views with previous/next and Today navigation.
- Real Supabase-backed event list and CRUD (create, read, update, delete).
- Event title, description, start/end, all-day flag, location, and category.
- Search, category filter, upcoming event list, and mobile-friendly layout.
- Clear loading, sign-in, missing-migration, and backend-error states.
- Row-level security: owners can create/update/delete their events; invited members can read shared events; event membership is managed by the event owner.

## Data integrity and security

No fabricated calendar events or fake connected accounts are seeded. The workspace reads only authenticated user's authorized rows. A missing table or unavailable Supabase connection is reported as unavailable rather than replaced with sample records.

The migration creates:
- `public.calendar_events`
- `public.calendar_event_members`
- Owner/member read policy and owner-only event mutation policies
- Indexes for owner/date queries and an update timestamp trigger

**Important:** committing a migration file does not apply it to the live Supabase project. Apply it through the approved migration workflow before treating event persistence as active.

## Planned next increments

1. Calendar collections: personal, department, team, company, resource, and executive calendars with explicit grants.
2. Invitations, RSVP, attendee availability, and meeting-room/resource reservations.
3. Recurrence rules, exceptions, reminders, and notification delivery.
4. Microsoft 365 Outlook and Google Calendar OAuth connections, sync cursors, conflict detection, and disconnect/revoke controls.
5. IntelliChat meeting threads, IntelliTasks follow-ups, IntelliMail invitations, and Chat Buddy scheduling assistance.
6. Time-zone comparison, working hours, scheduling polls, booking pages, and external guest controls.
7. Audit history, retention controls, export, accessibility review, and automated end-to-end tests.

## Validation status

Source integration is prepared on an isolated feature branch. Runtime build, lint, tests, Supabase migration application, RLS verification against live roles, and browser/device checks remain to be run in the repository's normal GitHub Actions environment. Do not label those checks as passed until their workflow results are observed.

# Global Platform Completeness and Account Center Specification

**Product:** Maximus Optimus Command Center  
**Company:** IntelliStack Systems, Incorporated  
**Suite:** IntelliSphere  
**Status:** Product requirements baseline — implementation and verification tracked separately  
**Design principle:** Every feature is designed as part of a complete global enterprise platform, not as an isolated screen.

## 1. Product-wide design standard

Before adding a page, menu item, workflow, or data object, define:
1. Who uses it: Global Admin, tenant/company admin, executive, manager, employee, contractor, Help Desk L1/L2/L3, service-desk lead/manager, SOC, NOC, Governance/Audit, vendor/partner, customer, or external visitor.
2. The user's task, decisions, and expected outcomes.
3. Read, create, update, approve, export, delete, delegate, and administer permissions separately.
4. Data ownership and scope: personal, employer-managed, tenant, company, organization, global platform, public, confidential, regulated, or security-sensitive.
5. Source of truth, persistence, validation, retention, localization, audit events, and data provenance.
6. Empty, loading, unavailable, not configured, denied, expired, pending approval, success, failure, and recovery states.
7. Responsive behavior, accessibility, keyboard navigation, mobile/tablet layout, and internationalization.
8. API/RPC and database enforcement. Hiding a control is never authorization.
9. Telemetry, supportability, tests, documentation, and operational ownership.
10. Dependencies and integration status. Never label a mock, sample, or disconnected service as live.

## 2. Account Center information architecture

The top-bar profile control opens a compact identity summary and links to a full Account Center. The dropdown is not a substitute for the full account workspace.

### Account Center sections

1. **Overview**
   - Profile photo/avatar, display name, preferred name, pronouns only if voluntarily supplied, headline, job title, company, department, location, timezone, language, presence, and account status.
   - Personal welcome message and role-appropriate shortcuts.
   - Account health, pending actions, incomplete setup, recent sign-ins, active sessions, and security notices.
   - Clear distinction between editable personal data and employer/global-admin-controlled identity attributes.

2. **Personal and professional profile**
   - Legal name where required, display/preferred name, biography/about, professional headline, skills, experience, education, certifications, languages, portfolio/personal website, public profile URL, LinkedIn profile URL, profile photo, cover/background image.
   - Profile visibility controls: private, organization, tenant/company, approved external audience, or public where product policy permits.
   - Public directory card preview and external profile preview.
   - Work contact and optional personal contact fields with field-level visibility.
   - Profile completeness indicator and save/cancel/version history.
   - Do not scrape LinkedIn or imply LinkedIn integration without an approved API/OAuth integration. A URL field is not a LinkedIn connection.

3. **Employment and organization**
   - Employee/contractor/vendor/customer classification; employee Global ID, Company ID, User ID; employer and tenant; department, team, organizational unit, manager, work location, employment status, start/end dates where authorized, worker type, cost center, and work contact.
   - Employer-managed fields are read-only to the employee and editable only by authorized HR/directory administrators.
   - Reporting structure and group memberships are visible only within scope.

4. **Recognition and development**
   - Badge catalog and earned badges, levels, progress, award dates, criteria, evidence, and issuer.
   - Stars, recognition messages, XP, levels, contribution ledger, leaderboards, skills, certifications, training, objectives, performance history, career opportunities, and rewards.
   - Separate private manager notes and employee-visible feedback; role-based visibility and retention.

5. **Security and sign-in**
   - Password change/reset flow, MFA enrollment and recovery, passkeys where supported, SSO identity providers, authenticator methods, recovery codes, trusted devices, active sessions, sign-in history, suspicious activity, login alerts, security keys, connected identity providers, and account recovery.
   - Session revocation and sign-out-all-devices with reauthentication for sensitive actions.
   - Account lock, disable, recovery, and risk states with administrator workflows.
   - Never display secrets, password hashes, full payment credentials, MFA seeds, recovery codes after initial display, or private tokens.

6. **Privacy and data rights**
   - Profile visibility and discoverability, contact preferences, presence visibility, directory listing, data-sharing and integration consent, analytics/AI personalization controls, export-my-data request, correction request, deletion/deactivation request, retention notices, and consent history.
   - Explain employer-managed records and legal/contractual retention limits; do not promise deletion where retention obligations apply.
   - Privacy notices are versioned and acceptance/acknowledgment is auditable.

7. **Payment methods and billing (conditional)**
   - Personal payment methods only where a user is a purchaser or subscriber; company payment instruments belong in the company billing workspace.
   - Tokenized payment provider references, card brand and last four digits only, expiry, billing address, default method, invoices/receipts, subscriptions, renewals, credits, refunds, tax/VAT details, purchase history, and billing contacts.
   - Never store raw card number, CVV, bank credentials, or payment secrets in application tables. Use a PCI-compliant payment provider's hosted/tokenized flows.
   - Employees must not see company financial instruments unless explicitly authorized. Contractors and end users only see their own permitted billing records.

8. **Connected apps and integrations**
   - Connected apps, provider, account identity, scopes/permissions, connection owner, status, last sync, token expiry, data shared, disconnect/reconnect, reauthorization, and audit history.
   - Microsoft 365, Google Workspace, Entra ID, AWS, GitHub, Apple, and other providers only show connected status when a real OAuth/API connection is verified.
   - Least-privilege scopes; disconnect/revoke; never expose raw access or refresh tokens.

9. **Preferences and accessibility**
   - Theme, colors, density, dashboard layout, favorite modules, navigation ordering, notification channels and quiet hours, language, locale, timezone, date/time/number/currency formats, accessibility, reduced motion, text scaling, keyboard preferences, and AI assistant preferences.
   - User preferences do not override organizational security policy or legal requirements.

10. **Devices and sessions**
    - Device inventory relevant to the user's account, device name/type, OS/browser, last seen, trust/compliance state, registration, session association, remote sign-out, lost-device reporting, and approved device actions.
    - IT asset ownership and device-management actions remain restricted to authorized IT roles.

11. **Notifications and communications**
    - In-app, email, SMS, push, digest, escalation, security, billing, HR, approval, and operational notification preferences.
    - Notification history, delivery state, read/unread, snooze, unsubscribe where legally allowed, and mandatory-notice explanations.

12. **Activity and audit visibility**
    - User-visible recent activity, profile changes, sign-ins, access requests, approvals, recognitions, and integration changes.
    - Sensitive administrative audit logs remain restricted; users can see relevant events without exposing another person's confidential activity.

13. **Help and support**
    - Help Buddy / Chat Buddy, knowledge articles, create support ticket, contact support, accessibility help, report a problem, account recovery, service status, and escalation.
    - Include ticket reference, status, response expectations, and privacy guidance.

## 3. Role-aware experience

The same Account Center framework adapts to role and scope; it does not create unrelated identity records.

- **Global Admin / Super Admin:** own account settings plus global identity, tenant/company context switching, impersonation only through controlled audited support mode, platform configuration, security posture, user/group/role administration, billing administration where assigned, privacy/legal publishing, audit, and emergency access workflows.
- **Company/Tenant Admin:** scoped user lifecycle, company profile, directory, group membership, tenant policy, seats/licenses, company billing, integrations, access approvals, and compliance.
- **CEO / Executive:** executive profile, company and portfolio context, approved financial and operational KPIs, strategy, board/executive documents, approvals, risk, business continuity, and delegated executive support. No automatic access to every employee's private profile or payment details.
- **CFO / Finance:** scoped ledgers, budgets, invoices, payment instruments, procurement, taxes, forecasts, financial controls, approvals, and audit. Sensitive data requires explicit finance grants.
- **Manager / Supervisor:** direct/indirect reports within scope, team structure, objectives, performance/recognition, schedules, approvals, coaching, skills, onboarding/offboarding requests, and workload. No access to personal payment credentials or private personal profile fields.
- **Employee:** personal profile, work identity, assigned work, learning, recognition, group memberships visible to them, benefits/HR links as configured, preferences, privacy, security, and support.
- **Contractor / Vendor / Partner:** scoped business profile, contract/work assignment, onboarding requirements, approved apps, timesheets/invoices where applicable, access expiry, support, and security. No employee-only or tenant-wide data by default.
- **Help Desk L1/L2/L3:** profile basics needed for support, assigned ticket context, escalation-specific tools, knowledge, and approved diagnostics. Privileged profile, payment, HR, and security data are masked unless ticket authorization and role scope permit.
- **Help Desk Lead / Manager:** queue/team operations, assignment, escalation, SLA, coaching, reporting, and controlled ticket access; scope must be explicitly defined.
- **SOC / NOC:** operational identity and device/network/security context necessary for incident response, with privileged actions audited and separated from HR/finance.
- **Governance / Audit:** policy, evidence, control status, audit events, access reviews, retention, approvals, and read-only evidence exports within approved scope.
- **Customer / External user:** own account, organization membership, service requests, purchases/subscriptions, privacy, security, and support only.

## 4. Platform-wide navigation and public website

### Global shell
- Header: canonical IntelliStack / Maximus Optimus Command Center identity, global search, notifications, messaging, calendar, Help Buddy/Chat Buddy, context switcher when authorized, settings, profile, and logout.
- Hamburger: complete role-filtered primary navigation, grouped submenus, favorites, recently visited, draggable ordering where permitted, and clear locked/access-request states.
- Footer: About Us, Contact Us, Privacy Policy, Terms of Service, Cookie/Tracking Preferences where applicable, Accessibility, Security Center, Responsible Disclosure, Status, Careers, Partners, Documentation, Help/Support, and copyright/legal entity details.
- Do not expose internal application pages or tenant data to anonymous visitors. Public pages and authenticated workspaces have separate route protection and metadata.

### Public and corporate content
- Home / product overview, About IntelliStack, leadership/company information, IntelliSphere products, industries/solutions, customer/partner/vendor pages, Careers, Contact Us, Help Center, service status, trust/security center, privacy, terms, acceptable use, cookie notice, accessibility statement, and responsible disclosure.
- Content Studio for authorized global editors: page drafts, localized variants, metadata, Open Graph/social preview, canonical URL, structured data, sitemap inclusion, robots directives, version history, preview, approval, publication scheduling, link validation, and rollback.
- Contact forms require spam protection, consent notice, routing, retention, and response ownership.
- Do not invent legal entity addresses, certifications, compliance attestations, SLAs, or privacy claims. Legal policies require legal review and version/effective dates.

## 5. Metadata, search, privacy and security requirements

- Every public route has a unique title, description, canonical URL, social preview metadata, appropriate robots directives, and structured data where valid.
- Authenticated, private, sensitive, tenant-specific, and user-specific pages must not be indexed or leak data through metadata, previews, caches, or server rendering.
- Correct favicon/app icons, manifest, theme color, language, viewport, accessibility landmarks, and descriptive link labels.
- Cookie/consent controls must match actual analytics/advertising technologies and applicable jurisdictions; do not show a fake consent manager.
- Privacy and terms pages must be versioned, dated, accessible, and linked from registration, relevant collection points, and footer.
- Security policy, incident disclosure, vulnerability reporting, data retention, access control, encryption, backup/recovery, vendor/subprocessor, and business continuity documents must reflect implemented controls—not aspirational claims.
- Apply server-side authorization, RLS, secure storage policies, rate limiting, CSRF/session controls as applicable, audit, secrets management, and least privilege.
- Never store raw payment credentials or expose secrets in client bundles/logs/metadata.
- Use localized date/time/currency/number formatting and plan for regional privacy, residency, accessibility, and language requirements.

## 6. Global settings and administration

Separate three scopes and clearly label them:

- **Personal settings:** profile visibility, preferences, notifications, security, sessions, connected apps, personal billing, data rights.
- **Company/Tenant settings:** branding, domains, organization structure, users/groups, policies, seats, subscriptions, company billing, integrations, retention, and tenant-specific content.
- **Global platform settings:** tenant/company lifecycle, product catalog/features, global identity, global roles/permissions, system configuration, themes, navigation registry, announcements, message rotations, public content/legal policy versions, integrations, service health, audit, data governance, security posture, backups/recovery, and platform-wide controls.

All privileged settings changes require scope validation, permission checks, confirmation, audit, change preview where relevant, approval where required, safe rollout, verification, and rollback. No destructive global action is one-click.

## 7. Data ownership and payment boundary

| Data | Owner / authority | User editability |
|---|---|---|
| Preferred name, biography, photo, language | User | User, subject to policy |
| Employee ID, company ID, role, manager, department | Employer / directory | Authorized HR or directory admin |
| Tenant/company settings | Tenant/company | Scoped tenant/company admins |
| Global roles, platform settings | IntelliStack global governance | Global Admin with audited controls |
| Personal subscription payment | Individual account | Account owner via provider tokenization |
| Company billing/payment instruments | Company finance | Explicit finance/billing roles |
| MFA, sessions, recovery | Auth/security service | Account owner and approved recovery process |
| Audit and security evidence | Platform/company governance | Controlled append-only or restricted access |

## 8. Acceptance criteria

A feature is not complete merely because a menu item or mock screen exists. For each page and workflow:
- Route exists and is reachable by the correct roles; unauthorized access is denied at API and database layers.
- Data comes from the correct source of truth and is persisted; no fake values or local-only success messages.
- Create/read/update/delete/approve/export actions are individually authorized and audited.
- Role-based tests cover Global Admin, tenant admin, executive, manager, employee, contractor, Help Desk L1/L2/L3/lead/manager, SOC/NOC, Governance, and anonymous visitor where applicable.
- Cross-tenant, cross-company, cross-user, direct URL, API, export, and storage negative tests are included.
- Responsive mobile/tablet/desktop, keyboard, screen-reader labels, loading/empty/error/denied states are checked.
- Metadata and privacy/indexing rules are verified.
- Integration status is real and observable; disconnected or unavailable services are clearly labelled.
- Documentation, ownership, support, and operational runbooks are updated.
- CI lint, tests, type-check/build, security scans, and migration validation pass before release.

## 9. Implementation sequence

1. Inventory all current routes, navigation entries, footer links, profile controls, settings pages, database tables, APIs, and integrations. Classify each as implemented, partial, placeholder, disconnected, missing, or unsafe.
2. Resolve the profile and account center data model, privacy boundaries, and role-specific tabs.
3. Build the Account Center shell and persistent profile fields; connect profile dropdown and shortcuts.
4. Implement security and privacy settings with auth-provider and RLS verification.
5. Implement connected apps, devices/sessions, notifications, and preferences.
6. Implement billing using a PCI-compliant provider and separate personal/company financial scopes.
7. Complete public pages, legal policy publishing, metadata, sitemap, robots, accessibility, and contact workflows.
8. Complete global/company/personal settings governance and Content Studio.
9. Run persona-based acceptance tests and cross-scope security tests.
10. Publish only after all release gates pass.

## 10. Current repository observations

The current branch already contains:
- A top-bar profile dropdown and a separate employee profile workspace.
- A homepage profile editor prototype with local-state controls for bio, LinkedIn URL, and payment-method entry; this is not evidence of durable account persistence or a real payment integration.
- Navigation entries for My Account, Profile Settings, Preferences, Notification Settings, Security Settings, System Settings, Global Administration, Tenant Administration, Documentation, Help and Support, and Sign Out.
- A footer with business, workforce, governance, and company link groups.

These existing elements must be audited and consolidated rather than duplicated. In particular, the homepage's local profile editor must be replaced by the persistent Account Center; payment entry must not collect raw card data; and footer links must resolve to actual public/legal pages or clearly report that the destination is not yet published.

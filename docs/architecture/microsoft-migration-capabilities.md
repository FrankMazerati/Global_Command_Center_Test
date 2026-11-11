# Microsoft migration capabilities

This report was researched from current official Microsoft and vendor sources on 9 November 2026. It is an implementation boundary for the test-repository migration pilot, not a claim that any Microsoft tenant is connected or that the destination platform can already receive each workload.

## Executive summary

A 1,000-person migration is a collection of workload-specific identity, device, file, personal-data, browser-policy, and application migration paths. Microsoft does not provide one API that transfers all of these objects into an unnamed destination SaaS. The receiving platform, import limits, permission model, retention, and rollback semantics are not yet verified. The connector catalog may describe Microsoft services, but a `catalog_only` entry is not a live connection.

## Workload boundaries

| Source data | Supported source path | Important boundary for this product |
|---|---|---|
| On-premises Active Directory users and groups | Use a customer-approved Microsoft Entra hybrid synchronization route or an on-premises customer-operated connector. | AD DS and Entra ID are different directory models. Password hashes or passwords cannot be exported into this SaaS; use approved provisioning/sign-in flows. Do not expose domain controllers to inbound cloud traffic. |
| Entra users and groups | Microsoft Graph v1.0 inventory and/or Entra SCIM provisioning, subject to tenant admin consent and the chosen source/destination role. | Inventory and account provisioning are separate. Resolve duplicate identities, group membership, lifecycle, and least-privilege target roles explicitly. |
| Intune-managed devices | Microsoft Graph managed-device inventory. | Inventory is not ownership transfer. Device records, enrollment, compliance, encryption/recovery keys, certificates, and management policy require distinct destination support and approval. |
| Windows Autopilot | Graph inventory/import APIs and Microsoft-supported tenant transfer processes, where eligible. | Tenant changes are an administrative, potentially disruptive operation; they are not a metadata copy and require a separate owner-approved workflow. |
| OneDrive / SharePoint files | Graph drive item listing, delta where supported, content download, and a distinct target upload/import adapter. SharePoint migration APIs are specific to supported Microsoft destinations. | The current IntelliDrive target's bulk API, permissions, versions, sharing links, quotas, and resumability are not verified. Do not enable writes until they are. File bytes and permissions are sensitive data and need an explicit scope/retention plan. |
| Microsoft Sticky Notes | User-delegated Microsoft Graph Notes APIs for signed-in users, when the relevant resource/API and permission are available. | The reviewed notes endpoint requires delegated user access; there is no equivalent tenant-wide app-only export path. Microsoft support documentation also describes user-managed export/import paths. Do not promise a silent tenant-wide copy. |
| Edge favorites and personal browser data | User-controlled Edge export/import for favorites and other profile data. | The Edge API does not supply a universal personal-favorites migration endpoint. Browser policies may import settings; favorites, toolbar layout, extensions, passwords, and profile data are different data classes. Never export passwords or protected credentials. |
| Edge toolbar, browser settings, extensions | Microsoft Edge enterprise policy and extension-management routes where the customer manages devices. | This is policy configuration/deployment, not a portable per-user data object. Inventory, approval, and reapplication are required. |
| Enterprise applications / service principals | Microsoft Graph inventory of applications, service principals, app-role assignments, and delegated permission grants. | Inventory does not copy secrets or create consent. Recreate credentials, validate redirect URIs and ownership, then obtain consent in the destination tenant. Never export client secrets, certificates, or private keys. |
| Mail/calendar and other M365 objects | Endpoint/product-specific Microsoft migration services or APIs where documented. | Do not imply Graph metadata/list APIs alone migrate mailbox content, calendar state, retention, legal holds, or collaboration history. Each workload needs its own source and target support assessment. |

## Recommended 1,000-user pilot pipeline

1. **Onboard and isolate tenants.** Create a tenant-scoped migration record and separate credentials, encryption keys, staging paths, queues, checkpoints and audit partitions per customer. Bind every source object and job to immutable source tenant ID plus source object ID. Enforce tenant-scoped authorization in storage and workers; never rely on a client-supplied tenant identifier alone.
2. **Declare scope and readiness before consent.** Capture source workload, user count, endpoint availability, license/prerequisite state, destination importer/API, mapping constraints, retention/hold or device exceptions, and customer exclusions. Mark each workload `ready`, `blocked`, `partial`, or `unknown` with evidence and owner. Do not infer readiness from a successful OAuth connection. The SaaS is unnamed here, so its schema, limits, import semantics and rate limits remain unverified.
3. **Request least privilege, by workload.** Use read-only Graph v1.0 permissions for inventory/extraction wherever possible and keep destination write credentials separate. For example, file content uses `Files.Read.All` as the documented least-privileged application permission for the cited content endpoint; Intune inventory uses its endpoint-specific read permission; Sticky Notes needs per-user delegated `ShortNotes.Read` and has no app-only path. Obtain customer administrator consent for application permissions in each source tenant. Do not request write scopes until a separately approved destination operation requires them. [12] [18] [25] [43]
4. **Inventory and dry-run.** Read an explicitly approved pilot cohort (for a 1,000-user rollout, start with a representative, customer-approved subset before expanding). Enumerate all pages using the returned opaque `@odata.nextLink`; use delta only for resources that document it. Produce a dry-run manifest with source counts, stable IDs, proposed target matches, field transformations, group/permission mappings, excluded or unsupported fields, expected writes, conflicts and estimated exceptions. Do not write during discovery. [17] [25] [39] [50]
5. **Approval gate.** Present the manifest and risk summary to the customer owner. Require explicit approval of scope, mappings, destination, write categories, deactivation/deletion behavior and rollback plan before any destination write. Keep source read access separate from destination write access. Never infer approval from admin consent to source read permissions.
6. **Chunked, resumable execution.** Partition work into durable, idempotent per-user/workload/object tasks. Persist page/delta tokens, source-to-target ID mappings, chunk boundaries, destination acknowledgements, file offsets/session state when supported, retry state and completion status. Resume from checkpoints after interruption; do not restart completed chunks. Use only documented destination resumability. Do not invent a universal chunk size: choose it from destination documentation and pilot measurements.
7. **Bounded retries and throttling.** Use bounded concurrency and adapt downward on throttling. On Graph 429, honor `Retry-After`; use exponential backoff with jitter only when the service does not provide a delay, cap retries, and quarantine persistent failures for remediation. Inspect individual batch subresponses; batching does not bypass per-request throttling. Do not promise a completion time or fixed requests-per-second rate from the 1,000-user count. [54] [55] [56]
8. **Audit and data protection.** Record tenant/job/operator, consent and permission snapshot, scope and mapping version, approval event, source IDs, destination IDs, request outcome/status, retry/checkpoint transitions, validation results and exception disposition. Never log access tokens, SCIM bearer secrets, passwords, private keys, or file contents. Encrypt transport and staging, apply least-privilege staff access and retention/deletion controls, and audit access to sensitive migration artifacts.
9. **Validate before expanding or cutover.** Compare source and destination totals and unique IDs; sample mapped attributes, group memberships, files/byte counts and hashes where feasible, attachments, permissions, and workload-specific behavior. Verify exceptions and rejected records are accounted for. Re-run supported delta/change capture near cutover, reconcile changes/deletions, then obtain owner acceptance. Keep source systems available until acceptance and planned authentication/access cutover. For consequential deactivation, deletion, device deregistration or permission changes, require a separate approval and staged validation.

### Limits and sizing guardrails

Do not translate a documented Microsoft limit into a destination-SaaS guarantee. Limits differ by endpoint and service and may be concurrent or change over time. Graph generally requires pagination via each endpoint’s `@odata.nextLink`; Graph throttling returns 429 and directs callers to `Retry-After`. Specific examples—not universal migration settings—include a 999-object maximum page for Graph users/groups, 20 subrequests per Graph JSON batch, and a 2,000-user-per-job limit for the Microsoft-to-Microsoft cross-tenant migration API. Use the endpoint’s current documentation and pilot measurements; obtain the SaaS vendor’s own quotas, payload constraints, group semantics and retry guidance before sizing production. [54] [55] [56] [57]

## References

[1]: https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works "How Application Provisioning works in Microsoft Entra ID"
[2]: https://learn.microsoft.com/en-us/graph/api/resources/crosstenant-migration-api-overview?view=graph-rest-1.0 "Cross-tenant migration API overview"
[3]: https://learn.microsoft.com/en-us/graph/api/migrationsroot-post-crosstenantmigrationjobs?view=graph-rest-1.0 "Create crossTenantMigrationJob"
[4]: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-sync-configure-filtering "Microsoft Entra Connect Sync: Configure filtering"
[5]: https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups "Tutorial: Develop a SCIM endpoint for user provisioning to apps"
[6]: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/reference-connect-sync-attributes-synchronized "Microsoft Entra Connect Sync: Attributes synchronized to Microsoft Entra ID"
[7]: https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0 "List users - Microsoft Graph v1.0"
[8]: https://learn.microsoft.com/en-us/windows/win32/adsi/active-directory-service-interfaces-adsi "Active Directory Service Interfaces"
[9]: https://learn.microsoft.com/en-us/entra/fundamentals/compare "Compare Active Directory to Microsoft Entra ID"
[10]: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-password-hash-synchronization "Implement password hash synchronization with Microsoft Entra Connect Sync"
[11]: https://learn.microsoft.com/en-us/troubleshoot/windows-server/active-directory/support-policy-and-known-issues-for-admt "Support policy and known issues for Active Directory Migration Tool"
[12]: https://learn.microsoft.com/en-us/graph/api/intune-devices-manageddevice-list?view=graph-rest-1.0 "List managedDevices - Microsoft Graph v1.0"
[13]: https://learn.microsoft.com/en-us/graph/api/intune-enrollment-windowsautopilotdeviceidentity-list?view=graph-rest-1.0 "List windowsAutopilotDeviceIdentities - Microsoft Graph v1.0"
[14]: https://learn.microsoft.com/en-us/graph/api/intune-enrollment-importedwindowsautopilotdeviceidentity-import?view=graph-rest-1.0 "import action - Microsoft Graph v1.0"
[15]: https://techcommunity.microsoft.com/blog/intunecustomersuccess/support-tip-how-to-transfer-windows-autopilot-devices-between-tenants/3920555 "Support tip: How to transfer Windows Autopilot devices between tenants"
[16]: https://learn.microsoft.com/en-us/intune/fundamentals/setup-migration "Migration guide: Set up or move to Microsoft Intune"
[17]: https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0 "Microsoft Graph driveItem delta API"
[18]: https://learn.microsoft.com/en-us/graph/api/driveitem-get-content?view=graph-rest-1.0 "Download driveItem content - Microsoft Graph v1.0"
[19]: https://learn.microsoft.com/en-us/graph/api/list-get?view=graph-rest-1.0 "Get a SharePoint list - Microsoft Graph v1.0"
[20]: https://learn.microsoft.com/en-us/graph/api/driveitem-list-versions?view=graph-rest-1.0 "List versions - Microsoft Graph v1.0"
[21]: https://learn.microsoft.com/en-us/sharepoint/dev/apis/migration-api-overview "SharePoint Migration API Introduction"
[22]: https://learn.microsoft.com/en-us/graph/permissions-selected-overview "Overview of Selected permissions in OneDrive and SharePoint"
[23]: https://learn.microsoft.com/en-us/graph/auth-v2-service "Get access without a user - Microsoft Graph"
[24]: https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions?view=graph-rest-1.0 "List sharing permissions on a driveItem - Microsoft Graph v1.0"
[25]: https://learn.microsoft.com/en-us/graph/api/user-list-notes?view=graph-rest-1.0 "List notes - Microsoft Graph v1.0"
[26]: https://learn.microsoft.com/en-us/graph/api/resources/note?view=graph-rest-1.0 "note resource type - Microsoft Graph v1.0"
[27]: https://learn.microsoft.com/en-us/graph/api/note-delta?view=graph-rest-1.0 "note: delta - Microsoft Graph v1.0"
[28]: https://support.microsoft.com/en-us/windows/apps/stickynotes/troubleshoot-sticky-notes "Troubleshoot Sticky Notes - Microsoft Support"
[29]: https://support.microsoft.com/en-us/office/troubleshoot-sticky-notes-sync-errors-in-microsoft-onenote "Troubleshoot Sticky Notes sync errors in Microsoft OneNote"
[30]: https://support.microsoft.com/en-us/office/export-your-sticky-notes-a104b550-d39a-4ffd-a388-6543c5aede0a "Export your sticky notes"
[31]: https://support.microsoft.com/en-us/windows/apps/stickynotes/create-a-sticky-note "Create a sticky note"
[32]: https://www.microsoft.com/en-us/edge/learning-center/back-up-passwords-favorites "Back Up Favorites, Passwords, and More | Microsoft Edge"
[33]: https://support.microsoft.com/en-us/edge/import-your-favorites-and-passwords-in-microsoft-edge "Import your favorites and passwords in Microsoft Edge"
[34]: https://learn.microsoft.com/en-us/graph/api/resources/browser-edge-api-overview?view=graph-rest-1.0 "Use the Edge API in Microsoft Graph"
[35]: https://support.microsoft.com/en-us/edge/sign-in-to-sync-microsoft-edge-across-devices "Sign in to sync Microsoft Edge across devices"
[36]: https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/importbrowsersettings "ImportBrowserSettings - Microsoft Edge Browser Policy Documentation"
[37]: https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions "Manage Microsoft Edge extensions in the enterprise"
[38]: https://learn.microsoft.com/en-us/deployedge/microsoft-edge-on-premises-sync "On-premises sync for Active Directory users"
[39]: https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0 "List applications - Microsoft Graph v1.0"
[40]: https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list?view=graph-rest-1.0 "List servicePrincipals - Microsoft Graph v1.0"
[41]: https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list-approleassignments?view=graph-rest-1.0 "List appRoleAssignments granted to a service principal - Microsoft Graph v1.0"
[42]: https://learn.microsoft.com/en-us/graph/api/oauth2permissiongrant-list?view=graph-rest-1.0 "List oAuth2PermissionGrants - Microsoft Graph v1.0"
[43]: https://learn.microsoft.com/en-us/graph/permissions-overview "Overview of Microsoft Graph permissions"
[44]: https://learn.microsoft.com/en-us/graph/permissions-reference "Microsoft Graph permissions reference"
[45]: https://learn.microsoft.com/en-us/entra/identity-platform/how-applications-are-added "How and why apps are added to Microsoft Entra ID"
[46]: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/add-application-portal-setup-sso "Enable SAML single sign-on for an enterprise application"
[47]: https://learn.microsoft.com/en-us/graph/api/application-post-applications?view=graph-rest-1.0 "Create application - Microsoft Graph v1.0"
[48]: https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-credentials "Add and manage app credentials in Microsoft Entra ID"
[49]: https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0 "List messages"
[50]: https://learn.microsoft.com/en-us/graph/paging "Paging Microsoft Graph data in your app"
[51]: https://learn.microsoft.com/en-us/microsoft-365/migration/cross-tenant-sharepoint-migration?view=o365-worldwide "Cross-tenant SharePoint migration"
[52]: https://learn.microsoft.com/en-us/microsoft-365/migration/migration-orchestrator-1-overview?view=o365-worldwide "An overview of tenant-to-tenant migration with orchestrator in Microsoft 365"
[53]: https://learn.microsoft.com/en-us/microsoft-365/migration/migration-orchestrator-2-planning-prerequisites?view=o365-worldwide "Migration orchestrator planning and prerequisites"
[54]: https://learn.microsoft.com/en-us/graph/throttling "Microsoft Graph throttling guidance"
[55]: https://learn.microsoft.com/en-us/graph/throttling-limits "Microsoft Graph service-specific throttling limits"
[56]: https://learn.microsoft.com/en-us/graph/json-batching "Combine multiple HTTP requests using JSON batching"
[57]: https://learn.microsoft.com/en-us/graph/api/migrationsroot-post-crosstenantmigrationjobs?view=graph-rest-1.0 "Create crossTenantMigrationJob"

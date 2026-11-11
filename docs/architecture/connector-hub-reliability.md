# Connector Hub — 100+ Provider Registry and Reliability Architecture

## Intent and status vocabulary

Connector Hub is a provider directory plus a secure runtime control plane. A provider being listed does not mean it is implemented, connected, tested, or production-approved.

- **Catalog only:** discoverable provider entry; no usable adapter is promised.
- **Available for configuration:** a reviewed adapter exists and required credentials can be safely configured.
- **Connected:** authorization completed and a connection has been validated.
- **Needs attention:** a connection is degraded, credentials expired, sync failed, rate limited, or provider is unavailable.
- **Deprecated:** new connections disabled; existing connections have a migration plan.

The existing catalog initially contained 19 providers. The registry migration adds a broad set of additional providers (including identity, productivity, ITSM, endpoint management, cybersecurity, monitoring, HR/payroll, finance, payments, data, developer tooling, communications and storage). All newly seeded entries remain catalog-only. No provider is represented as connected.

## Existing records reused

- `integration_provider_catalog` remains the canonical searchable provider directory.
- `integration_connections` remains the organization/tenant connection record.
- Existing `integration_status` values remain unchanged.
- Existing RLS on `integration_connections` remains the administrator-scoped control.
- Existing marketplace and invoice tables are not duplicated by Connector Hub.

## Connector runtime and reliability records

- `integration_health_checks`: scheduled/manual health probes, latency, safe error codes and sanitized provider errors.
- `integration_sync_runs`: initial, incremental, scheduled, manual, backfill and reconciliation sync lifecycle; record counts; retry schedule; cursor reference.
- `integration_connection_events`: append-only connection lifecycle and configuration audit history.
- `integration_webhook_inbox`: provider event deduplication, signature verification result, payload hash, encrypted payload reference, processing status, attempts and replay scheduling. Raw payment/identity payloads must not be copied into ordinary JSON columns.
- `integration_delivery_attempts`: attempt-level results for provider operations, rate limiting and retry-after handling.

Connection records gain health, last-successful-sync, credential-reference, expiration and configuration-version fields. Credential material must live in a secrets manager or encrypted vault; only opaque references belong in Postgres.

## Operational invariants

1. A catalog entry is not an implementation. Readiness advances only after adapter code, contract tests, sandbox validation, security review and operational sign-off.
2. Every connection belongs to an organization and optionally a tenant. Never trust organization/tenant IDs supplied by the browser; resolve and validate them server-side.
3. Never persist OAuth access tokens, refresh tokens, API secrets, private keys, PAN/CVV, or unredacted identity/payment payloads in ordinary tables or logs.
4. Use least-privilege OAuth scopes and document each requested scope before authorization.
5. Use provider event IDs plus connection ID for webhook idempotency. Verify signatures before processing.
6. Use bounded exponential backoff with jitter for transient network errors, HTTP 429 and retryable 5xx; respect Retry-After. Do not retry invalid credentials, revoked consent, malformed payloads or permanent 4xx without remediation.
7. Add circuit breakers and per-provider concurrency/rate limits. One provider outage must not stall unrelated integrations.
8. Record last attempt, last success, next scheduled check, consecutive failures, provider request ID and correlation ID.
9. Incremental syncs use provider cursors/watermarks, overlap windows where needed, stable pagination and deduplication. Full backfills are bounded, checkpointed and resumable.
10. Every sync maps provider records into canonical internal IDs and stores source-system IDs with tenant scope. Reconcile deletions and disabled accounts safely; never hard-delete canonical records just because a provider stops returning them.
11. Apply schema validation and quarantine malformed records; partial success is explicit and measurable.
12. Enforce data minimization, field-level mapping, retention, deletion propagation and data residency requirements per provider.
13. Use append-only event history for connection changes, health and delivery attempts; privileged administrative repair is audited.
14. Expose accurate status to the UI: Connected, Not connected, Needs attention, plus last successful sync and safe remediation. Never fabricate live health.

## Adapter contract

Every adapter implements: metadata/capabilities, auth start/callback/refresh/revoke, connection test, health probe, discovery, initial sync, incremental sync, cursor persistence, webhook verify/normalize, rate-limit parser, error classifier, retry policy, and disconnect/data-retention handling.

Adapters are versioned independently from provider catalog entries. Each adapter must pass unit tests, provider contract fixtures, sandbox tests, tenant-isolation tests, token-redaction tests, idempotency tests, pagination/restart tests, webhook replay tests and load/rate-limit tests before readiness advances.

## Stability SLOs and dashboard metrics

Track per provider and per tenant:
- connection availability and health-check success;
- sync success rate and p50/p95 duration;
- freshness lag and last successful sync age;
- retry, rate-limit and authentication-failure rates;
- webhook delivery-to-processing latency and dead-letter count;
- records created/updated/skipped/quarantined;
- provider API error distribution and circuit-breaker state.

Initial target objectives for a production-ready adapter: 99.5% monthly successful scheduled health probes (excluding provider-declared maintenance), 99% successful scheduled sync runs, and no lost accepted webhook events. These are engineering targets, not provider guarantees. Set stricter or looser targets based on business criticality and provider API terms.

## Rollout plan

1. Registry and health/event schema (current step).
2. Searchable Connector Hub UI with accurate catalog-only status and provider category filters.
3. Adapter SDK and shared OAuth/token vault, webhook inbox worker, retry scheduler and circuit breaker.
4. First adapter cohort: Microsoft 365/Entra ID, Google Workspace, AWS, Okta, Slack/Teams, ServiceNow/Jira Service Management, Salesforce, Workday/ADP, QuickBooks, Zoom and GitHub.
5. Provider-specific contract tests, sandbox validation and security reviews.
6. Expand connector cohorts based on customer demand and measured stability.

The 100+ directory is a catalog and roadmap, not a claim that 100+ live adapters have been implemented.


## Search and product surfacing

The catalog also carries featured ranking, display order, search aliases and product-surface tags so the Connector Hub can prioritize the core enterprise providers (Microsoft 365, Entra ID, Google Workspace, Okta, AWS, Salesforce, Slack, Zoom, ServiceNow, Intune, Workday and GitHub) while retaining a searchable 100+ long tail. Product surfaces currently identify Command Center, IntelliStaff, IntelliHire, IntelliWork, IntelliSphere and IntelliPay relevance. These are routing/discovery tags, not a statement of live adapter support.

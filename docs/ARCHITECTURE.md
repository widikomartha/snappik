# Architecture

Status: target design; no application code exists yet. Related: [ADR-001](decisions/ADR-001-modular-monolith.md), [Database](DATABASE.md), [API](API.md).

## Baseline stack and unresolved providers

| Concern | Baseline | Status |
|---|---|---|
| Web and API | TypeScript, Next.js; same-origin browser/API deployment | Baseline; pin supported versions when scaffolding |
| Persistence | PostgreSQL with explicit migrations and transactions | Baseline; managed host undecided |
| Authentication | Maintained auth provider/library, server-validated sessions | DEC-001: provider/session contract pending |
| Source inventory | Google Drive adapter using supported APIs | DEC-002: public-link credential/access feasibility spike required |
| Async work | PostgreSQL-backed jobs, worker from the same repository | Baseline; no separate Redis requirement for MVP |
| Derived assets | Private object storage plus controlled media endpoint | DEC-003: provider/hosting pending |
| Operations | Structured logs, counters, error reporting, health checks | Baseline; vendor undecided |

Do not infer this stack from the competitor's dependency versions. Framework/hosting selection must support server-side authorization, streaming, background workers and secret management.

## Components

```mermaid
flowchart TD
    O[Owner browser] --> W[Web UI and same-origin API]
    C[Client gallery browser] --> W
    P[Operator browser] --> W
    A[Auth provider] --> W
    W --> D[Domain services and policy checks]
    D --> DB[(PostgreSQL)]
    DB --> J[Job worker]
    J --> G[Google Drive adapter]
    J --> S[Private derived-image storage]
    W --> G
    W --> S
    W --> M[Sanitized telemetry]
    J --> M
```

Boundaries inside one codebase:

| Module | Owns | Must not do |
|---|---|---|
| Identity/tenancy | Provider mapping, studio membership and operator grants | Accept arbitrary client tenant ownership |
| Onboarding | Atomic/default initialization and recovery | Reset an existing trial on retry |
| Entitlements | Grant evaluation and studio write limits | Derive access from UI flags |
| Projects | Configuration, share token, archive and lifecycle | Mutate confirmation snapshots |
| Inventory | Drive traversal, metadata/versioning and availability | Use filename as identity |
| Gallery access | Menu grants, password checks, expiry/revocation | Expose provider credentials/source roots |
| Selection | Draft revision, quotas, notes, confirm/reopen | Resolve an arbitrary photo outside project scope |
| Delivery | Authorized image/download responses | Proxy arbitrary request URLs |
| Operations | Jobs, audit records, diagnostic projections | Provide unrestricted operator database editing |

Suggested source layout when implementation starts: `src/app` for UI/routes, `src/modules/<domain>` for services/policies, `src/adapters` for providers, `src/db` for schema/migrations, `src/worker` for handlers and `tests` for domain/integration/E2E suites. Route handlers remain thin; server actions, if used, invoke the same authenticated services.

## Request path and consistency

1. Validate the session or gallery grant and parse bounded input.
2. Resolve tenant/project ownership from canonical records.
3. Evaluate entitlement, archive/suspension, workflow/password/deadline and operation permissions.
4. Execute domain mutation under transaction/revision checks.
5. Persist audit/job/idempotency records in that transaction when required.
6. Commit before returning success. Acknowledge canonical IDs/revisions, not assumed local state.

Frontend optimistic state is visibly pending until acknowledged. Selection/config state is never trusted for authorization. Session verification and authorization belong at protected entry points and the data-access boundary, consistent with the [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication). Provider-specific callback details remain gated by DEC-001.

Creation returns 201 as soon as the durable project and inventory job exist. The gallery shows preparing until initial indexing succeeds. The worker does not hold a database transaction open during external network requests.

## Inventory and caching

Provider adapter accepts a validated folder/file ID, never a caller-controlled URL. Folder listing must handle pagination, parent context and supported types through the [Drive API search/list model](https://developers.google.com/workspace/drive/api/guides/search-files). Authentication requirements, Shared Drive behavior and resource keys are DEC-002 acceptance criteria, not assumptions.

An inventory generation is published only after a complete bounded scan. Interrupted scans do not tombstone old files. Stage bounded scan metadata in private job storage keyed by generation; publish stable-ID upserts and availability changes together under the project/selection locks, then update `last_successful_sync_at`. Readers continue using the last complete generation until commit. Abort and report limit errors at configured ceilings; clean abandoned staging objects through retention jobs.

Cache key: studio ID + project ID + provider file ID + source version + transform version + target size. Source version changes invalidate derived images. Cached source availability is never sufficient authorization. Serve through a same-origin media endpoint that checks the current grant; private caches must not bleed between sessions/tenants. MVP thumbnails are browser-private and revalidated; don't add a public CDN cache until its authorization/invalidation design is reviewed.

Download original via bounded streaming after provider-ID resolution and grant checks. Recheck source accessibility and fail clearly on permission loss. The initial implementation must prove hosting supports timeouts, streaming and file-size caps before offering downloads.

## Jobs and deployment units

Two deployable processes share domain code: web and worker. PostgreSQL is the durable job queue. Inserting a job in the business transaction avoids a separate outbox for MVP. Worker claims with a lease, tracks attempts and renews for long jobs; only one active job per project/type dedupe key is allowed. Use bounded concurrency and provider-aware backoff, not unbounded parallel downloads.

Handlers: `inventory_scan`, `thumbnail_generate`, `project_purge`, `cache_cleanup`, `expired_session_cleanup`, `retention_cleanup`. Proposed retry delays: 5 s, 30 s, 2 m, 10 m, 30 m with jitter; permanent permission/validation failures stop early. Exhausted jobs become failed with safe retry controls. A duplicate worker execution must be harmless.

## Monitoring and scaling decisions

Collect API latency/error rate, selection conflicts, confirmation success, queue age/depth, inventory duration, Drive throttling, thumbnail failures and database pool saturation. Track local client acknowledgement failures separately from server commit failures. Never log share tokens, passwords, complete URLs with tokens or note bodies.

Start with polling for status (15 seconds while visible), not a realtime service. Introduce push only after demand justifies its complexity. Scale web/worker independently; bound database connections across replicas. Larger file volumes, ZIP processing, commercial payment jobs and custom domains require new capacity review.

## Failure boundaries

- Provider outage: last successful inventory and historical results remain; new sync/download can fail without corrupting selections.
- Database outage: fail mutations; do not acknowledge local-only edits as saved.
- Response lost after commit: idempotent request returns the saved result.
- Worker crash: lease expires; retry resumes/rebuilds safely.
- Auth outage: preserve durable records; deny unverifiable protected requests.
- Suspended studio: policy denies even cached media requests.

Architecture changes affecting these boundaries require a new ADR and corresponding tests.

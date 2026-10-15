# Engineering guidance for agents

Status: implementation conventions with a BL-003 local foundation. [Root setup](../../README.md) and [evidence](../foundation/BL-003-EVIDENCE.md) identify actual commands and boundaries; later product/provider tooling remains pending. [Architecture](../ARCHITECTURE.md), [Database](../DATABASE.md), [API](../API.md) and [Security](../SECURITY.md) remain authoritative for their contracts.

## Local setup and dependencies

Before installing anything, inspect manifests, lockfiles, runtime declarations and CI configuration. Use the existing package manager if one exists. For initial scaffolding, select and record a supported runtime/package manager, pin dependency versions through a lockfile and document real install/dev/build/test commands in Project state. Verify current compatibility against official provider/framework documentation at selection time.

Keep provider secrets server-side. Create only harmless placeholders in an eventual `.env.example`; validate required runtime configuration at startup. Do not read unrelated secret stores or copy real audit credentials into development. Use isolated databases/buckets and synthetic fixtures. Never reset an unknown database to make local tests pass.

## Module and naming boundaries

The proposed layout is `src/app` for pages/routes, `src/modules/<domain>` for use cases/policies, `src/adapters` for external providers, `src/db` for persistence/migrations and `src/worker` for handlers. Establish it during scaffolding; do not create empty directories solely to mimic the diagram.

- Transport code parses input, resolves a verified principal and delegates to a use case. Business policy should not be duplicated between route handlers and server actions.
- Domain services operate on explicit scoped IDs and validated values. Repository methods require the relevant studio/project scope rather than accepting an unqualified resource ID.
- Adapters own auth-provider/Drive/storage specifics. Domain logic must be testable without real external accounts.
- Serialize explicit response DTOs; never expose database rows wholesale. Keep JSON wire naming aligned with API.md, even if internal TypeScript naming differs.
- Use server-generated timestamps, UTC instants, explicit nullable types and stable enums. Derive display status from the relevant dimensions rather than inventing one overloaded project status.
- Keep labels and errors understandable to users. Internal stack traces, migration names and provider credentials never belong in product UI.

## Validation and identity

Validate input at the boundary and enforce business invariants inside the transaction. Unknown mutation fields are errors. Treat strings from Drive, notes and labels as untrusted text. Count note length in Unicode code points as specified; string byte count or UTF-16 unit count is a different rule.

Photo identity is the stable internal photo ID linked uniquely to project/provider file ID. Do not normalize extension/case to merge photos. Filename/path are descriptive values; exports preserve their originals while escaping the output format.

Gallery token possession identifies a shared project; menu grant checks still apply. Owner identity comes from verified auth and membership. Platform permission is separate. Never let caller-supplied `studio_id`, role or workflow flags override server scope.

## Database and concurrency

Implement schema constraints and application validation together. Use actual PostgreSQL integration checks for composite foreign keys, unique identities, quota locks and confirmation races. An in-memory mock cannot prove those properties.

Project creation/restore quota checks serialize on the studio. Project/selection operations lock project then selection set. When an operation also needs the studio lock, acquire it before project/set locks and review all competing paths for a consistent order. Do not perform external provider requests while holding those transactions open.

Compare the correct expected revision: studio profile, defaults settings, project config and selection set have distinct counters. Revision mismatch is an explicit conflict; never retry automatically by silently substituting the current revision.

Write business change, audit/job and required idempotency completion atomically. Authorize retries before replaying stored responses; a cached idempotency response is not a bypass around current principal/tenant access. Do not persist plaintext passwords or gallery cookie material in request hashes/responses. Hash a canonical bounded request representation without logging sensitive fields.

Review migration effects on live data and both processes. Prefer additive/backfill/validate steps before removing old fields. A schema migration is not a production data reset. Preserve immutable confirmation snapshots and referential scope during every migration.

## Inventory, worker and storage

Keep failed scans separate from completed inventory. Stage metadata and publish a complete generation atomically; do not delete old availability based on an incomplete page traversal. Retain selected references that become unavailable and require deliberate removal before reconfirmation.

Job handlers must tolerate retries and abandoned leases. Use bounded concurrency and documented retry ceilings. Separate retryable transport failures from permanent invalid source/permission failures. Validate job payload version and scope before processing; a job ID is not authorization.

Resolve downloads through provider IDs and a restricted adapter, never an arbitrary user URL. Apply input, stream and decoder resource limits. Cache identity includes source/transform version. Private object access and current gallery authorization are checked independently; do not fix a broken thumbnail by making the bucket public.

## Frontend state

Represent draft choices, pending request and acknowledged server revision separately. Serialize or deliberately reconcile overlapping saves. Confirm waits for acknowledged saves, then uses that exact revision. On conflict, preserve the unsaved intent visibly and reload canonical state; do not automatically overwrite another tab's confirmation.

Handle loading, empty, stale, unavailable, expired, forbidden, error and success states where applicable. Keep form inputs after recoverable errors. Use backend error codes for localized copy, not raw exception text. Disable controls for usability while retaining server enforcement.

Use the Design page inventory, touch/focus behavior and ID/EN strings. Client menu grants are separate even in one browser. Do not show an unauthenticated photo cover merely to make the landing page look complete.

## Reviews and change size

Prefer one cohesive user outcome per change. Avoid unrelated refactors and dependency upgrades. Review generated files and migrations as carefully as handwritten code. Check successful and denied paths, exact persistence after retries, and relevant documentation drift. Record any incomplete provider/device coverage plainly.

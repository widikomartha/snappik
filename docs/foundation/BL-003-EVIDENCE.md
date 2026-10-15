# BL-003 foundation evidence — 15 October 2026

Scope: one backlog ID; existing local workspace is authoritative. Starting clean `master` / `1089964`; verification ran on the uncommitted worktree. User subsequently authorized a local commit, which includes this evidence (resolve SHA with git log). No push, publish, deployment, real-provider connection, paid service, private research use or unknown-database reset. Dates use Asia/Makassar for this record; database instants are UTC.

## Decision and source inspection

Inspected AGENTS, entry point/state/backlog/traceability, active BL-001/002/005 handoffs, owning PRD/rule sections, Architecture, Database, API, Security, Deployment, engineering/verification/implementation guides, actual spike manifests/locks and worktree. Local read/write/remove probe succeeded. No root app manifest, source, database commands or CI existed initially. No PostgreSQL/Docker executable was on PATH.

Keep the existing local Node 24.18.0 / npm 11.16.0 convention. Registry metadata actually read with `npm view ... --json --fetch-retries=0 --fetch-timeout=15000`: Next 16.4.1 requires Node >=20.9 and accepts React ^19; React 19.3.1; TS 5.9.3 exists (current registry TS was 7.0.2; not needed for this foundation); pg 8.23.1; tsx 4.23.15; types versions pinned in the manifest. [Official Next installation](https://nextjs.org/docs/app/getting-started/installation) documents Node >=20.9 / TS >=5.1; [Node release policy](https://nodejs.org/en/about/previous-releases) supports the Node 24 LTS line. This records compatibility, not a claim of the latest Node patch. Runtime audit at execution reported zero advisories.

Real PostgreSQL supplied by the pinned development-only `embedded-postgres@18.4.0-beta.17` / Windows-x64 binary package. Executed binary `postgres.exe --version` and SQL `SELECT version()`: **PostgreSQL 18.4 on x86_64-windows, compiled by msvc-19.44.35226, 64-bit**. Package [upstream source](https://github.com/leinelissen/embedded-postgres) and [official Windows distribution guidance](https://www.postgresql.org/download/windows/) distinguish server binaries from hosting. The beta package wrapper is a local test convenience; production distribution/host remains DEC-003. Install scripts were disabled; the Windows package's hydration script was inspected and not needed/executed.

DEC-001/002/003 remain open. BL-001 candidate auth namespace/library-owned schema is deliberately absent. BL-002 root/child resource-key and credential-ownership contract gaps remain unresolved. Initial app schema persists the existing baseline source ID, without claiming authenticated Drive access or treating a source as verified. No new product contract has silently replaced those decisions.

## Implemented local subset

- TypeScript/Next App Router with a neutral status page, liveness/readiness routes, startup config validation, private health responses and safe error output. Thin transport; no business HTTP endpoints or fake login/gallery.
- Shared modular web/worker repository, explicit build for compiled worker, bounded PG pool, transaction helper and real startup scripts.
- Initial SQL covers app identity, tenant/membership/settings/grants, project/workflow/photo keys, selection/history/gallery boundaries and reliability tables. Composite FKs enforce scope, main-only set discriminator, membership/trial/provider/photo uniqueness, Unicode note length and immutable snapshot updates. Services for those later backlog features are not implemented.
- Owner repository requires server-verified principal, resolves canonical membership, denies suspended studio, projects explicit DTOs and scopes project/photo/job lookups. Lock helper orders user -> studio -> project -> selection set. It is not wired to an auth provider; test principals are explicitly synthetic.
- Atomic digest-only idempotency reservation/completion, actor/session/studio/project/operation namespace, 24-hour TTL, conflict/receipt allowlists and authorization before replay. Business mutations remain responsible for their own entitlement/revision checks; no automatic stale revision retry exists.
- Audit writes accept a small allowlist, no arbitrary payload summaries. Immutable audit/history enforcement and an example non-owner foundation grant file prohibit schema changes/operator self-grants/history edits. Tenant row filtering is in scoped repositories with composite FKs, **not RLS**; trusted service DB access is not an end-user credential.
- Queue: transactional enqueue/dedupe, bounded attempts, SKIP LOCKED claims, leases/renewal/expired recovery, monotonically increasing lease tokens, same-transaction fencing/publication/completion and safe code-only failures. Retries wait without leases, respect bounded Retry-After/jitter, terminate after initial + five retries. Handler preparation happens outside the publication transaction. All actual provider/maintenance handlers currently fail unconfigured; no inventory/purge service is implied.
- Numbered checksum migrations, advisory serialization, failed-DDL rollback, runtime compatibility floor, non-destructive rollback policy, local setup README, CI workflow and test harness. CRLF/LF digests normalize identically with SQL LF Git attributes; request key ordering is locale-independent. Permanent permission/config/validation failures stop despite an incorrect retry hint.

## Executed verification

Environment: Windows x64 / PowerShell 7.6.5 / Node v24.18.0 / npm 11.16.0; uncommitted worktree based on `1089964`; synthetic accounts and fresh isolated PostgreSQL clusters, not an in-memory SQL emulator. Fresh cluster names/ports are generated by the harness; no runtime URL is used by tests.

| Result | Exact command/check | Evidence / boundary |
|---|---|---|
| Passed | `npm install --ignore-scripts --no-fund --no-audit --fetch-retries=0 --fetch-timeout=30000` | 48 platform-installed packages; exact root lock generated |
| Passed | `npm ci --ignore-scripts --no-fund --no-audit --fetch-retries=0 --fetch-timeout=30000` | 48 packages; reproducible install from lock; lifecycle scripts disabled |
| Passed | `npm run check` with the harmless build env in root README | Type generation + strict TS; **4/4 unit**; **17/17 actual PG integration**; Next production + compiled worker builds; exit 0, zero skipped |
| Passed | `npm run test:smoke` | Production web and compiled-worker process smoke; recorded final result in handoff |
| Passed | `npm run db:local -- --check` (twice) | Dedicated dev cluster initial setup and repeat startup; stops own server and retains data, no reset |
| Passed | `npm audit --omit=dev --json --fetch-retries=0 --fetch-timeout=15000` | Zero reported runtime advisories at this inspection; not a security certification |
| Passed | `pwsh -NoProfile -File docs/tools/validate-docs.ps1` | 43 Markdown files, 249 local links, two JSON examples and ID coverage, exit 0 |
| Passed | `git diff --check` and new-file whitespace/source review | No whitespace errors/unrelated changes; CRLF normalization notices only; untracked files inspected separately |

Integration checks cover empty DB -> 001 -> populated synthetic rows -> 002, repeated/concurrent migration, checksum drift, injected DDL rollback with no journal residue, compatible nullable expansion and incompatible runtime-floor denial; restricted-role permissions; cross-tenant repository/FK denials; membership/provider/trial/photo uniqueness; same-name distinct IDs; immutable snapshots and same-set pointer; Unicode 500/501 boundary; concurrent response-loss replay with one synthetic effect/job/audit; changed-body conflict; suspended replay denial; atomic failure rollback/retry; TTL/receipt secret rejection; queue dedupe; concurrent claim; stale-token renew/fail/publish denial; publication rollback and deadline recheck; Retry-After/exhaustion/final-crash recovery; invalid payload/unconfigured failure; **separate child process actually killed, then recovered after real 3-second lease expiry**; long handler renews while a competing worker is denied. No T-004 project creation/entitlement domain service was added: its effect harness is synthetic infrastructure testing only.

Early executions exposed a TS parameter-default error and env type conflict, a UUID/text fixture parameter conflict, and Webpack TS-source `.js` resolution failure. Fixed before final checks. Sandbox-only initial build had no useful diagnostic; a sandboxed DB run stalled on loopback and was interrupted. Final executed checks used approved local subprocess/loopback permissions; no automatic approval rejection occurred. Final whitespace/docs/smoke status is recorded in the handoff, not inferred from these early runs.

## Acceptance mapping and limitations

| Focus | Proven foundation | Still outside this evidence |
|---|---|---|
| T-002 / REQ-TEN-001 / BR-TEN-001 | Scoped repository denial, canonical membership/suspension, composite FKs and restricted-role tests | Real auth/session integration, all list/detail/edit/export/media/job HTTP routes and full user principal matrix (BL-004 onward) |
| T-004 / REQ-REL-001 / BR-REL-001 | Atomic synthetic business/job/audit/key, concurrent replay, response loss, mismatch, TTL and rollback | Actual project create/restore, entitlement/quota boundary and revisioned HTTP policies (BL-006) |
| T-017 / REQ-REL-001 / BR-REL-002 | Real PG claim/dedupe, killed process expiry, fencing, renewal, bounded synthetic 429/backoff/exhaustion, safe failure state | Real Drive/quota integration, complete inventory generation publication, diagnostics UI and hosted worker restart/load (BL-007/014/017) |

BL-003 remains **In progress** conservatively for the gated operational/provider-schema portion; its independent local foundation is implemented and verified. Full named acceptance scenarios are not passed. No deployed runtime role/account/auth namespace exists. No hosted CI run, Linux/macOS execution, native browser accessibility/device check, real source image/decoder/storage, live provider or backup/restore/rolling-release drill. The migration compatibility test is an actual SQL reader probe, not proof of an arbitrary older application binary. Full auth durable revocation remains BL-001/004.

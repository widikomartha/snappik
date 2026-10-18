# DEC-003 candidate environment and release contract

Date: 18 October 2026. **Design, not installed provider configuration.** [ADR-008](../decisions/ADR-008-hosting-postgres-private-storage.md); [evidence and provider protocol](DEC-003-EVIDENCE-2026-10-18.md). Deployment remains the owning operations contract. No actual credential, bucket/account identity or secret-store lookup is included.

## Release and environment boundaries

Local: current synthetic loopback PostgreSQL and unconfigured auth/Drive. The new isolated spike uses OS-temp synthetic bytes/images and existing dependencies; it does not configure the application. Sandbox: proposed dedicated synthetic-only services/roles/buckets with explicit owner spending/connection authorization. Staging and production: independent origins, database roles, object/backup identities, auth/Drive secrets and callback registrations. No production secret copied into preview/build/test; no real photos in a sandbox.

Preferred future artifact: one reviewed Linux image digest for web/worker/migrator, built using Node 24.18.0/npm 11.16.0 and the existing lock. No Dockerfile/image exists or was built in this task. Include `.next` runtime output, compiled `dist`, production dependencies, required Next config/runtime files and `src/db/migrations/*.sql`; test the exact allowlist. Exclude `.env*`, `.git`, `.local`, private research, root audit reports/evidence, docs, spikes and test fixtures from runtime/public packaging. Production decoder requires an explicit reviewed dependency pin; current transitive sharp is spike-only evidence.

| Unit | Entry/design | Configuration authority |
|---|---|---|
| Build | Existing `npm ci --ignore-scripts --no-fund --no-audit`, then `npm run build`; future Linux/image build remains untested | Synthetic build-only APP_ORIGIN/DATABASE_URL, telemetry off; no connected DB or provider/DDL credentials |
| Web | Planned Linux command: `node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "$PORT"` | Runtime app-role URL, approved auth/Drive/media-read identities; no migration/backup identity |
| Worker | Planned direct entry: `node dist/worker/main.js` | Runtime app-role URL plus only approved job/Drive/object-write scope; no migration/restore authority |
| Migrator | Planned one-off direct entry: `node dist/db/migrate-cli.js` from artifact root containing source SQL | MIGRATION_DATABASE_URL only; serialized release stage, never from HTTP or each worker startup |
| Backup job | Not implemented; needs PostgreSQL-18-compatible client tools and approved isolated schedule | Restricted export DB identity + encrypted backup-write scope; separate restore identity; neither shared with app |

These provider commands have **not** been deployed/executed as a release. Local `next start --help` verifies hostname/PORT CLI support only. Root `npm start` still binds 127.0.0.1; npm worker:start and db:migrate retain their documented local use. `dist/db/migrate-cli.js` exists locally; SQL is loaded relative to `src/db/migrations`, not dist. Do not omit SQL or rely on dev-only tsx in a stripped runtime. A shared Render pre-deploy hook is not sufficient secret separation if it gives runtime DDL credentials; use an isolated release identity/invocation. Disable automatic deployment until migration/artifact ordering is proved.

## Configuration matrix

| Name | Current support | Candidate value / boundary |
|---|---|---|
| APP_ORIGIN | Validated | Per-environment canonical HTTPS origin; local loopback HTTP allowed |
| DATABASE_URL | Validated by app | Direct session connection, separate least-privilege web/worker roles; pg TLS behavior/CA/hostname must be tested against target, never disable verification globally |
| MIGRATION_DATABASE_URL | CLI only | DDL identity, absent from build/web/worker and shared runtime env groups |
| DB_POOL_MAX | Validated, 1–20, default 5 | Sandbox 5 per process; final per-role budget from target connections and overlapping replicas |
| AUTH_MODE / DRIVE_MODE | Only `unconfigured` accepted | Preserve until their own approved adapters exist; do not set a guessed production mode |
| WORKER_CONCURRENCY | Validated, 1–4, default 2 | Test 1 initially; controls job lanes, not native decoder threads |
| JOB_LEASE_SECONDS | Validated, 3–600, default 120 | Candidate 120, renewal at one-third interval; work may exceed lease with successful renewals |
| NODE_ENV / PORT / NODE_VERSION | Runtime/provider inputs, outside app validator | Production / provider-assigned port / 24.18.0; confirm npm separately. Existing `.node-version` is recognized by Render docs |
| OBJECT_STORAGE_ENDPOINT / OBJECT_STORAGE_BUCKET / OBJECT_STORAGE_CREDENTIALS_REF | Proposed, unused | HTTPS regional S3 endpoint, derived bucket only, service-specific identity; private S3-compatible adapter and failure mapping still absent |
| OBJECT_STORAGE_REGION | Proposed, unused | `ap-southeast-1` for preferred investigation; allowlist endpoint/region, reject config mismatch before processing |
| BACKUP_BUCKET / BACKUP_CREDENTIALS_REF / BACKUP_ENCRYPTION_KEY_REF | Proposed, unused | Separate backup security boundary; never readable by normal gallery service |
| SCRATCH_ROOT / MAX_ACTIVE_ORIGINALS / MAX_SCRATCH_BYTES | Proposed, unused | Private ephemeral non-public path; start with 2 admitted originals/process, 100 MiB byte budget plus filesystem overhead; reject before fetch when full |
| SOURCE_TIMEOUT_MS / DELIVERY_TIMEOUT_MS / TRANSFER_TIMEOUT_MS | Proposed, unused | Experimental 120000 / 480000 / 600000 ms; source+delivery must fit total. Add explicit upstream/client idle cancellation; verify proxy limits before adopting |
| IMAGE_DECODE_CONCURRENCY / IMAGE_MAX_PIXELS / IMAGE_TIMEOUT_SECONDS | Proposed, unused | Experiment 1 / 40000000 / 10; separate native threads 1/cache off. Pixel limit needs product review; no current BR cap changed |
| LOG_LEVEL / TELEMETRY_ENDPOINT | Proposed, unused | Sanitized JSON/metrics, safe request IDs/template route labels; no raw path/query/token/notes/filename or photo bytes |

Missing storage/mode configuration must fail closed once an adapter is implemented; adding unused env names does not enable features. No changes to `.env.example` or runtime validator were made. Auth-specific keys remain owned by DEC-001/session contract; Drive credentials by DEC-002/adapter contract. Server keys never use NEXT_PUBLIC prefixes. Provider-specific keys, secret refresh/rotation and AWS role federation are untested.

## Capacity, shutdown and persistence

Connection example, a hypothesis: one web + worker at 5 each = 10; full old/new overlap = 20. Reserve 5 migration/maintenance and 5 auth connections = 30 before any backup/monitoring connections or growth. Verify role and target maxima; auth has a separate pool. Never add replicas without recalculating this total or use a transaction pooler for session advisory locks without proof. Existing statement timeout 10 s / idle-transaction 15 s / connection acquisition 5 s do not limit external work duration; no external I/O inside a DB transaction.

[Render's lifecycle documentation](https://render.com/docs/deploys) specifies SIGTERM with default 30 s until SIGKILL, configurable up to 300 s without attached disk. Candidate drain 30 s: stop claiming, abort handlers, await cleanup within budget, otherwise let lease expire. Preserve token fencing; verify overlapping old/new worker behavior on Linux. Local worker observes signals but handlers remain unconfigured and do not prove provider cancellation. Do not roll back to a pre-fencing artifact. Readiness validates schema/DB, not auth/Drive/storage capability; release smoke must check them separately without restarts on provider outage.

Scratch has no durable business state, backup or shared-volume requirement. Crash can erase scratch; retain acknowledged DB records and retry safely. Native image processing requires a process/container memory ceiling and hard kill path beyond cooperative decoder timeout; 10 s timeout alone is not a sandbox. 40 MP RGBA is ~160 MB raw before decoder copies, runtime and cache; compressed-byte limits cannot size RAM. Benchmark real supported formats/edge cases in the target Linux worker before selecting capacity.

## Storage, recovery and logging responsibilities

Derived keys are opaque and tenant/project/photo/source-version/transform-version scoped. Keys/filenames are never authorization. Web gets required read scope; worker only required put/read/delete scope; no bucket administration. Block public access at account/bucket; no website endpoint, public CDN, ACL, public custom domain or client signing credentials. Test anonymous and wrong-role denial; a private download URL must not outlive current gallery access. Keep server-mediated access under current API contract.

Daily encrypted logical DB export is retained 30 days in an isolated backup bucket/account boundary, with checksums, manifest, schema/source version and restore-only credentials. S3 versioning alone is not a backup/retention policy. Define noncurrent-version expiry and key recovery; test deletion and restore. Back up object mapping metadata; thumbnails may be rebuilt from still-authorized sources, so full object restore versus rebuild must be explicit. Do not send originals to permanent storage. Seven-day **idle** cache expiry needs application last-access tracking; object creation-age lifecycle alone cannot implement it.

Recovery must be isolated with galleries closed: restore -> validate SQL/checksums/tenant/history -> apply independently retained post-backup deletion/revocation ledger -> reconcile expired leases and object inventory -> deny withdrawn grants/objects -> smoke -> release owner reopens. Such a replay ledger/recovery coordinator is not implemented; the normal audit table restored from the same snapshot cannot supply missing newer events. Missing ledger or encryption key blocks reopening, even if pg_restore succeeds. Record actual RPO/RTO and processor/backup locations.

BR-RET-002 proposes request logs 14 days and audit 180 days. Runtime log filtering does not control provider HTTP logs; verify raw gallery-path suppression before production. Provider retention shorter than 14 days needs a priced/redacted sink or approved plan; longer retention needs configured expiry/review. Keep durable audit events in DB with reviewed retention, not stdout. Record backup success/failure, worker heartbeat, queue lag, safe failure codes and capacity metrics; assign release/incident/backup owners before staging escalation.

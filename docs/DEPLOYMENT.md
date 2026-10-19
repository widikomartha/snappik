# Deployment and operations

Local auth admission now requires reviewed auth005 and matching key/namespace/policy on all serving processes; see [ADR-013](decisions/ADR-013-shared-auth-admission.md) and [admission evidence](auth/DEC-001-ADMISSION-EVIDENCE-2026-10-19.md). AUTH_RATE_WINDOW_SECONDS default60 (1–3600), AUTH_RATE_*_GLOBAL and AUTH_RATE_LOGIN_ACCOUNT/RECOVERY_ACCOUNT/TOTP_PROOF are validated positive ceilings in .env.example. Existing policy fingerprint rejects drift503; changing configured limits/key requires stopped auth traffic, drained old windows and reviewed migrator transition, never runtime policy reset. Apply SQL/grants to a known approved target before this artifact serves auth. Pre005 artifacts bypass admission: do not mix them into rollout or roll back silently. No automated production deployment/rotation tool added. Incoming IP headers are ignored; authenticated edge identity/direct-origin isolation/NAT/IPv6/fairness/load remain release gates. Expiry cleanup is lazy and bounded, not a new background worker.

Status: provider-neutral runbook with a verified BL-003 [local setup/build/migration harness](../README.md) and [evidence](foundation/BL-003-EVIDENCE.md). Hosting/auth/storage remain gated by DEC-001/003; no live infrastructure, deployed roles or provider deployment scripts exist. `.env.example` contains only harmless synthetic loopback configuration. BL-001 has an isolated synthetic auth spike. The [candidate session configuration](auth/SESSION_CONTRACT.md) adds BETTER_AUTH_URL/SECRET(S), AUTH_INSTANCE_ID, restricted AUTH_DATABASE_URL and AUTH_MAIL_CONFIG_REF; these do not select hosting or authorize provider connection.

BL-002 adds an offline [Drive/streaming spike](../spikes/bl002-drive/README.md), [candidate contract](drive/ADAPTER_CONTRACT.md) and [ADR-005](decisions/ADR-005-drive-hosting-feasibility.md). Its conditional evaluation of Render Singapore web/worker/PostgreSQL plus private object storage does not select a provider. DEC-002/003 remain open; no infrastructure or provider configuration is present.

## BL-002 hosting feasibility constraints

19 October local auth is now an explicit loopback-only validation slice, described in [ADR-009](decisions/ADR-009-auth-local-hardening.md). It adds a separate reviewed auth migration CLI/journal and grant template, bounded auth pool plus app pool (default 5+5 web connections), namespace/key validation and same-database target checks. No production mode or external credential connection exists. APP_ORIGIN/DB loopback restrictions and local HTTP non-Secure cookie are deliberate test boundaries, not a deployable auth configuration. Production host/role/TLS/pool budget, key rotation, shared throttles and recovery/backup reconciliation still require DEC-001/003 evidence. Historical proposed AUTH_DATABASE_URL/MAIL_CONFIG_REF are not implemented keys in this slice.

Current DEC-003 investigation: [ADR-008](decisions/ADR-008-hosting-postgres-private-storage.md), [evidence/closure protocol](hosting/DEC-003-EVIDENCE-2026-10-18.md), [candidate configuration/release matrix](hosting/CONFIGURATION_CONTRACT.md). These supplement the historical ADR-005 proposal with conditional Render Singapore web/worker/PG18 + private S3 Singapore; R2 location-conditional storage and Railway hosting fallbacks. DEC-003 remains OPEN/PARTIALLY VALIDATED; owner confirms budget and location requirements unset. Public USD arithmetic is sourced but regional quote/complete cost unverified. No provider connection, deployment or operational setup performed.

New local evidence: five HTTP transport/cancellation checks and two native decoder cases Passed; restore utilities absent from PATH/bundled server, so no backup/restore performed. Existing real-PG lease evidence is historical foundation evidence, not hosted durability. Compatibility gaps: npm start forces loopback, compiled migration requires source SQL, target Linux/native/TLS is untested, DDL identity needs separate release injection, provider path logs may contain gallery tokens. The candidate contract distinguishes implemented configuration from unused proposals; `.env.example` and runtime code are unchanged. A 30-day independent backup/revocation ledger and object reconciliation are still unimplemented.

ADR-005 records dated official sources, indicative price floor and unknowns. Required next evidence: exact region/plan/budget, >=50 MiB binary proxy path, idle/total timeouts, slow/client-cancel behavior, scratch high-water/admission, actual worker restart/lease fencing with PostgreSQL, object anonymous-denial, and restore/revocation reconciliation. Do not deploy an assumed streaming exception or treat dynamic pricing search extracts as a purchase quote.

Candidate production transfer path uses <=50 MiB ephemeral scratch per admitted original and independent web/worker process limits. Begin evaluation with at most two active transfers per process and shared credential limits; use measured decoder memory before selecting worker size. A 120-second synthetic upstream timeout is not a validated hosting limit. Postgres pools must fit all replicas plus migration/ops reserve. Region placement hints do not prove residency; processor/backup location review remains open.

Paid-host PITR in the evaluated candidate has a shorter window than the baseline 30-day backup retention. Budget a separate daily encrypted logical-export path, retention/access controls and isolated restore drill. No PostgreSQL persistence, backup RPO/RTO, decoder capacity or PRD pilot load was measured by the local spike.

## Environments and release units

Recovery local increment: [ADR-010](decisions/ADR-010-password-recovery-outbox.md) requires reviewed auth004 before auth startup and grants updated_at on app users plus recovery-only tables to the trusted runtime. Optional AUTH_RECOVERY_KEY is a distinct stable32-byte canonical base64url server key; no public exposure, silent regeneration or keyring/rotation implementation. DB_POOL_MAX minimum2 in local auth because the credential fence holds one connection while native session attachment needs another; web maximum remains2×configured pool, plus separately run drains/migrations. Explicit `npm run auth:recovery:drain` opens max2 connections, discards<=10 synthetic messages and prints sanitized counts/states/age, then performs recovery-only1day cleanup. No real sender/scheduler or deployment configuration is implemented. Preserve encrypted backlog/key across restarts; at-least-once messages can duplicate. Hosted cancellation/idempotency/monitoring, request-body/edge log suppression, secret custody/rotation/restore and capacity/costs remain unverified. No source SQL packaging/host approval is implied.

Local development uses synthetic data and mocked provider boundaries unless explicitly connecting a test account. Staging uses isolated test credentials, database and private object bucket. Production uses separate secrets/accounts with least privilege. Never seed real Fastpik account credentials or audited client photos into public fixtures.

Deploy web and worker from the same immutable build/commit, with a separately tracked migration version. PostgreSQL hosts business data and jobs. Private storage holds derived images only. Provider-managed account auth is integrated through a reviewed callback/session configuration.

## Configuration contract

Names are proposed application configuration keys, not framework-specific auto-discovery names. None contains an actual value/secret here.

The scaffold validator currently consumes `APP_ORIGIN`, `DATABASE_URL`, `DB_POOL_MAX` (1–20; default 5), `WORKER_CONCURRENCY` (1–4; default 2), `JOB_LEASE_SECONDS` (3–600; default 120), `AUTH_MODE`/`DRIVE_MODE` (only `unconfigured`). Migration CLI separately requires `MIGRATION_DATABASE_URL`. Remaining provider/product/telemetry keys below are not connected or validated yet. Both processes validate before traffic/work; build uses harmless valid URLs without connecting. Pools bound connection/statement/idle-transaction timeouts; replica sizing remains untested.

| Variable | Sensitivity | Purpose |
|---|---|---|
| `APP_ORIGIN` | Public configuration | Canonical HTTPS origin and callback validation |
| `DATABASE_URL` | Secret | Web/worker database access with constrained role |
| `MIGRATION_DATABASE_URL` | Secret, deployment only | DDL permission; not injected into normal runtime |
| `AUTH_ISSUER`, `AUTH_CLIENT_ID` | Provider-dependent | Auth integration identity |
| `AUTH_CLIENT_SECRET` | Secret where required | Provider exchange; exact keys depend on DEC-001 |
| `SESSION_SECRET` | Secret if chosen auth strategy needs it | Signed/encrypted session material; omit if provider owns equivalent function |
| `DRIVE_ACCESS_CONFIG_REF` | Secret reference | Approved adapter credentials/configuration from DEC-002 |
| `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET` | Internal configuration | Private derived asset service |
| `OBJECT_STORAGE_CREDENTIALS_REF` | Secret reference | Scoped object read/write identity |
| `WORKER_CONCURRENCY` | Internal configuration | Initial 2; tune using provider and memory limits |
| `JOB_LEASE_SECONDS` | Internal configuration | Initial 120; renew during long jobs |
| `MAX_PROJECT_PHOTOS`, `MAX_FOLDER_DEPTH` | Product configuration | Baseline 5000 / 10 |
| `MAX_SOURCE_FILE_BYTES` | Product configuration | Baseline 52428800 (50 MiB) |
| `TRIAL_DAYS`, `TRIAL_PROJECT_LIMIT` | Product configuration | Baseline 7 / 3; changes versioned, not retroactively applied |
| `LOG_LEVEL`, `TELEMETRY_ENDPOINT` | Internal configuration | Sanitized monitoring; no full payload logging |

Validate required configuration at process startup; fail clearly before serving traffic if invalid. Provider secrets never use browser-exposed variable prefixes. A checked-in `.env.example` may contain names and harmless placeholders only when scaffolding begins.

## Build and release procedure

1. Run lint/type checks, meaningful unit/integration tests, schema migration tests and the acceptance suite for changed boundaries.
2. Build an immutable artifact; record source SHA, dependency lockfile, schema version and config version.
3. Check migration compatibility with currently running web/worker. Prefer expand/backfill/contract; snapshot/backup before risky migrations.
4. Apply reviewed migration with the deployment role; do not run ad hoc schema changes from a browser request.
5. Deploy staging; test auth callback, project creation, inventory, confirm/export/download, operator denial and health endpoints.
6. Verify no forbidden public objects, missing secrets, unresolved translation tokens or sample production contacts.
7. Release compatible web/worker versions. Drain/recover job leases gracefully; no unbounded duplicate worker startup.
8. Monitor error rate, queue age, inventory failures and mutation latency; halt rollout on regression. Record release outcome.

Exact CLI/container/hosting commands belong in the implementation repository after DEC-003; do not treat invented commands in planning docs as executable deployment automation.

BL-003 root README now owns exact **local** npm commands. CI installs pinned Node/npm/lockfile and runs type/unit/real-PG/build/smoke/docs checks on Windows; hosted execution is Not run. The development-only embedded PostgreSQL package is not a hosting choice. Source SQL is a separate release input, not run from HTTP or auto-applied by worker. Runtime compatibility is documented/tested in Database: retain additive schema during application rollback, require fenced level-2 workers, raise the floor deliberately for breaking changes. No destructive down migrations, hosted deployment, backup/restore drill or paid provisioning was performed. DEC-003 stays open.

## Health and alerting

`/health/live` reports process liveness only. `/health/ready` verifies required internal dependencies without returning connection strings or sensitive details. Provider outages should degrade source-dependent functions, not trigger endless restart loops. Worker exposes/records heartbeat and lease-processing health through restricted monitoring.

Proposed pilot alerts: sustained API 5xx >2% for 5 minutes; oldest ready job >10 minutes; worker heartbeat missing >3 minutes; repeated confirmation failures; restore/backup failure; storage or DB capacity >80%. Tune using observed traffic before claiming an SLA.

## Backups and recovery

Targets to validate: database RPO <=24 hours and RTO <=4 hours for pilot. Daily encrypted backups with 30-day retention; enable point-in-time recovery if supported and adjust the documented RPO only after a drill. Derived images can be rebuilt; retain object inventory/mapping metadata needed to avoid orphan exposure. Original photos remain the studio's Drive responsibility.

Quarterly or before material storage changes: restore into isolated staging, validate tenant isolation and confirmed snapshots, reconstruct/reconcile jobs, reapply post-backup revocation/deletion records, check object permissions, run smoke tests, then record actual RPO/RTO. Never expose restored galleries before that reconciliation.

## Rollback and incident actions

- Application regression: roll back to the last schema-compatible artifact; pause affected job kind, not the entire database unnecessarily.
- Migration issue: stop writes if integrity is at risk, assess forward repair; do not drop columns/data as a routine rollback.
- Drive outage: respect provider retry/backoff, retain last inventory, show source state.
- Leaked credential: rotate with provider, update runtime secret, invalidate affected sessions/grants where appropriate and preserve audit evidence.
- Suspected cross-tenant exposure: restrict affected access, investigate IDs/time window, fix and retest T-002/T-012/T-018 before reopening.

## Operational ownership

Assign a named release owner, incident responder, data-request owner and backup/restore owner before production. In a small team one person may hold several duties; responsibilities still must be explicit. Operator UI permissions do not imply infrastructure shell/database privileges.

Public launch requires DEC-006 privacy/retention review and actual support contact. Payment processing and commercial claims require DEC-004 and the deferred billing implementation, not just a configured price label.

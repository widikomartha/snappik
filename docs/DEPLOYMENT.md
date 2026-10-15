# Deployment and operations

Status: provider-neutral runbook. Hosting/auth/storage remain gated by DEC-001/003. BL-001 has an isolated synthetic auth spike only; no live infrastructure, environment files or deployment scripts exist. The [candidate session configuration](auth/SESSION_CONTRACT.md) adds BETTER_AUTH_URL/SECRET(S), AUTH_INSTANCE_ID, restricted AUTH_DATABASE_URL and AUTH_MAIL_CONFIG_REF; these do not select hosting or authorize provider connection.

## Environments and release units

Local development uses synthetic data and mocked provider boundaries unless explicitly connecting a test account. Staging uses isolated test credentials, database and private object bucket. Production uses separate secrets/accounts with least privilege. Never seed real Fastpik account credentials or audited client photos into public fixtures.

Deploy web and worker from the same immutable build/commit, with a separately tracked migration version. PostgreSQL hosts business data and jobs. Private storage holds derived images only. Provider-managed account auth is integrated through a reviewed callback/session configuration.

## Configuration contract

Names are proposed application configuration keys, not framework-specific auto-discovery names. None contains an actual value/secret here.

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

# Snappik local foundation

BL-003 foundation/BL-004 onboarding plus [DEC-001 local hardening](docs/decisions/ADR-009-auth-local-hardening.md). Owner APIs use atomic setup with same-transaction session rechecks. Default auth remains unavailable; explicit loopback-only Better Auth credential/TOTP mode supports login/setup/logout with durable revocation. No fixture-login HTTP switch, external provider, recovery delivery or production mode is enabled. DEC-001 remains OPEN. Drive/job handlers unchanged. Start with [agent instructions](AGENTS.md), [project state](docs/agents/PROJECT_STATE.md) and [current evidence](docs/auth/DEC-001-EVIDENCE-2026-10-19.md).

## Requirements and install

Verified on Windows x64, PowerShell 7.6.5, Node 24.18.0 and npm 11.16.0. Use the declared Node 24 line and exact npm version. Dependencies are pinned by [package.json](package.json) and [lockfile](package-lock.json): Next.js 16.4.1, React 19.3.1, TypeScript 5.9.3, pg 8.23.1, tsx 4.23.15. No global framework CLI required.

```powershell
npm ci --ignore-scripts --no-fund --no-audit
Copy-Item .env.example .env.local
npm run db:local
```

Run from the repository root. Leave the database command in its terminal. It starts a dedicated synthetic PostgreSQL 18.4 cluster on **127.0.0.1:55433**, retains it under ignored `.local/postgres-dev`, and stops on Ctrl+C. It never resets an existing cluster. Credentials in the example are synthetic loopback-only values, unsuitable for shared environments. The `embedded-postgres` wrapper/binary package is a pinned **development-only beta distribution**, not a database hosting choice. Windows binaries work with install scripts disabled; Linux/macOS packaging/symlink behavior has not been verified here.

`npm run db:local -- --check` starts/ensures that dedicated database, reports success and stops its own server. This one-shot setup check and repeat startup were executed. If first setup is interrupted after cluster initialization, rerunning creates the missing named database without resetting data.

In another terminal:

```powershell
npm run db:migrate
npm run dev
```

In a third terminal:

```powershell
npm run worker
```

Next.js reads `.env.local`; CLI/worker scripts explicitly load that file. `DATABASE_URL` is runtime-only, `MIGRATION_DATABASE_URL` is the reviewed DDL connection. They share the local synthetic cluster owner **only for local setup**. Do not use an unknown database for experiments. No production role, provider, storage or secret configuration is selected. A separate pre-existing non-owner service role can receive [foundation grants](src/db/runtime-grants.sql) plus [onboarding grants](src/db/onboarding-grants.sql); see [security boundary](docs/SECURITY.md). These templates are tested, not automatically applied or a deployed role.

## Verification and build

```powershell
npm run typecheck
npm test
npm run test:db
npm run build
npm run test:smoke
pwsh -NoProfile -File docs/tools/validate-docs.ps1
```

`npm run check` runs typecheck, unit tests, real PostgreSQL integration tests and both builds in order. Build requires valid `APP_ORIGIN` and `DATABASE_URL`, but does not connect to the database. Without `.env.local`, set harmless environment values explicitly:

```powershell
$env:APP_ORIGIN='http://localhost:3000'
$env:DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:55433/build_only'
$env:NEXT_TELEMETRY_DISABLED='1'
npm run check
npm run test:smoke
```

The DB suite and smoke test **ignore runtime database URLs** and create fresh uniquely named clusters/databases on dynamically allocated loopback ports. All accounts/records are synthetic. They stop their own server and retain ignored test directories for inspection. No Docker, service installation, live provider or destructive reset is used. They require subprocess and loopback permissions; a restricted sandbox can block them. The smoke test builds on the existing build output and starts/stops web/compiled worker, tests readiness before/after the real migration CLI and restarts the worker. Hosted CI is configured, not yet executed.

After building, `npm start` runs the web artifact; `npm run worker:start` runs `dist/worker/main.js`. Source SQL migrations stay in `src/db/migrations` and migration execution stays a separate release step. Deployable packaging/provider setup belongs to the still-open deployment gate. [Evidence](docs/foundation/BL-003-EVIDENCE.md) records what actually ran.

## Local authentication validation

Root lock now also pins Better Auth 1.7.9 and Kysely 0.29.6. These support the local slice, not production version approval. After a current build, run `npm run test:auth` (new isolated PG hardening suite), `npm run test:auth:smoke` (actual Next HTTP/process checks), or `npm run test:auth:smoke -- --serve` for an isolated synthetic browser review. The review launcher prints only a synthetic account/password and loopback origin; keys remain in memory. Stop with Enter/Ctrl+C, or its ten-minute bound. No live signup/provider/email is used. Clusters are generated under ignored .local and retained, never an existing DATABASE_URL reset.

Manual local opt-in requires AUTH_MODE=better-auth-local, loopback APP_ORIGIN and DATABASE_URL, a fixed AUTH_INSTANCE_ID and generated server-only BETTER_AUTH_SECRET >=32 characters; optional BETTER_AUTH_URL must exactly equal APP_ORIGIN. Apply app migrations first, then `npm run db:auth:migrate` with a reviewed local DDL target matching runtime host/port/database. It executes [reviewed SQL](src/db/auth-migrations/001_better_auth.sql), not a floating generator, with a separate auth checksum journal. No automatic DDL at web startup. A browser account is seeded only by the test launcher/server fixture, never an HTTP test-login endpoint; public signup and external recovery delivery remain unavailable. Do not use local HTTP cookies or synthetic owner credentials in shared environments.

Recovery/reset local validation: `npm run test:recovery` runs fresh PostgreSQL failure/concurrency/outbox tests. Optional AUTH_RECOVERY_KEY must be a separate generated 32-byte canonical base64url server key, stable across restarts; no value is supplied here. It enables `/recover` request/reset, with 15-minute single-use tokens and atomic password/session-version invalidation. Auth schema004 and DB_POOL_MAX>=2 are required. `npm run auth:recovery:drain` explicitly discards at most10 synthetic messages, prints sanitized aggregate states and performs recovery-only retention; it does not send email, reveal a reset link or schedule future work. Tests use an in-memory delivery sink. Real mail, browser recovery interaction, shared abuse defense, secret rotation and production acceptance remain open. See [ADR-010](docs/decisions/ADR-010-password-recovery-outbox.md), [evidence](docs/auth/DEC-001-RECOVERY-EVIDENCE-2026-10-19.md), and [active handoff](docs/agents/handoff-2026-10-19-DEC-001-recovery.md).

On duplicate provider/subject records, migration 002 aborts with AUTH_ACCOUNT_DUPLICATES_REQUIRE_REVIEW, preserving every row. There is no automatic survivor/merge/delete or unmanaged-schema adoption. Review identity ownership/history before any separately authorized repair. Existing sessions without security metadata deny access. [Auth grants](src/db/auth-grants.sql) complement the existing templates but are not deployed credentials. Full [limitations/next steps](docs/agents/handoff-2026-10-19-DEC-001.md) remain release gates.

## Migration and compatibility policy

No down/reset command exists. Numbered SQL is checksum-checked, serialized with a database advisory lock and committed with its journal entry. Failed DDL rolls back. Never edit a migration after it has been applied to a persistent/shared database. BL-004 reuses the committed 001/002 schema without changing migration history.

Expand with nullable/defaulted fields, backfill, validate, then remove fields only after readers/writers are upgraded. `schema_compatibility.minimum_runtime` is the protocol floor. Runtime level 2 requires migration 002; it accepts future expansions that preserve that floor, and rejects an incompatible higher floor. Migration 002 introduces lease fencing; **never roll workers back to a pre-fencing implementation**. Application rollback keeps the schema and uses a compatible level-2 artifact. There is no earlier production artifact to roll back to. A tested additive SQL reader probe is not a hosted rolling-release or backup-restore drill. See [Database](docs/DATABASE.md) and [Deployment](docs/DEPLOYMENT.md).

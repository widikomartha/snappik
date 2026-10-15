# Snappik local foundation

BL-003 provider-independent foundation plus a BL-004 onboarding subset. `/api/v1/me` and `/api/v1/onboarding` now delegate to atomic PostgreSQL provisioning/setup; `/login`, `/recover`, `/onboarding` and `/app` show honest unavailable states until auth is configured. DEC-001 remains open: the auth adapter fails closed with 503, and there is no synthetic login switch. No real login/logout/recovery is installed. Drive and all job handlers remain unconfigured. Start with [agent instructions](AGENTS.md), [project state](docs/agents/PROJECT_STATE.md) and [BL-004 evidence](docs/auth/BL-004-EVIDENCE.md).

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

## Migration and compatibility policy

No down/reset command exists. Numbered SQL is checksum-checked, serialized with a database advisory lock and committed with its journal entry. Failed DDL rolls back. Never edit a migration after it has been applied to a persistent/shared database. BL-004 reuses the committed 001/002 schema without changing migration history.

Expand with nullable/defaulted fields, backfill, validate, then remove fields only after readers/writers are upgraded. `schema_compatibility.minimum_runtime` is the protocol floor. Runtime level 2 requires migration 002; it accepts future expansions that preserve that floor, and rejects an incompatible higher floor. Migration 002 introduces lease fencing; **never roll workers back to a pre-fencing implementation**. Application rollback keeps the schema and uses a compatible level-2 artifact. There is no earlier production artifact to roll back to. A tested additive SQL reader probe is not a hosted rolling-release or backup-restore drill. See [Database](docs/DATABASE.md) and [Deployment](docs/DEPLOYMENT.md).

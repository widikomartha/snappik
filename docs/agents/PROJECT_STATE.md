# Project state

Snapshot: 15 October 2026 (Asia/Makassar), BL-003 implementation session. Starting clean local master / HEAD `1089964` (BL-005). User subsequently authorized a local BL-003 commit; this snapshot accompanies it (resolve SHA with git log). No push, publish, deployment, real-provider connection or paid provisioning. Verify actual Git/files each chat; local workspace is authoritative.

| Area | Current state | Evidence / limitation |
|---|---|---|
| Web / worker | Provider-independent TypeScript/Next.js foundation | [Root setup](../../README.md), [evidence](../foundation/BL-003-EVIDENCE.md); status/health only; compiled worker/dispatcher, no business routes/real handlers |
| Runtime / package manager | Node 24.18.0 / npm 11.16.0, PowerShell 7.6.5, Windows x64 | Root package/lock, .node-version, exact install/ci executed; Next 16.4.1, React 19.3.1, TS 5.9.3, pg 8.23.1, tsx 4.23.15 |
| Database | Initial app SQL 001 + lease expansion 002; real isolated PostgreSQL 18.4 verified | Composite scope keys, uniqueness, immutable history, migrations/checksums/compatibility, runtime grant template; no provider-owned auth schema or deployed role |
| Tenant / reliability | Scoped repositories, membership/suspension, transaction/audit/idempotency, durable queue/leases/fencing/retries | 4 unit + 17 real PG tests Passed; principals and business effects explicitly synthetic; no auth provider/session revocation claim |
| Config / health / CI | Startup config, PG timeout/pool bounds, no-store live/ready, Windows workflow configured | Production web/compiled-worker/CLI smoke Passed; hosted CI Not run; replica capacity untested |
| BL-003 acceptance | In progress, local foundation implemented/verified | T-002/004/017 foundation subsets only; operational/provider-schema portions gated by DEC-001/002/003; no adjacent backlog services implemented |
| Auth | BL-001 In progress / DEC-001 open | [Candidate contract](../auth/SESSION_CONTRACT.md), [evidence](../auth/BL-001-EVIDENCE.md); real callback/email/MFA/durable revocation still pending; scaffold adapter returns no principal |
| Drive / hosting / storage | BL-002 In progress / DEC-002/003 open | [ADR-005](../decisions/ADR-005-drive-hosting-feasibility.md), [evidence](../drive/BL-002-EVIDENCE.md); dedicated fixtures unavailable; resource-key/credential schema and live infrastructure still unresolved; scaffold fails unconfigured |
| UX | BL-005 Done for design/prototype only | [Prototype](../../prototypes/bl005-ux/README.md), [evidence](../design/BL-005-EVIDENCE.md); no application integration; full T-006/T-016 not passed |
| Product scope | Contracts unchanged | PRD/rules unchanged; API actual-health inventory and Database physical invariants clarified; onboarding/project/inventory/gallery/selection/operator services pending |
| Research / privacy | Private research preserved, unused by scaffold | Only synthetic accounts/records, no live tokens/photos/credentials logged or copied |
| Deployment / recovery | Not connected/deployed | No production host/storage/auth selected; no backup restore, load or rolling release drill; beta embedded-PG package is development tooling only |

## Exact install, setup and verification commands

Run from repository root on the declared Node/npm versions. Full command explanations: [root README](../../README.md). Local setup (database command stays in its terminal):

```powershell
npm ci --ignore-scripts --no-fund --no-audit
Copy-Item .env.example .env.local
npm run db:local
```

Another terminal: `npm run db:migrate`, then `npm run dev`. Separate worker terminal: `npm run worker`. After build, `npm start` / `npm run worker:start` use the production web/compiled-worker entries. The local DB helper uses only its dedicated loopback cluster at 55433 under `.local/postgres-dev`; no reset command exists. The sample local cluster owner is not a shared runtime role. Normal runtime must not receive MIGRATION_DATABASE_URL.

Executed verification without creating a persistent .env.local:

```powershell
$env:APP_ORIGIN='http://localhost:3000'
$env:DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:55433/build_only'
$env:NEXT_TELEMETRY_DISABLED='1'
npm run check
npm run test:smoke
```

`check` executes `npm run typecheck` (Next typegen + strict tsc), `npm test` (4/4), `npm run test:db` (17/17, PostgreSQL 18.4), `npm run build` (Next Webpack production + tsc worker). All Passed, exit 0, zero skipped. The isolated DB harness never uses DATABASE_URL; fresh generated clusters with synthetic credentials are stopped and retained under ignored `.local/pg-test-*`. Smoke starts/stops production web/compiled worker and runs migration CLI on another fresh database: liveness, ready 503 -> migrations -> ready 200, no-store, unconfigured status, absent business routes and worker restart Passed. This proves actual migration CLI/process entries, not an authenticated product flow.

Also executed `npm install --ignore-scripts --no-fund --no-audit --fetch-retries=0 --fetch-timeout=30000` and clean lock `npm ci` with the same flags; both Passed (48 platform packages). `npm run db:local -- --check` ran twice: first setup and repeat startup Passed on the dedicated retained `.local/postgres-dev` database; no reset. `npm audit --omit=dev --json --fetch-retries=0 --fetch-timeout=15000`: zero reported runtime advisories at inspection. Final docs/whitespace/review evidence is in the active [BL-003 handoff](handoff-2026-10-15-BL-003.md). Hosted CI, Linux/macOS, interactive `dev` walkthrough, real providers and deployment are Not run. No `.env.local` was created. Sandboxed build/DB attempts initially failed or stalled; final checks used approved local subprocess/loopback permissions. No approval review rejection.

Existing spike/prototype commands remain independent: `npm --prefix spikes/bl001-auth test`, `npm --prefix spikes/bl002-drive test`, `npm --prefix prototypes/bl005-ux run check`, `npm --prefix prototypes/bl005-ux test`. Their previous results are in their existing evidence/handoffs; not rerun for BL-003 because those sources were unchanged. Documentation check: `pwsh -NoProfile -File docs/tools/validate-docs.ps1`.

## Active handoff and exact next action

BL-003 active [handoff](handoff-2026-10-15-BL-003.md) supersedes BL-005 as the current workspace implementation snapshot. Local independent deliverable is ready for review; whole item remains In progress for operational/provider-schema gates. First action in the next new BL-003 chat: read that handoff, inspect current Git/manifests, and inspect DEC-001/002/003 closure evidence to determine whether approved provider schema and an authorized target PostgreSQL/hosting topology now exist. If gates remain open, preserve the verified local foundation and report the exact missing decision; do not fabricate a provider migration or start BL-004/006/007. No live provider authorization is implied by this handoff.

BL-001/002 remain separately active in [auth handoff](handoff-2026-10-15-BL-001.md) and [Drive handoff](handoff-2026-10-15-BL-002.md). BL-005 [design handoff](handoff-2026-10-15-BL-005.md) is completed and remains valid for later UI integration. Open provider gates require their own authorized evidence; BL-003 did not close them. Other backlog IDs remain outside this chat.

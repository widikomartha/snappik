# Project state

## DEC-001 investigation update — 18 October 2026

Verified startup: clean local `master` / HEAD `5a00473`; app/dependencies remain the BL-004 implementation below. [ADR-006](../decisions/ADR-006-auth-session-postgres-validation.md) supplements ADR-004, retaining conditional Better Auth/PostgreSQL and Auth0 fallback. **DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 In progress; no approved production auth decision.**

[Current evidence](../auth/DEC-001-EVIDENCE-2026-10-18.md): memory tests rerun 18/18; new real PG 18.4 suite 5/5 with native library sessions/callback/logout/reset across instances/processes, DB restart and synchronized reset consumption. OAuth/profile/mail/protected business scope remain synthetic. Raw logout returns 200 on failed deletion; generated account schema accepts duplicate provider/subject pairs until a spike-only index. Passing finding tests do not meet those production requirements. Runtime auth remains unavailable; no app auth schema/route added.

Official capabilities/public prices refreshed, version drift recorded (tested 1.7.9, official 1.7.10 not tested); no package install/upgrade. Targeted spike TypeScript passed. Next/browser auth, signed provider callback/delivered recovery, app revocation/operator assurance, production auth grants and budget/host/hash/rotation validation remain open. No commit/push/deployment/paid provisioning/live connection. Use [DEC-001 handoff](handoff-2026-10-18-DEC-001.md) for this investigation; BL-004 handoff below remains active for its implementation.

Next local engineering slice, when requested: reviewed isolated provider schema/account uniqueness plus durable app session-security wrapper and deterministic user-lock revocation races; keep runtime unavailable until approved dedicated Next/provider configuration and full smoke evidence exist. This update authorizes no external connection.

## BL-004 implementation snapshot

Snapshot: 15 October 2026 (Asia/Makassar), BL-004 implementation session. Starting clean local master / HEAD `d1686b9` (BL-003). User subsequently authorized a local BL-004 commit; this snapshot accompanies it (resolve SHA with git log). No push, publish, deployment, real-provider connection or paid provisioning. Verify actual Git/files each chat; local workspace is authoritative.

| Area | Current state | Evidence / limitation |
|---|---|---|
| Web / worker | Foundation plus BL-004 setup/access pages and two owner handlers | `/api/v1/me`, `/api/v1/onboarding`, `/login`, `/recover`, `/onboarding`, `/app`; real auth unconfigured; worker handlers unchanged |
| Runtime / package manager | Node 24.18.0 / npm 11.16.0, PowerShell 7.6.5, Windows x64 | Root package/lock, .node-version, exact install/ci executed; Next 16.4.1, React 19.3.1, TS 5.9.3, pg 8.23.1, tsx 4.23.15 |
| Database | Initial app SQL 001 + lease expansion 002; real isolated PostgreSQL 18.4 verified | Composite scope keys, uniqueness, immutable history, migrations/checksums/compatibility, runtime grant template; no provider-owned auth schema or deployed role |
| Tenant / reliability | Scoped repositories plus atomic onboarding; queue/leases/fencing unchanged | Final BL-004 check: 4 unit + 27 real-PG tests Passed (17 foundation + 10 onboarding); sessions/provider identities synthetic; no durable auth revocation claim |
| Config / health / CI | Startup config, PG timeout/pool bounds, no-store live/ready, Windows workflow configured | Production web/compiled-worker/CLI smoke Passed; hosted CI Not run; replica capacity untested |
| BL-003 acceptance | In progress, local foundation implemented/verified | T-002/004/017 foundation subsets only; operational/provider-schema portions gated by DEC-001/002/003; no adjacent backlog services implemented |
| Auth / onboarding | BL-001/004 In progress / DEC-001 open | [BL-004 evidence](../auth/BL-004-EVIDENCE.md): atomic mapping/studio/membership/settings/single 168-hour, limit-3 trial; profile validation/idempotent completion, incomplete repair, no renewal, server membership scope. Runtime adapter returns 503; real callback/email/logout/recovery/durable revocation pending |
| Drive / hosting / storage | BL-002 In progress / DEC-002/003 open | [ADR-005](../decisions/ADR-005-drive-hosting-feasibility.md), [evidence](../drive/BL-002-EVIDENCE.md); dedicated fixtures unavailable; resource-key/credential schema and live infrastructure still unresolved; scaffold fails unconfigured |
| UX | BL-005 Done for design/prototype only | [Prototype](../../prototypes/bl005-ux/README.md), [evidence](../design/BL-005-EVIDENCE.md); no application integration; full T-006/T-016 not passed |
| Product scope | PRD unchanged; setup contract details clarified | API/Database/Business Rules record reserved slugs, defaults, atomic repair and retry conflicts. No project/inventory/gallery/selection/operator service added |
| Research / privacy | Private research preserved, unused by scaffold | Only synthetic accounts/records, no live tokens/photos/credentials logged or copied |
| Deployment / recovery | Not connected/deployed | No production host/storage/auth selected; no backup restore, load or rolling release drill; beta embedded-PG package is development tooling only |

## Exact install, setup and verification commands

BL-004 final verification: `npm run check` Passed (strict typecheck, 4 unit, 27 PostgreSQL 18.4 checks, web/compiled-worker build), `npm run test:smoke` Passed (actual production processes/migration CLI, fail-closed owner APIs, CSRF, safe return and unavailable pages), docs validator Passed (45 Markdown, 261 links, 2 JSON examples), diff/whitespace review Passed. Exact environment, corrected early failures and unexecuted/provider gaps: [BL-004 evidence](../auth/BL-004-EVIDENCE.md). No dependency install, production migration, browser-auth or provider connection was performed. Historical BL-003 command evidence below remains valid for that session; BL-004 expands its DB suite.

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

BL-004 active [handoff](handoff-2026-10-15-BL-004.md) supersedes BL-003 as the current implementation snapshot. First action in a new BL-004 chat: read that handoff and inspect current Git plus DEC-001/ADR-004 closure evidence for an approved provider/session contract and explicitly authorized dedicated test configuration. If absent, keep BL-004 In progress; no synthetic adapter closes the gate. The previous [BL-003 handoff](handoff-2026-10-15-BL-003.md) remains valid for its separate operational/provider-schema gaps.

BL-001/002 remain separately active in [auth handoff](handoff-2026-10-15-BL-001.md) and [Drive handoff](handoff-2026-10-15-BL-002.md). BL-005 [design handoff](handoff-2026-10-15-BL-005.md) is completed and remains valid for later UI integration. Open provider gates require their own authorized evidence; BL-003 did not close them. Other backlog IDs remain outside this chat.

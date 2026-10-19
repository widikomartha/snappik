# Project state

## DEC-001 conditional architecture approval — 19 October 2026

Commit follow-up: the user subsequently authorized a local commit of the related TOTP lifecycle, closure audit and conditional approval worktree. No-commit/uncommitted statements below and in the dated evidence describe their pre-commit snapshots; actual Git history owns the resulting commit identity. Push/deployment/external connections remain unauthorized.

Product owner explicitly approved **Better Auth+PostgreSQL direction with all gates retained**, plus **invitation-only studio-owner pilot; public registration later**. [ADR-015](../decisions/ADR-015-auth-architecture-conditional-approval.md) records actual answers; [approval package](../auth/DEC-001-ARCHITECTURE-APPROVAL-2026-10-19.md) compares alternatives, verified local guarantees/assumptions, D01–D07 choices and dependency-aware execution plan. DEC-001 remains OPEN/PARTIALLY VALIDATED under every C01–C23 criterion. Architecture approval is not MVP completion, production pin/risk acceptance or release permission. BL-001/003/004 In progress; BL-014/015/016/017 Todo. Older dated entries below describe pre-approval context.

Read-only official19 October refresh succeeded: latest stable Better Auth1.7.11, support policy latest-only; installed/root lock1.7.9 unchanged. Three selected advisory applicability checks and official Next/PG fit recorded; no exhaustive dependency audit, maintained-pin qualification or target certification.49/49 source-snapshot hashes matched at startup. Actual main/HEAD2fb68df plus32 inherited dirty paths preserved; documentation only, no runtime/SQL/package/lock/CI change or rerun of historical application tests/build. No commit/push/deploy/provider/DB action.

Still pending: actual credential/patch/incident custodian and operator recovery authority; monthly cap/currency/region/funded target; production manual-code UX and R04 targeted forced-logout disposition; real callback, sender/verification/recovery and authenticator/restore/load proof. Delegation of safe recommendations did not supply names/budget or accept residual risk. [Active handoff](handoff-2026-10-19-DEC-001-approval.md) supersedes audit's next-owner-review guidance. **Exact next implementation task when requested: BL-003 wire existing auth/recovery/admission/TOTP/browser-contract suites and auth/admission HTTP smokes into CI, preserving security controls, isolated PG and current pin; capture local and actual CI outcomes separately.** Then BL-001 controlled maintained-version qualification; BL-004 invitation/verification and external proof, BL-014 recovery, BL-016 acceptance and BL-017 production/restore follow their dependencies. No duplicate backlog or criterion waiver.

## DEC-001 closure/evidence audit — 19 October 2026

Audit completed against actual main / `2fb68df` plus29 inherited dirty TOTP/auth006 paths; preserved runtime/migration/test work. [Audit matrix C01–C23 and risks R01–R13](../auth/DEC-001-CLOSURE-AUDIT-2026-10-19.md), [49-file source snapshot](../auth/DEC-001-CLOSURE-SNAPSHOT-2026-10-19.json), [active handoff](handoff-2026-10-19-DEC-001-audit.md). Disposition **REMAINS OPEN — SPECIFIC EVIDENCE REQUIRED** under current register; conditional Better Auth+PG direction retained, no owner/provider/risk/budget approval. DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 In progress; BL-014/015/016/017 Todo. Architecture approval, MVP completion and release are separated; revising the closure boundary requires an explicit owner decision/new ADR, not this audit alone.

Prior local50/50 auth/recovery/admission/TOTP and other Passed evidence was source-correlated, not rerun. Official current-source refresh did not finish; no latest advisory/price entitlement claim. Newly explicit acceptance gaps: CI omits auth suites; real owner registration/invitation+verification delivery and current TOTP browser cancel/retry journey absent; patch/operator-recovery ownership unassigned; hosted secret/network/hash/rotation/restore/load and real callback/delivery evidence remain. Existing backlog ownership now explicit; no new BL ID, feature implementation, dependency waiver or item Done. Documentation-only audit, no commit/push/deploy/install/DB/provider action. Exact next task: owner reviews audit/decision boundary/provider/operations and recorded residual-risk choices, then authorizes a bounded missing-evidence task.

## DEC-001 pending TOTP lifecycle — 19 October 2026

Actual startup clean main / `2fb68df`. [ADR-014](../decisions/ADR-014-totp-challenge-lifecycle.md) and [evidence](../auth/DEC-001-TOTP-EVIDENCE-2026-10-19.md): reproduced copied pending-proof completion200 after logout200, requiring a correct TOTP code; no pending-only business authority or factor bypass. Additive auth006 lifecycle receipt binds user/version/expiry/resulting session; signed cancellation plus session revocation commits atomically under existing credential gate before success. Completion-first/logout-first, reset/version, failure/retry and restart safety verified; raw native error logging corrected. Existing enrollment/operator/admission/onboarding/recovery preserved; no provider/dependency rewrite or old SQL change.

Passed50 combined real-PG checks (14 lifecycle/10 auth/15 recovery/11 admission),27 foundation/onboarding,6 unit,4 browser models, types/build and actual two-Next/auth HTTP smokes, including dropped logout acknowledgement and copied-cookie denial. No new interactive-browser/real-authenticator/host/provider/restore/load claim. DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 In progress. New [active handoff](handoff-2026-10-19-DEC-001-totp.md) supersedes prior pending-proof task. Current increment uncommitted; no push/deploy/external service/email or existing DB reset;006 applied only to isolated test clusters. Next: focused DEC-001 Closure Audit, not automatic authentication feature expansion.

## DEC-001 shared authentication admission — 19 October 2026

Commit follow-up: the user subsequently authorized a local commit of this increment. No-commit/uncommitted statements in this section and its evidence describe the pre-commit verification snapshot; inspect actual Git HEAD/status for the resulting commit. Push, deployment and external services remain unauthorized.

Actual startup clean main / 7e6ba85. [ADR-013](../decisions/ADR-013-shared-auth-admission.md) and [evidence](../auth/DEC-001-ADMISSION-EVIDENCE-2026-10-19.md): reviewed additive auth005, shared PG global/account/canonical-TOTP admission and native store, bounded cleanup/capacity, safe Retry-After/generic recovery and non-throttled logout policy guard. No trusted IP headers; shared local-network fallback is deliberate and not production fairness/load proof. Existing manual code/outbox/reset/version/identity/onboarding/TOTP and old migrations retained. Two demonstrated prototype/drift gaps corrected: equivalent cookie scope rotation and wrong-key logout false success.

Passed11 PG admission,10 auth,15 recovery,27 foundation/onboarding,6 unit,4 browser models, targeted operator/TOTP checks, final types/build, two built Next processes with simultaneous attempts/response loss/restarts and existing auth/default HTTP-worker smokes. Actual new browser throttle/device/provider/edge/rotation/restore/load acceptance Not run. DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 In progress. New active [handoff](handoff-2026-10-19-DEC-001-admission.md) supersedes previous next-admission task. No commit/push/deploy/external mail/provider or existing DB reset;005 applied only to isolated test clusters. Next independent local task: copied pending TOTP challenge revocation on logout; production network/provider/operator/budget gates remain.

## DEC-001 recovery code handoff — 19 October 2026

Commit follow-up: the user subsequently authorized a local commit of this increment. The no-commit/uncommitted statements below and in its evidence describe the pre-commit verification snapshot; inspect actual Git HEAD/status for the resulting commit. Push, deployment and external delivery remain unauthorized.

Actual startup clean main / 0fc60a1. [ADR-012](../decisions/ADR-012-recovery-code-handoff.md) replaces generated bearer navigation URLs with a clean link and separate43-character code; no migration/provider/hash/session/MFA rewrite. Existing encrypted queued payloads remain compatible; legacy URL proof is rejected by UI and old history cannot be erased. [Evidence](../auth/DEC-001-HANDOFF-EVIDENCE-2026-10-19.md):15 PG recovery,10 auth,4 browser models, types/build and both HTTP smokes Passed. Browser B01–12 runner + B13–16/H01/H02 direct checks Passed; separate-tab recovery/refresh and a bounded4-entry history/code probe Passed. Not one uninterrupted automated18-case run or physical-device/provider proof.

DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 In progress. Local recommendation is not production approval. Latest [active handoff](handoff-2026-10-19-DEC-001-code.md) supersedes previous next-handoff task; old evidence remains dated. No commit/push/deploy/external provider/email or existing database reset. Next independent local task: shared recovery/login/TOTP abuse admission; production manual-code UX/risk and sender/host/budget/operator ownership, real callback/delivery/HTTPS/rotation/restore/load remain gates.

## DEC-001 browser recovery update — 19 October 2026

Actual startup clean d4edac1; branch main confirmed at commit. [ADR-011](../decisions/ADR-011-browser-recovery-boundary.md) and [browser evidence](../auth/DEC-001-BROWSER-EVIDENCE-2026-10-19.md):16 real-browser cases Passed; hash-only/early fragment handling, strict acknowledgement, ID/EN/focus/retry UI and retained-field isolation corrected. Existing backend/migrations unchanged;4 model/protocol,10 auth and14 PG recovery checks plus types/build Passed. **Global browser-history confidentiality failed:** original bearer-fragment navigation URLs remain in global history despite visible/current-entry cleanup. Copy states this limit; no full history/sync secrecy or production-readiness claim.

DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 In progress. Latest [active handoff](handoff-2026-10-19-DEC-001-browser.md) supersedes the prior next-browser task. Next: review a handoff avoiding bearer navigation URLs or an explicit evidenced risk disposition; no silent protocol/provider rewrite. External sender/provider/HTTPS/operator/abuse/rotation/restore/budget gates remain. User subsequently authorized a local commit; actual Git owns commit state. No push/deployment/external mail.

## DEC-001 password recovery update — 19 October 2026

Commit follow-up: the user subsequently authorized committing this local hardening/recovery increment. The no-commit/dirty-worktree statements below describe its pre-commit verification snapshot; actual Git HEAD/status owns current commit state. Push, deployment and external delivery remain unauthorized.

Resumed actual master / `829a46b` with the prior uncommitted hardening work; preserved it. [ADR-010](../decisions/ADR-010-password-recovery-outbox.md) adds reviewed additive auth004, optional separate recovery key, durable encrypted notification outbox, generic known/unknown enqueue, single-use expiring reset and atomic password/security-version/session revocation. Local password/TOTP/reset proof is fenced across processes; pending pre-reset challenges cannot create a post-reset session. Native library still owns hashing; factors/roles/studio/trial/acknowledged business data retained. No provider rewrite or dependency upgrade.

[Current recovery evidence](../auth/DEC-001-RECOVERY-EVIDENCE-2026-10-19.md):14/14 actual-PG recovery checks, including populated003 upgrade, non-owner role, concurrency barriers, outage/child-worker/DB restart and sanitized bounded retries; existing10 auth +27 foundation/onboarding +5 unit checks, types/build and actual Next HTTP recovery/reset/restart passed. Explicit synthetic drain<=10 messages discards locally; no real mail or scheduled sender. `/recover` form exists, interactive browser journey still Not run. Default auth remains unavailable; recovery requires loopback mode and stable AUTH_RECOVERY_KEY. Local credential gate deliberately returns503 on contention; not SaaS throughput proof.

**DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 In progress. Recommendation is not production approval.** No commit/push/deploy, external service/email, paid provisioning or existing database reset. Latest active DEC-001 [recovery handoff](handoff-2026-10-19-DEC-001-recovery.md) supersedes only the prior DEC-001 next-recovery task; historical evidence below stays dated. Next independent local work: interactive recovery browser validation and shared IP/global/login/MFA abuse controls. Approved sender/inbox/host/budget, named operator recovery owner, real callback/HTTPS/rotation/restore/load remain closure dependencies.

## DEC-001 hardening update — 19 October 2026

Actual starting local master / `829a46b`, clean; DEC-002/003 documentation commits preserved. User authorized auth hardening/local integration only. [ADR-009](../decisions/ADR-009-auth-local-hardening.md) supplements ADR-006: reviewed separate auth migrations, account-pair uniqueness with fail-stop duplicate handling, durable session-security guard and opt-in loopback Next credential/TOTP integration. **DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 remain In progress. No production auth decision approved.**

[Current evidence](../auth/DEC-001-EVIDENCE-2026-10-19.md): 10 real PG hardening tests; app/worker regression/typecheck/build, HTTP smokes and a real in-app browser credential → setup → app → logout → protected bookmark journey. Synthetic accounts and captured verification mail only. Native cleanup failure cannot undo committed app revocation; revocation/DB uncertainty returns 503 and retry, same-transaction onboarding rechecks serialize with logout. Migration 002 stops on populated duplicates without altering rows; no auto-merge/reset/adoption. Root pins Better Auth 1.7.9/Kysely 0.29.6; existing app SQL 001/002 and framework versions unchanged. Default auth stays unavailable; only explicit better-auth-local with loopback origin/DB, stable namespace and generated key activates the slice. No fixture-login endpoint or production mode.

Local cookie/TOTP/permission guards now exist; signed external OAuth/JWKS, recovery delivery/reset/version/login races, operator bootstrap/lost-factor/pending-challenge lifecycle, shared throttles, hash/rotation/backup/host/role/HTTPS evidence remain incomplete. No external provider connection, commit/push/deployment or existing database reset. New synthetic clusters retained ignored; review tab/server stopped. Use [current DEC-001 handoff](handoff-2026-10-19-DEC-001.md); it supersedes only DEC-001 resume guidance below. Other decision handoffs stay active for their scopes.

Exact next local task: durable recovery delivery/outbox and reset/session-security-version synchronization with deterministic login/reset/retry races, keeping production/OAuth/linking closed. Approved external test configuration, budget/target and named operator recovery owner remain user-owned gates. Final commands/results are in the handoff; do not rerun unchanged historical spikes or mark whole backlog items Done.

## DEC-003 investigation update — 18 October 2026

Verified actual startup: clean local `master` / HEAD `eb359d0889848a907fe18e9c89f782165cb5292f`; actual app/build/dependencies inspected and preserved. [ADR-008](../decisions/ADR-008-hosting-postgres-private-storage.md) supplements ADR-005 for DEC-003 only: conditional Render Singapore web/worker/PG18 + private S3 Singapore; R2 location-conditional storage and Railway hosting fallbacks. **DEC-003 OPEN/PARTIALLY VALIDATED; BL-002/003 In progress; BL-013/017 Todo; no approved production provider.** Owner confirms monthly budget and location requirements not established. DEC-001/002 unchanged.

[Current evidence/closure ledger](../hosting/DEC-003-EVIDENCE-2026-10-18.md) adds five real loopback HTTP checks (50 MiB exact bytes, upstream overflow/deadline, pre-header/downstream cancellation, scratch cleanup) and two native sharp 0.35.5/libvips 8.18.7 cases (valid 24 MP PNG resize; 48 MP rejected at experimental 40 MP). These are Windows/local results, no Next/provider/private-object/restore/load proof or new product image limit. Initial sandbox loopback EACCES failed; permitted loopback rerun Passed. Existing local PG lease/worker evidence was reused without rerunning unchanged suites.

[Candidate environment/release contract](../hosting/CONFIGURATION_CONTRACT.md) separates actual validated keys from proposals, runtime/DDL/backup identities and source SQL packaging. Compatibility findings: root start binds loopback; Linux/native/TLS untested; provider HTTP logs capture paths and require token suppression proof; managed short backup windows need independent 30-day retention and newer revocation/deletion replay before recovery access. pg_dump/pg_restore absent from PATH and bundled server, no restore attempted. Public USD arithmetic sourced, regional checkout/complete cost unverified.

No app/runtime/schema/dependency change, install, build, full PG test rerun, provider connection, paid provisioning, deployment, commit or push. Final docs/syntax/diff checks and exact resume step: [DEC-003 handoff](handoff-2026-10-18-DEC-003.md). This supersedes only DEC-003 resume guidance in the earlier BL-002 handoff; its historical evidence and other active scopes remain valid.

Next DEC-003 chat: inspect Git/this ledger, resolve owner budget/location and a bounded synthetic sandbox quote/authorization, then prepare the allowlisted Linux artifact and test actual proxy/logging/IAM/worker/restore matrix. No direct provider action is authorized by this handoff. Independent safe work: reviewed packaging/recovery-tooling preparation when requested; it cannot close a provider gate.

## DEC-002 investigation update — 18 October 2026

Verified actual startup: clean local `master` / HEAD `10d4d1d48ad18c3b3f31ddb987e8dc13a100d542`; existing app/dependencies preserved. [ADR-007](../decisions/ADR-007-drive-source-credentials.md) supplements ADR-005 for DEC-002 only: preferred conditional studio OAuth `drive.readonly`, first test narrower `drive.file` adequacy; public API key is a conditional public-only fallback. **DEC-002 OPEN/PARTIALLY VALIDATED; BL-002 In progress; BL-007 Todo; no approved production Drive decision.** DEC-003 unchanged.

[Current evidence/closure ledger](../drive/DEC-002-EVIDENCE-2026-10-18.md): refreshed official access/scope/key/list/Shared Drive/quota/token/cache documentation; user confirmed no dedicated synthetic Drive assets/configuration in this chat. No live API/credential connection. The historical 29 offline checks were not repeated for document-only changes. New finding: metadata-visible limited-access folders may list empty while `canListChildren=false`; existing descriptors omit that check. Seven-day cache retention is not provider permission. Every direct-provider closure row remains blocked.

Candidate credential lifecycle, paired pending API/Database fields and Security/Architecture/Test Plan notes documented; no route, migration, dependency or runtime adapter changed. Drive remains unconfigured. No install/build/application tests, commit/push/deployment/paid provisioning. Documentation/diff verification and exact resume step: [DEC-002 handoff](handoff-2026-10-18-DEC-002.md). It supersedes the DEC-002 resume instructions in the earlier BL-002 handoff; that handoff retains DEC-003 context. Existing DEC-001 and BL-004 handoffs remain active for their separate scopes.

Next DEC-002 chat: verify Git/state, then establish explicit authorization and dedicated fixture/config references; execute the bounded public metadata/list/media/private-negative pass before the remaining scope/key/visibility/revocation/quota/cache matrix. No credentials in chat and no provider connection inferred from this handoff. Until available, independent safe work is contract review and synthetic capability/refresh/fencing implementation if separately requested; it cannot close the provider gate.

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

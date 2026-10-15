# Project state

Snapshot: 15 October 2026, BL-005 session. Starting local master / HEAD `9cb7fbb` (BL-002 commit), initially clean. The user subsequently authorized a local BL-005 commit; this snapshot accompanies it (resolve its SHA with git log). No push, publish, deployment or provider connection authorized/performed. Verify actual files/Git each session; the local workspace is the implementation source of truth.

| Area | State | Evidence / implication |
|---|---|---|
| Product and agent documentation | Present, updated for BL-001/002/005 | PRD/rules/API/Database scope unchanged by BL-005; Design/User Flows link original local wireframes and reviewed state/component contracts |
| Research | Present, private | Audit assets not used in spike/public fixtures |
| Git | Initialized, master / `9cb7fbb` at BL-005 start | Existing commits preserved; snapshot included in user-authorized BL-005 local commit; no unrelated starting changes or push |
| Application web/worker | Not scaffolded | No root application manifest/framework; isolated spike is not BL-003 |
| Core UX design | BL-005 Done for design/prototype | [Local prototype](../../prototypes/bl005-ux/README.md), [specification](../design/BL-005-UX.md), [evidence](../design/BL-005-EVIDENCE.md): original SVG fixtures, tokens/components, ID/EN, reviewed creation/detail/gallery/viewer/review/error/access; zero dependencies |
| Auth feasibility | BL-001 In progress; DEC-001 open | [ADR-004](../decisions/ADR-004-auth-session-feasibility.md): conditional Better Auth 1.7.9 + PostgreSQL recommendation, alternatives/costs, observed limitations |
| Auth contract and executable spike | Synthetic subset verified | [Contract](../auth/SESSION_CONTRACT.md), [evidence](../auth/BL-001-EVIDENCE.md), [spike](../../spikes/bl001-auth/README.md); 18/18 local handler/policy checks, not full T-001/T-015 |
| Runtime/package manager | Local spike only | Node 24.18.0, npm 11.16.0, PowerShell 7.6.5; exact isolated manifest/lockfile; production runtime/framework still unselected |
| Real auth/email/operator recovery | Not connected/verified | Needs approved target topology/test accounts and explicit provider authorization; no secrets read |
| Drive/hosting/storage | BL-002 In progress; DEC-002/003 open | [ADR-005](../decisions/ADR-005-drive-hosting-feasibility.md): conditional access/Render Singapore/private-storage assessment; no provider selected/provisioned |
| Drive/streaming contract and executable spike | 29/29 offline checks Passed | [Contract](../drive/ADAPTER_CONTRACT.md), [evidence](../drive/BL-002-EVIDENCE.md), [spike](../../spikes/bl002-drive/README.md); no dependencies, credentials or HTTP calls |
| Real Drive / hosting feasibility | Blocked on authorized dedicated test fixtures and infrastructure | User confirmed test folders unavailable; API key/OAuth/private/shared/key/revocation/assigned-quota and actual proxy/worker/storage evidence absent |
| Database/migrations | Logical only | No DB connection, migration or PostgreSQL race evidence; owner-session security candidate added |
| API/UI/jobs/CI | Contracts plus isolated UX prototype | No integrated app routes/UI, server authorization, jobs, onboarding/operator implementation or CI; memory simulator is not production code |
| Acceptance | Full application acceptance planned | BL-005 design checks Passed (10 local checks, browser widths/keyboard/recovery, ID/EN); T-006/T-016 full runtime not run. BL-001/002 full scenarios still not passed; other backlog items Todo |
| Deployment/billing | Absent | No publish/provider purchase; deferred billing unchanged |

## Verified commands

From repository root:

```powershell
npm --prefix spikes/bl001-auth test
npm --prefix spikes/bl001-auth audit --omit=dev --json
npm --prefix spikes/bl002-drive test
npm --prefix prototypes/bl005-ux run check
npm --prefix prototypes/bl005-ux test
npm --prefix prototypes/bl005-ux run preview
pwsh -NoProfile -File docs/tools/validate-docs.ps1
```

BL-001 previously executed: 18/18 Passed, zero skipped; registry audit zero reported advisories at that inspection, not rerun during BL-002. BL-002 executed: 29/29 Passed, zero skipped. Final docs/syntax/diff evidence is in the [BL-002 handoff](handoff-2026-10-15-BL-002.md). Test inputs/accounts/OAuth/email/storage are synthetic; no browser or real provider acceptance implied.

BL-005 executed: 10/10 local design checks; syntax; browser review at 360/768/1440 with 18 normal-size layout measurements and 18 text-200% measurements; synthetic keyboard/notes/conflict/response-loss/access review. Native browser zoom/assistive technology/real devices and full runtime T-006/T-016 remain untested. Preview uses loopback 4175, no external connection; it needs local socket permission in this sandbox and is stopped after QA. See [BL-005 evidence](../design/BL-005-EVIDENCE.md) and [handoff](handoff-2026-10-15-BL-005.md). Root application dev/build/migration/seed still absent; prototype commands must not be described as application commands.

Dependency installation actually used `npm install --prefix spikes/bl001-auth --ignore-scripts --no-fund --no-audit`. Fresh-checkout reproduction uses `npm --prefix spikes/bl001-auth ci --ignore-scripts --no-fund --no-audit` (documented, not executed this session). No root app dev/build/lint/typecheck/migration/seed command exists. Restricted sandbox Git may fail; approved local Git inspection succeeded without changing config. Writes/registry access required sandbox escalation.

The preceding install/escalation notes describe BL-001. BL-002 local read/write/Git and commands worked without escalation; dependency-free lock generated with `npm --prefix spikes/bl002-drive install --package-lock-only --ignore-scripts --no-audit --no-fund --offline`. Its tests need no installation or registry access.

## Active work and first resume action

BL-005 design/prototype completed. [Handoff](handoff-2026-10-15-BL-005.md) identifies files, executed review and subsequent local commit authorization. No provider gate blocks this design slice. First action in a later BL-009 integration chat: read that handoff and inspect actual manifests/Git, then check BL-007/008 readiness before adapting the gallery controls to real server/media contracts. Do not import the simulator as an auth/domain/persistence layer. Choose one backlog ID per new chat; this session did not implement adjacent items.

Current BL-002 resume: read [BL-002 handoff](handoff-2026-10-15-BL-002.md) and current Git, then establish an authorized synthetic Drive root and nonsecret test credential-config reference. First live case, only after express authorization: public-folder metadata/list/media and private-folder denial. No provider available now; do not connect/provision automatically. [Evidence](../drive/BL-002-EVIDENCE.md) contains the remaining full matrix. Keep DEC-002/003 open and BL-002 In progress until real evidence exists.

Separate BL-001 work remains active in [its handoff](handoff-2026-10-15-BL-001.md). First action in the next BL-001 chat: inspect that handoff and current Git, then establish whether an approved deployment topology and authorized isolated IdP/email/PostgreSQL environment are available. Do not contact providers or request secret values in chat without authorization. DEC-001 remains open; completed synthetic subsets must not be relabeled production-ready.

Remaining BL-001: durable shared revocation and identity/account races on PostgreSQL; actual callback/email/TOTP recovery smoke through the selected Next.js/hosting topology; framework/driver compatibility and credential resource/throttling review. Remaining BL-002: minimum Drive scopes/visibility and resource keys, real revocation/quotas, API/schema ownership/key integration decision, hosted streaming/worker/DB/private storage/backup evidence and realistic budget. BL-003/004/007/008/013/014/017 were not implemented. Other independent backlog work requires its own scoped chat.

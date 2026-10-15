# Project state

Snapshot: 15 October 2026, BL-002 session. Starting local master / HEAD `641a3ee` (BL-001 commit), initially clean. This snapshot accompanies the subsequently user-authorized BL-002 commit; resolve its SHA with git log. No push or deployment. Verify actual files/Git each session.

| Area | State | Evidence / implication |
|---|---|---|
| Product and agent documentation | Present, updated for BL-001/002 | PRD/rules scope unchanged; API/Database/Security carry candidate auth boundary; BL-002 internal key/credential gaps explicitly recorded |
| Research | Present, private | Audit assets not used in spike/public fixtures |
| Git | Initialized, master / `641a3ee` at inspection | Local workspace remains source of truth; BL-002 snapshot included in user-authorized local commit, no push |
| Application web/worker | Not scaffolded | No root application manifest/framework; isolated spike is not BL-003 |
| Auth feasibility | BL-001 In progress; DEC-001 open | [ADR-004](../decisions/ADR-004-auth-session-feasibility.md): conditional Better Auth 1.7.9 + PostgreSQL recommendation, alternatives/costs, observed limitations |
| Auth contract and executable spike | Synthetic subset verified | [Contract](../auth/SESSION_CONTRACT.md), [evidence](../auth/BL-001-EVIDENCE.md), [spike](../../spikes/bl001-auth/README.md); 18/18 local handler/policy checks, not full T-001/T-015 |
| Runtime/package manager | Local spike only | Node 24.18.0, npm 11.16.0, PowerShell 7.6.5; exact isolated manifest/lockfile; production runtime/framework still unselected |
| Real auth/email/operator recovery | Not connected/verified | Needs approved target topology/test accounts and explicit provider authorization; no secrets read |
| Drive/hosting/storage | BL-002 In progress; DEC-002/003 open | [ADR-005](../decisions/ADR-005-drive-hosting-feasibility.md): conditional access/Render Singapore/private-storage assessment; no provider selected/provisioned |
| Drive/streaming contract and executable spike | 29/29 offline checks Passed | [Contract](../drive/ADAPTER_CONTRACT.md), [evidence](../drive/BL-002-EVIDENCE.md), [spike](../../spikes/bl002-drive/README.md); no dependencies, credentials or HTTP calls |
| Real Drive / hosting feasibility | Blocked on authorized dedicated test fixtures and infrastructure | User confirmed test folders unavailable; API key/OAuth/private/shared/key/revocation/assigned-quota and actual proxy/worker/storage evidence absent |
| Database/migrations | Logical only | No DB connection, migration or PostgreSQL race evidence; owner-session security candidate added |
| API/UI/jobs/CI | Contracts only | No app routes/UI or onboarding/operator implementation |
| Acceptance | Planned | T-001/T-015 and T-005/T-013/T-017/T-022 full scenarios not passed; all items except BL-001/002 remain Todo |
| Deployment/billing | Absent | No publish/provider purchase; deferred billing unchanged |

## Verified commands

From repository root:

```powershell
npm --prefix spikes/bl001-auth test
npm --prefix spikes/bl001-auth audit --omit=dev --json
npm --prefix spikes/bl002-drive test
pwsh -NoProfile -File docs/tools/validate-docs.ps1
```

BL-001 previously executed: 18/18 Passed, zero skipped; registry audit zero reported advisories at that inspection, not rerun during BL-002. BL-002 executed: 29/29 Passed, zero skipped. Final docs/syntax/diff evidence is in the [BL-002 handoff](handoff-2026-10-15-BL-002.md). Test inputs/accounts/OAuth/email/storage are synthetic; no browser or real provider acceptance implied.

Dependency installation actually used `npm install --prefix spikes/bl001-auth --ignore-scripts --no-fund --no-audit`. Fresh-checkout reproduction uses `npm --prefix spikes/bl001-auth ci --ignore-scripts --no-fund --no-audit` (documented, not executed this session). No root app dev/build/lint/typecheck/migration/seed command exists. Restricted sandbox Git may fail; approved local Git inspection succeeded without changing config. Writes/registry access required sandbox escalation.

The preceding install/escalation notes describe BL-001. BL-002 local read/write/Git and commands worked without escalation; dependency-free lock generated with `npm --prefix spikes/bl002-drive install --package-lock-only --ignore-scripts --no-audit --no-fund --offline`. Its tests need no installation or registry access.

## Active work and first resume action

Current BL-002 resume: read [BL-002 handoff](handoff-2026-10-15-BL-002.md) and current Git, then establish an authorized synthetic Drive root and nonsecret test credential-config reference. First live case, only after express authorization: public-folder metadata/list/media and private-folder denial. No provider available now; do not connect/provision automatically. [Evidence](../drive/BL-002-EVIDENCE.md) contains the remaining full matrix. Keep DEC-002/003 open and BL-002 In progress until real evidence exists.

Separate BL-001 work remains active in [its handoff](handoff-2026-10-15-BL-001.md). First action in the next BL-001 chat: inspect that handoff and current Git, then establish whether an approved deployment topology and authorized isolated IdP/email/PostgreSQL environment are available. Do not contact providers or request secret values in chat without authorization. DEC-001 remains open; completed synthetic subsets must not be relabeled production-ready.

Remaining BL-001: durable shared revocation and identity/account races on PostgreSQL; actual callback/email/TOTP recovery smoke through the selected Next.js/hosting topology; framework/driver compatibility and credential resource/throttling review. Remaining BL-002: minimum Drive scopes/visibility and resource keys, real revocation/quotas, API/schema ownership/key integration decision, hosted streaming/worker/DB/private storage/backup evidence and realistic budget. BL-003/004/007/008/013/014/017 were not implemented. Other independent backlog work requires its own scoped chat.

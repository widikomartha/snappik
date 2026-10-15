# Project state

Snapshot: 15 October 2026. Starting local master / HEAD f669f52, initially clean. This snapshot accompanies the user-authorized BL-001 commit; resolve its SHA with git log. No push or deployment. Verify actual files/Git each session.

| Area | State | Evidence / implication |
|---|---|---|
| Product and agent documentation | Present, updated for BL-001 | PRD/rules scope unchanged; API/Database/Security now carry candidate auth boundary |
| Research | Present, private | Audit assets not used in spike/public fixtures |
| Git | Initialized, master / f669f52 at inspection | BL-001 snapshot included in user-authorized commit; local workspace remains source of truth |
| Application web/worker | Not scaffolded | No root application manifest/framework; isolated spike is not BL-003 |
| Auth feasibility | BL-001 In progress; DEC-001 open | [ADR-004](../decisions/ADR-004-auth-session-feasibility.md): conditional Better Auth 1.7.9 + PostgreSQL recommendation, alternatives/costs, observed limitations |
| Auth contract and executable spike | Synthetic subset verified | [Contract](../auth/SESSION_CONTRACT.md), [evidence](../auth/BL-001-EVIDENCE.md), [spike](../../spikes/bl001-auth/README.md); 18/18 local handler/policy checks, not full T-001/T-015 |
| Runtime/package manager | Local spike only | Node 24.18.0, npm 11.16.0, PowerShell 7.6.5; exact isolated manifest/lockfile; production runtime/framework still unselected |
| Real auth/email/operator recovery | Not connected/verified | Needs approved target topology/test accounts and explicit provider authorization; no secrets read |
| Drive/hosting/storage | Open DEC-002/003 | Not implemented by this BL-001 session |
| Database/migrations | Logical only | No DB connection, migration or PostgreSQL race evidence; owner-session security candidate added |
| API/UI/jobs/CI | Contracts only | No app routes/UI or onboarding/operator implementation |
| Acceptance | Planned | T-001/T-015 full scenarios not passed; other backlog items remain Todo |
| Deployment/billing | Absent | No publish/provider purchase; deferred billing unchanged |

## Verified commands

From repository root:

```powershell
npm --prefix spikes/bl001-auth test
npm --prefix spikes/bl001-auth audit --omit=dev --json
pwsh -NoProfile -File docs/tools/validate-docs.ps1
```

Executed spike test: 18/18 Passed, zero skipped. Registry audit: zero reported advisories at inspection, not a security certification. Final docs-check/diff evidence is in the active handoff. Test inputs/accounts/OAuth/email/storage are synthetic; no browser or real provider acceptance implied.

Dependency installation actually used `npm install --prefix spikes/bl001-auth --ignore-scripts --no-fund --no-audit`. Fresh-checkout reproduction uses `npm --prefix spikes/bl001-auth ci --ignore-scripts --no-fund --no-audit` (documented, not executed this session). No root app dev/build/lint/typecheck/migration/seed command exists. Restricted sandbox Git may fail; approved local Git inspection succeeded without changing config. Writes/registry access required sandbox escalation.

## Active work and first resume action

Read [active BL-001 handoff](handoff-2026-10-15-BL-001.md). First action in next BL-001 chat: inspect that handoff and current Git, then establish whether an approved deployment topology and authorized isolated IdP/email/PostgreSQL environment are available. Do not contact providers or request secret values in chat without authorization. Until available, the real-provider portion is blocked and DEC-001 remains open; the completed synthetic subset must not be relabeled production-ready.

Remaining: durable shared revocation and identity/account races on PostgreSQL; actual callback/email/TOTP recovery smoke through the selected Next.js/hosting topology; framework/driver version compatibility and credential resource/throttling review. BL-002/003/004/014 were not executed. Other independent backlog work requires its own scoped chat.

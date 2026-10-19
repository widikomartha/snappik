# DEC-001 conditional architecture approval handoff — 19 October 2026

Commit follow-up: the user subsequently authorized committing the related TOTP lifecycle, audit and approval worktree locally. Earlier no-commit/uncommitted descriptions below refer to the verification snapshot; inspect actual Git history for the resulting commit. Push/deployment/external services remain unauthorized.

Task: architecture approval preparation/recording only. Status: **completed decision package; architecture direction approved with explicit conditions; DEC-001 OPEN/PARTIALLY VALIDATED**. Main / HEAD `2fb68df`,32 dirty paths inherited. Preserve prior TOTP/auth006 implementation and audit work; no code/package/SQL/CI edits in this task. No commit/push/deploy/install/external connection/email/database action. Previous commit requests are not standing authorization.

## User decisions and authorization boundary

- Owner explicitly answered “Setuju bersyarat: Better Auth + PostgreSQL; seluruh gate tetap berlaku” to the question retaining DEC-001 OPEN and excluding deployment/paid services.
- Owner explicitly selected “Pilot invitation-only; registrasi publik tetap sebagai lingkup lanjutan”. Applies to studio owners, not staff/team/gallery-client membership.
- Other choices: “menurut rekomendasi mu yang memudahkan ku”. Retain safe candidate recovery UX and all provider gates; do not infer named custodians, budget or acceptance of residual forced logout.

[ADR-015](../decisions/ADR-015-auth-architecture-conditional-approval.md) records that actual decision, without rewriting historical ADRs or changing closure boundaries. [Approval package](../auth/DEC-001-ARCHITECTURE-APPROVAL-2026-10-19.md) includes alternatives/baseline, verified vs assumed capabilities, D01–D07 owner choices, all 23 criterion references, current-source ledger, risks and execution map. It supersedes only audit's next-owner-review guidance; [audit](../auth/DEC-001-CLOSURE-AUDIT-2026-10-19.md)/[snapshot](../auth/DEC-001-CLOSURE-SNAPSHOT-2026-10-19.json) remain evidence baseline. BL-001/003/004 In progress; BL-014/015/016/017 Todo. No full T-001/002/003/015/016/020/022 acceptance claimed.

## Freshness and implementation reality

Official public-page browsing succeeded19 October: release/tag latest 1.7.11 (released 19 October 00:39); security policy supports latest only. Current root Better Auth/core/adapters remain 1.7.9; utils separately0.5.0. Source build/runtime remains Next 16.4.1/Node 24.18 and loopback-only. Three relevant30 September advisories reviewed against current lock/configuration: GHSA-965c-763c-88jm, GHSA-44jh-23m7-hpcf, GHSA-r4xp-prcw-77qf; stated affected ranges exclude installed 1.7.9, relevant unused plugins/atomic admission noted. No exhaustive lock audit or vulnerability-free claim. Next/PG official docs support direction, not exact latest-version/target certification. URLs/access/publication dates in approval package. Historical managed-plan pricing was not refreshed or quoted; no funded target.

Initial source comparison49/49 LF-normalized hashes matched. Historical50/50 PG regression,27 onboarding,6 unit,4 models and HTTP/build Passed reports remain dated prior evidence, not reruns. Actual CI currently omits security suites; no hosted CI outcome known. Default auth unavailable; no real invitation acceptance/verification/sender/callback/operator-recovery/production mode implemented by this package.

## Exact next task when implementation is requested

**BL-003 authentication security CI baseline:** inspect actual workflow/scripts, add existing `npm run test:auth`, `npm run test:recovery`, `npm run test:admission`, `npm run test:totp`, `npm run test:recovery:browser-contract`, `npm run test:auth:smoke`, `npm run test:admission:smoke` to CI alongside existing check/default smoke/docs. Use isolated synthetic PG/ports, bounded timeouts, preserve native limits, and reuse the built artifact where supported. Do not call browser-contract models an actual-browser run. Keep current pin for baseline, no provider connection/secret injection. Record local commands/outcomes and actual CI execution separately; editing workflow is not proof hosted CI passed. Do not implement this automatically from the handoff.

Then bounded BL-001 full-lock/advisory/license and controlled maintained-release qualification (1.7.11 at this check; refresh latest at execution), schema/hook/limiter review and existing regression evidence. No automatic upgrade, no floating generator against unknown DB. BL-004 pilot owner invitation/acceptance/verification and sender/protected flow; BL-001 real signed callback proof still required. Contract/synthetic work independent of paid services; actual provider/sender/HTTPS access requires separate authorization.

Parallel preparations: owner names credential patch/secret/incident custodian and operator bootstrap/lost-factor authority; owner sets cap/currency/region and reviews DEC-003 target quote. Render Singapore is only conditional planning candidate. BL-014 controlled operator/authenticator recovery; BL-015/DEC-006 logs/privacy/deletion; BL-016 full device/security/recovery UX and explicit R04 disposition; BL-017 actual target/rotation/restore/uncertain-commit/load. Preserve original backlog dependencies, including DEC-001 closure before release. No duplicate work items.

## Risks and pending choices

R04 copied signed challenge can cancel its resulting live session, including after expiry; availability only, no authorization/factor bypass. **No release acceptance**. Reviewer should propose bounded disposition or evidenced mitigation, not begin an unrequested auth rewrite. Actual names/budget/location remain pending. Clean 43-character code is retained candidate, not final real-inbox/device usability acceptance. Old bearer URLs in prior history cannot be erased. PG/fence outage fails closed; uncertain commit/key-policy rotation/restore and network fairness remain gates.

## Documentation and checks

Changed current PRD owner-acquisition direction, architecture/security/deployment/session summaries, decision register, backlog/traceability, project state and audit follow-up/supersession notes; added approval package, ADR-015 and this handoff. Existing historical ADRs untouched. No wire/storage contract or application behavior changed.

Executed startup: Git status/history/source/lock/CI/context review, source snapshot 49/49 match and bounded official pages; owner replies recorded. Application/PG/browser tests, typecheck/build and hosted CI **Not run** (documentation only); real external/hosted validation still depends on approved environments.

Final read-only checks on 19 October 2026, Windows local worktree:

| Exact command / action | Actual result |
|---|---|
| `pwsh -NoProfile -File docs/tools/validate-docs.ps1` | **Passed**:78 Markdown files,715 local links,2 JSON examples;20 requirements/33 rules/22 backlog/22 tests/6 decisions/9 future definitions. No runtime or semantic approval implied |
| `git diff --check` | **Passed**; Git emits an LF-to-CRLF conversion notice for PRD, not a whitespace failure |
| `git diff --stat`; `git diff --numstat`; scoped `git diff -- docs/...` review and direct new-file reads | **Passed** scope review: current task changes documentation only, inherited runtime/migration/tests retained; new ADR only after explicit owner answers |
| Read-only Node comparison below | **Passed49/49** unchanged source/config/migration/test hashes. Static audit row inventory still exactly sequential C01–C23 and R01–R13 |
| Official page opens listed in approval package | **Passed** bounded freshness check, source/access dates recorded; no provider accounts or prices validated |

Reproduce source preservation from repository root (LF normalization is specified by the existing snapshot):

```powershell
node -e 'const fs=require("fs"),c=require("crypto"),s=JSON.parse(fs.readFileSync("docs/auth/DEC-001-CLOSURE-SNAPSHOT-2026-10-19.json","utf8"));let bad=[];for(const f of s.files){if(c.createHash("sha256").update(fs.readFileSync(f.path,"utf8").replace(/\r\n/g,"\n")).digest("hex")!==f.sha256_lf)bad.push(f.path)}console.log(JSON.stringify({source_files:s.files.length,mismatches:bad}));if(bad.length)process.exitCode=1;'
```

No Failed runtime result is invented: runtime checks were Not run; real-provider and hosted evidence remains Blocked on the named resources/authorization. No final release readiness, latest-version runtime support or full-lock security audit is claimed.

# Verification and completion

Use [Test plan](../TEST_PLAN.md) for acceptance scenarios and [Traceability](../TRACEABILITY.md) to select applicable checks. This guide defines how agents report evidence, not a new mandatory suite for every text edit.

## Match checks to the change

| Change | Relevant verification |
|---|---|
| Documentation | Links, IDs, examples, consistency with owning contracts; no runtime-test claim |
| Domain policy | Meaningful boundary/denial tests with deterministic clock and scoped fixtures |
| Persistence / transactions | Actual PostgreSQL constraints, rollback, revision/idempotency and affected race tests |
| HTTP handler / auth | Validated request/response shapes, principal scope, CSRF/origin handling, access errors and sensitive-field exclusion |
| Gallery / form / interaction | Real flow and error recovery, saved/pending/conflict states, relevant keyboard/mobile/localization checks |
| Provider adapter / jobs | Synthetic contract failures plus authorized dedicated provider smoke test where available; retry/lease/resource bounds |
| Deployment / retention | Staging smoke, migration compatibility, restore/deletion/revocation reconciliation and recorded rollback |

Inspect the actual manifest and CI before selecting commands. After relevant checks pass, expand coverage only for a concrete risk, failure or required release gate. Do not write tests that merely mirror a trivial implementation or claim a mock establishes production readiness.

## Documentation checker

Run from the repository root:

```powershell
pwsh -NoProfile -File docs/tools/validate-docs.ps1
```

The checker validates local Markdown file links, balanced top-level code fences, JSON examples, defined requirement/rule/backlog/test/decision IDs and PRD-to-traceability coverage. It also checks root AGENTS.md links. It is read-only and exits nonzero on failures.

It does not verify remote links, heading anchors, rendered diagrams, semantic correctness, secret absence, executable application behavior or legal/security compliance. Review those separately when relevant. Research is included in local link checks but excluded from Snappik requirement-ID checks.

## Evidence record

For every material check, capture the exact command or reproducible manual steps, date, build/commit/worktree identity, environment and synthetic/provider mode, exit/result, and relevant artifact path. Sanitize all captured output. A test plan, test file or screenshot of a button is not proof the behavior works.

Use these result labels consistently:

| Result | Meaning |
|---|---|
| Passed | Executed check observed its required outcome |
| Failed | Executed check found a mismatch; explain impact |
| Blocked | Specific prerequisite prevented execution; name it |
| Not run | Not executed; give reason when it affects confidence |
| Not applicable | Explain why this task does not exercise that boundary |

Distinguish a product failure from an unavailable local database or credentials. Preserve failure evidence, fix issues in scope, then rerun affected checks. Never weaken an assertion merely to make an unrelated failure disappear.

## Definition of done

For an implementation work item, required behavior and recovery paths exist, applicable acceptance tests pass, diff review finds no unintended changes, and contract/status documents match the result. Any provider/device/release limitations remain explicit. Do not mark an entire backlog item Done when only one subtask or mock is complete.

For documentation work, requested documents exist, navigation/IDs/examples pass available checks, content is consistent, and current state accurately says what remains unimplemented. No application test execution is implied.

Before finishing a code change, examine authorization, transaction boundaries, response-loss recovery and data disclosure where touched. Inspect staged/unstaged content before any authorized commit. Avoid committing temporary captures, credentials, dependency caches or build output.

## Final response and handoff

State the delivered outcome first, link important files, summarize checks and state material limitations. Do not reproduce a long command log. If unfinished, use [Handoff](HANDOFF.md) to record exact next steps and uncommitted changes. Publishing, deployment and commit status must be stated only when actually performed.

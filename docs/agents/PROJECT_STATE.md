# Project state

Snapshot: 13 October 2026. Update this file when implementation state materially changes. Verify against the worktree at each session start.

## Repository reality

| Area | State | Evidence / implication |
|---|---|---|
| Product documentation | Present | Main docs cover scope, business rules, architecture, data, API, UX, security, tests, backlog and operations |
| Agent guidance | Present | This folder and root AGENTS.md provide execution context |
| Competitor research | Present, private | Initial audit, live tests and local evidence; platform-admin logic is inferred |
| Git | Initialized | Initial documentation commit `61aa720`; this is a historical reference, not a claim about current HEAD |
| Application code / framework scaffold | Not created | No source tree, package manifest or dependency lockfile at this snapshot |
| Runtime / package manager | Not selected | Do not assume an installed runtime or package manager version |
| Auth / Drive / hosting | Open | DEC-001, DEC-002 and DEC-003 require implementation feasibility work |
| Database / migrations | Logical design only | DATABASE.md is not executable DDL |
| API / jobs | Contracts only | No deployed endpoints or worker |
| Mockups / application UI | Specification only | Design tokens and page states are proposed; visual deliverables belong to BL-005 |
| Tests / CI | Planned | T-001 through T-022 are acceptance definitions, not executed results |
| Deployment / commercial billing | Absent | Provider-neutral runbook; paid billing is deferred |

At this snapshot the current task is documentation expansion only. All application backlog items remain Todo. Writing these guides does not complete BL-001 through BL-017.

## Available operations

From the repository root, read-only Git inspection works with `git status --short`, `git diff --stat` and `git log -1 --oneline`. Search using `rg` when available.

Documentation checks are available through [validate-docs.ps1](../tools/validate-docs.ps1):

```powershell
pwsh -NoProfile -File docs/tools/validate-docs.ps1
```

This invocation was verified on the authoring environment. Legacy `powershell -File` was blocked by its local authorization policy; the installed `pwsh` invocation passed without changing policy. On other machines, use an available PowerShell runtime permitted by local policy. Do not change system execution policy to run this checker. If execution is blocked, report the limitation and perform equivalent read-only checks through the authorized shell.

No application install, dev, lint, typecheck, test, build, migration or seed command is available yet. After scaffolding, replace this statement with verified commands from the actual manifest and record runtime/package-manager versions. Do not tell users to run hypothetical scripts.

## Next useful work

When application work is requested, begin the feasibility/design stage described in [Implementation guide](IMPLEMENTATION_GUIDE.md): BL-001 for auth, BL-002 for Drive/hosting and BL-005 for UI flows. Independent design and domain-contract work can proceed while real provider access is unresolved.

The product name is Snappik. Fastpik is the audited reference. Contact numbers are optional, stable file IDs are mandatory, and onboarding must initialize all required records. See the PRD for other deliberate differences.

## Keeping state honest

On meaningful implementation progress, update the affected component rows, actual commands, decision status and backlog evidence together. Link a concrete handoff if work is incomplete. Remove obsolete blockers when resolved. Do not store session credentials, live bearer links, machine-specific secret paths or unverifiable completion percentages here.

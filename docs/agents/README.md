# AI agent entry point

Purpose: enable a new coding agent to work on Snappik without relying on chat history. These instructions organize the product contracts; they do not supersede the user's task or higher-priority instructions.

## First five minutes

1. Read [AGENTS.md](../../AGENTS.md) and [Project state](PROJECT_STATE.md).
2. Inspect the actual repository, branch and worktree changes. Project state is a dated snapshot, not proof that files have remained unchanged.
3. Restate the requested outcome and identify the relevant `BL-*` item or document-only scope. Do not silently implement the entire backlog from a small request.
4. Read [PRD](../PRD.md), [Business rules](../BUSINESS_RULES.md), the applicable [Traceability](../TRACEABILITY.md) rows and the task-specific documents below.
5. Check [open decisions](../decisions/README.md), prepare concrete acceptance evidence and execute the smallest complete slice. Preserve the original objective across follow-up messages and handoffs.

## Agent handbook

| Document | Use it for |
|---|---|
| [Project state](PROJECT_STATE.md) | What exists, what is pending and what can run now |
| [Implementation guide](IMPLEMENTATION_GUIDE.md) | Work order, task boundaries and implementation deliverables |
| [Engineering](ENGINEERING.md) | Code boundaries, migrations, API/UI/jobs and local setup |
| [Domain scenarios](DOMAIN_SCENARIOS.md) | Synthetic examples of expected behavior and failure recovery |
| [Verification](VERIFICATION.md) | Evidence, task completion and docs validation |
| [Task template](TASK_TEMPLATE.md) | A precise implementation or investigation brief |
| [Handoff](HANDOFF.md) | Resume work without losing decisions or confusing plans with results |
| [Prompt examples](PROMPTS.md) | Ready-to-adapt task requests for another agent |

## Load context by task

Read only the relevant sections after the common startup; research is optional background unless the task specifically concerns the audit.

| Task | Additional context |
|---|---|
| Product scope / feature change | PRD, Business rules, User flows, Backlog, Decisions |
| Auth / onboarding / tenant isolation | Security permission matrix, Database identity tables, API owner conventions, T-001 through T-003 |
| Project / entitlement lifecycle | Business rules project/entitlement sections, Database transactions, API project routes, T-004, T-014, T-019 |
| Drive / worker / media | Architecture inventory/jobs, Database inventory/jobs, Security resource controls, T-005, T-013, T-017 |
| Gallery / selection / confirmation | Design, User flows, API client routes, Database selection tables, T-006 through T-012 |
| Operator tooling | Security, API operator routes, Business rules operator/entitlement sections, T-015 |
| UI / copy / localization | Design, User flows, API states, T-016; synthetic fixture scenarios |
| Deployment / recovery | Deployment, Security retention, decision gates, T-020, T-022 |
| Documentation / audit | Docs index, traceability, research index; retain observed/inferred/baseline/open distinctions |

The source files referenced by title are linked from the [main index](../README.md). Test definitions live in [Test plan](../TEST_PLAN.md).

## Interpret evidence correctly

**Observed** refers to the Fastpik audit only. **Inferred** describes likely competitor behavior without private access. **Baseline** is the target Snappik contract. **Open** is an unresolved decision. **Implemented** requires repository evidence; **verified** requires a recorded executed check. None of these labels can substitute for another.

If source code later contradicts a baseline contract, report the mismatch and resolve it within the task. Do not silently rewrite the baseline to make a defect appear intentional. If documents contradict each other, consult the owning document, inspect user decisions, then update every affected reference. Escalate only a consequential unresolved product choice.

## Proceeding with unknowns

Use an adapter or fixture when it enables independent work, and label that path as synthetic. Do not claim real Drive access, production authentication, migrations or deployment are ready until tested. Record provider decisions with current official references, constraints and evidence when selecting them. Do not guess current versions, prices or plan capabilities.

Access to a third-party account for a past audit does not authorize ongoing changes there. The existing private audit is sufficient background for normal Snappik work. Do not reuse supplied account credentials or real client photos in code, seeds, screenshots, prompts or logs.

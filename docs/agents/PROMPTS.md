# Example requests for an AI agent

These are reusable user task examples, not instructions to execute all work when this file is read. Adapt scope to the current repository. Every task starts by reading root AGENTS.md and this folder's entry point.

## Resume an implementation task

> Read AGENTS.md, docs/agents/README.md, the current project state and any active handoff. Inspect the actual worktree. Resume the named backlog item within its documented scope, preserving existing changes. Complete the next usable slice, run relevant available checks, update status and report remaining dependencies honestly.

## Investigate auth feasibility

> Work on BL-001. Use DEC-001 and the identity/security contracts to evaluate suitable auth/session options using current official documentation and a bounded local spike where possible. Record evidence for identity linking, callbacks, logout, recovery and operator MFA. State missing provider access precisely and continue independent work. Do not claim the decision is closed without its required evidence.

## Investigate Drive and hosting

> Work on BL-002. Define and exercise a synthetic Drive adapter contract, and use a dedicated test source for provider checks if authorized access is available. Evaluate pagination, nesting, resource keys, permission loss, limits and streaming/worker feasibility. Record DEC-002/003 recommendations, verified results and unsupported cases. Do not reuse the private audit account or claim synthetic results prove real Drive support.

## Design the core UI

> Work on BL-005 using docs/DESIGN.md and docs/USER_FLOWS.md. Create original, responsive owner creation/detail and client gallery/review/error designs with synthetic photos. Cover pending, saved, confirmed, conflict and expired states, keyboard behavior and Indonesian/English text. Keep future features outside the MVP. Report which interactions are prototypes and which are implemented.

## Implement a selection slice

> Work on the requested portion of BL-010 and inspect its prerequisites first. Implement revisioned shared selection and notes according to the existing API/schema/business rules. Include quota, duplicate-name identity, stale-revision and Unicode-note cases. Verify through real persistence where available; report missing prerequisites and complete independent domain tests rather than inventing a backend.

## Review a change

> Review the current diff against its requirement/rule/test IDs. Focus on incorrect behavior, tenant leakage, concurrency, lost acknowledged data and missing acceptance evidence. Cite concrete file/line findings and impact. Distinguish verified defects from questions. Do not mark planned or mocked checks as passed, and do not change scope to deferred features.

## Maintain documentation

> Update the documentation for the requested behavior change. Keep PRD, business rules, API, database, design, tests, backlog and traceability consistent where affected. Preserve observed/inferred/baseline distinctions. Run the documentation checker, review semantic consistency and report exactly what changed. Do not implement the application unless requested.

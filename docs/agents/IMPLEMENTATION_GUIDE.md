# Implementation guide

Use [Backlog](../BACKLOG.md) for dependency and priority truth. This guide expands its work packages into reviewable deliverables; it does not authorize executing them all in one request.

## Task execution loop

1. Inspect current code and applicable instructions; identify the requested outcome and existing behavior.
2. Select requirement/rule/test IDs from [Traceability](../TRACEABILITY.md). Record scope using the [task template](TASK_TEMPLATE.md) for substantial work.
3. Resolve prerequisite contracts. For open provider decisions, run a bounded spike and record actual evidence. Continue independent tasks where possible.
4. Implement the domain behavior, persistence boundary and interface states as one usable slice. Add the meaningful failure/race checks required by that behavior.
5. Verify the changed paths with available commands, review the diff and update affected documents.
6. Report outcome, evidence and remaining limitations. Update backlog status honestly and leave a handoff if needed.

## M0: feasibility and design

| Item | Concrete deliverables | Evidence needed before dependent production work |
|---|---|---|
| BL-001 | Auth decision record; identity/session adapter contract; callback, logout, recovery and operator-MFA spike | Provider-supported identity linking, tenant mapping and session checks; chosen versions/cost constraints; no invented provider capability |
| BL-002 | Drive fixture spike; credential/access decision; web/worker/DB/storage deployment proposal | Folder pagination/nesting, resource keys and relevant shared-folder types; permission loss and quota handling; bounded image streaming and worker feasibility |
| BL-005 | Synthetic creation/detail/gallery/review/error wireframes; reusable controls and tokens | Page states and keyboard/mobile interactions match Design; no real audit photos; provider-independent screens can proceed immediately |

For each spike record hypothesis, setup, command/action, actual result, unsupported cases and recommendation. A mocked adapter proves local contract behavior only. If credentials or budget are missing, identify the exact missing input while completing synthetic contract/design work. Close DEC-001/002/003 only with the evidence listed in the decision register.

## M1: studio foundation

| Item | Implementation slice | Integration seam / verification |
|---|---|---|
| BL-003 | Reproducible web/worker scaffold; runtime/lockfile; schema/migrations; scoped repositories; transactional jobs/audit/idempotency; CI | Empty-DB migrations, job lease recovery and actual PostgreSQL constraint tests; record executable setup commands |
| BL-004 | Provider auth → mapped identity → atomic studio/membership/settings/trial → onboarding → dashboard | Repeat/concurrent provisioning and failed transaction recovery; suspended/incomplete setup paths; T-001, T-002, T-003 |
| BL-006 | Project form → policy/quota check → durable project/workflows/set/job → detail; edit/archive/restore | Preserve omitted deadlines; same-key retry; quota races; expired owner allowances; T-004, T-014 and T-019 |

Keep provisioning and project creation transactions separate. A project record existing with inventory pending is a successful create; source indexing is subsequent work. Do not show a failed creation merely because navigation or source indexing failed.

## M2: client workflow

| Item | Implementation slice | Integration seam / verification |
|---|---|---|
| BL-007 | Drive adapter → staged complete inventory generation → stable photo rows → derived-image jobs | No partial publication; source failure retains previous generation; duplicate filenames; T-005, T-017 |
| BL-008 | Share bootstrap → independent menu grant → protected metadata/media endpoints | Main and download cookies coexist; current access/version/deadline checked; T-012, T-018 |
| BL-009 | Gallery/folders/viewer → loading/empty/error/access states | Photo IDs used throughout; incremental loading; select and enlarge distinct; T-006, T-016 |
| BL-010 | Selected IDs/notes → revisioned save → canonical acknowledgement → conflict recovery | Pending edits remain visible; shared-tab conflict handled without overwrite; T-007, T-008 |
| BL-011 | Saved draft → confirm transaction → immutable snapshot → owner reopen → new confirmation | Project/set lock order and source publication races; stable prior snapshot; T-009, T-010 |
| BL-012 | Dashboard/result views → explicit draft or confirmed export | Canonical counts, original identities, formula-safe CSV, polling freshness; T-011, T-021 |

Build against the documented API contracts. A local gallery prototype can use a synthetic adapter, but access/selection acceptance is incomplete until real server and database boundaries are exercised.

## M3: pilot readiness

| Item | Implementation slice | Evidence |
|---|---|---|
| BL-013 | Independent download authorization → provider validation → bounded stream → clear failure UI | T-013 plus provider/hosting smoke check; do not claim browser file-save completion from request initiation alone |
| BL-014 | Separate operator permissions → sanitized diagnostics → reasoned grant/suspend/reactivate | Transactional audit and denial tests; no default photo browsing or general DB editor; T-014, T-015 |
| BL-015 | Redacted telemetry → archive/cache/session cleanup → privacy/support configuration | Deletion/restore races and actual retention behavior; T-018, T-019; close applicable DEC-006 gates |
| BL-016 | Integrated owner/client/operator journeys across languages, devices and denial cases | Relevant acceptance matrix passes with recorded versions; real-device checks are distinguished from emulation |
| BL-017 | Staging pipeline → restore drill → measured load → controlled pilot release | T-020, T-022; exact build/migration/config identity, rollback evidence and release gates |

Use the [Deployment](../DEPLOYMENT.md) runbook when deployment is in scope. Infrastructure provisioning, paid services and public release require the applicable user authorization; preparing code and a concrete deployment plan can happen first.

## Keep deferred features deferred

BL-101 through BL-105 remain later work unless scope changes explicitly. Do not add payment checkout, Telegram, bulk messaging, extra/print workflows, staff permissions, custom domains or ZIP as incidental scaffolding. Extensible tables/modules are allowed when justified, but avoid fake endpoints, dead UI and unused provider dependencies.

## Changes to the baseline

For a material scope or architecture change, identify the old contract, proposed replacement, reason and affected requirements. Record an ADR when the decision has lasting consequences. Update API/schema/UI/test mappings before calling the change finished. Small implementation details that preserve contracts do not need an ADR or user confirmation.

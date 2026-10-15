# Implementation backlog

Status: **BL-001 In progress** (bounded synthetic spike verified; real-provider/deployment and durable-session evidence pending). All other items **Todo**. Priorities: P0 foundation/release blocker, P1 core capability, P2 later enhancement. Sizes S/M/L are relative scope, not delivery estimates. Do not interpret this plan as completed application work.

## Milestones

| Milestone | Exit condition |
|---|---|
| M0 — Feasibility | Auth/Drive/hosting choices recorded; supported source access proved; component flows reviewed |
| M1 — Studio foundation | Isolated owner session, atomic setup, entitlement and durable project creation |
| M2 — Client core | Gallery, reliable selection/notes, confirmation and owner results |
| M3 — Pilot readiness | Downloads, operator diagnostics, security, retention, restore and release checks |
| R1 — Workflow expansion | Extras, printing, batch/staff/ZIP scoped and tested separately |
| R2 — Commercial/integrations | Payments, communication integrations, CRM and custom domains |

## MVP work packages

| ID | Priority / size | Work | Dependencies | Acceptance / done evidence |
|---|---|---|---|---|
| BL-001 | P0 / M | **In progress** — conditional Better Auth recommendation; identity/session contract and bounded spike | None | [ADR-004](decisions/ADR-004-auth-session-feasibility.md), [contract](auth/SESSION_CONTRACT.md), [evidence](auth/BL-001-EVIDENCE.md): 18/18 local synthetic checks Passed; T-001/T-015 full acceptance pending; DEC-001 open |
| BL-002 | P0 / M | Prove Drive access and hosting/streaming/worker feasibility; close DEC-002/003 | None | Dedicated folder test with pagination, nesting, revoked access and quota behavior; no undocumented scraping |
| BL-003 | P0 / L | Scaffold web/worker, migrations, scoped repository interfaces, audit/idempotency/jobs and CI | BL-001, BL-002 | Clean setup on empty database; migration/rollback strategy; transaction and lease tests; T-002/004/017 foundations |
| BL-004 | P0 / M | Auth integration, tenant membership, idempotent provisioning and setup UI | BL-003 | Repeat/concurrent setup yields one studio/trial/defaults; protected access tests T-001/002/003 pass |
| BL-005 | P1 / M | Wireframes, design tokens and accessible shared controls | None | Creation/detail/gallery/review/error flows reviewed with synthetic data; no future-feature dead buttons |
| BL-006 | P0 / L | Project create/edit/archive/restore and entitlement checks | BL-004, BL-005 | Atomic quota lock, durable create result, preserved deadlines; T-004/014 and applicable T-019 pass |
| BL-007 | P0 / L | Drive adapter, inventory worker, stable photo IDs and thumbnail generation | BL-002, BL-006 | Complete generation semantics, failure retention and bounded processing; T-005/017 pass |
| BL-008 | P0 / M | Gallery grant/password/expiry/revocation policies and protected media delivery | BL-006 | Independent main/download grants; server checks on every route; T-012 and relevant T-018 pass |
| BL-009 | P1 / L | Responsive client gallery/folders/viewer and access states | BL-005, BL-007, BL-008 | Correct identity, incremental loading, accessible select/enlarge; T-006 and relevant T-016 pass |
| BL-010 | P0 / L | Revisioned shared selections and per-photo notes | BL-009 | Pending/saved/conflict UX, quota and note enforcement; T-007/008 pass |
| BL-011 | P0 / M | Confirmation snapshots and explicit owner reopen | BL-010 | Atomic lock/history, idempotent confirmation and concurrency races; T-009/010 pass |
| BL-012 | P1 / M | Owner dashboard/status/detail, exact copy/CSV export | BL-011 | Distinguish draft/confirmed, preserve folder/ID identity, polling freshness; T-011/021 pass |
| BL-013 | P1 / M | Individual source-image download and failure UX | BL-008, BL-009 | Safe streaming within cap, authorized menu only, clear failures; T-013 pass |
| BL-014 | P0 / M | Minimal ops diagnostics, entitlement grants and suspension/reactivation | BL-004, BL-006 | Explicit operator permissions/reasons; no gallery default access; T-014/015 pass |
| BL-015 | P0 / M | Sanitized telemetry, archive purge/cache cleanup, privacy/support policy | BL-007, BL-008, BL-014; DEC-006 | Actual retention schedule, no secret logs, recoverable archive/purge races; T-018/019 pass |
| BL-016 | P0 / M | End-to-end security, localization, accessibility and device pass | BL-009 through BL-015 | T-001 through T-019 as applicable passing; no P0/P1 open; reviewed ID/EN interpolations |
| BL-017 | P0 / M | Staging/production pipeline, backups/restore, load test and pilot release | BL-015, BL-016; DEC-001/002/003/006 closed | T-020/022 pass, recorded versions, restore drill and rollback procedure; release checklist approved |

Dependencies denote prerequisite contracts, not a requirement that every frontend task wait for all backend code; fixtures/mocks can support independent implementation once a contract is stable. Do not call a mocked path production-complete.

## Deferred packages

| ID | Phase / requirements | Scope and entry criteria |
|---|---|---|
| BL-101 | R1 / FUT-EXTRA-001 | Extra selection tied to a specific main confirmation and immutable base photo IDs; verify no double matches for same-name files |
| BL-102 | R1 / FUT-PRINT-001 | Print template/version, size quotas, quantities, full-quota option and result export; decide whether one photo can satisfy several sizes |
| BL-103 | R1 / FUT-BATCH-001, FUT-TEAM-001, FUT-ZIP-001 | Split into separate epics before execution: import/partial recovery, internal folder trees, staff permissions/invites, bounded ZIP jobs |
| BL-104 | R2 / FUT-PAY-001, FUT-MSG-001, FUT-SYNC-001 | Split into separate epics: payment provider/reconciliation, consent-aware communication, idempotent CRM sync; close DEC-004 and integration-specific reviews |
| BL-105 | R2 / FUT-DOMAIN-001 | Domain-control verification, routing/TLS, branding and ownership collision tests after single-domain pilot is stable |

Avoid inventing a schedule before provider spikes and implementation estimates. MVP ends at M3; R1/R2 do not silently enter its release criteria.

## Work-item template

Each issue should contain: ID/title, user outcome, requirement IDs, scope/exclusions, dependency IDs, acceptance scenarios, schema/API impact, risk/rollback, test evidence and current status. Use Todo → In progress → Review → Done, or Blocked with a concrete dependency. Done means behavior implemented, reviewed and verified; documentation or a UI skeleton alone is insufficient.

## Recommended next execution

Start BL-001, BL-002 and BL-005 to settle feasibility and workflows. Then BL-003/004/006 establish a usable studio-to-project slice. Integrate gallery/selection/confirmation before adding paid plans or optional automation. Do not deploy or connect paid services as part of documentation creation.

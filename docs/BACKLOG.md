# Implementation backlog

Status: **BL-001 In progress** (synthetic auth spike; provider evidence pending). **BL-002 In progress** (29 offline checks; DEC-002/003 open). **BL-003 In progress** ([foundation evidence](foundation/BL-003-EVIDENCE.md); operational/provider-schema gates pending). **BL-004 In progress** ([onboarding evidence](auth/BL-004-EVIDENCE.md): app-side transaction/setup/denial subset verified on real PostgreSQL; DEC-001 still open, no real login/logout/recovery). **BL-005 Done for design/prototype only** ([evidence](design/BL-005-EVIDENCE.md)); full T-006/T-016 remains untested. All other items **Todo**. Priorities: P0 foundation/release blocker, P1 core capability, P2 later enhancement. Sizes S/M/L are relative scope, not delivery estimates.

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
| BL-001 | P0 / M | **In progress** — conditional Better Auth/PostgreSQL; Auth0 fallback; DEC-001 OPEN/PARTIALLY VALIDATED | None | [ADR-006](decisions/ADR-006-auth-session-postgres-validation.md) supplements ADR-004; [contract](auth/SESSION_CONTRACT.md), [current evidence](auth/DEC-001-EVIDENCE-2026-10-18.md): 18 memory + 5 real local PG investigation checks Passed; native logout failure/account-uniqueness gaps reproduced. Provider/browser/mail, app revocation/MFA and approved deployment budget pending; full acceptance not passed |
| BL-002 | P0 / M | **In progress** — bounded Drive/streaming contract, synthetic spike and conditional hosting assessment | None | [ADR-005](decisions/ADR-005-drive-hosting-feasibility.md), [contract](drive/ADAPTER_CONTRACT.md), [evidence](drive/BL-002-EVIDENCE.md): 29/29 offline checks Passed. Dedicated public/private/shared folders, real keys/scopes/revocation/quotas and hosted proxy/worker/DB/storage evidence pending; DEC-002/003 open, not Done |
| BL-003 | P0 / L | **In progress** — local web/worker, schema/scoped repos, audit/idempotency/jobs and CI implemented | BL-001, BL-002 decision contracts; DEC-003 operational setup | [Evidence](foundation/BL-003-EVIDENCE.md): clean lock install, empty PG 18.4 migration, rollback/forward compatibility, 4 unit + 17 PG checks, build/process smoke Passed; T-002/004/017 foundation subset only. Provider-owned schema/hosting integration gated; full product APIs/quota/inventory belong to later IDs |
| BL-004 | P0 / M | **In progress** — atomic identity/studio/defaults/trial, setup/retry UI and fail-closed owner handlers; provider integration blocked | BL-003 foundation; approved DEC-001 | [Evidence](auth/BL-004-EVIDENCE.md): repeated/concurrent provisioning, rollback/retry, identity separation, expiry while locked, no trial renewal, CSRF/tenant-input denial and runtime grants verified. T-001 provider login/logout/recovery, full T-002 API matrix and authenticated-browser T-003 remain incomplete; not Done |
| BL-005 | P1 / M | **Done — design/prototype only**: original wireframes, semantic tokens, accessible controls and paired ID/EN copy | None | [Prototype](../prototypes/bl005-ux/README.md), [component/state specification](design/BL-005-UX.md), [evidence](design/BL-005-EVIDENCE.md): creation/detail/gallery/viewer/review/error/access reviewed with synthetic data; 10 design checks and 360/768/1440 browser review; no future-feature dead buttons. Full T-006/T-016 runtime acceptance belongs to later integration |
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

Resume BL-001/002 through their evidence/handoffs when authorized test environments exist; BL-005's local design deliverable is complete. BL-003/004/006 establish a usable studio-to-project slice; use the BL-005 controls/states as design input. Integrate gallery/selection/confirmation before adding paid plans or optional automation. Do not deploy or connect paid services as part of design creation.

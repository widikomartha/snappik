# Product requirements

Status: baseline v0.1 · Product: Snappik · Date: 13 October 2026.

## Problem and outcome

Studios need a dependable way to turn client photo choices into an unambiguous editing list. Sending Drive folders and collecting filenames in chat creates mismatches, late responses and unclear confirmation. Snappik should present a branded gallery, preserve stable file identity, enforce selection rules and show the same result to the client and studio.

The core outcome is: **a studio creates a project, a client selects and confirms photos, and the studio receives an exact, persistent result with notes and folder context.** Individual delivery downloads complete the initial workflow.

## Actors

| Actor | MVP capability |
|---|---|
| Visitor | Product information, help, invitation acceptance/login for the initial pilot; public registration in a later owner-acquisition slice |
| Studio owner | Setup, projects, source sync, link controls, selection monitoring, export and entitlement visibility |
| Client | Open authorized gallery, select/note/review/confirm, download when enabled |
| Platform operator | Tenant diagnostics and explicit, audited entitlement changes/suspension; no routine gallery browsing |

MVP permits one owner membership per studio and one studio per owner. Keep membership records for future staff roles, but do not expose staff-invitation or role-editing UI. Operator authority is separate from studio membership.

[ADR-015](decisions/ADR-015-auth-architecture-conditional-approval.md): the product owner approved an invitation-only **studio-owner acquisition pilot** on19 October. Public registration remains planned later. Owner acquisition invitations are distinct from deferred staff/team invitations; the latter UI prohibition above remains. Real invitation acceptance and email verification must be implemented and tested under BL-004; synthetic seeded accounts do not satisfy this requirement. Conditional Better Auth+PG direction approval does not complete MVP authentication or authorize release.

## MVP requirements

| ID | Requirement | Acceptance outcome |
|---|---|---|
| REQ-AUTH-001 | Reliable owner authentication | Login/logout/recovery use an approved auth provider; a protected bookmark returns after login; expired sessions never erase acknowledged saves |
| REQ-TEN-001 | Tenant isolation | Another studio's IDs never return or mutate data; operator access uses a separate permission check |
| REQ-ONB-001 | Complete setup | Profile, studio, membership, defaults and trial initialize idempotently; incomplete setup has a recovery action |
| REQ-PROJ-001 | Project lifecycle | Create/edit/archive/restore a project, configure menus/limits/deadlines, and retrieve its durable link without duplicate creation |
| REQ-DRIVE-001 | Drive source inventory | Validate a folder, paginate traversal, optionally inspect subfolders, retain distinct file IDs and show sync health |
| REQ-GAL-001 | Client gallery | Folder navigation, thumbnails, full-image viewer, layout preferences and incremental loading work without a client account |
| REQ-SEL-001 | Main selection | Save up to the configured quota with revision control; duplicate filenames remain distinct |
| REQ-NOTE-001 | Photo notes | Up to 500 Unicode code points per selected photo persist into the studio result |
| REQ-CONF-001 | Confirmation and reopen | Confirm produces a durable immutable snapshot and locks editing; owner reopen preserves choices and history |
| REQ-RESULTS-001 | Reliable editing handoff | Studio can view and export IDs, original names, paths and notes; export matches the confirmed revision |
| REQ-DL-001 | Individual downloads | Authorized client can download one eligible source image; download permission and expiry are independent of selection |
| REQ-TRACK-001 | Operational dashboard | Show project totals, pending/confirmed states and upcoming deadlines with last-updated time and refresh |
| REQ-ACCESS-001 | Gallery access rules | Unguessable links, optional per-menu password, revocation and independent deadlines are enforced server-side |
| REQ-ENT-001 | Entitlements | Show trial/active/expired access and quota; enforce limits for every owner write entry point |
| REQ-OPS-001 | Minimum operator tooling | Authorized operator can inspect setup/job health, grant dated access, suspend/reactivate with reason and audit event |
| REQ-UX-001 | Accessible responsive UX | Core journey works on narrow and wide screens, keyboard controls and ID/EN text; errors are actionable |
| REQ-REL-001 | Retry and concurrency safety | Repeating a creation/confirmation key is safe; stale selection/config writes fail explicitly; jobs tolerate retries |
| REQ-PRIV-001 | Data minimization | Gallery excludes owner contacts/provider credentials; client routes are non-indexable; logs redact tokens and notes |
| REQ-OBS-001 | Observable operations | Correlation IDs, job outcomes, sync errors and security-relevant mutations are diagnosable without credential exposure |
| REQ-RET-001 | Archive and retention | Archiving immediately blocks client access; restores within retention preserve results; staged purge is verifiable |

## Deliberate differences from the audited product

1. Contact numbers are optional in MVP; they must not prevent gallery creation. Future WhatsApp actions require a valid recipient at send time.
2. Filenames are display values, never photo identity or the basis for locking previous choices.
3. Studio initialization is part of onboarding, not an undocumented Settings workaround.
4. Reopening a selection is an explicit state transition retaining confirmation history. It is not an ambiguous project-wide Boolean.
5. MVP makes no unlimited-capacity claim. Operational ceilings are explicit and capacity-tested.
6. A gallery password protects Snappik access, not a source folder independently shared through Drive.

## Deferred requirements

| Future ID | Scope | Phase |
|---|---|---|
| FUT-EXTRA-001 | Separate extra selection based on confirmed photo IDs | R1 |
| FUT-PRINT-001 | Print sizes, quantities, template quotas and optional full-quota confirmation | R1 |
| FUT-BATCH-001 | CSV/Excel import, partial failure recovery, project folders | R1 |
| FUT-TEAM-001 | Staff invitations and role-based studio permissions | R1 |
| FUT-PAY-001 | Provider checkout/webhooks, renewal and reconciliation | R2 |
| FUT-MSG-001 | WhatsApp templates and Telegram reminders | R2 |
| FUT-SYNC-001 | External CRM idempotent project synchronization | R2 |
| FUT-DOMAIN-001 | Verified custom domains and branding operations | R2 |
| FUT-ZIP-001 | Bounded asynchronous ZIP export | R1 |

Out of scope: photo editing, AI culling, original-photo storage replacement, print manufacture/payment, marketplaces and unattended WhatsApp broadcast. A Drive download-all shortcut is not a substitute for a secure ZIP implementation and is not part of MVP.

## Product measures and quality targets

These are proposed pilot targets, not measured results or contractual SLAs. No revenue forecast is assumed.

| Measure | Definition / initial target |
|---|---|
| Activation | At least 80% of invited pilot studios that complete setup create a usable first project; report numerator and denominator |
| Core task success | At least 95% of scripted valid selection/confirmation runs pass on the release device matrix |
| Data integrity | Zero mismatched file IDs, lost acknowledged selections or cross-tenant disclosures in release tests |
| Save/confirm latency | p95 under 1 second at API boundary, excluding external provider requests, under the recorded pilot load |
| Gallery usability | First thumbnail batch visible within 3 seconds for warm cache on the defined test network; report cold-cache separately |
| Recovery | Duplicate request, lost response and worker restart scenarios recover without duplicated business actions |

Pilot load fixture: 10 studios, 100 projects, a 1,000-image/four-folder reference project and 50 concurrently active client sessions. Operational maximums in Business Rules are separate from this baseline performance test and require boundary verification.

Event names: `setup_completed`, `project_created`, `inventory_ready`, `selection_saved`, `selection_confirmed`, `selection_reopened`, `download_completed`, `job_failed`. Send counts/timings and pseudonymous identifiers, not names, notes, filenames or share tokens. Conversion analysis must account for disabled optional analytics.

## Release conditions

All MVP requirements have passing tests; authorization and restore drills pass; unresolved launch gates in [Decisions](decisions/README.md) are closed; privacy/support copy matches actual behavior; no P0/P1 defects remain. Commercial billing can remain absent in an explicitly labeled invitation-only pilot. See [Backlog](BACKLOG.md) and [Test plan](TEST_PLAN.md).

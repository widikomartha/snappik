# Decisions and open questions

The following ADRs establish the documentation baseline. They record chosen design direction, not a deployed system or verified Fastpik implementation:

- [ADR-001: modular monolith](ADR-001-modular-monolith.md)
- [ADR-002: stable photo identity and versioned confirmation](ADR-002-photo-identity-and-confirmation.md)
- [ADR-003: phased MVP and independent access states](ADR-003-mvp-and-access-policy.md)
- [ADR-004: auth/session feasibility for DEC-001](ADR-004-auth-session-feasibility.md) — conditional Better Auth recommendation; decision remains open
- [ADR-005: Drive/hosting feasibility for DEC-002/003](ADR-005-drive-hosting-feasibility.md) — bounded synthetic adapter and conditional hosting proposal; both decisions remain open
- [ADR-006: DEC-001 runtime/PostgreSQL follow-up](ADR-006-auth-session-postgres-validation.md) — supplements ADR-004; current sources and real local PG findings; production decision remains open
- [ADR-007: DEC-002 source access and studio credentials](ADR-007-drive-source-credentials.md) — supplements ADR-005 for DEC-002; conditional studio OAuth preference, paired pending credential design and current official research; no direct provider evidence or approved production decision
- [ADR-008: DEC-003 hosting, PostgreSQL and private storage](ADR-008-hosting-postgres-private-storage.md) — supplements ADR-005 for DEC-003; conditional Render Singapore/PG18 + regional private S3, staged R2/Railway alternatives; local HTTP/decoder evidence only, no approved production choice

## Open decision register

| ID | Decision | Default direction / question | Blocks | Closure evidence |
|---|---|---|---|---|
| DEC-001 | Auth provider and session strategy | **OPEN / PARTIALLY VALIDATED**: conditional Better Auth/PostgreSQL, Auth0 fallback in [ADR-006](ADR-006-auth-session-postgres-validation.md), supplementing ADR-004. 18 memory + 5 real local PG investigation checks Passed; raw logout failure/missing account-pair constraint reproduced; no live provider/hosting validation | BL-001 completion; BL-003/004 production auth | Approved provider/deployment/budget; signed callback/Next protected route; delivered recovery; durable app revocation/user-lock and account-link races; operator MFA/recovery; secret/hash/throttle/rotation proof. [Current evidence](../auth/DEC-001-EVIDENCE-2026-10-18.md); public prices verified, total budget/config not approved |
| DEC-002 | Drive access/credential model | **OPEN / PARTIALLY VALIDATED**: [ADR-007](ADR-007-drive-source-credentials.md) supplements ADR-005; conditional studio OAuth `drive.readonly`, narrower-scope experiment first; public-only fallback conditional on product acceptance and API proof. Current official research and candidate credential design only; 29 historical offline checks, dedicated assets unavailable by user confirmation | BL-002 completion; provider-backed BL-007 (downstream source/download work) | [Current closure ledger](../drive/DEC-002-EVIDENCE-2026-10-18.md): direct access-mode/key/subtree/pagination/revocation/quota/cache evidence; minimum-scope, limited-access child-list and unsupported cases; approved security/credential/cache model and finalized paired API/schema contract. No live row closed; production implementation retains separate delivery acceptance |
| DEC-003 | Hosting, DB and private object storage | **OPEN / PARTIALLY VALIDATED**: [ADR-008](ADR-008-hosting-postgres-private-storage.md) supplements ADR-005; conditional Render Singapore web/worker/PG18 + private S3 Singapore, R2/Railway fallback. Five local HTTP checks + two native decoder cases Passed; no hosted/private-object/restore proof. Owner confirms budget/location unset | BL-002 completion; BL-003 operational setup, BL-013, BL-017 | [Current ledger/protocol](../hosting/DEC-003-EVIDENCE-2026-10-18.md): approved provider/plan/region/budget, target Linux artifact/commands/migration/TLS, actual 50 MiB proxy/idle/total/cancel, hosted lease/DB recovery, object denial, backup location/30-day retention/restore with newer revocations, provider token-path logging; PRD load before release. No provider closure row complete |
| DEC-004 | Commercial plan/prices/payment provider | Invitation-only trial/manual grants for MVP; competitor pricing is not Snappik pricing | BL-104; public paid launch | Product owner approved plans, renewal/refund rules, provider sandbox and reconciliation contract |
| DEC-005 | Visual identity and brand assets | Snappik text wordmark/system typography until original branding reviewed | Public marketing final polish | Approved original logo/assets and tested theme tokens |
| DEC-006 | Privacy/retention/processors/support | Proposed technical retention in BR-RET; exact jurisdiction, legal text and request process require review | BL-015/017 public release | Reviewed policy, processor list, retention schedule, deletion/export verification and support contact |

No extra user approval is required to draft or refine these documents. These are implementation dependencies, not a request to stop all work. Complete independent backlog items while resolving them; do not invent settled providers, costs, legal conclusions or hidden competitor behavior.

## ADR template

Use a sequential filename. Include date/status, context, decision, alternatives, consequences, scope, affected documents and conditions for reconsideration. Supersede an ADR through a new record rather than rewriting history without a note. A change in decision must update PRD/rules/schema/API/tests where relevant.

# Decisions and open questions

The following ADRs establish the documentation baseline. They record chosen design direction, not a deployed system or verified Fastpik implementation:

- [ADR-001: modular monolith](ADR-001-modular-monolith.md)
- [ADR-002: stable photo identity and versioned confirmation](ADR-002-photo-identity-and-confirmation.md)
- [ADR-003: phased MVP and independent access states](ADR-003-mvp-and-access-policy.md)
- [ADR-004: auth/session feasibility for DEC-001](ADR-004-auth-session-feasibility.md) — conditional Better Auth recommendation; decision remains open
- [ADR-005: Drive/hosting feasibility for DEC-002/003](ADR-005-drive-hosting-feasibility.md) — bounded synthetic adapter and conditional hosting proposal; both decisions remain open

## Open decision register

| ID | Decision | Default direction / question | Blocks | Closure evidence |
|---|---|---|---|---|
| DEC-001 | Auth provider and session strategy | Open: conditional Better Auth/PostgreSQL recommendation in [ADR-004](ADR-004-auth-session-feasibility.md); 18 synthetic library/policy checks passed; no real provider/hosting validation | BL-003/004 production auth | Final provider/deployment fit, authorized callback/email/MFA smoke and durable PostgreSQL revocation/races; hashing, secrets and costs recorded in ADR-004 |
| DEC-002 | Drive access/credential model | Open: [ADR-005](ADR-005-drive-hosting-feasibility.md), bounded [contract](../drive/ADAPTER_CONTRACT.md); 29 offline checks only. Dedicated authorized folders unavailable | BL-007 provider implementation | Execute [provider matrix](../drive/BL-002-EVIDENCE.md): public/private/shared modes, resource keys, nesting, pagination, permission loss, assigned quotas and permitted cache use; settle scope and paired API/schema credential/key gaps |
| DEC-003 | Hosting, DB and private object storage | Open: conditional Render Singapore web/worker/PostgreSQL + private storage evaluation in ADR-005; no deployment, quote or runtime evidence | BL-003 operational setup, BL-013, BL-017 | Chosen plan/region/budget and actual commands; 50 MiB proxy/timeouts/cancellation, worker/DB recovery, object denial, backup retention/restore; PRD load evidence before release |
| DEC-004 | Commercial plan/prices/payment provider | Invitation-only trial/manual grants for MVP; competitor pricing is not Snappik pricing | BL-104; public paid launch | Product owner approved plans, renewal/refund rules, provider sandbox and reconciliation contract |
| DEC-005 | Visual identity and brand assets | Snappik text wordmark/system typography until original branding reviewed | Public marketing final polish | Approved original logo/assets and tested theme tokens |
| DEC-006 | Privacy/retention/processors/support | Proposed technical retention in BR-RET; exact jurisdiction, legal text and request process require review | BL-015/017 public release | Reviewed policy, processor list, retention schedule, deletion/export verification and support contact |

No extra user approval is required to draft or refine these documents. These are implementation dependencies, not a request to stop all work. Complete independent backlog items while resolving them; do not invent settled providers, costs, legal conclusions or hidden competitor behavior.

## ADR template

Use a sequential filename. Include date/status, context, decision, alternatives, consequences, scope, affected documents and conditions for reconsideration. Supersede an ADR through a new record rather than rewriting history without a note. A change in decision must update PRD/rules/schema/API/tests where relevant.

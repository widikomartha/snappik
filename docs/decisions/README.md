# Decisions and open questions

The following ADRs establish the documentation baseline. They record chosen design direction, not a deployed system or verified Fastpik implementation:

- [ADR-001: modular monolith](ADR-001-modular-monolith.md)
- [ADR-002: stable photo identity and versioned confirmation](ADR-002-photo-identity-and-confirmation.md)
- [ADR-003: phased MVP and independent access states](ADR-003-mvp-and-access-policy.md)

## Open decision register

| ID | Decision | Default direction / question | Blocks | Closure evidence |
|---|---|---|---|---|
| DEC-001 | Auth provider and session strategy | Maintained provider/library, email/password or provider flow, verified linking, owner recovery and operator MFA; compare actual deployment constraints | BL-003/004 production auth | Chosen provider, callback/session/logout tests, hashing responsibility, secrets and cost recorded |
| DEC-002 | Drive access/credential model | Prove support for submitted folders through documented APIs; API-key/public versus studio OAuth access must be decided by spike, not guessed | BL-007 provider implementation | Test public/private/shared types, resource keys, nesting, pagination, permission loss, quotas and permitted cache use |
| DEC-003 | Hosting, DB and private object storage | Must support web, worker, streaming and region/backup requirements within a budget | BL-003 operational setup, BL-013, BL-017 | Provider choice, region, backup/restore capability, streaming/timeouts, costs and deployment commands |
| DEC-004 | Commercial plan/prices/payment provider | Invitation-only trial/manual grants for MVP; competitor pricing is not Snappik pricing | BL-104; public paid launch | Product owner approved plans, renewal/refund rules, provider sandbox and reconciliation contract |
| DEC-005 | Visual identity and brand assets | Snappik text wordmark/system typography until original branding reviewed | Public marketing final polish | Approved original logo/assets and tested theme tokens |
| DEC-006 | Privacy/retention/processors/support | Proposed technical retention in BR-RET; exact jurisdiction, legal text and request process require review | BL-015/017 public release | Reviewed policy, processor list, retention schedule, deletion/export verification and support contact |

No extra user approval is required to draft or refine these documents. These are implementation dependencies, not a request to stop all work. Complete independent backlog items while resolving them; do not invent settled providers, costs, legal conclusions or hidden competitor behavior.

## ADR template

Use a sequential filename. Include date/status, context, decision, alternatives, consequences, scope, affected documents and conditions for reconsideration. Supersede an ADR through a new record rather than rewriting history without a note. A change in decision must update PRD/rules/schema/API/tests where relevant.

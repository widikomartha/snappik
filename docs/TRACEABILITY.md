# Requirements traceability

Status: full application acceptance remains **incomplete**. BL-001 has a verified synthetic auth subset documented in [evidence](auth/BL-001-EVIDENCE.md); this does not pass full T-001 or T-015. BL-002's [evidence](drive/BL-002-EVIDENCE.md) maps a 29-check offline feasibility subset to T-005/T-013/T-017/T-022 implications; none is full acceptance. Short labels in other docs refer to the full `REQ-*` IDs here. Business Rules owns behavioral definitions; Backlog owns work ordering.

BL-005 is Done for the design/prototype deliverable: [UX specification](design/BL-005-UX.md) and [evidence](design/BL-005-EVIDENCE.md) map REQ-GAL-001/REQ-UX-001 to design-relevant T-006/T-016 checks. Synthetic in-memory journeys, viewport measurements and wireframes do not change the full application acceptance status of those rows.

BL-003 [foundation evidence](foundation/BL-003-EVIDENCE.md) verifies REQ-TEN-001 / BR-TEN-001 scoped persistence and REQ-REL-001 / BR-REL-001/002 atomic retry/queue foundations on actual PostgreSQL. T-002/T-004/T-017 remain incomplete as full product scenarios: real auth, HTTP permissions, project quota and actual inventory/provider behavior remain in their owning backlog items. BL-003 is In progress for gated operational/provider-schema work; isolated PG evidence does not close DEC-001/002/003.

DEC-001 [18 October follow-up](auth/DEC-001-EVIDENCE-2026-10-18.md) adds 5 real local PG checks to the 18 memory checks. Native logout failure and account-pair uniqueness gaps are reproduced; OAuth/mail and business scope stay synthetic. This expands REQ-AUTH-001 investigation evidence only; production T-001 and associated T-002/T-003/T-015 remain incomplete. [ADR-006](decisions/ADR-006-auth-session-postgres-validation.md) records the conditional recommendation and open closure gates.

| Requirement | Business rule(s) | Backlog | Acceptance tests |
|---|---|---|---|
| REQ-AUTH-001 | BR-TEN-001, BR-ONB-001 | BL-001, BL-004 | T-001 |
| REQ-TEN-001 | BR-TEN-001 | BL-003, BL-004 | T-002 |
| REQ-ONB-001 | BR-ONB-001, BR-ENT-001 | BL-004 | T-003 |
| REQ-PROJ-001 | BR-PROJ-001, BR-PROJ-002, BR-PROJ-003, BR-PROJ-004 | BL-006 | T-004, T-019 |
| REQ-DRIVE-001 | BR-DRIVE-001, BR-DRIVE-002, BR-DRIVE-003, BR-DRIVE-004 | BL-002, BL-007 | T-005 |
| REQ-GAL-001 | BR-DRIVE-002, BR-ACCESS-001 | BL-005, BL-009 | T-006, T-022 |
| REQ-SEL-001 | BR-SEL-001, BR-SEL-002, BR-SEL-003 | BL-010 | T-007 |
| REQ-NOTE-001 | BR-SEL-002, BR-SEL-003 | BL-010 | T-008 |
| REQ-CONF-001 | BR-CONF-001, BR-CONF-002, BR-CONF-003, BR-CONF-004 | BL-011 | T-009, T-010 |
| REQ-RESULTS-001 | BR-RESULTS-001 | BL-012 | T-011 |
| REQ-DL-001 | BR-DL-001 | BL-013 | T-013, T-022 |
| REQ-TRACK-001 | BR-TRACK-001 | BL-012 | T-021 |
| REQ-ACCESS-001 | BR-ACCESS-001, BR-ACCESS-002, BR-ACCESS-003, BR-ACCESS-004 | BL-008 | T-012 |
| REQ-ENT-001 | BR-ENT-001, BR-ENT-002, BR-ENT-003, BR-ENT-004 | BL-006, BL-014 | T-014 |
| REQ-OPS-001 | BR-OPS-001 | BL-014 | T-015 |
| REQ-UX-001 | BR-TRACK-001 | BL-005, BL-009, BL-016 | T-016 |
| REQ-REL-001 | BR-REL-001, BR-REL-002, BR-SEL-003 | BL-003, BL-007, BL-011 | T-004, T-007, T-009, T-017 |
| REQ-PRIV-001 | BR-ACCESS-001, BR-ACCESS-003, BR-OPS-001 | BL-008, BL-015, BL-016 | T-012, T-018 |
| REQ-OBS-001 | BR-REL-002, BR-OPS-001 | BL-014, BL-015, BL-017 | T-015, T-017, T-020, T-022 |
| REQ-RET-001 | BR-PROJ-004, BR-RET-001, BR-RET-002 | BL-015, BL-017 | T-019, T-020 |

Deferred `FUT-*` requirements map to BL-101 through BL-105 in [Backlog](BACKLOG.md); they do not count toward MVP coverage. Assign detailed tests when their business rules and API/schema contracts are approved.

BL-004 [evidence](auth/BL-004-EVIDENCE.md): REQ-AUTH-001 / BR-TEN-001 / BR-ONB-001 → T-001 expiry, safe return and protected-handler subset only; REQ-TEN-001 / BR-TEN-001 → T-002 membership scoping and forged input denial on implemented handlers, plus foundation repository/FKs; REQ-ONB-001 / BR-ONB-001 / BR-ENT-001 → T-003 PostgreSQL repeat/concurrency/failure/retry/no-renewal subset. No full named acceptance passed: provider proof, durable logout/recovery, future project HTTP matrix and authenticated browser retry remain open. No project creation/quota enforcement or operator endpoint was added.

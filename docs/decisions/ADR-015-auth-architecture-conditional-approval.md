# ADR-015: conditional authentication architecture approval and pilot acquisition

Date: 19 October 2026 (Asia/Makassar). Status: **APPROVED WITH EXPLICIT CONDITIONS — architecture direction only**. DEC-001 remains **OPEN/PARTIALLY VALIDATED** under its unchanged closure criteria. This record supplements ADR-004/006 and ADR-009–014; it supersedes their unapproved-provider-direction status only, not historical evidence, runtime restrictions or incomplete acceptance gates.

## Context and authority

The [closure audit](../auth/DEC-001-CLOSURE-AUDIT-2026-10-19.md) separates architecture selection, MVP completion and production release. The [approval package](../auth/DEC-001-ARCHITECTURE-APPROVAL-2026-10-19.md) correlates the actual worktree to its 49-file snapshot, compares alternatives, refreshes bounded official maintenance evidence and assigns remaining work.

During this task the product owner explicitly selected “Setuju bersyarat: Better Auth + PostgreSQL; seluruh gate tetap berlaku” in response to a question retaining DEC-001 OPEN until all criteria are met and excluding deployment/paid services. The owner also selected “Pilot invitation-only; registrasi publik tetap sebagai lingkup lanjutan”. On other choices the owner requested the engineer's recommendations for convenience. This is authority to record these two decisions and safe proposals; it is not a named credential custodian, budget, provider connection or explicit residual-risk acceptance.

## Decision

1. Select **Better Auth with PostgreSQL-backed persistent sessions** as the conditional Snappik architecture. Retain application identity/tenant/permission isolation, authoritative server checks, fixed expiry, durable revocation, atomic reset/version, challenge lifecycle, encrypted delivery outbox and shared PG admission. No raw library API may bypass those guards.
2. Use **invitation-only acquisition of studio owners for the initial pilot**. Public registration remains later owner-acquisition scope. This does not authorize staff invitations, multiple owner memberships, operator roles from invitations or gallery-client accounts. Invitations and verified acquisition are not implemented by this record.
3. Keep **Auth0 with shared stateful sessions as managed fallback**, and Supabase as a conditional platform alternative. Reconsider if credential operations cannot be staffed, the funded target cannot support the runtime/PG/fence, or a maintained release cannot preserve required invariants.
4. Retain the clean recovery link plus separately entered high-entropy code as the integration candidate; actual delivery/device/usability acceptance remains required. Do not restore bearer URLs or reduce code entropy for convenience without new evidence.
5. Keep **all DEC-001 closure requirements C01–C23 and all release/backlog gates**. In particular signed external callback, real delivery, operator recovery, cost/configuration, maintenance and restore evidence are not waived. No credential-only OAuth exception is approved.

## Alternatives and consequences

Remaining unconfigured is the safe fail-closed baseline but does not satisfy owner authentication. Better Auth reuses the demonstrated Next/PG stack and gives Snappik authoritative session control, at the cost of owning hashing policy, patching, mail, abuse controls, native schema/hooks, keys, backups and incidents. Auth0 shifts credential-service operation to a managed service but adds tenant/plan/SDK/availability dependencies and still needs app permission/revocation guarantees. Supabase may fit a separately chosen platform; its session/linking semantics need explicit reconciliation. No managed provider is installed or verified here; historical pricing is not a current quote. Full comparison and official references are in the approval package.

The installed Better Auth 1.7.9 is not approved as a production pin. On 19 October the official latest stable tag is 1.7.11 and upstream supports only the latest version. No upgrade or1.7.11 runtime verification occurred. A bounded three-advisory review does not replace full-lock qualification. Official Next/PG documentation supports the direction, not exact target-host acceptance.

R04 copied signed TOTP proof retains targeted cancellation authority over its linked session, even after proof expiry. This is availability impact, not authentication authority. **No release risk acceptance has been granted.** Engineering/security must propose evidenced mitigation or a bounded acceptance decision. DB outages, proxy/fairness, secret custody, older-backup restoration, production logging and resource/load risks also retain the audit's severity and gates.

## Conditions, owners and status

- Product owner: name credential patch/secret/incident custodian and operator recovery authority; set monthly cap/currency and region constraints; approve a complete compatible target quote through DEC-003. No invented names or funded plan.
- BL-003: wire existing security suites/smokes into CI, prepare reviewed roles/artifact/secret/schema/rotation/restore paths. Local CI preparation is independent of DEC-001 closure.
- BL-001: qualify maintained version/full lock and complete real capability evidence; BL-004: invitation acceptance/verification, sender/owner integration, protected journeys and required callbacks. Real external access needs separate authorization.
- BL-014: controlled operator bootstrap/lost-factor process and actual authenticator/recovery drill. BL-015/DEC-006: privacy/deletion/processor/logging policy. BL-016: current security/device/UX and explicit residual-risk disposition. BL-017: target load/rotation/restore/failover and release acceptance.

**Architecture direction is approved conditionally; DEC-001 stays OPEN/PARTIALLY VALIDATED; BL-001/003/004 stay In progress; BL-014/015/016/017 stay Todo.** Approval changes neither the closure boundary nor a backlog completion status. No commits, dependency changes, external sending/accounts, paid provisioning, database modifications or deployment are authorized by this decision.

Affected current documents: [register](README.md), [PRD](../PRD.md), [backlog](../BACKLOG.md), [architecture](../ARCHITECTURE.md), [security](../SECURITY.md), [deployment](../DEPLOYMENT.md), [session contract](../auth/SESSION_CONTRACT.md), [traceability](../TRACEABILITY.md), [project state](../agents/PROJECT_STATE.md) and [active handoff](../agents/handoff-2026-10-19-DEC-001-approval.md). API/SQL/code semantics are unchanged; future invitation wire/persistence design remains a focused implementation task. Reconsideration or a criterion waiver requires an explicit subsequent decision, not this ADR's existence.

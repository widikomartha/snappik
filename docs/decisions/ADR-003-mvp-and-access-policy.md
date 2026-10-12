# ADR-003: a focused pilot and independent access states

Date: 13 October 2026 · Status: baseline.

## Context

Fastpik exposes many workflows and integrations, but the primary value is exact client selection and studio handoff. Reproducing all features before verifying that core would increase cost and obscure failure diagnosis. Subscription, link expiry and confirmation serve different purposes.

## Decision

MVP includes studio owners, main selection, notes, confirmation/reopen, individual download, status tracking and minimal operator tools. Use an invitation-only pilot with seven-day/three-project trial and audited manual grants; no paid checkout claims. Staff, extras, print, batch, ZIP, messages, CRM and domains follow in later phases.

Model entitlement, project archive/suspension, per-menu access/deadline and selection state separately. On entitlement expiry, owner read/export and revocation/archive remain available; existing client workflows follow their own deadlines. Suspension denies operational/client access. Confirmed choices are locked until explicit owner reopen.

Contacts are optional in MVP. Public links use a random token independent of studio slug. Password/expiry gates do not change external Drive sharing permissions. Initial scale ceilings are explicit, not marketed as unlimited.

## Consequences

The pilot is smaller than the competitor and has a clear definition of done. It requires explicit documentation of expired-versus-suspended behavior. Later commercial policy can supersede this ADR, but migration and UI notice must be designed before changing live access expectations.

Affected documents: [PRD](../PRD.md), [Business rules](../BUSINESS_RULES.md), [Backlog](../BACKLOG.md), [Security](../SECURITY.md).

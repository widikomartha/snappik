# ADR-007: DEC-002 source access and studio credentials

Date: 18 October 2026 (Asia/Makassar). Status: **conditional recommendation; DEC-002 OPEN / PARTIALLY VALIDATED**. Supplements the DEC-002 portion of [ADR-005](ADR-005-drive-hosting-feasibility.md); preserves its historical evidence and leaves DEC-003 unchanged. This is not an approved production provider decision.

## Context and minimum capabilities

Inspected clean local `master` / `10d4d1d48ad18c3b3f31ddb987e8dc13a100d542`. The web/worker/PostgreSQL foundation now exists, unlike at ADR-005's original inspection. Drive remains unconfigured in `src/adapters/providers.ts`; configuration rejects other modes. User confirmed in this chat that dedicated synthetic Drive assets/configuration are unavailable and requested research/documentation. No account, credential store or live API was accessed.

REQ-DRIVE-001 / BR-DRIVE-001 through BR-DRIVE-004 require bounded complete inventory, stable provider IDs, original names/paths and failure preservation (BL-002 → BL-007, T-005). REQ-DL-001 / BR-DL-001 requires independent download authorization and bounded original delivery (BL-013, T-013). REQ-REL-001 / BR-REL-002 adds retry/recovery implications (T-017). ADR-001/002/003 continue to own process boundaries, identity/history and independent grants. PRD, Business Rules, API, Database and Security remain the owning contracts.

Minimum acceptance: metadata, every authorized page/subfolder, eligible blob bytes and fresh download capability; root/child resource keys; deterministic denial/reconnect on permission loss; source-ID/subtree validation; provider quota/caching evidence; studio-scoped durable credentials/revocation. Preserve the 5,000-image, depth-10 and 50 MiB application limits. A listing 200 or a successful browser link alone meets none of the complete-source requirements.

## Evaluation and recommendation

Criteria in priority order: private-source safety and tenant isolation; subtree completeness/read-only operation; durable worker access and revocation; consent/verification burden; MVP operational simplicity; future tenant growth. No numeric score can compensate for a missing mandatory capability.

| Alternative | Fit and trade-off | Disposition |
|---|---|---|
| Baseline: leave Drive unconfigured, retain offline adapter | Smallest safe current state; cannot ingest a real project | Keep until evidence and approvals exist |
| Public link + server API key | Low consent/token burden; anonymous public data only. Existing public-source exposure survives Snappik passwords. Listing/discovery and keyed descendants remain unproved | Conditional fallback for an explicitly accepted public-only pilot; never make a private folder public |
| Studio OAuth, `drive.readonly` | Reads/downloads the account's accessible files without write scope; supports private-source direction. Authority exceeds the chosen root; application must enforce root scope. Restricted-scope review/security assessment and refresh-token operations are material burdens | **Preferred conditional model** for private My Drive and directly shared My Drive sources, after the provider matrix and scope/policy approval |
| Studio OAuth, Picker + `drive.file` | Narrower per-file grants, but permits modifications to granted files and does not establish whole existing/new subtree access. Selecting a folder is not evidence that every child was granted | First scope-minimization experiment; replace the preferred scope only if it meets the unchanged folder contract. No automatic scope escalation |
| Metadata-only OAuth / app-data scopes | Cannot supply the required original photo bytes for gallery derivation/download | Insufficient alone |
| Dedicated service identity with explicit folder sharing | Can restrict accessible objects through Drive sharing; no user refresh token. Per-studio identity lifecycle, domain sharing restrictions and isolation/rotation add operations | Provider-supported alternative for a separately approved managed pilot, not selected for self-service SaaS. No shared cross-tenant service identity or domain-wide delegation |
| Browser cookies, HTML/confirmation-page scraping, source-URL proxy | Undocumented transport and unsafe scope/credential handling | Rejected |

This prioritizes private sources over ADR-005's public-first validation sequence; it does not establish that either model works. The first small public/private experiment still isolates anonymous listing feasibility. If OAuth review/budget or public-only product approval is unavailable, the fallback is the unconfigured baseline, not another identity after a denial. Shared Drives need separate fixtures and remain unsupported until validated; a shared My Drive folder is a different case.

## Credential and source design

Candidate lifecycle and paired API/persistence changes are in the [adapter contract](../drive/ADAPTER_CONTRACT.md). Studio owners explicitly connect Drive separately from login, confirm the Google principal and requested scopes, and bind a validated root to that studio's connection. Store encrypted server-side credentials through a managed key/secret boundary; jobs carry references and connection versions, never tokens. Root confinement is enforced on every operation; broad OAuth authority is not gallery authority.

Local disconnect first disables the connection, fences jobs/publication and denies new media/cache reads. Provider revocation has separately tracked completion and propagation; do not claim success when Google is unavailable. Revocation can affect all clients/scopes for the user under the same Google Cloud project: prefer a separate Drive project from login and verify the boundary before integration. Reconnect cannot silently switch principal or reactivate old jobs. Already delivered bytes cannot be recalled.

Observed documentation adds a critical completeness check: folder metadata can remain visible while `capabilities.canListChildren=false` and listing returns empty. Require that capability and reject unknown/denied traversal before publication. Current offline descriptors request only `canDownload`; they do not implement this safeguard. Missing capability is unresolved, not an empty-folder success. Hidden descendants still prevent a proof of all physical contents.

## Consequences, responsibilities and exclusions

The team owns token encryption/rotation, refresh single-flight, current connection checks, bounded per-project/per-credential budgets, reconnect UX, private cache invalidation and deletion reconciliation. Google verification eligibility/assessment cost, actual assigned quotas and total operating budget are unknown. Current official public quota/pricing observations are recorded with dates in [evidence](../drive/DEC-002-EVIDENCE-2026-10-18.md); no spending/provisioning is approved.

Proposed acceptance excludes unvalidated Shared Drives, limited-access folders without child-list capability, shortcut roots/shortcut traversal, non-folder roots, domain-only access without a verified authorized principal, native documents/exports, encrypted or policy-blocked/non-downloadable blobs and unsupported image types. Accessible ordinary subfolders are candidates, not yet supported production modes. Existing unsupported/trashed/oversized image skip counts remain; unreadable folders fail the scan rather than being skipped as complete. No permission/abuse bypass, `acknowledgeAbuse` workaround or alternate principal retry.

User-owned gates: dedicated test assets and permission changes; acceptance of broad consent or public-source exposure; Google application/account ownership; verification/security-review procurement and budget; explicit client-photo sharing/disclosures and legal cache/retention review. Routine engineering choices are the server reference model, revision fencing, fixed provider endpoints, error classification and bounded traversal. Brand decisions are outside DEC-002.

## Closure and reconsideration

All closure rows in the [evidence record](../drive/DEC-002-EVIDENCE-2026-10-18.md) need concrete evidence appropriate to that criterion: direct provider outcomes for access behavior, documented credential/security/unsupported-case contracts and applicable approvals. None has new live evidence today. Keep BL-002 In progress and BL-007 Todo; T-005/T-013 remain incomplete. The prior 29 synthetic checks are retained, not repeated or relabeled provider proof. Decision closure would not by itself complete production implementation or its acceptance tests.

Reconsider if `drive.file` proves whole-subtree sufficiency, private-source scope is rejected, a source type cannot satisfy visibility/revocation, cache policy cannot support the product, or quota/tenant operations change materially. A narrower supported-mode decision requires explicit product agreement and a new recorded disposition, not deleting an untested closure row.

Affected documents: decision register, Architecture, API, Database, Security, Test Plan, Backlog, adapter contract, evidence, Project state and handoff. No production routes, migration, dependency, PRD scope or Business Rules behavior changed.

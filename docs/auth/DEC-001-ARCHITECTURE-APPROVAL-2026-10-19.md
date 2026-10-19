# DEC-001 architecture approval package — 19 October 2026

Status: **architecture direction APPROVED WITH EXPLICIT CONDITIONS by the product owner in this chat; DEC-001 remains OPEN/PARTIALLY VALIDATED**. [ADR-015](../decisions/ADR-015-auth-architecture-conditional-approval.md) records the actual approval. This package separates the approved direction from incomplete feasibility, MVP acceptance and release. No deployment, dependency upgrade, external connection or spending authorization follows from it.

## Recommendation and approval scope

Use **Better Auth with PostgreSQL-backed persistent sessions**, retaining Snappik's server/data-boundary guards, immutable identity mapping, explicit linking boundary and reviewed migrations. Preserve fixed session expiry, immediate authoritative revocation, atomic reset/security-version invalidation, durable recovery outbox, challenge lifecycle and shared admission. Do not replace those controls with raw library endpoints or cookie-presence checks.

This is the smallest demonstrated fit with the existing Node/Next modular monolith and PostgreSQL. It avoids adding another identity platform while keeping studio membership and operator authority in Snappik. This is an engineering fit assessment, not a claim that self-hosting is cheaper or operationally easier. Snappik must own credentials, patching, delivery, incident response and restore safety. The approved direction is a maintained Better Auth release after qualification; it does **not** certify the installed 1.7.9 pin or the untested latest release.

Keep Auth0 with a shared stateful session store as the managed fallback if Snappik cannot resource credential operations or the chosen target fails the constraints below. Reconsider Supabase when its platform is selected independently and linking/revocation semantics can be reconciled. No alternative has a verified hosted implementation here.

### Approval actually received

The product owner explicitly answered:

- “Setuju bersyarat: Better Auth + PostgreSQL; seluruh gate tetap berlaku”. The question expressly excluded deployment/paid services and retained DEC-001 OPEN until every criterion is met.
- “Pilot invitation-only; registrasi publik tetap sebagai lingkup lanjutan”. This concerns acquisition of studio owners, **not** staff/team invitations or gallery-client accounts.
- For recovery UX, residual risk, custody, hosting and provider gates: “menurut rekomendasi mu yang memudahkan ku”. This delegates preparation of safe recommendations. It supplies no named custodian, budget, provider account or explicit acceptance of the residual security risk.

Consequently the clean-link/manual-code design is retained for integration and usability testing; residual forced-logout risk is **not accepted for release**; all inherited provider criteria remain. Unknown human assignments and spending constraints stay pending. No unanswered choice is silently treated as permission.

## Evidence supporting selection, and its limits

Actual startup: main / `2fb68df`,32 dirty paths inherited from the TOTP increment and closure audit. Read-only comparison confirms **49/49 source/configuration/migration/test files match** the [audit snapshot](DEC-001-CLOSURE-SNAPSHOT-2026-10-19.json). The [closure audit](DEC-001-CLOSURE-AUDIT-2026-10-19.md) owns C01–C23, R01–R13 and E0–E8. Historical execution reports were source-correlated, not rerun in this documentation task.

| Evidence classification | Verified outcome / supporting records | Limit on the inference |
|---|---|---|
| VERIFIED local source + historical actual PostgreSQL/HTTP observations | [Latest TOTP evidence](DEC-001-TOTP-EVIDENCE-2026-10-19.md):50/50 combined auth/recovery/admission/TOTP tests, two built Next processes, lost logout acknowledgement and process/DB restarts. [Hardening](DEC-001-EVIDENCE-2026-10-19.md) proves copied-cookie denial and database-failure response correctness | Isolated PG 18.4, synthetic identities, Better Auth 1.7.9, loopback Next 16.4.1/Node 24.18. No hosted, latest-version or current CI execution proof |
| VERIFIED local identity and recovery invariants | Reviewed account-pair uniqueness, fail-stop populated duplicates; [recovery](DEC-001-RECOVERY-EVIDENCE-2026-10-19.md) atomic token/password/version/session transaction and encrypted bounded-retry outbox; [admission](DEC-001-ADMISSION-EVIDENCE-2026-10-19.md) concurrent persistent budgets | No real issuer/subject callback validation, external delivery, sender scheduler or target-host throughput evidence |
| PARTIALLY VERIFIED browser/UX | [Clean handoff](DEC-001-HANDOFF-EVIDENCE-2026-10-19.md): link contains no bearer proof; separate 43-character code, expiry/replay checks, bounded history probe and same-profile separate tabs. [Onboarding](BL-004-EVIDENCE.md):27 PG foundation/onboarding checks | No physical cross-device, real inbox/scanner, current TOTP cancellation journey or full accessibility/device acceptance. Old fragment history remains exposed historically |
| VERIFIED local permission boundary | Same-session/version TOTP age <15 minutes plus independent current operator permission; pending challenge never grants business access. Lifecycle receipts prevent completion after acknowledged cancellation | No operational enrollment/bootstrap/lost-factor drill or actual operator business feature acceptance |
| VERIFIED current official publication; PARTIALLY VERIFIED applicability | Maintenance/compatibility/advisory ledger below, compared with current root lock and runtime plugin construction | Three selected advisories are not a complete dependency audit, penetration test or proof that any version is production safe |
| NOT VERIFIED / BLOCKED externally | Actual auth remains unconfigured by default; opt-in mode requires loopback origin and DB. Public signup/callback/linking/management routes remain closed | Real acquisition/verification, sender, IdP, HTTPS, target funding/roles/hash/load/rotation/restore and cost/terms approval remain gates |

### Alternatives, baseline and constraints

This comparison uses the recorded [ADR-004](../decisions/ADR-004-auth-session-feasibility.md)/[ADR-006](../decisions/ADR-006-auth-session-postgres-validation.md) research, dated15/18 October, and the verified local evidence above. Managed plan features and prices have **not** been refreshed for procurement. Do not quote their historical dollar figures as current offers.

| Option | Why select or retain it | Trade-off / rejection or reconsideration condition |
|---|---|---|
| Baseline: auth unavailable | Existing fail-closed default while missing gates remain; no new external dependency | Cannot deliver REQ-AUTH-001. Keep as operational safety state, not a completed MVP |
| **Better Auth + PG sessions** | Actual Next/PG integration and application invariants demonstrated; reuse existing infrastructure; credentials/session data under Snappik control; no new IdP service | Snappik owns native-schema/hook compatibility, hashing resources, patching, mail, abuse controls, backups and incident response. PG/fence adds availability and throughput constraints. MIT package metadata is not a complete license/DPA/TCO review |
| **Auth0 + shared stateful sessions** | Recorded managed identity/MFA/recovery option; reduces direct credential-service operation | Tenant, SDK, plan entitlements, redirects and service availability become dependencies. App tenant/permission/authoritative revocation checks still required. Validate supported MFA/linking plan and quote before switching; no tested fallback account exists |
| Supabase Auth | Recorded SSR/MFA option; credible if the broader platform is independently selected | JWT validity alone does not give immediate copied-cookie revocation; session-state checks and explicit linking policy need proof. Extra platform dependency if app PG stays elsewhere; plan constraints and costs unverified for procurement |

Minimum constraints for the approved direction: Node-capable Next route/server runtime, authoritative reachable PostgreSQL primary and reviewed pooling (app pool needs at least2 connections for current hooks), canonical HTTPS origin, server-only stable namespace/keys, funded sender and credential operations. Edge-only execution is not an assumed fit. No Redis/new IdP/team-role infrastructure is justified by current evidence. Scaling beyond the pilot requires measurement of the shared credential fence, hashing and pool budgets, not an assumption that local two-process tests prove distributed production capacity.

## Owner choices, safe defaults and pending authority

Labels D01–D07 are approval-package questions, not new decision/backlog IDs.

| Choice | Options and recommended consequence | Actual disposition / remaining authority |
|---|---|---|
| D01 Conditional architecture | Approve Better Auth+PG direction; defer; or request managed Auth0 evaluation first. Preferred direction retains all safeguards and qualification gates | **APPROVED direction only** by product owner. Current broad DEC-001 closure contract is unchanged. Record in ADR-015; no item Done |
| D02 Owner acquisition | Invitation-only pilot bounds abuse/support; public signup increases acquisition reach and verification/abuse obligations. Recommend controlled pilot | **APPROVED invitation-only pilot**; public registration remains later scope within BL-004. No staff invitations, public signup or provider organization plugin automatically added |
| D03 Recovery UX | Clean link plus separately pasted43-character single-use code avoids generated bearer navigation URLs and supports transfer to another device; adds copy/paste friction. Reject a shorter PIN or restored token URLs without new threat analysis | Retain ADR-012 as delegated safe direction. **Final production usability/security acceptance pending** BL-016; test actual sender/device/screen reader. Inbox, clipboard, DOM and POST still carry authority |
| D04 Residual forced logout | A stolen signed pending proof can cancel only its resulting live session, including after proof expiry. It cannot authenticate or remove independent sessions. Accepting targeted availability loss needs explicit risk decision; changing cancellation may weaken lost-response safety | Recommend **no release acceptance yet**. BL-016 reviewer proposes bounded disposition/mitigation with regression evidence, then owner accepts or requires mitigation. No open-ended implementation authorized here |
| D05 Credential/operator custody | Snappik must nominate a patch/incident/secret custodian and an operator bootstrap/lost-factor authority; managed Auth0 fallback if this cannot be staffed. Avoid unreviewed self-service recovery or email-domain authority | **PENDING actual names/coverage**. Product owner assigns; BL-003 documents credential operations, BL-014 controlled recovery. Engineering can prepare runbooks but cannot invent identity-proofing authority |
| D06 Hosting and budget | Keep DEC-003's conditional Render Singapore Node web/worker/PG 18 + private S3 as planning candidate, Railway fallback. Approve monthly cap/currency, location/residency and complete quote before purchase; no free-production assumption | **PENDING owner cap/region/target**. No plan selected/funded. BL-003/DEC-003 assemble quote including DB/backups/mail/storage/egress/operations; BL-017 proves target. No paid service authorization inferred |
| D07 External validation | Retain signed callback/claim-negative proof, actual verification/recovery delivery and operator authenticator/recovery evidence. Credential-only production could defer OAuth only through a separately explicit criterion change | **All inherited gates retained**, no credential-only exception. BL-001/004 need dedicated synthetic IdP/inbox/HTTPS target and explicit connection authorization; BL-014 needs a named recovery owner. User may later propose a formal exception; none exists now |

### Architectural risks requiring deliberate disposition

The approval accepts the **direction and its future operational obligations**, not the unresolved release risks. Keep the full [R01–R13 register](DEC-001-CLOSURE-AUDIT-2026-10-19.md). In particular:

- PG or credential-fence failure closes access; failed logout must return 503/retry rather than pretend revocation. Before a successful commit, a copied old session may remain usable after DB recovery. No process can retract an already authorized response. Hosted uncertain COMMIT/failover remains untested.
- R04 targeted forced logout remains a Medium availability risk requiring explicit release disposition. Possession of the signed proof is necessary; no factor or permission bypass was demonstrated.
- Current global/network fallback and serialized proof work can couple unrelated users. Proxy headers are deliberately ignored. Authentication admission is not perimeter DDoS protection; target identity/fairness/timing/load remains unverified.
- Secret compromise or restoring an older DB can resurrect authority without coherent revocation/deletion reconciliation. No production rotation/restore drill exists. Keep these High-impact release gates.
- Bare Better Auth defaults were insufficient for demonstrated logout/uniqueness/challenge issues. Maintaining Snappik wrappers, reviewed migrations and upstream qualification is part of selecting this architecture. A switch to a managed provider does not waive app permission/tenant checks.

## Fresh official maintenance and compatibility check

Access date for **every source below: 19 October 2026**. These are read-only official public pages, not account/provider integration. Release/advisory publication dates are separately shown. Initial search cache showed1.7.10; the directly opened official latest release/tag page showed1.7.11, so the direct page governs this dated observation. Recheck at execution because releases can change.

| Official source | Publication / observed fact | Applicability and limitation |
|---|---|---|
| [Latest release/tag 1.7.11](https://github.com/better-auth/better-auth/releases/tag/v1.7.11), [release index](https://github.com/better-auth/better-auth/releases) | Released 19 October 00:39, marked Latest. Notes include PG int8 migration-diff and DB-limiter Retry-After fixes, and Twitch/Paybin token validation corrections | Root lock/runtime remains 1.7.9. No1.7.11 install/test performed. Twitch/Paybin/social providers absent from current runtime; release notes alone do not establish a Snappik exploit. Review schema/hook/limiter behavior before a coordinated upgrade |
| [Security support policy](https://github.com/better-auth/better-auth/security/policy) | Current page supports only the latest version; older versions unsupported | Installed1.7.9 is not the current supported production candidate. C19 is only partly advanced: latest candidate identified, qualification/full-lock review still missing. No automatic floating dependency upgrade |
| [Next.js integration](https://better-auth.com/docs/integrations/next) | Documents route handlers, server session lookup and Node-capable Next 16+ proxy; warns cookie-presence checks do not secure routes | Consistent with current Request/Response integration. Do not expose raw handler around Snappik allowlists. Not exact-version or target-host certification; current local evidence uses1.7.9/Next 16.4.1 |
| [Installation](https://better-auth.com/docs/installation) | Documents PostgreSQL support, built-in Kysely migration tooling and high-entropy server secret | Supports design fit, not target pooler/TLS/grants proof. Do not run a floating migration generator against existing data |
| [GHSA-965c-763c-88jm](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm) | Critical, published 30 September; affected >=1.4.0-beta.18,<1.7.7; patched 1.7.7. Magic Link/OAuth state confusion | Current 1.7.9 outside published affected range; no runtime Magic Link/social configuration. No vulnerability reproduced here. Reassess before enabling new plugins |
| [GHSA-44jh-23m7-hpcf](https://github.com/better-auth/better-auth/security/advisories/GHSA-44jh-23m7-hpcf) | Low, 30 September; PG concurrent limiter defect. Kysely adapter fixed 1.7.0; Drizzle/bundled affected ranges fixed 1.7.7 | Root Better Auth/core/Kysely/Drizzle adapter lock entries1.7.9, outside stated ranges. Runtime uses Kysely and custom atomic PG admission; installed Drizzle package is not evidence it is enabled. ORM kysely 0.29.6 is a different package/version |
| [GHSA-r4xp-prcw-77qf](https://github.com/better-auth/better-auth/security/advisories/GHSA-r4xp-prcw-77qf) | High, 30 September; affected >=1.5.0-beta.12,<1.7.7; patched 1.7.7. OAuth Proxy secret/state/implicit-linking combination | Current 1.7.9 outside range; no OAuth Proxy runtime and implicit linking disabled. Not a substitute for future signed callback proof |

Only these relevant advisories were examined in depth; the [advisory index](https://github.com/better-auth/better-auth/security/advisories) is not an exhaustive package-lock audit. Root Better Auth release-family packages are 1.7.9; utils 0.5.0 is separately versioned. No claim about all transitive vulnerabilities, latest managed SDKs, current managed-plan prices/entitlements, licenses or contract acceptance. The earlier closure audit's failed refresh remains an accurate historical report; this is its successful bounded follow-up.

## Three milestones and complete gate preservation

| Milestone | Decision now / remaining blocker | Owner |
|---|---|---|
| Architecture selection | Direction approved conditionally. D05 credential ownership and D06 funded compatible assumptions must be resolved before real rollout; current-version qualification may trigger reconsideration. Missing callback/sender tests are not evidence the direction is infeasible, but remain closure obligations | Product owner + architecture/security reviewer; BL-001, DEC-003 |
| MVP implementation | Actual invitation acceptance and verified owner acquisition, delivery/login/reset/return UX, required callback capability proof, operator recovery and protected boundaries incomplete. Fixture accounts do not count | BL-004 integration, BL-001 feasibility, BL-014 operator |
| Production release | Target/terms/budget, maintained pin, all security CI/device checks, authenticated network/fairness, HTTPS/roles/secrets/hash/load, real sender scheduling, rotation/restore/uncertain commits and risk acceptance incomplete | BL-003/015/016/017, DEC-003/006; owner release approval |

All 23 audit criteria remain: C01 approved direction/remaining terms; C02 target; C03 identity/linking; C04 signed callback; C05 owner journey; C06 session/cookie/CSRF; C07 logout; C08 reset; C09 delivery; C10 handoff UX; C11 operator assurance; C12 operator recovery; C13 challenge lifecycle; C14 residual cancellation risk; C15 admission; C16 network/fairness; C17 configuration; C18 rotation/restore; C19 maintenance/hash; C20 costs/terms; C21 deletion/exit; C22 CI/release; C23 upstream logout applicability. The audit's exact outcomes and environments remain authoritative; C01 has this new approval evidence, C05 this acquisition choice, C19 the bounded publication check. None becomes fully VERIFIED solely from approval.

**DEC-001 stays OPEN/PARTIALLY VALIDATED even after this approval.** Architecture-direction field: APPROVED WITH EXPLICIT CONDITIONS (ADR-015). Full decision closure still requires every applicable register criterion. BL-001/003/004 remain In progress; BL-014/015/016/017 remain Todo. Changing the closure boundary or deferring callback requires a future explicit superseding decision; this approval makes neither change.

## Dependency-aware execution plan

No new backlog ID is needed. Plans below do not authorize implementation in this documentation task.

| Priority / package | Exact next deliverable and acceptance | Dependency / independence |
|---|---|---|
| 1 — BL-003 security CI | Wire existing auth/recovery/admission/TOTP/browser-contract suites plus auth/admission HTTP smokes into CI. Preserve native limits; isolate PG/ports, bound timeouts, reuse built artifact, retain default smoke/docs. Record clean-run source/schema/config identity and actual results; hosted CI execution remains separately observed | Can proceed locally before DEC-001 closure or external credentials; keep current pin for this baseline, no hidden upgrade. Current workflow runs check/default smoke/docs only |
| 2A — BL-001 maintained-version qualification | Full-lock/advisory/license applicability review; controlled candidate upgrade from1.7.9 to maintained stable (1.7.11 at this check), generated-schema diff review without unknown-DB mutation, existing fault/race/browser regression evidence; reconsider if wrappers break | After CI baseline; bounded separately authorized change. Do not call candidate supported/tested based only on release notes |
| 2B — BL-004 owner acquisition | Design then implement pilot owner invitations/acceptance+verification, no staff/role UI, no automatic email linking. Integrate sender and login/recovery with restart/retry/expiry/denial tests and full T-001/003 contract | Contract/synthetic work independent of paid accounts; actual sending needs approved test sender/inbox/connection. Production mode requires funded target and explicit implementation scope |
| 2C — BL-001 remaining feasibility / BL-004 integration | Bounded approved signed callback/error/replay/claim-negative proof and real verification/recovery delivery; reconcile identity uniqueness, return paths and MFA assurance | Dedicated synthetic IdP/inbox/HTTPS access approval required. No external account use authorized by D01. Do not duplicate already proven local revocation/reset/admission |
| 2D — BL-003/DEC-003 + BL-014 | Owner supplies budget/location/custodians; infrastructure prepares complete target quote/roles/secret/artifact plan; operator owner prepares controlled bootstrap/lost-factor recovery and actual authenticator drill | Runbook preparation can overlap local CI/BL-004. Actual ops mutations retain BL-004/006 dependencies; no credentials or operator authority guessed |
| 3 — BL-015/DEC-006 and BL-016 | Processor/logging/deletion/retention review; current owner/TOTP recovery ID/EN/device/accessibility acceptance; explicit R04 and enumeration/fairness disposition. No raw provider deletion API assumed | Consume approved integration; early test/contract preparation independent. BL-016 full completion retains BL-009–015 dependencies; risk review is a subtask, not promotion to Done |
| 4 — BL-017 | Actual approved target TLS/Linux/roles/network/hash/pool/load, sender scheduler/health, uncertain-commit and coordinated key/policy rotation, restore with newer revocations/deletions; T-020/022 and release checklist | Retains BL-015/016 and DEC-001/002/003/006 closure dependencies. Conditional architecture approval is never release permission |

Traceability retained: REQ-AUTH-001 / BR-TEN-001 / BR-ONB-001 / T-001; REQ-TEN-001/REQ-ONB-001 / T-002/003; REQ-OPS-001 / BR-OPS-001 / T-015; REQ-UX-001 / T-016; REQ-REL-001 / BR-REL-001/002; REQ-PRIV-001/REQ-RET-001 / BL-015/016/017 / T-018/019/020/022. See the audit crosswalk for every inherited ADR/register clause. No PRD release criterion is removed.

## Verification for this package

Executed: actual Git/source/lock/CI inspection, snapshot comparison49/49 unchanged, official public-page review and recording of owner answers. No runtime implementation was changed. Existing application/PG/browser tests, typecheck/build and hosted CI are **Not run** here because this is documentation/decision work; historical Passed results above are explicitly dated. Full-lock audit, target quote, real provider/sender and production verification are still missing, not failed tests.

Final documentation/diff/source-preservation commands and actual outcomes are recorded in the [active approval handoff](../agents/handoff-2026-10-19-DEC-001-approval.md). No commit/push/deploy/install/provider/DB action. No historical ADR is rewritten; ADR-015 records only the newly authorized decision.

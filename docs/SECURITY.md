# Security and privacy design

Status: implementation controls and verification plan, not a security certification or legal opinion. Requirements: REQ-TEN-001, REQ-ACCESS-001, REQ-PRIV-001, REQ-RET-001 and REQ-OPS-001.

BL-003 foundation/BL-004 app-side setup remain; [19 October hardening](auth/DEC-001-EVIDENCE-2026-10-19.md) adds an explicit loopback-only Better Auth credential/TOTP adapter. Default mode still returns 503; no fixture-login HTTP bypass exists. Signed cookie + durable metadata/current version/expiry/verification is checked server-side and under the same user lock as onboarding transactions. Logout storage uncertainty returns 503/no cookie clearing; successful durable revocation denies copied cookies even if native deletion fails. Reviewed auth migrations enforce provider/subject uniqueness and fail safely on existing duplicates. Auth role SQL was probed, not deployed. Operator permission plus recent same-session TOTP is enforced by an internal guard; no ops business/enrollment/recovery API. External callback, delivery/all-device reset, shared throttles, rotation/restore, actual HTTPS/host/role proof remain DEC-001 gates. Drive/dispatcher unchanged; compile-time principals are not provider proof. [ADR-009](decisions/ADR-009-auth-local-hardening.md) records limits, including already authorized in-flight responses and copied pending challenge revocation not yet tested.

Runtime DB access is trusted service access with repository tenant predicates, not per-user credentials or RLS. [Foundation grants](../src/db/runtime-grants.sql) were tested with a non-owner/non-superuser role: permitted reads/locks/queue writes, denied DDL, membership identity edits, operator self-grants and history edits. They are not automatically applied and do not provision a deployed role. Local example credentials use a dedicated loopback synthetic cluster owner only for convenience. Shared runtime must use a separate constrained role, never MIGRATION_DATABASE_URL; future business/auth grants require review. Initial immutable audit delete trigger has no general bypass; retention cleanup is deferred.

## Trust boundaries

[ADR-011](decisions/ADR-011-browser-recovery-boundary.md) browser follow-up: strict acknowledgement prevents HTML200 false success; new handoffs clear uncontrolled fields to prevent email/password value reuse. Fragment capture is parser-time plus hashchange, with one-shot memory and focused ID/EN error states; no persistent token state is introduced. **Observed unresolved limitation:** global browser history retained original fragment URLs after replaceState. Visible URL cleaning is not history/sync erasure. Keep the production handoff threat model/protocol gate open; do not clear user history or assert confidentiality from passing local UI tests. [Evidence](auth/DEC-001-BROWSER-EVIDENCE-2026-10-19.md) separates16 positive cases from this failed requirement.

Current recovery subset: [ADR-010](decisions/ADR-010-password-recovery-outbox.md) and [evidence](auth/DEC-001-RECOVERY-EVIDENCE-2026-10-19.md) supersede the earlier dated all-device-reset gap above for local mode only. Library hashing plus token/password/version/revocation transaction, advisory proof fence, copied TOTP challenge invalidation and encrypted outbox are tested on real PG/Next. Token lookup is SHA256; deliverable token/email only AEAD ciphertext with HKDF-separated purposes under a distinct server recovery key. Known/unknown receipt/token/outbox writes and public202/503 behavior match; this is not proof of timing resistance. Explicit same-origin JSON POST, fixed fragment destination, no token/SQL/adapter-error DTO/logging, no auto-login/MFA/role changes. Existing authorization user lock denies copied sessions after reset; acknowledged studio/trial/audit data retained. Raw library reset remains inaccessible.

Synthetic-only drain with bounded lease/retry/timeout and sanitized aggregate failure handling is implemented; no real email/scheduler. Production needs reviewed sender/body-log suppression, key custody/rotation, shared IP/global/login/MFA abuse limits, hash/load/host/restore drills and named operator recovery owner. Local auth admission is database-wide serialized, one operation per adapter with generic503 on local busy, not an availability/throughput guarantee. Initial trust-boundary and candidate statements below retain their historical date or production scope; use current evidence for actual implemented controls.

[DEC-001 follow-up](decisions/ADR-006-auth-session-postgres-validation.md), 18 October: native library PG sessions/reset/logout have bounded local evidence, with synthetic OAuth/mail. Raw logout reports success on failed deletion, and generated account schema lacks provider/subject pair uniqueness; app durable revocation, production auth constraints and independent persistent operator assurance are not implemented. Current public capability/pricing research is a conditional recommendation, not production approval. Keep raw account deletion inaccessible pending authenticated request/revocation/studio retention orchestration under DEC-006.

Browsers and provider responses are untrusted. The server owns authorization, quota, time and confirmation state. Studio membership does not grant platform permission, and a gallery grant does not grant owner permission. Background jobs execute with a recorded studio/project scope. Private storage never grants access simply because an object key is known.

The Drive link supplied by a studio must be validated through the provider adapter; it must not become a generic server-side URL fetch. Original Drive permissions are independent from Snappik. A public source link remains public outside the app.

## Permission matrix

| Action | Owner of studio | Client main grant | Client download grant | Platform operator |
|---|---|---|---|---|
| Manage studio/project config | Active entitlement | No | No | No general edit endpoint |
| Read/export own results | Yes, unless suspended | Current shared selection only | No | No by default |
| Save/confirm choices | No client-session substitution; explicit owner confirmation deferred | Yes when enabled/unexpired/unlocked | No | No |
| Reopen confirmed set | Active entitlement, reason | No | No | No |
| Read thumbnails | Own studio access | Authorized main menu | Authorized download menu | No by default |
| Download originals | Own studio through an authorized owner delivery service if added; not implicitly via gallery | No | Yes | No |
| Archive/revoke | Yes, including expired entitlement; suspension restriction applies | No | No | No general endpoint |
| Diagnose setup/jobs | Own sanitized state | No | No | `diagnostics_read` |
| Grant entitlement | No | No | No | `entitlement_write`, reason |
| Suspend/reactivate | No | No | No | `studio_suspend`, reason |

Some operator accounts can hold multiple explicit permissions. Operator UI visibility is not enforcement. Auth provider must support strong operator authentication/MFA; selecting and verifying it is DEC-001.

## Controls and abuse cases

| Threat | Required control | Verification |
|---|---|---|
| Cross-tenant ID substitution | Ownership predicate plus composite FKs; no unscoped repository methods | T-002 |
| Stale tabs bypass confirmation/quota | Project/set locks, revision checks and server validation | T-007, T-009 |
| Guessable/client link leakage | 192-bit random URL token, no indexing, no token logging; rotate/revoke | T-012 |
| Password guessing | Slow salted hash, per-project/IP throttling, short-lived scoped grant | T-012 |
| CSRF/session confusion | Secure HttpOnly SameSite cookies, origin/CSRF checks, distinct owner/gallery cookie scopes | T-001, T-012 |
| XSS through labels/notes | Plain-text rendering, contextual escaping, no HTML interpretation; CSP reviewed for selected providers | T-018 |
| SSRF and unsafe image processing | Provider ID allowlist, host/redirect restrictions, deny internal addresses; MIME/size/decode limits | T-005, T-018 |
| Shared media cache leak | Private object storage and authorized revalidated media responses | T-012 |
| Malicious CSV cell | Escape fields and neutralize spreadsheet formula prefixes in human export | T-011 |
| Operator abuse | Explicit permission, reason, transactional append-only audit; no impersonation/general DB editor | T-015 |
| Download/resource exhaustion | File/scan limits, request throttles, bounded streams, job concurrency and retry budgets | T-013, T-017 |
| Secret leakage | Managed secret injection, key rotation process, payload/log redaction | T-018 |

Initial throttles are configurable pilot defaults: gallery password attempts 5/minute per project+IP plus 50/hour per project; main mutations 60/minute per grant; downloads 20/minute per grant; source resync 5/hour per project. Return Retry-After. Shared-IP usability and distributed abuse limits require testing; thresholds are not claims of attack resistance.

Use at least Argon2id or another reviewed provider/library-supported password hashing mechanism; final parameters depend on deployed runtime and benchmark, recorded in DEC-001. Do not invent a custom cryptographic scheme. Store account passwords only with the selected auth provider.

## Data minimization and disclosure

DEC-002 remains open. [ADR-007](decisions/ADR-007-drive-source-credentials.md) and the [candidate credential lifecycle](drive/ADAPTER_CONTRACT.md) require separate Drive consent, tenant-scoped connection/root checks, encrypted managed secret references, refresh/disconnect fencing and safe reconnect. No such credential implementation is present. Never accept a connection ID as authorization, expose resource keys/tokens to clients, or fall back to a broader scope/identity after a denial. Separate Drive/login Google projects are proposed because provider revocation can invalidate the user's scopes across clients within one project; this isolation is untested.

Metadata-visible folders can deny child listing while returning an empty result. Require fresh `capabilities.canListChildren` for root and visited folders; missing/false capability or unvalidated source type fails the scan before publication. Original delivery requires fresh download permission plus current ancestry under the bound root. Cached bytes never authorize access after local disconnect. [Current evidence](drive/DEC-002-EVIDENCE-2026-10-18.md) records missing direct provider tests, cache directives and policy approval; BR-RET-002's seven-day cache proposal alone does not authorize retention or derivatives/client transfer. Review source-derived confirmation metadata separately while preserving acknowledged history under the existing contract.

- Owner payloads may contain their own source IDs and contacts; gallery bootstrap must not.
- Public gallery responses carry only authorized photo references/labels and necessary access state. Provider file IDs remain internal except owner exports.
- Full-image delivery may expose photo bytes to the authorized recipient; the service cannot prevent screenshots or copying after delivery.
- Sensitive logs exclude account/gallery passwords, cookies, access tokens, raw share paths, source URLs, notes and contact numbers. Error fields use safe codes.
- Shared gallery pages emit `noindex, nofollow, noarchive` and restrictive referrer policy. Public marketing pages can be indexed; no personal galleries in sitemap.
- Telemetry uses pseudonymous IDs and counts. Do not load third-party analytics into protected galleries before privacy review.

## Deletion, retention and backups

DEC-003's [candidate controls](hosting/CONFIGURATION_CONTRACT.md) require separate runtime/migration/backup/restore identities and private regional derived/backup buckets; no such provider roles or bucket settings exist yet. [Current official research](hosting/DEC-003-EVIDENCE-2026-10-18.md) identifies provider HTTP **path logging** as a possible gallery-token disclosure: application JSON redaction does not suppress edge logs. Verify provider suppression/redaction or an explicitly reviewed mitigation before production; no URL/API change is approved here. Backups need separately retained post-snapshot revocation/deletion evidence, encryption-key recovery and reconciliation before galleries reopen; restoring the same old audit table cannot recover newer events. Neither the local transport spike nor a successful thumbnail proves IAM, decoder isolation or restore safety.

Follow BR-RET-001/002. Logical deletion immediately stops application access; physical object/database purge runs after the restore window. Backups expire by the documented schedule and may retain previously deleted records until then. A recovery runbook must reapply deletion/revocation events newer than the backup before reopening service.

Before public launch, DEC-006 must approve policy text, data processors, retention basis, deletion/export request verification and support contact. An operator must not delete data solely because an unauthenticated message claims ownership. Use synthetic data in development/staging and redact fixtures copied from production.

## Incident response minimum

Detect/triage → restrict affected access without erasing evidence → identify tenants and exposure window → preserve sanitized audit trail → rotate affected secrets and invalidate sessions as needed → remediate → validate isolation/recovery → notify according to reviewed obligations → document corrective actions. No notification timing or jurisdiction-specific legal claim is assumed here.

Record severity, owner, timestamps and recovery evidence. Database or backup access is operational privileged access, not an ordinary platform UI permission.

## BL-001 candidate owner/operator session controls

DEC-001 remains open. [ADR-004](decisions/ADR-004-auth-session-feasibility.md) compares current official approaches; [session contract](auth/SESSION_CONTRACT.md) defines namespace/subject identity, explicit verified linking, one-hour fixed DB sessions, safe returns, recovery and per-session operator TOTP. [Evidence](auth/BL-001-EVIDENCE.md) is synthetic only.

Do not use email to merge identities, cookie presence to authorize, enrollment flags to prove current MFA, or a library logout success body to prove revocation. The spike observed expiry equality accepted and deletion failure swallowed by Better Auth 1.7.9; production guards need explicit expiry and shared durable revocation checks. OAuth does not automatically receive the credential 2FA challenge. Every operator service therefore requires current explicit permission and session-bound TOTP less than 15 minutes old. Backup-code/email recovery alone cannot grant ops access.

Self-hosted library account tables own password hashes and credential operations; app users remain password-free. No app-owned account hashing was added. Shared throttling, credential-resource benchmark, actual recovery delivery, authenticator drill and real PostgreSQL revocation remain unverified. These candidate controls do not certify production auth.

# Security and privacy design

Status: implementation controls and verification plan, not a security certification or legal opinion. Requirements: REQ-TEN-001, REQ-ACCESS-001, REQ-PRIV-001, REQ-RET-001 and REQ-OPS-001.

## Trust boundaries

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

- Owner payloads may contain their own source IDs and contacts; gallery bootstrap must not.
- Public gallery responses carry only authorized photo references/labels and necessary access state. Provider file IDs remain internal except owner exports.
- Full-image delivery may expose photo bytes to the authorized recipient; the service cannot prevent screenshots or copying after delivery.
- Sensitive logs exclude account/gallery passwords, cookies, access tokens, raw share paths, source URLs, notes and contact numbers. Error fields use safe codes.
- Shared gallery pages emit `noindex, nofollow, noarchive` and restrictive referrer policy. Public marketing pages can be indexed; no personal galleries in sitemap.
- Telemetry uses pseudonymous IDs and counts. Do not load third-party analytics into protected galleries before privacy review.

## Deletion, retention and backups

Follow BR-RET-001/002. Logical deletion immediately stops application access; physical object/database purge runs after the restore window. Backups expire by the documented schedule and may retain previously deleted records until then. A recovery runbook must reapply deletion/revocation events newer than the backup before reopening service.

Before public launch, DEC-006 must approve policy text, data processors, retention basis, deletion/export request verification and support contact. An operator must not delete data solely because an unauthenticated message claims ownership. Use synthetic data in development/staging and redact fixtures copied from production.

## Incident response minimum

Detect/triage → restrict affected access without erasing evidence → identify tenants and exposure window → preserve sanitized audit trail → rotate affected secrets and invalidate sessions as needed → remediate → validate isolation/recovery → notify according to reviewed obligations → document corrective actions. No notification timing or jurisdiction-specific legal claim is assumed here.

Record severity, owner, timestamps and recovery evidence. Database or backup access is operational privileged access, not an ordinary platform UI permission.

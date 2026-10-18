# Candidate identity and server session contract

Updated: 18 October 2026. DEC-001 / BL-001 remains OPEN/PARTIALLY VALIDATED. Candidate tested on Better Auth 1.7.9; [BL-001 evidence](BL-001-EVIDENCE.md) covers the original memory spike. [PG follow-up](DEC-001-EVIDENCE-2026-10-18.md) verifies native library persistence and records unsafe logout/error and generated account-uniqueness gaps. BL-004 [app-side subset](BL-004-EVIDENCE.md) adds provisioning, setup and protected owner handlers; no authoritative runtime provider adapter or durable app auth-security schema exists. [ADR-006](../decisions/ADR-006-auth-session-postgres-validation.md) supplements historical ADR-004 with current comparison, sources and gates; this is a recommendation, not production approval.

## Verified identity boundary

Consume server-validated library session data, never browser user JSON or unsigned token claims. Approved OIDC integration must validate code/PKCE, state/browser binding, exact registered callback, signature/JWKS, issuer, audience, expiry and nonce before exposing identity. Require verified email for candidate owner access. The synthetic OAuth seam proves none of those provider claims.

VerifiedIdentity contains configured auth namespace, immutable library user subject, verified-email flag and optional contact/display metadata. Better Auth mapping: auth_provider = `better-auth:<AUTH_INSTANCE_ID>`, auth_subject = library user.id in UUID mode. AUTH_INSTANCE_ID stays fixed per environment across hostname/deployment changes. Never reassign a configured provider/client ID to another issuer. Managed alternatives use canonical issuer/tenant plus validated sub. Provider replacement requires explicit identity migration, never an email join.

App users.id is a separate generated UUID. Unique `(auth_provider,auth_subject)` maps exactly one app user; email is mutable nonunique metadata there. Multiple upstream credentials reside in library account records attached to one library user, without creating extra studios/app users. Enforce unique `(providerId,accountId)` in reviewed auth schema; each providerId is permanently bound to a configured issuer. Generated 1.7.9 PG schema lacked this pair constraint; spike-only index proved rejection, not production migration/race handling. Resolve studio only through current studio_members; absent setup follows BR-ONB-001 recovery without business access. BL-004 implements app-side provisioning; no verified callback is wired to it.

Production mapping transaction upserts that unique key, then locks the mapped app user before the existing Database provisioning recipe. On conflict reload the established mapping; never repoint subject, merge users or reset trial on callback retry. Real database constraints/transactions must prove races; Maps do not.

## Linking and recovery

Candidate options: enabled=true, disableImplicitLinking=true, trustedProviders=[], allowDifferentEmails=false under account.accountLinking. Same-email OAuth login cannot silently link, including verified email. Explicit linking requires current session, reauthentication within 5 minutes, same-origin initiation, verified proof of the new account and binding to initiating user/state. Operators also require recent TOTP. Reject unverified accounts, accounts bound elsewhere, stale/replayed state and competing links. Audit opaque references/result codes only. Spike verifies library collision rejection and explicit verified linking; fresh-reauth wrapper, durable audit/races and real proof remain unimplemented.

No public linking UI/API is added to MVP. Keep linking inaccessible until wrapper requirements pass. Do not merge existing app users/studios; recover the existing login. Email changes cannot move membership/permissions. OAuth-only recovery belongs to upstream provider; do not invent a local password. Unlink/migration is excluded.

Credential signup requires email verification and no auto-login after signup/verification; candidate passwords 12–128 characters. Library account tables own salted hashes, not app users/logs. Reset tokens expire in 15 minutes, single-use, fixed `/recover` destination; successful reset revokes all sessions (`revokeSessionsOnPasswordReset=true`), does not auto-login or clear MFA/permissions. Verification/reset are distinct. Known/unknown reset requests have identical public body/status; timing, shared throttling and delivery need separate proof. After lost reset response, a reused token may fail because reset already succeeded: try the new password or request a fresh link, never assume unchanged credentials.

Actual hosting needs durable bounded delivery jobs/outbox. Enqueue acknowledgement is not delivery. Failed durable enqueue returns safe retryable failure; later delivery failure offers a generic retry and sanitized diagnostics without account enumeration. No token URLs in logs. Local mail capture proves handler wiring only.

## Session and authorization

Candidate lifetime: fixed 1 hour, sliding refresh disabled. Library-signed opaque cookie: Secure, HttpOnly, SameSite=Lax, host-only, Path=/; no cross-subdomain sharing. Owner/gallery cookies and authorization remain distinct. Only Response headers were tested, not browser enforcement. Never put owner tokens in localStorage/business DTOs.

resolvePrincipal(request) must:

1. Validate cookie using authoritative library session storage with cookie caching disabled. Missing/invalid → 401 AUTH_REQUIRED; storage failure → 503 TEMPORARILY_UNAVAILABLE, no stale access.
2. Deny at server_now >= expires_at, unverified email, revocation or stale security version. Missing durable security metadata cannot default to authorized.
3. Map immutable identity, load current membership/studio policy or platform permission. Caller tenant headers/roles, profile metadata or gallery grants cannot override them. `/me` may report setup_required without business access.
4. Enforce checks at each entry point AND data boundary. Cookie presence in middleware is navigation only. Protected/auth responses use Cache-Control: no-store; no shared authenticated cache, secret logs or token referrers.

DTOs expose app user/studio IDs and allowed setup/entitlement data, never subjects, account rows, tokens, hashes or MFA secrets. Login never bypasses suspension/entitlement.

Proposed owner_session_security records (Database) bind revocation/MFA to library session ID and app user. Create metadata after verified authentication and before business access transactionally; never recreate/clear a revoked record. Users have a security_version copied to session metadata; version changes invalidate older sessions. Logout/security changes serialize on the same app user row. Sensitive mutations recheck version/revocation under that lock before business mutation (then studio → project → selection set when relevant). Do not hold locks during external requests. Responses authorized before revocation may already be in flight; every new authorization after successful logout must deny. PostgreSQL tests must prove that ordering, not timing sleeps.

## Callback, return URL and logout

Library auth handlers mount at `/api/auth/*`, outside business `/api/v1`. Design UI targets remain `/login`, `/register`, `/recover`. Browser callback: `/api/auth/callback/<configured-provider-id>`, exactly pre-registered; no wildcard/request-Host-derived origins. Candidate state lifetime 10 minutes, browser-bound and single-use; library owns state/PKCE. Denial returns a safe login error without changing durable data. Exchange failure offers a fresh flow after bounded manual retry, never replaying consumed codes.

Owner return value accepts only <=512-character path matching `/app` or slash-separated ASCII alphanumeric/underscore/hyphen segments, optional trailing slash. Reject scheme, authority, backslash, encoding, dot segments, controls/whitespace, query and fragment; fallback `/app`. Store sanitized path in library-protected state; callback query cannot replace it. Designed bookmarks survive; filters are dropped. Operator return uses separate exact server allowlist (initial `/ops`) and still requires operator permission/MFA. APIs return JSON 401, not redirected HTML; pages navigate to login with sanitized return. Preserve visible unsaved intent, reload acknowledged data canonically, never re-create/erase business records on expiry.

Logout is same-origin/CSRF-protected POST. Commit durable revocation/security version first, invalidate MFA evidence, then library cleanup/cookie clearing. Acknowledge only certain server revocation. Storage uncertainty → 503/retryable logout state; cookie clearing alone does not revoke copied cookies. Repeated logout is idempotent; old cookies stay denied. All-device logout/reset advances version and revokes sessions. Upstream IdP logout is separate; local logout does not prove global SSO logout. Synthetic provider explicitly disables upstream logout.

## Operator assurance and recovery

Every `/api/v1/ops/*` handler/service requires current platform_roles permission AND server-recorded TOTP for that session less than 15 minutes old, valid session and current security version. Enrollment flag, trusted-device cookie, client mfa=true, email domain, membership or OAuth login alone is insufficient. No default photo/media access.

Record mfa_verified_at/mfa_method only after successful verification for that session. Block trusted-device bypass for operators; every login method including OAuth passes the guard. Require fresh primary reauthentication for enrollment/factor changes and verified enrollment; prevent disabling/replacing MFA while retaining operator authority without controlled recovery. Missing/stale assurance → 403 MFA_REQUIRED; absent permission → 403 PERMISSION_DENIED; invalid session → 401.

Candidate recovery policy: backup codes can recover account access but cannot alone authorize ops. Lost-factor recovery suspends operator access, verifies identity via approved controlled process, revokes sessions, reenrolls TOTP and audits reason before restoring access. No public self-grant, email-reset bypass or SMS/email-only ops fallback. Named bootstrap/emergency owner is still missing. Actual synthetic TOTP challenge and local guard were tested; recovery workflow, factor changes, shared brute-force limits and authenticator interoperability were not.

## Configuration and rollout

| Config | Handling |
|---|---|
| APP_ORIGIN / BETTER_AUTH_URL | Equal canonical HTTPS origins; startup validation; proxy headers trusted only from approved proxy |
| AUTH_INSTANCE_ID | Stable nonsecret environment namespace; never recycle |
| BETTER_AUTH_SECRET | Server-only high entropy; library minimum 32 characters; CSPRNG; no public prefix/committed value |
| BETTER_AUTH_SECRETS | Optional supported versioned rotation format; rehearsed overlap/retirement and coordinated replicas; keep decryptability of old encrypted rows |
| AUTH_DATABASE_URL | Proposed restricted auth-schema role; deployment DDL credential separate; driver/pooler pending DEC-003 |
| AUTH_ISSUER / AUTH_CLIENT_ID / AUTH_CLIENT_SECRET | Approved OAuth/OIDC only; fixed allowlisted issuer/config; secret server-only; login grants no Drive scope |
| AUTH_MAIL_CONFIG_REF | Proposed server-only email credential reference; isolated sender/service per environment; synthetic sink here |

Fail production startup on missing/invalid config. Rehearse key rotation, old-key retirement and session/state invalidation while preserving TOTP/OAuth decryptability. Encrypt retained OAuth access/refresh material using reviewed library option; minimize scopes/persistence, and do not assume every account column becomes encrypted. Restrict auth schema/backups as credential-bearing data. Key compromise triggers controlled revocation/rotation, not log dumps.

Production needs shared durable login/reset/MFA rate limits; memory limits cannot protect replicas. Candidate pilot limits: login 5/min address-digest+IP and 50/hour address-digest; reset 3/hour address-digest and 10/hour IP; MFA 5/min challenge plus account lockout. HMAC address digests use separate server rate-limit key. No raw addresses/IPs in evidence logs. Generic errors/Retry-After and resource behavior need testing; these defaults claim no attack resistance.

Smallest pilot operator proposal: controlled credential/verified-email/TOTP bootstrap; keep OAuth-only enrollment inaccessible until fresh primary proof/enrollment is tested. Durable assurance and named recovery owner remain missing. Native library PG logout/reset was observed across processes/restart; this does not implement the user-lock/security-version protocol above. Keep raw delete-user/account management inaccessible pending verified request, revocation and studio/business retention orchestration with DEC-006; hooks do not define trial eligibility or erase app records/backups safely.

No provider migration, custom password endpoint or deployed auth adapter exists. BL-004 implements app-side onboarding with synthetic server-adapter tests only; it does not close this contract's provider/revocation/logout/recovery gates. Hosting/provider/hash-resource review and authorized smoke tests remain DEC-001 gates.

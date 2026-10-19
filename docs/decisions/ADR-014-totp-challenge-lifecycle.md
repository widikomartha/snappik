# ADR-014: durable TOTP challenge cancellation and completion receipts

Date: 19 October 2026 (Asia/Makassar). Status: **implemented local security correction; DEC-001 OPEN/PARTIALLY VALIDATED**. Supplements [ADR-009](ADR-009-auth-local-hardening.md), [ADR-010](ADR-010-password-recovery-outbox.md) and [ADR-013](ADR-013-shared-auth-admission.md). Starting actual clean main / `2fb68df`. Scope: DEC-001/BL-001; REQ-AUTH-001, REQ-REL-001, REQ-OPS-001; BR-REL-001/002, BR-OPS-001 and BR-ENT-004; T-001/003/015/017 subsets. No production approval, external connection or commit authorization.

## Demonstrated gap and minimum behavior

The baseline wrapper returned200 for pending-only logout, cleared the browser factor cookie, but retained the native verification proof. Actual PostgreSQL reproduction then accepted the copied pending cookie plus the correct TOTP code with200. A pending cookie alone was not an authenticated session and did not bypass TOTP or operator permissions. The flaw was continued primary-proof usability after acknowledged logout. Native successful consumption and reset cancellation already existed; neither supplied pending logout cancellation or a durable link to a session created immediately before logout.

Minimum: signature-verified targeted cancellation, no pending business authority, single consumption, strict expiry/current security version, both logout/completion orders safe, atomic session/challenge cancellation, failure503 without clearing cookies, cross-process/restart durability, existing enrollment/admission/permissions intact. [Executed evidence](../auth/DEC-001-TOTP-EVIDENCE-2026-10-19.md) separates reproduction, regressions and limits.

## Decision and alternatives

| Option | Assessment |
|---|---|
| Clear browser cookie only (baseline) | Copied primary proof survives; demonstrated insufficient |
| Delete signed native challenge and attempts under the existing credential gate | Closes logout-first order, but consumption removes the association needed when completion wins or its response is lost |
| Advance account security version / revoke every session on pending logout | Broader user-visible logout and denial-of-service effects; unnecessary loss of independent device sessions |
| Small durable receipt linked atomically to resulting session metadata | Preferred: targeted semantics, existing PG/fence, one additive table; handles completion-first and lost response without a new provider |
| Store application JSON lifecycle state in native verification values | Avoids a table, but mixes incompatible native consumption/cleanup and application constraints; harder to review and migrate |

Add reviewed [auth006](../../src/db/auth-migrations/006_totp_challenge_security.sql). Receipt key is SHA256 over a versioned namespace and native random identifier; no new bearer token. Rows bind app user/security version/native expiry, optional resulting session and revocation time. Existing native random signed cookie, challenge/attempt records, TOTP algorithm/lockout and native single consumption remain authoritative too. New wrappers reject native-only pre006 challenges rather than adopting their unknown security context. Fresh primary login restores access.

The existing cross-process credential gate734004 now also encloses logout's authoritative transaction. Before returning a pending login response, record its lifecycle/version. Before pending verification, validate cookie signature and active receipt/current version/DB-clock expiry. A per-library AsyncLocalStorage scope passes only the receipt digest to the native session-create hook. Under the app-user lock, the hook atomically claims that receipt for the new session and attaches security metadata; only then can it authorize. No external I/O or new in-memory revocation state is introduced. Native session creation and app attachment use separate transactions as before: failure may leave an unissued native row with no app metadata, which cannot authorize. Do not manually adopt such rows.

Logout first checks shared key/policy agreement; it consumes no attempt budget. Under the gate and app-user lock it atomically revokes the supplied session, marks the signed pending/consumed receipt revoked, revokes its linked session/MFA if present, and deletes that exact native challenge plus attempt record. Only committed success permits cookie clearing and best-effort native session cleanup. A signed consumed or expired proof may still cancel its linked live session; expiry cannot remove that cancellation relationship. Other sessions and other pending logins remain independent. Revoked native sessions cannot enter the enrollment/step-up branch to create replacement authority.

Reset marks all that user's receipts revoked in its existing atomic password/version/all-session/native-proof transaction. Independent version changes also fail at verification and attachment; attachment must never restamp old primary proof with the latest version. Studio suspension is a business restriction (BR-ENT-004), not an invented account-suspension model: login/recovery/logout remain possible, getMe is restricted and business mutations deny. Current email verification and operator permission/recent same-session TOTP still apply independently.

Unexpected native non-API exceptions were observed printing raw database detail despite disabled library logging. Set onAPIError.throw so the wrapper owns sanitization; native API errors retain native responses. Failure-injection tests verify no raw console output, no proof/error detail in the public503 and no cookie clearing. This does not prove host/proxy log suppression.

## Migration, maintenance and reconsideration

006 creates only its table/indexes and revokes PUBLIC. It neither rewrites nor deletes existing accounts/sessions/business rows; populated005 digests are tested unchanged. Readiness now requires006. Grants allow trusted runtime SELECT/INSERT/DELETE and updates of session_id/revoked_at only; identity/version cannot be repointed by UPDATE. This is trusted service authorization, not RLS. Old SQL and lockfile are unchanged. Existing workspace/user/hosted DBs were not migrated by this task.

At issuance, lazily remove at most32 receipts older than native expiry plus1day whose resulting native session is absent/expired; preserve receipts for live resulting sessions. No idle-time physical deletion SLA or new worker scheduler. Existing admission bounds issuance, not a measured production storage/load guarantee. Review retention/restore with the other credential-bearing tables.

For a known target, stop enabled auth traffic, review/apply006 and grants with the migrator, start only compatible artifacts, and require fresh primary login for old pending flows. No mixed pre006 serving artifacts or rollback to the weaker wrapper; additive SQL alone cannot prevent old code from bypassing this invariant. Native cookie format/identifier/parser/hooks are pinned1.7.9 coupling: retest lifecycle on upgrades. Reconsider the global fence/receipt mechanism for higher throughput, new public login/factor routes or native lifecycle support, based on measured evidence.

This correction is an engineering decision for the authorized local slice. Provider/version/host/budget approval, real signed callback/delivery/HTTPS, operator bootstrap/lost-factor recovery, key/hash/rotation/restore/production-role/network/load and full acceptance remain DEC-001 gates. Next is a focused Closure Audit, not automatic feature expansion.

Residual possession risk: an old signed pending proof can cancel its linked live resulting session even after challenge expiry; this intentional targeted logout capability resolves response-loss/race ordering. A stolen proof can therefore cause that session's logout, but cannot authenticate without an active unconsumed challenge and correct TOTP. Keep cookie/device/log protections and do not treat URL/bar clearing as proof of secrecy.

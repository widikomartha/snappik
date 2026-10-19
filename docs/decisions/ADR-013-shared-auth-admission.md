# ADR-013: PostgreSQL shared authentication admission

Date: 19 October 2026 (Asia/Makassar). Status: **implemented local candidate; DEC-001 OPEN/PARTIALLY VALIDATED**. Supplements [ADR-009](ADR-009-auth-local-hardening.md), ADR-010 and [ADR-012](ADR-012-recovery-code-handoff.md). Actual baseline clean main / `7e6ba85`. Scope: DEC-001/BL-001, REQ-AUTH-001/REQ-REL-001/REQ-OPS-001/REQ-UX-001, BR-REL-001/002 and BR-OPS-001; T-001/003/015/016/017 subsets. No production approval, commit/push, external account/sender, deployment or existing database reset authorized.

## Verified gap and criteria

Installed Better Auth1.7.9 defaults HTTP limits to production-only memory: default100/10s, primary sign-in3/10s and two-factor plugin3/10s. `auth.api` calls bypass its HTTP limiter. The application recovery/reset wrapper never invokes that native handler; recovery already has durable3/hour/address issuance/dedupe but no shared request/reset admission. Existing credential gate serializes proof/reset operations, not attempt counts. Native TOTP already has persistent pending-challenge attempt accounting and sign-in account lockout; those are retained, not replaced.

Minimum: independent committed admission before proof, shared across processes/restarts; bounded state/cleanup/time; uniform recovery handling; no spoofable client identity or recovery/password/MFA proof in rows/logs; preserve native rules and transactional session/reset fence. No Redis/paid infrastructure or new public MFA route.

## Decision and alternatives

Use existing PostgreSQL with reviewed additive [auth005](../../src/db/auth-migrations/005_auth_admission.sql), a short admission transaction and a distinct advisory lock734006. Reuse the same store for native `customStorage.consume`, preserving native rolling/inactivity-window semantics and special/plugin limits. Native production/development enable defaults remain unchanged; application admission is always active when its local auth wrapper is enabled. No protection is disabled to make tests pass.

| Option | Trade-off | Decision |
|---|---|---|
| Existing memory limiter and credential gate | Small baseline, but process/restart bypass and uncovered recovery/reset | Insufficient |
| Native database storage alone | Shared HTTP counters, but still misses application-owned recovery/reset, account scopes, bounded cardinality/policy agreement and common errors | Insufficient alone |
| Shared PG store plus wrapper budgets/native adapter | Existing dependency/transactions; centralized bounded lock and extra DB round trips; local low-throughput baseline | Preferred candidate |
| Redis/edge limiter | Potentially useful for network flood isolation and scale; new operations/trust/cost, no authorized provider or demonstrated need at this local stage | Defer; future perimeter complement, not substitute for proof/session guards |

## Trust and policy

Next Request provides no authenticated socket peer here. Ignore all incoming IP/proxy headers, explicitly configure native `ipAddressHeaders:[]` without disabling tracking/limiting, and use a single shared per-operation network/instance namespace fallback. Do not claim per-client/IP fairness. This closes spoofed-header budget rotation but conservatively couples local users; native3/10s also applies to this shared fallback. Production needs an approved edge that overwrites forwarding headers and restricts direct origin access, a verified peer contract and measured NAT/IPv6/fairness/capacity. No header-only trusted-proxy mode is exposed by this increment.

Application defaults, positive bounded configuration via `.env.example` and `readConfig`:

| Scope | Default | Configuration |
|---|---|---|
| Application window | 60s anchored at first admitted request; denied attempts do not extend it | `AUTH_RATE_WINDOW_SECONDS`,1–3600 |
| Login aggregate | 120/window | `AUTH_RATE_LOGIN_GLOBAL`,1–10000 |
| Recovery aggregate | 60/window | `AUTH_RATE_RECOVERY_GLOBAL`,1–10000 |
| Reset aggregate | 60/window | `AUTH_RATE_RESET_GLOBAL`,1–10000 |
| TOTP aggregate | 60/window | `AUTH_RATE_TOTP_GLOBAL`,1–10000 |
| Login normalized account input | 10/window, successful/failed attempts counted | `AUTH_RATE_LOGIN_ACCOUNT`,1–1000 |
| Recovery normalized address input | 10/window;3/hour issuance remains independent | `AUTH_RATE_RECOVERY_ACCOUNT`,1–1000 |
| TOTP verified account or canonical pending challenge | 5/window | `AUTH_RATE_TOTP_PROOF`,1–1000 |

These are conservative local safety budgets, not measured multi-tenant throughput. Native stricter limits still apply. Reset uses aggregate admission: its256-bit random code is not an account identifier; no token-derived limiter key or new email-based reset lockout. Logout remains outside admission so throttling cannot trap a valid session. Public MFA enrollment/change/disable/backup management remains404; future exposure requires recent primary proof, operator policy and admission integration. Trusted internal library APIs are not public bypass routes.

Account/address scopes derive from bounded trim/lowercase input before any existence lookup. Generic recovery subject suppression returns202 `{accepted:true}` without retry/scope metadata for both known/unknown accounts; it can intentionally suppress issuance. Aggregate exhaustion returns429 independent of account existence. Storage/commit/lock/capacity/policy uncertainty returns sanitized503, never fail-open. 429 includes integer `Retry-After`; no remaining budget or subject is returned. Recovery ID/EN and login Indonesian copy distinguish throttling; no automatic mutation replay. Logout consumes no attempt budget but checks shared key/policy before interpreting a cookie: a mismatched-key process was observed returning200 without revoking the cookie valid on the correct instance. It now returns503 with no cookie clearing; valid-process logout commits revocation normally.

TOTP uses the native-verified session account when present, otherwise the canonical pending identifier, not a raw cookie-header hash. Quoting, whitespace, percent encoding, signature spelling, irrelevant cookies and invalid extra session cookies cannot rotate that scope. Duplicate auth cookies reject400. This budget key grants no authority: native signature, expiry, challenge single-use/attempt limits, persistent account lockout and current app session/MFA checks remain authoritative. A prototype raw-cookie bucket bypass was demonstrated and corrected; see evidence.

Native HTTP limiter Retry-After uses the authoritative shared bucket result. Native TOTP account-lock errors omit that header; wrapper uses the pinned900s lock duration as a conservative upper-bound retry hint (not exact remaining time), rather than implying a10s unlock. It does not extend the native lock. Native threshold/lock fields are not changed by application admission; a synthetic accelerated lock fixture verifies denial/header handling. Reconsider fallback on native option/version changes.

## Persistence, concurrency and operations

Store HMAC-SHA256 bucket identifiers using an HKDF-separated key from stable BETTER_AUTH_SECRET/instance namespace. No raw address, IP, cookie, password, code, request ID or request body in limiter rows/logs. `admission_bucket` holds only key hash, scope, used count and expiry. Maximum10000 rows across this DB store under the common lock; no active-row eviction. Each transaction deletes at most32 expired rows, checks/increments atomically with DB clock, and has1s lock/2s statement timeout. Logical expiry is enforced even when lazy cleanup has not removed a row. Idle expired hashes may remain until further activity; storage is bounded, not a strict wall-clock deletion SLA. Trusted runtime SQL access is not an adversarial/untrusted DB client boundary.

Global admission commits before body/proof work, then subject admission commits independently. Failures, response loss, gate contention and credential transaction rollback retain charged attempts. Subject denials still consume aggregate budget; rotating accounts/UUIDs/codes cannot create unbounded state. Admission lock is released before acquiring existing credential lock734004; native custom storage can briefly run while that gate is held, never the reverse. Existing pool minimum2 remains required. Session/revocation locks and business transactions unchanged; no provider call under admission lock.

`admission_policy` pins a namespace-specific fingerprint of key/policy/version. Different new processes with conflicting key/thresholds fail503, rather than create separate bypass buckets. Trusted runtime may read/insert policy but cannot update/delete it; reviewed migrator owns coordinated changes. Thresholds are configurable at initial setup; subsequent changes require stopping all auth traffic/instances, draining old windows and an explicitly reviewed policy/key transition. No automatic reset, credential rotation or maintenance CLI that weakens enforcement is added. Do not change instance namespace to clear limits.

Runtime requires005 before auth initialization. Migration is additive/checksummed, keeps app001/002 and auth001–004 history immutable, and never rewrites accounts/recovery/business data. Apply updated grants only to a known reviewed target; tested non-owner grant is not deployed IAM. Old pre005 artifacts ignore these counters: **no mixed old/new auth rollout or rollback that silently removes admission**. All serving processes must run the reviewed version/key/policy and share the authoritative primary DB. No replica reads, worker scheduler or process-memory reset is involved. A worker/process restart cannot refill committed budgets.

## Consequences, evidence and gates

Short account windows can temporarily delay a targeted legitimate login; denials do not extend expiry, and no account status/password/session is changed by limiting. Global exhaustion and shared-network fallback can affect unrelated users; this is explicit availability/backpressure, not DDoS resistance or fair per-IP isolation. Admission itself consumes DB resources. Hosted contention/load, actual network identity, policy/key rotation, timing resistance and restore with newer counters/session revocations remain release gates.

[Executed evidence](../auth/DEC-001-ADMISSION-EVIDENCE-2026-10-19.md) distinguishes real PG/child processes/two built Next processes from synthetic fixtures and unexecuted provider/device/load checks. BL-001/003/004 remain In progress. DEC-001 stays open for real signed callback/delivery/host/operator/secret/hash/rotation/restore/role/budget and product approvals. Reconsider on load, proxy, provider/Next/cookie-parser/schema changes or new auth entry points. Recovery handoff/MFA/business contracts remain ADR-012/010/009.

Reference accessed19 October2026: [official Better Auth rate-limit documentation](https://better-auth.com/docs/concepts/rate-limit). It corroborates memory defaults, HTTP/API separation and atomic custom consume; exact tested rules/parser/lockout behavior were read from pinned installed1.7.9 sources, not assumed from current online documentation. No dependency upgrade or new price/cost claim.

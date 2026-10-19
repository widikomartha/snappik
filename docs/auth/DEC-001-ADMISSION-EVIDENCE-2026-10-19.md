# DEC-001 shared authentication admission evidence — 19 October 2026

Commit follow-up: the user subsequently authorized a local commit of this increment. No-commit/uncommitted statements below describe the pre-commit verification snapshot; actual Git HEAD/status owns current commit state. Push, deployment and external services remain unauthorized.

Status: **local subset implemented/validated; DEC-001 OPEN/PARTIALLY VALIDATED; BL-001/003/004 In progress**. Actual startup clean main / `7e6ba85`; this increment uncommitted. [ADR-013](../decisions/ADR-013-shared-auth-admission.md) owns alternatives, limits, rollout and threat model. User authorized local implementation/tests/docs only. No external provider/sender, paid provisioning, deployment, commit/push or existing database reset.

## Audit: facts versus remaining gaps

| Boundary | Verified existing behavior / gap | Current local result |
|---|---|---|
| Primary login | Native HTTP limiter defaults to production-only process memory; gate serializes proof but has no attempt budget. Header-only IP input lacks verified socket/proxy provenance | Always-on aggregate + normalized account admission; native custom store now shared PG; all incoming IP headers ignored |
| Recovery request | Existing shared HMAC address3/hour issuance/UUID dedupe, but wrapper bypasses native HTTP rate limiting | Additional aggregate/address attempt budgets; all admitted retries charged; suppressed address returns same202/no account metadata for known/unknown; global429 independent of account existence |
| Reset | Wrapper bypasses native handler; secure256-bit code/expiry/single-use and atomic session reset already implemented | Aggregate admission including malformed/repeated/random-code attempts; no code or token hash used as limiter identity; underlying transaction unchanged |
| TOTP | Native persistent pending attempts/account failures/lock already exist; HTTP memory rules alone do not span processes | Shared native HTTP rule + canonical challenge or native-verified session account budget. Concurrent failures, encoding/irrelevant-cookie variants, multiple sessions and retries covered; native factor/enrollment retained |
| Enrollment/change/recovery/operator | Public management routes already closed; permission + recent same-session MFA guard exists, lifecycle acceptance incomplete | Routes remain404; trusted internal fixture APIs are not public admission entry points. Operator regression still passes. No new MFA management/recovery feature |
| Logout | Existing durable revocation survives native cleanup failure; new fingerprint agreement was initially missing from unthrottled logout | Corrected: no attempt limit, but key/policy agreement required before cookie interpretation. Drift503 retains cookie and active session for correct-instance retry |
| Storage/process boundary | Process memory restarts refill native limits; no shared wrapper counters | DB-clock shared state/atomic lock, bounded10000 rows and32-row lazy cleanup; policy/key mismatch, capacity or DB failure deny; child processes and two built Next processes tested |

Source inspected: installed Better Auth1.7.9 `dist/api/rate-limiter/index.mjs`, `dist/context/create-context.mjs`, `@better-auth/core/dist/utils/ip.mjs`, `plugins/two-factor/index.mjs`, `verify-two-factor.mjs`, `totp/index.mjs`, and better-call `cookies/context/crypto.mjs`. Production default100/10s, sign-in3/10s, two-factor3/10s; HTTP only, raw `auth.api` trusted calls bypass. Native sign-in TOTP has five pending attempts and default ten failures/900s account lock. No native feature disabled/upgraded. [Official rate-limit reference](https://better-auth.com/docs/concepts/rate-limit), accessed19 October2026, corroborates broad configuration; local pinned source/tests own exact behavior, not current online-version assumptions.

Network decision is conservative: Next Request has no authenticated peer in this slice. No trusted-header/proxy option added. A single local aggregate/per-native-path fallback prevents spoofed-IP rotation but can delay unrelated users; it is **not per-IP fairness or production DDoS protection**. A later authenticated edge/direct-origin restriction/NAT/IPv6 and load decision is still required. Account/address keys depend on bounded normalized input regardless of user existence, never provider lookup; this does not prove timing indistinguishability.

## Implemented files and persistence

- [Admission](../../src/modules/auth/admission.ts) and [policy](../../src/modules/auth/admission-policy.ts): independent committed attempts, HMAC/HKDF identifier separation, DB clock, global/subject/native scopes, cap/cleanup/timeouts, key/policy pinning and uncharged logout check.
- [Auth005](../../src/db/auth-migrations/005_auth_admission.sql), [migration readiness](../../src/db/auth-migrate.ts), [grants](../../src/db/auth-grants.sql): additive policy/bucket tables/index; no old SQL edited or existing account/recovery/business row rewritten. Non-owner runtime may insert/read policy but cannot update/delete it; trusted bucket CRUD, no DDL.
- [Library](../../src/modules/auth/library.ts), [HTTP](../../src/modules/auth/http.ts), [runtime](../../src/modules/auth/runtime.ts), [config](../../src/config.ts), [.env.example](../../.env.example): native atomic custom storage without changing enable/default/plugin controls; explicit no trusted IP headers; per-operation/account/challenge admission and sanitized429/Retry-After/503.
- Login/recovery form and recovery strings: throttle guidance; ID/EN generic acceptance no longer implies issuance despite suppression. Clean URLs/manual code, request IDs, expiry/single-use/session invalidation/MFA preserved.
- [PG tests](../../tests/admission.test.ts), [child fixture](../../tests/fixtures/admission-observer.ts), [two-Next smoke](../../scripts/admission-smoke.ts), test factory/unit/recovery upgrade fixture/package scripts: synthetic only, no product test endpoint. Recovery upgrade seeds a genuine pre005 session through existing trusted native API, rather than calling the new wrapper before its required tables exist.

Defaults and configuration bounds are in ADR-013/.env.example:60s application window; aggregate login120, recovery/reset/TOTP60; normalized login10/recovery10; canonical TOTP proof/account5. Native stricter3/10s rules still apply, so these app ceilings are not effective throughput promises. Every process must share namespace/key/policy. Config drift fails503; later changes need a reviewed coordinated maintenance transition, not an automatic runtime reset or namespace rotation. Old pre005 artifacts bypass the new limiter and must not serve mixed traffic/rollback silently.

Limiter rows contain HMAC64 key, safe scope, count and expiry only; policy holds namespace/fingerprint, no raw address/IP/cookie/password/code/body/UUID. Aggregate counters commit before body/proof; subject counters before credential gate; failed/uncertain/busy operations remain charged. Denied app attempts never extend their window; native rolling semantics retained. Cleanup is bounded and lazy: inactive expired hashes can remain until traffic resumes, but functional expiry and cap apply. No scheduled auth worker or public bucket-reset API added. Ordinary worker restart cannot refill these rows; separate child-process exit/reconstruction proves process independence.

## Commands and actual outcomes

Environment: existing Windows workspace, Node24.18.0/npm11.16.0, Next16.4.1/React19.3.1/TS5.9.3, pinned Better Auth1.7.9, actual PostgreSQL18.4 x86_64-windows. Every test cluster is newly created through the existing isolated helper under ignored `.local`; no install/upgrade or existing DATABASE_URL reset. Ephemeral secrets/cookies/codes remain in process memory and are never evidence output. Native schema/fixtures are real PG; email/provider are synthetic.

| Exact command | Result |
|---|---|
| `npm run test:admission` | **Passed11/11** final suite, including both demonstrated fixes below. Real PG/child processes; details next table |
| `node node_modules/tsx/dist/cli.mjs --test --test-name-pattern 'TOTP proof budget' tests/admission.test.ts` | **Passed1/1** targeted recheck after final native locked-factor retry fallback; accelerated synthetic locked row verifies429/Retry-After900, not ten observed wrong attempts |
| `npm run test:admission:smoke` | **Passed** on built Next: two separate serving processes, concurrent login failures/recovery retry/invalid reset/TOTP, native/global/account budgets, headers, process+DB restart, dropped response/dedupe, expiry/valid reset/MFA and copied-cookie denial |
| `npm run test:auth` | **Passed10/10** existing PG auth identity/revocation/CSRF/onboarding/TOTP/operator/linking subset. Later canonical-TOTP edit also rechecked the affected operator test below; final logout policy edit covered by11-suite and HTTP auth smoke |
| `node node_modules/tsx/dist/cli.mjs --test --test-name-pattern 'operator requires' tests/auth.test.ts` | **Passed1/1** after canonical TOTP scope change; no permission/MFA grant regression |
| `npm run test:recovery` | **Passed15/15**, rerun after canonical TOTP change: reset/login/read/reuse/concurrent proof, failures/restarts, encrypted outbox, data preservation and copied pending-proof invalidation |
| `npm test` | **Passed6/6** including bounded positive config/no-disable validation |
| `npm run test:db` | **Passed27/27** foundation/onboarding/worker/tenant/idempotency/lease/database regressions |
| `npm run test:recovery:browser-contract` | **Passed4/4** pure model/locale/ack checks; these are not real-browser E2E |
| `npm run typecheck` | **Passed** final runtime and smoke/test sources |
| `npm run build` | **Passed** final web and compiled worker; build-only env below |
| `npm run test:auth:smoke` | **Passed**, rerun after logout policy check: built Next/PG migration readiness/CLI, protected onboarding, CSRF, durable logout failure/retry/reset/revocation across process restart |
| `npm run test:smoke` | **Passed** default unconfigured built web/compiled worker, unavailable auth and worker restart. Later runtime-only logout check does not affect unconfigured mode |

Build: set process `APP_ORIGIN=http://localhost:3000`, `DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:55433/build_only`, `NEXT_TELEMETRY_DISABLED=1`; run `npm run typecheck`, then on success `npm run build`. No build-time live connection. Pure final fallback/wording and policy-check edits were typechecked/rebuilt; targeted rechecks are distinguished above. Documentation and diff final checks are appended in the [active handoff](../agents/handoff-2026-10-19-DEC-001-admission.md).

### Concrete shared-state evidence

| PG test | Observed assertion |
|---|---|
| Additive migration/grants | Populated004 hashes/sessions/mappings preserved after005/reapply;004 readiness rejects; non-owner consumes and cannot edit policy/DDL |
| Cross-process admission | 16 simultaneous attempts from two child processes plus parent: exactly8 allowed with budget8; fresh child denied; actual DB outage503, restart still denied, expiry allows |
| Login account | Case/space variants share three-attempt budget, wrong proofs charged, fourth valid password429, another account401 and logout200; expiry allows valid login |
| Recovery concurrency | Two adapters racing same address/UUID produce one receipt per known/unknown address; bounded subject suppression exact202/no Retry-After; aggregate exhausted429 |
| Random resets/headers | Eight invalid code attempts get400, next two429 across adapters despite varied XFF/X-Real-IP/CF headers; one aggregate row, no token/IP record |
| Pending TOTP | Two simultaneous wrong attempts across adapters401/401; native failed counter2; further valid/encoded/irrelevant-cookie variants429; expiry permits correct proof. Synthetic accelerated native lock preserves429 and conservative900s retry hint; management paths404 |
| Authenticated TOTP | Separate genuine native sessions for the same user and ignored fake pending cookies still share account budget; third429 |
| Failure/rollback | Key/threshold drift503 path, closed pool and injected storage failures fail closed/redact; failed recovery transaction retains independent attempts and later suppression creates no receipt |
| Capacity/cleanup | 10000 active fixture rows: new bucket denied; after expiry exactly32 removed then one inserted, count9969; native allowed requests refresh rolling expiry and exhausted native counter denies |
| Real clock expiry | One-second DB-clock window rejects without expiry extension; after pg_sleep(1.05), admission succeeds naturally. Other tests accelerate expiry only in disposable fixture rows |
| Logout key drift | Wrong-key instance503/no cookie clearing; copied cookie remains active for correct-instance retry; correct logout200 then copied-cookie lookup denied |

Two-Next script uses independent local ports/processes, same canonical APP_ORIGIN/key/namespace/policy and one authoritative PG. Requests to the second private upstream explicitly carry canonical Origin. It is not a hosted browser/CORS/trusted-edge proof. Concurrent wrong login/TOTP requests each return401, then shared budget429; reset attempts400/400 then429; a loopback proxy drops the first **committed** recovery HTTP response, then concurrent retries across A/B return202 with one durable receipt and all three attempts charged. Native production sign-in rule permits three across distinct addresses/A-B, fourth429 despite spoofed headers. Restart B and PG retain denial; fixture expiry permits valid reset/TOTP. These demonstrate multiple actual Next processes, not merely multiple JS objects or mocks.

## Failures found and corrected

Initial syntax/definite-assignment errors in new test/smoke helpers prevented checks; corrected, then final type/build passed. A targeted run exposed a fixture startup race when constructing the library before migrations; moved factory creation after migration readiness, matching actual runtime ordering. No production schema issue was concealed.

Prototype challenge scope hashed raw cookie spelling. A real PG/native TOTP request with equivalent quoted/percent-encoded cookie returned401 (proof attempted) instead of expected429. Fixed canonical identifier/account scoping and tested irrelevant cookies/invalid extra sessions/multiple genuine sessions. Duplicate auth cookies return400; a fixture initially appended a duplicate and was corrected to replace it for the intended equivalence test. No signature/proof validation was relaxed.

New policy agreement initially did not cover unthrottled logout: wrong-key process returned200 while correct-process copied cookie remained active. Corrected to uncharged policy check before interpretation, with explicit503/no-cookie-clear and correct retry test. Native lockout response without HTTP-limiter header now uses conservative900s upper-bound hint, not a misleading10s unlock; actual native lock expiry is never extended by this adapter.

## Limits, unexecuted evidence and next task

**Not run / gated:** production provider/signed OAuth callback, real delivery/inbox/scanner, hosted TLS/edge/per-client IP/IPv6/NAT/fairness/load, real COMMIT acknowledgement loss, replica/failover/restore, secret/policy rotation and migration with mixed deployment artifacts, actual screen reader/real-browser throttle UI/device matrix. Native ten-failure threshold/15-minute expiry was source-reviewed and accelerated via synthetic lock state, not waited/observed end-to-end. No production distributed guarantee, uniform timing, optimal thresholds or full T-001/002/003/015/016/017 acceptance claimed. No new recovery browser/history run was needed for unchanged clean-URL protocol; prior ADR-012 evidence stays dated. Shared fallback and global saturation can affect unrelated users; admission is backpressure, not perimeter DDoS control. Raw trusted `auth.api` is intentionally outside HTTP limiting and must never be exposed as a public escape hatch.

DEC-001 OPEN; BL-001/003/004 In progress. Remaining closure gates: approved provider/host/budget/manual-code UX/risk, real signed callback/delivered recovery/scheduler/HTTPS/logging, independent operator bootstrap/lost-factor ownership and logout-pending-challenge lifecycle, shared authenticated network/load, key/hash/rotation/restore/role acceptance. Next independent local slice: copied pending TOTP challenge revocation on logout, with persistent signature-verified cancellation and failure/retry/concurrent/reset tests. It must not add MFA-management/OAuth/sender endpoints or change recovery architecture. Separately obtain approved edge/network/provider environment for production tests.

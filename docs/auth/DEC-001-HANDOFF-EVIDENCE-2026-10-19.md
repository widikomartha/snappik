# DEC-001 recovery handoff evidence — 19 October 2026

Commit follow-up: the user subsequently authorized a local commit. Uncommitted/no-commit statements below describe the pre-commit evidence snapshot; actual Git owns current commit state. No push/deployment/external delivery authorized.

Status: **local manual-code candidate implemented and validated; DEC-001 OPEN/PARTIALLY VALIDATED**. [ADR-012](../decisions/ADR-012-recovery-code-handoff.md) owns alternatives/threat model. Actual startup clean main / `0fc60a1`; all changes here remain uncommitted. The current user authorized local investigation/implementation/verification only, then asked to continue fixes. Earlier commit requests are not authorization for this increment. No push, deployment, paid resource, external sender/provider or existing database reset.

## Verified implementation and exposure boundary

Before: delivery generated `/recover#token=...`; the parser-time bridge imported raw fragment into memory. [Earlier evidence](DEC-001-BROWSER-EVIDENCE-2026-10-19.md) demonstrated that global history retained original fragment URLs. Reused existing evidence rather than navigating another valid bearer URL to reproduce it.

After: delivery returns `{id,email,url,code}` with fixed clean `/recover?step=reset` and a separate43-character256-bit code. The form manually submits code in the unchanged reset POST token field; no URL-based import or automatic consumption. Bridge stores only mode. ID/EN instructions, separate masked code input, exact acknowledgement,15s uncertainty, retry/form isolation remain. Refresh clears fields; successful reset clears fields/step. Existing v1 encrypted outbox payloads work without migration; raw library hashing, credential gate, session-version transaction, MFA, roles/onboarding and all SQL stay unchanged. Old delivered URLs/history are not erased or immediately revoked by this delivery-format change; original15min/single-use rules apply.

No demonstrated new provider/library defect required an auth rewrite. Normal generated links no longer carry proof; this does not prove resistance to compromised inbox/extensions/XSS, clipboard/autofill/session restore or POST-body capture. Static source review found no recovery localStorage/sessionStorage or third-party script addition. No injected analytics, hostile extension or actual mail scanner was executed. Unsupported query secrets may reach HTTP logs before browser code can reject them; never advertise scrubbing as retroactive secrecy.

## Environment and commands actually executed

Windows local workspace, existing Node24.18.0/npm11.16.0 toolchain, Next16.4.1/React19.3.1/Better Auth1.7.9, embedded PostgreSQL18.4. Every database test/lab creates a new disposable isolated cluster, applies existing reviewed migrations, and uses only synthetic example.test identities. No install/upgrade, existing-cluster reset or real mail. In-app browser engine/version not independently identified. Loopback HTTP is not hosted TLS proof.

| Command | Outcome / scope |
|---|---|
| `npm run test:recovery` | **Passed15/15** final suite. Existing14 checks plus reconstructed separate-code delivery/cookie-less reset/reuse denial. Real PG: populated003 upgrade; generic known/unknown/dedupe/address budget; concurrent same/different proof; expiry/replay; session/version/business preservation; retry/timeout/fencing; child worker and DB restart; reset/login/read/TOTP races; rollback/outage; non-owner grants and sensitive-data redaction |
| `npm run test:auth` | **Passed10/10** actual-PG existing identity uniqueness, logout failure/retry/restart, session/permission/TOTP/onboarding and synthetic linking regressions |
| `npm run test:recovery:browser-contract` | **Passed4/4** final pure protocol/VM/locale checks; no real-browser claim from these models |
| `npm run typecheck` | **Passed** final. Initial run Failed on one outdated fixture delivery type; corrected before build and final check |
| `npm run build` | **Passed** Next production web + compiled worker. Harmless build-only env below; no production connection |
| `npm run test:auth:smoke` | **Passed** actual built Next/PG, readiness/migration/drain, protected setup, CSRF/logout retry, separate-code reset and old-cookie denial after process restart |
| `npm run test:smoke` | **Passed** default unconfigured built web/worker, unavailable auth/owner pages and worker restart |
| `node node_modules/tsx/dist/cli.mjs --test --test-name-pattern 'delivery response loss' tests/recovery.test.ts` | **Passed1/1** after making retry assertions redact code-bearing objects even on failure; final typecheck Passed afterward. No runtime change after full15/15 suite |
| `npm run test:recovery:browser-lab` | Used actual built Next, loopback proxy/control panel, new PG and injected memory sink; no product test endpoints. Final supplementary checks ran the same script with existing node/tsx in a hidden bounded background process, because interrupted exec sessions lost their servers |

Build environment: `APP_ORIGIN=http://localhost:3000`, `DATABASE_URL=postgresql://synthetic:synthetic@127.0.0.1:55433/build_only`, `NEXT_TELEMETRY_DISABLED=1`. Exact sequence: set those process variables; `npm run typecheck`; on success `npm run build`. These are harmless build placeholders, not live configuration. Optional recovery/server keys for tests are generated in memory; never copied into this record.

Final hidden lab launch: PowerShell `Start-Process` with resolved existing `node`, arguments `node_modules/tsx/dist/cli.mjs scripts/recovery-browser-lab.ts`, workspace working directory and `-WindowStyle Hidden`; stdout/stderr/pid only under ignored `.local/auth-validation`. Script retains30min bound and fixture `stop` cleanup. Controls manipulate only that new test cluster.

## Actual real-browser scenarios

Source reproducibility: [lab](../../scripts/recovery-browser-lab.ts), [case runner](../../scripts/recovery-browser-cases.mjs). CUA setup selects returned in-app browser2, opens returned lab origin/control as hidden HTTP tabs; imports the runner into that documented browser REPL, passes actual app/panel/browser/origin handles. Executed `suite.run('success')`, `suite.run('errors')`, `suite.run('transport')` yielded B01–B12 Passed. Supplementary direct CUA locator steps below completed the remaining checks after runner interruptions; do not describe them as one uninterrupted automated18-case run.

| Case | Actual result |
|---|---|
| B01 | **Passed:** known/unknown exact202 accepted JSON/status; no timing-equivalence claim |
| B02 | **Passed:** real browser old login → manual code reset → new login; old password and two copied sessions denied, version2; protected bookmark denied after reset |
| B03 | **Passed:** consumed code rejected on explicit retry |
| B04 | **Passed:** malformed/duplicate/unexpected fragments rejected/cleaned; missing proof returns request form, no auto-reset |
| B05/B06 | **Passed:** well-formed invalid and DB-expired codes rejected; old password/version unchanged |
| B07 | **Passed:** short password does not reset; retained-field regression stays fixed |
| B08 | **Passed:** injected persistence failure shows uncertainty, leaves old password/session/version valid; explicit retry after fault removal succeeds |
| B09 | **Passed:** HTML200 gateway response cannot fabricate success |
| B10/B11 | **Passed:** interrupted request acknowledgement dedupes; interrupted committed reset retries report consumed proof; refresh does not repeat mutation |
| B12 | **Passed:** expired owner sessions do not prevent valid recovery |
| B13, direct | **Passed:** hold-after request, disabled pending controls/field,15s uncertainty deadline then retry available; explicit release |
| B14, direct | **Passed:** separate code retained across English locale switch; labeled code/password, Tab then Enter submits, focused success announcement and login link |
| B15, direct | **Passed:** viewport320/768/1440 at height900, no horizontal overflow; override reset afterward |
| B16, direct | **Passed:** proxy scans all received URL/referrer values against delivered code; zero matches. Captured bounded Next logs and browser console contain no delivered code |
| H01, direct | **Passed:** request in one tab; read synthetic clean link/code into REPL memory without printing; create another HTTP tab; fill code, refresh → code/password empty; re-enter code/new password → success. Fixture verification: old password401/new200, copied sessions401/401, version2, final clean URL. Same profile, not two physical devices; PG test separately proves cookie-less reset |
| H02, direct | **Passed:** GET clean link, reload, back, forward leave old password200/new401, sessions200/200 and version1. Only explicit code/password POST then resets. This models harmless preview navigation; no actual email scanner/prefetch engine test |

Direct sequence uses only documented CUA `getByRole/getByLabel`, `click/fill/press`, `goto/reload/back/forward`, condition waits and read-only DOM checks. Recovery code comes from the panel's displayed synthetic notification; never from a product debug API. Final screenshot is code/password-free at ignored `.local/auth-validation/recovery-code-success.png`.

**Bounded history result Passed:** one date-bounded `browser.history` call, query restricted to the final lab origin, limit100, returned4 entries. None contained the actual delivered code. Browser console and proxy/server audit also found no code. [Sanitized JSON](DEC-001-HANDOFF-EXPOSURE-2026-10-19.json) stores only counts/booleans, no raw URLs/code/cookies. This probes one new normal journey, not all browser databases, synchronization, old leaked history or every earlier case.

## Failed attempts, blocked and unexecuted coverage

Initial browser fixture Failed because browser inspection masks password-field values: notification code was unavailable to the reader. Corrected synthetic sink to display code as separate message text; product still masks entry. A supplementary runner attempt queried non-DOM storage state and failed; removed that unsupported assertion. Tab hydration needed a visible-field wait. Later imported multi-tab runner calls were repeatedly interrupted without a completed result and lost lab sessions; direct documented CUA actions completed H01/H02 and B13–16. No interrupted run is counted Passed. An expired-tab browser error page could not be inspected under URL policy; it was left uninspected and the authorized live HTTP lab was opened directly. No policy bypass or alternate browser driver.

Actual physical cross-device, Safari/Firefox/mobile, screen reader, delayed/no-JS/extension/autofill/BFCache/session restore, exhaustive storage/history/sync deletion, email sender/inbox/preview/scanner, hosted reverse proxy/TLS/body logging, distributed timing/IP/global/login/MFA abuse, key rotation/restore/hash/load and production-role deployment: **Not run / blocked on approved configuration or separate scope**. Full T-001/T-002/T-003/T-015/T-016 and production approval remain incomplete. Unchanged27 foundation/onboarding and5 general unit tests were **Not rerun** for this delivery/UI-only slice; existing auth/onboarding smoke and targeted PG tests cover affected invariants. No new cost/pricing claim.

## Decision and next work

DEC-001 stays OPEN; BL-001/003/004 stay In progress. Manual code is a justified local recommendation, not an approved production decision. Required release evidence still includes approved provider/host/budget and manual-code UX/risk; signed callback/account-link boundaries; real sender/scheduler/delivery and hosted logging/HTTPS; independent operator bootstrap/lost-factor ownership; shared abuse controls, secret/hash/rotation/restore/load and runtime-role acceptance. Next independent local engineering task: shared recovery/login/TOTP admission and durable IP/global abuse limits with synthetic concurrency tests; do not shorten codes or configure real email implicitly. Sender/device verification requires separately approved test environment.

Documentation/diff validation and cleanup are recorded in the [active handoff](../agents/handoff-2026-10-19-DEC-001-code.md).

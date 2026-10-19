# DEC-001 / BL-001 recovery validation — 19 October 2026

Status: **OPEN/PARTIALLY VALIDATED**. Recommendation remains conditional Better Auth/PostgreSQL with Auth0 fallback; this is not an approved production decision. [ADR-010](../decisions/ADR-010-password-recovery-outbox.md) supplements immutable ADR-009/006. BL-001/003/004 stay In progress; full T-001/002/003/015 remain incomplete.

## Actual setup and scope

Verified filesystem/terminal access; local master / HEAD `829a46b`. Started with the previous uncommitted hardening work (27 tracked changes plus untracked auth/docs/tests); preserved that work and DEC-002/003. Read AGENTS, agent entry/state/current handoff, decision register/ADR-006/009 and relevant API/security/database/rules/tests. Existing recovery 503 and native installed code were inspected before editing. No existing database reset, commit/push/deploy, external provider/account connection, paid provisioning or external email.

Environment reused: Windows x64, Node 24.18.0/npm 11.16.0, Next 16.4.1/React 19.3.1, TS5.9.3, Better Auth 1.7.9/Kysely0.29.6/pg8.23.1, actual isolated PostgreSQL18.4. No new dependencies/install or version recommendation. Tests create fresh random loopback databases under ignored .local; they do not use runtime DATABASE_URL. Secrets/keys are ephemeral memory/env values, never printed in this evidence. Process/DB restarts refer only to those synthetic instances.

## Implemented and observed

- Reviewed additive auth SQL004, readiness gate and grants. Populated003 upgrade preserves credential/session/metadata/business row digests and session validity; repeat/checksum tests retained. No rewriting app001/002 or auth001–003, data backfill, merge or destructive repair.
- Same public 202 `{accepted:true}` for known/unknown; receipt+token+encrypted job transaction for both. UUID response-loss/concurrent dedupe, 3/hour address budget, unknown jobs never invoke delivery. Injected outbox INSERT failure returns generic503 for known AND unknown; no receipt/token partial commit. Timing attack resistance is **not** demonstrated.
- Single-use expiring reset, library hashing and credential row update atomic with security-version/all-session revocation. Tests reject expired/malformed/reused/same-token races and competing valid tokens; copied cookies deny. Studio/settings/membership/trial/audit records compare unchanged after reset. Simulated failure after password/version writes rolls everything back and permits explicit retry.
- PostgreSQL advisory barriers across two independently constructed adapters: old proof completes before reset then its new cookie denies; reset holds the gate first then old-password login fails. Concurrent authoritative session lookup waits behind reset and denies. Copied pending TOTP proof with a **correct generated code** fails after reset; factor enrollment remains and new-password login still requires TOTP. Factor setup is test-only; no public enrollment/recovery endpoint.
- Synthetic outbox failures reach exactly 3 attempts, safe codes and ciphertext deletion; wrong key cannot deliver. Delivery timeout is bounded and signals cancellation. Lost delivery ack repeats the same job ID/token, never a second password change. A child worker process exits after durable claim, DB restarts, another claim fences old ack; expired jobs cancel. These do not establish real mail provider semantics.
- Non-owner/non-superuser role with reviewed grants executes enqueue/claim/reset and cannot repoint identity or perform DDL. Not deployed role separation.
- Built Next HTTP smoke executes recovery request → in-memory synthetic delivery capture → reset → old password/cookie denial → fresh login; old cookies stay denied after actual Next restart. Migration and synthetic-drain CLIs execute successfully. `/recover` is HTTP200 and UI compiles; interactive recovery-form/browser history/accessibility behavior was **Not run** in this slice. Prior hardening browser evidence is historical and does not prove the new form.

## Exact commands and outcomes

From repository root, PowerShell. Commands requiring PostgreSQL/subprocess/loopback ran with permitted host execution. No automatic-approval rejection occurred.

| Command/action | Result |
|---|---|
| `npm run typecheck` | First run Failed: test union type needed method narrowing for totpURI; corrected assertion, rerun Passed. No runtime assertion weakened |
| `npm run test:recovery` | Passed: final 14/14 actual-PG tests, zero skipped. Earlier suites expanded from 10 to 12 to 13; final includes populated003 upgrade and stronger correct-TOTP/business preservation checks |
| `npm run test:auth` | Passed 10/10 existing hardening tests, zero skipped; guards/logout/account/TOTP regressions retained |
| `npm run check` | Passed: strict types, 5/5 unit, 27/27 foundation/onboarding PG tests, production Next + compiled worker builds |
| `npm run build` | Passed after key separation/state constraints. Later final UUID-casing test exposed an overly narrow inferred UUID helper parameter (Failed typecheck); explicit string type corrected, final build rerun Passed. No runtime assertion weakened or dependency upgrade |
| `npm run test:auth:smoke` | Passed, exit0: actual built Next processes, separate auth migration CLI, recovery/reset, protected API, logout failure/retry and restart, synthetic drain CLI. No real delivery |

Reproducible harmless build configuration used:

```powershell
$env:APP_ORIGIN='http://localhost:3000'
$env:DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:55433/build_only'
$env:NEXT_TELEMETRY_DISABLED='1'
npm run check
npm run build
```

These build-only values do not identify a running server. Auth smoke generates its own origin, instance, keys and database. Final doc/diff/type/default smoke outcomes are recorded in the handoff after execution. Static review covered secret fields, raw API allowlist, SQL ordering/permissions, receipt/lease/response-loss cases and inherited work preservation. CRLF notices are informational.

Final executed checks: `npm run typecheck` Passed; `npm run test:smoke` Passed default unconfigured web/worker; `pwsh -NoProfile -File docs/tools/validate-docs.ps1` Passed61 Markdown/447 local links/2JSON; `git diff --check` Passed; direct PowerShell ReadAllLines/trailing-whitespace check Passed all30 untracked files. Final recovery14/14, auth10/10, build and rebuilt-artifact auth smoke reruns Passed (exit0). Initial read-only `Get-CimInstance Win32_Process` inventory was Blocked by sandbox CIM access, then permitted host rerun succeeded with no matching owned auth-test/PG process; no approval rejection. No commit/push/deploy. Complete current file groups and next task are in the [active handoff](../agents/handoff-2026-10-19-DEC-001-recovery.md).

## Missing evidence / closure ledger

| Closure requirement | Current disposition |
|---|---|
| Chosen provider and funded deployment architecture | OPEN: recommendation only; target budget/approval, maintained release/advisories/hash/load benchmark absent |
| Callback/protected route | PARTIAL: local Next protected routes and historical synthetic callback; signed external callback/HTTPS/proxy not tested |
| Logout | Local subset Passed; hosted replicas/restore and all pending-challenge logout lifecycle remain open |
| Recovery | Local DB/HTTP/reset/races/outbox Passed; real sender/inbox delivery, spam policy, provider idempotency/abort/error handling and scheduled worker not configured or executed |
| Operator MFA | Local factor/session/permission/reset boundaries Passed subset; real authenticator, named bootstrap/lost-factor recovery owner, enrollment/change drill incomplete |
| Secrets/costs/constraints | Local separate key/AEAD/redaction/config/grants subset; managed injection/rotation, request-body/edge logging, shared IP/global/login/MFA limits, abuse/timing/load, hosted costs/roles/TLS/backup/restore remain open |

Not run: hosted CI/Linux, fresh npm ci/audit, unchanged historical spikes, interactive recovery browser journey, true network COMMIT-ack-loss injection, secret rotation/restore reconciliation. Discarded reset response and lost adapter ack are synthetic response-loss tests; they do not claim a transport fault was injected into PostgreSQL COMMIT. Real sender/IdP/target tests are Blocked by absent approved configuration/access/budget; no workaround used competitor/client data. Production closure is therefore not warranted.

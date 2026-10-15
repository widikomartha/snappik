# BL-004 executed implementation evidence

15 October 2026, Asia/Makassar. Starting clean local `master` / `d1686b9`. User subsequently authorized a local BL-004 commit; this evidence accompanies it (resolve SHA with git log). Windows x64 / PowerShell 7.6.5 / Node 24.18.0 / npm 11.16.0; pinned existing manifest/lockfile, no dependency install/change. No subagents, push, deployment, paid service or real-provider connection. Local reads, writes and commands succeeded; private research/accounts/photos unused.

## Outcome and contract boundary

**BL-004 In progress.** The requested approved DEC-001 prerequisite does not exist in the inspected decision register/ADR-004: Better Auth is a conditional candidate only, BL-003 also remains partly gated. No provider was selected or connected by inference. Independent app-side implementation uses an authoritative-session adapter interface; only test-process synthetic adapters resolve sessions. Runtime auth fails closed with 503. This is not real authentication, revocation or account recovery.

- [Service](../../src/modules/onboarding/service.ts): unique immutable provider/subject mapping, user → studio/membership locking, one studio/settings/trial, atomic first setup/audit, identical retry, differing-input conflict, partial settings/trial repair and suspended denial. Email is nonunique metadata, never a lookup/linking key. Trial uses PostgreSQL provisioned_at directly, +168 hours, limit 3, including expired repairs. Existing/revoked grants/defaults are preserved. No migration history was edited.
- [Policy](../../src/modules/onboarding/policy.ts): trimmed Unicode name, canonical slug/reserved names, locale/timezone validation, safe bounded internal `/app` returns, version-1 defaults. [HTTP](../../src/modules/onboarding/http.ts): real Request/Response handlers, no-store DTO allowlist, JSON 401/403/409/503, same-origin POST, 8192-byte body cap, unknown-field rejection and safe retry errors. Runtime `/api/v1/me` and `/api/v1/onboarding` have no fixture auth switch.
- [Setup page/form](../../src/app/onboarding/page.tsx), login/recover/app pages: unavailable/verification/restricted/setup/incomplete/success branches; known inputs seeded, pending state, retry and expired-session input retained in memory, conflict canonical reload, sanitized destination. No login/logout/reset delivery success is fabricated. UI copy is currently Indonesian; authenticated browser/device, English-copy and accessibility validation are not claimed.
- [Grants](../../src/db/onboarding-grants.sql): reviewed service-role extension, tested without superuser/owner authority; no grant update/delete, membership reassignment, operator self-grant or DDL. Service access is trusted, not RLS. No deployed runtime role was configured.

## Executed checks

All final commands run from repository root. DB suites create fresh uniquely named ignored `.local/pg-test-*` clusters on dynamic loopback ports, independent of DATABASE_URL. Real server identifies as PostgreSQL 18.4 x86_64-windows (msvc-19.44.35226). The helper stops its own servers and retains test data. No unknown/shared DB was reset. Final DB/build/smoke used approved local subprocess/loopback permissions; no automatic approval-review rejection.

```powershell
$env:APP_ORIGIN='http://localhost:3000'
$env:DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:55433/build_only'
$env:NEXT_TELEMETRY_DISABLED='1'
npm run check
npm run test:smoke
pwsh -NoProfile -File docs/tools/validate-docs.ps1
git diff --check
```

| Result | Check | Evidence |
|---|---|---|
| Passed | `npm run check`, exit 0 | Next typegen/strict TypeScript, 4 unit, 27 real-PG checks (17 existing foundation + 10 new BL-004), Next production build and compiled worker; zero skipped |
| Passed | `npm run test:smoke`, exit 0 | Actual production web/worker, readiness 503 → real migration CLI → 200, worker restart; unconfigured owner GET/POST return 503/no-store, forged headers/gallery cookie grant no access, foreign Origin returns 403; safe login return and unavailable app/onboarding/recovery pages return without protected data |
| Passed | `pwsh -NoProfile -File docs/tools/validate-docs.ps1` | Final documentation links/examples/ID coverage; see handoff for count |
| Passed | `git diff --check` and final tracked/new-file review | No unrelated changes, secret values, destructive migration or provider integration introduced |
| Blocked | Approved-provider end-to-end login/callback/logout/recovery | DEC-001 open; no approved provider/session schema or authorized dedicated configuration, and this chat excludes real-provider connections |
| Not run | Authenticated browser/device/English/accessibility journey; hosted CI/deployment | Runtime deliberately has no synthetic login; provider/browser integration remains pending |

The first sandboxed DB attempt stalled before a DB connection and was interrupted. Sandbox build failed EPERM creating `.next/server/app/login`. Initial typecheck found a test header-union type issue; corrected. The first PostgreSQL run passed 25/26 and caught a real microsecond loss when trial time passed through JavaScript Date; fixed using INSERT SELECT from studios, preserving exact DB instant. Initial web build passed but compiled-worker typecheck caught Next-only imports in the shared module tree; moved that helper to app/_lib. The final combined check and smoke above passed after those corrections. None of the failed/interrupted attempts counts as passing evidence.

## Acceptance mapping and remaining gaps

| Focus | Completed subset | Remaining full acceptance |
|---|---|---|
| T-001 / REQ-AUTH-001 / BR-TEN-001, BR-ONB-001 | Safe return validator, handler missing/expired/unverified denial, server-clock check after lock wait, safe failure/retry and no protected response from an unconfigured runtime | Approved provider proof/state/PKCE/cookie session lookup, protected bookmark round trip, durable revocation/security-version ordering and copied-cookie logout/restart races, real recovery/throttling/delivery. No logout endpoint exists in this subset |
| T-002 / REQ-TEN-001 / BR-TEN-001 | Implemented `/me` resolves immutable mapping/membership, ignores tenant headers/query/role, POST rejects studio/user/email/role body overrides; equal email and different namespaces yield separate studios. Existing scoped repo/FK tests rerun | Real session integration at every boundary and full later list/detail/edit/export/media/job HTTP matrix. Foundation VerifiedOwner helper remains internal/synthetic, not a real session guard |
| T-003 / REQ-ONB-001 / BR-ONB-001, BR-ENT-001 | Eight concurrent provisions plus eight setup requests yield one mapping/member/settings/trial/audit; conflicting tabs cannot overwrite; DB audit-trigger failure rolls back all row counts and HTTP retry succeeds; expiry while waiting on user lock rolls back setup; missing records recover with original trial time; expired/revoked trial and new sessions never renew | Authoritative callback wiring and authenticated browser visible retry/recovery/incomplete/expiry validation. Defaults/settings profile PATCH routes remain separate revisioned contracts, not implemented here |

No full named acceptance is claimed Passed. Three-project limit is persisted; project creation/quota enforcement belongs to BL-006. Operator/MFA, linking, Drive, media, gallery, payments and deployment remain outside this implementation.

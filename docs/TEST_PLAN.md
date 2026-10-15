# Test and release plan

Status: application acceptance remains planned; **no full acceptance scenario is verified**. BL-001 and BL-002 executed bounded synthetic subsets, detailed below; BL-005 executed a design/prototype review subset. Fastpik live tests are research, not evidence that Snappik passes. Use deterministic clocks, synthetic Drive adapters and at least two tenants. Selected provider smoke tests run only against dedicated test accounts/folders.

## Fixtures and levels

- Studio A with active trial, Studio B with a manual grant, expired Studio C and suspended Studio D.
- Two different Drive file IDs both named `IMG_001.jpg`; a third `IMG_001.JPG` in another folder. Cover, notes, selection and export must preserve identity.
- Nested/empty folders, unsupported/oversized files, deleted source, permissions revoked mid-fetch, pagination and provider throttling.
- Two client grants/tabs editing one set; an expired/revoked grant; a password-protected main menu and separately unprotected download menu.
- Fake clock at one millisecond before, at and after expiry; month/DST boundaries for local display.

Domain tests verify state rules. PostgreSQL integration tests verify actual constraints, locks, rollback and idempotency. Adapter contract tests verify bounded provider behavior. Browser E2E tests verify only meaningful complete user journeys and critical interaction states, not component implementation details.

BL-004 [executed evidence](auth/BL-004-EVIDENCE.md): `npm run test:db` now runs 17 foundation checks plus 10 onboarding checks on isolated real PostgreSQL 18.4. The latter inject synthetic server sessions into the actual domain/Request handlers, without a production fixture login. They cover 8-way provisioning/setup, differing-tab conflicts, rollback/retry after audit failure, expiry while blocked on user lock, email/namespace separation, partial repair/expired and revoked trials, CSRF/body/field/tenant denial, safe returns, suspension, unconfigured/provider uncertainty and least-privilege grants. Production process smoke verifies fail-closed APIs and unavailable pages. Full T-001, full T-002 across later APIs and authenticated-browser T-003 are not passed.

## Acceptance matrix

| Test | Scenario and required assertion | Requirements |
|---|---|---|
| T-001 | Login, protected bookmark, logout, expired session and recovery; safe return URL; no protected response after logout | AUTH |
| T-002 | Substitute Studio B IDs in A list/detail/edit/export/media/job APIs; all fail without data leakage; composite FK rejects cross-tenant writes | TEN |
| T-003 | Retry/concurrently submit onboarding and simulate mid-transaction failure; exactly one studio/settings/trial; visible retry recovers | ONB |
| T-004 | Create and retry same key after response loss; one project/job; different body same key conflicts; simultaneous third/fourth project boundary respects quota | PROJ, REL |
| T-005 | Drive pagination, subfolders, source ID validation, unsupported/oversize/limit errors and interrupted refresh; no silent omissions or false tombstones | DRIVE |
| T-006 | Gallery root/folder/viewer loads canonical IDs with missing-thumbnail fallback; keyboard select vs enlarge distinct; incremental loading bounded | GAL |
| T-007 | Save up to quota, attempt one extra via direct API, select duplicate filenames as separate IDs; stale revision rejected; no acknowledged loss | SEL, REL |
| T-008 | Save Unicode/plain-text note at 500 and reject 501 code points; note survives refresh/export, HTML does not execute | NOTE |
| T-009 | Confirm while another tab saves: only valid current revision wins; no more than one confirmation per key/revision; all changes blocked while confirmed | CONF, REL |
| T-010 | Owner reopens with reason; current choices retained, historical snapshot unchanged; client can edit only after canonical state refresh; expired owner cannot reopen | CONF |
| T-011 | Export confirmed vs reopened draft deliberately; IDs/name/path/case/notes and revision match exactly; formula-like CSV values cannot execute on open | RESULTS |
| T-012 | Independent passwords/deadlines, precise expiry boundary, link rotation/menu disable/suspension; stale session cannot fetch even cached media | ACCESS, PRIV |
| T-013 | Download valid image with download grant; main-only grant denied; missing source/timeout/malformed oversized response handled without partial success | DL |
| T-014 | Trial starts once; quota counts non-archived projects; expired owner read/export allowed but writes denied; existing client expiry independent | ENT, TRACK |
| T-015 | Operator diagnostics omit gallery contents; wrong permission denied; grant/suspend/reactivate require reason and audit atomically; reactivation doesn't renew entitlement | OPS, OBS |
| T-016 | 360/768/1440 widths, 200% zoom, keyboard journey/dialog focus, screen-reader status, ID/EN interpolations and light/dark contrast | UX |
| T-017 | Worker crash/lease expiry, duplicate execution, 429 backoff and exhausted retries; state visible; no duplicate business records | REL, OBS |
| T-018 | SSRF URL/redirect variants, XSS strings, CSRF rejection, response/log redaction and private storage access; no shared gallery in sitemap | PRIV |
| T-019 | Archive denies client access; restore before 30 days retains dates/choices and checks quota; purge after window removes derived records only; restore/purge race safe | RET |
| T-020 | Restore database/object metadata backup in staging; reapply newer revocations/deletions before access; demonstrate proposed RPO/RTO targets | RET, OBS |
| T-021 | Dashboard totals, selecting/confirmed filters and next-seven-day deadlines match DB after create/confirm/reopen/archive; polling timestamps reflect freshness | TRACK |
| T-022 | Pilot load fixture: p95 save/confirm target, warm/cold gallery timings, memory/DB connection bounds and provider rate limiting reported | GAL, DL, OBS |

## BL-003 local foundation subset — 15 October 2026

[Foundation evidence](foundation/BL-003-EVIDENCE.md) records executed `npm run check`: 4 unit + 17 PostgreSQL 18.4 integration tests Passed, strict TypeScript and both builds Passed; `npm run test:smoke` verifies actual production process/CLI readiness. The harness creates a fresh isolated cluster, never resets a runtime URL. It tests scoped repository/FK denial (T-002 foundation), synthetic effect/job/audit/idempotency transaction/replay (T-004 foundation), real killed-process expiry/renewal/fencing/backoff/exhaustion (T-017 foundation), restricted role and migration compatibility. Complete HTTP/auth, quota and actual inventory/provider scenarios remain untested. This does not pass those full tests or implement adjacent backlog IDs.

## Critical race tests

Use separate database connections and barriers to run competing operations; do not rely on timing-only sleeps. Test confirm vs save, confirm vs source removal publication, config quota reduction vs save, archive vs download authorization, restore vs purge and concurrent trial quota consumption. Allowed outcomes must follow the lock order and revision contract. Assert records, not merely response status.

## Browser matrix

Current supported stable Chrome/Edge desktop, Firefox desktop and Safari desktop/iOS; Android Chrome. Record exact tested versions at execution rather than freezing current versions in this plan. Test at least one actual iOS/Android device before claiming gesture/download support. Automated emulation is supplemental evidence.

## Release gate

1. All MVP requirements map to executed passing tests; integration/E2E results include build/migration IDs.
2. No unresolved P0/P1 issue; P2 issues have an explicit launch disposition and owner.
3. Threat controls, deletion and restore drill pass; DEC-001/002/003/006 closed before applicable production access.
4. Providers have bounded operational configuration; deployment/rollback performed in staging.
5. No real audit subject photos or Fastpik credentials in public assets, fixtures or logs.

Performance targets are measured under the PRD fixture and deployment settings. Record failures honestly; do not relabel untested as passed. The docs-only validation checks links and traceability, not any runtime acceptance scenario.

## BL-001 executable subset — 15 October 2026

Run `npm --prefix spikes/bl001-auth test` from repository root. Actual Better Auth 1.7.9 handlers plus synthetic OAuth/mail/memory storage passed 18/18 checks. [Evidence](auth/BL-001-EVIDENCE.md) records exact commands, failures corrected, environment and limits; [candidate contract](auth/SESSION_CONTRACT.md) defines pending server/persistence obligations.

T-001 subset covers credential login, callback/return/state/PKCE, expiry, logout/error and recovery. T-015 subset covers permission plus current-session TOTP, including OAuth bypass of the library's credential challenge. Neither full acceptance test is Passed. No browser/Next.js server, real provider/delivery, PostgreSQL constraints/races or operator business operations were exercised.

For authorized integration, replay each synthetic scenario through the actual HTTPS callback and Next.js protected bookmark/API; use isolated verified accounts plus a real test authenticator and email inbox. Assert wrong issuer/audience/signature/nonce, expired/consumed code/state and denial on copied cookie after logout, restart and a second web process. With separate PostgreSQL connections/barriers, assert mapping/account uniqueness, competing link/reset and logout versus authorization. Preserve acknowledged records and fresh-reauth/MFA on recovery. Record build/config/schema and provider/environment, with sanitized results. Missing authorization/config remains Blocked, not Passed by the synthetic fixture.

## BL-002 executable feasibility subset — 15 October 2026

Run `npm --prefix spikes/bl002-drive test` from repository root (Node built-ins only, no install). 29/29 offline checks Passed: identity/path/key descriptors, pagination/skip counters, 5,000 images, depth 10, 50 MiB inclusive limits and over-limit failure, incomplete/revoked scans, bounded retries/deadlines and byte-counted temporary staging with injected policy checks. [Evidence](drive/BL-002-EVIDENCE.md) records commands/environment, sizing hypotheses, exact authorized-provider protocol and unsupported modes; [contract](drive/ADAPTER_CONTRACT.md) separates local seams from production obligations.

T-005/T-013/T-017/T-022 remain unverified in full. No real Drive folder/account, OAuth/API key, web proxy, worker, PostgreSQL lease/publication race, production decoder, private bucket, backup restore, browser or PRD pilot load was tested. Dedicated folders are unavailable by user confirmation. DEC-002/003 stay open; do not turn synthetic rate errors or a local disk sample into provider/load acceptance.

## BL-005 design/prototype subset — 15 October 2026

Run `npm --prefix prototypes/bl005-ux run check` and `npm --prefix prototypes/bl005-ux test`. Ten local design checks Passed; [evidence](design/BL-005-EVIDENCE.md) records executed browser review and remaining limits. [Prototype README](../prototypes/bl005-ux/README.md) gives reproducible review steps; [UX specification](design/BL-005-UX.md) defines tokens and component behavior.

Design-relevant T-006 subset: synthetic stable IDs/duplicate names, folders/empty state, missing-thumbnail fallback, distinct keyboard select/enlarge and bounded fixture batches. Design-relevant T-016 subset: 360/768/1440 browser viewports, ID/EN, modal Tab/Escape/focus return, semantic contrast and 200% text reflow. **Wireframes and memory simulations are not full runtime acceptance passes.** Native 200% browser zoom, screen-reader output, real iOS/Android, Firefox/Safari, integrated keyboard journey, canonical server data/media, database locks and provider-backed recovery remain Not run. BL-005's Done status covers design only; BL-009/016 and related server work retain their own acceptance gates.

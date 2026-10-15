# Test and release plan

Status: application acceptance remains planned; **no full acceptance scenario is verified**. BL-001 executed a bounded synthetic subset, detailed below. Fastpik live tests are research, not evidence that Snappik passes. Use deterministic clocks, synthetic Drive adapters and at least two tenants. Selected provider smoke tests run only against dedicated test accounts/folders.

## Fixtures and levels

- Studio A with active trial, Studio B with a manual grant, expired Studio C and suspended Studio D.
- Two different Drive file IDs both named `IMG_001.jpg`; a third `IMG_001.JPG` in another folder. Cover, notes, selection and export must preserve identity.
- Nested/empty folders, unsupported/oversized files, deleted source, permissions revoked mid-fetch, pagination and provider throttling.
- Two client grants/tabs editing one set; an expired/revoked grant; a password-protected main menu and separately unprotected download menu.
- Fake clock at one millisecond before, at and after expiry; month/DST boundaries for local display.

Domain tests verify state rules. PostgreSQL integration tests verify actual constraints, locks, rollback and idempotency. Adapter contract tests verify bounded provider behavior. Browser E2E tests verify only meaningful complete user journeys and critical interaction states, not component implementation details.

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

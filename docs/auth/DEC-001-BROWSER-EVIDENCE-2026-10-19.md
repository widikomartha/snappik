# DEC-001 browser recovery evidence — 19 October 2026

Status: **OPEN/PARTIALLY VALIDATED**; BL-001/003/004 In progress. [ADR-011](../decisions/ADR-011-browser-recovery-boundary.md) supplements ADR-009/010. Actual startup: clean local d4edac1; branch main confirmed at commit; local files inspected, not GitHub. User subsequently authorized a local commit; no push, deployment, external account/provider/email or existing-data reset.

## Setup and reproducibility

Existing Windows x64, Node24.18.0/npm11.16.0, Next16.4.1/React19.3.1, Better Auth1.7.9, PostgreSQL18.4. No dependency install/upgrade. Actual Codex in-app browser through documented CUA APIs; exact engine version unavailable. Fixtures use newly generated isolated PG clusters and random loopback ports, existing migrations and native library hashing/session cookies. A separate loopback panel controls only disposable fixtures and captures delivery links in memory; it is not a product endpoint or external sender. A synthetic reverse proxy injects HTML200, held and dropped responses after the real backend. No raw request body/token/cookie/key is logged or written to results. Test directories and screenshot remain ignored.

Commands from repository root:

```powershell
npm run test:recovery:browser-contract
$env:APP_ORIGIN='http://localhost:3000'
$env:DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:55433/build_only'
$env:NEXT_TELEMETRY_DISABLED='1'
npm run build
npm run test:recovery:browser-lab
```

The lab prints only origin/panel/start metadata. In CUA, bind its actual app/panel tabs, import [cases](../../scripts/recovery-browser-cases.mjs), and pass the documented browser handles:

```javascript
const suite = recoveryBrowserCases({app, panel, browser, origin});
await suite.run('success');
await suite.run('errors');
await suite.run('transport');
await suite.run('usability');
```

The final clean matrix ran all four sections in one browser call (about32 seconds), on the final built artifact. [Sanitized JSON](DEC-001-BROWSER-RESULTS-2026-10-19.json) stores only case IDs/statuses/environment and the history finding. No bearer URLs. Browser screenshot: ignored `.local/auth-validation/recovery-browser-success.png`; not a public asset or portable acceptance substitute. Stop via the fixture panel stop action or Ctrl+C;30-minute automatic bound is a last resort.

## Executed browser cases

| Cases | Observed result |
|---|---|
| B01 | Passed: known/unknown browser requests share exact202/JSON and UI acknowledgement. Unknown delivery never substitutes a real account. No statistical timing claim |
| B02 | Passed: real browser login → recovery request/link → reset; browser old password denied/new password reaches onboarding. Two additional copied native fixture cookies fail actual Next protected APIs; browser's pre-reset cookie also returns to login |
| B03–B06 | Passed: consumed token; same-document hash navigation; malformed/duplicate/extra/missing fragment; invalid well-formed token; expired token. Visible URL scrubbed; refresh returns request instructions without token persistence |
| B07 | Passed: keyboard short-password attempt rejected without credential/version mutation. Regression catches retained email/password field reuse; no second hash algorithm |
| B08 | Passed: real PG trigger injects persistence failure →503/uncertain UI, original password/version unchanged; explicit retry after removing fixture failure succeeds |
| B09 | Passed: HTML200 gateway response without backend persistence is not accepted as success |
| B10–B11 | Passed: dropped response after commit; transparent browser-transport replay observed. Request receipt increases once, stable request-ID retry dedupes; reset commits once and consumed token fails. Uncertain or safely replayed/consumed outcomes guide new-password login. Refresh does not resubmit |
| B12 | Passed: expired owner sessions do not invalidate a valid independent recovery proof; reset still succeeds and old sessions deny |
| B13 | Passed: pending button/fields disabled; actual15-second deadline becomes uncertain and re-enables retry; releasing a stale held response does not fabricate completion |
| B14 | Passed: ID/EN labels/instructions, English reset, keyboard Tab/Enter submission and success action. AX reports focused status/alert; this is not a real screen-reader test |
| B15 | Passed:320/768/1440×900 viewport checks, scrollWidth<=clientWidth; temporary viewport reset. Not native-device/cross-engine coverage |
| B16 | Passed: synthetic proxy request/referrer audit and known-token scan of Next logs show no unintended token request/referrer/server-log leakage. Reset POST body is the intended transmission |
| Additional history probe | **Failed requirement / OPEN:** bounded query for only this lab origin/time found13 entries and retained original token-fragment URLs. Visible/current-entry cleaning is not global history erasure; no raw history URLs retained in artifacts |

## Fixes, initial failures and limits

Implemented strict acknowledgement/parser helpers, static early capture, hash navigation, form revision/input clearing, malformed-link instructions, localized copy, focus/alerts, responsive fields and bounded fetch. API DTOs, auth migrations and backend security/version transactions unchanged.

Initial fixture IPC was Blocked by browser environment EPERM; replaced with a separate loopback panel. Native fixture controls required explicit client submission. Initial test assumptions were corrected for the real onboarding return query, asynchronous hydration/hash/pending state, duplicate Next alert nodes, built-in login budget and transparent transport replay. Fixture sessions now use native signed library sessions without consuming/disabling the production process's login limits; browser login is separately exercised. Long wait uses bounded condition polling around the bridge's short waits. Assertions still require actual DB/version/session outcomes. The retained-input failure was an application defect and was fixed before the final16/16 run. Old interrupted/expired labs were stopped or reached their bound; no completion inferred from aborted tool calls.

Automated commands executed: `npm run typecheck` Passed; `npm run test:recovery:browser-contract`4/4 Passed; `npm run build` Passed final Next+worker build; `npm run test:auth`10/10 Passed; `npm run test:recovery`14/14 actual-PG Passed. Final documentation/diff/smoke checks and cleanup are recorded in the handoff.

Not run: statistical enumeration timing/load, blocked-chunk pre-hydration browser timing (the bootstrap VM model is synthetic), external mail/provider/HTTPS, native Safari/Firefox/iOS/Android, real screen reader, global history/sync erasure or a new bearer-free handoff, hosted rotation/restore/CI. Unchanged foundation/onboarding suites were not repeated because no persistence/domain change; actual browser tests do exercise protected APIs and failure rollback. Production sender/scheduler/host/budget/operator recovery/shared-abuse/key/hash/restore gates remain. Local browser success does not close DEC-001.

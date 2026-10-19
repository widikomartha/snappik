# ADR-011: browser recovery handoff and acknowledgement boundary

Date: 19 October 2026 (Asia/Makassar). Status: **local corrections implemented; browser-history requirement OPEN; DEC-001 OPEN/PARTIALLY VALIDATED**. Supplements [ADR-010](ADR-010-password-recovery-outbox.md) and ADR-009 without rewriting their history. Baseline: clean local d4edac1; branch main confirmed at commit. The user authorized browser recovery verification, necessary fixes and subsequently a local commit; no external delivery or deployment.

## Observed problems and decision

The existing effect ran once: hash-only navigation on an already open recover page left the fragment visible and did not process the new link. Malformed links silently showed a request form. HTTP200 with an injected HTML gateway body fabricated acceptance. Only Indonesian copy existed despite the ID/EN contract. Keyboard testing also exposed React reusing an uncontrolled email input as the password input: retained email plus typed short text could become a valid-length, unintended password. PostgreSQL correctly validated that actual submitted value; the defect was field reuse.

Use a static parser-time script to scrub the visible URL/current entry before hydration, with a one-shot memory bridge and hashchange notification. Strictly parse one token field; never persist the fragment in DOM attributes, local/session storage or history.state. Remount the form with a numeric revision for every new handoff, clearing field values without using a secret as a React key. Locale changes preserve the current form and use only a safe lang=en query. Recovery-only ID/EN messages, labels, status/alert semantics and focus handling do not introduce an application-wide localization system.

Require the exact documented JSON/status/content-type acknowledgement, not Response.ok alone. Unexpected/truncated responses remain uncertain. Preserve retry input/request ID, disable fields while pending, guard duplicate submits and bound fetch/body waiting to15 seconds. Lost acknowledgement can mean committed reset; a consumed-token message explicitly offers trying the new password. No auto-login, provider/crypto/schema change, MFA bypass or raw API exposure.

## History limitation and alternatives

**Observed failed requirement:** a focused browser-history query over13 synthetic entries found original token-fragment navigation URLs even after replaceState cleaned the visible URL/current entry. A page cannot promise that scrubbing erases global history, synchronization, browser instrumentation or inbox records. Copy now states that browsers may retain the original URL. Expiry/single-use reduce exposure but do not establish history confidentiality.

Retain the existing local fragment flow for validation, with this explicit open production gate. Do not clear user browser history or silently invent another recovery protocol. Before production, evaluate a handoff that avoids bearer material in navigation URLs (for example, separately entered recovery proof), or obtain an explicit reviewed threat-model disposition with evidence. This is a proposal, not an approved production protocol or permission to build unrelated auth features. Baseline unavailable recovery without the configured key remains the fallback; changing provider does not itself resolve browser history.

## Evidence and consequences

[Evidence](../auth/DEC-001-BROWSER-EVIDENCE-2026-10-19.md) and [sanitized results](../auth/DEC-001-BROWSER-RESULTS-2026-10-19.json):16 real-browser positive cases Passed against built Next/PostgreSQL and synthetic delivery; history confidentiality Failed/open. Four pure helper tests are synthetic models, not browser evidence. Existing auth/recovery PG regressions Passed. No real sender/IdP/hosting proof, timing-resistance claim, real screen-reader/mobile-engine or pre-hydration delayed-network drill.

Reconsider on handoff/CSP/browser/Next changes or production rollout. Owning API, Security, session contract, test records, decision register, status/backlog and handoff are updated. Persistence/business rules remain unchanged; app/auth SQL and native hashing/revocation were preserved. BL-001/003/004 remain In progress.

# BL-001 executed evidence

15 October 2026. Local Windows/PowerShell 7.6.5, Node v24.18.0, npm 11.16.0. Starting `master` / HEAD `f669f52`; initial worktree clean under approved local execution. Read/write verified with a temporary synthetic file, then removed. Sandbox Git initially failed with worktree/permission errors; approved execution succeeded. No Git config changed.

Build: uncommitted BL-001 worktree with exact [source/lockfile](../../spikes/bl001-auth/README.md). No application build, real IdP or DB. All mail/accounts/OAuth/memberships are synthetic. No listener or external auth connection.

## Executed commands

| Command from repository root | Result | Observation |
|---|---|---|
| `git status --short`, `git log -1 --oneline`, `git branch --show-current` under approved execution | Passed | Initially clean master / f669f52 move audit |
| `node --version`, `npm --version`, `pwsh --version` | Passed | Versions above |
| `npm view better-auth version engines license dist.integrity --json` | Passed | 1.7.9 / MIT / integrity matches lockfile; no engines returned |
| `npm view @auth0/nextjs-auth0 version engines --json` | Passed | 4.32.0, not installed |
| `npm view @supabase/ssr version engines --json` | Passed | 0.12.7, not installed |
| `npm view @supabase/supabase-js version engines --json` | Passed | 2.117.3 / Node >=22, not installed |
| `npm install --prefix spikes/bl001-auth --ignore-scripts --no-fund --no-audit` | Passed | 22 packages; isolated lockfile, no install scripts |
| `npm --prefix spikes/bl001-auth test` first run | Failed | 13/15 passed: library accepts expiry equality; TOTP test mistakenly passed URI base32 as raw secret |
| Same test command after corrections | Passed | 15/15: explicit expiry guard, corrected test-only secret extraction; assertions retained |
| Same test command with added denial/outage cases | Passed | 18/18, zero skipped, exit 0, about 2 seconds |
| `npm --prefix spikes/bl001-auth audit --omit=dev --json` | Passed | 0 advisories reported; point-in-time registry result, not security certification |

Final documentation/diff results: [dated handoff](../agents/handoff-2026-10-15-BL-001.md). npm ci is documented for reproducibility, not executed here because install already generated the tree.

## Coverage limits

| Target | Passed local subset | Remaining acceptance |
|---|---|---|
| T-001 login/bookmark | Verified credential flow; wrong/unverified rejection; actual callback; PKCE challenge/verifier continuity; return allowlist | Browser/Next.js/real callback Blocked on target environment and authorized IdP config |
| T-001 errors/retry | Missing/wrong state, absent cookie, replay, consent denial, synthetic exchange failure then fresh retry | Real network, signed OIDC/JWKS/issuer/audience/nonce and concurrent uniqueness Not run |
| T-001 expiry | Deterministic Date one millisecond before/at expiry; guard denies equality; synthetic acknowledged map unchanged; relogin works | Durable business data/UI pending-state recovery Not run; app absent |
| T-001 logout | Old cookie denied, repeated logout, cross-origin rejection; injected delete failure reproduces library 200 and guard 503 | Durable shared revocation/restart/in-flight ordering/browser cache Not run; PostgreSQL/app required |
| T-001 recovery | In-memory verification/reset mail; known/unknown body/status match; expired/reused reset denied; old password/sessions revoked | Actual delivery/timing/throttling/concurrent reset Not run; approved email config absent |
| Mapping/linking | Namespace+subject mapping; implicit verified/unverified collision rejection; explicit unverified denial/verified linking retains user | Real constraints, audited reauth wrapper and races Not run |
| T-015 auth | Permission plus recent same-session MFA; actual TOTP enrollment/credential challenge; OAuth cannot inherit enrollment/other session assurance; store outage denies | Full diagnostics/reasoned audited grants/suspension are BL-014, not completed |

Findings tied to installed 1.7.9 source: dist/api/routes/session.mjs, dist/api/routes/sign-out.mjs, dist/plugins/two-factor/index.mjs. Tests intentionally assert observed library behavior so upgrades force review. Ignored node_modules were not modified/vendored. Hash parameters read from locked @better-auth/utils 0.5.0; no production benchmark.

Full T-001/T-015 are not Passed. DEC-001 open; BL-001 In progress. No persistence/provider readiness, commit or deployment claimed. [ADR-004](../decisions/ADR-004-auth-session-feasibility.md) contains official sources and gates.

## Final artifact identity and review

SHA-256 after final source normalization (15 October 2026):

- package-lock.json: 09E992A50EA8902BF83A1632C800E00FE9B5833F17B650D654FA7AA8DB983B94
- harness.mjs: 209E5A6C768FE7E80A946751E9A97AA8E861C13AD7DB696A3F66D483547F492B
- auth.test.mjs: C978BD06278BE969D5F9EAFAAFC243AD63169895DFFD5493F62463CFF5477D0E

`pwsh -NoProfile -File docs/tools/validate-docs.ps1`: Passed, 34 Markdown files, 136 local links, 2 JSON examples. `git diff --check`: Passed after removing extra EOF blank lines. Direct whitespace check of 10 new files: Passed. Both `node --check spikes/bl001-auth/harness.mjs` and `node --check spikes/bl001-auth/auth.test.mjs`: Passed. `npm --prefix spikes/bl001-auth ls --depth=0`: Passed with better-auth@1.7.9. Tracked diff/new file contents reviewed for BL-001 scope. Git LF/CRLF conversion notices were warnings, not failed content checks; no repository config changed.

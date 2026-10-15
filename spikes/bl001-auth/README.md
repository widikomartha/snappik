# BL-001 auth/session feasibility spike

Date: 15 October 2026. **Synthetic only.** Isolated executable investigation, not the Snappik scaffold. Actual Better Auth Request/Response handlers run against its memory adapter. Email is captured in process. OAuth token exchange and user info are injected fixtures; no real IdP, SMTP, network callback, Next.js server or PostgreSQL is exercised.

From the repository root with Node 24.18.0/npm 11.16.0:

```powershell
npm --prefix spikes/bl001-auth ci --ignore-scripts --no-fund --no-audit
npm --prefix spikes/bl001-auth test
npm --prefix spikes/bl001-auth audit --omit=dev --json
```

Installation/registry access requires applicable workspace permission. No install scripts, environment variables or listening port are needed. All `example.test` accounts/passwords are fixtures. Encryption keys are random per instance and discarded.

- [harness.mjs](harness.mjs): candidate policies, library configuration and fixture boundaries.
- [auth.test.mjs](auth.test.mjs): 18 checks targeting parts of T-001/T-015, not full acceptance.
- [Decision](../../docs/decisions/ADR-004-auth-session-feasibility.md), [contract](../../docs/auth/SESSION_CONTRACT.md), [evidence](../../docs/auth/BL-001-EVIDENCE.md).

Every test has fresh in-memory data. Membership fixtures do not perform onboarding. Protected responses are harness function results, not deployed routes. Cookie merging simulates a browser. TOTP uses test-only decrypted fixture material and the library generator; this proves challenge wiring, not authenticator interoperability.

Revocation/MFA Maps are non-durable: do not copy them into production. SQL uniqueness, multi-instance revocation, restart and races require PostgreSQL. An independent acknowledged-state Map demonstrates that expiry does not mutate that fixture; it cannot prove persistence of Snappik selections. DEC-001 remains open.

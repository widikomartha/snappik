# BL-001 auth/session feasibility spike

Updated: 18 October 2026. **Synthetic identities only.** Isolated executable investigation, not the Snappik scaffold. Actual Better Auth Request/Response handlers run against its memory adapter or a fresh real local PostgreSQL cluster. Email is captured in process. OAuth token exchange and user info are injected fixtures; no real IdP, SMTP, network callback or Next.js server is exercised.

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

Every memory-suite test has fresh in-memory data; the PG suite below shares only its newly generated cluster. Membership fixtures do not perform onboarding. Protected responses are harness function results, not deployed routes. Cookie merging simulates a browser. TOTP uses test-only decrypted fixture material and the library generator; this proves challenge wiring, not authenticator interoperability.

Revocation/MFA Maps are non-durable: do not copy them into production. An independent acknowledged-state Map demonstrates that expiry does not mutate that fixture; it cannot prove persistence of Snappik selections. DEC-001 remains open.

## PostgreSQL follow-up — 18 October 2026

Uses the already installed root `pg`, `tsx`, embedded PostgreSQL and [isolated cluster helper](../../scripts/test-postgres.ts), plus this spike's unchanged Better Auth 1.7.9 lock. Both root and spike dependency trees are prerequisites; no additional package was installed in this follow-up.

```powershell
npm --prefix spikes/bl001-auth run test:postgres
```

[postgres.test.ts](postgres.test.ts) creates a new loopback cluster under ignored `.local/pg-test-<uuid>`, applies the pinned library's generated schema only there, stops/restarts its own cluster and retains its synthetic data. It never reads DATABASE_URL or `.env.local`. [postgres-observer.ts](postgres-observer.ts) checks copied cookies from a separate Node process, using ephemeral secret/config via IPC rather than command arguments/logs. Subprocess/loopback permissions are necessary. Do not point this harness at an existing database.

5/5 checks Passed: callback/session read across instances, copied-cookie denial after successful deletion and database restart, real deletion-error reproduction, concurrent reset with both reads synchronized before consumption, account/session constraints. The raw generated account schema **accepts duplicate provider/subject pairs**; the last check reproduces this defect, removes its duplicate and proves a candidate unique index in the test cluster. A passing finding test does not mean the original schema meets production requirements. Raw logout likewise still returns 200 on delete failure. No application migration or durable revocation/MFA guard was implemented.

Current [ADR-006](../../docs/decisions/ADR-006-auth-session-postgres-validation.md) and [evidence](../../docs/auth/DEC-001-EVIDENCE-2026-10-18.md) retain ADR-004 history and list remaining gates, exact outcomes and initial failures. Protected owner responses here still use fixture mappings/memberships; this is not an authenticated Next.js/browser or live-provider flow.

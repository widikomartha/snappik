# ADR-004: auth/session feasibility for DEC-001

Date: 15 October 2026. Status: **conditional recommendation; DEC-001 open; BL-001 In progress**. Scope: BL-001 only; no production provider approved/connected.

## Context and hypothesis

The local repository was clean on `master`, HEAD `f669f52`, with documentation only: no application manifest, lockfile or active dated handoff. Architecture proposes TypeScript/Next.js, same-origin web/API, PostgreSQL and a separate worker. DEC-003 has not chosen hosting, region, pooler, budget or topology. Compatibility with an actual host cannot be claimed. Node 24.18.0/npm 11.16.0 are the tested local runtime, not production selections.

Hypothesis: a maintained library with database sessions can meet the baseline without tying hosting to an auth vendor. Mapping: REQ-AUTH-001 → BR-TEN-001 / BR-ONB-001 → BL-001 / BL-004 → T-001. Operator implications: REQ-OPS-001 → BR-OPS-001 → BL-014 → T-015. No provisioning, studio APIs or operator business mutations belong to this spike.

## Official-source comparison

Public documentation/npm metadata inspected 15 October 2026. Prices/versions are point-in-time observations. Alternatives were researched, not integrated.

| Approach | Fit with intended deployment and session boundary | Linking / recovery / operator MFA | Cost assumptions |
|---|---|---|---|
| Better Auth 1.7.9, self-hosted library | Standard Request/Response handler, Next.js integration, PostgreSQL support. Requires Node-capable HTTPS web runtime, reachable DB, schema ownership, shared rate limits and delivery service. Disable cookie session cache/sliding refresh for candidate policy. Worker receives no cookies. | Explicit linking supported: disable implicit linking; no trusted-provider override. Library handles hashes/reset/TOTP. Credential MFA challenge does not automatically cover OAuth: require additional session-specific operator assurance. | Installed package MIT; no library MAU fee assumed. Hosting, DB, email, backups, monitoring, patching and credential operations remain unpriced. No managed SLA purchased. |
| Supabase Auth, managed | SSR uses cookie-carried JWT/refresh credentials. Requires a Supabase project even if business DB is elsewhere. Verified identity/current session checks required; offline JWT validation alone cannot prove immediate copied-cookie logout. | Automatic same-email linking has verified-email safeguards; manual linking documented as beta. TOTP provides aal2; server must enforce it. Recovery requires email delivery. Default linking differs from explicit-only candidate, requiring its own spike. | Public Free $0 / Pro from USD 25 monthly with 100K MAU. Compute/projects, overages, email and advanced MFA may add cost. Free is not assumed adequate for production controls/backups. |
| Auth0 managed + Next.js SDK 4.32.0 | Hosted login/callback supported. SDK stateful session store can support app-side revocation; encrypted cookie-only sessions do not establish copied-cookie denial. Adds tenant/service and logout configuration dependencies. | Identities separate by default; explicit linking needs proof of both accounts and plan eligibility. Hosted password recovery/MFA supported. Snappik still owns operator permissions and recent-session assurance checks. | Public B2C monthly page: Free up to 25K MAU; Essentials USD 35 at 500 MAU with Pro MFA; Professional USD 240 at 500 MAU. B2B/features/add-ons differ. Confirm actual TOTP/linking entitlement; trial availability is not production entitlement. |

Better Auth sources: [installation/PostgreSQL](https://better-auth.com/docs/installation), [Next.js](https://better-auth.com/docs/integrations/next), [sessions/caching](https://better-auth.com/docs/concepts/session-management), [linking](https://better-auth.com/docs/concepts/users-accounts), [MFA limitations](https://better-auth.com/docs/plugins/2fa), [release 1.7.9](https://github.com/better-auth/better-auth/releases/tag/v1.7.9). License/version also checked in installed package/lockfile.

Supabase sources: [SSR verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [SSR security](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [sessions/sign-out](https://supabase.com/docs/guides/auth/sessions), [linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [pricing](https://supabase.com/pricing).

Auth0 sources: [Next.js quickstart](https://auth0.com/docs/quickstart/webapp/nextjs), [SDK/session store](https://github.com/auth0/nextjs-auth0), [linking/plan caveats](https://auth0.com/docs/manage-users/user-accounts/user-account-linking), [recovery](https://auth0.com/docs/authenticate/database-connections/password-change), [MFA](https://auth0.com/docs/secure/multi-factor-authentication), [pricing](https://auth0.com/pricing).

Cost comparison assumes 10 synthetic studios/owners and <=2 operators; account-free gallery viewers are not auth MAU. No SMS, enterprise SSO, paid support or custom domains. USD figures exclude tax/conversion and are not budget approval. DEC-003 must price the full system; DEC-006 must review processors/region/retention.

## Recommendation and experiment

Prefer **Better Auth with PostgreSQL server sessions**, conditionally. This engineering inference fits the existing data boundary and explicit linking policy without requiring a database vendor. It does not prove self-hosting cheaper or compatible with the eventual host. Auth0 is a managed fallback if outsourced credential operations are required and features funded. Revisit Supabase if DEC-003 chooses that platform and linking/session semantics are explicitly accepted.

The [isolated spike](../../spikes/bl001-auth/README.md) pins Better Auth 1.7.9 with npm lockfile. Actual library handlers exercise password verification/reset, state/cookies, callback, linking and TOTP. Token exchange/user info, email, app mappings, memberships and revocation/MFA stores are synthetic. It does not verify real signatures/JWKS, issuer, audience, nonce, callback registration or redirects over a network. No competitor data/credentials used.

**18/18 local checks Passed**. Exact commands, initial failures and limits: [evidence](../auth/BL-001-EVIDENCE.md). The [candidate contract](../auth/SESSION_CONTRACT.md) distinguishes verified local policies from unimplemented persistence/provider requirements.

## Material findings

1. The installed DB session route accepts equality at expiresAt (`< now`). Harness adds `now >= expires_at` denial; carry this into the server/data boundary.
2. The installed logout route catches deletion errors and may return HTTP 200 while the old cookie still resolves. Reproduced locally. Snappik must commit shared revocation before success; storage uncertainty returns retryable failure. Harness tombstones are not durable/multi-instance proof.
3. twoFactorEnabled is enrollment, not current-session MFA. OAuth can create a session without the credential MFA challenge. Every operator route additionally needs recent TOTP bound to that session and current explicit permission.
4. Verified/unverified same-email implicit linking is rejected in the spike. Explicit verified same-email linking retains library/app user; unverified explicit linking fails. Email never maps tenants. Merging existing app accounts/studios and unlinking are excluded.
5. Self-hosted library account tables own hashes; Snappik users do not. Observed locked scrypt defaults: N=16384, r=16, p=1, output 64 bytes, random 16-byte salt. This is not a production resource benchmark/security review. [Password/reset docs](https://better-auth.com/docs/authentication/email-password) explain library responsibility. Gallery hashing is separate.

No PRD scope or business invariant changed. API delegated auth routes were underspecified; Database lacked owner-session security metadata. Both now reference the candidate contract as logical/unimplemented. No onboarding/operator UI was built.

## Configuration and versions

Server-only BETTER_AUTH_SECRET, canonical BETTER_AUTH_URL matching APP_ORIGIN, stable AUTH_INSTANCE_ID, restricted auth DB role and approved email credentials. OAuth additionally needs fixed provider ID, issuer/discovery, client ID/secret. No live values committed; spike generates keys in memory. Rotation and session invalidation requirements live in the contract.

npm metadata observed: Better Auth 1.7.9, @auth0/nextjs-auth0 4.32.0, @supabase/ssr 0.12.7, @supabase/supabase-js 2.117.3 (Node >=22 on latter). Empty engines metadata is not a compatibility guarantee. Only Better Auth installed/tested. Next.js/DB driver versions remain unselected; pin/recheck maintained supported versions during approved integration. Never run a floating generator against an unknown DB.

## Closure gates and reconsideration

DEC-001 stays open; BL-001 is not Done. Remaining evidence:

- DEC-003 target runtime/topology, fixed HTTPS origin, PostgreSQL/pooler constraints; no host chosen under BL-001.
- Explicit authorization and isolated test IdP/email config. Real callback/error/retry, PKCE, signed OIDC issuer/audience/nonce, recovery delivery and copied-cookie logout smoke. No such credentials/access used this run.
- Real PostgreSQL: identity/account uniqueness, transactional session security, concurrent callback/link/reset, logout versus in-flight authorization, cross-instance/restart revocation. Maps cannot prove this.
- Next.js/browser protected bookmark/expiry/recovery; actual authenticator/operator recovery drill; production hashing/resource and shared throttling review. Full T-001/T-015 remain planned.

Reconsider for edge-only hosting, unsafe DB reachability, unsupported revocation, missing approved email, inability to own credential operations, security advisories or changed library behavior. Mocks do not waive gates.

Affected: [API](../API.md), [Database](../DATABASE.md), [Security](../SECURITY.md), [Test plan](../TEST_PLAN.md), [Backlog](../BACKLOG.md), [Project state](../agents/PROJECT_STATE.md). PRD/rules scope unchanged.

import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { genericOAuth, twoFactor } from 'better-auth/plugins';

// INVESTIGATION HARNESS ONLY. Fixtures, not application routes or a production adapter.
export const ORIGIN = 'https://snappik.example.test';
export const PASSWORD = 'Synthetic-only!Password-4826';
const ownerPaths = /^\/app(?:\/[A-Za-z0-9_-]+)*\/?$/;
export function safeReturn(value) {
  // Deliberately path-only; query/fragment and encoded paths can carry secrets or ambiguities.
  return typeof value === 'string' && value.length <= 512 && ownerPaths.test(value) ? value : '/app';
}
export function mapIdentity(mappings, namespace, subject, email) {
  if (!namespace || typeof subject !== 'string' || !subject) throw new Error('INVALID_IDENTITY');
  const key = JSON.stringify([namespace, subject]);
  if (!mappings.has(key)) mappings.set(key, { id: randomUUID(), namespace, subject, email });
  return mappings.get(key);
}
export function operatorPolicy({ permissions, evidence, sessionId, permission, now }) {
  if (!permissions?.has(permission)) return 'PERMISSION_DENIED';
  if (!Number.isFinite(now) || !Number.isFinite(evidence?.verifiedAt) || !evidence || evidence.sessionId !== sessionId || evidence.method !== 'totp' ||
      evidence.verifiedAt > now || now - evidence.verifiedAt >= 15 * 60_000) return 'MFA_REQUIRED';
  return null;
}
/** @param {{ database?: import('better-auth').BetterAuthOptions['database'], secret?: string }} [options] */
export function createSpike({ database, secret = randomBytes(48).toString('base64url') } = {}) {
  const db = { user: [], session: [], account: [], verification: [], twoFactor: [] };
  const mail = [];
  const mappings = new Map();
  const memberships = new Map();
  const permissions = new Map();
  const evidence = new Map();
  const revoked = new Set();
  const tokenCalls = [];
  let profile = { id: 'synthetic-subject-1', email: 'oauth@example.test', name: 'Synthetic Owner', emailVerified: true };
  let exchangeFailure = false;
  const auth = betterAuth({
    appName: 'Snappik BL-001 synthetic spike',
    baseURL: ORIGIN,
    secret,
    database: database ?? memoryAdapter(db),
    logger: { disabled: true },
    trustedOrigins: [ORIGIN],
    advanced: { useSecureCookies: true, database: { generateId: 'uuid' } },
    session: { expiresIn: 3600, disableSessionRefresh: true, cookieCache: { enabled: false } },
    account: { encryptOAuthTokens: true, accountLinking: {
      enabled: true, disableImplicitLinking: true, trustedProviders: [], allowDifferentEmails: false,
    } },
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, minPasswordLength: 12, maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 900, revokeSessionsOnPasswordReset: true,
      sendResetPassword: async (data) => { mail.push({ kind: 'reset', ...data }); },
    },
    emailVerification: {
      sendOnSignUp: true, autoSignInAfterVerification: false,
      sendVerificationEmail: async (data) => { mail.push({ kind: 'verify', ...data }); },
    },
    plugins: [twoFactor(), genericOAuth({ config: [{
      providerId: 'synthetic', clientId: 'synthetic-client', clientSecret: 'synthetic-not-a-secret',
      authorizationUrl: 'https://idp.example.test/authorize', tokenUrl: 'https://idp.example.test/token',
      scopes: ['email', 'profile'], pkce: true, disableProviderLogout: true,
      // No network: this seam does NOT exercise provider/JWKS/nonce validation.
      getToken: async (data) => {
        tokenCalls.push(data);
        if (exchangeFailure) throw new Error('SYNTHETIC_EXCHANGE_UNAVAILABLE');
        if (data.code !== 'synthetic-code' || !data.codeVerifier) throw new Error('INVALID_SYNTHETIC_CODE');
        return { accessToken: 'synthetic-access-token', scopes: ['email', 'profile'] };
      },
      getUserInfo: async () => ({ ...profile }),
    }] })],
  });
  const mergeCookies = (cookie, response) => {
    const jar = new Map(cookie.split('; ').filter(Boolean).map(pair => {
      const index = pair.indexOf('='); return [pair.slice(0, index), pair.slice(index + 1)];
    }));
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(';')[0]; const index = pair.indexOf('=');
      const key = pair.slice(0, index); const value = pair.slice(index + 1);
      if (/max-age=0(?:;|$)/i.test(line) || value === '') jar.delete(key); else jar.set(key, value);
    }
    return [...jar].map(([key, value]) => `${key}=${value}`).join('; ');
  };
  /**
   * @param {string} path
   * @param {{ body?: Record<string, unknown>, cookie?: string, origin?: string | null, method?: string }} [options]
   */
  async function request(path, { body, cookie = '', origin = ORIGIN, method = body ? 'POST' : 'GET' } = {}) {
    const headers = new Headers({ cookie });
    if (origin !== null) headers.set('origin', origin);
    if (body) headers.set('content-type', 'application/json');
    const response = await auth.handler(new Request(`${ORIGIN}/api/auth${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    }));
    return { response, cookie: mergeCookies(cookie, response) };
  }
  async function session(cookie) {
    return auth.api.getSession({ headers: new Headers({ cookie }), query: { disableCookieCache: true } });
  }
  async function principal(cookie) {
    const current = await session(cookie);
    if (!current || !current.user.emailVerified || new Date(current.session.expiresAt).getTime() <= Date.now() || revoked.has(current.session.id)) return null;
    const user = mapIdentity(mappings, 'better-auth:snappik-test', current.user.id, current.user.email);
    return { current, user };
  }
  async function protectedOwner(cookie) {
    try {
      const identity = await principal(cookie);
      if (!identity) return { status: 401, code: 'AUTH_REQUIRED' };
      const studio = memberships.get(identity.user.id);
      if (!studio) return { status: 403, code: 'SETUP_REQUIRED' };
      return { status: 200, data: { user_id: identity.user.id, studio_id: studio } };
    } catch { return { status: 503, code: 'TEMPORARILY_UNAVAILABLE' }; }
  }
  async function protectedOperator(cookie, permission = 'diagnostics_read', now = Date.now()) {
    try {
      const identity = await principal(cookie);
      if (!identity) return { status: 401, code: 'AUTH_REQUIRED' };
      const code = operatorPolicy({ permissions: permissions.get(identity.user.id),
        evidence: evidence.get(identity.current.session.id), sessionId: identity.current.session.id, permission, now });
      return code ? { status: 403, code } : { status: 200, data: { health: 'synthetic' } };
    } catch { return { status: 503, code: 'TEMPORARILY_UNAVAILABLE' }; }
  }
  async function verifyOperatorTOTP(cookie, code) {
    const result = await request('/two-factor/verify-totp', { cookie, body: { code, trustDevice: false } });
    if (result.response.ok) {
      const identity = await principal(result.cookie);
      if (identity) evidence.set(identity.current.session.id, {
        sessionId: identity.current.session.id, method: 'totp', verifiedAt: Date.now(),
      });
    }
    return result;
  }
  async function logout(cookie) {
    // Better Auth 1.7.9 catches deletion errors. Never trust its success body alone.
    // This in-memory tombstone is ONLY a policy demonstration; production needs durable shared revocation.
    try {
      const current = await session(cookie);
      if (current) { revoked.add(current.session.id); evidence.delete(current.session.id); }
      const result = await request('/sign-out', { cookie, body: {} });
      if (!result.response.ok || await session(cookie)) return { status: 503, code: 'TEMPORARILY_UNAVAILABLE' };
      return { status: 200, cookie: result.cookie };
    } catch { return { status: 503, code: 'TEMPORARILY_UNAVAILABLE' }; }
  }
  async function register(email = 'owner@example.test') {
    const result = await request('/sign-up/email', { body: { name: 'Synthetic Owner', email, password: PASSWORD } });
    if (!result.response.ok) throw new Error(`Synthetic signup failed: ${result.response.status}`);
    const verification = mail.findLast(item => item.kind === 'verify' && item.user.email === email);
    if (!verification) throw new Error('Synthetic verification mail absent');
    const url = new URL(verification.url);
    const verified = await request(`${url.pathname.replace('/api/auth', '')}${url.search}`);
    if (!verified.response.ok && verified.response.status !== 302) throw new Error('Synthetic verification failed');
    return email;
  }
  async function login(email = 'owner@example.test', password = PASSWORD) {
    return request('/sign-in/email', { body: { email, password } });
  }
  async function beginOAuth(callbackURL = '/app/projects/synthetic-project', cookie = '', linking = false) {
    return request(linking ? '/link-social' : '/sign-in/social', { cookie, body: {
      provider: 'synthetic', callbackURL, errorCallbackURL: '/login', disableRedirect: true,
    } });
  }
  async function finishOAuth(start, { state, error, cookie } = {}) {
    const payload = await start.response.clone().json();
    const url = new URL(payload.url);
    const query = new URLSearchParams({ state: state ?? url.searchParams.get('state'), code: 'synthetic-code' });
    if (error) query.set('error', error);
    return request(`/callback/synthetic?${query}`, { cookie: cookie ?? start.cookie });
  }
  return { auth, db, mail, mappings, memberships, permissions, evidence, tokenCalls,
    request, session, principal, protectedOwner, protectedOperator, verifyOperatorTOTP, logout,
    register, login, beginOAuth, finishOAuth,
    setProfile: value => { profile = { ...profile, ...value }; },
    failExchange: value => { exchangeFailure = value; },
    challenge: verifier => createHash('sha256').update(verifier).digest('base64url'),
  };
}

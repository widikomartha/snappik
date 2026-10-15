import { test } from 'node:test';
import { symmetricDecrypt } from 'better-auth/crypto';
import assert from 'node:assert/strict';
import { createSpike, safeReturn, mapIdentity, operatorPolicy, PASSWORD, ORIGIN } from './harness.mjs';

async function owner() {
  const spike = createSpike(); await spike.register();
  const signed = await spike.login(); assert.equal(signed.response.status, 200);
  const principal = await spike.principal(signed.cookie);
  spike.memberships.set(principal.user.id, 'synthetic-studio-A');
  return { spike, cookie: signed.cookie, principal };
}

test('T-001 return allowlist rejects external, encoded, traversal, query, control and auth/ops paths', () => {
  for (const value of ['https://evil.test', '//evil.test', '/app/../ops', '/app/%2e%2e/ops',
    '/app\\evil', '/application', '/app?token=private', '/app#fragment', '/login', '/ops',
    '/app/\n', '/app/%252f%252fevil', null, {}, ' /app']) assert.equal(safeReturn(value), '/app');
  assert.equal(safeReturn('/app/projects/synthetic-123'), '/app/projects/synthetic-123');
});

test('T-001 verified credential login; opaque secure cookie; scoped projection and forged cookie denied', async () => {
  const { spike, cookie } = await owner();
  assert.equal((await spike.protectedOwner(cookie)).status, 200);
  assert.equal((await spike.protectedOwner('__Secure-better-auth.session_token=forged')).status, 401);
  const fresh = await spike.login();
  const headers = fresh.response.headers.getSetCookie().join(';');
  assert.match(headers, /HttpOnly/i); assert.match(headers, /Secure/i); assert.match(headers, /SameSite=Lax/i);
  const output = JSON.stringify(await spike.protectedOwner(cookie));
  for (const forbidden of ['token', 'password', 'auth_subject', 'oauth']) assert.ok(!output.includes(forbidden));
  assert.ok(spike.db.account.find(row => row.providerId === 'credential').password !== PASSWORD);
});

test('T-001 unverified email and incorrect password cannot establish a session', async () => {
  const spike = createSpike();
  await spike.request('/sign-up/email', { body: { name: 'Synthetic', email: 'unverified@example.test', password: PASSWORD } });
  const unverified = await spike.login('unverified@example.test'); assert.equal(unverified.response.status, 403);
  assert.equal(await spike.session(unverified.cookie), null);
  await spike.register(); assert.equal((await spike.login('owner@example.test', 'incorrect-password')).response.status, 401);
});

test('T-001 OAuth callback preserves bookmark, PKCE verifier and stable mapping on repeat login', async () => {
  const spike = createSpike(); const start = await spike.beginOAuth(safeReturn('/app/projects/synthetic-project'));
  assert.equal(start.response.status, 200);
  const authorization = new URL((await start.response.clone().json()).url);
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  const callback = await spike.finishOAuth(start);
  assert.equal(callback.response.status, 302);
  assert.equal(new URL(callback.response.headers.get('location'), ORIGIN).pathname, '/app/projects/synthetic-project');
  assert.equal(authorization.searchParams.get('code_challenge'), spike.challenge(spike.tokenCalls[0].codeVerifier));
  const first = await spike.principal(callback.cookie); assert.ok(first);
  spike.memberships.set(first.user.id, 'synthetic-studio-A');
  const second = await spike.finishOAuth(await spike.beginOAuth());
  assert.equal((await spike.principal(second.cookie)).user.id, first.user.id);
  assert.equal(spike.mappings.size, 1);
});

test('T-001 callback rejects missing/wrong state, absent cookie, replay, consent denial; retry starts fresh', async () => {
  const spike = createSpike();
  const missing = await spike.request('/callback/synthetic?code=synthetic-code');
  assert.match(missing.response.headers.get('location'), /error=/); assert.equal(await spike.session(missing.cookie), null);
  const wrong = await spike.finishOAuth(await spike.beginOAuth(), { state: 'wrong-state' });
  assert.match(wrong.response.headers.get('location'), /error=/);
  const absent = await spike.finishOAuth(await spike.beginOAuth(), { cookie: '' });
  assert.match(absent.response.headers.get('location'), /error=/);
  const denied = await spike.finishOAuth(await spike.beginOAuth(), { error: 'access_denied' });
  assert.equal(await spike.session(denied.cookie), null);
  const start = await spike.beginOAuth(); const callback = await spike.finishOAuth(start);
  assert.ok(await spike.session(callback.cookie));
  const replay = await spike.finishOAuth(start);
  assert.match(replay.response.headers.get('location'), /error=/); assert.equal(await spike.session(replay.cookie), null);
});

test('T-001 provider exchange outage creates no session; bounded manual retry succeeds', async () => {
  const spike = createSpike(); spike.failExchange(true);
  const failed = await spike.finishOAuth(await spike.beginOAuth());
  assert.match(failed.response.headers.get('location'), /error=/); assert.equal(await spike.session(failed.cookie), null);
  spike.failExchange(false); const retried = await spike.finishOAuth(await spike.beginOAuth());
  assert.ok(await spike.session(retried.cookie));
});

test('T-001 library rejects external callback URL and cross-origin logout', async () => {
  const spike = createSpike();
  const bad = await spike.beginOAuth('https://evil.test/steal'); assert.equal(bad.response.status, 403);
  const result = await spike.request('/sign-out', { origin: 'https://evil.test', body: {} });
  assert.equal(result.response.status, 403);
});

test('T-001 exact session expiry denies protected route and retains acknowledged synthetic data', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2030-01-01T00:00:00Z') });
  const { spike, cookie, principal } = await owner();
  const acknowledged = new Map([['synthetic-project', { revision: 7, photo_ids: ['synthetic-photo'] }]]);
  const before = structuredClone(acknowledged.get('synthetic-project'));
  const remaining = new Date(principal.current.session.expiresAt).getTime() - Date.now();
  t.mock.timers.tick(remaining - 1); assert.equal((await spike.protectedOwner(cookie)).status, 200);
  t.mock.timers.tick(1); assert.ok(await spike.session(cookie)); // Library boundary is strictly less-than.
  assert.equal((await spike.protectedOwner(cookie)).status, 401);
  assert.deepEqual(acknowledged.get('synthetic-project'), before);
  const relogin = await spike.login(); assert.equal((await spike.protectedOwner(relogin.cookie)).status, 200);
});

test('T-001 logout revokes server session; replayed cookie and repeated logout remain denied', async () => {
  const { spike, cookie } = await owner();
  assert.equal((await spike.logout(cookie)).status, 200);
  assert.equal((await spike.protectedOwner(cookie)).status, 401);
  assert.equal((await spike.logout(cookie)).status, 200);
});

test('T-001 recovery is generic, single-use, expires and revokes existing sessions', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2030-01-02T00:00:00Z') });
  const { spike, cookie } = await owner();
  const reset = email => spike.request('/request-password-reset', { body: { email, redirectTo: '/recover' } });
  const known = await reset('owner@example.test'); const unknown = await reset('absent@example.test');
  assert.equal(known.response.status, unknown.response.status);
  assert.deepEqual(await known.response.json(), await unknown.response.json());
  const token = spike.mail.findLast(item => item.kind === 'reset').token;
  const body = { token, newPassword: 'Synthetic-recovered!4826' };
  assert.equal((await spike.request('/reset-password', { body })).response.status, 200);
  assert.equal((await spike.protectedOwner(cookie)).status, 401);
  assert.equal((await spike.login()).response.status, 401);
  assert.equal((await spike.login('owner@example.test', body.newPassword)).response.status, 200);
  assert.ok(!(await spike.request('/reset-password', { body })).response.ok);
  await reset('owner@example.test'); const expired = spike.mail.findLast(item => item.kind === 'reset').token;
  t.mock.timers.tick(901_000);
  assert.ok(!(await spike.request('/reset-password', { body: { ...body, token: expired } })).response.ok);
});

test('BL-001 email collision never auto-merges verified or unverified OAuth identities; explicit verified link supported', async () => {
  const { spike, cookie, principal } = await owner();
  for (const emailVerified of [false, true]) {
    spike.setProfile({ email: 'owner@example.test', emailVerified });
    const failed = await spike.finishOAuth(await spike.beginOAuth());
    assert.match(failed.response.headers.get('location'), /error=/);
    assert.equal(spike.db.user.length, 1); assert.equal(spike.db.account.filter(row => row.providerId === 'synthetic').length, 0);
  }
  spike.setProfile({ emailVerified: false });
  const unverified = await spike.finishOAuth(await spike.beginOAuth('/app/account', cookie, true));
  assert.match(unverified.response.headers.get('location'), /error=/);
  assert.equal(spike.db.account.filter(row => row.providerId === 'synthetic').length, 0);
  spike.setProfile({ emailVerified: true });
  const linked = await spike.finishOAuth(await spike.beginOAuth('/app/account', cookie, true));
  assert.ok(!linked.response.headers.get('location').includes('error='));
  assert.equal(spike.db.account.filter(row => row.providerId === 'synthetic').length, 1);
  const oauth = await spike.finishOAuth(await spike.beginOAuth());
  assert.equal((await spike.principal(oauth.cookie)).user.id, principal.user.id);
});

test('BL-001 mapping keys use namespace and subject; email changes/collisions do not change identity', () => {
  const mappings = new Map();
  const first = mapIdentity(mappings, 'issuer-A', 'sub-1', 'same@example.test');
  assert.equal(mapIdentity(mappings, 'issuer-A', 'sub-1', 'changed@example.test').id, first.id);
  assert.notEqual(mapIdentity(mappings, 'issuer-B', 'sub-1', 'same@example.test').id, first.id);
  assert.notEqual(mapIdentity(mappings, 'issuer-A', 'sub-2', 'same@example.test').id, first.id);
});

test('T-015 operator requires permission plus recent session-specific MFA; owner membership is insufficient', async () => {
  const { spike, cookie, principal } = await owner();
  assert.equal((await spike.protectedOperator(cookie)).code, 'PERMISSION_DENIED');
  spike.permissions.set(principal.user.id, new Set(['diagnostics_read']));
  assert.equal((await spike.protectedOperator(cookie)).code, 'MFA_REQUIRED');
  const base = { permissions: new Set(['diagnostics_read']), permission: 'diagnostics_read', sessionId: 'session-A', now: 1_000_000 };
  const evidence = { sessionId: 'session-A', method: 'totp', verifiedAt: base.now };
  assert.equal(operatorPolicy({ ...base, evidence }), null);
  assert.equal(operatorPolicy({ ...base, evidence: { ...evidence, sessionId: 'session-B' } }), 'MFA_REQUIRED');
  assert.equal(operatorPolicy({ ...base, evidence, now: base.now + 900_000 }), 'MFA_REQUIRED');
  assert.equal(operatorPolicy({ ...base, evidence: { ...evidence, method: 'backup_code' } }), 'MFA_REQUIRED');
  assert.equal(operatorPolicy({ ...base, evidence, permission: 'studio_suspend' }), 'PERMISSION_DENIED');
});

test('T-015 actual TOTP enrollment and login challenge do not grant a session before second factor', async () => {
  const { spike, cookie, principal } = await owner();
  spike.permissions.set(principal.user.id, new Set(['diagnostics_read']));
  const enrollment = await spike.request('/two-factor/enable', { cookie, body: { password: PASSWORD } });
  assert.equal(enrollment.response.status, 200);
  const { totpURI } = await enrollment.response.json();
  assert.equal(new URL(totpURI).protocol, 'otpauth:');
  // Test-only fixture access, never log/store the decrypted enrollment secret.
  const context = await spike.auth.$context;
  const secret = await symmetricDecrypt({ key: context.secretConfig, data: spike.db.twoFactor[0].secret });
  const code = (await spike.auth.api.generateTOTP({ body: { secret } })).code;
  const verified = await spike.verifyOperatorTOTP(enrollment.cookie, code); assert.equal(verified.response.status, 200);
  await spike.logout(verified.cookie);
  const challenge = await spike.login();
  assert.equal((await challenge.response.json()).twoFactorRedirect, true);
  assert.equal((await spike.protectedOperator(challenge.cookie)).status, 401);
  const wrong = await spike.verifyOperatorTOTP(challenge.cookie, 'invalid'); assert.ok(!wrong.response.ok);
  const freshCode = (await spike.auth.api.generateTOTP({ body: { secret } })).code;
  const completed = await spike.verifyOperatorTOTP(challenge.cookie, freshCode); assert.equal(completed.response.status, 200);
  assert.equal((await spike.protectedOperator(completed.cookie)).status, 200);
  assert.equal((await spike.protectedOperator(completed.cookie, 'studio_suspend')).status, 403);
});

test('T-001 observed library logout deletion failure is never reported as successful by Snappik harness', async () => {
  const { spike, cookie } = await owner();
  const context = await spike.auth.$context;
  context.internalAdapter.deleteSession = async () => { throw new Error('SYNTHETIC_DB_UNAVAILABLE'); };
  const raw = await spike.request('/sign-out', { cookie, body: {} });
  assert.equal(raw.response.status, 200); assert.ok(await spike.session(cookie));
  const guarded = await spike.logout(cookie); assert.equal(guarded.status, 503);
  assert.equal((await spike.protectedOwner(cookie)).status, 401);
});

test('BL-001 unverified synthetic OAuth profile cannot access owner data', async () => {
  const spike = createSpike(); spike.setProfile({ emailVerified: false });
  const callback = await spike.finishOAuth(await spike.beginOAuth());
  assert.equal((await spike.protectedOwner(callback.cookie)).status, 401);
  assert.equal(spike.mappings.size, 0);
});

test('T-015 OAuth session cannot inherit MFA evidence from another session or enrollment flag', async () => {
  const { spike, cookie, principal } = await owner();
  spike.permissions.set(principal.user.id, new Set(['diagnostics_read']));
  spike.setProfile({ email: 'owner@example.test' });
  await spike.finishOAuth(await spike.beginOAuth('/app/account', cookie, true));
  spike.db.user.find(row => row.id === principal.current.user.id).twoFactorEnabled = true;
  spike.evidence.set(principal.current.session.id, { sessionId: principal.current.session.id, method: 'totp', verifiedAt: Date.now() });
  const oauth = await spike.finishOAuth(await spike.beginOAuth());
  assert.ok(await spike.session(oauth.cookie)); // Observed library OAuth bypass of credential-only 2FA challenge.
  assert.equal((await spike.protectedOperator(oauth.cookie)).code, 'MFA_REQUIRED');
});

test('T-001 unavailable session store fails closed with retryable error', async () => {
  const { spike, cookie } = await owner();
  const context = await spike.auth.$context;
  context.internalAdapter.findSession = async () => { throw new Error('SYNTHETIC_DB_UNAVAILABLE'); };
  assert.deepEqual(await spike.protectedOwner(cookie), { status: 503, code: 'TEMPORARILY_UNAVAILABLE' });
  assert.equal((await spike.logout(cookie)).status, 503);
});

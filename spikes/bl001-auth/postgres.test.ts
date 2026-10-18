// Actual pinned library + fresh real PostgreSQL; OAuth/email and app policy remain fixtures.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { fork } from 'node:child_process';
import pg from 'pg';
import { getMigrations } from 'better-auth/db/migration';
import { isolatedPostgres } from '../../scripts/test-postgres.js';
import { createSpike, PASSWORD, ORIGIN, safeReturn } from './harness.mjs';

let instance: Awaited<ReturnType<typeof isolatedPostgres>>;
let pool: pg.Pool;
const secret = randomBytes(48).toString('base64url');
const pools: pg.Pool[] = [];
function replica() {
  const database = new pg.Pool({ connectionString: instance.connectionString, max: 3,
    connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  pools.push(database);
  return createSpike({ database, secret });
}
before(async () => {
  instance = await isolatedPostgres();
  pool = new pg.Pool({ connectionString: instance.connectionString, max: 4,
    connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  console.log('DEC-001 isolated database:', (await pool.query('SHOW server_version')).rows[0].server_version);
  const spike = replica();
  // Only the fresh generated test cluster. Never generate against DATABASE_URL.
  const migration = await getMigrations(spike.auth.options);
  assert.equal(migration.unsafeChanges.length, 0);
  await migration.runMigrations();
});
after(async () => {
  await Promise.all(pools.map(p => p.end()));
  await pool?.end();
  await instance?.server.stop();
});
async function observe(cookie: string) {
  const child = fork(new URL('./postgres-observer.ts', import.meta.url), [], {
    execArgv: process.execArgv, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => { child.kill(); reject(new Error('OBSERVER_TIMEOUT')); }, 10000);
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', () => { clearTimeout(timeout); reject(new Error('OBSERVER_EXIT_BEFORE_RESULT')); });
      child.once('message', (value: { active?: boolean; error?: string }) => {
        clearTimeout(timeout);
        if (value.error || typeof value.active !== 'boolean') reject(new Error('OBSERVER_FAILED'));
        else resolve(value.active);
      });
      child.send({ connectionString: instance.connectionString, secret, cookie });
    });
  } finally {
    // Wait for normal pool cleanup; terminate only a failed/stalled child.
    if (child.exitCode === null) await new Promise<void>(resolve => {
      const timeout = setTimeout(() => { child.kill(); resolve(); }, 3000);
      child.once('exit', () => { clearTimeout(timeout); resolve(); });
    });
  }
}

test('PG callback stores session; another instance reads it; protected fixture and return path work', async () => {
  const first = replica(), second = replica();
  first.setProfile({ id: 'pg-oauth-subject', email: 'pg-oauth@example.test' });
  const callback = await first.finishOAuth(await first.beginOAuth(safeReturn('/app/projects/pg-fixture')));
  assert.equal(callback.response.status, 302);
  assert.equal(new URL(callback.response.headers.get('location')!, ORIGIN).pathname, '/app/projects/pg-fixture');
  const a = await first.session(callback.cookie), b = await second.session(callback.cookie);
  assert.ok(a); assert.equal(b.session.id, a.session.id);
  const principal = await second.principal(callback.cookie);
  second.memberships.set(principal.user.id, 'synthetic-pg-studio');
  assert.equal((await second.protectedOwner(callback.cookie)).status, 200);
  assert.equal((await second.protectedOwner('forged')).status, 401);
  assert.equal(await observe(callback.cookie), true);
});

test('PG successful logout denies copied cookie in another process and after PostgreSQL restart', async () => {
  const spike = replica();
  await spike.register('pg-logout@example.test');
  const signed = await spike.login('pg-logout@example.test');
  assert.ok(await spike.session(signed.cookie));
  assert.equal((await spike.request('/sign-out', { cookie: signed.cookie, body: {} })).response.status, 200);
  assert.equal(await observe(signed.cookie), false);
  // Close every connection before stopping only our dedicated cluster; retain all data.
  await Promise.all(pools.splice(0).map(p => p.end()));
  await pool.end();
  await instance.server.stop(); await instance.server.start();
  pool = new pg.Pool({ connectionString: instance.connectionString, max: 4,
    connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  assert.equal(await observe(signed.cookie), false);
  assert.equal((await replica().request('/sign-out', { cookie: signed.cookie, body: {} })).response.status, 200);
});

test('PG deletion failure reproduces unsafe raw logout 200 with copied cookie still active', async () => {
  const spike = replica();
  await spike.register('pg-failure@example.test');
  const signed = await spike.login('pg-failure@example.test');
  await pool.query(`CREATE FUNCTION reject_session_delete() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'SYNTHETIC_DELETE_FAILURE'; END $$;
    CREATE TRIGGER reject_session_delete BEFORE DELETE ON "session" FOR EACH ROW EXECUTE FUNCTION reject_session_delete()`);
  try {
    assert.equal((await spike.request('/sign-out', { cookie: signed.cookie, body: {} })).response.status, 200);
    assert.equal(await observe(signed.cookie), true);
  } finally {
    await pool.query('DROP TRIGGER reject_session_delete ON "session"; DROP FUNCTION reject_session_delete()');
    await spike.request('/sign-out', { cookie: signed.cookie, body: {} });
  }
});

test('PG reset is generic; concurrent consumption permits one winner and revokes old sessions', async () => {
  const first = replica(), second = replica();
  const email = 'pg-reset@example.test';
  await first.register(email);
  const signed = await first.login(email);
  const known = await first.request('/request-password-reset', { body: { email, redirectTo: '/recover' } });
  const unknown = await first.request('/request-password-reset', { body: { email: 'pg-absent@example.test', redirectTo: '/recover' } });
  assert.equal(known.response.status, unknown.response.status);
  assert.deepEqual(await known.response.json(), await unknown.response.json());
  const token = first.mail.findLast((item: { kind: string }) => item.kind === 'reset').token;
  const body = { token, newPassword: 'Synthetic-pg-recovered!4826' };
  // Barrier: both library instances must read the same valid token before either consumes it.
  let readers = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const timeout = setTimeout(release, 5000);
  for (const spike of [first, second]) {
    const context = await spike.auth.$context;
    const find = context.internalAdapter.findVerificationValue.bind(context.internalAdapter);
    context.internalAdapter.findVerificationValue = async (identifier: string) => {
      const value = await find(identifier);
      if (identifier === `reset-password:${token}`) { readers++; if (readers === 2) release(); await barrier; }
      return value;
    };
  }
  const outcomes = await Promise.all([first.request('/reset-password', { body }), second.request('/reset-password', { body })]);
  clearTimeout(timeout);
  assert.equal(readers, 2);
  assert.deepEqual(outcomes.map(r => r.response.status).sort(), [200, 400]);
  assert.equal(await observe(signed.cookie), false);
  assert.equal((await second.login(email, PASSWORD)).response.status, 401);
  assert.equal((await second.login(email, body.newPassword)).response.status, 200);
  assert.equal((await first.request('/reset-password', { body })).response.status, 400);
});

test('PG generated account schema lacks pair uniqueness; candidate index enforces it; token is already unique', async () => {
  const account = (await pool.query('SELECT id FROM account LIMIT 1')).rows[0];
  const duplicateSql = `INSERT INTO account(id,"accountId","providerId","userId","createdAt","updatedAt")
    SELECT gen_random_uuid(),"accountId","providerId","userId","createdAt","updatedAt" FROM account WHERE id=$1 RETURNING id`;
  // Regression finding, not acceptable production behavior. Do not hide it behind a passing suite.
  const duplicate = (await pool.query(duplicateSql, [account.id])).rows[0];
  assert.ok(duplicate);
  await pool.query('DELETE FROM account WHERE id=$1', [duplicate.id]);
  await pool.query('CREATE UNIQUE INDEX spike_account_provider_subject ON account("providerId","accountId")');
  await assert.rejects(pool.query(duplicateSql, [account.id]), { code: '23505' });
  const spike = replica();
  await spike.register('pg-unique@example.test');
  const signed = await spike.login('pg-unique@example.test');
  const current = await spike.session(signed.cookie);
  await assert.rejects(pool.query(`INSERT INTO "session"(id,token,"userId","expiresAt","createdAt","updatedAt")
    SELECT gen_random_uuid(),token,"userId","expiresAt","createdAt","updatedAt" FROM "session" WHERE id=$1`, [current.session.id]), { code: '23505' });
});

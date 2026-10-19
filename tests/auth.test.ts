import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fork} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {symmetricDecrypt} from 'better-auth/crypto';
import {genericOAuth} from 'better-auth/plugins';
import {isolatedPostgres} from '../scripts/test-postgres.js';
import {migrate} from '../src/db/migrate.js';
import {migrateAuth,loadAuthMigrations} from '../src/db/auth-migrate.js';
import {transaction} from '../src/db/pool.js';
import {assertSession,requireOperator,attachSession} from '../src/modules/auth/security.js';
import {getMe,completeSetup} from '../src/modules/onboarding/service.js';
import {testAuthentication,testPassword} from './fixtures/auth-library.js';
let instance:Awaited<ReturnType<typeof isolatedPostgres>>;
let context:ReturnType<typeof testAuthentication>;
before(async()=>{
  instance=await isolatedPostgres();const setup=new pg.Pool({connectionString:instance.connectionString});
  try{await migrate(setup);await migrateAuth(setup);}finally{await setup.end();}
  context=testAuthentication(instance.connectionString);
});
after(async()=>{await context?.close();await instance?.server.stop();});
const email=()=>`synthetic-${randomUUID()}@example.test`;
async function owner(){const address=email();await context.register(address);const login=await context.login(address);const session=await context.auth.resolveSession(login.request);assert.ok(session);return {address,...login,session};}
async function observe(cookie:string) {
  const child=fork(new URL('./fixtures/auth-observer.ts',import.meta.url),[],{execArgv:process.execArgv,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  return new Promise<boolean>((resolve,reject)=>{
    const timeout=setTimeout(()=>{child.kill();reject(new Error('OBSERVER_TIMEOUT'));},10000);
    child.once('error',reject);child.once('exit',()=>{clearTimeout(timeout);reject(new Error('OBSERVER_EXIT'));});
    child.once('message',(value:{active?:boolean;error?:string})=>{clearTimeout(timeout);if(value.error)reject(new Error(value.error));else resolve(value.active!);});
    child.send({connectionString:instance.connectionString,secret:context.secret,cookie});
  });
}
async function waitForLock(name:string) {
  for(let i=0;i<100;i++){
    if((await context.app.query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock') AS waiting`,[name])).rows[0].waiting)return;
    await context.app.query('SELECT pg_sleep(0.01)');
  }
  throw new Error('BARRIER_NOT_REACHED');
}

test('auth migrations are repeatable, checksummed and stop on populated duplicate accounts without data loss',async()=>{
  await Promise.all([migrateAuth(context.app),migrateAuth(context.app)]);
  const migrations=await loadAuthMigrations();
  await assert.rejects(migrateAuth(context.app,[{...migrations[0],sql:migrations[0].sql+'\n-- drift'},...migrations.slice(1)]),/CHECKSUM/);
  const isolated=await isolatedPostgres();const pool=new pg.Pool({connectionString:isolated.connectionString});
  try {
    await migrate(pool);await migrateAuth(pool,migrations.slice(0,1));
    const userId=randomUUID();
    await pool.query(`INSERT INTO snappik_auth."user"(id,name,email,"emailVerified") VALUES($1,'Synthetic','duplicate@example.test',true)`,[userId]);
    for(let i=0;i<2;i++)await pool.query(`INSERT INTO snappik_auth.account(id,"providerId","accountId","userId","updatedAt") VALUES($1,'synthetic','duplicate-subject',$2,now())`,[randomUUID(),userId]);
    const before=(await pool.query('SELECT * FROM snappik_auth.account ORDER BY id')).rows;
    await assert.rejects(migrateAuth(pool),/AUTH_ACCOUNT_DUPLICATES_REQUIRE_REVIEW/);
    assert.deepEqual((await pool.query('SELECT * FROM snappik_auth.account ORDER BY id')).rows,before);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM snappik_auth.schema_migrations')).rows[0].n,1);
    assert.equal((await pool.query(`SELECT to_regclass('public.owner_session_security') AS name`)).rows[0].name,null);
  }finally{await pool.end();await isolated.server.stop();}
});

test('account uniqueness serializes concurrent creation; distinct provider accounts retain one library/app identity',async()=>{
  const f=await owner();const raw=await context.library.api.getSession({headers:f.request.headers});assert.ok(raw);
  const insert=()=>context.app.query(`INSERT INTO snappik_auth.account(id,"providerId","accountId","userId","updatedAt") VALUES($1,'synthetic-issuer','same-subject',$2,now())`,[randomUUID(),raw.user.id]);
  const results=await Promise.allSettled([insert(),insert()]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const rejected=results.find(r=>r.status==='rejected') as PromiseRejectedResult;assert.equal(rejected.reason.code,'23505');
  await context.app.query(`INSERT INTO snappik_auth.account(id,"providerId","accountId","userId","updatedAt") VALUES($1,'other-issuer','same-subject',$2,now())`,[randomUUID(),raw.user.id]);
  assert.equal((await context.app.query('SELECT count(*)::int AS n FROM public.users WHERE auth_subject=$1',[raw.user.id])).rows[0].n,1);
  assert.equal((await context.auth.handle(context.request('/link-social',{provider:'synthetic'},f.cookie))).status,404);
});

test('logout commits durable denial even when native deletion fails; retries and process restart cannot restore it',async()=>{
  const f=await owner();assert.equal(await observe(f.cookie),true);
  await context.app.query(`CREATE FUNCTION snappik_auth.synthetic_delete_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_DELETE_FAILURE'; END $$;
    CREATE TRIGGER synthetic_delete_failure BEFORE DELETE ON snappik_auth.session FOR EACH ROW EXECUTE FUNCTION snappik_auth.synthetic_delete_failure()`);
  try {
    const logout=await context.auth.handle(context.request('/sign-out',{},f.cookie));assert.equal(logout.status,200);
    assert.ok(await context.library.api.getSession({headers:f.request.headers}),'raw library still sees physical row');
    assert.equal(await context.auth.resolveSession(f.request),null);assert.equal(await observe(f.cookie),false);
    await assert.rejects(attachSession(context.app,'better-auth:synthetic-local',f.session.sessionId,f.session.subject),/AUTH_REQUIRED/);
    assert.equal((await context.auth.handle(context.request('/sign-out',{},f.cookie))).status,200);
  } finally {await context.app.query('DROP TRIGGER synthetic_delete_failure ON snappik_auth.session; DROP FUNCTION snappik_auth.synthetic_delete_failure()');}
  const secret=context.secret;await context.close();await instance.server.stop();await instance.server.start();
  context=testAuthentication(instance.connectionString,undefined,secret);
  assert.equal(await observe(f.cookie),false);
  assert.equal((await context.auth.handle(context.request('/sign-out',{},f.cookie))).status,200);
});

test('revocation write failure returns 503 without cookie clearing; retry succeeds; uncertain session lookup fails closed',async()=>{
  const f=await owner();
  await context.app.query(`CREATE FUNCTION public.synthetic_revoke_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_REVOKE_FAILURE'; END $$;
    CREATE TRIGGER synthetic_revoke_failure BEFORE UPDATE ON public.owner_session_security FOR EACH ROW EXECUTE FUNCTION public.synthetic_revoke_failure()`);
  try {
    const failure=await context.auth.handle(context.request('/sign-out',{},f.cookie));assert.equal(failure.status,503);
    assert.equal(failure.headers.getSetCookie().length,0);assert.ok(await context.auth.resolveSession(f.request));
    assert.ok(!JSON.stringify(await failure.json()).includes('SYNTHETIC_REVOKE_FAILURE'));
  }finally{await context.app.query('DROP TRIGGER synthetic_revoke_failure ON public.owner_session_security; DROP FUNCTION public.synthetic_revoke_failure()');}
  assert.equal((await context.auth.handle(context.request('/sign-out',{},f.cookie))).status,200);
  assert.equal(await context.auth.resolveSession(f.request),null);
  const dead=testAuthentication(instance.connectionString,undefined,context.secret);await dead.app.end();
  try{assert.equal((await dead.auth.handle(dead.request('/sign-out',{},f.cookie))).status,503);await assert.rejects(dead.auth.resolveSession((await owner()).request));}
  finally{await dead.database.end();}
});

test('actual PostgreSQL outage returns uncertain logout failure; restart permits explicit retry without stale access',async()=>{
  const f=await owner();await instance.server.stop();
  try {
    const response=await context.auth.handle(context.request('/sign-out',{},f.cookie));
    assert.equal(response.status,503);assert.equal(response.headers.getSetCookie().length,0);
    await assert.rejects(context.auth.resolveSession(f.request));
  }finally{await instance.server.start();}
  assert.ok(await context.auth.resolveSession(f.request),'failed revocation never claimed success');
  assert.equal((await context.auth.handle(context.request('/sign-out',{},f.cookie))).status,200);
  assert.equal(await context.auth.resolveSession(f.request),null);
});

test('stale resolved session waits behind revocation and cannot mutate onboarding; reverse ordering commits before logout',async()=>{
  const f=await owner();const uid=(await context.app.query('SELECT id FROM users WHERE auth_subject=$1',[f.session.subject])).rows[0].id;
  const blocker=await context.app.connect();
  const waiting=new pg.Pool({connectionString:instance.connectionString,max:1,application_name:'auth-stale-mutation',statement_timeout:10000});
  const body={name:'Synthetic Studio',slug:`s-${randomUUID()}`,locale:'id',timezone:'UTC'};
  try {
    await blocker.query('BEGIN');await blocker.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[uid]);
    // Force mutation to reach its user lock, then commit revocation ahead of it.
    const denial=assert.rejects(completeSetup(waiting,f.session,body,randomUUID()),/AUTH_REQUIRED/);
    await waitForLock('auth-stale-mutation');
    await blocker.query('UPDATE owner_session_security SET revoked_at=clock_timestamp() WHERE session_id=$1',[f.session.sessionId]);
    await blocker.query('COMMIT');await denial;
    assert.equal((await context.app.query('SELECT count(*)::int AS n FROM studio_members WHERE user_id=$1',[uid])).rows[0].n,0);
  }finally{await blocker.query('ROLLBACK');blocker.release();await waiting.end();}
  const second=await owner();const resolved=second.session;
  const tx=await context.app.connect();
  const logoutPool=new pg.Pool({connectionString:instance.connectionString,max:1,application_name:'auth-waiting-logout',statement_timeout:10000});
  // Use the same service with a named pool to observe lock ordering without timing guesses.
  const {createAuthentication}=await import('../src/modules/auth/http.js');
  const logoutAuth=createAuthentication(context.library,logoutPool,context.origin,'synthetic-local');
  try{
    await tx.query('BEGIN');await resolved.assertActive!(tx);
    const logout=logoutAuth.handle(context.request('/sign-out',{},second.cookie));
    await waitForLock('auth-waiting-logout');
    await tx.query('UPDATE users SET display_name=display_name WHERE auth_subject=$1',[resolved.subject]);
    await tx.query('COMMIT');assert.equal((await logout).status,200);
    await assert.rejects(getMe(context.app,resolved),/AUTH_REQUIRED/);
  }finally{await tx.query('ROLLBACK');tx.release();await logoutPool.end();}
});

test('expiry/security version/missing metadata deny; origin/body/endpoint policies and token redaction hold',async()=>{
  const f=await owner();
  const response=await context.auth.handle(context.request('/sign-in/email',{email:f.address,password:testPassword,return_to:'https://evil.test'}));
  const payload=await response.json();assert.deepEqual(payload,{success:true,return_to:'/app'});
  assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(!JSON.stringify(payload).includes('token'));
  const forged=new Request(`${context.origin}/api/auth/sign-out`,{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json',cookie:f.cookie},body:'{}'});
  assert.equal((await context.auth.handle(forged)).status,403);
  assert.equal((await context.auth.handle(context.request('/sign-out',{studio_id:'forged'},f.cookie))).status,400);
  for(const path of ['/callback/synthetic','/sign-in/social','/delete-user','/two-factor/disable','/sign-up/email'])assert.equal((await context.auth.handle(context.request(path))).status,404);
  for(const path of ['/request-password-reset','/reset-password'])assert.equal((await context.auth.handle(context.request(path))).status,503);
  await context.app.query('UPDATE users SET security_version=security_version+1 WHERE auth_subject=$1',[f.session.subject]);
  assert.equal(await context.auth.resolveSession(f.request),null);
  const other=await owner();await context.app.query('DELETE FROM owner_session_security WHERE session_id=$1',[other.session.sessionId]);
  assert.equal(await context.auth.resolveSession(other.request),null);
  const expired=await owner();await context.app.query(`UPDATE snappik_auth.session SET "expiresAt"=clock_timestamp() WHERE id=$1`,[expired.session.sessionId]);
  assert.equal(await context.auth.resolveSession(expired.request),null);
});

test('synthetic OAuth callback/link preserves mapped user; implicit email collision and second-user takeover denied',async()=>{
  const f=await owner();
  const oauth=testAuthentication(instance.connectionString,undefined,context.secret,[genericOAuth({config:[{
    providerId:'synthetic-local-idp',clientId:'synthetic-client',clientSecret:'synthetic-not-secret',
    authorizationUrl:'https://idp.example.test/authorize',tokenUrl:'https://idp.example.test/token',pkce:true,scopes:['email','profile'],
    getToken:async()=>({accessToken:'synthetic-token',scopes:['email','profile']}),
    getUserInfo:async()=>({id:'synthetic-linked-subject',email:f.address,emailVerified:true,name:'Synthetic'})
  }]})]);
  async function callback(linking:boolean,cookie='') {
    const start=await oauth.library.handler(oauth.request(linking?'/link-social':'/sign-in/social',{provider:'synthetic-local-idp',callbackURL:'/app',errorCallbackURL:'/login',disableRedirect:true},cookie));
    assert.equal(start.status,200);
    const location=new URL((await start.json()).url);
    const jar=new Map(cookie.split('; ').filter(Boolean).map(pair=>{const i=pair.indexOf('=');return[pair.slice(0,i),pair.slice(i+1)];}));
    for(const value of start.headers.getSetCookie()){const pair=value.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
    return oauth.library.handler(new Request(`${oauth.origin}/api/auth/callback/synthetic-local-idp?state=${location.searchParams.get('state')}&code=synthetic-code`,{
      headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}}));
  }
  try {
    const collision=await callback(false);assert.match(collision.headers.get('location')!,/error=/);
    assert.equal((await context.app.query(`SELECT count(*)::int AS n FROM snappik_auth.account WHERE "providerId"='synthetic-local-idp'`)).rows[0].n,0);
    const linked=await callback(true,f.cookie);assert.equal(new URL(linked.headers.get('location')!,context.origin).pathname,'/app');
    const account=(await context.app.query(`SELECT "userId" FROM snappik_auth.account WHERE "providerId"='synthetic-local-idp' AND "accountId"='synthetic-linked-subject'`)).rows[0];
    assert.equal(account.userId,f.session.subject);
    const second=await owner();const denied=await callback(true,second.cookie);assert.match(denied.headers.get('location')!,/error=/);
    assert.equal((await context.app.query(`SELECT "userId" FROM snappik_auth.account WHERE "providerId"='synthetic-local-idp'`)).rows[0].userId,f.session.subject);
    assert.equal((await context.app.query('SELECT count(*)::int AS n FROM users WHERE auth_provider=$1 AND auth_subject=$2',[f.session.provider,f.session.subject])).rows[0].n,1);
  }finally{await oauth.close();}
});

test('reviewed runtime role can use auth schema but cannot repoint metadata, migrate or self-grant operator',async()=>{
  await context.app.query('CREATE ROLE synthetic_auth_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT');
  for(const file of ['src/db/runtime-grants.sql','src/db/onboarding-grants.sql','src/db/auth-grants.sql']) {
    await context.app.query((await readFile(file,'utf8')).replaceAll(':"runtime_role"','synthetic_auth_runtime'));
  }
  const tx=await context.app.connect();
  try {
    await tx.query('SET ROLE synthetic_auth_runtime');
    await tx.query('SELECT id FROM snappik_auth."user" LIMIT 1');
    await tx.query('UPDATE owner_session_security SET revoked_at=revoked_at WHERE false');
    await assert.rejects(tx.query('UPDATE owner_session_security SET user_id=user_id WHERE false'),{code:'42501'});
    await assert.rejects(tx.query("INSERT INTO platform_roles(user_id,permission) VALUES(gen_random_uuid(),'diagnostics_read')"),{code:'42501'});
    await assert.rejects(tx.query('CREATE TABLE snappik_auth.forbidden(id integer)'),{code:'42501'});
    await assert.rejects(tx.query("UPDATE snappik_auth.schema_migrations SET checksum='forged'"),{code:'42501'});
  }finally{await tx.query('RESET ROLE');tx.release();}
});

test('operator requires current permission and persisted same-session TOTP; enrollment is not assurance',async()=>{
  const f=await owner();const uid=(await context.app.query('SELECT id FROM users WHERE auth_subject=$1',[f.session.subject])).rows[0].id;
  const check=()=>transaction(context.app,tx=>requireOperator(tx,uid,f.session.sessionId,'diagnostics_read'));
  await assert.rejects(check(),/PERMISSION_DENIED/);
  await context.app.query("INSERT INTO platform_roles(user_id,permission) VALUES($1,'diagnostics_read')",[uid]);
  await assert.rejects(check(),/MFA_REQUIRED/);
  const enrollment=await context.library.handler(context.request('/two-factor/enable',{password:testPassword},f.cookie));assert.equal(enrollment.status,200);
  const row=(await context.app.query('SELECT secret FROM snappik_auth."twoFactor" WHERE "userId"=$1',[f.session.subject])).rows[0];
  const secret=await symmetricDecrypt({key:(await context.library.$context).secretConfig,data:row.secret});
  const code=(await context.library.api.generateTOTP({body:{secret}})).code;
  const verification=await context.auth.handle(context.request('/two-factor/verify-totp',{code},f.cookie));assert.equal(verification.status,200);
  // The enrollment verification may rotate the session. Resolve the returned cookie if present.
  const cookie=verification.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')||f.cookie;
  const current=await context.auth.resolveSession(new Request(context.origin,{headers:{cookie}}));assert.ok(current);
  await transaction(context.app,tx=>requireOperator(tx,uid,current.sessionId,'diagnostics_read'));
  await context.app.query(`UPDATE owner_session_security SET mfa_verified_at=clock_timestamp()-interval '15 minutes' WHERE session_id=$1`,[current.sessionId]);
  await assert.rejects(transaction(context.app,tx=>requireOperator(tx,uid,current.sessionId,'diagnostics_read')),/MFA_REQUIRED/);
  await context.app.query("UPDATE owner_session_security SET mfa_verified_at=clock_timestamp(),mfa_method='backup_code' WHERE session_id=$1",[current.sessionId]);
  await assert.rejects(transaction(context.app,tx=>requireOperator(tx,uid,current.sessionId,'diagnostics_read')),/MFA_REQUIRED/);
});

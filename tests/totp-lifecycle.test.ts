import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {fork} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {symmetricDecrypt} from 'better-auth/crypto';
import {isolatedPostgres} from '../scripts/test-postgres.js';
import {migrate} from '../src/db/migrate.js';
import {migrateAuth,loadAuthMigrations,assertAuthSchema} from '../src/db/auth-migrate.js';
import {testAuthentication,testPassword} from './fixtures/auth-library.js';
import {deliverRecovery} from '../src/modules/auth/recovery.js';
import {provisionOwner,completeSetup,getMe} from '../src/modules/onboarding/service.js';
import {createOwnerHandlers} from '../src/modules/onboarding/http.js';
import {authCookies,signedChallenge,challengeHash} from '../src/modules/auth/challenge.js';
import {attachSession} from '../src/modules/auth/security.js';
import {createLibrary} from '../src/modules/auth/library.js';
import {createAuthentication} from '../src/modules/auth/http.js';

let db:Awaited<ReturnType<typeof isolatedPostgres>>,context:ReturnType<typeof testAuthentication>;
const secret=randomBytes(48).toString('base64url'),key=randomBytes(32);
before(async()=>{db=await isolatedPostgres();const pool=new pg.Pool({connectionString:db.connectionString});
  try{await migrate(pool);await migrateAuth(pool);}finally{await pool.end();}
  context=testAuthentication(db.connectionString,undefined,secret,[],key);});
after(async()=>{await context?.close();await db?.server.stop();});
beforeEach(async()=>{await context.app.query('DELETE FROM snappik_auth.admission_bucket');});
const cookies=(response:Response)=>response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
const post=(path:string,body:unknown,cookie='',replica=context)=>replica.auth.handle(replica.request(path,body,cookie));
const session=(cookie:string)=>context.auth.resolveSession(new Request(context.origin,{headers:{cookie}}));
const replica=()=>testAuthentication(db.connectionString,undefined,secret,[],key);
const latch=()=>{let release!:()=>void;return {promise:new Promise<void>(resolve=>{release=resolve;}),release:()=>release()};};
async function waitGate(count=1){for(let i=0;i<150;i++){
  if((await context.app.query("SELECT count(*)::int n FROM pg_locks WHERE locktype='advisory' AND objid=734004 AND NOT granted")).rows[0].n>=count)return;
  await context.app.query('SELECT pg_sleep(0.01)');
}throw new Error('GATE_BARRIER_NOT_REACHED');}
async function pendingId(cookie:string){const ctx=await context.library.$context,name=ctx.createAuthCookie('two_factor').name;
  const id=signedChallenge(authCookies(new Headers({cookie}),[name]).get(name),ctx.secret);assert.ok(id);return id;}
async function recovered(email:string){
  assert.equal((await post('/request-password-reset',{email,request_id:randomUUID()})).status,202);
  let token='';for(let i=0;i<10;i++)if(await deliverRecovery(context.app,key,context.origin,async message=>{if(message.email===email)token=message.code;})==='idle')break;
  assert.ok(token);return token;
}
async function child(action:'verify'|'logout'|'resolve',cookie:string,code=''){
  const observer=fork(new URL('./fixtures/totp-observer.ts',import.meta.url),[],{execArgv:process.execArgv,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  return new Promise<{status:number;cookie:string;active:boolean}>((resolve,reject)=>{
    const timer=setTimeout(()=>{observer.kill();reject(new Error('TOTP_OBSERVER_TIMEOUT'));},15000);
    observer.once('error',reject);observer.once('exit',()=>{clearTimeout(timer);reject(new Error('TOTP_OBSERVER_EXIT'));});
    observer.once('message',(value:{status:number;cookie:string;active:boolean;error?:string})=>{clearTimeout(timer);value.error?reject(new Error(value.error)):resolve(value);});
    observer.send({connectionString:db.connectionString,secret,action,cookie,code});
  });
}
async function enrolled(){
  const email=`totp-${randomUUID()}@example.test`;await context.register(email);const owner=await context.login(email);
  const raw=await context.library.api.getSession({headers:owner.request.headers});assert.ok(raw);
  assert.equal((await context.library.handler(context.request('/two-factor/enable',{password:testPassword},owner.cookie))).status,200);
  const row=(await context.app.query('SELECT secret FROM snappik_auth."twoFactor" WHERE "userId"=$1',[raw.user.id])).rows[0];
  const factor=await symmetricDecrypt({key:(await context.library.$context).secretConfig,data:row.secret});
  const code=async()=>(await context.library.api.generateTOTP({body:{secret:factor}})).code;
  const verified=await post('/two-factor/verify-totp',{code:await code()},owner.cookie);assert.equal(verified.status,200);
  const authenticated=cookies(verified)||owner.cookie;
  const challenge=async()=>{const response=await post('/sign-in/email',{email,password:testPassword});
    assert.equal(response.status,200);assert.equal((await response.json()).two_factor_required,true);return cookies(response);};
  return {email,subject:raw.user.id,authenticated,code,challenge};
}

test('copied pending challenge cannot complete after acknowledged logout',async()=>{
  const f=await enrolled(),pending=await f.challenge();assert.equal(await session(pending),null);
  assert.equal((await post('/sign-out',{},pending)).status,200);
  const completion=await post('/two-factor/verify-totp',{code:await f.code()},pending);
  if(completion.ok)assert.ok(await session(cookies(completion)),'baseline completion produced an authorized app session');
  assert.equal(completion.status,401,'copied pending primary proof must be revoked by logout');
  assert.ok(await session(f.authenticated),'pending logout must not log out unrelated sessions');
  const native=(await context.app.query('SELECT 1 FROM snappik_auth.verification WHERE identifier=ANY($1::text[])',[[await pendingId(pending),`2fa-attempts-${await pendingId(pending)}`]])).rowCount;
  assert.equal(native,0);
});

test('pending proof cannot read protected routes; successful completion is single-use, expiry is strict DB time',async()=>{
  const f=await enrolled(),pending=await f.challenge();
  const handlers=createOwnerHandlers({pool:()=>context.app,auth:context.auth,origin:()=>context.origin});
  const request=new Request(context.origin+'/api/v1/me',{headers:{cookie:pending}});
  assert.equal((await handlers.me(request)).status,401);
  const done=await post('/two-factor/verify-totp',{code:await f.code()},pending);assert.equal(done.status,200);
  assert.ok(await session(cookies(done)));assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},pending)).status,401);
  const expired=await f.challenge();await context.app.query(`UPDATE snappik_auth.totp_challenge_security SET expires_at=clock_timestamp() WHERE challenge_hash=$1`,[challengeHash('better-auth:synthetic-local',await pendingId(expired))]);
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},expired)).status,401);
  const nativeExpired=await f.challenge();await context.app.query('UPDATE snappik_auth.verification SET "expiresAt"=clock_timestamp() WHERE identifier=$1',[await pendingId(nativeExpired)]);
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},nativeExpired)).status,401);
});

test('completion before logout binds its resulting session even if completion response is discarded',async()=>{
  const f=await enrolled(),pending=await f.challenge();
  const completed=await child('verify',pending,await f.code());assert.equal(completed.status,200);assert.ok(completed.active);
  // Logout has only the original pending cookie, never the new session cookie.
  assert.equal((await child('logout',pending)).status,200);
  assert.equal((await child('resolve',completed.cookie)).active,false);
  assert.equal((await child('verify',pending,await f.code())).status,401);
});

test('concurrent completion wins then queued logout revokes the linked session across instances',async()=>{
  const f=await enrolled(),pending=await f.challenge(),other=replica(),ctx=await context.library.$context;
  const entered=latch(),resume=latch(),create=ctx.internalAdapter.createSession;
  ctx.internalAdapter.createSession=async(...args)=>{entered.release();await resume.promise;return create(...args);};
  try{
    const verification=post('/two-factor/verify-totp',{code:await f.code()},pending);await entered.promise;
    const logout=post('/sign-out',{},pending,other);await waitGate();resume.release();
    const result=await verification;assert.equal(result.status,200);assert.equal((await logout).status,200);
    assert.equal(await session(cookies(result)),null);
  }finally{resume.release();ctx.internalAdapter.createSession=create;await other.close();}
});

test('queued logout wins then completion denies; same-process overlap returns retryable failure',async()=>{
  const f=await enrolled(),pending=await f.challenge(),a=replica(),b=replica(),blocker=await context.app.connect();
  try{
    await blocker.query('BEGIN');await blocker.query('SELECT pg_advisory_xact_lock(734004)');
    const logout=post('/sign-out',{},pending,a);await waitGate();
    const localBusy=await post('/two-factor/verify-totp',{code:await f.code()},pending,a);assert.equal(localBusy.status,503);
    const verify=post('/two-factor/verify-totp',{code:await f.code()},pending,b);await waitGate(2);
    await blocker.query('COMMIT');assert.equal((await logout).status,200);assert.equal((await verify).status,401);
  }finally{await blocker.query('ROLLBACK');blocker.release();await a.close();await b.close();}
});

test('logout transaction failure rolls back session and challenge revocation; retries and discarded acknowledgements are safe',async()=>{
  const f=await enrolled(),pending=await f.challenge(),jar=f.authenticated+'; '+pending.split(';').filter(p=>p.trim().startsWith('snappik-owner.two_factor=')).join(';');
  await context.app.query(`CREATE FUNCTION snappik_auth.totp_delete_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'PRIVATE_TOTP_FAILURE'; END $$;
    CREATE TRIGGER totp_delete_failure BEFORE DELETE ON snappik_auth.verification FOR EACH ROW EXECUTE FUNCTION snappik_auth.totp_delete_failure()`);
  try{
    const result=await post('/sign-out',{},jar);assert.equal(result.status,503);assert.equal(result.headers.getSetCookie().length,0);
    const payload=await result.text();assert.ok(!payload.includes('PRIVATE_TOTP_FAILURE')&&!payload.includes(pending));
    assert.ok(await session(f.authenticated));
    assert.equal((await context.app.query('SELECT revoked_at FROM snappik_auth.totp_challenge_security WHERE challenge_hash=$1',[challengeHash('better-auth:synthetic-local',await pendingId(pending))])).rows[0].revoked_at,null);
  }finally{await context.app.query('DROP TRIGGER totp_delete_failure ON snappik_auth.verification; DROP FUNCTION snappik_auth.totp_delete_failure()');}
  assert.equal((await post('/sign-out',{},jar)).status,200); // Treat response as lost; retry original cookie.
  assert.equal((await post('/sign-out',{},jar)).status,200);assert.equal(await session(f.authenticated),null);
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},pending)).status,401);
});

test('signature verification prevents cross-challenge cancellation; equivalent cookie spellings cancel and ambiguous cookies reject',async()=>{
  const f=await enrolled(),pending=await f.challenge(),ctx=await context.library.$context,name=ctx.createAuthCookie('two_factor').name;
  const value=authCookies(new Headers({cookie:pending}),[name]).get(name)!;
  const tampered=value.slice(0,-2)+(value.at(-2)==='A'?'B':'A')+'=';
  assert.equal((await post('/sign-out',{},`${name}=${encodeURIComponent(tampered)}`)).status,200);
  assert.equal((await context.app.query('SELECT revoked_at FROM snappik_auth.totp_challenge_security WHERE challenge_hash=$1',[challengeHash('better-auth:synthetic-local',await pendingId(pending))])).rows[0].revoked_at,null);
  assert.equal((await post('/sign-out',{},`${name}=${encodeURIComponent(value)}; ${name}=${encodeURIComponent(value)}`)).status,400);
  const encoded=[...value].map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
  assert.equal((await post('/sign-out',{},`${name} = "${encoded}"`)).status,200);
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},pending)).status,401);
  const rows=JSON.stringify((await context.app.query('SELECT * FROM snappik_auth.totp_challenge_security')).rows);
  assert.ok(!rows.includes(value)&&!rows.includes(await pendingId(pending)),'receipt stores only a digest, no bearer proof');
});

test('password reset and independent security-version changes invalidate pending proof; suspension stays a business restriction',async()=>{
  const f=await enrolled(),pending=await f.challenge(),reset=await recovered(f.email);
  assert.equal((await post('/reset-password',{token:reset,new_password:'Synthetic-reset!TOTP-9341'})).status,200);
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},pending)).status,401);assert.equal(await session(f.authenticated),null);
  assert.equal((await context.app.query('SELECT "twoFactorEnabled" FROM snappik_auth."user" WHERE id=$1',[f.subject])).rows[0].twoFactorEnabled,true);
  const other=await enrolled(),stale=await other.challenge();
  await context.app.query('UPDATE public.users SET security_version=security_version+1 WHERE auth_subject=$1',[other.subject]);
  assert.equal((await post('/two-factor/verify-totp',{code:await other.code()},stale)).status,401);
  const suspended=await enrolled(),valid=await session(suspended.authenticated);assert.ok(valid);const me=await provisionOwner(context.app,valid);
  await context.app.query("UPDATE studios SET status='suspended' WHERE id=$1",[me.studio!.id]);
  const challenge=await suspended.challenge(),done=await post('/two-factor/verify-totp',{code:await suspended.code()},challenge);assert.equal(done.status,200);
  const restricted=await session(cookies(done));assert.ok(restricted);assert.equal((await getMe(context.app,restricted)).setup_status,'suspended');
  await assert.rejects(completeSetup(context.app,restricted,{name:'Synthetic',slug:'s-'+randomUUID(),locale:'id',timezone:'UTC'},randomUUID()),/FORBIDDEN/);
  assert.equal((await post('/sign-out',{},cookies(done))).status,200);
});

test('reset queued behind challenge completion invalidates its session; version change during attachment cannot be restamped',async()=>{
  const f=await enrolled(),pending=await f.challenge(),token=await recovered(f.email),other=replica(),ctx=await context.library.$context;
  const create=ctx.internalAdapter.createSession,entered=latch(),resume=latch();
  ctx.internalAdapter.createSession=async(...args)=>{entered.release();await resume.promise;return create(...args);};
  try{
    const verification=post('/two-factor/verify-totp',{code:await f.code()},pending);await entered.promise;
    const resetting=post('/reset-password',{token,new_password:'Synthetic-reset!Race-9341'},'',other);await waitGate();resume.release();
    const done=await verification;assert.equal(done.status,200);assert.equal((await resetting).status,200);assert.equal(await session(cookies(done)),null);
  }finally{resume.release();ctx.internalAdapter.createSession=create;await other.close();}
  const fresh=await enrolled(),stale=await fresh.challenge(),entered2=latch(),resume2=latch();
  ctx.internalAdapter.createSession=async(...args)=>{entered2.release();await resume2.promise;return create(...args);};
  try{
    const verification=post('/two-factor/verify-totp',{code:await fresh.code()},stale);await entered2.promise;
    await context.app.query('UPDATE public.users SET security_version=security_version+1 WHERE auth_subject=$1',[fresh.subject]);resume2.release();
    const denied=await verification;assert.equal(denied.status,503);assert.equal(denied.headers.getSetCookie().length,0);
    const rows=await context.app.query(`SELECT 1 FROM public.owner_session_security m JOIN public.users u ON u.id=m.user_id
      WHERE u.auth_subject=$1 AND m.security_version=u.security_version AND m.revoked_at IS NULL`,[fresh.subject]);assert.equal(rows.rowCount,0);
  }finally{resume2.release();ctx.internalAdapter.createSession=create;}
});

test('database outage, process reconstruction and database restart cannot resurrect revoked or consumed challenges',async()=>{
  const f=await enrolled(),pending=await f.challenge();await db.server.stop();
  try{const response=await post('/sign-out',{},pending);assert.equal(response.status,503);assert.equal(response.headers.getSetCookie().length,0);}
  finally{await db.server.start();}
  assert.equal((await child('logout',pending)).status,200);
  await context.close();await db.server.stop();await db.server.start();context=testAuthentication(db.connectionString,undefined,secret,[],key);
  assert.equal((await child('verify',pending,await f.code())).status,401);
  assert.equal((await child('logout',pending)).status,200);
});

test('006 preserves populated005 and refuses legacy pending adoption; restricted runtime executes the lifecycle without repointing receipts',async()=>{
  const isolated=await isolatedPostgres(),pool=new pg.Pool({connectionString:isolated.connectionString});let legacy:ReturnType<typeof testAuthentication>|undefined;
  try{
    await migrate(pool);await migrateAuth(pool,(await loadAuthMigrations()).slice(0,5));legacy=testAuthentication(isolated.connectionString);
    const email=`legacy-${randomUUID()}@example.test`;await legacy.register(email);
    const login=await legacy.library.api.signInEmail({body:{email,password:testPassword},asResponse:true});
    const tables=['snappik_auth."user"','snappik_auth.account','snappik_auth.session','snappik_auth.verification','public.users','public.owner_session_security','snappik_auth.admission_bucket','snappik_auth.admission_policy'];
    const snapshot=()=>Promise.all(tables.map(async name=>(await pool.query(`SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'')) digest FROM ${name} t`)).rows[0].digest));
    const before=await snapshot();await assert.rejects(assertAuthSchema(pool),/NOT_READY/);await migrateAuth(pool);await migrateAuth(pool);await assertAuthSchema(pool);
    assert.deepEqual(await snapshot(),before);assert.ok(await legacy.auth.resolveSession(new Request(legacy.origin,{headers:{cookie:cookies(login)}})));
    assert.equal((await pool.query('SELECT count(*)::int n FROM snappik_auth.totp_challenge_security')).rows[0].n,0);
  }finally{await legacy?.close();await pool.end();await isolated.server.stop();}
  const f=await enrolled(),pending=await f.challenge(),id=await pendingId(pending),hash=challengeHash('better-auth:synthetic-local',id);
  await context.app.query('DELETE FROM snappik_auth.totp_challenge_security WHERE challenge_hash=$1',[hash]);
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},pending)).status,401,'native-only legacy proof is not adopted');
  await context.app.query('CREATE ROLE synthetic_totp_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT');
  for(const file of ['src/db/runtime-grants.sql','src/db/onboarding-grants.sql','src/db/auth-grants.sql'])await context.app.query((await readFile(file,'utf8')).replaceAll(':"runtime_role"','synthetic_totp_runtime'));
  const app=new pg.Pool({connectionString:db.connectionString,max:4,options:'-c role=synthetic_totp_runtime'});
  const database=new pg.Pool({connectionString:db.connectionString,max:3,options:'-c role=synthetic_totp_runtime -c search_path=snappik_auth'});
  try{
    const library=createLibrary({database,appDatabase:app,origin:context.origin,instanceId:'synthetic-local',secret});
    const auth=createAuthentication(library,app,context.origin,'synthetic-local');
    const challenge=await auth.handle(context.request('/sign-in/email',{email:f.email,password:testPassword}));assert.equal(challenge.status,200);
    const proof=cookies(challenge),done=await auth.handle(context.request('/two-factor/verify-totp',{code:await f.code()},proof));assert.equal(done.status,200);
    assert.ok(await auth.resolveSession(new Request(context.origin,{headers:{cookie:cookies(done)}})));
    assert.equal((await auth.handle(context.request('/sign-out',{},proof))).status,200);assert.equal(await session(cookies(done)),null);
    await assert.rejects(app.query('UPDATE snappik_auth.totp_challenge_security SET user_id=user_id'),{code:'42501'});
    await assert.rejects(app.query('UPDATE snappik_auth.totp_challenge_security SET security_version=security_version'),{code:'42501'});
    await assert.rejects(app.query('CREATE TABLE snappik_auth.totp_forbidden(id int)'),{code:'42501'});
  }finally{await app.end();await database.end();}
});

test('failed attachment cannot authorize an orphan; revoking a session never permits TOTP step-up or enrollment resurrection',async()=>{
  const f=await enrolled(),pending=await f.challenge();
  const printed:string[]=[],log=console.error;console.error=(...args)=>printed.push(args.map(String).join(' '));
  await context.app.query(`CREATE FUNCTION snappik_auth.totp_bind_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.session_id IS NOT NULL THEN RAISE EXCEPTION 'PRIVATE_BIND_FAILURE'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER totp_bind_failure BEFORE UPDATE ON snappik_auth.totp_challenge_security FOR EACH ROW EXECUTE FUNCTION snappik_auth.totp_bind_failure()`);
  try{
    const result=await post('/two-factor/verify-totp',{code:await f.code()},pending);assert.equal(result.status,503);assert.equal(result.headers.getSetCookie().length,0);
    assert.ok(!(await result.text()).includes('PRIVATE_BIND_FAILURE'));
    const orphan=(await context.app.query(`SELECT s.id,s.token FROM snappik_auth.session s LEFT JOIN public.owner_session_security m ON m.session_id=s.id
      WHERE s."userId"=$1 AND m.session_id IS NULL`,[f.subject])).rows;
    assert.ok(orphan.length>0,'native failure can leave an unissued physical session');
    const row=orphan.at(-1)!,ctx=await context.library.$context;
    const signed=row.token+'.'+createHmac('sha256',ctx.secret).update(row.token).digest('base64');
    assert.equal(await session(ctx.authCookies.sessionToken.name+'='+encodeURIComponent(signed)),null);
    await assert.rejects(attachSession(context.app,'better-auth:synthetic-local',row.id,f.subject,challengeHash('better-auth:synthetic-local',await pendingId(pending))),/PRIVATE_BIND_FAILURE/);
    assert.equal(printed.length,0,'unexpected native exceptions must reach the sanitizing wrapper without raw console output');
  }finally{console.error=log;await context.app.query('DROP TRIGGER totp_bind_failure ON snappik_auth.totp_challenge_security; DROP FUNCTION snappik_auth.totp_bind_failure()');}
  // No successful response was issued; consumed native proof requires a fresh login.
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},pending)).status,401);
  assert.equal((await post('/sign-out',{},pending)).status,200);
  const fresh=await f.challenge(),done=await post('/two-factor/verify-totp',{code:await f.code()},fresh);assert.equal(done.status,200);
  const active=await session(cookies(done));assert.ok(active);
  await context.app.query('UPDATE public.owner_session_security SET revoked_at=clock_timestamp() WHERE session_id=$1',[active.sessionId]);
  assert.ok(await context.library.api.getSession({headers:{cookie:cookies(done)}}),'native row deliberately retained');
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},cookies(done))).status,401);
  assert.equal((await post('/two-factor/verify-totp',{code:await f.code()},fresh)).status,401);
  const email=`enroll-${randomUUID()}@example.test`;await context.register(email);const initial=await context.login(email);
  const user=(await context.library.api.getSession({headers:initial.request.headers}))!.user;
  assert.equal((await context.library.api.enableTwoFactor({headers:initial.request.headers,body:{password:testPassword},asResponse:true})).status,200);
  const factor=(await context.app.query('SELECT secret FROM snappik_auth."twoFactor" WHERE "userId"=$1',[user.id])).rows[0];
  const factorSecret=await symmetricDecrypt({key:(await context.library.$context).secretConfig,data:factor.secret});
  const code=(await context.library.api.generateTOTP({body:{secret:factorSecret}})).code;
  await context.app.query('UPDATE public.owner_session_security SET revoked_at=clock_timestamp() WHERE user_id IN(SELECT id FROM public.users WHERE auth_subject=$1)',[user.id]);
  assert.equal((await post('/two-factor/verify-totp',{code},initial.cookie)).status,401);
  assert.equal((await context.app.query('SELECT "twoFactorEnabled" FROM snappik_auth."user" WHERE id=$1',[user.id])).rows[0].twoFactorEnabled??false,false);
});

test('two separate processes completing the same pending proof have exactly one winner',async()=>{
  const f=await enrolled(),pending=await f.challenge(),code=await f.code();
  const outcomes=await Promise.all([child('verify',pending,code),child('verify',pending,code)]);
  assert.deepEqual(outcomes.map(value=>value.status).sort(),[200,401]);
  const winner=outcomes.find(value=>value.status===200)!;assert.ok(winner.active);
  assert.equal((await post('/sign-out',{},pending)).status,200);assert.equal(await session(winner.cookie),null);
});

test('receipt cleanup is bounded and never loses cancellation of a live resulting session',async()=>{
  const f=await enrolled(),pending=await f.challenge(),done=await post('/two-factor/verify-totp',{code:await f.code()},pending);assert.equal(done.status,200);
  const user=(await context.app.query('SELECT id,security_version FROM public.users WHERE auth_subject=$1',[f.subject])).rows[0];
  const receipt=challengeHash('better-auth:synthetic-local',await pendingId(pending));
  await context.app.query("UPDATE snappik_auth.totp_challenge_security SET expires_at='2000-01-01Z' WHERE challenge_hash=$1",[receipt]);
  await context.app.query(`INSERT INTO snappik_auth.totp_challenge_security(challenge_hash,user_id,security_version,expires_at)
    SELECT md5($1||g::text)||md5(g::text||$1),$2,$3,'2000-01-01Z' FROM generate_series(1,40) g`,[randomUUID(),user.id,user.security_version]);
  await f.challenge();
  assert.equal((await context.app.query("SELECT count(*)::int n FROM snappik_auth.totp_challenge_security WHERE expires_at='2000-01-01Z' AND session_id IS NULL")).rows[0].n,8);
  assert.equal((await context.app.query('SELECT 1 FROM snappik_auth.totp_challenge_security WHERE challenge_hash=$1',[receipt])).rowCount,1);
  assert.equal((await post('/sign-out',{},pending)).status,200);assert.equal(await session(cookies(done)),null);
});

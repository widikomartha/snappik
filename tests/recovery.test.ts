import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {fork} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {symmetricDecrypt} from 'better-auth/crypto';
import {isolatedPostgres} from '../scripts/test-postgres.js';
import {migrate} from '../src/db/migrate.js';
import {migrateAuth,loadAuthMigrations} from '../src/db/auth-migrate.js';
import {claimRecovery,settleRecovery,deliverRecovery,recoveryHash,requestRecovery,resetRecovery} from '../src/modules/auth/recovery.js';
import {credentialGate} from '../src/modules/auth/gate.js';
import {completeSetup} from '../src/modules/onboarding/service.js';
import {testAuthentication,testPassword} from './fixtures/auth-library.js';
let instance:Awaited<ReturnType<typeof isolatedPostgres>>,context:ReturnType<typeof testAuthentication>;
const key=randomBytes(32),newPassword='Synthetic-reset-only!Password-734';
before(async()=>{
  instance=await isolatedPostgres();const setup=new pg.Pool({connectionString:instance.connectionString});
  try{await migrate(setup);await migrateAuth(setup);}finally{await setup.end();}
  context=testAuthentication(instance.connectionString,undefined,undefined,[],key);
});
after(async()=>{await context?.close();await instance?.server.stop();});
const address=()=>`recovery-${randomUUID()}@example.test`;
const request=(email:string,id:string=randomUUID())=>context.auth.handle(context.request('/request-password-reset',{email,request_id:id}));
const reset=(token:string,password=newPassword)=>context.auth.handle(context.request('/reset-password',{token,new_password:password}));
const login=(email:string,password:string,auth=context)=>auth.auth.handle(auth.request('/sign-in/email',{email,password}));
const cookie=(response:Response)=>response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const session=(value:string,auth=context)=>auth.auth.resolveSession(new Request(context.origin,{headers:{cookie:value}}));
const captured:{id:string;email:string;url:string}[]=[];
async function drain(){for(let i=0;i<30;i++){if(await deliverRecovery(context.app,key,context.origin,async message=>{captured.push(message);})==='idle')return;}throw new Error('TEST_BATCH_BOUND');}
async function token(email:string){await context.register(email);assert.equal((await request(email)).status,202);await drain();const message=captured.findLast(m=>m.email===email);assert.ok(message);return new URLSearchParams(new URL(message.url).hash.slice(1)).get('token')!;}
async function waiting() {
  for(let i=0;i<100;i++){
    if((await context.app.query("SELECT 1 FROM pg_stat_activity WHERE wait_event='advisory' AND query='SELECT pg_advisory_xact_lock(734004)'")).rowCount)return;
    await context.app.query('SELECT pg_sleep(0.01)');
  }
  throw new Error('AUTH_GATE_BARRIER_NOT_REACHED');
}
function latch(){let release!:()=>void;const promise=new Promise<void>(resolve=>{release=resolve;});return {promise,release};}

test('additive recovery migration upgrades populated 003 without changing credentials, sessions, metadata or business records',async()=>{
  const db=await isolatedPostgres(),setup=new pg.Pool({connectionString:db.connectionString});
  let previous:ReturnType<typeof testAuthentication>|undefined;
  try {
    await migrate(setup);await migrateAuth(setup,(await loadAuthMigrations()).slice(0,3));
    previous=testAuthentication(db.connectionString);const email=address();await previous.register(email);const signed=await previous.login(email);
    const active=await previous.auth.resolveSession(signed.request);assert.ok(active);
    await completeSetup(setup,active,{name:'Synthetic Upgrade',slug:`u-${randomUUID()}`,locale:'id',timezone:'UTC'},randomUUID());
    const tables=['snappik_auth."user"','snappik_auth.account','snappik_auth.session','public.users','public.owner_session_security','public.studios','public.entitlement_grants'];
    // Compare digests so an assertion failure cannot print raw credentials/cookies.
    const snapshot=()=>Promise.all(tables.map(async table=>(await setup.query(`SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'')) AS digest FROM ${table} t`)).rows[0].digest));
    const before=await snapshot();await migrateAuth(setup);await migrateAuth(setup);assert.deepEqual(await snapshot(),before);
    assert.ok(await previous.auth.resolveSession(signed.request));
    assert.equal((await setup.query('SELECT count(*)::int n FROM snappik_auth.recovery_outbox')).rows[0].n,0);
  }finally{await previous?.close();await setup.end();await db.server.stop();}
});

test('known/unknown requests share generic durable acknowledgement; response-loss retry and durable address budget dedupe',async()=>{
  const known=address(),unknown=address();await context.register(known);
  const id=randomUUID(),first=await request(known,id),other=await request(unknown);
  assert.equal(first.status,202);assert.equal(other.status,202);assert.deepEqual(await first.json(),await other.json());
  const count=async()=>(await context.app.query('SELECT count(*)::int n FROM snappik_auth.recovery_outbox')).rows[0].n;
  const initial=await count();assert.equal((await request(known,id)).status,202);assert.equal(await count(),initial);
  assert.equal((await request(known,id.toUpperCase())).status,202);assert.equal(await count(),initial);
  const replica=testAuthentication(instance.connectionString,context.origin,context.secret,[],key);
  try {
    const racingId=randomUUID();
    const same=()=>replica.auth.handle(replica.request('/request-password-reset',{email:known,request_id:racingId}));
    assert.deepEqual((await Promise.all([request(known,racingId),same()])).map(r=>r.status),[202,202]);
    assert.equal(await count(),initial+1);
  }finally{await replica.close();}
  for(let i=0;i<4;i++)assert.equal((await request(known)).status,202);
  assert.equal(await count(),initial+2); // Three/hour including original; no account-state throttle DTO.
  await drain();assert.equal(captured.filter(m=>m.email===known).length,3);assert.equal(captured.filter(m=>m.email===unknown).length,0);
});

test('identical concurrent token consumption has one committed winner and one invalid-token result',async()=>{
  const email=address(),raw=await token(email),replica=testAuthentication(instance.connectionString,context.origin,context.secret,[],key);
  try {
    const results=await Promise.all([reset(raw),replica.auth.handle(replica.request('/reset-password',{token:raw,new_password:newPassword}))]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
  }finally{await replica.close();}
});

test('reset delegates hashing, consumes once and invalidates all copied sessions without changing MFA/business identity',async()=>{
  const email=address(),raw=await token(email),one=await context.login(email),two=await context.login(email);
  const old=await session(one.cookie);assert.ok(old);
  await completeSetup(context.app,old,{name:'Synthetic Recovery Studio',slug:`r-${randomUUID()}`,locale:'id',timezone:'UTC'},randomUUID());
  const business=async()=>Promise.all(['studios','studio_members','studio_settings','entitlement_grants','audit_events'].map(async table=>(await context.app.query(`SELECT to_jsonb(t) AS data FROM public.${table} t ORDER BY to_jsonb(t)::text`)).rows));
  const before=await business();
  const users=(await context.app.query('SELECT id,security_version FROM public.users WHERE auth_subject=$1',[old.subject])).rows[0];
  assert.equal((await reset(raw)).status,200); // Intentionally discard response: retry must never claim unchanged password.
  assert.equal((await reset(raw)).status,400);assert.equal(await session(one.cookie),null);assert.equal(await session(two.cookie),null);
  const next=(await context.app.query('SELECT id,security_version FROM public.users WHERE id=$1',[users.id])).rows[0];
  assert.equal(next.id,users.id);assert.equal(next.security_version,users.security_version+1);
  assert.equal((await login(email,testPassword)).status,401);const signed=await login(email,newPassword);assert.equal(signed.status,200);assert.ok(await session(cookie(signed)));
  assert.deepEqual(await business(),before); // Trial, settings, membership and acknowledged audit remain unchanged.
  const stored=(await context.app.query(`SELECT password FROM snappik_auth.account WHERE "userId"=$1 AND "providerId"='credential'`,[old.subject])).rows[0].password;
  assert.notEqual(stored,newPassword);assert.ok(await (await context.library.$context).password.verify({hash:stored,password:newPassword}));
});

test('expired, malformed, reused and competing valid tokens cannot mutate credentials twice',async()=>{
  const email=address(),raw=await token(email);
  await context.app.query("UPDATE snappik_auth.password_recovery SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1",[recoveryHash(raw)]);
  assert.equal((await reset(raw)).status,400);assert.equal((await reset('invalid')).status,400);assert.equal((await login(email,testPassword)).status,200);
  assert.equal((await request(email)).status,202);await drain();const one=new URLSearchParams(new URL(captured.findLast(m=>m.email===email)!.url).hash.slice(1)).get('token')!;
  assert.equal((await request(email)).status,202);await drain();const two=new URLSearchParams(new URL(captured.findLast(m=>m.email===email)!.url).hash.slice(1)).get('token')!;
  const replica=testAuthentication(instance.connectionString,context.origin,context.secret,[],key);
  try {
    const responses=await Promise.all([reset(one),replica.auth.handle(replica.request('/reset-password',{token:two,new_password:newPassword}))]);
    assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);assert.equal((await reset(one)).status,400);assert.equal((await reset(two)).status,400);
  }finally{await replica.close();}
});

test('outbox retries bounded failures with redacted diagnostics; decrypt key failure and expiry never leak or deliver',async()=>{
  const email=address();await context.register(email);await request(email);
  const get=async()=>(await context.app.query("SELECT * FROM snappik_auth.recovery_outbox WHERE state='queued' ORDER BY created_at DESC LIMIT 1")).rows[0];
  const original=await get();assert.ok(original.payload.startsWith('v1.'));assert.ok(!original.payload.includes(email));
  for(let attempt=1;attempt<=3;attempt++) {
    assert.equal(await deliverRecovery(context.app,key,context.origin,async()=>{throw new Error(`SENSITIVE_TOKEN_URL ${email}`);}),'retry_or_failed');
    const row=(await context.app.query('SELECT * FROM snappik_auth.recovery_outbox WHERE id=$1',[original.id])).rows[0];
    assert.equal(row.attempts,attempt);assert.equal(row.error_code,'DELIVERY_FAILED');assert.equal(row.state,attempt===3?'failed':'queued');
    assert.ok(!JSON.stringify(row).includes(email));assert.ok(!JSON.stringify(row).includes('SENSITIVE_TOKEN_URL'));
    if(attempt<3)await context.app.query("UPDATE snappik_auth.recovery_outbox SET available_at=clock_timestamp()-interval '1 second' WHERE id=$1",[original.id]);
    else assert.equal(row.payload,null);
  }
  assert.equal(await claimRecovery(context.app),null);
  await request(email);assert.equal(await deliverRecovery(context.app,randomBytes(32),context.origin,async()=>assert.fail('wrong key cannot deliver')),'retry_or_failed');
  await context.app.query("UPDATE snappik_auth.password_recovery SET expires_at=clock_timestamp()-interval '1 second' WHERE consumed_at IS NULL");
  assert.equal(await claimRecovery(context.app),null);
  assert.equal((await context.app.query("SELECT count(*)::int n FROM snappik_auth.recovery_outbox WHERE state='cancelled' AND payload IS NOT NULL")).rows[0].n,0);
});

test('abandoned leases survive a separate worker process exit and database restart; stale workers cannot ack reclaimed job',async()=>{
  const email=address();await context.register(email);await request(email);
  const child=fork(new URL('./fixtures/recovery-claim.ts',import.meta.url),[],{execArgv:process.execArgv,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  const claimed=await new Promise<{id:string;lease_id:string;payload:string}>((resolve,reject)=>{
    const timeout=setTimeout(()=>{child.kill();reject(new Error('CLAIM_PROCESS_TIMEOUT'));},10000);
    child.once('error',reject);child.once('message',value=>{clearTimeout(timeout);resolve(value as {id:string;lease_id:string;payload:string});});child.send(instance.connectionString);
  });
  await new Promise<void>(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',()=>resolve());});
  assert.equal(await claimRecovery(context.app),null);
  await instance.server.stop();await instance.server.start();
  await context.app.query("UPDATE snappik_auth.recovery_outbox SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",[claimed.id]);
  const renewed=await claimRecovery(context.app);assert.ok(renewed);assert.equal(renewed.id,claimed.id);assert.notEqual(renewed.lease_id,claimed.lease_id);
  assert.equal(await settleRecovery(context.app,claimed,true),false);assert.equal(await settleRecovery(context.app,renewed,false),true);
  await context.app.query("UPDATE snappik_auth.recovery_outbox SET available_at=clock_timestamp()-interval '1 second' WHERE id=$1",[claimed.id]);
  await drain();assert.ok(captured.find(m=>m.email===email));
  const row=(await context.app.query('SELECT state,attempts,payload,delivery_mode FROM snappik_auth.recovery_outbox WHERE id=$1',[claimed.id])).rows[0];
  assert.deepEqual(row,{state:'completed',attempts:3,payload:null,delivery_mode:'synthetic'});
});

test('delivery response loss repeats the same message safely; timeouts are bounded and do not persist raw failures',async()=>{
  const email=address();await context.register(email);await request(email);
  let delivered:{id:string;email:string;url:string}|undefined;
  assert.equal(await deliverRecovery(context.app,key,context.origin,async message=>{delivered=message;throw new Error('ACK_LOST_AFTER_DELIVERY');}),'retry_or_failed');
  assert.ok(delivered);
  await context.app.query("UPDATE snappik_auth.recovery_outbox SET available_at=clock_timestamp()-interval '1 second' WHERE id=$1",[delivered.id]);
  assert.equal(await deliverRecovery(context.app,key,context.origin,async message=>assert.deepEqual(message,delivered)),'completed_synthetic');
  const raw=new URLSearchParams(new URL(delivered.url).hash.slice(1)).get('token')!;
  assert.equal((await reset(raw)).status,200);assert.equal((await reset(raw)).status,400);
  await request(email);let aborted=false;
  const started=Date.now();
  assert.equal(await deliverRecovery(context.app,key,context.origin,async(_,signal)=>new Promise<void>(resolve=>signal.addEventListener('abort',()=>{aborted=true;resolve();},{once:true}))),'retry_or_failed');
  assert.ok(aborted);assert.ok(Date.now()-started<8000);
  await context.app.query("UPDATE snappik_auth.password_recovery SET expires_at=clock_timestamp()-interval '1 second' WHERE consumed_at IS NULL");
  assert.equal(await claimRecovery(context.app),null);
});

test('enqueue and reset database failures roll back durable receipts, token consumption, hash and session version',async()=>{
  const email=address(),unknown=address();await context.register(email);const id=randomUUID();
  await context.app.query(`CREATE FUNCTION public.recovery_enqueue_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SECRET_ENQUEUE_DETAIL'; END $$;
    CREATE TRIGGER recovery_enqueue_failure BEFORE INSERT ON snappik_auth.recovery_outbox FOR EACH ROW EXECUTE FUNCTION public.recovery_enqueue_failure()`);
  try {
    const count=(await context.app.query('SELECT count(*)::int n FROM snappik_auth.recovery_requests')).rows[0].n;
    for(const value of [email,unknown]){const response=await request(value,id);assert.equal(response.status,503);assert.ok(!(await response.text()).includes('SECRET_ENQUEUE_DETAIL'));}
    assert.equal((await context.app.query('SELECT count(*)::int n FROM snappik_auth.recovery_requests')).rows[0].n,count);
  }finally{await context.app.query('DROP TRIGGER recovery_enqueue_failure ON snappik_auth.recovery_outbox; DROP FUNCTION public.recovery_enqueue_failure()');}
  assert.equal((await request(email,id)).status,202);await drain();const raw=new URLSearchParams(new URL(captured.findLast(m=>m.email===email)!.url).hash.slice(1)).get('token')!;
  const active=await context.login(email);
  await context.app.query(`CREATE FUNCTION public.recovery_reset_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SECRET_RESET_DETAIL'; END $$;
    CREATE TRIGGER recovery_reset_failure BEFORE UPDATE ON public.owner_session_security FOR EACH ROW EXECUTE FUNCTION public.recovery_reset_failure()`);
  try{const failed=await reset(raw);assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes(raw));assert.ok(await session(active.cookie));assert.equal((await login(email,testPassword)).status,200);}
  finally{await context.app.query('DROP TRIGGER recovery_reset_failure ON public.owner_session_security; DROP FUNCTION public.recovery_reset_failure()');}
  assert.equal((await reset(raw)).status,200);assert.equal(await session(active.cookie),null);
});

test('reset versus in-flight old-password login serializes across instances; newly attached pre-reset cookie is denied',async()=>{
  const email=address(),raw=await token(email),entered=latch(),resume=latch(),ctx=await context.library.$context,verify=ctx.password.verify;
  ctx.password.verify=async data=>{const valid=await verify(data);entered.release();await resume.promise;return valid;};
  const replica=testAuthentication(instance.connectionString,context.origin,context.secret,[],key);
  try {
    const signing=login(email,testPassword);await entered.promise;
    const resetting=replica.auth.handle(replica.request('/reset-password',{token:raw,new_password:newPassword}));
    await waiting();resume.release();const signed=await signing;assert.equal(signed.status,200);assert.equal((await resetting).status,200);
    assert.equal(await session(cookie(signed)),null);
  }finally{resume.release();ctx.password.verify=verify;await replica.close();}
});

test('login waiting behind reset cannot validate old credentials or bless them with the new security version',async()=>{
  const email=address(),raw=await token(email),old=await context.login(email),entered=latch(),resume=latch(),ctx=await context.library.$context,hash=ctx.password.hash;
  ctx.password.hash=async password=>{const value=await hash(password);entered.release();await resume.promise;return value;};
  const replica=testAuthentication(instance.connectionString,context.origin,context.secret,[],key);
  try {
    const resetting=reset(raw);await entered.promise;const validating=session(old.cookie);const signing=login(email,testPassword,replica);
    await waiting();resume.release();assert.equal((await resetting).status,200);assert.equal((await signing).status,401);
    assert.equal(await validating,null);
    assert.equal((await login(email,newPassword,replica)).status,200);
  }finally{resume.release();ctx.password.hash=hash;await replica.close();}
});

test('reviewed non-owner grants execute recovery enqueue, outbox and reset while denying identity/DDL escalation',async()=>{
  const email=address();await context.register(email);const old=await context.login(email);
  await context.app.query('CREATE ROLE synthetic_recovery_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT');
  for(const file of ['src/db/runtime-grants.sql','src/db/onboarding-grants.sql','src/db/auth-grants.sql']) {
    await context.app.query((await readFile(file,'utf8')).replaceAll(':"runtime_role"','synthetic_recovery_runtime'));
  }
  const restricted=new pg.Pool({connectionString:instance.connectionString,max:2,options:'-c role=synthetic_recovery_runtime'});
  try {
    await requestRecovery(restricted,key,email,randomUUID());
    let raw='';assert.equal(await deliverRecovery(restricted,key,context.origin,async message=>{raw=new URLSearchParams(new URL(message.url).hash.slice(1)).get('token')!;}),'completed_synthetic');
    await credentialGate(restricted)(tx=>resetRecovery(tx,'better-auth:synthetic-local',raw,async()=>(await context.library.$context).password.hash(newPassword)));
    assert.equal(await session(old.cookie),null);assert.equal((await login(email,newPassword)).status,200);
    await assert.rejects(restricted.query('UPDATE public.users SET auth_subject=auth_subject WHERE false'),{code:'42501'});
    await assert.rejects(restricted.query('CREATE TABLE snappik_auth.forbidden_recovery(id int)'),{code:'42501'});
  }finally{await restricted.end();}
});

test('reset cancels copied pending TOTP primary proof, retains enrollment and requires a fresh password challenge',async()=>{
  const email=address(),raw=await token(email),active=await context.login(email);
  const enabled=await context.library.api.enableTwoFactor({headers:active.request.headers,body:{password:testPassword}});
  assert.equal(enabled.method,'totp');assert.ok('totpURI' in enabled&&enabled.totpURI);
  const user=(await context.library.api.getSession({headers:active.request.headers}))!.user;
  // Fixture-only enrollment completion. No production factor-management endpoint is opened.
  await context.app.query('UPDATE snappik_auth."twoFactor" SET verified=true WHERE "userId"=$1',[user.id]);
  await context.app.query('UPDATE snappik_auth."user" SET "twoFactorEnabled"=true WHERE id=$1',[user.id]);
  const pending=await login(email,testPassword);assert.equal((await pending.clone().json()).two_factor_required,true);const copied=cookie(pending);
  const factor=(await context.app.query('SELECT secret FROM snappik_auth."twoFactor" WHERE "userId"=$1',[user.id])).rows[0];
  const factorSecret=await symmetricDecrypt({key:(await context.library.$context).secretConfig,data:factor.secret});
  const code=(await context.library.api.generateTOTP({body:{secret:factorSecret}})).code;
  assert.equal((await reset(raw)).status,200);
  assert.equal((await context.auth.handle(context.request('/two-factor/verify-totp',{code},copied))).status,401);
  assert.equal((await context.app.query('SELECT "twoFactorEnabled" FROM snappik_auth."user" WHERE id=$1',[user.id])).rows[0].twoFactorEnabled,true);
  const fresh=await login(email,newPassword);assert.equal((await fresh.json()).two_factor_required,true);assert.equal(await session(cookie(fresh)),null);
});

test('storage outage and process reconstruction fail closed; encrypted token redaction, CSRF and field boundaries hold',async()=>{
  const email=address(),raw=await token(email),signed=await context.login(email),secret=context.secret;
  const tables=(await context.app.query(`SELECT jsonb_agg(to_jsonb(x))::text data FROM
    (SELECT * FROM snappik_auth.password_recovery) x`)).rows[0].data;
  assert.ok(!tables.includes(raw));assert.ok(!tables.includes(newPassword));
  const badOrigin=new Request(`${context.origin}/api/auth/reset-password`,{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:JSON.stringify({token:raw,new_password:newPassword})});
  assert.equal((await context.auth.handle(badOrigin)).status,403);
  assert.equal((await context.auth.handle(context.request('/request-password-reset',{email,request_id:randomUUID(),return_to:'https://evil.test'}))).status,400);
  await instance.server.stop();
  try{assert.equal((await reset(raw)).status,503);assert.equal((await request(email)).status,503);await assert.rejects(session(signed.cookie));}
  finally{await instance.server.start();}
  await context.close();context=testAuthentication(instance.connectionString,undefined,secret,[],key);
  assert.equal((await reset(raw)).status,200);assert.equal(await session(signed.cookie),null);
  await context.close();context=testAuthentication(instance.connectionString,undefined,secret,[],key);
  assert.equal(await session(signed.cookie),null);assert.equal((await reset(raw)).status,400);
});

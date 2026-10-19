import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {fork} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {symmetricDecrypt} from 'better-auth/crypto';
import {isolatedPostgres} from '../scripts/test-postgres.js';
import {migrate} from '../src/db/migrate.js';
import {migrateAuth,loadAuthMigrations,assertAuthSchema} from '../src/db/auth-migrate.js';
import {createAdmission,AdmissionDenied,admissionCapacity} from '../src/modules/auth/admission.js';
import {readAdmissionPolicy} from '../src/modules/auth/admission-policy.js';
import {testAuthentication,testPassword} from './fixtures/auth-library.js';

const policy=readAdmissionPolicy({AUTH_RATE_LOGIN_GLOBAL:'8',AUTH_RATE_RECOVERY_GLOBAL:'8',AUTH_RATE_RESET_GLOBAL:'8',AUTH_RATE_TOTP_GLOBAL:'8',
  AUTH_RATE_LOGIN_ACCOUNT:'3',AUTH_RATE_RECOVERY_ACCOUNT:'2',AUTH_RATE_TOTP_PROOF:'2'}),secret=randomBytes(48).toString('base64url'),key=randomBytes(32);
let db:Awaited<ReturnType<typeof isolatedPostgres>>,context:ReturnType<typeof testAuthentication>;
before(async()=>{db=await isolatedPostgres();const setup=new pg.Pool({connectionString:db.connectionString});
  try{await migrate(setup);await migrateAuth(setup);}finally{await setup.end();}
  context=testAuthentication(db.connectionString,undefined,secret,[],key,policy);});
after(async()=>{await context?.close();await db?.server.stop();});
// Only limiter fixture rows in this newly created disposable cluster; no user data reset.
beforeEach(async()=>{await context.app.query('DELETE FROM snappik_auth.admission_bucket');});
const address=()=>`admission-${randomUUID()}@example.test`;
const replica=()=>testAuthentication(db.connectionString,context.origin,secret,[],key,policy);
const limiter=()=>createAdmission(context.app,secret,'synthetic-local',policy);
const expire=()=>context.app.query("UPDATE snappik_auth.admission_bucket SET expires_at=clock_timestamp()-interval '1 second'");
const responseCookie=(response:Response)=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
const post=(path:string,body:unknown,cookie='',other=context)=>other.auth.handle(other.request(path,body,cookie));
async function child(attempts:number) {
  const process=fork(new URL('./fixtures/admission-observer.ts',import.meta.url),[],{execArgv:globalThis.process.execArgv,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  return new Promise<boolean[]>((resolve,reject)=>{
    const timer=setTimeout(()=>{process.kill();reject(new Error('ADMISSION_CHILD_TIMEOUT'));},15000);
    process.once('error',reject);process.once('exit',()=>{clearTimeout(timer);reject(new Error('ADMISSION_CHILD_EXIT'));});
    process.once('message',(message:{allowed?:boolean[];error?:string})=>{clearTimeout(timer);message.error?reject(new Error(message.error)):resolve(message.allowed!);});
    process.send({connectionString:db.connectionString,secret,policy,attempts});
  });
}
test('005 is additive over populated004; readiness, checksum/reapply and non-owner limiter grants hold',async()=>{
  const isolated=await isolatedPostgres(),pool=new pg.Pool({connectionString:isolated.connectionString});
  let fixture:ReturnType<typeof testAuthentication>|undefined;
  try {
    await migrate(pool);await migrateAuth(pool,(await loadAuthMigrations()).slice(0,4));
    fixture=testAuthentication(isolated.connectionString);const email=address();await fixture.register(email);
    const signed=await fixture.library.api.signInEmail({body:{email,password:testPassword},asResponse:true});
    const tables=['snappik_auth."user"','snappik_auth.account','snappik_auth.session','public.users','public.owner_session_security'];
    const snapshot=()=>Promise.all(tables.map(async name=>(await pool.query(`SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'')) digest FROM ${name} t`)).rows[0].digest));
    const before=await snapshot();await assert.rejects(assertAuthSchema(pool),/NOT_READY/);await migrateAuth(pool);await migrateAuth(pool);
    await assertAuthSchema(pool);assert.deepEqual(await snapshot(),before);
    assert.ok(await fixture.auth.resolveSession(new Request(fixture.origin,{headers:{cookie:responseCookie(signed)}})));
  }finally{await fixture?.close();await pool.end();await isolated.server.stop();}
  await context.app.query('CREATE ROLE synthetic_admission_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT');
  for(const file of ['src/db/runtime-grants.sql','src/db/onboarding-grants.sql','src/db/auth-grants.sql'])await context.app.query((await readFile(file,'utf8')).replaceAll(':"runtime_role"','synthetic_admission_runtime'));
  const restricted=new pg.Pool({connectionString:db.connectionString,options:'-c role=synthetic_admission_runtime'});
  try {await createAdmission(restricted,secret,'synthetic-local',policy).global('login');
    await assert.rejects(restricted.query('UPDATE snappik_auth.admission_policy SET fingerprint=fingerprint'),{code:'42501'});
    await assert.rejects(restricted.query('CREATE TABLE snappik_auth.forbidden_admission(id int)'),{code:'42501'});
  }finally{await restricted.end();}
});
test('simultaneous admission across two child processes and parent cannot overspend; process and DB restart retain denial',async()=>{
  const parent=Promise.all(Array.from({length:6},async()=>{try{await limiter().global('reset');return true;}catch(error){if(error instanceof AdmissionDenied)return false;throw error;}}));
  const all=(await Promise.all([child(5),child(5),parent])).flat();assert.equal(all.filter(Boolean).length,8);
  assert.deepEqual(await child(1),[false]);
  await db.server.stop();assert.equal((await post('/reset-password',{token:'A'.repeat(43),new_password:testPassword})).status,503);
  await context.close();await db.server.start();context=testAuthentication(db.connectionString,undefined,secret,[],key,policy);
  await assert.rejects(limiter().global('reset'),AdmissionDenied);await expire();await limiter().global('reset');
});
test('login account normalization and durable attempts survive failures/response loss without blocking another account or logout',async()=>{
  const email=address();await context.register(email);const other=replica();
  try {
    for(const value of [email,email.toUpperCase(),' '+email+' '])assert.equal((await post('/sign-in/email',{email:value,password:'wrong'},'',other)).status,401);
    const denied=await post('/sign-in/email',{email,password:testPassword});assert.equal(denied.status,429);assert.ok(Number(denied.headers.get('retry-after'))>0);
    assert.equal((await post('/sign-in/email',{email:address(),password:'wrong'})).status,401);
    assert.equal((await post('/sign-out',{})).status,200);
    await expire();const login=await post('/sign-in/email',{email,password:testPassword});assert.equal(login.status,200);
  }finally{await other.close();}
});
test('concurrent recovery is bounded and known/unknown suppression is identical; duplicated receipt still dedupes',async()=>{
  const email=address(),unknown=address();await context.register(email);const other=replica();
  try {
    const id=randomUUID();for(const value of [email,unknown]){
      const responses=await Promise.all([post('/request-password-reset',{email:value,request_id:id}),post('/request-password-reset',{email:value,request_id:id},'',other)]);
      for(const response of responses){assert.ok([202,503].includes(response.status));if(response.status===202)assert.deepEqual(await response.json(),{accepted:true});}
      const suppressed=await post('/request-password-reset',{email:value,request_id:randomUUID()});assert.equal(suppressed.status,202);assert.equal(suppressed.headers.get('retry-after'),null);
    }
    assert.equal((await context.app.query('SELECT count(*)::int n FROM snappik_auth.recovery_requests')).rows[0].n,2);
    await post('/request-password-reset',{email:unknown,request_id:randomUUID()});await post('/request-password-reset',{email:unknown,request_id:randomUUID()});
    const full=await post('/request-password-reset',{email:address(),request_id:randomUUID()});assert.equal(full.status,429);
    assert.ok(Number(full.headers.get('retry-after'))>0);
  }finally{await other.close();}
});
test('rotating spoofed IP/proxy headers and random invalid reset codes cannot bypass operation budget',async()=>{
  const other=replica();try{
    for(let i=0;i<10;i++){
      const request=context.request('/reset-password',{token:randomBytes(32).toString('base64url'),new_password:testPassword});
      request.headers.set('x-forwarded-for',`192.0.2.${i+1}`);request.headers.set('x-real-ip',`198.51.100.${i+1}`);request.headers.set('cf-connecting-ip',`203.0.113.${i+1}`);
      assert.equal((await (i%2?other:context).auth.handle(request)).status,i<8?400:429);
    }
    const rows=await context.app.query('SELECT * FROM snappik_auth.admission_bucket');assert.equal(rows.rowCount,1);
    assert.ok(!JSON.stringify(rows.rows).includes('192.0.2'));assert.equal(rows.rows[0].used,8);
  }finally{await other.close();}
});
test('TOTP proof budget ignores irrelevant cookies; native persistent failures/enrollment and valid retry remain intact',async()=>{
  const email=address();await context.register(email);const signed=await context.login(email);
  assert.equal((await context.library.api.enableTwoFactor({body:{password:testPassword},headers:{cookie:signed.cookie},asResponse:true})).status,200);
  const row=(await context.app.query('SELECT secret FROM snappik_auth."twoFactor" WHERE "userId" IN(SELECT id FROM snappik_auth."user" WHERE email=$1)',[email])).rows[0];
  const factorSecret=await symmetricDecrypt({key:(await context.library.$context).secretConfig,data:row.secret});
  const code=(await context.library.api.generateTOTP({body:{secret:factorSecret}})).code;
  assert.equal((await context.library.api.verifyTOTP({body:{code},headers:{cookie:signed.cookie},asResponse:true})).status,200);
  const primary=await post('/sign-in/email',{email,password:testPassword});assert.equal(primary.status,200);const cookie=responseCookie(primary),other=replica();
  try {
    const wrong=code==='000000'?'111111':'000000';
    const failures=await Promise.all([post('/two-factor/verify-totp',{code:wrong},cookie),post('/two-factor/verify-totp',{code:wrong},cookie+'; irrelevant=a',other)]);
    assert.deepEqual(failures.map(response=>response.status),[401,401]);
    assert.equal((await post('/two-factor/verify-totp',{code},cookie+'; irrelevant=b')).status,429);
    const encoded=cookie.split(';').map(pair=>{const at=pair.indexOf('=');const value=decodeURIComponent(pair.slice(at+1).trim());
      return pair.slice(0,at).trim()+' = "'+[...value].map(character=>'%'+character.charCodeAt(0).toString(16).padStart(2,'0')).join('')+'"';}).join('; ');
    assert.equal((await post('/two-factor/verify-totp',{code:wrong},encoded)).status,429);
    const sessionName=(await context.library.$context).authCookies.sessionToken.name;
    const withoutSession=cookie.split(';').filter(pair=>pair.slice(0,pair.indexOf('=')).trim()!==sessionName).join(';');
    assert.equal((await post('/two-factor/verify-totp',{code:wrong},withoutSession+`; ${sessionName}=invalid-proof`)).status,429);
    const state=(await context.app.query('SELECT "failedVerificationCount","lockedUntil" FROM snappik_auth."twoFactor" WHERE "userId" IN(SELECT id FROM snappik_auth."user" WHERE email=$1)',[email])).rows[0];
    assert.equal(state.failedVerificationCount,2);assert.equal(state.lockedUntil,null);
    await expire();const fresh=(await context.library.api.generateTOTP({body:{secret:factorSecret}})).code;
    assert.equal((await post('/two-factor/verify-totp',{code:fresh},cookie)).status,200);
    const lockedChallenge=await post('/sign-in/email',{email,password:testPassword});assert.equal(lockedChallenge.status,200);
    // Accelerated synthetic native lock state, not a claim of ten observed failures.
    await context.app.query(`UPDATE snappik_auth."twoFactor" SET "failedVerificationCount"=10,"lockedUntil"=clock_timestamp()+interval '15 minutes'
      WHERE "userId" IN(SELECT id FROM snappik_auth."user" WHERE email=$1)`,[email]);
    const locked=await post('/two-factor/verify-totp',{code:fresh},responseCookie(lockedChallenge));
    assert.equal(locked.status,429);assert.equal(locked.headers.get('retry-after'),'900');
    for(const path of ['/two-factor/enable','/two-factor/disable','/two-factor/generate-backup-codes'])assert.equal((await post(path,{})).status,404);
  }finally{await other.close();}
});
test('authenticated TOTP uses verified account budget across sessions and ignores unused pending cookies',async()=>{
  const email=address();await context.register(email);const signed=await context.login(email);
  await context.library.api.enableTwoFactor({body:{password:testPassword},headers:{cookie:signed.cookie},asResponse:true});
  const factor=(await context.app.query('SELECT secret FROM snappik_auth."twoFactor" WHERE "userId" IN(SELECT id FROM snappik_auth."user" WHERE email=$1)',[email])).rows[0];
  const factorSecret=await symmetricDecrypt({key:(await context.library.$context).secretConfig,data:factor.secret});
  const code=(await context.library.api.generateTOTP({body:{secret:factorSecret}})).code;
  await context.library.api.verifyTOTP({body:{code},headers:{cookie:signed.cookie},asResponse:true});
  const cookies:string[]=[];
  for(let i=0;i<2;i++){
    const challenge=await context.library.api.signInEmail({body:{email,password:testPassword},asResponse:true});
    const verified=await context.library.api.verifyTOTP({body:{code},headers:{cookie:responseCookie(challenge)},asResponse:true});
    assert.equal(verified.status,200);cookies.push(responseCookie(verified));
  }
  const pendingName=(await context.library.$context).createAuthCookie('two_factor').name;
  const spoof=(cookie:string,value:string)=>cookie.split(';').filter(pair=>pair.slice(0,pair.indexOf('=')).trim()!==pendingName).join(';')+`; ${pendingName}=${value}`;
  const wrong=code==='000000'?'111111':'000000';
  for(let i=0;i<2;i++)assert.equal((await post('/two-factor/verify-totp',{code:wrong},spoof(cookies[i],`ignored-${i}`))).status,401);
  assert.equal((await post('/two-factor/verify-totp',{code},spoof(cookies[0],'ignored-next'))).status,429);
});
test('storage failure and policy/key mismatch fail closed; counters commit before credential transaction rollback',async()=>{
  const mismatched=createAdmission(context.app,secret+'different','synthetic-local',policy);
  await assert.rejects(mismatched.global('login'),/POLICY_MISMATCH/);
  await assert.rejects(createAdmission(context.app,secret,'synthetic-local',{...policy,window:30}).global('login'),/POLICY_MISMATCH/);
  const other=replica();await other.app.end();assert.equal((await post('/reset-password',{token:'A'.repeat(43),new_password:testPassword},'',other)).status,503);await other.database.end();
  await context.app.query(`CREATE FUNCTION public.admission_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_PRIVATE_DETAIL'; END $$;
    CREATE TRIGGER admission_failure BEFORE INSERT OR UPDATE ON snappik_auth.admission_bucket FOR EACH ROW EXECUTE FUNCTION public.admission_failure()`);
  try{const failure=await post('/sign-in/email',{email:address(),password:'wrong'});assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('SYNTHETIC_PRIVATE_DETAIL'));}
  finally{await context.app.query('DROP TRIGGER admission_failure ON snappik_auth.admission_bucket; DROP FUNCTION public.admission_failure()');}
  await context.app.query(`CREATE FUNCTION public.credential_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_PRIVATE_DETAIL'; END $$;
    CREATE TRIGGER credential_failure BEFORE INSERT ON snappik_auth.recovery_requests FOR EACH ROW EXECUTE FUNCTION public.credential_failure()`);
  const before=(await context.app.query('SELECT count(*)::int n FROM snappik_auth.recovery_requests')).rows[0].n;
  const email=address();try{for(let i=0;i<2;i++)assert.equal((await post('/request-password-reset',{email,request_id:randomUUID()})).status,503);}
  finally{await context.app.query('DROP TRIGGER credential_failure ON snappik_auth.recovery_requests; DROP FUNCTION public.credential_failure()');}
  // Admission is not rolled back or bypassed by rotating request IDs after storage failure.
  assert.equal((await post('/request-password-reset',{email,request_id:randomUUID()})).status,202);
  assert.equal((await context.app.query('SELECT count(*)::int n FROM snappik_auth.recovery_requests')).rows[0].n,before);
});
test('bounded capacity fails closed and expired records are removed in bounded batches; native rolling rules are preserved',async()=>{
  await context.app.query(`INSERT INTO snappik_auth.admission_bucket SELECT md5(g::text)||md5('fixture'||g::text),'global',1,clock_timestamp()+interval '1 hour' FROM generate_series(1,$1) g`,[admissionCapacity]);
  await assert.rejects(limiter().global('reset'),/CAPACITY/);assert.equal((await context.app.query('SELECT count(*)::int n FROM snappik_auth.admission_bucket')).rows[0].n,admissionCapacity);
  await expire();await limiter().global('reset');assert.equal((await context.app.query('SELECT count(*)::int n FROM snappik_auth.admission_bucket')).rows[0].n,admissionCapacity-31);
  await context.app.query('DELETE FROM snappik_auth.admission_bucket');
  const native=limiter();assert.equal((await native.native('synthetic-native-login',{window:10,max:2})).allowed,true);
  const first=(await context.app.query("SELECT expires_at FROM snappik_auth.admission_bucket WHERE scope='native'")).rows[0].expires_at;
  assert.equal((await native.native('synthetic-native-login',{window:10,max:2})).allowed,true);
  const second=(await context.app.query("SELECT expires_at FROM snappik_auth.admission_bucket WHERE scope='native'")).rows[0].expires_at;assert.ok(second>=first);
  assert.equal((await native.native('synthetic-native-login',{window:10,max:2})).allowed,false);
});
test('DB-clock window expires naturally and denial never extends it',async()=>{
  const short=createAdmission(context.app,secret,'synthetic-clock',readAdmissionPolicy({AUTH_RATE_WINDOW_SECONDS:'1',AUTH_RATE_RESET_GLOBAL:'1'}));
  await short.global('reset');await assert.rejects(short.global('reset'),AdmissionDenied);
  const before=(await context.app.query("SELECT expires_at FROM snappik_auth.admission_bucket WHERE scope='global'")).rows[0].expires_at;
  await assert.rejects(short.global('reset'),AdmissionDenied);
  assert.equal((await context.app.query("SELECT expires_at FROM snappik_auth.admission_bucket WHERE scope='global'")).rows[0].expires_at.getTime(),before.getTime());
  await context.app.query('SELECT pg_sleep(1.05)');await short.global('reset');
});
test('logout is unthrottled but a misconfigured key cannot claim copied-cookie revocation',async()=>{
  const email=address();await context.register(email);const signed=await context.login(email);
  const wrong=testAuthentication(db.connectionString,context.origin,secret+'different',[],key,policy);
  try {
    const response=await post('/sign-out',{},signed.cookie,wrong);assert.equal(response.status,503);assert.equal(response.headers.getSetCookie().length,0);
    assert.ok(await context.auth.resolveSession(signed.request));
    assert.equal((await post('/sign-out',{},signed.cookie)).status,200);assert.equal(await context.auth.resolveSession(signed.request),null);
  }finally{await wrong.close();}
});

import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {isolatedPostgres} from '../scripts/test-postgres.js';
import {migrate} from '../src/db/migrate.js';
import type {AuthAdapter,ProviderSession} from '../src/adapters/providers.js';
import {auth} from '../src/adapters/providers.js';
import {getMe,provisionOwner,completeSetup} from '../src/modules/onboarding/service.js';
import {createOwnerHandlers} from '../src/modules/onboarding/http.js';
import {parseSetup,reservedSlugs,safeOwnerReturn} from '../src/modules/onboarding/policy.js';
let instance:Awaited<ReturnType<typeof isolatedPostgres>>;
let pool:pg.Pool;
const origin='http://localhost:3000';
const input=()=>({name:'Synthetic Studio',slug:`s-${randomUUID()}`,locale:'id',timezone:'Asia/Makassar'});
function session(overrides:Partial<ProviderSession>={}):ProviderSession {
  return {provider:'synthetic-only:BL-004',subject:randomUUID(),sessionId:randomUUID(),emailVerified:true,email:'owner@example.invalid',displayName:'Synthetic',expiresAt:new Date(Date.now()+3600000),...overrides};
}
function handlers(s:ProviderSession|null,adapter?:AuthAdapter) {
  // Injection is only in this Node test process. No HTTP fixture login or env bypass exists.
  return createOwnerHandlers({pool:()=>pool,origin:()=>origin,auth:adapter??{async resolveSession(){return s;}}});
}
function request(body:unknown,headers:Record<string,string>={}) {
  return new Request(`${origin}/api/v1/onboarding`,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
}
before(async()=>{
  instance=await isolatedPostgres();
  pool=new pg.Pool({connectionString:instance.connectionString,max:10,connectionTimeoutMillis:5000,statement_timeout:10000});
  console.log('BL-004 real database:',(await pool.query('SELECT version()')).rows[0].version);
  await migrate(pool);
});
after(async()=>{await pool?.end();await instance?.server.stop();});

test('validation and safe protected return reject reserved paths, controls, encoding and external destinations',()=>{
  const valid=input();
  assert.equal(parseSetup({...valid,name:'  Studio 😀  '}).name,'Studio 😀');
  assert.equal(parseSetup({...valid,name:'😀'.repeat(100)}).name.length,200);
  for(const change of [{slug:'API'},{slug:'a'},{slug:'abc_def'},{name:' '},{name:'x'.repeat(101)},{name:'bad\nname'},{timezone:'Asia/Fiction'},{locale:'xx'},{studio_id:randomUUID()},{email:'fake@example.invalid'},{role:'operator'},...Array.from(reservedSlugs,slug=>({slug}))]) assert.throws(()=>parseSetup({...valid,...change}),/INVALID_INPUT/);
  for(const value of ['https://evil.invalid/app','//evil.invalid','/app/../ops','/app/%2e%2e','/app\\ops','/app?next=evil','/app#x','/app/ space','/app\n','/app/'+ 'x'.repeat(512),['/app/projects']]) assert.equal(safeOwnerReturn(value),'/app');
  assert.equal(safeOwnerReturn('/app/projects/abc-123/'),'/app/projects/abc-123/');
});
test('repeated and concurrent provisioning/HTTP setup creates one mapping, studio, defaults, trial and audit',async()=>{
  const s=session(),body=input();
  const initial=await getMe(pool,s);
  assert.equal(initial.setup_status,'setup_required'); assert.equal(initial.user,null);
  const provisioned=await Promise.all(Array.from({length:8},()=>provisionOwner(pool,s)));
  assert.equal(new Set(provisioned.map(r=>r.studio?.id)).size,1);
  assert.equal(provisioned[0].setup_status,'setup_required');
  const results=await Promise.all(Array.from({length:8},()=>handlers(s).onboarding(request(body))));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,200,200,200,200,200,200,201]);
  const result=await results[0].json();
  const studioId=result.data.studio.id;
  assert.equal((await getMe(pool,s)).setup_status,'ready');
  const counts=(await pool.query(`SELECT (SELECT count(*) FROM users WHERE auth_provider=$1 AND auth_subject=$2)::int AS users,
    (SELECT count(*) FROM studio_members WHERE studio_id=$3)::int AS members,(SELECT count(*) FROM studio_settings WHERE studio_id=$3)::int AS settings,
    (SELECT count(*) FROM entitlement_grants WHERE studio_id=$3)::int AS trials,(SELECT count(*) FROM audit_events WHERE studio_id=$3)::int AS audits`,[s.provider,s.subject,studioId])).rows[0];
  assert.deepEqual(counts,{users:1,members:1,settings:1,trials:1,audits:1});
  const trial=(await pool.query(`SELECT g.project_limit,extract(epoch FROM g.ends_at-g.starts_at)::int AS duration,g.starts_at=s.provisioned_at AS anchored
    FROM entitlement_grants g JOIN studios s ON s.id=g.studio_id WHERE s.id=$1`,[studioId])).rows[0];
  assert.deepEqual(trial,{project_limit:3,duration:604800,anchored:true});
  assert.equal(JSON.stringify(result).includes(s.subject),false);
  assert.equal(JSON.stringify(result).includes(s.sessionId),false);
});
test('transaction failure rolls back identity/studio/settings/trial and HTTP retry recovers exactly once',async()=>{
  const s=session(),body=input();
  const counts=async()=>(await pool.query(`SELECT (SELECT count(*) FROM users) AS users,(SELECT count(*) FROM studios) AS studios,
    (SELECT count(*) FROM studio_members) AS members,(SELECT count(*) FROM studio_settings) AS settings,(SELECT count(*) FROM entitlement_grants) AS grants`)).rows[0];
  const before=await counts();
  // Dedicated isolated DB only: force failure AFTER all provisioning writes at audit insert.
  await pool.query(`CREATE FUNCTION synthetic_setup_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.action='studio.setup_completed' THEN RAISE EXCEPTION 'SYNTHETIC_FAILURE'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER synthetic_setup_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION synthetic_setup_failure()`);
  try {
    const response=await handlers(s).onboarding(request(body)); assert.equal(response.status,503);
    assert.equal(JSON.stringify(await response.json()).includes('SYNTHETIC_FAILURE'),false);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM users WHERE auth_subject=$1',[s.subject])).rows[0].n,0);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM studios WHERE slug=$1',[body.slug])).rows[0].n,0);
    assert.deepEqual(await counts(),before);
  } finally { await pool.query('DROP TRIGGER synthetic_setup_failure ON audit_events; DROP FUNCTION synthetic_setup_failure()'); }
  assert.equal((await handlers(s).onboarding(request(body))).status,201);
  assert.equal((await handlers(s).onboarding(request(body))).status,200);
});
test('session expiring while waiting for user lock rolls back setup without losing acknowledged provisioning',async()=>{
  const s=session(); const existing=await provisionOwner(pool,s);
  const blocker=await pool.connect();
  const waiting=new pg.Pool({connectionString:instance.connectionString,max:1,application_name:'synthetic-bl004-expiry',statement_timeout:5000});
  const expiring={...s,expiresAt:new Date(Date.now()+1000)};
  let operation:Promise<unknown>|undefined;
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[existing.user!.id]);
    operation=assert.rejects(completeSetup(waiting,expiring,input(),randomUUID()),/AUTH_REQUIRED/);
    let locked=false;
    for(let i=0;i<100;i++) {
      locked=(await pool.query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='synthetic-bl004-expiry' AND wait_event_type='Lock') AS locked`)).rows[0].locked;
      if(locked) break;
      await pool.query('SELECT pg_sleep(0.01)');
    }
    assert.equal(locked,true,'operation reached user lock');
    while((await pool.query('SELECT clock_timestamp() < $1::timestamptz AS valid',[expiring.expiresAt])).rows[0].valid) await pool.query('SELECT pg_sleep(0.02)');
    await blocker.query('COMMIT');
    await operation;
    const after=await getMe(pool,s); assert.equal(after.studio?.id,existing.studio?.id); assert.equal(after.setup_status,'setup_required');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM audit_events WHERE studio_id=$1',[existing.studio?.id])).rows[0].n,0);
  } finally {await blocker.query('ROLLBACK');blocker.release();await operation;await waiting.end();}
});
test('competing setup payloads never overwrite acknowledged values; global slug collision rolls back and is retryable',async()=>{
  const s=session(),a=input(),b={...a,name:'Other tab'};
  const results=await Promise.all([handlers(s).onboarding(request(a)),handlers(s).onboarding(request(b))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
  const saved=(await getMe(pool,s)).studio!;
  assert.equal((await handlers(s).onboarding(request({...a,name:'Replacement'}))).status,409);
  assert.equal((await getMe(pool,s)).studio?.name,saved.name);
  const other=session();
  assert.equal((await handlers(other).onboarding(request(a))).status,409);
  assert.equal((await getMe(pool,other)).user,null);
  assert.equal((await handlers(other).onboarding(request(input()))).status,201);
});
test('same email, changed contact, other namespace and new session never reassign membership or renew trial',async()=>{
  const a=session(),b=session(),body=input();
  await completeSetup(pool,a,body,randomUUID());
  const before=await getMe(pool,a);
  const dates=(await pool.query(`SELECT starts_at,ends_at FROM entitlement_grants WHERE studio_id=$1`,[before.studio?.id])).rows;
  assert.notEqual((await provisionOwner(pool,b)).studio?.id,before.studio?.id);
  assert.notEqual((await provisionOwner(pool,{...a,provider:'synthetic-only:another-instance'})).studio?.id,before.studio?.id);
  const changed={...a,email:'changed@example.invalid',sessionId:randomUUID()};
  assert.equal((await provisionOwner(pool,changed)).studio?.id,before.studio?.id);
  await completeSetup(pool,changed,body,randomUUID());
  assert.deepEqual((await pool.query('SELECT starts_at,ends_at FROM entitlement_grants WHERE studio_id=$1',[before.studio?.id])).rows,dates);
});
test('incomplete records repair using original provisioning instant; expired/revoked trial never renews',async()=>{
  const s=session(),body=input(); const p=await provisionOwner(pool,s),id=p.studio!.id;
  await pool.query(`UPDATE studios SET provisioned_at=clock_timestamp()-interval '10 days' WHERE id=$1`,[id]);
  // Simulated legacy partial provisioning; runtime grants cannot delete grants/settings.
  await pool.query('DELETE FROM studio_settings WHERE studio_id=$1',[id]);
  await pool.query('DELETE FROM entitlement_grants WHERE studio_id=$1',[id]);
  assert.equal((await getMe(pool,s)).setup_status,'incomplete');
  await completeSetup(pool,s,body,randomUUID());
  const repaired=await getMe(pool,s); assert.equal(repaired.setup_status,'ready'); assert.equal(repaired.entitlement?.status,'expired');
  const dates=(await pool.query('SELECT starts_at,ends_at FROM entitlement_grants WHERE studio_id=$1',[id])).rows;
  await pool.query('UPDATE entitlement_grants SET revoked_at=clock_timestamp() WHERE studio_id=$1',[id]);
  await provisionOwner(pool,s); await completeSetup(pool,s,body,randomUUID());
  assert.deepEqual((await pool.query('SELECT starts_at,ends_at FROM entitlement_grants WHERE studio_id=$1',[id])).rows,dates);
  assert.equal((await getMe(pool,s)).entitlement?.status,'expired');
});
test('protected API denies missing/unverified/expired sessions, forged tenant/email/role and cross-origin input',async()=>{
  const a=session(),b=session(); await completeSetup(pool,a,input(),randomUUID()); const foreign=await provisionOwner(pool,b);
  const get=new Request(`${origin}/api/v1/me?studio_id=${foreign.studio?.id}`,{headers:{'x-studio-id':foreign.studio!.id,'x-user-role':'operator'}});
  const mine=await handlers(a).me(get); assert.equal(mine.status,200); assert.equal(mine.headers.get('cache-control'),'no-store');
  assert.notEqual((await mine.json()).data.studio.id,foreign.studio?.id);
  for(const [s,status] of [[null,401],[session({expiresAt:new Date()}),401],[session({expiresAt:new Date(Date.now()-1)}),401],[session({emailVerified:false}),403]] as const) {
    assert.equal((await handlers(s).me(get)).status,status);
    assert.equal((await handlers(s).onboarding(request(input()))).status,status);
  }
  for(const extra of [{studio_id:foreign.studio?.id},{email:'forged@example.invalid'},{role:'owner'},{user_id:randomUUID()}]) assert.equal((await handlers(a).onboarding(request({...input(),...extra}))).status,400);
  for(const headers of [{origin:'https://evil.invalid'},{origin:''},{'sec-fetch-site':'cross-site'}] as Record<string,string>[]) assert.equal((await handlers(a).onboarding(request(input(),headers))).status,403);
  assert.equal((await handlers(a).onboarding(request(input(),{'content-type':'text/plain'}))).status,400);
  assert.equal((await handlers(a).onboarding(request({name:'x'.repeat(9000)}))).status,400);
});
test('provider/storage uncertainty fails closed and suspension exposes only restricted status',async()=>{
  const s=session(); await completeSetup(pool,s,input(),randomUUID()); const before=await getMe(pool,s);
  const unavailable=await handlers(s,auth).me(new Request(`${origin}/api/v1/me`)); assert.equal(unavailable.status,503); assert.equal(unavailable.headers.get('retry-after'),'5');
  const broken={async resolveSession(){throw new Error('sensitive provider response');}};
  const failure=await handlers(s,broken).onboarding(request(input())); assert.equal(failure.status,503); assert.equal(JSON.stringify(await failure.json()).includes('sensitive'),false);
  const expired={...s,expiresAt:new Date(Date.now()-1)};
  await assert.rejects(provisionOwner(pool,expired),/AUTH_REQUIRED/);
  assert.equal((await getMe(pool,s)).studio?.id,before.studio?.id);
  await pool.query(`UPDATE studios SET status='suspended' WHERE id=$1`,[before.studio?.id]);
  const restricted=await getMe(pool,s); assert.equal(restricted.setup_status,'suspended'); assert.equal(restricted.settings,null); assert.equal(restricted.entitlement,null);
  assert.equal((await handlers(s).onboarding(request(input()))).status,403);
});
test('reviewed non-owner runtime grants permit setup, deny trial renewal, membership reassignment and ops self-grant',async()=>{
  await pool.query('CREATE ROLE snappik_onboarding_test NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT');
  for(const path of ['src/db/runtime-grants.sql','src/db/onboarding-grants.sql']) await pool.query((await readFile(path,'utf8')).replaceAll(':"runtime_role"','"snappik_onboarding_test"'));
  // A separate pool always enters this restricted role on connection creation.
  const restricted=new pg.Pool({connectionString:instance.connectionString,max:1,options:'-c role=snappik_onboarding_test',connectionTimeoutMillis:5000,statement_timeout:10000});
  try {
    const s=session(),body=input(); await completeSetup(restricted,s,body,randomUUID());
    assert.equal((await getMe(restricted,s)).setup_status,'ready');
    for(const sql of ['UPDATE entitlement_grants SET ends_at=ends_at','DELETE FROM entitlement_grants','UPDATE studio_members SET user_id=user_id',`INSERT INTO platform_roles(user_id,permission) SELECT id,'diagnostics_read' FROM users LIMIT 1`,'CREATE TABLE forbidden_setup_ddl(id int)']) await assert.rejects(restricted.query(sql),{code:'42501'});
  } finally {await restricted.end();}
});

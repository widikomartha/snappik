import {spawn,type ChildProcess} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import assert from 'node:assert/strict';
import net from 'node:net';
import pg from 'pg';
import {isolatedPostgres} from './test-postgres.js';
import {migrate} from '../src/db/migrate.js';
import {testAuthentication,testPassword} from '../tests/fixtures/auth-library.js';
import {deliverRecovery} from '../src/modules/auth/recovery.js';
const instance=await isolatedPostgres();
const socket=net.createServer();
const port=await new Promise<number>((resolve,reject)=>{socket.on('error',reject);socket.listen(0,'127.0.0.1',()=>{const a=socket.address() as net.AddressInfo;socket.close(()=>resolve(a.port));});});
const origin=`http://127.0.0.1:${port}`,secret=randomBytes(48).toString('base64url');
const recoveryKey=randomBytes(32);
const env={...process.env,APP_ORIGIN:origin,DATABASE_URL:instance.connectionString,MIGRATION_DATABASE_URL:instance.connectionString,
  AUTH_MODE:'better-auth-local',AUTH_INSTANCE_ID:'synthetic-local',BETTER_AUTH_SECRET:secret,BETTER_AUTH_URL:origin,
  AUTH_RECOVERY_KEY:recoveryKey.toString('base64url'),NEXT_TELEMETRY_DISABLED:'1'};
let web:ChildProcess|undefined,fixture:ReturnType<typeof testAuthentication>|undefined;
const db=new pg.Pool({connectionString:instance.connectionString,statement_timeout:10000});
function launch(args:string[]) {return spawn(process.execPath,args,{env,stdio:['ignore','ignore','ignore'],windowsHide:true});}
async function stop(child:ChildProcess){if(child.exitCode===null&&child.signalCode===null){child.kill();await new Promise<void>(resolve=>child.once('exit',()=>resolve()));}}
async function start() {
  const child=launch(['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)]);web=child;
  for(let i=0;i<150;i++){
    try{if((await fetch(`${origin}/health/live`)).ok)return;}catch{/* Starting local process. */}
    if(child.exitCode!==null)throw new Error('AUTH_WEB_START_FAILED');await pause(100);
  }
  throw new Error('AUTH_WEB_START_TIMEOUT');
}
const post=(path:string,body:unknown,cookie='',extra:Record<string,string>={})=>fetch(`${origin}${path}`,{method:'POST',redirect:'manual',headers:{origin,'content-type':'application/json',cookie,...extra},body:JSON.stringify(body)});
try {
  await start();
  assert.equal((await post('/api/auth/sign-in/email',{email:'unavailable@example.test',password:testPassword})).status,503);
  await migrate(db);
  const cli=launch(['--import','tsx','src/db/auth-migrate-cli.ts']);
  await new Promise<void>(resolve=>cli.once('exit',()=>resolve()));assert.equal(cli.exitCode,0,'reviewed auth migration CLI');
  fixture=testAuthentication(instance.connectionString,origin,secret);await fixture.register('browser-owner@example.test');
  if(process.argv.includes('--serve')) {
    console.log(`Synthetic review server: ${origin}; account browser-owner@example.test; password ${testPassword}`);
    await new Promise<void>(resolve=>{
      const timeout=setTimeout(resolve,10*60*1000);
      const finish=()=>{clearTimeout(timeout);process.stdin.pause();resolve();};
      process.once('SIGINT',finish);process.once('SIGTERM',finish);process.stdin.resume();process.stdin.once('data',finish);
    });
  }else{
    assert.equal((await fetch(`${origin}/app`,{redirect:'manual'})).status,307);
    const login=await post('/api/auth/sign-in/email',{email:'browser-owner@example.test',password:testPassword,return_to:'/app'});
    assert.equal(login.status,200);assert.deepEqual(await login.json(),{success:true,return_to:'/app'});
    const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
    assert.ok(cookie);assert.match(login.headers.getSetCookie().join(';'),/HttpOnly/i);
    assert.equal((await fetch(`${origin}/api/v1/me`,{headers:{cookie}})).status,200);
    assert.equal((await post('/api/v1/onboarding',{name:'Synthetic Auth Studio',slug:'synthetic-auth-studio',locale:'id',timezone:'UTC'},cookie)).status,201);
    const page=await fetch(`${origin}/app`,{headers:{cookie}});assert.equal(page.status,200);assert.match(await page.text(),/Synthetic Auth Studio/);
    assert.equal((await post('/api/auth/sign-out',{},cookie,{origin:'https://evil.test'})).status,403);
    await db.query(`CREATE FUNCTION public.smoke_revoke_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_REVOKE'; END $$;
      CREATE TRIGGER smoke_revoke_failure BEFORE UPDATE ON owner_session_security FOR EACH ROW EXECUTE FUNCTION public.smoke_revoke_failure()`);
    try{assert.equal((await post('/api/auth/sign-out',{},cookie)).status,503);assert.equal((await fetch(`${origin}/api/v1/me`,{headers:{cookie}})).status,200);}
    finally{await db.query('DROP TRIGGER smoke_revoke_failure ON owner_session_security; DROP FUNCTION public.smoke_revoke_failure()');}
    assert.equal((await post('/api/auth/request-password-reset',{email:'browser-owner@example.test',request_id:randomUUID()})).status,202);
    const messages:{url:string;code:string}[]=[];
    assert.equal(await deliverRecovery(db,recoveryKey,origin,async message=>{messages.push(message);}),'completed_synthetic');
    const resetToken=messages[0].code;assert.ok(resetToken);
    assert.equal((await fetch(`${origin}/recover`)).status,200);
    assert.equal((await post('/api/auth/reset-password',{token:resetToken,new_password:'Synthetic-reset-smoke!4826'})).status,200);
    assert.equal((await fetch(`${origin}/api/v1/me`,{headers:{cookie}})).status,401);
    assert.equal((await post('/api/auth/reset-password',{token:resetToken,new_password:'Synthetic-reset-smoke!4826'})).status,400);
    assert.equal((await post('/api/auth/sign-in/email',{email:'browser-owner@example.test',password:testPassword})).status,401);
    const fresh=await post('/api/auth/sign-in/email',{email:'browser-owner@example.test',password:'Synthetic-reset-smoke!4826'});
    assert.equal(fresh.status,200);const freshCookie=fresh.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
    assert.equal((await fetch(`${origin}/api/v1/me`,{headers:{cookie:freshCookie}})).status,200);
    assert.equal((await post('/api/auth/link-social',{provider:'synthetic'},cookie)).status,404);
    assert.equal((await post('/api/auth/sign-out',{},freshCookie)).status,200);
    assert.equal((await fetch(`${origin}/api/v1/me`,{headers:{cookie:freshCookie}})).status,401);
    assert.equal((await fetch(`${origin}/api/v1/me`,{headers:{cookie}})).status,401);
    await stop(web!);await start();
    assert.equal((await fetch(`${origin}/api/v1/me`,{headers:{cookie:freshCookie}})).status,401);
    assert.equal((await fetch(`${origin}/api/v1/me`,{headers:{cookie}})).status,401);
    assert.equal((await fetch(`${origin}/app`,{headers:{cookie},redirect:'manual'})).status,307);
    const drain=launch(['--import','tsx','src/modules/auth/recovery-drain-cli.ts']);await new Promise<void>(resolve=>drain.once('exit',()=>resolve()));assert.equal(drain.exitCode,0);
    console.log('Passed: actual Next production processes, missing-schema retry, migration/drain CLI, protected setup, CSRF, logout failure/retry, durable recovery/reset and old-cookie denial after restart. Synthetic in-memory delivery only; linking closed.');
  }
}finally{
  if(web)await stop(web);await fixture?.close();await db.end();await instance.server.stop();
}

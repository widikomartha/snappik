// Two actual built Next processes, one fresh PG cluster, no external providers/mail.
import {spawn,type ChildProcess} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';
import pg from 'pg';
import {symmetricDecrypt} from 'better-auth/crypto';
import {isolatedPostgres} from './test-postgres.js';
import {migrate} from '../src/db/migrate.js';
import {migrateAuth} from '../src/db/auth-migrate.js';
import {readAdmissionPolicy} from '../src/modules/auth/admission-policy.js';
import {deliverRecovery} from '../src/modules/auth/recovery.js';
import {testAuthentication,testPassword} from '../tests/fixtures/auth-library.js';
async function port(){const socket=net.createServer();await new Promise<void>(resolve=>socket.listen(0,'127.0.0.1',resolve));const value=(socket.address() as net.AddressInfo).port;await new Promise<void>(resolve=>socket.close(()=>resolve()));return value;}
const db=await isolatedPostgres(),pool=new pg.Pool({connectionString:db.connectionString});pool.on('error',()=>{});
const ports=[await port(),await port()],origin=`http://127.0.0.1:${ports[0]}`,secret=randomBytes(48).toString('base64url'),key=randomBytes(32);
assert.notEqual(ports[0],ports[1],'DISTINCT_NEXT_PORTS_REQUIRED');
const env={...process.env,APP_ORIGIN:origin,DATABASE_URL:db.connectionString,AUTH_MODE:'better-auth-local',AUTH_INSTANCE_ID:'synthetic-local',
  BETTER_AUTH_SECRET:secret,BETTER_AUTH_URL:origin,AUTH_RECOVERY_KEY:key.toString('base64url'),NEXT_TELEMETRY_DISABLED:'1',
  AUTH_RATE_WINDOW_SECONDS:'60',AUTH_RATE_LOGIN_GLOBAL:'20',AUTH_RATE_LOGIN_ACCOUNT:'2',AUTH_RATE_RECOVERY_GLOBAL:'3',
  AUTH_RATE_RECOVERY_ACCOUNT:'10',AUTH_RATE_RESET_GLOBAL:'2',AUTH_RATE_TOTP_GLOBAL:'8',AUTH_RATE_TOTP_PROOF:'2'};
const policy=readAdmissionPolicy(env);let fixture:ReturnType<typeof testAuthentication>|undefined;
const children:(ChildProcess|undefined)[]=[];
async function stop(child:ChildProcess|undefined){if(child&&child.exitCode===null&&child.signalCode===null){child.kill();await new Promise<void>(resolve=>child.once('exit',()=>resolve()));}}
async function start(index:number){
  const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(ports[index])],{env,windowsHide:true,stdio:['ignore','ignore','ignore']});children[index]=child;
  for(let i=0;i<150;i++){try{if((await fetch(`http://127.0.0.1:${ports[index]}/health/live`)).ok)return;}catch{/* Starting. */}
    if(child.exitCode!==null)throw new Error('ADMISSION_WEB_START');await pause(100);}
  throw new Error('ADMISSION_WEB_TIMEOUT');
}
const post=(index:number,path:string,body:unknown,cookie='',extra:Record<string,string>={})=>fetch(`http://127.0.0.1:${ports[index]}/api/auth${path}`,{
  method:'POST',headers:{origin,'content-type':'application/json',cookie,...extra},body:JSON.stringify(body)});
// Synthetic clock advance by expiry manipulation ONLY in this new disposable fixture DB.
const expire=()=>pool.query("UPDATE snappik_auth.admission_bucket SET expires_at=clock_timestamp()-interval '1 second'");
async function lostRecovery(body:unknown){
  const proxy=http.createServer(async(_request,response)=>{try{await (await post(0,'/request-password-reset',body)).text();}finally{response.destroy();}});
  try{await new Promise<void>(resolve=>proxy.listen(0,'127.0.0.1',resolve));
    await new Promise<void>((resolve,reject)=>{const request=http.request(`http://127.0.0.1:${(proxy.address() as net.AddressInfo).port}`,{method:'POST'},response=>{response.resume();reject(new Error('EXPECTED_LOST_RESPONSE'));});request.once('error',()=>resolve());request.end();});
  }finally{proxy.closeAllConnections();await new Promise<void>(resolve=>proxy.close(()=>resolve()));}
}
try {
  await migrate(pool);await migrateAuth(pool);fixture=testAuthentication(db.connectionString,origin,secret,[],key,policy);await fixture.register('admission-owner@example.test');
  await Promise.all([start(0),start(1)]);
  assert.ok(children[0]?.pid&&children[1]?.pid&&children[0].pid!==children[1].pid&&children.every(child=>child?.exitCode===null&&child.signalCode===null),'DISTINCT_NEXT_PROCESSES_REQUIRED');
  const loginFailures=await Promise.all([0,1].map(index=>post(index,'/sign-in/email',{email:'admission-owner@example.test',password:'wrong'},'',{'x-forwarded-for':`192.0.2.${index+1}`})));
  assert.deepEqual(loginFailures.map(response=>response.status),[401,401]);
  const denied=await post(1,'/sign-in/email',{email:'ADMISSION-OWNER@example.test',password:testPassword});assert.equal(denied.status,429);assert.ok(Number(denied.headers.get('retry-after'))>0);
  await stop(children[1]);await start(1);assert.equal((await post(1,'/sign-in/email',{email:'admission-owner@example.test',password:testPassword})).status,429);
  await expire();const signed=await post(0,'/sign-in/email',{email:'admission-owner@example.test',password:testPassword});assert.equal(signed.status,200);
  const cookie=signed.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  assert.equal((await fetch(origin+'/api/v1/me',{headers:{cookie}})).status,200);
  await expire();
  // Native production limiter remains enabled: three/path/10s shared across A/B.
  for(let i=0;i<3;i++)assert.equal((await post(i%2,'/sign-in/email',{email:`native-${i}@example.test`,password:'wrong'},'',{'x-forwarded-for':`198.51.100.${i+1}`})).status,401);
  assert.equal((await post(1,'/sign-in/email',{email:'native-next@example.test',password:'wrong'},'',{'x-real-ip':'203.0.113.5'})).status,429);
  assert.equal((await pool.query("SELECT sum(used)::int n FROM snappik_auth.admission_bucket WHERE scope='native'")).rows[0].n,3);
  await expire();const requestId=randomUUID(),body={email:'admission-owner@example.test',request_id:requestId};
  await lostRecovery(body);const retries=await Promise.all([0,1].map(index=>post(index,'/request-password-reset',body)));
  assert.deepEqual(retries.map(response=>response.status),[202,202]);
  assert.equal((await pool.query('SELECT count(*)::int n FROM snappik_auth.recovery_requests')).rows[0].n,1);
  assert.equal((await post(0,'/request-password-reset',body)).status,429);
  assert.equal((await post(1,'/request-password-reset',{email:'unknown@example.test',request_id:randomUUID()})).status,429);
  const messages:{code:string;url:string}[]=[];for(let i=0;i<5;i++)if(await deliverRecovery(pool,key,origin,async value=>{messages.push(value);})==='idle')break;
  assert.equal(messages.length,1);assert.equal(messages[0].url,origin+'/recover?step=reset');
  const invalidResets=await Promise.all([0,1].map(index=>post(index,'/reset-password',{token:randomBytes(32).toString('base64url'),new_password:testPassword})));
  assert.deepEqual(invalidResets.map(response=>response.status),[400,400]);
  const reset={token:messages[0].code,new_password:'Synthetic-admission-reset!4826'};
  assert.equal((await post(0,'/reset-password',reset)).status,429);await expire();assert.equal((await post(1,'/reset-password',reset)).status,200);
  assert.equal((await fetch(origin+'/api/v1/me',{headers:{cookie}})).status,401);
  await expire();
  const factorEmail='admission-factor@example.test';await fixture.register(factorEmail);
  const factorSession=await fixture.library.api.signInEmail({body:{email:factorEmail,password:testPassword},asResponse:true});
  const factorCookie=factorSession.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  assert.equal((await fixture.library.api.enableTwoFactor({body:{password:testPassword},headers:{cookie:factorCookie},asResponse:true})).status,200);
  const factor=(await pool.query('SELECT secret FROM snappik_auth."twoFactor" WHERE "userId" IN(SELECT id FROM snappik_auth."user" WHERE email=$1)',[factorEmail])).rows[0];
  const factorSecret=await symmetricDecrypt({key:(await fixture.library.$context).secretConfig,data:factor.secret});
  const code=(await fixture.library.api.generateTOTP({body:{secret:factorSecret}})).code;
  assert.equal((await fixture.library.api.verifyTOTP({body:{code},headers:{cookie:factorCookie},asResponse:true})).status,200);
  const challenge=await post(0,'/sign-in/email',{email:factorEmail,password:testPassword});assert.equal(challenge.status,200);
  const proof=challenge.headers.getSetCookie().map(value=>value.split(';')[0]).join('; '),wrong=code==='000000'?'111111':'000000';
  const badFactors=await Promise.all([0,1].map(index=>post(index,'/two-factor/verify-totp',{code:wrong},proof+`; irrelevant=${index}`)));
  assert.deepEqual(badFactors.map(response=>response.status),[401,401]);
  assert.equal((await post(1,'/two-factor/verify-totp',{code},proof)).status,429);
  await db.server.stop();assert.equal((await post(0,'/two-factor/verify-totp',{code},proof)).status,503);await db.server.start();
  assert.equal((await post(1,'/two-factor/verify-totp',{code},proof)).status,429);await expire();
  const fresh=(await fixture.library.api.generateTOTP({body:{secret:factorSecret}})).code;
  assert.equal((await post(1,'/two-factor/verify-totp',{code:fresh},proof)).status,200);
  console.log('Passed: two built Next processes share account/native/reset/recovery/TOTP admission; spoofed headers fail; process/DB restart retain denial; lost HTTP recovery acknowledgement dedupes; expiry permits valid reset/MFA; copied session denied. Synthetic loopback only.');
}finally{await Promise.all(children.map(stop));await fixture?.close();await pool.end();await db.server.stop();}

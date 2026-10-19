// Synthetic test setup only. No HTTP fixture login, secret logs, or external delivery.
import pg from 'pg';
import {randomBytes} from 'node:crypto';
import type {BetterAuthPlugin} from 'better-auth';
import {createLibrary} from '../../src/modules/auth/library.js';
import {createAuthentication} from '../../src/modules/auth/http.js';
import type {AdmissionPolicy} from '../../src/modules/auth/admission-policy.js';
export const testPassword='Synthetic-only!Password-4826';
export function testAuthentication(connectionString:string,origin='http://localhost:3000',secret=randomBytes(48).toString('base64url'),plugins:BetterAuthPlugin[]=[],recoveryKey?:Buffer,admissionPolicy?:AdmissionPolicy) {
  const app=new pg.Pool({connectionString,max:5,connectionTimeoutMillis:5000,statement_timeout:10000,idle_in_transaction_session_timeout:15000});
  const database=new pg.Pool({connectionString,max:3,connectionTimeoutMillis:5000,statement_timeout:10000,options:'-c search_path=snappik_auth'});
  // Outage injection deliberately closes idle server connections; never log credential-bearing errors.
  app.on('error',()=>{});database.on('error',()=>{});
  const mail:{url:string;token:string}[]=[];
  const library=createLibrary({database,appDatabase:app,origin,instanceId:'synthetic-local',secret,plugins,admissionPolicy,
    sendVerificationEmail:async data=>{mail.push(data);}});
  const auth=createAuthentication(library,app,origin,'synthetic-local',recoveryKey?{key:recoveryKey}:undefined);
  function request(path:string,body:unknown={},cookie='') {
    return new Request(`${origin}/api/auth${path}`,{method:'POST',headers:{origin,'content-type':'application/json',cookie},body:JSON.stringify(body)});
  }
  async function register(email:string) {
    await library.api.signUpEmail({body:{name:'Synthetic Owner',email,password:testPassword}});
    const verification=mail.at(-1);if(!verification)throw new Error('SYNTHETIC_VERIFICATION_MISSING');
    const response=await library.handler(new Request(verification.url));
    if(!response.ok&&response.status!==302)throw new Error('SYNTHETIC_VERIFICATION_FAILED');
  }
  async function login(email:string) {
    const response=await auth.handle(request('/sign-in/email',{email,password:testPassword}));
    if(!response.ok)throw new Error(`SYNTHETIC_LOGIN_${response.status}`);
    const cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
    return {response,cookie,request:new Request(origin,{headers:{cookie}})};
  }
  return {app,database,mail,library,auth,register,login,request,secret,origin,
    close:async()=>{await Promise.all([app.end(),database.end()]);}};
}

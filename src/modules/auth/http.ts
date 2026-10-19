import type pg from 'pg';
import {randomUUID} from 'node:crypto';
import type { createLibrary } from './library.js';
import { recordTotp, revokeSession, secureSession } from './security.js';
import { safeOwnerReturn } from '../onboarding/policy.js';
import {credentialGate} from './gate.js';
import {requestRecovery,resetRecovery,InvalidRecovery,type RecoveryOptions} from './recovery.js';
import {AdmissionDenied} from './admission.js';
import type {AuthOperation} from './admission-policy.js';

const responseHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export function createAuthentication(library:ReturnType<typeof createLibrary>,pool:pg.Pool,origin:string,instanceId:string,recovery?:RecoveryOptions) {
  const namespace=`better-auth:${instanceId}`;
  const gate=credentialGate(pool);
  const rawSession=(request:Request)=>library.api.getSession({headers:request.headers,query:{disableCookieCache:true}});
  async function resolveSession(request:Request) {
    const raw=await rawSession(request);
    return raw ? secureSession(pool,namespace,raw) : null;
  }
  async function handle(request:Request) {
    const requestId=randomUUID();
    const fail=(status:number,code:string,retryAfter?:number)=>Response.json({error:{code,message:code,request_id:requestId}},{status,
      headers:{...responseHeaders,...(status===503?{'Retry-After':'5'}:retryAfter?{'Retry-After':String(retryAfter)}:{})}});
    try {
      const path=new URL(request.url).pathname.replace(/^\/api\/auth/,'');
      if (['/request-password-reset','/reset-password'].includes(path)&&!recovery)return fail(503,'RECOVERY_NOT_CONFIGURED');
      if (!['/sign-in/email','/sign-out','/two-factor/verify-totp','/request-password-reset','/reset-password'].includes(path)) return fail(404,'NOT_FOUND');
      if (request.method!=='POST') return fail(405,'METHOD_NOT_ALLOWED');
      if(request.headers.get('origin')!==origin || request.headers.get('sec-fetch-site')==='cross-site') return fail(403,'FORBIDDEN');
      if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')) return fail(400,'INVALID_INPUT');
      const operation:AuthOperation|undefined=({'/sign-in/email':'login','/request-password-reset':'recovery','/reset-password':'reset','/two-factor/verify-totp':'totp'} as Record<string,AuthOperation>)[path];
      // Independent committed admission precedes body/proof work, not auth rollback.
      // Logout is deliberately outside these budgets so throttling cannot trap sessions.
      if(operation)await library.admission.global(operation);
      const reader=request.body?.getReader(); if(!reader) return fail(400,'INVALID_INPUT');
      const chunks:Uint8Array[]=[];let size=0;
      try { for(;;) {const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
        if(size>8192){await reader.cancel();return fail(413,'PAYLOAD_TOO_LARGE');}chunks.push(value);} }
      finally {reader.releaseLock();}
      let body:Record<string,unknown>;
      try {body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return fail(400,'INVALID_INPUT');}
      if(!body || typeof body!=='object' || Array.isArray(body))return fail(400,'INVALID_INPUT');
      if(path==='/request-password-reset') {
        if(Object.keys(body).some(key=>!['email','request_id'].includes(key)) || typeof body.email!=='string' ||
          body.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
          typeof body.request_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id))return fail(400,'INVALID_INPUT');
        const email=body.email,id=body.request_id;
        try{await library.admission.subject('recovery',email.trim().toLowerCase());}
        catch(error){if(!(error instanceof AdmissionDenied))throw error;
          return Response.json({accepted:true},{status:202,headers:responseHeaders});}
        await gate(async()=>requestRecovery(pool,recovery!.key,email,id));
        return Response.json({accepted:true},{status:202,headers:responseHeaders});
      }
      if(path==='/reset-password') {
        if(Object.keys(body).some(key=>!['token','new_password'].includes(key)) || typeof body.token!=='string'||
          !/^[A-Za-z0-9_-]{43}$/.test(body.token)||typeof body.new_password!=='string'||
          body.new_password.length<12||body.new_password.length>128)return fail(400,'INVALID_INPUT');
        const token=body.token,password=body.new_password;
        await gate(async tx=>resetRecovery(tx,namespace,token,async()=>(await library.$context).password.hash(password)));
        return Response.json({success:true},{headers:responseHeaders}); // No auto-login, MFA change or token echo.
      }
      if(path==='/sign-out') {
        if(Object.keys(body).length)return fail(400,'INVALID_INPUT');
        // Must distinguish absent credentials from unavailable authoritative storage.
        await library.admission.checkPolicy();
        const current=await rawSession(request);
        if(current)await revokeSession(pool,namespace,current.user.id,current.session.id);
        // Success now rests on committed revocation, never the library's deletion response.
        const context=await library.$context;
        const headers=new Headers(responseHeaders);
        for(const cookie of [context.authCookies.sessionToken,context.authCookies.sessionData,context.authCookies.dontRememberToken,context.createAuthCookie('two_factor')]) {
          headers.append('Set-Cookie',`${cookie.name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${origin.startsWith('https:')?'; Secure':''}`);
        }
        try {await library.handler(new Request(`${origin}/api/auth/sign-out`,{method:'POST',headers:request.headers,body:'{}'}));}
        catch {/* Cleanup may fail; committed revocation remains authoritative. */}
        return Response.json({success:true},{headers});
      }
      const keys=path==='/sign-in/email'?['email','password','return_to']:['code','return_to'];
      if(Object.keys(body).some(key=>!keys.includes(key)))return fail(400,'INVALID_INPUT');
      const destination=safeOwnerReturn(body.return_to);
      if(path==='/sign-in/email' && (typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email.trim())||
        typeof body.password!=='string'||body.password.length<1||body.password.length>128))return fail(400,'INVALID_INPUT');
      if(path==='/two-factor/verify-totp' && (typeof body.code!=='string'||!/^\d{6}$/.test(body.code)))return fail(400,'INVALID_INPUT');
      if(path==='/sign-in/email')await library.admission.subject('login',(body.email as string).trim().toLowerCase());
      else {
        const context=await library.$context;
        const names=[context.createAuthCookie('two_factor').name,context.authCookies.sessionToken.name];
        const proof=new Map<string,string>();
        for(const pair of (request.headers.get('cookie')??'').split(';')) {
          const at=pair.indexOf('=');if(at<0)continue;const name=pair.slice(0,at).trim();if(!names.includes(name))continue;
          if(proof.has(name))return fail(400,'INVALID_INPUT');
          let value=pair.slice(at+1).trim();if(value.startsWith('"'))value=value.slice(1,-1);
          try{value=decodeURIComponent(value);}catch{/* Native parser keeps undecodable text too. */}
          proof.set(name,value);
        }
        const current=await rawSession(request),pending=proof.get(names[0])??'',dot=pending.lastIndexOf('.');
        // Native cookies permit quoted/percent-encoded equivalents. Budget the
        // verified account, or canonical pending identifier (not signature spelling).
        // No authority comes from this key: native signature/proof checks still run.
        await library.admission.subject('totp',current?`account:${current.user.id}`:dot>0?`pending:${pending.slice(0,dot)}`:'no-proof');
      }
      const payload=path==='/sign-in/email'?{email:(body.email as string).trim().toLowerCase(),password:body.password}:{code:body.code,trustDevice:false};
      return await gate(async()=>{
      // The gate covers password proof, session attachment and pending TOTP creation/consumption.
      // Reset cannot interleave between old proof and a newly stamped security version.
      const result=await library.handler(new Request(`${origin}/api/auth${path}`,{method:'POST',headers:request.headers,body:JSON.stringify(payload)}));
      if(!result.ok){if(result.status===429){const value=Number(result.headers.get('X-Retry-After'));
          // Native account-lockout errors omit the HTTP limiter's header. The
          // pinned default is 900s; use that conservative upper bound, not 10s.
          return fail(429,'RATE_LIMITED',Number.isInteger(value)&&value>0&&value<=3600?value:path==='/two-factor/verify-totp'?900:10);}
        return fail(result.status>=500?503:result.status,'AUTHENTICATION_FAILED');}
      const data=await result.json();
      const headers=new Headers(responseHeaders);
      for(const cookie of result.headers.getSetCookie())headers.append('Set-Cookie',cookie);
      if(path==='/two-factor/verify-totp') {
        const cookieHeader=[request.headers.get('cookie')??'',...result.headers.getSetCookie().map(cookie=>cookie.split(';')[0])].filter(Boolean).join('; ');
        // New token from library response wins; avoid duplicate cookie ambiguity.
        const jar=new Map(cookieHeader.split('; ').map(pair=>{const i=pair.indexOf('=');return [pair.slice(0,i),pair.slice(i+1)];}));
        const current=await rawSession(new Request(origin,{headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}}));
        if(!current)return fail(401,'AUTH_REQUIRED');
        await recordTotp(pool,namespace,current.user.id,current.session.id);
      }
      return Response.json({success:true,...(data.twoFactorRedirect?{two_factor_required:true}:{return_to:destination})},{headers});
      });
    } catch(error) {return error instanceof AdmissionDenied?fail(429,'RATE_LIMITED',error.retryAfter):
      error instanceof InvalidRecovery?fail(400,'INVALID_OR_EXPIRED_RESET'):fail(503,'TEMPORARILY_UNAVAILABLE');}
  }
  return {library,resolveSession,handle};
}

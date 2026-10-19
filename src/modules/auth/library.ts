import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import {PostgresDialect} from 'kysely';
import type pg from 'pg';
import { attachSession } from './security.js';
import {createAdmission} from './admission.js';
import type {AdmissionPolicy} from './admission-policy.js';
import {AsyncLocalStorage} from 'node:async_hooks';

export type AuthOptions = {database:pg.Pool; appDatabase:pg.Pool; origin:string; instanceId:string; secret:string;
  // Dependency injection is server-only. Runtime never supplies OAuth or a test login endpoint.
  admissionPolicy?:AdmissionPolicy;plugins?:BetterAuthPlugin[]; sendVerificationEmail?:(data:{url:string;token:string})=>Promise<void>};
export function createLibrary(options:AuthOptions) {
  const namespace=`better-auth:${options.instanceId}`;
  const admission=createAdmission(options.appDatabase,options.secret,options.instanceId,options.admissionPolicy);
  const completion=new AsyncLocalStorage<string|undefined>();
  const library=betterAuth({
    appName:'Snappik',baseURL:options.origin,secret:options.secret,
    database:{dialect:new PostgresDialect({pool:options.database}),type:'postgres',schemaName:'snappik_auth',transaction:true},
    trustedOrigins:[options.origin],logger:{disabled:true},
    // Let the wrapper sanitize unexpected errors. Native router otherwise prints
    // raw non-API exceptions despite logger.disabled (including database detail).
    onAPIError:{throw:true},
    advanced:{useSecureCookies:options.origin.startsWith('https:'),database:{generateId:'uuid'},cookiePrefix:'snappik-owner',
      // Next Request exposes no authenticated socket peer. Never trust inbound IP headers.
      ipAddress:{ipAddressHeaders:[]}},
    rateLimit:{customStorage:{consume:admission.native}},
    session:{expiresIn:3600,disableSessionRefresh:true,cookieCache:{enabled:false}},
    emailAndPassword:{enabled:true,requireEmailVerification:true,minPasswordLength:12,maxPasswordLength:128,
      resetPasswordTokenExpiresIn:900,revokeSessionsOnPasswordReset:true},
    emailVerification:{autoSignInAfterVerification:false,sendOnSignUp:true,sendVerificationEmail:options.sendVerificationEmail},
    account:{encryptOAuthTokens:true,accountLinking:{enabled:true,disableImplicitLinking:true,trustedProviders:[],allowDifferentEmails:false}},
    databaseHooks:{session:{create:{after:async session=>attachSession(options.appDatabase,namespace,session.id,session.userId,completion.getStore())}}},
    plugins:[twoFactor(),...(options.plugins??[])],
  });
  return Object.assign(library,{admission,withChallenge:<T>(hash:string|undefined,work:()=>Promise<T>)=>completion.run(hash,work)});
}

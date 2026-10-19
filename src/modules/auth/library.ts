import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import {PostgresDialect} from 'kysely';
import type pg from 'pg';
import { attachSession } from './security.js';

export type AuthOptions = {database:pg.Pool; appDatabase:pg.Pool; origin:string; instanceId:string; secret:string;
  // Dependency injection is server-only. Runtime never supplies OAuth or a test login endpoint.
  plugins?:BetterAuthPlugin[]; sendVerificationEmail?:(data:{url:string;token:string})=>Promise<void>};
export function createLibrary(options:AuthOptions) {
  const namespace=`better-auth:${options.instanceId}`;
  return betterAuth({
    appName:'Snappik',baseURL:options.origin,secret:options.secret,
    database:{dialect:new PostgresDialect({pool:options.database}),type:'postgres',schemaName:'snappik_auth',transaction:true},
    trustedOrigins:[options.origin],logger:{disabled:true},
    advanced:{useSecureCookies:options.origin.startsWith('https:'),database:{generateId:'uuid'},cookiePrefix:'snappik-owner'},
    session:{expiresIn:3600,disableSessionRefresh:true,cookieCache:{enabled:false}},
    emailAndPassword:{enabled:true,requireEmailVerification:true,minPasswordLength:12,maxPasswordLength:128,
      resetPasswordTokenExpiresIn:900,revokeSessionsOnPasswordReset:true},
    emailVerification:{autoSignInAfterVerification:false,sendOnSignUp:true,sendVerificationEmail:options.sendVerificationEmail},
    account:{encryptOAuthTokens:true,accountLinking:{enabled:true,disableImplicitLinking:true,trustedProviders:[],allowDifferentEmails:false}},
    databaseHooks:{session:{create:{after:async session=>attachSession(options.appDatabase,namespace,session.id,session.userId)}}},
    plugins:[twoFactor(),...(options.plugins??[])],
  });
}

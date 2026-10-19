import pg from 'pg';
import {randomUUID} from 'node:crypto';
import { readConfig } from '../../config.js';
import { getPool } from '../../db/pool.js';
import { assertAuthSchema } from '../../db/auth-migrate.js';
import { auth as unavailable, type AuthAdapter } from '../../adapters/providers.js';
import { createLibrary } from './library.js';
import { createAuthentication } from './http.js';
let instance:ReturnType<typeof createAuthentication>|undefined;
export function authentication() {
  const config=readConfig();
  if(config.authMode!=='better-auth-local')return null;
  if(!instance) {
    const database=new pg.Pool({connectionString:config.databaseUrl,max:config.poolMax,connectionTimeoutMillis:5000,
      statement_timeout:10000,idle_in_transaction_session_timeout:15000,options:'-c search_path=snappik_auth'});
    database.on('error',()=>console.error(JSON.stringify({event:'auth_database_pool_error'})));
    instance=createAuthentication(createLibrary({database,appDatabase:getPool(),origin:config.origin,
      instanceId:config.authInstanceId!,secret:config.authSecret!,admissionPolicy:config.admissionPolicy}),getPool(),config.origin,config.authInstanceId!,
      config.recoveryKey?{key:Buffer.from(config.recoveryKey,'base64url')}:undefined);
  }
  return instance;
}
export const runtimeAuth:AuthAdapter={async resolveSession(request) {
  if(readConfig().authMode!=='better-auth-local')return unavailable.resolveSession(request);
  await assertAuthSchema(getPool());
  return authentication()!.resolveSession(request);
}};
export async function authHandler(request:Request) {
  try {
    if(readConfig().authMode==='better-auth-local') {
      await assertAuthSchema(getPool());return await authentication()!.handle(request);
    }
  }catch{/* Only sanitized availability is exposed. */}
  return Response.json({error:{code:'TEMPORARILY_UNAVAILABLE',message:'TEMPORARILY_UNAVAILABLE',request_id:randomUUID()}},
    {status:503,headers:{'Cache-Control':'no-store','Retry-After':'5','Referrer-Policy':'no-referrer'}});
}

import {createHmac,hkdfSync} from 'node:crypto';
import type pg from 'pg';
import {transaction} from '../../db/pool.js';
import {readAdmissionPolicy,type AdmissionPolicy,type AuthOperation} from './admission-policy.js';

export class AdmissionDenied extends Error {
  constructor(readonly retryAfter:number){super('RATE_LIMITED');}
}
export const admissionCapacity=10000;
// Short independent transactions: attempts remain charged after auth failure,
// rollback, response loss or a busy credential gate. Never hold this lock at proof.
export function createAdmission(pool:pg.Pool,secret:string,instanceId:string,policy:AdmissionPolicy=readAdmissionPolicy()) {
  const key=Buffer.from(hkdfSync('sha256',secret,'snappik-auth-admission-v1','bucket-identifiers',32));
  const digest=(value:string)=>createHmac('sha256',key).update(JSON.stringify([instanceId,value])).digest('hex');
  const fingerprint=digest(JSON.stringify({version:1,native:'better-auth-1.7.9',policy}));
  async function pinPolicy(tx:pg.PoolClient) {
    await tx.query("SET LOCAL lock_timeout='1s'; SET LOCAL statement_timeout='2s'");
    await tx.query('SELECT pg_advisory_xact_lock(734006)');
    await tx.query('INSERT INTO snappik_auth.admission_policy(namespace,fingerprint) VALUES($1,$2) ON CONFLICT DO NOTHING',[instanceId,fingerprint]);
    if((await tx.query('SELECT fingerprint FROM snappik_auth.admission_policy WHERE namespace=$1',[instanceId])).rows[0].fingerprint!==fingerprint)throw new Error('ADMISSION_POLICY_MISMATCH');
  }
  async function consume(scope:'global'|'subject'|'native',identity:string,max:number,window:number,sliding=false) {
    if(!Number.isInteger(max)||max<1||max>10000||!Number.isInteger(window)||window<1||window>3600||identity.length>4096)throw new Error('ADMISSION_CONFIG');
    return transaction(pool,async tx=>{
      await pinPolicy(tx);
      // Bounded lazy cleanup, also on denied traffic; expiry is authoritative DB time.
      await tx.query(`DELETE FROM snappik_auth.admission_bucket WHERE key_hash IN
        (SELECT key_hash FROM snappik_auth.admission_bucket WHERE expires_at<=clock_timestamp() ORDER BY expires_at LIMIT 32)`);
      const hash=digest(JSON.stringify([scope,identity]));
      const old=(await tx.query(`SELECT used,expires_at,ceil(extract(epoch FROM expires_at-clock_timestamp()))::int AS retry
        FROM snappik_auth.admission_bucket WHERE key_hash=$1`,[hash])).rows[0];
      if(old&&old.retry>0&&old.used>=max)return {allowed:false,retryAfter:Math.max(1,Math.min(window,old.retry))};
      if(!old&&(await tx.query('SELECT count(*)::int AS n FROM snappik_auth.admission_bucket')).rows[0].n>=admissionCapacity)throw new Error('ADMISSION_CAPACITY');
      await tx.query(`INSERT INTO snappik_auth.admission_bucket(key_hash,scope,used,expires_at)
        VALUES($1,$2,1,clock_timestamp()+$3*interval '1 second') ON CONFLICT(key_hash) DO UPDATE SET
        used=CASE WHEN admission_bucket.expires_at<=clock_timestamp() THEN 1 ELSE admission_bucket.used+1 END,
        expires_at=CASE WHEN $4 OR admission_bucket.expires_at<=clock_timestamp() THEN clock_timestamp()+$3*interval '1 second' ELSE admission_bucket.expires_at END`,[hash,scope,window,sliding]);
      return {allowed:true,retryAfter:null};
    });
  }
  return {policy,
    // No attempt charge: logout still verifies this process can interpret shared credentials.
    checkPolicy:()=>transaction(pool,pinPolicy),
    async global(operation:AuthOperation){const result=await consume('global',operation,policy.global[operation],policy.window);if(!result.allowed)throw new AdmissionDenied(result.retryAfter!);},
    async subject(operation:'login'|'recovery'|'totp',identity:string){
      const result=await consume('subject',JSON.stringify([operation,identity]),policy.subject[operation],policy.window);
      if(!result.allowed)throw new AdmissionDenied(result.retryAfter!);
    },
    // Preserve native rolling/inactivity-window behavior and special/plugin rules.
    native:(identity:string,rule:{max:number;window:number})=>consume('native',identity,rule.max,rule.window,true)
  };
}

import {createCipheriv,createDecipheriv,createHash,createHmac,hkdfSync,randomBytes,randomUUID} from 'node:crypto';
import type pg from 'pg';
import {transaction} from '../../db/pool.js';

export type RecoveryOptions={key:Buffer};
export class InvalidRecovery extends Error {constructor(){super('INVALID_OR_EXPIRED_RESET');}}
export const recoveryHash=(token:string)=>createHash('sha256').update(token).digest('hex');
const subkey=(key:Buffer,purpose:string)=>Buffer.from(hkdfSync('sha256',key,'snappik-recovery-v1',purpose,32));
function seal(key:Buffer,id:string,data:unknown) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',subkey(key,'payload'),iv);
  cipher.setAAD(Buffer.from(`snappik-recovery:v1:${id}`));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
function open(key:Buffer,id:string,payload:string):{email:string;token:string} {
  const [version,iv,tag,encrypted]=payload.split('.');
  if(version!=='v1')throw new Error('RECOVERY_KEY_UNAVAILABLE');
  const decipher=createDecipheriv('aes-256-gcm',subkey(key,'payload'),Buffer.from(iv,'base64url'));
  decipher.setAAD(Buffer.from(`snappik-recovery:v1:${id}`));decipher.setAuthTag(Buffer.from(tag,'base64url'));
  const data=JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted,'base64url')),decipher.final()]).toString('utf8'));
  if(typeof data.email!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(data.token))throw new Error('RECOVERY_PAYLOAD_INVALID');
  return data;
}
export async function requestRecovery(pool:pg.Pool,key:Buffer,email:string,requestId:string) {
  const address=email.trim().toLowerCase();
  const digest=(purpose:string,value:string)=>createHmac('sha256',subkey(key,'receipts')).update(`snappik-recovery:${purpose}:${value}`).digest('hex');
  const addressHash=digest('address',address),requestHash=digest('request',`${address}:${requestId.toLowerCase()}`);
  await transaction(pool,async tx=>{
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,734005))',[addressHash]);
    if((await tx.query('SELECT 1 FROM snappik_auth.recovery_requests WHERE request_hash=$1',[requestHash])).rowCount)return;
    // Same durable address budget for known/unknown accounts. IP/global limits remain a release gate.
    if((await tx.query(`SELECT count(*)::int AS n FROM snappik_auth.recovery_requests
      WHERE address_hash=$1 AND created_at>clock_timestamp()-interval '1 hour'`,[addressHash])).rows[0].n>=3)return;
    await tx.query('INSERT INTO snappik_auth.recovery_requests(request_hash,address_hash) VALUES($1,$2)',[requestHash,addressHash]);
    const users=(await tx.query(`SELECT u.id,u.email FROM snappik_auth."user" u
      WHERE lower(u.email)=$1 AND u."emailVerified" AND
        (SELECT count(*) FROM snappik_auth.account a WHERE a."userId"=u.id AND a."providerId"='credential')=1 AND
        EXISTS(SELECT 1 FROM snappik_auth.account a WHERE a."userId"=u.id AND a."providerId"='credential'
          AND a."accountId"=u.id::text AND a.password IS NOT NULL)`,[address])).rows;
    const user=users.length===1?users[0]:null;
    // Identical durable writes even for unknown/OAuth-only/unverified accounts.
    // Their dummy jobs never call delivery; plaintext unknown addresses are not retained.
    const token=randomBytes(32).toString('base64url'),id=randomUUID(),hash=recoveryHash(token);
    await tx.query('INSERT INTO snappik_auth.password_recovery(token_hash,user_id) VALUES($1,$2)',[hash,user?.id??null]);
    await tx.query('INSERT INTO snappik_auth.recovery_outbox(id,token_hash,payload) VALUES($1,$2,$3)',[id,hash,seal(key,id,{email:user?.email??'',token})]);
  });
}

// Caller holds the cross-process credential gate and commits this entire operation.
// Hashing is delegated to the pinned library, never a second password algorithm.
export async function resetRecovery(tx:pg.PoolClient,namespace:string,token:string,hashPassword:()=>Promise<string>) {
  const recovery=(await tx.query(`SELECT user_id FROM snappik_auth.password_recovery
    WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>clock_timestamp()`,[recoveryHash(token)])).rows[0];
  if(!recovery?.user_id)throw new InvalidRecovery();
  await tx.query('SELECT id FROM public.users WHERE auth_provider=$1 AND auth_subject=$2 FOR UPDATE',[namespace,recovery.user_id]);
  const consumed=await tx.query(`UPDATE snappik_auth.password_recovery SET consumed_at=clock_timestamp()
    WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>clock_timestamp() RETURNING user_id`,[recoveryHash(token)]);
  if(!consumed.rowCount)throw new InvalidRecovery();
  const passwordHash=await hashPassword();
  const updated=await tx.query(`UPDATE snappik_auth.account SET password=$1,"updatedAt"=clock_timestamp()
    WHERE "userId"=$2 AND "providerId"='credential' AND "accountId"=$2::text AND password IS NOT NULL`,[passwordHash,recovery.user_id]);
  if(updated.rowCount!==1)throw new InvalidRecovery();
  await tx.query(`UPDATE public.users SET security_version=security_version+1,updated_at=clock_timestamp()
    WHERE auth_provider=$1 AND auth_subject=$2`,[namespace,recovery.user_id]);
  await tx.query(`UPDATE public.owner_session_security SET revoked_at=COALESCE(revoked_at,clock_timestamp()),
    mfa_verified_at=NULL,mfa_method=NULL WHERE user_id IN
      (SELECT id FROM public.users WHERE auth_provider=$1 AND auth_subject=$2)`,[namespace,recovery.user_id]);
  // Pending primary proof and trusted-device records must not survive reset.
  await tx.query(`DELETE FROM snappik_auth.verification WHERE value=$1 AND
    (identifier LIKE '2fa-%' OR identifier LIKE 'trust-device-%')`,[recovery.user_id]);
  await tx.query(`UPDATE snappik_auth.password_recovery SET consumed_at=COALESCE(consumed_at,clock_timestamp()) WHERE user_id=$1`,[recovery.user_id]);
  await tx.query(`UPDATE snappik_auth.recovery_outbox SET state='cancelled',payload=NULL,lease_id=NULL,lease_until=NULL,
    finished_at=clock_timestamp() WHERE token_hash IN(SELECT token_hash FROM snappik_auth.password_recovery WHERE user_id=$1)
    AND state IN ('queued','running')`,[recovery.user_id]);
}

export type RecoveryClaim={id:string;lease_id:string;payload:string};
export async function claimRecovery(pool:pg.Pool):Promise<RecoveryClaim|null> {
  return transaction(pool,async tx=>{
    await tx.query(`UPDATE snappik_auth.recovery_outbox o SET state='cancelled',payload=NULL,lease_id=NULL,lease_until=NULL,
      error_code='TOKEN_EXPIRED',finished_at=clock_timestamp() FROM snappik_auth.password_recovery r
      WHERE o.token_hash=r.token_hash AND (r.consumed_at IS NOT NULL OR r.expires_at<=clock_timestamp())
      AND o.state IN ('queued','running')`);
    await tx.query(`UPDATE snappik_auth.recovery_outbox SET state='failed',payload=NULL,lease_id=NULL,lease_until=NULL,
      error_code='LEASE_EXPIRED',finished_at=clock_timestamp() WHERE state='running' AND lease_until<=clock_timestamp() AND attempts=3`);
    return (await tx.query(`WITH candidate AS(SELECT id FROM snappik_auth.recovery_outbox
      WHERE attempts<3 AND ((state='queued' AND available_at<=clock_timestamp()) OR (state='running' AND lease_until<=clock_timestamp()))
      ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE snappik_auth.recovery_outbox o SET state='running',attempts=attempts+1,lease_id=$1,
      lease_until=clock_timestamp()+interval '30 seconds' FROM candidate c WHERE o.id=c.id RETURNING o.id,o.lease_id,o.payload`,[randomUUID()])).rows[0]??null;
  });
}
export async function settleRecovery(pool:pg.Pool,claim:RecoveryClaim,success:boolean) {
  const result=await pool.query(`UPDATE snappik_auth.recovery_outbox SET
    state=CASE WHEN $3 THEN 'completed' WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,
    payload=CASE WHEN $3 OR attempts>=3 THEN NULL ELSE payload END,
    available_at=clock_timestamp()+CASE WHEN attempts=1 THEN interval '30 seconds' ELSE interval '120 seconds' END,
    error_code=CASE WHEN $3 THEN NULL ELSE 'DELIVERY_FAILED' END,
    delivery_mode=CASE WHEN $3 THEN 'synthetic' ELSE NULL END,
    finished_at=CASE WHEN $3 OR attempts>=3 THEN clock_timestamp() ELSE NULL END,lease_id=NULL,lease_until=NULL
    WHERE id=$1 AND lease_id=$2 AND state='running' AND lease_until>clock_timestamp()`,[claim.id,claim.lease_id,success]);
  return result.rowCount===1;
}
// Synthetic adapter ONLY, injected server-side. No SMTP/HTTP implementation exists.
// Adapter must honor AbortSignal and use id as an idempotency key. A crash after delivery
// before ack can duplicate delivery; the same token remains single-use.
export async function deliverRecovery(pool:pg.Pool,key:Buffer,origin:string,
  adapter:(message:{id:string;email:string;url:string},signal:AbortSignal)=>Promise<void>) {
  const claim=await claimRecovery(pool);if(!claim)return 'idle';
  const abort=new AbortController();let timeout:ReturnType<typeof setTimeout>|undefined;
  let success=false;
  try {
    const data=open(key,claim.id,claim.payload);
    await Promise.race([data.email?adapter({id:claim.id,email:data.email,url:`${origin}/recover#token=${data.token}`},abort.signal):Promise.resolve(),
      new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{abort.abort();reject(new Error('DELIVERY_TIMEOUT'));},5000);})]);
    success=true;
  }catch{/* Do not persist or log adapter errors, recipient, URL, token or payload. */}
  finally{if(timeout)clearTimeout(timeout);}
  return await settleRecovery(pool,claim,success)?(success?'completed_synthetic':'retry_or_failed'):'stale';
}

import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import type pg from 'pg';

export class InvalidAuthCookie extends Error {}
// Match the pinned native parser, while rejecting ambiguous auth cookies.
export function authCookies(headers:Headers,names:string[]) {
  const proof=new Map<string,string>();
  for(const pair of (headers.get('cookie')??'').split(';')) {
    const at=pair.indexOf('=');if(at<0)continue;const name=pair.slice(0,at).trim();if(!names.includes(name))continue;
    if(proof.has(name))throw new InvalidAuthCookie();
    let value=pair.slice(at+1).trim();if(value.startsWith('"'))value=value.slice(1,-1);
    try{value=decodeURIComponent(value);}catch{/* Same undecodable text as native parser. */}
    proof.set(name,value);
  }
  return proof;
}
export function signedChallenge(value:string|undefined,secret:string):string|null {
  if(!value)return null;
  const dot=value.lastIndexOf('.'),id=value.slice(0,dot),signature=value.slice(dot+1);
  if(!/^2fa-[A-Za-z0-9_-]{20}$/.test(id)||signature.length!==44||!signature.endsWith('='))return null;
  const actual=Buffer.from(signature,'base64'),expected=createHmac('sha256',secret).update(id).digest();
  return actual.length===expected.length&&timingSafeEqual(actual,expected)?id:null;
}
export const challengeHash=(namespace:string,id:string)=>createHash('sha256').update(JSON.stringify(['snappik-totp-v1',namespace,id])).digest('hex');

// Caller holds credential gate734004. Native challenge creation has already completed.
export async function registerChallenge(tx:pg.PoolClient,namespace:string,id:string) {
  const native=(await tx.query(`SELECT v.value,v."expiresAt" FROM snappik_auth.verification v
    JOIN snappik_auth."user" a ON a.id::text=v.value WHERE v.identifier=$1 AND a."emailVerified"
    AND v."expiresAt">clock_timestamp()`,[id])).rows;
  if(native.length!==1)throw new Error('CHALLENGE_NOT_AVAILABLE');
  const user=(await tx.query('SELECT id,security_version FROM public.users WHERE auth_provider=$1 AND auth_subject=$2 FOR UPDATE',[namespace,native[0].value])).rows[0];
  if(!user)throw new Error('CHALLENGE_IDENTITY_MISSING');
  // Bounded lazy retention: receipts for live resulting sessions are never pruned.
  await tx.query(`DELETE FROM snappik_auth.totp_challenge_security WHERE challenge_hash IN
    (SELECT c.challenge_hash FROM snappik_auth.totp_challenge_security c LEFT JOIN snappik_auth.session s ON s.id=c.session_id
    WHERE c.expires_at<clock_timestamp()-interval '1 day' AND (s.id IS NULL OR s."expiresAt"<=clock_timestamp())
    ORDER BY c.expires_at LIMIT 32)`);
  await tx.query(`INSERT INTO snappik_auth.totp_challenge_security(challenge_hash,user_id,security_version,expires_at)
    VALUES($1,$2,$3,$4)`,[challengeHash(namespace,id),user.id,user.security_version,native[0].expiresAt]);
}

export async function pendingChallenge(tx:pg.PoolClient,namespace:string,id:string) {
  return !!(await tx.query(`SELECT 1 FROM snappik_auth.totp_challenge_security c JOIN public.users u ON u.id=c.user_id
    JOIN snappik_auth."user" a ON a.id::text=u.auth_subject WHERE c.challenge_hash=$1 AND u.auth_provider=$2
    AND c.revoked_at IS NULL AND c.session_id IS NULL AND c.expires_at>clock_timestamp()
    AND c.security_version=u.security_version AND a."emailVerified"`,[challengeHash(namespace,id),namespace])).rowCount;
}

// Same transaction as logout session revocation; receipt survives native consumption.
export async function cancelChallenge(tx:pg.PoolClient,namespace:string,id:string) {
  const hash=challengeHash(namespace,id);
  const receipt=(await tx.query('SELECT user_id,session_id FROM snappik_auth.totp_challenge_security WHERE challenge_hash=$1',[hash])).rows[0];
  if(receipt) {
    await tx.query('SELECT id FROM public.users WHERE id=$1 FOR UPDATE',[receipt.user_id]);
    await tx.query('UPDATE snappik_auth.totp_challenge_security SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE challenge_hash=$1',[hash]);
    await tx.query(`UPDATE public.owner_session_security SET revoked_at=COALESCE(revoked_at,clock_timestamp()),mfa_verified_at=NULL,mfa_method=NULL
      WHERE session_id=$1 AND user_id=$2`,[receipt.session_id,receipt.user_id]);
  }
  await tx.query('DELETE FROM snappik_auth.verification WHERE identifier=ANY($1::text[])',[ [id,`2fa-attempts-${id}`] ]);
}

import type pg from 'pg';
import type { ProviderSession } from '../../adapters/providers.js';
import { transaction } from '../../db/pool.js';
import { SetupError } from '../onboarding/policy.js';

// Always acquire app user before session metadata, then studio/project/selection set.
export async function assertSession(tx: pg.PoolClient, userId: string, sessionId: string) {
  await tx.query('SELECT id FROM public.users WHERE id=$1 FOR UPDATE', [userId]);
  const active = await tx.query(`SELECT 1 FROM public.owner_session_security m
    JOIN public.users u ON u.id=m.user_id JOIN snappik_auth.session s ON s.id=m.session_id
    JOIN snappik_auth."user" a ON a.id=s."userId"
    WHERE m.user_id=$1 AND m.session_id=$2 AND m.revoked_at IS NULL
      AND m.security_version=u.security_version AND a."emailVerified"
      AND u.auth_subject=a.id::text AND clock_timestamp()<s."expiresAt"`, [userId,sessionId]);
  if (!active.rowCount) throw new SetupError('AUTH_REQUIRED');
}

export async function attachSession(pool: pg.Pool, namespace: string, sessionId: string, subject: string) {
  // Called only after a new library session is persisted. Missing metadata never authorizes.
  await transaction(pool, async tx => {
    const account = (await tx.query('SELECT email,name,"emailVerified" FROM snappik_auth."user" WHERE id=$1',[subject])).rows[0];
    if (!account?.emailVerified) throw new SetupError('EMAIL_VERIFICATION_REQUIRED');
    await tx.query(`INSERT INTO public.users(auth_provider,auth_subject,email_normalized,display_name)
      VALUES($1,$2,$3,$4) ON CONFLICT(auth_provider,auth_subject) DO NOTHING`,[namespace,subject,account.email.toLowerCase(),account.name]);
    const user = (await tx.query('SELECT id,security_version FROM public.users WHERE auth_provider=$1 AND auth_subject=$2 FOR UPDATE',[namespace,subject])).rows[0];
    await tx.query(`INSERT INTO public.owner_session_security(session_id,user_id,security_version)
      SELECT id,$2,$3 FROM snappik_auth.session WHERE id=$1 AND "userId"=$4
      ON CONFLICT(session_id) DO NOTHING`,[sessionId,user.id,user.security_version,subject]);
    await assertSession(tx,user.id,sessionId);
  });
}

export async function secureSession(pool: pg.Pool, namespace: string, raw: {
  user:{id:string;email:string;name:string;emailVerified:boolean}; session:{id:string;expiresAt:Date}
}): Promise<ProviderSession | null> {
  try {
    return await transaction(pool, async tx => {
      const user = (await tx.query('SELECT id FROM public.users WHERE auth_provider=$1 AND auth_subject=$2',[namespace,raw.user.id])).rows[0];
      if (!user) return null;
      await assertSession(tx,user.id,raw.session.id);
      return {provider:namespace,subject:raw.user.id,sessionId:raw.session.id,expiresAt:raw.session.expiresAt,
        emailVerified:raw.user.emailVerified,email:raw.user.email,displayName:raw.user.name,
        assertActive:(connection:pg.PoolClient)=>assertSession(connection,user.id,raw.session.id)};
    });
  } catch (error) { if (error instanceof SetupError) return null; throw error; }
}

export async function revokeSession(pool: pg.Pool, namespace: string, subject: string, sessionId: string) {
  await transaction(pool, async tx => {
    const user = (await tx.query('SELECT id FROM public.users WHERE auth_provider=$1 AND auth_subject=$2 FOR UPDATE',[namespace,subject])).rows[0];
    if (!user) throw new Error('AUTH_SECURITY_METADATA_MISSING');
    const revoked = await tx.query(`UPDATE public.owner_session_security SET revoked_at=COALESCE(revoked_at,clock_timestamp()),
      mfa_verified_at=NULL,mfa_method=NULL WHERE session_id=$1 AND user_id=$2 RETURNING session_id`,[sessionId,user.id]);
    if (!revoked.rowCount) throw new Error('AUTH_SECURITY_METADATA_MISSING');
  });
}

export async function recordTotp(pool: pg.Pool, namespace: string, subject: string, sessionId: string) {
  await transaction(pool, async tx => {
    const user = (await tx.query('SELECT id FROM public.users WHERE auth_provider=$1 AND auth_subject=$2',[namespace,subject])).rows[0];
    if (!user) throw new SetupError('AUTH_REQUIRED');
    await assertSession(tx,user.id,sessionId);
    await tx.query(`UPDATE public.owner_session_security SET mfa_verified_at=clock_timestamp(),mfa_method='totp'
      WHERE session_id=$1 AND user_id=$2`,[sessionId,user.id]);
  });
}

export async function requireOperator(tx: pg.PoolClient, userId: string, sessionId: string, permission: string) {
  await assertSession(tx,userId,sessionId);
  const allowed = await tx.query('SELECT 1 FROM public.platform_roles WHERE user_id=$1 AND permission=$2',[userId,permission]);
  if (!allowed.rowCount) throw new Error('PERMISSION_DENIED');
  const factor = await tx.query(`SELECT 1 FROM public.owner_session_security WHERE user_id=$1 AND session_id=$2
    AND mfa_method='totp' AND mfa_verified_at<=clock_timestamp() AND mfa_verified_at>clock_timestamp()-interval '15 minutes'`,[userId,sessionId]);
  if (!factor.rowCount) throw new Error('MFA_REQUIRED');
}

import type pg from 'pg';
import type { ProviderSession } from '../../adapters/providers.js';
import { transaction } from '../../db/pool.js';
import { parseSetup, projectDefaults, SetupError } from './policy.js';

// Every public entry receives a freshly resolved server-side session, never caller IDs.
async function checkSession(tx: pg.PoolClient, session: ProviderSession) {
  if (session.assertActive) await session.assertActive(tx);
  if (!session.provider || session.provider.length > 200 || !session.subject || session.subject.length > 200 || !session.sessionId || !Number.isFinite(session.expiresAt?.getTime())) throw new SetupError('AUTH_REQUIRED');
  if (session.emailVerified !== true) throw new SetupError('EMAIL_VERIFICATION_REQUIRED');
  const valid = await tx.query('SELECT clock_timestamp() < $1::timestamptz AS valid',[session.expiresAt]);
  if (!valid.rows[0].valid) throw new SetupError('AUTH_REQUIRED');
}
async function mappedUser(tx: pg.PoolClient, session: ProviderSession, create: boolean) {
  if (create) {
    await tx.query(`INSERT INTO users(auth_provider,auth_subject,email_normalized,display_name) VALUES($1,$2,$3,$4)
      ON CONFLICT(auth_provider,auth_subject) DO NOTHING`,[session.provider,session.subject,session.email.toLowerCase(),session.displayName]);
  }
  const result = await tx.query('SELECT id FROM users WHERE auth_provider=$1 AND auth_subject=$2 FOR UPDATE',[session.provider,session.subject]);
  return result.rows[0]?.id as string | undefined;
}
async function member(tx: pg.PoolClient, userId: string) {
  return (await tx.query(`SELECT s.id,s.name,s.slug,s.status,s.revision,s.provisioned_at FROM studio_members m JOIN studios s ON s.id=m.studio_id
    WHERE m.user_id=$1 AND m.role='owner' FOR UPDATE OF s,m`,[userId])).rows[0];
}
async function provision(tx: pg.PoolClient, session: ProviderSession) {
  await checkSession(tx,session);
  const userId = (await mappedUser(tx,session,true))!;
  let studio = await member(tx,userId);
  if (studio?.status === 'suspended') throw new SetupError('FORBIDDEN');
  if (!studio) {
    studio = (await tx.query('INSERT INTO studios(provisioned_at) VALUES(clock_timestamp()) RETURNING id,name,slug,status,revision,provisioned_at')).rows[0];
    await tx.query('INSERT INTO studio_members(studio_id,user_id) VALUES($1,$2)',[studio.id,userId]);
  }
  await tx.query(`INSERT INTO studio_settings(studio_id,locale,timezone,defaults_schema_version,project_defaults)
    VALUES($1,'id','Asia/Makassar',1,$2) ON CONFLICT(studio_id) DO NOTHING`,[studio.id,JSON.stringify(projectDefaults)]);
  // Repairs use the ORIGINAL provision instant, including after trial expiry.
  await tx.query(`INSERT INTO entitlement_grants(studio_id,source,starts_at,ends_at,project_limit,source_ref)
    SELECT id,'trial',provisioned_at,provisioned_at+interval '168 hours',3,'initial-trial' FROM studios WHERE id=$1
    ON CONFLICT(studio_id) WHERE source='trial' DO NOTHING`,[studio.id]);
  return {userId,studio};
}
async function snapshot(tx: pg.PoolClient, userId: string | undefined) {
  if (!userId) return {user:null,studio:null,setup_status:'setup_required',entitlement:null,settings:null};
  const studio = await member(tx,userId);
  const user = {id:userId};
  if (!studio) return {user,studio:null,setup_status:'incomplete',entitlement:null,settings:null};
  if (studio.status === 'suspended') return {user,studio:{id:studio.id,status:'suspended'},setup_status:'suspended',entitlement:null,settings:null};
  const settings = (await tx.query('SELECT locale,timezone,revision,defaults_schema_version FROM studio_settings WHERE studio_id=$1',[studio.id])).rows[0];
  const trial = (await tx.query(`SELECT id FROM entitlement_grants WHERE studio_id=$1 AND source='trial'`,[studio.id])).rowCount;
  const grant = (await tx.query(`SELECT max(project_limit)::int AS project_limit,max(ends_at) AS ends_at FROM entitlement_grants
    WHERE studio_id=$1 AND revoked_at IS NULL AND starts_at<=clock_timestamp() AND ends_at>clock_timestamp()`,[studio.id])).rows[0];
  return {user,studio:{id:studio.id,name:studio.name,slug:studio.slug,status:studio.status,revision:studio.revision},
    setup_status:!settings || !trial ? 'incomplete' : studio.status === 'active' ? 'ready' : 'setup_required',
    settings:settings ?? null,entitlement:{status:grant.project_limit ? 'active' : 'expired',project_limit:grant.project_limit ?? 0,ends_at:grant.ends_at ?? null}};
}
export async function getMe(pool: pg.Pool, session: ProviderSession) {
  return transaction(pool,async tx => {
    await checkSession(tx,session);
    const result = await snapshot(tx,await mappedUser(tx,session,false));
    await checkSession(tx,session);
    return result;
  });
}
// Provider callback integration seam, also usable to repair missing settings.
export async function provisionOwner(pool: pg.Pool, session: ProviderSession) {
  return transaction(pool,async tx => {
    const {userId} = await provision(tx,session);
    const result = await snapshot(tx,userId);
    await checkSession(tx,session);
    return result;
  });
}
export async function completeSetup(pool: pg.Pool, session: ProviderSession, body: unknown, requestId: string) {
  const input = parseSetup(body);
  try {
    return await transaction(pool,async tx => {
      const {userId,studio} = await provision(tx,session);
      const settings = (await tx.query('SELECT locale,timezone FROM studio_settings WHERE studio_id=$1',[studio.id])).rows[0];
      if (studio.status === 'active') {
        if (studio.name !== input.name || studio.slug !== input.slug || settings.locale !== input.locale || settings.timezone !== input.timezone) throw new SetupError('SETUP_CONFLICT');
        const data = await snapshot(tx,userId);
        await checkSession(tx,session);
        return {created:false,data};
      }
      await tx.query(`UPDATE studios SET name=$2,slug=$3,status='active',revision=revision+1,updated_at=clock_timestamp() WHERE id=$1`,[studio.id,input.name,input.slug]);
      await tx.query(`UPDATE studio_settings SET locale=$2,timezone=$3,revision=revision+1,updated_at=clock_timestamp() WHERE studio_id=$1`,[studio.id,input.locale,input.timezone]);
      await tx.query(`INSERT INTO audit_events(studio_id,actor_kind,actor_id,action,target_type,target_id,after_summary,request_id)
        VALUES($1,'owner',$2,'studio.setup_completed','studio',$1,'{"status":"active"}',$3)`,[studio.id,userId,requestId]);
      const data = await snapshot(tx,userId);
      await checkSession(tx,session);
      return {created:true,data};
    });
  } catch (error) {
    if ((error as {code?:string;constraint?:string}).code === '23505' && (error as {constraint?:string}).constraint === 'studios_slug_key') throw new SetupError('SLUG_TAKEN','slug');
    throw error;
  }
}

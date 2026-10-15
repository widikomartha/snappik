import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { DomainError } from '../tenancy/repositories.js';
export const kinds = ['inventory_scan','thumbnail_generate','project_purge','cache_cleanup','expired_session_cleanup','retention_cleanup'] as const;
export type JobKind = typeof kinds[number];
export type Lease = { id: string; studio_id: string | null; project_id: string | null; kind: JobKind; payload: unknown; attempts: number; lease_token: string; worker_id: string };
export async function enqueue(tx: pg.PoolClient, input: { studioId: string; projectId: string; kind: JobKind }) {
  const dedupe = `${input.studioId}:${input.projectId}`;
  const result = await tx.query(`INSERT INTO jobs(studio_id,project_id,kind,dedupe_key,payload) VALUES($1,$2,$3,$4,'{"version":1}')
    ON CONFLICT(kind,dedupe_key) WHERE state IN ('queued','running') DO UPDATE SET dedupe_key=excluded.dedupe_key
    RETURNING id`, [input.studioId,input.projectId,input.kind,dedupe]);
  return result.rows[0].id as string;
}
export async function claim(pool: pg.Pool, workerId: string, seconds: number): Promise<Lease | null> {
  if (!Number.isInteger(seconds) || seconds < 3 || seconds > 600) throw new DomainError('INVALID_INPUT');
  // A sixth crashed attempt is terminal, never an immortal running job.
  await pool.query(`UPDATE jobs SET state='failed',error_code='RETRY_EXHAUSTED',worker_id=NULL,lease_until=NULL,finished_at=clock_timestamp()
    WHERE state='running' AND lease_until<=clock_timestamp() AND attempts>=6`);
  const result = await pool.query(`WITH candidate AS (
    SELECT id FROM jobs WHERE attempts<6 AND ((state='queued' AND available_at<=clock_timestamp()) OR (state='running' AND lease_until<=clock_timestamp()))
    ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1
  ) UPDATE jobs j SET state='running',attempts=j.attempts+1,worker_id=$1,lease_until=clock_timestamp()+$2*interval '1 second',
    lease_token=j.lease_token+1,error_code=NULL FROM candidate c WHERE j.id=c.id RETURNING j.*`, [workerId,seconds]);
  return result.rows[0] ?? null;
}
export async function renew(pool: pg.Pool, lease: Lease, seconds: number) {
  if (!Number.isInteger(seconds) || seconds < 3 || seconds > 600) throw new DomainError('INVALID_INPUT');
  const result = await pool.query(`UPDATE jobs SET lease_until=clock_timestamp()+$4*interval '1 second'
    WHERE id=$1 AND worker_id=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp()`,[lease.id,lease.worker_id,lease.lease_token,seconds]);
  if (!result.rowCount) throw new DomainError('LEASE_LOST');
}
// Lock business resources first, then fence the lease in the SAME publication transaction.
// No external calls inside this callback. Commit durable effect and completion together.
export async function finish(tx: pg.PoolClient, lease: Lease, publish: () => Promise<void>) {
  const result = await tx.query(`SELECT id FROM jobs WHERE id=$1 AND studio_id IS NOT DISTINCT FROM $4::uuid AND project_id IS NOT DISTINCT FROM $5::uuid
    AND worker_id=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp() FOR UPDATE`,[lease.id,lease.worker_id,lease.lease_token,lease.studio_id,lease.project_id]);
  if (!result.rowCount) throw new DomainError('LEASE_LOST');
  await publish();
  // Recheck deadline after publishing; transaction rollback discards expired worker writes.
  const done = await tx.query(`UPDATE jobs SET state='succeeded',finished_at=clock_timestamp(),worker_id=NULL,lease_until=NULL
    WHERE id=$1 AND lease_until>clock_timestamp()`,[lease.id]);
  if (!done.rowCount) throw new DomainError('LEASE_LOST');
}
export function retryDelay(attempt: number, random = Math.random, retryAfterSeconds = 0) {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 5 || !Number.isFinite(retryAfterSeconds) || retryAfterSeconds < 0 || retryAfterSeconds > 86400) throw new DomainError('INVALID_INPUT');
  const base = [5,30,120,600,1800][attempt-1];
  const jitter = random();
  if (jitter < 0 || jitter >= 1 || !Number.isFinite(jitter)) throw new DomainError('INVALID_INPUT');
  return Math.max(base+base*0.2*jitter,retryAfterSeconds);
}
export async function fail(pool: pg.Pool, lease: Lease, failure: { code: 'PROVIDER_NOT_CONFIGURED' | 'INVALID_JOB' | 'TRANSIENT_PROVIDER' | 'PERMISSION_DENIED'; retryable: boolean; retryAfterSeconds?: number }) {
  const transient = failure.retryable && failure.code === 'TRANSIENT_PROVIDER';
  const retry = transient && lease.attempts < 6;
  const delay = retry ? retryDelay(lease.attempts,Math.random,failure.retryAfterSeconds ?? 0) : 0;
  const result = await pool.query(`UPDATE jobs SET state=$4,error_code=$5,available_at=clock_timestamp()+$6*interval '1 second',
    finished_at=CASE WHEN $4='failed' THEN clock_timestamp() ELSE NULL END,worker_id=NULL,lease_until=NULL
    WHERE id=$1 AND worker_id=$2 AND lease_token=$3 AND state='running' AND lease_until>clock_timestamp()`,
    [lease.id,lease.worker_id,lease.lease_token,retry?'queued':'failed',lease.attempts>=6 && transient?'RETRY_EXHAUSTED':failure.code,delay]);
  if (!result.rowCount) throw new DomainError('LEASE_LOST');
}
export const newWorkerId = () => randomUUID();

import { setTimeout as pause } from 'node:timers/promises';
import type pg from 'pg';
import { ProviderUnavailable } from '../adapters/providers.js';
import { transaction } from '../db/pool.js';
import { claim, fail, finish, renew, type Lease } from '../modules/reliability/jobs.js';
export type Handler = (lease: Lease, signal: AbortSignal) => Promise<(tx: pg.PoolClient) => Promise<void>>;
export const unconfiguredHandler: Handler = async () => { throw new ProviderUnavailable(); };
export function validPayload(lease: Lease) {
  const payload = lease.payload;
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload) &&
    Object.keys(payload).length === 1 && 'version' in payload && payload.version === 1 &&
    lease.studio_id !== null && lease.project_id !== null;
}
export async function processLease(pool: pg.Pool, lease: Lease, seconds: number, handler: Handler, shutdown: AbortSignal) {
  const controller = new AbortController();
  const signal = AbortSignal.any([shutdown,controller.signal]);
  let renewal: Promise<void> | undefined;
  let lost = false;
  const timer = setInterval(() => {
    if (!renewal) renewal = renew(pool,lease,seconds).catch(() => { lost=true; controller.abort(); }).finally(() => { renewal=undefined; });
  }, seconds*1000/3);
  try {
    if (!validPayload(lease)) { await fail(pool,lease,{ code:'INVALID_JOB',retryable:false }); return; }
    const publish = await handler(lease,signal);
    signal.throwIfAborted();
    await transaction(pool,async tx => {
      // Project -> main selection -> job fence: matches future inventory publication order.
      const p = await tx.query('SELECT id FROM projects WHERE studio_id=$1 AND id=$2 FOR UPDATE',[lease.studio_id,lease.project_id]);
      if (!p.rowCount) throw new Error('INVALID_JOB');
      await tx.query('SELECT id FROM selection_sets WHERE studio_id=$1 AND project_id=$2 ORDER BY id FOR UPDATE',[lease.studio_id,lease.project_id]);
      await finish(tx,lease,() => publish(tx));
    });
  } catch (error) {
    if (!lost) {
      try { await fail(pool,lease,{ code:error instanceof ProviderUnavailable?'PROVIDER_NOT_CONFIGURED':'TRANSIENT_PROVIDER',retryable:!(error instanceof ProviderUnavailable) }); }
      catch { console.error(JSON.stringify({ event:'job_lease_lost', job_id:lease.id })); }
    }
  } finally { clearInterval(timer); await renewal; }
}
export async function runWorker(pool: pg.Pool, workerId: string, options: { concurrency:number; leaseSeconds:number }, signal: AbortSignal, handler: Handler = unconfiguredHandler) {
  const lane = async () => {
    while (!signal.aborted) {
      const lease = await claim(pool,workerId,options.leaseSeconds);
      if (lease) await processLease(pool,lease,options.leaseSeconds,handler,signal);
      else { try { await pause(500,undefined,{ signal }); } catch { /* graceful stop */ } }
    }
  };
  await Promise.all(Array.from({length:options.concurrency},lane));
}

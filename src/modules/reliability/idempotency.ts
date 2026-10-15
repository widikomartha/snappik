import { createHash } from 'node:crypto';
import type pg from 'pg';
import { DomainError, type OwnerScope } from '../tenancy/repositories.js';
export type Receipt = { id: string; revision: number; job_id?: string };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function canonicalHash(input: unknown): string {
  let count = 0;
  function canonical(value: unknown, depth: number): unknown {
    if (++count > 5000 || depth > 12) throw new DomainError('INVALID_INPUT');
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(v => canonical(v,depth+1));
    if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => [k,canonical(v,depth+1)]));
    throw new DomainError('INVALID_INPUT');
  }
  const json = JSON.stringify(canonical(input,0));
  if (Buffer.byteLength(json) > 16384) throw new DomainError('INVALID_INPUT');
  return createHash('sha256').update(json).digest('hex');
}
// Caller passes a bounded canonical request digest, never a raw payload or credentials.
// Must run inside withOwnerTransaction: current authorization ALWAYS precedes replay.
export async function idempotent(tx: pg.PoolClient, scope: OwnerScope,
  operation: 'project.create' | 'project.sync' | 'selection.confirm' | 'selection.reopen', key: string, hash: string,
  work: () => Promise<Receipt>, projectId: string | null = null): Promise<Receipt> {
  if (!/^[ -~]{16,128}$/.test(key) || !/^[a-f0-9]{64}$/.test(hash)) throw new DomainError('INVALID_INPUT');
  if ((operation === 'project.create' && projectId !== null) || (operation !== 'project.create' && (!projectId || !uuid.test(projectId)))) throw new DomainError('INVALID_INPUT');
  if (projectId) {
    const project = await tx.query('SELECT id FROM projects WHERE studio_id=$1 AND id=$2',[scope.studioId,projectId]);
    if (!project.rowCount) throw new DomainError('NOT_FOUND');
  }
  const namespace = JSON.stringify([scope.userId,scope.sessionId,scope.studioId,projectId,operation]);
  await tx.query('INSERT INTO idempotency_keys(scope,key,request_hash) VALUES($1,$2,$3) ON CONFLICT(scope,key) DO NOTHING', [namespace,key,hash]);
  const result = await tx.query('SELECT * FROM idempotency_keys WHERE scope=$1 AND key=$2 FOR UPDATE', [namespace,key]);
  const row = result.rows[0];
  const expired = (await tx.query('SELECT expires_at<=clock_timestamp() AS expired FROM idempotency_keys WHERE id=$1',[row.id])).rows[0].expired;
  if (!expired && row.request_hash !== hash) throw new DomainError('IDEMPOTENCY_CONFLICT');
  if (!expired && row.state === 'completed') return row.response_body as Receipt;
  if (expired) await tx.query(`UPDATE idempotency_keys SET request_hash=$2,state='in_progress',response_status=NULL,response_body=NULL,created_at=clock_timestamp(),expires_at=clock_timestamp()+interval '24 hours' WHERE id=$1`,[row.id,hash]);
  const receipt = await work();
  if (!uuid.test(receipt.id) || !Number.isSafeInteger(receipt.revision) || receipt.revision < 0 || (receipt.job_id !== undefined && !uuid.test(receipt.job_id)) || Object.keys(receipt).some(k => !['id','revision','job_id'].includes(k))) throw new DomainError('INVALID_INPUT');
  const status = operation === 'project.create' ? 201 : operation === 'project.sync' ? 202 : 200;
  await tx.query(`UPDATE idempotency_keys SET state='completed',response_status=$3,response_body=$2 WHERE id=$1`,[row.id,JSON.stringify(receipt),status]);
  return receipt;
}

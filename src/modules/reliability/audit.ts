import type pg from 'pg';
import type { OwnerScope } from '../tenancy/repositories.js';
export async function appendAudit(tx: pg.PoolClient, scope: OwnerScope,
  event: { action: 'project.created' | 'project.sync_requested' | 'selection.confirmed' | 'selection.reopened'; projectId: string; requestId: string; revision: number }) {
  // Deliberate allowlist: notes, contact details, source URLs, tokens and raw requests are never summaries.
  await tx.query(`INSERT INTO audit_events(studio_id,project_id,actor_kind,actor_id,action,target_type,target_id,after_summary,request_id)
    VALUES($1,$2,'owner',$3,$4,'project',$2,$5,$6)`, [scope.studioId,event.projectId,scope.userId,event.action,JSON.stringify({ revision: event.revision }),event.requestId]);
}

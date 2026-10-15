import type pg from 'pg';
import { transaction } from '../../db/pool.js';
import type { VerifiedOwner } from '../../adapters/providers.js';
export class DomainError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'IDEMPOTENCY_CONFLICT' | 'INVALID_INPUT' | 'LEASE_LOST') { super(code); }
}
export type OwnerScope = Readonly<{ userId: string; sessionId: string; studioId: string }>;
// Only server-side verified adapters may supply principal. Never accept a browser user/studio ID here.
export async function withOwnerTransaction<T>(pool: pg.Pool, principal: VerifiedOwner, work: (tx: pg.PoolClient, scope: OwnerScope) => Promise<T>) {
  return transaction(pool, async tx => {
    // Shared global order: user -> studio -> project -> selection set.
    const user = await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [principal.userId]);
    if (!user.rowCount) throw new DomainError('NOT_FOUND');
    const member = await tx.query(`SELECT s.id,s.status FROM studios s JOIN studio_members m ON m.studio_id=s.id
      WHERE m.user_id=$1 AND m.role='owner' FOR UPDATE OF s,m`, [principal.userId]);
    if (!member.rowCount) throw new DomainError('NOT_FOUND');
    if (member.rows[0].status === 'suspended') throw new DomainError('FORBIDDEN');
    return work(tx, Object.freeze({ userId: principal.userId, sessionId: principal.sessionId, studioId: member.rows[0].id }));
  });
}
export class OwnerRepository {
  constructor(private readonly tx: pg.PoolClient, private readonly scope: OwnerScope) {}
  async project(id: string) {
    const result = await this.tx.query(`SELECT id,revision,inventory_status,archived_at FROM projects WHERE studio_id=$1 AND id=$2`, [this.scope.studioId,id]);
    if (!result.rowCount) throw new DomainError('NOT_FOUND');
    return result.rows[0] as { id: string; revision: number; inventory_status: string; archived_at: Date | null };
  }
  async job(id: string) {
    const result = await this.tx.query(`SELECT id,project_id,kind,state,attempts,error_code FROM jobs WHERE studio_id=$1 AND id=$2`, [this.scope.studioId,id]);
    if (!result.rowCount) throw new DomainError('NOT_FOUND');
    return result.rows[0];
  }
  async photos(projectId: string, afterId: string | null = null, limit = 50) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new DomainError('INVALID_INPUT');
    await this.project(projectId);
    const result = await this.tx.query(`SELECT id,filename,folder_path,available FROM project_photos
      WHERE studio_id=$1 AND project_id=$2 AND ($3::uuid IS NULL OR id>$3) ORDER BY id LIMIT $4`, [this.scope.studioId,projectId,afterId,limit]);
    return result.rows;
  }
  async lockProjectAndSelection(projectId: string, setId: string) {
    const project = await this.tx.query('SELECT id,revision FROM projects WHERE studio_id=$1 AND id=$2 FOR UPDATE', [this.scope.studioId,projectId]);
    if (!project.rowCount) throw new DomainError('NOT_FOUND');
    const set = await this.tx.query('SELECT id,revision,status FROM selection_sets WHERE studio_id=$1 AND project_id=$2 AND id=$3 FOR UPDATE', [this.scope.studioId,projectId,setId]);
    if (!set.rowCount) throw new DomainError('NOT_FOUND');
    return { project: project.rows[0], selection: set.rows[0] };
  }
}

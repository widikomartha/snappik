import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type pg from 'pg';
export const SCHEMA_VERSION = '002_lease_fencing.sql';
export type Migration = { name: string; sql: string };
export async function loadMigrations(): Promise<Migration[]> {
  const dir = path.resolve('src/db/migrations');
  return Promise.all((await readdir(dir)).filter(n => /^\d{3}_[a-z_]+\.sql$/.test(n)).sort().map(async name => ({ name, sql: await readFile(path.join(dir,name),'utf8') })));
}
export async function migrate(pool: pg.Pool, supplied?: Migration[]) {
  const migrations = supplied ?? await loadMigrations();
  const tx = await pool.connect();
  try {
    await tx.query("SET search_path TO public; SET lock_timeout TO '15s'; SET statement_timeout TO '60s'");
    await tx.query('SELECT pg_advisory_lock(734002)');
    await tx.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = await tx.query<{name:string; checksum:string}>('SELECT name,checksum FROM schema_migrations ORDER BY name');
    if (applied.rows.some((row,i) => migrations[i]?.name !== row.name)) throw new Error('SCHEMA_HISTORY_MISMATCH');
    for (const migration of migrations) {
      // Git checkouts on Windows must not make an unchanged migration drift.
      const checksum = createHash('sha256').update(migration.sql.replace(/\r\n/g,'\n')).digest('hex');
      const old = applied.rows.find(row => row.name === migration.name);
      if (old) { if (old.checksum !== checksum) throw new Error('MIGRATION_CHECKSUM_MISMATCH'); continue; }
      try {
        await tx.query('BEGIN');
        await tx.query(migration.sql);
        await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)', [migration.name,checksum]);
        await tx.query('COMMIT');
      } catch (error) { await tx.query('ROLLBACK'); throw error; }
    }
  } finally {
    try { await tx.query('SELECT pg_advisory_unlock(734002)'); }
    finally { tx.release(); }
  }
}
export async function assertSchema(db: pg.Pool | pg.PoolClient) {
  const result = await db.query(`SELECT c.minimum_runtime FROM schema_compatibility c
    WHERE c.singleton AND EXISTS(SELECT 1 FROM schema_migrations WHERE name=$1)`,[SCHEMA_VERSION]);
  if (!result.rowCount || result.rows[0].minimum_runtime > 2) throw new Error('SCHEMA_VERSION_MISMATCH');
}

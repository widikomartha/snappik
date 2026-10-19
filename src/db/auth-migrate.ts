import { createHash } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';
import path from 'node:path';
import type pg from 'pg';
import type { Migration } from './migrate.js';
export async function loadAuthMigrations():Promise<Migration[]> {
  const directory=path.resolve('src/db/auth-migrations');
  return Promise.all((await readdir(directory)).filter(n=>/^\d{3}_[a-z_]+\.sql$/.test(n)).sort()
    .map(async name=>({name,sql:await readFile(path.join(directory,name),'utf8')})));
}
export async function migrateAuth(pool:pg.Pool,supplied?:Migration[]) {
  const migrations=supplied??await loadAuthMigrations();
  const tx=await pool.connect();
  try {
    await tx.query("SET lock_timeout='5s'; SET statement_timeout='30s'");
    await tx.query('SELECT pg_advisory_lock(734003)');
    await tx.query(`CREATE SCHEMA IF NOT EXISTS snappik_auth; REVOKE ALL ON SCHEMA snappik_auth FROM PUBLIC;
      CREATE TABLE IF NOT EXISTS snappik_auth.schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`);
    const applied=(await tx.query('SELECT name,checksum FROM snappik_auth.schema_migrations ORDER BY name')).rows;
    if(applied.some((row,i)=>row.name!==migrations[i]?.name))throw new Error('AUTH_SCHEMA_HISTORY_MISMATCH');
    for(const migration of migrations) {
      const checksum=createHash('sha256').update(migration.sql.replace(/\r\n/g,'\n')).digest('hex');
      const old=applied.find(row=>row.name===migration.name);
      if(old){if(old.checksum!==checksum)throw new Error('AUTH_SCHEMA_CHECKSUM_MISMATCH');continue;}
      try {
        await tx.query('BEGIN');await tx.query(migration.sql);
        await tx.query('INSERT INTO snappik_auth.schema_migrations(name,checksum) VALUES($1,$2)',[migration.name,checksum]);
        await tx.query('COMMIT');
      }catch(error){await tx.query('ROLLBACK');throw error;}
    }
  } finally {try{await tx.query('SELECT pg_advisory_unlock(734003)');}finally{tx.release();}}
}
export async function assertAuthSchema(pool:pg.Pool) {
  const result=await pool.query(`SELECT EXISTS(SELECT 1 FROM snappik_auth.schema_migrations WHERE name='006_totp_challenge_security.sql')
    AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='snappik_auth.account'::regclass AND conname='account_provider_subject_key') AS ready`);
  if(!result.rows[0].ready)throw new Error('AUTH_SCHEMA_NOT_READY');
}

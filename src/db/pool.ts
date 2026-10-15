import pg from 'pg';
import { readConfig } from '../config.js';
let pool: pg.Pool | undefined;
export function getPool() {
  if (!pool) {
    const config = readConfig();
    pool = new pg.Pool({ connectionString: config.databaseUrl, max: config.poolMax, connectionTimeoutMillis: 5000, statement_timeout: 10000, idle_in_transaction_session_timeout: 15000 });
    pool.on('error', () => console.error(JSON.stringify({ event: 'database_pool_error' })));
  }
  return pool;
}
export async function transaction<T>(pool: pg.Pool, work: (tx: pg.PoolClient) => Promise<T>): Promise<T> {
  const tx = await pool.connect();
  try { await tx.query('BEGIN'); const result = await work(tx); await tx.query('COMMIT'); return result; }
  catch (error) { await tx.query('ROLLBACK'); throw error; }
  finally { tx.release(); }
}

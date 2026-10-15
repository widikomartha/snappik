import pg from 'pg';
import { migrate } from './migrate.js';
if (!process.env.MIGRATION_DATABASE_URL) throw new Error('CONFIG_MIGRATION_DATABASE_URL_REQUIRED');
const pool = new pg.Pool({ connectionString: process.env.MIGRATION_DATABASE_URL, connectionTimeoutMillis: 5000 });
try { await migrate(pool); console.log('Migrations applied'); }
catch { console.error('MIGRATION_FAILED'); process.exitCode = 1; }
finally { await pool.end(); }

// Test child only. Secrets/cookies travel over IPC, never command arguments or logs.
import pg from 'pg';
import { createSpike } from './harness.mjs';
process.once('message', async (input: { connectionString: string; secret: string; cookie: string }) => {
  const pool = new pg.Pool({ connectionString: input.connectionString, max: 2,
    connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  try {
    const spike = createSpike({ database: pool, secret: input.secret });
    process.send?.({ active: Boolean(await spike.session(input.cookie)) });
  } catch { process.send?.({ error: 'OBSERVER_FAILED' }); }
  finally { await pool.end(); process.disconnect(); }
});

import { readConfig } from '../config.js';
import { getPool } from '../db/pool.js';
import { assertSchema } from '../db/migrate.js';
import { newWorkerId } from '../modules/reliability/jobs.js';
import { runWorker } from './runner.js';
const stop = new AbortController();
process.once('SIGINT',() => stop.abort());
process.once('SIGTERM',() => stop.abort());
let heartbeat: ReturnType<typeof setInterval> | undefined;
let pool: ReturnType<typeof getPool> | undefined;
try {
  const config = readConfig();
  pool = getPool();
  await assertSchema(pool);
  heartbeat=setInterval(() => console.log(JSON.stringify({ event:'worker_heartbeat',at:new Date().toISOString() })),30000);
  console.log(JSON.stringify({ event:'worker_started',provider_mode:'unconfigured' }));
  await runWorker(pool,newWorkerId(),{ concurrency:config.concurrency,leaseSeconds:config.leaseSeconds },stop.signal);
} catch { stop.abort(); console.error(JSON.stringify({ event:'worker_failed' })); process.exitCode=1; }
finally { if (heartbeat) clearInterval(heartbeat); await pool?.end(); }

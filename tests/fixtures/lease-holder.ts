// Separate expendable process for a genuine crash/lease-expiry test. Synthetic DB only.
import pg from 'pg';
import { claim,newWorkerId } from '../../src/modules/reliability/jobs.js';
if (!process.env.SNAPPY_TEST_DATABASE_URL) throw new Error('TEST_DB_REQUIRED');
const pool=new pg.Pool({connectionString:process.env.SNAPPY_TEST_DATABASE_URL,connectionTimeoutMillis:5000});
try {
  const lease=await claim(pool,newWorkerId(),3);
  if (!lease) throw new Error('TEST_JOB_REQUIRED');
  console.log(JSON.stringify({claimed:lease.id}));
  await new Promise(()=>{});
} finally { await pool.end(); }

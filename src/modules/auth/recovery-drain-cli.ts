import pg from 'pg';
import {readConfig} from '../../config.js';
import {assertAuthSchema} from '../../db/auth-migrate.js';
import {deliverRecovery} from './recovery.js';
let pool:pg.Pool|undefined;
try {
  const config=readConfig();
  if(config.authMode!=='better-auth-local'||!config.recoveryKey)throw new Error('RECOVERY_NOT_CONFIGURED');
  pool=new pg.Pool({connectionString:config.databaseUrl,max:2,connectionTimeoutMillis:5000,statement_timeout:10000});
  pool.on('error',()=>{});await assertAuthSchema(pool);
  // One bounded batch; discards synthetic messages. Never sends email or prints links.
  const outcomes:Record<string,number>={};
  for(let i=0;i<10;i++) {
    const result=await deliverRecovery(pool,Buffer.from(config.recoveryKey,'base64url'),config.origin,async()=>{});
    outcomes[result]=(outcomes[result]??0)+1;if(result==='idle')break;
  }
  // Retention maintenance, not user/account deletion. Leave recent consumed hashes for diagnostics.
  await pool.query("DELETE FROM snappik_auth.password_recovery WHERE expires_at<clock_timestamp()-interval '1 day'");
  await pool.query("DELETE FROM snappik_auth.recovery_requests WHERE created_at<clock_timestamp()-interval '1 day'");
  const states=(await pool.query(`SELECT state,error_code,count(*)::int AS count,
    floor(extract(epoch FROM clock_timestamp()-min(created_at)))::int AS oldest_seconds
    FROM snappik_auth.recovery_outbox GROUP BY state,error_code ORDER BY state,error_code`)).rows;
  console.log(JSON.stringify({event:'recovery_synthetic_batch',outcomes,states}));
}catch{console.error(JSON.stringify({event:'recovery_batch_failed'}));process.exitCode=1;}
finally{await pool?.end();}

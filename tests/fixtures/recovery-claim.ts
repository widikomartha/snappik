import pg from 'pg';
import {claimRecovery} from '../../src/modules/auth/recovery.js';
// Separate worker crashes/exits after durable claim, before delivery/ack. Synthetic DB only.
process.once('message',async(connectionString:string)=>{
  const pool=new pg.Pool({connectionString,max:1});
  try {const claim=await claimRecovery(pool);process.send?.(claim);}
  finally{await pool.end();process.disconnect();}
});

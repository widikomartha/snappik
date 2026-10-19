import type pg from 'pg';
import {transaction} from '../../db/pool.js';

// Bounded local MVP admission: one in-flight credential operation per instance.
// PostgreSQL serializes it across processes too. Session reads retain their user lock.
// No external provider/delivery call may run inside this gate. Pool must have >=2 slots:
// the native session hook needs a separate app connection while the gate is held.
export function credentialGate(pool:pg.Pool) {
  let busy=false;
  return async <T>(work:(tx:pg.PoolClient)=>Promise<T>):Promise<T>=>{
    if(busy)throw new Error('AUTH_BUSY');
    busy=true;
    try {return await transaction(pool,async tx=>{
      await tx.query("SET LOCAL lock_timeout='5s'");
      await tx.query('SELECT pg_advisory_xact_lock(734004)');
      return work(tx);
    });}finally{busy=false;}
  };
}

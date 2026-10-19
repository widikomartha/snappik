import pg from 'pg';
import {createAdmission,AdmissionDenied} from '../../src/modules/auth/admission.js';
import type {AdmissionPolicy} from '../../src/modules/auth/admission-policy.js';
process.once('message',async(input:{connectionString:string;secret:string;policy:AdmissionPolicy;attempts:number})=>{
  const pool=new pg.Pool({connectionString:input.connectionString,max:2});
  try {
    const limiter=createAdmission(pool,input.secret,'synthetic-local',input.policy);
    const allowed=await Promise.all(Array.from({length:input.attempts},async()=>{
      try{await limiter.global('reset');return true;}catch(error){if(error instanceof AdmissionDenied)return false;throw error;}
    }));process.send?.({allowed});
  }catch{process.send?.({error:'SYNTHETIC_ADMISSION_FAILED'});}
  finally{await pool.end();process.disconnect();}
});

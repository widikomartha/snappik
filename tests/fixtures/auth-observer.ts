import {testAuthentication} from './auth-library.js';
process.once('message',async(input:{connectionString:string;secret:string;cookie:string})=>{
  const test=testAuthentication(input.connectionString,undefined,input.secret);
  try{process.send?.({active:!!await test.auth.resolveSession(new Request(test.origin,{headers:{cookie:input.cookie}}))});}
  catch{process.send?.({error:'LOOKUP_FAILED'});}
  finally{await test.close();process.disconnect();}
});

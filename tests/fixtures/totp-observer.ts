import {testAuthentication} from './auth-library.js';
process.once('message',async(input:{connectionString:string;secret:string;action:'verify'|'logout'|'resolve';cookie:string;code:string})=>{
  const test=testAuthentication(input.connectionString,undefined,input.secret);
  try{
    if(input.action==='resolve'){process.send?.({status:200,cookie:'',active:!!await test.auth.resolveSession(new Request(test.origin,{headers:{cookie:input.cookie}}))});return;}
    const response=await test.auth.handle(test.request(input.action==='verify'?'/two-factor/verify-totp':'/sign-out',input.action==='verify'?{code:input.code}:{},input.cookie));
    const cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
    process.send?.({status:response.status,cookie,active:response.ok&&input.action==='verify'?!!await test.auth.resolveSession(new Request(test.origin,{headers:{cookie}})):false});
  }catch{process.send?.({error:'TOTP_OBSERVER_FAILED'});}
  finally{await test.close();process.disconnect();}
});

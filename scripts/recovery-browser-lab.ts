// Isolated real Next/PostgreSQL lab. Separate loopback fixture panel, never a product route.
// Synthetic links/cookies/keys remain in memory; stdout contains only origin/panel metadata.
import {spawn,type ChildProcess} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import {setTimeout as pause} from 'node:timers/promises';
import pg from 'pg';
import {isolatedPostgres} from './test-postgres.js';
import {migrate} from '../src/db/migrate.js';
import {migrateAuth} from '../src/db/auth-migrate.js';
import {deliverRecovery,recoveryHash} from '../src/modules/auth/recovery.js';
import {testAuthentication,testPassword} from '../tests/fixtures/auth-library.js';

const db=await isolatedPostgres(),pool=new pg.Pool({connectionString:db.connectionString,max:5});
const secret=randomBytes(48).toString('base64url'),key=randomBytes(32);
const controlPath=`/${randomUUID()}`;
const resetPassword='Synthetic-browser-reset!Password-9284';
let web:ChildProcess|undefined,fixture:ReturnType<typeof testAuthentication>|undefined;
let logText='',currentEmail='',counter=0,stopping=false;
const messages:{id:string;email:string;url:string;code:string}[]=[],sessions=new Map<string,string[]>();
type Fault='drop-after'|'html'|'hold-before'|'hold-after';
let fault:{path:string;mode:Fault}|undefined,release:(()=>void)|undefined;
const observations:{path:string;method:string;status:number;body?:string;referrer:boolean}[]=[];
let leaks=0;
const tokens=()=>messages.map(m=>m.code);
const sensitive=(value:string)=>tokens().some(token=>value.includes(token))||value.includes('#token=');
const proxy=http.createServer(async(request,response)=>{
  const pathname=new URL(request.url??'/','http://localhost').pathname;
  if(sensitive(request.url??'')||sensitive(String(request.headers.referer??'')))leaks++;
  const selected=fault?.path===pathname?fault:undefined;if(selected)fault=undefined;
  const wait=()=>new Promise<void>(resolve=>{release=()=>{release=undefined;resolve();};});
  try {
    if(selected?.mode==='hold-before')await wait();
    if(selected?.mode==='html') {response.writeHead(200,{'Content-Type':'text/html'});response.end('<p>Synthetic gateway page</p>');return;}
    const upstream=http.request({hostname:'127.0.0.1',port:upstreamPort,path:request.url,method:request.method,headers:request.headers},async remote=>{
      const chunks:Buffer[]=[];
      for await(const chunk of remote)chunks.push(Buffer.from(chunk));
      const body=Buffer.concat(chunks);
      if(pathname.startsWith('/api/auth/'))observations.push({path:pathname,method:request.method??'GET',status:remote.statusCode??0,
        body:pathname==='/api/auth/request-password-reset'?body.toString('utf8'):undefined,referrer:Boolean(request.headers.referer)});
      if(selected?.mode==='hold-after')await wait();
      if(selected?.mode==='drop-after'){response.destroy();return;}
      if(response.destroyed)return;
      response.writeHead(remote.statusCode??502,{...remote.headers,'cache-control':'no-store'});response.end(body);
    });
    upstream.on('error',()=>{if(!response.headersSent)response.writeHead(503);response.end();});
    request.pipe(upstream);
  }catch{if(!response.destroyed){response.writeHead(503);response.end();}}
});
function listen(server:net.Server){return new Promise<number>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve((server.address() as net.AddressInfo).port));});}
const upstreamSocket=net.createServer(),upstreamPort=await listen(upstreamSocket);
await new Promise<void>(resolve=>upstreamSocket.close(()=>resolve()));
const publicPort=await listen(proxy),origin=`http://127.0.0.1:${publicPort}`;
const post=(path:string,body:unknown,cookie='')=>fetch(`${origin}/api/auth${path}`,{method:'POST',headers:{origin,'content-type':'application/json',cookie},body:JSON.stringify(body)});
async function stop(child:ChildProcess){if(child.exitCode===null&&child.signalCode===null){child.kill();await new Promise<void>(resolve=>child.once('exit',()=>resolve()));}}
let lastResult:unknown={},deliveredUrl='',deliveredCode='';
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const controls=['seed','link','expire-token','expire-sessions','fail-reset','clear-failure','release','verify','audit','stop'];
const control=http.createServer(async(request,response)=>{
  response.setHeader('Cache-Control','no-store');response.setHeader('Referrer-Policy','no-referrer');
  const nonce=randomBytes(18).toString('base64');
  response.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'`);
  if(request.url!==controlPath){response.writeHead(404);response.end();return;}
  if(request.method==='POST') {
    if(request.headers.origin!==controlOrigin){response.writeHead(403);response.end();return;}
    let body='';for await(const chunk of request){body+=chunk.toString();if(body.length>4096){response.writeHead(413);response.end();return;}}
    const values=Object.fromEntries(new URLSearchParams(body));values.action=values.operation??values.action;
    try {
      const result=await command(values as {action:string});
      if(values.action==='link'){deliveredUrl=String((result as {url?:string}).url??'');deliveredCode=String((result as {code?:string}).code??'');lastResult={link_available:Boolean(deliveredUrl)};}
      else{lastResult=result;if(values.action==='seed'){deliveredUrl='';deliveredCode='';}}
    }catch{lastResult={error:'LAB_COMMAND_FAILED'};}
    response.writeHead(303,{Location:controlPath});response.end();return;
  }
  if(request.method!=='GET'){response.writeHead(405);response.end();return;}
  const commands:Record<string,string>[]=[];
  const form=(caption:string,fields:Record<string,string>)=>{commands.push(fields);return `<p><button type="button" data-lab>${caption}</button></p>`;};
  response.setHeader('Content-Type','text/html; charset=utf-8');
  response.end(`<!doctype html><html lang="en"><title>Synthetic recovery lab</title><main><h1>Synthetic recovery lab</h1>
    <p>Isolated loopback fixtures only. No external mail. No product test endpoints.</p><p id="account">${escape(currentEmail)}</p>
    ${controls.map(action=>form(action,{action})).join('')}
    ${(['drop-after','html','hold-before','hold-after'] as Fault[]).flatMap(mode=>['reset-password','request-password-reset'].map(path=>form(`${mode} ${path}`,{action:'fault',mode,path:`/api/auth/${path}`}))).join('')}
    <pre id="result">${escape(JSON.stringify(lastResult))}</pre>
    ${deliveredUrl?`<a id="delivery" href="${escape(deliveredUrl)}">Open synthetic recovery link</a><p>Synthetic recovery code: <code id="delivery-code">${escape(deliveredCode)}</code></p>`:''}
    <p><a href="${origin}/recover">Application recovery</a></p></main>
    <script nonce="${nonce}">const commands=${JSON.stringify(commands)};document.querySelectorAll('[data-lab]').forEach((button,i)=>button.addEventListener('click',async()=>{
      button.disabled=true;await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(commands[i])});location.reload();
    }));</script></html>`);
});
const controlPort=await listen(control),controlOrigin=`http://127.0.0.1:${controlPort}`;
async function command(input:{action:string;email?:string;mode?:Fault;path?:string}) {
  if(input.action==='info')return {origin,email:currentEmail,password:testPassword,resetPassword};
  if(input.action==='seed') {
    currentEmail=`browser-${++counter}@example.test`;await fixture!.register(currentEmail);
    const cookies:string[]=[];
    // Native signed fixture sessions use the same DB/key/guard; browser login is
    // tested separately. Do not consume/disable the production process's IP budget.
    for(let i=0;i<2;i++)cookies.push((await fixture!.login(currentEmail)).cookie);
    sessions.set(currentEmail,cookies);return {email:currentEmail,password:testPassword,resetPassword};
  }
  if(input.action==='link') {
    for(let i=0;i<10;i++)if(await deliverRecovery(pool,key,origin,async m=>{messages.push(m);})==='idle')break;
    const message=messages.findLast(m=>m.email===(input.email??currentEmail));
    return {url:message?.url??null,code:message?.code??null};
  }
  if(input.action==='expire-token') {
    const message=messages.findLast(m=>m.email===currentEmail);if(!message)throw new Error('NO_LINK');
    const token=message.code;
    await pool.query("UPDATE snappik_auth.password_recovery SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1",[recoveryHash(token)]);
    return {ok:true};
  }
  if(input.action==='expire-sessions') {
    await pool.query(`UPDATE snappik_auth.session SET "expiresAt"=clock_timestamp()-interval '1 second'
      WHERE "userId" IN(SELECT id FROM snappik_auth."user" WHERE email=$1)`,[currentEmail]);return {ok:true};
  }
  if(input.action==='fail-reset') {
    await pool.query(`CREATE OR REPLACE FUNCTION public.browser_reset_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_BROWSER_RESET'; END $$;
      CREATE TRIGGER browser_reset_failure BEFORE UPDATE ON public.owner_session_security FOR EACH ROW EXECUTE FUNCTION public.browser_reset_failure()`);return {ok:true};
  }
  if(input.action==='clear-failure'){await pool.query('DROP TRIGGER IF EXISTS browser_reset_failure ON public.owner_session_security; DROP FUNCTION IF EXISTS public.browser_reset_failure()');return {ok:true};}
  if(input.action==='fault') {
    if(!['drop-after','html','hold-before','hold-after'].includes(input.mode??'')||!['/api/auth/request-password-reset','/api/auth/reset-password'].includes(input.path??''))throw new Error('INVALID_FAULT');
    fault={path:input.path!,mode:input.mode!};return {ok:true};
  }
  if(input.action==='release'){release?.();return {ok:true};}
  if(input.action==='verify') {
    const statuses=[];
    for(const cookie of sessions.get(currentEmail)??[])statuses.push((await fetch(`${origin}/api/v1/me`,{headers:{cookie}})).status);
    const old=await fixture!.auth.handle(fixture!.request('/sign-in/email',{email:currentEmail,password:testPassword}));
    const fresh=await fixture!.auth.handle(fixture!.request('/sign-in/email',{email:currentEmail,password:resetPassword}));
    const version=(await pool.query('SELECT security_version FROM public.users WHERE auth_subject IN(SELECT id::text FROM snappik_auth."user" WHERE email=$1)',[currentEmail])).rows[0]?.security_version;
    return {old_password:old.status,new_password:fresh.status,old_sessions:statuses,version};
  }
  if(input.action==='audit')return {token_in_server_logs:tokens().some(t=>logText.includes(t)),token_network_leaks:leaks,
    requests:observations,requests_count:(await pool.query('SELECT count(*)::int n FROM snappik_auth.recovery_requests')).rows[0].n,
    consumed:(await pool.query('SELECT count(*)::int n FROM snappik_auth.password_recovery WHERE consumed_at IS NOT NULL')).rows[0].n};
  if(input.action==='stop'){setTimeout(()=>{void cleanup();},100);return {ok:true};}
  throw new Error('UNKNOWN_COMMAND');
}
async function cleanup(){
  if(stopping)return;stopping=true;release?.();
  if(web)await stop(web);control.closeAllConnections();control.close();proxy.closeAllConnections();proxy.close();
  await fixture?.close();await pool.end();await db.server.stop();clearTimeout(deadline);
}
const deadline=setTimeout(()=>{void cleanup();},30*60*1000);
process.once('SIGINT',()=>{void cleanup();});process.once('SIGTERM',()=>{void cleanup();});
try {
  await migrate(pool);await migrateAuth(pool);
  fixture=testAuthentication(db.connectionString,origin,secret,[],key);
  web=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(upstreamPort)],{
    windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_ORIGIN:origin,DATABASE_URL:db.connectionString,
      AUTH_MODE:'better-auth-local',AUTH_INSTANCE_ID:'synthetic-local',BETTER_AUTH_SECRET:secret,BETTER_AUTH_URL:origin,
      AUTH_RECOVERY_KEY:key.toString('base64url'),NEXT_TELEMETRY_DISABLED:'1'}});
  const capture=(chunk:Buffer)=>{logText=(logText+chunk.toString('utf8')).slice(-65536);};web.stdout!.on('data',capture);web.stderr!.on('data',capture);
  for(let i=0;i<150;i++){try{if((await fetch(`${origin}/health/ready`)).ok)break;}catch{/* Starting. */}await pause(100);}
  if(!(await fetch(`${origin}/health/ready`)).ok)throw new Error('LAB_NOT_READY');
  console.log(JSON.stringify({event:'recovery_browser_lab_ready',origin,control:`${controlOrigin}${controlPath}`,started_at:new Date().toISOString()}));
}catch{console.error('RECOVERY_BROWSER_LAB_FAILED');await cleanup();process.exitCode=1;}

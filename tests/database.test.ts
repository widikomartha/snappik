import test,{ before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes,randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import pg from 'pg';
import { isolatedPostgres } from '../scripts/test-postgres.js';
import { migrate,loadMigrations,assertSchema } from '../src/db/migrate.js';
import { transaction } from '../src/db/pool.js';
import type { VerifiedOwner } from '../src/adapters/providers.js';
import { withOwnerTransaction,OwnerRepository } from '../src/modules/tenancy/repositories.js';
import { canonicalHash,idempotent } from '../src/modules/reliability/idempotency.js';
import { appendAudit } from '../src/modules/reliability/audit.js';
import { enqueue,claim,renew,finish,fail,newWorkerId,type Lease } from '../src/modules/reliability/jobs.js';
import { processLease,unconfiguredHandler } from '../src/worker/runner.js';
let instance: Awaited<ReturnType<typeof isolatedPostgres>>;
let pool: pg.Pool;
let ready=false;
before(async () => {
  instance=await isolatedPostgres();
  pool=new pg.Pool({connectionString:instance.connectionString,max:10,connectionTimeoutMillis:5000,statement_timeout:10000});
  console.log('Real database:',(await pool.query('SELECT version()')).rows[0].version);
});
after(async () => { await pool?.end(); await instance?.server.stop(); });
beforeEach(async () => {
  // Only this fresh generated cluster's synthetic queued work, never an external database.
  if (ready) await pool.query(`UPDATE jobs SET state='failed',worker_id=NULL,lease_until=NULL WHERE state IN ('queued','running')`);
});
async function fixture() {
  const userId=randomUUID(),studioId=randomUUID(),projectId=randomUUID();
  await pool.query(`INSERT INTO users(id,auth_provider,auth_subject,email_normalized,display_name) VALUES($1,'synthetic',$2,'fixture@example.invalid','Synthetic')`,[userId,userId]);
  await pool.query(`INSERT INTO studios(id,name,slug,status) VALUES($1,'Synthetic',$2,'active')`,[studioId,`s-${studioId}`]);
  await pool.query('INSERT INTO studio_members(studio_id,user_id) VALUES($1,$2)',[studioId,userId]);
  await insertProject(pool,studioId,projectId);
  const principal={userId,sessionId:randomUUID()} as VerifiedOwner; // Explicit synthetic principal, NEVER a real adapter.
  return {userId,studioId,projectId,principal};
}
async function insertProject(db: pg.Pool | pg.PoolClient,studioId: string,id=randomUUID()) {
  await db.query(`INSERT INTO projects(id,studio_id,public_token,client_label,drive_folder_id,detect_subfolders,notes_enabled,layout)
    VALUES($1,$2,$3,'Synthetic fixture','synthetic-root',true,true,'grid')`,[id,studioId,randomBytes(24).toString('base64url')]);
  return id;
}
async function workflow(studioId:string,projectId:string) {
  return (await pool.query(`INSERT INTO project_workflows(studio_id,project_id,kind,enabled,quota) VALUES($1,$2,'main',true,3) RETURNING id`,[studioId,projectId])).rows[0].id as string;
}
async function photo(studioId:string,projectId:string,providerId=randomUUID()) {
  return (await pool.query(`INSERT INTO project_photos(studio_id,project_id,provider_file_id,filename,folder_path,mime_type,size_bytes,source_version,available,seen_generation)
    VALUES($1,$2,$3,'same.jpg','folder','image/jpeg',100,'v1',true,$4) RETURNING id`,[studioId,projectId,providerId,randomUUID()])).rows[0].id as string;
}
async function queue(f: Awaited<ReturnType<typeof fixture>>) {
  return transaction(pool,tx=>enqueue(tx,{studioId:f.studioId,projectId:f.projectId,kind:'inventory_scan'}));
}
async function expired(lease:Lease) { await pool.query(`UPDATE jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1`,[lease.id]); }
test('empty database migration; additive upgrade preserves rows and old projections; repeated/concurrent migration safe',async () => {
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'`)).rows[0].n,0);
  const migrations=await loadMigrations();
  await migrate(pool,migrations.slice(0,1));
  const f=await fixture();
  const job=await queue(f);
  const legacy=await pool.query('SELECT id,kind,state,attempts FROM jobs WHERE id=$1',[job]);
  await Promise.all([migrate(pool),migrate(pool)]);
  assert.deepEqual((await pool.query('SELECT id,kind,state,attempts FROM jobs WHERE id=$1',[job])).rows,legacy.rows);
  assert.equal((await pool.query('SELECT lease_token FROM jobs WHERE id=$1',[job])).rows[0].lease_token,'0');
  await assertSchema(pool);
  ready=true;
});
test('migration drift is rejected; failed DDL and journal roll back atomically',async () => {
  const migrations=await loadMigrations();
  await migrate(pool,migrations.map(m=>({...m,sql:m.sql.replace(/\r?\n/g,'\r\n')})));
  await assert.rejects(migrate(pool,[{...migrations[0],sql:migrations[0].sql+'\n-- changed'},migrations[1]]),/CHECKSUM/);
  await assert.rejects(migrate(pool,[...migrations,{name:'003_broken.sql',sql:'CREATE TABLE migration_probe(id integer); SELECT missing_column FROM migration_probe;'}]),{code:'42703'});
  assert.equal((await pool.query(`SELECT to_regclass('public.migration_probe') AS t`)).rows[0].t,null);
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM schema_migrations`)).rows[0].n,2);
  await migrate(pool);
});
test('additive future schema remains readable; incompatible runtime floor fails closed',async () => {
  const tx=await pool.connect();
  try {
    await tx.query('BEGIN');
    await tx.query('ALTER TABLE projects ADD COLUMN future_nullable text');
    await tx.query(`INSERT INTO schema_migrations(name,checksum) VALUES('003_synthetic_expand.sql','synthetic')`);
    await assertSchema(tx); // Existing runtime tolerates an explicitly compatible expansion.
    await tx.query('SELECT id,revision FROM projects LIMIT 1');
    await tx.query('UPDATE schema_compatibility SET minimum_runtime=3');
    await assert.rejects(assertSchema(tx),/SCHEMA_VERSION_MISMATCH/);
  } finally { await tx.query('ROLLBACK');tx.release(); }
});
test('non-owner foundation role can read scoped data and run queue, but cannot DDL/self-grant/edit audit or snapshots',async () => {
  await pool.query('CREATE ROLE snappik_foundation_test NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT');
  const sql=(await readFile('src/db/runtime-grants.sql','utf8')).replaceAll(':"runtime_role"','"snappik_foundation_test"');
  await pool.query(sql);
  const tx=await pool.connect();
  try {
    await tx.query('SET ROLE snappik_foundation_test');
    await assertSchema(tx);
    await tx.query('SELECT id FROM projects LIMIT 1');
    await tx.query('SELECT u.id FROM users u FOR UPDATE');
    await tx.query('SELECT s.id FROM studios s JOIN studio_members m ON s.id=m.studio_id FOR UPDATE OF s,m');
    await tx.query('SELECT id FROM projects FOR UPDATE');
    await tx.query('SELECT id FROM selection_sets FOR UPDATE');
    await tx.query('UPDATE jobs SET error_code=error_code WHERE false');
    for (const denied of ['CREATE TABLE forbidden_ddl(id int)','DELETE FROM audit_events','UPDATE studio_members SET user_id=user_id','UPDATE selection_confirmations SET snapshot=snapshot','INSERT INTO platform_roles(user_id,permission) SELECT id,\'diagnostics_read\' FROM users LIMIT 1']) await assert.rejects(tx.query(denied),{code:'42501'});
  } finally { await tx.query('RESET ROLE');tx.release(); }
});
test('tenant-owned repository never returns substituted project, job or photo IDs; suspended member denied',async () => {
  const a=await fixture(),b=await fixture();
  const job=await queue(b);
  await photo(b.studioId,b.projectId);
  await withOwnerTransaction(pool,a.principal,async(tx,scope)=>{
    const repo=new OwnerRepository(tx,scope);
    assert.equal((await repo.project(a.projectId)).id,a.projectId);
    for (const work of [()=>repo.project(b.projectId),()=>repo.photos(b.projectId),()=>repo.job(job)]) await assert.rejects(work(),/NOT_FOUND/);
  });
  await pool.query(`UPDATE studios SET status='suspended' WHERE id=$1`,[a.studioId]);
  await assert.rejects(withOwnerTransaction(pool,a.principal,async()=>true),/FORBIDDEN/);
});
test('composite FK rejects cross-tenant/project workflow, cover, job, audit and selection references',async () => {
  const a=await fixture(),b=await fixture();
  const foreignPhoto=await photo(b.studioId,b.projectId);
  await assert.rejects(pool.query(`INSERT INTO project_workflows(studio_id,project_id,kind,enabled,quota) VALUES($1,$2,'main',true,3)`,[a.studioId,b.projectId]),{code:'23503'});
  await assert.rejects(pool.query('UPDATE projects SET cover_photo_id=$2 WHERE id=$1',[a.projectId,foreignPhoto]),{code:'23503'});
  await assert.rejects(transaction(pool,tx=>enqueue(tx,{studioId:a.studioId,projectId:b.projectId,kind:'inventory_scan'})),{code:'23503'});
  await assert.rejects(pool.query(`INSERT INTO audit_events(studio_id,project_id,actor_kind,action,target_type,target_id,request_id) VALUES($1,$2,'worker','synthetic','project',$2,$3)`,[a.studioId,b.projectId,randomUUID()]),{code:'23503'});
  const w=await workflow(a.studioId,a.projectId);
  const set=(await pool.query(`INSERT INTO selection_sets(studio_id,project_id,workflow_id) VALUES($1,$2,$3) RETURNING id`,[a.studioId,a.projectId,w])).rows[0].id;
  await assert.rejects(pool.query('INSERT INTO selection_items(studio_id,project_id,selection_set_id,photo_id) VALUES($1,$2,$3,$4)',[a.studioId,a.projectId,set,foreignPhoto]),{code:'23503'});
  const download=(await pool.query(`INSERT INTO project_workflows(studio_id,project_id,kind,enabled) VALUES($1,$2,'download',true) RETURNING id`,[a.studioId,a.projectId])).rows[0].id;
  await assert.rejects(pool.query('INSERT INTO selection_sets(studio_id,project_id,workflow_id) VALUES($1,$2,$3)',[a.studioId,a.projectId,download]),{code:'23503'});
});
test('membership/provider/trial/source identities unique; duplicate filenames remain distinct stable IDs',async () => {
  const a=await fixture(),b=await fixture();
  await assert.rejects(pool.query(`INSERT INTO studio_members(studio_id,user_id) VALUES($1,$2)`,[b.studioId,a.userId]),{code:'23505'});
  await assert.rejects(pool.query(`INSERT INTO users(auth_provider,auth_subject,email_normalized,display_name) VALUES('synthetic',$1,'other@example.invalid','Synthetic')`,[a.userId]),{code:'23505'});
  await pool.query(`INSERT INTO entitlement_grants(studio_id,source,source_ref,starts_at,ends_at,project_limit) VALUES($1,'trial','first',now(),now()+interval '7 days',3)`,[a.studioId]);
  await assert.rejects(pool.query(`INSERT INTO entitlement_grants(studio_id,source,source_ref,starts_at,ends_at,project_limit) VALUES($1,'trial','second',now(),now()+interval '7 days',3)`,[a.studioId]),{code:'23505'});
  const source=randomUUID();
  const p1=await photo(a.studioId,a.projectId,source),p2=await photo(a.studioId,a.projectId);
  assert.notEqual(p1,p2);
  await assert.rejects(photo(a.studioId,a.projectId,source),{code:'23505'});
});
test('confirmation snapshot immutable; current pointer cannot cross sets; Unicode note limit enforced',async () => {
  const a=await fixture(),b=await fixture();
  const wa=await workflow(a.studioId,a.projectId),wb=await workflow(b.studioId,b.projectId);
  const sa=(await pool.query('INSERT INTO selection_sets(studio_id,project_id,workflow_id) VALUES($1,$2,$3) RETURNING id',[a.studioId,a.projectId,wa])).rows[0].id;
  const sb=(await pool.query('INSERT INTO selection_sets(studio_id,project_id,workflow_id) VALUES($1,$2,$3) RETURNING id',[b.studioId,b.projectId,wb])).rows[0].id;
  const snapshot=(await pool.query(`INSERT INTO selection_confirmations(studio_id,project_id,selection_set_id,confirmed_revision,actor_kind,actor_reference,snapshot)
    VALUES($1,$2,$3,1,'client','synthetic','[]') RETURNING id`,[a.studioId,a.projectId,sa])).rows[0].id;
  await assert.rejects(pool.query(`UPDATE selection_confirmations SET snapshot='[]' WHERE id=$1`,[snapshot]),{code:'55000'});
  await assert.rejects(pool.query('UPDATE selection_sets SET current_confirmation_id=$2 WHERE id=$1',[sb,snapshot]),{code:'23503'});
  const p=await photo(a.studioId,a.projectId);
  await pool.query('INSERT INTO selection_items(studio_id,project_id,selection_set_id,photo_id,note) VALUES($1,$2,$3,$4,$5)',[a.studioId,a.projectId,sa,p,'📷'.repeat(500)]);
  await assert.rejects(pool.query('UPDATE selection_items SET note=$2 WHERE selection_set_id=$1',[sa,'📷'.repeat(501)]),{code:'23514'});
});
test('response-loss concurrent replay commits one synthetic effect/job/audit; changed hash conflicts; authorization precedes replay',async () => {
  const a=await fixture(),effect=randomUUID(),key=randomUUID(),hash=canonicalHash({synthetic:true});
  const call=()=>withOwnerTransaction(pool,a.principal,(tx,scope)=>idempotent(tx,scope,'project.create',key,hash,async()=>{
    await insertProject(tx,a.studioId,effect); // Synthetic harness, not BL-006 project creation.
    const job=await enqueue(tx,{studioId:a.studioId,projectId:effect,kind:'inventory_scan'});
    await appendAudit(tx,scope,{action:'project.created',projectId:effect,requestId:randomUUID(),revision:1});
    return {id:effect,revision:1,job_id:job};
  }));
  const [r1,r2]=await Promise.all([call(),call()]); assert.deepEqual(r1,r2); assert.deepEqual(await call(),r1);
  for (const table of ['projects','jobs','audit_events']) {
    const column=table==='projects'?'id':'project_id';
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${column}=$1`,[effect])).rows[0].n,1);
  }
  await assert.rejects(withOwnerTransaction(pool,a.principal,(tx,scope)=>idempotent(tx,scope,'project.create',key,canonicalHash({synthetic:false}),async()=>r1)),/IDEMPOTENCY_CONFLICT/);
  await pool.query(`UPDATE studios SET status='suspended' WHERE id=$1`,[a.studioId]);
  await assert.rejects(call(),/FORBIDDEN/);
});
test('failure rolls back business/job/audit/idempotency together; same-key retry can recover',async () => {
  const a=await fixture(),effect=randomUUID(),key=randomUUID();
  const call=(breakCommit:boolean)=>withOwnerTransaction(pool,a.principal,(tx,scope)=>idempotent(tx,scope,'project.create',key,canonicalHash({}),async()=>{
    await insertProject(tx,a.studioId,effect);
    await enqueue(tx,{studioId:a.studioId,projectId:effect,kind:'inventory_scan'});
    await appendAudit(tx,scope,{action:'project.created',projectId:effect,requestId:randomUUID(),revision:1});
    if (breakCommit) throw new Error('INJECTED_COMMIT_FAILURE');
    return {id:effect,revision:1};
  }));
  await assert.rejects(call(true),/INJECTED/);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM projects WHERE id=$1',[effect])).rows[0].n,0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM jobs WHERE project_id=$1',[effect])).rows[0].n,0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM audit_events WHERE project_id=$1',[effect])).rows[0].n,0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM idempotency_keys WHERE key=$1',[key])).rows[0].n,0);
  await call(false);
  const audit=(await pool.query('SELECT id FROM audit_events WHERE project_id=$1',[effect])).rows[0].id;
  await assert.rejects(pool.query('DELETE FROM audit_events WHERE id=$1',[audit]),{code:'55000'});
});
test('idempotency TTL starts a new request after expiry; receipt rejects secret fields',async () => {
  const a=await fixture(),key=randomUUID(),r={id:randomUUID(),revision:1};
  const call=(value: typeof r,hash:string)=>withOwnerTransaction(pool,a.principal,(tx,scope)=>idempotent(tx,scope,'project.sync',key,hash,async()=>value,a.projectId));
  await call(r,canonicalHash({a:1}));
  assert.equal((await pool.query('SELECT response_status FROM idempotency_keys WHERE key=$1',[key])).rows[0].response_status,202);
  await pool.query(`UPDATE idempotency_keys SET expires_at=now()-interval '1 second' WHERE key=$1`,[key]);
  const next={id:randomUUID(),revision:2}; assert.deepEqual(await call(next,canonicalHash({a:2})),next);
  await assert.rejects(withOwnerTransaction(pool,a.principal,(tx,scope)=>idempotent(tx,scope,'project.sync',randomUUID(),canonicalHash({}),async()=>({...r,password:'synthetic'}),a.projectId)),/INVALID_INPUT/);
});
test('concurrent enqueue dedupes; SKIP LOCKED claims once; expired lease recovers and fences old worker',async () => {
  const a=await fixture();
  const ids=await Promise.all([queue(a),queue(a)]); assert.equal(ids[0],ids[1]);
  const leases=await Promise.all([claim(pool,newWorkerId(),3),claim(pool,newWorkerId(),3)]);
  assert.equal(leases.filter(Boolean).length,1);
  const old=leases.find(Boolean)!; await expired(old);
  const current=(await claim(pool,newWorkerId(),3))!;
  assert.equal(current.id,old.id); assert.equal(current.attempts,2); assert.notEqual(current.lease_token,old.lease_token);
  await assert.rejects(renew(pool,old,3),/LEASE_LOST/);
  await assert.rejects(fail(pool,old,{code:'TRANSIENT_PROVIDER',retryable:true}),/LEASE_LOST/);
  await assert.rejects(transaction(pool,tx=>finish(tx,old,async()=>{ throw new Error('must not publish'); })),/LEASE_LOST/);
  await renew(pool,current,3);
  await transaction(pool,tx=>finish(tx,current,async()=>{ await tx.query(`UPDATE projects SET revision=revision+1 WHERE id=$1`,[a.projectId]); }));
  await assert.rejects(transaction(pool,tx=>finish(tx,current,async()=>{})),/LEASE_LOST/);
  assert.equal((await pool.query('SELECT revision FROM projects WHERE id=$1',[a.projectId])).rows[0].revision,2);
});
test('fenced publication failure rolls back effects and completion; expired publication cannot commit',async () => {
  const a=await fixture(); await queue(a); const lease=(await claim(pool,newWorkerId(),3))!;
  await assert.rejects(transaction(pool,tx=>finish(tx,lease,async()=>{
    await tx.query('UPDATE projects SET revision=revision+1 WHERE id=$1',[a.projectId]); throw new Error('PUBLICATION_FAILURE');
  })),/PUBLICATION_FAILURE/);
  assert.equal((await pool.query('SELECT revision FROM projects WHERE id=$1',[a.projectId])).rows[0].revision,1);
  await assert.rejects(transaction(pool,tx=>finish(tx,lease,async()=>{
    await tx.query('UPDATE projects SET revision=revision+1 WHERE id=$1',[a.projectId]);
    await tx.query(`UPDATE jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1`,[lease.id]);
  })),/LEASE_LOST/);
  assert.equal((await pool.query('SELECT revision FROM projects WHERE id=$1',[a.projectId])).rows[0].revision,1);
});
test('429-like retry releases lease and waits Retry-After; sixth failed/crashed attempt becomes terminal',async () => {
  const a=await fixture(); await queue(a); let lease=(await claim(pool,newWorkerId(),3))!;
  await fail(pool,lease,{code:'TRANSIENT_PROVIDER',retryable:true,retryAfterSeconds:60});
  assert.equal(await claim(pool,newWorkerId(),3),null);
  const delay=(await pool.query('SELECT extract(epoch from available_at-clock_timestamp())::float AS seconds FROM jobs WHERE id=$1',[lease.id])).rows[0].seconds;
  assert.ok(delay>59 && delay<=60);
  for (let i=2;i<=6;i++) {
    await pool.query(`UPDATE jobs SET available_at=clock_timestamp()-interval '1 second' WHERE id=$1`,[lease.id]);
    lease=(await claim(pool,newWorkerId(),3))!; assert.equal(lease.attempts,i);
    await fail(pool,lease,{code:'TRANSIENT_PROVIDER',retryable:true});
  }
  assert.equal((await pool.query('SELECT state,error_code FROM jobs WHERE id=$1',[lease.id])).rows[0].error_code,'RETRY_EXHAUSTED');
  await queue(a); const crashed=(await claim(pool,newWorkerId(),3))!;
  await pool.query(`UPDATE jobs SET attempts=6,lease_until=clock_timestamp()-interval '1 second' WHERE id=$1`,[crashed.id]);
  assert.equal(await claim(pool,newWorkerId(),3),null);
  assert.equal((await pool.query('SELECT state FROM jobs WHERE id=$1',[crashed.id])).rows[0].state,'failed');
});
test('worker stub records provider-not-configured; invalid payload fails; synthetic handler publishes atomically',async () => {
  const a=await fixture(); await queue(a); let lease=(await claim(pool,newWorkerId(),3))!;
  await processLease(pool,lease,3,unconfiguredHandler,new AbortController().signal);
  assert.equal((await pool.query('SELECT error_code FROM jobs WHERE id=$1',[lease.id])).rows[0].error_code,'PROVIDER_NOT_CONFIGURED');
  await queue(a); lease=(await claim(pool,newWorkerId(),3))!; lease.payload={version:2};
  await processLease(pool,lease,3,unconfiguredHandler,new AbortController().signal);
  assert.equal((await pool.query('SELECT error_code FROM jobs WHERE id=$1',[lease.id])).rows[0].error_code,'INVALID_JOB');
  await queue(a); lease=(await claim(pool,newWorkerId(),3))!;
  await fail(pool,lease,{code:'PERMISSION_DENIED',retryable:true}); // Permanent classification wins over an incorrect retry hint.
  assert.equal((await pool.query('SELECT state FROM jobs WHERE id=$1',[lease.id])).rows[0].state,'failed');
  await queue(a); lease=(await claim(pool,newWorkerId(),3))!;
  await processLease(pool,lease,3,async()=>async tx=>{ await tx.query('UPDATE projects SET revision=revision+1 WHERE id=$1',[a.projectId]); },new AbortController().signal);
  assert.equal((await pool.query('SELECT state FROM jobs WHERE id=$1',[lease.id])).rows[0].state,'succeeded');
});
test('actual killed worker process leaves a lease; another process recovers after real expiry with one durable effect',async () => {
  const a=await fixture(),id=await queue(a);
  const child=spawn(process.execPath,['--import','tsx','tests/fixtures/lease-holder.ts'],{env:{...process.env,SNAPPY_TEST_DATABASE_URL:instance.connectionString},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output=''; child.stdout.on('data',data=>{output+=String(data);});
  try {
    for (let i=0;i<100 && !output.includes('claimed');i++) { if(child.exitCode!==null) break;await pause(50); }
    assert.ok(output.includes(id),'separate child claimed expected job');
    const exit=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill('SIGKILL');await exit;
    assert.equal(await claim(pool,newWorkerId(),3),null,'live lease cannot be stolen');
    await pause(3200);
    const recovered=(await claim(pool,newWorkerId(),3))!;assert.equal(recovered.id,id);assert.equal(recovered.attempts,2);
    await transaction(pool,tx=>finish(tx,recovered,async()=>{await tx.query('UPDATE projects SET revision=revision+1 WHERE id=$1',[a.projectId]);}));
    assert.equal((await pool.query('SELECT revision FROM projects WHERE id=$1',[a.projectId])).rows[0].revision,2);
  } finally { if(child.exitCode===null && child.signalCode===null) child.kill('SIGKILL'); }
});
test('long handler renews its lease while preparing outside transaction; competing worker cannot steal',async () => {
  const a=await fixture();await queue(a);const lease=(await claim(pool,newWorkerId(),3))!;
  const work=processLease(pool,lease,3,async()=>{await pause(3600);return async()=>{};},new AbortController().signal);
  await pause(3200);assert.equal(await claim(pool,newWorkerId(),3),null);
  await work;
  assert.equal((await pool.query('SELECT state,attempts FROM jobs WHERE id=$1',[lease.id])).rows[0].state,'succeeded');
});

import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import assert from 'node:assert/strict';
import net from 'node:net';
import pg from 'pg';
import { isolatedPostgres } from './test-postgres.js';
const instance=await isolatedPostgres();
const socket=net.createServer();
const port=await new Promise<number>((resolve,reject)=>{ socket.on('error',reject);socket.listen(0,'127.0.0.1',()=>{ const a=socket.address() as net.AddressInfo; socket.close(()=>resolve(a.port)); }); });
const origin=`http://127.0.0.1:${port}`;
const env={...process.env,APP_ORIGIN:origin,DATABASE_URL:instance.connectionString,MIGRATION_DATABASE_URL:instance.connectionString,NEXT_TELEMETRY_DISABLED:'1'};
function launch(args:string[]) {
  const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output=''; child.stdout?.on('data',data=>{ output+=String(data); }); child.stderr?.on('data',data=>{ output+=String(data); });
  return {child,output:()=>output};
}
async function exited(child:ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve,reject)=>{ child.once('exit',()=>resolve());child.once('error',reject); });
}
async function stop(child:ChildProcess) { if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM'); await exited(child); }
let web:ReturnType<typeof launch> | undefined,worker:ReturnType<typeof launch> | undefined;
try {
  web=launch(['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)]);
  let live=false;
  for (let i=0;i<100;i++) {
    try { live=(await fetch(`${origin}/health/live`)).ok; } catch { /* starting */ }
    if (live) break;
    if (web.child.exitCode !== null) throw new Error('WEB_START_FAILED');
    await pause(100);
  }
  assert.ok(live,'web liveness');
  assert.equal((await fetch(`${origin}/health/ready`)).status,503);
  const migration=launch(['--import','tsx','src/db/migrate-cli.ts']);
  await exited(migration.child); assert.equal(migration.child.exitCode,0,'migration CLI');
  const readiness=await fetch(`${origin}/health/ready`);
  assert.equal(readiness.status,200); assert.deepEqual(await readiness.json(),{status:'ready'});
  assert.equal(readiness.headers.get('cache-control'),'no-store');
  const home=await fetch(origin); assert.ok((await home.text()).includes('belum dikonfigurasi'));
  assert.equal((await fetch(`${origin}/api/v1/projects`)).status,404);
  worker=launch(['dist/worker/main.js']);
  for (let i=0;i<100 && !worker.output().includes('worker_started');i++) {
    if (worker.child.exitCode !== null) throw new Error('WORKER_START_FAILED');
    await pause(50);
  }
  assert.ok(worker.output().includes('worker_started'));
  await stop(worker.child);
  // A restarted worker accepts the existing schema; no provider work is manufactured.
  worker=launch(['dist/worker/main.js']);
  for (let i=0;i<100 && !worker.output().includes('worker_started');i++) await pause(50);
  assert.ok(worker.output().includes('worker_started'));
  const db=new pg.Pool({connectionString:instance.connectionString});
  try { assert.equal((await db.query('SELECT count(*)::int AS n FROM jobs')).rows[0].n,0); } finally { await db.end(); }
  console.log('Passed: production web/compiled worker, live, ready 503 -> CLI migration -> 200, no-store, unconfigured providers, worker restart.');
} finally {
  if (worker) await stop(worker.child);
  if (web) await stop(web.child);
  await instance.server.stop();
}

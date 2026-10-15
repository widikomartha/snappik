import EmbeddedPostgres from 'embedded-postgres';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
const databaseDir=path.resolve('.local/postgres-dev');
await mkdir(path.dirname(databaseDir),{ recursive:true });
const server=new EmbeddedPostgres({ databaseDir,user:'snappik_local',password:'synthetic_local_only',port:55433,persistent:true,
  authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1'],
  onLog() {},onError() { console.error('LOCAL_POSTGRES_ERROR'); } });
let initialized=false;
try { await access(path.join(databaseDir,'PG_VERSION')); initialized=true; } catch { /* new dedicated cluster */ }
try {
  if (!initialized) await server.initialise();
  await server.start();
  // Recover an interrupted first setup without resetting or replacing any data.
  const admin=server.getPgClient('postgres','127.0.0.1');
  try {
    await admin.connect();
    const exists=await admin.query("SELECT 1 FROM pg_database WHERE datname='snappik_local'");
    if (!exists.rowCount) await admin.query('CREATE DATABASE snappik_local');
  } finally { await admin.end(); }
  console.log('Dedicated synthetic PostgreSQL on 127.0.0.1:55433; Ctrl+C stops it. Data retained in .local/postgres-dev.');
  if (process.argv.includes('--check')) console.log('Local PostgreSQL setup check Passed; stopping own server.');
  else await new Promise<void>(resolve => { process.once('SIGINT',resolve); process.once('SIGTERM',resolve); });
} finally { await server.stop(); }

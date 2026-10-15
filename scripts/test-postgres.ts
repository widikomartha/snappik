import EmbeddedPostgres from 'embedded-postgres';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
// Always creates an OWN isolated cluster. Never reads DATABASE_URL or drops an existing DB.
export async function isolatedPostgres() {
  const port = await new Promise<number>((resolve,reject) => {
    const socket=net.createServer(); socket.on('error',reject);
    socket.listen(0,'127.0.0.1',() => { const addr=socket.address() as net.AddressInfo; socket.close(() => resolve(addr.port)); });
  });
  const databaseDir=path.resolve('.local',`pg-test-${randomUUID()}`);
  await mkdir(path.dirname(databaseDir),{recursive:true});
  const server=new EmbeddedPostgres({databaseDir,user:'snappik_test',password:'synthetic_test_only',port,persistent:true,
    authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1'],onLog() {},onError() { console.error('TEST_POSTGRES_ERROR'); }});
  try { await server.initialise(); await server.start(); await server.createDatabase('snappik_test'); }
  catch (error) { await server.stop().catch(() => {}); throw error; }
  return { server,connectionString:`postgresql://snappik_test:synthetic_test_only@127.0.0.1:${port}/snappik_test` };
}

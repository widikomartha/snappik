import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';
import { canonicalHash } from '../src/modules/reliability/idempotency.js';
import { retryDelay } from '../src/modules/reliability/jobs.js';
import { auth,drive } from '../src/adapters/providers.js';
const env = {APP_ORIGIN:'http://localhost:3000',DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1/test'};
test('configuration rejects missing, insecure, unsupported-provider and unbounded values without echoing secrets',() => {
  assert.equal(readConfig(env).concurrency,2);
  for (const change of [{DATABASE_URL:''},{APP_ORIGIN:'http://example.com'},{APP_ORIGIN:'https://example.com/path'},{WORKER_CONCURRENCY:'200'},{JOB_LEASE_SECONDS:'NaN'},{DB_POOL_MAX:'0'},{AUTH_MODE:'fake'},{DRIVE_MODE:'live'}]) assert.throws(() => readConfig({...env,...change}),/^Error: CONFIG_/);
});
test('canonical hash is ordered, bounded and distinguishes changes',() => {
  assert.equal(canonicalHash({a:1,b:[2,3]}),canonicalHash({b:[2,3],a:1}));
  assert.notEqual(canonicalHash({a:1}),canonicalHash({a:2}));
  assert.throws(() => canonicalHash({huge:'x'.repeat(20000)}));
  assert.throws(() => canonicalHash({a:undefined}));
  const cycle: Record<string,unknown>={}; cycle.cycle=cycle; assert.throws(() => canonicalHash(cycle));
});
test('retry schedule is bounded, honors Retry-After and rejects invalid attempts',() => {
  assert.deepEqual([1,2,3,4,5].map(n=>retryDelay(n,()=>0)),[5,30,120,600,1800]);
  assert.equal(retryDelay(1,()=>0.5,60),60);
  assert.equal(retryDelay(5,()=>0.5),1980);
  assert.throws(() => retryDelay(6)); assert.throws(() => retryDelay(1,()=>1));
});
test('unconfigured adapters cannot invent authenticated or Drive-backed success',async () => {
  await assert.rejects(auth.resolveSession(new Request('http://localhost')),/PROVIDER_NOT_CONFIGURED/);
  await assert.rejects(drive.scan({studioId:'synthetic',projectId:'synthetic'},new AbortController().signal),/PROVIDER_NOT_CONFIGURED/);
});

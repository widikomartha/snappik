import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { stageOriginal } from '../bl002-drive/media.mjs';

// Real loopback HTTP, synthetic signature bytes, NO provider/auth/image-decoder proof.
const size = 50 * 1024 * 1024;
const chunk = Buffer.alloc(64 * 1024, 7);
chunk.set([255, 216, 255]);
const metadata = { name: 'synthetic.jpg', mimeType: 'image/jpeg', size, canDownload: true };
async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
async function until(predicate) {
  const deadline = Date.now() + 5000;
  while (!await predicate()) { assert.ok(Date.now() < deadline, 'cleanup/event deadline'); await pause(10); }
}
async function fixture(mode, work) {
  const root = await mkdtemp(join(tmpdir(), 'snappik-dec003-'));
  const state = { sourceClosed: false, started: false, done: false, completed: false };
  const source = http.createServer(async (_request, response) => {
    state.started = true;
    const stop = new AbortController();
    response.on('close', () => { state.sourceClosed = true; stop.abort(); });
    response.writeHead(200, { 'Content-Type': 'image/jpeg' });
    response.flushHeaders();
    async function* bytes() {
      for (let sent = 0; sent < size; sent += chunk.length) {
        if (mode === 'stall') await pause(10000, undefined, { signal: stop.signal });
        yield chunk;
      }
      if (mode === 'overflow') yield Buffer.from([7]);
    }
    try { await pipeline(Readable.from(bytes()), response, { signal: stop.signal }); } catch { /* expected cancellation */ }
  });
  let proxy;
  try {
    const sourceUrl = await listen(source);
    proxy = http.createServer(async (_request, response) => {
      const stop = new AbortController();
      response.on('close', () => { if (!response.writableFinished) stop.abort(); });
      let staged;
      try {
        staged = await stageOriginal({ metadata, tempRoot: root, signal: stop.signal,
          timeoutMs: mode === 'stall' ? 150 : 5000,
          authorize: async () => {}, // Explicit synthetic policy, never authenticates a user.
          open: ({ signal }) => new Promise((resolve, reject) => {
            const request = http.get(sourceUrl, { signal, agent: false }, upstream => resolve({
              status: upstream.statusCode, contentType: upstream.headers['content-type'], body: upstream,
            }));
            request.on('error', reject);
          }),
        });
        response.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': staged.bytes,
          'Cache-Control': 'private, no-store' });
        await pipeline(await staged.read(), response, { signal: stop.signal });
        state.completed = true;
      } catch {
        if (!response.destroyed && !response.headersSent) {
          response.writeHead(mode === 'stall' ? 504 : 502, { 'Cache-Control': 'no-store' });
          response.end('SYNTHETIC_SOURCE_FAILURE');
        } else response.destroy();
      } finally { await staged?.dispose(); state.done = true; }
    });
    const proxyUrl = await listen(proxy);
    await work(proxyUrl, state);
    await until(() => state.done);
    assert.deepEqual(await readdir(root), [], 'no staged bytes retained');
  } finally {
    if (proxy) await close(proxy);
    await close(source);
    // Only our mkdtemp directory, never an environment-provided path.
    await rm(root, { recursive: true, force: true });
  }
}
test('50 MiB over two HTTP hops: exact digest/length, private response, scratch cleanup', { timeout: 15000 }, () => fixture('ok', async (url, state) => {
  const expected = createHash('sha256');
  for (let i = 0; i < size / chunk.length; i++) expected.update(chunk);
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), String(size));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  let count = 0;
  const digest = createHash('sha256');
  for await (const bytes of response.body) { count += bytes.length; digest.update(bytes); }
  assert.equal(count, size);
  assert.equal(digest.digest('hex'), expected.digest('hex'));
  await until(() => state.completed);
}));
test('unknown-length upstream overflow fails before success headers', { timeout: 15000 }, () => fixture('overflow', async url => {
  const response = await fetch(url);
  assert.equal(response.status, 502);
  assert.equal(await response.text(), 'SYNTHETIC_SOURCE_FAILURE');
}));
test('stalled real upstream socket cancelled at local deadline', { timeout: 15000 }, () => fixture('stall', async (url, state) => {
  const response = await fetch(url);
  assert.equal(response.status, 504);
  await response.text();
  await until(() => state.sourceClosed);
  assert.equal(state.completed, false);
}));
test('client cancellation before headers aborts upstream and removes scratch', { timeout: 15000 }, () => fixture('stall', async (url, state) => {
  const stop = new AbortController();
  const request = fetch(url, { signal: stop.signal });
  const rejection = assert.rejects(request, { name: 'AbortError' });
  await until(() => state.started);
  stop.abort();
  await rejection;
  await until(() => state.sourceClosed);
  assert.equal(state.completed, false);
}));
test('client cancellation during delivery never records completion and removes scratch', { timeout: 15000 }, () => fixture('ok', async (url, state) => {
  const stop = new AbortController();
  const response = await fetch(url, { signal: stop.signal });
  const reader = response.body.getReader();
  assert.ok((await reader.read()).value.length > 0);
  stop.abort();
  await reader.cancel().catch(() => {});
  await until(() => state.done);
  assert.equal(state.completed, false);
}));

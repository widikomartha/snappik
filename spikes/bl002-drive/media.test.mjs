import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { LIMITS, SourceError } from './adapter.mjs';
import { stageOriginal, removeScratch } from './media.mjs';

const jpeg = Buffer.from([255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const metadata = { name: 'synthetic.jpg', mimeType: 'image/jpeg', size: jpeg.length, canDownload: true };
const response = (extra = {}) => ({ status: 200, contentType: 'image/jpeg', body: Readable.from([jpeg]), ...extra });
const code = expected => error => error instanceof SourceError && error.code === expected;
async function fixture(fn) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'snappik-bl002-test-'));
  const defaults = { tempRoot, metadata, authorize: async () => {}, open: async () => response() };
  try { await fn(defaults); } finally { await removeScratch(tmpdir(), tempRoot); }
}

test('stages synthetic bytes before delivery, rechecks authorization and cleans file', () => fixture(async defaults => {
  let checks = 0;
  const staged = await stageOriginal({ ...defaults, authorize: async () => { checks++; } });
  try {
    const chunks = [];
    for await (const chunk of await staged.read()) chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks), jpeg);
    assert.equal(staged.bytes, jpeg.length);
    assert.equal(checks, 3);
  } finally { await staged.dispose(); }
  assert.deepEqual(await readdir(defaults.tempRoot), []);
}));
test('main-only denial happens before open; revocation during staging denies without delivery', () => fixture(async defaults => {
  let calls = 0;
  await assert.rejects(stageOriginal({ ...defaults, authorize: async () => { throw new SourceError('DOWNLOAD_GRANT_REQUIRED'); },
    open: async () => { calls++; } }), code('DOWNLOAD_GRANT_REQUIRED'));
  assert.equal(calls, 0);
  await assert.rejects(stageOriginal({ ...defaults, authorize: async () => {
    if (++calls === 2) throw new SourceError('ACCESS_REVOKED');
  } }), code('ACCESS_REVOKED'));
  assert.deepEqual(await readdir(defaults.tempRoot), []);
}));
test('revocation after staging denies read; caller can dispose staged bytes', () => fixture(async defaults => {
  let revoked = false;
  const staged = await stageOriginal({ ...defaults, authorize: async () => {
    if (revoked) throw new SourceError('ACCESS_REVOKED');
  } });
  try { revoked = true; await assert.rejects(staged.read(), code('ACCESS_REVOKED')); }
  finally { await staged.dispose(); }
}));
test('50 MiB generated incrementally is accepted with 64 KiB chunks', () => fixture(async defaults => {
  const started = performance.now();
  const before = process.memoryUsage().rss;
  async function* chunks() {
    yield jpeg;
    let remaining = LIMITS.bytes - jpeg.length;
    while (remaining) { const size = Math.min(65536, remaining); yield Buffer.alloc(size); remaining -= size; }
  }
  const staged = await stageOriginal({ ...defaults, metadata: { ...metadata, size: LIMITS.bytes },
    open: async () => response({ body: Readable.from(chunks()), contentLength: LIMITS.bytes }) });
  try { assert.equal(staged.bytes, LIMITS.bytes); }
  finally { await staged.dispose(); }
  // Endpoint RSS delta is diagnostic only, not peak memory or a hosting/load benchmark.
  process.stdout.write(`BL002_LOCAL_SAMPLE bytes=${LIMITS.bytes} elapsed_ms=${Math.round(performance.now() - started)} rss_endpoint_delta=${process.memoryUsage().rss - before}\n`);
}));
test('oversize metadata, missing canDownload and disallowed MIME denied before open', () => fixture(async defaults => {
  for (const extra of [{ size: LIMITS.bytes + 1 }, { canDownload: false }, { mimeType: 'text/html' }]) {
    let opened = false;
    await assert.rejects(stageOriginal({ ...defaults, metadata: { ...metadata, ...extra }, open: async () => { opened = true; } }),
      code('SOURCE_UNAVAILABLE'));
    assert.equal(opened, false);
  }
}));
test('redirect, wrong MIME/encoding, missing source and denied provider response fail', () => fixture(async defaults => {
  for (const extra of [{ status: 302 }, { redirected: true }, { contentType: 'text/html' },
    { contentEncoding: 'gzip' }, { status: 404 }, { status: 403 }]) {
    await assert.rejects(stageOriginal({ ...defaults, open: async () => response(extra) }), code('INVALID_MEDIA'));
  }
  assert.deepEqual(await readdir(defaults.tempRoot), []);
}));
test('lying length, truncated bytes, overflow and forged image signature never return staged success', () => fixture(async defaults => {
  for (const extra of [{ contentLength: 'wrong' }, { contentLength: 13 }, { body: Readable.from([jpeg.subarray(0, 5)]) },
    { body: Readable.from([Buffer.alloc(12)]) }]) {
    await assert.rejects(stageOriginal({ ...defaults, open: async () => response(extra) }));
    assert.deepEqual(await readdir(defaults.tempRoot), []);
  }
  await assert.rejects(stageOriginal({ ...defaults, open: async () => response({ body: Readable.from([jpeg, Buffer.alloc(1)]) }) }),
    code('MEDIA_LIMIT'));
  assert.deepEqual(await readdir(defaults.tempRoot), []);
}));
test('source disconnect sanitizes raw errors and removes partial bytes', () => fixture(async defaults => {
  async function* broken() { yield jpeg.subarray(0, 5); throw new Error('sensitive provider URL'); }
  await assert.rejects(stageOriginal({ ...defaults, open: async () => response({ body: Readable.from(broken()) }) }),
    error => error.code === 'SOURCE_UNAVAILABLE' && !error.message.includes('sensitive'));
  assert.deepEqual(await readdir(defaults.tempRoot), []);
}));
test('body stall deadline and caller abort destroy stream and remove temporary data', () => fixture(async defaults => {
  const stalled = new Readable({ read() {} });
  await assert.rejects(stageOriginal({ ...defaults, timeoutMs: 30, open: async () => response({ body: stalled }) }),
    code('SOURCE_CANCELLED'));
  assert.equal(stalled.destroyed, true);
  await assert.rejects(stageOriginal({ ...defaults, signal: AbortSignal.abort() }), code('SOURCE_CANCELLED'));
  assert.deepEqual(await readdir(defaults.tempRoot), []);
}));
test('stalled acquisition times out even if transport ignores signal', () => fixture(async defaults => {
  await assert.rejects(stageOriginal({ ...defaults, timeoutMs: 30, open: () => new Promise(() => {}) }),
    code('SOURCE_CANCELLED'));
  assert.deepEqual(await readdir(defaults.tempRoot), []);
}));
test('PNG/WebP signature handling works when prefix is split across chunks', () => fixture(async defaults => {
  for (const [name, mimeType, bytes] of [['a.png', 'image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
    ['a.webp', 'image/webp', Buffer.from('RIFF0000WEBP')]]) {
    const staged = await stageOriginal({ ...defaults, metadata: { name, mimeType, size: bytes.length, canDownload: true },
      open: async () => response({ contentType: mimeType, body: Readable.from([...bytes].map(b => Buffer.from([b]))) }) });
    await staged.dispose();
  }
}));
test('concurrent transfers use distinct scratch; cleanup rejects outside-root paths', () => fixture(async defaults => {
  const handles = await Promise.all([stageOriginal(defaults), stageOriginal(defaults)]);
  try { assert.equal((await readdir(defaults.tempRoot)).length, 2); }
  finally { await Promise.all(handles.map(handle => handle.dispose())); }
  assert.deepEqual(await readdir(defaults.tempRoot), []);
  await assert.rejects(removeScratch(defaults.tempRoot, defaults.tempRoot), code('INVALID_SCRATCH_PATH'));
  await assert.rejects(removeScratch(defaults.tempRoot, tmpdir()), code('INVALID_SCRATCH_PATH'));
}));
test('unknown-length response exceeding the actual 50 MiB cap is stopped and removed', () => fixture(async defaults => {
  async function* overflow() {
    yield jpeg;
    let remaining = LIMITS.bytes - jpeg.length;
    while (remaining) { const size = Math.min(65536, remaining); yield Buffer.alloc(size); remaining -= size; }
    yield Buffer.alloc(1);
  }
  await assert.rejects(stageOriginal({ ...defaults, metadata: { ...metadata, size: LIMITS.bytes },
    open: async () => response({ body: Readable.from(overflow()) }) }), code('MEDIA_LIMIT'));
  assert.deepEqual(await readdir(defaults.tempRoot), []);
}));

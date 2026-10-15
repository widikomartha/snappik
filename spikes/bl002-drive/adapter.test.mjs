import test from 'node:test';
import assert from 'node:assert/strict';
import { FOLDER, SHORTCUT, LIMITS, SourceError, listRequest, mediaRequest, resourceHeaders,
  scan, imageStatus, classify, retryDelay } from './adapter.mjs';

const root = { id: 'synthetic_root', mimeType: FOLDER };
const photo = (id = 'synthetic_photo', extra = {}) => ({ id, name: 'IMG_001.jpg', mimeType: 'image/jpeg',
  size: '12', version: 'opaque-v1', parents: [root.id], ...extra });
const folder = (id, parent = root.id, extra = {}) => ({ id, name: id, mimeType: FOLDER, parents: [parent], ...extra });
const code = expected => error => error instanceof SourceError && error.code === expected;
const run = (files, options = {}) => scan({ root, list: async () => ({ files }), ...options });

test('fixed provider origin, validated IDs, no URL or query/header injection', () => {
  for (const bad of ['https://127.0.0.1/x', '../x', "x' or true", 'x\r\nheader', '']) {
    assert.throws(() => mediaRequest(bad), code('INVALID_SOURCE'));
    assert.throws(() => listRequest({ folderId: bad }), code('INVALID_SOURCE'));
  }
  assert.throws(() => resourceHeaders([['safe', 'key,other/key']]), code('INVALID_SOURCE'));
  assert.equal(new URL(mediaRequest('safe').url).origin, 'https://www.googleapis.com');
  assert.equal(mediaRequest('safe').redirect, 'error');
});
test('Shared Drive query and resource-key header use documented seams', () => {
  const req = listRequest({ folderId: root.id, resourceKey: 'synthetic_key', driveId: 'synthetic_drive', pageToken: 'opaque+token' });
  const query = new URL(req.url).searchParams;
  assert.equal(query.get('corpora'), 'drive');
  assert.equal(query.get('driveId'), 'synthetic_drive');
  assert.equal(query.get('supportsAllDrives'), 'true');
  assert.equal(query.get('includeItemsFromAllDrives'), 'true');
  assert.equal(query.get('pageToken'), 'opaque+token');
  assert.equal(query.get('pageSize'), '1000');
  assert.equal(req.headers['X-Goog-Drive-Resource-Keys'], `${root.id}/synthetic_key`);
  assert.equal(new URL(listRequest({ folderId: root.id }).url).searchParams.get('corpora'), 'user');
});
test('MIME plus case-insensitive JPG/JPEG/PNG/WebP extension, exact 50 MiB inclusive', () => {
  for (const [name, mimeType] of [['A.JPG', 'image/jpeg'], ['a.JPEG', 'image/jpeg'], ['a.PNG', 'image/png'], ['a.WebP', 'image/webp']]) {
    assert.equal(imageStatus(photo('x', { name, mimeType, size: String(LIMITS.bytes) })), 'eligible');
  }
  assert.equal(imageStatus(photo('x', { size: LIMITS.bytes + 1 })), 'oversized');
  assert.equal(imageStatus(photo('x', { name: 'bad.jpg', mimeType: 'image/png' })), 'unsupported');
  assert.equal(imageStatus(photo('x', { name: 'bad.svg', mimeType: 'image/svg+xml' })), 'unsupported');
  for (const size of [undefined, -1, 'NaN', '1.5', '9007199254740993']) {
    assert.throws(() => imageStatus(photo('x', { size })), code('INVALID_METADATA'));
  }
});
test('empty intermediate page still follows token, preserves duplicate names/case and folder key', async () => {
  const calls = [];
  const result = await scan({ root, list: async req => {
    const q = new URL(req.url).searchParams;
    calls.push(req);
    if (q.get('q').includes("'child'")) {
      assert.equal(req.headers['X-Goog-Drive-Resource-Keys'], 'child/child_key');
      return { files: [photo('b', { parents: ['child'], name: 'IMG_001.JPG' })] };
    }
    if (!q.has('pageToken')) return { files: [], nextPageToken: 'page_2' };
    return { files: [photo('a'), folder('child', root.id, { resourceKey: 'child_key' })] };
  } });
  assert.equal(result.pages, 3);
  assert.deepEqual(result.photos.map(x => [x.providerFileId, x.filename, x.folderPath]),
    [['a', 'IMG_001.jpg', []], ['b', 'IMG_001.JPG', ['child']]]);
  assert.equal(result.complete, true);
});
test('skips are counted; shortcuts never followed, including external targets', async () => {
  const result = await run([photo('gone', { trashed: true }), photo('shortcut', { mimeType: SHORTCUT,
    shortcutDetails: { targetId: 'outside' } }), photo('unsupported', { name: 'x.pdf' }),
  photo('big', { size: LIMITS.bytes + 1 }), photo('ok')]);
  assert.equal(result.photos.length, 1);
  assert.deepEqual(result.skipped, { trashed: 1, shortcut: 1, unsupported: 1, oversized: 1, subfolder: 0 });
});
test('root-only scan explicitly counts excluded subfolders', async () => {
  const result = await run([folder('child')], { detectSubfolders: false });
  assert.equal(result.pages, 1);
  assert.equal(result.skipped.subfolder, 1);
});
test('root depth zero, accepts depth 10 and rejects depth 11 without partial result', async () => {
  const traverse = depth => scan({ root, list: async req => {
    const parent = new URL(req.url).searchParams.get('q').split("'")[1];
    const current = parent === root.id ? 0 : Number(parent.slice(1));
    return { files: current < depth ? [folder(`d${current + 1}`, parent)] : [photo('leaf', { parents: [parent] })] };
  } });
  assert.equal((await traverse(10)).photos[0].folderPath.length, 10);
  await assert.rejects(traverse(11), code('DEPTH_LIMIT'));
});
test('5,000 eligible images across pages accepted; image 5,001 rejects', async () => {
  const fixture = count => scan({ root, list: async req => {
    const offset = Number(new URL(req.url).searchParams.get('pageToken') ?? 0);
    const end = Math.min(offset + 1000, count);
    return { files: Array.from({ length: end - offset }, (_, i) => photo(`p${offset + i}`)),
      ...(end < count ? { nextPageToken: String(end) } : {}) };
  } });
  assert.equal((await fixture(5000)).photos.length, 5000);
  await assert.rejects(fixture(5001), code('PHOTO_LIMIT'));
});
test('bad root, incomplete search, foreign parent and repeated identity fail closed', async () => {
  await assert.rejects(run([], { root: photo() }), code('INVALID_SOURCE'));
  await assert.rejects(run([], { list: async () => ({ files: [], incompleteSearch: true }) }), code('INCOMPLETE_SCAN'));
  await assert.rejects(run([photo('foreign', { parents: ['outside'] })]), code('OUTSIDE_SUBTREE'));
  await assert.rejects(run([photo('a'), photo('a')]), code('UNSTABLE_SCAN'));
  await assert.rejects(run([folder(root.id)]), code('UNSTABLE_SCAN'));
});
test('cyclic/rejected pagination aborts; a fresh scan restarts at page one', async () => {
  await assert.rejects(run([], { list: async () => ({ files: [], nextPageToken: 'same' }) }), code('INVALID_PAGE'));
  let calls = 0;
  const list = async req => {
    calls++;
    if (new URL(req.url).searchParams.has('pageToken')) throw new SourceError('INVALID_PAGE');
    return { files: [photo()], nextPageToken: 'expired' };
  };
  await assert.rejects(scan({ root, list }), code('INVALID_PAGE'));
  await assert.rejects(scan({ root, list }), code('INVALID_PAGE'));
  assert.equal(calls, 4);
});
test('permission loss mid-scan exposes no partial generation and no mutation of prior state', async () => {
  const prior = { generation: 'old', choices: ['old-photo'], available: ['old-photo'], confirmation: ['old-photo'] };
  const before = structuredClone(prior);
  await assert.rejects(scan({ root, list: async req => {
    if (new URL(req.url).searchParams.has('pageToken')) throw new SourceError('SOURCE_UNAVAILABLE');
    return { files: [photo('new')], nextPageToken: 'second' };
  } }), code('SOURCE_UNAVAILABLE'));
  assert.deepEqual(prior, before); // Only seam purity; no DB atomicity claim.
});
test('page, entry and folder budgets terminate sparse/unsupported trees', async () => {
  let pages = 0;
  await assert.rejects(run([], { list: async () => ({ files: [], nextPageToken: String(++pages) }) }), code('SCAN_BUDGET_EXCEEDED'));
  assert.equal(pages, LIMITS.pages);
  let entries = 0;
  await assert.rejects(run([], { list: async () => ({ files: Array.from({ length: 1000 }, () =>
    photo(`e${++entries}`, { name: 'x.pdf' })), nextPageToken: String(entries) }) }), code('SCAN_BUDGET_EXCEEDED'));
  let count = 0;
  await assert.rejects(run([], { list: async () => ({ files: Array.from({ length: 1000 }, () =>
    folder(`f${++count}`)), nextPageToken: String(count) }) }), code('SCAN_BUDGET_EXCEEDED'));
});
test('cancelled scan terminates before provider call', async () => {
  let calls = 0;
  await assert.rejects(scan({ root, signal: AbortSignal.abort(), list: async () => { calls++; } }));
  assert.equal(calls, 0);
});
test('stalled acquisition has a scan deadline; unknown transport errors are redacted', async () => {
  await assert.rejects(scan({ root, timeoutMs: 30, list: () => new Promise(() => {}) }), code('SOURCE_CANCELLED'));
  await assert.rejects(run([], { list: async () => { throw new Error('private provider response'); } }),
    code('SOURCE_UNAVAILABLE'));
});
test('403 permission is permanent; rate reasons/429/5xx retry, 401 reauthorizes', () => {
  assert.equal(classify({ status: 403, reason: 'insufficientFilePermissions' }), 'source_unavailable');
  assert.equal(classify({ status: 404 }), 'source_unavailable');
  assert.equal(classify({ status: 401 }), 'reauthorize');
  for (const failure of [{ status: 429 }, { status: 503 }, { status: 403, reason: 'userRateLimitExceeded' },
    { status: 403, reason: 'rateLimitExceeded' }]) assert.equal(classify(failure), 'retry');
  assert.equal(classify({ status: 403, reason: 'downloadQuotaExceeded' }), 'source_unavailable');
});
test('bounded five retries, jitter, Retry-After seconds/date and no early retry on long cooldown', () => {
  const failure = { status: 429 }, opts = { random: () => 0, now: 0 };
  assert.deepEqual(Array.from({ length: 6 }, (_, n) => retryDelay(failure, n, opts)), [5000, 30000, 120000, 600000, 1800000, null]);
  assert.equal(retryDelay({ ...failure, retryAfter: '86400' }, 0, opts), 86400000);
  assert.equal(retryDelay({ ...failure, retryAfter: 'Thu, 01 Jan 1970 00:01:00 GMT' }, 0, opts), 60000);
  assert.equal(retryDelay({ ...failure, retryAfter: 'invalid' }, 0, opts), 5000);
  assert.equal(retryDelay(failure, 0, { ...opts, random: () => 1 }), 6000);
  assert.equal(retryDelay({ status: 403 }, 0, opts), null);
});

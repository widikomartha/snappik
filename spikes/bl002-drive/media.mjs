import { mkdtemp, rm } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { LIMITS, SourceError, imageStatus, abortable } from './adapter.mjs';

function signature(bytes, mime) {
  if (mime === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}
export async function removeScratch(root, target) {
  const inside = relative(resolve(root), resolve(target));
  if (!inside || inside === '..' || inside.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(inside)) {
    throw new SourceError('INVALID_SCRATCH_PATH');
  }
  await rm(target, { recursive: true, force: true });
}
// Opens only an injected provider stream, not a client URL. Spools before success headers.
// Signature check is NOT a full image decoder. Production decoder limits are pending.
export async function stageOriginal({ metadata, open, authorize, tempRoot, signal, timeoutMs = 120000 }) {
  await authorize();
  if (imageStatus(metadata) !== 'eligible' || !metadata.canDownload) throw new SourceError('SOURCE_UNAVAILABLE');
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const timer = setTimeout(() => controller.abort(new SourceError('SOURCE_TIMEOUT')), timeoutMs);
  let directory, upstream;
  try {
    combined.throwIfAborted();
    // Transport must honor AbortSignal, including acquisition and socket cancellation.
    upstream = await abortable(() => open({ signal: combined }), combined, late => late?.body?.destroy());
    combined.throwIfAborted();
    if (upstream.status !== 200 || upstream.redirected || upstream.contentType !== metadata.mimeType ||
        upstream.contentEncoding && upstream.contentEncoding !== 'identity') throw new SourceError('INVALID_MEDIA');
    const size = Number(metadata.size);
    if (upstream.contentLength !== undefined &&
        (!/^\d+$/.test(String(upstream.contentLength)) || Number(upstream.contentLength) !== size)) {
      throw new SourceError('INVALID_LENGTH');
    }
    directory = await mkdtemp(join(tempRoot, 'snappik-bl002-'));
    const path = join(directory, 'source');
    let count = 0, prefix = Buffer.alloc(0);
    const guard = new Transform({ transform(chunk, encoding, callback) {
      count += chunk.length;
      if (count > LIMITS.bytes || count > size) return callback(new SourceError('MEDIA_LIMIT'));
      if (prefix.length < 12) prefix = Buffer.concat([prefix, chunk.subarray(0, 12 - prefix.length)]);
      callback(null, chunk);
    } });
    await pipeline(upstream.body, guard, createWriteStream(path, { flags: 'wx', mode: 0o600 }), { signal: combined });
    if (count !== size || !signature(prefix, metadata.mimeType)) throw new SourceError('INVALID_MEDIA');
    await authorize(); // Recheck policy after external I/O and before response creation.
    return { bytes: count, async read() { await authorize(); return createReadStream(path); },
      async dispose() { await removeScratch(tempRoot, directory); } };
  } catch (error) {
    upstream?.body?.destroy();
    if (directory) await removeScratch(tempRoot, directory);
    if (error instanceof SourceError) throw error;
    throw new SourceError(combined.aborted ? 'SOURCE_CANCELLED' : 'SOURCE_UNAVAILABLE');
  } finally { clearTimeout(timer); }
}

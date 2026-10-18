import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Uses the existing locked transitive sharp; no production adapter or pin is added.
sharp.cache(false);
sharp.concurrency(1);
if (process.argv[2] === '--decode') {
  const started = performance.now();
  const input = process.argv[3];
  const reject = process.argv[4] === 'reject';
  const operation = sharp(input, { limitInputPixels: 40000000, sequentialRead: true, failOn: 'warning' })
    .timeout({ seconds: 10 }).resize({ width: 640, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  if (reject) await assert.rejects(operation, /pixel limit/i);
  else {
    const result = await operation;
    const info = await sharp(result).metadata();
    assert.equal(info.width, 640);
    assert.equal(info.format, 'jpeg');
  }
  console.log(JSON.stringify({ case: reject ? '48MP_rejected_at_spike_40MP_limit' : '24MP_thumbnail',
    sharp: sharp.versions.sharp, vips: sharp.versions.vips, concurrency: 1, cache: false,
    elapsed_ms: Math.round(performance.now() - started), max_rss_kib: process.resourceUsage().maxRSS }));
} else {
  const root = await mkdtemp(join(tmpdir(), 'snappik-dec003-decode-'));
  try {
    for (const [width, height, mode] of [[6000, 4000, 'accept'], [8000, 6000, 'reject']]) {
      const input = join(root, `${width}.png`);
      await sharp({ create: { width, height, channels: 4, background: '#336699' } }).png().toFile(input);
      console.log(JSON.stringify({ fixture: `${width}x${height}_solid_RGBA_PNG`, compressed_bytes: (await stat(input)).size }));
      const result = await promisify(execFile)(process.execPath, [fileURLToPath(import.meta.url), '--decode', input, mode], { timeout: 20000 });
      process.stdout.write(result.stdout);
      assert.equal(result.stderr, '');
    }
  } finally { await rm(root, { recursive: true, force: true }); }
}

// Offline seam only. No fetch, credentials, database or application routes.
export const LIMITS = Object.freeze({ photos: 5000, depth: 10, bytes: 50 * 1024 * 1024,
  entries: 20000, folders: 2000, pages: 2000, pageSize: 1000 });
export const FOLDER = 'application/vnd.google-apps.folder';
export const SHORTCUT = 'application/vnd.google-apps.shortcut';
export class SourceError extends Error {
  constructor(code) { super(code); this.name = 'SourceError'; this.code = code; }
}
export function id(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value)) throw new SourceError('INVALID_SOURCE');
  return value;
}
export function resourceHeaders(pairs = []) {
  if (!pairs.length) return {};
  return { 'X-Goog-Drive-Resource-Keys': pairs.map(([fileId, key]) => `${id(fileId)}/${id(key)}`).join(',') };
}
const fields = 'id,name,mimeType,size,version,parents,trashed,resourceKey,driveId,capabilities(canDownload)';
export function listRequest({ folderId, resourceKey, driveId, pageToken }) {
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', `'${id(folderId)}' in parents and trashed = false`);
  url.searchParams.set('fields', `nextPageToken,incompleteSearch,files(${fields})`);
  url.searchParams.set('pageSize', String(LIMITS.pageSize));
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');
  url.searchParams.set('corpora', driveId ? 'drive' : 'user');
  if (driveId) url.searchParams.set('driveId', id(driveId));
  if (pageToken !== undefined) {
    if (typeof pageToken !== 'string' || pageToken.length > 4096) throw new SourceError('INVALID_PAGE');
    url.searchParams.set('pageToken', pageToken);
  }
  return { url: url.href, method: 'GET', redirect: 'error',
    headers: resourceHeaders(resourceKey ? [[folderId, resourceKey]] : []) };
}
export function mediaRequest(fileId, resourceKey) {
  return { url: `https://www.googleapis.com/drive/v3/files/${id(fileId)}?alt=media&supportsAllDrives=true`,
    method: 'GET', redirect: 'error', headers: { 'Accept-Encoding': 'identity',
      ...resourceHeaders(resourceKey ? [[fileId, resourceKey]] : []) } };
}
export function imageStatus(file) {
  const expected = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const ext = typeof file.name === 'string' ? file.name.split('.').at(-1).toLowerCase() : '';
  if (!expected[ext] || file.mimeType !== expected[ext]) return 'unsupported';
  if (!/^\d+$/.test(String(file.size)) || !Number.isSafeInteger(Number(file.size))) throw new SourceError('INVALID_METADATA');
  return Number(file.size) > LIMITS.bytes ? 'oversized' : 'eligible';
}
// Only sanitized status/reason inputs from the eventual transport, never raw bodies.
export function classify({ status, reason }) {
  if (status === 429 || status === 408 || status >= 500 && status <= 599 ||
      status === 403 && ['rateLimitExceeded', 'userRateLimitExceeded'].includes(reason)) return 'retry';
  if (status === 401) return 'reauthorize';
  if (status === 403 || status === 404) return 'source_unavailable';
  return 'permanent';
}
export function retryDelay(failure, retryIndex, { random = Math.random, now = Date.now() } = {}) {
  const delays = [5000, 30000, 120000, 600000, 1800000];
  if (classify(failure) !== 'retry' || retryIndex < 0 || retryIndex >= delays.length) return null;
  const raw = failure.retryAfter;
  const hint = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) * 1000 :
    typeof raw === 'string' ? Date.parse(raw) - now : 0;
  // A long server cooldown is rescheduled, never truncated into an early retry.
  return Math.max(Math.round(delays[retryIndex] * (1 + random() * 0.2)), Number.isFinite(hint) ? hint : 0);
}
// Reject promptly on deadline even if an injected transport ignores cancellation.
export async function abortable(operation, signal, onLateValue = () => {}) {
  signal.throwIfAborted();
  let onAbort;
  const aborted = new Promise((resolve, reject) => {
    onAbort = () => reject(new SourceError('SOURCE_CANCELLED'));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  const pending = Promise.resolve().then(operation);
  pending.then(value => { if (signal.aborted) onLateValue(value); }, () => {});
  try { return await Promise.race([pending, aborted]); }
  finally { signal.removeEventListener('abort', onAbort); }
}
export async function scan({ signal, timeoutMs = 120000, ...options }) {
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await scanPages({ ...options, signal: combined }); }
  catch (error) {
    if (error instanceof SourceError) throw error;
    throw new SourceError(combined.aborted ? 'SOURCE_CANCELLED' : 'SOURCE_UNAVAILABLE');
  } finally { clearTimeout(timer); }
}
async function scanPages({ root, list, detectSubfolders = true, signal }) {
  id(root.id);
  if (root.mimeType !== FOLDER || root.trashed) throw new SourceError('INVALID_SOURCE');
  const queue = [{ ...root, path: [], depth: 0 }];
  const folders = new Set([root.id]);
  const seen = new Set();
  const photos = [];
  const skipped = { trashed: 0, shortcut: 0, unsupported: 0, oversized: 0, subfolder: 0 };
  let pages = 0, entries = 0;
  for (let index = 0; index < queue.length; index++) {
    const folder = queue[index];
    const tokens = new Set();
    let pageToken;
    do {
      signal?.throwIfAborted();
      if (++pages > LIMITS.pages) throw new SourceError('SCAN_BUDGET_EXCEEDED');
      const request = listRequest({ folderId: folder.id, resourceKey: folder.resourceKey,
        driveId: root.driveId, pageToken });
      const page = await abortable(() => list(request, { signal }), signal);
      if (!Array.isArray(page.files) || page.files.length > LIMITS.pageSize || page.incompleteSearch === true) {
        throw new SourceError('INCOMPLETE_SCAN');
      }
      for (const file of page.files) {
        if (++entries > LIMITS.entries) throw new SourceError('SCAN_BUDGET_EXCEEDED');
        id(file.id);
        if (!Array.isArray(file.parents) || !file.parents.includes(folder.id)) throw new SourceError('OUTSIDE_SUBTREE');
        if (file.trashed) { skipped.trashed++; continue; }
        if (file.mimeType === SHORTCUT) { skipped.shortcut++; continue; }
        if (typeof file.name !== 'string' || file.name.length > 4096) throw new SourceError('INVALID_METADATA');
        if (file.mimeType === FOLDER) {
          if (!detectSubfolders) { skipped.subfolder++; continue; }
          if (folder.depth + 1 > LIMITS.depth) throw new SourceError('DEPTH_LIMIT');
          if (folders.has(file.id)) throw new SourceError('UNSTABLE_SCAN');
          if (folders.size >= LIMITS.folders) throw new SourceError('SCAN_BUDGET_EXCEEDED');
          folders.add(file.id);
          queue.push({ ...file, path: [...folder.path, file.name], depth: folder.depth + 1 });
          continue;
        }
        if (seen.has(file.id)) throw new SourceError('UNSTABLE_SCAN');
        seen.add(file.id);
        const status = imageStatus(file);
        if (status !== 'eligible') { skipped[status]++; continue; }
        if (photos.length >= LIMITS.photos) throw new SourceError('PHOTO_LIMIT');
        if (typeof file.version !== 'string' || !file.version) throw new SourceError('INVALID_METADATA');
        photos.push({ providerFileId: file.id, filename: file.name, folderPath: [...folder.path],
          mimeType: file.mimeType, sizeBytes: Number(file.size), sourceVersion: file.version,
          resourceKey: file.resourceKey ?? null });
      }
      pageToken = page.nextPageToken;
      if (pageToken !== undefined) {
        if (typeof pageToken !== 'string' || !pageToken || pageToken.length > 4096 || tokens.has(pageToken)) {
          throw new SourceError('INVALID_PAGE');
        }
        tokens.add(pageToken);
      }
    } while (pageToken !== undefined);
  }
  // Candidate staging data only; caller must publish under DB locks and generation fencing.
  return { photos, skipped, pages, entries, complete: true };
}

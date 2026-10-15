// Design simulator only. Memory resets on reload; no auth, persistence, HTTP or database.
export const projectId = '10000000-0000-4000-8000-000000000001';
export const clock = '2026-10-15T08:00:00Z';
export const photos = [
  ['01', 'IMG_001.jpg', 'Original', 4, 3],
  ['02', 'IMG_001.jpg', 'Edited', 3, 4],
  ['03', 'IMG_001.JPG', 'Original', 4, 3],
  ['04', 'SYNTHETIC_004.png', 'Original', 4, 3],
  ['05', 'SYNTHETIC_005.webp', 'Edited', 3, 4],
  ['06', 'SYNTHETIC_long_filename_for_mobile_006.jpg', 'Original', 4, 3],
].map(([suffix, name, folder, w, h], index) => ({
  id: `20000000-0000-4000-8000-0000000000${suffix}`,
  name, folder, missing: index === 2,
  src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * 100} ${h * 100}"><rect width="100%" height="100%" fill="#e2e8f0"/><circle cx="${w * 65}" cy="${h * 25}" r="28" fill="#94a3b8"/><path d="M0 ${h * 100} L${w * 40} ${h * 40} L${w * 100} ${h * 100}" fill="#64748b"/><path d="M${w * 40} ${h * 100} L${w * 80} ${h * 55} L${w * 100} ${h * 100}" fill="#475569"/><rect x="12" y="12" width="170" height="32" rx="4" fill="#f8fafc"/><text x="22" y="34" font-family="sans-serif" font-size="16" fill="#0f172a">SYNTHETIC ${suffix}</text></svg>`)}`,
}));
export const photo = (id) => photos.find((item) => item.id === id);
const clone = (value) => structuredClone(value);
export function initial() {
  return { canonical: {}, intent: {}, revision: 7, expected: 7, quota: 3, status: 'saved', locked: false, snapshot: null, pendingKind: null, unavailable: null, reconciled: false };
}
export function stage(state, id, note) {
  if (state.locked || ['pending', 'conflict', 'unknown', 'expired'].includes(state.status)) return false;
  if (!photo(id)) return false;
  const removing = note === undefined && Object.hasOwn(state.intent, id);
  if (!removing && !Object.hasOwn(state.intent, id) && Object.keys(state.intent).length >= state.quota) return false;
  if (note !== undefined && [...note].length > 500) return false;
  if (removing) delete state.intent[id]; else state.intent[id] = note ?? '';
  state.expected = state.revision;
  state.status = 'pending'; state.pendingKind = 'save'; state.reconciled = false;
  return true;
}
export function beginConfirm(state) {
  if (state.status !== 'saved' || state.locked || !Object.keys(state.canonical).length || Object.hasOwn(state.canonical, state.unavailable)) return false;
  state.expected = state.revision;
  state.status = 'pending'; state.pendingKind = 'confirm';
  return true;
}
export function respond(state, outcome = 'success') {
  if (state.status !== 'pending') return;
  if (outcome === 'offline') { state.status = 'failed'; return; }
  if (outcome === 'expired') { state.status = 'expired'; return; }
  if (outcome === 'conflict' || outcome === 'other-confirmed') {
    state.canonical = { [photos[5].id]: '' }; state.revision++;
    state.locked = outcome === 'other-confirmed';
    if (state.locked) state.snapshot = { id: 'synthetic-confirmation-other', revision: state.revision, items: clone(state.canonical), at: clock };
    state.status = 'conflict'; state.reconciled = false; return;
  }
  if (state.expected !== state.revision) { state.status = 'conflict'; return; }
  state.revision++;
  if (state.pendingKind === 'save') state.canonical = clone(state.intent);
  else {
    state.locked = true;
    state.snapshot = { id: 'synthetic-confirmation-001', revision: state.revision, items: clone(state.canonical), at: clock };
  }
  state.status = outcome === 'lost' ? 'unknown' : 'saved';
}
export function recover(state) {
  // Canonical read after uncertain save, or same-key confirmation retry in the design story.
  state.intent = clone(state.canonical); state.status = 'saved'; state.pendingKind = null;
}
export function loadConflict(state) { state.reconciled = true; }
export function reapply(state) {
  if (!state.reconciled || state.locked || Object.keys(state.intent).length > state.quota) return false;
  state.expected = state.revision; state.status = 'pending'; state.pendingKind = 'save'; return true;
}

# BL-005 core UX design specification

15 October 2026 · Local design/prototype deliverable. Original low-fidelity wireframes reviewed with synthetic data; final branding remains DEC-005. [Prototype/source](../../prototypes/bl005-ux/README.md) · [executed evidence](BL-005-EVIDENCE.md). No provider or runtime acceptance is implied.

## Scope and traceability

Direct mapping: REQ-GAL-001 → BR-DRIVE-002 / BR-ACCESS-001 → design portions of T-006; REQ-UX-001 → BR-TRACK-001 → design portions of T-016. Counts, displayed save states, dates and freshness follow their owning contracts.

Supporting design constraints, without implementing their backlog services: REQ-PROJ-001 (BR-PROJ-001/002/003), REQ-SEL-001 / REQ-NOTE-001 (BR-SEL-001/002/003), REQ-CONF-001 (BR-CONF-001/002/003/004), REQ-ACCESS-001 (BR-ACCESS-001/002/003/004), REQ-DRIVE-001 (BR-DRIVE-003/004). [PRD](../PRD.md), [Business rules](../BUSINESS_RULES.md), [API](../API.md) and [Database](../DATABASE.md) retain scope/wire/persistence ownership. No changes to those contracts were needed. Startup found documentation and isolated spikes, no application source conflict or root manifest. The prototype does not silently select a framework, provider or credential model.

## Screen inventory and integration boundary

| Wireframe / hash | Content and recoveries | Future integration seam, not implemented here |
|---|---|---|
| Owner create / `#create` | Identity/source, optional phone, subfolders, layout/notes, independent main/download enablement/passwords/absolute deadlines, maximum quota, summary, linked validation, retained inputs and uncertain-create recovery | POST projects, stable request key, atomic server quota/create/job; provider validation |
| Owner detail / `#detail` | Stable project reference, local preview link, inventory pending/ready/empty/failed, last complete sync, current draft vs latest confirmation | Tenant-scoped project/job/selection reads, server freshness, share controls in later work |
| Client access / `#gate` | Neutral cover, dummy password show/hide, wrong-password/throttle feedback, independent download explanation | Main grant only; server password, Retry-After, time/revocation checks; download authorization remains separate |
| Folder gallery / `#gallery` | Root + Original/Edited/empty folder, grid/Masonry, distinct select/enlarge, missing-preview fallback/retry, bounded next batch, count/max and save feedback | Authorized canonical photo IDs/cursor metadata/protected media; never provider IDs in client responses |
| Viewer / modal | Name/path/photo ID, previous/next, contain/zoom/reset, independent select, selected-photo notes, close/focus return | Same protected media/menu policy; no original download implied |
| Review / `#review` | Exact IDs once each, original paths/case/extensions, notes, remove-note consequence, saved-revision confirmation dialog, pending/failed/conflict/unknown/locked states | Revisioned draft save and immutable same-key confirmation; no client reopen |
| Access / `#access` | Expired, generic unavailable, client session ended, owner session ended, temporary outage, suspension; no photos/notes | Server authorization denies independently of cached media; owner reauthentication returns to the retained form, not a client menu grant |
| Components / `#components` | Scoped token/control/feedback inventory | A guide for extracting a later framework component library |

Hashes and review shortcuts are not the proposed product routes. The dashed lab, locale/theme controls and viewport workbench are outside product navigation. No unimplemented marketing, account, archive, export, reopen, download, payment, staff, extra/print or ZIP buttons are presented. Configuration of supported downloads is a design field, not a download integration claim.

## Semantic tokens

The reusable implementation is [tokens.css](../../prototypes/bl005-ux/tokens.css); components consume variables rather than embedding separate theme values.

| Role | Light | Dark |
|---|---|---|
| `background` / `surface` | `#F8FAFC` / `#FFFFFF` | `#0F172A` / `#1E293B` |
| `text` / `muted` | `#0F172A` / `#475569` | `#F8FAFC` / `#CBD5E1` |
| `primary` / `on-primary` | `#1D4ED8` / `#FFFFFF` | `#93C5FD` / `#0F172A` |
| `error` / `success` / `warning` | `#B91C1C` / `#166534` / `#854D0E` | `#FCA5A5` / `#86EFAC` / `#FDE047` |
| `border` / `soft` | `#64748B` / `#E2E8F0` | `#94A3B8` / `#334155` |
| `focus` | `#1D4ED8` | `#93C5FD` |

System theme follows `prefers-color-scheme`; explicit light/dark overrides it. System sans-serif, body 16px / 1.5; headings 1.85rem and 1.2rem. Space scale 4/8/12/16/24/32/48px; control radius 8px; panel radius 12px; maximum content 1280px; dialog 800px with 16px edge clearance; control target minimum 44px. Checkbox inputs are 22px inside a ≥44px clickable label. Focus uses a 3px outline with a 3px offset. Motion is a 120ms hover transition, removed under reduced-motion preference. `soft` is decorative separation, not the sole control/focus/selection boundary.

Executed numeric checks cover text/muted/error/success/warning on both surface and background ≥4.5:1, primary/on-primary ≥4.5:1, border/focus against both surfaces ≥3:1. Selection uses outline, checked symbol, `aria-pressed` and text together. Actual assistive-technology and every rendered state still require release verification.

## Reusable component inventory

| Component | States / props | Keyboard, focus and semantics |
|---|---|---|
| Page heading + skip link | Audience, title, intro | One h1; route transitions focus h1; skip to main |
| Project field / checkbox / fieldset | Required, optional, invalid, disabled, preserved value, help | Label association, description, `aria-invalid`; error summary links to each field and receives focus on failed submit |
| Workflow configuration | Enable, max quota, independent password/date | Disabled children follow corresponding enabled menu; summary shows absolute WITA UTC+08 dates or explicit no deadline |
| Feedback / badge / live announcement | Pending, saved revision, confirmed, validation, failed, unknown, conflict, expired | Text states; polite atomic live region persists through rendering; failures have alerts; focus is not stolen on acknowledgement |
| Neutral cover / inventory status | Initial pending, complete empty, ready, failed retaining previous complete data | No pre-grant photo cover; no invented progress percentage; safe owner retry |
| Folder controls / batch loader / layout toggle | Root/active/empty; bounded shown/total; grid/Masonry | Native buttons, pressed state, count announcements; no page-wide horizontal overflow |
| Photo card | Stable ID, original name/path, selected/unselected, preview failure | Select and enlarge are separate buttons with disambiguated name/folder/ID suffix; selection does not open viewer; filenames wrap |
| Selection bar | 0…quota, pending/failed/saved/conflict/unknown/locked | Still permits deselection at max; serializes pending gestures; blocked selection remains focusable with `aria-disabled` and visible reason |
| Viewer | Image contain, zoom/reset, unavailable, selected, next/previous | Modal dialog, Tab wrapping, Escape, focus return to originating card; arrows navigate current folder or review items; Space selects only outside input/native button handling |
| Note editor | Plain text, 500 code points, invalid 501+, cancel/save | Native textarea; live validation without focus theft; note never interpreted as HTML |
| Remove-note / confirm dialog | Explicit consequence, safe cancel, commit action | Native modal; cancel initially focused; Escape cancels; focus returns to opener |
| Review item / confirmed result | Original identity, note, unavailable source, locked historical snapshot | ID-keyed list, no filename deduplication; unavailable item remains visible and blocks confirm; locked controls disabled with explanatory status |
| Access gate / unavailable panel | Wrong password, throttle, expired, revoked/unknown, session, service, suspended | Named password input, retain on show/hide; no photo disclosure; only applicable recovery actions |

The implementation is deliberately a small set of vanilla rendering functions/styles. Extract these contracts into the selected application framework later; do not import the memory simulator as a production service or permission layer.

## Responsive layout

| Width | Owner create/detail | Gallery | Review / viewer / states |
|---|---|---|---|
| 360px | Single column; summary follows form; 16px outer padding; form fields stack | Two columns; controls wrap; file/path text always accessible; selection bar in document flow | Review thumbnail + wrapping identity; dialogs viewport bounded and scrollable; actions wrap |
| 768px | Single column with paired fields; 24px outer padding | Three columns; folders/layout controls wrap naturally | Review uses available width; viewer contain area 40dvh, zoom 65dvh; narrow access panel |
| 1440px | 2:1 content/summary split within 1280px; paired fields | Four columns; bounded next batch; Masonry preserves source aspect ratio | Content bounded; no wide full-screen dialog or page table overflow |

At ≤600px fields stack/two gallery columns; 601–1100px gallery uses three; >1100px four. Owner split stacks at ≤800px. Text reflows and grid/form children have `min-width:0`; do not hide overflow to conceal inaccessible content. The selection bar stays in document flow to avoid obscuring controls at large text sizes. Masonry uses CSS columns and the DOM remains the keyboard reading order (down each column). Confirmed snapshot rows use stable IDs even when names match.

The workbench's 200% text control sets 32px root text and is explicitly labeled a QA aid; it is not browser zoom. Direct `?text=200` supports the same check without frame automation. Native browser zoom/real touch devices remain T-016 integration/release checks.

## Save, conflict and recovery choreography

| State | UI action / guard | Integration obligation |
|---|---|---|
| Local pending | Show unsaved immediately; do not confirm; selection changes serialized | Send full desired IDs/notes with acknowledged expected revision |
| Saved | Show canonical acknowledgement/revision; enable confirm for ≥1 valid item | Durable acknowledgement from server, not elapsed timer |
| Failed | Retain intent; Retry stays visible; do not label as saved | Honor retryability; keep acknowledged data intact |
| Unknown save response | Retrieve canonical state before continuing | Reconcile revision and desired intent without force-writing an old revision |
| Conflict | Keep local intent visibly unsaved; first load canonical; then deliberate reapply or use canonical | 409/current revision, no automatic overwrite; project then set lock order remains server responsibility |
| Other tab confirmed | Show lock and retained intent; no reapply control | Fetch locked state; only owner with reason/entitlement may reopen |
| Unknown confirmation response | Retry/retrieve same synthetic result | Reuse original request key and exact revision after current authorization checks |
| Confirmed | Saved time, count, revision, immutable synthetic snapshot; read-only choices/notes | Actual transactional snapshot, lock, idempotency and history |
| Expired/session ended | Hide protected content, preserve acknowledged data and local intent in memory | Reauthorize, revalidate current revision/access; never silently renew workflow deadline |
| Unavailable selected source | Keep ID/name/path visible, allow explicit removal/replacement; block confirm | Complete inventory publication only, no tombstones from partial failure |

Simulator caveats: one local state object, no true concurrent tabs or durable locks, fixed fixture time, demo throttle elapsed button and fixed dummy password, static project/confirmation references. Lost-response behavior is a design story, not proof of idempotency. Reload is an intentional prototype reset; production must restore canonical acknowledged data. State presets may invent a presented scenario but never claim provider outcomes. Source fallback only retries a synthetic preview.

## Localization

[strings.mjs](../../prototypes/bl005-ux/strings.mjs) holds paired ID/EN keys and named interpolations; the checker enforces matching keys/placeholders and fully resolves fixture values. State labels include pending/saved/confirmed/conflict/expired and all recoveries. Filenames, case, extensions, folder names and stable references do not translate. Dates use `Intl.DateTimeFormat` with Asia/Makassar and an explicit WITA UTC+08 suffix. The fixed clock is 15 October 2026 16:00 WITA; expiry presets are separate simulated scenarios. Gallery copy explains the shared collaborative set and maximum quota rather than mandatory completion. Workbench chrome is English reviewer tooling; the product wireframes are ID/EN.

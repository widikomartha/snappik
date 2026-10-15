# BL-005 design verification evidence

Date: 15 October 2026 (Asia/Makassar). Starting branch/HEAD: master / `9cb7fbb`, clean. Evidence was collected against the uncommitted local BL-005 files in [prototype](../../prototypes/bl005-ux/README.md). Scope: original low-fidelity design, no production application or provider. No commit, push, publish or deployment.

Environment: Windows, PowerShell 7.6.5, Node 24.18.0, npm 11.16.0; Codex in-app browser via CUA. Browser engine version was not exposed by the read-only browser API (user-agent access unavailable); do not infer a Chrome/Edge version. Viewports are CSS-pixel browser overrides, not real devices. No new packages installed.

## Executed command evidence

From repository root:

| Command / check | Result | Meaning |
|---|---|---|
| `Get-Location`; `git status --short`; inspected source/manifests/locks/startup documents | Passed | Workspace `D:\Website\snappik`, initially clean; root application absent; only BL-001/002 isolated spikes |
| Own `.write-probe` write/read/remove under prototype directory | Passed | Local write works; only the agent-created probe removed |
| `node --version`; `npm --version`; `pwsh --version` | Passed | Versions recorded above |
| `npm --prefix prototypes/bl005-ux install --package-lock-only --ignore-scripts --no-fund --no-audit --offline` | Passed, exit 0 | Dependency-free isolated lock, no provider/registry connection |
| `npm --prefix prototypes/bl005-ux run check` | Passed, exit 0 | Syntax of app/model/strings/static server/workbench |
| `npm --prefix prototypes/bl005-ux test` | Passed, 10/10; zero skipped/failed | Design stories, Unicode, same-name identity, acknowledgement/conflict/locked/unknown recovery, ID/EN parity and numeric semantic contrast; not application tests |
| `npm --prefix prototypes/bl005-ux run preview` | Passed | Owned loopback listener at `127.0.0.1:4175`; static allowlist only; stopped after QA |
| `(Invoke-WebRequest http://127.0.0.1:4175/app.html -UseBasicParsing).StatusCode` | Initially Blocked by sandbox socket permissions, then Passed: 200 with local network escalation | No external service; first sandbox listener was stopped and loopback preview restarted with local-network permission |
| `pwsh -NoProfile -File docs/tools/validate-docs.ps1` | Passed, exit 0: 41 Markdown files, 232 local links, 2 JSON examples | Documentation links/IDs/JSON only |
| `git diff --check` and scoped diff/new-file review | Passed, exit 0; line-ending normalization warnings only | Whitespace/scope verification, not a commit |

## Browser review steps actually executed

The browser was operated through CUA locators/keyboard, with DOM snapshots and read-only layout measurements. The following are **prototype** passes only:

| Scenario / reproducible action | Observed result |
|---|---|
| At 360px clear client label → save → error summary → activate field error link | Summary focused; link focuses `clientLabel`; no page overflow; typed input retained |
| Lab response lost → create with empty phone → recover same project | Pending, then unknown result; recovery opens fixed stable project detail with inventory pending; no false inventory readiness |
| Finish synthetic inventory → preview client | Neutral password gate; no photo cover before simulated grant |
| Expired owner session during creation → resume after simulated login | Distinct owner-session screen; label `Owner retained · Synthetic` survives return to the form; no client menu-grant substitution |
| Wrong dummy password; then correct `fixture-main`; five wrong attempts in a separate gate run | Clear wrong-password state; correct grants simulated gallery; fifth attempt disables submit and shows 60-second throttle; elapsed-time action restores it |
| Space on selection button for Original #01 | Selected/pending, no viewer opened; focus retained on same selection button; pending confirm disabled |
| Deliver hold response; select and acknowledge #02 and #03 | Three separate IDs despite names `IMG_001.jpg`, `IMG_001.jpg`, `IMG_001.JPG`; count 3/3; unselected add blocked and deselection available |
| Enlarge using Enter; Shift+Tab from close; ArrowRight; Escape | Modal opens; focus wraps inside dialog; next file path changes Original → Edited; Escape returns to originating card |
| Open review viewer after navigating an empty gallery folder; then remove a selected item with a note | Viewer still navigates the review's selected IDs; note-removal dialog can cancel, then explicitly remove; after row removal focus moves to page heading rather than body |
| Edit note with 500 emoji, then 501; save `<b>synthetic</b> =1+1` | 500 code points valid; 501 disables save with error; note displayed as literal text, no rendered b element |
| Load next batch; open empty folder; missing preview retry | Initial 4/6 → 6/6; empty 0/0 explicit; preview fallback retains identity/control and explains retry failure |
| Masonry at 768px | Three columns; measured portrait 223×297 and landscape 223×167; original proportions retained, filenames visible |
| Deselect #03 with held response → deliver conflict → load canonical → deliberately reapply | Local #01/#02 retained unsaved; canonical separate #06/revision shown; explicit reapply yields saved new revision; no automatic merge |
| Deliver another-tab-confirmed response → load canonical | Local unsaved intent and locked canonical result shown separately; reapply control absent |
| Select #03 → offline → retry and acknowledge | Visible failed status/local intent retained, then saved only after acknowledgement |
| Mark selected #01 unavailable → review | Photo stays identified, source warning visible, confirm disabled; returning to ready enables valid confirmation |
| Confirm via Enter → response lost → check saved result | Unknown confirmation state first; recovery displays same synthetic confirmation ID, time/count/revision; note/removal controls disabled |
| Access presets expired/revoked/client-session/owner-session/service/suspended in both ID and EN | 12 observations at 360px, no images/photo-ID elements and no overflow; no internal diagnostics or source credentials shown |
| Create/detail/gallery/review/access/components at 360 ID dark, 768 EN dark, 1440 EN light | 18 measurements, zero page-wide overflow; gallery 2/3/4 columns; [responsive results](../../prototypes/bl005-ux/evidence/responsive.json) |
| Same six pages at 200% text via direct `?text=200` at all three widths | 18 measurements at 32px root text, client width equals scroll width; [text reflow results](../../prototypes/bl005-ux/evidence/text-200.json). Review was empty in this reflow run; populated review tested at normal size separately |
| Browser application console after core journey | No warning/error entries at that inspection |

Failures found and corrected: missing pending announcement; Shift+Tab escaping native dialog in this browser; form intrinsic width causing overflow at 200% text. Corrected via persistent live announcement, explicit modal Tab wrapping, min-width containment/wrapping. Normal 18-layout matrix rerun after fixes. Viewer navigation was also corrected to use selected review IDs when opened from review rather than a stale gallery folder filter.

Automation limitations: ambiguous locators were narrowed to lab/main; `Control+Home` and an iframe batch exceeded automation limits. The iframe batch produced no retained pass record; direct-page 200% checks replaced it. DOM sandbox does not expose iframe `contentDocument` or navigator user agent; frame locators/direct page used instead. These are not product runtime test passes or asserted provider failures.

## Visual evidence

All captures contain only original synthetic SVG drawings and fixture identifiers. No private research/audit imagery. Widths in filenames refer to the prototype viewport; the frame workbench is separate.

- [Create 1440 EN light](../../prototypes/bl005-ux/evidence/create-1440-en-light.png)
- [Gallery 1440 EN light](../../prototypes/bl005-ux/evidence/gallery-1440-en-light.png)
- [Gallery 768 EN dark / Masonry](../../prototypes/bl005-ux/evidence/gallery-768-en-dark.png)
- [Viewer 768 EN dark](../../prototypes/bl005-ux/evidence/viewer-768-en-dark.png)
- [Confirmed 768 EN dark](../../prototypes/bl005-ux/evidence/confirmed-768-en-dark.png)
- [Gallery 360 ID](../../prototypes/bl005-ux/evidence/gallery-360-id.png)
- [Review 360 ID](../../prototypes/bl005-ux/evidence/review-360-id.png)
- [Owner detail pending 768 ID dark](../../prototypes/bl005-ux/evidence/detail-pending-768-id-dark.png)
- [Expired access 360 ID dark](../../prototypes/bl005-ux/evidence/access-expired-360-id-dark.png)
- [Locked conflict 768 ID dark](../../prototypes/bl005-ux/evidence/conflict-locked-768-id-dark.png)
- [Access measurements](../../prototypes/bl005-ux/evidence/access.json)

## Acceptance boundary and next integration action

BL-005's design deliverables are complete: scoped synthetic creation/detail/gallery/viewer/review/error/access flows reviewed, tokens/components supplied, responsive/keyboard/localization feedback exercised, no future-feature dead controls. This closes the **design/prototype work item only**.

T-006: design subset Passed (identity/folders/fallback/bounded fixture batches/distinct actions); full runtime acceptance **Not run**. No actual protected media, API cursor or authorization implementation exists.

T-016: design subset Passed (recorded widths, keyboard/modal behavior, copy parity, text reflow, semantic contrast); full runtime acceptance **Not run**. Native browser 200% zoom, assistive-technology announcements, actual iOS/Android, Firefox/Safari and full integrated keyboard journey remain. Reduced-motion/system theme handling exists in CSS; OS-preference changes were not exercised.

Persistence/concurrency/provider tests: **Not applicable to this design prototype / Not run for the application**. No PostgreSQL, real grants, CSRF, durable acknowledged recovery, atomic lock order, actual retry keys, historical reopen, provider resync or download claim. DEC-001/002/003 stay open; BL-001/002 stay In progress. No blocked external resource prevents this design slice.

First action in the next integration chat: read the [BL-005 handoff](../agents/handoff-2026-10-15-BL-005.md), inspect actual manifests/Git, and check BL-007/008 readiness before starting BL-009. The application scaffold and server/media boundaries must exist before calling T-006/T-016 integration acceptance. Choose one backlog ID in that new chat; do not expand this one.

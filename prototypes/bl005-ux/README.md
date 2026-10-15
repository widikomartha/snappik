# BL-005 local UX wireframes

Original, low-fidelity Snappik design prototype. **Synthetic and memory-only**: no application routes, authentication, database, Drive, persistence, downloads or provider integration. Reloading clears the simulation. Do not enter real data or passwords.

From the repository root, using the inspected Node 24.18.0 / npm 11.16.0 runtime:

```powershell
npm --prefix prototypes/bl005-ux run preview
```

Open [the workbench](http://127.0.0.1:4175/) or [the direct prototype](http://127.0.0.1:4175/app.html). Stop with Ctrl+C. No install/build is required; the isolated manifest/lock has zero dependencies. This is not the BL-003 application scaffold. If the port is busy, inspect its owner; do not terminate an unknown process.

```powershell
npm --prefix prototypes/bl005-ux run check
npm --prefix prototypes/bl005-ux test
```

## Review a journey

1. Create project: leave phone empty, save; detail shows an existing project with inventory pending. Complete the synthetic inventory. Use the lab's next response = lost to review same-project recovery.
2. Client access: neutral cover, password `fixture-main` (a public dummy string). A wrong value shows an error; five attempts show the throttled state. The explicit elapsed-time button only simulates Retry-After.
3. Gallery: root, Original, Edited, empty folder; 4 initial cards then at most 4 more per click. Select the first three images: identical names/case variants remain separate IDs. Selection and Enlarge are independent controls. Grid and Masonry keep filename access.
4. Review: exact IDs/names/paths/notes, maximum 3 rather than required 3. Save/confirm remains blocked while awaiting acknowledgement. Confirm locks the synthetic snapshot; owner detail displays it separately from the draft.
5. Errors: expand the dashed lab panel. Choose the next response **before** an action. Normal responses arrive after 900 ms; Hold leaves pending visible until Deliver. Offline retains local intent; conflict requires canonical inspection and deliberate reapplication; another-tab confirmation prohibits reapplication; lost save checks canonical state; lost confirmation retrieves the same synthetic result; expiry hides protected content.
6. Inventory presets cover preparing, complete empty, failed refresh retaining previous inventory, and unavailable selected source. Access presets cover expired, generic unavailable, session ended, temporary outage and suspension. Lab presets are presentation scenarios, not policy implementations.

Language, theme and the dashed navigation are review tools outside the scoped product screens. Shortcuts to gallery/review require the synthetic main grant. Download appears only as independent configuration/help; no inactive download, ZIP, print, staff, payment or messaging control is included.

## Responsive and keyboard review

Workbench widths set the inner viewport to 360/768/1440 CSS px. Its outer labeled frame region may scroll intentionally. For browser verification, use the direct page with actual viewport overrides. Text scale 200% (also `app.html?text=200`) is a text-reflow aid, **not actual browser zoom**. Native zoom and real-device/assistive-technology verification remain release work.

Use Tab/Shift+Tab in visual order, Enter/Space on native controls, visible focus, and the skip link. Viewer arrows navigate; Space outside controls/inputs selects; Escape closes and returns to the originating card. Native modal semantics plus explicit Tab wrapping contain focus. Photo selection buttons stay focusable with `aria-disabled` during pending/quota/lock states so keyboard focus is retained; visible feedback explains the blocked action. Notes count Unicode code points. Deselecting a photo with a note opens a consequence dialog.

## Source and evidence

| File | Purpose |
|---|---|
| [tokens.css](tokens.css) | Reusable semantic light/dark/system tokens, spacing, type, targets and motion |
| [styles.css](styles.css) | Responsive component layouts and focus styles |
| [strings.mjs](strings.mjs) | Complete paired ID/EN copy with checked interpolations |
| [app.mjs](app.mjs) | Interactive wireframes; no production services |
| [model.mjs](model.mjs) | Isolated memory-only design state and original synthetic SVG fixtures |
| [serve.mjs](serve.mjs) | Loopback-only allowlisted static server; repository/research not served |
| [prototype.test.mjs](prototype.test.mjs) | Design-story invariants, copy parity and contrast checks |
| [evidence](evidence) | Sanitized browser captures and measured layout results |

See [component/state specification](../../docs/design/BL-005-UX.md), [executed evidence](../../docs/design/BL-005-EVIDENCE.md) and [handoff](../../docs/agents/handoff-2026-10-15-BL-005.md). All source photos are original inline SVG drawings marked SYNTHETIC; no audit assets, private research or third-party imagery were used.

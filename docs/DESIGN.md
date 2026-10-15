# Product and interface design

Status: baseline interaction specification with reviewed local BL-005 wireframes. [Prototype and component specification](design/BL-005-UX.md) and [executed design evidence](design/BL-005-EVIDENCE.md) now exist; final visual branding remains DEC-005. This defines Snappik's own design language. Do not copy Fastpik logos, artwork, copy or screenshots into product UI.

## Principles

Prioritize the photo and the current task. Show whether changes are pending, saved or confirmed. Keep destructive and access-changing actions explicit. Maintain identical counts and photo identity between gallery, review and studio results. Phone/contact details must not interrupt creation when they are irrelevant to the selected workflow.

## Information architecture and page inventory

| Path | Audience | Required content / states |
|---|---|---|
| `/` | Visitor | Value proposition, genuine product preview, features, pilot access CTA |
| `/features`, `/help` | Visitor | Supported features only, Drive/access explanation, FAQ |
| `/privacy`, `/terms` | Everyone | Reviewed policy text matching retention/access; content gated by DEC-006 |
| `/login`, `/register`, `/recover` | Owner | Provider-backed auth, accessible errors, safe return destination |
| `/onboarding` | Owner | Studio identity, setup progress, incomplete/retry/success |
| `/app` | Owner | Totals, pending choices, next seven days' deadlines, recent projects |
| `/app/projects` | Owner | Search/filter, list/cards, empty/loading/error, archive filter |
| `/app/projects/new` | Owner | Guided creation and preview of selected workflow rules |
| `/app/projects/:id` | Owner | Inventory status, public link, configuration, results, source health, archive |
| `/app/projects/:id/edit` | Owner | Prefilled config, exact preserved deadlines, unsaved-change guard |
| `/app/status` | Owner | Not started/selecting/confirmed filters; last refresh; links to results |
| `/app/settings` | Owner | Studio identity, defaults, language/timezone; no inactive future feature tabs |
| `/app/account` | Owner | Profile, auth-provider recovery, trial/manual plan status and usage |
| `/g/:token` | Client | Neutral branding placeholder before authorization; enabled menus only; generic unavailable state; project-photo covers require a valid menu grant |
| `/g/:token/main` | Client | Access gate, gallery, selection counter, notes, review entry |
| `/g/:token/main/review` | Client | Selected files/folders/notes, edit and confirmation action |
| `/g/:token/main/confirmed` | Client | Saved confirmation time/count, read-only result, menu return |
| `/g/:token/download` | Client | Separate gate, browsing and individual download actions |
| `/ops`, `/ops/studios`, `/ops/studios/:id` | Operator | Setup/job diagnostics, scoped actions and reasoned audit references |

No self-service pricing/checkout page in the invitation-only MVP; account page states pilot terms plainly. A commercial release must add approved pricing and payment flows, not placeholder buy buttons.

## Navigation

Owner desktop sidebar: Overview, Projects, Selection Status, Settings, Account. Small screens use an accessible drawer with focus return. Operator navigation is visually distinct and never shown solely based on a user-supplied role flag. Client pages contain only project actions; do not expose owner navigation or contact details by accident.

## Visual baseline

Proposed tokens, subject to mockup review:

| Token | Light | Dark |
|---|---|---|
| Background | `#F8FAFC` | `#0F172A` |
| Surface | `#FFFFFF` | `#1E293B` |
| Primary text | `#0F172A` | `#F8FAFC` |
| Muted text | `#475569` | `#CBD5E1` |
| Primary action | `#1D4ED8` with white text | `#93C5FD` with `#0F172A` text |
| Error text | `#B91C1C` | `#FCA5A5` |

Validate actual contrast in the rendered component states; token suggestions alone do not establish accessibility. Use system sans-serif initially, 16px body, 1.5 line height, 4px spacing scale, 8px control radius and restrained shadows. Controls should have 44×44px touch targets. Photos keep correct aspect ratio; selection is signaled by checkbox/icon plus outline and text, not color alone.

Support light/dark/system themes and Indonesian/English UI. Product language defaults to studio setting; clients may override locally. Explicit dates localize using configured timezone; relative countdowns are supplementary. Never render unresolved translation placeholders. File names remain unchanged across languages.

## Key components and interactions

- **Project form:** sections for identity/source, gallery appearance, main selection, download and access. Disabled fields explain why. Error summary links to invalid controls. Display absolute expiry preview alongside duration input. Omitted edit values remain unchanged.
- **Photo card:** thumbnail, original name, folder context when ambiguous, selection control and separate enlarge action. Selecting must not unexpectedly enlarge. Keyboard controls expose both actions with accessible labels.
- **Viewer:** previous/next, zoom/reset, filename/folder, select/unselect and note action. Escape closes; arrows navigate; Space selects only when focus is not in an editable input. Restore focus to the originating card.
- **Selection bar:** maximum quota, pending/saved indicator, review action. Disable confirm while save pending/failed. At quota, keep deselection available and explain why another selection is blocked.
- **Note editor:** plain text, 500-code-point counter, cancel/save. Announce validation without stealing focus. Explicitly warn that removing a selected photo removes its current draft note.
- **Review:** exact selected IDs rendered once each, original names/paths and notes. Confirm dialog states locking behavior; no WhatsApp dependency.
- **Results:** latest confirmation vs current draft labeled distinctly. Copy/export includes enough identity to disambiguate same-name files. CSV is a download, not a textarea containing stripped basenames.
- **Access gate:** password-specific label, show/hide toggle, throttling feedback. Generic unavailable state for unknown/revoked links; no diagnostic secrets.
- **Job status:** preparing/ready/failed with progress only when meaningful; last successful sync, error explanation and permitted retry. Do not show invented percentages.

## State contract

Every data-driven page must implement loading, empty, success, partial/stale data, validation failure, authorization failure and service failure where applicable. No full-screen blank while recovering a save. Project creation returns a durable detail route before image inventory finishes. A lost navigation response must allow recovery without resubmission under a new key.

Use explicit confirmations for archive, link rotation, reopen and operator suspension. Include affected project/studio and consequence. Bulk deletion, purging and mass external notifications have no MVP UI.

## Responsive and accessibility checks

Test at 360px, 768px and 1440px widths and at 200% zoom. Table content can scroll inside a labeled region without causing page-wide overflow. Grid starts at two columns on small screens and grows based on minimum readable card width; retain filename access in Masonry too.

Keyboard-only core journey, semantic labels, dialog focus trapping/return, status announcements, reduced-motion preference, visible focus and sufficient contrast are release requirements. See T-016. Full compliance certification is not implied by this document.

## Design deliverables before UI implementation

BL-005 produces low-fidelity owner creation/detail, client gallery/review and error/recovery screens, then a reusable component inventory. Review the workflow with synthetic photos and duplicate-name fixtures. Do not embed the private audit gallery or its subjects into public prototypes.

Delivered 15 October 2026: [local interactive wireframes](../prototypes/bl005-ux/README.md), paired ID/EN strings, reusable CSS tokens and [component/state/responsive specification](design/BL-005-UX.md). Browser review covers scoped creation/detail/gallery/viewer/review/error flows with original synthetic SVG images. BL-005 is Done for design/prototype; T-006/T-016 full runtime acceptance remains unexecuted. The memory simulator is not a production application, persistence layer or authorization control. See [evidence and limitations](design/BL-005-EVIDENCE.md).

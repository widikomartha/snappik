# Snappik documentation

Version: 0.3 · Updated: 15 October 2026 · Status: local web/worker/PostgreSQL foundation, app-side onboarding subset, feasibility spikes and UX prototype; provider integration pending.

Snappik is a photo-selection and delivery application for studios and their clients. These documents define a new product informed by a Fastpik audit; they do not describe an existing Snappik implementation or reproduce Fastpik's private architecture.

**AI agents start with [the agent guide](agents/README.md).** Repository-wide instructions are in [AGENTS.md](../AGENTS.md). The [project state](agents/PROJECT_STATE.md) distinguishes implemented artifacts from planned application behavior; the [implementation guide](agents/IMPLEMENTATION_GUIDE.md) explains how to execute the backlog.

## Read in this order

| Document | Owns |
|---|---|
| [PRD](PRD.md) | Scope, requirements, success criteria and exclusions |
| [Business rules](BUSINESS_RULES.md) | Authoritative product invariants and state transitions |
| [User flows](USER_FLOWS.md) | Journeys, recoveries and permission boundaries |
| [Architecture](ARCHITECTURE.md) | Components, ownership and technical approach |
| [Database](DATABASE.md) | Logical schema, constraints and transactions |
| [API](API.md) | HTTP contracts, errors and concurrency |
| [Design](DESIGN.md) | Pages, navigation, components and interaction states |
| [Security](SECURITY.md) | Access model, threats and controls |
| [Test plan](TEST_PLAN.md) | Acceptance and release verification |
| [Backlog](BACKLOG.md) | Ordered work, dependencies and completion criteria |
| [Traceability](TRACEABILITY.md) | Requirement → rule → work item → test mapping |
| [Deployment](DEPLOYMENT.md) | Environments, operations and release runbook |
| [Decisions](decisions/README.md) | Architectural decisions and unresolved choices |
| [Agent documentation](agents/README.md) | Task startup, implementation, engineering, verification and handoff |

## Evidence and terminology

- **Observed:** exercised in the Fastpik audit. [Live tests](research/fastpik-live-tests.md) supersede corresponding limitations in the [initial audit](research/fastpik-audit.md).
- [Research index](research/README.md) lists the audit reports and local evidence.
- **Inferred:** a likely explanation of Fastpik behavior, not verified internal implementation.
- **Baseline:** the proposed Snappik implementation contract in this folder. It is not a claim about Fastpik.
- **Open:** unresolved choice recorded as `DEC-*`; affected work must resolve its dependency first.

| Term | Definition |
|---|---|
| Studio / tenant | Ownership and isolation boundary for projects and settings |
| Studio owner | Authenticated paying or trial user managing that studio |
| Client | Account-free recipient of a project link; not a studio member |
| Platform operator | Separately authorized Snappik support/operations user |
| Project | Client delivery job with one Drive source and enabled workflows |
| Workflow | Independently configured main selection or download access; extras/print later |
| Source folder | Google Drive folder; distinct from future internal project folders |
| Photo identity | Project-scoped reference to a stable Drive file ID |
| Confirmation | Immutable snapshot of chosen files/notes at a particular revision |
| Entitlement | Time-limited permission for studio write operations and limits |
| Share token | High-entropy bearer link identifier; possession grants discovery, not owner access |

## First-release boundary

MVP includes one owner per studio, account-free galleries, one main selection set per project, individual downloads, limited operator diagnostics, and trial/manual entitlement grants. Automated payments, staff invitations, extras, printing, batch import, Telegram, custom domains and CRM synchronization are outside MVP. See [PRD](PRD.md) for exact requirements.

Baseline technical shape: TypeScript web application, Next.js presentation/API layer, PostgreSQL persistence, private object storage for derived images, and a worker from the same codebase. BL-003 provides [local setup](../README.md), pinned framework/lockfile, initial schema/scoped repositories, queue/audit/idempotency, CI setup and [actual PostgreSQL evidence](foundation/BL-003-EVIDENCE.md). Auth provider, Drive access method and hosting remain open through decision gates; no live credentials/provider integration is installed.

Executed feasibility subsets: [BL-001 auth](auth/BL-001-EVIDENCE.md) and [BL-002 Drive/hosting](drive/BL-002-EVIDENCE.md). These isolated spikes do not scaffold the application or close their provider gates.

BL-004 [onboarding evidence](auth/BL-004-EVIDENCE.md) and [active handoff](agents/handoff-2026-10-15-BL-004.md) record implemented PostgreSQL provisioning/setup, fail-closed owner APIs and setup/access pages. Synthetic server sessions verify only the app-side subset; real login/logout/recovery remain gated by DEC-001.

Completed design/prototype deliverable: [BL-005 wireframes](../prototypes/bl005-ux/README.md), [tokens/components/states](design/BL-005-UX.md), [browser review evidence](design/BL-005-EVIDENCE.md). This separate, synthetic, memory-only prototype does not implement application routes, server authorization or persistence and does not pass full T-006/T-016.

## Document maintenance

Requirement IDs (`REQ-*`) are stable. `BR-*` identifies business rules, `BL-*` backlog work, `T-*` tests, and `DEC-*` open decisions. Changes to a requirement must update its rule, API/schema/design impact and traceability row. Mark work Done only with item-level evidence; BL-001/002/003 are In progress, BL-005 is Done for design/prototype only, and other implementation items remain Todo.

Business rules take precedence for behavior; PRD owns scope; API owns wire contracts; Database owns persistence. Resolve contradictions by updating all affected files rather than duplicating a new rule elsewhere. Dates in records use UTC; UI localizes them using studio/browser preferences.

Research contains project/source links and private operational context. Keep it local/private and exclude it from public documentation publishing. Original root-level audits are preserved; copies here repair relative links to locally copied evidence. Do not place account passwords or provider keys in documentation.

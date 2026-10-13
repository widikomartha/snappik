# Snappik documentation

Version: 0.2 · Updated: 13 October 2026 · Status: implementation planning baseline with agent execution guidance.

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

Baseline technical shape: TypeScript web application, Next.js presentation/API layer, PostgreSQL persistence, private object storage for derived images, and a worker from the same codebase. Auth provider, Drive access method and hosting must be selected through the decision gates. No framework versions, credentials or production integrations are installed by these docs.

## Document maintenance

Requirement IDs (`REQ-*`) are stable. `BR-*` identifies business rules, `BL-*` backlog work, `T-*` tests, and `DEC-*` open decisions. Changes to a requirement must update its rule, API/schema/design impact and traceability row. Mark work Done only after its acceptance tests pass; all implementation items currently remain Todo.

Business rules take precedence for behavior; PRD owns scope; API owns wire contracts; Database owns persistence. Resolve contradictions by updating all affected files rather than duplicating a new rule elsewhere. Dates in records use UTC; UI localizes them using studio/browser preferences.

Research contains project/source links and private operational context. Keep it local/private and exclude it from public documentation publishing. Original root-level audits are preserved; copies here repair relative links to locally copied evidence. Do not place account passwords or provider keys in documentation.

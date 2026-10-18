# ADR-008: DEC-003 deployment and private storage investigation

Date: 18 October 2026 (Asia/Makassar). Status: **conditional recommendation; DEC-003 OPEN / PARTIALLY VALIDATED**. Supplements ADR-005 for DEC-003 only; does not replace DEC-002/ADR-007 or approve a production provider. No infrastructure provisioned, account connected, deployment, purchase or production change.

## Context and scope

Startup verified clean local `master` / `eb359d0889848a907fe18e9c89f782165cb5292f`. Contrary to ADR-005's historical snapshot, the app now has a Next web entry, compiled worker/migration CLI and PostgreSQL lease/fencing foundation. Existing evidence is retained, not rerun or relabeled as hosted proof. The owner confirmed in this chat that **budget and data-location requirements are not established**.

Scope: BL-002's DEC-003 investigation, prerequisite to BL-003 operational setup, BL-013 downloads and BL-017 release. Relevant contracts: REQ-DL-001, REQ-REL-001, REQ-GAL-001, REQ-OBS-001, REQ-RET-001; BR-DL-001, BR-DRIVE-001, BR-REL-001/002, BR-RET-001/002. Architecture owns process boundaries; Deployment owns configuration/releases; Security owns access/secrets/logging; Database owns migrations/leases/history; API owns controlled photo responses. T-013/T-017/T-020/T-022 remain incomplete. No product, wire or persistence change is made.

## Criteria and minimum capabilities

Prefer the smallest operational design that preserves acknowledged state and can later serve multiple tenants. Hard requirements: independent persistent web/worker processes from one release; direct PostgreSQL transactions/advisory locks/leases; isolated DDL credentials; private derived objects with per-request application authorization; controlled originals up to 52,428,800 bytes; bounded scratch, decoder and concurrency; cancellation and recoverable worker termination; separate staging/production identities; region/backup/log review; restorable 30-day backup history and post-backup revocation reconciliation. RPO <=24 h / RTO <=4 h and PRD pilot timings are targets to measure, not SLAs.

Operational criteria: fewer moving parts before autoscaling; explicit capacity/connection budget during overlapping deploys; manageable recurring cost; portable SQL/object interfaces; no durable state on ephemeral disk. A successful memory stream, image resize or architecture drawing does not satisfy a provider gate.

## Conditional direction

Evaluate **Render Singapore web + independent background worker + paid PostgreSQL 18**, with **private AWS S3 Standard general-purpose buckets in `ap-southeast-1`** for derived assets and separately isolated backups. S3 is preferred over an R2 APAC hint in this investigation because its selected bucket region is explicit; this is an engineering preference while residency remains undecided. It does not establish legal suitability or account-wide data residency. Do not provision any of it yet.

Use one immutable, allowlisted release artifact with two runtime commands and a separate migration invocation. Build locally/CI before any external release; GitHub remains an optional future source/artifact transport, never the implementation workspace. Package compiled worker/CLI **and source SQL**; no private research/audit/evidence directories in image/build context or public files. No Redis, separate queue product, permanent original cache, public bucket or CDN is needed for this MVP. Direct session PostgreSQL connections avoid untested transaction-pooler semantics.

Start a future sandbox at one web and one worker; test worker decode concurrency **1**, separately from job-lane concurrency. Candidate measured-plan inputs are 512 MB web / 2 GB worker / 1 GB DB for a sandbox, and initially 2 GB web / 2 GB worker / 1 GB DB for a pilot comparison. Neither is an approved or proven sizing. Enforce a total connection budget including deploy overlap and maintenance. See the [configuration contract](../hosting/CONFIGURATION_CONTRACT.md) for actual versus proposed keys and commands.

The proposed original path preflights bounded source bytes into private ephemeral scratch, rechecks authorization and streams to the client with backpressure. It must propagate upstream/downstream cancellation, remove scratch and never log success for an interrupted transfer. Headers received cannot guarantee final downstream delivery; client failure must remain visible. No redirect to public Drive/storage or automatic authorization fallback. Thumbnails are immutable versioned objects; failed upload/publication may leave a private orphan for reconciliation, never a published partial generation.

## Alternatives and staged fallback

| Option | Relevant trade-off | Disposition |
|---|---|---|
| Existing local baseline | Existing app/PG foundation, unconfigured providers; no cost or external access | Keep until authorized sandbox exists; cannot serve real galleries or close DEC-003 |
| Render + S3 regional buckets | Managed DB and continuous worker fit current queue; explicit object region; two vendor accounts, S3 transfer/IAM and external retention operations | Preferred conditional investigation target |
| Render + private R2 Standard | Same compute/SQL design; lower published object-transfer cost; APAC hint is best effort, not Singapore residency | Storage fallback only if owner accepts location model and real IAM/S3-compatibility/latency tests pass; never automatic replication or fallback |
| Railway Singapore services + PostgreSQL volume + S3 | Alternative persistent-process topology; documented HTTP total/inactivity ceilings; DB is container/volume based and operations/backup responsibility differs from selected managed DB | Hosting fallback if Render proxy/logging/availability fails; requires its own quote, compatibility and restore proof |
| Vercel web + external continuous worker/DB/storage | Next hosting fits, but adds split hosting/network/pool coordination; buffered payload cap is unsuitable; official guidance permits streamed responses | Not categorically impossible for 50 MiB; exact binary streaming route/duration still untested. More coordination for current MVP |
| Single VPS with web/worker/PostgreSQL | Controls proxy/timeouts; shared failure domain; team owns OS patching, TLS, supervision, disk, off-host backups and incident recovery | Baseline infrastructure alternative, no provider/price verified; not preferred without an operations owner |

Fallback order: remain local -> authorized Render/S3 sandbox -> R2 substitution only for an accepted storage trade-off -> Railway evaluation if compute/proxy cannot meet contracts. If no topology passes, retain the open gate and source-unavailable behavior. Never weaken download authorization or make a bucket public to pass deployment.

## Evidence and unresolved constraints

[Evidence/closure ledger](../hosting/DEC-003-EVIDENCE-2026-10-18.md) owns dated official sources, sourced USD assumptions, exact local commands and future provider actions. New evidence: five real loopback HTTP checks Passed; valid synthetic PNG decoding and a spike-only pixel-limit rejection Passed with existing sharp 0.35.5/libvips 8.18.7. These are local Windows results; no managed proxy, Next media route, Linux native decoder, malicious-image corpus, production memory budget, IAM or restoration proof.

Important compatibility findings: root `npm start` forces loopback; deployment must use an explicit all-interface entry. Source SQL is not emitted by TypeScript. Migration authority must be isolated from web/worker, including build environments. Render's native request logs include paths: token-bearing gallery URLs require verified redaction/disable behavior or a separately reviewed mitigation before use. App logger redaction alone is insufficient. Render's published PITR/log retention depends on workspace plan; short PITR/export retention does not satisfy the 30-day baseline. Backup physical location remains unverified even with Singapore DB placement.

## Ownership, closure and reconsideration

Engineering may choose packaging, pool limits, synthetic fixtures and adapters within approved contracts. **Owner decisions still required:** spending ceiling, regional/cross-border acceptability, provider accounts and explicitly bounded staging authorization; DEC-006 owns legal/processors/retention approval. No approval is inferred from research. A pixel ceiling that excludes otherwise eligible photographs needs documented product/error-policy review before contract changes; 40 MP here is an experimental parameter only.

Keep DEC-003 open until every register criterion has concrete provider evidence: chosen/approved region/plans/budget; target artifact/commands and compatibility; real 50 MiB proxy/slow/cancel/timeout tests; hosted worker/DB recovery; anonymous/wrong-role object denial; backup location/retention plus real isolated restore/revocation reconciliation and measured recovery. PRD pilot load is still required before release. BL-002/003 remain In progress; BL-013/017 remain Todo.

Reconsider on residency requirements, provider path-log controls, proxy limits, decode capacity, quote changes, unacceptable restore window or insufficient operational ownership. Affected documents: decision register, Architecture, Deployment, Security, Test Plan, Traceability, Backlog and agent state/handoff. PRD, Business Rules, API, Database, app/runtime/dependencies and earlier ADRs are unchanged.

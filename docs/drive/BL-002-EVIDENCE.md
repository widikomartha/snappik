# BL-002 evidence and remaining provider protocol

Date: 15 October 2026 (Asia/Makassar). Scope: Google Drive and hosting feasibility only. Status: **In progress**, synthetic subset verified; real integration **Blocked**. DEC-002/003 open. [Contract](ADAPTER_CONTRACT.md), [ADR-005](../decisions/ADR-005-drive-hosting-feasibility.md), [spike](../../spikes/bl002-drive/README.md).

## Environment and authorization

Starting local branch/HEAD: master / `641a3ee`, clean. Results apply to this uncommitted BL-002 worktree and its dependency-free package lock, not a deployed build. Windows / PowerShell 7.6.5 / Node 24.18.0 / npm 11.16.0. Actual manifest inspected: only `spikes/bl001-auth/package.json` existed initially, with Better Auth; no root application manifest/lock/scripts/CI. New BL-002 code uses Node built-ins only. No database or provider credentials were read; no private research/photo data used.

Local read/write/delete probe at `.bl002-write-probe` Passed and removed its own temporary file. Git/status and local commands ran successfully. A read of nonexistent root `.gitignore` reported file-not-found; it was an inspection finding, not a product/test failure and no file was fabricated to hide it.

The user explicitly replied: no dedicated authorized Drive folder available; continue synthetic work. No Google API/account, hosting, PostgreSQL or object-store connection/provisioning was attempted. Official public documentation was read through web search/open only. Some dynamically rendered pricing content and an obsolete R2 location URL were unavailable; canonical references and pricing uncertainty are recorded in ADR-005. No scraper, competitor credentials, paid operation, commit, push or deployment.

## Hypotheses and observed results

| Hypothesis | Exact local check | Result / meaning |
|---|---|---|
| Bounded listing can preserve identity/path without filenames as keys | `adapter.test.mjs`: empty intermediate page, key-bearing nested folder, same-name/case-distinct IDs, root-only option | Passed synthetic seam; no real API listing/visibility claim |
| Product and technical limits fail explicitly | Same suite: every allowed extension/MIME; 50 MiB/one byte extra; 5,000/5,001 images; depths 10/11; entries/folders/pages budgets; repeated/cyclic IDs/tokens, foreign parent and incomplete search | Passed synthetic; malformed sizes rejected, unsupported/oversize/shortcut/trashed exclusions counted |
| Failed refresh cannot expose a partial candidate | Same suite: second-page permission loss; old fixture choices/inventory/confirmation unchanged, abort/expired token/transport failure/deadline | Passed local pure function; no real PostgreSQL publication, source snapshot or crash durability proof |
| Rate/permission errors need different recovery | Same suite: 401, 403 permission versus two rate reasons, 404, 429, 503; six retry indexes, jitter and seconds/date/long/invalid Retry-After | Passed local schedule/classification; no job persistence, live quota or worker lease evidence |
| Delivery can avoid upstream partial-success responses with bounded scratch | `media.test.mjs`: injected denial before open; revocation during/after staging; truncation, overflow with absent/lying length, wrong MIME/encoding/signature, redirect, denied/missing source and disconnect | Passed synthetic injected policy/stream seam; no actual gallery authorization, provider fetch, HTTP headers or browser save |
| 50 MiB cap can be enforced without whole-file buffering | Same suite: generate 52,428,800 bytes in <=64 KiB chunks into temp disk; 52,428,801 bytes fails and cleans; two separate concurrent staging files | Passed local byte/signature test. Synthetic bytes are not decodable photos. No production decoder, peak-RSS, disk admission or proxy/load evidence |
| Cancellation and cleanup are bounded | Same suite: 30 ms stalled body/acquisition, preaborted signal, failed scratch removal outside intended root rejected, success/failure cleanup | Passed within this test process; late acquisition stream destroyed. Process kill/crash janitor and production filesystem ACL/encryption not implemented |

## Executed commands and outcomes

From `D:\Website\snappik`:

```powershell
npm --prefix spikes/bl002-drive test
npm --prefix spikes/bl002-drive install --package-lock-only --ignore-scripts --no-audit --no-fund --offline
```

- First test run: Passed 25/25, zero skipped, exit 0. Review then added stalled acquisition/scan deadlines and redaction checks: Passed 27/27, exit 0. No failing assertion was hidden or weakened.
- Lock generation: Passed, exit 0; no dependencies/downloads/lifecycle scripts. `npm ci`/registry audit not needed or run for this dependency-free spike.
- Final changed-code run: Passed **29/29**, zero skipped/failed, exit 0. Added actual cap overflow and concurrent scratch/path cleanup checks. Local 50 MiB diagnostic at that run: 50 ms elapsed, endpoint RSS delta +11,014,144 bytes. This is one local staging sample, not peak memory, image decoding, API latency, network throughput, warm/cold gallery timing or capacity/SLA evidence. Overall runner duration ~433 ms.
- Final syntax/docs/diff checks are recorded in the [dated handoff](../agents/handoff-2026-10-15-BL-002.md). No application install/build/lint/migration command exists; none invented.

## Named acceptance focus

| Focus | Completed subset | Remaining acceptance gap / result |
|---|---|---|
| T-005 | Fixed-ID request descriptors, pagination/nesting/boundaries/skip counts, explicit incomplete/revoked failures, no partial candidate output | Full test **Not run**; real dedicated folders **Blocked**; canonical persistence/generation publication belongs to BL-007 |
| T-013 | Injected download-policy seam, bounded upstream preflight, deny/revoke/error/timeout/size handling | Full test **Not run**; no real gallery grant/HTTP route, source revalidation/decoder, proxy or browser delivery. Provider/host smoke **Blocked** |
| T-017 | Retry classification/schedule/exhaustion, cancellation and independently staged duplicate transfers | Full test **Not run**; no actual worker, PostgreSQL jobs/leases, crash/restart/fencing/duplicate business-record evidence. Real DB needed; mocks do not pass races |
| T-022 | Capacity arithmetic, provider quota/budget constraints and a local 50 MiB staging sample documented | Full test **Not run**; no PRD pilot load, API save/confirm p95, warm/cold gallery or DB/decoder peak-memory benchmark on hosting |

No item-level or full acceptance scenario is Passed from these subsets. No source/behavior conflict was silently rewritten: root key/credential input/persistence gaps and provider visibility caveat are explicit in the contract. PRD, Business Rules, API and Database are unchanged; this is an internal candidate seam, not a new public wire/schema version.

## Exact authorized-provider protocol for a future BL-002 chat

Prerequisite: user supplies nonsecret references to dedicated synthetic test folder/account/config and expressly authorizes the bounded API calls (plus permission changes only on owned test fixtures). For Workspace tests, a separate authorized Shared Drive fixture is necessary. Never use a random public folder, research credentials or real client photos. Store secret values outside repo/chat/logs; record aliases and redacted outcome only. No provider actions below were executed here.

Fixture manifest: root alias, credential-mode alias, ownership permission to change test sharing, expected visible IDs/counts per principal, key/no-key variants, three colliding filenames with distinct IDs, four valid allowed image formats, unsupported and 50 MiB+1 files, root-only/nested/empty folders, depth 10 and depth 11 variants, internal/external shortcuts, >1 page. Include exactly 5,000 and 5,001 eligible synthetic entries in separate fixture variants if quotas/budget permit. Large-file fixtures must be valid decodable images for decoder claims, not the signature-only local bytes. Prefer a separate disposable directory per case; create/change/delete only within expressly approved fixture scope.

For each case below, record date, code/lock/build/config version, credential principal/scope alias, request count, elapsed time, sanitized HTTP status/reason, visible count/ID digest, skip counters and expected outcome. Never save full URLs, resource keys, OAuth codes/tokens, raw error bodies or filenames from real data. Record an unsupported outcome as a limitation, not a reason to use scraping.

| Case | Exact future actions / expected comparison | Current result |
|---|---|---|
| Public / API key | With server-restricted test API key, `files.get(rootId)` with required metadata fields; run parent-filtered `files.list` to token exhaustion, then `files.get(fileId,alt=media)` on an approved blob. Compare expected manifest; repeat without API key only if authorized. Test each operation independently | Blocked: no test root/key/config |
| Private negative / API key | Repeat against private owned test root with no OAuth. Must deny metadata/list/media without disclosing entries; not false empty success | Blocked |
| Private / studio OAuth | Compare `drive.file` after explicit Picker/file grants against `drive.readonly` only if broad scope authorized. Read existing nested and subsequently added children; restart worker credential session, expire access token and exercise refresh; revoke consent and require reconnect | Blocked: no consent/config; minimum adequate scope unresolved |
| Shared My Drive / OAuth | Dedicated account B has explicit reader access to A's synthetic folder. Compare full tree and canDownload; remove B access on owned test root, repeat metadata/list/media; restore only with permission | Blocked |
| Workspace Shared Drive | Use reader-authorized fixture; resolve drive ID, set `corpora=drive`, `supportsAllDrives=true`, `includeItemsFromAllDrives=true`; repeat restricted child/member/domain-policy variants if administrator authorized | Blocked: no dedicated Workspace fixture; unsupported until proved |
| Resource keys | Test link-shared key-required root with and without correct root header; repeat child keyed folder/file and alt=media with discovered key. Test wrong key and directly granted principal. Compare visibility/count, not just status | Blocked |
| Pagination / completeness | Force `pageSize=2` on known >2 files to verify transport pagination; separately test configured 1,000 on large fixture. Traverse nested/empty folders, skipped shortcuts and root-only option; compare manifest. Inject expired token/incomplete-search where safely reproducible; never publish partial results | Blocked |
| Limits / formats | Retrieve valid JPG/JPEG/PNG/WebP; verify exact 50 MiB and over-limit denial; 5,000/5,001 and depth 10/11; compare exclusions and explicit failed state, stable IDs and old generation | Blocked; local boundary subset Passed |
| Mid-operation permission loss | On an owned test root, pause between known pages or upstream chunks, revoke the test identity, then continue. Record actual provider propagation/caching (in-flight streams may continue). New request must deny once effective; old choices/snapshots persist; no test may promise recalling sent bytes | Blocked |
| Quota / throttling | Inspect authorized project's quota settings/usage without changing/buying quota. Record normal-call headers/status. Fault-inject sanitized 403 rate/429/5xx at adapter seam, including Retry-After and exhausted attempts; actual quota exhaustion only with separately approved safe isolated quota configuration, never flooding | Blocked for assigned quota; deterministic synthetic errors Passed, not a live throttle claim |
| Hosting / private storage | On expressly authorized test infrastructure, stream valid 50 MiB with length/hash, slow provider/client, chunked length, redirects, cancellation and revocation; no secrets/bytes on denied route. Record proxy/idle/total limits, RSS/scratch high-water and object anonymous-denial. Kill/restart worker using real PostgreSQL leases/fencing and assert no stale publication | Blocked: no selected host/test infrastructure or app scaffold |
| Backup / pilot load | In isolated staging restore DB/object mapping and replay later deletion/revocation before access; measure RPO/RTO. Run the exact PRD 10-studio/100-project/50-session load, record save/confirm p95 and warm/cold gallery timings plus rate/connection/memory bounds | Not run; dependent implementation/release work, no provisioning authorized |

Quota errors and worker-crash behavior can be fault-injected without intentionally exhausting provider quota. Gate evidence must label simulated errors separately from actual API-supported access, project quota configuration and provider responses. If any test mode remains unavailable, DEC-002 must explicitly exclude it with product agreement rather than claim universal support.

## Immediate next action

In the next **BL-002** chat, read this evidence and the dated handoff, inspect current Git, then establish availability and authorization for a dedicated synthetic Drive root and nonsecret credential-config reference. Begin with public-folder metadata/list/media plus a private negative case; do not provision or connect automatically. Until available, preserve In progress and open DEC-002/003. Refresh hosting quote/residency/streaming constraints before requesting approval of a concrete test deployment.

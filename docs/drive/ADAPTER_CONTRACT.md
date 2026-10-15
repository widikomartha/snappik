# BL-002 bounded Drive adapter contract

Date: 15 October 2026. Status: candidate integration contract with an [offline executable subset](../../spikes/bl002-drive/README.md). DEC-002/003 remain open. This does not add application routes, migrations, a worker or an OAuth client.

## Scope and mapping

Direct mapping: REQ-DRIVE-001 → BR-DRIVE-001/002/003/004 → BL-002/007 → T-005. Feasibility implications: REQ-DL-001 / BR-DL-001 → T-013; REQ-REL-001 and REQ-OBS-001 / BR-REL-002 → T-017; REQ-GAL-001, REQ-DL-001 and REQ-OBS-001 → T-022. The latter are dependent integration/release checks, not extra BL-002 feature implementation. See [Traceability](../TRACEABILITY.md).

## Boundary and operations

The application resolves a verified principal, studio, project, allowed source root and server-owned access-config reference before calling the adapter. Credential mode is explicit (`public_api_key`, `studio_oauth`, or separately approved dedicated service identity); never switch identities or broaden scopes after a denial. A gallery grant is not a Google credential. Operators have no implicit source browsing permission.

| Operation | Inputs / output / obligation |
|---|---|
| Resolve root (production pending) | Canonical folder ID plus optional resource key and access-config reference → fresh folder MIME, trashed flag, resource key, Shared Drive ID. Reject non-folder/unknown/inaccessible sources. No arbitrary URL accepted |
| List page | Authorized folder ID, opaque page token, root corpus/drive ID and folder resource key → bounded metadata list, next token, incomplete-search flag; injected in spike |
| Scan candidate | Root metadata, subfolder option, cancellation signal → complete candidate plus skip counts, or a safe failure with no publishable partial output |
| Open original (production pending) | Server-resolved project photo/provider ID, current metadata/version and scoped credential → status, MIME, encoding, length and cancellable byte stream; injected in spike |
| Stage original | Fresh eligible metadata and `canDownload`, injected open/policy callbacks, private scratch root → byte-counted handle only after upstream completes; `read` rechecks policy, `dispose` removes scratch |

Provider descriptors use fixed `https://www.googleapis.com/drive/v3/files`, `GET`, redirect rejection, validated IDs (ASCII letters/digits/underscore/hyphen, 1–200 characters), explicit fields and `alt=media` for blobs. This validation is a lexical restriction, not proof of identity, authorization or provider existence. `files.list` uses the immediate parent query and `trashed=false`, page size 1,000, `supportsAllDrives=true`, `includeItemsFromAllDrives=true`; choose `corpora=drive` with the resolved drive ID or `user`, never an unrestricted all-drives search. See [list semantics](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list) and [Shared Drive guidance](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives).

Resource keys use `X-Goog-Drive-Resource-Keys: fileId/key`; preserve root and discovered child keys privately, including on media requests. A key is capability-related input, not a replacement for source permissions. Do not log it or return it to gallery payloads. [Google resource-key specification](https://developers.google.com/workspace/drive/api/guides/resource-keys).

## Bounds and completeness

| Bound | Candidate policy / spike behavior |
|---|---|
| Types and source size | Matching extension (case-insensitive JPG/JPEG/PNG/WebP) and MIME (`image/jpeg`, `image/png`, `image/webp`), <=52,428,800 bytes. Preserve original case/name; do not merge IDs. Unsupported/MIME mismatches and oversized files counted separately and shown as exclusions, not hidden omissions |
| Photo count | 5,000 eligible distinct provider IDs inclusive; image 5,001 aborts scan, no truncated ready result |
| Nesting | Root depth 0; ten folder edges inclusive; encountering a child at depth 11 aborts. Root-only option explicitly counts excluded subfolders |
| Traversal safety | Skip every shortcut in MVP, even inside-root targets. Verify immediate parent, reject repeats/cycles or conflicting identity rather than publish an ambiguous snapshot |
| Technical safety budgets | <=20,000 examined entries (including skipped), <=2,000 folders including root, <=2,000 pages, 120-second scan attempt. Exceeding a budget fails explicitly; not a new product allowance. These conservative spike ceilings may need tuning from real-provider evidence |
| Pagination | Empty/short page with next token is not completion. Reject repeated/invalid tokens or `incompleteSearch=true`; an expired token requires fresh staging from page one. No unbounded in-request restart |
| Transport | Production: metadata response byte cap, strict DTO parsing, request timeout/cancellation, restricted outbound hosts/DNS, no redirect following or HTML/login-page scraping. Spike bounds normalized entry counts/fields, but does not implement HTTP body parsing |

Only return `complete=true` when all visible pages/folders finish within bounds. Google permissions may hide descendants without returning a listing error; completeness means the API-visible authorized subtree at scan time, not a proof of all physically existing descendants or a provider snapshot. Restricted children and moves during pagination need real smoke evidence. Detected instability aborts; permissions/readability are rechecked for delivery. Do not infer an empty private folder from a failed request.

Production publication remains the [Database](../DATABASE.md) contract: stage separately, lock project then selection set, check current source/config and generation/lease fencing, upsert stable photo IDs and mark unseen unavailable atomically. An old/duplicate worker must not publish over a newer generation. No provider I/O under database locks. Failed refresh preserves previous inventory, acknowledged choices and immutable confirmations; no mock proves those durable properties. No publication code is included here.

## Errors, retry and worker seam

Normalized safe error codes include `INVALID_SOURCE`, `INVALID_METADATA`, `INVALID_PAGE`, `INCOMPLETE_SCAN`, `OUTSIDE_SUBTREE`, `UNSTABLE_SCAN`, `PHOTO_LIMIT`, `DEPTH_LIMIT`, `SCAN_BUDGET_EXCEEDED`, `SOURCE_CANCELLED` and `SOURCE_UNAVAILABLE`. They are internal spike codes, not additions to the public API enum. Public routes map these to existing validation/source-unavailable responses and a sanitized job reason, without raw provider messages/URLs.

429, transient 408/5xx and 403 reasons `rateLimitExceeded`/`userRateLimitExceeded` permit bounded retry. 401 requires the credential manager's bounded refresh/reauthorization path (not implemented); 403 permission/404 stop automatic retries. `downloadQuotaExceeded` is terminal for that attempt: show a quota-specific diagnostic/recovery instruction rather than a fast retry loop. Never interpret every 403 as throttling. [Google error guidance](https://developers.google.com/workspace/drive/api/guides/handle-errors).

Candidate schedule follows Architecture: initial attempt plus five retries at 5 s, 30 s, 2 m, 10 m and 30 m, with 0–20% positive jitter. Honor the later `Retry-After` delay (seconds or HTTP date), even beyond 30 m; invalid hints fall back to schedule. Persist `available_at`, attempts and safe outcome in jobs, release the lease while waiting and enforce per-credential/project rate budgets across workers. The spike calculates delays only: no real waiting, quota exhaustion or durable queue was tested. Never replay a partly delivered response as if it completed.

## Secure delivery and private cache obligations

Resolve internal photo ID under tenant/project scope and independently authorize the download grant; main selection membership is irrelevant. Fresh Drive metadata must confirm type, size, source version and `capabilities.canDownload`; blob download uses `files.get?alt=media`. [Google download guide](https://developers.google.com/workspace/drive/api/guides/manage-downloads).

The spike preflights into ephemeral scratch using backpressure, verifies byte count against metadata and optional length, enforces the cap even without a length header, rejects redirects/MIME mismatch/encoded responses, tests image signatures and cleans failed transfers. This prevents upstream truncation/overflow from producing a successful handle. It does not validate full image structure, dimensions or source-version stability. Before thumbnail generation, production must use a pinned decoder with pixel/memory/CPU limits; compare metadata/version again as needed to reject changed source bytes. A valid magic prefix alone is insufficient.

Before emitting response headers, recheck canonical access/version/deadline and attach safe filename/length, `Cache-Control: private, no-store` for originals, `nosniff` and a nonpublic response. Stream staged bytes with downstream cancellation/timeouts and always dispose. A downstream failure after 200 must terminate the connection and omit completed telemetry; neither initiation nor server finish proves browser file-save completion. In-flight bytes cannot be recalled. Do not expose provider links or signed public object URLs as a shortcut around grant checks.

Scratch admission must reserve <=50 MiB per transfer plus overhead, cap concurrent transfers, apply private ACL/encryption, survive cancellation and clean abandoned files on process restart. Scratch is transient, never acknowledged durable state. Private thumbnails use existing studio/project/provider/version/transform/size cache identity and protected same-origin media endpoints, private revalidation, scoped credentials and idle cleanup. No public bucket/CDN. The proposed seven-day idle retention is subject to Google policy and DEC-006, not proof of permission to retain data. Review [Workspace data policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy) for the chosen credential/scopes, disclosures, derived-cache use and revocation/deletion behavior before enabling it.

## Concrete contract gaps found

Current [API](../API.md) accepts only `drive_folder_id` and [Database](../DATABASE.md) stores that ID and photo metadata. Neither defines root/child resource-key persistence, credential ownership/revocation or a Drive connection reference. The offline seam can carry a key, but the current product input cannot preserve one from a pasted link. Do not claim link-key access works end to end.

Before real integration, DEC-002 must settle the mode; then update API and Database together with write-only bounded `drive_resource_key` input and private root/photo key references, server-owned studio connection/config ownership, encrypted secret storage/rotation and invalidation semantics. No such wire/schema change or credential collection is implemented in this spike. Existing PRD/BR behavior is preserved; the chosen root-depth interpretation and exclusion counters clarify candidate adapter behavior, not a silent replacement of product contracts. No adjacent backlog item is completed.

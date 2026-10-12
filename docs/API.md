# API contract

Status: baseline HTTP contract for implementation; not an existing endpoint inventory. Prefix `/api/v1`. JSON UTF-8 unless explicitly CSV/binary. Internal IDs are UUIDs. Dates are RFC3339 UTC. Unknown fields are rejected on mutations.

## Shared conventions

- Owner/ops requests use server-validated secure session cookies. State changes require same-origin/CSRF protection.
- Studio scope comes from membership; do not accept `studio_id` as a client ownership override.
- Client requests use the gallery grant cookie minted for one project/workflow. This cookie cannot access owner routes.
- `Idempotency-Key` is required for project creation, resync, confirm, reopen and operator mutations. Key 16–128 printable ASCII characters; TTL 24 hours. Same scope/key with different body → 409.
- Revisioned mutations require numeric `expected_revision`. Draft saves use full desired state; retry after an uncertain acknowledgement by retrieving canonical revision, not by forcing an old write.
- Pagination: opaque `cursor`, `limit` 1–100 (default 50); response `{items,next_cursor}`. Stable cursor sort includes ID; do not return unbounded arrays of photo metadata.
- Success envelopes use `{data:...}` except lists/downloads. Error: `{error:{code,message,request_id,fields?,current_revision?}}`.
- Unknown/cross-tenant owner IDs return 404. Valid project but forbidden operation returns 403. Client bootstrap for revoked/unknown token uses a generic unavailable response.

## Owner endpoints

| Method / path | Contract | Requirements |
|---|---|---|
| GET `/me` | Identity, studio setup status, effective entitlement; no provider secrets | AUTH, TEN, ENT |
| POST `/onboarding` | `{name,slug,locale,timezone}`; idempotently initializes defaults; 200 existing or 201 new setup | ONB |
| PATCH `/studio` | `{expected_revision,name?,slug?}`; validates identity and slug uniqueness; existing gallery tokens remain stable | ONB, PROJ |
| GET/PATCH `/studio/settings` | Read/update versioned defaults; PATCH includes `expected_revision` matching settings revision; successful update increments revision | ONB, PROJ |
| GET `/entitlement` | Effective status, grant end, project usage/limit; no billing promise | ENT |
| GET `/projects` | Paginated filter by archived/selection status, expiry window, text query | PROJ, TRACK |
| POST `/projects` | Create schema below; 201 durable record + inventory job ID; idempotent | PROJ, DRIVE, REL |
| GET `/projects/:id` | Config, inventory state, workflow states, current draft and last-confirmed metadata | PROJ, RESULTS |
| PATCH `/projects/:id` | Allowed config fields + expected project revision; retain omitted values | PROJ, CONF |
| POST `/projects/:id/archive` | `{expected_revision}`; returns archived_at/purge_after; invalidates grants | RET |
| POST `/projects/:id/restore` | `{expected_revision}`; entitlement/quota/deadline checks | RET, ENT |
| POST `/projects/:id/access/rotate` | `{expected_revision}`; new token, invalidate grants, audited | ACCESS |
| POST `/projects/:id/sync` | Queue/dedupe inventory job; 202 `{job_id}` | DRIVE, REL |
| GET `/projects/:id/photos` | Paginated inventory; filter folder and availability | DRIVE |
| GET `/projects/:id/media/:photoId` | Owner membership and studio access required; bounded derived-image variant, same-project photo only; no original download implied | GAL, RESULTS |
| GET `/projects/:id/selection` | Current draft + revision and last confirmation summary | RESULTS |
| GET `/projects/:id/confirmations` | Paginated immutable confirmation metadata | CONF |
| GET `/projects/:id/results.csv?confirmation_id=...` | Exact immutable snapshot export; `view=draft` explicitly requests draft instead | RESULTS |
| POST `/projects/:id/selection/reopen` | `{expected_revision,reason}`; owner only; new selecting revision | CONF |
| GET `/dashboard` | Totals, deadline summaries, pending/confirmed counts, generated_at | TRACK |
| GET `/jobs/:id` | Tenant-owned sanitized state, progress and safe error code | OBS |

Auth login/logout/recovery/callback endpoints are delegated to the provider selected by DEC-001; do not implement custom password endpoints from this table. Operator bootstrap and user invitation APIs are not public MVP endpoints.

Example creation request:

```json
{
  "client_label": "Sample graduation",
  "drive_folder_id": "validated-provider-folder-id",
  "detect_subfolders": true,
  "notes_enabled": true,
  "layout": "grid",
  "main": {"enabled": true, "quota": 3, "expires_at": "2026-10-20T08:00:00Z"},
  "download": {"enabled": true, "expires_at": "2026-10-27T08:00:00Z"}
}
```

Optional per-workflow `password` is write-only; null clears it explicitly, omission preserves it on PATCH. Server returns `password_required`, never plaintext/hash. Optional phone fields are E.164 strings. The UI can parse a Drive URL but submits a canonical folder ID; server validates again. Client label max 100 characters. No arbitrary image URL fields are accepted.

Creation returns `{data:{id,revision,public_url,inventory_status:"pending",job_id}}`. Image/source validation failures occurring asynchronously are shown through job/project state, not rolled back by fabricating a failed create response.

## Client endpoints

| Method / path | Contract / policy |
|---|---|
| GET `/g/:token` | Minimal project label/branding and menu availability; generic unknown/revoked response |
| POST `/g/:token/access` | `{workflow:"main"|"download",password?}`; verifies access; sets HttpOnly grant cookie; returns grant expiry and canonical workflow state |
| GET `/g/:token/photos` | Grant required; folder/cursor/limit; safe photo ref/name/path/thumbnail endpoint; no owner or source-root data |
| GET `/g/:token/media/:photoId` | Grant required; bounded allowed size variant; private revalidated media response |
| GET `/g/:token/selection` | Main grant; `{status,revision,items,quota,confirmed_at}` |
| PUT `/g/:token/selection` | Main grant; `{expected_revision,items:[{photo_id,note?}]}`; <=quota unique IDs; body cap 1 MiB |
| POST `/g/:token/selection/confirm` | Main grant + idempotency key; `{expected_revision}`; validates 1…quota; returns snapshot ID/revision/time |
| GET `/g/:token/download/:photoId` | Download grant; stream original after access/provider validation; sanitized attachment filename |

Grant creation is throttled and origin-checked; invalid/expired password grants do not return photo data. Clients can read the current locked set but cannot mutate it; reopening has no client endpoint. Do not claim separate private galleries per client browser: one project shares one collaborative set.

Keep main and download grants in separately named Secure, HttpOnly, SameSite cookies scoped to `/api/v1/g/:token`; opening one menu must not overwrite the other menu's grant. Shared photo/media endpoints require a `workflow=main|download` query and validate only the matching grant. Selection routes always require main; original downloads always require download. Cookie path is browser routing convenience, never a replacement for server-side scope checks.

Draft response:

```json
{"data":{"status":"selecting","revision":4,"quota":3,"items":[{"photo_id":"<uuid>","note":"Increase exposure slightly"}],"saved_at":"2026-10-13T08:15:00Z"}}
```

After a save conflict return current revision but no other tenant's state. UI retrieves the canonical selection and deliberately reconciles. Confirm UI must await the latest saved revision before submission.

## Operator endpoints

| Method / path | Permission and input |
|---|---|
| GET `/ops/studios` | `diagnostics_read`; bounded exact support search, paginated |
| GET `/ops/studios/:id` | `diagnostics_read`; setup/entitlement/job health and audit references, no gallery contents |
| POST `/ops/studios/:id/grants` | `entitlement_write`; `{starts_at,ends_at,project_limit,reason}` plus idempotency key |
| POST `/ops/studios/:id/suspend` | `studio_suspend`; `{reason}` plus idempotency key |
| POST `/ops/studios/:id/reactivate` | `studio_suspend`; `{reason}` plus idempotency key; entitlement evaluated independently |
| GET `/ops/audit-events` | `diagnostics_read`; scoped filters and pagination; no secrets |

Operator reasons: 10–1,000 characters; fixed UTC grant dates; initial manual grants limited to 366 days and 1–1,000 projects per action. These are pilot controls, not commercial product plans. No operator role-management endpoint in MVP.

## Error taxonomy

| HTTP | Code examples | Client behavior |
|---|---|---|
| 400/422 | `VALIDATION_ERROR`, `INVALID_SOURCE`, `QUOTA_EXCEEDED`, `SOURCE_PHOTO_UNAVAILABLE` | Show field/item error; do not retry automatically |
| 401 | `AUTH_REQUIRED`, `GALLERY_GRANT_REQUIRED` | Obtain valid auth/menu grant |
| 403 | `ENTITLEMENT_EXPIRED`, `STUDIO_SUSPENDED`, `WORKFLOW_DISABLED`, `ACCESS_EXPIRED` | Explain allowed recovery; no retry loop |
| 404 | `NOT_FOUND`, `GALLERY_UNAVAILABLE` | Generic unavailable view |
| 409 | `REVISION_CONFLICT`, `SELECTION_LOCKED`, `IDEMPOTENCY_CONFLICT`, `PROJECT_LIMIT_REACHED` | Refresh/reconcile or change action |
| 413 | `PAYLOAD_TOO_LARGE` | Reduce request; validation guidance |
| 429 | `RATE_LIMITED` | Honor Retry-After and back off |
| 502/503 | `SOURCE_UNAVAILABLE`, `TEMPORARILY_UNAVAILABLE` | Bounded retry, preserve unsaved state |

Do not map unknown backend errors to success or leak SQL/provider responses. Every error carries a request ID. Archive/restore and access rotation are naturally idempotent only for matching revisions; repeated requests after uncertain responses should fetch state before retrying.

Future payments, integration keys, staff invitations, print/extra and ZIP endpoints are intentionally absent; add them with their own contracts and threat review.

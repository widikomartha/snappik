# BL-002 offline Drive feasibility spike

Status: synthetic contract subset only; no Google API, OAuth callback, server, worker, database or storage provider connection. All IDs, names and bytes are generated synthetic inputs. JPEG/PNG/WebP byte fixtures exercise signatures, not full image decoding.

From repository root, with Node 24.18.0 / npm 11.16.0:

```powershell
npm --prefix spikes/bl002-drive test
```

No dependencies or installation needed. The dependency-free lockfile was generated with `npm --prefix spikes/bl002-drive install --package-lock-only --ignore-scripts --no-audit --no-fund --offline`. This is an isolated spike, not BL-003 scaffolding or BL-007/013 production implementation.

- `adapter.mjs`: fixed-origin request descriptors (no HTTP execution), conservative bounded traversal, sanitized errors and retry scheduling policy. `scan` returns candidate metadata only, never writes business state.
- `media.mjs`: injected stream → bounded temporary file → repeated authorization seam → readable stream. Upstream must finish before a success handle exists. Consumer must `dispose()` in `finally`, including denied/cancelled downstream delivery. OS temp files are removed by tests; production crash cleanup/ACL and disk admission remain unimplemented.
- Tests inject pages, errors, policy callbacks and byte streams. Nothing reads environment credentials or calls `fetch`. No `live` script is provided.

See the [adapter contract](../../docs/drive/ADAPTER_CONTRACT.md), [executed evidence and dedicated-provider protocol](../../docs/drive/BL-002-EVIDENCE.md) and [conditional decisions](../../docs/decisions/ADR-005-drive-hosting-feasibility.md). Complete T-005/T-013/T-017/T-022 acceptance remains pending.

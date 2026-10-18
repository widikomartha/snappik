# DEC-003 local hosting probes

Isolated investigation only. No application routes, authentication, provider adapter or deployment configuration. Uses existing Node 24.18.0 and the root lock/node_modules; no install. Run from repository root:

```powershell
node --test spikes/dec003-hosting/transport.test.mjs
node spikes/dec003-hosting/decoder.mjs
```

The HTTP suite starts two dynamic **127.0.0.1-only** servers, imports BL-002 scratch preflight, uses synthetic no-op policy, checks 50 MiB digest/length and cancellation/overflow/deadline cleanup. It removes only its generated OS-temp directory and closes own servers. It needs permission for local loopback connections; sandbox EACCES is not a passing test. Repeated JPEG signature bytes are intentionally **not valid photos**.

Decoder uses already installed transitive sharp 0.35.5/libvips 8.18.7, creates valid solid RGBA PNG fixtures (24 MP and 48 MP) in OS temp, then spawns isolated decode children. It checks a 640-wide JPEG and rejection at experimental 40 MP; cache off, native threads one, decoder timeout 10 s, child timeout 20 s. Parent cleans own fixtures. No product pixel limit or production dependency pin is introduced. Process maxRSS is a diagnostic, not a safe host sizing or exploit-resistance claim. Fixture generation is excluded from child peak, and PNG content is highly compressible.

Observed results/commands, exclusions, provider research and unexecuted closure protocol: [DEC-003 evidence](../../docs/hosting/DEC-003-EVIDENCE-2026-10-18.md). **5 HTTP checks + 2 decoder cases Passed locally**, after the sandbox-denied HTTP attempt was rerun with permitted loopback. No proxy/Next media/provider feasibility is established, no database backup tools available, no external account/secret connection and no infrastructure created. Do not expose this test harness as a public service.

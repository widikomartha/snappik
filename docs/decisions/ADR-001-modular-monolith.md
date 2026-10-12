# ADR-001: modular monolith with a worker

Date: 13 October 2026 · Status: baseline for implementation planning.

## Context

Snappik starts without application code and needs a reliable studio/project/client workflow. Project creation, quotas and confirmation depend on atomic state. Image inventory and derived assets involve slow, retryable provider work.

## Decision

Use one TypeScript codebase with Next.js UI/API boundaries, domain modules, PostgreSQL and a separate worker process sharing domain code. Store jobs transactionally in PostgreSQL. Keep provider adapters replaceable. Do not add microservices or Redis solely in anticipation of future scale.

Auth, Drive credentials and hosting remain gated by DEC-001/002/003. Pin supported dependency versions during scaffolding; this ADR does not prescribe a floating latest version or copy the competitor's stack.

## Alternatives

- Microservices: stronger independent deployment but unnecessary operational/distributed-transaction complexity at MVP scope.
- Browser-to-database business mutations: simpler initial plumbing but makes tenancy/quota/confirmation policy harder to centralize.
- Fully synchronous source processing: simpler process count but long provider work can outlive requests and obscure creation success.

## Consequences

Domain services enforce rules regardless of entry point. API and worker versions must be migration-compatible. Background retry/lease logic requires real integration testing. Web/worker can scale independently later without changing ownership rules.

Revisit after measured DB queue contention, sustained provider throughput limits or genuinely independent team/deployment needs. A framework change must preserve API/state guarantees.

Affected documents: [Architecture](../ARCHITECTURE.md), [Database](../DATABASE.md), [Deployment](../DEPLOYMENT.md).

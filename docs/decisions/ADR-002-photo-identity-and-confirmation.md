# ADR-002: stable photo IDs and immutable confirmation snapshots

Date: 13 October 2026 · Status: baseline.

## Context

The Fastpik live test used Edited and Original folders with similarly named files. Three locked filenames appeared as six previous images in review, while admin showed three. Filenames alone cannot identify exact sources reliably. Concurrent client tabs also need a clear conflict policy.

## Decision

Represent each photo by a project-scoped record unique on provider file ID. Retain original name/path/case as metadata. Use a versioned shared selection set, atomic expected-revision writes and immutable confirmation snapshots. Owner reopen preserves choices and history and creates a new mutable revision.

Future extras must reference a base confirmation's photo IDs. A pasted filename import must report ambiguity and require resolution; it must never silently match every basename across folders.

## Alternatives and consequences

Filename arrays are compact but ambiguous. Last-write-wins saves are simple but can overwrite a new confirmation. Replacing confirmation in place loses history. The selected approach needs more relational records and transactions but allows exact exports, accountable reopen and deterministic conflict tests.

Source deletion does not erase a historical confirmed snapshot. Unavailable references in a draft must be removed/replaced before confirmation. Provider IDs are scoped within the project to retain tenant ownership and source context.

Affected documents: [Business rules](../BUSINESS_RULES.md), [Database](../DATABASE.md), [API](../API.md), [Test plan](../TEST_PLAN.md). Reconsider only if the source provider cannot supply stable IDs; that would block the current contract rather than justify silently reverting to basenames.

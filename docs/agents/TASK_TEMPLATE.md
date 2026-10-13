# Task brief template

Copy the template below into a task description or a dated handoff when the work benefits from a durable brief. Replace placeholders. This is a template, not a running task or completed acceptance record.

```text
Title:
Requested outcome:
Task type: implementation / investigation / documentation / review
Scope authorized by the user:
Backlog item and requirement IDs:
Relevant business rules and acceptance test IDs:

Current repository evidence:
- Branch/HEAD and existing user changes:
- Existing implementation or missing components:
- Files/contracts to read:

In scope:
Explicit exclusions:
Dependencies and open decisions:
- Resolved evidence:
- Missing input that truly blocks dependent work:
- Useful work that can proceed independently:

Acceptance scenarios:
- Given ..., when ..., then ...
- Denied/error/retry/concurrency cases relevant to this task:

Implementation approach:
- Domain/policy change:
- Persistence/migration change:
- API/UI/provider change:
- Recovery/rollback implications:

Verification plan:
- Available commands or manual steps:
- Synthetic fixtures versus real provider checks:
- Expected result and artifact location:

Documentation/status updates required:
Completion evidence:
Remaining limitations:
```

## Writing a useful task

Describe a user-observable result and a bounded slice. For example, “Owner can retry project creation after response loss and retrieve the original project” is more actionable than “build backend.” Include the relevant denial/race behavior; avoid listing every feature in the application.

Use existing IDs rather than creating a second backlog. If a task subdivides an existing item, keep its parent ID and name the subtask in prose. Add new stable requirement IDs only when the product contract actually expands, and update traceability at the same time.

Attach real command evidence after execution. Until then, label it planned. Avoid deadlines or effort estimates without implementation evidence. Do not paste private research, full bearer URLs or secrets into a brief.

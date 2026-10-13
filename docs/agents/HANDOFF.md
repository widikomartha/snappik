# Agent handoff protocol

Leave a handoff when work spans sessions, is interrupted, or is deliberately passed to another agent. A handoff should let the next agent resume without replaying the entire chat or mistaking plans for finished work.

Use a dated Markdown record in this folder when a durable handoff is needed, for example `handoff-YYYY-MM-DD-topic.md`. Do not create empty placeholder handoffs. Link the active handoff from [Project state](PROJECT_STATE.md), and mark it superseded/completed when appropriate.

## Required content

```text
Task and requested outcome:
Last updated:
Status: active / blocked on named dependency / ready for review / completed
Branch and HEAD at handoff:

User constraints and decisions:
- Preserve accepted scope and corrections from the conversation.

Completed work:
- Exact files and user-visible behavior; distinguish draft from verified.

Current worktree:
- Your changed files, unrelated user changes, generated artifacts.
- Commit status; do not assume changes are committed or pushed.

Verification actually performed:
- Command or steps, result, environment/build and evidence path.
- Failed, blocked or unexecuted checks and practical impact.

Open decisions or blockers:
- Exact missing information/access and dependent action.
- Independent work still possible.

Next actions in order:
1. Smallest concrete resume step.
2. Subsequent integration/verification work.

Risks and watch-outs:
- State migrations, locks, provider assumptions or user changes to preserve.

Documents/backlog updated:
```

## Resume procedure

Read the handoff, AGENTS.md and current user message, then inspect actual Git/files/processes. A handoff may be stale. Verify branch, dependency state and check availability before continuing. Preserve the original goal unless the user clearly replaces it; a status question or correction does not silently cancel ongoing work.

Do not repeat completed provider actions or tests without a reason. Re-run relevant checks after changes that invalidate prior evidence. If a previous session left a server/worker running, inspect its status and ownership before stopping or replacing it.

A handoff does not grant permission to send messages to another chat, deploy, publish, use private accounts or perform destructive operations. Follow the current user's authorization. Prefer a concrete artifact over asking the user to approve a vague future plan.

## Data boundaries

Store secret references only, never secret values. Do not include live gallery tokens, full private source links, personal photo filenames/notes or raw provider responses. Point to the private research index only when the next task actually needs audit context. Use repository-relative links so records work on another machine.

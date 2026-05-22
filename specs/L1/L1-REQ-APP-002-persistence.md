---
artifact_id: L1-REQ-APP-002
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-APP-002 — Persistence

## Purpose

Preserve user work and conversation history across application restarts.

## Why This Matters

Users rely on the program for long-running work and later review. Persistent history prevents completed decisions, tool output, approvals, and task state from disappearing when the application exits.

## Background / Context

Coding-agent sessions often span many turns and may include tool outputs, file edits, approvals, queued user messages, steering interventions, fork relationships, and decisions that must remain available later.

Users may exit the application or leave a task before the active work has completed. In that case, the program must preserve enough active-task state to resume that task on the next launch and show the user what pending input or intervention was restored.

## User / Business Requirement

The program must persist conversation and execution history so users can resume and inspect prior work.

If a user exits while a task is active or incomplete, the program must automatically resume that task on the next launch.

## Real User Scenarios

- A user closes the application after a long debugging session and later reopens it to continue from the previous context.
- A user reviews yesterday's tool output to understand why a file was changed.
- A user exits while a task is active, then relaunches the program and sees the task resumed automatically.
- A user had pending `steer` and `queue` items when the application exited, then relaunches and sees those restored items displayed in the client interface.

## Functional Requirements

- The program must save conversation history durably.
- The program must load prior conversation history when the application starts.
- The program must preserve tool calls, tool outputs, approvals, and final responses as part of history.
- The program must support finding or selecting prior sessions.
- The program must persist active incomplete task state when the user exits.
- The program must automatically resume an active incomplete task when the user next launches the program.
- The program must persist all tasks or messages currently held in both `steer` and `queue` queues.
- The program must restore `steer` and `queue` queue contents on next launch.
- The client interface must display restored `steer` and `queue` queue contents so the user can understand what will influence or follow the resumed task.
- The program must persist fork relationships between child sessions, parent sessions, and fork turns.
- Forked session persistence must allow inherited history to remain viewable without requiring a deep copy of the entire parent session history.
- Forked session persistence must not require the parent session file to remain accessible after the parent is deleted, unless the fork itself is also deleted by an explicit cascade policy.

## Non-Functional Requirements

- Persistence must avoid silent data loss.
- Stored history must remain usable after normal application restart.
- Active-task restoration must be reliable enough that users can trust exit and relaunch workflows.
- Restored `steer` and `queue` items must be visible without being confused with already-executed transcript items.
- Forked session persistence must avoid unnecessary storage growth while preserving user-visible inherited history.

## Acceptance Criteria

- Given an existing session, when the user reopens the application, then the user can access that session history.
- Given a completed tool call, when the session is reloaded, then the relevant tool call record remains available for review.
- Given a turn ended with an approval decision, when the session is reopened, then the decision remains visible in history.
- Given a user exits while a task is active or incomplete, when the program launches next time, then that task is automatically resumed.
- Given `steer` queue items existed at exit time, when the program launches next time, then those items are restored and displayed in the client interface.
- Given `queue` queue items existed at exit time, when the program launches next time, then those items are restored and displayed in the client interface.
- Given restored `steer` or `queue` items are displayed, when the user inspects them, then the user can distinguish pending restored items from already-completed transcript history.
- Given a forked session is restored after restart, when the user opens it, then the inherited history and parent-session relationship remain visible.
- Given a forked session is persisted, when the storage representation is created, then the program avoids a full deep copy of the parent session history records.
- Given a parent session has been deleted, when a surviving forked session is restored, then the fork's inherited history remains viewable without opening the deleted parent session file.
- Given persistence fails, when the user continues working, then the program reports the risk of unsaved history.

## Out of Scope

- The program does not define storage backend, file format, database schema, or retention policy in this L1 requirement.
- The program does not define the internal data model for `steer` and `queue` queues in this L1 requirement.
- The program does not define the internal shallow-copy or reference mechanism for forked session history in this L1 requirement.
- This requirement does not guarantee indefinite retention of all historical data without user-configured limits.

## Open Questions

- Should session deletion support a recovery window?
- Should automatic active-task resume continue execution immediately, or restore into a waiting state when the next pending action is risky?
- Beyond the immediately previous eligible message, should restored `steer` and `queue` items be editable or cancelable before resumed execution continues?
- Which storage strategy should be preferred for inherited fork history: protected shared segments, materialized fork segments, or protected retained source records?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | L2 defines durable JSONL session records, replay, and recovery. |
| related-to | L2-DES-APP-003 | 1 | specs/L2/app/L2-DES-APP-003-client-server-protocol.md | L2 defines reconnect and catch-up behavior over the shared server protocol. |
| related-to | L1-REQ-CONV-005 | 1 | specs/L1/L1-REQ-CONV-005-immediate-message-editing.md | Immediate message editing requires persisted edit records and replay behavior. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-20 | Assistant | Initial | Initial draft with approved L1 refinement. |
| 1 | 2026-05-21 | Human | Refinement | Added automatic active-task resume and restored `steer` / `queue` queue display requirements. |
| 1 | 2026-05-21 | Human | Refinement | Added fork relationship persistence and shallow-copy inherited history requirements. |
| 1 | 2026-05-22 | Human | Refinement | Narrowed restored-message edit open question after adding immediate previous message editing. |
| 1 | 2026-05-22 | Human | Refinement | Required surviving forks to replay inherited history without relying on deleted parent session files. |

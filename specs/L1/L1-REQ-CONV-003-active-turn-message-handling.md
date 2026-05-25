---
artifact_id: L1-REQ-CONV-003
revision: 1
status: Draft
active_baseline: no
supersedes:
superseded_by:
owner: Human
last_updated: 2026-05-21
---

# L1-REQ-CONV-003 — Active Turn Message Handling

## Purpose

Define what happens when the user sends another message while a turn is already active.

## Why This Matters

Users often notice corrections, constraints, or follow-up instructions while the program is still working. The product must avoid ambiguous behavior where a message is silently ignored, accidentally interrupts the active task, or is mistaken for completed transcript history.

## Background / Context

A session may have an active turn that is generating model output, running tools, waiting for approval, waiting for a user answer, or processing delegated work. During that time, the user may want to guide the active work immediately or send a message that should run after the active work completes.

The product model distinguishes two user-facing choices:

- `steer`: a guided intervention intended to influence the currently active turn.
- `queue`: a message that waits in order until the active turn completes.

## User / Business Requirement

When a user sends a message during an active turn, the program must let the user choose whether the message should steer the current turn or be queued for later execution.

## Real User Scenarios

- A user sees the program taking the wrong approach and sends a `steer` message to correct the active task.
- A user thinks of a follow-up request during a long-running task and sends it to the `queue` so it runs after the current task finishes.
- A user relaunches the program after exiting mid-task and sees restored `steer` and `queue` items displayed in the client interface.

## Functional Requirements

- The client interface must distinguish messages sent while a turn is active from normal new-turn submissions.
- The user must be able to choose `steer` for guidance intended to affect the currently active turn.
- The user must be able to choose `queue` for a message intended to run after the active turn completes.
- `steer` messages must be visible as guided interventions rather than ordinary completed transcript items.
- `queue` messages must preserve user submission order until they are executed, canceled, or otherwise resolved.
- The client interface must show pending `steer` and `queue` messages so the user understands what is influencing or waiting behind active work.
- If a `steer` message cannot safely affect the active turn, the program must report that limitation and preserve or reclassify the message according to user intent.
- `steer` and `queue` messages must participate in persistence and restoration behavior when the user exits before the active task completes.

## Non-Functional Requirements

- Active-turn message handling must be predictable and visible to the user.
- The program must not silently drop messages sent during active work.
- The program must not confuse pending `steer` or `queue` messages with completed assistant output or already-executed user turns.
- The program must preserve safety, approval, and workspace boundaries when applying `steer` or executing queued messages.

## Acceptance Criteria

- Given a turn is active, when the user sends a new message, then the client offers or applies a clear `steer` versus `queue` handling mode.
- Given the user chooses `steer`, when the message is accepted, then the client displays it as guidance for the active turn.
- Given the user chooses `queue`, when the active turn is still running, then the message is retained as pending follow-up work.
- Given multiple messages are queued, when the active turn completes, then queued messages are processed in the user-visible order unless the user changes that order.
- Given pending `steer` or `queue` messages exist when the user exits, when the program launches next time, then those messages are restored and displayed in the client interface.
- Given a `steer` message cannot be applied to the current active state, when the program reports the issue, then the user can understand whether it was queued, rejected, or needs another action.

## Out of Scope

- This requirement does not define internal queue data structures, server event names, concurrency model, or exact client UI controls.
- This requirement does not define whether `steer` can modify an already-running tool invocation.
- This requirement does not define detailed conflict handling between queued messages, active goals, and subagents.

## Open Questions

- Should `steer` be allowed during every active state, or only during model generation and planning phases?
- Beyond the immediately previous eligible message, should users be able to edit or reorder queued messages before execution?
- Should the client require an explicit choice every time, or use a default mode with an affordance to switch?

## Traceability

| Relationship | Target ID | Target Revision | Target Path | Rationale |
|---|---|---:|---|---|
| refined-by | L2-DES-APP-003 | 1 | specs/L2/app/L2-DES-APP-003-client-server-protocol.md | L2 defines protocol behavior for steer and queue submissions during active turns. |
| related-to | L2-DES-CONV-001 | 1 | specs/L2/conv/L2-DES-CONV-001-session-jsonl-data-model.md | L2 defines durable turn and item records that preserve steer and queue messages. |
| related-to | L1-REQ-CONV-005 | 1 | specs/L1/L1-REQ-CONV-005-immediate-message-editing.md | Immediate message editing covers the narrow case of editing the latest eligible queued message. |

## Revision Notes

| Revision | Date | Author | Change Type | Notes |
|---:|---|---|---|---|
| 1 | 2026-05-21 | Assistant | Initial | Initial draft approved for L1 expansion. |
| 1 | 2026-05-22 | Human | Refinement | Narrowed the queued-message edit open question after adding immediate previous message editing. |
